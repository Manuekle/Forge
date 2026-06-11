"use client"

import { motion } from "framer-motion"
import { AGENTS } from "@/lib/constants"
import type { RunEvent } from "@/lib/store"

const KIND_COLORS: Record<string, string> = {
  retrieval: "#4A9FF9",
  plan: "#E85002",
  handoff: "#71717A",
  agent_state: "#A1A1AA",
  vote: "#FCD34D",
  checkpoint: "#E85002",
  consensus: "#2ED47A",
  artifact: "#A78BFA",
  complete: "#2ED47A",
}

const KIND_LABELS: Record<string, string> = {
  retrieval: "knowledge",
  plan: "plan",
  handoff: "handoff",
  agent_state: "agent",
  vote: "vote",
  checkpoint: "orchestrator",
  consensus: "consensus",
  artifact: "artifact",
  complete: "complete",
}

/**
 * Process-event timeline: started, read context, generated, voted, consensus.
 * Process visibility only — no chain of thought is exposed.
 */
export function RunTimeline({ events, compact }: { events: RunEvent[]; compact?: boolean }) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl bg-surface-inset p-6 text-center text-xs text-muted ring-hair">
        Reasoning process events appear here during a run.
      </div>
    )
  }

  const items = compact ? events.filter((e) => e.kind !== "agent_state" || e.state !== "voting") : events

  return (
    <div className="flex flex-col">
      {items.map((e, i) => {
        const color = KIND_COLORS[e.kind] ?? "#71717A"
        const agent = e.agent && e.agent !== "orchestrator" ? AGENTS[e.agent] : null
        const last = i === items.length - 1
        return (
          <motion.div
            key={`${e.ts}-${i}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: Math.min(i * 0.02, 0.4) }}
            className="relative flex gap-3 pl-4"
          >
            {!last && <span className="absolute left-[5px] top-4 h-full w-px bg-hairline" />}
            <span
              className="absolute left-0 top-[7px] h-[10px] w-[10px] rounded-full ring-2 ring-surface"
              style={{ backgroundColor: color }}
            />
            <div className="flex min-w-0 flex-1 items-baseline gap-2.5 pb-3 text-xs">
              <span className="w-[64px] flex-shrink-0 font-mono text-[10px] text-brand">{e.at}</span>
              <span
                className="flex-shrink-0 rounded-full px-2 py-px font-mono text-[9px]"
                style={{ color, backgroundColor: `${color}14` }}
              >
                {agent?.label ?? KIND_LABELS[e.kind] ?? e.kind}
              </span>
              <span className="min-w-0 text-text-secondary">
                {e.detail}
                {e.summary && !compact && (
                  <span className="block truncate text-[10px] text-muted" title={e.summary}>{e.summary}</span>
                )}
              </span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
