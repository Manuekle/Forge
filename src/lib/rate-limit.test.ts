import { describe, it, expect } from "vitest"
import { rateLimitAllowed, rateLimit } from "./rate-limit"

describe("rate-limit (in-memory fallback)", () => {
  it("allows up to the limit then blocks", async () => {
    const key = `test:${Math.random()}`
    const opts = { limit: 3, windowMs: 60_000 }
    expect(await rateLimitAllowed(key, opts)).toBe(true)
    expect(await rateLimitAllowed(key, opts)).toBe(true)
    expect(await rateLimitAllowed(key, opts)).toBe(true)
    expect(await rateLimitAllowed(key, opts)).toBe(false)
  })

  it("isolates different keys", async () => {
    const a = `a:${Math.random()}`
    const b = `b:${Math.random()}`
    expect(await rateLimitAllowed(a, { limit: 1, windowMs: 60_000 })).toBe(true)
    expect(await rateLimitAllowed(a, { limit: 1, windowMs: 60_000 })).toBe(false)
    expect(await rateLimitAllowed(b, { limit: 1, windowMs: 60_000 })).toBe(true)
  })

  it("resets after the window elapses", async () => {
    const key = `win:${Math.random()}`
    expect(await rateLimitAllowed(key, { limit: 1, windowMs: 1 })).toBe(true)
    await new Promise((r) => setTimeout(r, 5))
    expect(await rateLimitAllowed(key, { limit: 1, windowMs: 1 })).toBe(true)
  })

  it("returns a 429 response with Retry-After when over the limit", async () => {
    const key = `http:${Math.random()}`
    await rateLimit(key, { limit: 1, windowMs: 60_000 })
    const blocked = await rateLimit(key, { limit: 1, windowMs: 60_000 })
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) {
      expect(blocked.response.status).toBe(429)
      expect(blocked.response.headers.get("Retry-After")).toBeTruthy()
    }
  })
})
