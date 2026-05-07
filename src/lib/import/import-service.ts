// CSV and Excel parsing + validation service for bulk data import.

import * as XLSX from "xlsx";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
  errors: string[];
}

export interface ImportFieldSchema {
  /** The target field name in the entity */
  field: string;
  /** Human-readable label shown in the mapper UI */
  label: string;
  /** Whether this field is required */
  required: boolean;
  /** Custom validator — return error message string or null if valid */
  validate?: (value: string) => string | null;
  /** Optional list of allowed values (shown in template as hint) */
  allowedValues?: readonly string[] | string[];
}

export interface ImportSchema {
  /** Entity type identifier (e.g. "doctor", "territory") */
  entityType: string;
  /** Human-readable entity name */
  entityLabel: string;
  /** Field definitions */
  fields: ImportFieldSchema[];
}

export interface ParsedRow {
  rowIndex: number;
  data: Record<string, string>;
}

export interface InvalidRow {
  row: number;
  errors: string[];
}

export interface ValidationResult {
  valid: ParsedRow[];
  invalid: InvalidRow[];
  totalValid: number;
  totalInvalid: number;
}

// ─── CSV Parsing ────────────────────────────────────────────────────────────

/**
 * Parse a CSV file into structured data.
 * Handles quoted values, newlines within quotes, and BOM markers.
 */
export async function parseCSV(file: File): Promise<ParsedData> {
  const errors: string[] = [];

  try {
    let text = await file.text();

    // Strip BOM if present
    if (text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1);
    }

    const workbook = XLSX.read(text, { type: "string" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { headers: [], rows: [], rowCount: 0, errors: ["CSV file is empty"] };
    }

    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
    });

    if (jsonData.length === 0) {
      return { headers: [], rows: [], rowCount: 0, errors: ["No data rows found in CSV"] };
    }

    const headers = Object.keys(jsonData[0]);
    const rows = jsonData.map((row) => {
      const record: Record<string, string> = {};
      for (const key of headers) {
        record[key] = String(row[key] ?? "");
      }
      return record;
    });

    return { headers, rows, rowCount: rows.length, errors };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse CSV";
    return { headers: [], rows: [], rowCount: 0, errors: [message] };
  }
}

// ─── Excel Parsing ──────────────────────────────────────────────────────────

/**
 * Parse an XLSX file into structured data.
 * Uses the first sheet of the workbook.
 */
export async function parseExcel(file: File): Promise<ParsedData> {
  const errors: string[] = [];

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { headers: [], rows: [], rowCount: 0, errors: ["Excel file has no sheets"] };
    }

    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
    });

    if (jsonData.length === 0) {
      return { headers: [], rows: [], rowCount: 0, errors: ["No data rows found in Excel file"] };
    }

    const headers = Object.keys(jsonData[0]);
    const rows = jsonData.map((row) => {
      const record: Record<string, string> = {};
      for (const key of headers) {
        record[key] = String(row[key] ?? "");
      }
      return record;
    });

    return { headers, rows, rowCount: rows.length, errors };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse Excel file";
    return { headers: [], rows: [], rowCount: 0, errors: [message] };
  }
}

// ─── Auto-detect and parse ──────────────────────────────────────────────────

/**
 * Auto-detect file type and parse accordingly.
 */
export async function parseFile(file: File): Promise<ParsedData> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    return parseExcel(file);
  }
  return parseCSV(file);
}

// ─── Validation ─────────────────────────────────────────────────────────────

/**
 * Validate parsed data against an import schema using a column mapping.
 *
 * @param data - The parsed file data
 * @param schema - The import schema defining required fields and validators
 * @param columnMapping - Maps source column headers to target field names
 */
export function validateImport(
  data: ParsedData,
  schema: ImportSchema,
  columnMapping: Record<string, string> = {},
): ValidationResult {
  const valid: ParsedRow[] = [];
  const invalid: InvalidRow[] = [];

  // Build reverse mapping: target field -> source column
  const fieldToSource: Record<string, string> = {};
  for (const [source, target] of Object.entries(columnMapping)) {
    if (target) {
      fieldToSource[target] = source;
    }
  }

  // If no mapping provided, try direct header match
  if (Object.keys(columnMapping).length === 0) {
    for (const header of data.headers) {
      const matchedField = schema.fields.find(
        (f) => f.field.toLowerCase() === header.toLowerCase() || f.label.toLowerCase() === header.toLowerCase(),
      );
      if (matchedField) {
        fieldToSource[matchedField.field] = header;
      }
    }
  }

  for (let i = 0; i < data.rows.length; i++) {
    const row = data.rows[i];
    const rowErrors: string[] = [];
    const mappedData: Record<string, string> = {};

    for (const fieldSchema of schema.fields) {
      const sourceCol = fieldToSource[fieldSchema.field];
      const value = sourceCol ? (row[sourceCol] ?? "").trim() : "";
      mappedData[fieldSchema.field] = value;

      // Required check
      if (fieldSchema.required && !value) {
        rowErrors.push(`"${fieldSchema.label}" is required`);
        continue;
      }

      // Custom validation (only if value is present)
      if (value && fieldSchema.validate) {
        const error = fieldSchema.validate(value);
        if (error) {
          rowErrors.push(`"${fieldSchema.label}": ${error}`);
        }
      }
    }

    if (rowErrors.length > 0) {
      invalid.push({ row: i + 1, errors: rowErrors });
    } else {
      valid.push({ rowIndex: i, data: mappedData });
    }
  }

  return {
    valid,
    invalid,
    totalValid: valid.length,
    totalInvalid: invalid.length,
  };
}

// ─── Fuzzy Column Matching ──────────────────────────────────────────────────

/**
 * Compute a simple similarity score between two strings.
 * Returns a number between 0 and 1.
 */
function similarity(a: string, b: string): number {
  const sa = a.toLowerCase().replace(/[^a-z0-9]/g, "");
  const sb = b.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (sa === sb) return 1;
  if (sa.length === 0 || sb.length === 0) return 0;

  // Check if one contains the other
  if (sa.includes(sb) || sb.includes(sa)) return 0.8;

  // Levenshtein-based similarity
  const maxLen = Math.max(sa.length, sb.length);
  const dist = levenshtein(sa, sb);
  return 1 - dist / maxLen;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/**
 * Auto-match source headers to schema fields using fuzzy matching.
 * Returns a mapping of source header -> target field name.
 */
export function autoMatchColumns(
  headers: string[],
  schema: ImportSchema,
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const usedFields = new Set<string>();

  // First pass: exact matches
  for (const header of headers) {
    for (const field of schema.fields) {
      if (usedFields.has(field.field)) continue;
      const headerLower = header.toLowerCase().replace(/[^a-z0-9]/g, "");
      const fieldLower = field.field.toLowerCase().replace(/[^a-z0-9]/g, "");
      const labelLower = field.label.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (headerLower === fieldLower || headerLower === labelLower) {
        mapping[header] = field.field;
        usedFields.add(field.field);
        break;
      }
    }
  }

  // Second pass: fuzzy matches for unmatched headers
  const THRESHOLD = 0.6;
  for (const header of headers) {
    if (mapping[header]) continue;

    let bestField = "";
    let bestScore = 0;

    for (const field of schema.fields) {
      if (usedFields.has(field.field)) continue;

      const scoreField = similarity(header, field.field);
      const scoreLabel = similarity(header, field.label);
      const score = Math.max(scoreField, scoreLabel);

      if (score > bestScore && score >= THRESHOLD) {
        bestScore = score;
        bestField = field.field;
      }
    }

    if (bestField) {
      mapping[header] = bestField;
      usedFields.add(bestField);
    } else {
      mapping[header] = "";
    }
  }

  return mapping;
}
