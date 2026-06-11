"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Shell } from "@/components/layout/shell"
import { MetricsCard } from "@/components/ui/metrics-card"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip } from "@/components/ui/tooltip"
import { CreateProjectModal } from "@/components/shared/create-project-modal"
import { AGENTS } from "@/lib/constants"
import { stripMarkdown } from "@/components/ui/markdown"
import type { StoredProject } from "@/lib/store"
import {
  ArrowRight, Bot, Layers, TrendingUp, Sparkles, Zap, Clock,
} from "lucide-react"

type Activity = {
  id: string
  agent: string
  action: string
  project: string
  projectId: string
  timestamp: string
}

const agents = [
  { role: "Product Manager", short: "PM", color: "#F97316" },
  { role: "UX Designer", short: "UX", color: "#FB923C" },
  { role: "Tech Architect", short: "AR", color: "#FCD34D" },
  { role: "QA Engineer", short: "QA", color: "#A78BFA" },
  { role: "Scrum Master", short: "SC", color: "#2ED47A" },
  { role: "Business Analyst", short: "BA", color: "#4A9FF9" },
]

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, ease: [0.22, 1, 0.36, 1] as const } }),
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<StoredProject[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch("/api/projects").then((r) => r.json()),
      fetch("/api/activity").then((r) => r.json()),
    ]).then(([p, a]) => {
      setProjects(
        (Array.isArray(p) ? p : []).map((proj: StoredProject) => ({
          ...proj,
          _ago: Math.floor((Date.now() - new Date(proj.updatedAt).getTime()) / 60000),
        }))
      )
      setActivities(Array.isArray(a) ? a : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const metrics = {
    active: projects.filter((p) => p.status === "active").length,
    artifacts: projects.reduce((s, p) => s + Math.floor(p.progress / 10), 0),
    decisions: activities.length,
  }

  return (
    <Shell breadcrumb="Dashboard">
      <div className="p-8">
        <div className="mx-auto max-w-[1200px]">
          {/* Header */}
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[28px] font-bold tracking-tight text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>Dashboard</h1>
              <p className="mt-1 text-sm text-text-secondary">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long", year: "numeric", month: "long", day: "numeric",
                })}
              </p>
            </div>
            <Button onClick={() => setShowCreate(true)} size="sm">
              <Sparkles size={14} />
              New project
            </Button>
          </div>

          <CreateProjectModal open={showCreate} onOpenChange={setShowCreate} />

          {loading ? (
            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} variant="elevated" className="p-6">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="mt-4 h-8 w-2/3 rounded-xl" />
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Metrics */}
              <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                  { label: "Active projects", value: String(metrics.active), change: `${projects.length} total`, changeType: "neutral" as const },
                  { label: "Artifacts generated", value: String(metrics.artifacts), change: "across all projects", changeType: "neutral" as const },
                  { label: "Agent decisions", value: String(metrics.decisions), change: `${activities.filter((a) => a.timestamp === "just now").length} new`, changeType: "positive" as const },
                  { label: "Total projects", value: String(projects.length), change: "in workspace", changeType: "neutral" as const },
                ].map((m, i) => (
                  <motion.div key={m.label} custom={i} variants={fadeUp} initial="hidden" animate="show">
                    <MetricsCard data={m} />
                  </motion.div>
                ))}
              </div>

              {/* Agent Status */}
              <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show" className="mt-9">
                <div className="mb-4 flex items-center gap-3">
                  <Bot size={16} className="text-brand" />
                  <h2 className="text-sm font-semibold text-text-primary">Active agents</h2>
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                    6/6 online
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {agents.map((a, i) => (
                    <Tooltip key={a.role} content={a.role}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + i * 0.06, type: "spring", stiffness: 240 }}
                        whileHover={{ y: -3 }}
                        className="relative flex h-11 w-11 cursor-default items-center justify-center rounded-full ring-hair"
                        style={{ background: `linear-gradient(160deg, ${a.color}26 0%, ${a.color}0D 100%)` }}
                      >
                        <span className="text-xs font-bold" style={{ color: a.color }}>{a.short}</span>
                        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-surface" style={{ backgroundColor: a.color }}>
                          <span className="block h-full w-full animate-ping rounded-full opacity-40" style={{ backgroundColor: a.color }} />
                        </span>
                      </motion.div>
                    </Tooltip>
                  ))}
                </div>
              </motion.div>

              {/* Main Grid */}
              <div className="mt-9 grid grid-cols-1 gap-5 lg:grid-cols-5">
                {/* Recent Projects */}
                <div className="flex flex-col gap-3 lg:col-span-3">
                  <div className="mb-1 flex items-center gap-3">
                    <Layers size={15} className="text-brand" />
                    <h2 className="text-sm font-semibold text-text-primary">Recent projects</h2>
                  </div>
                  {projects.slice(0, 3).map((p, i) => (
                    <motion.div key={p.id} custom={i + 5} variants={fadeUp} initial="hidden" animate="show">
                      <Link href={`/projects/${p.id}`}>
                        <Card hover className="group p-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full gradient-brand text-xs font-bold text-white shadow-brand">
                              {p.name.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2.5">
                                <h3 className="truncate text-sm font-semibold text-text-primary">{p.name}</h3>
                                <Badge variant={p.status as "active" | "planning" | "in_review" | "archived"} dot />
                              </div>
                              <p className="mt-1 truncate text-xs text-text-secondary">{p.description}</p>
                            </div>
                            <span className="flex flex-shrink-0 items-center gap-1 text-[11px] text-muted">
                              <Clock size={11} />
                              {(p as StoredProject & { _ago?: number })._ago ?? 0}m
                            </span>
                            <ArrowRight size={15} className="text-muted transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-brand" />
                          </div>
                          <div className="mt-4 flex items-center gap-3">
                            <Progress value={p.progress} className="flex-1" />
                            <span className="font-mono text-xs text-muted tabular-nums">{p.progress}%</span>
                          </div>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                  {projects.length === 0 && (
                    <Card variant="inset" className="flex flex-col items-center px-8 py-12 text-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] glass-brand">
                        <Zap size={22} className="text-brand" />
                      </div>
                      <h3 className="text-sm font-semibold text-text-primary">No projects yet</h3>
                      <p className="mt-1.5 max-w-[320px] text-sm text-text-secondary">Spin up your first project and let the team get to work.</p>
                      <Button className="mt-5" size="sm" onClick={() => setShowCreate(true)}>
                        <Sparkles size={14} />
                        Create project
                      </Button>
                    </Card>
                  )}
                </div>

                {/* Activity Feed */}
                <div className="flex flex-col gap-3 lg:col-span-2">
                  <div className="mb-1 flex items-center gap-3">
                    <TrendingUp size={15} className="text-brand" />
                    <h2 className="text-sm font-semibold text-text-primary">Agent activity</h2>
                  </div>
                  <Card variant="elevated" className="p-2">
                    {activities.slice(0, 6).map((a, i) => {
                      const agentData = AGENTS[a.agent as keyof typeof AGENTS]
                      return (
                        <motion.div
                          key={a.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + i * 0.05 }}
                          className="flex gap-3 rounded-2xl p-3 transition-colors duration-200 hover:bg-white/[0.03]"
                        >
                          <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[8px] font-bold"
                            style={{
                              backgroundColor: agentData ? `${agentData.color}22` : "rgba(232,80,2,0.15)",
                              color: agentData?.color || "#E85002",
                            }}>
                            {a.agent === "orchestrator" ? "OR" : a.agent.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs leading-relaxed text-text-secondary">{stripMarkdown(a.action)}</div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
                              <span className="text-text-secondary">{a.project}</span>
                              <span>·</span>
                              <span>{a.timestamp}</span>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                    {activities.length === 0 && (
                      <div className="py-8 text-center text-xs text-text-secondary">
                        No activity yet. Start a run in a project.
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Shell>
  )
}
