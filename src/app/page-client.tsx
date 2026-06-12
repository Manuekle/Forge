"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight01Icon, ChevronRightIcon, Tick01Icon, SparklesIcon, AlgorithmIcon,
  Layers01Icon, GitBranchIcon, JusticeScale01Icon, File01Icon, Shield01Icon, AnalyticsUpIcon,
  Menu01Icon, Cancel01Icon, ArrowDown01Icon,
  AiContentGenerator01Icon, AiIdeaIcon, AiCloud02Icon, AiScanIcon, AiFolder01Icon, AiSearch02Icon
} from "@hugeicons/core-free-icons"
import { Icon } from "@/components/ui/icon"
import { ThemeToggle } from "@/components/theme-toggle"
import { LiveOrchestration } from "@/components/landing/live-orchestration"
import { WorkflowCards } from "@/components/landing/workflow-cards"

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
}

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
}

const agents = [
  { role: "Product Manager", short: "PM", color: "#F97316", icon: AiContentGenerator01Icon },
  { role: "UX Designer", short: "UX", color: "#FB923C", icon: AiIdeaIcon },
  { role: "Tech Architect", short: "AR", color: "#FCD34D", icon: AiCloud02Icon },
  { role: "QA Engineer", short: "QA", color: "#A78BFA", icon: AiScanIcon },
  { role: "Scrum Master", short: "SC", color: "#2ED47A", icon: AiFolder01Icon },
  { role: "Business Analyst", short: "BA", color: "#4A9FF9", icon: AiSearch02Icon },
]

const rotatingHeadlines = [
  { prefix: "Your entire product team, ", accent: "powered by AI." },
  { prefix: "Six agents. One goal. ", accent: "Results in minutes." },
  { prefix: "From idea to backlog. ", accent: "In seconds." },
]

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Agents", href: "#agents" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
]

const faqs = [
  {
    q: "What does Forge actually generate?",
    a: "Every run produces a full set of product deliverables: a PRD with user stories and acceptance criteria, a prioritized backlog, system architecture, UX flows, a QA risk plan, a sprint roadmap and a business case. Each artifact is versioned, so later runs evolve them instead of overwriting.",
  },
  {
    q: "How is this different from asking a single chatbot?",
    a: "A single model gives you one perspective with no pushback. Forge runs six role-specialized agents that challenge each other's assumptions, debate contentious points and vote. The disagreement is the feature — you see where the plan is fragile before you build it.",
  },
  {
    q: "Can I audit why a decision was made?",
    a: "Yes. Every consensus is logged with the full debate, each agent's vote, the rationale and a confidence score. Knowledge retrieval is grounded — outputs cite their sources inline, and the complete reasoning trace is available for every run.",
  },
  {
    q: "What role does Microsoft Foundry IQ play?",
    a: "Foundry IQ powers the orchestration layer: it classifies your idea, retrieves relevant domain knowledge before agents reason, manages context between agents and traces every step of the pipeline from intent parsing to consensus.",
  },
  {
    q: "How long does a run take?",
    a: "Most runs complete in well under three minutes, and you watch the whole thing live — which agent is working, what they handed off, and how the debate is going. Nothing happens behind a spinner.",
  },
  {
    q: "Can I export the results?",
    a: "Every plan includes Markdown export. The Pro plan adds GitHub and Jira export, so the generated backlog lands directly in the tools your team already uses.",
  },
]

// Deterministic bubble field (no Math.random — keeps SSR markup stable).
const BUBBLES = [
  { left: "6%", size: 90, t: "19s", d: "0s", dx: "30px", o: 0.35 },
  { left: "16%", size: 46, t: "14s", d: "3.5s", dx: "-22px", o: 0.45 },
  { left: "28%", size: 70, t: "21s", d: "7s", dx: "18px", o: 0.3 },
  { left: "44%", size: 38, t: "13s", d: "1.5s", dx: "-28px", o: 0.5 },
  { left: "58%", size: 110, t: "24s", d: "5s", dx: "26px", o: 0.25 },
  { left: "72%", size: 54, t: "16s", d: "9s", dx: "-18px", o: 0.4 },
  { left: "84%", size: 76, t: "20s", d: "2.5s", dx: "22px", o: 0.32 },
  { left: "93%", size: 42, t: "15s", d: "6.5s", dx: "-24px", o: 0.45 },
]

function Bubbles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {BUBBLES.map((b, i) => (
        <span
          key={i}
          className="bubble"
          style={{
            left: b.left,
            width: b.size,
            height: b.size,
            "--bubble-t": b.t,
            "--bubble-d": b.d,
            "--bubble-dx": b.dx,
            "--bubble-o": b.o,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

type Sponsor = { label: string; src: string } | { label: string; srcLight: string; srcDark: string }

const SPONSORS: Sponsor[] = [
  { src: "/sponsors/microsoft.svg", label: "Microsoft" },
  { src: "/sponsors/azure.svg", label: "Azure" },
  { src: "/sponsors/Microsoft-Foundry.svg", label: "Foundry IQ" },
  { srcLight: "/sponsors/GitHub_light.svg", srcDark: "/sponsors/GitHub_dark.svg", label: "GitHub" },
]

function Sponsors() {
  return (
    <div className="mt-14 flex flex-col items-center gap-5">
      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">Built on</span>
      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
        {SPONSORS.map((s) => (
          <span key={s.label} className="flex items-center gap-2.5 opacity-75 transition-opacity duration-200 hover:opacity-100">
            {"src" in s ? (
              <Image src={s.src} alt="" width={20} height={20} className="h-5 w-5" />
            ) : (
              <>
                <img src={s.srcLight} alt="" className="h-5 w-5 dark:hidden" />
                <img src={s.srcDark} alt="" className="hidden h-5 w-5 dark:block" />
              </>
            )}
            <span className="text-sm font-semibold tracking-tight text-text-secondary">{s.label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Agents", href: "#agents" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Sign in", href: "/auth/signin" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
    ],
  },
]

function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4">
      <nav
        aria-label="Main"
        className={`mx-auto max-w-[1080px] rounded-[22px] transition-all duration-300 ${
          scrolled || open ? "glass" : "bg-transparent"
        }`}
      >
        <div className="flex h-14 items-center gap-6 px-4 sm:px-5">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Forge home">
            <Image src="/logo.png" alt="" width={28} height={28} className="h-7 w-7" />
            <span className="text-base font-semibold tracking-tight" style={{ fontFamily: "var(--font-syne)" }}>Forge</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex" role="list">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-full px-3.5 py-1.5 text-[13px] text-text-secondary transition-colors duration-200 hover:bg-hover hover:text-text-primary"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex-1" />

          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
            <Link href="/auth/signin" className="rounded-full px-3.5 py-1.5 text-[13px] text-text-secondary transition-colors hover:bg-hover hover:text-text-primary">
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="btn-brand sheen flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium text-white transition-all duration-200 active:scale-[0.97]"
            >
              Get started
              <Icon icon={ArrowRight01Icon} size={14} />
            </Link>
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-hover hover:text-text-primary"
            >
              <Icon icon={open ? Cancel01Icon : Menu01Icon} size={18} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden md:hidden"
            >
              <div className="flex flex-col gap-1 px-4 pb-4 pt-1">
                {navLinks.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-hover hover:text-text-primary"
                  >
                    {item.label}
                  </a>
                ))}
                <div className="mt-2 flex flex-col gap-2">
                  <Link
                    href="/auth/signin"
                    onClick={() => setOpen(false)}
                    className="flex h-10 items-center justify-center rounded-full bg-surface-2 text-sm text-text-primary ring-hair"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="btn-brand flex h-10 items-center justify-center gap-1.5 rounded-full text-sm font-medium text-white"
                  >
                    Get started
                    <Icon icon={ArrowRight01Icon} size={14} />
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  )
}

function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-[var(--radius-card)] bg-surface-2 ring-hair lift-1 transition-all duration-300">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-4 rounded-[var(--radius-card)] px-6 py-5 text-left"
      >
        <span className="flex-1 text-sm font-semibold text-text-primary sm:text-base">{q}</span>
        <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-hover-strong text-text-secondary transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
          <Icon icon={ArrowDown01Icon} size={14} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-5 text-sm leading-relaxed text-text-secondary">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function LandingPage() {
  const [headlineIdx, setHeadlineIdx] = useState(0)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) return
    const t = setInterval(() => setHeadlineIdx((i) => (i + 1) % rotatingHeadlines.length), 4000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="min-h-screen overflow-hidden bg-canvas text-text-primary antialiased">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-surface-3 focus:px-4 focus:py-2 focus:text-sm focus:text-text-primary"
      >
        Skip to content
      </a>
      <div className="fixed inset-0 z-0 bg-noise pointer-events-none" />

      <Nav />

      <main id="main">
      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Single static halo behind the simulation — calm, no motion */}
        <div
          className="pointer-events-none absolute left-1/2 top-[58%] h-[700px] w-[1100px] -translate-x-1/2 -translate-y-1/2"
          style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(232,80,2,0.10) 0%, rgba(232,80,2,0.04) 45%, transparent 70%)" }}
        />
        <Bubbles />

        <div className="relative z-10 mx-auto max-w-[1200px] px-6 pb-20 pt-32 sm:pt-36">
          <motion.div initial="initial" animate="animate" variants={stagger} className="flex flex-col items-center">
            <motion.div variants={fadeUp} className="flex items-center gap-2 rounded-full glass-brand px-4 py-1.5 text-xs font-medium text-brand">
              <Icon icon={SparklesIcon} size={12} />
              Powered by Microsoft Foundry IQ
            </motion.div>

            <div className="relative mb-4 mt-10">
              <AnimatePresence mode="wait">
                <motion.h1
                  key={headlineIdx}
                  initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
                  transition={{ duration: 0.5 }}
                  className="max-w-[880px] text-balance text-center text-[clamp(2.5rem,7vw,5rem)] font-bold leading-[1.05]"
                  style={{ fontFamily: "var(--font-syne)" }}
                >
                  {rotatingHeadlines[headlineIdx].prefix}
                  <span className="gradient-text">{rotatingHeadlines[headlineIdx].accent}</span>
                </motion.h1>
              </AnimatePresence>
            </div>

            <motion.p variants={fadeUp} className="mt-4 max-w-[600px] text-pretty text-center text-base leading-relaxed text-text-secondary sm:text-lg">
              Six specialized AI agents debate, vote and generate PRDs, backlogs,
              architecture and roadmaps — just like a real product team.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link href="/dashboard" className="btn-brand sheen shadow-brand-lg flex h-12 items-center justify-center gap-2 rounded-full px-8 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.97]">
                Create your first project free
                <Icon icon={ArrowRight01Icon} size={16} />
              </Link>
              <a href="#how-it-works" className="flex h-12 items-center justify-center gap-2 rounded-full bg-surface-2 px-8 text-sm font-medium text-text-primary ring-hair lift-1 transition-all duration-200 hover:bg-surface-3 active:scale-[0.97]">
                See how it works
                <Icon icon={ChevronRightIcon} size={16} />
              </a>
            </motion.div>

            {/* Hero: live orchestration simulation */}
            <motion.div variants={fadeUp} className="mt-14 w-full max-w-[980px]">
              <LiveOrchestration />
            </motion.div>
            <p className="mt-4 text-xs text-muted">Simulation of a real Forge run — six agents, one consensus, 22 seconds.</p>

            <motion.div variants={fadeUp}>
              <Sponsors />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative scroll-mt-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(232,80,2,0.04)_0%,transparent_70%)]" />
        <div className="relative mx-auto max-w-[1200px] px-6 py-28">
          <motion.div initial="initial" whileInView="animate" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
            <motion.div variants={fadeUp} className="mb-4 flex items-center gap-3">
              <div className="h-6 w-1 rounded-full bg-brand" />
              <span className="text-sm font-medium text-brand" style={{ fontFamily: "var(--font-syne)" }}>Capabilities</span>
            </motion.div>
            <motion.h2 variants={fadeUp} className="max-w-[600px] text-4xl font-bold leading-[1.1] sm:text-5xl" style={{ fontFamily: "var(--font-syne)" }}>
              An AI product team that thinks before it writes.
            </motion.h2>
            <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: JusticeScale01Icon, title: "Agent debate", desc: "Every agent challenges the others' assumptions before producing any deliverable.", pattern: "bg-hatch" },
                { icon: GitBranchIcon, title: "Consensus engine", desc: "Contentious decisions are voted on with full traceability and a confidence score.", pattern: "bg-rings" },
                { icon: Layers01Icon, title: "Decision history", desc: "Every consensus is logged with its vote, rationale and metadata.", pattern: "bg-grid-soft" },
                { icon: File01Icon, title: "Versioned artifacts", desc: "PRDs, backlogs and architectures with version control on every change.", pattern: "bg-grid-soft" },
                { icon: Shield01Icon, title: "Risk scanner", desc: "QA reviews every plan against security, compliance and fraud risks.", pattern: "bg-hatch" },
                { icon: AnalyticsUpIcon, title: "Project memory", desc: "Agents remember every prior decision and domain constraint.", pattern: "bg-rings" },
              ].map((f, i) => {
                const iconObj = f.icon
                return (
                  <motion.div key={i} variants={fadeUp} whileHover={{ y: -4 }} className="group overflow-hidden rounded-[var(--radius-card)] bg-surface-2 ring-hair lift-1 transition-all duration-300 hover:lift-2">
                    <div className={`relative flex h-28 items-center justify-center ${f.pattern}`}>
                      <div className="halo-warm absolute inset-0 opacity-60" aria-hidden="true" />
                      <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl icon-chip text-white transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                        <Icon icon={iconObj} size={20} />
                      </div>
                    </div>
                    <div className="p-6 pt-5">
                      <h3 className="mb-2 text-base font-semibold text-text-primary">{f.title}</h3>
                      <p className="text-sm leading-relaxed text-text-secondary">{f.desc}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="relative overflow-hidden scroll-mt-24">
        <div className="relative mx-auto max-w-[1200px] px-6 py-28">
          <motion.div initial="initial" whileInView="animate" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
            <motion.div variants={fadeUp} className="mb-4 flex items-center gap-3">
              <div className="h-6 w-1 rounded-full bg-brand" />
              <span className="text-sm font-medium text-brand" style={{ fontFamily: "var(--font-syne)" }}>Workflow</span>
            </motion.div>
            <motion.h2 variants={fadeUp} className="max-w-[600px] text-4xl font-bold leading-[1.1] sm:text-5xl" style={{ fontFamily: "var(--font-syne)" }}>
              From idea to execution. In under 3 minutes.
            </motion.h2>
            <motion.div variants={fadeUp} className="mt-14">
              <WorkflowCards />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* THE AGENTS */}
      <section id="agents" className="scroll-mt-24">
        <div className="mx-auto max-w-[1200px] px-6 py-28">
          <motion.div initial="initial" whileInView="animate" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
            <motion.div variants={fadeUp} className="mb-4 flex items-center gap-3">
              <div className="h-6 w-1 rounded-full bg-brand" />
              <span className="text-sm font-medium text-brand" style={{ fontFamily: "var(--font-syne)" }}>The team</span>
            </motion.div>
            <motion.h2 variants={fadeUp} className="max-w-[700px] text-4xl font-bold leading-[1.1] sm:text-5xl" style={{ fontFamily: "var(--font-syne)" }}>
              Six specialists. One Orchestrator.
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 max-w-[540px] text-base leading-relaxed text-text-secondary">
              Each agent owns its discipline and defends it in the debate — the same tension that makes real product teams great.
            </motion.p>
            <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {agents.map((a, i) => (
                <motion.div key={a.role} variants={fadeUp} whileHover={{ y: -4 }} className="group overflow-hidden rounded-[var(--radius-card)] bg-surface-2 ring-hair lift-1 transition-all duration-300 hover:lift-2">
                  <div className={`relative flex h-24 items-center justify-center ${["bg-rings", "bg-hatch", "bg-grid-soft"][i % 3]}`}>
                    <div className="halo-warm absolute inset-0 opacity-50" aria-hidden="true" />
                    <div
                      className="relative flex h-12 w-12 items-center justify-center rounded-2xl text-white transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
                      style={{
                        background: `linear-gradient(160deg, ${a.color} 0%, ${a.color} 55%, rgba(0,0,0,0.25) 160%), ${a.color}`,
                        boxShadow: `inset 0 1.5px 0 0 rgba(255,255,255,0.35), 0 6px 16px -2px ${a.color}73, 0 16px 36px -8px ${a.color}59`,
                      }}
                    >
                      <Icon icon={a.icon} size={20} />
                    </div>
                  </div>
                  <div className="p-6 pt-5">
                    <div className="mb-2 flex items-baseline gap-2.5">
                      <h3 className="text-base font-semibold text-text-primary">{a.role}</h3>
                      <span className="font-mono text-[11px] text-muted">{a.short}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-text-secondary">
                      {a.role === "Product Manager" && "PRDs, goals, user stories, acceptance criteria and backlog."}
                      {a.role === "UX Designer" && "User flows, information architecture, journeys and wireframes."}
                      {a.role === "Tech Architect" && "System architecture, APIs, database schemas and scalability."}
                      {a.role === "QA Engineer" && "Risk scanning, test plans, edge cases and security."}
                      {a.role === "Scrum Master" && "Sprint planning, story points, roadmaps and milestones."}
                      {a.role === "Business Analyst" && "Monetization, GTM, business risks and market opportunities."}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOUNDRY IQ */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_left,rgba(232,80,2,0.04)_0%,transparent_60%)]" />
        <div className="relative mx-auto max-w-[1200px] px-6 py-28">
          <motion.div initial="initial" whileInView="animate" viewport={{ once: true, margin: "-100px" }} variants={stagger}
            className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <motion.div variants={fadeUp}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-brand shadow-brand">
                  <Icon icon={AlgorithmIcon} size={16} className="text-white" />
                </div>
                <span className="text-sm font-semibold text-brand" style={{ fontFamily: "var(--font-syne)" }}>Microsoft Foundry IQ</span>
              </div>
              <h2 className="mt-2 text-4xl font-bold leading-[1.1] sm:text-5xl" style={{ fontFamily: "var(--font-syne)" }}>
                Reasoning you can audit.
              </h2>
              <p className="mt-6 text-pretty text-base leading-relaxed text-text-secondary">
                Foundry IQ powers the orchestration, knowledge retrieval and decision support behind every run.
                Every step is traced — which sources were consulted, how each agent voted, and why the
                consensus reached its conclusion.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {["Agent orchestration", "Knowledge retrieval", "Context management", "Decision support"].map((tag) => (
                  <span key={tag} className="rounded-full bg-surface-2 px-3.5 py-1.5 text-xs font-medium text-text-secondary ring-hair">
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="relative">
              <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-surface-inset p-6 ring-hair">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(232,80,2,0.05)_0%,transparent_60%)]" />
                <div className="relative">
                  <div className="mb-6 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-brand shadow-[0_0_8px_rgba(232,80,2,0.8)]" />
                    <span className="font-mono text-xs text-text-secondary">Foundry IQ Trace — Run #a3f2c1</span>
                  </div>
                  {[
                    { time: "+0.00s", action: "Orchestrator init", detail: "domain=marketplace" },
                    { time: "+0.12s", action: "PM analyzing", detail: "PRD scope=checkout" },
                    { time: "+0.48s", action: "Architect validating", detail: "schema=payments" },
                    { time: "+1.03s", action: "QA scanning", detail: "risks=3 found" },
                    { time: "+1.47s", action: "Debate phase", detail: "auth vs anonymous" },
                    { time: "+2.10s", action: "Consensus", detail: "confidence=0.87" },
                  ].map((t, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08 }}
                      className="relative -ml-px flex gap-4 border-l border-hairline py-1.5 pl-4 font-mono text-xs"
                    >
                      <div className="absolute left-[-3.5px] top-2 h-[6px] w-[6px] rounded-full"
                        style={{ backgroundColor: i === 5 ? "#E85002" : "var(--color-hairline-strong)" }} />
                      <span className="w-[60px] flex-shrink-0 text-brand">{t.time}</span>
                      <span className="w-[150px] flex-shrink-0 text-text-secondary">{t.action}</span>
                      <span className="text-muted">{t.detail}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* WHAT A RUN PRODUCES — honest product facts, not vanity metrics */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-20">
          <motion.div initial="initial" whileInView="animate" viewport={{ once: true, margin: "-100px" }} variants={stagger}
            className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-card)] bg-surface-2 ring-hair lift-1 md:grid-cols-4">
            {[
              { value: "6", label: "Specialist agents per run" },
              { value: "7", label: "Deliverables generated" },
              { value: "<3 min", label: "From idea to full backlog" },
              { value: "100%", label: "Decisions traced & cited" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                variants={fadeUp}
                className={`relative px-6 py-10 text-center ${i > 0 ? "shadow-[inset_1px_0_0_var(--color-hairline)]" : ""}`}
              >
                <div className="gradient-text text-4xl font-bold sm:text-5xl" style={{ fontFamily: "var(--font-syne)" }}>
                  {s.value}
                </div>
                <div className="mt-3 text-[13px] text-text-secondary">{s.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="scroll-mt-24">
        <div className="mx-auto max-w-[1200px] px-6 py-28">
          <motion.div initial="initial" whileInView="animate" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
            <motion.div variants={fadeUp} className="mb-4 text-center">
              <span className="text-sm font-medium text-brand" style={{ fontFamily: "var(--font-syne)" }}>Pricing</span>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-center text-4xl font-bold leading-[1.1] sm:text-5xl" style={{ fontFamily: "var(--font-syne)" }}>
              Start free. Scale when your team does.
            </motion.h2>
            <div className="mx-auto mt-14 grid max-w-[1000px] grid-cols-1 items-stretch gap-4 md:grid-cols-3">
              {[{
                name: "Free", price: "$0", desc: "To try Forge out",
                features: ["2 projects", "All 6 AI agents", "5 runs per month", "Markdown export"],
                cta: "Start free", href: "/auth/signin", popular: false,
              }, {
                name: "Pro", price: "$29", desc: "For teams that build",
                features: ["Unlimited projects", "Full reasoning traces", "Decision history", "Versioned artifacts with diffs", "GitHub & Jira export"],
                cta: "Try it free", href: "/auth/signin", popular: true,
              }, {
                name: "Enterprise", price: "Custom", desc: "For organizations",
                features: ["SSO & RBAC", "Private Foundry IQ", "Custom agents & KBs", "Audit logs & compliance"],
                cta: "Talk to us", href: "mailto:hello@forge.dev", popular: false,
              }].map((plan, i) => (
                <motion.div key={i} variants={fadeUp}
                  className={`relative flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-surface-2 p-7 transition-all duration-300 ${
                    plan.popular
                      ? "lift-2 shadow-[inset_0_0_0_1.5px_rgba(232,80,2,0.45)]"
                      : "ring-hair lift-1 hover:lift-2"
                  }`}>
                  {plan.popular && <div className="halo-warm pointer-events-none absolute inset-0" aria-hidden="true" />}
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>{plan.name}</span>
                      {plan.popular && (
                        <span className="rounded-full bg-brand px-3 py-1 text-[10px] font-semibold text-white shadow-brand">
                          Most popular
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-text-secondary">{plan.desc}</div>
                    <div className="mt-6 flex items-baseline gap-1.5">
                      <span className="text-[42px] font-bold leading-none text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>{plan.price}</span>
                      {plan.name !== "Enterprise" && <span className="text-xs text-muted">/month</span>}
                    </div>
                  </div>
                  <div className="relative mt-7 flex flex-1 flex-col gap-3 pt-6 text-sm hairline-t">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-center gap-2.5">
                        <span className={`flex h-4.5 w-4.5 flex-shrink-0 items-center justify-center rounded-full ${plan.popular ? "bg-brand text-white" : "bg-brand-subtle text-brand"}`}>
                          <Icon icon={Tick01Icon} size={10} />
                        </span>
                        <span className="text-text-secondary">{f}</span>
                      </div>
                    ))}
                  </div>
                  <a href={plan.href} className={`relative mt-7 flex h-11 w-full items-center justify-center rounded-full text-sm font-medium transition-all duration-200 active:scale-[0.97] ${
                    plan.popular ? "btn-brand sheen text-white" : "bg-surface-3 text-text-primary ring-hair hover:bg-surface-2"
                  }`}>
                    {plan.cta}
                  </a>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24">
        <div className="mx-auto max-w-[800px] px-6 py-28">
          <motion.div initial="initial" whileInView="animate" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
            <motion.div variants={fadeUp} className="mb-4 text-center">
              <span className="text-sm font-medium text-brand" style={{ fontFamily: "var(--font-syne)" }}>FAQ</span>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-center text-4xl font-bold leading-[1.1] sm:text-5xl" style={{ fontFamily: "var(--font-syne)" }}>
              Questions, answered.
            </motion.h2>
            <motion.div variants={fadeUp} className="mt-14 flex flex-col gap-3">
              {faqs.map((f, i) => (
                <FaqItem
                  key={i}
                  q={f.q}
                  a={f.a}
                  open={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                />
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute bottom-0 left-1/2 h-[480px] w-[900px] -translate-x-1/2"
          style={{ background: "radial-gradient(55% 70% at 50% 100%, rgba(232,80,2,0.12) 0%, rgba(232,80,2,0.04) 50%, transparent 75%)" }}
        />
        <div className="relative mx-auto flex max-w-[1200px] flex-col items-center px-6 py-28">
          <motion.div initial="initial" whileInView="animate" viewport={{ once: true }} variants={stagger} className="flex flex-col items-center">
            <motion.div variants={fadeUp} className="mb-8 flex h-16 w-16 items-center justify-center rounded-[20px] icon-chip text-white">
              <Icon icon={AlgorithmIcon} size={28} />
            </motion.div>
            <motion.h2 variants={fadeUp} className="max-w-[700px] text-balance text-center text-4xl font-bold leading-[1.1] sm:text-6xl" style={{ fontFamily: "var(--font-syne)" }}>
              Your AI product team is ready.
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 max-w-[460px] text-center text-base text-text-secondary sm:text-lg">
              From idea to execution — in a single run. No setup, no learning curve.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-10">
              <Link href="/dashboard" className="btn-brand sheen shadow-brand-lg flex h-14 items-center justify-center gap-3 rounded-full px-10 text-base font-semibold text-white transition-all duration-200 active:scale-[0.97]">
                Create your first project free
                <Icon icon={ArrowRight01Icon} size={18} />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
      </main>

      {/* FOOTER */}
      <footer className="hairline-t">
        <div className="mx-auto max-w-[1200px] px-6 pb-10 pt-16">
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4 lg:grid-cols-5">
            <div className="col-span-2">
              <div className="flex items-center gap-3">
                <Image src="/logo.png" alt="" width={28} height={28} className="h-7 w-7" />
                <span className="text-sm font-semibold" style={{ fontFamily: "var(--font-syne)" }}>Forge</span>
              </div>
              <p className="mt-4 max-w-[280px] text-xs leading-relaxed text-muted">
                Six specialized AI agents that debate, vote and deliver complete product plans — with every decision traced.
              </p>
              <p className="mt-4 text-xs text-faint">Powered by Microsoft Foundry IQ</p>
            </div>
            {footerColumns.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{col.title}</h3>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a href={l.href} className="text-xs text-text-secondary transition-colors hover:text-text-primary">
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-center gap-3 pt-6 hairline-t sm:flex-row">
            <span className="text-xs text-muted">© 2026 Forge. All rights reserved.</span>
            <span className="text-xs text-faint sm:ml-auto">Made for teams that ship.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
