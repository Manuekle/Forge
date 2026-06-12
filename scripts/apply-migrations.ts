import { readFileSync, readdirSync } from "fs"
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
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 })
  const dir = resolve(__dirname, "../drizzle")
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()
  const only = process.argv.slice(2)
  const targets = only.length > 0 ? files.filter((f) => only.some((o) => f.startsWith(o))) : files

  for (const file of targets) {
    const statements = readFileSync(resolve(dir, file), "utf-8")
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean)
    for (const stmt of statements) {
      try {
        await sql.unsafe(stmt)
        console.log(`✓ ${file}: ${stmt.slice(0, 60).replace(/\s+/g, " ")}...`)
      } catch (e) {
        const code = (e as { code?: string }).code
        if (code === "42P07" || code === "42701" || code === "42710") {
          console.log(`- ${file}: already applied (${code})`)
        } else {
          throw e
        }
      }
    }
  }
  await sql.end()
  console.log("Done")
}

main().catch((e) => { console.error(e); process.exit(1) })
