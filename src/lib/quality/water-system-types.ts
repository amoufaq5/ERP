"use client";

// ─── Water System Types ─────────────────────────────────────────────────────
// USP <1231> / EP 2.2.44 compliant water quality monitoring types

export type WaterType = "purified-water" | "WFI" | "potable" | "process";

export type GenerationMethod = "RO" | "EDI" | "distillation" | "UV" | "RO+EDI" | "multi-effect-distillation" | "chlorination" | "filtration";

export type SamplingPointLocation =
  | "generation"
  | "storage"
  | "loop-supply"
  | "loop-return"
  | "point-of-use";

export type WaterTestParameterType =
  | "TOC"
  | "conductivity"
  | "microbial-count"
  | "endotoxin"
  | "pH"
  | "chlorine"
  | "heavy-metals"
  | "nitrate"
  | "appearance";

export type WaterReadingResult = "pass" | "alert" | "action" | "fail";

export type WaterSystemStatus = "normal" | "alert" | "action" | "shutdown";

export type WaterExcursionStatus = "open" | "investigating" | "resolved" | "closed";

// ─── Water System ───────────────────────────────────────────────────────────

export interface WaterSystem {
  id: string;
  name: string;
  type: WaterType;
  generationMethod: GenerationMethod;
  storageCapacityLiters: number;
  loopDescription: string;
  building: string;
  isActive: boolean;
  commissionedDate: string;
  description: string;
}

// ─── Water Sampling Point ───────────────────────────────────────────────────

export interface WaterSamplingPoint {
  id: string;
  systemId: string;
  name: string;
  location: SamplingPointLocation;
  samplingFrequency: string; // e.g. "Daily", "Weekly", "Monthly"
  description: string;
  isActive: boolean;
}

// ─── Water Test Parameter ───────────────────────────────────────────────────

export interface WaterTestParameter {
  id: string;
  parameter: WaterTestParameterType;
  waterType: WaterType;
  alertLimit: number;
  actionLimit: number;
  unit: string;
  method: string;
  description: string;
}

// ─── Water Reading ──────────────────────────────────────────────────────────

export interface WaterReading {
  id: string;
  pointId: string;
  systemId: string;
  parameter: WaterTestParameterType;
  value: number;
  unit: string;
  alertLimit: number;
  actionLimit: number;
  result: WaterReadingResult;
  sampledBy: string;
  sampledAt: string; // ISO date-time
  notes?: string;
  batchRef?: string;
}

// ─── Water Excursion Record ─────────────────────────────────────────────────

export interface WaterExcursionRecord {
  id: string;
  readingId: string;
  pointId: string;
  systemId: string;
  status: WaterExcursionStatus;
  detectedAt: string;
  value: number;
  limit: number;
  limitType: "alert" | "action";
  parameter: WaterTestParameterType;
  investigationNotes: string;
  rootCause?: string;
  capaRef?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  assignedTo: string;
}

// ─── Trend Data ─────────────────────────────────────────────────────────────

export interface WaterTrendDataPoint {
  date: string;
  value: number;
  result: WaterReadingResult;
}

export interface WaterTrend {
  pointId: string;
  pointName: string;
  systemName: string;
  parameter: WaterTestParameterType;
  unit: string;
  alertLimit: number;
  actionLimit: number;
  data: WaterTrendDataPoint[];
}

// ─── Dashboard Metrics ──────────────────────────────────────────────────────

export interface WaterMetrics {
  systemsMonitored: number;
  activeSamplingPoints: number;
  readingsToday: number;
  excursionsOpen: number;
  complianceRate: number; // percentage
  readingsThisWeek: number;
  alertsToday: number;
  alertsThisWeek: number;
  excursionsThisMonth: number;
  systemStatusSummary: Record<string, {
    status: WaterSystemStatus;
    lastReading?: string;
    excursionCount: number;
  }>;
}

// ─── Parameter Labels & Units ───────────────────────────────────────────────

export const WATER_PARAMETER_LABELS: Record<WaterTestParameterType, string> = {
  TOC: "Total Organic Carbon",
  conductivity: "Conductivity",
  "microbial-count": "Microbial Count",
  endotoxin: "Endotoxin (LAL)",
  pH: "pH",
  chlorine: "Free Chlorine",
  "heavy-metals": "Heavy Metals",
  nitrate: "Nitrate",
  appearance: "Appearance",
};

export const WATER_TYPE_LABELS: Record<WaterType, string> = {
  "purified-water": "Purified Water (PW)",
  WFI: "Water for Injection (WFI)",
  potable: "Potable Water",
  process: "Process Water",
};

export const SAMPLING_LOCATION_LABELS: Record<SamplingPointLocation, string> = {
  generation: "Generation",
  storage: "Storage Tank",
  "loop-supply": "Loop Supply",
  "loop-return": "Loop Return",
  "point-of-use": "Point of Use",
};

export const GENERATION_METHOD_LABELS: Record<GenerationMethod, string> = {
  RO: "Reverse Osmosis",
  EDI: "Electrodeionization",
  distillation: "Distillation",
  UV: "UV Treatment",
  "RO+EDI": "RO + EDI",
  "multi-effect-distillation": "Multi-Effect Distillation",
  chlorination: "Chlorination",
  filtration: "Filtration",
};
