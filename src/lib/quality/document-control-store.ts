"use client";

import type {
  ControlledDocument,
  DocumentStatus,
  DocumentCategory,
  DocumentMetrics,
  DocumentVersion,
  DocumentReview,
  DocumentTraining,
} from "./document-control-types";

const STORAGE_KEY = "pharma.documents";

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

const DEPARTMENTS = [
  "Production",
  "Quality Control",
  "Quality Assurance",
  "R&D",
  "Engineering",
  "Warehouse",
  "Regulatory Affairs",
  "Supply Chain",
];

const SEED_DATA: ControlledDocument[] = [
  // ─── SOPs ──────────────────────────────────────────────────────────
  {
    id: "doc-1",
    documentNumber: "SOP-PRD-001",
    title: "Tablet Manufacturing Process - Wet Granulation",
    category: "SOP",
    department: "Production",
    currentVersion: "3.0",
    effectiveDate: daysAgo(180),
    reviewDate: daysAgo(180),
    nextReviewDate: futureDays(185),
    status: "effective",
    description:
      "Standard operating procedure for wet granulation tablet manufacturing process including mixing, granulation, drying, milling, compression, and coating steps.",
    author: "Dr. Youssef Kamel",
    reviewer: "Dr. Laila Farouk",
    approver: "Dr. Amr Selim",
    versions: [
      {
        versionNumber: "1.0",
        changeSummary: "Initial release",
        author: "Dr. Youssef Kamel",
        reviewer: "Dr. Laila Farouk",
        approver: "Dr. Amr Selim",
        createdAt: daysAgo(900),
        reviewedAt: daysAgo(895),
        approvedAt: daysAgo(893),
        effectiveAt: daysAgo(890),
      },
      {
        versionNumber: "2.0",
        changeSummary: "Updated granulation parameters per process validation results",
        author: "Dr. Youssef Kamel",
        reviewer: "Dr. Laila Farouk",
        approver: "Dr. Amr Selim",
        createdAt: daysAgo(540),
        reviewedAt: daysAgo(535),
        approvedAt: daysAgo(533),
        effectiveAt: daysAgo(530),
      },
      {
        versionNumber: "3.0",
        changeSummary: "Added in-process control limits for moisture content per EDA audit observation",
        author: "Dr. Youssef Kamel",
        reviewer: "Dr. Laila Farouk",
        approver: "Dr. Amr Selim",
        createdAt: daysAgo(185),
        reviewedAt: daysAgo(183),
        approvedAt: daysAgo(181),
        effectiveAt: daysAgo(180),
      },
    ],
    reviews: [],
    training: {
      id: "trn-1",
      documentId: "doc-1",
      documentNumber: "SOP-PRD-001",
      documentTitle: "Tablet Manufacturing Process - Wet Granulation",
      requiredFor: ["Production Operators", "Production Supervisors", "IPC Analysts"],
      trainingType: "hands-on",
      dueDate: daysAgo(170),
      completedBy: ["Ahmed M.", "Fatma S.", "Hassan K.", "Noha R."],
      pendingFor: [],
    },
    relatedDocuments: ["SOP-PRD-002", "FRM-PRD-001", "SPEC-FP-001"],
    keywords: ["tablet", "granulation", "wet granulation", "compression", "coating"],
    confidentiality: "internal",
    retentionYears: 10,
    createdAt: daysAgo(900),
    updatedAt: daysAgo(180),
  },
  {
    id: "doc-2",
    documentNumber: "SOP-QC-001",
    title: "HPLC Analytical Method for Assay Determination",
    category: "SOP",
    department: "Quality Control",
    currentVersion: "2.1",
    effectiveDate: daysAgo(90),
    reviewDate: daysAgo(90),
    nextReviewDate: futureDays(275),
    status: "effective",
    description:
      "Standard operating procedure for assay determination using HPLC method. Covers system suitability, sample preparation, chromatographic conditions, and calculation.",
    author: "Dr. Rania Abdel-Aziz",
    reviewer: "Dr. Laila Farouk",
    approver: "Dr. Amr Selim",
    versions: [
      {
        versionNumber: "1.0",
        changeSummary: "Initial release",
        author: "Dr. Rania Abdel-Aziz",
        reviewer: "Dr. Laila Farouk",
        approver: "Dr. Amr Selim",
        createdAt: daysAgo(700),
        reviewedAt: daysAgo(696),
        approvedAt: daysAgo(694),
        effectiveAt: daysAgo(690),
      },
      {
        versionNumber: "2.0",
        changeSummary: "Updated mobile phase composition based on method validation",
        author: "Dr. Rania Abdel-Aziz",
        reviewer: "Dr. Laila Farouk",
        approver: "Dr. Amr Selim",
        createdAt: daysAgo(360),
        reviewedAt: daysAgo(356),
        approvedAt: daysAgo(354),
        effectiveAt: daysAgo(350),
      },
      {
        versionNumber: "2.1",
        changeSummary: "Minor correction to system suitability acceptance criteria",
        author: "Dr. Rania Abdel-Aziz",
        reviewer: "Dr. Laila Farouk",
        approver: "Dr. Amr Selim",
        createdAt: daysAgo(95),
        reviewedAt: daysAgo(93),
        approvedAt: daysAgo(91),
        effectiveAt: daysAgo(90),
      },
    ],
    reviews: [],
    training: {
      id: "trn-2",
      documentId: "doc-2",
      documentNumber: "SOP-QC-001",
      documentTitle: "HPLC Analytical Method for Assay Determination",
      requiredFor: ["QC Analysts", "QC Supervisors"],
      trainingType: "hands-on",
      dueDate: daysAgo(80),
      completedBy: ["Salma A.", "Karim T."],
      pendingFor: ["New Analyst (Pending)"],
    },
    relatedDocuments: ["SOP-QC-002", "FRM-QC-001"],
    keywords: ["HPLC", "assay", "analytical method", "chromatography"],
    confidentiality: "internal",
    retentionYears: 10,
    createdAt: daysAgo(700),
    updatedAt: daysAgo(90),
  },
  {
    id: "doc-3",
    documentNumber: "SOP-QA-010",
    title: "Deviation Handling and Investigation",
    category: "SOP",
    department: "Quality Assurance",
    currentVersion: "4.0",
    effectiveDate: daysAgo(60),
    reviewDate: daysAgo(60),
    nextReviewDate: futureDays(305),
    status: "effective",
    description:
      "Procedure for reporting, investigating, classifying, and closing deviations in manufacturing, testing, and support processes per GMP requirements.",
    author: "Dr. Laila Farouk",
    reviewer: "Dr. Rania Abdel-Aziz",
    approver: "Dr. Amr Selim",
    versions: [
      {
        versionNumber: "3.0",
        changeSummary: "Added root cause analysis methodology (Ishikawa, 5 Whys)",
        author: "Dr. Laila Farouk",
        reviewer: "Dr. Rania Abdel-Aziz",
        approver: "Dr. Amr Selim",
        createdAt: daysAgo(400),
        reviewedAt: daysAgo(396),
        approvedAt: daysAgo(394),
        effectiveAt: daysAgo(390),
      },
      {
        versionNumber: "4.0",
        changeSummary: "Aligned with updated EDA circular on deviation classification and escalation criteria",
        author: "Dr. Laila Farouk",
        reviewer: "Dr. Rania Abdel-Aziz",
        approver: "Dr. Amr Selim",
        createdAt: daysAgo(65),
        reviewedAt: daysAgo(63),
        approvedAt: daysAgo(61),
        effectiveAt: daysAgo(60),
      },
    ],
    reviews: [],
    training: null,
    relatedDocuments: ["SOP-QA-011", "FRM-QA-010", "SOP-QA-020"],
    keywords: ["deviation", "investigation", "root cause", "CAPA", "GMP"],
    confidentiality: "internal",
    retentionYears: 15,
    createdAt: daysAgo(1000),
    updatedAt: daysAgo(60),
  },
  {
    id: "doc-4",
    documentNumber: "SOP-QA-020",
    title: "Change Control Management",
    category: "SOP",
    department: "Quality Assurance",
    currentVersion: "2.0",
    effectiveDate: daysAgo(120),
    reviewDate: daysAgo(120),
    nextReviewDate: futureDays(245),
    status: "effective",
    description:
      "Procedure for initiating, evaluating, approving, implementing, and closing changes to GMP-critical processes, equipment, materials, facilities, and documents.",
    author: "Dr. Laila Farouk",
    reviewer: "Dr. Youssef Kamel",
    approver: "Dr. Amr Selim",
    versions: [
      {
        versionNumber: "1.0",
        changeSummary: "Initial release",
        author: "Dr. Laila Farouk",
        reviewer: "Dr. Youssef Kamel",
        approver: "Dr. Amr Selim",
        createdAt: daysAgo(500),
        reviewedAt: daysAgo(497),
        approvedAt: daysAgo(495),
        effectiveAt: daysAgo(490),
      },
      {
        versionNumber: "2.0",
        changeSummary: "Added impact assessment matrix and regulatory filing triggers",
        author: "Dr. Laila Farouk",
        reviewer: "Dr. Youssef Kamel",
        approver: "Dr. Amr Selim",
        createdAt: daysAgo(125),
        reviewedAt: daysAgo(123),
        approvedAt: daysAgo(121),
        effectiveAt: daysAgo(120),
      },
    ],
    reviews: [],
    training: null,
    relatedDocuments: ["SOP-QA-010", "FRM-QA-020"],
    keywords: ["change control", "change management", "impact assessment"],
    confidentiality: "internal",
    retentionYears: 15,
    createdAt: daysAgo(500),
    updatedAt: daysAgo(120),
  },
  {
    id: "doc-5",
    documentNumber: "SOP-QA-030",
    title: "Cleaning Validation Protocol",
    category: "SOP",
    department: "Quality Assurance",
    currentVersion: "1.2",
    effectiveDate: daysAgo(200),
    reviewDate: daysAgo(200),
    nextReviewDate: daysAgo(5),
    status: "effective",
    description:
      "Procedure for developing, executing, and maintaining cleaning validation for manufacturing equipment per EDA and WHO guidelines.",
    author: "Dr. Ahmed Hassan",
    reviewer: "Dr. Laila Farouk",
    approver: "Dr. Amr Selim",
    versions: [
      {
        versionNumber: "1.0",
        changeSummary: "Initial release",
        author: "Dr. Ahmed Hassan",
        reviewer: "Dr. Laila Farouk",
        approver: "Dr. Amr Selim",
        createdAt: daysAgo(600),
        reviewedAt: daysAgo(597),
        approvedAt: daysAgo(595),
        effectiveAt: daysAgo(590),
      },
      {
        versionNumber: "1.2",
        changeSummary: "Updated acceptance criteria for MACO calculations",
        author: "Dr. Ahmed Hassan",
        reviewer: "Dr. Laila Farouk",
        approver: "Dr. Amr Selim",
        createdAt: daysAgo(205),
        reviewedAt: daysAgo(203),
        approvedAt: daysAgo(201),
        effectiveAt: daysAgo(200),
      },
    ],
    reviews: [
      {
        id: "rev-5-1",
        documentId: "doc-5",
        reviewer: "Dr. Laila Farouk",
        status: "overdue",
        comments: "",
        dueDate: daysAgo(5),
        assignedAt: daysAgo(35),
      },
    ],
    training: null,
    relatedDocuments: ["VP-CLN-001", "FRM-QA-030"],
    keywords: ["cleaning validation", "MACO", "swab", "rinse"],
    confidentiality: "internal",
    retentionYears: 15,
    createdAt: daysAgo(600),
    updatedAt: daysAgo(200),
  },
  // ─── Work Instructions ─────────────────────────────────────────────
  {
    id: "doc-6",
    documentNumber: "WI-PRD-001",
    title: "Operation of Fluid Bed Dryer FBD-200",
    category: "Work Instruction",
    department: "Production",
    currentVersion: "2.0",
    effectiveDate: daysAgo(150),
    reviewDate: daysAgo(150),
    nextReviewDate: futureDays(215),
    status: "effective",
    description:
      "Step-by-step work instruction for operating the Glatt GPCG-200 fluid bed dryer including pre-checks, startup, operation, shutdown, and cleaning.",
    author: "Eng. Mohamed Fathy",
    reviewer: "Dr. Youssef Kamel",
    approver: "Dr. Laila Farouk",
    versions: [
      {
        versionNumber: "1.0",
        changeSummary: "Initial release",
        author: "Eng. Mohamed Fathy",
        reviewer: "Dr. Youssef Kamel",
        approver: "Dr. Laila Farouk",
        createdAt: daysAgo(520),
        reviewedAt: daysAgo(517),
        approvedAt: daysAgo(515),
        effectiveAt: daysAgo(510),
      },
      {
        versionNumber: "2.0",
        changeSummary: "Added inlet air temperature monitoring and alarm limits",
        author: "Eng. Mohamed Fathy",
        reviewer: "Dr. Youssef Kamel",
        approver: "Dr. Laila Farouk",
        createdAt: daysAgo(155),
        reviewedAt: daysAgo(153),
        approvedAt: daysAgo(151),
        effectiveAt: daysAgo(150),
      },
    ],
    reviews: [],
    training: {
      id: "trn-6",
      documentId: "doc-6",
      documentNumber: "WI-PRD-001",
      documentTitle: "Operation of Fluid Bed Dryer FBD-200",
      requiredFor: ["Production Operators - Granulation"],
      trainingType: "hands-on",
      dueDate: daysAgo(140),
      completedBy: ["Ahmed M.", "Hassan K."],
      pendingFor: ["Omar S."],
    },
    relatedDocuments: ["SOP-PRD-001", "SOP-ENG-005"],
    keywords: ["fluid bed dryer", "FBD", "drying", "granulation"],
    confidentiality: "internal",
    retentionYears: 10,
    createdAt: daysAgo(520),
    updatedAt: daysAgo(150),
  },
  {
    id: "doc-7",
    documentNumber: "WI-QC-001",
    title: "Raw Material Sampling Procedure",
    category: "Work Instruction",
    department: "Quality Control",
    currentVersion: "3.0",
    effectiveDate: daysAgo(30),
    reviewDate: daysAgo(30),
    nextReviewDate: futureDays(335),
    status: "effective",
    description:
      "Work instruction for sampling incoming raw materials including sampling plan (sqrt(n)+1), sampling tools, containers, labeling, and sample storage.",
    author: "Pharm. Mariam Khalil",
    reviewer: "Dr. Rania Abdel-Aziz",
    approver: "Dr. Laila Farouk",
    versions: [
      {
        versionNumber: "2.0",
        changeSummary: "Updated sampling plan for high-risk APIs",
        author: "Pharm. Mariam Khalil",
        reviewer: "Dr. Rania Abdel-Aziz",
        approver: "Dr. Laila Farouk",
        createdAt: daysAgo(400),
        reviewedAt: daysAgo(397),
        approvedAt: daysAgo(395),
        effectiveAt: daysAgo(390),
      },
      {
        versionNumber: "3.0",
        changeSummary: "Added identity testing requirements per updated pharmacopoeia",
        author: "Pharm. Mariam Khalil",
        reviewer: "Dr. Rania Abdel-Aziz",
        approver: "Dr. Laila Farouk",
        createdAt: daysAgo(35),
        reviewedAt: daysAgo(33),
        approvedAt: daysAgo(31),
        effectiveAt: daysAgo(30),
      },
    ],
    reviews: [],
    training: null,
    relatedDocuments: ["SOP-QC-005", "FRM-QC-005"],
    keywords: ["sampling", "raw material", "incoming", "identity test"],
    confidentiality: "internal",
    retentionYears: 10,
    createdAt: daysAgo(700),
    updatedAt: daysAgo(30),
  },
  // ─── Forms ─────────────────────────────────────────────────────────
  {
    id: "doc-8",
    documentNumber: "FRM-PRD-001",
    title: "Batch Manufacturing Record Template",
    category: "Form",
    department: "Production",
    currentVersion: "5.0",
    effectiveDate: daysAgo(45),
    reviewDate: daysAgo(45),
    nextReviewDate: futureDays(320),
    status: "effective",
    description:
      "Master batch manufacturing record template for solid oral dosage forms. Includes material reconciliation, in-process controls, equipment log, and yield calculations.",
    author: "Dr. Youssef Kamel",
    reviewer: "Dr. Laila Farouk",
    approver: "Dr. Amr Selim",
    versions: [
      {
        versionNumber: "4.0",
        changeSummary: "Added environmental monitoring fields",
        author: "Dr. Youssef Kamel",
        reviewer: "Dr. Laila Farouk",
        approver: "Dr. Amr Selim",
        createdAt: daysAgo(380),
        reviewedAt: daysAgo(377),
        approvedAt: daysAgo(375),
        effectiveAt: daysAgo(370),
      },
      {
        versionNumber: "5.0",
        changeSummary: "Incorporated electronic batch record fields for EBR transition",
        author: "Dr. Youssef Kamel",
        reviewer: "Dr. Laila Farouk",
        approver: "Dr. Amr Selim",
        createdAt: daysAgo(50),
        reviewedAt: daysAgo(48),
        approvedAt: daysAgo(46),
        effectiveAt: daysAgo(45),
      },
    ],
    reviews: [],
    training: {
      id: "trn-8",
      documentId: "doc-8",
      documentNumber: "FRM-PRD-001",
      documentTitle: "Batch Manufacturing Record Template",
      requiredFor: ["Production Operators", "Production Supervisors", "QA Reviewers"],
      trainingType: "read-and-understand",
      dueDate: daysAgo(35),
      completedBy: ["Ahmed M.", "Fatma S.", "Hassan K."],
      pendingFor: ["Noha R.", "Sara T."],
    },
    relatedDocuments: ["SOP-PRD-001", "SOP-PRD-002"],
    keywords: ["batch record", "BMR", "manufacturing record"],
    confidentiality: "confidential",
    retentionYears: 15,
    createdAt: daysAgo(1200),
    updatedAt: daysAgo(45),
  },
  {
    id: "doc-9",
    documentNumber: "FRM-QA-010",
    title: "Deviation Report Form",
    category: "Form",
    department: "Quality Assurance",
    currentVersion: "3.1",
    effectiveDate: daysAgo(60),
    reviewDate: daysAgo(60),
    nextReviewDate: futureDays(305),
    status: "effective",
    description:
      "Standardized form for documenting deviations including initial reporting, investigation details, root cause, CAPA linkage, and closure.",
    author: "Dr. Laila Farouk",
    reviewer: "Dr. Rania Abdel-Aziz",
    approver: "Dr. Amr Selim",
    versions: [
      {
        versionNumber: "3.0",
        changeSummary: "Added risk assessment matrix section",
        author: "Dr. Laila Farouk",
        reviewer: "Dr. Rania Abdel-Aziz",
        approver: "Dr. Amr Selim",
        createdAt: daysAgo(300),
        reviewedAt: daysAgo(297),
        approvedAt: daysAgo(295),
        effectiveAt: daysAgo(290),
      },
      {
        versionNumber: "3.1",
        changeSummary: "Minor formatting corrections and added electronic signature fields",
        author: "Dr. Laila Farouk",
        reviewer: "Dr. Rania Abdel-Aziz",
        approver: "Dr. Amr Selim",
        createdAt: daysAgo(65),
        reviewedAt: daysAgo(63),
        approvedAt: daysAgo(61),
        effectiveAt: daysAgo(60),
      },
    ],
    reviews: [],
    training: null,
    relatedDocuments: ["SOP-QA-010", "SOP-QA-011"],
    keywords: ["deviation", "deviation report", "investigation form"],
    confidentiality: "internal",
    retentionYears: 15,
    createdAt: daysAgo(800),
    updatedAt: daysAgo(60),
  },
  {
    id: "doc-10",
    documentNumber: "FRM-QA-020",
    title: "CAPA Request and Tracking Form",
    category: "Form",
    department: "Quality Assurance",
    currentVersion: "2.0",
    effectiveDate: daysAgo(100),
    reviewDate: daysAgo(100),
    nextReviewDate: futureDays(265),
    status: "effective",
    description:
      "Form for initiating, tracking, and closing Corrective and Preventive Actions (CAPA) including effectiveness verification.",
    author: "Dr. Laila Farouk",
    reviewer: "Dr. Youssef Kamel",
    approver: "Dr. Amr Selim",
    versions: [
      {
        versionNumber: "1.0",
        changeSummary: "Initial release",
        author: "Dr. Laila Farouk",
        reviewer: "Dr. Youssef Kamel",
        approver: "Dr. Amr Selim",
        createdAt: daysAgo(500),
        reviewedAt: daysAgo(497),
        approvedAt: daysAgo(495),
        effectiveAt: daysAgo(490),
      },
      {
        versionNumber: "2.0",
        changeSummary: "Added effectiveness check criteria and follow-up fields",
        author: "Dr. Laila Farouk",
        reviewer: "Dr. Youssef Kamel",
        approver: "Dr. Amr Selim",
        createdAt: daysAgo(105),
        reviewedAt: daysAgo(103),
        approvedAt: daysAgo(101),
        effectiveAt: daysAgo(100),
      },
    ],
    reviews: [],
    training: null,
    relatedDocuments: ["SOP-QA-010", "SOP-QA-011", "FRM-QA-010"],
    keywords: ["CAPA", "corrective action", "preventive action"],
    confidentiality: "internal",
    retentionYears: 15,
    createdAt: daysAgo(500),
    updatedAt: daysAgo(100),
  },
  // ─── Policies ──────────────────────────────────────────────────────
  {
    id: "doc-11",
    documentNumber: "POL-QA-001",
    title: "Quality Policy Statement",
    category: "Policy",
    department: "Quality Assurance",
    currentVersion: "2.0",
    effectiveDate: daysAgo(365),
    reviewDate: daysAgo(365),
    nextReviewDate: futureDays(0),
    status: "effective",
    description:
      "Company quality policy statement defining commitment to GMP compliance, patient safety, continuous improvement, and regulatory adherence per EDA and WHO guidelines.",
    author: "Dr. Amr Selim",
    reviewer: "Dr. Laila Farouk",
    approver: "Dr. Amr Selim",
    versions: [
      {
        versionNumber: "1.0",
        changeSummary: "Initial release",
        author: "Dr. Amr Selim",
        reviewer: "Dr. Laila Farouk",
        approver: "Dr. Amr Selim",
        createdAt: daysAgo(1500),
        reviewedAt: daysAgo(1497),
        approvedAt: daysAgo(1495),
        effectiveAt: daysAgo(1490),
      },
      {
        versionNumber: "2.0",
        changeSummary: "Updated to align with ICH Q10 Pharmaceutical Quality System",
        author: "Dr. Amr Selim",
        reviewer: "Dr. Laila Farouk",
        approver: "Dr. Amr Selim",
        createdAt: daysAgo(370),
        reviewedAt: daysAgo(368),
        approvedAt: daysAgo(366),
        effectiveAt: daysAgo(365),
      },
    ],
    reviews: [
      {
        id: "rev-11-1",
        documentId: "doc-11",
        reviewer: "Dr. Laila Farouk",
        status: "pending",
        comments: "",
        dueDate: futureDays(0),
        assignedAt: daysAgo(30),
      },
    ],
    training: {
      id: "trn-11",
      documentId: "doc-11",
      documentNumber: "POL-QA-001",
      documentTitle: "Quality Policy Statement",
      requiredFor: ["All Departments"],
      trainingType: "read-and-understand",
      dueDate: daysAgo(350),
      completedBy: ["All Staff"],
      pendingFor: [],
    },
    relatedDocuments: ["POL-QA-002", "SOP-QA-001"],
    keywords: ["quality policy", "GMP", "ICH Q10", "pharmaceutical quality system"],
    confidentiality: "public",
    retentionYears: 20,
    createdAt: daysAgo(1500),
    updatedAt: daysAgo(365),
  },
  {
    id: "doc-12",
    documentNumber: "POL-QA-002",
    title: "GMP Compliance and Manufacturing Policy",
    category: "Policy",
    department: "Quality Assurance",
    currentVersion: "3.0",
    effectiveDate: daysAgo(250),
    reviewDate: daysAgo(250),
    nextReviewDate: futureDays(115),
    status: "effective",
    description:
      "Policy defining GMP requirements for manufacturing, testing, storage, and distribution of pharmaceutical products in compliance with Egyptian Drug Authority regulations.",
    author: "Dr. Laila Farouk",
    reviewer: "Dr. Amr Selim",
    approver: "Dr. Amr Selim",
    versions: [
      {
        versionNumber: "2.0",
        changeSummary: "Updated for WHO PQ requirements",
        author: "Dr. Laila Farouk",
        reviewer: "Dr. Amr Selim",
        approver: "Dr. Amr Selim",
        createdAt: daysAgo(600),
        reviewedAt: daysAgo(597),
        approvedAt: daysAgo(595),
        effectiveAt: daysAgo(590),
      },
      {
        versionNumber: "3.0",
        changeSummary: "Incorporated latest EDA GMP guidelines (2025 revision)",
        author: "Dr. Laila Farouk",
        reviewer: "Dr. Amr Selim",
        approver: "Dr. Amr Selim",
        createdAt: daysAgo(255),
        reviewedAt: daysAgo(253),
        approvedAt: daysAgo(251),
        effectiveAt: daysAgo(250),
      },
    ],
    reviews: [],
    training: null,
    relatedDocuments: ["POL-QA-001", "SOP-QA-001"],
    keywords: ["GMP", "manufacturing policy", "EDA", "compliance"],
    confidentiality: "public",
    retentionYears: 20,
    createdAt: daysAgo(1200),
    updatedAt: daysAgo(250),
  },
  // ─── Specifications ────────────────────────────────────────────────
  {
    id: "doc-13",
    documentNumber: "SPEC-RM-001",
    title: "Raw Material Specification - Amoxicillin Trihydrate",
    category: "Specification",
    department: "Quality Control",
    currentVersion: "2.0",
    effectiveDate: daysAgo(180),
    reviewDate: daysAgo(180),
    nextReviewDate: futureDays(185),
    status: "effective",
    description:
      "Specification for Amoxicillin Trihydrate API including identification, assay, impurities, water content, particle size, and microbiological limits per BP/USP.",
    author: "Dr. Rania Abdel-Aziz",
    reviewer: "Dr. Ahmed Hassan",
    approver: "Dr. Laila Farouk",
    versions: [
      {
        versionNumber: "1.0",
        changeSummary: "Initial release per BP 2023",
        author: "Dr. Rania Abdel-Aziz",
        reviewer: "Dr. Ahmed Hassan",
        approver: "Dr. Laila Farouk",
        createdAt: daysAgo(800),
        reviewedAt: daysAgo(797),
        approvedAt: daysAgo(795),
        effectiveAt: daysAgo(790),
      },
      {
        versionNumber: "2.0",
        changeSummary: "Updated impurity limits per BP 2025 monograph revision",
        author: "Dr. Rania Abdel-Aziz",
        reviewer: "Dr. Ahmed Hassan",
        approver: "Dr. Laila Farouk",
        createdAt: daysAgo(185),
        reviewedAt: daysAgo(183),
        approvedAt: daysAgo(181),
        effectiveAt: daysAgo(180),
      },
    ],
    reviews: [],
    training: null,
    relatedDocuments: ["SOP-QC-001", "SOP-QC-005"],
    keywords: ["amoxicillin", "API", "raw material", "specification"],
    confidentiality: "confidential",
    retentionYears: 10,
    createdAt: daysAgo(800),
    updatedAt: daysAgo(180),
  },
  {
    id: "doc-14",
    documentNumber: "SPEC-FP-001",
    title: "Finished Product Specification - Amoxicillin 500mg Tablets",
    category: "Specification",
    department: "Quality Control",
    currentVersion: "3.0",
    effectiveDate: daysAgo(90),
    reviewDate: daysAgo(90),
    nextReviewDate: futureDays(275),
    status: "effective",
    description:
      "Release and shelf-life specifications for Amoxicillin 500mg film-coated tablets including assay, dissolution, content uniformity, related substances, and physical tests.",
    author: "Dr. Rania Abdel-Aziz",
    reviewer: "Dr. Ahmed Hassan",
    approver: "Dr. Laila Farouk",
    versions: [
      {
        versionNumber: "2.0",
        changeSummary: "Updated dissolution specification to Q=80% in 30 minutes",
        author: "Dr. Rania Abdel-Aziz",
        reviewer: "Dr. Ahmed Hassan",
        approver: "Dr. Laila Farouk",
        createdAt: daysAgo(450),
        reviewedAt: daysAgo(447),
        approvedAt: daysAgo(445),
        effectiveAt: daysAgo(440),
      },
      {
        versionNumber: "3.0",
        changeSummary: "Tightened degradation impurity limit per stability data trend analysis",
        author: "Dr. Rania Abdel-Aziz",
        reviewer: "Dr. Ahmed Hassan",
        approver: "Dr. Laila Farouk",
        createdAt: daysAgo(95),
        reviewedAt: daysAgo(93),
        approvedAt: daysAgo(91),
        effectiveAt: daysAgo(90),
      },
    ],
    reviews: [],
    training: null,
    relatedDocuments: ["SPEC-RM-001", "SOP-QC-001", "FRM-PRD-001"],
    keywords: ["amoxicillin", "tablets", "finished product", "specification", "dissolution"],
    confidentiality: "confidential",
    retentionYears: 10,
    createdAt: daysAgo(900),
    updatedAt: daysAgo(90),
  },
  // ─── Validation Protocols ──────────────────────────────────────────
  {
    id: "doc-15",
    documentNumber: "VP-PRD-001",
    title: "Process Validation Protocol - Amoxicillin 500mg Tablets",
    category: "Validation Protocol",
    department: "Quality Assurance",
    currentVersion: "1.0",
    effectiveDate: daysAgo(300),
    reviewDate: daysAgo(300),
    nextReviewDate: daysAgo(10),
    status: "effective",
    description:
      "Process validation protocol for the manufacture of Amoxicillin 500mg film-coated tablets. Covers 3 consecutive production-scale batches.",
    author: "Dr. Ahmed Hassan",
    reviewer: "Dr. Youssef Kamel",
    approver: "Dr. Laila Farouk",
    versions: [
      {
        versionNumber: "1.0",
        changeSummary: "Initial release - 3 batch validation approach",
        author: "Dr. Ahmed Hassan",
        reviewer: "Dr. Youssef Kamel",
        approver: "Dr. Laila Farouk",
        createdAt: daysAgo(310),
        reviewedAt: daysAgo(307),
        approvedAt: daysAgo(305),
        effectiveAt: daysAgo(300),
      },
    ],
    reviews: [
      {
        id: "rev-15-1",
        documentId: "doc-15",
        reviewer: "Dr. Youssef Kamel",
        status: "overdue",
        comments: "",
        dueDate: daysAgo(10),
        assignedAt: daysAgo(40),
      },
    ],
    training: null,
    relatedDocuments: ["SOP-PRD-001", "SPEC-FP-001", "FRM-PRD-001"],
    keywords: ["process validation", "amoxicillin", "PV protocol"],
    confidentiality: "confidential",
    retentionYears: 15,
    createdAt: daysAgo(310),
    updatedAt: daysAgo(300),
  },
  // ─── More documents for variety ────────────────────────────────────
  {
    id: "doc-16",
    documentNumber: "SOP-WH-001",
    title: "Warehouse Storage and Material Handling",
    category: "SOP",
    department: "Warehouse",
    currentVersion: "2.1",
    effectiveDate: daysAgo(140),
    reviewDate: daysAgo(140),
    nextReviewDate: futureDays(225),
    status: "effective",
    description:
      "Procedure for storage, handling, and inventory management of raw materials, packaging materials, and finished products in GMP-compliant warehouse conditions.",
    author: "Eng. Tarek Nour",
    reviewer: "Dr. Laila Farouk",
    approver: "Dr. Amr Selim",
    versions: [
      {
        versionNumber: "2.1",
        changeSummary: "Added temperature mapping requirements for new cold storage area",
        author: "Eng. Tarek Nour",
        reviewer: "Dr. Laila Farouk",
        approver: "Dr. Amr Selim",
        createdAt: daysAgo(145),
        reviewedAt: daysAgo(143),
        approvedAt: daysAgo(141),
        effectiveAt: daysAgo(140),
      },
    ],
    reviews: [],
    training: null,
    relatedDocuments: ["WI-QC-001", "SOP-WH-002"],
    keywords: ["warehouse", "storage", "material handling", "cold chain"],
    confidentiality: "internal",
    retentionYears: 10,
    createdAt: daysAgo(700),
    updatedAt: daysAgo(140),
  },
  {
    id: "doc-17",
    documentNumber: "SOP-ENG-001",
    title: "Equipment Preventive Maintenance Program",
    category: "SOP",
    department: "Engineering",
    currentVersion: "1.1",
    effectiveDate: daysAgo(220),
    reviewDate: daysAgo(220),
    nextReviewDate: futureDays(10),
    status: "effective",
    description:
      "Procedure for planned preventive maintenance of GMP-critical manufacturing and laboratory equipment including scheduling, execution, and documentation.",
    author: "Eng. Mohamed Fathy",
    reviewer: "Dr. Youssef Kamel",
    approver: "Dr. Laila Farouk",
    versions: [
      {
        versionNumber: "1.1",
        changeSummary: "Added CMMS integration requirements",
        author: "Eng. Mohamed Fathy",
        reviewer: "Dr. Youssef Kamel",
        approver: "Dr. Laila Farouk",
        createdAt: daysAgo(225),
        reviewedAt: daysAgo(223),
        approvedAt: daysAgo(221),
        effectiveAt: daysAgo(220),
      },
    ],
    reviews: [
      {
        id: "rev-17-1",
        documentId: "doc-17",
        reviewer: "Eng. Mohamed Fathy",
        status: "in-progress",
        comments: "Reviewing updated PM schedules for new equipment",
        dueDate: futureDays(10),
        assignedAt: daysAgo(20),
      },
    ],
    training: null,
    relatedDocuments: ["SOP-ENG-002", "FRM-ENG-001"],
    keywords: ["preventive maintenance", "PM", "equipment", "CMMS"],
    confidentiality: "internal",
    retentionYears: 10,
    createdAt: daysAgo(500),
    updatedAt: daysAgo(220),
  },
  {
    id: "doc-18",
    documentNumber: "SOP-QC-020",
    title: "Stability Testing Program",
    category: "SOP",
    department: "Quality Control",
    currentVersion: "2.0",
    effectiveDate: daysAgo(110),
    reviewDate: daysAgo(110),
    nextReviewDate: futureDays(255),
    status: "effective",
    description:
      "Procedure for conducting stability studies per ICH Q1A-Q1E guidelines including accelerated, long-term, and ongoing stability programs.",
    author: "Dr. Rania Abdel-Aziz",
    reviewer: "Dr. Ahmed Hassan",
    approver: "Dr. Laila Farouk",
    versions: [
      {
        versionNumber: "2.0",
        changeSummary: "Updated climatic zone conditions for Zone IVa (30C/65%RH)",
        author: "Dr. Rania Abdel-Aziz",
        reviewer: "Dr. Ahmed Hassan",
        approver: "Dr. Laila Farouk",
        createdAt: daysAgo(115),
        reviewedAt: daysAgo(113),
        approvedAt: daysAgo(111),
        effectiveAt: daysAgo(110),
      },
    ],
    reviews: [],
    training: null,
    relatedDocuments: ["SOP-QC-001", "SPEC-FP-001"],
    keywords: ["stability", "ICH", "accelerated", "long-term", "climatic zone"],
    confidentiality: "internal",
    retentionYears: 15,
    createdAt: daysAgo(600),
    updatedAt: daysAgo(110),
  },
  // ─── Draft document ────────────────────────────────────────────────
  {
    id: "doc-19",
    documentNumber: "SOP-QA-040",
    title: "Annual Product Quality Review (APQR)",
    category: "SOP",
    department: "Quality Assurance",
    currentVersion: "0.1",
    effectiveDate: "",
    reviewDate: "",
    nextReviewDate: "",
    status: "draft",
    description:
      "New procedure for conducting Annual Product Quality Reviews per ICH Q7 and EDA requirements. Covers data collection, trend analysis, and reporting.",
    author: "Dr. Laila Farouk",
    reviewer: "",
    approver: "",
    versions: [
      {
        versionNumber: "0.1",
        changeSummary: "Initial draft",
        author: "Dr. Laila Farouk",
        reviewer: "",
        approver: "",
        createdAt: daysAgo(5),
      },
    ],
    reviews: [],
    training: null,
    relatedDocuments: ["SOP-QA-010", "SOP-QC-020"],
    keywords: ["APQR", "product quality review", "trend analysis"],
    confidentiality: "internal",
    retentionYears: 15,
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },
  // ─── In-review document ────────────────────────────────────────────
  {
    id: "doc-20",
    documentNumber: "WI-PRD-005",
    title: "Tablet Compression Machine Setup and Operation",
    category: "Work Instruction",
    department: "Production",
    currentVersion: "1.0",
    effectiveDate: "",
    reviewDate: "",
    nextReviewDate: "",
    status: "in-review",
    description:
      "Work instruction for setup, operation, and in-process checks for Korsch XL400 tablet compression machine including tooling changeover and die setup.",
    author: "Eng. Mohamed Fathy",
    reviewer: "Dr. Youssef Kamel",
    approver: "Dr. Laila Farouk",
    versions: [
      {
        versionNumber: "1.0",
        changeSummary: "Initial release for review",
        author: "Eng. Mohamed Fathy",
        reviewer: "Dr. Youssef Kamel",
        approver: "",
        createdAt: daysAgo(10),
      },
    ],
    reviews: [
      {
        id: "rev-20-1",
        documentId: "doc-20",
        reviewer: "Dr. Youssef Kamel",
        status: "in-progress",
        comments: "Reviewing tooling specifications section",
        dueDate: futureDays(5),
        assignedAt: daysAgo(8),
      },
      {
        id: "rev-20-2",
        documentId: "doc-20",
        reviewer: "Dr. Laila Farouk",
        status: "pending",
        comments: "",
        dueDate: futureDays(12),
        assignedAt: daysAgo(8),
      },
    ],
    training: {
      id: "trn-20",
      documentId: "doc-20",
      documentNumber: "WI-PRD-005",
      documentTitle: "Tablet Compression Machine Setup and Operation",
      requiredFor: ["Production Operators - Compression"],
      trainingType: "hands-on",
      dueDate: futureDays(30),
      completedBy: [],
      pendingFor: ["Ahmed M.", "Hassan K.", "Omar S."],
    },
    relatedDocuments: ["SOP-PRD-001", "SOP-ENG-001"],
    keywords: ["compression", "tablet press", "Korsch", "tooling"],
    confidentiality: "internal",
    retentionYears: 10,
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
  },
];

class DocumentControlStore {
  private static instance: DocumentControlStore;

  private constructor() {
    this.seed();
  }

  static getInstance(): DocumentControlStore {
    if (!DocumentControlStore.instance) {
      DocumentControlStore.instance = new DocumentControlStore();
    }
    return DocumentControlStore.instance;
  }

  private seed(): void {
    if (typeof window === "undefined") return;
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
    }
  }

  private load(): ControlledDocument[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ControlledDocument[]) : [];
  }

  private save(data: ControlledDocument[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // ─── CRUD ────────────────────────────────────────────────────────

  getAll(): ControlledDocument[] {
    return this.load();
  }

  getById(id: string): ControlledDocument | undefined {
    return this.load().find((d) => d.id === id);
  }

  create(
    doc: Omit<ControlledDocument, "id" | "documentNumber" | "createdAt" | "updatedAt">
  ): ControlledDocument {
    if (!doc.title?.trim()) throw new Error("Document title is required");
    if (!doc.category?.trim()) throw new Error("Document category is required");
    if (!doc.department?.trim()) throw new Error("Document department is required");
    if (!doc.description?.trim()) throw new Error("Document description is required");
    if (!doc.author?.trim()) throw new Error("Document author is required");
    const all = this.load();
    const newDoc: ControlledDocument = {
      ...doc,
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      documentNumber: this.generateNumber(doc.category),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    all.push(newDoc);
    this.save(all);
    return newDoc;
  }

  update(
    id: string,
    updates: Partial<ControlledDocument>
  ): ControlledDocument | undefined {
    const all = this.load();
    const idx = all.findIndex((d) => d.id === id);
    if (idx === -1) return undefined;
    all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save(all);
    return all[idx];
  }

  delete(id: string): boolean {
    const all = this.load();
    const filtered = all.filter((d) => d.id !== id);
    if (filtered.length === all.length) return false;
    this.save(filtered);
    return true;
  }

  // ─── Queries ─────────────────────────────────────────────────────

  getByCategory(category: DocumentCategory): ControlledDocument[] {
    return this.load().filter((d) => d.category === category);
  }

  getByStatus(status: DocumentStatus): ControlledDocument[] {
    return this.load().filter((d) => d.status === status);
  }

  getByDepartment(department: string): ControlledDocument[] {
    return this.load().filter((d) => d.department === department);
  }

  getDueForReview(): ControlledDocument[] {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return this.load().filter(
      (d) =>
        d.status === "effective" &&
        d.nextReviewDate &&
        new Date(d.nextReviewDate) <= thirtyDaysFromNow &&
        new Date(d.nextReviewDate) >= now
    );
  }

  getOverdueReviews(): ControlledDocument[] {
    const now = new Date();
    return this.load().filter(
      (d) =>
        d.status === "effective" &&
        d.nextReviewDate &&
        new Date(d.nextReviewDate) < now
    );
  }

  getExpiring(withinDays: number): ControlledDocument[] {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + withinDays);
    return this.load().filter(
      (d) =>
        d.status === "effective" &&
        d.nextReviewDate &&
        new Date(d.nextReviewDate) >= now &&
        new Date(d.nextReviewDate) <= future
    );
  }

  search(query: string): ControlledDocument[] {
    const q = query.toLowerCase();
    return this.load().filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.documentNumber.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.department.toLowerCase().includes(q) ||
        d.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }

  // ─── Version Control ─────────────────────────────────────────────

  createNewVersion(
    id: string,
    version: DocumentVersion
  ): ControlledDocument | undefined {
    const doc = this.getById(id);
    if (!doc) return undefined;
    const versions = [...doc.versions, version];
    return this.update(id, {
      versions,
      currentVersion: version.versionNumber,
    });
  }

  getVersionHistory(id: string): DocumentVersion[] {
    const doc = this.getById(id);
    return doc ? doc.versions : [];
  }

  // ─── Review Cycle ────────────────────────────────────────────────

  assignReview(
    id: string,
    review: DocumentReview
  ): ControlledDocument | undefined {
    const doc = this.getById(id);
    if (!doc) return undefined;
    const reviews = [...doc.reviews, review];
    return this.update(id, { reviews });
  }

  completeReview(
    docId: string,
    reviewId: string,
    comments: string
  ): ControlledDocument | undefined {
    const doc = this.getById(docId);
    if (!doc) return undefined;
    const reviews = doc.reviews.map((r) =>
      r.id === reviewId
        ? {
            ...r,
            status: "completed" as const,
            comments,
            completedAt: new Date().toISOString(),
          }
        : r
    );
    return this.update(docId, { reviews });
  }

  getAllReviews(): DocumentReview[] {
    return this.load().flatMap((d) => d.reviews);
  }

  getPendingReviews(): DocumentReview[] {
    return this.load().flatMap((d) =>
      d.reviews.filter(
        (r) => r.status === "pending" || r.status === "in-progress"
      )
    );
  }

  getOverdueReviewItems(): DocumentReview[] {
    const now = new Date();
    return this.load().flatMap((d) =>
      d.reviews.filter(
        (r) =>
          (r.status === "pending" || r.status === "in-progress" || r.status === "overdue") &&
          new Date(r.dueDate) < now
      )
    );
  }

  // ─── Training Linkage ────────────────────────────────────────────

  getTrainingPending(): DocumentTraining[] {
    return this.load()
      .filter((d) => d.training && d.training.pendingFor.length > 0)
      .map((d) => d.training!);
  }

  getDocumentsWithTraining(): ControlledDocument[] {
    return this.load().filter((d) => d.training !== null);
  }

  // ─── Number Generation ───────────────────────────────────────────

  generateNumber(category: DocumentCategory): string {
    const all = this.load();
    const prefixMap: Record<DocumentCategory, string> = {
      SOP: "SOP",
      "Work Instruction": "WI",
      Form: "FRM",
      Policy: "POL",
      Specification: "SPEC",
      "Validation Protocol": "VP",
    };
    const prefix = prefixMap[category];

    // Extract department codes and sequence numbers
    const existing = all
      .filter((d) => d.documentNumber.startsWith(prefix + "-"))
      .map((d) => {
        const parts = d.documentNumber.split("-");
        const seq = parseInt(parts[parts.length - 1], 10);
        return isNaN(seq) ? 0 : seq;
      });

    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `${prefix}-NEW-${String(next).padStart(3, "0")}`;
  }

  // ─── Metrics ─────────────────────────────────────────────────────

  getMetrics(): DocumentMetrics {
    const all = this.load();
    const now = new Date();

    const effective = all.filter((d) => d.status === "effective").length;

    const dueForReview = all.filter(
      (d) => {
        if (d.status !== "effective" || !d.nextReviewDate) return false;
        const nrd = new Date(d.nextReviewDate);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        return nrd <= thirtyDaysFromNow && nrd >= now;
      }
    ).length;

    const overdueReviews = all.filter(
      (d) =>
        d.status === "effective" &&
        d.nextReviewDate &&
        new Date(d.nextReviewDate) < now
    ).length;

    const trainingPending = all.filter(
      (d) => d.training && d.training.pendingFor.length > 0
    ).length;

    // By category
    const catMap = new Map<string, number>();
    all.forEach((d) => catMap.set(d.category, (catMap.get(d.category) || 0) + 1));
    const byCategory = Array.from(catMap.entries()).map(([category, count]) => ({
      category,
      count,
    }));

    // By department
    const deptMap = new Map<string, number>();
    all.forEach((d) =>
      deptMap.set(d.department, (deptMap.get(d.department) || 0) + 1)
    );
    const byDepartment = Array.from(deptMap.entries()).map(
      ([department, count]) => ({
        department,
        count,
      })
    );

    // By status
    const statusMap = new Map<string, number>();
    all.forEach((d) =>
      statusMap.set(d.status, (statusMap.get(d.status) || 0) + 1)
    );
    const byStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
    }));

    // Review compliance: docs with completed reviews vs total reviewed
    const allReviews = all.flatMap((d) => d.reviews);
    const completedReviews = allReviews.filter(
      (r) => r.status === "completed"
    ).length;
    const totalReviews = allReviews.length;
    const reviewCompliancePct =
      totalReviews > 0 ? Math.round((completedReviews / totalReviews) * 100) : 100;

    // Average versions per document
    const totalVersions = all.reduce((sum, d) => sum + d.versions.length, 0);
    const avgVersionsPerDoc =
      all.length > 0
        ? Math.round((totalVersions / all.length) * 10) / 10
        : 0;

    return {
      total: all.length,
      effective,
      dueForReview,
      overdueReviews,
      trainingPending,
      byCategory,
      byDepartment,
      byStatus,
      reviewCompliancePct,
      avgVersionsPerDoc,
    };
  }
}

export const documentControlStore = DocumentControlStore.getInstance();
