"use client"

import { useCallback, useEffect, useState } from "react"
import type { StoredProject } from "@/lib/store"

// Module-level cache shared by every consumer (sidebar, dashboard, projects
// page). Deduplicates concurrent requests and avoids re-fetching the same
// list on every navigation within the TTL.
const TTL_MS = 15_000

let cache: { data: StoredProject[]; at: number } | null = null
let inflight: Promise<StoredProject[]> | null = null
const listeners = new Set<(projects: StoredProject[]) => void>()

async function fetchProjects(force = false): Promise<StoredProject[]> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.data
  if (inflight) return inflight
  inflight = fetch("/api/projects")
    .then((r) => (r.ok ? r.json() : []))
    .then((data) => {
      const list: StoredProject[] = Array.isArray(data) ? data : []
      cache = { data: list, at: Date.now() }
      for (const fn of listeners) fn(list)
      return list
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

/** Drop the cached list — next consumer re-fetches (call after create/delete). */
export function invalidateProjects() {
  cache = null
}

export function useProjects(enabled = true) {
  const [projects, setProjects] = useState<StoredProject[]>(() => cache?.data ?? [])
  const [loading, setLoading] = useState(() => enabled && !cache)

  const reload = useCallback(async () => {
    invalidateProjects()
    await fetchProjects(true).catch(() => {})
  }, [])

  useEffect(() => {
    if (!enabled) return
    const onUpdate = (list: StoredProject[]) => {
      setProjects(list)
      setLoading(false)
    }
    listeners.add(onUpdate)
    fetchProjects()
      .then(onUpdate)
      .catch(() => setLoading(false))
    return () => {
      listeners.delete(onUpdate)
    }
  }, [enabled])

  return { projects, loading, reload }
}
