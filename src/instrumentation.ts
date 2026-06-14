/**
 * Next.js instrumentation hook — runs once when the server process starts.
 * Validates the environment so misconfiguration fails the boot, not a request.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("@/lib/env")
    validateEnv()
  }
}
