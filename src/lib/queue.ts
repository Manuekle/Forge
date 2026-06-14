/**
 * Durable background-job layer for orchestration runs.
 *
 * Problem this solves: a run is minutes of sequential model calls. Executing it
 * inside the request (or even Vercel's `after()`) is fragile — a serverless
 * instance can be reclaimed mid-flight, abandoning the run. `after()` is NOT a
 * durable queue.
 *
 * Strategy:
 *   - PRODUCTION: publish the job to QStash (Upstash). QStash invokes our worker
 *     endpoint with retries and at-least-once delivery — the run survives an
 *     instance restart. Enable by setting QSTASH_TOKEN + QSTASH_WORKER_URL.
 *   - FALLBACK: when QStash isn't configured, run in-process via `after()` so the
 *     zero-config/dev path still works (with a logged warning that it's not durable).
 *
 * The actual run logic lives in `runOrchestrationJob` and is shared by both
 * paths and by the worker route.
 */
import { after } from "next/server"
import { store } from "@/lib/store"
import { runAgentOrchestration } from "@/lib/orchestrator"
import { logger } from "@/lib/logger"
import { captureException } from "@/lib/monitoring"

export type OrchestrationJob = {
  runId: string
  projectId: string
  projectName: string
  projectDescription: string
  brief: string | null
  template: string | null
  projectMemory: string
}

const qstashToken = process.env.QSTASH_TOKEN || ""
const qstashWorkerUrl = process.env.QSTASH_WORKER_URL || ""
const useQStash = !!(qstashToken && qstashWorkerUrl)

/** Shared secret the worker route requires from QStash-forwarded requests. */
export const jobWorkerSecret = process.env.JOB_WORKER_SECRET || ""

/** Enqueue an orchestration run for durable background execution. */
export async function enqueueOrchestrationRun(job: OrchestrationJob): Promise<void> {
  if (useQStash) {
    try {
      const res = await fetch(`https://qstash.upstash.io/v2/publish/${encodeURIComponent(qstashWorkerUrl)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${qstashToken}`,
          "Content-Type": "application/json",
          // QStash retries failed deliveries automatically; cap to bound cost.
          "Upstash-Retries": "2",
          // Forwarded verbatim to the worker so it can authenticate the call.
          "Upstash-Forward-X-Job-Secret": jobWorkerSecret,
        },
        body: JSON.stringify(job),
      })
      if (!res.ok) throw new Error(`QStash publish failed: ${res.status}`)
      logger.info("queue.published", { runId: job.runId, backend: "qstash" })
      return
    } catch (err) {
      // If publishing fails, fall back to in-process so the run still happens.
      logger.error("queue.publish_failed", err, { runId: job.runId })
    }
  } else {
    logger.warn("queue.fallback", { runId: job.runId, detail: "QStash not configured — using in-process after()" })
  }

  after(() => runOrchestrationJob(job))
}

/**
 * Execute an orchestration run end-to-end and persist all outputs. Idempotent
 * enough for at-least-once delivery: a run already past "running" is skipped so
 * a QStash redelivery cannot double-execute.
 */
export async function runOrchestrationJob(job: OrchestrationJob): Promise<void> {
  const startedAt = Date.now()
  try {
    const existing = await store.getRuns(job.projectId)
    const current = existing.find((r) => r.id === job.runId)
    if (current && current.status !== "running") {
      logger.warn("queue.skip_duplicate", { runId: job.runId, status: current.status })
      return
    }

    const result = await runAgentOrchestration(
      {
        projectName: job.projectName,
        projectDescription: job.projectDescription,
        brief: job.brief,
        template: job.template,
        projectMemory: job.projectMemory,
      },
      undefined,
      (step) => store.updateRunProgress(job.runId, step),
      (plan) => store.setRunPlan(job.runId, plan),
      (event) => store.appendRunEvent(job.runId, event)
    )

    const decision = await store.createDecision(job.projectId, `Product analysis: ${job.projectName}`)
    for (const entry of result.decisions) {
      await store.addDecisionEntry(decision.id, entry.agent, entry.entry)
    }
    await store.resolveDecision(decision.id, result.consensus, result.confidence, result.votes)

    for (const artifact of result.artifacts) {
      await store.createArtifact(job.projectId, artifact.type, artifact.title, artifact.content)
    }

    const duration = Math.floor((Date.now() - startedAt) / 1000)
    await store.setRunPlan(job.runId, { ...result.plan, log: result.orchestratorLog })
    await store.completeRun(job.runId, duration, result.trace, result.citations, {
      confidence: result.confidence,
      votes: result.votes,
      consensus: result.consensus,
    })
    const progress = await store.getProjectProgress(job.projectId)
    await store.updateProject(job.projectId, {
      progress,
      status: progress >= 100 ? "in_review" : "active",
      updatedAt: new Date(),
    })
    logger.info("run.completed", { runId: job.runId, projectId: job.projectId, duration, confidence: result.confidence })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    logger.error("run.failed", err, { runId: job.runId, projectId: job.projectId })
    captureException(err, { runId: job.runId, projectId: job.projectId })
    await store.failRun(job.runId, [{ time: "[00:00.01]", action: "run.failed", detail: errorMessage }])
    throw err // surface to QStash so it can retry per policy
  }
}
