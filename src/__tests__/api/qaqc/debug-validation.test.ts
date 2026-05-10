import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

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

import { createRouteHandlers } from '@/lib/api/route-factory';

describe('debug validation', () => {
  it('directly tests createRouteHandlers with a schema', async () => {
    const createSchema = z.object({
      title: z.string().min(1),
      type: z.enum(['CORRECTIVE', 'PREVENTIVE']),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    });

    const { POST } = createRouteHandlers({
      entity: 'test-capa',
      modelName: 'testModel',
      validationSchema: { create: createSchema },
      searchFields: ['title'],
    });

    const body = { title: 'Test', type: 'INVALID', priority: 'HIGH' };
    const req = new Request('http://localhost/api', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-tenant-id': 't' },
      body: JSON.stringify(body),
    });
    const res = await POST(req as any);
    console.log('Direct factory status:', res.status);
    expect(res.status).toBe(400);
  });

  it('tests POST from imported CAPA route module', async () => {
    const mod = await import('@/app/api/v1/qaqc/capa/route');
    const body = { title: 'Test', type: 'INVALID', priority: 'HIGH' };
    const req = new Request('http://localhost/api', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-tenant-id': 't' },
      body: JSON.stringify(body),
    });
    const res = await mod.POST(req as any);
    console.log('Imported route status:', res.status);
    expect(res.status).toBe(400);
  });
});
