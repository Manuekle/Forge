"use client"

import { useEffect, useRef, useState } from "react"

let diagramId = 0

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

export function MermaidDiagram({ definition }: { definition: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [id] = useState(() => `mermaid-${++diagramId}`)

  useEffect(() => {
    let cancelled = false

    async function render() {
      try {
        const { default: mermaid } = await import("mermaid")
        if (cancelled) return
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            background: "transparent",
            primaryColor: "#E85002",
            primaryTextColor: "#FAFAFA",
            primaryBorderColor: "#E8500240",
            lineColor: "#71717A",
            secondaryColor: "#18181B",
            tertiaryColor: "#121214",
            fontSize: "14px",
          },
        })
        if (cancelled) return
        const { svg } = await mermaid.render(id, definition)
        if (cancelled) return
        if (ref.current) ref.current.innerHTML = svg
        setLoading(false)
      } catch {
        if (!cancelled) setError(true)
        setLoading(false)
      }
    }
    render()
    return () => { cancelled = true }
  }, [definition, id])

  if (error) {
    return (
      <div className="my-3 overflow-auto rounded-2xl bg-black/30 p-4 font-mono text-[11px] leading-relaxed text-text-secondary ring-hair">
        <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted">Mermaid — render failed</div>
        <pre className="m-0 whitespace-pre-wrap">{definition}</pre>
      </div>
    )
  }

  return (
    <div className="my-3 overflow-auto rounded-2xl bg-surface-2 p-4 ring-hair">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted">{detectType(definition)}</span>
        {loading && <span className="h-1.5 w-1.5 animate-ping rounded-full bg-brand" />}
      </div>
      <div ref={ref} className="mermaid-diagram flex justify-center [&_svg]:max-w-full" />
    </div>
  )
}
