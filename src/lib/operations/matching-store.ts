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
   3-Way Matching Store — localStorage-backed singleton
   Key: pharma.three-way-matches
   ──────────────────────────────────────────────────────────── */

const STORAGE_KEY = "pharma.three-way-matches";

// ── Helpers ─────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Default config ──────────────────────────────────────────

const DEFAULT_CONFIG: MatchingConfig = {
  qtyTolerancePct: 2,
  priceTolerancePct: 1,
  autoMatchEnabled: true,
  autoResolveWithinTolerance: false,
  escalationDays: 5,
};

// ── Pharmaceutical vendors for Egypt ────────────────────────

const VENDORS = [
  { id: "V-001", name: "Al-Nile Pharma Supplies" },
  { id: "V-002", name: "Cairo MedChem Co." },
  { id: "V-003", name: "Delta Packaging Materials" },
  { id: "V-004", name: "Pharma Raw Egypt" },
  { id: "V-005", name: "Alexandria Lab Equipment" },
  { id: "V-006", name: "Suez Chemical Trading" },
  { id: "V-007", name: "Giza Excipients Ltd." },
];

const ITEMS = [
  { code: "RM-001", desc: "Amoxicillin Trihydrate API", uom: "kg", price: 285.0 },
  { code: "RM-002", desc: "Metformin HCl API", uom: "kg", price: 142.5 },
  { code: "RM-003", desc: "Paracetamol DC Grade", uom: "kg", price: 98.0 },
  { code: "RM-004", desc: "Omeprazole Pellets 8.5%", uom: "kg", price: 520.0 },
  { code: "RM-005", desc: "Microcrystalline Cellulose PH102", uom: "kg", price: 45.0 },
  { code: "RM-006", desc: "Magnesium Stearate NF", uom: "kg", price: 38.0 },
  { code: "RM-007", desc: "HPMC E5 Premium", uom: "kg", price: 185.0 },
  { code: "RM-008", desc: "Colloidal Silicon Dioxide", uom: "kg", price: 210.0 },
  { code: "RM-009", desc: "PVC/Al Blister Foil", uom: "roll", price: 320.0 },
  { code: "RM-010", desc: "Opadry II White", uom: "kg", price: 275.0 },
  { code: "PM-001", desc: "Carton Box 10x10 Tablets", uom: "pcs", price: 1.25 },
  { code: "PM-002", desc: "Patient Information Leaflet", uom: "pcs", price: 0.15 },
  { code: "PM-003", desc: "Shrink Wrap Film 250mm", uom: "roll", price: 85.0 },
  { code: "EQ-001", desc: "HEPA Filter H14 Grade", uom: "pcs", price: 1850.0 },
  { code: "EQ-002", desc: "Differential Pressure Sensor", uom: "pcs", price: 2400.0 },
];

function pickItems(count: number) {
  const shuffled = [...ITEMS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function buildLineItems(
  count: number,
  variance: "none" | "within-tolerance" | "qty-mismatch" | "price-mismatch" | "mixed",
  config: MatchingConfig
): MatchLineItem[] {
  const items = pickItems(count);
  return items.map((item, idx) => {
    const qtyOrdered = Math.floor(Math.random() * 200) + 20;
    const unitPricePO = item.price;

    let qtyReceived = qtyOrdered;
    let qtyInvoiced = qtyOrdered;
    let unitPriceInvoice = unitPricePO;

    switch (variance) {
      case "none":
        // perfect match
        break;
      case "within-tolerance": {
        const qDrift = 1 + (Math.random() * config.qtyTolerancePct * 0.8) / 100 * (Math.random() > 0.5 ? 1 : -1);
        const pDrift = 1 + (Math.random() * config.priceTolerancePct * 0.8) / 100 * (Math.random() > 0.5 ? 1 : -1);
        qtyReceived = Math.round(qtyOrdered * qDrift);
        qtyInvoiced = qtyReceived;
        unitPriceInvoice = Math.round(unitPricePO * pDrift * 100) / 100;
        break;
      }
      case "qty-mismatch": {
        const qFactor = 1 + (Math.random() * 10 + 3) / 100 * (Math.random() > 0.5 ? 1 : -1);
        qtyReceived = Math.round(qtyOrdered * qFactor);
        qtyInvoiced = qtyReceived;
        break;
      }
      case "price-mismatch": {
        const pFactor = 1 + (Math.random() * 8 + 2) / 100 * (Math.random() > 0.5 ? 1 : -1);
        unitPriceInvoice = Math.round(unitPricePO * pFactor * 100) / 100;
        break;
      }
      case "mixed": {
        if (idx % 2 === 0) {
          const qFactor = 1 + (Math.random() * 10 + 3) / 100 * (Math.random() > 0.5 ? 1 : -1);
          qtyReceived = Math.round(qtyOrdered * qFactor);
          qtyInvoiced = qtyReceived;
        } else {
          const pFactor = 1 + (Math.random() * 8 + 2) / 100 * (Math.random() > 0.5 ? 1 : -1);
          unitPriceInvoice = Math.round(unitPricePO * pFactor * 100) / 100;
        }
        break;
      }
    }

    const qtyVariancePct =
      qtyOrdered === 0
        ? 0
        : Math.round(Math.abs((qtyReceived - qtyOrdered) / qtyOrdered) * 10000) / 100;
    const priceVariancePct =
      unitPricePO === 0
        ? 0
        : Math.round(Math.abs((unitPriceInvoice - unitPricePO) / unitPricePO) * 10000) / 100;

    let lineStatus: MatchLineItem["lineStatus"] = "match";
    if (qtyVariancePct > config.qtyTolerancePct || priceVariancePct > config.priceTolerancePct) {
      lineStatus = "mismatch";
    } else if (qtyVariancePct > 0 || priceVariancePct > 0) {
      lineStatus = "within-tolerance";
    }

    return {
      id: `li-${uid()}`,
      lineNumber: idx + 1,
      itemCode: item.code,
      description: item.desc,
      uom: item.uom,
      qtyOrdered,
      unitPricePO,
      qtyReceived,
      qtyInvoiced,
      unitPriceInvoice,
      qtyVariancePct,
      priceVariancePct,
      lineStatus,
    };
  });
}

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
        id: `exc-${uid()}`,
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
        id: `exc-${uid()}`,
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

// ── Seed Data Generation ────────────────────────────────────

function generateSeedData(): MatchRecord[] {
  const config = DEFAULT_CONFIG;
  const records: MatchRecord[] = [];
  let counter = 0;

  function nextNum(): string {
    counter++;
    return `3WM-2026-${String(counter).padStart(3, "0")}`;
  }

  function makePO(): string {
    return `PO-2026-${String(Math.floor(Math.random() * 900) + 100)}`;
  }
  function makeGRN(): string {
    return `GRN-2026-${String(Math.floor(Math.random() * 900) + 100)}`;
  }
  function makeInv(): string {
    return `INV-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  }

  // 2 fully matched
  for (let i = 0; i < 2; i++) {
    const vendor = VENDORS[i % VENDORS.length];
    const lineItems = buildLineItems(Math.floor(Math.random() * 2) + 2, "none", config);
    const totalPO = lineItems.reduce((s, l) => s + l.qtyOrdered * l.unitPricePO, 0);
    const totalGRN = lineItems.reduce((s, l) => s + l.qtyReceived * l.unitPricePO, 0);
    const totalInv = lineItems.reduce((s, l) => s + l.qtyInvoiced * l.unitPriceInvoice, 0);
    const created = daysAgo(Math.floor(Math.random() * 20) + 10);
    records.push({
      id: `match-${uid()}`,
      matchNumber: nextNum(),
      poNumber: makePO(),
      poDate: daysAgo(Math.floor(Math.random() * 10) + 30),
      grnNumber: makeGRN(),
      grnDate: daysAgo(Math.floor(Math.random() * 5) + 15),
      invoiceNumber: makeInv(),
      invoiceDate: daysAgo(Math.floor(Math.random() * 5) + 12),
      vendorId: vendor.id,
      vendorName: vendor.name,
      status: "matched",
      totalPOAmount: Math.round(totalPO * 100) / 100,
      totalGRNAmount: Math.round(totalGRN * 100) / 100,
      totalInvoiceAmount: Math.round(totalInv * 100) / 100,
      currency: "EGP",
      lineItems,
      exceptions: [],
      createdAt: created,
      matchedAt: daysAgo(Math.floor(Math.random() * 5) + 5),
    });
  }

  // 1 partial match (within tolerance)
  {
    const vendor = VENDORS[2];
    const lineItems = buildLineItems(3, "within-tolerance", config);
    const totalPO = lineItems.reduce((s, l) => s + l.qtyOrdered * l.unitPricePO, 0);
    const totalGRN = lineItems.reduce((s, l) => s + l.qtyReceived * l.unitPricePO, 0);
    const totalInv = lineItems.reduce((s, l) => s + l.qtyInvoiced * l.unitPriceInvoice, 0);
    records.push({
      id: `match-${uid()}`,
      matchNumber: nextNum(),
      poNumber: makePO(),
      poDate: daysAgo(25),
      grnNumber: makeGRN(),
      grnDate: daysAgo(12),
      invoiceNumber: makeInv(),
      invoiceDate: daysAgo(10),
      vendorId: vendor.id,
      vendorName: vendor.name,
      status: "partial-match",
      totalPOAmount: Math.round(totalPO * 100) / 100,
      totalGRNAmount: Math.round(totalGRN * 100) / 100,
      totalInvoiceAmount: Math.round(totalInv * 100) / 100,
      currency: "EGP",
      lineItems,
      exceptions: [],
      createdAt: daysAgo(8),
      matchedAt: daysAgo(3),
    });
  }

  // 1 exception – quantity variance
  {
    const vendor = VENDORS[4];
    const matchId = `match-${uid()}`;
    const lineItems = buildLineItems(2, "qty-mismatch", config);
    const exceptions = buildExceptions(matchId, lineItems, config);
    const totalPO = lineItems.reduce((s, l) => s + l.qtyOrdered * l.unitPricePO, 0);
    const totalGRN = lineItems.reduce((s, l) => s + l.qtyReceived * l.unitPricePO, 0);
    const totalInv = lineItems.reduce((s, l) => s + l.qtyInvoiced * l.unitPriceInvoice, 0);
    records.push({
      id: matchId,
      matchNumber: nextNum(),
      poNumber: makePO(),
      poDate: daysAgo(20),
      grnNumber: makeGRN(),
      grnDate: daysAgo(8),
      invoiceNumber: makeInv(),
      invoiceDate: daysAgo(6),
      vendorId: vendor.id,
      vendorName: vendor.name,
      status: "exception",
      totalPOAmount: Math.round(totalPO * 100) / 100,
      totalGRNAmount: Math.round(totalGRN * 100) / 100,
      totalInvoiceAmount: Math.round(totalInv * 100) / 100,
      currency: "EGP",
      lineItems,
      exceptions,
      createdAt: daysAgo(5),
      assignedTo: "Acc. Salma Ibrahim",
    });
  }

  // 1 pending (missing GRN)
  {
    const vendor = VENDORS[3];
    const matchId = `match-${uid()}`;
    const lineItems = buildLineItems(2, "none", config);
    const totalPO = lineItems.reduce((s, l) => s + l.qtyOrdered * l.unitPricePO, 0);
    const exceptions: MatchException[] = [{
      id: `exc-${uid()}`,
      matchId,
      type: "missing-grn",
      severity: "high",
      description: "Goods Receipt Note has not been recorded for this purchase order.",
      resolved: false,
    }];
    records.push({
      id: matchId,
      matchNumber: nextNum(),
      poNumber: makePO(),
      poDate: daysAgo(5),
      grnNumber: null,
      grnDate: null,
      invoiceNumber: null,
      invoiceDate: null,
      vendorId: vendor.id,
      vendorName: vendor.name,
      status: "pending",
      totalPOAmount: Math.round(totalPO * 100) / 100,
      totalGRNAmount: 0,
      totalInvoiceAmount: 0,
      currency: "EGP",
      lineItems,
      exceptions,
      createdAt: daysAgo(1),
    });
  }

  return records;
}

// ── Store Class ─────────────────────────────────────────────

class ThreeWayMatchingStore {
  private static instance: ThreeWayMatchingStore;

  private constructor() {
    this.seed();
  }

  static getInstance(): ThreeWayMatchingStore {
    if (!ThreeWayMatchingStore.instance) {
      ThreeWayMatchingStore.instance = new ThreeWayMatchingStore();
    }
    return ThreeWayMatchingStore.instance;
  }

  // ── Persistence ──────────────────────────────────────────

  private seed(): void {
    if (typeof window === "undefined") return;
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(generateSeedData()));
    }
  }

  private load(): MatchRecord[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MatchRecord[]) : [];
  }

  private save(data: MatchRecord[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // ── CRUD ─────────────────────────────────────────────────

  getAll(): MatchRecord[] {
    return this.load();
  }

  getById(id: string): MatchRecord | undefined {
    return this.load().find((r) => r.id === id);
  }

  getByStatus(status: MatchStatus): MatchRecord[] {
    return this.load().filter((r) => r.status === status);
  }

  getByVendor(vendorId: string): MatchRecord[] {
    return this.load().filter((r) => r.vendorId === vendorId);
  }

  getExceptions(): MatchRecord[] {
    return this.load().filter((r) => r.status === "exception" || r.exceptions.some((e) => !e.resolved));
  }

  getPendingAndExceptions(): MatchRecord[] {
    return this.load().filter(
      (r) => r.status === "pending" || r.status === "exception" || r.status === "partial-match" || r.status === "mismatch"
    );
  }

  create(record: Omit<MatchRecord, "id" | "matchNumber">): MatchRecord {
    if (!record.poNumber?.trim()) throw new Error("Match record PO number is required");
    if (!record.vendorName?.trim()) throw new Error("Match record vendor name is required");
    const all = this.load();
    const newRecord: MatchRecord = {
      ...record,
      id: `match-${uid()}`,
      matchNumber: this.generateNumber(),
    };
    all.push(newRecord);
    this.save(all);
    return newRecord;
  }

  update(id: string, updates: Partial<MatchRecord>): MatchRecord | undefined {
    const all = this.load();
    const idx = all.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    all[idx] = { ...all[idx], ...updates };
    this.save(all);
    return all[idx];
  }

  delete(id: string): boolean {
    const all = this.load();
    const filtered = all.filter((r) => r.id !== id);
    if (filtered.length === all.length) return false;
    this.save(filtered);
    return true;
  }

  // ── Auto-Match Engine ────────────────────────────────────

  runMatching(
    recordIds?: string[],
    config: MatchingConfig = DEFAULT_CONFIG
  ): { matched: number; partial: number; exceptions: number; total: number } {
    const all = this.load();
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

      const idx = all.findIndex((r) => r.id === record.id);
      if (idx !== -1) {
        all[idx] = {
          ...all[idx],
          lineItems: updatedLines,
          exceptions: newExceptions,
          status: newStatus,
          matchedAt: newStatus === "matched" ? new Date().toISOString() : all[idx].matchedAt,
        };
      }
    }

    this.save(all);
    return { matched, partial, exceptions, total: targets.length };
  }

  // ── Resolution Workflow ──────────────────────────────────

  resolveException(
    matchId: string,
    exceptionId: string,
    action: ResolutionAction,
    resolvedBy: string,
    notes?: string
  ): MatchRecord | undefined {
    const all = this.load();
    const idx = all.findIndex((r) => r.id === matchId);
    if (idx === -1) return undefined;

    const record = all[idx];
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

    all[idx] = {
      ...record,
      exceptions: updatedExceptions,
      status: newStatus,
      resolvedAt: allResolved ? new Date().toISOString() : record.resolvedAt,
    };

    this.save(all);
    return all[idx];
  }

  bulkResolve(
    matchIds: string[],
    action: ResolutionAction,
    resolvedBy: string,
    notes?: string
  ): number {
    let count = 0;
    const all = this.load();

    for (const matchId of matchIds) {
      const idx = all.findIndex((r) => r.id === matchId);
      if (idx === -1) continue;

      const record = all[idx];
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
      all[idx] = {
        ...record,
        exceptions: updatedExceptions,
        status: allResolved ? "resolved" : record.status,
        resolvedAt: allResolved ? new Date().toISOString() : record.resolvedAt,
      };
    }

    this.save(all);
    return count;
  }

  // ── Number Generation ────────────────────────────────────

  generateNumber(): string {
    const all = this.load();
    const year = new Date().getFullYear();
    const prefix = `3WM-${year}-`;
    const existing = all
      .filter((r) => r.matchNumber.startsWith(prefix))
      .map((r) => parseInt(r.matchNumber.replace(prefix, ""), 10))
      .filter((n) => !isNaN(n));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `${prefix}${String(next).padStart(3, "0")}`;
  }

  // ── Config ───────────────────────────────────────────────

  getConfig(): MatchingConfig {
    return { ...DEFAULT_CONFIG };
  }

  // ── Metrics ──────────────────────────────────────────────

  getMetrics(): MatchingMetrics {
    const all = this.load();

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
