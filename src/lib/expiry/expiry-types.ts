"use client";

// ── Expiry status for inventory items ──────────────────────────────────
export type ExpiryStatus =
  | "active"
  | "near-expiry"
  | "expiring-soon"
  | "expired"
  | "quarantined"
  | "destroyed";

// ── Core item tracked for expiry ───────────────────────────────────────
export interface ExpiryItem {
  id: string;
  productId: string;
  productName: string;
  batchNumber: string;
  quantity: number;
  unit: string;
  location: {
    warehouse: string;
    zone: string;
    shelf: string;
  };
  manufacturedDate: string; // ISO date string
  expiryDate: string; // ISO date string
  daysUntilExpiry: number; // computed
  status: ExpiryStatus;
  lastCheckedAt?: string;
  notes?: string;
}

// ── Alerts generated from expiry scanning ──────────────────────────────
export type ExpiryAlertType =
  | "30-day"
  | "60-day"
  | "90-day"
  | "expired"
  | "quarantine-required";

export type AlertSeverity = "info" | "warning" | "critical";

export interface ExpiryAlert {
  id: string;
  itemId: string;
  batchNumber: string;
  productName: string;
  alertType: ExpiryAlertType;
  severity: AlertSeverity;
  message: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  createdAt: string;
}

// ── Configurable expiry policies per product / category ────────────────
export interface ExpiryPolicy {
  productId?: string;
  category?: string;
  nearExpiryDays: number; // default 90
  expiryWarningDays: number; // default 60
  criticalExpiryDays: number; // default 30
  autoQuarantineDays: number; // default 0 = on expiry
  fefoEnabled: boolean;
}

// ── FEFO (First Expiry First Out) picking result ───────────────────────
export interface FEFOPick {
  productId: string;
  productName: string;
  requestedQty: number;
  picks: {
    batchNumber: string;
    quantity: number;
    expiryDate: string;
    location: string;
  }[];
}

// ── Expiry report summary ──────────────────────────────────────────────
export interface ExpiryReport {
  generatedAt: string;
  totalItems: number;
  expiredCount: number;
  nearExpiryCount: number;
  valueAtRisk: number; // EGP
  itemsByCategory: {
    category: string;
    count: number;
    value: number;
  }[];
}

// ── Threshold constants (days) ─────────────────────────────────────────
export const EXPIRY_THRESHOLDS = {
  critical: 30,
  warning: 60,
  notice: 90,
} as const;
