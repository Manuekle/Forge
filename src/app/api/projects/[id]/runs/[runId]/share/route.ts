import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { store } from "@/lib/store"
import { requireProjectAccess } from "@/lib/api-auth"
import { rateLimit } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

/** Unguessable, URL-safe public slug for a Decision Record permalink. */
function newShareId(): string {
  return randomBytes(9).toString("base64url") // 12 chars
}

// POST — publish a completed run as a public Decision Record. Idempotent:
// re-publishing an already-shared run returns its existing slug.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  const { id, runId } = await params
  const access = await requireProjectAccess(id)
  if (!access.ok) return access.response

  const limited = await rateLimit(`share:${access.userId}`, { limit: 30, windowMs: 60_000 })
  if (!limited.ok) return limited.response

  const runs = await store.getRuns(id)
  const run = runs.find((r) => r.id === runId)
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 })
  if (run.status !== "completed") {
    return NextResponse.json({ error: "Only completed runs can be shared" }, { status: 409 })
  }

  const shareId = run.shareId ?? newShareId()
  if (!run.shareId) await store.setRunShare(runId, shareId)

  logger.info("run.shared", { runId, projectId: id, userId: access.userId })
  return NextResponse.json({ shareId, path: `/d/${shareId}` })
}

// DELETE — unpublish: the permalink stops resolving immediately.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  const { id, runId } = await params
  const access = await requireProjectAccess(id)
  if (!access.ok) return access.response

  const runs = await store.getRuns(id)
  const run = runs.find((r) => r.id === runId)
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 })

  await store.setRunShare(runId, null)
  logger.info("run.unshared", { runId, projectId: id, userId: access.userId })
  return NextResponse.json({ ok: true })
}
