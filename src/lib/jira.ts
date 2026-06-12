class JiraError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = "JiraError"
  }
}

function authHeader(email: string, token: string) {
  return `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`
}

async function jiraFetch(domain: string, email: string, token: string, path: string, options: RequestInit = {}) {
  const res = await fetch(`https://${domain}.atlassian.net${path}`, {
    ...options,
    headers: {
      Authorization: authHeader(email, token),
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message =
      body?.errorMessages?.join("; ") ||
      (body?.errors ? Object.values(body.errors).join("; ") : null) ||
      res.statusText
    throw new JiraError(message, res.status)
  }
  if (res.status === 204) return null
  return res.json()
}

async function getFirstProject(domain: string, email: string, token: string) {
  const data = await jiraFetch(domain, email, token, "/rest/api/3/project/search?maxResults=1")
  const project = data?.values?.[0]
  if (!project) throw new JiraError("No Jira projects found in this workspace", 404)
  return { key: project.key as string, name: project.name as string }
}

async function createJiraIssue(
  token: string,
  domain: string,
  email: string,
  projectKey: string,
  title: string,
  body: string,
  labels: string[]
) {
  return jiraFetch(domain, email, token, "/rest/api/3/issue", {
    method: "POST",
    body: JSON.stringify({
      fields: {
        project: { key: projectKey },
        issuetype: { name: "Task" },
        summary: title,
        labels,
        description: {
          type: "doc",
          version: 1,
          content: [{ type: "paragraph", content: [{ type: "text", text: body || title }] }],
        },
      },
    }),
  })
}

async function transitionJiraIssue(
  token: string,
  domain: string,
  email: string,
  issueKey: string,
  statusName: string
) {
  const data = await jiraFetch(domain, email, token, `/rest/api/3/issue/${issueKey}/transitions`)
  const match = data?.transitions?.find(
    (t: { name: string; to?: { name: string } }) =>
      t.to?.name?.toLowerCase() === statusName.toLowerCase() || t.name.toLowerCase() === statusName.toLowerCase()
  )
  if (!match) return false
  await jiraFetch(domain, email, token, `/rest/api/3/issue/${issueKey}/transitions`, {
    method: "POST",
    body: JSON.stringify({ transition: { id: match.id } }),
  })
  return true
}

export { JiraError, getFirstProject, createJiraIssue, transitionJiraIssue }
