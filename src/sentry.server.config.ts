import * as Sentry from "@sentry/nextjs";

// Server-side Sentry. No-op unless SENTRY_DSN is set (so it stays dormant until
// the DSN env var is added in Vercel). Tracing is off — we only want errors.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0,
    environment: process.env.VERCEL_ENV ?? "development",
  });
}
