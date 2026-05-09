"use client";

import type {
  Equipment,
  EquipmentType,
  EquipmentStatus,
  EquipmentCriticality,
  CalibrationRecord,
  CalibrationResult,
  MaintenanceOrder,
  MaintenanceType,
  MaintenanceOrderStatus,
  MaintenanceSchedule,
  ScheduleFrequency,
  EquipmentMetrics,
  CalendarEvent,
  CalendarEventType,
} from "./equipment-types";

const STORAGE_KEY = "pharma.equipment";

/* ── helpers ─────────────────────────────────────────────── */

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function futureDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function toISO(d: string): string {
  return new Date(d).toISOString().slice(0, 10);
}

/* ── Seed: Equipment ──────────────────────────────────────── */

const SEED_EQUIPMENT: Equipment[] = [
  {
    id: "eq-001", assetTag: "PRD-TP-001", name: "Tablet Press - Cadmach CU-45",
    type: "production", model: "CU-45", serialNumber: "CM-2019-4501",
    manufacturer: "Cadmach", location: "Production Block A, Room A-101",
    department: "Production - Solid Dosage", criticality: "critical",
    status: "operational", installationDate: "2019-06-15",
    lastCalibrationDate: daysAgo(45), nextCalibrationDue: futureDays(45),
    lastMaintenanceDate: daysAgo(20), nextMaintenanceDue: futureDays(10),
  },
  {
    id: "eq-002", assetTag: "LAB-HPLC-001", name: "HPLC System - Agilent 1260 Infinity II",
    type: "lab", model: "1260 Infinity II", serialNumber: "AG-2020-1261A",
    manufacturer: "Agilent Technologies", location: "QC Lab, Room L-301",
    department: "Quality Control", criticality: "critical",
    status: "calibration-due", installationDate: "2020-07-01",
    lastCalibrationDate: daysAgo(100), nextCalibrationDue: daysAgo(10),
    lastMaintenanceDate: daysAgo(50), nextMaintenanceDue: futureDays(40),
  },
  {
    id: "eq-003", assetTag: "UTL-WP-001", name: "Water Purification System - MECO PureGen",
    type: "water-system", model: "PureGen 6000", serialNumber: "MC-2019-6001",
    manufacturer: "MECO", location: "Utility Block, Room U-001",
    department: "Engineering - Utilities", criticality: "critical",
    status: "operational", installationDate: "2019-01-05",
    lastCalibrationDate: daysAgo(10), nextCalibrationDue: futureDays(80),
    lastMaintenanceDate: daysAgo(14), nextMaintenanceDue: futureDays(16),
  },
  {
    id: "eq-004", assetTag: "PRD-GR-001", name: "High-Shear Granulator - Diosna P250",
    type: "production", model: "P250", serialNumber: "DI-2017-2501",
    manufacturer: "Diosna", location: "Production Block A, Room A-102",
    department: "Production - Solid Dosage", criticality: "critical",
    status: "out-of-service", installationDate: "2017-09-12",
    lastCalibrationDate: daysAgo(120), nextCalibrationDue: daysAgo(30),
    lastMaintenanceDate: daysAgo(10), nextMaintenanceDue: futureDays(80),
    notes: "Awaiting replacement gearbox. Expected delivery in 2 weeks.",
  },
];

/* ── Seed: Calibration Records ────────────────────────────── */

const SEED_CALIBRATIONS: CalibrationRecord[] = [
  // eq-001 Tablet Press
  { id: "cal-001", equipmentId: "eq-001", calibrationDate: daysAgo(45), nextDueDate: futureDays(45),
    standardUsed: "Certified Force Gauge 50kN (NIST Traceable)", standardCertificate: "NIST-FG-2025-1122",
    result: "pass", certificateNumber: "CAL-2026-001", performedBy: "Eng. Ahmed Mostafa",
    verifiedBy: "Dr. Laila Farouk", asFoundReadings: "Main compression: 20.02 kN (spec: 20.0 +/- 0.5 kN)",
    asLeftReadings: "Main compression: 20.02 kN (within spec)", temperatureC: 22.5, humidityPct: 45 },
  { id: "cal-002", equipmentId: "eq-001", calibrationDate: daysAgo(135), nextDueDate: daysAgo(45),
    standardUsed: "Certified Force Gauge 50kN (NIST Traceable)", standardCertificate: "NIST-FG-2025-0887",
    result: "pass", certificateNumber: "CAL-2025-089", performedBy: "Eng. Ahmed Mostafa",
    verifiedBy: "Dr. Laila Farouk", asFoundReadings: "Main compression: 19.98 kN",
    asLeftReadings: "Main compression: 19.98 kN", temperatureC: 23.0, humidityPct: 42 },
  // eq-002 FBD
  { id: "cal-003", equipmentId: "eq-002", calibrationDate: daysAgo(80), nextDueDate: futureDays(10),
    standardUsed: "Calibrated Thermocouple Set (DAkkS)", standardCertificate: "DAK-TC-2025-0445",
    result: "pass", certificateNumber: "CAL-2026-003", performedBy: "Eng. Tarek Nour",
    asFoundReadings: "Inlet temp: 60.1C (spec: 60.0 +/- 1.0C), Exhaust temp: 42.3C",
    asLeftReadings: "Inlet temp: 60.1C, Exhaust temp: 42.3C", temperatureC: 22.0, humidityPct: 48 },
  { id: "cal-004", equipmentId: "eq-002", calibrationDate: daysAgo(170), nextDueDate: daysAgo(80),
    standardUsed: "Calibrated Thermocouple Set (DAkkS)", standardCertificate: "DAK-TC-2024-1201",
    result: "adjusted", certificateNumber: "CAL-2025-078", performedBy: "Eng. Tarek Nour",
    asFoundReadings: "Inlet temp: 61.8C (spec: 60.0 +/- 1.0C) - OUT OF SPEC",
    asLeftReadings: "Inlet temp: 60.0C (adjusted and verified)", temperatureC: 22.5, humidityPct: 46 },
  // eq-003 Coating Machine
  { id: "cal-005", equipmentId: "eq-003", calibrationDate: daysAgo(60), nextDueDate: futureDays(30),
    standardUsed: "Calibrated Spray Rate Meter", standardCertificate: "SRM-2025-0334",
    result: "pass", certificateNumber: "CAL-2026-005", performedBy: "Eng. Ahmed Mostafa",
    asFoundReadings: "Spray rate: 150.2 g/min (spec: 150 +/- 5 g/min), Pan speed: 8.01 rpm",
    asLeftReadings: "Spray rate: 150.2 g/min, Pan speed: 8.01 rpm", temperatureC: 23.0, humidityPct: 40 },
  // eq-004 Blister Packer
  { id: "cal-006", equipmentId: "eq-004", calibrationDate: daysAgo(30), nextDueDate: futureDays(60),
    standardUsed: "Certified Temperature Probe & Pressure Gauge", standardCertificate: "ISO-TP-2025-0892",
    result: "pass", certificateNumber: "CAL-2026-006", performedBy: "Eng. Mohamed Fathy",
    asFoundReadings: "Sealing temp: 180.3C (spec: 180 +/- 3C), Forming pressure: 5.01 bar",
    asLeftReadings: "Sealing temp: 180.3C, Forming pressure: 5.01 bar", temperatureC: 22.0, humidityPct: 44 },
  // eq-005 HPLC #1
  { id: "cal-007", equipmentId: "eq-005", calibrationDate: daysAgo(25), nextDueDate: futureDays(65),
    standardUsed: "USP Caffeine Reference Standard & Holmium Oxide Filter", standardCertificate: "USP-RS-2025-C102",
    result: "pass", certificateNumber: "CAL-2026-007", performedBy: "Agilent Service Engineer",
    verifiedBy: "Dr. Rania Abdel-Aziz", asFoundReadings: "Wavelength accuracy: 254.0 nm (spec: 254.0 +/- 1.0 nm), Flow accuracy: 1.000 ml/min",
    asLeftReadings: "Wavelength: 254.0 nm, Flow: 1.000 ml/min", temperatureC: 22.0, humidityPct: 45 },
  { id: "cal-008", equipmentId: "eq-005", calibrationDate: daysAgo(115), nextDueDate: daysAgo(25),
    standardUsed: "USP Caffeine Reference Standard & Holmium Oxide Filter", standardCertificate: "USP-RS-2025-C089",
    result: "pass", certificateNumber: "CAL-2025-092", performedBy: "Agilent Service Engineer",
    asFoundReadings: "Wavelength accuracy: 254.1 nm, Flow accuracy: 0.999 ml/min",
    asLeftReadings: "Wavelength: 254.1 nm, Flow: 0.999 ml/min", temperatureC: 22.5, humidityPct: 43 },
  // eq-006 HPLC #2 (overdue)
  { id: "cal-009", equipmentId: "eq-006", calibrationDate: daysAgo(100), nextDueDate: daysAgo(10),
    standardUsed: "USP Caffeine Reference Standard & Holmium Oxide Filter", standardCertificate: "USP-RS-2025-C078",
    result: "pass", certificateNumber: "CAL-2025-088", performedBy: "Agilent Service Engineer",
    asFoundReadings: "Wavelength accuracy: 253.9 nm, Flow accuracy: 1.001 ml/min",
    asLeftReadings: "Wavelength: 253.9 nm, Flow: 1.001 ml/min", temperatureC: 22.0, humidityPct: 44 },
  // eq-007 HPLC #3
  { id: "cal-010", equipmentId: "eq-007", calibrationDate: daysAgo(40), nextDueDate: futureDays(50),
    standardUsed: "USP Caffeine Reference Standard", standardCertificate: "USP-RS-2025-C095",
    result: "pass", certificateNumber: "CAL-2026-010", performedBy: "Waters Service Engineer",
    verifiedBy: "Dr. Rania Abdel-Aziz", asFoundReadings: "Wavelength: 254.0 nm, Flow: 1.000 ml/min, Injector precision RSD: 0.3%",
    asLeftReadings: "All within spec", temperatureC: 22.0, humidityPct: 46 },
  // eq-008 Dissolution Tester
  { id: "cal-011", equipmentId: "eq-008", calibrationDate: daysAgo(35), nextDueDate: futureDays(55),
    standardUsed: "USP Dissolution Calibrator Tablets (Prednisone RS)", standardCertificate: "USP-DCT-2025-P034",
    result: "pass", certificateNumber: "CAL-2026-011", performedBy: "Eng. Ahmed Mostafa",
    asFoundReadings: "Paddle speed: 50.0 rpm (spec: 50 +/- 1), Basket speed: 100.1 rpm (spec: 100 +/- 1)",
    asLeftReadings: "Paddle: 50.0 rpm, Basket: 100.1 rpm", temperatureC: 22.0, humidityPct: 45 },
  { id: "cal-012", equipmentId: "eq-008", calibrationDate: daysAgo(125), nextDueDate: daysAgo(35),
    standardUsed: "USP Dissolution Calibrator Tablets (Prednisone RS)", standardCertificate: "USP-DCT-2024-P098",
    result: "adjusted", certificateNumber: "CAL-2025-086", performedBy: "Eng. Ahmed Mostafa",
    asFoundReadings: "Paddle speed: 51.5 rpm (OUT OF SPEC)",
    asLeftReadings: "Paddle speed: 50.0 rpm (adjusted)", temperatureC: 22.5, humidityPct: 44 },
  // eq-009 Balance #1
  { id: "cal-013", equipmentId: "eq-009", calibrationDate: daysAgo(15), nextDueDate: futureDays(75),
    standardUsed: "OIML Class E2 Calibration Weight Set (1mg - 200g)", standardCertificate: "OIML-E2-2025-0567",
    result: "pass", certificateNumber: "CAL-2026-013", performedBy: "Mettler Toledo Service",
    verifiedBy: "Dr. Rania Abdel-Aziz", asFoundReadings: "Linearity: max dev 0.02 mg, Repeatability: 0.01 mg (spec: 0.05 mg)",
    asLeftReadings: "Linearity: 0.02 mg, Repeatability: 0.01 mg", temperatureC: 22.0, humidityPct: 45 },
  // eq-010 Balance #2 (overdue)
  { id: "cal-014", equipmentId: "eq-010", calibrationDate: daysAgo(95), nextDueDate: daysAgo(5),
    standardUsed: "OIML Class E2 Calibration Weight Set (1mg - 200g)", standardCertificate: "OIML-E2-2025-0432",
    result: "pass", certificateNumber: "CAL-2025-085", performedBy: "Mettler Toledo Service",
    asFoundReadings: "Linearity: max dev 0.03 mg, Repeatability: 0.02 mg",
    asLeftReadings: "Linearity: 0.03 mg, Repeatability: 0.02 mg", temperatureC: 22.5, humidityPct: 46 },
  // eq-011 Autoclave
  { id: "cal-015", equipmentId: "eq-011", calibrationDate: daysAgo(20), nextDueDate: futureDays(70),
    standardUsed: "Calibrated Temperature Mapping Probes (12-point)", standardCertificate: "TM-2025-0889",
    result: "pass", certificateNumber: "CAL-2026-015", performedBy: "Getinge Service Engineer",
    verifiedBy: "Dr. Laila Farouk", asFoundReadings: "Temp uniformity: max spread 0.8C (spec: 1.0C), Pressure: 2.05 bar (spec: 2.0 +/- 0.1)",
    asLeftReadings: "Temp spread: 0.8C, Pressure: 2.05 bar", temperatureC: 22.0, humidityPct: 44 },
  // eq-012 Water System
  { id: "cal-016", equipmentId: "eq-012", calibrationDate: daysAgo(10), nextDueDate: futureDays(80),
    standardUsed: "Conductivity Standard 1.413 uS/cm & TOC Standard 500 ppb", standardCertificate: "COND-2025-1413",
    result: "pass", certificateNumber: "CAL-2026-016", performedBy: "Eng. Tarek Nour",
    asFoundReadings: "Conductivity: 0.8 uS/cm (spec: <1.3), TOC: 120 ppb (spec: <500)",
    asLeftReadings: "Conductivity: 0.8 uS/cm, TOC: 120 ppb", temperatureC: 25.0, humidityPct: 50 },
  // eq-013 AHU Production
  { id: "cal-017", equipmentId: "eq-013", calibrationDate: daysAgo(50), nextDueDate: futureDays(40),
    standardUsed: "Calibrated Differential Pressure Gauge & Anemometer", standardCertificate: "DP-2025-0778",
    result: "pass", certificateNumber: "CAL-2026-017", performedBy: "Eng. Mohamed Fathy",
    asFoundReadings: "Room DP: 15.2 Pa (spec: 15 +/- 3 Pa), Air changes: 22/hr (spec: >20)",
    asLeftReadings: "DP: 15.2 Pa, Air changes: 22/hr" },
  // eq-014 AHU Lab
  { id: "cal-018", equipmentId: "eq-014", calibrationDate: daysAgo(55), nextDueDate: futureDays(35),
    standardUsed: "Calibrated Differential Pressure Gauge & Anemometer", standardCertificate: "DP-2025-0779",
    result: "pass", certificateNumber: "CAL-2026-018", performedBy: "Eng. Mohamed Fathy",
    asFoundReadings: "Room DP: 10.1 Pa (spec: 10 +/- 3 Pa), Temp: 22.1C (spec: 22 +/- 2)",
    asLeftReadings: "DP: 10.1 Pa, Temp: 22.1C" },
  // eq-015 Granulator
  { id: "cal-019", equipmentId: "eq-015", calibrationDate: daysAgo(120), nextDueDate: daysAgo(30),
    standardUsed: "Certified Torque Meter & Speed Sensor", standardCertificate: "TQ-2025-0112",
    result: "fail", certificateNumber: "CAL-2025-079", performedBy: "Eng. Ahmed Mostafa",
    asFoundReadings: "Impeller speed: 185 rpm (spec: 200 +/- 5 rpm) - FAIL, Chopper speed: 1480 rpm (spec: 1500 +/- 20) - FAIL",
    asLeftReadings: "Unable to adjust - gearbox failure. Equipment OOS.",
    notes: "Equipment placed out of service pending gearbox replacement" },
  // eq-016 V-Blender
  { id: "cal-020", equipmentId: "eq-016", calibrationDate: daysAgo(40), nextDueDate: futureDays(50),
    standardUsed: "Calibrated Speed Sensor", standardCertificate: "SS-2025-0445",
    result: "pass", certificateNumber: "CAL-2026-020", performedBy: "Eng. Tarek Nour",
    asFoundReadings: "Rotation speed: 12.0 rpm (spec: 12 +/- 1 rpm)",
    asLeftReadings: "Rotation speed: 12.0 rpm" },
  // eq-017 Capsule Filler
  { id: "cal-021", equipmentId: "eq-017", calibrationDate: daysAgo(55), nextDueDate: futureDays(35),
    standardUsed: "Calibrated Weight Set & Speed Counter", standardCertificate: "WS-2025-0667",
    result: "pass", certificateNumber: "CAL-2026-021", performedBy: "Bosch Service Engineer",
    asFoundReadings: "Fill weight: 500.1 mg (spec: 500 +/- 5 mg), Speed: 2500 caps/hr",
    asLeftReadings: "Fill weight: 500.1 mg, Speed: 2500 caps/hr", temperatureC: 22.0, humidityPct: 40 },
  // eq-018 Stability Chamber
  { id: "cal-022", equipmentId: "eq-018", calibrationDate: daysAgo(18), nextDueDate: futureDays(72),
    standardUsed: "NIST Traceable Temperature & Humidity Probes (9-point mapping)", standardCertificate: "NIST-TH-2025-0994",
    result: "pass", certificateNumber: "CAL-2026-022", performedBy: "Binder Service Engineer",
    verifiedBy: "Dr. Rania Abdel-Aziz", asFoundReadings: "25C/60%RH: Temp uniformity +/- 0.3C, RH uniformity +/- 2.1%",
    asLeftReadings: "Temp: +/- 0.3C, RH: +/- 2.1% (within spec +/- 2C / +/- 5%)" },
  // eq-019 AHU Sterile
  { id: "cal-023", equipmentId: "eq-019", calibrationDate: daysAgo(42), nextDueDate: futureDays(48),
    standardUsed: "Calibrated DP Gauge, Particle Counter, Anemometer", standardCertificate: "DP-2025-0780",
    result: "pass", certificateNumber: "CAL-2026-023", performedBy: "Eng. Mohamed Fathy",
    verifiedBy: "Dr. Laila Farouk", asFoundReadings: "Room DP: 30.1 Pa (spec: 30 +/- 5), HEPA integrity: 0.001% (spec: <0.01%)",
    asLeftReadings: "DP: 30.1 Pa, HEPA: 0.001%" },
  // Additional historical records
  { id: "cal-024", equipmentId: "eq-001", calibrationDate: daysAgo(225), nextDueDate: daysAgo(135),
    standardUsed: "Certified Force Gauge 50kN (NIST Traceable)", standardCertificate: "NIST-FG-2024-0998",
    result: "pass", certificateNumber: "CAL-2025-045", performedBy: "Eng. Ahmed Mostafa",
    asFoundReadings: "Main compression: 20.01 kN", asLeftReadings: "Main compression: 20.01 kN" },
  { id: "cal-025", equipmentId: "eq-005", calibrationDate: daysAgo(205), nextDueDate: daysAgo(115),
    standardUsed: "USP Caffeine Reference Standard", standardCertificate: "USP-RS-2024-C445",
    result: "pass", certificateNumber: "CAL-2025-048", performedBy: "Agilent Service Engineer",
    asFoundReadings: "Wavelength: 254.0 nm, Flow: 1.001 ml/min",
    asLeftReadings: "Wavelength: 254.0 nm, Flow: 1.001 ml/min" },
  { id: "cal-026", equipmentId: "eq-009", calibrationDate: daysAgo(105), nextDueDate: daysAgo(15),
    standardUsed: "OIML Class E2 Weight Set", standardCertificate: "OIML-E2-2025-0321",
    result: "pass", certificateNumber: "CAL-2025-083", performedBy: "Mettler Toledo Service",
    asFoundReadings: "Linearity: 0.01 mg, Repeatability: 0.01 mg",
    asLeftReadings: "All within spec" },
  { id: "cal-027", equipmentId: "eq-011", calibrationDate: daysAgo(110), nextDueDate: daysAgo(20),
    standardUsed: "Calibrated Temperature Mapping Probes (12-point)", standardCertificate: "TM-2025-0556",
    result: "pass", certificateNumber: "CAL-2025-081", performedBy: "Getinge Service Engineer",
    asFoundReadings: "Temp uniformity: max spread 0.7C, Pressure: 2.02 bar",
    asLeftReadings: "All within spec" },
  { id: "cal-028", equipmentId: "eq-012", calibrationDate: daysAgo(100), nextDueDate: daysAgo(10),
    standardUsed: "Conductivity Standard 1.413 uS/cm", standardCertificate: "COND-2025-0998",
    result: "pass", certificateNumber: "CAL-2025-080", performedBy: "Eng. Tarek Nour",
    asFoundReadings: "Conductivity: 0.9 uS/cm, TOC: 130 ppb",
    asLeftReadings: "All within spec" },
  { id: "cal-029", equipmentId: "eq-003", calibrationDate: daysAgo(150), nextDueDate: daysAgo(60),
    standardUsed: "Calibrated Spray Rate Meter", standardCertificate: "SRM-2025-0201",
    result: "pass", certificateNumber: "CAL-2025-065", performedBy: "Eng. Ahmed Mostafa",
    asFoundReadings: "Spray rate: 149.8 g/min, Pan speed: 8.00 rpm",
    asLeftReadings: "All within spec" },
  { id: "cal-030", equipmentId: "eq-004", calibrationDate: daysAgo(120), nextDueDate: daysAgo(30),
    standardUsed: "Certified Temperature Probe & Pressure Gauge", standardCertificate: "ISO-TP-2025-0445",
    result: "pass", certificateNumber: "CAL-2025-068", performedBy: "Eng. Mohamed Fathy",
    asFoundReadings: "Sealing temp: 179.8C, Forming pressure: 5.00 bar",
    asLeftReadings: "All within spec" },
  { id: "cal-031", equipmentId: "eq-018", calibrationDate: daysAgo(108), nextDueDate: daysAgo(18),
    standardUsed: "NIST Traceable Temperature & Humidity Probes", standardCertificate: "NIST-TH-2025-0667",
    result: "adjusted", certificateNumber: "CAL-2025-076", performedBy: "Binder Service Engineer",
    asFoundReadings: "25C/60%RH: Temp uniformity +/- 2.5C (spec: +/- 2.0C) - OUT OF SPEC",
    asLeftReadings: "Temp uniformity +/- 0.5C after fan replacement" },
  { id: "cal-032", equipmentId: "eq-017", calibrationDate: daysAgo(145), nextDueDate: daysAgo(55),
    standardUsed: "Calibrated Weight Set & Speed Counter", standardCertificate: "WS-2025-0334",
    result: "pass", certificateNumber: "CAL-2025-062", performedBy: "Bosch Service Engineer",
    asFoundReadings: "Fill weight: 499.8 mg, Speed: 2500 caps/hr",
    asLeftReadings: "All within spec" },
  { id: "cal-033", equipmentId: "eq-016", calibrationDate: daysAgo(130), nextDueDate: daysAgo(40),
    standardUsed: "Calibrated Speed Sensor", standardCertificate: "SS-2025-0223",
    result: "pass", certificateNumber: "CAL-2025-071", performedBy: "Eng. Tarek Nour",
    asFoundReadings: "Rotation speed: 11.9 rpm",
    asLeftReadings: "Rotation speed: 11.9 rpm" },
  { id: "cal-034", equipmentId: "eq-013", calibrationDate: daysAgo(140), nextDueDate: daysAgo(50),
    standardUsed: "Calibrated DP Gauge & Anemometer", standardCertificate: "DP-2025-0445",
    result: "pass", certificateNumber: "CAL-2025-058", performedBy: "Eng. Mohamed Fathy",
    asFoundReadings: "Room DP: 15.0 Pa, Air changes: 21/hr",
    asLeftReadings: "All within spec" },
  { id: "cal-035", equipmentId: "eq-006", calibrationDate: daysAgo(190), nextDueDate: daysAgo(100),
    standardUsed: "USP Caffeine Reference Standard & Holmium Oxide Filter", standardCertificate: "USP-RS-2024-C556",
    result: "pass", certificateNumber: "CAL-2025-042", performedBy: "Agilent Service Engineer",
    asFoundReadings: "Wavelength: 254.1 nm, Flow: 0.998 ml/min",
    asLeftReadings: "All within spec" },
  { id: "cal-036", equipmentId: "eq-007", calibrationDate: daysAgo(130), nextDueDate: daysAgo(40),
    standardUsed: "USP Caffeine Reference Standard", standardCertificate: "USP-RS-2025-C067",
    result: "adjusted", certificateNumber: "CAL-2025-070", performedBy: "Waters Service Engineer",
    asFoundReadings: "Flow accuracy: 1.025 ml/min (spec: 1.000 +/- 0.010) - OUT OF SPEC",
    asLeftReadings: "Flow: 1.001 ml/min (pump head replaced and adjusted)" },
  { id: "cal-037", equipmentId: "eq-019", calibrationDate: daysAgo(132), nextDueDate: daysAgo(42),
    standardUsed: "Calibrated DP Gauge, Particle Counter", standardCertificate: "DP-2025-0446",
    result: "pass", certificateNumber: "CAL-2025-069", performedBy: "Eng. Mohamed Fathy",
    asFoundReadings: "Room DP: 29.8 Pa, HEPA integrity: 0.002%",
    asLeftReadings: "All within spec" },
  { id: "cal-038", equipmentId: "eq-010", calibrationDate: daysAgo(185), nextDueDate: daysAgo(95),
    standardUsed: "OIML Class E2 Weight Set", standardCertificate: "OIML-E2-2024-0889",
    result: "pass", certificateNumber: "CAL-2025-041", performedBy: "Mettler Toledo Service",
    asFoundReadings: "Linearity: 0.02 mg, Repeatability: 0.01 mg",
    asLeftReadings: "All within spec" },
  { id: "cal-039", equipmentId: "eq-014", calibrationDate: daysAgo(145), nextDueDate: daysAgo(55),
    standardUsed: "Calibrated DP Gauge & Anemometer", standardCertificate: "DP-2025-0447",
    result: "pass", certificateNumber: "CAL-2025-060", performedBy: "Eng. Mohamed Fathy",
    asFoundReadings: "Room DP: 10.0 Pa, Temp: 22.0C",
    asLeftReadings: "All within spec" },
  { id: "cal-040", equipmentId: "eq-008", calibrationDate: daysAgo(215), nextDueDate: daysAgo(125),
    standardUsed: "USP Dissolution Calibrator Tablets", standardCertificate: "USP-DCT-2024-P067",
    result: "pass", certificateNumber: "CAL-2025-038", performedBy: "Eng. Ahmed Mostafa",
    asFoundReadings: "Paddle: 50.1 rpm, Basket: 99.9 rpm",
    asLeftReadings: "All within spec" },
];

/* ── Seed: Maintenance Orders ─────────────────────────────── */

const SEED_MAINTENANCE: MaintenanceOrder[] = [
  // Preventive Maintenance
  { id: "mo-001", orderNumber: "WO-2026-001", equipmentId: "eq-001", type: "preventive",
    priority: "medium", description: "Monthly PM - Tablet Press: lubrication, die inspection, turret alignment check",
    assignedTo: "Eng. Ahmed Mostafa", scheduledDate: daysAgo(20), completionDate: daysAgo(20),
    partsUsed: [{ partName: "Turret Lubricant", partNumber: "LUB-TP-001", quantity: 2, unitCost: 150 }],
    downtimeHours: 4, status: "completed", createdAt: daysAgo(25) },
  { id: "mo-002", orderNumber: "WO-2026-002", equipmentId: "eq-002", type: "preventive",
    priority: "medium", description: "Quarterly PM - FBD: filter bag inspection, spray nozzle cleaning, expansion chamber seal check",
    assignedTo: "Eng. Tarek Nour", scheduledDate: daysAgo(30), completionDate: daysAgo(29),
    partsUsed: [{ partName: "Filter Bag Set", partNumber: "FB-FBD-003", quantity: 1, unitCost: 4500 },
                { partName: "Spray Nozzle O-Ring Kit", partNumber: "OR-FBD-001", quantity: 1, unitCost: 320 }],
    downtimeHours: 8, status: "completed", createdAt: daysAgo(35) },
  { id: "mo-003", orderNumber: "WO-2026-003", equipmentId: "eq-003", type: "preventive",
    priority: "low", description: "Monthly PM - Coating Machine: spray gun cleaning, peristaltic pump tubing replacement",
    assignedTo: "Eng. Ahmed Mostafa", scheduledDate: daysAgo(15), completionDate: daysAgo(15),
    partsUsed: [{ partName: "Peristaltic Pump Tubing", partNumber: "PT-CT-002", quantity: 3, unitCost: 280 }],
    downtimeHours: 3, status: "completed", createdAt: daysAgo(20) },
  { id: "mo-004", orderNumber: "WO-2026-004", equipmentId: "eq-004", type: "preventive",
    priority: "medium", description: "Monthly PM - Blister Packer: heating plate inspection, forming tool alignment",
    assignedTo: "Eng. Mohamed Fathy", scheduledDate: daysAgo(40), completionDate: daysAgo(39),
    partsUsed: [], downtimeHours: 3, status: "completed", createdAt: daysAgo(45) },
  { id: "mo-005", orderNumber: "WO-2026-005", equipmentId: "eq-005", type: "preventive",
    priority: "high", description: "Semi-annual PM - HPLC #1: lamp replacement, column compartment check, detector service",
    assignedTo: "Agilent Service Engineer", scheduledDate: daysAgo(50), completionDate: daysAgo(49),
    partsUsed: [{ partName: "Deuterium Lamp", partNumber: "AG-DL-1260", quantity: 1, unitCost: 8500 },
                { partName: "Pump Seal Kit", partNumber: "AG-PS-1260", quantity: 1, unitCost: 3200 }],
    downtimeHours: 6, status: "completed", createdAt: daysAgo(55) },
  { id: "mo-006", orderNumber: "WO-2026-006", equipmentId: "eq-012", type: "preventive",
    priority: "high", description: "Monthly PM - Water System: RO membrane check, UV lamp intensity, conductivity probe verification",
    assignedTo: "Eng. Tarek Nour", scheduledDate: daysAgo(14), completionDate: daysAgo(14),
    partsUsed: [], downtimeHours: 2, status: "completed", createdAt: daysAgo(18) },
  { id: "mo-007", orderNumber: "WO-2026-007", equipmentId: "eq-013", type: "preventive",
    priority: "medium", description: "Quarterly PM - AHU Production: filter DP check, belt tension, fan bearing lubrication",
    assignedTo: "Eng. Mohamed Fathy", scheduledDate: daysAgo(28), completionDate: daysAgo(28),
    partsUsed: [{ partName: "V-Belt Set", partNumber: "VB-AHU-001", quantity: 2, unitCost: 450 }],
    downtimeHours: 4, status: "completed", createdAt: daysAgo(32) },
  { id: "mo-008", orderNumber: "WO-2026-008", equipmentId: "eq-018", type: "preventive",
    priority: "high", description: "Quarterly PM - Stability Chamber: compressor check, door seal inspection, mapping verification",
    assignedTo: "Binder Service Engineer", scheduledDate: daysAgo(60), completionDate: daysAgo(59),
    partsUsed: [{ partName: "Door Gasket", partNumber: "BD-DG-720", quantity: 1, unitCost: 1200 }],
    downtimeHours: 5, status: "completed", createdAt: daysAgo(65) },
  { id: "mo-009", orderNumber: "WO-2026-009", equipmentId: "eq-011", type: "preventive",
    priority: "high", description: "Monthly PM - Autoclave: door gasket inspection, safety valve test, drain strainer cleaning",
    assignedTo: "Eng. Tarek Nour", scheduledDate: daysAgo(25), completionDate: daysAgo(24),
    partsUsed: [], downtimeHours: 3, status: "completed", createdAt: daysAgo(30) },
  { id: "mo-010", orderNumber: "WO-2026-010", equipmentId: "eq-016", type: "preventive",
    priority: "low", description: "Quarterly PM - V-Blender: bearing lubrication, seal inspection, drive coupling check",
    assignedTo: "Eng. Ahmed Mostafa", scheduledDate: daysAgo(45), completionDate: daysAgo(45),
    partsUsed: [], downtimeHours: 2, status: "completed", createdAt: daysAgo(50) },
  // Planned / Upcoming PM
  { id: "mo-011", orderNumber: "WO-2026-011", equipmentId: "eq-001", type: "preventive",
    priority: "medium", description: "Monthly PM - Tablet Press: lubrication, die inspection, turret alignment check",
    assignedTo: "Eng. Ahmed Mostafa", scheduledDate: futureDays(10),
    partsUsed: [], downtimeHours: 0, status: "planned", createdAt: daysAgo(2) },
  { id: "mo-012", orderNumber: "WO-2026-012", equipmentId: "eq-013", type: "preventive",
    priority: "medium", description: "Monthly PM - AHU Production Block A: pre-filter replacement, DP check",
    assignedTo: "Eng. Mohamed Fathy", scheduledDate: futureDays(2),
    partsUsed: [], downtimeHours: 0, status: "planned", createdAt: daysAgo(5) },
  { id: "mo-013", orderNumber: "WO-2026-013", equipmentId: "eq-012", type: "preventive",
    priority: "high", description: "Monthly PM - Water Purification: RO membrane integrity, UV lamp check",
    assignedTo: "Eng. Tarek Nour", scheduledDate: futureDays(16),
    partsUsed: [], downtimeHours: 0, status: "planned", createdAt: daysAgo(3) },
  { id: "mo-014", orderNumber: "WO-2026-014", equipmentId: "eq-009", type: "preventive",
    priority: "medium", description: "Annual PM - Balance #1: full service and recertification",
    assignedTo: "Mettler Toledo Service", scheduledDate: futureDays(0),
    partsUsed: [], downtimeHours: 0, status: "planned", createdAt: daysAgo(7) },
  { id: "mo-015", orderNumber: "WO-2026-015", equipmentId: "eq-018", type: "preventive",
    priority: "high", description: "Quarterly PM - Stability Chamber: compressor, mapping, seal check",
    assignedTo: "Binder Service Engineer", scheduledDate: futureDays(30),
    partsUsed: [], downtimeHours: 0, status: "planned", createdAt: daysAgo(1) },
  // Corrective Maintenance
  { id: "mo-016", orderNumber: "WO-2026-016", equipmentId: "eq-007", type: "corrective",
    priority: "high", description: "HPLC #3 - Pump head seal leaking, causing pressure fluctuations and baseline drift",
    assignedTo: "Waters Service Engineer", scheduledDate: daysAgo(5),
    partsUsed: [{ partName: "Pump Head Seal Kit", partNumber: "WA-PHS-2695", quantity: 1, unitCost: 4200 }],
    downtimeHours: 8, status: "in-progress", rootCause: "Worn pump head seal due to buffer crystallization",
    correctiveAction: "Replace pump head seal and flush system with cleaning solution", createdAt: daysAgo(5) },
  { id: "mo-017", orderNumber: "WO-2026-017", equipmentId: "eq-004", type: "corrective",
    priority: "medium", description: "Blister Packer - Forming station temperature sensor intermittent reading",
    assignedTo: "Eng. Mohamed Fathy", scheduledDate: daysAgo(12), completionDate: daysAgo(11),
    partsUsed: [{ partName: "PT100 Temperature Sensor", partNumber: "UH-TS-004", quantity: 1, unitCost: 850 }],
    downtimeHours: 4, status: "completed", rootCause: "Corroded sensor connector",
    correctiveAction: "Replaced sensor and connector, added protective sleeve", createdAt: daysAgo(12) },
  { id: "mo-018", orderNumber: "WO-2026-018", equipmentId: "eq-002", type: "corrective",
    priority: "high", description: "FBD - Exhaust air butterfly valve not closing fully, product loss risk",
    assignedTo: "Eng. Tarek Nour", scheduledDate: daysAgo(45), completionDate: daysAgo(44),
    partsUsed: [{ partName: "Butterfly Valve Actuator", partNumber: "GL-BVA-60", quantity: 1, unitCost: 6800 }],
    downtimeHours: 12, status: "completed", rootCause: "Pneumatic actuator diaphragm failure",
    correctiveAction: "Replaced actuator assembly and tested full stroke operation", createdAt: daysAgo(45) },
  { id: "mo-019", orderNumber: "WO-2026-019", equipmentId: "eq-014", type: "corrective",
    priority: "medium", description: "AHU Lab - Unusual vibration from supply fan during night operation",
    assignedTo: "Eng. Mohamed Fathy", scheduledDate: futureDays(3),
    partsUsed: [], downtimeHours: 0, status: "planned",
    rootCause: "Suspected fan bearing wear", createdAt: daysAgo(1) },
  // Breakdown Maintenance
  { id: "mo-020", orderNumber: "WO-2026-020", equipmentId: "eq-015", type: "breakdown",
    priority: "urgent", description: "Granulator - Complete gearbox failure during batch processing, production stopped",
    assignedTo: "Eng. Ahmed Mostafa", scheduledDate: daysAgo(10),
    partsUsed: [], downtimeHours: 240, status: "on-hold",
    rootCause: "Gearbox bearing seizure due to insufficient lubrication interval",
    correctiveAction: "Replacement gearbox ordered from Diosna Germany. ETA 2 weeks. Reviewing lubrication schedule.", createdAt: daysAgo(10) },
  { id: "mo-021", orderNumber: "WO-2026-021", equipmentId: "eq-003", type: "breakdown",
    priority: "urgent", description: "Coating Machine - Spray arm motor burned out mid-coating cycle",
    assignedTo: "Eng. Ahmed Mostafa", scheduledDate: daysAgo(60), completionDate: daysAgo(57),
    partsUsed: [{ partName: "Spray Arm Motor 0.75kW", partNumber: "OH-SAM-075", quantity: 1, unitCost: 12500 },
                { partName: "Motor Coupling", partNumber: "OH-MC-001", quantity: 1, unitCost: 890 }],
    downtimeHours: 72, status: "completed", rootCause: "Motor winding insulation failure due to coating dust ingress",
    correctiveAction: "Replaced motor, installed additional dust protection boot over motor housing", createdAt: daysAgo(60) },
  { id: "mo-022", orderNumber: "WO-2026-022", equipmentId: "eq-001", type: "breakdown",
    priority: "urgent", description: "Tablet Press - Main compression roller cracked during high-speed operation",
    assignedTo: "Eng. Ahmed Mostafa", scheduledDate: daysAgo(90), completionDate: daysAgo(85),
    partsUsed: [{ partName: "Main Compression Roller", partNumber: "CM-MCR-45", quantity: 1, unitCost: 45000 },
                { partName: "Roller Bearing Set", partNumber: "CM-RBS-45", quantity: 1, unitCost: 8700 }],
    downtimeHours: 120, status: "completed", rootCause: "Fatigue crack propagation from surface defect",
    correctiveAction: "Replaced roller and bearings, NDT inspection added to PM schedule", createdAt: daysAgo(90) },
  // More completed PMs for compliance tracking
  { id: "mo-023", orderNumber: "WO-2026-023", equipmentId: "eq-017", type: "preventive",
    priority: "medium", description: "Monthly PM - Capsule Filler: dosing disc inspection, vacuum system check",
    assignedTo: "Eng. Ahmed Mostafa", scheduledDate: daysAgo(20), completionDate: daysAgo(20),
    partsUsed: [], downtimeHours: 3, status: "completed", createdAt: daysAgo(25) },
  { id: "mo-024", orderNumber: "WO-2026-024", equipmentId: "eq-019", type: "preventive",
    priority: "high", description: "Quarterly PM - AHU Sterile: HEPA filter integrity test, DP monitoring calibration",
    assignedTo: "Eng. Mohamed Fathy", scheduledDate: daysAgo(30), completionDate: daysAgo(29),
    partsUsed: [{ partName: "Pre-Filter Panel", partNumber: "PF-AHU-003", quantity: 4, unitCost: 380 }],
    downtimeHours: 6, status: "completed", createdAt: daysAgo(35) },
  { id: "mo-025", orderNumber: "WO-2026-025", equipmentId: "eq-006", type: "corrective",
    priority: "high", description: "HPLC #2 - Autosampler needle bent, causing injection errors",
    assignedTo: "Agilent Service Engineer", scheduledDate: daysAgo(35), completionDate: daysAgo(34),
    partsUsed: [{ partName: "Autosampler Needle Assembly", partNumber: "AG-AN-1260", quantity: 1, unitCost: 2100 }],
    downtimeHours: 3, status: "completed", rootCause: "Needle collision with vial cap due to misaligned tray",
    correctiveAction: "Replaced needle, realigned sample tray, added tray alignment to daily check", createdAt: daysAgo(35) },
  { id: "mo-026", orderNumber: "WO-2026-026", equipmentId: "eq-008", type: "preventive",
    priority: "medium", description: "Semi-annual PM - Dissolution Tester: vessel alignment, paddle shaft runout, temperature probe",
    assignedTo: "Eng. Ahmed Mostafa", scheduledDate: daysAgo(60), completionDate: daysAgo(59),
    partsUsed: [], downtimeHours: 4, status: "completed", createdAt: daysAgo(65) },
  { id: "mo-027", orderNumber: "WO-2026-027", equipmentId: "eq-010", type: "preventive",
    priority: "medium", description: "Semi-annual PM - Balance #2: internal calibration check, leveling, draft shield",
    assignedTo: "Mettler Toledo Service", scheduledDate: daysAgo(80), completionDate: daysAgo(79),
    partsUsed: [], downtimeHours: 2, status: "completed", createdAt: daysAgo(85) },
  { id: "mo-028", orderNumber: "WO-2026-028", equipmentId: "eq-011", type: "corrective",
    priority: "urgent", description: "Autoclave - Door interlock malfunction, unable to start cycle",
    assignedTo: "Getinge Service Engineer", scheduledDate: daysAgo(70), completionDate: daysAgo(69),
    partsUsed: [{ partName: "Door Interlock Switch", partNumber: "GT-DIS-600", quantity: 1, unitCost: 3400 }],
    downtimeHours: 8, status: "completed", rootCause: "Interlock switch contact wear",
    correctiveAction: "Replaced interlock switch, added to quarterly inspection checklist", createdAt: daysAgo(70) },
  { id: "mo-029", orderNumber: "WO-2026-029", equipmentId: "eq-012", type: "corrective",
    priority: "high", description: "Water System - EDI module low current alarm, conductivity rising",
    assignedTo: "MECO Service Engineer", scheduledDate: daysAgo(55), completionDate: daysAgo(53),
    partsUsed: [{ partName: "EDI Module Stack", partNumber: "MC-EDI-6000", quantity: 1, unitCost: 35000 }],
    downtimeHours: 48, status: "completed", rootCause: "EDI resin exhaustion after 5 years of service",
    correctiveAction: "Replaced EDI stack, implemented conductivity trending to predict replacement", createdAt: daysAgo(55) },
  { id: "mo-030", orderNumber: "WO-2026-030", equipmentId: "eq-002", type: "preventive",
    priority: "medium", description: "Annual PM - FBD: full system inspection, product contact surface passivation",
    assignedTo: "Eng. Tarek Nour", scheduledDate: futureDays(60),
    partsUsed: [], downtimeHours: 0, status: "planned", createdAt: daysAgo(1) },
];

/* ── Seed: Maintenance Schedules ──────────────────────────── */

const SEED_SCHEDULES: MaintenanceSchedule[] = [
  { id: "ms-001", equipmentId: "eq-001", frequency: "monthly", lastPerformed: daysAgo(20), nextDue: futureDays(10),
    checklistItems: [
      { id: "cl-001", description: "Lubricate turret and cam tracks", required: true },
      { id: "cl-002", description: "Inspect upper and lower punches for wear", required: true },
      { id: "cl-003", description: "Check die bore dimensions", required: true },
      { id: "cl-004", description: "Verify force feeder paddle condition", required: false },
      { id: "cl-005", description: "Clean and inspect dust extraction system", required: true },
    ], assignedTo: "Eng. Ahmed Mostafa", active: true },
  { id: "ms-002", equipmentId: "eq-002", frequency: "quarterly", lastPerformed: daysAgo(30), nextDue: futureDays(60),
    checklistItems: [
      { id: "cl-006", description: "Inspect filter bags for holes or blockage", required: true },
      { id: "cl-007", description: "Clean and check spray nozzles", required: true },
      { id: "cl-008", description: "Inspect expansion chamber seals", required: true },
      { id: "cl-009", description: "Test inlet air heater elements", required: true },
      { id: "cl-010", description: "Verify product temperature probe accuracy", required: true },
    ], assignedTo: "Eng. Tarek Nour", active: true },
  { id: "ms-003", equipmentId: "eq-005", frequency: "semi-annual", lastPerformed: daysAgo(50), nextDue: futureDays(130),
    checklistItems: [
      { id: "cl-011", description: "Replace deuterium lamp if >2000 hours", required: true },
      { id: "cl-012", description: "Check and replace pump seals", required: true },
      { id: "cl-013", description: "Clean column compartment and detector cell", required: true },
      { id: "cl-014", description: "Verify autosampler precision", required: true },
      { id: "cl-015", description: "Update firmware if available", required: false },
    ], assignedTo: "Agilent Service Engineer", active: true },
  { id: "ms-004", equipmentId: "eq-012", frequency: "monthly", lastPerformed: daysAgo(14), nextDue: futureDays(16),
    checklistItems: [
      { id: "cl-016", description: "Check RO membrane rejection rate", required: true },
      { id: "cl-017", description: "Verify UV lamp intensity (>80%)", required: true },
      { id: "cl-018", description: "Calibrate conductivity sensors", required: true },
      { id: "cl-019", description: "Inspect loop return valve operation", required: true },
      { id: "cl-020", description: "Sample and test for endotoxin", required: true },
    ], assignedTo: "Eng. Tarek Nour", active: true },
  { id: "ms-005", equipmentId: "eq-013", frequency: "quarterly", lastPerformed: daysAgo(28), nextDue: futureDays(62),
    checklistItems: [
      { id: "cl-021", description: "Check pre-filter and HEPA filter DP readings", required: true },
      { id: "cl-022", description: "Inspect fan belt tension and condition", required: true },
      { id: "cl-023", description: "Lubricate fan bearings", required: true },
      { id: "cl-024", description: "Verify temperature and humidity control", required: true },
      { id: "cl-025", description: "Test damper actuator operation", required: false },
    ], assignedTo: "Eng. Mohamed Fathy", active: true },
  { id: "ms-006", equipmentId: "eq-011", frequency: "monthly", lastPerformed: daysAgo(25), nextDue: futureDays(5),
    checklistItems: [
      { id: "cl-026", description: "Inspect door gasket for wear/damage", required: true },
      { id: "cl-027", description: "Test safety valve operation", required: true },
      { id: "cl-028", description: "Clean drain strainer and check trap", required: true },
      { id: "cl-029", description: "Verify pressure gauge calibration", required: true },
      { id: "cl-030", description: "Check vacuum pump oil level", required: false },
    ], assignedTo: "Eng. Tarek Nour", active: true },
  { id: "ms-007", equipmentId: "eq-018", frequency: "quarterly", lastPerformed: daysAgo(60), nextDue: futureDays(30),
    checklistItems: [
      { id: "cl-031", description: "Check compressor operation and refrigerant", required: true },
      { id: "cl-032", description: "Inspect door seal integrity", required: true },
      { id: "cl-033", description: "Verify temperature and humidity mapping", required: true },
      { id: "cl-034", description: "Test alarm system and data logger backup", required: true },
      { id: "cl-035", description: "Clean condenser coils", required: true },
    ], assignedTo: "Binder Service Engineer", active: true },
  { id: "ms-008", equipmentId: "eq-009", frequency: "annual", lastPerformed: daysAgo(90), nextDue: futureDays(0),
    checklistItems: [
      { id: "cl-036", description: "Full metrological verification", required: true },
      { id: "cl-037", description: "Inspect and clean weighing cell", required: true },
      { id: "cl-038", description: "Check draft shield for damage", required: true },
      { id: "cl-039", description: "Level verification and adjustment", required: true },
      { id: "cl-040", description: "Firmware update if available", required: false },
    ], assignedTo: "Mettler Toledo Service", active: true },
];

/* ── Store shape ──────────────────────────────────────────── */

interface StoreData {
  equipment: Equipment[];
  calibrations: CalibrationRecord[];
  maintenanceOrders: MaintenanceOrder[];
  schedules: MaintenanceSchedule[];
}

/* ── Singleton Store ──────────────────────────────────────── */

class EquipmentStore {
  private static instance: EquipmentStore;

  private constructor() {
    this.seed();
  }

  static getInstance(): EquipmentStore {
    if (!EquipmentStore.instance) {
      EquipmentStore.instance = new EquipmentStore();
    }
    return EquipmentStore.instance;
  }

  /* ── persistence ────────────────────────────────────────── */

  private seed(): void {
    if (typeof window === "undefined") return;
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      const data: StoreData = {
        equipment: SEED_EQUIPMENT,
        calibrations: SEED_CALIBRATIONS,
        maintenanceOrders: SEED_MAINTENANCE,
        schedules: SEED_SCHEDULES,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }

  private load(): StoreData {
    if (typeof window === "undefined") {
      return { equipment: [], calibrations: [], maintenanceOrders: [], schedules: [] };
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { equipment: [], calibrations: [], maintenanceOrders: [], schedules: [] };
    }
    return JSON.parse(raw) as StoreData;
  }

  private save(data: StoreData): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /* ── Equipment CRUD ─────────────────────────────────────── */

  getAllEquipment(): Equipment[] {
    return this.load().equipment;
  }

  getEquipmentById(id: string): Equipment | undefined {
    return this.load().equipment.find((e) => e.id === id);
  }

  createEquipment(eq: Omit<Equipment, "id" | "assetTag">): Equipment {
    const data = this.load();
    const newEq: Equipment = {
      ...eq,
      id: `eq-${Date.now()}`,
      assetTag: this.generateAssetTag(eq.type),
    };
    data.equipment.push(newEq);
    this.save(data);
    return newEq;
  }

  updateEquipment(id: string, updates: Partial<Equipment>): Equipment | undefined {
    const data = this.load();
    const idx = data.equipment.findIndex((e) => e.id === id);
    if (idx === -1) return undefined;
    data.equipment[idx] = { ...data.equipment[idx], ...updates };
    this.save(data);
    return data.equipment[idx];
  }

  deleteEquipment(id: string): boolean {
    const data = this.load();
    const idx = data.equipment.findIndex((e) => e.id === id);
    if (idx === -1) return false;
    data.equipment.splice(idx, 1);
    this.save(data);
    return true;
  }

  getByDepartment(department: string): Equipment[] {
    return this.load().equipment.filter((e) => e.department === department);
  }

  getByStatus(status: EquipmentStatus): Equipment[] {
    return this.load().equipment.filter((e) => e.status === status);
  }

  getByType(type: EquipmentType): Equipment[] {
    return this.load().equipment.filter((e) => e.type === type);
  }

  getByCriticality(criticality: EquipmentCriticality): Equipment[] {
    return this.load().equipment.filter((e) => e.criticality === criticality);
  }

  /* ── Calibration CRUD ───────────────────────────────────── */

  getAllCalibrations(): CalibrationRecord[] {
    return this.load().calibrations;
  }

  getCalibrationsByEquipment(equipmentId: string): CalibrationRecord[] {
    return this.load()
      .calibrations.filter((c) => c.equipmentId === equipmentId)
      .sort((a, b) => new Date(b.calibrationDate).getTime() - new Date(a.calibrationDate).getTime());
  }

  getOverdueCalibrations(): CalibrationRecord[] {
    const today = new Date().toISOString().slice(0, 10);
    const data = this.load();
    // Find the latest calibration per equipment, then filter overdue
    const latestByEq = new Map<string, CalibrationRecord>();
    for (const c of data.calibrations) {
      const existing = latestByEq.get(c.equipmentId);
      if (!existing || c.calibrationDate > existing.calibrationDate) {
        latestByEq.set(c.equipmentId, c);
      }
    }
    return Array.from(latestByEq.values()).filter((c) => c.nextDueDate < today);
  }

  getUpcomingCalibrations(withinDays: number = 30): CalibrationRecord[] {
    const today = new Date().toISOString().slice(0, 10);
    const futureDate = futureDays(withinDays);
    const data = this.load();
    const latestByEq = new Map<string, CalibrationRecord>();
    for (const c of data.calibrations) {
      const existing = latestByEq.get(c.equipmentId);
      if (!existing || c.calibrationDate > existing.calibrationDate) {
        latestByEq.set(c.equipmentId, c);
      }
    }
    return Array.from(latestByEq.values()).filter(
      (c) => c.nextDueDate >= today && c.nextDueDate <= futureDate
    );
  }

  createCalibration(cal: Omit<CalibrationRecord, "id" | "certificateNumber">): CalibrationRecord {
    const data = this.load();
    const newCal: CalibrationRecord = {
      ...cal,
      id: `cal-${Date.now()}`,
      certificateNumber: this.generateCertNumber(),
    };
    data.calibrations.push(newCal);
    // Update equipment dates
    const eqIdx = data.equipment.findIndex((e) => e.id === cal.equipmentId);
    if (eqIdx >= 0) {
      data.equipment[eqIdx].lastCalibrationDate = cal.calibrationDate;
      data.equipment[eqIdx].nextCalibrationDue = cal.nextDueDate;
      if (cal.result !== "fail") {
        data.equipment[eqIdx].status = "operational";
      }
    }
    this.save(data);
    return newCal;
  }

  /* ── Maintenance Order CRUD ─────────────────────────────── */

  getAllMaintenanceOrders(): MaintenanceOrder[] {
    return this.load().maintenanceOrders;
  }

  getMaintenanceByEquipment(equipmentId: string): MaintenanceOrder[] {
    return this.load()
      .maintenanceOrders.filter((m) => m.equipmentId === equipmentId)
      .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
  }

  getOpenMaintenanceOrders(): MaintenanceOrder[] {
    return this.load().maintenanceOrders.filter(
      (m) => m.status === "planned" || m.status === "in-progress" || m.status === "on-hold"
    );
  }

  getUpcomingMaintenance(withinDays: number = 30): MaintenanceOrder[] {
    const today = new Date().toISOString().slice(0, 10);
    const futureDate = futureDays(withinDays);
    return this.load().maintenanceOrders.filter(
      (m) => m.status === "planned" && m.scheduledDate >= today && m.scheduledDate <= futureDate
    );
  }

  getOverdueMaintenance(): MaintenanceOrder[] {
    const today = new Date().toISOString().slice(0, 10);
    return this.load().maintenanceOrders.filter(
      (m) => (m.status === "planned" || m.status === "in-progress") && m.scheduledDate < today
    );
  }

  createMaintenanceOrder(order: Omit<MaintenanceOrder, "id" | "orderNumber" | "createdAt">): MaintenanceOrder {
    const data = this.load();
    const newOrder: MaintenanceOrder = {
      ...order,
      id: `mo-${Date.now()}`,
      orderNumber: this.generateWONumber(),
      createdAt: new Date().toISOString().slice(0, 10),
    };
    data.maintenanceOrders.push(newOrder);
    this.save(data);
    return newOrder;
  }

  updateMaintenanceOrder(id: string, updates: Partial<MaintenanceOrder>): MaintenanceOrder | undefined {
    const data = this.load();
    const idx = data.maintenanceOrders.findIndex((m) => m.id === id);
    if (idx === -1) return undefined;
    data.maintenanceOrders[idx] = { ...data.maintenanceOrders[idx], ...updates };
    this.save(data);
    return data.maintenanceOrders[idx];
  }

  completeMaintenanceOrder(
    id: string,
    completionDate: string,
    downtimeHours: number,
    partsUsed: MaintenanceOrder["partsUsed"],
    rootCause?: string,
    correctiveAction?: string
  ): MaintenanceOrder | undefined {
    const data = this.load();
    const idx = data.maintenanceOrders.findIndex((m) => m.id === id);
    if (idx === -1) return undefined;
    const order = data.maintenanceOrders[idx];
    data.maintenanceOrders[idx] = {
      ...order,
      status: "completed",
      completionDate,
      downtimeHours,
      partsUsed,
      rootCause: rootCause ?? order.rootCause,
      correctiveAction: correctiveAction ?? order.correctiveAction,
    };
    // Update equipment maintenance dates
    const eqIdx = data.equipment.findIndex((e) => e.id === order.equipmentId);
    if (eqIdx >= 0) {
      data.equipment[eqIdx].lastMaintenanceDate = completionDate;
      if (data.equipment[eqIdx].status === "under-maintenance") {
        data.equipment[eqIdx].status = "operational";
      }
    }
    this.save(data);
    return data.maintenanceOrders[idx];
  }

  /* ── Schedules ──────────────────────────────────────────── */

  getAllSchedules(): MaintenanceSchedule[] {
    return this.load().schedules;
  }

  getSchedulesByEquipment(equipmentId: string): MaintenanceSchedule[] {
    return this.load().schedules.filter((s) => s.equipmentId === equipmentId);
  }

  /* ── Calendar Events ────────────────────────────────────── */

  getCalendarEvents(startDate: string, endDate: string): CalendarEvent[] {
    const data = this.load();
    const events: CalendarEvent[] = [];
    const today = new Date().toISOString().slice(0, 10);

    // Calibration events - from latest calibration per equipment
    const latestCals = new Map<string, CalibrationRecord>();
    for (const c of data.calibrations) {
      const existing = latestCals.get(c.equipmentId);
      if (!existing || c.calibrationDate > existing.calibrationDate) {
        latestCals.set(c.equipmentId, c);
      }
    }
    for (const cal of latestCals.values()) {
      if (cal.nextDueDate >= startDate && cal.nextDueDate <= endDate) {
        const eq = data.equipment.find((e) => e.id === cal.equipmentId);
        if (!eq || eq.status === "retired") continue;
        const isOverdue = cal.nextDueDate < today;
        events.push({
          id: `ce-${cal.id}`,
          equipmentId: cal.equipmentId,
          equipmentName: eq?.name ?? "Unknown",
          date: cal.nextDueDate,
          eventType: isOverdue ? "calibration-overdue" : "calibration-due",
          description: `Calibration ${isOverdue ? "OVERDUE" : "due"}: ${eq?.name}`,
        });
      }
    }

    // Maintenance events
    for (const mo of data.maintenanceOrders) {
      if (mo.status === "completed" || mo.status === "cancelled") continue;
      if (mo.scheduledDate >= startDate && mo.scheduledDate <= endDate) {
        const eq = data.equipment.find((e) => e.id === mo.equipmentId);
        if (!eq) continue;
        let eventType: CalendarEventType;
        if (mo.type === "corrective" || mo.type === "breakdown") {
          eventType = "corrective-maintenance";
        } else {
          eventType = "pm-scheduled";
        }
        events.push({
          id: `me-${mo.id}`,
          equipmentId: mo.equipmentId,
          equipmentName: eq.name,
          date: mo.scheduledDate,
          eventType,
          description: `${mo.type === "preventive" ? "PM" : mo.type === "corrective" ? "CM" : "Breakdown"}: ${mo.description.slice(0, 60)}`,
        });
      }
    }

    // Schedule-based upcoming maintenance
    for (const sch of data.schedules) {
      if (!sch.active) continue;
      if (sch.nextDue >= startDate && sch.nextDue <= endDate) {
        const eq = data.equipment.find((e) => e.id === sch.equipmentId);
        if (!eq || eq.status === "retired") continue;
        // Check not already represented by a maintenance order
        const alreadyPlanned = data.maintenanceOrders.some(
          (mo) => mo.equipmentId === sch.equipmentId && mo.scheduledDate === sch.nextDue && mo.status === "planned"
        );
        if (!alreadyPlanned) {
          events.push({
            id: `se-${sch.id}`,
            equipmentId: sch.equipmentId,
            equipmentName: eq.name,
            date: sch.nextDue,
            eventType: "pm-scheduled",
            description: `Scheduled ${sch.frequency} PM: ${eq.name}`,
          });
        }
      }
    }

    return events.sort((a, b) => a.date.localeCompare(b.date));
  }

  /* ── Metrics ────────────────────────────────────────────── */

  getMetrics(): EquipmentMetrics {
    const data = this.load();
    const activeEquipment = data.equipment.filter((e) => e.status !== "retired");

    // Status counts
    const operational = activeEquipment.filter((e) => e.status === "operational").length;
    const underMaintenance = activeEquipment.filter((e) => e.status === "under-maintenance").length;
    const calibrationDue = activeEquipment.filter((e) => e.status === "calibration-due").length;
    const outOfService = activeEquipment.filter((e) => e.status === "out-of-service").length;

    // Calibration compliance: equipment with valid (non-overdue) calibration / total active
    const today = new Date().toISOString().slice(0, 10);
    const latestCals = new Map<string, CalibrationRecord>();
    for (const c of data.calibrations) {
      const existing = latestCals.get(c.equipmentId);
      if (!existing || c.calibrationDate > existing.calibrationDate) {
        latestCals.set(c.equipmentId, c);
      }
    }
    const calibratedOnTime = activeEquipment.filter((e) => {
      const cal = latestCals.get(e.id);
      return cal && cal.nextDueDate >= today;
    }).length;
    const calibrationCompliancePct =
      activeEquipment.length > 0
        ? Math.round((calibratedOnTime / activeEquipment.length) * 100)
        : 100;

    // PM Compliance: completed PM orders on time / total completed PM orders
    const completedPMs = data.maintenanceOrders.filter(
      (m) => m.type === "preventive" && m.status === "completed" && m.completionDate
    );
    const onTimePMs = completedPMs.filter(
      (m) => m.completionDate! <= m.scheduledDate || daysBetween(m.scheduledDate, m.completionDate!) <= 1
    );
    const pmCompliancePct =
      completedPMs.length > 0
        ? Math.round((onTimePMs.length / completedPMs.length) * 100)
        : 100;

    // MTBF: average days between breakdown events per equipment
    const breakdowns = data.maintenanceOrders.filter(
      (m) => m.type === "breakdown" && m.status === "completed"
    );
    const mtbfDays = breakdowns.length > 0
      ? Math.round(
          (activeEquipment.length * 365) / breakdowns.length
        )
      : 365;

    // MTTR: average downtime hours for completed corrective/breakdown orders
    const repairOrders = data.maintenanceOrders.filter(
      (m) => (m.type === "corrective" || m.type === "breakdown") && m.status === "completed" && m.downtimeHours > 0
    );
    const mttrHours =
      repairOrders.length > 0
        ? Math.round(repairOrders.reduce((sum, m) => sum + m.downtimeHours, 0) / repairOrders.length)
        : 0;

    // By type
    const typeMap = new Map<EquipmentType, number>();
    activeEquipment.forEach((e) => typeMap.set(e.type, (typeMap.get(e.type) ?? 0) + 1));
    const byType = Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));

    // By department
    const deptMap = new Map<string, number>();
    activeEquipment.forEach((e) => deptMap.set(e.department, (deptMap.get(e.department) ?? 0) + 1));
    const byDepartment = Array.from(deptMap.entries()).map(([department, count]) => ({ department, count }));

    // Monthly downtime (last 6 months)
    const monthlyDowntime: { month: string; hours: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      const hours = data.maintenanceOrders
        .filter((m) => m.status === "completed" && m.completionDate && m.completionDate.startsWith(monthStr))
        .reduce((sum, m) => sum + m.downtimeHours, 0);
      monthlyDowntime.push({ month: monthLabel, hours });
    }

    // Top failure modes
    const failureModes = new Map<string, number>();
    data.maintenanceOrders
      .filter((m) => (m.type === "corrective" || m.type === "breakdown") && m.rootCause)
      .forEach((m) => {
        const mode = m.rootCause!.slice(0, 50);
        failureModes.set(mode, (failureModes.get(mode) ?? 0) + 1);
      });
    const topFailureModes = Array.from(failureModes.entries())
      .map(([mode, count]) => ({ mode, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalEquipment: activeEquipment.length,
      operational,
      underMaintenance,
      calibrationDue,
      outOfService,
      calibrationCompliancePct,
      pmCompliancePct,
      mtbfDays,
      mttrHours,
      byType,
      byDepartment,
      monthlyDowntime,
      topFailureModes,
    };
  }

  /* ── Helpers ────────────────────────────────────────────── */

  private generateAssetTag(type: EquipmentType): string {
    const prefixes: Record<EquipmentType, string> = {
      production: "PRD",
      manufacturing: "MFG",
      lab: "LAB",
      utility: "UTL",
      HVAC: "HVAC",
      "water-system": "WTR",
    };
    return `${prefixes[type]}-${Date.now().toString(36).toUpperCase()}`;
  }

  private generateCertNumber(): string {
    const year = new Date().getFullYear();
    const seq = Math.floor(Math.random() * 900) + 100;
    return `CAL-${year}-${seq}`;
  }

  private generateWONumber(): string {
    const year = new Date().getFullYear();
    const data = this.load();
    const prefix = `WO-${year}-`;
    const existing = data.maintenanceOrders
      .filter((m) => m.orderNumber.startsWith(prefix))
      .map((m) => parseInt(m.orderNumber.replace(prefix, ""), 10))
      .filter((n) => !isNaN(n));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `${prefix}${String(next).padStart(3, "0")}`;
  }

  getDepartments(): string[] {
    const depts = new Set(this.load().equipment.map((e) => e.department));
    return Array.from(depts).sort();
  }
}

export const equipmentStore = EquipmentStore.getInstance();
