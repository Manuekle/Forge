import type { Metadata } from "next"
import RegisterPage from "./page-client"

export const metadata: Metadata = {
  title: "Create your account",
  description: "Join Forge — your AI product team.",
  robots: { index: false },
}

export default function Page() {
  return <RegisterPage />
}
