"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { signOut } from "next-auth/react"
import { Shell } from "@/components/layout/shell"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  SparklesIcon, UserIcon, Building01Icon, MoonIcon, Key01Icon, Alert01Icon,
} from "@hugeicons/core-free-icons"
import { Icon, type IconSvgElement } from "@/components/ui/icon"

const LS_PROFILE = "forge-profile"
const LS_WORKSPACE = "forge-workspace"
const LS_API = "forge-api"

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback } catch { return fallback }
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { ease: [0.22, 1, 0.36, 1] as const } },
}

export default function SettingsPage() {
  const { toast } = useToast()

  const [profile, setProfile] = useState(() => load(LS_PROFILE, { name: "Jane Doe", email: "jane@forge.dev" }))
  const [workspace, setWorkspace] = useState(() => load(LS_WORKSPACE, { name: "Forge Team" }))
  const [api, setApi] = useState(() => load(LS_API, { endpoint: "", key: "", deployment: "grok-4-20-reasoning", timeout: "180000" }))
  const [deleting, setDeleting] = useState(false)

  function saveProfile() {
    localStorage.setItem(LS_PROFILE, JSON.stringify(profile))
    toast({ title: "Profile saved", variant: "success" })
  }

  function saveWorkspace() {
    localStorage.setItem(LS_WORKSPACE, JSON.stringify(workspace))
    toast({ title: "Workspace saved", variant: "success" })
  }

  function saveApi() {
    localStorage.setItem(LS_API, JSON.stringify(api))
    toast({ title: "API configuration saved", description: "Restart the server for changes to take effect.", variant: "info" })
  }

  async function deleteAccount() {
    if (!confirm("Are you sure you want to delete your account? This cannot be undone.")) return
    setDeleting(true)
    try {
      const res = await fetch("/api/clear", { method: "POST" })
      if (res.ok) {
        toast({ title: "Account deleted", variant: "info" })
        signOut({ callbackUrl: "/" })
      } else {
        toast({ title: "Delete failed", variant: "error" })
      }
    } catch {
      toast({ title: "Delete failed", variant: "error" })
    }
    setDeleting(false)
  }

  return (
    <Shell breadcrumb="Settings">
      <div className="relative min-h-full">
        <div className="pointer-events-none fixed inset-0 bg-noise" />
        <div className="relative z-10 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[680px]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="text-[28px] font-bold tracking-tight text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>Settings</h1>
              <p className="mt-1 text-sm text-text-secondary">
                Manage your account, workspace, and API configuration.
              </p>
            </motion.div>

            <motion.div variants={stagger} initial="hidden" animate="show" className="mt-8 flex flex-col gap-5">
              {/* Profile */}
              <motion.div variants={fadeUp}>
                <Card variant="elevated" className="relative overflow-hidden p-6">
                  <div className="pointer-events-none absolute -right-12 -top-12 h-24 w-24 rounded-full opacity-[0.05] blur-2xl"
                    style={{ background: "radial-gradient(circle, #E85002 0%, transparent 70%)" }}
                  />
                  <SectionHeader icon={UserIcon} title="Profile" />
                  <div className="flex flex-col gap-4">
                    <Field label="Full name">
                      <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} type="text" />
                    </Field>
                    <Field label="Email">
                      <Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} type="email" />
                    </Field>
                  </div>
                  <SectionFooter onSave={saveProfile} />
                </Card>
              </motion.div>

              {/* Workspace */}
              <motion.div variants={fadeUp}>
                <Card variant="elevated" className="relative overflow-hidden p-6">
                  <div className="pointer-events-none absolute -right-12 -top-12 h-24 w-24 rounded-full opacity-[0.05] blur-2xl"
                    style={{ background: "radial-gradient(circle, #E85002 0%, transparent 70%)" }}
                  />
                  <SectionHeader icon={Building01Icon} title="Workspace" />
                  <div className="flex flex-col gap-4">
                    <Field label="Workspace name">
                      <Input value={workspace.name} onChange={(e) => setWorkspace({ name: e.target.value })} type="text" />
                    </Field>
                    <Field label="Plan">
                      <Input defaultValue="Forge Pro" type="text" className="text-brand" readOnly />
                    </Field>
                  </div>
                  <SectionFooter onSave={saveWorkspace} />
                </Card>
              </motion.div>

              {/* Appearance */}
              <motion.div variants={fadeUp}>
                <Card variant="elevated" className="relative overflow-hidden p-6">
                  <div className="pointer-events-none absolute -right-12 -top-12 h-24 w-24 rounded-full opacity-[0.05] blur-2xl"
                    style={{ background: "radial-gradient(circle, #E85002 0%, transparent 70%)" }}
                  />
                  <SectionHeader icon={MoonIcon} title="Appearance" />
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-text-primary">Theme</div>
                      <div className="mt-0.5 text-xs text-text-secondary">Switch between dark and light mode</div>
                    </div>
                    <ThemeToggle />
                  </div>
                </Card>
              </motion.div>

              {/* API Configuration */}
              <motion.div variants={fadeUp}>
                <Card variant="elevated" className="relative overflow-hidden p-6">
                  <div className="pointer-events-none absolute -right-12 -top-12 h-24 w-24 rounded-full opacity-[0.05] blur-2xl"
                    style={{ background: "radial-gradient(circle, #E85002 0%, transparent 70%)" }}
                  />
                  <SectionHeader icon={Key01Icon} title="API Configuration" />
                  <div className="flex flex-col gap-4">
                    <Field label="Azure OpenAI Endpoint">
                      <Input value={api.endpoint} onChange={(e) => setApi({ ...api, endpoint: e.target.value })} type="text" placeholder="https://your-resource.openai.azure.com" />
                    </Field>
                    <Field label="API Key">
                      <Input value={api.key} onChange={(e) => setApi({ ...api, key: e.target.value })} type="password" placeholder="sk-..." />
                    </Field>
                    <Field label="Deployment Name">
                      <Input value={api.deployment} onChange={(e) => setApi({ ...api, deployment: e.target.value })} type="text" />
                    </Field>
                    <Field label="Timeout (ms)">
                      <Input value={api.timeout} onChange={(e) => setApi({ ...api, timeout: e.target.value })} type="number" />
                    </Field>
                  </div>
                  <SectionFooter onSave={saveApi} />
                </Card>
              </motion.div>

              {/* Danger Zone */}
              <motion.div variants={fadeUp}>
                <Card variant="elevated" className="relative overflow-hidden border border-error/10 p-6">
                  <div className="pointer-events-none absolute -right-12 -top-12 h-24 w-24 rounded-full opacity-[0.08] blur-2xl"
                    style={{ background: "radial-gradient(circle, rgba(251,113,133,0.3) 0%, transparent 70%)" }}
                  />
                  <div className="relative flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-error/12">
                      <Icon icon={Alert01Icon} size={18} className="text-error" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-error">Danger Zone</h3>
                      <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="flex-shrink-0 border-error/30 text-error hover:bg-error/12" onClick={deleteAccount} disabled={deleting}>
                      {deleting ? "Deleting\u2026" : "Delete account"}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </Shell>
  )
}

function SectionHeader({ icon, title }: { icon: IconSvgElement; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-6 w-6 items-center justify-center rounded-lg glass-brand">
        <Icon icon={icon} size={13} className="text-brand" />
      </div>
      <h2 className="text-sm font-semibold text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>{title}</h2>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-text-secondary">{label}</label>
      {children}
    </div>
  )
}

function SectionFooter({ onSave }: { onSave?: () => void }) {
  return (
    <div className="mt-6 flex justify-end">
      <Button size="sm" onClick={onSave}>
        <Icon icon={SparklesIcon} size={13} />
        Save changes
      </Button>
    </div>
  )
}
