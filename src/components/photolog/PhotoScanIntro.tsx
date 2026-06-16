"use client";

import { useState } from "react";

type Props = {
  onScan: () => void;
  onCancel: () => void;
  /** True when there's no native photo access (web) — show the gentle note. */
  webFallback?: boolean;
  scanning?: boolean;
};

function Bullet({ icon, bold, rest }: { icon: string; bold: string; rest: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-lg leading-6">{icon}</span>
      <p className="text-sm text-text-secondary leading-6">
        <span className="text-text-primary font-medium">{bold}</span> — {rest}
      </p>
    </div>
  );
}

export default function PhotoScanIntro({ onScan, onCancel, webFallback, scanning }: Props) {
  const [howOpen, setHowOpen] = useState(false);

  return (
    <div className="max-w-lg mx-auto px-5 pt-8 pb-10">
      <div className="text-5xl mb-4">🎟️</div>
      <h1 className="font-display text-[26px] text-text-primary tracking-wide leading-tight">
        Find the games hiding in your camera roll
      </h1>
      <p className="text-sm text-text-secondary leading-6 mt-2">
        Your photos quietly remember <em>when</em> and <em>where</em> they were taken. BoxdSeats reads
        just that — the date and location — to spot games you&apos;ve been to, so you don&apos;t have to dig
        to remember them.
      </p>

      <div className="mt-6 space-y-3 rounded-2xl border border-border bg-bg-card p-4">
        <Bullet icon="📍" bold="Only the date + location" rest="we never open or analyze the actual pictures" />
        <Bullet icon="🔒" bold="Your photos stay on your phone" rest="nothing is uploaded or stored" />
        <Bullet icon="🎟️" bold="You're in control" rest="a photo is only saved if you choose to add it to a game" />
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
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: howOpen ? "rotate(180deg)" : "none" }}>
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

      <div className="mt-8 space-y-2">
        <button
          onClick={onScan}
          disabled={scanning}
          className="w-full py-3.5 rounded-xl font-display text-base tracking-widest text-white disabled:opacity-50 transition-opacity"
          style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))" }}
        >
          {scanning ? "Looking…" : "Find my games"}
        </button>
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
