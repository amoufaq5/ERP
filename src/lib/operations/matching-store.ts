"use client";

import type {
  MatchRecord,
  MatchStatus,
  MatchLineItem,
  MatchException,
  MatchingConfig,
  MatchingMetrics,
  ExceptionType,
  ExceptionSeverity,
  ResolutionAction,
} from "./matching-types";

/* ────────────────────────────────────────────────────────────
   3-Way Matching Store — API-backed singleton
   Endpoint: /api/v1/three-way-match
   ──────────────────────────────────────────────────────────── */

const API_BASE = "/api/v1/three-way-match";

// ── Helpers ─────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)
  );
}

// ── Default config ──────────────────────────────────────────

const DEFAULT_CONFIG: MatchingConfig = {
  qtyTolerancePct: 2,
  priceTolerancePct: 1,
  autoMatchEnabled: true,
  autoResolveWithinTolerance: false,
  escalationDays: 5,
};

// ── API helpers ─────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ── Business logic: exception building (tolerance checks) ──

function buildExceptions(
  matchId: string,
  lineItems: MatchLineItem[],
  config: MatchingConfig
): MatchException[] {
  const exceptions: MatchException[] = [];
  for (const li of lineItems) {
    if (li.qtyVariancePct > config.qtyTolerancePct) {
      const severity: ExceptionSeverity =
        li.qtyVariancePct > 10 ? "critical" : li.qtyVariancePct > 5 ? "high" : "medium";
      exceptions.push({
        id: `exc-${crypto.randomUUID()}`,
        matchId,
        lineItemId: li.id,
        type: "qty-variance",
        severity,
        description: `Quantity variance of ${li.qtyVariancePct}% on ${li.description} (ordered: ${li.qtyOrdered}, received: ${li.qtyReceived})`,
        varianceAmount: Math.abs(li.qtyReceived - li.qtyOrdered),
        variancePct: li.qtyVariancePct,
        resolved: false,
      });
    }
    if (li.priceVariancePct > config.priceTolerancePct) {
      const severity: ExceptionSeverity =
        li.priceVariancePct > 8 ? "critical" : li.priceVariancePct > 4 ? "high" : "medium";
      exceptions.push({
        id: `exc-${crypto.randomUUID()}`,
        matchId,
        lineItemId: li.id,
        type: "price-variance",
        severity,
        description: `Price variance of ${li.priceVariancePct}% on ${li.description} (PO: ${li.unitPricePO} EGP, Invoice: ${li.unitPriceInvoice} EGP)`,
        varianceAmount: Math.abs(li.unitPriceInvoice - li.unitPricePO),
        variancePct: li.priceVariancePct,
        resolved: false,
      });
    }
  }
  return exceptions;
}

// ── Store Class ─────────────────────────────────────────────

class ThreeWayMatchingStore {
  private static instance: ThreeWayMatchingStore;
  private cache: MatchRecord[] = [];
  private initPromise: Promise<void> | null = null;

  private constructor() {
    this.initPromise = this.initialize();
  }

  static getInstance(): ThreeWayMatchingStore {
    if (!ThreeWayMatchingStore.instance) {
      ThreeWayMatchingStore.instance = new ThreeWayMatchingStore();
    }
    return ThreeWayMatchingStore.instance;
  }

  // ── Initialization ──────────────────────────────────────

  private async initialize(): Promise<void> {
    try {
      this.cache = await apiFetch<MatchRecord[]>("");
    } catch {
      this.cache = [];
    }
  }

  private async ensureLoaded(): Promise<MatchRecord[]> {
    if (this.initPromise) {
      await this.initPromise;
      this.initPromise = null;
    }
    return this.cache;
  }

  async refresh(): Promise<void> {
    this.cache = await apiFetch<MatchRecord[]>("");
  }

  // ── CRUD ─────────────────────────────────────────────────

  getAll(): MatchRecord[] {
    return this.cache;
  }

  getById(id: string): MatchRecord | undefined {
    return this.cache.find((r) => r.id === id);
  }

  getByStatus(status: MatchStatus): MatchRecord[] {
    return this.cache.filter((r) => r.status === status);
  }

  getByVendor(vendorId: string): MatchRecord[] {
    return this.cache.filter((r) => r.vendorId === vendorId);
  }

  getExceptions(): MatchRecord[] {
    return this.cache.filter((r) => r.status === "exception" || r.exceptions.some((e) => !e.resolved));
  }

  getPendingAndExceptions(): MatchRecord[] {
    return this.cache.filter(
      (r) => r.status === "pending" || r.status === "exception" || r.status === "partial-match" || r.status === "mismatch"
    );
  }

  async create(record: Omit<MatchRecord, "id" | "matchNumber">): Promise<MatchRecord> {
    if (!record.poNumber?.trim()) throw new Error("Match record PO number is required");
    if (!record.vendorName?.trim()) throw new Error("Match record vendor name is required");
    const newRecord = await apiFetch<MatchRecord>("", {
      method: "POST",
      body: JSON.stringify(record),
    });
    await this.refresh();
    return newRecord;
  }

  async update(id: string, updates: Partial<MatchRecord>): Promise<MatchRecord | undefined> {
    try {
      const updated = await apiFetch<MatchRecord>(`/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      await this.refresh();
      return updated;
    } catch {
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await apiFetch(`/${id}`, { method: "DELETE" });
      await this.refresh();
      return true;
    } catch {
      return false;
    }
  }

  // ── Auto-Match Engine ────────────────────────────────────

  async runMatching(
    recordIds?: string[],
    config: MatchingConfig = DEFAULT_CONFIG
  ): Promise<{ matched: number; partial: number; exceptions: number; total: number }> {
    await this.ensureLoaded();
    const all = [...this.cache];
    const targets = recordIds
      ? all.filter((r) => recordIds.includes(r.id))
      : all.filter((r) => r.status === "pending" || r.status === "mismatch");

    let matched = 0;
    let partial = 0;
    let exceptions = 0;

    for (const record of targets) {
      if (!record.grnNumber || !record.invoiceNumber) {
        // Cannot fully match without all three documents
        continue;
      }

      // Re-evaluate each line
      const updatedLines: MatchLineItem[] = record.lineItems.map((li) => {
        const qtyVariancePct =
          li.qtyOrdered === 0
            ? 0
            : Math.round(Math.abs((li.qtyReceived - li.qtyOrdered) / li.qtyOrdered) * 10000) / 100;
        const priceVariancePct =
          li.unitPricePO === 0
            ? 0
            : Math.round(Math.abs((li.unitPriceInvoice - li.unitPricePO) / li.unitPricePO) * 10000) / 100;

        let lineStatus: MatchLineItem["lineStatus"] = "match";
        if (qtyVariancePct > config.qtyTolerancePct || priceVariancePct > config.priceTolerancePct) {
          lineStatus = "mismatch";
        } else if (qtyVariancePct > 0 || priceVariancePct > 0) {
          lineStatus = "within-tolerance";
        }

        return { ...li, qtyVariancePct, priceVariancePct, lineStatus };
      });

      const newExceptions = buildExceptions(record.id, updatedLines, config);

      // Determine overall status
      const hasMismatch = updatedLines.some((l) => l.lineStatus === "mismatch");
      const hasWithinTolerance = updatedLines.some((l) => l.lineStatus === "within-tolerance");

      let newStatus: MatchStatus;
      if (newExceptions.length > 0 || hasMismatch) {
        newStatus = "exception";
        exceptions++;
      } else if (hasWithinTolerance) {
        newStatus = "partial-match";
        partial++;
      } else {
        newStatus = "matched";
        matched++;
      }

      // Persist the updated record via API
      await this.update(record.id, {
        lineItems: updatedLines,
        exceptions: newExceptions,
        status: newStatus,
        matchedAt: newStatus === "matched" ? new Date().toISOString() : record.matchedAt,
      });
    }

    await this.refresh();
    return { matched, partial, exceptions, total: targets.length };
  }

  // ── Resolution Workflow ──────────────────────────────────

  async resolveException(
    matchId: string,
    exceptionId: string,
    action: ResolutionAction,
    resolvedBy: string,
    notes?: string
  ): Promise<MatchRecord | undefined> {
    const record = this.cache.find((r) => r.id === matchId);
    if (!record) return undefined;

    const updatedExceptions = record.exceptions.map((exc) => {
      if (exc.id === exceptionId) {
        return {
          ...exc,
          resolved: action !== "escalate",
          resolution: action,
          resolvedBy,
          resolvedAt: new Date().toISOString(),
          resolutionNotes: notes,
        };
      }
      return exc;
    });

    // Check if all exceptions are resolved
    const allResolved = updatedExceptions.every((e) => e.resolved);
    const newStatus: MatchStatus = allResolved ? "resolved" : record.status;

    return this.update(matchId, {
      exceptions: updatedExceptions,
      status: newStatus,
      resolvedAt: allResolved ? new Date().toISOString() : record.resolvedAt,
    });
  }

  async bulkResolve(
    matchIds: string[],
    action: ResolutionAction,
    resolvedBy: string,
    notes?: string
  ): Promise<number> {
    let count = 0;

    for (const matchId of matchIds) {
      const record = this.cache.find((r) => r.id === matchId);
      if (!record) continue;

      const updatedExceptions = record.exceptions.map((exc) => {
        if (!exc.resolved) {
          count++;
          return {
            ...exc,
            resolved: action !== "escalate",
            resolution: action,
            resolvedBy,
            resolvedAt: new Date().toISOString(),
            resolutionNotes: notes,
          };
        }
        return exc;
      });

      const allResolved = updatedExceptions.every((e) => e.resolved);
      await this.update(matchId, {
        exceptions: updatedExceptions,
        status: allResolved ? "resolved" : record.status,
        resolvedAt: allResolved ? new Date().toISOString() : record.resolvedAt,
      });
    }

    return count;
  }

  // ── Config ───────────────────────────────────────────────

  getConfig(): MatchingConfig {
    return { ...DEFAULT_CONFIG };
  }

  // ── Metrics ──────────────────────────────────────────────

  getMetrics(): MatchingMetrics {
    const all = this.cache;

    const fullyMatched = all.filter((r) => r.status === "matched").length;
    const partialMatches = all.filter((r) => r.status === "partial-match").length;
    const exceptionCount = all.filter((r) => r.status === "exception").length;
    const pending = all.filter((r) => r.status === "pending").length;
    const resolved = all.filter((r) => r.status === "resolved").length;

    const matchRatePct =
      all.length > 0
        ? Math.round(((fullyMatched + partialMatches + resolved) / all.length) * 100)
        : 0;

    // Average resolution days
    const resolvedRecords = all.filter((r) => r.resolvedAt);
    const avgResolutionDays =
      resolvedRecords.length > 0
        ? Math.round(
            resolvedRecords.reduce(
              (sum, r) => sum + daysBetween(r.createdAt, r.resolvedAt!),
              0
            ) / resolvedRecords.length
          )
        : 0;

    // By vendor
    const vendorMap = new Map<string, { total: number; matched: number; exceptions: number }>();
    for (const r of all) {
      const v = vendorMap.get(r.vendorName) || { total: 0, matched: 0, exceptions: 0 };
      v.total++;
      if (r.status === "matched" || r.status === "resolved") v.matched++;
      if (r.status === "exception") v.exceptions++;
      vendorMap.set(r.vendorName, v);
    }
    const byVendor = Array.from(vendorMap.entries()).map(([vendorName, stats]) => ({
      vendorName,
      ...stats,
    }));

    // By exception type
    const typeMap = new Map<ExceptionType, number>();
    for (const r of all) {
      for (const e of r.exceptions) {
        typeMap.set(e.type, (typeMap.get(e.type) || 0) + 1);
      }
    }
    const byExceptionType = Array.from(typeMap.entries()).map(([type, count]) => ({
      type,
      count,
    }));

    // Monthly trend (last 6 months)
    const monthlyTrend: MatchingMetrics["monthlyTrend"] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = d.toLocaleString("en-US", { month: "short", year: "numeric" });
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

      const inMonth = all.filter((r) => {
        const created = new Date(r.createdAt);
        return created >= monthStart && created <= monthEnd;
      });

      monthlyTrend.push({
        month: monthStr,
        matched: inMonth.filter((r) => r.status === "matched" || r.status === "resolved").length,
        exceptions: inMonth.filter((r) => r.status === "exception").length,
        total: inMonth.length,
      });
    }

    return {
      totalMatches: all.length,
      fullyMatched,
      partialMatches,
      exceptions: exceptionCount,
      pending,
      resolved,
      matchRatePct,
      avgResolutionDays,
      byVendor,
      byExceptionType,
      monthlyTrend,
    };
  }
}

export const matchingStore = ThreeWayMatchingStore.getInstance();
