import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/index";
import { logger } from "./logger";
import { dbLog } from "./dbLogger";
import { getConfig, setConfig } from "./config";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  parents?: string[];
}

const FOLDER_MIME = "application/vnd.google-apps.folder";

// ── Sync state ─────────────────────────────────────────────────────────────
export type SyncState = {
  status: "idle" | "running" | "error";
  lastSync: string | null;
  progress: number | null;
  message: string | null;
  totalFiles: number | null;
  totalFolders: number | null;
};

let syncState: SyncState = {
  status: "idle",
  lastSync: null,
  progress: null,
  message: null,
  totalFiles: null,
  totalFolders: null,
};

let cancelRequested = false;

export function getSyncState(): SyncState {
  return { ...syncState };
}

export function requestCancelSync(): void {
  cancelRequested = true;
}

// ── Google Drive API helper ────────────────────────────────────────────────
async function driveList(
  apiKey: string,
  folderId: string,
  pageToken?: string
): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  const params = new URLSearchParams({
    key: apiKey,
    q: `'${folderId}' in parents and trashed=false`,
    fields: "nextPageToken,files(id,name,mimeType,size,modifiedTime,parents)",
    pageSize: "200",
  });
  if (pageToken) params.set("pageToken", pageToken);

  const url = `https://www.googleapis.com/drive/v3/files?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<{ files: DriveFile[]; nextPageToken?: string }>;
}

async function listAllInFolder(apiKey: string, folderId: string): Promise<DriveFile[]> {
  const all: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const result = await driveList(apiKey, folderId, pageToken);
    all.push(...result.files);
    pageToken = result.nextPageToken;
  } while (pageToken);
  return all;
}

// ── Recursive scanner ──────────────────────────────────────────────────────
export async function scanDrive(
  apiKey: string,
  rootFolderId: string,
  syncRecordId: string
): Promise<void> {
  const scanStartedAt = new Date();

  syncState = {
    status: "running",
    lastSync: null,
    progress: 0,
    message: "Starting scan...",
    totalFiles: 0,
    totalFolders: 0,
  };

  const stats = { filesAdded: 0, filesRemoved: 0, filesUpdated: 0, foldersAdded: 0 };
  const seenDriveIds = new Set<string>();

  try {
    // Fetch existing resources
    const { rows: existing } = await pool.query(
      "SELECT drive_id, id FROM resources"
    );
    const existingMap = new Map<string, string>(
      existing.map((r) => [r.drive_id, r.id])
    );

    // BFS scan
    const queue: { driveId: string; parentId: string | null; depth: number }[] = [
      { driveId: rootFolderId, parentId: null, depth: 0 },
    ];

    let processed = 0;
    cancelRequested = false;

    while (queue.length > 0) {
      if (cancelRequested) {
        throw new Error("Sync cancelled by user.");
      }

      const item = queue.shift()!;
      seenDriveIds.add(item.driveId);

      syncState.message = `Scanning... (${processed} items found)`;

      let files: DriveFile[];
      try {
        files = await listAllInFolder(apiKey, item.driveId);
      } catch (err) {
        logger.warn({ err, driveId: item.driveId }, "Error listing folder");
        dbLog("warn", `Failed to list folder ${item.driveId}`, String(err));
        continue;
      }

      const folderChildren = files.filter((f) => f.mimeType === FOLDER_MIME);
      const pdfChildren = files.filter((f) => f.mimeType === "application/pdf");

      // Batch upsert inside a transaction
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        for (const file of files) {
          const isFolder = file.mimeType === FOLDER_MIME;
          const resourceId = existingMap.get(file.id) ?? uuidv4();
          const isNew = !existingMap.has(file.id);

          await client.query(
            `INSERT INTO resources
               (id, drive_id, name, type, parent_id, depth, mime_type, size, modified_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
             ON CONFLICT (drive_id) DO UPDATE SET
               name        = EXCLUDED.name,
               parent_id   = EXCLUDED.parent_id,
               depth       = EXCLUDED.depth,
               size        = EXCLUDED.size,
               modified_at = EXCLUDED.modified_at,
               updated_at  = NOW()`,
            [
              resourceId,
              file.id,
              file.name,
              isFolder ? "folder" : "pdf",
              item.parentId,
              item.depth + 1,
              file.mimeType,
              file.size ? parseInt(file.size, 10) : null,
              file.modifiedTime ?? null,
            ]
          );

          // Update existingMap for future iterations
          existingMap.set(file.id, resourceId);

          if (isNew) {
            if (isFolder) stats.foldersAdded++;
            else stats.filesAdded++;
          } else {
            stats.filesUpdated++;
          }

          seenDriveIds.add(file.id);
          processed++;
        }

        // Update child count for current folder (skip root)
        if (item.depth > 0) {
          await client.query(
            "UPDATE resources SET child_count = $1 WHERE drive_id = $2",
            [files.length, item.driveId]
          );
        }

        await client.query("COMMIT");
      } catch (txErr) {
        await client.query("ROLLBACK");
        throw txErr;
      } finally {
        client.release();
      }

      // Queue subfolders. Each folder's own resource id (looked up by its
      // OWN driveId, not the current item's driveId) becomes the parentId
      // used when inserting *that folder's* children later — using
      // `item.driveId` here was a bug that attached every folder's children
      // one level too high in the tree (to the grandparent instead of the
      // direct parent), leaving files unreachable via normal navigation.
      for (const folder of folderChildren) {
        const parentResourceId = existingMap.get(folder.id) ?? folder.id;
        queue.push({
          driveId: folder.id,
          parentId: parentResourceId,
          depth: item.depth + 1,
        });
      }

      syncState.totalFolders = (syncState.totalFolders ?? 0) + folderChildren.length;
      syncState.totalFiles = (syncState.totalFiles ?? 0) + pdfChildren.length;
      syncState.progress = Math.min(99, processed / 10);
    }

    // Remove resources no longer in Drive
    const { rows: allResources } = await pool.query(
      "SELECT drive_id FROM resources"
    );

    for (const res of allResources) {
      if (!seenDriveIds.has(res.drive_id)) {
        await pool.query("DELETE FROM resources WHERE drive_id = $1", [res.drive_id]);
        stats.filesRemoved++;
      }
    }

    // Finalize sync record
    await pool.query(
      `UPDATE sync_records SET
         completed_at = NOW(), status = 'success',
         files_added = $1, files_removed = $2, files_updated = $3, folders_added = $4
       WHERE id = $5`,
      [stats.filesAdded, stats.filesRemoved, stats.filesUpdated, stats.foldersAdded, syncRecordId]
    );

    // Record when this scan started so the next Quick Sync only looks at
    // files modified after this point (see incrementalScanDrive below).
    await setConfig("lastIncrementalSyncAt", scanStartedAt.toISOString());

    const now = new Date().toISOString();
    syncState = {
      status: "idle",
      lastSync: now,
      progress: 100,
      message: `Sync complete. ${stats.filesAdded} added, ${stats.filesRemoved} removed.`,
      totalFiles: syncState.totalFiles,
      totalFolders: syncState.totalFolders,
    };

    dbLog("info", "Drive sync complete", JSON.stringify({ ...stats, totalFiles: syncState.totalFiles }));
  } catch (err) {
    const msg = String(err);
    syncState = {
      status: "error",
      lastSync: syncState.lastSync,
      progress: null,
      message: msg,
      totalFiles: null,
      totalFolders: null,
    };

    await pool.query(
      "UPDATE sync_records SET completed_at = NOW(), status = 'error', error_message = $1 WHERE id = $2",
      [msg, syncRecordId]
    );

    dbLog("error", "Drive sync failed", msg);
    throw err;
  }
}

// ── Quick (incremental) sync ────────────────────────────────────────────────
//
// NOTE: Google's Drive "Changes" API (`/drive/v3/changes`) requires an OAuth2
// user token — it always 401s with a bare API key ("API keys are not
// supported by this API"). Since this app only ever stores an API key, that
// approach can never work, and silently degraded into a full re-scan every
// time. Instead, Quick Sync re-queries only the folders we already know
// about (from the last scan), asking Drive for children modified after the
// last sync timestamp — the same `'<id>' in parents` query the full scan
// already uses successfully with an API key, just batched and filtered.
//
// Trade-off: this reliably catches additions and edits, but a file deleted
// from Drive simply stops appearing in listings — there's no cheap way to
// detect that without re-listing every folder (i.e. a full scan). Run a
// Full Scan periodically to reconcile deletions.

const MAX_PARENTS_PER_QUERY = 40;

function escapeQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function listFilesForParentsSince(
  apiKey: string,
  parentDriveIds: string[],
  sinceIso: string
): Promise<DriveFile[]> {
  const parentClause = parentDriveIds
    .map((id) => `'${escapeQueryValue(id)}' in parents`)
    .join(" or ");
  const q = `(${parentClause}) and modifiedTime > '${sinceIso}' and trashed=false`;

  const all: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      key: apiKey,
      q,
      fields: "nextPageToken,files(id,name,mimeType,size,modifiedTime,parents)",
      pageSize: "200",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Drive API error ${res.status}: ${text}`);
    }
    const data = (await res.json()) as { files: DriveFile[]; nextPageToken?: string };
    all.push(...data.files);
    pageToken = data.nextPageToken;
  } while (pageToken);

  return all;
}

/**
 * Upserts a single Drive file/folder into `resources` and reports whether it
 * was newly added, returning its internal resource id.
 */
async function upsertOneResource(
  file: DriveFile,
  parentResourceId: string | null,
  depth: number,
  existingMap: Map<string, { id: string; depth: number }>
): Promise<{ resourceId: string; isNew: boolean; isFolder: boolean }> {
  const isFolder = file.mimeType === FOLDER_MIME;
  const prior = existingMap.get(file.id);
  const isNew = !prior;
  const resourceId = prior?.id ?? uuidv4();

  await pool.query(
    `INSERT INTO resources
       (id, drive_id, name, type, parent_id, depth, mime_type, size, modified_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     ON CONFLICT (drive_id) DO UPDATE SET
       name        = EXCLUDED.name,
       parent_id   = EXCLUDED.parent_id,
       depth       = EXCLUDED.depth,
       size        = EXCLUDED.size,
       modified_at = EXCLUDED.modified_at,
       updated_at  = NOW()`,
    [
      resourceId,
      file.id,
      file.name,
      isFolder ? "folder" : "pdf",
      parentResourceId,
      depth,
      file.mimeType,
      file.size ? parseInt(file.size, 10) : null,
      file.modifiedTime ?? null,
    ]
  );

  existingMap.set(file.id, { id: resourceId, depth });
  return { resourceId, isNew, isFolder };
}

/**
 * Fully scans one or more brand-new folders (found by the quick sync below)
 * that were not previously known, since Drive won't surface their
 * grandchildren via a parent-scoped query until we've seen the folder itself.
 */
async function scanNewSubtrees(
  apiKey: string,
  startItems: { driveId: string; parentResourceId: string | null; depth: number }[],
  existingMap: Map<string, { id: string; depth: number }>,
  stats: { filesAdded: number; filesRemoved: number; filesUpdated: number; foldersAdded: number }
): Promise<void> {
  const queue = [...startItems];

  while (queue.length > 0) {
    if (cancelRequested) throw new Error("Sync cancelled by user.");

    const item = queue.shift()!;
    let files: DriveFile[];
    try {
      files = await listAllInFolder(apiKey, item.driveId);
    } catch (err) {
      logger.warn({ err, driveId: item.driveId }, "Error listing new subtree folder");
      continue;
    }

    for (const file of files) {
      const { resourceId, isNew, isFolder } = await upsertOneResource(
        file,
        item.parentResourceId,
        item.depth + 1,
        existingMap
      );
      if (isNew) {
        if (isFolder) stats.foldersAdded++;
        else stats.filesAdded++;
      } else {
        stats.filesUpdated++;
      }
      if (isFolder) {
        queue.push({ driveId: file.id, parentResourceId: resourceId, depth: item.depth + 1 });
      }
    }
  }
}

/**
 * Quick sync — only asks Drive for files/folders modified since the last
 * sync, scoped to folders we already know about. Orders of magnitude faster
 * than a full BFS crawl on large trees. Falls back to a full scan
 * automatically on the very first run (no baseline timestamp yet).
 *
 * Known limitation: does not detect files deleted from Drive. Run a Full
 * Scan periodically (or after bulk deletions) to reconcile removals.
 */
export async function incrementalScanDrive(
  apiKey: string,
  rootFolderId: string,
  syncRecordId: string
): Promise<void> {
  const sinceIso = await getConfig("lastIncrementalSyncAt");

  if (!sinceIso) {
    dbLog("info", "No previous sync timestamp — running a full scan first");
    return scanDrive(apiKey, rootFolderId, syncRecordId);
  }

  const scanStartedAt = new Date();
  cancelRequested = false;

  syncState = {
    status: "running",
    lastSync: null,
    progress: 0,
    message: "Checking known folders for changes...",
    totalFiles: 0,
    totalFolders: 0,
  };

  const stats = { filesAdded: 0, filesRemoved: 0, filesUpdated: 0, foldersAdded: 0 };

  try {
    const { rows: knownFolders } = await pool.query(
      "SELECT drive_id, id, depth FROM resources WHERE type='folder'"
    );
    const existingMap = new Map<string, { id: string; depth: number }>(
      knownFolders.map((r) => [r.drive_id as string, { id: r.id as string, depth: r.depth as number }])
    );
    // Also load non-folder resources into the map so parent/child depth lookups
    // and "is this new" checks work for files too.
    const { rows: knownFiles } = await pool.query(
      "SELECT drive_id, id, depth FROM resources WHERE type='pdf'"
    );
    for (const r of knownFiles) {
      existingMap.set(r.drive_id as string, { id: r.id as string, depth: r.depth as number });
    }

    // Root isn't stored as a resource — treat it as a virtual known parent.
    const parentIdsToQuery = [rootFolderId, ...knownFolders.map((r) => r.drive_id as string)];
    const batches = chunk(parentIdsToQuery, MAX_PARENTS_PER_QUERY);

    const newFolderStarts: { driveId: string; parentResourceId: string | null; depth: number }[] = [];
    let processed = 0;

    for (const batch of batches) {
      if (cancelRequested) throw new Error("Sync cancelled by user.");

      syncState.message = `Scanning for changes... (batch ${processed + 1}/${batches.length})`;
      syncState.progress = Math.min(90, Math.round((processed / batches.length) * 90));

      let files: DriveFile[];
      try {
        files = await listFilesForParentsSince(apiKey, batch, sinceIso);
      } catch (err) {
        logger.warn({ err }, "Error querying batch for changes");
        dbLog("warn", "Quick sync batch query failed", String(err));
        processed++;
        continue;
      }

      for (const file of files) {
        const driveParentId = file.parents?.[0];
        let parentResourceId: string | null = null;
        let depth = 1;
        if (driveParentId && driveParentId !== rootFolderId) {
          const parentInfo = existingMap.get(driveParentId);
          if (parentInfo) {
            parentResourceId = parentInfo.id;
            depth = parentInfo.depth + 1;
          }
        }

        const wasKnownFolder = file.mimeType === FOLDER_MIME && existingMap.has(file.id);
        const { resourceId, isNew, isFolder } = await upsertOneResource(
          file,
          parentResourceId,
          depth,
          existingMap
        );

        if (isNew) {
          if (isFolder) stats.foldersAdded++;
          else stats.filesAdded++;
        } else {
          stats.filesUpdated++;
        }

        // A folder we hadn't seen before (or now seeing for the first time)
        // may itself contain children Drive won't surface via this
        // parent-scoped query yet — walk into it explicitly.
        if (isFolder && !wasKnownFolder) {
          newFolderStarts.push({ driveId: file.id, parentResourceId: resourceId, depth });
        }
      }

      processed++;
    }

    syncState.message = newFolderStarts.length
      ? `Found ${newFolderStarts.length} new folder(s) — scanning their contents...`
      : "Finalizing...";

    if (newFolderStarts.length > 0) {
      await scanNewSubtrees(apiKey, newFolderStarts, existingMap, stats);
    }

    await pool.query(
      `UPDATE sync_records SET
         completed_at = NOW(), status = 'success',
         files_added = $1, files_removed = $2, files_updated = $3, folders_added = $4
       WHERE id = $5`,
      [stats.filesAdded, stats.filesRemoved, stats.filesUpdated, stats.foldersAdded, syncRecordId]
    );

    // Only advance the baseline once everything succeeded, so a failed run
    // doesn't silently skip the window it was supposed to cover.
    await setConfig("lastIncrementalSyncAt", scanStartedAt.toISOString());

    const now = new Date().toISOString();
    const changedCount = stats.filesAdded + stats.filesRemoved + stats.filesUpdated + stats.foldersAdded;
    syncState = {
      status: "idle",
      lastSync: now,
      progress: 100,
      message: changedCount === 0
        ? "Quick sync complete — no changes found."
        : `Quick sync complete. ${stats.filesAdded} added, ${stats.filesUpdated} updated, ${stats.foldersAdded} new folders. (Deletions aren't detected by Quick Sync — run a Full Scan to catch those.)`,
      totalFiles: stats.filesAdded,
      totalFolders: stats.foldersAdded,
    };

    dbLog("info", "Quick sync complete", JSON.stringify(stats));
  } catch (err) {
    const msg = String(err);
    syncState = {
      status: "error",
      lastSync: syncState.lastSync,
      progress: null,
      message: msg,
      totalFiles: null,
      totalFolders: null,
    };
    await pool.query(
      "UPDATE sync_records SET completed_at = NOW(), status = 'error', error_message = $1 WHERE id = $2",
      [msg, syncRecordId]
    );
    dbLog("error", "Quick sync failed", msg);
    throw err;
  }
}

// ── Validate Drive config ──────────────────────────────────────────────────
export async function validateDriveConfig(
  apiKey: string,
  rootFolderId: string
): Promise<{ valid: boolean; folderName: string | null; error: string | null }> {
  try {
    const params = new URLSearchParams({ key: apiKey, fields: "id,name" });
    const url = `https://www.googleapis.com/drive/v3/files/${rootFolderId}?${params}`;
    const res = await fetch(url);
    if (!res.ok) {
      const data = (await res.json()) as { error?: { message?: string } };
      return { valid: false, folderName: null, error: data?.error?.message ?? "Invalid" };
    }
    const data = (await res.json()) as { name: string };
    return { valid: true, folderName: data.name, error: null };
  } catch (err) {
    return { valid: false, folderName: null, error: String(err) };
  }
}

// ── Folder generator helpers ───────────────────────────────────────────────
export async function findOrCreateFolder(
  apiKey: string,
  name: string,
  parentId: string
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      key: apiKey,
      q: `'${parentId}' in parents and name='${name.replace(/'/g, "\\'")}' and mimeType='${FOLDER_MIME}' and trashed=false`,
      fields: "files(id,name)",
    });
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`);
    if (res.ok) {
      const data = (await res.json()) as { files: { id: string }[] };
      if (data.files.length > 0) return data.files[0]!.id;
    }
  } catch {}
  return null;
}
