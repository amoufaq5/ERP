import { NextRequest, NextResponse } from "next/server";
import { getImportSchema } from "@/lib/import/import-schemas";
import type { ImportSchema, ParsedRow, InvalidRow } from "@/lib/import/import-service";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ImportRequestBody {
  entityType: string;
  rows: Record<string, string>[];
}

interface ImportResponse {
  success: boolean;
  entityType: string;
  valid: ParsedRow[];
  invalid: InvalidRow[];
  totalValid: number;
  totalInvalid: number;
  message: string;
}

// ─── POST Handler ───────────────────────────────────────────────────────────

/**
 * POST /api/import
 *
 * Accepts parsed rows and an entity type, validates them against the schema,
 * and returns the validation results. Actual DB insertion will come with
 * Prisma migration — for now this validates and returns.
 */
export async function POST(request: NextRequest): Promise<NextResponse<ImportResponse | { error: string }>> {
  try {
    const body = (await request.json()) as ImportRequestBody;
    const { entityType, rows } = body;

    // Validate request
    if (!entityType || typeof entityType !== "string") {
      return NextResponse.json(
        { error: "entityType is required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "rows must be a non-empty array" },
        { status: 400 },
      );
    }

    // Get schema
    const schema = getImportSchema(entityType);
    if (!schema) {
      return NextResponse.json(
        { error: `Unknown entity type: ${entityType}` },
        { status: 400 },
      );
    }

    // Validate each row against the schema
    const valid: ParsedRow[] = [];
    const invalid: InvalidRow[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowErrors: string[] = [];
      const mappedData: Record<string, string> = {};

      for (const field of schema.fields) {
        const value = (row[field.field] ?? "").trim();
        mappedData[field.field] = value;

        if (field.required && !value) {
          rowErrors.push(`"${field.label}" is required`);
          continue;
        }

        if (value && field.validate) {
          const error = field.validate(value);
          if (error) {
            rowErrors.push(`"${field.label}": ${error}`);
          }
        }
      }

      if (rowErrors.length > 0) {
        invalid.push({ row: i + 1, errors: rowErrors });
      } else {
        valid.push({ rowIndex: i, data: mappedData });
      }
    }

    // TODO: Actual DB insertion will be added with Prisma migration.
    // For now, we validate and return the results.

    const response: ImportResponse = {
      success: true,
      entityType,
      valid,
      invalid,
      totalValid: valid.length,
      totalInvalid: invalid.length,
      message: `Validated ${rows.length} rows: ${valid.length} valid, ${invalid.length} invalid`,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
