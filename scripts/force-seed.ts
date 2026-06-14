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
        "  npx tsx scripts/seed-demo-user.ts"
    )
    process.exit(1)
  }
  console.log("✓ Demo user found:", user.id)

  console.log("🧹 Clearing old data for demo user...")
  // The store.clearUser method handles the cascaded cleanup in Drizzle/Postgres
  await store.clearUser(user.id)
  
  console.log("🌱 Seeding fresh demo data...")
  // We use the store implementation which now contains the Aura Energy seed
  const { seedDemo } = await import("../src/lib/store")
  // We need to pass the db-backed store specifically if we want to ensure it goes to Postgres
  // But store is already exported as dbStore if dbEnabled is true.
  await store.seed(user.id) 
  
  console.log("✅ Force seed complete. Dashboard is now ready.")
  process.exit(0)
}

main().catch((e) => {
  console.error("Force seed failed:", e)
  process.exit(1)
})
