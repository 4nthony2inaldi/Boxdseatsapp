"use client";

import Link from "next/link";

type Venue = {
  id: string;
  name: string;
  city: string;
  state: string | null;
  sport: string | null;
};

type StepFirstEventProps = {
  markedVenueIds: string[];
  allVenues: Venue[];
  finishing: boolean;
  onBack: () => void;
  onFinish: (skipFirstEvent?: boolean) => void;
};

export default function StepFirstEvent({
  markedVenueIds,
  allVenues,
  finishing,
  onBack,
  onFinish,
}: StepFirstEventProps) {
  // Show only venues from the ones the user just marked
  const markedVenues = allVenues.filter((v) => markedVenueIds.includes(v.id));

  return (
    <div>
      <h2 className="font-display text-[28px] text-text-primary tracking-wide leading-tight mb-1">
        Log Your First Event
      </h2>
      <p className="text-sm text-text-secondary mb-6">
        Seed your timeline with a recent game. This is optional.
      </p>

      <div className="bg-bg-card rounded-2xl border border-border p-5 mb-5 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-[28px]"
          style={{ background: "rgba(212,135,44,0.12)" }}
        >
          🏟️
        </div>
        <div className="font-display text-lg text-text-primary tracking-wide mb-5">
          What was the last game you went to?
        </div>

        {markedVenues.length > 0 ? (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {markedVenues.slice(0, 8).map((venue) => (
              <Link
                key={venue.id}
                href={`/log?venueId=${venue.id}&venueName=${encodeURIComponent(venue.name)}&venueCity=${encodeURIComponent(venue.city)}&venueState=${encodeURIComponent(venue.state || "")}&fromOnboarding=1`}
                onClick={() => onFinish(false)}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-bg-input border border-border text-left hover:border-accent/40 transition-colors block"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="text-[13px] text-text-primary">{venue.name}</span>
              </Link>
            ))}
            {markedVenues.length > 8 && (
              <p className="text-xs text-text-muted py-1">
                + {markedVenues.length - 8} more venues
              </p>
            )}
          </div>
        ) : (
          <div className="py-4">
            <p className="text-sm text-text-muted mb-3">
              No venues marked yet. You can still log an event from any venue.
            </p>
            <Link
              href="/log?fromOnboarding=1"
              onClick={() => onFinish(false)}
              className="inline-block px-5 py-2.5 rounded-xl bg-bg-input border border-border text-sm text-accent hover:border-accent/40 transition-colors"
            >
              Open Log Flow
            </Link>
          </div>
        )}
      </div>

      <button
        onClick={() => onFinish(true)}
        disabled={finishing}
        className="w-full py-4 rounded-xl font-display text-lg tracking-widest text-white disabled:opacity-50 transition-opacity mb-3"
        style={{
          background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))",
        }}
      >
        {finishing ? "FINISHING..." : "GO TO MY PROFILE"}
      </button>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl bg-bg-card border border-border text-text-secondary text-sm hover:bg-bg-elevated transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => onFinish(true)}
          disabled={finishing}
          className="flex-1 py-3 rounded-xl text-text-muted text-sm hover:text-text-secondary transition-colors bg-transparent border-none"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
