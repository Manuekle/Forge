"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Modal } from "@/components/ui/modal"
import { ArrowExpand01Icon, RefreshIcon } from "@hugeicons/core-free-icons"
import { Icon } from "@/components/ui/icon"

let renderSeq = 0
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
  const first = def.trim().split(/\s/)[0].replace(/-v2$/, "")
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

/** Normalize characters LLMs emit that the mermaid parser chokes on. */
function normalizeDefinition(def: string): string {
  return def
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/→/g, " to ")
    .replace(/ /g, " ")
    .replace(/[​-‍﻿]/g, "")
    .trim()
}

const RISKY_LABEL = /[<>()&;]/

/**
 * Wrap flowchart node/edge labels containing parser-breaking characters
 * (<, >, parens, &, ;) in quotes — mermaid accepts almost anything quoted.
 * Only used as a retry after the raw definition fails.
 */
function quoteFlowchartLabels(def: string): string {
  return def
    .split("\n")
    .map((line) => {
      let out = line.replace(/\[([^"\][]+)\]/g, (m, t: string) =>
        RISKY_LABEL.test(t) ? `["${t.replace(/"/g, "'")}"]` : m
      )
      out = out.replace(/\{([^"{}]+)\}/g, (m, t: string) =>
        RISKY_LABEL.test(t) ? `{"${t.replace(/"/g, "'")}"}` : m
      )
      out = out.replace(/\|([^"|]+)\|/g, (m, t: string) =>
        RISKY_LABEL.test(t) ? `|"${t.replace(/"/g, "'")}"|` : m
      )
      return out
    })
    .join("\n")
}

function candidates(def: string): string[] {
  const normalized = normalizeDefinition(def)
  const list = [normalized]
  const type = normalized.trim().split(/\s/)[0]
  if (type === "graph" || type === "flowchart") {
    const quoted = quoteFlowchartLabels(normalized)
    if (quoted !== normalized) list.push(quoted)
  }
  return list
}

const darkThemeVariables = {
  darkMode: true,
  background: "transparent",
  fontSize: "14px",
  primaryColor: "#1F1F23",
  primaryTextColor: "#FAFAFA",
  primaryBorderColor: "#E85002",
  secondaryColor: "#18181B",
  tertiaryColor: "#121214",
  lineColor: "#71717A",
  textColor: "#E4E4E7",
  mainBkg: "#1F1F23",
  nodeBorder: "#E85002",
  clusterBkg: "#141417",
  clusterBorder: "#3F3F46",
  titleColor: "#FAFAFA",
  edgeLabelBackground: "#18181B",
  actorBkg: "#1F1F23",
  actorBorder: "#E85002",
  actorTextColor: "#FAFAFA",
  actorLineColor: "#52525B",
  signalColor: "#A1A1AA",
  signalTextColor: "#E4E4E7",
  labelBoxBkgColor: "#18181B",
  labelBoxBorderColor: "#3F3F46",
  labelTextColor: "#FAFAFA",
  loopTextColor: "#FAFAFA",
  noteBkgColor: "#2A2A2E",
  noteTextColor: "#FAFAFA",
  noteBorderColor: "#3F3F46",
  activationBkgColor: "#27272A",
  activationBorderColor: "#E85002",
}

const lightThemeVariables = {
  darkMode: false,
  background: "transparent",
  fontSize: "14px",
  primaryColor: "#FFE9DB",
  primaryTextColor: "#1A1A1A",
  primaryBorderColor: "#E85002",
  secondaryColor: "#F0EFEB",
  tertiaryColor: "#FFFFFF",
  lineColor: "#52525B",
  textColor: "#1A1A1A",
  mainBkg: "#FFE9DB",
  nodeBorder: "#E85002",
  clusterBkg: "#F0EFEB",
  clusterBorder: "#D4D4D8",
  titleColor: "#1A1A1A",
  edgeLabelBackground: "#F5F5F0",
  actorBkg: "#FFE9DB",
  actorBorder: "#E85002",
  actorTextColor: "#1A1A1A",
  actorLineColor: "#A1A1AA",
  signalColor: "#52525B",
  signalTextColor: "#1A1A1A",
  labelBoxBkgColor: "#F0EFEB",
  labelBoxBorderColor: "#D4D4D8",
  labelTextColor: "#1A1A1A",
  loopTextColor: "#1A1A1A",
  noteBkgColor: "#FFF4E0",
  noteTextColor: "#1A1A1A",
  noteBorderColor: "#E8D5B5",
  activationBkgColor: "#F0EFEB",
  activationBorderColor: "#E85002",
}

export function MermaidDiagram({ definition }: { definition: string }) {
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [retryCounter, setRetryCounter] = useState(0)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme !== "light"

  useEffect(() => {
    let cancelled = false

    async function render() {
      try {
        const { default: mermaid } = await import("mermaid")
        if (cancelled) return

        const theme = isDark ? "dark" : "light"
        if (theme !== lastTheme) {
          lastTheme = theme
          mermaid.initialize({
            startOnLoad: false,
            suppressErrorRendering: true,
            theme: "base",
            themeVariables: isDark ? darkThemeVariables : lightThemeVariables,
          })
        }

        for (const def of candidates(definition)) {
          const renderId = `mermaid-r${++renderSeq}`
          try {
            const result = await mermaid.render(renderId, def)
            if (cancelled) return
            setSvg(result.svg)
            setError(false)
            return
          } catch (err) {
            cleanupOrphanedElements(renderId)
            if (cancelled) return
            console.warn("[mermaid] render attempt failed", renderId, err)
          }
        }
        if (!cancelled) {
          setSvg(null)
          setError(true)
        }
      } catch {
        if (!cancelled) {
          setSvg(null)
          setError(true)
        }
      }
    }
    render()
    return () => { cancelled = true }
  }, [definition, isDark, retryCounter])

  if (error) {
    return (
      <div className="group/diagram my-3 overflow-auto rounded-2xl bg-surface-inset p-4 font-mono text-[11px] leading-relaxed text-text-secondary ring-hair">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[10px] font-medium text-muted">Mermaid — render failed</span>
          <button
            onClick={() => setRetryCounter((c) => c + 1)}
            className="ml-auto flex h-6 w-6 items-center justify-center rounded-full text-muted opacity-0 transition-all duration-200 hover:bg-hover-strong hover:text-text-primary group-hover/diagram:opacity-100"
            title="Retry render"
            aria-label="Retry render"
          >
            <Icon icon={RefreshIcon} size={13} />
          </button>
        </div>
        <pre className="m-0 whitespace-pre-wrap">{definition}</pre>
      </div>
    )
  }

  return (
    <>
      <div className="group/diagram my-3 overflow-auto rounded-2xl bg-surface-2 p-4 ring-hair">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[10px] font-medium text-muted">{detectType(definition)}</span>
          {!svg && <span className="h-1.5 w-1.5 animate-ping rounded-full bg-brand" />}
          {svg && (
            <button
              onClick={() => setExpanded(true)}
              className="ml-auto flex h-6 w-6 items-center justify-center rounded-full text-muted opacity-0 transition-all duration-200 hover:bg-hover-strong hover:text-text-primary group-hover/diagram:opacity-100"
              title="Expand diagram"
              aria-label="Expand diagram"
            >
              <Icon icon={ArrowExpand01Icon} size={13} />
            </button>
          )}
        </div>
        {svg && (
          <div
            className="mermaid-diagram flex justify-center [&_svg]:max-w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
      </div>

      <Modal
        open={expanded}
        onOpenChange={setExpanded}
        title={detectType(definition)}
        className="max-w-[94vw] xl:max-w-6xl"
      >
        {svg && (
          <div className="max-h-[78vh] overflow-auto rounded-2xl bg-surface-2 p-6 ring-hair">
            <div
              className="flex justify-center [&_svg]:h-auto [&_svg]:w-full [&_svg]:!max-w-none"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        )}
      </Modal>
    </>
  )
}
