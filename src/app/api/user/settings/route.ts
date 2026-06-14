import { NextResponse } from "next/server"
import { requireUser } from "@/lib/api-auth"
import { safeJson } from "@/lib/guard"
import { applyTokenPatch, getIntegrationStatus } from "@/lib/integrations/tokens"
import { rateLimit } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

export async function GET() {
  const access = await requireUser()
  if (!access.ok) return access.response

  // Masked status only — integration secrets are never sent to the client.
  return NextResponse.json(await getIntegrationStatus(access.userId))
}

export async function PATCH(request: Request) {
  const access = await requireUser()
  if (!access.ok) return access.response

  const limited = await rateLimit(`settings:${access.userId}`, { limit: 20, windowMs: 60_000 })
  if (!limited.ok) return limited.response

  const body = await safeJson(request)
  const status = await applyTokenPatch(access.userId, access.email, body)
  logger.info("settings.update", { userId: access.userId })
  return NextResponse.json(status)
}
