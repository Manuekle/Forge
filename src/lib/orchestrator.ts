// Agentic orchestration engine for Forge.
//
// The orchestrator is a coordinator, not a summarizer:
//   1. Planning      — analyzes the request, selects/skips/orders agents, persists reasoning.
//   2. Routing       — executes a dynamic queue; only planned agents run.
//   3. Checkpoints   — after every agent, confidence is checked; low confidence lets the
//                      orchestrator re-run agents, escalate to QA, or request revisions.
//   4. Critique loop — QA emits structured critiques; high-severity ones are routed back
//                      to PM/UX/Architect, which revise their outputs.
//   5. Voting        — every agent casts approve / approve_with_concerns / reject with a
//                      self-reported confidence. Run confidence is derived from the tally.
//   6. Traceability  — every selection, skip, rerun, revision, vote, and halt is logged
//                      with its reason in both the run trace and the orchestrator log.

import { complete, aiConfigured } from "@/lib/foundry-iq"
import { retrieveKnowledge, type Citation } from "@/lib/knowledge"
import type { RunEvent } from "@/lib/store"

export type WorkerAgentId = "pm" | "ux" | "architect" | "qa" | "scrum" | "business"
export type VoteValue = "approve" | "approve_with_concerns" | "reject" | "abstain"

export type PlanStep = { agent: WorkerAgentId; reason: string }

export type OrchestrationPlan = {
  strategy: string
  selected: PlanStep[]
  skipped: { agent: WorkerAgentId; reason: string }[]
  source: "model" | "fallback"
}

export type OrchestratorLogEntry = {
  at: string
  type:
    | "plan"
    | "select"
    | "skip"
    | "checkpoint"
    | "rerun"
    | "revision"
    | "escalate"
    | "vote"
    | "confidence"
    | "halt"
    | "complete"
  detail: string
  reason: string
}

export type AgentVote = {
  vote: VoteValue
  confidence: number | null
  concerns: string
  round: number
}

export type RevisionRecord = {
  agent: WorkerAgentId
  round: number
  trigger: string
  rationale: string
}

export type OrchestrationResult = {
  decisions: { agent: string; entry: string; timestamp: string }[]
  consensus: string
  confidence: number
  trace: { time: string; action: string; detail: string; source?: string }[]
  artifacts: { type: string; title: string; content: string }[]
  citations: Citation[]
  plan: OrchestrationPlan
  votes: Record<string, AgentVote>
  revisions: RevisionRecord[]
  orchestratorLog: OrchestratorLogEntry[]
}

const AGENT_IDS: WorkerAgentId[] = ["pm", "ux", "architect", "qa", "scrum", "business"]

export const AGENT_LABELS: Record<WorkerAgentId, string> = {
  pm: "Product Manager",
  ux: "UX Agent",
  architect: "Architect",
  qa: "QA Agent",
  scrum: "Scrum Agent",
  business: "Business Agent",
}

const AGENT_ROSTER: Record<WorkerAgentId, string> = {
  pm: "Product Manager — PRD, user stories, success metrics, feature prioritization.",
  ux: "UX Designer — user flows, personas, information architecture, interaction patterns.",
  architect: "Tech Architect — system architecture, API contracts, data models, scalability.",
  qa: "QA Engineer — risks, edge cases, security, test strategy. Reviews other agents' work.",
  scrum: "Scrum Master — sprint plans, story points, roadmap, delivery timeline.",
  business: "Business Analyst — monetization, go-to-market, competitive positioning.",
}

// Which artifact types each agent's work backs. Only artifacts owned by agents
// that actually executed get generated — skipped agent, skipped artifact.
const ARTIFACT_OWNERS: Record<WorkerAgentId, string[]> = {
  pm: ["prd"],
  ux: ["ux"],
  architect: ["architecture"],
  qa: ["qa"],
  scrum: ["roadmap", "backlog"],
  business: ["business"],
}

const CONFIDENCE_THRESHOLD = Number(process.env.ORCHESTRATOR_CONFIDENCE_THRESHOLD) || 0.6
// Total budget for orchestrator interventions (reruns + revisions + escalations)
// per run — bounds token cost and prevents loops.
const MAX_INTERVENTIONS = Number(process.env.ORCHESTRATOR_MAX_INTERVENTIONS) || 3
const MAX_STEPS = 14

const VOTE_WEIGHTS: Record<Exclude<VoteValue, "abstain">, number> = {
  approve: 1.0,
  approve_with_concerns: 0.65,
  reject: 0.2,
}

// ---------------------------------------------------------------------------
// Agent prompts
// ---------------------------------------------------------------------------

const VOTE_BLOCK_INSTRUCTIONS = `

After your analysis, end your response with EXACTLY this block (plain text, not inside a code fence):

---VOTE---
VOTE: <approve | approve_with_concerns | reject — your verdict on the project direction given everything you have seen so far>
CONFIDENCE: <number between 0.00 and 1.00 — how confident you are in your own assessment>
CONCERNS: <one line summarizing your top concern, or "none">`

const CRITIQUE_BLOCK_INSTRUCTIONS = `

You are also the team's reviewer. After the vote block, add EXACTLY this block:

---CRITIQUES---
<JSON array of issues other agents must address. Each item: {"target": "pm" | "ux" | "architect", "risk": "<one sentence>", "severity": "high" | "medium" | "low"}. Use "high" only for risks that genuinely require that agent to revise their output. Use [] if nothing requires revision.>`

const MERMAID_RULES = `Use \`\`\`mermaid code blocks for diagrams. Strict Mermaid syntax rules — diagrams that break these fail to render:
- Flowchart/graph ONLY: wrap every node, decision, and edge label in double quotes: A["Auth service (OAuth2)"], B{"Under 7 days?"}, C -->|"yes (retry)"| D. Never put parens, angle brackets, ampersands, semicolons, or braces in an unquoted label.
- Do NOT bracket-wrap or quote keywords in other diagram types. Gantt: \`title My Roadmap\` and \`dateFormat YYYY-MM-DD\` take NO brackets/quotes; tasks are \`Task name :id, 2024-01-01, 30d\` under a \`section Name\`. Pie: \`pie title X\` then \`"Label" : 42\`. erDiagram/sequenceDiagram/classDiagram use their own syntax, not flowchart brackets.
- Plain ASCII only — no smart quotes, em-dashes, or unicode arrows
- Node IDs must be short and alphanumeric (A, B2, authSvc)
- One statement per line; keep each diagram under 20 nodes`

export const AGENT_PROMPTS: Record<WorkerAgentId, string> = {
  pm: `You are the Product Manager agent on a multi-agent AI product team called Forge.
Your role: Write a Product Requirements Document (PRD), define user stories, success metrics (KPIs), and prioritize features.
When you respond, structure your output as:
- Product Vision (1-2 sentences)
- Target Users (bullet list)
- Key Features (numbered, with rationale)
- Success Metrics (3 KPIs)
- Risks & Mitigations (top 3)

You can include a Mermaid flowchart showing the feature prioritization decision flow.
${MERMAID_RULES}

Be specific, actionable, and prioritize ruthlessly.${VOTE_BLOCK_INSTRUCTIONS}`,
  ux: `You are the UX Designer agent on a multi-agent AI product team called Forge.
Your role: Define user flows, information architecture, interaction patterns, and wireframe specifications.
When you respond, structure your output as:
- Key User Personas (2-3, with goals and pain points)
- Primary User Flow (step-by-step)
- Information Architecture (top-level navigation structure)
- UX Recommendations (top 3)

Include a Mermaid sequence diagram or flowchart showing the primary user journey.
${MERMAID_RULES}

Consider accessibility, mobile responsiveness, and onboarding.${VOTE_BLOCK_INSTRUCTIONS}`,
  architect: `You are the Software Architect agent on a multi-agent AI product team called Forge.
Your role: Design system architecture, API contracts, data models, and evaluate scalability.
When you respond, structure your output as:
- Architecture Overview (2-3 sentences)
- Tech Stack Recommendations (with rationale)
- Key API Endpoints (method, path, purpose)
- Data Model (core entities and relationships)
- Scalability Considerations

Include a Mermaid graph (flowchart) showing the system architecture and a Mermaid classDiagram or erDiagram showing the data model.
${MERMAID_RULES}

You push back on over-engineering and advocate for simple, proven patterns.${VOTE_BLOCK_INSTRUCTIONS}`,
  qa: `You are the QA Engineer agent on a multi-agent AI product team called Forge.
Your role: Identify risks, edge cases, security vulnerabilities, and define test strategies.
When you respond, structure your output as:
- Risk Assessment (severity × likelihood for top 5 risks)
- Test Strategy (unit, integration, e2e)
- Security Concerns (top 3)
- Edge Cases (top 5)

You can include a Mermaid flowchart showing the test decision flow or a graph showing risk assessment.
${MERMAID_RULES}

Be the pessimist — kill bad ideas before they ship.${VOTE_BLOCK_INSTRUCTIONS}${CRITIQUE_BLOCK_INSTRUCTIONS}`,
  scrum: `You are the Scrum Master agent on a multi-agent AI product team called Forge.
Your role: Break down work into sprints, estimate story points, and create a realistic roadmap.
When you respond, structure your output as:
- Sprint Plan (Sprint 1, 2, 3 with key deliverables per sprint)
- Story Point Estimates (total and per major feature)
- Dependencies & Blockers
- Milestone Dates (MVP, Beta, Launch)

Include a Mermaid gantt chart showing the sprint timeline and milestones.
${MERMAID_RULES}

Assume a 3-person engineering team working in 2-week sprints.${VOTE_BLOCK_INSTRUCTIONS}`,
  business: `You are the Business Strategist agent on a multi-agent AI product team called Forge.
Your role: Define monetization strategy, go-to-market plan, competitive positioning, and business risks.
When you respond, structure your output as:
- Revenue Model (how the product makes money)
- Go-to-Market Strategy (channels, timeline)
- Competitive Landscape (top 3 competitors + differentiation)
- Business Risks (top 3)
- Success Criteria (3 business KPIs)

You can include a Mermaid pie chart showing revenue model breakdown or a timeline for GTM phases.
${MERMAID_RULES}${VOTE_BLOCK_INSTRUCTIONS}`,
}

const PLANNER_PROMPT = `You are the Orchestrator of Forge, a multi-agent AI product team. Before any specialist runs, you analyze the request and produce an execution plan.

Available agents:
${AGENT_IDS.map((id) => `- "${id}": ${AGENT_ROSTER[id]}`).join("\n")}

Rules:
- Select ONLY the agents the request actually needs (minimum 2). Skip the rest.
- Order selected agents by dependency (e.g. business analysis before product definition, product before UX/architecture, QA after the agents it reviews).
- Include "qa" whenever anything will be designed or built — QA reviews the others' work.
- Every agent must appear exactly once, in either "selected" or "skipped", each with a concrete one-sentence reason tied to this specific request.

Respond with STRICT JSON only — no markdown, no commentary:
{"strategy": "<one sentence describing your overall approach>", "selected": [{"agent": "<id>", "reason": "<why this request needs this agent>"}], "skipped": [{"agent": "<id>", "reason": "<why this request does not need this agent>"}]}`

const CHECKPOINT_PROMPT = `You are the Orchestrator of Forge, a multi-agent AI product team. An agent just finished with low confidence or a rejection, and you must decide how to adapt the execution path.

Options:
- "proceed": the concern is acceptable or later agents will address it.
- "rerun_agent": re-run a specific agent with corrective guidance.
- "escalate_qa": bring QA in (earlier, or again) to scrutinize the flagged risk.
- "request_revision": ask an agent that already ran to revise its output to address the concern.

Respond with STRICT JSON only:
{"action": "proceed" | "rerun_agent" | "escalate_qa" | "request_revision", "agent": "<id or null>", "guidance": "<specific instruction for that agent, or null>", "reason": "<one sentence justifying the decision>"}`

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/** Extract the first balanced top-level JSON object/array from model output. */
function extractJson(raw: string): unknown {
  const start = raw.search(/[{[]/)
  if (start === -1) return null
  const open = raw[start]
  const close = open === "{" ? "}" : "]"
  let depth = 0
  let inString = false
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i]
    if (inString) {
      if (ch === "\\") i++
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === open || (ch === "{" && open === "[") || (ch === "[" && open === "{")) depth++
    else if (ch === close || ch === "}" || ch === "]") {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(raw.slice(start, i + 1))
        } catch {
          return null
        }
      }
    }
  }
  return null
}

function isWorkerAgent(id: unknown): id is WorkerAgentId {
  return typeof id === "string" && (AGENT_IDS as string[]).includes(id)
}

/** First meaningful line of an agent output, cleaned for one-line summaries. */
function firstLine(text: string): string {
  for (const line of text.split("\n")) {
    const t = line.replace(/^#+\s*/, "").replace(/\*\*/g, "").replace(/^[-*]\s*/, "").trim()
    if (t) return t
  }
  return ""
}

type ParsedAgentOutput = {
  body: string
  vote: VoteValue
  confidence: number | null
  concerns: string
  critiques: { target: WorkerAgentId; risk: string; severity: "high" | "medium" | "low" }[]
}

/** Parse the vote + critique blocks off an agent response; return cleaned body. */
function parseAgentOutput(raw: string): ParsedAgentOutput {
  let body = raw
  let vote: VoteValue = "abstain"
  let confidence: number | null = null
  let concerns = ""
  const critiques: ParsedAgentOutput["critiques"] = []

  const critiqueIdx = body.indexOf("---CRITIQUES---")
  if (critiqueIdx !== -1) {
    const block = body.slice(critiqueIdx)
    body = body.slice(0, critiqueIdx)
    const parsed = extractJson(block)
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (
          item &&
          isWorkerAgent(item.target) &&
          typeof item.risk === "string" &&
          ["high", "medium", "low"].includes(item.severity)
        ) {
          critiques.push({ target: item.target, risk: item.risk, severity: item.severity })
        }
      }
    }
  }

  const voteIdx = body.indexOf("---VOTE---")
  if (voteIdx !== -1) {
    const block = body.slice(voteIdx)
    body = body.slice(0, voteIdx)
    const voteMatch = block.match(/VOTE:\s*(approve_with_concerns|approve with concerns|approve|reject)/i)
    if (voteMatch) {
      vote = voteMatch[1].toLowerCase().replace(/ /g, "_") as VoteValue
    }
    const confMatch = block.match(/CONFIDENCE:\s*([\d.]+)/i)
    if (confMatch) confidence = Math.min(1, Math.max(0, parseFloat(confMatch[1])))
    const concernsMatch = block.match(/CONCERNS:\s*(.+)/i)
    if (concernsMatch && !/^none\.?$/i.test(concernsMatch[1].trim())) concerns = concernsMatch[1].trim()
  }

  return { body: body.trimEnd(), vote, confidence, concerns, critiques }
}

/** Human-readable vote footer appended to the stored deliberation entry. */
function voteFooter(p: ParsedAgentOutput): string {
  if (p.vote === "abstain") return ""
  const conf = p.confidence !== null ? ` · confidence ${p.confidence.toFixed(2)}` : ""
  const concerns = p.concerns ? ` — ${p.concerns}` : ""
  return `\n\n> **Vote:** ${p.vote.replace(/_/g, " ")}${conf}${concerns}`
}

/** Derive run confidence from the actual vote tally — never from the model's claim. */
function tallyConfidence(votes: Record<string, AgentVote>): {
  confidence: number
  counts: Record<VoteValue, number>
  detail: string
} {
  const counts: Record<VoteValue, number> = { approve: 0, approve_with_concerns: 0, reject: 0, abstain: 0 }
  const weights: number[] = []
  const selfConfs: number[] = []
  for (const v of Object.values(votes)) {
    counts[v.vote]++
    if (v.vote !== "abstain") {
      weights.push(VOTE_WEIGHTS[v.vote])
      if (v.confidence !== null) selfConfs.push(v.confidence)
    }
  }
  if (weights.length === 0) {
    return { confidence: 0.5, counts, detail: "no votes cast — neutral fallback 0.50" }
  }
  const voteScore = weights.reduce((a, b) => a + b, 0) / weights.length
  const selfScore = selfConfs.length > 0 ? selfConfs.reduce((a, b) => a + b, 0) / selfConfs.length : null
  const confidence = selfScore !== null ? 0.7 * voteScore + 0.3 * selfScore : voteScore
  const detail = `vote score ${voteScore.toFixed(2)} (${counts.approve} approve / ${counts.approve_with_concerns} concerns / ${counts.reject} reject / ${counts.abstain} abstain)${selfScore !== null ? ` · self-reported ${selfScore.toFixed(2)} · blended 0.7/0.3` : ""}`
  return { confidence: Math.round(confidence * 100) / 100, counts, detail }
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

type QueueItem = {
  agent: WorkerAgentId
  reason: string
  round: number
  // Set for reruns/revisions: corrective instruction from the orchestrator or QA.
  directive?: string
  revisionOf?: string
}

export async function runAgentOrchestration(
  args: {
    projectName: string
    projectDescription: string
    brief?: string | null
    template?: string | null
    projectMemory?: string
  },
  signal?: AbortSignal,
  onProgress?: (step: string) => Promise<void>,
  onPlan?: (plan: OrchestrationPlan) => Promise<void>,
  onEvent?: (event: RunEvent) => Promise<void>
): Promise<OrchestrationResult> {
  const { projectName, projectDescription, brief, template, projectMemory } = args
  const startTime = Date.now()

  const contextSummary = `Project: ${projectName}
Description: ${projectDescription}
${brief ? `\n## Detailed Context\n${brief}\n` : ""}
${template ? `Template: ${template}` : ""}
${projectMemory ? `\n${projectMemory}` : ""}`

  const decisions: OrchestrationResult["decisions"] = []
  const trace: OrchestrationResult["trace"] = []
  const orchestratorLog: OrchestratorLogEntry[] = []
  const votes: Record<string, AgentVote> = {}
  const revisions: RevisionRecord[] = []

  function elapsed(): string {
    const ms = Date.now() - startTime
    const sec = Math.floor(ms / 1000)
    const frac = (ms % 1000).toString().padStart(3, "0").slice(0, 2)
    const min = Math.floor(sec / 60)
    const s = sec % 60
    return `[${min.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${frac}]`
  }

  function log(type: OrchestratorLogEntry["type"], detail: string, reason: string, traceAction?: string) {
    orchestratorLog.push({ at: elapsed(), type, detail, reason })
    trace.push({ time: elapsed(), action: traceAction ?? `orchestrator.${type}`, detail, source: reason })
  }

  /** Emit a structured live event; event persistence must never break the run. */
  async function emit(event: Omit<RunEvent, "at" | "ts">): Promise<void> {
    if (!onEvent) return
    try {
      await onEvent({ at: elapsed(), ts: new Date().toISOString(), ...event })
    } catch {
      // swallow — the run is the priority, the event stream is best-effort
    }
  }

  trace.push({ time: elapsed(), action: "iq.intent.parse", detail: `project: ${projectName}` })

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
  await emit({
    kind: "retrieval",
    agent: "orchestrator",
    detail: `Retrieved ${citations.length} grounded sources (${retrieval.backend})`,
    summary: citations.map((c) => `[${c.ref}] ${c.title}`).join(" · ") || "no sources",
  })

  const aiAvailable = aiConfigured

  // -------------------------------------------------------------------------
  // Phase 1: Planning — the orchestrator decides who runs, in what order, and why
  // -------------------------------------------------------------------------
  if (onProgress) await onProgress("Orchestrator planning: selecting agents...")

  let plan: OrchestrationPlan = {
    strategy: "Full pipeline (planner unavailable — default sequence preserved for compatibility).",
    selected: AGENT_IDS.map((agent) => ({
      agent,
      reason: "Default sequence: AI planner not available for this run.",
    })),
    skipped: [],
    source: "fallback",
  }

  if (aiAvailable) {
    try {
      if (signal?.aborted) throw new Error("aborted")
      const result = await complete(
        [
          { role: "system", content: PLANNER_PROMPT },
          { role: "user", content: `Plan the agent execution for this request:\n\n${contextSummary}` },
        ],
        { maxTokens: 2048 }
      )
      const raw = result.completion.choices[0]?.message?.content || ""
      const parsed = extractJson(raw) as {
        strategy?: string
        selected?: { agent?: string; reason?: string }[]
        skipped?: { agent?: string; reason?: string }[]
      } | null
      const selected: PlanStep[] = []
      const seen = new Set<string>()
      for (const s of parsed?.selected ?? []) {
        if (isWorkerAgent(s.agent) && !seen.has(s.agent)) {
          seen.add(s.agent)
          selected.push({ agent: s.agent, reason: s.reason || "Selected by orchestrator." })
        }
      }
      if (selected.length >= 2) {
        const skipped: OrchestrationPlan["skipped"] = []
        for (const s of parsed?.skipped ?? []) {
          if (isWorkerAgent(s.agent) && !seen.has(s.agent)) {
            seen.add(s.agent)
            skipped.push({ agent: s.agent, reason: s.reason || "Not needed for this request." })
          }
        }
        // Any roster agent the planner forgot is treated as skipped, with that noted.
        for (const agent of AGENT_IDS) {
          if (!seen.has(agent)) skipped.push({ agent, reason: "Not mentioned in plan — treated as skipped." })
        }
        plan = {
          strategy: parsed?.strategy || "Orchestrator-selected execution.",
          selected,
          skipped,
          source: "model",
        }
      } else {
        log("plan", "planner returned <2 valid agents", "falling back to full default sequence", "orchestrator.plan.fallback")
      }
    } catch (err) {
      log(
        "plan",
        "planner call failed",
        `${err instanceof Error ? err.message.slice(0, 80) : "error"} — falling back to full default sequence`,
        "orchestrator.plan.fallback"
      )
    }
  }

  log(
    "plan",
    `${plan.selected.length} selected · ${plan.skipped.length} skipped · ${plan.strategy}`,
    `order: ${plan.selected.map((s) => s.agent).join(" → ")}`
  )
  for (const s of plan.selected) log("select", s.agent, s.reason)
  for (const s of plan.skipped) log("skip", s.agent, s.reason)
  if (onPlan) await onPlan(plan)
  await emit({
    kind: "plan",
    agent: "orchestrator",
    detail: plan.strategy,
    summary: `${plan.selected.map((s) => s.agent).join(" → ")}${plan.skipped.length > 0 ? ` · skipped: ${plan.skipped.map((s) => s.agent).join(", ")}` : ""}`,
  })

  // -------------------------------------------------------------------------
  // Phase 2: Dynamic execution — queue-driven, reshaped by checkpoints & critiques
  // -------------------------------------------------------------------------
  const queue: QueueItem[] = plan.selected.map((s) => ({ agent: s.agent, reason: s.reason, round: 1 }))
  // agent -> latest cleaned output (used as context and as revision base)
  const outputs = new Map<WorkerAgentId, string>()
  const executionOrder: WorkerAgentId[] = []
  let interventionsLeft = MAX_INTERVENTIONS
  let steps = 0
  let qaHasRun = false

  async function executeAgent(item: QueueItem): Promise<ParsedAgentOutput> {
    const label = AGENT_LABELS[item.agent]
    if (onProgress) {
      await onProgress(
        item.directive
          ? `${label} revising (round ${item.round})...`
          : `${label} analyzing (${executionOrder.length + 1}/${plan.selected.length})...`
      )
    }

    // Handoff: who is passing work to this agent, and what.
    const prevAgent = executionOrder[executionOrder.length - 1]
    if (item.directive) {
      await emit({
        kind: "handoff",
        from: "orchestrator",
        to: item.agent,
        detail: `Orchestrator directive → ${label}`,
        summary: item.directive.slice(0, 160),
      })
    } else if (prevAgent && outputs.has(prevAgent)) {
      await emit({
        kind: "handoff",
        from: prevAgent,
        to: item.agent,
        detail: `${AGENT_LABELS[prevAgent]} output → ${label}`,
        summary: firstLine(outputs.get(prevAgent) || "").slice(0, 160),
      })
    } else {
      await emit({
        kind: "handoff",
        from: "orchestrator",
        to: item.agent,
        detail: `Orchestrator delegates to ${label}`,
        summary: item.reason,
      })
    }

    await emit({
      kind: "agent_state",
      agent: item.agent,
      state: "reading_context",
      detail: `Reading project context${outputs.size > 0 ? ` + ${outputs.size} prior agent output${outputs.size === 1 ? "" : "s"}` : ""}${citations.length > 0 ? ` + ${citations.length} grounded sources` : ""}`,
    })

    let contextBlock = `## Project Context\n${contextSummary}\n\n`
    if (knowledgeBase) {
      contextBlock += `\n${knowledgeBase}\nWhen a recommendation is supported by a retrieved source, cite it inline using its [S#] marker.\n`
    }
    if (outputs.size > 0) {
      contextBlock += `\n## Previous Agent Outputs\n${[...outputs.entries()]
        .map(([id, content]) => `### ${AGENT_LABELS[id]}:\n${content}`)
        .join("\n\n")}\n`
    }

    let userContent: string
    if (item.directive && outputs.has(item.agent)) {
      userContent = `The orchestrator is requesting a REVISION of your previous output.\n\nReason: ${item.directive}\n\n## Your Previous Output\n${outputs.get(item.agent)}\n\nRevise your output to address the concern. Keep what is still valid, change what must change, and state explicitly (in a short "Revision Notes" section at the top) what you changed and why.`
    } else if (item.directive) {
      userContent = `Analyze the following product idea with special attention to this orchestrator directive: ${item.directive}\n\n${contextSummary}\n\n${knowledgeBase ? "Retrieved knowledge is provided above. Ground your recommendations in it and cite sources inline with [S#] markers.\n" : ""}`
    } else {
      userContent = `Analyze the following product idea and provide your expert assessment:\n\n${contextSummary}\n\n${knowledgeBase ? "Retrieved knowledge is provided above. Ground your recommendations in it and cite sources inline with [S#] markers.\n" : ""}`
    }

    trace.push({
      time: elapsed(),
      action: "orchestrator.delegate",
      detail: `${label} · ${item.directive ? `revision round ${item.round}` : "reasoning"}`,
      source: item.reason,
    })

    const workState = item.directive && item.round > 1 ? "revising" : item.agent === "qa" ? "reviewing" : "reasoning"
    await emit({
      kind: "agent_state",
      agent: item.agent,
      state: workState,
      detail:
        workState === "revising"
          ? `Revising prior output (round ${item.round})`
          : workState === "reviewing"
            ? `Reviewing the team's work and assessing risks`
            : `Analyzing the request and generating ${label.toLowerCase()} output`,
    })

    let raw: string
    try {
      if (signal?.aborted) throw new Error("aborted")
      const result = await complete(
        [
          { role: "system", content: AGENT_PROMPTS[item.agent] + "\n\n" + contextBlock },
          { role: "user", content: userContent },
        ],
        // Reasoning models spend part of the budget on hidden thinking tokens;
        // give them headroom so the visible answer isn't truncated or empty.
        { maxTokens: 4096 }
      )
      raw = result.completion.choices[0]?.message?.content || "No response generated."
    } catch (err) {
      raw = getFallbackAgentResponse(item.agent, projectName, projectDescription)
      trace.push({
        time: elapsed(),
        action: "agent.fallback",
        detail: `${label} · model call failed (${err instanceof Error ? err.message.slice(0, 80) : "error"}) — using canned response`,
      })
    }

    const parsed = parseAgentOutput(raw)
    outputs.set(item.agent, parsed.body)
    decisions.push({
      agent: item.agent,
      entry:
        (item.directive && item.round > 1 ? `> 🔁 **Revision (round ${item.round})** — requested by orchestrator: ${item.directive}\n\n` : "") +
        parsed.body +
        voteFooter(parsed),
      timestamp: new Date().toISOString(),
    })
    votes[item.agent] = {
      vote: parsed.vote,
      confidence: parsed.confidence,
      concerns: parsed.concerns,
      round: item.round,
    }
    log(
      "vote",
      `${item.agent}: ${parsed.vote}${parsed.confidence !== null ? ` (${parsed.confidence.toFixed(2)})` : ""}`,
      parsed.concerns || "no concerns raised",
      "agent.vote"
    )
    await emit({
      kind: "agent_state",
      agent: item.agent,
      state: "voting",
      detail: `Casting vote on the project direction`,
    })
    await emit({
      kind: "vote",
      agent: item.agent,
      vote: parsed.vote,
      confidence: parsed.confidence ?? undefined,
      detail: `${label} voted ${parsed.vote.replace(/_/g, " ")}${parsed.confidence !== null ? ` (confidence ${parsed.confidence.toFixed(2)})` : ""}`,
      summary: parsed.concerns || undefined,
    })
    await emit({
      kind: "agent_state",
      agent: item.agent,
      state: "completed",
      detail: `Submitted ${item.round > 1 ? `revised output (round ${item.round})` : "output"} to the orchestrator`,
      summary: firstLine(parsed.body).slice(0, 160),
    })
    trace.push({
      time: elapsed(),
      action: "orchestrator.receive",
      detail: `${label} · ${parsed.body.split("\n")[0]?.slice(0, 60)}...`,
    })
    return parsed
  }

  /** Orchestrator checkpoint: adapt the execution path when confidence drops. */
  async function checkpoint(item: QueueItem, parsed: ParsedAgentOutput): Promise<void> {
    const lowConfidence = parsed.confidence !== null && parsed.confidence < CONFIDENCE_THRESHOLD
    const rejected = parsed.vote === "reject"
    if (!lowConfidence && !rejected) return
    if (interventionsLeft <= 0) {
      log(
        "checkpoint",
        `${item.agent} flagged (${rejected ? "reject" : `confidence ${parsed.confidence?.toFixed(2)}`}) — no action`,
        "intervention budget exhausted — proceeding with reduced confidence"
      )
      return
    }
    if (!aiAvailable) return

    if (onProgress) await onProgress(`Orchestrator reviewing ${AGENT_LABELS[item.agent]}'s concerns...`)
    let decision: { action: string; agent: string | null; guidance: string | null; reason: string } = {
      action: "proceed",
      agent: null,
      guidance: null,
      reason: "checkpoint call failed — defaulting to proceed",
    }
    try {
      if (signal?.aborted) throw new Error("aborted")
      const result = await complete(
        [
          { role: "system", content: CHECKPOINT_PROMPT },
          {
            role: "user",
            content: `Agent "${item.agent}" (${AGENT_LABELS[item.agent]}) finished with vote=${parsed.vote}, confidence=${parsed.confidence ?? "unreported"} (threshold ${CONFIDENCE_THRESHOLD}).\nConcern: ${parsed.concerns || "none stated"}\n\nAgents already completed: ${executionOrder.join(", ") || "none"}\nAgents still queued: ${queue.map((q) => q.agent).join(", ") || "none"}\nIntervention budget remaining: ${interventionsLeft}\n\nAgent's output (truncated):\n${parsed.body.slice(0, 1500)}`,
          },
        ],
        { maxTokens: 1024 }
      )
      const raw = result.completion.choices[0]?.message?.content || ""
      const json = extractJson(raw) as typeof decision | null
      if (json && ["proceed", "rerun_agent", "escalate_qa", "request_revision"].includes(json.action)) {
        decision = { action: json.action, agent: json.agent ?? null, guidance: json.guidance ?? null, reason: json.reason || "no reason given" }
      }
    } catch {
      // keep default proceed
    }

    const target = isWorkerAgent(decision.agent) ? decision.agent : item.agent
    switch (decision.action) {
      case "rerun_agent": {
        interventionsLeft--
        const round = (votes[target]?.round ?? 0) + 1
        queue.unshift({
          agent: target,
          reason: decision.reason,
          round,
          directive: decision.guidance || `Address the concern raised: ${parsed.concerns || "low confidence in prior output"}`,
        })
        revisions.push({ agent: target, round, trigger: `checkpoint after ${item.agent}`, rationale: decision.reason })
        log("rerun", `re-running ${target} (round ${round})`, decision.reason)
        break
      }
      case "request_revision": {
        if (outputs.has(target)) {
          interventionsLeft--
          const round = (votes[target]?.round ?? 0) + 1
          queue.unshift({
            agent: target,
            reason: decision.reason,
            round,
            directive: decision.guidance || `Revise to address: ${parsed.concerns || "concern raised downstream"}`,
          })
          revisions.push({ agent: target, round, trigger: `checkpoint after ${item.agent}`, rationale: decision.reason })
          log("revision", `revision requested from ${target} (round ${round})`, decision.reason)
        } else {
          log("checkpoint", `revision target ${target} has not run — proceeding`, decision.reason)
        }
        break
      }
      case "escalate_qa": {
        interventionsLeft--
        const queuedIdx = queue.findIndex((q) => q.agent === "qa")
        if (queuedIdx > 0) {
          const [qaItem] = queue.splice(queuedIdx, 1)
          queue.unshift({ ...qaItem, reason: decision.reason, directive: decision.guidance || qaItem.directive })
          log("escalate", "QA moved to front of queue", decision.reason)
        } else if (queuedIdx === -1) {
          const round = (votes.qa?.round ?? 0) + 1
          queue.unshift({
            agent: "qa",
            reason: decision.reason,
            round,
            directive: decision.guidance || `Scrutinize the risk flagged by ${AGENT_LABELS[item.agent]}: ${parsed.concerns}`,
          })
          log("escalate", `QA ${qaHasRun ? "re-engaged" : "added to plan"} (round ${round})`, decision.reason)
        } else {
          log("escalate", "QA already next in queue", decision.reason)
        }
        break
      }
      default:
        log("checkpoint", `proceeding after ${item.agent} flag`, decision.reason)
    }
    await emit({
      kind: "checkpoint",
      agent: "orchestrator",
      detail: `Checkpoint after ${AGENT_LABELS[item.agent]}: ${decision.action.replace(/_/g, " ")}${decision.action !== "proceed" ? ` → ${target}` : ""}`,
      summary: decision.reason,
    })
  }

  /** Critique loop: route QA's high-severity findings back to their owners. */
  async function routeCritiques(parsed: ParsedAgentOutput): Promise<void> {
    const high = parsed.critiques.filter((c) => c.severity === "high")
    const rest = parsed.critiques.filter((c) => c.severity !== "high")
    for (const c of rest) {
      log("checkpoint", `QA critique (${c.severity}) for ${c.target} noted, no revision`, c.risk)
    }
    for (const c of high) {
      if (!outputs.has(c.target)) {
        log("checkpoint", `QA critique for ${c.target} skipped — agent never ran`, c.risk)
        continue
      }
      if (interventionsLeft <= 0) {
        log("checkpoint", `QA critique for ${c.target} not routed`, `intervention budget exhausted — risk recorded: ${c.risk}`)
        continue
      }
      interventionsLeft--
      const round = (votes[c.target]?.round ?? 0) + 1
      queue.unshift({
        agent: c.target,
        reason: `QA identified a high-severity risk`,
        round,
        directive: `QA identified a high-severity risk in your output: ${c.risk}. Revise to mitigate it.`,
      })
      revisions.push({ agent: c.target, round, trigger: "QA critique", rationale: c.risk })
      log("revision", `QA critique routed to ${c.target} (round ${round})`, c.risk)
      await emit({
        kind: "checkpoint",
        agent: "orchestrator",
        from: "qa",
        to: c.target,
        detail: `QA critique routed to ${AGENT_LABELS[c.target]} for revision (round ${round})`,
        summary: c.risk,
      })
    }
  }

  while (queue.length > 0) {
    if (steps >= MAX_STEPS) {
      log("halt", `execution stopped after ${steps} steps`, `step cap ${MAX_STEPS} reached — remaining queue dropped: ${queue.map((q) => q.agent).join(", ")}`)
      queue.length = 0
      break
    }
    steps++
    const item = queue.shift()!
    const parsed = await executeAgent(item)
    if (!executionOrder.includes(item.agent)) executionOrder.push(item.agent)
    if (item.agent === "qa") {
      qaHasRun = true
      if (parsed.critiques.length > 0) {
        trace.push({ time: elapsed(), action: "qa.critique", detail: `${parsed.critiques.length} findings`, source: parsed.critiques.map((c) => `[${c.severity}] ${c.target}: ${c.risk.slice(0, 60)}`).join(" · ") })
      }
      await routeCritiques(parsed)
    }
    await checkpoint(item, parsed)
  }

  // -------------------------------------------------------------------------
  // Phase 3: Vote tally — confidence comes from the actual votes, not the model
  // -------------------------------------------------------------------------
  const tally = tallyConfidence(votes)
  const confidence = tally.confidence
  log("confidence", `confidence ${confidence.toFixed(2)} from ${Object.keys(votes).length} votes`, tally.detail, "vote.tally")
  await emit({
    kind: "vote",
    agent: "orchestrator",
    confidence,
    detail: `Vote tally complete — run confidence ${confidence.toFixed(2)}`,
    summary: tally.detail,
  })

  if (tally.counts.reject > tally.counts.approve + tally.counts.approve_with_concerns) {
    log("halt", "majority rejection", "more agents rejected than approved — consensus emitted with low confidence; human review recommended")
  }

  // -------------------------------------------------------------------------
  // Phase 4: Consensus synthesis (orchestrator summarizes; confidence already fixed)
  // -------------------------------------------------------------------------
  if (onProgress) await onProgress("Synthesizing consensus among agents...")
  trace.push({ time: elapsed(), action: "debate.open", detail: "synthesizing agent perspectives" })

  let consensusText: string
  if (aiAvailable) {
    try {
      if (signal?.aborted) throw new Error("aborted")
      const consensusResult = await complete(
        [
          {
            role: "system",
            content: `You are the Orchestrator agent on a multi-agent product team. ${executionOrder.length} specialist agents analyzed a product idea, voted on it, and (where requested) revised their work. Synthesize their outputs into a single coherent product strategy. Acknowledge unresolved concerns from the vote record honestly.

RESPOND WITH EXACTLY THIS FORMAT:
CONSENSUS: <one-paragraph summary of what the team agreed on, including any standing dissent>
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
            content: `Vote record:\n${Object.entries(votes)
              .map(([a, v]) => `- ${AGENT_LABELS[a as WorkerAgentId]}: ${v.vote}${v.confidence !== null ? ` (${v.confidence.toFixed(2)})` : ""}${v.concerns ? ` — ${v.concerns}` : ""}`)
              .join("\n")}\n\nFinal agent analyses:\n\n${[...outputs.entries()].map(([a, c]) => `--- ${AGENT_LABELS[a]} ---\n${c}`).join("\n\n")}\n\nSynthesize and produce the consensus.`,
          },
        ],
        { maxTokens: 2048 }
      )
      const raw = consensusResult.completion.choices[0]?.message?.content || ""
      const consensusMatch = raw.match(/CONSENSUS:\s*(.+?)(?:\n|$)/)
      consensusText = consensusMatch?.[1] || raw
    } catch (err) {
      consensusText = `${projectName} is viable. The team recommends starting with a focused MVP targeting the core user need.`
      trace.push({
        time: elapsed(),
        action: "consensus.fallback",
        detail: `model call failed (${err instanceof Error ? err.message.slice(0, 80) : "error"}) — using canned consensus`,
      })
    }
  } else {
    consensusText = `${projectName} is viable. The team recommends starting with a focused MVP targeting the core user need.`
  }

  trace.push({ time: elapsed(), action: "consensus.emit", detail: `confidence ${confidence.toFixed(2)} (vote-derived)` })
  await emit({
    kind: "consensus",
    agent: "orchestrator",
    confidence,
    detail: `Consensus reached (confidence ${confidence.toFixed(2)}, vote-derived)`,
    summary: consensusText.slice(0, 240),
  })

  // -------------------------------------------------------------------------
  // Phase 5: Artifacts — only for agents that actually executed
  // -------------------------------------------------------------------------
  const ownedTypes = new Set(executionOrder.flatMap((a) => ARTIFACT_OWNERS[a]))
  const allSpecs = getArtifactSpecs(projectName)
  const artifactSpecs = allSpecs.filter((s) => ownedTypes.has(s.type))
  for (const s of allSpecs) {
    if (!ownedTypes.has(s.type)) {
      const owner = AGENT_IDS.find((a) => ARTIFACT_OWNERS[a].includes(s.type))
      log("skip", `artifact ${s.type} skipped`, `owning agent ${owner} was not part of this run's plan`, "artifact.skip")
    }
  }

  trace.push({ time: elapsed(), action: "run.complete", detail: `generating ${artifactSpecs.length} artifacts` })

  const deliberationSummary = [...outputs.entries()].map(([a, c]) => `--- ${AGENT_LABELS[a]} ---\n${c}`).join("\n\n")

  if (onProgress) await onProgress(`Generating ${artifactSpecs.length} deliverables in parallel...`)
  for (const spec of artifactSpecs) {
    trace.push({ time: elapsed(), action: "artifact.generate", detail: spec.type })
  }

  // Artifact documents only depend on the deliberation, not on each other —
  // generate them concurrently in small batches (full fan-out trips Azure 429s).
  const ARTIFACT_CONCURRENCY = 3
  const artifacts: { type: string; title: string; content: string }[] = []
  for (let i = 0; i < artifactSpecs.length; i += ARTIFACT_CONCURRENCY) {
    const batch = await Promise.all(
      artifactSpecs.slice(i, i + ARTIFACT_CONCURRENCY).map(async (spec) => {
        if (aiAvailable) {
          try {
            if (signal?.aborted) throw new Error("aborted")
            const result = await complete(
              [
                {
                  role: "system",
                  content: `You are a senior technical writer generating a polished, production-quality document. Use the team's deliberation context to ground your output in real decisions. If there is a previous version of this document, improve upon it — refine the content, add depth, and address any gaps. Use Mermaid diagram blocks (\`\`\`mermaid) where they clarify architecture, flows, timelines, or relationships. ${MERMAID_RULES}`,
                },
                {
                  role: "user",
                  content: `${spec.prompt}\n\n## Project Context\n${contextSummary}\n\n## Team Deliberation\n${deliberationSummary}`,
                },
              ],
              { maxTokens: 6144 }
            )
            const content = result.completion.choices[0]?.message?.content
            if (content) {
              trace.push({ time: elapsed(), action: "artifact.complete", detail: spec.type })
              await emit({ kind: "artifact", agent: "orchestrator", detail: `Artifact ready: ${spec.title}`, summary: spec.type })
              return { type: spec.type, title: spec.title, content }
            }
            throw new Error("empty completion")
          } catch (err) {
            trace.push({
              time: elapsed(),
              action: "artifact.fallback",
              detail: `${spec.type} · model call failed (${err instanceof Error ? err.message.slice(0, 80) : "error"}) — using template`,
            })
          }
        }
        return {
          type: spec.type,
          title: spec.title,
          content: getFallbackArtifact(spec.type, projectName, projectDescription),
        }
      })
    )
    artifacts.push(...batch)
  }

  log(
    "complete",
    `${executionOrder.length} agents · ${revisions.length} revisions · ${artifacts.length} artifacts`,
    `execution path: ${executionOrder.join(" → ")} · confidence ${confidence.toFixed(2)} from votes`
  )
  await emit({
    kind: "complete",
    agent: "orchestrator",
    confidence,
    detail: `Run complete: ${executionOrder.length} agents, ${revisions.length} revisions, ${artifacts.length} artifacts`,
    summary: `execution path: ${executionOrder.join(" → ")}`,
  })

  return {
    decisions,
    consensus: consensusText,
    confidence,
    trace,
    artifacts,
    citations,
    plan,
    votes,
    revisions,
    orchestratorLog,
  }
}

// ---------------------------------------------------------------------------
// Artifact specs & offline fallbacks
// ---------------------------------------------------------------------------

function getArtifactSpecs(projectName: string): { type: string; title: string; prompt: string }[] {
  return [
    {
      type: "prd",
      title: `${projectName} — Product Requirements Document`,
      prompt: `Generate a complete PRD for ${projectName} based on the team's deliberation. Include: product vision, target users, feature list with rationale, success metrics, and a release plan. Format in markdown. If relevant, include a Mermaid flowchart showing feature prioritization. ${MERMAID_RULES}`,
    },
    {
      type: "architecture",
      title: `${projectName} — System Architecture`,
      prompt: `Design the system architecture for ${projectName}. Include: tech stack, core components, API design, data model, and deployment strategy. Include a Mermaid graph (flowchart) of the system architecture and a Mermaid erDiagram of the data model. ${MERMAID_RULES}`,
    },
    {
      type: "ux",
      title: `${projectName} — User Experience Design`,
      prompt: `Define the UX design for ${projectName}. Include: user personas, primary user flow (step by step), information architecture, and interface guidelines. Include a Mermaid sequence diagram showing the primary user journey. ${MERMAID_RULES} Format in markdown.`,
    },
    {
      type: "backlog",
      title: `${projectName} — Product Backlog`,
      prompt: `Create a prioritized product backlog for ${projectName}. Include: 10-15 user stories with acceptance criteria, story point estimates, and priority labels (P0/P1/P2). Format in markdown.`,
    },
    {
      type: "qa",
      title: `${projectName} — QA Test Plan`,
      prompt: `Create a QA test plan for ${projectName}. Include: test strategy, risk matrix, key test scenarios, security concerns, and edge cases. You can include a Mermaid flowchart showing the risk assessment decision flow. ${MERMAID_RULES} Format in markdown.`,
    },
    {
      type: "roadmap",
      title: `${projectName} — Product Roadmap`,
      prompt: `Create a product roadmap for ${projectName}. Include: 3-sprint plan with deliverables, milestones, dependencies, and a timeline. Include a Mermaid gantt chart showing the sprint timeline and milestones. ${MERMAID_RULES} Format in markdown.`,
    },
    {
      type: "business",
      title: `${projectName} — Business Strategy`,
      prompt: `Create a business strategy for ${projectName}. Include: revenue model, GTM strategy, competitive landscape, business risks, and success KPIs. You can include a Mermaid pie chart for revenue breakdown. ${MERMAID_RULES} Format in markdown.`,
    },
  ]
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
