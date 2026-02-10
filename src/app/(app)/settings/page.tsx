import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchSettingsProfile, fetchAvailableLists } from "@/lib/queries/settings";
import SettingsForm from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profile, availableLists] = await Promise.all([
    fetchSettingsProfile(supabase, user.id),
    fetchAvailableLists(supabase),
  ]);

  if (!profile) redirect("/login");

  return (
    <div className="max-w-lg mx-auto pb-5">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <Link href="/profile" className="p-1 hover:opacity-80 transition-opacity">
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
    </div>
  );
}
