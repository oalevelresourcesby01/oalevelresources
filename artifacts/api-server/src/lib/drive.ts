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

export function getSyncState(): SyncState {
  return { ...syncState };
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

    while (queue.length > 0) {
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

    // Save a Drive Changes token so future quick syncs only fetch diffs
    const changesToken = await fetchChangesStartToken(apiKey);
    if (changesToken) {
      await setConfig("driveChangesToken", changesToken);
    }

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

// ── Drive Changes API helpers ──────────────────────────────────────────────

async function fetchChangesStartToken(apiKey: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      key: apiKey,
      supportsAllDrives: "true",
    });
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/changes/startPageToken?${params}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { startPageToken?: string };
    return data.startPageToken ?? null;
  } catch {
    return null;
  }
}

/**
 * Incremental sync — uses the Drive Changes API to process only files/folders
 * that changed since the last full or incremental sync. Orders of magnitude
 * faster than a full BFS crawl for large hierarchies. Falls back to a full
 * scan automatically when no saved token exists (i.e. first run).
 */
export async function incrementalScanDrive(
  apiKey: string,
  rootFolderId: string,
  syncRecordId: string
): Promise<void> {
  const storedToken = await getConfig("driveChangesToken");

  if (!storedToken) {
    // First sync ever — fall back to full scan which will save a token at the end
    dbLog("info", "No changes token — falling back to full scan");
    return scanDrive(apiKey, rootFolderId, syncRecordId);
  }

  syncState = {
    status: "running",
    lastSync: null,
    progress: 0,
    message: "Fetching changes from Drive...",
    totalFiles: 0,
    totalFolders: 0,
  };

  const stats = { filesAdded: 0, filesRemoved: 0, filesUpdated: 0, foldersAdded: 0 };

  try {
    let pageToken: string = storedToken;
    let newStartPageToken: string | null = null;
    let processed = 0;

    while (pageToken) {
      const params = new URLSearchParams({
        key: apiKey,
        pageToken,
        includeRemoved: "true",
        supportsAllDrives: "true",
        includeItemsFromAllDrives: "true",
        pageSize: "1000",
        fields:
          "nextPageToken,newStartPageToken,changes(removed,fileId,file(id,name,mimeType,size,modifiedTime,parents,trashed))",
      });

      const res = await fetch(
        `https://www.googleapis.com/drive/v3/changes?${params}`
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Drive Changes API error ${res.status}: ${text}`);
      }

      interface DriveChange {
        removed: boolean;
        fileId: string;
        file?: DriveFile & { trashed?: boolean };
      }
      const data = (await res.json()) as {
        nextPageToken?: string;
        newStartPageToken?: string;
        changes: DriveChange[];
      };

      if (data.newStartPageToken) newStartPageToken = data.newStartPageToken;

      for (const change of data.changes) {
        processed++;
        syncState.message = `Processing ${processed} change(s)...`;
        syncState.progress = Math.min(90, processed * 2);

        if (change.removed || change.file?.trashed) {
          // Deleted or trashed — remove from our DB and cascade children
          await pool.query("DELETE FROM resources WHERE drive_id = $1", [change.fileId]);
          stats.filesRemoved++;
          continue;
        }

        const f = change.file;
        if (!f) continue;

        const isFolder = f.mimeType === FOLDER_MIME;

        // Resolve parent UUID from the Drive parent ID
        let parentId: string | null = null;
        let depth = 1;
        if (f.parents && f.parents.length > 0) {
          const driveParentId = f.parents[0]!;
          if (driveParentId === rootFolderId) {
            // Direct child of root — parentId stays null (root isn't stored)
          } else {
            const { rows: parentRows } = await pool.query(
              "SELECT id, depth FROM resources WHERE drive_id = $1",
              [driveParentId]
            );
            if (parentRows.length > 0) {
              parentId = parentRows[0].id as string;
              depth = ((parentRows[0].depth as number) ?? 0) + 1;
            }
          }
        }

        const { rows: existing } = await pool.query(
          "SELECT id FROM resources WHERE drive_id = $1",
          [f.id]
        );
        const isNew = existing.length === 0;
        const resourceId = isNew ? uuidv4() : (existing[0].id as string);

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
            resourceId, f.id, f.name,
            isFolder ? "folder" : "pdf",
            parentId, depth, f.mimeType,
            f.size ? parseInt(f.size, 10) : null,
            f.modifiedTime ?? null,
          ]
        );

        if (isNew) {
          if (isFolder) stats.foldersAdded++;
          else stats.filesAdded++;
        } else {
          stats.filesUpdated++;
        }
      }

      pageToken = data.nextPageToken ?? "";
    }

    // Persist the new token for the next incremental sync
    if (newStartPageToken) {
      await setConfig("driveChangesToken", newStartPageToken);
    }

    await pool.query(
      `UPDATE sync_records SET
         completed_at = NOW(), status = 'success',
         files_added = $1, files_removed = $2, files_updated = $3, folders_added = $4
       WHERE id = $5`,
      [stats.filesAdded, stats.filesRemoved, stats.filesUpdated, stats.foldersAdded, syncRecordId]
    );

    const now = new Date().toISOString();
    const changedCount = stats.filesAdded + stats.filesRemoved + stats.filesUpdated + stats.foldersAdded;
    syncState = {
      status: "idle",
      lastSync: now,
      progress: 100,
      message: changedCount === 0
        ? "Quick sync complete — no changes in Drive."
        : `Quick sync complete. ${stats.filesAdded} added, ${stats.filesRemoved} removed, ${stats.filesUpdated} updated.`,
      totalFiles: stats.filesAdded,
      totalFolders: stats.foldersAdded,
    };

    dbLog("info", "Incremental Drive sync complete", JSON.stringify(stats));
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
    dbLog("error", "Incremental Drive sync failed", msg);
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
