"use client"

import * as React from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const contentVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0 },
}

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function Modal({ open, onOpenChange, title, description, children, className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
                variants={overlayVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className={cn(
                  "fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2",
                  "rounded-[var(--radius-panel)] bg-surface-3 lift-modal",
                  className
                )}
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 25 }}
              >
                {(title || description) && (
                  <div className="flex items-start justify-between px-7 pt-7 pb-2">
                    <div>
                      {title && (
                        <Dialog.Title className="text-lg font-semibold tracking-tight text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>
                          {title}
                        </Dialog.Title>
                      )}
                      {description && (
                        <Dialog.Description className="text-sm text-text-secondary mt-1.5 leading-relaxed">
                          {description}
                        </Dialog.Description>
                      )}
                    </div>
                    <Dialog.Close asChild>
                      <button className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-text-primary hover:bg-white/[0.06] transition-all duration-200">
                        <X size={15} />
                      </button>
                    </Dialog.Close>
                  </div>
                )}
                {!title && !description && (
                  <Dialog.Close asChild>
                    <button className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-text-primary hover:bg-white/[0.06] transition-all duration-200 z-10">
                      <X size={15} />
                    </button>
                  </Dialog.Close>
                )}
                <div className="px-7 pb-7 pt-4">{children}</div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
