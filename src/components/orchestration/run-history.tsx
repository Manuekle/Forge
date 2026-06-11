"use client"

import { motion } from "framer-motion"
import { Icon } from "@/components/ui/icon"
import { cn, formatDuration } from "@/lib/utils"
import { Layers01Icon, JusticeScale01Icon, SparklesIcon } from "@hugeicons/core-free-icons"
import type { StoredRun, StoredArtifact, StoredDecision } from "@/lib/store"

/**
 * Memory & versioning: how the project evolved run by run — what each run
 * planned, decided, and which artifact versions it produced.
 */
export function RunHistory({
  runs,
  artifacts,
  decisions,
}: {
  runs: StoredRun[]
  artifacts: StoredArtifact[]
  decisions: StoredDecision[]
}) {
  if (runs.length === 0) {
    return (
      <div className="rounded-2xl bg-surface-inset p-6 text-center text-xs text-muted ring-hair">
        Run history appears here — each run builds on the memory of previous ones.
      </div>
    )
  }

  // Oldest first: read evolution top-down.
  const ordered = [...runs].reverse()

  return (
    <div className="flex flex-col">
      {ordered.map((run, i) => {
        const runStart = new Date(run.createdAt).getTime()
        const runEnd = runStart + ((run.duration ?? 0) + 90) * 1000
        const runArtifacts = artifacts.filter((a) => {
          const t = new Date(a.createdAt).getTime()
          return t >= runStart && t <= runEnd
        })
        const runDecisions = decisions.filter((d) => {
          const t = new Date(d.createdAt).getTime()
          return t >= runStart && t <= runEnd
        })
        const last = i === ordered.length - 1
        const failed = run.status === "failed"

        return (
          <motion.div
            key={run.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="relative flex gap-4 pl-5"
          >
            {!last && <span className="absolute left-[7px] top-6 h-full w-px bg-hairline" />}
            <span
              className={cn(
                "absolute left-0 top-[9px] h-[14px] w-[14px] rounded-full ring-4 ring-surface",
                failed ? "bg-error/70" : run.status === "running" ? "animate-pulse bg-brand" : "bg-brand/70"
              )}
            />
            <div className="min-w-0 flex-1 pb-6">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-xs text-brand">Run #{run.id.slice(0, 6)}</span>
                <span className="text-[10px] text-muted">
                  {new Date(run.createdAt).toLocaleString()}
                  {run.duration ? ` · ${formatDuration(run.duration)}` : ""}
                </span>
                {failed && <span className="rounded-full bg-error/10 px-2 py-0.5 text-[10px] text-error">failed</span>}
                {run.confidence !== null && (
                  <span className="rounded-full bg-brand-subtle px-2 py-0.5 font-mono text-[10px] text-brand">
                    confidence {run.confidence.toFixed(2)}
                  </span>
                )}
              </div>

              {run.plan && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-text-secondary">
                  <Icon icon={SparklesIcon} size={10} className="mr-1 inline text-brand" />
                  Ran {run.plan.selected.map((s) => s.agent).join(" → ")}
                  {run.plan.skipped.length > 0 && (
                    <span className="text-muted"> · skipped {run.plan.skipped.map((s) => s.agent).join(", ")}</span>
                  )}
                </p>
              )}

              {(runDecisions.length > 0 || runArtifacts.length > 0) && (
                <div className="mt-2 flex flex-col gap-1">
                  {runDecisions.map((d) => (
                    <div key={d.id} className="flex items-center gap-2 text-[11px] text-text-secondary">
                      <Icon icon={JusticeScale01Icon} size={11} className="flex-shrink-0 text-muted" />
                      <span className="truncate">Decision: {d.topic}</span>
                      {d.confidence !== null && (
                        <span className="flex-shrink-0 font-mono text-[10px] text-muted">{d.confidence.toFixed(2)}</span>
                      )}
                    </div>
                  ))}
                  {runArtifacts.length > 0 && (
                    <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                      <Icon icon={Layers01Icon} size={11} className="flex-shrink-0 text-muted" />
                      <span className="truncate">
                        {runArtifacts.map((a) => `${a.type} v${a.version}`).join(" · ")}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
