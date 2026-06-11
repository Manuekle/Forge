export { auth as middleware } from "@/lib/auth"

export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*", "/agents/:path*", "/settings/:path*"],
}
