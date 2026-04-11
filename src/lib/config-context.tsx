"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// ─── Module configuration shape ──────────────────────────────────────────────
// Each module owns a small config object with pharma-grade defaults.
// Admin can edit these via Settings → Modules.

export interface FinanceConfig {
  currency: string;           // EGP / USD / EUR
  dateFormat: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  fiscalYearStart: string;    // e.g. "01-01"
  taxRate: number;            // % VAT
  approvalThreshold: number;  // amount requiring manager sign-off
}

export interface InventoryConfig {
  lowStockThreshold: number;     // % of reorder level
  expiryAlertDays: number;        // alert this many days before expiry
  enableBatchTracking: boolean;
  enableColdChain: boolean;
  defaultWarehouse: string;
}

export interface ProcurementConfig {
  requireGMPCertification: boolean;
  requireCoA: boolean;            // Certificate of Analysis
  autoGenerateGRN: boolean;
  supplierRatingScale: 5 | 10;
  approvalLevels: number;
}

export interface CRMConfig {
  visitValidationRadius: number;  // meters for GPS check-in
  requireGPSForVisits: boolean;
  dailyVisitTarget: number;
  coverageTarget: number;         // % of doctors in territory
  doctorSegmentation: "ABC" | "ABCD" | "VIP";
}

export interface HRConfig {
  probationMonths: number;
  annualLeaveDays: number;
  enableGMPTraining: boolean;
  enablePerformanceReviews: boolean;
  payrollCycle: "Monthly" | "Bi-Weekly";
}

export interface AccountingConfig {
  chartType: "Egyptian" | "IFRS" | "GAAP";
  enableDeferredRevenue: boolean;
  enableCheques: boolean;
  bankReconciliation: "Daily" | "Weekly" | "Monthly";
  agingBuckets: number[];          // e.g. [30,60,90,120]
}

export interface IndustryConfig {
  industry: "PHARMACEUTICAL";       // locked to pharma
  enabledSolutions: Record<string, boolean>;  // solution id -> active
}

export interface SecurityConfig {
  passwordMinLength: number;
  passwordRequireSymbol: boolean;
  passwordRequireNumber: boolean;
  passwordRequireUppercase: boolean;
  passwordExpiryDays: number;
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  enableTwoFactor: boolean;
  enforceSSO: boolean;
  ipWhitelistEnabled: boolean;
  auditLogRetentionDays: number;
}

export interface NotificationsConfig {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  emailFromAddress: string;
  digestFrequency: "Off" | "Daily" | "Weekly";
  notifyOnExpiry: boolean;
  notifyOnLowStock: boolean;
  notifyOnColdChainAlert: boolean;
  notifyOnApprovalNeeded: boolean;
  notifyOnNewMarketRequest: boolean;
}

export interface IntegrationsConfig {
  mapProvider: "OpenStreetMap" | "Google" | "Mapbox";
  mapApiKey: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpSecure: boolean;
  edaApiEnabled: boolean;        // EDA (Egyptian Drug Authority) e-submission
  whatsappEnabled: boolean;
  whatsappNumber: string;
  webhookUrl: string;
}

export interface BackupConfig {
  autoBackupEnabled: boolean;
  backupFrequency: "Hourly" | "Daily" | "Weekly";
  retentionDays: number;
  backupLocation: "Local" | "S3" | "Azure" | "GCP";
  encryptBackups: boolean;
  lastBackupAt: string;        // ISO date
}

export interface LocalizationConfig {
  defaultLanguage: "en" | "ar" | "fr";
  timezone: string;
  firstDayOfWeek: "Sunday" | "Monday" | "Saturday";
  weekendDays: string[];       // e.g., ["Friday","Saturday"] for Egypt
  numberFormat: "1,234.56" | "1.234,56" | "1 234.56";
}

export interface AppearanceConfig {
  theme: "light" | "dark" | "auto";
  primaryColor: "blue" | "green" | "purple" | "orange" | "red";
  compactMode: boolean;
  sidebarDefaultCollapsed: boolean;
  showCompanyLogo: boolean;
}

export interface AppConfig {
  finance: FinanceConfig;
  inventory: InventoryConfig;
  procurement: ProcurementConfig;
  crm: CRMConfig;
  hr: HRConfig;
  accounting: AccountingConfig;
  industry: IndustryConfig;
  security: SecurityConfig;
  notifications: NotificationsConfig;
  integrations: IntegrationsConfig;
  backup: BackupConfig;
  localization: LocalizationConfig;
  appearance: AppearanceConfig;
}

export const DEFAULT_CONFIG: AppConfig = {
  finance: {
    currency: "EGP",
    dateFormat: "DD/MM/YYYY",
    fiscalYearStart: "01-01",
    taxRate: 14,
    approvalThreshold: 50000,
  },
  inventory: {
    lowStockThreshold: 20,
    expiryAlertDays: 90,
    enableBatchTracking: true,
    enableColdChain: true,
    defaultWarehouse: "Main Warehouse - Cairo",
  },
  procurement: {
    requireGMPCertification: true,
    requireCoA: true,
    autoGenerateGRN: true,
    supplierRatingScale: 5,
    approvalLevels: 2,
  },
  crm: {
    visitValidationRadius: 100,
    requireGPSForVisits: true,
    dailyVisitTarget: 8,
    coverageTarget: 85,
    doctorSegmentation: "ABCD",
  },
  hr: {
    probationMonths: 3,
    annualLeaveDays: 21,
    enableGMPTraining: true,
    enablePerformanceReviews: true,
    payrollCycle: "Monthly",
  },
  accounting: {
    chartType: "Egyptian",
    enableDeferredRevenue: true,
    enableCheques: true,
    bankReconciliation: "Weekly",
    agingBuckets: [30, 60, 90, 120],
  },
  industry: {
    industry: "PHARMACEUTICAL",
    enabledSolutions: {
      "pharma-batch": true,
      "pharma-regulatory": true,
      "pharma-qc": true,
      "pharma-coldchain": true,
      "pharma-clinical": false,
      "pharma-distribution": true,
      "pharma-expiry": true,
      "pharma-rd": false,
      "pharma-gmp": true,
      "pharma-pv": true,          // pharmacovigilance
      "pharma-serialization": true,
      "pharma-narcotics": false,
    },
  },
  security: {
    passwordMinLength: 10,
    passwordRequireSymbol: true,
    passwordRequireNumber: true,
    passwordRequireUppercase: true,
    passwordExpiryDays: 90,
    sessionTimeoutMinutes: 30,
    maxLoginAttempts: 5,
    enableTwoFactor: false,
    enforceSSO: false,
    ipWhitelistEnabled: false,
    auditLogRetentionDays: 365,
  },
  notifications: {
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    emailFromAddress: "no-reply@pharma.com",
    digestFrequency: "Daily",
    notifyOnExpiry: true,
    notifyOnLowStock: true,
    notifyOnColdChainAlert: true,
    notifyOnApprovalNeeded: true,
    notifyOnNewMarketRequest: true,
  },
  integrations: {
    mapProvider: "OpenStreetMap",
    mapApiKey: "",
    smtpHost: "smtp.pharma.com",
    smtpPort: 587,
    smtpUser: "noreply@pharma.com",
    smtpSecure: true,
    edaApiEnabled: false,
    whatsappEnabled: false,
    whatsappNumber: "",
    webhookUrl: "",
  },
  backup: {
    autoBackupEnabled: true,
    backupFrequency: "Daily",
    retentionDays: 30,
    backupLocation: "Local",
    encryptBackups: true,
    lastBackupAt: "2026-04-10T02:00:00Z",
  },
  localization: {
    defaultLanguage: "en",
    timezone: "Africa/Cairo",
    firstDayOfWeek: "Sunday",
    weekendDays: ["Friday", "Saturday"],
    numberFormat: "1,234.56",
  },
  appearance: {
    theme: "light",
    primaryColor: "blue",
    compactMode: false,
    sidebarDefaultCollapsed: false,
    showCompanyLogo: true,
  },
};

interface ConfigContextValue {
  config: AppConfig;
  updateFinance: (patch: Partial<FinanceConfig>) => void;
  updateInventory: (patch: Partial<InventoryConfig>) => void;
  updateProcurement: (patch: Partial<ProcurementConfig>) => void;
  updateCRM: (patch: Partial<CRMConfig>) => void;
  updateHR: (patch: Partial<HRConfig>) => void;
  updateAccounting: (patch: Partial<AccountingConfig>) => void;
  updateSecurity: (patch: Partial<SecurityConfig>) => void;
  updateNotifications: (patch: Partial<NotificationsConfig>) => void;
  updateIntegrations: (patch: Partial<IntegrationsConfig>) => void;
  updateBackup: (patch: Partial<BackupConfig>) => void;
  updateLocalization: (patch: Partial<LocalizationConfig>) => void;
  updateAppearance: (patch: Partial<AppearanceConfig>) => void;
  toggleIndustrySolution: (id: string) => void;
  resetConfig: () => void;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

const STORAGE_KEY = "pharma.appConfig";

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge so new keys from DEFAULT still appear on old cached configs
        setConfig({
          ...DEFAULT_CONFIG,
          ...parsed,
          finance: { ...DEFAULT_CONFIG.finance, ...parsed.finance },
          inventory: { ...DEFAULT_CONFIG.inventory, ...parsed.inventory },
          procurement: { ...DEFAULT_CONFIG.procurement, ...parsed.procurement },
          crm: { ...DEFAULT_CONFIG.crm, ...parsed.crm },
          hr: { ...DEFAULT_CONFIG.hr, ...parsed.hr },
          accounting: { ...DEFAULT_CONFIG.accounting, ...parsed.accounting },
          security: { ...DEFAULT_CONFIG.security, ...parsed.security },
          notifications: { ...DEFAULT_CONFIG.notifications, ...parsed.notifications },
          integrations: { ...DEFAULT_CONFIG.integrations, ...parsed.integrations },
          backup: { ...DEFAULT_CONFIG.backup, ...parsed.backup },
          localization: { ...DEFAULT_CONFIG.localization, ...parsed.localization },
          appearance: { ...DEFAULT_CONFIG.appearance, ...parsed.appearance },
          industry: {
            ...DEFAULT_CONFIG.industry,
            ...parsed.industry,
            enabledSolutions: {
              ...DEFAULT_CONFIG.industry.enabledSolutions,
              ...(parsed.industry?.enabledSolutions ?? {}),
            },
          },
        });
      }
    } catch {
      // ignore parse errors, keep defaults
    }
  }, []);

  function persist(next: AppConfig) {
    setConfig(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  return (
    <ConfigContext.Provider
      value={{
        config,
        updateFinance: (patch) => persist({ ...config, finance: { ...config.finance, ...patch } }),
        updateInventory: (patch) => persist({ ...config, inventory: { ...config.inventory, ...patch } }),
        updateProcurement: (patch) => persist({ ...config, procurement: { ...config.procurement, ...patch } }),
        updateCRM: (patch) => persist({ ...config, crm: { ...config.crm, ...patch } }),
        updateHR: (patch) => persist({ ...config, hr: { ...config.hr, ...patch } }),
        updateAccounting: (patch) => persist({ ...config, accounting: { ...config.accounting, ...patch } }),
        updateSecurity: (patch) => persist({ ...config, security: { ...config.security, ...patch } }),
        updateNotifications: (patch) => persist({ ...config, notifications: { ...config.notifications, ...patch } }),
        updateIntegrations: (patch) => persist({ ...config, integrations: { ...config.integrations, ...patch } }),
        updateBackup: (patch) => persist({ ...config, backup: { ...config.backup, ...patch } }),
        updateLocalization: (patch) => persist({ ...config, localization: { ...config.localization, ...patch } }),
        updateAppearance: (patch) => persist({ ...config, appearance: { ...config.appearance, ...patch } }),
        toggleIndustrySolution: (id) =>
          persist({
            ...config,
            industry: {
              ...config.industry,
              enabledSolutions: {
                ...config.industry.enabledSolutions,
                [id]: !config.industry.enabledSolutions[id],
              },
            },
          }),
        resetConfig: () => persist(DEFAULT_CONFIG),
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export function useAppConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    // Safe fallback outside provider
    return {
      config: DEFAULT_CONFIG,
      updateFinance: () => {},
      updateInventory: () => {},
      updateProcurement: () => {},
      updateCRM: () => {},
      updateHR: () => {},
      updateAccounting: () => {},
      updateSecurity: () => {},
      updateNotifications: () => {},
      updateIntegrations: () => {},
      updateBackup: () => {},
      updateLocalization: () => {},
      updateAppearance: () => {},
      toggleIndustrySolution: () => {},
      resetConfig: () => {},
    };
  }
  return ctx;
}
