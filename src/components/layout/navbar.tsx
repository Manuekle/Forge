"use client"

import { formatDuration } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationCenter } from "@/components/ui/notification-center"

interface NavbarProps {
  breadcrumb?: string
  projectMode?: boolean
  latestRun?: { duration: number; id: string } | null
}

export function Navbar({ breadcrumb = "Dashboard", projectMode, latestRun }: NavbarProps) {

  return (
    <div className="relative z-10 flex h-16 flex-shrink-0 items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted">Forge</span>
        <span className="text-faint">/</span>
        <span className="font-medium text-text-primary">{breadcrumb}</span>
      </div>
      <div className="flex items-center">
        <div className="flex items-center gap-1">
          <NotificationCenter />
          <ThemeToggle />
        </div>

        {projectMode && latestRun && (
          <>
            <div className="mx-3 h-5 w-px bg-hairline" />
            <div className="flex items-center gap-2 rounded-full bg-brand-subtle px-3 py-1.5 text-xs ring-hair">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-50" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
              </span>
              <span className="font-medium text-brand">Run #{latestRun.id.slice(0, 6)}</span>
              <span className="text-text-secondary">{formatDuration(latestRun.duration)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
