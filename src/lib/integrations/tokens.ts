/**
 * Integration-token service.
 *
 * Single source of truth for reading/writing a user's third-party credentials
 * (GitHub, Jira, Linear) and — critically — for deciding what is safe to send
 * to the client. Secrets are NEVER returned to the frontend: callers get a
 * masked "connection status" view (booleans + non-secret metadata only).
 *
 * Extracted from the settings route so the masking rule lives in exactly one
 * place and cannot be accidentally bypassed by a future endpoint.
 */
import { store } from "@/lib/store"

/** What the client is allowed to see: connection booleans + non-secret config. */
export type IntegrationStatus = {
  github: { connected: boolean }
  jira: { connected: boolean; domain: string | null; email: string | null }
  linear: { connected: boolean }
}

/** The demo account can never bind real third-party credentials. */
export function isDemoEmail(email: string | null | undefined): boolean {
  return email === "demo@forge.dev"
}

/** Build the masked, client-safe status. Reads tokens only to test presence. */
export async function getIntegrationStatus(userId: string): Promise<IntegrationStatus> {
  const [github, jira, linear] = await Promise.all([
    store.getUserGithubToken(userId),
    store.getUserJiraConfig(userId),
    store.getUserLinearToken(userId),
  ])
  return {
    github: { connected: !!github },
    jira: { connected: !!jira, domain: jira?.domain ?? null, email: jira?.email ?? null },
    linear: { connected: !!linear },
  }
}

type TokenPatch = {
  githubToken?: string | null
  jiraDomain?: unknown
  jiraEmail?: unknown
  jiraToken?: unknown
  linearToken?: unknown
}

/**
 * Apply a partial credential update. Demo users may not set GitHub tokens.
 * Returns the new masked status. Each field is independently optional so the
 * settings form can patch one integration at a time.
 */
export async function applyTokenPatch(
  userId: string,
  email: string | null,
  body: TokenPatch
): Promise<IntegrationStatus> {
  const demo = isDemoEmail(email)

  if (("githubToken" in body) && !demo) {
    await store.setUserGithubToken(userId, asTokenOrNull(body.githubToken))
  }

  if ("jiraDomain" in body || "jiraEmail" in body || "jiraToken" in body) {
    const domain = asTrimmed(body.jiraDomain)
    const email = asTrimmed(body.jiraEmail)
    const token = asTrimmed(body.jiraToken)
    await store.setUserJiraConfig(userId, domain && email && token ? { domain, email, token } : null)
  }

  if ("linearToken" in body) {
    await store.setUserLinearToken(userId, asTokenOrNull(body.linearToken))
  }

  return getIntegrationStatus(userId)
}

const asTrimmed = (v: unknown): string => (typeof v === "string" ? v.trim() : "")
const asTokenOrNull = (v: unknown): string | null => {
  const t = asTrimmed(v)
  return t.length > 0 ? t : null
}
