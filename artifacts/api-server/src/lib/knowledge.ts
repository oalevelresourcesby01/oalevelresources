/**
 * Knowledge Index — indexes PDF content from Google Drive for RAG-style AI search.
 * Uses PostgreSQL full-text search (tsvector/tsquery + GIN index) instead of SQLite FTS5.
 */

import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/index";
import { getConfig } from "./config";
import { dbLog } from "./dbLogger";
import { randomUUID } from "crypto";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KnowledgeSearchResult {
  resourceId: string;
  resourceName: string;
  chunkIndex: number;
  content: string;
  score: number;
}

export interface IndexedResource {
  resourceId: string;
  resourceName: string;
  chunkCount: number;
  indexedAt: string;
}

export interface KnowledgeStats {
  totalIndexed: number;
  totalChunks: number;
  lastIndexedAt: string | null;
}

// ── Index operation state ─────────────────────────────────────────────────────

export type IndexState = {
  status: "idle" | "running" | "error";
  message: string | null;
  progress: number | null;
};

let indexState: IndexState = { status: "idle", message: null, progress: null };

export function getIndexState(): IndexState {
  return { ...indexState };
}

// ── PDF download from Google Drive ────────────────────────────────────────────

async function downloadPdf(driveId: string, apiKey: string): Promise<Buffer> {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(driveId)}?alt=media&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive download error ${res.status}: ${text.slice(0, 200)}`);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

// ── Text extraction from PDF buffer ──────────────────────────────────────────

async function extractText(buffer: Buffer): Promise<string> {
  try {
    // Import from the internal lib path to avoid pdf-parse v1's broken index.js,
    // which tries to read a test file from the current working directory on import.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = (await import("pdf-parse/lib/pdf-parse.js")) as any;
    const pdfParse: (b: Buffer) => Promise<{ text: string }> =
      typeof mod.default === "function" ? mod.default : mod;
    const data = await pdfParse(buffer);
    return data.text ?? "";
  } catch (err) {
    throw new Error(`PDF text extraction failed: ${String(err)}`);
  }
}

// ── Text chunking ─────────────────────────────────────────────────────────────

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 80;

function chunkText(text: string): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ");
  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + CHUNK_SIZE, cleaned.length);
    const chunk = cleaned.slice(start, end).trim();
    if (chunk.length >= 50) chunks.push(chunk);
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

// ── Clear chunks for one resource ─────────────────────────────────────────────

async function clearResourceChunks(resourceId: string): Promise<void> {
  await pool.query("DELETE FROM knowledge_chunks WHERE resource_id = $1", [resourceId]);
  await pool.query("DELETE FROM knowledge_index_meta WHERE resource_id = $1", [resourceId]);
}

// ── Index a single resource ───────────────────────────────────────────────────

export async function indexResource(
  resourceId: string,
  driveId: string,
  name: string
): Promise<number> {
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
        [uuidv4(), resourceId, name, i, chunks[i]]
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

// ── Rebuild entire index ──────────────────────────────────────────────────────

export async function rebuildKnowledgeIndex(): Promise<{
  indexed: number;
  failed: number;
  totalChunks: number;
}> {
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
      const pdf = pdfs[i]!;
      indexState.message = `Indexing "${pdf.name}" (${i + 1}/${total})`;
      indexState.progress = Math.round((i / total) * 100);
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
      progress: 100,
    };
    dbLog("info", "Knowledge rebuild complete", JSON.stringify(stats));
  } catch (err) {
    indexState = { status: "error", message: String(err), progress: null };
    dbLog("error", "Knowledge rebuild failed", String(err));
    throw err;
  }

  return stats;
}

// ── Index new PDFs only ───────────────────────────────────────────────────────

export async function indexNewResources(): Promise<{
  indexed: number;
  failed: number;
  totalChunks: number;
}> {
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
      const pdf = newPdfs[i]!;
      indexState.message = `Indexing "${pdf.name}" (${i + 1}/${total})`;
      indexState.progress = Math.round((i / total) * 100);
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
      message: total === 0
        ? "No new PDFs to index."
        : `Done. ${stats.indexed} indexed, ${stats.failed} failed, ${stats.totalChunks} chunks.`,
      progress: 100,
    };
  } catch (err) {
    indexState = { status: "error", message: String(err), progress: null };
    dbLog("error", "Knowledge index-new failed", String(err));
    throw err;
  }

  return stats;
}

// ── Remove stale index entries ────────────────────────────────────────────────

export async function removeDeletedResources(): Promise<{ removed: number }> {
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

// ── Full-text search ──────────────────────────────────────────────────────────

export async function searchKnowledge(
  query: string,
  limit = 5
): Promise<KnowledgeSearchResult[]> {
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

    // Deduplicate: best chunk per resource
    const byResource = new Map<string, KnowledgeSearchResult>();
    for (const row of rows) {
      if (!byResource.has(row.resource_id)) {
        byResource.set(row.resource_id, {
          resourceId: row.resource_id,
          resourceName: row.resource_name,
          chunkIndex: row.chunk_index,
          content: row.content,
          score: parseFloat(row.rank),
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

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getKnowledgeStats(): Promise<KnowledgeStats> {
  const [meta, chunks, last] = await Promise.all([
    pool.query("SELECT COUNT(*) AS n FROM knowledge_index_meta"),
    pool.query("SELECT COUNT(*) AS n FROM knowledge_chunks"),
    pool.query("SELECT MAX(indexed_at) AS t FROM knowledge_index_meta"),
  ]);

  return {
    totalIndexed: parseInt(meta.rows[0].n, 10),
    totalChunks: parseInt(chunks.rows[0].n, 10),
    lastIndexedAt: last.rows[0]?.t ? String(last.rows[0].t) : null,
  };
}

// ── List indexed resources ────────────────────────────────────────────────────

export async function listIndexedResources(): Promise<IndexedResource[]> {
  const { rows } = await pool.query(
    "SELECT resource_id, resource_name, chunk_count, indexed_at FROM knowledge_index_meta ORDER BY indexed_at DESC"
  );
  return rows.map((r) => ({
    resourceId: r.resource_id,
    resourceName: r.resource_name,
    chunkCount: r.chunk_count,
    indexedAt: String(r.indexed_at),
  }));
}

// ── Log an AI search query ────────────────────────────────────────────────────

export function logAiSearch(
  queryPreview: string,
  chunksFound: number,
  resourceNames: string[]
): void {
  void (async () => {
    try {
      await pool.query(
        "INSERT INTO ai_search_logs (id, query_preview, chunks_found, resource_names) VALUES ($1, $2, $3, $4)",
        [randomUUID(), queryPreview.slice(0, 200), chunksFound, resourceNames.join(", ")]
      );
    } catch {
      // Non-critical
    }
  })();
}

// ── List AI search logs ───────────────────────────────────────────────────────

export async function listAiSearchLogs(limit = 50): Promise<{
  queryPreview: string;
  chunksFound: number;
  resourceNames: string;
  createdAt: string;
}[]> {
  const { rows } = await pool.query(
    "SELECT query_preview, chunks_found, resource_names, created_at FROM ai_search_logs ORDER BY created_at DESC LIMIT $1",
    [limit]
  );
  return rows.map((r) => ({
    queryPreview: r.query_preview,
    chunksFound: r.chunks_found,
    resourceNames: r.resource_names,
    createdAt: String(r.created_at),
  }));
}
