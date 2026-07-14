import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { runSync, runIncrementalSync, cancelSync, getCurrentSyncStatus } from "../lib/sync";
import { validateDriveConfig } from "../lib/drive";
import { pool } from "../db/index";

const router = Router();

// POST /api/drive/sync  (full scan; pass mode:"incremental" for delta sync)
router.post("/drive/sync", requireAuth, async (req, res) => {
  const { force = false, mode = "full" } = (req.body ?? {}) as {
    force?: boolean;
    mode?: "full" | "incremental";
  };

  try {
    const jobId =
      mode === "incremental"
        ? await runIncrementalSync()
        : await runSync(force);
    res.json({ jobId, status: "started", message: "Sync job started" });
  } catch (err) {
    res.status(500).json({ jobId: "error", status: "error", message: String(err) });
  }
});

// POST /api/drive/sync/cancel
router.post("/drive/sync/cancel", requireAuth, (_req, res) => {
  cancelSync();
  res.json({ ok: true, message: "Cancel requested — sync will stop at the next checkpoint." });
});

// GET /api/drive/sync/status
router.get("/drive/sync/status", async (req, res) => {
  const status = await getCurrentSyncStatus();
  res.json({
    status: status.status,
    lastSync: status.lastSync,
    progress: status.progress,
    message: status.message,
    totalFiles: status.totalFiles,
    totalFolders: status.totalFolders,
  });
});

// GET /api/drive/sync/history
router.get("/drive/sync/history", requireAuth, async (req, res) => {
  const limit = Math.min(parseInt((req.query["limit"] as string) || "20", 10), 100);
  const { rows } = await pool.query(
    "SELECT * FROM sync_records ORDER BY started_at DESC LIMIT $1",
    [limit]
  );

  res.json(
    rows.map((r) => ({
      id: r.id,
      startedAt: String(r.started_at),
      completedAt: r.completed_at ? String(r.completed_at) : null,
      status: r.status,
      filesAdded: r.files_added,
      filesRemoved: r.files_removed,
      filesUpdated: r.files_updated,
      foldersAdded: r.folders_added,
      errorMessage: r.error_message,
    }))
  );
});

// POST /api/drive/validate
router.post("/drive/validate", requireAuth, async (req, res) => {
  const { driveApiKey, rootFolderId } = req.body as {
    driveApiKey?: string;
    rootFolderId?: string;
  };

  if (!driveApiKey || !rootFolderId) {
    res.status(400).json({ valid: false, folderName: null, error: "Both fields required" });
    return;
  }

  const result = await validateDriveConfig(driveApiKey, rootFolderId);
  res.json(result);
});

export default router;
