import { Router, type Request } from "express";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/index";
import { requireAuth } from "../middlewares/auth";
import { sendAiMessage, getAvailableModels } from "../lib/ai";
import { searchKnowledge, logAiSearch } from "../lib/knowledge";
import { getConfig } from "../lib/config";
import { dbLog } from "../lib/dbLogger";

const router = Router();

// ── Simple in-memory rate limiter ─────────────────────────────────────────────
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT = 30;
const ipRateMap = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: Request): string {
  // In production behind a trusted proxy (e.g. Render, Replit), use the
  // rightmost IP from x-forwarded-for that we can trust, or fall back to
  // the direct socket address. We take the LAST entry from x-forwarded-for
  // to avoid spoofing (client-controlled headers prepend, proxy appends).
  const xff = req.headers["x-forwarded-for"] as string | undefined;
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    // Use the last hop added by our trusted proxy (rightmost)
    const trusted = parts[parts.length - 1];
    if (trusted) return trusted;
  }
  return req.socket?.remoteAddress ?? "unknown";
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
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

// POST /api/ai/chat — public but rate-limited
router.post("/ai/chat", async (req, res) => {
  const ip = getClientIp(req);
  const { allowed, remaining, resetAt } = checkRateLimit(ip);

  if (!allowed) {
    res.setHeader("X-RateLimit-Limit", RATE_LIMIT);
    res.setHeader("X-RateLimit-Remaining", 0);
    res.setHeader("X-RateLimit-Reset", Math.ceil(resetAt / 1000));
    res.status(429).json({ error: "Rate limit exceeded. Try again in 1 hour." });
    return;
  }

  res.setHeader("X-RateLimit-Limit", RATE_LIMIT);
  res.setHeader("X-RateLimit-Remaining", remaining);

  const { message, sessionId, model, imageBase64, pdfText } = req.body as {
    message?: string;
    sessionId?: string;
    model?: string;
    imageBase64?: string;
    pdfText?: string;
  };

  if (!message || !sessionId) {
    res.status(400).json({ error: "message and sessionId are required" });
    return;
  }

  if (typeof sessionId !== "string" || sessionId.length > 64 || !/^[\w-]+$/.test(sessionId)) {
    res.status(400).json({ error: "Invalid sessionId format" });
    return;
  }

  if (typeof message !== "string" || message.length > 8000) {
    res.status(400).json({ error: "message must be a string of at most 8000 characters" });
    return;
  }

  // Attachments are optional but must be independently bounded server-side —
  // client-side checks (file size/type) can be bypassed by calling this
  // endpoint directly, which would otherwise let arbitrarily large payloads
  // inflate AI prompt size/cost or destabilize the process.
  const MAX_IMAGE_BASE64_CHARS = 21 * 1024 * 1024; // ~15MB binary, base64-inflated (~33%), plus headroom
  const MAX_PDF_TEXT_CHARS = 200_000; // plenty for a large document, bounds token usage

  if (imageBase64 !== undefined) {
    if (typeof imageBase64 !== "string" || imageBase64.length === 0 || imageBase64.length > MAX_IMAGE_BASE64_CHARS) {
      res.status(400).json({ error: "imageBase64 is invalid or too large" });
      return;
    }
  }

  let boundedPdfText = pdfText;
  if (boundedPdfText !== undefined) {
    if (typeof boundedPdfText !== "string") {
      res.status(400).json({ error: "pdfText is invalid" });
      return;
    }
    if (boundedPdfText.length === 0) {
      // Empty string means no extractable text (e.g. scanned/image-only PDF).
      // Treat as no attachment rather than an error so the AI can still reply.
      boundedPdfText = undefined;
    } else if (boundedPdfText.length > MAX_PDF_TEXT_CHARS) {
      boundedPdfText = boundedPdfText.slice(0, MAX_PDF_TEXT_CHARS);
    }
  }

  const aiEnabled = await getConfig("aiEnabled");
  if (aiEnabled !== "true") {
    res.status(503).json({ error: "AI is currently disabled" });
    return;
  }

  // Ensure session exists
  await pool.query(
    "INSERT INTO ai_sessions (id) VALUES ($1) ON CONFLICT (id) DO NOTHING",
    [sessionId]
  );

  // Get conversation history (last 20 messages)
  const { rows: historyRows } = await pool.query(
    "SELECT role, content FROM ai_messages WHERE session_id = $1 ORDER BY created_at DESC LIMIT 20",
    [sessionId]
  );
  const history = historyRows.reverse();

  const messages = [
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: message },
  ];

  // Save user message
  await pool.query(
    "INSERT INTO ai_messages (id, session_id, role, content) VALUES ($1, $2, 'user', $3)",
    [uuidv4(), sessionId, message]
  );

  try {
    // ── Search knowledge index before calling the AI ──────────────────────
    const knowledgeResults = await searchKnowledge(message, 5);
    const relatedResources = knowledgeResults.map((r) => ({
      resourceId: r.resourceId,
      resourceName: r.resourceName,
    }));

    let knowledgeContext: string | undefined;
    if (knowledgeResults.length > 0) {
      knowledgeContext = knowledgeResults
        .map((r, i) => `[Resource ${i + 1}: ${r.resourceName}]\n${r.content}`)
        .join("\n\n---\n\n");
    }

    logAiSearch(message, knowledgeResults.length, relatedResources.map((r) => r.resourceName));

    const result = await sendAiMessage(messages, model, imageBase64, boundedPdfText, knowledgeContext);

    // Save assistant message
    await pool.query(
      "INSERT INTO ai_messages (id, session_id, role, content) VALUES ($1, $2, 'assistant', $3)",
      [uuidv4(), sessionId, result.reply]
    );

    // Update session
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
      relatedResources,
    });
  } catch (err) {
    dbLog("error", "AI chat error", String(err));
    res.status(500).json({ error: "AI service error. Please try again." });
  }
});

// GET /api/ai/sessions/:sessionId/messages — admin only
router.get("/ai/sessions/:sessionId/messages", requireAuth, async (req, res) => {
  const sessionId = req.params["sessionId"] as string;
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
      createdAt: String(r.created_at),
    }))
  );
});

// DELETE /api/ai/sessions/:sessionId/messages — admin only
router.delete("/ai/sessions/:sessionId/messages", requireAuth, async (req, res) => {
  const sessionId = req.params["sessionId"] as string;
  await pool.query("DELETE FROM ai_messages WHERE session_id = $1", [sessionId]);
  dbLog("info", `AI session cleared: ${sessionId}`);
  res.json({ success: true, message: "Session cleared" });
});

// GET /api/ai/models — admin only
router.get("/ai/models", requireAuth, async (req, res) => {
  const models = await getAvailableModels();
  res.json(models);
});

export default router;
