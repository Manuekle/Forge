import type { IconSvgElement } from "@/components/ui/icon"

export interface Agent {
  id: AgentType
  label: string
  color: string
  bgColor: string
  description: string
  capabilities: string[]
  icon: IconSvgElement
}

export type AgentType =
  | "orchestrator"
  | "pm"
  | "ux"
  | "architect"
  | "qa"
  | "scrum"
  | "business"

export interface Project {
  id: string
  name: string
  description: string
  status: "active" | "planning" | "in_review" | "archived"
  progress: number
  updatedAt: string
  agents: AgentType[]
  artifacts: number
}

export interface Decision {
  id: string
  topic: string
  status: "open" | "consensus" | "voting"
  confidence?: number
  agentEntries: AgentEntry[]
  consensus?: string
  createdAt: string
}

export interface AgentEntry {
  agent: string
  message: string
  timestamp: string
}

export interface MetricCard {
  label: string
  value: string
  change?: string
  changeType?: "positive" | "negative" | "neutral"
}

export interface Artifact {
  id: string
  type: "prd" | "backlog" | "architecture" | "ux" | "qa" | "roadmap" | "business"
  title: string
  version: number
  updatedAt: string
  content: string
}

export interface Activity {
  id: string
  agent: string
  action: string
  project: string
  timestamp: string
}
