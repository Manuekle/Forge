import type { Metadata } from "next"
import ProjectPageClient from "./page-client"

export const metadata: Metadata = {
  title: "Project | Forge",
  description:
    "AI-powered product simulation — live agent debate, artifacts, and orchestration.",
  openGraph: {
    title: "Project | Forge",
    description: "AI-powered product simulation — live agent debate, artifacts, and orchestration.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Forge Project" }],
  },
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ProjectPageClient params={params} />
}
