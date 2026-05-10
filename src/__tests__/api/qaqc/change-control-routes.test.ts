import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

const {
  mockFindMany, mockFindFirst, mockCount, mockCreate, mockUpdate, mockDelete,
} = vi.hoisted(() => ({
  mockFindMany: vi.fn(), mockFindFirst: vi.fn(), mockCount: vi.fn(),
  mockCreate: vi.fn(), mockUpdate: vi.fn(), mockDelete: vi.fn(),
}));

vi.mock('@/lib/prisma', () => {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop: string) {
      if (prop === 'then') return undefined;
      return { findMany: mockFindMany, findFirst: mockFindFirst, count: mockCount, create: mockCreate, update: mockUpdate, delete: mockDelete };
    },
  };
  return { default: new Proxy({}, handler) };
});

import { createRouteHandlers, createRouteHandlersWithId } from '@/lib/api/route-factory';

const createSchema = z.object({
  number: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['DOCUMENT', 'PROCESS', 'EQUIPMENT', 'SYSTEM']),
  status: z.enum(['INITIATED', 'UNDER_REVIEW', 'APPROVED', 'IMPLEMENTED', 'CLOSED', 'REJECTED']).default('INITIATED'),
  priority: z.string().optional(),
  requestedBy: z.string().optional(),
  approvedBy: z.string().optional(),
  impactAssessment: z.string().optional(),
  implementationPlan: z.string().optional(),
  effectiveDate: z.string().optional(),
});

const updateSchema = z.object({
  number: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(['DOCUMENT', 'PROCESS', 'EQUIPMENT', 'SYSTEM']).optional(),
  status: z.enum(['INITIATED', 'UNDER_REVIEW', 'APPROVED', 'IMPLEMENTED', 'CLOSED', 'REJECTED']).optional(),
  priority: z.string().optional(),
  requestedBy: z.string().optional(),
  approvedBy: z.string().optional(),
  impactAssessment: z.string().optional(),
  implementationPlan: z.string().optional(),
  effectiveDate: z.string().optional(),
}).partial();

const { GET, POST } = createRouteHandlers({
  entity: 'change-control', modelName: 'changeControl',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['number', 'title', 'description', 'requestedBy'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
});

const { GET: GET_BY_ID, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'change-control', modelName: 'changeControl',
  validationSchema: { update: updateSchema },
  searchFields: ['number', 'title', 'description'],
});

function makeRequest(url: string, method = 'GET', body?: Record<string, unknown>, headers?: Record<string, string>): Request {
  const init: RequestInit = { method, headers: { 'content-type': 'application/json', 'x-tenant-id': 'test-tenant', ...headers } };
  if (body && method !== 'GET') init.body = JSON.stringify(body);
  return new Request(url, init);
}
function makeParams(id: string) { return { params: Promise.resolve({ id }) }; }

const validChange = { number: 'CC-2026-001', title: 'Process Temperature Update', type: 'PROCESS' as const };

describe('QAQC Change Control API Routes', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  describe('GET /api/v1/qaqc/change-control', () => {
    it('returns paginated list', async () => {
      mockFindMany.mockResolvedValue([{ id: 'cc-1' }]); mockCount.mockResolvedValue(1);
      const res = await GET(makeRequest('http://localhost:3000/api/v1/qaqc/change-control') as any);
      expect(res.status).toBe(200);
      expect((await res.json()).data).toHaveLength(1);
    });

    it('searches across configured fields', async () => {
      mockFindMany.mockResolvedValue([]); mockCount.mockResolvedValue(0);
      await GET(makeRequest('http://localhost:3000/api/v1/qaqc/change-control?search=temperature') as any);
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { number: { contains: 'temperature', mode: 'insensitive' } },
            { title: { contains: 'temperature', mode: 'insensitive' } },
            { description: { contains: 'temperature', mode: 'insensitive' } },
            { requestedBy: { contains: 'temperature', mode: 'insensitive' } },
          ],
        }),
      }));
    });

    it('filters by type', async () => {
      mockFindMany.mockResolvedValue([]); mockCount.mockResolvedValue(0);
      await GET(makeRequest('http://localhost:3000/api/v1/qaqc/change-control?filter[type]=EQUIPMENT') as any);
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ type: 'EQUIPMENT' }) }));
    });

    it('paginates large result sets', async () => {
      mockFindMany.mockResolvedValue([]); mockCount.mockResolvedValue(250);
      const res = await GET(makeRequest('http://localhost:3000/api/v1/qaqc/change-control?page=2&pageSize=50') as any);
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 50, take: 50 }));
      expect((await res.json()).totalPages).toBe(5);
    });

    it('clamps page to minimum 1', async () => {
      mockFindMany.mockResolvedValue([]); mockCount.mockResolvedValue(0);
      await GET(makeRequest('http://localhost:3000/api/v1/qaqc/change-control?page=0') as any);
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0 }));
    });
  });

  describe('GET /api/v1/qaqc/change-control/:id', () => {
    it('returns a single record', async () => {
      mockFindFirst.mockResolvedValue({ id: 'cc-1', number: 'CC-001', type: 'PROCESS' });
      const res = await GET_BY_ID(makeRequest('http://localhost:3000/api/v1/qaqc/change-control/cc-1') as any, makeParams('cc-1'));
      expect(res.status).toBe(200);
      expect((await res.json()).type).toBe('PROCESS');
    });

    it('returns 404 for non-existent', async () => {
      mockFindFirst.mockResolvedValue(null);
      const res = await GET_BY_ID(makeRequest('http://localhost:3000/api/v1/qaqc/change-control/m') as any, makeParams('m'));
      expect(res.status).toBe(404);
    });

    it('uses tenant ID from headers', async () => {
      mockFindFirst.mockResolvedValue({ id: 'cc-1' });
      await GET_BY_ID(makeRequest('http://localhost:3000/api/v1/qaqc/change-control/cc-1', 'GET', undefined, { 'x-tenant-id': 'pharma-co' }) as any, makeParams('cc-1'));
      expect(mockFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'cc-1', tenantId: 'pharma-co' } }));
    });

    it('returns 500 on unexpected error', async () => {
      mockFindFirst.mockRejectedValue(new Error('Connection reset'));
      const res = await GET_BY_ID(makeRequest('http://localhost:3000/api/v1/qaqc/change-control/cc-1') as any, makeParams('cc-1'));
      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/v1/qaqc/change-control', () => {
    it('creates with valid data', async () => {
      mockCreate.mockResolvedValue({ id: 'cc-new', ...validChange });
      const res = await POST(makeRequest('http://localhost:3000/api/v1/qaqc/change-control', 'POST', validChange) as any);
      expect(res.status).toBe(201);
    });

    it('rejects missing required number', async () => {
      const res = await POST(makeRequest('http://localhost:3000/api/v1/qaqc/change-control', 'POST', { title: 'Change', type: 'PROCESS' }) as any);
      expect(res.status).toBe(400);
    });

    it('rejects missing required title', async () => {
      const res = await POST(makeRequest('http://localhost:3000/api/v1/qaqc/change-control', 'POST', { number: 'CC-001', type: 'PROCESS' }) as any);
      expect(res.status).toBe(400);
    });

    it('rejects invalid type enum', async () => {
      const res = await POST(makeRequest('http://localhost:3000/api/v1/qaqc/change-control', 'POST', { number: 'CC-001', title: 'Change', type: 'SOFTWARE' }) as any);
      expect(res.status).toBe(400);
    });

    it('defaults status to INITIATED', async () => {
      mockCreate.mockResolvedValue({ id: 'cc-new' });
      await POST(makeRequest('http://localhost:3000/api/v1/qaqc/change-control', 'POST', validChange) as any);
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: 'INITIATED' }),
      }));
    });

    it('sets tenant ID on created record', async () => {
      mockCreate.mockResolvedValue({ id: 'cc-new' });
      await POST(makeRequest('http://localhost:3000/api/v1/qaqc/change-control', 'POST', validChange, { 'x-tenant-id': 'biotech-inc' }) as any);
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ tenantId: 'biotech-inc' }),
      }));
    });
  });

  describe('PATCH /api/v1/qaqc/change-control/:id', () => {
    it('updates status', async () => {
      mockFindFirst.mockResolvedValue({ id: 'cc-1' });
      mockUpdate.mockResolvedValue({ id: 'cc-1', status: 'UNDER_REVIEW' });
      const res = await PATCH(makeRequest('http://localhost:3000/api/v1/qaqc/change-control/cc-1', 'PATCH', { status: 'UNDER_REVIEW' }) as any, makeParams('cc-1'));
      expect(res.status).toBe(200);
    });

    it('returns 404 for non-existent', async () => {
      mockFindFirst.mockResolvedValue(null);
      const res = await PATCH(makeRequest('http://localhost:3000/api/v1/qaqc/change-control/m', 'PATCH', { status: 'APPROVED' }) as any, makeParams('m'));
      expect(res.status).toBe(404);
    });

    it('rejects invalid status', async () => {
      mockFindFirst.mockResolvedValue({ id: 'cc-1' });
      const res = await PATCH(makeRequest('http://localhost:3000/api/v1/qaqc/change-control/cc-1', 'PATCH', { status: 'CANCELLED' }) as any, makeParams('cc-1'));
      expect(res.status).toBe(400);
    });

    it('rejects invalid type', async () => {
      mockFindFirst.mockResolvedValue({ id: 'cc-1' });
      const res = await PATCH(makeRequest('http://localhost:3000/api/v1/qaqc/change-control/cc-1', 'PATCH', { type: 'SOFTWARE' }) as any, makeParams('cc-1'));
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/v1/qaqc/change-control/:id', () => {
    it('deletes an existing record', async () => {
      mockFindFirst.mockResolvedValue({ id: 'cc-1' }); mockDelete.mockResolvedValue({ id: 'cc-1' });
      const res = await DELETE(makeRequest('http://localhost:3000/api/v1/qaqc/change-control/cc-1', 'DELETE') as any, makeParams('cc-1'));
      expect(res.status).toBe(200);
      expect((await res.json()).success).toBe(true);
    });

    it('returns 404 when not found', async () => {
      mockFindFirst.mockResolvedValue(null);
      const res = await DELETE(makeRequest('http://localhost:3000/api/v1/qaqc/change-control/m', 'DELETE') as any, makeParams('m'));
      expect(res.status).toBe(404);
    });

    it('returns 500 on database error', async () => {
      mockFindFirst.mockResolvedValue({ id: 'cc-1' }); mockDelete.mockRejectedValue(new Error('Cascade'));
      const res = await DELETE(makeRequest('http://localhost:3000/api/v1/qaqc/change-control/cc-1', 'DELETE') as any, makeParams('cc-1'));
      expect(res.status).toBe(500);
    });

    it('checks tenant ownership', async () => {
      mockFindFirst.mockResolvedValue({ id: 'cc-1' }); mockDelete.mockResolvedValue({ id: 'cc-1' });
      await DELETE(makeRequest('http://localhost:3000/api/v1/qaqc/change-control/cc-1', 'DELETE', undefined, { 'x-tenant-id': 'biotech-inc' }) as any, makeParams('cc-1'));
      expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 'cc-1', tenantId: 'biotech-inc' } });
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'cc-1' } });
    });
  });
});
