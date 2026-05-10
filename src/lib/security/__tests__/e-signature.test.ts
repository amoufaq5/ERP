import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before importing the module
vi.mock('@/lib/prisma', () => ({
  default: {
    $executeRaw: vi.fn().mockResolvedValue(0),
    $queryRaw: vi.fn().mockResolvedValue([]),
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}));

import {
  ElectronicSignatureService,
  SignatureMeaning,
  SignatureStatus,
  computeDocumentHash,
  SignatureAuthenticationError,
} from '../e-signature';
import type {
  SignatureCreateInput,
  CounterSignatureInput,
} from '../e-signature';

// Always-true password verifier for testing
const alwaysVerify = async () => true;
// Always-false password verifier for testing
const neverVerify = async () => false;

function createSignInput(overrides?: Partial<SignatureCreateInput>): SignatureCreateInput {
  return {
    signerId: 'signer-1',
    signerName: 'Jane Doe',
    signerRole: 'QA Manager',
    documentType: 'BatchRecord',
    documentId: 'batch-001',
    documentData: { product: 'Widget A', quantity: 100, status: 'approved' },
    meaning: SignatureMeaning.APPROVED,
    ipAddress: '192.168.1.1',
    password: 'correct-password',
    ...overrides,
  };
}

describe('ElectronicSignatureService', () => {
  let service: ElectronicSignatureService;

  beforeEach(() => {
    service = new ElectronicSignatureService(alwaysVerify);
  });

  // ===========================================================================
  // Sign and Verify
  // ===========================================================================

  describe('sign and verify', () => {
    it('signs a document and returns a valid signature record', async () => {
      const input = createSignInput();
      const sig = await service.sign(input);

      expect(sig.id).toBeDefined();
      expect(sig.signerId).toBe('signer-1');
      expect(sig.signerName).toBe('Jane Doe');
      expect(sig.meaning).toBe(SignatureMeaning.APPROVED);
      expect(sig.status).toBe(SignatureStatus.VALID);
      expect(sig.verified).toBe(true);
      expect(sig.documentHash).toBeDefined();
      expect(sig.signatureDigest).toBeDefined();
    });

    it('verifies a signature against unchanged document data', async () => {
      const input = createSignInput();
      const sig = await service.sign(input);

      const result = await service.verify(
        sig.id,
        input.documentData,
        '192.168.1.1',
      );

      expect(result.valid).toBe(true);
      expect(result.signature).toBeDefined();
      expect(result.signature?.id).toBe(sig.id);
    });

    it('fails signing when password verification fails', async () => {
      const failService = new ElectronicSignatureService(neverVerify);
      const input = createSignInput();

      await expect(failService.sign(input)).rejects.toThrow(SignatureAuthenticationError);
    });
  });

  // ===========================================================================
  // Tamper Detection
  // ===========================================================================

  describe('tamper detection', () => {
    it('detects tampering when document data is modified', async () => {
      const input = createSignInput();
      const sig = await service.sign(input);

      // Tamper with the document
      const tamperedData = { ...input.documentData, quantity: 999 };

      const result = await service.verify(
        sig.id,
        tamperedData,
        '192.168.1.1',
      );

      expect(result.valid).toBe(false);
      expect(result.tampered).toBe(true);
      expect(result.reason).toContain('tamper');
    });

    it('returns not found for non-existent signature', async () => {
      const result = await service.verify(
        'nonexistent-sig-id',
        { data: 'any' },
        '192.168.1.1',
      );

      expect(result.valid).toBe(false);
      expect(result.signature).toBeNull();
      expect(result.reason).toContain('not found');
    });
  });

  // ===========================================================================
  // Revocation
  // ===========================================================================

  describe('signature revocation', () => {
    it('revokes a signature and fails verification afterwards', async () => {
      const input = createSignInput();
      const sig = await service.sign(input);

      await service.revoke({
        signatureId: sig.id,
        revokedBy: 'admin-1',
        reason: 'Incorrect approval',
        ipAddress: '192.168.1.2',
      });

      const result = await service.verify(
        sig.id,
        input.documentData,
        '192.168.1.1',
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('revoked');
    });

    it('throws when revoking a non-existent signature', async () => {
      await expect(
        service.revoke({
          signatureId: 'nonexistent',
          revokedBy: 'admin-1',
          reason: 'test',
          ipAddress: '192.168.1.1',
        }),
      ).rejects.toThrow('not found');
    });

    it('throws when revoking an already revoked signature', async () => {
      const sig = await service.sign(createSignInput());

      await service.revoke({
        signatureId: sig.id,
        revokedBy: 'admin-1',
        reason: 'first revocation',
        ipAddress: '192.168.1.1',
      });

      await expect(
        service.revoke({
          signatureId: sig.id,
          revokedBy: 'admin-1',
          reason: 'second attempt',
          ipAddress: '192.168.1.1',
        }),
      ).rejects.toThrow('already been revoked');
    });
  });

  // ===========================================================================
  // Counter-Signing
  // ===========================================================================

  describe('counter-signing', () => {
    it('creates a counter-signature linked to the original', async () => {
      const original = await service.sign(createSignInput());

      const counterInput: CounterSignatureInput = {
        signerId: 'signer-2',
        signerName: 'John Smith',
        signerRole: 'Director',
        documentType: 'BatchRecord',
        documentId: 'batch-001',
        documentData: { product: 'Widget A', quantity: 100, status: 'approved' },
        meaning: SignatureMeaning.WITNESSED,
        ipAddress: '192.168.1.3',
        password: 'correct',
        originalSignatureId: original.id,
      };

      const counter = await service.counterSign(counterInput);

      expect(counter.counterSignatureOf).toBe(original.id);
      expect(counter.signerId).toBe('signer-2');
      expect(counter.status).toBe(SignatureStatus.VALID);
    });

    it('prevents self-counter-signing', async () => {
      const original = await service.sign(createSignInput());

      const counterInput: CounterSignatureInput = {
        ...createSignInput(),
        signerId: 'signer-1', // same as original
        originalSignatureId: original.id,
      };

      await expect(service.counterSign(counterInput)).rejects.toThrow(
        'Counter-signer must be different',
      );
    });

    it('retrieves counter-signatures for a signature', async () => {
      const original = await service.sign(createSignInput());

      await service.counterSign({
        signerId: 'signer-2',
        signerName: 'Witness A',
        signerRole: 'Witness',
        documentType: 'BatchRecord',
        documentId: 'batch-001',
        documentData: { product: 'Widget A', quantity: 100, status: 'approved' },
        meaning: SignatureMeaning.WITNESSED,
        ipAddress: '192.168.1.3',
        password: 'pw',
        originalSignatureId: original.id,
      });

      const counters = service.getCounterSignatures(original.id);
      expect(counters).toHaveLength(1);
      expect(counters[0].counterSignatureOf).toBe(original.id);
    });
  });

  // ===========================================================================
  // Manifest Generation
  // ===========================================================================

  describe('manifest generation', () => {
    it('generates a manifest with all signatures and audit trail', async () => {
      const input = createSignInput();
      await service.sign(input);

      const manifest = await service.generateManifest(
        'BatchRecord',
        'batch-001',
        input.documentData,
        'admin-user',
      );

      expect(manifest.documentType).toBe('BatchRecord');
      expect(manifest.documentId).toBe('batch-001');
      expect(manifest.generatedBy).toBe('admin-user');
      expect(manifest.signatures.length).toBeGreaterThanOrEqual(1);
      expect(manifest.auditTrail.length).toBeGreaterThanOrEqual(1);
      expect(manifest.integrityHash).toBeDefined();
      expect(manifest.integrityHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('verifies manifest integrity', async () => {
      const input = createSignInput();
      await service.sign(input);

      const manifest = await service.generateManifest(
        'BatchRecord',
        'batch-001',
        input.documentData,
        'admin-user',
      );

      expect(service.verifyManifestIntegrity(manifest)).toBe(true);
    });

    it('detects tampered manifest', async () => {
      const input = createSignInput();
      await service.sign(input);

      const manifest = await service.generateManifest(
        'BatchRecord',
        'batch-001',
        input.documentData,
        'admin-user',
      );

      // Tamper with the manifest
      manifest.documentId = 'batch-TAMPERED';

      expect(service.verifyManifestIntegrity(manifest)).toBe(false);
    });
  });

  // ===========================================================================
  // Document Hashing
  // ===========================================================================

  describe('computeDocumentHash', () => {
    it('produces consistent hashes for same data', () => {
      const data = { a: 1, b: 'hello', c: true };
      const hash1 = computeDocumentHash(data);
      const hash2 = computeDocumentHash(data);
      expect(hash1).toBe(hash2);
    });

    it('produces consistent hashes regardless of key order', () => {
      const data1 = { b: 2, a: 1 };
      const data2 = { a: 1, b: 2 };
      expect(computeDocumentHash(data1)).toBe(computeDocumentHash(data2));
    });

    it('produces different hashes for different data', () => {
      const hash1 = computeDocumentHash({ value: 1 });
      const hash2 = computeDocumentHash({ value: 2 });
      expect(hash1).not.toBe(hash2);
    });
  });
});
