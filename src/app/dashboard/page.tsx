import type { Metadata } from "next"
import DashboardPage from "./page-client"

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "View your projects, recent activity, and key metrics at a glance.",
  openGraph: {
    title: "Dashboard",
    description: "View your projects, recent activity, and key metrics at a glance.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Forge Dashboard" }],
  },
}

export default function Page() {
  return <DashboardPage />
}
