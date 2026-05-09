"use client";

import type {
  RecallRecord,
  RecallStatus,
  RecallClass,
  RecallType,
  RecallMetrics,
  RecallNotification,
  RecallRetrieval,
  RecallEffectivenessCheck,
  AffectedBatch,
} from "./recall-types";

const STORAGE_KEY = "pharma.recalls";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)
  );
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

const SEED_DATA: RecallRecord[] = [
  // ──── Class I (Critical Safety) - 2 recalls ────────────────────────────────
  {
    id: "rcl-1",
    number: "RCL-2026-001",
    product: "Gentamicin 80mg/2ml Injection",
    affectedBatches: [
      {
        batchNumber: "GNT-2026-044",
        productName: "Gentamicin 80mg/2ml Injection",
        manufacturingDate: daysAgo(90),
        expiryDate: daysAgo(-640),
        quantityManufactured: 50000,
        quantityDistributed: 42000,
        quantityOnHand: 8000,
        distributedTo: [
          "Cairo University Hospital",
          "Al-Salam Hospital",
          "MedPharma Distributors",
          "Nile Pharma Chain",
        ],
      },
      {
        batchNumber: "GNT-2026-045",
        productName: "Gentamicin 80mg/2ml Injection",
        manufacturingDate: daysAgo(75),
        expiryDate: daysAgo(-655),
        quantityManufactured: 50000,
        quantityDistributed: 38000,
        quantityOnHand: 12000,
        distributedTo: [
          "Cairo University Hospital",
          "Ain Shams Hospital",
          "Delta Pharma Distributors",
        ],
      },
    ],
    recallClass: "I",
    type: "mandatory",
    reason: "Particulate contamination detected during stability testing",
    description:
      "Visible particulate matter identified in retained samples during 6-month stability check. Particles confirmed as glass delamination from Type I vials. EDA mandatory recall issued.",
    status: "retrieval",
    priority: "critical",
    initiatedBy: "Dr. Laila Farouk",
    initiatedAt: daysAgo(14),
    department: "Quality Assurance",
    riskAssessment: {
      healthHazard: "life-threatening",
      populationExposed: 80000,
      likelihoodOfHarm: "high",
      assessedBy: "Dr. Rania Abdel-Aziz",
      assessedAt: daysAgo(13),
      notes:
        "Injectable product with visible particles poses severe risk of embolism. Immediate patient safety concern.",
    },
    notifications: [
      {
        id: "n1-1",
        recipientType: "regulatory",
        recipientName: "Egyptian Drug Authority (EDA)",
        method: "email",
        dateSent: daysAgo(13),
        acknowledged: true,
        acknowledgedAt: daysAgo(12),
      },
      {
        id: "n1-2",
        recipientType: "hospitals",
        recipientName: "Cairo University Hospital",
        method: "phone",
        dateSent: daysAgo(13),
        acknowledged: true,
        acknowledgedAt: daysAgo(13),
      },
      {
        id: "n1-3",
        recipientType: "hospitals",
        recipientName: "Al-Salam Hospital",
        method: "phone",
        dateSent: daysAgo(13),
        acknowledged: true,
        acknowledgedAt: daysAgo(12),
      },
      {
        id: "n1-4",
        recipientType: "hospitals",
        recipientName: "Ain Shams Hospital",
        method: "phone",
        dateSent: daysAgo(13),
        acknowledged: true,
        acknowledgedAt: daysAgo(13),
      },
      {
        id: "n1-5",
        recipientType: "distributors",
        recipientName: "MedPharma Distributors",
        method: "email",
        dateSent: daysAgo(13),
        acknowledged: true,
        acknowledgedAt: daysAgo(12),
      },
      {
        id: "n1-6",
        recipientType: "distributors",
        recipientName: "Nile Pharma Chain",
        method: "email",
        dateSent: daysAgo(13),
        acknowledged: false,
      },
      {
        id: "n1-7",
        recipientType: "distributors",
        recipientName: "Delta Pharma Distributors",
        method: "email",
        dateSent: daysAgo(13),
        acknowledged: true,
        acknowledgedAt: daysAgo(11),
      },
      {
        id: "n1-8",
        recipientType: "public",
        recipientName: "Ministry of Health Portal",
        method: "press-release",
        dateSent: daysAgo(12),
        acknowledged: true,
        acknowledgedAt: daysAgo(12),
      },
    ],
    retrievals: [
      {
        id: "r1-1",
        location: "Cairo University Hospital",
        distributor: "Direct",
        region: "Cairo",
        quantityShipped: 18000,
        quantityReturned: 15200,
        quantityDestroyed: 0,
        quantityRemaining: 2800,
        status: "in-progress",
        lastUpdated: daysAgo(2),
      },
      {
        id: "r1-2",
        location: "Al-Salam Hospital",
        distributor: "Direct",
        region: "Cairo",
        quantityShipped: 12000,
        quantityReturned: 12000,
        quantityDestroyed: 0,
        quantityRemaining: 0,
        status: "completed",
        lastUpdated: daysAgo(5),
      },
      {
        id: "r1-3",
        location: "Ain Shams Hospital",
        distributor: "Direct",
        region: "Cairo",
        quantityShipped: 10000,
        quantityReturned: 8500,
        quantityDestroyed: 0,
        quantityRemaining: 1500,
        status: "in-progress",
        lastUpdated: daysAgo(3),
      },
      {
        id: "r1-4",
        location: "MedPharma Distributors",
        distributor: "MedPharma Distributors",
        region: "Greater Cairo",
        quantityShipped: 20000,
        quantityReturned: 14000,
        quantityDestroyed: 0,
        quantityRemaining: 6000,
        status: "in-progress",
        lastUpdated: daysAgo(1),
      },
      {
        id: "r1-5",
        location: "Nile Pharma Chain",
        distributor: "Nile Pharma Chain",
        region: "Alexandria",
        quantityShipped: 10000,
        quantityReturned: 0,
        quantityDestroyed: 0,
        quantityRemaining: 10000,
        status: "pending",
        lastUpdated: daysAgo(7),
      },
      {
        id: "r1-6",
        location: "Delta Pharma Distributors",
        distributor: "Delta Pharma Distributors",
        region: "Delta Region",
        quantityShipped: 10000,
        quantityReturned: 6800,
        quantityDestroyed: 0,
        quantityRemaining: 3200,
        status: "in-progress",
        lastUpdated: daysAgo(2),
      },
    ],
    effectivenessChecks: [],
    rootCause: "Glass delamination from Type I borosilicate vials supplied by vendor V-038",
    correctiveActions: "Vendor audit initiated, alternative vial supplier being qualified",
    regulatoryReportNumber: "EDA-RCL-2026-0187",
  },
  {
    id: "rcl-2",
    number: "RCL-2026-002",
    product: "Ranitidine 50mg/2ml Injection",
    affectedBatches: [
      {
        batchNumber: "RAN-2026-018",
        productName: "Ranitidine 50mg/2ml Injection",
        manufacturingDate: daysAgo(120),
        expiryDate: daysAgo(-610),
        quantityManufactured: 30000,
        quantityDistributed: 28000,
        quantityOnHand: 2000,
        distributedTo: [
          "Al-Qasr Al-Aini Hospital",
          "Health Egypt Distributors",
          "PharmaCare Chain",
        ],
      },
    ],
    recallClass: "I",
    type: "voluntary",
    reason: "NDMA impurity above acceptable daily intake limits",
    description:
      "Routine nitrosamine testing detected NDMA levels of 0.96 ppm, exceeding the acceptable limit of 0.032 ppm. Voluntary recall initiated pending full investigation.",
    status: "notification",
    priority: "critical",
    initiatedBy: "Dr. Rania Abdel-Aziz",
    initiatedAt: daysAgo(5),
    department: "Quality Control",
    riskAssessment: {
      healthHazard: "serious",
      populationExposed: 28000,
      likelihoodOfHarm: "moderate",
      assessedBy: "Dr. Laila Farouk",
      assessedAt: daysAgo(4),
      notes:
        "NDMA is a probable human carcinogen. Chronic exposure at detected levels poses increased cancer risk. Acute single-dose risk is low.",
    },
    notifications: [
      {
        id: "n2-1",
        recipientType: "regulatory",
        recipientName: "Egyptian Drug Authority (EDA)",
        method: "email",
        dateSent: daysAgo(4),
        acknowledged: true,
        acknowledgedAt: daysAgo(3),
      },
      {
        id: "n2-2",
        recipientType: "hospitals",
        recipientName: "Al-Qasr Al-Aini Hospital",
        method: "phone",
        dateSent: daysAgo(3),
        acknowledged: true,
        acknowledgedAt: daysAgo(3),
      },
      {
        id: "n2-3",
        recipientType: "distributors",
        recipientName: "Health Egypt Distributors",
        method: "email",
        dateSent: daysAgo(3),
        acknowledged: false,
      },
      {
        id: "n2-4",
        recipientType: "pharmacies",
        recipientName: "PharmaCare Chain",
        method: "email",
        dateSent: daysAgo(3),
        acknowledged: false,
      },
    ],
    retrievals: [],
    effectivenessChecks: [],
    regulatoryReportNumber: "EDA-RCL-2026-0192",
  },

  // ──── Class II (Health Risk) - 3 recalls ───────────────────────────────────
  {
    id: "rcl-3",
    number: "RCL-2026-003",
    product: "Amoxicillin 500mg Tablets",
    affectedBatches: [
      {
        batchNumber: "AMX-2026-112",
        productName: "Amoxicillin 500mg Tablets",
        manufacturingDate: daysAgo(60),
        expiryDate: daysAgo(-670),
        quantityManufactured: 200000,
        quantityDistributed: 185000,
        quantityOnHand: 15000,
        distributedTo: [
          "Alexandria Pharma Hub",
          "Upper Egypt Distributors",
          "Canal Zone Pharmacy Group",
          "National Health Insurance",
        ],
      },
      {
        batchNumber: "AMX-2026-113",
        productName: "Amoxicillin 500mg Tablets",
        manufacturingDate: daysAgo(55),
        expiryDate: daysAgo(-675),
        quantityManufactured: 200000,
        quantityDistributed: 170000,
        quantityOnHand: 30000,
        distributedTo: [
          "Alexandria Pharma Hub",
          "Cairo Central Pharmacy",
          "Canal Zone Pharmacy Group",
        ],
      },
    ],
    recallClass: "II",
    type: "voluntary",
    reason: "Dissolution failure at 6-month stability timepoint",
    description:
      "Accelerated stability study shows dissolution rate below 75% (Q) at 45 minutes for 6-month timepoint. Product may not deliver therapeutic dose.",
    status: "effectiveness-check",
    priority: "high",
    initiatedBy: "Dr. Ahmed Hassan",
    initiatedAt: daysAgo(45),
    department: "Quality Control",
    riskAssessment: {
      healthHazard: "moderate",
      populationExposed: 355000,
      likelihoodOfHarm: "moderate",
      assessedBy: "Dr. Laila Farouk",
      assessedAt: daysAgo(44),
      notes:
        "Reduced bioavailability could lead to treatment failure for bacterial infections. Risk of antimicrobial resistance from subtherapeutic dosing.",
    },
    notifications: [
      {
        id: "n3-1",
        recipientType: "regulatory",
        recipientName: "Egyptian Drug Authority (EDA)",
        method: "email",
        dateSent: daysAgo(44),
        acknowledged: true,
        acknowledgedAt: daysAgo(43),
      },
      {
        id: "n3-2",
        recipientType: "distributors",
        recipientName: "Alexandria Pharma Hub",
        method: "email",
        dateSent: daysAgo(43),
        acknowledged: true,
        acknowledgedAt: daysAgo(42),
      },
      {
        id: "n3-3",
        recipientType: "distributors",
        recipientName: "Upper Egypt Distributors",
        method: "email",
        dateSent: daysAgo(43),
        acknowledged: true,
        acknowledgedAt: daysAgo(41),
      },
      {
        id: "n3-4",
        recipientType: "pharmacies",
        recipientName: "Canal Zone Pharmacy Group",
        method: "letter",
        dateSent: daysAgo(43),
        acknowledged: true,
        acknowledgedAt: daysAgo(39),
      },
      {
        id: "n3-5",
        recipientType: "pharmacies",
        recipientName: "Cairo Central Pharmacy",
        method: "email",
        dateSent: daysAgo(43),
        acknowledged: true,
        acknowledgedAt: daysAgo(42),
      },
      {
        id: "n3-6",
        recipientType: "hospitals",
        recipientName: "National Health Insurance",
        method: "fax",
        dateSent: daysAgo(43),
        acknowledged: true,
        acknowledgedAt: daysAgo(40),
      },
    ],
    retrievals: [
      {
        id: "r3-1",
        location: "Alexandria Pharma Hub",
        distributor: "Alexandria Pharma Hub",
        region: "Alexandria",
        quantityShipped: 150000,
        quantityReturned: 138000,
        quantityDestroyed: 138000,
        quantityRemaining: 12000,
        status: "completed",
        lastUpdated: daysAgo(10),
      },
      {
        id: "r3-2",
        location: "Upper Egypt Distributors",
        distributor: "Upper Egypt Distributors",
        region: "Upper Egypt",
        quantityShipped: 80000,
        quantityReturned: 72000,
        quantityDestroyed: 72000,
        quantityRemaining: 8000,
        status: "completed",
        lastUpdated: daysAgo(12),
      },
      {
        id: "r3-3",
        location: "Canal Zone Pharmacy Group",
        distributor: "Canal Zone Pharmacy Group",
        region: "Canal Zone",
        quantityShipped: 60000,
        quantityReturned: 55000,
        quantityDestroyed: 55000,
        quantityRemaining: 5000,
        status: "completed",
        lastUpdated: daysAgo(15),
      },
      {
        id: "r3-4",
        location: "Cairo Central Pharmacy",
        distributor: "Cairo Central Pharmacy",
        region: "Cairo",
        quantityShipped: 35000,
        quantityReturned: 33000,
        quantityDestroyed: 33000,
        quantityRemaining: 2000,
        status: "completed",
        lastUpdated: daysAgo(14),
      },
      {
        id: "r3-5",
        location: "National Health Insurance",
        distributor: "National Health Insurance",
        region: "Nationwide",
        quantityShipped: 30000,
        quantityReturned: 28500,
        quantityDestroyed: 28500,
        quantityRemaining: 1500,
        status: "completed",
        lastUpdated: daysAgo(11),
      },
    ],
    effectivenessChecks: [
      {
        id: "ec3-1",
        checkLevel: "B",
        recoveryRate: 91.8,
        remainingRisk: "low",
        regulatoryClosure: false,
        conductedBy: "Dr. Laila Farouk",
        conductedAt: daysAgo(8),
        findings:
          "91.8% of distributed product has been recovered. Remaining units primarily in small rural pharmacies.",
        recommendation: "close",
      },
    ],
    rootCause:
      "Coating polymer degradation due to elevated humidity during coating process in July production run",
    correctiveActions:
      "HVAC humidity control upgraded in coating room. In-process humidity monitoring added to BMR.",
    regulatoryReportNumber: "EDA-RCL-2026-0145",
  },
  {
    id: "rcl-4",
    number: "RCL-2026-004",
    product: "Omeprazole 20mg Capsules",
    affectedBatches: [
      {
        batchNumber: "OMP-2026-067",
        productName: "Omeprazole 20mg Capsules",
        manufacturingDate: daysAgo(40),
        expiryDate: daysAgo(-690),
        quantityManufactured: 100000,
        quantityDistributed: 82000,
        quantityOnHand: 18000,
        distributedTo: [
          "MedPharma Distributors",
          "Health Egypt Distributors",
          "Alexandria Pharma Hub",
        ],
      },
    ],
    recallClass: "II",
    type: "voluntary",
    reason: "Cross-contamination with penicillin residue detected",
    description:
      "Routine cleaning validation swab from shared equipment showed penicillin residue above 10 ppm limit. Risk of allergic reaction in penicillin-sensitive patients.",
    status: "retrieval",
    priority: "high",
    initiatedBy: "Dr. Youssef Kamel",
    initiatedAt: daysAgo(20),
    department: "Production",
    riskAssessment: {
      healthHazard: "moderate",
      populationExposed: 82000,
      likelihoodOfHarm: "low",
      assessedBy: "Dr. Rania Abdel-Aziz",
      assessedAt: daysAgo(19),
      notes:
        "Risk limited to penicillin-allergic patients (~10% of population). Detected levels unlikely to cause reaction in non-allergic individuals.",
    },
    notifications: [
      {
        id: "n4-1",
        recipientType: "regulatory",
        recipientName: "Egyptian Drug Authority (EDA)",
        method: "email",
        dateSent: daysAgo(19),
        acknowledged: true,
        acknowledgedAt: daysAgo(18),
      },
      {
        id: "n4-2",
        recipientType: "distributors",
        recipientName: "MedPharma Distributors",
        method: "email",
        dateSent: daysAgo(18),
        acknowledged: true,
        acknowledgedAt: daysAgo(17),
      },
      {
        id: "n4-3",
        recipientType: "distributors",
        recipientName: "Health Egypt Distributors",
        method: "email",
        dateSent: daysAgo(18),
        acknowledged: true,
        acknowledgedAt: daysAgo(16),
      },
      {
        id: "n4-4",
        recipientType: "distributors",
        recipientName: "Alexandria Pharma Hub",
        method: "email",
        dateSent: daysAgo(18),
        acknowledged: true,
        acknowledgedAt: daysAgo(17),
      },
    ],
    retrievals: [
      {
        id: "r4-1",
        location: "MedPharma Distributors",
        distributor: "MedPharma Distributors",
        region: "Greater Cairo",
        quantityShipped: 35000,
        quantityReturned: 28000,
        quantityDestroyed: 0,
        quantityRemaining: 7000,
        status: "in-progress",
        lastUpdated: daysAgo(3),
      },
      {
        id: "r4-2",
        location: "Health Egypt Distributors",
        distributor: "Health Egypt Distributors",
        region: "Cairo",
        quantityShipped: 25000,
        quantityReturned: 22000,
        quantityDestroyed: 0,
        quantityRemaining: 3000,
        status: "in-progress",
        lastUpdated: daysAgo(4),
      },
      {
        id: "r4-3",
        location: "Alexandria Pharma Hub",
        distributor: "Alexandria Pharma Hub",
        region: "Alexandria",
        quantityShipped: 22000,
        quantityReturned: 18500,
        quantityDestroyed: 0,
        quantityRemaining: 3500,
        status: "in-progress",
        lastUpdated: daysAgo(2),
      },
    ],
    effectivenessChecks: [],
    rootCause: "Inadequate cleaning validation of shared granulator between penicillin and non-penicillin products",
    correctiveActions:
      "Dedicated equipment campaign sequencing implemented. Enhanced cleaning validation protocol with swab and rinse testing at 3 points.",
    regulatoryReportNumber: "EDA-RCL-2026-0168",
  },
  {
    id: "rcl-5",
    number: "RCL-2026-005",
    product: "Metformin 850mg Tablets",
    affectedBatches: [
      {
        batchNumber: "MET-2026-201",
        productName: "Metformin 850mg Tablets",
        manufacturingDate: daysAgo(100),
        expiryDate: daysAgo(-630),
        quantityManufactured: 300000,
        quantityDistributed: 280000,
        quantityOnHand: 20000,
        distributedTo: [
          "National Health Insurance",
          "Delta Pharma Distributors",
          "Upper Egypt Distributors",
          "Nile Pharma Chain",
        ],
      },
    ],
    recallClass: "II",
    type: "mandatory",
    reason: "Incorrect potency - assay results at 115% of label claim",
    description:
      "Post-market surveillance testing by EDA found assay results at 115% of label claim, outside specification of 95-105%. Mandatory recall issued by EDA.",
    status: "closed",
    priority: "high",
    initiatedBy: "Dr. Laila Farouk",
    initiatedAt: daysAgo(90),
    department: "Quality Assurance",
    riskAssessment: {
      healthHazard: "moderate",
      populationExposed: 280000,
      likelihoodOfHarm: "moderate",
      assessedBy: "Dr. Rania Abdel-Aziz",
      assessedAt: daysAgo(89),
      notes:
        "Superpotent tablets increase risk of hypoglycemia and lactic acidosis. Risk is elevated for elderly and renally impaired patients.",
    },
    notifications: [
      {
        id: "n5-1",
        recipientType: "regulatory",
        recipientName: "Egyptian Drug Authority (EDA)",
        method: "email",
        dateSent: daysAgo(89),
        acknowledged: true,
        acknowledgedAt: daysAgo(89),
      },
      {
        id: "n5-2",
        recipientType: "distributors",
        recipientName: "National Health Insurance",
        method: "fax",
        dateSent: daysAgo(88),
        acknowledged: true,
        acknowledgedAt: daysAgo(87),
      },
      {
        id: "n5-3",
        recipientType: "distributors",
        recipientName: "Delta Pharma Distributors",
        method: "email",
        dateSent: daysAgo(88),
        acknowledged: true,
        acknowledgedAt: daysAgo(87),
      },
      {
        id: "n5-4",
        recipientType: "distributors",
        recipientName: "Upper Egypt Distributors",
        method: "email",
        dateSent: daysAgo(88),
        acknowledged: true,
        acknowledgedAt: daysAgo(86),
      },
      {
        id: "n5-5",
        recipientType: "pharmacies",
        recipientName: "Nile Pharma Chain",
        method: "email",
        dateSent: daysAgo(88),
        acknowledged: true,
        acknowledgedAt: daysAgo(86),
      },
    ],
    retrievals: [
      {
        id: "r5-1",
        location: "National Health Insurance",
        distributor: "National Health Insurance",
        region: "Nationwide",
        quantityShipped: 120000,
        quantityReturned: 112000,
        quantityDestroyed: 112000,
        quantityRemaining: 8000,
        status: "completed",
        lastUpdated: daysAgo(40),
      },
      {
        id: "r5-2",
        location: "Delta Pharma Distributors",
        distributor: "Delta Pharma Distributors",
        region: "Delta Region",
        quantityShipped: 80000,
        quantityReturned: 76000,
        quantityDestroyed: 76000,
        quantityRemaining: 4000,
        status: "completed",
        lastUpdated: daysAgo(42),
      },
      {
        id: "r5-3",
        location: "Upper Egypt Distributors",
        distributor: "Upper Egypt Distributors",
        region: "Upper Egypt",
        quantityShipped: 50000,
        quantityReturned: 47500,
        quantityDestroyed: 47500,
        quantityRemaining: 2500,
        status: "completed",
        lastUpdated: daysAgo(45),
      },
      {
        id: "r5-4",
        location: "Nile Pharma Chain",
        distributor: "Nile Pharma Chain",
        region: "Alexandria",
        quantityShipped: 30000,
        quantityReturned: 28000,
        quantityDestroyed: 28000,
        quantityRemaining: 2000,
        status: "completed",
        lastUpdated: daysAgo(44),
      },
    ],
    effectivenessChecks: [
      {
        id: "ec5-1",
        checkLevel: "B",
        recoveryRate: 94.1,
        remainingRisk: "low",
        regulatoryClosure: true,
        regulatoryReference: "EDA-CLO-2026-0098",
        conductedBy: "Dr. Laila Farouk",
        conductedAt: daysAgo(30),
        findings:
          "94.1% recovery achieved. Remaining product estimated consumed prior to recall. EDA satisfied with recall effectiveness.",
        recommendation: "close",
      },
    ],
    rootCause:
      "Weighing balance calibration drift causing over-dispensing of API by 15%",
    correctiveActions:
      "Balance replaced. Daily verification checks added to SOP. Independent weight verification step added to dispensing BMR.",
    regulatoryReportNumber: "EDA-RCL-2026-0112",
    closedAt: daysAgo(25),
    closedBy: "Dr. Laila Farouk",
  },

  // ──── Class III (Unlikely Harm) - 2 recalls ───────────────────────────────
  {
    id: "rcl-6",
    number: "RCL-2026-006",
    product: "Paracetamol 500mg Tablets",
    affectedBatches: [
      {
        batchNumber: "PCM-2026-330",
        productName: "Paracetamol 500mg Tablets",
        manufacturingDate: daysAgo(30),
        expiryDate: daysAgo(-700),
        quantityManufactured: 500000,
        quantityDistributed: 420000,
        quantityOnHand: 80000,
        distributedTo: [
          "Cairo Central Pharmacy",
          "Nile Pharma Chain",
          "Health Egypt Distributors",
        ],
      },
    ],
    recallClass: "III",
    type: "voluntary",
    reason: "Labeling error - incorrect storage conditions printed on carton",
    description:
      "Printed cartons state 'Store below 30C' instead of correct 'Store below 25C'. Product stability not affected at 30C but label does not match registration.",
    status: "reconciliation",
    priority: "medium",
    initiatedBy: "Pharm. Mariam Khalil",
    initiatedAt: daysAgo(18),
    department: "Packaging",
    riskAssessment: {
      healthHazard: "none",
      populationExposed: 420000,
      likelihoodOfHarm: "remote",
      assessedBy: "Dr. Laila Farouk",
      assessedAt: daysAgo(17),
      notes:
        "No safety risk. Product remains within specification at both storage conditions. Recall is for regulatory compliance only.",
    },
    notifications: [
      {
        id: "n6-1",
        recipientType: "regulatory",
        recipientName: "Egyptian Drug Authority (EDA)",
        method: "email",
        dateSent: daysAgo(17),
        acknowledged: true,
        acknowledgedAt: daysAgo(16),
      },
      {
        id: "n6-2",
        recipientType: "distributors",
        recipientName: "Cairo Central Pharmacy",
        method: "email",
        dateSent: daysAgo(16),
        acknowledged: true,
        acknowledgedAt: daysAgo(15),
      },
      {
        id: "n6-3",
        recipientType: "distributors",
        recipientName: "Nile Pharma Chain",
        method: "email",
        dateSent: daysAgo(16),
        acknowledged: true,
        acknowledgedAt: daysAgo(14),
      },
      {
        id: "n6-4",
        recipientType: "distributors",
        recipientName: "Health Egypt Distributors",
        method: "email",
        dateSent: daysAgo(16),
        acknowledged: true,
        acknowledgedAt: daysAgo(15),
      },
    ],
    retrievals: [
      {
        id: "r6-1",
        location: "Cairo Central Pharmacy",
        distributor: "Cairo Central Pharmacy",
        region: "Cairo",
        quantityShipped: 180000,
        quantityReturned: 155000,
        quantityDestroyed: 0,
        quantityRemaining: 25000,
        status: "completed",
        lastUpdated: daysAgo(5),
      },
      {
        id: "r6-2",
        location: "Nile Pharma Chain",
        distributor: "Nile Pharma Chain",
        region: "Alexandria",
        quantityShipped: 140000,
        quantityReturned: 125000,
        quantityDestroyed: 0,
        quantityRemaining: 15000,
        status: "completed",
        lastUpdated: daysAgo(6),
      },
      {
        id: "r6-3",
        location: "Health Egypt Distributors",
        distributor: "Health Egypt Distributors",
        region: "Cairo",
        quantityShipped: 100000,
        quantityReturned: 88000,
        quantityDestroyed: 0,
        quantityRemaining: 12000,
        status: "completed",
        lastUpdated: daysAgo(4),
      },
    ],
    effectivenessChecks: [],
    rootCause: "Artwork revision control error - outdated artwork file used for print run",
    correctiveActions:
      "Artwork management SOP revised with mandatory dual-verification step. Electronic artwork approval system implemented.",
  },
  {
    id: "rcl-7",
    number: "RCL-2026-007",
    product: "Metformin 500mg Tablets",
    affectedBatches: [
      {
        batchNumber: "MET-2026-155",
        productName: "Metformin 500mg Tablets",
        manufacturingDate: daysAgo(150),
        expiryDate: daysAgo(-580),
        quantityManufactured: 250000,
        quantityDistributed: 240000,
        quantityOnHand: 10000,
        distributedTo: [
          "National Health Insurance",
          "MedPharma Distributors",
          "Delta Pharma Distributors",
        ],
      },
    ],
    recallClass: "III",
    type: "voluntary",
    reason: "Tablet thickness out of specification - cosmetic defect",
    description:
      "Batch released with tablets measuring 5.8mm thickness vs specification of 5.0-5.5mm. No impact on dissolution, hardness, or content uniformity. Cosmetic issue only.",
    status: "closed",
    priority: "low",
    initiatedBy: "Dr. Youssef Kamel",
    initiatedAt: daysAgo(120),
    department: "Production",
    riskAssessment: {
      healthHazard: "none",
      populationExposed: 240000,
      likelihoodOfHarm: "remote",
      assessedBy: "Dr. Laila Farouk",
      assessedAt: daysAgo(119),
      notes:
        "No safety concern. All critical quality attributes within specification. Cosmetic defect only - thicker tablets may cause patient confusion.",
    },
    notifications: [
      {
        id: "n7-1",
        recipientType: "regulatory",
        recipientName: "Egyptian Drug Authority (EDA)",
        method: "email",
        dateSent: daysAgo(119),
        acknowledged: true,
        acknowledgedAt: daysAgo(118),
      },
      {
        id: "n7-2",
        recipientType: "distributors",
        recipientName: "National Health Insurance",
        method: "email",
        dateSent: daysAgo(118),
        acknowledged: true,
        acknowledgedAt: daysAgo(116),
      },
      {
        id: "n7-3",
        recipientType: "distributors",
        recipientName: "MedPharma Distributors",
        method: "email",
        dateSent: daysAgo(118),
        acknowledged: true,
        acknowledgedAt: daysAgo(117),
      },
      {
        id: "n7-4",
        recipientType: "distributors",
        recipientName: "Delta Pharma Distributors",
        method: "email",
        dateSent: daysAgo(118),
        acknowledged: true,
        acknowledgedAt: daysAgo(116),
      },
    ],
    retrievals: [
      {
        id: "r7-1",
        location: "National Health Insurance",
        distributor: "National Health Insurance",
        region: "Nationwide",
        quantityShipped: 100000,
        quantityReturned: 82000,
        quantityDestroyed: 0,
        quantityRemaining: 18000,
        status: "completed",
        lastUpdated: daysAgo(85),
      },
      {
        id: "r7-2",
        location: "MedPharma Distributors",
        distributor: "MedPharma Distributors",
        region: "Greater Cairo",
        quantityShipped: 80000,
        quantityReturned: 68000,
        quantityDestroyed: 0,
        quantityRemaining: 12000,
        status: "completed",
        lastUpdated: daysAgo(88),
      },
      {
        id: "r7-3",
        location: "Delta Pharma Distributors",
        distributor: "Delta Pharma Distributors",
        region: "Delta Region",
        quantityShipped: 60000,
        quantityReturned: 51000,
        quantityDestroyed: 0,
        quantityRemaining: 9000,
        status: "completed",
        lastUpdated: daysAgo(86),
      },
    ],
    effectivenessChecks: [
      {
        id: "ec7-1",
        checkLevel: "C",
        recoveryRate: 83.8,
        remainingRisk: "none",
        regulatoryClosure: true,
        regulatoryReference: "EDA-CLO-2026-0076",
        conductedBy: "Dr. Laila Farouk",
        conductedAt: daysAgo(75),
        findings:
          "83.8% recovery. Given Class III with no safety impact, remaining product poses no risk. EDA concurred with closure.",
        recommendation: "close",
      },
    ],
    rootCause:
      "Compression machine tooling wear causing increased tablet thickness. Tooling replacement schedule not followed.",
    correctiveActions:
      "Tooling inspection and replacement SOP updated. Preventive maintenance schedule enforced with electronic alerts.",
    regulatoryReportNumber: "EDA-RCL-2026-0065",
    closedAt: daysAgo(70),
    closedBy: "Dr. Laila Farouk",
  },

  // ──── Market Withdrawal - 1 recall ─────────────────────────────────────────
  {
    id: "rcl-8",
    number: "RCL-2026-008",
    product: "Omeprazole 40mg Capsules",
    affectedBatches: [
      {
        batchNumber: "OMP-2026-089",
        productName: "Omeprazole 40mg Capsules",
        manufacturingDate: daysAgo(35),
        expiryDate: daysAgo(-695),
        quantityManufactured: 80000,
        quantityDistributed: 45000,
        quantityOnHand: 35000,
        distributedTo: [
          "Health Egypt Distributors",
          "Canal Zone Pharmacy Group",
        ],
      },
    ],
    recallClass: "III",
    type: "market-withdrawal",
    reason: "Product registered under superseded formulation - administrative recall",
    description:
      "EDA registration renewal requires updated formulation dossier. Current batch manufactured under previous registration. Market withdrawal to prevent sale of unregistered product.",
    status: "risk-assessment",
    priority: "low",
    initiatedBy: "Dr. Heba Mostafa",
    initiatedAt: daysAgo(3),
    department: "Regulatory Affairs",
    notifications: [
      {
        id: "n8-1",
        recipientType: "regulatory",
        recipientName: "Egyptian Drug Authority (EDA)",
        method: "email",
        dateSent: daysAgo(2),
        acknowledged: false,
      },
    ],
    retrievals: [],
    effectivenessChecks: [],
  },
];

// ─── Store Class ─────────────────────────────────────────────────────────────

class RecallStore {
  private static instance: RecallStore;

  private constructor() {
    this.seed();
  }

  static getInstance(): RecallStore {
    if (!RecallStore.instance) {
      RecallStore.instance = new RecallStore();
    }
    return RecallStore.instance;
  }

  private seed(): void {
    if (typeof window === "undefined") return;
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
    }
  }

  private load(): RecallRecord[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecallRecord[]) : [];
  }

  private save(data: RecallRecord[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────

  getAll(): RecallRecord[] {
    return this.load();
  }

  getById(id: string): RecallRecord | undefined {
    return this.load().find((r) => r.id === id);
  }

  create(recall: Omit<RecallRecord, "id" | "number">): RecallRecord {
    if (!recall.product?.trim()) throw new Error("Recall product is required");
    if (!recall.reason?.trim()) throw new Error("Recall reason is required");
    if (!recall.description?.trim()) throw new Error("Recall description is required");
    if (!recall.recallClass?.trim()) throw new Error("Recall class is required");
    if (!recall.type?.trim()) throw new Error("Recall type is required");
    if (!recall.priority?.trim()) throw new Error("Recall priority is required");
    if (!recall.initiatedBy?.trim()) throw new Error("Recall initiatedBy is required");
    const all = this.load();
    const newRecall: RecallRecord = {
      ...recall,
      id: `rcl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      number: this.generateNumber(),
    };
    all.push(newRecall);
    this.save(all);
    return newRecall;
  }

  update(id: string, updates: Partial<RecallRecord>): RecallRecord | undefined {
    const all = this.load();
    const idx = all.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    all[idx] = { ...all[idx], ...updates };
    this.save(all);
    return all[idx];
  }

  delete(id: string): boolean {
    const all = this.load();
    const filtered = all.filter((r) => r.id !== id);
    if (filtered.length === all.length) return false;
    this.save(filtered);
    return true;
  }

  // ─── Queries ─────────────────────────────────────────────────────────────

  getByStatus(status: RecallStatus): RecallRecord[] {
    return this.load().filter((r) => r.status === status);
  }

  getByClass(recallClass: RecallClass): RecallRecord[] {
    return this.load().filter((r) => r.recallClass === recallClass);
  }

  getByType(type: RecallType): RecallRecord[] {
    return this.load().filter((r) => r.type === type);
  }

  getActive(): RecallRecord[] {
    return this.load().filter((r) => r.status !== "closed");
  }

  getClassIActive(): RecallRecord[] {
    return this.load().filter(
      (r) => r.recallClass === "I" && r.status !== "closed"
    );
  }

  // ─── Recovery Rate ───────────────────────────────────────────────────────

  calculateRecoveryRate(recall: RecallRecord): number {
    if (recall.retrievals.length === 0) return 0;
    const totalShipped = recall.retrievals.reduce(
      (sum, r) => sum + r.quantityShipped,
      0
    );
    const totalReturned = recall.retrievals.reduce(
      (sum, r) => sum + r.quantityReturned,
      0
    );
    if (totalShipped === 0) return 0;
    return Math.round((totalReturned / totalShipped) * 1000) / 10;
  }

  // ─── Notification Helpers ────────────────────────────────────────────────

  addNotification(
    id: string,
    notification: Omit<RecallNotification, "id">
  ): RecallRecord | undefined {
    const recall = this.getById(id);
    if (!recall) return undefined;
    const newNotification: RecallNotification = {
      ...notification,
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    return this.update(id, {
      notifications: [...recall.notifications, newNotification],
    });
  }

  acknowledgeNotification(
    recallId: string,
    notificationId: string
  ): RecallRecord | undefined {
    const recall = this.getById(recallId);
    if (!recall) return undefined;
    const notifications = recall.notifications.map((n) =>
      n.id === notificationId
        ? { ...n, acknowledged: true, acknowledgedAt: new Date().toISOString() }
        : n
    );
    return this.update(recallId, { notifications });
  }

  // ─── Retrieval Helpers ───────────────────────────────────────────────────

  addRetrieval(
    id: string,
    retrieval: Omit<RecallRetrieval, "id">
  ): RecallRecord | undefined {
    const recall = this.getById(id);
    if (!recall) return undefined;
    const newRetrieval: RecallRetrieval = {
      ...retrieval,
      id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    return this.update(id, {
      retrievals: [...recall.retrievals, newRetrieval],
    });
  }

  updateRetrieval(
    recallId: string,
    retrievalId: string,
    updates: Partial<RecallRetrieval>
  ): RecallRecord | undefined {
    const recall = this.getById(recallId);
    if (!recall) return undefined;
    const retrievals = recall.retrievals.map((r) =>
      r.id === retrievalId ? { ...r, ...updates, lastUpdated: new Date().toISOString() } : r
    );
    return this.update(recallId, { retrievals });
  }

  // ─── Effectiveness Check Helpers ─────────────────────────────────────────

  addEffectivenessCheck(
    id: string,
    check: Omit<RecallEffectivenessCheck, "id">
  ): RecallRecord | undefined {
    const recall = this.getById(id);
    if (!recall) return undefined;
    const newCheck: RecallEffectivenessCheck = {
      ...check,
      id: `ec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    return this.update(id, {
      effectivenessChecks: [...recall.effectivenessChecks, newCheck],
    });
  }

  // ─── Batch Traceability ──────────────────────────────────────────────────

  findRecallsByBatch(batchNumber: string): RecallRecord[] {
    return this.load().filter((r) =>
      r.affectedBatches.some((b) => b.batchNumber === batchNumber)
    );
  }

  findRecallsByProduct(product: string): RecallRecord[] {
    return this.load().filter((r) =>
      r.product.toLowerCase().includes(product.toLowerCase())
    );
  }

  getDistributionMap(recallId: string): { location: string; region: string; quantity: number; returned: number }[] {
    const recall = this.getById(recallId);
    if (!recall) return [];
    return recall.retrievals.map((r) => ({
      location: r.location,
      region: r.region,
      quantity: r.quantityShipped,
      returned: r.quantityReturned,
    }));
  }

  // ─── Status Transitions ──────────────────────────────────────────────────

  advanceStatus(id: string): RecallRecord | undefined {
    const recall = this.getById(id);
    if (!recall) return undefined;
    const ORDER: RecallStatus[] = [
      "initiated",
      "risk-assessment",
      "notification",
      "retrieval",
      "reconciliation",
      "effectiveness-check",
      "closed",
    ];
    const idx = ORDER.indexOf(recall.status);
    if (idx === -1 || idx >= ORDER.length - 1) return recall;
    const nextStatus = ORDER[idx + 1];
    const updates: Partial<RecallRecord> = { status: nextStatus };
    if (nextStatus === "closed") {
      updates.closedAt = new Date().toISOString();
      updates.closedBy = "Current User";
    }
    return this.update(id, updates);
  }

  closeRecall(id: string): RecallRecord | undefined {
    return this.update(id, {
      status: "closed",
      closedAt: new Date().toISOString(),
      closedBy: "Current User",
    });
  }

  // ─── Number Generation ───────────────────────────────────────────────────

  generateNumber(): string {
    const all = this.load();
    const year = new Date().getFullYear();
    const yearPrefix = `RCL-${year}-`;
    const existing = all
      .filter((r) => r.number.startsWith(yearPrefix))
      .map((r) => parseInt(r.number.replace(yearPrefix, ""), 10))
      .filter((n) => !isNaN(n));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `${yearPrefix}${String(next).padStart(3, "0")}`;
  }

  // ─── Metrics ─────────────────────────────────────────────────────────────

  getMetrics(): RecallMetrics {
    const all = this.load();
    const active = all.filter((r) => r.status !== "closed");
    const classIActive = active.filter((r) => r.recallClass === "I");
    const classIIActive = active.filter((r) => r.recallClass === "II");
    const classIIIActive = active.filter((r) => r.recallClass === "III");

    // Average recovery rate for recalls with retrievals
    const recallsWithRetrievals = all.filter((r) => r.retrievals.length > 0);
    const avgRecoveryRate =
      recallsWithRetrievals.length > 0
        ? Math.round(
            (recallsWithRetrievals.reduce(
              (sum, r) => sum + this.calculateRecoveryRate(r),
              0
            ) /
              recallsWithRetrievals.length) *
              10
          ) / 10
        : 0;

    // Pending notifications (sent but not acknowledged)
    const pendingNotifications = all.reduce(
      (sum, r) =>
        sum +
        r.notifications.filter((n) => !n.acknowledged).length,
      0
    );

    // By class
    const classMap = new Map<RecallClass, number>();
    all.forEach((r) =>
      classMap.set(r.recallClass, (classMap.get(r.recallClass) || 0) + 1)
    );
    const byClass = (["I", "II", "III"] as RecallClass[]).map((c) => ({
      recallClass: c,
      count: classMap.get(c) || 0,
    }));

    // By type
    const typeMap = new Map<RecallType, number>();
    all.forEach((r) => typeMap.set(r.type, (typeMap.get(r.type) || 0) + 1));
    const byType = Array.from(typeMap.entries()).map(([type, count]) => ({
      type,
      count,
    }));

    // By status
    const statusMap = new Map<RecallStatus, number>();
    all.forEach((r) =>
      statusMap.set(r.status, (statusMap.get(r.status) || 0) + 1)
    );
    const byStatus = Array.from(statusMap.entries()).map(
      ([status, count]) => ({ status, count })
    );

    // Average response time (initiated to notification)
    const withNotifications = all.filter((r) => r.notifications.length > 0);
    const avgResponseTimeDays =
      withNotifications.length > 0
        ? Math.round(
            withNotifications.reduce((sum, r) => {
              const firstNotif = r.notifications.reduce((earliest, n) =>
                new Date(n.dateSent) < new Date(earliest.dateSent) ? n : earliest
              );
              return sum + daysBetween(r.initiatedAt, firstNotif.dateSent);
            }, 0) / withNotifications.length
          )
        : 0;

    return {
      total: all.length,
      active: active.length,
      classIActive: classIActive.length,
      classIIActive: classIIActive.length,
      classIIIActive: classIIIActive.length,
      avgRecoveryRate,
      pendingNotifications,
      byClass,
      byType,
      byStatus,
      avgResponseTimeDays,
    };
  }
}

export const recallStore = RecallStore.getInstance();
