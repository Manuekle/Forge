"use client"

import { motion } from "framer-motion"
import { Shell } from "@/components/layout/shell"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AGENTS } from "@/lib/constants"
import { Sparkles } from "lucide-react"
import type { AgentType } from "@/types"

export default function AgentsPage() {
  const entries = Object.entries(AGENTS).filter(([k]) => k !== "orchestrator") as [AgentType, typeof AGENTS[AgentType]][]
  const decisionsFor: Record<string, string> = { pm: "38", architect: "29", ux: "21", qa: "17", scrum: "8", business: "12" }

  return (
    <Shell breadcrumb="Agents">
      <div className="p-8">
        <div className="mx-auto max-w-[1200px]">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>Agents</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Your AI product team. Orchestrated by Microsoft Foundry IQ.
            </p>
          </div>

          {/* Orchestrator hero */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease: [0.22, 1, 0.36, 1] }}
            className="relative mt-8 overflow-hidden rounded-[var(--radius-card)] glass-brand p-6"
          >
            <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full opacity-50 blur-3xl aurora" />
            <div className="relative flex flex-wrap items-center gap-5">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full gradient-brand text-white shadow-brand-lg">
                <Sparkles size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-semibold text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>Orchestrator</h2>
                  <Badge variant="default">Team Lead</Badge>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                  Delegates tasks, mediates debates and generates consensus across the team.
                </p>
              </div>
              <div className="hidden gap-1.5 sm:flex">
                {AGENTS.orchestrator.capabilities.map((c) => (
                  <span key={c} className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[11px] text-text-secondary ring-hair">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Agent Grid */}
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {entries.map(([key, agent], i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card hover variant="elevated" className="group h-full p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold ring-hair transition-transform duration-300 group-hover:scale-105"
                      style={{ background: `linear-gradient(160deg, ${agent.color}2E 0%, ${agent.color}0F 100%)`, color: agent.color }}>
                      {key.toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">{agent.label}</h3>
                      <p className="font-mono text-[11px] text-muted">{decisionsFor[key] ?? "0"} decisions</p>
                    </div>
                    <span className="ml-auto h-2 w-2 rounded-full" style={{ backgroundColor: agent.color, boxShadow: `0 0 8px ${agent.color}` }}>
                      <span className="block h-full w-full animate-ping rounded-full opacity-40" style={{ backgroundColor: agent.color }} />
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-text-secondary">{agent.description}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {agent.capabilities.map((c) => (
                      <span key={c} className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[10px] text-text-secondary ring-hair">
                        {c}
                      </span>
                    ))}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  )
}
