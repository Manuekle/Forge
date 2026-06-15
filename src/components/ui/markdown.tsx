"use client"

import { useMemo } from "react"
import { MermaidDiagram } from "@/components/ui/mermaid-diagram"

function renderInline(text: string) {
  const out: React.ReactNode[] = []

  const step1 = text.split(/(\[S\d+\])/g)
  for (let i1 = 0; i1 < step1.length; i1++) {
    const s1 = step1[i1]
    if (/^\[S\d+\]$/.test(s1)) {
      out.push(
        <span key={`cite-${i1}`} className="inline-flex items-center justify-center rounded-full bg-brand/15 px-1.5 font-mono text-[10px] font-semibold text-brand">
          {s1.slice(1, -1)}
        </span>
      )
      continue
    }

    const step2 = s1.split(/(`[^`]+`)/g)
    for (let i2 = 0; i2 < step2.length; i2++) {
      const s2 = step2[i2]
      if (s2.startsWith("`") && s2.endsWith("`")) {
        out.push(<code key={`code-${i1}-${i2}`} className="rounded bg-hover-strong px-1 font-mono text-[11px] text-brand">{s2.slice(1, -1)}</code>)
        continue
      }

      const step3 = s2.split(/(\*\*[^*]+\*\*)/g)
      for (let i3 = 0; i3 < step3.length; i3++) {
        const s3 = step3[i3]
        if (s3.startsWith("**") && s3.endsWith("**")) {
          out.push(<strong key={`bold-${i1}-${i2}-${i3}`}>{s3.slice(2, -2)}</strong>)
          continue
        }

        const step4 = s3.split(/\*([^*]+)\*/g)
        for (let i4 = 0; i4 < step4.length; i4++) {
          if (i4 % 2 === 1) {
            out.push(<em key={`italic-${i1}-${i2}-${i3}-${i4}`}>{step4[i4]}</em>)
          } else if (step4[i4]) {
            out.push(step4[i4])
          }
        }
      }
    }
  }

  return out
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[S\d+\]/g, "")
    .replace(/#{1,6}\s+/g, "")
    .trim()
}

export function Markdown({ content }: { content: string }) {
  const rendered = useMemo(() => {
    let raw = content.trim()

    // Aggressively strip wrapping markdown code blocks (with or without 'markdown' label)
    // even if there's text before or after (common in LLM responses).
    // We look for the first ```markdown and the LAST ``` in the whole string.
    const startIdx = raw.indexOf("```markdown")
    const endIdx = raw.lastIndexOf("```")
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      // Only strip if the ```markdown is at the very beginning (ignoring whitespace)
      // or if it seems to be the intended main wrapper.
      if (startIdx < 20) {
        raw = raw.slice(startIdx + 11, endIdx).trim()
      }
    } else {
      // Also handle simple triple backtick wrappers without the 'markdown' label
      const simpleStart = raw.indexOf("```")
      if (simpleStart !== -1 && simpleStart < 20 && endIdx !== -1 && endIdx > simpleStart) {
        // Only if it's not a mermaid block
        if (!raw.slice(simpleStart).startsWith("```mermaid")) {
          raw = raw.slice(simpleStart + 3, endIdx).trim()
        }
      }
    }
    
    // Final cleanup of leading 'markdown' label
    raw = raw.replace(/^markdown\s+/i, "").trim()

    const lines = raw.split(/\r?\n/)
    const blocks: React.ReactNode[] = []
    let idx = 0
    let i = 0

    while (i < lines.length) {
      const trimmed = lines[i].trim()
      idx++

      // Code block
      if (trimmed.startsWith("```")) {
        const lang = trimmed.replace(/^```/, "").trim().toLowerCase()
        if (lang === "markdown") {
          // Transparency layer: ignore the marker and keep parsing content
          i++
          continue
        }

        const codeLines: string[] = []
        for (i++; i < lines.length && !lines[i].trim().startsWith("```"); i++) {
          codeLines.push(lines[i])
        }
        i++
        if (lang === "mermaid") {
          blocks.push(<MermaidDiagram key={idx} definition={codeLines.join("\n")} />)
        } else {
          blocks.push(
            <div key={idx} className="my-3 overflow-auto rounded-2xl bg-surface-inset p-4 font-mono text-[11px] leading-relaxed text-text-secondary ring-hair">
              {lang && <div className="mb-2 text-[10px] font-medium text-muted">{lang}</div>}
              <pre className="m-0 whitespace-pre-wrap">{codeLines.join("\n")}</pre>
            </div>
          )
        }
        continue
      }

      // Unwrapped Mermaid diagram (LLMs sometimes omit the triple backticks)
      const isMermaidStart =
        trimmed.startsWith("graph ") ||
        trimmed.startsWith("flowchart ") ||
        trimmed.startsWith("sequenceDiagram") ||
        trimmed.startsWith("classDiagram") ||
        trimmed.startsWith("stateDiagram") ||
        trimmed.startsWith("erDiagram") ||
        trimmed.startsWith("gantt") ||
        trimmed.startsWith("pie") ||
        trimmed.startsWith("journey") ||
        trimmed.startsWith("mindmap") ||
        trimmed.startsWith("timeline") ||
        trimmed.startsWith("gitgraph") ||
        trimmed.startsWith("architecture") ||
        trimmed.startsWith("c4")

      if (isMermaidStart) {
        const mermaidLines: string[] = []
        while (i < lines.length) {
          const l = lines[i].trim()
          if (mermaidLines.length > 0 && (!l || l.startsWith("#") || l.startsWith("```") || l.startsWith("|") || l.startsWith("> "))) break
          mermaidLines.push(lines[i])
          i++
        }
        if (mermaidLines.length > 0) {
          blocks.push(<MermaidDiagram key={idx} definition={mermaidLines.join("\n")} />)
          continue
        }
      }

      // Table row
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        const rows: string[][] = []
        while (i < lines.length) {
          const t = lines[i].trim()
          if (!t.startsWith("|") || !t.endsWith("|")) break
          rows.push(t.split("|").filter((c, ci) => ci > 0 && ci < t.split("|").length - 1).map((c) => c.trim()))
          i++
        }
        const dataRows = rows.filter((r) => !r.every((c) => /^[ :-]+$/.test(c)))
        if (dataRows.length > 0) {
          blocks.push(
            <div key={idx} className="my-3 overflow-auto">
              <table className="w-full border-collapse text-xs">
                <tbody>
                  {dataRows.map((row, ri) => (
                    <tr key={ri} className={ri === 0 ? "border-b border-hairline font-semibold" : ri % 2 === 0 ? "bg-hover/30" : ""}>
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-4 py-2.5 text-left text-text-secondary">{renderInline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        continue
      }

      // Horizontal rule
      if (/^---+$/.test(trimmed)) {
        i++
        blocks.push(<div key={idx} className="my-4 border-t border-hairline" />)
        continue
      }

      // Blockquote
      if (trimmed.startsWith("> ")) {
        const quoteLines: string[] = []
        while (i < lines.length && lines[i].trim().startsWith("> ")) {
          quoteLines.push(lines[i].trim().replace(/^>\s*/, ""))
          i++
        }
        blocks.push(
          <div key={idx} className="my-2 rounded-r-2xl border-l-2 border-brand/40 bg-brand-subtle px-4 py-2 text-sm leading-relaxed text-text-secondary">
            {quoteLines.map((ql, qi) => (
              <div key={qi}>{renderInline(ql)}</div>
            ))}
          </div>
        )
        continue
      }

      // Heading # to ######
      const hMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
      if (hMatch) {
        i++
        const level = hMatch[1].length
        const text = hMatch[2]
        const cls = level === 1
          ? "mb-4 mt-6 text-base font-bold text-text-primary"
          : level === 2
          ? "mb-2 mt-5 text-sm font-semibold text-text-primary border-b border-hairline pb-1"
          : "mb-1 mt-4 text-sm font-semibold text-text-primary"
        
        const Tag = (level === 1 ? "h1" : level === 2 ? "h2" : "h3") as "h1" | "h2" | "h3"
        blocks.push(<Tag key={idx} className={cls}>{renderInline(text)}</Tag>)
        continue
      }

      // List items (unordered/ordered)
      const isUList = /^[-*+]\s/.test(trimmed)
      const isOList = /^(\d+)[.)]\s/.test(trimmed)

      if (isUList || isOList) {
        const items: string[] = []
        const isOrdered = isOList
        const listNums: string[] = []

        while (i < lines.length) {
          const l = lines[i].trim()
          if (isOrdered) {
            const m = l.match(/^(\d+)[.)]\s+(.*)$/)
            if (!m) break
            listNums.push(m[1])
            items.push(m[2])
          } else {
            if (!/^[-*+]\s/.test(l)) break
            items.push(l.replace(/^[-*+]\s*/, ""))
          }
          i++
        }

        blocks.push(
          <div key={idx} className="my-1 flex flex-col gap-1 pl-4">
            {items.map((item, ii) => (
              <div key={ii} className="flex gap-2 text-sm">
                {isOrdered ? (
                  <span className="mt-px font-mono text-[11px] text-text-secondary/60">{listNums[ii]}.</span>
                ) : (
                  <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-text-secondary/40" />
                )}
                <div className="min-w-0 flex-1">{renderInline(item)}</div>
              </div>
            ))}
          </div>
        )
        continue
      }

      // Empty line
      if (!trimmed) {
        i++
        blocks.push(<div key={idx} className="h-2" />)
        continue
      }

      // Normal paragraph (group consecutive text lines)
      const paragraphLines: string[] = []
      while (i < lines.length) {
        const l = lines[i].trim()
        if (!l || l.startsWith("#") || l.startsWith("```") || l.startsWith("|") || l.startsWith("> ") || /^[-*+]\s/.test(l) || /^(\d+)[.)]\s/.test(l)) break
        paragraphLines.push(lines[i])
        i++
      }
      if (paragraphLines.length > 0) {
        blocks.push(
          <div key={idx} className="text-sm leading-relaxed text-text-secondary">{renderInline(paragraphLines.join(" "))}</div>
        )
      }
    }

    return blocks
  }, [content])

  return <div className="space-y-0.5">{rendered}</div>
}
