import * as Sentry from "@sentry/nextjs";

// Edge-runtime Sentry (middleware, edge routes). No-op unless SENTRY_DSN is set.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0,
    environment: process.env.VERCEL_ENV ?? "development",
  });
}
