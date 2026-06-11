"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Icon } from "@/components/ui/icon"
import { SparklesIcon, Mail01Icon, LockIcon, Rocket01Icon } from "@hugeicons/core-free-icons"

const DEMO_EMAIL = "demo@forge.dev"
const DEMO_PASSWORD = "forge"

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState(DEMO_EMAIL)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [error, setError] = useState("")
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
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas p-6">
      <div className="pointer-events-none absolute inset-0 bg-noise" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-70 blur-3xl aurora" />

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

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Email</label>
            <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required icon={<Icon icon={Mail01Icon} size={15} />} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Password</label>
            <Input type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} required icon={<Icon icon={LockIcon} size={15} />} />
          </div>

          {error && (
            <motion.p initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-full bg-error/12 px-3 py-2 text-center text-xs text-error">
              {error}
            </motion.p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : <><Icon icon={SparklesIcon} size={15} /> Sign in</>}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-hairline" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[var(--glass-strong-bg)] px-2 text-muted">or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => {
              setEmail(DEMO_EMAIL)
              setPassword(DEMO_PASSWORD)
              setLoading(true)
              setError("")
              signIn("credentials", { email: DEMO_EMAIL, password: DEMO_PASSWORD, redirect: false }).then((r) => {
                if (r?.error) setError("Invalid credentials")
                else { router.push("/dashboard"); router.refresh() }
              })
            }}
          >
            <Icon icon={Rocket01Icon} size={15} /> Demo login
          </Button>

          <p className="text-center text-xs text-muted">
            <span className="font-mono text-brand">demo@forge.dev</span> / <span className="font-mono text-brand">forge</span>
          </p>
        </form>
      </motion.div>
    </div>
  )
}
