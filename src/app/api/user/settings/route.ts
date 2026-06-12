import { NextResponse } from "next/server"
import { store } from "@/lib/store"
import { requireUser } from "@/lib/api-auth"
import { safeJson } from "@/lib/guard"

async function settingsPayload(userId: string) {
  const [githubToken, jiraConfig, linearToken] = await Promise.all([
    store.getUserGithubToken(userId),
    store.getUserJiraConfig(userId),
    store.getUserLinearToken(userId),
  ])
  return {
    githubToken,
    jiraDomain: jiraConfig?.domain ?? null,
    jiraEmail: jiraConfig?.email ?? null,
    jiraToken: jiraConfig?.token ?? null,
    linearToken,
  }
}

export async function GET() {
  const access = await requireUser()
  if (!access.ok) return access.response

  return NextResponse.json(await settingsPayload(access.userId))
}

export async function PATCH(request: Request) {
  const access = await requireUser()
  if (!access.ok) return access.response

  const body = await safeJson(request)
  if (typeof body.githubToken === "string" || body.githubToken === null) {
    await store.setUserGithubToken(access.userId, body.githubToken || null)
  }
  if ("jiraDomain" in body || "jiraEmail" in body || "jiraToken" in body) {
    const domain = typeof body.jiraDomain === "string" ? body.jiraDomain.trim() : ""
    const email = typeof body.jiraEmail === "string" ? body.jiraEmail.trim() : ""
    const token = typeof body.jiraToken === "string" ? body.jiraToken.trim() : ""
    await store.setUserJiraConfig(access.userId, domain && email && token ? { domain, email, token } : null)
  }
  if (typeof body.linearToken === "string" || body.linearToken === null) {
    await store.setUserLinearToken(access.userId, body.linearToken || null)
  }

  return NextResponse.json(await settingsPayload(access.userId))
}
