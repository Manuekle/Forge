"use client"

import { ThemeProvider } from "next-themes"
import { MotionConfig } from "framer-motion"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ToastProvider } from "@/components/ui/toast"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <MotionConfig reducedMotion="user">
        <TooltipProvider>
          <ToastProvider>{children}</ToastProvider>
        </TooltipProvider>
      </MotionConfig>
    </ThemeProvider>
  )
}
