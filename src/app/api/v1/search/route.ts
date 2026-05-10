import { NextRequest, NextResponse } from "next/server";
import { search, getSupportedEntities } from "@/lib/search/search-service";
import { apiError, corsOptions } from "@/lib/api/api-helpers";

export async function OPTIONS() {
  return corsOptions();
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const q = url.searchParams.get("q")?.trim();

  if (!q) {
    return apiError("Missing required query parameter: q", 400, req);
  }

  // Parse optional parameters
  const entitiesParam = url.searchParams.get("entities");
  const entities = entitiesParam
    ? entitiesParam.split(",").map((e) => e.trim().toLowerCase())
    : undefined;

  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 1),
    100,
  );
  const offset = Math.max(
    parseInt(url.searchParams.get("offset") || "0", 10) || 0,
    0,
  );
  const highlight = url.searchParams.get("highlight") === "true";
  const sort =
    (url.searchParams.get("sort") as "relevance" | "date" | "name") ||
    "relevance";

  // Build filters from remaining query params
  const reservedParams = new Set([
    "q",
    "entities",
    "limit",
    "offset",
    "highlight",
    "sort",
  ]);
  const filters: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    if (!reservedParams.has(key)) {
      filters[key] = value;
    }
  });

  try {
    const result = await search(q, {
      entities,
      limit,
      offset,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      sort,
      highlight,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          results: result.results,
          totalHits: result.totalHits,
          query: result.query,
          executionTimeMs: result.executionTimeMs,
          suggestions: result.suggestions,
          facets: result.facets,
          supportedEntities: getSupportedEntities(),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Search failed";
    return apiError(message, 500, req);
  }
}
