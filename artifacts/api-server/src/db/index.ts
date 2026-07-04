import { Pool } from "pg";

/**
 * Shared PostgreSQL connection pool.
 * Automatically reads DATABASE_URL (and PG* vars) from the environment.
 * Neon PostgreSQL is the permanent production database — no SQLite.
 */
export const pool = new Pool({
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
  max: 10,
});
