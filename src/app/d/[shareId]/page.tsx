import type { Metadata } from "next"
import Image from "next/image"
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

const syne = { fontFamily: "var(--font-syne)" }

function Brand({ size = "sm" }: { size?: "sm" | "lg" }) {
  const dim = size === "lg" ? 30 : 24
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <Image
        src="/logo.png"
        alt="Forge"
        width={dim}
        height={dim}
        className="transition-transform duration-300 group-hover:scale-105"
        style={{ height: dim, width: dim }}
      />
      <span
        className={`font-semibold tracking-tight text-text-primary ${size === "lg" ? "text-lg" : "text-[15px]"}`}
        style={syne}
      >
        Forge
      </span>
    </Link>
  )
}

function ConfidenceGauge({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const r = 34
  const c = 2 * Math.PI * r
  const dash = (value * c).toFixed(1)
  const color = value >= 0.75 ? "#2ED47A" : value >= 0.5 ? "#FCD34D" : "#F87171"
  return (
    <div className="relative h-[88px] w-[88px] shrink-0">
      <svg viewBox="0 0 80 80" className="h-[88px] w-[88px] -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-hairline-strong)" strokeWidth="6" />
        <circle
          cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-text-primary" style={syne}>{pct}</span>
        <span className="text-[9px] uppercase tracking-[0.12em] text-muted">confidence</span>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="h-px w-6 bg-gradient-to-r from-brand to-transparent" />
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{children}</h2>
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
    <div className="relative min-h-screen overflow-hidden bg-canvas text-text-primary">
      {/* Atmosphere: brand aurora + grain, matching the app shell */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] aurora opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-noise" />

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-hairline bg-canvas/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <Brand />
          <Link
            href="/"
            className="btn-brand sheen rounded-full px-4 py-1.5 text-xs font-semibold text-brand-fg"
          >
            Build your own
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-5 pb-16 pt-12">
        {/* Eyebrow */}
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-subtle px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand ring-hair">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-50" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
          </span>
          Decision Record
        </div>

        {/* Title */}
        <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl" style={syne}>
          {rec.projectName}
        </h1>
        {rec.projectDescription && (
          <p className="mt-3.5 max-w-2xl text-[15px] leading-relaxed text-text-secondary">
            {rec.projectDescription}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span>{date}</span>
          {rec.durationSeconds != null && <><span className="text-faint">·</span><span>decided in {rec.durationSeconds}s</span></>}
          {rec.planSource && <><span className="text-faint">·</span><span>{rec.planSource === "model" ? "AI-orchestrated" : "default"} plan</span></>}
        </div>

        {/* Consensus + confidence */}
        <section className="mt-9 overflow-hidden rounded-[var(--radius-card)] gradient-card p-7 lift-2 ring-hair">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            {rec.confidence != null && <ConfidenceGauge value={rec.confidence} />}
            <div className="min-w-0">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">Consensus</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-text-primary">
                {rec.consensus || "The team completed its analysis."}
              </p>
            </div>
          </div>
        </section>

        {/* Strategy / plan */}
        {(rec.strategy || rec.selected.length > 0) && (
          <section className="mt-10">
            <SectionLabel>How the team approached it</SectionLabel>
            {rec.strategy && (
              <p className="mb-5 text-[15px] leading-relaxed text-text-secondary">{rec.strategy}</p>
            )}
            <div className="flex flex-col gap-2.5">
              {rec.selected.map((s) => (
                <div
                  key={s.agent}
                  className="rounded-2xl bg-surface p-4 ring-hair transition-shadow hover:lift-1"
                >
                  <span className="inline-flex rounded-full bg-brand-subtle px-2.5 py-0.5 text-xs font-semibold text-brand ring-hair">
                    {label(s.agent)}
                  </span>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">{s.reason}</p>
                </div>
              ))}
              {rec.skipped.length > 0 && (
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                  <span className="font-medium">Skipped</span>
                  {rec.skipped.map((s) => (
                    <span key={s.agent} title={s.reason} className="rounded-full bg-surface-2 px-2 py-0.5 ring-hair">
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
          <section className="mt-10">
            <SectionLabel>Votes &amp; dissent</SectionLabel>
            <div className="overflow-hidden rounded-2xl bg-surface ring-hair">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-2 text-[11px] uppercase tracking-[0.1em] text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Agent</th>
                    <th className="px-4 py-3 font-semibold">Vote</th>
                    <th className="px-4 py-3 font-semibold">Conf.</th>
                    <th className="px-4 py-3 font-semibold">Concern</th>
                  </tr>
                </thead>
                <tbody>
                  {rec.votes.map((v) => (
                    <tr key={v.agent} className="border-t border-hairline">
                      <td className="px-4 py-3 font-medium text-text-primary">{label(v.agent)}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ color: VOTE_COLORS[v.vote] ?? "#71717A", background: `${VOTE_COLORS[v.vote] ?? "#71717A"}1a` }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: VOTE_COLORS[v.vote] ?? "#71717A" }} />
                          {VOTE_LABELS[v.vote] ?? v.vote}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                        {v.confidence != null ? v.confidence.toFixed(2) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary">{v.concerns || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Sources */}
        {rec.citations.length > 0 && (
          <section className="mt-10">
            <SectionLabel>Grounded sources</SectionLabel>
            <div className="flex flex-col gap-2.5">
              {rec.citations.map((c) => (
                <div key={c.ref} className="rounded-2xl bg-surface p-4 ring-hair">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-muted ring-hair">[{c.ref}]</span>
                    <span className="font-medium text-text-primary">{c.title}</span>
                    <span className="ml-auto shrink-0 text-muted">{c.source}</span>
                  </div>
                  {c.snippet && <p className="mt-2 text-xs leading-relaxed text-text-secondary">{c.snippet}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer CTA */}
        <footer className="relative mt-16 overflow-hidden rounded-[var(--radius-panel)] gradient-card p-9 text-center lift-2 ring-hair">
          <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-brand to-transparent opacity-60" />
          <div className="mb-5 flex justify-center">
            <Brand size="lg" />
          </div>
          <h3 className="text-2xl font-semibold tracking-tight" style={syne}>
            Turn your idea into a decision you can defend.
          </h3>
          <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-text-secondary">
            Forge runs an AI product team — PM, UX, architect, QA — that plans, debates, votes, and
            ships traceable specs. Every decision comes with its receipts.
          </p>
          <Link
            href="/"
            className="btn-brand sheen mt-6 inline-flex rounded-full px-6 py-2.5 text-sm font-semibold text-brand-fg"
          >
            Build with Forge — free
          </Link>
        </footer>

        <p className="mt-7 text-center text-xs text-muted">
          Generated by{" "}
          <Link href="/" className="font-medium text-brand hover:text-brand-hover">Forge</Link>
          {" "}· multi-agent product decisions of record
        </p>
      </main>
    </div>
  )
}
