/**
 * Environment validation — fail fast at boot in production instead of failing
 * mysteriously per-request later. Imported by instrumentation so it runs once
 * on server startup.
 *
 * Rules only enforced when NODE_ENV === "production":
 *  - Supabase Auth must be configured (NEXT_PUBLIC_SUPABASE_URL + anon key).
 *  - A secrets key must exist (SECRETS_KEY or AUTH_SECRET) so integration tokens
 *    are encrypted at rest.
 *  - If STORE_DRIVER=postgres, DATABASE_URL must be present.
 *  - Demo login is dev-only; it is force-disabled in production by the auth
 *    code, so flags left enabled here only produce a warning.
 */
import { logger } from "@/lib/logger"

export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === "production"
  const errors: string[] = []
  const warnings: string[] = []

  if (isProd) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      errors.push("NEXT_PUBLIC_SUPABASE_URL is required in production")
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is required in production")
    }
    if (!process.env.SECRETS_KEY && !process.env.AUTH_SECRET) {
      errors.push("SECRETS_KEY (or AUTH_SECRET) is required to encrypt integration tokens")
    }
    if (process.env.STORE_DRIVER === "postgres" && !process.env.DATABASE_URL) {
      errors.push("DATABASE_URL is required when STORE_DRIVER=postgres")
    }
    const isDemoEnabled =
      process.env.ALLOW_DEMO_LOGIN === "true" ||
      process.env.NEXT_PUBLIC_ALLOW_DEMO_LOGIN === "true"
    if (isDemoEnabled) {
      warnings.push("Demo login is enabled in production — the shared demo account is accessible")
    }
    if (!process.env.UPSTASH_REDIS_REST_URL) {
      warnings.push("No Upstash Redis configured — rate limiting falls back to per-instance memory")
    }
    if (!process.env.SENTRY_DSN) {
      warnings.push("No SENTRY_DSN configured — exception monitoring is disabled")
    }
  }

  for (const w of warnings) logger.warn("env.warning", { detail: w })

  if (errors.length > 0) {
    for (const e of errors) logger.error("env.invalid", undefined, { detail: e })
    throw new Error(`Invalid environment:\n - ${errors.join("\n - ")}`)
  }
}
