"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangleIcon } from "@/components/icons";
import Button from "@/components/Button";

export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-3 text-loss"><AlertTriangleIcon size={40} /></div>
      <h2 className="font-display text-xl text-text-primary tracking-wide mb-2">Something Went Wrong</h2>
      <p className="text-sm text-text-muted mb-6">This page couldn&apos;t load. Please try again.</p>
      <Button onClick={reset} size="md">Try Again</Button>
    </div>
  );
}
