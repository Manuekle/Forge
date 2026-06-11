import { pgTable, text, timestamp, uuid, integer, real, jsonb } from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("email_verified", { mode: "date", withTimezone: true }),
  image: text("image"),
  plan: text("plan").default("free").notNull(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
})

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
})

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey().notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
})

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
})

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("planning").notNull(),
  progress: integer("progress").default(0).notNull(),
  template: text("template"),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
})

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
  votes: jsonb("votes").$type<Record<string, string>>().default({}),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
})

export const artifacts = pgTable("artifacts", {
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
})

export const runs = pgTable("runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  status: text("status").default("running").notNull(),
  progress: text("progress"),
  duration: integer("duration"),
  trace: jsonb("trace").$type<{ time: string; action: string; detail: string }[]>().default([]).notNull(),
  citations: jsonb("citations")
    .$type<{ ref: string; id: string; title: string; source: string; score: number; snippet: string }[]>()
    .default([])
    .notNull(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
})

export const activities = pgTable("activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  agent: text("agent").notNull(),
  action: text("action").notNull(),
  project: text("project").notNull(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
})
