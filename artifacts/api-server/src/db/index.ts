import { Pool } from "pg";
import { logger } from "../lib/logger";

const rawDatabaseUrl = process.env["DATABASE_URL"];

if (!rawDatabaseUrl) {
  throw new Error(
    "DATABASE_URL environment variable is required but was not provided.",
  );
}

const sslDisabled = rawDatabaseUrl.includes("sslmode=disable");

/**
 * Strip the `sslmode` query param from the connection string. We configure
 * SSL explicitly via the `ssl` option below instead, since leaving
 * `sslmode=require`/`prefer`/`verify-ca` in the URL makes pg-connection-string
 * emit a "SECURITY WARNING" deprecation notice on every connection (it treats
 * those modes as aliases for verify-full ahead of a future major version).
 */
function stripSslMode(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.delete("sslmode");
  return parsed.toString();
}

const databaseUrl = stripSslMode(rawDatabaseUrl);

/**
 * Shared PostgreSQL connection pool.
 *
 * NOTE: `pg`'s Pool does NOT automatically read DATABASE_URL — only the
 * discrete PGHOST/PGUSER/PGPASSWORD/PGDATABASE/PGPORT env vars are picked
 * up implicitly. connectionString must be passed explicitly, or the pool
 * silently falls back to localhost:5432 and fails with ECONNREFUSED.
 *
 * Neon PostgreSQL is the permanent production database — no SQLite.
 */
export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: sslDisabled ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
  max: 10,
});

/**
 * CRITICAL: pg's Pool emits an 'error' event whenever an *idle* pooled
 * client hits a connection-level problem (e.g. the Neon serverless compute
 * auto-suspends after inactivity and terminates the underlying socket).
 * If nothing listens for this event, Node treats it as an uncaught
 * exception and crashes the entire process — which looks like a random
 * "Internal Server Error" / dead backend on the next request, even though
 * the actual request handler code was never at fault.
 *
 * Logging (not re-throwing) here lets the pool silently discard the dead
 * client and open a fresh connection on the next query instead.
 */
pool.on("error", (err) => {
  logger.error({ err }, "Unexpected error on idle PostgreSQL client");
});
