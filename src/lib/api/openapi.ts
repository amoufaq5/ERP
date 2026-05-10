import { z } from "zod";
import {
  createProductSchema,
  createInvoiceSchema,
  createPaymentSchema,
  createGlAccountSchema,
  createJournalEntrySchema,
  createEmployeeSchema,
  createDepartmentSchema,
  createPurchaseOrderSchema,
  createSalesOrderSchema,
  createCandidateSchema,
  createJobSchema,
  createApplicationSchema,
  createLeadSchema,
  createOpportunitySchema,
  createAccountSchema,
  createContactSchema,
  createCampaignSchema,
  createTicketSchema,
  createSupplierSchema,
  createCustomerSchema,
  createWarehouseSchema,
  createStockMovementSchema,
} from "./validations";

// ─── Zod to JSON Schema conversion ───────────────────────────────────────────

type JsonSchema = Record<string, unknown>;

/**
 * Convert a Zod schema to a JSON Schema object using Zod 4's native
 * `toJSONSchema()` method. Strips the `$schema` meta-key so the output
 * is suitable for embedding inside an OpenAPI 3.0 spec.
 */
function zodToJsonSchema(schema: z.ZodType): JsonSchema {
  try {
    const raw = schema.toJSONSchema() as JsonSchema;
    const { $schema: _, additionalProperties: __, ...rest } = raw;
    return rest;
  } catch {
    // Fallback for schemas that cannot be converted (e.g., complex refinements)
    return { type: "object" };
  }
}

// ─── Route Definitions ────────────────────────────────────────────────────────

interface RouteDefinition {
  path: string;
  method: string;
  summary: string;
  tags: string[];
  parameters?: ParameterDef[];
  requestBody?: { schema: z.ZodType; description: string };
  responses: Record<
    string,
    { description: string; schema?: JsonSchema }
  >;
}

interface ParameterDef {
  name: string;
  in: "query" | "path" | "header";
  required: boolean;
  description: string;
  schema: JsonSchema;
}

const paginationParams: ParameterDef[] = [
  {
    name: "page",
    in: "query",
    required: false,
    description: "Page number (default: 1)",
    schema: { type: "integer", minimum: 1, default: 1 },
  },
  {
    name: "limit",
    in: "query",
    required: false,
    description: "Results per page (default: 20, max: 100)",
    schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
  },
  {
    name: "search",
    in: "query",
    required: false,
    description: "Search term for filtering results",
    schema: { type: "string" },
  },
];

const idParam: ParameterDef = {
  name: "id",
  in: "path",
  required: true,
  description: "Resource identifier",
  schema: { type: "string" },
};

const successResponse = (description: string, itemSchema?: JsonSchema) => ({
  "200": {
    description,
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", enum: [true] },
        data: itemSchema || { type: "object" },
        pagination: {
          type: "object",
          properties: {
            page: { type: "integer" },
            limit: { type: "integer" },
            total: { type: "integer" },
            totalPages: { type: "integer" },
          },
        },
      },
    },
  },
  "400": {
    description: "Bad request",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", enum: [false] },
        error: { type: "string" },
      },
    },
  },
  "403": {
    description: "Forbidden - insufficient permissions",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", enum: [false] },
        error: { type: "string" },
      },
    },
  },
  "500": {
    description: "Internal server error",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", enum: [false] },
        error: { type: "string" },
      },
    },
  },
});

function buildCrudRoutes(
  basePath: string,
  tag: string,
  entityName: string,
  createSchema: z.ZodType,
): RouteDefinition[] {
  const itemSchema = zodToJsonSchema(createSchema);

  return [
    {
      path: basePath,
      method: "GET",
      summary: `List all ${entityName}s`,
      tags: [tag],
      parameters: [...paginationParams],
      responses: successResponse(
        `List of ${entityName}s`,
        { type: "array", items: itemSchema },
      ),
    },
    {
      path: basePath,
      method: "POST",
      summary: `Create a new ${entityName}`,
      tags: [tag],
      requestBody: {
        schema: createSchema,
        description: `${entityName} data`,
      },
      responses: {
        "201": {
          description: `${entityName} created successfully`,
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean", enum: [true] },
              data: itemSchema,
            },
          },
        },
        "400": {
          description: "Validation error",
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean", enum: [false] },
              error: { type: "string" },
            },
          },
        },
        "403": {
          description: "Forbidden - insufficient permissions",
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean", enum: [false] },
              error: { type: "string" },
            },
          },
        },
      },
    },
    {
      path: `${basePath}/{id}`,
      method: "GET",
      summary: `Get a ${entityName} by ID`,
      tags: [tag],
      parameters: [idParam],
      responses: successResponse(`${entityName} details`, itemSchema),
    },
    {
      path: `${basePath}/{id}`,
      method: "PATCH",
      summary: `Update a ${entityName}`,
      tags: [tag],
      parameters: [idParam],
      requestBody: {
        schema: createSchema,
        description: `Partial ${entityName} data`,
      },
      responses: successResponse(`Updated ${entityName}`, itemSchema),
    },
    {
      path: `${basePath}/{id}`,
      method: "DELETE",
      summary: `Delete a ${entityName}`,
      tags: [tag],
      parameters: [idParam],
      responses: {
        "200": {
          description: `${entityName} deleted successfully`,
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean", enum: [true] },
              data: { type: "object", properties: { id: { type: "string" } } },
            },
          },
        },
        "404": {
          description: `${entityName} not found`,
        },
      },
    },
  ];
}

// ─── Build all route definitions ──────────────────────────────────────────────

function getAllRoutes(): RouteDefinition[] {
  const routes: RouteDefinition[] = [];

  // Finance
  routes.push(...buildCrudRoutes("/api/v1/gl-accounts", "Finance", "GL Account", createGlAccountSchema));
  routes.push(...buildCrudRoutes("/api/v1/journal-entries", "Finance", "Journal Entry", createJournalEntrySchema));
  routes.push(...buildCrudRoutes("/api/v1/invoices", "Finance", "Invoice", createInvoiceSchema));
  routes.push(...buildCrudRoutes("/api/v1/payments", "Finance", "Payment", createPaymentSchema));

  // Procurement
  routes.push(...buildCrudRoutes("/api/v1/suppliers", "Procurement", "Supplier", createSupplierSchema));
  routes.push(...buildCrudRoutes("/api/v1/purchase-orders", "Procurement", "Purchase Order", createPurchaseOrderSchema));

  // Inventory
  routes.push(...buildCrudRoutes("/api/v1/products", "Inventory", "Product", createProductSchema));
  routes.push(...buildCrudRoutes("/api/v1/warehouses", "Inventory", "Warehouse", createWarehouseSchema));
  routes.push(...buildCrudRoutes("/api/v1/stock-movements", "Inventory", "Stock Movement", createStockMovementSchema));

  // Sales
  routes.push(...buildCrudRoutes("/api/v1/customers", "Sales", "Customer", createCustomerSchema));
  routes.push(...buildCrudRoutes("/api/v1/sales-orders", "Sales", "Sales Order", createSalesOrderSchema));

  // CRM
  routes.push(...buildCrudRoutes("/api/v1/accounts", "CRM", "Account", createAccountSchema));
  routes.push(...buildCrudRoutes("/api/v1/contacts", "CRM", "Contact", createContactSchema));
  routes.push(...buildCrudRoutes("/api/v1/leads", "CRM", "Lead", createLeadSchema));
  routes.push(...buildCrudRoutes("/api/v1/opportunities", "CRM", "Opportunity", createOpportunitySchema));
  routes.push(...buildCrudRoutes("/api/v1/campaigns", "CRM", "Campaign", createCampaignSchema));
  routes.push(...buildCrudRoutes("/api/v1/tickets", "CRM", "Ticket", createTicketSchema));

  // HR
  routes.push(...buildCrudRoutes("/api/v1/employees", "HR", "Employee", createEmployeeSchema));
  routes.push(...buildCrudRoutes("/api/v1/departments", "HR", "Department", createDepartmentSchema));

  // ATS
  routes.push(...buildCrudRoutes("/api/v1/jobs", "ATS", "Job", createJobSchema));
  routes.push(...buildCrudRoutes("/api/v1/candidates", "ATS", "Candidate", createCandidateSchema));
  routes.push(...buildCrudRoutes("/api/v1/applications", "ATS", "Application", createApplicationSchema));

  // Search
  routes.push({
    path: "/api/v1/search",
    method: "GET",
    summary: "Full-text search across multiple entity types",
    tags: ["Search"],
    parameters: [
      {
        name: "q",
        in: "query",
        required: true,
        description: "Search query string",
        schema: { type: "string" },
      },
      {
        name: "entities",
        in: "query",
        required: false,
        description: "Comma-separated entity types to search (e.g., customer,product,invoice)",
        schema: { type: "string" },
      },
      {
        name: "limit",
        in: "query",
        required: false,
        description: "Max results per entity type (default: 20)",
        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      },
      {
        name: "offset",
        in: "query",
        required: false,
        description: "Offset for pagination (default: 0)",
        schema: { type: "integer", minimum: 0, default: 0 },
      },
      {
        name: "highlight",
        in: "query",
        required: false,
        description: "Include highlighted snippets (true/false)",
        schema: { type: "boolean", default: false },
      },
      {
        name: "sort",
        in: "query",
        required: false,
        description: "Sort order for results",
        schema: { type: "string", enum: ["relevance", "date", "name"] },
      },
    ],
    responses: {
      "200": {
        description: "Search results",
        schema: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      entity: { type: "string" },
                      total: { type: "integer" },
                      items: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            title: { type: "string" },
                            subtitle: { type: "string", nullable: true },
                            excerpt: { type: "string", nullable: true },
                            highlight: { type: "string", nullable: true },
                            rank: { type: "number" },
                            entityType: { type: "string" },
                            url: { type: "string" },
                            metadata: { type: "object" },
                          },
                        },
                      },
                    },
                  },
                },
                totalHits: { type: "integer" },
                query: { type: "string" },
                executionTimeMs: { type: "number" },
                suggestions: { type: "array", items: { type: "string" } },
                facets: { type: "object" },
              },
            },
          },
        },
      },
      "400": {
        description: "Missing query parameter",
      },
    },
  });

  // GraphQL
  routes.push({
    path: "/api/v1/graphql",
    method: "POST",
    summary: "Execute a GraphQL query or mutation",
    tags: ["GraphQL"],
    requestBody: {
      schema: z.object({
        query: z.string().min(1),
        variables: z.record(z.string(), z.unknown()).optional(),
        operationName: z.string().optional(),
      }),
      description: "GraphQL request body",
    },
    responses: {
      "200": {
        description: "GraphQL response",
        schema: {
          type: "object",
          properties: {
            data: { type: "object", nullable: true },
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  message: { type: "string" },
                  path: { type: "array", items: { type: "string" } },
                },
              },
              nullable: true,
            },
            extensions: {
              type: "object",
              properties: {
                executionTimeMs: { type: "number" },
              },
            },
          },
        },
      },
    },
  });

  routes.push({
    path: "/api/v1/graphql",
    method: "GET",
    summary: "Get GraphQL schema introspection and usage guide",
    tags: ["GraphQL"],
    responses: successResponse("GraphQL schema info"),
  });

  // Docs
  routes.push({
    path: "/api/v1/docs",
    method: "GET",
    summary: "OpenAPI 3.0 specification (this document)",
    tags: ["Documentation"],
    responses: {
      "200": {
        description: "OpenAPI JSON specification",
      },
    },
  });

  return routes;
}

// ─── OpenAPI Spec Generation ──────────────────────────────────────────────────

export function generateOpenAPISpec(): Record<string, unknown> {
  const routes = getAllRoutes();

  // Group routes into OpenAPI paths
  const paths: Record<string, Record<string, unknown>> = {};

  for (const route of routes) {
    if (!paths[route.path]) {
      paths[route.path] = {};
    }

    const operation: Record<string, unknown> = {
      summary: route.summary,
      tags: route.tags,
      operationId: `${route.method.toLowerCase()}_${route.path.replace(/[/{}]/g, "_").replace(/^_/, "")}`,
    };

    // Parameters
    if (route.parameters && route.parameters.length > 0) {
      operation.parameters = route.parameters.map((p) => ({
        name: p.name,
        in: p.in,
        required: p.required,
        description: p.description,
        schema: p.schema,
      }));
    }

    // Request body
    if (route.requestBody) {
      operation.requestBody = {
        required: true,
        description: route.requestBody.description,
        content: {
          "application/json": {
            schema: zodToJsonSchema(route.requestBody.schema),
          },
        },
      };
    }

    // Responses
    const responses: Record<string, unknown> = {};
    for (const [code, res] of Object.entries(route.responses)) {
      const response: Record<string, unknown> = {
        description: res.description,
      };
      if (res.schema) {
        response.content = {
          "application/json": {
            schema: res.schema,
          },
        };
      }
      responses[code] = response;
    }
    operation.responses = responses;

    // Security
    operation.security = [
      { headerAuth: [] },
      { sessionAuth: [] },
    ];

    paths[route.path][route.method.toLowerCase()] = operation;
  }

  return {
    openapi: "3.0.3",
    info: {
      title: "Pharma ERP API",
      description:
        "Comprehensive ERP platform API covering Finance, Procurement, Inventory, Sales, CRM, HR, ATS, and Pharma CRM modules. Includes full-text search and GraphQL endpoints.",
      version: "1.0.0",
      contact: {
        name: "ERP API Support",
      },
    },
    servers: [
      {
        url: "{protocol}://{host}",
        description: "ERP Server",
        variables: {
          protocol: {
            enum: ["http", "https"],
            default: "https",
          },
          host: {
            default: "localhost:3000",
          },
        },
      },
    ],
    tags: [
      { name: "Finance", description: "GL accounts, journal entries, invoices, and payments" },
      { name: "Procurement", description: "Suppliers and purchase orders" },
      { name: "Inventory", description: "Products, warehouses, and stock movements" },
      { name: "Sales", description: "Customers and sales orders" },
      { name: "CRM", description: "Accounts, contacts, leads, opportunities, campaigns, and tickets" },
      { name: "HR", description: "Employees and departments" },
      { name: "ATS", description: "Jobs, candidates, and applications" },
      { name: "Search", description: "Full-text search across all entities" },
      { name: "GraphQL", description: "GraphQL query and mutation endpoint" },
      { name: "Documentation", description: "API documentation" },
    ],
    paths,
    components: {
      securitySchemes: {
        headerAuth: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
          description: "API key authentication via header",
        },
        sessionAuth: {
          type: "http",
          scheme: "bearer",
          description: "Session-based authentication (NextAuth)",
        },
        roleHeader: {
          type: "apiKey",
          in: "header",
          name: "X-User-Role",
          description: "User role for RBAC (dev/testing only)",
        },
      },
      schemas: {
        PaginationMeta: {
          type: "object",
          properties: {
            page: { type: "integer" },
            limit: { type: "integer" },
            total: { type: "integer" },
            totalPages: { type: "integer" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", enum: [false] },
            error: { type: "string" },
          },
        },
      },
    },
  };
}
