import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Refreshes the Supabase session on every matched request and redirects
 * unauthenticated users to the sign-in page. Returns the response that carries
 * the refreshed auth cookies — it MUST be the response returned from middleware
 * so the cookies propagate to the browser.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    }
  )

  // IMPORTANT: getUser() revalidates the token with Supabase; do not trust
  // getSession() in middleware. Keep this call directly after client creation.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const signInUrl = request.nextUrl.clone()
    signInUrl.pathname = "/auth/signin"
    signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname)
    return NextResponse.redirect(signInUrl)
  }

  return response
}
