import { getDb, schema } from "../src/db/index.ts";
import { eq } from "drizzle-orm";

async function run() {
  await getDb().update(schema.users).set({ githubToken: null }).where(eq(schema.users.email, "demo@forge.dev"));
  console.log("Token removed for demo user");
  process.exit(0);
}

run();
