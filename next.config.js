/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

// Wrap with Sentry only when SENTRY_AUTH_TOKEN is present (CI / production).
// In local dev without a token, exports the bare config so `next dev` works.
//
// ADR cross-references:
//   ADR-0009 §Layer 5 — Sentry release tracking + source map upload in CI
//   ADR-0017 §Implementation notes — source maps uploaded on every deploy
let exported = nextConfig
if (process.env.SENTRY_AUTH_TOKEN) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { withSentryConfig } = require('@sentry/nextjs')
  exported = withSentryConfig(nextConfig, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    silent: !process.env.CI,
    widenClientFileUpload: true,
    transpileClientSDK: false,
    tunnelRoute: '/monitoring',
    hideSourceMaps: true,
    disableLogger: true,
  })
}

module.exports = exported
