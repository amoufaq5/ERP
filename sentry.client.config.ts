// Sentry — client (browser) configuration.
// No-op when NEXT_PUBLIC_SENTRY_DSN is unset (e.g., local dev without a DSN).
//
// Cross-references:
//   ADR-0009 §Layer 5 (process and governance) — Sentry as the error tracking backend
//   ADR-0017 §Instrumentation — per-tenant tagging discipline
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    environment: process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_APP_VERSION,
    enabled: process.env.NODE_ENV !== "test",
  });
}
