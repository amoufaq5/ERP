"use client";

import type {
  ChangeRequest,
  ChangeStatus,
  ChangeCategory,
  ChangeControlMetrics,
  Approval,
  ImpactAssessment,
} from "./change-control-types";

const STORAGE_KEY = "pharma.change-controls";

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

const SEED_DATA: ChangeRequest[] = [
  // 2 drafts
  {
    id: "cc-1",
    number: "CC-2026-001",
    title: "Update tablet coating formula for Amoxicillin 500mg",
    description:
      "Replace current Opadry II coating with Opadry AMB to improve moisture barrier properties and extend shelf life from 24 to 36 months.",
    category: "material",
    type: "major",
    status: "draft",
    priority: "high",
    requestedBy: "Dr. Ahmed Hassan",
    requestedAt: daysAgo(2),
    department: "R&D",
    affectedAreas: ["Tablet Coating", "Stability Lab", "Packaging"],
    affectedProducts: ["Amoxicillin 500mg Tablets"],
    affectedDocuments: ["SOP-PRD-042", "BMR-AMX-500", "SPEC-FP-018"],
    justification:
      "Current coating shows hygroscopic tendencies in accelerated stability studies. New formula will improve moisture protection by 40%.",
    riskLevel: "medium",
    approvals: [],
    implementationPlan: [],
  },
  {
    id: "cc-2",
    number: "CC-2026-002",
    title: "Relocate purified water sampling point in Area B",
    description:
      "Move the PW sampling point from downstream of loop return to a position closer to the point of use in filling room B-12.",
    category: "facility",
    type: "minor",
    status: "draft",
    priority: "medium",
    requestedBy: "Eng. Fatma El-Sayed",
    requestedAt: daysAgo(1),
    department: "Engineering",
    affectedAreas: ["Water System", "Filling Area B"],
    affectedProducts: [],
    affectedDocuments: ["SOP-UTL-009", "DWG-PW-003"],
    justification:
      "Current sampling location does not represent water quality at the actual point of use per WHO TRS 970 guidance.",
    riskLevel: "low",
    approvals: [],
    implementationPlan: [],
  },
  // 1 submitted
  {
    id: "cc-3",
    number: "CC-2026-003",
    title: "Replace mixing equipment in granulation suite",
    description:
      "Replace the existing Diosna P250 high-shear granulator with a GEA PharmaConnect PMA 300 to increase batch capacity by 20%.",
    category: "equipment",
    type: "critical",
    status: "submitted",
    priority: "high",
    requestedBy: "Dr. Khaled Mahmoud",
    requestedAt: daysAgo(8),
    department: "Production",
    affectedAreas: ["Granulation Suite", "IPC Lab", "Warehouse"],
    affectedProducts: [
      "Amoxicillin 500mg",
      "Metformin 850mg",
      "Omeprazole 20mg",
    ],
    affectedDocuments: [
      "SOP-PRD-015",
      "SOP-PRD-016",
      "BMR-AMX-500",
      "BMR-MET-850",
      "BMR-OMP-020",
      "VAL-EQ-033",
    ],
    justification:
      "Current granulator is at end of life with increasing downtime. New equipment will improve batch consistency and increase throughput.",
    riskLevel: "high",
    approvals: [],
    implementationPlan: [],
  },
  // 1 impact-assessment
  {
    id: "cc-4",
    number: "CC-2026-004",
    title: "Change API supplier for Metformin HCl",
    description:
      "Qualify a second API supplier (Aurobindo Pharma) for Metformin HCl raw material to mitigate supply chain risk.",
    category: "supplier",
    type: "major",
    status: "impact-assessment",
    priority: "high",
    requestedBy: "Dr. Nadia Soliman",
    requestedAt: daysAgo(15),
    department: "Supply Chain",
    affectedAreas: ["QC Lab", "Warehouse", "Production"],
    affectedProducts: ["Metformin 500mg", "Metformin 850mg", "Metformin 1000mg"],
    affectedDocuments: [
      "SPEC-RM-045",
      "SOP-QC-022",
      "BMR-MET-500",
      "BMR-MET-850",
      "BMR-MET-1000",
    ],
    justification:
      "Single-source dependency creates unacceptable supply risk. Recent 3-month shortage caused production delays.",
    riskLevel: "medium",
    approvals: [],
    implementationPlan: [],
  },
  // 2 in review (some approvals pending)
  {
    id: "cc-5",
    number: "CC-2026-005",
    title: "Modify sterilization parameters for injectable line",
    description:
      "Increase F0 value from 12 to 15 minutes for terminal sterilization of small-volume parenterals to meet updated EDA requirements.",
    category: "process",
    type: "critical",
    status: "review",
    priority: "urgent",
    requestedBy: "Dr. Youssef Kamel",
    requestedAt: daysAgo(22),
    department: "Production - Sterile",
    affectedAreas: ["Autoclave Room", "SVP Filling", "QC Micro Lab"],
    affectedProducts: [
      "Gentamicin 80mg/2ml Injection",
      "Ranitidine 50mg/2ml Injection",
    ],
    affectedDocuments: [
      "SOP-PRD-088",
      "VAL-PR-012",
      "BMR-GNT-080",
      "BMR-RAN-050",
    ],
    justification:
      "Updated EDA circular (2026/03) requires higher minimum F0 value for Class A products. Non-compliance risks license suspension.",
    riskLevel: "high",
    impactAssessment: {
      qualityImpact: "medium",
      regulatoryImpact: "high",
      safetyImpact: "high",
      productionImpact: "medium",
      financialImpact: "low",
      validationRequired: true,
      regulatoryFilingRequired: true,
      customerNotificationRequired: false,
      assessedBy: "Dr. Laila Farouk",
      assessedAt: daysAgo(18),
      notes:
        "Process validation required for all affected products. Regulatory variation submission needed within 30 days.",
    },
    approvals: [
      {
        role: "QA Manager",
        name: "Dr. Laila Farouk",
        status: "approved",
        comments: "Critical regulatory requirement. Proceed with urgency.",
        date: daysAgo(16),
      },
      {
        role: "Production Manager",
        name: "Dr. Youssef Kamel",
        status: "approved",
        date: daysAgo(15),
      },
      {
        role: "QC Manager",
        name: "Dr. Rania Abdel-Aziz",
        status: "pending",
      },
      {
        role: "Regulatory Affairs",
        name: "Dr. Heba Mostafa",
        status: "pending",
      },
    ],
    implementationPlan: [],
  },
  {
    id: "cc-6",
    number: "CC-2026-006",
    title: "Update SOP for batch weighing and dispensing",
    description:
      "Revise SOP-PRD-005 to incorporate barcode verification and electronic balance integration for raw material dispensing.",
    category: "document",
    type: "minor",
    status: "review",
    priority: "medium",
    requestedBy: "Pharm. Mariam Khalil",
    requestedAt: daysAgo(12),
    department: "Production",
    affectedAreas: ["Dispensing Room", "Warehouse"],
    affectedProducts: [],
    affectedDocuments: ["SOP-PRD-005", "SOP-WH-011", "FORM-PRD-005A"],
    justification:
      "Current manual verification process has led to 3 near-miss events in the past 6 months. Barcode verification will eliminate risk of material mix-ups.",
    riskLevel: "low",
    impactAssessment: {
      qualityImpact: "medium",
      regulatoryImpact: "low",
      safetyImpact: "medium",
      productionImpact: "low",
      financialImpact: "low",
      validationRequired: false,
      regulatoryFilingRequired: false,
      customerNotificationRequired: false,
      assessedBy: "Dr. Laila Farouk",
      assessedAt: daysAgo(10),
      notes: "Low-risk documentation change. Training required for dispensing operators.",
    },
    approvals: [
      {
        role: "QA Manager",
        name: "Dr. Laila Farouk",
        status: "approved",
        date: daysAgo(9),
      },
      {
        role: "Production Manager",
        name: "Dr. Youssef Kamel",
        status: "deferred",
        comments: "Need to confirm barcode reader compatibility with ERP system first.",
        date: daysAgo(8),
      },
      {
        role: "Warehouse Manager",
        name: "Eng. Tarek Nour",
        status: "pending",
      },
    ],
    implementationPlan: [],
  },
  // 1 approved
  {
    id: "cc-7",
    number: "CC-2026-007",
    title: "Upgrade HVAC filtration in solid dosage area",
    description:
      "Replace HEPA H13 filters with H14 grade and install differential pressure monitoring in rooms SD-01 through SD-06.",
    category: "facility",
    type: "major",
    status: "approved",
    priority: "high",
    requestedBy: "Eng. Tarek Nour",
    requestedAt: daysAgo(30),
    department: "Engineering",
    affectedAreas: ["Solid Dosage Rooms SD-01 to SD-06", "HVAC System"],
    affectedProducts: [
      "Amoxicillin 500mg",
      "Metformin 850mg",
      "Paracetamol 500mg",
    ],
    affectedDocuments: [
      "SOP-ENG-018",
      "DWG-HVAC-007",
      "VAL-CL-005",
      "SPEC-HVAC-002",
    ],
    justification:
      "Annual qualification showed particle counts approaching limits in SD-03 and SD-05. Proactive upgrade to maintain Class D compliance.",
    riskLevel: "medium",
    impactAssessment: {
      qualityImpact: "high",
      regulatoryImpact: "medium",
      safetyImpact: "low",
      productionImpact: "high",
      financialImpact: "medium",
      validationRequired: true,
      regulatoryFilingRequired: false,
      customerNotificationRequired: false,
      assessedBy: "Dr. Laila Farouk",
      assessedAt: daysAgo(25),
      notes:
        "Cleanroom requalification required after filter replacement. Schedule during annual shutdown to minimize production impact.",
    },
    approvals: [
      {
        role: "QA Manager",
        name: "Dr. Laila Farouk",
        status: "approved",
        date: daysAgo(23),
      },
      {
        role: "Production Manager",
        name: "Dr. Youssef Kamel",
        status: "approved",
        date: daysAgo(22),
      },
      {
        role: "Engineering Manager",
        name: "Eng. Mohamed Fathy",
        status: "approved",
        date: daysAgo(21),
      },
      {
        role: "Plant Director",
        name: "Dr. Amr Selim",
        status: "approved",
        comments: "Approved. Align with Q3 shutdown schedule.",
        date: daysAgo(20),
      },
    ],
    implementationPlan: [
      {
        id: "s7-1",
        step: 1,
        description: "Procure H14 HEPA filters and DP sensors",
        assignedTo: "Eng. Tarek Nour",
        dueDate: futureDays(10),
        status: "pending",
      },
      {
        id: "s7-2",
        step: 2,
        description: "Schedule installation during Q3 shutdown window",
        assignedTo: "Eng. Tarek Nour",
        dueDate: futureDays(15),
        status: "pending",
      },
      {
        id: "s7-3",
        step: 3,
        description: "Install filters and DP monitoring in SD-01 to SD-06",
        assignedTo: "HVAC Contractor",
        dueDate: futureDays(30),
        status: "pending",
      },
      {
        id: "s7-4",
        step: 4,
        description: "Perform cleanroom requalification (particle counts, air changes, recovery)",
        assignedTo: "QA Validation Team",
        dueDate: futureDays(40),
        status: "pending",
      },
    ],
  },
  // 1 implementation (steps partially complete)
  {
    id: "cc-8",
    number: "CC-2026-008",
    title: "Implement electronic batch records for Paracetamol line",
    description:
      "Deploy MasterControl eBR module for Paracetamol 500mg tablet manufacturing, replacing paper-based batch records.",
    category: "system",
    type: "major",
    status: "implementation",
    priority: "high",
    requestedBy: "Dr. Laila Farouk",
    requestedAt: daysAgo(45),
    department: "QA",
    affectedAreas: ["Granulation", "Compression", "Coating", "Packaging", "QC Lab"],
    affectedProducts: ["Paracetamol 500mg Tablets"],
    affectedDocuments: [
      "SOP-QA-001",
      "SOP-PRD-030",
      "BMR-PCM-500",
      "FORM-QA-015",
      "VAL-CSV-008",
    ],
    justification:
      "Paper batch records are error-prone and cause delays in batch release. eBR will reduce batch review time by 60% and improve data integrity.",
    riskLevel: "medium",
    impactAssessment: {
      qualityImpact: "high",
      regulatoryImpact: "medium",
      safetyImpact: "none",
      productionImpact: "high",
      financialImpact: "medium",
      validationRequired: true,
      regulatoryFilingRequired: false,
      customerNotificationRequired: false,
      assessedBy: "Dr. Rania Abdel-Aziz",
      assessedAt: daysAgo(40),
      notes:
        "CSV validation per GAMP 5 required. 21 CFR Part 11 compliance assessment mandatory. Parallel run for 3 batches before full cutover.",
    },
    approvals: [
      {
        role: "QA Manager",
        name: "Dr. Laila Farouk",
        status: "approved",
        date: daysAgo(38),
      },
      {
        role: "Production Manager",
        name: "Dr. Youssef Kamel",
        status: "approved",
        date: daysAgo(37),
      },
      {
        role: "IT Manager",
        name: "Eng. Ayman Zaki",
        status: "approved",
        date: daysAgo(36),
      },
      {
        role: "Plant Director",
        name: "Dr. Amr Selim",
        status: "approved",
        date: daysAgo(35),
      },
    ],
    implementationPlan: [
      {
        id: "s8-1",
        step: 1,
        description: "Install MasterControl eBR server and client infrastructure",
        assignedTo: "Eng. Ayman Zaki",
        dueDate: daysAgo(25),
        status: "completed",
        completedAt: daysAgo(26),
        evidence: "IQ/OQ Protocol CSV-008-IQ executed",
      },
      {
        id: "s8-2",
        step: 2,
        description: "Configure eBR template for Paracetamol 500mg BMR",
        assignedTo: "Pharm. Mariam Khalil",
        dueDate: daysAgo(15),
        status: "completed",
        completedAt: daysAgo(16),
        evidence: "Template reviewed and approved by QA",
      },
      {
        id: "s8-3",
        step: 3,
        description: "Train production and QA staff on eBR system",
        assignedTo: "Dr. Laila Farouk",
        dueDate: daysAgo(5),
        status: "in-progress",
      },
      {
        id: "s8-4",
        step: 4,
        description: "Execute 3 parallel-run batches (paper + electronic)",
        assignedTo: "Dr. Youssef Kamel",
        dueDate: futureDays(15),
        status: "pending",
      },
      {
        id: "s8-5",
        step: 5,
        description: "Complete PQ protocol and validation report",
        assignedTo: "QA Validation Team",
        dueDate: futureDays(25),
        status: "pending",
      },
    ],
  },
  // 1 verification
  {
    id: "cc-9",
    number: "CC-2026-009",
    title: "Change primary packaging material for Omeprazole capsules",
    description:
      "Switch from PVC/Al blister to cold-form Al/Al blister for improved moisture protection of Omeprazole 20mg capsules.",
    category: "packaging",
    type: "major",
    status: "verification",
    priority: "medium",
    requestedBy: "Dr. Ahmed Hassan",
    requestedAt: daysAgo(60),
    department: "R&D",
    affectedAreas: ["Packaging Line 3", "Stability Lab", "Artwork"],
    affectedProducts: ["Omeprazole 20mg Capsules"],
    affectedDocuments: [
      "SOP-PKG-007",
      "SPEC-PM-022",
      "BMR-OMP-020",
      "STAB-OMP-020-V2",
    ],
    justification:
      "Accelerated stability data shows degradation at 40C/75% RH with current PVC blisters. Al/Al provides MVTR < 0.02 g/m2/day.",
    riskLevel: "medium",
    impactAssessment: {
      qualityImpact: "high",
      regulatoryImpact: "high",
      safetyImpact: "low",
      productionImpact: "medium",
      financialImpact: "medium",
      validationRequired: true,
      regulatoryFilingRequired: true,
      customerNotificationRequired: true,
      assessedBy: "Dr. Laila Farouk",
      assessedAt: daysAgo(55),
      notes:
        "Type II variation submission to EDA required. Updated artwork needed. Customer/distributor notification for pack change.",
    },
    approvals: [
      {
        role: "QA Manager",
        name: "Dr. Laila Farouk",
        status: "approved",
        date: daysAgo(52),
      },
      {
        role: "Regulatory Affairs",
        name: "Dr. Heba Mostafa",
        status: "approved",
        date: daysAgo(51),
      },
      {
        role: "Production Manager",
        name: "Dr. Youssef Kamel",
        status: "approved",
        date: daysAgo(50),
      },
      {
        role: "R&D Manager",
        name: "Dr. Ahmed Hassan",
        status: "approved",
        date: daysAgo(49),
      },
    ],
    implementationPlan: [
      {
        id: "s9-1",
        step: 1,
        description: "Qualify Al/Al blister material from supplier",
        assignedTo: "QC Lab",
        dueDate: daysAgo(40),
        status: "completed",
        completedAt: daysAgo(41),
        evidence: "COA and incoming inspection results attached",
      },
      {
        id: "s9-2",
        step: 2,
        description: "Modify blister machine tooling for cold-form operation",
        assignedTo: "Eng. Mohamed Fathy",
        dueDate: daysAgo(30),
        status: "completed",
        completedAt: daysAgo(31),
        evidence: "Tooling changeover completed and documented",
      },
      {
        id: "s9-3",
        step: 3,
        description: "Execute process validation (3 consecutive batches)",
        assignedTo: "Dr. Youssef Kamel",
        dueDate: daysAgo(15),
        status: "completed",
        completedAt: daysAgo(14),
        evidence: "PV report REF-PV-2026-009 approved",
      },
      {
        id: "s9-4",
        step: 4,
        description: "Submit Type II variation to EDA",
        assignedTo: "Dr. Heba Mostafa",
        dueDate: daysAgo(10),
        status: "completed",
        completedAt: daysAgo(10),
        evidence: "Variation submitted - tracking REF EDA-2026-V087",
      },
    ],
    verificationResults:
      "All 3 validation batches met acceptance criteria. Blister integrity test passed. Stability samples placed on accelerated and long-term programs. EDA variation submitted. Awaiting final EDA approval.",
  },
  // 1 closed
  {
    id: "cc-10",
    number: "CC-2026-010",
    title: "Update environmental monitoring frequency in sterile area",
    description:
      "Increase settle plate exposure time from 4 hours to 4 hours with additional active air sampling at 2-hour intervals during aseptic operations.",
    category: "process",
    type: "minor",
    status: "closed",
    priority: "medium",
    requestedBy: "Dr. Rania Abdel-Aziz",
    requestedAt: daysAgo(90),
    department: "QC - Microbiology",
    affectedAreas: ["Aseptic Filling Suite", "QC Micro Lab"],
    affectedProducts: [
      "Gentamicin 80mg/2ml Injection",
      "Ranitidine 50mg/2ml Injection",
    ],
    affectedDocuments: ["SOP-QC-045", "SOP-QC-046", "FORM-QC-045A"],
    justification:
      "WHO Annex 6 (2024 revision) recommends continuous monitoring during critical operations. Current program does not meet updated guidance.",
    riskLevel: "low",
    impactAssessment: {
      qualityImpact: "medium",
      regulatoryImpact: "medium",
      safetyImpact: "low",
      productionImpact: "low",
      financialImpact: "low",
      validationRequired: false,
      regulatoryFilingRequired: false,
      customerNotificationRequired: false,
      assessedBy: "Dr. Laila Farouk",
      assessedAt: daysAgo(85),
      notes: "Procedural change only. No equipment or product impact. Training required for micro lab and production staff.",
    },
    approvals: [
      {
        role: "QA Manager",
        name: "Dr. Laila Farouk",
        status: "approved",
        date: daysAgo(83),
      },
      {
        role: "QC Manager",
        name: "Dr. Rania Abdel-Aziz",
        status: "approved",
        date: daysAgo(82),
      },
      {
        role: "Production Manager",
        name: "Dr. Youssef Kamel",
        status: "approved",
        date: daysAgo(81),
      },
    ],
    implementationPlan: [
      {
        id: "s10-1",
        step: 1,
        description: "Revise SOP-QC-045 and SOP-QC-046",
        assignedTo: "Dr. Rania Abdel-Aziz",
        dueDate: daysAgo(75),
        status: "completed",
        completedAt: daysAgo(76),
        evidence: "SOPs revised, reviewed and approved",
      },
      {
        id: "s10-2",
        step: 2,
        description: "Train micro lab technicians and production operators",
        assignedTo: "Dr. Rania Abdel-Aziz",
        dueDate: daysAgo(70),
        status: "completed",
        completedAt: daysAgo(71),
        evidence: "Training records filed - 12 staff trained",
      },
      {
        id: "s10-3",
        step: 3,
        description: "Procure additional active air samplers (x2)",
        assignedTo: "Eng. Tarek Nour",
        dueDate: daysAgo(65),
        status: "completed",
        completedAt: daysAgo(66),
        evidence: "MAS-100 air samplers received and calibrated",
      },
    ],
    verificationResults:
      "New monitoring program implemented for 30 days. All results within alert and action limits. Trend analysis shows improved environmental data capture. Change effective.",
    closedAt: daysAgo(35),
    closedBy: "Dr. Laila Farouk",
  },
];

class ChangeControlStore {
  private static instance: ChangeControlStore;

  private constructor() {
    this.seed();
  }

  static getInstance(): ChangeControlStore {
    if (!ChangeControlStore.instance) {
      ChangeControlStore.instance = new ChangeControlStore();
    }
    return ChangeControlStore.instance;
  }

  private seed(): void {
    if (typeof window === "undefined") return;
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
    }
  }

  private load(): ChangeRequest[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChangeRequest[]) : [];
  }

  private save(data: ChangeRequest[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  getAll(): ChangeRequest[] {
    return this.load();
  }

  getById(id: string): ChangeRequest | undefined {
    return this.load().find((c) => c.id === id);
  }

  create(change: Omit<ChangeRequest, "id" | "number">): ChangeRequest {
    const all = this.load();
    const newChange: ChangeRequest = {
      ...change,
      id: `cc-${Date.now()}`,
      number: this.generateNumber(),
    };
    all.push(newChange);
    this.save(all);
    return newChange;
  }

  update(id: string, updates: Partial<ChangeRequest>): ChangeRequest | undefined {
    const all = this.load();
    const idx = all.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    all[idx] = { ...all[idx], ...updates };
    this.save(all);
    return all[idx];
  }

  getByStatus(status: ChangeStatus): ChangeRequest[] {
    return this.load().filter((c) => c.status === status);
  }

  getByCategory(category: ChangeCategory): ChangeRequest[] {
    return this.load().filter((c) => c.category === category);
  }

  getOpen(): ChangeRequest[] {
    const closedStatuses: ChangeStatus[] = ["closed", "rejected"];
    return this.load().filter((c) => !closedStatuses.includes(c.status));
  }

  getOverdue(): ChangeRequest[] {
    const now = new Date();
    return this.load().filter((c) =>
      c.implementationPlan.some(
        (s) =>
          s.status !== "completed" && new Date(s.dueDate) < now
      )
    );
  }

  submitForReview(id: string): ChangeRequest | undefined {
    return this.update(id, { status: "submitted" });
  }

  addApproval(
    id: string,
    approval: Approval
  ): ChangeRequest | undefined {
    const change = this.getById(id);
    if (!change) return undefined;
    const approvals = [...change.approvals];
    const existing = approvals.findIndex(
      (a) => a.role === approval.role && a.name === approval.name
    );
    if (existing >= 0) {
      approvals[existing] = approval;
    } else {
      approvals.push(approval);
    }
    return this.update(id, { approvals });
  }

  rejectChange(id: string, reason: string): ChangeRequest | undefined {
    const change = this.getById(id);
    if (!change) return undefined;
    const approvals = change.approvals.map((a) =>
      a.status === "pending" ? { ...a, status: "rejected" as const, comments: reason } : a
    );
    return this.update(id, { status: "rejected", approvals });
  }

  startImplementation(id: string): ChangeRequest | undefined {
    return this.update(id, { status: "implementation" });
  }

  completeStep(
    id: string,
    stepId: string
  ): ChangeRequest | undefined {
    const change = this.getById(id);
    if (!change) return undefined;
    const plan = change.implementationPlan.map((s) =>
      s.id === stepId
        ? { ...s, status: "completed" as const, completedAt: new Date().toISOString() }
        : s
    );
    return this.update(id, { implementationPlan: plan });
  }

  closeChange(id: string): ChangeRequest | undefined {
    return this.update(id, {
      status: "closed",
      closedAt: new Date().toISOString(),
      closedBy: "Current User",
    });
  }

  generateNumber(): string {
    const all = this.load();
    const year = new Date().getFullYear();
    const yearPrefix = `CC-${year}-`;
    const existing = all
      .filter((c) => c.number.startsWith(yearPrefix))
      .map((c) => parseInt(c.number.replace(yearPrefix, ""), 10))
      .filter((n) => !isNaN(n));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `${yearPrefix}${String(next).padStart(3, "0")}`;
  }

  getMetrics(): ChangeControlMetrics {
    const all = this.load();
    const open = all.filter(
      (c) => !["closed", "rejected"].includes(c.status)
    );

    // Average cycle time for closed changes
    const closed = all.filter((c) => c.status === "closed" && c.closedAt);
    const avgCycleDays =
      closed.length > 0
        ? Math.round(
            closed.reduce(
              (sum, c) => sum + daysBetween(c.requestedAt, c.closedAt!),
              0
            ) / closed.length
          )
        : 0;

    // On-time closure: closed changes where all steps completed by due date
    const onTimeClosed = closed.filter((c) =>
      c.implementationPlan.every(
        (s) =>
          s.status === "completed" &&
          s.completedAt &&
          new Date(s.completedAt) <= new Date(s.dueDate)
      )
    );
    const onTimeClosurePct =
      closed.length > 0
        ? Math.round((onTimeClosed.length / closed.length) * 100)
        : 100;

    // By category
    const catMap = new Map<string, number>();
    all.forEach((c) => catMap.set(c.category, (catMap.get(c.category) || 0) + 1));
    const byCategory = Array.from(catMap.entries()).map(([category, count]) => ({
      category,
      count,
    }));

    // By type
    const typeMap = new Map<string, number>();
    all.forEach((c) => typeMap.set(c.type, (typeMap.get(c.type) || 0) + 1));
    const byType = Array.from(typeMap.entries()).map(([type, count]) => ({
      type,
      count,
    }));

    return {
      total: all.length,
      open: open.length,
      avgCycleDays,
      onTimeClosurePct,
      byCategory,
      byType,
    };
  }
}

export const changeControlStore = ChangeControlStore.getInstance();
