"use client"

import { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"

let diagramId = 0
let lastTheme: string | null = null

const diagramTypes: Record<string, string> = {
  graph: "Flowchart",
  flowchart: "Flowchart",
  sequenceDiagram: "Sequence Diagram",
  classDiagram: "Class Diagram",
  stateDiagram: "State Diagram",
  erDiagram: "Entity Relationship",
  gantt: "Gantt Chart",
  pie: "Pie Chart",
  requirementDiagram: "Requirement Diagram",
  journey: "User Journey",
  mindmap: "Mindmap",
  timeline: "Timeline",
  gitgraph: "Git Graph",
  architecture: "Architecture",
  c4: "C4 Diagram",
}

function detectType(def: string): string {
  const first = def.trim().split(/\s/)[0]
  return diagramTypes[first] || "Diagram"
}

/** Remove orphaned temp elements that mermaid leaves in document.body on render failure. */
function cleanupOrphanedElements(prefix: string) {
  try {
    const patterns = [`#d${prefix}`, `#i${prefix}`, `#${prefix}`]
    for (const sel of patterns) {
      const el = document.querySelector(sel)
      if (el) el.remove()
    }
  } catch { /* noop */ }
}

const darkThemeVariables = {
  background: "transparent",
  primaryColor: "#E85002",
  primaryTextColor: "#FAFAFA",
  primaryBorderColor: "#E8500240",
  lineColor: "#71717A",
  secondaryColor: "#18181B",
  tertiaryColor: "#121214",
  fontSize: "14px",
}

const lightThemeVariables = {
  background: "#F5F5F0",
  primaryColor: "#FFE9DB",
  primaryTextColor: "#1A1A1A",
  primaryBorderColor: "#E8500299",
  lineColor: "#52525B",
  secondaryColor: "#F0EFEB",
  tertiaryColor: "#FFFFFF",
  textColor: "#1A1A1A",
  fontSize: "14px",
}

export function MermaidDiagram({ definition }: { definition: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [id] = useState(() => `mermaid-${++diagramId}`)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme !== "light"

  useEffect(() => {
    let cancelled = false

    async function render() {
      const renderId = `${id}-${isDark ? "dark" : "light"}`
      try {
        const { default: mermaid } = await import("mermaid")
        if (cancelled) return

        const theme = isDark ? "dark" : "light"
        if (theme !== lastTheme) {
          lastTheme = theme
          mermaid.initialize({
            startOnLoad: false,
            suppressErrorRendering: true,
            theme: isDark ? "dark" : "base",
            themeVariables: isDark ? darkThemeVariables : lightThemeVariables,
          })
        }

        if (cancelled) return
        const { svg } = await mermaid.render(renderId, definition)
        if (cancelled) return
        if (ref.current) ref.current.innerHTML = svg
        setError(false)
        setLoading(false)
      } catch (err) {
        if (!cancelled) {
          console.warn("[mermaid] render failed", renderId, err)
          cleanupOrphanedElements(renderId)
          setError(true)
          setLoading(false)
        }
      }
    }
    render()
    return () => { cancelled = true }
  }, [definition, id, isDark])

  if (error) {
    return (
      <div className="my-3 overflow-auto rounded-2xl bg-surface-inset p-4 font-mono text-[11px] leading-relaxed text-text-secondary ring-hair">
        <div className="mb-2 text-[10px] font-medium text-muted">Mermaid — render failed</div>
        <pre className="m-0 whitespace-pre-wrap">{definition}</pre>
      </div>
    )
  }

  return (
    <div className="my-3 overflow-auto rounded-2xl bg-surface-2 p-4 ring-hair">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] font-medium text-muted">{detectType(definition)}</span>
        {loading && <span className="h-1.5 w-1.5 animate-ping rounded-full bg-brand" />}
      </div>
      <div ref={ref} className="mermaid-diagram flex justify-center [&_svg]:max-w-full" />
    </div>
  )
}
