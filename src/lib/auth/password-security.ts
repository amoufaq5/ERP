import crypto from 'crypto';

// =============================================================================
// Types
// =============================================================================

export interface PasswordHash {
  /** The derived key in hex */
  hash: string;
  /** The salt in hex */
  salt: string;
  /** scrypt N parameter (CPU/memory cost) */
  n: number;
  /** scrypt r parameter (block size) */
  r: number;
  /** scrypt p parameter (parallelization) */
  p: number;
  /** Key length in bytes */
  keyLength: number;
}

export interface AccountLockoutState {
  userId: string;
  failedAttempts: number;
  lastFailedAt: Date | null;
  lockedUntil: Date | null;
  /** Timestamps of each failed attempt for exponential backoff */
  attemptTimestamps: Date[];
}

export interface PasswordHistoryEntry {
  hash: PasswordHash;
  changedAt: Date;
}

export interface PasswordSecurityConfig {
  /** Max failed attempts before lockout (default: 5) */
  maxFailedAttempts: number;
  /** Base lockout duration in milliseconds (default: 15 minutes) */
  lockoutDurationMs: number;
  /** Whether to apply exponential backoff on repeated lockouts (default: true) */
  exponentialBackoff: boolean;
  /** Maximum backoff multiplier (default: 8, so max lockout = 15min * 8 = 2 hours) */
  maxBackoffMultiplier: number;
  /** scrypt N parameter (default: 16384 - good balance of security and performance) */
  scryptN: number;
  /** scrypt r parameter (default: 8) */
  scryptR: number;
  /** scrypt p parameter (default: 1) */
  scryptP: number;
  /** Derived key length in bytes (default: 64) */
  keyLength: number;
  /** Salt length in bytes (default: 32) */
  saltLength: number;
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: PasswordSecurityConfig = {
  maxFailedAttempts: 5,
  lockoutDurationMs: 15 * 60 * 1000, // 15 minutes
  exponentialBackoff: true,
  maxBackoffMultiplier: 8,
  scryptN: 16384, // 2^14
  scryptR: 8,
  scryptP: 1,
  keyLength: 64,
  saltLength: 32,
};

// =============================================================================
// Password Security Service
// =============================================================================

/**
 * Production password security service.
 *
 * Uses Node.js crypto.scrypt for Argon2-style password hashing (memory-hard KDF).
 * In production, the internal Maps would be backed by a persistent data store.
 */
export class PasswordSecurityService {
  private config: PasswordSecurityConfig;

  // Account lockout state (keyed by userId)
  private lockoutState: Map<string, AccountLockoutState> = new Map();
  // Password history (keyed by userId)
  private passwordHistory: Map<string, PasswordHistoryEntry[]> = new Map();
  // Password change timestamps (keyed by userId)
  private passwordChangeDates: Map<string, Date> = new Map();
  // Count of consecutive lockouts (for exponential backoff)
  private lockoutCounts: Map<string, number> = new Map();

  constructor(config?: Partial<PasswordSecurityConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ===========================================================================
  // Password Hashing
  // ===========================================================================

  /**
   * Hash a password using scrypt (memory-hard KDF similar to Argon2).
   *
   * @param password - The plaintext password to hash
   * @returns The password hash object containing all parameters needed for verification
   */
  async hashPassword(password: string): Promise<PasswordHash> {
    const salt = crypto.randomBytes(this.config.saltLength);

    const derivedKey = await this.scryptAsync(
      password,
      salt,
      this.config.keyLength,
      {
        N: this.config.scryptN,
        r: this.config.scryptR,
        p: this.config.scryptP,
      }
    );

    return {
      hash: derivedKey.toString('hex'),
      salt: salt.toString('hex'),
      n: this.config.scryptN,
      r: this.config.scryptR,
      p: this.config.scryptP,
      keyLength: this.config.keyLength,
    };
  }

  /**
   * Verify a password against a stored hash.
   * Uses timing-safe comparison to prevent timing attacks.
   *
   * @param password - The plaintext password to verify
   * @param storedHash - The previously stored password hash
   * @returns true if the password matches
   */
  async verifyPassword(password: string, storedHash: PasswordHash): Promise<boolean> {
    const salt = Buffer.from(storedHash.salt, 'hex');

    const derivedKey = await this.scryptAsync(
      password,
      salt,
      storedHash.keyLength,
      {
        N: storedHash.n,
        r: storedHash.r,
        p: storedHash.p,
      }
    );

    const storedKeyBuffer = Buffer.from(storedHash.hash, 'hex');
    return crypto.timingSafeEqual(derivedKey, storedKeyBuffer);
  }

  // ===========================================================================
  // Account Lockout
  // ===========================================================================

  /**
   * Check if an account is currently locked.
   *
   * @param userId - The user ID to check
   * @returns Object with lock status, remaining lockout time, and failed attempts count
   */
  checkAccountLocked(userId: string): {
    locked: boolean;
    remainingMs: number;
    failedAttempts: number;
  } {
    const state = this.lockoutState.get(userId);
    if (!state) {
      return { locked: false, remainingMs: 0, failedAttempts: 0 };
    }

    if (!state.lockedUntil) {
      return { locked: false, remainingMs: 0, failedAttempts: state.failedAttempts };
    }

    const now = new Date();
    if (now >= state.lockedUntil) {
      // Lockout has expired; don't reset attempts yet (they reset on successful login)
      return { locked: false, remainingMs: 0, failedAttempts: state.failedAttempts };
    }

    const remainingMs = state.lockedUntil.getTime() - now.getTime();
    return { locked: true, remainingMs, failedAttempts: state.failedAttempts };
  }

  /**
   * Record a failed login attempt. May trigger account lockout.
   *
   * @param userId - The user ID that failed authentication
   * @returns Object indicating if account is now locked and for how long
   */
  recordFailedAttempt(userId: string): {
    locked: boolean;
    lockoutDurationMs: number;
    failedAttempts: number;
  } {
    const now = new Date();
    let state = this.lockoutState.get(userId);

    if (!state) {
      state = {
        userId,
        failedAttempts: 0,
        lastFailedAt: null,
        lockedUntil: null,
        attemptTimestamps: [],
      };
      this.lockoutState.set(userId, state);
    }

    // If previously locked and lockout has expired, allow attempts again
    // but keep the failed attempts count (it resets only on successful login)
    if (state.lockedUntil && now >= state.lockedUntil) {
      state.lockedUntil = null;
    }

    // If currently locked, don't count additional attempts
    if (state.lockedUntil && now < state.lockedUntil) {
      const remainingMs = state.lockedUntil.getTime() - now.getTime();
      return {
        locked: true,
        lockoutDurationMs: remainingMs,
        failedAttempts: state.failedAttempts,
      };
    }

    state.failedAttempts++;
    state.lastFailedAt = now;
    state.attemptTimestamps.push(now);

    // Trim old attempt timestamps (only keep last hour for backoff calculation)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    state.attemptTimestamps = state.attemptTimestamps.filter((t) => t > oneHourAgo);

    // Check if lockout threshold reached
    if (state.failedAttempts >= this.config.maxFailedAttempts) {
      const lockoutCount = this.lockoutCounts.get(userId) || 0;
      const multiplier = this.config.exponentialBackoff
        ? Math.min(Math.pow(2, lockoutCount), this.config.maxBackoffMultiplier)
        : 1;
      const lockoutDurationMs = this.config.lockoutDurationMs * multiplier;

      state.lockedUntil = new Date(now.getTime() + lockoutDurationMs);
      this.lockoutCounts.set(userId, lockoutCount + 1);

      return {
        locked: true,
        lockoutDurationMs,
        failedAttempts: state.failedAttempts,
      };
    }

    return {
      locked: false,
      lockoutDurationMs: 0,
      failedAttempts: state.failedAttempts,
    };
  }

  /**
   * Reset failed attempts counter (call after successful login).
   *
   * @param userId - The user ID to reset
   */
  resetFailedAttempts(userId: string): void {
    this.lockoutState.delete(userId);
    this.lockoutCounts.delete(userId);
  }

  // ===========================================================================
  // Password Expiry
  // ===========================================================================

  /**
   * Check if a user's password has expired.
   *
   * @param userId - The user ID to check
   * @param maxAgeDays - Maximum password age in days
   * @returns Object with expiry status and days since last change
   */
  isPasswordExpired(
    userId: string,
    maxAgeDays: number
  ): { expired: boolean; daysSinceChange: number; expiresInDays: number } {
    const lastChange = this.passwordChangeDates.get(userId);

    if (!lastChange) {
      // No record means password was never changed, consider expired
      return { expired: true, daysSinceChange: Infinity, expiresInDays: 0 };
    }

    const now = new Date();
    const msSinceChange = now.getTime() - lastChange.getTime();
    const daysSinceChange = Math.floor(msSinceChange / (24 * 60 * 60 * 1000));
    const expiresInDays = Math.max(0, maxAgeDays - daysSinceChange);

    return {
      expired: daysSinceChange >= maxAgeDays,
      daysSinceChange,
      expiresInDays,
    };
  }

  /**
   * Record that a user changed their password (updates expiry tracking).
   *
   * @param userId - The user ID
   * @param passwordHash - The new password hash to store in history
   */
  recordPasswordChange(userId: string, passwordHash: PasswordHash): void {
    const now = new Date();
    this.passwordChangeDates.set(userId, now);

    // Add to password history
    const history = this.passwordHistory.get(userId) || [];
    history.push({ hash: passwordHash, changedAt: now });
    this.passwordHistory.set(userId, history);
  }

  // ===========================================================================
  // Password History
  // ===========================================================================

  /**
   * Check if a new password matches any of the user's recent passwords.
   *
   * @param userId - The user ID
   * @param newPassword - The new plaintext password to check
   * @param historyCount - Number of previous passwords to check (default: 5)
   * @returns true if the password was recently used (i.e., should be rejected)
   */
  async checkPasswordHistory(
    userId: string,
    newPassword: string,
    historyCount: number = 5
  ): Promise<boolean> {
    const history = this.passwordHistory.get(userId);
    if (!history || history.length === 0) {
      return false; // No history, password is acceptable
    }

    // Check the most recent N passwords
    const recentHistory = history.slice(-historyCount);

    for (const entry of recentHistory) {
      const matches = await this.verifyPassword(newPassword, entry.hash);
      if (matches) {
        return true; // Password was recently used
      }
    }

    return false; // Password is not in recent history
  }

  // ===========================================================================
  // Serialization (for persistence layer integration)
  // ===========================================================================

  /**
   * Serialize a PasswordHash to a single string for database storage.
   * Format: $scrypt$n=N,r=R,p=P,l=L$salt$hash
   */
  static serialize(passwordHash: PasswordHash): string {
    return `$scrypt$n=${passwordHash.n},r=${passwordHash.r},p=${passwordHash.p},l=${passwordHash.keyLength}$${passwordHash.salt}$${passwordHash.hash}`;
  }

  /**
   * Deserialize a password hash string back to a PasswordHash object.
   */
  static deserialize(serialized: string): PasswordHash {
    const parts = serialized.split('$').filter(Boolean);
    if (parts.length !== 4 || parts[0] !== 'scrypt') {
      throw new Error('Invalid serialized password hash format');
    }

    const params = parts[1].split(',').reduce(
      (acc, param) => {
        const [key, value] = param.split('=');
        acc[key] = parseInt(value, 10);
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      hash: parts[3],
      salt: parts[2],
      n: params['n'],
      r: params['r'],
      p: params['p'],
      keyLength: params['l'],
    };
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * Promisified wrapper around crypto.scrypt.
   */
  private scryptAsync(
    password: string,
    salt: Buffer,
    keyLength: number,
    options: { N: number; r: number; p: number }
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.scrypt(
        password,
        salt,
        keyLength,
        { N: options.N, r: options.r, p: options.p },
        (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey);
        }
      );
    });
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

/** Default password security service instance */
export const passwordSecurity = new PasswordSecurityService();
