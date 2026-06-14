/**
 * Rate limiting for expensive / abusable endpoints.
 *
 * Backend is pluggable:
 *   - Upstash Redis (distributed, correct across serverless instances) when
 *     UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set.
 *   - In-memory fixed-window fallback otherwise (per-instance; fine for dev and
 *     single-instance deploys, NOT a substitute for Redis at scale).
 *
 * `rateLimit` returns a ready-to-send 429 response when the caller is over the
 * limit, so routes do: `const r = await rateLimit(key, opts); if (!r.ok) return r.response`.
 */
import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"

export type RateLimitOptions = { limit: number; windowMs: number }
export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; response: NextResponse; retryAfterSec: number }

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL || ""
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || ""
const useUpstash = !!(upstashUrl && upstashToken)

// --- In-memory fixed-window store (per instance) ---------------------------
const _g = globalThis as unknown as { __forgeRL?: Map<string, { count: number; resetAt: number }> }
const buckets = (_g.__forgeRL ??= new Map())

function checkMemory(key: string, opts: RateLimitOptions): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs })
    return { allowed: true, remaining: opts.limit - 1, retryAfterSec: 0 }
  }
  b.count++
  if (b.count > opts.limit) {
    return { allowed: false, remaining: 0, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) }
  }
  return { allowed: true, remaining: opts.limit - b.count, retryAfterSec: 0 }
}

// --- Upstash REST fixed-window (INCR + EXPIRE) -----------------------------
async function checkUpstash(key: string, opts: RateLimitOptions): Promise<{ allowed: boolean; remaining: number; retryAfterSec: number }> {
  const windowSec = Math.ceil(opts.windowMs / 1000)
  const redisKey = `rl:${key}:${Math.floor(Date.now() / opts.windowMs)}`
  try {
    // Pipeline INCR then EXPIRE so the window key self-cleans.
    const res = await fetch(`${upstashUrl}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${upstashToken}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, windowSec],
      ]),
    })
    if (!res.ok) throw new Error(`upstash ${res.status}`)
    const data = (await res.json()) as { result: unknown }[]
    const count = Number(data[0]?.result ?? 0)
    const allowed = count <= opts.limit
    return { allowed, remaining: Math.max(0, opts.limit - count), retryAfterSec: allowed ? 0 : windowSec }
  } catch (err) {
    // Fail open on limiter outage rather than taking the app down, but record it.
    logger.warn("ratelimit.upstash_failed", { error: err instanceof Error ? err.message : String(err) })
    return { allowed: true, remaining: opts.limit, retryAfterSec: 0 }
  }
}

/**
 * Low-level check returning a boolean — for non-HTTP contexts (e.g. the auth
 * `authorize` callback) where there is no Response to return.
 */
export async function rateLimitAllowed(key: string, opts: RateLimitOptions): Promise<boolean> {
  const r = useUpstash ? await checkUpstash(key, opts) : checkMemory(key, opts)
  if (!r.allowed) logger.warn("ratelimit.exceeded", { key, limit: opts.limit })
  return r.allowed
}

/** Enforce a rate limit for `key`. Caller short-circuits on `!ok`. */
export async function rateLimit(key: string, opts: RateLimitOptions): Promise<RateLimitResult> {
  const r = useUpstash ? await checkUpstash(key, opts) : checkMemory(key, opts)
  if (r.allowed) return { ok: true, remaining: r.remaining }

  logger.warn("ratelimit.exceeded", { key, limit: opts.limit })
  const response = NextResponse.json(
    { error: "Too many requests. Please slow down." },
    {
      status: 429,
      headers: {
        "Retry-After": String(r.retryAfterSec),
        "X-RateLimit-Limit": String(opts.limit),
        "X-RateLimit-Remaining": "0",
      },
    }
  )
  return { ok: false, response, retryAfterSec: r.retryAfterSec }
}
