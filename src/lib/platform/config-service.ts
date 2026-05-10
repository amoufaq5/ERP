import { z } from "zod";
import { getCache } from "@/lib/cache/redis";
import prisma from "@/lib/prisma";
import {
  type AppConfig,
  DEFAULT_CONFIG,
  type FinanceConfig,
  type InventoryConfig,
  type ProcurementConfig,
  type CRMConfig,
  type HRConfig,
  type AccountingConfig,
  type IndustryConfig,
  type SecurityConfig,
  type NotificationsConfig,
  type IntegrationsConfig,
  type BackupConfig,
  type LocalizationConfig,
  type AppearanceConfig,
} from "@/lib/config-context";

// ─── Zod Schemas per module ─────────────────────────────────────────────────

export const FinanceConfigSchema = z.object({
  currency: z.string().min(1).max(10),
  dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]),
  fiscalYearStart: z.string().regex(/^\d{2}-\d{2}$/),
  taxRate: z.number().min(0).max(100),
  approvalThreshold: z.number().min(0),
});

export const InventoryConfigSchema = z.object({
  lowStockThreshold: z.number().min(0).max(100),
  expiryAlertDays: z.number().min(1).max(365),
  enableBatchTracking: z.boolean(),
  enableColdChain: z.boolean(),
  defaultWarehouse: z.string().min(1),
});

export const ProcurementConfigSchema = z.object({
  requireGMPCertification: z.boolean(),
  requireCoA: z.boolean(),
  autoGenerateGRN: z.boolean(),
  supplierRatingScale: z.union([z.literal(5), z.literal(10)]),
  approvalLevels: z.number().min(1).max(10),
});

export const CRMConfigSchema = z.object({
  visitValidationRadius: z.number().min(10).max(5000),
  requireGPSForVisits: z.boolean(),
  dailyVisitTarget: z.number().min(1).max(50),
  coverageTarget: z.number().min(0).max(100),
  doctorSegmentation: z.enum(["ABC", "ABCD", "VIP"]),
});

export const HRConfigSchema = z.object({
  probationMonths: z.number().min(0).max(24),
  annualLeaveDays: z.number().min(0).max(60),
  enableGMPTraining: z.boolean(),
  enablePerformanceReviews: z.boolean(),
  payrollCycle: z.enum(["Monthly", "Bi-Weekly"]),
});

export const AccountingConfigSchema = z.object({
  chartType: z.enum(["Egyptian", "IFRS", "GAAP"]),
  enableDeferredRevenue: z.boolean(),
  enableCheques: z.boolean(),
  bankReconciliation: z.enum(["Daily", "Weekly", "Monthly"]),
  agingBuckets: z.array(z.number().min(1)).min(1).max(10),
});

export const IndustryConfigSchema = z.object({
  industry: z.literal("PHARMACEUTICAL"),
  enabledSolutions: z.record(z.string(), z.boolean()),
});

export const SecurityConfigSchema = z.object({
  passwordMinLength: z.number().min(6).max(128),
  passwordRequireSymbol: z.boolean(),
  passwordRequireNumber: z.boolean(),
  passwordRequireUppercase: z.boolean(),
  passwordExpiryDays: z.number().min(0).max(365),
  sessionTimeoutMinutes: z.number().min(5).max(1440),
  maxLoginAttempts: z.number().min(1).max(20),
  enableTwoFactor: z.boolean(),
  enforceSSO: z.boolean(),
  ipWhitelistEnabled: z.boolean(),
  auditLogRetentionDays: z.number().min(30).max(3650),
});

export const NotificationsConfigSchema = z.object({
  emailEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  emailFromAddress: z.string().email(),
  digestFrequency: z.enum(["Off", "Daily", "Weekly"]),
  notifyOnExpiry: z.boolean(),
  notifyOnLowStock: z.boolean(),
  notifyOnColdChainAlert: z.boolean(),
  notifyOnApprovalNeeded: z.boolean(),
  notifyOnNewMarketRequest: z.boolean(),
});

export const IntegrationsConfigSchema = z.object({
  mapProvider: z.enum(["OpenStreetMap", "Google", "Mapbox"]),
  mapApiKey: z.string(),
  smtpHost: z.string(),
  smtpPort: z.number().min(1).max(65535),
  smtpUser: z.string(),
  smtpSecure: z.boolean(),
  edaApiEnabled: z.boolean(),
  whatsappEnabled: z.boolean(),
  whatsappNumber: z.string(),
  webhookUrl: z.string(),
});

export const BackupConfigSchema = z.object({
  autoBackupEnabled: z.boolean(),
  backupFrequency: z.enum(["Hourly", "Daily", "Weekly"]),
  retentionDays: z.number().min(1).max(3650),
  backupLocation: z.enum(["Local", "S3", "Azure", "GCP"]),
  encryptBackups: z.boolean(),
  lastBackupAt: z.string(),
});

export const LocalizationConfigSchema = z.object({
  defaultLanguage: z.enum(["en", "ar", "fr"]),
  timezone: z.string().min(1),
  firstDayOfWeek: z.enum(["Sunday", "Monday", "Saturday"]),
  weekendDays: z.array(z.string()).min(1).max(3),
  numberFormat: z.enum(["1,234.56", "1.234,56", "1 234.56"]),
});

export const AppearanceConfigSchema = z.object({
  theme: z.enum(["light", "dark", "auto"]),
  primaryColor: z.enum(["blue", "green", "purple", "orange", "red"]),
  compactMode: z.boolean(),
  sidebarDefaultCollapsed: z.boolean(),
  showCompanyLogo: z.boolean(),
});

export const AppConfigSchema = z.object({
  finance: FinanceConfigSchema,
  inventory: InventoryConfigSchema,
  procurement: ProcurementConfigSchema,
  crm: CRMConfigSchema,
  hr: HRConfigSchema,
  accounting: AccountingConfigSchema,
  industry: IndustryConfigSchema,
  security: SecurityConfigSchema,
  notifications: NotificationsConfigSchema,
  integrations: IntegrationsConfigSchema,
  backup: BackupConfigSchema,
  localization: LocalizationConfigSchema,
  appearance: AppearanceConfigSchema,
});

export const MODULE_SCHEMAS: Record<string, z.ZodTypeAny> = {
  finance: FinanceConfigSchema,
  inventory: InventoryConfigSchema,
  procurement: ProcurementConfigSchema,
  crm: CRMConfigSchema,
  hr: HRConfigSchema,
  accounting: AccountingConfigSchema,
  industry: IndustryConfigSchema,
  security: SecurityConfigSchema,
  notifications: NotificationsConfigSchema,
  integrations: IntegrationsConfigSchema,
  backup: BackupConfigSchema,
  localization: LocalizationConfigSchema,
  appearance: AppearanceConfigSchema,
};

export type ModuleName = keyof AppConfig;

// ─── Change log entry type ──────────────────────────────────────────────────

export interface ConfigChangeEntry {
  id: string;
  tenantId: string;
  userId: string;
  module: string;
  path: string;
  oldValue: unknown;
  newValue: unknown;
  changedAt: Date;
}

// ─── Cache constants ────────────────────────────────────────────────────────

const CACHE_TTL_SECONDS = 300; // 5 minutes
const CACHE_KEY_PREFIX = "config:tenant:";

function cacheKey(tenantId: string): string {
  return `${CACHE_KEY_PREFIX}${tenantId}`;
}

// ─── Deep merge utility ─────────────────────────────────────────────────────

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === "object" && !Array.isArray(val);
}

function deepMerge<T extends Record<string, unknown>>(
  base: T,
  overrides: Record<string, unknown>
): T {
  const result = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(overrides)) {
    const baseVal = result[key];
    const overrideVal = overrides[key];
    if (isPlainObject(baseVal) && isPlainObject(overrideVal)) {
      result[key] = deepMerge(baseVal as Record<string, unknown>, overrideVal);
    } else {
      result[key] = overrideVal;
    }
  }
  return result as T;
}

// ─── Dot-notation set/get utility ───────────────────────────────────────────

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function setByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const keys = path.split(".");
  const result = { ...obj };
  let current: Record<string, unknown> = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const next = current[key];
    if (isPlainObject(next)) {
      current[key] = { ...next };
    } else {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return result;
}

function deleteByPath(
  obj: Record<string, unknown>,
  path: string
): Record<string, unknown> {
  const keys = path.split(".");
  const result = { ...obj };
  let current: Record<string, unknown> = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const next = current[key];
    if (isPlainObject(next)) {
      current[key] = { ...next };
    } else {
      return result; // path doesn't exist, nothing to delete
    }
    current = current[key] as Record<string, unknown>;
  }

  delete current[keys[keys.length - 1]];
  return result;
}

// ─── Config Service ─────────────────────────────────────────────────────────

class ConfigService {
  private static instance: ConfigService;
  private changeLog: ConfigChangeEntry[] = [];

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Get the full config for a tenant, or a specific module config.
   */
  async getConfig(tenantId: string, module?: ModuleName): Promise<AppConfig | AppConfig[ModuleName]> {
    const effective = await this.getEffectiveConfig(tenantId);
    if (module) {
      return effective[module];
    }
    return effective;
  }

  /**
   * Set a specific config value using dot-notation path.
   * Example: setConfig("t1", "finance.taxRate", 15, "user-123")
   */
  async setConfig(
    tenantId: string,
    path: string,
    value: unknown,
    userId: string = "system"
  ): Promise<AppConfig> {
    const currentOverrides = await this.getTenantOverrides(tenantId);
    const effectiveBefore = deepMerge(
      DEFAULT_CONFIG as unknown as Record<string, unknown>,
      currentOverrides
    );
    const oldValue = getByPath(effectiveBefore, path);

    const newOverrides = setByPath(currentOverrides, path, value);

    // Validate the merged config
    const merged = deepMerge(
      DEFAULT_CONFIG as unknown as Record<string, unknown>,
      newOverrides
    );
    const parseResult = AppConfigSchema.safeParse(merged);
    if (!parseResult.success) {
      throw new ConfigValidationError(
        `Invalid config value at "${path}": ${parseResult.error.issues.map((i) => i.message).join(", ")}`
      );
    }

    // Persist overrides
    await this.saveTenantOverrides(tenantId, newOverrides);

    // Invalidate cache
    await this.invalidateCache(tenantId);

    // Log change
    this.logChange(tenantId, userId, path, oldValue, value);

    return parseResult.data as AppConfig;
  }

  /**
   * Reset a specific config path to its default value.
   */
  async resetConfig(
    tenantId: string,
    path: string,
    userId: string = "system"
  ): Promise<AppConfig> {
    const currentOverrides = await this.getTenantOverrides(tenantId);
    const effectiveBefore = deepMerge(
      DEFAULT_CONFIG as unknown as Record<string, unknown>,
      currentOverrides
    );
    const oldValue = getByPath(effectiveBefore, path);

    const newOverrides = deleteByPath(currentOverrides, path);

    await this.saveTenantOverrides(tenantId, newOverrides);
    await this.invalidateCache(tenantId);

    this.logChange(tenantId, userId, path, oldValue, getByPath(DEFAULT_CONFIG as unknown as Record<string, unknown>, path));

    return await this.getEffectiveConfig(tenantId);
  }

  /**
   * Get effective config: defaults merged with tenant overrides.
   */
  async getEffectiveConfig(tenantId: string): Promise<AppConfig> {
    // Try cache first
    const cache = await getCache();
    const cached = await cache.get(cacheKey(tenantId));
    if (cached) {
      try {
        return JSON.parse(cached) as AppConfig;
      } catch {
        // corrupted cache, fall through
      }
    }

    const overrides = await this.getTenantOverrides(tenantId);
    const effective = deepMerge(
      DEFAULT_CONFIG as unknown as Record<string, unknown>,
      overrides
    ) as unknown as AppConfig;

    // Store in cache
    await cache.set(cacheKey(tenantId), JSON.stringify(effective), CACHE_TTL_SECONDS);

    return effective;
  }

  /**
   * Validate a full or partial config against schemas.
   */
  validateConfig(
    _tenantId: string,
    config: unknown
  ): { valid: boolean; errors: string[] } {
    const parseResult = AppConfigSchema.safeParse(config);
    if (parseResult.success) {
      return { valid: true, errors: [] };
    }
    return {
      valid: false,
      errors: parseResult.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`
      ),
    };
  }

  /**
   * Validate a single module config.
   */
  validateModuleConfig(
    module: string,
    config: unknown
  ): { valid: boolean; errors: string[] } {
    const schema = MODULE_SCHEMAS[module];
    if (!schema) {
      return { valid: false, errors: [`Unknown module: ${module}`] };
    }
    const parseResult = schema.safeParse(config);
    if (parseResult.success) {
      return { valid: true, errors: [] };
    }
    return {
      valid: false,
      errors: (parseResult as { success: false; error: z.ZodError }).error.issues.map(
        (issue: z.ZodIssue) => `${issue.path.join(".")}: ${issue.message}`
      ),
    };
  }

  /**
   * Export full config for backup/migration.
   */
  async exportConfig(tenantId: string): Promise<{
    tenantId: string;
    exportedAt: string;
    version: string;
    config: AppConfig;
    overrides: Record<string, unknown>;
  }> {
    const effective = await this.getEffectiveConfig(tenantId);
    const overrides = await this.getTenantOverrides(tenantId);
    return {
      tenantId,
      exportedAt: new Date().toISOString(),
      version: "1.0.0",
      config: effective,
      overrides,
    };
  }

  /**
   * Import config with validation.
   */
  async importConfig(
    tenantId: string,
    config: unknown,
    userId: string = "system"
  ): Promise<{ success: boolean; errors: string[] }> {
    // Validate the incoming config
    const validation = this.validateConfig(tenantId, config);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const validConfig = config as AppConfig;

    // Calculate overrides (diff from defaults)
    const overrides: Record<string, unknown> = {};
    for (const module of Object.keys(validConfig) as ModuleName[]) {
      const moduleConfig = validConfig[module];
      const moduleDefault = DEFAULT_CONFIG[module];
      if (JSON.stringify(moduleConfig) !== JSON.stringify(moduleDefault)) {
        overrides[module] = moduleConfig;
      }
    }

    await this.saveTenantOverrides(tenantId, overrides);
    await this.invalidateCache(tenantId);

    this.logChange(tenantId, userId, "*", null, "full import");

    return { success: true, errors: [] };
  }

  /**
   * Update an entire module's config.
   */
  async updateModuleConfig(
    tenantId: string,
    module: ModuleName,
    config: unknown,
    userId: string = "system"
  ): Promise<AppConfig> {
    // Validate the module config
    const validation = this.validateModuleConfig(module, config);
    if (!validation.valid) {
      throw new ConfigValidationError(
        `Invalid ${module} config: ${validation.errors.join(", ")}`
      );
    }

    const currentOverrides = await this.getTenantOverrides(tenantId);
    const oldModuleConfig = deepMerge(
      DEFAULT_CONFIG as unknown as Record<string, unknown>,
      currentOverrides
    )[module];

    const newOverrides = { ...currentOverrides, [module]: config };

    await this.saveTenantOverrides(tenantId, newOverrides);
    await this.invalidateCache(tenantId);

    this.logChange(tenantId, userId, module, oldModuleConfig, config);

    return await this.getEffectiveConfig(tenantId);
  }

  /**
   * Reset all config for a tenant to defaults.
   */
  async resetAllConfig(tenantId: string, userId: string = "system"): Promise<AppConfig> {
    await this.saveTenantOverrides(tenantId, {});
    await this.invalidateCache(tenantId);
    this.logChange(tenantId, userId, "*", null, "full reset");
    return DEFAULT_CONFIG;
  }

  /**
   * Get change log for a tenant.
   */
  getChangeLog(tenantId: string, limit: number = 50): ConfigChangeEntry[] {
    return this.changeLog
      .filter((entry) => entry.tenantId === tenantId)
      .slice(-limit);
  }

  // ─── Private methods ────────────────────────────────────────────────────────

  private async getTenantOverrides(tenantId: string): Promise<Record<string, unknown>> {
    try {
      const record = await prisma.$queryRawUnsafe<Array<{ config_data: string }>>(
        `SELECT config_data FROM tenant_config WHERE tenant_id = $1 LIMIT 1`,
        tenantId
      );
      if (record && record.length > 0 && record[0].config_data) {
        return JSON.parse(record[0].config_data);
      }
    } catch {
      // Table may not exist yet or DB unavailable – use in-memory fallback
      const cache = await getCache();
      const fallback = await cache.get(`config:overrides:${tenantId}`);
      if (fallback) {
        try {
          return JSON.parse(fallback);
        } catch {
          // corrupted
        }
      }
    }
    return {};
  }

  private async saveTenantOverrides(
    tenantId: string,
    overrides: Record<string, unknown>
  ): Promise<void> {
    const data = JSON.stringify(overrides);
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO tenant_config (tenant_id, config_data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (tenant_id)
         DO UPDATE SET config_data = $2, updated_at = NOW()`,
        tenantId,
        data
      );
    } catch {
      // DB unavailable – persist in cache as fallback
      const cache = await getCache();
      await cache.set(`config:overrides:${tenantId}`, data);
    }
  }

  private async invalidateCache(tenantId: string): Promise<void> {
    const cache = await getCache();
    await cache.del(cacheKey(tenantId));
  }

  private logChange(
    tenantId: string,
    userId: string,
    path: string,
    oldValue: unknown,
    newValue: unknown
  ): void {
    const entry: ConfigChangeEntry = {
      id: `chg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      tenantId,
      userId,
      module: path.split(".")[0],
      path,
      oldValue,
      newValue,
      changedAt: new Date(),
    };
    this.changeLog.push(entry);

    // Keep the in-memory log bounded (last 1000 entries per instance)
    if (this.changeLog.length > 1000) {
      this.changeLog = this.changeLog.slice(-500);
    }

    // Also persist to DB asynchronously (fire and forget)
    this.persistChangeLog(entry).catch(() => {
      // non-critical failure
    });
  }

  private async persistChangeLog(entry: ConfigChangeEntry): Promise<void> {
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO config_change_log (id, tenant_id, user_id, module, path, old_value, new_value, changed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        entry.id,
        entry.tenantId,
        entry.userId,
        entry.module,
        entry.path,
        JSON.stringify(entry.oldValue),
        JSON.stringify(entry.newValue),
        entry.changedAt
      );
    } catch {
      // non-critical – DB table may not exist
    }
  }
}

// ─── Error types ────────────────────────────────────────────────────────────

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigValidationError";
  }
}

// ─── Singleton export ───────────────────────────────────────────────────────

export const configService = ConfigService.getInstance();
export { ConfigService };
