type IqMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

type IqCompletion = {
  id: string
  choices: {
    message: { role: string; content: string }
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

type IqTraceEntry = {
  time: string
  action: string
  detail: string
}

type IqResponse = {
  completion: IqCompletion
  trace: IqTraceEntry[]
}

import { retrieveKnowledge, type Citation } from "@/lib/knowledge"

const endpoint = process.env.FOUNDRY_IQ_ENDPOINT || ""
const apiKey = process.env.FOUNDRY_IQ_API_KEY || ""
const azureOpenAIEndpoint = process.env.AZURE_OPENAI_ENDPOINT || ""
const azureApiKey = process.env.AZURE_OPENAI_API_KEY || ""
const defaultDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4.1-mini"
// Completion timeout. The previous 3000ms aborted nearly every real generation
// (1024-1536 tokens) before it returned, forcing the canned fallback. Default
// to 30s; override with IQ_TIMEOUT_MS.
const COMPLETION_TIMEOUT_MS = Number(process.env.IQ_TIMEOUT_MS) || 30000

export async function complete(
  messages: IqMessage[],
  options?: { deployment?: string; maxTokens?: number }
): Promise<IqResponse> {
  const deployment = options?.deployment || defaultDeployment

  const apiVersion = "2024-08-01-preview"
  const base = azureOpenAIEndpoint?.replace(/\/v1$/, "").replace(/\/+$/, "")
  const url = base
    ? `${base}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`
    : `${endpoint}/v1/chat/completions`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), COMPLETION_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": azureOpenAIEndpoint ? azureApiKey : apiKey,
        ...(azureOpenAIEndpoint ? {} : { Authorization: `Bearer ${apiKey}` }),
      },
      body: JSON.stringify({
        messages,
        max_tokens: options?.maxTokens || 2048,
        temperature: 0.7,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      throw new Error(`Foundry IQ error: ${response.status} ${response.statusText} — ${text}`)
    }

    const completion: IqCompletion = await response.json()

    const trace: IqTraceEntry[] = [
      { time: "[00:00.01]", action: "iq.intent.parse", detail: `${messages.length} messages` },
      { time: "[00:00.15]", action: `iq.deploy.${deployment}`, detail: `max_tokens=${options?.maxTokens || 2048}` },
      { time: "[00:00.30]", action: "iq.complete", detail: `tokens=${completion.usage?.total_tokens || "?"}` },
    ]

    return { completion, trace }
  } finally {
    clearTimeout(timeout)
  }
}

const AGENT_PROMPTS: Record<string, string> = {
  pm: `You are the Product Manager agent on a multi-agent AI product team called Forge.
Your role: Write a Product Requirements Document (PRD), define user stories, success metrics (KPIs), and prioritize features.
When you respond, structure your output as:
- Product Vision (1-2 sentences)
- Target Users (bullet list)
- Key Features (numbered, with rationale)
- Success Metrics (3 KPIs)
- Risks & Mitigations (top 3)

Be specific, actionable, and prioritize ruthlessly.`,
  ux: `You are the UX Designer agent on a multi-agent AI product team called Forge.
Your role: Define user flows, information architecture, interaction patterns, and wireframe specifications.
When you respond, structure your output as:
- Key User Personas (2-3, with goals and pain points)
- Primary User Flow (step-by-step)
- Information Architecture (top-level navigation structure)
- UX Recommendations (top 3)

Consider accessibility, mobile responsiveness, and onboarding.`,
  architect: `You are the Software Architect agent on a multi-agent AI product team called Forge.
Your role: Design system architecture, API contracts, data models, and evaluate scalability.
When you respond, structure your output as:
- Architecture Overview (2-3 sentences)
- Tech Stack Recommendations (with rationale)
- Key API Endpoints (method, path, purpose)
- Data Model (core entities and relationships)
- Scalability Considerations

You push back on over-engineering and advocate for simple, proven patterns.`,
  qa: `You are the QA Engineer agent on a multi-agent AI product team called Forge.
Your role: Identify risks, edge cases, security vulnerabilities, and define test strategies.
When you respond, structure your output as:
- Risk Assessment (severity × likelihood for top 5 risks)
- Test Strategy (unit, integration, e2e)
- Security Concerns (top 3)
- Edge Cases (top 5)

Be the pessimist — kill bad ideas before they ship.`,
  scrum: `You are the Scrum Master agent on a multi-agent AI product team called Forge.
Your role: Break down work into sprints, estimate story points, and create a realistic roadmap.
When you respond, structure your output as:
- Sprint Plan (Sprint 1, 2, 3 with key deliverables per sprint)
- Story Point Estimates (total and per major feature)
- Dependencies & Blockers
- Milestone Dates (MVP, Beta, Launch)

Assume a 3-person engineering team working in 2-week sprints.`,
  business: `You are the Business Strategist agent on a multi-agent AI product team called Forge.
Your role: Define monetization strategy, go-to-market plan, competitive positioning, and business risks.
When you respond, structure your output as:
- Revenue Model (how the product makes money)
- Go-to-Market Strategy (channels, timeline)
- Competitive Landscape (top 3 competitors + differentiation)
- Business Risks (top 3)
- Success Criteria (3 business KPIs)`,
}

export async function runAgentOrchestration(
  args: {
    projectName: string
    projectDescription: string
    template?: string | null
  },
  signal?: AbortSignal
): Promise<{
  decisions: { agent: string; entry: string; timestamp: string }[]
  consensus: string
  confidence: number
  trace: { time: string; action: string; detail: string; source?: string }[]
  artifacts: { type: string; title: string; content: string }[]
  citations: Citation[]
}> {
  const { projectName, projectDescription, template } = args
  const startTime = Date.now()

  const contextSummary = `Project: ${projectName}
Description: ${projectDescription}
${template ? `Template: ${template}` : ""}`

  const decisions: { agent: string; entry: string; timestamp: string }[] = []
  const trace: { time: string; action: string; detail: string; source?: string }[] = []
  const agents = ["pm", "ux", "architect", "qa", "scrum", "business"] as const
  const agentLabels: Record<string, string> = {
    pm: "Product Manager",
    ux: "UX Agent",
    architect: "Architect",
    qa: "QA Agent",
    scrum: "Scrum Agent",
    business: "Business Agent",
  }

  const deliberationMessages: IqMessage[] = []

  function elapsed(): string {
    const ms = Date.now() - startTime
    const sec = Math.floor(ms / 1000)
    const frac = (ms % 1000).toString().padStart(3, "0").slice(0, 2)
    const min = Math.floor(sec / 60)
    const s = sec % 60
    return `[${min.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${frac}]`
  }

  trace.push({
    time: elapsed(),
    action: "iq.intent.parse",
    detail: `project: ${projectName}`,
  })

  // Foundry IQ agentic retrieval: ground the run in real, cited sources.
  const retrieval = await retrieveKnowledge(`${projectName}. ${projectDescription}`, {
    domain: template || null,
    topK: 4,
    signal,
  })
  const knowledgeBase = retrieval.groundingBlock
  const citations = retrieval.citations
  trace.push({
    time: elapsed(),
    action: "iq.knowledge.retrieve",
    detail: `${citations.length} sources · ${retrieval.backend}`,
    source: citations.map((c) => `[${c.ref}] ${c.title}`).join(", ") || "no sources",
  })

  // Quick connectivity check — bail early if endpoint is unreachable
  let aiAvailable = true
  try {
    const pingController = new AbortController()
    const pingTimeout = setTimeout(() => pingController.abort(), 2000)
    const pingUrl = azureOpenAIEndpoint
      ? `${azureOpenAIEndpoint.replace(/\/v1$/, "").replace(/\/+$/, "")}/openai/deployments/${defaultDeployment}/chat/completions?api-version=2024-08-01-preview`
      : `${endpoint}/v1/chat/completions`
    await fetch(pingUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": azureOpenAIEndpoint ? azureApiKey : apiKey },
      body: JSON.stringify({ messages: [{ role: "user", content: "ping" }], max_tokens: 1 }),
      signal: pingController.signal,
    })
    clearTimeout(pingTimeout)
  } catch {
    aiAvailable = false
  }

  if (!aiAvailable) {
    for (const agentKey of agents) {
      const label = agentLabels[agentKey]
      const agentResponse = getFallbackAgentResponse(agentKey, projectName, projectDescription)
      deliberationMessages.push({ role: "assistant", content: agentResponse })
      decisions.push({ agent: agentKey, entry: agentResponse, timestamp: new Date().toISOString() })
      trace.push({ time: elapsed(), action: "orchestrator.delegate", detail: `${label} · (fallback)` })
      trace.push({ time: elapsed(), action: "orchestrator.receive", detail: `${label} · ${agentResponse.split("\n")[0]?.slice(0, 60)}...` })
    }
    // Jump to consensus & artifacts below
  }

  // Phase 1: Run each agent in sequence, passing previous context
  if (aiAvailable) for (const agentKey of agents) {
    const label = agentLabels[agentKey]
    const systemPrompt = AGENT_PROMPTS[agentKey]
    let contextBlock = `## Project Context\n${contextSummary}\n\n`
    if (knowledgeBase) contextBlock += `\n${knowledgeBase}\nWhen a recommendation is supported by a retrieved source, cite it inline using its [S#] marker.\n`

    if (deliberationMessages.length > 0) {
      const prevEntries = deliberationMessages
        .filter((m) => m.role === "assistant")
        .map((m) => m.content)
      if (prevEntries.length > 0) {
        contextBlock += `\n## Previous Agent Outputs\n${prevEntries.map((c, i) => `### ${agentLabels[Object.keys(agentLabels)[i]]}:\n${c}`).join("\n\n")}\n`
      }
    }

    trace.push({
      time: elapsed(),
      action: `orchestrator.delegate`,
      detail: `${label} · reasoning`,
    })

    let agentResponse: string
    try {
      if (signal?.aborted) throw new Error("aborted")
      const result = await complete(
        [
          { role: "system", content: systemPrompt + "\n\n" + contextBlock },
          {
            role: "user",
            content: `Analyze the following product idea and provide your expert assessment:\n\n${contextSummary}\n\n${knowledgeBase ? `Retrieved knowledge is provided above. Ground your recommendations in it and cite sources inline with [S#] markers.\n` : ""}`,
          },
        ],
        { maxTokens: 1024 }
      )
      agentResponse =
        result.completion.choices[0]?.message?.content || "No response generated."
    } catch {
      agentResponse = getFallbackAgentResponse(agentKey, projectName, projectDescription)
    }

    deliberationMessages.push({ role: "assistant", content: agentResponse })
    decisions.push({
      agent: agentKey,
      entry: agentResponse,
      timestamp: new Date().toISOString(),
    })

    trace.push({
      time: elapsed(),
      action: "orchestrator.receive",
      detail: `${label} · ${agentResponse.split("\n")[0]?.slice(0, 60)}...`,
    })
  }

  // Phase 2: Generate consensus
  trace.push({
    time: elapsed(),
    action: "debate.open",
    detail: "synthesizing agent perspectives",
  })

  let consensusText: string
  let confidence: number
  if (aiAvailable) {
    try {
      if (signal?.aborted) throw new Error("aborted")
      const consensusResult = await complete(
        [
          {
            role: "system",
            content: `You are the Orchestrator agent on a multi-agent product team. Six specialist agents have analyzed a product idea. Synthesize their outputs into a single coherent product strategy.

RESPOND WITH EXACTLY THIS FORMAT:
CONSENSUS: <one-paragraph summary of what the team agreed on>
CONFIDENCE: <number between 0 and 1>
KEY_INSIGHTS:
- <insight 1>
- <insight 2>
- <insight 3>
NEXT_STEPS:
1. <step 1>
2. <step 2>
3. <step 3>
4. <step 4>
5. <step 5>`,
          },
          {
            role: "user",
            content: `Here are all six agent analyses:\n\n${decisions.map((d) => `--- ${agentLabels[d.agent]} ---\n${d.entry}`).join("\n\n")}\n\nSynthesize and produce the consensus.`,
          },
        ],
        { maxTokens: 1024 }
      )
      const raw = consensusResult.completion.choices[0]?.message?.content || ""
      const consensusMatch = raw.match(/CONSENSUS:\s*(.+?)(?:\n|$)/)
      const confidenceMatch = raw.match(/CONFIDENCE:\s*([\d.]+)/)
      consensusText = consensusMatch?.[1] || raw
      confidence = confidenceMatch ? Math.min(1, Math.max(0, parseFloat(confidenceMatch[1]))) : 0.75
    } catch {
      consensusText = `${projectName} is viable. The team recommends starting with a focused MVP targeting the core user need.`
      confidence = 0.72
    }
  } else {
    consensusText = `${projectName} is viable. The team recommends starting with a focused MVP targeting the core user need.`
    confidence = 0.72
  }

  trace.push({
    time: elapsed(),
    action: "vote.tally",
    detail: `6 agents · confidence ${confidence.toFixed(2)}`,
  })
  trace.push({
    time: elapsed(),
    action: "consensus.emit",
    detail: `confidence ${confidence.toFixed(2)}`,
  })

  // Phase 3: Generate deliverables
  trace.push({
    time: elapsed(),
    action: "run.complete",
    detail: "generating artifacts",
  })

  const deliberationSummary = decisions.map((d) => `--- ${agentLabels[d.agent]} ---\n${d.entry}`).join("\n\n")

  const artifactSpecs: { type: string; title: string; prompt: string }[] = [
    {
      type: "prd",
      title: `${projectName} — Product Requirements Document`,
      prompt: `Generate a complete PRD for ${projectName} based on the team's deliberation. Include: product vision, target users, feature list with rationale, success metrics, and a release plan. Format in markdown.`,
    },
    {
      type: "architecture",
      title: `${projectName} — System Architecture`,
      prompt: `Design the system architecture for ${projectName}. Include: tech stack, core components, API design, data model, and deployment strategy. Format in markdown with code blocks for schema.`,
    },
    {
      type: "ux",
      title: `${projectName} — User Experience Design`,
      prompt: `Define the UX design for ${projectName}. Include: user personas, primary user flow (step by step), information architecture, and interface guidelines. Format in markdown.`,
    },
    {
      type: "backlog",
      title: `${projectName} — Product Backlog`,
      prompt: `Create a prioritized product backlog for ${projectName}. Include: 10-15 user stories with acceptance criteria, story point estimates, and priority labels (P0/P1/P2). Format in markdown.`,
    },
    {
      type: "qa",
      title: `${projectName} — QA Test Plan`,
      prompt: `Create a QA test plan for ${projectName}. Include: test strategy, risk matrix, key test scenarios, security concerns, and edge cases. Format in markdown.`,
    },
    {
      type: "roadmap",
      title: `${projectName} — Product Roadmap`,
      prompt: `Create a product roadmap for ${projectName}. Include: 3-sprint plan with deliverables, milestones, dependencies, and a timeline. Format in markdown.`,
    },
    {
      type: "business",
      title: `${projectName} — Business Strategy`,
      prompt: `Create a business strategy for ${projectName}. Include: revenue model, GTM strategy, competitive landscape, business risks, and success KPIs. Format in markdown.`,
    },
  ]

  const artifacts: { type: string; title: string; content: string }[] = []

  for (const spec of artifactSpecs) {
    trace.push({
      time: elapsed(),
      action: `artifact.generate`,
      detail: spec.type,
    })

    if (aiAvailable) {
      try {
        if (signal?.aborted) throw new Error("aborted")
        const result = await complete(
          [
            {
              role: "system",
              content: `You are a senior technical writer generating a polished, production-quality document. Use the team's deliberation context to ground your output in real decisions.`,
            },
            {
              role: "user",
              content: `${spec.prompt}\n\n## Project Context\n${contextSummary}\n\n## Team Deliberation\n${deliberationSummary}`,
            },
          ],
          { maxTokens: 1536 }
        )
        const content = result.completion.choices[0]?.message?.content || ""
        artifacts.push({ type: spec.type, title: spec.title, content })
      } catch {
        artifacts.push({
          type: spec.type,
          title: spec.title,
          content: getFallbackArtifact(spec.type, projectName, projectDescription),
        })
      }
    } else {
      artifacts.push({
        type: spec.type,
        title: spec.title,
        content: getFallbackArtifact(spec.type, projectName, projectDescription),
      })
    }
  }

  return {
    decisions,
    consensus: consensusText,
    confidence,
    trace,
    artifacts,
    citations,
  }
}

function getFallbackAgentResponse(agent: string, name: string, desc: string): string {
  const fallbacks: Record<string, string> = {
    pm: `**Product Vision**\n${name} aims to ${desc.toLowerCase() || "solve a core user problem"} with a focused, iterative approach.\n\n**Target Users**\n- Primary: Users who need this solution\n- Secondary: Power users who will drive adoption\n\n**Key Features**\n1. Core workflow — the essential user journey\n2. User management — accounts, profiles, preferences\n3. Analytics — measure what matters\n\n**Success Metrics**\n- User activation rate (>60%)\n- Weekly active users\n- Task completion rate (>80%)\n\n**Risks & Mitigations**\n1. Adoption risk — invest in onboarding\n2. Technical risk — start with proven stack\n3. Market risk — validate early with beta users`,
    ux: `**User Personas**\n1. Primary persona — needs the core functionality\n2. Secondary persona — needs advanced features\n\n**Primary User Flow**\n1. Onboarding → 2. First action → 3. Core task → 4. Success state\n\n**Information Architecture**\n- Dashboard (home)\n- Main feature area\n- Settings & profile\n- Help & support\n\n**UX Recommendations**\n1. Reduce friction in onboarding\n2. Provide clear feedback on every action\n3. Design for mobile-first`,
    architect: `**Architecture Overview**\nRecommended architecture: Modern web stack with separation of concerns.\n\n**Tech Stack**\n- Frontend: Next.js / React\n- API: RESTful with server-side rendering\n- Database: PostgreSQL for structured data\n- Hosting: Vercel / AWS\n\n**Core API Endpoints**\n- GET /api/resource — list resources\n- POST /api/resource — create\n- GET /api/resource/:id — read\n- PATCH /api/resource/:id — update\n- DELETE /api/resource/:id — delete\n\n**Data Model**\n- User, Project, Resource core entities\n- Relation: User → Projects, Project → Resources\n\n**Scalability**\nStart monolith, extract services as needed. Cache aggressively.`,
    qa: `**Risk Assessment**\n1. Authentication bypass — HIGH severity, MEDIUM likelihood\n2. Data validation — MEDIUM severity, HIGH likelihood\n3. Rate limiting — MEDIUM severity, MEDIUM likelihood\n4. Session management — HIGH severity, LOW likelihood\n5. Third-party dependencies — LOW severity, HIGH likelihood\n\n**Test Strategy**\n- Unit tests for business logic\n- Integration tests for API endpoints\n- E2E tests for critical user flows\n\n**Security Concerns**\n1. Input sanitization\n2. authentication token handling\n3. API rate limiting\n\n**Edge Cases**\n1. Empty states\n2. Network failures\n3. Concurrent edits\n4. Large payloads\n5. Special characters in input`,
    scrum: `**Sprint Plan**\nSprint 1 (Weeks 1-2): Foundation\n- Project setup, authentication, basic CRUD\n- Story points: 21\n\nSprint 2 (Weeks 3-4): Core Features\n- Main workflow, user dashboard\n- Story points: 26\n\nSprint 3 (Weeks 5-6): Polish & Launch\n- Testing, bug fixes, deployment\n- Story points: 18\n\n**Total Estimate: 65 story points**\n\n**Dependencies**\n- Design system ready before Sprint 1\n- Third-party API keys by Sprint 2\n\n**Milestones**\n- MVP: End of Sprint 2\n- Beta: Mid Sprint 3\n- Launch: End of Sprint 3`,
    business: `**Revenue Model**\nFreemium with premium features. Free tier drives adoption; paid tier converts power users.\n\n**Go-to-Market Strategy**\n- Phase 1: Beta launch with targeted outreach\n- Phase 2: Content marketing + community building\n- Phase 3: Paid acquisition + partnerships\n\n**Competitive Landscape**\n1. Existing solutions — differentiation through simplicity\n2. DIY alternatives — compete on time-to-value\n3. Enterprise platforms — focus on underserved segments\n\n**Business Risks**\n1. Slow adoption — invest in onboarding\n2. Pricing misalignment — test early\n3. Churn — build retention loops\n\n**Success Criteria**\n- 1,000 active users by month 3\n- 10% conversion to paid\n- NPS > 40`,
  }
  return fallbacks[agent] || "Analysis in progress."
}

function getFallbackArtifact(type: string, name: string, desc: string): string {
  const artifacts: Record<string, string> = {
    prd: `# ${name} — Product Requirements Document\n\n## Overview\n${desc || "A new product initiative to solve a core user need."}\n\n## Goals\n- Launch MVP within 8 weeks\n- Validate core value proposition with early adopters\n- Establish feedback loop for iteration\n\n## User Stories\n- As a user, I want to accomplish the core task so I can get value from the product.\n- As a user, I want to manage my account so I can personalize my experience.\n- As a user, I want to track my progress so I can measure success.\n\n## Success Metrics\n- User activation rate\n- Weekly engagement\n- Task completion rate`,
    architecture: `# ${name} — System Architecture\n\n## Overview\nModern web architecture with Next.js frontend, RESTful API, and PostgreSQL database.\n\n## Tech Stack\n- Frontend: Next.js 15 + TypeScript + TailwindCSS\n- Backend: Next.js API routes\n- Database: PostgreSQL + Drizzle ORM\n- Auth: Auth.js\n- AI: Azure OpenAI / Foundry IQ\n\n## API Design\nRESTful endpoints with server-side rendering for initial page load and client-side data fetching for interactivity.\n\n## Data Model\nCore entities: User, Project, Artifact, Decision, Run\nRelationships defined via foreign keys with cascade deletes.`,
    ux: `# ${name} — User Experience Design\n\n## User Personas\n1. **Primary User** — needs the core functionality\n2. **Power User** — needs advanced features and customization\n\n## Primary Flow\n1. Sign up / Sign in\n2. Complete onboarding\n3. Core workflow\n4. View results\n5. Iterate\n\n## Design Principles\n- Clarity over cleverness\n- Progressive disclosure\n- Feedback on every action`,
    backlog: `# ${name} — Product Backlog\n\n## P0 — Must Have\n- User authentication and account management\n- Core workflow implementation\n- Basic dashboard\n\n## P1 — Should Have\n- Advanced features\n- Notifications\n- Analytics\n\n## P2 — Nice to Have\n- Integrations\n- Admin panel\n- API access`,
    qa: `# ${name} — QA Test Plan\n\n## Test Strategy\n- Unit tests: Core business logic\n- Integration tests: API endpoints\n- E2E tests: Critical user flows\n\n## Risk Matrix\n1. Authentication — HIGH priority\n2. Data integrity — HIGH priority\n3. Performance — MEDIUM priority\n\n## Test Scenarios\n1. User registration flow\n2. Core CRUD operations\n3. Error handling and edge cases`,
    roadmap: `# ${name} — Product Roadmap\n\n## Sprint 1: Foundation (Weeks 1-2)\n- Project setup, auth, basic UI\n\n## Sprint 2: Core (Weeks 3-4)\n- Main workflow, user dashboard\n\n## Sprint 3: Launch (Weeks 5-6)\n- Testing, polish, deployment\n\n## Milestones\n- MVP: End of Sprint 2\n- Public Launch: End of Sprint 3`,
    business: `# ${name} — Business Strategy\n\n## Revenue Model\nFreemium with premium subscription tiers.\n\n## Go-to-Market\n- Beta launch with targeted outreach\n- Content marketing for organic growth\n- Community building for retention\n\n## Competitive Advantage\n- AI-powered insights\n- Multi-agent collaboration\n- Transparent reasoning`,
  }
  return artifacts[type] || `# ${name}\n\n${desc || "Product documentation."}`
}
