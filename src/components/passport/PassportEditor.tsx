"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import MiniLabel from "@/components/MiniLabel";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SportIcon from "@/components/SportIcon";
import Button from "@/components/Button";
import PageHeader from "@/components/PageHeader";
import { toastError } from "@/components/Toaster";
import type { PassportListOption, RootingEntry } from "@/lib/queries/passport";

const SECTIONS = [
  { key: "map", label: "Map" },
  { key: "rings", label: "Bucket list" },
  { key: "topVenues", label: "Top venues" },
  { key: "sports", label: "By sport" },
  { key: "players", label: "Players you've seen" },
  { key: "leaderboards", label: "Stat leaders" },
];

export default function PassportEditor({
  userId,
  username,
  options,
  initialSelected,
  initialHidden,
  initialRooting,
}: {
  userId: string;
  username: string;
  options: PassportListOption[];
  initialSelected: string[];
  initialHidden: string[];
  initialRooting: RootingEntry[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [hidden, setHidden] = useState<Set<string>>(new Set(initialHidden));
  const [rooting, setRooting] = useState<RootingEntry[]>(initialRooting);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  // ── Drag-to-reorder the Rooting For row (pointer based, touch + mouse) ──
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rootingRef = useRef(rooting);
  const dragIndexRef = useRef(dragIndex);
  useEffect(() => { rootingRef.current = rooting; }, [rooting]);
  useEffect(() => { dragIndexRef.current = dragIndex; }, [dragIndex]);
  useEffect(() => {
    if (dragIndex === null) return;
    function onMove(e: PointerEvent) {
      const from = dragIndexRef.current;
      if (from === null) return;
      const y = e.clientY;
      const list = rootingRef.current;
      let target = from;
      for (let i = 0; i < list.length; i++) {
        const el = rowRefs.current[i];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (y < r.top + r.height / 2) { target = i; break; }
        target = i;
      }
      if (target !== from) {
        setRooting((prev) => {
          const next = [...prev];
          const [moved] = next.splice(from, 1);
          next.splice(target, 0, moved);
          return next;
        });
        setDragIndex(target);
      }
    }
    function onUp() { setDragIndex(null); }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragIndex]);

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
    const rootingOrder = rooting.map((r) => r.key);
    const { error } = await supabase
      .from("profiles")
      .update({ passport_config: { lists, hidden: [...hidden], rootingOrder } })
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

      {/* Rooting For order — drag to rank teams + field-sport players together */}
      {rooting.length > 1 && (
        <div className="px-4 pt-5">
          <MiniLabel className="mb-2">Rooting For order</MiniLabel>
          <p className="text-xs text-text-muted mb-2">Drag to rank. Your #1 leads the row — a favorite golfer or driver can sit above any team.</p>
          <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
            {rooting.map((r, i) => {
              const dragging = dragIndex === i;
              return (
                <div
                  key={r.key}
                  ref={(el) => { rowRefs.current[i] = el; }}
                  className={`flex items-center gap-2.5 px-3 py-2.5 border-b border-border last:border-b-0 ${dragging ? "bg-bg-elevated opacity-90" : ""}`}
                >
                  <button
                    aria-label="Drag to reorder"
                    onPointerDown={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); setDragIndex(i); }}
                    className="touch-none cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary p-1 -ml-1"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
                      <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
                      <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
                    </svg>
                  </button>
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-bg-elevated flex items-center justify-center text-xs font-semibold text-text-secondary">{i + 1}</div>
                  <div className="relative w-9 h-9 rounded-full bg-bg-elevated flex items-center justify-center overflow-hidden flex-shrink-0">
                    {r.imageUrl ? (
                      <Image
                        src={r.imageUrl}
                        alt={r.name}
                        width={r.kind === "athlete" ? 36 : 28}
                        height={r.kind === "athlete" ? 36 : 28}
                        className={r.kind === "athlete" ? "w-full h-full object-cover" : "object-contain"}
                      />
                    ) : (
                      <span className="text-text-secondary text-[10px] font-semibold">{r.name.slice(0, 3).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="flex-1 min-w-0 text-sm text-text-primary truncate">{r.name}</span>
                  {r.sport && <SportIcon sport={r.sport} size={16} className="flex-shrink-0 opacity-80" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
