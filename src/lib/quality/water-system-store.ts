"use client";

import type {
  WaterSystem,
  WaterSamplingPoint,
  WaterReading,
  WaterExcursionRecord,
  WaterTrend,
  WaterTrendDataPoint,
  WaterMetrics,
  WaterType,
  WaterTestParameterType,
  WaterReadingResult,
  WaterSystemStatus,
  WaterExcursionStatus,
  SamplingPointLocation,
} from "./water-system-types";

// ─── Helpers ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "pharma.water-systems";

function uid(): string {
  return `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

// ─── USP/EP Water Quality Limits ──────────────────────────────────────────
// Per USP <1231>, EP 2.2.44, and related monographs

interface ParameterLimits {
  alert: number;
  action: number;
  unit: string;
  method: string;
}

type WaterLimitsMap = Partial<Record<WaterTestParameterType, ParameterLimits>>;

const USP_EP_LIMITS: Record<WaterType, WaterLimitsMap> = {
  "purified-water": {
    TOC: { alert: 400, action: 500, unit: "ppb", method: "USP <643> TOC Analyzer" },
    conductivity: { alert: 1.1, action: 1.3, unit: "µS/cm", method: "USP <645> Online Conductivity" },
    "microbial-count": { alert: 50, action: 100, unit: "CFU/ml", method: "USP <61> Pour Plate / R2A" },
    pH: { alert: 6.0, action: 5.0, unit: "pH", method: "USP <791> pH Meter" },
    appearance: { alert: 0, action: 0, unit: "pass/fail", method: "Visual Inspection" },
    nitrate: { alert: 0.1, action: 0.2, unit: "ppm", method: "EP 2.4.1 Spectrophotometry" },
    "heavy-metals": { alert: 0.05, action: 0.1, unit: "ppm", method: "USP <231> Heavy Metals" },
  },
  WFI: {
    TOC: { alert: 400, action: 500, unit: "ppb", method: "USP <643> TOC Analyzer" },
    conductivity: { alert: 1.1, action: 1.3, unit: "µS/cm", method: "USP <645> Online Conductivity" },
    "microbial-count": { alert: 5, action: 10, unit: "CFU/100ml", method: "USP <61> Membrane Filtration" },
    endotoxin: { alert: 0.15, action: 0.25, unit: "EU/ml", method: "USP <85> LAL Kinetic Turbidimetric" },
    pH: { alert: 6.0, action: 5.0, unit: "pH", method: "USP <791> pH Meter" },
    appearance: { alert: 0, action: 0, unit: "pass/fail", method: "Visual Inspection" },
    nitrate: { alert: 0.1, action: 0.2, unit: "ppm", method: "EP 2.4.1 Spectrophotometry" },
    "heavy-metals": { alert: 0.05, action: 0.1, unit: "ppm", method: "USP <231> Heavy Metals" },
  },
  potable: {
    "microbial-count": { alert: 80, action: 100, unit: "CFU/ml", method: "Membrane Filtration" },
    chlorine: { alert: 0.3, action: 0.2, unit: "ppm", method: "DPD Colorimetric" },
    pH: { alert: 7.5, action: 8.5, unit: "pH", method: "pH Meter" },
    conductivity: { alert: 400, action: 500, unit: "µS/cm", method: "Conductivity Meter" },
    appearance: { alert: 0, action: 0, unit: "NTU", method: "Turbidity Meter" },
    nitrate: { alert: 40, action: 50, unit: "ppm", method: "Spectrophotometry" },
    "heavy-metals": { alert: 0.008, action: 0.01, unit: "ppm", method: "ICP-MS" },
  },
  process: {
    conductivity: { alert: 3.0, action: 5.0, unit: "µS/cm", method: "Conductivity Meter" },
    "microbial-count": { alert: 80, action: 100, unit: "CFU/ml", method: "Pour Plate / R2A" },
    pH: { alert: 7.0, action: 8.0, unit: "pH", method: "pH Meter" },
    TOC: { alert: 800, action: 1000, unit: "ppb", method: "TOC Analyzer" },
    appearance: { alert: 0, action: 0, unit: "NTU", method: "Visual Inspection" },
  },
};

function getLimitsForWaterParameter(
  waterType: WaterType,
  parameter: WaterTestParameterType
): ParameterLimits | undefined {
  return USP_EP_LIMITS[waterType]?.[parameter];
}

// ─── Operators ────────────────────────────────────────────────────────────

const OPERATORS = [
  "Ahmed Hassan",
  "Fatma Ali",
  "Mohamed Ibrahim",
  "Nour El-Din",
  "Sara Mahmoud",
  "Omar Khaled",
];

// ─── Seed Water Systems ───────────────────────────────────────────────────

const SEED_SYSTEMS: Omit<WaterSystem, "id">[] = [
  {
    name: "PW-SYS-01 Purified Water System",
    type: "purified-water",
    generationMethod: "RO+EDI",
    storageCapacityLiters: 5000,
    loopDescription: "Hot loop at 80°C, 316L SS, orbital welded, 120m total length",
    building: "Building A",
    isActive: true,
    commissionedDate: "2022-03-15",
    description: "Primary purified water generation and distribution system serving all manufacturing areas. RO pre-treatment followed by EDI polishing.",
  },
  {
    name: "WFI-SYS-01 Water for Injection",
    type: "WFI",
    generationMethod: "multi-effect-distillation",
    storageCapacityLiters: 3000,
    loopDescription: "Hot loop maintained at 85°C, 316L SS, electropolished, 80m total length",
    building: "Building A",
    isActive: true,
    commissionedDate: "2022-03-15",
    description: "WFI generation by multi-effect distillation (Finn-Aqua) for injectable products. Fed from PW system.",
  },
  {
    name: "POT-SYS-01 Potable Water System",
    type: "potable",
    generationMethod: "chlorination",
    storageCapacityLiters: 20000,
    loopDescription: "Municipal supply with on-site chlorination, PVC distribution, cold loop",
    building: "Utility Building",
    isActive: true,
    commissionedDate: "2020-01-10",
    description: "Municipal potable water supply with on-site treatment. Feeds the PW generation system and utility points.",
  },
  {
    name: "PROC-SYS-01 Process Water System",
    type: "process",
    generationMethod: "filtration",
    storageCapacityLiters: 10000,
    loopDescription: "Softened water loop, carbon filtration, ambient temperature, GRP piping",
    building: "Utility Building",
    isActive: true,
    commissionedDate: "2020-01-10",
    description: "Softened and filtered process water for CIP, HVAC, and utility applications.",
  },
];

// ─── Seed Sampling Points ─────────────────────────────────────────────────

interface PointConfig {
  systemIndex: number;
  name: string;
  location: SamplingPointLocation;
  frequency: string;
  description: string;
}

const SEED_POINT_CONFIGS: PointConfig[] = [
  // PW System (system 0) - 7 points
  { systemIndex: 0, name: "PW-GEN-01", location: "generation", frequency: "Daily", description: "Post-EDI generation outlet" },
  { systemIndex: 0, name: "PW-ST-01", location: "storage", frequency: "Daily", description: "PW storage tank outlet" },
  { systemIndex: 0, name: "PW-LS-01", location: "loop-supply", frequency: "Daily", description: "Loop supply after pump" },
  { systemIndex: 0, name: "PW-LR-01", location: "loop-return", frequency: "Daily", description: "Loop return before tank" },
  { systemIndex: 0, name: "PW-POU-01", location: "point-of-use", frequency: "Daily", description: "Weighing room PW outlet" },
  { systemIndex: 0, name: "PW-POU-02", location: "point-of-use", frequency: "Daily", description: "Manufacturing room 1 PW outlet" },
  { systemIndex: 0, name: "PW-POU-03", location: "point-of-use", frequency: "Weekly", description: "QC laboratory PW outlet" },
  // WFI System (system 1) - 6 points
  { systemIndex: 1, name: "WFI-GEN-01", location: "generation", frequency: "Daily", description: "Post-distillation outlet (Finn-Aqua)" },
  { systemIndex: 1, name: "WFI-ST-01", location: "storage", frequency: "Daily", description: "WFI storage tank outlet" },
  { systemIndex: 1, name: "WFI-LS-01", location: "loop-supply", frequency: "Daily", description: "WFI loop supply header" },
  { systemIndex: 1, name: "WFI-LR-01", location: "loop-return", frequency: "Daily", description: "WFI loop return to tank" },
  { systemIndex: 1, name: "WFI-POU-01", location: "point-of-use", frequency: "Daily", description: "Filling room WFI outlet" },
  { systemIndex: 1, name: "WFI-POU-02", location: "point-of-use", frequency: "Daily", description: "Solution preparation WFI outlet" },
  // Potable Water (system 2) - 4 points
  { systemIndex: 2, name: "POT-IN-01", location: "generation", frequency: "Weekly", description: "Municipal inlet after chlorination" },
  { systemIndex: 2, name: "POT-ST-01", location: "storage", frequency: "Weekly", description: "Potable water tank outlet" },
  { systemIndex: 2, name: "POT-POU-01", location: "point-of-use", frequency: "Weekly", description: "Canteen potable water tap" },
  { systemIndex: 2, name: "POT-POU-02", location: "point-of-use", frequency: "Monthly", description: "Locker room potable water" },
  // Process Water (system 3) - 3 points
  { systemIndex: 3, name: "PROC-GEN-01", location: "generation", frequency: "Weekly", description: "Post-softener outlet" },
  { systemIndex: 3, name: "PROC-ST-01", location: "storage", frequency: "Weekly", description: "Process water tank outlet" },
  { systemIndex: 3, name: "PROC-POU-01", location: "point-of-use", frequency: "Weekly", description: "CIP system feed point" },
];

// ─── Seed Data Generation ─────────────────────────────────────────────────

interface SeedStoreData {
  systems: WaterSystem[];
  points: WaterSamplingPoint[];
  readings: WaterReading[];
  excursions: WaterExcursionRecord[];
}

/** Map of which parameters to test per water type */
const WATER_TYPE_PARAMETERS: Record<WaterType, WaterTestParameterType[]> = {
  "purified-water": ["TOC", "conductivity", "microbial-count", "pH"],
  WFI: ["TOC", "conductivity", "microbial-count", "endotoxin"],
  potable: ["microbial-count", "chlorine", "pH", "conductivity"],
  process: ["conductivity", "microbial-count", "pH", "TOC"],
};

function generateReadingValue(
  parameter: WaterTestParameterType,
  waterType: WaterType,
  rng: () => number
): number {
  const limits = USP_EP_LIMITS[waterType]?.[parameter];
  if (!limits) return 0;

  switch (parameter) {
    case "TOC": {
      // Typical PW/WFI TOC: 100-350 ppb (well within 500 ppb limit)
      const base = waterType === "purified-water" || waterType === "WFI" ? 200 : 400;
      const val = base + gaussianRandom(rng) * 80;
      return round2(Math.max(10, val));
    }
    case "conductivity": {
      if (waterType === "purified-water" || waterType === "WFI") {
        // Typical: 0.5-1.0 uS/cm, limit 1.3
        const val = 0.7 + gaussianRandom(rng) * 0.15;
        return round3(Math.max(0.05, val));
      }
      if (waterType === "potable") {
        const val = 250 + gaussianRandom(rng) * 50;
        return round2(Math.max(50, val));
      }
      // Process
      const val = 1.5 + gaussianRandom(rng) * 0.5;
      return round3(Math.max(0.1, val));
    }
    case "microbial-count": {
      if (waterType === "WFI") {
        // WFI: very low counts, <10 CFU/100ml
        const val = Math.abs(gaussianRandom(rng) * 2 + 1);
        return round2(Math.max(0, val));
      }
      if (waterType === "purified-water") {
        // PW: <100 CFU/ml, typical 5-30
        const val = Math.abs(gaussianRandom(rng) * 12 + 10);
        return round2(Math.max(0, val));
      }
      // Potable/process
      const val = Math.abs(gaussianRandom(rng) * 20 + 20);
      return round2(Math.max(0, val));
    }
    case "endotoxin": {
      // WFI only, limit 0.25 EU/ml, typical 0.01-0.10
      const val = Math.abs(gaussianRandom(rng) * 0.03 + 0.05);
      return round3(Math.max(0.001, val));
    }
    case "pH": {
      if (waterType === "purified-water" || waterType === "WFI") {
        const val = 6.5 + gaussianRandom(rng) * 0.3;
        return round2(val);
      }
      const val = 7.2 + gaussianRandom(rng) * 0.3;
      return round2(val);
    }
    case "chlorine": {
      // Potable water: 0.2-0.5 ppm typical, alert if <0.3
      const val = 0.4 + gaussianRandom(rng) * 0.08;
      return round2(Math.max(0.05, val));
    }
    case "heavy-metals": {
      const val = Math.abs(gaussianRandom(rng) * 0.01 + 0.02);
      return round3(Math.max(0, val));
    }
    case "nitrate": {
      if (waterType === "purified-water" || waterType === "WFI") {
        const val = Math.abs(gaussianRandom(rng) * 0.03 + 0.04);
        return round3(Math.max(0, val));
      }
      const val = Math.abs(gaussianRandom(rng) * 5 + 10);
      return round2(Math.max(0, val));
    }
    case "appearance": {
      return 0; // 0 = pass, 1 = fail
    }
    default:
      return 0;
  }
}

function classifyWaterReading(
  value: number,
  alertLimit: number,
  actionLimit: number,
  parameter: WaterTestParameterType
): WaterReadingResult {
  // Chlorine is special: lower is worse (below alert limit means insufficient)
  if (parameter === "chlorine") {
    if (value < actionLimit) return "action";
    if (value < alertLimit) return "alert";
    return "pass";
  }
  // Appearance: 0 = pass, anything else = fail
  if (parameter === "appearance") {
    return value === 0 ? "pass" : "fail";
  }
  // For all others, higher is worse
  if (value >= actionLimit) return "action";
  if (value >= alertLimit) return "alert";
  return "pass";
}

function buildSeedData(): SeedStoreData {
  const rng = seedRandom(20260508);

  // Build systems
  const systems: WaterSystem[] = SEED_SYSTEMS.map((sys, i) => ({
    ...sys,
    id: `wsys-${i.toString().padStart(3, "0")}`,
  }));

  // Build sampling points
  const points: WaterSamplingPoint[] = SEED_POINT_CONFIGS.map((cfg, i) => ({
    id: `wpt-${i.toString().padStart(3, "0")}`,
    systemId: systems[cfg.systemIndex].id,
    name: cfg.name,
    location: cfg.location,
    samplingFrequency: cfg.frequency,
    description: cfg.description,
    isActive: true,
  }));

  // Generate readings over past 30 days
  const readings: WaterReading[] = [];
  const excursions: WaterExcursionRecord[] = [];

  for (const point of points) {
    const system = systems.find((s) => s.id === point.systemId)!;
    const parameters = WATER_TYPE_PARAMETERS[system.type];
    const daysToGenerate = 30;

    // Determine readings per day based on frequency
    let readingsPerDay: number;
    switch (point.samplingFrequency) {
      case "Daily":
        readingsPerDay = 1;
        break;
      case "Weekly":
        readingsPerDay = 1 / 7;
        break;
      case "Monthly":
        readingsPerDay = 1 / 30;
        break;
      default:
        readingsPerDay = 1;
    }

    for (let day = 0; day < daysToGenerate; day++) {
      // For non-daily readings, skip most days
      if (readingsPerDay < 1 && rng() > readingsPerDay * 7) continue;

      const hour = 7 + Math.floor(rng() * 4);

      // Generate one reading per parameter per sampling event
      for (const param of parameters) {
        const limits = getLimitsForWaterParameter(system.type, param);
        if (!limits) continue;

        let value = generateReadingValue(param, system.type, rng);

        // Inject some excursions (~4% alert, ~1.5% action)
        const excursionRoll = rng();
        if (excursionRoll < 0.015 && param !== "appearance") {
          // Action-level excursion
          if (param === "chlorine") {
            value = round3(limits.action - rng() * 0.1);
          } else {
            value = round2(limits.action + rng() * limits.action * 0.25);
          }
        } else if (excursionRoll < 0.055 && param !== "appearance") {
          // Alert-level excursion
          if (param === "chlorine") {
            value = round3(limits.alert - rng() * 0.05);
          } else {
            const range = limits.action - limits.alert;
            value = round2(limits.alert + rng() * range * 0.5);
          }
        }

        const result = classifyWaterReading(value, limits.alert, limits.action, param);

        const reading: WaterReading = {
          id: `wrd-${readings.length.toString().padStart(5, "0")}`,
          pointId: point.id,
          systemId: system.id,
          parameter: param,
          value,
          unit: limits.unit,
          alertLimit: limits.alert,
          actionLimit: limits.action,
          result,
          sampledBy: OPERATORS[Math.floor(rng() * OPERATORS.length)],
          sampledAt: isoDateTime(daysToGenerate - 1 - day, hour),
          notes: result === "action" ? "Excursion - investigation required per SOP-WS-005" : undefined,
        };
        readings.push(reading);

        // Create excursion records for action-level readings
        if (result === "action") {
          const isRecent = day > 22;
          const excursion: WaterExcursionRecord = {
            id: `wexc-${excursions.length.toString().padStart(3, "0")}`,
            readingId: reading.id,
            pointId: point.id,
            systemId: system.id,
            status: isRecent ? "open" : (rng() > 0.3 ? "resolved" : "investigating"),
            detectedAt: reading.sampledAt,
            value: reading.value,
            limit: limits.action,
            limitType: "action",
            parameter: param,
            investigationNotes: isRecent
              ? ""
              : "Investigation per SOP-WS-005. System parameters reviewed.",
            rootCause: isRecent
              ? undefined
              : "Membrane integrity degradation identified during routine PM",
            capaRef: isRecent ? undefined : `CAPA-2026-${(excursions.length + 200).toString().padStart(4, "0")}`,
            resolvedAt: isRecent ? undefined : isoDate(daysToGenerate - 1 - day - 2),
            resolvedBy: isRecent ? undefined : "QA Manager",
            assignedTo: isRecent ? "Ahmed Hassan" : "Quality Assurance",
          };
          excursions.push(excursion);
        } else if (result === "alert") {
          if (rng() < 0.25) {
            const isRecent = day > 25;
            const excursion: WaterExcursionRecord = {
              id: `wexc-${excursions.length.toString().padStart(3, "0")}`,
              readingId: reading.id,
              pointId: point.id,
              systemId: system.id,
              status: isRecent ? "open" : "closed",
              detectedAt: reading.sampledAt,
              value: reading.value,
              limit: limits.alert,
              limitType: "alert",
              parameter: param,
              investigationNotes: isRecent
                ? ""
                : "Alert level reading documented. Trending reviewed.",
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

  return { systems, points, readings, excursions };
}

// ─── Store ─────────────────────────────────────────────────────────────────

export class WaterSystemStore {
  private systems: WaterSystem[] = [];
  private points: WaterSamplingPoint[] = [];
  private readings: WaterReading[] = [];
  private excursions: WaterExcursionRecord[] = [];
  private initialized = false;

  private load(): void {
    if (this.initialized) return;
    this.initialized = true;

    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored) as SeedStoreData;
        this.systems = data.systems;
        this.points = data.points;
        this.readings = data.readings;
        this.excursions = data.excursions;
        return;
      } catch {
        // fallthrough to seed
      }
    }

    const seed = buildSeedData();
    this.systems = seed.systems;
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
        systems: this.systems,
        points: this.points,
        readings: this.readings,
        excursions: this.excursions,
      })
    );
  }

  // ── Systems ────────────────────────────────────────────────────────────

  getAllSystems(): WaterSystem[] {
    this.load();
    return [...this.systems];
  }

  getSystemById(id: string): WaterSystem | undefined {
    this.load();
    return this.systems.find((s) => s.id === id);
  }

  getSystemsByType(type: WaterType): WaterSystem[] {
    this.load();
    return this.systems.filter((s) => s.type === type);
  }

  createSystem(data: Omit<WaterSystem, "id">): WaterSystem {
    this.load();
    const system: WaterSystem = { ...data, id: uid() };
    this.systems.push(system);
    this.save();
    return system;
  }

  updateSystem(id: string, updates: Partial<WaterSystem>): WaterSystem | undefined {
    this.load();
    const idx = this.systems.findIndex((s) => s.id === id);
    if (idx === -1) return undefined;
    this.systems[idx] = { ...this.systems[idx], ...updates };
    this.save();
    return this.systems[idx];
  }

  // ── Sampling Points ────────────────────────────────────────────────────

  getAllPoints(): WaterSamplingPoint[] {
    this.load();
    return [...this.points];
  }

  getPointById(id: string): WaterSamplingPoint | undefined {
    this.load();
    return this.points.find((p) => p.id === id);
  }

  getPointsBySystem(systemId: string): WaterSamplingPoint[] {
    this.load();
    return this.points.filter((p) => p.systemId === systemId);
  }

  getPointsByLocation(location: SamplingPointLocation): WaterSamplingPoint[] {
    this.load();
    return this.points.filter((p) => p.location === location);
  }

  createPoint(data: Omit<WaterSamplingPoint, "id">): WaterSamplingPoint {
    this.load();
    const point: WaterSamplingPoint = { ...data, id: uid() };
    this.points.push(point);
    this.save();
    return point;
  }

  updatePoint(id: string, updates: Partial<WaterSamplingPoint>): WaterSamplingPoint | undefined {
    this.load();
    const idx = this.points.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    this.points[idx] = { ...this.points[idx], ...updates };
    this.save();
    return this.points[idx];
  }

  // ── Readings ───────────────────────────────────────────────────────────

  getAllReadings(): WaterReading[] {
    this.load();
    return [...this.readings];
  }

  getReadingById(id: string): WaterReading | undefined {
    this.load();
    return this.readings.find((r) => r.id === id);
  }

  getReadingsByPoint(pointId: string): WaterReading[] {
    this.load();
    return this.readings.filter((r) => r.pointId === pointId);
  }

  getReadingsBySystem(systemId: string): WaterReading[] {
    this.load();
    return this.readings.filter((r) => r.systemId === systemId);
  }

  getReadingsByParameter(parameter: WaterTestParameterType): WaterReading[] {
    this.load();
    return this.readings.filter((r) => r.parameter === parameter);
  }

  getReadingsByDateRange(start: string, end: string): WaterReading[] {
    this.load();
    return this.readings.filter(
      (r) => r.sampledAt >= start && r.sampledAt <= end
    );
  }

  getReadingsToday(): WaterReading[] {
    const today = isoDate(0);
    return this.getAllReadings().filter((r) => r.sampledAt.startsWith(today));
  }

  addReading(data: Omit<WaterReading, "id">): WaterReading {
    if (!data.pointId?.trim()) throw new Error("Water reading point ID is required");
    if (!data.parameter?.trim()) throw new Error("Water reading parameter is required");
    this.load();
    const reading: WaterReading = { ...data, id: uid() };
    this.readings.unshift(reading);
    this.save();
    return reading;
  }

  // ── Excursions ─────────────────────────────────────────────────────────

  getAllExcursions(): WaterExcursionRecord[] {
    this.load();
    return [...this.excursions];
  }

  getExcursionById(id: string): WaterExcursionRecord | undefined {
    this.load();
    return this.excursions.find((e) => e.id === id);
  }

  getOpenExcursions(): WaterExcursionRecord[] {
    this.load();
    return this.excursions.filter(
      (e) => e.status === "open" || e.status === "investigating"
    );
  }

  getExcursionsBySystem(systemId: string): WaterExcursionRecord[] {
    this.load();
    return this.excursions.filter((e) => e.systemId === systemId);
  }

  getExcursionsByStatus(status: WaterExcursionStatus): WaterExcursionRecord[] {
    this.load();
    return this.excursions.filter((e) => e.status === status);
  }

  createExcursion(data: Omit<WaterExcursionRecord, "id">): WaterExcursionRecord {
    if (!data.systemId?.trim()) throw new Error("Excursion system ID is required");
    if (!data.parameter?.trim()) throw new Error("Excursion parameter is required");
    this.load();
    const excursion: WaterExcursionRecord = { ...data, id: uid() };
    this.excursions.unshift(excursion);
    this.save();
    return excursion;
  }

  updateExcursion(
    id: string,
    updates: Partial<WaterExcursionRecord>
  ): WaterExcursionRecord | undefined {
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
  ): WaterExcursionRecord | undefined {
    return this.updateExcursion(id, {
      ...resolution,
      status: "resolved",
      resolvedAt: new Date().toISOString(),
    });
  }

  // ── Trend Data ─────────────────────────────────────────────────────────

  getTrend(
    pointId: string,
    parameter: WaterTestParameterType,
    days: number = 30
  ): WaterTrend | undefined {
    this.load();
    const point = this.getPointById(pointId);
    if (!point) return undefined;
    const system = this.getSystemById(point.systemId);
    if (!system) return undefined;

    const limits = getLimitsForWaterParameter(system.type, parameter);
    if (!limits) return undefined;

    const cutoff = isoDate(days);
    const pointReadings = this.readings
      .filter(
        (r) =>
          r.pointId === pointId &&
          r.parameter === parameter &&
          r.sampledAt >= cutoff
      )
      .sort((a, b) => a.sampledAt.localeCompare(b.sampledAt));

    const data: WaterTrendDataPoint[] = pointReadings.map((r) => ({
      date: r.sampledAt,
      value: r.value,
      result: r.result,
    }));

    return {
      pointId: point.id,
      pointName: point.name,
      systemName: system.name,
      parameter,
      unit: limits.unit,
      alertLimit: limits.alert,
      actionLimit: limits.action,
      data,
    };
  }

  // ── Metrics ────────────────────────────────────────────────────────────

  getMetrics(): WaterMetrics {
    this.load();
    const today = isoDate(0);
    const weekAgo = isoDate(7);
    const monthAgo = isoDate(30);

    const todayReadings = this.readings.filter((r) =>
      r.sampledAt.startsWith(today)
    );
    const weekReadings = this.readings.filter((r) => r.sampledAt >= weekAgo);

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

    // System status summary
    const systemStatusSummary: WaterMetrics["systemStatusSummary"] = {};
    for (const system of this.systems) {
      const sysReadings = this.readings
        .filter((r) => r.systemId === system.id)
        .sort((a, b) => b.sampledAt.localeCompare(a.sampledAt));
      const recentReadings = sysReadings.filter((r) => r.sampledAt >= weekAgo);
      const excCount = this.excursions.filter(
        (e) => e.systemId === system.id && (e.status === "open" || e.status === "investigating")
      ).length;

      let status: WaterSystemStatus = "normal";
      if (recentReadings.some((r) => r.result === "action" || r.result === "fail")) {
        status = "action";
      } else if (recentReadings.some((r) => r.result === "alert")) {
        status = "alert";
      }

      systemStatusSummary[system.id] = {
        status,
        lastReading: sysReadings.length > 0 ? sysReadings[0].sampledAt : undefined,
        excursionCount: excCount,
      };
    }

    return {
      systemsMonitored: this.systems.filter((s) => s.isActive).length,
      activeSamplingPoints: this.points.filter((p) => p.isActive).length,
      readingsToday: todayReadings.length,
      excursionsOpen: openExcursions,
      complianceRate,
      readingsThisWeek: weekReadings.length,
      alertsToday,
      alertsThisWeek: alertsWeek,
      excursionsThisMonth: monthExcursions,
      systemStatusSummary,
    };
  }

  // ── System Status ──────────────────────────────────────────────────────

  getSystemStatus(systemId: string): WaterSystemStatus {
    this.load();
    const weekAgo = isoDate(7);
    const recentReadings = this.readings.filter(
      (r) => r.systemId === systemId && r.sampledAt >= weekAgo
    );

    if (recentReadings.some((r) => r.result === "fail")) return "shutdown";
    if (recentReadings.some((r) => r.result === "action")) return "action";
    if (recentReadings.some((r) => r.result === "alert")) return "alert";
    return "normal";
  }

  getSystemLatestReadings(systemId: string): WaterReading[] {
    this.load();
    const systemPoints = this.points.filter((p) => p.systemId === systemId);
    const latest: WaterReading[] = [];

    for (const point of systemPoints) {
      const parameters = WATER_TYPE_PARAMETERS[
        this.systems.find((s) => s.id === systemId)?.type ?? "purified-water"
      ];
      for (const param of parameters) {
        const readings = this.readings
          .filter((r) => r.pointId === point.id && r.parameter === param)
          .sort((a, b) => b.sampledAt.localeCompare(a.sampledAt));
        if (readings.length > 0) {
          latest.push(readings[0]);
        }
      }
    }
    return latest;
  }

  // ── Unique Values ──────────────────────────────────────────────────────

  getUniqueParameters(): WaterTestParameterType[] {
    this.load();
    return [...new Set(this.readings.map((r) => r.parameter))];
  }

  getUniqueOperators(): string[] {
    this.load();
    return [...new Set(this.readings.map((r) => r.sampledBy))];
  }

  getParametersForSystem(systemId: string): WaterTestParameterType[] {
    const system = this.getSystemById(systemId);
    if (!system) return [];
    return WATER_TYPE_PARAMETERS[system.type] ?? [];
  }
}

export const waterSystemStore = new WaterSystemStore();
