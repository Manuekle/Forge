import { NextResponse } from "next/server"
import { store } from "@/lib/store"

export async function GET() {
  const activities = store.getActivities()
  return NextResponse.json(activities)
}
