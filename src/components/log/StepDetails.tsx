"use client";

import { useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  searchUsers,
  type CompanionInput,
  type UserSearchResult,
  type EventMatch,
} from "@/lib/queries/log";

type StepDetailsProps = {
  userId: string;
  selectedEvent: EventMatch | null;
  manualTitle: string | null;
  venueName: string;
  date: string;
  onSave: (details: DetailsData) => void;
  onBack: () => void;
  saving: boolean;
};

export type DetailsData = {
  rating: number | null;
  rooting_team_id: string | null;
  is_neutral: boolean;
  seat_location: string;
  notes: string;
  companions: CompanionInput[];
  privacy: "show_all" | "hide_personal" | "hide_all";
};

export default function StepDetails({
  userId,
  selectedEvent,
  manualTitle,
  venueName,
  date,
  onSave,
  onBack,
  saving,
}: StepDetailsProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [rootingTeamId, setRootingTeamId] = useState<string | null>(null);
  const [isNeutral, setIsNeutral] = useState(false);
  const [seatLocation, setSeatLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [privacy, setPrivacy] = useState<
    "show_all" | "hide_personal" | "hide_all"
  >("show_all");
  const [companions, setCompanions] = useState<CompanionInput[]>([]);
  const [companionSearch, setCompanionSearch] = useState("");
  const [companionResults, setCompanionResults] = useState<UserSearchResult[]>(
    []
  );
  const [showCompanionSearch, setShowCompanionSearch] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric" }
  );

  const eventTitle =
    selectedEvent?.home_team_short && selectedEvent?.away_team_short
      ? `${selectedEvent.away_team_short} @ ${selectedEvent.home_team_short}`
      : selectedEvent?.tournament_name || manualTitle || "Event";

  // Teams for rooting interest
  const hasTeams = selectedEvent?.home_team_id && selectedEvent?.away_team_id;

  const handleCompanionSearch = useCallback(
    (query: string) => {
      setCompanionSearch(query);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!query.trim()) {
        setCompanionResults([]);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        const supabase = createClient();
        const results = await searchUsers(supabase, query, userId);
        setCompanionResults(results);
      }, 300);
    },
    [userId]
  );

  const addCompanion = (user: UserSearchResult) => {
    if (companions.some((c) => c.tagged_user_id === user.id)) return;
    setCompanions([
      ...companions,
      { tagged_user_id: user.id, display_name: `@${user.username}` },
    ]);
    setCompanionSearch("");
    setCompanionResults([]);
    setShowCompanionSearch(false);
  };

  const addFreeTextCompanion = () => {
    const name = companionSearch.trim();
    if (!name) return;
    setCompanions([
      ...companions,
      { tagged_user_id: null, display_name: name },
    ]);
    setCompanionSearch("");
    setCompanionResults([]);
    setShowCompanionSearch(false);
  };

  const removeCompanion = (index: number) => {
    setCompanions(companions.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    onSave({
      rating,
      rooting_team_id: rootingTeamId,
      is_neutral: isNeutral,
      seat_location: seatLocation,
      notes,
      companions,
      privacy,
    });
  };

  return (
    <div>
      <div className="text-[13px] text-text-secondary mb-5">
        {eventTitle} &middot; {venueName} &middot; {formattedDate}
      </div>

      {/* Rooting interest */}
      {hasTeams && (
        <div className="mb-5">
          <label className="font-display text-[11px] text-text-muted tracking-[1.2px] uppercase block mb-2">
            Rooting for
          </label>
          <div className="flex gap-2">
            {[
              {
                label: selectedEvent!.home_team_short!,
                id: selectedEvent!.home_team_id!,
              },
              {
                label: selectedEvent!.away_team_short!,
                id: selectedEvent!.away_team_id!,
              },
              { label: "Neutral", id: null },
            ].map((opt) => {
              const isSelected = opt.id
                ? rootingTeamId === opt.id && !isNeutral
                : isNeutral;
              return (
                <button
                  key={opt.label}
                  onClick={() => {
                    if (opt.id) {
                      setRootingTeamId(opt.id);
                      setIsNeutral(false);
                    } else {
                      setRootingTeamId(null);
                      setIsNeutral(true);
                    }
                  }}
                  className={`flex-1 py-2.5 rounded-[10px] text-[13px] cursor-pointer border transition-colors ${
                    isSelected
                      ? "bg-accent/10 border-accent text-accent font-semibold"
                      : "bg-bg-input border-border text-text-secondary"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Rating */}
      <div className="mb-5">
        <label className="font-display text-[11px] text-text-muted tracking-[1.2px] uppercase block mb-2">
          Rating
        </label>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(rating === n ? null : n)}
              className="cursor-pointer bg-transparent border-none p-0"
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill={rating !== null && n <= rating ? "#D4872C" : "transparent"}
                stroke={
                  rating !== null && n <= rating ? "#D4872C" : "#5A5F72"
                }
                strokeWidth="1.5"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Seat location */}
      <div className="mb-5">
        <label className="font-display text-[11px] text-text-muted tracking-[1.2px] uppercase block mb-2">
          Where I Sat
        </label>
        <input
          value={seatLocation}
          onChange={(e) => setSeatLocation(e.target.value)}
          placeholder="Section, row, seat"
          className="w-full px-3.5 py-3 rounded-[10px] bg-bg-input border border-border text-text-primary text-sm outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Notes */}
      <div className="mb-5">
        <label className="font-display text-[11px] text-text-muted tracking-[1.2px] uppercase block mb-2">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What made this game memorable?"
          rows={3}
          className="w-full px-3.5 py-3 rounded-[10px] bg-bg-input border border-border text-text-primary text-sm outline-none resize-none font-[inherit] focus:border-accent transition-colors"
        />
      </div>

      {/* Companions */}
      <div className="mb-5">
        <label className="font-display text-[11px] text-text-muted tracking-[1.2px] uppercase block mb-2">
          With
        </label>
        {companions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {companions.map((c, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 bg-bg-input border border-border rounded-full px-2.5 py-1 text-xs text-text-secondary"
              >
                {c.display_name}
                <button
                  onClick={() => removeCompanion(i)}
                  className="text-text-muted hover:text-loss cursor-pointer bg-transparent border-none text-xs leading-none"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {!showCompanionSearch ? (
          <button
            onClick={() => setShowCompanionSearch(true)}
            className="text-[13px] text-accent cursor-pointer bg-transparent border-none hover:underline"
          >
            + Add companion
          </button>
        ) : (
          <div className="relative">
            <input
              value={companionSearch}
              onChange={(e) => handleCompanionSearch(e.target.value)}
              placeholder="@username or type a name"
              autoFocus
              className="w-full px-3.5 py-3 rounded-[10px] bg-bg-input border border-border text-text-primary text-sm outline-none focus:border-accent transition-colors"
              onKeyDown={(e) => {
                if (e.key === "Enter" && companionSearch.trim()) {
                  addFreeTextCompanion();
                }
              }}
            />
            {companionResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-bg-elevated border border-border rounded-lg py-1 z-20 shadow-lg max-h-40 overflow-y-auto">
                {companionResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => addCompanion(user)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-input cursor-pointer bg-transparent border-none"
                  >
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-[10px] text-accent font-medium shrink-0">
                      {(
                        user.display_name ||
                        user.username ||
                        "?"
                      )[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs text-text-primary">
                        {user.display_name || user.username}
                      </div>
                      <div className="text-[10px] text-text-muted">
                        @{user.username}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {companionSearch.trim() && companionResults.length === 0 && (
              <button
                onClick={addFreeTextCompanion}
                className="mt-1 text-xs text-text-secondary cursor-pointer bg-transparent border-none hover:text-accent"
              >
                Add &ldquo;{companionSearch.trim()}&rdquo; as plain text
              </button>
            )}
          </div>
        )}
      </div>

      {/* Photo upload placeholder */}
      <div className="mb-5">
        <label className="font-display text-[11px] text-text-muted tracking-[1.2px] uppercase block mb-2">
          Photo
        </label>
        <div className="w-full h-[100px] rounded-[10px] border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-accent/30 transition-colors">
          <span className="text-[13px] text-text-muted">+ Add photo</span>
        </div>
      </div>

      {/* Privacy */}
      <div className="mb-6">
        <label className="font-display text-[11px] text-text-muted tracking-[1.2px] uppercase block mb-2">
          Privacy
        </label>
        <div className="flex gap-1.5">
          {(
            [
              { value: "show_all", label: "Show All" },
              { value: "hide_personal", label: "Hide Personal" },
              { value: "hide_all", label: "Hide All" },
            ] as const
          ).map((opt) => {
            const isSelected = privacy === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setPrivacy(opt.value)}
                className={`flex-1 py-2.5 px-1 rounded-[10px] text-[11px] cursor-pointer border transition-colors ${
                  isSelected
                    ? "bg-accent/10 border-accent text-accent font-semibold"
                    : "bg-bg-input border-border text-text-secondary"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full py-3.5 rounded-xl text-white font-display text-lg tracking-[2px] cursor-pointer border-none disabled:opacity-50 disabled:cursor-default"
        style={{
          background: "linear-gradient(135deg, #D4872C, #7B5B3A)",
          boxShadow: "0 4px 20px rgba(212, 135, 44, 0.25)",
        }}
      >
        {saving ? "SAVING..." : "SAVE EVENT"}
      </button>

      {/* Back */}
      <button
        onClick={onBack}
        className="block mx-auto mt-3 text-[13px] text-text-secondary bg-transparent border-none cursor-pointer hover:text-text-primary"
      >
        ← Back
      </button>
    </div>
  );
}
