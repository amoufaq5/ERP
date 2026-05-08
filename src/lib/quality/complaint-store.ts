"use client";

import type {
  Complaint,
  ComplaintStatus,
  ComplaintSource,
  ComplaintCategory,
  ComplaintMetrics,
  ComplaintTimelineEvent,
} from "./complaint-types";

const STORAGE_KEY = "pharma.complaints";

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

// ─── Seed Data: 15 Complaints ───────────────────────────────────────────────

const SEED_DATA: Complaint[] = [
  // === 4 Customer Quality Complaints ===
  {
    id: "cmp-1",
    number: "CMP-2026-001",
    title: "Discolored tablets in Amoxicillin 500mg blister",
    description:
      "Customer reported yellowish discoloration on 5 tablets in a single blister strip of Amoxicillin 500mg capsules from batch AMX-FP-2026-041. Tablets appear darker than normal.",
    source: "customer",
    category: "quality",
    product: "Amoxicillin 500mg Capsules",
    batch: "AMX-FP-2026-041",
    complainant: {
      name: "Dr. Hossam El-Din Pharmacy",
      organization: "El-Din Pharmacy Chain",
      phone: "+20-2-2345-6789",
      email: "complaints@eldinpharmacy.com.eg",
    },
    severity: "major",
    status: "closed",
    receivedAt: daysAgo(60),
    receivedBy: "Pharm. Dina Mansour",
    dueDate: daysAgo(30),
    department: "QA",
    timeline: [
      { status: "received", date: daysAgo(60), actor: "Pharm. Dina Mansour", notes: "Customer complaint received via email with photos." },
      { status: "acknowledged", date: daysAgo(59), actor: "Pharm. Dina Mansour", notes: "Acknowledgment letter sent to customer within 24 hours." },
      { status: "investigation", date: daysAgo(57), actor: "Dr. Rania Abdel-Aziz", notes: "Reserve sample pulled and visual inspection initiated." },
      { status: "root-cause", date: daysAgo(48), actor: "Dr. Rania Abdel-Aziz", notes: "Root cause: Exposure to elevated temperature during storage at distributor." },
      { status: "capa-required", date: daysAgo(45), actor: "Dr. Laila Farouk", notes: "CAPA initiated for distributor storage qualification." },
      { status: "response-sent", date: daysAgo(40), actor: "Pharm. Dina Mansour", notes: "Formal response with investigation findings sent to customer." },
      { status: "closed", date: daysAgo(35), actor: "Dr. Laila Farouk", notes: "Customer acknowledged response. Replacement provided." },
    ],
    investigation: {
      investigator: "Dr. Rania Abdel-Aziz",
      startedAt: daysAgo(57),
      completedAt: daysAgo(48),
      findings: "Reserve sample analysis showed no discoloration. Accelerated stability at 40C/75%RH for 72h reproduced the discoloration. Distributor storage conditions were not maintained at 25C.",
      rootCause: "Product exposed to temperatures exceeding 30C during storage at distributor warehouse lacking adequate climate control.",
      impactAssessment: "Limited to specific distributor. No product quality impact at point of manufacture.",
      affectedBatches: ["AMX-FP-2026-041"],
      method: "Laboratory investigation + distributor audit",
    },
    response: {
      responseText: "Investigation confirmed discoloration due to storage conditions. Replacement product provided. Distributor storage improvements underway.",
      sentTo: "Dr. Hossam El-Din Pharmacy",
      sentDate: daysAgo(40),
      sentBy: "Pharm. Dina Mansour",
      acknowledgment: true,
      acknowledgmentDate: daysAgo(38),
    },
    capaId: "capa-ext-1",
    capaNumber: "CAPA-2026-016",
    closedAt: daysAgo(35),
    closedBy: "Dr. Laila Farouk",
  },
  {
    id: "cmp-2",
    number: "CMP-2026-002",
    title: "Broken tablets in Metformin 850mg blister packs",
    description:
      "Customer received blister packs with 3 broken/cracked tablets in Metformin 850mg from batch MET-FP-2026-055. Second complaint on same product in 2 weeks.",
    source: "customer",
    category: "quality",
    product: "Metformin 850mg Tablets",
    batch: "MET-FP-2026-055",
    complainant: {
      name: "Al-Shifa Hospital Pharmacy",
      organization: "Al-Shifa Medical Group",
      phone: "+20-2-3456-7890",
      email: "pharmacy@alshifamed.com.eg",
    },
    severity: "major",
    status: "capa-required",
    receivedAt: daysAgo(18),
    receivedBy: "Pharm. Dina Mansour",
    dueDate: futureDays(12),
    department: "Production",
    timeline: [
      { status: "received", date: daysAgo(18), actor: "Pharm. Dina Mansour", notes: "Second complaint on broken tablets from different customer." },
      { status: "acknowledged", date: daysAgo(17), actor: "Pharm. Dina Mansour", notes: "Urgent acknowledgment sent due to repeat complaint." },
      { status: "investigation", date: daysAgo(16), actor: "Eng. Mohamed Fathy", notes: "Linked to CAPA-2026-009 for broken Metformin tablets." },
      { status: "root-cause", date: daysAgo(10), actor: "Eng. Mohamed Fathy", notes: "Worn blister pocket tooling on Packaging Line 2 confirmed." },
      { status: "capa-required", date: daysAgo(8), actor: "Dr. Laila Farouk", notes: "Linked to existing CAPA-2026-009." },
    ],
    investigation: {
      investigator: "Eng. Mohamed Fathy",
      startedAt: daysAgo(16),
      completedAt: daysAgo(10),
      findings: "Blister pocket depth 0.3mm shallower than spec due to worn tooling. High-hardness tablets (18 kp) fracture during sealing.",
      rootCause: "Worn blister forming tooling on Packaging Line 2 combined with tablets at upper hardness limit.",
      impactAssessment: "Affects batches MET-FP-2026-055 and MET-FP-2026-058 packed on Line 2.",
      affectedBatches: ["MET-FP-2026-055", "MET-FP-2026-058"],
      method: "Equipment inspection + dimensional analysis",
    },
    capaId: "capa-9",
    capaNumber: "CAPA-2026-009",
  },
  {
    id: "cmp-3",
    number: "CMP-2026-003",
    title: "Unusual odor in Paracetamol 500mg tablets",
    description:
      "Customer reported a chemical-like odor from newly received Paracetamol 500mg tablets batch PAR-FP-2026-112. Odor noticed upon opening the bottle.",
    source: "customer",
    category: "quality",
    product: "Paracetamol 500mg Tablets",
    batch: "PAR-FP-2026-112",
    complainant: {
      name: "Misr Pharmacy",
      phone: "+20-2-4567-8901",
      email: "info@misrpharmacy.com.eg",
    },
    severity: "major",
    status: "investigation",
    receivedAt: daysAgo(5),
    receivedBy: "Pharm. Dina Mansour",
    dueDate: futureDays(25),
    department: "QC",
    timeline: [
      { status: "received", date: daysAgo(5), actor: "Pharm. Dina Mansour", notes: "Complaint received with returned sample." },
      { status: "acknowledged", date: daysAgo(4), actor: "Pharm. Dina Mansour", notes: "Acknowledgment sent. Sample forwarded to QC lab." },
      { status: "investigation", date: daysAgo(3), actor: "Dr. Rania Abdel-Aziz", notes: "GC headspace analysis initiated on returned sample and reserve sample." },
    ],
    investigation: {
      investigator: "Dr. Rania Abdel-Aziz",
      startedAt: daysAgo(3),
      findings: "GC headspace analysis in progress. Preliminary results show trace solvent residue slightly above typical levels. Full analysis pending.",
      method: "GC headspace analysis + organoleptic evaluation",
    },
  },
  {
    id: "cmp-4",
    number: "CMP-2026-004",
    title: "Short count in Ciprofloxacin 500mg tablet bottle",
    description:
      "Customer received a 30-count bottle of Ciprofloxacin 500mg containing only 28 tablets. Batch CIP-FP-2026-067.",
    source: "customer",
    category: "quality",
    product: "Ciprofloxacin 500mg Tablets",
    batch: "CIP-FP-2026-067",
    complainant: {
      name: "Nile Valley Medical Center",
      organization: "Nile Valley Healthcare",
      phone: "+20-2-5678-9012",
      email: "pharmacy@nilevalleymc.com.eg",
    },
    severity: "minor",
    status: "response-sent",
    receivedAt: daysAgo(25),
    receivedBy: "Pharm. Dina Mansour",
    dueDate: daysAgo(5),
    department: "Production",
    timeline: [
      { status: "received", date: daysAgo(25), actor: "Pharm. Dina Mansour", notes: "Complaint logged." },
      { status: "acknowledged", date: daysAgo(24), actor: "Pharm. Dina Mansour", notes: "Acknowledgment sent." },
      { status: "investigation", date: daysAgo(22), actor: "Eng. Mohamed Fathy", notes: "Counting machine inspection initiated." },
      { status: "root-cause", date: daysAgo(18), actor: "Eng. Mohamed Fathy", notes: "Counting sensor misalignment on Channel 3 of counting machine." },
      { status: "capa-required", date: daysAgo(16), actor: "Dr. Laila Farouk", notes: "Preventive maintenance update required." },
      { status: "response-sent", date: daysAgo(12), actor: "Pharm. Dina Mansour", notes: "Response with replacement sent." },
    ],
    investigation: {
      investigator: "Eng. Mohamed Fathy",
      startedAt: daysAgo(22),
      completedAt: daysAgo(18),
      findings: "Counting sensor on Channel 3 was misaligned by 2mm, causing occasional double-count on small tablets. Reserve sample check of 20 bottles found 1 additional short-count.",
      rootCause: "Optical counting sensor misalignment on Channel 3 due to vibration during operation.",
      impactAssessment: "Low impact. Statistical check of reserve samples shows <1% defect rate.",
      affectedBatches: ["CIP-FP-2026-067"],
      method: "Equipment inspection + reserve sample verification",
    },
    response: {
      responseText: "Investigation confirmed counting machine sensor issue. Corrective action taken. Replacement product sent.",
      sentTo: "Nile Valley Medical Center",
      sentDate: daysAgo(12),
      sentBy: "Pharm. Dina Mansour",
      acknowledgment: true,
      acknowledgmentDate: daysAgo(10),
    },
  },

  // === 3 Packaging Issues ===
  {
    id: "cmp-5",
    number: "CMP-2026-005",
    title: "Incomplete blister seal on Omeprazole 20mg capsules",
    description:
      "Distributor reported 2 blister strips with incomplete heat seal along the edge. Product: Omeprazole 20mg capsules, batch OMP-FP-2026-089.",
    source: "distributor",
    category: "packaging",
    product: "Omeprazole 20mg Capsules",
    batch: "OMP-FP-2026-089",
    complainant: {
      name: "Pharma Distribution Egypt",
      organization: "PDE S.A.E.",
      phone: "+20-2-6789-0123",
      email: "quality@pde-egypt.com",
    },
    severity: "major",
    status: "root-cause",
    receivedAt: daysAgo(12),
    receivedBy: "Pharm. Dina Mansour",
    dueDate: futureDays(18),
    department: "Production",
    timeline: [
      { status: "received", date: daysAgo(12), actor: "Pharm. Dina Mansour", notes: "Complaint received from distributor with defective samples." },
      { status: "acknowledged", date: daysAgo(11), actor: "Pharm. Dina Mansour", notes: "Acknowledgment sent." },
      { status: "investigation", date: daysAgo(10), actor: "Eng. Mohamed Fathy", notes: "Sealing station inspection on Packaging Line 1." },
      { status: "root-cause", date: daysAgo(6), actor: "Eng. Mohamed Fathy", notes: "Heating element temperature drift identified." },
    ],
    investigation: {
      investigator: "Eng. Mohamed Fathy",
      startedAt: daysAgo(10),
      completedAt: daysAgo(6),
      findings: "Sealing station on Packaging Line 1 showed temperature variation of +/-8C vs specification of +/-3C. Thermocouple response time degraded.",
      rootCause: "Degraded thermocouple in sealing station resulting in inconsistent seal temperature control.",
      impactAssessment: "Potential integrity issue for affected blister strips. Product stability may be compromised for incompletely sealed units.",
      affectedBatches: ["OMP-FP-2026-089"],
      method: "Temperature profiling + seal integrity testing",
    },
  },
  {
    id: "cmp-6",
    number: "CMP-2026-006",
    title: "Torn foil on Ranitidine 150mg blister pack",
    description:
      "Multiple blister packs with pre-torn push-through foil reported by customer. Ranitidine 150mg tablets batch RAN-FP-2026-022.",
    source: "customer",
    category: "packaging",
    product: "Ranitidine 150mg Tablets",
    batch: "RAN-FP-2026-022",
    complainant: {
      name: "Cairo University Hospitals Pharmacy",
      organization: "Cairo University Hospitals",
      phone: "+20-2-7890-1234",
      email: "pharmacy@cuh.edu.eg",
    },
    severity: "minor",
    status: "closed",
    receivedAt: daysAgo(45),
    receivedBy: "Pharm. Dina Mansour",
    dueDate: daysAgo(15),
    department: "Production",
    timeline: [
      { status: "received", date: daysAgo(45), actor: "Pharm. Dina Mansour", notes: "Complaint received." },
      { status: "acknowledged", date: daysAgo(44), actor: "Pharm. Dina Mansour", notes: "Acknowledgment sent." },
      { status: "investigation", date: daysAgo(42), actor: "Eng. Mohamed Fathy", notes: "Foil specification review initiated." },
      { status: "root-cause", date: daysAgo(36), actor: "Eng. Mohamed Fathy", notes: "Foil thickness below minimum spec from supplier." },
      { status: "capa-required", date: daysAgo(34), actor: "Dr. Laila Farouk", notes: "Supplier quality review required." },
      { status: "response-sent", date: daysAgo(28), actor: "Pharm. Dina Mansour", notes: "Response sent with replacement." },
      { status: "closed", date: daysAgo(22), actor: "Dr. Laila Farouk", notes: "Closed after customer acknowledgment." },
    ],
    investigation: {
      investigator: "Eng. Mohamed Fathy",
      startedAt: daysAgo(42),
      completedAt: daysAgo(36),
      findings: "Foil thickness measured at 18 microns vs specification of 20-25 microns. Supplier COA showed 20 microns but incoming QC confirmed 18 microns.",
      rootCause: "Supplier delivered foil below minimum thickness specification. Incoming QC sampling plan missed the defect in initial release.",
      impactAssessment: "Product integrity not compromised but user experience affected. No safety concern.",
      affectedBatches: ["RAN-FP-2026-022"],
      method: "Material testing + supplier audit",
    },
    response: {
      responseText: "Investigation confirmed foil thickness issue from supplier. Supplier notified and incoming QC plan tightened. Replacement product provided.",
      sentTo: "Cairo University Hospitals Pharmacy",
      sentDate: daysAgo(28),
      sentBy: "Pharm. Dina Mansour",
      acknowledgment: true,
      acknowledgmentDate: daysAgo(26),
    },
    closedAt: daysAgo(22),
    closedBy: "Dr. Laila Farouk",
  },
  {
    id: "cmp-7",
    number: "CMP-2026-007",
    title: "Child-resistant cap failure on Ibuprofen syrup",
    description:
      "Customer reported child-resistant cap on Ibuprofen 100mg/5ml syrup can be opened without engaging the safety mechanism. Batch IBU-SYR-2026-034.",
    source: "customer",
    category: "packaging",
    product: "Ibuprofen 100mg/5ml Syrup",
    batch: "IBU-SYR-2026-034",
    complainant: {
      name: "Smart Care Pharmacy",
      phone: "+20-2-8901-2345",
      email: "smartcarepharm@gmail.com",
    },
    severity: "critical",
    status: "capa-required",
    receivedAt: daysAgo(8),
    receivedBy: "Pharm. Dina Mansour",
    dueDate: futureDays(7),
    department: "Production",
    timeline: [
      { status: "received", date: daysAgo(8), actor: "Pharm. Dina Mansour", notes: "Critical complaint - child safety issue. Escalated immediately." },
      { status: "acknowledged", date: daysAgo(8), actor: "Pharm. Dina Mansour", notes: "Same-day acknowledgment with escalation to QA Head." },
      { status: "investigation", date: daysAgo(7), actor: "Eng. Mohamed Fathy", notes: "Urgent investigation. 100% inspection of retained samples initiated." },
      { status: "root-cause", date: daysAgo(4), actor: "Eng. Mohamed Fathy", notes: "Cap inner ring mold defect in batch from cap supplier." },
      { status: "capa-required", date: daysAgo(3), actor: "Dr. Laila Farouk", notes: "CAPA opened. Market action assessment in progress." },
    ],
    investigation: {
      investigator: "Eng. Mohamed Fathy",
      startedAt: daysAgo(7),
      completedAt: daysAgo(4),
      findings: "Inner locking ring on CR cap is undersized by 0.5mm. 100% inspection of retained samples (50 units) found 8% defect rate. Supplier cap mold cavity #4 confirmed as source.",
      rootCause: "Defective mold cavity #4 at cap supplier producing undersized locking rings, bypassing child-resistant mechanism.",
      impactAssessment: "Patient safety risk - pediatric product. Market recall assessment required for affected batch.",
      affectedBatches: ["IBU-SYR-2026-034"],
      method: "Dimensional analysis + 100% inspection",
    },
  },

  // === 2 Adverse Events (Regulatory Reportable) ===
  {
    id: "cmp-8",
    number: "CMP-2026-008",
    title: "Severe allergic reaction after Cephalexin 500mg administration",
    description:
      "Patient reported severe urticaria and facial edema within 30 minutes of taking Cephalexin 500mg capsule from batch CEP-FP-2026-015. Patient required emergency treatment.",
    source: "patient",
    category: "adverse-event",
    product: "Cephalexin 500mg Capsules",
    batch: "CEP-FP-2026-015",
    complainant: {
      name: "Dr. Fatma Ibrahim",
      organization: "Ain Shams University Hospital",
      phone: "+20-2-9012-3456",
      email: "f.ibrahim@asuh.edu.eg",
    },
    severity: "critical",
    status: "investigation",
    receivedAt: daysAgo(3),
    receivedBy: "Pharm. Dina Mansour",
    dueDate: futureDays(12),
    department: "Pharmacovigilance",
    timeline: [
      { status: "received", date: daysAgo(3), actor: "Pharm. Dina Mansour", notes: "Adverse event report received from treating physician. Immediately escalated to Pharmacovigilance." },
      { status: "acknowledged", date: daysAgo(3), actor: "Dr. Nadia Soliman", notes: "Same-day acknowledgment. EDA initial notification submitted within 24 hours." },
      { status: "investigation", date: daysAgo(2), actor: "Dr. Nadia Soliman", notes: "Pharmacovigilance investigation initiated. Reserve samples pulled for testing." },
    ],
    investigation: {
      investigator: "Dr. Nadia Soliman",
      startedAt: daysAgo(2),
      findings: "Patient has no documented penicillin/cephalosporin allergy. Reserve sample testing initiated for impurity profiling. Cross-reactivity assessment pending.",
      method: "Pharmacovigilance investigation + impurity profiling",
    },
    regulatoryReport: {
      reportable: true,
      reportType: "MedWatch",
      reportNumber: "EDA-AE-2026-0087",
      submittedDate: daysAgo(2),
      submittedBy: "Dr. Nadia Soliman",
      agency: "Egyptian Drug Authority (EDA)",
      description: "Severe allergic reaction (urticaria + angioedema) following Cephalexin 500mg oral administration. Patient required ER treatment with epinephrine and IV corticosteroids. Recovered.",
      patientOutcome: "Recovered with treatment",
      followUpRequired: true,
      followUpDate: futureDays(13),
      status: "submitted",
    },
  },
  {
    id: "cmp-9",
    number: "CMP-2026-009",
    title: "Unexpected drowsiness with Loratadine 10mg tablets",
    description:
      "3 patients from same pharmacy reported excessive drowsiness after taking Loratadine 10mg (non-sedating antihistamine) from batch LOR-FP-2026-044. Effect inconsistent with product profile.",
    source: "patient",
    category: "adverse-event",
    product: "Loratadine 10mg Tablets",
    batch: "LOR-FP-2026-044",
    complainant: {
      name: "Dr. Ahmed Mostafa",
      organization: "Heliopolis Medical Center",
      phone: "+20-2-0123-4567",
      email: "a.mostafa@heliomc.com.eg",
    },
    severity: "critical",
    status: "root-cause",
    receivedAt: daysAgo(14),
    receivedBy: "Pharm. Dina Mansour",
    dueDate: futureDays(16),
    department: "Pharmacovigilance",
    timeline: [
      { status: "received", date: daysAgo(14), actor: "Pharm. Dina Mansour", notes: "Multiple patient reports of unexpected pharmacological effect." },
      { status: "acknowledged", date: daysAgo(14), actor: "Dr. Nadia Soliman", notes: "Same-day escalation to Pharmacovigilance and QC." },
      { status: "investigation", date: daysAgo(13), actor: "Dr. Rania Abdel-Aziz", notes: "Urgent identity and assay testing on reserve samples and returned product." },
      { status: "root-cause", date: daysAgo(7), actor: "Dr. Rania Abdel-Aziz", notes: "HPLC analysis revealed trace cross-contamination with Chlorpheniramine from shared manufacturing line." },
    ],
    investigation: {
      investigator: "Dr. Rania Abdel-Aziz",
      startedAt: daysAgo(13),
      completedAt: daysAgo(7),
      findings: "HPLC analysis of returned samples detected Chlorpheniramine maleate at approximately 0.8mg per tablet. This sedating antihistamine is manufactured on the same equipment. Cleaning validation review shows gaps in swab testing protocol.",
      rootCause: "Cross-contamination with Chlorpheniramine maleate from shared manufacturing equipment due to inadequate cleaning validation.",
      impactAssessment: "Significant patient safety concern. Batch recall recommended. Cleaning validation for shared equipment requires immediate review.",
      affectedBatches: ["LOR-FP-2026-044"],
      method: "HPLC impurity profiling + cleaning validation review",
    },
    regulatoryReport: {
      reportable: true,
      reportType: "MedWatch",
      reportNumber: "EDA-AE-2026-0082",
      submittedDate: daysAgo(12),
      submittedBy: "Dr. Nadia Soliman",
      agency: "Egyptian Drug Authority (EDA)",
      description: "Cross-contamination of Loratadine 10mg tablets with Chlorpheniramine maleate. 3 patients experienced unexpected sedation. No serious harm reported but batch recall under evaluation.",
      patientOutcome: "Recovered without treatment",
      followUpRequired: true,
      followUpDate: futureDays(2),
      status: "acknowledged",
    },
  },

  // === 2 Distributor Complaints ===
  {
    id: "cmp-10",
    number: "CMP-2026-010",
    title: "Incorrect expiry date printed on Metformin 500mg cartons",
    description:
      "Distributor identified batch of Metformin 500mg with expiry date printed as 12/2028 on outer carton but 12/2027 on blister strips. Batch MET-FP-2026-033.",
    source: "distributor",
    category: "labeling",
    product: "Metformin 500mg Tablets",
    batch: "MET-FP-2026-033",
    complainant: {
      name: "National Pharma Distribution",
      organization: "NPD Egypt",
      phone: "+20-2-1234-5670",
      email: "qa@npd-egypt.com",
    },
    severity: "critical",
    status: "response-sent",
    receivedAt: daysAgo(20),
    receivedBy: "Pharm. Dina Mansour",
    dueDate: daysAgo(2),
    department: "Production",
    timeline: [
      { status: "received", date: daysAgo(20), actor: "Pharm. Dina Mansour", notes: "Critical labeling discrepancy reported by distributor." },
      { status: "acknowledged", date: daysAgo(20), actor: "Pharm. Dina Mansour", notes: "Immediate acknowledgment. Distribution hold placed." },
      { status: "investigation", date: daysAgo(19), actor: "Eng. Mohamed Fathy", notes: "Printing records and batch documentation review." },
      { status: "root-cause", date: daysAgo(15), actor: "Eng. Mohamed Fathy", notes: "Carton printer date code not updated after previous batch." },
      { status: "capa-required", date: daysAgo(13), actor: "Dr. Laila Farouk", notes: "CAPA for printer verification procedure." },
      { status: "response-sent", date: daysAgo(8), actor: "Pharm. Dina Mansour", notes: "Formal response sent. Product recall from distribution initiated." },
    ],
    investigation: {
      investigator: "Eng. Mohamed Fathy",
      startedAt: daysAgo(19),
      completedAt: daysAgo(15),
      findings: "Carton printing unit date code was set to 12/2028 (previous product) and not updated for Metformin 500mg (correct expiry 12/2027). Line clearance checklist did not include date code verification.",
      rootCause: "Line clearance checklist missing date code verification step. Operator did not verify printed date against batch record.",
      impactAssessment: "12,000 cartons with incorrect expiry date in distribution. Product recall required for relabeling.",
      affectedBatches: ["MET-FP-2026-033"],
      method: "Document review + printing records audit",
    },
    response: {
      responseText: "Investigation confirmed printing error. Voluntary recall initiated for batch MET-FP-2026-033. Line clearance procedure updated to include mandatory date code verification.",
      sentTo: "National Pharma Distribution",
      sentDate: daysAgo(8),
      sentBy: "Pharm. Dina Mansour",
    },
  },
  {
    id: "cmp-11",
    number: "CMP-2026-011",
    title: "Missing patient information leaflet in Atorvastatin 20mg packs",
    description:
      "Distributor found 15% of inspected Atorvastatin 20mg cartons missing the patient information leaflet. Batch ATV-FP-2026-028.",
    source: "distributor",
    category: "packaging",
    product: "Atorvastatin 20mg Tablets",
    batch: "ATV-FP-2026-028",
    complainant: {
      name: "Delta Pharma Logistics",
      organization: "Delta Pharma Group",
      phone: "+20-2-2345-6780",
      email: "quality@deltapharma.com.eg",
    },
    severity: "major",
    status: "acknowledged",
    receivedAt: daysAgo(2),
    receivedBy: "Pharm. Dina Mansour",
    dueDate: futureDays(28),
    department: "Production",
    timeline: [
      { status: "received", date: daysAgo(2), actor: "Pharm. Dina Mansour", notes: "Complaint received from distributor during incoming inspection." },
      { status: "acknowledged", date: daysAgo(1), actor: "Pharm. Dina Mansour", notes: "Acknowledgment sent. Distribution hold recommended pending investigation." },
    ],
  },

  // === 2 Internal Complaints ===
  {
    id: "cmp-12",
    number: "CMP-2026-012",
    title: "Particle contamination detected in WFI system during routine monitoring",
    description:
      "Internal QC monitoring detected elevated particulate counts (>25 particles/ml at 10um) in Water for Injection from point of use POU-7 in sterile manufacturing area.",
    source: "internal",
    category: "quality",
    product: "Water for Injection (WFI)",
    batch: "WFI-2026-W18",
    complainant: {
      name: "Dr. Rania Abdel-Aziz",
      organization: "QC Department",
      email: "r.abdelaziz@company.com.eg",
    },
    severity: "critical",
    status: "investigation",
    receivedAt: daysAgo(4),
    receivedBy: "Dr. Rania Abdel-Aziz",
    dueDate: futureDays(10),
    department: "Engineering",
    timeline: [
      { status: "received", date: daysAgo(4), actor: "Dr. Rania Abdel-Aziz", notes: "OOL result during routine WFI monitoring. Production hold on sterile line." },
      { status: "acknowledged", date: daysAgo(4), actor: "Dr. Laila Farouk", notes: "Immediate escalation. All sterile batches from W18 quarantined." },
      { status: "investigation", date: daysAgo(3), actor: "Eng. Tarek Nour", notes: "WFI distribution loop and filter inspection initiated." },
    ],
    investigation: {
      investigator: "Eng. Tarek Nour",
      startedAt: daysAgo(3),
      findings: "Preliminary inspection shows degradation of final 0.22um filter at POU-7. Filter integrity test failed. All other points of use passed. Investigation ongoing to determine root cause of filter failure.",
      method: "Filter integrity testing + particulate analysis",
    },
  },
  {
    id: "cmp-13",
    number: "CMP-2026-013",
    title: "Label mix-up near-miss caught during secondary packaging",
    description:
      "Internal near-miss: Operator caught wrong labels loaded on packaging line during setup for Amlodipine 5mg. Labels were for Amlodipine 10mg. Caught before any product was labeled.",
    source: "internal",
    category: "labeling",
    product: "Amlodipine 5mg Tablets",
    batch: "AML-FP-2026-091",
    complainant: {
      name: "Pharm. Mariam Khalil",
      organization: "Production Department",
      email: "m.khalil@company.com.eg",
    },
    severity: "major",
    status: "closed",
    receivedAt: daysAgo(30),
    receivedBy: "Pharm. Mariam Khalil",
    dueDate: daysAgo(10),
    department: "Production",
    timeline: [
      { status: "received", date: daysAgo(30), actor: "Pharm. Mariam Khalil", notes: "Near-miss reported by packaging operator during line clearance check." },
      { status: "acknowledged", date: daysAgo(30), actor: "Dr. Laila Farouk", notes: "Good catch acknowledged. Investigation initiated." },
      { status: "investigation", date: daysAgo(29), actor: "Pharm. Mariam Khalil", notes: "Line clearance process review." },
      { status: "root-cause", date: daysAgo(25), actor: "Pharm. Mariam Khalil", notes: "Both Amlodipine strengths stored in adjacent bins in label storage." },
      { status: "capa-required", date: daysAgo(23), actor: "Dr. Laila Farouk", notes: "Label storage segregation CAPA initiated." },
      { status: "response-sent", date: daysAgo(18), actor: "Dr. Laila Farouk", notes: "Internal report circulated." },
      { status: "closed", date: daysAgo(15), actor: "Dr. Laila Farouk", notes: "Closed. Label storage reorganized with color-coded bins." },
    ],
    investigation: {
      investigator: "Pharm. Mariam Khalil",
      startedAt: daysAgo(29),
      completedAt: daysAgo(25),
      findings: "Labels for Amlodipine 5mg and 10mg stored in adjacent bins without visual differentiation. Similar label design increases risk of mix-up.",
      rootCause: "Inadequate segregation of similar-product labels in storage. No visual differentiation system for look-alike labels.",
      impactAssessment: "No product impact (near-miss). However, potential for serious patient harm if label mix-up reached market.",
      affectedBatches: ["AML-FP-2026-091"],
      method: "Process review + human factors analysis",
    },
    closedAt: daysAgo(15),
    closedBy: "Dr. Laila Farouk",
  },

  // === 2 Labeling Complaints ===
  {
    id: "cmp-14",
    number: "CMP-2026-014",
    title: "Arabic text error on Diclofenac 50mg patient leaflet",
    description:
      "Regulatory authority flagged incorrect Arabic dosing instructions on patient information leaflet for Diclofenac Sodium 50mg tablets. Leaflet states 'three times daily' instead of 'twice daily'. Batch DIC-FP-2026-056.",
    source: "regulatory",
    category: "labeling",
    product: "Diclofenac Sodium 50mg Tablets",
    batch: "DIC-FP-2026-056",
    complainant: {
      name: "EDA Inspection Division",
      organization: "Egyptian Drug Authority",
      phone: "+20-2-3456-7891",
      email: "inspection@eda.gov.eg",
    },
    severity: "critical",
    status: "capa-required",
    receivedAt: daysAgo(10),
    receivedBy: "Dr. Laila Farouk",
    dueDate: futureDays(5),
    department: "Regulatory Affairs",
    timeline: [
      { status: "received", date: daysAgo(10), actor: "Dr. Laila Farouk", notes: "Regulatory notification from EDA regarding labeling error." },
      { status: "acknowledged", date: daysAgo(10), actor: "Dr. Laila Farouk", notes: "Immediate acknowledgment to EDA." },
      { status: "investigation", date: daysAgo(9), actor: "Dr. Nadia Soliman", notes: "Leaflet artwork review against approved text." },
      { status: "root-cause", date: daysAgo(7), actor: "Dr. Nadia Soliman", notes: "Translation error in artwork revision. Change control approval missed the error." },
      { status: "capa-required", date: daysAgo(5), actor: "Dr. Laila Farouk", notes: "CAPA required. Market action for leaflet replacement." },
    ],
    investigation: {
      investigator: "Dr. Nadia Soliman",
      startedAt: daysAgo(9),
      completedAt: daysAgo(7),
      findings: "Artwork revision CC-2026-034 introduced a translation error in Arabic dosing section. The English text is correct. Proofreading step was performed by non-Arabic-speaking reviewer.",
      rootCause: "Artwork proofreading process does not require review by native Arabic speaker for Arabic text. Translation error introduced during revision.",
      impactAssessment: "Patient safety risk due to potential overdosing. All distributed units must have corrected leaflets. EDA notification required.",
      affectedBatches: ["DIC-FP-2026-056", "DIC-FP-2026-057"],
      method: "Document review + artwork comparison",
    },
    regulatoryReport: {
      reportable: true,
      reportType: "field-alert",
      reportNumber: "FA-2026-003",
      submittedDate: daysAgo(8),
      submittedBy: "Dr. Nadia Soliman",
      agency: "Egyptian Drug Authority (EDA)",
      description: "Incorrect Arabic dosing instructions on patient information leaflet for Diclofenac 50mg. Leaflet states TID instead of BID. Field safety corrective action initiated.",
      followUpRequired: true,
      followUpDate: futureDays(7),
      status: "submitted",
    },
  },
  {
    id: "cmp-15",
    number: "CMP-2026-015",
    title: "Faded barcode on Losartan 50mg cartons unreadable by scanner",
    description:
      "Multiple pharmacy chains reported barcodes on Losartan 50mg cartons are too faded to scan at point of sale. Batch LOS-FP-2026-078.",
    source: "customer",
    category: "labeling",
    product: "Losartan 50mg Tablets",
    batch: "LOS-FP-2026-078",
    complainant: {
      name: "Seif Pharmacy Chain",
      organization: "Seif Pharmacies",
      phone: "+20-2-4567-8902",
      email: "supply@seifpharmacy.com.eg",
    },
    severity: "minor",
    status: "received",
    receivedAt: daysAgo(1),
    receivedBy: "Pharm. Dina Mansour",
    dueDate: futureDays(29),
    department: "Production",
    timeline: [
      { status: "received", date: daysAgo(1), actor: "Pharm. Dina Mansour", notes: "Complaint received. Multiple pharmacies affected." },
    ],
  },
];

// ─── Status Order ─────────────────────────────────────────────────────────────

const STATUS_ORDER: Record<ComplaintStatus, number> = {
  received: 0,
  acknowledged: 1,
  investigation: 2,
  "root-cause": 3,
  "capa-required": 4,
  "response-sent": 5,
  closed: 6,
};

const NEXT_STATUS: Partial<Record<ComplaintStatus, ComplaintStatus>> = {
  received: "acknowledged",
  acknowledged: "investigation",
  investigation: "root-cause",
  "root-cause": "capa-required",
  "capa-required": "response-sent",
  "response-sent": "closed",
};

// ─── Store ─────────────────────────────────────────────────────────────────────

class ComplaintStore {
  private static instance: ComplaintStore;

  private constructor() {
    this.seed();
  }

  static getInstance(): ComplaintStore {
    if (!ComplaintStore.instance) {
      ComplaintStore.instance = new ComplaintStore();
    }
    return ComplaintStore.instance;
  }

  private seed(): void {
    if (typeof window === "undefined") return;
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
    }
  }

  private load(): Complaint[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Complaint[]) : [];
  }

  private save(data: Complaint[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────

  getAll(): Complaint[] {
    return this.load();
  }

  getById(id: string): Complaint | undefined {
    return this.load().find((c) => c.id === id);
  }

  create(complaint: Omit<Complaint, "id" | "number">): Complaint {
    const all = this.load();
    const newComplaint: Complaint = {
      ...complaint,
      id: `cmp-${Date.now()}`,
      number: this.generateNumber(),
    };
    all.push(newComplaint);
    this.save(all);
    return newComplaint;
  }

  update(id: string, updates: Partial<Complaint>): Complaint | undefined {
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

  getByStatus(status: ComplaintStatus): Complaint[] {
    return this.load().filter((c) => c.status === status);
  }

  getBySource(source: ComplaintSource): Complaint[] {
    return this.load().filter((c) => c.source === source);
  }

  getByCategory(category: ComplaintCategory): Complaint[] {
    return this.load().filter((c) => c.category === category);
  }

  getReportable(): Complaint[] {
    return this.load().filter((c) => c.regulatoryReport?.reportable === true);
  }

  getOverdue(): Complaint[] {
    const now = new Date();
    return this.load().filter(
      (c) => c.status !== "closed" && new Date(c.dueDate) < now
    );
  }

  getOpen(): Complaint[] {
    return this.load().filter((c) => c.status !== "closed");
  }

  // ─── Workflow Methods ────────────────────────────────────────────────────

  advanceStatus(id: string): Complaint | undefined {
    const complaint = this.getById(id);
    if (!complaint) return undefined;
    const next = NEXT_STATUS[complaint.status];
    if (!next) return undefined;

    const timelineEvent: ComplaintTimelineEvent = {
      status: next,
      date: new Date().toISOString(),
      actor: "Current User",
      notes: `Status advanced to ${next}`,
    };

    const updates: Partial<Complaint> = {
      status: next,
      timeline: [...complaint.timeline, timelineEvent],
    };
    if (next === "closed") {
      updates.closedAt = new Date().toISOString();
      updates.closedBy = "Current User";
    }
    return this.update(id, updates);
  }

  addTimelineEvent(
    id: string,
    event: ComplaintTimelineEvent
  ): Complaint | undefined {
    const complaint = this.getById(id);
    if (!complaint) return undefined;
    return this.update(id, {
      timeline: [...complaint.timeline, event],
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  generateNumber(): string {
    const all = this.load();
    const year = new Date().getFullYear();
    const yearPrefix = `CMP-${year}-`;
    const existing = all
      .filter((c) => c.number.startsWith(yearPrefix))
      .map((c) => parseInt(c.number.replace(yearPrefix, ""), 10))
      .filter((n) => !isNaN(n));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `${yearPrefix}${String(next).padStart(3, "0")}`;
  }

  getStatusOrder(status: ComplaintStatus): number {
    return STATUS_ORDER[status];
  }

  getMetrics(): ComplaintMetrics {
    const all = this.load();
    const now = new Date();

    const open = all.filter((c) => c.status !== "closed");
    const overdue = all.filter(
      (c) => c.status !== "closed" && new Date(c.dueDate) < now
    );

    // Average response days for complaints with responses
    const responded = all.filter((c) => c.response?.sentDate);
    const avgResponseDays =
      responded.length > 0
        ? Math.round(
            responded.reduce(
              (sum, c) => sum + daysBetween(c.receivedAt, c.response!.sentDate),
              0
            ) / responded.length
          )
        : 0;

    // Regulatory reports
    const regulatoryReports = all.filter(
      (c) => c.regulatoryReport?.reportable === true
    ).length;

    // By source
    const srcMap = new Map<string, number>();
    all.forEach((c) => srcMap.set(c.source, (srcMap.get(c.source) || 0) + 1));
    const bySource = Array.from(srcMap.entries()).map(([source, count]) => ({
      source,
      count,
    }));

    // By category
    const catMap = new Map<string, number>();
    all.forEach((c) =>
      catMap.set(c.category, (catMap.get(c.category) || 0) + 1)
    );
    const byCategory = Array.from(catMap.entries()).map(
      ([category, count]) => ({ category, count })
    );

    // By severity
    const sevMap = new Map<string, number>();
    all.forEach((c) =>
      sevMap.set(c.severity, (sevMap.get(c.severity) || 0) + 1)
    );
    const bySeverity = Array.from(sevMap.entries()).map(
      ([severity, count]) => ({ severity, count })
    );

    return {
      total: all.length,
      open: open.length,
      avgResponseDays,
      regulatoryReports,
      overdue: overdue.length,
      bySource,
      byCategory,
      bySeverity,
    };
  }
}

export const complaintStore = ComplaintStore.getInstance();
