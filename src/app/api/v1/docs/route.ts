import { NextResponse } from "next/server";
import { generateOpenAPISpec } from "@/lib/api/openapi";
import { corsOptions } from "@/lib/api/api-helpers";

export async function OPTIONS() {
  return corsOptions();
}

/**
 * GET /api/v1/docs
 *
 * Returns the complete OpenAPI 3.0 JSON specification for the ERP API.
 * Can be consumed by Swagger UI, Redoc, Postman, or any OpenAPI-compatible tool.
 */
export async function GET() {
  const spec = generateOpenAPISpec();

  return NextResponse.json(spec, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
