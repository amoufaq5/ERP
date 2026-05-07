/**
 * Receipt Scanner (Mock OCR)
 *
 * Placeholder module that simulates OCR receipt scanning.
 * Returns mock data based on filename patterns.
 *
 * Ready for integration with Google Vision API, Tesseract.js, or any other
 * OCR provider by replacing the implementation of `scanReceipt`.
 */

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
// Mock vendor catalogue (used to generate plausible results)
// ---------------------------------------------------------------------------

const MOCK_VENDORS: Record<string, { vendor: string; items: string[] }> = {
  restaurant: {
    vendor: "Al Baik Restaurant",
    items: ["Chicken Meal", "Garlic Sauce", "Pepsi"],
  },
  hotel: {
    vendor: "Hilton Hotel Riyadh",
    items: ["Room charge - 2 nights", "Minibar", "Parking"],
  },
  office: {
    vendor: "Jarir Bookstore",
    items: ["A4 Paper (5 reams)", "Ink Cartridge", "Stapler"],
  },
  fuel: {
    vendor: "Saudi Aramco Station",
    items: ["Unleaded 91 - 45L"],
  },
  pharmacy: {
    vendor: "Al-Nahdi Pharmacy",
    items: ["Panadol Extra", "Vitamin D3", "Hand Sanitizer"],
  },
  grocery: {
    vendor: "Panda Supermarket",
    items: ["Bottled Water x12", "Snacks", "Coffee"],
  },
  travel: {
    vendor: "Saudi Airlines (Saudia)",
    items: ["One-way ticket RUH-JED", "Extra baggage 23 kg"],
  },
};

const DEFAULT_MOCK = {
  vendor: "General Store",
  items: ["Item 1", "Item 2"],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scan a receipt image and return extracted data.
 *
 * Currently returns mock data. Replace the body of this function with a real
 * OCR integration when ready.
 *
 * @param imageUrl - URL or path to the receipt image.
 * @param options  - Optional scanner configuration.
 */
export async function scanReceipt(
  imageUrl: string,
  options?: ReceiptScannerOptions,
): Promise<ReceiptData> {
  const { extractItems = true } = options ?? {};

  // Simulate network latency of a real OCR call
  await delay(800 + Math.random() * 700);

  // Determine mock data based on filename keywords
  const lower = imageUrl.toLowerCase();
  let match = DEFAULT_MOCK;

  for (const [keyword, data] of Object.entries(MOCK_VENDORS)) {
    if (lower.includes(keyword)) {
      match = data;
      break;
    }
  }

  const amount = parseFloat((Math.random() * 2000 + 50).toFixed(2));
  const daysAgo = Math.floor(Math.random() * 30);
  const date = new Date(Date.now() - daysAgo * 86400000)
    .toISOString()
    .split("T")[0];

  const confidence = parseFloat((0.7 + Math.random() * 0.25).toFixed(2));

  return {
    vendor: match.vendor,
    amount,
    date,
    items: extractItems ? match.items : undefined,
    confidence,
  };
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
