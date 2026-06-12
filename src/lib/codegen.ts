const rawEndpoint =
  process.env.CODEGEN_AZURE_ENDPOINT || "https://meerazo7-8610-resource.openai.azure.com/openai/v1"
const apiKey = process.env.CODEGEN_AZURE_API_KEY || ""
const deployment = process.env.CODEGEN_AZURE_DEPLOYMENT || "gpt-4.1"
const TIMEOUT_MS = Number(process.env.CODEGEN_TIMEOUT_MS) || 240000

export const codegenConfigured = !!apiKey

export type GeneratedFile = { path: string; content: string }

class CodegenError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = "CodegenError"
  }
}

function chatUrl(): string {
  const base = rawEndpoint.replace(/\/+$/, "").replace(/\/openai\/v1$/, "").replace(/\/v1$/, "")
  return `${base}/openai/v1/chat/completions`
}

async function complete(messages: { role: "system" | "user" | "assistant"; content: string }[], maxTokens = 16000): Promise<string> {
  if (!apiKey) {
    throw new CodegenError("Code agent is not configured. Set CODEGEN_AZURE_API_KEY in the environment.", 503)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const payload = JSON.stringify({
      model: deployment,
      messages,
      max_tokens: maxTokens,
      temperature: 0.2,
      response_format: { type: "json_object" },
    })

    let response = await fetch(chatUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: payload,
      signal: controller.signal,
    })
    if (response.status === 401 || response.status === 403) {
      response = await fetch(chatUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: payload,
        signal: controller.signal,
      })
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      throw new CodegenError(`Code model error: ${response.status} ${response.statusText} — ${text.slice(0, 300)}`, response.status)
    }

    const completion = await response.json()
    return completion.choices?.[0]?.message?.content ?? ""
  } finally {
    clearTimeout(timeout)
  }
}

function parseFiles(raw: string): GeneratedFile[] {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "")
  const data = JSON.parse(cleaned)
  const files = Array.isArray(data) ? data : data.files
  if (!Array.isArray(files)) throw new CodegenError("Model returned no files array", 502)
  return files
    .filter((f): f is GeneratedFile => typeof f?.path === "string" && typeof f?.content === "string")
    .map((f) => ({ path: f.path.replace(/^\/+/, "").replace(/\.\./g, ""), content: f.content }))
    .filter((f) => f.path.length > 0 && f.path.length < 200)
    .slice(0, 40)
}

const CODE_AGENT_SYSTEM = `You are the Engineer agent on Forge, a multi-agent AI product team. The team has finished planning — PRD, architecture, UX, and backlog are approved. Your job: generate the initial production-quality codebase scaffold for the app.

Rules:
- Follow the tech stack from the Architecture document. If none is specified, use Next.js 15 + TypeScript + Tailwind CSS.
- Generate a coherent, runnable MVP scaffold: package.json, config files, core pages/routes, key components, data models, and a README with setup instructions.
- 12 to 20 files. Prioritize the features marked as MVP/Sprint 1 in the backlog.
- Every file must be complete and syntactically valid — no placeholders like "// rest of the code", no truncated files.
- Keep each file focused; prefer more small files over giant ones.
- No lockfiles, no binary files, no .env with real secrets (use .env.example).

Respond with ONLY a JSON object in this exact shape:
{"files": [{"path": "relative/path/from/repo/root.ext", "content": "full file content"}]}`

export async function generateAppFiles(input: {
  projectName: string
  projectDescription: string
  artifacts: { type: string; title: string; content: string }[]
  tasks: { title: string; description: string; priority: string; status: string }[]
}): Promise<GeneratedFile[]> {
  const context = [
    `# Project: ${input.projectName}`,
    input.projectDescription,
    ...input.artifacts.map((a) => `\n## ${a.type.toUpperCase()} — ${a.title}\n${a.content.slice(0, 12000)}`),
    input.tasks.length > 0
      ? `\n## Backlog tasks\n${input.tasks.map((t) => `- [${t.priority}/${t.status}] ${t.title}: ${t.description}`).join("\n")}`
      : "",
  ].join("\n")

  const raw = await complete([
    { role: "system", content: CODE_AGENT_SYSTEM },
    { role: "user", content: `${context}\n\nGenerate the codebase scaffold now.` },
  ])
  return parseFiles(raw)
}

export { CodegenError }
