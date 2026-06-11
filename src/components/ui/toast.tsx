"use client"

import * as React from "react"
import { createContext, useCallback, useContext, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckmarkCircle01Icon, AlertCircleIcon, InformationCircleIcon, SparklesIcon, Cancel01Icon } from "@hugeicons/core-free-icons"
import { Icon } from "./icon"
import { cn } from "@/lib/utils"

type ToastVariant = "default" | "success" | "error" | "info" | "brand"

interface ToastItem {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (t: Omit<ToastItem, "id"> & { variant?: ToastVariant }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>")
  return ctx
}

const iconFor: Record<ToastVariant, React.ReactNode> = {
  default: <Icon icon={SparklesIcon} size={16} className="text-brand" />,
  brand: <Icon icon={SparklesIcon} size={16} className="text-brand" />,
  success: <Icon icon={CheckmarkCircle01Icon} size={16} className="text-success" />,
  error: <Icon icon={AlertCircleIcon} size={16} className="text-error" />,
  info: <Icon icon={InformationCircleIcon} size={16} className="text-info" />,
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback<ToastContextValue["toast"]>((t) => {
    const id = Math.random().toString(36).slice(2)
    const item: ToastItem = { ...t, id, variant: t.variant ?? "default" }
    setToasts((prev) => [...prev, item])
    setTimeout(() => remove(id), 4200)
  }, [remove])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="pointer-events-auto flex items-start gap-3 rounded-[20px] bg-surface-3 px-4 py-3.5 lift-3"
            >
              <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-hover-strong">
                {iconFor[t.variant]}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="text-sm font-medium text-text-primary">{t.title}</div>
                {t.description && (
                  <div className="mt-0.5 text-xs leading-relaxed text-text-secondary">{t.description}</div>
                )}
              </div>
              <button
                onClick={() => remove(t.id)}
                className={cn(
                  "mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-muted",
                  "transition-colors hover:bg-hover-strong hover:text-text-primary"
                )}
              >
                <Icon icon={Cancel01Icon} size={13} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
