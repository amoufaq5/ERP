"use client";

import type {
  SupplierQualityAgreement,
  SQAStatus,
  MaterialSpecification,
  CertificateOfAnalysis,
  ApprovedSupplierEntry,
  MaterialQualification,
  SupplierQualityMetrics,
  CoAComplianceStatus,
  MaterialType,
} from "./supplier-quality-types";

const STORAGE_KEY = "pharma.supplier-quality";

/* ─── Helpers ─── */

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

function dateStr(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day).toISOString();
}

/* ─── Seed: Quality Agreements (10) ─── */

const SEED_AGREEMENTS: SupplierQualityAgreement[] = [
  {
    id: "sqa-1",
    number: "SQA-2025-001",
    supplierName: "Aurobindo Pharma Ltd",
    supplierCode: "SUP-API-001",
    materialType: "api",
    materialsScope: ["Amoxicillin Trihydrate", "Metformin HCl"],
    effectiveDate: dateStr(2025, 1, 15),
    expiryDate: dateStr(2027, 1, 14),
    reviewDate: dateStr(2026, 7, 15),
    status: "active",
    version: "2.0",
    terms: [
      "CoA to be provided with each shipment per ICH Q7 requirements",
      "Annual GMP audit permitted with 30-day notice",
      "Change notification required 90 days prior to any process change",
    ],
    reviewHistory: [
      { date: dateStr(2025, 7, 10), reviewer: "Dr. Laila Farouk", notes: "Annual review - no changes required" },
    ],
    contactPerson: "Mr. Rajesh Kumar",
    contactEmail: "r.kumar@aurobindo.com",
    createdAt: dateStr(2024, 12, 1),
    updatedAt: dateStr(2025, 7, 10),
  },
  {
    id: "sqa-2",
    number: "SQA-2025-004",
    supplierName: "BASF Pharma Solutions",
    supplierCode: "SUP-EXC-001",
    materialType: "excipient",
    materialsScope: ["HPMC (Hypromellose)", "Kollidon VA 64"],
    effectiveDate: dateStr(2025, 2, 1),
    expiryDate: dateStr(2027, 1, 31),
    reviewDate: dateStr(2026, 8, 1),
    status: "active",
    version: "1.1",
    terms: [
      "CoA per EP monograph for each batch",
      "IPEC-PQG GMP compliance maintained",
      "Annual change notification summary",
    ],
    reviewHistory: [],
    contactPerson: "Ms. Anna Mueller",
    contactEmail: "anna.mueller@basf.com",
    createdAt: dateStr(2025, 1, 15),
    updatedAt: dateStr(2025, 1, 15),
  },
  {
    id: "sqa-3",
    number: "SQA-2024-001",
    supplierName: "Dishman Carbogen Amcis",
    supplierCode: "SUP-API-004",
    materialType: "api",
    materialsScope: ["Losartan Potassium"],
    effectiveDate: dateStr(2024, 1, 1),
    expiryDate: dateStr(2025, 12, 31),
    reviewDate: dateStr(2025, 6, 1),
    status: "expired",
    version: "1.0",
    terms: [
      "CoA per USP monograph with each delivery",
      "Annual audit right",
      "Nitrosamine testing per ICH M7 guidance",
    ],
    reviewHistory: [
      { date: dateStr(2025, 6, 5), reviewer: "Dr. Nadia Soliman", notes: "Review overdue - agreement expired, pending renewal" },
    ],
    contactPerson: "Dr. Vikram Patel",
    contactEmail: "v.patel@dishman.com",
    createdAt: dateStr(2023, 11, 15),
    updatedAt: dateStr(2025, 6, 5),
  },
];

/* ─── Seed: Material Specifications (3) ─── */

const SEED_SPECIFICATIONS: MaterialSpecification[] = [
  {
    id: "spec-1",
    materialName: "Amoxicillin Trihydrate",
    materialCode: "RM-API-001",
    materialType: "api",
    pharmacopoeiaRef: "EP",
    version: "3.0",
    effectiveDate: dateStr(2025, 1, 1),
    tests: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White to almost white crystalline powder" },
      { testName: "Identification (IR)", method: "EP 2.2.24", acceptanceCriteria: "Concordant with reference spectrum" },
      { testName: "Assay (HPLC)", method: "EP 2.2.29", acceptanceCriteria: "95.0 - 102.0% (anhydrous basis)", unit: "%" },
      { testName: "Water Content", method: "Karl Fischer", acceptanceCriteria: "11.5 - 14.5%", unit: "%" },
      { testName: "Related Substances", method: "HPLC", acceptanceCriteria: "Total impurities NMT 2.0%", unit: "%" },
    ],
    approvedBy: "Dr. Rania Abdel-Aziz",
    approvedAt: dateStr(2025, 1, 1),
  },
  {
    id: "spec-2",
    materialName: "HPMC (Hypromellose) 2910 5cP",
    materialCode: "RM-EXC-004",
    materialType: "excipient",
    pharmacopoeiaRef: "EP",
    version: "1.0",
    effectiveDate: dateStr(2025, 3, 1),
    tests: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White or slightly yellowish powder or granules" },
      { testName: "Viscosity", method: "Brookfield (2% solution)", acceptanceCriteria: "4.0 - 6.0 mPa·s", unit: "mPa·s" },
      { testName: "Loss on Drying", method: "105°C, 2h", acceptanceCriteria: "NMT 5.0%", unit: "%" },
      { testName: "pH (2% solution)", method: "EP 2.2.3", acceptanceCriteria: "5.0 - 8.0" },
    ],
    approvedBy: "Dr. Ahmed Hassan",
    approvedAt: dateStr(2025, 3, 1),
  },
  {
    id: "spec-3",
    materialName: "PVC/PVDC Blister Film (250/40)",
    materialCode: "PM-PKG-001",
    materialType: "packaging",
    pharmacopoeiaRef: "in-house",
    version: "1.0",
    effectiveDate: dateStr(2025, 5, 1),
    tests: [
      { testName: "Thickness (PVC)", method: "Micrometer", acceptanceCriteria: "250 ± 10 µm", unit: "µm" },
      { testName: "Thickness (PVDC Coating)", method: "Micrometer", acceptanceCriteria: "40 ± 5 µm", unit: "µm" },
      { testName: "MVTR", method: "ASTM E96", acceptanceCriteria: "NMT 0.25 g/m²/day", unit: "g/m²/day" },
      { testName: "Visual Inspection", method: "Visual", acceptanceCriteria: "Clear, no defects, uniform coating" },
    ],
    approvedBy: "Dr. Ahmed Hassan",
    approvedAt: dateStr(2025, 5, 1),
  },
];

/* ─── Seed: Certificates of Analysis (4) ─── */

const SEED_COAS: CertificateOfAnalysis[] = [
  {
    id: "coa-1",
    coaNumber: "COA-2026-001",
    materialName: "Amoxicillin Trihydrate",
    materialCode: "RM-API-001",
    batchNumber: "AMX-2026-B001",
    supplierName: "Aurobindo Pharma Ltd",
    supplierBatchNumber: "AUR-AMX-24501",
    manufacturingDate: daysAgo(45),
    expiryDate: futureDays(685),
    testsPerformed: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White to almost white crystalline powder", result: "White crystalline powder", pass: true },
      { testName: "Assay (HPLC)", method: "EP 2.2.29", acceptanceCriteria: "95.0 - 102.0% (anhydrous basis)", result: "98.7%", unit: "%", pass: true },
      { testName: "Water Content", method: "Karl Fischer", acceptanceCriteria: "11.5 - 14.5%", result: "12.8%", unit: "%", pass: true },
      { testName: "Related Substances", method: "HPLC", acceptanceCriteria: "Total impurities NMT 2.0%", result: "0.45%", unit: "%", pass: true },
    ],
    complianceStatus: "compliant",
    receivedDate: daysAgo(30),
    reviewedBy: "Dr. Rania Abdel-Aziz",
    reviewedAt: daysAgo(28),
    reviewNotes: "All parameters within specification. Batch approved for use.",
    specificationId: "spec-1",
    hasDeviations: false,
  },
  {
    id: "coa-2",
    coaNumber: "COA-2026-002",
    materialName: "HPMC (Hypromellose) 2910 5cP",
    materialCode: "RM-EXC-004",
    batchNumber: "HPMC-2026-B001",
    supplierName: "BASF Pharma Solutions",
    supplierBatchNumber: "BASF-HPMC-4401",
    manufacturingDate: daysAgo(42),
    expiryDate: futureDays(688),
    testsPerformed: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White or slightly yellowish powder or granules", result: "White powder", pass: true },
      { testName: "Viscosity", method: "Brookfield (2% solution)", acceptanceCriteria: "4.0 - 6.0 mPa·s", result: "5.1 mPa·s", unit: "mPa·s", pass: true },
      { testName: "Loss on Drying", method: "105°C, 2h", acceptanceCriteria: "NMT 5.0%", result: "2.9%", unit: "%", pass: true },
    ],
    complianceStatus: "compliant",
    receivedDate: daysAgo(28),
    reviewedBy: "Dr. Ahmed Hassan",
    reviewedAt: daysAgo(26),
    reviewNotes: "Viscosity and pH within range.",
    specificationId: "spec-2",
    hasDeviations: false,
  },
  {
    id: "coa-3",
    coaNumber: "COA-2026-003",
    materialName: "PVC/PVDC Blister Film (250/40)",
    materialCode: "PM-PKG-001",
    batchNumber: "PVC-2026-B002",
    supplierName: "Amcor Flexibles",
    supplierBatchNumber: "AMC-PVC-9902",
    manufacturingDate: daysAgo(14),
    expiryDate: futureDays(716),
    testsPerformed: [
      { testName: "Thickness (PVC)", method: "Micrometer", acceptanceCriteria: "250 ± 10 µm", result: "252 µm", unit: "µm", pass: true },
      { testName: "MVTR", method: "ASTM E96", acceptanceCriteria: "NMT 0.25 g/m²/day", result: "0.29 g/m²/day", unit: "g/m²/day", pass: false },
      { testName: "Visual Inspection", method: "Visual", acceptanceCriteria: "Clear, no defects, uniform coating", result: "Complies", pass: true },
    ],
    complianceStatus: "non-compliant",
    receivedDate: daysAgo(4),
    reviewedBy: "Dr. Ahmed Hassan",
    reviewedAt: daysAgo(2),
    reviewNotes: "MVTR exceeds limit (0.29 vs 0.25 max). Deviation raised. Batch on hold pending supplier investigation.",
    specificationId: "spec-3",
    hasDeviations: true,
  },
  {
    id: "coa-4",
    coaNumber: "COA-2026-004",
    materialName: "Amoxicillin Trihydrate",
    materialCode: "RM-API-001",
    batchNumber: "AMX-2026-B003",
    supplierName: "Aurobindo Pharma Ltd",
    supplierBatchNumber: "AUR-AMX-24503",
    manufacturingDate: daysAgo(10),
    expiryDate: futureDays(720),
    testsPerformed: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White to almost white crystalline powder", result: "White crystalline powder", pass: true },
      { testName: "Assay (HPLC)", method: "EP 2.2.29", acceptanceCriteria: "95.0 - 102.0% (anhydrous basis)", result: "99.1%", unit: "%", pass: true },
      { testName: "Water Content", method: "Karl Fischer", acceptanceCriteria: "11.5 - 14.5%", result: "12.2%", unit: "%", pass: true },
      { testName: "Related Substances", method: "HPLC", acceptanceCriteria: "Total impurities NMT 2.0%", result: "0.38%", unit: "%", pass: true },
    ],
    complianceStatus: "pending-review",
    receivedDate: daysAgo(3),
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    specificationId: "spec-1",
    hasDeviations: false,
  },
];

/* ─── Seed: Approved Supplier List (3) ─── */

const SEED_APPROVED_SUPPLIERS: ApprovedSupplierEntry[] = [
  {
    id: "asl-1",
    supplierName: "Aurobindo Pharma Ltd",
    supplierCode: "SUP-API-001",
    country: "India",
    materialsApprovedFor: ["Amoxicillin Trihydrate"],
    materialTypes: ["api"],
    qualificationDate: dateStr(2024, 6, 15),
    nextAuditDue: futureDays(60),
    lastAuditDate: daysAgo(305),
    status: "approved",
    gmpCertificate: "GMP-IND-2024-1847",
    qualityAgreementId: "sqa-1",
    rating: 4,
    notes: "Reliable API supplier. Strong quality track record.",
  },
  {
    id: "asl-2",
    supplierName: "BASF Pharma Solutions",
    supplierCode: "SUP-EXC-001",
    country: "Germany",
    materialsApprovedFor: ["HPMC (Hypromellose)"],
    materialTypes: ["excipient"],
    qualificationDate: dateStr(2024, 8, 1),
    nextAuditDue: futureDays(180),
    lastAuditDate: daysAgo(185),
    status: "approved",
    gmpCertificate: "GMP-EU-2024-DE-5543",
    qualityAgreementId: "sqa-2",
    rating: 5,
    notes: "Premium excipient supplier. ISO 22716 and IPEC-PQG certified.",
  },
  {
    id: "asl-3",
    supplierName: "Dishman Carbogen Amcis",
    supplierCode: "SUP-API-004",
    country: "India",
    materialsApprovedFor: ["Losartan Potassium"],
    materialTypes: ["api"],
    qualificationDate: dateStr(2023, 6, 1),
    nextAuditDue: daysAgo(30),
    lastAuditDate: daysAgo(395),
    status: "suspended",
    gmpCertificate: "GMP-IND-2023-1552",
    qualityAgreementId: "sqa-3",
    rating: 2,
    notes: "Quality agreement expired. Supplier suspended until SQA renewal and re-audit completed.",
  },
];

/* ─── Seed: Material Qualifications (3) ─── */

const SEED_QUALIFICATIONS: MaterialQualification[] = [
  {
    id: "mq-1",
    materialName: "Amoxicillin Trihydrate",
    materialCode: "RM-API-001",
    supplierName: "Aurobindo Pharma Ltd",
    supplierCode: "SUP-API-001",
    qualificationTests: [
      { testName: "Full Monograph Testing (EP)", result: "All parameters pass", pass: true },
      { testName: "Comparative Dissolution (vs reference)", result: "f2 = 82", pass: true },
      { testName: "Impurity Profile Comparison", result: "Comparable to current source", pass: true },
    ],
    stabilityData: [
      { condition: "25°C/60% RH (Long-term)", duration: "24 months", result: "Assay 97.8%, all impurities within limits" },
      { condition: "40°C/75% RH (Accelerated)", duration: "6 months", result: "Assay 96.2%, no significant degradation" },
    ],
    regulatoryStatus: "approved",
    qualificationStatus: "qualified",
    qualifiedBy: "Dr. Rania Abdel-Aziz",
    qualifiedAt: dateStr(2024, 6, 15),
    notes: "Fully qualified. Primary source for Amoxicillin products.",
  },
  {
    id: "mq-2",
    materialName: "HPMC (Hypromellose) 2910 5cP",
    materialCode: "RM-EXC-004",
    supplierName: "BASF Pharma Solutions",
    supplierCode: "SUP-EXC-001",
    qualificationTests: [
      { testName: "Full EP Monograph Testing", result: "All parameters pass", pass: true },
      { testName: "Viscosity Consistency (5 lots)", result: "All within 4.0 - 6.0 mPa·s", pass: true },
    ],
    stabilityData: [
      { condition: "25°C/60% RH (Long-term)", duration: "24 months", result: "No change in properties" },
    ],
    regulatoryStatus: "not-required",
    qualificationStatus: "qualified",
    qualifiedBy: "Dr. Ahmed Hassan",
    qualifiedAt: dateStr(2024, 8, 1),
    notes: "Well-established excipient. Consistent quality.",
  },
  {
    id: "mq-3",
    materialName: "Losartan Potassium",
    materialCode: "RM-API-005",
    supplierName: "Dishman Carbogen Amcis",
    supplierCode: "SUP-API-004",
    qualificationTests: [
      { testName: "Full USP Monograph Testing", result: "Passed", pass: true },
      { testName: "Nitrosamine Testing (NMBA)", result: "Below LOQ", pass: true },
    ],
    stabilityData: [
      { condition: "25°C/60% RH (Long-term)", duration: "24 months", result: "Assay 99.0%, stable" },
    ],
    regulatoryStatus: "approved",
    qualificationStatus: "expired",
    qualifiedBy: "Dr. Rania Abdel-Aziz",
    qualifiedAt: dateStr(2023, 6, 1),
    notes: "Qualification expired with SQA. Re-qualification required before use.",
  },
];

/* ─── Store Data Interface ─── */

interface StoreData {
  agreements: SupplierQualityAgreement[];
  specifications: MaterialSpecification[];
  coas: CertificateOfAnalysis[];
  approvedSuppliers: ApprovedSupplierEntry[];
  qualifications: MaterialQualification[];
}

/* ─── Store Class ─── */

class SupplierQualityStore {
  private static instance: SupplierQualityStore;

  private constructor() {
    this.seed();
  }

  static getInstance(): SupplierQualityStore {
    if (!SupplierQualityStore.instance) {
      SupplierQualityStore.instance = new SupplierQualityStore();
    }
    return SupplierQualityStore.instance;
  }

  private seed(): void {
    if (typeof window === "undefined") return;
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      const data: StoreData = {
        agreements: SEED_AGREEMENTS,
        specifications: SEED_SPECIFICATIONS,
        coas: SEED_COAS,
        approvedSuppliers: SEED_APPROVED_SUPPLIERS,
        qualifications: SEED_QUALIFICATIONS,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }

  private load(): StoreData {
    if (typeof window === "undefined")
      return { agreements: [], specifications: [], coas: [], approvedSuppliers: [], qualifications: [] };
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw
      ? (JSON.parse(raw) as StoreData)
      : { agreements: [], specifications: [], coas: [], approvedSuppliers: [], qualifications: [] };
  }

  private save(data: StoreData): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /* ── Agreements ── */

  getAllAgreements(): SupplierQualityAgreement[] {
    return this.load().agreements;
  }

  getAgreementById(id: string): SupplierQualityAgreement | undefined {
    return this.load().agreements.find((a) => a.id === id);
  }

  getAgreementsByStatus(status: SQAStatus): SupplierQualityAgreement[] {
    return this.load().agreements.filter((a) => a.status === status);
  }

  getAgreementsBySupplier(supplierName: string): SupplierQualityAgreement[] {
    return this.load().agreements.filter((a) => a.supplierName === supplierName);
  }

  getExpiringSoonAgreements(withinDays: number = 90): SupplierQualityAgreement[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + withinDays);
    return this.load().agreements.filter(
      (a) => a.status === "active" && new Date(a.expiryDate) <= cutoff
    );
  }

  createAgreement(
    agreement: Omit<SupplierQualityAgreement, "id" | "number" | "createdAt" | "updatedAt">
  ): SupplierQualityAgreement {
    const data = this.load();
    const newAgreement: SupplierQualityAgreement = {
      ...agreement,
      id: `sqa-${Date.now()}`,
      number: this.generateAgreementNumber(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.agreements.push(newAgreement);
    this.save(data);
    return newAgreement;
  }

  updateAgreement(
    id: string,
    updates: Partial<SupplierQualityAgreement>
  ): SupplierQualityAgreement | undefined {
    const data = this.load();
    const idx = data.agreements.findIndex((a) => a.id === id);
    if (idx === -1) return undefined;
    data.agreements[idx] = { ...data.agreements[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save(data);
    return data.agreements[idx];
  }

  deleteAgreement(id: string): boolean {
    const data = this.load();
    const idx = data.agreements.findIndex((a) => a.id === id);
    if (idx === -1) return false;
    data.agreements.splice(idx, 1);
    this.save(data);
    return true;
  }

  private generateAgreementNumber(): string {
    const data = this.load();
    const year = new Date().getFullYear();
    const prefix = `SQA-${year}-`;
    const existing = data.agreements
      .filter((a) => a.number.startsWith(prefix))
      .map((a) => parseInt(a.number.replace(prefix, ""), 10))
      .filter((n) => !isNaN(n));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `${prefix}${String(next).padStart(3, "0")}`;
  }

  /* ── Material Specifications ── */

  getAllSpecifications(): MaterialSpecification[] {
    return this.load().specifications;
  }

  getSpecificationById(id: string): MaterialSpecification | undefined {
    return this.load().specifications.find((s) => s.id === id);
  }

  getSpecificationsByMaterial(materialCode: string): MaterialSpecification[] {
    return this.load().specifications.filter((s) => s.materialCode === materialCode);
  }

  createSpecification(
    spec: Omit<MaterialSpecification, "id">
  ): MaterialSpecification {
    const data = this.load();
    const newSpec: MaterialSpecification = {
      ...spec,
      id: `spec-${Date.now()}`,
    };
    data.specifications.push(newSpec);
    this.save(data);
    return newSpec;
  }

  updateSpecification(
    id: string,
    updates: Partial<MaterialSpecification>
  ): MaterialSpecification | undefined {
    const data = this.load();
    const idx = data.specifications.findIndex((s) => s.id === id);
    if (idx === -1) return undefined;
    data.specifications[idx] = { ...data.specifications[idx], ...updates };
    this.save(data);
    return data.specifications[idx];
  }

  /* ── Certificates of Analysis ── */

  getAllCoAs(): CertificateOfAnalysis[] {
    return this.load().coas;
  }

  getCoAById(id: string): CertificateOfAnalysis | undefined {
    return this.load().coas.find((c) => c.id === id);
  }

  getCoAsByMaterial(materialCode: string): CertificateOfAnalysis[] {
    return this.load().coas.filter((c) => c.materialCode === materialCode);
  }

  getCoAsBySupplier(supplierName: string): CertificateOfAnalysis[] {
    return this.load().coas.filter((c) => c.supplierName === supplierName);
  }

  getPendingCoAs(): CertificateOfAnalysis[] {
    return this.load().coas.filter((c) => c.complianceStatus === "pending-review");
  }

  getCoAsByStatus(status: CoAComplianceStatus): CertificateOfAnalysis[] {
    return this.load().coas.filter((c) => c.complianceStatus === status);
  }

  createCoA(coa: Omit<CertificateOfAnalysis, "id">): CertificateOfAnalysis {
    const data = this.load();
    const newCoA: CertificateOfAnalysis = {
      ...coa,
      id: `coa-${Date.now()}`,
    };
    data.coas.push(newCoA);
    this.save(data);
    return newCoA;
  }

  updateCoA(
    id: string,
    updates: Partial<CertificateOfAnalysis>
  ): CertificateOfAnalysis | undefined {
    const data = this.load();
    const idx = data.coas.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    data.coas[idx] = { ...data.coas[idx], ...updates };
    this.save(data);
    return data.coas[idx];
  }

  reviewCoA(
    id: string,
    reviewedBy: string,
    complianceStatus: CoAComplianceStatus,
    reviewNotes: string
  ): CertificateOfAnalysis | undefined {
    return this.updateCoA(id, {
      reviewedBy,
      reviewedAt: new Date().toISOString(),
      complianceStatus,
      reviewNotes,
    });
  }

  /* ── Approved Supplier List ── */

  getAllApprovedSuppliers(): ApprovedSupplierEntry[] {
    return this.load().approvedSuppliers;
  }

  getApprovedSupplierById(id: string): ApprovedSupplierEntry | undefined {
    return this.load().approvedSuppliers.find((s) => s.id === id);
  }

  getApprovedSuppliersByMaterial(materialName: string): ApprovedSupplierEntry[] {
    return this.load().approvedSuppliers.filter((s) =>
      s.materialsApprovedFor.some((m) => m.toLowerCase().includes(materialName.toLowerCase()))
    );
  }

  getApprovedSuppliersByStatus(status: ApprovedSupplierEntry["status"]): ApprovedSupplierEntry[] {
    return this.load().approvedSuppliers.filter((s) => s.status === status);
  }

  createApprovedSupplier(
    supplier: Omit<ApprovedSupplierEntry, "id">
  ): ApprovedSupplierEntry {
    const data = this.load();
    const newSupplier: ApprovedSupplierEntry = {
      ...supplier,
      id: `asl-${Date.now()}`,
    };
    data.approvedSuppliers.push(newSupplier);
    this.save(data);
    return newSupplier;
  }

  updateApprovedSupplier(
    id: string,
    updates: Partial<ApprovedSupplierEntry>
  ): ApprovedSupplierEntry | undefined {
    const data = this.load();
    const idx = data.approvedSuppliers.findIndex((s) => s.id === id);
    if (idx === -1) return undefined;
    data.approvedSuppliers[idx] = { ...data.approvedSuppliers[idx], ...updates };
    this.save(data);
    return data.approvedSuppliers[idx];
  }

  /* ── Material Qualifications ── */

  getAllQualifications(): MaterialQualification[] {
    return this.load().qualifications;
  }

  getQualificationById(id: string): MaterialQualification | undefined {
    return this.load().qualifications.find((q) => q.id === id);
  }

  getQualificationsByMaterial(materialCode: string): MaterialQualification[] {
    return this.load().qualifications.filter((q) => q.materialCode === materialCode);
  }

  getQualificationsBySupplier(supplierCode: string): MaterialQualification[] {
    return this.load().qualifications.filter((q) => q.supplierCode === supplierCode);
  }

  /* ── Metrics ── */

  getMetrics(): SupplierQualityMetrics {
    const data = this.load();
    const { agreements, coas, approvedSuppliers, specifications, qualifications } = data;

    const activeAgreements = agreements.filter((a) => a.status === "active").length;

    const expCutoff = new Date();
    expCutoff.setDate(expCutoff.getDate() + 90);
    const expiringSoonCount = agreements.filter(
      (a) => a.status === "active" && new Date(a.expiryDate) <= expCutoff
    ).length;

    const totalApprovedSuppliers = approvedSuppliers.filter(
      (s) => s.status === "approved" || s.status === "conditional"
    ).length;

    const pendingCoAs = coas.filter((c) => c.complianceStatus === "pending-review").length;
    const reviewedCoAs = coas.filter((c) => c.complianceStatus !== "pending-review");
    const compliantCoAs = reviewedCoAs.filter((c) => c.complianceStatus === "compliant").length;
    const coaAcceptanceRate =
      reviewedCoAs.length > 0 ? Math.round((compliantCoAs / reviewedCoAs.length) * 100) : 100;

    const qualifiedMaterials = qualifications.filter(
      (q) => q.qualificationStatus === "qualified"
    ).length;

    const ratings = approvedSuppliers.map((s) => s.rating);
    const averageSupplierRating =
      ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : 0;

    // By material type
    const typeMap = new Map<MaterialType, number>();
    specifications.forEach((s) => typeMap.set(s.materialType, (typeMap.get(s.materialType) || 0) + 1));
    const byMaterialType = Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));

    // By agreement status
    const statusMap = new Map<SQAStatus, number>();
    agreements.forEach((a) => statusMap.set(a.status, (statusMap.get(a.status) || 0) + 1));
    const byAgreementStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

    // Supplier performance
    const supplierMap = new Map<string, { coaCount: number; compliant: number; rating: number }>();
    approvedSuppliers.forEach((s) => {
      supplierMap.set(s.supplierName, { coaCount: 0, compliant: 0, rating: s.rating });
    });
    coas.forEach((c) => {
      const entry = supplierMap.get(c.supplierName);
      if (entry) {
        entry.coaCount++;
        if (c.complianceStatus === "compliant") entry.compliant++;
      }
    });
    const supplierPerformance = Array.from(supplierMap.entries())
      .filter(([, v]) => v.coaCount > 0)
      .map(([supplier, v]) => ({
        supplier,
        coaCount: v.coaCount,
        acceptRate: v.coaCount > 0 ? Math.round((v.compliant / v.coaCount) * 100) : 100,
        rating: v.rating,
      }));

    return {
      totalAgreements: agreements.length,
      activeAgreements,
      expiringSoonCount,
      totalApprovedSuppliers,
      pendingCoAs,
      totalCoAs: coas.length,
      coaAcceptanceRate,
      totalMaterialSpecs: specifications.length,
      qualifiedMaterials,
      averageSupplierRating,
      byMaterialType,
      byAgreementStatus,
      supplierPerformance,
    };
  }
}

export const supplierQualityStore = SupplierQualityStore.getInstance();
