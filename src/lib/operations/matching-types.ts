"use client";

/* ────────────────────────────────────────────────────────────
   3-Way Matching (PO / GRN / Invoice) – Type Definitions
   Egyptian Pharmaceutical ERP
   ──────────────────────────────────────────────────────────── */

// ── Status ──────────────────────────────────────────────────

export type MatchStatus =
  | "pending"
  | "matched"
  | "partial-match"
  | "mismatch"
  | "exception"
  | "resolved";

export type ExceptionType =
  | "qty-variance"
  | "price-variance"
  | "missing-grn"
  | "missing-invoice";

export type ExceptionSeverity = "low" | "medium" | "high" | "critical";

export type ResolutionAction = "approve" | "reject" | "escalate";

// ── Line Items ──────────────────────────────────────────────

export interface MatchLineItem {
  id: string;
  lineNumber: number;
  itemCode: string;
  description: string;
  uom: string;
  /* Purchase Order quantities / prices */
  qtyOrdered: number;
  unitPricePO: number;
  /* Goods Receipt Note quantities */
  qtyReceived: number;
  /* Invoice quantities / prices */
  qtyInvoiced: number;
  unitPriceInvoice: number;
  /* Computed variances (absolute %) */
  qtyVariancePct: number;
  priceVariancePct: number;
  /* Status per line */
  lineStatus: "match" | "within-tolerance" | "mismatch";
}

// ── Exception ───────────────────────────────────────────────

export interface MatchException {
  id: string;
  matchId: string;
  lineItemId?: string;
  type: ExceptionType;
  severity: ExceptionSeverity;
  description: string;
  varianceAmount?: number;
  variancePct?: number;
  /* Resolution */
  resolved: boolean;
  resolution?: ResolutionAction;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

// ── Match Record ────────────────────────────────────────────

export interface MatchRecord {
  id: string;
  matchNumber: string;
  /* Document References */
  poNumber: string;
  poDate: string;
  grnNumber: string | null;
  grnDate: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  /* Vendor */
  vendorId: string;
  vendorName: string;
  /* Status */
  status: MatchStatus;
  /* Totals */
  totalPOAmount: number;
  totalGRNAmount: number;
  totalInvoiceAmount: number;
  currency: string;
  /* Line items */
  lineItems: MatchLineItem[];
  /* Exceptions */
  exceptions: MatchException[];
  /* Timestamps */
  createdAt: string;
  matchedAt?: string;
  resolvedAt?: string;
  /* Assignment */
  assignedTo?: string;
  notes?: string;
}

// ── Configuration ───────────────────────────────────────────

export interface MatchingConfig {
  qtyTolerancePct: number;   // default ±2 %
  priceTolerancePct: number; // default ±1 %
  autoMatchEnabled: boolean;
  autoResolveWithinTolerance: boolean;
  escalationDays: number;    // days before auto-escalation
}

// ── Dashboard Metrics ───────────────────────────────────────

export interface MatchingMetrics {
  totalMatches: number;
  fullyMatched: number;
  partialMatches: number;
  exceptions: number;
  pending: number;
  resolved: number;
  matchRatePct: number;
  avgResolutionDays: number;
  byVendor: { vendorName: string; total: number; matched: number; exceptions: number }[];
  byExceptionType: { type: ExceptionType; count: number }[];
  monthlyTrend: { month: string; matched: number; exceptions: number; total: number }[];
}
