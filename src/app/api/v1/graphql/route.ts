import { NextRequest, NextResponse } from "next/server";
import { executeGraphQL, getSchemaInfo } from "@/lib/graphql/schema";
import { apiError, corsOptions } from "@/lib/api/api-helpers";

export async function OPTIONS() {
  return corsOptions();
}

/**
 * POST /api/v1/graphql
 *
 * Accepts a JSON body with:
 * - query: string (required) - the GraphQL query or mutation
 * - variables: Record<string, unknown> (optional) - variable values
 * - operationName: string (optional) - operation name (for multi-operation documents)
 *
 * Returns: { data, errors? }
 */
export async function POST(req: NextRequest) {
  let body: {
    query?: string;
    variables?: Record<string, unknown>;
    operationName?: string;
  };

  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body", 400, req);
  }

  const { query, variables, operationName } = body;

  if (!query || typeof query !== "string") {
    return apiError("Missing required field: query", 400, req);
  }

  // Extract auth context from headers (same pattern as the rest of the API)
  const role = req.headers.get("x-user-role") || "ADMIN";
  const userId = req.headers.get("x-user-id") || "system";

  const startTime = Date.now();

  const result = await executeGraphQL(
    query,
    variables || {},
    { role, userId },
  );

  const executionTimeMs = Date.now() - startTime;

  // Standard GraphQL response envelope
  const response: Record<string, unknown> = {
    data: result.data,
  };

  if (result.errors && result.errors.length > 0) {
    response.errors = result.errors;
  }

  response.extensions = {
    executionTimeMs,
    operationName: operationName || null,
  };

  return NextResponse.json(response, {
    status: result.errors?.length ? 200 : 200, // GraphQL always returns 200
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * GET /api/v1/graphql
 *
 * Returns the schema introspection info and a basic usage guide.
 */
export async function GET(req: NextRequest) {
  const schema = getSchemaInfo();

  return NextResponse.json(
    {
      success: true,
      data: {
        schema,
        usage: {
          endpoint: "/api/v1/graphql",
          method: "POST",
          contentType: "application/json",
          body: {
            query: "{ customers(take: 10) { id name email } }",
            variables: {},
          },
          examples: [
            {
              description: "List customers with pagination",
              query:
                '{ customers(take: 10, skip: 0, orderBy: { name: "asc" }) { id name email type city } }',
            },
            {
              description: "Get a single product by ID",
              query:
                '{ product(id: "abc123") { id name sku unitPrice category } }',
            },
            {
              description: "Get invoice with customer relation",
              query:
                '{ invoice(id: "inv1") { id invoiceNumber total status customer { id name } items { description quantity total } } }',
            },
            {
              description: "Create a new lead",
              query:
                'mutation { createLead(input: { firstName: "John", lastName: "Doe", email: "john@example.com", source: "WEB" }) { id firstName lastName } }',
            },
            {
              description: "Search across entities",
              query:
                '{ search(query: "acme", entities: ["customer", "contact"], limit: 5) { totalHits results { entity total items { id title } } } }',
            },
          ],
        },
      },
    },
    { status: 200 },
  );
}
