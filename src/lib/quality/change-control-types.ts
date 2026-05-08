"use client";

export type ChangeCategory =
  | "process"
  | "equipment"
  | "material"
  | "facility"
  | "document"
  | "system"
  | "supplier"
  | "packaging";

export type ChangeType = "minor" | "major" | "critical";

export type ChangeStatus =
  | "draft"
  | "submitted"
  | "impact-assessment"
  | "review"
  | "approved"
  | "implementation"
  | "verification"
  | "closed"
  | "rejected";

export type ChangePriority = "low" | "medium" | "high" | "urgent";

export type ImpactLevel = "none" | "low" | "medium" | "high";

export type RiskLevel = "low" | "medium" | "high";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "deferred";

export type StepStatus = "pending" | "in-progress" | "completed" | "overdue";

export interface ImpactAssessment {
  qualityImpact: ImpactLevel;
  regulatoryImpact: ImpactLevel;
  safetyImpact: ImpactLevel;
  productionImpact: ImpactLevel;
  financialImpact: ImpactLevel;
  validationRequired: boolean;
  regulatoryFilingRequired: boolean;
  customerNotificationRequired: boolean;
  assessedBy: string;
  assessedAt: string;
  notes: string;
}

export interface Approval {
  role: string;
  name: string;
  status: ApprovalStatus;
  comments?: string;
  date?: string;
}

export interface ImplementationStep {
  id: string;
  step: number;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: StepStatus;
  completedAt?: string;
  evidence?: string;
}

export interface ChangeRequest {
  id: string;
  number: string;
  title: string;
  description: string;
  category: ChangeCategory;
  type: ChangeType;
  status: ChangeStatus;
  priority: ChangePriority;
  requestedBy: string;
  requestedAt: string;
  department: string;
  affectedAreas: string[];
  affectedProducts: string[];
  affectedDocuments: string[];
  justification: string;
  riskLevel: RiskLevel;
  impactAssessment?: ImpactAssessment;
  approvals: Approval[];
  implementationPlan: ImplementationStep[];
  verificationResults?: string;
  closedAt?: string;
  closedBy?: string;
  relatedCAPAId?: string;
  relatedOOSId?: string;
}

export interface ChangeControlMetrics {
  total: number;
  open: number;
  avgCycleDays: number;
  onTimeClosurePct: number;
  byCategory: { category: string; count: number }[];
  byType: { type: string; count: number }[];
}
