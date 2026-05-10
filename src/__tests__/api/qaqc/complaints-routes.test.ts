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

import { GET, POST } from '@/app/api/v1/qaqc/complaints/route';
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/v1/qaqc/complaints/[id]/route';

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

const validComplaint = {
  number: 'CMP-2026-001',
  title: 'Product Discoloration Complaint',
  source: 'CUSTOMER' as const,
};

const fullComplaint = {
  ...validComplaint,
  status: 'RECEIVED' as const,
  priority: 'HIGH',
  product: 'Antibiotic Tablets 500mg',
  batchNumber: 'BT-2026-0420',
  description: 'Customer reported yellow discoloration in white tablets',
  investigation: 'Pending lab analysis',
  rootCause: '',
  capaId: '',
  reportedBy: 'Customer Service',
  reportedDate: '2026-05-08',
};

// =============================================================================
// Tests
// =============================================================================

describe('QAQC Complaints API Routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ─── GET Collection ─────────────────────────────────────────────────────

  describe('GET /api/v1/qaqc/complaints', () => {
    it('returns paginated complaint list', async () => {
      const mockData = [
        { id: 'cmp-1', number: 'CMP-001', title: 'Complaint A', source: 'CUSTOMER' },
        { id: 'cmp-2', number: 'CMP-002', title: 'Complaint B', source: 'INTERNAL' },
      ];
      mockFindMany.mockResolvedValue(mockData);
      mockCount.mockResolvedValue(2);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/complaints');
      const res = await GET(req as any);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(2);
      expect(body.total).toBe(2);
    });

    it('searches across title, number, description, product, batchNumber', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/complaints?search=antibiotic');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'antibiotic', mode: 'insensitive' } },
              { number: { contains: 'antibiotic', mode: 'insensitive' } },
              { description: { contains: 'antibiotic', mode: 'insensitive' } },
              { product: { contains: 'antibiotic', mode: 'insensitive' } },
              { batchNumber: { contains: 'antibiotic', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('filters by source type', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/complaints?filter[source]=REGULATORY');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ source: 'REGULATORY' }),
        }),
      );
    });

    it('handles pagination edge case: page beyond total', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(3);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/complaints?page=100&pageSize=25');
      const res = await GET(req as any);
      const body = await res.json();

      expect(body.data).toEqual([]);
      expect(body.totalPages).toBe(1);
    });

    it('returns 500 on error', async () => {
      mockFindMany.mockRejectedValue(new Error('Connection timeout'));
      mockCount.mockRejectedValue(new Error('Connection timeout'));

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/complaints');
      const res = await GET(req as any);

      expect(res.status).toBe(500);
    });
  });

  // ─── GET by ID ──────────────────────────────────────────────────────────

  describe('GET /api/v1/qaqc/complaints/:id', () => {
    it('returns a single complaint', async () => {
      const record = { id: 'cmp-1', number: 'CMP-001', title: 'Complaint A', source: 'CUSTOMER' };
      mockFindFirst.mockResolvedValue(record);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/complaints/cmp-1');
      const res = await GET_BY_ID(req as any, makeParams('cmp-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.number).toBe('CMP-001');
    });

    it('returns 404 for non-existent complaint', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/complaints/missing');
      const res = await GET_BY_ID(req as any, makeParams('missing'));

      expect(res.status).toBe(404);
    });

    it('enforces tenant isolation', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/complaints/cmp-1', 'GET', undefined, {
        'x-tenant-id': 'other-tenant',
      });
      await GET_BY_ID(req as any, makeParams('cmp-1'));

      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cmp-1', tenantId: 'other-tenant' },
        }),
      );
    });
  });

  // ─── POST (Create) ─────────────────────────────────────────────────────

  describe('POST /api/v1/qaqc/complaints', () => {
    it('creates a complaint with valid data', async () => {
      const created = { id: 'cmp-new', ...validComplaint, tenantId: 'test-tenant' };
      mockCreate.mockResolvedValue(created);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/complaints', 'POST', validComplaint);
      const res = await POST(req as any);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.number).toBe('CMP-2026-001');
    });

    it('creates a complaint with all fields', async () => {
      const created = { id: 'cmp-full', ...fullComplaint, tenantId: 'test-tenant' };
      mockCreate.mockResolvedValue(created);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/complaints', 'POST', fullComplaint);
      const res = await POST(req as any);

      expect(res.status).toBe(201);
    });

    it('rejects missing required number', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/complaints', 'POST', {
        title: 'Complaint',
        source: 'CUSTOMER',
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Validation failed');
    });

    it('rejects missing required title', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/complaints', 'POST', {
        number: 'CMP-001',
        source: 'CUSTOMER',
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });

    it('rejects invalid source enum', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/complaints', 'POST', {
        number: 'CMP-001',
        title: 'Complaint',
        source: 'PARTNER', // invalid
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });

    it('rejects completely empty body', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/complaints', 'POST', {});
      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });
  });

  // ─── PATCH (Update) ────────────────────────────────────────────────────

  describe('PATCH /api/v1/qaqc/complaints/:id', () => {
    it('updates complaint status and investigation', async () => {
      mockFindFirst.mockResolvedValue({ id: 'cmp-1', status: 'RECEIVED' });
      mockUpdate.mockResolvedValue({
        id: 'cmp-1',
        status: 'UNDER_INVESTIGATION',
        investigation: 'Lab analysis underway',
      });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/complaints/cmp-1', 'PATCH', {
        status: 'UNDER_INVESTIGATION',
        investigation: 'Lab analysis underway',
      });
      const res = await PATCH(req as any, makeParams('cmp-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe('UNDER_INVESTIGATION');
    });

    it('returns 404 for non-existent complaint', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/complaints/missing', 'PATCH', {
        status: 'CLOSED',
      });
      const res = await PATCH(req as any, makeParams('missing'));

      expect(res.status).toBe(404);
    });

    it('rejects invalid status on update', async () => {
      mockFindFirst.mockResolvedValue({ id: 'cmp-1' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/complaints/cmp-1', 'PATCH', {
        status: 'REJECTED', // invalid
      });
      const res = await PATCH(req as any, makeParams('cmp-1'));

      expect(res.status).toBe(400);
    });

    it('allows setting rootCause and capaId', async () => {
      mockFindFirst.mockResolvedValue({ id: 'cmp-1' });
      mockUpdate.mockResolvedValue({
        id: 'cmp-1',
        rootCause: 'Dye contamination in raw material',
        capaId: 'capa-456',
      });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/complaints/cmp-1', 'PATCH', {
        rootCause: 'Dye contamination in raw material',
        capaId: 'capa-456',
      });
      const res = await PATCH(req as any, makeParams('cmp-1'));

      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rootCause: 'Dye contamination in raw material',
            capaId: 'capa-456',
          }),
        }),
      );
    });
  });

  // ─── DELETE ─────────────────────────────────────────────────────────────

  describe('DELETE /api/v1/qaqc/complaints/:id', () => {
    it('deletes an existing complaint', async () => {
      mockFindFirst.mockResolvedValue({ id: 'cmp-1' });
      mockDelete.mockResolvedValue({ id: 'cmp-1' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/complaints/cmp-1', 'DELETE');
      const res = await DELETE(req as any, makeParams('cmp-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('returns 404 when complaint not found', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/complaints/missing', 'DELETE');
      const res = await DELETE(req as any, makeParams('missing'));

      expect(res.status).toBe(404);
    });

    it('returns 500 on deletion failure', async () => {
      mockFindFirst.mockResolvedValue({ id: 'cmp-1' });
      mockDelete.mockRejectedValue(new Error('FK constraint'));

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/complaints/cmp-1', 'DELETE');
      const res = await DELETE(req as any, makeParams('cmp-1'));

      expect(res.status).toBe(500);
    });
  });
});
