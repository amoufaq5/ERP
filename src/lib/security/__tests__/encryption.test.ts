import { describe, it, expect } from 'vitest';
import { FieldEncryptionService } from '../encryption';
import type { EncryptionServiceConfig } from '../encryption';
import crypto from 'crypto';

function createTestConfig(overrides?: Partial<EncryptionServiceConfig>): EncryptionServiceConfig {
  return {
    keys: [
      {
        id: 'key-1',
        masterKey: crypto.randomBytes(32).toString('hex'),
        active: true,
      },
    ],
    defaultKeyId: 'key-1',
    ...overrides,
  };
}

describe('FieldEncryptionService', () => {
  // ===========================================================================
  // Encrypt / Decrypt Round-Trip
  // ===========================================================================

  describe('encrypt and decrypt round-trip', () => {
    it('encrypts and decrypts a string correctly', () => {
      const config = createTestConfig();
      const service = new FieldEncryptionService(config);

      const plaintext = 'sensitive-ssn-123-45-6789';
      const encrypted = service.encrypt(plaintext, 'ssn');
      const decrypted = service.decrypt(encrypted, 'ssn');

      expect(decrypted).toBe(plaintext);
    });

    it('returns the same value for empty/falsy inputs', () => {
      const config = createTestConfig();
      const service = new FieldEncryptionService(config);

      expect(service.encrypt('', 'ssn')).toBe('');
      expect(service.decrypt('', 'ssn')).toBe('');
    });

    it('handles special characters and unicode', () => {
      const config = createTestConfig();
      const service = new FieldEncryptionService(config);

      const unicodeText = 'Hello 世界! Diacritics: café -- emoji: \u{1F600}';
      const encrypted = service.encrypt(unicodeText, 'notes');
      const decrypted = service.decrypt(encrypted, 'notes');

      expect(decrypted).toBe(unicodeText);
    });

    it('produces ciphertext in the expected version:keyId:iv:authTag:data format', () => {
      const config = createTestConfig();
      const service = new FieldEncryptionService(config);

      const encrypted = service.encrypt('test', 'field');
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(5);
      expect(parts[0]).toBe('1'); // version
      expect(parts[1]).toBe('key-1'); // keyId
    });
  });

  // ===========================================================================
  // Different field names produce different ciphertexts
  // ===========================================================================

  describe('field-specific encryption', () => {
    it('different field names produce different ciphertexts', () => {
      const config = createTestConfig();
      const service = new FieldEncryptionService(config);

      const plaintext = 'same-data-for-both';
      const encrypted1 = service.encrypt(plaintext, 'ssn');
      const encrypted2 = service.encrypt(plaintext, 'bankAccount');

      // The ciphertext portion (last part) should differ because
      // derived keys are different per field
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to the same value using the correct field name
      expect(service.decrypt(encrypted1, 'ssn')).toBe(plaintext);
      expect(service.decrypt(encrypted2, 'bankAccount')).toBe(plaintext);
    });

    it('decrypting with wrong field name fails', () => {
      const config = createTestConfig();
      const service = new FieldEncryptionService(config);

      const encrypted = service.encrypt('secret', 'ssn');
      expect(() => service.decrypt(encrypted, 'bankAccount')).toThrow();
    });
  });

  // ===========================================================================
  // Tampered Ciphertext
  // ===========================================================================

  describe('tamper detection', () => {
    it('fails decryption when ciphertext is tampered', () => {
      const config = createTestConfig();
      const service = new FieldEncryptionService(config);

      const encrypted = service.encrypt('secret-data', 'ssn');
      const parts = encrypted.split(':');

      // Tamper with the ciphertext portion (last part)
      const tamperedData = Buffer.from(parts[4], 'base64');
      tamperedData[0] = tamperedData[0] ^ 0xff; // flip bits
      parts[4] = tamperedData.toString('base64');
      const tampered = parts.join(':');

      expect(() => service.decrypt(tampered, 'ssn')).toThrow();
    });

    it('fails decryption when auth tag is tampered', () => {
      const config = createTestConfig();
      const service = new FieldEncryptionService(config);

      const encrypted = service.encrypt('secret-data', 'ssn');
      const parts = encrypted.split(':');

      // Tamper with the auth tag (4th part)
      const tamperedTag = Buffer.from(parts[3], 'base64');
      tamperedTag[0] = tamperedTag[0] ^ 0xff;
      parts[3] = tamperedTag.toString('base64');
      const tampered = parts.join(':');

      expect(() => service.decrypt(tampered, 'ssn')).toThrow();
    });
  });

  // ===========================================================================
  // Key Rotation
  // ===========================================================================

  describe('key rotation', () => {
    it('rotates encrypted data from old key to new key', () => {
      const masterKey1 = crypto.randomBytes(32).toString('hex');
      const masterKey2 = crypto.randomBytes(32).toString('hex');

      const config: EncryptionServiceConfig = {
        keys: [
          { id: 'old-key', masterKey: masterKey1, active: true },
        ],
        defaultKeyId: 'old-key',
      };

      const service = new FieldEncryptionService(config);
      const encrypted = service.encrypt('my-ssn-data', 'ssn');

      // Verify it was encrypted with old key
      expect(service.getKeyId(encrypted)).toBe('old-key');

      // Add new key and set it as active
      service.addKey({ id: 'new-key', masterKey: masterKey2 });
      service.setActiveKey('new-key');

      // Rotate the encrypted value
      const rotated = service.rotateKey(encrypted, 'ssn');

      // Verify it is now encrypted with the new key
      expect(service.getKeyId(rotated)).toBe('new-key');

      // Verify decryption still works
      const decrypted = service.decrypt(rotated, 'ssn');
      expect(decrypted).toBe('my-ssn-data');
    });

    it('old key can still decrypt data encrypted with it', () => {
      const masterKey1 = crypto.randomBytes(32).toString('hex');
      const masterKey2 = crypto.randomBytes(32).toString('hex');

      const service = new FieldEncryptionService({
        keys: [
          { id: 'key-a', masterKey: masterKey1 },
          { id: 'key-b', masterKey: masterKey2 },
        ],
        defaultKeyId: 'key-a',
      });

      // Encrypt with key-a
      const encrypted = service.encrypt('data', 'field');

      // Switch to key-b
      service.setActiveKey('key-b');

      // key-a data should still decrypt
      const decrypted = service.decrypt(encrypted, 'field');
      expect(decrypted).toBe('data');
    });
  });

  // ===========================================================================
  // Batch Operations
  // ===========================================================================

  describe('batch operations', () => {
    it('encrypts and decrypts multiple fields', () => {
      const config = createTestConfig();
      const service = new FieldEncryptionService(config);

      const fields = {
        ssn: '123-45-6789',
        bankAccount: 'ACCT-9999',
        taxId: 'TAX-001',
      };

      const encrypted = service.encryptBatch(fields);
      expect(service.isEncrypted(encrypted.ssn)).toBe(true);
      expect(service.isEncrypted(encrypted.bankAccount)).toBe(true);

      const decrypted = service.decryptBatch(encrypted);
      expect(decrypted.ssn).toBe('123-45-6789');
      expect(decrypted.bankAccount).toBe('ACCT-9999');
      expect(decrypted.taxId).toBe('TAX-001');
    });
  });

  // ===========================================================================
  // isEncrypted
  // ===========================================================================

  describe('isEncrypted', () => {
    it('returns true for encrypted values', () => {
      const config = createTestConfig();
      const service = new FieldEncryptionService(config);
      const encrypted = service.encrypt('data', 'field');
      expect(service.isEncrypted(encrypted)).toBe(true);
    });

    it('returns false for plain values', () => {
      const config = createTestConfig();
      const service = new FieldEncryptionService(config);
      expect(service.isEncrypted('just plain text')).toBe(false);
      expect(service.isEncrypted('')).toBe(false);
    });
  });
});
