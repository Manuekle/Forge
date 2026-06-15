import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

/**
 * OAuth / email-link callback. Supabase redirects here with a `code` that we
 * exchange for a session (sets the auth cookies). On success, forward to the
 * requested `next` path (default /dashboard); on failure, back to sign-in.
 *
 * NOTE: we create the client inline with request/response cookie handling
 * instead of using @/lib/supabase/server because that helper uses `cookies()`
 * from next/headers, which sets cookies on a hidden response object — they
 * would be lost when we return a brand-new NextResponse.redirect() here.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return parseCookieHeader(request.headers.get("Cookie") ?? "")
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              response.cookies.set(name, value, options)
            }
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return response
  }

  return NextResponse.redirect(`${origin}/auth/signin?error=OAuthCallback`)
}

function parseCookieHeader(header: string): { name: string; value: string }[] {
  if (!header) return []
  return header.split("; ").map((c) => {
    const idx = c.indexOf("=")
    return { name: c.slice(0, idx), value: c.slice(idx + 1) }
  })
}
