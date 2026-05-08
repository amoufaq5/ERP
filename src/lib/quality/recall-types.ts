"use client";

// ─── Recall Status Workflow ──────────────────────────────────────────────────
export type RecallStatus =
  | "initiated"
  | "risk-assessment"
  | "notification"
  | "retrieval"
  | "reconciliation"
  | "effectiveness-check"
  | "closed";

// ─── FDA Recall Classification ───────────────────────────────────────────────
export type RecallClass = "I" | "II" | "III";

export type RecallType = "voluntary" | "mandatory" | "market-withdrawal";

export type RecallPriority = "low" | "medium" | "high" | "critical";

// ─── Notification Types ──────────────────────────────────────────────────────
export type RecipientType =
  | "regulatory"
  | "distributors"
  | "pharmacies"
  | "hospitals"
  | "public";

export type NotificationMethod =
  | "email"
  | "fax"
  | "phone"
  | "letter"
  | "press-release"
  | "portal";

export interface RecallNotification {
  id: string;
  recipientType: RecipientType;
  recipientName: string;
  method: NotificationMethod;
  dateSent: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  notes?: string;
}

// ─── Retrieval Tracking ──────────────────────────────────────────────────────
export interface RecallRetrieval {
  id: string;
  location: string;
  distributor: string;
  region: string;
  quantityShipped: number;
  quantityReturned: number;
  quantityDestroyed: number;
  quantityRemaining: number;
  status: "pending" | "in-progress" | "completed";
  lastUpdated: string;
}

// ─── Risk Assessment ─────────────────────────────────────────────────────────
export interface RecallRiskAssessment {
  healthHazard: "none" | "low" | "moderate" | "serious" | "life-threatening";
  populationExposed: number;
  likelihoodOfHarm: "remote" | "low" | "moderate" | "high";
  assessedBy: string;
  assessedAt: string;
  notes: string;
}

// ─── Effectiveness Check ─────────────────────────────────────────────────────
export interface RecallEffectivenessCheck {
  id: string;
  checkLevel: "A" | "B" | "C" | "D" | "E";
  recoveryRate: number;
  remainingRisk: "none" | "low" | "moderate" | "high";
  regulatoryClosure: boolean;
  regulatoryReference?: string;
  conductedBy: string;
  conductedAt: string;
  findings: string;
  recommendation: "close" | "extend" | "escalate";
}

// ─── Affected Batch ──────────────────────────────────────────────────────────
export interface AffectedBatch {
  batchNumber: string;
  productName: string;
  manufacturingDate: string;
  expiryDate: string;
  quantityManufactured: number;
  quantityDistributed: number;
  quantityOnHand: number;
  distributedTo: string[];
}

// ─── Main Recall Record ──────────────────────────────────────────────────────
export interface RecallRecord {
  id: string;
  number: string; // RCL-YYYY-NNN
  product: string;
  affectedBatches: AffectedBatch[];
  recallClass: RecallClass;
  type: RecallType;
  reason: string;
  description: string;
  status: RecallStatus;
  priority: RecallPriority;
  initiatedBy: string;
  initiatedAt: string;
  department: string;
  riskAssessment?: RecallRiskAssessment;
  notifications: RecallNotification[];
  retrievals: RecallRetrieval[];
  effectivenessChecks: RecallEffectivenessCheck[];
  rootCause?: string;
  correctiveActions?: string;
  regulatoryReportNumber?: string;
  closedAt?: string;
  closedBy?: string;
}

// ─── Dashboard Metrics ───────────────────────────────────────────────────────
export interface RecallMetrics {
  total: number;
  active: number;
  classIActive: number;
  classIIActive: number;
  classIIIActive: number;
  avgRecoveryRate: number;
  pendingNotifications: number;
  byClass: { recallClass: RecallClass; count: number }[];
  byType: { type: RecallType; count: number }[];
  byStatus: { status: RecallStatus; count: number }[];
  avgResponseTimeDays: number;
}
