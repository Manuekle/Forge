"use client"

import { motion } from "framer-motion"
import { Shell } from "@/components/layout/shell"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Sparkles, Settings as SettingsIcon, User, Building2 } from "lucide-react"

const sections = [
  {
    title: "Profile",
    icon: User,
    fields: [
      { label: "Full name", value: "Dana Reyes", type: "text" },
      { label: "Email", value: "dana@forge.dev", type: "email" },
    ],
  },
  {
    title: "Workspace",
    icon: Building2,
    fields: [
      { label: "Workspace name", value: "Forge Team", type: "text" },
      { label: "Plan", value: "Forge Pro", type: "text" },
    ],
  },
]

export default function SettingsPage() {
  return (
    <Shell breadcrumb="Settings">
      <div className="p-8">
        <div className="mx-auto max-w-[680px]">
          <div className="mb-1 flex items-center gap-3">
            <SettingsIcon size={20} className="text-brand" />
            <h1 className="text-[28px] font-bold tracking-tight text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>Settings</h1>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your account and workspace preferences.
          </p>

          <div className="mt-8 flex flex-col gap-5">
            {sections.map((section, i) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card variant="elevated" className="p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-subtle ring-hair">
                      <section.icon size={16} className="text-brand" />
                    </div>
                    <h2 className="text-sm font-semibold text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>{section.title}</h2>
                  </div>
                  <div className="flex flex-col gap-4">
                    {section.fields.map((field) => (
                      <div key={field.label}>
                        <label className="mb-1.5 block text-xs font-medium text-text-secondary">{field.label}</label>
                        <Input defaultValue={field.value} type={field.type} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex justify-end pt-5 hairline-t">
                    <Button size="sm">
                      <Sparkles size={13} />
                      Save changes
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  )
}
