"use client"

import * as React from "react"
import * as RT from "@radix-ui/react-tooltip"
import { cn } from "@/lib/utils"

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <RT.Provider delayDuration={200} skipDelayDuration={300}>{children}</RT.Provider>
}

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  className?: string
}

export function Tooltip({ content, children, side = "top", align = "center", className }: TooltipProps) {
  return (
    <RT.Root>
      <RT.Trigger asChild>{children}</RT.Trigger>
      <RT.Portal>
        <RT.Content
          side={side}
          align={align}
          sideOffset={8}
          className={cn(
            "z-[60] select-none rounded-full bg-surface-3 px-3 py-1.5 text-xs font-medium text-text-primary lift-3",
            className
          )}
        >
          {content}
        </RT.Content>
      </RT.Portal>
    </RT.Root>
  )
}
