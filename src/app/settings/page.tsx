"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Shell } from "@/components/layout/shell"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Sparkles, Settings as SettingsIcon, User, Building2, Moon, Sun, Key, AlertTriangle
} from "lucide-react"

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") return (localStorage.getItem("forge-theme") as "dark" | "light") || "dark"
    return "dark"
  })
  function toggle() {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    localStorage.setItem("forge-theme", next)
    document.documentElement.classList.toggle("light", next === "light")
  }
  return { theme, toggle }
}

export default function SettingsPage() {
  const { theme, toggle } = useTheme()

  return (
    <Shell breadcrumb="Settings">
      <div className="p-8">
        <div className="mx-auto max-w-[680px]">
          <div className="mb-1 flex items-center gap-3">
            <SettingsIcon size={20} className="text-brand" />
            <h1 className="text-[28px] font-bold tracking-tight text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>Settings</h1>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your account, workspace, and API configuration.
          </p>

          <div className="mt-8 flex flex-col gap-5">
            {/* Profile */}
            <Section delay={0}>
              <SectionHeader icon={User} title="Profile" />
              <div className="flex flex-col gap-4">
                <Field label="Full name">
                  <Input defaultValue="Dana Reyes" type="text" />
                </Field>
                <Field label="Email">
                  <Input defaultValue="dana@forge.dev" type="email" />
                </Field>
              </div>
              <SectionFooter />
            </Section>

            {/* Workspace */}
            <Section delay={1}>
              <SectionHeader icon={Building2} title="Workspace" />
              <div className="flex flex-col gap-4">
                <Field label="Workspace name">
                  <Input defaultValue="Forge Team" type="text" />
                </Field>
                <Field label="Plan">
                  <Input defaultValue="Forge Pro" type="text" className="text-brand" readOnly />
                </Field>
              </div>
              <SectionFooter />
            </Section>

            {/* Appearance */}
            <Section delay={2}>
              <SectionHeader icon={theme === "dark" ? Moon : Sun} title="Appearance" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-text-primary">Theme</div>
                  <div className="mt-0.5 text-xs text-text-secondary">Switch between dark and light mode</div>
                </div>
                <button
                  onClick={toggle}
                  className="flex h-9 w-16 items-center rounded-full bg-surface-3 p-1 transition-colors"
                >
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white transition-transform ${theme === "light" ? "translate-x-7" : ""}`}
                  >
                    {theme === "dark" ? <Moon size={13} /> : <Sun size={13} />}
                  </div>
                </button>
              </div>
            </Section>

            {/* API Configuration */}
            <Section delay={3}>
              <SectionHeader icon={Key} title="API Configuration" />
              <div className="flex flex-col gap-4">
                <Field label="Azure OpenAI Endpoint">
                  <Input defaultValue={process.env.NEXT_PUBLIC_AZURE_ENDPOINT || ""} type="text" placeholder="https://your-resource.openai.azure.com" />
                </Field>
                <Field label="API Key">
                  <Input type="password" placeholder="sk-..." />
                </Field>
                <Field label="Deployment Name">
                  <Input defaultValue="grok-4-20-reasoning" type="text" />
                </Field>
                <Field label="Timeout (ms)">
                  <Input defaultValue="180000" type="number" />
                </Field>
              </div>
              <SectionFooter />
            </Section>

            {/* Danger Zone */}
            <Section delay={4}>
              <div className="flex items-center gap-3 rounded-xl bg-error/8 p-4">
                <AlertTriangle size={18} className="text-error" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-error">Danger Zone</div>
                  <div className="mt-0.5 text-xs text-text-secondary">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </div>
                </div>
                <Button variant="outline" size="sm" className="border-error/30 text-error hover:bg-error/12">
                  Delete account
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

function SectionHeader({ icon: Icon, title }: { icon: React.ComponentType<{ size?: number }>; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-subtle ring-hair">
        <Icon size={16} className="text-brand" />
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

function SectionFooter() {
  return (
    <div className="mt-6 flex justify-end pt-5 hairline-t">
      <Button size="sm">
        <Sparkles size={13} />
        Save changes
      </Button>
    </div>
  )
}
