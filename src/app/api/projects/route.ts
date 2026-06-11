import { NextResponse } from "next/server"
import { store } from "@/lib/store"
import { requireUser } from "@/lib/api-auth"
import { clampText } from "@/lib/guard"

export async function GET() {
  const authed = await requireUser()
  if (!authed.ok) return authed.response
  let all = await store.getProjects(authed.userId)
  // First visit: populate the workspace with demo projects for this user.
  if (all.length === 0) {
    await store.seed(authed.userId)
    all = await store.getProjects(authed.userId)
  }
  return NextResponse.json(all)
}

export async function POST(request: Request) {
  const authed = await requireUser()
  if (!authed.ok) return authed.response

  const body = await request.json()
  const name = clampText(body.name, 120)
  const description = clampText(body.description, 2000)
  const template = clampText(body.template, 60) || undefined

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  const project = await store.createProject({ userId: authed.userId, name, description, template })
  return NextResponse.json(project, { status: 201 })
}
