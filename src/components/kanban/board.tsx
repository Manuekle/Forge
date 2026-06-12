"use client"

import { useState, useEffect } from "react"
import { DragDropContext, type DropResult } from "@hello-pangea/dnd"
import { Column } from "./column"
import { useToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Add01Icon } from "@hugeicons/core-free-icons"
import type { StoredTask } from "@/lib/store"

interface KanbanBoardProps {
  projectId: string
}

function KanbanBoard({ projectId }: KanbanBoardProps) {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<StoredTask[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState("")

  useEffect(() => {
    let cancelled = false
    fetch(`/api/projects/${projectId}/tasks`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { if (!cancelled) { setTasks(data); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [projectId])

  function reload() {
    fetch(`/api/projects/${projectId}/tasks`)
      .then((r) => r.ok ? r.json() : [])
      .then(setTasks)
  }

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return

    const { destination, draggableId } = result
    const targetStatus = destination.droppableId as "todo" | "in_progress" | "done"

    const updated = tasks.map((t) =>
      t.id === draggableId ? { ...t, status: targetStatus } : t
    )
    setTasks(updated)

    const res = await fetch(`/api/projects/${projectId}/tasks/${draggableId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: targetStatus }),
    })
    if (!res.ok) {
      reload()
      toast({ title: "Failed to move task", variant: "error" })
    }
  }

  async function handleUpdate(id: string, data: Partial<StoredTask>) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)))
    const res = await fetch(`/api/projects/${projectId}/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      reload()
      toast({ title: "Failed to update task", variant: "error" })
    }
  }

  async function handleDelete(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    const res = await fetch(`/api/projects/${projectId}/tasks/${id}`, { method: "DELETE" })
    if (!res.ok) {
      reload()
      toast({ title: "Failed to delete task", variant: "error" })
    }
  }

  async function handleAdd() {
    if (!newTitle.trim()) return
    setAdding(false)
    const res = await fetch(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    })
    if (res.ok) {
      const task = await res.json()
      setTasks((prev) => [...prev, task])
      setNewTitle("")
      toast({ title: "Task added", variant: "success" })
    } else {
      toast({ title: "Failed to add task", variant: "error" })
    }
  }

  const byStatus = {
    todo: tasks.filter((t) => t.status === "todo").sort((a, b) => a.order - b.order),
    in_progress: tasks.filter((t) => t.status === "in_progress").sort((a, b) => a.order - b.order),
    done: tasks.filter((t) => t.status === "done").sort((a, b) => a.order - b.order),
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <span className="text-xs text-muted">Loading board…</span>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        {adding ? (
          <div className="flex flex-1 gap-2">
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              onBlur={() => !newTitle.trim() && setAdding(false)}
              placeholder="Task title…"
              className="flex-1 rounded-full bg-surface-2 px-4 py-2 text-sm text-text-primary outline-none ring-hair placeholder:text-faint"
            />
            <Button size="sm" onClick={handleAdd}>Add</Button>
          </div>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
            <Icon icon={Add01Icon} size={14} />
            Add task
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2 text-[11px] text-muted">
          <span>{tasks.length} task{tasks.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-1 gap-3 overflow-auto pb-2" style={{ minHeight: 400 }}>
          {(Object.keys(byStatus) as ("todo" | "in_progress" | "done")[]).map((status) => (
            <Column key={status} status={status} tasks={byStatus[status]} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}
        </div>
      </DragDropContext>
    </div>
  )
}

export { KanbanBoard }
