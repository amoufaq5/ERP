import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DocumentExtraction } from '../../ai/document-ai';

// Mock the document-ai module before importing the module under test
vi.mock('../../ai/document-ai', () => ({
  classifyDocument: vi.fn(),
  extractFields: vi.fn(),
}));

import { scanReceipt, isScannableReceipt } from '../receipt-scanner';
import { extractFields } from '../../ai/document-ai';

const mockExtractFields = vi.mocked(extractFields);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeExtraction(fields: DocumentExtraction['fields']): DocumentExtraction {
  return {
    documentType: 'receipt',
    fields,
    rawText: 'receipt text',
    metadata: {
      language: 'en',
      pageCount: 1,
      extractedAt: '2024-06-15T10:00:00.000Z',
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('receipt-scanner', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockReset();
  });

  // ── isScannableReceipt ─────────────────────────────────────────────────

  describe('isScannableReceipt', () => {
    it('returns true for image MIME types', () => {
      expect(isScannableReceipt('image/jpeg')).toBe(true);
      expect(isScannableReceipt('image/png')).toBe(true);
      expect(isScannableReceipt('image/gif')).toBe(true);
      expect(isScannableReceipt('image/webp')).toBe(true);
    });

    it('returns true for PDF', () => {
      expect(isScannableReceipt('application/pdf')).toBe(true);
    });

    it('returns false for non-image/non-PDF', () => {
      expect(isScannableReceipt('application/json')).toBe(false);
      expect(isScannableReceipt('text/plain')).toBe(false);
      expect(isScannableReceipt('application/xml')).toBe(false);
    });
  });

  // ── scanReceipt ────────────────────────────────────────────────────────

  describe('scanReceipt', () => {
    it('extracts vendor, amount, date, and items from receipt text', async () => {
      mockExtractFields.mockResolvedValue(
        makeExtraction([
          { name: 'Store/Merchant Name', value: 'ACME Pharmacy', confidence: 0.95 },
          { name: 'Total', value: '$42.50', confidence: 0.9 },
          { name: 'Date', value: '2024-06-15', confidence: 0.85 },
          { name: 'Items Purchased', value: 'Aspirin, Bandages, Vitamins', confidence: 0.8 },
        ]),
      );

      const result = await scanReceipt('This is receipt text content');

      expect(result.vendor).toBe('ACME Pharmacy');
      expect(result.amount).toBe(42.5);
      expect(result.date).toBe('2024-06-15');
      expect(result.items).toEqual(['Aspirin', 'Bandages', 'Vitamins']);
      expect(result.confidence).toBeCloseTo(0.88, 1);
    });

    it('handles text content directly (non-URL)', async () => {
      mockExtractFields.mockResolvedValue(makeExtraction([]));

      await scanReceipt('plain receipt text');

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(mockExtractFields).toHaveBeenCalledWith('plain receipt text', 'receipt');
    });

    it('fetches content when URL provided', async () => {
      fetchSpy.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('fetched receipt text'),
        } as Response),
      );
      mockExtractFields.mockResolvedValue(makeExtraction([]));

      await scanReceipt('https://example.com/receipt.jpg');

      expect(fetchSpy).toHaveBeenCalledWith('https://example.com/receipt.jpg');
      expect(mockExtractFields).toHaveBeenCalledWith('fetched receipt text', 'receipt');
    });

    it('fetches content when path (starts with /) provided', async () => {
      fetchSpy.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('path-based receipt'),
        } as Response),
      );
      mockExtractFields.mockResolvedValue(makeExtraction([]));

      await scanReceipt('/uploads/receipt.png');

      expect(fetchSpy).toHaveBeenCalledWith('/uploads/receipt.png');
    });

    it('handles missing fields gracefully', async () => {
      mockExtractFields.mockResolvedValue(makeExtraction([]));

      const result = await scanReceipt('empty receipt');

      expect(result.vendor).toBeUndefined();
      expect(result.amount).toBeUndefined();
      expect(result.date).toBeUndefined();
      expect(result.items).toBeUndefined();
      expect(result.confidence).toBe(0);
    });

    it('parses amount with currency symbols', async () => {
      mockExtractFields.mockResolvedValue(
        makeExtraction([
          { name: 'Total Amount', value: '$234.56', confidence: 0.9 },
        ]),
      );

      const result = await scanReceipt('receipt');
      expect(result.amount).toBe(234.56);
    });

    it('parses amount with comma as decimal separator', async () => {
      // The parser replaces commas with dots (European format)
      mockExtractFields.mockResolvedValue(
        makeExtraction([
          { name: 'Total Amount', value: 'EUR 42,50', confidence: 0.9 },
        ]),
      );

      const result = await scanReceipt('receipt');
      expect(result.amount).toBe(42.5);
    });

    it('handles NaN amount gracefully', async () => {
      mockExtractFields.mockResolvedValue(
        makeExtraction([
          { name: 'Total', value: 'N/A', confidence: 0.5 },
        ]),
      );

      const result = await scanReceipt('receipt');
      expect(result.amount).toBeUndefined();
    });

    it('skips item extraction when extractItems is false', async () => {
      mockExtractFields.mockResolvedValue(
        makeExtraction([
          { name: 'Items Purchased', value: 'Item A, Item B', confidence: 0.8 },
        ]),
      );

      const result = await scanReceipt('receipt', { extractItems: false });
      expect(result.items).toBeUndefined();
    });

    it('parses semicolon-separated items', async () => {
      mockExtractFields.mockResolvedValue(
        makeExtraction([
          { name: 'Items Purchased', value: 'Aspirin;Bandages;Cream', confidence: 0.8 },
        ]),
      );

      const result = await scanReceipt('receipt');
      expect(result.items).toEqual(['Aspirin', 'Bandages', 'Cream']);
    });

    it('parses newline-separated items', async () => {
      mockExtractFields.mockResolvedValue(
        makeExtraction([
          { name: 'Items Purchased', value: 'Aspirin\nBandages\nCream', confidence: 0.8 },
        ]),
      );

      const result = await scanReceipt('receipt');
      expect(result.items).toEqual(['Aspirin', 'Bandages', 'Cream']);
    });

    it('finds vendor via alternate field names (merchant, vendor)', async () => {
      mockExtractFields.mockResolvedValue(
        makeExtraction([
          { name: 'Vendor Name', value: 'MedCorp', confidence: 0.9 },
        ]),
      );

      const result = await scanReceipt('receipt');
      expect(result.vendor).toBe('MedCorp');
    });

    it('finds amount via alternate field names (subtotal)', async () => {
      mockExtractFields.mockResolvedValue(
        makeExtraction([
          { name: 'Subtotal', value: '99.99', confidence: 0.85 },
        ]),
      );

      const result = await scanReceipt('receipt');
      expect(result.amount).toBe(99.99);
    });

    it('computes average confidence across fields', async () => {
      mockExtractFields.mockResolvedValue(
        makeExtraction([
          { name: 'Date', value: '2024-01-01', confidence: 0.8 },
          { name: 'Total', value: '100', confidence: 1.0 },
        ]),
      );

      const result = await scanReceipt('receipt');
      expect(result.confidence).toBe(0.9);
    });
  });
});
