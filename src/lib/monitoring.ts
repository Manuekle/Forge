/**
 * Monitoring sink. Forwards exceptions to Sentry when @sentry/nextjs is
 * installed and SENTRY_DSN is set; otherwise a no-op. The dynamic import keeps
 * Sentry an optional dependency — the app builds and runs without it, and turns
 * monitoring on simply by installing the package and setting the DSN.
 *
 * To enable:
 *   npm i @sentry/nextjs && set SENTRY_DSN=...
 */
type SentryLike = {
  init: (opts: Record<string, unknown>) => void
  captureException: (e: unknown, ctx?: unknown) => void
  captureMessage: (m: string, ctx?: unknown) => void
}

let sentry: SentryLike | null = null
let initialized = false

async function ensureSentry(): Promise<SentryLike | null> {
  if (initialized) return sentry
  initialized = true
  if (!process.env.SENTRY_DSN) return null
  try {
    // Optional dependency — resolved at runtime only when present. The indirect
    // specifier keeps TypeScript/bundlers from requiring it at build time.
    const pkg = "@sentry/nextjs"
    const mod = (await import(/* webpackIgnore: true */ pkg)) as unknown as SentryLike
    mod.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,
    })
    sentry = mod
  } catch {
    sentry = null
  }
  return sentry
}

/** Report an exception to the monitoring backend (best-effort, never throws). */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  void ensureSentry().then((s) => s?.captureException(error, context ? { extra: context } : undefined)).catch(() => {})
}

/** Report a message-level event (best-effort, never throws). */
export function captureMessage(message: string, context?: Record<string, unknown>): void {
  void ensureSentry().then((s) => s?.captureMessage(message, context ? { extra: context } : undefined)).catch(() => {})
}
