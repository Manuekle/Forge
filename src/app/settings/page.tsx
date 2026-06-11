import type { Metadata } from "next"
import SettingsPage from "./page-client"

export const metadata: Metadata = {
  title: "Settings | Forge",
  description:
    "Manage your profile, workspace, API configuration and account settings.",
  openGraph: {
    title: "Settings | Forge",
    description: "Manage your profile, workspace, API configuration and account settings.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Forge Settings" }],
  },
}

export default function Page() {
  return <SettingsPage />
}
