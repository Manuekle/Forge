import { createClient } from "@supabase/supabase-js"
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
import { eq, sql } from "drizzle-orm"
import * as schema from "../src/db/schema"
import { store } from "../src/lib/store"
import { seedDemo } from "../src/lib/store"

const DEMO_EMAIL = "demo@forge.dev"
const DEMO_PASSWORD = "forgedemo"

async function main() {
  // ── 1. Wipe ALL projects & related data ──────────────────────────────
  console.log("🧹 Wiping all projects, decisions, artifacts, runs, tasks, code files, activities...")
  await getDb().delete(schema.projects)
  console.log("  ✓ All data cleared")

  // ── 2. Ensure demo user exists in Supabase Auth ────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: list } = await admin.auth.admin.listUsers()
  let demoUserId: string | null = null
  const existing = list?.users.find((u) => u.email === DEMO_EMAIL)

  if (existing) {
    demoUserId = existing.id
    await admin.auth.admin.updateUserById(existing.id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
    })
    console.log("  ✓ Demo user updated in Auth:", demoUserId)
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { name: "Demo User" },
    })
    if (error) {
      console.error("  ✗ Failed to create demo user:", error.message)
      process.exit(1)
    }
    demoUserId = data.user!.id
    console.log("  ✓ Demo user created in Auth:", demoUserId)
  }

  // ── 3. Ensure demo user exists in public.users ─────────────────────
  const db = getDb()
  const [existingUser] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, DEMO_EMAIL))
    .limit(1)

  if (existingUser) {
    await db
      .update(schema.users)
      .set({ name: "Demo User", email: DEMO_EMAIL })
      .where(eq(schema.users.id, existingUser.id))
    console.log("  ✓ Demo user updated in public.users:", existingUser.id)
  } else {
    await db.insert(schema.users).values({
      id: demoUserId,
      name: "Demo User",
      email: DEMO_EMAIL,
      plan: "free",
    })
    console.log("  ✓ Demo user created in public.users:", demoUserId)
  }

  // ── 4. Seed demo data for the demo user ────────────────────────────
  console.log("🌱 Seeding demo projects for demo user...")
  await seedDemo(store, demoUserId)
  console.log("  ✓ Demo projects seeded")

  console.log("\n✅ Force seed complete.")
  console.log("   Demo user: demo@forge.dev / forgedemo")
  console.log("   Other users will start with an empty project list.")
  process.exit(0)
}

let _db: ReturnType<typeof drizzle> | null = null

function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error("DATABASE_URL is required")
    const client = postgres(url, { prepare: false })
    _db = drizzle(client, { schema })
  }
  return _db
}

main().catch((e) => {
  console.error("Force seed failed:", e)
  process.exit(1)
})
