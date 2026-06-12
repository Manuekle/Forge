import type { Metadata } from "next"
import ProjectsPage from "./page-client"

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Browse and manage your AI-powered projects.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/projects" },
  openGraph: {
    title: "Projects",
    description: "Browse and manage all your AI-powered product simulation projects.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Forge Projects" }],
  },
}

export default function Page() {
  return <ProjectsPage />
}
