import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  getKnowledgeStats,
  getIndexState,
  listIndexedResources,
  listAiSearchLogs,
  rebuildKnowledgeIndex,
  indexNewResources,
  removeDeletedResources,
} from "../lib/knowledge";
import { dbLog } from "../lib/dbLogger";

const router = Router();

// GET /api/ai/knowledge/stats — admin only
router.get("/ai/knowledge/stats", requireAuth, async (_req, res) => {
  const [stats, indexStatus] = await Promise.all([
    getKnowledgeStats(),
    Promise.resolve(getIndexState()),
  ]);
  res.json({ ...stats, indexStatus });
});

// GET /api/ai/knowledge/resources — admin only
router.get("/ai/knowledge/resources", requireAuth, async (_req, res) => {
  const resources = await listIndexedResources();
  res.json(resources);
});

// GET /api/ai/knowledge/search-logs — admin only
router.get("/ai/knowledge/search-logs", requireAuth, async (req, res) => {
  const raw = Number(req.query["limit"] ?? 50);
  const limit = Number.isFinite(raw) ? Math.min(Math.max(1, Math.floor(raw)), 200) : 50;
  const logs = await listAiSearchLogs(limit);
  res.json(logs);
});

// POST /api/ai/knowledge/rebuild — fires async, client polls stats
router.post("/ai/knowledge/rebuild", requireAuth, (_req, res) => {
  const state = getIndexState();
  if (state.status === "running") {
    res.status(409).json({ error: "An index operation is already in progress." });
    return;
  }
  dbLog("info", "Knowledge index: full rebuild requested by admin");
  void rebuildKnowledgeIndex().catch((err) =>
    dbLog("error", "Knowledge rebuild background error", String(err))
  );
  res.status(202).json({ success: true, message: "Rebuild started. Poll /ai/knowledge/stats for progress." });
});

// POST /api/ai/knowledge/index-new — fires async, client polls stats
router.post("/ai/knowledge/index-new", requireAuth, (_req, res) => {
  const state = getIndexState();
  if (state.status === "running") {
    res.status(409).json({ error: "An index operation is already in progress." });
    return;
  }
  dbLog("info", "Knowledge index: index-new requested by admin");
  void indexNewResources().catch((err) =>
    dbLog("error", "Knowledge index-new background error", String(err))
  );
  res.status(202).json({ success: true, message: "Indexing started. Poll /ai/knowledge/stats for progress." });
});

// POST /api/ai/knowledge/remove-deleted — admin only
router.post("/ai/knowledge/remove-deleted", requireAuth, async (_req, res) => {
  dbLog("info", "Knowledge index: remove-deleted requested by admin");
  try {
    const result = await removeDeletedResources();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
