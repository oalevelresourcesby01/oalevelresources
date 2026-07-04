import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { getConfig } from "../lib/config";
import { findOrCreateFolder } from "../lib/drive";
import { dbLog } from "../lib/dbLogger";

const router = Router();

interface LevelConfig {
  name: string;
  subjects: {
    name: string;
    categories: {
      name: string;
      years?: string[];
      sessions?: string[];
      variants?: string[];
      paperTypes?: string[];
    }[];
  }[];
}

function buildFolderPaths(levels: LevelConfig[]): string[] {
  const paths: string[] = [];

  for (const level of levels) {
    for (const subject of level.subjects) {
      for (const category of subject.categories) {
        const base = `${level.name}/${subject.name}/${category.name}`;

        const years = category.years ?? [];
        const sessions = category.sessions ?? [];
        const variants = category.variants ?? [];
        const paperTypes = category.paperTypes ?? [];

        if (!years.length && !sessions.length && !variants.length && !paperTypes.length) {
          paths.push(base);
          continue;
        }

        for (const year of years.length ? years : [null]) {
          for (const session of sessions.length ? sessions : [null]) {
            for (const variant of variants.length ? variants : [null]) {
              for (const paperType of paperTypes.length ? paperTypes : [null]) {
                const parts = [base];
                if (year) parts.push(year);
                if (session) parts.push(session);
                if (variant) parts.push(variant);
                if (paperType) parts.push(paperType);
                paths.push(parts.join("/"));
              }
            }
          }
        }
      }
    }
  }

  return [...new Set(paths)].sort();
}

// POST /api/folders/preview
router.post("/folders/preview", requireAuth, (req, res) => {
  const { levels } = req.body as { levels?: LevelConfig[] };

  if (!levels?.length) {
    res.status(400).json({ error: "levels is required" });
    return;
  }

  const paths = buildFolderPaths(levels);
  res.json({
    folders: paths.map((p) => ({ path: p, depth: p.split("/").length })),
    total: paths.length,
  });
});

// POST /api/folders/generate
router.post("/folders/generate", requireAuth, async (req, res) => {
  const { levels } = req.body as { levels?: LevelConfig[] };

  if (!levels?.length) {
    res.status(400).json({ error: "levels is required" });
    return;
  }

  const [apiKey, rootFolderId] = await Promise.all([
    getConfig("driveApiKey"),
    getConfig("driveRootFolderId"),
  ]);

  if (!apiKey || !rootFolderId) {
    res.status(400).json({ error: "Google Drive not configured" });
    return;
  }

  const paths = buildFolderPaths(levels);
  const details: { path: string; status: "created" | "skipped" | "error"; driveId: string | null; error: string | null }[] = [];

  const folderCache = new Map<string, string>();
  folderCache.set("", rootFolderId);

  let created = 0, skipped = 0, errors = 0;

  for (const fullPath of paths) {
    const segments = fullPath.split("/");
    let currentPath = "";
    let success = true;
    let lastDriveId: string | null = null;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]!;
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;

      if (folderCache.has(currentPath)) {
        lastDriveId = folderCache.get(currentPath)!;
        continue;
      }

      const parentDriveId = folderCache.get(parentPath) ?? rootFolderId;

      try {
        const existingId = await findOrCreateFolder(apiKey, segment, parentDriveId);
        if (existingId) {
          folderCache.set(currentPath, existingId);
          lastDriveId = existingId;
          if (i === segments.length - 1) skipped++;
        } else {
          dbLog("warn", `Cannot create folder with API key — needs OAuth: ${currentPath}`);
          success = false;
          errors++;
          details.push({ path: fullPath, status: "error", driveId: null, error: "Write access requires OAuth token. API key is read-only." });
          break;
        }
      } catch (err) {
        success = false;
        errors++;
        details.push({ path: fullPath, status: "error", driveId: null, error: String(err) });
        break;
      }
    }

    if (success && !details.some((d) => d.path === fullPath)) {
      details.push({ path: fullPath, status: "skipped", driveId: lastDriveId, error: null });
    }
  }

  dbLog("info", "Folder generation complete", JSON.stringify({ created, skipped, errors }));
  res.json({ created, skipped, errors, total: paths.length, details });
});

export default router;
