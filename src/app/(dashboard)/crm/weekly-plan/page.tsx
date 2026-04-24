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

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
            </p>
          </div>
          <Badge className={statusBadge[plan.status].color}>{statusBadge[plan.status].label}</Badge>
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
        { session, timeSlot: session === "AM" ? "09:00" : "14:00", visitType: "SINGLE" },
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
                    {day.visits.map((v, vIdx) => (
                      <div key={vIdx} className={`p-2 rounded border ${v.session === "AM" ? "bg-amber-50/30" : "bg-indigo-50/30"}`}>
                        <div className="grid grid-cols-12 gap-2 items-center text-xs">
                          <div className="col-span-1">
                            {v.session === "AM" ? (
                              <Badge className="bg-amber-100 text-amber-800 text-[10px]">AM</Badge>
                            ) : (
                              <Badge className="bg-indigo-100 text-indigo-800 text-[10px]">PM</Badge>
                            )}
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="time"
                              value={v.timeSlot}
                              onChange={(e) => updateVisit(dayIdx, vIdx, { timeSlot: e.target.value })}
                              disabled={isReadonly}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div className="col-span-5">
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
                          <div className="col-span-2">
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
                          <div className="col-span-1 text-center">
                            {v.amAccountId ? (
                              <Building2 className="h-3.5 w-3.5 text-emerald-600 inline" />
                            ) : v.doctorId ? (
                              <Stethoscope className="h-3.5 w-3.5 text-blue-600 inline" />
                            ) : null}
                          </div>
                          <div className="col-span-1 text-right">
                            {!isReadonly && (
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => removeVisit(dayIdx, vIdx)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
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
