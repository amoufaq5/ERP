"use client";

export type TrainingType = "initial" | "refresher" | "retraining" | "on-the-job";

export type TrainingStatus =
  | "scheduled"
  | "in-progress"
  | "completed"
  | "overdue"
  | "expired";

export type TrainingFrequency = "annual" | "biannual" | "on-change";

export type CompetencyLevel = "not-trained" | "in-training" | "competent" | "expert";

export type TrainingPriority = "low" | "medium" | "high" | "critical";

export interface TrainingRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  department: string;
  documentId: string;
  documentTitle: string;
  trainingType: TrainingType;
  status: TrainingStatus;
  scheduledDate: string;
  completionDate?: string;
  expiryDate?: string;
  trainer: string;
  assessmentScore?: number;
  assessmentPassMark: number;
  competencyLevel: CompetencyLevel;
  notes?: string;
  certificateRef?: string;
}

export interface TrainingRequirement {
  id: string;
  role: string;
  department: string;
  documentId: string;
  documentTitle: string;
  frequency: TrainingFrequency;
  mandatory: boolean;
  priority: TrainingPriority;
  validityMonths: number;
  assessmentRequired: boolean;
  passMark: number;
}

export interface TrainingPlan {
  id: string;
  name: string;
  description: string;
  role: string;
  department: string;
  requirements: TrainingRequirement[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface TrainingSession {
  id: string;
  title: string;
  documentId: string;
  documentTitle: string;
  trainingType: TrainingType;
  trainer: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  location: string;
  maxAttendees: number;
  attendeeIds: string[];
  attendeeNames: string[];
  status: "planned" | "in-progress" | "completed" | "cancelled";
  completedAt?: string;
  notes?: string;
}

export interface TrainingMatrixCell {
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  department: string;
  documentId: string;
  documentTitle: string;
  competencyLevel: CompetencyLevel;
  status: TrainingStatus | "not-required";
  lastTrainingDate?: string;
  expiryDate?: string;
  daysUntilExpiry?: number;
  recordId?: string;
}

export interface TrainingMetrics {
  totalRequirements: number;
  totalRecords: number;
  completedCount: number;
  overdueCount: number;
  expiringIn30Days: number;
  scheduledSessions: number;
  complianceRate: number;
  avgAssessmentScore: number;
  byDepartment: { department: string; compliance: number; total: number; completed: number }[];
  byRole: { role: string; compliance: number; total: number; completed: number }[];
  byDocument: { documentId: string; documentTitle: string; compliance: number; total: number; completed: number }[];
  competencyDistribution: { level: CompetencyLevel; count: number }[];
  overdueByDepartment: { department: string; count: number }[];
  trainingHoursThisMonth: number;
  trainingHoursThisYear: number;
}
