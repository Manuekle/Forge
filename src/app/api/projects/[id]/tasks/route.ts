import { NextResponse } from "next/server"
import { store } from "@/lib/store"
import { requireProjectAccess } from "@/lib/api-auth"
import { safeJson } from "@/lib/guard"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const access = await requireProjectAccess(id)
  if (!access.ok) return access.response
  const tasks = await store.getTasks(id)
  return NextResponse.json(tasks)
}

const ALLOWED_PRIORITY = new Set(["p0", "p1", "p2"])
const ALLOWED_STATUS = new Set(["todo", "in_progress", "done"])

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const access = await requireProjectAccess(id)
  if (!access.ok) return access.response

  const body = await safeJson(request)
  if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }

  const priority = typeof body.priority === "string" && ALLOWED_PRIORITY.has(body.priority) ? body.priority as "p0" | "p1" | "p2" : "p2"
  const status = typeof body.status === "string" && ALLOWED_STATUS.has(body.status) ? body.status as "todo" | "in_progress" | "done" : "todo"
  const task = await store.createTask(id, {
    title: body.title.trim(),
    description: typeof body.description === "string" ? body.description.trim() : "",
    priority,
    storyPoints: typeof body.storyPoints === "number" ? body.storyPoints : null,
    status,
    assignee: typeof body.assignee === "string" ? body.assignee.trim() : null,
  })
  return NextResponse.json(task, { status: 201 })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  const access = await requireProjectAccess(projectId)
  if (!access.ok) return access.response

  const body = await safeJson(request)
  if (body.taskIds && Array.isArray(body.taskIds)) {
    await store.reorderTasks(projectId, body.taskIds)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 })
}
