import { cn } from "@/lib/utils"
import { AGENTS } from "@/lib/constants"

interface AgentBadgeProps {
  type: string
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeMap = {
  sm: "w-[26px] h-[26px] text-[9px] rounded-[9px]",
  md: "w-[32px] h-[32px] text-[10px] rounded-[11px]",
  lg: "w-[38px] h-[38px] text-[12px] rounded-[13px]",
}

const labelMap: Record<string, string> = {
  orchestrator: "OR",
  pm: "PM",
  ux: "UX",
  architect: "AR",
  qa: "QA",
  scrum: "SC",
  business: "BZ",
}

function AgentBadge({ type, size = "md", className }: AgentBadgeProps) {
  const agent = AGENTS[type as keyof typeof AGENTS]
  if (!agent) return null
  return (
    <div
      className={cn(
        "flex items-center justify-center font-bold flex-shrink-0",
        sizeMap[size],
        className
      )}
      style={{
        background: agent.bgColor,
        color: agent.color,
      }}
    >
      {labelMap[type] || type.slice(0, 2).toUpperCase()}
    </div>
  )
}

export { AgentBadge }
