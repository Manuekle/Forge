import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"

export const authConfig: NextAuthConfig = {
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string
        const password = credentials?.password as string

        if (email !== "demo@forge.dev" || password !== "forge") return null

        const { getDb, schema } = await import("@/db")
        const { eq } = await import("drizzle-orm")

        const db = getDb()

        let [user] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, email))
          .limit(1)

        if (!user) {
          const [created] = await db
            .insert(schema.users)
            .values({
              email,
              name: "Dana Reyes",
              emailVerified: new Date(),
            })
            .returning()
          user = created
        }

        return { id: user.id, name: user.name, email: user.email, image: user.image }
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        // OAuth sign-in: the provider id is not our DB id. Upsert the user by
        // email and store the DB UUID so scoped APIs resolve correctly.
        // (Runs only during sign-in on the server, never in edge middleware.)
        if (account && account.provider !== "credentials" && user.email) {
          const { getDb, schema } = await import("@/db")
          const { eq } = await import("drizzle-orm")
          const db = getDb()
          let [dbUser] = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.email, user.email))
            .limit(1)
          if (!dbUser) {
            const [created] = await db
              .insert(schema.users)
              .values({
                email: user.email,
                name: user.name ?? null,
                image: user.image ?? null,
                emailVerified: new Date(),
              })
              .returning()
            dbUser = created
          }
          token.id = dbUser.id
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
      }
      return session
    },
  },
  session: {
    strategy: "jwt",
  },
}
