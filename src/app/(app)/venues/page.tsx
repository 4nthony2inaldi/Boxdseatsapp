import { createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";

type VisitedVenue = {
  venue_id: string;
  name: string;
  city: string;
  state: string | null;
  visit_count: number;
};

async function fetchVisitedVenues(
  supabase: SupabaseClient,
  userId: string
): Promise<VisitedVenue[]> {
  // Get all venues the user has visited
  const { data: visits } = await supabase
    .from("venue_visits")
    .select("venue_id, venues(name, city, state)")
    .eq("user_id", userId)
    .eq("relationship", "visited")
    .order("updated_at", { ascending: false });

  if (!visits || visits.length === 0) return [];

  // Get event log counts per venue
  const { data: logs } = await supabase
    .from("event_logs")
    .select("venue_id")
    .eq("user_id", userId);

  const countMap = new Map<string, number>();
  if (logs) {
    for (const log of logs) {
      if (log.venue_id) {
        countMap.set(log.venue_id, (countMap.get(log.venue_id) || 0) + 1);
      }
    }
  }

  return visits.map((v) => {
    const venue = v.venues as unknown as {
      name: string;
      city: string;
      state: string | null;
    } | null;
    return {
      venue_id: v.venue_id,
      name: venue?.name || "Unknown Venue",
      city: venue?.city || "",
      state: venue?.state || null,
      visit_count: countMap.get(v.venue_id) || 0,
    };
  });
}

export default async function VenuesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">Please log in to view your venues.</p>
      </div>
    );
  }

  const venues = await fetchVisitedVenues(supabase, user.id);

  return (
    <div className="max-w-lg mx-auto pb-5">
      {/* Back header */}
      <div className="flex items-center gap-3 px-4 mt-4 mb-4">
        <Link
          href="/profile"
          className="flex items-center justify-center w-8 h-8 rounded-full bg-bg-elevated"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#F0EBE0"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="font-display text-2xl text-text-primary tracking-wide leading-tight">
            Visited Venues
          </h1>
          <span className="text-text-secondary text-sm">
            {venues.length} {venues.length === 1 ? "venue" : "venues"}
          </span>
        </div>
      </div>

      <div className="px-4">
        {venues.length > 0 ? (
          <div className="space-y-2">
            {venues.map((venue) => (
              <Link key={venue.venue_id} href={`/venue/${venue.venue_id}`}>
                <div className="rounded-xl border border-border bg-bg-card px-4 py-3 flex items-center gap-3 hover:border-accent transition-colors">
                  {/* Map pin icon */}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#D4872C"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text-primary truncate">
                      {venue.name}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {venue.city}
                      {venue.state ? `, ${venue.state}` : ""}
                      {venue.visit_count > 0 && (
                        <span>
                          {" "}
                          · {venue.visit_count}{" "}
                          {venue.visit_count === 1 ? "event" : "events"}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Chevron */}
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#5A5F72"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-bg-card p-8 text-center">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5A5F72"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-3"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <div className="font-display text-lg text-text-primary tracking-wide mb-2">
              No Venues Yet
            </div>
            <p className="text-text-muted text-sm mb-4">
              Log your first event to start tracking venues you&apos;ve visited.
            </p>
            <Link
              href="/log"
              className="inline-block px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))",
              }}
            >
              Log an Event
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
