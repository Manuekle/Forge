"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import {
  FileText, Check, Download, ExternalLink, Code, BookOpen,
  GitBranch, Layers
} from "lucide-react"

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const formats = [
  {
    id: "pdf",
    label: "PDF",
    desc: "Formatted document ready to share",
    icon: FileText,
    color: "#F97316",
  },
  {
    id: "markdown",
    label: "Markdown",
    desc: "Plain text with formatting",
    icon: BookOpen,
    color: "#FB923C",
  },
  {
    id: "notion",
    label: "Notion",
    desc: "Push directly to a Notion page",
    icon: ExternalLink,
    color: "#FCD34D",
  },
  {
    id: "jira",
    label: "Jira",
    desc: "Create Jira epic with all stories",
    icon: GitBranch,
    color: "#A78BFA",
  },
  {
    id: "github",
    label: "GitHub",
    desc: "Generate a repository structure",
    icon: Code,
    color: "#4A9FF9",
  },
  {
    id: "json",
    label: "JSON",
    desc: "Raw structured export for APIs",
    icon: Layers,
    color: "#2ED47A",
  },
]

export function ExportModal({ open, onOpenChange }: ExportModalProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    if (!selected) return
    setExporting(true)
    await new Promise((r) => setTimeout(r, 1200))
    setExporting(false)
    setSelected(null)
    onOpenChange(false)
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Export" description="Choose a format to export your project artifacts.">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {formats.map((f, i) => {
            const Icon = f.icon
            const isSelected = selected === f.id
            return (
              <motion.button
                key={f.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.04 }}
                onClick={() => setSelected(f.id)}
                className={`relative rounded-2xl p-3.5 text-left transition-all duration-200 ${
                  isSelected
                    ? "glass-brand"
                    : "bg-surface-2 ring-hair hover:-translate-y-0.5 hover:bg-surface-3 lift-1"
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="export-check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand shadow-brand"
                  >
                    <Check size={11} className="text-white" />
                  </motion.div>
                )}
                <div className="mb-1.5 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${f.color}22` }}>
                    <Icon size={15} style={{ color: f.color }} />
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
          <Button size="sm" disabled={!selected || exporting} onClick={handleExport}>
            <span className="flex items-center gap-1.5">
              {exporting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Exporting...
                </>
              ) : (
                <>
                  <Download size={13} />
                  Export
                </>
              )}
            </span>
          </Button>
        </div>
      </div>
    </Modal>
  )
}
