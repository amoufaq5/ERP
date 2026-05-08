"use client";

// ─── HVAC Unit Types ───────────────────────────────────────────────────────

export type HVACUnitType =
  | "AHU"
  | "exhaust"
  | "laminar-flow"
  | "isolator"
  | "pass-through";

export type GradeClassification = "A" | "B" | "C" | "D";

export type HVACUnitStatus = "operational" | "maintenance" | "alarm" | "offline";

export interface DesignParameters {
  supplyAirVolume?: number;       // m3/h
  returnAirVolume?: number;       // m3/h
  freshAirPercentage?: number;    // %
  coolingCapacity?: number;       // kW
  heatingCapacity?: number;       // kW
  filterStages?: string;          // e.g. "G4 + F9 + H14"
  fanType?: string;
  motorPower?: number;            // kW
  airVelocity?: number;           // m/s (for laminar flow)
}

export interface HVACUnit {
  id: string;
  name: string;
  type: HVACUnitType;
  areaServed: string;
  grade: GradeClassification;
  building: string;
  floor: string;
  designParameters: DesignParameters;
  status: HVACUnitStatus;
  installationDate: string;
  lastMaintenanceDate?: string;
  description: string;
  isActive: boolean;
}

// ─── HVAC Parameters ───────────────────────────────────────────────────────

export type HVACParameterType =
  | "temperature"
  | "humidity"
  | "differential-pressure"
  | "air-changes-per-hour"
  | "particle-count-0.5um"
  | "particle-count-5um"
  | "air-velocity"
  | "recovery-time"
  | "filter-integrity";

export type ReadingResult = "pass" | "alert" | "action" | "fail";

// ─── HVAC Reading ──────────────────────────────────────────────────────────

export interface HVACReading {
  id: string;
  unitId: string;
  parameter: HVACParameterType;
  value: number;
  unit: string;
  alertLimit: number;
  actionLimit: number;
  result: ReadingResult;
  timestamp: string;
  operator: string;
  notes?: string;
}

// ─── HVAC Qualification ────────────────────────────────────────────────────

export type QualificationType = "IQ" | "OQ" | "PQ";

export type QualificationStatus =
  | "planned"
  | "in-progress"
  | "passed"
  | "failed"
  | "requalification-due";

export interface TestResult {
  id: string;
  testName: string;
  acceptanceCriteria: string;
  actualResult: string;
  status: "pass" | "fail" | "pending";
  testedBy?: string;
  testedDate?: string;
  notes?: string;
}

export interface HVACQualification {
  id: string;
  protocolNumber: string;
  unitId: string;
  type: QualificationType;
  status: QualificationStatus;
  scheduledDate: string;
  startedDate?: string;
  completedDate?: string;
  approvedBy?: string;
  testResults: TestResult[];
  deviations?: string;
  conclusion?: string;
  nextQualificationDue?: string;
}

// ─── Filter Record ─────────────────────────────────────────────────────────

export type FilterType = "HEPA" | "pre-filter";

export type FilterStatus =
  | "active"
  | "due-for-test"
  | "failed"
  | "replaced"
  | "scheduled";

export interface FilterRecord {
  id: string;
  unitId: string;
  filterType: FilterType;
  filterModel: string;
  location: string;
  installationDate: string;
  lastIntegrityTest?: string;
  lastTestResult?: "pass" | "fail";
  nextTestDue: string;
  status: FilterStatus;
  efficiency?: string;       // e.g. "H14 - 99.995%"
  replacementDate?: string;
  notes?: string;
}

// ─── HVAC Alarm ────────────────────────────────────────────────────────────

export type AlarmSeverity = "alert" | "action" | "critical";

export interface HVACAlarm {
  id: string;
  unitId: string;
  parameter: HVACParameterType;
  value: number;
  limit: number;
  limitType: "alert" | "action";
  severity: AlarmSeverity;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  notes?: string;
}

// ─── HVAC Metrics ──────────────────────────────────────────────────────────

export interface HVACMetrics {
  totalUnits: number;
  operationalUnits: number;
  activeAlarms: number;
  acknowledgedAlarms: number;
  filtersDueCount: number;
  filtersFailedCount: number;
  qualificationsDue: number;
  complianceRate: number;
  unitsByGrade: Record<GradeClassification, number>;
  unitsByType: Record<HVACUnitType, number>;
}

// ─── Parameter Labels & Units ──────────────────────────────────────────────

export const HVAC_PARAMETER_LABELS: Record<HVACParameterType, string> = {
  temperature: "Temperature",
  humidity: "Relative Humidity",
  "differential-pressure": "Differential Pressure",
  "air-changes-per-hour": "Air Changes/Hour",
  "particle-count-0.5um": "Particles >= 0.5µm",
  "particle-count-5um": "Particles >= 5µm",
  "air-velocity": "Air Velocity",
  "recovery-time": "Recovery Time",
  "filter-integrity": "Filter Integrity",
};

export const HVAC_PARAMETER_UNITS: Record<HVACParameterType, string> = {
  temperature: "°C",
  humidity: "%RH",
  "differential-pressure": "Pa",
  "air-changes-per-hour": "ACH",
  "particle-count-0.5um": "particles/m³",
  "particle-count-5um": "particles/m³",
  "air-velocity": "m/s",
  "recovery-time": "min",
  "filter-integrity": "%",
};

export const GRADE_LABELS: Record<GradeClassification, string> = {
  A: "Grade A (ISO 5)",
  B: "Grade B (ISO 5/7)",
  C: "Grade C (ISO 7/8)",
  D: "Grade D (ISO 8)",
};

export const UNIT_TYPE_LABELS: Record<HVACUnitType, string> = {
  AHU: "Air Handling Unit",
  exhaust: "Exhaust System",
  "laminar-flow": "Laminar Flow Hood",
  isolator: "Isolator",
  "pass-through": "Pass-Through Hatch",
};
