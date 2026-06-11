"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowRight, ChevronRight, Check, Sparkles, Zap,
  Layers, GitBranch, Scale, FileText, Shield, TrendingUp,
  Star, Quote
} from "lucide-react"

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
}

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
}

const agents = [
  { role: "Product Manager", short: "PM", color: "#F97316" },
  { role: "UX Designer", short: "UX", color: "#FB923C" },
  { role: "Tech Architect", short: "AR", color: "#FCD34D" },
  { role: "QA Engineer", short: "QA", color: "#A78BFA" },
  { role: "Scrum Master", short: "SC", color: "#2ED47A" },
  { role: "Business Analyst", short: "BA", color: "#4A9FF9" },
]

const debateSteps = [
  { agent: "PM", msg: "Authentication is required — order history depends on identity.", color: "#F97316" },
  { agent: "AR", msg: "That doubles complexity. Every anonymous flow needs a parallel path.", color: "#FCD34D" },
  { agent: "QA", msg: "Without auth there's fraud risk and zero traceability.", color: "#A78BFA" },
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
]

export default function LandingPage() {
  const [headlineIdx, setHeadlineIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setHeadlineIdx((i) => (i + 1) % rotatingHeadlines.length), 4000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="min-h-screen overflow-hidden bg-canvas text-text-primary antialiased">
      <div className="fixed inset-0 z-0 bg-noise pointer-events-none" />

      {/* NAV */}
      <nav className="sticky top-0 z-50 glass">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-8 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-[11px] gradient-brand shadow-brand">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-base font-semibold tracking-tight" style={{ fontFamily: "var(--font-syne)" }}>Forge</span>
          </div>
          <div className="hidden gap-8 text-sm text-text-secondary md:flex">
            {navLinks.map((item) => (
              <a key={item.label} href={item.href} className="group relative transition-colors duration-200 hover:text-text-primary">
                {item.label}
                <span className="absolute bottom-[-4px] left-0 h-[2px] w-0 rounded-full bg-brand transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <a href="/auth/signin" className="text-sm text-text-secondary transition-colors hover:text-text-primary">Sign in</a>
            <a href="/dashboard">
              <button className="btn-brand sheen h-10 rounded-full px-5 text-sm font-medium text-white transition-all duration-200 active:scale-[0.97]">
                Get started
              </button>
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[600px]">
          <div className="absolute inset-0" style={{
            background: "linear-gradient(180deg, transparent 0%, rgba(193,8,1,0.08) 40%, rgba(232,80,2,0.12) 60%, rgba(217,195,171,0.06) 100%)"
          }} />
        </div>
        <div className="pointer-events-none absolute -right-40 -top-32 h-[560px] w-[560px] rounded-full opacity-70 blur-3xl aurora" />
        <div className="pointer-events-none absolute bottom-[180px] -left-44 h-[460px] w-[460px] rounded-full opacity-50 blur-3xl aurora" />

        <div className="relative z-10 mx-auto max-w-[1200px] px-6 pb-20 pt-24">
          <motion.div initial="initial" animate="animate" variants={stagger} className="flex flex-col items-center">
            <motion.div variants={fadeUp} className="flex items-center gap-2 rounded-full glass-brand px-4 py-1.5 text-xs font-medium text-brand">
              <Sparkles size={12} />
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
              <a href="/dashboard">
                <button className="btn-brand sheen shadow-brand-lg flex h-12 items-center gap-2 rounded-full px-8 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.97]">
                  Create your first project free
                  <ArrowRight size={16} />
                </button>
              </a>
              <a href="#how-it-works">
                <button className="flex h-12 items-center gap-2 rounded-full bg-surface-2 px-8 text-sm font-medium text-text-primary ring-hair lift-1 transition-all duration-200 hover:bg-surface-3 active:scale-[0.97]">
                  See how it works
                  <ChevronRight size={16} />
                </button>
              </a>
            </motion.div>

            {/* Agent Orbs */}
            <motion.div variants={fadeUp} className="mt-16 w-full max-w-[800px]">
              <div className="relative flex items-center justify-center py-8">
                <div className="absolute h-[460px] w-[460px] rounded-full opacity-50 blur-3xl aurora" />
                <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                  {agents.map((a, idx) => (
                    <motion.div
                      key={a.role}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + idx * 0.08, type: "spring", stiffness: 200 }}
                      whileHover={{ y: -4 }}
                      className="group flex flex-col items-center gap-2"
                    >
                      <div className="relative flex h-14 w-14 cursor-default items-center justify-center rounded-2xl ring-hair sm:h-16 sm:w-16"
                        style={{ background: `linear-gradient(160deg, ${a.color}2E 0%, ${a.color}0D 100%)` }}>
                        <span className="text-xl font-bold sm:text-2xl" style={{ color: a.color }}>{a.short}</span>
                        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full ring-2 ring-canvas" style={{ backgroundColor: a.color }}>
                          <span className="block h-full w-full animate-ping rounded-full opacity-30" style={{ backgroundColor: a.color }} />
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-text-secondary sm:text-xs">{a.short}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Hero Debate Card */}
            <motion.div variants={fadeUp} className="mt-6 w-full max-w-[680px] overflow-hidden rounded-[var(--radius-card)] glass">
              <div className="flex items-center gap-3 bg-white/[0.03] px-5 py-3.5">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-brand" />
                  <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
                  <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
                </div>
                <div className="rounded-full bg-brand-subtle px-2.5 py-0.5 text-[10px] font-medium text-brand ring-hair">Live debate</div>
                <span className="ml-auto text-xs text-text-secondary">Should buyers be required to sign up?</span>
              </div>
              <div className="flex flex-col gap-3.5 px-5 py-5">
                {debateSteps.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + i * 0.3 }}
                    className="flex gap-3"
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[9px] text-[10px] font-bold"
                      style={{ backgroundColor: `${step.color}26`, color: step.color }}>
                      {step.agent}
                    </div>
                    <div className="text-sm leading-relaxed text-text-secondary">{step.msg}</div>
                  </motion.div>
                ))}
              </div>
              <div className="flex items-center gap-3 bg-brand-subtle px-5 py-4 hairline-t">
                <div className="rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-medium text-white">Consensus</div>
                <div className="text-sm text-text-primary">Authentication required. Guests browse freely; one-tap OAuth at checkout.</div>
                <div className="ml-auto whitespace-nowrap font-mono text-xs text-brand">0.87</div>
              </div>
            </motion.div>
            <p className="mt-4 text-xs text-muted">A real Forge result — six agents, one consensus, 22 seconds.</p>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative">
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
                { icon: Scale, title: "Agent debate", desc: "Every agent challenges the others' assumptions before producing any deliverable." },
                { icon: GitBranch, title: "Consensus engine", desc: "Contentious decisions are voted on with full traceability and a confidence score." },
                { icon: Layers, title: "Decision history", desc: "Every consensus is logged with its vote, rationale and metadata." },
                { icon: FileText, title: "Versioned artifacts", desc: "PRDs, backlogs and architectures with version control on every change." },
                { icon: Shield, title: "Risk scanner", desc: "QA reviews every plan against security, compliance and fraud risks." },
                { icon: TrendingUp, title: "Project memory", desc: "Agents remember every prior decision and domain constraint." },
              ].map((f, i) => {
                const Icon = f.icon
                return (
                  <motion.div key={i} variants={fadeUp} whileHover={{ y: -4 }} className="group rounded-[var(--radius-card)] bg-surface-2 p-6 ring-hair lift-1 transition-all duration-300 hover:lift-2">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full glass-brand transition-transform duration-300 group-hover:scale-105">
                      <Icon size={18} className="text-brand" />
                    </div>
                    <h3 className="mb-2 text-base font-semibold text-text-primary">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-text-secondary">{f.desc}</p>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-20 top-0 h-[400px] w-[400px] rounded-full opacity-40 blur-3xl aurora" />
        <div className="relative mx-auto max-w-[1200px] px-6 py-28">
          <motion.div initial="initial" whileInView="animate" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
            <motion.div variants={fadeUp} className="mb-4 flex items-center gap-3">
              <div className="h-6 w-1 rounded-full bg-brand" />
              <span className="text-sm font-medium text-brand" style={{ fontFamily: "var(--font-syne)" }}>Workflow</span>
            </motion.div>
            <motion.h2 variants={fadeUp} className="max-w-[600px] text-4xl font-bold leading-[1.1] sm:text-5xl" style={{ fontFamily: "var(--font-syne)" }}>
              From idea to execution. In under 3 minutes.
            </motion.h2>
            <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { num: "01", title: "Describe your idea", desc: "One sentence is enough. Foundry IQ classifies it and retrieves relevant domain knowledge.", colors: ["#000000", "#C10801"] },
                { num: "02", title: "Agents reason in parallel", desc: "PM, UX, Architect, QA, Scrum and Business analyze from their own discipline.", colors: ["#C10801", "#F16001"] },
                { num: "03", title: "They debate to consensus", desc: "Conflicts are voted on. The Orchestrator emits a scored consensus.", colors: ["#F16001", "#E85002"] },
                { num: "04", title: "Export everything", desc: "PRD, backlog, architecture, roadmap and business case — versioned and traceable.", colors: ["#E85002", "#D9C3AB"] },
              ].map((step, i) => (
                <motion.div key={i} variants={fadeUp} whileHover={{ y: -4 }} className="group rounded-[var(--radius-card)] bg-surface-2 p-6 ring-hair lift-1 transition-all duration-300 hover:lift-2">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white shadow-brand"
                    style={{ background: `linear-gradient(135deg, ${step.colors[0]}, ${step.colors[1]})` }}>
                    {step.num}
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-text-primary">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-text-secondary">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* THE AGENTS */}
      <section id="agents">
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
              {agents.map((a) => (
                <motion.div key={a.role} variants={fadeUp} whileHover={{ y: -4 }} className="group rounded-[var(--radius-card)] bg-surface-2 p-6 ring-hair lift-1 transition-all duration-300 hover:lift-2">
                  <div className="mb-3 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl ring-hair transition-transform duration-300 group-hover:scale-105"
                      style={{ background: `linear-gradient(160deg, ${a.color}2E 0%, ${a.color}0F 100%)` }}>
                      <span className="text-xl font-bold" style={{ color: a.color }}>{a.short}</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-text-primary">{a.role}</div>
                      <div className="font-mono text-[11px] text-muted">{a.short}</div>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-text-secondary">
                    {a.role === "Product Manager" && "PRDs, goals, user stories, acceptance criteria and backlog."}
                    {a.role === "UX Designer" && "User flows, information architecture, journeys and wireframes."}
                    {a.role === "Tech Architect" && "System architecture, APIs, database schemas and scalability."}
                    {a.role === "QA Engineer" && "Risk scanning, test plans, edge cases and security."}
                    {a.role === "Scrum Master" && "Sprint planning, story points, roadmaps and milestones."}
                    {a.role === "Business Analyst" && "Monetization, GTM, business risks and market opportunities."}
                  </p>
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
                  <Zap size={16} className="text-white" />
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
                      className="relative -ml-px flex gap-4 border-l border-white/[0.08] py-1.5 pl-4 font-mono text-xs"
                    >
                      <div className="absolute left-[-3.5px] top-2 h-[6px] w-[6px] rounded-full"
                        style={{ backgroundColor: i === 5 ? "#E85002" : "rgba(255,255,255,0.15)" }} />
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

      {/* STATS */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-20">
          <motion.div initial="initial" whileInView="animate" viewport={{ once: true, margin: "-100px" }} variants={stagger}
            className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { value: "15K+", label: "Projects created" },
              { value: "120K+", label: "Decisions generated" },
              { value: "98.5%", label: "Consensus rate" },
              { value: "22s", label: "Avg. time per run" },
            ].map((s) => (
              <motion.div key={s.label} variants={fadeUp} className="text-center">
                <div className="gradient-text text-4xl font-bold sm:text-5xl" style={{ fontFamily: "var(--font-syne)" }}>
                  {s.value}
                </div>
                <div className="mt-2 text-sm text-text-secondary">{s.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-28">
          <motion.div initial="initial" whileInView="animate" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
            <motion.div variants={fadeUp} className="mb-4 flex items-center justify-center gap-3">
              <Star size={14} className="fill-brand text-brand" />
              <span className="text-sm font-medium text-brand" style={{ fontFamily: "var(--font-syne)" }}>What our users say</span>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-center text-4xl font-bold leading-[1.1] sm:text-5xl" style={{ fontFamily: "var(--font-syne)" }}>
              Built for people who ship.
            </motion.h2>
            <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                { quote: "Watching the QA agent kill our worst idea before we wrote a line of code paid for the subscription on day one.", name: "Maya K.", role: "Founder, two-person startup" },
                { quote: "Decision history ended our 'why did we do it this way?' meetings. Every call has its vote and rationale.", name: "Jonas T.", role: "Head of Product, fintech" },
                { quote: "I pitched an idea on Monday and walked into Thursday's review with a full PRD, architecture and backlog.", name: "Rocío A.", role: "PM, enterprise SaaS" },
              ].map((t, i) => (
                <motion.div key={i} variants={fadeUp} whileHover={{ y: -4 }} className="group flex flex-col rounded-[var(--radius-card)] bg-surface-2 p-6 ring-hair lift-1 transition-all duration-300 hover:lift-2">
                  <Quote size={20} className="mb-3 text-brand/40" />
                  <div className="flex-1 text-sm leading-relaxed text-text-secondary">
                    &ldquo;{t.quote}&rdquo;
                  </div>
                  <div className="mt-5 flex items-center gap-3 pt-4 hairline-t">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-brand text-[11px] font-bold text-white shadow-brand">
                      {t.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-text-primary">{t.name}</div>
                      <div className="text-[11px] text-muted">{t.role}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing">
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
                cta: "Start free", popular: false,
              }, {
                name: "Pro", price: "$29", desc: "For teams that build",
                features: ["Unlimited projects", "Full reasoning traces", "Decision history", "Versioned artifacts with diffs", "GitHub & Jira export"],
                cta: "Try it free", popular: true,
              }, {
                name: "Enterprise", price: "Custom", desc: "For organizations",
                features: ["SSO & RBAC", "Private Foundry IQ", "Custom agents & KBs", "Audit logs & compliance"],
                cta: "Talk to us", popular: false,
              }].map((plan, i) => (
                <motion.div key={i} variants={fadeUp}
                  className={`relative flex flex-col rounded-[var(--radius-card)] p-6 transition-all duration-300 ${
                    plan.popular ? "glass-brand shadow-brand-lg" : "bg-surface-2 ring-hair lift-1 hover:lift-2"
                  }`}>
                  {plan.popular && (
                    <div className="absolute left-1/2 top-[-12px] -translate-x-1/2 rounded-full bg-brand px-3.5 py-1 text-[10px] font-semibold text-white shadow-brand">
                      Most popular
                    </div>
                  )}
                  <div className="text-base font-semibold text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>{plan.name}</div>
                  <div className="mt-1 text-xs text-text-secondary">{plan.desc}</div>
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-text-primary" style={{ fontFamily: "var(--font-syne)" }}>{plan.price}</span>
                    {plan.name !== "Enterprise" && <span className="text-xs text-muted">/mo</span>}
                  </div>
                  <div className="mt-6 flex flex-1 flex-col gap-2.5 text-sm">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-center gap-2.5">
                        <Check size={14} className="flex-shrink-0 text-brand" />
                        <span className="text-text-secondary">{f}</span>
                      </div>
                    ))}
                  </div>
                  <button className={`mt-6 h-11 w-full rounded-full text-sm font-medium transition-all duration-200 active:scale-[0.97] ${
                    plan.popular ? "btn-brand sheen text-white" : "bg-surface-3 text-text-primary ring-hair lift-1 hover:bg-surface-2"
                  }`}>
                    {plan.cta}
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" style={{
          background: "linear-gradient(180deg, transparent 0%, rgba(232,80,2,0.05) 50%, rgba(217,195,171,0.03) 100%)"
        }} />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-[420px] w-[620px] -translate-x-1/2 rounded-full opacity-50 blur-3xl aurora" />
        <div className="relative mx-auto flex max-w-[1200px] flex-col items-center px-6 py-28">
          <motion.div initial="initial" whileInView="animate" viewport={{ once: true }} variants={stagger} className="flex flex-col items-center">
            <motion.div variants={fadeUp} className="mb-6 flex h-16 w-16 items-center justify-center rounded-[20px] gradient-brand shadow-brand-lg">
              <Zap size={28} className="text-white" />
            </motion.div>
            <motion.h2 variants={fadeUp} className="max-w-[700px] text-balance text-center text-4xl font-bold leading-[1.1] sm:text-6xl" style={{ fontFamily: "var(--font-syne)" }}>
              Your AI product team is ready.
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 max-w-[460px] text-center text-base text-text-secondary sm:text-lg">
              From idea to execution — in a single run. No setup, no learning curve.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-10">
              <a href="/dashboard">
                <button className="btn-brand sheen shadow-brand-lg flex h-14 items-center gap-3 rounded-full px-10 text-base font-semibold text-white transition-all duration-200 active:scale-[0.97]">
                  Create your first project free
                  <ArrowRight size={18} />
                </button>
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="hairline-t">
        <div className="mx-auto max-w-[1200px] px-6 py-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-[8px] gradient-brand shadow-brand">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="text-sm font-semibold" style={{ fontFamily: "var(--font-syne)" }}>Forge</span>
            </div>
            <span className="text-xs text-muted">© 2026 Forge. All rights reserved.</span>
            <div className="flex gap-6 text-xs text-muted sm:ml-auto">
              <a href="#features" className="transition-colors hover:text-text-primary">Features</a>
              <a href="#pricing" className="transition-colors hover:text-text-primary">Pricing</a>
              <a href="/dashboard" className="transition-colors hover:text-text-primary">App</a>
              <a href="#" className="transition-colors hover:text-text-primary">Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
