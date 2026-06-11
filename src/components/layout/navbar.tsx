"use client"

import { Search, Sparkles, Download } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface NavbarProps {
  breadcrumb?: string
  projectMode?: boolean
  latestRun?: { duration: number; id: string } | null
}

export function Navbar({ breadcrumb = "Dashboard", projectMode, latestRun }: NavbarProps) {
  const router = useRouter()

  return (
    <div className="relative z-10 flex h-16 flex-shrink-0 items-center gap-4 px-6">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted">Forge</span>
        <span className="text-faint">/</span>
        <span className="font-medium text-text-primary">{breadcrumb}</span>
      </div>
      <div className="flex-1" />
      {!projectMode && (
        <div className="flex items-center gap-2.5">
          <button className="group flex items-center gap-2 rounded-full bg-surface-2 px-3.5 py-2 text-xs text-muted ring-hair transition-all duration-200 hover:bg-surface-3 hover:text-text-secondary">
            <Search size={14} />
            <span className="hidden sm:inline">Search projects…</span>
            <span className="ml-1 hidden rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-faint sm:inline">
              ⌘K
            </span>
          </button>
          <Button onClick={() => router.push("/projects")} size="sm">
            <Sparkles size={14} />
            New project
          </Button>
        </div>
      )}
      {projectMode && (
        <div className="flex items-center gap-2.5">
          {latestRun && (
            <div className="flex items-center gap-2 rounded-full bg-brand-subtle px-3 py-1.5 text-xs ring-hair">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-50" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
              </span>
              <span className="font-medium text-brand">Run #{latestRun.id.slice(0, 6)}</span>
              <span className="text-text-secondary">{latestRun.duration}s</span>
            </div>
          )}
          <Button size="sm" variant="secondary">
            <Download size={14} />
            Export
          </Button>
        </div>
      )}
    </div>
  )
}
