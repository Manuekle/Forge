import type { Metadata } from "next"
import ProjectPageClient from "./page-client"

export const metadata: Metadata = {
  title: "Project",
  description:
    "Project dashboard with AI-driven orchestration, deliverables, and decisions.",
  // Auth-gated — robots.txt disallow alone still lets linked URLs get indexed.
  robots: { index: false, follow: false },
  alternates: { canonical: "/projects/[id]" },
  openGraph: {
    title: "Project",
    description: "AI-powered product simulation — live agent debate, artifacts, and orchestration.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Forge Project" }],
  },
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ProjectPageClient params={params} />
}
