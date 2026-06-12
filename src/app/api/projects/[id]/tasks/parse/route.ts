import { NextResponse } from "next/server"
import { store } from "@/lib/store"
import { requireProjectAccess } from "@/lib/api-auth"

function parseBacklog(markdown: string): { title: string; priority: "p0" | "p1" | "p2"; description: string }[] {
  const lines = markdown.split("\n")
  const tasks: { title: string; priority: "p0" | "p1" | "p2"; description: string }[] = []
  let currentPriority: "p0" | "p1" | "p2" = "p2"

  for (const line of lines) {
    const priorityMatch = line.match(/^##\s*(P[0-2])/i)
    if (priorityMatch) {
      const p = priorityMatch[1].toLowerCase()
      currentPriority = p as "p0" | "p1" | "p2"
      continue
    }

    const itemMatch = line.match(/^[-*]\s+(.+)/)
    if (itemMatch) {
      const title = itemMatch[1].trim()
      tasks.push({ title, priority: currentPriority, description: "" })
      continue
    }
  }

  return tasks
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const access = await requireProjectAccess(id)
  if (!access.ok) return access.response

  const artifacts = await store.getArtifacts(id)
  const backlog = artifacts
    .filter((a) => a.type.toLowerCase() === "backlog")
    .sort((a, b) => b.version - a.version)[0]

  if (!backlog) {
    return NextResponse.json({ error: "No backlog artifact found. Run the agents first to generate a backlog." }, { status: 400 })
  }

  const parsed = parseBacklog(backlog.content)
  if (parsed.length === 0) {
    return NextResponse.json({ error: "Could not parse any tasks from the backlog." }, { status: 400 })
  }

  const created = []
  for (const t of parsed) {
    const task = await store.createTask(id, t)
    created.push(task)
  }

  return NextResponse.json({ count: created.length, tasks: created })
}
