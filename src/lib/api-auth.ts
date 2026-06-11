import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { store, type StoredProject } from "@/lib/store"

/**
 * Returns the authenticated user's id (UUID from the users table),
 * or null when there is no valid session.
 */
export async function getUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }

type ProjectAuthResult =
  | { ok: true; userId: string; project: StoredProject }
  | { ok: false; response: NextResponse }

/** Require a signed-in user. */
export async function requireUser(): Promise<AuthResult> {
  const userId = await getUserId()
  if (!userId) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  return { ok: true, userId }
}

/**
 * Require a signed-in user who owns the given project.
 * Returns 401 when unauthenticated, 404 when the project does not exist or is
 * owned by another user (no existence leak across tenants).
 */
export async function requireProjectAccess(id: string): Promise<ProjectAuthResult> {
  const userId = await getUserId()
  if (!userId) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  const project = await store.getProject(id)
  if (!project || project.userId !== userId) {
    return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) }
  }
  return { ok: true, userId, project }
}
