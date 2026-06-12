import type { Metadata, Viewport } from "next"
import { Syne, Inter_Tight, JetBrains_Mono } from "next/font/google"
import { Providers } from "@/components/providers"
import "./globals.css"

// Syne is a display face used only at medium/semibold/bold — don't ship
// weights nothing renders (each weight is a separate font file on first paint).
const syne = Syne({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
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

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#09090B" },
    { media: "(prefers-color-scheme: light)", color: "#F5F5F0" },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL("https://forge.dev"),
  title: {
    template: "%s | Forge",
    default: "Forge — AI-Powered Product Simulation Platform",
  },
  description:
    "A team of specialized AI agents that debate, decide and deliver — turning one idea into a complete strategy, architecture, backlog and roadmap in minutes.",
  keywords: [
    "AI product simulation",
    "product management",
    "AI agents",
    "product strategy",
    "roadmap planning",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Forge — AI-Powered Product Simulation Platform",
    description:
      "Six AI agents. One product team. Infinite possibilities.",
    url: "https://forge.dev",
    siteName: "Forge",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Forge — AI-Powered Product Simulation Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Forge — AI-Powered Product Simulation Platform",
    description:
      "Six AI agents. One product team. Infinite possibilities.",
    images: ["/og-image.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${syne.variable} ${interTight.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
