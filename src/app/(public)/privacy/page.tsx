import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — BoxdSeats",
  description: "How BoxdSeats handles your data.",
};

const UPDATED = "June 19, 2026";

export default function PrivacyPage() {
  return (
    <main className="max-w-lg mx-auto px-4 py-8 text-text-secondary text-sm leading-relaxed">
      <h1 className="font-display text-2xl text-text-primary tracking-wide mb-1">Privacy Policy</h1>
      <p className="text-xs text-text-muted mb-6">Last updated {UPDATED}</p>

      <p className="mb-4">
        BoxdSeats is an app for logging the live sports events you attend and sharing them with
        friends. This policy explains what we collect, why, and the choices you have. We do not sell
        your personal data, and we do not show third-party ads.
      </p>

      <Section title="What we collect">
        <p className="mb-2">When you create an account and use BoxdSeats, we store:</p>
        <List items={[
          "Account details: your email address and an encrypted password (handled by our authentication provider, which never stores it in plain text).",
          "Profile: the username, display name, bio, avatar, and favorite teams or venues you choose to add.",
          "Your activity: the games you log, ratings, notes, lists, photos you upload, comments you post, and the people you follow.",
          "Device token: if you turn on push notifications, the token your device needs to receive them.",
          "Basic technical logs: standard server logs such as IP address and request time, kept for security and troubleshooting.",
        ]} />
      </Section>

      <Section title="Your photos stay on your device">
        <p>
          The photo finder reads the date and location saved in your photos to suggest games you
          attended. That reading happens entirely on your device. Your photos and their location
          data are not uploaded. Only the matched venue and date are sent to our servers to look up
          the game. A photo is uploaded only when you choose to attach one to a logged event, and you
          can remove it at any time.
        </p>
      </Section>

      <Section title="How we use your data">
        <List items={[
          "To run the core features: logging games, building your profile and lists, and showing your activity to the people you allow.",
          "To send notifications you opt into, such as a new follower, like, comment, or tag.",
          "To keep the service secure and diagnose problems.",
        ]} />
        <p className="mt-2">We do not use your data for advertising, and we do not sell or rent it.</p>
      </Section>

      <Section title="What other people can see">
        <p>
          Your profile and the games you log are visible according to the privacy setting you pick
          per log and on your account. You control who can follow you, and you can make your account
          private. Comments and photos you post on shared events are visible to others who can see
          that event.
        </p>
      </Section>

      <Section title="Service providers">
        <p className="mb-2">A few trusted companies help us run the app and process data on our behalf:</p>
        <List items={[
          "Supabase — database, file storage, and authentication.",
          "Vercel — web hosting and content delivery.",
          "Apple Push Notification service — delivering notifications to your device.",
        ]} />
        <p className="mt-2">
          Sports schedules, scores, team names, and venue information come from public sources and
          are not derived from your personal data.
        </p>
      </Section>

      <Section title="Your choices and rights">
        <List items={[
          "Edit or delete your profile information at any time in Settings.",
          "Delete your account from Settings. This removes your account and the content tied to it.",
          "Turn notifications on or off per type in Settings, or in your device settings.",
          "Request a copy of your data or ask a question by emailing the address below.",
        ]} />
      </Section>

      <Section title="Data retention">
        <p>
          We keep your data while your account is active. When you delete your account, we remove
          your personal data and content, except where we need to keep limited records to meet legal
          obligations or to resolve disputes.
        </p>
      </Section>

      <Section title="Children">
        <p>
          BoxdSeats is not intended for children under 13, and we do not knowingly collect data from
          them. If you believe a child has given us data, contact us and we will remove it.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          If we make a material change, we will update the date above and, where appropriate, tell
          you in the app. Continued use after a change means you accept the updated policy.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about your privacy? Email{" "}
          <a href="mailto:support@boxdseats.com" className="text-accent hover:opacity-80">support@boxdseats.com</a>.
        </p>
      </Section>

      <p className="mt-8 text-xs text-text-muted">
        See also our <Link href="/terms" className="text-accent hover:opacity-80">Terms of Service</Link>.
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
