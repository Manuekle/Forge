/**
 * Credential-user data access. Kept separate from auth.config so it is only
 * ever imported in the Node.js runtime (it pulls in node:crypto via password.ts
 * and the Postgres client) — never into the edge middleware bundle.
 */
import { getDb, schema } from "@/db"
import { eq } from "drizzle-orm"
import { hashPassword, verifyPassword } from "@/lib/password"
import { rateLimitAllowed } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

export type AuthedUser = { id: string; name: string | null; email: string; image: string | null }

/** Look up a user by email and verify their password. Null on any mismatch. */
export async function verifyCredentials(email: string, password: string): Promise<AuthedUser | null> {
  const normalized = email.trim().toLowerCase()

  // Throttle credential stuffing: 10 attempts / 15 min per email.
  if (!(await rateLimitAllowed(`login:${normalized}`, { limit: 10, windowMs: 15 * 60_000 }))) {
    logger.warn("auth.login_throttled", { email: normalized })
    return null
  }
  const [user] = await getDb().select().from(schema.users).where(eq(schema.users.email, normalized)).limit(1)
  if (!user) {
    // Run a dummy verify to keep timing uniform (mitigate user enumeration).
    await verifyPassword(password, "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA")
    return null
  }
  if (!(await verifyPassword(password, user.passwordHash))) return null
  return { id: user.id, name: user.name, email: user.email, image: user.image }
}

/** Create a credential user. Throws if the email is already registered. */
export async function createCredentialUser(input: { email: string; password: string; name?: string | null }): Promise<AuthedUser> {
  const email = input.email.trim().toLowerCase()
  const db = getDb()
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1)
  if (existing) throw new Error("EMAIL_TAKEN")
  const passwordHash = await hashPassword(input.password)
  const [created] = await db
    .insert(schema.users)
    .values({ email, name: input.name ?? null, passwordHash, emailVerified: null })
    .returning()
  return { id: created.id, name: created.name, email: created.email, image: created.image }
}
