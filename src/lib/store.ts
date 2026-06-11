import { dbEnabled, getDb, schema } from "@/db"
import { and, eq, desc, sql } from "drizzle-orm"

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

export type Activity = {
  id: string
  agent: string
  action: string
  project: string
  projectId: string
  timestamp: string
}

export type ProjectInput = { userId: string; name: string; description?: string; template?: string }

function ago(date: Date): string {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000)
  if (sec < 60) return "just now"
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  return `${Math.floor(sec / 86400)}d ago`
}

function progressFrom(decisionTotal: number, resolved: number, artifactCount: number): number {
  const decisionProgress = decisionTotal > 0 ? (resolved / decisionTotal) * 50 : 0
  const artifactProgress = Math.min(artifactCount * 10, 50)
  return Math.min(Math.round(decisionProgress + artifactProgress), 100)
}

/** Shared async data-layer interface. Backed by Drizzle/Postgres or in-memory. */
export interface DataStore {
  clear(): Promise<void>
  clearUser(userId: string): Promise<void>
  getProjects(userId: string): Promise<StoredProject[]>
  getProject(id: string): Promise<StoredProject | null>
  createProject(data: ProjectInput): Promise<StoredProject>
  updateProject(id: string, data: Partial<StoredProject>): Promise<StoredProject | null>
  deleteProject(id: string): Promise<void>
  getDecisions(projectId: string): Promise<StoredDecision[]>
  createDecision(projectId: string, topic: string): Promise<StoredDecision>
  addDecisionEntry(decisionId: string, agent: string, message: string): Promise<void>
  resolveDecision(decisionId: string, consensus: string, confidence: number): Promise<void>
  getArtifacts(projectId: string): Promise<StoredArtifact[]>
  createArtifact(projectId: string, type: string, title: string, content: string): Promise<StoredArtifact>
  getRuns(projectId: string): Promise<StoredRun[]>
  createRun(projectId: string): Promise<StoredRun>
  completeRun(id: string, duration: number, trace: StoredRun["trace"], citations?: RunCitation[]): Promise<void>
  getActivities(limit?: number): Promise<Activity[]>
  getProjectProgress(projectId: string): Promise<number>
  seed(userId: string): Promise<void>
}

// ===========================================================================
// In-memory backend (default; persisted on globalThis to survive dev HMR)
// ===========================================================================

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

const memStore: DataStore = {
  async clear() {
    projects.splice(0)
    decisions.splice(0)
    artifacts.splice(0)
    runs.splice(0)
    activities.splice(0)
  },

  async clearUser(userId) {
    const ownedIds = new Set(projects.filter((p) => p.userId === userId).map((p) => p.id))
    projects.splice(0, projects.length, ...projects.filter((p) => p.userId !== userId))
    decisions.splice(0, decisions.length, ...decisions.filter((d) => !ownedIds.has(d.projectId)))
    artifacts.splice(0, artifacts.length, ...artifacts.filter((a) => !ownedIds.has(a.projectId)))
    runs.splice(0, runs.length, ...runs.filter((r) => !ownedIds.has(r.projectId)))
    activities.splice(0, activities.length, ...activities.filter((a) => !ownedIds.has(a.projectId)))
  },

  async getProjects(userId) {
    return projects
      .filter((p) => p.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  },

  async getProject(id) {
    return projects.find((p) => p.id === id) || null
  },

  async createProject(data) {
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

  async updateProject(id, data) {
    const idx = projects.findIndex((p) => p.id === id)
    if (idx === -1) return null
    projects[idx] = { ...projects[idx], ...data, updatedAt: new Date() }
    return projects[idx]
  },

  async deleteProject(id) {
    const idx = projects.findIndex((p) => p.id === id)
    if (idx === -1) return
    projects.splice(idx, 1)
    decisions.splice(0, decisions.length, ...decisions.filter((d) => d.projectId !== id))
    artifacts.splice(0, artifacts.length, ...artifacts.filter((a) => a.projectId !== id))
    runs.splice(0, runs.length, ...runs.filter((r) => r.projectId !== id))
    activities.splice(0, activities.length, ...activities.filter((a) => a.projectId !== id))
  },

  async getDecisions(projectId) {
    return decisions
      .filter((d) => d.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  },

  async createDecision(projectId, topic) {
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

  async addDecisionEntry(decisionId, agent, message) {
    const d = decisions.find((x) => x.id === decisionId)
    if (!d) return
    d.entries.push({ agent, message, timestamp: new Date().toISOString() })
    d.status = "voting"
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

  async resolveDecision(decisionId, consensus, confidence) {
    const d = decisions.find((x) => x.id === decisionId)
    if (!d) return
    d.status = "consensus"
    d.consensus = consensus
    d.confidence = confidence
  },

  async getArtifacts(projectId) {
    return artifacts
      .filter((a) => a.projectId === projectId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  },

  async createArtifact(projectId, type, title, content) {
    const now = new Date()
    const version = artifacts.filter((a) => a.projectId === projectId && a.type === type).length + 1
    const artifact: StoredArtifact = {
      id: uid(), projectId, type, title, version, content, createdAt: now, updatedAt: now,
    }
    artifacts.push(artifact)
    return artifact
  },

  async getRuns(projectId) {
    return runs
      .filter((r) => r.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  },

  async createRun(projectId) {
    const run: StoredRun = {
      id: uid(), projectId, status: "running", duration: null, trace: [], citations: [], createdAt: new Date(),
    }
    runs.push(run)
    return run
  },

  async completeRun(id, duration, trace, citations = []) {
    const r = runs.find((x) => x.id === id)
    if (!r) return
    r.status = "completed"
    r.duration = duration
    r.trace = trace
    r.citations = citations
  },

  async getActivities(limit = 10) {
    return activities.slice(0, limit)
  },

  async getProjectProgress(projectId) {
    const projectDecisions = decisions.filter((d) => d.projectId === projectId)
    const resolved = projectDecisions.filter((d) => d.status === "consensus").length
    const artifactCount = artifacts.filter((a) => a.projectId === projectId).length
    return progressFrom(projectDecisions.length, resolved, artifactCount)
  },

  async seed(userId) {
    if (projects.length > 0) return
    await seedDemo(memStore, userId)
  },
}

// ===========================================================================
// Drizzle / Postgres backend
// ===========================================================================

function mapProject(r: typeof schema.projects.$inferSelect): StoredProject {
  return {
    id: r.id,
    userId: r.userId,
    name: r.name,
    description: r.description ?? "",
    status: r.status as StoredProject["status"],
    progress: r.progress,
    template: r.template ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

function mapDecision(r: typeof schema.decisions.$inferSelect): StoredDecision {
  return {
    id: r.id,
    projectId: r.projectId,
    topic: r.topic,
    status: r.status as StoredDecision["status"],
    confidence: r.confidence ?? null,
    consensus: r.consensus ?? null,
    entries: r.entries ?? [],
    createdAt: r.createdAt,
  }
}

function mapRun(r: typeof schema.runs.$inferSelect): StoredRun {
  return {
    id: r.id,
    projectId: r.projectId,
    status: r.status,
    duration: r.duration ?? null,
    trace: r.trace ?? [],
    citations: r.citations ?? [],
    createdAt: r.createdAt,
  }
}

const dbStore: DataStore = {
  async clear() {
    await getDb().delete(schema.projects)
  },

  async clearUser(userId) {
    await getDb().delete(schema.projects).where(eq(schema.projects.userId, userId))
  },

  async getProjects(userId) {
    const rows = await getDb()
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.userId, userId))
      .orderBy(desc(schema.projects.updatedAt))
    return rows.map(mapProject)
  },

  async getProject(id) {
    const rows = await getDb().select().from(schema.projects).where(eq(schema.projects.id, id)).limit(1)
    return rows[0] ? mapProject(rows[0]) : null
  },

  async createProject(data) {
    const db = getDb()
    const [row] = await db
      .insert(schema.projects)
      .values({ userId: data.userId, name: data.name, description: data.description || "", template: data.template || null })
      .returning()
    await db.insert(schema.activities).values({
      projectId: row.id,
      agent: "orchestrator",
      action: `Created project "${row.name}"`,
      project: row.name,
    })
    return mapProject(row)
  },

  async updateProject(id, data) {
    const patch: Partial<typeof schema.projects.$inferInsert> = { updatedAt: new Date() }
    if (data.name !== undefined) patch.name = data.name
    if (data.description !== undefined) patch.description = data.description
    if (data.status !== undefined) patch.status = data.status
    if (data.progress !== undefined) patch.progress = data.progress
    if (data.template !== undefined) patch.template = data.template
    const [row] = await getDb().update(schema.projects).set(patch).where(eq(schema.projects.id, id)).returning()
    return row ? mapProject(row) : null
  },

  async deleteProject(id) {
    await getDb().delete(schema.projects).where(eq(schema.projects.id, id))
  },

  async getDecisions(projectId) {
    const rows = await getDb()
      .select()
      .from(schema.decisions)
      .where(eq(schema.decisions.projectId, projectId))
      .orderBy(desc(schema.decisions.createdAt))
    return rows.map(mapDecision)
  },

  async createDecision(projectId, topic) {
    const [row] = await getDb().insert(schema.decisions).values({ projectId, topic }).returning()
    return mapDecision(row)
  },

  async addDecisionEntry(decisionId, agent, message) {
    const db = getDb()
    const [d] = await db.select().from(schema.decisions).where(eq(schema.decisions.id, decisionId)).limit(1)
    if (!d) return
    const entries = [...(d.entries ?? []), { agent, message, timestamp: new Date().toISOString() }]
    await db.update(schema.decisions).set({ entries, status: "voting" }).where(eq(schema.decisions.id, decisionId))
    const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, d.projectId)).limit(1)
    if (project) {
      await db.insert(schema.activities).values({
        projectId: project.id,
        agent,
        action: message.length > 60 ? message.slice(0, 60) + "..." : message,
        project: project.name,
      })
    }
  },

  async resolveDecision(decisionId, consensus, confidence) {
    await getDb()
      .update(schema.decisions)
      .set({ status: "consensus", consensus, confidence })
      .where(eq(schema.decisions.id, decisionId))
  },

  async getArtifacts(projectId) {
    const rows = await getDb()
      .select()
      .from(schema.artifacts)
      .where(eq(schema.artifacts.projectId, projectId))
      .orderBy(desc(schema.artifacts.updatedAt))
    return rows
  },

  async createArtifact(projectId, type, title, content) {
    const db = getDb()
    const [{ value: existing }] = await db
      .select({ value: sql<number>`count(*)` })
      .from(schema.artifacts)
      .where(and(eq(schema.artifacts.projectId, projectId), eq(schema.artifacts.type, type)))
    const version = Number(existing) + 1
    const [row] = await db
      .insert(schema.artifacts)
      .values({ projectId, type, title, content, version })
      .returning()
    return row
  },

  async getRuns(projectId) {
    const rows = await getDb()
      .select()
      .from(schema.runs)
      .where(eq(schema.runs.projectId, projectId))
      .orderBy(desc(schema.runs.createdAt))
    return rows.map(mapRun)
  },

  async createRun(projectId) {
    const [row] = await getDb().insert(schema.runs).values({ projectId }).returning()
    return mapRun(row)
  },

  async completeRun(id, duration, trace, citations = []) {
    await getDb()
      .update(schema.runs)
      .set({ status: "completed", duration, trace, citations })
      .where(eq(schema.runs.id, id))
  },

  async getActivities(limit = 10) {
    const rows = await getDb()
      .select()
      .from(schema.activities)
      .orderBy(desc(schema.activities.createdAt))
      .limit(limit)
    return rows.map((r) => ({
      id: r.id,
      agent: r.agent,
      action: r.action,
      project: r.project,
      projectId: r.projectId,
      timestamp: ago(r.createdAt),
    }))
  },

  async getProjectProgress(projectId) {
    const db = getDb()
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(schema.decisions)
      .where(eq(schema.decisions.projectId, projectId))
    const [{ resolved }] = await db
      .select({ resolved: sql<number>`count(*)` })
      .from(schema.decisions)
      .where(and(eq(schema.decisions.projectId, projectId), eq(schema.decisions.status, "consensus")))
    const [{ artifactCount }] = await db
      .select({ artifactCount: sql<number>`count(*)` })
      .from(schema.artifacts)
      .where(eq(schema.artifacts.projectId, projectId))
    return progressFrom(Number(total), Number(resolved), Number(artifactCount))
  },

  async seed(userId) {
    const [{ value }] = await getDb().select({ value: sql<number>`count(*)` }).from(schema.projects)
    if (Number(value) > 0) return
    await seedDemo(dbStore, userId)
  },
}

// ===========================================================================
// Shared demo seed (backend-agnostic — uses the public DataStore interface)
// ===========================================================================

async function seedDemo(s: DataStore, userId: string) {
  const p1 = await s.createProject({
    userId,
    name: "HomePlate",
    description: "Marketplace connecting home cooks with local food lovers. Pickup-first MVP.",
    template: "marketplace",
  })
  await s.updateProject(p1.id, { status: "active" })

  const p2 = await s.createProject({
    userId,
    name: "Atlas CRM",
    description: "Lightweight CRM for solo consultants with automated follow-ups.",
    template: "saas",
  })

  const p3 = await s.createProject({
    userId,
    name: "PulseFit",
    description: "Habit-based fitness coaching app with adaptive plans.",
    template: "ai-workspace",
  })
  await s.updateProject(p3.id, { status: "active" })

  const d1 = await s.createDecision(p1.id, "Should buyers be required to create an account?")
  await s.addDecisionEntry(d1.id, "pm", "Authentication should be required — order history and messaging depend on identity.")
  await s.addDecisionEntry(d1.id, "architect", "That increases implementation complexity. Every anonymous flow needs a parallel path.")
  await s.addDecisionEntry(d1.id, "qa", "Without auth there are real security concerns — fraud surface and zero traceability.")
  await s.resolveDecision(d1.id, "Authentication required. Guests browse freely; one-tap OAuth at checkout.", 0.87)

  const d2 = await s.createDecision(p1.id, "Should we support Stripe Connect or custom payments?")
  await s.addDecisionEntry(d2.id, "pm", "Stripe Connect reduces time-to-market significantly and handles compliance.")
  await s.addDecisionEntry(d2.id, "architect", "Connect adds PCI scope but custom gives full control over fee splitting.")
  await s.addDecisionEntry(d2.id, "business", "Connect is cheaper to maintain. Let Stripe handle KYC and fraud.")

  await s.createArtifact(p1.id, "prd", "Product Requirements Document", `## Overview\nHomePlate is a two-sided marketplace connecting home cooks with local food lovers. The platform enables cooks to list homemade meals and buyers to discover, order, and pick up food within their neighborhood.\n\n## Goals\nLaunch MVP within 8 weeks with 50 cooks and 500 active buyers in the pilot neighborhood.\n\n## User Stories\n- As a buyer, I want to browse available meals near me so I can find something I like.\n- As a buyer, I want to place an order so I can pick it up at a scheduled time.\n- As a cook, I want to list my meals with photos and prices so buyers can discover them.\n- As a cook, I want to manage orders so I can prepare on time.`)
  await s.createArtifact(p1.id, "architecture", "System Architecture", `## Architecture\n- Next.js 15 frontend with TailwindCSS\n- PostgreSQL database with Drizzle ORM\n- Auth.js for authentication\n- Azure OpenAI for agent reasoning\n- Stripe Connect for payments\n- Vercel deployment\n\n## API Design\n- RESTful API with Next.js App Router\n- Server Actions for mutations`)
  await s.createArtifact(p1.id, "ux", "User Flows", `## User Flows\n\n### Buyer Flow\n1. Land on home page → browse meals by location\n2. Filter by cuisine, price, distance\n3. Select meal → view details\n4. Place order → choose pickup time\n5. Pay → receive confirmation\n6. Pick up → rate experience`)

  const run = await s.createRun(p1.id)
  await s.completeRun(
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

  await s.updateProject(p1.id, { progress: await s.getProjectProgress(p1.id) })
  await s.updateProject(p2.id, { progress: await s.getProjectProgress(p2.id) })
  await s.updateProject(p3.id, { progress: await s.getProjectProgress(p3.id) })
}

export const store: DataStore = dbEnabled ? dbStore : memStore
