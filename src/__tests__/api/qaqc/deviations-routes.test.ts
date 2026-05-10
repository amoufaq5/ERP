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

// Schemas (mirrors src/app/api/v1/qaqc/deviations/route.ts)
const createSchema = z.object({
  number: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(['PLANNED', 'UNPLANNED']),
  status: z.enum(['OPEN', 'UNDER_INVESTIGATION', 'CAPA_REQUIRED', 'CLOSED']).default('OPEN'),
  severity: z.enum(['CRITICAL', 'MAJOR', 'MINOR']),
  department: z.string().optional(),
  description: z.string().optional(),
  rootCause: z.string().optional(),
  impactAssessment: z.string().optional(),
  immediateAction: z.string().optional(),
  capaId: z.string().optional(),
  reportedBy: z.string().optional(),
  reportedDate: z.string().optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(['PLANNED', 'UNPLANNED']).optional(),
  status: z.enum(['OPEN', 'UNDER_INVESTIGATION', 'CAPA_REQUIRED', 'CLOSED']).optional(),
  severity: z.enum(['CRITICAL', 'MAJOR', 'MINOR']).optional(),
  department: z.string().optional(),
  description: z.string().optional(),
  rootCause: z.string().optional(),
  impactAssessment: z.string().optional(),
  immediateAction: z.string().optional(),
  capaId: z.string().optional(),
  reportedBy: z.string().optional(),
  reportedDate: z.string().optional(),
  closedDate: z.string().optional(),
}).partial();

const { GET, POST } = createRouteHandlers({
  entity: 'deviations', modelName: 'deviation',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['title', 'number', 'description', 'department'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
});

const { GET: GET_BY_ID, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'deviations', modelName: 'deviation',
  validationSchema: { update: updateSchema },
  searchFields: ['title', 'number', 'description'],
});

function makeRequest(url: string, method = 'GET', body?: Record<string, unknown>, headers?: Record<string, string>): Request {
  const init: RequestInit = { method, headers: { 'content-type': 'application/json', 'x-tenant-id': 'test-tenant', ...headers } };
  if (body && method !== 'GET') init.body = JSON.stringify(body);
  return new Request(url, init);
}

function makeParams(id: string) { return { params: Promise.resolve({ id }) }; }

const validDeviation = { number: 'DEV-2026-001', title: 'Temperature Excursion in Cold Storage', type: 'UNPLANNED' as const, severity: 'MAJOR' as const };

describe('QAQC Deviations API Routes', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  describe('GET /api/v1/qaqc/deviations', () => {
    it('returns paginated list', async () => {
      const data = [{ id: 'dev-1', number: 'DEV-001', title: 'Dev 1' }];
      mockFindMany.mockResolvedValue(data);
      mockCount.mockResolvedValue(1);
      const res = await GET(makeRequest('http://localhost:3000/api/v1/qaqc/deviations') as any);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.total).toBe(1);
    });

    it('applies search filter', async () => {
      mockFindMany.mockResolvedValue([]); mockCount.mockResolvedValue(0);
      await GET(makeRequest('http://localhost:3000/api/v1/qaqc/deviations?search=temp') as any);
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { title: { contains: 'temp', mode: 'insensitive' } },
            { number: { contains: 'temp', mode: 'insensitive' } },
            { description: { contains: 'temp', mode: 'insensitive' } },
            { department: { contains: 'temp', mode: 'insensitive' } },
          ],
        }),
      }));
    });

    it('supports filter[severity]', async () => {
      mockFindMany.mockResolvedValue([]); mockCount.mockResolvedValue(0);
      await GET(makeRequest('http://localhost:3000/api/v1/qaqc/deviations?filter[severity]=CRITICAL') as any);
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ severity: 'CRITICAL' }),
      }));
    });

    it('paginates correctly', async () => {
      mockFindMany.mockResolvedValue([]); mockCount.mockResolvedValue(50);
      const res = await GET(makeRequest('http://localhost:3000/api/v1/qaqc/deviations?page=5&pageSize=5') as any);
      const body = await res.json();
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 5 }));
      expect(body.totalPages).toBe(10);
    });
  });

  describe('GET /api/v1/qaqc/deviations/:id', () => {
    it('returns a single deviation', async () => {
      mockFindFirst.mockResolvedValue({ id: 'dev-1', number: 'DEV-001' });
      const res = await GET_BY_ID(makeRequest('http://localhost:3000/api/v1/qaqc/deviations/dev-1') as any, makeParams('dev-1'));
      expect(res.status).toBe(200);
      expect((await res.json()).number).toBe('DEV-001');
    });

    it('returns 404 for non-existent', async () => {
      mockFindFirst.mockResolvedValue(null);
      const res = await GET_BY_ID(makeRequest('http://localhost:3000/api/v1/qaqc/deviations/missing') as any, makeParams('missing'));
      expect(res.status).toBe(404);
    });

    it('scopes by tenant ID', async () => {
      mockFindFirst.mockResolvedValue({ id: 'dev-1' });
      await GET_BY_ID(makeRequest('http://localhost:3000/api/v1/qaqc/deviations/dev-1', 'GET', undefined, { 'x-tenant-id': 'acme' }) as any, makeParams('dev-1'));
      expect(mockFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'dev-1', tenantId: 'acme' } }));
    });
  });

  describe('POST /api/v1/qaqc/deviations', () => {
    it('creates a deviation with valid data', async () => {
      mockCreate.mockResolvedValue({ id: 'dev-new', ...validDeviation });
      const res = await POST(makeRequest('http://localhost:3000/api/v1/qaqc/deviations', 'POST', validDeviation) as any);
      expect(res.status).toBe(201);
      expect((await res.json()).number).toBe('DEV-2026-001');
    });

    it('rejects when required fields are missing', async () => {
      const res = await POST(makeRequest('http://localhost:3000/api/v1/qaqc/deviations', 'POST', { type: 'PLANNED', severity: 'MINOR' }) as any);
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Validation failed');
    });

    it('rejects invalid type enum', async () => {
      const res = await POST(makeRequest('http://localhost:3000/api/v1/qaqc/deviations', 'POST', { number: 'D1', title: 'T', type: 'SCHEDULED', severity: 'MINOR' }) as any);
      expect(res.status).toBe(400);
    });

    it('rejects invalid severity enum', async () => {
      const res = await POST(makeRequest('http://localhost:3000/api/v1/qaqc/deviations', 'POST', { number: 'D1', title: 'T', type: 'PLANNED', severity: 'EXTREME' }) as any);
      expect(res.status).toBe(400);
    });

    it('returns 500 on database error', async () => {
      mockCreate.mockRejectedValue(new Error('DB error'));
      const res = await POST(makeRequest('http://localhost:3000/api/v1/qaqc/deviations', 'POST', validDeviation) as any);
      expect(res.status).toBe(500);
    });
  });

  describe('PATCH /api/v1/qaqc/deviations/:id', () => {
    it('updates deviation status', async () => {
      mockFindFirst.mockResolvedValue({ id: 'dev-1', status: 'OPEN' });
      mockUpdate.mockResolvedValue({ id: 'dev-1', status: 'UNDER_INVESTIGATION' });
      const res = await PATCH(makeRequest('http://localhost:3000/api/v1/qaqc/deviations/dev-1', 'PATCH', { status: 'UNDER_INVESTIGATION' }) as any, makeParams('dev-1'));
      expect(res.status).toBe(200);
      expect((await res.json()).status).toBe('UNDER_INVESTIGATION');
    });

    it('returns 404 for non-existent', async () => {
      mockFindFirst.mockResolvedValue(null);
      const res = await PATCH(makeRequest('http://localhost:3000/api/v1/qaqc/deviations/m', 'PATCH', { status: 'CLOSED' }) as any, makeParams('m'));
      expect(res.status).toBe(404);
    });

    it('rejects invalid status', async () => {
      mockFindFirst.mockResolvedValue({ id: 'dev-1' });
      const res = await PATCH(makeRequest('http://localhost:3000/api/v1/qaqc/deviations/dev-1', 'PATCH', { status: 'INVALID' }) as any, makeParams('dev-1'));
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/v1/qaqc/deviations/:id', () => {
    it('deletes an existing deviation', async () => {
      mockFindFirst.mockResolvedValue({ id: 'dev-1' }); mockDelete.mockResolvedValue({ id: 'dev-1' });
      const res = await DELETE(makeRequest('http://localhost:3000/api/v1/qaqc/deviations/dev-1', 'DELETE') as any, makeParams('dev-1'));
      expect(res.status).toBe(200);
      expect((await res.json()).success).toBe(true);
    });

    it('returns 404 when not found', async () => {
      mockFindFirst.mockResolvedValue(null);
      const res = await DELETE(makeRequest('http://localhost:3000/api/v1/qaqc/deviations/m', 'DELETE') as any, makeParams('m'));
      expect(res.status).toBe(404);
    });

    it('returns 500 on delete error', async () => {
      mockFindFirst.mockResolvedValue({ id: 'dev-1' }); mockDelete.mockRejectedValue(new Error('err'));
      const res = await DELETE(makeRequest('http://localhost:3000/api/v1/qaqc/deviations/dev-1', 'DELETE') as any, makeParams('dev-1'));
      expect(res.status).toBe(500);
    });
  });
});
