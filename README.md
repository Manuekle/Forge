# FORGE — Product Intelligence Platform

**From idea to execution.**

Forge is an AI-native product development platform where specialized AI agents collaborate as a complete digital product team. Instead of a single chatbot, Forge orchestrates multiple expert agents that reason together, challenge assumptions, identify risks, and transform a simple idea into a complete product strategy, architecture, backlog, roadmap, and execution plan.

Powered by **Microsoft Foundry IQ** and **Azure OpenAI**.

---

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Login with any email + password `forge`.

### Prerequisites

- Node.js 20+ (LTS)
- PostgreSQL — **optional**, only for durable persistence (`STORE_DRIVER=postgres`).
  The default demo runs fully in memory with no database.

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
│   ├── ui/                     # Button, Card, Badge, Input, etc.
│   └── shared/                 # AgentDebateCard, IqTrace
├── lib/
│   ├── auth.ts                 # Auth.js config (Credentials provider)
│   ├── constants.ts            # Agent definitions, mock data
│   ├── utils.ts                # cn() utility
│   └── foundry-iq.ts           # Azure OpenAI / Foundry IQ client
├── db/
│   ├── schema.ts               # Drizzle ORM schema
│   └── index.ts                # Database client
├── actions/                    # Next.js Server Actions
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
| Auth | Auth.js (Credentials) |
| AI | Azure OpenAI (gpt-4.1-mini) / Foundry IQ |

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page — Hero, Features, Agents, Pricing, CTA |
| `/dashboard` | Metrics, recent projects, agent activity |
| `/projects` | Project list with search, filters, templates |
| `/projects/[id]` | Workspace — collaboration feed, deliverables, decisions, IQ trace |
| `/agents` | AI team overview — Orchestrator + 6 specialist agents |
| `/settings` | Profile and workspace settings |
| `/auth/signin` | Login page (credentials: any email / `forge`) |

---

## API Routes

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/projects` | GET, POST | List / create projects |
| `/api/projects/[id]` | GET, PATCH, DELETE | Single project CRUD |
| `/api/projects/[id]/decisions` | GET, POST | Project decisions |
| `/api/projects/[id]/artifacts` | GET, POST | Project artifacts |
| `/api/projects/[id]/runs` | GET, POST | Agent run history |
| `/api/agents` | GET | Agent definitions |
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

---

## Microsoft IQ Integration

Forge integrates the **Foundry IQ** intelligence layer in two parts:

**1. Agent reasoning (`src/lib/foundry-iq.ts`)** — `runAgentOrchestration()` drives six
specialist agents through a 3-phase pipeline (deliberate → consensus → artifacts)
on Azure OpenAI / Azure AI Foundry inference.

**2. Agentic retrieval + grounding (`src/lib/knowledge.ts`)** — every run begins with a
retrieval step that grounds agent answers in real, **cited** sources, following the
Azure AI Foundry agentic-retrieval pattern. The retrieval backend is pluggable:

- **Azure AI Search** (a Foundry IQ knowledge index) when `AZURE_SEARCH_*` is configured.
- A **bundled local knowledge corpus** otherwise (zero-config demo).

Retrieved passages are injected into each agent prompt with `[S1]…[Sn]` citation markers,
and the resolved citations are persisted on the run and rendered in the workspace
**Foundry IQ** tab alongside the live execution trace.

### Configuration

```env
# Reasoning
AZURE_OPENAI_ENDPOINT="https://<your-resource>.services.ai.azure.com"
AZURE_OPENAI_API_KEY="<your-key>"
AZURE_OPENAI_DEPLOYMENT="gpt-4.1-mini"
IQ_TIMEOUT_MS="30000"

# Grounded retrieval (optional — falls back to local corpus)
AZURE_SEARCH_ENDPOINT=""
AZURE_SEARCH_KEY=""
AZURE_SEARCH_INDEX=""
```

### Usage

```typescript
import { complete, runAgentOrchestration } from "@/lib/foundry-iq"
import { retrieveKnowledge } from "@/lib/knowledge"

// Grounded retrieval with citations
const { citations, groundingBlock } = await retrieveKnowledge("marketplace MVP", {
  domain: "marketplace",
})

// Full multi-agent run (retrieval + 6 agents + consensus + 7 artifacts)
const run = await runAgentOrchestration({
  projectName: "HomePlate",
  projectDescription: "P2P food marketplace",
  template: "marketplace",
})
// → run.decisions, run.consensus, run.confidence, run.trace, run.artifacts, run.citations
```

---

## Environment Variables

```env
DATABASE_URL="postgres://postgres:postgres@localhost:5432/forge"
AUTH_SECRET="generate with: openssl rand -base64 32"
AUTH_URL="http://localhost:3000"

# Foundry IQ — reasoning (Azure OpenAI / Azure AI Foundry)
AZURE_OPENAI_ENDPOINT=""
AZURE_OPENAI_API_KEY=""
AZURE_OPENAI_DEPLOYMENT="gpt-4.1-mini"
IQ_TIMEOUT_MS="30000"

# Foundry IQ — grounded retrieval (Azure AI Search). Optional; local fallback.
AZURE_SEARCH_ENDPOINT=""
AZURE_SEARCH_KEY=""
AZURE_SEARCH_INDEX=""

# Optional: GitHub OAuth
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# Optional: Microsoft Entra ID
MICROSOFT_CLIENT_ID=""
MICROSOFT_CLIENT_SECRET=""
MICROSOFT_TENANT_ID=""
```

> **Never commit real secrets.** `.env*` is gitignored. The repo ships only
> `.env.example` with empty values. Rotate any key that has touched a shared machine.

---

## Security

- **Authentication** — Auth.js (JWT sessions). Every API route under
  `/api/projects/*` and `/api/clear` requires a valid session.
- **Authorization** — ownership is enforced per request: a user can only read or
  mutate projects whose `userId` matches their session (cross-tenant requests return
  `404`, with no existence leak). See `src/lib/api-auth.ts`.
- **Input guardrails** — untrusted text is length-clamped and prompt-injection
  markers are neutralized before reaching a model (`src/lib/guard.ts`).
- **Grounding** — agent claims are grounded in retrieved, cited sources to reduce
  hallucination (`src/lib/knowledge.ts`).

---

## Persistence

The data layer (`src/lib/store.ts`) exposes one async `DataStore` interface with two
interchangeable backends, selected by `STORE_DRIVER`:

| `STORE_DRIVER` | Backend | Use |
|----------------|---------|-----|
| `memory` (default) | In-memory (persisted on `globalThis`) | Zero-config demo, no database |
| `postgres` | Drizzle ORM + PostgreSQL | Durable persistence across restarts / serverless |

### Enabling Postgres

```bash
# 1. Point STORE_DRIVER + DATABASE_URL at your database in .env
STORE_DRIVER="postgres"
DATABASE_URL="postgres://user:pass@host:5432/forge"

# 2. Apply the schema
npm run db:migrate        # or: npm run db:push   (dev)

# 3. Start the app — all reads/writes now hit Postgres
npm run dev
```

Schema lives in `src/db/schema.ts`; generated SQL migrations in `drizzle/`.
Scripts: `db:generate` (new migration), `db:migrate` (apply), `db:push` (dev sync),
`db:studio` (browse). App-data tables are keyed by user email to match the JWT
Credentials demo; swap `projects.userId` to a uuid FK once a DB auth adapter is wired.

---

## Design System

### Colors
- Canvas: `#09090B`
- Surface: `#121214` / `#18181B`
- Brand: `#E85002` (Orange)
- Text: `#FAFAFA`
- Muted: `#71717A`

### Typography
- Primary: Inter (400, 500, 600, 700)
- Code: JetBrains Mono (400, 500)

### Spacing
8px grid: 4, 8, 12, 16, 24, 32, 40, 48, 64, 96

### Border Radius
- Cards: 16px
- Buttons/Inputs: 12px
- Badges: 999px

---

## Build

```bash
npm run build
npm start
```

## License

MIT
