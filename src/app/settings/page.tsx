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
  SparklesIcon, Settings02Icon, UserIcon, Building01Icon, MoonIcon, Key01Icon, Alert01Icon
} from "@hugeicons/core-free-icons"
import { Icon, type IconSvgElement } from "@/components/ui/icon"

const LS_PROFILE = "forge-profile"
const LS_WORKSPACE = "forge-workspace"
const LS_API = "forge-api"

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback } catch { return fallback }
}

export default function SettingsPage() {
  const { toast } = useToast()

  const [profile, setProfile] = useState(() => load(LS_PROFILE, { name: "Dana Reyes", email: "dana@forge.dev" }))
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
      <div className="p-8">
        <div className="mx-auto max-w-[680px]">
          <div className="mb-1 flex items-center gap-3">
            <Icon icon={Settings02Icon} size={20} className="text-brand" />
            <h1 className="text-[28px] font-bold tracking-tight text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>Settings</h1>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your account, workspace, and API configuration.
          </p>

          <div className="mt-8 flex flex-col gap-5">
            {/* Profile */}
            <Section delay={0}>
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
            </Section>

            {/* Workspace */}
            <Section delay={1}>
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
            </Section>

            {/* Appearance */}
            <Section delay={2}>
              <SectionHeader icon={MoonIcon} title="Appearance" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-text-primary">Theme</div>
                  <div className="mt-0.5 text-xs text-text-secondary">Switch between dark and light mode</div>
                </div>
                <ThemeToggle />
              </div>
            </Section>

            {/* API Configuration */}
            <Section delay={3}>
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
            </Section>

            {/* Danger Zone */}
            <Section delay={4}>
              <div className="flex items-center gap-3 rounded-xl bg-error/8 p-4">
                <Icon icon={Alert01Icon} size={18} className="text-error" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-error">Danger Zone</div>
                  <div className="mt-0.5 text-xs text-text-secondary">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </div>
                </div>
                <Button variant="outline" size="sm" className="border-error/30 text-error hover:bg-error/12" onClick={deleteAccount} disabled={deleting}>
                  {deleting ? "Deleting…" : "Delete account"}
                </Button>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </Shell>
  )
}



function Section({ delay, children }: { delay: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card variant="elevated" className="p-6">
        {children}
      </Card>
    </motion.div>
  )
}

function SectionHeader({ icon, title }: { icon: IconSvgElement; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-subtle ring-hair">
        <Icon icon={icon} size={16} className="text-brand" />
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
    <div className="mt-6 flex justify-end pt-5 hairline-t">
      <Button size="sm" onClick={onSave}>
        <Icon icon={SparklesIcon} size={13} />
        Save changes
      </Button>
    </div>
  )
}
