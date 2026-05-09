"use client";

import type {
  MonitoringLocation,
  MonitoringPoint,
  MonitoringReading,
  ExcursionRecord,
  TrendData,
  TrendDataPoint,
  EMMetrics,
  ZoneClassification,
  ParameterType,
  ReadingResult,
  ExcursionStatus,
  AlertLimit,
  ActionLimit,
} from "./env-monitoring-types";

// ─── Helpers ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "pharma.env-monitoring";

function uid(): string {
  return `em-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isoDate(daysAgo: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function isoDateTime(daysAgo: number = 0, hour: number = 8): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return d.toISOString();
}

// Simple seeded PRNG (mulberry32)
function seedRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussianRandom(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001))) * Math.cos(2 * Math.PI * u2);
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

// ─── EU GMP Annex 1 Limits ────────────────────────────────────────────────
// Limits per zone classification per EU GMP Annex 1 Table

interface ZoneLimits {
  viableAir: { alert: number; action: number; unit: string };
  nonViableGe05: { alert: number; action: number; unit: string };
  surface: { alert: number; action: number; unit: string };
  temperature: { alert: number; action: number; unit: string };
  humidity: { alert: number; action: number; unit: string };
  differentialPressure: { alert: number; action: number; unit: string };
}

const EU_GMP_LIMITS: Record<ZoneClassification, ZoneLimits> = {
  "Grade A": {
    viableAir: { alert: 0.5, action: 1, unit: "CFU/m³" },
    nonViableGe05: { alert: 2500, action: 3520, unit: "particles/m³" },
    surface: { alert: 0.5, action: 1, unit: "CFU/plate" },
    temperature: { alert: 21, action: 23, unit: "°C" },
    humidity: { alert: 50, action: 55, unit: "%RH" },
    differentialPressure: { alert: 12, action: 10, unit: "Pa" },
  },
  "Grade B": {
    viableAir: { alert: 5, action: 10, unit: "CFU/m³" },
    nonViableGe05: { alert: 2500, action: 3520, unit: "particles/m³" },
    surface: { alert: 3, action: 5, unit: "CFU/plate" },
    temperature: { alert: 22, action: 25, unit: "°C" },
    humidity: { alert: 55, action: 60, unit: "%RH" },
    differentialPressure: { alert: 12, action: 10, unit: "Pa" },
  },
  "Grade C": {
    viableAir: { alert: 50, action: 100, unit: "CFU/m³" },
    nonViableGe05: { alert: 250000, action: 352000, unit: "particles/m³" },
    surface: { alert: 15, action: 25, unit: "CFU/plate" },
    temperature: { alert: 23, action: 25, unit: "°C" },
    humidity: { alert: 55, action: 60, unit: "%RH" },
    differentialPressure: { alert: 10, action: 8, unit: "Pa" },
  },
  "Grade D": {
    viableAir: { alert: 100, action: 200, unit: "CFU/m³" },
    nonViableGe05: { alert: 2500000, action: 3520000, unit: "particles/m³" },
    surface: { alert: 30, action: 50, unit: "CFU/plate" },
    temperature: { alert: 24, action: 27, unit: "°C" },
    humidity: { alert: 60, action: 65, unit: "%RH" },
    differentialPressure: { alert: 8, action: 5, unit: "Pa" },
  },
  Unclassified: {
    viableAir: { alert: 200, action: 500, unit: "CFU/m³" },
    nonViableGe05: { alert: 5000000, action: 10000000, unit: "particles/m³" },
    surface: { alert: 50, action: 100, unit: "CFU/plate" },
    temperature: { alert: 25, action: 30, unit: "°C" },
    humidity: { alert: 65, action: 70, unit: "%RH" },
    differentialPressure: { alert: 5, action: 3, unit: "Pa" },
  },
};

function getLimitsForParameter(
  zone: ZoneClassification,
  parameter: ParameterType
): { alert: AlertLimit; action: ActionLimit; unit: string } {
  const zl = EU_GMP_LIMITS[zone];
  switch (parameter) {
    case "viable-air":
      return {
        alert: { value: zl.viableAir.alert, unit: zl.viableAir.unit },
        action: { value: zl.viableAir.action, unit: zl.viableAir.unit },
        unit: zl.viableAir.unit,
      };
    case "non-viable-particles":
      return {
        alert: { value: zl.nonViableGe05.alert, unit: zl.nonViableGe05.unit },
        action: { value: zl.nonViableGe05.action, unit: zl.nonViableGe05.unit },
        unit: zl.nonViableGe05.unit,
      };
    case "surface":
      return {
        alert: { value: zl.surface.alert, unit: zl.surface.unit },
        action: { value: zl.surface.action, unit: zl.surface.unit },
        unit: zl.surface.unit,
      };
    case "temperature":
      return {
        alert: { value: zl.temperature.alert, unit: zl.temperature.unit },
        action: { value: zl.temperature.action, unit: zl.temperature.unit },
        unit: zl.temperature.unit,
      };
    case "humidity":
      return {
        alert: { value: zl.humidity.alert, unit: zl.humidity.unit },
        action: { value: zl.humidity.action, unit: zl.humidity.unit },
        unit: zl.humidity.unit,
      };
    case "differential-pressure":
      return {
        alert: { value: zl.differentialPressure.alert, unit: zl.differentialPressure.unit },
        action: { value: zl.differentialPressure.action, unit: zl.differentialPressure.unit },
        unit: zl.differentialPressure.unit,
      };
  }
}

// ─── Seed Data ─────────────────────────────────────────────────────────────

const OPERATORS = [
  "Ahmed Hassan",
  "Fatma Ali",
  "Mohamed Ibrahim",
  "Nour El-Din",
  "Sara Mahmoud",
  "Omar Khaled",
];

const SEED_LOCATIONS: Omit<MonitoringLocation, "id">[] = [
  // Grade A (2)
  {
    name: "Filling Line 1 - Aseptic Core",
    zone: "Grade A",
    areaType: "filling",
    building: "Building A",
    floor: "2nd Floor",
    description: "Primary aseptic filling line for injectable products",
    isActive: true,
  },
  {
    name: "Laminar Flow Hood - QC Lab",
    zone: "Grade A",
    areaType: "cleanroom",
    building: "Building B",
    floor: "1st Floor",
    description: "Laminar airflow workstation for sterility testing",
    isActive: true,
  },
  // Grade B (2)
  {
    name: "Background Area - Filling Suite",
    zone: "Grade B",
    areaType: "cleanroom",
    building: "Building A",
    floor: "2nd Floor",
    description: "Background environment surrounding Grade A filling zone",
    isActive: true,
  },
  {
    name: "Gowning Room - Aseptic Suite",
    zone: "Grade B",
    areaType: "cleanroom",
    building: "Building A",
    floor: "2nd Floor",
    description: "Final gowning area before Grade A entry",
    isActive: true,
  },
  // Grade C (3)
  {
    name: "Oral Solid Manufacturing Room 1",
    zone: "Grade C",
    areaType: "cleanroom",
    building: "Building C",
    floor: "1st Floor",
    description: "Tablet compression and coating area",
    isActive: true,
  },
  {
    name: "Weighing & Dispensing Suite",
    zone: "Grade C",
    areaType: "cleanroom",
    building: "Building C",
    floor: "1st Floor",
    description: "Raw material weighing and dispensing room",
    isActive: true,
  },
  {
    name: "Solution Preparation Room",
    zone: "Grade C",
    areaType: "cleanroom",
    building: "Building A",
    floor: "1st Floor",
    description: "Bulk solution preparation for filling",
    isActive: true,
  },
  // Grade D (2)
  {
    name: "Corridor - Manufacturing Block",
    zone: "Grade D",
    areaType: "corridor",
    building: "Building C",
    floor: "1st Floor",
    description: "Main corridor connecting manufacturing rooms",
    isActive: true,
  },
  {
    name: "Packaging Hall",
    zone: "Grade D",
    areaType: "corridor",
    building: "Building C",
    floor: "Ground Floor",
    description: "Primary and secondary packaging area",
    isActive: true,
  },
  // Unclassified (3)
  {
    name: "Raw Material Warehouse",
    zone: "Unclassified",
    areaType: "warehouse",
    building: "Building D",
    floor: "Ground Floor",
    description: "Temperature-controlled raw material storage",
    isActive: true,
  },
  {
    name: "QC Microbiology Lab",
    zone: "Unclassified",
    areaType: "lab",
    building: "Building B",
    floor: "1st Floor",
    description: "General microbiology testing laboratory",
    isActive: true,
  },
  {
    name: "Finished Goods Warehouse",
    zone: "Unclassified",
    areaType: "warehouse",
    building: "Building D",
    floor: "Ground Floor",
    description: "Temperature-controlled finished product storage",
    isActive: true,
  },
];

interface PointConfig {
  locationIndex: number;
  name: string;
  parameter: ParameterType;
  frequency: string;
  method: string;
}

const SEED_POINT_CONFIGS: PointConfig[] = [
  // Grade A - Filling Line 1 (location 0)
  { locationIndex: 0, name: "FL1-VA-01", parameter: "viable-air", frequency: "Per shift", method: "Active air sampling - SAS" },
  { locationIndex: 0, name: "FL1-NVP-01", parameter: "non-viable-particles", frequency: "Continuous", method: "Particle counter - 0.5µm" },
  { locationIndex: 0, name: "FL1-SC-01", parameter: "surface", frequency: "Per shift", method: "Contact plates - TSA" },
  { locationIndex: 0, name: "FL1-TP-01", parameter: "temperature", frequency: "Continuous", method: "Calibrated sensor" },
  { locationIndex: 0, name: "FL1-RH-01", parameter: "humidity", frequency: "Continuous", method: "Calibrated sensor" },
  { locationIndex: 0, name: "FL1-DP-01", parameter: "differential-pressure", frequency: "Continuous", method: "Magnehelic gauge" },
  // Grade A - Laminar Flow (location 1)
  { locationIndex: 1, name: "LFH-VA-01", parameter: "viable-air", frequency: "Daily", method: "Active air sampling - SAS" },
  { locationIndex: 1, name: "LFH-NVP-01", parameter: "non-viable-particles", frequency: "Daily", method: "Particle counter - 0.5µm" },
  { locationIndex: 1, name: "LFH-SC-01", parameter: "surface", frequency: "Daily", method: "Contact plates - TSA" },
  // Grade B - Background (location 2)
  { locationIndex: 2, name: "BGA-VA-01", parameter: "viable-air", frequency: "Per shift", method: "Active air sampling - SAS" },
  { locationIndex: 2, name: "BGA-NVP-01", parameter: "non-viable-particles", frequency: "Per shift", method: "Particle counter - 0.5µm" },
  { locationIndex: 2, name: "BGA-SC-01", parameter: "surface", frequency: "Daily", method: "Contact plates - TSA" },
  { locationIndex: 2, name: "BGA-DP-01", parameter: "differential-pressure", frequency: "Per shift", method: "Magnehelic gauge" },
  // Grade B - Gowning Room (location 3)
  { locationIndex: 3, name: "GWN-VA-01", parameter: "viable-air", frequency: "Daily", method: "Active air sampling - SAS" },
  { locationIndex: 3, name: "GWN-SC-01", parameter: "surface", frequency: "Daily", method: "Contact plates - TSA" },
  // Grade C - Manufacturing Room 1 (location 4)
  { locationIndex: 4, name: "MR1-VA-01", parameter: "viable-air", frequency: "Daily", method: "Active air sampling - SAS" },
  { locationIndex: 4, name: "MR1-NVP-01", parameter: "non-viable-particles", frequency: "Weekly", method: "Particle counter - 0.5µm" },
  { locationIndex: 4, name: "MR1-TP-01", parameter: "temperature", frequency: "Continuous", method: "Calibrated sensor" },
  { locationIndex: 4, name: "MR1-RH-01", parameter: "humidity", frequency: "Continuous", method: "Calibrated sensor" },
  // Grade C - Weighing Suite (location 5)
  { locationIndex: 5, name: "WDS-VA-01", parameter: "viable-air", frequency: "Daily", method: "Active air sampling - SAS" },
  { locationIndex: 5, name: "WDS-DP-01", parameter: "differential-pressure", frequency: "Per shift", method: "Magnehelic gauge" },
  // Grade C - Solution Prep (location 6)
  { locationIndex: 6, name: "SPR-VA-01", parameter: "viable-air", frequency: "Per shift", method: "Active air sampling - SAS" },
  { locationIndex: 6, name: "SPR-TP-01", parameter: "temperature", frequency: "Continuous", method: "Calibrated sensor" },
  // Grade D - Corridor (location 7)
  { locationIndex: 7, name: "COR-VA-01", parameter: "viable-air", frequency: "Weekly", method: "Active air sampling - SAS" },
  { locationIndex: 7, name: "COR-TP-01", parameter: "temperature", frequency: "Daily", method: "Calibrated sensor" },
  // Grade D - Packaging (location 8)
  { locationIndex: 8, name: "PKG-VA-01", parameter: "viable-air", frequency: "Weekly", method: "Active air sampling - SAS" },
  { locationIndex: 8, name: "PKG-RH-01", parameter: "humidity", frequency: "Daily", method: "Calibrated sensor" },
  // Unclassified - Raw Warehouse (location 9)
  { locationIndex: 9, name: "RWH-TP-01", parameter: "temperature", frequency: "Daily", method: "Data logger" },
  { locationIndex: 9, name: "RWH-RH-01", parameter: "humidity", frequency: "Daily", method: "Data logger" },
  // Unclassified - QC Micro Lab (location 10)
  { locationIndex: 10, name: "QCM-VA-01", parameter: "viable-air", frequency: "Daily", method: "Settle plates" },
  // Unclassified - Finished Goods (location 11)
  { locationIndex: 11, name: "FGW-TP-01", parameter: "temperature", frequency: "Daily", method: "Data logger" },
];

interface SeedStoreData {
  locations: MonitoringLocation[];
  points: MonitoringPoint[];
  readings: MonitoringReading[];
  excursions: ExcursionRecord[];
}

function generateReadingValue(
  parameter: ParameterType,
  zone: ZoneClassification,
  rng: () => number
): number {
  const limits = EU_GMP_LIMITS[zone];

  switch (parameter) {
    case "viable-air": {
      // Most readings near zero for clean zones, higher for lower grades
      const base = limits.viableAir.action * 0.2;
      const val = Math.abs(gaussianRandom(rng) * base * 0.4 + base * 0.3);
      return round2(Math.max(0, val));
    }
    case "non-viable-particles": {
      const base = limits.nonViableGe05.action * 0.3;
      const val = Math.abs(gaussianRandom(rng) * base * 0.3 + base * 0.5);
      return Math.round(Math.max(0, val));
    }
    case "surface": {
      const base = limits.surface.action * 0.15;
      const val = Math.abs(gaussianRandom(rng) * base * 0.5 + base * 0.3);
      return round2(Math.max(0, val));
    }
    case "temperature": {
      // Typically 20-22°C for clean rooms
      const target = zone === "Grade A" || zone === "Grade B" ? 20 : zone === "Grade C" ? 21 : zone === "Grade D" ? 22 : 23;
      return round2(target + gaussianRandom(rng) * 0.8);
    }
    case "humidity": {
      const target = zone === "Grade A" || zone === "Grade B" ? 42 : zone === "Grade C" ? 45 : zone === "Grade D" ? 48 : 50;
      return round2(target + gaussianRandom(rng) * 3);
    }
    case "differential-pressure": {
      const target = zone === "Grade A" ? 15 : zone === "Grade B" ? 15 : zone === "Grade C" ? 12 : zone === "Grade D" ? 10 : 8;
      return round2(target + gaussianRandom(rng) * 1.5);
    }
  }
}

function classifyReading(
  value: number,
  alertLimit: number,
  actionLimit: number,
  parameter: ParameterType
): ReadingResult {
  // For differential pressure, lower is worse (below limit)
  if (parameter === "differential-pressure") {
    if (value < actionLimit) return "action";
    if (value < alertLimit) return "alert";
    return "pass";
  }
  // For temperature, both high is bad
  if (value >= actionLimit) return "action";
  if (value >= alertLimit) return "alert";
  return "pass";
}

function buildSeedData(): SeedStoreData {
  const rng = seedRandom(20260508);

  // Build locations
  const locations: MonitoringLocation[] = SEED_LOCATIONS.map((loc, i) => ({
    ...loc,
    id: `loc-${i.toString().padStart(3, "0")}`,
  }));

  // Build points
  const points: MonitoringPoint[] = SEED_POINT_CONFIGS.map((cfg, i) => {
    const location = locations[cfg.locationIndex];
    const limits = getLimitsForParameter(location.zone, cfg.parameter);
    return {
      id: `pt-${i.toString().padStart(3, "0")}`,
      locationId: location.id,
      name: cfg.name,
      parameter: cfg.parameter,
      samplingFrequency: cfg.frequency,
      alertLimit: limits.alert,
      actionLimit: limits.action,
      unit: limits.unit,
      method: cfg.method,
      isActive: true,
    };
  });

  // Generate readings over past 30 days
  const readings: MonitoringReading[] = [];
  const excursions: ExcursionRecord[] = [];

  for (const point of points) {
    const location = locations.find((l) => l.id === point.locationId)!;
    const daysToGenerate = 30;

    // Determine readings per day based on frequency
    let readingsPerDay: number;
    switch (point.samplingFrequency) {
      case "Continuous":
        readingsPerDay = 3; // 3 recorded readings per day
        break;
      case "Per shift":
        readingsPerDay = 2;
        break;
      case "Daily":
        readingsPerDay = 1;
        break;
      case "Weekly":
        readingsPerDay = 0.143; // ~1 per week
        break;
      default:
        readingsPerDay = 1;
    }

    for (let day = 0; day < daysToGenerate; day++) {
      // For weekly readings, only generate on certain days
      if (readingsPerDay < 1 && rng() > readingsPerDay * 7) continue;

      const count = readingsPerDay >= 1 ? Math.round(readingsPerDay) : 1;

      for (let r = 0; r < count; r++) {
        let value = generateReadingValue(point.parameter, location.zone, rng);

        // Inject some alert/action-level readings (about 5% alert, 1.5% action)
        const excursionRoll = rng();
        if (excursionRoll < 0.015) {
          // Action-level excursion
          if (point.parameter === "differential-pressure") {
            value = round2(point.actionLimit.value - rng() * 3);
          } else {
            value = round2(point.actionLimit.value + rng() * point.actionLimit.value * 0.3);
          }
        } else if (excursionRoll < 0.06) {
          // Alert-level excursion
          if (point.parameter === "differential-pressure") {
            value = round2(point.alertLimit.value - rng() * 2);
          } else {
            const range = point.actionLimit.value - point.alertLimit.value;
            value = round2(point.alertLimit.value + rng() * range * 0.5);
          }
        }

        const result = classifyReading(
          value,
          point.alertLimit.value,
          point.actionLimit.value,
          point.parameter
        );

        const hour = point.samplingFrequency === "Per shift"
          ? (r === 0 ? 7 : 15)
          : point.samplingFrequency === "Continuous"
            ? (r === 0 ? 6 : r === 1 ? 14 : 22)
            : 8 + Math.floor(rng() * 4);

        const reading: MonitoringReading = {
          id: `rd-${readings.length.toString().padStart(5, "0")}`,
          pointId: point.id,
          locationId: point.locationId,
          timestamp: isoDateTime(daysToGenerate - 1 - day, hour),
          value,
          unit: point.unit,
          result,
          operator: OPERATORS[Math.floor(rng() * OPERATORS.length)],
          notes: result === "action" ? "Excursion noted - investigation required" : undefined,
        };
        readings.push(reading);

        // Create excursion records for action-level readings
        if (result === "action") {
          const isRecent = day > 22; // last 7 days
          const excursion: ExcursionRecord = {
            id: `exc-${excursions.length.toString().padStart(3, "0")}`,
            readingId: reading.id,
            pointId: point.id,
            locationId: point.locationId,
            status: isRecent ? "open" : (rng() > 0.3 ? "resolved" : "investigating"),
            detectedAt: reading.timestamp,
            value: reading.value,
            limit: point.actionLimit.value,
            limitType: "action",
            parameter: point.parameter,
            investigationNotes: isRecent
              ? ""
              : "Root cause investigation conducted per SOP-EM-003",
            rootCause: isRecent
              ? undefined
              : "HEPA filter integrity compromise identified during routine check",
            capaRef: isRecent ? undefined : `CAPA-2026-${(excursions.length + 100).toString().padStart(4, "0")}`,
            resolvedAt: isRecent ? undefined : isoDate(daysToGenerate - 1 - day - 2),
            resolvedBy: isRecent ? undefined : "QA Manager",
            assignedTo: isRecent ? "Ahmed Hassan" : "Quality Assurance",
          };
          excursions.push(excursion);
        } else if (result === "alert") {
          // Create excursion for some alert-level readings too
          if (rng() < 0.3) {
            const isRecent = day > 25;
            const excursion: ExcursionRecord = {
              id: `exc-${excursions.length.toString().padStart(3, "0")}`,
              readingId: reading.id,
              pointId: point.id,
              locationId: point.locationId,
              status: isRecent ? "open" : "closed",
              detectedAt: reading.timestamp,
              value: reading.value,
              limit: point.alertLimit.value,
              limitType: "alert",
              parameter: point.parameter,
              investigationNotes: isRecent
                ? ""
                : "Alert level reading documented. Trending monitored.",
              rootCause: isRecent ? undefined : "Normal variation within alert range",
              capaRef: undefined,
              resolvedAt: isRecent ? undefined : isoDate(daysToGenerate - 1 - day - 1),
              resolvedBy: isRecent ? undefined : "QA Supervisor",
              assignedTo: isRecent ? "Fatma Ali" : "Quality Assurance",
            };
            excursions.push(excursion);
          }
        }
      }
    }
  }

  return { locations, points, readings, excursions };
}

// ─── Store ─────────────────────────────────────────────────────────────────

export class EnvMonitoringStore {
  private locations: MonitoringLocation[] = [];
  private points: MonitoringPoint[] = [];
  private readings: MonitoringReading[] = [];
  private excursions: ExcursionRecord[] = [];
  private initialized = false;

  private load(): void {
    if (this.initialized) return;
    this.initialized = true;

    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored) as SeedStoreData;
        this.locations = data.locations;
        this.points = data.points;
        this.readings = data.readings;
        this.excursions = data.excursions;
        return;
      } catch {
        // fallthrough to seed
      }
    }

    const seed = buildSeedData();
    this.locations = seed.locations;
    this.points = seed.points;
    this.readings = seed.readings;
    this.excursions = seed.excursions;
    this.save();
  }

  private save(): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        locations: this.locations,
        points: this.points,
        readings: this.readings,
        excursions: this.excursions,
      })
    );
  }

  // ── Locations ───────────────────────────────────────────────────────────

  getAllLocations(): MonitoringLocation[] {
    this.load();
    return [...this.locations];
  }

  getLocationById(id: string): MonitoringLocation | undefined {
    this.load();
    return this.locations.find((l) => l.id === id);
  }

  getLocationsByZone(zone: ZoneClassification): MonitoringLocation[] {
    this.load();
    return this.locations.filter((l) => l.zone === zone);
  }

  createLocation(data: Omit<MonitoringLocation, "id">): MonitoringLocation {
    if (!data.name?.trim()) throw new Error("Monitoring location name is required");
    if (!data.zone?.trim()) throw new Error("Monitoring location zone is required");
    this.load();
    const location: MonitoringLocation = { ...data, id: uid() };
    this.locations.push(location);
    this.save();
    return location;
  }

  updateLocation(id: string, updates: Partial<MonitoringLocation>): MonitoringLocation | undefined {
    this.load();
    const idx = this.locations.findIndex((l) => l.id === id);
    if (idx === -1) return undefined;
    this.locations[idx] = { ...this.locations[idx], ...updates };
    this.save();
    return this.locations[idx];
  }

  // ── Points ──────────────────────────────────────────────────────────────

  getAllPoints(): MonitoringPoint[] {
    this.load();
    return [...this.points];
  }

  getPointById(id: string): MonitoringPoint | undefined {
    this.load();
    return this.points.find((p) => p.id === id);
  }

  getPointsByLocation(locationId: string): MonitoringPoint[] {
    this.load();
    return this.points.filter((p) => p.locationId === locationId);
  }

  getPointsByParameter(parameter: ParameterType): MonitoringPoint[] {
    this.load();
    return this.points.filter((p) => p.parameter === parameter);
  }

  createPoint(data: Omit<MonitoringPoint, "id">): MonitoringPoint {
    if (!data.locationId?.trim()) throw new Error("Monitoring point locationId is required");
    if (!data.parameter?.trim()) throw new Error("Monitoring point parameter is required");
    this.load();
    const point: MonitoringPoint = { ...data, id: uid() };
    this.points.push(point);
    this.save();
    return point;
  }

  updatePoint(id: string, updates: Partial<MonitoringPoint>): MonitoringPoint | undefined {
    this.load();
    const idx = this.points.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    this.points[idx] = { ...this.points[idx], ...updates };
    this.save();
    return this.points[idx];
  }

  // ── Readings ────────────────────────────────────────────────────────────

  getAllReadings(): MonitoringReading[] {
    this.load();
    return [...this.readings];
  }

  getReadingById(id: string): MonitoringReading | undefined {
    this.load();
    return this.readings.find((r) => r.id === id);
  }

  getReadingsByPoint(pointId: string): MonitoringReading[] {
    this.load();
    return this.readings.filter((r) => r.pointId === pointId);
  }

  getReadingsByLocation(locationId: string): MonitoringReading[] {
    this.load();
    return this.readings.filter((r) => r.locationId === locationId);
  }

  getReadingsByParameter(parameter: ParameterType): MonitoringReading[] {
    this.load();
    const pointIds = new Set(
      this.points.filter((p) => p.parameter === parameter).map((p) => p.id)
    );
    return this.readings.filter((r) => pointIds.has(r.pointId));
  }

  getReadingsByDateRange(start: string, end: string): MonitoringReading[] {
    this.load();
    return this.readings.filter(
      (r) => r.timestamp >= start && r.timestamp <= end
    );
  }

  getReadingsToday(): MonitoringReading[] {
    const today = isoDate(0);
    return this.getAllReadings().filter((r) => r.timestamp.startsWith(today));
  }

  addReading(data: Omit<MonitoringReading, "id">): MonitoringReading {
    this.load();
    const reading: MonitoringReading = { ...data, id: uid() };
    this.readings.unshift(reading);
    this.save();
    return reading;
  }

  // ── Excursions ──────────────────────────────────────────────────────────

  getAllExcursions(): ExcursionRecord[] {
    this.load();
    return [...this.excursions];
  }

  getExcursionById(id: string): ExcursionRecord | undefined {
    this.load();
    return this.excursions.find((e) => e.id === id);
  }

  getOpenExcursions(): ExcursionRecord[] {
    this.load();
    return this.excursions.filter(
      (e) => e.status === "open" || e.status === "investigating"
    );
  }

  getExcursionsByLocation(locationId: string): ExcursionRecord[] {
    this.load();
    return this.excursions.filter((e) => e.locationId === locationId);
  }

  getExcursionsByStatus(status: ExcursionStatus): ExcursionRecord[] {
    this.load();
    return this.excursions.filter((e) => e.status === status);
  }

  createExcursion(data: Omit<ExcursionRecord, "id">): ExcursionRecord {
    if (!data.locationId?.trim()) throw new Error("Excursion location ID is required");
    if (!data.parameter?.trim()) throw new Error("Excursion parameter is required");
    this.load();
    const excursion: ExcursionRecord = { ...data, id: uid() };
    this.excursions.unshift(excursion);
    this.save();
    return excursion;
  }

  updateExcursion(
    id: string,
    updates: Partial<ExcursionRecord>
  ): ExcursionRecord | undefined {
    this.load();
    const idx = this.excursions.findIndex((e) => e.id === id);
    if (idx === -1) return undefined;
    this.excursions[idx] = { ...this.excursions[idx], ...updates };
    this.save();
    return this.excursions[idx];
  }

  resolveExcursion(
    id: string,
    resolution: {
      investigationNotes: string;
      rootCause: string;
      capaRef?: string;
      resolvedBy: string;
    }
  ): ExcursionRecord | undefined {
    return this.updateExcursion(id, {
      ...resolution,
      status: "resolved",
      resolvedAt: new Date().toISOString(),
    });
  }

  // ── Trend Data ──────────────────────────────────────────────────────────

  getTrend(pointId: string, days: number = 30): TrendData | undefined {
    this.load();
    const point = this.getPointById(pointId);
    if (!point) return undefined;
    const location = this.getLocationById(point.locationId);
    if (!location) return undefined;

    const cutoff = isoDate(days);
    const readings = this.getReadingsByPoint(pointId)
      .filter((r) => r.timestamp >= cutoff)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    const data: TrendDataPoint[] = readings.map((r) => ({
      date: r.timestamp,
      value: r.value,
      result: r.result,
    }));

    return {
      pointId: point.id,
      pointName: point.name,
      locationName: location.name,
      parameter: point.parameter,
      unit: point.unit,
      alertLimit: point.alertLimit.value,
      actionLimit: point.actionLimit.value,
      data,
    };
  }

  // ── Metrics ─────────────────────────────────────────────────────────────

  getMetrics(): EMMetrics {
    this.load();
    const today = isoDate(0);
    const weekAgo = isoDate(7);
    const monthAgo = isoDate(30);

    const todayReadings = this.readings.filter((r) =>
      r.timestamp.startsWith(today)
    );
    const weekReadings = this.readings.filter((r) => r.timestamp >= weekAgo);

    const alertsToday = todayReadings.filter(
      (r) => r.result === "alert" || r.result === "action"
    ).length;
    const alertsWeek = weekReadings.filter(
      (r) => r.result === "alert" || r.result === "action"
    ).length;

    const openExcursions = this.excursions.filter(
      (e) => e.status === "open" || e.status === "investigating"
    ).length;
    const monthExcursions = this.excursions.filter(
      (e) => e.detectedAt >= monthAgo
    ).length;

    const totalReadings = this.readings.length;
    const passReadings = this.readings.filter((r) => r.result === "pass").length;
    const complianceRate =
      totalReadings > 0 ? round2((passReadings / totalReadings) * 100) : 100;

    // Location status summary
    const zones: ZoneClassification[] = [
      "Grade A",
      "Grade B",
      "Grade C",
      "Grade D",
      "Unclassified",
    ];
    const locationStatusSummary = {} as EMMetrics["locationStatusSummary"];

    for (const zone of zones) {
      const zoneLocations = this.locations.filter((l) => l.zone === zone);
      let normal = 0;
      let alert = 0;
      let action = 0;

      for (const loc of zoneLocations) {
        const recentReadings = this.readings
          .filter((r) => r.locationId === loc.id && r.timestamp >= weekAgo)
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        if (recentReadings.length === 0) {
          normal++;
          continue;
        }

        // Check worst status among recent readings
        const hasAction = recentReadings.some((r) => r.result === "action");
        const hasAlert = recentReadings.some((r) => r.result === "alert");
        if (hasAction) action++;
        else if (hasAlert) alert++;
        else normal++;
      }

      locationStatusSummary[zone] = {
        total: zoneLocations.length,
        normal,
        alert,
        action,
      };
    }

    return {
      totalLocations: this.locations.filter((l) => l.isActive).length,
      activePoints: this.points.filter((p) => p.isActive).length,
      readingsToday: todayReadings.length,
      readingsThisWeek: weekReadings.length,
      alertsToday,
      alertsThisWeek: alertsWeek,
      excursionsOpen: openExcursions,
      excursionsThisMonth: monthExcursions,
      complianceRate,
      locationStatusSummary,
    };
  }

  // ── Unique Values ───────────────────────────────────────────────────────

  getUniqueParameters(): ParameterType[] {
    this.load();
    return [...new Set(this.points.map((p) => p.parameter))];
  }

  getUniqueOperators(): string[] {
    this.load();
    return [...new Set(this.readings.map((r) => r.operator))];
  }

  // ── Location Current Status ─────────────────────────────────────────────

  getLocationStatus(
    locationId: string
  ): "normal" | "alert" | "action" {
    this.load();
    const weekAgo = isoDate(7);
    const recentReadings = this.readings
      .filter((r) => r.locationId === locationId && r.timestamp >= weekAgo);

    if (recentReadings.some((r) => r.result === "action")) return "action";
    if (recentReadings.some((r) => r.result === "alert")) return "alert";
    return "normal";
  }

  getLocationLatestReadings(locationId: string): MonitoringReading[] {
    this.load();
    const pointIds = this.points
      .filter((p) => p.locationId === locationId)
      .map((p) => p.id);

    const latest: MonitoringReading[] = [];
    for (const pid of pointIds) {
      const readings = this.readings
        .filter((r) => r.pointId === pid)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      if (readings.length > 0) {
        latest.push(readings[0]);
      }
    }
    return latest;
  }
}

export const envMonitoringStore = new EnvMonitoringStore();
