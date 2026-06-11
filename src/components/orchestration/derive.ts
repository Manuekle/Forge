import type { RunEvent, StoredRun, DecisionVote } from "@/lib/store"

export type AgentLiveState =
  | "waiting"
  | "reading_context"
  | "reasoning"
  | "reviewing"
  | "revising"
  | "voting"
  | "completed"
  | "skipped"

export type AgentNode = {
  agent: string
  state: AgentLiveState
  reason: string
  vote?: DecisionVote
  round: number
  active: boolean
}

export type Handoff = {
  from: string
  to: string
  at: string
  ts: string
  detail: string
  summary?: string
}

export type LiveView = {
  /** Planned agents in execution order, with live state. */
  nodes: AgentNode[]
  /** Skipped agents with the orchestrator's reason. */
  skipped: { agent: string; reason: string }[]
  /** All handoff events, oldest first. */
  handoffs: Handoff[]
  /** Process timeline (every event, oldest first). */
  timeline: RunEvent[]
  /** Index of the currently active node, -1 when idle/finished. */
  activeIndex: number
  /** Edges that represent revision loops (from QA / orchestrator back to an earlier agent). */
  revisionEdges: { from: string; to: string; reason: string }[]
  strategy: string | null
  planSource: string | null
  confidence: number | null
  consensus: string | null
  isLive: boolean
}

const WORK_STATES: AgentLiveState[] = ["reading_context", "reasoning", "reviewing", "revising", "voting"]

/**
 * Fold a run's event stream + plan into a renderable live view.
 * Works identically for a finished run (replay) and a running one (live).
 */
export function deriveLiveView(run: StoredRun | null): LiveView {
  const empty: LiveView = {
    nodes: [],
    skipped: [],
    handoffs: [],
    timeline: [],
    activeIndex: -1,
    revisionEdges: [],
    strategy: null,
    planSource: null,
    confidence: null,
    consensus: null,
    isLive: false,
  }
  if (!run) return empty

  const events = run.events ?? []
  const plan = run.plan ?? null

  // Execution order: prefer the plan; fall back to first-seen order in events.
  const order: string[] = plan ? plan.selected.map((s) => s.agent) : []
  for (const e of events) {
    if (e.kind === "agent_state" && e.agent && e.agent !== "orchestrator" && !order.includes(e.agent)) {
      order.push(e.agent)
    }
  }

  const reasonByAgent = new Map<string, string>()
  for (const s of plan?.selected ?? []) reasonByAgent.set(s.agent, s.reason)

  const stateByAgent = new Map<string, AgentLiveState>()
  const roundByAgent = new Map<string, number>()
  for (const a of order) stateByAgent.set(a, "waiting")

  const handoffs: Handoff[] = []
  const revisionEdges: LiveView["revisionEdges"] = []

  for (const e of events) {
    if (e.kind === "agent_state" && e.agent && e.agent !== "orchestrator") {
      stateByAgent.set(e.agent, (e.state as AgentLiveState) ?? "reasoning")
      const m = e.detail.match(/round (\d+)/i)
      if (m) roundByAgent.set(e.agent, Number(m[1]))
    }
    if (e.kind === "handoff" && e.from && e.to) {
      handoffs.push({ from: e.from, to: e.to, at: e.at, ts: e.ts, detail: e.detail, summary: e.summary })
    }
    if (e.kind === "checkpoint" && e.from && e.to) {
      revisionEdges.push({ from: e.from, to: e.to, reason: e.summary || e.detail })
    }
  }

  const votes = run.votes ?? {}
  const isLive = run.status === "running"

  const nodes: AgentNode[] = order.map((agent) => {
    const state = stateByAgent.get(agent) ?? "waiting"
    return {
      agent,
      state,
      reason: reasonByAgent.get(agent) ?? "",
      vote: votes[agent],
      round: roundByAgent.get(agent) ?? 1,
      active: isLive && WORK_STATES.includes(state),
    }
  })

  const activeIndex = nodes.findIndex((n) => n.active)

  const consensusEvent = events.find((e) => e.kind === "consensus")

  return {
    nodes,
    skipped: plan?.skipped ?? [],
    handoffs,
    timeline: events,
    activeIndex,
    revisionEdges,
    strategy: plan?.strategy ?? null,
    planSource: plan?.source ?? null,
    confidence: run.confidence ?? consensusEvent?.confidence ?? null,
    consensus: run.consensus ?? null,
    isLive,
  }
}

export const VOTE_LABELS: Record<string, string> = {
  approve: "Approve",
  approve_with_concerns: "Approve w/ concerns",
  reject: "Reject",
  abstain: "Abstain",
}

export const VOTE_COLORS: Record<string, string> = {
  approve: "#2ED47A",
  approve_with_concerns: "#FCD34D",
  reject: "#F87171",
  abstain: "#71717A",
}

export const STATE_LABELS: Record<AgentLiveState, string> = {
  waiting: "Waiting",
  reading_context: "Reading context",
  reasoning: "Reasoning",
  reviewing: "Reviewing",
  revising: "Revising",
  voting: "Voting",
  completed: "Completed",
  skipped: "Skipped",
}
