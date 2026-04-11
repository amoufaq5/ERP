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

export interface AppConfig {
  finance: FinanceConfig;
  inventory: InventoryConfig;
  procurement: ProcurementConfig;
  crm: CRMConfig;
  hr: HRConfig;
  accounting: AccountingConfig;
  industry: IndustryConfig;
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
};

interface ConfigContextValue {
  config: AppConfig;
  updateFinance: (patch: Partial<FinanceConfig>) => void;
  updateInventory: (patch: Partial<InventoryConfig>) => void;
  updateProcurement: (patch: Partial<ProcurementConfig>) => void;
  updateCRM: (patch: Partial<CRMConfig>) => void;
  updateHR: (patch: Partial<HRConfig>) => void;
  updateAccounting: (patch: Partial<AccountingConfig>) => void;
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
      toggleIndustrySolution: () => {},
      resetConfig: () => {},
    };
  }
  return ctx;
}
