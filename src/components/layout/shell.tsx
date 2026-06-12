"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Navbar } from "@/components/layout/navbar"

interface ShellProps {
  children: React.ReactNode
  breadcrumb?: string
  projectMode?: boolean
  projectName?: string
  projectDescription?: string
  projectStatus?: string
  latestRun?: { duration: number; id: string } | null
  onEditProject?: () => void
}

export function Shell({
  children,
  breadcrumb,
  projectMode,
  projectName,
  projectDescription,
  projectStatus,
  latestRun,
  onEditProject,
}: ShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="relative flex h-screen overflow-hidden bg-canvas text-text-primary">
      {/* Ambient brand aurora behind the chrome */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full opacity-60 blur-3xl aurora" />
      <Sidebar
        projectMode={projectMode}
        projectName={projectName}
        projectDescription={projectDescription}
        projectStatus={projectStatus}
        onEditProject={onEditProject}
        mobileOpen={mobileMenuOpen}
        onMobileOpenChange={setMobileMenuOpen}
      />
      <div className="flex min-w-0 flex-1 flex-col p-2 md:pl-0">
        {/* Floating content panel — depth via surface + shadow, no borders */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] bg-surface lift-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top_right,rgba(232,80,2,0.06)_0%,transparent_60%)]" />
          <Navbar
            breadcrumb={breadcrumb}
            projectMode={projectMode}
            latestRun={latestRun || undefined}
            onMenuToggle={() => setMobileMenuOpen((v) => !v)}
          />
          <div className="relative flex-1 overflow-auto">{children}</div>
        </div>
      </div>
    </div>
  )
}
