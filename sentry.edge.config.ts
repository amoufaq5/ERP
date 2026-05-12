// Sentry — edge runtime (middleware, edge API routes) configuration.
// No-op when SENTRY_DSN is unset.
//
// Cross-references:
//   ADR-0009 §Layer 5 — Sentry as the error tracking backend
//   ADR-0017 §Instrumentation — edge-runtime tracing
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
    environment: process.env.NODE_ENV,
    release: process.env.APP_VERSION,
    enabled: process.env.NODE_ENV !== "test",
  });
}
