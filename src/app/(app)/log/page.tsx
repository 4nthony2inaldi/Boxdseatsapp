import { createClient } from "@/lib/supabase/server";
import LogFlow from "@/components/log/LogFlow";
import { fetchEventLogForEdit } from "@/lib/queries/log";

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

  // Edit mode: fetch existing log
  const editId = typeof sp.edit === "string" ? sp.edit : undefined;
  if (editId) {
    const editLog = await fetchEventLogForEdit(supabase, editId, user.id);
    if (!editLog) {
      return (
        <div className="px-4 py-8 max-w-lg mx-auto text-center">
          <p className="text-text-muted">Event log not found.</p>
        </div>
      );
    }
    return <LogFlow userId={user.id} editLog={editLog} />;
  }

  // New log mode: optional venue pre-fill
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
