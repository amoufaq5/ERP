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
  title: z.string().min(1),
  type: z.enum(['INTERNAL', 'EXTERNAL', 'SUPPLIER']),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED']).default('PLANNED'),
  auditor: z.string().min(1),
  auditee: z.string().min(1),
  department: z.string().optional(),
  scheduledDate: z.string().min(1),
  completedDate: z.string().optional(),
  score: z.number().optional(),
  notes: z.string().optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(['INTERNAL', 'EXTERNAL', 'SUPPLIER']).optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED']).optional(),
  auditor: z.string().optional(),
  auditee: z.string().optional(),
  department: z.string().optional(),
  scheduledDate: z.string().optional(),
  completedDate: z.string().optional(),
  score: z.number().optional(),
  notes: z.string().optional(),
}).partial();

const { GET, POST } = createRouteHandlers({
  entity: 'audits', modelName: 'qAudit',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['title', 'auditor', 'auditee', 'department'],
  defaultSort: { field: 'scheduledDate', direction: 'desc' },
  allowedIncludes: ['findings'],
});

const { GET: GET_BY_ID, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'audits', modelName: 'qAudit',
  validationSchema: { update: updateSchema },
  searchFields: ['title', 'auditor', 'auditee'],
  allowedIncludes: ['findings'],
});

function makeRequest(url: string, method = 'GET', body?: Record<string, unknown>, headers?: Record<string, string>): Request {
  const init: RequestInit = { method, headers: { 'content-type': 'application/json', 'x-tenant-id': 'test-tenant', ...headers } };
  if (body && method !== 'GET') init.body = JSON.stringify(body);
  return new Request(url, init);
}
function makeParams(id: string) { return { params: Promise.resolve({ id }) }; }

const validAudit = { title: 'Annual GMP Audit', type: 'INTERNAL' as const, auditor: 'Alice Johnson', auditee: 'Manufacturing Dept', scheduledDate: '2026-06-01' };

describe('QAQC Audits API Routes', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  describe('GET /api/v1/qaqc/audits', () => {
    it('returns paginated audit list', async () => {
      mockFindMany.mockResolvedValue([{ id: 'aud-1' }]); mockCount.mockResolvedValue(1);
      const res = await GET(makeRequest('http://localhost:3000/api/v1/qaqc/audits') as any);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(1);
    });

    it('sorts by scheduledDate desc by default', async () => {
      mockFindMany.mockResolvedValue([]); mockCount.mockResolvedValue(0);
      await GET(makeRequest('http://localhost:3000/api/v1/qaqc/audits') as any);
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { scheduledDate: 'desc' } }));
    });

    it('searches across configured fields', async () => {
      mockFindMany.mockResolvedValue([]); mockCount.mockResolvedValue(0);
      await GET(makeRequest('http://localhost:3000/api/v1/qaqc/audits?search=GMP') as any);
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { title: { contains: 'GMP', mode: 'insensitive' } },
            { auditor: { contains: 'GMP', mode: 'insensitive' } },
            { auditee: { contains: 'GMP', mode: 'insensitive' } },
            { department: { contains: 'GMP', mode: 'insensitive' } },
          ],
        }),
      }));
    });

    it('includes findings when requested', async () => {
      mockFindMany.mockResolvedValue([]); mockCount.mockResolvedValue(0);
      await GET(makeRequest('http://localhost:3000/api/v1/qaqc/audits?include=findings') as any);
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ include: { findings: true } }));
    });

    it('filters by status', async () => {
      mockFindMany.mockResolvedValue([]); mockCount.mockResolvedValue(0);
      await GET(makeRequest('http://localhost:3000/api/v1/qaqc/audits?filter[status]=COMPLETED') as any);
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: 'COMPLETED' }) }));
    });
  });

  describe('GET /api/v1/qaqc/audits/:id', () => {
    it('returns a single audit', async () => {
      mockFindFirst.mockResolvedValue({ id: 'aud-1', title: 'GMP Audit' });
      const res = await GET_BY_ID(makeRequest('http://localhost:3000/api/v1/qaqc/audits/aud-1') as any, makeParams('aud-1'));
      expect(res.status).toBe(200);
      expect((await res.json()).title).toBe('GMP Audit');
    });

    it('returns 404 when not found', async () => {
      mockFindFirst.mockResolvedValue(null);
      const res = await GET_BY_ID(makeRequest('http://localhost:3000/api/v1/qaqc/audits/m') as any, makeParams('m'));
      expect(res.status).toBe(404);
    });

    it('includes findings relation', async () => {
      mockFindFirst.mockResolvedValue({ id: 'aud-1' });
      await GET_BY_ID(makeRequest('http://localhost:3000/api/v1/qaqc/audits/aud-1?include=findings') as any, makeParams('aud-1'));
      expect(mockFindFirst).toHaveBeenCalledWith(expect.objectContaining({ include: { findings: true } }));
    });
  });

  describe('POST /api/v1/qaqc/audits', () => {
    it('creates an audit with valid data', async () => {
      mockCreate.mockResolvedValue({ id: 'aud-new', ...validAudit });
      const res = await POST(makeRequest('http://localhost:3000/api/v1/qaqc/audits', 'POST', validAudit) as any);
      expect(res.status).toBe(201);
      expect((await res.json()).title).toBe('Annual GMP Audit');
    });

    it('rejects missing required auditor', async () => {
      const res = await POST(makeRequest('http://localhost:3000/api/v1/qaqc/audits', 'POST', { title: 'Audit', type: 'INTERNAL', auditee: 'Mfg', scheduledDate: '2026-06-01' }) as any);
      expect(res.status).toBe(400);
    });

    it('rejects missing required scheduledDate', async () => {
      const res = await POST(makeRequest('http://localhost:3000/api/v1/qaqc/audits', 'POST', { title: 'Audit', type: 'INTERNAL', auditor: 'A', auditee: 'B' }) as any);
      expect(res.status).toBe(400);
    });

    it('rejects invalid type enum', async () => {
      const res = await POST(makeRequest('http://localhost:3000/api/v1/qaqc/audits', 'POST', { ...validAudit, type: 'REGULATORY' }) as any);
      expect(res.status).toBe(400);
    });

    it('rejects non-numeric score', async () => {
      const res = await POST(makeRequest('http://localhost:3000/api/v1/qaqc/audits', 'POST', { ...validAudit, score: 'ninety' }) as any);
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/qaqc/audits/:id', () => {
    it('updates audit status and score', async () => {
      mockFindFirst.mockResolvedValue({ id: 'aud-1' });
      mockUpdate.mockResolvedValue({ id: 'aud-1', status: 'COMPLETED', score: 92 });
      const res = await PATCH(makeRequest('http://localhost:3000/api/v1/qaqc/audits/aud-1', 'PATCH', { status: 'COMPLETED', score: 92 }) as any, makeParams('aud-1'));
      expect(res.status).toBe(200);
      expect((await res.json()).score).toBe(92);
    });

    it('returns 404 for non-existent', async () => {
      mockFindFirst.mockResolvedValue(null);
      const res = await PATCH(makeRequest('http://localhost:3000/api/v1/qaqc/audits/m', 'PATCH', { notes: 'X' }) as any, makeParams('m'));
      expect(res.status).toBe(404);
    });

    it('rejects invalid status', async () => {
      mockFindFirst.mockResolvedValue({ id: 'aud-1' });
      const res = await PATCH(makeRequest('http://localhost:3000/api/v1/qaqc/audits/aud-1', 'PATCH', { status: 'CANCELLED' }) as any, makeParams('aud-1'));
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/v1/qaqc/audits/:id', () => {
    it('deletes an existing audit', async () => {
      mockFindFirst.mockResolvedValue({ id: 'aud-1' }); mockDelete.mockResolvedValue({ id: 'aud-1' });
      const res = await DELETE(makeRequest('http://localhost:3000/api/v1/qaqc/audits/aud-1', 'DELETE') as any, makeParams('aud-1'));
      expect(res.status).toBe(200);
      expect((await res.json()).success).toBe(true);
    });

    it('returns 404 when not found', async () => {
      mockFindFirst.mockResolvedValue(null);
      const res = await DELETE(makeRequest('http://localhost:3000/api/v1/qaqc/audits/m', 'DELETE') as any, makeParams('m'));
      expect(res.status).toBe(404);
    });

    it('confirms delete calls model with correct id', async () => {
      mockFindFirst.mockResolvedValue({ id: 'aud-1' }); mockDelete.mockResolvedValue({ id: 'aud-1' });
      await DELETE(makeRequest('http://localhost:3000/api/v1/qaqc/audits/aud-1', 'DELETE') as any, makeParams('aud-1'));
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'aud-1' } });
    });
  });
});
