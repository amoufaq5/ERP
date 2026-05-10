import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Prisma Mock ────────────────────────────────────────────────────────────

const {
  mockFindMany,
  mockFindFirst,
  mockCount,
  mockCreate,
  mockUpdate,
  mockDelete,
} = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockFindFirst: vi.fn(),
  mockCount: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('@/lib/prisma', () => {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop: string) {
      if (prop === 'then') return undefined;
      return {
        findMany: mockFindMany,
        findFirst: mockFindFirst,
        count: mockCount,
        create: mockCreate,
        update: mockUpdate,
        delete: mockDelete,
      };
    },
  };
  return { default: new Proxy({}, handler) };
});

// ─── Imports ────────────────────────────────────────────────────────────────

import { GET, POST } from '@/app/api/v1/qaqc/document-control/route';
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/v1/qaqc/document-control/[id]/route';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(
  url: string,
  method = 'GET',
  body?: Record<string, unknown>,
  headers?: Record<string, string>,
): Request {
  const init: RequestInit = {
    method,
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': 'test-tenant',
      ...headers,
    },
  };
  if (body && method !== 'GET') {
    init.body = JSON.stringify(body);
  }
  return new Request(url, init);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ─── Valid data ─────────────────────────────────────────────────────────────

const validDocument = {
  number: 'SOP-2026-001',
  title: 'Standard Operating Procedure: Equipment Cleaning',
  type: 'SOP' as const,
};

const fullDocument = {
  ...validDocument,
  status: 'DRAFT' as const,
  version: '1.0',
  department: 'Quality',
  author: 'Jane Doe',
  reviewer: 'John Smith',
  approver: 'Director QA',
  effectiveDate: '2026-06-01',
  reviewDate: '2027-06-01',
};

// =============================================================================
// Tests
// =============================================================================

describe('QAQC Document Control API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── GET Collection ─────────────────────────────────────────────────────

  describe('GET /api/v1/qaqc/document-control', () => {
    it('returns paginated document list', async () => {
      const mockData = [
        { id: 'doc-1', number: 'SOP-001', title: 'SOP for Cleaning', type: 'SOP', status: 'EFFECTIVE' },
        { id: 'doc-2', number: 'SPEC-001', title: 'API Specification', type: 'SPECIFICATION', status: 'DRAFT' },
      ];
      mockFindMany.mockResolvedValue(mockData);
      mockCount.mockResolvedValue(2);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/document-control');
      const res = await GET(req as any);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(2);
      expect(body.total).toBe(2);
    });

    it('searches across number, title, department, author', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/document-control?search=cleaning');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { number: { contains: 'cleaning', mode: 'insensitive' } },
              { title: { contains: 'cleaning', mode: 'insensitive' } },
              { department: { contains: 'cleaning', mode: 'insensitive' } },
              { author: { contains: 'cleaning', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('includes versions relation', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/document-control?include=versions');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { versions: true },
        }),
      );
    });

    it('filters by document type', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/document-control?filter[type]=SOP');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'SOP' }),
        }),
      );
    });

    it('filters by status', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/document-control?filter[status]=EFFECTIVE');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'EFFECTIVE' }),
        }),
      );
    });

    it('handles custom sorting', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/document-control?sort=title&direction=asc');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { title: 'asc' },
        }),
      );
    });
  });

  // ─── GET by ID ──────────────────────────────────────────────────────────

  describe('GET /api/v1/qaqc/document-control/:id', () => {
    it('returns a single document', async () => {
      const record = { id: 'doc-1', number: 'SOP-001', title: 'SOP for Cleaning', version: '2.1' };
      mockFindFirst.mockResolvedValue(record);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/document-control/doc-1');
      const res = await GET_BY_ID(req as any, makeParams('doc-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.version).toBe('2.1');
    });

    it('returns 404 for non-existent document', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/document-control/missing');
      const res = await GET_BY_ID(req as any, makeParams('missing'));

      expect(res.status).toBe(404);
    });

    it('includes versions when requested', async () => {
      mockFindFirst.mockResolvedValue({ id: 'doc-1', versions: [] });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/document-control/doc-1?include=versions');
      await GET_BY_ID(req as any, makeParams('doc-1'));

      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { versions: true },
        }),
      );
    });
  });

  // ─── POST (Create) ─────────────────────────────────────────────────────

  describe('POST /api/v1/qaqc/document-control', () => {
    it('creates a document with valid data', async () => {
      const created = { id: 'doc-new', ...validDocument, status: 'DRAFT', version: '1.0', tenantId: 'test-tenant' };
      mockCreate.mockResolvedValue(created);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/document-control', 'POST', validDocument);
      const res = await POST(req as any);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.number).toBe('SOP-2026-001');
    });

    it('creates a document with all fields', async () => {
      const created = { id: 'doc-full', ...fullDocument, tenantId: 'test-tenant' };
      mockCreate.mockResolvedValue(created);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/document-control', 'POST', fullDocument);
      const res = await POST(req as any);

      expect(res.status).toBe(201);
    });

    it('rejects missing required number', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/document-control', 'POST', {
        title: 'SOP',
        type: 'SOP',
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });

    it('rejects missing required title', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/document-control', 'POST', {
        number: 'SOP-001',
        type: 'SOP',
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });

    it('rejects invalid type enum', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/document-control', 'POST', {
        number: 'DOC-001',
        title: 'Document',
        type: 'MANUAL', // invalid
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });

    it('accepts all valid document types', async () => {
      const types = ['SOP', 'PROTOCOL', 'FORM', 'REPORT', 'SPECIFICATION'];

      for (const type of types) {
        vi.clearAllMocks();
        mockCreate.mockResolvedValue({ id: `doc-${type}`, number: 'DOC-001', title: 'Test', type });

        const req = makeRequest('http://localhost:3000/api/v1/qaqc/document-control', 'POST', {
          number: 'DOC-001',
          title: 'Test',
          type,
        });
        const res = await POST(req as any);

        expect(res.status).toBe(201);
      }
    });

    it('defaults status to DRAFT', async () => {
      mockCreate.mockResolvedValue({ id: 'doc-new' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/document-control', 'POST', validDocument);
      await POST(req as any);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'DRAFT',
            version: '1.0',
          }),
        }),
      );
    });
  });

  // ─── PATCH (Update) ────────────────────────────────────────────────────

  describe('PATCH /api/v1/qaqc/document-control/:id', () => {
    it('updates document status to APPROVED', async () => {
      mockFindFirst.mockResolvedValue({ id: 'doc-1', status: 'UNDER_REVIEW' });
      mockUpdate.mockResolvedValue({ id: 'doc-1', status: 'APPROVED' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/document-control/doc-1', 'PATCH', {
        status: 'APPROVED',
      });
      const res = await PATCH(req as any, makeParams('doc-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe('APPROVED');
    });

    it('updates version and effectiveDate', async () => {
      mockFindFirst.mockResolvedValue({ id: 'doc-1', version: '1.0' });
      mockUpdate.mockResolvedValue({ id: 'doc-1', version: '2.0', effectiveDate: '2026-07-01' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/document-control/doc-1', 'PATCH', {
        version: '2.0',
        effectiveDate: '2026-07-01',
      });
      const res = await PATCH(req as any, makeParams('doc-1'));

      expect(res.status).toBe(200);
    });

    it('returns 404 for non-existent document', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/document-control/missing', 'PATCH', {
        status: 'APPROVED',
      });
      const res = await PATCH(req as any, makeParams('missing'));

      expect(res.status).toBe(404);
    });

    it('rejects invalid status on update', async () => {
      mockFindFirst.mockResolvedValue({ id: 'doc-1' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/document-control/doc-1', 'PATCH', {
        status: 'ARCHIVED', // invalid
      });
      const res = await PATCH(req as any, makeParams('doc-1'));

      expect(res.status).toBe(400);
    });

    it('rejects invalid type on update', async () => {
      mockFindFirst.mockResolvedValue({ id: 'doc-1' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/document-control/doc-1', 'PATCH', {
        type: 'MANUAL', // invalid
      });
      const res = await PATCH(req as any, makeParams('doc-1'));

      expect(res.status).toBe(400);
    });
  });

  // ─── DELETE ─────────────────────────────────────────────────────────────

  describe('DELETE /api/v1/qaqc/document-control/:id', () => {
    it('deletes an existing document', async () => {
      mockFindFirst.mockResolvedValue({ id: 'doc-1' });
      mockDelete.mockResolvedValue({ id: 'doc-1' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/document-control/doc-1', 'DELETE');
      const res = await DELETE(req as any, makeParams('doc-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('returns 404 when document not found', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/document-control/missing', 'DELETE');
      const res = await DELETE(req as any, makeParams('missing'));

      expect(res.status).toBe(404);
    });

    it('verifies tenant ownership before deletion', async () => {
      mockFindFirst.mockResolvedValue({ id: 'doc-1' });
      mockDelete.mockResolvedValue({ id: 'doc-1' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/document-control/doc-1', 'DELETE', undefined, {
        'x-tenant-id': 'pharma-co',
      });
      await DELETE(req as any, makeParams('doc-1'));

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: 'doc-1', tenantId: 'pharma-co' },
      });
    });
  });
});
