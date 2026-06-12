"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import {
  AiContentGenerator01Icon, AiIdeaIcon, AiCloud02Icon, AiScanIcon, AiFolder01Icon, AiSearch02Icon,
  AlgorithmIcon, Tick01Icon,
} from "@hugeicons/core-free-icons"
import { Icon } from "@/components/ui/icon"

const SIM_AGENTS = [
  { key: "pm", label: "PM", color: "#F97316", icon: AiContentGenerator01Icon },
  { key: "ux", label: "UX", color: "#FB923C", icon: AiIdeaIcon },
  { key: "ar", label: "AR", color: "#FCD34D", icon: AiCloud02Icon },
  { key: "qa", label: "QA", color: "#A78BFA", icon: AiScanIcon },
  { key: "sc", label: "SC", color: "#2ED47A", icon: AiFolder01Icon },
  { key: "ba", label: "BA", color: "#4A9FF9", icon: AiSearch02Icon },
]

// Agent nodes on a perfect circle around the orchestrator (60° apart,
// starting at 12 o'clock). x/y are percentages of the canvas.
const RADIUS = { x: 34, y: 38 }
const POSITIONS = Array.from({ length: 6 }, (_, i) => {
  const angle = (-90 + i * 60) * (Math.PI / 180)
  return {
    x: +(50 + RADIUS.x * Math.cos(angle)).toFixed(2),
    y: +(50 + RADIUS.y * Math.sin(angle)).toFixed(2),
  }
})

const CENTER = { x: 50, y: 50 }

// Stages: 0 init · 1 retrieve · 2–7 agent i thinking · 8 debate · 9 votes ·
// 10 consensus · 11 artifacts · 12 hold (then loop)
const STAGE_DURATIONS = [1000, 1000, 1150, 1150, 1150, 1150, 1150, 1150, 2200, 1500, 2000, 1800, 4200]

const FEED: { action: string; detail: string }[] = [
  { action: "iq.intent.parse", detail: "marketplace / food / p2p" },
  { action: "iq.knowledge.retrieve", detail: "3 sources · grounded" },
  { action: "pm.analyze", detail: "PRD scope: checkout" },
  { action: "ux.flows", detail: "guest checkout journey" },
  { action: "architect.validate", detail: "schema: payments" },
  { action: "qa.scan", detail: "3 risks found" },
  { action: "scrum.plan", detail: "2 sprints · 21 pts" },
  { action: "business.case", detail: "LTV/CAC ratio 3.4" },
  { action: "debate.open", detail: "buyer authentication" },
  { action: "vote.tally", detail: "5 yes · 1 revise" },
  { action: "consensus.emit", detail: "confidence 0.87" },
  { action: "artifacts.write", detail: "7 files · versioned" },
]

const ARTIFACTS = ["PRD", "Backlog", "Architecture", "Roadmap"]

const STAGE_LABEL: Record<number, string> = {
  0: "Parsing intent",
  1: "Retrieving knowledge",
  2: "PM analyzing", 3: "UX mapping flows", 4: "Architect validating",
  5: "QA scanning risks", 6: "Scrum planning", 7: "Business modeling",
  8: "Agents debating",
  9: "Voting",
  10: "Consensus reached",
  11: "Writing artifacts",
  12: "Run complete",
}

function agentState(stage: number, i: number): "idle" | "thinking" | "done" {
  if (stage < i + 2) return "idle"
  if (stage === i + 2) return "thinking"
  return "done"
}

function useConfidence(active: boolean, reduced: boolean) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!active) { setValue(0); return }
    if (reduced) { setValue(0.87); return }
    const start = performance.now()
    let raf: number
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 900)
      setValue(Math.round(87 * (1 - Math.pow(1 - p, 3))) / 100)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, reduced])
  return value
}

export function LiveOrchestration() {
  const reduced = useReducedMotion() ?? false
  const [stage, setStage] = useState(reduced ? 12 : 0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (reduced) return
    timer.current = setTimeout(() => {
      setStage((s) => (s >= 12 ? 0 : s + 1))
    }, STAGE_DURATIONS[stage])
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [stage, reduced])

  const confidence = useConfidence(stage >= 10, reduced)
  const visibleFeed = FEED.slice(0, Math.min(stage + 1, FEED.length)).slice(-5)
  const orchestratorBusy = stage < 12

  return (
    <div className="neon-card w-full overflow-hidden rounded-[var(--radius-card)] glass">
      {/* Window chrome */}
      <div className="flex items-center gap-3 bg-hover px-6 py-4">
        <div className="flex gap-1.5" aria-hidden="true">
          <div className="h-2.5 w-2.5 rounded-full bg-brand" />
          <div className="h-2.5 w-2.5 rounded-full bg-text-primary/15" />
          <div className="h-2.5 w-2.5 rounded-full bg-text-primary/15" />
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-brand-subtle px-2.5 py-0.5 text-[10px] font-medium text-brand ring-hair">
          {orchestratorBusy && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />}
          {orchestratorBusy ? "live run" : "run complete"}
        </div>
        <AnimatePresence mode="wait">
          <motion.span
            key={STAGE_LABEL[stage]}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="ml-auto truncate text-xs text-text-secondary"
            aria-live="polite"
          >
            {STAGE_LABEL[stage]}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.35fr_1fr]">
        {/* Graph */}
        <div className="relative h-[340px] sm:h-[420px]">
          <div
            className="absolute inset-0"
            aria-hidden="true"
            style={{ background: "radial-gradient(45% 45% at 50% 50%, rgba(232,80,2,0.10) 0%, transparent 70%)" }}
          />
          {/* Edges */}
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {/* Circular guide ring */}
            <ellipse
              cx="50" cy="50" rx={RADIUS.x} ry={RADIUS.y}
              fill="none"
              stroke="var(--color-hairline-strong)"
              strokeWidth="0.35"
              strokeDasharray="1.2 2"
              vectorEffect="non-scaling-stroke"
            />
            {POSITIONS.map((p, i) => {
              const state = agentState(stage, i)
              return (
                <g key={i}>
                  <line
                    x1={CENTER.x} y1={CENTER.y} x2={p.x} y2={p.y}
                    stroke={state === "idle" ? "var(--color-hairline-strong)" : SIM_AGENTS[i].color}
                    strokeOpacity={state === "idle" ? 1 : 0.45}
                    strokeWidth="0.45"
                    vectorEffect="non-scaling-stroke"
                  />
                  {state === "thinking" && !reduced && (
                    <motion.circle
                      r="1.1"
                      fill={SIM_AGENTS[i].color}
                      initial={{ cx: CENTER.x, cy: CENTER.y, opacity: 0 }}
                      animate={{ cx: [CENTER.x, p.x], cy: [CENTER.y, p.y], opacity: [0, 1, 1, 0] }}
                      transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
                </g>
              )
            })}
          </svg>

          {/* Orchestrator */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full icon-chip text-white">
              {orchestratorBusy && !reduced && (
                <span className="absolute inset-0 animate-ping rounded-full bg-brand opacity-20" />
              )}
              <Icon icon={AlgorithmIcon} size={26} />
            </div>
          </div>

          {/* Agent nodes */}
          {SIM_AGENTS.map((a, i) => {
            const state = agentState(stage, i)
            return (
              <div
                key={a.key}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${POSITIONS[i].x}%`, top: `${POSITIONS[i].y}%` }}
              >
                <motion.div
                  animate={{
                    scale: state === "thinking" ? 1.12 : 1,
                    opacity: state === "idle" ? 0.45 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  className="relative flex h-12 w-12 items-center justify-center rounded-full text-white transition-shadow duration-700 sm:h-[52px] sm:w-[52px]"
                  style={{
                    background: a.color,
                    // thinking: tight focus glow · voted: soft wide halo (no badge)
                    boxShadow: state === "thinking"
                      ? `0 0 0 6px ${a.color}26, 0 0 28px ${a.color}66, 0 8px 20px -4px ${a.color}80`
                      : state === "done" && stage >= 9
                        ? `0 0 0 4px ${a.color}1f, 0 0 22px ${a.color}66, 0 0 44px ${a.color}33`
                        : "0 4px 12px -2px rgba(0,0,0,0.25)",
                  }}
                >
                  <Icon icon={a.icon} size={19} />
                </motion.div>
              </div>
            )
          })}
        </div>

        {/* Trace feed */}
        <div className="flex flex-col justify-between bg-surface-inset/60 p-5 shadow-[inset_0_1px_0_var(--color-hairline)] md:shadow-[inset_1px_0_0_var(--color-hairline)]">
          <div className="flex min-h-[170px] flex-col justify-end gap-1.5 font-mono text-[11px]" aria-hidden="true">
            <AnimatePresence initial={false}>
              {visibleFeed.map((f) => (
                <motion.div
                  key={f.action}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex gap-2.5 border-l border-hairline py-0.5 pl-3"
                >
                  <span className="flex-shrink-0 text-brand">{f.action}</span>
                  <span className="truncate text-muted">{f.detail}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Consensus + artifacts — fixed height so the loop never reflows */}
          <div className="mt-4 min-h-[92px] space-y-3">
            <AnimatePresence>
              {stage >= 10 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2.5 rounded-2xl bg-brand-subtle px-3.5 py-2.5 ring-hair"
                >
                  <span className="rounded-full bg-brand px-2 py-0.5 text-[9px] font-semibold text-white">Consensus</span>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-text-primary">Auth required · one-tap OAuth at checkout</span>
                  <span className="font-mono text-[11px] font-semibold tabular-nums text-brand">{confidence.toFixed(2)}</span>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex flex-wrap gap-1.5">
              {ARTIFACTS.map((label, i) => (
                <AnimatePresence key={label}>
                  {stage >= 11 && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: reduced ? 0 : i * 0.12, type: "spring", stiffness: 400, damping: 24 }}
                      className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-[10px] font-medium text-text-secondary ring-hair"
                    >
                      <Icon icon={Tick01Icon} size={9} className="text-success" />
                      {label} v1
                    </motion.span>
                  )}
                </AnimatePresence>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
