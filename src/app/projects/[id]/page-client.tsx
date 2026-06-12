"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import { Shell } from "@/components/layout/shell"
import { AgentDebateCard } from "@/components/shared/agent-debate-card"
import { Markdown } from "@/components/ui/markdown"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { ExportModal } from "@/components/shared/export-modal"
import { RunContextModal } from "@/components/shared/run-context-modal"
import { Modal } from "@/components/ui/modal"
import { useToast } from "@/components/ui/toast"
import { OrchestrationGraph } from "@/components/orchestration/orchestration-graph"
import { ConsensusPanel } from "@/components/orchestration/consensus-panel"
import { HandoffFeed } from "@/components/orchestration/handoff-feed"
import { RunTimeline } from "@/components/orchestration/run-timeline"
import { CitationsPanel } from "@/components/orchestration/citations-panel"
import { RunHistory } from "@/components/orchestration/run-history"
import { deriveLiveView, STATE_LABELS } from "@/components/orchestration/derive"
import { AGENTS } from "@/lib/constants"
import { cn, formatDuration } from "@/lib/utils"
import {
  SparklesIcon,
  Car01Icon,
  SignalIcon,
  Telescope01Icon,
  Message01Icon,
  GlobeIcon,
  Download01Icon,
  Add01Icon,
  DatabaseIcon,
  ArrowRight02Icon,
  Cancel01Icon,
  KanbanIcon,
  PencilEdit01Icon,
  ArrowUpRight02Icon,
  SourceCodeIcon,
} from "@hugeicons/core-free-icons"
import { Icon, type IconSvgElement } from "@/components/ui/icon"
import { KanbanBoard } from "@/components/kanban/board"
import { CodeWorkspace } from "@/components/code/workspace"
import type { StoredProject, StoredDecision, StoredArtifact, StoredRun } from "@/lib/store"

const tabs = [
  { id: "orchestration", label: "Orchestration", icon: Telescope01Icon },
  { id: "deliverables", label: "Deliverables", icon: Car01Icon },
  { id: "board", label: "Board", icon: KanbanIcon },
  { id: "code", label: "Code", icon: SourceCodeIcon },
  { id: "decisions", label: "Decisions", icon: SignalIcon },
  { id: "sources", label: "Sources", icon: GlobeIcon },
  { id: "memory", label: "Memory", icon: DatabaseIcon },
] as const

const deliverableTypes = ["PRD", "Backlog", "Architecture", "UX", "QA", "Roadmap", "Business"] as const

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false })

type DecisionData = {
  id: string
  topic: string
  status: "open" | "voting" | "consensus"
  confidence?: number
  agentEntries: { agent: string; message: string; timestamp: string }[]
  consensus?: string
  createdAt: string
}

export default function ProjectPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const [params, setParams] = useState<{ id: string } | null>(null)

  useEffect(() => {
    paramsPromise.then(setParams)
  }, [paramsPromise])

  if (!params) return null
  return <ProjectPageInner projectId={params.id} />
}

function ProjectPageInner({ projectId }: { projectId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [project, setProject] = useState<StoredProject | null>(null)
  const [decisions, setDecisions] = useState<StoredDecision[]>([])
  const [artifacts, setArtifacts] = useState<StoredArtifact[]>([])
  const [runs, setRuns] = useState<StoredRun[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>("orchestration")
  const [activeDeliverable, setActiveDeliverable] = useState("PRD")
  const [running, setRunning] = useState(false)
  const [newTopic, setNewTopic] = useState("")
  const [showExport, setShowExport] = useState(false)
  const [showRunContext, setShowRunContext] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState(1)
  const [editingArtifact, setEditingArtifact] = useState(false)
  const [draftContent, setDraftContent] = useState("")
  const [savingArtifact, setSavingArtifact] = useState(false)
  const [debatingTopic, setDebatingTopic] = useState<string | null>(null)
  const [runElapsed, setRunElapsed] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Run id that existed before the user pressed "New run" — the poll ignores
  // it so a stale completed run can't be mistaken for the new one finishing.
  const baselineRunRef = useRef<string | null>(null)

  function load(onLoaded?: (artifacts: StoredArtifact[]) => void) {
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
        const fresh = Array.isArray(a) ? a : []
        setArtifacts(fresh)
        const freshRuns: StoredRun[] = Array.isArray(r) ? r : []
        setRuns(freshRuns)
        if (freshRuns[0]?.status === "running") startPolling()
        onLoaded?.(fresh)
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
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // Elapsed-time ticker while a run executes — concrete feedback that work is
  // happening even when the progress message hasn't changed yet.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!running) { setRunElapsed(0); return }
    const t = setInterval(() => setRunElapsed((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [running])

  /** Poll the run row while executing — events grow, graph animates live. */
  function startPolling() {
    if (pollRef.current) return
    setRunning(true)
    pollRef.current = setInterval(async () => {
      try {
        const runsRes = await fetch(`/api/projects/${projectId}/runs`)
        if (!runsRes.ok) return
        const all: StoredRun[] = await runsRes.json()
        setRuns(Array.isArray(all) ? all : [])
        const latest = all[0]
        if (!latest) return
        // The new run hasn't been created yet — keep waiting.
        if (latest.id === baselineRunRef.current && latest.status !== "running") return
        if (latest.status === "completed") {
          stopPolling()
          load((fresh) => {
            const latestOfType = fresh
              .filter((a) => a.type.toLowerCase() === activeDeliverable.toLowerCase())
              .sort((a, b) => b.version - a.version)[0]
            if (latestOfType) setSelectedVersion(latestOfType.version)
          })
          toast({ title: "Run complete", description: "Agents reached consensus and generated deliverables.", variant: "success" })
        } else if (latest.status === "failed") {
          stopPolling()
          toast({ title: "Run failed", description: "Check the Memory tab for the trace.", variant: "error" })
        }
      } catch { /* poll silently */ }
    }, 1500)
  }

  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = null
    setRunning(false)
  }

  async function handleNewRun() {
    setShowRunContext(true)
  }

  async function handleRunWithContext(brief: string) {
    setShowRunContext(false)
    setRunning(true)
    setActiveTab("orchestration")
    baselineRunRef.current = runs[0]?.id ?? null
    fetch(`/api/projects/${projectId}/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief }),
    })
      .then(async (res) => {
        if (res.ok || res.status === 500) return // success and run-failure are handled by the poll
        const body = await res.json().catch(() => null)
        stopPolling()
        toast({
          title: "Run could not start",
          description: body?.error ?? `The server rejected the request (${res.status}).`,
          variant: "error",
        })
        load()
      })
      .catch(() => {
        stopPolling()
        toast({ title: "Network error", description: "Could not reach the server to start the run.", variant: "error" })
      })
    startPolling()
  }

  async function handleApprove() {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    })
    if (res.ok) {
      const updated = await res.json()
      setProject(updated)
      toast({ title: "Project approved", description: "All deliverables have been reviewed and approved.", variant: "success" })
    } else {
      toast({ title: "Failed to approve", variant: "error" })
    }
  }

  async function handleReopen() {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    })
    if (res.ok) {
      const updated = await res.json()
      setProject(updated)
      toast({ title: "Project re-opened", description: "The project is back in active development.", variant: "brand" })
    } else {
      toast({ title: "Failed to re-open", variant: "error" })
    }
  }

  async function handleAddDecision() {
    if (!newTopic || debatingTopic) return
    const topic = newTopic
    setNewTopic("")
    setDebatingTopic(topic)
    toast({ title: "Debate started", description: `"${topic}" — the team is weighing in.`, variant: "brand" })
    fetch(`/api/projects/${projectId}/decisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    })
      .then((res) => {
        if (!res.ok) {
          toast({ title: "Debate failed", description: "The agents could not debate this topic. Try again.", variant: "error" })
          return
        }
        load()
        toast({ title: "Consensus reached", description: `The team resolved "${topic}".`, variant: "success" })
      })
      .catch(() => {
        toast({ title: "Network error", description: "Could not reach the server to start the debate.", variant: "error" })
      })
      .finally(() => setDebatingTopic(null))
  }

  const [parsingBacklog, setParsingBacklog] = useState(false)
  const [pushingToGitHub, setPushingToGitHub] = useState(false)

  async function handlePushToGitHub() {
    setPushingToGitHub(true)
    const res = await fetch(`/api/projects/${projectId}/github`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "push" }),
    })
    if (res.ok) {
      const data = await res.json()
      setProject((p) => (p ? { ...p, githubRepo: data.repo } : p))
      toast({ title: "Pushed to GitHub", description: data.message, variant: "success" })
    } else {
      const err = await res.json().catch(() => ({ error: "GitHub push failed." }))
      toast({ title: "GitHub push failed", description: err.error, variant: "error" })
    }
    setPushingToGitHub(false)
  }

  async function handleParseBacklog() {
    setParsingBacklog(true)
    const res = await fetch(`/api/projects/${projectId}/tasks/parse`, { method: "POST" })
    if (res.ok) {
      const data = await res.json()
      toast({ title: "Board generated", description: `${data.count} tasks created from backlog.`, variant: "success" })
    } else {
      const err = await res.json().catch(() => ({ error: "Could not parse backlog." }))
      toast({ title: "Failed to generate board", description: err.error, variant: "error" })
    }
    setParsingBacklog(false)
  }

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editRepo, setEditRepo] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" })
    if (res.ok) {
      toast({ title: "Project deleted", variant: "info" })
      router.push("/projects")
    } else {
      toast({ title: "Failed to delete project", variant: "error" })
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  function handleStartEdit() {
    setEditName(project?.name ?? "")
    setEditDescription(project?.description ?? "")
    setEditRepo(project?.githubRepo ?? "")
    setShowEdit(true)
  }

  async function handleSaveProject() {
    if (!editName.trim()) return
    setSaving(true)
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), description: editDescription.trim(), githubRepo: editRepo }),
    })
    if (res.ok) {
      const updated = await res.json()
      setProject(updated)
      setShowEdit(false)
      toast({ title: "Project updated", variant: "success" })
    } else {
      const err = await res.json().catch(() => ({ error: "Update failed." }))
      toast({ title: "Failed to update project", description: err.error, variant: "error" })
    }
    setSaving(false)
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
  const latestRun = runs[0] ?? null
  // The run shown in the orchestration view: a live one if running, else the
  // most recent completed run with events (replay), else the latest.
  const viewRun = latestRun?.status === "running"
    ? latestRun
    : runs.find((r) => r.status === "completed" && (r.events?.length ?? 0) > 0) ?? latestRun
  const view = deriveLiveView(viewRun)

  function handleStartEditArtifact() {
    if (!currentArtifact) return
    setDraftContent(currentArtifact.content)
    setEditingArtifact(true)
  }

  async function handleSaveArtifact() {
    if (!currentArtifact) return
    setSavingArtifact(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/artifacts/${currentArtifact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draftContent }),
      })
      if (res.ok) {
        const updated: StoredArtifact = await res.json()
        setArtifacts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
        setEditingArtifact(false)
        toast({ title: "Artifact saved", description: `${currentArtifact.title} updated.`, variant: "success" })
      } else {
        const err = await res.json().catch(() => ({ error: "Save failed." }))
        toast({ title: "Failed to save artifact", description: err.error, variant: "error" })
      }
    } catch {
      toast({ title: "Failed to save artifact", description: "Network error.", variant: "error" })
    }
    setSavingArtifact(false)
  }

  if (loading) {
    return (
      <Shell breadcrumb="Loading…" projectMode projectName="Loading…" projectDescription="Fetching workspace" projectStatus="planning">
        <div className="pointer-events-none fixed inset-0 bg-noise" />
        <div className="p-4 sm:p-6 lg:p-8">
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
        <div className="pointer-events-none fixed inset-0 bg-noise" />
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
      onEditProject={handleStartEdit}
    >
      <div className="pointer-events-none fixed inset-0 bg-noise" />
      <div className="flex min-h-0 flex-1">
        {/* Main Content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-[820px]">
            {/* Progress + Status Bar + Run control */}
            <div className="mb-7 flex flex-wrap items-center gap-3">
              <Progress value={project.progress} className="flex-1" />
              <span className="font-mono text-xs text-muted tabular-nums">{project.progress}% complete</span>
              {latestRun?.status === "completed" && latestRun.duration && (
                <Badge variant="active" dot>Run · {formatDuration(latestRun.duration)}</Badge>
              )}
              <Button onClick={handleNewRun} disabled={running} size="sm">
                <Icon icon={SparklesIcon} size={14} />
                {running ? "Running…" : "New run"}
              </Button>
            </div>

            {/* Live run status strip */}
            <AnimatePresence>
              {running && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2.5 rounded-2xl bg-surface-2 px-4 py-3 ring-hair lift-1" role="status" aria-live="polite">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-50" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
                    </span>
                    <span className="text-xs font-medium text-brand">
                      {latestRun?.status === "running" && latestRun.progress ? latestRun.progress : "Starting agents…"}
                    </span>
                    <span className="ml-auto flex items-center gap-3 font-mono text-[10px] text-muted">
                      <span>{view.timeline.length} events</span>
                      <span className="tabular-nums">{formatDuration(runElapsed)}</span>
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Review panel — shown when project is in_review */}
            {project.status === "in_review" && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-surface-2 px-4 py-2.5 ring-hair lift-1">
                  <span className="relative flex h-2 w-2 flex-shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-50" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-warning" />
                  </span>
                  <span className="text-xs font-medium text-warning">Ready for review</span>
                  <span className="hidden font-mono text-[10px] text-muted lg:inline">
                    {artifacts.length} artifact{artifacts.length !== 1 ? "s" : ""} · {decisions.length} decision{decisions.length !== 1 ? "s" : ""} · {runs.length} run{runs.length !== 1 ? "s" : ""}
                  </span>
                  <div className="ml-auto flex flex-wrap items-center gap-1.5">
                    <Button size="sm" variant="ghost" onClick={handleParseBacklog} disabled={parsingBacklog}>
                      <Icon icon={KanbanIcon} size={13} />
                      {parsingBacklog ? "Generating…" : "Generate board"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handlePushToGitHub} disabled={pushingToGitHub}>
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
                        <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.05.58 1.23.85.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                      </svg>
                      {pushingToGitHub ? (project.githubRepo ? "Syncing…" : "Pushing…") : (project.githubRepo ? "Sync GitHub" : "Push to GitHub")}
                    </Button>
                    {project.githubRepo && (
                      <Button size="sm" variant="ghost" onClick={() => window.open(project.githubRepo!, "_blank", "noopener")}>
                        <Icon icon={ArrowUpRight02Icon} size={13} />
                        View repo
                      </Button>
                    )}
                    <Button size="sm" onClick={handleApprove}>
                      <Icon icon={SignalIcon} size={13} />
                      Mark approved
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Approved notice */}
            {project.status === "approved" && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-surface-2 px-4 py-2.5 ring-hair lift-1">
                  <span className="h-2 w-2 flex-shrink-0 rounded-full bg-success" />
                  <span className="text-xs font-medium text-success">Approved</span>
                  <span className="hidden font-mono text-[10px] text-muted lg:inline">
                    {artifacts.length} artifact{artifacts.length !== 1 ? "s" : ""} · {decisions.length} decision{decisions.length !== 1 ? "s" : ""} · {runs.length} run{runs.length !== 1 ? "s" : ""}
                  </span>
                  <div className="ml-auto flex flex-wrap items-center gap-1.5">
                    <Button size="sm" variant="ghost" onClick={handlePushToGitHub} disabled={pushingToGitHub}>
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
                        <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.05.58 1.23.85.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                      </svg>
                      {pushingToGitHub ? (project.githubRepo ? "Syncing…" : "Pushing…") : (project.githubRepo ? "Sync GitHub" : "Push to GitHub")}
                    </Button>
                    {project.githubRepo && (
                      <Button size="sm" variant="ghost" onClick={() => window.open(project.githubRepo!, "_blank", "noopener")}>
                        <Icon icon={ArrowUpRight02Icon} size={13} />
                        View repo
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={handleReopen}>
                      Re-open
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tabs — pill segmented control */}
            <div className="mb-7 inline-flex gap-1 rounded-full bg-surface-inset p-1 ring-hair">
              {tabs.map((t) => {
                const TabIcon = t.icon
                const active = activeTab === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    aria-pressed={active}
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
                    <Icon icon={TabIcon} size={15} className={cn("relative z-10", active && "text-brand")} strokeWidth={active ? 2.4 : 1.8} />
                    <span className="relative z-10">{t.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Tab: Orchestration — the live multi-agent execution view */}
            {activeTab === "orchestration" && (
              <motion.div key="orchestration" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="flex flex-col gap-5">
                {viewRun ? (
                  <>
                    <Card variant="elevated" className="p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <SectionHeading icon={Telescope01Icon}>
                          Execution graph
                        </SectionHeading>
                        <span className="ml-auto font-mono text-[10px] font-normal normal-case tracking-normal text-muted">
                          run #{viewRun.id.slice(0, 6)}
                          {view.isLive && <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-brand-subtle px-2 py-0.5 text-[10px] font-medium text-brand">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
                            live
                          </span>}
                        </span>
                      </div>
                      <OrchestrationGraph view={view} />
                    </Card>

                    <Card variant="elevated" className="p-5">
                      <SectionHeading icon={SignalIcon}>Votes & consensus</SectionHeading>
                      <ConsensusPanel votes={viewRun.votes ?? {}} confidence={view.confidence} consensus={view.consensus} />
                    </Card>

                    <Card variant="elevated" className="p-5">
                      <SectionHeading icon={ArrowRight02Icon}>Agent handoffs</SectionHeading>
                      <HandoffFeed handoffs={view.handoffs} />
                    </Card>

                    <Card variant="elevated" className="p-5">
                      <SectionHeading icon={SparklesIcon}>Reasoning timeline</SectionHeading>
                      <RunTimeline events={view.timeline} compact />
                    </Card>
                  </>
                ) : (
                  <EmptyState
                    icon={Telescope01Icon}
                    title="No orchestration yet"
                    desc="Start a run — the orchestrator plans the team, agents collaborate, vote, and you watch it happen here live."
                  />
                )}
              </motion.div>
            )}

            {/* Tab: Board — kanban task board */}
            {activeTab === "board" && (
              <motion.div key="board" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                <Card variant="elevated" className="p-5">
                  <SectionHeading icon={KanbanIcon}>Task board</SectionHeading>
                  <KanbanBoard projectId={projectId} />
                </Card>
              </motion.div>
            )}

            {/* Tab: Code — engineer agent workspace */}
            {activeTab === "code" && (
              <motion.div key="code" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                <CodeWorkspace projectId={projectId} />
              </motion.div>
            )}

            {/* Tab: Deliverables */}
            {activeTab === "deliverables" && (
              <motion.div key="deliverables" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                <div className="mb-6 flex gap-1.5 overflow-auto pb-1">
                  {deliverableTypes.map((t) => {
                    const active = activeDeliverable === t
                    return (
                      <button
                        key={t}
                        onClick={() => { setActiveDeliverable(t); setSelectedVersion(1); setEditingArtifact(false) }}
                        aria-pressed={active}
                        className={cn(
                          "whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-all duration-200",
                          active
                            ? "bg-surface-2 font-medium text-text-primary lift-1"
                            : "text-text-secondary hover:bg-hover hover:text-text-primary"
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
                                onClick={() => { setSelectedVersion(a.version); setEditingArtifact(false) }}
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
                        {!editingArtifact && (
                          <Button size="sm" variant="secondary" onClick={handleStartEditArtifact}>
                            <Icon icon={PencilEdit01Icon} size={14} />
                            Edit
                          </Button>
                        )}
                        <Button size="sm" onClick={() => setShowExport(true)}>
                          <Icon icon={Download01Icon} size={14} />
                          Export
                        </Button>
                      </div>
                    </div>
                    <div className="px-6 pb-6">
                      {editingArtifact ? (
                        <div className="flex flex-col gap-3">
                          <div className="overflow-hidden rounded-2xl ring-hair">
                            <MonacoEditor
                              height="400px"
                              language="markdown"
                              theme="forge-dark"
                              value={draftContent}
                              onChange={(value) => setDraftContent(value ?? "")}
                              beforeMount={(monaco) => {
                                monaco.editor.defineTheme("forge-dark", {
                                  base: "vs-dark",
                                  inherit: true,
                                  rules: [],
                                  colors: {
                                    "editor.background": "#0C0C0E",
                                    "editor.lineHighlightBackground": "#141417",
                                    "editorLineNumber.foreground": "#4A4A4F",
                                    "editorGutter.background": "#0C0C0E",
                                  },
                                })
                              }}
                              options={{
                                minimap: { enabled: false },
                                fontSize: 13,
                                wordWrap: "on",
                                scrollBeyondLastLine: false,
                                padding: { top: 16, bottom: 16 },
                              }}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="secondary" onClick={() => setEditingArtifact(false)} disabled={savingArtifact}>
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleSaveArtifact} disabled={savingArtifact}>
                              {savingArtifact ? "Saving…" : "Save"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl bg-surface-inset p-5 text-xs leading-relaxed text-text-secondary ring-hair">
                          <Markdown content={currentArtifact.content} />
                        </div>
                      )}
                    </div>
                  </Card>
                ) : (
                  <EmptyState icon={Car01Icon} title={`No ${activeDeliverable} artifact yet`} desc="Run the agents to generate this deliverable." />
                )}
              </motion.div>
            )}

            {/* Tab: Decisions — debates, votes, consensus per topic */}
            {activeTab === "decisions" && (
              <motion.div key="decisions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                <div className="flex flex-col gap-4">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Add a decision topic for debate…"
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddDecision()}
                        icon={<Icon icon={Add01Icon} size={16} />}
                      />
                    </div>
                    <Button onClick={handleAddDecision} disabled={!newTopic || !!debatingTopic}>
                      Add
                    </Button>
                  </div>

                  {debatingTopic && (
                    <div className="flex items-center gap-3 rounded-[var(--radius-card)] bg-surface-2 px-5 py-4 ring-hair lift-1" role="status" aria-live="polite">
                      <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-50" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-text-primary">{debatingTopic}</div>
                        <div className="text-xs text-text-secondary">PM, Architect and QA are debating — this usually takes under a minute.</div>
                      </div>
                    </div>
                  )}

                  {mappedDecisions.map((d) => (
                    <AgentDebateCard key={d.id} decision={d} />
                  ))}

                  {mappedDecisions.length === 0 && !running && !debatingTopic && (
                    <EmptyState icon={Message01Icon} title="No debates yet" desc="Add a topic or start a run to watch the team deliberate." />
                  )}
                </div>
              </motion.div>
            )}

            {/* Tab: Sources — grounded citations */}
            {activeTab === "sources" && (
              <motion.div key="sources" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                <Card variant="elevated" className="p-5">
                  <SectionHeading icon={GlobeIcon}>
                    Grounded sources
                    {viewRun && (
                      <span className="ml-auto font-mono text-[10px] font-normal normal-case tracking-normal text-muted">
                        run #{viewRun.id.slice(0, 6)}
                      </span>
                    )}
                  </SectionHeading>
                  <p className="mb-4 text-xs leading-relaxed text-text-secondary">
                    Every run retrieves evidence before agents reason. Outputs cite these sources inline as [S#].
                  </p>
                  <CitationsPanel citations={viewRun?.citations ?? []} />
                </Card>
              </motion.div>
            )}

            {/* Tab: Memory — run history, evolution, raw trace */}
            {activeTab === "memory" && (
              <motion.div key="memory" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="flex flex-col gap-5">
                <Card variant="elevated" className="p-5">
                  <SectionHeading icon={DatabaseIcon}>Project evolution</SectionHeading>
                  <p className="mb-4 text-xs leading-relaxed text-text-secondary">
                    Each run reads the memory of previous runs — decisions carry forward, artifacts version up.
                  </p>
                  <RunHistory runs={runs} artifacts={artifacts} decisions={decisions} />
                </Card>

                {latestRun && latestRun.trace.length > 0 && (
                  <Card variant="elevated" className="p-5">
                    <SectionHeading icon={Telescope01Icon}>Foundry IQ trace · run #{latestRun.id.slice(0, 6)}</SectionHeading>
                    <div className="rounded-2xl bg-surface-inset p-5 font-mono text-xs ring-hair">
                      <div className="flex flex-col gap-1">
                        {latestRun.trace.map((t, i) => (
                          <div key={i} className="relative -ml-px flex gap-4 border-l border-hairline py-1 pl-4">
                            <div className="absolute left-[-3.5px] top-2 h-[6px] w-[6px] rounded-full"
                              style={{ backgroundColor: t.action.includes("consensus") || t.action.includes("complete") ? "#E85002" : "rgba(128,128,128,0.35)" }} />
                            <span className="w-[65px] flex-shrink-0 text-brand">{t.time}</span>
                            <span className="w-[180px] flex-shrink-0 text-text-secondary">{t.action}</span>
                            <span className="min-w-0 text-muted">{t.detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="hidden w-[280px] flex-shrink-0 flex-col overflow-auto p-5 shadow-[inset_1px_0_0_var(--color-hairline)] xl:flex">
          <PanelHeading icon={SparklesIcon}>AI Team</PanelHeading>
          <div className="mb-7 flex flex-col gap-1">
            <AgentTeamList view={view} />
          </div>

          <PanelHeading icon={Car01Icon}>Artifacts</PanelHeading>
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
                  className="flex items-center gap-2.5 rounded-full px-3 py-2 text-left text-xs text-text-secondary transition-all duration-200 hover:bg-hover hover:text-text-primary"
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

          <PanelHeading icon={ArrowRight02Icon}>Latest handoffs</PanelHeading>
          <div className="flex flex-col gap-1.5">
            {view.handoffs.length > 0 ? (
              view.handoffs.slice(-5).reverse().map((h, i) => (
                <div key={i} className="rounded-r-lg border-l-2 border-hairline px-3 py-1.5 text-xs text-text-secondary transition-all duration-200 hover:border-brand/40">
                  <span className="line-clamp-1">{h.detail}</span>
                  <div className="mt-0.5 font-mono text-[10px] text-muted">{h.at}</div>
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-muted">No handoffs yet</div>
            )}
          </div>

          {/* Delete */}
          <div className="pt-6">
            <button onClick={() => setShowDeleteConfirm(true)} className="flex w-full items-center gap-2 rounded-full px-3 py-2 text-xs text-error/70 transition-all duration-200 hover:bg-error/10 hover:text-error">
              <Icon icon={Cancel01Icon} size={13} />
              Delete project
            </button>
          </div>
        </div>
      </div>
      <RunContextModal
        open={showRunContext}
        onOpenChange={setShowRunContext}
        projectName={project?.name ?? ""}
        onConfirm={handleRunWithContext}
        loading={running}
      />
      <ExportModal
        open={showExport}
        onOpenChange={setShowExport}
        projectId={projectId}
        projectName={project?.name}
        artifacts={artifacts}
        decisions={decisions}
      />

      <Modal open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm} title="Delete project">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error/15 mb-4">
            <Icon icon={Cancel01Icon} size={22} className="text-error" />
          </div>
          <p className="text-sm text-text-secondary max-w-[320px]">
            This will permanently delete <span className="font-medium text-text-primary">{project?.name}</span> and all of its artifacts, decisions, and runs. This action cannot be undone.
          </p>
          <div className="flex gap-2 mt-6 w-full">
            <Button type="button" variant="secondary" size="md" className="flex-1" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button type="button" variant="outline" size="md" className="flex-1 border-error/30 text-error hover:bg-error/12" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showEdit} onOpenChange={setShowEdit} title="Edit project">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Name</label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Project name"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Description</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Brief description of the project"
              rows={4}
              className="w-full rounded-2xl bg-surface-2 p-4 text-sm text-text-primary placeholder:text-faint outline-none ring-hair transition-all duration-200 focus:ring-hair-strong focus:bg-surface-3 resize-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">GitHub repository</label>
            <Input
              value={editRepo}
              onChange={(e) => setEditRepo(e.target.value)}
              placeholder="https://github.com/owner/repo or owner/repo"
            />
            <p className="mt-1.5 text-[11px] leading-relaxed text-text-secondary">
              Link an existing repo to push there instead of creating one. Docs go to <code className="rounded bg-surface-inset px-1 font-mono text-[10px]">FORGE.md</code> in linked repos so your README is never touched. Leave empty and Forge creates a repo on first push.
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" size="md" className="flex-1" onClick={() => setShowEdit(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" size="md" className="flex-1" onClick={handleSaveProject} disabled={saving || !editName.trim()}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </Modal>
    </Shell>
  )
}

/** Real per-agent status from the run's event stream — no fake online dots. */
function AgentTeamList({ view }: { view: ReturnType<typeof deriveLiveView> }) {
  const orchestrator = AGENTS.orchestrator
  const skippedSet = new Map(view.skipped.map((s) => [s.agent, s.reason]))
  const stateByAgent = new Map(view.nodes.map((n) => [n.agent, n]))
  const roster = ["pm", "ux", "architect", "qa", "scrum", "business"]

  return (
    <>
      <div className="flex items-center gap-2.5 rounded-full px-3 py-2 text-xs transition-all duration-200 hover:bg-hover">
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-white" style={{ background: orchestrator.color }}>
          <Icon icon={orchestrator.icon} size={11} />
        </span>
        <span className="text-text-secondary">{orchestrator.label}</span>
        <span className="ml-auto text-[10px] text-muted">
          {view.isLive ? "coordinating" : view.nodes.length > 0 ? "coordinated" : "idle"}
        </span>
      </div>
      {roster.map((agentKey) => {
        const agent = AGENTS[agentKey]
        const node = stateByAgent.get(agentKey)
        const skipReason = skippedSet.get(agentKey)
        const status = node
          ? STATE_LABELS[node.state].toLowerCase()
          : skipReason
            ? "skipped"
            : view.nodes.length > 0
              ? "not in plan"
              : "idle"
        return (
          <div
            key={agentKey}
            className={cn(
              "flex items-center gap-2.5 rounded-full px-3 py-2 text-xs transition-all duration-200 hover:bg-hover",
              (skipReason || (!node && view.nodes.length > 0)) && "opacity-55"
            )}
            title={skipReason || node?.reason || undefined}
          >
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-white" style={{ background: agent.color }}>
              <Icon icon={agent.icon} size={11} />
            </span>
            <span className="text-text-secondary">{agent.label}</span>
            <span className="ml-auto flex items-center gap-1.5 text-[10px] text-muted">
              {node?.active && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: agent.color }} />
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: agent.color }} />
                </span>
              )}
              {node?.state === "completed" && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
              {status}
            </span>
          </div>
        )
      })}
    </>
  )
}

function SectionHeading({ icon: IconComponent, children }: { icon: IconSvgElement; children: React.ReactNode }) {
  return (
    <h3 className="mb-4 flex items-center gap-2 text-[11px] font-semibold text-muted">
      <Icon icon={IconComponent} size={13} className="text-brand" />
      {children}
    </h3>
  )
}

function PanelHeading({ icon: IconComponent, children }: { icon: IconSvgElement; children: React.ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold text-muted">
      <Icon icon={IconComponent} size={13} className="text-brand" />
      {children}
    </h3>
  )
}

function EmptyState({ icon: IconComponent, title, desc }: { icon: IconSvgElement; title: string; desc: string }) {
  return (
    <Card variant="inset" className="flex flex-col items-center px-8 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-brand-subtle ring-hair">
        <Icon icon={IconComponent} size={22} className="text-brand" />
      </div>
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      <p className="mt-1.5 max-w-[360px] text-sm leading-relaxed text-text-secondary">{desc}</p>
    </Card>
  )
}
