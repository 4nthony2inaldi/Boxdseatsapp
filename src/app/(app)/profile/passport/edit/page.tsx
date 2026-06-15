import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { fetchPassportListOptions } from "@/lib/queries/passport";
import PassportEditor from "@/components/passport/PassportEditor";

export const dynamic = "force-dynamic";

export default async function PassportEditPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, passport_config")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const options = await fetchPassportListOptions(supabase, user.id);

  const config = (profile.passport_config as { lists?: string[]; hidden?: string[] } | null) ?? null;
  // Default selection mirrors the passport's default: top-6 most-progressed.
  const initialSelected =
    config?.lists && config.lists.length > 0
      ? config.lists
      : options.slice(0, 6).map((o) => o.id);
  const initialHidden = Array.isArray(config?.hidden) ? config!.hidden : [];

  return (
    <PassportEditor
      userId={user.id}
      username={profile.username}
      options={options}
      initialSelected={initialSelected}
      initialHidden={initialHidden}
    />
  );
}
