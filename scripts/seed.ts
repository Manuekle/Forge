import { readFileSync } from "fs"
import { resolve } from "path"

// Load .env manually
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

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "../src/db/schema"
import { eq } from "drizzle-orm"
import { store } from "../src/lib/store"

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is required")

  const client = postgres(url, { prepare: false })
  const db = drizzle(client, { schema })

  const email = "demo@forge.dev"
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1)

  if (!user) {
    console.error(
      "Demo user not found. Create it in Supabase Auth first:\n" +
        "  npx tsx scripts/seed-demo-user.ts\n" +
        "(the on_auth_user_created trigger then creates the public.users row)"
    )
    process.exit(1)
  }
  console.log("✓ Demo user exists:", user.id)

  await store.seed(user.id)
  console.log("✓ Demo data seeded")

  process.exit(0)
}

main().catch((e) => {
  console.error("Seed failed:", e)
  process.exit(1)
})
