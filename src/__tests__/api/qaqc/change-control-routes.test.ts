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

import { GET, POST } from '@/app/api/v1/qaqc/change-control/route';
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/v1/qaqc/change-control/[id]/route';

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

const validChange = {
  number: 'CC-2026-001',
  title: 'Process Temperature Parameter Update',
  type: 'PROCESS' as const,
};

const fullChange = {
  ...validChange,
  description: 'Increase drying temperature from 60C to 65C',
  status: 'INITIATED' as const,
  priority: 'MEDIUM',
  requestedBy: 'Production Manager',
  approvedBy: '',
  impactAssessment: 'Minimal impact on product quality based on lab studies',
  implementationPlan: 'Phase 1: Lab validation. Phase 2: Line trial. Phase 3: Full implementation.',
  effectiveDate: '2026-07-01',
};

// =============================================================================
// Tests
// =============================================================================

describe('QAQC Change Control API Routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ─── GET Collection ─────────────────────────────────────────────────────

  describe('GET /api/v1/qaqc/change-control', () => {
    it('returns paginated change control list', async () => {
      const mockData = [
        { id: 'cc-1', number: 'CC-001', title: 'Process Change', type: 'PROCESS', status: 'INITIATED' },
        { id: 'cc-2', number: 'CC-002', title: 'Equipment Upgrade', type: 'EQUIPMENT', status: 'APPROVED' },
      ];
      mockFindMany.mockResolvedValue(mockData);
      mockCount.mockResolvedValue(2);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/change-control');
      const res = await GET(req as any);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(2);
      expect(body.total).toBe(2);
      expect(body.page).toBe(1);
    });

    it('searches across number, title, description, requestedBy', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/change-control?search=temperature');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { number: { contains: 'temperature', mode: 'insensitive' } },
              { title: { contains: 'temperature', mode: 'insensitive' } },
              { description: { contains: 'temperature', mode: 'insensitive' } },
              { requestedBy: { contains: 'temperature', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('filters by type', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/change-control?filter[type]=EQUIPMENT');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'EQUIPMENT' }),
        }),
      );
    });

    it('filters by status', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/change-control?filter[status]=APPROVED');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'APPROVED' }),
        }),
      );
    });

    it('paginates large result sets', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(250);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/change-control?page=2&pageSize=50');
      const res = await GET(req as any);
      const body = await res.json();

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 50, take: 50 }),
      );
      expect(body.totalPages).toBe(5);
    });

    it('clamps page to minimum 1', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/change-control?page=0');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 }),
      );
    });
  });

  // ─── GET by ID ──────────────────────────────────────────────────────────

  describe('GET /api/v1/qaqc/change-control/:id', () => {
    it('returns a single change control record', async () => {
      const record = { id: 'cc-1', number: 'CC-001', title: 'Process Change', type: 'PROCESS' };
      mockFindFirst.mockResolvedValue(record);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/change-control/cc-1');
      const res = await GET_BY_ID(req as any, makeParams('cc-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.number).toBe('CC-001');
      expect(body.type).toBe('PROCESS');
    });

    it('returns 404 for non-existent record', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/change-control/missing');
      const res = await GET_BY_ID(req as any, makeParams('missing'));

      expect(res.status).toBe(404);
    });

    it('uses tenant ID from request headers', async () => {
      mockFindFirst.mockResolvedValue({ id: 'cc-1' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/change-control/cc-1', 'GET', undefined, {
        'x-tenant-id': 'pharma-co',
      });
      await GET_BY_ID(req as any, makeParams('cc-1'));

      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cc-1', tenantId: 'pharma-co' },
        }),
      );
    });

    it('returns 500 on unexpected error', async () => {
      mockFindFirst.mockRejectedValue(new Error('Connection reset'));

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/change-control/cc-1');
      const res = await GET_BY_ID(req as any, makeParams('cc-1'));

      expect(res.status).toBe(500);
    });
  });

  // ─── POST (Create) ─────────────────────────────────────────────────────

  describe('POST /api/v1/qaqc/change-control', () => {
    it('creates a change control with valid data', async () => {
      const created = { id: 'cc-new', ...validChange, tenantId: 'test-tenant' };
      mockCreate.mockResolvedValue(created);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/change-control', 'POST', validChange);
      const res = await POST(req as any);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.number).toBe('CC-2026-001');
    });

    it('creates a change control with all fields', async () => {
      const created = { id: 'cc-full', ...fullChange, tenantId: 'test-tenant' };
      mockCreate.mockResolvedValue(created);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/change-control', 'POST', fullChange);
      const res = await POST(req as any);

      expect(res.status).toBe(201);
    });

    it('rejects missing required number', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/change-control', 'POST', {
        title: 'Change',
        type: 'PROCESS',
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Validation failed');
    });

    it('rejects missing required title', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/change-control', 'POST', {
        number: 'CC-001',
        type: 'PROCESS',
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });

    it('rejects invalid type enum', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/change-control', 'POST', {
        number: 'CC-001',
        title: 'Change',
        type: 'SOFTWARE', // invalid
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });

    it('accepts all valid type values', async () => {
      const types = ['DOCUMENT', 'PROCESS', 'EQUIPMENT', 'SYSTEM'];

      for (const type of types) {
        vi.resetAllMocks();
        mockCreate.mockResolvedValue({ id: `cc-${type}` });

        const req = makeRequest('http://localhost:3000/api/v1/qaqc/change-control', 'POST', {
          number: 'CC-001',
          title: 'Change',
          type,
        });
        const res = await POST(req as any);

        expect(res.status).toBe(201);
      }
    });

    it('defaults status to INITIATED', async () => {
      mockCreate.mockResolvedValue({ id: 'cc-new' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/change-control', 'POST', validChange);
      await POST(req as any);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'INITIATED' }),
        }),
      );
    });

    it('sets tenant ID on created record', async () => {
      mockCreate.mockResolvedValue({ id: 'cc-new' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/change-control', 'POST', validChange, {
        'x-tenant-id': 'biotech-inc',
      });
      await POST(req as any);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: 'biotech-inc' }),
        }),
      );
    });
  });

  // ─── PATCH (Update) ────────────────────────────────────────────────────

  describe('PATCH /api/v1/qaqc/change-control/:id', () => {
    it('updates change control status', async () => {
      mockFindFirst.mockResolvedValue({ id: 'cc-1', status: 'INITIATED' });
      mockUpdate.mockResolvedValue({ id: 'cc-1', status: 'UNDER_REVIEW' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/change-control/cc-1', 'PATCH', {
        status: 'UNDER_REVIEW',
      });
      const res = await PATCH(req as any, makeParams('cc-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe('UNDER_REVIEW');
    });

    it('updates approver and implementation plan', async () => {
      mockFindFirst.mockResolvedValue({ id: 'cc-1' });
      mockUpdate.mockResolvedValue({
        id: 'cc-1',
        approvedBy: 'VP Quality',
        implementationPlan: 'Updated plan',
      });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/change-control/cc-1', 'PATCH', {
        approvedBy: 'VP Quality',
        implementationPlan: 'Updated plan',
      });
      const res = await PATCH(req as any, makeParams('cc-1'));

      expect(res.status).toBe(200);
    });

    it('returns 404 for non-existent record', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/change-control/missing', 'PATCH', {
        status: 'APPROVED',
      });
      const res = await PATCH(req as any, makeParams('missing'));

      expect(res.status).toBe(404);
    });

    it('rejects invalid status on update', async () => {
      mockFindFirst.mockResolvedValue({ id: 'cc-1' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/change-control/cc-1', 'PATCH', {
        status: 'CANCELLED', // invalid
      });
      const res = await PATCH(req as any, makeParams('cc-1'));

      expect(res.status).toBe(400);
    });

    it('rejects invalid type on update', async () => {
      mockFindFirst.mockResolvedValue({ id: 'cc-1' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/change-control/cc-1', 'PATCH', {
        type: 'SOFTWARE', // invalid
      });
      const res = await PATCH(req as any, makeParams('cc-1'));

      expect(res.status).toBe(400);
    });
  });

  // ─── DELETE ─────────────────────────────────────────────────────────────

  describe('DELETE /api/v1/qaqc/change-control/:id', () => {
    it('deletes an existing change control record', async () => {
      mockFindFirst.mockResolvedValue({ id: 'cc-1' });
      mockDelete.mockResolvedValue({ id: 'cc-1' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/change-control/cc-1', 'DELETE');
      const res = await DELETE(req as any, makeParams('cc-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('returns 404 when record not found', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/change-control/missing', 'DELETE');
      const res = await DELETE(req as any, makeParams('missing'));

      expect(res.status).toBe(404);
    });

    it('returns 500 on database error', async () => {
      mockFindFirst.mockResolvedValue({ id: 'cc-1' });
      mockDelete.mockRejectedValue(new Error('Cascade constraint'));

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/change-control/cc-1', 'DELETE');
      const res = await DELETE(req as any, makeParams('cc-1'));

      expect(res.status).toBe(500);
    });

    it('checks tenant ownership before deleting', async () => {
      mockFindFirst.mockResolvedValue({ id: 'cc-1' });
      mockDelete.mockResolvedValue({ id: 'cc-1' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/change-control/cc-1', 'DELETE', undefined, {
        'x-tenant-id': 'biotech-inc',
      });
      await DELETE(req as any, makeParams('cc-1'));

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: 'cc-1', tenantId: 'biotech-inc' },
      });
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'cc-1' } });
    });
  });
});
