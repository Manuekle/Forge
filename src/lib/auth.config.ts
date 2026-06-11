import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const authConfig: NextAuthConfig = {
  providers: [
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
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
