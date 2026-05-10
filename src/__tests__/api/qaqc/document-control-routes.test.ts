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
  type: z.enum(['SOP', 'PROTOCOL', 'FORM', 'REPORT', 'SPECIFICATION']),
  status: z.enum(['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'EFFECTIVE', 'OBSOLETE']).default('DRAFT'),
  version: z.string().default('1.0'),
  department: z.string().optional(),
  author: z.string().optional(),
  reviewer: z.string().optional(),
  approver: z.string().optional(),
  effectiveDate: z.string().optional(),
  reviewDate: z.string().optional(),
});

const updateSchema = z.object({
  number: z.string().optional(),
  title: z.string().optional(),
  type: z.enum(['SOP', 'PROTOCOL', 'FORM', 'REPORT', 'SPECIFICATION']).optional(),
  status: z.enum(['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'EFFECTIVE', 'OBSOLETE']).optional(),
  version: z.string().optional(),
  department: z.string().optional(),
  author: z.string().optional(),
  reviewer: z.string().optional(),
  approver: z.string().optional(),
  effectiveDate: z.string().optional(),
  reviewDate: z.string().optional(),
}).partial();

const { GET, POST } = createRouteHandlers({
  entity: 'document-control', modelName: 'qDocument',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['number', 'title', 'department', 'author'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
  allowedIncludes: ['versions'],
});

const { GET: GET_BY_ID, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'document-control', modelName: 'qDocument',
  validationSchema: { update: updateSchema },
  searchFields: ['number', 'title', 'department'],
  allowedIncludes: ['versions'],
});

function makeRequest(url: string, method = 'GET', body?: Record<string, unknown>, headers?: Record<string, string>): Request {
  const init: RequestInit = { method, headers: { 'content-type': 'application/json', 'x-tenant-id': 'test-tenant', ...headers } };
  if (body && method !== 'GET') init.body = JSON.stringify(body);
  return new Request(url, init);
}
function makeParams(id: string) { return { params: Promise.resolve({ id }) }; }

const validDoc = { number: 'SOP-2026-001', title: 'Equipment Cleaning SOP', type: 'SOP' as const };

describe('QAQC Document Control API Routes', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  describe('GET /api/v1/qaqc/document-control', () => {
    it('returns paginated document list', async () => {
      mockFindMany.mockResolvedValue([{ id: 'doc-1' }]); mockCount.mockResolvedValue(1);
      const res = await GET(makeRequest('http://localhost:3000/api/v1/qaqc/document-control') as any);
      expect(res.status).toBe(200);
      expect((await res.json()).data).toHaveLength(1);
    });

    it('searches across configured fields', async () => {
      mockFindMany.mockResolvedValue([]); mockCount.mockResolvedValue(0);
      await GET(makeRequest('http://localhost:3000/api/v1/qaqc/document-control?search=cleaning') as any);
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { number: { contains: 'cleaning', mode: 'insensitive' } },
            { title: { contains: 'cleaning', mode: 'insensitive' } },
            { department: { contains: 'cleaning', mode: 'insensitive' } },
            { author: { contains: 'cleaning', mode: 'insensitive' } },
          ],
        }),
      }));
    });

    it('includes versions relation', async () => {
      mockFindMany.mockResolvedValue([]); mockCount.mockResolvedValue(0);
      await GET(makeRequest('http://localhost:3000/api/v1/qaqc/document-control?include=versions') as any);
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ include: { versions: true } }));
    });

    it('filters by type', async () => {
      mockFindMany.mockResolvedValue([]); mockCount.mockResolvedValue(0);
      await GET(makeRequest('http://localhost:3000/api/v1/qaqc/document-control?filter[type]=SOP') as any);
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ type: 'SOP' }) }));
    });

    it('handles custom sorting', async () => {
      mockFindMany.mockResolvedValue([]); mockCount.mockResolvedValue(0);
      await GET(makeRequest('http://localhost:3000/api/v1/qaqc/document-control?sort=title&direction=asc') as any);
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { title: 'asc' } }));
    });
  });

  describe('GET /api/v1/qaqc/document-control/:id', () => {
    it('returns a single document', async () => {
      mockFindFirst.mockResolvedValue({ id: 'doc-1', version: '2.1' });
      const res = await GET_BY_ID(makeRequest('http://localhost:3000/api/v1/qaqc/document-control/doc-1') as any, makeParams('doc-1'));
      expect(res.status).toBe(200);
      expect((await res.json()).version).toBe('2.1');
    });

    it('returns 404 for non-existent', async () => {
      mockFindFirst.mockResolvedValue(null);
      const res = await GET_BY_ID(makeRequest('http://localhost:3000/api/v1/qaqc/document-control/m') as any, makeParams('m'));
      expect(res.status).toBe(404);
    });

    it('includes versions when requested', async () => {
      mockFindFirst.mockResolvedValue({ id: 'doc-1' });
      await GET_BY_ID(makeRequest('http://localhost:3000/api/v1/qaqc/document-control/doc-1?include=versions') as any, makeParams('doc-1'));
      expect(mockFindFirst).toHaveBeenCalledWith(expect.objectContaining({ include: { versions: true } }));
    });
  });

  describe('POST /api/v1/qaqc/document-control', () => {
    it('creates a document with valid data', async () => {
      mockCreate.mockResolvedValue({ id: 'doc-new', ...validDoc });
      const res = await POST(makeRequest('http://localhost:3000/api/v1/qaqc/document-control', 'POST', validDoc) as any);
      expect(res.status).toBe(201);
    });

    it('rejects missing required number', async () => {
      const res = await POST(makeRequest('http://localhost:3000/api/v1/qaqc/document-control', 'POST', { title: 'SOP', type: 'SOP' }) as any);
      expect(res.status).toBe(400);
    });

    it('rejects missing required title', async () => {
      const res = await POST(makeRequest('http://localhost:3000/api/v1/qaqc/document-control', 'POST', { number: 'SOP-001', type: 'SOP' }) as any);
      expect(res.status).toBe(400);
    });

    it('rejects invalid type enum', async () => {
      const res = await POST(makeRequest('http://localhost:3000/api/v1/qaqc/document-control', 'POST', { number: 'DOC-001', title: 'Doc', type: 'MANUAL' }) as any);
      expect(res.status).toBe(400);
    });

    it('defaults status to DRAFT and version to 1.0', async () => {
      mockCreate.mockResolvedValue({ id: 'doc-new' });
      await POST(makeRequest('http://localhost:3000/api/v1/qaqc/document-control', 'POST', validDoc) as any);
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: 'DRAFT', version: '1.0' }),
      }));
    });
  });

  describe('PATCH /api/v1/qaqc/document-control/:id', () => {
    it('updates document status', async () => {
      mockFindFirst.mockResolvedValue({ id: 'doc-1' });
      mockUpdate.mockResolvedValue({ id: 'doc-1', status: 'APPROVED' });
      const res = await PATCH(makeRequest('http://localhost:3000/api/v1/qaqc/document-control/doc-1', 'PATCH', { status: 'APPROVED' }) as any, makeParams('doc-1'));
      expect(res.status).toBe(200);
    });

    it('returns 404 for non-existent', async () => {
      mockFindFirst.mockResolvedValue(null);
      const res = await PATCH(makeRequest('http://localhost:3000/api/v1/qaqc/document-control/m', 'PATCH', { status: 'APPROVED' }) as any, makeParams('m'));
      expect(res.status).toBe(404);
    });

    it('rejects invalid status', async () => {
      mockFindFirst.mockResolvedValue({ id: 'doc-1' });
      const res = await PATCH(makeRequest('http://localhost:3000/api/v1/qaqc/document-control/doc-1', 'PATCH', { status: 'ARCHIVED' }) as any, makeParams('doc-1'));
      expect(res.status).toBe(400);
    });

    it('rejects invalid type', async () => {
      mockFindFirst.mockResolvedValue({ id: 'doc-1' });
      const res = await PATCH(makeRequest('http://localhost:3000/api/v1/qaqc/document-control/doc-1', 'PATCH', { type: 'MANUAL' }) as any, makeParams('doc-1'));
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/v1/qaqc/document-control/:id', () => {
    it('deletes an existing document', async () => {
      mockFindFirst.mockResolvedValue({ id: 'doc-1' }); mockDelete.mockResolvedValue({ id: 'doc-1' });
      const res = await DELETE(makeRequest('http://localhost:3000/api/v1/qaqc/document-control/doc-1', 'DELETE') as any, makeParams('doc-1'));
      expect(res.status).toBe(200);
      expect((await res.json()).success).toBe(true);
    });

    it('returns 404 when not found', async () => {
      mockFindFirst.mockResolvedValue(null);
      const res = await DELETE(makeRequest('http://localhost:3000/api/v1/qaqc/document-control/m', 'DELETE') as any, makeParams('m'));
      expect(res.status).toBe(404);
    });

    it('verifies tenant ownership', async () => {
      mockFindFirst.mockResolvedValue({ id: 'doc-1' }); mockDelete.mockResolvedValue({ id: 'doc-1' });
      await DELETE(makeRequest('http://localhost:3000/api/v1/qaqc/document-control/doc-1', 'DELETE', undefined, { 'x-tenant-id': 'pharma-co' }) as any, makeParams('doc-1'));
      expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 'doc-1', tenantId: 'pharma-co' } });
    });
  });
});
