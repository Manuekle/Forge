"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Shell } from "@/components/layout/shell"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Modal } from "@/components/ui/modal"
import { AGENTS } from "@/lib/constants"
import { Sparkles, CheckCircle2, ArrowRight, GitBranch, Brain, FileText, Shield, BarChart3, Layers } from "lucide-react"
import type { AgentType } from "@/types"
import type { Agent } from "@/types"

const agentWorkflows: Record<string, { phase: string; desc: string }[]> = {
  pm: [
    { phase: "Analyze", desc: "Analyze the product idea and market context" },
    { phase: "Define", desc: "Define product vision, goals, and success metrics" },
    { phase: "Prioritize", desc: "Prioritize features with rationale and impact" },
    { phase: "Document", desc: "Generate a complete PRD with user stories" },
    { phase: "Review", desc: "Review and refine based on team feedback" },
  ],
  ux: [
    { phase: "Research", desc: "Define user personas and their goals" },
    { phase: "Flow", desc: "Design primary user flows step by step" },
    { phase: "Structure", desc: "Define information architecture" },
    { phase: "Design", desc: "Create interaction patterns and wireframe specs" },
    { phase: "Validate", desc: "Review for accessibility and mobile responsiveness" },
  ],
  architect: [
    { phase: "Assess", desc: "Evaluate technical requirements and constraints" },
    { phase: "Design", desc: "Design system architecture and component relationships" },
    { phase: "Spec", desc: "Define API contracts and data models" },
    { phase: "Evaluate", desc: "Assess scalability, performance, and trade-offs" },
    { phase: "Document", desc: "Document tech stack decisions with rationale" },
  ],
  qa: [
    { phase: "Scan", desc: "Scan for risks, edge cases, and vulnerabilities" },
    { phase: "Assess", desc: "Assess severity and likelihood of each risk" },
    { phase: "Plan", desc: "Define test strategy across unit, integration, e2e" },
    { phase: "Flag", desc: "Flag security concerns and compliance issues" },
    { phase: "Report", desc: "Deliver risk matrix with mitigations" },
  ],
  scrum: [
    { phase: "Break down", desc: "Break work into epics and user stories" },
    { phase: "Estimate", desc: "Estimate story points with the team" },
    { phase: "Plan", desc: "Plan sprints with key deliverables per sprint" },
    { phase: "Sequence", desc: "Identify dependencies and critical path" },
    { phase: "Track", desc: "Define milestones: MVP, Beta, Launch" },
  ],
  business: [
    { phase: "Analyze", desc: "Analyze market landscape and competitors" },
    { phase: "Model", desc: "Define revenue model and pricing strategy" },
    { phase: "Strategize", desc: "Create go-to-market plan and channels" },
    { phase: "Assess", desc: "Assess business risks and mitigation plans" },
    { phase: "Measure", desc: "Define success KPIs and OKRs" },
  ],
}

const workflowIcons = [Brain, FileText, BarChart3, Shield, Layers, GitBranch]

export default function AgentsPage() {
  const entries = Object.entries(AGENTS).filter(([k]) => k !== "orchestrator") as [AgentType, typeof AGENTS[AgentType]][]
  const decisionsFor: Record<string, string> = { pm: "38", architect: "29", ux: "21", qa: "17", scrum: "8", business: "12" }
  const [selected, setSelected] = useState<{ key: string; agent: Agent } | null>(null)

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
                  <span key={c} className="rounded-full bg-hover-strong px-3 py-1.5 text-[11px] text-text-secondary ring-hair">
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
                <button onClick={() => setSelected({ key, agent })} className="w-full text-left">
                  <Card hover variant="elevated" className="group h-full p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold transition-transform duration-300 group-hover:scale-105"
                        style={{ background: agent.color, color: "#fff" }}>
                        {key.slice(0, 2).toUpperCase()}
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
                        <span key={c} className="rounded-full bg-hover-strong px-2.5 py-1 text-[10px] text-text-secondary ring-hair">
                          {c}
                        </span>
                      ))}
                    </div>
                  </Card>
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Detail Modal */}
      <AnimatePresence>
        {selected && (
          <Modal open={!!selected} onOpenChange={() => setSelected(null)}>
            <div className="p-6">
              <div className="mb-6 flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: selected.agent.color }}
                >
                  {selected.key.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>{selected.agent.label}</h2>
                  <p className="text-xs text-text-secondary">{decisionsFor[selected.key] ?? "0"} decisions contributed</p>
                </div>
              </div>

              <p className="mb-6 text-sm leading-relaxed text-text-secondary">{selected.agent.description}</p>

              {/* Capabilities */}
              <div className="mb-6">
                <h3 className="mb-3 text-xs font-semibold text-text-primary">Capabilities</h3>
                <div className="flex flex-wrap gap-2">
                  {selected.agent.capabilities.map((c) => (
                    <span key={c} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium"
                      style={{ background: `${selected.agent.color}18`, color: selected.agent.color }}>
                      <CheckCircle2 size={12} />
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Workflow */}
              <div>
                <h3 className="mb-4 text-xs font-semibold text-text-primary">Workflow</h3>
                <div className="flex flex-col gap-3">
                  {(agentWorkflows[selected.key] ?? []).map((step, i) => {
                    const Icon = workflowIcons[i % workflowIcons.length]
                    return (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full"
                            style={{ background: `${selected.agent.color}18`, color: selected.agent.color }}>
                            <Icon size={13} />
                          </div>
                          {i < (agentWorkflows[selected.key]?.length ?? 0) - 1 && (
                            <div className="mt-0.5 h-full w-px" style={{ background: `${selected.agent.color}18` }} />
                          )}
                        </div>
                        <div className="pb-5">
                          <div className="text-sm font-medium text-text-primary">{step.phase}</div>
                          <div className="mt-0.5 text-xs text-text-secondary">{step.desc}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="mt-6 flex justify-end pt-5 hairline-t">
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  Click an agent card to see their workflow
                  <ArrowRight size={12} />
                </div>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </Shell>
  )
}
