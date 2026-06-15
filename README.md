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
| **Demo login** | `demo@forge.dev` / `forgedemo` (seeded demo workspace included) |

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

Forge leverages **Microsoft Foundry IQ** as its reasoning and grounding layer. Every run follows a traceable path through IQ's capabilities:

```mermaid
sequenceDiagram
    actor User
    participant App as Forge App
    participant Orch as Orchestrator
    participant IQ as Foundry IQ
    participant Search as Azure AI Search
    participant Model as Grok Reasoning

    User->>App: Submit project brief
    App->>Orch: Start orchestration run
    Orch->>IQ: iq.intent.parse(brief)
    IQ->>Search: iq.knowledge.retrieve(brief)
    Search-->>IQ: [S1]...[Sn] grounded sources
    IQ-->>Orch: Execution plan + citations
    Orch->>Orch: Route agents in dependency order
    loop Agent pipeline
        Orch->>Model: Agent prompt + grounded sources
        Model-->>Orch: Agent output + inline [S#] citations
        Orch->>Orch: QA critique & revision loop
    end
    Orch->>Orch: Weighted vote tally → run confidence
    Orch-->>App: Blueprint artifacts + full IQ trace
    App-->>User: Render blueprint, graph & timeline
```

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

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20.x or later
- **npm** 10.x or later (or **pnpm** / **yarn**)
- **PostgreSQL** 15+ (optional — Forge runs with `STORE_DRIVER=memory` for zero-setup development with no database needed)
- **Git**

## Quick Start

```bash
git clone https://github.com/Manuekle/Forge.git
cd Forge
npm install
cp .env.example .env   # add your credentials (see below)
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → sign in with `demo@forge.dev` / `forgedemo` (requires `ALLOW_DEMO_LOGIN=true`), or create a real account at `/auth/register`. A seeded demo workspace (projects, a replayed orchestration run, decisions and artifacts) loads on first visit.

> Using Postgres? Apply migrations with `npm run db:migrate` (or `npm run db:push` for dev). `npm install` also pulls the test toolchain — run `npm test` to verify.

### Configuration

```env
# Database (Postgres — or STORE_DRIVER=memory for zero-setup dev)
DATABASE_URL="postgresql://user:pass@localhost:5432/forge"
STORE_DRIVER="postgres"

# Auth (required) — generate with: openssl rand -base64 32
AUTH_SECRET="<32-byte base64>"
# Shared demo account (demo@forge.dev / forge). OFF by default; opt in explicitly.
ALLOW_DEMO_LOGIN="true"
NEXT_PUBLIC_ALLOW_DEMO_LOGIN="true"

# Secrets at rest — AES-256-GCM key for integration tokens (32 bytes, base64).
SECRETS_KEY="<32-byte base64>"   # openssl rand -base64 32

# Microsoft Foundry IQ / Azure AI Foundry
AZURE_OPENAI_ENDPOINT="https://<resource>.services.ai.azure.com"
AZURE_OPENAI_API_KEY="<key>"
AZURE_OPENAI_DEPLOYMENT="grok-4-20-reasoning"

# Grounded retrieval (optional — falls back to bundled knowledge corpus)
AZURE_SEARCH_ENDPOINT=""
AZURE_SEARCH_KEY=""
AZURE_SEARCH_INDEX=""

# Durable run queue (optional — falls back to in-process execution)
QSTASH_TOKEN=""
QSTASH_WORKER_URL="https://<your-host>/api/jobs/orchestrate"
JOB_WORKER_SECRET="<shared secret>"

# Rate limiting (optional — falls back to per-instance memory)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# Monitoring (optional — npm i @sentry/nextjs to enable)
SENTRY_DSN=""
```

See `.env.example` for the fully annotated list.

> No AI credentials? Forge still runs end-to-end with deterministic fallbacks, so the full product is demoable offline.

## Architecture

Forge's core is a **dynamic execution graph** — not a linear prompt chain. Each run is planned, routed, critiqued, and voted on by specialist agents:

```mermaid
flowchart TD
    A["📝 User Brief"] --> B["🧭 Orchestrator<br/>Plan execution graph"]
    B --> C{"Select & order<br/>agents"}
    C --> D["📋 PM Agent<br/>PRD & stories"]
    C --> E["🎨 UX Agent<br/>Flows & personas"]
    C --> F["🏗️ Architect<br/>System design"]
    C --> G["🔍 QA Agent<br/>Risks & critique"]
    C --> H["🗓️ Scrum Agent<br/>Roadmap"]
    C --> I["📈 Business Agent<br/>Business case"]
    D --> J["🔍 QA reviews output"]
    E --> J
    F --> J
    J --> K{"High-severity<br/>findings?"}
    K -->|Yes → revise| D
    K -->|Yes → revise| E
    K -->|Yes → revise| F
    K -->|No| L["🗳️ Weighted vote"]
    L --> M["✅ Consensus + dissent"]
    M --> N["📦 Blueprint Pack<br/>7 artifacts versioned"]
    N --> O["📤 Export<br/>GitHub / Jira / Linear"]

    style A fill:#1a1a2e,stroke:#e94560,color:#fff
    style B fill:#16213e,stroke:#0f3460,color:#fff
    style N fill:#0f3460,stroke:#e94560,color:#fff
    style O fill:#1a1a2e,stroke:#533483,color:#fff
```

### Directory structure

```
src/
├── app/
│   ├── api/jobs/orchestrate/        # QStash worker — executes queued runs
│   ├── api/auth/register/           # Credential signup (scrypt)
│   ├── api/projects/[id]/runs/stream/  # SSE live run stream (replaces polling)
│   └── …                            # Landing, dashboard, workspace, REST API
├── lib/
│   ├── orchestrator.ts   # The reasoning engine: plan → route → checkpoint → critique → vote
│   ├── foundry-iq.ts     # Azure AI Foundry client (timeouts, retries, 429 handling)
│   ├── knowledge.ts      # Grounded retrieval with [S#] citations (Azure AI Search / local)
│   ├── store.ts          # DataStore — Postgres (Drizzle) or in-memory backends
│   ├── queue.ts          # Durable job layer (QStash + in-process fallback)
│   ├── crypto.ts         # AES-256-GCM encryption for integration tokens at rest
│   ├── password.ts       # scrypt password hashing (OWASP params)
│   ├── auth-users.ts     # Credential verification + signup (Node-only)
│   ├── rate-limit.ts     # Per-user/IP limiter (Upstash Redis / in-memory)
│   ├── guard.ts          # Prompt-injection sanitization + input clamping
│   ├── logger.ts         # Structured JSON logging
│   ├── monitoring.ts     # Optional Sentry sink
│   ├── env.ts            # Boot-time env validation (fail fast in prod)
│   ├── integrations/tokens.ts   # Masked integration status (never leaks secrets)
│   ├── github.ts / jira.ts / linear.ts / codegen.ts   # Integrations + engineer agent
│   └── api-auth.ts       # Session + per-project ownership enforcement
├── components/
│   ├── orchestration/    # Execution graph, handoff feed, timeline, consensus panel
│   ├── kanban/ code/     # Task board, Monaco code workspace
│   └── ui/ layout/       # Design system (dark/light), shell, sidebar
├── instrumentation.ts    # Runs env validation on server startup
└── db/schema.ts          # Drizzle schema — projects, runs, decisions, artifacts, tasks
```

### Technology stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| AI | Microsoft Foundry IQ / Azure AI Foundry (Grok reasoning) |
| Retrieval | Azure AI Search + bundled knowledge corpus |
| Database | PostgreSQL (Supabase) + Drizzle ORM, pooled (pgbouncer) |
| Auth | Auth.js — JWT sessions, credential signup (scrypt), Microsoft Entra ID, optional demo |
| Security | AES-256-GCM token encryption, rate limiting (Upstash), prompt-injection guards |
| Queue | Upstash QStash durable jobs (in-process fallback) |
| Observability | Structured JSON logging, optional Sentry |
| Testing | Vitest (unit + integration) |
| UI | TailwindCSS 4, Framer Motion, Monaco, Mermaid |

## Deployment

### Production build

```bash
npm run build
npm start
```

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FManuekle%2FForge)

1. Push the repo to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Set the required environment variables (see [Configuration](#configuration))
4. Deploy — zero-config for Next.js

### Docker

```dockerfile
# Coming soon — a Dockerfile and docker-compose.yml are in progress
```

### Environment variables

All configuration is done through environment variables. Copy `.env.example` and fill in:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | With Postgres | PostgreSQL connection string (use a pooled URL in serverless) |
| `STORE_DRIVER` | No | `"postgres"` or `"memory"` (default: `"memory"`) |
| `AUTH_SECRET` | Yes | Session signing key (`openssl rand -base64 32`) |
| `SECRETS_KEY` | Prod | AES-256-GCM key (32 bytes, base64) for encrypting integration tokens; falls back to `AUTH_SECRET` |
| `ALLOW_DEMO_LOGIN` / `NEXT_PUBLIC_ALLOW_DEMO_LOGIN` | No | Enable the shared demo account (off by default) |
| `AZURE_OPENAI_ENDPOINT` | For AI features | Azure AI Foundry endpoint URL |
| `AZURE_OPENAI_API_KEY` | For AI features | API key for the model deployment |
| `AZURE_OPENAI_DEPLOYMENT` | For AI features | Deployment name (e.g. `grok-4-20-reasoning`) |
| `CODEGEN_AZURE_ENDPOINT` / `CODEGEN_AZURE_API_KEY` | For code agent | Azure OpenAI endpoint + key for the scaffolding agent |
| `AZURE_SEARCH_ENDPOINT` / `_KEY` / `_INDEX` | No | Azure AI Search grounded retrieval (else bundled corpus) |
| `QSTASH_TOKEN` / `QSTASH_WORKER_URL` / `JOB_WORKER_SECRET` | No | Durable run queue (else in-process execution) |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | No | Distributed rate limiting (else per-instance memory) |
| `SENTRY_DSN` | No | Exception monitoring (requires `@sentry/nextjs`) |
| `LOG_LEVEL` | No | `debug` \| `info` \| `warn` \| `error` (default `info`) |

## Troubleshooting

| Problem | Likely cause | Solution |
|---|---|---|
| `Cannot find module` | Dependencies not installed | Run `npm install` |
| `DATABASE_URL is not set` | Missing environment variable | Copy `.env.example` → `.env` and fill in, or set `STORE_DRIVER=memory` |
| `401 Unauthorized` on demo login | Demo account disabled | Set `ALLOW_DEMO_LOGIN=true` and `NEXT_PUBLIC_ALLOW_DEMO_LOGIN=true` |
| Can't create account / `503` on register | Postgres not enabled | Credential signup needs `STORE_DRIVER=postgres` + `DATABASE_URL` |
| Integration token "can't decrypt" | Missing/rotated key | Set `SECRETS_KEY` (or `AUTH_SECRET`); legacy plaintext tokens still read fine |
| AI responses are empty / fallback | Missing Azure credentials or model unreachable | Check `AZURE_OPENAI_ENDPOINT`, key, and deployment name. Forge will fall back to deterministic responses — this is expected when no AI is configured |
| `Rate limit (429)` | Too many concurrent requests | Forge handles retries with exponential backoff; reduce concurrent runs or increase your model's TPM quota |
| `Store driver "postgres" not configured` | `.env` missing `DATABASE_URL` | Either configure Postgres or set `STORE_DRIVER=memory` |
| UI shows "No runs" | Demo workspace not seeded | Ensure you ran `npm run db:seed` and signed in as `demo@forge.dev` |

## Testing

Forge ships a [Vitest](https://vitest.dev) suite covering the security- and
reasoning-critical paths:

```bash
npm test          # run once
npm run test:watch
npm run typecheck  # tsc --noEmit
```

| Area | Coverage |
|---|---|
| Token encryption (`crypto`) | round-trip, random IV, legacy passthrough, tamper rejection |
| Authentication (`password`) | hash/verify, wrong password, salting, strength rules |
| Confidence calc (`orchestrator`) | vote tally: empty / unanimous / blended / reject-weighted |
| Parsing (`orchestrator`) | `extractJson`, `parseAgentOutput` (votes, critiques, clamping) |
| Prompt injection (`guard`) | injection redaction, role defang, zero-width stripping |
| Rate limiting (`rate-limit`) | allow→block, key isolation, window reset, 429 |
| API masking (`integrations/tokens`) | no-secret-leak, demo restriction, status booleans |

Roadmap: integration tests for the full pipeline with mock agents, and Playwright E2E.

## Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-idea`)
3. Commit your changes (`git commit -m 'Add amazing idea'`)
4. Push to the branch (`git push origin feature/amazing-idea`)
5. Open a Pull Request

### Development guidelines

- **Code style** — ESLint is configured; run `npm run lint` before committing
- **Type safety** — Keep TypeScript strict mode on; avoid `any` and `as` casts where possible
- **Architecture** — Keep agent logic in `lib/`, UI in `components/`, routes in `app/`
- **Fallbacks** — Every AI-dependent function must have a deterministic fallback so the app works offline
- **Grounding** — Always use `[S#]` citation markers when injecting retrieved knowledge into prompts

## Reliability & Security

- **Vote-derived confidence** — run confidence comes from the weighted vote tally, never a model's self-assessment
- **Bounded autonomy** — intervention budget caps reruns/revisions; a hard step cap prevents loops
- **Graceful degradation** — planner, agents, consensus and artifacts all have deterministic fallbacks; a failed model call never kills a run
- **Durable execution** — runs are dispatched to a QStash queue (at-least-once + retries, idempotent) so an instance restart can't abandon them; in-process fallback for dev. The UI tracks progress over **SSE** with polling fallback
- **Authentication** — credential signup with **scrypt** hashing (constant-time verify, user-enumeration resistant), Microsoft Entra ID, JWT sessions; demo account off by default
- **Secrets at rest** — integration tokens are **AES-256-GCM encrypted**; the settings API returns masked connection status only, never raw tokens
- **Rate limiting** — per-user/IP limits on run, signup, login and settings endpoints (Upstash Redis, in-memory fallback)
- **Tenancy enforcement** — every API route checks session + project ownership (404 on cross-tenant access, no existence leak)
- **Prompt-injection guardrails** — untrusted text is length-clamped, stripped of control/zero-width chars and injection markers before reaching any model
- **Observability** — structured JSON logging; optional Sentry exception monitoring; env validated at boot
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
