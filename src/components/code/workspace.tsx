"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { useToast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"
import type { StoredCodeFile } from "@/lib/store"
import {
  SourceCodeIcon, File01Icon, Folder01Icon, FloppyDiskIcon, GitCommitIcon, RefreshIcon, SparklesIcon,
} from "@hugeicons/core-free-icons"
import { Icon } from "@/components/ui/icon"

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false })

const LANGUAGES: Record<string, string> = {
  ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript", mjs: "javascript", cjs: "javascript",
  json: "json", css: "css", scss: "scss", html: "html", md: "markdown", yml: "yaml", yaml: "yaml",
  py: "python", rb: "ruby", go: "go", rs: "rust", sql: "sql", sh: "shell", prisma: "graphql", env: "ini",
  toml: "ini", svg: "xml", xml: "xml",
}

function languageFor(path: string): string {
  const name = path.split("/").pop() || ""
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : ""
  return LANGUAGES[ext] || "plaintext"
}

type TreeNode = { name: string; path: string; file?: StoredCodeFile; children: TreeNode[] }

function buildTree(files: StoredCodeFile[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", children: [] }
  for (const file of files) {
    const parts = file.path.split("/")
    let node = root
    parts.forEach((part, i) => {
      const isLeaf = i === parts.length - 1
      let child = node.children.find((c) => c.name === part && !!c.file === isLeaf)
      if (!child) {
        child = { name: part, path: parts.slice(0, i + 1).join("/"), file: isLeaf ? file : undefined, children: [] }
        node.children.push(child)
      }
      node = child
    })
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => (!!a.file === !!b.file ? a.name.localeCompare(b.name) : a.file ? 1 : -1))
    nodes.forEach((n) => sort(n.children))
  }
  sort(root.children)
  return root.children
}

export function CodeWorkspace({ projectId }: { projectId: string }) {
  const { toast } = useToast()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme !== "light"

  const [files, setFiles] = useState<StoredCodeFile[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [showCommit, setShowCommit] = useState(false)
  const [commitMessage, setCommitMessage] = useState("")

  const active = files.find((f) => f.id === activeId) ?? null
  const tree = useMemo(() => buildTree(files), [files])

  useEffect(() => {
    fetch(`/api/projects/${projectId}/code`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: StoredCodeFile[]) => {
        const list = Array.isArray(data) ? data : []
        setFiles(list)
        if (list.length > 0) selectFile(list.find((f) => f.path === "README.md") ?? list[0])
      })
      .catch(() => setFiles([]))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  function selectFile(file: StoredCodeFile) {
    setActiveId(file.id)
    setDraft(file.content)
    setDirty(false)
  }

  async function handleGenerate() {
    setShowGenerate(false)
    setGenerating(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/code`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        const list: StoredCodeFile[] = Array.isArray(data) ? data : []
        setFiles(list)
        if (list.length > 0) selectFile(list.find((f) => f.path === "README.md") ?? list[0])
        toast({ title: "Code generated", description: `The engineer agent wrote ${list.length} files.`, variant: "success" })
      } else {
        toast({ title: "Code generation failed", description: data.error || "Something went wrong.", variant: "error" })
      }
    } catch {
      toast({ title: "Code generation failed", description: "Network error.", variant: "error" })
    }
    setGenerating(false)
  }

  async function handleSave() {
    if (!active || !dirty) return
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/code/${active.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      })
      if (res.ok) {
        const updated: StoredCodeFile = await res.json()
        setFiles((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
        setDirty(false)
        toast({ title: "File saved", description: active.path, variant: "success" })
      } else {
        const err = await res.json().catch(() => ({ error: "Save failed." }))
        toast({ title: "Failed to save file", description: err.error, variant: "error" })
      }
    } catch {
      toast({ title: "Failed to save file", description: "Network error.", variant: "error" })
    }
    setSaving(false)
  }

  async function handleCommit() {
    setCommitting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/code/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: commitMessage }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setShowCommit(false)
        toast({ title: "Committed to GitHub", description: data.message, variant: "success" })
      } else {
        toast({ title: "Commit failed", description: data.error || "Something went wrong.", variant: "error" })
      }
    } catch {
      toast({ title: "Commit failed", description: "Network error.", variant: "error" })
    }
    setCommitting(false)
  }

  if (loading) {
    return <div className="flex h-40 items-center justify-center text-xs text-muted">Loading workspace…</div>
  }

  if (files.length === 0) {
    return (
      <>
        <div className="relative overflow-hidden rounded-2xl bg-surface-2 px-8 py-14 text-center ring-hair">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-[0.07] blur-3xl"
            style={{ background: "radial-gradient(circle, #E85002 0%, transparent 70%)" }}
          />
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl glass-brand">
            <Icon icon={SourceCodeIcon} size={22} className="text-brand" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>
            Engineer agent
          </h3>
          <p className="mx-auto mt-2 max-w-[420px] text-xs leading-relaxed text-text-secondary">
            When the plan is settled, the engineer agent (GPT-4.1) reads the PRD, architecture, UX and backlog,
            then writes the initial codebase — ready to edit here and commit to GitHub.
          </p>
          <Button className="mt-6" onClick={() => setShowGenerate(true)} disabled={generating}>
            <Icon icon={SparklesIcon} size={14} />
            {generating ? "Engineer is coding…" : "Generate app code"}
          </Button>
          <AnimatePresence>
            {generating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mx-auto mt-5 flex max-w-[360px] items-center gap-2.5 rounded-2xl bg-surface-inset px-4 py-3 ring-hair" role="status" aria-live="polite">
                  <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-50" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
                  </span>
                  <span className="text-xs text-text-secondary">Reading deliverables and writing the scaffold — this can take a minute or two.</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <GenerateConfirm open={showGenerate} onOpenChange={setShowGenerate} onConfirm={handleGenerate} regenerate={false} />
      </>
    )
  }

  return (
    <>
      <div className="flex h-[580px] overflow-hidden rounded-2xl bg-surface-2 ring-hair">
        <aside className="flex w-60 flex-shrink-0 flex-col border-r border-border bg-surface-inset">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
              {files.length} file{files.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => setShowGenerate(true)}
              disabled={generating}
              className="flex h-6 w-6 items-center justify-center rounded-full text-muted transition-all duration-200 hover:bg-hover-strong hover:text-text-primary disabled:opacity-40"
              title="Regenerate from deliverables"
            >
              <Icon icon={RefreshIcon} size={13} className={generating ? "animate-spin" : ""} />
            </button>
          </div>
          <div className="flex-1 overflow-auto px-2 pb-3">
            <FileTree nodes={tree} depth={0} activeId={activeId} onSelect={selectFile} />
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <span className="truncate font-mono text-[11px] text-text-secondary">{active?.path}</span>
            {dirty && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" title="Unsaved changes" />}
            <div className="ml-auto flex items-center gap-1.5">
              <Button size="sm" variant="secondary" onClick={handleSave} disabled={!dirty || saving}>
                <Icon icon={FloppyDiskIcon} size={13} />
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setCommitMessage("")
                  setShowCommit(true)
                }}
              >
                <Icon icon={GitCommitIcon} size={13} />
                Commit
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            {active && (
              <MonacoEditor
                height="100%"
                language={languageFor(active.path)}
                theme={isDark ? "forge-dark" : "light"}
                path={active.path}
                value={draft}
                onChange={(value) => {
                  setDraft(value ?? "")
                  setDirty(true)
                }}
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
                  scrollBeyondLastLine: false,
                  padding: { top: 14, bottom: 14 },
                  automaticLayout: true,
                }}
              />
            )}
          </div>
        </main>
      </div>

      <GenerateConfirm open={showGenerate} onOpenChange={setShowGenerate} onConfirm={handleGenerate} regenerate />

      <Modal open={showCommit} onOpenChange={setShowCommit} title="Commit to GitHub" description="Push the current code to the project repository.">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Commit message</label>
            <Input
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="feat: initial app scaffold"
              onKeyDown={(e) => e.key === "Enter" && !committing && handleCommit()}
            />
          </div>
          <p className="text-xs leading-relaxed text-text-secondary">
            {files.length} file{files.length !== 1 ? "s" : ""} will be committed in a single commit to the default branch.
            {dirty && <span className="text-warning"> You have unsaved changes — save first or they won&apos;t be included.</span>}
          </p>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="secondary" size="sm" onClick={() => setShowCommit(false)} disabled={committing}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCommit} disabled={committing}>
              <Icon icon={GitCommitIcon} size={13} />
              {committing ? "Committing…" : "Commit & push"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

function FileTree({
  nodes, depth, activeId, onSelect,
}: {
  nodes: TreeNode[]
  depth: number
  activeId: string | null
  onSelect: (file: StoredCodeFile) => void
}) {
  return (
    <div className="flex flex-col">
      {nodes.map((node) => (
        <div key={node.path}>
          {node.file ? (
            <button
              onClick={() => onSelect(node.file!)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left font-mono text-[11px] transition-all duration-150",
                node.file.id === activeId
                  ? "bg-brand/12 text-brand"
                  : "text-text-secondary hover:bg-hover hover:text-text-primary"
              )}
              style={{ paddingLeft: 8 + depth * 14 }}
            >
              <Icon icon={File01Icon} size={12} className="flex-shrink-0 opacity-70" />
              <span className="truncate">{node.name}</span>
            </button>
          ) : (
            <>
              <div
                className="flex items-center gap-2 px-2 py-1.5 font-mono text-[11px] text-muted"
                style={{ paddingLeft: 8 + depth * 14 }}
              >
                <Icon icon={Folder01Icon} size={12} className="flex-shrink-0" />
                <span className="truncate">{node.name}</span>
              </div>
              <FileTree nodes={node.children} depth={depth + 1} activeId={activeId} onSelect={onSelect} />
            </>
          )}
        </div>
      ))}
    </div>
  )
}

function GenerateConfirm({
  open, onOpenChange, onConfirm, regenerate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  regenerate: boolean
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={regenerate ? "Regenerate code" : "Start the engineer agent"}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-text-secondary">
          {regenerate
            ? "The engineer agent will rewrite the entire scaffold from the latest deliverables. All current files — including your manual edits — will be replaced."
            : "The engineer agent (GPT-4.1) will read the PRD, architecture, UX and backlog, then write the initial codebase. Run it once the team's plan is settled."}
        </p>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm}>
            <Icon icon={SparklesIcon} size={13} />
            {regenerate ? "Regenerate" : "Start coding"}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
