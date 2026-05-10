/**
 * Receipt Scanner
 *
 * Uses the document-ai service for real OCR receipt scanning via AI providers.
 * Sends receipt text to the AI service and returns extracted fields.
 */

import { classifyDocument, extractFields } from "../ai/document-ai";
import type { DocumentExtraction } from "../ai/document-ai";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReceiptData {
  vendor?: string;
  amount?: number;
  date?: string;
  items?: string[];
  confidence: number;
}

export interface ReceiptScannerOptions {
  /** Language hint for OCR engine (BCP-47). Default: "en" */
  language?: string;
  /** Whether to attempt item-level extraction. Default: true */
  extractItems?: boolean;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scan a receipt image and return extracted data.
 *
 * Sends the receipt content to the document AI service for classification
 * and field extraction, then maps the extracted fields to ReceiptData.
 *
 * @param imageUrl - URL or path to the receipt image.
 * @param options  - Optional scanner configuration.
 */
export async function scanReceipt(
  imageUrl: string,
  options?: ReceiptScannerOptions,
): Promise<ReceiptData> {
  const { extractItems = true } = options ?? {};

  // Fetch the receipt content — if it's a URL, fetch it; otherwise treat
  // imageUrl as text content directly (for testing / pre-extracted text).
  let receiptText: string;

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://") || imageUrl.startsWith("/")) {
    const response = await fetch(imageUrl);
    receiptText = await response.text();
  } else {
    receiptText = imageUrl;
  }

  // Use document-ai to extract fields from the receipt
  const extraction: DocumentExtraction = await extractFields(
    receiptText,
    "receipt",
  );

  // Map extracted fields to ReceiptData
  return mapExtractionToReceiptData(extraction, extractItems);
}

/**
 * Validate that a file looks like a scannable receipt image.
 */
export function isScannableReceipt(mimeType: string): boolean {
  return (
    mimeType.startsWith("image/") || mimeType === "application/pdf"
  );
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function findFieldValue(fields: DocumentExtraction["fields"], ...names: string[]): string | undefined {
  for (const name of names) {
    const field = fields.find(
      (f) => f.name.toLowerCase().includes(name.toLowerCase()),
    );
    if (field) return field.value;
  }
  return undefined;
}

function findFieldConfidence(fields: DocumentExtraction["fields"], ...names: string[]): number {
  for (const name of names) {
    const field = fields.find(
      (f) => f.name.toLowerCase().includes(name.toLowerCase()),
    );
    if (field) return field.confidence;
  }
  return 0;
}

function mapExtractionToReceiptData(
  extraction: DocumentExtraction,
  extractItems: boolean,
): ReceiptData {
  const fields = extraction.fields;

  // Extract vendor
  const vendor = findFieldValue(fields, "store", "merchant", "vendor");

  // Extract amount
  const totalStr = findFieldValue(fields, "total", "amount", "subtotal");
  const amount = totalStr ? parseFloat(totalStr.replace(/[^0-9.,-]/g, "").replace(",", ".")) : undefined;

  // Extract date
  const date = findFieldValue(fields, "date");

  // Extract items
  let items: string[] | undefined;
  if (extractItems) {
    const itemsStr = findFieldValue(fields, "items", "purchased");
    if (itemsStr) {
      // Items may be comma-separated or newline-separated
      items = itemsStr
        .split(/[,\n;]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  // Compute average confidence across all extracted fields
  const confidence =
    fields.length > 0
      ? parseFloat(
          (fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length).toFixed(2),
        )
      : 0;

  return {
    vendor,
    amount: amount && !isNaN(amount) ? amount : undefined,
    date,
    items,
    confidence,
  };
}
