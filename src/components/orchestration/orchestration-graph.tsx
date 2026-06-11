"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Icon } from "@/components/ui/icon"
import { AGENTS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { ArrowDown01Icon, ArrowTurnBackwardIcon, ChatBotIcon } from "@hugeicons/core-free-icons"
import { type LiveView, type AgentNode, STATE_LABELS, VOTE_COLORS, VOTE_LABELS } from "./derive"

/**
 * Live multi-agent execution graph. Orchestrator on top, planned agents in
 * real execution order below, animated edges while work flows, revision
 * loops rendered inline, skipped agents ghosted with the planner's reason.
 */
export function OrchestrationGraph({ view }: { view: LiveView }) {
  const { nodes, skipped, revisionEdges, isLive, strategy, planSource } = view

  if (nodes.length === 0 && skipped.length === 0) {
    return (
      <div className="rounded-2xl bg-surface-inset p-6 text-center text-xs text-muted ring-hair">
        No orchestration yet — start a run and the execution graph appears here live.
      </div>
    )
  }

  // Revision loops keyed by target so they render next to the revised node.
  const loopsByTarget = new Map<string, { from: string; reason: string }[]>()
  for (const e of revisionEdges) {
    const list = loopsByTarget.get(e.to) ?? []
    list.push({ from: e.from, reason: e.reason })
    loopsByTarget.set(e.to, list)
  }

  return (
    <div className="relative">
      {strategy && (
        <p className="mb-4 text-xs leading-relaxed text-text-secondary">
          <span className="font-medium text-brand">Plan{planSource === "model" ? "" : " (default)"}: </span>
          {strategy}
        </p>
      )}

      <div className="flex flex-col items-stretch">
        {/* Orchestrator root node */}
        <OrchestratorNode live={isLive} />
        <Edge state={nodes.length > 0 ? (nodes[0].state === "waiting" ? "pending" : "done") : "pending"} flowing={isLive && nodes[0]?.active === true} />

        {nodes.map((node, i) => {
          const loops = loopsByTarget.get(node.agent) ?? []
          const next = nodes[i + 1]
          return (
            <div key={node.agent} className="flex flex-col items-stretch">
              {loops.map((loop, j) => (
                <RevisionLoop key={j} from={loop.from} to={node.agent} reason={loop.reason} />
              ))}
              <GraphNode node={node} />
              {next && (
                <Edge
                  state={next.state === "waiting" ? "pending" : "done"}
                  flowing={isLive && next.active}
                />
              )}
            </div>
          )
        })}
      </div>

      {skipped.length > 0 && (
        <div className="mt-5 flex flex-col gap-1.5 pt-4 hairline-t">
          {skipped.map((s) => {
            const agent = AGENTS[s.agent]
            return (
              <div key={s.agent} className="flex items-start gap-2.5 rounded-2xl px-3 py-2 text-xs opacity-60">
                <span
                  className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[8px] ring-1 ring-inset ring-current"
                  style={{ color: agent?.color ?? "#71717A", backgroundColor: "transparent", borderStyle: "dashed" }}
                >
                  {agent ? <Icon icon={agent.icon} size={12} /> : s.agent.slice(0, 2)}
                </span>
                <div className="min-w-0">
                  <span className="font-medium text-text-secondary">{agent?.label ?? s.agent}</span>
                  <span className="ml-2 rounded-full bg-surface-inset px-2 py-0.5 text-[10px] text-muted ring-hair">skipped</span>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{s.reason}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function OrchestratorNode({ live }: { live: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 ring-hair lift-1">
      <span className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] gradient-brand">
        <Icon icon={ChatBotIcon} size={15} className="text-white" />
        {live && (
          <span className="absolute inset-0 animate-ping rounded-[10px] bg-brand opacity-30" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>
          Orchestrator
        </div>
        <div className="text-[11px] text-muted">
          {live ? "Coordinating — routing work, watching confidence" : "Planned, routed and supervised this run"}
        </div>
      </div>
      {live && (
        <span className="flex items-center gap-1.5 rounded-full bg-brand-subtle px-2.5 py-1 text-[10px] font-medium text-brand">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
          LIVE
        </span>
      )}
    </div>
  )
}

function GraphNode({ node }: { node: AgentNode }) {
  const agent = AGENTS[node.agent]
  const color = agent?.color ?? "#E85002"
  const working = node.active
  const done = node.state === "completed"

  return (
    <motion.div
      layout
      animate={working ? { scale: 1.015 } : { scale: 1 }}
      className={cn(
        "relative flex items-center gap-3 rounded-2xl px-4 py-3 ring-hair transition-colors duration-300",
        working ? "bg-surface-2 ring-hair-strong" : done ? "bg-surface-2" : "bg-surface-inset"
      )}
      style={working ? { boxShadow: `0 0 0 1px ${color}55, 0 0 24px ${color}22` } : undefined}
    >
      <span
        className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: `${color}22`, color }}
      >
        {agent ? <Icon icon={agent.icon} size={14} /> : node.agent.slice(0, 2).toUpperCase()}
        {working && (
          <svg className="absolute -inset-1 animate-spin" style={{ animationDuration: "1.6s" }} viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke={color} strokeOpacity="0.2" strokeWidth="2" />
            <path d="M20 2 a18 18 0 0 1 12.7 5.3" stroke={color} strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className={cn("flex items-center gap-2 text-xs font-medium", done || working ? "text-text-primary" : "text-text-secondary")}>
          {agent?.label ?? node.agent}
          {node.round > 1 && (
            <span className="rounded-full bg-brand-subtle px-2 py-0.5 font-mono text-[10px] text-brand">round {node.round}</span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
          <StateDot state={node.state} color={color} />
          <span className={working ? "font-medium" : "text-muted"} style={working ? { color } : undefined}>
            {STATE_LABELS[node.state]}
            {working && <AnimatedEllipsis />}
          </span>
        </div>
        {node.reason && !done && !working && (
          <p className="mt-0.5 truncate text-[10px] text-muted" title={node.reason}>{node.reason}</p>
        )}
      </div>

      <AnimatePresence>
        {node.vote && node.vote.vote !== "abstain" && done && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium ring-hair"
            style={{ color: VOTE_COLORS[node.vote.vote], backgroundColor: `${VOTE_COLORS[node.vote.vote]}14` }}
          >
            {VOTE_LABELS[node.vote.vote]}
            {node.vote.confidence !== null && (
              <span className="font-mono opacity-80">{node.vote.confidence.toFixed(2)}</span>
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function StateDot({ state, color }: { state: string; color: string }) {
  if (state === "completed") {
    return <span className="h-1.5 w-1.5 rounded-full bg-success" />
  }
  if (state === "waiting") {
    return <span className="h-1.5 w-1.5 rounded-full bg-muted/50" />
  }
  return (
    <span className="relative flex h-1.5 w-1.5">
      <span className="absolute h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: color }} />
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
    </span>
  )
}

function AnimatedEllipsis() {
  return (
    <span className="inline-flex w-4">
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

/** Vertical connector between nodes. Animated traveling dot while work flows. */
function Edge({ state, flowing }: { state: "pending" | "done"; flowing: boolean }) {
  return (
    <div className="relative mx-auto flex h-7 w-8 items-center justify-center">
      <span
        className={cn(
          "absolute left-1/2 top-0 h-full w-px -translate-x-1/2",
          state === "done" ? "bg-brand/40" : "border-l border-dashed border-hairline"
        )}
      />
      {flowing ? (
        <motion.span
          className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-brand shadow-[0_0_8px_rgba(232,80,2,0.8)]"
          animate={{ y: [0, 22], opacity: [0, 1, 0] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : (
        state === "done" && <Icon icon={ArrowDown01Icon} size={11} className="relative z-10 bg-surface text-brand/70" />
      )}
    </div>
  )
}

/** Inline revision-loop marker: critique sent back to an earlier agent. */
function RevisionLoop({ from, to, reason }: { from: string; to: string; reason: string }) {
  const fromAgent = AGENTS[from]
  const toAgent = AGENTS[to]
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      className="mb-1.5 ml-6 flex items-start gap-2 rounded-xl border border-dashed border-brand/40 bg-brand-subtle px-3 py-2"
    >
      <Icon icon={ArrowTurnBackwardIcon} size={12} className="mt-0.5 flex-shrink-0 text-brand" />
      <div className="min-w-0 text-[11px] leading-relaxed">
        <span className="font-medium text-brand">
          {fromAgent?.label ?? from} → {toAgent?.label ?? to} · revision requested
        </span>
        <p className="mt-0.5 line-clamp-2 text-text-secondary" title={reason}>{reason}</p>
      </div>
    </motion.div>
  )
}
