import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { store } from "@/lib/store"
import {
  toPublicRecord,
  AGENT_LABELS,
  VOTE_LABELS,
  VOTE_COLORS,
  type PublicDecisionRecord,
} from "@/lib/public-record"

// Published records are immutable enough to cache at the edge for a minute.
export const revalidate = 60

async function load(shareId: string): Promise<PublicDecisionRecord | null> {
  const run = await store.getRunByShareId(shareId)
  if (!run || run.status !== "completed") return null
  return toPublicRecord(run)
}

export async function generateMetadata(
  { params }: { params: Promise<{ shareId: string }> }
): Promise<Metadata> {
  const { shareId } = await params
  const rec = await load(shareId)
  if (!rec) return { title: "Decision Record not found · Forge" }
  const title = `${rec.projectName} — Decision Record · Forge`
  const description =
    rec.consensus?.slice(0, 200) ||
    rec.strategy?.slice(0, 200) ||
    `How an AI product team decided to build ${rec.projectName}: plan, votes, dissent, and sources.`
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true },
  }
}

function ConfidenceGauge({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const r = 34
  const c = 2 * Math.PI * r
  const dash = (value * c).toFixed(1)
  const color = value >= 0.75 ? "#2ED47A" : value >= 0.5 ? "#FCD34D" : "#F87171"
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-hairline-strong)" strokeWidth="7" />
        <circle
          cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold text-text-primary">{pct}</span>
        <span className="text-[9px] uppercase tracking-wide text-muted">conf.</span>
      </div>
    </div>
  )
}

export default async function DecisionRecordPage(
  { params }: { params: Promise<{ shareId: string }> }
) {
  const { shareId } = await params
  const rec = await load(shareId)
  if (!rec) notFound()

  const label = (a: string) => AGENT_LABELS[a] ?? a
  const date = new Date(rec.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  })

  return (
    <div className="min-h-screen bg-canvas text-text-primary">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-hairline bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-brand text-sm font-bold text-white">F</span>
            <span className="text-sm font-semibold">Forge</span>
          </Link>
          <Link
            href="/"
            className="btn-brand rounded-full px-4 py-1.5 text-xs font-medium text-white"
          >
            Build your own
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        {/* Title */}
        <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-brand">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          Forge Decision Record
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{rec.projectName}</h1>
        {rec.projectDescription && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">{rec.projectDescription}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span>{date}</span>
          {rec.durationSeconds != null && <><span>·</span><span>decided in {rec.durationSeconds}s</span></>}
          {rec.planSource && <><span>·</span><span>{rec.planSource === "model" ? "AI-orchestrated" : "default"} plan</span></>}
        </div>

        {/* Consensus + confidence */}
        <section className="mt-8 rounded-3xl bg-surface p-6 lift-1 ring-hair">
          <div className="flex items-start gap-5">
            {rec.confidence != null && <ConfidenceGauge value={rec.confidence} />}
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">Consensus</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                {rec.consensus || "The team completed its analysis."}
              </p>
            </div>
          </div>
        </section>

        {/* Strategy / plan */}
        {(rec.strategy || rec.selected.length > 0) && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold">How the team approached it</h2>
            {rec.strategy && <p className="mb-4 text-sm leading-relaxed text-text-secondary">{rec.strategy}</p>}
            <div className="flex flex-col gap-2">
              {rec.selected.map((s) => (
                <div key={s.agent} className="rounded-2xl bg-surface p-4 ring-hair">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-brand-subtle px-2.5 py-0.5 text-xs font-medium text-brand">
                      {label(s.agent)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-text-secondary">{s.reason}</p>
                </div>
              ))}
              {rec.skipped.length > 0 && (
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                  <span className="font-medium">Skipped:</span>
                  {rec.skipped.map((s) => (
                    <span key={s.agent} title={s.reason} className="rounded-full bg-surface-2 px-2 py-0.5">
                      {label(s.agent)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Votes */}
        {rec.votes.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold">Votes &amp; dissent</h2>
            <div className="overflow-hidden rounded-2xl ring-hair">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Agent</th>
                    <th className="px-4 py-2.5 font-medium">Vote</th>
                    <th className="px-4 py-2.5 font-medium">Conf.</th>
                    <th className="px-4 py-2.5 font-medium">Concern</th>
                  </tr>
                </thead>
                <tbody>
                  {rec.votes.map((v) => (
                    <tr key={v.agent} className="border-t border-hairline bg-surface">
                      <td className="px-4 py-2.5 font-medium">{label(v.agent)}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs"
                          style={{ color: VOTE_COLORS[v.vote] ?? "#71717A" }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: VOTE_COLORS[v.vote] ?? "#71717A" }} />
                          {VOTE_LABELS[v.vote] ?? v.vote}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-text-secondary">
                        {v.confidence != null ? v.confidence.toFixed(2) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-text-secondary">{v.concerns || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Sources */}
        {rec.citations.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold">Grounded sources</h2>
            <div className="flex flex-col gap-2">
              {rec.citations.map((c) => (
                <div key={c.ref} className="rounded-2xl bg-surface p-4 ring-hair">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-muted">[{c.ref}]</span>
                    <span className="font-medium">{c.title}</span>
                    <span className="ml-auto text-muted">{c.source}</span>
                  </div>
                  {c.snippet && <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{c.snippet}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer CTA */}
        <footer className="mt-14 rounded-3xl bg-surface p-8 text-center lift-1 ring-hair">
          <h3 className="text-lg font-semibold">Turn your idea into a decision you can defend.</h3>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-text-secondary">
            Forge runs an AI product team — PM, UX, architect, QA — that plans, debates, votes, and
            ships traceable specs. Every decision comes with its receipts.
          </p>
          <Link
            href="/"
            className="btn-brand mt-5 inline-flex rounded-full px-6 py-2.5 text-sm font-medium text-white"
          >
            Build with Forge — free
          </Link>
        </footer>

        <p className="mt-6 text-center text-xs text-muted">
          Generated by <Link href="/" className="text-brand hover:underline">Forge</Link> · multi-agent product decisions of record
        </p>
      </main>
    </div>
  )
}
