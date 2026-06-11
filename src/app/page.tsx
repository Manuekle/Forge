import type { Metadata } from "next"
import LandingPage from "./page-client"

export const metadata: Metadata = {
  title: "Forge — AI-Powered Product Simulation Platform",
  description:
    "A team of specialized AI agents that debate, decide and deliver — turning one idea into a complete strategy, architecture, backlog and roadmap in minutes.",
  openGraph: {
    title: "Forge — AI-Powered Product Simulation Platform",
    description:
      "Six AI agents. One product team. Infinite possibilities.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Forge" }],
  },
}

export default function Page() {
  return <LandingPage />
}
