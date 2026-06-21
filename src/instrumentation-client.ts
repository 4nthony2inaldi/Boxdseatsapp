import * as Sentry from "@sentry/nextjs";

// Client-side Sentry. No-op unless NEXT_PUBLIC_SENTRY_DSN is set.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
  });
}

// Lets Sentry tie errors to client-side navigations.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
