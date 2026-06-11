import type { Metadata } from "next"
import SignInPage from "./page-client"

export const metadata: Metadata = {
  title: "Sign In | Forge",
  description:
    "Sign in to Forge — the AI-powered product simulation platform.",
  openGraph: {
    title: "Sign In | Forge",
    description: "Sign in to Forge — the AI-powered product simulation platform.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Forge" }],
  },
}

export default function Page() {
  return <SignInPage />
}
