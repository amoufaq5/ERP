import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

// --- Prisma Mock ---

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

// --- Imports ---

import { createRouteHandlers, createRouteHandlersWithId } from '@/lib/api/route-factory';

// --- Schemas (mirrors src/app/api/v1/qaqc/capa/route.ts) ---

const createSchema = z.object({
  number: z.string().optional(),
  title: z.string().min(1),
  type: z.enum(['CORRECTIVE', 'PREVENTIVE']),
  status: z.enum(['OPEN', 'INVESTIGATION', 'ACTION_PLAN', 'IMPLEMENTATION', 'VERIFICATION', 'CLOSED']).default('OPEN'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  source: z.string().optional(),
  description: z.string().optional(),
  rootCause: z.string().optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(['CORRECTIVE', 'PREVENTIVE']).optional(),
  status: z.enum(['OPEN', 'INVESTIGATION', 'ACTION_PLAN', 'IMPLEMENTATION', 'VERIFICATION', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  source: z.string().optional(),
  description: z.string().optional(),
  rootCause: z.string().optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
  effectivenessCheck: z.string().optional(),
}).partial();

// --- Route Handlers ---

const { GET, POST } = createRouteHandlers({
  entity: 'capa',
  modelName: 'cAPA',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['title', 'number', 'description', 'source'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
  allowedIncludes: ['actions', 'findings'],
});

const { GET: GET_BY_ID, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'capa',
  modelName: 'cAPA',
  validationSchema: { update: updateSchema },
  searchFields: ['title', 'number'],
  allowedIncludes: ['actions', 'findings'],
});

// --- Helpers ---

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

describe('QAQC CAPA API Routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

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
        expect.objectContaining({ skip: 20, take: 10 }),
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
          where: expect.objectContaining({ status: 'OPEN', priority: 'HIGH' }),
        }),
      );
    });

    it('includes allowed relations when requested', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa?include=actions,findings');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ include: { actions: true, findings: true } }),
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
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
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

  describe('GET /api/v1/qaqc/capa/:id', () => {
    it('returns a single CAPA record', async () => {
      const mockRecord = { id: 'capa-1', title: 'CAPA #1', type: 'CORRECTIVE', status: 'OPEN' };
      mockFindFirst.mockResolvedValue(mockRecord);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa/capa-1');
      const res = await GET_BY_ID(req as any, makeParams('capa-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.id).toBe('capa-1');
    });

    it('returns 404 when record not found', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa/nonexistent');
      const res = await GET_BY_ID(req as any, makeParams('nonexistent'));

      expect(res.status).toBe(404);
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

  describe('POST /api/v1/qaqc/capa', () => {
    it('creates a CAPA record with valid data', async () => {
      const created = { id: 'capa-new', ...validCapa, tenantId: 'test-tenant' };
      mockCreate.mockResolvedValue(created);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa', 'POST', validCapa);
      const res = await POST(req as any);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.id).toBe('capa-new');
    });

    it('creates a CAPA with all optional fields', async () => {
      const created = { id: 'capa-full', ...fullCapa, tenantId: 'test-tenant' };
      mockCreate.mockResolvedValue(created);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa', 'POST', fullCapa);
      const res = await POST(req as any);

      expect(res.status).toBe(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: fullCapa.title, tenantId: 'test-tenant' }),
        }),
      );
    });

    it('rejects when required title is missing', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa', 'POST', {
        type: 'CORRECTIVE',
        priority: 'HIGH',
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Validation failed');
    });

    it('rejects when type is invalid', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa', 'POST', {
        title: 'Test CAPA',
        type: 'INVALID_TYPE',
        priority: 'HIGH',
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });

    it('rejects when priority is invalid', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa', 'POST', {
        title: 'Test CAPA',
        type: 'CORRECTIVE',
        priority: 'URGENT',
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });

    it('rejects empty title', async () => {
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

  describe('PATCH /api/v1/qaqc/capa/:id', () => {
    it('updates a CAPA record', async () => {
      mockFindFirst.mockResolvedValue({ id: 'capa-1', title: 'Original', status: 'OPEN' });
      mockUpdate.mockResolvedValue({ id: 'capa-1', status: 'INVESTIGATION' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa/capa-1', 'PATCH', { status: 'INVESTIGATION' });
      const res = await PATCH(req as any, makeParams('capa-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe('INVESTIGATION');
    });

    it('returns 404 when updating non-existent record', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa/nonexistent', 'PATCH', { status: 'CLOSED' });
      const res = await PATCH(req as any, makeParams('nonexistent'));

      expect(res.status).toBe(404);
    });

    it('validates update data against schema', async () => {
      mockFindFirst.mockResolvedValue({ id: 'capa-1' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa/capa-1', 'PATCH', { status: 'INVALID_STATUS' });
      const res = await PATCH(req as any, makeParams('capa-1'));

      expect(res.status).toBe(400);
    });

    it('allows partial updates', async () => {
      mockFindFirst.mockResolvedValue({ id: 'capa-1', title: 'Original' });
      mockUpdate.mockResolvedValue({ id: 'capa-1', title: 'Updated Title' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa/capa-1', 'PATCH', { title: 'Updated Title' });
      const res = await PATCH(req as any, makeParams('capa-1'));

      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'capa-1' }, data: { title: 'Updated Title' } }),
      );
    });

    it('returns 500 on database error', async () => {
      mockFindFirst.mockResolvedValue({ id: 'capa-1' });
      mockUpdate.mockRejectedValue(new Error('DB error'));

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa/capa-1', 'PATCH', { title: 'Updated' });
      const res = await PATCH(req as any, makeParams('capa-1'));

      expect(res.status).toBe(500);
    });
  });

  describe('DELETE /api/v1/qaqc/capa/:id', () => {
    it('deletes an existing CAPA record', async () => {
      mockFindFirst.mockResolvedValue({ id: 'capa-1' });
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

      expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 'capa-1', tenantId: 'pharma-co' } });
    });

    it('returns 500 on database error', async () => {
      mockFindFirst.mockResolvedValue({ id: 'capa-1' });
      mockDelete.mockRejectedValue(new Error('FK constraint'));

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/capa/capa-1', 'DELETE');
      const res = await DELETE(req as any, makeParams('capa-1'));

      expect(res.status).toBe(500);
    });
  });
});
