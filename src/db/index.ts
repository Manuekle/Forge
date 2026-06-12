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
    const client = postgres(process.env.DATABASE_URL!, { max: 5, prepare: false })
    _db = drizzle(client, { schema })
  }
  return _db
}

export { schema }
