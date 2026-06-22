import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support — BoxdSeats",
  description: "Get help with BoxdSeats: contact us, report content, or manage your account.",
};

export default function SupportPage() {
  return (
    <main className="max-w-lg mx-auto px-4 py-8 text-text-secondary text-sm leading-relaxed">
      <h1 className="font-display text-2xl text-text-primary tracking-wide mb-1">Support</h1>
      <p className="text-xs text-text-muted mb-6">We are here to help.</p>

      <p className="mb-4">
        BoxdSeats is an app for logging the live sports events you attend and sharing them with
        friends. If something is not working, you have a question, or you want to report a problem,
        get in touch and we will help.
      </p>

      <Section title="Contact us">
        <p>
          Email{" "}
          <a href="mailto:support@boxdseats.com" className="text-accent hover:opacity-80">support@boxdseats.com</a>
          {" "}and we will get back to you, usually within a couple of days. Tell us your username and
          what happened, and include a screenshot if you can.
        </p>
      </Section>

      <Section title="Common questions">
        <List items={[
          "Reset your password: on the login screen, tap \"Forgot password\" to get a reset link by email.",
          "Report a comment or photo: use the Report option next to the content. We review reports and act on objectionable content within 24 hours.",
          "Block a user: open their profile and choose Block. They will no longer be able to follow you or see your activity.",
          "Manage notifications: turn each type on or off in Settings, or in your device settings.",
          "Delete your account: go to Settings and choose Delete Account. This permanently removes your account and the content tied to it.",
        ]} />
      </Section>

      <Section title="The photo finder">
        <p>
          The optional photo finder reads the date and location saved in your photos to suggest games
          you attended. That reading happens entirely on your device. Your photos and their location
          are not uploaded. A photo is uploaded only when you choose to attach one to a logged event.
          You can turn this feature down by declining the photo permission, and it will not affect the
          rest of the app.
        </p>
      </Section>

      <Section title="Reporting abuse or a safety concern">
        <p>
          If you see content or behavior that puts someone at risk, email{" "}
          <a href="mailto:support@boxdseats.com" className="text-accent hover:opacity-80">support@boxdseats.com</a>
          {" "}with the details and we will act quickly.
        </p>
      </Section>

      <p className="mt-8 text-xs text-text-muted">
        See also our{" "}
        <Link href="/privacy" className="text-accent hover:opacity-80">Privacy Policy</Link>
        {" "}and{" "}
        <Link href="/terms" className="text-accent hover:opacity-80">Terms of Service</Link>.
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
