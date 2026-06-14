import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { store, type StoredProject } from "@/lib/store"

export type SessionUser = { id: string; email: string | null }

/**
 * Returns the authenticated user (Supabase auth UUID + email), or null when
 * there is no valid session. The id equals both `auth.users.id` and
 * `public.users.id` (kept in sync by the on-signup trigger), so it can be used
 * directly as the `projects.userId` owner key.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  return { id: user.id, email: user.email ?? null }
}

/** Back-compat: just the user id. */
export async function getUserId(): Promise<string | null> {
  return (await getSessionUser())?.id ?? null
}

type AuthResult =
  | { ok: true; userId: string; email: string | null }
  | { ok: false; response: NextResponse }

type ProjectAuthResult =
  | { ok: true; userId: string; email: string | null; project: StoredProject }
  | { ok: false; response: NextResponse }

/** Require a signed-in user. */
export async function requireUser(): Promise<AuthResult> {
  const user = await getSessionUser()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  return { ok: true, userId: user.id, email: user.email }
}

/**
 * Require a signed-in user who owns the given project.
 * Returns 401 when unauthenticated, 404 when the project does not exist or is
 * owned by another user (no existence leak across tenants).
 */
export async function requireProjectAccess(id: string): Promise<ProjectAuthResult> {
  const user = await getSessionUser()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  const project = await store.getProject(id)
  if (!project || project.userId !== user.id) {
    return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) }
  }
  return { ok: true, userId: user.id, email: user.email, project }
}
