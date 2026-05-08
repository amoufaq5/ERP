"use client";

/* ── Qualification status ── */
export type QualificationStatus =
  | "new"
  | "qualified"
  | "preferred"
  | "probation"
  | "disqualified";

/* ── Vendor category ── */
export type VendorCategory =
  | "api-supplier"
  | "excipient-supplier"
  | "packaging-supplier"
  | "equipment-vendor"
  | "service-provider";

/* ── Score dimensions ── */
export interface QualityDimension {
  defectRate: number;        // % defective incoming lots (lower = better)
  oosRate: number;           // % out-of-spec results (lower = better)
  capaCount: number;         // open CAPAs against vendor
  score: number;             // 0–100 computed
}

export interface DeliveryDimension {
  onTimePercent: number;     // % shipments on time
  leadTimeVariance: number;  // days variance from agreed lead time
  score: number;             // 0–100 computed
}

export interface ComplianceDimension {
  auditScore: number;        // latest audit result 0–100
  certifications: string[];  // ISO, GMP, WHO-PQ, etc.
  regulatoryStatus: "clear" | "warning" | "critical";
  score: number;             // 0–100 computed
}

export interface CommercialDimension {
  pricingCompetitiveness: number; // 0–100 (100 = most competitive)
  paymentTermsDays: number;       // net days
  score: number;                  // 0–100 computed
}

/* ── Audit types ── */
export type AuditType = "initial" | "periodic" | "for-cause" | "follow-up";

export type AuditStatus = "scheduled" | "in-progress" | "completed" | "cancelled";

export interface AuditFinding {
  id: string;
  description: string;
  severity: "critical" | "major" | "minor" | "observation";
  correctiveAction?: string;
  dueDate?: string;
  status: "open" | "closed";
}

export interface VendorAudit {
  id: string;
  vendorId: string;
  auditType: AuditType;
  scheduledDate: string;
  completedDate?: string;
  auditor: string;
  status: AuditStatus;
  findings: AuditFinding[];
  score?: number;              // 0–100

  correctiveActionsRequired: number;
  correctiveActionsClosed: number;
  notes?: string;
}

/* ── Score history for trending ── */
export interface ScoreHistory {
  date: string;                // ISO date
  overallScore: number;
  qualityScore: number;
  deliveryScore: number;
  complianceScore: number;
  commercialScore: number;
}

/* ── Core vendor score record ── */
export interface VendorScore {
  id: string;
  vendorCode: string;
  vendorName: string;
  category: VendorCategory;
  country: string;
  contactPerson: string;
  contactEmail: string;

  qualificationStatus: QualificationStatus;
  qualifiedDate?: string;
  nextReviewDate: string;

  quality: QualityDimension;
  delivery: DeliveryDimension;
  compliance: ComplianceDimension;
  commercial: CommercialDimension;

  overallScore: number;       // weighted average 0–100
  scoreHistory: ScoreHistory[];
  audits: VendorAudit[];

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/* ── Dashboard metrics ── */
export interface VendorScorecardMetrics {
  totalVendors: number;
  qualifiedCount: number;
  preferredCount: number;
  probationCount: number;
  disqualifiedCount: number;
  newCount: number;
  averageScore: number;
  topPerformers: { vendorName: string; score: number }[];
  atRiskVendors: { vendorName: string; score: number; reason: string }[];
  byCategory: { category: VendorCategory; count: number; avgScore: number }[];
}
