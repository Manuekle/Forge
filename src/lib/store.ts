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
    const db = getDb()
    for (let i = 0; i < taskIds.length; i++) {
      await db.update(schema.tasks).set({ order: i }).where(eq(schema.tasks.id, taskIds[i]))
    }
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
    const db = getDb()
    const rows = await db
      .select()
      .from(schema.runs)
      .innerJoin(schema.projects, eq(schema.runs.projectId, schema.projects.id))
      .where(eq(schema.projects.userId, userId))
      .orderBy(desc(schema.runs.createdAt))
      .limit(50)
    return rows.map((r) => ({
      ...mapRun(r.runs),
      projectName: r.projects.name,
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
  // Demo plan + event stream: a faithful replay of a real orchestrated run so
  // the orchestration view is fully populated without waiting for a live run.
  await s.setRunPlan(run.id, {
    strategy: "Ground the marketplace in business viability first, then product, UX and architecture; QA reviews everything before consensus.",
    selected: [
      { agent: "business", reason: "Two-sided marketplace — monetization and liquidity strategy must anchor every other decision." },
      { agent: "pm", reason: "Define the pickup-first MVP scope, user stories and success metrics." },
      { agent: "ux", reason: "Buyer and cook journeys are the core of a food marketplace experience." },
      { agent: "architect", reason: "Payments, identity and ordering need explicit API and data-model decisions." },
      { agent: "qa", reason: "Food safety, fraud and payment risks demand adversarial review before consensus." },
    ],
    skipped: [
      { agent: "scrum", reason: "Design-stage request — sprint planning deferred until the architecture stabilizes." },
    ],
    source: "model",
    log: [
      { at: "[00:09.41]", type: "plan", detail: "5 selected · 1 skipped", reason: "order: business → pm → ux → architect → qa" },
      { at: "[01:29.12]", type: "revision", detail: "QA critique routed to architect (round 2)", reason: "Escrow release flow lacks dispute-window handling for no-show pickups" },
      { at: "[02:41.30]", type: "confidence", detail: "confidence 0.87 from 5 votes", reason: "vote score 0.86 (3 approve / 2 concerns / 0 reject) · self-reported 0.89 · blended 0.7/0.3" },
    ],
  })
  const demoEvents: RunEvent[] = []
  const baseTs = Date.now() - 167_000
  let seq = 0
  const ev = (at: string, e: Omit<RunEvent, "at" | "ts">) => {
    demoEvents.push({ at, ts: new Date(baseTs + ++seq * 1500).toISOString(), ...e })
  }
  ev("[00:00.48]", { kind: "retrieval", agent: "orchestrator", detail: "Retrieved 3 grounded sources (local-corpus)", summary: "[S1] Marketplace Trust & Safety · [S2] Marketplace Liquidity & Pricing · [S3] Application Security Baseline" })
  ev("[00:09.41]", { kind: "plan", agent: "orchestrator", detail: "Ground the marketplace in business viability first, then product, UX and architecture; QA reviews everything before consensus.", summary: "business → pm → ux → architect → qa · skipped: scrum" })
  const demoFlow: { agent: string; from: string; t0: number; vote: string; conf: number; summary: string }[] = [
    { agent: "business", from: "orchestrator", t0: 10, vote: "approve", conf: 0.84, summary: "Commission-on-order revenue model with cook subscription upsell" },
    { agent: "pm", from: "business", t0: 26, vote: "approve", conf: 0.82, summary: "Pickup-first MVP: browse, order, scheduled pickup, ratings" },
    { agent: "ux", from: "pm", t0: 44, vote: "approve_with_concerns", conf: 0.78, summary: "Buyer flow in 5 steps; cook onboarding needs identity-verification UX [S1]" },
    { agent: "architect", from: "ux", t0: 61, vote: "approve_with_concerns", conf: 0.8, summary: "Next.js + Postgres + Stripe Connect; escrow held until pickup confirmation [S2]" },
    { agent: "qa", from: "architect", t0: 78, vote: "approve_with_concerns", conf: 0.72, summary: "Top risks: fraud surface without auth [S3], food-safety liability, dispute handling" },
  ]
  const mm = (sec: number) => `[${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}.20]`
  for (const f of demoFlow) {
    ev(mm(f.t0), { kind: "handoff", from: f.from, to: f.agent, detail: `${f.from === "orchestrator" ? "Orchestrator delegates to" : "Output handed to"} ${f.agent}`, summary: f.summary })
    ev(mm(f.t0 + 1), { kind: "agent_state", agent: f.agent, state: "reading_context", detail: "Reading project context + prior agent outputs + 3 grounded sources" })
    ev(mm(f.t0 + 3), { kind: "agent_state", agent: f.agent, state: f.agent === "qa" ? "reviewing" : "reasoning", detail: f.agent === "qa" ? "Reviewing the team's work and assessing risks" : "Analyzing the request and generating output" })
    ev(mm(f.t0 + 13), { kind: "agent_state", agent: f.agent, state: "voting", detail: "Casting vote on the project direction" })
    ev(mm(f.t0 + 14), { kind: "vote", agent: f.agent, vote: f.vote, confidence: f.conf, detail: `${f.agent} voted ${f.vote.replace(/_/g, " ")} (confidence ${f.conf.toFixed(2)})` })
    ev(mm(f.t0 + 15), { kind: "agent_state", agent: f.agent, state: "completed", detail: "Submitted output to the orchestrator", summary: f.summary })
  }
  ev("[01:29.12]", { kind: "checkpoint", agent: "orchestrator", from: "qa", to: "architect", detail: "QA critique routed to Architect for revision (round 2)", summary: "Escrow release flow lacks dispute-window handling for no-show pickups" })
  ev("[01:30.02]", { kind: "agent_state", agent: "architect", state: "revising", detail: "Revising prior output (round 2)" })
  ev("[01:52.44]", { kind: "vote", agent: "architect", vote: "approve", confidence: 0.85, detail: "architect voted approve (confidence 0.85)" })
  ev("[01:53.10]", { kind: "agent_state", agent: "architect", state: "completed", detail: "Submitted revised output (round 2) to the orchestrator", summary: "Added 24h dispute window + escrow release state machine" })
  ev("[02:41.30]", { kind: "vote", agent: "orchestrator", confidence: 0.87, detail: "Vote tally complete — run confidence 0.87", summary: "vote score 0.86 (3 approve / 2 concerns / 0 reject / 0 abstain) · self-reported 0.89 · blended 0.7/0.3" })
  ev("[02:42.18]", { kind: "consensus", agent: "orchestrator", confidence: 0.87, detail: "Consensus reached (confidence 0.87, vote-derived)", summary: "Pickup-first marketplace MVP with required authentication, Stripe Connect escrow and a 24h dispute window." })
  ev("[02:47.66]", { kind: "complete", agent: "orchestrator", confidence: 0.87, detail: "Run complete: 5 agents, 1 revision, 5 artifacts", summary: "execution path: business → pm → ux → architect → qa" })
  for (const e of demoEvents) await s.appendRunEvent(run.id, e)
  await s.completeRun(
    run.id,
    167,
    [
      { time: "[00:00.12]", action: "iq.intent.parse", detail: "marketplace / food / p2p" },
      { time: "[00:00.48]", action: "iq.knowledge.retrieve", detail: "3 sources · local-corpus" },
      { time: "[00:09.41]", action: "orchestrator.plan", detail: "5 selected · 1 skipped (scrum)" },
      { time: "[00:14.20]", action: "debate.open", detail: "buyer-authentication" },
      { time: "[01:29.12]", action: "orchestrator.revision", detail: "qa → architect · round 2" },
      { time: "[02:41.30]", action: "vote.tally", detail: "3 approve / 2 concerns · confidence 0.87" },
      { time: "[02:42.18]", action: "consensus.emit", detail: "confidence 0.87 (vote-derived)" },
      { time: "[02:47.66]", action: "run.complete", detail: "5 artifacts" },
    ],
    [
      { ref: "S1", id: "mkt-trust", title: "Marketplace Trust & Safety", source: "Forge KB / Marketplaces", score: 8, snippet: "Identity verification and escrow materially reduce fraud." },
      { ref: "S2", id: "mkt-liquidity", title: "Marketplace Liquidity & Pricing", source: "Forge KB / Marketplaces", score: 6, snippet: "Stripe Connect and Adyen are the standard payment rails for marketplaces." },
      { ref: "S3", id: "gen-security", title: "Application Security Baseline", source: "Forge KB / Engineering", score: 4, snippet: "Authenticate and authorize every API route; never rely on the client." },
    ],
    {
      confidence: 0.87,
      consensus: "Pickup-first marketplace MVP with required authentication, Stripe Connect escrow and a 24h dispute window.",
      votes: {
        business: { vote: "approve", confidence: 0.84, concerns: "", round: 1 },
        pm: { vote: "approve", confidence: 0.82, concerns: "", round: 1 },
        ux: { vote: "approve_with_concerns", confidence: 0.78, concerns: "Cook onboarding needs identity-verification UX [S1]", round: 1 },
        architect: { vote: "approve", confidence: 0.85, concerns: "", round: 2 },
        qa: { vote: "approve_with_concerns", confidence: 0.72, concerns: "Food-safety liability and dispute handling need policy decisions", round: 1 },
      },
    }
  )

  await s.updateProject(p1.id, { progress: await s.getProjectProgress(p1.id) })
  await s.updateProject(p2.id, { progress: await s.getProjectProgress(p2.id) })
  await s.updateProject(p3.id, { progress: await s.getProjectProgress(p3.id) })
}

export const store: DataStore = dbEnabled ? dbStore : memStore
