"use client"

import { useState, useEffect, useRef } from "react"
import { flushSync } from "react-dom"
import { useTheme } from "next-themes"
import { Moon02Icon, Sun01Icon } from "@hugeicons/core-free-icons"
import { Icon } from "@/components/ui/icon"

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const buttonRef = useRef<HTMLButtonElement>(null)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return <div className="h-9 w-9 rounded-full" />

  const nextTheme = theme === "dark" ? "light" : "dark"

  const switchTheme = () => {
    const button = buttonRef.current
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (!button || !document.startViewTransition || reducedMotion) {
      setTheme(nextTheme)
      return
    }
    // Circular reveal expanding from the toggle button
    const { top, left, width, height } = button.getBoundingClientRect()
    const x = left + width / 2
    const y = top + height / 2
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    )
    document
      .startViewTransition(() => {
        flushSync(() => setTheme(nextTheme))
      })
      .ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${radius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 450,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            pseudoElement: "::view-transition-new(root)",
          },
        )
      })
  }

  return (
    <button
      ref={buttonRef}
      onClick={switchTheme}
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-all hover:bg-surface-2 hover:text-text-primary"
      title={`Switch to ${nextTheme} mode`}
    >
      {theme === "dark" ? <Icon icon={Moon02Icon} size={15} /> : <Icon icon={Sun01Icon} size={15} />}
    </button>
  )
}
