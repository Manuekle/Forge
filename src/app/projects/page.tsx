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
import { Search, Sparkles, Clock, ArrowRight, FolderKanban } from "lucide-react"

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

  return (
    <Shell breadcrumb="Projects">
      <div className="p-8">
        <div className="mx-auto max-w-[1200px]">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[28px] font-bold tracking-tight text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>Projects</h1>
              <p className="mt-1 text-sm text-text-secondary">
                {loading ? "Loading…" : `${projects.length} project${projects.length !== 1 ? "s" : ""} in workspace`}
              </p>
            </div>
          </div>

          <CreateProjectModal open={showCreate} onOpenChange={setShowCreate} onCreated={reloadProjects} />

          {/* Search + Filters */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="max-w-[320px] flex-1">
              <Input
                placeholder="Search projects…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search size={15} />}
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
            <div className="flex-1" />
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Sparkles size={14} />
              Create project
            </Button>
          </div>

          {/* Project Grid */}
          {loading ? (
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
          ) : filtered.length > 0 ? (
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
                        <ArrowRight size={15} className="flex-shrink-0 text-muted transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-brand" />
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
                          <Clock size={11} />
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
            <Card variant="inset" className="mt-8 flex flex-col items-center px-10 py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] glass-brand">
                <FolderKanban size={26} className="text-brand" />
              </div>
              <h3 className="text-base font-semibold text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>No projects yet</h3>
              <p className="mt-2 max-w-[460px] text-sm text-text-secondary">
                Start from a template or create a project manually — the AI team takes it from there.
              </p>
              <Button className="mt-5" onClick={() => setShowCreate(true)}>
                <Sparkles size={15} />
                Create your first project
              </Button>
            </Card>
          )}
        </div>
      </div>
    </Shell>
  )
}
