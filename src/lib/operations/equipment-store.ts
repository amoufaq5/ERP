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

/* ── helpers ─────────────────────────────────────────────── */

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

const API_BASE = "/api/v1/equipment";

/* ── Store shape ──────────────────────────────────────────── */

interface StoreData {
  equipment: Equipment[];
  calibrations: CalibrationRecord[];
  maintenanceOrders: MaintenanceOrder[];
  schedules: MaintenanceSchedule[];
}

/* ── API helpers ─────────────────────────────────────────── */

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/* ── Singleton Store ──────────────────────────────────────── */

class EquipmentStore {
  private static instance: EquipmentStore;
  private cache: StoreData | null = null;
  private initPromise: Promise<void> | null = null;

  private constructor() {
    this.initPromise = this.initialize();
  }

  static getInstance(): EquipmentStore {
    if (!EquipmentStore.instance) {
      EquipmentStore.instance = new EquipmentStore();
    }
    return EquipmentStore.instance;
  }

  /* ── initialization ────────────────────────────────────── */

  private async initialize(): Promise<void> {
    try {
      this.cache = await apiFetch<StoreData>("");
    } catch {
      this.cache = { equipment: [], calibrations: [], maintenanceOrders: [], schedules: [] };
    }
  }

  private async ensureLoaded(): Promise<StoreData> {
    if (this.initPromise) {
      await this.initPromise;
      this.initPromise = null;
    }
    return this.cache ?? { equipment: [], calibrations: [], maintenanceOrders: [], schedules: [] };
  }

  async refresh(): Promise<void> {
    this.cache = await apiFetch<StoreData>("");
  }

  /* ── Equipment CRUD ─────────────────────────────────────── */

  getAllEquipment(): Equipment[] {
    return this.cache?.equipment ?? [];
  }

  getEquipmentById(id: string): Equipment | undefined {
    return this.cache?.equipment.find((e) => e.id === id);
  }

  async createEquipment(eq: Omit<Equipment, "id" | "assetTag">): Promise<Equipment> {
    const newEq = await apiFetch<Equipment>("", {
      method: "POST",
      body: JSON.stringify(eq),
    });
    await this.refresh();
    return newEq;
  }

  async updateEquipment(id: string, updates: Partial<Equipment>): Promise<Equipment | undefined> {
    try {
      const updated = await apiFetch<Equipment>(`/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      await this.refresh();
      return updated;
    } catch {
      return undefined;
    }
  }

  async deleteEquipment(id: string): Promise<boolean> {
    try {
      await apiFetch(`/${id}`, { method: "DELETE" });
      await this.refresh();
      return true;
    } catch {
      return false;
    }
  }

  getByDepartment(department: string): Equipment[] {
    return this.cache?.equipment.filter((e) => e.department === department) ?? [];
  }

  getByStatus(status: EquipmentStatus): Equipment[] {
    return this.cache?.equipment.filter((e) => e.status === status) ?? [];
  }

  getByType(type: EquipmentType): Equipment[] {
    return this.cache?.equipment.filter((e) => e.type === type) ?? [];
  }

  getByCriticality(criticality: EquipmentCriticality): Equipment[] {
    return this.cache?.equipment.filter((e) => e.criticality === criticality) ?? [];
  }

  /* ── Calibration CRUD ───────────────────────────────────── */

  getAllCalibrations(): CalibrationRecord[] {
    return this.cache?.calibrations ?? [];
  }

  getCalibrationsByEquipment(equipmentId: string): CalibrationRecord[] {
    return (this.cache?.calibrations ?? [])
      .filter((c) => c.equipmentId === equipmentId)
      .sort((a, b) => new Date(b.calibrationDate).getTime() - new Date(a.calibrationDate).getTime());
  }

  getOverdueCalibrations(): CalibrationRecord[] {
    const today = new Date().toISOString().slice(0, 10);
    const calibrations = this.cache?.calibrations ?? [];
    const latestByEq = new Map<string, CalibrationRecord>();
    for (const c of calibrations) {
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
    const calibrations = this.cache?.calibrations ?? [];
    const latestByEq = new Map<string, CalibrationRecord>();
    for (const c of calibrations) {
      const existing = latestByEq.get(c.equipmentId);
      if (!existing || c.calibrationDate > existing.calibrationDate) {
        latestByEq.set(c.equipmentId, c);
      }
    }
    return Array.from(latestByEq.values()).filter(
      (c) => c.nextDueDate >= today && c.nextDueDate <= futureDate
    );
  }

  async createCalibration(cal: Omit<CalibrationRecord, "id" | "certificateNumber">): Promise<CalibrationRecord> {
    const newCal = await apiFetch<CalibrationRecord>("/calibrations", {
      method: "POST",
      body: JSON.stringify(cal),
    });
    await this.refresh();
    return newCal;
  }

  /* ── Maintenance Order CRUD ─────────────────────────────── */

  getAllMaintenanceOrders(): MaintenanceOrder[] {
    return this.cache?.maintenanceOrders ?? [];
  }

  getMaintenanceByEquipment(equipmentId: string): MaintenanceOrder[] {
    return (this.cache?.maintenanceOrders ?? [])
      .filter((m) => m.equipmentId === equipmentId)
      .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
  }

  getOpenMaintenanceOrders(): MaintenanceOrder[] {
    return (this.cache?.maintenanceOrders ?? []).filter(
      (m) => m.status === "planned" || m.status === "in-progress" || m.status === "on-hold"
    );
  }

  getUpcomingMaintenance(withinDays: number = 30): MaintenanceOrder[] {
    const today = new Date().toISOString().slice(0, 10);
    const futureDate = futureDays(withinDays);
    return (this.cache?.maintenanceOrders ?? []).filter(
      (m) => m.status === "planned" && m.scheduledDate >= today && m.scheduledDate <= futureDate
    );
  }

  getOverdueMaintenance(): MaintenanceOrder[] {
    const today = new Date().toISOString().slice(0, 10);
    return (this.cache?.maintenanceOrders ?? []).filter(
      (m) => (m.status === "planned" || m.status === "in-progress") && m.scheduledDate < today
    );
  }

  async createMaintenanceOrder(order: Omit<MaintenanceOrder, "id" | "orderNumber" | "createdAt">): Promise<MaintenanceOrder> {
    const newOrder = await apiFetch<MaintenanceOrder>("/maintenance-orders", {
      method: "POST",
      body: JSON.stringify(order),
    });
    await this.refresh();
    return newOrder;
  }

  async updateMaintenanceOrder(id: string, updates: Partial<MaintenanceOrder>): Promise<MaintenanceOrder | undefined> {
    try {
      const updated = await apiFetch<MaintenanceOrder>(`/maintenance-orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      await this.refresh();
      return updated;
    } catch {
      return undefined;
    }
  }

  async completeMaintenanceOrder(
    id: string,
    completionDate: string,
    downtimeHours: number,
    partsUsed: MaintenanceOrder["partsUsed"],
    rootCause?: string,
    correctiveAction?: string
  ): Promise<MaintenanceOrder | undefined> {
    try {
      const updated = await apiFetch<MaintenanceOrder>(`/maintenance-orders/${id}/complete`, {
        method: "POST",
        body: JSON.stringify({ completionDate, downtimeHours, partsUsed, rootCause, correctiveAction }),
      });
      await this.refresh();
      return updated;
    } catch {
      return undefined;
    }
  }

  /* ── Schedules ──────────────────────────────────────────── */

  getAllSchedules(): MaintenanceSchedule[] {
    return this.cache?.schedules ?? [];
  }

  getSchedulesByEquipment(equipmentId: string): MaintenanceSchedule[] {
    return (this.cache?.schedules ?? []).filter((s) => s.equipmentId === equipmentId);
  }

  /* ── Calendar Events ────────────────────────────────────── */

  getCalendarEvents(startDate: string, endDate: string): CalendarEvent[] {
    const equipment = this.cache?.equipment ?? [];
    const calibrations = this.cache?.calibrations ?? [];
    const maintenanceOrders = this.cache?.maintenanceOrders ?? [];
    const schedules = this.cache?.schedules ?? [];
    const events: CalendarEvent[] = [];
    const today = new Date().toISOString().slice(0, 10);

    // Calibration events - from latest calibration per equipment
    const latestCals = new Map<string, CalibrationRecord>();
    for (const c of calibrations) {
      const existing = latestCals.get(c.equipmentId);
      if (!existing || c.calibrationDate > existing.calibrationDate) {
        latestCals.set(c.equipmentId, c);
      }
    }
    for (const cal of latestCals.values()) {
      if (cal.nextDueDate >= startDate && cal.nextDueDate <= endDate) {
        const eq = equipment.find((e) => e.id === cal.equipmentId);
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
    for (const mo of maintenanceOrders) {
      if (mo.status === "completed" || mo.status === "cancelled") continue;
      if (mo.scheduledDate >= startDate && mo.scheduledDate <= endDate) {
        const eq = equipment.find((e) => e.id === mo.equipmentId);
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
    for (const sch of schedules) {
      if (!sch.active) continue;
      if (sch.nextDue >= startDate && sch.nextDue <= endDate) {
        const eq = equipment.find((e) => e.id === sch.equipmentId);
        if (!eq || eq.status === "retired") continue;
        // Check not already represented by a maintenance order
        const alreadyPlanned = maintenanceOrders.some(
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
    const equipment = this.cache?.equipment ?? [];
    const calibrations = this.cache?.calibrations ?? [];
    const maintenanceOrders = this.cache?.maintenanceOrders ?? [];
    const activeEquipment = equipment.filter((e) => e.status !== "retired");

    // Status counts
    const operational = activeEquipment.filter((e) => e.status === "operational").length;
    const underMaintenance = activeEquipment.filter((e) => e.status === "under-maintenance").length;
    const calibrationDue = activeEquipment.filter((e) => e.status === "calibration-due").length;
    const outOfService = activeEquipment.filter((e) => e.status === "out-of-service").length;

    // Calibration compliance: equipment with valid (non-overdue) calibration / total active
    const today = new Date().toISOString().slice(0, 10);
    const latestCals = new Map<string, CalibrationRecord>();
    for (const c of calibrations) {
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
    const completedPMs = maintenanceOrders.filter(
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
    const breakdowns = maintenanceOrders.filter(
      (m) => m.type === "breakdown" && m.status === "completed"
    );
    const mtbfDays = breakdowns.length > 0
      ? Math.round(
          (activeEquipment.length * 365) / breakdowns.length
        )
      : 365;

    // MTTR: average downtime hours for completed corrective/breakdown orders
    const repairOrders = maintenanceOrders.filter(
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
      const hours = maintenanceOrders
        .filter((m) => m.status === "completed" && m.completionDate && m.completionDate.startsWith(monthStr))
        .reduce((sum, m) => sum + m.downtimeHours, 0);
      monthlyDowntime.push({ month: monthLabel, hours });
    }

    // Top failure modes
    const failureModes = new Map<string, number>();
    maintenanceOrders
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

  getDepartments(): string[] {
    const depts = new Set((this.cache?.equipment ?? []).map((e) => e.department));
    return Array.from(depts).sort();
  }
}

export const equipmentStore = EquipmentStore.getInstance();
