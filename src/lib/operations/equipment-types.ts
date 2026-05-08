"use client";

/* ────────────────────────────────────────────────────────────
   Equipment Calibration & Maintenance  --  Type Definitions
   Egyptian Pharmaceutical GMP ERP
   ──────────────────────────────────────────────────────────── */

// ── Equipment ──────────────────────────────────────────────

export type EquipmentType =
  | "production"
  | "lab"
  | "utility"
  | "HVAC"
  | "water-system";

export type EquipmentCriticality = "critical" | "major" | "minor";

export type EquipmentStatus =
  | "operational"
  | "under-maintenance"
  | "calibration-due"
  | "out-of-service"
  | "retired";

export interface Equipment {
  id: string;
  assetTag: string;
  name: string;
  type: EquipmentType;
  model: string;
  serialNumber: string;
  manufacturer: string;
  location: string;
  department: string;
  criticality: EquipmentCriticality;
  status: EquipmentStatus;
  installationDate: string;
  lastCalibrationDate?: string;
  nextCalibrationDue?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDue?: string;
  notes?: string;
}

// ── Calibration ────────────────────────────────────────────

export type CalibrationResult = "pass" | "fail" | "adjusted";

export interface CalibrationRecord {
  id: string;
  equipmentId: string;
  calibrationDate: string;
  nextDueDate: string;
  standardUsed: string;
  standardCertificate: string;
  result: CalibrationResult;
  certificateNumber: string;
  performedBy: string;
  verifiedBy?: string;
  asFoundReadings: string;
  asLeftReadings: string;
  temperatureC?: number;
  humidityPct?: number;
  notes?: string;
}

// ── Maintenance ────────────────────────────────────────────

export type MaintenanceType = "preventive" | "corrective" | "breakdown";

export type MaintenancePriority = "low" | "medium" | "high" | "urgent";

export type MaintenanceOrderStatus =
  | "planned"
  | "in-progress"
  | "completed"
  | "cancelled"
  | "on-hold";

export interface PartUsed {
  partName: string;
  partNumber: string;
  quantity: number;
  unitCost: number;
}

export interface MaintenanceOrder {
  id: string;
  orderNumber: string;
  equipmentId: string;
  type: MaintenanceType;
  priority: MaintenancePriority;
  description: string;
  assignedTo: string;
  scheduledDate: string;
  completionDate?: string;
  partsUsed: PartUsed[];
  downtimeHours: number;
  status: MaintenanceOrderStatus;
  rootCause?: string;
  correctiveAction?: string;
  createdAt: string;
}

// ── Maintenance Schedule ───────────────────────────────────

export type ScheduleFrequency =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "semi-annual"
  | "annual";

export interface ChecklistItem {
  id: string;
  description: string;
  required: boolean;
}

export interface MaintenanceSchedule {
  id: string;
  equipmentId: string;
  frequency: ScheduleFrequency;
  lastPerformed?: string;
  nextDue: string;
  checklistItems: ChecklistItem[];
  assignedTo: string;
  active: boolean;
}

// ── Dashboard Metrics ──────────────────────────────────────

export interface EquipmentMetrics {
  totalEquipment: number;
  operational: number;
  underMaintenance: number;
  calibrationDue: number;
  outOfService: number;
  calibrationCompliancePct: number;
  pmCompliancePct: number;
  mtbfDays: number;
  mttrHours: number;
  byType: { type: EquipmentType; count: number }[];
  byDepartment: { department: string; count: number }[];
  monthlyDowntime: { month: string; hours: number }[];
  topFailureModes: { mode: string; count: number }[];
}

// ── Calendar Event (shared with calendar component) ────────

export type CalendarEventType =
  | "calibration-due"
  | "calibration-overdue"
  | "pm-scheduled"
  | "corrective-maintenance";

export interface CalendarEvent {
  id: string;
  equipmentId: string;
  equipmentName: string;
  date: string;
  eventType: CalendarEventType;
  description: string;
}
