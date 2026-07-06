// src/db/index.ts
import { Pool } from "pg";

// src/lib/logger.ts
import pino from "pino";
var isProduction = process.env.NODE_ENV === "production";
var logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']"
  ],
  ...isProduction ? {} : {
    transport: {
      target: "pino-pretty",
      options: { colorize: true }
    }
  }
});

// src/db/index.ts
var rawDatabaseUrl = process.env["DATABASE_URL"];
if (!rawDatabaseUrl) {
  throw new Error(
    "DATABASE_URL environment variable is required but was not provided."
  );
}
var sslDisabled = rawDatabaseUrl.includes("sslmode=disable");
function stripSslMode(url) {
  const parsed = new URL(url);
  parsed.searchParams.delete("sslmode");
  return parsed.toString();
}
var databaseUrl = stripSslMode(rawDatabaseUrl);
var pool = new Pool({
  connectionString: databaseUrl,
  ssl: sslDisabled ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 1e4,
  idleTimeoutMillis: 3e4,
  max: 10
});
pool.on("error", (err) => {
  logger.error({ err }, "Unexpected error on idle PostgreSQL client");
});

// src/db/migrate.ts
import { randomUUID } from "crypto";
async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS config (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      message    TEXT NOT NULL,
      active     BOOLEAN NOT NULL DEFAULT TRUE,
      priority   INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS resources (
      id          TEXT PRIMARY KEY,
      drive_id    TEXT NOT NULL UNIQUE,
      name        TEXT NOT NULL,
      type        TEXT NOT NULL CHECK(type IN ('folder','pdf')),
      parent_id   TEXT,
      depth       INTEGER NOT NULL DEFAULT 0,
      mime_type   TEXT,
      size        BIGINT,
      modified_at TIMESTAMPTZ,
      child_count INTEGER DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_resources_parent ON resources(parent_id);
    CREATE INDEX IF NOT EXISTS idx_resources_type   ON resources(type);
    CREATE INDEX IF NOT EXISTS idx_resources_name   ON resources(name);
    CREATE INDEX IF NOT EXISTS idx_resources_drive  ON resources(drive_id);

    CREATE TABLE IF NOT EXISTS sync_records (
      id              TEXT PRIMARY KEY,
      started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at    TIMESTAMPTZ,
      status          TEXT NOT NULL DEFAULT 'running',
      files_added     INTEGER DEFAULT 0,
      files_removed   INTEGER DEFAULT 0,
      files_updated   INTEGER DEFAULT 0,
      folders_added   INTEGER DEFAULT 0,
      error_message   TEXT
    );

    CREATE TABLE IF NOT EXISTS ai_sessions (
      id         TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ai_messages (
      id         TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
      role       TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
      content    TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_ai_messages_session ON ai_messages(session_id);

    CREATE TABLE IF NOT EXISTS logs (
      id         TEXT PRIMARY KEY,
      level      TEXT NOT NULL DEFAULT 'info',
      message    TEXT NOT NULL,
      context    TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_logs_level      ON logs(level);
    CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);

    CREATE TABLE IF NOT EXISTS knowledge_chunks (
      id            TEXT PRIMARY KEY,
      resource_id   TEXT NOT NULL,
      resource_name TEXT NOT NULL,
      chunk_index   INTEGER NOT NULL,
      content       TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_kc_resource ON knowledge_chunks(resource_id);

    CREATE TABLE IF NOT EXISTS knowledge_index_meta (
      resource_id   TEXT PRIMARY KEY,
      resource_name TEXT NOT NULL,
      chunk_count   INTEGER NOT NULL DEFAULT 0,
      indexed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ai_search_logs (
      id             TEXT PRIMARY KEY,
      query_preview  TEXT NOT NULL,
      chunks_found   INTEGER NOT NULL DEFAULT 0,
      resource_names TEXT NOT NULL DEFAULT '',
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_asl_created ON ai_search_logs(created_at);
  `);
  try {
    await pool.query(`
      ALTER TABLE knowledge_chunks
        ADD COLUMN IF NOT EXISTS content_tsv TSVECTOR
          GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
    `);
  } catch {
  }
  try {
    await pool.query(
      "CREATE INDEX IF NOT EXISTS idx_kc_tsv ON knowledge_chunks USING GIN(content_tsv)"
    );
  } catch {
  }
  const defaults = [
    ["adminUsername", "oalevel"],
    ["adminPasswordHash", ""],
    ["jwtSecret", randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "")],
    ["jwtVersion", "0"],
    ["driveApiKey", ""],
    ["driveRootFolderId", ""],
    ["openRouterApiKey", ""],
    ["aiEnabled", "true"],
    ["aiModel", "openai/gpt-4o-mini"],
    [
      "aiSystemPrompt",
      "You are an expert educational assistant for O/A Level students.\n\nKNOWLEDGE PRIORITY:\n1. Always search and use the application's indexed educational resources first (notes, past papers, mark schemes, examiner reports, etc.).\n2. When relevant local resources are found, base your answer on them and cite them.\n3. Only use general AI knowledge when no relevant local resources are available.\n4. Always recommend related resources from the knowledge base whenever possible.\n\nBehaviour:\n- Answer questions about O/A Level subjects clearly and accurately.\n- Reference specific notes, papers, or resources when they are provided in context.\n- Never ignore relevant local resources that have been surfaced for the query.\n- Keep answers concise, clear, and curriculum-aligned."
    ],
    ["appName", "O/A Level Resources"],
    ["whatsappChannel", ""],
    ["aboutUs", ""],
    ["contactEmail", ""],
    ["contactPhone", ""],
    ["maintenanceMode", "false"],
    ["theme", "light"],
    ["autoSync", "false"],
    ["syncIntervalMinutes", "60"],
    ["cacheEnabled", "true"],
    ["cacheTtlMinutes", "30"],
    ["maxDownloadSizeMb", "100"]
  ];
  for (const [key, value] of defaults) {
    await pool.query(
      "INSERT INTO config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING",
      [key, value]
    );
  }
  console.log("[db] PostgreSQL migrations complete");
}

// src/lib/sync.ts
import { v4 as uuidv42 } from "uuid";

// src/lib/config.ts
async function getConfig(key) {
  const { rows } = await pool.query(
    "SELECT value FROM config WHERE key = $1",
    [key]
  );
  return rows[0]?.value ?? "";
}
async function setConfig(key, value) {
  await pool.query(
    `INSERT INTO config (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, value]
  );
}
async function getAllConfig() {
  const { rows } = await pool.query("SELECT key, value FROM config");
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
async function updateManyConfig(updates) {
  const entries = Object.entries(updates).filter(([, v]) => v !== void 0);
  for (const [key, value] of entries) {
    await pool.query(
      `INSERT INTO config (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, value]
    );
  }
}

// src/lib/drive.ts
import { v4 as uuidv4 } from "uuid";

// src/lib/dbLogger.ts
import { randomUUID as randomUUID2 } from "crypto";
function dbLog(level, message, context) {
  void (async () => {
    try {
      const id = randomUUID2();
      await pool.query(
        "INSERT INTO logs (id, level, message, context) VALUES ($1, $2, $3, $4)",
        [id, level, message, context ?? null]
      );
      await pool.query(`
        DELETE FROM logs
        WHERE id IN (
          SELECT id FROM logs
          ORDER BY created_at ASC
          LIMIT GREATEST(0, (SELECT COUNT(*)::int FROM logs) - 5000)
        )
      `);
    } catch {
    }
  })();
}

// src/lib/drive.ts
var FOLDER_MIME = "application/vnd.google-apps.folder";
var syncState = {
  status: "idle",
  lastSync: null,
  progress: null,
  message: null,
  totalFiles: null,
  totalFolders: null
};
function getSyncState() {
  return { ...syncState };
}
async function driveList(apiKey, folderId, pageToken) {
  const params = new URLSearchParams({
    key: apiKey,
    q: `'${folderId}' in parents and trashed=false`,
    fields: "nextPageToken,files(id,name,mimeType,size,modifiedTime,parents)",
    pageSize: "200"
  });
  if (pageToken) params.set("pageToken", pageToken);
  const url = `https://www.googleapis.com/drive/v3/files?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive API error ${res.status}: ${text}`);
  }
  return res.json();
}
async function listAllInFolder(apiKey, folderId) {
  const all = [];
  let pageToken;
  do {
    const result = await driveList(apiKey, folderId, pageToken);
    all.push(...result.files);
    pageToken = result.nextPageToken;
  } while (pageToken);
  return all;
}
async function scanDrive(apiKey, rootFolderId, syncRecordId) {
  syncState = {
    status: "running",
    lastSync: null,
    progress: 0,
    message: "Starting scan...",
    totalFiles: 0,
    totalFolders: 0
  };
  const stats = { filesAdded: 0, filesRemoved: 0, filesUpdated: 0, foldersAdded: 0 };
  const seenDriveIds = /* @__PURE__ */ new Set();
  try {
    const { rows: existing } = await pool.query(
      "SELECT drive_id, id FROM resources"
    );
    const existingMap = new Map(
      existing.map((r) => [r.drive_id, r.id])
    );
    const queue = [
      { driveId: rootFolderId, parentId: null, depth: 0 }
    ];
    let processed = 0;
    while (queue.length > 0) {
      const item = queue.shift();
      seenDriveIds.add(item.driveId);
      syncState.message = `Scanning... (${processed} items found)`;
      let files;
      try {
        files = await listAllInFolder(apiKey, item.driveId);
      } catch (err) {
        logger.warn({ err, driveId: item.driveId }, "Error listing folder");
        dbLog("warn", `Failed to list folder ${item.driveId}`, String(err));
        continue;
      }
      const folderChildren = files.filter((f) => f.mimeType === FOLDER_MIME);
      const pdfChildren = files.filter((f) => f.mimeType === "application/pdf");
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
              file.modifiedTime ?? null
            ]
          );
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
      for (const folder of folderChildren) {
        const parentResourceId = existingMap.get(item.driveId) ?? item.driveId;
        queue.push({
          driveId: folder.id,
          parentId: parentResourceId,
          depth: item.depth + 1
        });
      }
      syncState.totalFolders = (syncState.totalFolders ?? 0) + folderChildren.length;
      syncState.totalFiles = (syncState.totalFiles ?? 0) + pdfChildren.length;
      syncState.progress = Math.min(99, processed / 10);
    }
    const { rows: allResources } = await pool.query(
      "SELECT drive_id FROM resources"
    );
    for (const res of allResources) {
      if (!seenDriveIds.has(res.drive_id)) {
        await pool.query("DELETE FROM resources WHERE drive_id = $1", [res.drive_id]);
        stats.filesRemoved++;
      }
    }
    await pool.query(
      `UPDATE sync_records SET
         completed_at = NOW(), status = 'success',
         files_added = $1, files_removed = $2, files_updated = $3, folders_added = $4
       WHERE id = $5`,
      [stats.filesAdded, stats.filesRemoved, stats.filesUpdated, stats.foldersAdded, syncRecordId]
    );
    const now = (/* @__PURE__ */ new Date()).toISOString();
    syncState = {
      status: "idle",
      lastSync: now,
      progress: 100,
      message: `Sync complete. ${stats.filesAdded} added, ${stats.filesRemoved} removed.`,
      totalFiles: syncState.totalFiles,
      totalFolders: syncState.totalFolders
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
      totalFolders: null
    };
    await pool.query(
      "UPDATE sync_records SET completed_at = NOW(), status = 'error', error_message = $1 WHERE id = $2",
      [msg, syncRecordId]
    );
    dbLog("error", "Drive sync failed", msg);
    throw err;
  }
}
async function validateDriveConfig(apiKey, rootFolderId) {
  try {
    const params = new URLSearchParams({ key: apiKey, fields: "id,name" });
    const url = `https://www.googleapis.com/drive/v3/files/${rootFolderId}?${params}`;
    const res = await fetch(url);
    if (!res.ok) {
      const data2 = await res.json();
      return { valid: false, folderName: null, error: data2?.error?.message ?? "Invalid" };
    }
    const data = await res.json();
    return { valid: true, folderName: data.name, error: null };
  } catch (err) {
    return { valid: false, folderName: null, error: String(err) };
  }
}
async function findOrCreateFolder(apiKey, name, parentId) {
  try {
    const params = new URLSearchParams({
      key: apiKey,
      q: `'${parentId}' in parents and name='${name.replace(/'/g, "\\'")}' and mimeType='${FOLDER_MIME}' and trashed=false`,
      fields: "files(id,name)"
    });
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`);
    if (res.ok) {
      const data = await res.json();
      if (data.files.length > 0) return data.files[0].id;
    }
  } catch {
  }
  return null;
}

// src/lib/sync.ts
var syncTimer = null;
var isSyncing = false;
async function runSync(force = false) {
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
  const syncId = uuidv42();
  await pool.query(
    "INSERT INTO sync_records (id, started_at, status) VALUES ($1, NOW(), 'running')",
    [syncId]
  );
  isSyncing = true;
  dbLog("info", "Drive sync started", `syncId=${syncId}, force=${force}`);
  scanDrive(apiKey, rootFolderId, syncId).then(() => {
    isSyncing = false;
    logger.info({ syncId }, "Drive sync completed");
  }).catch((err) => {
    isSyncing = false;
    logger.error({ err, syncId }, "Drive sync failed");
  });
  return syncId;
}
async function startAutoSync() {
  const autoSync = await getConfig("autoSync");
  if (autoSync !== "true") return;
  const intervalMinutes = parseInt(await getConfig("syncIntervalMinutes") || "60", 10);
  const intervalMs = intervalMinutes * 60 * 1e3;
  if (syncTimer) {
    clearInterval(syncTimer);
  }
  syncTimer = setInterval(() => {
    logger.info("Auto-sync triggered");
    runSync().catch((err) => logger.error({ err }, "Auto-sync failed"));
  }, intervalMs);
  logger.info({ intervalMinutes }, "Auto-sync scheduled");
}
async function getCurrentSyncStatus() {
  const state = getSyncState();
  const { rows } = await pool.query(
    "SELECT completed_at FROM sync_records WHERE status='success' ORDER BY completed_at DESC LIMIT 1"
  );
  const lastRecord = rows[0];
  return {
    ...state,
    lastSync: state.lastSync ?? (lastRecord?.completed_at ? String(lastRecord.completed_at) : null)
  };
}

// src/app.ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";

// src/routes/index.ts
import { Router as Router12 } from "express";

// src/routes/health.ts
import { Router } from "express";
var router = Router();
var startTime = Date.now();
router.get("/healthz", async (req, res) => {
  const sync = await getCurrentSyncStatus();
  res.json({
    status: "ok",
    uptime: Math.floor((Date.now() - startTime) / 1e3),
    version: "1.0.0",
    syncStatus: sync.status
  });
});
var health_default = router;

// src/routes/auth.ts
import { Router as Router2 } from "express";
import bcrypt from "bcryptjs";

// src/lib/jwt.ts
import jwt from "jsonwebtoken";
async function getSecret() {
  const secret = await getConfig("jwtSecret");
  if (!secret) throw new Error("JWT secret not configured");
  return secret;
}
async function getTokenVersion() {
  const raw = await getConfig("jwtVersion");
  return raw ? parseInt(raw, 10) : 0;
}
async function bumpTokenVersion() {
  const next = await getTokenVersion() + 1;
  await setConfig("jwtVersion", String(next));
  return next;
}
async function signToken(payload) {
  const [secret, ver] = await Promise.all([getSecret(), getTokenVersion()]);
  return jwt.sign({ ...payload, ver }, secret, { expiresIn: "7d" });
}
async function verifyToken(token) {
  const secret = await getSecret();
  const payload = jwt.verify(token, secret);
  const currentVer = await getTokenVersion();
  if (payload.ver !== currentVer) {
    throw new Error("Token has been revoked");
  }
  return payload;
}

// src/middlewares/auth.ts
async function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = await verifyToken(token);
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// src/routes/auth.ts
var router2 = Router2();
router2.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }
  const [configUsername, configHashRaw] = await Promise.all([
    getConfig("adminUsername"),
    getConfig("adminPasswordHash")
  ]);
  if (!configHashRaw) {
    const defaultPw = process.env["ADMIN_DEFAULT_PASSWORD"]?.trim();
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    if (!defaultPw) {
      res.status(503).json({
        error: "No admin password configured. Set ADMIN_DEFAULT_PASSWORD env var to perform initial login."
      });
      return;
    }
    if (trimmedUsername !== configUsername || trimmedPassword !== defaultPw) {
      dbLog("warn", "Failed initial-setup login", `username=${username}`);
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }
    const hash = await bcrypt.hash(defaultPw, 12);
    await setConfig("adminPasswordHash", hash);
    dbLog("info", "Admin password initialised from ADMIN_DEFAULT_PASSWORD");
    const token2 = await signToken({ username, role: "admin" });
    res.json({ token: token2, expiresIn: 7 * 24 * 3600, user: { username, role: "admin" } });
    return;
  }
  const valid = username === configUsername && await bcrypt.compare(password, configHashRaw);
  if (!valid) {
    dbLog("warn", "Failed login attempt", `username=${username}`);
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }
  const token = await signToken({ username, role: "admin" });
  dbLog("info", "Admin login successful", `username=${username}`);
  res.json({
    token,
    expiresIn: 7 * 24 * 3600,
    user: { username, role: "admin" }
  });
});
router2.post("/auth/logout", requireAuth, async (req, res) => {
  await bumpTokenVersion();
  dbLog("info", "Admin logout");
  res.json({ success: true, message: "Logged out" });
});
router2.put("/auth/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Both passwords are required" });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" });
    return;
  }
  const hashRaw = await getConfig("adminPasswordHash");
  if (!hashRaw) {
    res.status(409).json({ error: "Password not yet initialised \u2014 login first" });
    return;
  }
  const valid = await bcrypt.compare(currentPassword, hashRaw);
  if (!valid) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }
  const newHash = await bcrypt.hash(newPassword, 12);
  await setConfig("adminPasswordHash", newHash);
  await bumpTokenVersion();
  dbLog("info", "Admin password changed");
  res.json({ success: true, message: "Password changed successfully" });
});
router2.get("/auth/me", requireAuth, (req, res) => {
  const admin = req.admin;
  res.json({ username: admin.username, role: admin.role });
});
var auth_default = router2;

// src/routes/config.ts
import { Router as Router3 } from "express";
var router3 = Router3();
router3.get("/config", async (req, res) => {
  const cfg = await getAllConfig();
  res.json({
    appName: cfg.appName,
    whatsappChannel: cfg.whatsappChannel,
    aboutUs: cfg.aboutUs,
    contactEmail: cfg.contactEmail,
    contactPhone: cfg.contactPhone,
    maintenanceMode: cfg.maintenanceMode === "true",
    aiEnabled: cfg.aiEnabled === "true",
    aiSystemPrompt: cfg.aiSystemPrompt,
    aiModel: cfg.aiModel,
    theme: cfg.theme
  });
});
router3.get("/config/admin", requireAuth, async (req, res) => {
  const cfg = await getAllConfig();
  res.json({
    appName: cfg.appName,
    driveRootFolderId: cfg.driveRootFolderId,
    whatsappChannel: cfg.whatsappChannel,
    aboutUs: cfg.aboutUs,
    contactEmail: cfg.contactEmail,
    contactPhone: cfg.contactPhone,
    maintenanceMode: cfg.maintenanceMode === "true",
    aiEnabled: cfg.aiEnabled === "true",
    aiSystemPrompt: cfg.aiSystemPrompt,
    aiModel: cfg.aiModel,
    theme: cfg.theme,
    syncIntervalMinutes: parseInt(cfg.syncIntervalMinutes || "60", 10),
    autoSync: cfg.autoSync === "true",
    cacheEnabled: cfg.cacheEnabled === "true",
    cacheTtlMinutes: parseInt(cfg.cacheTtlMinutes || "30", 10),
    maxDownloadSizeMb: parseInt(cfg.maxDownloadSizeMb || "100", 10),
    openRouterApiKeySet: !!cfg.openRouterApiKey,
    driveApiKeySet: !!cfg.driveApiKey
  });
});
router3.put("/config/admin", requireAuth, async (req, res) => {
  const body = req.body;
  const updates = {};
  if (typeof body.appName === "string") updates.appName = body.appName;
  if (typeof body.driveRootFolderId === "string") updates.driveRootFolderId = body.driveRootFolderId;
  if (typeof body.driveApiKey === "string") updates.driveApiKey = body.driveApiKey;
  if (typeof body.openRouterApiKey === "string") updates.openRouterApiKey = body.openRouterApiKey;
  if (typeof body.whatsappChannel === "string") updates.whatsappChannel = body.whatsappChannel;
  if (typeof body.aboutUs === "string") updates.aboutUs = body.aboutUs;
  if (typeof body.contactEmail === "string") updates.contactEmail = body.contactEmail;
  if (typeof body.contactPhone === "string") updates.contactPhone = body.contactPhone;
  if (typeof body.maintenanceMode === "boolean") updates.maintenanceMode = String(body.maintenanceMode);
  if (typeof body.aiEnabled === "boolean") updates.aiEnabled = String(body.aiEnabled);
  if (typeof body.aiSystemPrompt === "string") updates.aiSystemPrompt = body.aiSystemPrompt;
  if (typeof body.aiModel === "string") updates.aiModel = body.aiModel;
  if (typeof body.theme === "string") updates.theme = body.theme;
  if (typeof body.syncIntervalMinutes === "number") updates.syncIntervalMinutes = String(body.syncIntervalMinutes);
  if (typeof body.autoSync === "boolean") updates.autoSync = String(body.autoSync);
  if (typeof body.cacheEnabled === "boolean") updates.cacheEnabled = String(body.cacheEnabled);
  if (typeof body.cacheTtlMinutes === "number") updates.cacheTtlMinutes = String(body.cacheTtlMinutes);
  if (typeof body.maxDownloadSizeMb === "number") updates.maxDownloadSizeMb = String(body.maxDownloadSizeMb);
  await updateManyConfig(updates);
  const cfg = await getAllConfig();
  res.json({
    appName: cfg.appName,
    driveRootFolderId: cfg.driveRootFolderId,
    whatsappChannel: cfg.whatsappChannel,
    aboutUs: cfg.aboutUs,
    contactEmail: cfg.contactEmail,
    contactPhone: cfg.contactPhone,
    maintenanceMode: cfg.maintenanceMode === "true",
    aiEnabled: cfg.aiEnabled === "true",
    aiSystemPrompt: cfg.aiSystemPrompt,
    aiModel: cfg.aiModel,
    theme: cfg.theme,
    syncIntervalMinutes: parseInt(cfg.syncIntervalMinutes || "60", 10),
    autoSync: cfg.autoSync === "true",
    cacheEnabled: cfg.cacheEnabled === "true",
    cacheTtlMinutes: parseInt(cfg.cacheTtlMinutes || "30", 10),
    maxDownloadSizeMb: parseInt(cfg.maxDownloadSizeMb || "100", 10),
    openRouterApiKeySet: !!cfg.openRouterApiKey,
    driveApiKeySet: !!cfg.driveApiKey
  });
});
var config_default = router3;

// src/routes/announcements.ts
import { Router as Router4 } from "express";
import { v4 as uuidv43 } from "uuid";
var router4 = Router4();
function mapAnnouncement(r) {
  return {
    id: r.id,
    title: r.title,
    message: r.message,
    active: r.active,
    // PostgreSQL returns native boolean
    priority: r.priority,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  };
}
router4.get("/announcements", async (req, res) => {
  const { active } = req.query;
  let query = "SELECT * FROM announcements";
  const params = [];
  if (active === "true") {
    query += " WHERE active = TRUE";
  } else if (active === "false") {
    query += " WHERE active = FALSE";
  }
  query += " ORDER BY priority DESC, created_at DESC";
  const { rows } = await pool.query(query, params);
  res.json(rows.map(mapAnnouncement));
});
router4.post("/announcements", requireAuth, async (req, res) => {
  const { title, message, active = true, priority = 0 } = req.body;
  if (!title || !message) {
    res.status(400).json({ error: "Title and message are required" });
    return;
  }
  const id = uuidv43();
  await pool.query(
    "INSERT INTO announcements (id, title, message, active, priority) VALUES ($1, $2, $3, $4, $5)",
    [id, title, message, active, priority]
  );
  dbLog("info", `Announcement created: ${title}`);
  const { rows } = await pool.query("SELECT * FROM announcements WHERE id = $1", [id]);
  res.status(201).json(mapAnnouncement(rows[0]));
});
router4.get("/announcements/:id", async (req, res) => {
  const id = req.params["id"];
  const { rows } = await pool.query("SELECT * FROM announcements WHERE id = $1", [id]);
  if (!rows[0]) {
    res.status(404).json({ error: "Announcement not found" });
    return;
  }
  res.json(mapAnnouncement(rows[0]));
});
router4.put("/announcements/:id", requireAuth, async (req, res) => {
  const id = req.params["id"];
  const { title, message, active, priority } = req.body;
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
      active !== void 0 ? active : ex.active,
      priority ?? ex.priority,
      id
    ]
  );
  dbLog("info", `Announcement updated: ${id}`);
  const { rows } = await pool.query("SELECT * FROM announcements WHERE id = $1", [id]);
  res.json(mapAnnouncement(rows[0]));
});
router4.delete("/announcements/:id", requireAuth, async (req, res) => {
  const id = req.params["id"];
  const { rows } = await pool.query("SELECT id FROM announcements WHERE id = $1", [id]);
  if (!rows[0]) {
    res.status(404).json({ error: "Announcement not found" });
    return;
  }
  await pool.query("DELETE FROM announcements WHERE id = $1", [id]);
  dbLog("info", `Announcement deleted: ${id}`);
  res.json({ success: true, message: "Announcement deleted" });
});
var announcements_default = router4;

// src/routes/drive.ts
import { Router as Router5 } from "express";
var router5 = Router5();
router5.post("/drive/sync", requireAuth, async (req, res) => {
  const { force = false } = req.body ?? {};
  try {
    const jobId = await runSync(force);
    res.json({ jobId, status: "started", message: "Sync job started" });
  } catch (err) {
    res.status(500).json({ jobId: "error", status: "error", message: String(err) });
  }
});
router5.get("/drive/sync/status", async (req, res) => {
  const status = await getCurrentSyncStatus();
  res.json({
    status: status.status,
    lastSync: status.lastSync,
    progress: status.progress,
    message: status.message,
    totalFiles: status.totalFiles,
    totalFolders: status.totalFolders
  });
});
router5.get("/drive/sync/history", requireAuth, async (req, res) => {
  const limit = Math.min(parseInt(req.query["limit"] || "20", 10), 100);
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
      errorMessage: r.error_message
    }))
  );
});
router5.post("/drive/validate", requireAuth, async (req, res) => {
  const { driveApiKey, rootFolderId } = req.body;
  if (!driveApiKey || !rootFolderId) {
    res.status(400).json({ valid: false, folderName: null, error: "Both fields required" });
    return;
  }
  const result = await validateDriveConfig(driveApiKey, rootFolderId);
  res.json(result);
});
var drive_default = router5;

// src/routes/resources.ts
import { Router as Router6 } from "express";
var router6 = Router6();
function mapNode(r) {
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
    createdAt: String(r.created_at)
  };
}
router6.get("/resources/levels", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM resources WHERE depth=1 AND type='folder' ORDER BY name"
  );
  res.json(rows.map(mapNode));
});
router6.get("/resources/stats", async (req, res) => {
  const [pdfs, folders, levels, subjects, lastSync, totalSize] = await Promise.all([
    pool.query("SELECT COUNT(*) AS c FROM resources WHERE type='pdf'"),
    pool.query("SELECT COUNT(*) AS c FROM resources WHERE type='folder'"),
    pool.query("SELECT COUNT(*) AS c FROM resources WHERE depth=1 AND type='folder'"),
    pool.query("SELECT COUNT(*) AS c FROM resources WHERE depth=2 AND type='folder'"),
    pool.query("SELECT completed_at FROM sync_records WHERE status='success' ORDER BY completed_at DESC LIMIT 1"),
    pool.query("SELECT SUM(size) AS s FROM resources")
  ]);
  res.json({
    totalPdfs: parseInt(pdfs.rows[0].c, 10),
    totalFolders: parseInt(folders.rows[0].c, 10),
    totalLevels: parseInt(levels.rows[0].c, 10),
    totalSubjects: parseInt(subjects.rows[0].c, 10),
    lastSync: lastSync.rows[0]?.completed_at ? String(lastSync.rows[0].completed_at) : null,
    totalSizeBytes: totalSize.rows[0]?.s ? Number(totalSize.rows[0].s) : null
  });
});
router6.get("/resources/recent", async (req, res) => {
  const limit = parseInt(req.query["limit"] || "20", 10);
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
      modifiedAt: r.modified_at ? String(r.modified_at) : null
    }))
  );
});
router6.get("/resources/nodes/:nodeId", async (req, res) => {
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
router6.get("/resources/nodes/:nodeId/children", async (req, res) => {
  const nodeId = req.params["nodeId"];
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
    )
  ]);
  res.json({
    items: childRows.rows.map(mapNode),
    total: parseInt(countRow.rows[0].c, 10),
    page: 1,
    pageSize: childRows.rows.length
  });
});
router6.get("/resources/nodes/:nodeId/breadcrumb", async (req, res) => {
  const breadcrumb = [];
  let currentId = req.params["nodeId"];
  for (let i = 0; i < 20 && currentId; i++) {
    const { rows } = await pool.query(
      "SELECT id, name, parent_id FROM resources WHERE id = $1",
      [currentId]
    );
    if (!rows[0]) break;
    breadcrumb.unshift({ id: rows[0].id, name: rows[0].name });
    currentId = rows[0].parent_id ?? null;
  }
  res.json(breadcrumb);
});
router6.get("/resources/pdf/:nodeId/url", async (req, res) => {
  const nodeId = req.params["nodeId"];
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
  const expiresAt = new Date(Date.now() + 3600 * 1e3).toISOString();
  res.json({
    url: `${protocol}://${host}/api/resources/pdf/${rows[0].id}/content`,
    expiresAt,
    driveId: rows[0].drive_id
  });
});
router6.get("/resources/pdf/:nodeId/content", async (req, res) => {
  const nodeId = req.params["nodeId"];
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
var resources_default = router6;

// src/routes/search.ts
import { Router as Router7 } from "express";
var router7 = Router7();
router7.get("/search", async (req, res) => {
  const q = req.query["q"] || "";
  const type = req.query["type"] || "all";
  const levelId = req.query["levelId"];
  const rawPage = parseInt(req.query["page"] || "1", 10);
  const rawPageSize = parseInt(req.query["pageSize"] || "30", 10);
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
  const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
  let typeFilter = "";
  if (type === "pdf") typeFilter = "AND r.type = 'pdf'";
  else if (type === "folder") typeFilter = "AND r.type = 'folder'";
  const params = [like];
  let levelFilter = "";
  if (levelId) {
    params.push(levelId, levelId);
    levelFilter = `AND (r.id = $${params.length - 1} OR r.parent_id = $${params.length})`;
  }
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
        ...r.parent_node_id ? [{ id: r.parent_node_id, name: r.parent_name }] : [],
        { id: r.id, name: r.name }
      ],
      size: r.size ? Number(r.size) : null,
      modifiedAt: r.modified_at ? String(r.modified_at) : null
    })),
    total: parseInt(countRows[0].c, 10),
    query: q,
    page,
    pageSize
  });
});
var search_default = router7;

// src/routes/ai.ts
import { Router as Router8 } from "express";
import { v4 as uuidv45 } from "uuid";

// src/lib/ai.ts
async function sendAiMessage(messages, model, imageBase64, pdfText, knowledgeContext) {
  const [apiKey, configModelDefault, systemPrompt] = await Promise.all([
    getConfig("openRouterApiKey"),
    getConfig("aiModel"),
    getConfig("aiSystemPrompt")
  ]);
  if (!apiKey) throw new Error("OpenRouter API key not configured");
  const configModel = model || configModelDefault || "openai/gpt-4o-mini";
  const allMessages = [];
  if (systemPrompt) {
    allMessages.push({ role: "system", content: systemPrompt });
  }
  if (knowledgeContext) {
    allMessages.push({
      role: "system",
      content: `RELEVANT EDUCATIONAL RESOURCES (use these as your primary source):

${knowledgeContext}

Base your answer on the above resources where possible. Always mention which resource(s) you used.`
    });
  }
  const processedMessages = messages.map((msg, i) => {
    if (i === messages.length - 1 && msg.role === "user" && (imageBase64 || pdfText)) {
      const contentParts = [
        { type: "text", text: msg.content }
      ];
      if (imageBase64) {
        contentParts.push({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
        });
      }
      if (pdfText) {
        contentParts[0] = {
          type: "text",
          text: `${msg.content}

[PDF Content]:
${pdfText}`
        };
      }
      return { ...msg, content: contentParts };
    }
    return msg;
  });
  allMessages.push(...processedMessages);
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://oalevelresources.onrender.com",
      "X-Title": "O/A Level Resources"
    },
    body: JSON.stringify({
      model: configModel,
      messages: allMessages,
      stream: false
    })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${text}`);
  }
  const data = await response.json();
  const reply = data.choices[0]?.message.content ?? "";
  const tokens = data.usage?.total_tokens ?? null;
  return { reply, model: configModel, tokens };
}
async function getAvailableModels() {
  const apiKey = await getConfig("openRouterApiKey");
  if (!apiKey) {
    return [
      { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", contextLength: 128e3, pricing: "Low" },
      { id: "openai/gpt-4o", name: "GPT-4o", contextLength: 128e3, pricing: "Medium" },
      { id: "google/gemini-flash-1.5", name: "Gemini Flash 1.5", contextLength: 1e6, pricing: "Low" },
      { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku", contextLength: 2e5, pricing: "Low" },
      { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", contextLength: 2e5, pricing: "Medium" }
    ];
  }
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (!res.ok) throw new Error("Failed to fetch models");
    const data = await res.json();
    return data.data.slice(0, 50).map((m) => ({
      id: m.id,
      name: m.name,
      contextLength: m.context_length ?? null,
      pricing: m.pricing ? `$${m.pricing.prompt}/1k prompt, $${m.pricing.completion}/1k completion` : null
    }));
  } catch {
    return [];
  }
}

// src/lib/knowledge.ts
import { v4 as uuidv44 } from "uuid";
import { randomUUID as randomUUID3 } from "crypto";
var indexState = { status: "idle", message: null, progress: null };
function getIndexState() {
  return { ...indexState };
}
async function downloadPdf(driveId, apiKey) {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(driveId)}?alt=media&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive download error ${res.status}: ${text.slice(0, 200)}`);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}
async function extractText(buffer) {
  try {
    const mod = await import("pdf-parse");
    const pdfParse = typeof mod.default === "function" ? mod.default : mod;
    const data = await pdfParse(buffer);
    return data.text ?? "";
  } catch (err) {
    throw new Error(`PDF text extraction failed: ${String(err)}`);
  }
}
var CHUNK_SIZE = 800;
var CHUNK_OVERLAP = 80;
function chunkText(text) {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ");
  const chunks = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + CHUNK_SIZE, cleaned.length);
    const chunk = cleaned.slice(start, end).trim();
    if (chunk.length >= 50) chunks.push(chunk);
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}
async function clearResourceChunks(resourceId) {
  await pool.query("DELETE FROM knowledge_chunks WHERE resource_id = $1", [resourceId]);
  await pool.query("DELETE FROM knowledge_index_meta WHERE resource_id = $1", [resourceId]);
}
async function indexResource(resourceId, driveId, name) {
  const apiKey = await getConfig("driveApiKey");
  if (!apiKey) throw new Error("Drive API key not configured");
  await clearResourceChunks(resourceId);
  const buffer = await downloadPdf(driveId, apiKey);
  const text = await extractText(buffer);
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    dbLog("warn", `Knowledge index: no text extracted from "${name}"`, `driveId=${driveId}`);
    return 0;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < chunks.length; i++) {
      await client.query(
        "INSERT INTO knowledge_chunks (id, resource_id, resource_name, chunk_index, content) VALUES ($1, $2, $3, $4, $5)",
        [uuidv44(), resourceId, name, i, chunks[i]]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  await pool.query(
    `INSERT INTO knowledge_index_meta (resource_id, resource_name, chunk_count, indexed_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (resource_id) DO UPDATE SET
       resource_name = EXCLUDED.resource_name,
       chunk_count   = EXCLUDED.chunk_count,
       indexed_at    = NOW()`,
    [resourceId, name, chunks.length]
  );
  return chunks.length;
}
async function rebuildKnowledgeIndex() {
  if (indexState.status === "running") throw new Error("Index operation already in progress");
  indexState = { status: "running", message: "Starting full rebuild...", progress: 0 };
  const stats = { indexed: 0, failed: 0, totalChunks: 0 };
  try {
    await pool.query("DELETE FROM knowledge_chunks");
    await pool.query("DELETE FROM knowledge_index_meta");
    const { rows: pdfs } = await pool.query(
      "SELECT id, drive_id, name FROM resources WHERE type='pdf' ORDER BY name"
    );
    const total = pdfs.length;
    dbLog("info", `Knowledge rebuild started: ${total} PDFs`);
    for (let i = 0; i < pdfs.length; i++) {
      const pdf = pdfs[i];
      indexState.message = `Indexing "${pdf.name}" (${i + 1}/${total})`;
      indexState.progress = Math.round(i / total * 100);
      try {
        const n = await indexResource(pdf.id, pdf.drive_id, pdf.name);
        stats.totalChunks += n;
        stats.indexed++;
      } catch (err) {
        dbLog("warn", `Knowledge index: failed "${pdf.name}"`, String(err));
        stats.failed++;
      }
    }
    indexState = {
      status: "idle",
      message: `Rebuild complete. ${stats.indexed} indexed, ${stats.failed} failed, ${stats.totalChunks} chunks.`,
      progress: 100
    };
    dbLog("info", "Knowledge rebuild complete", JSON.stringify(stats));
  } catch (err) {
    indexState = { status: "error", message: String(err), progress: null };
    dbLog("error", "Knowledge rebuild failed", String(err));
    throw err;
  }
  return stats;
}
async function indexNewResources() {
  if (indexState.status === "running") throw new Error("Index operation already in progress");
  indexState = { status: "running", message: "Finding new PDFs...", progress: 0 };
  const stats = { indexed: 0, failed: 0, totalChunks: 0 };
  try {
    const { rows: newPdfs } = await pool.query(`
      SELECT r.id, r.drive_id, r.name
      FROM resources r
      LEFT JOIN knowledge_index_meta m ON m.resource_id = r.id
      WHERE r.type = 'pdf' AND m.resource_id IS NULL
      ORDER BY r.name
    `);
    const total = newPdfs.length;
    dbLog("info", `Knowledge index-new: ${total} new PDFs`);
    for (let i = 0; i < newPdfs.length; i++) {
      const pdf = newPdfs[i];
      indexState.message = `Indexing "${pdf.name}" (${i + 1}/${total})`;
      indexState.progress = Math.round(i / total * 100);
      try {
        const n = await indexResource(pdf.id, pdf.drive_id, pdf.name);
        stats.totalChunks += n;
        stats.indexed++;
      } catch (err) {
        dbLog("warn", `Knowledge index-new: failed "${pdf.name}"`, String(err));
        stats.failed++;
      }
    }
    indexState = {
      status: "idle",
      message: total === 0 ? "No new PDFs to index." : `Done. ${stats.indexed} indexed, ${stats.failed} failed, ${stats.totalChunks} chunks.`,
      progress: 100
    };
  } catch (err) {
    indexState = { status: "error", message: String(err), progress: null };
    dbLog("error", "Knowledge index-new failed", String(err));
    throw err;
  }
  return stats;
}
async function removeDeletedResources() {
  const { rows: orphaned } = await pool.query(`
    SELECT m.resource_id
    FROM knowledge_index_meta m
    LEFT JOIN resources r ON r.id = m.resource_id
    WHERE r.id IS NULL
  `);
  for (const row of orphaned) {
    await clearResourceChunks(row.resource_id);
  }
  dbLog("info", `Knowledge remove-deleted: ${orphaned.length} resources removed`);
  return { removed: orphaned.length };
}
async function searchKnowledge(query, limit = 5) {
  if (!query || query.trim().length < 2) return [];
  try {
    const { rows } = await pool.query(
      `SELECT resource_id, resource_name, chunk_index, content,
         ts_rank(content_tsv, plainto_tsquery('english', $1)) AS rank
       FROM knowledge_chunks
       WHERE content_tsv @@ plainto_tsquery('english', $1)
       ORDER BY rank DESC
       LIMIT $2`,
      [query.trim(), limit * 3]
    );
    const byResource = /* @__PURE__ */ new Map();
    for (const row of rows) {
      if (!byResource.has(row.resource_id)) {
        byResource.set(row.resource_id, {
          resourceId: row.resource_id,
          resourceName: row.resource_name,
          chunkIndex: row.chunk_index,
          content: row.content,
          score: parseFloat(row.rank)
        });
      }
      if (byResource.size >= limit) break;
    }
    return Array.from(byResource.values());
  } catch (err) {
    dbLog("warn", "Knowledge search failed", String(err));
    return [];
  }
}
async function getKnowledgeStats() {
  const [meta, chunks, last] = await Promise.all([
    pool.query("SELECT COUNT(*) AS n FROM knowledge_index_meta"),
    pool.query("SELECT COUNT(*) AS n FROM knowledge_chunks"),
    pool.query("SELECT MAX(indexed_at) AS t FROM knowledge_index_meta")
  ]);
  return {
    totalIndexed: parseInt(meta.rows[0].n, 10),
    totalChunks: parseInt(chunks.rows[0].n, 10),
    lastIndexedAt: last.rows[0]?.t ? String(last.rows[0].t) : null
  };
}
async function listIndexedResources() {
  const { rows } = await pool.query(
    "SELECT resource_id, resource_name, chunk_count, indexed_at FROM knowledge_index_meta ORDER BY indexed_at DESC"
  );
  return rows.map((r) => ({
    resourceId: r.resource_id,
    resourceName: r.resource_name,
    chunkCount: r.chunk_count,
    indexedAt: String(r.indexed_at)
  }));
}
function logAiSearch(queryPreview, chunksFound, resourceNames) {
  void (async () => {
    try {
      await pool.query(
        "INSERT INTO ai_search_logs (id, query_preview, chunks_found, resource_names) VALUES ($1, $2, $3, $4)",
        [randomUUID3(), queryPreview.slice(0, 200), chunksFound, resourceNames.join(", ")]
      );
    } catch {
    }
  })();
}
async function listAiSearchLogs(limit = 50) {
  const { rows } = await pool.query(
    "SELECT query_preview, chunks_found, resource_names, created_at FROM ai_search_logs ORDER BY created_at DESC LIMIT $1",
    [limit]
  );
  return rows.map((r) => ({
    queryPreview: r.query_preview,
    chunksFound: r.chunks_found,
    resourceNames: r.resource_names,
    createdAt: String(r.created_at)
  }));
}

// src/routes/ai.ts
var router8 = Router8();
var RATE_WINDOW_MS = 60 * 60 * 1e3;
var RATE_LIMIT = 30;
var ipRateMap = /* @__PURE__ */ new Map();
function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    const trusted = parts[parts.length - 1];
    if (trusted) return trusted;
  }
  return req.socket?.remoteAddress ?? "unknown";
}
function checkRateLimit(ip) {
  const now = Date.now();
  let entry = ipRateMap.get(ip);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_WINDOW_MS };
    ipRateMap.set(ip, entry);
  }
  if (entry.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT - entry.count, resetAt: entry.resetAt };
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipRateMap) {
    if (now >= entry.resetAt) ipRateMap.delete(ip);
  }
}, RATE_WINDOW_MS);
router8.post("/ai/chat", async (req, res) => {
  const ip = getClientIp(req);
  const { allowed, remaining, resetAt } = checkRateLimit(ip);
  if (!allowed) {
    res.setHeader("X-RateLimit-Limit", RATE_LIMIT);
    res.setHeader("X-RateLimit-Remaining", 0);
    res.setHeader("X-RateLimit-Reset", Math.ceil(resetAt / 1e3));
    res.status(429).json({ error: "Rate limit exceeded. Try again in 1 hour." });
    return;
  }
  res.setHeader("X-RateLimit-Limit", RATE_LIMIT);
  res.setHeader("X-RateLimit-Remaining", remaining);
  const { message, sessionId, model, imageBase64, pdfText } = req.body;
  if (!message || !sessionId) {
    res.status(400).json({ error: "message and sessionId are required" });
    return;
  }
  if (typeof sessionId !== "string" || sessionId.length > 64 || !/^[\w-]+$/.test(sessionId)) {
    res.status(400).json({ error: "Invalid sessionId format" });
    return;
  }
  const aiEnabled = await getConfig("aiEnabled");
  if (aiEnabled !== "true") {
    res.status(503).json({ error: "AI is currently disabled" });
    return;
  }
  await pool.query(
    "INSERT INTO ai_sessions (id) VALUES ($1) ON CONFLICT (id) DO NOTHING",
    [sessionId]
  );
  const { rows: historyRows } = await pool.query(
    "SELECT role, content FROM ai_messages WHERE session_id = $1 ORDER BY created_at DESC LIMIT 20",
    [sessionId]
  );
  const history = historyRows.reverse();
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message }
  ];
  await pool.query(
    "INSERT INTO ai_messages (id, session_id, role, content) VALUES ($1, $2, 'user', $3)",
    [uuidv45(), sessionId, message]
  );
  try {
    const knowledgeResults = await searchKnowledge(message, 5);
    const relatedResources = knowledgeResults.map((r) => ({
      resourceId: r.resourceId,
      resourceName: r.resourceName
    }));
    let knowledgeContext;
    if (knowledgeResults.length > 0) {
      knowledgeContext = knowledgeResults.map((r, i) => `[Resource ${i + 1}: ${r.resourceName}]
${r.content}`).join("\n\n---\n\n");
    }
    logAiSearch(message, knowledgeResults.length, relatedResources.map((r) => r.resourceName));
    const result = await sendAiMessage(messages, model, imageBase64, pdfText, knowledgeContext);
    await pool.query(
      "INSERT INTO ai_messages (id, session_id, role, content) VALUES ($1, $2, 'assistant', $3)",
      [uuidv45(), sessionId, result.reply]
    );
    await pool.query(
      "UPDATE ai_sessions SET updated_at = NOW() WHERE id = $1",
      [sessionId]
    );
    dbLog("info", "AI chat", `session=${sessionId}, tokens=${result.tokens}, knowledgeHits=${knowledgeResults.length}`);
    res.json({
      reply: result.reply,
      sessionId,
      model: result.model,
      tokens: result.tokens,
      relatedResources
    });
  } catch (err) {
    dbLog("error", "AI chat error", String(err));
    res.status(500).json({ error: "AI service error. Please try again." });
  }
});
router8.get("/ai/sessions/:sessionId/messages", requireAuth, async (req, res) => {
  const sessionId = req.params["sessionId"];
  const { rows } = await pool.query(
    "SELECT * FROM ai_messages WHERE session_id = $1 ORDER BY created_at ASC",
    [sessionId]
  );
  res.json(
    rows.map((r) => ({
      id: r.id,
      sessionId: r.session_id,
      role: r.role,
      content: r.content,
      createdAt: String(r.created_at)
    }))
  );
});
router8.delete("/ai/sessions/:sessionId/messages", requireAuth, async (req, res) => {
  const sessionId = req.params["sessionId"];
  await pool.query("DELETE FROM ai_messages WHERE session_id = $1", [sessionId]);
  dbLog("info", `AI session cleared: ${sessionId}`);
  res.json({ success: true, message: "Session cleared" });
});
router8.get("/ai/models", requireAuth, async (req, res) => {
  const models = await getAvailableModels();
  res.json(models);
});
var ai_default = router8;

// src/routes/knowledge.ts
import { Router as Router9 } from "express";
var router9 = Router9();
router9.get("/ai/knowledge/stats", requireAuth, async (_req, res) => {
  const [stats, indexStatus] = await Promise.all([
    getKnowledgeStats(),
    Promise.resolve(getIndexState())
  ]);
  res.json({ ...stats, indexStatus });
});
router9.get("/ai/knowledge/resources", requireAuth, async (_req, res) => {
  const resources = await listIndexedResources();
  res.json(resources);
});
router9.get("/ai/knowledge/search-logs", requireAuth, async (req, res) => {
  const raw = Number(req.query["limit"] ?? 50);
  const limit = Number.isFinite(raw) ? Math.min(Math.max(1, Math.floor(raw)), 200) : 50;
  const logs = await listAiSearchLogs(limit);
  res.json(logs);
});
router9.post("/ai/knowledge/rebuild", requireAuth, (_req, res) => {
  const state = getIndexState();
  if (state.status === "running") {
    res.status(409).json({ error: "An index operation is already in progress." });
    return;
  }
  dbLog("info", "Knowledge index: full rebuild requested by admin");
  void rebuildKnowledgeIndex().catch(
    (err) => dbLog("error", "Knowledge rebuild background error", String(err))
  );
  res.status(202).json({ success: true, message: "Rebuild started. Poll /ai/knowledge/stats for progress." });
});
router9.post("/ai/knowledge/index-new", requireAuth, (_req, res) => {
  const state = getIndexState();
  if (state.status === "running") {
    res.status(409).json({ error: "An index operation is already in progress." });
    return;
  }
  dbLog("info", "Knowledge index: index-new requested by admin");
  void indexNewResources().catch(
    (err) => dbLog("error", "Knowledge index-new background error", String(err))
  );
  res.status(202).json({ success: true, message: "Indexing started. Poll /ai/knowledge/stats for progress." });
});
router9.post("/ai/knowledge/remove-deleted", requireAuth, async (_req, res) => {
  dbLog("info", "Knowledge index: remove-deleted requested by admin");
  try {
    const result = await removeDeletedResources();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
var knowledge_default = router9;

// src/routes/folders.ts
import { Router as Router10 } from "express";
var router10 = Router10();
function buildFolderPaths(levels) {
  const paths = [];
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
router10.post("/folders/preview", requireAuth, (req, res) => {
  const { levels } = req.body;
  if (!levels?.length) {
    res.status(400).json({ error: "levels is required" });
    return;
  }
  const paths = buildFolderPaths(levels);
  res.json({
    folders: paths.map((p) => ({ path: p, depth: p.split("/").length })),
    total: paths.length
  });
});
router10.post("/folders/generate", requireAuth, async (req, res) => {
  const { levels } = req.body;
  if (!levels?.length) {
    res.status(400).json({ error: "levels is required" });
    return;
  }
  const [apiKey, rootFolderId] = await Promise.all([
    getConfig("driveApiKey"),
    getConfig("driveRootFolderId")
  ]);
  if (!apiKey || !rootFolderId) {
    res.status(400).json({ error: "Google Drive not configured" });
    return;
  }
  const paths = buildFolderPaths(levels);
  const details = [];
  const folderCache = /* @__PURE__ */ new Map();
  folderCache.set("", rootFolderId);
  let created = 0, skipped = 0, errors = 0;
  for (const fullPath of paths) {
    const segments = fullPath.split("/");
    let currentPath = "";
    let success = true;
    let lastDriveId = null;
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      if (folderCache.has(currentPath)) {
        lastDriveId = folderCache.get(currentPath);
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
          dbLog("warn", `Cannot create folder with API key \u2014 needs OAuth: ${currentPath}`);
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
var folders_default = router10;

// src/routes/logs.ts
import { Router as Router11 } from "express";
var router11 = Router11();
router11.get("/logs", requireAuth, async (req, res) => {
  const level = req.query["level"];
  const limit = Math.min(parseInt(req.query["limit"] || "100", 10), 1e3);
  const offset = parseInt(req.query["offset"] || "0", 10);
  const validLevels = ["error", "warn", "info", "debug"];
  const params = [];
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
    )
  ]);
  res.json({
    logs: dataRes.rows.map((r) => ({
      id: r.id,
      level: r.level,
      message: r.message,
      context: r.context,
      createdAt: String(r.created_at)
    })),
    total: parseInt(countRes.rows[0].c, 10)
  });
});
router11.delete("/logs", requireAuth, async (req, res) => {
  await pool.query("DELETE FROM logs");
  res.json({ success: true, message: "Logs cleared" });
});
var logs_default = router11;

// src/routes/index.ts
var router12 = Router12();
router12.use(health_default);
router12.use(auth_default);
router12.use(config_default);
router12.use(announcements_default);
router12.use(drive_default);
router12.use(resources_default);
router12.use(search_default);
router12.use(ai_default);
router12.use(knowledge_default);
router12.use(folders_default);
router12.use(logs_default);
var routes_default = router12;

// src/app.ts
var currentDir = path.dirname(fileURLToPath(import.meta.url));
var adminDistDir = path.resolve(
  currentDir,
  "..",
  "..",
  "admin",
  "dist",
  "public"
);
var adminDistExists = fs.existsSync(
  path.join(adminDistDir, "index.html")
);
var app = express();
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0]
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode
        };
      }
    }
  })
);
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/api", routes_default);
if (adminDistExists) {
  app.use("/admin", express.static(adminDistDir));
  app.get("/admin/*splat", (_req, res) => {
    res.sendFile(path.join(adminDistDir, "index.html"));
  });
  app.get("/", (_req, res) => {
    res.redirect("/admin/");
  });
} else {
  logger.warn(
    { adminDistDir },
    "Admin frontend build not found \u2014 skipping static file serving. Run `pnpm --filter @workspace/admin run build` before deploying."
  );
}
app.use(
  (err, req, res, _next) => {
    logger.error({ err, url: req.url, method: req.method }, "Unhandled request error");
    if (res.headersSent) return;
    const message = err instanceof Error ? err.message : "Internal Server Error";
    res.status(500).json({ error: message });
  }
);
var app_default = app;

// src/index.ts
var rawPort = process.env["PORT"];
if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided."
  );
}
var port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}
await runMigrations();
await startAutoSync();
app_default.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
//# sourceMappingURL=index.mjs.map
