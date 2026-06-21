import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchSettingsProfile, fetchAvailableLists } from "@/lib/queries/settings";
import { fetchBlockedUsers } from "@/lib/queries/social";
import { isAdmin } from "@/lib/queries/admin";
import BlockedUsers from "@/components/settings/BlockedUsers";
import SettingsForm from "@/components/settings/SettingsForm";
import PageHeader from "@/components/PageHeader";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profile, availableLists, blockedUsers, admin] = await Promise.all([
    fetchSettingsProfile(supabase, user.id),
    fetchAvailableLists(supabase),
    fetchBlockedUsers(supabase, user.id),
    isAdmin(supabase, user.id),
  ]);

  if (!profile) redirect("/login");

  return (
    <div className="max-w-lg mx-auto pb-5">
      <PageHeader title="Settings" backHref="/profile" backClassName="p-2.5 -m-2.5 hover:opacity-80 transition-opacity" />
      <SettingsForm
        profile={profile}
        userEmail={user.email || ""}
        availableLists={availableLists}
      />
      <BlockedUsers currentUserId={user.id} blockedUsers={blockedUsers} />
      <div className="px-4 mt-6 flex items-center justify-center gap-4 text-xs text-text-muted">
        <Link href="/privacy" className="hover:text-text-secondary transition-colors">Privacy Policy</Link>
        <span>·</span>
        <Link href="/terms" className="hover:text-text-secondary transition-colors">Terms of Service</Link>
      </div>
      {admin && (
        <div className="px-4 mt-4">
          <Link
            href="/admin"
            className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-bg-card hover:bg-bg-elevated active:opacity-70 transition-colors"
          >
            <span className="text-sm text-text-primary">Admin · Manage users</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
