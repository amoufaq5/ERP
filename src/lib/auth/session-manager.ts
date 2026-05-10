import crypto from 'crypto';

// =============================================================================
// Types
// =============================================================================

export interface SessionData {
  sessionId: string;
  userId: string;
  tenantId: string;
  device: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
}

export interface SessionMetadata {
  tenantId: string;
  device?: string;
  ipAddress: string;
  userAgent: string;
}

export interface SessionConfig {
  /** Maximum concurrent sessions per user (default: 5) */
  maxConcurrentSessions: number;
  /** Idle timeout in milliseconds (default: 30 minutes) */
  idleTimeoutMs: number;
  /** Absolute session timeout in milliseconds (default: 8 hours) */
  absoluteTimeoutMs: number;
}

interface StoredSession extends SessionData {
  tokenHash: string;
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: SessionConfig = {
  maxConcurrentSessions: 5,
  idleTimeoutMs: 30 * 60 * 1000, // 30 minutes
  absoluteTimeoutMs: 8 * 60 * 60 * 1000, // 8 hours
};

// =============================================================================
// Session Manager
// =============================================================================

/**
 * Production session management service.
 *
 * In a production deployment, the internal Maps would be replaced with a
 * persistent store (Redis, PostgreSQL, etc.). The interface remains the same.
 */
export class SessionManager {
  private config: SessionConfig;

  // Primary index: sessionId -> session data
  private sessions: Map<string, StoredSession> = new Map();
  // Secondary index: token hash -> sessionId (for fast token validation)
  private tokenIndex: Map<string, string> = new Map();
  // Secondary index: userId -> Set of sessionIds (for user-level operations)
  private userIndex: Map<string, Set<string>> = new Map();

  // Per-tenant config overrides
  private tenantConfigs: Map<string, Partial<SessionConfig>> = new Map();

  constructor(config?: Partial<SessionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set session configuration overrides for a specific tenant.
   */
  setTenantConfig(tenantId: string, config: Partial<SessionConfig>): void {
    this.tenantConfigs.set(tenantId, config);
  }

  /**
   * Get the effective configuration for a tenant.
   */
  private getEffectiveConfig(tenantId: string): SessionConfig {
    const tenantOverrides = this.tenantConfigs.get(tenantId);
    if (!tenantOverrides) return this.config;
    return { ...this.config, ...tenantOverrides };
  }

  /**
   * Create a new session for a user.
   *
   * If the user already has the maximum number of concurrent sessions,
   * the oldest session is revoked to make room.
   *
   * @param userId - The user's unique identifier
   * @param metadata - Session metadata (IP, user agent, tenant, device)
   * @returns The session token (64 bytes, hex-encoded = 128 characters)
   */
  async createSession(userId: string, metadata: SessionMetadata): Promise<string> {
    const effectiveConfig = this.getEffectiveConfig(metadata.tenantId);
    const now = new Date();

    // Enforce concurrent session limit
    await this.enforceSessionLimit(userId, effectiveConfig.maxConcurrentSessions);

    // Generate cryptographically secure session token
    const token = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(token);
    const sessionId = crypto.randomUUID();

    const session: StoredSession = {
      sessionId,
      userId,
      tenantId: metadata.tenantId,
      device: metadata.device || this.parseDevice(metadata.userAgent),
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      createdAt: now,
      lastActiveAt: now,
      expiresAt: new Date(now.getTime() + effectiveConfig.absoluteTimeoutMs),
      tokenHash,
    };

    // Store in primary index
    this.sessions.set(sessionId, session);

    // Store in token index
    this.tokenIndex.set(tokenHash, sessionId);

    // Store in user index
    if (!this.userIndex.has(userId)) {
      this.userIndex.set(userId, new Set());
    }
    this.userIndex.get(userId)!.add(sessionId);

    return token;
  }

  /**
   * Validate a session token and return session data if valid.
   * Updates lastActiveAt on successful validation.
   *
   * @param token - The session token to validate
   * @returns Session data if valid, null otherwise
   */
  async validateSession(token: string): Promise<SessionData | null> {
    if (!token) return null;

    const tokenHash = this.hashToken(token);
    const sessionId = this.tokenIndex.get(tokenHash);

    if (!sessionId) return null;

    const session = this.sessions.get(sessionId);
    if (!session) {
      // Stale token index entry; clean up
      this.tokenIndex.delete(tokenHash);
      return null;
    }

    const now = new Date();
    const effectiveConfig = this.getEffectiveConfig(session.tenantId);

    // Check absolute expiry
    if (now > session.expiresAt) {
      await this.revokeSession(sessionId);
      return null;
    }

    // Check idle timeout
    const idleTime = now.getTime() - session.lastActiveAt.getTime();
    if (idleTime > effectiveConfig.idleTimeoutMs) {
      await this.revokeSession(sessionId);
      return null;
    }

    // Update activity timestamp
    session.lastActiveAt = now;

    // Return session data (without internal tokenHash)
    return this.toSessionData(session);
  }

  /**
   * Revoke a specific session by its session ID.
   */
  async revokeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Remove from all indexes
    this.tokenIndex.delete(session.tokenHash);
    this.sessions.delete(sessionId);

    const userSessions = this.userIndex.get(session.userId);
    if (userSessions) {
      userSessions.delete(sessionId);
      if (userSessions.size === 0) {
        this.userIndex.delete(session.userId);
      }
    }
  }

  /**
   * Revoke all sessions for a user, optionally keeping the current session.
   *
   * @param userId - The user whose sessions should be revoked
   * @param exceptSessionId - Optional session ID to keep active (current session)
   */
  async revokeAllSessions(userId: string, exceptSessionId?: string): Promise<void> {
    const userSessions = this.userIndex.get(userId);
    if (!userSessions) return;

    const sessionIds = [...userSessions];
    for (const sessionId of sessionIds) {
      if (sessionId === exceptSessionId) continue;
      await this.revokeSession(sessionId);
    }
  }

  /**
   * Get all active sessions for a user.
   *
   * @param userId - The user whose sessions to retrieve
   * @returns Array of active session data objects
   */
  async getActiveSessions(userId: string): Promise<SessionData[]> {
    const userSessions = this.userIndex.get(userId);
    if (!userSessions) return [];

    const activeSessions: SessionData[] = [];
    const now = new Date();

    for (const sessionId of userSessions) {
      const session = this.sessions.get(sessionId);
      if (!session) continue;

      const effectiveConfig = this.getEffectiveConfig(session.tenantId);

      // Check if session is still valid
      if (now > session.expiresAt) {
        await this.revokeSession(sessionId);
        continue;
      }

      const idleTime = now.getTime() - session.lastActiveAt.getTime();
      if (idleTime > effectiveConfig.idleTimeoutMs) {
        await this.revokeSession(sessionId);
        continue;
      }

      activeSessions.push(this.toSessionData(session));
    }

    return activeSessions;
  }

  /**
   * Clean up all expired sessions.
   * Designed to be called by a periodic scheduled job (e.g., every 5 minutes).
   *
   * @returns Number of sessions cleaned up
   */
  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions) {
      const effectiveConfig = this.getEffectiveConfig(session.tenantId);

      const absoluteExpired = now > session.expiresAt;
      const idleExpired =
        now.getTime() - session.lastActiveAt.getTime() > effectiveConfig.idleTimeoutMs;

      if (absoluteExpired || idleExpired) {
        await this.revokeSession(sessionId);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Update session activity timestamp. Call this on each authenticated request.
   *
   * @param token - The session token
   * @returns true if session was updated, false if invalid/expired
   */
  async touchSession(token: string): Promise<boolean> {
    const session = await this.validateSession(token);
    return session !== null;
  }

  /**
   * Get the total number of active sessions (for monitoring).
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * Enforce concurrent session limit by revoking the oldest sessions.
   */
  private async enforceSessionLimit(userId: string, maxSessions: number): Promise<void> {
    const userSessions = this.userIndex.get(userId);
    if (!userSessions || userSessions.size < maxSessions) return;

    // Get sessions sorted by lastActiveAt (oldest first)
    const sessions: StoredSession[] = [];
    for (const sessionId of userSessions) {
      const session = this.sessions.get(sessionId);
      if (session) sessions.push(session);
    }

    sessions.sort((a, b) => a.lastActiveAt.getTime() - b.lastActiveAt.getTime());

    // Revoke oldest sessions to make room for the new one
    const toRevoke = sessions.length - maxSessions + 1;
    for (let i = 0; i < toRevoke; i++) {
      await this.revokeSession(sessions[i].sessionId);
    }
  }

  /**
   * Hash a token for secure storage using SHA-256.
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Parse a basic device description from User-Agent string.
   */
  private parseDevice(userAgent: string): string {
    if (!userAgent) return 'Unknown';

    if (/mobile|android|iphone|ipad/i.test(userAgent)) {
      if (/iphone/i.test(userAgent)) return 'iPhone';
      if (/ipad/i.test(userAgent)) return 'iPad';
      if (/android/i.test(userAgent)) return 'Android';
      return 'Mobile';
    }

    if (/macintosh|mac os/i.test(userAgent)) return 'Mac';
    if (/windows/i.test(userAgent)) return 'Windows';
    if (/linux/i.test(userAgent)) return 'Linux';

    return 'Unknown';
  }

  /**
   * Convert internal StoredSession to public SessionData (strips tokenHash).
   */
  private toSessionData(session: StoredSession): SessionData {
    return {
      sessionId: session.sessionId,
      userId: session.userId,
      tenantId: session.tenantId,
      device: session.device,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt,
      expiresAt: session.expiresAt,
    };
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

/** Default session manager instance */
export const sessionManager = new SessionManager();
