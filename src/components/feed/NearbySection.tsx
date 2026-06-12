"use client";

/* eslint-disable @next/next/no-img-element -- remote venue/cover photos with graceful onError fallback */
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { METROS, metroFromKey } from "@/lib/metros";
import { fetchNearbyEvents, type NearbyEvent, type NearbyPage } from "@/lib/queries/nearby";
import SportIcon from "@/components/SportIcon";

type Props = {
  userId: string;
  initialCity: string | null;
  initialPage: NearbyPage;
};

function dateChip(eventDate: string): { label: string; live: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(eventDate + "T00:00:00");
  const diff = Math.round((d.getTime() - today.getTime()) / 86400_000);
  if (diff === 0) return { label: "Today", live: true };
  if (diff === -1) return { label: "Yesterday", live: false };
  if (diff === 1) return { label: "Tomorrow", live: false };
  return {
    label: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    live: false,
  };
}

function miles(m: number): string {
  return `${Math.round(m / 1609.34)} mi`;
}

function NearbyCard({ ev }: { ev: NearbyEvent }) {
  const [imgFailed, setImgFailed] = useState(false);
  const photo = ev.cover_photo_url || ev.venue_photo;
  const chip = dateChip(ev.event_date);
  const isMatch = ev.home_team && ev.away_team;
  const isPast = new Date(ev.event_date + "T23:59:59") < new Date();

  return (
    <Link
      href={`/event/${ev.event_id}`}
      className="block w-[150px] shrink-0 rounded-xl border border-border bg-bg-card overflow-hidden"
    >
      <div className="relative h-[84px] bg-bg-elevated">
        {photo && !imgFailed ? (
          <img
            src={photo}
            alt={ev.venue_name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted">
            <SportIcon sport={ev.sport} size={28} />
          </div>
        )}
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5">
          {chip.live && <span className="w-1.5 h-1.5 rounded-full bg-win" />}
          <span className="text-[10px] font-medium text-white/90">{chip.label}</span>
        </div>
      </div>
      <div className="p-2.5">
        {isMatch ? (
          <div className="flex items-center gap-1.5 mb-1">
            {ev.away_logo && (
              <img src={ev.away_logo} alt="" className="w-4 h-4 object-contain" loading="lazy" />
            )}
            <span className="text-xs text-text-primary font-medium truncate">
              {ev.away_team} @ {ev.home_team}
            </span>
          </div>
        ) : (
          <div className="text-xs text-text-primary font-medium truncate mb-1">
            {ev.tournament_name || ev.venue_name}
          </div>
        )}
        <div className="text-[10px] text-text-muted truncate">
          {ev.venue_name} · {miles(ev.distance_m)}
        </div>
        {isPast && (
          <div className="mt-1.5 font-display text-[10px] tracking-[1px] uppercase text-accent">
            Were you there?
          </div>
        )}
      </div>
    </Link>
  );
}

export default function NearbySection({ userId, initialCity, initialPage }: Props) {
  const [city, setCity] = useState<string | null>(initialCity);
  const [events, setEvents] = useState<NearbyEvent[]>(initialPage.events);
  const [before, setBefore] = useState<string | null>(initialPage.before);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const close = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [pickerOpen]);

  async function selectCity(key: string) {
    setPickerOpen(false);
    setFilter("");
    setCity(key);
    setLoading(true);
    const supabase = createClient();
    const [page] = await Promise.all([
      fetchNearbyEvents(supabase, key),
      supabase.from("profiles").update({ home_city: key }).eq("id", userId),
    ]);
    setEvents(page.events);
    setBefore(page.before);
    setLoading(false);
  }

  async function loadMore() {
    if (!city || !before || loadingMore) return;
    setLoadingMore(true);
    const page = await fetchNearbyEvents(createClient(), city, before);
    setEvents((prev) => {
      const ids = new Set(prev.map((e) => e.event_id));
      const tids = new Set(prev.map((e) => e.tournament_id).filter(Boolean));
      return [
        ...prev,
        ...page.events.filter(
          (e) => !ids.has(e.event_id) && (!e.tournament_id || !tids.has(e.tournament_id))
        ),
      ];
    });
    setBefore(page.before);
    setLoadingMore(false);
  }

  function onCarouselScroll(el: HTMLDivElement) {
    if (el.scrollWidth - el.scrollLeft - el.clientWidth < 400) loadMore();
  }

  const metro = metroFromKey(city);
  const filtered = METROS.filter(
    (m) => !filter.trim() || m.label.toLowerCase().includes(filter.trim().toLowerCase())
  );

  return (
    <div className="mb-6">
      <div className="px-4 flex items-center justify-between mb-2.5 relative">
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          className="flex items-center gap-1.5 bg-transparent border-none p-0 cursor-pointer"
        >
          <span className="font-display text-[13px] text-text-muted tracking-[1.5px] uppercase">
            Around {metro ? metro.label : "You"}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {pickerOpen && (
          <div
            ref={pickerRef}
            className="absolute left-4 top-7 z-40 w-64 max-h-80 overflow-y-auto rounded-xl border border-border bg-bg-elevated shadow-xl"
          >
            <div className="p-2 sticky top-0 bg-bg-elevated">
              <input
                autoFocus
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search cities..."
                className="w-full py-2 px-3 rounded-lg bg-bg-input border border-border text-text-primary text-sm outline-none focus:border-accent"
              />
            </div>
            {filtered.map((m) => (
              <button
                key={m.key}
                onClick={() => selectCity(m.key)}
                className={`w-full text-left px-3 py-2 text-sm bg-transparent border-none cursor-pointer hover:bg-bg-card ${
                  m.key === city ? "text-accent" : "text-text-primary"
                }`}
              >
                {m.label}
                {m.state ? <span className="text-text-muted text-xs"> · {m.state}</span> : null}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-sm text-text-muted">No matches</div>
            )}
          </div>
        )}
      </div>

      {!metro ? (
        <div className="mx-4 rounded-xl border border-border bg-bg-card p-4 flex items-center gap-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-text-primary font-medium">See what&apos;s happening near you</div>
            <div className="text-xs text-text-muted mt-0.5">Pick your city to see games around you.</div>
          </div>
          <button
            onClick={() => setPickerOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-display tracking-wider uppercase border-none cursor-pointer"
          >
            Choose
          </button>
        </div>
      ) : loading ? (
        <div className="px-4 flex gap-3 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-[150px] h-[150px] shrink-0 rounded-xl bg-bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="mx-4 rounded-xl border border-border bg-bg-card px-4 py-5 text-center text-sm text-text-muted">
          No events around {metro.label} right now.
        </div>
      ) : (
        <div
          className="pl-4 pr-4 flex gap-3 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
          onScroll={(e) => onCarouselScroll(e.currentTarget)}
        >
          {events.map((ev) => (
            <NearbyCard key={ev.event_id} ev={ev} />
          ))}
          {loadingMore && (
            <div className="w-[150px] h-[150px] shrink-0 rounded-xl bg-bg-card border border-border animate-pulse" />
          )}
        </div>
      )}
    </div>
  );
}
