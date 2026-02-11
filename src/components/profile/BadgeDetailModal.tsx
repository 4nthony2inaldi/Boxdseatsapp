"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchBadgeItems } from "@/lib/queries/badges";
import SportIcon from "@/components/SportIcon";
import type { BadgeData } from "@/lib/queries/badges";

type BadgeDetailModalProps = {
  badge: BadgeData;
  userId: string;
  onClose: () => void;
};

type BadgeItem = {
  display_name: string;
  visited: boolean;
};

export default function BadgeDetailModal({ badge, userId, onClose }: BadgeDetailModalProps) {
  const [items, setItems] = useState<BadgeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const result = await fetchBadgeItems(supabase, badge.list_id, userId);
      setItems(result);
      setLoading(false);
    }
    load();
  }, [badge.list_id, userId]);

  const completedDate = new Date(badge.completed_at);
  const dateStr = completedDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const yearStr = completedDate.getFullYear().toString();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Modal */}
      <div
        className="relative bg-bg-card rounded-t-2xl sm:rounded-2xl border border-border w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-accent bg-bg-elevated"
              style={{
                boxShadow: "0 0 12px rgba(212, 135, 44, 0.4)",
              }}
            >
              <SportIcon sport={badge.list_sport} size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-lg text-text-primary tracking-wide truncate">
                {badge.list_name}
              </h3>
              <p className="text-xs text-text-muted">
                Completed {dateStr}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-bg-input text-text-muted hover:text-text-primary transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Completion stats */}
          <div className="flex items-center gap-2">
            <div className="font-display text-2xl text-accent tracking-wider">
              {badge.item_count_at_completion}/{badge.item_count_at_completion}
            </div>
            {badge.is_legacy && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-brown/20 border border-accent-brown/30 text-[10px] text-accent-brown font-display tracking-wider uppercase">
                <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1l1.5 3H11l-2.5 2 1 3L6 7.5 2.5 9l1-3L1 4h3.5z" fill="currentColor" />
                </svg>
                Vintage {yearStr}
              </span>
            )}
          </div>

          {/* Legacy: show new progress bar for updated list */}
          {badge.is_legacy && badge.current_item_count !== badge.item_count_at_completion && (
            <div className="mt-3">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] text-text-muted">
                  Current progress ({badge.current_item_count} items)
                </span>
                <span className="font-display text-xs text-text-secondary tracking-wider">
                  {badge.current_visited}/{badge.current_item_count}
                </span>
              </div>
              <div className="h-[5px] bg-bg-input rounded-sm overflow-hidden">
                <div
                  className="h-full rounded-sm"
                  style={{
                    width: `${Math.round((badge.current_visited / badge.current_item_count) * 100)}%`,
                    background: "linear-gradient(90deg, var(--color-accent), var(--color-accent-brown))",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 py-1.5"
                >
                  {item.visited ? (
                    <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#D4872C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-border flex-shrink-0" />
                  )}
                  <span
                    className={`text-sm ${
                      item.visited ? "text-text-primary" : "text-text-muted"
                    }`}
                  >
                    {item.display_name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
