import { PrismaClient } from '@prisma/client';

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: string;
  entityId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

class AuditLogger {
  private static instance: AuditLogger;
  private logs: AuditLogEntry[] = [];
  private enabled = true;
  private excludeModels: Set<string> = new Set(['AuditLog', 'Session', 'VerificationToken']);
  private excludeFields: Set<string> = new Set(['password', 'hashedPassword', 'token', 'secret']);

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  configure(options: { enabled?: boolean; excludeModels?: string[]; excludeFields?: string[] }): void {
    if (options.enabled !== undefined) this.enabled = options.enabled;
    if (options.excludeModels) this.excludeModels = new Set(options.excludeModels);
    if (options.excludeFields) this.excludeFields = new Set(options.excludeFields);
  }

  private sanitize(data: Record<string, unknown> | null): Record<string, unknown> | null {
    if (!data) return null;
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (this.excludeFields.has(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    if (!this.enabled) return;

    this.logs.push({
      ...entry,
      id: crypto.randomUUID(),
      oldValues: this.sanitize(entry.oldValues),
      newValues: this.sanitize(entry.newValues),
      timestamp: new Date(),
    });
  }

  getHistory(entityType: string, entityId: string, tenantId: string): AuditLogEntry[] {
    return this.logs
      .filter(l => l.entityType === entityType && l.entityId === entityId && l.tenantId === tenantId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getUserActivity(userId: string, tenantId: string, limit = 50): AuditLogEntry[] {
    return this.logs
      .filter(l => l.userId === userId && l.tenantId === tenantId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getRecentActivity(tenantId: string, limit = 100): AuditLogEntry[] {
    return this.logs
      .filter(l => l.tenantId === tenantId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  shouldAudit(model: string): boolean {
    return this.enabled && !this.excludeModels.has(model);
  }
}

export const auditLogger = AuditLogger.getInstance();

// Prisma extension for automatic audit logging
export function withAuditLogging(prisma: PrismaClient): PrismaClient {
  return prisma.$extends({
    query: {
      $allModels: {
        async create({ model, args, query }) {
          const result = await query(args);
          if (auditLogger.shouldAudit(model)) {
            auditLogger.log({
              tenantId: (result as any).tenantId || 'system',
              userId: 'system', // Override in request context
              action: 'CREATE',
              entityType: model,
              entityId: (result as any).id,
              oldValues: null,
              newValues: result as Record<string, unknown>,
            });
          }
          return result;
        },
        async update({ model, args, query }) {
          const before = await (prisma as any)[model[0].toLowerCase() + model.slice(1)]?.findUnique?.({
            where: args.where,
          });
          const result = await query(args);
          if (auditLogger.shouldAudit(model)) {
            auditLogger.log({
              tenantId: (result as any).tenantId || 'system',
              userId: 'system',
              action: 'UPDATE',
              entityType: model,
              entityId: (result as any).id,
              oldValues: before as Record<string, unknown>,
              newValues: result as Record<string, unknown>,
            });
          }
          return result;
        },
        async delete({ model, args, query }) {
          const before = await (prisma as any)[model[0].toLowerCase() + model.slice(1)]?.findUnique?.({
            where: args.where,
          });
          const result = await query(args);
          if (auditLogger.shouldAudit(model)) {
            auditLogger.log({
              tenantId: (before as any)?.tenantId || 'system',
              userId: 'system',
              action: 'DELETE',
              entityType: model,
              entityId: (before as any)?.id || '',
              oldValues: before as Record<string, unknown>,
              newValues: null,
            });
          }
          return result;
        },
      },
    },
  }) as unknown as PrismaClient;
}
