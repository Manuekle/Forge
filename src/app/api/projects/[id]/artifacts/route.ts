import { NextResponse } from "next/server"
import { store } from "@/lib/store"
import { requireProjectAccess } from "@/lib/api-auth"
import { clampText, safeJson } from "@/lib/guard"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const access = await requireProjectAccess(id)
  if (!access.ok) return access.response
  const all = await store.getArtifacts(id)
  return NextResponse.json(all)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const access = await requireProjectAccess(id)
  if (!access.ok) return access.response

  const body = await safeJson(request)
  const type = clampText(body.type, 40)
  const title = clampText(body.title, 200)
  const content = clampText(body.content, 100000)

  if (!type || !title) {
    return NextResponse.json({ error: "Type and title are required" }, { status: 400 })
  }

  const artifact = await store.createArtifact(id, type, title, content)
  return NextResponse.json(artifact, { status: 201 })
}
