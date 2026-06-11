"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard, FolderKanban, Bot, Settings, ArrowLeft,
  Sparkles, Plus, Layers, GitBranch, Scale
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { AGENTS } from "@/lib/constants"
import type { StoredProject } from "@/lib/store"
import type { AgentType } from "@/types"

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Agents", href: "/agents", icon: Bot },
  { label: "Settings", href: "/settings", icon: Settings },
]

interface SidebarProps {
  projectMode?: boolean
  projectName?: string
  projectDescription?: string
  projectStatus?: string
  onBack?: () => void
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-3 pb-6 pt-6">
      <div className="flex h-8 w-8 items-center justify-center rounded-[11px] gradient-brand glow-brand">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      <span className="text-[17px] font-semibold tracking-tight" style={{ fontFamily: "var(--font-syne)" }}>Forge</span>
    </div>
  )
}

function UserCard() {
  return (
    <div className="m-2 flex items-center gap-3 rounded-2xl bg-surface-2 p-3 lift-1">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full gradient-brand text-[11px] font-bold text-white">
        DR
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium text-text-primary">Dana Reyes</div>
        <div className="flex items-center gap-1 text-[10px] text-muted">
          <Sparkles size={10} className="text-brand" />
          Forge Pro
        </div>
      </div>
    </div>
  )
}

export function Sidebar({ projectMode, projectName, projectDescription, projectStatus }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [recentProjects, setRecentProjects] = useState<StoredProject[]>([])

  useEffect(() => {
    if (!projectMode) {
      fetch("/api/projects")
        .then((r) => r.json())
        .then(setRecentProjects)
        .catch(() => {})
    }
  }, [projectMode])

  if (projectMode) {
    return (
      <ProjectSidebar
        name={projectName || "Project"}
        description={projectDescription || ""}
        status={projectStatus || "planning"}
        onBack={() => router.push("/projects")}
      />
    )
  }

  return (
    <div className="flex w-[240px] flex-shrink-0 flex-col px-2">
      <Logo />

      <div className="flex flex-col gap-0.5 px-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === "/dashboard" && pathname === "/")
          const Icon = item.icon
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                "flex items-center gap-3 rounded-full px-3.5 py-2.5 text-left text-sm transition-all duration-200",
                isActive
                  ? "bg-surface-2 font-medium text-text-primary lift-1"
                  : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
              )}
            >
              <Icon size={17} strokeWidth={isActive ? 2.4 : 1.8} className={isActive ? "text-brand" : ""} />
              {item.label}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between px-4 pb-2 pt-7">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Projects</span>
        <button
          onClick={() => router.push("/projects")}
          className="flex h-5 w-5 items-center justify-center rounded-full text-muted transition-all hover:bg-white/[0.06] hover:text-text-primary"
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-0.5 overflow-auto px-1">
        {recentProjects.slice(0, 6).map((p) => (
          <button
            key={p.id}
            onClick={() => router.push(`/projects/${p.id}`)}
            className={cn(
              "flex items-center gap-2.5 rounded-full px-3.5 py-2 text-left text-sm transition-all duration-200",
              pathname === `/projects/${p.id}`
                ? "bg-surface-2 text-text-primary lift-1"
                : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
            )}
          >
            <span className={cn(
              "h-1.5 w-1.5 flex-shrink-0 rounded-full",
              p.status === "active" ? "bg-success" : p.status === "planning" ? "bg-info" : p.status === "in_review" ? "bg-warning" : "bg-muted"
            )} />
            <span className="truncate">{p.name}</span>
          </button>
        ))}
        {recentProjects.length === 0 && (
          <div className="px-4 py-2 text-xs text-muted">No projects yet</div>
        )}
      </div>

      <UserCard />
    </div>
  )
}

const wsNavItems = [
  { label: "Collaboration", href: "feed", icon: GitBranch },
  { label: "Deliverables", href: "deliverables", icon: Layers },
  { label: "Decision history", href: "decisions", icon: Scale },
  { label: "Foundry IQ", href: "iq", icon: Sparkles },
]

const wsAgents: AgentType[] = [
  "orchestrator", "pm", "ux", "architect", "qa", "scrum", "business",
]

function ProjectSidebar({
  name, description, status, onBack,
}: {
  name: string
  description: string
  status: string
  onBack: () => void
}) {
  const statusVariant =
    status === "active" ? "active" : status === "in_review" ? "in_review" : status === "archived" ? "archived" : "planning"

  return (
    <div className="flex w-[240px] flex-shrink-0 flex-col px-2">
      <button
        onClick={onBack}
        className="mx-1 mb-2 mt-5 flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-xs text-muted transition-colors duration-200 hover:bg-white/[0.04] hover:text-text-primary"
      >
        <ArrowLeft size={14} />
        <span>Projects</span>
      </button>

      <div className="mx-1 mb-4 rounded-2xl bg-surface-2 p-4 lift-1">
        <div className="truncate text-sm font-semibold text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>{name}</div>
        <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-secondary">{description}</div>
        <div className="mt-2.5">
          <Badge variant={statusVariant} dot />
        </div>
      </div>

      <div className="flex flex-col gap-0.5 px-1">
        {wsNavItems.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.href}
              className="flex cursor-default items-center gap-3 rounded-full px-3.5 py-2.5 text-sm text-text-secondary transition-all duration-200 hover:bg-white/[0.04] hover:text-text-primary"
            >
              <Icon size={17} strokeWidth={1.8} />
              {item.label}
            </div>
          )
        })}
      </div>

      <div className="px-4 pb-2 pt-6 text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
        AI Team
      </div>
      <div className="flex flex-1 flex-col gap-0.5 overflow-auto px-1">
        {wsAgents.map((agentKey) => {
          const agent = AGENTS[agentKey]
          return (
            <div
              key={agentKey}
              className="flex items-center gap-2.5 rounded-full px-3.5 py-2 text-xs text-text-secondary"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-[7px] text-[8px] font-bold"
                style={{ backgroundColor: `${agent.color}1F`, color: agent.color }}>
                {agentKey === "orchestrator" ? "OR" : agentKey.slice(0, 2).toUpperCase()}
              </span>
              {agent.label}
            </div>
          )
        })}
      </div>

      <UserCard />
    </div>
  )
}
