import { describe, it, expect } from 'vitest';
import { generateOpenAPISpec } from '../openapi';

describe('OpenAPI Spec Generator', () => {
  let spec: Record<string, unknown>;

  beforeAll(() => {
    spec = generateOpenAPISpec();
  });

  // ── Top-level structure ────────────────────────────────────────────────

  describe('top-level structure', () => {
    it('has correct OpenAPI version', () => {
      expect(spec.openapi).toBe('3.0.3');
    });

    it('has info object with title and version', () => {
      const info = spec.info as Record<string, unknown>;
      expect(info.title).toBe('Pharma ERP API');
      expect(info.version).toBe('1.0.0');
      expect(info.description).toBeTruthy();
    });

    it('has servers configuration', () => {
      const servers = spec.servers as Array<Record<string, unknown>>;
      expect(servers).toHaveLength(1);
      expect(servers[0].url).toContain('{protocol}');
    });

    it('has tags for all modules', () => {
      const tags = spec.tags as Array<{ name: string }>;
      const tagNames = tags.map(t => t.name);
      expect(tagNames).toContain('Finance');
      expect(tagNames).toContain('Procurement');
      expect(tagNames).toContain('Inventory');
      expect(tagNames).toContain('Sales');
      expect(tagNames).toContain('CRM');
      expect(tagNames).toContain('HR');
      expect(tagNames).toContain('ATS');
      expect(tagNames).toContain('Search');
      expect(tagNames).toContain('GraphQL');
      expect(tagNames).toContain('Documentation');
    });

    it('has security schemes in components', () => {
      const components = spec.components as Record<string, unknown>;
      const securitySchemes = (components as any).securitySchemes;
      expect(securitySchemes).toBeDefined();
      expect(securitySchemes.headerAuth).toBeDefined();
      expect(securitySchemes.sessionAuth).toBeDefined();
    });

    it('has reusable schemas in components', () => {
      const components = spec.components as Record<string, unknown>;
      const schemas = (components as any).schemas;
      expect(schemas.PaginationMeta).toBeDefined();
      expect(schemas.ErrorResponse).toBeDefined();
    });
  });

  // ── Paths ──────────────────────────────────────────────────────────────

  describe('paths', () => {
    it('has all 47 paths', () => {
      const paths = spec.paths as Record<string, unknown>;
      const pathCount = Object.keys(paths).length;
      // 21 CRUD resources * 2 paths each (collection + /{id}) = 42,
      // plus /search, /graphql (POST+GET on same path), /docs = ~47 unique paths
      // Let's count exactly
      expect(pathCount).toBe(47);
    });

    it('includes all Finance paths', () => {
      const paths = spec.paths as Record<string, unknown>;
      expect(paths['/api/v1/gl-accounts']).toBeDefined();
      expect(paths['/api/v1/gl-accounts/{id}']).toBeDefined();
      expect(paths['/api/v1/journal-entries']).toBeDefined();
      expect(paths['/api/v1/journal-entries/{id}']).toBeDefined();
      expect(paths['/api/v1/invoices']).toBeDefined();
      expect(paths['/api/v1/invoices/{id}']).toBeDefined();
      expect(paths['/api/v1/payments']).toBeDefined();
      expect(paths['/api/v1/payments/{id}']).toBeDefined();
    });

    it('includes all Procurement paths', () => {
      const paths = spec.paths as Record<string, unknown>;
      expect(paths['/api/v1/suppliers']).toBeDefined();
      expect(paths['/api/v1/suppliers/{id}']).toBeDefined();
      expect(paths['/api/v1/purchase-orders']).toBeDefined();
      expect(paths['/api/v1/purchase-orders/{id}']).toBeDefined();
    });

    it('includes all Inventory paths', () => {
      const paths = spec.paths as Record<string, unknown>;
      expect(paths['/api/v1/products']).toBeDefined();
      expect(paths['/api/v1/products/{id}']).toBeDefined();
      expect(paths['/api/v1/warehouses']).toBeDefined();
      expect(paths['/api/v1/warehouses/{id}']).toBeDefined();
      expect(paths['/api/v1/stock-movements']).toBeDefined();
      expect(paths['/api/v1/stock-movements/{id}']).toBeDefined();
    });

    it('includes all Sales paths', () => {
      const paths = spec.paths as Record<string, unknown>;
      expect(paths['/api/v1/customers']).toBeDefined();
      expect(paths['/api/v1/customers/{id}']).toBeDefined();
      expect(paths['/api/v1/sales-orders']).toBeDefined();
      expect(paths['/api/v1/sales-orders/{id}']).toBeDefined();
    });

    it('includes all CRM paths', () => {
      const paths = spec.paths as Record<string, unknown>;
      expect(paths['/api/v1/accounts']).toBeDefined();
      expect(paths['/api/v1/contacts']).toBeDefined();
      expect(paths['/api/v1/leads']).toBeDefined();
      expect(paths['/api/v1/opportunities']).toBeDefined();
      expect(paths['/api/v1/campaigns']).toBeDefined();
      expect(paths['/api/v1/tickets']).toBeDefined();
    });

    it('includes HR and ATS paths', () => {
      const paths = spec.paths as Record<string, unknown>;
      expect(paths['/api/v1/employees']).toBeDefined();
      expect(paths['/api/v1/departments']).toBeDefined();
      expect(paths['/api/v1/jobs']).toBeDefined();
      expect(paths['/api/v1/candidates']).toBeDefined();
      expect(paths['/api/v1/applications']).toBeDefined();
    });

    it('includes search endpoint', () => {
      const paths = spec.paths as Record<string, unknown>;
      expect(paths['/api/v1/search']).toBeDefined();
    });

    it('includes GraphQL endpoint with GET and POST', () => {
      const paths = spec.paths as Record<string, unknown>;
      const graphql = paths['/api/v1/graphql'] as Record<string, unknown>;
      expect(graphql).toBeDefined();
      expect(graphql.get).toBeDefined();
      expect(graphql.post).toBeDefined();
    });

    it('includes docs endpoint', () => {
      const paths = spec.paths as Record<string, unknown>;
      expect(paths['/api/v1/docs']).toBeDefined();
    });
  });

  // ── CRUD operations per path ───────────────────────────────────────────

  describe('CRUD operations', () => {
    it('collection paths have GET and POST', () => {
      const paths = spec.paths as Record<string, unknown>;
      const products = paths['/api/v1/products'] as Record<string, unknown>;
      expect(products.get).toBeDefined();
      expect(products.post).toBeDefined();
    });

    it('resource paths have GET, PATCH, and DELETE', () => {
      const paths = spec.paths as Record<string, unknown>;
      const product = paths['/api/v1/products/{id}'] as Record<string, unknown>;
      expect(product.get).toBeDefined();
      expect(product.patch).toBeDefined();
      expect(product.delete).toBeDefined();
    });

    it('GET collection has pagination parameters', () => {
      const paths = spec.paths as Record<string, unknown>;
      const products = paths['/api/v1/products'] as Record<string, unknown>;
      const get = products.get as Record<string, unknown>;
      const params = get.parameters as Array<{ name: string }>;
      const paramNames = params.map(p => p.name);
      expect(paramNames).toContain('page');
      expect(paramNames).toContain('limit');
      expect(paramNames).toContain('search');
    });

    it('GET resource has id parameter', () => {
      const paths = spec.paths as Record<string, unknown>;
      const product = paths['/api/v1/products/{id}'] as Record<string, unknown>;
      const get = product.get as Record<string, unknown>;
      const params = get.parameters as Array<{ name: string }>;
      expect(params.some(p => p.name === 'id')).toBe(true);
    });

    it('POST has requestBody with JSON schema', () => {
      const paths = spec.paths as Record<string, unknown>;
      const products = paths['/api/v1/products'] as Record<string, unknown>;
      const post = products.post as Record<string, unknown>;
      const requestBody = post.requestBody as Record<string, unknown>;
      expect(requestBody).toBeDefined();
      expect(requestBody.required).toBe(true);
      const content = requestBody.content as Record<string, unknown>;
      expect(content['application/json']).toBeDefined();
    });

    it('operations have security requirements', () => {
      const paths = spec.paths as Record<string, unknown>;
      const products = paths['/api/v1/products'] as Record<string, unknown>;
      const get = products.get as Record<string, unknown>;
      const security = get.security as Array<Record<string, unknown>>;
      expect(security).toBeDefined();
      expect(security.length).toBeGreaterThan(0);
    });

    it('operations have operationId', () => {
      const paths = spec.paths as Record<string, unknown>;
      const products = paths['/api/v1/products'] as Record<string, unknown>;
      const get = products.get as Record<string, unknown>;
      expect(get.operationId).toBeDefined();
      expect(typeof get.operationId).toBe('string');
    });
  });

  // ── Search endpoint ────────────────────────────────────────────────────

  describe('search endpoint', () => {
    it('has required q parameter', () => {
      const paths = spec.paths as Record<string, unknown>;
      const search = paths['/api/v1/search'] as Record<string, unknown>;
      const get = search.get as Record<string, unknown>;
      const params = get.parameters as Array<{ name: string; required: boolean }>;
      const qParam = params.find(p => p.name === 'q');
      expect(qParam).toBeDefined();
      expect(qParam!.required).toBe(true);
    });

    it('has entities, limit, offset, highlight, sort parameters', () => {
      const paths = spec.paths as Record<string, unknown>;
      const search = paths['/api/v1/search'] as Record<string, unknown>;
      const get = search.get as Record<string, unknown>;
      const params = get.parameters as Array<{ name: string }>;
      const paramNames = params.map(p => p.name);
      expect(paramNames).toContain('entities');
      expect(paramNames).toContain('limit');
      expect(paramNames).toContain('offset');
      expect(paramNames).toContain('highlight');
      expect(paramNames).toContain('sort');
    });
  });

  // ── Zod to JSON Schema conversion ─────────────────────────────────────

  describe('Zod to JSON Schema conversion', () => {
    it('converts product schema to JSON schema with properties', () => {
      const paths = spec.paths as Record<string, unknown>;
      const products = paths['/api/v1/products'] as Record<string, unknown>;
      const post = products.post as Record<string, unknown>;
      const requestBody = post.requestBody as Record<string, unknown>;
      const content = requestBody.content as Record<string, unknown>;
      const jsonContent = content['application/json'] as Record<string, unknown>;
      const schema = jsonContent.schema as Record<string, unknown>;

      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      const props = schema.properties as Record<string, unknown>;
      // Product schema has sku, name, etc.
      expect(props.sku || props.name).toBeDefined();
    });

    it('strips $schema and additionalProperties from generated schemas', () => {
      const paths = spec.paths as Record<string, unknown>;
      const products = paths['/api/v1/products'] as Record<string, unknown>;
      const post = products.post as Record<string, unknown>;
      const requestBody = post.requestBody as Record<string, unknown>;
      const content = requestBody.content as Record<string, unknown>;
      const jsonContent = content['application/json'] as Record<string, unknown>;
      const schema = jsonContent.schema as Record<string, unknown>;

      expect(schema.$schema).toBeUndefined();
      expect(schema.additionalProperties).toBeUndefined();
    });

    it('response schemas are valid objects', () => {
      const paths = spec.paths as Record<string, unknown>;
      const products = paths['/api/v1/products'] as Record<string, unknown>;
      const get = products.get as Record<string, unknown>;
      const responses = get.responses as Record<string, unknown>;

      expect(responses['200']).toBeDefined();
      expect(responses['400']).toBeDefined();
      expect(responses['403']).toBeDefined();
      expect(responses['500']).toBeDefined();
    });
  });
});
