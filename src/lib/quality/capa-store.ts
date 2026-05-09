"use client";

import type {
  CAPARecord,
  CAPAStatus,
  CAPASource,
  CAPAAction,
  CAPAMetrics,
  EffectivenessCheck,
} from "./capa-types";

const STORAGE_KEY = "pharma.capas";

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

// ─── Seed Data: 15 CAPAs ─────────────────────────────────────────────────────

const SEED_DATA: CAPARecord[] = [
  // === 3 from deviations ===
  {
    id: "capa-1",
    number: "CAPA-2026-001",
    title: "Tablet weight variation exceeding specification limits",
    description:
      "Deviation DEV-2026-003 identified recurring tablet weight variation in Paracetamol 500mg beyond +/- 5% specification during routine IPC checks on Compression Machine CM-02.",
    source: "deviation",
    sourceRecordId: "dev-3",
    sourceRecordNumber: "DEV-2026-003",
    type: "corrective",
    priority: "high",
    status: "implementation",
    initiatedBy: "Dr. Laila Farouk",
    initiatedAt: daysAgo(35),
    department: "Production",
    rootCauseAnalysis: {
      method: "5-why",
      findings:
        "Why 1: Tablets out of weight spec. Why 2: Inconsistent powder flow into die cavity. Why 3: Granule size distribution shifted. Why 4: Granulator impeller speed was 15% above setpoint. Why 5: Speed controller calibration drifted over 6-month interval. Root cause: Insufficient calibration frequency for high-shear granulator speed controller.",
      investigator: "Eng. Mohamed Fathy",
      completedAt: daysAgo(28),
    },
    actions: [
      {
        id: "a1-1",
        description: "Recalibrate CM-02 speed controller and verify setpoints",
        assignee: "Eng. Mohamed Fathy",
        dueDate: daysAgo(25),
        status: "completed",
        evidence: "Calibration certificate CAL-2026-0147 attached",
        completionDate: daysAgo(26),
      },
      {
        id: "a1-2",
        description: "Reduce calibration interval from 6 months to 3 months for all granulator speed controllers",
        assignee: "Eng. Tarek Nour",
        dueDate: daysAgo(20),
        status: "completed",
        evidence: "Updated PM schedule PM-SCHED-2026-R3 approved",
        completionDate: daysAgo(21),
      },
      {
        id: "a1-3",
        description: "Retrain compression operators on IPC weight monitoring and response procedures",
        assignee: "Dr. Youssef Kamel",
        dueDate: futureDays(5),
        status: "in-progress",
      },
      {
        id: "a1-4",
        description: "Validate revised granulation parameters for Paracetamol 500mg (3 consecutive batches)",
        assignee: "QA Validation Team",
        dueDate: futureDays(20),
        status: "pending",
      },
    ],
    effectivenessChecks: [],
    dueDate: futureDays(30),
  },
  {
    id: "capa-2",
    number: "CAPA-2026-002",
    title: "Cross-contamination risk from HVAC failure in penicillin area",
    description:
      "Deviation DEV-2026-007 reported HVAC pressure differential reversal between penicillin and non-penicillin manufacturing zones lasting 45 minutes during night shift.",
    source: "deviation",
    sourceRecordId: "dev-7",
    sourceRecordNumber: "DEV-2026-007",
    type: "both",
    priority: "critical",
    status: "verification",
    initiatedBy: "Dr. Laila Farouk",
    initiatedAt: daysAgo(50),
    department: "Engineering",
    rootCauseAnalysis: {
      method: "fault-tree",
      findings:
        "Top event: Pressure differential reversal. Contributing factors: (1) AHU-07 supply fan VFD failure, (2) No redundant fan system, (3) BMS alarm was acknowledged but not escalated per SOP. Root cause: Single-point failure in critical containment system with inadequate alarm escalation procedure.",
      investigator: "Eng. Tarek Nour",
      completedAt: daysAgo(42),
    },
    actions: [
      {
        id: "a2-1",
        description: "Install redundant supply fan with automatic failover for AHU-07",
        assignee: "Eng. Tarek Nour",
        dueDate: daysAgo(30),
        status: "completed",
        evidence: "IQ/OQ protocol EQ-VAL-2026-024 executed and approved",
        completionDate: daysAgo(28),
      },
      {
        id: "a2-2",
        description: "Upgrade BMS alarm escalation to auto-notify QA and production managers for critical HVAC deviations",
        assignee: "Eng. Ayman Zaki",
        dueDate: daysAgo(25),
        status: "completed",
        evidence: "BMS configuration change validated - CSV-2026-011",
        completionDate: daysAgo(24),
      },
      {
        id: "a2-3",
        description: "Revise SOP-ENG-018 to include mandatory containment verification after HVAC events",
        assignee: "Dr. Laila Farouk",
        dueDate: daysAgo(20),
        status: "completed",
        evidence: "SOP-ENG-018 Rev.04 effective",
        completionDate: daysAgo(19),
      },
    ],
    effectivenessChecks: [],
    dueDate: futureDays(10),
  },
  {
    id: "capa-3",
    number: "CAPA-2026-003",
    title: "Batch record documentation errors in dispensing area",
    description:
      "Deviation DEV-2026-011 identified 8 instances of incomplete batch record entries in dispensing operations over a 2-month period, including missing signatures and uncorrected errors.",
    source: "deviation",
    sourceRecordId: "dev-11",
    sourceRecordNumber: "DEV-2026-011",
    type: "corrective",
    priority: "medium",
    status: "effectiveness-check",
    initiatedBy: "Pharm. Mariam Khalil",
    initiatedAt: daysAgo(60),
    department: "Production",
    rootCauseAnalysis: {
      method: "fishbone",
      findings:
        "Man: New operators not adequately trained on GMP documentation practices. Method: SOP for batch record completion lacks step-by-step checklist. Machine: N/A. Material: N/A. Environment: High workload during shift changeover creates time pressure. Root cause: Training gap combined with absence of completion checklist in SOP.",
      investigator: "Pharm. Mariam Khalil",
      completedAt: daysAgo(52),
    },
    actions: [
      {
        id: "a3-1",
        description: "Develop and implement batch record completion checklist (annex to SOP-PRD-005)",
        assignee: "Pharm. Mariam Khalil",
        dueDate: daysAgo(45),
        status: "completed",
        evidence: "FORM-PRD-005B checklist approved and distributed",
        completionDate: daysAgo(44),
      },
      {
        id: "a3-2",
        description: "Conduct GMP documentation refresher training for all dispensing operators",
        assignee: "Dr. Laila Farouk",
        dueDate: daysAgo(40),
        status: "completed",
        evidence: "Training records for 14 operators filed - TRN-2026-089",
        completionDate: daysAgo(39),
      },
      {
        id: "a3-3",
        description: "Implement weekly batch record review by production supervisor for 3 months",
        assignee: "Dr. Youssef Kamel",
        dueDate: daysAgo(38),
        status: "completed",
        evidence: "Review log maintained - zero errors in last 6 weeks",
        completionDate: daysAgo(10),
      },
    ],
    effectivenessChecks: [
      {
        id: "ec-3-1",
        criteria: "Zero batch record documentation errors for 30 consecutive days",
        result: "effective",
        checkedBy: "Dr. Laila Farouk",
        date: daysAgo(5),
        notes: "Review of 45 batch records showed 100% compliance with checklist requirements.",
      },
    ],
    dueDate: daysAgo(2),
  },

  // === 3 from OOS ===
  {
    id: "capa-4",
    number: "CAPA-2026-004",
    title: "Recurring OOS results for dissolution testing of Omeprazole capsules",
    description:
      "OOS-2026-005 and OOS-2026-008 both identified dissolution failures at the 30-minute timepoint for Omeprazole 20mg capsules from different batches, indicating a systematic issue.",
    source: "OOS",
    sourceRecordId: "oos-5",
    sourceRecordNumber: "OOS-2026-005",
    type: "corrective",
    priority: "high",
    status: "action-plan",
    initiatedBy: "Dr. Rania Abdel-Aziz",
    initiatedAt: daysAgo(20),
    department: "QC",
    rootCauseAnalysis: {
      method: "fishbone",
      findings:
        "Man: Analyst technique verified - not a factor. Method: Dissolution media preparation compliant. Machine: Paddle speed verified. Material: API particle size from recent shipment is 15% coarser than historical range. Environment: Not a factor. Root cause: Incoming API particle size not adequately controlled by current specification, leading to slower dissolution rate.",
      investigator: "Dr. Rania Abdel-Aziz",
      completedAt: daysAgo(14),
    },
    actions: [
      {
        id: "a4-1",
        description: "Tighten API particle size specification (d90 from <150um to <120um)",
        assignee: "Dr. Ahmed Hassan",
        dueDate: futureDays(10),
        status: "in-progress",
      },
      {
        id: "a4-2",
        description: "Notify API supplier of tightened specification and request updated DMF",
        assignee: "Dr. Nadia Soliman",
        dueDate: futureDays(15),
        status: "pending",
      },
      {
        id: "a4-3",
        description: "Validate dissolution method with revised particle size spec (3 batches)",
        assignee: "QC Lab",
        dueDate: futureDays(30),
        status: "pending",
      },
    ],
    effectivenessChecks: [],
    dueDate: futureDays(45),
  },
  {
    id: "capa-5",
    number: "CAPA-2026-005",
    title: "OOS moisture content in Metformin HCl raw material",
    description:
      "OOS-2026-012 showed moisture content of 0.62% vs specification of NMT 0.50% for Metformin HCl RM batch MET-RM-2026-044 from primary supplier.",
    source: "OOS",
    sourceRecordId: "oos-12",
    sourceRecordNumber: "OOS-2026-012",
    type: "both",
    priority: "medium",
    status: "investigation",
    initiatedBy: "Dr. Rania Abdel-Aziz",
    initiatedAt: daysAgo(10),
    department: "QC",
    actions: [
      {
        id: "a5-1",
        description: "Review supplier audit history and recent COAs for moisture trend",
        assignee: "Dr. Nadia Soliman",
        dueDate: futureDays(5),
        status: "in-progress",
      },
      {
        id: "a5-2",
        description: "Verify KF titrator calibration and analyst technique",
        assignee: "QC Lab",
        dueDate: futureDays(3),
        status: "in-progress",
      },
    ],
    effectivenessChecks: [],
    dueDate: futureDays(30),
  },
  {
    id: "capa-6",
    number: "CAPA-2026-006",
    title: "Assay OOS for Amoxicillin 500mg finished product",
    description:
      "OOS-2026-015 identified assay result of 88.2% vs specification 90.0-110.0% for batch AMX-FP-2026-078. Phase 2 investigation confirmed production process deviation.",
    source: "OOS",
    sourceRecordId: "oos-15",
    sourceRecordNumber: "OOS-2026-015",
    type: "corrective",
    priority: "critical",
    status: "closed",
    initiatedBy: "Dr. Laila Farouk",
    initiatedAt: daysAgo(75),
    department: "Production",
    rootCauseAnalysis: {
      method: "5-why",
      findings:
        "Why 1: Low assay result. Why 2: Active ingredient not uniformly distributed. Why 3: Blending time was 8 minutes instead of specified 15 minutes. Why 4: Operator ended blending early due to misread timer. Why 5: Analog timer difficult to read under production lighting. Root cause: Inadequate equipment (analog timer) leading to operator error in critical process step.",
      investigator: "Dr. Youssef Kamel",
      completedAt: daysAgo(65),
    },
    actions: [
      {
        id: "a6-1",
        description: "Replace analog timers with digital timers with audible alarm on all blenders",
        assignee: "Eng. Mohamed Fathy",
        dueDate: daysAgo(55),
        status: "completed",
        evidence: "12 digital timers installed and verified - EQ-CHG-2026-031",
        completionDate: daysAgo(54),
      },
      {
        id: "a6-2",
        description: "Add blending time verification checkpoint in batch record",
        assignee: "Pharm. Mariam Khalil",
        dueDate: daysAgo(50),
        status: "completed",
        evidence: "BMR-AMX-500 Rev.06 effective with blending time dual-verification step",
        completionDate: daysAgo(49),
      },
      {
        id: "a6-3",
        description: "Retrain all production operators on critical process parameters",
        assignee: "Dr. Youssef Kamel",
        dueDate: daysAgo(45),
        status: "completed",
        evidence: "Training records TRN-2026-072 for 22 operators filed",
        completionDate: daysAgo(44),
      },
    ],
    effectivenessChecks: [
      {
        id: "ec-6-1",
        criteria: "All subsequent Amoxicillin batches meet assay specification for 60 days",
        result: "effective",
        checkedBy: "Dr. Laila Farouk",
        date: daysAgo(15),
        notes: "18 batches manufactured post-CAPA, all assay results within 95.0-102.5% range.",
      },
    ],
    closedAt: daysAgo(12),
    closedBy: "Dr. Laila Farouk",
    dueDate: daysAgo(20),
  },

  // === 2 from audits ===
  {
    id: "capa-7",
    number: "CAPA-2026-007",
    title: "Audit finding: Inadequate environmental monitoring in sterile corridor",
    description:
      "EDA audit finding AUD-2026-F03 identified that environmental monitoring (EM) in the sterile corridor between gowning room and filling suite did not meet WHO Annex 6 requirements for Grade C zones.",
    source: "audit",
    sourceRecordId: "aud-2026-f03",
    sourceRecordNumber: "AUD-2026-F03",
    type: "corrective",
    priority: "high",
    status: "closed",
    initiatedBy: "Dr. Laila Farouk",
    initiatedAt: daysAgo(90),
    department: "QC - Microbiology",
    rootCauseAnalysis: {
      method: "5-why",
      findings:
        "Why 1: EM program does not cover sterile corridor. Why 2: Corridor was classified as Grade D during facility design. Why 3: Original classification predates current WHO guidance. Why 4: Periodic facility requalification did not reassess corridor classification. Why 5: SOP for requalification does not require reclassification assessment. Root cause: Gap in facility requalification SOP - no trigger for reclassification review when regulatory guidance changes.",
      investigator: "Dr. Rania Abdel-Aziz",
      completedAt: daysAgo(82),
    },
    actions: [
      {
        id: "a7-1",
        description: "Reclassify sterile corridor to Grade C and update facility drawings",
        assignee: "Eng. Tarek Nour",
        dueDate: daysAgo(75),
        status: "completed",
        evidence: "Updated facility classification drawing DWG-CL-008 Rev.02",
        completionDate: daysAgo(74),
      },
      {
        id: "a7-2",
        description: "Extend EM program to include sterile corridor with Grade C sampling plan",
        assignee: "Dr. Rania Abdel-Aziz",
        dueDate: daysAgo(70),
        status: "completed",
        evidence: "SOP-QC-045 Rev.05 includes corridor monitoring points",
        completionDate: daysAgo(69),
      },
      {
        id: "a7-3",
        description: "Revise facility requalification SOP to include regulatory gap assessment trigger",
        assignee: "Dr. Laila Farouk",
        dueDate: daysAgo(65),
        status: "completed",
        evidence: "SOP-QA-028 Rev.03 effective",
        completionDate: daysAgo(64),
      },
    ],
    effectivenessChecks: [
      {
        id: "ec-7-1",
        criteria: "EM data from sterile corridor meets Grade C limits for 30 consecutive monitoring sessions",
        result: "effective",
        checkedBy: "Dr. Rania Abdel-Aziz",
        date: daysAgo(35),
        notes: "All 34 monitoring sessions compliant. Trend data confirms Grade C capability.",
      },
    ],
    closedAt: daysAgo(30),
    closedBy: "Dr. Laila Farouk",
    dueDate: daysAgo(40),
  },
  {
    id: "capa-8",
    number: "CAPA-2026-008",
    title: "Audit finding: Data integrity gaps in QC laboratory",
    description:
      "Internal audit AUD-INT-2026-Q2-F01 found that 3 of 12 HPLC systems do not have audit trail functionality enabled, and manual integration of chromatograms was performed without documented justification.",
    source: "audit",
    sourceRecordId: "aud-int-2026-q2-f01",
    sourceRecordNumber: "AUD-INT-2026-Q2-F01",
    type: "both",
    priority: "critical",
    status: "implementation",
    initiatedBy: "Dr. Rania Abdel-Aziz",
    initiatedAt: daysAgo(25),
    department: "QC",
    rootCauseAnalysis: {
      method: "fishbone",
      findings:
        "Man: Analysts not trained on data integrity principles per ALCOA+. Method: No SOP for manual integration review and approval. Machine: 3 HPLC systems running outdated CDS software without audit trail. Material: N/A. Environment: N/A. Root cause: (1) Outdated CDS software on 3 systems lacking audit trail capability, (2) No procedural control for manual integration.",
      investigator: "Dr. Rania Abdel-Aziz",
      completedAt: daysAgo(18),
    },
    actions: [
      {
        id: "a8-1",
        description: "Upgrade CDS software on all 12 HPLC systems to version with full audit trail",
        assignee: "Eng. Ayman Zaki",
        dueDate: daysAgo(10),
        status: "completed",
        evidence: "CSV validation report CSV-2026-015 approved for all 12 systems",
        completionDate: daysAgo(9),
      },
      {
        id: "a8-2",
        description: "Develop SOP for manual integration review and second-person verification",
        assignee: "Dr. Rania Abdel-Aziz",
        dueDate: daysAgo(5),
        status: "completed",
        evidence: "SOP-QC-055 Manual Integration Control effective",
        completionDate: daysAgo(4),
      },
      {
        id: "a8-3",
        description: "Conduct ALCOA+ data integrity training for all QC analysts",
        assignee: "Dr. Laila Farouk",
        dueDate: futureDays(5),
        status: "in-progress",
      },
      {
        id: "a8-4",
        description: "Perform retrospective review of manual integrations for past 12 months",
        assignee: "QC Lab",
        dueDate: futureDays(20),
        status: "pending",
      },
    ],
    effectivenessChecks: [],
    dueDate: futureDays(35),
  },

  // === 2 from complaints ===
  {
    id: "capa-9",
    number: "CAPA-2026-009",
    title: "Customer complaint: Broken tablets in Metformin 850mg blister packs",
    description:
      "3 customer complaints (COMP-2026-018, 019, 022) received within 2 weeks reporting broken/cracked tablets in Metformin 850mg blisters from batches MET-FP-2026-055 and MET-FP-2026-058.",
    source: "complaint",
    sourceRecordId: "comp-2026-018",
    sourceRecordNumber: "COMP-2026-018",
    type: "corrective",
    priority: "high",
    status: "action-plan",
    initiatedBy: "Dr. Laila Farouk",
    initiatedAt: daysAgo(15),
    department: "Production",
    rootCauseAnalysis: {
      method: "fishbone",
      findings:
        "Man: Operators following current SOP. Method: Compression force within range but at upper limit. Machine: Blister sealing station pocket depth 0.3mm shallower than spec due to worn tooling. Material: Tablet hardness at upper range (18 kp vs 10-18 kp spec). Root cause: Worn blister pocket tooling combined with high-hardness tablets creates mechanical stress during sealing, causing tablet breakage.",
      investigator: "Eng. Mohamed Fathy",
      completedAt: daysAgo(8),
    },
    actions: [
      {
        id: "a9-1",
        description: "Replace worn blister forming tooling on Packaging Line 2",
        assignee: "Eng. Mohamed Fathy",
        dueDate: futureDays(3),
        status: "in-progress",
      },
      {
        id: "a9-2",
        description: "Add blister pocket depth verification to PM checklist for all packaging lines",
        assignee: "Eng. Tarek Nour",
        dueDate: futureDays(10),
        status: "pending",
      },
      {
        id: "a9-3",
        description: "Tighten compression force target to achieve hardness 12-16 kp (narrower range)",
        assignee: "Dr. Youssef Kamel",
        dueDate: futureDays(15),
        status: "pending",
      },
    ],
    effectivenessChecks: [],
    dueDate: futureDays(30),
  },
  {
    id: "capa-10",
    number: "CAPA-2026-010",
    title: "Customer complaint: Foreign particle in Ranitidine injection",
    description:
      "Complaint COMP-2026-025 reported a visible particulate in a Ranitidine 50mg/2ml injection vial from batch RAN-FP-2026-033. Reserve sample inspection confirmed finding.",
    source: "complaint",
    sourceRecordId: "comp-2026-025",
    sourceRecordNumber: "COMP-2026-025",
    type: "corrective",
    priority: "critical",
    status: "initiated",
    initiatedBy: "Dr. Laila Farouk",
    initiatedAt: daysAgo(3),
    department: "Production - Sterile",
    actions: [
      {
        id: "a10-1",
        description: "Quarantine remaining units of batch RAN-FP-2026-033 and perform 100% visual inspection",
        assignee: "Dr. Youssef Kamel",
        dueDate: futureDays(2),
        status: "in-progress",
      },
      {
        id: "a10-2",
        description: "Send particulate for FTIR identification",
        assignee: "QC Lab",
        dueDate: futureDays(5),
        status: "pending",
      },
    ],
    effectivenessChecks: [],
    dueDate: futureDays(30),
  },

  // === 2 from self-inspection ===
  {
    id: "capa-11",
    number: "CAPA-2026-011",
    title: "Self-inspection: Inadequate pest control monitoring in warehouse",
    description:
      "Self-inspection SI-2026-Q1 identified that pest control bait station monitoring records in Warehouse Zone C were incomplete for 3 consecutive months, and 2 bait stations were found damaged.",
    source: "self-inspection",
    sourceRecordId: "si-2026-q1-f05",
    sourceRecordNumber: "SI-2026-Q1-F05",
    type: "corrective",
    priority: "medium",
    status: "closed",
    initiatedBy: "Dr. Laila Farouk",
    initiatedAt: daysAgo(70),
    department: "Warehouse",
    rootCauseAnalysis: {
      method: "5-why",
      findings:
        "Why 1: Incomplete pest monitoring records. Why 2: Pest control operator missed Zone C inspections. Why 3: Zone C added after initial pest control map was created. Why 4: No management of change for facility layout modifications. Why 5: Pest control contractor not included in facility change notification. Root cause: Pest control contractor excluded from facility change communication process.",
      investigator: "Eng. Tarek Nour",
      completedAt: daysAgo(62),
    },
    actions: [
      {
        id: "a11-1",
        description: "Replace damaged bait stations and update pest control site map for Zone C",
        assignee: "Eng. Tarek Nour",
        dueDate: daysAgo(60),
        status: "completed",
        evidence: "Updated site map and new bait stations installed - documented in PC-LOG-2026-03",
        completionDate: daysAgo(59),
      },
      {
        id: "a11-2",
        description: "Add pest control contractor to facility change notification distribution list",
        assignee: "Dr. Laila Farouk",
        dueDate: daysAgo(55),
        status: "completed",
        evidence: "Change control SOP updated - CC distribution list amended",
        completionDate: daysAgo(54),
      },
      {
        id: "a11-3",
        description: "Implement monthly pest control record verification by warehouse supervisor",
        assignee: "Eng. Tarek Nour",
        dueDate: daysAgo(50),
        status: "completed",
        evidence: "Verification log maintained for 8 consecutive weeks with zero gaps",
        completionDate: daysAgo(25),
      },
    ],
    effectivenessChecks: [
      {
        id: "ec-11-1",
        criteria: "100% pest control monitoring compliance for 60 consecutive days",
        result: "effective",
        checkedBy: "Dr. Laila Farouk",
        date: daysAgo(18),
        notes: "All monitoring records complete. No missed inspections since CAPA implementation.",
      },
    ],
    closedAt: daysAgo(15),
    closedBy: "Dr. Laila Farouk",
    dueDate: daysAgo(20),
  },
  {
    id: "capa-12",
    number: "CAPA-2026-012",
    title: "Self-inspection: Training records not current for 6 production operators",
    description:
      "Self-inspection SI-2026-Q1 found that 6 of 28 production operators had expired GMP training certifications, with some overdue by up to 4 months.",
    source: "self-inspection",
    sourceRecordId: "si-2026-q1-f08",
    sourceRecordNumber: "SI-2026-Q1-F08",
    type: "both",
    priority: "medium",
    status: "verification",
    initiatedBy: "Dr. Laila Farouk",
    initiatedAt: daysAgo(40),
    department: "HR / Training",
    rootCauseAnalysis: {
      method: "5-why",
      findings:
        "Why 1: Expired training certifications. Why 2: Training renewal reminders not sent. Why 3: Training management is manual spreadsheet-based. Why 4: No automated reminder system. Why 5: Training module of ERP not yet implemented. Root cause: Manual training tracking system without automated renewal reminders.",
      investigator: "Pharm. Mariam Khalil",
      completedAt: daysAgo(33),
    },
    actions: [
      {
        id: "a12-1",
        description: "Complete overdue GMP training for all 6 affected operators immediately",
        assignee: "Dr. Laila Farouk",
        dueDate: daysAgo(35),
        status: "completed",
        evidence: "All 6 operators retrained - TRN-2026-078 through TRN-2026-083",
        completionDate: daysAgo(34),
      },
      {
        id: "a12-2",
        description: "Implement automated training expiry alerts (30-day, 14-day, 7-day reminders)",
        assignee: "Eng. Ayman Zaki",
        dueDate: daysAgo(20),
        status: "completed",
        evidence: "ERP Training Module configured and validated - CSV-2026-013",
        completionDate: daysAgo(18),
      },
      {
        id: "a12-3",
        description: "Migrate all training records from spreadsheet to ERP Training Module",
        assignee: "Pharm. Mariam Khalil",
        dueDate: daysAgo(15),
        status: "completed",
        evidence: "284 training records migrated and verified",
        completionDate: daysAgo(14),
      },
    ],
    effectivenessChecks: [],
    dueDate: futureDays(5),
  },

  // === 3 preventive actions ===
  {
    id: "capa-13",
    number: "CAPA-2026-013",
    title: "Preventive: Implement real-time environmental monitoring in stability chambers",
    description:
      "Trend analysis of stability chamber excursion data shows increasing frequency of minor temperature excursions (within alert but approaching action limits). Preventive action to upgrade monitoring before failure occurs.",
    source: "self-inspection",
    sourceRecordId: "si-2026-q1-obs02",
    sourceRecordNumber: "SI-2026-Q1-OBS02",
    type: "preventive",
    priority: "medium",
    status: "implementation",
    initiatedBy: "Dr. Rania Abdel-Aziz",
    initiatedAt: daysAgo(30),
    department: "QC",
    rootCauseAnalysis: {
      method: "fault-tree",
      findings:
        "Trend analysis shows 12 minor excursions in Q1 vs 4 in Q4-2025. Contributing factors: Aging compressors (8 years), manual data logger checks only twice daily, no predictive maintenance program for stability chambers. Preventive action justified by increasing excursion trend before specification failure occurs.",
      investigator: "Dr. Rania Abdel-Aziz",
      completedAt: daysAgo(22),
    },
    actions: [
      {
        id: "a13-1",
        description: "Install continuous wireless temperature/humidity monitoring in all 6 stability chambers",
        assignee: "Eng. Ayman Zaki",
        dueDate: futureDays(10),
        status: "in-progress",
      },
      {
        id: "a13-2",
        description: "Implement predictive maintenance program for stability chamber compressors",
        assignee: "Eng. Mohamed Fathy",
        dueDate: futureDays(15),
        status: "pending",
      },
      {
        id: "a13-3",
        description: "Configure automated alerts for excursion events with escalation matrix",
        assignee: "Eng. Ayman Zaki",
        dueDate: futureDays(20),
        status: "pending",
      },
    ],
    effectivenessChecks: [],
    dueDate: futureDays(35),
  },
  {
    id: "capa-14",
    number: "CAPA-2026-014",
    title: "Preventive: Upgrade water system pre-treatment to prevent biofilm formation",
    description:
      "Analysis of purified water system trend data shows gradual increase in total organic carbon (TOC) levels at loop return over past 6 months, suggesting early-stage biofilm formation risk.",
    source: "deviation",
    sourceRecordId: "dev-trend-2026-pw",
    sourceRecordNumber: "DEV-TREND-2026-PW",
    type: "preventive",
    priority: "high",
    status: "initiated",
    initiatedBy: "Eng. Tarek Nour",
    initiatedAt: daysAgo(5),
    department: "Engineering",
    actions: [
      {
        id: "a14-1",
        description: "Perform comprehensive TOC mapping of entire PW loop with increased sampling points",
        assignee: "QC Lab",
        dueDate: futureDays(7),
        status: "pending",
      },
      {
        id: "a14-2",
        description: "Review sanitization frequency and method for PW distribution loop",
        assignee: "Eng. Tarek Nour",
        dueDate: futureDays(10),
        status: "pending",
      },
    ],
    effectivenessChecks: [],
    dueDate: futureDays(45),
  },
  {
    id: "capa-15",
    number: "CAPA-2026-015",
    title: "Preventive: Standardize weighing verification across all dispensing areas",
    description:
      "Near-miss analysis from Q1-2026 identified 5 near-miss events related to weighing discrepancies across different dispensing areas. Preventive action to standardize and automate weighing verification before an actual error occurs.",
    source: "audit",
    sourceRecordId: "aud-int-2026-q1-obs01",
    sourceRecordNumber: "AUD-INT-2026-Q1-OBS01",
    type: "preventive",
    priority: "medium",
    status: "closed",
    initiatedBy: "Dr. Laila Farouk",
    initiatedAt: daysAgo(85),
    department: "Production",
    rootCauseAnalysis: {
      method: "fishbone",
      findings:
        "Man: Different dispensing areas use different verification methods. Method: No standardized weighing verification SOP across areas. Machine: 2 of 5 dispensing areas lack barcode-verified dispensing systems. Material: N/A. Environment: N/A. Root cause: Lack of standardized weighing verification process and inconsistent technology deployment across dispensing areas.",
      investigator: "Pharm. Mariam Khalil",
      completedAt: daysAgo(78),
    },
    actions: [
      {
        id: "a15-1",
        description: "Deploy barcode-verified dispensing systems in remaining 2 dispensing areas",
        assignee: "Eng. Ayman Zaki",
        dueDate: daysAgo(65),
        status: "completed",
        evidence: "Systems installed and validated - CSV-2026-009 and CSV-2026-010",
        completionDate: daysAgo(64),
      },
      {
        id: "a15-2",
        description: "Create unified SOP for barcode-verified weighing and dispensing (all areas)",
        assignee: "Pharm. Mariam Khalil",
        dueDate: daysAgo(60),
        status: "completed",
        evidence: "SOP-PRD-055 Standardized Weighing Verification effective",
        completionDate: daysAgo(59),
      },
      {
        id: "a15-3",
        description: "Train all dispensing operators on unified SOP and barcode system",
        assignee: "Dr. Laila Farouk",
        dueDate: daysAgo(55),
        status: "completed",
        evidence: "18 operators trained - TRN-2026-065 through TRN-2026-082",
        completionDate: daysAgo(54),
      },
      {
        id: "a15-4",
        description: "Monitor near-miss rate for 60 days post-implementation",
        assignee: "Dr. Laila Farouk",
        dueDate: daysAgo(25),
        status: "completed",
        evidence: "Zero weighing near-misses in 60-day monitoring period",
        completionDate: daysAgo(24),
      },
    ],
    effectivenessChecks: [
      {
        id: "ec-15-1",
        criteria: "Zero weighing-related near-miss events for 60 consecutive days post-implementation",
        result: "effective",
        checkedBy: "Dr. Laila Farouk",
        date: daysAgo(22),
        notes: "No near-miss events recorded. All 5 dispensing areas using standardized barcode verification.",
      },
    ],
    closedAt: daysAgo(20),
    closedBy: "Dr. Laila Farouk",
    dueDate: daysAgo(25),
  },
];

// ─── Status Order ─────────────────────────────────────────────────────────────

const STATUS_ORDER: Record<CAPAStatus, number> = {
  initiated: 0,
  investigation: 1,
  "action-plan": 2,
  implementation: 3,
  verification: 4,
  "effectiveness-check": 5,
  closed: 6,
};

const NEXT_STATUS: Partial<Record<CAPAStatus, CAPAStatus>> = {
  initiated: "investigation",
  investigation: "action-plan",
  "action-plan": "implementation",
  implementation: "verification",
  verification: "effectiveness-check",
  "effectiveness-check": "closed",
};

// ─── Store ─────────────────────────────────────────────────────────────────────

class CAPAStore {
  private static instance: CAPAStore;

  private constructor() {
    this.seed();
  }

  static getInstance(): CAPAStore {
    if (!CAPAStore.instance) {
      CAPAStore.instance = new CAPAStore();
    }
    return CAPAStore.instance;
  }

  private seed(): void {
    if (typeof window === "undefined") return;
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
    }
  }

  private load(): CAPARecord[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CAPARecord[]) : [];
  }

  private save(data: CAPARecord[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────

  getAll(): CAPARecord[] {
    return this.load();
  }

  getById(id: string): CAPARecord | undefined {
    return this.load().find((c) => c.id === id);
  }

  create(capa: Omit<CAPARecord, "id" | "number">): CAPARecord {
    if (!capa.title?.trim()) throw new Error("CAPA title is required");
    if (!capa.description?.trim()) throw new Error("CAPA description is required");
    if (!capa.source?.trim()) throw new Error("CAPA source is required");
    if (!capa.type?.trim()) throw new Error("CAPA type is required");
    if (!capa.priority?.trim()) throw new Error("CAPA priority is required");
    if (!capa.department?.trim()) throw new Error("CAPA department is required");
    if (!capa.initiatedBy?.trim()) throw new Error("CAPA initiatedBy is required");
    if (!capa.dueDate?.trim()) throw new Error("CAPA due date is required");
    if (isNaN(new Date(capa.dueDate).getTime())) throw new Error("CAPA due date is invalid");
    const all = this.load();
    const newCapa: CAPARecord = {
      ...capa,
      id: `capa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      number: this.generateNumber(),
    };
    all.push(newCapa);
    this.save(all);
    return newCapa;
  }

  update(id: string, updates: Partial<CAPARecord>): CAPARecord | undefined {
    const all = this.load();
    const idx = all.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    all[idx] = { ...all[idx], ...updates };
    this.save(all);
    return all[idx];
  }

  delete(id: string): boolean {
    const all = this.load();
    const filtered = all.filter((c) => c.id !== id);
    if (filtered.length === all.length) return false;
    this.save(filtered);
    return true;
  }

  // ─── Queries ─────────────────────────────────────────────────────────────

  getByStatus(status: CAPAStatus): CAPARecord[] {
    return this.load().filter((c) => c.status === status);
  }

  getBySource(source: CAPASource): CAPARecord[] {
    return this.load().filter((c) => c.source === source);
  }

  getOverdue(): CAPARecord[] {
    const now = new Date();
    return this.load().filter(
      (c) => c.status !== "closed" && new Date(c.dueDate) < now
    );
  }

  getOpen(): CAPARecord[] {
    return this.load().filter((c) => c.status !== "closed");
  }

  // ─── Workflow Methods ────────────────────────────────────────────────────

  advanceStatus(id: string): CAPARecord | undefined {
    const capa = this.getById(id);
    if (!capa) return undefined;
    const next = NEXT_STATUS[capa.status];
    if (!next) return undefined;
    const updates: Partial<CAPARecord> = { status: next };
    if (next === "closed") {
      updates.closedAt = new Date().toISOString();
      updates.closedBy = "Current User";
    }
    return this.update(id, updates);
  }

  addAction(id: string, action: Omit<CAPAAction, "id">): CAPARecord | undefined {
    const capa = this.getById(id);
    if (!capa) return undefined;
    const newAction: CAPAAction = {
      ...action,
      id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    return this.update(id, { actions: [...capa.actions, newAction] });
  }

  completeAction(capaId: string, actionId: string, evidence?: string): CAPARecord | undefined {
    const capa = this.getById(capaId);
    if (!capa) return undefined;
    const actions = capa.actions.map((a) =>
      a.id === actionId
        ? {
            ...a,
            status: "completed" as const,
            completionDate: new Date().toISOString(),
            evidence: evidence ?? a.evidence,
          }
        : a
    );
    return this.update(capaId, { actions });
  }

  recordEffectivenessCheck(
    id: string,
    check: Omit<EffectivenessCheck, "id">
  ): CAPARecord | undefined {
    const capa = this.getById(id);
    if (!capa) return undefined;
    const newCheck: EffectivenessCheck = {
      ...check,
      id: `ec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    return this.update(id, {
      effectivenessChecks: [...capa.effectivenessChecks, newCheck],
    });
  }

  closeCapa(id: string): CAPARecord | undefined {
    return this.update(id, {
      status: "closed",
      closedAt: new Date().toISOString(),
      closedBy: "Current User",
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  generateNumber(): string {
    const all = this.load();
    const year = new Date().getFullYear();
    const yearPrefix = `CAPA-${year}-`;
    const existing = all
      .filter((c) => c.number.startsWith(yearPrefix))
      .map((c) => parseInt(c.number.replace(yearPrefix, ""), 10))
      .filter((n) => !isNaN(n));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `${yearPrefix}${String(next).padStart(3, "0")}`;
  }

  getStatusOrder(status: CAPAStatus): number {
    return STATUS_ORDER[status];
  }

  getMetrics(): CAPAMetrics {
    const all = this.load();
    const now = new Date();

    const open = all.filter((c) => c.status !== "closed");
    const overdue = all.filter(
      (c) => c.status !== "closed" && new Date(c.dueDate) < now
    );

    // Average closure days for closed CAPAs
    const closed = all.filter((c) => c.status === "closed" && c.closedAt);
    const avgClosureDays =
      closed.length > 0
        ? Math.round(
            closed.reduce(
              (sum, c) => sum + daysBetween(c.initiatedAt, c.closedAt!),
              0
            ) / closed.length
          )
        : 0;

    // Effectiveness rate: % of effectiveness checks that are "effective"
    const allChecks = all.flatMap((c) => c.effectivenessChecks);
    const effectiveChecks = allChecks.filter((ec) => ec.result === "effective");
    const effectivenessRate =
      allChecks.length > 0
        ? Math.round((effectiveChecks.length / allChecks.length) * 100)
        : 100;

    // By source
    const srcMap = new Map<string, number>();
    all.forEach((c) => srcMap.set(c.source, (srcMap.get(c.source) || 0) + 1));
    const bySource = Array.from(srcMap.entries()).map(([source, count]) => ({
      source,
      count,
    }));

    return {
      total: all.length,
      open: open.length,
      overdue: overdue.length,
      avgClosureDays,
      effectivenessRate,
      bySource,
    };
  }
}

export const capaStore = CAPAStore.getInstance();
