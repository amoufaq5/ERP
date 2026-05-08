"use client";

// ─── Status ──────────────────────────────────────────────────────────────────

export type ReleaseStatus =
  | "pending-review"
  | "under-review"
  | "checklist-complete"
  | "qp-review"
  | "approved"
  | "rejected"
  | "on-hold"
  | "released-to-market";

// ─── Checklist ───────────────────────────────────────────────────────────────

export type ChecklistItemStatus = "pending" | "passed" | "failed" | "na";

export type ChecklistCategory =
  | "manufacturing"
  | "qc"
  | "regulatory"
  | "documentation";

export interface ChecklistItem {
  id: string;
  category: ChecklistCategory;
  description: string;
  required: boolean;
  status: ChecklistItemStatus;
  reviewer?: string;
  date?: string;
  comments?: string;
}

export interface ReleaseChecklist {
  items: ChecklistItem[];
}

// ─── QP Decision ─────────────────────────────────────────────────────────────

export type QPDecisionType = "release" | "reject" | "hold";

export interface QPDecision {
  qpName: string;
  decision: QPDecisionType;
  justification: string;
  conditions?: string[];
  date: string;
  signature: string;
}

// ─── Regulatory Hold ─────────────────────────────────────────────────────────

export interface RegulatoryHold {
  reason: string;
  placedBy: string;
  date: string;
  expectedResolution?: string;
}

// ─── Linked Records ──────────────────────────────────────────────────────────

export interface LinkedRecords {
  bprNumber?: string;
  deviations?: string[];
  oosInvestigations?: string[];
  coaNumber?: string;
  stabilityStudy?: string;
  changeControls?: string[];
}

// ─── Batch Release ───────────────────────────────────────────────────────────

export interface BatchRelease {
  id: string;
  number: string; // REL-YYYY-NNN
  product: string;
  batchNumber: string;
  batchSize: string;
  manufacturingDate: string;
  expiryDate: string;
  status: ReleaseStatus;
  priority: "normal" | "high" | "urgent";
  assignedQP?: string;
  reviewStartedAt?: string;
  checklist: ReleaseChecklist;
  linkedRecords: LinkedRecords;
  qpDecision?: QPDecision;
  regulatoryHold?: RegulatoryHold;
  releasedToMarketAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

export interface ReleaseMetrics {
  pending: number;
  underReview: number;
  releasedThisMonth: number;
  avgReviewDays: number;
  rejectionRate: number;
  onHold: number;
  totalReleased: number;
}
