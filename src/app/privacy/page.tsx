import type { Metadata } from "next"
import { LegalLayout } from "@/components/legal/legal-layout"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Forge collects, uses and protects your data.",
  alternates: { canonical: "/privacy" },
}

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="June 11, 2026">
      <p>
        This Privacy Policy explains how Forge (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses and protects
        your information when you use the Forge platform, website and related services
        (collectively, the &ldquo;Service&rdquo;).
      </p>

      <h2>1. Information we collect</h2>
      <h3>Account information</h3>
      <p>
        When you sign in, we collect the information provided by your authentication
        provider: your name, email address and profile picture.
      </p>
      <h3>Content you create</h3>
      <p>
        We store the projects, briefs, decisions and artifacts you create in the Service so
        the platform can function. Project content is private to your account.
      </p>
      <h3>Usage data</h3>
      <p>
        We collect basic technical information needed to operate the Service — such as
        request logs, error reports and approximate timing of runs — to keep the platform
        reliable and secure.
      </p>

      <h2>2. How we use your information</h2>
      <ul>
        <li>To provide and operate the Service, including running AI agent orchestrations on your projects.</li>
        <li>To authenticate you and secure your account.</li>
        <li>To diagnose problems, prevent abuse and improve reliability.</li>
        <li>To communicate with you about the Service when necessary.</li>
      </ul>

      <h2>3. AI processing</h2>
      <p>
        When you start a run, your project brief and related context are sent to our AI
        infrastructure provider to generate deliverables. This content is used only to
        produce your results. We do not use your project content to train machine learning
        models.
      </p>

      <h2>4. Data sharing</h2>
      <p>
        We do not sell your personal information. We share data only with the service
        providers required to operate the platform (hosting, database, authentication and
        AI processing), each bound by their own confidentiality obligations, or when
        required by law.
      </p>

      <h2>5. Data retention and deletion</h2>
      <p>
        Your projects and their artifacts are retained while your account is active. You
        can delete any project from the workspace at any time; deletion permanently removes
        its artifacts, decisions and runs. To request deletion of your entire account and
        associated data, contact us at the address below.
      </p>

      <h2>6. Security</h2>
      <p>
        All data is encrypted in transit. Access to project data is scoped to the
        authenticated owner — API endpoints verify your session before returning any
        content.
      </p>

      <h2>7. Your rights</h2>
      <p>
        Depending on your jurisdiction, you may have the right to access, correct, export
        or delete your personal data. Contact us and we will respond within a reasonable
        timeframe.
      </p>

      <h2>8. Changes to this policy</h2>
      <p>
        We may update this policy as the Service evolves. Material changes will be
        reflected by the &ldquo;Last updated&rdquo; date above.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about this policy? Reach us at <a href="mailto:privacy@forge.dev">privacy@forge.dev</a>.
      </p>
    </LegalLayout>
  )
}
