"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { motion } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Icon } from "@/components/ui/icon"
import { SparklesIcon, Mail01Icon, LockIcon } from "@hugeicons/core-free-icons"

const DEMO_ENABLED =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_ALLOW_DEMO_LOGIN === "true"

// Supabase redirects failed OAuth/callback attempts back here with ?error=<code>.
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthCallback: "Sign-in didn't complete. Please try again.",
  AccessDenied: "Access denied. Your account isn't allowed to sign in here.",
}

export default function SignInPage() {
  const searchParams = useSearchParams()
  const urlError = searchParams.get("error")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(
    urlError ? AUTH_ERROR_MESSAGES[urlError] ?? "Something went wrong signing in. Please try again." : ""
  )
  const [loading, setLoading] = useState(false)

  async function signInWithPassword(emailValue: string, passwordValue: string) {
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: emailValue,
      password: passwordValue,
    })
    if (signInError) {
      setError("Invalid credentials")
      setLoading(false)
      return
    }
    // Full reload so the middleware/server components pick up the new session.
    window.location.href = "/dashboard"
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    await signInWithPassword(email, password)
  }

  async function handleOAuth(provider: "azure" | "github") {
    setLoading(true)
    setError("")
    const supabase = createClient()
    const next = "/dashboard"
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        ...(provider === "azure" ? { scopes: "email openid profile" } : {}),
      },
    })
    if (oauthError) {
      setError("Couldn't start sign-in. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas p-6">
      <div className="pointer-events-none absolute inset-0 bg-noise" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[560px] w-[820px] -translate-x-1/2 -translate-y-1/2"
        style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(232,80,2,0.12) 0%, rgba(232,80,2,0.04) 50%, transparent 75%)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="mb-10 flex items-center justify-center gap-3">
          <Image
            src="/logo.png"
            alt="Forge"
            width={40}
            height={40}
            className="h-10 w-10"
          />
          <span className="text-xl font-semibold tracking-tight text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>Forge</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-[var(--radius-panel)] glass-strong p-7">
          <h1 className="text-center text-lg font-semibold text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>Welcome back</h1>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            disabled={loading}
            onClick={() => handleOAuth("azure")}
          >
            <Image src="/sponsors/microsoft.svg" alt="" width={15} height={15} className="h-[15px] w-[15px]" />
            Continue with Microsoft
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            disabled={loading}
            onClick={() => handleOAuth("github")}
          >
            <Image src="/sponsors/GitHub_light.svg" alt="" width={15} height={15} className="h-[15px] w-[15px] dark:hidden" />
            <Image src="/sponsors/GitHub_dark.svg" alt="" width={15} height={15} className="h-[15px] w-[15px] hidden dark:block" />
            Continue with GitHub
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-hairline" />
            <span className="text-xs text-muted">or</span>
            <div className="h-px flex-1 bg-hairline" />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Email</label>
            <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required icon={<Icon icon={Mail01Icon} size={15} />} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Password</label>
            <Input type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} required icon={<Icon icon={LockIcon} size={15} />} />
          </div>

          {error && (
            <motion.p initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-full bg-error/12 px-3 py-2 text-center text-xs text-error" role="alert">
              {error}
            </motion.p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : <><Icon icon={SparklesIcon} size={15} /> Sign in</>}
          </Button>

          {DEMO_ENABLED && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              disabled={loading}
              onClick={() => {
                setLoading(true)
                setError("")
                signInWithPassword("demo@forge.dev", "forgedemo")
              }}
            >
              Try the demo account
            </Button>
          )}

          <p className="text-center text-xs text-muted">
            New to Forge?{" "}
            <a href="/auth/register" className="font-medium text-brand hover:text-brand-hover">Create an account</a>
          </p>
        </form>
      </motion.div>
    </div>
  )
}
