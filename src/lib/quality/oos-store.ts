"use client";

import type {
  OOSInvestigation,
  OOSMetrics,
  OOSStatus,
  Phase1Investigation,
  Phase2Investigation,
} from "./oos-types";

// ─── Constants ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "pharma.oos-investigations";

// ─── Seed Data ──────────────────────────────────────────────────────────────

function buildSeedData(): OOSInvestigation[] {
  const now = new Date();
  const d = (daysAgo: number) =>
    new Date(now.getTime() - daysAgo * 86400000).toISOString();

  const seed: OOSInvestigation[] = [
    // ── 3 in Phase 1 (lab investigation) ──
    {
      id: "oos-001",
      number: "OOS-2026-001",
      batchNumber: "BN-2026-0451",
      productName: "Amoxicillin Capsules 500mg",
      testName: "Assay",
      specification: { min: 95.0, max: 105.0, unit: "%" },
      actualResult: 93.2,
      outOfSpecType: "OOS",
      status: "phase1-lab",
      priority: "high",
      initiatedBy: "Dr. Nadia Hassan",
      initiatedAt: d(5),
      assignedTo: "Eng. Khaled Mostafa",
      phase1: {
        labError: false,
        retestResults: [
          { testDate: d(4), result: 93.5, analyst: "Eng. Khaled Mostafa", equipment: "HPLC-003" },
        ],
        hypothesisChecklist: [
          { item: "Sample preparation correct", checked: true, notes: "Verified procedure" },
          { item: "Reference standard within validity", checked: true },
          { item: "Equipment calibration current", checked: true },
          { item: "Correct method used", checked: true },
          { item: "Calculation verified", checked: false, notes: "Pending verification" },
        ],
        conclusion: "no-lab-error",
      },
    },
    {
      id: "oos-002",
      number: "OOS-2026-002",
      batchNumber: "BN-2026-0463",
      productName: "Metformin Tablets 850mg",
      testName: "Dissolution",
      specification: { min: 80, max: 100, unit: "% in 30min" },
      actualResult: 72.4,
      outOfSpecType: "OOS",
      status: "phase1-lab",
      priority: "critical",
      initiatedBy: "Dr. Layla Ibrahim",
      initiatedAt: d(3),
      assignedTo: "Dr. Sara Amin",
      phase1: {
        labError: false,
        retestResults: [],
        hypothesisChecklist: [
          { item: "Dissolution apparatus qualified", checked: true },
          { item: "Media preparation correct", checked: true },
          { item: "Temperature verified", checked: false },
          { item: "Paddle speed correct", checked: false },
        ],
        conclusion: "inconclusive",
      },
    },
    {
      id: "oos-003",
      number: "OOS-2026-003",
      batchNumber: "BN-2026-0470",
      productName: "Cetirizine Syrup 5mg/5mL",
      testName: "pH",
      specification: { min: 4.0, max: 5.0, unit: "" },
      actualResult: 5.3,
      outOfSpecType: "OOT",
      status: "phase1-lab",
      priority: "medium",
      initiatedBy: "Eng. Khaled Mostafa",
      initiatedAt: d(2),
      assignedTo: "Dr. Nadia Hassan",
      phase1: {
        labError: false,
        retestResults: [
          { testDate: d(1), result: 5.2, analyst: "Dr. Nadia Hassan", equipment: "pH-Meter-02" },
        ],
        hypothesisChecklist: [
          { item: "pH meter calibrated", checked: true },
          { item: "Buffer solutions verified", checked: true },
          { item: "Sample temperature correct", checked: false },
        ],
        conclusion: "inconclusive",
      },
    },

    // ── 2 in Phase 1 Review ──
    {
      id: "oos-004",
      number: "OOS-2026-004",
      batchNumber: "BN-2026-0422",
      productName: "Ibuprofen Tablets 400mg",
      testName: "Content Uniformity",
      specification: { min: 85.0, max: 115.0, unit: "%" },
      actualResult: 82.1,
      outOfSpecType: "OOS",
      status: "phase1-review",
      priority: "high",
      initiatedBy: "Dr. Sara Amin",
      initiatedAt: d(10),
      assignedTo: "QA Manager",
      phase1: {
        labError: false,
        retestResults: [
          { testDate: d(9), result: 83.0, analyst: "Dr. Sara Amin", equipment: "UV-Vis-001" },
          { testDate: d(8), result: 82.5, analyst: "Eng. Khaled Mostafa", equipment: "UV-Vis-002" },
        ],
        hypothesisChecklist: [
          { item: "Sample preparation correct", checked: true },
          { item: "Reference standard valid", checked: true },
          { item: "Equipment calibration current", checked: true },
          { item: "Correct method used", checked: true },
          { item: "Calculation verified", checked: true },
        ],
        conclusion: "no-lab-error",
        notes: "Consistent OOS results across analysts and equipment. Recommend Phase 2.",
      },
    },
    {
      id: "oos-005",
      number: "OOS-2026-005",
      batchNumber: "BN-2026-0435",
      productName: "Omeprazole Capsules 20mg",
      testName: "Moisture Content",
      specification: { min: 0, max: 3.0, unit: "%" },
      actualResult: 4.8,
      outOfSpecType: "OOS",
      status: "phase1-review",
      priority: "high",
      initiatedBy: "Dr. Layla Ibrahim",
      initiatedAt: d(8),
      assignedTo: "QA Manager",
      phase1: {
        labError: false,
        retestResults: [
          { testDate: d(7), result: 4.6, analyst: "Dr. Layla Ibrahim", equipment: "KF-Titrator-01" },
          { testDate: d(6), result: 4.9, analyst: "Dr. Sara Amin", equipment: "KF-Titrator-01" },
        ],
        hypothesisChecklist: [
          { item: "KF titrator calibrated", checked: true },
          { item: "Reagent titrant fresh", checked: true },
          { item: "Sample handling correct", checked: true },
          { item: "Environmental conditions checked", checked: true },
        ],
        conclusion: "no-lab-error",
        notes: "Confirmed elevated moisture. Storage conditions during hold time should be reviewed.",
      },
    },

    // ── 2 in Phase 2 (production investigation) ──
    {
      id: "oos-006",
      number: "OOS-2026-006",
      batchNumber: "BN-2026-0398",
      productName: "Paracetamol Tablets 500mg",
      testName: "Hardness",
      specification: { min: 6.0, max: 12.0, unit: "kP" },
      actualResult: 4.2,
      outOfSpecType: "OOS",
      status: "phase2-production",
      priority: "medium",
      initiatedBy: "Eng. Khaled Mostafa",
      initiatedAt: d(18),
      assignedTo: "Eng. Ahmed Rashid",
      phase1: {
        labError: false,
        retestResults: [
          { testDate: d(17), result: 4.5, analyst: "Eng. Khaled Mostafa", equipment: "Hardness-Tester-01" },
          { testDate: d(16), result: 4.1, analyst: "Dr. Sara Amin", equipment: "Hardness-Tester-02" },
        ],
        hypothesisChecklist: [
          { item: "Hardness tester calibrated", checked: true },
          { item: "Correct test method", checked: true },
          { item: "Sample integrity verified", checked: true },
        ],
        conclusion: "no-lab-error",
        reviewedBy: "QA Manager",
        reviewedAt: d(14),
        notes: "Confirmed low hardness. Advancing to Phase 2.",
      },
      phase2: {
        productionReview: [
          { area: "Compression", finding: "Compression force was at lower limit of range", investigator: "Eng. Ahmed Rashid" },
          { area: "Granulation", finding: "Granulation endpoint appeared normal", investigator: "Eng. Ahmed Rashid" },
        ],
        materialReview: [
          { materialName: "Microcrystalline Cellulose", batchNumber: "RM-8834", finding: "Supplier COA within spec but particle size at lower end" },
        ],
        equipmentReview: [
          { equipmentId: "COMP-005", equipmentName: "Rotary Tablet Press #5", finding: "Upper punch tooling showing wear" },
        ],
        processReview: [],
        environmentalReview: [],
        rootCauseTools: [],
      },
    },
    {
      id: "oos-007",
      number: "OOS-2026-007",
      batchNumber: "BN-2026-0410",
      productName: "Ciprofloxacin Tablets 500mg",
      testName: "Friability",
      specification: { min: 0, max: 1.0, unit: "%" },
      actualResult: 1.8,
      outOfSpecType: "OOS",
      status: "phase2-production",
      priority: "high",
      initiatedBy: "Dr. Sara Amin",
      initiatedAt: d(15),
      assignedTo: "Eng. Ahmed Rashid",
      phase1: {
        labError: false,
        retestResults: [
          { testDate: d(14), result: 1.7, analyst: "Dr. Sara Amin", equipment: "Friabilator-01" },
        ],
        hypothesisChecklist: [
          { item: "Friabilator calibrated", checked: true },
          { item: "Correct sample weight", checked: true },
          { item: "Rotation count correct", checked: true },
        ],
        conclusion: "no-lab-error",
        reviewedBy: "QA Manager",
        reviewedAt: d(12),
      },
      phase2: {
        productionReview: [
          { area: "Compression", finding: "Investigating compression parameters", investigator: "Eng. Ahmed Rashid" },
        ],
        materialReview: [
          { materialName: "Binder Solution", batchNumber: "RM-9012", finding: "Binder concentration under review" },
        ],
        equipmentReview: [],
        processReview: [
          { step: "Granulation", parameter: "Binder addition rate", finding: "Rate was faster than SOP specification" },
        ],
        environmentalReview: [
          { factor: "Humidity", finding: "RH was 68% during granulation (spec: 45-65%)" },
        ],
        rootCauseTools: [],
      },
    },

    // ── 1 in Phase 2 Review ──
    {
      id: "oos-008",
      number: "OOS-2026-008",
      batchNumber: "BN-2026-0380",
      productName: "Azithromycin Tablets 250mg",
      testName: "Disintegration",
      specification: { min: 0, max: 30, unit: "min" },
      actualResult: 42,
      outOfSpecType: "OOS",
      status: "phase2-review",
      priority: "high",
      initiatedBy: "Dr. Nadia Hassan",
      initiatedAt: d(25),
      assignedTo: "QA Director",
      phase1: {
        labError: false,
        retestResults: [
          { testDate: d(24), result: 40, analyst: "Dr. Nadia Hassan", equipment: "Disintegration-01" },
          { testDate: d(23), result: 43, analyst: "Eng. Khaled Mostafa", equipment: "Disintegration-01" },
        ],
        hypothesisChecklist: [
          { item: "Apparatus qualified", checked: true },
          { item: "Media temperature correct", checked: true },
          { item: "Discs used correctly", checked: true },
        ],
        conclusion: "no-lab-error",
        reviewedBy: "QA Manager",
        reviewedAt: d(21),
      },
      phase2: {
        productionReview: [
          { area: "Coating", finding: "Coating thickness 15% above target", investigator: "Eng. Ahmed Rashid" },
          { area: "Compression", finding: "Compression force within normal range", investigator: "Eng. Ahmed Rashid" },
        ],
        materialReview: [
          { materialName: "HPMC Coating Solution", batchNumber: "RM-8790", finding: "Viscosity at upper limit of specification" },
        ],
        equipmentReview: [
          { equipmentId: "COAT-002", equipmentName: "Coating Pan #2", finding: "Spray nozzle partially clogged" },
        ],
        processReview: [
          { step: "Coating", parameter: "Spray rate", finding: "Inconsistent spray pattern detected" },
          { step: "Coating", parameter: "Pan speed", finding: "Pan speed was nominal" },
        ],
        environmentalReview: [
          { factor: "Temperature", finding: "Inlet air temp was 5C above target" },
        ],
        rootCauseTools: [
          {
            tool: "5why",
            data: JSON.stringify({
              whys: [
                { question: "Why did disintegration fail?", answer: "Coating was too thick" },
                { question: "Why was coating too thick?", answer: "Spray pattern was uneven" },
                { question: "Why was spray pattern uneven?", answer: "Nozzle was partially clogged" },
                { question: "Why was nozzle clogged?", answer: "Inadequate cleaning between batches" },
                { question: "Why was cleaning inadequate?", answer: "No SOP for inter-batch nozzle cleaning" },
              ],
              rootCause: "Missing SOP for inter-batch coating nozzle cleaning procedure",
            }),
          },
        ],
        conclusion: "Root cause identified: coating nozzle clogging due to missing inter-batch cleaning SOP",
        reviewedBy: "QA Director",
        reviewedAt: d(2),
      },
      rootCause: "Missing SOP for inter-batch coating nozzle cleaning procedure",
    },

    // ── 2 Closed-Confirmed (with root causes) ──
    {
      id: "oos-009",
      number: "OOS-2026-009",
      batchNumber: "BN-2026-0350",
      productName: "Lisinopril Tablets 10mg",
      testName: "Assay",
      specification: { min: 90.0, max: 110.0, unit: "%" },
      actualResult: 87.3,
      outOfSpecType: "OOS",
      status: "closed-confirmed",
      priority: "critical",
      initiatedBy: "Dr. Sara Amin",
      initiatedAt: d(45),
      assignedTo: "Eng. Ahmed Rashid",
      phase1: {
        labError: false,
        retestResults: [
          { testDate: d(44), result: 87.8, analyst: "Dr. Sara Amin", equipment: "HPLC-001" },
          { testDate: d(43), result: 87.1, analyst: "Eng. Khaled Mostafa", equipment: "HPLC-003" },
        ],
        hypothesisChecklist: [
          { item: "Sample preparation correct", checked: true },
          { item: "Reference standard valid", checked: true },
          { item: "Equipment calibrated", checked: true },
          { item: "Method followed", checked: true },
          { item: "Calculation verified", checked: true },
        ],
        conclusion: "no-lab-error",
        reviewedBy: "QA Manager",
        reviewedAt: d(40),
      },
      phase2: {
        productionReview: [
          { area: "Blending", finding: "Blending time was reduced due to schedule pressure", investigator: "Eng. Ahmed Rashid" },
        ],
        materialReview: [
          { materialName: "Lisinopril API", batchNumber: "API-2025-889", finding: "API potency was 98.2% (acceptable but lower end)" },
        ],
        equipmentReview: [
          { equipmentId: "BLEND-003", equipmentName: "V-Blender #3", finding: "Intensifier bar malfunction noted" },
        ],
        processReview: [
          { step: "Blending", parameter: "Blend time", finding: "20 min vs SOP requirement of 30 min" },
        ],
        environmentalReview: [],
        rootCauseTools: [
          {
            tool: "fishbone",
            data: JSON.stringify({
              problem: "Assay result 87.3% (below 90.0% spec)",
              categories: {
                Man: ["Operator reduced blend time without authorization"],
                Machine: ["V-Blender intensifier bar malfunction"],
                Material: ["API potency at lower end (98.2%)"],
                Method: ["Blend time deviation from SOP"],
                Measurement: ["No issues found"],
                Environment: ["No issues found"],
              },
            }),
          },
        ],
        conclusion: "Insufficient blending time combined with equipment malfunction led to poor content uniformity",
        reviewedBy: "QA Director",
        reviewedAt: d(30),
      },
      rootCause: "Reduced blending time (20 min vs 30 min SOP) combined with V-Blender intensifier bar malfunction",
      capaId: "CAPA-2026-015",
      conclusion: "OOS confirmed. Batch rejected. CAPA initiated for blending SOP reinforcement and equipment maintenance.",
      closedAt: d(28),
      closedBy: "QA Director",
    },
    {
      id: "oos-010",
      number: "OOS-2026-010",
      batchNumber: "BN-2026-0365",
      productName: "Atorvastatin Tablets 20mg",
      testName: "Microbial Limit",
      specification: { min: 0, max: 100, unit: "CFU/g" },
      actualResult: 350,
      outOfSpecType: "OOS",
      status: "closed-confirmed",
      priority: "critical",
      initiatedBy: "Dr. Layla Ibrahim",
      initiatedAt: d(40),
      assignedTo: "Eng. Ahmed Rashid",
      phase1: {
        labError: false,
        retestResults: [
          { testDate: d(39), result: 320, analyst: "Dr. Layla Ibrahim", equipment: "Incubator-02" },
        ],
        hypothesisChecklist: [
          { item: "Aseptic technique followed", checked: true },
          { item: "Media sterility confirmed", checked: true },
          { item: "Incubation conditions correct", checked: true },
        ],
        conclusion: "no-lab-error",
        reviewedBy: "QA Manager",
        reviewedAt: d(36),
      },
      phase2: {
        productionReview: [
          { area: "Packaging", finding: "Packaging area HEPA filter was overdue for replacement", investigator: "Eng. Ahmed Rashid" },
        ],
        materialReview: [
          { materialName: "Starch Excipient", batchNumber: "RM-8650", finding: "Bioburden on incoming material was at upper limit" },
        ],
        equipmentReview: [
          { equipmentId: "HVAC-PACK-01", equipmentName: "Packaging Room HVAC", finding: "HEPA filter differential pressure above alert limit" },
        ],
        processReview: [],
        environmentalReview: [
          { factor: "Particulate Count", finding: "Viable particle count elevated in packaging area" },
        ],
        rootCauseTools: [
          {
            tool: "5why",
            data: JSON.stringify({
              whys: [
                { question: "Why was microbial count high?", answer: "Environmental contamination during packaging" },
                { question: "Why was environment contaminated?", answer: "HEPA filter was not functioning properly" },
                { question: "Why was HEPA filter not functioning?", answer: "Filter was overdue for replacement" },
                { question: "Why was replacement overdue?", answer: "PM schedule was not followed" },
                { question: "Why was PM schedule not followed?", answer: "No automated alerts for HVAC PM due dates" },
              ],
              rootCause: "Lack of automated PM alerts for HVAC filter replacements",
            }),
          },
        ],
        conclusion: "Environmental contamination due to overdue HEPA filter replacement",
        reviewedBy: "QA Director",
        reviewedAt: d(28),
      },
      rootCause: "HEPA filter in packaging area overdue for replacement, leading to elevated bioburden",
      capaId: "CAPA-2026-018",
      conclusion: "OOS confirmed. Batch quarantined. CAPA for automated HVAC PM alerting system.",
      closedAt: d(25),
      closedBy: "QA Director",
    },

    // ── 2 Closed-Invalidated (lab errors) ──
    {
      id: "oos-011",
      number: "OOS-2026-011",
      batchNumber: "BN-2026-0445",
      productName: "Amlodipine Tablets 5mg",
      testName: "Assay",
      specification: { min: 95.0, max: 105.0, unit: "%" },
      actualResult: 88.5,
      outOfSpecType: "OOS",
      status: "closed-invalidated",
      priority: "medium",
      initiatedBy: "Eng. Khaled Mostafa",
      initiatedAt: d(20),
      assignedTo: "Dr. Sara Amin",
      phase1: {
        labError: true,
        labErrorDetails: "Analyst used expired reference standard (expiry: 2026-02-28). Retest with valid standard gave 99.2%.",
        retestResults: [
          { testDate: d(19), result: 88.9, analyst: "Eng. Khaled Mostafa", equipment: "HPLC-002" },
          { testDate: d(18), result: 99.2, analyst: "Dr. Sara Amin", equipment: "HPLC-001" },
        ],
        hypothesisChecklist: [
          { item: "Sample preparation correct", checked: true },
          { item: "Reference standard within validity", checked: false, notes: "EXPIRED - root cause of OOS" },
          { item: "Equipment calibration current", checked: true },
          { item: "Correct method used", checked: true },
          { item: "Calculation verified", checked: true },
        ],
        conclusion: "lab-error-confirmed",
        reviewedBy: "QA Manager",
        reviewedAt: d(16),
        notes: "Lab error confirmed: expired reference standard used. Corrective training initiated.",
      },
      conclusion: "OOS invalidated. Lab error confirmed - expired reference standard. Analyst retrained.",
      closedAt: d(15),
      closedBy: "QA Manager",
    },
    {
      id: "oos-012",
      number: "OOS-2026-012",
      batchNumber: "BN-2026-0458",
      productName: "Losartan Tablets 50mg",
      testName: "Dissolution",
      specification: { min: 80, max: 100, unit: "% in 45min" },
      actualResult: 65.0,
      outOfSpecType: "OOS",
      status: "closed-invalidated",
      priority: "high",
      initiatedBy: "Dr. Nadia Hassan",
      initiatedAt: d(14),
      assignedTo: "Dr. Layla Ibrahim",
      phase1: {
        labError: true,
        labErrorDetails: "Dissolution media temperature was 32C instead of 37C due to faulty thermocouple in bath. Retest at correct temperature gave 92.1%.",
        retestResults: [
          { testDate: d(13), result: 66.2, analyst: "Dr. Nadia Hassan", equipment: "Dissolution-Bath-03" },
          { testDate: d(12), result: 92.1, analyst: "Dr. Layla Ibrahim", equipment: "Dissolution-Bath-01" },
        ],
        hypothesisChecklist: [
          { item: "Dissolution apparatus qualified", checked: false, notes: "Bath 03 thermocouple faulty" },
          { item: "Media preparation correct", checked: true },
          { item: "Temperature verified", checked: false, notes: "32C instead of 37C - FAULTY THERMOCOUPLE" },
          { item: "Paddle speed correct", checked: true },
          { item: "Sampling time correct", checked: true },
        ],
        conclusion: "lab-error-confirmed",
        reviewedBy: "QA Manager",
        reviewedAt: d(10),
        notes: "Lab error confirmed: faulty thermocouple in Dissolution Bath 03. Equipment taken out of service for repair.",
      },
      conclusion: "OOS invalidated. Equipment malfunction - faulty thermocouple in dissolution bath. Equipment removed from service.",
      closedAt: d(9),
      closedBy: "QA Manager",
    },
  ];

  return seed;
}

// ─── OOS Store ──────────────────────────────────────────────────────────────

export class OOSStore {
  private data: OOSInvestigation[];

  constructor() {
    this.data = [];
    this.load();
  }

  private load(): void {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        this.data = JSON.parse(raw);
      } catch {
        this.data = buildSeedData();
        this.save();
      }
    } else {
      this.data = buildSeedData();
      this.save();
    }
  }

  private save(): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
  }

  // ── Read ────────────────────────────────────────────────────────────────

  getAll(): OOSInvestigation[] {
    return [...this.data];
  }

  getById(id: string): OOSInvestigation | undefined {
    return this.data.find((inv) => inv.id === id);
  }

  getByStatus(status: OOSStatus): OOSInvestigation[] {
    return this.data.filter((inv) => inv.status === status);
  }

  getByBatch(batchNumber: string): OOSInvestigation[] {
    return this.data.filter((inv) => inv.batchNumber === batchNumber);
  }

  getOpen(): OOSInvestigation[] {
    return this.data.filter(
      (inv) =>
        inv.status !== "closed-confirmed" &&
        inv.status !== "closed-invalidated"
    );
  }

  // ── Write ───────────────────────────────────────────────────────────────

  create(
    investigation: Omit<OOSInvestigation, "id" | "number" | "initiatedAt">
  ): OOSInvestigation {
    const newInv: OOSInvestigation = {
      ...investigation,
      id: `oos-${Date.now()}`,
      number: this.generateNumber(),
      initiatedAt: new Date().toISOString(),
    };
    this.data.unshift(newInv);
    this.save();
    return newInv;
  }

  update(id: string, updates: Partial<OOSInvestigation>): OOSInvestigation | undefined {
    const idx = this.data.findIndex((inv) => inv.id === id);
    if (idx === -1) return undefined;
    this.data[idx] = { ...this.data[idx], ...updates };
    this.save();
    return this.data[idx];
  }

  // ── Phase Transitions ───────────────────────────────────────────────────

  advancePhase(
    id: string,
    phase: OOSStatus,
    data?: Partial<OOSInvestigation>
  ): OOSInvestigation | undefined {
    const idx = this.data.findIndex((inv) => inv.id === id);
    if (idx === -1) return undefined;
    this.data[idx] = { ...this.data[idx], ...data, status: phase };
    this.save();
    return this.data[idx];
  }

  closeInvestigation(
    id: string,
    conclusion: string,
    rootCause?: string,
    capaId?: string
  ): OOSInvestigation | undefined {
    const idx = this.data.findIndex((inv) => inv.id === id);
    if (idx === -1) return undefined;

    const isLabError = this.data[idx].phase1?.conclusion === "lab-error-confirmed";
    this.data[idx] = {
      ...this.data[idx],
      status: isLabError ? "closed-invalidated" : "closed-confirmed",
      conclusion,
      rootCause,
      capaId,
      closedAt: new Date().toISOString(),
      closedBy: "Current User",
    };
    this.save();
    return this.data[idx];
  }

  // ── Metrics ─────────────────────────────────────────────────────────────

  getMetrics(): OOSMetrics {
    const all = this.data;
    const open = this.getOpen();
    const closed = all.filter(
      (inv) =>
        inv.status === "closed-confirmed" || inv.status === "closed-invalidated"
    );

    // Average closure days
    let totalDays = 0;
    let closedWithDates = 0;
    for (const inv of closed) {
      if (inv.closedAt) {
        const days =
          (new Date(inv.closedAt).getTime() -
            new Date(inv.initiatedAt).getTime()) /
          86400000;
        totalDays += days;
        closedWithDates++;
      }
    }
    const avgClosureDays =
      closedWithDates > 0 ? Math.round(totalDays / closedWithDates) : 0;

    // Phase 1 only (closed-invalidated = resolved in phase 1)
    const phase1Only = all.filter(
      (inv) => inv.status === "closed-invalidated"
    ).length;
    const phase1OnlyPct =
      all.length > 0 ? Math.round((phase1Only / all.length) * 100) : 0;

    // CAPA linked
    const capaLinked = all.filter((inv) => inv.capaId).length;
    const capaLinkedPct =
      all.length > 0 ? Math.round((capaLinked / all.length) * 100) : 0;

    // By category (test name)
    const catMap = new Map<string, number>();
    for (const inv of all) {
      catMap.set(inv.testName, (catMap.get(inv.testName) ?? 0) + 1);
    }
    const byCategory = Array.from(catMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalInvestigations: all.length,
      openCount: open.length,
      closedCount: closed.length,
      avgClosureDays,
      phase1OnlyPct,
      capaLinkedPct,
      byCategory,
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  generateNumber(): string {
    const year = new Date().getFullYear();
    const existing = this.data
      .filter((inv) => inv.number.startsWith(`OOS-${year}-`))
      .map((inv) => {
        const parts = inv.number.split("-");
        return parseInt(parts[2], 10);
      })
      .filter((n) => !isNaN(n));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `OOS-${year}-${String(next).padStart(3, "0")}`;
  }
}

// Singleton
export const oosStore = typeof window !== "undefined" ? new OOSStore() : (null as unknown as OOSStore);
