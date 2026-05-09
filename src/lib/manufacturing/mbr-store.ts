"use client";

import type {
  MasterBatchRecord,
  BatchProductionRecord,
  MBRStep,
  MBRFormulation,
  MBRIngredient,
  BPRStepExecution,
  BPRParameterValue,
  BPRMaterialUsage,
  VarianceRecord,
  YieldReconciliation,
  MBRMetrics,
  MBRStatus,
  BPRStatus,
  ProcessParameter,
  OperationType,
  IngredientRole,
} from "./mbr-types";

const STORAGE_KEY = "pharma.manufacturing-records";

// ── Helpers ───────────────────────────────────────────────────────
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

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function param(name: string, target: number, unit: string, tol: number): ProcessParameter {
  return { name, targetValue: target, unit, tolerancePercent: tol };
}

function ingredient(
  name: string,
  code: string,
  role: IngredientRole,
  qty: number,
  unit: string,
  pct: number
): MBRIngredient {
  return { id: uid("ing"), materialName: name, materialCode: code, role, theoreticalQuantity: qty, unit, percentageOfBatch: pct };
}

function step(
  num: number,
  op: OperationType,
  desc: string,
  equip: string,
  params: ProcessParameter[],
  critical: boolean = false,
  dur?: string
): MBRStep {
  return { id: `step-${num}`, stepNumber: num, operation: op, description: desc, equipment: equip, parameters: params, criticalStep: critical, estimatedDuration: dur };
}

function actualVal(
  paramName: string,
  target: number,
  actual: number,
  unit: string,
  tol: number
): BPRParameterValue {
  const variance = Math.abs(((actual - target) / target) * 100);
  return { parameterName: paramName, targetValue: target, actualValue: actual, unit, tolerancePercent: tol, withinTolerance: variance <= tol };
}

// ── Seed MBRs ─────────────────────────────────────────────────────

const SEED_MBRS: MasterBatchRecord[] = [
  // 1. Amoxicillin 500mg Capsules
  {
    id: "mbr-1",
    number: "MBR-2025-001",
    product: "Amoxicillin 500mg Capsules",
    dosageForm: "Hard Gelatin Capsule",
    strength: "500mg",
    approvedBatchSize: 100000,
    batchSizeUnit: "capsules",
    version: 3,
    edaApprovalDate: "2025-01-15",
    status: "approved",
    createdAt: daysAgo(400),
    createdBy: "Dr. Ahmed Hassan",
    approvedBy: "Dr. Laila Farouk",
    steps: [
      step(1, "weighing", "Weigh and verify all raw materials per formulation table", "Mettler Toledo XPR64001L", [param("Room Temperature", 22, "°C", 5), param("Room Humidity", 45, "%RH", 10)], true, "45 min"),
      step(2, "sieving", "Sieve Amoxicillin trihydrate through 30-mesh screen", "Vibro Sifter VS-30", [param("Screen Size", 600, "μm", 0), param("Sieving Time", 15, "min", 10)]),
      step(3, "blending", "Blend API with excipients in V-blender for homogeneity", "Patterson-Kelley V-Blender 100L", [param("Blending Speed", 25, "rpm", 10), param("Blending Time", 20, "min", 5), param("Blend Uniformity", 100, "%RSD ≤5", 5)], true, "30 min"),
      step(4, "encapsulation", "Fill blended powder into size 0 hard gelatin capsules", "Bosch GKF 2500", [param("Fill Weight", 580, "mg", 3), param("Machine Speed", 2000, "caps/min", 10), param("Weight Variation", 580, "mg ±5%", 5)], true, "120 min"),
      step(5, "ipc-testing", "Perform in-process checks: weight variation, disintegration", "Dissolution tester", [param("Disintegration Time", 15, "min max", 20), param("Individual Weight", 580, "mg", 5)]),
      step(6, "packaging", "Blister pack capsules in Al/PVC blisters, 10 caps per strip", "Uhlmann UPS 4", [param("Seal Temperature", 180, "°C", 3), param("Seal Pressure", 4, "bar", 5)], false, "180 min"),
    ],
    formulation: {
      id: "form-1",
      mbrId: "mbr-1",
      totalBatchWeight: 58000,
      unit: "g",
      ingredients: [
        ingredient("Amoxicillin Trihydrate", "RM-AMX-001", "API", 57500, "g", 57.5),
        ingredient("Magnesium Stearate", "RM-MGS-003", "excipient", 290, "g", 0.5),
        ingredient("Sodium Starch Glycolate", "RM-SSG-002", "excipient", 2900, "g", 5.0),
        ingredient("Microcrystalline Cellulose PH-102", "RM-MCC-001", "excipient", 14500, "g", 25.0),
        ingredient("Talc", "RM-TLC-001", "excipient", 2900, "g", 5.0),
        ingredient("Hard Gelatin Capsule Shell Size 0", "PM-CAP-001", "packaging", 100000, "pcs", 0),
      ],
    },
    shelfLife: "24 months",
    storageConditions: "Store below 25°C in a dry place",
  },

  // 2. Omeprazole 20mg Tablets
  {
    id: "mbr-2",
    number: "MBR-2025-002",
    product: "Omeprazole 20mg Tablets",
    dosageForm: "Enteric-Coated Tablet",
    strength: "20mg",
    approvedBatchSize: 200000,
    batchSizeUnit: "tablets",
    version: 2,
    edaApprovalDate: "2025-03-20",
    status: "approved",
    createdAt: daysAgo(350),
    createdBy: "Dr. Ahmed Hassan",
    approvedBy: "Dr. Laila Farouk",
    steps: [
      step(1, "weighing", "Weigh all raw materials and record weights", "Mettler Toledo XPR64001L", [param("Room Temperature", 22, "°C", 5), param("Room Humidity", 40, "%RH", 12)], true, "60 min"),
      step(2, "granulation", "Wet granulation of API with binder solution", "Diosna P250 High-Shear Granulator", [param("Impeller Speed", 150, "rpm", 5), param("Chopper Speed", 1500, "rpm", 5), param("Granulation Time", 8, "min", 10), param("Binder Addition Rate", 120, "mL/min", 8)], true, "45 min"),
      step(3, "drying", "Dry granules in fluid bed dryer to target LOD", "Glatt GPCG 60", [param("Inlet Temperature", 55, "°C", 5), param("Drying Time", 45, "min", 10), param("LOD Target", 2.5, "%", 20)], true, "60 min"),
      step(4, "blending", "Final blend with lubricant", "Bohle PM 400 Bin Blender", [param("Blending Speed", 15, "rpm", 10), param("Blending Time", 10, "min", 10)], false, "15 min"),
      step(5, "compression", "Compress into tablet cores", "Fette 3090i Tablet Press", [param("Tablet Weight", 350, "mg", 3), param("Hardness", 80, "N", 15), param("Thickness", 4.2, "mm", 5), param("Friability", 0.5, "% max", 20)], true, "240 min"),
      step(6, "coating", "Apply enteric coating (Eudragit L30D-55)", "O'Hara Labcoat II", [param("Coating Weight Gain", 8, "%", 10), param("Inlet Temperature", 42, "°C", 5), param("Pan Speed", 10, "rpm", 10)], true, "180 min"),
      step(7, "packaging", "Blister pack tablets, Al/Al cold-form", "Uhlmann UPS 4", [param("Seal Temperature", 200, "°C", 3), param("Seal Pressure", 5, "bar", 5)], false, "240 min"),
    ],
    formulation: {
      id: "form-2",
      mbrId: "mbr-2",
      totalBatchWeight: 70000,
      unit: "g",
      ingredients: [
        ingredient("Omeprazole Pellets 8.5%", "RM-OMP-001", "API", 4000, "g", 5.71),
        ingredient("Microcrystalline Cellulose PH-101", "RM-MCC-002", "excipient", 28000, "g", 40.0),
        ingredient("Lactose Monohydrate", "RM-LAC-001", "excipient", 24000, "g", 34.29),
        ingredient("Croscarmellose Sodium", "RM-CCS-001", "excipient", 7000, "g", 10.0),
        ingredient("Povidone K30", "RM-PVP-001", "excipient", 3500, "g", 5.0),
        ingredient("Magnesium Stearate", "RM-MGS-003", "excipient", 700, "g", 1.0),
        ingredient("Eudragit L30D-55", "RM-EUD-001", "coating", 2800, "g", 4.0),
      ],
    },
    shelfLife: "36 months",
    storageConditions: "Store below 25°C, protect from moisture",
  },

  // 3. Metformin 850mg Tablets
  {
    id: "mbr-3",
    number: "MBR-2025-003",
    product: "Metformin 850mg Tablets",
    dosageForm: "Film-Coated Tablet",
    strength: "850mg",
    approvedBatchSize: 150000,
    batchSizeUnit: "tablets",
    version: 4,
    edaApprovalDate: "2025-02-10",
    status: "approved",
    createdAt: daysAgo(380),
    createdBy: "Dr. Nadia Soliman",
    approvedBy: "Dr. Laila Farouk",
    steps: [
      step(1, "weighing", "Weigh and verify Metformin HCl and excipients", "Mettler Toledo XPR64001L", [param("Room Temperature", 22, "°C", 5), param("Room Humidity", 40, "%RH", 12)], true, "60 min"),
      step(2, "granulation", "Wet granulation with purified water as binder", "Diosna P250 High-Shear Granulator", [param("Impeller Speed", 180, "rpm", 5), param("Chopper Speed", 1800, "rpm", 5), param("Granulation Time", 10, "min", 10)], true, "30 min"),
      step(3, "drying", "Fluid bed drying to target moisture content", "Glatt GPCG 60", [param("Inlet Temperature", 60, "°C", 5), param("Drying Time", 50, "min", 10), param("LOD Target", 2.0, "%", 25)], true, "65 min"),
      step(4, "sieving", "Pass dried granules through 20-mesh screen", "Comil U20", [param("Screen Size", 850, "μm", 0), param("Mill Speed", 1200, "rpm", 8)]),
      step(5, "blending", "Final lubrication blend", "Bohle PM 400 Bin Blender", [param("Blending Speed", 12, "rpm", 10), param("Blending Time", 5, "min", 10)], false, "10 min"),
      step(6, "compression", "Compress into oblong tablets", "Fette 3090i Tablet Press", [param("Tablet Weight", 1000, "mg", 2), param("Hardness", 120, "N", 10), param("Thickness", 6.8, "mm", 3), param("Friability", 0.3, "% max", 20)], true, "300 min"),
      step(7, "coating", "Apply Opadry II white film coat", "O'Hara Labcoat II", [param("Coating Weight Gain", 3, "%", 15), param("Inlet Temperature", 45, "°C", 5), param("Pan Speed", 12, "rpm", 10)], false, "120 min"),
    ],
    formulation: {
      id: "form-3",
      mbrId: "mbr-3",
      totalBatchWeight: 150000,
      unit: "g",
      ingredients: [
        ingredient("Metformin Hydrochloride", "RM-MET-001", "API", 127500, "g", 85.0),
        ingredient("Povidone K30", "RM-PVP-001", "excipient", 6000, "g", 4.0),
        ingredient("Magnesium Stearate", "RM-MGS-003", "excipient", 1500, "g", 1.0),
        ingredient("Microcrystalline Cellulose PH-102", "RM-MCC-001", "excipient", 7500, "g", 5.0),
        ingredient("Crospovidone", "RM-CPV-001", "excipient", 3000, "g", 2.0),
        ingredient("Opadry II White", "RM-OPD-002", "coating", 4500, "g", 3.0),
      ],
    },
    shelfLife: "36 months",
    storageConditions: "Store below 30°C",
  },

  // 4. Paracetamol 500mg Tablets
  {
    id: "mbr-4",
    number: "MBR-2025-004",
    product: "Paracetamol 500mg Tablets",
    dosageForm: "Uncoated Tablet",
    strength: "500mg",
    approvedBatchSize: 300000,
    batchSizeUnit: "tablets",
    version: 5,
    edaApprovalDate: "2024-11-05",
    status: "approved",
    createdAt: daysAgo(500),
    createdBy: "Dr. Khaled Mahmoud",
    approvedBy: "Dr. Laila Farouk",
    steps: [
      step(1, "weighing", "Weigh Paracetamol and all excipients per formulation", "Mettler Toledo XPR64001L", [param("Room Temperature", 22, "°C", 5), param("Room Humidity", 45, "%RH", 10)], true, "45 min"),
      step(2, "granulation", "Wet granulation with starch paste", "Diosna P250 High-Shear Granulator", [param("Impeller Speed", 160, "rpm", 5), param("Chopper Speed", 1600, "rpm", 5), param("Granulation Time", 7, "min", 10)], true, "25 min"),
      step(3, "drying", "Fluid bed dry to target LOD", "Glatt GPCG 60", [param("Inlet Temperature", 58, "°C", 5), param("Drying Time", 40, "min", 10), param("LOD Target", 2.0, "%", 25)], true, "50 min"),
      step(4, "blending", "Final blend with lubricant and glidant", "Bohle PM 400 Bin Blender", [param("Blending Speed", 15, "rpm", 10), param("Blending Time", 8, "min", 10)], false, "12 min"),
      step(5, "compression", "Compress into round flat tablets with breakline", "Fette 3090i Tablet Press", [param("Tablet Weight", 600, "mg", 3), param("Hardness", 70, "N", 15), param("Thickness", 4.5, "mm", 5), param("Friability", 0.5, "% max", 20)], true, "200 min"),
      step(6, "packaging", "Strip pack in Al/PE strips, 10 tablets per strip", "SaintyCo DPP-250", [param("Seal Temperature", 170, "°C", 3), param("Seal Pressure", 3.5, "bar", 5)], false, "300 min"),
    ],
    formulation: {
      id: "form-4",
      mbrId: "mbr-4",
      totalBatchWeight: 180000,
      unit: "g",
      ingredients: [
        ingredient("Paracetamol DC 90%", "RM-PCM-001", "API", 150000, "g", 83.33),
        ingredient("Maize Starch", "RM-MST-001", "excipient", 14400, "g", 8.0),
        ingredient("Povidone K30", "RM-PVP-001", "excipient", 5400, "g", 3.0),
        ingredient("Stearic Acid", "RM-STA-001", "excipient", 3600, "g", 2.0),
        ingredient("Colloidal Silicon Dioxide", "RM-CSD-001", "excipient", 1800, "g", 1.0),
        ingredient("Sodium Starch Glycolate", "RM-SSG-002", "excipient", 4800, "g", 2.67),
      ],
    },
    shelfLife: "36 months",
    storageConditions: "Store below 30°C, protect from light",
  },

  // 5. Losartan 50mg Tablets
  {
    id: "mbr-5",
    number: "MBR-2025-005",
    product: "Losartan 50mg Tablets",
    dosageForm: "Film-Coated Tablet",
    strength: "50mg",
    approvedBatchSize: 250000,
    batchSizeUnit: "tablets",
    version: 2,
    edaApprovalDate: "2025-06-01",
    status: "approved",
    createdAt: daysAgo(300),
    createdBy: "Dr. Ahmed Hassan",
    approvedBy: "Dr. Laila Farouk",
    steps: [
      step(1, "weighing", "Weigh Losartan Potassium and excipients", "Mettler Toledo XPR64001L", [param("Room Temperature", 22, "°C", 5), param("Room Humidity", 40, "%RH", 12)], true, "45 min"),
      step(2, "blending", "Pre-blend API with filler in diffusion blender", "Patterson-Kelley V-Blender 100L", [param("Blending Speed", 20, "rpm", 10), param("Blending Time", 15, "min", 10), param("Blend Uniformity", 100, "%RSD ≤3", 3)], true, "20 min"),
      step(3, "granulation", "Dry granulation via roller compaction", "Fitzpatrick CCS-220 Roller Compactor", [param("Roll Pressure", 50, "bar", 5), param("Roll Speed", 5, "rpm", 10), param("Ribbon Density", 0.75, "g/cm³", 8)], true, "60 min"),
      step(4, "blending", "Final lubrication blend", "Bohle PM 400 Bin Blender", [param("Blending Speed", 12, "rpm", 10), param("Blending Time", 3, "min", 10)], false, "5 min"),
      step(5, "compression", "Compress into round biconvex tablets", "Fette 3090i Tablet Press", [param("Tablet Weight", 200, "mg", 3), param("Hardness", 60, "N", 15), param("Thickness", 3.5, "mm", 5)], true, "200 min"),
      step(6, "coating", "Apply Opadry II green film coat", "O'Hara Labcoat II", [param("Coating Weight Gain", 3, "%", 15), param("Inlet Temperature", 43, "°C", 5), param("Pan Speed", 11, "rpm", 10)], false, "90 min"),
      step(7, "packaging", "Blister pack in PVC/Al blisters, 10 tablets", "Uhlmann UPS 4", [param("Seal Temperature", 185, "°C", 3), param("Seal Pressure", 4.5, "bar", 5)], false, "200 min"),
    ],
    formulation: {
      id: "form-5",
      mbrId: "mbr-5",
      totalBatchWeight: 50000,
      unit: "g",
      ingredients: [
        ingredient("Losartan Potassium", "RM-LOS-001", "API", 12500, "g", 25.0),
        ingredient("Microcrystalline Cellulose PH-102", "RM-MCC-001", "excipient", 20000, "g", 40.0),
        ingredient("Lactose Monohydrate", "RM-LAC-001", "excipient", 10000, "g", 20.0),
        ingredient("Croscarmellose Sodium", "RM-CCS-001", "excipient", 3750, "g", 7.5),
        ingredient("Magnesium Stearate", "RM-MGS-003", "excipient", 500, "g", 1.0),
        ingredient("Hydroxypropyl Cellulose", "RM-HPC-001", "excipient", 1750, "g", 3.5),
        ingredient("Opadry II Green", "RM-OPD-003", "coating", 1500, "g", 3.0),
      ],
    },
    shelfLife: "24 months",
    storageConditions: "Store below 25°C, protect from moisture and light",
  },
];

// ── Seed BPRs ─────────────────────────────────────────────────────

function buildStepExecution(
  bprId: string,
  mbrStep: MBRStep,
  daysOffset: number,
  operator: string,
  equipId: string,
  varianceFactors?: number[]
): BPRStepExecution {
  const actualValues: BPRParameterValue[] = mbrStep.parameters.map((p, i) => {
    const factor = varianceFactors?.[i] ?? (0.97 + Math.random() * 0.06);
    const actual = Math.round(p.targetValue * factor * 100) / 100;
    return actualVal(p.name, p.targetValue, actual, p.unit, p.tolerancePercent);
  });
  const hasDeviation = actualValues.some((v) => !v.withinTolerance);
  return {
    id: uid("exec"),
    bprId,
    mbrStepId: mbrStep.id,
    stepNumber: mbrStep.stepNumber,
    operation: mbrStep.operation,
    actualValues,
    operator,
    verifiedBy: "Dr. Laila Farouk",
    timestamp: daysAgo(daysOffset),
    endTimestamp: daysAgo(daysOffset),
    equipmentId: equipId,
    equipmentName: mbrStep.equipment,
    deviationFlag: hasDeviation,
    deviationId: hasDeviation ? `DEV-2026-${Math.floor(Math.random() * 100 + 1).toString().padStart(3, "0")}` : undefined,
  };
}

function buildMaterialUsage(
  bprId: string,
  ing: MBRIngredient,
  daysOffset: number,
  varianceFactor?: number
): BPRMaterialUsage {
  const factor = varianceFactor ?? (0.995 + Math.random() * 0.01);
  const actual = Math.round(ing.theoreticalQuantity * factor * 100) / 100;
  const varianceP = Math.round(((actual - ing.theoreticalQuantity) / ing.theoreticalQuantity) * 100 * 100) / 100;
  return {
    id: uid("mat"),
    bprId,
    ingredientId: ing.id,
    materialName: ing.materialName,
    materialCode: ing.materialCode,
    role: ing.role,
    theoreticalQuantity: ing.theoreticalQuantity,
    actualQuantity: actual,
    unit: ing.unit,
    batchNumber: `B-${2026}-${Math.floor(Math.random() * 900 + 100)}`,
    lotNumber: `L-${Math.floor(Math.random() * 9000 + 1000)}`,
    dispensedBy: "Pharm. Mariam Khalil",
    verifiedBy: "Pharm. Sara Ahmed",
    dispensedAt: daysAgo(daysOffset),
    variancePercent: varianceP,
    withinTolerance: Math.abs(varianceP) <= 1.0,
  };
}

function buildYield(
  theoretical: number,
  yieldPct: number,
  unit: string,
  rejected: number,
  sampled: number
): YieldReconciliation {
  const actual = Math.round(theoretical * (yieldPct / 100));
  return {
    theoreticalYield: theoretical,
    actualYield: actual,
    yieldPercent: yieldPct,
    unit,
    acceptableRangeMin: 95,
    acceptableRangeMax: 102,
    reconciliationStatus: yieldPct >= 95 ? "pass" : yieldPct >= 90 ? "investigation" : "fail",
    materialBalance: Math.round(((actual + rejected + sampled) / theoretical) * 100 * 10) / 10,
    rejectedQuantity: rejected,
    sampledQuantity: sampled,
    reconciledBy: "Dr. Laila Farouk",
    reconciledAt: daysAgo(1),
  };
}

const operators = [
  "Pharm. Omar Fathy",
  "Pharm. Mariam Khalil",
  "Tech. Hassan Ali",
  "Pharm. Sara Ahmed",
  "Tech. Mostafa Gamal",
];

const SEED_BPRS: BatchProductionRecord[] = [
  // ── 3 Released (completed) ──
  {
    id: "bpr-1",
    number: "BPR-2026-001",
    mbrId: "mbr-1",
    mbrNumber: "MBR-2025-001",
    product: "Amoxicillin 500mg Capsules",
    batchNumber: "AMX-2026-001",
    batchSize: 100000,
    batchSizeUnit: "capsules",
    startDate: daysAgo(30),
    endDate: daysAgo(28),
    status: "released",
    createdAt: daysAgo(32),
    createdBy: "Dr. Youssef Kamel",
    productionLine: "Capsule Line 1",
    stepExecutions: SEED_MBRS[0].steps.map((s, i) =>
      buildStepExecution("bpr-1", s, 30 - i, operators[i % operators.length], `EQ-CL1-${s.stepNumber.toString().padStart(3, "0")}`)
    ),
    materialUsage: SEED_MBRS[0].formulation.ingredients.map((ing) =>
      buildMaterialUsage("bpr-1", ing, 30)
    ),
    yieldReconciliation: buildYield(100000, 98.2, "capsules", 800, 200),
    releasedBy: "Dr. Laila Farouk",
    releasedAt: daysAgo(25),
  },
  {
    id: "bpr-2",
    number: "BPR-2026-002",
    mbrId: "mbr-2",
    mbrNumber: "MBR-2025-002",
    product: "Omeprazole 20mg Tablets",
    batchNumber: "OMP-2026-001",
    batchSize: 200000,
    batchSizeUnit: "tablets",
    startDate: daysAgo(25),
    endDate: daysAgo(22),
    status: "released",
    createdAt: daysAgo(27),
    createdBy: "Dr. Youssef Kamel",
    productionLine: "Tablet Line 2",
    stepExecutions: SEED_MBRS[1].steps.map((s, i) =>
      buildStepExecution("bpr-2", s, 25 - i, operators[i % operators.length], `EQ-TL2-${s.stepNumber.toString().padStart(3, "0")}`)
    ),
    materialUsage: SEED_MBRS[1].formulation.ingredients.map((ing) =>
      buildMaterialUsage("bpr-2", ing, 25)
    ),
    yieldReconciliation: buildYield(200000, 97.5, "tablets", 2500, 500),
    releasedBy: "Dr. Laila Farouk",
    releasedAt: daysAgo(19),
  },
  {
    id: "bpr-3",
    number: "BPR-2026-003",
    mbrId: "mbr-4",
    mbrNumber: "MBR-2025-004",
    product: "Paracetamol 500mg Tablets",
    batchNumber: "PCM-2026-001",
    batchSize: 300000,
    batchSizeUnit: "tablets",
    startDate: daysAgo(20),
    endDate: daysAgo(17),
    status: "released",
    createdAt: daysAgo(22),
    createdBy: "Dr. Khaled Mahmoud",
    productionLine: "Tablet Line 1",
    stepExecutions: SEED_MBRS[3].steps.map((s, i) =>
      buildStepExecution("bpr-3", s, 20 - i, operators[i % operators.length], `EQ-TL1-${s.stepNumber.toString().padStart(3, "0")}`)
    ),
    materialUsage: SEED_MBRS[3].formulation.ingredients.map((ing) =>
      buildMaterialUsage("bpr-3", ing, 20)
    ),
    yieldReconciliation: buildYield(300000, 99.1, "tablets", 1500, 600),
    releasedBy: "Dr. Laila Farouk",
    releasedAt: daysAgo(14),
  },

  // ── 2 In-Progress ──
  {
    id: "bpr-4",
    number: "BPR-2026-004",
    mbrId: "mbr-3",
    mbrNumber: "MBR-2025-003",
    product: "Metformin 850mg Tablets",
    batchNumber: "MET-2026-001",
    batchSize: 150000,
    batchSizeUnit: "tablets",
    startDate: daysAgo(3),
    status: "processing",
    createdAt: daysAgo(5),
    createdBy: "Dr. Youssef Kamel",
    productionLine: "Tablet Line 2",
    stepExecutions: SEED_MBRS[2].steps.slice(0, 4).map((s, i) =>
      buildStepExecution("bpr-4", s, 3 - i, operators[i % operators.length], `EQ-TL2-${s.stepNumber.toString().padStart(3, "0")}`)
    ),
    materialUsage: SEED_MBRS[2].formulation.ingredients.map((ing) =>
      buildMaterialUsage("bpr-4", ing, 3)
    ),
  },
  {
    id: "bpr-5",
    number: "BPR-2026-005",
    mbrId: "mbr-5",
    mbrNumber: "MBR-2025-005",
    product: "Losartan 50mg Tablets",
    batchNumber: "LOS-2026-001",
    batchSize: 250000,
    batchSizeUnit: "tablets",
    startDate: daysAgo(1),
    status: "weighing",
    createdAt: daysAgo(2),
    createdBy: "Dr. Youssef Kamel",
    productionLine: "Tablet Line 3",
    stepExecutions: SEED_MBRS[4].steps.slice(0, 1).map((s, i) =>
      buildStepExecution("bpr-5", s, 1, operators[0], `EQ-TL3-${s.stepNumber.toString().padStart(3, "0")}`)
    ),
    materialUsage: SEED_MBRS[4].formulation.ingredients.slice(0, 3).map((ing) =>
      buildMaterialUsage("bpr-5", ing, 1)
    ),
  },

  // ── 1 QA Review ──
  {
    id: "bpr-6",
    number: "BPR-2026-006",
    mbrId: "mbr-1",
    mbrNumber: "MBR-2025-001",
    product: "Amoxicillin 500mg Capsules",
    batchNumber: "AMX-2026-002",
    batchSize: 100000,
    batchSizeUnit: "capsules",
    startDate: daysAgo(10),
    endDate: daysAgo(8),
    status: "qa-release",
    createdAt: daysAgo(12),
    createdBy: "Dr. Youssef Kamel",
    productionLine: "Capsule Line 1",
    stepExecutions: SEED_MBRS[0].steps.map((s, i) =>
      buildStepExecution("bpr-6", s, 10 - i, operators[i % operators.length], `EQ-CL1-${s.stepNumber.toString().padStart(3, "0")}`)
    ),
    materialUsage: SEED_MBRS[0].formulation.ingredients.map((ing) =>
      buildMaterialUsage("bpr-6", ing, 10)
    ),
    yieldReconciliation: buildYield(100000, 97.8, "capsules", 1000, 300),
  },

  // ── 1 Rejected (out-of-tolerance compression, high friability) ──
  {
    id: "bpr-7",
    number: "BPR-2026-007",
    mbrId: "mbr-2",
    mbrNumber: "MBR-2025-002",
    product: "Omeprazole 20mg Tablets",
    batchNumber: "OMP-2026-002",
    batchSize: 200000,
    batchSizeUnit: "tablets",
    startDate: daysAgo(15),
    endDate: daysAgo(12),
    status: "rejected",
    createdAt: daysAgo(17),
    createdBy: "Dr. Youssef Kamel",
    productionLine: "Tablet Line 2",
    stepExecutions: SEED_MBRS[1].steps.map((s, i) => {
      // Intentionally bad compression and coating for rejection scenario
      if (s.operation === "compression") {
        return buildStepExecution("bpr-7", s, 14, operators[2], `EQ-TL2-${s.stepNumber.toString().padStart(3, "0")}`, [1.08, 0.75, 1.12, 1.6]);
      }
      if (s.operation === "coating") {
        return buildStepExecution("bpr-7", s, 13, operators[3], `EQ-TL2-${s.stepNumber.toString().padStart(3, "0")}`, [0.82, 1.08, 0.88]);
      }
      return buildStepExecution("bpr-7", s, 15 - i, operators[i % operators.length], `EQ-TL2-${s.stepNumber.toString().padStart(3, "0")}`);
    }),
    materialUsage: SEED_MBRS[1].formulation.ingredients.map((ing) =>
      buildMaterialUsage("bpr-7", ing, 15)
    ),
    yieldReconciliation: buildYield(200000, 86.3, "tablets", 18000, 500),
    rejectedBy: "Dr. Laila Farouk",
    rejectedAt: daysAgo(10),
    rejectionReason: "Compression parameters out of tolerance (hardness 60N vs 80N target). Coating weight gain below specification. Friability test failed at 0.8% vs 0.5% max.",
  },

  // ── 1 Planned ──
  {
    id: "bpr-8",
    number: "BPR-2026-008",
    mbrId: "mbr-4",
    mbrNumber: "MBR-2025-004",
    product: "Paracetamol 500mg Tablets",
    batchNumber: "PCM-2026-002",
    batchSize: 300000,
    batchSizeUnit: "tablets",
    status: "planned",
    createdAt: daysAgo(1),
    createdBy: "Dr. Khaled Mahmoud",
    productionLine: "Tablet Line 1",
    stepExecutions: [],
    materialUsage: [],
  },
];

// ── Store Data Shape ──────────────────────────────────────────────
interface StoreData {
  mbrs: MasterBatchRecord[];
  bprs: BatchProductionRecord[];
}

// ── ManufacturingRecordsStore ─────────────────────────────────────
class ManufacturingRecordsStore {
  private static instance: ManufacturingRecordsStore;

  private constructor() {
    this.seed();
  }

  static getInstance(): ManufacturingRecordsStore {
    if (!ManufacturingRecordsStore.instance) {
      ManufacturingRecordsStore.instance = new ManufacturingRecordsStore();
    }
    return ManufacturingRecordsStore.instance;
  }

  // ── Persistence ──
  private seed(): void {
    if (typeof window === "undefined") return;
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      const data: StoreData = { mbrs: SEED_MBRS, bprs: SEED_BPRS };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }

  private load(): StoreData {
    if (typeof window === "undefined") return { mbrs: [], bprs: [] };
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoreData) : { mbrs: [], bprs: [] };
  }

  private save(data: StoreData): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // ── MBR CRUD ──
  getAllMBRs(): MasterBatchRecord[] {
    return this.load().mbrs;
  }

  getMBRById(id: string): MasterBatchRecord | undefined {
    return this.load().mbrs.find((m) => m.id === id);
  }

  getMBRsByProduct(product: string): MasterBatchRecord[] {
    return this.load().mbrs.filter((m) =>
      m.product.toLowerCase().includes(product.toLowerCase())
    );
  }

  getMBRsByStatus(status: MBRStatus): MasterBatchRecord[] {
    return this.load().mbrs.filter((m) => m.status === status);
  }

  createMBR(mbr: Omit<MasterBatchRecord, "id" | "number" | "createdAt">): MasterBatchRecord {
    if (!mbr.product?.trim()) throw new Error("MBR product is required");
    if (!mbr.dosageForm?.trim()) throw new Error("MBR dosage form is required");
    if (!mbr.strength?.trim()) throw new Error("MBR strength is required");
    const data = this.load();
    const newMBR: MasterBatchRecord = {
      ...mbr,
      id: uid("mbr"),
      number: this.generateMBRNumber(),
      createdAt: new Date().toISOString(),
    };
    data.mbrs.push(newMBR);
    this.save(data);
    return newMBR;
  }

  updateMBR(id: string, updates: Partial<MasterBatchRecord>): MasterBatchRecord | undefined {
    const data = this.load();
    const idx = data.mbrs.findIndex((m) => m.id === id);
    if (idx === -1) return undefined;
    data.mbrs[idx] = { ...data.mbrs[idx], ...updates };
    this.save(data);
    return data.mbrs[idx];
  }

  approveMBR(id: string, approvedBy: string): MasterBatchRecord | undefined {
    return this.updateMBR(id, {
      status: "approved",
      approvedBy,
      edaApprovalDate: new Date().toISOString().split("T")[0],
    });
  }

  supersedeMBR(id: string, newVersionId: string): MasterBatchRecord | undefined {
    return this.updateMBR(id, { status: "superseded", supersededBy: newVersionId });
  }

  generateMBRNumber(): string {
    const data = this.load();
    const year = new Date().getFullYear();
    const prefix = `MBR-${year}-`;
    const existing = data.mbrs
      .filter((m) => m.number.startsWith(prefix))
      .map((m) => parseInt(m.number.replace(prefix, ""), 10))
      .filter((n) => !isNaN(n));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `${prefix}${String(next).padStart(3, "0")}`;
  }

  // ── BPR CRUD ──
  getAllBPRs(): BatchProductionRecord[] {
    return this.load().bprs;
  }

  getBPRById(id: string): BatchProductionRecord | undefined {
    return this.load().bprs.find((b) => b.id === id);
  }

  getBPRsByProduct(product: string): BatchProductionRecord[] {
    return this.load().bprs.filter((b) =>
      b.product.toLowerCase().includes(product.toLowerCase())
    );
  }

  getBPRsByStatus(status: BPRStatus): BatchProductionRecord[] {
    return this.load().bprs.filter((b) => b.status === status);
  }

  getActiveBPRs(): BatchProductionRecord[] {
    const activeStatuses: BPRStatus[] = [
      "in-progress",
      "weighing",
      "processing",
      "ipc-hold",
      "packaging",
      "review",
      "qa-release",
    ];
    return this.load().bprs.filter((b) => activeStatuses.includes(b.status));
  }

  getBPRsForMBR(mbrId: string): BatchProductionRecord[] {
    return this.load().bprs.filter((b) => b.mbrId === mbrId);
  }

  createBPR(bpr: Omit<BatchProductionRecord, "id" | "number" | "createdAt" | "stepExecutions" | "materialUsage">): BatchProductionRecord {
    if (!bpr.product?.trim()) throw new Error("BPR product is required");
    if (!bpr.batchNumber?.trim()) throw new Error("BPR batch number is required");
    if (!bpr.mbrId?.trim()) throw new Error("BPR master batch record ID is required");
    const data = this.load();
    const newBPR: BatchProductionRecord = {
      ...bpr,
      id: uid("bpr"),
      number: this.generateBPRNumber(),
      createdAt: new Date().toISOString(),
      stepExecutions: [],
      materialUsage: [],
    };
    data.bprs.push(newBPR);
    this.save(data);
    return newBPR;
  }

  updateBPR(id: string, updates: Partial<BatchProductionRecord>): BatchProductionRecord | undefined {
    const data = this.load();
    const idx = data.bprs.findIndex((b) => b.id === id);
    if (idx === -1) return undefined;
    data.bprs[idx] = { ...data.bprs[idx], ...updates };
    this.save(data);
    return data.bprs[idx];
  }

  addStepExecution(bprId: string, execution: Omit<BPRStepExecution, "id">): BPRStepExecution | undefined {
    const data = this.load();
    const idx = data.bprs.findIndex((b) => b.id === bprId);
    if (idx === -1) return undefined;
    const newExec: BPRStepExecution = { ...execution, id: uid("exec") };
    data.bprs[idx].stepExecutions.push(newExec);
    this.save(data);
    return newExec;
  }

  addMaterialUsage(bprId: string, usage: Omit<BPRMaterialUsage, "id">): BPRMaterialUsage | undefined {
    const data = this.load();
    const idx = data.bprs.findIndex((b) => b.id === bprId);
    if (idx === -1) return undefined;
    const newUsage: BPRMaterialUsage = { ...usage, id: uid("mat") };
    data.bprs[idx].materialUsage.push(newUsage);
    this.save(data);
    return newUsage;
  }

  generateBPRNumber(): string {
    const data = this.load();
    const year = new Date().getFullYear();
    const prefix = `BPR-${year}-`;
    const existing = data.bprs
      .filter((b) => b.number.startsWith(prefix))
      .map((b) => parseInt(b.number.replace(prefix, ""), 10))
      .filter((n) => !isNaN(n));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `${prefix}${String(next).padStart(3, "0")}`;
  }

  // ── Variance Engine ──
  getVariancesForBPR(bprId: string): VarianceRecord[] {
    const bpr = this.getBPRById(bprId);
    if (!bpr) return [];

    const variances: VarianceRecord[] = [];
    for (const exec of bpr.stepExecutions) {
      for (const val of exec.actualValues) {
        const variancePct = val.targetValue !== 0
          ? Math.round(((val.actualValue - val.targetValue) / val.targetValue) * 100 * 100) / 100
          : 0;
        variances.push({
          id: uid("var"),
          bprId,
          bprNumber: bpr.number,
          stepNumber: exec.stepNumber,
          parameter: val.parameterName,
          theoretical: val.targetValue,
          actual: val.actualValue,
          unit: val.unit,
          variancePercent: variancePct,
          withinTolerance: val.withinTolerance,
          tolerancePercent: val.tolerancePercent,
          deviationTriggered: !val.withinTolerance,
          deviationId: exec.deviationFlag ? exec.deviationId : undefined,
          timestamp: exec.timestamp,
        });
      }
    }
    return variances;
  }

  getAllVariances(): VarianceRecord[] {
    const data = this.load();
    const allVariances: VarianceRecord[] = [];
    for (const bpr of data.bprs) {
      allVariances.push(...this.getVariancesForBPR(bpr.id));
    }
    return allVariances;
  }

  getOutOfToleranceVariances(): VarianceRecord[] {
    return this.getAllVariances().filter((v) => !v.withinTolerance);
  }

  // ── Yield Calculator ──
  calculateYield(bprId: string): YieldReconciliation | undefined {
    const bpr = this.getBPRById(bprId);
    if (!bpr || !bpr.yieldReconciliation) return undefined;
    return bpr.yieldReconciliation;
  }

  getYieldSummary(): { product: string; avgYield: number; batchCount: number }[] {
    const data = this.load();
    const byProduct = new Map<string, { total: number; count: number }>();

    for (const bpr of data.bprs) {
      if (bpr.yieldReconciliation) {
        const existing = byProduct.get(bpr.product) || { total: 0, count: 0 };
        existing.total += bpr.yieldReconciliation.yieldPercent;
        existing.count += 1;
        byProduct.set(bpr.product, existing);
      }
    }

    return Array.from(byProduct.entries()).map(([product, d]) => ({
      product,
      avgYield: Math.round((d.total / d.count) * 10) / 10,
      batchCount: d.count,
    }));
  }

  // ── Metrics ──
  getMetrics(): MBRMetrics {
    const data = this.load();
    const activeMBRs = data.mbrs.filter((m) => m.status === "approved").length;
    const activeBPRs = this.getActiveBPRs().length;
    const inProgressStatuses: BPRStatus[] = ["in-progress", "weighing", "processing", "ipc-hold", "packaging"];
    const inProgressBPRs = data.bprs.filter((b) => inProgressStatuses.includes(b.status)).length;

    const completedBPRs = data.bprs.filter((b) => b.yieldReconciliation);
    const totalYield = completedBPRs.reduce((sum, b) => sum + (b.yieldReconciliation?.yieldPercent || 0), 0);
    const averageYieldPercent = completedBPRs.length > 0 ? Math.round((totalYield / completedBPRs.length) * 10) / 10 : 0;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const allVariances = this.getAllVariances();
    const deviationsThisMonth = allVariances.filter(
      (v) => !v.withinTolerance && new Date(v.timestamp) >= monthStart
    ).length;

    const totalBPRsCompleted = data.bprs.filter((b) => b.status === "released").length;
    const totalBPRsRejected = data.bprs.filter((b) => b.status === "rejected").length;

    const yieldByProduct = this.getYieldSummary();

    // Common variance parameters
    const paramCounts = new Map<string, { count: number; totalVar: number }>();
    for (const v of allVariances) {
      if (!v.withinTolerance) {
        const existing = paramCounts.get(v.parameter) || { count: 0, totalVar: 0 };
        existing.count += 1;
        existing.totalVar += Math.abs(v.variancePercent);
        paramCounts.set(v.parameter, existing);
      }
    }
    const commonVarianceParameters = Array.from(paramCounts.entries())
      .map(([parameter, d]) => ({
        parameter,
        count: d.count,
        avgVariance: Math.round((d.totalVar / d.count) * 10) / 10,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Monthly batches (last 6 months)
    const monthlyBatches: { month: string; completed: number; rejected: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const completed = data.bprs.filter(
        (b) => b.status === "released" && b.endDate && new Date(b.endDate) >= mStart && new Date(b.endDate) <= mEnd
      ).length;
      const rejected = data.bprs.filter(
        (b) => b.status === "rejected" && b.rejectedAt && new Date(b.rejectedAt) >= mStart && new Date(b.rejectedAt) <= mEnd
      ).length;
      monthlyBatches.push({ month: monthStr, completed, rejected });
    }

    // Status distribution
    const statusCounts = new Map<BPRStatus, number>();
    for (const b of data.bprs) {
      statusCounts.set(b.status, (statusCounts.get(b.status) || 0) + 1);
    }
    const statusDistribution = Array.from(statusCounts.entries()).map(([status, count]) => ({
      status,
      count,
    }));

    return {
      activeMBRs,
      activeBPRs,
      inProgressBPRs,
      averageYieldPercent,
      deviationsThisMonth,
      totalBPRsCompleted,
      totalBPRsRejected,
      yieldByProduct,
      commonVarianceParameters,
      monthlyBatches,
      statusDistribution,
    };
  }
}

export const manufacturingStore = ManufacturingRecordsStore.getInstance();
