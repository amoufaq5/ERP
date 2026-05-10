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

import { GET, POST } from '@/app/api/v1/qaqc/capa/route';
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/v1/qaqc/capa/[id]/route';

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

// ─── Valid CAPA data ────────────────────────────────────────────────────────

const validCapa = {
  title: 'Corrective Action for Batch Contamination',
  type: 'CORRECTIVE' as const,
  priority: 'HIGH' as const,
};

const fullCapa = {
  ...validCapa,
  status: 'OPEN' as const,
  source: 'Internal Audit',
  description: 'Contamination found during routine testing',
  rootCause: 'Inadequate cleaning procedure',
  assignedTo: 'John Doe',
  dueDate: '2026-06-15',
};

// =============================================================================
// Tests
// =============================================================================

describe('QAQC CAPA API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── GET Collection ─────────────────────────────────────────────────────

  describe('GET /api/v1/qaqc/capa', () => {
    it('returns paginated list with default parameters', async () => {
      const mockData = [
        { id: 'capa-1', title: 'CAPA #1', type: 'CORRECTIVE', status: 'OPEN' },
        { id: 'capa-2', title: 'CAPA #2', type: 'PREVENTIVE', status: 'CLOSED' },
      ];
      mockFindMany.mockResolvedValue(mockData);
      mockCount.mockResolvedValue(2);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa');
      const res = await GET(req as any);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toEqual(mockData);
      expect(body.total).toBe(2);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(25);
      expect(body.totalPages).toBe(1);
    });

    it('respects page and pageSize query params', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(100);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa?page=3&pageSize=10');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });

    it('caps pageSize at 100', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa?pageSize=999');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('filters by search term across searchFields', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa?search=contamination');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'contamination', mode: 'insensitive' } },
              { number: { contains: 'contamination', mode: 'insensitive' } },
              { description: { contains: 'contamination', mode: 'insensitive' } },
              { source: { contains: 'contamination', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('applies filter[] parameters', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa?filter[status]=OPEN&filter[priority]=HIGH');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'OPEN',
            priority: 'HIGH',
          }),
        }),
      );
    });

    it('includes allowed relations when requested', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa?include=actions,findings');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { actions: true, findings: true },
        }),
      );
    });

    it('ignores disallowed include relations', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa?include=secretRelation');
      await GET(req as any);

      const call = mockFindMany.mock.calls[0][0];
      expect(call.include).toBeUndefined();
    });

    it('sorts by createdAt desc by default', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('passes tenant ID in the where clause', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa', 'GET', undefined, {
        'x-tenant-id': 'pharma-co',
      });
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'pharma-co' }),
        }),
      );
    });

    it('returns 500 on database error', async () => {
      mockFindMany.mockRejectedValue(new Error('Connection lost'));
      mockCount.mockRejectedValue(new Error('Connection lost'));

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa');
      const res = await GET(req as any);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe('Internal server error');
    });
  });

  // ─── GET by ID ──────────────────────────────────────────────────────────

  describe('GET /api/v1/qaqc/capa/:id', () => {
    it('returns a single CAPA record', async () => {
      const mockRecord = { id: 'capa-1', title: 'CAPA #1', type: 'CORRECTIVE', status: 'OPEN' };
      mockFindFirst.mockResolvedValue(mockRecord);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa/capa-1');
      const res = await GET_BY_ID(req as any, makeParams('capa-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.id).toBe('capa-1');
      expect(body.title).toBe('CAPA #1');
    });

    it('returns 404 when record not found', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa/nonexistent');
      const res = await GET_BY_ID(req as any, makeParams('nonexistent'));

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('Not found');
    });

    it('passes tenant ID and includes allowed relations', async () => {
      mockFindFirst.mockResolvedValue({ id: 'capa-1' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa/capa-1?include=actions', 'GET', undefined, {
        'x-tenant-id': 'pharma-co',
      });
      await GET_BY_ID(req as any, makeParams('capa-1'));

      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'capa-1', tenantId: 'pharma-co' },
          include: { actions: true },
        }),
      );
    });

    it('returns 500 on database error', async () => {
      mockFindFirst.mockRejectedValue(new Error('DB error'));

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa/capa-1');
      const res = await GET_BY_ID(req as any, makeParams('capa-1'));

      expect(res.status).toBe(500);
    });
  });

  // ─── POST (Create) ─────────────────────────────────────────────────────

  describe('POST /api/v1/qaqc/capa', () => {
    it('creates a CAPA record with valid data', async () => {
      const created = { id: 'capa-new', ...validCapa, tenantId: 'test-tenant' };
      mockCreate.mockResolvedValue(created);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa', 'POST', validCapa);
      const res = await POST(req as any);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.id).toBe('capa-new');
      expect(body.title).toBe(validCapa.title);
    });

    it('creates a CAPA with all optional fields', async () => {
      const created = { id: 'capa-full', ...fullCapa, tenantId: 'test-tenant' };
      mockCreate.mockResolvedValue(created);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa', 'POST', fullCapa);
      const res = await POST(req as any);

      expect(res.status).toBe(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: fullCapa.title,
            rootCause: fullCapa.rootCause,
            tenantId: 'test-tenant',
          }),
        }),
      );
    });

    it('rejects when required title is missing', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa', 'POST', {
        type: 'CORRECTIVE',
        priority: 'HIGH',
        // title is missing
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Validation failed');
      expect(body.details).toBeDefined();
    });

    it('rejects when type is invalid', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa', 'POST', {
        title: 'Test CAPA',
        type: 'INVALID_TYPE',
        priority: 'HIGH',
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Validation failed');
    });

    it('rejects when priority is invalid', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa', 'POST', {
        title: 'Test CAPA',
        type: 'CORRECTIVE',
        priority: 'URGENT', // not a valid enum value
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });

    it('rejects empty title (min length 1)', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa', 'POST', {
        title: '',
        type: 'CORRECTIVE',
        priority: 'HIGH',
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });

    it('attaches tenant ID from headers', async () => {
      mockCreate.mockResolvedValue({ id: '1' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa', 'POST', validCapa, {
        'x-tenant-id': 'pharma-co',
      });
      await POST(req as any);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: 'pharma-co' }),
        }),
      );
    });

    it('returns 500 on database error during create', async () => {
      mockCreate.mockRejectedValue(new Error('Unique constraint violation'));

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa', 'POST', validCapa);
      const res = await POST(req as any);

      expect(res.status).toBe(500);
    });
  });

  // ─── PATCH (Update) ────────────────────────────────────────────────────

  describe('PATCH /api/v1/qaqc/capa/:id', () => {
    it('updates a CAPA record', async () => {
      const existing = { id: 'capa-1', title: 'Original', status: 'OPEN' };
      mockFindFirst.mockResolvedValue(existing);
      mockUpdate.mockResolvedValue({ ...existing, status: 'INVESTIGATION' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa/capa-1', 'PATCH', {
        status: 'INVESTIGATION',
      });
      const res = await PATCH(req as any, makeParams('capa-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe('INVESTIGATION');
    });

    it('returns 404 when updating non-existent record', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa/nonexistent', 'PATCH', {
        status: 'CLOSED',
      });
      const res = await PATCH(req as any, makeParams('nonexistent'));

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('Not found');
    });

    it('validates update data against schema', async () => {
      const existing = { id: 'capa-1', title: 'CAPA', status: 'OPEN' };
      mockFindFirst.mockResolvedValue(existing);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa/capa-1', 'PATCH', {
        status: 'INVALID_STATUS',
      });
      const res = await PATCH(req as any, makeParams('capa-1'));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Validation failed');
    });

    it('allows partial updates (only send changed fields)', async () => {
      const existing = { id: 'capa-1', title: 'Original', status: 'OPEN', priority: 'HIGH' };
      mockFindFirst.mockResolvedValue(existing);
      mockUpdate.mockResolvedValue({ ...existing, title: 'Updated Title' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa/capa-1', 'PATCH', {
        title: 'Updated Title',
      });
      const res = await PATCH(req as any, makeParams('capa-1'));

      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'capa-1' },
          data: { title: 'Updated Title' },
        }),
      );
    });

    it('returns 500 on database error', async () => {
      mockFindFirst.mockResolvedValue({ id: 'capa-1' });
      mockUpdate.mockRejectedValue(new Error('DB error'));

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa/capa-1', 'PATCH', {
        title: 'Updated',
      });
      const res = await PATCH(req as any, makeParams('capa-1'));

      expect(res.status).toBe(500);
    });
  });

  // ─── DELETE ─────────────────────────────────────────────────────────────

  describe('DELETE /api/v1/qaqc/capa/:id', () => {
    it('deletes an existing CAPA record', async () => {
      mockFindFirst.mockResolvedValue({ id: 'capa-1', title: 'To Delete' });
      mockDelete.mockResolvedValue({ id: 'capa-1' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa/capa-1', 'DELETE');
      const res = await DELETE(req as any, makeParams('capa-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('returns 404 when deleting non-existent record', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa/nonexistent', 'DELETE');
      const res = await DELETE(req as any, makeParams('nonexistent'));

      expect(res.status).toBe(404);
    });

    it('verifies tenant ownership before deleting', async () => {
      mockFindFirst.mockResolvedValue({ id: 'capa-1' });
      mockDelete.mockResolvedValue({ id: 'capa-1' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa/capa-1', 'DELETE', undefined, {
        'x-tenant-id': 'pharma-co',
      });
      await DELETE(req as any, makeParams('capa-1'));

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: 'capa-1', tenantId: 'pharma-co' },
      });
    });

    it('returns 500 on database error', async () => {
      mockFindFirst.mockResolvedValue({ id: 'capa-1' });
      mockDelete.mockRejectedValue(new Error('Foreign key constraint'));

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa/capa-1', 'DELETE');
      const res = await DELETE(req as any, makeParams('capa-1'));

      expect(res.status).toBe(500);
    });
  });
});
