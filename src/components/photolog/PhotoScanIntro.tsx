"use client";

import { useState } from "react";
import Button from "@/components/Button";

type Props = {
  onScan: (monthsBack?: number) => void;
  onCancel: () => void;
  /** True when there's no native photo access (web) — show the gentle note. */
  webFallback?: boolean;
  scanning?: boolean;
};

const RANGES: { label: string; months?: number }[] = [
  { label: "1 mo", months: 1 },
  { label: "3 mo", months: 3 },
  { label: "1 yr", months: 12 },
  { label: "All", months: undefined },
];

const svg = "0 0 24 24";

function TicketIcon({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox={svg} fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
      <path d="M13 5v2" /><path d="M13 11v2" /><path d="M13 17v2" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="20" height="20" viewBox={svg} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox={svg} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox={svg} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="8 12 11 15 16 9" />
    </svg>
  );
}

function Bullet({ icon, bold, rest }: { icon: React.ReactNode; bold: string; rest: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex-shrink-0 mt-0.5">{icon}</span>
      <p className="text-sm text-text-secondary leading-6">
        <span className="text-text-primary font-medium">{bold}</span> — {rest}
      </p>
    </div>
  );
}

export default function PhotoScanIntro({ onScan, onCancel, webFallback, scanning }: Props) {
  const [howOpen, setHowOpen] = useState(false);
  const [rangeIdx, setRangeIdx] = useState(3); // default: all time — the point is to surface your whole history

  return (
    <div className="max-w-lg mx-auto px-5 pt-8 pb-10">
      <div className="mb-4">
        <TicketIcon />
      </div>
      <h1 className="font-display text-[26px] text-text-primary tracking-wide leading-tight">
        Find the games hiding in your camera roll
      </h1>
      <p className="text-sm text-text-secondary leading-6 mt-2">
        Your photos quietly remember <em>when</em> and <em>where</em> they were taken. BoxdSeats reads
        just that — the date and location — to spot games you&apos;ve been to, so you don&apos;t have to dig
        to remember them.
      </p>

      <div className="mt-6 space-y-3 rounded-2xl border border-border bg-bg-card p-4">
        <Bullet icon={<PinIcon />} bold="Only the date + location" rest="we never open or analyze the actual pictures" />
        <Bullet icon={<LockIcon />} bold="Your photos stay on your phone" rest="nothing is uploaded or stored" />
        <Bullet icon={<CheckIcon />} bold="You're in control" rest="a photo is only saved if you choose to add it to a game" />
      </div>

      <p className="text-xs text-text-muted leading-5 mt-4">
        Next, iOS will ask to allow photo access. It needs that to look across your whole library — but
        BoxdSeats only ever reads the date and location, never the images.
      </p>

      <button
        onClick={() => setHowOpen((v) => !v)}
        className="mt-3 text-xs text-accent hover:opacity-80 flex items-center gap-1"
      >
        How it works
        <svg width="13" height="13" viewBox={svg} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: howOpen ? "rotate(180deg)" : "none" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {howOpen && (
        <p className="text-xs text-text-muted leading-5 mt-2 rounded-xl bg-bg-card border border-border p-3">
          The matching happens right on your phone. Only a game&apos;s venue and date are ever sent to look
          it up — your photos and their exact locations never leave your device.
        </p>
      )}

      {webFallback && (
        <p className="text-xs text-accent leading-5 mt-4">
          Photo scanning runs in the BoxdSeats iPhone app — it&apos;s coming there soon.
        </p>
      )}

      <div className="mt-6">
        <p className="text-xs text-text-muted tracking-wide uppercase font-display mb-2">How far back?</p>
        <div className="grid grid-cols-4 gap-2">
          {RANGES.map((r, i) => {
            const active = i === rangeIdx;
            return (
              <button
                key={r.label}
                onClick={() => setRangeIdx(i)}
                aria-pressed={active}
                className="py-2 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: active ? "rgba(212,135,44,0.15)" : "var(--color-bg-input)",
                  border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
                  color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-text-muted leading-5 mt-2">
          Scans your whole library by default so it catches games from years back. Pick a shorter
          range for a faster scan.
        </p>
      </div>

      <div className="mt-6 space-y-2">
        <Button
          onClick={() => onScan(RANGES[rangeIdx].months)}
          disabled={scanning}
          size="lg"
          fullWidth
        >
          {scanning ? "Looking…" : "Find my games"}
        </Button>
        <button
          onClick={onCancel}
          className="w-full py-3 rounded-xl text-sm text-text-secondary hover:bg-bg-card transition-colors"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
