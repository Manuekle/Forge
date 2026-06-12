"use client"

import * as React from "react"
import { formatDuration } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationCenter } from "@/components/ui/notification-center"
import { FeedbackModal } from "@/components/shared/feedback-modal"
import { Megaphone02Icon, Menu01Icon } from "@hugeicons/core-free-icons"
import { Icon } from "@/components/ui/icon"

interface NavbarProps {
  breadcrumb?: string
  projectMode?: boolean
  latestRun?: { duration: number; id: string } | null
  onMenuToggle?: () => void
}

export function Navbar({ breadcrumb = "Dashboard", projectMode, latestRun, onMenuToggle }: NavbarProps) {
  const [feedbackOpen, setFeedbackOpen] = React.useState(false)

  return (
    <div className="relative z-10 flex h-16 flex-shrink-0 items-center justify-between pr-3 md:px-8">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <button
          onClick={onMenuToggle}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-all duration-200 hover:bg-hover-strong hover:text-text-primary md:hidden"
        >
          <Icon icon={Menu01Icon} size={17} />
        </button>
        <span className="hidden text-muted sm:inline">Forge</span>
        <span className="hidden text-faint sm:inline">/</span>
        <span className="truncate font-medium text-text-primary">{breadcrumb}</span>
      </div>
      <div className="flex flex-shrink-0 items-center">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFeedbackOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-all duration-200 hover:bg-hover-strong hover:text-text-primary"
          >
            <Icon icon={Megaphone02Icon} size={16} />
          </button>
          <NotificationCenter />
          <ThemeToggle />
        </div>

        <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />

        {projectMode && latestRun && (
          <>
            <div className="mx-2 h-5 w-px bg-hairline sm:mx-3" />
            <div className="flex items-center gap-2 rounded-full bg-brand-subtle px-3 py-1.5 text-xs ring-hair">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-50" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
              </span>
              <span className="font-medium text-brand">Run #{latestRun.id.slice(0, 6)}</span>
              <span className="hidden text-text-secondary sm:inline">{formatDuration(latestRun.duration)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
