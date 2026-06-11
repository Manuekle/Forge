/**
 * Foundry IQ — grounded retrieval layer.
 *
 * Implements the Azure AI Foundry "agentic retrieval" pattern: given a query,
 * retrieve the most relevant passages from a knowledge base and return them
 * WITH citation metadata, so downstream agent answers can be grounded and
 * every claim links back to a source.
 *
 * Backend is pluggable:
 *   - Azure AI Search (a Foundry IQ knowledge index) when AZURE_SEARCH_* is set.
 *   - A bundled local knowledge corpus otherwise (zero-config demo).
 *
 * Either path returns the same shape, so the orchestrator is backend-agnostic.
 */

export type KnowledgeDoc = {
  id: string
  title: string
  source: string
  domain: string
  content: string
}

export type Citation = {
  ref: string // e.g. "S1"
  id: string
  title: string
  source: string
  score: number
  snippet: string
}

export type RetrievalResult = {
  backend: "azure-ai-search" | "local-corpus"
  citations: Citation[]
  /** Grounding block to inject into an agent prompt, with [S1]…[Sn] markers. */
  groundingBlock: string
}

const searchEndpoint = process.env.AZURE_SEARCH_ENDPOINT || ""
const searchKey = process.env.AZURE_SEARCH_KEY || ""
const searchIndex = process.env.AZURE_SEARCH_INDEX || ""

// --- Bundled knowledge corpus (real, discrete, citable sources) -------------

const CORPUS: KnowledgeDoc[] = [
  {
    id: "mkt-trust",
    title: "Marketplace Trust & Safety",
    source: "Forge KB / Marketplaces",
    domain: "marketplace",
    content:
      "Trust and safety is the number one reason marketplace transactions fail. Identity verification and escrow materially reduce fraud. Rating systems must be double-blind to prevent retaliation bias. Onboarding friction should be asymmetric: buyers need one-click, sellers need verification.",
  },
  {
    id: "mkt-liquidity",
    title: "Marketplace Liquidity & Pricing",
    source: "Forge KB / Marketplaces",
    domain: "marketplace",
    content:
      "Liquidity is the hardest marketplace problem: you need supply and demand simultaneously in the same segment. Commission models of 10-20 percent work for high-ticket items; subscriptions fit high-frequency, low-ticket usage. Stripe Connect and Adyen are the standard payment rails for marketplaces and handle KYC and payout splitting.",
  },
  {
    id: "saas-plg",
    title: "SaaS Self-Serve & PLG",
    source: "Forge KB / B2B SaaS",
    domain: "saas",
    content:
      "Self-serve onboarding with a free tier converts three to five times better than demo-only funnels. Product-led self-serve closes in zero to seven days; enterprise sales cycles run three to six months. API-first design enables integrations that reduce churn.",
  },
  {
    id: "saas-enterprise",
    title: "SaaS Enterprise Readiness",
    source: "Forge KB / B2B SaaS",
    domain: "saas",
    content:
      "SOC 2 compliance is table stakes for enterprise deals above 50k ACV. Multi-tenant architecture is the standard; single-tenant is sold as a premium isolation feature. Usage-based pricing aligns cost with value but creates unpredictable revenue that finance teams dislike.",
  },
  {
    id: "ai-orchestration",
    title: "AI Agent Orchestration",
    source: "Forge KB / AI-Native Products",
    domain: "ai-workspace",
    content:
      "Agent orchestration requires structured context passing between specialized models. Use smaller models for classification and larger models for generation to manage cost. Latency under two seconds for an agent response is critical for user trust.",
  },
  {
    id: "ai-grounding",
    title: "AI Grounding & Traceability",
    source: "Forge KB / AI-Native Products",
    domain: "ai-workspace",
    content:
      "Traceability is not optional: every AI decision must link back to source evidence. Ground every claim in retrieved context, never on the prompt alone, to mitigate hallucination. Confidence scoring should be calibrated per agent and per domain rather than assumed.",
  },
  {
    id: "gen-discovery",
    title: "Product Discovery Fundamentals",
    source: "Forge KB / Product",
    domain: "general",
    content:
      "Validate the core value proposition with a focused MVP before scaling scope. Define activation as the first moment a user reaches value, and measure time-to-value. Prioritize ruthlessly: ship the smallest slice that proves or kills the riskiest assumption.",
  },
  {
    id: "gen-security",
    title: "Application Security Baseline",
    source: "Forge KB / Engineering",
    domain: "general",
    content:
      "Authenticate and authorize every API route; never rely on the client. Enforce ownership checks so a user can only read or mutate their own resources. Rate-limit expensive endpoints and validate and bound all untrusted input before it reaches a model or database.",
  },
]

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "for", "to", "of", "in", "on", "with", "is",
  "are", "be", "this", "that", "it", "as", "by", "at", "from", "we", "you",
  "your", "our", "app", "platform", "product", "build", "building", "users",
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t))
}

function snippet(content: string, terms: Set<string>): string {
  const sentences = content.split(/(?<=\.)\s+/)
  const best = sentences
    .map((s) => ({ s, score: tokenize(s).filter((t) => terms.has(t)).length }))
    .sort((a, b) => b.score - a.score)[0]
  return (best?.s || sentences[0] || content).trim()
}

// --- Local lexical retrieval (term-overlap scoring over the corpus) ----------

function retrieveLocal(query: string, domain: string | null, topK: number): RetrievalResult {
  const terms = new Set(tokenize(query))
  const scored = CORPUS.map((doc) => {
    const docTerms = tokenize(doc.title + " " + doc.content)
    let overlap = 0
    for (const t of docTerms) if (terms.has(t)) overlap++
    // Boost documents whose domain matches the project template.
    const domainBoost = domain && doc.domain === domain ? 4 : 0
    // Always keep general security/discovery in the candidate pool with a floor.
    const floor = doc.domain === "general" ? 0.5 : 0
    return { doc, score: overlap + domainBoost + floor }
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  const citations: Citation[] = scored.map((x, i) => ({
    ref: `S${i + 1}`,
    id: x.doc.id,
    title: x.doc.title,
    source: x.doc.source,
    score: Number(x.score.toFixed(2)),
    snippet: snippet(x.doc.content, terms),
  }))

  return { backend: "local-corpus", citations, groundingBlock: buildGroundingBlock(citations, scored.map((x) => x.doc)) }
}

function buildGroundingBlock(citations: Citation[], docs: KnowledgeDoc[]): string {
  if (citations.length === 0) return ""
  const lines = citations.map((c, i) => `[${c.ref}] ${c.title} — ${docs[i]?.content || c.snippet}`)
  return `## Retrieved Knowledge (cite with [S1]…[S${citations.length}])\n${lines.join("\n")}`
}

// --- Azure AI Search (Foundry IQ knowledge index) ---------------------------

async function retrieveAzureSearch(query: string, topK: number, signal?: AbortSignal): Promise<RetrievalResult | null> {
  if (!searchEndpoint || !searchKey || !searchIndex) return null
  try {
    const url = `${searchEndpoint.replace(/\/+$/, "")}/indexes/${searchIndex}/docs/search?api-version=2024-07-01`
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": searchKey },
      body: JSON.stringify({ search: query, top: topK, queryType: "simple" }),
      signal,
    })
    if (!res.ok) return null
    const data = (await res.json()) as { value?: Record<string, unknown>[] }
    const rows = data.value || []
    if (rows.length === 0) return null

    const citations: Citation[] = rows.map((r, i) => {
      const content = String(r.content ?? r.text ?? r.chunk ?? "")
      return {
        ref: `S${i + 1}`,
        id: String(r.id ?? r.key ?? `doc-${i}`),
        title: String(r.title ?? r.name ?? `Source ${i + 1}`),
        source: String(r.source ?? "Azure AI Search"),
        score: Number(((r["@search.score"] as number) ?? 0).toFixed(2)),
        snippet: content.slice(0, 240),
      }
    })
    const docs: KnowledgeDoc[] = rows.map((r, i) => ({
      id: citations[i].id,
      title: citations[i].title,
      source: citations[i].source,
      domain: "azure",
      content: String(r.content ?? r.text ?? r.chunk ?? citations[i].snippet),
    }))
    return { backend: "azure-ai-search", citations, groundingBlock: buildGroundingBlock(citations, docs) }
  } catch {
    return null
  }
}

/**
 * Retrieve grounded knowledge for a query. Prefers an Azure AI Search Foundry
 * index when configured; otherwise falls back to the bundled local corpus.
 */
export async function retrieveKnowledge(
  query: string,
  opts?: { domain?: string | null; topK?: number; signal?: AbortSignal }
): Promise<RetrievalResult> {
  const topK = opts?.topK ?? 4
  const azure = await retrieveAzureSearch(query, topK, opts?.signal)
  if (azure) return azure
  return retrieveLocal(query, opts?.domain ?? null, topK)
}
