import Image from "next/image"
import Link from "next/link"

interface LegalLayoutProps {
  title: string
  updated: string
  children: React.ReactNode
}

export function LegalLayout({ title, updated, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-canvas text-text-primary antialiased">
      <div className="fixed inset-0 z-0 bg-noise pointer-events-none" />
      <header className="relative z-10">
        <div className="mx-auto flex h-16 max-w-[760px] items-center gap-3 px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Forge home">
            <Image src="/logo.png" alt="" width={26} height={26} className="h-6.5 w-6.5" />
            <span className="text-sm font-semibold tracking-tight" style={{ fontFamily: "var(--font-syne)" }}>Forge</span>
          </Link>
          <Link href="/" className="ml-auto text-xs text-text-secondary transition-colors hover:text-text-primary">
            ← Back to home
          </Link>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-[760px] px-6 pb-24 pt-12">
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl" style={{ fontFamily: "var(--font-syne)" }}>
          {title}
        </h1>
        <p className="mt-3 text-xs text-muted">Last updated: {updated}</p>
        <div className="legal-prose mt-10">{children}</div>
      </main>
      <footer className="relative z-10 hairline-t">
        <div className="mx-auto flex max-w-[760px] flex-col gap-2 px-6 py-8 text-xs text-muted sm:flex-row sm:items-center">
          <span>© 2026 Forge. All rights reserved.</span>
          <nav aria-label="Legal" className="flex gap-5 sm:ml-auto">
            <Link href="/privacy" className="transition-colors hover:text-text-primary">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-text-primary">Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
