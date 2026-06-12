const GITHUB_API = "https://api.github.com"

class GitHubError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = "GitHubError"
  }
}

async function ghFetch(token: string, path: string, options: RequestInit = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Accept": "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }))
    const details = Array.isArray(body.errors)
      ? body.errors.map((e: { message?: string } | string) => (typeof e === "string" ? e : e.message)).filter(Boolean).join("; ")
      : ""
    const message = details ? `${body.message || res.statusText}: ${details}` : body.message || res.statusText
    throw new GitHubError(message, res.status)
  }
  return res.json()
}

async function getUser(token: string) {
  return ghFetch(token, "/user")
}

function parseRepoUrl(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim().replace(/\/+$/, "").replace(/\.git$/, "")
  const m =
    trimmed.match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+)$/) ||
    trimmed.match(/^([A-Za-z0-9][A-Za-z0-9-]*)\/([A-Za-z0-9._-]+)$/)
  if (!m) return null
  return { owner: m[1], repo: m[2] }
}

async function getRepo(token: string, owner: string, name: string) {
  return ghFetch(token, `/repos/${owner}/${name}`)
}

async function createRepo(token: string, name: string, description: string, isPrivate = true) {
  return ghFetch(token, "/user/repos", {
    method: "POST",
    body: JSON.stringify({ name, description, private: isPrivate, auto_init: true }),
  })
}

async function getOrCreateRepo(token: string, owner: string, name: string, description: string) {
  try {
    const repo = await createRepo(token, name, description)
    return { repo, created: true }
  } catch (err) {
    if (err instanceof GitHubError && err.status === 422) {
      try {
        const repo = await getRepo(token, owner, name)
        return { repo, created: false }
      } catch {
        throw err
      }
    }
    throw err
  }
}

async function getFileSha(token: string, owner: string, repo: string, path: string): Promise<string | null> {
  try {
    const file = await ghFetch(token, `/repos/${owner}/${repo}/contents/${path}`)
    return file?.sha ?? null
  } catch (err) {
    if (err instanceof GitHubError && err.status === 404) return null
    throw err
  }
}

async function putFile(token: string, owner: string, repo: string, path: string, encoded: string, message: string) {
  const sha = await getFileSha(token, owner, repo, path)
  return ghFetch(token, `/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({ message, content: encoded, ...(sha ? { sha } : {}) }),
  })
}

async function createOrUpdateFile(token: string, owner: string, repo: string, path: string, content: string, message: string) {
  const encoded = Buffer.from(content).toString("base64")
  try {
    return await putFile(token, owner, repo, path, encoded, message)
  } catch (err) {
    // A freshly auto-initialized repo commits its README asynchronously; the
    // first PUT can race it (409/422). Re-resolve the sha and retry once.
    if (err instanceof GitHubError && (err.status === 409 || err.status === 422)) {
      await new Promise((r) => setTimeout(r, 1000))
      return putFile(token, owner, repo, path, encoded, message)
    }
    throw err
  }
}

async function commitFiles(
  token: string,
  owner: string,
  repo: string,
  files: { path: string; content: string }[],
  message: string
) {
  const repoInfo = await getRepo(token, owner, repo)
  const branch = repoInfo.default_branch || "main"

  const ref = await ghFetch(token, `/repos/${owner}/${repo}/git/ref/heads/${branch}`)
  const parentSha = ref.object.sha
  const parentCommit = await ghFetch(token, `/repos/${owner}/${repo}/git/commits/${parentSha}`)

  const tree = await ghFetch(token, `/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: parentCommit.tree.sha,
      tree: files.map((f) => ({ path: f.path, mode: "100644", type: "blob", content: f.content })),
    }),
  })

  const commit = await ghFetch(token, `/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message, tree: tree.sha, parents: [parentSha] }),
  })

  await ghFetch(token, `/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha }),
  })

  return { sha: commit.sha as string, branch, url: `https://github.com/${owner}/${repo}/commit/${commit.sha}` }
}

async function listIssues(token: string, owner: string, repo: string) {
  return ghFetch(token, `/repos/${owner}/${repo}/issues?state=all&per_page=100`)
}

async function createIssue(token: string, owner: string, repo: string, title: string, body: string, labels: string[]) {
  return ghFetch(token, `/repos/${owner}/${repo}/issues`, {
    method: "POST",
    body: JSON.stringify({ title, body, labels }),
  })
}

export { GitHubError, getUser, getRepo, createRepo, getOrCreateRepo, createOrUpdateFile, commitFiles, listIssues, createIssue, parseRepoUrl }
