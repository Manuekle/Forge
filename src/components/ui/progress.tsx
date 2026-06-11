"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps {
  value: number
  className?: string
}

function Progress({ value, className }: ProgressProps) {
  const pct = Math.min(Math.max(value, 0), 100)
  return (
    <div className={cn("h-1.5 w-full rounded-full bg-hover-strong overflow-hidden", className)}>
      <div
        className="h-full rounded-full gradient-brand-soft transition-all duration-700 ease-out"
        style={{
          width: `${pct}%`,
          boxShadow: pct > 0 ? "0 0 12px rgba(232,80,2,0.45)" : "none",
        }}
      />
    </div>
  )
}

export { Progress }
