import { vi } from 'vitest';

// =============================================================================
// Test Context Helpers
// =============================================================================

export interface TestContext {
  tenantId: string;
  userId: string;
  role: string;
}

/**
 * Create a mock tenant context for testing multi-tenant features.
 */
export function createTestContext(overrides?: Partial<TestContext>): TestContext {
  return {
    tenantId: 'tenant-test-001',
    userId: 'user-test-001',
    role: 'admin',
    ...overrides,
  };
}

// =============================================================================
// Mock Prisma Client
// =============================================================================

type MockPrismaMethod = ReturnType<typeof vi.fn>;

interface MockPrismaModel {
  findMany: MockPrismaMethod;
  findFirst: MockPrismaMethod;
  findUnique: MockPrismaMethod;
  create: MockPrismaMethod;
  update: MockPrismaMethod;
  delete: MockPrismaMethod;
  count: MockPrismaMethod;
}

export interface MockPrismaClient {
  [key: string]: MockPrismaModel | MockPrismaMethod;
  $transaction: MockPrismaMethod;
  $executeRaw: MockPrismaMethod;
  $queryRaw: MockPrismaMethod;
}

/**
 * Create a mock Prisma client with jest.fn() for all common methods.
 * Access models via `mockPrisma.user`, `mockPrisma.employee`, etc.
 */
export function createMockPrisma(): MockPrismaClient {
  const createMockModel = (): MockPrismaModel => ({
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((args: { data: unknown }) =>
      Promise.resolve({ id: 'mock-id', ...((args?.data as Record<string, unknown>) ?? {}) })
    ),
    update: vi.fn().mockImplementation((args: { data: unknown }) =>
      Promise.resolve({ id: 'mock-id', ...((args?.data as Record<string, unknown>) ?? {}) })
    ),
    delete: vi.fn().mockResolvedValue({ id: 'mock-id' }),
    count: vi.fn().mockResolvedValue(0),
  });

  const handler: ProxyHandler<Record<string, unknown>> = {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      // Lazily create mock model for any accessed property
      if (prop.startsWith('$')) return target[prop];
      const model = createMockModel();
      target[prop] = model;
      return model;
    },
  };

  const base: Record<string, unknown> = {
    $transaction: vi.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) => {
      if (typeof fn === 'function') return fn(new Proxy({}, handler));
      return Promise.resolve([]);
    }),
    $executeRaw: vi.fn().mockResolvedValue(0),
    $queryRaw: vi.fn().mockResolvedValue([]),
  };

  return new Proxy(base, handler) as unknown as MockPrismaClient;
}

// =============================================================================
// Mock NextRequest
// =============================================================================

/**
 * Create a mock NextRequest for API route testing.
 * Compatible with Next.js App Router route handlers.
 */
export function createMockRequest(
  method: string,
  body?: Record<string, unknown> | null,
  headers?: Record<string, string>,
): Request {
  const url = 'http://localhost:3000/api/test';
  const defaultHeaders: Record<string, string> = {
    'content-type': 'application/json',
    'x-tenant-id': 'tenant-test-001',
    ...headers,
  };

  const init: RequestInit = {
    method,
    headers: defaultHeaders,
  };

  if (body && method !== 'GET' && method !== 'HEAD') {
    init.body = JSON.stringify(body);
  }

  return new Request(url, init);
}

// =============================================================================
// API Response Assertion Helper
// =============================================================================

/**
 * Helper to assert API responses from route handlers.
 * Parses JSON body and checks status code.
 */
export async function expectApiResponse(
  response: Response,
  status: number,
  check?: (body: Record<string, unknown>) => void,
): Promise<Record<string, unknown>> {
  expect(response.status).toBe(status);

  const body = await response.json();

  if (check) {
    check(body as Record<string, unknown>);
  }

  return body as Record<string, unknown>;
}
