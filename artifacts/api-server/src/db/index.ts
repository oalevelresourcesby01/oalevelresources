import { Pool } from "pg";

const databaseUrl = process.env["DATABASE_URL"];

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL environment variable is required but was not provided.",
  );
}

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
  ssl: databaseUrl.includes("sslmode=disable")
    ? false
    : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
  max: 10,
});
