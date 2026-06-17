"use client";

import { useEffect, useState } from "react";
import { enablePush, markPushOffered } from "@/lib/native/push";

/**
 * Contextual push opt-in. Shows once after a meaningful action (first follow)
 * via the "boxd:offer-push" event — a soft pre-prompt so a "Not now" doesn't
 * burn the one-time OS prompt. Mounted in the authed app shell.
 */
export default function PushOptIn() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onOffer = () => setOpen(true);
    window.addEventListener("boxd:offer-push", onOffer);
    return () => window.removeEventListener("boxd:offer-push", onOffer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        markPushOffered();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  function dismiss() {
    markPushOffered();
    setOpen(false);
  }

  async function enable() {
    setBusy(true);
    markPushOffered();
    await enablePush();
    setBusy(false);
    setOpen(false);
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Turn on notifications"
      onClick={dismiss}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-md bg-bg-card border border-border rounded-t-2xl sm:rounded-2xl p-6"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 rounded-full bg-accent/15 border border-accent/40 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
        </div>
        <h2 className="font-display text-xl text-text-primary text-center tracking-wide mb-2">
          Turn on notifications?
        </h2>
        <p className="text-sm text-text-secondary text-center leading-relaxed mb-5">
          Get a heads-up when someone follows you, likes or comments on your logs,
          or tags you at a game.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={enable}
            disabled={busy}
            className="w-full py-3 rounded-xl text-sm font-medium text-white transition-opacity disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))" }}
          >
            {busy ? "Enabling…" : "Enable notifications"}
          </button>
          <button
            onClick={dismiss}
            disabled={busy}
            className="w-full py-3 rounded-xl text-sm text-text-secondary bg-bg-input border border-border"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
