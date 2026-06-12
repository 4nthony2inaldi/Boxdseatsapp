"use client";

import { useEffect, useState } from "react";

/**
 * Minimal failure-only toast. Mutations are optimistic everywhere; this is
 * the channel that tells the user a quick action (like, follow, city change)
 * silently failed — the primary use context is flaky stadium connectivity.
 * Successes are never toasted.
 */

type ToastMsg = { id: number; message: string };

let emit: ((message: string) => void) | null = null;
let nextId = 1;

export function toastError(message: string) {
  emit?.(message);
}

export default function Toaster() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  useEffect(() => {
    emit = (message: string) => {
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-2), { id, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };
    return () => {
      emit = null;
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-0 right-0 z-[70] flex flex-col items-center gap-2 px-6 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-2 max-w-sm w-full bg-bg-elevated border border-loss/50 rounded-xl px-4 py-3 shadow-xl"
          role="alert"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-loss)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="text-sm text-text-primary">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
