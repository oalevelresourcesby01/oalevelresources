import { pool } from "./index";
import { randomUUID } from "crypto";

export async function runMigrations(): Promise<void> {
  // ── Core tables ────────────────────────────────────────────────────────────
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

  // ── Full-text search: add generated tsvector column + GIN index ───────────
  // These are separate statements because ADD COLUMN IF NOT EXISTS and
  // CREATE INDEX IF NOT EXISTS must run outside multi-statement strings.
  try {
    await pool.query(`
      ALTER TABLE knowledge_chunks
        ADD COLUMN IF NOT EXISTS content_tsv TSVECTOR
          GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
    `);
  } catch {
    // Column already exists — safe to ignore
  }
  try {
    await pool.query(
      "CREATE INDEX IF NOT EXISTS idx_kc_tsv ON knowledge_chunks USING GIN(content_tsv)"
    );
  } catch {
    // Index already exists — safe to ignore
  }

  // ── Seed default config values (won't overwrite existing) ─────────────────
  const defaults: [string, string][] = [
    ["adminUsername",      "oalevel"],
    ["adminPasswordHash",  ""],
    ["jwtSecret",          randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "")],
    ["jwtVersion",         "0"],
    ["driveApiKey",        ""],
    ["driveRootFolderId",  ""],
    ["openRouterApiKey",   ""],
    ["aiEnabled",          "true"],
    ["aiModel",            "openai/gpt-4o-mini"],
    ["aiSystemPrompt",
      "You are an expert educational assistant for O/A Level students.\n\n" +
      "KNOWLEDGE PRIORITY:\n" +
      "1. Always search and use the application's indexed educational resources first (notes, past papers, mark schemes, examiner reports, etc.).\n" +
      "2. When relevant local resources are found, base your answer on them and cite them.\n" +
      "3. Only use general AI knowledge when no relevant local resources are available.\n" +
      "4. Always recommend related resources from the knowledge base whenever possible.\n\n" +
      "Behaviour:\n" +
      "- Answer questions about O/A Level subjects clearly and accurately.\n" +
      "- Reference specific notes, papers, or resources when they are provided in context.\n" +
      "- Never ignore relevant local resources that have been surfaced for the query.\n" +
      "- Keep answers concise, clear, and curriculum-aligned."
    ],
    ["appName",            "O/A Level Resources"],
    ["whatsappChannel",    ""],
    ["aboutUs",            ""],
    ["contactEmail",       ""],
    ["contactPhone",       ""],
    ["maintenanceMode",    "false"],
    ["theme",              "light"],
    ["autoSync",           "false"],
    ["syncIntervalMinutes","60"],
    ["cacheEnabled",       "true"],
    ["cacheTtlMinutes",    "30"],
    ["maxDownloadSizeMb",  "100"],
  ];

  for (const [key, value] of defaults) {
    await pool.query(
      "INSERT INTO config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING",
      [key, value]
    );
  }

  console.log("[db] PostgreSQL migrations complete");
}
