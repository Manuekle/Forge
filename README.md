# FORGE — Product Intelligence Platform

**From idea to execution.**

Forge is an AI-native product development platform where specialized AI agents collaborate as a complete digital product team. Instead of a single chatbot, Forge orchestrates multiple expert agents that reason together, challenge assumptions, identify risks, and transform a simple idea into a complete product strategy, architecture, backlog, roadmap, and execution plan.

Powered by **Microsoft Foundry IQ** and **Azure OpenAI**.

---

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with your database and AI credentials (see below)
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Login with `demo@forge.dev` / `forge`.

### Prerequisites

- Node.js 20+ (LTS)
- PostgreSQL — required for persistence (`STORE_DRIVER=postgres`)

---

## Architecture

```
src/
├── app/                        # Next.js App Router pages
│   ├── page.tsx                # Landing page
│   ├── dashboard/              # Dashboard
│   ├── projects/               # Projects list + workspace
│   ├── agents/                 # Agent overview
│   ├── settings/               # Settings
│   └── api/                    # REST API routes
├── components/
│   ├── layout/                 # Shell, Sidebar, Navbar
│   ├── ui/                     # Button, Card, Badge, Input, Modal, Markdown
│   └── shared/                 # AgentDebateCard, IqTrace
├── lib/
│   ├── auth.ts                 # Auth.js config (Credentials provider)
│   ├── auth.config.ts          # Shared config for middleware (no adapter)
│   ├── constants.ts            # Agent definitions, mock data
│   ├── utils.ts                # cn(), formatDuration()
│   ├── foundry-iq.ts           # Azure OpenAI / Foundry IQ orchestration
│   ├── knowledge.ts            # Grounded retrieval with citations
│   ├── store.ts                # DataStore (Postgres / memory backends)
│   ├── guard.ts                # Input sanitization
│   └── api-auth.ts             # Session + ownership enforcement
├── db/
│   ├── schema.ts               # Drizzle ORM schema
│   └── index.ts                # Database client
├── actions/                    # Next.js Server Actions
├── middleware.ts               # Auth redirect middleware
└── types/                      # TypeScript types
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | TailwindCSS 4 |
| Animation | Framer Motion |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Auth.js (Credentials, JWT sessions) |
| AI | Azure AI Foundry (Grok) / Azure OpenAI |

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page — Hero, Features, Agents, Pricing, CTA |
| `/dashboard` | Metrics, recent projects, agent activity |
| `/projects` | Project list with search, filters |
| `/projects/[id]` | Workspace — collaboration feed, deliverables (versioned), decisions, IQ trace |
| `/agents` | AI team overview — click any agent for workflow detail |
| `/settings` | Profile, workspace, appearance (dark/light), API configuration |
| `/auth/signin` | Login page (`demo@forge.dev` / `forge`) |

---

## API Routes

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/projects` | GET, POST | List / create projects |
| `/api/projects/[id]` | GET, PATCH, DELETE | Single project CRUD |
| `/api/projects/[id]/decisions` | GET, POST | Project decisions (triggers AI debate) |
| `/api/projects/[id]/artifacts` | GET, POST | Project artifacts with versioning |
| `/api/projects/[id]/runs` | GET, POST | Agent run execution + progress |
| `/api/agents` | GET | Agent definitions |
| `/api/activity` | GET | Recent agent activity |
| `/api/auth/[...nextauth]` | GET, POST | Auth.js handlers |
| `/api/test` | GET | Test Azure OpenAI connection |

---

## AI Agents

| Agent | Code | Responsibility |
|-------|------|---------------|
| Orchestrator | OR | Task delegation, debate mediation, consensus |
| Product Manager | PM | PRD, user stories, backlog, KPIs |
| UX Agent | UX | User flows, IA, journeys, wireframes |
| Architect | AR | System design, APIs, DB schemas, scalability |
| QA Agent | QA | Risk scanning, test plans, edge cases, security |
| Scrum Agent | SC | Sprint planning, story points, roadmap |
| Business Agent | BZ | Monetization, GTM, business risks, market |

Each run feeds **project memory** (previous decisions, existing artifacts, past runs) to the agents so they improve upon earlier work rather than starting from scratch.

---

## Key Features

### Multi-Agent Orchestration
`runAgentOrchestration()` drives 6 specialist agents through a 3-phase pipeline:
1. **Deliberate** — each agent analyzes the problem from its domain
2. **Consensus** — the Orchestrator synthesizes a unified strategy
3. **Generate** — 7 production-grade artifacts (PRD, Architecture, UX, Backlog, QA, Roadmap, Business)

### Grounded Retrieval
Every run begins with a retrieval step that grounds agent answers in real, cited sources. The retrieval backend is pluggable:
- **Azure AI Search** (Foundry IQ knowledge index)
- **Bundled local knowledge corpus** (zero-config demo)

Retrieved passages are injected with `[S1]…[Sn]` citation markers. Citations persist on the run and render in the Foundry IQ tab.

### Versioned Artifacts
Each "New run" creates a new version of every artifact. The Deliverables tab includes a version selector to browse history.

### Cross-Run Memory
Subsequent runs include context from:
- Previous decisions and their consensus
- Latest versions of existing artifacts
- Summary of past runs

### Real-Time Progress
When a run starts, the frontend polls for backend progress updates every 1s showing each phase as it completes.

### Markdown Rendering
Agent messages, decisions, and artifact content are rendered as rich Markdown (headings, bold, italic, code, tables, lists, blockquotes, citations).

---

## Configuration

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/forge"
STORE_DRIVER="postgres"

# Auth
AUTH_SECRET="openssl rand -base64 32"

# AI Reasoning (Azure AI Foundry / OpenAI)
AZURE_OPENAI_ENDPOINT="https://<resource>.services.ai.azure.com"
AZURE_OPENAI_API_KEY="<key>"
AZURE_OPENAI_DEPLOYMENT="grok-4-20-reasoning"
IQ_TIMEOUT_MS="180000"

# Grounded retrieval (optional — local fallback)
AZURE_SEARCH_ENDPOINT=""
AZURE_SEARCH_KEY=""
AZURE_SEARCH_INDEX=""
```

> **Never commit real secrets.** `.env*` is gitignored. Rotate any key that has touched a shared machine.

---

## Persistence

The data layer (`src/lib/store.ts`) exposes one async `DataStore` interface with two interchangeable backends:

| `STORE_DRIVER` | Backend | Use |
|----------------|---------|-----|
| `postgres` | Drizzle ORM + PostgreSQL | Production / durable persistence |
| `memory` | In-memory (globalThis) | Quick dev, no database needed |

Schema: `src/db/schema.ts`. Migrations: `drizzle/`. Scripts: `db:generate`, `db:migrate`, `db:push`, `db:studio`.

---

## Security

- **Authentication** — Auth.js (JWT sessions). Protected routes redirect to `/auth/signin`.
- **Authorization** — per-request ownership check: users can only access their own projects.
- **Input guardrails** — untrusted text is length-clamped and sanitized before reaching a model.
- **Grounding** — agent claims are grounded in retrieved, cited sources to reduce hallucination.

---

## Build

```bash
npm run build
npm start
```

## License

MIT
