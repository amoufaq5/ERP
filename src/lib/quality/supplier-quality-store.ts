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
      "Recall notification within 24 hours of detection",
      "Stability data to be shared for all API batches",
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
    number: "SQA-2025-002",
    supplierName: "Cipla Ltd",
    supplierCode: "SUP-API-002",
    materialType: "api",
    materialsScope: ["Omeprazole Pellets"],
    effectiveDate: dateStr(2025, 3, 1),
    expiryDate: dateStr(2027, 2, 28),
    reviewDate: dateStr(2026, 9, 1),
    status: "active",
    version: "1.0",
    terms: [
      "CoA per EP/USP monograph required with each delivery",
      "Annual on-site audit right",
      "Process change notification minimum 60 days",
      "Batch traceability documentation mandatory",
    ],
    reviewHistory: [],
    contactPerson: "Dr. Anita Sharma",
    contactEmail: "a.sharma@cipla.com",
    createdAt: dateStr(2025, 2, 15),
    updatedAt: dateStr(2025, 2, 15),
  },
  {
    id: "sqa-3",
    number: "SQA-2025-003",
    supplierName: "Zhejiang Hisun Pharmaceutical",
    supplierCode: "SUP-API-003",
    materialType: "api",
    materialsScope: ["Metformin HCl"],
    effectiveDate: dateStr(2025, 6, 1),
    expiryDate: dateStr(2027, 5, 31),
    reviewDate: dateStr(2026, 12, 1),
    status: "active",
    version: "1.0",
    terms: [
      "Full CoA with each shipment including impurity profile",
      "Biannual audit rights with remote audit option",
      "60-day change notification requirement",
      "DMF maintenance and update obligation",
    ],
    reviewHistory: [],
    contactPerson: "Mr. Wei Zhang",
    contactEmail: "w.zhang@hisun.com",
    createdAt: dateStr(2025, 5, 10),
    updatedAt: dateStr(2025, 5, 10),
  },
  {
    id: "sqa-4",
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
      "Technical support for formulation development",
    ],
    reviewHistory: [
      { date: dateStr(2025, 8, 5), reviewer: "Dr. Ahmed Hassan", notes: "Minor update to change notification clause" },
    ],
    contactPerson: "Ms. Anna Müller",
    contactEmail: "anna.mueller@basf.com",
    createdAt: dateStr(2025, 1, 15),
    updatedAt: dateStr(2025, 8, 5),
  },
  {
    id: "sqa-5",
    number: "SQA-2025-005",
    supplierName: "Roquette Pharma",
    supplierCode: "SUP-EXC-002",
    materialType: "excipient",
    materialsScope: ["Microcrystalline Cellulose (MCC)", "Lactose Monohydrate", "Magnesium Stearate"],
    effectiveDate: dateStr(2025, 4, 1),
    expiryDate: dateStr(2027, 3, 31),
    reviewDate: dateStr(2026, 10, 1),
    status: "active",
    version: "1.0",
    terms: [
      "Multi-compendial CoA (EP/USP/BP) with each shipment",
      "Annual GMP audit permitted",
      "BSE/TSE certificate for animal-origin excipients",
      "Supply continuity guarantee of 6 months stock",
    ],
    reviewHistory: [],
    contactPerson: "Mr. Pierre Dupont",
    contactEmail: "p.dupont@roquette.com",
    createdAt: dateStr(2025, 3, 15),
    updatedAt: dateStr(2025, 3, 15),
  },
  {
    id: "sqa-6",
    number: "SQA-2025-006",
    supplierName: "Amcor Flexibles",
    supplierCode: "SUP-PKG-001",
    materialType: "packaging",
    materialsScope: ["PVC/PVDC Blister Film", "Aluminum Blister Foil"],
    effectiveDate: dateStr(2025, 5, 1),
    expiryDate: dateStr(2027, 4, 30),
    reviewDate: dateStr(2026, 11, 1),
    status: "active",
    version: "1.0",
    terms: [
      "CoA for MVTR, thickness and extractables per batch",
      "Annual audit rights",
      "Material change notification 90 days in advance",
      "FDA and EDA compliance for food-contact materials",
    ],
    reviewHistory: [],
    contactPerson: "Mr. James Collins",
    contactEmail: "j.collins@amcor.com",
    createdAt: dateStr(2025, 4, 10),
    updatedAt: dateStr(2025, 4, 10),
  },
  {
    id: "sqa-7",
    number: "SQA-2025-007",
    supplierName: "Pharma Packaging Industries (PPI)",
    supplierCode: "SUP-PKG-002",
    materialType: "packaging",
    materialsScope: ["HDPE Bottles", "PP Caps", "Printed Cartons"],
    effectiveDate: dateStr(2025, 7, 1),
    expiryDate: dateStr(2027, 6, 30),
    reviewDate: dateStr(2026, 1, 1),
    status: "active",
    version: "1.0",
    terms: [
      "Dimensional and visual inspection CoA per batch",
      "Migration testing certificates annually",
      "Artwork approval process within 10 business days",
      "EDA-compliant labeling materials",
    ],
    reviewHistory: [],
    contactPerson: "Eng. Mohamed Sherif",
    contactEmail: "m.sherif@ppi-eg.com",
    createdAt: dateStr(2025, 6, 15),
    updatedAt: dateStr(2025, 6, 15),
  },
  {
    id: "sqa-8",
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
  {
    id: "sqa-9",
    number: "SQA-2026-001",
    supplierName: "DFE Pharma",
    supplierCode: "SUP-EXC-003",
    materialType: "excipient",
    materialsScope: ["Lactose Monohydrate", "Starch 1500"],
    effectiveDate: futureDays(15),
    expiryDate: futureDays(745),
    reviewDate: futureDays(380),
    status: "draft",
    version: "0.1",
    terms: [
      "CoA per EP/NF monograph with each shipment",
      "Annual audit rights",
      "IPEC-PQG GMP compliance",
    ],
    reviewHistory: [],
    contactPerson: "Ms. Lisa van den Berg",
    contactEmail: "l.vandenberg@dfepharma.com",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },
  {
    id: "sqa-10",
    number: "SQA-2026-002",
    supplierName: "Colorcon Inc.",
    supplierCode: "SUP-EXC-004",
    materialType: "excipient",
    materialsScope: ["Opadry II (Film Coating)", "Opadry AMB"],
    effectiveDate: daysAgo(10),
    expiryDate: futureDays(20),
    reviewDate: daysAgo(5),
    status: "under-review",
    version: "1.0",
    terms: [
      "CoA per in-house specification with each delivery",
      "Annual audit rights with 30-day notice",
      "Technical support for coating process optimization",
    ],
    reviewHistory: [
      { date: daysAgo(5), reviewer: "Dr. Ahmed Hassan", notes: "Under review for renewal - expiring soon" },
    ],
    contactPerson: "Mr. David Thompson",
    contactEmail: "d.thompson@colorcon.com",
    createdAt: daysAgo(380),
    updatedAt: daysAgo(5),
  },
];

/* ─── Seed: Material Specifications (15) ─── */

const SEED_SPECIFICATIONS: MaterialSpecification[] = [
  // APIs
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
      { testName: "Residual Solvents", method: "GC", acceptanceCriteria: "Meets ICH Q3C limits" },
      { testName: "Heavy Metals", method: "ICP-MS", acceptanceCriteria: "NMT 20 ppm", unit: "ppm" },
    ],
    approvedBy: "Dr. Rania Abdel-Aziz",
    approvedAt: dateStr(2025, 1, 1),
  },
  {
    id: "spec-2",
    materialName: "Omeprazole Pellets",
    materialCode: "RM-API-002",
    materialType: "api",
    pharmacopoeiaRef: "USP",
    version: "2.0",
    effectiveDate: dateStr(2025, 3, 1),
    tests: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White to off-white spherical pellets" },
      { testName: "Identification (HPLC)", method: "USP <621>", acceptanceCriteria: "RT matches reference standard" },
      { testName: "Assay (HPLC)", method: "USP <621>", acceptanceCriteria: "98.0 - 102.0%", unit: "%" },
      { testName: "Related Substances", method: "HPLC", acceptanceCriteria: "Total impurities NMT 1.0%", unit: "%" },
      { testName: "Loss on Drying", method: "USP <731>", acceptanceCriteria: "NMT 0.5%", unit: "%" },
      { testName: "Particle Size", method: "Sieve Analysis", acceptanceCriteria: "90% between 300-700 µm", unit: "µm" },
    ],
    approvedBy: "Dr. Rania Abdel-Aziz",
    approvedAt: dateStr(2025, 3, 1),
  },
  {
    id: "spec-3",
    materialName: "Metformin HCl",
    materialCode: "RM-API-003",
    materialType: "api",
    pharmacopoeiaRef: "BP",
    version: "2.1",
    effectiveDate: dateStr(2025, 2, 1),
    tests: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White crystalline powder" },
      { testName: "Identification (IR)", method: "BP Appendix II A", acceptanceCriteria: "Concordant with reference spectrum" },
      { testName: "Assay (HPLC)", method: "BP", acceptanceCriteria: "98.5 - 101.0%", unit: "%" },
      { testName: "Related Substances", method: "HPLC", acceptanceCriteria: "Any single impurity NMT 0.1%, Total NMT 0.5%", unit: "%" },
      { testName: "Loss on Drying", method: "105°C, 2h", acceptanceCriteria: "NMT 0.5%", unit: "%" },
      { testName: "Nitrosamine (NDMA)", method: "LC-MS/MS", acceptanceCriteria: "NMT 96 ng/day", unit: "ng/day" },
      { testName: "Heavy Metals", method: "ICP-MS", acceptanceCriteria: "NMT 10 ppm", unit: "ppm" },
    ],
    approvedBy: "Dr. Rania Abdel-Aziz",
    approvedAt: dateStr(2025, 2, 1),
  },
  // Excipients
  {
    id: "spec-4",
    materialName: "Microcrystalline Cellulose (MCC) PH-102",
    materialCode: "RM-EXC-001",
    materialType: "excipient",
    pharmacopoeiaRef: "EP",
    version: "2.0",
    effectiveDate: dateStr(2025, 4, 1),
    tests: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White or almost white, fine or granular powder" },
      { testName: "Identification", method: "EP 2.3.17", acceptanceCriteria: "Positive iodine test (blue-violet color)" },
      { testName: "Loss on Drying", method: "105°C, 3h", acceptanceCriteria: "NMT 7.0%", unit: "%" },
      { testName: "Bulk Density", method: "EP 2.9.34", acceptanceCriteria: "0.28 - 0.35 g/mL", unit: "g/mL" },
      { testName: "Particle Size (d50)", method: "Laser Diffraction", acceptanceCriteria: "90 - 130 µm", unit: "µm" },
      { testName: "pH", method: "EP 2.2.3", acceptanceCriteria: "5.0 - 7.5" },
    ],
    approvedBy: "Dr. Rania Abdel-Aziz",
    approvedAt: dateStr(2025, 4, 1),
  },
  {
    id: "spec-5",
    materialName: "Lactose Monohydrate (FlowLac 100)",
    materialCode: "RM-EXC-002",
    materialType: "excipient",
    pharmacopoeiaRef: "EP",
    version: "1.0",
    effectiveDate: dateStr(2025, 4, 1),
    tests: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White or almost white crystalline powder" },
      { testName: "Identification", method: "EP", acceptanceCriteria: "Positive for lactose" },
      { testName: "Loss on Drying", method: "80°C, 2h", acceptanceCriteria: "NMT 0.5%", unit: "%" },
      { testName: "Assay", method: "EP", acceptanceCriteria: "98.0 - 102.0% (as anhydrous lactose)", unit: "%" },
      { testName: "Protein Residue", method: "BCA Assay", acceptanceCriteria: "NMT 200 ppm", unit: "ppm" },
    ],
    approvedBy: "Dr. Rania Abdel-Aziz",
    approvedAt: dateStr(2025, 4, 1),
  },
  {
    id: "spec-6",
    materialName: "Magnesium Stearate",
    materialCode: "RM-EXC-003",
    materialType: "excipient",
    pharmacopoeiaRef: "USP",
    version: "1.0",
    effectiveDate: dateStr(2025, 5, 1),
    tests: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White, light, greasy powder" },
      { testName: "Identification (IR)", method: "USP <197K>", acceptanceCriteria: "Concordant with reference" },
      { testName: "Assay (MgO)", method: "USP", acceptanceCriteria: "4.0 - 5.0%", unit: "%" },
      { testName: "Loss on Drying", method: "105°C, 2h", acceptanceCriteria: "NMT 6.0%", unit: "%" },
      { testName: "Specific Surface Area", method: "BET", acceptanceCriteria: "4.0 - 12.0 m²/g", unit: "m²/g" },
      { testName: "Microbial Limits", method: "USP <61>", acceptanceCriteria: "TAMC NMT 1000 CFU/g" },
    ],
    approvedBy: "Dr. Rania Abdel-Aziz",
    approvedAt: dateStr(2025, 5, 1),
  },
  {
    id: "spec-7",
    materialName: "HPMC (Hypromellose) 2910 5cP",
    materialCode: "RM-EXC-004",
    materialType: "excipient",
    pharmacopoeiaRef: "EP",
    version: "1.0",
    effectiveDate: dateStr(2025, 3, 1),
    tests: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White or slightly yellowish powder or granules" },
      { testName: "Identification", method: "EP", acceptanceCriteria: "Complies with EP monograph" },
      { testName: "Viscosity", method: "Brookfield (2% solution)", acceptanceCriteria: "4.0 - 6.0 mPa·s", unit: "mPa·s" },
      { testName: "Loss on Drying", method: "105°C, 2h", acceptanceCriteria: "NMT 5.0%", unit: "%" },
      { testName: "pH (2% solution)", method: "EP 2.2.3", acceptanceCriteria: "5.0 - 8.0" },
      { testName: "Heavy Metals", method: "ICP-MS", acceptanceCriteria: "NMT 10 ppm", unit: "ppm" },
    ],
    approvedBy: "Dr. Ahmed Hassan",
    approvedAt: dateStr(2025, 3, 1),
  },
  // Packaging
  {
    id: "spec-8",
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
      { testName: "Thermoformability", method: "In-house TF-001", acceptanceCriteria: "Pocket depth ≥10mm without thinning >20%" },
    ],
    approvedBy: "Dr. Ahmed Hassan",
    approvedAt: dateStr(2025, 5, 1),
  },
  {
    id: "spec-9",
    materialName: "Aluminum Blister Foil (Hard Temper)",
    materialCode: "PM-PKG-002",
    materialType: "packaging",
    pharmacopoeiaRef: "in-house",
    version: "1.0",
    effectiveDate: dateStr(2025, 5, 1),
    tests: [
      { testName: "Thickness", method: "Micrometer", acceptanceCriteria: "20 ± 2 µm", unit: "µm" },
      { testName: "Tensile Strength", method: "ASTM D882", acceptanceCriteria: "NLT 50 N/mm²", unit: "N/mm²" },
      { testName: "Heat Seal Strength", method: "In-house HS-001", acceptanceCriteria: "1.5 - 3.0 N/15mm", unit: "N/15mm" },
      { testName: "Print Quality", method: "Visual + Colorimeter", acceptanceCriteria: "Delta E ≤ 2.0 vs approved proof" },
      { testName: "Pinholes", method: "Light Box", acceptanceCriteria: "Zero pinholes per m²" },
    ],
    approvedBy: "Dr. Ahmed Hassan",
    approvedAt: dateStr(2025, 5, 1),
  },
  {
    id: "spec-10",
    materialName: "Opadry II White (Film Coating)",
    materialCode: "RM-EXC-005",
    materialType: "excipient",
    pharmacopoeiaRef: "in-house",
    version: "1.0",
    effectiveDate: dateStr(2025, 6, 1),
    tests: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White to off-white powder" },
      { testName: "Identification (IR)", method: "In-house IR-005", acceptanceCriteria: "Concordant with reference spectrum" },
      { testName: "Loss on Drying", method: "105°C, 2h", acceptanceCriteria: "NMT 5.0%", unit: "%" },
      { testName: "Viscosity (15% dispersion)", method: "Brookfield", acceptanceCriteria: "150 - 400 mPa·s", unit: "mPa·s" },
      { testName: "Particle Size (d90)", method: "Laser Diffraction", acceptanceCriteria: "NMT 200 µm", unit: "µm" },
    ],
    approvedBy: "Dr. Ahmed Hassan",
    approvedAt: dateStr(2025, 6, 1),
  },
  {
    id: "spec-11",
    materialName: "HDPE Bottles (100mL)",
    materialCode: "PM-PKG-003",
    materialType: "packaging",
    pharmacopoeiaRef: "in-house",
    version: "1.0",
    effectiveDate: dateStr(2025, 7, 1),
    tests: [
      { testName: "Capacity", method: "Gravimetric", acceptanceCriteria: "100 ± 3 mL", unit: "mL" },
      { testName: "Weight", method: "Balance", acceptanceCriteria: "12.0 ± 1.0 g", unit: "g" },
      { testName: "Leak Test", method: "Vacuum", acceptanceCriteria: "No leakage at -30 kPa for 30 sec" },
      { testName: "Color", method: "Visual", acceptanceCriteria: "White, opaque, uniform" },
      { testName: "Migration Test", method: "USP <661>", acceptanceCriteria: "Meets USP limits for extractables" },
    ],
    approvedBy: "Eng. Mohamed Sherif",
    approvedAt: dateStr(2025, 7, 1),
  },
  {
    id: "spec-12",
    materialName: "Kollidon VA 64",
    materialCode: "RM-EXC-006",
    materialType: "excipient",
    pharmacopoeiaRef: "EP",
    version: "1.0",
    effectiveDate: dateStr(2025, 3, 1),
    tests: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White to slightly yellowish powder" },
      { testName: "Identification (IR)", method: "EP", acceptanceCriteria: "Concordant with reference" },
      { testName: "K-Value", method: "EP", acceptanceCriteria: "25.2 - 30.8" },
      { testName: "Loss on Drying", method: "105°C, 2h", acceptanceCriteria: "NMT 5.0%", unit: "%" },
      { testName: "Vinyl Acetate Monomer", method: "GC", acceptanceCriteria: "NMT 100 ppm", unit: "ppm" },
    ],
    approvedBy: "Dr. Rania Abdel-Aziz",
    approvedAt: dateStr(2025, 3, 1),
  },
  {
    id: "spec-13",
    materialName: "Croscarmellose Sodium",
    materialCode: "RM-EXC-007",
    materialType: "excipient",
    pharmacopoeiaRef: "USP",
    version: "1.0",
    effectiveDate: dateStr(2025, 4, 1),
    tests: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White to slightly grayish powder" },
      { testName: "Identification", method: "USP", acceptanceCriteria: "Complies" },
      { testName: "Loss on Drying", method: "105°C, 2h", acceptanceCriteria: "NMT 10.0%", unit: "%" },
      { testName: "Settling Volume", method: "USP", acceptanceCriteria: "10.0 - 30.0 mL", unit: "mL" },
      { testName: "Water-Soluble Substances", method: "USP", acceptanceCriteria: "NMT 10.0%", unit: "%" },
    ],
    approvedBy: "Dr. Rania Abdel-Aziz",
    approvedAt: dateStr(2025, 4, 1),
  },
  {
    id: "spec-14",
    materialName: "Starch 1500 (Pregelatinized Starch)",
    materialCode: "RM-EXC-008",
    materialType: "excipient",
    pharmacopoeiaRef: "USP",
    version: "1.0",
    effectiveDate: dateStr(2025, 5, 1),
    tests: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White to off-white powder" },
      { testName: "Identification", method: "USP", acceptanceCriteria: "Complies" },
      { testName: "Loss on Drying", method: "120°C, 4h", acceptanceCriteria: "NMT 14.0%", unit: "%" },
      { testName: "pH", method: "USP <791>", acceptanceCriteria: "4.5 - 7.0" },
      { testName: "Microbial Limits", method: "USP <61>", acceptanceCriteria: "TAMC NMT 1000 CFU/g" },
    ],
    approvedBy: "Dr. Rania Abdel-Aziz",
    approvedAt: dateStr(2025, 5, 1),
  },
  {
    id: "spec-15",
    materialName: "PP Caps (Child-Resistant, 28mm)",
    materialCode: "PM-PKG-004",
    materialType: "packaging",
    pharmacopoeiaRef: "in-house",
    version: "1.0",
    effectiveDate: dateStr(2025, 7, 1),
    tests: [
      { testName: "Dimension (Outer Diameter)", method: "Caliper", acceptanceCriteria: "28.0 ± 0.3 mm", unit: "mm" },
      { testName: "Torque (Application)", method: "Torque Meter", acceptanceCriteria: "1.2 - 2.0 N·m", unit: "N·m" },
      { testName: "Child-Resistance", method: "16 CFR 1700.20", acceptanceCriteria: "85% child-resistant, 90% senior-friendly" },
      { testName: "Color", method: "Visual", acceptanceCriteria: "White, matches approved sample" },
    ],
    approvedBy: "Eng. Mohamed Sherif",
    approvedAt: dateStr(2025, 7, 1),
  },
];

/* ─── Seed: Certificates of Analysis (20) ─── */

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
      { testName: "Identification (IR)", method: "EP 2.2.24", acceptanceCriteria: "Concordant with reference spectrum", result: "Concordant", pass: true },
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
    materialName: "Amoxicillin Trihydrate",
    materialCode: "RM-API-001",
    batchNumber: "AMX-2026-B002",
    supplierName: "Aurobindo Pharma Ltd",
    supplierBatchNumber: "AUR-AMX-24502",
    manufacturingDate: daysAgo(30),
    expiryDate: futureDays(700),
    testsPerformed: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White to almost white crystalline powder", result: "White crystalline powder", pass: true },
      { testName: "Identification (IR)", method: "EP 2.2.24", acceptanceCriteria: "Concordant with reference spectrum", result: "Concordant", pass: true },
      { testName: "Assay (HPLC)", method: "EP 2.2.29", acceptanceCriteria: "95.0 - 102.0% (anhydrous basis)", result: "97.2%", unit: "%", pass: true },
      { testName: "Water Content", method: "Karl Fischer", acceptanceCriteria: "11.5 - 14.5%", result: "13.1%", unit: "%", pass: true },
      { testName: "Related Substances", method: "HPLC", acceptanceCriteria: "Total impurities NMT 2.0%", result: "0.52%", unit: "%", pass: true },
    ],
    complianceStatus: "compliant",
    receivedDate: daysAgo(15),
    reviewedBy: "Dr. Rania Abdel-Aziz",
    reviewedAt: daysAgo(13),
    reviewNotes: "Compliant. Released for production.",
    specificationId: "spec-1",
    hasDeviations: false,
  },
  {
    id: "coa-3",
    coaNumber: "COA-2026-003",
    materialName: "Omeprazole Pellets",
    materialCode: "RM-API-002",
    batchNumber: "OMP-2026-B001",
    supplierName: "Cipla Ltd",
    supplierBatchNumber: "CIP-OMP-6201",
    manufacturingDate: daysAgo(60),
    expiryDate: futureDays(670),
    testsPerformed: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White to off-white spherical pellets", result: "White spherical pellets", pass: true },
      { testName: "Identification (HPLC)", method: "USP <621>", acceptanceCriteria: "RT matches reference standard", result: "RT 8.2 min (Ref 8.1 min)", pass: true },
      { testName: "Assay (HPLC)", method: "USP <621>", acceptanceCriteria: "98.0 - 102.0%", result: "99.4%", unit: "%", pass: true },
      { testName: "Related Substances", method: "HPLC", acceptanceCriteria: "Total impurities NMT 1.0%", result: "0.32%", unit: "%", pass: true },
      { testName: "Loss on Drying", method: "USP <731>", acceptanceCriteria: "NMT 0.5%", result: "0.3%", unit: "%", pass: true },
    ],
    complianceStatus: "compliant",
    receivedDate: daysAgo(45),
    reviewedBy: "Dr. Rania Abdel-Aziz",
    reviewedAt: daysAgo(43),
    reviewNotes: "All results satisfactory.",
    specificationId: "spec-2",
    hasDeviations: false,
  },
  {
    id: "coa-4",
    coaNumber: "COA-2026-004",
    materialName: "Metformin HCl",
    materialCode: "RM-API-003",
    batchNumber: "MET-2026-B001",
    supplierName: "Aurobindo Pharma Ltd",
    supplierBatchNumber: "AUR-MET-31001",
    manufacturingDate: daysAgo(50),
    expiryDate: futureDays(680),
    testsPerformed: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White crystalline powder", result: "White crystalline powder", pass: true },
      { testName: "Assay (HPLC)", method: "BP", acceptanceCriteria: "98.5 - 101.0%", result: "99.8%", unit: "%", pass: true },
      { testName: "Related Substances", method: "HPLC", acceptanceCriteria: "Any single impurity NMT 0.1%, Total NMT 0.5%", result: "Max single 0.04%, Total 0.12%", unit: "%", pass: true },
      { testName: "Loss on Drying", method: "105°C, 2h", acceptanceCriteria: "NMT 0.5%", result: "0.2%", unit: "%", pass: true },
      { testName: "Nitrosamine (NDMA)", method: "LC-MS/MS", acceptanceCriteria: "NMT 96 ng/day", result: "< LOQ (8 ng/day)", unit: "ng/day", pass: true },
    ],
    complianceStatus: "compliant",
    receivedDate: daysAgo(35),
    reviewedBy: "Dr. Rania Abdel-Aziz",
    reviewedAt: daysAgo(33),
    reviewNotes: "NDMA well below limit. Approved.",
    specificationId: "spec-3",
    hasDeviations: false,
  },
  {
    id: "coa-5",
    coaNumber: "COA-2026-005",
    materialName: "Metformin HCl",
    materialCode: "RM-API-003",
    batchNumber: "MET-2026-B002",
    supplierName: "Zhejiang Hisun Pharmaceutical",
    supplierBatchNumber: "ZHJ-MET-8801",
    manufacturingDate: daysAgo(25),
    expiryDate: futureDays(705),
    testsPerformed: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White crystalline powder", result: "White crystalline powder", pass: true },
      { testName: "Assay (HPLC)", method: "BP", acceptanceCriteria: "98.5 - 101.0%", result: "99.1%", unit: "%", pass: true },
      { testName: "Related Substances", method: "HPLC", acceptanceCriteria: "Any single impurity NMT 0.1%, Total NMT 0.5%", result: "Max single 0.06%, Total 0.18%", unit: "%", pass: true },
      { testName: "Loss on Drying", method: "105°C, 2h", acceptanceCriteria: "NMT 0.5%", result: "0.3%", unit: "%", pass: true },
      { testName: "Nitrosamine (NDMA)", method: "LC-MS/MS", acceptanceCriteria: "NMT 96 ng/day", result: "15 ng/day", unit: "ng/day", pass: true },
    ],
    complianceStatus: "compliant",
    receivedDate: daysAgo(10),
    reviewedBy: "Dr. Rania Abdel-Aziz",
    reviewedAt: daysAgo(8),
    reviewNotes: "Compliant. Second source qualified.",
    specificationId: "spec-3",
    hasDeviations: false,
  },
  {
    id: "coa-6",
    coaNumber: "COA-2026-006",
    materialName: "Microcrystalline Cellulose (MCC) PH-102",
    materialCode: "RM-EXC-001",
    batchNumber: "MCC-2026-B001",
    supplierName: "Roquette Pharma",
    supplierBatchNumber: "ROQ-MCC-7701",
    manufacturingDate: daysAgo(40),
    expiryDate: futureDays(690),
    testsPerformed: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White or almost white, fine or granular powder", result: "White granular powder", pass: true },
      { testName: "Loss on Drying", method: "105°C, 3h", acceptanceCriteria: "NMT 7.0%", result: "4.2%", unit: "%", pass: true },
      { testName: "Bulk Density", method: "EP 2.9.34", acceptanceCriteria: "0.28 - 0.35 g/mL", result: "0.31 g/mL", unit: "g/mL", pass: true },
      { testName: "Particle Size (d50)", method: "Laser Diffraction", acceptanceCriteria: "90 - 130 µm", result: "112 µm", unit: "µm", pass: true },
    ],
    complianceStatus: "compliant",
    receivedDate: daysAgo(25),
    reviewedBy: "Dr. Rania Abdel-Aziz",
    reviewedAt: daysAgo(23),
    reviewNotes: "All parameters within specification.",
    specificationId: "spec-4",
    hasDeviations: false,
  },
  {
    id: "coa-7",
    coaNumber: "COA-2026-007",
    materialName: "Lactose Monohydrate (FlowLac 100)",
    materialCode: "RM-EXC-002",
    batchNumber: "LAC-2026-B001",
    supplierName: "Roquette Pharma",
    supplierBatchNumber: "ROQ-LAC-5501",
    manufacturingDate: daysAgo(35),
    expiryDate: futureDays(695),
    testsPerformed: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White or almost white crystalline powder", result: "White crystalline powder", pass: true },
      { testName: "Loss on Drying", method: "80°C, 2h", acceptanceCriteria: "NMT 0.5%", result: "0.3%", unit: "%", pass: true },
      { testName: "Assay", method: "EP", acceptanceCriteria: "98.0 - 102.0% (as anhydrous lactose)", result: "99.6%", unit: "%", pass: true },
      { testName: "Protein Residue", method: "BCA Assay", acceptanceCriteria: "NMT 200 ppm", result: "45 ppm", unit: "ppm", pass: true },
    ],
    complianceStatus: "compliant",
    receivedDate: daysAgo(20),
    reviewedBy: "Dr. Rania Abdel-Aziz",
    reviewedAt: daysAgo(18),
    reviewNotes: "Compliant batch released.",
    specificationId: "spec-5",
    hasDeviations: false,
  },
  {
    id: "coa-8",
    coaNumber: "COA-2026-008",
    materialName: "Magnesium Stearate",
    materialCode: "RM-EXC-003",
    batchNumber: "MGS-2026-B001",
    supplierName: "Roquette Pharma",
    supplierBatchNumber: "ROQ-MGS-2201",
    manufacturingDate: daysAgo(55),
    expiryDate: futureDays(675),
    testsPerformed: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White, light, greasy powder", result: "White, light, greasy powder", pass: true },
      { testName: "Assay (MgO)", method: "USP", acceptanceCriteria: "4.0 - 5.0%", result: "4.6%", unit: "%", pass: true },
      { testName: "Loss on Drying", method: "105°C, 2h", acceptanceCriteria: "NMT 6.0%", result: "3.8%", unit: "%", pass: true },
      { testName: "Specific Surface Area", method: "BET", acceptanceCriteria: "4.0 - 12.0 m²/g", result: "8.2 m²/g", unit: "m²/g", pass: true },
    ],
    complianceStatus: "compliant",
    receivedDate: daysAgo(40),
    reviewedBy: "Dr. Rania Abdel-Aziz",
    reviewedAt: daysAgo(38),
    reviewNotes: "SSA within range. Approved.",
    specificationId: "spec-6",
    hasDeviations: false,
  },
  {
    id: "coa-9",
    coaNumber: "COA-2026-009",
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
      { testName: "pH (2% solution)", method: "EP 2.2.3", acceptanceCriteria: "5.0 - 8.0", result: "6.4", pass: true },
    ],
    complianceStatus: "compliant",
    receivedDate: daysAgo(28),
    reviewedBy: "Dr. Ahmed Hassan",
    reviewedAt: daysAgo(26),
    reviewNotes: "Viscosity and pH within range.",
    specificationId: "spec-7",
    hasDeviations: false,
  },
  {
    id: "coa-10",
    coaNumber: "COA-2026-010",
    materialName: "PVC/PVDC Blister Film (250/40)",
    materialCode: "PM-PKG-001",
    batchNumber: "PVC-2026-B001",
    supplierName: "Amcor Flexibles",
    supplierBatchNumber: "AMC-PVC-9901",
    manufacturingDate: daysAgo(38),
    expiryDate: futureDays(692),
    testsPerformed: [
      { testName: "Thickness (PVC)", method: "Micrometer", acceptanceCriteria: "250 ± 10 µm", result: "248 µm", unit: "µm", pass: true },
      { testName: "Thickness (PVDC Coating)", method: "Micrometer", acceptanceCriteria: "40 ± 5 µm", result: "41 µm", unit: "µm", pass: true },
      { testName: "MVTR", method: "ASTM E96", acceptanceCriteria: "NMT 0.25 g/m²/day", result: "0.18 g/m²/day", unit: "g/m²/day", pass: true },
      { testName: "Visual Inspection", method: "Visual", acceptanceCriteria: "Clear, no defects, uniform coating", result: "Complies", pass: true },
    ],
    complianceStatus: "compliant",
    receivedDate: daysAgo(22),
    reviewedBy: "Dr. Ahmed Hassan",
    reviewedAt: daysAgo(20),
    reviewNotes: "MVTR well within limit.",
    specificationId: "spec-8",
    hasDeviations: false,
  },
  {
    id: "coa-11",
    coaNumber: "COA-2026-011",
    materialName: "Aluminum Blister Foil (Hard Temper)",
    materialCode: "PM-PKG-002",
    batchNumber: "ALU-2026-B001",
    supplierName: "Amcor Flexibles",
    supplierBatchNumber: "AMC-ALU-8801",
    manufacturingDate: daysAgo(36),
    expiryDate: futureDays(694),
    testsPerformed: [
      { testName: "Thickness", method: "Micrometer", acceptanceCriteria: "20 ± 2 µm", result: "20.3 µm", unit: "µm", pass: true },
      { testName: "Tensile Strength", method: "ASTM D882", acceptanceCriteria: "NLT 50 N/mm²", result: "62 N/mm²", unit: "N/mm²", pass: true },
      { testName: "Heat Seal Strength", method: "In-house HS-001", acceptanceCriteria: "1.5 - 3.0 N/15mm", result: "2.1 N/15mm", unit: "N/15mm", pass: true },
      { testName: "Pinholes", method: "Light Box", acceptanceCriteria: "Zero pinholes per m²", result: "0 pinholes/m²", pass: true },
    ],
    complianceStatus: "compliant",
    receivedDate: daysAgo(21),
    reviewedBy: "Dr. Ahmed Hassan",
    reviewedAt: daysAgo(19),
    reviewNotes: "No pinholes detected. Approved.",
    specificationId: "spec-9",
    hasDeviations: false,
  },
  {
    id: "coa-12",
    coaNumber: "COA-2026-012",
    materialName: "Metformin HCl",
    materialCode: "RM-API-003",
    batchNumber: "MET-2026-B003",
    supplierName: "Zhejiang Hisun Pharmaceutical",
    supplierBatchNumber: "ZHJ-MET-8802",
    manufacturingDate: daysAgo(15),
    expiryDate: futureDays(715),
    testsPerformed: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White crystalline powder", result: "White crystalline powder", pass: true },
      { testName: "Assay (HPLC)", method: "BP", acceptanceCriteria: "98.5 - 101.0%", result: "98.2%", unit: "%", pass: false },
      { testName: "Related Substances", method: "HPLC", acceptanceCriteria: "Any single impurity NMT 0.1%, Total NMT 0.5%", result: "Max single 0.08%, Total 0.22%", unit: "%", pass: true },
      { testName: "Loss on Drying", method: "105°C, 2h", acceptanceCriteria: "NMT 0.5%", result: "0.4%", unit: "%", pass: true },
      { testName: "Nitrosamine (NDMA)", method: "LC-MS/MS", acceptanceCriteria: "NMT 96 ng/day", result: "22 ng/day", unit: "ng/day", pass: true },
    ],
    complianceStatus: "non-compliant",
    receivedDate: daysAgo(5),
    reviewedBy: "Dr. Rania Abdel-Aziz",
    reviewedAt: daysAgo(3),
    reviewNotes: "Assay result 98.2% is below lower limit of 98.5%. OOS investigation initiated. Batch rejected.",
    specificationId: "spec-3",
    hasDeviations: true,
  },
  {
    id: "coa-13",
    coaNumber: "COA-2026-013",
    materialName: "Amoxicillin Trihydrate",
    materialCode: "RM-API-001",
    batchNumber: "AMX-2026-B003",
    supplierName: "Aurobindo Pharma Ltd",
    supplierBatchNumber: "AUR-AMX-24503",
    manufacturingDate: daysAgo(10),
    expiryDate: futureDays(720),
    testsPerformed: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White to almost white crystalline powder", result: "White crystalline powder", pass: true },
      { testName: "Identification (IR)", method: "EP 2.2.24", acceptanceCriteria: "Concordant with reference spectrum", result: "Concordant", pass: true },
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
  {
    id: "coa-14",
    coaNumber: "COA-2026-014",
    materialName: "Omeprazole Pellets",
    materialCode: "RM-API-002",
    batchNumber: "OMP-2026-B002",
    supplierName: "Cipla Ltd",
    supplierBatchNumber: "CIP-OMP-6202",
    manufacturingDate: daysAgo(12),
    expiryDate: futureDays(718),
    testsPerformed: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White to off-white spherical pellets", result: "Off-white spherical pellets", pass: true },
      { testName: "Assay (HPLC)", method: "USP <621>", acceptanceCriteria: "98.0 - 102.0%", result: "100.2%", unit: "%", pass: true },
      { testName: "Related Substances", method: "HPLC", acceptanceCriteria: "Total impurities NMT 1.0%", result: "0.28%", unit: "%", pass: true },
      { testName: "Loss on Drying", method: "USP <731>", acceptanceCriteria: "NMT 0.5%", result: "0.2%", unit: "%", pass: true },
      { testName: "Particle Size", method: "Sieve Analysis", acceptanceCriteria: "90% between 300-700 µm", result: "94% between 300-700 µm", unit: "µm", pass: true },
    ],
    complianceStatus: "pending-review",
    receivedDate: daysAgo(4),
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    specificationId: "spec-2",
    hasDeviations: false,
  },
  {
    id: "coa-15",
    coaNumber: "COA-2026-015",
    materialName: "Microcrystalline Cellulose (MCC) PH-102",
    materialCode: "RM-EXC-001",
    batchNumber: "MCC-2026-B002",
    supplierName: "Roquette Pharma",
    supplierBatchNumber: "ROQ-MCC-7702",
    manufacturingDate: daysAgo(18),
    expiryDate: futureDays(712),
    testsPerformed: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White or almost white, fine or granular powder", result: "White granular powder", pass: true },
      { testName: "Loss on Drying", method: "105°C, 3h", acceptanceCriteria: "NMT 7.0%", result: "3.8%", unit: "%", pass: true },
      { testName: "Bulk Density", method: "EP 2.9.34", acceptanceCriteria: "0.28 - 0.35 g/mL", result: "0.30 g/mL", unit: "g/mL", pass: true },
      { testName: "Particle Size (d50)", method: "Laser Diffraction", acceptanceCriteria: "90 - 130 µm", result: "108 µm", unit: "µm", pass: true },
    ],
    complianceStatus: "pending-review",
    receivedDate: daysAgo(6),
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    specificationId: "spec-4",
    hasDeviations: false,
  },
  {
    id: "coa-16",
    coaNumber: "COA-2026-016",
    materialName: "HDPE Bottles (100mL)",
    materialCode: "PM-PKG-003",
    batchNumber: "HDPE-2026-B001",
    supplierName: "Pharma Packaging Industries (PPI)",
    supplierBatchNumber: "PPI-HDPE-3301",
    manufacturingDate: daysAgo(20),
    expiryDate: futureDays(710),
    testsPerformed: [
      { testName: "Capacity", method: "Gravimetric", acceptanceCriteria: "100 ± 3 mL", result: "100.5 mL", unit: "mL", pass: true },
      { testName: "Weight", method: "Balance", acceptanceCriteria: "12.0 ± 1.0 g", result: "12.3 g", unit: "g", pass: true },
      { testName: "Leak Test", method: "Vacuum", acceptanceCriteria: "No leakage at -30 kPa for 30 sec", result: "No leakage", pass: true },
      { testName: "Color", method: "Visual", acceptanceCriteria: "White, opaque, uniform", result: "Complies", pass: true },
    ],
    complianceStatus: "pending-review",
    receivedDate: daysAgo(7),
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    specificationId: "spec-11",
    hasDeviations: false,
  },
  {
    id: "coa-17",
    coaNumber: "COA-2026-017",
    materialName: "Opadry II White (Film Coating)",
    materialCode: "RM-EXC-005",
    batchNumber: "OPD-2026-B001",
    supplierName: "Colorcon Inc.",
    supplierBatchNumber: "COL-OPD-1101",
    manufacturingDate: daysAgo(22),
    expiryDate: futureDays(708),
    testsPerformed: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White to off-white powder", result: "White powder", pass: true },
      { testName: "Identification (IR)", method: "In-house IR-005", acceptanceCriteria: "Concordant with reference spectrum", result: "Concordant", pass: true },
      { testName: "Loss on Drying", method: "105°C, 2h", acceptanceCriteria: "NMT 5.0%", result: "2.4%", unit: "%", pass: true },
      { testName: "Viscosity (15% dispersion)", method: "Brookfield", acceptanceCriteria: "150 - 400 mPa·s", result: "280 mPa·s", unit: "mPa·s", pass: true },
    ],
    complianceStatus: "compliant",
    receivedDate: daysAgo(9),
    reviewedBy: "Dr. Ahmed Hassan",
    reviewedAt: daysAgo(7),
    reviewNotes: "Coating material approved.",
    specificationId: "spec-10",
    hasDeviations: false,
  },
  {
    id: "coa-18",
    coaNumber: "COA-2026-018",
    materialName: "PVC/PVDC Blister Film (250/40)",
    materialCode: "PM-PKG-001",
    batchNumber: "PVC-2026-B002",
    supplierName: "Amcor Flexibles",
    supplierBatchNumber: "AMC-PVC-9902",
    manufacturingDate: daysAgo(14),
    expiryDate: futureDays(716),
    testsPerformed: [
      { testName: "Thickness (PVC)", method: "Micrometer", acceptanceCriteria: "250 ± 10 µm", result: "252 µm", unit: "µm", pass: true },
      { testName: "Thickness (PVDC Coating)", method: "Micrometer", acceptanceCriteria: "40 ± 5 µm", result: "38 µm", unit: "µm", pass: true },
      { testName: "MVTR", method: "ASTM E96", acceptanceCriteria: "NMT 0.25 g/m²/day", result: "0.29 g/m²/day", unit: "g/m²/day", pass: false },
      { testName: "Visual Inspection", method: "Visual", acceptanceCriteria: "Clear, no defects, uniform coating", result: "Complies", pass: true },
    ],
    complianceStatus: "non-compliant",
    receivedDate: daysAgo(4),
    reviewedBy: "Dr. Ahmed Hassan",
    reviewedAt: daysAgo(2),
    reviewNotes: "MVTR exceeds limit (0.29 vs 0.25 max). Deviation raised. Batch on hold pending supplier investigation.",
    specificationId: "spec-8",
    hasDeviations: true,
  },
  {
    id: "coa-19",
    coaNumber: "COA-2026-019",
    materialName: "Kollidon VA 64",
    materialCode: "RM-EXC-006",
    batchNumber: "KVA-2026-B001",
    supplierName: "BASF Pharma Solutions",
    supplierBatchNumber: "BASF-KVA-2201",
    manufacturingDate: daysAgo(28),
    expiryDate: futureDays(702),
    testsPerformed: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White to slightly yellowish powder", result: "White powder", pass: true },
      { testName: "K-Value", method: "EP", acceptanceCriteria: "25.2 - 30.8", result: "27.8", pass: true },
      { testName: "Loss on Drying", method: "105°C, 2h", acceptanceCriteria: "NMT 5.0%", result: "2.1%", unit: "%", pass: true },
      { testName: "Vinyl Acetate Monomer", method: "GC", acceptanceCriteria: "NMT 100 ppm", result: "12 ppm", unit: "ppm", pass: true },
    ],
    complianceStatus: "compliant",
    receivedDate: daysAgo(14),
    reviewedBy: "Dr. Rania Abdel-Aziz",
    reviewedAt: daysAgo(12),
    reviewNotes: "K-value and residual monomer within limits.",
    specificationId: "spec-12",
    hasDeviations: false,
  },
  {
    id: "coa-20",
    coaNumber: "COA-2026-020",
    materialName: "Lactose Monohydrate (FlowLac 100)",
    materialCode: "RM-EXC-002",
    batchNumber: "LAC-2026-B002",
    supplierName: "Roquette Pharma",
    supplierBatchNumber: "ROQ-LAC-5502",
    manufacturingDate: daysAgo(8),
    expiryDate: futureDays(722),
    testsPerformed: [
      { testName: "Appearance", method: "Visual", acceptanceCriteria: "White or almost white crystalline powder", result: "White crystalline powder", pass: true },
      { testName: "Loss on Drying", method: "80°C, 2h", acceptanceCriteria: "NMT 0.5%", result: "0.2%", unit: "%", pass: true },
      { testName: "Assay", method: "EP", acceptanceCriteria: "98.0 - 102.0% (as anhydrous lactose)", result: "100.1%", unit: "%", pass: true },
      { testName: "Protein Residue", method: "BCA Assay", acceptanceCriteria: "NMT 200 ppm", result: "38 ppm", unit: "ppm", pass: true },
    ],
    complianceStatus: "pending-review",
    receivedDate: daysAgo(2),
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    specificationId: "spec-5",
    hasDeviations: false,
  },
];

/* ─── Seed: Approved Supplier List (12) ─── */

const SEED_APPROVED_SUPPLIERS: ApprovedSupplierEntry[] = [
  {
    id: "asl-1",
    supplierName: "Aurobindo Pharma Ltd",
    supplierCode: "SUP-API-001",
    country: "India",
    materialsApprovedFor: ["Amoxicillin Trihydrate", "Metformin HCl"],
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
    supplierName: "Cipla Ltd",
    supplierCode: "SUP-API-002",
    country: "India",
    materialsApprovedFor: ["Omeprazole Pellets"],
    materialTypes: ["api"],
    qualificationDate: dateStr(2025, 1, 10),
    nextAuditDue: futureDays(120),
    lastAuditDate: daysAgo(245),
    status: "approved",
    gmpCertificate: "GMP-IND-2024-2201",
    qualityAgreementId: "sqa-2",
    rating: 5,
    notes: "Excellent pellet quality and consistency.",
  },
  {
    id: "asl-3",
    supplierName: "Zhejiang Hisun Pharmaceutical",
    supplierCode: "SUP-API-003",
    country: "China",
    materialsApprovedFor: ["Metformin HCl"],
    materialTypes: ["api"],
    qualificationDate: dateStr(2025, 4, 1),
    nextAuditDue: futureDays(90),
    lastAuditDate: daysAgo(210),
    status: "conditional",
    gmpCertificate: "GMP-CHN-2024-0891",
    qualityAgreementId: "sqa-3",
    rating: 3,
    notes: "Conditional approval. Recent OOS batch under investigation. Next audit will determine continued status.",
  },
  {
    id: "asl-4",
    supplierName: "BASF Pharma Solutions",
    supplierCode: "SUP-EXC-001",
    country: "Germany",
    materialsApprovedFor: ["HPMC (Hypromellose)", "Kollidon VA 64"],
    materialTypes: ["excipient"],
    qualificationDate: dateStr(2024, 8, 1),
    nextAuditDue: futureDays(180),
    lastAuditDate: daysAgo(185),
    status: "approved",
    gmpCertificate: "GMP-EU-2024-DE-5543",
    qualityAgreementId: "sqa-4",
    rating: 5,
    notes: "Premium excipient supplier. ISO 22716 and IPEC-PQG certified.",
  },
  {
    id: "asl-5",
    supplierName: "Roquette Pharma",
    supplierCode: "SUP-EXC-002",
    country: "France",
    materialsApprovedFor: ["Microcrystalline Cellulose (MCC)", "Lactose Monohydrate", "Magnesium Stearate"],
    materialTypes: ["excipient"],
    qualificationDate: dateStr(2024, 10, 1),
    nextAuditDue: futureDays(150),
    lastAuditDate: daysAgo(215),
    status: "approved",
    gmpCertificate: "GMP-EU-2024-FR-3301",
    qualityAgreementId: "sqa-5",
    rating: 4,
    notes: "Broad excipient portfolio. Good supply reliability.",
  },
  {
    id: "asl-6",
    supplierName: "Amcor Flexibles",
    supplierCode: "SUP-PKG-001",
    country: "Australia",
    materialsApprovedFor: ["PVC/PVDC Blister Film", "Aluminum Blister Foil"],
    materialTypes: ["packaging"],
    qualificationDate: dateStr(2025, 3, 1),
    nextAuditDue: futureDays(200),
    lastAuditDate: daysAgo(130),
    status: "approved",
    gmpCertificate: "ISO-15378-AMC-2024",
    qualityAgreementId: "sqa-6",
    rating: 4,
    notes: "Global packaging leader. Recent MVTR issue on one batch under review.",
  },
  {
    id: "asl-7",
    supplierName: "Pharma Packaging Industries (PPI)",
    supplierCode: "SUP-PKG-002",
    country: "Egypt",
    materialsApprovedFor: ["HDPE Bottles", "PP Caps", "Printed Cartons"],
    materialTypes: ["packaging"],
    qualificationDate: dateStr(2025, 5, 1),
    nextAuditDue: futureDays(45),
    lastAuditDate: daysAgo(320),
    status: "approved",
    gmpCertificate: "EDA-GMP-PKG-2024-0556",
    qualityAgreementId: "sqa-7",
    rating: 3,
    notes: "Local packaging supplier. Audit due soon.",
  },
  {
    id: "asl-8",
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
    qualityAgreementId: "sqa-8",
    rating: 2,
    notes: "Quality agreement expired. Supplier suspended until SQA renewal and re-audit completed.",
  },
  {
    id: "asl-9",
    supplierName: "DFE Pharma",
    supplierCode: "SUP-EXC-003",
    country: "Netherlands",
    materialsApprovedFor: ["Lactose Monohydrate", "Starch 1500"],
    materialTypes: ["excipient"],
    qualificationDate: dateStr(2025, 11, 1),
    nextAuditDue: futureDays(400),
    lastAuditDate: daysAgo(60),
    status: "approved",
    gmpCertificate: "GMP-EU-2025-NL-1102",
    qualityAgreementId: "sqa-9",
    rating: 4,
    notes: "New supplier qualification in progress. Audit completed successfully.",
  },
  {
    id: "asl-10",
    supplierName: "Colorcon Inc.",
    supplierCode: "SUP-EXC-004",
    country: "United States",
    materialsApprovedFor: ["Opadry II (Film Coating)", "Opadry AMB"],
    materialTypes: ["excipient"],
    qualificationDate: dateStr(2024, 4, 1),
    nextAuditDue: futureDays(30),
    lastAuditDate: daysAgo(335),
    status: "approved",
    gmpCertificate: "GMP-US-2024-FDA-8891",
    qualityAgreementId: "sqa-10",
    rating: 4,
    notes: "Specialized coating supplier. SQA under review for renewal.",
  },
  {
    id: "asl-11",
    supplierName: "Merck KGaA (MilliporeSigma)",
    supplierCode: "SUP-RAW-001",
    country: "Germany",
    materialsApprovedFor: ["HPLC-grade Solvents", "Reference Standards"],
    materialTypes: ["raw"],
    qualificationDate: dateStr(2024, 1, 1),
    nextAuditDue: futureDays(250),
    lastAuditDate: daysAgo(115),
    status: "approved",
    gmpCertificate: "ISO-17034-MRK-2024",
    qualityAgreementId: null,
    rating: 5,
    notes: "Primary supplier for QC reference standards and reagents.",
  },
  {
    id: "asl-12",
    supplierName: "JRS Pharma",
    supplierCode: "SUP-EXC-005",
    country: "Germany",
    materialsApprovedFor: ["Croscarmellose Sodium"],
    materialTypes: ["excipient"],
    qualificationDate: dateStr(2025, 2, 1),
    nextAuditDue: futureDays(220),
    lastAuditDate: daysAgo(95),
    status: "approved",
    gmpCertificate: "GMP-EU-2025-DE-2205",
    qualityAgreementId: null,
    rating: 4,
    notes: "Specialist superdisintegrant supplier.",
  },
];

/* ─── Seed: Material Qualifications (8) ─── */

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
    materialName: "Omeprazole Pellets",
    materialCode: "RM-API-002",
    supplierName: "Cipla Ltd",
    supplierCode: "SUP-API-002",
    qualificationTests: [
      { testName: "Full USP Monograph Testing", result: "All parameters pass", pass: true },
      { testName: "Acid Resistance Test", result: "< 10% release at 2h in acid", pass: true },
      { testName: "Pellet Size Distribution", result: "92% within 300-700 µm", pass: true },
    ],
    stabilityData: [
      { condition: "25°C/60% RH (Long-term)", duration: "18 months", result: "Assay 99.1%, stable" },
      { condition: "40°C/75% RH (Accelerated)", duration: "6 months", result: "Assay 97.8%, within limits" },
    ],
    regulatoryStatus: "approved",
    qualificationStatus: "qualified",
    qualifiedBy: "Dr. Rania Abdel-Aziz",
    qualifiedAt: dateStr(2025, 1, 10),
    notes: "Sole source for Omeprazole pellets. Excellent quality.",
  },
  {
    id: "mq-3",
    materialName: "Metformin HCl",
    materialCode: "RM-API-003",
    supplierName: "Aurobindo Pharma Ltd",
    supplierCode: "SUP-API-001",
    qualificationTests: [
      { testName: "Full BP Monograph Testing", result: "All parameters pass", pass: true },
      { testName: "Nitrosamine (NDMA) Testing", result: "< LOQ", pass: true },
      { testName: "Comparative Dissolution", result: "f2 = 88", pass: true },
    ],
    stabilityData: [
      { condition: "25°C/60% RH (Long-term)", duration: "24 months", result: "Assay 99.2%, stable" },
      { condition: "40°C/75% RH (Accelerated)", duration: "6 months", result: "Assay 98.5%, within limits" },
    ],
    regulatoryStatus: "approved",
    qualificationStatus: "qualified",
    qualifiedBy: "Dr. Rania Abdel-Aziz",
    qualifiedAt: dateStr(2024, 3, 1),
    notes: "Primary Metformin source. NDMA consistently below LOQ.",
  },
  {
    id: "mq-4",
    materialName: "Metformin HCl",
    materialCode: "RM-API-003",
    supplierName: "Zhejiang Hisun Pharmaceutical",
    supplierCode: "SUP-API-003",
    qualificationTests: [
      { testName: "Full BP Monograph Testing", result: "All parameters pass", pass: true },
      { testName: "Nitrosamine (NDMA) Testing", result: "15 ng/day", pass: true },
      { testName: "Comparative Dissolution", result: "f2 = 75", pass: true },
    ],
    stabilityData: [
      { condition: "25°C/60% RH (Long-term)", duration: "12 months", result: "Assay 98.9%, ongoing" },
      { condition: "40°C/75% RH (Accelerated)", duration: "6 months", result: "Assay 98.1%, within limits" },
    ],
    regulatoryStatus: "approved",
    qualificationStatus: "qualified",
    qualifiedBy: "Dr. Rania Abdel-Aziz",
    qualifiedAt: dateStr(2025, 4, 1),
    notes: "Secondary source. Recent OOS batch requires monitoring. Conditional supplier status.",
  },
  {
    id: "mq-5",
    materialName: "Microcrystalline Cellulose (MCC) PH-102",
    materialCode: "RM-EXC-001",
    supplierName: "Roquette Pharma",
    supplierCode: "SUP-EXC-002",
    qualificationTests: [
      { testName: "Full EP Monograph Testing", result: "All parameters pass", pass: true },
      { testName: "Compressibility Profile", result: "Comparable to reference grade", pass: true },
      { testName: "Flow Properties", result: "Carr Index 18%, Good flow", pass: true },
    ],
    stabilityData: [
      { condition: "25°C/60% RH (Long-term)", duration: "24 months", result: "No change in properties" },
    ],
    regulatoryStatus: "not-required",
    qualificationStatus: "qualified",
    qualifiedBy: "Dr. Ahmed Hassan",
    qualifiedAt: dateStr(2024, 10, 1),
    notes: "Well-established excipient. Consistent quality.",
  },
  {
    id: "mq-6",
    materialName: "PVC/PVDC Blister Film (250/40)",
    materialCode: "PM-PKG-001",
    supplierName: "Amcor Flexibles",
    supplierCode: "SUP-PKG-001",
    qualificationTests: [
      { testName: "MVTR Testing (3 lots)", result: "0.15, 0.18, 0.20 g/m²/day - all pass", pass: true },
      { testName: "Thermoformability Trial", result: "Satisfactory pocket formation", pass: true },
      { testName: "Seal Integrity", result: "All blisters pass leak test", pass: true },
    ],
    stabilityData: [
      { condition: "40°C/75% RH (Accelerated)", duration: "6 months", result: "Product stability maintained in new blisters" },
    ],
    regulatoryStatus: "filed",
    qualificationStatus: "qualified",
    qualifiedBy: "Dr. Ahmed Hassan",
    qualifiedAt: dateStr(2025, 3, 1),
    notes: "Qualified for all blister-packed products.",
  },
  {
    id: "mq-7",
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
  {
    id: "mq-8",
    materialName: "Lactose Monohydrate",
    materialCode: "RM-EXC-002",
    supplierName: "DFE Pharma",
    supplierCode: "SUP-EXC-003",
    qualificationTests: [
      { testName: "Full EP Monograph Testing", result: "Ongoing", pass: true },
      { testName: "Compactibility Study", result: "Pending", pass: false },
    ],
    stabilityData: [],
    regulatoryStatus: "pending",
    qualificationStatus: "in-progress",
    qualifiedBy: null,
    qualifiedAt: null,
    notes: "New supplier qualification in progress. Monograph testing started.",
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
