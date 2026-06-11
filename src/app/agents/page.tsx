import type { Metadata } from "next"
import AgentsPage from "./page-client"

export const metadata: Metadata = {
  title: "Agents",
  description:
    "Meet your AI product team — six specialist agents orchestrated by Microsoft Foundry IQ.",
  openGraph: {
    title: "Agents",
    description: "Your AI product team. Orchestrated by Microsoft Foundry IQ.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Forge Agents" }],
  },
}

export default function Page() {
  return <AgentsPage />
}
