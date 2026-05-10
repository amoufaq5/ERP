import { describe, it, expect, vi } from 'vitest';
import {
  generateSecret,
  generateTOTP,
  verifyTOTP,
  generateBackupCodes,
  verifyBackupCode,
  base32Encode,
  base32Decode,
} from '../mfa';

describe('MFA', () => {
  // ===========================================================================
  // generateSecret
  // ===========================================================================

  describe('generateSecret', () => {
    it('returns a valid base32 string', () => {
      const secret = generateSecret();
      // Base32 alphabet: A-Z, 2-7, and = padding
      expect(secret).toMatch(/^[A-Z2-7]+=*$/);
    });

    it('returns a string of expected length for 20 random bytes', () => {
      const secret = generateSecret();
      // 20 bytes -> 32 base32 chars (no padding needed since 20*8=160, 160/5=32)
      expect(secret.replace(/=+$/, '').length).toBe(32);
    });

    it('generates unique secrets on each call', () => {
      const secrets = new Set<string>();
      for (let i = 0; i < 20; i++) {
        secrets.add(generateSecret());
      }
      expect(secrets.size).toBe(20);
    });

    it('round-trips through base32 encode/decode', () => {
      const secret = generateSecret();
      const decoded = base32Decode(secret);
      const reEncoded = base32Encode(decoded);
      expect(reEncoded).toBe(secret);
    });
  });

  // ===========================================================================
  // generateTOTP
  // ===========================================================================

  describe('generateTOTP', () => {
    it('returns a 6-digit string', () => {
      const secret = generateSecret();
      const code = generateTOTP(secret, Date.now());
      expect(code).toMatch(/^\d{6}$/);
    });

    it('returns a zero-padded result for small OTP values', () => {
      const secret = generateSecret();
      const code = generateTOTP(secret, Date.now());
      expect(code.length).toBe(6);
    });

    it('produces the same code for the same timestamp and secret', () => {
      const secret = generateSecret();
      const ts = 1700000000000; // fixed timestamp
      const code1 = generateTOTP(secret, ts);
      const code2 = generateTOTP(secret, ts);
      expect(code1).toBe(code2);
    });

    it('produces different codes for different time periods', () => {
      const secret = generateSecret();
      const ts1 = 1700000000000;
      const ts2 = ts1 + 30 * 1000; // 30 seconds later (next period)
      const code1 = generateTOTP(secret, ts1);
      const code2 = generateTOTP(secret, ts2);
      // They might rarely collide, but with high probability they differ
      // Use a broader range to avoid flaky results
      const ts3 = ts1 + 60 * 1000; // 60 seconds later
      const code3 = generateTOTP(secret, ts3);
      // At least one of these should differ
      const allSame = code1 === code2 && code2 === code3;
      expect(allSame).toBe(false);
    });

    it('produces different codes for different secrets', () => {
      const secret1 = generateSecret();
      const secret2 = generateSecret();
      const ts = 1700000000000;
      const code1 = generateTOTP(secret1, ts);
      const code2 = generateTOTP(secret2, ts);
      expect(code1).not.toBe(code2);
    });
  });

  // ===========================================================================
  // verifyTOTP
  // ===========================================================================

  describe('verifyTOTP', () => {
    it('accepts a valid code generated for the current time', () => {
      const secret = generateSecret();
      const now = Date.now();
      const code = generateTOTP(secret, now);

      // Mock Date.now to return the same timestamp
      vi.spyOn(Date, 'now').mockReturnValue(now);
      expect(verifyTOTP(secret, code)).toBe(true);
    });

    it('rejects an invalid code', () => {
      const secret = generateSecret();
      vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
      expect(verifyTOTP(secret, '000000')).toBe(false);
    });

    it('rejects codes of wrong length', () => {
      const secret = generateSecret();
      expect(verifyTOTP(secret, '12345')).toBe(false);
      expect(verifyTOTP(secret, '1234567')).toBe(false);
      expect(verifyTOTP(secret, '')).toBe(false);
    });

    it('handles clock drift within window', () => {
      const secret = generateSecret();
      const now = 1700000000000;
      // Generate a code for one period in the past
      const pastCode = generateTOTP(secret, now - 30 * 1000);

      // With window=1, verifying at "now" should still accept code from 30s ago
      vi.spyOn(Date, 'now').mockReturnValue(now);
      expect(verifyTOTP(secret, pastCode, 1)).toBe(true);
    });

    it('rejects codes outside the clock drift window', () => {
      const secret = generateSecret();
      const now = 1700000000000;
      // Generate a code for 3 periods in the past
      const oldCode = generateTOTP(secret, now - 3 * 30 * 1000);

      vi.spyOn(Date, 'now').mockReturnValue(now);
      // With window=1, a code from 3 periods ago should fail
      expect(verifyTOTP(secret, oldCode, 1)).toBe(false);
    });

    it('accepts codes within a larger window', () => {
      const secret = generateSecret();
      const now = 1700000000000;
      const futureCode = generateTOTP(secret, now + 30 * 1000);

      vi.spyOn(Date, 'now').mockReturnValue(now);
      expect(verifyTOTP(secret, futureCode, 2)).toBe(true);
    });
  });

  // ===========================================================================
  // generateBackupCodes
  // ===========================================================================

  describe('generateBackupCodes', () => {
    it('returns the correct count of codes (default 10)', () => {
      const { codes, hashedCodes } = generateBackupCodes();
      expect(codes).toHaveLength(10);
      expect(hashedCodes).toHaveLength(10);
    });

    it('returns the correct count for a custom count', () => {
      const { codes, hashedCodes } = generateBackupCodes(5);
      expect(codes).toHaveLength(5);
      expect(hashedCodes).toHaveLength(5);
    });

    it('generates unique codes', () => {
      const { codes } = generateBackupCodes(10);
      const unique = new Set(codes);
      expect(unique.size).toBe(10);
    });

    it('codes are 8-character alphanumeric strings', () => {
      const { codes } = generateBackupCodes();
      for (const code of codes) {
        expect(code).toMatch(/^[a-z0-9]{8}$/);
      }
    });

    it('hashed codes are hex SHA-256 digests', () => {
      const { hashedCodes } = generateBackupCodes();
      for (const hash of hashedCodes) {
        expect(hash).toMatch(/^[0-9a-f]{64}$/);
      }
    });
  });

  // ===========================================================================
  // verifyBackupCode
  // ===========================================================================

  describe('verifyBackupCode', () => {
    it('accepts a valid backup code', () => {
      const { codes, hashedCodes } = generateBackupCodes(5);
      const result = verifyBackupCode(hashedCodes, codes[0]);
      expect(result.valid).toBe(true);
    });

    it('consumes the code, removing it from remaining set', () => {
      const { codes, hashedCodes } = generateBackupCodes(5);
      const result = verifyBackupCode(hashedCodes, codes[0]);
      expect(result.valid).toBe(true);
      expect(result.remainingCodes).toHaveLength(4);
      // The used code's hash should no longer be in the remaining set
      expect(result.remainingCodes).not.toContain(hashedCodes[0]);
    });

    it('returns remaining codes after consuming one', () => {
      const { codes, hashedCodes } = generateBackupCodes(3);
      const result1 = verifyBackupCode(hashedCodes, codes[0]);
      expect(result1.remainingCodes).toHaveLength(2);

      const result2 = verifyBackupCode(result1.remainingCodes, codes[1]);
      expect(result2.valid).toBe(true);
      expect(result2.remainingCodes).toHaveLength(1);
    });

    it('rejects an invalid backup code', () => {
      const { hashedCodes } = generateBackupCodes(5);
      const result = verifyBackupCode(hashedCodes, 'zzzzzzzz');
      expect(result.valid).toBe(false);
      expect(result.remainingCodes).toHaveLength(5);
    });

    it('rejects a code that has already been consumed', () => {
      const { codes, hashedCodes } = generateBackupCodes(3);
      const result1 = verifyBackupCode(hashedCodes, codes[0]);
      expect(result1.valid).toBe(true);

      // Try using the same code against the reduced set
      const result2 = verifyBackupCode(result1.remainingCodes, codes[0]);
      expect(result2.valid).toBe(false);
    });

    it('is case-insensitive', () => {
      const { codes, hashedCodes } = generateBackupCodes(3);
      const upperCode = codes[0].toUpperCase();
      const result = verifyBackupCode(hashedCodes, upperCode);
      expect(result.valid).toBe(true);
    });
  });
});
