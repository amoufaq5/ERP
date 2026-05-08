"use client";

import type {
  TrainingRecord,
  TrainingRequirement,
  TrainingPlan,
  TrainingSession,
  TrainingMatrixCell,
  TrainingMetrics,
  TrainingStatus,
  CompetencyLevel,
} from "./training-types";

const STORAGE_KEY = "pharma.training";

/* ─── helpers ─── */
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

/* ─── reference data ─── */

const ROLES = [
  "QA Manager",
  "QC Analyst",
  "Production Operator",
  "Warehouse Staff",
  "Maintenance Tech",
  "QA Inspector",
  "Lab Technician",
  "Documentation Specialist",
] as const;

const DEPARTMENTS: Record<string, string> = {
  "QA Manager": "Quality Assurance",
  "QC Analyst": "Quality Control",
  "Production Operator": "Production",
  "Warehouse Staff": "Warehouse",
  "Maintenance Tech": "Engineering",
  "QA Inspector": "Quality Assurance",
  "Lab Technician": "Quality Control",
  "Documentation Specialist": "Quality Assurance",
};

const SOPS: { id: string; title: string }[] = [
  { id: "SOP-GMP-001", title: "GMP Basics & Hygiene" },
  { id: "SOP-QA-010", title: "Deviation Handling" },
  { id: "SOP-QA-015", title: "CAPA Management" },
  { id: "SOP-QA-020", title: "Batch Record Review" },
  { id: "SOP-QC-005", title: "Sampling Procedures" },
  { id: "SOP-QC-010", title: "Equipment Calibration" },
  { id: "SOP-VAL-005", title: "Cleaning Validation" },
  { id: "SOP-QA-025", title: "Change Control" },
  { id: "SOP-QC-015", title: "OOS Investigation" },
  { id: "SOP-DOC-001", title: "Document Control" },
  { id: "SOP-QC-020", title: "Environmental Monitoring" },
  { id: "SOP-UTL-005", title: "Water System Operation" },
  { id: "SOP-ENG-010", title: "HVAC Operation" },
  { id: "SOP-WH-005", title: "Material Handling" },
  { id: "SOP-HSE-001", title: "Safety Procedures" },
];

/* Role-SOP requirement matrix (true = required) */
const ROLE_REQUIREMENTS: Record<string, string[]> = {
  "QA Manager": [
    "SOP-GMP-001", "SOP-QA-010", "SOP-QA-015", "SOP-QA-020",
    "SOP-QA-025", "SOP-QC-015", "SOP-DOC-001", "SOP-VAL-005",
    "SOP-HSE-001", "SOP-QC-020",
  ],
  "QC Analyst": [
    "SOP-GMP-001", "SOP-QA-010", "SOP-QC-005", "SOP-QC-010",
    "SOP-QC-015", "SOP-QC-020", "SOP-DOC-001", "SOP-HSE-001",
    "SOP-VAL-005",
  ],
  "Production Operator": [
    "SOP-GMP-001", "SOP-QA-010", "SOP-QA-020", "SOP-VAL-005",
    "SOP-WH-005", "SOP-HSE-001", "SOP-ENG-010", "SOP-DOC-001",
  ],
  "Warehouse Staff": [
    "SOP-GMP-001", "SOP-WH-005", "SOP-DOC-001", "SOP-HSE-001",
    "SOP-QA-010", "SOP-UTL-005",
  ],
  "Maintenance Tech": [
    "SOP-GMP-001", "SOP-QC-010", "SOP-ENG-010", "SOP-UTL-005",
    "SOP-HSE-001", "SOP-VAL-005", "SOP-DOC-001",
  ],
  "QA Inspector": [
    "SOP-GMP-001", "SOP-QA-010", "SOP-QA-015", "SOP-QA-020",
    "SOP-QC-005", "SOP-QA-025", "SOP-DOC-001", "SOP-HSE-001",
    "SOP-QC-020", "SOP-VAL-005",
  ],
  "Lab Technician": [
    "SOP-GMP-001", "SOP-QC-005", "SOP-QC-010", "SOP-QC-015",
    "SOP-QC-020", "SOP-UTL-005", "SOP-DOC-001", "SOP-HSE-001",
  ],
  "Documentation Specialist": [
    "SOP-GMP-001", "SOP-DOC-001", "SOP-QA-010", "SOP-QA-015",
    "SOP-QA-025", "SOP-QA-020", "SOP-HSE-001",
  ],
};

const EMPLOYEES: { id: string; name: string; role: string }[] = [
  { id: "emp-01", name: "Dr. Laila Farouk", role: "QA Manager" },
  { id: "emp-02", name: "Dr. Rania Abdel-Aziz", role: "QC Analyst" },
  { id: "emp-03", name: "Ahmad Mostafa", role: "Production Operator" },
  { id: "emp-04", name: "Eng. Tarek Nour", role: "Warehouse Staff" },
  { id: "emp-05", name: "Eng. Mohamed Fathy", role: "Maintenance Tech" },
  { id: "emp-06", name: "Pharm. Hoda Salem", role: "QA Inspector" },
  { id: "emp-07", name: "Nourhan Adel", role: "Lab Technician" },
  { id: "emp-08", name: "Pharm. Mariam Khalil", role: "Documentation Specialist" },
];

const TRAINERS = [
  "Dr. Laila Farouk",
  "Dr. Rania Abdel-Aziz",
  "Dr. Youssef Kamel",
  "Dr. Khaled Mahmoud",
  "External Trainer",
];

/* ─── seed builders ─── */
function buildRequirements(): TrainingRequirement[] {
  const reqs: TrainingRequirement[] = [];
  let idx = 0;
  for (const role of ROLES) {
    const docIds = ROLE_REQUIREMENTS[role] || [];
    for (const docId of docIds) {
      const sop = SOPS.find((s) => s.id === docId)!;
      idx++;
      reqs.push({
        id: `req-${idx}`,
        role,
        department: DEPARTMENTS[role],
        documentId: sop.id,
        documentTitle: sop.title,
        frequency: docId === "SOP-GMP-001" ? "annual" : idx % 3 === 0 ? "biannual" : "annual",
        mandatory: true,
        priority: docId === "SOP-GMP-001" || docId === "SOP-HSE-001" ? "critical" : "high",
        validityMonths: docId === "SOP-GMP-001" ? 12 : idx % 3 === 0 ? 6 : 12,
        assessmentRequired: true,
        passMark: 80,
      });
    }
  }
  return reqs;
}

function buildRecords(): TrainingRecord[] {
  const records: TrainingRecord[] = [];
  let idx = 0;

  // For each employee, create records for a subset of their required SOPs
  for (const emp of EMPLOYEES) {
    const reqDocs = ROLE_REQUIREMENTS[emp.role] || [];
    for (let d = 0; d < reqDocs.length; d++) {
      const docId = reqDocs[d];
      const sop = SOPS.find((s) => s.id === docId)!;
      idx++;

      // Create a varied mix: completed, scheduled, overdue, in-progress, expired
      const seed = idx % 10;
      let status: TrainingStatus;
      let competencyLevel: CompetencyLevel;
      let completionDate: string | undefined;
      let expiryDate: string | undefined;
      let scheduledDate: string;
      let score: number | undefined;

      if (seed <= 4) {
        // 50% completed
        status = "completed";
        competencyLevel = seed <= 2 ? "competent" : "expert";
        const ago = 30 + seed * 40;
        completionDate = daysAgo(ago);
        expiryDate = futureDays(365 - ago);
        scheduledDate = daysAgo(ago + 5);
        score = 80 + Math.floor((idx * 7) % 21);
      } else if (seed === 5 || seed === 6) {
        // 20% scheduled
        status = "scheduled";
        competencyLevel = "not-trained";
        scheduledDate = futureDays(5 + seed * 3);
      } else if (seed === 7) {
        // 10% in-progress
        status = "in-progress";
        competencyLevel = "in-training";
        scheduledDate = daysAgo(3);
      } else if (seed === 8) {
        // 10% overdue
        status = "overdue";
        competencyLevel = "not-trained";
        scheduledDate = daysAgo(15 + idx % 20);
      } else {
        // 10% expired
        status = "expired";
        competencyLevel = "not-trained";
        completionDate = daysAgo(400);
        expiryDate = daysAgo(35);
        scheduledDate = daysAgo(405);
        score = 82 + (idx % 10);
      }

      records.push({
        id: `tr-${idx}`,
        employeeId: emp.id,
        employeeName: emp.name,
        employeeRole: emp.role,
        department: DEPARTMENTS[emp.role],
        documentId: docId,
        documentTitle: sop.title,
        trainingType: seed <= 4 ? "initial" : seed === 9 ? "refresher" : "initial",
        status,
        scheduledDate,
        completionDate,
        expiryDate,
        trainer: TRAINERS[idx % TRAINERS.length],
        assessmentScore: score,
        assessmentPassMark: 80,
        competencyLevel,
        notes: status === "overdue" ? "Awaiting rescheduling" : undefined,
      });
    }
  }

  return records;
}

function buildSessions(): TrainingSession[] {
  return [
    {
      id: "sess-1",
      title: "Annual GMP Refresher Training",
      documentId: "SOP-GMP-001",
      documentTitle: "GMP Basics & Hygiene",
      trainingType: "refresher",
      trainer: "Dr. Laila Farouk",
      scheduledDate: futureDays(7),
      startTime: "09:00",
      endTime: "12:00",
      location: "Training Room A",
      maxAttendees: 20,
      attendeeIds: ["emp-01", "emp-02", "emp-03", "emp-04", "emp-05", "emp-06", "emp-07", "emp-08"],
      attendeeNames: EMPLOYEES.map((e) => e.name),
      status: "planned",
      notes: "Mandatory annual GMP refresher for all staff",
    },
    {
      id: "sess-2",
      title: "Deviation Handling Workshop",
      documentId: "SOP-QA-010",
      documentTitle: "Deviation Handling",
      trainingType: "refresher",
      trainer: "Dr. Youssef Kamel",
      scheduledDate: futureDays(14),
      startTime: "10:00",
      endTime: "13:00",
      location: "Conference Room B",
      maxAttendees: 15,
      attendeeIds: ["emp-01", "emp-03", "emp-06", "emp-08"],
      attendeeNames: ["Dr. Laila Farouk", "Ahmad Mostafa", "Pharm. Hoda Salem", "Pharm. Mariam Khalil"],
      status: "planned",
      notes: "Focus on updated deviation classification criteria",
    },
    {
      id: "sess-3",
      title: "OOS Investigation Practical",
      documentId: "SOP-QC-015",
      documentTitle: "OOS Investigation",
      trainingType: "initial",
      trainer: "Dr. Rania Abdel-Aziz",
      scheduledDate: futureDays(21),
      startTime: "09:00",
      endTime: "16:00",
      location: "QC Lab Training Area",
      maxAttendees: 10,
      attendeeIds: ["emp-02", "emp-07"],
      attendeeNames: ["Dr. Rania Abdel-Aziz", "Nourhan Adel"],
      status: "planned",
      notes: "Hands-on practical with case studies",
    },
    {
      id: "sess-4",
      title: "Equipment Calibration Certification",
      documentId: "SOP-QC-010",
      documentTitle: "Equipment Calibration",
      trainingType: "on-the-job",
      trainer: "Eng. Mohamed Fathy",
      scheduledDate: futureDays(3),
      startTime: "08:00",
      endTime: "15:00",
      location: "Calibration Lab",
      maxAttendees: 8,
      attendeeIds: ["emp-05", "emp-07"],
      attendeeNames: ["Eng. Mohamed Fathy", "Nourhan Adel"],
      status: "planned",
    },
    {
      id: "sess-5",
      title: "Document Control System Update",
      documentId: "SOP-DOC-001",
      documentTitle: "Document Control",
      trainingType: "retraining",
      trainer: "Pharm. Mariam Khalil",
      scheduledDate: daysAgo(5),
      startTime: "10:00",
      endTime: "12:00",
      location: "Training Room A",
      maxAttendees: 20,
      attendeeIds: ["emp-01", "emp-06", "emp-08"],
      attendeeNames: ["Dr. Laila Farouk", "Pharm. Hoda Salem", "Pharm. Mariam Khalil"],
      status: "completed",
      completedAt: daysAgo(5),
      notes: "New electronic document management system walkthrough",
    },
  ];
}

function buildPlans(): TrainingPlan[] {
  const reqs = buildRequirements();
  return ROLES.map((role, i) => ({
    id: `plan-${i + 1}`,
    name: `${role} Training Plan`,
    description: `Mandatory training requirements for ${role} role in ${DEPARTMENTS[role]}`,
    role,
    department: DEPARTMENTS[role],
    requirements: reqs.filter((r) => r.role === role),
    createdAt: daysAgo(180),
    updatedAt: daysAgo(30),
    createdBy: "Dr. Laila Farouk",
  }));
}

interface StorageData {
  records: TrainingRecord[];
  requirements: TrainingRequirement[];
  plans: TrainingPlan[];
  sessions: TrainingSession[];
}

/* ─── store ─── */
class TrainingStore {
  private static instance: TrainingStore;

  private constructor() {
    this.seed();
  }

  static getInstance(): TrainingStore {
    if (!TrainingStore.instance) {
      TrainingStore.instance = new TrainingStore();
    }
    return TrainingStore.instance;
  }

  /* persistence */
  private seed(): void {
    if (typeof window === "undefined") return;
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      const data: StorageData = {
        records: buildRecords(),
        requirements: buildRequirements(),
        plans: buildPlans(),
        sessions: buildSessions(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }

  private load(): StorageData {
    if (typeof window === "undefined") {
      return { records: [], requirements: [], plans: [], sessions: [] };
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { records: [], requirements: [], plans: [], sessions: [] };
    }
    return JSON.parse(raw) as StorageData;
  }

  private save(data: StorageData): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /* ─── Records CRUD ─── */
  getAllRecords(): TrainingRecord[] {
    return this.autoDetectStatuses(this.load().records);
  }

  getRecordById(id: string): TrainingRecord | undefined {
    return this.getAllRecords().find((r) => r.id === id);
  }

  getByEmployee(employeeId: string): TrainingRecord[] {
    return this.getAllRecords().filter((r) => r.employeeId === employeeId);
  }

  getByDocument(documentId: string): TrainingRecord[] {
    return this.getAllRecords().filter((r) => r.documentId === documentId);
  }

  getOverdue(): TrainingRecord[] {
    return this.getAllRecords().filter((r) => r.status === "overdue");
  }

  getExpiringInDays(days: number): TrainingRecord[] {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    return this.getAllRecords().filter((r) => {
      if (!r.expiryDate || r.status !== "completed") return false;
      const exp = new Date(r.expiryDate);
      return exp > now && exp <= cutoff;
    });
  }

  getComplianceRate(): number {
    const records = this.getAllRecords();
    if (records.length === 0) return 100;
    const compliant = records.filter(
      (r) => r.status === "completed" && r.competencyLevel !== "not-trained"
    ).length;
    return Math.round((compliant / records.length) * 100);
  }

  createRecord(record: Omit<TrainingRecord, "id">): TrainingRecord {
    const data = this.load();
    const newRecord: TrainingRecord = {
      ...record,
      id: `tr-${Date.now()}`,
    };
    data.records.push(newRecord);
    this.save(data);
    return newRecord;
  }

  updateRecord(id: string, updates: Partial<TrainingRecord>): TrainingRecord | undefined {
    const data = this.load();
    const idx = data.records.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    data.records[idx] = { ...data.records[idx], ...updates };
    this.save(data);
    return data.records[idx];
  }

  completeTraining(
    id: string,
    score: number,
    completionDate?: string
  ): TrainingRecord | undefined {
    const now = completionDate || new Date().toISOString();
    const record = this.getRecordById(id);
    if (!record) return undefined;
    const expiryDate = new Date(now);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    return this.updateRecord(id, {
      status: "completed",
      completionDate: now,
      expiryDate: expiryDate.toISOString(),
      assessmentScore: score,
      competencyLevel: score >= 90 ? "expert" : "competent",
    });
  }

  deleteRecord(id: string): boolean {
    const data = this.load();
    const before = data.records.length;
    data.records = data.records.filter((r) => r.id !== id);
    this.save(data);
    return data.records.length < before;
  }

  /* ─── Requirements ─── */
  getAllRequirements(): TrainingRequirement[] {
    return this.load().requirements;
  }

  getRequirementsByRole(role: string): TrainingRequirement[] {
    return this.load().requirements.filter((r) => r.role === role);
  }

  /* ─── Plans ─── */
  getAllPlans(): TrainingPlan[] {
    return this.load().plans;
  }

  getPlanByRole(role: string): TrainingPlan | undefined {
    return this.load().plans.find((p) => p.role === role);
  }

  /* ─── Sessions ─── */
  getAllSessions(): TrainingSession[] {
    return this.load().sessions;
  }

  getUpcomingSessions(): TrainingSession[] {
    const now = new Date();
    return this.load().sessions.filter(
      (s) => s.status === "planned" && new Date(s.scheduledDate) >= now
    );
  }

  getPastSessions(): TrainingSession[] {
    return this.load().sessions.filter(
      (s) => s.status === "completed" || s.status === "cancelled"
    );
  }

  createSession(session: Omit<TrainingSession, "id">): TrainingSession {
    const data = this.load();
    const newSession: TrainingSession = {
      ...session,
      id: `sess-${Date.now()}`,
    };
    data.sessions.push(newSession);
    this.save(data);
    return newSession;
  }

  updateSession(id: string, updates: Partial<TrainingSession>): TrainingSession | undefined {
    const data = this.load();
    const idx = data.sessions.findIndex((s) => s.id === id);
    if (idx === -1) return undefined;
    data.sessions[idx] = { ...data.sessions[idx], ...updates };
    this.save(data);
    return data.sessions[idx];
  }

  /* ─── Matrix ─── */
  getMatrixData(): TrainingMatrixCell[] {
    const records = this.getAllRecords();
    const requirements = this.getAllRequirements();
    const cells: TrainingMatrixCell[] = [];

    for (const emp of EMPLOYEES) {
      for (const sop of SOPS) {
        const req = requirements.find(
          (r) => r.role === emp.role && r.documentId === sop.id
        );
        const record = records.find(
          (r) => r.employeeId === emp.id && r.documentId === sop.id
        );

        if (!req) {
          cells.push({
            employeeId: emp.id,
            employeeName: emp.name,
            employeeRole: emp.role,
            department: DEPARTMENTS[emp.role],
            documentId: sop.id,
            documentTitle: sop.title,
            competencyLevel: "not-trained",
            status: "not-required",
          });
          continue;
        }

        const daysUntilExpiry =
          record?.expiryDate
            ? daysBetween(new Date().toISOString(), record.expiryDate)
            : undefined;

        cells.push({
          employeeId: emp.id,
          employeeName: emp.name,
          employeeRole: emp.role,
          department: DEPARTMENTS[emp.role],
          documentId: sop.id,
          documentTitle: sop.title,
          competencyLevel: record?.competencyLevel || "not-trained",
          status: record?.status || "scheduled",
          lastTrainingDate: record?.completionDate,
          expiryDate: record?.expiryDate,
          daysUntilExpiry,
          recordId: record?.id,
        });
      }
    }

    return cells;
  }

  getMatrixDataByRole(role: string): TrainingMatrixCell[] {
    return this.getMatrixData().filter((c) => c.employeeRole === role);
  }

  getMatrixDataByDepartment(department: string): TrainingMatrixCell[] {
    return this.getMatrixData().filter((c) => c.department === department);
  }

  /* ─── Metrics ─── */
  getMetrics(): TrainingMetrics {
    const records = this.getAllRecords();
    const requirements = this.getAllRequirements();
    const sessions = this.getAllSessions();
    const now = new Date();
    const cutoff30 = new Date();
    cutoff30.setDate(cutoff30.getDate() + 30);

    const completed = records.filter((r) => r.status === "completed");
    const overdue = records.filter((r) => r.status === "overdue");
    const expiring = records.filter((r) => {
      if (!r.expiryDate || r.status !== "completed") return false;
      const exp = new Date(r.expiryDate);
      return exp > now && exp <= cutoff30;
    });
    const scheduledSessions = sessions.filter(
      (s) => s.status === "planned"
    ).length;

    const complianceRate = records.length > 0
      ? Math.round((completed.length / records.length) * 100)
      : 100;

    const scored = completed.filter((r) => r.assessmentScore != null);
    const avgScore = scored.length > 0
      ? Math.round(scored.reduce((s, r) => s + (r.assessmentScore || 0), 0) / scored.length)
      : 0;

    // By department
    const deptMap = new Map<string, { total: number; completed: number }>();
    for (const r of records) {
      const cur = deptMap.get(r.department) || { total: 0, completed: 0 };
      cur.total++;
      if (r.status === "completed") cur.completed++;
      deptMap.set(r.department, cur);
    }
    const byDepartment = Array.from(deptMap.entries()).map(([department, v]) => ({
      department,
      compliance: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0,
      total: v.total,
      completed: v.completed,
    }));

    // By role
    const roleMap = new Map<string, { total: number; completed: number }>();
    for (const r of records) {
      const cur = roleMap.get(r.employeeRole) || { total: 0, completed: 0 };
      cur.total++;
      if (r.status === "completed") cur.completed++;
      roleMap.set(r.employeeRole, cur);
    }
    const byRole = Array.from(roleMap.entries()).map(([role, v]) => ({
      role,
      compliance: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0,
      total: v.total,
      completed: v.completed,
    }));

    // By document
    const docMap = new Map<string, { title: string; total: number; completed: number }>();
    for (const r of records) {
      const cur = docMap.get(r.documentId) || { title: r.documentTitle, total: 0, completed: 0 };
      cur.total++;
      if (r.status === "completed") cur.completed++;
      docMap.set(r.documentId, cur);
    }
    const byDocument = Array.from(docMap.entries()).map(([documentId, v]) => ({
      documentId,
      documentTitle: v.title,
      compliance: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0,
      total: v.total,
      completed: v.completed,
    }));

    // Competency distribution
    const compMap = new Map<CompetencyLevel, number>();
    for (const r of records) {
      compMap.set(r.competencyLevel, (compMap.get(r.competencyLevel) || 0) + 1);
    }
    const competencyDistribution: { level: CompetencyLevel; count: number }[] = (
      ["not-trained", "in-training", "competent", "expert"] as CompetencyLevel[]
    ).map((level) => ({ level, count: compMap.get(level) || 0 }));

    // Overdue by department
    const overdueDeptMap = new Map<string, number>();
    for (const r of overdue) {
      overdueDeptMap.set(r.department, (overdueDeptMap.get(r.department) || 0) + 1);
    }
    const overdueByDepartment = Array.from(overdueDeptMap.entries()).map(
      ([department, count]) => ({ department, count })
    );

    // Training hours (estimate: 3h per completed training)
    const thisMonth = completed.filter((r) => {
      if (!r.completionDate) return false;
      const d = new Date(r.completionDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const thisYear = completed.filter((r) => {
      if (!r.completionDate) return false;
      const d = new Date(r.completionDate);
      return d.getFullYear() === now.getFullYear();
    }).length;

    return {
      totalRequirements: requirements.length,
      totalRecords: records.length,
      completedCount: completed.length,
      overdueCount: overdue.length,
      expiringIn30Days: expiring.length,
      scheduledSessions,
      complianceRate,
      avgAssessmentScore: avgScore,
      byDepartment,
      byRole,
      byDocument,
      competencyDistribution,
      overdueByDepartment,
      trainingHoursThisMonth: thisMonth * 3,
      trainingHoursThisYear: thisYear * 3,
    };
  }

  /* ─── auto-detect status ─── */
  private autoDetectStatuses(records: TrainingRecord[]): TrainingRecord[] {
    const now = new Date();
    return records.map((r) => {
      let status = r.status;
      let competencyLevel = r.competencyLevel;

      // Check expired
      if (r.expiryDate && r.status === "completed") {
        if (new Date(r.expiryDate) < now) {
          status = "expired";
          competencyLevel = "not-trained";
        }
      }

      // Check overdue
      if (r.status === "scheduled" && new Date(r.scheduledDate) < now) {
        status = "overdue";
      }

      return { ...r, status, competencyLevel };
    });
  }

  /* ─── reference data accessors ─── */
  getEmployees() {
    return EMPLOYEES.map((e) => ({ ...e, department: DEPARTMENTS[e.role] }));
  }

  getSOPs() {
    return [...SOPS];
  }

  getRoles() {
    return [...ROLES];
  }

  getDepartments() {
    return [...new Set(Object.values(DEPARTMENTS))];
  }
}

export const trainingStore = TrainingStore.getInstance();
