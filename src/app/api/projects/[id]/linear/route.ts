import { NextResponse } from "next/server"
import { store } from "@/lib/store"
import { requireProjectAccess } from "@/lib/api-auth"
import { getFirstTeam, createLinearIssue, LinearError } from "@/lib/linear"

const STATUS_MAP: Record<string, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
}

const PRIORITY_MAP: Record<string, number> = {
  p0: 1,
  p1: 2,
  p2: 3,
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const access = await requireProjectAccess(id)
  if (!access.ok) return access.response

  const token = await store.getUserLinearToken(access.userId)
  if (!token) {
    return NextResponse.json({ error: "Linear is not configured. Add your API key in Settings → Linear Integration." }, { status: 400 })
  }

  const tasks = await store.getTasks(id)
  if (tasks.length === 0) {
    return NextResponse.json({ error: "No tasks on the board to export." }, { status: 400 })
  }

  try {
    const team = await getFirstTeam(token)
    const statesByName = new Map(team.states.nodes.map((s) => [s.name.toLowerCase(), s.id]))

    let issuesCreated = 0
    for (const task of tasks) {
      const description = [
        task.description || "",
        `Story points: ${task.storyPoints || "?"}`,
        `Exported from Forge — ${access.project.name}`,
      ].filter(Boolean).join("\n\n")

      const stateId = statesByName.get((STATUS_MAP[task.status] || "").toLowerCase())
      await createLinearIssue(token, team.id, task.title, description, {
        stateId,
        priority: PRIORITY_MAP[task.priority],
      })
      issuesCreated++
    }

    return NextResponse.json({
      team: team.name,
      issuesCreated,
      message: `Created ${issuesCreated} issues in Linear team ${team.name}.`,
    })
  } catch (err) {
    if (err instanceof LinearError) {
      return NextResponse.json({ error: `Linear error: ${err.message}` }, { status: err.status })
    }
    console.error("Linear export error:", err)
    return NextResponse.json({ error: "Failed to export to Linear" }, { status: 500 })
  }
}
