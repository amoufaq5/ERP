"use client";

import type {
  BatchRelease,
  ReleaseStatus,
  ChecklistItem,
  ChecklistCategory,
  QPDecision,
  RegulatoryHold,
  ReleaseMetrics,
  ReleaseChecklist,
} from "./batch-release-types";

const STORAGE_KEY = "pharma.batch-releases";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function monthsFromNow(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d.toISOString();
}

// ─── Checklist Template ──────────────────────────────────────────────────────

function makeChecklist(overrides?: Partial<Record<string, Partial<ChecklistItem>>>): ReleaseChecklist {
  const items: ChecklistItem[] = [
    // Manufacturing (5 items)
    { id: "mfg-1", category: "manufacturing", description: "Batch Production Record (BPR) reviewed and complete", required: true, status: "pending" },
    { id: "mfg-2", category: "manufacturing", description: "Yield within acceptable range (95-105%)", required: true, status: "pending" },
    { id: "mfg-3", category: "manufacturing", description: "All deviations investigated and closed", required: true, status: "pending" },
    { id: "mfg-4", category: "manufacturing", description: "In-process controls within specification", required: true, status: "pending" },
    { id: "mfg-5", category: "manufacturing", description: "Equipment cleaning verification confirmed", required: false, status: "pending" },
    // QC (5 items)
    { id: "qc-1", category: "qc", description: "Certificate of Analysis (CoA) reviewed and approved", required: true, status: "pending" },
    { id: "qc-2", category: "qc", description: "Stability data supports proposed shelf life", required: true, status: "pending" },
    { id: "qc-3", category: "qc", description: "No outstanding OOS investigations for this batch", required: true, status: "pending" },
    { id: "qc-4", category: "qc", description: "Microbial testing results within limits", required: true, status: "pending" },
    { id: "qc-5", category: "qc", description: "Raw material CoAs verified for all components", required: false, status: "pending" },
    // Regulatory (4 items)
    { id: "reg-1", category: "regulatory", description: "Product registration status confirmed with EDA", required: true, status: "pending" },
    { id: "reg-2", category: "regulatory", description: "Label content compliant with approved dossier", required: true, status: "pending" },
    { id: "reg-3", category: "regulatory", description: "Shelf life assignment consistent with stability data", required: true, status: "pending" },
    { id: "reg-4", category: "regulatory", description: "No pending regulatory variations affecting this product", required: false, status: "pending" },
    // Documentation (4 items)
    { id: "doc-1", category: "documentation", description: "Batch record complete with no missing pages", required: true, status: "pending" },
    { id: "doc-2", category: "documentation", description: "All signatures and initials present and verified", required: true, status: "pending" },
    { id: "doc-3", category: "documentation", description: "Environmental monitoring data acceptable for production period", required: true, status: "pending" },
    { id: "doc-4", category: "documentation", description: "Packaging reconciliation within acceptable limits", required: false, status: "pending" },
  ];

  if (overrides) {
    for (const item of items) {
      const ovr = overrides[item.id];
      if (ovr) {
        Object.assign(item, ovr);
      }
    }
  }

  return { items };
}

function allPassed(reviewer: string, baseDaysAgo: number): Partial<Record<string, Partial<ChecklistItem>>> {
  const o: Partial<Record<string, Partial<ChecklistItem>>> = {};
  const ids = [
    "mfg-1","mfg-2","mfg-3","mfg-4","mfg-5",
    "qc-1","qc-2","qc-3","qc-4","qc-5",
    "reg-1","reg-2","reg-3","reg-4",
    "doc-1","doc-2","doc-3","doc-4",
  ];
  ids.forEach((id, i) => {
    o[id] = { status: "passed", reviewer, date: daysAgo(baseDaysAgo - i % 3) };
  });
  return o;
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

const SEED_DATA: BatchRelease[] = [
  // ── 5 released-to-market ──────────────────────────────────────────────────
  {
    id: "rel-1",
    number: "REL-2026-001",
    product: "Amoxicillin 500mg Tablets",
    batchNumber: "AMX-2026-B001",
    batchSize: "500,000 tablets",
    manufacturingDate: daysAgo(45),
    expiryDate: monthsFromNow(24),
    status: "released-to-market",
    priority: "normal",
    assignedQP: "Dr. Laila Farouk",
    reviewStartedAt: daysAgo(40),
    checklist: makeChecklist(allPassed("Dr. Laila Farouk", 38)),
    linkedRecords: {
      bprNumber: "BPR-AMX-2026-001",
      coaNumber: "COA-AMX-2026-001",
      stabilityStudy: "STAB-AMX-500-V3",
    },
    qpDecision: {
      qpName: "Dr. Laila Farouk",
      decision: "release",
      justification: "All quality parameters met. BPR complete, CoA approved, no deviations. Batch approved for commercial distribution.",
      date: daysAgo(35),
      signature: "LF-QP-2026-001",
    },
    releasedToMarketAt: daysAgo(34),
    createdAt: daysAgo(42),
    updatedAt: daysAgo(34),
  },
  {
    id: "rel-2",
    number: "REL-2026-002",
    product: "Metformin 850mg Tablets",
    batchNumber: "MET-2026-B003",
    batchSize: "750,000 tablets",
    manufacturingDate: daysAgo(38),
    expiryDate: monthsFromNow(30),
    status: "released-to-market",
    priority: "normal",
    assignedQP: "Dr. Laila Farouk",
    reviewStartedAt: daysAgo(33),
    checklist: makeChecklist(allPassed("Dr. Laila Farouk", 30)),
    linkedRecords: {
      bprNumber: "BPR-MET-2026-003",
      coaNumber: "COA-MET-2026-003",
      stabilityStudy: "STAB-MET-850-V2",
      deviations: ["DEV-2026-012"],
    },
    qpDecision: {
      qpName: "Dr. Laila Farouk",
      decision: "release",
      justification: "Minor deviation (DEV-2026-012) investigated and closed with no impact on product quality. All specifications met.",
      date: daysAgo(28),
      signature: "LF-QP-2026-002",
    },
    releasedToMarketAt: daysAgo(27),
    createdAt: daysAgo(35),
    updatedAt: daysAgo(27),
  },
  {
    id: "rel-3",
    number: "REL-2026-003",
    product: "Paracetamol 500mg Tablets",
    batchNumber: "PCM-2026-B005",
    batchSize: "1,000,000 tablets",
    manufacturingDate: daysAgo(30),
    expiryDate: monthsFromNow(36),
    status: "released-to-market",
    priority: "normal",
    assignedQP: "Dr. Rania Abdel-Aziz",
    reviewStartedAt: daysAgo(25),
    checklist: makeChecklist(allPassed("Dr. Rania Abdel-Aziz", 22)),
    linkedRecords: {
      bprNumber: "BPR-PCM-2026-005",
      coaNumber: "COA-PCM-2026-005",
      stabilityStudy: "STAB-PCM-500-V4",
    },
    qpDecision: {
      qpName: "Dr. Rania Abdel-Aziz",
      decision: "release",
      justification: "Batch manufactured and tested per approved BMR. All results within specification. No deviations or OOS events.",
      date: daysAgo(20),
      signature: "RA-QP-2026-003",
    },
    releasedToMarketAt: daysAgo(19),
    createdAt: daysAgo(28),
    updatedAt: daysAgo(19),
  },
  {
    id: "rel-4",
    number: "REL-2026-004",
    product: "Omeprazole 20mg Capsules",
    batchNumber: "OMP-2026-B002",
    batchSize: "300,000 capsules",
    manufacturingDate: daysAgo(25),
    expiryDate: monthsFromNow(18),
    status: "released-to-market",
    priority: "normal",
    assignedQP: "Dr. Laila Farouk",
    reviewStartedAt: daysAgo(20),
    checklist: makeChecklist(allPassed("Dr. Laila Farouk", 17)),
    linkedRecords: {
      bprNumber: "BPR-OMP-2026-002",
      coaNumber: "COA-OMP-2026-002",
      stabilityStudy: "STAB-OMP-020-V2",
      changeControls: ["CC-2026-009"],
    },
    qpDecision: {
      qpName: "Dr. Laila Farouk",
      decision: "release",
      justification: "Product manufactured with new Al/Al blister per approved change control CC-2026-009. All quality attributes confirmed.",
      date: daysAgo(15),
      signature: "LF-QP-2026-004",
    },
    releasedToMarketAt: daysAgo(14),
    createdAt: daysAgo(22),
    updatedAt: daysAgo(14),
  },
  {
    id: "rel-5",
    number: "REL-2026-005",
    product: "Gentamicin 80mg/2ml Injection",
    batchNumber: "GNT-2026-B001",
    batchSize: "50,000 ampoules",
    manufacturingDate: daysAgo(20),
    expiryDate: monthsFromNow(24),
    status: "released-to-market",
    priority: "high",
    assignedQP: "Dr. Rania Abdel-Aziz",
    reviewStartedAt: daysAgo(15),
    checklist: makeChecklist(allPassed("Dr. Rania Abdel-Aziz", 12)),
    linkedRecords: {
      bprNumber: "BPR-GNT-2026-001",
      coaNumber: "COA-GNT-2026-001",
      stabilityStudy: "STAB-GNT-080-V1",
    },
    qpDecision: {
      qpName: "Dr. Rania Abdel-Aziz",
      decision: "release",
      justification: "Sterility test passed. Endotoxin within limits. All sterile manufacturing parameters verified. Batch approved.",
      date: daysAgo(10),
      signature: "RA-QP-2026-005",
    },
    releasedToMarketAt: daysAgo(9),
    createdAt: daysAgo(18),
    updatedAt: daysAgo(9),
  },

  // ── 2 under-review ────────────────────────────────────────────────────────
  {
    id: "rel-6",
    number: "REL-2026-006",
    product: "Amoxicillin 500mg Tablets",
    batchNumber: "AMX-2026-B004",
    batchSize: "500,000 tablets",
    manufacturingDate: daysAgo(10),
    expiryDate: monthsFromNow(24),
    status: "under-review",
    priority: "normal",
    assignedQP: "Dr. Laila Farouk",
    reviewStartedAt: daysAgo(5),
    checklist: makeChecklist({
      "mfg-1": { status: "passed", reviewer: "Pharm. Mariam Khalil", date: daysAgo(4) },
      "mfg-2": { status: "passed", reviewer: "Pharm. Mariam Khalil", date: daysAgo(4) },
      "mfg-3": { status: "passed", reviewer: "Pharm. Mariam Khalil", date: daysAgo(3) },
      "mfg-4": { status: "passed", reviewer: "Pharm. Mariam Khalil", date: daysAgo(3) },
      "mfg-5": { status: "passed", reviewer: "Pharm. Mariam Khalil", date: daysAgo(3) },
      "qc-1": { status: "passed", reviewer: "Dr. Rania Abdel-Aziz", date: daysAgo(2) },
      "qc-2": { status: "passed", reviewer: "Dr. Rania Abdel-Aziz", date: daysAgo(2) },
      "qc-3": { status: "pending" },
      "qc-4": { status: "pending" },
      "reg-1": { status: "passed", reviewer: "Dr. Heba Mostafa", date: daysAgo(3) },
      "reg-2": { status: "passed", reviewer: "Dr. Heba Mostafa", date: daysAgo(3) },
      "doc-1": { status: "passed", reviewer: "Pharm. Mariam Khalil", date: daysAgo(4) },
    }),
    linkedRecords: {
      bprNumber: "BPR-AMX-2026-004",
      coaNumber: "COA-AMX-2026-004",
      stabilityStudy: "STAB-AMX-500-V3",
    },
    createdAt: daysAgo(8),
    updatedAt: daysAgo(2),
  },
  {
    id: "rel-7",
    number: "REL-2026-007",
    product: "Metformin 500mg Tablets",
    batchNumber: "MET-2026-B006",
    batchSize: "600,000 tablets",
    manufacturingDate: daysAgo(12),
    expiryDate: monthsFromNow(30),
    status: "under-review",
    priority: "high",
    assignedQP: "Dr. Rania Abdel-Aziz",
    reviewStartedAt: daysAgo(7),
    checklist: makeChecklist({
      "mfg-1": { status: "passed", reviewer: "Dr. Youssef Kamel", date: daysAgo(6) },
      "mfg-2": { status: "passed", reviewer: "Dr. Youssef Kamel", date: daysAgo(6) },
      "mfg-3": { status: "failed", reviewer: "Dr. Youssef Kamel", date: daysAgo(5), comments: "Deviation DEV-2026-018 still under investigation" },
      "mfg-4": { status: "passed", reviewer: "Dr. Youssef Kamel", date: daysAgo(5) },
      "qc-1": { status: "passed", reviewer: "QC Lab", date: daysAgo(4) },
      "qc-2": { status: "passed", reviewer: "QC Lab", date: daysAgo(4) },
      "qc-3": { status: "passed", reviewer: "QC Lab", date: daysAgo(3) },
      "qc-4": { status: "passed", reviewer: "QC Lab", date: daysAgo(3) },
      "qc-5": { status: "passed", reviewer: "QC Lab", date: daysAgo(3) },
      "reg-1": { status: "passed", reviewer: "Dr. Heba Mostafa", date: daysAgo(5) },
      "doc-1": { status: "passed", reviewer: "Pharm. Mariam Khalil", date: daysAgo(6) },
      "doc-2": { status: "passed", reviewer: "Pharm. Mariam Khalil", date: daysAgo(6) },
    }),
    linkedRecords: {
      bprNumber: "BPR-MET-2026-006",
      coaNumber: "COA-MET-2026-006",
      stabilityStudy: "STAB-MET-500-V3",
      deviations: ["DEV-2026-018"],
    },
    createdAt: daysAgo(10),
    updatedAt: daysAgo(3),
  },

  // ── 2 pending-review ──────────────────────────────────────────────────────
  {
    id: "rel-8",
    number: "REL-2026-008",
    product: "Ranitidine 50mg/2ml Injection",
    batchNumber: "RAN-2026-B002",
    batchSize: "40,000 ampoules",
    manufacturingDate: daysAgo(7),
    expiryDate: monthsFromNow(18),
    status: "pending-review",
    priority: "urgent",
    checklist: makeChecklist(),
    linkedRecords: {
      bprNumber: "BPR-RAN-2026-002",
      coaNumber: "COA-RAN-2026-002",
      stabilityStudy: "STAB-RAN-050-V1",
    },
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },
  {
    id: "rel-9",
    number: "REL-2026-009",
    product: "Paracetamol 500mg Tablets",
    batchNumber: "PCM-2026-B008",
    batchSize: "1,000,000 tablets",
    manufacturingDate: daysAgo(5),
    expiryDate: monthsFromNow(36),
    status: "pending-review",
    priority: "normal",
    checklist: makeChecklist(),
    linkedRecords: {
      bprNumber: "BPR-PCM-2026-008",
      coaNumber: "COA-PCM-2026-008",
      stabilityStudy: "STAB-PCM-500-V4",
    },
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },

  // ── 1 qp-review ───────────────────────────────────────────────────────────
  {
    id: "rel-10",
    number: "REL-2026-010",
    product: "Metformin 1000mg Tablets",
    batchNumber: "MET-2026-B007",
    batchSize: "400,000 tablets",
    manufacturingDate: daysAgo(15),
    expiryDate: monthsFromNow(30),
    status: "qp-review",
    priority: "high",
    assignedQP: "Dr. Laila Farouk",
    reviewStartedAt: daysAgo(10),
    checklist: makeChecklist(allPassed("Dr. Laila Farouk", 6)),
    linkedRecords: {
      bprNumber: "BPR-MET-2026-007",
      coaNumber: "COA-MET-2026-007",
      stabilityStudy: "STAB-MET-1000-V1",
      oosInvestigations: ["OOS-2026-005"],
    },
    createdAt: daysAgo(13),
    updatedAt: daysAgo(3),
  },

  // ── 1 rejected ─────────────────────────────────────────────────────────────
  {
    id: "rel-11",
    number: "REL-2026-011",
    product: "Omeprazole 20mg Capsules",
    batchNumber: "OMP-2026-B004",
    batchSize: "300,000 capsules",
    manufacturingDate: daysAgo(22),
    expiryDate: monthsFromNow(18),
    status: "rejected",
    priority: "normal",
    assignedQP: "Dr. Laila Farouk",
    reviewStartedAt: daysAgo(18),
    checklist: makeChecklist({
      ...allPassed("Dr. Laila Farouk", 15),
      "qc-3": { status: "failed", reviewer: "Dr. Rania Abdel-Aziz", date: daysAgo(14), comments: "OOS-2026-007 confirmed: dissolution failure at 30 min timepoint" },
      "mfg-3": { status: "failed", reviewer: "Pharm. Mariam Khalil", date: daysAgo(14), comments: "Deviation DEV-2026-015 linked to coating process upset" },
    }),
    linkedRecords: {
      bprNumber: "BPR-OMP-2026-004",
      coaNumber: "COA-OMP-2026-004",
      stabilityStudy: "STAB-OMP-020-V2",
      deviations: ["DEV-2026-015"],
      oosInvestigations: ["OOS-2026-007"],
    },
    qpDecision: {
      qpName: "Dr. Laila Farouk",
      decision: "reject",
      justification: "Batch fails dissolution specification at 30 min timepoint (confirmed OOS-2026-007). Coating process deviation (DEV-2026-015) identified as root cause. Batch cannot be released for commercial distribution.",
      date: daysAgo(12),
      signature: "LF-QP-2026-011",
    },
    createdAt: daysAgo(20),
    updatedAt: daysAgo(12),
  },

  // ── 1 on-hold ──────────────────────────────────────────────────────────────
  {
    id: "rel-12",
    number: "REL-2026-012",
    product: "Gentamicin 80mg/2ml Injection",
    batchNumber: "GNT-2026-B003",
    batchSize: "50,000 ampoules",
    manufacturingDate: daysAgo(14),
    expiryDate: monthsFromNow(24),
    status: "on-hold",
    priority: "high",
    assignedQP: "Dr. Rania Abdel-Aziz",
    reviewStartedAt: daysAgo(10),
    checklist: makeChecklist({
      ...allPassed("Dr. Rania Abdel-Aziz", 8),
      "qc-4": { status: "pending", comments: "Awaiting repeat sterility test results (14-day incubation)" },
    }),
    linkedRecords: {
      bprNumber: "BPR-GNT-2026-003",
      coaNumber: "COA-GNT-2026-003",
      stabilityStudy: "STAB-GNT-080-V1",
      oosInvestigations: ["OOS-2026-008"],
    },
    regulatoryHold: {
      reason: "Initial sterility test showed presumptive positive result. Repeat testing initiated per SOP-QC-055. Batch held pending 14-day sterility retest completion.",
      placedBy: "Dr. Rania Abdel-Aziz",
      date: daysAgo(6),
      expectedResolution: futureDays(8),
    },
    createdAt: daysAgo(12),
    updatedAt: daysAgo(6),
  },
];

// ─── Store ───────────────────────────────────────────────────────────────────

class BatchReleaseStore {
  private static instance: BatchReleaseStore;

  private constructor() {
    this.seed();
  }

  static getInstance(): BatchReleaseStore {
    if (!BatchReleaseStore.instance) {
      BatchReleaseStore.instance = new BatchReleaseStore();
    }
    return BatchReleaseStore.instance;
  }

  private seed(): void {
    if (typeof window === "undefined") return;
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
    }
  }

  private load(): BatchRelease[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BatchRelease[]) : [];
  }

  private save(data: BatchRelease[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // ── CRUD ────────────────────────────────────────────────────────────────

  getAll(): BatchRelease[] {
    return this.load();
  }

  getById(id: string): BatchRelease | undefined {
    return this.load().find((r) => r.id === id);
  }

  create(release: Omit<BatchRelease, "id" | "number" | "createdAt" | "updatedAt">): BatchRelease {
    if (!release.product?.trim()) throw new Error("Batch release product is required");
    if (!release.batchNumber?.trim()) throw new Error("Batch release batch number is required");
    const all = this.load();
    const newRelease: BatchRelease = {
      ...release,
      id: `rel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      number: this.generateNumber(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    all.push(newRelease);
    this.save(all);
    return newRelease;
  }

  update(id: string, updates: Partial<BatchRelease>): BatchRelease | undefined {
    const all = this.load();
    const idx = all.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save(all);
    return all[idx];
  }

  delete(id: string): boolean {
    const all = this.load();
    const idx = all.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    all.splice(idx, 1);
    this.save(all);
    return true;
  }

  // ── Queries ─────────────────────────────────────────────────────────────

  getByStatus(status: ReleaseStatus): BatchRelease[] {
    return this.load().filter((r) => r.status === status);
  }

  getPending(): BatchRelease[] {
    const pendingStatuses: ReleaseStatus[] = ["pending-review", "under-review", "checklist-complete", "qp-review"];
    return this.load().filter((r) => pendingStatuses.includes(r.status));
  }

  getByProduct(product: string): BatchRelease[] {
    return this.load().filter((r) => r.product === product);
  }

  getOnHold(): BatchRelease[] {
    return this.load().filter((r) => r.status === "on-hold");
  }

  getReleased(): BatchRelease[] {
    return this.load().filter((r) => r.status === "released-to-market");
  }

  getRejected(): BatchRelease[] {
    return this.load().filter((r) => r.status === "rejected");
  }

  // ── Workflow ────────────────────────────────────────────────────────────

  startReview(id: string, qpName: string): BatchRelease | undefined {
    return this.update(id, {
      status: "under-review",
      assignedQP: qpName,
      reviewStartedAt: new Date().toISOString(),
    });
  }

  completeChecklistItem(
    id: string,
    itemId: string,
    status: "passed" | "failed" | "na",
    reviewer: string,
    comments?: string
  ): BatchRelease | undefined {
    const release = this.getById(id);
    if (!release) return undefined;

    const items = release.checklist.items.map((item) =>
      item.id === itemId
        ? { ...item, status, reviewer, date: new Date().toISOString(), comments: comments || item.comments }
        : item
    );

    const updatedRelease = this.update(id, { checklist: { items } });

    // Auto-advance to checklist-complete if all required items are done
    if (updatedRelease) {
      const allRequiredDone = updatedRelease.checklist.items
        .filter((i) => i.required)
        .every((i) => i.status === "passed" || i.status === "na");
      const allDone = updatedRelease.checklist.items.every(
        (i) => i.status !== "pending"
      );
      if (allRequiredDone && allDone && updatedRelease.status === "under-review") {
        return this.update(id, { status: "checklist-complete" });
      }
    }
    return updatedRelease;
  }

  submitForQP(id: string): BatchRelease | undefined {
    return this.update(id, { status: "qp-review" });
  }

  recordQPDecision(id: string, decision: QPDecision): BatchRelease | undefined {
    const newStatus: ReleaseStatus =
      decision.decision === "release" ? "approved"
      : decision.decision === "reject" ? "rejected"
      : "on-hold";

    return this.update(id, {
      status: newStatus,
      qpDecision: decision,
    });
  }

  releaseToMarket(id: string): BatchRelease | undefined {
    return this.update(id, {
      status: "released-to-market",
      releasedToMarketAt: new Date().toISOString(),
    });
  }

  placeOnHold(id: string, hold: RegulatoryHold): BatchRelease | undefined {
    return this.update(id, {
      status: "on-hold",
      regulatoryHold: hold,
    });
  }

  removeHold(id: string): BatchRelease | undefined {
    const release = this.getById(id);
    if (!release) return undefined;
    return this.update(id, {
      status: "under-review",
      regulatoryHold: undefined,
    });
  }

  // ── Number Generation ───────────────────────────────────────────────────

  generateNumber(): string {
    const all = this.load();
    const year = new Date().getFullYear();
    const prefix = `REL-${year}-`;
    const existing = all
      .filter((r) => r.number.startsWith(prefix))
      .map((r) => parseInt(r.number.replace(prefix, ""), 10))
      .filter((n) => !isNaN(n));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `${prefix}${String(next).padStart(3, "0")}`;
  }

  // ── Metrics ─────────────────────────────────────────────────────────────

  getMetrics(): ReleaseMetrics {
    const all = this.load();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const pending = all.filter((r) => r.status === "pending-review").length;
    const underReview = all.filter((r) =>
      ["under-review", "checklist-complete", "qp-review"].includes(r.status)
    ).length;
    const onHold = all.filter((r) => r.status === "on-hold").length;

    const released = all.filter((r) => r.status === "released-to-market");
    const totalReleased = released.length;

    const releasedThisMonth = released.filter(
      (r) => r.releasedToMarketAt && new Date(r.releasedToMarketAt) >= startOfMonth
    ).length;

    // Average review days for released batches
    const reviewDays = released
      .filter((r) => r.reviewStartedAt && r.releasedToMarketAt)
      .map((r) => daysBetween(r.reviewStartedAt!, r.releasedToMarketAt!));
    const avgReviewDays =
      reviewDays.length > 0
        ? Math.round(reviewDays.reduce((s, d) => s + d, 0) / reviewDays.length)
        : 0;

    // Rejection rate
    const decided = all.filter((r) =>
      ["released-to-market", "rejected"].includes(r.status)
    );
    const rejected = all.filter((r) => r.status === "rejected").length;
    const rejectionRate =
      decided.length > 0 ? Math.round((rejected / decided.length) * 100) : 0;

    return {
      pending,
      underReview,
      releasedThisMonth,
      avgReviewDays,
      rejectionRate,
      onHold,
      totalReleased,
    };
  }
}

export const batchReleaseStore = BatchReleaseStore.getInstance();
