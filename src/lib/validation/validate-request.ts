import type { ZodSchema, ZodError } from "zod";

// ─── API request body validation ────────────────────────────────────────────

export type ValidateSuccess<T> = { success: true; data: T };
export type ValidateFailure = { success: false; errors: ZodError };

export type ValidateResult<T> = ValidateSuccess<T> | ValidateFailure;

/**
 * Validate an incoming request body against a Zod schema.
 *
 * @example
 * ```ts
 * const result = validateBody(doctorSchema, await req.json());
 * if (!result.success) {
 *   return NextResponse.json(formatValidationError(result.errors), { status: 400 });
 * }
 * const doctor = result.data;
 * ```
 */
export function validateBody<T>(
  schema: ZodSchema<T>,
  body: unknown,
): ValidateResult<T> {
  const result = schema.safeParse(body);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Format a ZodError into a JSON-friendly structure suitable for a 400 response.
 *
 * Shape:
 * ```json
 * {
 *   "error": "Validation failed",
 *   "fields": { "email": "Invalid email", "name": "Required" }
 * }
 * ```
 */
export function formatValidationError(error: ZodError): {
  error: string;
  fields: Record<string, string>;
} {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.map(String).join(".") || "_root";
    if (!fields[path]) {
      fields[path] = issue.message;
    }
  }
  return { error: "Validation failed", fields };
}
