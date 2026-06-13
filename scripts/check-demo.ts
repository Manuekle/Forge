import { readFileSync } from "fs"
import { resolve } from "path"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "../src/db/schema"
import { eq } from "drizzle-orm"

async function main() {
  const envContent = readFileSync(resolve(process.cwd(), ".env"), "utf-8")
  const env: any = {}
  for (const line of envContent.split("\n")) {
    const [k, v] = line.split("=")
    if (k && v) env[k.trim()] = v.trim().replace(/^"(.*)"$/, '$1')
  }

  const client = postgres(env.DATABASE_URL, { prepare: false })
  const db = drizzle(client, { schema })

  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, "demo@forge.dev")
  })

  if (!user) {
    console.log("No demo user found")
    return
  }

  const projects = await db.query.projects.findMany({
    where: eq(schema.projects.userId, user.id)
  })

  console.log(`User: ${user.email} (${user.id})`)
  console.log(`Projects (${projects.length}):`)
  projects.forEach(p => console.log(`- ${p.name} (ID: ${p.id}, Status: ${p.status})`))

  process.exit(0)
}

main()
