import { NextResponse } from "next/server"
import { store } from "@/lib/store"

export async function GET() {
  const activities = await store.getActivities()
  return NextResponse.json(activities)
}
