import { Router } from "express";
import { pool } from "../db/index";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /api/logs
router.get("/logs", requireAuth, async (req, res) => {
  const level = req.query["level"] as string | undefined;
  const limit = Math.min(parseInt((req.query["limit"] as string) || "100", 10), 1000);
  const offset = parseInt((req.query["offset"] as string) || "0", 10);

  const validLevels = ["error", "warn", "info", "debug"];
  const params: unknown[] = [];

  let levelFilter = "";
  if (level && validLevels.includes(level)) {
    params.push(level);
    levelFilter = `WHERE level = $${params.length}`;
  }

  params.push(limit, offset);
  const limitIdx = params.length - 1;
  const offsetIdx = params.length;

  const [dataRes, countRes] = await Promise.all([
    pool.query(
      `SELECT * FROM logs ${levelFilter} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    ),
    pool.query(
      `SELECT COUNT(*) AS c FROM logs ${levelFilter}`,
      params.slice(0, params.length - 2)
    ),
  ]);

  res.json({
    logs: dataRes.rows.map((r) => ({
      id: r.id,
      level: r.level,
      message: r.message,
      context: r.context,
      createdAt: String(r.created_at),
    })),
    total: parseInt(countRes.rows[0].c, 10),
  });
});

// DELETE /api/logs
router.delete("/logs", requireAuth, async (req, res) => {
  await pool.query("DELETE FROM logs");
  res.json({ success: true, message: "Logs cleared" });
});

export default router;
