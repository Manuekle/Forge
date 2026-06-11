import { NextResponse } from "next/server"
import { store } from "@/lib/store"
import { requireUser } from "@/lib/api-auth"

export async function POST() {
  const authed = await requireUser()
  if (!authed.ok) return authed.response
  // Only wipe the authenticated user's own data — never the whole store.
  await store.clearUser(authed.userId)
  return NextResponse.json({ ok: true, message: "Your workspace was cleared" })
}
