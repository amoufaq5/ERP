"use client";

import type {
  ExpiryItem,
  ExpiryAlert,
  ExpiryPolicy,
  FEFOPick,
  ExpiryReport,
} from "./expiry-types";
import { EXPIRY_THRESHOLDS } from "./expiry-types";

const API_BASE = "/api/v1/expiry";

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function resolveStatus(days: number): ExpiryItem["status"] {
  if (days <= 0) return "expired";
  if (days <= EXPIRY_THRESHOLDS.critical) return "expiring-soon";
  if (days <= EXPIRY_THRESHOLDS.warning) return "expiring-soon";
  if (days <= EXPIRY_THRESHOLDS.notice) return "near-expiry";
  return "active";
}

function enrichItem(item: ExpiryItem): ExpiryItem {
  const days = daysUntil(item.expiryDate);
  return {
    ...item,
    daysUntilExpiry: days,
    status: item.status === "quarantined" || item.status === "destroyed"
      ? item.status
      : resolveStatus(days),
  };
}

export class ExpiryStore {
  private static instance: ExpiryStore | null = null;
  private itemsCache: ExpiryItem[] | null = null;
  private alertsCache: ExpiryAlert[] | null = null;
  private policiesCache: ExpiryPolicy[] | null = null;

  private constructor() {}

  static getInstance(): ExpiryStore {
    if (!ExpiryStore.instance) {
      ExpiryStore.instance = new ExpiryStore();
    }
    return ExpiryStore.instance;
  }

  private async fetchItems(): Promise<ExpiryItem[]> {
    if (this.itemsCache) return this.itemsCache;
    try {
      const res = await fetch(`${API_BASE}/items`);
      if (!res.ok) return [];
      const data = await res.json();
      this.itemsCache = ((data.data ?? data) as ExpiryItem[]).map(enrichItem);
      return this.itemsCache;
    } catch {
      return [];
    }
  }

  private async fetchAlerts(): Promise<ExpiryAlert[]> {
    if (this.alertsCache) return this.alertsCache;
    try {
      const res = await fetch(`${API_BASE}/alerts`);
      if (!res.ok) return [];
      const data = await res.json();
      this.alertsCache = data.data ?? data;
      return this.alertsCache!;
    } catch {
      return [];
    }
  }

  private async fetchPolicies(): Promise<ExpiryPolicy[]> {
    if (this.policiesCache) return this.policiesCache;
    try {
      const res = await fetch(`${API_BASE}/policies`);
      if (!res.ok) return [];
      const data = await res.json();
      this.policiesCache = data.data ?? data;
      return this.policiesCache!;
    } catch {
      return [];
    }
  }

  private invalidateItems(): void { this.itemsCache = null; }
  private invalidateAlerts(): void { this.alertsCache = null; }

  async getItems(): Promise<ExpiryItem[]> {
    return this.fetchItems();
  }

  async getItemById(id: string): Promise<ExpiryItem | undefined> {
    const items = await this.fetchItems();
    return items.find((i) => i.id === id);
  }

  async addItem(item: Omit<ExpiryItem, "id" | "daysUntilExpiry" | "status">): Promise<ExpiryItem> {
    if (!item.productName?.trim()) throw new Error("Expiry item product name is required");
    if (!item.batchNumber?.trim()) throw new Error("Expiry item batch number is required");
    if (!item.expiryDate?.trim()) throw new Error("Expiry item expiry date is required");
    if (isNaN(new Date(item.expiryDate).getTime())) throw new Error("Expiry item expiry date is invalid");

    const res = await fetch(`${API_BASE}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error("Failed to create expiry item");
    const created = await res.json();
    this.invalidateItems();
    return enrichItem(created);
  }

  async updateItem(id: string, updates: Partial<ExpiryItem>): Promise<ExpiryItem | undefined> {
    const res = await fetch(`${API_BASE}/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) return undefined;
    const updated = await res.json();
    this.invalidateItems();
    return enrichItem(updated);
  }

  async removeItem(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/items/${id}`, { method: "DELETE" });
    this.invalidateItems();
    return res.ok;
  }

  async getAlerts(): Promise<ExpiryAlert[]> {
    return this.fetchAlerts();
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy = "System"): Promise<boolean> {
    const res = await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acknowledgedBy }),
    });
    this.invalidateAlerts();
    return res.ok;
  }

  async generateAlerts(): Promise<ExpiryAlert[]> {
    const res = await fetch(`${API_BASE}/alerts/generate`, { method: "POST" });
    if (!res.ok) return [];
    const data = await res.json();
    this.invalidateAlerts();
    return data.data ?? data;
  }

  async getExpiredItems(): Promise<ExpiryItem[]> {
    const items = await this.getItems();
    return items.filter((i) => i.status === "expired");
  }

  async getNearExpiryItems(daysAhead: number): Promise<ExpiryItem[]> {
    const items = await this.getItems();
    return items.filter(
      (i) => i.daysUntilExpiry > 0 && i.daysUntilExpiry <= daysAhead && i.status !== "quarantined" && i.status !== "destroyed"
    );
  }

  async getItemsByProduct(productId: string): Promise<ExpiryItem[]> {
    const items = await this.getItems();
    return items.filter((i) => i.productId === productId);
  }

  async calculateFEFO(productId: string, requestedQty: number): Promise<FEFOPick> {
    const allItems = await this.getItemsByProduct(productId);
    const available = allItems
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

  async getExpiryReport(): Promise<ExpiryReport> {
    const items = await this.getItems();
    const policies = await this.getPolicies();
    const expired = items.filter((i) => i.status === "expired");
    const nearExpiry = items.filter(
      (i) => i.daysUntilExpiry > 0 && i.daysUntilExpiry <= EXPIRY_THRESHOLDS.notice && i.status !== "quarantined" && i.status !== "destroyed"
    );

    const atRiskItems = [...expired, ...nearExpiry];
    const estimateUnitPrice = 30;
    const valueAtRisk = atRiskItems.reduce(
      (sum, i) => sum + i.quantity * estimateUnitPrice,
      0
    );

    const categoryMap: Record<string, { count: number; value: number }> = {};
    for (const item of items) {
      const policy = policies.find((p) => p.productId === item.productId);
      const cat = policy?.category ?? "General";
      if (!categoryMap[cat]) categoryMap[cat] = { count: 0, value: 0 };
      categoryMap[cat].count += 1;
      categoryMap[cat].value += item.quantity * estimateUnitPrice;
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

  async quarantineExpired(): Promise<number> {
    const res = await fetch(`${API_BASE}/items/quarantine-expired`, { method: "POST" });
    if (!res.ok) return 0;
    const data = await res.json();
    this.invalidateItems();
    return data.count ?? 0;
  }

  async getPolicies(): Promise<ExpiryPolicy[]> {
    return this.fetchPolicies();
  }

  async updatePolicy(productId: string, updates: Partial<ExpiryPolicy>): Promise<ExpiryPolicy | undefined> {
    const res = await fetch(`${API_BASE}/policies/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) return undefined;
    this.policiesCache = null;
    return res.json();
  }
}

export const expiryStore = typeof window !== "undefined" ? ExpiryStore.getInstance() : (null as unknown as ExpiryStore);
