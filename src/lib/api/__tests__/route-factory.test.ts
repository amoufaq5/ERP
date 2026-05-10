import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

// Mock Prisma before importing the module
const mockFindMany = vi.fn();
const mockFindFirst = vi.fn();
const mockCount = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/prisma', () => {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop: string) {
      if (prop === 'then') return undefined; // prevent Promise-like behavior
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
  return {
    default: new Proxy({}, handler),
  };
});

import { createRouteHandlers } from '../route-factory';

// Helper to create a NextRequest-like object
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

describe('Route Factory - createRouteHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseConfig = {
    entity: 'products',
    modelName: 'product',
    searchFields: ['name', 'sku'],
    defaultPageSize: 10,
    defaultSort: { field: 'createdAt', direction: 'desc' as const },
    allowedIncludes: ['category', 'variants'],
  };

  // ===========================================================================
  // GET - Paginated Results
  // ===========================================================================

  describe('GET - paginated results', () => {
    it('returns paginated data with defaults', async () => {
      const mockData = [
        { id: '1', name: 'Product A' },
        { id: '2', name: 'Product B' },
      ];
      mockFindMany.mockResolvedValue(mockData);
      mockCount.mockResolvedValue(2);

      const { GET } = createRouteHandlers(baseConfig);
      const req = makeRequest('http://localhost:3000/api/products');
      const res = await GET(req as any);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toEqual(mockData);
      expect(body.total).toBe(2);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(10);
      expect(body.totalPages).toBe(1);
    });

    it('respects page and pageSize parameters', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(50);

      const { GET } = createRouteHandlers(baseConfig);
      const req = makeRequest('http://localhost:3000/api/products?page=3&pageSize=5');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (3-1) * 5
          take: 5,
        }),
      );
    });

    it('caps pageSize at 100', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const { GET } = createRouteHandlers(baseConfig);
      const req = makeRequest('http://localhost:3000/api/products?pageSize=500');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });
  });

  // ===========================================================================
  // GET - Search Filtering
  // ===========================================================================

  describe('GET - search filtering', () => {
    it('applies search filter across configured fields', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const { GET } = createRouteHandlers(baseConfig);
      const req = makeRequest('http://localhost:3000/api/products?search=widget');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'widget', mode: 'insensitive' } },
              { sku: { contains: 'widget', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('applies filter[] parameters', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const { GET } = createRouteHandlers(baseConfig);
      const req = makeRequest('http://localhost:3000/api/products?filter[status]=ACTIVE');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        }),
      );
    });
  });

  // ===========================================================================
  // GET - Include Parameter
  // ===========================================================================

  describe('GET - include parameter', () => {
    it('includes allowed relations', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const { GET } = createRouteHandlers(baseConfig);
      const req = makeRequest('http://localhost:3000/api/products?include=category,variants');
      await GET(req as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { category: true, variants: true },
        }),
      );
    });

    it('ignores disallowed includes', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const { GET } = createRouteHandlers(baseConfig);
      const req = makeRequest('http://localhost:3000/api/products?include=secretRelation');
      await GET(req as any);

      // Should not have an include clause with unauthorized relations
      const call = mockFindMany.mock.calls[0][0];
      expect(call.include).toBeUndefined();
    });
  });

  // ===========================================================================
  // POST - Validation with Zod Schema
  // ===========================================================================

  describe('POST - validation with Zod schema', () => {
    const createSchema = z.object({
      name: z.string().min(1),
      sku: z.string().min(3),
      price: z.number().positive(),
    });

    const configWithValidation = {
      ...baseConfig,
      validationSchema: { create: createSchema },
    };

    it('creates a record with valid data', async () => {
      const newRecord = { id: 'new-1', name: 'Widget', sku: 'WDG-001', price: 9.99 };
      mockCreate.mockResolvedValue(newRecord);

      const { POST } = createRouteHandlers(configWithValidation);
      const req = makeRequest(
        'http://localhost:3000/api/products',
        'POST',
        { name: 'Widget', sku: 'WDG-001', price: 9.99 },
      );
      const res = await POST(req as any);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.name).toBe('Widget');
    });

    it('rejects invalid data with 400', async () => {
      const { POST } = createRouteHandlers(configWithValidation);
      const req = makeRequest(
        'http://localhost:3000/api/products',
        'POST',
        { name: '', sku: 'AB', price: -5 }, // all invalid
      );
      const res = await POST(req as any);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Validation failed');
      expect(body.details).toBeDefined();
    });

    it('passes tenant ID from headers to created record', async () => {
      mockCreate.mockResolvedValue({ id: '1' });

      const { POST } = createRouteHandlers(configWithValidation);
      const req = makeRequest(
        'http://localhost:3000/api/products',
        'POST',
        { name: 'Widget', sku: 'WDG-001', price: 9.99 },
        { 'x-tenant-id': 'tenant-abc' },
      );
      await POST(req as any);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-abc',
          }),
        }),
      );
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('error handling', () => {
    it('returns 500 on unexpected errors', async () => {
      mockFindMany.mockRejectedValue(new Error('DB connection lost'));
      mockCount.mockRejectedValue(new Error('DB connection lost'));

      const { GET } = createRouteHandlers(baseConfig);
      const req = makeRequest('http://localhost:3000/api/products');
      const res = await GET(req as any);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe('Internal server error');
    });
  });
});
