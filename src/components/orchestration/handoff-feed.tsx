"use client"

import { motion } from "framer-motion"
import { AGENTS } from "@/lib/constants"
import { Icon } from "@/components/ui/icon"
import { ArrowRight02Icon, ChatBotIcon } from "@hugeicons/core-free-icons"
import type { Handoff } from "./derive"

/** Information-flow feed: who sent what to whom, when. Newest last (reads top-down like the run). */
export function HandoffFeed({ handoffs, limit }: { handoffs: Handoff[]; limit?: number }) {
  const items = limit ? handoffs.slice(-limit) : handoffs

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-surface-inset p-6 text-center text-xs text-muted ring-hair">
        Agent handoffs appear here as work flows through the team.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {items.map((h, i) => (
        <motion.div
          key={`${h.ts}-${i}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.04, 0.4) }}
          className="flex items-start gap-3 rounded-2xl bg-surface-inset px-3.5 py-2.5 ring-hair"
        >
          <div className="flex flex-shrink-0 items-center gap-1.5 pt-0.5">
            <AgentChip id={h.from} />
            <Icon icon={ArrowRight02Icon} size={12} className="text-brand" />
            <AgentChip id={h.to} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 text-xs">
              <span className="font-medium text-text-primary">{h.detail}</span>
              <span className="ml-auto flex-shrink-0 font-mono text-[10px] text-muted">{h.at}</span>
            </div>
            {h.summary && (
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted">{h.summary}</p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function AgentChip({ id }: { id: string }) {
  const agent = AGENTS[id]
  const color = agent?.color ?? "#E85002"
  return (
    <span
      className="flex h-6 w-6 items-center justify-center rounded-[8px]"
      style={{ backgroundColor: `${color}22`, color }}
      title={agent?.label ?? id}
    >
      <Icon icon={agent?.icon ?? ChatBotIcon} size={11} />
    </span>
  )
}
