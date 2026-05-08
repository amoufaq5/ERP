"use client";

import type {
  VendorScore,
  VendorAudit,
  QualificationStatus,
  VendorCategory,
  ScoreHistory,
  VendorScorecardMetrics,
  AuditFinding,
  AuditType,
  AuditStatus,
} from "./vendor-scoring-types";

const STORAGE_KEY = "pharma.vendor-scores";

/* ── Helpers ── */

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

function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
}

function randomBetween(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 10) / 10;
}

/* ── Dimension weights ── */
const WEIGHTS = {
  quality: 0.35,
  delivery: 0.25,
  compliance: 0.25,
  commercial: 0.15,
};

/* ── Thresholds ── */
const PREFERRED_THRESHOLD = 85;
const QUALIFIED_THRESHOLD = 70;
const PROBATION_THRESHOLD = 55;

/* ── Score calculation helpers ── */

function calcQualityScore(defectRate: number, oosRate: number, capaCount: number): number {
  // defectRate 0–10% maps to 100–0; oosRate 0–5% maps to 100–0; capaCount 0–10 maps to 100–0
  const defectScore = Math.max(0, 100 - defectRate * 10);
  const oosScore = Math.max(0, 100 - oosRate * 20);
  const capaScore = Math.max(0, 100 - capaCount * 10);
  return Math.round((defectScore * 0.4 + oosScore * 0.35 + capaScore * 0.25) * 10) / 10;
}

function calcDeliveryScore(onTimePercent: number, leadTimeVariance: number): number {
  const ltScore = Math.max(0, 100 - leadTimeVariance * 5);
  return Math.round((onTimePercent * 0.7 + ltScore * 0.3) * 10) / 10;
}

function calcComplianceScore(auditScore: number, certCount: number, regStatus: string): number {
  const certScore = Math.min(100, certCount * 20);
  const regScore = regStatus === "clear" ? 100 : regStatus === "warning" ? 50 : 10;
  return Math.round((auditScore * 0.5 + certScore * 0.25 + regScore * 0.25) * 10) / 10;
}

function calcCommercialScore(pricingComp: number, paymentTerms: number): number {
  const paymentScore = Math.min(100, paymentTerms * 1.5);
  return Math.round((pricingComp * 0.6 + paymentScore * 0.4) * 10) / 10;
}

function calcOverallScore(q: number, d: number, c: number, cm: number): number {
  return Math.round(
    (q * WEIGHTS.quality + d * WEIGHTS.delivery + c * WEIGHTS.compliance + cm * WEIGHTS.commercial) * 10
  ) / 10;
}

function generateHistory(overallBase: number, qBase: number, dBase: number, cBase: number, cmBase: number): ScoreHistory[] {
  const history: ScoreHistory[] = [];
  for (let i = 11; i >= 0; i--) {
    const jitter = () => randomBetween(-3, 3);
    const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v * 10) / 10));
    const qs = clamp(qBase + jitter());
    const ds = clamp(dBase + jitter());
    const cs = clamp(cBase + jitter());
    const cms = clamp(cmBase + jitter());
    history.push({
      date: monthsAgo(i),
      qualityScore: qs,
      deliveryScore: ds,
      complianceScore: cs,
      commercialScore: cms,
      overallScore: calcOverallScore(qs, ds, cs, cms),
    });
  }
  return history;
}

function makeAudit(
  id: string,
  vendorId: string,
  auditType: AuditType,
  scheduledDate: string,
  status: AuditStatus,
  auditor: string,
  score?: number,
  completedDate?: string,
  findings: AuditFinding[] = [],
  notes?: string
): VendorAudit {
  const closed = findings.filter((f) => f.status === "closed").length;
  return {
    id,
    vendorId,
    auditType,
    scheduledDate,
    completedDate,
    auditor,
    status,
    findings,
    score,
    correctiveActionsRequired: findings.length,
    correctiveActionsClosed: closed,
    notes,
  };
}

/* ── Seed data ── */

function buildSeedData(): VendorScore[] {
  const vendors: VendorScore[] = [];

  // Helper to build a full vendor
  function v(
    id: string,
    code: string,
    name: string,
    cat: VendorCategory,
    country: string,
    contact: string,
    email: string,
    status: QualificationStatus,
    defectRate: number,
    oosRate: number,
    capaCount: number,
    onTime: number,
    ltVariance: number,
    auditSc: number,
    certs: string[],
    regStatus: "clear" | "warning" | "critical",
    priceComp: number,
    payTerms: number,
    qualifiedDate: string | undefined,
    nextReview: string,
    audits: VendorAudit[],
    notes?: string
  ): VendorScore {
    const qScore = calcQualityScore(defectRate, oosRate, capaCount);
    const dScore = calcDeliveryScore(onTime, ltVariance);
    const cScore = calcComplianceScore(auditSc, certs.length, regStatus);
    const cmScore = calcCommercialScore(priceComp, payTerms);
    const overall = calcOverallScore(qScore, dScore, cScore, cmScore);

    return {
      id,
      vendorCode: code,
      vendorName: name,
      category: cat,
      country,
      contactPerson: contact,
      contactEmail: email,
      qualificationStatus: status,
      qualifiedDate,
      nextReviewDate: nextReview,
      quality: { defectRate, oosRate, capaCount, score: qScore },
      delivery: { onTimePercent: onTime, leadTimeVariance: ltVariance, score: dScore },
      compliance: { auditScore: auditSc, certifications: certs, regulatoryStatus: regStatus, score: cScore },
      commercial: { pricingCompetitiveness: priceComp, paymentTermsDays: payTerms, score: cmScore },
      overallScore: overall,
      scoreHistory: generateHistory(overall, qScore, dScore, cScore, cmScore),
      audits,
      notes,
      createdAt: daysAgo(365),
      updatedAt: daysAgo(1),
    };
  }

  // 1 – API Supplier (Preferred)
  vendors.push(
    v(
      "vs-1", "SUP-API-001", "Aurobindo Pharma Ltd", "api-supplier",
      "India", "Dr. Rajesh Kumar", "r.kumar@aurobindo.com",
      "preferred", 0.8, 0.3, 0, 96, 1.2, 92,
      ["WHO-PQ", "EU-GMP", "US-FDA", "ISO 9001"], "clear",
      78, 60, daysAgo(300), futureDays(65),
      [
        makeAudit("a-1", "vs-1", "periodic", daysAgo(90), "completed", "Dr. Laila Farouk", 92, daysAgo(88), [
          { id: "f-1", description: "Minor deviation in batch documentation", severity: "minor", correctiveAction: "Updated SOP for batch recording", status: "closed" },
        ], "Satisfactory audit. Vendor maintains excellent GMP standards."),
        makeAudit("a-2", "vs-1", "periodic", futureDays(90), "scheduled", "Dr. Rania Abdel-Aziz"),
      ],
    )
  );

  // 2 – API Supplier (Qualified)
  vendors.push(
    v(
      "vs-2", "SUP-API-002", "Cipla Quality Chemicals", "api-supplier",
      "Uganda", "James Ochieng", "j.ochieng@ciplaqc.com",
      "qualified", 1.5, 0.8, 1, 89, 2.5, 81,
      ["WHO-PQ", "EAC-GMP"], "clear",
      82, 45, daysAgo(200), futureDays(30),
      [
        makeAudit("a-3", "vs-2", "periodic", daysAgo(60), "completed", "Dr. Laila Farouk", 81, daysAgo(58), [
          { id: "f-2", description: "Temperature excursion in API storage warehouse", severity: "major", correctiveAction: "Install redundant temperature monitoring system", dueDate: futureDays(15), status: "open" },
          { id: "f-3", description: "Incomplete cleaning validation records", severity: "minor", correctiveAction: "Revised cleaning validation protocol", status: "closed" },
        ], "Generally acceptable. One major finding requires follow-up."),
      ],
    )
  );

  // 3 – Excipient Supplier (Preferred)
  vendors.push(
    v(
      "vs-3", "SUP-EXC-001", "BASF Pharma Solutions", "excipient-supplier",
      "Germany", "Dr. Hans Mueller", "h.mueller@basf.com",
      "preferred", 0.3, 0.1, 0, 98, 0.5, 95,
      ["EU-GMP", "ISO 9001", "ISO 14001", "EXCiPACT"], "clear",
      65, 90, daysAgo(400), futureDays(120),
      [
        makeAudit("a-4", "vs-3", "periodic", daysAgo(180), "completed", "Dr. Laila Farouk", 95, daysAgo(178), [], "Excellent audit. No findings."),
        makeAudit("a-5", "vs-3", "periodic", futureDays(180), "scheduled", "Dr. Laila Farouk"),
      ],
    )
  );

  // 4 – Excipient Supplier (Probation)
  vendors.push(
    v(
      "vs-4", "SUP-EXC-002", "El Nasr Pharmaceutical Chemicals", "excipient-supplier",
      "Egypt", "Eng. Moustafa Saleh", "m.saleh@enpc.com.eg",
      "probation", 4.5, 2.8, 3, 72, 5.0, 58,
      ["EDA-GMP"], "warning",
      90, 30, daysAgo(500), futureDays(15),
      [
        makeAudit("a-6", "vs-4", "for-cause", daysAgo(30), "completed", "Dr. Rania Abdel-Aziz", 58, daysAgo(28), [
          { id: "f-4", description: "Cross-contamination risk in Lactose processing area", severity: "critical", correctiveAction: "Implement dedicated production line", dueDate: futureDays(30), status: "open" },
          { id: "f-5", description: "Inadequate pest control documentation", severity: "major", correctiveAction: "Contract with certified pest control provider", dueDate: futureDays(15), status: "open" },
          { id: "f-6", description: "Calibration certificates expired for 3 balances", severity: "major", correctiveAction: "Immediate recalibration scheduled", dueDate: daysAgo(10), status: "closed" },
          { id: "f-7", description: "Batch numbering system inconsistencies", severity: "minor", status: "open" },
        ], "Significant concerns. Vendor placed on probation pending corrective actions."),
        makeAudit("a-7", "vs-4", "follow-up", futureDays(45), "scheduled", "Dr. Rania Abdel-Aziz"),
      ],
      "Placed on probation after for-cause audit. Critical finding in cross-contamination control.",
    )
  );

  // 5 – Packaging Supplier (Qualified)
  vendors.push(
    v(
      "vs-5", "SUP-PKG-001", "Pharma Packaging Industries", "packaging-supplier",
      "Egypt", "Eng. Amira Zaghloul", "a.zaghloul@ppi-eg.com",
      "qualified", 2.0, 0.5, 1, 91, 1.8, 84,
      ["ISO 9001", "ISO 15378", "EDA-GMP"], "clear",
      85, 45, daysAgo(250), futureDays(75),
      [
        makeAudit("a-8", "vs-5", "periodic", daysAgo(120), "completed", "Eng. Mohamed Fathy", 84, daysAgo(118), [
          { id: "f-8", description: "Ink migration test not performed on latest print batch", severity: "minor", correctiveAction: "Added ink migration testing to incoming QC protocol", status: "closed" },
        ], "Acceptable. Minor finding resolved promptly."),
      ],
    )
  );

  // 6 – Packaging Supplier (Qualified)
  vendors.push(
    v(
      "vs-6", "SUP-PKG-002", "Amcor Flexibles", "packaging-supplier",
      "Switzerland", "Maria Bianchi", "m.bianchi@amcor.com",
      "qualified", 0.5, 0.2, 0, 94, 1.0, 90,
      ["ISO 9001", "ISO 15378", "EU-GMP", "BRC/IoP"], "clear",
      60, 75, daysAgo(350), futureDays(50),
      [
        makeAudit("a-9", "vs-6", "periodic", daysAgo(150), "completed", "Dr. Laila Farouk", 90, daysAgo(148), [], "Excellent audit results. World-class facility."),
      ],
    )
  );

  // 7 – Equipment Vendor (Preferred)
  vendors.push(
    v(
      "vs-7", "SUP-EQP-001", "GEA Group", "equipment-vendor",
      "Germany", "Stefan Braun", "s.braun@gea.com",
      "preferred", 0.2, 0.0, 0, 95, 2.0, 94,
      ["ISO 9001", "ISO 13485", "CE Mark"], "clear",
      55, 90, daysAgo(400), futureDays(150),
      [
        makeAudit("a-10", "vs-7", "periodic", daysAgo(200), "completed", "Eng. Mohamed Fathy", 94, daysAgo(198), [], "Excellent. FAT/SAT documentation is exemplary."),
      ],
    )
  );

  // 8 – Equipment Vendor (Qualified)
  vendors.push(
    v(
      "vs-8", "SUP-EQP-002", "Cadmach Machinery", "equipment-vendor",
      "India", "Vikram Patel", "v.patel@cadmach.com",
      "qualified", 1.0, 0.5, 1, 85, 3.5, 78,
      ["ISO 9001", "CE Mark"], "clear",
      88, 45, daysAgo(180), futureDays(60),
      [
        makeAudit("a-11", "vs-8", "periodic", daysAgo(100), "completed", "Eng. Mohamed Fathy", 78, daysAgo(98), [
          { id: "f-9", description: "Spare parts delivery lead time exceeds contract terms", severity: "minor", correctiveAction: "Establish local spare parts inventory in Cairo", dueDate: futureDays(30), status: "open" },
        ], "Acceptable performance. Spare parts logistics need improvement."),
      ],
    )
  );

  // 9 – API Supplier (Disqualified)
  vendors.push(
    v(
      "vs-9", "SUP-API-003", "Zhejiang Chemical Corp", "api-supplier",
      "China", "Li Wei", "l.wei@zjchem.cn",
      "disqualified", 8.5, 5.2, 5, 65, 8.0, 42,
      ["China-GMP"], "critical",
      92, 30, daysAgo(400), daysAgo(30),
      [
        makeAudit("a-12", "vs-9", "for-cause", daysAgo(60), "completed", "Dr. Laila Farouk", 42, daysAgo(58), [
          { id: "f-10", description: "Data integrity failure - backdated analytical records", severity: "critical", correctiveAction: "Complete data integrity remediation program", dueDate: futureDays(90), status: "open" },
          { id: "f-11", description: "API purity below specification in 3 consecutive batches", severity: "critical", correctiveAction: "Root cause investigation and process revalidation", dueDate: futureDays(60), status: "open" },
          { id: "f-12", description: "Inadequate change control for process modifications", severity: "major", status: "open" },
          { id: "f-13", description: "Environmental monitoring program deficient", severity: "major", status: "open" },
          { id: "f-14", description: "Training records incomplete", severity: "minor", status: "open" },
        ], "Vendor disqualified due to critical data integrity and quality failures."),
      ],
      "Disqualified after for-cause audit revealed critical data integrity issues.",
    )
  );

  // 10 – Excipient Supplier (New)
  vendors.push(
    v(
      "vs-10", "SUP-EXC-003", "Roquette Pharma", "excipient-supplier",
      "France", "Pierre Dupont", "p.dupont@roquette.com",
      "new", 0, 0, 0, 0, 0, 0,
      ["EU-GMP", "ISO 9001", "EXCiPACT", "ISO 22000"], "clear",
      72, 60, undefined, futureDays(30),
      [
        makeAudit("a-13", "vs-10", "initial", futureDays(14), "scheduled", "Dr. Laila Farouk"),
      ],
      "New vendor under qualification. Initial audit scheduled.",
    )
  );

  // 11 – Service Provider (Qualified)
  vendors.push(
    v(
      "vs-11", "SUP-SRV-001", "SGS Egypt", "service-provider",
      "Egypt", "Dr. Noha Ibrahim", "n.ibrahim@sgs.com",
      "qualified", 0.5, 0.2, 0, 93, 1.0, 88,
      ["ISO 17025", "ISO 9001", "EDA-Approved"], "clear",
      70, 30, daysAgo(300), futureDays(90),
      [
        makeAudit("a-14", "vs-11", "periodic", daysAgo(90), "completed", "Dr. Rania Abdel-Aziz", 88, daysAgo(88), [], "Contract testing lab. Excellent turnaround and accuracy."),
      ],
    )
  );

  // 12 – Packaging Supplier (Probation)
  vendors.push(
    v(
      "vs-12", "SUP-PKG-003", "Nile Printing & Packaging", "packaging-supplier",
      "Egypt", "Eng. Khaled Rashwan", "k.rashwan@nilepack.com.eg",
      "probation", 5.0, 1.5, 2, 74, 4.0, 62,
      ["EDA-GMP"], "warning",
      91, 30, daysAgo(350), futureDays(20),
      [
        makeAudit("a-15", "vs-12", "for-cause", daysAgo(45), "completed", "Eng. Mohamed Fathy", 62, daysAgo(43), [
          { id: "f-15", description: "Leaflet text errors found in 2 consecutive print batches", severity: "critical", correctiveAction: "Implement double-verification proof-reading process", dueDate: futureDays(10), status: "open" },
          { id: "f-16", description: "Colour consistency variation beyond specification", severity: "major", correctiveAction: "Calibrate printing presses and implement spectrophotometric QC", dueDate: futureDays(20), status: "open" },
          { id: "f-17", description: "Storage conditions for printed materials not monitored", severity: "minor", correctiveAction: "Install temperature/humidity loggers", status: "closed" },
        ], "Quality concerns with printed packaging components. Placed on probation."),
        makeAudit("a-16", "vs-12", "follow-up", futureDays(30), "scheduled", "Eng. Mohamed Fathy"),
      ],
      "Probation due to repeated leaflet printing errors.",
    )
  );

  return vendors;
}

/* ── Store class ── */

class VendorScoringStore {
  private static instance: VendorScoringStore;

  private constructor() {
    this.seed();
  }

  static getInstance(): VendorScoringStore {
    if (!VendorScoringStore.instance) {
      VendorScoringStore.instance = new VendorScoringStore();
    }
    return VendorScoringStore.instance;
  }

  private seed(): void {
    if (typeof window === "undefined") return;
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buildSeedData()));
    }
  }

  private load(): VendorScore[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as VendorScore[]) : [];
  }

  private save(data: VendorScore[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /* ── CRUD ── */

  getAll(): VendorScore[] {
    return this.load();
  }

  getById(id: string): VendorScore | undefined {
    return this.load().find((v) => v.id === id);
  }

  create(vendor: Omit<VendorScore, "id" | "overallScore" | "scoreHistory" | "createdAt" | "updatedAt">): VendorScore {
    const all = this.load();
    const newVendor: VendorScore = {
      ...vendor,
      id: `vs-${Date.now()}`,
      overallScore: calcOverallScore(
        vendor.quality.score,
        vendor.delivery.score,
        vendor.compliance.score,
        vendor.commercial.score
      ),
      scoreHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    all.push(newVendor);
    this.save(all);
    return newVendor;
  }

  update(id: string, updates: Partial<VendorScore>): VendorScore | undefined {
    const all = this.load();
    const idx = all.findIndex((v) => v.id === id);
    if (idx === -1) return undefined;
    all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save(all);
    return all[idx];
  }

  delete(id: string): boolean {
    const all = this.load();
    const filtered = all.filter((v) => v.id !== id);
    if (filtered.length === all.length) return false;
    this.save(filtered);
    return true;
  }

  /* ── Score recalculation ── */

  recalculateScores(id: string): VendorScore | undefined {
    const vendor = this.getById(id);
    if (!vendor) return undefined;

    const qScore = calcQualityScore(
      vendor.quality.defectRate,
      vendor.quality.oosRate,
      vendor.quality.capaCount
    );
    const dScore = calcDeliveryScore(
      vendor.delivery.onTimePercent,
      vendor.delivery.leadTimeVariance
    );
    const cScore = calcComplianceScore(
      vendor.compliance.auditScore,
      vendor.compliance.certifications.length,
      vendor.compliance.regulatoryStatus
    );
    const cmScore = calcCommercialScore(
      vendor.commercial.pricingCompetitiveness,
      vendor.commercial.paymentTermsDays
    );
    const overall = calcOverallScore(qScore, dScore, cScore, cmScore);

    return this.update(id, {
      quality: { ...vendor.quality, score: qScore },
      delivery: { ...vendor.delivery, score: dScore },
      compliance: { ...vendor.compliance, score: cScore },
      commercial: { ...vendor.commercial, score: cmScore },
      overallScore: overall,
    });
  }

  /* ── Auto-qualification based on score thresholds ── */

  autoQualify(id: string): VendorScore | undefined {
    const vendor = this.getById(id);
    if (!vendor) return undefined;
    if (vendor.qualificationStatus === "disqualified") return vendor;
    if (vendor.qualificationStatus === "new") return vendor;

    let newStatus: QualificationStatus = vendor.qualificationStatus;
    if (vendor.overallScore >= PREFERRED_THRESHOLD) {
      newStatus = "preferred";
    } else if (vendor.overallScore >= QUALIFIED_THRESHOLD) {
      newStatus = "qualified";
    } else if (vendor.overallScore >= PROBATION_THRESHOLD) {
      newStatus = "probation";
    } else {
      newStatus = "disqualified";
    }

    if (newStatus !== vendor.qualificationStatus) {
      return this.update(id, { qualificationStatus: newStatus });
    }
    return vendor;
  }

  /* ── Query methods ── */

  getByStatus(status: QualificationStatus): VendorScore[] {
    return this.load().filter((v) => v.qualificationStatus === status);
  }

  getByCategory(category: VendorCategory): VendorScore[] {
    return this.load().filter((v) => v.category === category);
  }

  getTopPerformers(limit: number = 5): VendorScore[] {
    return this.load()
      .filter((v) => v.qualificationStatus !== "new" && v.qualificationStatus !== "disqualified")
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, limit);
  }

  getAtRisk(): VendorScore[] {
    return this.load().filter(
      (v) =>
        v.qualificationStatus === "probation" ||
        v.overallScore < QUALIFIED_THRESHOLD ||
        v.compliance.regulatoryStatus !== "clear"
    );
  }

  /* ── Audit methods ── */

  getUpcomingAudits(): VendorAudit[] {
    const all = this.load();
    const audits: VendorAudit[] = [];
    for (const vendor of all) {
      for (const audit of vendor.audits) {
        if (audit.status === "scheduled") {
          audits.push(audit);
        }
      }
    }
    return audits.sort(
      (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );
  }

  getCompletedAudits(): VendorAudit[] {
    const all = this.load();
    const audits: VendorAudit[] = [];
    for (const vendor of all) {
      for (const audit of vendor.audits) {
        if (audit.status === "completed") {
          audits.push(audit);
        }
      }
    }
    return audits.sort(
      (a, b) =>
        new Date(b.completedDate || b.scheduledDate).getTime() -
        new Date(a.completedDate || a.scheduledDate).getTime()
    );
  }

  getAllAudits(): VendorAudit[] {
    const all = this.load();
    const audits: VendorAudit[] = [];
    for (const vendor of all) {
      for (const audit of vendor.audits) {
        audits.push(audit);
      }
    }
    return audits;
  }

  addAudit(vendorId: string, audit: Omit<VendorAudit, "id" | "vendorId" | "correctiveActionsRequired" | "correctiveActionsClosed">): VendorAudit | undefined {
    const vendor = this.getById(vendorId);
    if (!vendor) return undefined;

    const newAudit: VendorAudit = {
      ...audit,
      id: `a-${Date.now()}`,
      vendorId,
      correctiveActionsRequired: audit.findings.length,
      correctiveActionsClosed: audit.findings.filter((f) => f.status === "closed").length,
    };
    const audits = [...vendor.audits, newAudit];
    this.update(vendorId, { audits });
    return newAudit;
  }

  updateAuditStatus(vendorId: string, auditId: string, status: AuditStatus, score?: number): VendorAudit | undefined {
    const vendor = this.getById(vendorId);
    if (!vendor) return undefined;

    const audits = vendor.audits.map((a) => {
      if (a.id === auditId) {
        return {
          ...a,
          status,
          score: score ?? a.score,
          completedDate: status === "completed" ? new Date().toISOString() : a.completedDate,
        };
      }
      return a;
    });
    this.update(vendorId, { audits });
    return audits.find((a) => a.id === auditId);
  }

  /* ── Change qualification status ── */

  setQualificationStatus(id: string, status: QualificationStatus): VendorScore | undefined {
    const updates: Partial<VendorScore> = { qualificationStatus: status };
    if (status === "qualified" || status === "preferred") {
      updates.qualifiedDate = new Date().toISOString();
    }
    return this.update(id, updates);
  }

  /* ── Dashboard metrics ── */

  getMetrics(): VendorScorecardMetrics {
    const all = this.load();
    const active = all.filter((v) => v.qualificationStatus !== "new");

    const qualifiedCount = all.filter((v) => v.qualificationStatus === "qualified").length;
    const preferredCount = all.filter((v) => v.qualificationStatus === "preferred").length;
    const probationCount = all.filter((v) => v.qualificationStatus === "probation").length;
    const disqualifiedCount = all.filter((v) => v.qualificationStatus === "disqualified").length;
    const newCount = all.filter((v) => v.qualificationStatus === "new").length;

    const averageScore =
      active.length > 0
        ? Math.round((active.reduce((sum, v) => sum + v.overallScore, 0) / active.length) * 10) / 10
        : 0;

    const topPerformers = this.getTopPerformers(5).map((v) => ({
      vendorName: v.vendorName,
      score: v.overallScore,
    }));

    const atRiskVendors = this.getAtRisk().map((v) => {
      let reason = "Low overall score";
      if (v.qualificationStatus === "probation") reason = "On probation";
      if (v.compliance.regulatoryStatus === "critical") reason = "Critical regulatory status";
      if (v.compliance.regulatoryStatus === "warning") reason = "Regulatory warning";
      return { vendorName: v.vendorName, score: v.overallScore, reason };
    });

    const catMap = new Map<VendorCategory, { count: number; totalScore: number }>();
    for (const v of all) {
      const entry = catMap.get(v.category) || { count: 0, totalScore: 0 };
      entry.count++;
      entry.totalScore += v.overallScore;
      catMap.set(v.category, entry);
    }
    const byCategory = Array.from(catMap.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      avgScore: Math.round((data.totalScore / data.count) * 10) / 10,
    }));

    return {
      totalVendors: all.length,
      qualifiedCount,
      preferredCount,
      probationCount,
      disqualifiedCount,
      newCount,
      averageScore,
      topPerformers,
      atRiskVendors,
      byCategory,
    };
  }
}

export const vendorScoringStore = VendorScoringStore.getInstance();
