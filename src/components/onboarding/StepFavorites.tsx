"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateBigFourAndSport } from "@/lib/queries/onboarding";
import BigFourDrillThrough from "@/components/profile/BigFourDrillThrough";
import SportIcon from "@/components/SportIcon";
import { SPORTS_LIST } from "@/lib/sportIcons";

type StepFavoritesProps = {
  userId: string;
  favSport: string | null;
  onFavSportChange: (v: string | null) => void;
  onBack: () => void;
  onNext: () => void;
};

const SPORTS = SPORTS_LIST;
const CATEGORIES: { key: "team" | "athlete" | "venue"; label: string }[] = [
  { key: "team", label: "Teams" },
  { key: "athlete", label: "Athletes" },
  { key: "venue", label: "Venues" },
];

export default function StepFavorites({
  userId,
  favSport,
  onFavSportChange,
  onBack,
  onNext,
}: StepFavoritesProps) {
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"team" | "athlete" | "venue">("team");
  const supabase = createClient();

  async function handleNext() {
    setSaving(true);
    // Per-league favorites + featured picks are persisted live by the
    // drill-through; here we only need to save the sport badge.
    await updateBigFourAndSport(supabase, userId, { fav_sport: favSport });
    setSaving(false);
    onNext();
  }

  return (
    <div>
      <h2 className="font-display text-[28px] text-text-primary tracking-wide leading-tight mb-1">
        Your Fandom
      </h2>
      <p className="text-sm text-text-secondary mb-5">
        Pick a favorite for every league you follow — this is your sports
        passport. Star one in each category to feature it on your profile.
      </p>

      {/* Sport Badge */}
      <div className="mb-5">
        <label className="font-display text-[11px] text-text-muted tracking-[1.2px] uppercase block mb-2">
          Favorite Sport <span className="text-text-muted font-body text-[10px] normal-case tracking-normal">(avatar badge)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {SPORTS.map((s) => {
            const selected = favSport === s.key;
            return (
              <button
                key={s.key}
                onClick={() => onFavSportChange(selected ? null : s.key)}
                className="px-3.5 py-2 rounded-full text-xs transition-colors active:opacity-70"
                style={{
                  background: selected ? "rgba(212,135,44,0.15)" : "var(--color-bg-input)",
                  border: `1px solid ${selected ? "var(--color-accent)" : "var(--color-border)"}`,
                  color: selected ? "var(--color-accent)" : "var(--color-text-secondary)",
                  fontWeight: selected ? 600 : 400,
                }}
              >
                <SportIcon sport={s.key} size={14} className="inline-block mr-1 -mt-0.5" /> {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 mb-4">
        {CATEGORIES.map((c) => {
          const active = tab === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setTab(c.key)}
              className="flex-1 py-2 rounded-lg font-display text-xs tracking-[1px] uppercase transition-colors active:opacity-70"
              style={{
                background: active ? "var(--color-accent)" : "var(--color-bg-input)",
                color: active ? "#fff" : "var(--color-text-secondary)",
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Drill-throughs stay mounted so picks persist across tab switches */}
      {CATEGORIES.map((c) => (
        <div key={c.key} className={tab === c.key ? "" : "hidden"}>
          <BigFourDrillThrough
            userId={userId}
            category={c.key}
            initialFavorites={[]}
            featuredPickId={null}
          />
        </div>
      ))}

      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="flex-1 py-3.5 rounded-xl bg-bg-card border border-border text-text-secondary text-sm hover:bg-bg-elevated active:opacity-70 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={saving}
          className="flex-[2] py-3.5 rounded-xl font-display text-base tracking-widest text-white disabled:opacity-50 active:opacity-80 transition-opacity"
          style={{
            background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))",
          }}
        >
          {saving ? "SAVING..." : "NEXT"}
        </button>
      </div>
    </div>
  );
}
