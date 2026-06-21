"use client";

import { useState } from "react";
import MiniLabel from "@/components/MiniLabel";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SportIcon from "@/components/SportIcon";
import Button from "@/components/Button";
import PageHeader from "@/components/PageHeader";
import { toastError } from "@/components/Toaster";
import type { PassportListOption } from "@/lib/queries/passport";

const SECTIONS = [
  { key: "map", label: "Map" },
  { key: "rings", label: "Bucket list" },
  { key: "topVenues", label: "Top venues" },
  { key: "sports", label: "By sport" },
  { key: "players", label: "Players you've seen" },
];

export default function PassportEditor({
  userId,
  username,
  options,
  initialSelected,
  initialHidden,
}: {
  userId: string;
  username: string;
  options: PassportListOption[];
  initialSelected: string[];
  initialHidden: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [hidden, setHidden] = useState<Set<string>>(new Set(initialHidden));
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const selectedSet = new Set(selected);

  function toggleList(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function toggleSection(key: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    // Keep rings in the editor's display order (most-progressed first).
    const lists = options.filter((o) => selectedSet.has(o.id)).map((o) => o.id);
    const { error } = await supabase
      .from("profiles")
      .update({ passport_config: { lists, hidden: [...hidden] } })
      .eq("id", userId);
    setSaving(false);
    if (error) { toastError("Couldn't save. Please try again."); return; }
    router.push(`/u/${username}/passport`);
    router.refresh();
  }

  return (
    <div className="max-w-lg mx-auto pb-28">
      <PageHeader title="Edit Passport" backHref={`/u/${username}/passport`} />

      {/* Section toggles */}
      <div className="px-4 pt-4">
        <MiniLabel className="mb-2">Sections</MiniLabel>
        <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
          {SECTIONS.map((s) => {
            const on = !hidden.has(s.key);
            return (
              <button
                key={s.key}
                onClick={() => toggleSection(s.key)}
                className="w-full flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0 active:opacity-70"
              >
                <span className="text-sm text-text-primary">{s.label}</span>
                <span
                  className="w-10 h-6 rounded-full p-0.5 transition-colors flex"
                  style={{ background: on ? "var(--color-accent)" : "var(--color-bg-input)", justifyContent: on ? "flex-end" : "flex-start" }}
                >
                  <span className="w-5 h-5 rounded-full bg-white" />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ring picker */}
      <div className="px-4 pt-5">
        <MiniLabel className="mb-2">Bucket-list rings ({selected.length})</MiniLabel>
        <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
          {options.map((o) => {
            const on = selectedSet.has(o.id);
            return (
              <button
                key={o.id}
                onClick={() => toggleList(o.id)}
                className="w-full flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 active:opacity-70"
              >
                <SportIcon sport={o.sport} size={20} />
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-sm text-text-primary truncate">{o.name}</div>
                  <div className="text-xs text-text-muted">{o.visited}/{o.total} visited</div>
                </div>
                <span
                  className="w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: on ? "var(--color-accent)" : "var(--color-border)", background: on ? "var(--color-accent)" : "transparent" }}
                >
                  {on && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 mt-6">
        <Button onClick={save} disabled={saving} size="lg" fullWidth>
          {saving ? "SAVING…" : "SAVE PASSPORT"}
        </Button>
      </div>
    </div>
  );
}
