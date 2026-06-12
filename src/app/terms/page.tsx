import type { Metadata } from "next"
import { LegalLayout } from "@/components/legal/legal-layout"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of Forge.",
  alternates: { canonical: "/terms" },
}

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="June 11, 2026">
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the Forge
        platform, website and related services (the &ldquo;Service&rdquo;). By using the Service you
        agree to these Terms.
      </p>

      <h2>1. The Service</h2>
      <p>
        Forge orchestrates specialized AI agents that analyze a product idea and generate
        planning deliverables such as PRDs, backlogs, architecture documents and roadmaps.
        Generated content is produced by AI and provided as a starting point for your own
        work.
      </p>

      <h2>2. Your account</h2>
      <p>
        You must sign in with a supported authentication provider to use the Service. You
        are responsible for activity that occurs under your account and for keeping your
        credentials secure.
      </p>

      <h2>3. Your content</h2>
      <p>
        You retain ownership of the ideas, briefs and other content you submit, and of the
        deliverables generated for your projects. You grant us the limited rights needed to
        store and process that content solely to operate the Service.
      </p>

      <h2>4. Acceptable use</h2>
      <ul>
        <li>Do not use the Service to generate content that is unlawful or infringes the rights of others.</li>
        <li>Do not attempt to access projects or data belonging to other users.</li>
        <li>Do not probe, disrupt or overload the Service or its infrastructure.</li>
        <li>Do not resell or redistribute the Service without our written consent.</li>
      </ul>

      <h2>5. AI-generated content</h2>
      <p>
        AI output can contain errors, omissions or outdated information. You are
        responsible for reviewing and validating all generated deliverables before relying
        on them. The Service does not provide legal, financial or professional advice.
      </p>

      <h2>6. Plans and billing</h2>
      <p>
        Free and paid plans are described on our pricing page. Paid features, limits and
        prices may change; we will give reasonable notice of material changes to a plan you
        are subscribed to.
      </p>

      <h2>7. Availability and changes</h2>
      <p>
        We work to keep the Service available but do not guarantee uninterrupted operation.
        We may modify or discontinue features as the product evolves.
      </p>

      <h2>8. Disclaimer and limitation of liability</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; without warranties of any kind. To the maximum
        extent permitted by law, we are not liable for indirect, incidental or
        consequential damages arising from your use of the Service.
      </p>

      <h2>9. Termination</h2>
      <p>
        You may stop using the Service at any time. We may suspend or terminate access for
        violations of these Terms. Upon termination, your right to use the Service ends;
        you may request deletion of your data as described in the{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>10. Changes to these Terms</h2>
      <p>
        We may revise these Terms from time to time. Continued use of the Service after
        changes take effect constitutes acceptance of the revised Terms.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about these Terms? Reach us at <a href="mailto:legal@forge.dev">legal@forge.dev</a>.
      </p>
    </LegalLayout>
  )
}
