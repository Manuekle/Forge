"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import type { StoredArtifact, StoredDecision } from "@/lib/store"
import {
  File01Icon, Tick01Icon, Download01Icon, ArrowUpRight02Icon, SourceCodeIcon, Book01Icon,
  GitBranchIcon, Layers01Icon
} from "@hugeicons/core-free-icons"
import { Icon } from "@/components/ui/icon"

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectName?: string
  artifacts?: StoredArtifact[]
  decisions?: StoredDecision[]
}

const formats = [
  {
    id: "markdown",
    label: "Markdown",
    desc: "All artifacts as a single .md document",
    icon: Book01Icon,
    color: "#FB923C",
    available: true,
  },
  {
    id: "json",
    label: "JSON",
    desc: "Raw structured export for APIs",
    icon: Layers01Icon,
    color: "#2ED47A",
    available: true,
  },
  {
    id: "pdf",
    label: "PDF",
    desc: "Coming soon",
    icon: File01Icon,
    color: "#F97316",
    available: false,
  },
  {
    id: "notion",
    label: "Notion",
    desc: "Coming soon",
    icon: ArrowUpRight02Icon,
    color: "#FCD34D",
    available: false,
  },
  {
    id: "jira",
    label: "Jira",
    desc: "Coming soon",
    icon: GitBranchIcon,
    color: "#A78BFA",
    available: false,
  },
  {
    id: "github",
    label: "GitHub",
    desc: "Coming soon",
    icon: SourceCodeIcon,
    color: "#4A9FF9",
    available: false,
  },
]

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project"
}

export function ExportModal({ open, onOpenChange, projectName = "Project", artifacts = [], decisions = [] }: ExportModalProps) {
  const { toast } = useToast()
  const [selected, setSelected] = useState<string | null>(null)

  // Latest version of each artifact type only.
  function latestArtifacts(): StoredArtifact[] {
    const latest = new Map<string, StoredArtifact>()
    for (const a of artifacts) {
      if ((latest.get(a.type)?.version ?? 0) < a.version) latest.set(a.type, a)
    }
    return [...latest.values()]
  }

  function handleExport() {
    if (!selected) return
    const docs = latestArtifacts()
    if (docs.length === 0) {
      toast({ title: "Nothing to export", description: "Run the agents first to generate deliverables.", variant: "error" })
      return
    }

    if (selected === "markdown") {
      const md = [
        `# ${projectName}`,
        "",
        ...docs.flatMap((a) => [`\n\n---\n\n# ${a.title} (v${a.version})\n`, a.content]),
      ].join("\n")
      downloadBlob(`${slug(projectName)}.md`, md, "text/markdown")
    } else if (selected === "json") {
      const payload = {
        project: projectName,
        exportedAt: new Date().toISOString(),
        artifacts: docs.map((a) => ({ type: a.type, title: a.title, version: a.version, content: a.content })),
        decisions: decisions.map((d) => ({
          topic: d.topic, status: d.status, consensus: d.consensus, confidence: d.confidence, entries: d.entries,
        })),
      }
      downloadBlob(`${slug(projectName)}.json`, JSON.stringify(payload, null, 2), "application/json")
    }

    toast({ title: "Export ready", description: `Downloaded ${docs.length} artifacts as ${selected === "markdown" ? "Markdown" : "JSON"}.`, variant: "success" })
    setSelected(null)
    onOpenChange(false)
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Export" description="Choose a format to export your project artifacts.">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {formats.map((f, i) => {
            const iconObj = f.icon
            const isSelected = selected === f.id
            return (
              <motion.button
                key={f.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.04 }}
                onClick={() => f.available && setSelected(f.id)}
                disabled={!f.available}
                className={`relative rounded-2xl p-3.5 text-left transition-all duration-200 ${
                  isSelected
                    ? "glass-brand"
                    : f.available
                      ? "bg-surface-2 ring-hair hover:-translate-y-0.5 hover:bg-surface-3 lift-1"
                      : "bg-surface-2 ring-hair opacity-45 cursor-not-allowed"
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="export-check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand shadow-brand"
                  >
                    <Icon icon={Tick01Icon} size={11} className="text-white" />
                  </motion.div>
                )}
                <div className="mb-1.5 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${f.color}22` }}>
                    <Icon icon={iconObj} size={15} style={{ color: f.color }} />
                  </div>
                  <span className="text-sm font-medium text-text-primary">{f.label}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-text-secondary">{f.desc}</p>
              </motion.button>
            )
          })}
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-border">
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" disabled={!selected} onClick={handleExport}>
            <span className="flex items-center gap-1.5">
              <Icon icon={Download01Icon} size={13} />
              Export
            </span>
          </Button>
        </div>
      </div>
    </Modal>
  )
}
