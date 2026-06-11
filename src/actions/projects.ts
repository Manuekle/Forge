"use server"

import { store } from "@/lib/store"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { clampText } from "@/lib/guard"

async function requireUserId(): Promise<string> {
  const session = await auth()
  const userId = session?.user?.email
  if (!userId) throw new Error("Unauthorized")
  return userId
}

export async function getProjects() {
  const userId = await requireUserId()
  return store.getProjects(userId)
}

export async function createProject(formData: FormData) {
  const userId = await requireUserId()

  const name = clampText(formData.get("name"), 120)
  const description = clampText(formData.get("description"), 2000)
  const template = clampText(formData.get("template"), 60)

  if (!name) throw new Error("Name is required")

  const project = await store.createProject({ userId, name, description, template: template || undefined })
  revalidatePath("/projects")
  return project
}

export async function getProject(id: string) {
  const userId = await requireUserId()
  const project = await store.getProject(id)
  if (!project || project.userId !== userId) return null
  return project
}

export async function deleteProject(id: string) {
  const userId = await requireUserId()
  const project = await store.getProject(id)
  if (!project || project.userId !== userId) throw new Error("Not found")

  await store.deleteProject(id)
  revalidatePath("/projects")
}
