import { createClient } from "@/lib/supabase/server";
import LogFlow from "@/components/log/LogFlow";

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">Please log in to log events.</p>
      </div>
    );
  }

  const sp = await searchParams;
  const venueId = typeof sp.venueId === "string" ? sp.venueId : undefined;
  const venueName = typeof sp.venueName === "string" ? sp.venueName : undefined;
  const venueCity = typeof sp.venueCity === "string" ? sp.venueCity : undefined;
  const venueState = typeof sp.venueState === "string" ? sp.venueState : undefined;

  const prefillVenue =
    venueId && venueName
      ? {
          id: venueId,
          name: venueName,
          city: venueCity || "",
          state: venueState || null,
          visit_count: 0,
          sport_icon: null,
        }
      : undefined;

  return <LogFlow userId={user.id} prefillVenue={prefillVenue} />;
}
