"use client";

import type {
  RiskAssessment,
  RiskStatus,
  RiskCategory,
  RiskMethod,
  RiskLevel,
  FMEAEntry,
  MitigationAction,
  MitigationStatus,
  RiskMetrics,
} from "./risk-types";

const STORAGE_KEY = "pharma.risk-assessments";

/* ───────── helpers ───────── */
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

export function calculateRPN(s: number, o: number, d: number): number {
  return s * o * d;
}

export function classifyRiskLevel(rpn: number): RiskLevel {
  if (rpn >= 200) return "critical";
  if (rpn >= 100) return "high";
  if (rpn >= 40) return "medium";
  return "low";
}

/* ───────── helpers to build entries ───────── */
let _entryCounter = 0;
function makeEntry(
  failureMode: string,
  effect: string,
  cause: string,
  currentControls: string,
  severity: number,
  occurrence: number,
  detection: number,
  category: RiskCategory,
  recommendedAction: string,
  mitigationActions: MitigationAction[] = [],
  residual?: { s: number; o: number; d: number }
): FMEAEntry {
  _entryCounter++;
  const rpn = calculateRPN(severity, occurrence, detection);
  const entry: FMEAEntry = {
    id: `fmea-${_entryCounter}`,
    failureMode,
    effect,
    cause,
    currentControls,
    severity,
    occurrence,
    detection,
    rpn,
    riskLevel: classifyRiskLevel(rpn),
    category,
    recommendedAction,
    mitigationActions,
  };
  if (residual) {
    entry.residualSeverity = residual.s;
    entry.residualOccurrence = residual.o;
    entry.residualDetection = residual.d;
    entry.residualRPN = calculateRPN(residual.s, residual.o, residual.d);
    entry.residualRiskLevel = classifyRiskLevel(entry.residualRPN);
  }
  return entry;
}

function makeMit(
  desc: string,
  owner: string,
  dueOffset: number,
  status: MitigationStatus,
  effectiveness?: "effective" | "partially-effective" | "ineffective"
): MitigationAction {
  _entryCounter++;
  const m: MitigationAction = {
    id: `mit-${_entryCounter}`,
    description: desc,
    owner,
    dueDate: dueOffset < 0 ? daysAgo(-dueOffset) : futureDays(dueOffset),
    status,
  };
  if (status === "completed" || status === "verified") {
    m.completedDate = daysAgo(Math.abs(dueOffset) + 2);
  }
  if (effectiveness) m.effectiveness = effectiveness;
  if (status === "verified") {
    m.verifiedBy = "Dr. Laila Farouk";
    m.verifiedDate = daysAgo(Math.max(0, Math.abs(dueOffset) - 1));
  }
  return m;
}

/* ────────────────────────────────────────────────────────────────
   SEED DATA — 8 Risk Assessments with realistic pharma FMEA entries
   ──────────────────────────────────────────────────────────────── */
const SEED_DATA: RiskAssessment[] = [
  /* ──── 1. Manufacturing Process FMEA — Tablet Compression ──── */
  {
    id: "ra-1",
    number: "RA-2026-001",
    title: "Tablet Compression Process FMEA — Amoxicillin 500mg",
    scope: "End-to-end tablet compression process including granulation, blending, compression, and in-process controls",
    method: "FMEA",
    product: "Amoxicillin 500mg Tablets",
    process: "Tablet Compression",
    status: "approved",
    category: "quality",
    createdBy: "Dr. Ahmed Hassan",
    createdAt: daysAgo(60),
    updatedAt: daysAgo(10),
    reviewedBy: "Dr. Laila Farouk",
    reviewedAt: daysAgo(15),
    approvedBy: "Dr. Amr Selim",
    approvedAt: daysAgo(10),
    entries: [
      makeEntry(
        "Granule moisture content out of specification",
        "Poor tablet hardness, friability failure, dissolution failure",
        "Inadequate drying time or temperature in fluid bed dryer",
        "LOD testing per SOP-PRD-015; IPC at 30-min intervals",
        8, 4, 3, "quality",
        "Install inline NIR moisture sensor for continuous monitoring",
        [makeMit("Install PAT NIR probe on FBD-02", "Eng. Mohamed Fathy", -20, "completed", "effective")],
        { s: 8, o: 2, d: 2 }
      ),
      makeEntry(
        "Blend uniformity failure",
        "Content uniformity OOS, batch rejection, regulatory recall risk",
        "Insufficient mixing time or incorrect blender speed",
        "Blend uniformity testing per USP <905>; 10-point stratified sampling",
        9, 3, 4, "quality",
        "Validate optimal mixing parameters using DOE approach",
        [makeMit("Execute mixing DOE study (3 factors, 2 levels)", "Dr. Ahmed Hassan", -30, "verified", "effective")],
        { s: 9, o: 2, d: 2 }
      ),
      makeEntry(
        "Tablet weight variation exceeding limits",
        "Dosage inconsistency, regulatory non-compliance",
        "Worn punch tips, inconsistent granule flow, hopper bridging",
        "100% weight check with automatic rejection; IPC every 15 min",
        7, 5, 2, "quality",
        "Implement predictive punch maintenance schedule",
        [makeMit("Create punch wear tracking log and replacement SOP", "Eng. Tarek Nour", -15, "completed", "effective")],
        { s: 7, o: 3, d: 2 }
      ),
      makeEntry(
        "Tablet hardness out of range",
        "Friability failure, coating defects, dissolution impact",
        "Compression force drift, granule density variation",
        "IPC hardness testing every 30 min; auto-force control on press",
        6, 4, 3, "quality",
        "Calibrate force feeder; validate pre-compression force settings",
        [makeMit("Force feeder optimization study", "Dr. Youssef Kamel", 10, "in-progress")],
        { s: 6, o: 3, d: 2 }
      ),
      makeEntry(
        "Cross-contamination from previous product",
        "Product contamination, patient safety risk, recall",
        "Inadequate equipment cleaning or cleaning verification failure",
        "Validated cleaning procedure; swab testing post-cleaning",
        10, 2, 3, "safety",
        "Implement TOC-based cleaning verification for faster turnaround",
        [makeMit("Validate TOC method for Amoxicillin residue detection", "Dr. Rania Abdel-Aziz", -25, "verified", "effective")],
        { s: 10, o: 1, d: 2 }
      ),
      makeEntry(
        "Metal contamination in tablets",
        "Patient injury, product recall, regulatory action",
        "Metal fragments from worn equipment parts or raw materials",
        "Metal detector on compression output; calibrated daily",
        10, 2, 2, "safety",
        "Add inline X-ray inspection for enhanced detection",
        [makeMit("Procure and qualify X-ray inspection system", "Eng. Mohamed Fathy", 30, "pending")],
      ),
      makeEntry(
        "Capping and lamination defects",
        "Cosmetic defect, potential dissolution impact, customer complaints",
        "Excessive air entrapment, low granule moisture, high compression speed",
        "Visual inspection per IPC; 100% dedusting",
        5, 4, 4, "quality",
        "Optimize pre-compression stage to remove trapped air",
        [],
      ),
    ],
    notes: "Annual review completed. Critical items addressed through PAT implementation.",
  },

  /* ──── 2. Cleaning Validation Risk Assessment ──── */
  {
    id: "ra-2",
    number: "RA-2026-002",
    title: "Cleaning Validation Risk Assessment — Multi-Product Facility",
    scope: "Risk-based approach to cleaning validation for shared equipment across solid dosage manufacturing suites",
    method: "FMEA",
    product: "Multiple (Amoxicillin, Metformin, Paracetamol, Omeprazole)",
    process: "Equipment Cleaning",
    status: "approved",
    category: "quality",
    createdBy: "Dr. Laila Farouk",
    createdAt: daysAgo(90),
    updatedAt: daysAgo(20),
    reviewedBy: "Dr. Rania Abdel-Aziz",
    reviewedAt: daysAgo(25),
    approvedBy: "Dr. Amr Selim",
    approvedAt: daysAgo(20),
    entries: [
      makeEntry(
        "API carryover above permitted daily exposure (PDE)",
        "Patient exposure to unintended API, safety risk",
        "Inadequate cleaning agent concentration or contact time",
        "Validated cleaning SOP; swab + rinse sampling at worst-case locations",
        10, 3, 3, "safety",
        "Revise cleaning SOP with increased detergent concentration for high-potency APIs",
        [makeMit("Update SOP-CLN-005 with risk-based cleaning parameters", "Dr. Laila Farouk", -40, "verified", "effective")],
        { s: 10, o: 2, d: 2 }
      ),
      makeEntry(
        "Detergent residue on product contact surfaces",
        "Product contamination, off-taste, stability impact",
        "Insufficient rinse cycles or inadequate rinse water quality",
        "Conductivity testing of final rinse water; visual inspection",
        7, 3, 3, "quality",
        "Add TOC analysis of final rinse samples",
        [makeMit("Validate TOC limit for detergent residue", "Dr. Rania Abdel-Aziz", -35, "completed", "effective")],
        { s: 7, o: 2, d: 2 }
      ),
      makeEntry(
        "Bioburden on equipment after cleaning hold time",
        "Microbial contamination of next product batch",
        "Extended dirty or clean hold time exceeding validated limits",
        "Clean hold time validated at 72 hours; dirty hold at 24 hours",
        8, 3, 4, "quality",
        "Reduce clean hold time to 48 hours and revalidate",
        [makeMit("Execute clean hold time revalidation study", "Dr. Rania Abdel-Aziz", 15, "in-progress")],
      ),
      makeEntry(
        "Inaccessible equipment surfaces not adequately cleaned",
        "Residue buildup in hard-to-reach areas, cross-contamination",
        "Complex equipment geometry (valves, seals, dead legs)",
        "Worst-case sampling locations identified; swab recovery validated",
        8, 4, 5, "quality",
        "Redesign sampling plan with additional worst-case locations per EMA guideline",
        [makeMit("Commission equipment surface mapping study", "Eng. Mohamed Fathy", -10, "completed", "partially-effective")],
        { s: 8, o: 3, d: 4 }
      ),
      makeEntry(
        "Cleaning agent incompatibility with equipment material",
        "Equipment corrosion, particulate contamination",
        "Use of incompatible cleaning agent on stainless steel or gasket materials",
        "Material compatibility matrix in SOP-CLN-001",
        7, 2, 3, "operational",
        "Annual review of compatibility matrix with equipment changes",
        [],
      ),
      makeEntry(
        "Operator not following cleaning procedure steps",
        "Inconsistent cleaning effectiveness, residue carryover",
        "Inadequate training, complex procedure, time pressure",
        "Training records; cleaning checklist verification by QA",
        8, 4, 4, "quality",
        "Implement visual cleaning SOPs with photo documentation",
        [makeMit("Develop photo-documented cleaning SOPs for all equipment", "Pharm. Mariam Khalil", 20, "pending")],
      ),
    ],
    notes: "Based on EMA Guideline on shared facilities (2014) and ISPE Cleaning Validation Guide.",
  },

  /* ──── 3. Water System Risk Assessment ──── */
  {
    id: "ra-3",
    number: "RA-2026-003",
    title: "Purified Water System Risk Assessment",
    scope: "Generation, storage, and distribution of purified water for pharmaceutical manufacturing per WHO TRS 970",
    method: "FMEA",
    product: "All oral solid dosage products",
    process: "Water Purification System",
    status: "in-progress",
    category: "quality",
    createdBy: "Eng. Fatma El-Sayed",
    createdAt: daysAgo(30),
    updatedAt: daysAgo(3),
    entries: [
      makeEntry(
        "Microbial count exceeds purified water specification (100 CFU/ml)",
        "Batch failure, product contamination, patient risk",
        "Biofilm formation in storage tank or distribution loop dead legs",
        "Daily micro sampling at POU; weekly sanitization with hot water at 80°C",
        9, 4, 3, "quality",
        "Install continuous ozone injection system for storage tank",
        [makeMit("Procure ozone generator and install on PW tank", "Eng. Fatma El-Sayed", 25, "pending")],
      ),
      makeEntry(
        "Endotoxin level exceeds limit (0.25 EU/ml)",
        "Pyrogenic reaction potential (if used for parenteral rinsing)",
        "Gram-negative bacterial contamination; inadequate sanitization",
        "Weekly LAL testing at points of use",
        9, 3, 4, "safety",
        "Increase sanitization frequency; add online TOC monitoring",
        [makeMit("Install online TOC monitor at distribution loop return", "Eng. Fatma El-Sayed", 20, "in-progress")],
      ),
      makeEntry(
        "Conductivity excursion above 1.3 μS/cm",
        "Chemical purity failure, product quality impact",
        "RO membrane degradation, feed water quality change, resin exhaustion",
        "Online conductivity monitoring with alarm; daily log review",
        6, 3, 2, "quality",
        "Implement predictive RO membrane replacement based on trend analysis",
        [makeMit("Set up conductivity trend dashboard with alert thresholds", "Eng. Fatma El-Sayed", -5, "completed", "effective")],
        { s: 6, o: 2, d: 2 }
      ),
      makeEntry(
        "Dead leg formation after system modification",
        "Stagnant water promoting microbial growth",
        "Inadequate change control for piping modifications",
        "Dead leg ratio maintained at L/D < 3 per ISPE guidelines",
        7, 3, 5, "quality",
        "Implement 3D piping model for all loop modifications",
        [],
      ),
      makeEntry(
        "Rouge formation in stainless steel piping",
        "Particulate contamination, aesthetic defect in product",
        "Passivation layer degradation, chloride attack, high temperature cycling",
        "Annual passivation; visual inspection during PM",
        5, 3, 5, "operational",
        "Schedule derouging and repassivation of distribution loop",
        [makeMit("Plan loop derouging during annual shutdown", "Eng. Tarek Nour", 45, "pending")],
      ),
      makeEntry(
        "Temperature excursion in distribution loop",
        "Microbial growth in warm spots; system out of qualified state",
        "Heat exchanger malfunction, insulation damage, flow rate drop",
        "Temperature sensors at critical points; SCADA alarm",
        7, 3, 3, "quality",
        "Add redundant temperature transmitters at inlet/outlet",
        [],
      ),
      makeEntry(
        "Storage tank vent filter integrity failure",
        "Airborne contamination entering purified water tank",
        "Hydrophobic filter wetting, physical damage, improper installation",
        "Weekly integrity test; monthly filter replacement",
        8, 2, 3, "quality",
        "Install differential pressure alarm on vent filter",
        [makeMit("Procure and install DP transmitter on vent filter", "Eng. Fatma El-Sayed", 15, "pending")],
      ),
    ],
    notes: "Aligned with WHO TRS 970 Annex 2 and ISPE Water Guide.",
  },

  /* ──── 4. HVAC System Risk Assessment ──── */
  {
    id: "ra-4",
    number: "RA-2026-004",
    title: "HVAC System Risk Assessment — Solid Dosage Manufacturing",
    scope: "Heating, ventilation, and air conditioning system for classified manufacturing areas SD-01 through SD-06",
    method: "FMEA",
    product: "All solid dosage products",
    process: "HVAC and Environmental Control",
    status: "review",
    category: "quality",
    createdBy: "Eng. Tarek Nour",
    createdAt: daysAgo(25),
    updatedAt: daysAgo(5),
    reviewedBy: "Dr. Laila Farouk",
    reviewedAt: daysAgo(5),
    entries: [
      makeEntry(
        "HEPA filter breach or integrity failure",
        "Loss of room classification, product contamination with particulates",
        "Filter media damage, frame seal failure, improper installation",
        "Bi-annual DOP testing; differential pressure monitoring",
        9, 3, 3, "quality",
        "Install continuous particle counters in critical rooms",
        [makeMit("Procure particle counters for SD-01, SD-03, SD-05", "Eng. Tarek Nour", 20, "pending")],
      ),
      makeEntry(
        "Differential pressure reversal between rooms",
        "Cross-contamination between product suites, classified/unclassified areas",
        "AHU fan failure, damper malfunction, door left open",
        "DP sensors with BMS alarm; airlock interlocks on doors",
        9, 3, 2, "safety",
        "Add redundant DP sensors with failsafe damper closure",
        [makeMit("Install backup DP transmitters with auto-damper", "Eng. Mohamed Fathy", 30, "pending")],
      ),
      makeEntry(
        "Temperature excursion outside 20-25°C range",
        "Product quality impact; operator comfort; GMP non-compliance",
        "Chiller failure, control valve malfunction, extreme ambient conditions",
        "BMS temperature monitoring with alarm; backup chiller available",
        6, 4, 2, "operational",
        "Implement automated switchover to backup chiller",
        [makeMit("Commission auto-switchover logic in BMS", "Eng. Tarek Nour", -8, "completed", "effective")],
        { s: 6, o: 2, d: 2 }
      ),
      makeEntry(
        "Relative humidity exceeds 60% RH limit",
        "Moisture-sensitive product degradation, microbial growth promotion",
        "Dehumidifier failure, steam leak, inadequate fresh air treatment",
        "BMS RH monitoring; desiccant dehumidifier in critical areas",
        7, 4, 3, "quality",
        "Install dedicated dehumidification for moisture-sensitive suites",
        [makeMit("Procure standalone dehumidifier for SD-03 (Amoxicillin)", "Eng. Tarek Nour", 15, "in-progress")],
      ),
      makeEntry(
        "Insufficient air changes per hour",
        "Particle count excursion, product exposure risk",
        "Fan belt wear, VFD failure, duct obstruction",
        "Air velocity measurement during qualification; BMS flow monitoring",
        7, 3, 4, "quality",
        "Add airflow velocity sensors at supply diffusers",
        [],
      ),
      makeEntry(
        "Return air contamination from dust extraction failure",
        "Particulate carry-over to adjacent rooms via shared return duct",
        "Dust collector bag rupture, exhaust fan failure",
        "Dedicated exhaust for dust-generating operations; bag leak detection",
        8, 3, 4, "quality",
        "Install triboelectric bag leak detectors on all dust collectors",
        [makeMit("Install bag leak detection on DC-01 through DC-04", "Eng. Mohamed Fathy", 25, "pending")],
      ),
      makeEntry(
        "AHU condensate drain blocked",
        "Microbial contamination of supply air, water damage",
        "Biological growth in drain pan, improper slope, blocked trap",
        "Monthly PM inspection; UV-C lamp in AHU",
        5, 3, 4, "operational",
        "Install condensate drain pan sensors with BMS alarm",
        [],
      ),
    ],
    notes: "Aligned with ISPE Baseline Guide Vol. 2 and EU GMP Annex 1 (2022).",
  },

  /* ──── 5. Supply Chain Risk Assessment ──── */
  {
    id: "ra-5",
    number: "RA-2026-005",
    title: "API Supply Chain Risk Assessment — Critical Raw Materials",
    scope: "Risk assessment of active pharmaceutical ingredient supply chain for key products including single-source dependencies",
    method: "FMEA",
    product: "Amoxicillin, Metformin, Omeprazole, Paracetamol",
    process: "Supply Chain Management",
    status: "in-progress",
    category: "supply-chain",
    createdBy: "Dr. Nadia Soliman",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(2),
    entries: [
      makeEntry(
        "Single-source API supplier disruption",
        "Production stoppage, market shortage, regulatory non-compliance",
        "Supplier plant shutdown, regulatory action, force majeure",
        "Safety stock policy (3-month); supplier audit program",
        9, 5, 6, "supply-chain",
        "Qualify second-source supplier for all single-source APIs",
        [makeMit("Submit Aurobindo as alternate Metformin HCl supplier", "Dr. Nadia Soliman", 30, "in-progress")],
      ),
      makeEntry(
        "API quality drift — out-of-trend results",
        "Batch failure at incoming QC, production delays",
        "Supplier process change, raw material variability at supplier",
        "Incoming QC testing per approved spec; certificate of analysis review",
        8, 4, 3, "quality",
        "Implement supplier scorecards with trend monitoring",
        [makeMit("Deploy quarterly supplier quality review process", "Dr. Nadia Soliman", -10, "completed", "effective")],
        { s: 8, o: 3, d: 2 }
      ),
      makeEntry(
        "Counterfeit or adulterated API received",
        "Patient harm, product recall, criminal liability",
        "Unauthorized broker in supply chain, inadequate supplier qualification",
        "GDP-compliant supply chain; identity testing on every receipt",
        10, 2, 3, "safety",
        "Implement serialization and track-and-trace for API shipments",
        [makeMit("Evaluate API serialization solutions with top 3 suppliers", "Dr. Nadia Soliman", 45, "pending")],
      ),
      makeEntry(
        "Shipping temperature excursion for temperature-sensitive API",
        "API degradation, batch rejection at incoming QC",
        "Inadequate cold chain management, delayed customs clearance",
        "Temperature loggers in shipments; acceptance criteria on receipt",
        7, 4, 3, "quality",
        "Mandate GDP-qualified logistics for all temperature-sensitive APIs",
        [makeMit("Qualify cold chain logistics provider for Omeprazole API", "Dr. Nadia Soliman", 20, "pending")],
      ),
      makeEntry(
        "Regulatory change at supplier country of origin",
        "Import ban, supply disruption, re-registration required",
        "Export restrictions, new GMP requirements, political instability",
        "Regulatory intelligence monitoring; annual supplier risk assessment",
        7, 3, 6, "regulatory",
        "Establish geographically diversified supplier base",
        [],
      ),
      makeEntry(
        "Lead time increase beyond safety stock coverage",
        "Stockout, production schedule disruption",
        "Port congestion, shipping delays, supplier capacity constraints",
        "Rolling 12-month demand forecast shared with suppliers",
        6, 5, 4, "supply-chain",
        "Implement vendor-managed inventory for top 5 APIs",
        [makeMit("Pilot VMI program with primary Amoxicillin supplier", "Dr. Nadia Soliman", 35, "pending")],
      ),
    ],
    notes: "Triggered by Metformin supply disruption in Q1 2026. Aligned with ICH Q7 Section 7.",
  },

  /* ──── 6. Packaging Line Risk Assessment ──── */
  {
    id: "ra-6",
    number: "RA-2026-006",
    title: "Primary Packaging FMEA — Blister Line 3",
    scope: "Blister packaging process for oral solid dosage forms including forming, filling, sealing, and inspection",
    method: "FMEA",
    product: "Omeprazole 20mg Capsules, Amoxicillin 500mg Tablets",
    process: "Blister Packaging",
    status: "approved",
    category: "quality",
    createdBy: "Dr. Youssef Kamel",
    createdAt: daysAgo(45),
    updatedAt: daysAgo(12),
    reviewedBy: "Dr. Laila Farouk",
    reviewedAt: daysAgo(15),
    approvedBy: "Dr. Amr Selim",
    approvedAt: daysAgo(12),
    entries: [
      makeEntry(
        "Incomplete blister seal (seal integrity failure)",
        "Moisture ingress, product degradation, reduced shelf life",
        "Sealing temperature drift, worn sealing plate, contaminated sealing surface",
        "Online seal integrity check; destructive testing per IPC SOP",
        8, 3, 3, "quality",
        "Install 100% vision-based seal inspection system",
        [makeMit("Commission vision inspection system on Line 3", "Eng. Mohamed Fathy", -15, "completed", "effective")],
        { s: 8, o: 2, d: 2 }
      ),
      makeEntry(
        "Empty or missing tablet/capsule in blister pocket",
        "Under-dosing, patient harm, customer complaint",
        "Feeding mechanism jam, broken capsule, static charge",
        "Camera inspection system; weight check on cartoner",
        9, 3, 2, "safety",
        "Add secondary camera verification after pocket filling",
        [makeMit("Install redundant camera at filling station", "Eng. Mohamed Fathy", -20, "verified", "effective")],
        { s: 9, o: 1, d: 2 }
      ),
      makeEntry(
        "Wrong product in blister (mix-up)",
        "Patient receives wrong medication, serious safety event",
        "Line clearance failure, residual product from previous batch",
        "Barcode verification on feeding hopper; line clearance per SOP",
        10, 2, 2, "safety",
        "Implement RFID-based product verification at all input points",
        [makeMit("Evaluate RFID solutions for packaging line inputs", "Eng. Mohamed Fathy", 30, "pending")],
      ),
      makeEntry(
        "Incorrect batch number or expiry date printed",
        "Product recall, regulatory non-compliance, traceability loss",
        "Printer programming error, font cartridge malfunction",
        "IPC verification at start, middle, end of batch; camera-OCR check",
        8, 3, 2, "regulatory",
        "Implement automated print data verification from ERP system",
        [makeMit("Connect printer to ERP for automated batch data population", "Eng. Ayman Zaki", 25, "in-progress")],
      ),
      makeEntry(
        "Blister forming defect (thin spots, pinholes)",
        "Moisture barrier compromised, product degradation",
        "PVC film gauge variation, forming temperature too high/low",
        "Film thickness check at start; forming depth verification",
        6, 3, 4, "quality",
        "Implement incoming film thickness verification with micrometer",
        [],
      ),
      makeEntry(
        "Leaflet missing from carton",
        "Regulatory non-compliance, patient information risk",
        "Leaflet feeder jam, sensor misalignment",
        "Checkweigher on cartoner; leaflet presence sensor",
        5, 4, 3, "regulatory",
        "Upgrade leaflet detection sensor to dual-redundant system",
        [makeMit("Install dual leaflet detection sensor", "Eng. Mohamed Fathy", -5, "completed", "effective")],
        { s: 5, o: 2, d: 2 }
      ),
      makeEntry(
        "Serialization data mismatch or aggregation error",
        "Supply chain traceability failure, regulatory penalty",
        "System configuration error, camera read failure, database sync issue",
        "100% serial number verification; reconciliation at end of batch",
        7, 3, 3, "regulatory",
        "Implement real-time serialization dashboard with exception alerts",
        [],
      ),
    ],
    notes: "Updated following installation of Al/Al blister capability on Line 3.",
  },

  /* ──── 7. Analytical Method Risk Assessment ──── */
  {
    id: "ra-7",
    number: "RA-2026-007",
    title: "Analytical Method Risk Assessment — HPLC Assay Methods",
    scope: "Risk assessment of HPLC analytical methods used for release and stability testing of oral solid dosage products",
    method: "FMEA",
    product: "All oral solid dosage products",
    process: "QC Analytical Testing",
    status: "draft",
    category: "quality",
    createdBy: "Dr. Rania Abdel-Aziz",
    createdAt: daysAgo(10),
    updatedAt: daysAgo(3),
    entries: [
      makeEntry(
        "System suitability test failure",
        "Testing delay, batch release delay, laboratory backlog",
        "Column degradation, mobile phase preparation error, lamp aging",
        "SST criteria per pharmacopoeia; daily system checkout",
        5, 5, 2, "quality",
        "Implement column tracking log with usage-based replacement",
        [],
      ),
      makeEntry(
        "Out-of-specification assay result",
        "OOS investigation triggered, batch hold, potential rejection",
        "Analyst error, sample preparation variability, instrument malfunction",
        "OOS investigation procedure per SOP-QC-030; duplicate analysis",
        8, 4, 4, "quality",
        "Implement automated sample preparation to reduce analyst variability",
        [makeMit("Evaluate automated dissolution + HPLC sample prep system", "Dr. Rania Abdel-Aziz", 40, "pending")],
      ),
      makeEntry(
        "Incorrect reference standard used or expired",
        "Erroneous results, batch disposition error",
        "Multiple reference standards in inventory, unclear labeling",
        "Reference standard log; expiry check before use",
        9, 2, 3, "quality",
        "Implement barcode-verified reference standard dispensing",
        [makeMit("Barcode all reference standards in QC inventory", "Dr. Rania Abdel-Aziz", 15, "in-progress")],
      ),
      makeEntry(
        "Data integrity breach — unauthorized modification of results",
        "Regulatory violation, product quality compromise, criminal liability",
        "Inadequate access controls, audit trail bypass, pressure to pass results",
        "21 CFR Part 11 compliant CDS; audit trail review per SOP-QC-050",
        10, 2, 3, "regulatory",
        "Implement periodic audit trail review with automated anomaly detection",
        [makeMit("Configure automated audit trail anomaly reports in CDS", "Eng. Ayman Zaki", 30, "pending")],
      ),
      makeEntry(
        "Method transfer failure between laboratories",
        "Delayed product launch, retesting costs, regulatory submission delay",
        "Differences in equipment, analyst skill, environmental conditions",
        "Method transfer protocol per USP <1224>; equivalence testing",
        6, 3, 5, "quality",
        "Develop standardized method transfer protocol with acceptance criteria",
        [],
      ),
      makeEntry(
        "Instrument qualification lapse (overdue calibration)",
        "Results from unqualified instrument, data integrity risk",
        "Scheduling oversight, instrument downtime, calibration vendor delay",
        "Calibration schedule in CMMS; sticker on instrument",
        7, 3, 3, "regulatory",
        "Implement CMMS auto-lockout for overdue calibration instruments",
        [makeMit("Configure CMMS lockout rules for HPLC systems", "Eng. Ayman Zaki", 20, "pending")],
      ),
    ],
    notes: "Draft — pending input from QC stability team.",
  },

  /* ──── 8. Stability Program Risk Assessment ──── */
  {
    id: "ra-8",
    number: "RA-2026-008",
    title: "Stability Program Risk Assessment",
    scope: "Risk assessment of pharmaceutical stability studies program including chamber qualification, sampling, and trend analysis",
    method: "FMEA",
    product: "All registered products",
    process: "Stability Testing Program",
    status: "in-progress",
    category: "regulatory",
    createdBy: "Dr. Ahmed Hassan",
    createdAt: daysAgo(15),
    updatedAt: daysAgo(1),
    entries: [
      makeEntry(
        "Stability chamber temperature/RH excursion",
        "Invalid stability data, regulatory non-compliance, extended study needed",
        "Compressor failure, sensor drift, power outage",
        "Continuous T/RH monitoring with alarm; backup generator",
        8, 3, 2, "regulatory",
        "Install dual-redundant monitoring with independent alarm system",
        [makeMit("Procure independent monitoring system for chambers 1-4", "Eng. Tarek Nour", 20, "pending")],
      ),
      makeEntry(
        "Missed stability pull point",
        "Data gap, regulatory query, incomplete stability profile",
        "Scheduling error, analyst unavailability, chamber access issue",
        "Stability schedule in LIMS; monthly review of upcoming pulls",
        7, 4, 3, "regulatory",
        "Implement automated LIMS reminders 7 days before pull date",
        [makeMit("Configure LIMS automated stability pull reminders", "Dr. Rania Abdel-Aziz", -5, "completed", "effective")],
        { s: 7, o: 2, d: 2 }
      ),
      makeEntry(
        "Out-of-trend stability result at accelerated condition",
        "Signal of potential shelf-life reduction, regulatory impact",
        "Formulation degradation, packaging failure, method variability",
        "OOT investigation procedure; trend analysis at each time point",
        8, 4, 4, "quality",
        "Implement statistical process monitoring for stability trends",
        [makeMit("Deploy CUSUM chart analysis for stability trend monitoring", "Dr. Ahmed Hassan", 15, "in-progress")],
      ),
      makeEntry(
        "Stability sample mix-up or mislabeling",
        "Wrong sample tested, invalid data, re-study required",
        "Manual labeling error, similar packaging appearances",
        "Sample reconciliation log; barcode verification at pull",
        8, 3, 4, "quality",
        "Implement barcode-labeled stability sample management",
        [makeMit("Deploy barcode labeling system for stability samples", "Dr. Rania Abdel-Aziz", 25, "pending")],
      ),
      makeEntry(
        "Insufficient stability data for shelf-life determination",
        "Cannot support registration, product launch delay",
        "Study design gaps, premature termination, OOS eliminating data points",
        "ICH Q1A-aligned study protocols; statistical shelf-life calculation",
        7, 3, 5, "regulatory",
        "Review all ongoing studies against ICH Q1A/Q1E requirements",
        [],
      ),
      makeEntry(
        "Chamber capacity exceeded — samples too close to walls",
        "Non-representative conditions for samples near walls/door",
        "Too many studies running concurrently, poor sample placement",
        "Chamber loading plan; qualified usable volume documented",
        5, 4, 4, "quality",
        "Implement chamber loading management system in LIMS",
        [],
      ),
      makeEntry(
        "Photostability study lamp intensity drift",
        "Invalid ICH Q1B photostability data, re-study needed",
        "UV/VIS lamp aging, radiometer calibration drift",
        "Radiometer verification before and after exposure; lamp hour tracking",
        6, 3, 5, "regulatory",
        "Install continuous light intensity monitoring with data logger",
        [makeMit("Procure continuous radiometer for photostability chamber", "Eng. Tarek Nour", 30, "pending")],
      ),
      makeEntry(
        "Stability indicating method not validated for degradation products",
        "Missing degradant data, incomplete stability profile",
        "Method not challenged with forced degradation; new degradation pathway",
        "Method validation per ICH Q2; forced degradation studies at validation",
        8, 3, 4, "regulatory",
        "Conduct forced degradation reassessment for all HPLC stability methods",
        [makeMit("Execute forced degradation study gap analysis", "Dr. Rania Abdel-Aziz", 10, "in-progress")],
      ),
    ],
    notes: "Annual program review. Aligned with ICH Q1A(R2), Q1B, Q1E.",
  },
];

/* ──────────────────────────────────────────
   Risk Assessment Store (singleton)
   ────────────────────────────────────────── */
class RiskAssessmentStore {
  private static instance: RiskAssessmentStore;

  private constructor() {
    this.seed();
  }

  static getInstance(): RiskAssessmentStore {
    if (!RiskAssessmentStore.instance) {
      RiskAssessmentStore.instance = new RiskAssessmentStore();
    }
    return RiskAssessmentStore.instance;
  }

  /* ── persistence ── */
  private seed(): void {
    if (typeof window === "undefined") return;
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
    }
  }

  private load(): RiskAssessment[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RiskAssessment[]) : [];
  }

  private save(data: RiskAssessment[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /* ── read ── */
  getAll(): RiskAssessment[] {
    return this.load();
  }

  getById(id: string): RiskAssessment | undefined {
    return this.load().find((r) => r.id === id);
  }

  getByStatus(status: RiskStatus): RiskAssessment[] {
    return this.load().filter((r) => r.status === status);
  }

  getByProcess(process: string): RiskAssessment[] {
    return this.load().filter((r) =>
      r.process.toLowerCase().includes(process.toLowerCase())
    );
  }

  getByCategory(category: RiskCategory): RiskAssessment[] {
    return this.load().filter((r) => r.category === category);
  }

  getHighRiskItems(): FMEAEntry[] {
    const all = this.load();
    const items: FMEAEntry[] = [];
    for (const ra of all) {
      for (const e of ra.entries) {
        if (e.riskLevel === "high" || e.riskLevel === "critical") {
          items.push(e);
        }
      }
    }
    return items;
  }

  getAllEntries(): { assessment: RiskAssessment; entry: FMEAEntry }[] {
    const all = this.load();
    const result: { assessment: RiskAssessment; entry: FMEAEntry }[] = [];
    for (const ra of all) {
      for (const e of ra.entries) {
        result.push({ assessment: ra, entry: e });
      }
    }
    return result;
  }

  /* ── write ── */
  create(
    data: Omit<RiskAssessment, "id" | "number" | "createdAt" | "updatedAt">
  ): RiskAssessment {
    const all = this.load();
    const newRA: RiskAssessment = {
      ...data,
      id: `ra-${Date.now()}`,
      number: this.generateNumber(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    all.push(newRA);
    this.save(all);
    return newRA;
  }

  update(
    id: string,
    updates: Partial<RiskAssessment>
  ): RiskAssessment | undefined {
    const all = this.load();
    const idx = all.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save(all);
    return all[idx];
  }

  deleteAssessment(id: string): boolean {
    const all = this.load();
    const filtered = all.filter((r) => r.id !== id);
    if (filtered.length === all.length) return false;
    this.save(filtered);
    return true;
  }

  /* ── entries ── */
  addEntry(assessmentId: string, entry: Omit<FMEAEntry, "id" | "rpn" | "riskLevel">): FMEAEntry | undefined {
    const all = this.load();
    const idx = all.findIndex((r) => r.id === assessmentId);
    if (idx === -1) return undefined;
    const rpn = calculateRPN(entry.severity, entry.occurrence, entry.detection);
    const newEntry: FMEAEntry = {
      ...entry,
      id: `fmea-${Date.now()}`,
      rpn,
      riskLevel: classifyRiskLevel(rpn),
    };
    all[idx].entries.push(newEntry);
    all[idx].updatedAt = new Date().toISOString();
    this.save(all);
    return newEntry;
  }

  updateEntry(
    assessmentId: string,
    entryId: string,
    updates: Partial<FMEAEntry>
  ): FMEAEntry | undefined {
    const all = this.load();
    const raIdx = all.findIndex((r) => r.id === assessmentId);
    if (raIdx === -1) return undefined;
    const eIdx = all[raIdx].entries.findIndex((e) => e.id === entryId);
    if (eIdx === -1) return undefined;
    const merged = { ...all[raIdx].entries[eIdx], ...updates };
    // Recalculate RPN
    merged.rpn = calculateRPN(merged.severity, merged.occurrence, merged.detection);
    merged.riskLevel = classifyRiskLevel(merged.rpn);
    if (
      merged.residualSeverity != null &&
      merged.residualOccurrence != null &&
      merged.residualDetection != null
    ) {
      merged.residualRPN = calculateRPN(
        merged.residualSeverity,
        merged.residualOccurrence,
        merged.residualDetection
      );
      merged.residualRiskLevel = classifyRiskLevel(merged.residualRPN);
    }
    all[raIdx].entries[eIdx] = merged;
    all[raIdx].updatedAt = new Date().toISOString();
    this.save(all);
    return merged;
  }

  /* ── number generator ── */
  generateNumber(): string {
    const all = this.load();
    const year = new Date().getFullYear();
    const prefix = `RA-${year}-`;
    const existing = all
      .filter((r) => r.number.startsWith(prefix))
      .map((r) => parseInt(r.number.replace(prefix, ""), 10))
      .filter((n) => !isNaN(n));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `${prefix}${String(next).padStart(3, "0")}`;
  }

  /* ── metrics ── */
  getMetrics(): RiskMetrics {
    const all = this.load();
    const allEntries = all.flatMap((r) => r.entries);

    // High risk items
    const highRiskItems = allEntries.filter(
      (e) => e.riskLevel === "high" || e.riskLevel === "critical"
    ).length;

    // Average RPN
    const avgRPN =
      allEntries.length > 0
        ? Math.round(
            allEntries.reduce((sum, e) => sum + e.rpn, 0) / allEntries.length
          )
        : 0;

    // Mitigations pending
    const mitigationsPending = allEntries.reduce(
      (count, e) =>
        count +
        e.mitigationActions.filter(
          (m) => m.status === "pending" || m.status === "in-progress"
        ).length,
      0
    );

    // Risk reduction %: average of (original RPN - residual RPN) / original RPN for entries with residual
    const withResidual = allEntries.filter(
      (e) => e.residualRPN != null && e.residualRPN !== undefined
    );
    const riskReductionPct =
      withResidual.length > 0
        ? Math.round(
            (withResidual.reduce(
              (sum, e) => sum + ((e.rpn - (e.residualRPN ?? e.rpn)) / e.rpn),
              0
            ) /
              withResidual.length) *
              100
          )
        : 0;

    // By status
    const statusMap = new Map<RiskStatus, number>();
    all.forEach((r) =>
      statusMap.set(r.status, (statusMap.get(r.status) || 0) + 1)
    );
    const byStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
    }));

    // By category
    const catMap = new Map<RiskCategory, number>();
    all.forEach((r) =>
      catMap.set(r.category, (catMap.get(r.category) || 0) + 1)
    );
    const byCategory = Array.from(catMap.entries()).map(
      ([category, count]) => ({ category, count })
    );

    // By method
    const methodMap = new Map<RiskMethod, number>();
    all.forEach((r) =>
      methodMap.set(r.method, (methodMap.get(r.method) || 0) + 1)
    );
    const byMethod = Array.from(methodMap.entries()).map(
      ([method, count]) => ({ method, count })
    );

    // RPN distribution
    const ranges = [
      { range: "1-39 (Low)", min: 1, max: 39 },
      { range: "40-99 (Medium)", min: 40, max: 99 },
      { range: "100-199 (High)", min: 100, max: 199 },
      { range: "200+ (Critical)", min: 200, max: 1000 },
    ];
    const rpnDistribution = ranges.map(({ range, min, max }) => ({
      range,
      count: allEntries.filter((e) => e.rpn >= min && e.rpn <= max).length,
    }));

    return {
      totalAssessments: all.length,
      highRiskItems,
      avgRPN,
      mitigationsPending,
      riskReductionPct,
      byStatus,
      byCategory,
      byMethod,
      rpnDistribution,
    };
  }
}

export const riskStore = RiskAssessmentStore.getInstance();
