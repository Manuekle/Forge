"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { Notification01Icon, CheckmarkCircle02Icon, AlertCircleIcon, Loading03Icon, ArrowUpRight02Icon, Cancel01Icon } from "@hugeicons/core-free-icons"
import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"
import { formatDuration } from "@/lib/utils"
import type { StoredRunWithProject } from "@/lib/store"

type NotificationPanel = "all" | "running" | "completed" | "failed"

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [runs, setRuns] = useState<StoredRunWithProject[]>([])
  const [activities, setActivities] = useState<{ id: string; agent: string; action: string; project: string; projectId: string; timestamp: string }[]>([])
  const [activeFilter, setActiveFilter] = useState<NotificationPanel>("all")
  const [loading, setLoading] = useState(true)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function load() {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        setRuns(Array.isArray(data.runs) ? data.runs : [])
        setActivities(Array.isArray(data.activities) ? data.activities : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [])

  const running = runs.filter((r) => r.status === "running")
  const failed = runs.filter((r) => r.status === "failed")
  const completed = runs.filter((r) => r.status === "completed")

  const activeCount = running.length + failed.length

  function filtered() {
    switch (activeFilter) {
      case "running": return running
      case "failed": return failed
      case "completed": return completed
      default: return runs.slice(0, 20)
    }
  }

  const filterTabs: { key: NotificationPanel; label: string; count?: number }[] = [
    { key: "all", label: "All" },
    { key: "running", label: "Running", count: running.length },
    { key: "completed", label: "Completed" },
    { key: "failed", label: "Failed", count: failed.length },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted transition-all hover:bg-surface-2 hover:text-text-primary"
      >
        <Icon icon={Notification01Icon} size={17} />
        {activeCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold leading-none text-white">
            {activeCount > 9 ? "9+" : activeCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="absolute right-0 top-full z-50 mt-2 w-[420px] overflow-hidden rounded-[20px] bg-surface-2 shadow-pop ring-hair"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 pt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text-primary">Notifications</span>
                {activeCount > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-error/15 px-1.5 text-[10px] font-bold text-error">
                    {activeCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-muted transition-colors hover:bg-hover-strong hover:text-text-primary"
              >
                <Icon icon={Cancel01Icon} size={14} />
              </button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 px-5 pb-3">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all",
                    activeFilter === tab.key
                      ? "bg-surface-3 text-text-primary lift-1"
                      : "text-muted hover:text-text-primary hover:bg-hover"
                  )}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={cn(
                      "flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-medium leading-none",
                      tab.key === "running" ? "bg-brand/15 text-brand" :
                      tab.key === "failed" ? "bg-error/15 text-error" :
                      "bg-hover-strong text-muted"
                    )}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="max-h-[420px] overflow-auto px-2 pb-2">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Icon icon={Loading03Icon} size={18} className="animate-spin text-muted" />
                </div>
              ) : filtered().length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <Icon icon={Notification01Icon} size={24} className="mb-2 text-muted" />
                  <div className="text-sm text-text-secondary">No notifications</div>
                  <div className="mt-0.5 text-xs text-muted">
                    {activeFilter === "running" ? "No runs in progress" :
                     activeFilter === "failed" ? "No recent failures" :
                     activeFilter === "completed" ? "No completed runs yet" :
                     "Your notification center is quiet"}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {filtered().map((run) => {
                    const isRunning = run.status === "running"
                    const isFailed = run.status === "failed"
                    const isCompleted = run.status === "completed"
                    const ago = getTimeAgo(run.createdAt)
                    return (
                      <button
                        key={run.id}
                        onClick={() => { router.push(`/projects/${run.projectId}`); setOpen(false) }}
                        className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-surface-3"
                      >
                        <span className={cn(
                          "mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                          isRunning ? "bg-brand/15" :
                          isFailed ? "bg-error/15" :
                          "bg-success/15"
                        )}>
                          {isRunning ? (
                            <span className="relative flex h-3 w-3">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-40" />
                              <span className="relative inline-flex h-3 w-3 rounded-full bg-brand" />
                            </span>
                          ) : isFailed ? (
                            <Icon icon={AlertCircleIcon} size={15} className="text-error" />
                          ) : (
                            <Icon icon={CheckmarkCircle02Icon} size={15} className="text-success" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-text-primary">{run.projectName}</span>
                            <span className={cn(
                              "flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium leading-none",
                              isRunning ? "bg-brand/15 text-brand" :
                              isFailed ? "bg-error/15 text-error" :
                              "bg-success/15 text-success"
                            )}>
                              {isRunning ? "Running" : isFailed ? "Failed" : "Completed"}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                            {isCompleted && run.duration && (
                              <span>{formatDuration(run.duration)}</span>
                            )}
                            {isRunning && run.progress && (
                              <span className="flex items-center gap-1">
                                <span className="h-1 w-1 rounded-full bg-brand" />
                                {run.progress}
                              </span>
                            )}
                            {isFailed && (
                              <span className="text-error/80">
                                {run.trace?.find((t) => t.action === "run.failed")?.detail?.slice(0, 60) || "Run failed"}
                              </span>
                            )}
                            <span>· {ago}</span>
                          </div>
                        </div>
                        <Icon icon={ArrowUpRight02Icon} size={13} className="mt-1 flex-shrink-0 text-muted" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer with activity count */}
            {activities.length > 0 && (
              <div className="border-t border-hairline px-5 py-3">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-info" />
                  {activities.length} recent agent activities
                  <span className="ml-auto">
                    <button
                      onClick={() => router.push("/dashboard")}
                      className="text-brand transition-colors hover:text-brand-hover"
                    >
                      View dashboard
                    </button>
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function getTimeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const sec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (sec < 10) return "just now"
  if (sec < 60) return `${sec}s ago`
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  return `${Math.floor(sec / 86400)}d ago`
}
