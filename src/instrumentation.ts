// Next.js instrumentation hook. Loads the runtime-appropriate Sentry config and
// forwards nested-RSC request errors to Sentry. Sentry stays dormant unless the
// DSN env vars are set (see sentry.*.config.ts / instrumentation-client.ts).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  } else if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export { captureRequestError as onRequestError } from "@sentry/nextjs";
