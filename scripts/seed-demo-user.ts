/**
 * Seeds the demo Supabase Auth user (demo@forge.dev / forge).
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env.
 *
 * Run: npx tsx scripts/seed-demo-user.ts
 * Never run against production — the demo login is dev-only.
 */
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const email = "demo@forge.dev"
  const password = "forgedemo"

  // Idempotent: if the demo user already exists, just ensure the password.
  const { data: list } = await admin.auth.admin.listUsers()
  const existing = list?.users.find((u) => u.email === email)

  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    })
    console.log(`Demo user updated: ${existing.id}`)
    return
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Demo User" },
  })
  if (error) {
    console.error("Failed to create demo user:", error.message)
    process.exit(1)
  }
  console.log(`Demo user created: ${data.user?.id}`)
}

main()
