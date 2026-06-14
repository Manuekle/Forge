import { NextResponse } from "next/server"
import { jobWorkerSecret, runOrchestrationJob, type OrchestrationJob } from "@/lib/queue"
import { logger } from "@/lib/logger"

// A run is minutes of sequential model calls.
export const maxDuration = 300

/**
 * Worker endpoint invoked by QStash to execute a queued orchestration run.
 * Authenticated by a shared secret forwarded by QStash (Upstash-Forward-* →
 * X-Job-Secret). Returns 2xx only after the run completes so QStash's retry
 * policy can re-drive failed runs.
 */
export async function POST(request: Request) {
  if (!jobWorkerSecret) {
    logger.error("worker.misconfigured", undefined, { detail: "JOB_WORKER_SECRET not set" })
    return NextResponse.json({ error: "Worker not configured" }, { status: 503 })
  }
  const provided = request.headers.get("x-job-secret")
  if (provided !== jobWorkerSecret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let job: OrchestrationJob
  try {
    job = (await request.json()) as OrchestrationJob
  } catch {
    return NextResponse.json({ error: "Invalid job payload" }, { status: 400 })
  }
  if (!job?.runId || !job?.projectId) {
    return NextResponse.json({ error: "Missing run/project id" }, { status: 400 })
  }

  try {
    await runOrchestrationJob(job)
    return NextResponse.json({ ok: true })
  } catch {
    // runOrchestrationJob already logged + marked the run failed.
    return NextResponse.json({ error: "Run failed" }, { status: 500 })
  }
}
