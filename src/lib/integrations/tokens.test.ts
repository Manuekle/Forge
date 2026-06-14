import { describe, it, expect } from "vitest"
import { getIntegrationStatus, applyTokenPatch, isDemoEmail } from "./tokens"

// Uses the default in-memory store backend (no DATABASE_URL needed).
const uid = () => `user-${Math.random().toString(36).slice(2)}`

describe("integration token masking", () => {
  it("never exposes raw secrets — only connection status", async () => {
    const userId = uid()
    await applyTokenPatch(userId, "real@user.com", {
      githubToken: "ghp_secretvalue",
      linearToken: "lin_secretvalue",
      jiraDomain: "acme",
      jiraEmail: "ops@acme.com",
      jiraToken: "jira_secret",
    })

    const status = await getIntegrationStatus(userId)
    const serialized = JSON.stringify(status)

    expect(status.github.connected).toBe(true)
    expect(status.jira.connected).toBe(true)
    expect(status.linear.connected).toBe(true)
    // Non-secret config is allowed through; secrets must never be.
    expect(status.jira.domain).toBe("acme")
    expect(serialized).not.toContain("ghp_secretvalue")
    expect(serialized).not.toContain("lin_secretvalue")
    expect(serialized).not.toContain("jira_secret")
  })

  it("reports disconnected integrations as false", async () => {
    const status = await getIntegrationStatus(uid())
    expect(status.github.connected).toBe(false)
    expect(status.jira.connected).toBe(false)
    expect(status.linear.connected).toBe(false)
  })

  it("blocks demo users from setting a GitHub token", async () => {
    const userId = uid()
    await applyTokenPatch(userId, "demo@forge.dev", { githubToken: "ghp_demo" })
    expect((await getIntegrationStatus(userId)).github.connected).toBe(false)
  })

  it("clears jira config when fields are incomplete", async () => {
    const userId = uid()
    await applyTokenPatch(userId, "real@user.com", { jiraDomain: "acme", jiraEmail: "", jiraToken: "" })
    expect((await getIntegrationStatus(userId)).jira.connected).toBe(false)
  })

  it("identifies the demo email", () => {
    expect(isDemoEmail("demo@forge.dev")).toBe(true)
    expect(isDemoEmail("someone@else.com")).toBe(false)
    expect(isDemoEmail(null)).toBe(false)
  })
})
