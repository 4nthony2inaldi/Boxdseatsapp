"use client";

import { useState, useCallback } from "react";

type ShareButtonProps = {
  url: string;
  title: string;
  text: string;
  variant?: "default" | "compact";
};

export default function ShareButton({
  url,
  title,
  text,
  variant = "default",
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    // Try native Web Share API first
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        // User cancelled or share failed — fall through to clipboard
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Final fallback: prompt
      prompt("Copy this link:", url);
    }
  }, [url, title, text]);

  if (variant === "compact") {
    return (
      <button
        onClick={handleShare}
        className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-0"
        title="Share"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke={copied ? "#3CB878" : "#5A5F72"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-colors"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        {copied && (
          <span className="text-[11px] text-win animate-fade-in">Copied!</span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-bg-elevated border border-border text-text-secondary hover:text-accent hover:border-accent/30 transition-colors cursor-pointer"
    >
      {copied ? (
        <>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3CB878"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-sm font-display tracking-wider uppercase text-win">
            Link Copied!
          </span>
        </>
      ) : (
        <>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span className="text-sm font-display tracking-wider uppercase">
            Share
          </span>
        </>
      )}
    </button>
  );
}
