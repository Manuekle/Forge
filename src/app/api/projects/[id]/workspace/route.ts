import { NextResponse } from "next/server"
import { store } from "@/lib/store"
import { requireProjectAccess } from "@/lib/api-auth"

/**
 * Single workspace payload for the project page: one auth check and one
 * round trip instead of four parallel requests that each re-authenticate
 * and re-fetch the project row.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const access = await requireProjectAccess(id)
  if (!access.ok) return access.response

  const [decisions, artifacts, runs] = await Promise.all([
    store.getDecisions(id),
    store.getArtifacts(id),
    store.getRuns(id),
  ])

  // Same slimming as GET /runs: heavy payload only for the latest run and
  // the replay run the orchestration view renders.
  const replay = runs.find((r) => r.status === "completed" && (r.events?.length ?? 0) > 0)
  const slimRuns = runs.map((r, i) =>
    i === 0 || r.id === replay?.id ? r : { ...r, events: [], trace: [], citations: [] }
  )

  return NextResponse.json({
    project: access.project,
    decisions,
    artifacts,
    runs: slimRuns,
  })
}
