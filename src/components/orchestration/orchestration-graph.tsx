"use client"

import { motion, AnimatePresence } from "framer-motion"
import { AGENTS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import {
  ArrowTurnBackwardIcon,
  RouteIcon,
} from "@hugeicons/core-free-icons"
import { Icon } from "@/components/ui/icon"
import { type LiveView, type AgentNode, STATE_LABELS, VOTE_COLORS, VOTE_LABELS } from "./derive"

const STATE_ORDER: AgentNode["state"][] = [
  "waiting",
  "reading_context",
  "reasoning",
  "reviewing",
  "revising",
  "voting",
  "completed",
]

export function OrchestrationGraph({ view }: { view: LiveView }) {
  const { nodes, skipped, revisionEdges, isLive, strategy, planSource } = view

  if (nodes.length === 0 && skipped.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-inset px-8 py-12 text-center ring-hair">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-subtle">
          <Icon icon={RouteIcon} size={20} className="text-brand" />
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">No orchestration yet</p>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-text-secondary">
            Start a run &mdash; the execution graph appears here live as agents work.
          </p>
        </div>
      </div>
    )
  }

  const loopsByTarget = new Map<string, { from: string; reason: string }[]>()
  for (const e of revisionEdges) {
    const list = loopsByTarget.get(e.to) ?? []
    list.push({ from: e.from, reason: e.reason })
    loopsByTarget.set(e.to, list)
  }

  const activeIndex = nodes.findIndex((n) => n.active)

  return (
    <div className="relative font-mono text-xs leading-relaxed">
      {strategy && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-brand-subtle px-3 py-2 text-xs leading-relaxed text-text-secondary">
          <Icon icon={RouteIcon} size={12} className="mt-0.5 flex-shrink-0 text-brand" />
          <span>
            <span className="font-medium text-brand">
              {planSource === "model" ? "Plan" : "Strategy"}
            </span>
            : {strategy}
          </span>
        </div>
      )}

      {/* Orchestrator */}
      <div className="flex items-center gap-3 py-1.5">
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full gradient-brand text-white shadow-brand">
          <Icon icon={AGENTS.orchestrator.icon} size={14} />
        </span>
        <span className="font-semibold text-text-primary">Orchestrator</span>
        {isLive ? (
          <span className="flex items-center gap-1 rounded-full bg-brand-subtle px-2 py-0.5 text-[10px] font-medium text-brand">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
            LIVE
          </span>
        ) : (
          <span className="text-[11px] text-muted">Supervised this run</span>
        )}
      </div>

      {/* Agents */}
      <div className="flex flex-col gap-px">
        {nodes.map((node, i) => {
          const loops = loopsByTarget.get(node.agent) ?? []
          const isActive = i === activeIndex
          return (
            <div key={node.agent}>
              {loops.map((loop, j) => (
                <RevisionNote key={j} from={loop.from} to={node.agent} reason={loop.reason} />
              ))}
              <AgentRow node={node} isActive={isActive} />
            </div>
          )
        })}
      </div>

      {/* Skipped agents */}
      {skipped.length > 0 && (
        <div className="mt-3 border-t border-dashed border-hairline pt-3">
          {skipped.map((s) => {
            const agent = AGENTS[s.agent]
            return (
              <div key={s.agent} className="flex items-center gap-3 py-1.5 opacity-40">
                <span
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ring-1 ring-inset ring-muted/40 text-muted"
                  style={{ backgroundColor: "transparent" }}
                >
                  {agent ? <Icon icon={agent.icon} size={13} /> : s.agent.slice(0, 2).toUpperCase()}
                </span>
                <span className="text-text-secondary">{agent?.label ?? s.agent}</span>
                <span className="rounded bg-surface-inset px-1.5 py-0.5 text-[10px] text-muted ring-hair">skipped</span>
                <span className="truncate text-[11px] text-muted">{s.reason}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AgentRow({
  node,
  isActive,
}: {
  node: AgentNode
  isActive: boolean
}) {
  const agent = AGENTS[node.agent]
  const color = agent?.color ?? "#E85002"
  const working = node.active
  const done = node.state === "completed"
  const stateIdx = STATE_ORDER.indexOf(node.state)

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-2 py-1.5 transition-all duration-300",
        working ? "ring-1 ring-inset" : "",
        !working && !done ? "opacity-70" : ""
      )}
      style={
        working
          ? {
              boxShadow: `0 0 0 1px ${color}33, 0 0 20px ${color}12`,
            }
          : done
            ? { backgroundColor: `${color}06` }
            : {}
      }
    >
      {/* Agent icon — solid circle matching /agents style */}
      <span
        className="relative z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: color }}
      >
        {agent ? <Icon icon={agent.icon} size={13} /> : node.agent.slice(0, 2).toUpperCase()}
        {working && (
          <svg className="absolute -inset-1 animate-spin" style={{ animationDuration: "1.2s" }} viewBox="0 0 40 40" fill="none">
            <path d="M20 2 a18 18 0 0 1 12.7 5.3" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        )}
      </span>

      {/* Agent name */}
      <span
        className={cn(
          "min-w-0 truncate text-[13px] font-medium",
          done || working ? "text-text-primary" : "text-text-secondary"
        )}
      >
        {agent?.label ?? node.agent}
      </span>

      {/* Round badge */}
      {node.round > 1 && (
        <span className="flex-shrink-0 rounded bg-brand-subtle px-1.5 py-0.5 font-mono text-[10px] font-medium text-brand ring-1 ring-inset ring-brand/20">
          R{node.round}
        </span>
      )}

      {/* State rail */}
      <div className="ml-auto flex items-center gap-[3px]">
        {STATE_ORDER.map((s, si) => {
          const filled = si <= stateIdx
          return (
            <span
              key={s}
              className="h-[5px] w-[5px] rounded-full transition-all duration-500"
              style={{
                backgroundColor: filled
                  ? s === "completed"
                    ? "var(--color-success)"
                    : color
                  : "var(--color-muted)",
                opacity: filled ? 1 : 0.2,
                boxShadow:
                  si === stateIdx && working
                    ? `0 0 5px ${color}aa`
                    : undefined,
                animation:
                  si === stateIdx && working
                    ? "pulse 1s ease-in-out infinite"
                    : undefined,
              }}
              title={STATE_LABELS[s]}
            />
          )
        })}
      </div>

      {/* State label */}
      <span
        className={cn(
          "flex-shrink-0 text-[11px] tabular-nums",
          working ? "font-medium" : "text-muted",
          done && "text-success"
        )}
        style={working ? { color } : undefined}
      >
        {STATE_LABELS[node.state]}
        {working && <AnimatedDots />}
      </span>

      {/* Vote badge */}
      <AnimatePresence>
        {node.vote && node.vote.vote !== "abstain" && done && (
          <motion.span
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-hair"
            style={{ color: VOTE_COLORS[node.vote.vote], backgroundColor: `${VOTE_COLORS[node.vote.vote]}14` }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: VOTE_COLORS[node.vote.vote] }} />
            {VOTE_LABELS[node.vote.vote]}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function AnimatedDots() {
  return (
    <span className="inline-flex w-3">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        >
          .
        </motion.span>
      ))}
    </span>
  )
}

function RevisionNote({
  from,
  to,
  reason,
}: {
  from: string
  to: string
  reason: string
}) {
  const fromAgent = AGENTS[from]
  const toAgent = AGENTS[to]
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-2 py-1 pl-9 text-[11px] leading-relaxed text-text-secondary"
    >
      <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-brand/15">
        <Icon icon={ArrowTurnBackwardIcon} size={9} className="text-brand" />
      </span>
      <span>
        <span className="font-medium text-brand">
          {fromAgent?.label ?? from} &rarr; {toAgent?.label ?? to}
        </span>
        <span className="text-muted"> requested revision</span>
        <p className="line-clamp-1 text-muted">{reason}</p>
      </span>
    </motion.div>
  )
}
