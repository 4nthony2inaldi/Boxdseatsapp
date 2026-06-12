"use client";

import { AlertTriangleIcon } from "@/components/icons";

export default function PublicError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-3 text-loss"><AlertTriangleIcon size={40} /></div>
      <h2 className="font-display text-xl text-text-primary tracking-wide mb-2">Something Went Wrong</h2>
      <p className="text-sm text-text-muted mb-6">This page couldn&apos;t load. Please try again.</p>
      <button onClick={reset} className="px-5 py-2.5 rounded-xl text-sm font-medium text-white active:opacity-80" style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))" }}>
        Try Again
      </button>
    </div>
  );
}
