import { NextResponse } from "next/server"
import { store } from "@/lib/store"
import { requireProjectAccess } from "@/lib/api-auth"
import { clampText, safeJson } from "@/lib/guard"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; artifactId: string }> }
) {
  const { id, artifactId } = await params
  const access = await requireProjectAccess(id)
  if (!access.ok) return access.response

  const all = await store.getArtifacts(id)
  if (!all.some((a) => a.id === artifactId)) {
    return NextResponse.json({ error: "Artifact not found" }, { status: 404 })
  }

  const body = await safeJson(request)
  const patch: { title?: string; content?: string } = {}
  if (typeof body.title === "string") patch.title = clampText(body.title, 200)
  if (typeof body.content === "string") patch.content = clampText(body.content, 100000)

  if (patch.title === undefined && patch.content === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  const artifact = await store.updateArtifact(artifactId, patch)
  return NextResponse.json(artifact)
}
