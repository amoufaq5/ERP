// ─── Input sanitization utilities ───────────────────────────────────────────

/**
 * Trim whitespace, remove null bytes, and enforce a maximum length.
 */
export function sanitizeString(input: string, maxLength = 1000): string {
  return input
    .replace(/\0/g, "")   // strip null bytes
    .trim()
    .slice(0, maxLength);
}

/**
 * Strip HTML tags using a basic regex (no library dependency).
 * This is intentionally simple — for rendering, always use framework escaping.
 */
export function sanitizeHTML(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

/**
 * Normalise an email address: lowercase and trim whitespace.
 */
export function sanitizeEmail(input: string): string {
  return input.toLowerCase().trim();
}

/**
 * Keep only digits, +, -, spaces, and parentheses in a phone number.
 */
export function sanitizePhone(input: string): string {
  return input.replace(/[^\d+\-\s()]/g, "").trim();
}

/**
 * Parse a string or number into a finite number and clamp it to [min, max].
 * Returns 0 when the input is not a valid number.
 */
export function sanitizeNumber(
  input: string | number,
  min?: number,
  max?: number,
): number {
  let num = typeof input === "string" ? parseFloat(input) : input;
  if (!Number.isFinite(num)) return 0;
  if (min !== undefined && num < min) num = min;
  if (max !== undefined && num > max) num = max;
  return num;
}

/**
 * Escape characters that have special meaning inside a RegExp.
 */
export function escapeForRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
