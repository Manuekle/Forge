import { Agent } from "@/types"
import {
  Rocket01Icon,
  AiContentGenerator01Icon,
  AiIdeaIcon,
  AiCloud02Icon,
  AiScanIcon,
  AiFolder01Icon,
  AiSearch02Icon
} from "@hugeicons/core-free-icons"

export const AGENTS: Record<string, Agent> = {
  orchestrator: {
    id: "orchestrator",
    label: "Orchestrator",
    color: "#E85002",
    bgColor: "rgba(232,80,2,0.12)",
    description: "Delegates tasks, mediates debates and generates consensus across the team.",
    capabilities: ["Task delegation", "Consensus engine"],
    icon: Rocket01Icon,
  },
  pm: {
    id: "pm",
    label: "Product Manager",
    color: "#F97316",
    bgColor: "rgba(249,115,22,0.12)",
    description: "PRDs, goals, user stories, acceptance criteria, KPIs and backlog.",
    capabilities: ["PRD", "Backlog", "KPIs"],
    icon: AiContentGenerator01Icon,
  },
  ux: {
    id: "ux",
    label: "UX Agent",
    color: "#FB923C",
    bgColor: "rgba(251,146,60,0.12)",
    description: "User flows, information architecture, journeys and wireframe specs.",
    capabilities: ["Flows", "IA", "Journeys"],
    icon: AiIdeaIcon,
  },
  architect: {
    id: "architect",
    label: "Architect",
    color: "#FCD34D",
    bgColor: "rgba(252,211,77,0.12)",
    description: "System architecture, APIs, database schemas and scalability checks.",
    capabilities: ["APIs", "Schema", "Scale"],
    icon: AiCloud02Icon,
  },
  qa: {
    id: "qa",
    label: "QA Agent",
    color: "#A78BFA",
    bgColor: "rgba(167,139,250,0.12)",
    description: "Risk scanning, test plans, edge cases and security checks.",
    capabilities: ["Risks", "Tests", "Security"],
    icon: AiScanIcon,
  },
  scrum: {
    id: "scrum",
    label: "Scrum Agent",
    color: "#2ED47A",
    bgColor: "rgba(46,212,122,0.12)",
    description: "Sprint planning, story points, roadmaps and milestones.",
    capabilities: ["Sprints", "Points", "Roadmap"],
    icon: AiFolder01Icon,
  },
  business: {
    id: "business",
    label: "Business Agent",
    color: "#4A9FF9",
    bgColor: "rgba(74,159,249,0.12)",
    description: "Monetization, GTM strategy, business risks and market opportunities.",
    capabilities: ["GTM", "Revenue", "Market"],
    icon: AiSearch02Icon,
  },
}

