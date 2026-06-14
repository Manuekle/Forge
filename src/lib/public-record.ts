/**
 * Public Decision Record projection.
 *
 * A run row carries internal plumbing (project/user IDs, raw progress strings).
 * A *published* Decision Record is the curated, non-secret subset that anyone
 * with the link may see. Both the public API route and the public page render
 * from this one shape, so the privacy boundary lives in exactly one place.
 */
import type { PublicRunRecord, DecisionVote, RunCitation, StoredRunPlan } from "@/lib/store"

export type PublicDecisionRecord = {
  shareId: string
  projectName: string
  projectDescription: string
  strategy: string | null
  planSource: string | null
  selected: { agent: string; reason: string }[]
  skipped: { agent: string; reason: string }[]
  votes: { agent: string; vote: string; confidence: number | null; concerns: string; round: number }[]
  confidence: number | null
  consensus: string | null
  citations: { ref: string; title: string; source: string; score: number; snippet: string }[]
  durationSeconds: number | null
  createdAt: string
}

export function toPublicRecord(run: PublicRunRecord): PublicDecisionRecord {
  const plan: StoredRunPlan | null = run.plan
  const votes: [string, DecisionVote][] = Object.entries(run.votes ?? {})
  return {
    shareId: run.shareId ?? "",
    projectName: run.projectName,
    projectDescription: run.projectDescription,
    strategy: plan?.strategy ?? null,
    planSource: plan?.source ?? null,
    selected: plan?.selected ?? [],
    skipped: plan?.skipped ?? [],
    votes: votes.map(([agent, v]) => ({
      agent,
      vote: v.vote,
      confidence: v.confidence,
      concerns: v.concerns,
      round: v.round,
    })),
    confidence: run.confidence,
    consensus: run.consensus,
    citations: (run.citations ?? []).map((c: RunCitation) => ({
      ref: c.ref,
      title: c.title,
      source: c.source,
      score: c.score,
      snippet: c.snippet,
    })),
    durationSeconds: run.duration ?? null,
    createdAt: run.createdAt.toISOString(),
  }
}

export const AGENT_LABELS: Record<string, string> = {
  pm: "Product Manager",
  ux: "UX Designer",
  architect: "Architect",
  qa: "QA Engineer",
  scrum: "Scrum Master",
  business: "Business Analyst",
  orchestrator: "Orchestrator",
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
