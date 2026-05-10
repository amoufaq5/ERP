import { describe, it, expect, vi } from 'vitest';

const {
  mockFindMany, mockFindFirst, mockCount, mockCreate, mockUpdate, mockDelete,
} = vi.hoisted(() => ({
  mockFindMany: vi.fn(), mockFindFirst: vi.fn(), mockCount: vi.fn(),
  mockCreate: vi.fn(), mockUpdate: vi.fn(), mockDelete: vi.fn(),
}));

vi.mock('@/lib/prisma', () => {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_t: any, prop: string) {
      if (prop === 'then') return undefined;
      return { findMany: mockFindMany, findFirst: mockFindFirst, count: mockCount, create: mockCreate, update: mockUpdate, delete: mockDelete };
    },
  };
  return { default: new Proxy({}, handler) };
});

import { POST } from '@/app/api/v1/qaqc/capa/route';

describe('debug validation', () => {
  it('rejects invalid type with 400', async () => {
    const body = { title: 'Test', type: 'INVALID', priority: 'HIGH' };
    const req = new Request('http://localhost/api', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-tenant-id': 't' },
      body: JSON.stringify(body),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});
