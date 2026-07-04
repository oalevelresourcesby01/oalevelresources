import { pool } from "../db/index";
import { randomUUID } from "crypto";

/**
 * Fire-and-forget DB logger. Returns void so callers don't need to await.
 * Failures are swallowed — logging must never crash the app.
 */
export function dbLog(
  level: "error" | "warn" | "info" | "debug",
  message: string,
  context?: string
): void {
  void (async () => {
    try {
      const id = randomUUID();
      await pool.query(
        "INSERT INTO logs (id, level, message, context) VALUES ($1, $2, $3, $4)",
        [id, level, message, context ?? null]
      );

      // Keep logs under 5000 rows
      await pool.query(`
        DELETE FROM logs
        WHERE id IN (
          SELECT id FROM logs
          ORDER BY created_at ASC
          LIMIT GREATEST(0, (SELECT COUNT(*)::int FROM logs) - 5000)
        )
      `);
    } catch {
      // Non-critical — don't propagate
    }
  })();
}
