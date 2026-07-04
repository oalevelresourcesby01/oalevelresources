import { Router } from "express";
import { getCurrentSyncStatus } from "../lib/sync";

const router = Router();

const startTime = Date.now();

router.get("/healthz", async (req, res) => {
  const sync = await getCurrentSyncStatus();
  res.json({
    status: "ok",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: "1.0.0",
    syncStatus: sync.status,
  });
});

export default router;
