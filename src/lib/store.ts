

export type StoredProject = {
  id: string
  userId: string
  name: string
  description: string
  status: "active" | "planning" | "in_review" | "archived"
  progress: number
  template: string | null
  _ago?: number
  createdAt: Date
  updatedAt: Date
}

export type StoredDecision = {
  id: string
  projectId: string
  topic: string
  status: "open" | "voting" | "consensus"
  confidence: number | null
  consensus: string | null
  entries: { agent: string; message: string; timestamp: string }[]
  createdAt: Date
}

export type StoredArtifact = {
  id: string
  projectId: string
  type: string
  title: string
  version: number
  content: string
  createdAt: Date
  updatedAt: Date
}

export type RunCitation = {
  ref: string
  id: string
  title: string
  source: string
  score: number
  snippet: string
}

export type StoredRun = {
  id: string
  projectId: string
  status: string
  duration: number | null
  trace: { time: string; action: string; detail: string }[]
  citations: RunCitation[]
  createdAt: Date
}

type Activity = {
  id: string
  agent: string
  action: string
  project: string
  projectId: string
  timestamp: string
}

// Persist arrays on globalThis so the in-memory store survives dev HMR /
// module re-evaluation (otherwise newly created projects vanish on reload).
const _g = globalThis as unknown as {
  __forge?: {
    projects: StoredProject[]
    decisions: StoredDecision[]
    artifacts: StoredArtifact[]
    runs: StoredRun[]
    activities: Activity[]
  }
}
const _state = (_g.__forge ??= {
  projects: [],
  decisions: [],
  artifacts: [],
  runs: [],
  activities: [],
})
const projects = _state.projects
const decisions = _state.decisions
const artifacts = _state.artifacts
const runs = _state.runs
const activities = _state.activities

function uid() {
  return Math.random().toString(36).substring(2, 10)
}

function ago(date: Date): string {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000)
  if (sec < 60) return "just now"
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  return `${Math.floor(sec / 86400)}d ago`
}

export const store = {
  clear() {
    projects.splice(0)
    decisions.splice(0)
    artifacts.splice(0)
    runs.splice(0)
    activities.splice(0)
  },

  // Wipe only the data owned by a single user (their projects + cascades).
  clearUser(userId: string) {
    const ownedIds = new Set(projects.filter((p) => p.userId === userId).map((p) => p.id))
    projects.splice(0, projects.length, ...projects.filter((p) => p.userId !== userId))
    decisions.splice(0, decisions.length, ...decisions.filter((d) => !ownedIds.has(d.projectId)))
    artifacts.splice(0, artifacts.length, ...artifacts.filter((a) => !ownedIds.has(a.projectId)))
    runs.splice(0, runs.length, ...runs.filter((r) => !ownedIds.has(r.projectId)))
    activities.splice(0, activities.length, ...activities.filter((a) => !ownedIds.has(a.projectId)))
  },
  // Projects
  getProjects(userId: string) {
    return projects
      .filter((p) => p.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  },

  getProject(id: string) {
    return projects.find((p) => p.id === id) || null
  },

  createProject(data: { userId: string; name: string; description?: string; template?: string }) {
    const now = new Date()
    const project: StoredProject = {
      id: uid(),
      userId: data.userId,
      name: data.name,
      description: data.description || "",
      status: "planning",
      progress: 0,
      template: data.template || null,
      createdAt: now,
      updatedAt: now,
    }
    projects.push(project)

    activities.push({
      id: uid(),
      agent: "orchestrator",
      action: `Created project "${project.name}"`,
      project: project.name,
      projectId: project.id,
      timestamp: ago(now),
    })

    return project
  },

  updateProject(id: string, data: Partial<StoredProject>) {
    const idx = projects.findIndex((p) => p.id === id)
    if (idx === -1) return null
    projects[idx] = { ...projects[idx], ...data, updatedAt: new Date() }
    return projects[idx]
  },

  deleteProject(id: string) {
    const idx = projects.findIndex((p) => p.id === id)
    if (idx === -1) return
    projects.splice(idx, 1)
    // Mutate in place (arrays are shared refs persisted on globalThis)
    decisions.splice(0, decisions.length, ...decisions.filter((d) => d.projectId !== id))
    artifacts.splice(0, artifacts.length, ...artifacts.filter((a) => a.projectId !== id))
    runs.splice(0, runs.length, ...runs.filter((r) => r.projectId !== id))
  },

  // Decisions
  getDecisions(projectId: string) {
    return decisions
      .filter((d) => d.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  },

  createDecision(projectId: string, topic: string) {
    const decision: StoredDecision = {
      id: uid(),
      projectId,
      topic,
      status: "open",
      confidence: null,
      consensus: null,
      entries: [],
      createdAt: new Date(),
    }
    decisions.push(decision)
    return decision
  },

  addDecisionEntry(decisionId: string, agent: string, message: string) {
    const d = decisions.find((x) => x.id === decisionId)
    if (!d) return
    d.entries.push({ agent, message, timestamp: new Date().toISOString() })
    d.status = "voting"
    // update activity
    const project = projects.find((p) => p.id === d.projectId)
    if (project) {
      activities.push({
        id: uid(),
        agent,
        action: message.length > 60 ? message.slice(0, 60) + "..." : message,
        project: project.name,
        projectId: project.id,
        timestamp: "just now",
      })
    }
  },

  resolveDecision(decisionId: string, consensus: string, confidence: number) {
    const d = decisions.find((x) => x.id === decisionId)
    if (!d) return
    d.status = "consensus"
    d.consensus = consensus
    d.confidence = confidence
  },

  // Artifacts
  getArtifacts(projectId: string) {
    return artifacts
      .filter((a) => a.projectId === projectId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  },

  createArtifact(projectId: string, type: string, title: string, content: string) {
    const now = new Date()
    const version = artifacts.filter((a) => a.projectId === projectId && a.type === type).length + 1
    const artifact: StoredArtifact = {
      id: uid(),
      projectId,
      type,
      title,
      version,
      content,
      createdAt: now,
      updatedAt: now,
    }
    artifacts.push(artifact)
    return artifact
  },

  // Runs
  getRuns(projectId: string) {
    return runs
      .filter((r) => r.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  },

  createRun(projectId: string) {
    const run: StoredRun = {
      id: uid(),
      projectId,
      status: "running",
      duration: null,
      trace: [],
      citations: [],
      createdAt: new Date(),
    }
    runs.push(run)
    return run
  },

  completeRun(
    id: string,
    duration: number,
    trace: { time: string; action: string; detail: string }[],
    citations: RunCitation[] = []
  ) {
    const r = runs.find((x) => x.id === id)
    if (!r) return
    r.status = "completed"
    r.duration = duration
    r.trace = trace
    r.citations = citations
  },

  // Activities
  getActivities(limit = 10) {
    return activities.slice(0, limit)
  },

  getProjectProgress(projectId: string) {
    const project = projects.find((p) => p.id === projectId)
    if (!project) return 0
    const projectDecisions = decisions.filter((d) => d.projectId === projectId)
    const totalDecisions = projectDecisions.length
    const resolved = projectDecisions.filter((d) => d.status === "consensus").length
    const decisionProgress = totalDecisions > 0 ? (resolved / totalDecisions) * 50 : 0
    const artifactCount = artifacts.filter((a) => a.projectId === projectId).length
    const artifactProgress = Math.min(artifactCount * 10, 50)
    return Math.min(Math.round(decisionProgress + artifactProgress), 100)
  },

  // Seed demo data
  seed(userId: string) {
    if (projects.length > 0) return

    const p1 = store.createProject({
      userId,
      name: "HomePlate",
      description: "Marketplace connecting home cooks with local food lovers. Pickup-first MVP.",
      template: "marketplace",
    })
    store.updateProject(p1.id, { status: "active", progress: 0 })

    const p2 = store.createProject({
      userId,
      name: "Atlas CRM",
      description: "Lightweight CRM for solo consultants with automated follow-ups.",
      template: "saas",
    })

    const p3 = store.createProject({
      userId,
      name: "PulseFit",
      description: "Habit-based fitness coaching app with adaptive plans.",
      template: "ai-workspace",
    })
    store.updateProject(p3.id, { status: "active", progress: 0 })

    // Seed decisions for HomePlate
    const d1 = store.createDecision(p1.id, "Should buyers be required to create an account?")
    store.addDecisionEntry(d1.id, "pm", "Authentication should be required — order history and messaging depend on identity.")
    store.addDecisionEntry(d1.id, "architect", "That increases implementation complexity. Every anonymous flow needs a parallel path.")
    store.addDecisionEntry(d1.id, "qa", "Without auth there are real security concerns — fraud surface and zero traceability.")
    store.resolveDecision(d1.id, "Authentication required. Guests browse freely; one-tap OAuth at checkout.", 0.87)

    const d2 = store.createDecision(p1.id, "Should we support Stripe Connect or custom payments?")
    store.addDecisionEntry(d2.id, "pm", "Stripe Connect reduces time-to-market significantly and handles compliance.")
    store.addDecisionEntry(d2.id, "architect", "Connect adds PCI scope but custom gives full control over fee splitting.")
    store.addDecisionEntry(d2.id, "business", "Connect is cheaper to maintain. Let Stripe handle KYC and fraud.")

    // Seed artifacts for HomePlate
    store.createArtifact(p1.id, "prd", "Product Requirements Document", `## Overview\nHomePlate is a two-sided marketplace connecting home cooks with local food lovers. The platform enables cooks to list homemade meals and buyers to discover, order, and pick up food within their neighborhood.\n\n## Goals\nLaunch MVP within 8 weeks with 50 cooks and 500 active buyers in the pilot neighborhood.\n\n## User Stories\n- As a buyer, I want to browse available meals near me so I can find something I like.\n- As a buyer, I want to place an order so I can pick it up at a scheduled time.\n- As a cook, I want to list my meals with photos and prices so buyers can discover them.\n- As a cook, I want to manage orders so I can prepare on time.`)
    store.createArtifact(p1.id, "architecture", "System Architecture", `## Architecture\n- Next.js 15 frontend with TailwindCSS\n- PostgreSQL database with Drizzle ORM\n- Auth.js for authentication\n- Azure OpenAI for agent reasoning\n- Stripe Connect for payments\n- Vercel deployment\n\n## API Design\n- RESTful API with Next.js App Router\n- Server Actions for mutations\n- Real-time updates via Server-Sent Events`)
    store.createArtifact(p1.id, "ux", "User Flows", `## User Flows\n\n### Buyer Flow\n1. Land on home page → browse meals by location\n2. Filter by cuisine, price, distance\n3. Select meal → view details\n4. Place order → choose pickup time\n5. Pay → receive confirmation\n6. Pick up → rate experience\n\n### Cook Flow\n1. Register as cook → verify identity\n2. Create listing → photos, description, price\n3. Manage orders → accept/decline\n4. Mark ready → notify buyer\n5. Receive payment → withdraw`)

    // Seed a completed run
    const run = store.createRun(p1.id)
    store.completeRun(
      run.id,
      167,
      [
        { time: "[00:00.12]", action: "iq.intent.parse", detail: "marketplace / food / p2p" },
        { time: "[00:00.48]", action: "iq.knowledge.retrieve", detail: "3 sources · local-corpus" },
        { time: "[00:01.03]", action: "orchestrator.delegate", detail: "6 agents · sequential" },
        { time: "[00:14.20]", action: "debate.open", detail: "buyer-authentication" },
        { time: "[00:21.77]", action: "vote.tally", detail: "consensus" },
        { time: "[00:21.90]", action: "consensus.emit", detail: "confidence 0.87" },
        { time: "[02:47.66]", action: "run.complete", detail: "7 artifacts" },
      ],
      [
        { ref: "S1", id: "mkt-trust", title: "Marketplace Trust & Safety", source: "Forge KB / Marketplaces", score: 8, snippet: "Identity verification and escrow materially reduce fraud." },
        { ref: "S2", id: "mkt-liquidity", title: "Marketplace Liquidity & Pricing", source: "Forge KB / Marketplaces", score: 6, snippet: "Stripe Connect and Adyen are the standard payment rails for marketplaces." },
        { ref: "S3", id: "gen-security", title: "Application Security Baseline", source: "Forge KB / Engineering", score: 4, snippet: "Authenticate and authorize every API route; never rely on the client." },
      ]
    )

    store.updateProject(p1.id, { progress: store.getProjectProgress(p1.id) })
    store.updateProject(p2.id, { progress: store.getProjectProgress(p2.id) })
    store.updateProject(p3.id, { progress: store.getProjectProgress(p3.id) })
  },
}
