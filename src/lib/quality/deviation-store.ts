"use client";

import type {
  Deviation,
  DeviationCategory,
  DeviationClassification,
  DeviationInvestigation,
  DeviationMetrics,
  DeviationStatus,
  DeviationTrend,
  DispositionDecision,
  RootCauseCategory,
} from "./deviation-types";

// ─── Helpers ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "pharma.deviations";

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function isoDate(daysAgo: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// ─── Seed Data ─────────────────────────────────────────────────────────────

function buildSeedDeviations(): Deviation[] {
  const deviations: Deviation[] = [
    // 3 open (just detected)
    {
      id: "dev-001",
      number: "DEV-2026-001",
      title: "Temperature excursion in Cold Storage Room 2",
      description:
        "Temperature monitoring system recorded 9.2°C for 45 minutes, exceeding the 2–8°C storage specification for temperature-sensitive APIs.",
      category: "environmental",
      classification: "critical",
      status: "open",
      detectedAt: isoDate(2),
      detectedBy: "Ahmed Hassan",
      department: "Warehouse",
      area: "Cold Storage Room 2",
      batchesAffected: ["BN-2026-0412", "BN-2026-0415"],
      productsAffected: ["Insulin Glargine 100IU/mL", "Adalimumab 40mg/0.8mL"],
      immediateAction:
        "Materials moved to backup cold storage. Maintenance notified for HVAC inspection.",
      impactOnProduct: "potential",
      dueDate: isoDate(-5),
      isOverdue: true,
    },
    {
      id: "dev-002",
      number: "DEV-2026-002",
      title: "Batch mixing time exceeded by 15 minutes",
      description:
        "Granulation batch BN-2026-0420 was mixed for 45 minutes instead of the validated 30-minute mixing time due to operator distraction.",
      category: "process",
      classification: "major",
      status: "open",
      detectedAt: isoDate(1),
      detectedBy: "Fatima El-Sayed",
      department: "Production",
      area: "Granulation Suite A",
      batchesAffected: ["BN-2026-0420"],
      productsAffected: ["Amoxicillin 500mg Capsules"],
      immediateAction:
        "Batch quarantined pending investigation. Additional dissolution testing ordered.",
      impactOnProduct: "potential",
      dueDate: isoDate(-10),
      isOverdue: true,
    },
    {
      id: "dev-003",
      number: "DEV-2026-003",
      title: "Wrong label applied to intermediate container",
      description:
        "During in-process check, an intermediate container was found labeled with incorrect product name. Container held Metformin granules but was labeled as Glimepiride.",
      category: "documentation",
      classification: "critical",
      status: "open",
      detectedAt: isoDate(0),
      detectedBy: "Mohamed Khalil",
      department: "Production",
      area: "Packaging Line 3",
      batchesAffected: ["BN-2026-0425"],
      productsAffected: ["Metformin 850mg Tablets"],
      immediateAction:
        "Line stopped immediately. All containers on line re-verified. Correct label applied.",
      impactOnProduct: "none",
      dueDate: isoDate(-7),
      isOverdue: true,
    },

    // 2 in investigation
    {
      id: "dev-004",
      number: "DEV-2026-004",
      title: "Compressed air moisture content above limit",
      description:
        "Routine compressed air quality testing showed moisture content at 85 ppm, exceeding the 67 ppm limit per ISO 8573-1 Class 2.",
      category: "utilities",
      classification: "major",
      status: "investigation",
      detectedAt: isoDate(8),
      detectedBy: "Youssef Nabil",
      department: "Engineering",
      area: "Compressed Air System",
      batchesAffected: ["BN-2026-0408", "BN-2026-0409", "BN-2026-0410"],
      productsAffected: [
        "Omeprazole 20mg Capsules",
        "Paracetamol 500mg Tablets",
      ],
      immediateAction:
        "Dryer regeneration initiated. Backup dryer brought online.",
      investigation: {
        investigator: "Eng. Tarek Mansour",
        startedAt: isoDate(6),
        findings:
          "Preliminary inspection shows degraded desiccant in primary air dryer. Desiccant last replaced 14 months ago versus recommended 12-month interval.",
        timeline: [
          {
            date: isoDate(8),
            event: "Deviation Detected",
            description: "Routine air quality test failed moisture spec",
          },
          {
            date: isoDate(7),
            event: "Immediate Action",
            description: "Backup dryer activated, primary dryer isolated",
          },
          {
            date: isoDate(6),
            event: "Investigation Started",
            description:
              "Engineering team began root cause investigation",
          },
        ],
        contributingFactors: [
          "PM schedule not followed",
          "Desiccant life exceeded",
        ],
        rootCauseCategory: "equipment-failure",
        rootCauseDetails: "",
      },
      impactOnProduct: "potential",
      dueDate: isoDate(-3),
      isOverdue: true,
    },
    {
      id: "dev-005",
      number: "DEV-2026-005",
      title: "Clean room particle count failed",
      description:
        "ISO Class 7 clean room in Tablet Compression area recorded 380,000 particles/m³ at 0.5µm, exceeding the 352,000 limit.",
      category: "facility",
      classification: "major",
      status: "investigation",
      detectedAt: isoDate(10),
      detectedBy: "Heba Mostafa",
      department: "Quality Assurance",
      area: "Tablet Compression Room B",
      batchesAffected: ["BN-2026-0405"],
      productsAffected: ["Losartan 50mg Tablets"],
      immediateAction:
        "Room shut down for deep cleaning. HEPA filter integrity test scheduled.",
      investigation: {
        investigator: "Dr. Nadia Farouk",
        startedAt: isoDate(9),
        findings:
          "HEPA filter scan revealed minor leak at gasket seal on AHU-3. Construction activity in adjacent corridor may have contributed.",
        timeline: [
          {
            date: isoDate(10),
            event: "Deviation Detected",
            description: "Environmental monitoring alert triggered",
          },
          {
            date: isoDate(9),
            event: "Investigation Started",
            description: "HEPA filter integrity testing initiated",
          },
          {
            date: isoDate(8),
            event: "Filter Leak Found",
            description:
              "DOP test identified leak at AHU-3 gasket seal",
          },
        ],
        contributingFactors: [
          "HEPA gasket aging",
          "Adjacent construction vibration",
        ],
        rootCauseCategory: "equipment-failure",
        rootCauseDetails: "",
      },
      impactOnProduct: "potential",
      dueDate: isoDate(-2),
      isOverdue: true,
    },

    // 2 in root-cause analysis
    {
      id: "dev-006",
      number: "DEV-2026-006",
      title: "Raw material COA discrepancy",
      description:
        "Certificate of Analysis for Microcrystalline Cellulose (PH-102) shows moisture content of 6.8% while incoming QC testing measured 7.5%, outside acceptance criteria of NMT 7.0%.",
      category: "material",
      classification: "major",
      status: "root-cause",
      detectedAt: isoDate(15),
      detectedBy: "Dr. Sara Abdel-Rahman",
      department: "Quality Control",
      area: "QC Incoming Lab",
      batchesAffected: [],
      productsAffected: ["Multiple tablet formulations"],
      immediateAction:
        "Material quarantined. Supplier notified. Retesting initiated with different analyst and equipment.",
      investigation: {
        investigator: "Dr. Sara Abdel-Rahman",
        startedAt: isoDate(14),
        findings:
          "Retesting confirmed moisture at 7.4%. Supplier COA appears inaccurate. Review of last 6 shipments from same supplier shows 2 other borderline results. Supplier audit recommended.",
        timeline: [
          {
            date: isoDate(15),
            event: "Deviation Detected",
            description: "COA vs QC test discrepancy identified",
          },
          {
            date: isoDate(14),
            event: "Investigation Started",
            description: "Retesting and supplier COA review initiated",
          },
          {
            date: isoDate(12),
            event: "Retest Confirmed",
            description: "Independent retest confirmed elevated moisture",
          },
          {
            date: isoDate(10),
            event: "Historical Review",
            description:
              "Review of 6 prior shipments found 2 borderline results",
          },
        ],
        contributingFactors: [
          "Supplier testing method variation",
          "Shipping conditions",
          "Storage at supplier",
        ],
        rootCauseCategory: "material-defect",
        rootCauseDetails:
          "Supplier using Karl Fischer titration with different sample prep method leading to systematically lower moisture results. Shipping without adequate moisture protection.",
      },
      rootCause:
        "Supplier analytical method discrepancy and inadequate shipping protection",
      impactOnProduct: "none",
      dueDate: isoDate(-1),
      isOverdue: true,
    },
    {
      id: "dev-007",
      number: "DEV-2026-007",
      title: "Equipment calibration overdue - pH meter",
      description:
        "pH meter (EQ-PH-007) in QC Wet Chemistry lab found with expired calibration. Last calibration was 45 days ago versus 30-day interval.",
      category: "equipment",
      classification: "minor",
      status: "root-cause",
      detectedAt: isoDate(12),
      detectedBy: "Khaled Ibrahim",
      department: "Quality Control",
      area: "QC Wet Chemistry Lab",
      batchesAffected: ["BN-2026-0398", "BN-2026-0401", "BN-2026-0404"],
      productsAffected: [
        "Ranitidine 150mg Tablets",
        "Cetirizine 10mg Tablets",
      ],
      immediateAction:
        "Equipment taken out of service. All results generated during expired calibration period flagged for review.",
      investigation: {
        investigator: "Khaled Ibrahim",
        startedAt: isoDate(11),
        findings:
          "Calibration tracking spreadsheet had wrong next-due date entered. PM system notification was disabled after IT system update. Retrospective review of pH results shows all were within specification with adequate margin.",
        timeline: [
          {
            date: isoDate(12),
            event: "Deviation Detected",
            description: "Expired calibration sticker noticed during use",
          },
          {
            date: isoDate(11),
            event: "Investigation Started",
            description: "PM records and calibration log review",
          },
          {
            date: isoDate(9),
            event: "Data Review",
            description:
              "All pH results during gap period reviewed - within spec",
          },
        ],
        contributingFactors: [
          "Manual tracking error",
          "PM notification system disabled",
          "IT system update impact",
        ],
        rootCauseCategory: "process-gap",
        rootCauseDetails:
          "PM notification system was inadvertently disabled during ERP upgrade. Manual calibration tracking had data entry error.",
      },
      rootCause:
        "PM notification system disabled after ERP upgrade combined with manual tracking error",
      impactOnProduct: "none",
      dueDate: isoDate(3),
      isOverdue: false,
    },

    // 2 with CAPA required
    {
      id: "dev-008",
      number: "DEV-2026-008",
      title: "Operator deviated from SOP for granulation",
      description:
        "Operator added binder solution at rate of 250 mL/min instead of validated 150 mL/min, deviating from SOP-PRD-042.",
      category: "personnel",
      classification: "major",
      status: "capa-required",
      detectedAt: isoDate(20),
      detectedBy: "Supervisor Ali Mahmoud",
      department: "Production",
      area: "Granulation Suite B",
      batchesAffected: ["BN-2026-0392"],
      productsAffected: ["Ciprofloxacin 500mg Tablets"],
      immediateAction:
        "Batch quarantined. Granule size distribution testing initiated. Operator counseled.",
      investigation: {
        investigator: "Ali Mahmoud",
        startedAt: isoDate(19),
        findings:
          "Operator stated flow rate pump was pre-set from previous product and not adjusted. SOP review step for pump settings was signed off but not actually verified. This is the 2nd similar deviation in 3 months.",
        timeline: [
          {
            date: isoDate(20),
            event: "Deviation Detected",
            description: "Supervisor noticed incorrect pump rate during check",
          },
          {
            date: isoDate(19),
            event: "Investigation Started",
            description: "Operator interview and equipment review",
          },
          {
            date: isoDate(17),
            event: "Root Cause Identified",
            description:
              "Pump pre-set from previous product, verification step inadequate",
          },
        ],
        contributingFactors: [
          "Equipment pre-set from previous product",
          "Inadequate verification step",
          "Training gap on pump operation",
        ],
        rootCauseCategory: "training-gap",
        rootCauseDetails:
          "Operator training did not cover independent verification of pump settings. SOP verification step is a single checkbox without requiring documented pump reading.",
        completedAt: isoDate(16),
      },
      rootCause:
        "Inadequate training and SOP verification step for pump settings",
      impactOnProduct: "potential",
      dueDate: isoDate(5),
      isOverdue: false,
    },
    {
      id: "dev-009",
      number: "DEV-2026-009",
      title: "Water system TOC spike above alert limit",
      description:
        "Purified Water system Loop 2 showed TOC of 450 ppb, exceeding alert limit of 400 ppb (action limit 500 ppb).",
      category: "utilities",
      classification: "minor",
      status: "capa-required",
      detectedAt: isoDate(18),
      detectedBy: "Water System Operator Mostafa",
      department: "Engineering",
      area: "Purified Water System Loop 2",
      batchesAffected: [],
      productsAffected: [],
      immediateAction:
        "Additional sampling points tested. System sanitization scheduled.",
      investigation: {
        investigator: "Eng. Laila Osman",
        startedAt: isoDate(17),
        findings:
          "TOC spike correlated with scheduled maintenance where loop was stagnant for 8 hours. Post-sanitization results returned to normal (< 100 ppb). Review shows similar trends after maintenance windows.",
        timeline: [
          {
            date: isoDate(18),
            event: "Alert Triggered",
            description: "Online TOC monitor showed 450 ppb",
          },
          {
            date: isoDate(17),
            event: "Investigation Started",
            description: "Trend analysis and correlation review",
          },
          {
            date: isoDate(15),
            event: "Root Cause Identified",
            description: "Stagnation during maintenance caused biofilm release",
          },
        ],
        contributingFactors: [
          "Loop stagnation during maintenance",
          "No post-maintenance flush procedure",
        ],
        rootCauseCategory: "process-gap",
        rootCauseDetails:
          "No documented procedure for post-maintenance loop flushing before returning system to service.",
        completedAt: isoDate(14),
      },
      rootCause:
        "Missing post-maintenance flush procedure allows biofilm accumulation during stagnation",
      impactOnProduct: "none",
      dueDate: isoDate(7),
      isOverdue: false,
    },

    // 2 in CAPA implementation
    {
      id: "dev-010",
      number: "DEV-2026-010",
      title: "Weighing balance drift during dispensing",
      description:
        "Analytical balance (EQ-BAL-003) showed 0.15g drift during API dispensing session, exceeding the +/- 0.05g tolerance.",
      category: "equipment",
      classification: "minor",
      status: "capa-implementation",
      detectedAt: isoDate(30),
      detectedBy: "Dispensing Operator Rania",
      department: "Warehouse",
      area: "Dispensing Booth 1",
      batchesAffected: ["BN-2026-0380"],
      productsAffected: ["Amlodipine 5mg Tablets"],
      immediateAction:
        "Balance taken out of service. Re-dispensing performed on calibrated backup balance.",
      investigation: {
        investigator: "QA Engineer Hassan",
        startedAt: isoDate(29),
        findings:
          "Balance internal calibration weight showed wear. Environmental vibration from nearby construction identified as contributing factor.",
        timeline: [
          {
            date: isoDate(30),
            event: "Deviation Detected",
            description: "Operator noticed weight drift during tare check",
          },
          {
            date: isoDate(29),
            event: "Investigation Started",
            description: "Balance inspection and environmental assessment",
          },
          {
            date: isoDate(25),
            event: "CAPA Initiated",
            description: "CAPA-2026-018 raised for balance replacement and vibration isolation",
          },
        ],
        contributingFactors: [
          "Internal weight wear",
          "Environmental vibration",
          "Balance age (7 years)",
        ],
        rootCauseCategory: "equipment-failure",
        rootCauseDetails:
          "Balance exceeded service life. Internal reference weight degraded over time. Anti-vibration table not installed despite construction activity.",
        completedAt: isoDate(24),
      },
      rootCause: "Balance exceeded service life with degraded internal reference weight",
      capaId: "CAPA-2026-018",
      impactOnProduct: "none",
      dispositionDecision: "release",
      dueDate: isoDate(10),
      isOverdue: false,
    },
    {
      id: "dev-011",
      number: "DEV-2026-011",
      title: "Packaging line reject rate above trend",
      description:
        "Blister packaging line 2 showing 4.2% reject rate versus historical average of 1.5%. Visual inspection reveals misaligned foil sealing.",
      category: "equipment",
      classification: "minor",
      status: "capa-implementation",
      detectedAt: isoDate(25),
      detectedBy: "Line Supervisor Amira",
      department: "Packaging",
      area: "Blister Line 2",
      batchesAffected: ["BN-2026-0385", "BN-2026-0388"],
      productsAffected: [
        "Metformin 500mg Tablets",
        "Atorvastatin 20mg Tablets",
      ],
      immediateAction:
        "Line stopped for mechanical adjustment. Rejected blisters segregated for rework assessment.",
      investigation: {
        investigator: "Eng. Omar Saeed",
        startedAt: isoDate(24),
        findings:
          "Forming roller alignment worn beyond tolerance. Last preventive maintenance was 2 weeks overdue.",
        timeline: [
          {
            date: isoDate(25),
            event: "Deviation Detected",
            description: "Reject rate trending above control limit",
          },
          {
            date: isoDate(24),
            event: "Investigation Started",
            description: "Mechanical inspection of blister tooling",
          },
          {
            date: isoDate(22),
            event: "CAPA Initiated",
            description: "CAPA-2026-019 for PM schedule enforcement",
          },
        ],
        contributingFactors: [
          "Overdue preventive maintenance",
          "Forming roller wear",
          "No inline seal integrity monitoring",
        ],
        rootCauseCategory: "equipment-failure",
        rootCauseDetails:
          "PM schedule not enforced due to production pressure. Worn forming rollers caused foil misalignment.",
        completedAt: isoDate(21),
      },
      rootCause: "Worn forming rollers due to overdue preventive maintenance",
      capaId: "CAPA-2026-019",
      impactOnProduct: "none",
      dispositionDecision: "rework",
      dueDate: isoDate(8),
      isOverdue: false,
    },

    // 1 in effectiveness check
    {
      id: "dev-012",
      number: "DEV-2026-012",
      title: "Stability sample storage mix-up",
      description:
        "Stability samples for two different products were stored in incorrect temperature conditions (25°C samples placed in 40°C chamber and vice versa) for 48 hours.",
      category: "personnel",
      classification: "minor",
      status: "effectiveness-check",
      detectedAt: isoDate(40),
      detectedBy: "Stability Coordinator Dina",
      department: "Quality Control",
      area: "Stability Storage Room",
      batchesAffected: ["BN-2026-0365", "BN-2026-0368"],
      productsAffected: ["Ibuprofen 400mg Tablets", "Diclofenac 50mg Tablets"],
      immediateAction:
        "Samples immediately moved to correct chambers. Additional time point testing initiated to assess impact.",
      investigation: {
        investigator: "Dr. Mariam Adel",
        startedAt: isoDate(39),
        findings:
          "Human error during sample placement. No barcode verification system in place. Samples placed by new analyst without adequate supervision.",
        timeline: [
          {
            date: isoDate(40),
            event: "Deviation Detected",
            description: "Routine chamber audit found sample mix-up",
          },
          {
            date: isoDate(39),
            event: "Investigation Started",
            description: "Sample placement log review and staff interview",
          },
          {
            date: isoDate(35),
            event: "CAPA Implemented",
            description: "Barcode scanning system installed, training delivered",
          },
          {
            date: isoDate(30),
            event: "Effectiveness Check Started",
            description: "Monitoring new barcode system error rate",
          },
        ],
        contributingFactors: [
          "No barcode verification",
          "New analyst without supervision",
          "Similar container labeling",
        ],
        rootCauseCategory: "human-error",
        rootCauseDetails:
          "New analyst unfamiliar with chamber assignment system. No technology-assisted verification to prevent placement errors.",
        completedAt: isoDate(34),
      },
      rootCause:
        "No technology-assisted verification for stability sample placement",
      capaId: "CAPA-2026-015",
      impactOnProduct: "none",
      dispositionDecision: "release",
      dueDate: isoDate(15),
      isOverdue: false,
    },

    // 3 closed
    {
      id: "dev-013",
      number: "DEV-2026-013",
      title: "Cleaning validation hold time exceeded",
      description:
        "Equipment Train A was held in clean state for 78 hours, exceeding the validated 72-hour clean hold time before next use.",
      category: "process",
      classification: "minor",
      status: "closed",
      detectedAt: isoDate(60),
      detectedBy: "Production Planner Hesham",
      department: "Production",
      area: "Equipment Train A",
      batchesAffected: [],
      productsAffected: ["Azithromycin 250mg Capsules"],
      immediateAction:
        "Equipment re-cleaned before use. Production schedule adjusted.",
      investigation: {
        investigator: "QA Specialist Noura",
        startedAt: isoDate(59),
        findings:
          "Production schedule change not communicated to cleaning team. Clean hold time tracking is manual with no automated alert.",
        timeline: [
          {
            date: isoDate(60),
            event: "Deviation Detected",
            description: "Clean hold time log review found exceedance",
          },
          {
            date: isoDate(59),
            event: "Investigation",
            description: "Schedule change communication gap identified",
          },
          {
            date: isoDate(55),
            event: "CAPA Implemented",
            description: "Automated hold time alert added to MES",
          },
          {
            date: isoDate(50),
            event: "Effectiveness Verified",
            description: "No hold time exceedances in 10 days post-CAPA",
          },
          {
            date: isoDate(48),
            event: "Closed",
            description: "Deviation closed with no product impact",
          },
        ],
        contributingFactors: [
          "Manual tracking",
          "Schedule change communication gap",
        ],
        rootCauseCategory: "process-gap",
        rootCauseDetails:
          "No automated alert for approaching clean hold time expiry. Production schedule changes not linked to cleaning status tracking.",
        completedAt: isoDate(55),
      },
      rootCause:
        "No automated hold time tracking or alert system",
      capaId: "CAPA-2026-010",
      impactOnProduct: "none",
      dispositionDecision: "release",
      closedAt: isoDate(48),
      closedBy: "QA Manager Dr. Amr Selim",
      dueDate: isoDate(45),
      isOverdue: false,
    },
    {
      id: "dev-014",
      number: "DEV-2026-014",
      title: "Documentation error in batch record",
      description:
        "Batch record for BN-2026-0350 contained a calculation error in yield reconciliation. Actual yield was 98.2% but recorded as 89.2% due to transposition error.",
      category: "documentation",
      classification: "minor",
      status: "closed",
      detectedAt: isoDate(55),
      detectedBy: "QA Reviewer Lamia",
      department: "Quality Assurance",
      area: "QA Review Office",
      batchesAffected: ["BN-2026-0350"],
      productsAffected: ["Captopril 25mg Tablets"],
      immediateAction:
        "Batch record corrected with single-line strikethrough per SOP. Independent recalculation performed.",
      investigation: {
        investigator: "QA Reviewer Lamia",
        startedAt: isoDate(54),
        findings:
          "Transposition error during manual calculation. Double-check by second operator was signed but error not caught. Review of last 20 batch records found 1 additional minor calculation discrepancy.",
        timeline: [
          {
            date: isoDate(55),
            event: "Deviation Detected",
            description: "QA review caught yield calculation error",
          },
          {
            date: isoDate(54),
            event: "Investigation",
            description: "Batch record review and historical check",
          },
          {
            date: isoDate(50),
            event: "CAPA Implemented",
            description: "Calculator-assisted yield template deployed",
          },
          {
            date: isoDate(45),
            event: "Closed",
            description: "Effectiveness verified - no further errors",
          },
        ],
        contributingFactors: [
          "Manual calculation",
          "Ineffective double-check",
          "Fatigue",
        ],
        rootCauseCategory: "human-error",
        rootCauseDetails:
          "Manual yield calculation prone to transposition errors. Double-check process not structured to independently verify calculation.",
        completedAt: isoDate(50),
      },
      rootCause: "Manual yield calculation without structured independent verification",
      capaId: "CAPA-2026-012",
      impactOnProduct: "none",
      dispositionDecision: "release",
      closedAt: isoDate(45),
      closedBy: "QA Manager Dr. Amr Selim",
      dueDate: isoDate(40),
      isOverdue: false,
    },
    {
      id: "dev-015",
      number: "DEV-2026-015",
      title: "Gowning qualification failure during monitoring",
      description:
        "Environmental monitoring during gowning qualification showed elevated bioburden on glove fingertip samples for 2 operators.",
      category: "personnel",
      classification: "minor",
      status: "closed",
      detectedAt: isoDate(50),
      detectedBy: "Microbiology Lab Supervisor Reem",
      department: "Quality Control",
      area: "Aseptic Gowning Room",
      batchesAffected: [],
      productsAffected: [],
      immediateAction:
        "Operators removed from aseptic operations. Re-qualification scheduled after remedial training.",
      investigation: {
        investigator: "Microbiologist Dr. Wael",
        startedAt: isoDate(49),
        findings:
          "Operators had not completed refresher training within the required 6-month interval. Glove donning technique showed gaps in aseptic practice.",
        timeline: [
          {
            date: isoDate(50),
            event: "Deviation Detected",
            description: "Glove fingertip monitoring exceeded limits",
          },
          {
            date: isoDate(49),
            event: "Investigation",
            description: "Training records and technique assessment review",
          },
          {
            date: isoDate(45),
            event: "CAPA Implemented",
            description: "Refresher training program restructured with automated scheduling",
          },
          {
            date: isoDate(42),
            event: "Re-qualification Passed",
            description: "Both operators passed re-qualification",
          },
          {
            date: isoDate(40),
            event: "Closed",
            description: "Deviation closed after successful re-qualification",
          },
        ],
        contributingFactors: [
          "Overdue refresher training",
          "Training scheduling gap",
          "No automated training alerts",
        ],
        rootCauseCategory: "training-gap",
        rootCauseDetails:
          "Training management system did not automatically flag overdue refresher training for aseptic gowning qualification.",
        completedAt: isoDate(44),
      },
      rootCause: "Training management system lacked automated refresher training reminders",
      capaId: "CAPA-2026-013",
      impactOnProduct: "none",
      dispositionDecision: "release",
      closedAt: isoDate(40),
      closedBy: "QA Head Dr. Salma Hamed",
      dueDate: isoDate(35),
      isOverdue: false,
    },
  ];

  return deviations;
}

// ─── Store ─────────────────────────────────────────────────────────────────

export class DeviationStore {
  private deviations: Deviation[] = [];
  private initialized = false;

  private load(): void {
    if (this.initialized) return;
    this.initialized = true;

    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        this.deviations = JSON.parse(stored);
        return;
      } catch {
        // fallthrough to seed
      }
    }

    this.deviations = buildSeedDeviations();
    this.save();
  }

  private save(): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.deviations));
  }

  // ── CRUD ──────────────────────────────────────────────────────────────

  getAll(): Deviation[] {
    this.load();
    return [...this.deviations];
  }

  getById(id: string): Deviation | undefined {
    this.load();
    return this.deviations.find((d) => d.id === id);
  }

  create(
    data: Omit<Deviation, "id" | "number" | "status" | "isOverdue" | "impactOnProduct">
  ): Deviation {
    this.load();
    const dev: Deviation = {
      ...data,
      id: `dev-${Date.now()}`,
      number: this.generateNumber(),
      status: "open",
      impactOnProduct: "potential",
      isOverdue: new Date(data.dueDate) < new Date(),
    };
    this.deviations.unshift(dev);
    this.save();
    return dev;
  }

  update(id: string, updates: Partial<Deviation>): Deviation | undefined {
    this.load();
    const idx = this.deviations.findIndex((d) => d.id === id);
    if (idx === -1) return undefined;
    this.deviations[idx] = { ...this.deviations[idx], ...updates };
    this.save();
    return this.deviations[idx];
  }

  // ── Queries ───────────────────────────────────────────────────────────

  getByStatus(status: DeviationStatus): Deviation[] {
    return this.getAll().filter((d) => d.status === status);
  }

  getByClassification(classification: DeviationClassification): Deviation[] {
    return this.getAll().filter((d) => d.classification === classification);
  }

  getByCategory(category: DeviationCategory): Deviation[] {
    return this.getAll().filter((d) => d.category === category);
  }

  getOpen(): Deviation[] {
    return this.getAll().filter((d) => d.status !== "closed");
  }

  getOverdue(): Deviation[] {
    return this.getAll().filter((d) => d.isOverdue && d.status !== "closed");
  }

  // ── Actions ───────────────────────────────────────────────────────────

  startInvestigation(
    id: string,
    investigator: string
  ): Deviation | undefined {
    this.load();
    const dev = this.getById(id);
    if (!dev) return undefined;
    const investigation: DeviationInvestigation = {
      investigator,
      startedAt: new Date().toISOString().slice(0, 10),
      findings: "",
      timeline: [
        {
          date: dev.detectedAt,
          event: "Deviation Detected",
          description: dev.title,
        },
        {
          date: new Date().toISOString().slice(0, 10),
          event: "Investigation Started",
          description: `Investigation initiated by ${investigator}`,
        },
      ],
      contributingFactors: [],
      rootCauseCategory: "process-gap",
      rootCauseDetails: "",
    };
    return this.update(id, { status: "investigation", investigation });
  }

  setRootCause(
    id: string,
    rootCause: string,
    category: RootCauseCategory
  ): Deviation | undefined {
    this.load();
    const dev = this.getById(id);
    if (!dev || !dev.investigation) return undefined;
    const investigation: DeviationInvestigation = {
      ...dev.investigation,
      rootCauseCategory: category,
      rootCauseDetails: rootCause,
      completedAt: new Date().toISOString().slice(0, 10),
    };
    return this.update(id, {
      status: "capa-required",
      rootCause,
      investigation,
    });
  }

  linkCAPA(id: string, capaId: string): Deviation | undefined {
    return this.update(id, {
      status: "capa-implementation",
      capaId,
    });
  }

  closeDeviation(
    id: string,
    dispositionDecision: DispositionDecision
  ): Deviation | undefined {
    return this.update(id, {
      status: "closed",
      dispositionDecision,
      closedAt: new Date().toISOString().slice(0, 10),
      closedBy: "Current User",
      isOverdue: false,
    });
  }

  // ── Metrics ───────────────────────────────────────────────────────────

  getMetrics(): DeviationMetrics {
    const all = this.getAll();
    const open = all.filter((d) => d.status !== "closed");
    const closed = all.filter((d) => d.status === "closed");
    const overdue = all.filter((d) => d.isOverdue && d.status !== "closed");
    const criticalOpen = open.filter(
      (d) => d.classification === "critical"
    );
    const withCapa = all.filter((d) => d.capaId);

    let totalClosureDays = 0;
    for (const d of closed) {
      if (d.closedAt) {
        totalClosureDays += daysBetween(d.detectedAt, d.closedAt);
      }
    }

    // MTTR for all resolved (closed) deviations
    const mttr =
      closed.length > 0
        ? Math.round(totalClosureDays / closed.length)
        : 0;

    // Repeat rate: deviations with same root cause category as another
    const rootCauseCounts = new Map<string, number>();
    for (const d of all) {
      if (d.investigation?.rootCauseCategory) {
        const cat = d.investigation.rootCauseCategory;
        rootCauseCounts.set(cat, (rootCauseCounts.get(cat) || 0) + 1);
      }
    }
    let repeats = 0;
    for (const count of rootCauseCounts.values()) {
      if (count > 1) repeats += count;
    }

    return {
      totalOpen: open.length,
      totalClosed: closed.length,
      avgClosureDays:
        closed.length > 0
          ? Math.round(totalClosureDays / closed.length)
          : 0,
      overdueCount: overdue.length,
      criticalOpen: criticalOpen.length,
      capaLinkedPct:
        all.length > 0
          ? Math.round((withCapa.length / all.length) * 100)
          : 0,
      repeatRate:
        all.length > 0
          ? Math.round((repeats / all.length) * 100)
          : 0,
      mttr,
    };
  }

  // ── Trends ────────────────────────────────────────────────────────────

  getTrends(periods: number = 6): DeviationTrend[] {
    const all = this.getAll();
    const trends: DeviationTrend[] = [];

    for (let i = periods - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();

      const monthDeviations = all.filter((dev) => {
        const dd = new Date(dev.detectedAt);
        return dd.getFullYear() === year && dd.getMonth() === month;
      });

      const period = d.toLocaleString("en-US", {
        month: "short",
        year: "numeric",
      });

      // By classification
      const classMap = new Map<DeviationClassification, number>();
      const catMap = new Map<DeviationCategory, number>();
      const deptMap = new Map<string, number>();

      for (const dev of monthDeviations) {
        classMap.set(
          dev.classification,
          (classMap.get(dev.classification) || 0) + 1
        );
        catMap.set(dev.category, (catMap.get(dev.category) || 0) + 1);
        deptMap.set(
          dev.department,
          (deptMap.get(dev.department) || 0) + 1
        );
      }

      // Count repeats in this period
      const rcMap = new Map<string, number>();
      for (const dev of monthDeviations) {
        if (dev.investigation?.rootCauseCategory) {
          const rc = dev.investigation.rootCauseCategory;
          rcMap.set(rc, (rcMap.get(rc) || 0) + 1);
        }
      }
      let repeatCount = 0;
      for (const v of rcMap.values()) {
        if (v > 1) repeatCount += v;
      }

      trends.push({
        period,
        total: monthDeviations.length,
        byClassification: Array.from(classMap.entries()).map(
          ([classification, count]) => ({ classification, count })
        ),
        byCategory: Array.from(catMap.entries()).map(
          ([category, count]) => ({ category, count })
        ),
        byDepartment: Array.from(deptMap.entries()).map(
          ([department, count]) => ({ department, count })
        ),
        repeatDeviations: repeatCount,
      });
    }

    return trends;
  }

  // ── Repeat Deviations ─────────────────────────────────────────────────

  getRepeatDeviations(): {
    rootCauseCategory: RootCauseCategory;
    deviations: Deviation[];
  }[] {
    const all = this.getAll();
    const grouped = new Map<RootCauseCategory, Deviation[]>();

    for (const d of all) {
      if (d.investigation?.rootCauseCategory) {
        const cat = d.investigation.rootCauseCategory;
        if (!grouped.has(cat)) grouped.set(cat, []);
        grouped.get(cat)!.push(d);
      }
    }

    const repeats: {
      rootCauseCategory: RootCauseCategory;
      deviations: Deviation[];
    }[] = [];

    for (const [rootCauseCategory, deviations] of grouped.entries()) {
      if (deviations.length > 1) {
        repeats.push({ rootCauseCategory, deviations });
      }
    }

    return repeats;
  }

  // ── Number Generation ─────────────────────────────────────────────────

  generateNumber(): string {
    this.load();
    const year = new Date().getFullYear();
    const prefix = `DEV-${year}-`;
    let max = 0;
    for (const d of this.deviations) {
      if (d.number.startsWith(prefix)) {
        const n = parseInt(d.number.slice(prefix.length), 10);
        if (n > max) max = n;
      }
    }
    return `${prefix}${String(max + 1).padStart(3, "0")}`;
  }
}

export const deviationStore = new DeviationStore();
