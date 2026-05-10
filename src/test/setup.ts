import { vi, beforeEach, afterEach } from 'vitest';

// =============================================================================
// Environment Variables for Testing
// =============================================================================

(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// Encryption keys for encryption tests
process.env.ENCRYPTION_KEYS = JSON.stringify([
  { id: 'test-key-1', masterKey: 'a'.repeat(64) },
]);
process.env.ENCRYPTION_DEFAULT_KEY_ID = 'test-key-1';

// =============================================================================
// Global Fetch Mock
// =============================================================================

const originalFetch = globalThis.fetch;

const mockFetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
  const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
  console.warn(`[Test] Unmocked fetch call to: ${urlStr}`);
  return new Response(JSON.stringify({ error: 'unmocked' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

globalThis.fetch = mockFetch as unknown as typeof fetch;

// =============================================================================
// Cleanup Between Tests
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// =============================================================================
// Restore on teardown
// =============================================================================

afterAll(() => {
  globalThis.fetch = originalFetch;
});

// =============================================================================
// Export for direct use
// =============================================================================

export { mockFetch };
