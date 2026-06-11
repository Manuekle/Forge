"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Modal } from "@/components/ui/modal"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Sparkles, Store, Cloud, Bot, ArrowRight } from "lucide-react"

interface CreateProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}

const templates = [
  { label: "Marketplace", icon: Store, desc: "Two-sided apps with payments", gradient: "from-[#C10801] to-[#F16001]" },
  { label: "SaaS", icon: Cloud, desc: "B2B tools and subscriptions", gradient: "from-[#F16001] to-[#E85002]" },
  { label: "AI Workspace", icon: Bot, desc: "Multi-agent products", gradient: "from-[#E85002] to-[#D9C3AB]" },
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
      onCreated?.()
      router.push(`/projects/${project.id}`)
    }
    setLoading(false)
  }

  async function handleTemplate(template: string, label: string) {
    setLoading(true)
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `New ${label}`,
        description: `Auto-generated from ${label} template`,
        template,
      }),
    })
    if (res.ok) {
      const project = await res.json()
      onOpenChange(false)
      onCreated?.()
      router.push(`/projects/${project.id}`)
    }
    setLoading(false)
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
            <Sparkles size={12} className="text-brand" />
            Or start from a template
          </div>
          <div className="grid grid-cols-3 gap-2">
            {templates.map((t, i) => {
              const Icon = t.icon
              return (
                <motion.button
                  key={t.label}
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  onClick={() => handleTemplate(t.label.toLowerCase().replace(" ", "-"), t.label)}
                  disabled={loading}
                  className="group rounded-2xl bg-surface-2 p-3.5 text-left ring-hair transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-3 lift-1 disabled:opacity-40"
                >
                  <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white shadow-brand transition-transform duration-200 group-hover:scale-105"
                    style={{ background: `linear-gradient(135deg, ${t.gradient})` }}>
                    <Icon size={15} />
                  </div>
                  <div className="text-xs font-medium text-text-primary">{t.label}</div>
                  <div className="mt-0.5 text-[10px] text-muted">{t.desc}</div>
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
              <ArrowRight size={13} />
            </span>
          </Button>
        </div>
      </form>
    </Modal>
  )
}
