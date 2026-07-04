import { Router } from "express";
import { pool } from "../db/index";

const router = Router();

// GET /api/search?q=...&type=...&levelId=...&page=...&pageSize=...
router.get("/search", async (req, res) => {
  const q = (req.query["q"] as string) || "";
  const type = (req.query["type"] as string) || "all";
  const levelId = req.query["levelId"] as string | undefined;

  const rawPage = parseInt((req.query["page"] as string) || "1", 10);
  const rawPageSize = parseInt((req.query["pageSize"] as string) || "30", 10);

  if (!Number.isFinite(rawPage) || rawPage < 1) {
    res.status(400).json({ error: "page must be a positive integer" });
    return;
  }
  if (!Number.isFinite(rawPageSize) || rawPageSize < 1) {
    res.status(400).json({ error: "pageSize must be a positive integer" });
    return;
  }

  const page = rawPage;
  const pageSize = Math.min(rawPageSize, 100);
  const offset = (page - 1) * pageSize;

  if (!q.trim()) {
    res.json({ results: [], total: 0, query: q, page, pageSize });
    return;
  }

  // Escape LIKE special chars; PostgreSQL uses \ as default escape in ILIKE
  const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;

  let typeFilter = "";
  if (type === "pdf") typeFilter = "AND r.type = 'pdf'";
  else if (type === "folder") typeFilter = "AND r.type = 'folder'";

  const params: unknown[] = [like];
  let levelFilter = "";
  if (levelId) {
    params.push(levelId, levelId);
    levelFilter = `AND (r.id = $${params.length - 1} OR r.parent_id = $${params.length})`;
  }

  // Main query
  const dataParams = [...params, pageSize, offset];
  const { rows } = await pool.query(
    `SELECT r.*, p.name AS parent_name, p.id AS parent_node_id
     FROM resources r
     LEFT JOIN resources p ON r.parent_id = p.id
     WHERE r.name ILIKE $1 ${typeFilter} ${levelFilter}
     ORDER BY r.type DESC, r.name
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  // Count query
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) AS c FROM resources r
     WHERE r.name ILIKE $1 ${typeFilter} ${levelFilter}`,
    params
  );

  res.json({
    results: rows.map((r) => ({
      id: r.id,
      driveId: r.drive_id,
      name: r.name,
      type: r.type,
      breadcrumb: [
        ...(r.parent_node_id ? [{ id: r.parent_node_id, name: r.parent_name }] : []),
        { id: r.id, name: r.name },
      ],
      size: r.size ? Number(r.size) : null,
      modifiedAt: r.modified_at ? String(r.modified_at) : null,
    })),
    total: parseInt(countRows[0].c, 10),
    query: q,
    page,
    pageSize,
  });
});

export default router;
