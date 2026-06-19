import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — BoxdSeats",
  description: "The terms for using BoxdSeats.",
};

const UPDATED = "June 19, 2026";

export default function TermsPage() {
  return (
    <main className="max-w-lg mx-auto px-4 py-8 text-text-secondary text-sm leading-relaxed">
      <h1 className="font-display text-2xl text-text-primary tracking-wide mb-1">Terms of Service</h1>
      <p className="text-xs text-text-muted mb-6">Last updated {UPDATED}</p>

      <p className="mb-4">
        These terms are an agreement between you and BoxdSeats. By creating an account or using the
        app, you accept them. If you do not agree, please do not use BoxdSeats.
      </p>

      <Section title="Who can use BoxdSeats">
        <p>
          You must be at least 13 years old. You are responsible for your account and for keeping
          your password safe. Provide accurate information when you sign up.
        </p>
      </Section>

      <Section title="Your content">
        <p className="mb-2">
          You own the content you create, including your logs, notes, photos, comments, and lists.
          By posting it, you give BoxdSeats a limited license to store and display it so the app can
          show it to you and to the people you share it with. This license ends when you delete the
          content or your account, except for copies already shared with other users or kept in
          backups for a short time.
        </p>
        <p>You are responsible for the content you post and for having the right to post it.</p>
      </Section>

      <Section title="Community rules and objectionable content">
        <p className="mb-2">
          BoxdSeats has no tolerance for objectionable content or abusive behavior. You agree not to
          post content that is unlawful, hateful, harassing, threatening, sexually explicit,
          defamatory, or that infringes someone else&apos;s rights, and not to impersonate others or
          spam.
        </p>
        <p className="mb-2">
          You can report any photo, comment, or logged event using the report option next to it, and
          you can block another user from their profile. We review reports and act on objectionable
          content or abusive users within 24 hours, which may include removing the content and
          suspending or removing the account responsible.
        </p>
        <p>
          Reporting and blocking tools are built into the app. If you cannot reach them, email the
          address below.
        </p>
      </Section>

      <Section title="Sports names, logos, and data">
        <p>
          Team names, league names, venue names, and logos belong to their respective owners.
          BoxdSeats is an independent app for fans to log events they attend. It is not affiliated
          with, endorsed by, or sponsored by any team, league, venue, or their partners. We show
          this information to help you identify the games you went to.
        </p>
      </Section>

      <Section title="Acceptable use">
        <List items={[
          "Do not break the law or use the app to harm others.",
          "Do not try to access accounts or data that are not yours.",
          "Do not scrape, overload, or interfere with the service.",
          "Do not upload malware or attempt to reverse engineer the app beyond what the law allows.",
        ]} />
      </Section>

      <Section title="Account suspension and termination">
        <p>
          You can delete your account at any time in Settings. We may suspend or remove an account
          that breaks these terms or puts other users at risk. Where practical, we will tell you why.
        </p>
      </Section>

      <Section title="The service is provided as is">
        <p>
          We work to keep BoxdSeats accurate and available, but we provide it as is, without
          warranties. Sports schedules and scores come from public sources and may contain errors or
          gaps. We are not liable for indirect or incidental damages arising from your use of the app,
          to the extent the law allows.
        </p>
      </Section>

      <Section title="Changes to these terms">
        <p>
          We may update these terms. If a change is material, we will update the date above and, where
          appropriate, notify you in the app. Continued use after a change means you accept the updated
          terms.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about these terms? Email{" "}
          <a href="mailto:support@boxdseats.com" className="text-accent hover:opacity-80">support@boxdseats.com</a>.
        </p>
      </Section>

      <p className="mt-8 text-xs text-text-muted">
        See also our <Link href="/privacy" className="text-accent hover:opacity-80">Privacy Policy</Link>.
      </p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="font-display text-[13px] text-text-muted tracking-[2px] uppercase mb-2">{title}</h2>
      {children}
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5">
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  );
}
