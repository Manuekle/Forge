import { cn } from "@/lib/utils"

interface SeparatorProps {
  className?: string
}

function Separator({ className }: SeparatorProps) {
  return <div className={cn("h-px w-full bg-border", className)} />
}

export { Separator }
