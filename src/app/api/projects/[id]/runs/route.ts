import { NextResponse } from "next/server"
import { store, type StoredArtifact } from "@/lib/store"
import { requireProjectAccess } from "@/lib/api-auth"
import { rateLimit } from "@/lib/rate-limit"
import { sanitizeForPrompt } from "@/lib/guard"
import { enqueueOrchestrationRun } from "@/lib/queue"
import { logger } from "@/lib/logger"

// A full orchestration is many sequential model calls (plan, agents,
// checkpoints, consensus, artifacts) — minutes of wall time, not seconds.
// 300 is the Vercel Hobby-plan ceiling; raise to 800 on Pro.
export const maxDuration = 300

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const access = await requireProjectAccess(id)
  if (!access.ok) return access.response
  const all = await store.getRuns(id)
  // This endpoint is polled every 1.5s while a run executes. Only two runs
  // ever need their heavy payload: the latest (live status + trace) and the
  // replay run the orchestration view renders (first completed with events).
  // Strip events/trace/citations from the rest — history only shows metadata.
  const replay = all.find((r) => r.status === "completed" && (r.events?.length ?? 0) > 0)
  const slim = all.map((r, i) =>
    i === 0 || r.id === replay?.id ? r : { ...r, events: [], trace: [], citations: [] }
  )
  return NextResponse.json(slim)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const access = await requireProjectAccess(id)
  if (!access.ok) return access.response
  const project = access.project

  // Orchestration runs spend real model tokens — cap per user to bound cost/abuse.
  const limited = await rateLimit(`runs:${access.userId}`, { limit: 20, windowMs: 60 * 60_000 })
  if (!limited.ok) return limited.response

  const [prevArtifacts, prevDecisions, prevRuns] = await Promise.all([
    store.getArtifacts(id),
    store.getDecisions(id),
    store.getRuns(id),
  ])

  // One orchestration at a time per project — each run costs real model tokens.
  // Runs older than 15 minutes are treated as crashed and marked failed.
  const STALE_MS = 15 * 60 * 1000
  for (const r of prevRuns.filter((r) => r.status === "running")) {
    if (Date.now() - new Date(r.createdAt).getTime() > STALE_MS) {
      await store.failRun(r.id, [{ time: "[00:00.01]", action: "run.failed", detail: "Run abandoned (server restarted or timed out)" }])
    } else {
      return NextResponse.json({ error: "A run is already in progress for this project" }, { status: 409 })
    }
  }

  // Parse optional brief from the request body. Untrusted user text — sanitize
  // before it can reach the model (prompt-injection mitigation, length bound).
  let brief: string | null = null
  try {
    const body = await request.json()
    if (typeof body.brief === "string" && body.brief.trim()) {
      brief = sanitizeForPrompt(body.brief, 8000)
    }
  } catch {
    // no body or invalid JSON — proceed without brief
  }

  const run = await store.createRun(id)

  const lines: string[] = []
  if (prevDecisions.length > 0) {
    lines.push("## Previous Decisions")
    for (const d of prevDecisions.slice(0, 5)) {
      lines.push(`- **${d.topic}** — ${d.status === "consensus" ? `Consensus: ${d.consensus ?? "—"} (confidence ${(d.confidence ?? 0).toFixed(2)})` : `Status: ${d.status}`}`)
    }
  }
  if (prevArtifacts.length > 0) {
    const latest = new Map<string, StoredArtifact>()
    for (const a of prevArtifacts) {
      if (!latest.has(a.type) || a.version > (latest.get(a.type)?.version ?? 0)) latest.set(a.type, a)
    }
    lines.push("## Existing Artifacts (latest versions)")
    for (const a of latest.values()) {
      lines.push(`- **${a.title}** (v${a.version})`)
    }
  }
  if (prevRuns.length > 0) {
    lines.push(`## Previous Runs: ${prevRuns.length} total`)
    for (const r of prevRuns.slice(0, 3)) {
      const status = r.status === "completed" ? `completed in ${r.duration ?? "?"}s` : r.status
      lines.push(`- Run #${r.id.slice(0, 6)} — ${status}`)
    }
  }
  const projectMemory = lines.join("\n")

  // Hand the run to the durable queue. With QStash configured this survives a
  // process restart (the worker endpoint re-drives it); otherwise it falls back
  // to in-process background execution. Either way the request returns at once
  // and the UI tracks progress via the run row / SSE stream.
  await enqueueOrchestrationRun({
    runId: run.id,
    projectId: id,
    projectName: project.name,
    projectDescription: project.description,
    brief,
    template: project.template,
    projectMemory,
  })

  logger.info("run.enqueued", { runId: run.id, projectId: id, userId: access.userId })
  return NextResponse.json(run, { status: 202 })
}
