"use client";

// ─── Activity Types ─────────────────────────────────────────────────────────

export type ActivityType =
  | "visit"
  | "plan"
  | "request"
  | "expense"
  | "note"
  | "status_change"
  | "assignment"
  | "creation"
  | "approval"
  | "call"
  | "email"
  | "meeting";

export type ActivityEntityType =
  | "doctor"
  | "account"
  | "lead"
  | "user"
  | "business_unit";

export interface RelatedEntity {
  type: string;
  id: string;
  name: string;
}

export interface ActivityEntry {
  id: string;
  entityType: ActivityEntityType;
  entityId: string;
  activityType: ActivityType;
  title: string;
  description?: string;
  userId: string;
  userName: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  relatedEntities?: RelatedEntity[];
}

// ─── Storage ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "pharma.activityFeed";
const MAX_ENTRIES = 5000;

function loadEntries(): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as ActivityEntry[];
    }
  } catch {
    // ignore
  }
  return [];
}

function saveEntries(entries: ActivityEntry[]): void {
  try {
    // Cap at MAX_ENTRIES, keeping the most recent
    const trimmed =
      entries.length > MAX_ENTRIES ? entries.slice(0, MAX_ENTRIES) : entries;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore -- quota may be exceeded
  }
}

function genActivityId(): string {
  return `act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Service functions ──────────────────────────────────────────────────────

export function addActivity(
  entry: Omit<ActivityEntry, "id" | "timestamp">
): ActivityEntry {
  const full: ActivityEntry = {
    ...entry,
    id: genActivityId(),
    timestamp: new Date().toISOString(),
  };
  const entries = loadEntries();
  // Prepend so newest first
  entries.unshift(full);
  saveEntries(entries);
  return full;
}

export interface GetActivitiesOptions {
  limit?: number;
  offset?: number;
  types?: ActivityType[];
}

export function getActivities(
  entityType: string,
  entityId: string,
  options?: GetActivitiesOptions
): ActivityEntry[] {
  const entries = loadEntries();
  let filtered = entries.filter(
    (e) => e.entityType === entityType && e.entityId === entityId
  );

  if (options?.types && options.types.length > 0) {
    const typeSet = new Set(options.types);
    filtered = filtered.filter((e) => typeSet.has(e.activityType));
  }

  const offset = options?.offset ?? 0;
  const limit = options?.limit ?? 50;
  return filtered.slice(offset, offset + limit);
}

export function getRecentActivities(
  userId: string,
  limit: number = 20
): ActivityEntry[] {
  const entries = loadEntries();
  return entries.filter((e) => e.userId === userId).slice(0, limit);
}

export function getAllActivities(): ActivityEntry[] {
  return loadEntries();
}

// ─── Seed / auto-generate from store data ───────────────────────────────────

const SEED_KEY = "pharma.activityFeed.seeded";

export interface SeedDataSources {
  visits: Array<{
    id: string;
    repId: string;
    doctorId: string;
    dateTime: string;
    notes: string;
    status: string;
    amAccountId?: string;
  }>;
  weeklyPlans: Array<{
    id: string;
    repId: string;
    weekStartDate: string;
    status: string;
    createdAt: string;
  }>;
  marketRequests: Array<{
    id: string;
    requestedById: string;
    doctorId?: string;
    description: string;
    status: string;
    type: string;
    createdAt: string;
  }>;
  doctors: Array<{
    id: string;
    name: string;
    assignedRepId: string | null;
    createdAt: string;
  }>;
  amAccounts: Array<{
    id: string;
    name: string;
    assignedRepId: string | null;
    createdAt: string;
  }>;
  users: Array<{
    id: string;
    name: string;
  }>;
}

export function seedActivitiesFromStore(data: SeedDataSources): void {
  try {
    if (localStorage.getItem(SEED_KEY)) return;
  } catch {
    return;
  }

  const entries: ActivityEntry[] = [];
  const userMap = new Map(data.users.map((u) => [u.id, u.name]));
  const doctorMap = new Map(data.doctors.map((d) => [d.id, d.name]));
  const accountMap = new Map(data.amAccounts.map((a) => [a.id, a.name]));

  const userName = (id: string) => userMap.get(id) ?? "System";

  // Visits -> doctor activities
  for (const v of data.visits) {
    const doctorName = doctorMap.get(v.doctorId) ?? "Unknown Doctor";
    entries.push({
      id: genActivityId(),
      entityType: "doctor",
      entityId: v.doctorId,
      activityType: "visit",
      title: `Visit logged for ${doctorName}`,
      description: v.notes || undefined,
      userId: v.repId,
      userName: userName(v.repId),
      timestamp: v.dateTime,
      metadata: { visitId: v.id, status: v.status },
      relatedEntities: v.amAccountId
        ? [
            {
              type: "account",
              id: v.amAccountId,
              name: accountMap.get(v.amAccountId) ?? "Account",
            },
          ]
        : undefined,
    });
  }

  // Weekly plans
  for (const p of data.weeklyPlans) {
    entries.push({
      id: genActivityId(),
      entityType: "user",
      entityId: p.repId,
      activityType: "plan",
      title: `Weekly plan ${p.status.toLowerCase()} for week of ${p.weekStartDate}`,
      userId: p.repId,
      userName: userName(p.repId),
      timestamp: p.createdAt,
      metadata: { planId: p.id, status: p.status },
    });
  }

  // Market requests
  for (const r of data.marketRequests) {
    if (r.doctorId) {
      entries.push({
        id: genActivityId(),
        entityType: "doctor",
        entityId: r.doctorId,
        activityType: "request",
        title: `${r.type} request: ${r.description.slice(0, 80)}`,
        description: r.description,
        userId: r.requestedById,
        userName: userName(r.requestedById),
        timestamp: r.createdAt,
        metadata: { requestId: r.id, status: r.status, type: r.type },
      });
    }
  }

  // Doctor creations
  for (const d of data.doctors) {
    entries.push({
      id: genActivityId(),
      entityType: "doctor",
      entityId: d.id,
      activityType: "creation",
      title: `Doctor ${d.name} added to the system`,
      userId: d.assignedRepId ?? "u-admin",
      userName: userName(d.assignedRepId ?? "u-admin"),
      timestamp: d.createdAt,
    });
    if (d.assignedRepId) {
      entries.push({
        id: genActivityId(),
        entityType: "doctor",
        entityId: d.id,
        activityType: "assignment",
        title: `${d.name} assigned to ${userName(d.assignedRepId)}`,
        userId: d.assignedRepId,
        userName: userName(d.assignedRepId),
        timestamp: d.createdAt,
      });
    }
  }

  // Account creations
  for (const a of data.amAccounts) {
    entries.push({
      id: genActivityId(),
      entityType: "account",
      entityId: a.id,
      activityType: "creation",
      title: `Account ${a.name} created`,
      userId: a.assignedRepId ?? "u-admin",
      userName: userName(a.assignedRepId ?? "u-admin"),
      timestamp: a.createdAt,
    });
  }

  // Sort newest first
  entries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  saveEntries(entries.slice(0, MAX_ENTRIES));

  try {
    localStorage.setItem(SEED_KEY, "1");
  } catch {
    // ignore
  }
}
