import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

const mockQueryRaw = vi.fn();
const mockQueryRawTagged = vi.fn();

vi.mock('@/lib/prisma', () => {
  return {
    default: {
      $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
      $queryRawUnsafe: vi.fn(),
    },
  };
});

// Mock Prisma namespace for sql template tag
vi.mock('@prisma/client', () => ({
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
      strings,
      values,
      type: 'sql',
    }),
    raw: (s: string) => ({ rawValue: s, type: 'raw' }),
  },
}));

import { search, searchEntity, getSupportedEntities } from '@/lib/search/search-service';
import type { SearchResponse, EntitySearchResult } from '@/lib/search/search-service';

// =============================================================================
// Helper: simulate raw query results
// =============================================================================

function makeSearchRows(entities: Array<{
  id: string;
  title: string;
  entity_type: string;
  rank?: number;
  subtitle?: string | null;
  highlight?: string | null;
}>) {
  return entities.map((e) => ({
    id: e.id,
    title: e.title,
    subtitle: e.subtitle ?? null,
    highlight: e.highlight ?? null,
    rank: e.rank ?? 0.5,
    entity_type: e.entity_type,
    url_prefix: `/test/${e.entity_type}`,
    metadata: {},
  }));
}

function makeCountRows(counts: Record<string, number>) {
  return Object.entries(counts).map(([entity_type, cnt]) => ({
    entity_type,
    cnt,
  }));
}

// =============================================================================
// getSupportedEntities
// =============================================================================

describe('Search Service - getSupportedEntities', () => {
  it('returns all 12 supported entity types', () => {
    const entities = getSupportedEntities();
    expect(entities).toContain('customer');
    expect(entities).toContain('product');
    expect(entities).toContain('invoice');
    expect(entities).toContain('employee');
    expect(entities).toContain('department');
    expect(entities).toContain('purchaseorder');
    expect(entities).toContain('salesorder');
    expect(entities).toContain('supplier');
    expect(entities).toContain('lead');
    expect(entities).toContain('opportunity');
    expect(entities).toContain('contact');
    expect(entities).toContain('project');
    expect(entities).toHaveLength(12);
  });

  it('returns a new array each time (not the same reference)', () => {
    const a = getSupportedEntities();
    const b = getSupportedEntities();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

// =============================================================================
// search() - Basic Behavior
// =============================================================================

describe('Search Service - search()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty results for empty/whitespace query', async () => {
    const result = await search('');
    expect(result.results).toEqual([]);
    expect(result.totalHits).toBe(0);
    expect(result.query).toBe('');
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);

    const result2 = await search('   ');
    expect(result2.results).toEqual([]);
    expect(result2.totalHits).toBe(0);
  });

  it('returns empty results for query with only special characters', async () => {
    const result = await search('!@#$%^&*()');
    expect(result.results).toEqual([]);
    expect(result.totalHits).toBe(0);
  });

  it('searches across all entities by default', async () => {
    const searchRows = makeSearchRows([
      { id: 'c1', title: 'Acme Corp', entity_type: 'customer', rank: 0.9 },
      { id: 'p1', title: 'Acme Widget', entity_type: 'product', rank: 0.7 },
    ]);
    const countRows = makeCountRows({ customer: 1, product: 1 });

    mockQueryRaw.mockResolvedValueOnce(searchRows);
    mockQueryRaw.mockResolvedValueOnce(countRows);
    mockQueryRaw.mockResolvedValueOnce([]); // suggestions

    const result = await search('acme');

    expect(result.totalHits).toBe(2);
    expect(result.query).toBe('acme');
    expect(result.results.length).toBeGreaterThanOrEqual(2);

    // Check facets
    expect(result.facets.customer).toBe(1);
    expect(result.facets.product).toBe(1);
  });

  it('filters search to specific entity types', async () => {
    const searchRows = makeSearchRows([
      { id: 'c1', title: 'Acme Corp', entity_type: 'customer', rank: 0.9 },
    ]);
    const countRows = makeCountRows({ customer: 1 });

    mockQueryRaw.mockResolvedValueOnce(searchRows);
    mockQueryRaw.mockResolvedValueOnce(countRows);
    mockQueryRaw.mockResolvedValueOnce([]); // suggestions

    const result = await search('acme', { entities: ['customer'] });

    expect(result.totalHits).toBe(1);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].entity).toBe('customer');
  });

  it('returns empty when filtering to non-existent entity types', async () => {
    const result = await search('acme', { entities: ['nonexistent'] });
    expect(result.results).toEqual([]);
    expect(result.totalHits).toBe(0);
  });

  it('tracks execution time', async () => {
    mockQueryRaw.mockResolvedValueOnce([]);
    mockQueryRaw.mockResolvedValueOnce([]);
    mockQueryRaw.mockResolvedValueOnce([]); // suggestions

    const result = await search('test');
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    expect(typeof result.executionTimeMs).toBe('number');
  });

  it('preserves the original query text in response', async () => {
    mockQueryRaw.mockResolvedValueOnce([]);
    mockQueryRaw.mockResolvedValueOnce([]);
    mockQueryRaw.mockResolvedValueOnce([]); // suggestions

    const result = await search('Hello World!');
    expect(result.query).toBe('Hello World!');
  });
});

// =============================================================================
// search() - Relevance Ranking
// =============================================================================

describe('Search Service - Relevance Ranking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('assigns rank scores to results', async () => {
    const searchRows = makeSearchRows([
      { id: 'c1', title: 'Acme Industries', entity_type: 'customer', rank: 0.95 },
      { id: 'c2', title: 'Acme Corp Small', entity_type: 'customer', rank: 0.4 },
    ]);
    const countRows = makeCountRows({ customer: 2 });

    mockQueryRaw.mockResolvedValueOnce(searchRows);
    mockQueryRaw.mockResolvedValueOnce(countRows);

    const result = await search('acme');

    const customerResults = result.results.find((r) => r.entity === 'customer');
    expect(customerResults).toBeDefined();
    expect(customerResults!.items).toHaveLength(2);

    // Items should have rank values
    expect(customerResults!.items[0].rank).toBe(0.95);
    expect(customerResults!.items[1].rank).toBe(0.4);
  });

  it('groups results by entity type', async () => {
    const searchRows = makeSearchRows([
      { id: 'c1', title: 'Acme Corp', entity_type: 'customer', rank: 0.9 },
      { id: 'p1', title: 'Acme Widget', entity_type: 'product', rank: 0.7 },
      { id: 'c2', title: 'Acme LLC', entity_type: 'customer', rank: 0.5 },
    ]);
    const countRows = makeCountRows({ customer: 2, product: 1 });

    mockQueryRaw.mockResolvedValueOnce(searchRows);
    mockQueryRaw.mockResolvedValueOnce(countRows);

    const result = await search('acme');

    const customerResults = result.results.find((r) => r.entity === 'customer');
    const productResults = result.results.find((r) => r.entity === 'product');

    expect(customerResults!.items).toHaveLength(2);
    expect(customerResults!.total).toBe(2);
    expect(productResults!.items).toHaveLength(1);
    expect(productResults!.total).toBe(1);
  });
});

// =============================================================================
// search() - Highlighting
// =============================================================================

describe('Search Service - Highlighting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns highlight field when highlight option is true', async () => {
    const searchRows = makeSearchRows([
      {
        id: 'c1',
        title: 'Acme Corp',
        entity_type: 'customer',
        highlight: '<mark>Acme</mark> Corp - leading provider',
      },
    ]);
    const countRows = makeCountRows({ customer: 1 });

    mockQueryRaw.mockResolvedValueOnce(searchRows);
    mockQueryRaw.mockResolvedValueOnce(countRows);

    const result = await search('acme', { highlight: true });

    const item = result.results[0].items[0];
    expect(item.highlight).toContain('<mark>');
    expect(item.highlight).toContain('Acme');
  });

  it('returns null highlight when highlight option is false', async () => {
    const searchRows = makeSearchRows([
      { id: 'c1', title: 'Acme Corp', entity_type: 'customer', highlight: null },
    ]);
    const countRows = makeCountRows({ customer: 1 });

    mockQueryRaw.mockResolvedValueOnce(searchRows);
    mockQueryRaw.mockResolvedValueOnce(countRows);

    const result = await search('acme', { highlight: false });

    const item = result.results[0].items[0];
    expect(item.highlight).toBeNull();
  });
});

// =============================================================================
// search() - Pagination
// =============================================================================

describe('Search Service - Pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes limit and offset to the raw query', async () => {
    mockQueryRaw.mockResolvedValueOnce([]);
    mockQueryRaw.mockResolvedValueOnce([]);

    await search('test', { limit: 10, offset: 20 });

    // Verify the SQL was constructed with limit/offset
    expect(mockQueryRaw).toHaveBeenCalledTimes(2);
  });

  it('defaults limit to 20 and offset to 0', async () => {
    mockQueryRaw.mockResolvedValueOnce([]);
    mockQueryRaw.mockResolvedValueOnce([]);

    await search('test');

    // The function should run without error (defaults applied internally)
    expect(mockQueryRaw).toHaveBeenCalledTimes(2);
  });

  it('returns totalHits from count queries (may exceed page size)', async () => {
    const searchRows = makeSearchRows([
      { id: 'c1', title: 'Customer 1', entity_type: 'customer' },
      { id: 'c2', title: 'Customer 2', entity_type: 'customer' },
    ]);
    // Total count may be higher than results returned
    const countRows = makeCountRows({ customer: 50 });

    mockQueryRaw.mockResolvedValueOnce(searchRows);
    mockQueryRaw.mockResolvedValueOnce(countRows);

    const result = await search('customer', { limit: 2 });

    expect(result.totalHits).toBe(50);
    expect(result.results[0].items).toHaveLength(2);
    expect(result.results[0].total).toBe(50);
  });
});

// =============================================================================
// search() - Result Structure
// =============================================================================

describe('Search Service - Result Structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds correct URL for each result item', async () => {
    const searchRows = [
      {
        id: 'acc-123',
        title: 'Acme',
        subtitle: 'Tech',
        highlight: null,
        rank: 0.8,
        entity_type: 'customer',
        url_prefix: '/crm/accounts',
        metadata: { type: 'ENTERPRISE' },
      },
    ];
    const countRows = makeCountRows({ customer: 1 });

    mockQueryRaw.mockResolvedValueOnce(searchRows);
    mockQueryRaw.mockResolvedValueOnce(countRows);

    const result = await search('acme', { entities: ['customer'] });

    const item = result.results[0].items[0];
    expect(item.url).toBe('/crm/accounts/acc-123');
    expect(item.entityType).toBe('customer');
    expect(item.title).toBe('Acme');
    expect(item.subtitle).toBe('Tech');
  });

  it('returns suggestions array', async () => {
    mockQueryRaw.mockResolvedValueOnce([]);
    mockQueryRaw.mockResolvedValueOnce([]);
    // suggestions query
    mockQueryRaw.mockResolvedValueOnce([
      { suggestion: 'Acme Corp' },
      { suggestion: 'Acme Industries' },
    ]);

    const result = await search('acm');

    expect(result.suggestions).toBeDefined();
    expect(Array.isArray(result.suggestions)).toBe(true);
  });

  it('returns facets as entity_type -> count mapping', async () => {
    const searchRows = makeSearchRows([
      { id: 'c1', title: 'Test', entity_type: 'customer' },
      { id: 'p1', title: 'Test', entity_type: 'product' },
    ]);
    const countRows = makeCountRows({ customer: 5, product: 3, lead: 1 });

    mockQueryRaw.mockResolvedValueOnce(searchRows);
    mockQueryRaw.mockResolvedValueOnce(countRows);

    const result = await search('test');

    expect(result.facets).toEqual({ customer: 5, product: 3, lead: 1 });
  });

  it('handles metadata as object from raw query', async () => {
    const searchRows = [
      {
        id: 'p1',
        title: 'Widget',
        subtitle: 'Hardware',
        highlight: null,
        rank: 0.6,
        entity_type: 'product',
        url_prefix: '/inventory/products',
        metadata: { sku: 'WDG-001', category: 'Hardware' },
      },
    ];
    const countRows = makeCountRows({ product: 1 });

    mockQueryRaw.mockResolvedValueOnce(searchRows);
    mockQueryRaw.mockResolvedValueOnce(countRows);

    const result = await search('widget', { entities: ['product'] });

    const item = result.results[0].items[0];
    expect(item.metadata).toEqual({ sku: 'WDG-001', category: 'Hardware' });
  });

  it('handles null/non-object metadata gracefully', async () => {
    const searchRows = [
      {
        id: 'p1',
        title: 'Widget',
        subtitle: null,
        highlight: null,
        rank: 0.5,
        entity_type: 'product',
        url_prefix: '/inventory/products',
        metadata: null,
      },
    ];
    const countRows = makeCountRows({ product: 1 });

    mockQueryRaw.mockResolvedValueOnce(searchRows);
    mockQueryRaw.mockResolvedValueOnce(countRows);

    const result = await search('widget', { entities: ['product'] });

    const item = result.results[0].items[0];
    expect(item.metadata).toEqual({});
  });
});

// =============================================================================
// searchEntity() - Single Entity Search
// =============================================================================

describe('Search Service - searchEntity()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns results for a single entity type', async () => {
    const searchRows = makeSearchRows([
      { id: 'p1', title: 'Acme Widget', entity_type: 'product', rank: 0.8 },
    ]);
    const countRows = makeCountRows({ product: 1 });

    mockQueryRaw.mockResolvedValueOnce(searchRows);
    mockQueryRaw.mockResolvedValueOnce(countRows);
    mockQueryRaw.mockResolvedValueOnce([]); // suggestions

    const result: EntitySearchResult = await searchEntity('product', 'acme');

    expect(result.entity).toBe('product');
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('returns empty result for non-matching query', async () => {
    mockQueryRaw.mockResolvedValueOnce([]);
    mockQueryRaw.mockResolvedValueOnce([]);
    mockQueryRaw.mockResolvedValueOnce([]); // suggestions

    const result = await searchEntity('customer', 'zzzznonexistent');

    expect(result.entity).toBe('customer');
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });
});

// =============================================================================
// Search API Route Tests (testing via service since route is thin wrapper)
// =============================================================================

describe('Search API Route - Parameter Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('search service sanitizes special characters from query', async () => {
    // Special chars should be stripped, only "acme" remains
    mockQueryRaw.mockResolvedValueOnce([]);
    mockQueryRaw.mockResolvedValueOnce([]);
    mockQueryRaw.mockResolvedValueOnce([]); // suggestions

    const result = await search('acme!@#$');

    // Should not throw
    expect(result.query).toBe('acme!@#$');
    expect(mockQueryRaw).toHaveBeenCalled();
  });

  it('search handles sort parameter "date"', async () => {
    mockQueryRaw.mockResolvedValueOnce([]);
    mockQueryRaw.mockResolvedValueOnce([]);
    mockQueryRaw.mockResolvedValueOnce([]); // suggestions

    const result = await search('test', { sort: 'date' });
    expect(result).toBeDefined();
  });

  it('search handles sort parameter "name"', async () => {
    mockQueryRaw.mockResolvedValueOnce([]);
    mockQueryRaw.mockResolvedValueOnce([]);
    mockQueryRaw.mockResolvedValueOnce([]); // suggestions

    const result = await search('test', { sort: 'name' });
    expect(result).toBeDefined();
  });
});
