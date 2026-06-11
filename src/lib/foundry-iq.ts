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

// Azure AI Foundry endpoint hosting the model deployment. Accepts either the
// bare resource URL (…/services.ai.azure.com) or one already ending in
// /openai/v1 — both are normalized to the OpenAI-compatible v1 path.
const rawEndpoint = process.env.AZURE_OPENAI_ENDPOINT || process.env.FOUNDRY_IQ_ENDPOINT || ""
const apiKey = process.env.AZURE_OPENAI_API_KEY || process.env.FOUNDRY_IQ_API_KEY || ""
// Single reasoning model for the whole team (Grok on Azure AI Foundry).
const defaultDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || "grok-4-20-reasoning"
// Reasoning models are slow; default to 90s. Override with IQ_TIMEOUT_MS.
const COMPLETION_TIMEOUT_MS = Number(process.env.IQ_TIMEOUT_MS) || 180000

/** True once an endpoint + key are configured — lets us skip network calls. */
export const aiConfigured = !!(rawEndpoint && apiKey)

/** OpenAI-compatible v1 chat-completions URL for the Foundry endpoint. */
function chatUrl(): string {
  const base = rawEndpoint.replace(/\/+$/, "").replace(/\/openai\/v1$/, "").replace(/\/v1$/, "")
  return `${base}/openai/v1/chat/completions`
}

/** Reasoning models reject `temperature` and use `max_completion_tokens`. */
function isReasoningModel(deployment: string): boolean {
  return /reason|grok|^o\d/i.test(deployment)
}

export async function complete(
  messages: IqMessage[],
  options?: { deployment?: string; maxTokens?: number }
): Promise<IqResponse> {
  const deployment = options?.deployment || defaultDeployment
  const maxTokens = options?.maxTokens || 2048
  const reasoning = isReasoningModel(deployment)

  const body: Record<string, unknown> = { model: deployment, messages }
  if (reasoning) {
    body.max_completion_tokens = maxTokens
  } else {
    body.max_tokens = maxTokens
    body.temperature = 0.7
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), COMPLETION_TIMEOUT_MS)

  const url = chatUrl()
  const payload = JSON.stringify(body)
  async function send(authHeader: Record<string, string>) {
    // Transient socket/DNS failures ("fetch failed") happen under concurrent
    // load — retry the network layer up to twice with a short backoff.
    let lastErr: unknown
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: payload,
          signal: controller.signal,
        })
      } catch (err) {
        lastErr = err
        if (controller.signal.aborted) throw err
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
      }
    }
    throw lastErr
  }

  try {
    // Azure OpenAI models authenticate with `api-key`; Foundry model-as-a-service
    // (e.g. Grok) often wants `Authorization: Bearer`. Try the former, fall back.
    let response = await send({ "api-key": apiKey })
    if (response.status === 401 || response.status === 403) {
      response = await send({ Authorization: `Bearer ${apiKey}` })
    }

    // Rate limited: respect Retry-After (capped) and retry up to twice.
    for (let attempt = 0; response.status === 429 && attempt < 2; attempt++) {
      const retryAfter = Math.min(Number(response.headers.get("retry-after")) || 5, 30)
      await new Promise((r) => setTimeout(r, retryAfter * 1000))
      response = await send({ "api-key": apiKey })
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      throw new Error(`Foundry IQ error: ${response.status} ${response.statusText} — ${text}`)
    }

    const completion: IqCompletion = await response.json()

    const trace: IqTraceEntry[] = [
      { time: "[00:00.01]", action: "iq.intent.parse", detail: `${messages.length} messages` },
      { time: "[00:00.15]", action: `iq.deploy.${deployment}`, detail: `max_tokens=${maxTokens}` },
      { time: "[00:00.30]", action: "iq.complete", detail: `tokens=${completion.usage?.total_tokens || "?"}` },
    ]

    return { completion, trace }
  } finally {
    clearTimeout(timeout)
  }
}
