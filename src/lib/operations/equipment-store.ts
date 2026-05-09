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
  // eq-002 HPLC (overdue)
  { id: "cal-002", equipmentId: "eq-002", calibrationDate: daysAgo(100), nextDueDate: daysAgo(10),
    standardUsed: "USP Caffeine Reference Standard & Holmium Oxide Filter", standardCertificate: "USP-RS-2025-C078",
    result: "pass", certificateNumber: "CAL-2025-088", performedBy: "Agilent Service Engineer",
    asFoundReadings: "Wavelength accuracy: 253.9 nm, Flow accuracy: 1.001 ml/min",
    asLeftReadings: "Wavelength: 253.9 nm, Flow: 1.001 ml/min", temperatureC: 22.0, humidityPct: 44 },
  // eq-003 Water System
  { id: "cal-003", equipmentId: "eq-003", calibrationDate: daysAgo(10), nextDueDate: futureDays(80),
    standardUsed: "Conductivity Standard 1.413 uS/cm & TOC Standard 500 ppb", standardCertificate: "COND-2025-1413",
    result: "pass", certificateNumber: "CAL-2026-003", performedBy: "Eng. Tarek Nour",
    asFoundReadings: "Conductivity: 0.8 uS/cm (spec: <1.3), TOC: 120 ppb (spec: <500)",
    asLeftReadings: "Conductivity: 0.8 uS/cm, TOC: 120 ppb", temperatureC: 25.0, humidityPct: 50 },
  // eq-004 Granulator (fail)
  { id: "cal-004", equipmentId: "eq-004", calibrationDate: daysAgo(120), nextDueDate: daysAgo(30),
    standardUsed: "Certified Torque Meter & Speed Sensor", standardCertificate: "TQ-2025-0112",
    result: "fail", certificateNumber: "CAL-2025-079", performedBy: "Eng. Ahmed Mostafa",
    asFoundReadings: "Impeller speed: 185 rpm (spec: 200 +/- 5 rpm) - FAIL",
    asLeftReadings: "Unable to adjust - gearbox failure. Equipment OOS.",
    notes: "Equipment placed out of service pending gearbox replacement" },
  // eq-001 historical
  { id: "cal-005", equipmentId: "eq-001", calibrationDate: daysAgo(135), nextDueDate: daysAgo(45),
    standardUsed: "Certified Force Gauge 50kN (NIST Traceable)", standardCertificate: "NIST-FG-2025-0887",
    result: "pass", certificateNumber: "CAL-2025-089", performedBy: "Eng. Ahmed Mostafa",
    asFoundReadings: "Main compression: 19.98 kN", asLeftReadings: "Main compression: 19.98 kN", temperatureC: 23.0, humidityPct: 42 },
];

/* ── Seed: Maintenance Orders ─────────────────────────────── */

const SEED_MAINTENANCE: MaintenanceOrder[] = [
  // Completed PM
  { id: "mo-001", orderNumber: "WO-2026-001", equipmentId: "eq-001", type: "preventive",
    priority: "medium", description: "Monthly PM - Tablet Press: lubrication, die inspection, turret alignment check",
    assignedTo: "Eng. Ahmed Mostafa", scheduledDate: daysAgo(20), completionDate: daysAgo(20),
    partsUsed: [{ partName: "Turret Lubricant", partNumber: "LUB-TP-001", quantity: 2, unitCost: 150 }],
    downtimeHours: 4, status: "completed", createdAt: daysAgo(25) },
  // Planned PM
  { id: "mo-002", orderNumber: "WO-2026-002", equipmentId: "eq-001", type: "preventive",
    priority: "medium", description: "Monthly PM - Tablet Press: lubrication, die inspection, turret alignment check",
    assignedTo: "Eng. Ahmed Mostafa", scheduledDate: futureDays(10),
    partsUsed: [], downtimeHours: 0, status: "planned", createdAt: daysAgo(2) },
  // Completed corrective
  { id: "mo-003", orderNumber: "WO-2026-003", equipmentId: "eq-003", type: "corrective",
    priority: "high", description: "Water System - EDI module low current alarm, conductivity rising",
    assignedTo: "MECO Service Engineer", scheduledDate: daysAgo(55), completionDate: daysAgo(53),
    partsUsed: [{ partName: "EDI Module Stack", partNumber: "MC-EDI-6000", quantity: 1, unitCost: 35000 }],
    downtimeHours: 48, status: "completed", rootCause: "EDI resin exhaustion after 5 years of service",
    correctiveAction: "Replaced EDI stack, implemented conductivity trending to predict replacement", createdAt: daysAgo(55) },
  // Breakdown on-hold
  { id: "mo-004", orderNumber: "WO-2026-004", equipmentId: "eq-004", type: "breakdown",
    priority: "urgent", description: "Granulator - Complete gearbox failure during batch processing, production stopped",
    assignedTo: "Eng. Ahmed Mostafa", scheduledDate: daysAgo(10),
    partsUsed: [], downtimeHours: 240, status: "on-hold",
    rootCause: "Gearbox bearing seizure due to insufficient lubrication interval",
    correctiveAction: "Replacement gearbox ordered from Diosna Germany. ETA 2 weeks.", createdAt: daysAgo(10) },
  // Planned PM for water system
  { id: "mo-005", orderNumber: "WO-2026-005", equipmentId: "eq-003", type: "preventive",
    priority: "high", description: "Monthly PM - Water Purification: RO membrane integrity, UV lamp check",
    assignedTo: "Eng. Tarek Nour", scheduledDate: futureDays(16),
    partsUsed: [], downtimeHours: 0, status: "planned", createdAt: daysAgo(3) },
];

/* ── Seed: Maintenance Schedules ──────────────────────────── */

const SEED_SCHEDULES: MaintenanceSchedule[] = [
  { id: "ms-001", equipmentId: "eq-001", frequency: "monthly", lastPerformed: daysAgo(20), nextDue: futureDays(10),
    checklistItems: [
      { id: "cl-001", description: "Lubricate turret and cam tracks", required: true },
      { id: "cl-002", description: "Inspect upper and lower punches for wear", required: true },
      { id: "cl-003", description: "Check die bore dimensions", required: true },
      { id: "cl-004", description: "Clean and inspect dust extraction system", required: true },
    ], assignedTo: "Eng. Ahmed Mostafa", active: true },
  { id: "ms-002", equipmentId: "eq-002", frequency: "semi-annual", lastPerformed: daysAgo(50), nextDue: futureDays(130),
    checklistItems: [
      { id: "cl-005", description: "Replace deuterium lamp if >2000 hours", required: true },
      { id: "cl-006", description: "Check and replace pump seals", required: true },
      { id: "cl-007", description: "Verify autosampler precision", required: true },
    ], assignedTo: "Agilent Service Engineer", active: true },
  { id: "ms-003", equipmentId: "eq-003", frequency: "monthly", lastPerformed: daysAgo(14), nextDue: futureDays(16),
    checklistItems: [
      { id: "cl-008", description: "Check RO membrane rejection rate", required: true },
      { id: "cl-009", description: "Verify UV lamp intensity (>80%)", required: true },
      { id: "cl-010", description: "Calibrate conductivity sensors", required: true },
      { id: "cl-011", description: "Sample and test for endotoxin", required: true },
    ], assignedTo: "Eng. Tarek Nour", active: true },
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
