"use client";

import type {
  Audit,
  AuditStatus,
  AuditType,
  AuditFinding,
  AuditChecklist,
  Auditor,
  AuditReport,
  AuditMetrics,
  FindingCategory,
  FindingStatus,
  GMPArea,
  ChecklistItem,
} from "./audit-types";

const STORAGE_KEY = "pharma.audits";

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── Seed Auditors ──────────────────────────────────────────────────────────

const SEED_AUDITORS: Auditor[] = [
  {
    id: "aud-1",
    name: "Dr. Laila Farouk",
    role: "Lead QA Auditor",
    qualification: "ISO 19011 Lead Auditor",
    type: "internal",
    department: "QA",
    certifications: ["ISO 19011:2018", "GMP Auditor Certification"],
  },
  {
    id: "aud-2",
    name: "Dr. Rania Abdel-Aziz",
    role: "QC Auditor",
    qualification: "GMP Compliance Auditor",
    type: "internal",
    department: "QC",
    certifications: ["GMP Auditor Certification"],
  },
  {
    id: "aud-3",
    name: "Pharm. Mariam Khalil",
    role: "Documentation Auditor",
    qualification: "Document Control Specialist",
    type: "internal",
    department: "QA",
    certifications: ["GDP Auditor"],
  },
  {
    id: "aud-4",
    name: "Eng. Mohamed Fathy",
    role: "Engineering Auditor",
    qualification: "Equipment Qualification Specialist",
    type: "internal",
    department: "Engineering",
    certifications: ["ISPE GAMP 5"],
  },
  {
    id: "aud-5",
    name: "Dr. Amr Selim",
    role: "Executive Sponsor",
    qualification: "Plant Director / Senior Auditor",
    type: "internal",
    department: "Management",
    certifications: ["ISO 19011:2018", "FDA cGMP"],
  },
  {
    id: "aud-6",
    name: "Dr. Hassan El-Badawi",
    role: "EDA Inspector",
    qualification: "Egyptian Drug Authority Inspector",
    type: "external",
    certifications: ["EDA Inspection License"],
  },
  {
    id: "aud-7",
    name: "Dr. Sarah Mitchell",
    role: "WHO Prequalification Assessor",
    qualification: "WHO PQ Team Member",
    type: "external",
    certifications: ["WHO PQ Inspector"],
  },
  {
    id: "aud-8",
    name: "Dr. Klaus Weber",
    role: "ISO Lead Auditor",
    qualification: "TUV Certified ISO Auditor",
    type: "external",
    certifications: ["ISO 9001 Lead Auditor", "ISO 13485 Auditor"],
  },
];

// ─── Checklist Templates ────────────────────────────────────────────────────

function makeChecklistItem(
  id: string,
  question: string,
  gmpArea: GMPArea,
  requirement: string,
  status: ChecklistItem["status"] = "not-checked"
): ChecklistItem {
  return { id, question, gmpArea, requirement, status };
}

const INTERNAL_CHECKLIST: AuditChecklist = {
  id: "cl-int-01",
  name: "GMP Self-Inspection Checklist",
  auditType: "internal",
  items: [
    makeChecklistItem("cli-1", "Are all SOPs current and approved?", "documentation", "WHO TRS 986 Annex 2, Section 15", "conforming"),
    makeChecklistItem("cli-2", "Are batch records completed in real time?", "documentation", "EU GMP Annex 15", "conforming"),
    makeChecklistItem("cli-3", "Is the HVAC system qualified and monitored?", "facilities", "WHO TRS 961 Annex 5", "conforming"),
    makeChecklistItem("cli-4", "Are cleanroom classifications maintained?", "facilities", "ISO 14644-1", "non-conforming"),
    makeChecklistItem("cli-5", "Is equipment calibration current?", "equipment", "WHO TRS 986 Annex 4", "conforming"),
    makeChecklistItem("cli-6", "Are cleaning validation protocols current?", "equipment", "EMA Cleaning Validation Guideline", "conforming"),
    makeChecklistItem("cli-7", "Is personnel training documentation up to date?", "personnel", "WHO TRS 986 Section 10", "non-conforming"),
    makeChecklistItem("cli-8", "Are gowning procedures followed correctly?", "personnel", "EU GMP Annex 1", "conforming"),
    makeChecklistItem("cli-9", "Are in-process controls performed as specified?", "production", "ICH Q7 Section 8", "conforming"),
    makeChecklistItem("cli-10", "Is process validation current?", "production", "FDA Process Validation Guidance", "conforming"),
    makeChecklistItem("cli-11", "Are OOS investigations completed within 30 days?", "quality-control", "FDA OOS Guidance", "non-conforming"),
    makeChecklistItem("cli-12", "Are reference standards properly managed?", "quality-control", "USP General Chapter 1010", "conforming"),
    makeChecklistItem("cli-13", "Are storage conditions monitored continuously?", "warehousing", "WHO GSP Guidelines", "conforming"),
    makeChecklistItem("cli-14", "Is FEFO/FIFO system in place?", "warehousing", "WHO TRS 986 Annex 9", "conforming"),
    makeChecklistItem("cli-15", "Is the complaint handling SOP followed?", "complaints", "WHO TRS 986 Section 18", "conforming"),
    makeChecklistItem("cli-16", "Are complaint trends analyzed quarterly?", "complaints", "ICH Q10", "conforming"),
  ],
};

const SUPPLIER_CHECKLIST: AuditChecklist = {
  id: "cl-sup-01",
  name: "Supplier GMP Audit Checklist",
  auditType: "supplier",
  items: [
    makeChecklistItem("cls-1", "Does the supplier have a valid manufacturing license?", "documentation", "WHO TRS 986", "conforming"),
    makeChecklistItem("cls-2", "Is the quality management system documented?", "documentation", "ISO 9001:2015", "conforming"),
    makeChecklistItem("cls-3", "Are production areas suitable for intended operations?", "facilities", "WHO TRS 986 Annex 2", "conforming"),
    makeChecklistItem("cls-4", "Is environmental monitoring in place?", "facilities", "WHO TRS 961", "non-conforming"),
    makeChecklistItem("cls-5", "Is analytical equipment qualified?", "equipment", "WHO TRS 986 Annex 4", "conforming"),
    makeChecklistItem("cls-6", "Is staff adequately trained for GMP?", "personnel", "ICH Q7 Section 3", "conforming"),
    makeChecklistItem("cls-7", "Are production processes validated?", "production", "FDA Process Validation", "conforming"),
    makeChecklistItem("cls-8", "Is the QC laboratory adequate?", "quality-control", "WHO TRS 986 Annex 3", "conforming"),
    makeChecklistItem("cls-9", "Are storage conditions controlled?", "warehousing", "WHO GSP", "conforming"),
    makeChecklistItem("cls-10", "Is the complaint handling process adequate?", "complaints", "ICH Q10", "conforming"),
  ],
};

const REGULATORY_CHECKLIST: AuditChecklist = {
  id: "cl-reg-01",
  name: "Regulatory Inspection Preparedness Checklist",
  auditType: "regulatory",
  items: [
    makeChecklistItem("clr-1", "Are all product dossiers up to date?", "documentation", "EDA Registration Requirements", "conforming"),
    makeChecklistItem("clr-2", "Are stability programs conducted per protocol?", "documentation", "ICH Q1A(R2)", "conforming"),
    makeChecklistItem("clr-3", "Do facilities meet cGMP requirements?", "facilities", "WHO TRS 986", "conforming"),
    makeChecklistItem("clr-4", "Is water system validated?", "facilities", "WHO TRS 970", "conforming"),
    makeChecklistItem("clr-5", "Is computerized system validated?", "equipment", "EU GMP Annex 11", "conforming"),
    makeChecklistItem("clr-6", "Are key personnel qualified?", "personnel", "WHO TRS 986 Section 9", "conforming"),
    makeChecklistItem("clr-7", "Is process validation lifecycle maintained?", "production", "FDA PV Guidance 2011", "conforming"),
    makeChecklistItem("clr-8", "Are analytical methods validated?", "quality-control", "ICH Q2(R1)", "conforming"),
    makeChecklistItem("clr-9", "Is GDP compliance demonstrated?", "warehousing", "WHO TRS 957 Annex 5", "conforming"),
    makeChecklistItem("clr-10", "Are recalls handled per SOP?", "complaints", "WHO TRS 986 Section 19", "conforming"),
  ],
};

// ─── Seed Findings ──────────────────────────────────────────────────────────

function makeFinding(
  id: string,
  findingNumber: string,
  auditId: string,
  auditNumber: string,
  category: FindingCategory,
  gmpArea: GMPArea,
  description: string,
  area: string,
  evidence: string,
  requirement: string,
  status: FindingStatus,
  detectedAt: string,
  opts?: {
    response?: string;
    responseDueDate?: string;
    responseDate?: string;
    capaId?: string;
    capaNumber?: string;
    assignedTo?: string;
    closedAt?: string;
  }
): AuditFinding {
  return {
    id,
    findingNumber,
    auditId,
    auditNumber,
    category,
    gmpArea,
    description,
    area,
    evidence,
    requirement,
    status,
    detectedAt,
    ...opts,
  };
}

// ─── Seed Audits ────────────────────────────────────────────────────────────

const SEED_AUDITS: Audit[] = [
  // ── 4 Internal Audits ─────────────────────────────────────────────────
  // 1. Self-inspection - completed
  {
    id: "a-1",
    number: "AUD-2026-001",
    title: "Q1 Annual Self-Inspection - Solid Dosage",
    type: "internal",
    status: "completed",
    scope: "Full GMP compliance review of solid dosage manufacturing areas including granulation, compression, coating and packaging",
    department: "Production",
    scheduledDate: daysAgo(60),
    startDate: daysAgo(58),
    endDate: daysAgo(52),
    leadAuditor: "aud-1",
    auditors: ["aud-1", "aud-2", "aud-3"],
    objectives: [
      "Verify GMP compliance across all solid dosage areas",
      "Assess CAPA effectiveness from previous audit",
      "Review documentation practices",
    ],
    checklist: { ...INTERNAL_CHECKLIST, id: "cl-a1" },
    findings: [
      makeFinding("f-1", "FND-2026-001", "a-1", "AUD-2026-001", "major", "documentation", "Three batch records for Amoxicillin 500mg found with incomplete yield reconciliation entries", "Granulation Suite", "Batch records B-AMX-2026-044, B-AMX-2026-045, B-AMX-2026-047 reviewed", "WHO TRS 986 Annex 2, Section 15.25", "capa-linked", daysAgo(55), { response: "Batch record review process will be strengthened with second-person verification", responseDueDate: daysAgo(25), responseDate: daysAgo(40), capaId: "capa-101", capaNumber: "CAPA-2026-011", assignedTo: "Dr. Youssef Kamel" }),
      makeFinding("f-2", "FND-2026-002", "a-1", "AUD-2026-001", "minor", "personnel", "Two production operators missing annual GMP refresher training", "Compression Room", "Training records for operators OP-112 and OP-118", "WHO TRS 986 Section 10.5", "closed", daysAgo(55), { response: "Retraining scheduled and completed within 7 days", responseDate: daysAgo(48), assignedTo: "HR Training Dept", closedAt: daysAgo(40) }),
      makeFinding("f-3", "FND-2026-003", "a-1", "AUD-2026-001", "minor", "equipment", "Calibration sticker on pH meter expired by 3 days", "IPC Lab", "Equipment tag QC-pH-004, calibration due date observed", "WHO TRS 986 Annex 4, Section 3.2", "closed", daysAgo(54), { response: "pH meter recalibrated immediately. Calendar reminder system updated.", responseDate: daysAgo(53), assignedTo: "QC Lab Supervisor", closedAt: daysAgo(45) }),
      makeFinding("f-4", "FND-2026-004", "a-1", "AUD-2026-001", "observation", "facilities", "Minor paint peeling observed on ceiling of corridor C-3 near coating room", "Corridor C-3", "Visual observation and photographs taken", "WHO TRS 986 Annex 2, Section 12.3", "closed", daysAgo(54), { response: "Maintenance scheduled and completed during planned shutdown", responseDate: daysAgo(50), closedAt: daysAgo(35) }),
      makeFinding("f-5", "FND-2026-005", "a-1", "AUD-2026-001", "opportunity", "production", "Consider implementing real-time in-process monitoring for tablet hardness using PAT tools", "Compression Room", "Current manual sampling at 30-min intervals observed", "ICH Q8/Q9 PAT Framework", "open", daysAgo(53), { assignedTo: "Dr. Ahmed Hassan" }),
    ],
    report: {
      id: "rpt-1",
      auditId: "a-1",
      summary: "The Q1 self-inspection of solid dosage manufacturing areas revealed generally good GMP compliance with some documentation gaps requiring attention. One major finding related to batch record completion was identified and linked to CAPA.",
      findingsCount: { critical: 0, major: 1, minor: 2, observation: 1, opportunity: 1 },
      overallRating: "needs-improvement",
      recommendations: [
        "Implement second-person batch record review before QA sign-off",
        "Establish automated training compliance monitoring system",
        "Consider PAT implementation roadmap for compression operations",
      ],
      scoreByArea: [
        { area: "documentation", score: 72 },
        { area: "facilities", score: 88 },
        { area: "equipment", score: 85 },
        { area: "personnel", score: 78 },
        { area: "production", score: 90 },
        { area: "quality-control", score: 82 },
        { area: "warehousing", score: 95 },
        { area: "complaints", score: 92 },
      ],
      generatedAt: daysAgo(50),
      generatedBy: "Dr. Laila Farouk",
    },
    createdAt: daysAgo(65),
    updatedAt: daysAgo(50),
  },
  // 2. Cross-department - in-progress
  {
    id: "a-2",
    number: "AUD-2026-002",
    title: "Cross-Department Data Integrity Audit",
    type: "internal",
    status: "in-progress",
    scope: "Assessment of data integrity practices across QC laboratory, production, and warehouse departments per ALCOA+ principles",
    department: "QA",
    scheduledDate: daysAgo(10),
    startDate: daysAgo(8),
    leadAuditor: "aud-1",
    auditors: ["aud-1", "aud-4", "aud-5"],
    objectives: [
      "Evaluate ALCOA+ compliance in electronic and paper systems",
      "Review audit trail management in HPLC and ERP systems",
      "Assess data backup and recovery procedures",
    ],
    checklist: { ...INTERNAL_CHECKLIST, id: "cl-a2" },
    findings: [
      makeFinding("f-6", "FND-2026-006", "a-2", "AUD-2026-002", "critical", "quality-control", "Shared login credentials found on two HPLC workstations in QC Lab - users sharing usernames and passwords, undermining audit trail integrity", "QC HPLC Lab", "Observed two analysts using same login on Empower workstation WS-03 and WS-05", "EU GMP Annex 11, WHO TRS 996 Annex 5", "capa-linked", daysAgo(6), { response: "Immediate password reset for all QC workstations. Individual accounts being created.", responseDueDate: daysAgo(-10), capaId: "capa-102", capaNumber: "CAPA-2026-012", assignedTo: "Dr. Rania Abdel-Aziz" }),
      makeFinding("f-7", "FND-2026-007", "a-2", "AUD-2026-002", "major", "documentation", "Electronic records in ERP system lack periodic audit trail review - no evidence of routine review for past 6 months", "IT Server Room", "ERP audit trail review log examined - last entry dated 6 months ago", "21 CFR Part 11, EU GMP Annex 11 Section 9", "open", daysAgo(5), { responseDueDate: futureDays(10), assignedTo: "Eng. Ayman Zaki" }),
      makeFinding("f-8", "FND-2026-008", "a-2", "AUD-2026-002", "major", "warehousing", "Warehouse temperature data loggers found with gap in recording - 4-hour gap on March 15 not investigated", "Warehouse Zone B", "Temperature log data downloaded from logger WH-TL-07", "WHO GSP Guidelines, GDP", "open", daysAgo(5), { responseDueDate: futureDays(15), assignedTo: "Eng. Tarek Nour" }),
      makeFinding("f-9", "FND-2026-009", "a-2", "AUD-2026-002", "minor", "personnel", "Data integrity training records incomplete for 4 warehouse staff members", "Warehouse Office", "Training matrix reviewed for warehouse department", "WHO TRS 996 Annex 5", "responded", daysAgo(4), { response: "Data integrity training module scheduled for all warehouse staff next week", responseDate: daysAgo(2), assignedTo: "HR Training Dept" }),
    ],
    createdAt: daysAgo(20),
    updatedAt: daysAgo(2),
  },
  // 3. Internal self-inspection - planned
  {
    id: "a-3",
    number: "AUD-2026-003",
    title: "Q2 Self-Inspection - Sterile Manufacturing",
    type: "internal",
    status: "planned",
    scope: "Comprehensive GMP review of sterile manufacturing facility including aseptic processing, terminal sterilization, and environmental monitoring",
    department: "Production - Sterile",
    scheduledDate: futureDays(20),
    leadAuditor: "aud-1",
    auditors: ["aud-1", "aud-2"],
    objectives: [
      "Verify compliance with EU GMP Annex 1 (2022 revision)",
      "Review media fill program and results",
      "Assess environmental monitoring program adequacy",
    ],
    findings: [],
    createdAt: daysAgo(30),
  },
  // 4. Cross-department - planned
  {
    id: "a-4",
    number: "AUD-2026-004",
    title: "Cleaning Validation Cross-Department Audit",
    type: "internal",
    status: "planned",
    scope: "Review of cleaning validation program for multi-product equipment across production and QC departments",
    department: "QA",
    scheduledDate: futureDays(45),
    leadAuditor: "aud-2",
    auditors: ["aud-2", "aud-4"],
    objectives: [
      "Evaluate cleaning validation master plan implementation",
      "Review worst-case product grouping methodology",
      "Assess analytical method sensitivity for cleaning verification",
    ],
    findings: [],
    createdAt: daysAgo(15),
  },

  // ── 3 Supplier Audits ─────────────────────────────────────────────────
  // 5. Supplier - completed
  {
    id: "a-5",
    number: "AUD-2026-005",
    title: "API Supplier Audit - Aurobindo Pharma (Metformin HCl)",
    type: "supplier",
    status: "completed",
    scope: "GMP compliance audit of Metformin HCl API manufacturing facility in Hyderabad, India - qualification of second source supplier",
    department: "Supply Chain",
    scheduledDate: daysAgo(45),
    startDate: daysAgo(43),
    endDate: daysAgo(40),
    leadAuditor: "aud-1",
    auditors: ["aud-1", "aud-2"],
    objectives: [
      "Assess GMP compliance of API manufacturing facility",
      "Verify quality management system adequacy",
      "Evaluate supply chain reliability and capacity",
    ],
    checklist: { ...SUPPLIER_CHECKLIST, id: "cl-a5" },
    findings: [
      makeFinding("f-10", "FND-2026-010", "a-5", "AUD-2026-005", "major", "facilities", "Environmental monitoring of intermediate storage area shows occasional excursions above alert limits without documented investigation", "Intermediate Storage Area 3", "EM trend data for 6 months reviewed - 4 excursions noted without investigation", "WHO TRS 986 Annex 2", "responded", daysAgo(38), { response: "Investigation procedure updated. Retrospective investigations for excursions completed.", responseDueDate: daysAgo(10), responseDate: daysAgo(20), assignedTo: "Supplier QA" }),
      makeFinding("f-11", "FND-2026-011", "a-5", "AUD-2026-005", "minor", "documentation", "Some process validation reports missing statistical analysis of critical quality attributes", "QA Documentation Room", "PV reports for 3 recent batches reviewed", "ICH Q7 Section 12", "responded", daysAgo(38), { response: "Statistical analysis addendum prepared for all affected reports", responseDueDate: daysAgo(8), responseDate: daysAgo(15), assignedTo: "Supplier QA" }),
      makeFinding("f-12", "FND-2026-012", "a-5", "AUD-2026-005", "observation", "quality-control", "Reference standard management could benefit from electronic tracking system", "QC Lab", "Paper-based reference standard log observed", "USP General Chapter 1010", "open", daysAgo(37), { assignedTo: "Supplier QC Manager" }),
    ],
    report: {
      id: "rpt-5",
      auditId: "a-5",
      summary: "Aurobindo Pharma Metformin HCl manufacturing facility demonstrates acceptable GMP compliance for qualification as a second source supplier. Environmental monitoring program requires strengthening before full approval.",
      findingsCount: { critical: 0, major: 1, minor: 1, observation: 1, opportunity: 0 },
      overallRating: "needs-improvement",
      recommendations: [
        "Supplier to address environmental monitoring gaps before first commercial batch",
        "Request updated process validation reports with statistical analysis",
        "Schedule follow-up audit in 6 months to verify corrective actions",
      ],
      scoreByArea: [
        { area: "documentation", score: 75 },
        { area: "facilities", score: 70 },
        { area: "equipment", score: 85 },
        { area: "personnel", score: 82 },
        { area: "production", score: 88 },
        { area: "quality-control", score: 80 },
        { area: "warehousing", score: 78 },
        { area: "complaints", score: 85 },
      ],
      generatedAt: daysAgo(35),
      generatedBy: "Dr. Laila Farouk",
    },
    createdAt: daysAgo(55),
    updatedAt: daysAgo(35),
  },
  // 6. Supplier - in-progress
  {
    id: "a-6",
    number: "AUD-2026-006",
    title: "Excipient Supplier Audit - Colorcon (Film Coating)",
    type: "supplier",
    status: "in-progress",
    scope: "GMP audit of Colorcon Opadry coating material manufacturing and quality systems",
    department: "Supply Chain",
    scheduledDate: daysAgo(5),
    startDate: daysAgo(3),
    leadAuditor: "aud-2",
    auditors: ["aud-2", "aud-3"],
    objectives: [
      "Verify cGMP compliance for film coating materials",
      "Assess change notification procedures",
      "Review CoA accuracy and completeness",
    ],
    checklist: { ...SUPPLIER_CHECKLIST, id: "cl-a6" },
    findings: [
      makeFinding("f-13", "FND-2026-013", "a-6", "AUD-2026-006", "minor", "documentation", "Change notification procedure does not specify timeline for customer notification", "QA Office", "Change control SOP reviewed - no defined timeline for customer notification", "ICH Q7 Section 13", "open", daysAgo(2), { responseDueDate: futureDays(20), assignedTo: "Colorcon QA" }),
      makeFinding("f-14", "FND-2026-014", "a-6", "AUD-2026-006", "observation", "warehousing", "Warehouse labeling system could be improved with color-coded status labels for quarantine/approved/rejected", "Raw Material Warehouse", "Visual inspection of storage areas", "WHO GSP", "open", daysAgo(1), { assignedTo: "Colorcon Warehouse Manager" }),
      makeFinding("f-15", "FND-2026-015", "a-6", "AUD-2026-006", "minor", "quality-control", "Analytical method transfer documentation from parent site incomplete", "QC Lab", "Method transfer protocol for 3 test methods reviewed", "ICH Q2(R1)", "open", daysAgo(1), { responseDueDate: futureDays(25), assignedTo: "Colorcon QC" }),
    ],
    createdAt: daysAgo(15),
    updatedAt: daysAgo(1),
  },
  // 7. Supplier - planned
  {
    id: "a-7",
    number: "AUD-2026-007",
    title: "Packaging Supplier Audit - Bilcare (Al/Al Blister Foil)",
    type: "supplier",
    status: "planned",
    scope: "GMP audit of aluminum blister foil manufacturing for primary packaging material qualification",
    department: "Supply Chain",
    scheduledDate: futureDays(30),
    leadAuditor: "aud-1",
    auditors: ["aud-1", "aud-4"],
    objectives: [
      "Assess cold-form aluminum foil manufacturing capability",
      "Verify quality control testing program",
      "Review material traceability system",
    ],
    findings: [],
    createdAt: daysAgo(10),
  },

  // ── 2 Regulatory Audits ───────────────────────────────────────────────
  // 8. EDA Inspection - completed
  {
    id: "a-8",
    number: "AUD-2026-008",
    title: "EDA GMP Inspection - Annual Renewal",
    type: "regulatory",
    status: "completed",
    scope: "Egyptian Drug Authority annual GMP inspection covering all manufacturing areas, QC laboratory, warehousing, and quality systems",
    department: "QA",
    scheduledDate: daysAgo(90),
    startDate: daysAgo(88),
    endDate: daysAgo(85),
    leadAuditor: "aud-6",
    auditors: ["aud-6"],
    objectives: [
      "Annual GMP license renewal inspection",
      "Follow-up on previous inspection observations",
      "Verify compliance with latest EDA circulars",
    ],
    checklist: { ...REGULATORY_CHECKLIST, id: "cl-a8" },
    findings: [
      makeFinding("f-16", "FND-2026-016", "a-8", "AUD-2026-008", "major", "production", "Deviation handling procedure does not include root cause analysis methodology requirement", "Production Office", "Deviation SOP reviewed - no specified RCA tools", "EDA GMP Guidelines Section 8.15", "capa-linked", daysAgo(84), { response: "Deviation SOP updated to include mandatory RCA using Ishikawa or 5-Why methodology", responseDueDate: daysAgo(54), responseDate: daysAgo(70), capaId: "capa-103", capaNumber: "CAPA-2026-013", assignedTo: "Dr. Laila Farouk", closedAt: daysAgo(30) }),
      makeFinding("f-17", "FND-2026-017", "a-8", "AUD-2026-008", "major", "quality-control", "Stability program does not cover all marketed products - 2 products missing from annual stability protocol", "Stability Lab", "Annual stability protocol ASP-2026 reviewed against product list", "ICH Q1A(R2), EDA Guidelines", "capa-linked", daysAgo(84), { response: "All marketed products added to stability program. Retrospective stability studies initiated for missing products.", responseDueDate: daysAgo(54), responseDate: daysAgo(65), capaId: "capa-104", capaNumber: "CAPA-2026-014", assignedTo: "Dr. Rania Abdel-Aziz", closedAt: daysAgo(25) }),
      makeFinding("f-18", "FND-2026-018", "a-8", "AUD-2026-008", "minor", "personnel", "Job descriptions for production supervisors do not reference GMP responsibilities", "HR Department", "Job descriptions for 4 supervisor positions reviewed", "WHO TRS 986 Section 9.8", "closed", daysAgo(83), { response: "All job descriptions updated to include GMP responsibilities", responseDate: daysAgo(70), closedAt: daysAgo(50) }),
      makeFinding("f-19", "FND-2026-019", "a-8", "AUD-2026-008", "minor", "facilities", "Emergency exit signage in Warehouse Zone C partially obscured by stacked pallets", "Warehouse Zone C", "Visual observation during walkthrough", "EDA Safety Requirements", "closed", daysAgo(83), { response: "Pallets relocated. Floor markings added to prevent recurrence.", responseDate: daysAgo(82), closedAt: daysAgo(75) }),
      makeFinding("f-20", "FND-2026-020", "a-8", "AUD-2026-008", "observation", "documentation", "Consider transitioning to electronic document management system for better version control", "QA Office", "Paper-based document control system observed", "WHO TRS 986 Annex 2", "open", daysAgo(82), { assignedTo: "Dr. Laila Farouk" }),
    ],
    report: {
      id: "rpt-8",
      auditId: "a-8",
      summary: "The EDA annual GMP inspection identified areas requiring improvement in deviation handling and stability programs. Overall, the facility demonstrates adequate GMP compliance for license renewal. GMP certificate renewed with conditions to address major findings within 90 days.",
      findingsCount: { critical: 0, major: 2, minor: 2, observation: 1, opportunity: 0 },
      overallRating: "needs-improvement",
      recommendations: [
        "Strengthen deviation management with structured RCA methodology",
        "Expand annual stability program to cover all marketed products",
        "Consider electronic document management system investment",
      ],
      scoreByArea: [
        { area: "documentation", score: 76 },
        { area: "facilities", score: 85 },
        { area: "equipment", score: 88 },
        { area: "personnel", score: 80 },
        { area: "production", score: 74 },
        { area: "quality-control", score: 72 },
        { area: "warehousing", score: 83 },
        { area: "complaints", score: 90 },
      ],
      generatedAt: daysAgo(80),
      generatedBy: "Dr. Hassan El-Badawi",
    },
    createdAt: daysAgo(100),
    updatedAt: daysAgo(25),
  },
  // 9. WHO Prequalification - in-progress
  {
    id: "a-9",
    number: "AUD-2026-009",
    title: "WHO Prequalification Inspection - Amoxicillin Line",
    type: "regulatory",
    status: "in-progress",
    scope: "WHO prequalification assessment of Amoxicillin 500mg tablet manufacturing for inclusion in WHO prequalified products list",
    department: "QA",
    scheduledDate: daysAgo(7),
    startDate: daysAgo(5),
    leadAuditor: "aud-7",
    auditors: ["aud-7"],
    objectives: [
      "Assess compliance with WHO prequalification GMP standards",
      "Verify production and QC capability for Amoxicillin 500mg",
      "Review quality management system maturity",
    ],
    checklist: { ...REGULATORY_CHECKLIST, id: "cl-a9" },
    findings: [
      makeFinding("f-21", "FND-2026-021", "a-9", "AUD-2026-009", "critical", "quality-control", "OOS investigation procedure allows re-testing without completing full Phase I laboratory investigation - potential for invalidation of genuine OOS results", "QC Lab", "OOS SOP reviewed - allows immediate retest after single OOS result", "WHO TRS 1010 Annex 3, FDA OOS Guidance", "open", daysAgo(4), { responseDueDate: futureDays(20), assignedTo: "Dr. Rania Abdel-Aziz" }),
      makeFinding("f-22", "FND-2026-022", "a-9", "AUD-2026-009", "major", "production", "Annual product quality review for Amoxicillin 500mg does not include trending of all critical quality attributes as specified in WHO guidelines", "QA Office", "APR for Amoxicillin 500mg (2025) reviewed", "WHO TRS 986 Annex 2 Section 1.5", "open", daysAgo(3), { responseDueDate: futureDays(25), assignedTo: "Dr. Laila Farouk" }),
      makeFinding("f-23", "FND-2026-023", "a-9", "AUD-2026-009", "major", "documentation", "Technology transfer documentation from R&D to production incomplete - missing process characterization studies", "R&D Department", "Technology transfer file for Amoxicillin 500mg reviewed", "WHO TRS 961 Annex 7", "open", daysAgo(3), { responseDueDate: futureDays(30), assignedTo: "Dr. Ahmed Hassan" }),
      makeFinding("f-24", "FND-2026-024", "a-9", "AUD-2026-009", "minor", "equipment", "Some equipment user requirement specifications (URS) do not reference product-specific requirements", "Engineering Office", "URS for granulator and tablet press reviewed", "WHO TRS 986 Annex 4", "open", daysAgo(2), { responseDueDate: futureDays(30), assignedTo: "Eng. Mohamed Fathy" }),
    ],
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
  },

  // ── 3 External Audits ─────────────────────────────────────────────────
  // 10. ISO audit - completed
  {
    id: "a-10",
    number: "AUD-2026-010",
    title: "ISO 9001:2015 Surveillance Audit - TUV",
    type: "external",
    status: "completed",
    scope: "Annual ISO 9001:2015 surveillance audit of quality management system by TUV certification body",
    department: "QA",
    scheduledDate: daysAgo(75),
    startDate: daysAgo(73),
    endDate: daysAgo(72),
    leadAuditor: "aud-8",
    auditors: ["aud-8"],
    objectives: [
      "Verify continued conformity with ISO 9001:2015",
      "Follow up on previous audit nonconformities",
      "Assess management review effectiveness",
    ],
    findings: [
      makeFinding("f-25", "FND-2026-025", "a-10", "AUD-2026-010", "minor", "documentation", "Risk assessment for outsourced processes not documented per clause 8.4", "QA Office", "Outsourced process register reviewed", "ISO 9001:2015 Clause 8.4", "closed", daysAgo(71), { response: "Risk assessment document created for all outsourced processes", responseDate: daysAgo(60), closedAt: daysAgo(50) }),
      makeFinding("f-26", "FND-2026-026", "a-10", "AUD-2026-010", "observation", "personnel", "Consider expanding competence assessment beyond training records to include practical demonstrations", "HR Department", "Competence records reviewed for 10 employees", "ISO 9001:2015 Clause 7.2", "open", daysAgo(71), { assignedTo: "HR Manager" }),
      makeFinding("f-27", "FND-2026-027", "a-10", "AUD-2026-010", "opportunity", "documentation", "Opportunity to integrate ISO document control with GMP document management for efficiency", "QA Office", "Two separate document control systems observed", "ISO 9001:2015 Clause 7.5", "open", daysAgo(70), { assignedTo: "Dr. Laila Farouk" }),
    ],
    report: {
      id: "rpt-10",
      auditId: "a-10",
      summary: "The ISO 9001:2015 surveillance audit confirms continued conformity with the standard. One minor nonconformity identified regarding outsourced process risk assessment. Certification recommended for continuation.",
      findingsCount: { critical: 0, major: 0, minor: 1, observation: 1, opportunity: 1 },
      overallRating: "satisfactory",
      recommendations: [
        "Document risk assessment for all outsourced processes",
        "Consider integrating ISO and GMP document control systems",
      ],
      scoreByArea: [
        { area: "documentation", score: 82 },
        { area: "facilities", score: 90 },
        { area: "equipment", score: 92 },
        { area: "personnel", score: 85 },
        { area: "production", score: 88 },
        { area: "quality-control", score: 90 },
        { area: "warehousing", score: 88 },
        { area: "complaints", score: 92 },
      ],
      generatedAt: daysAgo(68),
      generatedBy: "Dr. Klaus Weber",
    },
    createdAt: daysAgo(85),
    updatedAt: daysAgo(50),
  },
  // 11. Customer audit - completed
  {
    id: "a-11",
    number: "AUD-2026-011",
    title: "Customer Audit - UNICEF Supply Division",
    type: "external",
    status: "completed",
    scope: "Quality system and manufacturing capability audit by UNICEF Supply Division for Amoxicillin procurement qualification",
    department: "QA",
    scheduledDate: daysAgo(35),
    startDate: daysAgo(33),
    endDate: daysAgo(31),
    leadAuditor: "aud-7",
    auditors: ["aud-7"],
    objectives: [
      "Assess manufacturing capability for Amoxicillin 250mg DT",
      "Verify cold chain management for tender requirements",
      "Review quality system compliance with WHO PQ standards",
    ],
    findings: [
      makeFinding("f-28", "FND-2026-028", "a-11", "AUD-2026-011", "major", "warehousing", "Cold chain validation for temperature-sensitive raw materials does not cover all seasonal temperature extremes", "Warehouse Cold Room", "Cold chain validation protocol reviewed - summer mapping missing", "WHO TRS 961 Annex 9", "responded", daysAgo(30), { response: "Summer temperature mapping study scheduled for June. Protocol under preparation.", responseDueDate: futureDays(30), responseDate: daysAgo(20), assignedTo: "Eng. Tarek Nour" }),
      makeFinding("f-29", "FND-2026-029", "a-11", "AUD-2026-011", "minor", "production", "Dispersible tablet dissolution testing does not include all recommended media from WHO guidelines", "QC Dissolution Lab", "Dissolution test method for Amoxicillin 250mg DT reviewed", "WHO TRS 992 Annex 7", "responded", daysAgo(30), { response: "Dissolution method expanded to include additional media per WHO guidance", responseDueDate: daysAgo(5), responseDate: daysAgo(15), assignedTo: "Dr. Rania Abdel-Aziz" }),
      makeFinding("f-30", "FND-2026-030", "a-11", "AUD-2026-011", "observation", "complaints", "Product complaint trending could benefit from more granular categorization aligned with MedDRA terminology", "QA Complaints Office", "Complaint database structure reviewed", "ICH E2B(R3)", "open", daysAgo(29), { assignedTo: "QA Complaints Team" }),
    ],
    report: {
      id: "rpt-11",
      auditId: "a-11",
      summary: "UNICEF Supply Division audit revealed generally satisfactory quality systems with specific gaps in cold chain validation and dissolution testing methodology. Conditional approval recommended pending corrective actions for major finding.",
      findingsCount: { critical: 0, major: 1, minor: 1, observation: 1, opportunity: 0 },
      overallRating: "needs-improvement",
      recommendations: [
        "Complete summer temperature mapping study before next tender submission",
        "Update dissolution methodology to fully align with WHO recommendations",
        "Implement MedDRA-coded complaint categorization",
      ],
      scoreByArea: [
        { area: "documentation", score: 85 },
        { area: "facilities", score: 88 },
        { area: "equipment", score: 90 },
        { area: "personnel", score: 85 },
        { area: "production", score: 82 },
        { area: "quality-control", score: 80 },
        { area: "warehousing", score: 72 },
        { area: "complaints", score: 78 },
      ],
      generatedAt: daysAgo(28),
      generatedBy: "Dr. Sarah Mitchell",
    },
    createdAt: daysAgo(45),
    updatedAt: daysAgo(20),
  },
  // 12. Customer audit - cancelled
  {
    id: "a-12",
    number: "AUD-2026-012",
    title: "Customer Audit - MSF (Medecins Sans Frontieres)",
    type: "external",
    status: "cancelled",
    scope: "Manufacturing capability assessment for MSF essential medicines procurement",
    department: "QA",
    scheduledDate: daysAgo(20),
    leadAuditor: "aud-7",
    auditors: ["aud-7"],
    objectives: [
      "Assess manufacturing capability for essential medicines",
      "Review quality system documentation",
    ],
    findings: [],
    createdAt: daysAgo(40),
    updatedAt: daysAgo(22),
  },
];

// ─── Store ──────────────────────────────────────────────────────────────────

interface AuditStoreData {
  audits: Audit[];
  auditors: Auditor[];
  checklistTemplates: AuditChecklist[];
}

class AuditStore {
  private static instance: AuditStore;

  private constructor() {
    this.seed();
  }

  static getInstance(): AuditStore {
    if (!AuditStore.instance) {
      AuditStore.instance = new AuditStore();
    }
    return AuditStore.instance;
  }

  private seed(): void {
    if (typeof window === "undefined") return;
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      const data: AuditStoreData = {
        audits: SEED_AUDITS,
        auditors: SEED_AUDITORS,
        checklistTemplates: [INTERNAL_CHECKLIST, SUPPLIER_CHECKLIST, REGULATORY_CHECKLIST],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }

  private load(): AuditStoreData {
    if (typeof window === "undefined")
      return { audits: [], auditors: [], checklistTemplates: [] };
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { audits: [], auditors: [], checklistTemplates: [] };
    return JSON.parse(raw) as AuditStoreData;
  }

  private save(data: AuditStoreData): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // ── Audits CRUD ───────────────────────────────────────────────────────

  getAll(): Audit[] {
    return this.load().audits;
  }

  getById(id: string): Audit | undefined {
    return this.load().audits.find((a) => a.id === id);
  }

  create(audit: Omit<Audit, "id" | "number">): Audit {
    const data = this.load();
    const newAudit: Audit = {
      ...audit,
      id: `a-${Date.now()}`,
      number: this.generateNumber(),
    };
    data.audits.push(newAudit);
    this.save(data);
    return newAudit;
  }

  update(id: string, updates: Partial<Audit>): Audit | undefined {
    const data = this.load();
    const idx = data.audits.findIndex((a) => a.id === id);
    if (idx === -1) return undefined;
    data.audits[idx] = { ...data.audits[idx], ...updates };
    this.save(data);
    return data.audits[idx];
  }

  delete(id: string): boolean {
    const data = this.load();
    const idx = data.audits.findIndex((a) => a.id === id);
    if (idx === -1) return false;
    data.audits.splice(idx, 1);
    this.save(data);
    return true;
  }

  // ── Queries ───────────────────────────────────────────────────────────

  getByStatus(status: AuditStatus): Audit[] {
    return this.load().audits.filter((a) => a.status === status);
  }

  getByType(type: AuditType): Audit[] {
    return this.load().audits.filter((a) => a.type === type);
  }

  getUpcoming(days: number = 30): Audit[] {
    const now = new Date();
    const limit = new Date();
    limit.setDate(limit.getDate() + days);
    return this.load().audits.filter((a) => {
      if (a.status !== "planned") return false;
      const sd = new Date(a.scheduledDate);
      return sd >= now && sd <= limit;
    });
  }

  getFindings(auditId?: string): AuditFinding[] {
    const audits = this.load().audits;
    if (auditId) {
      const audit = audits.find((a) => a.id === auditId);
      return audit ? audit.findings : [];
    }
    return audits.flatMap((a) => a.findings);
  }

  getOverdueFindings(): AuditFinding[] {
    const now = new Date();
    return this.getFindings().filter(
      (f) =>
        f.status === "open" &&
        f.responseDueDate &&
        new Date(f.responseDueDate) < now
    );
  }

  getFindingsByCategory(category: FindingCategory): AuditFinding[] {
    return this.getFindings().filter((f) => f.category === category);
  }

  getFindingsByStatus(status: FindingStatus): AuditFinding[] {
    return this.getFindings().filter((f) => f.status === status);
  }

  // ── Finding Management ────────────────────────────────────────────────

  addFinding(auditId: string, finding: Omit<AuditFinding, "id" | "findingNumber" | "auditId" | "auditNumber">): AuditFinding | undefined {
    const data = this.load();
    const idx = data.audits.findIndex((a) => a.id === auditId);
    if (idx === -1) return undefined;
    const newFinding: AuditFinding = {
      ...finding,
      id: `f-${Date.now()}`,
      findingNumber: this.generateFindingNumber(),
      auditId,
      auditNumber: data.audits[idx].number,
    };
    data.audits[idx].findings.push(newFinding);
    this.save(data);
    return newFinding;
  }

  updateFinding(auditId: string, findingId: string, updates: Partial<AuditFinding>): AuditFinding | undefined {
    const data = this.load();
    const aIdx = data.audits.findIndex((a) => a.id === auditId);
    if (aIdx === -1) return undefined;
    const fIdx = data.audits[aIdx].findings.findIndex((f) => f.id === findingId);
    if (fIdx === -1) return undefined;
    data.audits[aIdx].findings[fIdx] = {
      ...data.audits[aIdx].findings[fIdx],
      ...updates,
    };
    this.save(data);
    return data.audits[aIdx].findings[fIdx];
  }

  // ── Auditors ──────────────────────────────────────────────────────────

  getAuditors(): Auditor[] {
    return this.load().auditors;
  }

  getAuditorById(id: string): Auditor | undefined {
    return this.load().auditors.find((a) => a.id === id);
  }

  // ── Checklists ────────────────────────────────────────────────────────

  getChecklistTemplates(): AuditChecklist[] {
    return this.load().checklistTemplates;
  }

  getChecklistByType(type: AuditType): AuditChecklist | undefined {
    return this.load().checklistTemplates.find((c) => c.auditType === type);
  }

  // ── Number Generation ─────────────────────────────────────────────────

  generateNumber(): string {
    const all = this.load().audits;
    const year = new Date().getFullYear();
    const prefix = `AUD-${year}-`;
    const existing = all
      .filter((a) => a.number.startsWith(prefix))
      .map((a) => parseInt(a.number.replace(prefix, ""), 10))
      .filter((n) => !isNaN(n));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `${prefix}${String(next).padStart(3, "0")}`;
  }

  generateFindingNumber(): string {
    const allFindings = this.getFindings();
    const year = new Date().getFullYear();
    const prefix = `FND-${year}-`;
    const existing = allFindings
      .filter((f) => f.findingNumber.startsWith(prefix))
      .map((f) => parseInt(f.findingNumber.replace(prefix, ""), 10))
      .filter((n) => !isNaN(n));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `${prefix}${String(next).padStart(3, "0")}`;
  }

  // ── Metrics ───────────────────────────────────────────────────────────

  getMetrics(): AuditMetrics {
    const all = this.load().audits;
    const allFindings = all.flatMap((a) => a.findings);

    const planned = all.filter((a) => a.status === "planned").length;
    const inProgress = all.filter((a) => a.status === "in-progress").length;
    const completed = all.filter((a) => a.status === "completed").length;
    const cancelled = all.filter((a) => a.status === "cancelled").length;

    const openFindings = allFindings.filter(
      (f) => f.status === "open" || f.status === "responded" || f.status === "overdue"
    ).length;
    const criticalFindings = allFindings.filter(
      (f) => f.category === "critical" && f.status !== "closed"
    ).length;

    const closedFindings = allFindings.filter((f) => f.status === "closed").length;
    const closableFindings = allFindings.filter(
      (f) => f.category !== "opportunity"
    ).length;
    const findingClosureRate =
      closableFindings > 0
        ? Math.round((closedFindings / closableFindings) * 100)
        : 100;

    // By type
    const typeMap = new Map<string, number>();
    all.forEach((a) => typeMap.set(a.type, (typeMap.get(a.type) || 0) + 1));
    const byType = Array.from(typeMap.entries()).map(([type, count]) => ({
      type: type as AuditType,
      count,
    }));

    // By department
    const deptMap = new Map<string, number>();
    all.forEach((a) => deptMap.set(a.department, (deptMap.get(a.department) || 0) + 1));
    const byDepartment = Array.from(deptMap.entries()).map(
      ([department, count]) => ({ department, count })
    );

    // Findings by category
    const catMap = new Map<string, number>();
    allFindings.forEach((f) =>
      catMap.set(f.category, (catMap.get(f.category) || 0) + 1)
    );
    const findingsByCategory = Array.from(catMap.entries()).map(
      ([category, count]) => ({ category: category as FindingCategory, count })
    );

    // Findings by GMP area
    const areaMap = new Map<string, number>();
    allFindings.forEach((f) =>
      areaMap.set(f.gmpArea, (areaMap.get(f.gmpArea) || 0) + 1)
    );
    const findingsByGMPArea = Array.from(areaMap.entries()).map(
      ([area, count]) => ({ area: area as GMPArea, count })
    );

    // Quarterly trend (simulate 4 quarters)
    const quarterlyTrend = [
      {
        quarter: "Q3 2025",
        audits: 3,
        findings: 12,
        critical: 1,
        major: 3,
        minor: 5,
        observation: 3,
      },
      {
        quarter: "Q4 2025",
        audits: 4,
        findings: 15,
        critical: 0,
        major: 5,
        minor: 6,
        observation: 4,
      },
      {
        quarter: "Q1 2026",
        audits: 5,
        findings: 18,
        critical: 1,
        major: 6,
        minor: 7,
        observation: 4,
      },
      {
        quarter: "Q2 2026",
        audits: all.length,
        findings: allFindings.length,
        critical: allFindings.filter((f) => f.category === "critical").length,
        major: allFindings.filter((f) => f.category === "major").length,
        minor: allFindings.filter((f) => f.category === "minor").length,
        observation: allFindings.filter((f) => f.category === "observation")
          .length,
      },
    ];

    return {
      totalAudits: all.length,
      planned,
      inProgress,
      completed,
      cancelled,
      totalFindings: allFindings.length,
      openFindings,
      criticalFindings,
      findingClosureRate,
      byType,
      byDepartment,
      findingsByCategory,
      findingsByGMPArea,
      quarterlyTrend,
    };
  }
}

export const auditStore = AuditStore.getInstance();
