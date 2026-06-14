/**
 * Structured logger. Emits single-line JSON so logs are queryable in any
 * aggregator (Datadog, CloudWatch, Vercel, Loki) instead of free-text console
 * spew. Errors are additionally forwarded to the monitoring sink (Sentry).
 *
 * Never log secrets: pass identifiers (userId, runId), not tokens or payloads.
 */
import { captureException } from "@/lib/monitoring"

type Level = "debug" | "info" | "warn" | "error"
type Fields = Record<string, unknown>

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }
const MIN_LEVEL: number = LEVEL_ORDER[(process.env.LOG_LEVEL as Level) || "info"] ?? 20

function emit(level: Level, msg: string, fields?: Fields) {
  if (LEVEL_ORDER[level] < MIN_LEVEL) return
  const line = JSON.stringify({ level, msg, t: new Date().toISOString(), ...fields })
  if (level === "error") console.error(line)
  else if (level === "warn") console.warn(line)
  else console.log(line)
}

export const logger = {
  debug: (msg: string, fields?: Fields) => emit("debug", msg, fields),
  info: (msg: string, fields?: Fields) => emit("info", msg, fields),
  warn: (msg: string, fields?: Fields) => emit("warn", msg, fields),
  /** Log an error and forward it to monitoring. `err` may be any thrown value. */
  error: (msg: string, err?: unknown, fields?: Fields) => {
    const detail = err instanceof Error ? { error: err.message, stack: err.stack } : err != null ? { error: String(err) } : {}
    emit("error", msg, { ...detail, ...fields })
    if (err !== undefined) captureException(err, { msg, ...fields })
  },
}
