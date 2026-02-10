import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import { fetchAllVenues } from "@/lib/queries/onboarding";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check if user already completed onboarding
  if (user.user_metadata?.onboarding_completed) {
    redirect("/profile");
  }

  // Fetch profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, fav_sport")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // If they already have fav_sport set, they've done onboarding
  if (profile.fav_sport) {
    redirect("/profile");
  }

  // Fetch all venues for step 3
  const allVenues = await fetchAllVenues(supabase);

  return (
    <div className="max-w-lg mx-auto min-h-screen">
      <OnboardingFlow
        userId={user.id}
        initialUsername={profile.username}
        allVenues={allVenues}
      />
    </div>
  );
}
