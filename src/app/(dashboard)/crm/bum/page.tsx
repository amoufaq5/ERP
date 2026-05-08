"use client";

import { useState, useMemo } from "react";
import { Crown, Users, DollarSign, TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import StatusBadge from "@/components/shared/status-badge";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { useApiDataStore } from "@/lib/api/use-api-store";
import { useCurrentUser, ROLE_LABEL, type AppUser } from "@/lib/user-context";
import type {
  Visit,
  WeeklyPlan,
  MarketRequest,
  Doctor,
  KPIRecord,
  BusinessUnit,
} from "@/lib/data-store";

// ─── Helpers ────────────────────────────────────────────────────────────────

function thisMonthISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isThisMonth(iso: string): boolean {
  return iso.startsWith(thisMonthISO());
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// ─── Shared config ──────────────────────────────────────────────────────────

interface FieldVisitRecord {
  id: string;
  repName: string;
  doctorName: string;
  date: string;
  purpose: string;
  notes: string;
  actions: string;
}

const visitFields: EntityField[] = [
  { name: "repName", label: "Accompanied Rep", type: "text", required: true },
  { name: "doctorName", label: "Doctor/KOL", type: "text", required: true },
  { name: "date", label: "Date", type: "date", required: true },
  { name: "purpose", label: "Purpose", type: "select", options: [
    "KOL Management", "Strategic Account", "Launch Event", "Performance Review",
  ].map(p => ({ label: p, value: p })) },
  { name: "notes", label: "Notes", type: "textarea" },
  { name: "actions", label: "Action Items", type: "textarea" },
];

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function BUMPage() {
  const store = useApiDataStore();
  const { user, allUsers, getReportsOf } = useCurrentUser();

  // ── Identify BUM's own business unit ──────────────────────────────────
  const myBU = useMemo(() => {
    return (store.businessUnits as BusinessUnit[]).find(
      (bu) => bu.managerId === user.id
    ) ?? null;
  }, [store.businessUnits, user.id]);

  // ── Team members: all direct reports ──────────────────────────────────
  const teamMembers = useMemo(() => getReportsOf(user.id), [user.id, getReportsOf]);
  const teamMemberIds = useMemo(() => new Set(teamMembers.map((m) => m.id)), [teamMembers]);

  const dms = useMemo(() => teamMembers.filter((u) => u.role === "DISTRICT_MANAGER"), [teamMembers]);
  const reps = useMemo(() => teamMembers.filter((u) => u.role === "MEDICAL_REP"), [teamMembers]);

  // ── Filtered store data scoped to this BU's team ─────────────────────
  const teamVisits = useMemo(
    () => (store.visits as Visit[]).filter((v) => teamMemberIds.has(v.repId)),
    [store.visits, teamMemberIds]
  );

  const visitsThisMonth = useMemo(
    () => teamVisits.filter((v) => isThisMonth(v.dateTime)),
    [teamVisits]
  );

  const teamPlans = useMemo(
    () => (store.weeklyPlans as WeeklyPlan[]).filter((p) => teamMemberIds.has(p.repId)),
    [store.weeklyPlans, teamMemberIds]
  );

  const activePlans = useMemo(
    () => teamPlans.filter((p) => p.status === "SUBMITTED" || p.status === "APPROVED"),
    [teamPlans]
  );

  const teamRequests = useMemo(
    () => (store.marketRequests as MarketRequest[]).filter(
      (r) => teamMemberIds.has(r.requestedById) || (myBU && r.buId === myBU.id)
    ),
    [store.marketRequests, teamMemberIds, myBU]
  );

  const pendingRequests = useMemo(
    () => teamRequests.filter((r) => r.status === "PENDING"),
    [teamRequests]
  );

  const buDoctors = useMemo(
    () => (store.doctors as Doctor[]).filter(
      (d) =>
        (myBU && d.buId === myBU.id) ||
        (d.assignedRepId && teamMemberIds.has(d.assignedRepId))
    ),
    [store.doctors, myBU, teamMemberIds]
  );

  const teamKpis = useMemo(
    () => (store.kpis as KPIRecord[]).filter((k) => teamMemberIds.has(k.userId)),
    [store.kpis, teamMemberIds]
  );

  // ── Computed stats ────────────────────────────────────────────────────
  const totalForce = teamMembers.length;
  const totalDoctors = buDoctors.length;

  // Visit compliance: approved visits this month / total visits this month
  const approvedVisitsThisMonth = visitsThisMonth.filter((v) => v.status === "APPROVED").length;
  const visitCompliancePct = visitsThisMonth.length > 0
    ? Math.round((approvedVisitsThisMonth / visitsThisMonth.length) * 100)
    : 0;

  // Plan compliance: approved plans / total active plans
  const approvedPlans = teamPlans.filter((p) => p.status === "APPROVED").length;
  const planCompliancePct = teamPlans.length > 0
    ? Math.round((approvedPlans / teamPlans.length) * 100)
    : 0;

  // KPI achievement this month
  const thisMonthKpis = teamKpis.filter((k) => k.period === thisMonthISO());
  const avgKpiAchievement = thisMonthKpis.length > 0
    ? Math.round(
        thisMonthKpis.reduce((sum, k) => sum + (k.target > 0 ? (k.actual / k.target) * 100 : 0), 0) /
        thisMonthKpis.length
      )
    : 0;

  // ── Doctor name lookup ────────────────────────────────────────────────
  const doctorMap = useMemo(() => {
    const m = new Map<string, string>();
    (store.doctors as Doctor[]).forEach((d) => m.set(d.id, d.name));
    return m;
  }, [store.doctors]);

  const userMap = useMemo(() => {
    const m = new Map<string, string>();
    allUsers.forEach((u) => m.set(u.id, u.name));
    return m;
  }, [allUsers]);

  // ── Per-DM performance data ───────────────────────────────────────────
  const dmPerformance = useMemo(() => {
    return dms.map((dm) => {
      const dmReps = getReportsOf(dm.id).filter((u) => u.role === "MEDICAL_REP");
      const dmRepIds = new Set(dmReps.map((r) => r.id));
      const dmVisitsMonth = visitsThisMonth.filter((v) => dmRepIds.has(v.repId) || v.repId === dm.id);
      const dmApprovedMonth = dmVisitsMonth.filter((v) => v.status === "APPROVED").length;
      const dmPlans = teamPlans.filter((p) => dmRepIds.has(p.repId) || p.repId === dm.id);
      const dmApprovedPlans = dmPlans.filter((p) => p.status === "APPROVED").length;
      const dmKpis = thisMonthKpis.filter((k) => dmRepIds.has(k.userId) || k.userId === dm.id);
      const dmKpiAvg = dmKpis.length > 0
        ? Math.round(dmKpis.reduce((s, k) => s + (k.target > 0 ? (k.actual / k.target) * 100 : 0), 0) / dmKpis.length)
        : 0;

      return {
        id: dm.id,
        name: dm.name,
        territory: dm.territory ?? "-",
        teamSize: dmReps.length,
        callRate: dmVisitsMonth.length > 0
          ? `${Math.round((dmApprovedMonth / dmVisitsMonth.length) * 100)}%`
          : "0%",
        compliance: dmPlans.length > 0
          ? `${Math.round((dmApprovedPlans / dmPlans.length) * 100)}%`
          : "0%",
        kpiAchievement: `${dmKpiAvg}%`,
        visitsThisMonth: dmVisitsMonth.length,
        rating: dmKpiAvg >= 80 ? "A" : dmKpiAvg >= 50 ? "B" : "C",
      };
    });
  }, [dms, getReportsOf, visitsThisMonth, teamPlans, thisMonthKpis]);

  // ── Market request list for approval table ────────────────────────────
  const [approvalFilters, setApprovalFilters] = useState<FilterState>({ _search: "", status: "" });

  const filteredRequests = useMemo(() => {
    return teamRequests.filter((r) => {
      if (approvalFilters.status && r.status !== approvalFilters.status) return false;
      if (approvalFilters._search) {
        const q = approvalFilters._search.toLowerCase();
        return (
          r.id.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q) ||
          (userMap.get(r.requestedById) ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [teamRequests, approvalFilters, userMap]);

  // ── Field visit data from real visits (BUM's own accompanied visits) ──
  // We show the most recent team visits as "field visits" overview
  const recentTeamVisits = useMemo(() => {
    return [...teamVisits]
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
      .slice(0, 20)
      .map((v) => ({
        id: v.id,
        repName: userMap.get(v.repId) ?? v.repId,
        doctorName: doctorMap.get(v.doctorId) ?? v.doctorId,
        date: v.dateTime.split("T")[0],
        status: v.status,
        notes: v.notes || "-",
        session: v.session,
      }));
  }, [teamVisits, userMap, doctorMap]);

  // ── Custom field visits (BUM's own strategic visits) ──────────────────
  const [bumVisits, setBumVisits] = useState<FieldVisitRecord[]>([]);
  const [editingVisit, setEditingVisit] = useState<FieldVisitRecord | null>(null);
  const [showVisit, setShowVisit] = useState(false);
  const [visitFilters, setVisitFilters] = useState<FilterState>({ _search: "" });
  const [viewVisit, setViewVisit] = useState<FieldVisitRecord | null>(null);

  const filteredBumVisits = useMemo(() => {
    const all = bumVisits;
    if (!visitFilters._search) return all;
    const q = visitFilters._search.toLowerCase();
    return all.filter(
      (v) =>
        v.repName.toLowerCase().includes(q) ||
        v.doctorName.toLowerCase().includes(q)
    );
  }, [bumVisits, visitFilters]);

  // ── Hierarchy for Org tab ─────────────────────────────────────────────
  const hierarchy = useMemo(() => {
    return dms.map((dm) => {
      const dmReps = getReportsOf(dm.id).filter((u) => u.role === "MEDICAL_REP");
      const dmDoctors = buDoctors.filter(
        (d) => d.assignedRepId && (dmReps.some((r) => r.id === d.assignedRepId) || d.assignedRepId === dm.id)
      );
      return {
        dm,
        reps: dmReps,
        doctorCount: dmDoctors.length,
      };
    });
  }, [dms, getReportsOf, buDoctors]);

  // Reps not under any DM
  const unattachedReps = useMemo(() => {
    const attachedRepIds = new Set<string>();
    for (const dm of dms) {
      for (const rep of getReportsOf(dm.id).filter((u) => u.role === "MEDICAL_REP")) {
        attachedRepIds.add(rep.id);
      }
    }
    return reps.filter((r) => !attachedRepIds.has(r.id));
  }, [dms, reps, getReportsOf]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Business Unit Manager Dashboard${myBU ? ` - ${myBU.name}` : ""}`}
        description="Field force oversight, strategic decisions, and performance management"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={Users}
          title="Total Field Force"
          value={totalForce}
          subtitle={`${dms.length} DMs, ${reps.length} Reps - ${totalDoctors} doctors`}
          iconColor="bg-blue-100 text-blue-700"
        />
        <StatsCard
          icon={TrendingUp}
          title="Visit Compliance"
          value={`${visitCompliancePct}%`}
          subtitle={`${visitsThisMonth.length} visits this month`}
          iconColor="bg-green-100 text-green-700"
        />
        <StatsCard
          icon={DollarSign}
          title="Plan Compliance"
          value={`${planCompliancePct}%`}
          subtitle={`${activePlans.length} active plans`}
          iconColor="bg-purple-100 text-purple-700"
        />
        <StatsCard
          icon={Crown}
          title="KPI Achievement"
          value={avgKpiAchievement > 0 ? `${avgKpiAchievement}%` : "-"}
          subtitle={`${thisMonthKpis.length} KPIs tracked`}
          iconColor="bg-amber-100 text-amber-700"
        />
      </div>

      <Tabs defaultValue="org">
        <TabsList>
          <TabsTrigger value="org">Organization Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance Dashboard</TabsTrigger>
          <TabsTrigger value="requests">
            Market Requests
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-[10px]">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="visits">Field Visits</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* ── Organization Overview ──────────────────────────────────────── */}
        <TabsContent value="org">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Organization Hierarchy</CardTitle>
                <CardDescription>
                  BUM {myBU ? `(${myBU.name})` : ""} - District Managers - Medical Reps
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-4 bg-amber-50 dark:bg-amber-900/10">
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-amber-600" />
                    <span className="font-semibold">BUM (You) - {user.name}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Total Force: {totalForce} members - {totalDoctors} doctors - {dms.length} DMs
                    {myBU && <span> - {myBU.name}</span>}
                  </div>
                </div>

                {hierarchy.length === 0 && unattachedReps.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No team members found. Add District Managers or Medical Reps to see the hierarchy.
                  </div>
                )}

                {hierarchy.map((group) => (
                  <div key={group.dm.id} className="ml-4 border-l-2 pl-4 space-y-3">
                    <div className="rounded-lg border p-3 bg-blue-50 dark:bg-blue-900/10">
                      <div className="font-medium">
                        {group.dm.name}{" "}
                        <span className="text-xs text-muted-foreground">
                          - DM{group.dm.territory ? ` - ${group.dm.territory}` : ""}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {group.reps.length} reps - {group.doctorCount} doctors
                      </div>
                    </div>
                    {group.reps.length > 0 && (
                      <div className="ml-4 grid gap-2 md:grid-cols-2">
                        {group.reps.map((rep) => (
                          <div key={rep.id} className="rounded border p-2 text-sm">
                            <div className="font-medium">{rep.name}</div>
                            <div className="text-xs text-muted-foreground">
                              Medical Rep{rep.territory ? ` - ${rep.territory}` : ""}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {unattachedReps.length > 0 && (
                  <div className="ml-4 border-l-2 pl-4 space-y-3">
                    <div className="rounded-lg border p-3 bg-gray-50 dark:bg-gray-900/10">
                      <div className="font-medium text-sm text-muted-foreground">
                        Direct Reports (not under a DM) - {unattachedReps.length} reps
                      </div>
                    </div>
                    <div className="ml-4 grid gap-2 md:grid-cols-2">
                      {unattachedReps.map((rep) => (
                        <div key={rep.id} className="rounded border p-2 text-sm">
                          <div className="font-medium">{rep.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Medical Rep{rep.territory ? ` - ${rep.territory}` : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Performance Dashboard ──────────────────────────────────────── */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>District Manager Performance</CardTitle>
              <CardDescription>
                {dms.length > 0 ? "KPIs per District Manager" : "No District Managers in your team yet"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dms.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No District Managers found in your team.
                </div>
              ) : (
                <DataTable
                  columns={[
                    { key: "name", label: "District Manager", render: (v) => <span className="font-medium">{v as string}</span> },
                    { key: "territory", label: "Territory" },
                    { key: "teamSize", label: "Team Size" },
                    { key: "visitsThisMonth", label: "Visits (Month)" },
                    { key: "callRate", label: "Call Rate" },
                    { key: "compliance", label: "Plan Compliance" },
                    { key: "kpiAchievement", label: "KPI Achievement", render: (v) => <span className="font-semibold">{v as string}</span> },
                    { key: "rating", label: "Rating", render: (_v, row) => {
                      const r = row as unknown as (typeof dmPerformance)[0];
                      return <StatusBadge status={r.rating === "A" ? "Excellent" : r.rating === "B" ? "Good" : "Needs Improvement"} />;
                    }},
                  ] as Column<Record<string, unknown>>[]}
                  data={dmPerformance as unknown as Record<string, unknown>[]}
                  exportable exportFilename="crm-bum-performance.csv" emptyMessage="No performance data available."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Market Requests (replacing Strategic Approvals) ────────────── */}
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Market Requests</CardTitle>
              <CardDescription>
                {pendingRequests.length > 0
                  ? `${pendingRequests.length} pending request${pendingRequests.length !== 1 ? "s" : ""} from your team`
                  : "All requests handled"}
              </CardDescription>
              <FilterBar
                searchValue={approvalFilters._search}
                onSearchChange={(v) => setApprovalFilters((f) => ({ ...f, _search: v }))}
                fields={[{ key: "status", label: "Status", type: "select", options: [
                  { label: "Pending", value: "PENDING" },
                  { label: "Approved", value: "APPROVED" },
                  { label: "Rejected", value: "REJECTED" },
                  { label: "Fulfilled", value: "FULFILLED" },
                ]}]}
                values={approvalFilters}
                onChange={(k, v) => setApprovalFilters((f) => ({ ...f, [k]: v }))}
              />
            </CardHeader>
            <CardContent>
              {filteredRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No market requests to display.
                </div>
              ) : (
                <DataTable
                  columns={[
                    { key: "id", label: "Request#", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
                    { key: "requestedById", label: "From", render: (v) => <span>{userMap.get(v as string) ?? (v as string)}</span> },
                    { key: "type", label: "Type" },
                    { key: "description", label: "Description", className: "max-w-xs truncate" },
                    { key: "priority", label: "Priority", render: (v) => <StatusBadge status={v as string} /> },
                    { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
                    { key: "createdAt", label: "Date", render: (v) => <span className="text-sm">{formatDate(v as string)}</span> },
                  ] as Column<Record<string, unknown>>[]}
                  data={filteredRequests as unknown as Record<string, unknown>[]}
                  exportable exportFilename="crm-bum-requests.csv" emptyMessage="No market requests."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Field Visits ────────────────────────────────────────────────── */}
        <TabsContent value="visits">
          <div className="space-y-4">
            {/* Recent team visits */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Team Visits</CardTitle>
                <CardDescription>Latest visits by your field force</CardDescription>
              </CardHeader>
              <CardContent>
                {recentTeamVisits.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No visits recorded by team members yet.
                  </div>
                ) : (
                  <DataTable
                    columns={[
                      { key: "repName", label: "Rep", render: (v) => <span className="font-medium">{v as string}</span> },
                      { key: "doctorName", label: "Doctor" },
                      { key: "date", label: "Date", render: (v) => <span>{formatDate(v as string)}</span> },
                      { key: "session", label: "Session" },
                      { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
                      { key: "notes", label: "Notes", className: "max-w-xs truncate" },
                    ] as Column<Record<string, unknown>>[]}
                    data={recentTeamVisits as unknown as Record<string, unknown>[]}
                    exportable exportFilename="crm-bum-team-visits.csv" emptyMessage="No visits found."
                  />
                )}
              </CardContent>
            </Card>

            {/* BUM's own strategic visits */}
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>BUM Strategic Visits</CardTitle>
                  <CardDescription>Your own field visits and KOL management</CardDescription>
                </div>
                <Button size="sm" onClick={() => { setEditingVisit(null); setShowVisit(true); }}>
                  <Plus className="mr-2 h-4 w-4" />Register Visit
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <FilterBar
                  searchValue={visitFilters._search}
                  onSearchChange={(v) => setVisitFilters((f) => ({ ...f, _search: v }))}
                  fields={[]}
                  values={visitFilters}
                  onChange={(k, v) => setVisitFilters((f) => ({ ...f, [k]: v }))}
                />
                {filteredBumVisits.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No strategic visits registered. Click &quot;Register Visit&quot; to add one.
                  </div>
                ) : (
                  <DataTable
                    columns={[
                      { key: "id", label: "Visit#", render: (v) => <span className="font-mono">{v as string}</span> },
                      { key: "repName", label: "Accompanied", render: (v) => <span className="font-medium">{v as string}</span> },
                      { key: "doctorName", label: "Doctor/KOL" },
                      { key: "date", label: "Date", render: (v) => <span>{formatDate(v as string)}</span> },
                      { key: "purpose", label: "Purpose", render: (v) => <StatusBadge status={v as string} /> },
                      { key: "notes", label: "Notes", className: "max-w-xs truncate" },
                      { key: "_actions", label: "", render: (_v, row) => {
                        const v = row as unknown as FieldVisitRecord;
                        return (
                          <EditDeleteMenu
                            onView={() => setViewVisit(v)}
                            onEdit={() => { setEditingVisit(v); setShowVisit(true); }}
                            onDelete={() => setBumVisits(prev => prev.filter(x => x.id !== v.id))}
                            itemLabel={v.id}
                          />
                        );
                      }},
                    ] as Column<Record<string, unknown>>[]}
                    data={filteredBumVisits as unknown as Record<string, unknown>[]}
                    exportable exportFilename="crm-bum-strategic-visits.csv" emptyMessage="No strategic visits."
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Analytics ───────────────────────────────────────────────────── */}
        <TabsContent value="analytics">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Team Performance</CardTitle>
                <CardDescription>KPI achievement by team member</CardDescription>
              </CardHeader>
              <CardContent>
                {dmPerformance.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No performance data available.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dmPerformance.map((dm) => {
                      const achievement = parseInt(dm.kpiAchievement) || 0;
                      return (
                        <div key={dm.id}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{dm.name}</span>
                            <span>{dm.kpiAchievement}</span>
                          </div>
                          <div className="h-3 w-full rounded bg-muted overflow-hidden">
                            <div
                              className={`h-full ${achievement >= 80 ? "bg-green-500" : achievement >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                              style={{ width: `${Math.min(achievement, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Business Unit KPIs</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Headcount</span>
                    <span className="font-bold">{totalForce}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">District Managers</span>
                    <span className="font-bold">{dms.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Medical Reps</span>
                    <span className="font-bold">{reps.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Doctors</span>
                    <span className="font-bold">{totalDoctors}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Visits This Month</span>
                    <span className="font-bold">{visitsThisMonth.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Plans</span>
                    <span className="font-bold">{activePlans.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pending Requests</span>
                    <span className="font-bold text-amber-600">{pendingRequests.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">KPI Achievement (avg)</span>
                    <span className={`font-bold ${avgKpiAchievement >= 80 ? "text-green-600" : avgKpiAchievement >= 50 ? "text-amber-600" : "text-red-600"}`}>
                      {avgKpiAchievement > 0 ? `${avgKpiAchievement}%` : "-"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>

      {/* Field Visit Detail Dialog */}
      <Dialog open={!!viewVisit} onOpenChange={(open) => { if (!open) setViewVisit(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewVisit?.id} - {viewVisit?.doctorName}</DialogTitle>
          </DialogHeader>
          {viewVisit && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><span className="text-sm text-muted-foreground">Visit ID</span><p className="font-medium">{viewVisit.id}</p></div>
              <div><span className="text-sm text-muted-foreground">Accompanied</span><p className="font-medium">{viewVisit.repName}</p></div>
              <div><span className="text-sm text-muted-foreground">Doctor/KOL</span><p className="font-medium">{viewVisit.doctorName}</p></div>
              <div><span className="text-sm text-muted-foreground">Date</span><p className="font-medium">{formatDate(viewVisit.date)}</p></div>
              <div><span className="text-sm text-muted-foreground">Purpose</span><p className="font-medium">{viewVisit.purpose}</p></div>
              <div className="col-span-2"><span className="text-sm text-muted-foreground">Notes</span><p className="font-medium">{viewVisit.notes || "-"}</p></div>
              <div className="col-span-2"><span className="text-sm text-muted-foreground">Action Items</span><p className="font-medium">{viewVisit.actions || "-"}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <EntityFormModal
        open={showVisit}
        onOpenChange={(open) => { if (!open) { setShowVisit(false); setEditingVisit(null); } }}
        title={editingVisit ? "Edit Visit" : "Register BUM Visit"}
        fields={visitFields}
        initialData={editingVisit ? {
          repName: editingVisit.repName,
          doctorName: editingVisit.doctorName,
          date: editingVisit.date,
          purpose: editingVisit.purpose,
          notes: editingVisit.notes,
          actions: editingVisit.actions,
        } : undefined}
        onSubmit={(d) => {
          if (editingVisit) {
            setBumVisits(prev => prev.map(v => v.id === editingVisit.id ? {
              ...v,
              repName: d.repName as string,
              doctorName: d.doctorName as string,
              date: d.date as string,
              purpose: (d.purpose as string) || v.purpose,
              notes: (d.notes as string) || "",
              actions: (d.actions as string) || "",
            } : v));
          } else {
            setBumVisits(prev => [{
              id: `BV-${Date.now().toString(36)}`,
              repName: d.repName as string,
              doctorName: d.doctorName as string,
              date: d.date as string,
              purpose: (d.purpose as string) || "KOL Management",
              notes: (d.notes as string) || "",
              actions: (d.actions as string) || "",
            }, ...prev]);
          }
          setShowVisit(false);
          setEditingVisit(null);
        }}
      />
    </div>
  );
}
