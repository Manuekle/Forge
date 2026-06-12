"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import {
  AiContentGenerator01Icon, AiIdeaIcon, AiCloud02Icon, AiScanIcon, AiFolder01Icon, AiSearch02Icon,
  Tick01Icon, PencilEdit01Icon, GlobeIcon,
} from "@hugeicons/core-free-icons"
import { Icon } from "@/components/ui/icon"

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
}

const MINI_AGENTS = [
  { label: "PM", color: "#F97316", icon: AiContentGenerator01Icon, thought: "Scope: checkout v1" },
  { label: "UX", color: "#FB923C", icon: AiIdeaIcon, thought: "Flow: 3-step guest" },
  { label: "AR", color: "#FCD34D", icon: AiCloud02Icon, thought: "API: REST + queue" },
  { label: "QA", color: "#A78BFA", icon: AiScanIcon, thought: "Risk: refund fraud" },
  { label: "SC", color: "#2ED47A", icon: AiFolder01Icon, thought: "Plan: 2 sprints" },
  { label: "BA", color: "#4A9FF9", icon: AiSearch02Icon, thought: "LTV/CAC: 3.4" },
]

/** Step 01 (tall bento) — idea gets typed, classified, sources retrieved. */
function IdeaSim() {
  const reduced = useReducedMotion()
  const full = "A P2P marketplace for homemade food in my city…"
  const [len, setLen] = useState(reduced ? full.length + 40 : 0)

  useEffect(() => {
    if (reduced) return
    const t = setInterval(() => {
      setLen((l) => (l >= full.length + 55 ? 0 : l + 1)) // +55 ≈ hold while chips show
    }, 70)
    return () => clearInterval(t)
  }, [reduced, full.length])

  const shown = full.slice(0, Math.min(len, full.length))
  const typed = len >= full.length
  const sources = ["Marketplace UX patterns", "P2P payment compliance", "Food-delivery unit economics"]

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-surface p-4 ring-hair lift-1">
        <div className="mb-2 text-[10px] font-medium text-muted">Describe your idea</div>
        <div className="flex min-h-[44px] items-start rounded-xl bg-surface-inset px-3 py-2.5 ring-hair">
          <span className="font-mono text-[11px] leading-relaxed text-text-secondary">
            {shown}
            {!reduced && <span className="ml-px inline-block h-3 w-[5px] translate-y-[2px] animate-pulse bg-brand" />}
          </span>
        </div>
      </div>
      <AnimatePresence>
        {typed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <span className="rounded-full bg-brand-subtle px-2.5 py-1 text-[10px] font-semibold text-brand ring-hair">marketplace</span>
            <span className="rounded-full bg-brand-subtle px-2.5 py-1 text-[10px] font-semibold text-brand ring-hair">p2p</span>
            <span className="rounded-full bg-brand-subtle px-2.5 py-1 text-[10px] font-semibold text-brand ring-hair">food</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-col gap-1.5">
        {sources.map((s, i) => (
          <AnimatePresence key={s}>
            {typed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: reduced ? 0 : 0.25 + i * 0.2 }}
                className="flex items-center gap-2.5 rounded-xl bg-surface-inset px-3 py-2 ring-hair"
              >
                <Icon icon={GlobeIcon} size={11} className="flex-shrink-0 text-brand" />
                <span className="truncate text-[11px] text-text-secondary">{s}</span>
                <span className="ml-auto rounded-full bg-success/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-success">grounded</span>
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>
    </div>
  )
}

/**
 * Step 02 (wide bento) — six agents working in parallel on a curved arc.
 * One requestAnimationFrame clock drives everything (comet, progress rings,
 * thought chips, checks) so every element stays in perfect sync.
 */
const ARC = { w: 600, h: 160, path: "M 30 125 C 170 30 430 30 570 125" }
// Points on the cubic bezier at t = i/5 — pronounced curve, clearly non-linear.
const ARC_POINTS = Array.from({ length: 6 }, (_, i) => {
  const t = i / 5
  const u = 1 - t
  const x = u ** 3 * 30 + 3 * u * u * t * 170 + 3 * u * t * t * 430 + t ** 3 * 570
  const y = u ** 3 * 125 + 3 * u * u * t * 30 + 3 * u * t * t * 30 + t ** 3 * 125
  return { x, y }
})
const LOOP_MS = 8500
// Per-agent work window inside the loop (parallel, lightly staggered).
const WORK = ARC_POINTS.map((_, i) => ({ start: 0.05 + i * 0.1, dur: 0.3 }))

function agentProgress(p: number, i: number): number {
  return Math.min(1, Math.max(0, (p - WORK[i].start) / WORK[i].dur))
}

function AgentsSim() {
  const reduced = useReducedMotion()
  const [p, setP] = useState(reduced ? 0.95 : 0)

  useEffect(() => {
    if (reduced) return
    let raf: number
    const start = performance.now()
    const tick = (now: number) => {
      setP(((now - start) % LOOP_MS) / LOOP_MS)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced])

  const RING_R = 23
  const RING_C = 2 * Math.PI * RING_R

  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface px-4 pb-4 pt-14 ring-hair lift-1">
      <div className="bg-grid-soft absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="relative mx-auto aspect-[600/160] w-full max-w-[640px]" aria-hidden="true">
        {/* Arc + comet */}
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${ARC.w} ${ARC.h}`} preserveAspectRatio="xMidYMid meet">
          <path d={ARC.path} fill="none" stroke="var(--color-hairline-strong)" strokeWidth="1.5" strokeDasharray="3 6" />
          {!reduced && (() => {
            // The comet makes ONE pass per loop and reaches agent i exactly
            // when its work window opens — same clock, perfect sync.
            const f = Math.min(1, Math.max(0, (p - WORK[0].start) / (WORK[5].start - WORK[0].start)))
            const center = 0.035 + f * 0.895
            const visible = p > WORK[0].start - 0.02 && p < WORK[5].start + 0.07
            return (
              <path
                d={ARC.path}
                fill="none"
                stroke="#E85002"
                strokeWidth="2.5"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray="0.07 0.93"
                strokeDashoffset={-(center - 0.035)}
                style={{
                  filter: "drop-shadow(0 0 6px rgba(232,80,2,0.9))",
                  opacity: visible ? 1 : 0,
                  transition: "opacity 0.5s ease",
                }}
              />
            )
          })()}
        </svg>

        {MINI_AGENTS.map((a, i) => {
          const prog = agentProgress(p, i)
          const working = prog > 0 && prog < 1
          const done = prog >= 1
          const pos = ARC_POINTS[i]
          const chipTier = i % 2 === 0 ? 40 : 58 // alternate heights so neighbors never collide
          return (
            <div
              key={a.label}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(pos.x / ARC.w) * 100}%`, top: `${(pos.y / ARC.h) * 100}%` }}
            >
              {/* Progress ring — driven by the shared clock */}
              <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" width="54" height="54" viewBox="0 0 54 54">
                <circle cx="27" cy="27" r={RING_R} fill="none" stroke="var(--color-hairline)" strokeWidth="2" />
                <circle
                  cx="27" cy="27" r={RING_R}
                  fill="none"
                  stroke={a.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={RING_C * (1 - prog)}
                  transform="rotate(-90 27 27)"
                  style={working ? { filter: `drop-shadow(0 0 4px ${a.color})` } : undefined}
                />
              </svg>
              <motion.span
                animate={{ scale: working ? 1.12 : 1, opacity: working || done ? 1 : 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-white transition-shadow duration-700"
                style={{
                  background: a.color,
                  // working: tight focus glow · done: soft wide halo (no badge)
                  boxShadow: working
                    ? `0 0 12px ${a.color}80, 0 3px 10px -2px rgba(0,0,0,0.3)`
                    : done
                      ? `0 0 0 3px ${a.color}1f, 0 0 18px ${a.color}66, 0 0 36px ${a.color}33`
                      : "0 3px 10px -2px rgba(0,0,0,0.3)",
                }}
              >
                <Icon icon={a.icon} size={14} />
              </motion.span>
              {/* Thought chip while working */}
              <AnimatePresence>
                {working && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 26 }}
                    className="absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-surface-3 px-2.5 py-1 font-mono text-[9px] text-text-primary ring-hair lift-2"
                    style={{ bottom: chipTier, boxShadow: `0 0 16px ${a.color}40` }}
                  >
                    {a.thought}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Step 03 — debate bubbles + confidence bar filling. */
function ConsensusSim() {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-surface p-3.5 ring-hair lift-1">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-white" style={{ background: "#F97316" }}>
          <Icon icon={AiContentGenerator01Icon} size={10} />
        </span>
        <span className="rounded-xl rounded-tl-sm bg-surface-inset px-2.5 py-1 text-[10px] text-text-secondary ring-hair">Auth is required for order history.</span>
      </div>
      <div className="flex items-center justify-end gap-2">
        <span className="rounded-xl rounded-tr-sm bg-brand-subtle px-2.5 py-1 text-[10px] text-text-secondary ring-hair">That doubles flow complexity.</span>
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-white" style={{ background: "#FCD34D" }}>
          <Icon icon={AiCloud02Icon} size={10} />
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-[9px] font-medium uppercase tracking-wide text-muted">Confidence</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-inset">
          <div className="bar-fill h-full rounded-full gradient-brand-soft" style={{ boxShadow: "0 0 10px rgba(232,80,2,0.7)" }} />
        </div>
        <span className="font-mono text-[10px] text-brand">0.87</span>
      </div>
    </div>
  )
}

/** Step 04 — artifact rows with cycling status pills. */
function ArtifactsSim() {
  const reduced = useReducedMotion()
  const rows = ["PRD", "Backlog", "Architecture"]
  const [tick, setTick] = useState(reduced ? 99 : 0)

  useEffect(() => {
    if (reduced) return
    const t = setInterval(() => setTick((v) => (v + 1) % 10), 700)
    return () => clearInterval(t)
  }, [reduced])

  function status(i: number): "queued" | "writing" | "ready" {
    const local = tick - i * 2
    if (tick >= 9) return "queued"
    if (local < 1) return "queued"
    if (local < 3) return "writing"
    return "ready"
  }

  const pill = {
    queued: { text: "Queued", cls: "bg-surface-inset text-muted" },
    writing: { text: "Writing…", cls: "bg-brand-subtle text-brand" },
    ready: { text: "Ready", cls: "bg-success/15 text-success" },
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-2xl bg-surface p-3.5 ring-hair lift-1">
      {rows.map((r, i) => {
        const s = reduced ? "ready" : status(i)
        return (
          <div key={r} className="flex items-center gap-2.5 rounded-xl bg-surface-inset px-3 py-1.5 ring-hair">
            <Icon icon={s === "writing" ? PencilEdit01Icon : Tick01Icon} size={11} className={s === "ready" ? "text-success" : "text-muted"} />
            <span className="text-[11px] font-medium text-text-secondary">{r}</span>
            <span className={`ml-auto rounded-full px-2 py-0.5 text-[9px] font-semibold ${pill[s].cls}`}>
              {pill[s].text}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function StepHeader({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full icon-chip text-[10px] font-bold text-white">
          {num}
        </span>
        <h3 className="text-[15px] font-semibold text-text-primary">{title}</h3>
      </div>
      <p className="text-sm leading-relaxed text-text-secondary">{desc}</p>
    </div>
  )
}

function BentoCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4 }}
      className={`neon-card group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-surface-2 ring-hair lift-1 transition-all duration-300 hover:lift-2 ${className ?? ""}`}
    >
      <div className="halo-warm pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative flex flex-1 flex-col p-6">{children}</div>
    </motion.div>
  )
}

/** Asymmetric bento: 01 spans full height · 02 spans full width · 03 + 04 share the row. */
export function WorkflowCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-[auto_auto]">
      <BentoCard className="sm:col-span-2 lg:col-span-1 lg:row-span-2">
        <div className="mb-6 flex-1">
          <IdeaSim />
        </div>
        <StepHeader
          num="01"
          title="Describe your idea"
          desc="One sentence is enough. Foundry IQ classifies it and retrieves grounded domain knowledge before any agent reasons."
        />
      </BentoCard>

      <BentoCard className="sm:col-span-2 lg:col-span-2">
        <div className="mb-6">
          <AgentsSim />
        </div>
        <StepHeader
          num="02"
          title="Agents reason in parallel"
          desc="PM, UX, Architect, QA, Scrum and Business analyze from their own discipline — each emits its findings to the orchestrator."
        />
      </BentoCard>

      <BentoCard>
        <div className="mb-6 flex flex-1 flex-col justify-center">
          <ConsensusSim />
        </div>
        <StepHeader
          num="03"
          title="They debate to consensus"
          desc="Conflicts are voted on. The Orchestrator emits a scored consensus."
        />
      </BentoCard>

      <BentoCard>
        <div className="mb-6 flex flex-1 flex-col justify-center">
          <ArtifactsSim />
        </div>
        <StepHeader
          num="04"
          title="Export everything"
          desc="PRD, backlog, architecture, roadmap — versioned and traceable."
        />
      </BentoCard>
    </div>
  )
}
