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

import { GET, POST } from '@/app/api/v1/qaqc/training/route';
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/v1/qaqc/training/[id]/route';

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

const validTraining = {
  employeeId: 'EMP-001',
  employeeName: 'Alice Johnson',
  trainingType: 'GMP',
  title: 'Annual GMP Refresher Training',
};

const fullTraining = {
  ...validTraining,
  status: 'ASSIGNED' as const,
  assignedDate: '2026-05-01',
  dueDate: '2026-06-01',
  completedDate: '',
  score: undefined as number | undefined,
  trainer: 'Dr. Robert Brown',
  certificate: '',
  expiryDate: '2027-06-01',
};

// =============================================================================
// Tests
// =============================================================================

describe('QAQC Training API Routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ─── GET Collection ─────────────────────────────────────────────────────

  describe('GET /api/v1/qaqc/training', () => {
    it('returns paginated training records', async () => {
      const mockData = [
        { id: 'tr-1', employeeName: 'Alice', title: 'GMP Training', status: 'COMPLETED' },
        { id: 'tr-2', employeeName: 'Bob', title: 'Safety Training', status: 'ASSIGNED' },
        { id: 'tr-3', employeeName: 'Carol', title: 'Lab Techniques', status: 'IN_PROGRESS' },
      ];
      mockFindMany.mockResolvedValue(mockData);
      mockCount.mockResolvedValue(3);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/training');
      const res = await GET(req as any);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(3);
      expect(body.total).toBe(3);
      expect(body.page).toBe(1);
      expect(body.totalPages).toBe(1);
    });

    it('searches across employeeName, title, trainingType, trainer', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/training?search=Alice');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { employeeName: { contains: 'Alice', mode: 'insensitive' } },
              { title: { contains: 'Alice', mode: 'insensitive' } },
              { trainingType: { contains: 'Alice', mode: 'insensitive' } },
              { trainer: { contains: 'Alice', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('filters by status', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/training?filter[status]=OVERDUE');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'OVERDUE' }),
        }),
      );
    });

    it('handles pagination with custom pageSize', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(75);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/training?page=2&pageSize=15');
      const res = await GET(req as any);
      const body = await res.json();

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 15, take: 15 }),
      );
      expect(body.totalPages).toBe(5);
    });

    it('uses default sort by createdAt desc', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/training');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('supports custom sort field', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/training?sort=dueDate&direction=asc');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { dueDate: 'asc' },
        }),
      );
    });
  });

  // ─── GET by ID ──────────────────────────────────────────────────────────

  describe('GET /api/v1/qaqc/training/:id', () => {
    it('returns a single training record', async () => {
      const record = {
        id: 'tr-1',
        employeeName: 'Alice Johnson',
        title: 'GMP Training',
        status: 'COMPLETED',
        score: 95,
      };
      mockFindFirst.mockResolvedValue(record);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/training/tr-1');
      const res = await GET_BY_ID(req as any, makeParams('tr-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.employeeName).toBe('Alice Johnson');
      expect(body.score).toBe(95);
    });

    it('returns 404 for non-existent training', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/training/missing');
      const res = await GET_BY_ID(req as any, makeParams('missing'));

      expect(res.status).toBe(404);
    });

    it('scopes query by tenant ID', async () => {
      mockFindFirst.mockResolvedValue({ id: 'tr-1' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/training/tr-1', 'GET', undefined, {
        'x-tenant-id': 'pharma-co',
      });
      await GET_BY_ID(req as any, makeParams('tr-1'));

      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tr-1', tenantId: 'pharma-co' },
        }),
      );
    });
  });

  // ─── POST (Create) ─────────────────────────────────────────────────────

  describe('POST /api/v1/qaqc/training', () => {
    it('creates a training record with valid data', async () => {
      const created = { id: 'tr-new', ...validTraining, tenantId: 'test-tenant' };
      mockCreate.mockResolvedValue(created);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/training', 'POST', validTraining);
      const res = await POST(req as any);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.employeeName).toBe('Alice Johnson');
      expect(body.trainingType).toBe('GMP');
    });

    it('creates a training record with all fields', async () => {
      const fullWithScore = { ...fullTraining, score: 90 };
      const created = { id: 'tr-full', ...fullWithScore, tenantId: 'test-tenant' };
      mockCreate.mockResolvedValue(created);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/training', 'POST', fullWithScore);
      const res = await POST(req as any);

      expect(res.status).toBe(201);
    });

    it('rejects missing required employeeId', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/training', 'POST', {
        employeeName: 'Alice',
        trainingType: 'GMP',
        title: 'Training',
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Validation failed');
    });

    it('rejects missing required employeeName', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/training', 'POST', {
        employeeId: 'EMP-001',
        trainingType: 'GMP',
        title: 'Training',
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });

    it('rejects missing required trainingType', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/training', 'POST', {
        employeeId: 'EMP-001',
        employeeName: 'Alice',
        title: 'Training',
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });

    it('rejects missing required title', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/training', 'POST', {
        employeeId: 'EMP-001',
        employeeName: 'Alice',
        trainingType: 'GMP',
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });

    it('rejects non-numeric score', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/training', 'POST', {
        ...validTraining,
        score: 'pass', // should be number
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });

    it('rejects invalid status enum', async () => {
      const req = makeRequest('http://localhost:3000/api/v1/qaqc/training', 'POST', {
        ...validTraining,
        status: 'CANCELLED', // invalid
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
    });

    it('defaults status to ASSIGNED', async () => {
      mockCreate.mockResolvedValue({ id: 'tr-new' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/training', 'POST', validTraining);
      await POST(req as any);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ASSIGNED' }),
        }),
      );
    });
  });

  // ─── PATCH (Update) ────────────────────────────────────────────────────

  describe('PATCH /api/v1/qaqc/training/:id', () => {
    it('updates training status to COMPLETED', async () => {
      mockFindFirst.mockResolvedValue({ id: 'tr-1', status: 'IN_PROGRESS' });
      mockUpdate.mockResolvedValue({ id: 'tr-1', status: 'COMPLETED', completedDate: '2026-05-10', score: 92 });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/training/tr-1', 'PATCH', {
        status: 'COMPLETED',
        completedDate: '2026-05-10',
        score: 92,
      });
      const res = await PATCH(req as any, makeParams('tr-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe('COMPLETED');
      expect(body.score).toBe(92);
    });

    it('updates certificate and expiry date', async () => {
      mockFindFirst.mockResolvedValue({ id: 'tr-1' });
      mockUpdate.mockResolvedValue({
        id: 'tr-1',
        certificate: 'CERT-2026-GMP-001',
        expiryDate: '2027-05-10',
      });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/training/tr-1', 'PATCH', {
        certificate: 'CERT-2026-GMP-001',
        expiryDate: '2027-05-10',
      });
      const res = await PATCH(req as any, makeParams('tr-1'));

      expect(res.status).toBe(200);
    });

    it('returns 404 for non-existent training record', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/training/missing', 'PATCH', {
        status: 'COMPLETED',
      });
      const res = await PATCH(req as any, makeParams('missing'));

      expect(res.status).toBe(404);
    });

    it('rejects invalid status on update', async () => {
      mockFindFirst.mockResolvedValue({ id: 'tr-1' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/training/tr-1', 'PATCH', {
        status: 'REVOKED', // invalid
      });
      const res = await PATCH(req as any, makeParams('tr-1'));

      expect(res.status).toBe(400);
    });

    it('allows partial update with just score', async () => {
      mockFindFirst.mockResolvedValue({ id: 'tr-1' });
      mockUpdate.mockResolvedValue({ id: 'tr-1', score: 88 });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/training/tr-1', 'PATCH', {
        score: 88,
      });
      const res = await PATCH(req as any, makeParams('tr-1'));

      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tr-1' },
          data: { score: 88 },
        }),
      );
    });
  });

  // ─── DELETE ─────────────────────────────────────────────────────────────

  describe('DELETE /api/v1/qaqc/training/:id', () => {
    it('deletes an existing training record', async () => {
      mockFindFirst.mockResolvedValue({ id: 'tr-1' });
      mockDelete.mockResolvedValue({ id: 'tr-1' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/training/tr-1', 'DELETE');
      const res = await DELETE(req as any, makeParams('tr-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('returns 404 when training record not found', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/training/missing', 'DELETE');
      const res = await DELETE(req as any, makeParams('missing'));

      expect(res.status).toBe(404);
    });

    it('returns 500 on deletion failure', async () => {
      mockFindFirst.mockResolvedValue({ id: 'tr-1' });
      mockDelete.mockRejectedValue(new Error('Deletion failed'));

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/training/tr-1', 'DELETE');
      const res = await DELETE(req as any, makeParams('tr-1'));

      expect(res.status).toBe(500);
    });

    it('verifies tenant ownership before deleting', async () => {
      mockFindFirst.mockResolvedValue({ id: 'tr-1' });
      mockDelete.mockResolvedValue({ id: 'tr-1' });

      const req = makeRequest('http://localhost:3000/api/v1/qaqc/training/tr-1', 'DELETE', undefined, {
        'x-tenant-id': 'pharma-co',
      });
      await DELETE(req as any, makeParams('tr-1'));

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: 'tr-1', tenantId: 'pharma-co' },
      });
    });
  });
});
