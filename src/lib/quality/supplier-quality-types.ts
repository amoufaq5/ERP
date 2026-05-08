"use client";

/* ─── Material Type ─── */
export type MaterialType = "api" | "excipient" | "packaging" | "raw";

/* ─── SQA Status ─── */
export type SQAStatus =
  | "draft"
  | "under-review"
  | "active"
  | "expired"
  | "terminated";

/* ─── Pharmacopoeia Reference ─── */
export type PharmacopoeiaRef = "EP" | "USP" | "BP" | "in-house";

/* ─── CoA Compliance Status ─── */
export type CoAComplianceStatus = "compliant" | "non-compliant" | "pending-review";

/* ─── Approved Supplier Status ─── */
export type ApprovedSupplierStatus = "approved" | "conditional" | "suspended" | "disqualified";

/* ─── Qualification Status ─── */
export type MaterialQualificationStatus = "pending" | "in-progress" | "qualified" | "failed" | "expired";

/* ─── Regulatory Status ─── */
export type RegulatoryStatus = "filed" | "approved" | "pending" | "not-required";

/* ─── Test Result ─── */
export interface TestWithCriteria {
  testName: string;
  method: string;
  acceptanceCriteria: string;
  unit?: string;
}

/* ─── CoA Test Result ─── */
export interface CoATestResult {
  testName: string;
  method: string;
  acceptanceCriteria: string;
  result: string;
  unit?: string;
  pass: boolean;
}

/* ─── Supplier Quality Agreement ─── */
export interface SupplierQualityAgreement {
  id: string;
  number: string; // SQA-YYYY-NNN
  supplierName: string;
  supplierCode: string;
  materialType: MaterialType;
  materialsScope: string[];
  effectiveDate: string;
  expiryDate: string;
  reviewDate: string;
  status: SQAStatus;
  version: string;
  terms: string[];
  reviewHistory: { date: string; reviewer: string; notes: string }[];
  contactPerson: string;
  contactEmail: string;
  createdAt: string;
  updatedAt: string;
}

/* ─── Material Specification ─── */
export interface MaterialSpecification {
  id: string;
  materialName: string;
  materialCode: string;
  materialType: MaterialType;
  pharmacopoeiaRef: PharmacopoeiaRef;
  version: string;
  effectiveDate: string;
  tests: TestWithCriteria[];
  approvedBy: string;
  approvedAt: string;
}

/* ─── Certificate of Analysis ─── */
export interface CertificateOfAnalysis {
  id: string;
  coaNumber: string;
  materialName: string;
  materialCode: string;
  batchNumber: string;
  supplierName: string;
  supplierBatchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  testsPerformed: CoATestResult[];
  complianceStatus: CoAComplianceStatus;
  receivedDate: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  specificationId: string;
  hasDeviations: boolean;
}

/* ─── Approved Supplier List Entry ─── */
export interface ApprovedSupplierEntry {
  id: string;
  supplierName: string;
  supplierCode: string;
  country: string;
  materialsApprovedFor: string[];
  materialTypes: MaterialType[];
  qualificationDate: string;
  nextAuditDue: string;
  lastAuditDate: string;
  status: ApprovedSupplierStatus;
  gmpCertificate: string | null;
  qualityAgreementId: string | null;
  rating: number; // 1-5
  notes: string;
}

/* ─── Material Qualification ─── */
export interface MaterialQualification {
  id: string;
  materialName: string;
  materialCode: string;
  supplierName: string;
  supplierCode: string;
  qualificationTests: { testName: string; result: string; pass: boolean }[];
  stabilityData: { condition: string; duration: string; result: string }[];
  regulatoryStatus: RegulatoryStatus;
  qualificationStatus: MaterialQualificationStatus;
  qualifiedBy: string | null;
  qualifiedAt: string | null;
  notes: string;
}

/* ─── Supplier Quality Metrics (Dashboard) ─── */
export interface SupplierQualityMetrics {
  totalAgreements: number;
  activeAgreements: number;
  expiringSoonCount: number;
  totalApprovedSuppliers: number;
  pendingCoAs: number;
  totalCoAs: number;
  coaAcceptanceRate: number;
  totalMaterialSpecs: number;
  qualifiedMaterials: number;
  averageSupplierRating: number;
  byMaterialType: { type: MaterialType; count: number }[];
  byAgreementStatus: { status: SQAStatus; count: number }[];
  supplierPerformance: { supplier: string; coaCount: number; acceptRate: number; rating: number }[];
}
