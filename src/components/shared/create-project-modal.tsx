"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { SparklesIcon, Layers01Icon, Rocket01Icon, BrainIcon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { Icon } from "@/components/ui/icon"
import { Modal } from "@/components/ui/modal"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { invalidateProjects } from "@/lib/use-projects"

interface CreateProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}

const templates = [
  { label: "Marketplace", icon: Layers01Icon, desc: "Two-sided apps with buyers, sellers, and payments", gradient: "#C10801, #F16001" },
  { label: "SaaS Product", icon: Rocket01Icon, desc: "B2B tools with subscriptions and dashboards", gradient: "#F16001, #E85002" },
  { label: "AI Workspace", icon: BrainIcon, desc: "Multi-agent AI products with reasoning and memory", gradient: "#E85002, #D9C3AB" },
]

export function CreateProjectModal({ open, onOpenChange, onCreated }: CreateProjectModalProps) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [desc, setDesc] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name) return
    setLoading(true)
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: desc }),
    })
    if (res.ok) {
      const project = await res.json()
      setName("")
      setDesc("")
      onOpenChange(false)
      invalidateProjects()
      onCreated?.()
      router.push(`/projects/${project.id}`)
    }
    setLoading(false)
  }

  function handleTemplate(label: string) {
    setName(`New ${label}`)
    setDesc(`Auto-generated from ${label} template`)
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="New project" description="Describe your idea or use a template.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1.5">Project name</label>
          <Input
            placeholder="e.g. HomePlate"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1.5">Description</label>
          <Input
            placeholder="What does your product do?"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>

        <div className="pt-2">
          <div className="text-xs font-medium text-text-secondary mb-3 flex items-center gap-2">
            <Icon icon={SparklesIcon} size={12} className="text-brand" />
            Or start from a template
          </div>
          <div className="grid grid-cols-3 gap-2">
            {templates.map((t, i) => {
              const iconObj = t.icon
              return (
                  <motion.button
                    key={t.label}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    onClick={() => handleTemplate(t.label)}
                    disabled={loading}
                    className="group rounded-2xl bg-surface p-4 text-left ring-hair transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-2 hover:ring-hair-strong lift-1 disabled:opacity-40"
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold text-white shadow-brand transition-transform duration-200 group-hover:scale-110"
                      style={{ background: `linear-gradient(135deg, ${t.gradient})` }}>
                      <Icon icon={iconObj} size={17} />
                    </div>
                    <div className="text-sm font-semibold text-text-primary">{t.label}</div>
                    <div className="mt-0.5 text-[11px] leading-snug text-muted">{t.desc}</div>
                  </motion.button>
              )
            })}
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!name || loading}>
            <span className="flex items-center gap-1.5">
              {loading ? "Creating..." : "Create project"}
              <Icon icon={ArrowRight01Icon} size={13} />
            </span>
          </Button>
        </div>
      </form>
    </Modal>
  )
}
