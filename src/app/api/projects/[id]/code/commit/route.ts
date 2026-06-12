import { NextResponse } from "next/server"
import { store } from "@/lib/store"
import { requireProjectAccess } from "@/lib/api-auth"
import { safeJson, clampText } from "@/lib/guard"
import { getUser, getRepo, getOrCreateRepo, commitFiles, parseRepoUrl, GitHubError } from "@/lib/github"

export const maxDuration = 120

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const access = await requireProjectAccess(id)
  if (!access.ok) return access.response

  const token = await store.getUserGithubToken(access.userId)
  if (!token) {
    return NextResponse.json({ error: "GitHub token is not configured. Add it in Settings → GitHub Integration." }, { status: 400 })
  }

  const files = await store.getCodeFiles(id)
  if (files.length === 0) {
    return NextResponse.json({ error: "No code to commit. Generate the app first." }, { status: 400 })
  }

  const body = await safeJson(request)
  const message = clampText(body.message, 200) || `feat: update ${access.project.name} code from Forge`

  try {
    const user = await getUser(token)
    const login = user.login
    const project = access.project
    const linked = project.githubRepo ? parseRepoUrl(project.githubRepo) : null

    let owner = login
    let repoName = project.name.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 100)
    let repo: { html_url: string }

    if (linked) {
      owner = linked.owner
      repoName = linked.repo
      try {
        repo = await getRepo(token, owner, repoName)
      } catch (err) {
        if (err instanceof GitHubError && err.status === 404) {
          return NextResponse.json({ error: `Linked repository ${owner}/${repoName} was not found or your token has no access to it.` }, { status: 404 })
        }
        throw err
      }
    } else {
      const result = await getOrCreateRepo(token, login, repoName, project.description || "Created by Forge")
      repo = result.repo
    }

    const commit = await commitFiles(token, owner, repoName, files.map((f) => ({ path: f.path, content: f.content })), message)

    await store.updateProject(id, { githubRepo: repo.html_url })

    return NextResponse.json({
      repo: repo.html_url,
      commit: commit.url,
      sha: commit.sha,
      branch: commit.branch,
      filesCommitted: files.length,
      message: `Committed ${files.length} files to ${commit.branch} (${commit.sha.slice(0, 7)}).`,
    })
  } catch (err) {
    if (err instanceof GitHubError) {
      return NextResponse.json({ error: `GitHub error: ${err.message}` }, { status: err.status })
    }
    console.error("Code commit error:", err)
    return NextResponse.json({ error: "Failed to commit to GitHub" }, { status: 500 })
  }
}
