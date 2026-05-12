// Next.js instrumentation hook.
// Runs once at server startup; registers OpenTelemetry + Sentry per runtime.
//
// Cross-references:
//   ADR-0009 §Layer 5 — observability stack initialization
//   ADR-0017 §Instrumentation — OTel SDK + per-tenant span tagging
import { registerOTel } from "@vercel/otel";

export async function register() {
  // OpenTelemetry: tracing + metrics. Exports to whatever OTel collector is
  // configured via OTEL_EXPORTER_OTLP_ENDPOINT env (Sentry, Honeycomb, Tempo, etc.).
  registerOTel({
    serviceName: process.env.OTEL_SERVICE_NAME ?? "erp",
  });

  // Sentry: per-runtime init. The right config is selected by NEXT_RUNTIME.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
