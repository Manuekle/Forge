import { readFileSync } from "fs"
import { resolve } from "path"

const envPath = resolve(__dirname, "../.env")
const envContent = readFileSync(envPath, "utf-8")
for (const line of envContent.split("\n")) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith("#")) continue
  const eqIdx = trimmed.indexOf("=")
  if (eqIdx === -1) continue
  const key = trimmed.slice(0, eqIdx).trim()
  let value = trimmed.slice(eqIdx + 1).trim()
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1)
  }
  process.env[key] = value
}

import postgres from "postgres"

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false })
  const tables = await sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`
  console.log("TABLES:", tables.map((t) => t.table_name).join(", "))
  const migTable = await sql`select table_name from information_schema.tables where table_schema = 'drizzle'`
  console.log("DRIZZLE SCHEMA TABLES:", migTable.map((t) => t.table_name).join(", ") || "(none)")
  if (migTable.some((t) => t.table_name === "__drizzle_migrations")) {
    const migs = await sql`select id, hash, created_at from drizzle.__drizzle_migrations order by id`
    console.log("APPLIED MIGRATIONS:", migs.length)
    for (const m of migs) console.log(" ", m.id, m.created_at, m.hash.slice(0, 12))
  }
  const userCols = await sql`select column_name from information_schema.columns where table_name = 'users' and table_schema = 'public' order by ordinal_position`
  console.log("USERS COLUMNS:", userCols.map((c) => c.column_name).join(", "))
  await sql.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
