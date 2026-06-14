"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import Image from "next/image"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Icon } from "@/components/ui/icon"
import { SparklesIcon, Mail01Icon, LockIcon } from "@hugeicons/core-free-icons"

// NextAuth redirects failed OAuth/config attempts back here with ?error=<code>.
// Map the codes to messages users can act on instead of a raw enum.
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  Configuration: "Microsoft sign-in is not available right now. Please use email, or try again later.",
  OAuthSignin: "Couldn't start Microsoft sign-in. Please try again.",
  OAuthCallback: "Microsoft sign-in didn't complete. Please try again.",
  OAuthAccountNotLinked: "This email is already registered. Sign in with your email and password.",
  AccessDenied: "Access denied. Your Microsoft account isn't allowed to sign in here.",
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", { email, password, redirect: false })

    if (result?.error) {
      setError("Invalid credentials")
      setLoading(false)
    } else {
      // Force a full reload to ensure the session is properly synchronized
      // and picked up by the middleware/server components.
      window.location.href = "/dashboard"
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
            onClick={() => {
              setLoading(true)
              signIn("microsoft-entra-id", { callbackUrl: "/dashboard" })
            }}
          >
            <Image src="/sponsors/microsoft.svg" alt="" width={15} height={15} className="h-[15px] w-[15px]" />
            Continue with Microsoft
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

          <p className="text-center text-xs text-muted">
            New to Forge?{" "}
            <a href="/auth/register" className="font-medium text-brand hover:text-brand-hover">Create an account</a>
          </p>
        </form>
      </motion.div>
    </div>
  )
}
