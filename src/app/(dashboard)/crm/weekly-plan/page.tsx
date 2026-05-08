"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  XCircle,
  Send,
  Target,
  MapPin,
  Sun,
  Moon,
  Building2,
  Stethoscope,
  Trash2,
  BarChart3,
  AlertTriangle,
  Timer,
  TrendingUp,
  Users,
  ArrowUpCircle,
  History,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Eye,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { useApiDataStore } from "@/lib/api/use-api-store";
import {
  type WeeklyPlan,
  type DailyPlan,
  type PlannedVisit,
  type StartingPoint,
  type PlannedVisitCategory,
  type PlannedVisitOutcome,
  type ApprovalEntry,
} from "@/lib/data-store";
import { useCurrentUser } from "@/lib/user-context";
import { useNotificationCenter } from "@/lib/notification-context";
import { useAuditLogger } from "@/lib/audit-logger";
import { useTranslation } from "@/lib/i18n/i18n-context";
import { useCrossModuleActions } from "@/lib/cross-module-actions";

const MIN_VISIT_DURATION_MIN = 10;

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun,1=Mon,...,6=Sat
  // Saturday (6) as start of Egyptian work week
  const diff = day >= 6 ? 0 : -(day + 1); // roll back to most recent Saturday
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function fmtIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Calculate duration in minutes from HH:MM times. Returns null if either is missing. */
function calcDurationMin(checkIn?: string, checkOut?: string): number | null {
  if (!checkIn || !checkOut) return null;
  const [h1, m1] = checkIn.split(":").map(Number);
  const [h2, m2] = checkOut.split(":").map(Number);
  const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
  return mins > 0 ? mins : null;
}

/** Format duration in minutes to a readable string */
function fmtDuration(mins: number | null): string {
  if (mins == null) return "—";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const DAY_LABELS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"]; // Egyptian work week (Sat–Thu working, Fri off)
const SUSPICIOUS_THRESHOLD_MIN = 10;
const EXTENDED_THRESHOLD_MIN = 120;
const MAX_VISITS_PER_DAY = 8;
const ESCALATION_HOURS = 48;
const ESCALATION_CHAIN = ["DISTRICT_MANAGER", "BUM"] as const;
const ESCALATION_CHAIN_LABELS: Record<string, string> = {
  DISTRICT_MANAGER: "DM",
  BUM: "BUM",
};

/* ─── Conflict Detection Helpers ─── */
interface PlanConflict {
  type: "duplicate_doctor" | "overlapping_time" | "excessive_visits" | "short_duration_no_reason";
  dayIndex: number;
  message: string;
  visitIndex?: number;
}

interface PlanValidation {
  suspicious: number; // visits < 10min
  extended: number;   // visits > 120min
  conflicts: PlanConflict[];
}

function detectConflicts(days: DailyPlan[]): PlanConflict[] {
  const conflicts: PlanConflict[] = [];
  days.forEach((day, dayIdx) => {
    // Same doctor visited twice in one day
    const doctorIds = day.visits.filter((v) => v.doctorId).map((v) => v.doctorId!);
    const seenDoctors = new Set<string>();
    doctorIds.forEach((id) => {
      if (seenDoctors.has(id)) {
        conflicts.push({
          type: "duplicate_doctor",
          dayIndex: dayIdx,
          message: `Same doctor visited twice on ${DAY_LABELS[dayIdx]}`,
        });
      }
      seenDoctors.add(id);
    });

    // Same AM account visited twice in one day
    const accountIds = day.visits.filter((v) => v.amAccountId).map((v) => v.amAccountId!);
    const seenAccounts = new Set<string>();
    accountIds.forEach((id) => {
      if (seenAccounts.has(id)) {
        conflicts.push({
          type: "duplicate_doctor",
          dayIndex: dayIdx,
          message: `Same account visited twice on ${DAY_LABELS[dayIdx]}`,
        });
      }
      seenAccounts.add(id);
    });

    // Overlapping time slots
    const sortedVisits = [...day.visits].sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
    for (let i = 0; i < sortedVisits.length - 1; i++) {
      if (sortedVisits[i].timeSlot === sortedVisits[i + 1].timeSlot) {
        conflicts.push({
          type: "overlapping_time",
          dayIndex: dayIdx,
          message: `Overlapping time slot ${sortedVisits[i].timeSlot} on ${DAY_LABELS[dayIdx]}`,
        });
      }
    }

    // Excessive visits (>8 per day)
    if (day.visits.length > MAX_VISITS_PER_DAY) {
      conflicts.push({
        type: "excessive_visits",
        dayIndex: dayIdx,
        message: `${day.visits.length} visits on ${DAY_LABELS[dayIdx]} (max ${MAX_VISITS_PER_DAY})`,
      });
    }

    // Enhancement 5: Short visit duration without reason
    day.visits.forEach((v, vIdx) => {
      const dur = calcDurationMin(v.checkInTime, v.checkOutTime);
      if (dur !== null && dur < MIN_VISIT_DURATION_MIN && !v.shortDurationReason?.trim()) {
        conflicts.push({
          type: "short_duration_no_reason",
          dayIndex: dayIdx,
          visitIndex: vIdx,
          message: `Visit #${vIdx + 1} on ${DAY_LABELS[dayIdx]} is ${fmtDuration(dur)} (<${MIN_VISIT_DURATION_MIN}m) without a reason`,
        });
      }
    });
  });
  return conflicts;
}

function validatePlan(days: DailyPlan[]): PlanValidation {
  const conflicts = detectConflicts(days);
  let suspicious = 0;
  let extended = 0;
  days.forEach((day) => {
    day.visits.forEach((v) => {
      const dur = calcDurationMin(v.checkInTime, v.checkOutTime);
      if (dur !== null && dur < SUSPICIOUS_THRESHOLD_MIN) suspicious++;
      if (dur !== null && dur > EXTENDED_THRESHOLD_MIN) extended++;
    });
  });
  return { suspicious, extended, conflicts };
}

/** Check if a plan has been submitted for more than 48 hours */
function isPendingEscalation(plan: WeeklyPlan): boolean {
  if (plan.status !== "SUBMITTED" || !plan.submittedAt) return false;
  const submittedTime = new Date(plan.submittedAt).getTime();
  const now = Date.now();
  return (now - submittedTime) > ESCALATION_HOURS * 60 * 60 * 1000;
}

export default function WeeklyPlanPage() {
  const store = useApiDataStore();
  const { user, allUsers, getReportsOf } = useCurrentUser();
  const { t } = useTranslation();

  const [activeWeek, setActiveWeek] = useState<Date>(startOfWeek(new Date()));
  const [editing, setEditing] = useState<WeeklyPlan | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showStartingPoints, setShowStartingPoints] = useState(false);
  const [rejectingPlan, setRejectingPlan] = useState<WeeklyPlan | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [conflictBlockDialog, setConflictBlockDialog] = useState<{ plan: WeeklyPlan; conflicts: PlanConflict[] } | null>(null);
  const [autoEscalatedIds, setAutoEscalatedIds] = useState<Set<string>>(new Set());
  const [autoEscalationAlert, setAutoEscalationAlert] = useState<number>(0);

  // Notification & audit hooks — providers are in dashboard layout
  const { addNotification } = useNotificationCenter();
  const { logAction } = useAuditLogger();
  const crossModule = useCrossModuleActions();

  const isRep = user.role === "MEDICAL_REP";
  const isManager = ["DISTRICT_MANAGER", "MARKETEER", "BUM", "ADMIN"].includes(user.role);
  const repsUnderMe = getReportsOf(user.id).map((u) => u.id);

  const myPlans = useMemo(() => {
    if (isRep) return store.weeklyPlans.filter((p) => p.repId === user.id);
    if (isManager) {
      return store.weeklyPlans.filter(
        (p) => repsUnderMe.includes(p.repId) || p.repId === user.id
      );
    }
    return store.weeklyPlans;
  }, [store.weeklyPlans, isRep, isManager, repsUnderMe, user.id]);

  const stats = {
    draft: myPlans.filter((p) => p.status === "DRAFT").length,
    submitted: myPlans.filter((p) => p.status === "SUBMITTED").length,
    approved: myPlans.filter((p) => p.status === "APPROVED").length,
    rejected: myPlans.filter((p) => p.status === "REJECTED").length,
  };

  const myStartingPoints = store.startingPoints.filter((s) => s.userId === user.id);

  // ── Enhancement 2: Auto-escalation on mount ──
  const autoEscalationRan = useRef(false);
  useEffect(() => {
    if (autoEscalationRan.current) return;
    autoEscalationRan.current = true;
    const plansToEscalate = store.weeklyPlans.filter((p) => isPendingEscalation(p));
    if (plansToEscalate.length === 0) return;
    let escalatedCount = 0;
    const escalatedSet = new Set<string>();
    plansToEscalate.forEach((plan) => {
      const currentLevel = plan.approvalLevel ?? 0;
      if (currentLevel >= ESCALATION_CHAIN.length - 1) return; // already at top
      const nextLevel = currentLevel + 1;
      const nextRole = ESCALATION_CHAIN[nextLevel];
      const entry: ApprovalEntry = {
        id: store.genId("ah"),
        action: "AUTO_ESCALATED",
        performedBy: "System",
        performedById: "SYSTEM",
        timestamp: new Date().toISOString(),
        comment: `Auto-escalated to ${ESCALATION_CHAIN_LABELS[nextRole]} (pending >48h)`,
        level: nextLevel,
      };
      store.update("weeklyPlans", plan.id, {
        approvalLevel: nextLevel,
        approvalHistory: [...(plan.approvalHistory ?? []), entry],
      });
      escalatedSet.add(plan.id);
      escalatedCount++;
      try {
        addNotification({
          type: "ESCALATION",
          title: "Plan Auto-Escalated",
          message: `Weekly plan for ${fmtDate(plan.weekStartDate)} auto-escalated to ${ESCALATION_CHAIN_LABELS[nextRole]} (pending >48h)`,
          module: "WEEKLY_PLAN",
          entityType: "WeeklyPlan",
          entityId: plan.id,
        });
      } catch { /* safe */ }
      try {
        logAction({
          action: "ESCALATE",
          module: "CRM",
          entity: "WeeklyPlan",
          entityId: plan.id,
          entityName: `Week of ${fmtDate(plan.weekStartDate)}`,
          userId: "SYSTEM",
          userName: "System",
          userRole: "SYSTEM",
          details: `Auto-escalated to ${ESCALATION_CHAIN_LABELS[nextRole]} (pending >48h)`,
        });
      } catch { /* safe */ }
    });
    if (escalatedCount > 0) {
      setAutoEscalatedIds(escalatedSet);
      setAutoEscalationAlert(escalatedCount);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function createNewPlan() {
    const newPlan: WeeklyPlan = {
      id: store.genId("wp"),
      repId: user.id,
      weekStartDate: activeWeek.toISOString(),
      days: DAY_LABELS.map((_, i) => ({
        date: addDays(activeWeek, i).toISOString(),
        startingPointAM: myStartingPoints.find((s) => s.type === "AM")?.id,
        startingPointPM: myStartingPoints.find((s) => s.type === "PM")?.id,
        visits: [],
      })),
      status: "DRAFT",
      createdAt: new Date().toISOString(),
    };
    store.add("weeklyPlans", newPlan);
    try {
      logAction({
        action: "CREATE",
        module: "CRM",
        entity: "WeeklyPlan",
        entityId: newPlan.id,
        entityName: `Week of ${fmtDate(activeWeek)}`,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        details: `Created weekly plan for ${fmtDate(activeWeek)}`,
      });
    } catch { /* safe */ }
    setEditing(newPlan);
    setShowCreateDialog(false);
  }

  function submitPlan(plan: WeeklyPlan) {
    // Enhancement 1: Block submission if unresolved conflicts exist
    const conflicts = detectConflicts(plan.days);
    if (conflicts.length > 0) {
      setConflictBlockDialog({ plan, conflicts });
      return;
    }

    const entry: ApprovalEntry = {
      id: store.genId("ah"),
      action: "SUBMITTED",
      performedBy: user.name,
      performedById: user.id,
      timestamp: new Date().toISOString(),
      level: 0,
    };
    store.update("weeklyPlans", plan.id, {
      status: "SUBMITTED",
      submittedAt: new Date().toISOString(),
      approvalHistory: [...(plan.approvalHistory ?? []), entry],
      approvalLevel: 0,
    });
    try {
      addNotification({
        type: "APPROVAL",
        title: "Weekly Plan Submitted",
        message: `Weekly plan for ${fmtDate(plan.weekStartDate)} has been submitted for approval`,
        module: "WEEKLY_PLAN",
        entityType: "WeeklyPlan",
        entityId: plan.id,
      });
    } catch { /* safe */ }
    try {
      logAction({
        action: "UPDATE",
        module: "CRM",
        entity: "WeeklyPlan",
        entityId: plan.id,
        entityName: `Week of ${fmtDate(plan.weekStartDate)}`,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        details: "Submitted for approval",
        newValues: { status: "SUBMITTED" },
      });
    } catch { /* safe */ }
  }

  function approvePlan(plan: WeeklyPlan) {
    const entry: ApprovalEntry = {
      id: store.genId("ah"),
      action: "APPROVED",
      performedBy: user.name,
      performedById: user.id,
      timestamp: new Date().toISOString(),
      level: plan.approvalLevel ?? 0,
    };
    store.update("weeklyPlans", plan.id, {
      status: "APPROVED",
      approvedById: user.id,
      approvedAt: new Date().toISOString(),
      approvalHistory: [...(plan.approvalHistory ?? []), entry],
    });
    try {
      addNotification({
        type: "SUCCESS",
        title: "Weekly Plan Approved",
        message: `Weekly plan for ${fmtDate(plan.weekStartDate)} has been approved`,
        module: "WEEKLY_PLAN",
        entityType: "WeeklyPlan",
        entityId: plan.id,
      });
    } catch { /* safe */ }
    try {
      logAction({
        action: "APPROVE",
        module: "CRM",
        entity: "WeeklyPlan",
        entityId: plan.id,
        entityName: `Week of ${fmtDate(plan.weekStartDate)}`,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        details: "Plan approved",
        newValues: { status: "APPROVED" },
      });
    } catch { /* safe */ }

    // Deduct samples from inventory for all visits with samples
    for (const day of plan.days) {
      for (const visit of day.visits) {
        if ((visit as any).samplesGiven && (visit as any).samplesGiven.length > 0) {
          crossModule.onVisitApprovedWithSamples({
            id: (visit as any).id ?? `${plan.id}-${day.date}`,
            repId: plan.repId,
            samplesGiven: (visit as any).samplesGiven,
          });
        }
      }
    }
  }

  function rejectPlan() {
    if (!rejectingPlan) return;
    const entry: ApprovalEntry = {
      id: store.genId("ah"),
      action: "REJECTED",
      performedBy: user.name,
      performedById: user.id,
      timestamp: new Date().toISOString(),
      comment: rejectReason,
      level: rejectingPlan.approvalLevel ?? 0,
    };
    store.update("weeklyPlans", rejectingPlan.id, {
      status: "REJECTED",
      rejectionReason: rejectReason,
      approvedById: user.id,
      approvedAt: new Date().toISOString(),
      approvalHistory: [...(rejectingPlan.approvalHistory ?? []), entry],
    });
    try {
      addNotification({
        type: "WARNING",
        title: "Weekly Plan Rejected",
        message: `Weekly plan for ${fmtDate(rejectingPlan.weekStartDate)} has been rejected: ${rejectReason}`,
        module: "WEEKLY_PLAN",
        entityType: "WeeklyPlan",
        entityId: rejectingPlan.id,
      });
    } catch { /* safe */ }
    try {
      logAction({
        action: "REJECT",
        module: "CRM",
        entity: "WeeklyPlan",
        entityId: rejectingPlan.id,
        entityName: `Week of ${fmtDate(rejectingPlan.weekStartDate)}`,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        details: `Rejected: ${rejectReason}`,
        newValues: { status: "REJECTED", rejectionReason: rejectReason },
      });
    } catch { /* safe */ }
    setRejectingPlan(null);
    setRejectReason("");
  }

  function escalatePlan(plan: WeeklyPlan) {
    const currentLevel = plan.approvalLevel ?? 0;
    const nextLevel = Math.min(currentLevel + 1, ESCALATION_CHAIN.length - 1);
    const nextRole = ESCALATION_CHAIN[nextLevel];
    const entry: ApprovalEntry = {
      id: store.genId("ah"),
      action: "ESCALATED",
      performedBy: user.name,
      performedById: user.id,
      timestamp: new Date().toISOString(),
      comment: `Escalated to ${ESCALATION_CHAIN_LABELS[nextRole]}`,
      level: nextLevel,
    };
    store.update("weeklyPlans", plan.id, {
      approvalLevel: nextLevel,
      approvalHistory: [...(plan.approvalHistory ?? []), entry],
    });
    try {
      addNotification({
        type: "ESCALATION",
        title: "Weekly Plan Escalated",
        message: `Weekly plan for ${fmtDate(plan.weekStartDate)} escalated to ${ESCALATION_CHAIN_LABELS[nextRole]}`,
        module: "WEEKLY_PLAN",
        entityType: "WeeklyPlan",
        entityId: plan.id,
      });
    } catch { /* safe */ }
    try {
      logAction({
        action: "ESCALATE",
        module: "CRM",
        entity: "WeeklyPlan",
        entityId: plan.id,
        entityName: `Week of ${fmtDate(plan.weekStartDate)}`,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        details: `Escalated to ${ESCALATION_CHAIN_LABELS[nextRole]}`,
      });
    } catch { /* safe */ }
  }

  function deletePlan(plan: WeeklyPlan) {
    if (confirm(`Delete this plan?`)) {
      store.remove("weeklyPlans", plan.id);
    }
  }

  function updatePlanDays(planId: string, days: DailyPlan[]) {
    store.update("weeklyPlans", planId, { days });
  }

  return (
    <div className="space-y-6">
      {/* Enhancement 2: Auto-escalation alert */}
      {autoEscalationAlert > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-orange-300 bg-orange-50">
          <Bell className="h-5 w-5 text-orange-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-800">
              {autoEscalationAlert} plan{autoEscalationAlert !== 1 ? "s" : ""} auto-escalated due to inactivity
            </p>
            <p className="text-xs text-orange-700">
              Plans pending approval for more than 48 hours have been automatically escalated to the next level.
            </p>
          </div>
          <Button size="sm" variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100" onClick={() => setAutoEscalationAlert(0)}>
            Dismiss
          </Button>
        </div>
      )}

      <PageHeader
        title={t("page.weeklyPlan.title")}
        description={isManager ? t("page.weeklyPlan.description.manager") : t("page.weeklyPlan.description.rep")}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowStartingPoints(true)}>
              <MapPin className="h-4 w-4 mr-2" />
              {t("crm.startingPoints")}
            </Button>
            {(isRep || isManager) && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("crm.newWeeklyPlan")}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={Calendar}
          title={t("stats.draft")}
          value={stats.draft}
          subtitle={isManager ? t("weeklyPlan.yoursPlusTeam") : t("weeklyPlan.notYetSubmitted")}
          iconColor="bg-slate-100 text-slate-600"
        />
        <StatsCard
          icon={Clock}
          title={t("stats.awaitingApproval")}
          value={stats.submitted}
          subtitle={isManager ? `${myPlans.filter((p) => p.status === "SUBMITTED" && p.repId !== user.id).length} ${t("weeklyPlan.needYourReview")}` : t("weeklyPlan.submittedPending")}
          iconColor="bg-amber-100 text-amber-600"
        />
        <StatsCard
          icon={CheckCircle2}
          title={t("stats.approved")}
          value={stats.approved}
          subtitle={isManager ? t("weeklyPlan.yoursPlusTeam") : t("weeklyPlan.readyToExecute")}
          iconColor="bg-emerald-100 text-emerald-600"
        />
        <StatsCard
          icon={XCircle}
          title={t("stats.rejected")}
          value={stats.rejected}
          subtitle={t("weeklyPlan.needsRevision")}
          iconColor="bg-red-100 text-red-600"
        />
      </div>

      <Tabs defaultValue={isManager ? "team" : "my"}>
        <TabsList>
          <TabsTrigger value="my">{t("tab.myPlans")}</TabsTrigger>
          {isManager && <TabsTrigger value="team">{t("tab.teamPlans")}</TabsTrigger>}
          {isManager && <TabsTrigger value="approvals">{t("tab.pendingApprovals")}</TabsTrigger>}
          <TabsTrigger value="all">{t("tab.allPlans")}</TabsTrigger>
          <TabsTrigger value="analytics">{t("tab.analytics")}</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="space-y-3">
          {myPlans.filter((p) => p.repId === user.id).length === 0 ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t("empty.noPlans")}</p>
              <p className="text-xs mt-1">{t("empty.noPlansHint")}</p>
            </CardContent></Card>
          ) : (
            myPlans
              .filter((p) => p.repId === user.id)
              .sort((a, b) => (b.weekStartDate > a.weekStartDate ? 1 : -1))
              .map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  store={store}
                  allUsers={allUsers}
                  isRep={true}
                  isManager={false}
                  isAutoEscalated={autoEscalatedIds.has(plan.id)}
                  onEdit={() => setEditing(plan)}
                  onSubmit={() => submitPlan(plan)}
                  onApprove={() => approvePlan(plan)}
                  onReject={() => setRejectingPlan(plan)}
                  onDelete={() => deletePlan(plan)}
                  onEscalate={() => escalatePlan(plan)}
                />
              ))
          )}
        </TabsContent>

        {isManager && (
          <TabsContent value="team" className="space-y-3">
            {(() => {
              const teamPlans = myPlans.filter((p) => p.repId !== user.id);
              if (teamPlans.length === 0) {
                return (
                  <Card><CardContent className="p-12 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{t("empty.noTeamPlans")}</p>
                    <p className="text-xs mt-1">Plans from your direct reports will appear here.</p>
                  </CardContent></Card>
                );
              }
              const grouped = new Map<string, WeeklyPlan[]>();
              teamPlans.forEach((p) => {
                const list = grouped.get(p.repId) || [];
                list.push(p);
                grouped.set(p.repId, list);
              });
              return Array.from(grouped.entries()).map(([repId, plans]) => {
                const rep = allUsers.find((u) => u.id === repId);
                const latest = plans.sort((a, b) => (b.weekStartDate > a.weekStartDate ? 1 : -1));
                return (
                  <div key={repId} className="space-y-2">
                    <div className="flex items-center gap-2 pt-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">{rep?.name ?? repId}</span>
                      <Badge variant="outline" className="text-[10px]">{rep?.role?.replace("_", " ") ?? ""}</Badge>
                      <span className="text-xs text-muted-foreground ml-auto">{plans.length} plan{plans.length !== 1 ? "s" : ""}</span>
                    </div>
                    {latest.map((plan) => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        store={store}
                        allUsers={allUsers}
                        isRep={false}
                        isManager
                        isAutoEscalated={autoEscalatedIds.has(plan.id)}
                        onEdit={() => setEditing(plan)}
                        onSubmit={() => submitPlan(plan)}
                        onApprove={() => approvePlan(plan)}
                        onReject={() => setRejectingPlan(plan)}
                        onDelete={() => deletePlan(plan)}
                        onEscalate={() => escalatePlan(plan)}
                      />
                    ))}
                  </div>
                );
              });
            })()}
          </TabsContent>
        )}

        {isManager && (
          <TabsContent value="approvals" className="space-y-3">
            {myPlans.filter((p) => p.status === "SUBMITTED" && p.repId !== user.id).length === 0 ? (
              <Card><CardContent className="p-12 text-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t("empty.noPendingApprovals")}</p>
              </CardContent></Card>
            ) : (
              myPlans
                .filter((p) => p.status === "SUBMITTED" && p.repId !== user.id)
                .map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    store={store}
                    allUsers={allUsers}
                    isRep={false}
                    isManager
                    isAutoEscalated={autoEscalatedIds.has(plan.id)}
                    onEdit={() => setEditing(plan)}
                    onSubmit={() => submitPlan(plan)}
                    onApprove={() => approvePlan(plan)}
                    onReject={() => setRejectingPlan(plan)}
                    onDelete={() => deletePlan(plan)}
                    onEscalate={() => escalatePlan(plan)}
                  />
                ))
            )}
          </TabsContent>
        )}

        <TabsContent value="all" className="space-y-3">
          {myPlans
            .sort((a, b) => (b.weekStartDate > a.weekStartDate ? 1 : -1))
            .map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                store={store}
                allUsers={allUsers}
                isRep={plan.repId === user.id}
                isManager={isManager && plan.repId !== user.id}
                isAutoEscalated={autoEscalatedIds.has(plan.id)}
                onEdit={() => setEditing(plan)}
                onSubmit={() => submitPlan(plan)}
                onApprove={() => approvePlan(plan)}
                onReject={() => setRejectingPlan(plan)}
                onDelete={() => deletePlan(plan)}
                onEscalate={() => escalatePlan(plan)}
              />
            ))}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <VisitAnalytics plans={myPlans} allUsers={allUsers} />
        </TabsContent>
      </Tabs>

      {/* Create new plan dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Weekly Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <label className="text-sm font-medium">Week Starting (Saturday)</label>
              <Input
                type="date"
                value={fmtIsoDate(activeWeek)}
                onChange={(e) => setActiveWeek(startOfWeek(new Date(e.target.value)))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Plan will cover {fmtDate(activeWeek)} to {fmtDate(addDays(activeWeek, 6))}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={createNewPlan}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit plan dialog */}
      <PlanEditor
        plan={editing}
        store={store}
        onClose={() => setEditing(null)}
        onSave={(days) => {
          if (editing) updatePlanDays(editing.id, days);
        }}
      />

      {/* Starting points manager */}
      <Dialog open={showStartingPoints} onOpenChange={setShowStartingPoints}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>My Starting Points</DialogTitle>
          </DialogHeader>
          <StartingPointsManager
            points={myStartingPoints}
            allowOffice={!isRep}
            onAdd={(sp) => store.add("startingPoints", sp)}
            onRemove={(id) => store.remove("startingPoints", id)}
            userId={user.id}
            genId={store.genId}
          />
        </DialogContent>
      </Dialog>

      {/* Reject reason dialog */}
      <Dialog open={!!rejectingPlan} onOpenChange={(o) => { if (!o) setRejectingPlan(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Plan</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Rejection reason</label>
            <textarea
              className="w-full mt-1 rounded-md border p-2 text-sm"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Tell the rep what to revise..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingPlan(null)}>Cancel</Button>
            <Button variant="destructive" onClick={rejectPlan} disabled={!rejectReason.trim()}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhancement 1: Conflict blocking dialog */}
      <Dialog open={!!conflictBlockDialog} onOpenChange={(o) => { if (!o) setConflictBlockDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Cannot Submit: {conflictBlockDialog?.conflicts.length} Conflict{conflictBlockDialog?.conflicts.length !== 1 ? "s" : ""} Detected
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Resolve all conflicts before submitting this plan for approval.
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {conflictBlockDialog?.conflicts.map((c, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded border border-red-200 bg-red-50/50">
                  <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                    c.type === "duplicate_doctor" ? "bg-yellow-500" :
                    c.type === "overlapping_time" ? "bg-red-500" :
                    "bg-orange-500"
                  }`} />
                  <span className="text-xs text-red-800">{c.message}</span>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const plan = conflictBlockDialog?.plan;
                setConflictBlockDialog(null);
                if (plan) setEditing(plan);
              }}
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              View Conflicts
            </Button>
            <Button onClick={() => setConflictBlockDialog(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Plan Card ─── */
function PlanCard({
  plan,
  store,
  allUsers,
  isRep,
  isManager,
  isAutoEscalated,
  onEdit,
  onSubmit,
  onApprove,
  onReject,
  onDelete,
  onEscalate,
}: {
  plan: WeeklyPlan;
  store: ReturnType<typeof useApiDataStore>;
  allUsers: ReturnType<typeof useCurrentUser>["allUsers"];
  isRep: boolean;
  isManager: boolean;
  isAutoEscalated?: boolean;
  onEdit: () => void;
  onSubmit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  onEscalate: () => void;
}) {
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  const { t } = useTranslation();
  const rep = allUsers.find((u) => u.id === plan.repId);
  const approver = plan.approvedById ? allUsers.find((u) => u.id === plan.approvedById) : null;
  const totalVisits = plan.days.reduce((sum, d) => sum + d.visits.length, 0);
  const amVisits = plan.days.reduce((sum, d) => sum + d.visits.filter((v) => v.session === "AM").length, 0);
  const pmVisits = plan.days.reduce((sum, d) => sum + d.visits.filter((v) => v.session === "PM").length, 0);

  // Duration stats for this plan
  const durations = plan.days.flatMap((d) =>
    d.visits.map((v) => calcDurationMin(v.checkInTime, v.checkOutTime))
  ).filter((d): d is number => d !== null);
  const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;
  const suspiciousCount = durations.filter((d) => d < SUSPICIOUS_THRESHOLD_MIN).length;
  const extendedCount = durations.filter((d) => d > EXTENDED_THRESHOLD_MIN).length;

  // Conflict detection
  const validation = validatePlan(plan.days);
  const conflictCount = validation.conflicts.length;

  // Escalation check
  const needsEscalation = isPendingEscalation(plan);
  const currentEscalationLevel = plan.approvalLevel ?? 0;
  const canEscalate = plan.status === "SUBMITTED" && currentEscalationLevel < ESCALATION_CHAIN.length - 1;

  const statusBadge: Record<typeof plan.status, { label: string; color: string }> = {
    DRAFT: { label: t("common.draft"), color: "bg-slate-100 text-slate-700" },
    SUBMITTED: { label: t("weeklyPlan.awaitingApproval"), color: "bg-amber-100 text-amber-700" },
    APPROVED: { label: t("common.approved"), color: "bg-emerald-100 text-emerald-700" },
    REJECTED: { label: t("common.rejected"), color: "bg-red-100 text-red-700" },
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">
              Week of {fmtDate(plan.weekStartDate)}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {rep?.name ?? "—"} · {totalVisits} planned visits ({amVisits} AM, {pmVisits} PM)
              {avgDuration != null && (
                <span className="ml-2">· Avg duration: {fmtDuration(avgDuration)}</span>
              )}
            </p>
            {/* Validation summary line */}
            {(conflictCount > 0 || validation.suspicious > 0 || extendedCount > 0) && (
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                <ShieldAlert className="h-3 w-3 text-amber-500" />
                {conflictCount > 0 && <span className="text-amber-700">{conflictCount} conflict{conflictCount !== 1 ? "s" : ""}</span>}
                {validation.suspicious > 0 && <span className="text-orange-700">{validation.suspicious} suspicious</span>}
                {extendedCount > 0 && <span className="text-violet-700">{extendedCount} extended</span>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {isAutoEscalated && (
              <Badge className="bg-orange-200 text-orange-900 text-[10px] flex items-center gap-1 font-semibold">
                <ArrowUpCircle className="h-3 w-3" />
                Auto-escalated
              </Badge>
            )}
            {needsEscalation && (
              <Badge className="bg-orange-100 text-orange-700 text-[10px] flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Pending &gt;48h
              </Badge>
            )}
            {conflictCount > 0 && (
              <Badge className="bg-yellow-100 text-yellow-800 text-[10px] flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {conflictCount} conflict{conflictCount !== 1 ? "s" : ""}
              </Badge>
            )}
            {suspiciousCount > 0 && (
              <Badge className="bg-orange-100 text-orange-700 text-[10px] flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {suspiciousCount} short
              </Badge>
            )}
            {extendedCount > 0 && (
              <Badge className="bg-violet-100 text-violet-700 text-[10px] flex items-center gap-1">
                <Timer className="h-3 w-3" />
                {extendedCount} extended
              </Badge>
            )}
            <Badge className={statusBadge[plan.status].color}>{statusBadge[plan.status].label}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Escalation chain indicator */}
        {plan.status === "SUBMITTED" && (
          <div className="flex items-center gap-1 mb-3 text-[10px] text-muted-foreground">
            <span className="font-medium">Escalation:</span>
            {ESCALATION_CHAIN.map((role, idx) => (
              <span key={role} className="flex items-center gap-0.5">
                {idx > 0 && <span className="mx-0.5">→</span>}
                <span className={idx === currentEscalationLevel ? "font-bold text-blue-700 bg-blue-50 px-1 rounded" : ""}>
                  {ESCALATION_CHAIN_LABELS[role]}
                </span>
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-7 gap-2 mb-3">
          {plan.days.map((d, i) => {
            const dayConflicts = validation.conflicts.filter((c) => c.dayIndex === i);
            return (
              <div key={i} className={`border rounded p-2 text-center ${dayConflicts.length > 0 ? "border-yellow-400 bg-yellow-50/30" : ""}`}>
                <p className="text-[10px] text-muted-foreground font-medium uppercase">{DAY_LABELS[i]}</p>
                <p className="text-xs font-medium mt-0.5">{new Date(d.date).getDate()}</p>
                <div className="mt-2 space-y-1">
                  {d.visits.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground">—</p>
                  ) : (
                    <>
                      <p className="text-[10px] flex items-center justify-center gap-1">
                        <Sun className="h-2.5 w-2.5 text-amber-500" />
                        {d.visits.filter((v) => v.session === "AM").length}
                      </p>
                      <p className="text-[10px] flex items-center justify-center gap-1">
                        <Moon className="h-2.5 w-2.5 text-indigo-500" />
                        {d.visits.filter((v) => v.session === "PM").length}
                      </p>
                    </>
                  )}
                  {/* Enhancement 5: Running total per day */}
                  {d.visits.length > 0 && (
                    <p className={`text-[9px] font-medium ${d.visits.length >= MAX_VISITS_PER_DAY ? "text-red-600" : "text-muted-foreground"}`}>
                      {d.visits.length}/{MAX_VISITS_PER_DAY}
                    </p>
                  )}
                  {dayConflicts.length > 0 && (
                    <p className="text-[9px] text-yellow-700 font-medium">{dayConflicts.length} issue{dayConflicts.length !== 1 ? "s" : ""}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Conflict details */}
        {validation.conflicts.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3 space-y-1">
            <p className="text-xs font-semibold text-yellow-800 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Conflicts Detected
            </p>
            {validation.conflicts.map((c, idx) => (
              <p key={idx} className="text-[10px] text-yellow-700 flex items-center gap-1">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                  c.type === "duplicate_doctor" ? "bg-yellow-500" :
                  c.type === "overlapping_time" ? "bg-red-500" :
                  "bg-orange-500"
                }`} />
                {c.message}
              </p>
            ))}
          </div>
        )}

        {plan.status === "REJECTED" && plan.rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded p-2 mb-3">
            <p className="text-xs font-semibold text-red-700">Rejection reason:</p>
            <p className="text-xs text-red-800">{plan.rejectionReason}</p>
          </div>
        )}

        {plan.approvedAt && approver && (
          <p className="text-xs text-muted-foreground mb-2">
            {plan.status === "APPROVED" ? "Approved" : "Reviewed"} by {approver.name} on{" "}
            {new Date(plan.approvedAt).toLocaleString()}
          </p>
        )}

        <div className="flex gap-2 flex-wrap">
          {(plan.status === "DRAFT" || plan.status === "REJECTED") && isRep && (
            <>
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Calendar className="h-3.5 w-3.5 mr-1" />
                Edit Plan
              </Button>
              <Button size="sm" onClick={onSubmit} disabled={totalVisits === 0}>
                <Send className="h-3.5 w-3.5 mr-1" />
                Submit for Approval
              </Button>
            </>
          )}
          {(plan.status === "SUBMITTED" || plan.status === "APPROVED") && (
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Calendar className="h-3.5 w-3.5 mr-1" />
              View Plan
            </Button>
          )}
          {plan.status === "SUBMITTED" && isManager && (
            <>
              <Button size="sm" onClick={onApprove}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={onReject}>
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Reject
              </Button>
            </>
          )}
          {canEscalate && isManager && (
            <Button size="sm" variant="outline" onClick={onEscalate} className="text-orange-700 border-orange-300 hover:bg-orange-50">
              <ArrowUpCircle className="h-3.5 w-3.5 mr-1" />
              Escalate
            </Button>
          )}
          {(plan.status === "DRAFT" || plan.status === "REJECTED") && isRep && (
            <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-600">
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete
            </Button>
          )}
          {/* Audit trail toggle */}
          {(plan.approvalHistory ?? []).length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAuditTrail(!showAuditTrail)}
              className="text-slate-600 ml-auto"
            >
              <History className="h-3.5 w-3.5 mr-1" />
              Audit Trail
              {showAuditTrail ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
            </Button>
          )}
        </div>

        {/* Approval Audit Trail */}
        {showAuditTrail && (plan.approvalHistory ?? []).length > 0 && (
          <ApprovalAuditTrail history={plan.approvalHistory!} />
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Approval Audit Trail ─── */
function ApprovalAuditTrail({ history }: { history: ApprovalEntry[] }) {
  const actionConfig: Record<string, { color: string; borderColor: string; icon: string }> = {
    SUBMITTED: { color: "bg-blue-500", borderColor: "border-blue-200", icon: "blue" },
    APPROVED: { color: "bg-emerald-500", borderColor: "border-emerald-200", icon: "green" },
    REJECTED: { color: "bg-red-500", borderColor: "border-red-200", icon: "red" },
    ESCALATED: { color: "bg-orange-500", borderColor: "border-orange-200", icon: "orange" },
    AUTO_ESCALATED: { color: "bg-orange-500", borderColor: "border-orange-200", icon: "orange" },
  };

  return (
    <div className="mt-3 pt-3 border-t">
      <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
        <History className="h-3.5 w-3.5" /> Approval History
      </p>
      <div className="relative ml-2">
        {/* Vertical timeline line */}
        <div className="absolute left-[5px] top-1 bottom-1 w-px bg-slate-200" />
        <div className="space-y-2">
          {history.map((entry) => {
            const cfg = actionConfig[entry.action] ?? actionConfig.SUBMITTED;
            return (
              <div key={entry.id} className="flex items-start gap-3 relative">
                {/* Timeline dot */}
                <div className={`w-[11px] h-[11px] rounded-full ${cfg.color} border-2 border-white ring-1 ring-slate-200 shrink-0 mt-0.5 z-10`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium">{entry.action.replace("_", " ")}</span>
                    <span className="text-[10px] text-muted-foreground">
                      by {entry.performedBy}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                    {entry.level > 0 && (
                      <Badge variant="outline" className="text-[9px] h-4">
                        Level {entry.level}
                      </Badge>
                    )}
                  </div>
                  {entry.comment && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 italic">&quot;{entry.comment}&quot;</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Plan Editor Dialog ─── */
function PlanEditor({
  plan,
  store,
  onClose,
  onSave,
}: {
  plan: WeeklyPlan | null;
  store: ReturnType<typeof useApiDataStore>;
  onClose: () => void;
  onSave: (days: DailyPlan[]) => void;
}) {
  const [days, setDays] = useState<DailyPlan[]>([]);

  useMemo(() => {
    if (plan) setDays(JSON.parse(JSON.stringify(plan.days)));
  }, [plan]);

  if (!plan) return null;

  const myStartingPoints = store.startingPoints.filter((s) => s.userId === plan.repId);
  const isReadonly = plan.status === "APPROVED" || plan.status === "SUBMITTED";

  function addVisit(dayIdx: number, session: "AM" | "PM") {
    // Enhancement 5: Enforce max 8 visits per day
    if (days[dayIdx].visits.length >= MAX_VISITS_PER_DAY) {
      return; // button is disabled, but guard anyway
    }
    const next = [...days];
    next[dayIdx] = {
      ...next[dayIdx],
      visits: [
        ...next[dayIdx].visits,
        { session, timeSlot: session === "AM" ? "09:00" : "14:00", visitType: "SINGLE", category: "planned" as PlannedVisitCategory, outcome: "pending" as PlannedVisitOutcome },
      ],
    };
    setDays(next);
  }

  function removeVisit(dayIdx: number, visitIdx: number) {
    const next = [...days];
    next[dayIdx] = {
      ...next[dayIdx],
      visits: next[dayIdx].visits.filter((_, i) => i !== visitIdx),
    };
    setDays(next);
  }

  function updateVisit(dayIdx: number, visitIdx: number, patch: Partial<PlannedVisit>) {
    const next = [...days];
    next[dayIdx] = {
      ...next[dayIdx],
      visits: next[dayIdx].visits.map((v, i) => (i === visitIdx ? { ...v, ...patch } : v)),
    };
    setDays(next);
  }

  function updateStartingPoint(dayIdx: number, session: "AM" | "PM", spId: string) {
    const next = [...days];
    next[dayIdx] = {
      ...next[dayIdx],
      [session === "AM" ? "startingPointAM" : "startingPointPM"]: spId || undefined,
    };
    setDays(next);
  }

  function handleSave() {
    onSave(days);
    onClose();
  }

  const amOptions = store.amAccounts.map((a) => ({
    label: `${a.name} (${a.type})`,
    value: a.id,
  }));
  const drOptions = store.doctors.map((d) => ({
    label: `${d.name} — ${d.hospital}${d.isKOL ? " ★KOL" : ""}`,
    value: d.id,
  }));

  return (
    <Dialog open={!!plan} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isReadonly ? "View" : "Edit"} Weekly Plan — Week of {fmtDate(plan.weekStartDate)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {days.map((day, dayIdx) => {
            const dayConflictsEditor = detectConflicts([day]).map((c) => ({ ...c, dayIndex: dayIdx }));
            return (
            <Card key={dayIdx} className={dayConflictsEditor.length > 0 ? "border-yellow-300" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm">
                      {DAY_LABELS[dayIdx]} · {fmtDate(day.date)}
                    </CardTitle>
                    {dayConflictsEditor.length > 0 && (
                      <Badge className="bg-yellow-100 text-yellow-800 text-[10px]">
                        <AlertTriangle className="h-3 w-3 mr-0.5" />
                        {dayConflictsEditor.length} issue{dayConflictsEditor.length !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    {/* Enhancement 5: Running total per day */}
                    <Badge className={`text-[10px] ${day.visits.length >= MAX_VISITS_PER_DAY ? "bg-red-100 text-red-800" : day.visits.length >= MAX_VISITS_PER_DAY - 2 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
                      {day.visits.length}/{MAX_VISITS_PER_DAY} visits planned
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isReadonly && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addVisit(dayIdx, "AM")} disabled={day.visits.length >= MAX_VISITS_PER_DAY}>
                          <Sun className="h-3 w-3 mr-1 text-amber-500" /> Add AM Visit
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addVisit(dayIdx, "PM")} disabled={day.visits.length >= MAX_VISITS_PER_DAY}>
                          <Moon className="h-3 w-3 mr-1 text-indigo-500" /> Add PM Visit
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {/* Inline conflict messages for this day */}
                {dayConflictsEditor.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {dayConflictsEditor.map((c, idx) => (
                      <p key={idx} className="text-[10px] text-yellow-700 flex items-center gap-1">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                          c.type === "duplicate_doctor" ? "bg-yellow-500" :
                          c.type === "overlapping_time" ? "bg-red-500" :
                          "bg-orange-500"
                        }`} />
                        {c.message}
                      </p>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Starting points */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-medium flex items-center gap-1">
                      <Sun className="h-3 w-3 text-amber-500" /> AM Start
                    </label>
                    <select
                      className="w-full mt-1 rounded border p-1.5 text-xs"
                      value={day.startingPointAM ?? ""}
                      onChange={(e) => updateStartingPoint(dayIdx, "AM", e.target.value)}
                      disabled={isReadonly}
                    >
                      <option value="">— Select —</option>
                      {myStartingPoints
                        .filter((sp) => sp.type === "AM" || sp.type === "OFFICE")
                        .map((sp) => (
                          <option key={sp.id} value={sp.id}>
                            {sp.label} ({sp.type})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-medium flex items-center gap-1">
                      <Moon className="h-3 w-3 text-indigo-500" /> PM Start
                    </label>
                    <select
                      className="w-full mt-1 rounded border p-1.5 text-xs"
                      value={day.startingPointPM ?? ""}
                      onChange={(e) => updateStartingPoint(dayIdx, "PM", e.target.value)}
                      disabled={isReadonly}
                    >
                      <option value="">— Select —</option>
                      {myStartingPoints
                        .filter((sp) => sp.type === "PM" || sp.type === "OFFICE")
                        .map((sp) => (
                          <option key={sp.id} value={sp.id}>
                            {sp.label} ({sp.type})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Visits */}
                {day.visits.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">No visits planned for this day</p>
                ) : (
                  <div className="space-y-2">
                    {day.visits.map((v, vIdx) => {
                      const dur = calcDurationMin(v.checkInTime, v.checkOutTime);
                      const isSuspicious = dur !== null && dur < SUSPICIOUS_THRESHOLD_MIN;
                      const isExtended = dur !== null && dur > EXTENDED_THRESHOLD_MIN;
                      return (
                        <div key={vIdx} className={`p-2 rounded border ${isSuspicious ? "border-orange-300 bg-orange-50/40" : isExtended ? "border-violet-300 bg-violet-50/40" : v.session === "AM" ? "bg-amber-50/30" : "bg-indigo-50/30"}`}>
                          <div className="grid grid-cols-12 gap-2 items-center text-xs">
                            <div className="col-span-1">
                              {v.session === "AM" ? (
                                <Badge className="bg-amber-100 text-amber-800 text-[10px]">AM</Badge>
                              ) : (
                                <Badge className="bg-indigo-100 text-indigo-800 text-[10px]">PM</Badge>
                              )}
                            </div>
                            <div className="col-span-1">
                              <Input
                                type="time"
                                value={v.timeSlot}
                                onChange={(e) => updateVisit(dayIdx, vIdx, { timeSlot: e.target.value })}
                                disabled={isReadonly}
                                className="h-7 text-xs"
                              />
                            </div>
                            <div className="col-span-3">
                              {v.session === "AM" ? (
                                <select
                                  className="w-full rounded border p-1 text-xs"
                                  value={v.amAccountId ?? ""}
                                  onChange={(e) => updateVisit(dayIdx, vIdx, { amAccountId: e.target.value, doctorId: undefined })}
                                  disabled={isReadonly}
                                >
                                  <option value="">— Select Account —</option>
                                  {amOptions.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                              ) : (
                                <select
                                  className="w-full rounded border p-1 text-xs"
                                  value={v.doctorId ?? ""}
                                  onChange={(e) => updateVisit(dayIdx, vIdx, { doctorId: e.target.value, amAccountId: undefined })}
                                  disabled={isReadonly}
                                >
                                  <option value="">— Select Doctor —</option>
                                  {drOptions.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                            <div className="col-span-1">
                              <select
                                className="w-full rounded border p-1 text-xs"
                                value={v.visitType}
                                onChange={(e) => updateVisit(dayIdx, vIdx, { visitType: e.target.value as "SINGLE" | "DOUBLE" })}
                                disabled={isReadonly}
                              >
                                <option value="SINGLE">Single</option>
                                <option value="DOUBLE">Double</option>
                              </select>
                            </div>
                            {/* Check-in time */}
                            <div className="col-span-1">
                              <Input
                                type="time"
                                value={v.checkInTime ?? ""}
                                onChange={(e) => updateVisit(dayIdx, vIdx, { checkInTime: e.target.value || undefined })}
                                disabled={isReadonly}
                                className="h-7 text-xs"
                                placeholder="In"
                                title="Check-in time"
                              />
                            </div>
                            {/* Check-out time */}
                            <div className="col-span-1">
                              <Input
                                type="time"
                                value={v.checkOutTime ?? ""}
                                onChange={(e) => updateVisit(dayIdx, vIdx, { checkOutTime: e.target.value || undefined })}
                                disabled={isReadonly}
                                className="h-7 text-xs"
                                placeholder="Out"
                                title="Check-out time"
                              />
                            </div>
                            {/* Duration */}
                            <div className="col-span-1 text-center">
                              {dur !== null ? (
                                <span className={`text-[10px] font-medium ${isSuspicious ? "text-orange-600" : isExtended ? "text-violet-600" : "text-muted-foreground"}`}>
                                  {isSuspicious && <AlertTriangle className="h-2.5 w-2.5 inline mr-0.5" />}
                                  {isExtended && <Clock className="h-2.5 w-2.5 inline mr-0.5" />}
                                  {fmtDuration(dur)}
                                  {isSuspicious && <span className="block text-[8px]">Suspicious</span>}
                                  {isExtended && <span className="block text-[8px]">Extended</span>}
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">—</span>
                              )}
                            </div>
                            {/* Category */}
                            <div className="col-span-1">
                              <select
                                className="w-full rounded border p-1 text-[10px]"
                                value={v.category ?? "planned"}
                                onChange={(e) => updateVisit(dayIdx, vIdx, { category: e.target.value as PlannedVisitCategory })}
                                disabled={isReadonly}
                              >
                                <option value="planned">Planned</option>
                                <option value="unplanned">Unplanned</option>
                                <option value="follow-up">Follow-up</option>
                              </select>
                            </div>
                            {/* Outcome */}
                            <div className="col-span-1">
                              <select
                                className="w-full rounded border p-1 text-[10px]"
                                value={v.outcome ?? "pending"}
                                onChange={(e) => updateVisit(dayIdx, vIdx, { outcome: e.target.value as PlannedVisitOutcome })}
                                disabled={isReadonly}
                              >
                                <option value="pending">Pending</option>
                                <option value="successful">Successful</option>
                                <option value="follow-up needed">Follow-up</option>
                                <option value="no show">No Show</option>
                              </select>
                            </div>
                            <div className="col-span-1 text-right">
                              {!isReadonly && (
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => removeVisit(dayIdx, vIdx)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          {/* Enhancement 5: Short visit duration reason */}
                          {dur !== null && dur < MIN_VISIT_DURATION_MIN && (
                            <div className="mt-1.5 flex items-start gap-2 p-1.5 rounded border border-orange-300 bg-orange-50">
                              <AlertTriangle className="h-3.5 w-3.5 text-orange-600 shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-semibold text-orange-800">
                                  Visit is under {MIN_VISIT_DURATION_MIN} minutes ({fmtDuration(dur)}). A reason is required.
                                </p>
                                {!isReadonly ? (
                                  <input
                                    type="text"
                                    className="w-full mt-1 rounded border border-orange-300 p-1 text-[10px] bg-white"
                                    placeholder="Enter reason for short visit..."
                                    value={v.shortDurationReason ?? ""}
                                    onChange={(e) => updateVisit(dayIdx, vIdx, { shortDurationReason: e.target.value })}
                                  />
                                ) : (
                                  v.shortDurationReason && (
                                    <p className="text-[10px] text-orange-700 mt-0.5 italic">
                                      Reason: {v.shortDurationReason}
                                    </p>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                          {/* Labels row under the grid for check-in/out when in read-only */}
                          {isReadonly && (v.checkInTime || v.checkOutTime) && (
                            <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground pl-8">
                              {v.checkInTime && <span>Check-in: {v.checkInTime}</span>}
                              {v.checkOutTime && <span>Check-out: {v.checkOutTime}</span>}
                              {dur !== null && (
                                <span className={isSuspicious ? "text-orange-600 font-semibold" : isExtended ? "text-violet-600 font-semibold" : ""}>
                                  Duration: {fmtDuration(dur)}
                                  {isSuspicious && " (suspicious)"}
                                  {isExtended && " (extended)"}
                                </span>
                              )}
                              {v.category && <Badge variant="outline" className="text-[9px] h-4">{v.category}</Badge>}
                              {v.outcome && v.outcome !== "pending" && (
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] h-4 ${
                                    v.outcome === "successful" ? "border-emerald-300 text-emerald-700" :
                                    v.outcome === "no show" ? "border-red-300 text-red-700" :
                                    "border-amber-300 text-amber-700"
                                  }`}
                                >
                                  {v.outcome}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            );
          })}
        </div>

        {/* Validation Summary */}
        <PlanEditorValidationSummary days={days} />

        {/* Approval Audit Trail in editor */}
        {(plan.approvalHistory ?? []).length > 0 && (
          <div className="mt-2">
            <ApprovalAuditTrail history={plan.approvalHistory!} />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {!isReadonly && <Button onClick={handleSave}>Save Plan</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Plan Editor Validation Summary ─── */
function PlanEditorValidationSummary({ days }: { days: DailyPlan[] }) {
  const validation = validatePlan(days);
  const hasIssues = validation.conflicts.length > 0 || validation.suspicious > 0 || validation.extended > 0;

  if (!hasIssues) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
          <ShieldAlert className="h-4 w-4" />
          Validation Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-4 flex-wrap text-xs">
          {validation.conflicts.length > 0 && (
            <div className="flex items-center gap-1">
              <Badge className="bg-yellow-100 text-yellow-800 text-[10px]">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {validation.conflicts.length} conflict{validation.conflicts.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          )}
          {validation.suspicious > 0 && (
            <div className="flex items-center gap-1">
              <Badge className="bg-orange-100 text-orange-800 text-[10px]">
                <Timer className="h-3 w-3 mr-1" />
                {validation.suspicious} suspicious (&lt;{SUSPICIOUS_THRESHOLD_MIN}m)
              </Badge>
            </div>
          )}
          {validation.extended > 0 && (
            <div className="flex items-center gap-1">
              <Badge className="bg-violet-100 text-violet-800 text-[10px]">
                <Clock className="h-3 w-3 mr-1" />
                {validation.extended} extended (&gt;{EXTENDED_THRESHOLD_MIN}m)
              </Badge>
            </div>
          )}
        </div>
        {validation.conflicts.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-amber-200">
            {validation.conflicts.map((c, idx) => (
              <p key={idx} className="text-[10px] text-amber-700 flex items-center gap-1">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                  c.type === "duplicate_doctor" ? "bg-yellow-500" :
                  c.type === "overlapping_time" ? "bg-red-500" :
                  "bg-orange-500"
                }`} />
                {c.message}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Visit Analytics ─── */
function VisitAnalytics({
  plans,
  allUsers,
}: {
  plans: WeeklyPlan[];
  allUsers: ReturnType<typeof useCurrentUser>["allUsers"];
}) {
  // Collect all visits across all plans
  const allVisits = useMemo(() => {
    return plans.flatMap((p) =>
      p.days.flatMap((d) =>
        d.visits.map((v) => ({
          ...v,
          date: d.date,
          repId: p.repId,
          planStatus: p.status,
          weekStart: p.weekStartDate,
        }))
      )
    );
  }, [plans]);

  // -- Summary stats --
  const totalVisitsThisWeek = allVisits.length;
  const visitsWithDuration = allVisits
    .map((v) => ({ ...v, dur: calcDurationMin(v.checkInTime, v.checkOutTime) }))
    .filter((v): v is typeof v & { dur: number } => v.dur !== null);
  const avgDuration = visitsWithDuration.length > 0
    ? Math.round(visitsWithDuration.reduce((s, v) => s + v.dur, 0) / visitsWithDuration.length)
    : 0;
  const suspiciousVisits = visitsWithDuration.filter((v) => v.dur < SUSPICIOUS_THRESHOLD_MIN);

  // Completion rate: visits with check-in AND outcome not pending / total planned
  const plannedVisits = allVisits.filter((v) => v.category === "planned" || !v.category);
  const completedVisits = allVisits.filter((v) => v.outcome && v.outcome !== "pending" && v.outcome !== "no show");
  const completionRate = plannedVisits.length > 0
    ? Math.round((completedVisits.length / plannedVisits.length) * 100)
    : 0;

  // Planned vs Actual
  const actualVisits = allVisits.filter((v) => v.checkInTime);

  // -- Visits per day (last 7 days from seed data) --
  const visitsByDay = useMemo(() => {
    const map: Record<string, number> = {};
    allVisits.forEach((v) => {
      const dateKey = new Date(v.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      map[dateKey] = (map[dateKey] || 0) + 1;
    });
    // Sort by date
    const entries = Object.entries(map).sort((a, b) => {
      // Parse dates for sorting
      const findDate = (label: string) => {
        const match = allVisits.find((v) => {
          const d = new Date(v.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
          return d === label;
        });
        return match ? new Date(match.date).getTime() : 0;
      };
      return findDate(a[0]) - findDate(b[0]);
    });
    return entries;
  }, [allVisits]);

  const maxVisitsPerDay = Math.max(...visitsByDay.map(([, c]) => c), 1);

  // -- Visit type breakdown --
  const categoryBreakdown = useMemo(() => {
    const cats: Record<string, number> = { planned: 0, unplanned: 0, "follow-up": 0 };
    allVisits.forEach((v) => {
      const cat = v.category || "planned";
      cats[cat] = (cats[cat] || 0) + 1;
    });
    return cats;
  }, [allVisits]);

  // -- Visit outcome distribution --
  const outcomeBreakdown = useMemo(() => {
    const outcomes: Record<string, number> = { successful: 0, "follow-up needed": 0, "no show": 0, pending: 0 };
    allVisits.forEach((v) => {
      const out = v.outcome || "pending";
      outcomes[out] = (outcomes[out] || 0) + 1;
    });
    return outcomes;
  }, [allVisits]);

  // -- Top performing reps by visit count --
  const repStats = useMemo(() => {
    const map: Record<string, { count: number; name: string }> = {};
    allVisits.forEach((v) => {
      if (!map[v.repId]) {
        const u = allUsers.find((u) => u.id === v.repId);
        map[v.repId] = { count: 0, name: u?.name ?? v.repId };
      }
      map[v.repId].count += 1;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [allVisits, allUsers]);

  // -- Average visits per rep per day --
  const uniqueReps = new Set(allVisits.map((v) => v.repId)).size || 1;
  const uniqueDays = new Set(allVisits.map((v) => new Date(v.date).toDateString())).size || 1;
  const avgVisitsPerRepPerDay = (totalVisitsThisWeek / uniqueReps / uniqueDays).toFixed(1);

  // -- Heatmap: visits per day-of-week --
  const heatmapData = useMemo(() => {
    const map: Record<string, number> = {};
    DAY_LABELS.forEach((l) => { map[l] = 0; });
    allVisits.forEach((v) => {
      const dayOfWeek = new Date(v.date).getDay();
      // Convert JS day (0=Sun) to our label index (0=Mon)
      const idx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      if (idx >= 0 && idx < 7) {
        map[DAY_LABELS[idx]] = (map[DAY_LABELS[idx]] || 0) + 1;
      }
    });
    return map;
  }, [allVisits]);

  const maxHeatmap = Math.max(...Object.values(heatmapData), 1);

  const outcomeColors: Record<string, string> = {
    successful: "bg-emerald-500",
    "follow-up needed": "bg-amber-500",
    "no show": "bg-red-500",
    pending: "bg-slate-400",
  };

  const categoryColors: Record<string, string> = {
    planned: "bg-blue-500",
    unplanned: "bg-purple-500",
    "follow-up": "bg-teal-500",
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={Target}
          title="Total Visits"
          value={totalVisitsThisWeek}
          subtitle="Across all plans"
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatsCard
          icon={TrendingUp}
          title="Completion Rate"
          value={`${completionRate}%`}
          subtitle={`${completedVisits.length} of ${plannedVisits.length} planned`}
          iconColor="bg-emerald-100 text-emerald-600"
        />
        <StatsCard
          icon={Timer}
          title="Avg Duration"
          value={fmtDuration(avgDuration)}
          subtitle={suspiciousVisits.length > 0 ? `${suspiciousVisits.length} suspicious (<${SUSPICIOUS_THRESHOLD_MIN}m)` : "No suspicious visits"}
          iconColor="bg-violet-100 text-violet-600"
        />
        <StatsCard
          icon={Calendar}
          title="Planned vs Actual"
          value={`${plannedVisits.length} / ${actualVisits.length}`}
          subtitle={`${avgVisitsPerRepPerDay} avg per rep/day`}
          iconColor="bg-amber-100 text-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visits per Day - Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Visits per Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            {visitsByDay.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No visit data available</p>
            ) : (
              <div className="space-y-2">
                {visitsByDay.map(([label, count]) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-28 truncate text-right">{label}</span>
                    <div className="flex-1 h-6 bg-muted/30 rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded transition-all"
                        style={{ width: `${(count / maxVisitsPerDay) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Day-of-Week Heatmap */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Visits by Day of Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {DAY_LABELS.map((label) => {
                const count = heatmapData[label];
                const intensity = count / maxHeatmap;
                const bgColor = count === 0
                  ? "bg-slate-100"
                  : intensity < 0.33
                  ? "bg-blue-100"
                  : intensity < 0.66
                  ? "bg-blue-300"
                  : "bg-blue-500";
                const textColor = intensity >= 0.66 ? "text-white" : "text-foreground";
                return (
                  <div
                    key={label}
                    className={`${bgColor} ${textColor} rounded-lg p-3 text-center transition-colors`}
                  >
                    <p className="text-[10px] font-medium uppercase opacity-70">{label}</p>
                    <p className="text-lg font-bold mt-1">{count}</p>
                    <p className="text-[10px] opacity-70">visits</p>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-end gap-2 mt-3">
              <span className="text-[10px] text-muted-foreground">Low</span>
              <div className="flex gap-1">
                <div className="w-4 h-3 rounded bg-slate-100 border" />
                <div className="w-4 h-3 rounded bg-blue-100" />
                <div className="w-4 h-3 rounded bg-blue-300" />
                <div className="w-4 h-3 rounded bg-blue-500" />
              </div>
              <span className="text-[10px] text-muted-foreground">High</span>
            </div>
          </CardContent>
        </Card>

        {/* Visit Type Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Visit Type Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(categoryBreakdown).map(([cat, count]) => {
                const pct = totalVisitsThisWeek > 0 ? Math.round((count / totalVisitsThisWeek) * 100) : 0;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium capitalize">{cat}</span>
                      <span className="text-xs text-muted-foreground">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${categoryColors[cat] || "bg-slate-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t">
              {Object.entries(categoryColors).map(([cat, color]) => (
                <div key={cat} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  <span className="text-[10px] text-muted-foreground capitalize">{cat}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Visit Outcome Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Visit Outcome Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(outcomeBreakdown).map(([outcome, count]) => {
                const pct = totalVisitsThisWeek > 0 ? Math.round((count / totalVisitsThisWeek) * 100) : 0;
                return (
                  <div key={outcome}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium capitalize">{outcome}</span>
                      <span className="text-xs text-muted-foreground">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${outcomeColors[outcome] || "bg-slate-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t">
              {Object.entries(outcomeColors).map(([out, color]) => (
                <div key={out} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  <span className="text-[10px] text-muted-foreground capitalize">{out}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Reps */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Top Performing Reps
            </CardTitle>
          </CardHeader>
          <CardContent>
            {repStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No data</p>
            ) : (
              <div className="space-y-2">
                {repStats.slice(0, 5).map((rep, idx) => (
                  <div key={rep.name} className="flex items-center gap-3">
                    <span className={`text-xs font-bold w-5 text-center ${idx === 0 ? "text-amber-500" : idx === 1 ? "text-slate-400" : idx === 2 ? "text-orange-400" : "text-muted-foreground"}`}>
                      #{idx + 1}
                    </span>
                    <span className="text-xs flex-1 truncate">{rep.name}</span>
                    <Badge variant="outline" className="text-[10px]">{rep.count} visits</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Suspicious Visits (under threshold) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Suspicious Visits (&lt;{SUSPICIOUS_THRESHOLD_MIN}m)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {suspiciousVisits.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-400 opacity-50" />
                <p className="text-sm text-muted-foreground">No suspicious visits detected</p>
              </div>
            ) : (
              <div className="space-y-2">
                {suspiciousVisits.map((v, idx) => {
                  const repName = allUsers.find((u) => u.id === v.repId)?.name ?? v.repId;
                  return (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded border border-orange-200 bg-orange-50/50">
                      <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{repName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {fmtDate(v.date)} · {v.checkInTime}–{v.checkOutTime} · {fmtDuration(v.dur)}
                        </p>
                      </div>
                      <Badge className="bg-orange-100 text-orange-700 text-[10px]">{fmtDuration(v.dur)}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ─── Starting Points Manager ─── */
function StartingPointsManager({
  points,
  allowOffice,
  onAdd,
  onRemove,
  userId,
  genId,
}: {
  points: StartingPoint[];
  allowOffice: boolean;
  onAdd: (sp: StartingPoint) => void;
  onRemove: (id: string) => void;
  userId: string;
  genId: (prefix: string) => string;
}) {
  const [type, setType] = useState<StartingPoint["type"]>("AM");
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("30.0444");
  const [lng, setLng] = useState("31.2357");

  function handleAdd() {
    if (!label.trim() || !address.trim()) return;
    onAdd({
      id: genId("sp"),
      userId,
      type,
      label,
      address,
      lat: Number(lat),
      lng: Number(lng),
    });
    setLabel("");
    setAddress("");
  }

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        {points.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No starting points yet.</p>
        ) : (
          points.map((sp) => (
            <div key={sp.id} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{sp.type}</Badge>
                <div>
                  <p className="text-sm font-medium">{sp.label}</p>
                  <p className="text-xs text-muted-foreground">{sp.address} · {sp.lat.toFixed(4)}, {sp.lng.toFixed(4)}</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => onRemove(sp.id)} className="text-red-600">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Add Starting Point</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium">Type</label>
              <select
                className="w-full mt-1 rounded border p-1.5 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value as StartingPoint["type"])}
              >
                <option value="AM">AM (morning location)</option>
                <option value="PM">PM (afternoon location)</option>
                {allowOffice && <option value="OFFICE">Office (DM and above)</option>}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Label</label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Home (Maadi)" className="text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium">Address</label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City" className="text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium">Latitude</label>
              <Input value={lat} onChange={(e) => setLat(e.target.value)} className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium">Longitude</label>
              <Input value={lng} onChange={(e) => setLng(e.target.value)} className="text-sm" />
            </div>
          </div>
          <Button onClick={handleAdd} disabled={!label.trim() || !address.trim()} className="w-full">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Starting Point
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
