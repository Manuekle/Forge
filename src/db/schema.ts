import { pgTable, text, timestamp, uuid, integer, real, jsonb, index } from "drizzle-orm/pg-core"

// Profile / settings table. The id mirrors Supabase Auth's `auth.users.id`
// (kept in sync by the `handle_new_user` trigger), so it remains the owner key
// for `projects.userId`. Auth credentials & OAuth identities live in the
// GoTrue-managed `auth` schema, not here.
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("email_verified", { mode: "date", withTimezone: true }),
  image: text("image"),
  plan: text("plan").default("free").notNull(),
  githubToken: text("github_token"),
  jiraDomain: text("jira_domain"),
  jiraEmail: text("jira_email"),
  jiraToken: text("jira_token"),
  linearToken: text("linear_token"),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
})

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").default("planning").notNull(),
    progress: integer("progress").default(0).notNull(),
    template: text("template"),
    githubRepo: text("github_repo"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("projects_user_updated_idx").on(t.userId, t.updatedAt.desc())]
)

export const decisions = pgTable("decisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  topic: text("topic").notNull(),
  status: text("status").default("open").notNull(),
  confidence: real("confidence"),
  consensus: text("consensus"),
  entries: jsonb("entries").$type<{ agent: string; message: string; timestamp: string }[]>().default([]).notNull(),
  votes: jsonb("votes")
    .$type<Record<string, { vote: string; confidence: number | null; concerns: string; round: number }>>()
    .default({}),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
},
  (t) => [index("decisions_project_created_idx").on(t.projectId, t.createdAt.desc())]
)

export const artifacts = pgTable(
  "artifacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    version: integer("version").default(1).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("artifacts_project_type_idx").on(t.projectId, t.type)]
)

export const runs = pgTable("runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  status: text("status").default("running").notNull(),
  progress: text("progress"),
  duration: integer("duration"),
  trace: jsonb("trace").$type<{ time: string; action: string; detail: string }[]>().default([]).notNull(),
  // Orchestrator execution plan + decision log: which agents were selected /
  // skipped and why, plus every routing decision made during the run.
  plan: jsonb("plan").$type<{
    strategy: string
    selected: { agent: string; reason: string }[]
    skipped: { agent: string; reason: string }[]
    source: string
    log?: { at: string; type: string; detail: string; reason: string }[]
  }>(),
  citations: jsonb("citations")
    .$type<{ ref: string; id: string; title: string; source: string; score: number; snippet: string }[]>()
    .default([])
    .notNull(),
  // Structured execution events emitted live during the run: agent state
  // transitions, handoffs, votes, checkpoints. Drives the orchestration UI.
  events: jsonb("events")
    .$type<
      {
        at: string
        ts: string
        kind: string
        agent?: string
        state?: string
        detail: string
        from?: string
        to?: string
        summary?: string
        vote?: string
        confidence?: number
      }[]
    >()
    .default([])
    .notNull(),
  confidence: real("confidence"),
  votes: jsonb("votes")
    .$type<Record<string, { vote: string; confidence: number | null; concerns: string; round: number }>>()
    .default({}),
  consensus: text("consensus"),
  // Public share slug. When set, this run's Decision Record is viewable at
  // /d/<shareId> with no auth. NULL = private (the default). Unique so the
  // slug is an unguessable, stable permalink.
  shareId: text("share_id").unique(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
},
  (t) => [index("runs_project_created_idx").on(t.projectId, t.createdAt.desc())]
)

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").default("p2").notNull(),
  storyPoints: integer("story_points"),
  status: text("status").default("todo").notNull(),
  order: integer("order").default(0).notNull(),
  assignee: text("assignee"),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
},
  (t) => [index("tasks_project_order_idx").on(t.projectId, t.order)]
)

export const codeFiles = pgTable(
  "code_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("code_files_project_idx").on(t.projectId)]
)

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    agent: text("agent").notNull(),
    action: text("action").notNull(),
    project: text("project").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("activities_project_created_idx").on(t.projectId, t.createdAt.desc())]
)
