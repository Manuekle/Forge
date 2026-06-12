import { NextResponse } from "next/server"
import { store } from "@/lib/store"
import { requireProjectAccess } from "@/lib/api-auth"
import { safeJson } from "@/lib/guard"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { id, taskId } = await params
  const access = await requireProjectAccess(id)
  if (!access.ok) return access.response

  const body = await safeJson(request)
  const patch: Record<string, unknown> = {}
  if (body.title !== undefined) patch.title = body.title
  if (body.description !== undefined) patch.description = body.description
  if (body.priority !== undefined) patch.priority = body.priority
  if (body.storyPoints !== undefined) patch.storyPoints = body.storyPoints
  if (body.status !== undefined) patch.status = body.status
  if (body.order !== undefined) patch.order = body.order
  if (body.assignee !== undefined) patch.assignee = body.assignee

  const updated = await store.updateTask(taskId, patch)
  if (!updated) return NextResponse.json({ error: "Task not found" }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { id, taskId } = await params
  const access = await requireProjectAccess(id)
  if (!access.ok) return access.response
  await store.deleteTask(taskId)
  return NextResponse.json({ success: true })
}
