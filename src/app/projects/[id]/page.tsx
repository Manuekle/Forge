"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Shell } from "@/components/layout/shell"
import { AgentDebateCard } from "@/components/shared/agent-debate-card"
import { Markdown, stripMarkdown } from "@/components/ui/markdown"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { ExportModal } from "@/components/shared/export-modal"
import { useToast } from "@/components/ui/toast"
import { AGENTS } from "@/lib/constants"
import { cn, formatDuration } from "@/lib/utils"
import type { StoredProject, StoredDecision, StoredArtifact, StoredRun } from "@/lib/store"
import {
  Sparkles, Layers, Scale, GitBranch, Zap,
  MessageSquare, Check, Download, Plus
} from "lucide-react"

const tabs = [
  { id: "feed", label: "Collaboration", icon: MessageSquare },
  { id: "deliverables", label: "Deliverables", icon: Layers },
  { id: "decisions", label: "Decisions", icon: Scale },
  { id: "iq", label: "Foundry IQ", icon: Sparkles },
] as const

const deliverableTypes = ["PRD", "Backlog", "Architecture", "UX", "QA", "Roadmap", "Business"] as const

type DecisionData = {
  id: string
  topic: string
  status: "open" | "voting" | "consensus"
  confidence?: number
  agentEntries: { agent: string; message: string; timestamp: string }[]
  consensus?: string
  createdAt: string
}

const wsAgents = ["orchestrator", "pm", "ux", "architect", "qa", "scrum", "business"] as const

export default function ProjectPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const [params, setParams] = useState<{ id: string } | null>(null)

  useEffect(() => {
    paramsPromise.then(setParams)
  }, [paramsPromise])

  if (!params) return null
  return <ProjectPageInner projectId={params.id} />
}

function ProjectPageInner({ projectId }: { projectId: string }) {
  const { toast } = useToast()
  const [project, setProject] = useState<StoredProject | null>(null)
  const [decisions, setDecisions] = useState<StoredDecision[]>([])
  const [artifacts, setArtifacts] = useState<StoredArtifact[]>([])
  const [runs, setRuns] = useState<StoredRun[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("feed")
  const [activeDeliverable, setActiveDeliverable] = useState("PRD")
  const [running, setRunning] = useState(false)
  const [runProgress, setRunProgress] = useState<string[]>([])
  const [newTopic, setNewTopic] = useState("")
  const [showExport, setShowExport] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState(1)

  function load() {
    Promise.all([
      fetch(`/api/projects/${projectId}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/projects/${projectId}/decisions`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/projects/${projectId}/artifacts`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/projects/${projectId}/runs`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([p, d, a, r]) => {
        // Endpoints can return a non-array error object on 401/404 — coerce.
        setProject(p && !p.error ? p : null)
        setDecisions(Array.isArray(d) ? d : [])
        setArtifacts(Array.isArray(a) ? a : [])
        setRuns(Array.isArray(r) ? r : [])
      })
      .catch(() => {
        setProject(null)
        setDecisions([])
        setArtifacts([])
        setRuns([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  async function handleNewRun() {
    setRunning(true)
    setRunProgress(["Starting agents…"])

    fetch(`/api/projects/${projectId}/runs`, { method: "POST" }).catch(() => {})

    const poll = setInterval(async () => {
      try {
        const runsRes = await fetch(`/api/projects/${projectId}/runs`)
        if (!runsRes.ok) return
        const all: StoredRun[] = await runsRes.json()
        const latest = all[0]
        if (!latest) return
        if (latest.status === "completed") {
          clearInterval(poll)
          load()
          setRunning(false)
          setRunProgress([])
          toast({ title: "Run complete", description: "Agents reached consensus and generated deliverables.", variant: "success" })
          return
        }
        if (latest.status === "failed") {
          clearInterval(poll)
          setRunning(false)
          setRunProgress([])
          toast({ title: "Run failed", description: "Check the Foundry IQ tab for details.", variant: "error" })
          return
        }
        if (latest.progress) {
          setRunProgress((prev) => prev.includes(latest.progress!) ? prev : [...prev, latest.progress!])
        }
      } catch { /* poll silently */ }
    }, 1000)
  }

  async function handleAddDecision() {
    if (!newTopic) return
    const topic = newTopic
    setNewTopic("")
    fetch(`/api/projects/${projectId}/decisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    }).then(() => {
      load()
      toast({ title: "Debate started", description: `"${topic}" — the team is weighing in.`, variant: "brand" })
    })
  }

  const mappedDecisions: DecisionData[] = decisions.map((d) => ({
    id: d.id,
    topic: d.topic,
    status: d.status,
    confidence: d.confidence || undefined,
    agentEntries: (d.entries ?? []).map((e) => ({
      agent: e.agent,
      message: e.message,
      timestamp: e.timestamp,
    })),
    consensus: d.consensus || undefined,
    createdAt: new Date(d.createdAt).toLocaleDateString(),
  }))

  const allVersions = artifacts.filter((a) => a.type.toLowerCase() === activeDeliverable.toLowerCase())
  const currentArtifact = allVersions.find((a) => a.version === selectedVersion) ?? allVersions[0] ?? null
  const latestRun = runs[0]

  if (loading) {
    return (
      <Shell breadcrumb="Loading…" projectMode projectName="Loading…" projectDescription="Fetching workspace" projectStatus="planning">
        <div className="p-8">
          <div className="max-w-[820px] space-y-6">
            <Skeleton className="h-2 w-full" />
            <div className="flex gap-2">
              {[64, 80, 72, 76].map((w, i) => <Skeleton key={i} className="h-9" style={{ width: w }} />)}
            </div>
            <Skeleton className="h-12 w-full rounded-[20px]" />
            <Skeleton className="h-44 w-full rounded-[var(--radius-card)]" />
            <Skeleton className="h-44 w-full rounded-[var(--radius-card)]" />
          </div>
        </div>
      </Shell>
    )
  }

  if (!project) {
    return (
      <Shell breadcrumb="Not found" projectMode projectName="Error" projectDescription="" projectStatus="archived">
        <div className="flex flex-1 items-center justify-center">
          <div className="text-sm text-text-secondary">Project not found.</div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell
      projectMode
      breadcrumb={`${project.name}`}
      projectName={project.name}
      projectDescription={project.description}
      projectStatus={project.status}
      latestRun={latestRun && latestRun.status === "completed" ? { duration: latestRun.duration ?? 0, id: latestRun.id } : undefined}
    >
      <div className="flex min-h-0 flex-1">
        {/* Main Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-[820px]">
            {/* Progress + Status Bar */}
            <div className="mb-7 flex items-center gap-4">
              <Progress value={project.progress} className="flex-1" />
              <span className="font-mono text-xs text-muted tabular-nums">{project.progress}% complete</span>
              {latestRun?.status === "completed" && latestRun.duration && (
                <Badge variant="active" dot>Run · {formatDuration(latestRun.duration)}</Badge>
              )}
            </div>

            {/* Run Progress */}
            <AnimatePresence>
              {running && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <Card variant="elevated" className="p-5">
                    <div className="mb-4 flex items-center gap-2.5">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-50" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
                      </span>
                      <span className="text-xs font-medium text-brand">Running agents…</span>
                      <span className="ml-auto text-[10px] text-muted">{runProgress.length} steps</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {runProgress.map((step, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-2.5 text-xs"
                        >
                          {i < runProgress.length - 1 ? (
                            <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-brand/15">
                              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                            </span>
                          ) : (
                            <span className="relative flex h-4 w-4 flex-shrink-0 items-center justify-center">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-40" />
                              <span className="relative inline-flex h-3 w-3 rounded-full bg-brand" />
                            </span>
                          )}
                          <span className={i < runProgress.length - 1 ? "text-text-secondary" : "font-medium text-text-primary"}>{step}</span>
                        </motion.div>
                      ))}
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tabs — pill segmented control */}
            <div className="mb-7 inline-flex gap-1 rounded-full bg-surface-inset p-1 ring-hair">
              {tabs.map((t) => {
                const Icon = t.icon
                const active = activeTab === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={cn(
                      "relative flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors duration-200",
                      active ? "text-text-primary" : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="ws-tab"
                        className="absolute inset-0 rounded-full bg-surface-2 lift-1"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    <Icon size={15} className={cn("relative z-10", active && "text-brand")} strokeWidth={active ? 2.4 : 1.8} />
                    <span className="relative z-10">{t.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Tab Content: Feed */}
            {activeTab === "feed" && (
              <motion.div key="feed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                <div className="flex flex-col gap-4">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Add a decision topic for debate…"
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddDecision()}
                        icon={<Plus size={16} />}
                      />
                    </div>
                    <Button onClick={handleAddDecision} disabled={!newTopic}>
                      Add
                    </Button>
                    <Button onClick={handleNewRun} disabled={running}>
                      <Sparkles size={15} />
                      {running ? "Running…" : "New run"}
                    </Button>
                  </div>

                  {mappedDecisions.map((d) => (
                    <AgentDebateCard key={d.id} decision={d} />
                  ))}

                  {mappedDecisions.length === 0 && !running && (
                    <EmptyState icon={MessageSquare} title="No debates yet" desc="Add a topic or start a run to watch the team deliberate." />
                  )}
                </div>
              </motion.div>
            )}

            {/* Tab Content: Deliverables */}
            {activeTab === "deliverables" && (
              <motion.div key="deliverables" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                <div className="mb-6 flex gap-1.5 overflow-auto pb-1">
                  {deliverableTypes.map((t) => {
                    const active = activeDeliverable === t
                    return (
                      <button
                        key={t}
                        onClick={() => { setActiveDeliverable(t); setSelectedVersion(1) }}
                        className={cn(
                          "whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-all duration-200",
                          active
                            ? "bg-surface-2 font-medium text-text-primary lift-1"
                            : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
                        )}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
                {currentArtifact ? (
                  <Card variant="elevated" className="overflow-hidden p-0">
                    <div className="flex items-center justify-between px-6 py-4">
                      <div className="flex items-center gap-3">
                        <h2 className="text-sm font-semibold text-text-primary">{currentArtifact.title}</h2>
                        {allVersions.length > 1 && (
                          <div className="flex gap-1">
                            {allVersions.map((a) => (
                              <button
                                key={a.version}
                                onClick={() => setSelectedVersion(a.version)}
                                className={cn(
                                  "rounded-full px-2.5 py-0.5 text-[11px] font-mono transition-all",
                                  a.version === selectedVersion
                                    ? "bg-brand text-white"
                                    : "bg-surface-2 text-text-secondary hover:bg-surface-3"
                                )}
                              >
                                v{a.version}
                              </button>
                            ))}
                          </div>
                        )}
                        {allVersions.length <= 1 && <Badge variant="neutral">v{currentArtifact.version}</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => setShowExport(true)}>
                          <Download size={14} />
                          Export
                        </Button>
                      </div>
                    </div>
                    <div className="px-6 pb-6">
                      <div className="rounded-2xl bg-surface-inset p-5 text-xs leading-relaxed text-text-secondary ring-hair">
                        <Markdown content={currentArtifact.content} />
                      </div>
                    </div>
                  </Card>
                ) : (
                  <EmptyState icon={Layers} title={`No ${activeDeliverable} artifact yet`} desc="Run the agents to generate this deliverable." />
                )}
              </motion.div>
            )}

            {/* Tab Content: Decisions */}
            {activeTab === "decisions" && (
              <motion.div key="decisions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="flex flex-col gap-3">
                {mappedDecisions.length === 0 ? (
                  <EmptyState icon={Scale} title="No decisions yet" desc="Decisions and their rationale will appear here once the team debates." />
                ) : (
                  mappedDecisions.map((d) => {
                    const statusVariant = d.status === "consensus" ? "consensus" : d.status === "voting" ? "voting" : "open"
                    return (
                      <Card key={d.id} variant="elevated" className="p-5">
                        <div className="mb-3 flex items-center gap-2.5">
                          <Badge variant={statusVariant} dot />
                          <span className="text-[11px] text-muted">{d.createdAt}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-text-primary">{d.topic}</h3>
                        {d.consensus && (
                          <p className="mt-3 rounded-2xl bg-brand-subtle p-3.5 text-xs leading-relaxed text-text-secondary">
                            <span className="font-medium text-brand">Consensus: </span>{d.consensus}
                          </p>
                        )}
                        {d.confidence && (
                          <div className="mt-2.5 flex items-center gap-1.5 font-mono text-[11px] text-brand">
                            <Check size={11} />
                            confidence {d.confidence.toFixed(2)}
                          </div>
                        )}
                        <div className="mt-4 flex flex-col gap-2.5 pt-4 hairline-t">
                          {d.agentEntries.map((e, i) => {
                            const agent = AGENTS[e.agent as keyof typeof AGENTS]
                            return (
                              <div key={i} className="flex gap-2.5 text-xs">
                                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[7px] text-[7px] font-bold"
                                  style={{
                                    backgroundColor: agent ? `${agent.color}22` : "rgba(232,80,2,0.15)",
                                    color: agent?.color || "#E85002",
                                  }}>
                                  {e.agent === "orchestrator" ? "OR" : e.agent.slice(0, 2).toUpperCase()}
                                </span>
                                <div className="min-w-0 flex-1 text-text-secondary">
                                  <span className="font-medium text-text-primary">{e.agent}: </span>
                                  <Markdown content={e.message} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </Card>
                    )
                  })
                )}
              </motion.div>
            )}

            {/* Tab Content: Foundry IQ */}
            {activeTab === "iq" && (
              <motion.div key="iq" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                <Card variant="elevated" className="p-6">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[12px] gradient-brand glow-brand">
                      <Zap size={16} className="text-white" />
                    </div>
                    <h2 className="text-sm font-semibold text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>Microsoft Foundry IQ Trace</h2>
                  </div>
                  {runs.length > 0 ? (
                    runs.slice(0, 3).map((run) => (
                      <div key={run.id} className="mb-6 last:mb-0">
                        <div className="mb-3 flex items-center gap-2.5">
                          <div className="flex items-center gap-2 rounded-full bg-brand-subtle px-3 py-1 ring-hair">
                            <span className={`h-1.5 w-1.5 rounded-full ${run.status === "completed" ? "bg-success" : "bg-warning"}`} />
                            <span className="font-mono text-xs text-brand">#{run.id.slice(0, 6)}</span>
                          </div>
                          <span className="text-xs text-muted">{run.duration ? formatDuration(run.duration) : "?"}</span>
                          {run.status === "completed" && run.duration && (
                            <span className="text-xs text-muted">{artifacts.length} artifacts</span>
                          )}
                        </div>
                        <div className="rounded-2xl bg-surface-inset p-5 font-mono text-xs ring-hair">
                          {run.trace.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {run.trace.map((t, i) => (
                                <div key={i} className="relative -ml-px flex gap-4 border-l border-white/[0.08] py-1 pl-4">
                                  <div className="absolute left-[-3.5px] top-2 h-[6px] w-[6px] rounded-full"
                                    style={{ backgroundColor: t.action.includes("Consensus") ? "#E85002" : "rgba(255,255,255,0.15)" }} />
                                  <span className="w-[65px] flex-shrink-0 text-brand">{t.time}</span>
                                  <span className="w-[160px] flex-shrink-0 text-text-secondary">{t.action}</span>
                                  <span className="text-muted">{t.detail}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-text-secondary">No trace data available.</div>
                          )}
                        </div>
                        {run.citations && run.citations.length > 0 && (
                          <div className="mt-3 rounded-2xl bg-surface-inset p-5 ring-hair">
                            <div className="mb-3 font-mono text-xs text-text-secondary">
                              Grounded sources · {run.citations.length}
                            </div>
                            <div className="flex flex-col gap-2">
                              {run.citations.map((c) => (
                                <div key={c.ref} className="flex gap-3 text-xs">
                                  <span className="mt-px font-mono text-brand">[{c.ref}]</span>
                                  <div className="min-w-0">
                                    <div className="text-text-primary">
                                      {c.title}{" "}
                                      <span className="text-muted">· {c.source}</span>
                                    </div>
                                    <div className="truncate text-muted">{c.snippet}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <EmptyState icon={Sparkles} title="No runs yet" desc="Start a run in the Collaboration tab to generate a trace." />
                  )}
                </Card>
              </motion.div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="hidden w-[280px] flex-shrink-0 overflow-auto p-5 shadow-[inset_1px_0_0_rgba(255,255,255,0.06)] xl:block">
          <PanelHeading icon={Sparkles}>AI Team</PanelHeading>
          <div className="mb-7 flex flex-col gap-1">
            {wsAgents.map((agentKey) => {
              const agent = AGENTS[agentKey]
              return (
                <div key={agentKey}
                  className="flex items-center gap-2.5 rounded-full px-3 py-2 text-xs transition-all duration-200 hover:bg-white/[0.04]"
                >
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: agent.color }} />
                  <span className="text-text-secondary">{agent.label}</span>
                  <span className={`ml-auto h-1.5 w-1.5 rounded-full ${agentKey === "orchestrator" || agentKey === "pm" ? "bg-success" : "bg-muted"}`} />
                </div>
              )
            })}
          </div>

          <PanelHeading icon={Layers}>Artifacts</PanelHeading>
          <div className="mb-7 flex flex-col gap-1">
            {artifacts.length > 0 ? (
              artifacts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setActiveTab("deliverables")
                    setActiveDeliverable(
                      deliverableTypes.find((t) => t.toLowerCase() === a.type.toLowerCase()) ?? a.type
                    )
                  }}
                  className="flex items-center gap-2.5 rounded-full px-3 py-2 text-left text-xs text-text-secondary transition-all duration-200 hover:bg-white/[0.04] hover:text-text-primary"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-brand/60" />
                  <span className="truncate">{a.title}</span>
                  <span className="ml-auto font-mono text-[10px] text-muted">v{a.version}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-muted">No artifacts yet</div>
            )}
          </div>

          <PanelHeading icon={GitBranch}>Activity</PanelHeading>
          <div className="flex flex-col gap-1.5">
            {decisions
              .flatMap((d) => d.entries)
              .slice(0, 5)
              .map((e, i) => (
                <div key={i} className="rounded-r-lg border-l-2 border-white/[0.08] px-3 py-1.5 text-xs text-text-secondary transition-all duration-200 hover:border-brand/40">
                  <span className="line-clamp-1">{stripMarkdown(e.message).slice(0, 60)}</span>
                  <div className="mt-0.5 text-[10px] text-muted">
                    {e.agent} · {new Date(e.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            {decisions.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted">No activity yet</div>
            )}
          </div>
        </div>
      </div>
      <ExportModal open={showExport} onOpenChange={setShowExport} />
    </Shell>
  )
}

function PanelHeading({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
      <Icon size={13} className="text-brand" />
      {children}
    </h3>
  )
}

function EmptyState({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <Card variant="inset" className="flex flex-col items-center px-8 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-brand-subtle ring-hair">
        <Icon size={22} className="text-brand" />
      </div>
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      <p className="mt-1.5 max-w-[360px] text-sm leading-relaxed text-text-secondary">{desc}</p>
    </Card>
  )
}
