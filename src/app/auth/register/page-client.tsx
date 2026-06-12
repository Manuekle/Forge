"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Rocket01Icon, Tick01Icon } from "@hugeicons/core-free-icons"

const PERKS = [
  "All 6 AI agents from day one",
  "2 projects on the free plan",
  "Full reasoning traces & decision history",
]

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

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
          <Image src="/logo.png" alt="Forge" width={40} height={40} className="h-10 w-10" />
          <span className="text-xl font-semibold tracking-tight text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>Forge</span>
        </div>

        <div className="space-y-4 rounded-[var(--radius-panel)] glass-strong p-7">
          <h1 className="text-center text-lg font-semibold text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>Create your account</h1>
          <p className="text-center text-xs leading-relaxed text-text-secondary">
            Your account is created automatically the first time you sign in.
          </p>

          <div className="flex flex-col gap-2 rounded-2xl bg-surface-inset/60 p-4 ring-hair">
            {PERKS.map((perk) => (
              <div key={perk} className="flex items-center gap-2.5">
                <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-brand-subtle text-brand">
                  <Icon icon={Tick01Icon} size={9} />
                </span>
                <span className="text-xs text-text-secondary">{perk}</span>
              </div>
            ))}
          </div>

          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={loading}
            onClick={() => {
              setLoading(true)
              signIn("microsoft-entra-id", { callbackUrl: "/dashboard" })
            }}
          >
            <Image src="/sponsors/microsoft.svg" alt="" width={15} height={15} className="h-[15px] w-[15px]" />
            Sign up with Microsoft
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-hairline" />
            <span className="text-xs text-muted">or</span>
            <div className="h-px flex-1 bg-hairline" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            disabled={loading}
            onClick={() => {
              setLoading(true)
              setError("")
              signIn("credentials", { email: "demo@forge.dev", password: "forge", redirect: false }).then((r) => {
                if (r?.error) { setError("Demo sign-in failed"); setLoading(false) }
                else { router.push("/dashboard"); router.refresh() }
              })
            }}
          >
            <Icon icon={Rocket01Icon} size={15} /> Try the demo account
          </Button>

          {error && (
            <motion.p initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-full bg-error/12 px-3 py-2 text-center text-xs text-error">
              {error}
            </motion.p>
          )}

          <p className="text-center text-xs text-muted">
            Already have an account?{" "}
            <a href="/auth/signin" className="font-medium text-brand hover:text-brand-hover">Sign in</a>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
