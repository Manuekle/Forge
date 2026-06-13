import { dbEnabled, getDb, schema } from "@/db"
import { and, eq, desc, sql } from "drizzle-orm"

export type StoredProject = {
  id: string
  userId: string
  name: string
  description: string
  status: "active" | "planning" | "in_review" | "approved" | "archived"
  progress: number
  template: string | null
  githubRepo: string | null
  _ago?: number
  createdAt: Date
  updatedAt: Date
}

export type DecisionVote = { vote: string; confidence: number | null; concerns: string; round: number }

export type StoredDecision = {
  id: string
  projectId: string
  topic: string
  status: "open" | "voting" | "consensus"
  confidence: number | null
  consensus: string | null
  entries: { agent: string; message: string; timestamp: string }[]
  votes: Record<string, DecisionVote>
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

export type StoredRunPlan = {
  strategy: string
  selected: { agent: string; reason: string }[]
  skipped: { agent: string; reason: string }[]
  source: string
  log?: { at: string; type: string; detail: string; reason: string }[]
}

/** A structured execution event emitted live while a run executes. */
export type RunEvent = {
  at: string // elapsed clock "[mm:ss.ff]"
  ts: string // ISO timestamp
  kind:
    | "retrieval"
    | "plan"
    | "agent_state"
    | "handoff"
    | "vote"
    | "checkpoint"
    | "consensus"
    | "artifact"
    | "complete"
  agent?: string
  state?: "waiting" | "reading_context" | "reasoning" | "revising" | "reviewing" | "voting" | "completed"
  detail: string
  from?: string
  to?: string
  summary?: string
  vote?: string
  confidence?: number
}

export type RunOutcome = {
  confidence: number | null
  votes: Record<string, DecisionVote>
  consensus: string | null
}

export type StoredRun = {
  id: string
  projectId: string
  status: string
  progress: string | null
  duration: number | null
  trace: { time: string; action: string; detail: string }[]
  plan: StoredRunPlan | null
  citations: RunCitation[]
  events: RunEvent[]
  confidence: number | null
  votes: Record<string, DecisionVote>
  consensus: string | null
  createdAt: Date
}

export type StoredRunWithProject = StoredRun & { projectName: string }

export type Activity = {
  id: string
  agent: string
  action: string
  project: string
  projectId: string
  timestamp: string
}

export type StoredTask = {
  id: string
  projectId: string
  title: string
  description: string
  priority: "p0" | "p1" | "p2"
  storyPoints: number | null
  status: "todo" | "in_progress" | "done"
  order: number
  assignee: string | null
  createdAt: Date
  updatedAt: Date
}

export type TaskInput = {
  title: string
  description?: string
  priority?: "p0" | "p1" | "p2"
  storyPoints?: number | null
  status?: "todo" | "in_progress" | "done"
  order?: number
  assignee?: string | null
}

export type ProjectInput = { userId: string; name: string; description?: string; template?: string }

export type JiraConfig = { domain: string; email: string; token: string }

export type StoredCodeFile = {
  id: string
  projectId: string
  path: string
  content: string
  createdAt: Date
  updatedAt: Date
}

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
  resolveDecision(decisionId: string, consensus: string, confidence: number, votes?: Record<string, DecisionVote>): Promise<void>
  getArtifacts(projectId: string): Promise<StoredArtifact[]>
  createArtifact(projectId: string, type: string, title: string, content: string): Promise<StoredArtifact>
  updateArtifact(id: string, data: { title?: string; content?: string }): Promise<StoredArtifact | null>
  getCodeFiles(projectId: string): Promise<StoredCodeFile[]>
  replaceCodeFiles(projectId: string, files: { path: string; content: string }[]): Promise<StoredCodeFile[]>
  updateCodeFile(id: string, content: string): Promise<StoredCodeFile | null>
  getRuns(projectId: string): Promise<StoredRun[]>
  getAllRuns(userId: string): Promise<StoredRunWithProject[]>
  createRun(projectId: string): Promise<StoredRun>
  setRunPlan(id: string, plan: StoredRunPlan): Promise<void>
  updateRunProgress(id: string, progress: string): Promise<void>
  appendRunEvent(id: string, event: RunEvent): Promise<void>
  completeRun(id: string, duration: number, trace: StoredRun["trace"], citations?: RunCitation[], outcome?: RunOutcome): Promise<void>
  failRun(id: string, trace: StoredRun["trace"]): Promise<void>
  getTasks(projectId: string): Promise<StoredTask[]>
  createTask(projectId: string, data: TaskInput): Promise<StoredTask>
  updateTask(id: string, data: Partial<StoredTask>): Promise<StoredTask | null>
  deleteTask(id: string): Promise<void>
  reorderTasks(projectId: string, taskIds: string[]): Promise<void>
  getUserGithubToken(userId: string): Promise<string | null>
  setUserGithubToken(userId: string, token: string | null): Promise<void>
  getUserJiraConfig(userId: string): Promise<JiraConfig | null>
  setUserJiraConfig(userId: string, config: JiraConfig | null): Promise<void>
  getUserLinearToken(userId: string): Promise<string | null>
  setUserLinearToken(userId: string, token: string | null): Promise<void>
  getActivities(userId: string, limit?: number): Promise<Activity[]>
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
    tasks: StoredTask[]
    githubTokens: Map<string, string>
    jiraConfigs: Map<string, JiraConfig>
    linearTokens: Map<string, string>
    codeFiles: StoredCodeFile[]
  }
}
const _state = (_g.__forge ??= {
  projects: [],
  decisions: [],
  artifacts: [],
  runs: [],
  activities: [],
  tasks: [],
  githubTokens: new Map<string, string>(),
  jiraConfigs: new Map<string, JiraConfig>(),
  linearTokens: new Map<string, string>(),
  codeFiles: [],
})
const projects = _state.projects
const decisions = _state.decisions
const artifacts = _state.artifacts
const runs = _state.runs
const activities = _state.activities
const tasks = _state.tasks
const githubTokens = _state.githubTokens
const jiraConfigs = (_state.jiraConfigs ??= new Map<string, JiraConfig>())
const linearTokens = (_state.linearTokens ??= new Map<string, string>())
const codeFiles = (_state.codeFiles ??= [])

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
    tasks.splice(0)
  },

  async clearUser(userId) {
    const ownedIds = new Set(projects.filter((p) => p.userId === userId).map((p) => p.id))
    projects.splice(0, projects.length, ...projects.filter((p) => p.userId !== userId))
    decisions.splice(0, decisions.length, ...decisions.filter((d) => !ownedIds.has(d.projectId)))
    artifacts.splice(0, artifacts.length, ...artifacts.filter((a) => !ownedIds.has(a.projectId)))
    runs.splice(0, runs.length, ...runs.filter((r) => !ownedIds.has(r.projectId)))
    tasks.splice(0, tasks.length, ...tasks.filter((t) => !ownedIds.has(t.projectId)))
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
      githubRepo: null,
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
    tasks.splice(0, tasks.length, ...tasks.filter((t) => t.projectId !== id))
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
      votes: {},
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

  async resolveDecision(decisionId, consensus, confidence, votes) {
    const d = decisions.find((x) => x.id === decisionId)
    if (!d) return
    d.status = "consensus"
    d.consensus = consensus
    d.confidence = confidence
    if (votes) d.votes = votes
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

  async updateArtifact(id, data) {
    const a = artifacts.find((x) => x.id === id)
    if (!a) return null
    if (data.title !== undefined) a.title = data.title
    if (data.content !== undefined) a.content = data.content
    a.updatedAt = new Date()
    return a
  },

  async getCodeFiles(projectId) {
    return codeFiles
      .filter((f) => f.projectId === projectId)
      .sort((a, b) => a.path.localeCompare(b.path))
  },

  async replaceCodeFiles(projectId, files) {
    codeFiles.splice(0, codeFiles.length, ...codeFiles.filter((f) => f.projectId !== projectId))
    const now = new Date()
    const created = files.map((f) => ({
      id: uid(), projectId, path: f.path, content: f.content, createdAt: now, updatedAt: now,
    }))
    codeFiles.push(...created)
    return created.sort((a, b) => a.path.localeCompare(b.path))
  },

  async updateCodeFile(id, content) {
    const f = codeFiles.find((x) => x.id === id)
    if (!f) return null
    f.content = content
    f.updatedAt = new Date()
    return f
  },

  async getTasks(projectId) {
    return tasks
      .filter((t) => t.projectId === projectId)
      .sort((a, b) => a.order - b.order)
  },

  async createTask(projectId, data) {
    const existing = tasks.filter((t) => t.projectId === projectId)
    const task: StoredTask = {
      id: uid(),
      projectId,
      title: data.title,
      description: data.description ?? "",
      priority: data.priority ?? "p2",
      storyPoints: data.storyPoints ?? null,
      status: data.status ?? "todo",
      order: data.order ?? existing.length,
      assignee: data.assignee ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    tasks.push(task)
    return task
  },

  async updateTask(id, data) {
    const idx = tasks.findIndex((t) => t.id === id)
    if (idx === -1) return null
    tasks[idx] = { ...tasks[idx], ...data, updatedAt: new Date() }
    return tasks[idx]
  },

  async deleteTask(id) {
    const idx = tasks.findIndex((t) => t.id === id)
    if (idx === -1) return
    tasks.splice(idx, 1)
  },

  async reorderTasks(projectId, taskIds) {
    taskIds.forEach((id, order) => {
      const t = tasks.find((x) => x.id === id && x.projectId === projectId)
      if (t) t.order = order
    })
  },

  async getRuns(projectId) {
    return runs
      .filter((r) => r.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  },

  async getAllRuns(userId) {
    const owned = new Map(projects.filter((p) => p.userId === userId).map((p) => [p.id, p.name]))
    return runs
      .filter((r) => owned.has(r.projectId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((r) => ({
        ...r,
        projectName: owned.get(r.projectId) ?? "Unknown",
      }))
  },

  async createRun(projectId) {
    const run: StoredRun = {
      id: uid(), projectId, status: "running", progress: null, duration: null, trace: [], plan: null, citations: [], events: [], confidence: null, votes: {}, consensus: null, createdAt: new Date(),
    }
    runs.push(run)
    return run
  },

  async setRunPlan(id, plan) {
    const r = runs.find((x) => x.id === id)
    if (!r) return
    r.plan = plan
  },

  async updateRunProgress(id, progress) {
    const r = runs.find((x) => x.id === id)
    if (!r) return
    r.progress = progress
  },

  async appendRunEvent(id, event) {
    const r = runs.find((x) => x.id === id)
    if (!r) return
    r.events.push(event)
  },

  async completeRun(id, duration, trace, citations = [], outcome) {
    const r = runs.find((x) => x.id === id)
    if (!r) return
    r.status = "completed"
    r.progress = null
    r.duration = duration
    r.trace = trace
    r.citations = citations
    if (outcome) {
      r.confidence = outcome.confidence
      r.votes = outcome.votes
      r.consensus = outcome.consensus
    }
  },

  async failRun(id, trace) {
    const r = runs.find((x) => x.id === id)
    if (!r) return
    r.status = "failed"
    r.progress = null
    r.duration = 0
    r.trace = trace
  },

  async getActivities(userId, limit = 10) {
    const owned = new Set(projects.filter((p) => p.userId === userId).map((p) => p.id))
    return activities
      .filter((a) => owned.has(a.projectId))
      .slice(-limit)
      .reverse()
  },

  async getProjectProgress(projectId) {
    const projectDecisions = decisions.filter((d) => d.projectId === projectId)
    const resolved = projectDecisions.filter((d) => d.status === "consensus").length
    const artifactCount = artifacts.filter((a) => a.projectId === projectId).length
    return progressFrom(projectDecisions.length, resolved, artifactCount)
  },

  async getUserGithubToken(userId) {
    return githubTokens.get(userId) ?? null
  },

  async setUserGithubToken(userId, token) {
    if (token) {
      githubTokens.set(userId, token)
    } else {
      githubTokens.delete(userId)
    }
  },

  async getUserJiraConfig(userId) {
    return jiraConfigs.get(userId) ?? null
  },

  async setUserJiraConfig(userId, config) {
    if (config) {
      jiraConfigs.set(userId, config)
    } else {
      jiraConfigs.delete(userId)
    }
  },

  async getUserLinearToken(userId) {
    return linearTokens.get(userId) ?? null
  },

  async setUserLinearToken(userId, token) {
    if (token) {
      linearTokens.set(userId, token)
    } else {
      linearTokens.delete(userId)
    }
  },

  async seed(userId) {
    if (projects.some((p) => p.userId === userId)) return
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
    githubRepo: r.githubRepo ?? null,
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
    votes: r.votes ?? {},
    createdAt: r.createdAt,
  }
}

function mapTask(r: typeof schema.tasks.$inferSelect): StoredTask {
  return {
    id: r.id,
    projectId: r.projectId,
    title: r.title,
    description: r.description ?? "",
    priority: r.priority as StoredTask["priority"],
    storyPoints: r.storyPoints ?? null,
    status: r.status as StoredTask["status"],
    order: r.order,
    assignee: r.assignee ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

function mapRun(r: typeof schema.runs.$inferSelect): StoredRun {
  return {
    id: r.id,
    projectId: r.projectId,
    status: r.status,
    progress: r.progress ?? null,
    duration: r.duration ?? null,
    trace: r.trace ?? [],
    plan: r.plan ?? null,
    citations: r.citations ?? [],
    events: (r.events ?? []) as RunEvent[],
    confidence: r.confidence ?? null,
    votes: r.votes ?? {},
    consensus: r.consensus ?? null,
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
    if (data.githubRepo !== undefined) patch.githubRepo = data.githubRepo
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
    const entry = { agent, message, timestamp: new Date().toISOString() }
    // Atomic jsonb append — no read-modify-write round trip.
    const [d] = await db
      .update(schema.decisions)
      .set({ entries: sql`${schema.decisions.entries} || ${JSON.stringify([entry])}::jsonb`, status: "voting" })
      .where(eq(schema.decisions.id, decisionId))
      .returning({ projectId: schema.decisions.projectId })
    if (!d) return
    const [project] = await db
      .select({ id: schema.projects.id, name: schema.projects.name })
      .from(schema.projects)
      .where(eq(schema.projects.id, d.projectId))
      .limit(1)
    if (project) {
      await db.insert(schema.activities).values({
        projectId: project.id,
        agent,
        action: message.length > 60 ? message.slice(0, 60) + "..." : message,
        project: project.name,
      })
    }
  },

  async resolveDecision(decisionId, consensus, confidence, votes) {
    await getDb()
      .update(schema.decisions)
      .set({ status: "consensus", consensus, confidence, ...(votes ? { votes } : {}) })
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

  async updateArtifact(id, data) {
    const patch: Partial<typeof schema.artifacts.$inferInsert> = { updatedAt: new Date() }
    if (data.title !== undefined) patch.title = data.title
    if (data.content !== undefined) patch.content = data.content
    const [row] = await getDb().update(schema.artifacts).set(patch).where(eq(schema.artifacts.id, id)).returning()
    return row ?? null
  },

  async getCodeFiles(projectId) {
    return getDb()
      .select()
      .from(schema.codeFiles)
      .where(eq(schema.codeFiles.projectId, projectId))
      .orderBy(schema.codeFiles.path)
  },

  async replaceCodeFiles(projectId, files) {
    const db = getDb()
    await db.delete(schema.codeFiles).where(eq(schema.codeFiles.projectId, projectId))
    if (files.length === 0) return []
    const rows = await db
      .insert(schema.codeFiles)
      .values(files.map((f) => ({ projectId, path: f.path, content: f.content })))
      .returning()
    return rows.sort((a, b) => a.path.localeCompare(b.path))
  },

  async updateCodeFile(id, content) {
    const [row] = await getDb()
      .update(schema.codeFiles)
      .set({ content, updatedAt: new Date() })
      .where(eq(schema.codeFiles.id, id))
      .returning()
    return row ?? null
  },

  async getTasks(projectId) {
    const rows = await getDb()
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.projectId, projectId))
      .orderBy(schema.tasks.order)
    return rows.map(mapTask)
  },

  async createTask(projectId, data) {
    const [{ value: count }] = await getDb()
      .select({ value: sql<number>`count(*)` })
      .from(schema.tasks)
      .where(eq(schema.tasks.projectId, projectId))
    const [row] = await getDb()
      .insert(schema.tasks)
      .values({
        projectId,
        title: data.title,
        description: data.description ?? "",
        priority: data.priority ?? "p2",
        storyPoints: data.storyPoints ?? null,
        status: data.status ?? "todo",
        order: data.order ?? Number(count),
        assignee: data.assignee ?? null,
      })
      .returning()
    return mapTask(row)
  },

  async updateTask(id, data) {
    const patch: Partial<typeof schema.tasks.$inferInsert> = { updatedAt: new Date() }
    if (data.title !== undefined) patch.title = data.title
    if (data.description !== undefined) patch.description = data.description
    if (data.priority !== undefined) patch.priority = data.priority
    if (data.storyPoints !== undefined) patch.storyPoints = data.storyPoints
    if (data.status !== undefined) patch.status = data.status
    if (data.order !== undefined) patch.order = data.order
    if (data.assignee !== undefined) patch.assignee = data.assignee
    const [row] = await getDb().update(schema.tasks).set(patch).where(eq(schema.tasks.id, id)).returning()
    return row ? mapTask(row) : null
  },

  async deleteTask(id) {
    await getDb().delete(schema.tasks).where(eq(schema.tasks.id, id))
  },

  async reorderTasks(projectId, taskIds) {
    if (taskIds.length === 0) return
    // One statement for the whole board — N sequential UPDATEs through the
    // pooler made drag-and-drop persistence take seconds on larger boards.
    const values = sql.join(
      taskIds.map((id, i) => sql`(${id}::uuid, ${i}::integer)`),
      sql`, `
    )
    await getDb().execute(sql`
      UPDATE ${schema.tasks} AS t
      SET "order" = v.ord
      FROM (VALUES ${values}) AS v(id, ord)
      WHERE t.id = v.id AND t.project_id = ${projectId}::uuid
    `)
  },

  async getRuns(projectId) {
    const rows = await getDb()
      .select()
      .from(schema.runs)
      .where(eq(schema.runs.projectId, projectId))
      .orderBy(desc(schema.runs.createdAt))
    return rows.map(mapRun)
  },

  async getAllRuns(userId) {
    // Polled every few seconds by the notification center — project only the
    // columns it renders. The heavy jsonb columns (events, citations, plan)
    // would otherwise dominate the payload.
    const rows = await getDb()
      .select({
        id: schema.runs.id,
        projectId: schema.runs.projectId,
        status: schema.runs.status,
        progress: schema.runs.progress,
        duration: schema.runs.duration,
        trace: schema.runs.trace,
        confidence: schema.runs.confidence,
        consensus: schema.runs.consensus,
        createdAt: schema.runs.createdAt,
        projectName: schema.projects.name,
      })
      .from(schema.runs)
      .innerJoin(schema.projects, eq(schema.runs.projectId, schema.projects.id))
      .where(eq(schema.projects.userId, userId))
      .orderBy(desc(schema.runs.createdAt))
      .limit(50)
    return rows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      status: r.status,
      progress: r.progress ?? null,
      duration: r.duration ?? null,
      trace: r.trace ?? [],
      plan: null,
      citations: [],
      events: [],
      confidence: r.confidence ?? null,
      votes: {},
      consensus: r.consensus ?? null,
      createdAt: r.createdAt,
      projectName: r.projectName,
    }))
  },

  async createRun(projectId) {
    const [row] = await getDb().insert(schema.runs).values({ projectId }).returning()
    return mapRun(row)
  },

  async setRunPlan(id, plan) {
    await getDb().update(schema.runs).set({ plan }).where(eq(schema.runs.id, id))
  },

  async updateRunProgress(id, progress) {
    await getDb().update(schema.runs).set({ progress }).where(eq(schema.runs.id, id))
  },

  async appendRunEvent(id, event) {
    // Atomic jsonb append — avoids read-modify-write on every event.
    await getDb()
      .update(schema.runs)
      .set({ events: sql`${schema.runs.events} || ${JSON.stringify([event])}::jsonb` })
      .where(eq(schema.runs.id, id))
  },

  async completeRun(id, duration, trace, citations = [], outcome) {
    await getDb()
      .update(schema.runs)
      .set({
        status: "completed",
        progress: null,
        duration,
        trace,
        citations,
        ...(outcome
          ? { confidence: outcome.confidence, votes: outcome.votes, consensus: outcome.consensus }
          : {}),
      })
      .where(eq(schema.runs.id, id))
  },

  async failRun(id, trace) {
    await getDb()
      .update(schema.runs)
      .set({ status: "failed", progress: null, duration: 0, trace })
      .where(eq(schema.runs.id, id))
  },

  async getActivities(userId, limit = 10) {
    const rows = await getDb()
      .select()
      .from(schema.activities)
      .innerJoin(schema.projects, eq(schema.activities.projectId, schema.projects.id))
      .where(eq(schema.projects.userId, userId))
      .orderBy(desc(schema.activities.createdAt))
      .limit(limit)
    return rows.map((r) => ({
      id: r.activities.id,
      agent: r.activities.agent,
      action: r.activities.action,
      project: r.activities.project,
      projectId: r.activities.projectId,
      timestamp: ago(r.activities.createdAt),
    }))
  },

  async getProjectProgress(projectId) {
    const db = getDb()
    const [[{ total, resolved }], [{ artifactCount }]] = await Promise.all([
      db
        .select({
          total: sql<number>`count(*)`,
          resolved: sql<number>`count(*) filter (where ${schema.decisions.status} = 'consensus')`,
        })
        .from(schema.decisions)
        .where(eq(schema.decisions.projectId, projectId)),
      db
        .select({ artifactCount: sql<number>`count(*)` })
        .from(schema.artifacts)
        .where(eq(schema.artifacts.projectId, projectId)),
    ])
    return progressFrom(Number(total), Number(resolved), Number(artifactCount))
  },

  async getUserGithubToken(userId) {
    const [row] = await getDb().select().from(schema.users).where(eq(schema.users.id, userId)).limit(1)
    return row?.githubToken ?? null
  },

  async setUserGithubToken(userId, token) {
    await getDb().update(schema.users).set({ githubToken: token }).where(eq(schema.users.id, userId))
  },

  async getUserJiraConfig(userId) {
    const [row] = await getDb().select().from(schema.users).where(eq(schema.users.id, userId)).limit(1)
    if (!row?.jiraDomain || !row.jiraEmail || !row.jiraToken) return null
    return { domain: row.jiraDomain, email: row.jiraEmail, token: row.jiraToken }
  },

  async setUserJiraConfig(userId, config) {
    await getDb()
      .update(schema.users)
      .set({
        jiraDomain: config?.domain ?? null,
        jiraEmail: config?.email ?? null,
        jiraToken: config?.token ?? null,
      })
      .where(eq(schema.users.id, userId))
  },

  async getUserLinearToken(userId) {
    const [row] = await getDb().select().from(schema.users).where(eq(schema.users.id, userId)).limit(1)
    return row?.linearToken ?? null
  },

  async setUserLinearToken(userId, token) {
    await getDb().update(schema.users).set({ linearToken: token }).where(eq(schema.users.id, userId))
  },

  async seed(userId) {
    const [{ value }] = await getDb()
      .select({ value: sql<number>`count(*)` })
      .from(schema.projects)
      .where(eq(schema.projects.userId, userId))
    if (Number(value) > 0) return
    await seedDemo(dbStore, userId)
  },
}

// ===========================================================================
// Shared demo seed (backend-agnostic — uses the public DataStore interface)
// ===========================================================================

async function seedDemo(s: DataStore, userId: string) {
  // Project 1: Aura Energy (The Demo Project - Active/Review)
  const p1 = await s.createProject({
    userId,
    name: "Aura Energy",
    description: "Decentralized energy marketplace for P2P power trading on Azure Blockchain.",
    template: "marketplace",
  })
  await s.updateProject(p1.id, { status: "active" })

  // Project 2: Quantum Logistics (The Success Story - Approved)
  const p2 = await s.createProject({
    userId,
    name: "Quantum Logistics",
    description: "Autonomous drone fleet orchestration for last-mile medical delivery.",
    template: "saas",
  })
  await s.updateProject(p2.id, { status: "approved" })

  // Project 3: HealthLink AI (Active - Mid Progress)
  const p3 = await s.createProject({
    userId,
    name: "HealthLink AI",
    description: "Predictive diagnostics platform for rural clinics using Edge computing.",
    template: "ai-workspace",
  })
  await s.updateProject(p3.id, { status: "active" })

  // Project 4: Space-X Logistics (Planning - New)
  const p4 = await s.createProject({
    userId,
    name: "Interstellar Cargo",
    description: "Supply chain management for multi-planetary resource extraction.",
    template: "saas",
  })

  // --- Aura Energy Decisions & Artifacts ---
  const d1 = await s.createDecision(p1.id, "Compliance vs Blockchain Transparency")
  await s.addDecisionEntry(d1.id, "pm", "We need to comply with GDPR 2026 while maintaining the ledger's integrity.")
  await s.addDecisionEntry(d1.id, "architect", "Zero-knowledge proofs could bridge the gap between privacy and verification.")
  await s.addDecisionEntry(d1.id, "qa", "Rejection: Proposed initial flow exposes PII on the public ledger. Requires revision.")
  await s.resolveDecision(d1.id, "Consensus reached: Implementation of ZK-Rollups to handle private trading data off-chain with public verification.", 0.95, {
    pm: { vote: "approve", confidence: 0.9, concerns: "", round: 1 },
    architect: { vote: "approve", confidence: 0.95, concerns: "", round: 2 },
    qa: { vote: "approve", confidence: 0.92, concerns: "Audit trail verified for round 2 architecture", round: 2 },
  })

  await s.createArtifact(p1.id, "prd", "PRD: Aura Energy Core", `## Overview\nAura Energy is a decentralized P2P energy trading platform built on Azure Blockchain. It allows prosumers to sell excess solar energy directly to neighbors.\n\n## Core Pillars\n1. **Decentralization**: No central utility intermediary.\n2. **Privacy**: GDPR 2026 compliant via ZK-Proofs.\n3. **Scalability**: Capable of 10k transactions per second via L2 scaling.`)
  
  await s.createArtifact(p1.id, "architecture", "System Architecture v2", `## Tech Stack\n- **Frontend**: Next.js 15 (App Router)\n- **Blockchain**: Azure Managed Confidential Ledger\n- **Compute**: Azure Functions for ZK-generation\n- **Identity**: Microsoft Entra Verified ID\n\n## High-Level Design\nThe system uses a Hybrid-Mesh topology for energy routing signals...`)

  // --- Quantum Logistics Decisions (Approved Project) ---
  const d2 = await s.createDecision(p2.id, "Drone Fleet Communication Protocol")
  await s.resolveDecision(d2.id, "Standardized on Starlink-based satellite backhaul for 100% coverage in rural areas.", 0.98, {
    architect: { vote: "approve", confidence: 0.98, concerns: "", round: 1 },
    qa: { vote: "approve", confidence: 0.96, concerns: "", round: 1 },
  })
  
  await s.createArtifact(p2.id, "prd", "PRD: Drone Fleet v1.0", "Full specification for medical delivery drones...")
  await s.createArtifact(p2.id, "architecture", "Drone Control Mesh", "Diagram and spec for autonomous swarm coordination...")

  // --- Aura Energy Run (The Demo Run Replay) ---
  const run = await s.createRun(p1.id)
  await s.setRunPlan(run.id, {
    strategy: "Analyze GDPR 2026 impact on P2P energy trading. Architect must propose privacy-preserving ledger updates. QA must verify against compliance corpus.",
    selected: [
      { agent: "pm", reason: "Define the legal constraints and user privacy requirements." },
      { agent: "architect", reason: "Propose ZK-Proof architecture for energy ledgers." },
      { agent: "qa", reason: "Adversarial review of data leakage on public chains." },
      { agent: "business", reason: "Validate that privacy compliance doesn't break the marketplace liquidity." },
    ],
    skipped: [
      { agent: "ux", reason: "UI flows are secondary to the core architectural compliance challenge." },
      { agent: "scrum", reason: "Sprints will be planned after architectural sign-off." },
    ],
    source: "model",
    log: [
      { at: "[00:05.10]", type: "plan", detail: "4 agents selected", reason: "Reasoning focus: Compliance" },
      { at: "[01:10.22]", type: "revision", detail: "QA rejected architect (round 1)", reason: "Ledger leak detected" },
    ],
  })

  const demoEvents: RunEvent[] = []
  const baseTs = Date.now() - 3600 * 1000
  let seq = 0
  const ev = (at: string, e: Omit<RunEvent, "at" | "ts">) => {
    demoEvents.push({ at, ts: new Date(baseTs + ++seq * 1000).toISOString(), ...e })
  }

  ev("[00:00.00]", { kind: "retrieval", agent: "orchestrator", detail: "Retrieved 5 sources from Azure Compliance Corpus", summary: "Grounded in GDPR 2026 and Energy Ledger Standards" })
  ev("[00:05.10]", { kind: "plan", agent: "orchestrator", detail: "Strategy: Privacy-first ledger architecture", summary: "pm → architect → qa → business" })
  
  // PM
  ev("[00:10.00]", { kind: "agent_state", agent: "pm", state: "reasoning", detail: "Analyzing GDPR 2026 requirements" })
  ev("[00:25.00]", { kind: "vote", agent: "pm", vote: "approve", confidence: 0.9, detail: "Compliance requirements mapped" })
  ev("[00:26.00]", { kind: "agent_state", agent: "pm", state: "completed", detail: "Output handed to Architect" })

  // Architect Round 1
  ev("[00:30.00]", { kind: "agent_state", agent: "architect", state: "reasoning", detail: "Designing ledger schema" })
  ev("[00:50.00]", { kind: "vote", agent: "architect", vote: "approve", confidence: 0.85, detail: "Initial architecture complete" })
  ev("[00:51.00]", { kind: "agent_state", agent: "architect", state: "completed", detail: "Output handed to QA" })

  // QA Round 1 (Rejection)
  ev("[01:00.00]", { kind: "agent_state", agent: "qa", state: "reviewing", detail: "Scanning for data leakage" })
  ev("[01:10.00]", { kind: "vote", agent: "qa", vote: "reject", confidence: 0.95, detail: "PII detected in public headers!" })
  ev("[01:10.22]", { kind: "checkpoint", agent: "orchestrator", from: "qa", to: "architect", detail: "Revision requested: Remove PII from headers", summary: "Security Breach Prevention" })

  // Architect Round 2 (Revision)
  ev("[01:20.00]", { kind: "agent_state", agent: "architect", state: "revising", detail: "Implementing ZK-Rollups" })
  ev("[01:50.00]", { kind: "vote", agent: "architect", vote: "approve", confidence: 0.95, detail: "Revised architecture (ZK) complete" })
  ev("[01:51.00]", { kind: "agent_state", agent: "architect", state: "completed", detail: "Re-submitting to QA" })

  // QA Round 2 (Approval)
  ev("[02:00.00]", { kind: "agent_state", agent: "qa", state: "reviewing", detail: "Re-scanning revised schema" })
  ev("[02:20.00]", { kind: "vote", agent: "qa", vote: "approve", confidence: 0.92, detail: "Compliance verified" })
  ev("[02:21.00]", { kind: "agent_state", agent: "qa", state: "completed", detail: "Output handed to Business" })

  // Finalization
  ev("[02:40.00]", { kind: "consensus", agent: "orchestrator", confidence: 0.95, detail: "Consensus: Secure Energy Ledger achieved", summary: "Final architecture ready for implementation" })
  ev("[02:50.00]", { kind: "complete", agent: "orchestrator", detail: "Run complete", summary: "4 agents · 1 revision · High Confidence" })

  for (const e of demoEvents) await s.appendRunEvent(run.id, e)
  await s.completeRun(run.id, 170, 
    [{ time: "+0.00s", action: "iq.intent.parse", detail: "energy / blockchain" }],
    [{ ref: "G1", id: "gdpr-2026", title: "GDPR 2026 Regulation", source: "Azure Regulatory Compliance", score: 10, snippet: "Personal data on ledgers must be encrypted or zero-knowledge verified." }],
    {
      confidence: 0.95,
      consensus: "ZK-Rollup architecture for energy trading",
      votes: {
        pm: { vote: "approve", confidence: 0.9, concerns: "", round: 1 },
        architect: { vote: "approve", confidence: 0.95, concerns: "", round: 2 },
        qa: { vote: "approve", confidence: 0.92, concerns: "", round: 2 },
        business: { vote: "approve", confidence: 0.88, concerns: "", round: 1 },
      }
    }
  )

  // Sync Progress
  await s.updateProject(p1.id, { progress: await s.getProjectProgress(p1.id) })
  await s.updateProject(p2.id, { progress: await s.getProjectProgress(p2.id) })
  await s.updateProject(p3.id, { progress: await s.getProjectProgress(p3.id) })
  await s.updateProject(p4.id, { progress: await s.getProjectProgress(p4.id) })
}

export const store: DataStore = dbEnabled ? dbStore : memStore
