import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchSettingsProfile, fetchAvailableLists } from "@/lib/queries/settings";
import { fetchBlockedUsers } from "@/lib/queries/social";
import { isAdmin } from "@/lib/queries/admin";
import BlockedUsers from "@/components/settings/BlockedUsers";
import SettingsForm from "@/components/settings/SettingsForm";

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
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <Link href="/profile" className="p-2.5 -m-2.5 hover:opacity-80 transition-opacity">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="font-display text-lg text-text-primary tracking-wide">
          Settings
        </h1>
      </div>
      <SettingsForm
        profile={profile}
        userEmail={user.email || ""}
        availableLists={availableLists}
      />
      <BlockedUsers currentUserId={user.id} blockedUsers={blockedUsers} />
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
