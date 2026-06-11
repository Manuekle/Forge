"use client"

import { useState } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { SparklesIcon, File01Icon } from "@hugeicons/core-free-icons"
import { Icon } from "@/components/ui/icon"

interface RunContextModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectName: string
  onConfirm: (brief: string) => void
  loading?: boolean
}

export function RunContextModal({ open, onOpenChange, projectName, onConfirm, loading }: RunContextModalProps) {
  const [brief, setBrief] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!brief.trim()) {
      onConfirm("")
    } else {
      onConfirm(brief.trim())
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Describe your idea" description="Provide detailed context for the AI agents">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1.5">
            Project
          </label>
          <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3.5 py-2.5 ring-hair">
            <Icon icon={File01Icon} size={14} className="text-brand" />
            <span className="text-sm text-text-primary">{projectName}</span>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1.5">
            What do you want to build? Describe your idea in detail
          </label>
          <textarea
            placeholder="Describe your product idea, target audience, key features, constraints, goals... anything the agents should know."
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={8}
            className="w-full resize-none rounded-2xl bg-surface-2 px-4 py-3 text-sm text-text-primary placeholder:text-muted ring-hair transition-all duration-200 focus:outline-none focus:ring-brand/40 focus:ring-2"
            autoFocus
          />
          <p className="mt-1.5 text-[11px] text-muted">
            Tip: Include details like target users, main features, tech preferences, deadlines, or business goals.
          </p>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={loading}>
            <span className="flex items-center gap-1.5">
              {loading ? "Starting run..." : "Start run"}
              <Icon icon={SparklesIcon} size={13} />
            </span>
          </Button>
        </div>
      </form>
    </Modal>
  )
}
