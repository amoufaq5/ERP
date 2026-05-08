"use client";

import type {
  CleaningProtocol,
  CleaningRun,
  CleaningSample,
  CleaningStatus,
  CleaningMethod,
  CleaningLimit,
  CleaningMetrics,
  CleaningProcedureStep,
  SamplingPoint,
  MACOParams,
  EquipmentType,
} from "./cleaning-types";

const STORAGE_KEY = "pharma.cleaning-validation";

/* ────────────────────────── helpers ──────────────────────────────── */

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function futureDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)
  );
}

/* ────────────────────── MACO engine ─────────────────────────────── */

/**
 * Calculate Maximum Allowable Carryover (MACO) in mg.
 * MACO = (TD × MBS × SF) / MDD
 * Where:
 *   TD  = minimum therapeutic dose of previous product (mg)
 *   MBS = minimum batch size of next product (kg, converted to mg)
 *   SF  = safety factor (default 0.001)
 *   MDD = maximum daily dose of next product (mg)
 *
 * Per-area limit = MACO / sharedSurfaceArea (mg/cm²)
 */
export function calculateMACO(params: MACOParams): number {
  const { minTherapeuticDose, maxDailyDoseNext, minBatchSizeNext, safetyFactor } = params;
  if (maxDailyDoseNext === 0) return 0;
  const maco = (minTherapeuticDose * minBatchSizeNext * 1_000_000 * safetyFactor) / maxDailyDoseNext;
  return Math.round(maco * 100) / 100;
}

export function calculatePerAreaLimit(macoMg: number, surfaceAreaCm2: number): number {
  if (surfaceAreaCm2 === 0) return 0;
  return Math.round((macoMg / surfaceAreaCm2) * 1000) / 1000;
}

/* ──────────────────── Seed: Sampling Points ─────────────────────── */

function tabletPressSamplingPoints(): SamplingPoint[] {
  return [
    { id: "sp-tp-1", label: "Upper punch face", description: "Top of upper punch set", x: 50, y: 10, method: "swab", worstCase: true },
    { id: "sp-tp-2", label: "Lower punch face", description: "Top of lower punch set", x: 50, y: 90, method: "swab", worstCase: true },
    { id: "sp-tp-3", label: "Die bore", description: "Inner surface of die table", x: 50, y: 50, method: "swab", worstCase: true },
    { id: "sp-tp-4", label: "Feed frame", description: "Powder feed frame interior", x: 20, y: 40, method: "swab", worstCase: false },
    { id: "sp-tp-5", label: "Turret surface", description: "Turret top surface", x: 80, y: 40, method: "swab", worstCase: false },
    { id: "sp-tp-6", label: "Discharge chute", description: "Tablet discharge area", x: 80, y: 75, method: "rinse", worstCase: false },
  ];
}

function fbdSamplingPoints(): SamplingPoint[] {
  return [
    { id: "sp-fbd-1", label: "Product bowl bottom", description: "Base of product container", x: 50, y: 85, method: "swab", worstCase: true },
    { id: "sp-fbd-2", label: "Air distributor plate", description: "Perforated plate surface", x: 50, y: 70, method: "swab", worstCase: true },
    { id: "sp-fbd-3", label: "Spray nozzle", description: "Spray gun nozzle area", x: 50, y: 20, method: "swab", worstCase: true },
    { id: "sp-fbd-4", label: "Filter bags", description: "Filter bag inner surface", x: 30, y: 10, method: "rinse", worstCase: false },
    { id: "sp-fbd-5", label: "Expansion chamber", description: "Inner wall of expansion chamber", x: 70, y: 30, method: "swab", worstCase: false },
    { id: "sp-fbd-6", label: "Product discharge", description: "Discharge valve area", x: 50, y: 95, method: "rinse", worstCase: false },
  ];
}

function coatingPanSamplingPoints(): SamplingPoint[] {
  return [
    { id: "sp-cp-1", label: "Pan interior", description: "Inner drum surface", x: 50, y: 50, method: "swab", worstCase: true },
    { id: "sp-cp-2", label: "Baffle plates", description: "Mixing baffle surfaces", x: 30, y: 40, method: "swab", worstCase: true },
    { id: "sp-cp-3", label: "Spray guns", description: "Spray gun nozzle tips", x: 50, y: 15, method: "swab", worstCase: true },
    { id: "sp-cp-4", label: "Inlet air plenum", description: "Air inlet chamber", x: 20, y: 20, method: "rinse", worstCase: false },
    { id: "sp-cp-5", label: "Pan perf holes", description: "Perforated drum holes", x: 70, y: 60, method: "visual", worstCase: false },
  ];
}

function mixerSamplingPoints(): SamplingPoint[] {
  return [
    { id: "sp-mx-1", label: "Impeller blades", description: "Main impeller blade surfaces", x: 50, y: 60, method: "swab", worstCase: true },
    { id: "sp-mx-2", label: "Chopper blades", description: "High-speed chopper area", x: 70, y: 40, method: "swab", worstCase: true },
    { id: "sp-mx-3", label: "Bowl bottom", description: "Base of mixing bowl", x: 50, y: 85, method: "swab", worstCase: true },
    { id: "sp-mx-4", label: "Lid inner surface", description: "Inner surface of lid", x: 50, y: 10, method: "swab", worstCase: false },
    { id: "sp-mx-5", label: "Discharge valve", description: "Product discharge valve", x: 80, y: 80, method: "rinse", worstCase: false },
  ];
}

function fillingLineSamplingPoints(): SamplingPoint[] {
  return [
    { id: "sp-fl-1", label: "Hopper interior", description: "Filling hopper inner wall", x: 50, y: 15, method: "swab", worstCase: true },
    { id: "sp-fl-2", label: "Dosing disc", description: "Dosing disc surface", x: 50, y: 45, method: "swab", worstCase: true },
    { id: "sp-fl-3", label: "Tamping pins", description: "Tamping station pins", x: 30, y: 55, method: "swab", worstCase: true },
    { id: "sp-fl-4", label: "Capsule segment", description: "Capsule holding segment", x: 70, y: 55, method: "swab", worstCase: false },
    { id: "sp-fl-5", label: "Powder bowl", description: "Powder bed area", x: 50, y: 30, method: "TOC", worstCase: false },
    { id: "sp-fl-6", label: "Ejection chute", description: "Filled capsule discharge", x: 80, y: 80, method: "rinse", worstCase: false },
  ];
}

/* ──────────────────────── Seed: Protocols ───────────────────────── */

const SEED_PROTOCOLS: CleaningProtocol[] = [
  {
    id: "clp-1",
    number: "CLN-2026-001",
    title: "Tablet Press TP-01: Amoxicillin to Metformin changeover",
    equipment: "Tablet Press TP-01 (Fette 1200i)",
    equipmentId: "EQ-TP-01",
    equipmentType: "tablet-press",
    fromProduct: "Amoxicillin 500mg Tablets",
    toProduct: "Metformin 850mg Tablets",
    cleaningProcedure: [
      { step: 1, instruction: "Disassemble punches, dies, feed frame, and turret guards", duration: "30 min" },
      { step: 2, instruction: "Rinse all parts with purified water at 60°C", duration: "15 min", agent: "Purified Water", temperature: "60°C" },
      { step: 3, instruction: "Wash with 1% alkaline detergent solution", duration: "20 min", agent: "CIP-100 Alkaline Detergent", concentration: "1% v/v", temperature: "50°C" },
      { step: 4, instruction: "Scrub hard-to-clean areas (die bores, punch tips)", duration: "15 min" },
      { step: 5, instruction: "Rinse with purified water (3 successive rinses)", duration: "15 min", agent: "Purified Water" },
      { step: 6, instruction: "Final rinse with WFI", duration: "10 min", agent: "Water for Injection" },
      { step: 7, instruction: "Dry all parts in clean oven at 50°C", duration: "60 min", temperature: "50°C" },
      { step: 8, instruction: "Visually inspect all parts for residue", duration: "10 min" },
    ],
    samplingPlan: tabletPressSamplingPoints(),
    acceptanceCriteria: [
      { id: "lim-1a", method: "swab", macoMg: 2.5, acceptanceValue: 4.17, acceptanceUnit: "µg/swab", rationale: "Based on MACO calculation: TD=250mg, MBS=300kg, SF=0.001, MDD=3000mg. Swab area 25cm², recovery 80%", macoParams: { minTherapeuticDose: 250, maxDailyDoseNext: 3000, minBatchSizeNext: 300, sharedSurfaceArea: 48000, safetyFactor: 0.001 } },
      { id: "lim-1b", method: "rinse", macoMg: 2.5, acceptanceValue: 0.25, acceptanceUnit: "µg/mL", rationale: "Final rinse volume 10L, MACO-derived limit" },
      { id: "lim-1c", method: "visual", macoMg: 2.5, acceptanceValue: 0, acceptanceUnit: "no visible residue", rationale: "No visible residue on any surface under 1000 lux illumination" },
    ],
    status: "approved",
    approvedBy: "Dr. Laila Farouk",
    approvedAt: daysAgo(90),
    createdBy: "Dr. Ahmed Hassan",
    createdAt: daysAgo(100),
    revalidationIntervalDays: 180,
    nextRevalidationDate: futureDays(30),
    version: 2,
  },
  {
    id: "clp-2",
    number: "CLN-2026-002",
    title: "FBD-01: Paracetamol to Omeprazole changeover",
    equipment: "Fluid Bed Dryer FBD-01 (Glatt GPCG-60)",
    equipmentId: "EQ-FBD-01",
    equipmentType: "fbd",
    fromProduct: "Paracetamol 500mg Granules",
    toProduct: "Omeprazole 20mg Pellets",
    cleaningProcedure: [
      { step: 1, instruction: "Remove and disassemble filter bags, spray gun, product bowl", duration: "20 min" },
      { step: 2, instruction: "Vacuum loose powder from expansion chamber", duration: "10 min" },
      { step: 3, instruction: "CIP cycle: rinse with purified water at 70°C", duration: "20 min", agent: "Purified Water", temperature: "70°C" },
      { step: 4, instruction: "Wash with 0.5% acidic detergent (for Paracetamol residue)", duration: "15 min", agent: "CIP-200 Acid Detergent", concentration: "0.5% v/v" },
      { step: 5, instruction: "Triple rinse with purified water", duration: "15 min", agent: "Purified Water" },
      { step: 6, instruction: "Dry with conditioned air at 55°C for 2 hours", duration: "120 min", temperature: "55°C" },
    ],
    samplingPlan: fbdSamplingPoints(),
    acceptanceCriteria: [
      { id: "lim-2a", method: "swab", macoMg: 1.67, acceptanceValue: 2.78, acceptanceUnit: "µg/swab", rationale: "MACO: TD=500mg, MBS=200kg, SF=0.001, MDD=60mg", macoParams: { minTherapeuticDose: 500, maxDailyDoseNext: 60, minBatchSizeNext: 200, sharedSurfaceArea: 60000, safetyFactor: 0.001 } },
      { id: "lim-2b", method: "rinse", macoMg: 1.67, acceptanceValue: 0.167, acceptanceUnit: "µg/mL", rationale: "Final rinse volume 10L" },
    ],
    status: "approved",
    approvedBy: "Dr. Laila Farouk",
    approvedAt: daysAgo(80),
    createdBy: "Dr. Nadia Soliman",
    createdAt: daysAgo(95),
    revalidationIntervalDays: 180,
    nextRevalidationDate: futureDays(45),
    version: 1,
  },
  {
    id: "clp-3",
    number: "CLN-2026-003",
    title: "Coating Pan CP-01: Metformin FC to Amoxicillin FC changeover",
    equipment: "Coating Pan CP-01 (O'Hara Labcoat-II)",
    equipmentId: "EQ-CP-01",
    equipmentType: "coating-pan",
    fromProduct: "Metformin 850mg Film-Coated Tablets",
    toProduct: "Amoxicillin 500mg Film-Coated Tablets",
    cleaningProcedure: [
      { step: 1, instruction: "Remove spray guns and disassemble nozzle assemblies", duration: "15 min" },
      { step: 2, instruction: "Run CIP wash cycle with hot purified water", duration: "30 min", agent: "Purified Water", temperature: "65°C" },
      { step: 3, instruction: "Apply 1% alkaline detergent via spray system", duration: "20 min", agent: "CIP-100 Alkaline Detergent", concentration: "1% v/v" },
      { step: 4, instruction: "Manual scrub baffle plates and perforation area", duration: "20 min" },
      { step: 5, instruction: "Final rinse cycle (3x purified water)", duration: "20 min", agent: "Purified Water" },
      { step: 6, instruction: "Dry with heated air at 50°C", duration: "45 min", temperature: "50°C" },
    ],
    samplingPlan: coatingPanSamplingPoints(),
    acceptanceCriteria: [
      { id: "lim-3a", method: "swab", macoMg: 7.08, acceptanceValue: 11.81, acceptanceUnit: "µg/swab", rationale: "MACO: TD=850mg, MBS=250kg, SF=0.001, MDD=3000mg", macoParams: { minTherapeuticDose: 850, maxDailyDoseNext: 3000, minBatchSizeNext: 250, sharedSurfaceArea: 30000, safetyFactor: 0.001 } },
      { id: "lim-3b", method: "visual", macoMg: 7.08, acceptanceValue: 0, acceptanceUnit: "no visible residue", rationale: "Visual inspection under 1000 lux" },
    ],
    status: "approved",
    approvedBy: "Dr. Rania Abdel-Aziz",
    approvedAt: daysAgo(70),
    createdBy: "Dr. Khaled Mahmoud",
    createdAt: daysAgo(85),
    revalidationIntervalDays: 180,
    nextRevalidationDate: futureDays(60),
    version: 1,
  },
  {
    id: "clp-4",
    number: "CLN-2026-004",
    title: "High Shear Mixer MX-01: Omeprazole to Paracetamol changeover",
    equipment: "High Shear Mixer MX-01 (Diosna P250)",
    equipmentId: "EQ-MX-01",
    equipmentType: "mixer",
    fromProduct: "Omeprazole 20mg Granulate",
    toProduct: "Paracetamol 500mg Granulate",
    cleaningProcedure: [
      { step: 1, instruction: "Remove impeller, chopper, and discharge valve", duration: "15 min" },
      { step: 2, instruction: "Pre-rinse with cold purified water to remove bulk residue", duration: "10 min", agent: "Purified Water" },
      { step: 3, instruction: "Wash with 1% alkaline detergent at 60°C", duration: "20 min", agent: "CIP-100 Alkaline Detergent", concentration: "1% v/v", temperature: "60°C" },
      { step: 4, instruction: "Rinse 3x with purified water", duration: "15 min", agent: "Purified Water" },
      { step: 5, instruction: "Dry at 50°C", duration: "60 min", temperature: "50°C" },
    ],
    samplingPlan: mixerSamplingPoints(),
    acceptanceCriteria: [
      { id: "lim-4a", method: "swab", macoMg: 0.27, acceptanceValue: 0.45, acceptanceUnit: "µg/swab", rationale: "MACO: TD=20mg, MBS=200kg, SF=0.001, MDD=1500mg (high-dose next product, low-dose prior product)", macoParams: { minTherapeuticDose: 20, maxDailyDoseNext: 1500, minBatchSizeNext: 200, sharedSurfaceArea: 35000, safetyFactor: 0.001 } },
      { id: "lim-4b", method: "rinse", macoMg: 0.27, acceptanceValue: 0.027, acceptanceUnit: "µg/mL", rationale: "Final rinse volume 10L" },
    ],
    status: "approved",
    approvedBy: "Dr. Laila Farouk",
    approvedAt: daysAgo(60),
    createdBy: "Dr. Ahmed Hassan",
    createdAt: daysAgo(75),
    revalidationIntervalDays: 180,
    nextRevalidationDate: futureDays(15),
    version: 1,
  },
  {
    id: "clp-5",
    number: "CLN-2026-005",
    title: "Filling Line FL-01: Omeprazole 20mg to Amoxicillin 250mg capsules",
    equipment: "Capsule Filling Line FL-01 (Bosch GKF 2500)",
    equipmentId: "EQ-FL-01",
    equipmentType: "filling-line",
    fromProduct: "Omeprazole 20mg Capsules",
    toProduct: "Amoxicillin 250mg Capsules",
    cleaningProcedure: [
      { step: 1, instruction: "Remove dosing disc, tamping pins, segment rings", duration: "20 min" },
      { step: 2, instruction: "Vacuum hopper and powder bowl", duration: "10 min" },
      { step: 3, instruction: "Wash all parts with 0.5% alkaline detergent", duration: "20 min", agent: "CIP-100 Alkaline Detergent", concentration: "0.5% v/v" },
      { step: 4, instruction: "Ultrasonic cleaning of dosing disc and pins", duration: "15 min" },
      { step: 5, instruction: "Triple rinse with purified water", duration: "15 min", agent: "Purified Water" },
      { step: 6, instruction: "Dry in clean oven at 45°C", duration: "60 min", temperature: "45°C" },
    ],
    samplingPlan: fillingLineSamplingPoints(),
    acceptanceCriteria: [
      { id: "lim-5a", method: "swab", macoMg: 0.53, acceptanceValue: 0.89, acceptanceUnit: "µg/swab", rationale: "MACO: TD=20mg, MBS=200kg, SF=0.001, MDD=750mg", macoParams: { minTherapeuticDose: 20, maxDailyDoseNext: 750, minBatchSizeNext: 200, sharedSurfaceArea: 25000, safetyFactor: 0.001 } },
      { id: "lim-5b", method: "TOC", macoMg: 0.53, acceptanceValue: 10, acceptanceUnit: "ppm", rationale: "TOC limit based on 10 ppm allowance per cleaning validation guidance" },
      { id: "lim-5c", method: "rinse", macoMg: 0.53, acceptanceValue: 0.053, acceptanceUnit: "µg/mL", rationale: "Final rinse volume 10L" },
    ],
    status: "approved",
    approvedBy: "Dr. Laila Farouk",
    approvedAt: daysAgo(55),
    createdBy: "Dr. Youssef Kamel",
    createdAt: daysAgo(70),
    revalidationIntervalDays: 180,
    nextRevalidationDate: futureDays(75),
    version: 1,
  },
  {
    id: "clp-6",
    number: "CLN-2026-006",
    title: "Tablet Press TP-02: Paracetamol to Ibuprofen changeover",
    equipment: "Tablet Press TP-02 (Korsch XL400)",
    equipmentId: "EQ-TP-02",
    equipmentType: "tablet-press",
    fromProduct: "Paracetamol 500mg Tablets",
    toProduct: "Ibuprofen 400mg Tablets",
    cleaningProcedure: [
      { step: 1, instruction: "Disassemble punches, dies, feed frame", duration: "30 min" },
      { step: 2, instruction: "Rinse with hot purified water at 65°C", duration: "15 min", agent: "Purified Water", temperature: "65°C" },
      { step: 3, instruction: "Wash with 1% alkaline detergent", duration: "20 min", agent: "CIP-100 Alkaline Detergent", concentration: "1% v/v" },
      { step: 4, instruction: "Scrub die bores and punch faces", duration: "15 min" },
      { step: 5, instruction: "Triple rinse with purified water", duration: "15 min", agent: "Purified Water" },
      { step: 6, instruction: "Dry parts at 50°C", duration: "60 min", temperature: "50°C" },
    ],
    samplingPlan: tabletPressSamplingPoints().map((p) => ({ ...p, id: p.id.replace("tp", "tp2") })),
    acceptanceCriteria: [
      { id: "lim-6a", method: "swab", macoMg: 8.33, acceptanceValue: 13.89, acceptanceUnit: "µg/swab", rationale: "MACO: TD=500mg, MBS=200kg, SF=0.001, MDD=1200mg", macoParams: { minTherapeuticDose: 500, maxDailyDoseNext: 1200, minBatchSizeNext: 200, sharedSurfaceArea: 48000, safetyFactor: 0.001 } },
      { id: "lim-6b", method: "rinse", macoMg: 8.33, acceptanceValue: 0.833, acceptanceUnit: "µg/mL", rationale: "Final rinse volume 10L" },
    ],
    status: "approved",
    approvedBy: "Dr. Rania Abdel-Aziz",
    approvedAt: daysAgo(45),
    createdBy: "Dr. Khaled Mahmoud",
    createdAt: daysAgo(60),
    revalidationIntervalDays: 180,
    nextRevalidationDate: futureDays(90),
    version: 1,
  },
  {
    id: "clp-7",
    number: "CLN-2026-007",
    title: "FBD-02: Ibuprofen to Metformin changeover",
    equipment: "Fluid Bed Dryer FBD-02 (Glatt GPCG-120)",
    equipmentId: "EQ-FBD-02",
    equipmentType: "fbd",
    fromProduct: "Ibuprofen 400mg Granules",
    toProduct: "Metformin 850mg Granules",
    cleaningProcedure: [
      { step: 1, instruction: "Remove filter bags, spray system, product bowl", duration: "20 min" },
      { step: 2, instruction: "Vacuum all loose material", duration: "10 min" },
      { step: 3, instruction: "CIP hot water rinse", duration: "20 min", agent: "Purified Water", temperature: "70°C" },
      { step: 4, instruction: "Alkaline detergent wash", duration: "15 min", agent: "CIP-100 Alkaline Detergent", concentration: "1% v/v" },
      { step: 5, instruction: "Triple rinse with purified water", duration: "15 min", agent: "Purified Water" },
      { step: 6, instruction: "Dry with conditioned air 55°C", duration: "120 min", temperature: "55°C" },
    ],
    samplingPlan: fbdSamplingPoints().map((p) => ({ ...p, id: p.id.replace("fbd", "fbd2") })),
    acceptanceCriteria: [
      { id: "lim-7a", method: "swab", macoMg: 2.22, acceptanceValue: 3.70, acceptanceUnit: "µg/swab", rationale: "MACO: TD=400mg, MBS=250kg, SF=0.001, MDD=3000mg (Metformin high daily dose)", macoParams: { minTherapeuticDose: 400, maxDailyDoseNext: 3000, minBatchSizeNext: 250, sharedSurfaceArea: 45000, safetyFactor: 0.001 } },
      { id: "lim-7b", method: "rinse", macoMg: 2.22, acceptanceValue: 0.222, acceptanceUnit: "µg/mL", rationale: "Final rinse volume 10L" },
    ],
    status: "approved",
    approvedBy: "Dr. Laila Farouk",
    approvedAt: daysAgo(40),
    createdBy: "Dr. Nadia Soliman",
    createdAt: daysAgo(55),
    revalidationIntervalDays: 180,
    nextRevalidationDate: futureDays(100),
    version: 1,
  },
  {
    id: "clp-8",
    number: "CLN-2026-008",
    title: "Coating Pan CP-02: Ibuprofen FC to Omeprazole EC changeover",
    equipment: "Coating Pan CP-02 (Thomas Engineering Accela-Cota)",
    equipmentId: "EQ-CP-02",
    equipmentType: "coating-pan",
    fromProduct: "Ibuprofen 400mg Film-Coated Tablets",
    toProduct: "Omeprazole 20mg Enteric-Coated Tablets",
    cleaningProcedure: [
      { step: 1, instruction: "Remove and disassemble spray guns", duration: "15 min" },
      { step: 2, instruction: "Hot water CIP cycle", duration: "30 min", agent: "Purified Water", temperature: "65°C" },
      { step: 3, instruction: "Alkaline detergent wash", duration: "20 min", agent: "CIP-100 Alkaline Detergent", concentration: "1% v/v" },
      { step: 4, instruction: "Manual scrub of baffles", duration: "20 min" },
      { step: 5, instruction: "Triple rinse", duration: "20 min", agent: "Purified Water" },
      { step: 6, instruction: "Heated air dry", duration: "45 min", temperature: "50°C" },
    ],
    samplingPlan: coatingPanSamplingPoints().map((p) => ({ ...p, id: p.id.replace("cp", "cp2") })),
    acceptanceCriteria: [
      { id: "lim-8a", method: "swab", macoMg: 4.44, acceptanceValue: 7.41, acceptanceUnit: "µg/swab", rationale: "MACO: TD=400mg, MBS=150kg, SF=0.001, MDD=60mg (Omeprazole low daily dose requires careful cleaning)", macoParams: { minTherapeuticDose: 400, maxDailyDoseNext: 60, minBatchSizeNext: 150, sharedSurfaceArea: 30000, safetyFactor: 0.001 } },
      { id: "lim-8b", method: "visual", macoMg: 4.44, acceptanceValue: 0, acceptanceUnit: "no visible residue", rationale: "Visual check under 1000 lux illumination" },
    ],
    status: "revalidation-due",
    approvedBy: "Dr. Rania Abdel-Aziz",
    approvedAt: daysAgo(200),
    createdBy: "Dr. Ahmed Hassan",
    createdAt: daysAgo(210),
    revalidationIntervalDays: 180,
    nextRevalidationDate: daysAgo(5),
    version: 1,
  },
  {
    id: "clp-9",
    number: "CLN-2026-009",
    title: "Mixer MX-02: Amoxicillin to Paracetamol changeover",
    equipment: "High Shear Mixer MX-02 (GEA PMA 300)",
    equipmentId: "EQ-MX-02",
    equipmentType: "mixer",
    fromProduct: "Amoxicillin 500mg Granulate",
    toProduct: "Paracetamol 500mg Granulate",
    cleaningProcedure: [
      { step: 1, instruction: "Disassemble impeller and chopper", duration: "15 min" },
      { step: 2, instruction: "Pre-rinse with purified water", duration: "10 min", agent: "Purified Water" },
      { step: 3, instruction: "Alkaline detergent wash at 60°C", duration: "20 min", agent: "CIP-100 Alkaline Detergent", concentration: "1% v/v", temperature: "60°C" },
      { step: 4, instruction: "Triple rinse with purified water", duration: "15 min", agent: "Purified Water" },
      { step: 5, instruction: "Dry at 50°C", duration: "60 min", temperature: "50°C" },
    ],
    samplingPlan: mixerSamplingPoints().map((p) => ({ ...p, id: p.id.replace("mx", "mx2") })),
    acceptanceCriteria: [
      { id: "lim-9a", method: "swab", macoMg: 2.38, acceptanceValue: 3.97, acceptanceUnit: "µg/swab", rationale: "MACO: TD=250mg, MBS=250kg, SF=0.001, MDD=1500mg (dedicated Amoxicillin consideration)", macoParams: { minTherapeuticDose: 250, maxDailyDoseNext: 1500, minBatchSizeNext: 250, sharedSurfaceArea: 35000, safetyFactor: 0.001 } },
      { id: "lim-9b", method: "rinse", macoMg: 2.38, acceptanceValue: 0.238, acceptanceUnit: "µg/mL", rationale: "Final rinse volume 10L" },
    ],
    status: "draft",
    createdBy: "Dr. Khaled Mahmoud",
    createdAt: daysAgo(5),
    revalidationIntervalDays: 180,
    version: 1,
  },
  {
    id: "clp-10",
    number: "CLN-2026-010",
    title: "Filling Line FL-02: Metformin 500mg to Paracetamol 250mg capsules",
    equipment: "Capsule Filling Line FL-02 (IMA Imatic 150)",
    equipmentId: "EQ-FL-02",
    equipmentType: "filling-line",
    fromProduct: "Metformin 500mg Capsules",
    toProduct: "Paracetamol 250mg Capsules",
    cleaningProcedure: [
      { step: 1, instruction: "Disassemble dosing components", duration: "20 min" },
      { step: 2, instruction: "Vacuum all powder residue", duration: "10 min" },
      { step: 3, instruction: "Wash with 0.5% alkaline detergent", duration: "20 min", agent: "CIP-100 Alkaline Detergent", concentration: "0.5% v/v" },
      { step: 4, instruction: "Ultrasonic clean dosing disc and pins", duration: "15 min" },
      { step: 5, instruction: "Triple rinse with purified water", duration: "15 min", agent: "Purified Water" },
      { step: 6, instruction: "Dry in clean oven at 45°C", duration: "60 min", temperature: "45°C" },
    ],
    samplingPlan: fillingLineSamplingPoints().map((p) => ({ ...p, id: p.id.replace("fl", "fl2") })),
    acceptanceCriteria: [
      { id: "lim-10a", method: "swab", macoMg: 4.44, acceptanceValue: 7.41, acceptanceUnit: "µg/swab", rationale: "MACO: TD=500mg, MBS=200kg, SF=0.001, MDD=1500mg", macoParams: { minTherapeuticDose: 500, maxDailyDoseNext: 1500, minBatchSizeNext: 200, sharedSurfaceArea: 25000, safetyFactor: 0.001 } },
      { id: "lim-10b", method: "TOC", macoMg: 4.44, acceptanceValue: 10, acceptanceUnit: "ppm", rationale: "TOC limit 10 ppm standard" },
    ],
    status: "in-progress",
    createdBy: "Dr. Youssef Kamel",
    createdAt: daysAgo(10),
    revalidationIntervalDays: 180,
    version: 1,
  },
];

/* ──────────────────────── Seed: Runs ────────────────────────────── */

function makeSamples(
  protocol: CleaningProtocol,
  passAll: boolean,
  failPointIndex?: number
): CleaningSample[] {
  return protocol.samplingPlan.map((sp, idx) => {
    const limit = protocol.acceptanceCriteria.find((c) => c.method === sp.method) || protocol.acceptanceCriteria[0];
    const shouldFail = !passAll && idx === failPointIndex;
    const result = shouldFail
      ? limit.acceptanceValue * (1.2 + Math.random() * 0.5)
      : limit.acceptanceValue * (0.1 + Math.random() * 0.6);

    return {
      id: `smp-${protocol.id}-${sp.id}-${Date.now()}-${idx}`,
      samplingPointId: sp.id,
      location: sp.label,
      method: sp.method,
      result: Math.round(result * 1000) / 1000,
      resultUnit: limit.acceptanceUnit,
      limit: limit.acceptanceValue,
      limitUnit: limit.acceptanceUnit,
      passFail: shouldFail ? "fail" as const : "pass" as const,
      sampledBy: "Pharm. Mariam Khalil",
      analyzedBy: "Dr. Rania Abdel-Aziz",
    };
  });
}

function buildRun(
  id: string,
  protocol: CleaningProtocol,
  daysOffset: number,
  operator: string,
  passAll: boolean,
  failPointIndex?: number,
  batch?: string
): CleaningRun {
  const samples = makeSamples(protocol, passAll, failPointIndex);
  const hasFail = samples.some((s) => s.passFail === "fail");
  return {
    id,
    protocolId: protocol.id,
    protocolNumber: protocol.number,
    equipment: protocol.equipment,
    equipmentType: protocol.equipmentType,
    fromProduct: protocol.fromProduct,
    toProduct: protocol.toProduct,
    runDate: daysAgo(daysOffset),
    operator,
    verifiedBy: "Dr. Laila Farouk",
    samples,
    overallResult: hasFail ? "fail" : "pass",
    status: hasFail ? "failed" : "passed",
    startedAt: daysAgo(daysOffset),
    completedAt: daysAgo(daysOffset),
    batchNumber: batch,
  };
}

const operators = [
  "Pharm. Mariam Khalil",
  "Pharm. Tarek Saad",
  "Pharm. Hana Fathy",
  "Pharm. Omar Nabil",
];

const SEED_RUNS: CleaningRun[] = [
  // Protocol 1 – Tablet Press TP-01 (4 runs, 1 failed)
  buildRun("clr-1", SEED_PROTOCOLS[0], 85, operators[0], true, undefined, "AMX-B2026-001"),
  buildRun("clr-2", SEED_PROTOCOLS[0], 60, operators[1], true, undefined, "AMX-B2026-005"),
  buildRun("clr-3", SEED_PROTOCOLS[0], 30, operators[0], false, 2, "AMX-B2026-010"),
  buildRun("clr-4", SEED_PROTOCOLS[0], 5, operators[2], true, undefined, "AMX-B2026-015"),
  // Protocol 2 – FBD-01 (3 runs, all pass)
  buildRun("clr-5", SEED_PROTOCOLS[1], 75, operators[1], true, undefined, "PCM-B2026-002"),
  buildRun("clr-6", SEED_PROTOCOLS[1], 45, operators[2], true, undefined, "PCM-B2026-008"),
  buildRun("clr-7", SEED_PROTOCOLS[1], 10, operators[0], true, undefined, "PCM-B2026-014"),
  // Protocol 3 – Coating Pan CP-01 (2 runs, all pass)
  buildRun("clr-8", SEED_PROTOCOLS[2], 65, operators[3], true, undefined, "MET-B2026-003"),
  buildRun("clr-9", SEED_PROTOCOLS[2], 20, operators[1], true, undefined, "MET-B2026-009"),
  // Protocol 4 – Mixer MX-01 (3 runs, 1 failed)
  buildRun("clr-10", SEED_PROTOCOLS[3], 55, operators[0], true, undefined, "OMP-B2026-001"),
  buildRun("clr-11", SEED_PROTOCOLS[3], 35, operators[2], false, 0, "OMP-B2026-004"),
  buildRun("clr-12", SEED_PROTOCOLS[3], 8, operators[3], true, undefined, "OMP-B2026-007"),
  // Protocol 5 – Filling Line FL-01 (2 runs, all pass)
  buildRun("clr-13", SEED_PROTOCOLS[4], 50, operators[1], true, undefined, "OMP-B2026-002"),
  buildRun("clr-14", SEED_PROTOCOLS[4], 15, operators[0], true, undefined, "OMP-B2026-006"),
  // Protocol 6 – Tablet Press TP-02 (2 runs, 1 failed)
  buildRun("clr-15", SEED_PROTOCOLS[5], 40, operators[2], true, undefined, "PCM-B2026-004"),
  buildRun("clr-16", SEED_PROTOCOLS[5], 12, operators[3], false, 4, "PCM-B2026-011"),
  // Protocol 7 – FBD-02 (1 run, pass)
  buildRun("clr-17", SEED_PROTOCOLS[6], 25, operators[0], true, undefined, "IBU-B2026-001"),
  // Protocol 8 – Coating Pan CP-02 (revalidation due, 1 old run)
  buildRun("clr-18", SEED_PROTOCOLS[7], 190, operators[1], true, undefined, "IBU-B2026-002"),
  // Protocol 3 – extra recent run
  buildRun("clr-19", SEED_PROTOCOLS[2], 3, operators[2], true, undefined, "MET-B2026-015"),
  // Protocol 5 – extra recent run
  buildRun("clr-20", SEED_PROTOCOLS[4], 2, operators[3], true, undefined, "OMP-B2026-009"),
];

/* ──────────────────── Storage Shape ─────────────────────────────── */

interface CleaningStoreData {
  protocols: CleaningProtocol[];
  runs: CleaningRun[];
}

/* ──────────────────────── Store Class ───────────────────────────── */

class CleaningValidationStore {
  private static instance: CleaningValidationStore;

  private constructor() {
    this.seed();
  }

  static getInstance(): CleaningValidationStore {
    if (!CleaningValidationStore.instance) {
      CleaningValidationStore.instance = new CleaningValidationStore();
    }
    return CleaningValidationStore.instance;
  }

  private seed(): void {
    if (typeof window === "undefined") return;
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      const data: CleaningStoreData = {
        protocols: SEED_PROTOCOLS,
        runs: SEED_RUNS,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }

  private load(): CleaningStoreData {
    if (typeof window === "undefined") return { protocols: [], runs: [] };
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CleaningStoreData) : { protocols: [], runs: [] };
  }

  private save(data: CleaningStoreData): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /* ─── Protocol CRUD ─── */

  getAllProtocols(): CleaningProtocol[] {
    return this.load().protocols;
  }

  getProtocolById(id: string): CleaningProtocol | undefined {
    return this.load().protocols.find((p) => p.id === id);
  }

  createProtocol(protocol: Omit<CleaningProtocol, "id" | "number">): CleaningProtocol {
    const data = this.load();
    const newProtocol: CleaningProtocol = {
      ...protocol,
      id: `clp-${Date.now()}`,
      number: this.generateProtocolNumber(),
    };
    data.protocols.push(newProtocol);
    this.save(data);
    return newProtocol;
  }

  updateProtocol(id: string, updates: Partial<CleaningProtocol>): CleaningProtocol | undefined {
    const data = this.load();
    const idx = data.protocols.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    data.protocols[idx] = { ...data.protocols[idx], ...updates };
    this.save(data);
    return data.protocols[idx];
  }

  deleteProtocol(id: string): boolean {
    const data = this.load();
    const idx = data.protocols.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    data.protocols.splice(idx, 1);
    this.save(data);
    return true;
  }

  getProtocolsByEquipment(equipmentType: EquipmentType): CleaningProtocol[] {
    return this.load().protocols.filter((p) => p.equipmentType === equipmentType);
  }

  getProtocolsByStatus(status: CleaningStatus): CleaningProtocol[] {
    return this.load().protocols.filter((p) => p.status === status);
  }

  getDueForRevalidation(): CleaningProtocol[] {
    const now = new Date();
    return this.load().protocols.filter((p) => {
      if (!p.nextRevalidationDate) return false;
      return new Date(p.nextRevalidationDate) <= now || p.status === "revalidation-due";
    });
  }

  generateProtocolNumber(): string {
    const all = this.load().protocols;
    const year = new Date().getFullYear();
    const prefix = `CLN-${year}-`;
    const existing = all
      .filter((p) => p.number.startsWith(prefix))
      .map((p) => parseInt(p.number.replace(prefix, ""), 10))
      .filter((n) => !isNaN(n));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `${prefix}${String(next).padStart(3, "0")}`;
  }

  /* ─── Run CRUD ─── */

  getAllRuns(): CleaningRun[] {
    return this.load().runs;
  }

  getRunById(id: string): CleaningRun | undefined {
    return this.load().runs.find((r) => r.id === id);
  }

  getRunsByProtocol(protocolId: string): CleaningRun[] {
    return this.load().runs.filter((r) => r.protocolId === protocolId);
  }

  getRunsByEquipment(equipmentType: EquipmentType): CleaningRun[] {
    return this.load().runs.filter((r) => r.equipmentType === equipmentType);
  }

  getRunsByStatus(status: CleaningStatus): CleaningRun[] {
    return this.load().runs.filter((r) => r.status === status);
  }

  createRun(run: Omit<CleaningRun, "id">): CleaningRun {
    const data = this.load();
    const newRun: CleaningRun = {
      ...run,
      id: `clr-${Date.now()}`,
    };
    data.runs.push(newRun);
    this.save(data);
    return newRun;
  }

  updateRun(id: string, updates: Partial<CleaningRun>): CleaningRun | undefined {
    const data = this.load();
    const idx = data.runs.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    data.runs[idx] = { ...data.runs[idx], ...updates };
    this.save(data);
    return data.runs[idx];
  }

  /* ─── MACO Calculation ─── */

  calculateMACO(params: MACOParams): { macoMg: number; perAreaMgCm2: number } {
    const macoMg = calculateMACO(params);
    const perAreaMgCm2 = calculatePerAreaLimit(macoMg, params.sharedSurfaceArea);
    return { macoMg, perAreaMgCm2 };
  }

  /* ─── Metrics ─── */

  getMetrics(): CleaningMetrics {
    const data = this.load();
    const protocols = data.protocols;
    const runs = data.runs;

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const activeProtocols = protocols.filter((p) =>
      ["approved", "in-progress", "revalidation-due"].includes(p.status)
    ).length;

    const runsThisMonth = runs.filter(
      (r) => new Date(r.runDate) >= thisMonthStart
    ).length;

    const completedRuns = runs.filter((r) => r.overallResult !== "pending");
    const passedRuns = completedRuns.filter((r) => r.overallResult === "pass");
    const passRate = completedRuns.length > 0
      ? Math.round((passedRuns.length / completedRuns.length) * 100)
      : 100;

    const dueForRevalidation = protocols.filter((p) => {
      if (!p.nextRevalidationDate) return false;
      return new Date(p.nextRevalidationDate) <= now || p.status === "revalidation-due";
    }).length;

    const failedRuns = runs.filter((r) => r.overallResult === "fail").length;

    // Pass rate by equipment
    const eqMap = new Map<string, { pass: number; total: number }>();
    completedRuns.forEach((r) => {
      const key = r.equipment;
      const cur = eqMap.get(key) || { pass: 0, total: 0 };
      cur.total++;
      if (r.overallResult === "pass") cur.pass++;
      eqMap.set(key, cur);
    });
    const passByEquipment = Array.from(eqMap.entries()).map(([equipment, v]) => ({
      equipment,
      passRate: Math.round((v.pass / v.total) * 100),
      total: v.total,
    }));

    // Failure frequency by sampling point
    const pointMap = new Map<string, { failures: number; total: number }>();
    runs.forEach((r) => {
      r.samples.forEach((s) => {
        const key = s.location;
        const cur = pointMap.get(key) || { failures: 0, total: 0 };
        cur.total++;
        if (s.passFail === "fail") cur.failures++;
        pointMap.set(key, cur);
      });
    });
    const failuresByPoint = Array.from(pointMap.entries())
      .map(([point, v]) => ({ point, failures: v.failures, total: v.total }))
      .filter((p) => p.failures > 0)
      .sort((a, b) => b.failures - a.failures);

    // Monthly trend (last 6 months)
    const monthlyTrend: CleaningMetrics["monthlyTrend"] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const monthRuns = runs.filter((r) => {
        const rd = new Date(r.runDate);
        return rd >= monthStart && rd <= monthEnd;
      });
      const monthLabel = monthStart.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      monthlyTrend.push({
        month: monthLabel,
        runs: monthRuns.length,
        passed: monthRuns.filter((r) => r.overallResult === "pass").length,
        failed: monthRuns.filter((r) => r.overallResult === "fail").length,
      });
    }

    // Revalidation schedule
    const revalidationSchedule = protocols
      .filter((p) => p.nextRevalidationDate)
      .map((p) => ({
        protocolNumber: p.number,
        equipment: p.equipment,
        dueDate: p.nextRevalidationDate!,
        daysUntilDue: daysBetween(now.toISOString(), p.nextRevalidationDate!),
      }))
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

    return {
      totalProtocols: protocols.length,
      activeProtocols,
      runsThisMonth,
      passRate,
      dueForRevalidation,
      failedRuns,
      passByEquipment,
      failuresByPoint,
      monthlyTrend,
      revalidationSchedule,
    };
  }
}

export const cleaningStore = CleaningValidationStore.getInstance();
