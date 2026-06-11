import NextAuth from "next-auth"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { getDb, schema } from "@/db"
import { authConfig } from "./auth.config"

const adapter = DrizzleAdapter(getDb(), {
  usersTable: schema.users,
  accountsTable: schema.accounts,
  sessionsTable: schema.sessions,
  verificationTokensTable: schema.verificationTokens,
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter,
})
