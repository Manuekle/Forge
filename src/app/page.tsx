import type { Metadata } from "next"
import LandingPage from "./page-client"

export const metadata: Metadata = {
  title: "Forge — AI-Powered Product Simulation Platform",
  description:
    "A team of specialized AI agents that debate, decide and deliver — turning one idea into a complete strategy, architecture, backlog and roadmap in minutes.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Forge — AI-Powered Product Simulation Platform",
    description:
      "Six AI agents. One product team. Infinite possibilities.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Forge" }],
  },
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What does Forge actually generate?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Every run produces a full set of product deliverables: a PRD with user stories and acceptance criteria, a prioritized backlog, system architecture, UX flows, a QA risk plan, a sprint roadmap and a business case. Each artifact is versioned.",
      },
    },
    {
      "@type": "Question",
      name: "How is Forge different from asking a single chatbot?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Forge runs six role-specialized AI agents that challenge each other's assumptions, debate contentious points and vote — surfacing where a plan is fragile before you build it, with a full reasoning trace.",
      },
    },
    {
      "@type": "Question",
      name: "Can I audit why a decision was made?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Every consensus is logged with the full debate, each agent's vote, the rationale and a confidence score. Outputs cite their knowledge sources inline.",
      },
    },
    {
      "@type": "Question",
      name: "How long does a run take?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most runs complete in well under three minutes, and the whole orchestration is visible live while it executes.",
      },
    },
  ],
}

const appJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Forge",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "AI-powered product simulation platform. Six specialized AI agents debate, vote and generate PRDs, backlogs, architecture and roadmaps.",
  url: "https://forgems.vercel.app",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free plan with 2 projects and 5 runs per month",
  },
}

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <LandingPage />
    </>
  )
}
