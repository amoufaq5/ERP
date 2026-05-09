"use client";

import type {
  HVACUnit,
  HVACUnitType,
  HVACParameterType,
  HVACReading,
  HVACQualification,
  QualificationType,
  QualificationStatus,
  FilterRecord,
  FilterType,
  FilterStatus,
  HVACAlarm,
  HVACMetrics,
  GradeClassification,
  ReadingResult,
  TestResult,
  DesignParameters,
  AlarmSeverity,
} from "./hvac-types";

// ─── Helpers ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "pharma.hvac";

function uid(): string {
  return `hv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

// ─── EU GMP Annex 1 Compliant HVAC Limits per Grade ──────────────────────

interface GradeLimits {
  temperature: { alert: number; action: number; target: number };
  humidity: { alert: number; action: number; target: number };
  differentialPressure: { alert: number; action: number; target: number };
  airChanges: { alert: number; action: number; target: number };
  particleCount05: { alertAtRest: number; actionAtRest: number; alertInOp: number; actionInOp: number };
  particleCount5: { alertAtRest: number; actionAtRest: number; alertInOp: number; actionInOp: number };
  airVelocity: { alert: number; action: number; target: number };
  recoveryTime: { alert: number; action: number; target: number };
}

const EU_GMP_HVAC_LIMITS: Record<GradeClassification, GradeLimits> = {
  A: {
    temperature: { alert: 21, action: 23, target: 20 },
    humidity: { alert: 50, action: 55, target: 45 },
    differentialPressure: { alert: 12, action: 10, target: 15 },
    airChanges: { alert: 300, action: 240, target: 400 },       // for laminar flow, interpreted as air velocity
    particleCount05: { alertAtRest: 2500, actionAtRest: 3520, alertInOp: 2500, actionInOp: 3520 },
    particleCount5: { alertAtRest: 15, actionAtRest: 20, alertInOp: 15, actionInOp: 20 },
    airVelocity: { alert: 0.36, action: 0.30, target: 0.45 },
    recoveryTime: { alert: 10, action: 15, target: 5 },
  },
  B: {
    temperature: { alert: 22, action: 25, target: 20 },
    humidity: { alert: 55, action: 60, target: 45 },
    differentialPressure: { alert: 12, action: 10, target: 15 },
    airChanges: { alert: 18, action: 15, target: 25 },
    particleCount05: { alertAtRest: 2500, actionAtRest: 3520, alertInOp: 250000, actionInOp: 352000 },
    particleCount5: { alertAtRest: 15, actionAtRest: 29, alertInOp: 1500, actionInOp: 2900 },
    airVelocity: { alert: 0.30, action: 0.20, target: 0.45 },
    recoveryTime: { alert: 12, action: 20, target: 8 },
  },
  C: {
    temperature: { alert: 23, action: 25, target: 21 },
    humidity: { alert: 55, action: 60, target: 45 },
    differentialPressure: { alert: 10, action: 8, target: 12 },
    airChanges: { alert: 15, action: 10, target: 20 },
    particleCount05: { alertAtRest: 250000, actionAtRest: 352000, alertInOp: 2500000, actionInOp: 3520000 },
    particleCount5: { alertAtRest: 1500, actionAtRest: 2900, alertInOp: 15000, actionInOp: 29000 },
    airVelocity: { alert: 0.20, action: 0.15, target: 0.35 },
    recoveryTime: { alert: 15, action: 25, target: 10 },
  },
  D: {
    temperature: { alert: 24, action: 27, target: 22 },
    humidity: { alert: 60, action: 65, target: 50 },
    differentialPressure: { alert: 8, action: 5, target: 10 },
    airChanges: { alert: 8, action: 6, target: 12 },
    particleCount05: { alertAtRest: 2500000, actionAtRest: 3520000, alertInOp: 25000000, actionInOp: 35200000 },
    particleCount5: { alertAtRest: 15000, actionAtRest: 29000, alertInOp: 50000, actionInOp: 100000 },
    airVelocity: { alert: 0.15, action: 0.10, target: 0.25 },
    recoveryTime: { alert: 20, action: 30, target: 15 },
  },
};

function getHVACLimits(
  grade: GradeClassification,
  parameter: HVACParameterType
): { alert: number; action: number; target: number; unit: string } {
  const gl = EU_GMP_HVAC_LIMITS[grade];
  switch (parameter) {
    case "temperature":
      return { ...gl.temperature, unit: "°C" };
    case "humidity":
      return { ...gl.humidity, unit: "%RH" };
    case "differential-pressure":
      return { ...gl.differentialPressure, unit: "Pa" };
    case "air-changes-per-hour":
      return { ...gl.airChanges, unit: "ACH" };
    case "particle-count-0.5um":
      return { alert: gl.particleCount05.alertInOp, action: gl.particleCount05.actionInOp, target: gl.particleCount05.alertInOp * 0.5, unit: "particles/m³" };
    case "particle-count-5um":
      return { alert: gl.particleCount5.alertInOp, action: gl.particleCount5.actionInOp, target: gl.particleCount5.alertInOp * 0.5, unit: "particles/m³" };
    case "air-velocity":
      return { ...gl.airVelocity, unit: "m/s" };
    case "recovery-time":
      return { ...gl.recoveryTime, unit: "min" };
    case "filter-integrity":
      return { alert: 99.95, action: 99.9, target: 99.99, unit: "%" };
  }
}

// ─── Operators ─────────────────────────────────────────────────────────────

const OPERATORS = [
  "Ahmed Hassan",
  "Fatma Ali",
  "Mohamed Ibrahim",
  "Nour El-Din",
  "Sara Mahmoud",
  "Omar Khaled",
];

// ─── Seed HVAC Units ───────────────────────────────────────────────────────

interface UnitConfig {
  name: string;
  type: HVACUnitType;
  areaServed: string;
  grade: GradeClassification;
  building: string;
  floor: string;
  description: string;
  designParameters: DesignParameters;
}

const SEED_UNITS: UnitConfig[] = [
  {
    name: "AHU-B01",
    type: "AHU",
    areaServed: "Aseptic Filling Suite - Background",
    grade: "B",
    building: "Building A",
    floor: "2nd Floor",
    description: "Primary AHU serving Grade B background area for filling line",
    designParameters: {
      supplyAirVolume: 12000,
      returnAirVolume: 10800,
      freshAirPercentage: 20,
      coolingCapacity: 85,
      heatingCapacity: 45,
      filterStages: "G4 + F9 + H14",
      fanType: "Centrifugal - backward curved",
      motorPower: 15,
    },
  },
  {
    name: "AHU-C01",
    type: "AHU",
    areaServed: "Oral Solid Manufacturing Room 1",
    grade: "C",
    building: "Building C",
    floor: "1st Floor",
    description: "AHU serving Grade C tablet compression area",
    designParameters: {
      supplyAirVolume: 15000,
      returnAirVolume: 13500,
      freshAirPercentage: 25,
      coolingCapacity: 100,
      heatingCapacity: 55,
      filterStages: "G4 + F9 + H13",
      fanType: "Centrifugal - backward curved",
      motorPower: 18.5,
    },
  },
  {
    name: "LFH-A01",
    type: "laminar-flow",
    areaServed: "Filling Line 1 - Aseptic Core",
    grade: "A",
    building: "Building A",
    floor: "2nd Floor",
    description: "Vertical laminar flow hood over aseptic filling line",
    designParameters: {
      airVelocity: 0.45,
      filterStages: "H14",
      supplyAirVolume: 3600,
    },
  },
  {
    name: "AHU-D01",
    type: "AHU",
    areaServed: "Packaging Hall & Corridor",
    grade: "D",
    building: "Building C",
    floor: "Ground Floor",
    description: "AHU serving Grade D packaging and corridor areas",
    designParameters: {
      supplyAirVolume: 20000,
      returnAirVolume: 18000,
      freshAirPercentage: 30,
      coolingCapacity: 120,
      heatingCapacity: 65,
      filterStages: "G4 + F9 + H13",
      fanType: "Axial",
      motorPower: 22,
    },
  },
];

// ─── Reading configurations per unit type/grade ────────────────────────────

interface ReadingConfig {
  parameter: HVACParameterType;
  frequency: number; // readings per day
}

function getReadingConfigs(unitType: HVACUnitType, grade: GradeClassification): ReadingConfig[] {
  const base: ReadingConfig[] = [
    { parameter: "temperature", frequency: 3 },
    { parameter: "humidity", frequency: 3 },
    { parameter: "differential-pressure", frequency: 3 },
  ];

  if (unitType === "AHU") {
    base.push({ parameter: "air-changes-per-hour", frequency: 1 });
    if (grade === "A" || grade === "B") {
      base.push({ parameter: "particle-count-0.5um", frequency: 2 });
      base.push({ parameter: "particle-count-5um", frequency: 2 });
    }
  }

  if (unitType === "laminar-flow" || unitType === "isolator") {
    base.push({ parameter: "air-velocity", frequency: 2 });
    base.push({ parameter: "particle-count-0.5um", frequency: 3 });
    base.push({ parameter: "particle-count-5um", frequency: 2 });
  }

  return base;
}

// ─── Seed data builder ────────────────────────────────────────────────────

interface SeedStoreData {
  units: HVACUnit[];
  readings: HVACReading[];
  qualifications: HVACQualification[];
  filters: FilterRecord[];
  alarms: HVACAlarm[];
}

function generateReadingValue(
  parameter: HVACParameterType,
  grade: GradeClassification,
  rng: () => number
): number {
  const limits = getHVACLimits(grade, parameter);

  switch (parameter) {
    case "temperature": {
      return round2(limits.target + gaussianRandom(rng) * 0.8);
    }
    case "humidity": {
      return round2(limits.target + gaussianRandom(rng) * 3);
    }
    case "differential-pressure": {
      return round2(limits.target + gaussianRandom(rng) * 1.5);
    }
    case "air-changes-per-hour": {
      return round2(limits.target + gaussianRandom(rng) * 2);
    }
    case "particle-count-0.5um": {
      const base = limits.alert * 0.3;
      return Math.round(Math.max(0, Math.abs(gaussianRandom(rng) * base * 0.4 + base * 0.5)));
    }
    case "particle-count-5um": {
      const base = limits.alert * 0.2;
      return Math.round(Math.max(0, Math.abs(gaussianRandom(rng) * base * 0.3 + base * 0.4)));
    }
    case "air-velocity": {
      return round2(limits.target + gaussianRandom(rng) * 0.03);
    }
    case "recovery-time": {
      return round2(Math.max(1, limits.target + gaussianRandom(rng) * 2));
    }
    case "filter-integrity": {
      return round2(Math.min(100, 99.99 + gaussianRandom(rng) * 0.02));
    }
  }
}

function classifyReading(
  value: number,
  alertLimit: number,
  actionLimit: number,
  parameter: HVACParameterType
): ReadingResult {
  // For differential-pressure, air-changes-per-hour, air-velocity, filter-integrity: lower is worse
  const lowerIsBad = [
    "differential-pressure",
    "air-changes-per-hour",
    "air-velocity",
    "filter-integrity",
  ].includes(parameter);

  if (lowerIsBad) {
    if (value < actionLimit) return "action";
    if (value < alertLimit) return "alert";
    return "pass";
  }

  // For temperature, humidity, particles, recovery-time: higher is worse
  if (value >= actionLimit) return "action";
  if (value >= alertLimit) return "alert";
  return "pass";
}

function buildSeedData(): SeedStoreData {
  const rng = seedRandom(20260508);

  // ── Build Units ──
  const units: HVACUnit[] = SEED_UNITS.map((cfg, i) => ({
    id: `hvu-${i.toString().padStart(3, "0")}`,
    name: cfg.name,
    type: cfg.type,
    areaServed: cfg.areaServed,
    grade: cfg.grade,
    building: cfg.building,
    floor: cfg.floor,
    designParameters: cfg.designParameters,
    status: "operational" as const,
    installationDate: isoDate(365 + Math.floor(rng() * 730)),
    lastMaintenanceDate: isoDate(Math.floor(rng() * 60)),
    description: cfg.description,
    isActive: true,
  }));

  // ── Build Readings (100+ over 30 days) ──
  const readings: HVACReading[] = [];
  const alarms: HVACAlarm[] = [];

  for (const unit of units) {
    const configs = getReadingConfigs(unit.type, unit.grade);

    for (const cfg of configs) {
      const limits = getHVACLimits(unit.grade, cfg.parameter);

      for (let day = 0; day < 7; day++) {
        const count = Math.max(1, Math.round(cfg.frequency * 0.7));

        for (let r = 0; r < count; r++) {
          let value = generateReadingValue(cfg.parameter, unit.grade, rng);

          // Inject excursions (~5% alert, ~1.5% action)
          const excursionRoll = rng();
          if (excursionRoll < 0.015) {
            // Action-level
            const lowerIsBad = ["differential-pressure", "air-changes-per-hour", "air-velocity", "filter-integrity"].includes(cfg.parameter);
            if (lowerIsBad) {
              value = round2(limits.action - rng() * (limits.action * 0.1));
            } else {
              value = round2(limits.action + rng() * (limits.action * 0.1));
            }
          } else if (excursionRoll < 0.06) {
            // Alert-level
            const lowerIsBad = ["differential-pressure", "air-changes-per-hour", "air-velocity", "filter-integrity"].includes(cfg.parameter);
            if (lowerIsBad) {
              const range = limits.alert - limits.action;
              value = round2(limits.alert - rng() * range * 0.5);
            } else {
              const range = limits.action - limits.alert;
              value = round2(limits.alert + rng() * range * 0.5);
            }
          }

          const result = classifyReading(value, limits.alert, limits.action, cfg.parameter);

          const hour = r === 0 ? 6 : r === 1 ? 14 : 22;

          const reading: HVACReading = {
            id: `hvr-${readings.length.toString().padStart(5, "0")}`,
            unitId: unit.id,
            parameter: cfg.parameter,
            value,
            unit: limits.unit,
            alertLimit: limits.alert,
            actionLimit: limits.action,
            result,
            timestamp: isoDateTime(29 - day, hour),
            operator: OPERATORS[Math.floor(rng() * OPERATORS.length)],
            notes: result === "action" ? "Excursion detected - investigation initiated" : undefined,
          };
          readings.push(reading);

          // Create alarms for excursions
          if (result === "alert" || result === "action") {
            const alarm: HVACAlarm = {
              id: `hva-${alarms.length.toString().padStart(3, "0")}`,
              unitId: unit.id,
              parameter: cfg.parameter,
              value,
              limit: result === "action" ? limits.action : limits.alert,
              limitType: result as "alert" | "action",
              severity: result === "action" ? "action" : "alert",
              timestamp: reading.timestamp,
              acknowledged: day < 25,
              acknowledgedBy: day < 25 ? OPERATORS[Math.floor(rng() * OPERATORS.length)] : undefined,
              acknowledgedAt: day < 25 ? isoDateTime(29 - day - 1, 9) : undefined,
            };
            alarms.push(alarm);
          }
        }
      }
    }
  }

  // ── Build Filter Records ──
  const filters: FilterRecord[] = [];
  const filterConfigs: { unitIdx: number; filterType: FilterType; location: string; model: string; efficiency: string }[] = [
    { unitIdx: 0, filterType: "HEPA", location: "AHU-B01 Terminal - Room 201", model: "CAMFIL Megalam ME", efficiency: "H14 - 99.995%" },
    { unitIdx: 0, filterType: "pre-filter", location: "AHU-B01 Pre-filter Bank", model: "CAMFIL Hi-Flo F9", efficiency: "F9 - 95%" },
    { unitIdx: 1, filterType: "HEPA", location: "AHU-C01 Terminal - MFG Room 1", model: "AAF AstroPak H13", efficiency: "H13 - 99.95%" },
    { unitIdx: 2, filterType: "HEPA", location: "LFH-A01 HEPA Face", model: "CAMFIL Megalam ME", efficiency: "H14 - 99.995%" },
    { unitIdx: 3, filterType: "HEPA", location: "AHU-D01 Terminal - Packaging", model: "AAF AstroPak H13", efficiency: "H13 - 99.95%" },
  ];

  for (let i = 0; i < filterConfigs.length; i++) {
    const cfg = filterConfigs[i];
    const unit = units[cfg.unitIdx];
    const installDaysAgo = 180 + Math.floor(rng() * 365);
    const lastTestDaysAgo = Math.floor(rng() * 90);
    const nextTestDays = 180 - lastTestDaysAgo;
    const isDue = nextTestDays <= 14;
    const testResult = rng() > 0.08 ? "pass" as const : "fail" as const;
    const status: FilterStatus = testResult === "fail" ? "failed" : isDue ? "due-for-test" : "active";

    filters.push({
      id: `hvf-${i.toString().padStart(3, "0")}`,
      unitId: unit.id,
      filterType: cfg.filterType,
      filterModel: cfg.model,
      location: cfg.location,
      installationDate: isoDate(installDaysAgo),
      lastIntegrityTest: cfg.filterType === "HEPA" ? isoDate(lastTestDaysAgo) : undefined,
      lastTestResult: cfg.filterType === "HEPA" ? testResult : undefined,
      nextTestDue: isoDate(-nextTestDays),
      status,
      efficiency: cfg.efficiency,
      notes: testResult === "fail" ? "Failed integrity test - replacement scheduled" : undefined,
    });
  }

  // ── Build Qualification Records ──
  const qualifications: HVACQualification[] = [];

  const qualConfigs: { unitIdx: number; type: QualificationType; status: QualificationStatus; daysAgo: number }[] = [
    { unitIdx: 0, type: "OQ", status: "passed", daysAgo: 120 },
    { unitIdx: 1, type: "PQ", status: "passed", daysAgo: 90 },
    { unitIdx: 2, type: "PQ", status: "in-progress", daysAgo: 5 },
  ];

  for (let i = 0; i < qualConfigs.length; i++) {
    const cfg = qualConfigs[i];
    const unit = units[cfg.unitIdx];

    const testResults: TestResult[] = [];
    const testNames = cfg.type === "IQ"
      ? ["Equipment Identification", "Utility Connections", "Documentation Review", "Component Verification", "Safety Features Check"]
      : cfg.type === "OQ"
        ? ["Temperature Mapping", "Humidity Verification", "Pressure Cascade", "Air Change Rate", "HEPA Filter Integrity", "Recovery Test"]
        : ["Particle Count At Rest", "Particle Count In Operation", "Temperature Stability (72h)", "Humidity Stability (72h)", "Pressure Cascade Stability", "Microbial Monitoring"];

    for (let t = 0; t < testNames.length; t++) {
      const isCompleted = cfg.status === "passed" || cfg.status === "requalification-due" || (cfg.status === "in-progress" && t < testNames.length - 2);
      const passed = isCompleted ? rng() > 0.05 : false;

      testResults.push({
        id: `hvt-${i}-${t}`,
        testName: testNames[t],
        acceptanceCriteria: `Per EU GMP Annex 1 / ${unit.grade} requirements`,
        actualResult: isCompleted ? (passed ? "Within specification" : "Out of specification") : "Pending",
        status: isCompleted ? (passed ? "pass" : "fail") : "pending",
        testedBy: isCompleted ? OPERATORS[Math.floor(rng() * OPERATORS.length)] : undefined,
        testedDate: isCompleted ? isoDate(cfg.daysAgo - t) : undefined,
      });
    }

    qualifications.push({
      id: `hvq-${i.toString().padStart(3, "0")}`,
      protocolNumber: `HVAC-${cfg.type}-${(2026).toString()}-${(i + 1).toString().padStart(3, "0")}`,
      unitId: unit.id,
      type: cfg.type,
      status: cfg.status,
      scheduledDate: isoDate(cfg.daysAgo + 5),
      startedDate: cfg.status !== "planned" ? isoDate(cfg.daysAgo) : undefined,
      completedDate: cfg.status === "passed" || cfg.status === "requalification-due" ? isoDate(cfg.daysAgo - testNames.length) : undefined,
      approvedBy: cfg.status === "passed" ? "QA Director" : undefined,
      testResults,
      deviations: cfg.status === "passed" && rng() > 0.7 ? "Minor deviation in temperature mapping - within acceptable range after investigation" : undefined,
      conclusion: cfg.status === "passed" ? "All acceptance criteria met. System qualified for intended use." : undefined,
      nextQualificationDue: cfg.status === "passed" ? isoDate(cfg.daysAgo - 365) : cfg.status === "requalification-due" ? isoDate(30) : undefined,
    });
  }

  return { units, readings, qualifications, filters, alarms };
}

// ─── Store ─────────────────────────────────────────────────────────────────

export class HVACStore {
  private units: HVACUnit[] = [];
  private readings: HVACReading[] = [];
  private qualifications: HVACQualification[] = [];
  private filters: FilterRecord[] = [];
  private alarms: HVACAlarm[] = [];
  private initialized = false;

  private load(): void {
    if (this.initialized) return;
    this.initialized = true;

    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored) as SeedStoreData;
        this.units = data.units;
        this.readings = data.readings;
        this.qualifications = data.qualifications;
        this.filters = data.filters;
        this.alarms = data.alarms;
        return;
      } catch {
        // fallthrough to seed
      }
    }

    const seed = buildSeedData();
    this.units = seed.units;
    this.readings = seed.readings;
    this.qualifications = seed.qualifications;
    this.filters = seed.filters;
    this.alarms = seed.alarms;
    this.save();
  }

  private save(): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        units: this.units,
        readings: this.readings,
        qualifications: this.qualifications,
        filters: this.filters,
        alarms: this.alarms,
      })
    );
  }

  // ── Units ──────────────────────────────────────────────────────────────

  getAllUnits(): HVACUnit[] {
    this.load();
    return [...this.units];
  }

  getUnitById(id: string): HVACUnit | undefined {
    this.load();
    return this.units.find((u) => u.id === id);
  }

  getUnitsByGrade(grade: GradeClassification): HVACUnit[] {
    this.load();
    return this.units.filter((u) => u.grade === grade);
  }

  getUnitsByType(type: HVACUnitType): HVACUnit[] {
    this.load();
    return this.units.filter((u) => u.type === type);
  }

  createUnit(data: Omit<HVACUnit, "id">): HVACUnit {
    if (!data.name?.trim()) throw new Error("HVAC unit name is required");
    if (!data.type?.trim()) throw new Error("HVAC unit type is required");
    if (!data.location?.trim()) throw new Error("HVAC unit location is required");
    this.load();
    const unit: HVACUnit = { ...data, id: uid() };
    this.units.push(unit);
    this.save();
    return unit;
  }

  updateUnit(id: string, updates: Partial<HVACUnit>): HVACUnit | undefined {
    this.load();
    const idx = this.units.findIndex((u) => u.id === id);
    if (idx === -1) return undefined;
    this.units[idx] = { ...this.units[idx], ...updates };
    this.save();
    return this.units[idx];
  }

  deleteUnit(id: string): boolean {
    this.load();
    const idx = this.units.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    this.units.splice(idx, 1);
    this.save();
    return true;
  }

  // ── Readings ───────────────────────────────────────────────────────────

  getAllReadings(): HVACReading[] {
    this.load();
    return [...this.readings];
  }

  getReadingsByUnit(unitId: string): HVACReading[] {
    this.load();
    return this.readings.filter((r) => r.unitId === unitId);
  }

  getReadingsByParameter(parameter: HVACParameterType): HVACReading[] {
    this.load();
    return this.readings.filter((r) => r.parameter === parameter);
  }

  getReadingsByDateRange(start: string, end: string): HVACReading[] {
    this.load();
    return this.readings.filter(
      (r) => r.timestamp >= start && r.timestamp <= end
    );
  }

  getLatestReadings(unitId: string): HVACReading[] {
    this.load();
    const unitReadings = this.readings.filter((r) => r.unitId === unitId);
    const latestByParam = new Map<HVACParameterType, HVACReading>();
    for (const r of unitReadings) {
      const existing = latestByParam.get(r.parameter);
      if (!existing || r.timestamp > existing.timestamp) {
        latestByParam.set(r.parameter, r);
      }
    }
    return Array.from(latestByParam.values());
  }

  addReading(data: Omit<HVACReading, "id">): HVACReading {
    this.load();
    const reading: HVACReading = { ...data, id: uid() };
    this.readings.unshift(reading);
    this.save();
    return reading;
  }

  // ── Qualifications ─────────────────────────────────────────────────────

  getAllQualifications(): HVACQualification[] {
    this.load();
    return [...this.qualifications];
  }

  getQualificationsByUnit(unitId: string): HVACQualification[] {
    this.load();
    return this.qualifications.filter((q) => q.unitId === unitId);
  }

  getQualificationsByStatus(status: QualificationStatus): HVACQualification[] {
    this.load();
    return this.qualifications.filter((q) => q.status === status);
  }

  getQualificationsDue(): HVACQualification[] {
    this.load();
    return this.qualifications.filter(
      (q) => q.status === "requalification-due" || q.status === "planned"
    );
  }

  createQualification(data: Omit<HVACQualification, "id">): HVACQualification {
    this.load();
    const qual: HVACQualification = { ...data, id: uid() };
    this.qualifications.push(qual);
    this.save();
    return qual;
  }

  updateQualification(id: string, updates: Partial<HVACQualification>): HVACQualification | undefined {
    this.load();
    const idx = this.qualifications.findIndex((q) => q.id === id);
    if (idx === -1) return undefined;
    this.qualifications[idx] = { ...this.qualifications[idx], ...updates };
    this.save();
    return this.qualifications[idx];
  }

  // ── Filters ────────────────────────────────────────────────────────────

  getAllFilters(): FilterRecord[] {
    this.load();
    return [...this.filters];
  }

  getFiltersByUnit(unitId: string): FilterRecord[] {
    this.load();
    return this.filters.filter((f) => f.unitId === unitId);
  }

  getFiltersByType(filterType: FilterType): FilterRecord[] {
    this.load();
    return this.filters.filter((f) => f.filterType === filterType);
  }

  getFiltersByStatus(status: FilterStatus): FilterRecord[] {
    this.load();
    return this.filters.filter((f) => f.status === status);
  }

  getFiltersDue(): FilterRecord[] {
    this.load();
    const today = isoDate(0);
    return this.filters.filter(
      (f) => f.status === "due-for-test" || f.status === "failed" || f.nextTestDue <= today
    );
  }

  createFilter(data: Omit<FilterRecord, "id">): FilterRecord {
    this.load();
    const filter: FilterRecord = { ...data, id: uid() };
    this.filters.push(filter);
    this.save();
    return filter;
  }

  updateFilter(id: string, updates: Partial<FilterRecord>): FilterRecord | undefined {
    this.load();
    const idx = this.filters.findIndex((f) => f.id === id);
    if (idx === -1) return undefined;
    this.filters[idx] = { ...this.filters[idx], ...updates };
    this.save();
    return this.filters[idx];
  }

  // ── Alarms ─────────────────────────────────────────────────────────────

  getAllAlarms(): HVACAlarm[] {
    this.load();
    return [...this.alarms];
  }

  getAlarms(): HVACAlarm[] {
    this.load();
    return this.alarms.filter((a) => !a.acknowledged);
  }

  getAlarmsByUnit(unitId: string): HVACAlarm[] {
    this.load();
    return this.alarms.filter((a) => a.unitId === unitId);
  }

  acknowledgeAlarm(id: string, by: string): HVACAlarm | undefined {
    this.load();
    const idx = this.alarms.findIndex((a) => a.id === id);
    if (idx === -1) return undefined;
    this.alarms[idx] = {
      ...this.alarms[idx],
      acknowledged: true,
      acknowledgedBy: by,
      acknowledgedAt: new Date().toISOString(),
    };
    this.save();
    return this.alarms[idx];
  }

  createAlarm(data: Omit<HVACAlarm, "id">): HVACAlarm {
    this.load();
    const alarm: HVACAlarm = { ...data, id: uid() };
    this.alarms.unshift(alarm);
    this.save();
    return alarm;
  }

  // ── Unit Status ────────────────────────────────────────────────────────

  getUnitStatus(unitId: string): "normal" | "alert" | "action" {
    this.load();
    const weekAgo = isoDate(7);
    const recentReadings = this.readings.filter(
      (r) => r.unitId === unitId && r.timestamp >= weekAgo
    );
    if (recentReadings.some((r) => r.result === "action")) return "action";
    if (recentReadings.some((r) => r.result === "alert")) return "alert";
    return "normal";
  }

  // ── Metrics ────────────────────────────────────────────────────────────

  getMetrics(): HVACMetrics {
    this.load();

    const totalUnits = this.units.filter((u) => u.isActive).length;
    const operationalUnits = this.units.filter((u) => u.status === "operational" && u.isActive).length;
    const activeAlarms = this.alarms.filter((a) => !a.acknowledged).length;
    const acknowledgedAlarms = this.alarms.filter((a) => a.acknowledged).length;
    const filtersDue = this.getFiltersDue().length;
    const filtersFailed = this.filters.filter((f) => f.status === "failed").length;
    const qualificationsDue = this.getQualificationsDue().length;

    const totalReadings = this.readings.length;
    const passReadings = this.readings.filter((r) => r.result === "pass").length;
    const complianceRate = totalReadings > 0 ? round2((passReadings / totalReadings) * 100) : 100;

    const unitsByGrade: Record<GradeClassification, number> = { A: 0, B: 0, C: 0, D: 0 };
    const unitsByType: Record<HVACUnitType, number> = { AHU: 0, exhaust: 0, "laminar-flow": 0, isolator: 0, "pass-through": 0 };

    for (const u of this.units) {
      if (u.isActive) {
        unitsByGrade[u.grade]++;
        unitsByType[u.type]++;
      }
    }

    return {
      totalUnits,
      operationalUnits,
      activeAlarms,
      acknowledgedAlarms,
      filtersDueCount: filtersDue,
      filtersFailedCount: filtersFailed,
      qualificationsDue,
      complianceRate,
      unitsByGrade,
      unitsByType,
    };
  }
}

export const hvacStore = new HVACStore();
