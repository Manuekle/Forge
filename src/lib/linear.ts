const LINEAR_API = "https://api.linear.app/graphql"

class LinearError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = "LinearError"
  }
}

async function linearQuery(token: string, query: string, variables: Record<string, unknown> = {}) {
  const res = await fetch(LINEAR_API, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new LinearError(body?.errors?.[0]?.message || res.statusText, res.status)
  }
  if (body?.errors?.length) {
    throw new LinearError(body.errors[0].message, 400)
  }
  return body.data
}

async function getFirstTeam(token: string) {
  const data = await linearQuery(token, `query { teams(first: 1) { nodes { id name states { nodes { id name } } } } }`)
  const team = data?.teams?.nodes?.[0]
  if (!team) throw new LinearError("No Linear teams found for this token", 404)
  return team as { id: string; name: string; states: { nodes: { id: string; name: string }[] } }
}

async function createLinearIssue(
  token: string,
  teamId: string,
  title: string,
  description: string,
  options: { stateId?: string; priority?: number } = {}
) {
  const data = await linearQuery(
    token,
    `mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { id identifier url }
      }
    }`,
    {
      input: {
        teamId,
        title,
        description,
        ...(options.stateId ? { stateId: options.stateId } : {}),
        ...(options.priority !== undefined ? { priority: options.priority } : {}),
      },
    }
  )
  if (!data?.issueCreate?.success) throw new LinearError("Failed to create Linear issue", 400)
  return data.issueCreate.issue as { id: string; identifier: string; url: string }
}

export { LinearError, getFirstTeam, createLinearIssue }
