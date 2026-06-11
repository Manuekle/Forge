"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Shell } from "@/components/layout/shell"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AgentBadge } from "@/components/ui/agent-badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { CreateProjectModal } from "@/components/shared/create-project-modal"
import { AGENTS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { StoredProject } from "@/lib/store"
import {
  AiSearch02Icon,
  SparklesIcon,
  Clock01Icon,
  ArrowRight01Icon,
  FolderKanbanIcon,
  GridViewIcon,
  LayoutGridIcon,
} from "@hugeicons/core-free-icons"
import { Icon } from "@/components/ui/icon"

const filters = [
  { label: "All", value: "" },
  { label: "Active", value: "active" },
  { label: "Planning", value: "planning" },
  { label: "In review", value: "in_review" },
  { label: "Archived", value: "archived" },
] as const

export default function ProjectsPage() {
  const [projects, setProjects] = useState<StoredProject[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [view, setView] = useState<"grid" | "table">("grid")

  function reloadProjects() {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        setProjects(
          (Array.isArray(data) ? data : []).map((proj: StoredProject) => ({
            ...proj,
            _ago: Math.floor((Date.now() - new Date(proj.updatedAt).getTime()) / 60000),
          }))
        )
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { reloadProjects() }, [])

  const filtered = projects.filter((p) => {
    const matchFilter = activeFilter === "" || p.status === activeFilter
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchFilter && matchSearch
  })

  const agentList = Object.keys(AGENTS) as Array<keyof typeof AGENTS>

  function agoLabel(mins: number): string {
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m`
    const h = Math.floor(mins / 60)
    if (h < 24) return `${h}h`
    return `${Math.floor(h / 24)}d`
  }

  return (
    <Shell breadcrumb="Projects">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-[1200px]">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[28px] font-bold tracking-tight text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>Projects</h1>
              <p className="mt-1 text-sm text-text-secondary">
                {loading ? "Loading\u2026" : `${projects.length} project${projects.length !== 1 ? "s" : ""} in workspace`}
              </p>
            </div>
          </div>

          <CreateProjectModal open={showCreate} onOpenChange={setShowCreate} onCreated={reloadProjects} />

          {/* Search + Filters + View toggle */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="max-w-[320px] flex-1">
              <Input
                placeholder="Search projects\u2026"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Icon icon={AiSearch02Icon} size={15} />}
              />
            </div>
            <div className="flex flex-wrap gap-1.5 rounded-full bg-surface-inset p-1 ring-hair">
              {filters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setActiveFilter(f.value)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
                    activeFilter === f.value
                      ? "bg-surface-2 text-text-primary lift-1"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* View toggle */}
            <div className="flex gap-1 rounded-full bg-surface-inset p-1 ring-hair">
              <button
                onClick={() => setView("grid")}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                  view === "grid" ? "bg-surface-2 text-text-primary lift-1" : "text-text-secondary hover:text-text-primary"
                )}
              >
                <Icon icon={GridViewIcon} size={13} className="mr-1 inline" />
                Grid
              </button>
              <button
                onClick={() => setView("table")}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                  view === "table" ? "bg-surface-2 text-text-primary lift-1" : "text-text-secondary hover:text-text-primary"
                )}
              >
                <Icon icon={LayoutGridIcon} size={13} className="mr-1 inline" />
                Table
              </button>
            </div>

            <div className="flex-1" />
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Icon icon={SparklesIcon} size={14} />
              Create project
            </Button>
          </div>

          {loading ? (
            view === "grid" ? (
              <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                {[1, 2].map((i) => (
                  <Card key={i} variant="elevated" className="p-5">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-2/5" />
                        <Skeleton className="mt-2 h-3 w-4/5" />
                      </div>
                    </div>
                    <Skeleton className="mt-5 h-2 w-full" />
                  </Card>
                ))}
              </div>
            ) : (
              <div className="mt-8 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            )
          ) : filtered.length > 0 ? (
            view === "grid" ? (
              /* ── Grid view (unchanged) ── */
              <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                {filtered.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link href={`/projects/${p.id}`}>
                      <Card hover className="group p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full gradient-brand text-sm font-bold text-white shadow-brand">
                            {p.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2.5">
                              <h3 className="truncate text-sm font-semibold text-text-primary">{p.name}</h3>
                              <Badge variant={p.status as "active" | "planning" | "in_review" | "archived"} dot />
                            </div>
                            <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-text-secondary">{p.description}</p>
                          </div>
                          <Icon icon={ArrowRight01Icon} size={15} className="flex-shrink-0 text-muted transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-brand" />
                        </div>
                        <div className="mt-4 flex items-center gap-3">
                          <div className="flex">
                            {agentList.slice(0, 3).map((a, idx) => (
                              <div key={a} className={idx > 0 ? "-ml-2" : ""}>
                                <AgentBadge type={a} size="sm" className="ring-2 ring-surface" />
                              </div>
                            ))}
                            <div className="-ml-2 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-surface-3 text-[8px] font-medium text-text-secondary ring-2 ring-surface">
                              +{agentList.length - 3}
                            </div>
                          </div>
                          <span className="flex items-center gap-1 text-[11px] text-muted">
                            <Icon icon={Clock01Icon} size={11} />
                            {Math.floor(p.progress / 10)} artifacts · {(p as StoredProject & { _ago?: number })._ago ?? 0}m
                          </span>
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                          <Progress value={p.progress} className="flex-1" />
                          <span className="flex-shrink-0 font-mono text-xs text-muted tabular-nums">{p.progress}%</span>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              /* ── Table view ── */
              <div className="mt-8 overflow-x-auto rounded-2xl ring-hair">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-hairline bg-surface-2 text-left text-[11px] font-semibold text-muted">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium">Progress</th>
                      <th className="px-4 py-3 font-medium">Team</th>
                      <th className="px-4 py-3 font-medium">Updated</th>
                      <th className="w-10 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, i) => (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="group border-b border-hairline transition-colors last:border-0 hover:bg-hover"
                      >
                        <td className="px-4 py-3">
                          <Link href={`/projects/${p.id}`} className="flex items-center gap-3">
                            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full gradient-brand text-xs font-bold text-white shadow-brand">
                              {p.name.charAt(0)}
                            </span>
                            <span className="font-medium text-text-primary">{p.name}</span>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={p.status as "active" | "planning" | "in_review" | "archived"} dot />
                        </td>
                        <td className="max-w-[220px] truncate px-4 py-3 text-text-secondary">
                          {p.description}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Progress value={p.progress} className="w-20" />
                            <span className="font-mono text-[11px] text-muted tabular-nums">{p.progress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex">
                            {agentList.slice(0, 3).map((a, idx) => (
                              <div key={a} className={idx > 0 ? "-ml-1.5" : ""}>
                                <AgentBadge type={a} size="sm" className="ring-2 ring-surface" />
                              </div>
                            ))}
                            {agentList.length > 3 && (
                              <div className="-ml-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-surface-3 text-[7px] font-medium text-text-secondary ring-2 ring-surface">
                                +{agentList.length - 3}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-muted">
                          {agoLabel((p as StoredProject & { _ago?: number })._ago ?? 0)}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/projects/${p.id}`}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-muted opacity-0 transition-all group-hover:opacity-100 hover:bg-hover-strong hover:text-brand"
                          >
                            <Icon icon={ArrowRight01Icon} size={13} />
                          </Link>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <Card variant="inset" className="mt-8 flex flex-col items-center px-10 py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] glass-brand">
                <Icon icon={FolderKanbanIcon} size={26} className="text-brand" />
              </div>
              <h3 className="text-base font-semibold text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>No projects yet</h3>
              <p className="mt-2 max-w-[460px] text-sm text-text-secondary">
                Start from a template or create a project manually &mdash; the AI team takes it from there.
              </p>
              <Button className="mt-5" onClick={() => setShowCreate(true)}>
                <Icon icon={SparklesIcon} size={15} />
                Create your first project
              </Button>
            </Card>
          )}
        </div>
      </div>
    </Shell>
  )
}
