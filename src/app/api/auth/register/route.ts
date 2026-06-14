import { NextResponse } from "next/server"
import { safeJson } from "@/lib/guard"
import { rateLimit } from "@/lib/rate-limit"
import { createCredentialUser } from "@/lib/auth-users"
import { validatePasswordStrength } from "@/lib/password"
import { dbEnabled } from "@/db"
import { logger } from "@/lib/logger"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for")
  return fwd?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"
}

export async function POST(request: Request) {
  // Credential signup requires the persistent backend.
  if (!dbEnabled) {
    return NextResponse.json({ error: "Registration is not available in this environment" }, { status: 503 })
  }

  // Throttle by IP to blunt mass account creation / enumeration.
  const limited = await rateLimit(`register:${clientIp(request)}`, { limit: 5, windowMs: 60 * 60_000 })
  if (!limited.ok) return limited.response

  const body = await safeJson(request)
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const password = typeof body.password === "string" ? body.password : ""
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : null

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 })
  }
  const pwError = validatePasswordStrength(password)
  if (pwError) {
    return NextResponse.json({ error: pwError }, { status: 400 })
  }

  try {
    const user = await createCredentialUser({ email, password, name })
    logger.info("auth.register", { userId: user.id })
    // Do not return any secret material; the client signs in separately.
    return NextResponse.json({ ok: true, email: user.email }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_TAKEN") {
      // Generic message — do not confirm which emails are registered.
      return NextResponse.json({ error: "Could not create account with those details" }, { status: 409 })
    }
    logger.error("auth.register_failed", err)
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}
