import { NextResponse } from "next/server"
import { store } from "@/lib/store"
import { requireUser } from "@/lib/api-auth"

export async function GET() {
  const authResult = await requireUser()
  if (!authResult.ok) return authResult.response

  const [runs, activities] = await Promise.all([
    store.getAllRuns(authResult.userId),
    store.getActivities(authResult.userId, 20),
  ])

  return NextResponse.json({ runs, activities })
}
