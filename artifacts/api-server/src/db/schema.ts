// Schema definitions — all tables are managed in src/db/migrate.ts
// Database: Neon PostgreSQL (accessed via the `pg` Pool in src/db/index.ts)
//
// Tables:
//   config               — key/value app settings
//   announcements        — public announcements with active/priority flags
//   resources            — Drive files/folders synced from Google Drive
//   sync_records         — history of Drive sync runs
//   ai_sessions          — AI chat sessions
//   ai_messages          — messages per session (FK → ai_sessions)
//   logs                 — application event log (capped at 5000 rows)
//   knowledge_chunks     — PDF text chunks with tsvector FTS column (GIN index)
//   knowledge_index_meta — per-resource indexing metadata
//   ai_search_logs       — record of knowledge searches made by the AI
export {};
