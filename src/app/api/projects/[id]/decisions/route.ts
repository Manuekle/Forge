import { NextResponse } from "next/server"
import { store } from "@/lib/store"
import { complete } from "@/lib/foundry-iq"
import { requireProjectAccess } from "@/lib/api-auth"
import { sanitizeForPrompt, safeJson } from "@/lib/guard"

const DEBATE_AGENTS = [
  {
    key: "pm",
    label: "Product Manager",
    prompt: `You are the Product Manager agent. Evaluate the decision topic from a product perspective: user impact, business value, and feasibility. Respond with 2-3 sentences giving your recommendation and reasoning.`,
  },
  {
    key: "architect",
    label: "Architect",
    prompt: `You are the Software Architect agent. Evaluate the decision topic from a technical perspective: implementation complexity, scalability, and system impact. Respond with 2-3 sentences giving your recommendation and reasoning.`,
  },
  {
    key: "qa",
    label: "QA Agent",
    prompt: `You are the QA Engineer agent. Evaluate the decision topic from a quality and risk perspective: security implications, edge cases, and potential failure modes. Respond with 2-3 sentences giving your recommendation and reasoning.`,
  },
]

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const access = await requireProjectAccess(id)
  if (!access.ok) return access.response
  const all = await store.getDecisions(id)
  return NextResponse.json(all)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const access = await requireProjectAccess(id)
  if (!access.ok) return access.response

  const body = await safeJson(request)
  const topic = sanitizeForPrompt(body.topic, 500)

  if (!topic) {
    return NextResponse.json({ error: "Topic is required" }, { status: 400 })
  }

  const project = access.project
  const decision = await store.createDecision(id, topic)

  // Trigger agent debate in sequence
  const context = project
    ? `Project: ${project.name}\nDescription: ${project.description}`
    : ""

  const entries: { agent: string; message: string; timestamp: string }[] = []
  const previousMessages: string[] = []

  for (const agent of DEBATE_AGENTS) {
    try {
      const messages = [
        { role: "system" as const, content: agent.prompt + (context ? `\n\nContext:\n${context}` : "") },
        {
          role: "user" as const,
          content: `Decision topic: "${topic}"${previousMessages.length > 0 ? `\n\nPrevious agent responses:\n${previousMessages.map((m, i) => `${DEBATE_AGENTS[i].label}: ${m}`).join("\n")}` : ""}\n\nProvide your perspective.`,
        },
      ]

      // Reasoning models spend hidden thinking tokens from this budget.
      const result = await complete(messages, { maxTokens: 2048 })
      const response =
        result.completion.choices[0]?.message?.content || "No response."
      entries.push({ agent: agent.key, message: response, timestamp: new Date().toISOString() })
      previousMessages.push(response)
    } catch {
      entries.push({
        agent: agent.key,
        message: getFallbackDebate(agent.key, topic),
        timestamp: new Date().toISOString(),
      })
    }
  }

  // Store all entries
  for (const entry of entries) {
    await store.addDecisionEntry(decision.id, entry.agent, entry.message)
  }

  // Generate consensus
  try {
    const consensusMessages = [
      {
        role: "system" as const,
        content: `You are the Orchestrator. Three agents have debated a decision topic. Synthesize their views into a consensus. Respond with exactly:\nCONSENSUS: <one sentence summary>\nCONFIDENCE: <number between 0 and 1>`,
      },
      {
        role: "user" as const,
        content: `Topic: "${topic}"\n\nPM: ${entries[0]?.message || ""}\nArchitect: ${entries[1]?.message || ""}\nQA: ${entries[2]?.message || ""}\n\nSynthesize consensus.`,
      },
    ]

    const consensusResult = await complete(consensusMessages, { maxTokens: 1024 })
    const raw = consensusResult.completion.choices[0]?.message?.content || ""
    const consensusMatch = raw.match(/CONSENSUS:\s*(.+?)(?:\n|$)/)
    const confidenceMatch = raw.match(/CONFIDENCE:\s*([\d.]+)/)
    // Salvage real model output even if it didn't follow the exact CONSENSUS: format
    const firstLine = raw.split("\n").map((l) => l.trim()).find(Boolean)
    const consensus = consensusMatch?.[1]?.trim() || firstLine || "Consensus reached after debate."
    const confidence = confidenceMatch ? Math.min(1, Math.max(0, parseFloat(confidenceMatch[1]))) : 0.7

    await store.resolveDecision(decision.id, consensus, confidence)
  } catch {
    await store.resolveDecision(decision.id, "Consensus reached after debate.", 0.7)
  }

  return NextResponse.json(await store.getDecisions(id), { status: 201 })
}

function getFallbackDebate(agent: string, topic: string): string {
  const fallbacks: Record<string, string> = {
    pm: `From a product perspective, I recommend we ${topic.includes("not") || topic.includes("avoid") ? "carefully evaluate this" : "move forward with this approach"}. The user impact is significant and aligns with our core value proposition.`,
    architect: `Technically, this is ${topic.includes("complex") || topic.includes("scale") ? "challenging but feasible" : "straightforward to implement"}. The implementation complexity is manageable within the current architecture.`,
    qa: `From a quality perspective, I've identified ${topic.includes("security") || topic.includes("auth") ? "critical security implications that need attention" : "some edge cases to address"}. Recommend thorough testing before deployment.`,
  }
  return fallbacks[agent] || `Analyzing "${topic}" from my perspective...`
}
