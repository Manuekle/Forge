import { NextResponse } from "next/server"
import { store, type StoredArtifact } from "@/lib/store"
import { runAgentOrchestration } from "@/lib/orchestrator"
import { requireProjectAccess } from "@/lib/api-auth"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const access = await requireProjectAccess(id)
  if (!access.ok) return access.response
  const all = await store.getRuns(id)
  return NextResponse.json(all)
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const access = await requireProjectAccess(id)
  if (!access.ok) return access.response
  const project = access.project

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

  const run = await store.createRun(id)
  // Wall-clock start on this process — run.createdAt round-trips through the DB
  // and must not be trusted for elapsed-time math.
  const startedAt = Date.now()

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

  try {
    const result = await runAgentOrchestration(
      {
        projectName: project.name,
        projectDescription: project.description,
        template: project.template,
        projectMemory,
      },
      undefined,
      (step) => store.updateRunProgress(run.id, step),
      // Persist the orchestrator's plan before any agent executes — the plan
      // and its reasoning survive even if the run later fails.
      (plan) => store.setRunPlan(run.id, plan),
      // Stream structured execution events (states, handoffs, votes,
      // checkpoints) to the run row so the UI can render the live timeline.
      (event) => store.appendRunEvent(run.id, event)
    )

    // Create a decision from the orchestration
    const decision = await store.createDecision(id, `Product analysis: ${project.name}`)
    for (const entry of result.decisions) {
      await store.addDecisionEntry(decision.id, entry.agent, entry.entry)
    }
    await store.resolveDecision(decision.id, result.consensus, result.confidence, result.votes)

    // Store artifacts
    for (const artifact of result.artifacts) {
      await store.createArtifact(id, artifact.type, artifact.title, artifact.content)
    }

    const duration = Math.floor((Date.now() - startedAt) / 1000)

    // Persist the real trace + grounded citations, and fold the orchestrator's
    // full decision log into the stored plan for traceability.
    await store.setRunPlan(run.id, { ...result.plan, log: result.orchestratorLog })
    await store.completeRun(run.id, duration, result.trace, result.citations, {
      confidence: result.confidence,
      votes: result.votes,
      consensus: result.consensus,
    })
    const progress = await store.getProjectProgress(id)
    await store.updateProject(id, {
      progress,
      status: progress >= 100 ? "in_review" : "active",
      updatedAt: new Date(),
    })

    return NextResponse.json({
      id: run.id,
      projectId: id,
      status: "completed",
      duration,
      trace: result.trace,
      citations: result.citations,
      agents: result.decisions.map((d) => ({ role: d.agent, action: d.entry })),
      decisions: result.decisions,
      artifacts: result.artifacts,
      confidence: result.confidence,
      consensus: result.consensus,
      plan: result.plan,
      votes: result.votes,
      revisions: result.revisions,
      orchestratorLog: result.orchestratorLog,
      createdAt: run.createdAt,
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    const errorTrace = [{ time: "[00:00.01]", action: "run.failed", detail: errorMessage }]
    await store.failRun(run.id, errorTrace)
    return NextResponse.json(
      { ...run, status: "failed", duration: 0, trace: errorTrace, error: errorMessage },
      { status: 500 }
    )
  }
}
