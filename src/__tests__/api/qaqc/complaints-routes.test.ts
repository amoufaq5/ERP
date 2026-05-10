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
  source: z.enum(['CUSTOMER', 'INTERNAL', 'REGULATORY']),
  status: z.enum(['RECEIVED', 'UNDER_INVESTIGATION', 'ROOT_CAUSE_IDENTIFIED', 'CAPA_INITIATED', 'CLOSED']).default('RECEIVED'),
  priority: z.string().optional(),
  product: z.string().optional(),
  batchNumber: z.string().optional(),
  description: z.string().optional(),
  investigation: z.string().optional(),
  rootCause: z.string().optional(),
  capaId: z.string().optional(),
  reportedBy: z.string().optional(),
  reportedDate: z.string().optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  source: z.enum(['CUSTOMER', 'INTERNAL', 'REGULATORY']).optional(),
  status: z.enum(['RECEIVED', 'UNDER_INVESTIGATION', 'ROOT_CAUSE_IDENTIFIED', 'CAPA_INITIATED', 'CLOSED']).optional(),
  priority: z.string().optional(),
  product: z.string().optional(),
  batchNumber: z.string().optional(),
  description: z.string().optional(),
  investigation: z.string().optional(),
  rootCause: z.string().optional(),
  capaId: z.string().optional(),
  reportedBy: z.string().optional(),
  reportedDate: z.string().optional(),
  closedDate: z.string().optional(),
}).partial();

const { GET, POST } = createRouteHandlers({
  entity: 'complaints', modelName: 'qComplaint',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['title', 'number', 'description', 'product', 'batchNumber'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
});

const { GET: GET_BY_ID, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'complaints', modelName: 'qComplaint',
  validationSchema: { update: updateSchema },
  searchFields: ['title', 'number', 'description', 'product'],
});

function makeRequest(url: string, method = 'GET', body?: Record<string, unknown>, headers?: Record<string, string>): Request {
  const init: RequestInit = { method, headers: { 'content-type': 'application/json', 'x-tenant-id': 'test-tenant', ...headers } };
  if (body && method !== 'GET') init.body = JSON.stringify(body);
  return new Request(url, init);
}
function makeParams(id: string) { return { params: Promise.resolve({ id }) }; }

const validComplaint = { number: 'CMP-2026-001', title: 'Product Discoloration', source: 'CUSTOMER' as const };

describe('QAQC Complaints API Routes', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  describe('GET /api/v1/qaqc/complaints', () => {
    it('returns paginated list', async () => {
      mockFindMany.mockResolvedValue([{ id: 'c-1' }, { id: 'c-2' }]); mockCount.mockResolvedValue(2);
      const res = await GET(makeRequest('http://localhost:3000/api/v1/qaqc/complaints') as any);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(2);
    });

    it('searches across title, number, description, product, batchNumber', async () => {
      mockFindMany.mockResolvedValue([]); mockCount.mockResolvedValue(0);
      await GET(makeRequest('http://localhost:3000/api/v1/qaqc/complaints?search=antibiotic') as any);
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { title: { contains: 'antibiotic', mode: 'insensitive' } },
            { number: { contains: 'antibiotic', mode: 'insensitive' } },
            { description: { contains: 'antibiotic', mode: 'insensitive' } },
            { product: { contains: 'antibiotic', mode: 'insensitive' } },
            { batchNumber: { contains: 'antibiotic', mode: 'insensitive' } },
          ],
        }),
      }));
    });

    it('filters by source type', async () => {
      mockFindMany.mockResolvedValue([]); mockCount.mockResolvedValue(0);
      await GET(makeRequest('http://localhost:3000/api/v1/qaqc/complaints?filter[source]=REGULATORY') as any);
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ source: 'REGULATORY' }) }));
    });

    it('returns 500 on error', async () => {
      mockFindMany.mockRejectedValue(new Error('timeout')); mockCount.mockRejectedValue(new Error('timeout'));
      const res = await GET(makeRequest('http://localhost:3000/api/v1/qaqc/complaints') as any);
      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/v1/qaqc/complaints/:id', () => {
    it('returns a single complaint', async () => {
      mockFindFirst.mockResolvedValue({ id: 'c-1', number: 'CMP-001' });
      const res = await GET_BY_ID(makeRequest('http://localhost:3000/api/v1/qaqc/complaints/c-1') as any, makeParams('c-1'));
      expect(res.status).toBe(200);
    });

    it('returns 404 for non-existent', async () => {
      mockFindFirst.mockResolvedValue(null);
      const res = await GET_BY_ID(makeRequest('http://localhost:3000/api/v1/qaqc/complaints/m') as any, makeParams('m'));
      expect(res.status).toBe(404);
    });

    it('enforces tenant isolation', async () => {
      mockFindFirst.mockResolvedValue(null);
      await GET_BY_ID(makeRequest('http://localhost:3000/api/v1/qaqc/complaints/c-1', 'GET', undefined, { 'x-tenant-id': 'other' }) as any, makeParams('c-1'));
      expect(mockFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'c-1', tenantId: 'other' } }));
    });
  });

  describe('POST /api/v1/qaqc/complaints', () => {
    it('creates a complaint with valid data', async () => {
      mockCreate.mockResolvedValue({ id: 'c-new', ...validComplaint });
      const res = await POST(makeRequest('http://localhost:3000/api/v1/qaqc/complaints', 'POST', validComplaint) as any);
      expect(res.status).toBe(201);
    });

    it('rejects missing required number', async () => {
      const res = await POST(makeRequest('http://localhost:3000/api/v1/qaqc/complaints', 'POST', { title: 'Complaint', source: 'CUSTOMER' }) as any);
      expect(res.status).toBe(400);
    });

    it('rejects missing required title', async () => {
      const res = await POST(makeRequest('http://localhost:3000/api/v1/qaqc/complaints', 'POST', { number: 'CMP-001', source: 'CUSTOMER' }) as any);
      expect(res.status).toBe(400);
    });

    it('rejects invalid source enum', async () => {
      const res = await POST(makeRequest('http://localhost:3000/api/v1/qaqc/complaints', 'POST', { number: 'CMP-001', title: 'C', source: 'PARTNER' }) as any);
      expect(res.status).toBe(400);
    });

    it('rejects empty body', async () => {
      const res = await POST(makeRequest('http://localhost:3000/api/v1/qaqc/complaints', 'POST', {}) as any);
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/qaqc/complaints/:id', () => {
    it('updates complaint status', async () => {
      mockFindFirst.mockResolvedValue({ id: 'c-1' });
      mockUpdate.mockResolvedValue({ id: 'c-1', status: 'UNDER_INVESTIGATION' });
      const res = await PATCH(makeRequest('http://localhost:3000/api/v1/qaqc/complaints/c-1', 'PATCH', { status: 'UNDER_INVESTIGATION' }) as any, makeParams('c-1'));
      expect(res.status).toBe(200);
    });

    it('returns 404 for non-existent', async () => {
      mockFindFirst.mockResolvedValue(null);
      const res = await PATCH(makeRequest('http://localhost:3000/api/v1/qaqc/complaints/m', 'PATCH', { status: 'CLOSED' }) as any, makeParams('m'));
      expect(res.status).toBe(404);
    });

    it('rejects invalid status', async () => {
      mockFindFirst.mockResolvedValue({ id: 'c-1' });
      const res = await PATCH(makeRequest('http://localhost:3000/api/v1/qaqc/complaints/c-1', 'PATCH', { status: 'REJECTED' }) as any, makeParams('c-1'));
      expect(res.status).toBe(400);
    });

    it('allows setting rootCause and capaId', async () => {
      mockFindFirst.mockResolvedValue({ id: 'c-1' });
      mockUpdate.mockResolvedValue({ id: 'c-1', rootCause: 'Dye contamination', capaId: 'capa-456' });
      const res = await PATCH(makeRequest('http://localhost:3000/api/v1/qaqc/complaints/c-1', 'PATCH', { rootCause: 'Dye contamination', capaId: 'capa-456' }) as any, makeParams('c-1'));
      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ rootCause: 'Dye contamination', capaId: 'capa-456' }),
      }));
    });
  });

  describe('DELETE /api/v1/qaqc/complaints/:id', () => {
    it('deletes an existing complaint', async () => {
      mockFindFirst.mockResolvedValue({ id: 'c-1' }); mockDelete.mockResolvedValue({ id: 'c-1' });
      const res = await DELETE(makeRequest('http://localhost:3000/api/v1/qaqc/complaints/c-1', 'DELETE') as any, makeParams('c-1'));
      expect(res.status).toBe(200);
      expect((await res.json()).success).toBe(true);
    });

    it('returns 404 when not found', async () => {
      mockFindFirst.mockResolvedValue(null);
      const res = await DELETE(makeRequest('http://localhost:3000/api/v1/qaqc/complaints/m', 'DELETE') as any, makeParams('m'));
      expect(res.status).toBe(404);
    });

    it('returns 500 on deletion failure', async () => {
      mockFindFirst.mockResolvedValue({ id: 'c-1' }); mockDelete.mockRejectedValue(new Error('FK'));
      const res = await DELETE(makeRequest('http://localhost:3000/api/v1/qaqc/complaints/c-1', 'DELETE') as any, makeParams('c-1'));
      expect(res.status).toBe(500);
    });
  });
});
