import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/index";
import { getConfig } from "./config";
import { scanDrive, incrementalScanDrive, getSyncState, requestCancelSync } from "./drive";
import { logger } from "./logger";
import { dbLog } from "./dbLogger";

let syncTimer: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;

export async function runSync(force = false): Promise<string> {
  if (isSyncing && !force) {
    const { rows } = await pool.query(
      "SELECT id FROM sync_records WHERE status='running' ORDER BY started_at DESC LIMIT 1"
    );
    return rows[0]?.id ?? "already-running";
  }

  const apiKey = await getConfig("driveApiKey");
  const rootFolderId = await getConfig("driveRootFolderId");

  if (!apiKey || !rootFolderId) {
    throw new Error("Google Drive not configured. Set API Key and Root Folder ID in settings.");
  }

  const syncId = uuidv4();
  await pool.query(
    "INSERT INTO sync_records (id, started_at, status) VALUES ($1, NOW(), 'running')",
    [syncId]
  );

  isSyncing = true;
  dbLog("info", "Drive sync started", `syncId=${syncId}, force=${force}`);

  // Run async — don't await
  scanDrive(apiKey, rootFolderId, syncId)
    .then(() => {
      isSyncing = false;
      logger.info({ syncId }, "Drive sync completed");
    })
    .catch((err) => {
      isSyncing = false;
      logger.error({ err, syncId }, "Drive sync failed");
    });

  return syncId;
}

export async function runIncrementalSync(): Promise<string> {
  if (isSyncing) {
    const { rows } = await pool.query(
      "SELECT id FROM sync_records WHERE status='running' ORDER BY started_at DESC LIMIT 1"
    );
    return rows[0]?.id ?? "already-running";
  }

  const apiKey = await getConfig("driveApiKey");
  const rootFolderId = await getConfig("driveRootFolderId");

  if (!apiKey || !rootFolderId) {
    throw new Error("Google Drive not configured. Set API Key and Root Folder ID in settings.");
  }

  const syncId = uuidv4();
  await pool.query(
    "INSERT INTO sync_records (id, started_at, status) VALUES ($1, NOW(), 'running')",
    [syncId]
  );

  isSyncing = true;
  dbLog("info", "Incremental Drive sync started", `syncId=${syncId}`);

  // Run async — don't await
  incrementalScanDrive(apiKey, rootFolderId, syncId)
    .then(() => {
      isSyncing = false;
      logger.info({ syncId }, "Incremental Drive sync completed");
    })
    .catch((err) => {
      isSyncing = false;
      logger.error({ err, syncId }, "Incremental Drive sync failed");
    });

  return syncId;
}

export function cancelSync(): void {
  requestCancelSync();
}

export async function startAutoSync(): Promise<void> {
  const autoSync = await getConfig("autoSync");
  if (autoSync !== "true") return;

  const intervalMinutes = parseInt((await getConfig("syncIntervalMinutes")) || "60", 10);
  const intervalMs = intervalMinutes * 60 * 1000;

  if (syncTimer) {
    clearInterval(syncTimer);
  }

  syncTimer = setInterval(() => {
    logger.info("Auto-sync triggered");
    runSync().catch((err) => logger.error({ err }, "Auto-sync failed"));
  }, intervalMs);

  logger.info({ intervalMinutes }, "Auto-sync scheduled");
}

export function stopAutoSync(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

export async function getCurrentSyncStatus(): Promise<{
  status: string;
  lastSync: string | null;
  progress: number | null;
  message: string | null;
  totalFiles: number | null;
  totalFolders: number | null;
}> {
  const state = getSyncState();

  const { rows } = await pool.query(
    "SELECT completed_at FROM sync_records WHERE status='success' ORDER BY completed_at DESC LIMIT 1"
  );
  const lastRecord = rows[0];

  return {
    ...state,
    lastSync: state.lastSync ?? (lastRecord?.completed_at ? String(lastRecord.completed_at) : null),
  };
}
