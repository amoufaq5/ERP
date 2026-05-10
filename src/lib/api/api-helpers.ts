import { NextRequest, NextResponse } from "next/server";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  pagination?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
}

export type ApiResponseType<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ─── CORS Headers ────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') ||
  (process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:3001'] : []);

function getCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : '';
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    "Access-Control-Max-Age": "86400",
  };
}

// ─── Response helpers ────────────────────────────────────────────────────────

/**
 * Return a standardised success JSON response with CORS headers.
 */
export function apiResponse<T>(data: T, status: number = 200, pagination?: PaginationMeta, req?: NextRequest) {
  const body: ApiSuccessResponse<T> = { success: true, data };
  if (pagination) body.pagination = pagination;
  const headers = getCorsHeaders(req?.headers.get("origin"));
  return NextResponse.json(body, { status, headers });
}

/**
 * Return a standardised error JSON response with CORS headers.
 */
export function apiError(message: string, status: number = 400, req?: NextRequest) {
  const body: ApiErrorResponse = { success: false, error: message };
  const headers = getCorsHeaders(req?.headers.get("origin"));
  return NextResponse.json(body, { status, headers });
}

/**
 * Handle CORS pre-flight OPTIONS requests.
 */
export function corsOptions(req?: NextRequest) {
  const headers = getCorsHeaders(req?.headers.get("origin"));
  return new NextResponse(null, { status: 204, headers });
}

// ─── Pagination ──────────────────────────────────────────────────────────────

/**
 * Paginate an array of items and return the slice together with metadata.
 */
export function paginate<T>(data: T[], page: number = 1, limit: number = 20) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const total = data.length;
  const totalPages = Math.ceil(total / safeLimit);
  const start = (safePage - 1) * safeLimit;
  const items = data.slice(start, start + safeLimit);

  const pagination: PaginationMeta = {
    page: safePage,
    limit: safeLimit,
    total,
    totalPages,
  };

  return { items, pagination };
}

// ─── Search ──────────────────────────────────────────────────────────────────

/**
 * Filter an array by matching a search term against the given fields.
 * The match is case-insensitive and uses `includes`.
 */
export function filterBySearch<T extends Record<string, unknown>>(
  data: T[],
  search: string | null | undefined,
  fields: (keyof T)[],
): T[] {
  if (!search || search.trim() === "") return data;

  const lower = search.toLowerCase();
  return data.filter((item) =>
    fields.some((field) => {
      const val = item[field];
      if (val == null) return false;
      return String(val).toLowerCase().includes(lower);
    }),
  );
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Validate that all required fields are present in the request body.
 * Returns an array of missing field names, or an empty array if valid.
 */
export function validateRequiredFields(
  body: Record<string, unknown>,
  fields: string[],
): string[] {
  return fields.filter(
    (f) => body[f] === undefined || body[f] === null || body[f] === "",
  );
}

// ─── Query-param helpers ─────────────────────────────────────────────────────

/**
 * Extract common pagination and search query-params from a URL.
 */
export function parseQueryParams(url: string) {
  const u = new URL(url);
  const page = parseInt(u.searchParams.get("page") || "1", 10);
  const limit = parseInt(u.searchParams.get("limit") || "20", 10);
  const search = u.searchParams.get("search") || "";
  return { page, limit, search, params: u.searchParams };
}
