"use client";

import { useMemo, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import {
  useDataStore,
  type WeeklyPlan,
  type DailyPlan,
  type PlannedVisit,
  type StartingPoint,
  type PlannedVisitCategory,
  type PlannedVisitOutcome,
  type ApprovalEntry,
} from "@/lib/data-store";
import { useCurrentUser } from "@/lib/user-context";

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
  return new Date(d.setDate(diff));
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

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SUSPICIOUS_THRESHOLD_MIN = 10;

export default function WeeklyPlanPage() {
  const store = useDataStore();
  const { user, allUsers, getReportsOf } = useCurrentUser();

  const [activeWeek, setActiveWeek] = useState<Date>(startOfWeek(new Date()));
  const [editing, setEditing] = useState<WeeklyPlan | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showStartingPoints, setShowStartingPoints] = useState(false);
  const [rejectingPlan, setRejectingPlan] = useState<WeeklyPlan | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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
    setEditing(newPlan);
    setShowCreateDialog(false);
  }

  function submitPlan(plan: WeeklyPlan) {
    store.update("weeklyPlans", plan.id, {
      status: "SUBMITTED",
      submittedAt: new Date().toISOString(),
    });
  }

  function approvePlan(plan: WeeklyPlan) {
    store.update("weeklyPlans", plan.id, {
      status: "APPROVED",
      approvedById: user.id,
      approvedAt: new Date().toISOString(),
    });
  }

  function rejectPlan() {
    if (!rejectingPlan) return;
    store.update("weeklyPlans", rejectingPlan.id, {
      status: "REJECTED",
      rejectionReason: rejectReason,
      approvedById: user.id,
      approvedAt: new Date().toISOString(),
    });
    setRejectingPlan(null);
    setRejectReason("");
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
      <PageHeader
        title="Weekly Visit Plans"
        description="Set, submit, and review weekly plans before starting field trips. Plans must be approved by a manager before execution."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowStartingPoints(true)}>
              <MapPin className="h-4 w-4 mr-2" />
              Starting Points
            </Button>
            {isRep && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Weekly Plan
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={Calendar}
          title="Draft Plans"
          value={stats.draft}
          subtitle="Not yet submitted"
          iconColor="bg-slate-100 text-slate-600"
        />
        <StatsCard
          icon={Clock}
          title="Awaiting Approval"
          value={stats.submitted}
          subtitle="Submitted, pending"
          iconColor="bg-amber-100 text-amber-600"
        />
        <StatsCard
          icon={CheckCircle2}
          title="Approved"
          value={stats.approved}
          subtitle="Ready to execute"
          iconColor="bg-emerald-100 text-emerald-600"
        />
        <StatsCard
          icon={XCircle}
          title="Rejected"
          value={stats.rejected}
          subtitle="Needs revision"
          iconColor="bg-red-100 text-red-600"
        />
      </div>

      <Tabs defaultValue="my">
        <TabsList>
          <TabsTrigger value="my">My Plans</TabsTrigger>
          {isManager && <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>}
          <TabsTrigger value="all">All Plans</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="space-y-3">
          {myPlans.filter((p) => p.repId === user.id).length === 0 ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">You haven&apos;t created any weekly plans yet.</p>
              <p className="text-xs mt-1">Click &quot;New Weekly Plan&quot; to start.</p>
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
                  isRep={isRep}
                  isManager={false}
                  onEdit={() => setEditing(plan)}
                  onSubmit={() => submitPlan(plan)}
                  onApprove={() => approvePlan(plan)}
                  onReject={() => setRejectingPlan(plan)}
                  onDelete={() => deletePlan(plan)}
                />
              ))
          )}
        </TabsContent>

        {isManager && (
          <TabsContent value="approvals" className="space-y-3">
            {myPlans.filter((p) => p.status === "SUBMITTED" && p.repId !== user.id).length === 0 ? (
              <Card><CardContent className="p-12 text-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No plans awaiting your approval.</p>
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
                    onEdit={() => setEditing(plan)}
                    onSubmit={() => submitPlan(plan)}
                    onApprove={() => approvePlan(plan)}
                    onReject={() => setRejectingPlan(plan)}
                    onDelete={() => deletePlan(plan)}
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
                onEdit={() => setEditing(plan)}
                onSubmit={() => submitPlan(plan)}
                onApprove={() => approvePlan(plan)}
                onReject={() => setRejectingPlan(plan)}
                onDelete={() => deletePlan(plan)}
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
              <label className="text-sm font-medium">Week Starting (Monday)</label>
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
  onEdit,
  onSubmit,
  onApprove,
  onReject,
  onDelete,
}: {
  plan: WeeklyPlan;
  store: ReturnType<typeof useDataStore>;
  allUsers: ReturnType<typeof useCurrentUser>["allUsers"];
  isRep: boolean;
  isManager: boolean;
  onEdit: () => void;
  onSubmit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
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

  const statusBadge: Record<typeof plan.status, { label: string; color: string }> = {
    DRAFT: { label: "Draft", color: "bg-slate-100 text-slate-700" },
    SUBMITTED: { label: "Awaiting Approval", color: "bg-amber-100 text-amber-700" },
    APPROVED: { label: "Approved", color: "bg-emerald-100 text-emerald-700" },
    REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700" },
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
          </div>
          <div className="flex items-center gap-2">
            {suspiciousCount > 0 && (
              <Badge className="bg-orange-100 text-orange-700 text-[10px] flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {suspiciousCount} short
              </Badge>
            )}
            <Badge className={statusBadge[plan.status].color}>{statusBadge[plan.status].label}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2 mb-3">
          {plan.days.map((d, i) => (
            <div key={i} className="border rounded p-2 text-center">
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
              </div>
            </div>
          ))}
        </div>

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
          {(plan.status === "DRAFT" || plan.status === "REJECTED") && isRep && (
            <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-600">
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
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
  store: ReturnType<typeof useDataStore>;
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
          {days.map((day, dayIdx) => (
            <Card key={dayIdx}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    {DAY_LABELS[dayIdx]} · {fmtDate(day.date)}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {!isReadonly && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addVisit(dayIdx, "AM")}>
                          <Sun className="h-3 w-3 mr-1 text-amber-500" /> Add AM Visit
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addVisit(dayIdx, "PM")}>
                          <Moon className="h-3 w-3 mr-1 text-indigo-500" /> Add PM Visit
                        </Button>
                      </>
                    )}
                  </div>
                </div>
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
                      return (
                        <div key={vIdx} className={`p-2 rounded border ${isSuspicious ? "border-orange-300 bg-orange-50/40" : v.session === "AM" ? "bg-amber-50/30" : "bg-indigo-50/30"}`}>
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
                                <span className={`text-[10px] font-medium ${isSuspicious ? "text-orange-600" : "text-muted-foreground"}`}>
                                  {isSuspicious && <AlertTriangle className="h-2.5 w-2.5 inline mr-0.5" />}
                                  {fmtDuration(dur)}
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
                          {/* Labels row under the grid for check-in/out when in read-only */}
                          {isReadonly && (v.checkInTime || v.checkOutTime) && (
                            <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground pl-8">
                              {v.checkInTime && <span>Check-in: {v.checkInTime}</span>}
                              {v.checkOutTime && <span>Check-out: {v.checkOutTime}</span>}
                              {dur !== null && (
                                <span className={isSuspicious ? "text-orange-600 font-semibold" : ""}>
                                  Duration: {fmtDuration(dur)}
                                  {isSuspicious && " (suspicious)"}
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
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {!isReadonly && <Button onClick={handleSave}>Save Plan</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
