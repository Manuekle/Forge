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
import { CreateProjectModal } from "@/components/shared/create-project-modal"
import { AGENTS } from "@/lib/constants"
import { stripMarkdown } from "@/components/ui/markdown"
import type { StoredProject } from "@/lib/store"
import {
  ArrowRight01Icon, Layers01Icon, AnalyticsUpIcon, SparklesIcon, AlgorithmIcon, Clock01Icon,
  Folder01Icon, BrainIcon, File01Icon, BarChartIcon,
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

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { ease: [0.22, 1, 0.36, 1] as const } },
}

const metricIcons = [Folder01Icon, BrainIcon, File01Icon, BarChartIcon] as const

function getRelativeTime(iso: string | Date): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
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
      setProjects(Array.isArray(p) ? p : [])
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
      <div className="relative min-h-full">
        {/* Noise texture overlay */}
        <div className="pointer-events-none fixed inset-0 bg-noise" />

        <div className="relative z-10 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1280px]">

            {/* ── Header ── */}
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-[28px] font-bold tracking-tight text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>
                  <span className="gradient-text">{new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening"}</span>
                </h1>
                <p className="mt-1 text-sm text-text-secondary">
                  {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
              <Button onClick={() => setShowCreate(true)} size="sm" className="btn-brand text-white flex-shrink-0">
                <Icon icon={SparklesIcon} size={14} />
                New project
              </Button>
            </div>

            <CreateProjectModal open={showCreate} onOpenChange={setShowCreate} />

            {/* ── Loading state ── */}
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
              <motion.div variants={stagger} initial="hidden" animate="show" className="mt-8 space-y-9">

                {/* ── Metrics ── */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {[
                    { label: "Active projects", value: String(metrics.active), change: `${projects.length} total`, changeType: "neutral" as const },
                    { label: "Artifacts generated", value: String(metrics.artifacts), change: "across all projects", changeType: "neutral" as const },
                    { label: "Agent decisions", value: String(metrics.decisions), change: `${activities.filter((a) => a.timestamp === "just now").length} new`, changeType: "positive" as const },
                    { label: "Total projects", value: String(projects.length), change: "in workspace", changeType: "neutral" as const },
                  ].map((m, i) => (
                    <motion.div key={m.label} variants={fadeUp} className="group relative">
                      <div className="pointer-events-none absolute -inset-0.5 rounded-[var(--radius-card)] opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-100"
                        style={{ background: "linear-gradient(135deg, rgba(232,80,2,0.12), transparent 60%)" }}
                      />
                      <div className="relative">
                        <MetricsCard data={m} />
                        <div className="pointer-events-none absolute right-4 top-4 opacity-[0.06] transition-opacity duration-500 group-hover:opacity-[0.12]">
                          <Icon icon={metricIcons[i]} size={28} />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* ── Main grid: Recent projects + Activity ── */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

                  {/* Recent projects */}
                  <div className="flex flex-col gap-4 lg:col-span-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg glass-brand">
                        <Icon icon={Layers01Icon} size={13} className="text-brand" />
                      </div>
                      <h2 className="text-sm font-semibold text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>Recent projects</h2>
                    </div>
                    {projects.slice(0, 3).map((p) => (
                      <motion.div key={p.id} variants={fadeUp}>
                        <Link href={`/projects/${p.id}`}>
                          <Card hover className="group relative overflow-hidden p-5">
                            <div className="pointer-events-none absolute -right-12 -top-12 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-[0.08]"
                              style={{ background: "radial-gradient(circle, #E85002 0%, transparent 70%)" }}
                            />
                            <div className="relative flex items-center gap-4">
                              <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full gradient-brand text-sm font-bold text-white shadow-brand">
                                {p.name.charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2.5">
                                  <h3 className="truncate text-sm font-semibold text-text-primary">{p.name}</h3>
                                  <Badge variant={p.status as "active" | "planning" | "in_review" | "archived"} dot />
                                </div>
                                <p className="mt-1 truncate text-xs text-text-secondary">{p.description}</p>
                              </div>
                              <div className="hidden items-center gap-2 sm:flex">
                                <span className="flex items-center gap-1.5 text-[11px] text-muted">
                                  <Icon icon={Clock01Icon} size={11} />
                                  {getRelativeTime(p.updatedAt)}
                                </span>
                              </div>
                              <Icon icon={ArrowRight01Icon} size={16} className="text-muted transition-all duration-300 group-hover:translate-x-1 group-hover:text-brand" />
                            </div>
                            <div className="relative mt-4 flex items-center gap-3">
                              <Progress value={p.progress} className="flex-1" />
                              <span className="font-mono text-xs text-muted tabular-nums">{p.progress}%</span>
                            </div>
                          </Card>
                        </Link>
                      </motion.div>
                    ))}
                    {projects.length === 0 && (
                      <Card variant="inset" className="relative flex flex-col items-center px-8 py-14 text-center">
                        <div className="pointer-events-none absolute inset-0 bg-noise opacity-[0.3]" />
                        <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] glass-brand">
                          <Icon icon={AlgorithmIcon} size={24} className="text-brand" />
                        </div>
                        <h3 className="relative text-sm font-semibold text-text-primary">No projects yet</h3>
                        <p className="relative mt-1.5 max-w-[320px] text-sm text-text-secondary">Spin up your first project and let the team get to work.</p>
                        <Button className="relative mt-6 btn-brand text-white" size="sm" onClick={() => setShowCreate(true)}>
                          <Icon icon={SparklesIcon} size={14} />
                          Create project
                        </Button>
                      </Card>
                    )}
                    {projects.length > 3 && (
                      <div className="flex justify-center">
                        <Link href="/projects">
                          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted">
                            View all projects
                            <Icon icon={ArrowRight01Icon} size={12} />
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Activity feed */}
                  <div className="flex flex-col gap-4 lg:col-span-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg glass-brand">
                        <Icon icon={AnalyticsUpIcon} size={13} className="text-brand" />
                      </div>
                      <h2 className="text-sm font-semibold text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>Agent activity</h2>
                    </div>
                    <Card variant="elevated" className="p-1">
                      {activities.slice(0, 6).map((a) => {
                        const agentData = AGENTS[a.agent as keyof typeof AGENTS]
                        return (
                          <motion.div
                            key={a.id}
                            variants={fadeUp}
                            className="relative flex gap-3.5 rounded-2xl p-3.5 transition-all duration-200 hover:bg-hover"
                          >
                            <div className="relative mt-0.5 z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white ring-2 ring-surface"
                              style={{ background: agentData?.color || "#E85002" }}
                            >
                              <Icon icon={agentData?.icon ?? AlgorithmIcon} size={15} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs leading-relaxed text-text-secondary">{stripMarkdown(a.action)}</div>
                              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
                                <Link href={`/projects/${a.projectId}`} className="font-medium text-text-secondary transition-colors hover:text-brand">
                                  {a.project}
                                </Link>
                                <span>·</span>
                                <span>{a.timestamp}</span>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                      {activities.length === 0 && (
                        <div className="flex flex-col items-center py-10 text-center">
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl glass-brand">
                            <Icon icon={AnalyticsUpIcon} size={18} className="text-brand" />
                          </div>
                          <p className="text-xs text-text-secondary">No activity yet.</p>
                          <p className="text-xs text-muted">Start a run in a project.</p>
                        </div>
                      )}
                    </Card>
                  </div>
                </div>

              </motion.div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  )
}
