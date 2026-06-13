"use client";

import { useState } from "react";
import SectionLabel from "@/components/profile/SectionLabel";
import ListCard from "./ListCard";
import type { ListSummary, UserListSummary } from "@/lib/queries/lists";

const SPORT_ORDER = [
  "baseball",
  "football",
  "basketball",
  "hockey",
  "soccer",
  "golf",
  "tennis",
  "motorsports",
];

const SPORT_LABELS: Record<string, string> = {
  baseball: "Baseball",
  football: "Football",
  basketball: "Basketball",
  hockey: "Hockey",
  soccer: "Soccer",
  golf: "Golf",
  tennis: "Tennis",
  motorsports: "Motorsports",
  other: "More",
};

type Props = {
  userLists: UserListSummary[];
  followedLists: UserListSummary[];
  systemLists: ListSummary[];
};

function creatorSubtitle(list: UserListSummary): string | undefined {
  const name = list.creator_display_name || list.creator_username;
  return name ? `by ${name}` : undefined;
}

export default function ListsBrowser({
  userLists,
  followedLists,
  systemLists,
}: Props) {
  const [query, setQuery] = useState("");

  // Group challenges (system lists) by sport, in a stable order.
  const groups = SPORT_ORDER.map((sport) => ({
    sport,
    lists: systemLists.filter((l) => l.sport === sport),
  })).filter((g) => g.lists.length > 0);
  const ungrouped = systemLists.filter(
    (l) => !l.sport || !SPORT_ORDER.includes(l.sport)
  );
  if (ungrouped.length > 0) groups.push({ sport: "other", lists: ungrouped });

  // Single-open accordion: exactly one sport expanded at a time.
  const [openSport, setOpenSport] = useState(groups[0]?.sport ?? "");

  const q = query.trim().toLowerCase();

  const searchBox = (
    <div className="relative mb-6">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search lists"
        className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-bg-input border border-border focus:border-accent text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors"
      />
      {query && (
        <button
          onClick={() => setQuery("")}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
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
      )}
    </div>
  );

  // ── Search mode: flat results across every list on the page ──
  if (q) {
    const matches = (l: { name: string; description: string | null }) =>
      l.name.toLowerCase().includes(q) ||
      (l.description?.toLowerCase().includes(q) ?? false);

    const results = [
      ...userLists.filter(matches).map((l) => ({ list: l, subtitle: undefined })),
      ...followedLists
        .filter(matches)
        .map((l) => ({ list: l, subtitle: creatorSubtitle(l) })),
      ...systemLists.filter(matches).map((l) => ({ list: l, subtitle: undefined })),
    ];

    return (
      <>
        {searchBox}
        {results.length > 0 ? (
          <div className="space-y-3">
            {results.map(({ list, subtitle }) => (
              <ListCard
                key={list.id}
                list={list}
                subtitle={subtitle}
                showIcon
              />
            ))}
          </div>
        ) : (
          <p className="text-text-muted text-sm text-center py-8">
            No lists match &ldquo;{query.trim()}&rdquo;.
          </p>
        )}
      </>
    );
  }

  // ── Default mode: My Lists, Following, then accordion challenges ──
  return (
    <>
      {searchBox}

      {userLists.length > 0 && (
        <div className="mb-6">
          <SectionLabel>My Lists</SectionLabel>
          <div className="space-y-4">
            {userLists.map((list) => (
              <ListCard key={list.id} list={list} />
            ))}
          </div>
        </div>
      )}

      {followedLists.length > 0 && (
        <div className="mb-6">
          <SectionLabel>Following</SectionLabel>
          <div className="space-y-4">
            {followedLists.map((list) => (
              <ListCard
                key={list.id}
                list={list}
                subtitle={creatorSubtitle(list)}
              />
            ))}
          </div>
        </div>
      )}

      {groups.length > 0 && (
        <div className="mb-6">
          <SectionLabel>Challenges</SectionLabel>
          <div className="space-y-2">
            {groups.map((group) => {
              const open = openSport === group.sport;
              return (
                <div
                  key={group.sport}
                  className="border border-border rounded-xl overflow-hidden bg-bg-card/30"
                >
                  <button
                    onClick={() => setOpenSport(group.sport)}
                    aria-expanded={open}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="font-display text-[11px] text-text-muted tracking-[1.5px] uppercase">
                      {SPORT_LABELS[group.sport] || "More"}{" "}
                      <span className="text-text-muted/60">
                        ({group.lists.length})
                      </span>
                    </span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`text-text-muted transition-transform ${
                        open ? "rotate-180" : ""
                      }`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {open && (
                    <div className="px-3 pb-3 space-y-3">
                      {group.lists.map((list) => (
                        <ListCard key={list.id} list={list} showIcon />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
