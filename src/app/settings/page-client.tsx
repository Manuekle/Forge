"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { Shell } from "@/components/layout/shell"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { ThemeToggle } from "@/components/theme-toggle"
import { Modal } from "@/components/ui/modal"
import {
  SparklesIcon, UserIcon, Building01Icon, MoonIcon, Key01Icon, Alert01Icon, GlobeIcon, HelpCircleIcon,
  GitBranchIcon, Layers01Icon,
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
  const [githubToken, setGithubToken] = useState("")
  const [savingGithub, setSavingGithub] = useState(false)
  const [jira, setJira] = useState({ domain: "", email: "", token: "" })
  const [savingJira, setSavingJira] = useState(false)
  const [linearToken, setLinearToken] = useState("")
  const [savingLinear, setSavingLinear] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showScopeGuide, setShowScopeGuide] = useState(false)
  // Secrets are never sent back by the API; track only connection status so we
  // can show "Connected" and prefill the non-secret Jira domain/email fields.
  const [connected, setConnected] = useState({ github: false, jira: false, linear: false })

  const isDemo = profile.email === "demo@forge.dev"

  useEffect(() => {
    fetch("/api/user/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return

        if (isDemo) {
          setGithubToken(localStorage.getItem("forge-github-token") || "")
        }

        setConnected({
          github: !!data.github?.connected,
          jira: !!data.jira?.connected,
          linear: !!data.linear?.connected,
        })
        // Only non-secret config is returned — prefill domain/email, never the token.
        if (data.jira?.domain || data.jira?.email) {
          setJira({ domain: data.jira.domain ?? "", email: data.jira.email ?? "", token: "" })
        }
      })
      .catch(() => {})
  }, [isDemo])

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

  async function saveGithub() {
    setSavingGithub(true)
    if (isDemo) {
      localStorage.setItem("forge-github-token", githubToken)
      toast({ title: "GitHub token saved locally", variant: "success" })
      setSavingGithub(false)
      return
    }
    const res = await fetch("/api/user/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ githubToken: githubToken || null }),
    })
    if (res.ok) {
      toast({ title: "GitHub token saved", variant: "success" })
    } else {
      toast({ title: "Failed to save token", variant: "error" })
    }
    setSavingGithub(false)
  }

  async function saveJira() {
    setSavingJira(true)
    const res = await fetch("/api/user/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jiraDomain: jira.domain, jiraEmail: jira.email, jiraToken: jira.token }),
    })
    if (res.ok) {
      toast({ title: "Jira configuration saved", variant: "success" })
    } else {
      toast({ title: "Failed to save Jira configuration", variant: "error" })
    }
    setSavingJira(false)
  }

  async function saveLinear() {
    setSavingLinear(true)
    const res = await fetch("/api/user/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linearToken: linearToken || null }),
    })
    if (res.ok) {
      toast({ title: "Linear API key saved", variant: "success" })
    } else {
      toast({ title: "Failed to save Linear API key", variant: "error" })
    }
    setSavingLinear(false)
  }

  async function deleteAccount() {
    if (!confirm("Are you sure you want to delete your account? This cannot be undone.")) return
    setDeleting(true)
    try {
      const res = await fetch("/api/clear", { method: "POST" })
      if (res.ok) {
        toast({ title: "Account deleted", variant: "info" })
        await createClient().auth.signOut()
        window.location.href = "/"
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

              {/* GitHub Integration */}
              <motion.div variants={fadeUp}>
                <Card variant="elevated" className="relative overflow-hidden p-6">
                  <div className="pointer-events-none absolute -right-12 -top-12 h-24 w-24 rounded-full opacity-[0.05] blur-2xl"
                    style={{ background: "radial-gradient(circle, #E85002 0%, transparent 70%)" }}
                  />
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg glass-brand">
                        <Icon icon={GlobeIcon} size={13} className="text-brand" />
                      </div>
                      <h2 className="text-sm font-semibold text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>GitHub Integration</h2>
                    </div>
                    <button onClick={() => setShowScopeGuide(true)} className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:text-text-primary hover:bg-hover-strong transition-all duration-200" title="Which scopes to select?">
                      <Icon icon={HelpCircleIcon} size={15} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-4">
                    <Field label="Personal Access Token (classic)">
                      <Input
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        type="password"
                        placeholder={connected.github ? "•••••••• connected — enter a new token to replace" : "ghp_..."}
                      />
                    </Field>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Needs <code className="rounded bg-surface-inset px-1.5 py-0.5 font-mono text-[11px]">repo</code> scope. 
                      Create one in <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-brand underline">GitHub Settings → Tokens</a>.
                    </p>
                  </div>
                  <SectionFooter onSave={saveGithub} loading={savingGithub} />
                </Card>
              </motion.div>

              {/* Jira Integration */}
              <motion.div variants={fadeUp}>
                <Card variant="elevated" className="relative overflow-hidden p-6">
                  <div className="pointer-events-none absolute -right-12 -top-12 h-24 w-24 rounded-full opacity-[0.05] blur-2xl"
                    style={{ background: "radial-gradient(circle, #E85002 0%, transparent 70%)" }}
                  />
                  <SectionHeader icon={GitBranchIcon} title="Jira Integration" />
                  <div className="flex flex-col gap-4">
                    <Field label="Jira domain">
                      <Input
                        value={jira.domain}
                        onChange={(e) => setJira({ ...jira, domain: e.target.value })}
                        type="text"
                        placeholder="forge"
                      />
                    </Field>
                    <Field label="Account email">
                      <Input
                        value={jira.email}
                        onChange={(e) => setJira({ ...jira, email: e.target.value })}
                        type="email"
                        placeholder="you@company.com"
                      />
                    </Field>
                    <Field label="API token">
                      <Input
                        value={jira.token}
                        onChange={(e) => setJira({ ...jira, token: e.target.value })}
                        type="password"
                        placeholder={connected.jira ? "•••••••• connected — enter a new token to replace" : "ATATT..."}
                      />
                    </Field>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Your domain is the subdomain in <code className="rounded bg-surface-inset px-1.5 py-0.5 font-mono text-[11px]">https://&lt;domain&gt;.atlassian.net</code>.
                      Create a token in <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="text-brand underline">Atlassian Account → API tokens</a>.
                    </p>
                  </div>
                  <SectionFooter onSave={saveJira} loading={savingJira} />
                </Card>
              </motion.div>

              {/* Linear Integration */}
              <motion.div variants={fadeUp}>
                <Card variant="elevated" className="relative overflow-hidden p-6">
                  <div className="pointer-events-none absolute -right-12 -top-12 h-24 w-24 rounded-full opacity-[0.05] blur-2xl"
                    style={{ background: "radial-gradient(circle, #E85002 0%, transparent 70%)" }}
                  />
                  <SectionHeader icon={Layers01Icon} title="Linear Integration" />
                  <div className="flex flex-col gap-4">
                    <Field label="Personal API key">
                      <Input
                        value={linearToken}
                        onChange={(e) => setLinearToken(e.target.value)}
                        type="password"
                        placeholder={connected.linear ? "•••••••• connected — enter a new token to replace" : "lin_api_..."}
                      />
                    </Field>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Create one in <a href="https://linear.app/settings/account/security" target="_blank" rel="noopener noreferrer" className="text-brand underline">Linear Settings → Security & access → Personal API keys</a>.
                      Issues are created in your first team.
                    </p>
                  </div>
                  <SectionFooter onSave={saveLinear} loading={savingLinear} />
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

      <Modal open={showScopeGuide} onOpenChange={setShowScopeGuide} title="GitHub token scopes">
        <p className="mb-4 text-xs leading-relaxed text-text-secondary">
          When creating a <strong>classic personal access token</strong>, select the scope below so Forge can create repos, push files, and open issues.
        </p>
        <div className="rounded-2xl border border-hairline bg-brand/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-brand bg-brand text-white">
              <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="currentColor">
                <path fillRule="evenodd" d="M10.207 2.97a.75.75 0 010 1.06l-5.5 5.5a.75.75 0 01-1.06 0l-2.5-2.5a.75.75 0 011.06-1.06L4.25 7.94l4.97-4.97a.75.75 0 011.06 0z"/>
              </svg>
            </span>
            <div>
              <code className="font-mono text-[11px] text-text-primary font-semibold">repo</code>
              <div className="mt-0.5 text-[10px] text-text-secondary leading-relaxed">Full control of private repositories</div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-text-secondary leading-relaxed">
          That&apos;s the only one Forge needs. No need to toggle any other scopes.
        </p>
      </Modal>
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

function SectionFooter({ onSave, loading }: { onSave?: () => void; loading?: boolean }) {
  return (
    <div className="mt-6 flex justify-end">
      <Button size="sm" onClick={onSave} disabled={loading}>
        <Icon icon={SparklesIcon} size={13} />
        {loading ? "Saving…" : "Save changes"}
      </Button>
    </div>
  )
}
