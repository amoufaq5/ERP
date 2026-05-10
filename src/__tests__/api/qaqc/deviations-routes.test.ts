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

import { GET, POST } from '@/app/api/v1/qaqc/deviations/route';
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/v1/qaqc/deviations/[id]/route';

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

const validDeviation = {
  number: 'DEV-2026-001',
  title: 'Temperature Excursion in Cold Storage',
  type: 'UNPLANNED' as const,
  severity: 'MAJOR' as const,
};

const fullDeviation = {
  ...validDeviation,
  status: 'OPEN' as const,
  department: 'Warehouse',
  description: 'Temperature exceeded 8C for 2 hours',
  rootCause: 'HVAC failure',
  impactAssessment: 'Potential product degradation',
  immediateAction: 'Moved product to backup cold room',
  capaId: 'capa-123',
  reportedBy: 'Jane Smith',
  reportedDate: '2026-05-10',
};

// =============================================================================
// Tests
// =============================================================================

describe('QAQC Deviations API Routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ─── GET Collection ─────────────────────────────────────────────────────

  describe('GET /api/v1/qaqc/deviations', () => {
    it('returns paginated list with defaults', async () => {
      const mockData = [
        { id: 'dev-1', number: 'DEV-001', title: 'Deviation 1', severity: 'CRITICAL' },
        { id: 'dev-2', number: 'DEV-002', title: 'Deviation 2', severity: 'MINOR' },
      ];
      mockFindMany.mockResolvedValue(mockData);
      mockCount.mockResolvedValue(2);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/deviations');
      const res = await GET(req as any);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(2);
      expect(body.total).toBe(2);
      expect(body.page).toBe(1);
    });

    it('applies search filter across title, number, description, department', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/deviations?search=temperature');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'temperature', mode: 'insensitive' } },
              { number: { contains: 'temperature', mode: 'insensitive' } },
              { description: { contains: 'temperature', mode: 'insensitive' } },
              { department: { contains: 'temperature', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('supports filter[severity] parameter', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/deviations?filter[severity]=CRITICAL');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ severity: 'CRITICAL' }),
        }),
      );
    });

    it('paginates correctly with custom page and pageSize', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(50);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/deviations?page=5&pageSize=5');
      const res = await GET(req as any);
      const body = await res.json();

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 5 }),
      );
      expect(body.totalPages).toBe(10);
    });
  });

  // ─── GET by ID ──────────────────────────────────────────────────────────

  describe('GET /api/v1/qaqc/deviations/:id', () => {
    it('returns a single deviation', async () => {
      const record = { id: 'dev-1', number: 'DEV-001', title: 'Deviation 1', severity: 'CRITICAL' };
      mockFindFirst.mockResolvedValue(record);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/deviations/dev-1');
      const res = await GET_BY_ID(req as any, makeParams('dev-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.number).toBe('DEV-001');
    });

    it('returns 404 for non-existent deviation', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/deviations/missing');
      const res = await GET_BY_ID(req as any, makeParams('missing'));

      expect(res.status).toBe(404);
    });

    it('scopes by tenant ID', async () => {
      mockFindFirst.mockResolvedValue({ id: 'dev-1' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/deviations/dev-1', 'GET', undefined, {
        'x-tenant-id': 'acme-pharma',
      });
      await GET_BY_ID(req as any, makeParams('dev-1'));

      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dev-1', tenantId: 'acme-pharma' },
        }),
      );
    });
  });

  // ─── POST (Create) ─────────────────────────────────────────────────────

  describe('POST /api/v1/qaqc/deviations', () => {
    it('creates a deviation with valid required fields', async () => {
      const created = { id: 'dev-new', ...validDeviation, tenantId: 'test-tenant' };
      mockCreate.mockResolvedValue(created);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/deviations', 'POST', validDeviation);
      const res = await POST(req as any);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.number).toBe('DEV-2026-001');
    });

    it('creates a deviation with all fields', async () => {
      const created = { id: 'dev-full', ...fullDeviation, tenantId: 'test-tenant' };
      mockCreate.mockResolvedValue(created);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/deviations', 'POST', fullDeviation);
      const res = await POST(req as any);

      expect(res.status).toBe(201);
    });

    it('rejects when required fields are missing (no number or title)', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/deviations', 'POST', {
        type: 'PLANNED',
        severity: 'MINOR',
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Validation failed');
    });

    it('rejects invalid type enum value', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/deviations', 'POST', {
        number: 'DEV-001',
        title: 'Test',
        type: 'SCHEDULED', // invalid
        severity: 'MINOR',
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });

    it('rejects invalid severity enum value', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/deviations', 'POST', {
        number: 'DEV-001',
        title: 'Test',
        type: 'PLANNED',
        severity: 'EXTREME', // invalid
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });

    it('returns 500 on database error', async () => {
      mockCreate.mockRejectedValue(new Error('DB error'));

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/deviations', 'POST', validDeviation);
      const res = await POST(req as any);

      expect(res.status).toBe(500);
    });
  });

  // ─── PATCH (Update) ────────────────────────────────────────────────────

  describe('PATCH /api/v1/qaqc/deviations/:id', () => {
    it('updates deviation status', async () => {
      mockFindFirst.mockResolvedValue({ id: 'dev-1', status: 'OPEN' });
      mockUpdate.mockResolvedValue({ id: 'dev-1', status: 'UNDER_INVESTIGATION' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/deviations/dev-1', 'PATCH', {
        status: 'UNDER_INVESTIGATION',
      });
      const res = await PATCH(req as any, makeParams('dev-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe('UNDER_INVESTIGATION');
    });

    it('returns 404 for non-existent record', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/deviations/missing', 'PATCH', {
        status: 'CLOSED',
      });
      const res = await PATCH(req as any, makeParams('missing'));

      expect(res.status).toBe(404);
    });

    it('rejects invalid status on update', async () => {
      mockFindFirst.mockResolvedValue({ id: 'dev-1' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/deviations/dev-1', 'PATCH', {
        status: 'INVALID',
      });
      const res = await PATCH(req as any, makeParams('dev-1'));

      expect(res.status).toBe(400);
    });

    it('allows adding rootCause and closedDate during update', async () => {
      mockFindFirst.mockResolvedValue({ id: 'dev-1', status: 'UNDER_INVESTIGATION' });
      mockUpdate.mockResolvedValue({ id: 'dev-1', rootCause: 'Equipment malfunction', closedDate: '2026-05-15' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/deviations/dev-1', 'PATCH', {
        rootCause: 'Equipment malfunction',
        closedDate: '2026-05-15',
      });
      const res = await PATCH(req as any, makeParams('dev-1'));

      expect(res.status).toBe(200);
    });
  });

  // ─── DELETE ─────────────────────────────────────────────────────────────

  describe('DELETE /api/v1/qaqc/deviations/:id', () => {
    it('deletes an existing deviation', async () => {
      mockFindFirst.mockResolvedValue({ id: 'dev-1' });
      mockDelete.mockResolvedValue({ id: 'dev-1' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/deviations/dev-1', 'DELETE');
      const res = await DELETE(req as any, makeParams('dev-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('returns 404 when record does not exist', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/deviations/missing', 'DELETE');
      const res = await DELETE(req as any, makeParams('missing'));

      expect(res.status).toBe(404);
    });

    it('returns 500 on delete error', async () => {
      mockFindFirst.mockResolvedValue({ id: 'dev-1' });
      mockDelete.mockRejectedValue(new Error('Constraint violation'));

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/deviations/dev-1', 'DELETE');
      const res = await DELETE(req as any, makeParams('dev-1'));

      expect(res.status).toBe(500);
    });
  });
});
