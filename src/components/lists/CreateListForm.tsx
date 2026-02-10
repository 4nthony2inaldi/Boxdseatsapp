"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createList, addListItem, searchVenuesForList } from "@/lib/queries/lists";

type VenueResult = {
  id: string;
  name: string;
  city: string;
  state: string | null;
};

type ListItem = {
  venue_id: string;
  display_name: string;
  city: string;
  state: string | null;
};

const SPORTS = [
  { value: "", label: "Any Sport" },
  { value: "baseball", label: "Baseball" },
  { value: "football", label: "Football" },
  { value: "basketball", label: "Basketball" },
  { value: "hockey", label: "Hockey" },
  { value: "soccer", label: "Soccer" },
  { value: "golf", label: "Golf" },
];

export default function CreateListForm({ userId }: { userId: string }) {
  const router = useRouter();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sport, setSport] = useState("");
  const [items, setItems] = useState<ListItem[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<VenueResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Save state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const supabase = createClient();
      const results = await searchVenuesForList(supabase, query);
      // Filter out already-added venues
      const addedIds = new Set(items.map((i) => i.venue_id));
      setSearchResults(results.filter((r) => !addedIds.has(r.id)));
      setSearching(false);
    }, 300);
  };

  const addVenue = (venue: VenueResult) => {
    setItems((prev) => [
      ...prev,
      {
        venue_id: venue.id,
        display_name: venue.name,
        city: venue.city,
        state: venue.state,
      },
    ]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeItem = (venueId: string) => {
    setItems((prev) => prev.filter((i) => i.venue_id !== venueId));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Please enter a list name.");
      return;
    }

    setSaving(true);
    setError(null);

    const supabase = createClient();

    // Create the list
    const result = await createList(supabase, userId, {
      name: name.trim(),
      description: description.trim(),
      list_type: "venue",
      sport: sport || null,
    });

    if ("error" in result) {
      setError(result.error);
      setSaving(false);
      return;
    }

    // Add items
    for (const item of items) {
      await addListItem(supabase, result.id, {
        venue_id: item.venue_id,
        display_name: item.display_name,
      });
    }

    router.push(`/lists/${result.id}`);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Name */}
      <div>
        <label className="font-display text-xs tracking-wider text-text-secondary uppercase block mb-2">
          List Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. My Bucket List Stadiums"
          className="w-full bg-bg-input border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
          maxLength={100}
        />
      </div>

      {/* Description */}
      <div>
        <label className="font-display text-xs tracking-wider text-text-secondary uppercase block mb-2">
          Description
          <span className="text-text-muted ml-1">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's this list about?"
          rows={3}
          className="w-full bg-bg-input border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors resize-none"
          maxLength={300}
        />
      </div>

      {/* Sport */}
      <div>
        <label className="font-display text-xs tracking-wider text-text-secondary uppercase block mb-2">
          Sport
          <span className="text-text-muted ml-1">(optional)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {SPORTS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSport(s.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-display tracking-wider uppercase border transition-colors cursor-pointer ${
                sport === s.value
                  ? "bg-accent/15 border-accent/30 text-accent"
                  : "bg-bg-elevated border-border text-text-secondary hover:border-text-muted"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Add Venues */}
      <div>
        <label className="font-display text-xs tracking-wider text-text-secondary uppercase block mb-2">
          Venues
        </label>

        {/* Added items */}
        {items.length > 0 && (
          <div className="space-y-2 mb-3">
            {items.map((item, idx) => (
              <div
                key={item.venue_id}
                className="bg-bg-card rounded-xl border border-border px-4 py-3 flex items-center gap-3"
              >
                <span className="font-display text-xs text-text-muted w-5 text-center">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary truncate">
                    {item.display_name}
                  </div>
                  <div className="text-xs text-text-muted">
                    {item.city}
                    {item.state ? `, ${item.state}` : ""}
                  </div>
                </div>
                <button
                  onClick={() => removeItem(item.venue_id)}
                  className="text-text-muted hover:text-loss transition-colors cursor-pointer p-1"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search venues to add..."
            className="w-full bg-bg-input border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="mt-2 bg-bg-elevated border border-border rounded-xl overflow-hidden">
            {searchResults.map((venue) => (
              <button
                key={venue.id}
                onClick={() => addVenue(venue)}
                className="w-full text-left px-4 py-3 hover:bg-bg-input transition-colors border-b border-border last:border-b-0 cursor-pointer"
              >
                <div className="text-sm text-text-primary">
                  {venue.name}
                </div>
                <div className="text-xs text-text-muted">
                  {venue.city}
                  {venue.state ? `, ${venue.state}` : ""}
                </div>
              </button>
            ))}
          </div>
        )}

        {searchQuery && !searching && searchResults.length === 0 && (
          <div className="mt-2 text-center py-3 text-text-muted text-xs">
            No venues found
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="text-loss text-sm text-center">{error}</div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving || !name.trim()}
        className="w-full bg-gradient-to-r from-accent to-accent-hover rounded-xl py-3.5 text-center font-display text-lg tracking-[2px] text-white uppercase shadow-lg shadow-accent/20 hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
      >
        {saving ? "Creating..." : "Create List"}
      </button>
    </div>
  );
}
