"use client"

import { useEffect, useState, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import { signOut } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import {
  DashboardSquare01Icon, AiFolder01Icon, ChatBotIcon, Settings02Icon, ArrowLeft01Icon, Add01Icon, SparklesIcon, Logout01Icon, AiUserIcon, ArrowUp01Icon, Tick01Icon, Edit01Icon, Cancel01Icon
} from "@hugeicons/core-free-icons"
import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { AGENTS } from "@/lib/constants"
import { useProjects } from "@/lib/use-projects"
import type { AgentType } from "@/types"

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: DashboardSquare01Icon },
  { label: "Projects", href: "/projects", icon: AiFolder01Icon },
  { label: "Agents", href: "/agents", icon: ChatBotIcon },
]

interface SidebarProps {
  projectMode?: boolean
  projectName?: string
  projectDescription?: string
  projectStatus?: string
  onBack?: () => void
  onEditProject?: () => void
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
}

function MobileNav({
  open, onOpenChange, children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] md:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-overlay backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="absolute inset-y-0 left-0 flex w-[264px] flex-col overflow-y-auto bg-canvas shadow-pop"
          >
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close menu"
              className="absolute right-2.5 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-hover-strong hover:text-text-primary"
            >
              <Icon icon={Cancel01Icon} size={15} />
            </button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-3 pb-6 pt-6">
      <Image
        src="/logo.png"
        alt="Forge"
        width={32}
        height={32}
        className="h-8 w-8"
      />
      <span className="text-[17px] font-semibold tracking-tight" style={{ fontFamily: "var(--font-syne)" }}>Forge</span>
    </div>
  )
}

function UserCard() {
  const [open, setOpen] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
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
        onClick={() => { setOpen(!open) }}
        aria-label="User menu"
        className="flex w-full items-center gap-3 rounded-2xl bg-surface-2 p-3 text-left lift-1 transition-colors hover:bg-surface-3"
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full gradient-brand text-xs font-bold text-white">
          J
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-text-primary">Jane Doe</div>
          <div className="flex items-center gap-1 text-[10px] text-muted">
            <Icon icon={SparklesIcon} size={10} className="text-brand" />
            Forge Pro
          </div>
        </div>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 overflow-hidden rounded-xl bg-surface-2 p-1.5 shadow-lg ring-hair">
          <button
            onClick={() => { setShowUpgrade(true); setOpen(false) }}
            className="flex w-full items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-brand transition-colors hover:bg-brand/10"
          >
            <Icon icon={ArrowUp01Icon} size={14} />
            Upgrade plan
          </button>
          <div className="mx-3 my-1 h-px bg-hairline" />
          <button
            onClick={() => { router.push("/settings"); setOpen(false) }}
            className="flex w-full items-center gap-2 rounded-full px-4 py-2 text-xs text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary"
          >
            <Icon icon={Settings02Icon} size={14} />
            Settings
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-2 rounded-full px-4 py-2 text-xs text-text-secondary transition-colors hover:bg-error/12 hover:text-error"
          >
            <Icon icon={Logout01Icon} size={14} />
            Sign out
          </button>
        </div>
      )}

      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />
    </div>
  )
}

export function Sidebar({ projectMode, projectName, projectDescription, projectStatus, onEditProject, mobileOpen, onMobileOpenChange }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  // Shared cached list — deduped with the dashboard/projects page request.
  const { projects: recentProjects } = useProjects(!projectMode)
  const _mobileOpen = mobileOpen ?? false
  const _setMobileOpen = onMobileOpenChange ?? (() => {})

  if (projectMode) {
    return (
      <ProjectSidebar
        name={projectName || "Project"}
        description={projectDescription || ""}
        status={projectStatus || "planning"}
        onBack={() => router.push("/projects")}
        onEditProject={onEditProject}
        mobileOpen={_mobileOpen}
        onMobileOpenChange={_setMobileOpen}
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
              onClick={() => { router.push(item.href); _setMobileOpen(false) }}
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
              p.status === "active" ? "bg-success" : p.status === "planning" ? "bg-info" : p.status === "in_review" ? "bg-warning" : p.status === "approved" ? "bg-brand" : "bg-muted"
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
      <MobileNav open={_mobileOpen} onOpenChange={_setMobileOpen}>
        {content}
      </MobileNav>

      {/* Desktop sidebar */}
      <div className="hidden w-[240px] flex-shrink-0 flex-col md:flex">
        {content}
      </div>
    </>
  )
}

const plans = [
  {
    name: "Free", price: "$0", desc: "To try Forge out",
    features: ["2 projects", "All 6 AI agents", "5 runs per month", "Markdown export"],
    current: false,
  },
  {
    name: "Pro", price: "$29", desc: "For teams that build",
    features: ["Unlimited projects", "Full reasoning traces", "Decision history", "Versioned artifacts with diffs", "GitHub & Jira export"],
    current: true,
  },
  {
    name: "Enterprise", price: "Custom", desc: "For organizations",
    features: ["SSO & RBAC", "Private Foundry IQ", "Custom agents & KBs", "Audit logs & compliance"],
    current: false,
  },
]

function UpgradeModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Upgrade plan" description="Choose the tier that fits your team.">
      <div className="flex flex-col gap-3 pt-1">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              "rounded-2xl p-4 transition-all duration-200",
              plan.current ? "ring-2 ring-brand bg-brand/5" : "bg-surface-2 ring-hair hover:ring-hair-strong"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text-primary">{plan.name}</span>
                  {plan.current && (
                    <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-medium text-brand">Current</span>
                  )}
                </div>
                <div className="mt-1 text-xs text-text-secondary">{plan.desc}</div>
              </div>
              <div className="text-right">
                <div className="text-base font-bold text-text-primary">{plan.price}</div>
                {plan.name !== "Enterprise" && <div className="text-[10px] text-muted">/mo</div>}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {plan.features.map((f) => (
                <div key={f} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                  <Icon icon={Tick01Icon} size={12} className="text-brand" />
                  {f}
                </div>
              ))}
            </div>
            {!plan.current && (
              <Button className="mt-4 w-full" size="sm" onClick={() => { onOpenChange(false) }}>
                {plan.name === "Enterprise" ? "Contact sales" : `Upgrade to ${plan.name}`}
              </Button>
            )}
          </div>
        ))}
      </div>
    </Modal>
  )
}

const wsAgents: AgentType[] = [
  "orchestrator", "pm", "ux", "architect", "qa", "scrum", "business",
]

function ProjectSidebar({
  name, description, status, onBack, onEditProject, mobileOpen, onMobileOpenChange,
}: {
  name: string
  description: string
  status: string
  onBack: () => void
  onEditProject?: () => void
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
}) {
  const statusVariant =
    status === "active" ? "active" : status === "in_review" ? "in_review" : status === "approved" ? "approved" : status === "archived" ? "archived" : "planning"
  const _mobileOpen = mobileOpen ?? false
  const _setMobileOpen = onMobileOpenChange ?? (() => {})

  const content = (
    <div className="flex h-full flex-col px-2">
      <button
        onClick={() => { onBack(); _setMobileOpen(false) }}
        className="mx-1 mb-2 mt-5 flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-xs text-muted transition-colors duration-200 hover:bg-hover hover:text-text-primary"
      >
        <Icon icon={ArrowLeft01Icon} size={14} />
        <span>Projects</span>
      </button>

      <div className="mx-1 mb-4 rounded-2xl bg-surface-2 p-4 lift-1 group">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>{name}</div>
            <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-secondary">{description || "No description"}</div>
          </div>
          {onEditProject && (
            <button
              onClick={onEditProject}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-muted opacity-0 transition-all duration-200 hover:bg-surface-3 hover:text-text-primary group-hover:opacity-100"
            >
              <Icon icon={Edit01Icon} size={13} />
            </button>
          )}
        </div>
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
              <span className="flex h-5 w-5 items-center justify-center rounded-full text-white"
                style={{ background: agent.color }}>
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
      <MobileNav open={_mobileOpen} onOpenChange={_setMobileOpen}>
        {content}
      </MobileNav>

      {/* Desktop sidebar */}
      <div className="hidden w-[240px] flex-shrink-0 flex-col md:flex">
        {content}
      </div>
    </>
  )
}
