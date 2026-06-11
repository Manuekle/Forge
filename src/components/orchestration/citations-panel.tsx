"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"
import { Book01Icon, Cancel01Icon } from "@hugeicons/core-free-icons"
import type { RunCitation } from "@/lib/store"

/**
 * Grounded-sources panel: every citation the run retrieved, clickable, with a
 * detail view showing the snippet and a relevance-quality indicator. Makes
 * "this came from evidence" visible.
 */
export function CitationsPanel({ citations }: { citations: RunCitation[] }) {
  const [selected, setSelected] = useState<RunCitation | null>(null)

  if (citations.length === 0) {
    return (
      <div className="rounded-2xl bg-surface-inset p-6 text-center text-xs text-muted ring-hair">
        No grounded sources for this run.
      </div>
    )
  }

  const maxScore = Math.max(...citations.map((c) => c.score), 1)

  return (
    <div className="flex flex-col gap-1.5">
      {citations.map((c) => {
        const quality = c.score / maxScore
        const active = selected?.ref === c.ref
        return (
          <div key={c.ref}>
            <button
              onClick={() => setSelected(active ? null : c)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left ring-hair transition-all duration-200",
                active ? "bg-surface-2 ring-hair-strong" : "bg-surface-inset hover:bg-surface-2"
              )}
            >
              <span className="flex-shrink-0 font-mono text-xs text-brand">[{c.ref}]</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs text-text-primary">{c.title}</div>
                <div className="truncate text-[10px] text-muted">{c.source}</div>
              </div>
              {/* Relevance quality indicator */}
              <div className="flex flex-shrink-0 items-center gap-1.5" title={`retrieval score ${c.score}`}>
                <div className="flex h-1 w-12 overflow-hidden rounded-full bg-surface-inset ring-hair">
                  <span
                    className="rounded-full bg-brand"
                    style={{ width: `${Math.max(quality * 100, 8)}%`, opacity: 0.4 + quality * 0.6 }}
                  />
                </div>
                <span className="font-mono text-[9px] text-muted">{c.score}</span>
              </div>
            </button>
            <AnimatePresence>
              {active && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mx-2 mt-1.5 rounded-2xl bg-surface-inset p-4 ring-hair">
                    <div className="mb-2 flex items-center gap-2">
                      <Icon icon={Book01Icon} size={13} className="text-brand" />
                      <span className="text-xs font-medium text-text-primary">{c.title}</span>
                      <button onClick={() => setSelected(null)} className="ml-auto text-muted hover:text-text-primary">
                        <Icon icon={Cancel01Icon} size={12} />
                      </button>
                    </div>
                    <blockquote className="border-l-2 border-brand/40 pl-3 text-xs italic leading-relaxed text-text-secondary">
                      “{c.snippet}”
                    </blockquote>
                    <div className="mt-2.5 flex items-center gap-3 text-[10px] text-muted">
                      <span>{c.source}</span>
                      <span>·</span>
                      <span>retrieval score {c.score}</span>
                      <span>·</span>
                      <span>cited inline as [{c.ref}]</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
