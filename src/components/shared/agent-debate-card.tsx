"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Markdown } from "@/components/ui/markdown"
import { Icon } from "@/components/ui/icon"
import { AGENTS } from "@/lib/constants"
import type { Decision } from "@/types"

interface AgentDebateCardProps {
  decision: Decision
}

export function AgentDebateCard({ decision }: AgentDebateCardProps) {
  const statusVariant =
    decision.status === "consensus" ? "consensus" : decision.status === "voting" ? "voting" : "open"

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="w-full overflow-hidden rounded-[var(--radius-card)] bg-surface-2 lift-2"
    >
      <div className="flex items-center gap-3 px-5 py-3.5">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-brand" />
          <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
        </div>
        <Badge variant={statusVariant} dot />
        <span className="ml-auto truncate text-xs text-text-secondary">{decision.topic}</span>
      </div>

      <div className="flex flex-col gap-3.5 px-5 pb-5">
        {decision.agentEntries.map((entry, i) => {
          const agent = AGENTS[entry.agent] || AGENTS.orchestrator
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              className="flex gap-3"
            >
              <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white"
                style={{ background: agent.color }}>
                <Icon icon={agent.icon} size={14} />
              </div>
              <div className="min-w-0 flex-1 text-sm leading-relaxed text-text-secondary">
                <Markdown content={entry.message} />
              </div>
            </motion.div>
          )
        })}
      </div>

      {decision.status === "consensus" && decision.consensus && (
        <div className="flex items-center gap-3 bg-brand-subtle px-5 py-4 hairline-t">
          <Badge variant="default">Consensus</Badge>
          <div className="flex-1 text-sm text-text-primary">{decision.consensus}</div>
          {decision.confidence && (
            <div className="whitespace-nowrap font-mono text-xs text-brand">
              {decision.confidence.toFixed(2)}
            </div>
          )}
        </div>
      )}
      {decision.status === "voting" && (
        <div className="flex items-center gap-2.5 bg-warning/[0.06] px-5 py-3.5 hairline-t">
          <Badge variant="voting">Voting</Badge>
          <div className="text-sm text-text-secondary">Agents are voting on this decision…</div>
        </div>
      )}
    </motion.div>
  )
}
