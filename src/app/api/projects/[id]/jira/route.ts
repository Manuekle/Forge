import { NextResponse } from "next/server"
import { store } from "@/lib/store"
import { requireProjectAccess } from "@/lib/api-auth"
import { getFirstProject, createJiraIssue, transitionJiraIssue, JiraError } from "@/lib/jira"

const STATUS_MAP: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const access = await requireProjectAccess(id)
  if (!access.ok) return access.response

  const config = await store.getUserJiraConfig(access.userId)
  if (!config) {
    return NextResponse.json({ error: "Jira is not configured. Add your domain, email and API token in Settings → Jira Integration." }, { status: 400 })
  }

  const tasks = await store.getTasks(id)
  if (tasks.length === 0) {
    return NextResponse.json({ error: "No tasks on the board to export." }, { status: 400 })
  }

  try {
    const project = await getFirstProject(config.domain, config.email, config.token)

    let issuesCreated = 0
    for (const task of tasks) {
      const labels = [task.priority === "p0" ? "priority-critical" : task.priority === "p1" ? "priority-high" : "priority-medium"]
      const body = [
        task.description || "",
        `Story points: ${task.storyPoints || "?"}`,
        `Exported from Forge — ${access.project.name}`,
      ].filter(Boolean).join("\n\n")

      const issue = await createJiraIssue(config.token, config.domain, config.email, project.key, task.title, body, labels)
      const targetStatus = STATUS_MAP[task.status]
      if (targetStatus && targetStatus !== "To Do") {
        await transitionJiraIssue(config.token, config.domain, config.email, issue.key, targetStatus).catch(() => false)
      }
      issuesCreated++
    }

    return NextResponse.json({
      project: project.key,
      issuesCreated,
      message: `Created ${issuesCreated} issues in Jira project ${project.key}.`,
    })
  } catch (err) {
    if (err instanceof JiraError) {
      return NextResponse.json({ error: `Jira error: ${err.message}` }, { status: err.status })
    }
    console.error("Jira export error:", err)
    return NextResponse.json({ error: "Failed to export to Jira" }, { status: 500 })
  }
}
