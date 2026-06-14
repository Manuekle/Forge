import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

/**
 * Persistence is opt-in. The zero-config demo runs entirely in memory; set
 * STORE_DRIVER=postgres (with a valid DATABASE_URL) to use the Drizzle/Postgres
 * backend instead. Gating on an explicit flag avoids the app trying to reach a
 * Postgres that isn't running just because DATABASE_URL has a default value.
 */
export const dbEnabled =
  process.env.STORE_DRIVER === "postgres" && !!process.env.DATABASE_URL

let _db: PostgresJsDatabase<typeof schema> | null = null

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (!dbEnabled) throw new Error("Database is not enabled (set STORE_DRIVER=postgres)")
  if (!_db) {
    // Prefer a pooled connection string (PgBouncer/Supabase pooler/Neon) in
    // serverless, where each instance opens its own connections — an unpooled
    // direct URL exhausts Postgres' connection limit under load.
    const connectionString = process.env.DATABASE_POOL_URL || process.env.DATABASE_URL!
    const client = postgres(connectionString, {
      // Keep per-instance connections small; many instances × large max = outage.
      max: Number(process.env.DB_POOL_MAX) || 5,
      idle_timeout: 20, // close idle conns (seconds) so they return to the pooler
      connect_timeout: 10,
      max_lifetime: 60 * 30, // recycle conns every 30m to avoid stale sockets
      // Transaction-mode poolers (PgBouncer) don't support prepared statements.
      prepare: false,
    })
    _db = drizzle(client, { schema })
  }
  return _db
}

export { schema }
