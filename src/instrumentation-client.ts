import * as Sentry from "@sentry/nextjs";

// Client-side Sentry. No-op unless NEXT_PUBLIC_SENTRY_DSN is set.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
    // AbortError is benign: the browser throws it when an in-flight request is
    // deliberately cancelled (navigating away mid-prefetch, a component
    // unmounting during a fetch). "signal is aborted without reason" is its
    // default message when abort() is called with no reason. It's a cancelled
    // operation, never a real fault — and never a timeout, which throws
    // TimeoutError — so drop it instead of paging on it.
    ignoreErrors: ["AbortError", "signal is aborted without reason"],
  });
}

// Lets Sentry tie errors to client-side navigations.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
