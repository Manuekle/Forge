import { cn } from "@/lib/utils"

const statusColors: Record<string, string> = {
  active: "bg-success",
  planning: "bg-info",
  in_review: "bg-warning",
  archived: "bg-muted",
  done: "bg-faint",
  working: "bg-brand",
}

interface StatusDotProps {
  status: keyof typeof statusColors
  className?: string
}

function StatusDot({ status, className }: StatusDotProps) {
  return (
    <div
      className={cn(
        "w-[6px] h-[6px] rounded-full flex-shrink-0",
        statusColors[status] || "bg-muted",
        className
      )}
    />
  )
}

export { StatusDot }
