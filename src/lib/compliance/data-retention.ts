import prisma from "@/lib/prisma";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RetentionPolicy {
  entityType: string;
  /** Human-readable description of the entity */
  description: string;
  /** Number of days to retain records. After this period records become eligible for deletion. */
  retentionDays: number;
  /** The Prisma model name used for queries */
  model: string;
  /** The date field used to determine record age */
  dateField: string;
  /** Optional tenant-scoped field name (default: "tenantId") */
  tenantField: string;
  /** Whether soft-delete should be used instead of hard-delete */
  softDelete: boolean;
  /** If soft-delete, the field to set (e.g. "deletedAt") */
  softDeleteField?: string;
}

export interface RetentionStats {
  entityType: string;
  description: string;
  retentionDays: number;
  totalRecords: number;
  expiredRecords: number;
  oldestRecordDate: Date | null;
  newestExpiredDate: Date | null;
}

export interface RetentionResult {
  entityType: string;
  deletedCount: number;
  error: string | null;
}

export interface RetentionStatusReport {
  tenantId: string;
  generatedAt: Date;
  policies: RetentionStats[];
  totalExpired: number;
}

// ─── Policy Definitions ──────────────────────────────────────────────────────

/**
 * Retention policies keyed by entity type.
 *
 * These define how long each type of record should be kept. Audit logs have
 * the longest retention (7 years) for regulatory compliance. Transient records
 * like sessions and tokens are purged aggressively.
 */
export const RETENTION_POLICIES: Record<string, RetentionPolicy> = {
  audit_logs: {
    entityType: "audit_logs",
    description: "System and entity audit logs",
    retentionDays: 2555, // ~7 years
    model: "AuditLog",
    dateField: "timestamp",
    tenantField: "tenantId",
    softDelete: false,
  },
  signature_audit_logs: {
    entityType: "signature_audit_logs",
    description: "Electronic signature audit trail",
    retentionDays: 2555, // ~7 years (21 CFR Part 11)
    model: "SignatureAuditLog",
    dateField: "timestamp",
    tenantField: "tenantId",
    softDelete: false,
  },
  sessions: {
    entityType: "sessions",
    description: "User sessions",
    retentionDays: 30,
    model: "Session",
    dateField: "expires",
    tenantField: "tenantId",
    softDelete: false,
  },
  verification_tokens: {
    entityType: "verification_tokens",
    description: "Email/password verification tokens",
    retentionDays: 7,
    model: "VerificationToken",
    dateField: "expires",
    tenantField: "tenantId",
    softDelete: false,
  },
  notifications: {
    entityType: "notifications",
    description: "User notifications",
    retentionDays: 90,
    model: "Notification",
    dateField: "createdAt",
    tenantField: "tenantId",
    softDelete: false,
  },
  import_logs: {
    entityType: "import_logs",
    description: "Data import logs",
    retentionDays: 365,
    model: "ImportLog",
    dateField: "createdAt",
    tenantField: "tenantId",
    softDelete: false,
  },
  temp_uploads: {
    entityType: "temp_uploads",
    description: "Temporary file uploads",
    retentionDays: 7,
    model: "TempUpload",
    dateField: "createdAt",
    tenantField: "tenantId",
    softDelete: false,
  },
  activity_logs: {
    entityType: "activity_logs",
    description: "User activity logs",
    retentionDays: 730, // 2 years
    model: "ActivityLog",
    dateField: "createdAt",
    tenantField: "tenantId",
    softDelete: false,
  },
  email_logs: {
    entityType: "email_logs",
    description: "Sent email records",
    retentionDays: 365, // 1 year
    model: "EmailLog",
    dateField: "sentAt",
    tenantField: "tenantId",
    softDelete: false,
  },
  webhook_logs: {
    entityType: "webhook_logs",
    description: "Webhook delivery logs",
    retentionDays: 90,
    model: "WebhookLog",
    dateField: "createdAt",
    tenantField: "tenantId",
    softDelete: false,
  },
};

// ─── Data Retention Service ──────────────────────────────────────────────────

export class DataRetentionService {
  private policies: Record<string, RetentionPolicy>;

  constructor(policies?: Record<string, RetentionPolicy>) {
    this.policies = policies ?? { ...RETENTION_POLICIES };
  }

  /**
   * Get a copy of the current retention policies.
   */
  getPolicies(): Record<string, RetentionPolicy> {
    return { ...this.policies };
  }

  /**
   * Add or update a retention policy.
   */
  setPolicy(entityType: string, policy: RetentionPolicy): void {
    this.policies[entityType] = policy;
  }

  /**
   * Apply retention policies: delete records that have exceeded their
   * retention period for the given tenant.
   *
   * This method is designed to be called from a cron job or scheduled task.
   * Each policy is applied independently; if one fails, the others still run.
   */
  async applyRetention(tenantId: string): Promise<RetentionResult[]> {
    const results: RetentionResult[] = [];

    for (const policy of Object.values(this.policies)) {
      const result = await this.applyPolicyRetention(tenantId, policy);
      results.push(result);
    }

    return results;
  }

  /**
   * Get statistics about what would be purged without actually deleting.
   */
  async getRetentionStatus(tenantId: string): Promise<RetentionStatusReport> {
    const stats: RetentionStats[] = [];
    let totalExpired = 0;

    for (const policy of Object.values(this.policies)) {
      const stat = await this.getPolicyStats(tenantId, policy);
      stats.push(stat);
      totalExpired += stat.expiredRecords;
    }

    return {
      tenantId,
      generatedAt: new Date(),
      policies: stats,
      totalExpired,
    };
  }

  /**
   * Apply retention for a single policy entity type.
   */
  async applyPolicyRetention(
    tenantId: string,
    policy: RetentionPolicy,
  ): Promise<RetentionResult> {
    const cutoffDate = this.getCutoffDate(policy.retentionDays);

    try {
      let deletedCount: number;

      if (policy.softDelete && policy.softDeleteField) {
        // Soft delete: set the deletedAt field
        const result = await prisma.$executeRawUnsafe(
          `UPDATE "${policy.model}"
           SET "${policy.softDeleteField}" = NOW()
           WHERE "${policy.tenantField}" = $1
             AND "${policy.dateField}" < $2
             AND "${policy.softDeleteField}" IS NULL`,
          tenantId,
          cutoffDate,
        );
        deletedCount = result;
      } else {
        // Hard delete
        const result = await prisma.$executeRawUnsafe(
          `DELETE FROM "${policy.model}"
           WHERE "${policy.tenantField}" = $1
             AND "${policy.dateField}" < $2`,
          tenantId,
          cutoffDate,
        );
        deletedCount = result;
      }

      return {
        entityType: policy.entityType,
        deletedCount,
        error: null,
      };
    } catch (err) {
      // The table may not exist (e.g., optional models). This is not a fatal error.
      const message =
        err instanceof Error ? err.message : String(err);

      return {
        entityType: policy.entityType,
        deletedCount: 0,
        error: message,
      };
    }
  }

  /**
   * Get stats for a single policy without deleting.
   */
  private async getPolicyStats(
    tenantId: string,
    policy: RetentionPolicy,
  ): Promise<RetentionStats> {
    const cutoffDate = this.getCutoffDate(policy.retentionDays);

    try {
      // Count total records
      const totalRows = await prisma.$queryRawUnsafe<
        Array<{ count: bigint }>
      >(
        `SELECT COUNT(*) as count FROM "${policy.model}"
         WHERE "${policy.tenantField}" = $1`,
        tenantId,
      );
      const totalRecords = Number(totalRows[0]?.count ?? 0);

      // Count expired records
      const expiredRows = await prisma.$queryRawUnsafe<
        Array<{ count: bigint }>
      >(
        `SELECT COUNT(*) as count FROM "${policy.model}"
         WHERE "${policy.tenantField}" = $1
           AND "${policy.dateField}" < $2`,
        tenantId,
        cutoffDate,
      );
      const expiredRecords = Number(expiredRows[0]?.count ?? 0);

      // Get oldest record date
      const oldestRows = await prisma.$queryRawUnsafe<
        Array<{ oldest: Date | null }>
      >(
        `SELECT MIN("${policy.dateField}") as oldest FROM "${policy.model}"
         WHERE "${policy.tenantField}" = $1`,
        tenantId,
      );
      const oldestRecordDate = oldestRows[0]?.oldest ?? null;

      // Get newest expired record date
      let newestExpiredDate: Date | null = null;
      if (expiredRecords > 0) {
        const newestExpiredRows = await prisma.$queryRawUnsafe<
          Array<{ newest: Date | null }>
        >(
          `SELECT MAX("${policy.dateField}") as newest FROM "${policy.model}"
           WHERE "${policy.tenantField}" = $1
             AND "${policy.dateField}" < $2`,
          tenantId,
          cutoffDate,
        );
        newestExpiredDate = newestExpiredRows[0]?.newest ?? null;
      }

      return {
        entityType: policy.entityType,
        description: policy.description,
        retentionDays: policy.retentionDays,
        totalRecords,
        expiredRecords,
        oldestRecordDate,
        newestExpiredDate,
      };
    } catch {
      // Table may not exist
      return {
        entityType: policy.entityType,
        description: policy.description,
        retentionDays: policy.retentionDays,
        totalRecords: 0,
        expiredRecords: 0,
        oldestRecordDate: null,
        newestExpiredDate: null,
      };
    }
  }

  /**
   * Calculate the cutoff date based on retention days.
   */
  private getCutoffDate(retentionDays: number): Date {
    const now = new Date();
    return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let _instance: DataRetentionService | null = null;

export function getDataRetentionService(): DataRetentionService {
  if (_instance) return _instance;
  _instance = new DataRetentionService();
  return _instance;
}

export default DataRetentionService;
