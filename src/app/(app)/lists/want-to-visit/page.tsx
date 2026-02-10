import { createClient } from "@/lib/supabase/server";
import { fetchWantToVisitVenues } from "@/lib/queries/lists";
import Link from "next/link";
import SectionLabel from "@/components/profile/SectionLabel";

export default async function WantToVisitPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">Please log in to view your list.</p>
      </div>
    );
  }

  const venues = await fetchWantToVisitVenues(supabase, user.id);

  return (
    <div className="px-4 pb-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mt-4 mb-6">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-accent shrink-0"
        >
          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        <div>
          <h1 className="font-display text-2xl text-text-primary tracking-wide leading-tight">
            Want to Visit
          </h1>
          <span className="text-text-secondary text-sm">
            {venues.length} {venues.length === 1 ? "venue" : "venues"}
          </span>
        </div>
      </div>

      {/* Venue list */}
      {venues.length > 0 ? (
        <div>
          <SectionLabel>Venues</SectionLabel>
          <div className="space-y-2">
            {venues.map((venue) => (
              <Link key={venue.venue_id} href={`/venue/${venue.venue_id}`}>
                <div className="rounded-xl border border-border bg-bg-card px-4 py-3 flex items-center gap-3 hover:border-accent transition-colors">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-accent shrink-0"
                  >
                    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text-primary truncate">
                      {venue.name}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {venue.city}
                      {venue.state ? `, ${venue.state}` : ""}
                    </div>
                  </div>
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
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <div className="font-display text-lg text-text-primary tracking-wide mb-2">
            No Venues Yet
          </div>
          <p className="text-text-muted text-sm">
            Browse venues and tap &quot;Want to Visit&quot; to add them to your
            bucket list.
          </p>
        </div>
      )}
    </div>
  );
}
