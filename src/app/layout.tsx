import type { Metadata } from "next"
import { Syne, Inter_Tight, JetBrains_Mono } from "next/font/google"
import { Providers } from "@/components/providers"
import "./globals.css"

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-syne",
})

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
})

export const metadata: Metadata = {
  title: "Forge — AI-Powered Product Simulation Platform",
  description:
    "A team of specialized AI agents that debate, decide and deliver — turning one idea into a complete strategy, architecture, backlog and roadmap in minutes.",
  openGraph: {
    title: "Forge — AI-Powered Product Simulation Platform",
    description:
      "Six AI agents. One product team. Infinite possibilities.",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${syne.variable} ${interTight.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
