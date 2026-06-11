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
  ArrowRight01Icon, ChatBotIcon, Layers01Icon, AnalyticsUpIcon, SparklesIcon, AlgorithmIcon, Clock01Icon,
} from "@hugeicons/core-free-icons"
import { Icon } from "@/components/ui/icon"

type Activity = {
  id: string
  agent: string
  action: string
  project: string
  projectId: string
  timestamp: string
}

const teamAgentKeys = ["pm", "ux", "architect", "qa", "scrum", "business"] as const

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
              <Icon icon={SparklesIcon} size={14} />
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
                  <Icon icon={ChatBotIcon} size={16} className="text-brand" />
                  <h2 className="text-sm font-semibold text-text-primary">Agent team</h2>
                  <span className="text-xs text-muted">6 specialists + orchestrator</span>
                </div>
                <div className="rounded-2xl bg-surface p-5 lift-1">
                  <div className="flex items-center justify-around gap-2">
                    {teamAgentKeys.map((key) => {
                      const agent = AGENTS[key]
                      return (
                        <Tooltip key={key} content={agent.description}>
                          <div className="flex flex-col items-center gap-2.5">
                            <div
                              className="relative flex h-12 w-12 items-center justify-center rounded-xl ring-hair transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm cursor-default"
                              style={{ backgroundColor: `${agent.color}18` }}
                            >
                              <Icon icon={agent.icon} size={20} style={{ color: agent.color }} />
                            </div>
                            <span className="max-w-[72px] truncate text-center text-[10px] font-semibold text-text-secondary leading-tight">{agent.label}</span>
                          </div>
                        </Tooltip>
                      )
                    })}
                  </div>
                </div>
              </motion.div>

              {/* Main Grid */}
              <div className="mt-9 grid grid-cols-1 gap-5 lg:grid-cols-5">
                {/* Recent Projects */}
                <div className="flex flex-col gap-3 lg:col-span-3">
                  <div className="mb-1 flex items-center gap-3">
                    <Icon icon={Layers01Icon} size={15} className="text-brand" />
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
                              <Icon icon={Clock01Icon} size={11} />
                              {(p as StoredProject & { _ago?: number })._ago ?? 0}m
                            </span>
                            <Icon icon={ArrowRight01Icon} size={15} className="text-muted transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-brand" />
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
                        <Icon icon={AlgorithmIcon} size={22} className="text-brand" />
                      </div>
                      <h3 className="text-sm font-semibold text-text-primary">No projects yet</h3>
                      <p className="mt-1.5 max-w-[320px] text-sm text-text-secondary">Spin up your first project and let the team get to work.</p>
                      <Button className="mt-5" size="sm" onClick={() => setShowCreate(true)}>
                        <Icon icon={SparklesIcon} size={14} />
                        Create project
                      </Button>
                    </Card>
                  )}
                </div>

                {/* Activity Feed */}
                <div className="flex flex-col gap-3 lg:col-span-2">
                  <div className="mb-1 flex items-center gap-3">
                    <Icon icon={AnalyticsUpIcon} size={15} className="text-brand" />
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
                          className="flex gap-3 rounded-2xl p-3 transition-colors duration-200 hover:bg-hover"
                        >
                          <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                            style={{
                              backgroundColor: agentData ? `${agentData.color}22` : "rgba(232,80,2,0.15)",
                              color: agentData?.color || "#E85002",
                            }}>
                            <Icon icon={agentData.icon} size={14} />
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
