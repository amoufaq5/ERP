import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Prisma Mock ────────────────────────────────────────────────────────────

const mockFindMany = vi.fn();
const mockFindFirst = vi.fn();
const mockCount = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

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

import { GET, POST } from '@/app/api/v1/qaqc/audits/route';
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/v1/qaqc/audits/[id]/route';

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

const validAudit = {
  title: 'Annual GMP Audit',
  type: 'INTERNAL' as const,
  auditor: 'Alice Johnson',
  auditee: 'Manufacturing Dept',
  scheduledDate: '2026-06-01',
};

const fullAudit = {
  ...validAudit,
  status: 'PLANNED' as const,
  department: 'Manufacturing',
  completedDate: '2026-06-05',
  score: 87,
  notes: 'All major findings addressed',
};

// =============================================================================
// Tests
// =============================================================================

describe('QAQC Audits API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── GET Collection ─────────────────────────────────────────────────────

  describe('GET /api/v1/qaqc/audits', () => {
    it('returns paginated audit list', async () => {
      const mockData = [
        { id: 'aud-1', title: 'GMP Audit Q1', type: 'INTERNAL', status: 'COMPLETED' },
        { id: 'aud-2', title: 'Supplier Audit', type: 'SUPPLIER', status: 'PLANNED' },
      ];
      mockFindMany.mockResolvedValue(mockData);
      mockCount.mockResolvedValue(2);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/audits');
      const res = await GET(req as any);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(2);
      expect(body.total).toBe(2);
      expect(body.page).toBe(1);
      expect(body.totalPages).toBe(1);
    });

    it('sorts by scheduledDate desc by default', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/audits');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { scheduledDate: 'desc' },
        }),
      );
    });

    it('searches across title, auditor, auditee, department', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/audits?search=GMP');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'GMP', mode: 'insensitive' } },
              { auditor: { contains: 'GMP', mode: 'insensitive' } },
              { auditee: { contains: 'GMP', mode: 'insensitive' } },
              { department: { contains: 'GMP', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('includes findings relation when requested', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/audits?include=findings');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { findings: true },
        }),
      );
    });

    it('filters by status', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/audits?filter[status]=COMPLETED');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
    });

    it('returns empty list when no data found', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/audits');
      const res = await GET(req as any);
      const body = await res.json();

      expect(body.data).toEqual([]);
      expect(body.total).toBe(0);
      expect(body.totalPages).toBe(0);
    });
  });

  // ─── GET by ID ──────────────────────────────────────────────────────────

  describe('GET /api/v1/qaqc/audits/:id', () => {
    it('returns a single audit record', async () => {
      const record = { id: 'aud-1', title: 'GMP Audit Q1', auditor: 'Alice Johnson' };
      mockFindFirst.mockResolvedValue(record);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/audits/aud-1');
      const res = await GET_BY_ID(req as any, makeParams('aud-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.title).toBe('GMP Audit Q1');
    });

    it('returns 404 when audit not found', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/audits/missing');
      const res = await GET_BY_ID(req as any, makeParams('missing'));

      expect(res.status).toBe(404);
    });

    it('includes findings when requested', async () => {
      mockFindFirst.mockResolvedValue({ id: 'aud-1', findings: [] });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/audits/aud-1?include=findings');
      await GET_BY_ID(req as any, makeParams('aud-1'));

      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { findings: true },
        }),
      );
    });
  });

  // ─── POST (Create) ─────────────────────────────────────────────────────

  describe('POST /api/v1/qaqc/audits', () => {
    it('creates an audit with valid data', async () => {
      const created = { id: 'aud-new', ...validAudit, tenantId: 'test-tenant' };
      mockCreate.mockResolvedValue(created);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/audits', 'POST', validAudit);
      const res = await POST(req as any);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.title).toBe('Annual GMP Audit');
      expect(body.auditor).toBe('Alice Johnson');
    });

    it('creates an audit with all fields including score', async () => {
      const created = { id: 'aud-full', ...fullAudit, tenantId: 'test-tenant' };
      mockCreate.mockResolvedValue(created);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/audits', 'POST', fullAudit);
      const res = await POST(req as any);

      expect(res.status).toBe(201);
    });

    it('rejects missing required title', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/audits', 'POST', {
        type: 'INTERNAL',
        auditor: 'Alice',
        auditee: 'Manufacturing',
        scheduledDate: '2026-06-01',
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });

    it('rejects missing required auditor', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/audits', 'POST', {
        title: 'Audit',
        type: 'INTERNAL',
        auditee: 'Manufacturing',
        scheduledDate: '2026-06-01',
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });

    it('rejects missing required auditee', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/audits', 'POST', {
        title: 'Audit',
        type: 'INTERNAL',
        auditor: 'Alice',
        scheduledDate: '2026-06-01',
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });

    it('rejects missing required scheduledDate', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/audits', 'POST', {
        title: 'Audit',
        type: 'INTERNAL',
        auditor: 'Alice',
        auditee: 'Manufacturing',
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });

    it('rejects invalid type enum', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/audits', 'POST', {
        title: 'Audit',
        type: 'REGULATORY', // not a valid value
        auditor: 'Alice',
        auditee: 'Manufacturing',
        scheduledDate: '2026-06-01',
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });

    it('rejects non-numeric score', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/audits', 'POST', {
        ...validAudit,
        score: 'ninety', // should be number
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });
  });

  // ─── PATCH (Update) ────────────────────────────────────────────────────

  describe('PATCH /api/v1/qaqc/audits/:id', () => {
    it('updates audit status and score', async () => {
      mockFindFirst.mockResolvedValue({ id: 'aud-1', status: 'IN_PROGRESS' });
      mockUpdate.mockResolvedValue({ id: 'aud-1', status: 'COMPLETED', score: 92 });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/audits/aud-1', 'PATCH', {
        status: 'COMPLETED',
        score: 92,
      });
      const res = await PATCH(req as any, makeParams('aud-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe('COMPLETED');
      expect(body.score).toBe(92);
    });

    it('returns 404 for non-existent audit', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/audits/missing', 'PATCH', {
        notes: 'Updated',
      });
      const res = await PATCH(req as any, makeParams('missing'));

      expect(res.status).toBe(404);
    });

    it('rejects invalid status on update', async () => {
      mockFindFirst.mockResolvedValue({ id: 'aud-1' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/audits/aud-1', 'PATCH', {
        status: 'CANCELLED', // invalid
      });
      const res = await PATCH(req as any, makeParams('aud-1'));

      expect(res.status).toBe(400);
    });
  });

  // ─── DELETE ─────────────────────────────────────────────────────────────

  describe('DELETE /api/v1/qaqc/audits/:id', () => {
    it('deletes an existing audit', async () => {
      mockFindFirst.mockResolvedValue({ id: 'aud-1' });
      mockDelete.mockResolvedValue({ id: 'aud-1' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/audits/aud-1', 'DELETE');
      const res = await DELETE(req as any, makeParams('aud-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('returns 404 when audit not found', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/audits/missing', 'DELETE');
      const res = await DELETE(req as any, makeParams('missing'));

      expect(res.status).toBe(404);
    });

    it('confirms delete calls model with correct id', async () => {
      mockFindFirst.mockResolvedValue({ id: 'aud-1' });
      mockDelete.mockResolvedValue({ id: 'aud-1' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/audits/aud-1', 'DELETE');
      await DELETE(req as any, makeParams('aud-1'));

      expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'aud-1' } });
    });
  });
});
