"use client"

import { useEffect, useState, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  DashboardSquare01Icon, AiFolder01Icon, ChatBotIcon, Settings02Icon, ArrowLeft01Icon, Add01Icon, SparklesIcon, Logout01Icon, Menu01Icon, AiUserIcon
} from "@hugeicons/core-free-icons"
import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { AGENTS } from "@/lib/constants"
import type { StoredProject } from "@/lib/store"
import type { AgentType } from "@/types"

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: DashboardSquare01Icon },
  { label: "Projects", href: "/projects", icon: AiFolder01Icon },
  { label: "Agents", href: "/agents", icon: ChatBotIcon },
  { label: "Settings", href: "/settings", icon: Settings02Icon },
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
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div ref={ref} className="relative m-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-2xl bg-surface-2 p-3 text-left lift-1 transition-colors hover:bg-surface-3"
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full gradient-brand text-white">
          <Icon icon={AiUserIcon} size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-text-primary">Dana Reyes</div>
          <div className="flex items-center gap-1 text-[10px] text-muted">
            <Icon icon={SparklesIcon} size={10} className="text-brand" />
            Forge Pro
          </div>
        </div>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 overflow-hidden rounded-xl bg-surface-2 p-1 shadow-lg ring-hair">
          <button
            onClick={() => { router.push("/settings"); setOpen(false) }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary"
          >
            <Icon icon={Settings02Icon} size={14} />
            Settings
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-error/12 hover:text-error"
          >
            <Icon icon={Logout01Icon} size={14} />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export function Sidebar({ projectMode, projectName, projectDescription, projectStatus }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [recentProjects, setRecentProjects] = useState<StoredProject[]>([])
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!projectMode) {
      fetch("/api/projects")
        .then((r) => { if (!r.ok) throw new Error(); return r.json() })
        .then((data) => { if (Array.isArray(data)) setRecentProjects(data) })
        .catch(() => setRecentProjects([]))
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

  const content = (
    <div className="flex h-full flex-col px-2">
      <Logo />

      <div className="flex flex-col gap-0.5 px-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === "/dashboard" && pathname === "/")
          const iconObj = item.icon
          return (
            <button
              key={item.href}
              onClick={() => { router.push(item.href); setMobileOpen(false) }}
              className={cn(
                "flex items-center gap-3 rounded-full px-3.5 py-2.5 text-left text-sm transition-all duration-200",
                isActive
                  ? "bg-surface-2 font-medium text-text-primary lift-1"
                  : "text-text-secondary hover:bg-hover hover:text-text-primary"
              )}
            >
              <Icon icon={iconObj} size={17} strokeWidth={isActive ? 2.4 : 1.8} className={isActive ? "text-brand" : "text-muted"} />
              {item.label}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between px-4 pb-2 pt-7">
        <span className="text-[11px] font-medium text-muted">Projects</span>
        <button
          onClick={() => router.push("/projects")}
          className="flex h-5 w-5 items-center justify-center rounded-full text-muted transition-all hover:bg-hover-strong hover:text-text-primary"
        >
          <Icon icon={Add01Icon} size={14} />
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
                : "text-text-secondary hover:bg-hover hover:text-text-primary"
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

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 lift-1 md:hidden"
      >
        <Icon icon={Menu01Icon} size={17} className="text-text-primary" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="flex w-[240px] flex-shrink-0 flex-col bg-canvas">
            {content}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden w-[240px] flex-shrink-0 flex-col md:flex">
        {content}
      </div>
    </>
  )
}

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
  const [mobileOpen, setMobileOpen] = useState(false)

  const content = (
    <div className="flex h-full flex-col px-2">
      <button
        onClick={() => { onBack(); setMobileOpen(false) }}
        className="mx-1 mb-2 mt-5 flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-xs text-muted transition-colors duration-200 hover:bg-hover hover:text-text-primary"
      >
        <Icon icon={ArrowLeft01Icon} size={14} />
        <span>Projects</span>
      </button>

      <div className="mx-1 mb-4 rounded-2xl bg-surface-2 p-4 lift-1">
        <div className="truncate text-sm font-semibold text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>{name}</div>
        <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-secondary">{description}</div>
        <div className="mt-2.5">
          <Badge variant={statusVariant} dot />
        </div>
      </div>

      <div className="px-4 pb-2 pt-6 text-[11px] font-medium text-muted">
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
              <span className="flex h-5 w-5 items-center justify-center rounded-[7px]"
                style={{ backgroundColor: `${agent.color}1F`, color: agent.color }}>
                <Icon icon={agent.icon} size={11} />
              </span>
              {agent.label}
            </div>
          )
        })}
      </div>

      <UserCard />
    </div>
  )

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 lift-1 md:hidden"
      >
        <Icon icon={Menu01Icon} size={17} className="text-text-primary" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="flex w-[240px] flex-shrink-0 flex-col bg-canvas">
            {content}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden w-[240px] flex-shrink-0 flex-col md:flex">
        {content}
      </div>
    </>
  )
}
