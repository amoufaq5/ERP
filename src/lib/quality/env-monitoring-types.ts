"use client";

// ─── EU GMP Annex 1 Zone Classifications ────────────────────────────────────

export type ZoneClassification =
  | "Grade A"
  | "Grade B"
  | "Grade C"
  | "Grade D"
  | "Unclassified";

export type AreaType =
  | "cleanroom"
  | "filling"
  | "corridor"
  | "warehouse"
  | "lab";

export type ParameterType =
  | "viable-air"
  | "non-viable-particles"
  | "surface"
  | "temperature"
  | "humidity"
  | "differential-pressure";

export type ReadingResult = "pass" | "alert" | "action" | "fail";

export type ExcursionStatus = "open" | "investigating" | "resolved" | "closed";

// ─── Alert & Action Limits ──────────────────────────────────────────────────

export interface AlertLimit {
  value: number;
  unit: string;
}

export interface ActionLimit {
  value: number;
  unit: string;
}

// ─── Monitoring Location ────────────────────────────────────────────────────

export interface MonitoringLocation {
  id: string;
  name: string;
  zone: ZoneClassification;
  areaType: AreaType;
  building: string;
  floor: string;
  description: string;
  isActive: boolean;
}

// ─── Monitoring Point ───────────────────────────────────────────────────────

export interface MonitoringPoint {
  id: string;
  locationId: string;
  name: string;
  parameter: ParameterType;
  samplingFrequency: string; // e.g. "Daily", "Weekly", "Per shift"
  alertLimit: AlertLimit;
  actionLimit: ActionLimit;
  unit: string;
  method: string;
  isActive: boolean;
}

// ─── Monitoring Reading ─────────────────────────────────────────────────────

export interface MonitoringReading {
  id: string;
  pointId: string;
  locationId: string;
  timestamp: string; // ISO date-time
  value: number;
  unit: string;
  result: ReadingResult;
  operator: string;
  batchRef?: string;
  notes?: string;
}

// ─── Excursion Record ───────────────────────────────────────────────────────

export interface ExcursionRecord {
  id: string;
  readingId: string;
  pointId: string;
  locationId: string;
  status: ExcursionStatus;
  detectedAt: string;
  value: number;
  limit: number;
  limitType: "alert" | "action";
  parameter: ParameterType;
  investigationNotes: string;
  rootCause?: string;
  capaRef?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  assignedTo: string;
}

// ─── Trend Data ─────────────────────────────────────────────────────────────

export interface TrendDataPoint {
  date: string;
  value: number;
  result: ReadingResult;
}

export interface TrendData {
  pointId: string;
  pointName: string;
  locationName: string;
  parameter: ParameterType;
  unit: string;
  alertLimit: number;
  actionLimit: number;
  data: TrendDataPoint[];
}

// ─── Dashboard Metrics ──────────────────────────────────────────────────────

export interface EMMetrics {
  totalLocations: number;
  activePoints: number;
  readingsToday: number;
  readingsThisWeek: number;
  alertsToday: number;
  alertsThisWeek: number;
  excursionsOpen: number;
  excursionsThisMonth: number;
  complianceRate: number; // percentage of pass readings
  locationStatusSummary: Record<ZoneClassification, {
    total: number;
    normal: number;
    alert: number;
    action: number;
  }>;
}

// ─── Parameter Labels & Units ───────────────────────────────────────────────

export const PARAMETER_LABELS: Record<ParameterType, string> = {
  "viable-air": "Viable Air (CFU)",
  "non-viable-particles": "Non-Viable Particles",
  surface: "Surface Monitoring (CFU)",
  temperature: "Temperature",
  humidity: "Relative Humidity",
  "differential-pressure": "Differential Pressure",
};

export const PARAMETER_UNITS: Record<ParameterType, string> = {
  "viable-air": "CFU/m³",
  "non-viable-particles": "particles/m³",
  surface: "CFU/plate",
  temperature: "°C",
  humidity: "%RH",
  "differential-pressure": "Pa",
};

export const ZONE_LABELS: Record<ZoneClassification, string> = {
  "Grade A": "Grade A (ISO 5)",
  "Grade B": "Grade B (ISO 5/7)",
  "Grade C": "Grade C (ISO 7/8)",
  "Grade D": "Grade D (ISO 8)",
  Unclassified: "Unclassified",
};
