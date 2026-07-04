import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/index";
import { requireAuth } from "../middlewares/auth";
import { dbLog } from "../lib/dbLogger";

const router = Router();

function mapAnnouncement(r: any) {
  return {
    id: r.id,
    title: r.title,
    message: r.message,
    active: r.active as boolean,  // PostgreSQL returns native boolean
    priority: r.priority,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

// GET /api/announcements
router.get("/announcements", async (req, res) => {
  const { active } = req.query;

  let query = "SELECT * FROM announcements";
  const params: unknown[] = [];

  if (active === "true") {
    query += " WHERE active = TRUE";
  } else if (active === "false") {
    query += " WHERE active = FALSE";
  }

  query += " ORDER BY priority DESC, created_at DESC";

  const { rows } = await pool.query(query, params);
  res.json(rows.map(mapAnnouncement));
});

// POST /api/announcements
router.post("/announcements", requireAuth, async (req, res) => {
  const { title, message, active = true, priority = 0 } = req.body as {
    title?: string;
    message?: string;
    active?: boolean;
    priority?: number;
  };

  if (!title || !message) {
    res.status(400).json({ error: "Title and message are required" });
    return;
  }

  const id = uuidv4();
  await pool.query(
    "INSERT INTO announcements (id, title, message, active, priority) VALUES ($1, $2, $3, $4, $5)",
    [id, title, message, active, priority]
  );

  dbLog("info", `Announcement created: ${title}`);

  const { rows } = await pool.query("SELECT * FROM announcements WHERE id = $1", [id]);
  res.status(201).json(mapAnnouncement(rows[0]));
});

// GET /api/announcements/:id
router.get("/announcements/:id", async (req, res) => {
  const id = req.params["id"] as string;
  const { rows } = await pool.query("SELECT * FROM announcements WHERE id = $1", [id]);

  if (!rows[0]) {
    res.status(404).json({ error: "Announcement not found" });
    return;
  }

  res.json(mapAnnouncement(rows[0]));
});

// PUT /api/announcements/:id
router.put("/announcements/:id", requireAuth, async (req, res) => {
  const id = req.params["id"] as string;
  const { title, message, active, priority } = req.body as {
    title?: string;
    message?: string;
    active?: boolean;
    priority?: number;
  };

  const { rows: existing } = await pool.query("SELECT * FROM announcements WHERE id = $1", [id]);
  if (!existing[0]) {
    res.status(404).json({ error: "Announcement not found" });
    return;
  }

  const ex = existing[0];
  await pool.query(
    "UPDATE announcements SET title=$1, message=$2, active=$3, priority=$4, updated_at=NOW() WHERE id=$5",
    [
      title ?? ex.title,
      message ?? ex.message,
      active !== undefined ? active : ex.active,
      priority ?? ex.priority,
      id,
    ]
  );

  dbLog("info", `Announcement updated: ${id}`);

  const { rows } = await pool.query("SELECT * FROM announcements WHERE id = $1", [id]);
  res.json(mapAnnouncement(rows[0]));
});

// DELETE /api/announcements/:id
router.delete("/announcements/:id", requireAuth, async (req, res) => {
  const id = req.params["id"] as string;
  const { rows } = await pool.query("SELECT id FROM announcements WHERE id = $1", [id]);

  if (!rows[0]) {
    res.status(404).json({ error: "Announcement not found" });
    return;
  }

  await pool.query("DELETE FROM announcements WHERE id = $1", [id]);
  dbLog("info", `Announcement deleted: ${id}`);

  res.json({ success: true, message: "Announcement deleted" });
});

export default router;
