import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  if (!req.auth?.user) {
    const signInUrl = new URL("/auth/signin", req.url)
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname)
    return Response.redirect(signInUrl)
  }
})

export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*", "/agents/:path*", "/settings/:path*"],
}
