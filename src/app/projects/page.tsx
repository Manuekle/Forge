import type { Metadata } from "next"
import ProjectsPage from "./page-client"

export const metadata: Metadata = {
  title: "Projects | Forge",
  description:
    "Browse and manage all your AI-powered product simulation projects.",
  openGraph: {
    title: "Projects | Forge",
    description: "Browse and manage all your AI-powered product simulation projects.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Forge Projects" }],
  },
}

export default function Page() {
  return <ProjectsPage />
}
