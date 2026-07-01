"use client";

import { useState } from "react";
import ExploreSearch from "./ExploreSearch";
import Leaderboard from "@/components/leaderboard/Leaderboard";

/**
 * Explore is the app's Discover hub: Search (find teams/venues/players/fans) and
 * Leaderboards (rank fans by games logged). Search stays the default segment.
 */
export default function ExploreTabs() {
  const [tab, setTab] = useState<"search" | "leaderboards">("search");

  return (
    <div>
      <div className="px-4 mb-3">
        <div className="flex gap-1 rounded-xl bg-bg-input p-1">
          {(["search", "leaderboards"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize transition-colors ${
                tab === t ? "bg-accent text-bg" : "text-text-muted active:opacity-70"
              }`}
            >
              {t === "search" ? "Search" : "Leaderboards"}
            </button>
          ))}
        </div>
      </div>
      {tab === "search" ? <ExploreSearch /> : <Leaderboard />}
    </div>
  );
}
