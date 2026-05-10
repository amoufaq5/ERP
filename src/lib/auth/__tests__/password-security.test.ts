import { describe, it, expect } from 'vitest';
import { PasswordSecurityService } from '../password-security';

// Use fast scrypt params for testing to avoid slow tests
function createTestService(overrides?: Record<string, unknown>) {
  return new PasswordSecurityService({
    scryptN: 1024,
    scryptR: 8,
    scryptP: 1,
    keyLength: 32,
    saltLength: 16,
    maxFailedAttempts: 3,
    lockoutDurationMs: 1000, // 1 second for fast test
    exponentialBackoff: false,
    maxBackoffMultiplier: 1,
    ...overrides,
  });
}

describe('PasswordSecurityService', () => {
  // ===========================================================================
  // hashPassword
  // ===========================================================================

  describe('hashPassword', () => {
    it('produces a valid hash format', async () => {
      const service = createTestService();
      const result = await service.hashPassword('mypassword');

      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('salt');
      expect(result).toHaveProperty('n');
      expect(result).toHaveProperty('r');
      expect(result).toHaveProperty('p');
      expect(result).toHaveProperty('keyLength');

      // Hash should be hex string of correct length
      expect(result.hash).toMatch(/^[0-9a-f]+$/);
      expect(result.hash.length).toBe(result.keyLength * 2); // hex encoding
      expect(result.salt).toMatch(/^[0-9a-f]+$/);
    });

    it('produces different hashes for the same password (different salts)', async () => {
      const service = createTestService();
      const hash1 = await service.hashPassword('samepassword');
      const hash2 = await service.hashPassword('samepassword');
      expect(hash1.salt).not.toBe(hash2.salt);
      expect(hash1.hash).not.toBe(hash2.hash);
    });
  });

  // ===========================================================================
  // verifyPassword
  // ===========================================================================

  describe('verifyPassword', () => {
    it('matches correct password', async () => {
      const service = createTestService();
      const hash = await service.hashPassword('correctpassword');
      const matches = await service.verifyPassword('correctpassword', hash);
      expect(matches).toBe(true);
    });

    it('rejects wrong password', async () => {
      const service = createTestService();
      const hash = await service.hashPassword('correctpassword');
      const matches = await service.verifyPassword('wrongpassword', hash);
      expect(matches).toBe(false);
    });

    it('rejects empty password against a valid hash', async () => {
      const service = createTestService();
      const hash = await service.hashPassword('notempty');
      const matches = await service.verifyPassword('', hash);
      expect(matches).toBe(false);
    });
  });

  // ===========================================================================
  // Account Lockout
  // ===========================================================================

  describe('account lockout', () => {
    it('is not locked initially', () => {
      const service = createTestService();
      const status = service.checkAccountLocked('user-1');
      expect(status.locked).toBe(false);
      expect(status.failedAttempts).toBe(0);
    });

    it('tracks failed attempts', () => {
      const service = createTestService({ maxFailedAttempts: 5 });
      service.recordFailedAttempt('user-1');
      service.recordFailedAttempt('user-1');

      const status = service.checkAccountLocked('user-1');
      expect(status.locked).toBe(false);
      expect(status.failedAttempts).toBe(2);
    });

    it('locks account after N failed attempts', () => {
      const service = createTestService({ maxFailedAttempts: 3 });

      service.recordFailedAttempt('user-1');
      service.recordFailedAttempt('user-1');
      const result = service.recordFailedAttempt('user-1');

      expect(result.locked).toBe(true);
      expect(result.failedAttempts).toBe(3);

      const status = service.checkAccountLocked('user-1');
      expect(status.locked).toBe(true);
      expect(status.remainingMs).toBeGreaterThan(0);
    });

    it('lockout resets after duration expires', async () => {
      const service = createTestService({
        maxFailedAttempts: 2,
        lockoutDurationMs: 50, // 50ms for fast test
      });

      service.recordFailedAttempt('user-1');
      service.recordFailedAttempt('user-1');

      let status = service.checkAccountLocked('user-1');
      expect(status.locked).toBe(true);

      // Wait for lockout to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      status = service.checkAccountLocked('user-1');
      expect(status.locked).toBe(false);
    });

    it('resets failed attempts on explicit reset', () => {
      const service = createTestService({ maxFailedAttempts: 5 });

      service.recordFailedAttempt('user-1');
      service.recordFailedAttempt('user-1');
      service.resetFailedAttempts('user-1');

      const status = service.checkAccountLocked('user-1');
      expect(status.locked).toBe(false);
      expect(status.failedAttempts).toBe(0);
    });
  });

  // ===========================================================================
  // Password History
  // ===========================================================================

  describe('password history', () => {
    it('allows a new password with no history', async () => {
      const service = createTestService();
      const reused = await service.checkPasswordHistory('user-1', 'newpassword');
      expect(reused).toBe(false);
    });

    it('prevents reuse of a recent password', async () => {
      const service = createTestService();
      const hash = await service.hashPassword('oldpassword');
      service.recordPasswordChange('user-1', hash);

      const reused = await service.checkPasswordHistory('user-1', 'oldpassword');
      expect(reused).toBe(true);
    });

    it('allows a different password', async () => {
      const service = createTestService();
      const hash = await service.hashPassword('oldpassword');
      service.recordPasswordChange('user-1', hash);

      const reused = await service.checkPasswordHistory('user-1', 'completelynew');
      expect(reused).toBe(false);
    });

    it('checks multiple historical passwords', async () => {
      const service = createTestService();

      const hash1 = await service.hashPassword('password1');
      service.recordPasswordChange('user-1', hash1);

      const hash2 = await service.hashPassword('password2');
      service.recordPasswordChange('user-1', hash2);

      const hash3 = await service.hashPassword('password3');
      service.recordPasswordChange('user-1', hash3);

      expect(await service.checkPasswordHistory('user-1', 'password1')).toBe(true);
      expect(await service.checkPasswordHistory('user-1', 'password2')).toBe(true);
      expect(await service.checkPasswordHistory('user-1', 'password3')).toBe(true);
      expect(await service.checkPasswordHistory('user-1', 'password4')).toBe(false);
    });
  });

  // ===========================================================================
  // Serialization
  // ===========================================================================

  describe('serialization', () => {
    it('round-trips through serialize/deserialize', async () => {
      const service = createTestService();
      const hash = await service.hashPassword('test');
      const serialized = PasswordSecurityService.serialize(hash);
      const deserialized = PasswordSecurityService.deserialize(serialized);

      expect(deserialized.hash).toBe(hash.hash);
      expect(deserialized.salt).toBe(hash.salt);
      expect(deserialized.n).toBe(hash.n);
      expect(deserialized.r).toBe(hash.r);
      expect(deserialized.p).toBe(hash.p);
      expect(deserialized.keyLength).toBe(hash.keyLength);
    });

    it('produces expected format string', async () => {
      const service = createTestService();
      const hash = await service.hashPassword('test');
      const serialized = PasswordSecurityService.serialize(hash);
      expect(serialized).toMatch(/^\$scrypt\$n=\d+,r=\d+,p=\d+,l=\d+\$[0-9a-f]+\$[0-9a-f]+$/);
    });
  });
});
