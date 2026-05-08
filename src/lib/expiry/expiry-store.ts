"use client";

import type {
  ExpiryItem,
  ExpiryAlert,
  ExpiryPolicy,
  FEFOPick,
  ExpiryReport,
  ExpiryAlertType,
  AlertSeverity,
} from "./expiry-types";
import { EXPIRY_THRESHOLDS } from "./expiry-types";

// ── localStorage keys ──────────────────────────────────────────────────
const ITEMS_KEY = "pharma.expiry-items";
const ALERTS_KEY = "pharma.expiry-alerts";
const POLICIES_KEY = "pharma.expiry-policies";

// ── Helpers ────────────────────────────────────────────────────────────
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

// ── Product price lookup (EGP) ─────────────────────────────────────────
const PRODUCT_PRICES: Record<string, number> = {
  "Amoxicillin 500mg": 45,
  "Omeprazole 20mg": 38,
  "Metformin 850mg": 25,
  "Atorvastatin 10mg": 62,
  "Losartan 50mg": 55,
  "Paracetamol 500mg": 12,
  "Ibuprofen 400mg": 18,
  "Ciprofloxacin 500mg": 72,
};

// ── Seed data builder ──────────────────────────────────────────────────
function buildSeedItems(): ExpiryItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const items: Omit<ExpiryItem, "daysUntilExpiry" | "status">[] = [
    // ---- Expired items ----
    { id: "EXP-001", productId: "PRD-001", productName: "Amoxicillin 500mg", batchNumber: "AMX-2024-001", quantity: 200, unit: "boxes", location: { warehouse: "Main Warehouse", zone: "Zone A", shelf: "A-12" }, manufacturedDate: "2023-06-15", expiryDate: isoDate(addDays(today, -15)) },
    { id: "EXP-002", productId: "PRD-003", productName: "Metformin 850mg", batchNumber: "MET-2024-003", quantity: 150, unit: "boxes", location: { warehouse: "Main Warehouse", zone: "Zone B", shelf: "B-04" }, manufacturedDate: "2023-07-20", expiryDate: isoDate(addDays(today, -5)) },
    { id: "EXP-003", productId: "PRD-006", productName: "Paracetamol 500mg", batchNumber: "PAR-2024-001", quantity: 500, unit: "boxes", location: { warehouse: "Returns Area", zone: "R-1", shelf: "R-03" }, manufacturedDate: "2023-03-10", expiryDate: isoDate(addDays(today, -30)) },

    // ---- Critical: expiring within 30 days ----
    { id: "EXP-004", productId: "PRD-002", productName: "Omeprazole 20mg", batchNumber: "OMP-2024-005", quantity: 100, unit: "boxes", location: { warehouse: "Main Warehouse", zone: "Zone A", shelf: "A-08" }, manufacturedDate: "2023-08-01", expiryDate: isoDate(addDays(today, 7)) },
    { id: "EXP-005", productId: "PRD-004", productName: "Atorvastatin 10mg", batchNumber: "ATV-2024-002", quantity: 80, unit: "boxes", location: { warehouse: "Cold Storage", zone: "CS-1", shelf: "CS-02" }, manufacturedDate: "2023-09-12", expiryDate: isoDate(addDays(today, 14)) },
    { id: "EXP-006", productId: "PRD-007", productName: "Ibuprofen 400mg", batchNumber: "IBU-2024-004", quantity: 300, unit: "boxes", location: { warehouse: "Main Warehouse", zone: "Zone C", shelf: "C-11" }, manufacturedDate: "2023-10-05", expiryDate: isoDate(addDays(today, 22)) },
    { id: "EXP-007", productId: "PRD-001", productName: "Amoxicillin 500mg", batchNumber: "AMX-2024-009", quantity: 120, unit: "boxes", location: { warehouse: "Main Warehouse", zone: "Zone A", shelf: "A-14" }, manufacturedDate: "2023-11-20", expiryDate: isoDate(addDays(today, 5)) },

    // ---- Warning: expiring within 60 days ----
    { id: "EXP-008", productId: "PRD-005", productName: "Losartan 50mg", batchNumber: "LOS-2024-006", quantity: 250, unit: "boxes", location: { warehouse: "Main Warehouse", zone: "Zone B", shelf: "B-07" }, manufacturedDate: "2023-12-01", expiryDate: isoDate(addDays(today, 42)) },
    { id: "EXP-009", productId: "PRD-008", productName: "Ciprofloxacin 500mg", batchNumber: "CIP-2024-003", quantity: 60, unit: "boxes", location: { warehouse: "Cold Storage", zone: "CS-2", shelf: "CS-05" }, manufacturedDate: "2024-01-10", expiryDate: isoDate(addDays(today, 50)) },
    { id: "EXP-010", productId: "PRD-002", productName: "Omeprazole 20mg", batchNumber: "OMP-2024-008", quantity: 180, unit: "boxes", location: { warehouse: "Main Warehouse", zone: "Zone A", shelf: "A-09" }, manufacturedDate: "2024-01-15", expiryDate: isoDate(addDays(today, 55)) },
    { id: "EXP-011", productId: "PRD-003", productName: "Metformin 850mg", batchNumber: "MET-2024-007", quantity: 400, unit: "boxes", location: { warehouse: "Main Warehouse", zone: "Zone B", shelf: "B-02" }, manufacturedDate: "2024-02-01", expiryDate: isoDate(addDays(today, 38)) },

    // ---- Notice: expiring within 90 days ----
    { id: "EXP-012", productId: "PRD-006", productName: "Paracetamol 500mg", batchNumber: "PAR-2024-010", quantity: 600, unit: "boxes", location: { warehouse: "Main Warehouse", zone: "Zone C", shelf: "C-01" }, manufacturedDate: "2024-02-20", expiryDate: isoDate(addDays(today, 75)) },
    { id: "EXP-013", productId: "PRD-004", productName: "Atorvastatin 10mg", batchNumber: "ATV-2024-011", quantity: 90, unit: "boxes", location: { warehouse: "Cold Storage", zone: "CS-1", shelf: "CS-03" }, manufacturedDate: "2024-03-01", expiryDate: isoDate(addDays(today, 82)) },
    { id: "EXP-014", productId: "PRD-001", productName: "Amoxicillin 500mg", batchNumber: "AMX-2024-012", quantity: 350, unit: "boxes", location: { warehouse: "Main Warehouse", zone: "Zone A", shelf: "A-16" }, manufacturedDate: "2024-03-10", expiryDate: isoDate(addDays(today, 68)) },
    { id: "EXP-015", productId: "PRD-007", productName: "Ibuprofen 400mg", batchNumber: "IBU-2024-013", quantity: 200, unit: "boxes", location: { warehouse: "Main Warehouse", zone: "Zone C", shelf: "C-08" }, manufacturedDate: "2024-03-15", expiryDate: isoDate(addDays(today, 85)) },

    // ---- Active: >90 days shelf life remaining ----
    { id: "EXP-016", productId: "PRD-005", productName: "Losartan 50mg", batchNumber: "LOS-2025-001", quantity: 500, unit: "boxes", location: { warehouse: "Main Warehouse", zone: "Zone B", shelf: "B-10" }, manufacturedDate: "2024-06-01", expiryDate: isoDate(addDays(today, 180)) },
    { id: "EXP-017", productId: "PRD-008", productName: "Ciprofloxacin 500mg", batchNumber: "CIP-2025-002", quantity: 150, unit: "boxes", location: { warehouse: "Cold Storage", zone: "CS-2", shelf: "CS-06" }, manufacturedDate: "2024-07-01", expiryDate: isoDate(addDays(today, 240)) },
    { id: "EXP-018", productId: "PRD-002", productName: "Omeprazole 20mg", batchNumber: "OMP-2025-003", quantity: 300, unit: "boxes", location: { warehouse: "Main Warehouse", zone: "Zone A", shelf: "A-10" }, manufacturedDate: "2024-08-01", expiryDate: isoDate(addDays(today, 300)) },
    { id: "EXP-019", productId: "PRD-006", productName: "Paracetamol 500mg", batchNumber: "PAR-2025-004", quantity: 1000, unit: "boxes", location: { warehouse: "Main Warehouse", zone: "Zone C", shelf: "C-02" }, manufacturedDate: "2024-09-01", expiryDate: isoDate(addDays(today, 365)) },
    { id: "EXP-020", productId: "PRD-001", productName: "Amoxicillin 500mg", batchNumber: "AMX-2025-005", quantity: 400, unit: "boxes", location: { warehouse: "Main Warehouse", zone: "Zone A", shelf: "A-18" }, manufacturedDate: "2024-10-01", expiryDate: isoDate(addDays(today, 200)) },
    { id: "EXP-021", productId: "PRD-003", productName: "Metformin 850mg", batchNumber: "MET-2025-006", quantity: 250, unit: "boxes", location: { warehouse: "Main Warehouse", zone: "Zone B", shelf: "B-05" }, manufacturedDate: "2024-10-15", expiryDate: isoDate(addDays(today, 150)) },
    { id: "EXP-022", productId: "PRD-004", productName: "Atorvastatin 10mg", batchNumber: "ATV-2025-007", quantity: 120, unit: "boxes", location: { warehouse: "Cold Storage", zone: "CS-1", shelf: "CS-04" }, manufacturedDate: "2024-11-01", expiryDate: isoDate(addDays(today, 270)) },
    { id: "EXP-023", productId: "PRD-007", productName: "Ibuprofen 400mg", batchNumber: "IBU-2025-008", quantity: 450, unit: "boxes", location: { warehouse: "Main Warehouse", zone: "Zone C", shelf: "C-12" }, manufacturedDate: "2024-11-15", expiryDate: isoDate(addDays(today, 320)) },
    { id: "EXP-024", productId: "PRD-005", productName: "Losartan 50mg", batchNumber: "LOS-2025-009", quantity: 180, unit: "boxes", location: { warehouse: "Main Warehouse", zone: "Zone B", shelf: "B-11" }, manufacturedDate: "2024-12-01", expiryDate: isoDate(addDays(today, 120)) },
    { id: "EXP-025", productId: "PRD-008", productName: "Ciprofloxacin 500mg", batchNumber: "CIP-2025-010", quantity: 75, unit: "boxes", location: { warehouse: "Cold Storage", zone: "CS-2", shelf: "CS-07" }, manufacturedDate: "2025-01-01", expiryDate: isoDate(addDays(today, 95)) },
  ];

  return items.map((item) => {
    const days = daysUntil(item.expiryDate);
    return {
      ...item,
      daysUntilExpiry: days,
      status: resolveStatus(days),
    } as ExpiryItem;
  });
}

function resolveStatus(days: number): ExpiryItem["status"] {
  if (days <= 0) return "expired";
  if (days <= EXPIRY_THRESHOLDS.critical) return "expiring-soon";
  if (days <= EXPIRY_THRESHOLDS.warning) return "near-expiry";
  if (days <= EXPIRY_THRESHOLDS.notice) return "near-expiry";
  return "active";
}

function buildSeedAlerts(items: ExpiryItem[]): ExpiryAlert[] {
  const alerts: ExpiryAlert[] = [];
  const now = new Date().toISOString();

  for (const item of items) {
    if (item.daysUntilExpiry <= 0) {
      alerts.push({
        id: `ALR-${generateId()}`,
        itemId: item.id,
        batchNumber: item.batchNumber,
        productName: item.productName,
        alertType: "expired",
        severity: "critical",
        message: `${item.productName} (Batch ${item.batchNumber}) has expired. Immediate quarantine required.`,
        acknowledged: false,
        createdAt: now,
      });
    } else if (item.daysUntilExpiry <= EXPIRY_THRESHOLDS.critical) {
      alerts.push({
        id: `ALR-${generateId()}`,
        itemId: item.id,
        batchNumber: item.batchNumber,
        productName: item.productName,
        alertType: "30-day",
        severity: "critical",
        message: `${item.productName} (Batch ${item.batchNumber}) expires in ${item.daysUntilExpiry} days. Consider promotional pricing or return.`,
        acknowledged: false,
        createdAt: now,
      });
    } else if (item.daysUntilExpiry <= EXPIRY_THRESHOLDS.warning) {
      alerts.push({
        id: `ALR-${generateId()}`,
        itemId: item.id,
        batchNumber: item.batchNumber,
        productName: item.productName,
        alertType: "60-day",
        severity: "warning",
        message: `${item.productName} (Batch ${item.batchNumber}) expires in ${item.daysUntilExpiry} days.`,
        acknowledged: false,
        createdAt: now,
      });
    } else if (item.daysUntilExpiry <= EXPIRY_THRESHOLDS.notice) {
      alerts.push({
        id: `ALR-${generateId()}`,
        itemId: item.id,
        batchNumber: item.batchNumber,
        productName: item.productName,
        alertType: "90-day",
        severity: "info",
        message: `${item.productName} (Batch ${item.batchNumber}) will expire in ${item.daysUntilExpiry} days. Plan stock rotation.`,
        acknowledged: false,
        createdAt: now,
      });
    }
  }
  return alerts;
}

function buildSeedPolicies(): ExpiryPolicy[] {
  return [
    { productId: "PRD-001", category: "Antibiotics", nearExpiryDays: 90, expiryWarningDays: 60, criticalExpiryDays: 30, autoQuarantineDays: 0, fefoEnabled: true },
    { productId: "PRD-002", category: "Gastrointestinal", nearExpiryDays: 90, expiryWarningDays: 60, criticalExpiryDays: 30, autoQuarantineDays: 0, fefoEnabled: true },
    { productId: "PRD-003", category: "Antidiabetic", nearExpiryDays: 90, expiryWarningDays: 60, criticalExpiryDays: 30, autoQuarantineDays: 0, fefoEnabled: true },
    { productId: "PRD-004", category: "Cardiovascular", nearExpiryDays: 120, expiryWarningDays: 90, criticalExpiryDays: 45, autoQuarantineDays: 0, fefoEnabled: true },
    { productId: "PRD-005", category: "Cardiovascular", nearExpiryDays: 90, expiryWarningDays: 60, criticalExpiryDays: 30, autoQuarantineDays: 0, fefoEnabled: true },
    { productId: "PRD-006", category: "Analgesics", nearExpiryDays: 60, expiryWarningDays: 45, criticalExpiryDays: 21, autoQuarantineDays: 0, fefoEnabled: true },
    { productId: "PRD-007", category: "Analgesics", nearExpiryDays: 60, expiryWarningDays: 45, criticalExpiryDays: 21, autoQuarantineDays: 0, fefoEnabled: true },
    { productId: "PRD-008", category: "Antibiotics", nearExpiryDays: 90, expiryWarningDays: 60, criticalExpiryDays: 30, autoQuarantineDays: 0, fefoEnabled: true },
  ];
}

// ── ExpiryStore class ──────────────────────────────────────────────────
export class ExpiryStore {
  private static instance: ExpiryStore | null = null;

  private constructor() {
    this.seed();
  }

  static getInstance(): ExpiryStore {
    if (!ExpiryStore.instance) {
      ExpiryStore.instance = new ExpiryStore();
    }
    return ExpiryStore.instance;
  }

  // ── Persistence helpers ────────────────────────────────────────────

  private read<T>(key: string): T[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T[]) : [];
    } catch {
      return [];
    }
  }

  private write<T>(key: string, data: T[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(data));
  }

  private seed(): void {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(ITEMS_KEY)) {
      const items = buildSeedItems();
      this.write(ITEMS_KEY, items);
      this.write(ALERTS_KEY, buildSeedAlerts(items));
      this.write(POLICIES_KEY, buildSeedPolicies());
    }
  }

  // ── Items CRUD ─────────────────────────────────────────────────────

  getItems(): ExpiryItem[] {
    return this.read<ExpiryItem>(ITEMS_KEY).map((item) => {
      const days = daysUntil(item.expiryDate);
      return { ...item, daysUntilExpiry: days, status: item.status === "quarantined" || item.status === "destroyed" ? item.status : resolveStatus(days) };
    });
  }

  getItemById(id: string): ExpiryItem | undefined {
    return this.getItems().find((i) => i.id === id);
  }

  addItem(item: Omit<ExpiryItem, "id" | "daysUntilExpiry" | "status">): ExpiryItem {
    const items = this.getItems();
    const days = daysUntil(item.expiryDate);
    const newItem: ExpiryItem = {
      ...item,
      id: `EXP-${generateId()}`,
      daysUntilExpiry: days,
      status: resolveStatus(days),
    };
    items.push(newItem);
    this.write(ITEMS_KEY, items);
    return newItem;
  }

  updateItem(id: string, updates: Partial<ExpiryItem>): ExpiryItem | undefined {
    const items = this.getItems();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return undefined;
    items[idx] = { ...items[idx], ...updates };
    this.write(ITEMS_KEY, items);
    return items[idx];
  }

  removeItem(id: string): boolean {
    const items = this.getItems();
    const filtered = items.filter((i) => i.id !== id);
    if (filtered.length === items.length) return false;
    this.write(ITEMS_KEY, filtered);
    return true;
  }

  // ── Alerts ─────────────────────────────────────────────────────────

  getAlerts(): ExpiryAlert[] {
    return this.read<ExpiryAlert>(ALERTS_KEY);
  }

  acknowledgeAlert(alertId: string, acknowledgedBy = "System"): boolean {
    const alerts = this.getAlerts();
    const alert = alerts.find((a) => a.id === alertId);
    if (!alert) return false;
    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date().toISOString();
    this.write(ALERTS_KEY, alerts);
    return true;
  }

  generateAlerts(): ExpiryAlert[] {
    const items = this.getItems();
    const newAlerts = buildSeedAlerts(items);
    this.write(ALERTS_KEY, newAlerts);
    return newAlerts;
  }

  // ── Query helpers ──────────────────────────────────────────────────

  getExpiredItems(): ExpiryItem[] {
    return this.getItems().filter((i) => i.status === "expired");
  }

  getNearExpiryItems(daysAhead: number): ExpiryItem[] {
    return this.getItems().filter(
      (i) => i.daysUntilExpiry > 0 && i.daysUntilExpiry <= daysAhead && i.status !== "quarantined" && i.status !== "destroyed"
    );
  }

  getItemsByProduct(productId: string): ExpiryItem[] {
    return this.getItems().filter((i) => i.productId === productId);
  }

  // ── FEFO picking ───────────────────────────────────────────────────

  calculateFEFO(productId: string, requestedQty: number): FEFOPick {
    const available = this.getItemsByProduct(productId)
      .filter((i) => i.status !== "expired" && i.status !== "quarantined" && i.status !== "destroyed" && i.quantity > 0)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    const productName = available[0]?.productName ?? "";
    const picks: FEFOPick["picks"] = [];
    let remaining = requestedQty;

    for (const item of available) {
      if (remaining <= 0) break;
      const qty = Math.min(remaining, item.quantity);
      picks.push({
        batchNumber: item.batchNumber,
        quantity: qty,
        expiryDate: item.expiryDate,
        location: `${item.location.warehouse} / ${item.location.zone} / ${item.location.shelf}`,
      });
      remaining -= qty;
    }

    return { productId, productName, requestedQty, picks };
  }

  // ── Reporting ──────────────────────────────────────────────────────

  getExpiryReport(): ExpiryReport {
    const items = this.getItems();
    const expired = items.filter((i) => i.status === "expired");
    const nearExpiry = items.filter(
      (i) => i.daysUntilExpiry > 0 && i.daysUntilExpiry <= EXPIRY_THRESHOLDS.notice && i.status !== "quarantined" && i.status !== "destroyed"
    );

    // Value at risk = expired + near-expiry items
    const atRiskItems = [...expired, ...nearExpiry];
    const valueAtRisk = atRiskItems.reduce(
      (sum, i) => sum + i.quantity * (PRODUCT_PRICES[i.productName] ?? 30),
      0
    );

    // Group by category
    const categoryMap: Record<string, { count: number; value: number }> = {};
    for (const item of items) {
      const cat = this.getCategoryForProduct(item.productId);
      if (!categoryMap[cat]) categoryMap[cat] = { count: 0, value: 0 };
      categoryMap[cat].count += 1;
      categoryMap[cat].value += item.quantity * (PRODUCT_PRICES[item.productName] ?? 30);
    }

    return {
      generatedAt: new Date().toISOString(),
      totalItems: items.length,
      expiredCount: expired.length,
      nearExpiryCount: nearExpiry.length,
      valueAtRisk,
      itemsByCategory: Object.entries(categoryMap).map(([category, data]) => ({
        category,
        ...data,
      })),
    };
  }

  private getCategoryForProduct(productId: string): string {
    const policies = this.getPolicies();
    const policy = policies.find((p) => p.productId === productId);
    return policy?.category ?? "General";
  }

  // ── Quarantine ─────────────────────────────────────────────────────

  quarantineExpired(): number {
    const items = this.getItems();
    let count = 0;
    for (const item of items) {
      if (item.status === "expired") {
        item.status = "quarantined";
        item.lastCheckedAt = new Date().toISOString();
        item.notes = `Auto-quarantined on ${new Date().toLocaleDateString()}`;
        count++;
      }
    }
    this.write(ITEMS_KEY, items);
    return count;
  }

  // ── Policies ───────────────────────────────────────────────────────

  getPolicies(): ExpiryPolicy[] {
    return this.read<ExpiryPolicy>(POLICIES_KEY);
  }

  updatePolicy(productId: string, updates: Partial<ExpiryPolicy>): ExpiryPolicy | undefined {
    const policies = this.getPolicies();
    const idx = policies.findIndex((p) => p.productId === productId);
    if (idx === -1) return undefined;
    policies[idx] = { ...policies[idx], ...updates };
    this.write(POLICIES_KEY, policies);
    return policies[idx];
  }
}

// ── Singleton export ───────────────────────────────────────────────────
export const expiryStore = typeof window !== "undefined" ? ExpiryStore.getInstance() : (null as unknown as ExpiryStore);
