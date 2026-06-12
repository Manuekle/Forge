import { NextResponse } from "next/server"
import { store } from "@/lib/store"
import { requireProjectAccess } from "@/lib/api-auth"
import { generateAppFiles, CodegenError } from "@/lib/codegen"

export const maxDuration = 300

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const access = await requireProjectAccess(id)
  if (!access.ok) return access.response
  const files = await store.getCodeFiles(id)
  return NextResponse.json(files)
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const access = await requireProjectAccess(id)
  if (!access.ok) return access.response

  const [artifacts, tasks] = await Promise.all([store.getArtifacts(id), store.getTasks(id)])
  if (artifacts.length === 0) {
    return NextResponse.json({ error: "No deliverables yet. Run the planning agents first — the engineer codes from the PRD and architecture." }, { status: 400 })
  }

  const latest = new Map<string, (typeof artifacts)[number]>()
  for (const a of artifacts) {
    if ((latest.get(a.type)?.version ?? 0) < a.version) latest.set(a.type, a)
  }

  try {
    const generated = await generateAppFiles({
      projectName: access.project.name,
      projectDescription: access.project.description || "",
      artifacts: [...latest.values()].map((a) => ({ type: a.type, title: a.title, content: a.content })),
      tasks: tasks.map((t) => ({ title: t.title, description: t.description, priority: t.priority, status: t.status })),
    })

    if (generated.length === 0) {
      return NextResponse.json({ error: "The engineer agent returned no files. Try again." }, { status: 502 })
    }

    const files = await store.replaceCodeFiles(id, generated)
    return NextResponse.json(files, { status: 201 })
  } catch (err) {
    if (err instanceof CodegenError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "The engineer agent returned malformed output. Try again." }, { status: 502 })
    }
    console.error("Code generation error:", err)
    return NextResponse.json({ error: "Code generation failed" }, { status: 500 })
  }
}
