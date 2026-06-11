import { NextResponse } from "next/server"
import { store } from "@/lib/store"
import { runAgentOrchestration } from "@/lib/foundry-iq"
import { requireProjectAccess } from "@/lib/api-auth"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const access = await requireProjectAccess(id)
  if (!access.ok) return access.response
  const all = store.getRuns(id)
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

  const run = store.createRun(id)

  try {
    const result = await runAgentOrchestration({
      projectName: project.name,
      projectDescription: project.description,
      template: project.template,
    })

    // Create a decision from the orchestration
    const decision = store.createDecision(id, `Product analysis: ${project.name}`)
    for (const entry of result.decisions) {
      store.addDecisionEntry(decision.id, entry.agent, entry.entry)
    }
    store.resolveDecision(decision.id, result.consensus, result.confidence)

    // Store artifacts
    for (const artifact of result.artifacts) {
      store.createArtifact(id, artifact.type, artifact.title, artifact.content)
    }

    const duration = Math.floor((Date.now() - run.createdAt.getTime()) / 1000)

    // Persist the real trace + grounded citations from the orchestration.
    store.completeRun(run.id, duration, result.trace, result.citations)
    const progress = store.getProjectProgress(id)
    store.updateProject(id, {
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
      createdAt: run.createdAt,
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    const errorTrace = [{ time: "[00:00.01]", action: "run.failed", detail: errorMessage }]
    store.completeRun(run.id, 0, errorTrace)
    return NextResponse.json(
      { ...run, status: "failed", duration: 0, trace: errorTrace, error: errorMessage },
      { status: 500 }
    )
  }
}
