import { NextResponse } from "next/server"
import { store } from "@/lib/store"
import { requireProjectAccess } from "@/lib/api-auth"
import { safeJson } from "@/lib/guard"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { id, fileId } = await params
  const access = await requireProjectAccess(id)
  if (!access.ok) return access.response

  const all = await store.getCodeFiles(id)
  if (!all.some((f) => f.id === fileId)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }

  const body = await safeJson(request)
  if (typeof body.content !== "string") {
    return NextResponse.json({ error: "content is required" }, { status: 400 })
  }
  if (body.content.length > 500000) {
    return NextResponse.json({ error: "File too large" }, { status: 400 })
  }

  const file = await store.updateCodeFile(fileId, body.content)
  return NextResponse.json(file)
}
