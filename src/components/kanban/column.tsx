"use client"

import { Droppable } from "@hello-pangea/dnd"
import { cn } from "@/lib/utils"
import { TaskCard } from "./task-card"
import type { StoredTask } from "@/lib/store"

const columnConfig = {
  todo: { label: "To Do", color: "bg-info/12 text-info" },
  in_progress: { label: "In Progress", color: "bg-warning/12 text-warning" },
  done: { label: "Done", color: "bg-success/12 text-success" },
}

interface ColumnProps {
  status: "todo" | "in_progress" | "done"
  tasks: StoredTask[]
  onUpdate: (id: string, data: Partial<StoredTask>) => void
  onDelete: (id: string) => void
}

function Column({ status, tasks, onUpdate, onDelete }: ColumnProps) {
  const config = columnConfig[status]

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-2xl bg-surface-inset p-3 ring-hair">
      <div className={cn("mb-3 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold", config.color)}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {config.label}
        <span className="ml-auto font-mono text-[10px] opacity-60">{tasks.length}</span>
      </div>

      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex flex-1 flex-col gap-2 overflow-y-auto rounded-xl p-1 transition-colors duration-200",
              snapshot.isDraggingOver && "bg-surface-2"
            )}
          >
            {tasks.map((task, index) => (
              <TaskCard key={task.id} task={task} index={index} onUpdate={onUpdate} onDelete={onDelete} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}

export { Column, columnConfig }
