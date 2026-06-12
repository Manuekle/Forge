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
  return NextResponse.json(access.project)
}

const ALLOWED_STATUS = new Set(["active", "planning", "in_review", "archived"])

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const access = await requireProjectAccess(id)
  if (!access.ok) return access.response

  const body = await safeJson(request)
  // Only allow a safe, explicit subset of fields to be patched.
  const patch: Record<string, unknown> = {}
  if (body.name !== undefined) patch.name = clampText(body.name, 120)
  if (body.description !== undefined) patch.description = clampText(body.description, 2000)
  if (typeof body.status === "string" && ALLOWED_STATUS.has(body.status)) patch.status = body.status
  if (typeof body.progress === "number") patch.progress = Math.min(100, Math.max(0, body.progress))

  const updated = await store.updateProject(id, patch)
  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const access = await requireProjectAccess(id)
  if (!access.ok) return access.response
  await store.deleteProject(id)
  return NextResponse.json({ success: true })
}
