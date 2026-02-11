"use client";

import { useState } from "react";
import SportIcon from "@/components/SportIcon";
import SectionLabel from "./SectionLabel";
import BadgeDetailModal from "./BadgeDetailModal";
import type { BadgeData, TrackedListProgress } from "@/lib/queries/badges";

type BadgeSectionProps = {
  badges: BadgeData[];
  tracked: TrackedListProgress[];
  userId: string;
};

export default function BadgeSection({ badges, tracked, userId }: BadgeSectionProps) {
  const [selectedBadge, setSelectedBadge] = useState<BadgeData | null>(null);

  if (badges.length === 0 && tracked.length === 0) return null;

  return (
    <div className="px-4 mb-5">
      <SectionLabel>Badges</SectionLabel>
      <div className="flex flex-wrap gap-3">
        {/* Earned badges — glowing accent */}
        {badges.map((badge) => (
          <button
            key={badge.id}
            onClick={() => setSelectedBadge(badge)}
            className="flex flex-col items-center gap-1.5 w-[72px] group"
          >
            <div
              className="relative w-14 h-14 rounded-full flex items-center justify-center border-2 border-accent bg-bg-elevated"
              style={{
                boxShadow: "0 0 12px rgba(212, 135, 44, 0.4), 0 0 4px rgba(212, 135, 44, 0.2)",
              }}
            >
              <SportIcon sport={badge.list_sport} size={24} />
              {badge.is_legacy && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent-brown rounded-full flex items-center justify-center">
                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1l1.5 3H11l-2.5 2 1 3L6 7.5 2.5 9l1-3L1 4h3.5z" fill="#F0EBE0" />
                  </svg>
                </div>
              )}
            </div>
            <span className="text-[10px] text-text-secondary text-center leading-tight line-clamp-2">
              {badge.list_name}
            </span>
          </button>
        ))}

        {/* Tracked incomplete — locked/muted */}
        {tracked.map((list) => {
          const pct = list.item_count > 0 ? Math.round((list.visited / list.item_count) * 100) : 0;
          return (
            <div
              key={list.list_id}
              className="flex flex-col items-center gap-1.5 w-[72px]"
            >
              <div className="relative w-14 h-14 rounded-full flex items-center justify-center border border-border bg-bg-card opacity-50">
                <SportIcon sport={list.list_sport} size={24} className="opacity-40" />
                {/* Lock icon overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5A5F72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
              </div>
              <span className="text-[10px] text-text-muted text-center leading-tight line-clamp-2">
                {list.list_name}
              </span>
              <span className="text-[9px] text-text-muted font-display tracking-wider">
                {pct}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Badge detail modal */}
      {selectedBadge && (
        <BadgeDetailModal
          badge={selectedBadge}
          userId={userId}
          onClose={() => setSelectedBadge(null)}
        />
      )}
    </div>
  );
}
