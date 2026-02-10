"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  updateList,
  deleteList,
  addListItem,
  removeListItem,
  searchVenuesForList,
} from "@/lib/queries/lists";

type ExistingItem = {
  id: string;
  venue_id: string | null;
  display_name: string;
};

type Props = {
  listId: string;
  userId: string;
  initialName: string;
  initialDescription: string;
  initialItems: ExistingItem[];
};

export default function EditListForm({
  listId,
  userId,
  initialName,
  initialDescription,
  initialItems,
}: Props) {
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [items, setItems] = useState<ExistingItem[]>(initialItems);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; name: string; city: string; state: string | null }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Action states
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
      const addedIds = new Set(items.map((i) => i.venue_id));
      setSearchResults(results.filter((r) => !addedIds.has(r.id)));
      setSearching(false);
    }, 300);
  };

  const handleAddVenue = async (venue: {
    id: string;
    name: string;
    city: string;
    state: string | null;
  }) => {
    const supabase = createClient();
    const result = await addListItem(supabase, listId, {
      venue_id: venue.id,
      display_name: venue.name,
    });

    if ("id" in result) {
      setItems((prev) => [
        ...prev,
        { id: result.id, venue_id: venue.id, display_name: venue.name },
      ]);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRemoveItem = async (itemId: string) => {
    const supabase = createClient();
    const previous = items;
    setItems((prev) => prev.filter((i) => i.id !== itemId));

    const result = await removeListItem(supabase, listId, itemId);
    if ("error" in result) {
      setItems(previous);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Please enter a list name.");
      return;
    }

    setSaving(true);
    setError(null);

    const supabase = createClient();
    const result = await updateList(supabase, userId, listId, {
      name: name.trim(),
      description: description.trim() || undefined,
    });

    if ("error" in result) {
      setError(result.error);
      setSaving(false);
      return;
    }

    router.push(`/lists/${listId}`);
    router.refresh();
  };

  const handleDelete = async () => {
    setDeleting(true);
    const supabase = createClient();
    const result = await deleteList(supabase, userId, listId);

    if ("error" in result) {
      setError(result.error);
      setDeleting(false);
      return;
    }

    router.push("/lists");
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
          className="w-full bg-bg-input border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
          maxLength={100}
        />
      </div>

      {/* Description */}
      <div>
        <label className="font-display text-xs tracking-wider text-text-secondary uppercase block mb-2">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full bg-bg-input border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors resize-none"
          maxLength={300}
        />
      </div>

      {/* Items */}
      <div>
        <label className="font-display text-xs tracking-wider text-text-secondary uppercase block mb-2">
          Venues ({items.length})
        </label>

        {items.length > 0 && (
          <div className="space-y-2 mb-3">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="bg-bg-card rounded-xl border border-border px-4 py-3 flex items-center gap-3"
              >
                <span className="font-display text-xs text-text-muted w-5 text-center">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary truncate">
                    {item.display_name}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveItem(item.id)}
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

        {searchResults.length > 0 && (
          <div className="mt-2 bg-bg-elevated border border-border rounded-xl overflow-hidden">
            {searchResults.map((venue) => (
              <button
                key={venue.id}
                onClick={() => handleAddVenue(venue)}
                className="w-full text-left px-4 py-3 hover:bg-bg-input transition-colors border-b border-border last:border-b-0 cursor-pointer"
              >
                <div className="text-sm text-text-primary">{venue.name}</div>
                <div className="text-xs text-text-muted">
                  {venue.city}
                  {venue.state ? `, ${venue.state}` : ""}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="text-loss text-sm text-center">{error}</div>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving || !name.trim()}
        className="w-full bg-gradient-to-r from-accent to-accent-hover rounded-xl py-3.5 text-center font-display text-lg tracking-[2px] text-white uppercase shadow-lg shadow-accent/20 hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>

      {/* Delete */}
      <div className="border-t border-border pt-6">
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-3 rounded-xl border border-loss/30 text-loss font-display text-sm tracking-wider uppercase hover:bg-loss/10 transition-colors cursor-pointer"
          >
            Delete List
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary text-center">
              Are you sure? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-border text-text-secondary font-display text-sm tracking-wider uppercase hover:border-text-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-loss text-white font-display text-sm tracking-wider uppercase hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
