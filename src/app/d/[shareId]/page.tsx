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
  const color = value >= 0.75 ? "var(--color-success)" : value >= 0.5 ? "var(--color-warning)" : "var(--color-error)"
  return (
    <div className="relative h-[92px] w-[92px] shrink-0">
      <svg viewBox="0 0 80 80" className="h-[92px] w-[92px] -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-hairline-strong)" strokeWidth="5" />
        <circle
          cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 8px ${color}44)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tracking-tight text-text-primary leading-none" style={syne}>{pct}%</span>
        <span className="mt-0.5 text-[10px] font-medium text-muted">Confidence</span>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <h2 className="text-[13px] font-semibold tracking-tight text-muted/80">{children}</h2>
      <div className="h-px flex-1 bg-gradient-to-r from-hairline to-transparent" />
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
    <div className="relative min-h-screen overflow-hidden bg-canvas text-text-primary selection:bg-brand/20">
      {/* Atmosphere: brand aurora + grain, matching the app shell */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[640px] aurora opacity-80" />
      <div className="pointer-events-none absolute inset-0 bg-noise opacity-[0.03]" />

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-hairline bg-canvas/60 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Brand />
          <Link
            href="/"
            className="btn-brand sheen rounded-full px-5 py-2 text-xs font-bold text-brand-fg"
          >
            Create yours
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-6 pb-24 pt-16">
        {/* Eyebrow */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand/5 px-3 py-1 text-[11px] font-bold tracking-tight text-brand ring-1 ring-brand/20">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-40" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
          </span>
          Decision record
        </div>

        {/* Title */}
        <h1 className="gradient-text text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl" style={syne}>
          {rec.projectName}
        </h1>
        {rec.projectDescription && (
          <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-text-secondary/90">
            {rec.projectDescription}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] font-medium text-muted/60">
          <span className="flex items-center gap-2">
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 opacity-50">
              <path d="M8 4V8L10.5 9.5M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {date}
          </span>
          {rec.durationSeconds != null && (
            <span className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-faint/30" />
              Decided in {rec.durationSeconds}s
            </span>
          )}
          {rec.planSource && (
            <span className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-faint/30" />
              {rec.planSource === "model" ? "AI-orchestrated" : "Standard"} plan
            </span>
          )}
        </div>

        {/* Consensus + confidence */}
        <section className="halo-warm mt-12 overflow-hidden rounded-[var(--radius-card)] p-px ring-1 ring-white/10">
          <div className="gradient-card flex flex-col items-start gap-8 rounded-[calc(var(--radius-card)-1px)] p-8 sm:flex-row sm:items-center">
            {rec.confidence != null && <ConfidenceGauge value={rec.confidence} />}
            <div className="min-w-0">
              <h2 className="text-[12px] font-bold tracking-tight text-brand">Consensus</h2>
              <p className="mt-2.5 text-[17px] font-medium leading-relaxed text-text-primary">
                {rec.consensus || "The team completed its analysis."}
              </p>
            </div>
          </div>
        </section>

        {/* Strategy / plan */}
        {(rec.strategy || rec.selected.length > 0) && (
          <section className="mt-14">
            <SectionLabel>Strategy & Implementation</SectionLabel>
            {rec.strategy && (
              <p className="mb-7 text-[16px] leading-relaxed text-text-secondary">{rec.strategy}</p>
            )}
            <div className="flex flex-col gap-3">
              {rec.selected.map((s) => (
                <div
                  key={s.agent}
                  className="group relative rounded-2xl bg-surface/50 p-5 ring-1 ring-hairline transition-all hover:bg-surface hover:ring-hairline-strong"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex rounded-full bg-brand-subtle px-2.5 py-1 text-[11px] font-bold text-brand ring-1 ring-brand/20">
                      {label(s.agent)}
                    </span>
                  </div>
                  <p className="mt-3 text-[15px] leading-relaxed text-text-secondary group-hover:text-text-primary transition-colors">{s.reason}</p>
                </div>
              ))}
              {rec.skipped.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-muted">
                  <span className="font-semibold text-muted/60">Skipped phases:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {rec.skipped.map((s) => (
                      <span key={s.agent} title={s.reason} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium ring-1 ring-hairline">
                        {label(s.agent)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Votes */}
        {rec.votes.length > 0 && (
          <section className="mt-14">
            <SectionLabel>Collaborative alignment</SectionLabel>
            <div className="overflow-hidden rounded-2xl bg-surface/30 ring-1 ring-hairline">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-surface-2/50 text-muted/80">
                  <tr>
                    <th className="px-5 py-4 font-bold">Agent</th>
                    <th className="px-5 py-4 font-bold">Vote</th>
                    <th className="px-5 py-4 font-bold text-center">Confidence</th>
                    <th className="px-5 py-4 font-bold">Primary concern</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {rec.votes.map((v) => (
                    <tr key={v.agent} className="transition-colors hover:bg-white/[0.02]">
                      <td className="px-5 py-4 font-bold text-text-primary">{label(v.agent)}</td>
                      <td className="px-5 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold shadow-sm"
                          style={{ color: VOTE_COLORS[v.vote] ?? "#71717A", background: `${VOTE_COLORS[v.vote] ?? "#71717A"}15`, ring: `1px solid ${VOTE_COLORS[v.vote] ?? "#71717A"}33` }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: VOTE_COLORS[v.vote] ?? "#71717A" }} />
                          {VOTE_LABELS[v.vote] ?? v.vote}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="font-mono text-xs font-semibold text-text-secondary bg-surface-2 px-2 py-0.5 rounded-md ring-1 ring-hairline">
                          {v.confidence != null ? v.confidence.toFixed(2) : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs leading-relaxed text-text-secondary">{v.concerns || "No major concerns raised."}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Sources */}
        {rec.citations.length > 0 && (
          <section className="mt-14">
            <SectionLabel>Grounded intelligence</SectionLabel>
            <div className="grid gap-3">
              {rec.citations.map((c) => (
                <div key={c.ref} className="group relative rounded-2xl bg-surface/40 p-5 ring-1 ring-hairline transition-all hover:bg-surface hover:ring-hairline-strong">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 min-w-[24px] items-center justify-center rounded-lg bg-surface-3 font-mono text-[11px] font-bold text-brand ring-1 ring-hairline">
                      {c.ref}
                    </span>
                    <span className="text-[14px] font-bold text-text-primary line-clamp-1">{c.title}</span>
                    <span className="ml-auto shrink-0 text-[11px] font-bold tracking-tight text-muted/60">{c.source}</span>
                  </div>
                  {c.snippet && (
                    <p className="mt-3 text-[13px] leading-relaxed text-text-secondary group-hover:text-text-secondary transition-colors line-clamp-2 italic opacity-80">
                      "{c.snippet}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer CTA */}
        <footer className="neon-card mt-24 overflow-hidden rounded-[var(--radius-panel)] p-px">
          <div className="gradient-card relative flex flex-col items-center rounded-[calc(var(--radius-panel)-1px)] px-8 py-12 text-center">
            <div className="absolute inset-0 bg-rings opacity-20" />
            <div className="relative mb-8 flex justify-center scale-110">
              <Brand size="lg" />
            </div>
            <h3 className="relative text-3xl font-bold tracking-tight sm:text-4xl" style={syne}>
              Defensible decisions,<br />built in minutes.
            </h3>
            <p className="relative mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-text-secondary">
              Forge orchestrates specialized AI agents to plan, debate, and validate your product ideas with traceable receipts.
            </p>
            <Link
              href="/"
              className="btn-brand sheen relative mt-10 inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-bold text-brand-fg"
            >
              Start building with Forge
              <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
        </footer>

        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <p className="text-[13px] font-medium text-muted/50">
            Automated multi-agent product decisions of record
          </p>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-[12px] font-bold text-brand hover:text-brand-hover transition-colors">Forge</Link>
            <span className="h-1 w-1 rounded-full bg-faint opacity-40" />
            <Link href="/privacy" className="text-[12px] font-medium text-muted/40 hover:text-muted transition-colors">Privacy</Link>
            <span className="h-1 w-1 rounded-full bg-faint opacity-40" />
            <Link href="/terms" className="text-[12px] font-medium text-muted/40 hover:text-muted transition-colors">Terms</Link>
          </div>
        </div>
      </main>
    </div>
  )
}

