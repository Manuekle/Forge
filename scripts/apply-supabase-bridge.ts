/**
 * Applies supabase/migrations/0001_supabase_auth_bridge.sql to the database in
 * DATABASE_URL. Uses the session pooler (port 5432) so DDL / functions /
 * triggers run reliably. Idempotent — safe to re-run.
 *
 * Run: npx tsx scripts/apply-supabase-bridge.ts
 */
import postgres from "postgres"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const raw = process.env.DATABASE_URL
if (!raw) {
  console.error("DATABASE_URL is not set")
  process.exit(1)
}

// Prefer session mode for DDL: transaction pooler (6543) can fragment a
// multi-statement script across backends. Swap to 5432 and drop pgbouncer.
const url = raw.replace(":6543", ":5432").replace(/[?&]pgbouncer=true/, "")

const sqlText = readFileSync(
  join(process.cwd(), "supabase/migrations/0001_supabase_auth_bridge.sql"),
  "utf8"
)

async function main() {
  const sql = postgres(url, { prepare: false, max: 1 })
  try {
    await sql.unsafe(sqlText)
    console.log("✓ Supabase auth bridge applied")
  } finally {
    await sql.end()
  }
}

main().catch((e) => {
  console.error("Bridge failed:", e?.message || e)
  process.exit(1)
})
