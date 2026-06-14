import { NextResponse } from "next/server"
import { store } from "@/lib/store"
import { toPublicRecord } from "@/lib/public-record"

// Public, unauthenticated read of a shared Decision Record. Returns only
// vetted, non-secret fields (see toPublicRecord) — never user or project IDs,
// tokens, or anything that isn't part of the published record.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const { shareId } = await params
  const run = await store.getRunByShareId(shareId)
  if (!run || run.status !== "completed") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(toPublicRecord(run), {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
  })
}
