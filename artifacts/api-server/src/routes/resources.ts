import { Router } from "express";
import { pool } from "../db/index";
import { getConfig } from "../lib/config";

const router = Router();

function mapNode(r: any) {
  return {
    id: r.id,
    driveId: r.drive_id,
    name: r.name,
    type: r.type,
    depth: r.depth,
    parentId: r.parent_id,
    mimeType: r.mime_type,
    size: r.size ? Number(r.size) : null,
    modifiedAt: r.modified_at ? String(r.modified_at) : null,
    childCount: r.child_count,
    createdAt: String(r.created_at),
  };
}

// GET /api/resources/levels
router.get("/resources/levels", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM resources WHERE depth=1 AND type='folder' ORDER BY name"
  );
  res.json(rows.map(mapNode));
});

// GET /api/resources/stats
router.get("/resources/stats", async (req, res) => {
  const [pdfs, folders, levels, subjects, lastSync, totalSize] = await Promise.all([
    pool.query("SELECT COUNT(*) AS c FROM resources WHERE type='pdf'"),
    pool.query("SELECT COUNT(*) AS c FROM resources WHERE type='folder'"),
    pool.query("SELECT COUNT(*) AS c FROM resources WHERE depth=1 AND type='folder'"),
    pool.query("SELECT COUNT(*) AS c FROM resources WHERE depth=2 AND type='folder'"),
    pool.query("SELECT completed_at FROM sync_records WHERE status='success' ORDER BY completed_at DESC LIMIT 1"),
    pool.query("SELECT SUM(size) AS s FROM resources"),
  ]);

  res.json({
    totalPdfs: parseInt(pdfs.rows[0].c, 10),
    totalFolders: parseInt(folders.rows[0].c, 10),
    totalLevels: parseInt(levels.rows[0].c, 10),
    totalSubjects: parseInt(subjects.rows[0].c, 10),
    lastSync: lastSync.rows[0]?.completed_at ? String(lastSync.rows[0].completed_at) : null,
    totalSizeBytes: totalSize.rows[0]?.s ? Number(totalSize.rows[0].s) : null,
  });
});

// GET /api/resources/recent
router.get("/resources/recent", async (req, res) => {
  const limit = parseInt((req.query["limit"] as string) || "20", 10);
  const { rows } = await pool.query(
    `SELECT r.*, p.name AS parent_name FROM resources r
     LEFT JOIN resources p ON r.parent_id = p.id
     WHERE r.type='pdf'
     ORDER BY r.created_at DESC
     LIMIT $1`,
    [limit]
  );

  res.json(
    rows.map((r) => ({
      id: r.id,
      driveId: r.drive_id,
      name: r.name,
      type: r.type,
      parentId: r.parent_id,
      parentName: r.parent_name,
      size: r.size ? Number(r.size) : null,
      modifiedAt: r.modified_at ? String(r.modified_at) : null,
    }))
  );
});

// GET /api/resources/nodes/:nodeId
router.get("/resources/nodes/:nodeId", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM resources WHERE id = $1",
    [req.params["nodeId"]]
  );

  if (!rows[0]) {
    res.status(404).json({ error: "Node not found" });
    return;
  }

  res.json(mapNode(rows[0]));
});

// GET /api/resources/nodes/:nodeId/children
router.get("/resources/nodes/:nodeId/children", async (req, res) => {
  const nodeId = req.params["nodeId"];

  // Special "root" alias — return all top-level nodes (parent_id IS NULL)
  if (nodeId === "root") {
    const { rows } = await pool.query(
      "SELECT * FROM resources WHERE parent_id IS NULL ORDER BY type DESC, name"
    );
    res.json({ items: rows.map(mapNode), total: rows.length, page: 1, pageSize: rows.length });
    return;
  }

  const { rows: nodeRows } = await pool.query(
    "SELECT id, drive_id FROM resources WHERE id = $1",
    [nodeId]
  );

  if (!nodeRows[0]) {
    res.status(404).json({ error: "Node not found" });
    return;
  }

  const [childRows, countRow] = await Promise.all([
    pool.query(
      "SELECT * FROM resources WHERE parent_id = $1 ORDER BY type DESC, name",
      [nodeId]
    ),
    pool.query(
      "SELECT COUNT(*) AS c FROM resources WHERE parent_id = $1",
      [nodeId]
    ),
  ]);

  res.json({
    items: childRows.rows.map(mapNode),
    total: parseInt(countRow.rows[0].c, 10),
    page: 1,
    pageSize: childRows.rows.length,
  });
});

// GET /api/resources/nodes/:nodeId/breadcrumb
router.get("/resources/nodes/:nodeId/breadcrumb", async (req, res) => {
  const breadcrumb: { id: string; name: string }[] = [];
  let currentId: string | null = req.params["nodeId"];

  // Walk up the tree (max 20 levels to prevent loops)
  for (let i = 0; i < 20 && currentId; i++) {
    const { rows }: { rows: { id: string; name: string; parent_id: string | null }[] } =
      await pool.query(
        "SELECT id, name, parent_id FROM resources WHERE id = $1",
        [currentId]
      );
    if (!rows[0]) break;
    breadcrumb.unshift({ id: rows[0].id, name: rows[0].name });
    currentId = rows[0].parent_id ?? null;
  }

  res.json(breadcrumb);
});

// GET /api/resources/pdf/:nodeId/url
router.get("/resources/pdf/:nodeId/url", async (req, res) => {
  const nodeId = req.params["nodeId"] as string;
  const { rows } = await pool.query(
    "SELECT id, drive_id FROM resources WHERE id = $1 AND type = 'pdf'",
    [nodeId]
  );

  if (!rows[0]) {
    res.status(404).json({ error: "PDF not found" });
    return;
  }

  const host = req.get("host") ?? "localhost";
  const protocol = req.get("x-forwarded-proto") ?? req.protocol ?? "https";
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

  res.json({
    url: `${protocol}://${host}/api/resources/pdf/${rows[0].id}/content`,
    expiresAt,
    driveId: rows[0].drive_id,
  });
});

// GET /api/resources/pdf/:nodeId/content — server-side proxy
router.get("/resources/pdf/:nodeId/content", async (req, res) => {
  const nodeId = req.params["nodeId"] as string;
  const { rows } = await pool.query(
    "SELECT drive_id FROM resources WHERE id = $1 AND type = 'pdf'",
    [nodeId]
  );

  if (!rows[0]) {
    res.status(404).json({ error: "PDF not found" });
    return;
  }

  const apiKey = await getConfig("driveApiKey");
  if (!apiKey) {
    res.status(503).json({ error: "Google Drive not configured" });
    return;
  }

  try {
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${rows[0].drive_id}?key=${apiKey}&alt=media`;
    const upstream = await fetch(driveUrl);

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: "Failed to fetch PDF from Drive" });
      return;
    }

    res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "application/pdf");
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) res.setHeader("Content-Length", contentLength);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("Content-Disposition", "inline");

    if (upstream.body) {
      const reader = upstream.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    }
    res.end();
  } catch {
    res.status(500).json({ error: "Proxy error" });
  }
});

export default router;
