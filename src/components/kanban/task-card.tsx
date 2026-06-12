"use client"

import { useState } from "react"
import { Draggable } from "@hello-pangea/dnd"
import { cn } from "@/lib/utils"
import type { StoredTask } from "@/lib/store"

const priorityConfig = {
  p0: { label: "P0", class: "bg-error/15 text-error" },
  p1: { label: "P1", class: "bg-warning/15 text-warning" },
  p2: { label: "P2", class: "bg-info/15 text-info" },
}

interface TaskCardProps {
  task: StoredTask
  index: number
  onUpdate: (id: string, data: Partial<StoredTask>) => void
  onDelete: (id: string) => void
}

function TaskCard({ task, index, onUpdate, onDelete }: TaskCardProps) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const p = priorityConfig[task.priority]

  function handleSave() {
    if (title.trim() && title.trim() !== task.title) {
      onUpdate(task.id, { title: title.trim() })
    } else {
      setTitle(task.title)
    }
    setEditing(false)
  }

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={provided.draggableProps.style as React.CSSProperties}
          className={cn(
            "rounded-xl bg-surface p-3 ring-hair transition-all duration-200",
            snapshot.isDragging && "lift-3 ring-hair-strong shadow-lg"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            {editing ? (
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                className="min-w-0 flex-1 rounded-lg bg-surface-inset px-2 py-1 text-xs font-medium text-text-primary outline-none ring-hair"
              />
            ) : (
              <span
                className="min-w-0 flex-1 cursor-pointer text-xs font-medium text-text-primary"
                onDoubleClick={() => setEditing(true)}
              >
                {task.title}
              </span>
            )}
            <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none", p.class)}>
              {p.label}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2 text-[10px] text-muted">
            {task.storyPoints && <span>{task.storyPoints}pt</span>}
            {task.assignee && <span>{task.assignee}</span>}
          </div>

          <button
            onClick={() => onDelete(task.id)}
            className="mt-1.5 text-[10px] text-error/60 hover:text-error transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </Draggable>
  )
}

export { TaskCard, priorityConfig }
export type { TaskCardProps }
