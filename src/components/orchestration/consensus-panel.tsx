"use client"

import { motion } from "framer-motion"
import { AGENTS } from "@/lib/constants"
import { Icon } from "@/components/ui/icon"
import { VOTE_COLORS, VOTE_LABELS } from "./derive"
import type { DecisionVote } from "@/lib/store"

/**
 * Vote breakdown + confidence gauge. Confidence is derived from the actual
 * vote tally on the server — this just makes the arithmetic visible.
 */
export function ConsensusPanel({
  votes,
  confidence,
  consensus,
}: {
  votes: Record<string, DecisionVote>
  confidence: number | null
  consensus: string | null
}) {
  const entries = Object.entries(votes)
  if (entries.length === 0 && confidence === null) {
    return (
      <div className="rounded-2xl bg-surface-inset p-6 text-center text-xs text-muted ring-hair">
        Votes appear here as each agent casts theirs.
      </div>
    )
  }

  const counts = { approve: 0, approve_with_concerns: 0, reject: 0, abstain: 0 }
  for (const [, v] of entries) counts[v.vote as keyof typeof counts] = (counts[v.vote as keyof typeof counts] ?? 0) + 1
  const cast = entries.filter(([, v]) => v.vote !== "abstain").length

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      {/* Gauge */}
      <div className="flex flex-shrink-0 flex-col items-center gap-1 sm:w-[148px]">
        <ConfidenceGauge value={confidence} />
        <div className="text-[10px] text-muted">
          {cast > 0 ? `derived from ${cast} vote${cast === 1 ? "" : "s"}` : "team confidence"}
        </div>
      </div>

      {/* Votes */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1.5">
          {entries.map(([agentId, v], i) => {
            const agent = AGENTS[agentId]
            const color = VOTE_COLORS[v.vote] ?? "#71717A"
            return (
              <motion.div
                key={agentId}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-2.5 rounded-xl bg-surface-inset px-3 py-2 ring-hair"
              >
                <span
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[7px]"
                  style={{ backgroundColor: `${agent?.color ?? "#E85002"}22`, color: agent?.color ?? "#E85002" }}
                >
                  {agent ? <Icon icon={agent.icon} size={10} /> : agentId.slice(0, 2)}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-text-secondary" title={v.concerns || undefined}>
                  <span className="font-medium text-text-primary">{agent?.label ?? agentId}</span>
                  {v.concerns && <span className="ml-2 hidden text-[11px] text-muted lg:inline">— {v.concerns.slice(0, 64)}{v.concerns.length > 64 ? "…" : ""}</span>}
                </span>
                <span
                  className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ color, backgroundColor: `${color}14` }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                  {VOTE_LABELS[v.vote] ?? v.vote}
                  {v.confidence !== null && <span className="font-mono opacity-75">{v.confidence.toFixed(2)}</span>}
                </span>
              </motion.div>
            )
          })}
        </div>

        {/* Agreement bar */}
        {cast > 0 && (
          <div className="mt-3">
            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-inset ring-hair">
              {(["approve", "approve_with_concerns", "reject"] as const).map((k) =>
                counts[k] > 0 ? (
                  <motion.span
                    key={k}
                    initial={{ width: 0 }}
                    animate={{ width: `${(counts[k] / cast) * 100}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{ backgroundColor: VOTE_COLORS[k] }}
                  />
                ) : null
              )}
            </div>
            <div className="mt-1.5 flex gap-3 text-[10px] text-muted">
              {(["approve", "approve_with_concerns", "reject"] as const).map((k) =>
                counts[k] > 0 ? (
                  <span key={k} className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: VOTE_COLORS[k] }} />
                    {counts[k]} {VOTE_LABELS[k].toLowerCase()}
                  </span>
                ) : null
              )}
            </div>
          </div>
        )}

        {consensus && (
          <p className="mt-3 rounded-2xl bg-brand-subtle p-3.5 text-xs leading-relaxed text-text-secondary">
            <span className="font-medium text-brand">Consensus: </span>
            {consensus}
          </p>
        )}
      </div>
    </div>
  )
}

function ConfidenceGauge({ value }: { value: number | null }) {
  const pct = value !== null ? Math.round(value * 100) : null
  const sweep = 240 // degrees of arc
  const r = 54
  const c = 2 * Math.PI * r
  const arcLen = (sweep / 360) * c
  const filled = value !== null ? arcLen * value : 0
  const color = value === null ? "#71717A" : value >= 0.75 ? "#2ED47A" : value >= 0.55 ? "#FCD34D" : "#F87171"

  return (
    <div className="relative h-[120px] w-[132px]">
      <svg viewBox="0 0 132 120" className="h-full w-full">
        <g transform="rotate(150 66 64)">
          <circle
            cx="66" cy="64" r={r} fill="none"
            stroke="currentColor" strokeOpacity="0.1" strokeWidth="9" strokeLinecap="round"
            strokeDasharray={`${arcLen} ${c}`}
            className="text-text-primary"
          />
          {value !== null && (
            <motion.circle
              cx="66" cy="64" r={r} fill="none"
              stroke={color} strokeWidth="9" strokeLinecap="round"
              initial={{ strokeDasharray: `0 ${c}` }}
              animate={{ strokeDasharray: `${filled} ${c}` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
            />
          )}
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
        <span className="font-mono text-2xl font-semibold tabular-nums text-text-primary">
          {pct !== null ? `${pct}%` : "—"}
        </span>
        <span className="text-[10px] text-muted">confidence</span>
      </div>
    </div>
  )
}
