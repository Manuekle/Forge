<div align="center">

<img src="public/logo.png" alt="Forge logo" width="84" />

# Forge

**Transform ideas into production-ready products through collaborative AI agents.**

A multi-agent AI platform where a complete digital product team — PM, UX, Architect, QA, Scrum and Business agents — debates, votes and converges on a **client-ready Project Blueprint**, orchestrated and grounded by **Microsoft Foundry IQ**.

[![Agents League](https://img.shields.io/badge/Agents%20League%202026-Reasoning%20Agents-E85002?style=flat-square)](https://aka.ms/agentsleague/discord)
[![Microsoft IQ](https://img.shields.io/badge/Microsoft%20IQ-Foundry%20IQ-0078D4?style=flat-square)](https://ai.azure.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](#license)

<img src="public/og-hero.png" alt="Forge — Ship the plan, not the doubt" width="100%" />

</div>

---

## 🏆 Agents League @AISF 2026 — Submission

| | |
|---|---|
| **Track** | 🧠 Reasoning Agents — Build with Microsoft Foundry |
| **Microsoft IQ layer** | **Foundry IQ** — agent reasoning, orchestration planning and grounded knowledge retrieval |
| **Demo login** | `demo@forge.dev` / `forge` (seeded demo workspace included) |

---

## The Problem

In agency and consulting engagements, teams lose time and momentum to **misalignment across roles** — product, UX, engineering, QA. Deliverables get created in separate tools, reviewed asynchronously, and stitched together late. The result: rework, scope creep, unclear expectations and slow client approvals.

## The Solution

Forge orchestrates **six specialist AI agents** that collaborate on the same client brief — and unlike a single assistant, they **review and challenge each other's work**:

- The **Orchestrator plans** which agents the request actually needs, in what order, and records *why*.
- Agents reason in sequence, each reading the prior agents' outputs and the same grounded sources.
- **QA emits structured critiques**; high-severity findings are routed back to the responsible agent, which **revises its output** (visible as revision rounds in the UI).
- Every agent **casts a vote** (`approve` / `approve with concerns` / `reject`) with self-reported confidence. Run confidence is **derived from the actual vote tally**, never from a model's claim.
- The result is a versioned, citation-grounded **Project Blueprint pack**: PRD, prioritized backlog, system architecture, UX flows, QA risk plan, sprint roadmap and business case.

<div align="center">
<img src="public/og-live.png" alt="Live multi-agent orchestration in Forge" width="100%" />
</div>

## Why It's a Reasoning Agent (and not a prompt chain)

Every run is a **dynamic, self-correcting execution graph**, fully traceable:

```
1. Plan        Orchestrator selects/skips/orders agents — every choice logged with its reason
2. Ground      Foundry IQ retrieval fetches cited sources [S1]…[Sn] before any agent reasons
3. Route       Queue-driven execution — only planned agents run, in dependency order
4. Checkpoint  Low confidence or a rejection triggers a decision: proceed, rerun,
               escalate QA, or request a revision (bounded intervention budget)
5. Critique    QA's high-severity findings loop back to PM/UX/Architect for revision rounds
6. Vote        Weighted tally → run confidence (0.7 × vote score + 0.3 × self-reported)
7. Synthesize  Consensus written with standing dissent acknowledged — then 7 artifacts
```

Every selection, skip, rerun, revision, vote and halt is persisted to the run's **orchestrator log** and rendered live in the UI: execution graph, agent handoffs, reasoning timeline, votes & consensus panel, and the raw Foundry IQ trace.

## Microsoft Foundry IQ Integration

| Capability | How Forge uses it |
|---|---|
| **Agentic reasoning** | All agent + orchestrator completions run on Azure AI Foundry (Grok reasoning deployment) with retry/backoff and rate-limit handling |
| **Planning** | The orchestrator's execution plan (selected/skipped agents + strategy) is model-generated with a deterministic fallback |
| **Knowledge retrieval** | Every run grounds agents in retrieved sources before reasoning — Azure AI Search index when configured, bundled local corpus for zero-config demos |
| **Citations** | Retrieved passages are injected as `[S#]` markers; agents cite them inline and citations persist on every run |
| **Traceability** | Full IQ trace per run: `iq.intent.parse → iq.knowledge.retrieve → orchestrator.plan → … → consensus.emit` |

## The Team

| Agent | Role | Owns |
|-------|------|------|
| 🧭 Orchestrator | Plans, routes, checkpoints, mediates and tallies votes | Run plan + consensus |
| 📋 Product Manager | PRD, user stories, acceptance criteria, KPIs | PRD |
| 🎨 UX Agent | User flows, personas, information architecture | UX spec |
| 🏗️ Architect | System design, API contracts, data models | Architecture |
| 🔍 QA Agent | Risks, edge cases, security — *reviews everyone else* | QA plan |
| 🗓️ Scrum Agent | Sprints, story points, milestones | Roadmap + Backlog |
| 📈 Business Agent | Monetization, GTM, competitive positioning | Business case |

Skipped agents skip their artifacts too — the blueprint only contains work that was actually reasoned about.

## Features

- **Live orchestration view** — watch the execution graph animate as agents read context, reason, revise, vote
- **Versioned artifacts** — every run versions the blueprint up; browse and diff history, edit in Monaco
- **Cross-run memory** — new runs read previous decisions, latest artifacts and past run summaries
- **Decision debates** — drop any topic in; PM, Architect and QA debate it to consensus
- **Mermaid everywhere** — architecture graphs, ER diagrams, user journeys and gantt roadmaps render inline
- **Kanban board** — parse the generated backlog into a draggable task board
- **Code workspace** — engineer agent scaffolds a starter codebase from the blueprint
- **One-click export** — push the blueprint to **GitHub**, sync tasks to **Jira** or **Linear**, export Markdown
- **Dual-theme premium UI** — dark/light with View Transitions, fully responsive

## Quick Start

```bash
git clone https://github.com/Manuekle/Forge.git
cd Forge
npm install
cp .env.example .env   # add your credentials (see below)
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → sign in with `demo@forge.dev` / `forge`. A seeded demo workspace (projects, a replayed orchestration run, decisions and artifacts) loads on first visit.

### Configuration

```env
# Database (Postgres — or STORE_DRIVER=memory for zero-setup dev)
DATABASE_URL="postgresql://user:pass@localhost:5432/forge"
STORE_DRIVER="postgres"

# Auth
AUTH_SECRET="openssl rand -base64 32"

# Microsoft Foundry IQ / Azure AI Foundry
AZURE_OPENAI_ENDPOINT="https://<resource>.services.ai.azure.com"
AZURE_OPENAI_API_KEY="<key>"
AZURE_OPENAI_DEPLOYMENT="grok-4-20-reasoning"

# Grounded retrieval (optional — falls back to bundled knowledge corpus)
AZURE_SEARCH_ENDPOINT=""
AZURE_SEARCH_KEY=""
AZURE_SEARCH_INDEX=""
```

> No AI credentials? Forge still runs end-to-end with deterministic fallbacks, so the full product is demoable offline.

## Architecture

```
src/
├── app/                  # Next.js 15 App Router — landing, dashboard, workspace, REST API
├── lib/
│   ├── orchestrator.ts   # The reasoning engine: plan → route → checkpoint → critique → vote
│   ├── foundry-iq.ts     # Azure AI Foundry client (timeouts, retries, 429 handling)
│   ├── knowledge.ts      # Grounded retrieval with [S#] citations (Azure AI Search / local)
│   ├── store.ts          # DataStore — Postgres (Drizzle) or in-memory backends
│   ├── github.ts / jira.ts / linear.ts / codegen.ts   # Integrations + engineer agent
│   └── api-auth.ts       # Session + per-project ownership enforcement
├── components/
│   ├── orchestration/    # Execution graph, handoff feed, timeline, consensus panel
│   ├── kanban/ code/     # Task board, Monaco code workspace
│   └── ui/ layout/       # Design system (dark/light), shell, sidebar
└── db/schema.ts          # Drizzle schema — projects, runs, decisions, artifacts, tasks
```

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| AI | Microsoft Foundry IQ / Azure AI Foundry (Grok reasoning) |
| Retrieval | Azure AI Search + bundled knowledge corpus |
| Database | PostgreSQL (Supabase) + Drizzle ORM |
| Auth | Auth.js — JWT sessions, Microsoft Entra ID + demo credentials |
| UI | TailwindCSS 4, Framer Motion, Monaco, Mermaid |

## Reliability & Safety

- **Vote-derived confidence** — run confidence comes from the weighted vote tally, never a model's self-assessment
- **Bounded autonomy** — intervention budget caps reruns/revisions; a hard step cap prevents loops
- **Graceful degradation** — planner, agents, consensus and artifacts all have deterministic fallbacks; a failed model call never kills a run
- **Background execution** — runs execute after the API responds (202); the UI polls run state, stale runs are swept
- **Tenancy enforcement** — every API route checks session + project ownership (404 on cross-tenant access, no existence leak)
- **Input guardrails** — untrusted text is length-clamped and sanitized before reaching any model
- **Grounding** — claims cite retrieved sources `[S#]` to reduce hallucination

## Built With

<div align="center">
<p>
  <img src="public/sponsors/microsoft.svg" alt="Microsoft" height="40" />&nbsp;&nbsp;&nbsp;&nbsp;
  <img src="public/sponsors/Microsoft-Foundry.svg" alt="Microsoft Foundry" height="40" />&nbsp;&nbsp;&nbsp;&nbsp;
  <img src="public/sponsors/azure.svg" alt="Microsoft Azure" height="40" />&nbsp;&nbsp;&nbsp;&nbsp;
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/sponsors/GitHub_dark.svg" />
    <img src="public/sponsors/GitHub_light.svg" alt="GitHub" height="40" />
  </picture>
</p>

Built for **Agents League @AISF 2026** · 🧠 Reasoning Agents track · Powered by **Microsoft Foundry IQ**

</div>

## License

MIT

---

<div align="center">
<sub>Forge — <i>Ship the plan, not the doubt.</i></sub>
</div>
