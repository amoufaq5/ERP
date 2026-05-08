"use client";

export type DocumentCategory =
  | "SOP"
  | "Work Instruction"
  | "Form"
  | "Policy"
  | "Specification"
  | "Validation Protocol";

export type DocumentStatus =
  | "draft"
  | "in-review"
  | "approved"
  | "effective"
  | "superseded"
  | "obsolete";

export type DocumentPrefix = "SOP" | "WI" | "FRM" | "POL" | "SPEC" | "VP";

export interface DocumentVersion {
  versionNumber: string;
  changeSummary: string;
  author: string;
  reviewer: string;
  approver: string;
  createdAt: string;
  reviewedAt?: string;
  approvedAt?: string;
  effectiveAt?: string;
}

export type ReviewStatus = "pending" | "in-progress" | "completed" | "overdue";

export interface DocumentReview {
  id: string;
  documentId: string;
  reviewer: string;
  status: ReviewStatus;
  comments: string;
  dueDate: string;
  completedAt?: string;
  assignedAt: string;
}

export interface DocumentTraining {
  id: string;
  documentId: string;
  documentNumber: string;
  documentTitle: string;
  requiredFor: string[];
  trainingType: "read-and-understand" | "hands-on" | "assessment";
  dueDate: string;
  completedBy: string[];
  pendingFor: string[];
}

export interface ControlledDocument {
  id: string;
  documentNumber: string;
  title: string;
  category: DocumentCategory;
  department: string;
  currentVersion: string;
  effectiveDate: string;
  reviewDate: string;
  nextReviewDate: string;
  status: DocumentStatus;
  description: string;
  author: string;
  reviewer: string;
  approver: string;
  versions: DocumentVersion[];
  reviews: DocumentReview[];
  training: DocumentTraining | null;
  relatedDocuments: string[];
  keywords: string[];
  confidentiality: "public" | "internal" | "confidential" | "restricted";
  retentionYears: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentMetrics {
  total: number;
  effective: number;
  dueForReview: number;
  overdueReviews: number;
  trainingPending: number;
  byCategory: { category: string; count: number }[];
  byDepartment: { department: string; count: number }[];
  byStatus: { status: string; count: number }[];
  reviewCompliancePct: number;
  avgVersionsPerDoc: number;
}
