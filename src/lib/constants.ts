import { Agent } from "@/types"

export const AGENTS: Record<string, Agent> = {
  orchestrator: {
    id: "orchestrator",
    label: "Orchestrator",
    color: "#E85002",
    bgColor: "rgba(232,80,2,0.12)",
    description: "Delegates tasks, mediates debates and generates consensus across the team.",
    capabilities: ["Task delegation", "Consensus engine"],
  },
  pm: {
    id: "pm",
    label: "Product Manager",
    color: "#F97316",
    bgColor: "rgba(249,115,22,0.12)",
    description: "PRDs, goals, user stories, acceptance criteria, KPIs and backlog.",
    capabilities: ["PRD", "Backlog", "KPIs"],
  },
  ux: {
    id: "ux",
    label: "UX Agent",
    color: "#FB923C",
    bgColor: "rgba(251,146,60,0.12)",
    description: "User flows, information architecture, journeys and wireframe specs.",
    capabilities: ["Flows", "IA", "Journeys"],
  },
  architect: {
    id: "architect",
    label: "Architect",
    color: "#FCD34D",
    bgColor: "rgba(252,211,77,0.12)",
    description: "System architecture, APIs, database schemas and scalability checks.",
    capabilities: ["APIs", "Schema", "Scale"],
  },
  qa: {
    id: "qa",
    label: "QA Agent",
    color: "#A78BFA",
    bgColor: "rgba(167,139,250,0.12)",
    description: "Risk scanning, test plans, edge cases and security checks.",
    capabilities: ["Risks", "Tests", "Security"],
  },
  scrum: {
    id: "scrum",
    label: "Scrum Agent",
    color: "#2ED47A",
    bgColor: "rgba(46,212,122,0.12)",
    description: "Sprint planning, story points, roadmaps and milestones.",
    capabilities: ["Sprints", "Points", "Roadmap"],
  },
  business: {
    id: "business",
    label: "Business Agent",
    color: "#4A9FF9",
    bgColor: "rgba(74,159,249,0.12)",
    description: "Monetization, GTM strategy, business risks and market opportunities.",
    capabilities: ["GTM", "Revenue", "Market"],
  },
}

export const MOCK_PROJECTS = [
  {
    id: "1",
    name: "HomePlate",
    description: "Marketplace connecting home cooks with local food lovers. Pickup-first MVP.",
    status: "active" as const,
    progress: 78,
    updatedAt: "2m ago",
    agents: ["pm", "architect", "qa", "scrum", "ux", "business"] as const,
    artifacts: 7,
  },
  {
    id: "2",
    name: "Atlas CRM",
    description: "Lightweight CRM for solo consultants with automated follow-ups.",
    status: "planning" as const,
    progress: 24,
    updatedAt: "3h ago",
    agents: ["pm", "business"] as const,
    artifacts: 3,
  },
  {
    id: "3",
    name: "PulseFit",
    description: "Habit-based fitness coaching app with adaptive plans.",
    status: "in_review" as const,
    progress: 91,
    updatedAt: "1d ago",
    agents: ["pm", "ux", "architect", "qa", "scrum", "business"] as const,
    artifacts: 9,
  },
]

export const MOCK_ACTIVITIES = [
  { id: "a1", agent: "architect" as const, action: "Validated database schema", project: "HomePlate", timestamp: "2m ago" },
  { id: "a2", agent: "orchestrator" as const, action: "Consensus reached on authentication", project: "HomePlate", timestamp: "5m ago" },
  { id: "a3", agent: "qa" as const, action: "Flagged 3 risks in payment flow", project: "HomePlate", timestamp: "9m ago" },
  { id: "a4", agent: "pm" as const, action: "Updated PRD to v3", project: "HomePlate", timestamp: "12m ago" },
  { id: "a5", agent: "business" as const, action: "Drafted GTM strategy", project: "Atlas CRM", timestamp: "3h ago" },
]

export const MOCK_DECISIONS = [
  {
    id: "d1",
    topic: "Should buyers be required to create an account?",
    status: "consensus" as const,
    confidence: 0.87,
    agentEntries: [
      { agent: "pm" as const, message: "Authentication should be required — order history and messaging depend on identity.", timestamp: "00:00.12" },
      { agent: "architect" as const, message: "That increases implementation complexity. Every anonymous flow needs a parallel path.", timestamp: "00:00.48" },
      { agent: "qa" as const, message: "Without auth there are real security concerns — fraud surface and zero traceability.", timestamp: "00:01.03" },
    ],
    consensus: "Authentication required. Guests browse freely; one-tap OAuth at checkout.",
    createdAt: "2m ago",
  },
  {
    id: "d2",
    topic: "Should we support Stripe Connect or custom payments?",
    status: "voting" as const,
    agentEntries: [
      { agent: "pm" as const, message: "Stripe Connect reduces time-to-market significantly.", timestamp: "00:15.20" },
      { agent: "architect" as const, message: "Connect adds PCI compliance scope. Custom gives us full control.", timestamp: "00:16.05" },
    ],
    createdAt: "5m ago",
  },
]
