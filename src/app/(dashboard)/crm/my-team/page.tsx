"use client";

import { useMemo, useState } from "react";
import {
  Users,
  ChevronDown,
  ChevronRight,
  Activity,
  MapPin,
  ClipboardList,
  Target,
  Calendar,
  Stethoscope,
  BarChart3,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  UserCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { useApiDataStore } from "@/lib/api/use-api-store";
import { useCurrentUser, ROLE_LABEL, type AppUser } from "@/lib/user-context";
import { useTranslation } from "@/lib/i18n/i18n-context";
import type {
  Visit,
  WeeklyPlan,
  MarketRequest,
  Doctor,
  KPIRecord,
} from "@/lib/data-store";

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function thisMonthISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isThisMonth(iso: string): boolean {
  return iso.startsWith(thisMonthISO());
}

const roleBadgeColor: Record<string, string> = {
  DISTRICT_MANAGER: "bg-blue-100 text-blue-700 border-blue-200",
  MEDICAL_REP: "bg-emerald-100 text-emerald-700 border-emerald-200",
  BUM: "bg-purple-100 text-purple-700 border-purple-200",
};

// ─── Per-member computed stats ──────────────────────────────────────────────

interface MemberStats {
  user: AppUser;
  visitsThisMonth: Visit[];
  allVisits: Visit[];
  activePlans: WeeklyPlan[];
  allPlans: WeeklyPlan[];
  pendingRequests: MarketRequest[];
  allRequests: MarketRequest[];
  doctors: Doctor[];
  kpis: KPIRecord[];
  visitCountThisMonth: number;
  planCompliancePct: number;
  doctorCoverage: number;
}

function computeMemberStats(
  member: AppUser,
  visits: Visit[],
  plans: WeeklyPlan[],
  requests: MarketRequest[],
  doctors: Doctor[],
  kpis: KPIRecord[]
): MemberStats {
  const memberVisits = visits.filter((v) => v.repId === member.id);
  const visitsThisMonth = memberVisits.filter((v) => isThisMonth(v.dateTime));
  const memberPlans = plans.filter((p) => p.repId === member.id);
  const activePlans = memberPlans.filter(
    (p) => p.status === "SUBMITTED" || p.status === "APPROVED"
  );
  const memberRequests = requests.filter((r) => r.requestedById === member.id);
  const pendingRequests = memberRequests.filter((r) => r.status === "PENDING");
  const memberDoctors = doctors.filter((d) => d.assignedRepId === member.id);
  const memberKpis = kpis.filter((k) => k.userId === member.id);

  // Plan compliance: approved visits / total visits this month
  const approvedThisMonth = visitsThisMonth.filter(
    (v) => v.status === "APPROVED"
  ).length;
  const planCompliancePct =
    visitsThisMonth.length > 0
      ? Math.round((approvedThisMonth / visitsThisMonth.length) * 100)
      : 0;

  // Doctor coverage: doctors visited this month / total assigned doctors
  const visitedDoctorIds = new Set(
    visitsThisMonth.map((v) => v.doctorId)
  );
  const doctorCoverage =
    memberDoctors.length > 0
      ? Math.round((visitedDoctorIds.size / memberDoctors.length) * 100)
      : 0;

  return {
    user: member,
    visitsThisMonth,
    allVisits: memberVisits,
    activePlans,
    allPlans: memberPlans,
    pendingRequests,
    allRequests: memberRequests,
    doctors: memberDoctors,
    kpis: memberKpis,
    visitCountThisMonth: visitsThisMonth.length,
    planCompliancePct,
    doctorCoverage,
  };
}

// ─── Grouped hierarchy types ────────────────────────────────────────────────

interface DMGroup {
  dm: AppUser;
  dmStats: MemberStats;
  reps: MemberStats[];
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function MyTeamPage() {
  const store = useApiDataStore();
  const { user, allUsers, getReportsOf } = useCurrentUser();
  const { t } = useTranslation();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<Record<string, string>>({});

  // ── Gather all reports ──────────────────────────────────────────────────
  const directReports = useMemo(() => {
    if (user.role === "ADMIN") {
      return allUsers.filter(
        (u) => u.role === "DISTRICT_MANAGER" || u.role === "MEDICAL_REP"
      );
    }
    return getReportsOf(user.id);
  }, [user, allUsers, getReportsOf]);

  const dms = useMemo(
    () => directReports.filter((u) => u.role === "DISTRICT_MANAGER"),
    [directReports]
  );

  const allReps = useMemo(
    () => directReports.filter((u) => u.role === "MEDICAL_REP"),
    [directReports]
  );

  // Build hierarchy: group reps under their DM
  const { dmGroups, unattachedReps } = useMemo(() => {
    const groups: DMGroup[] = [];
    const attachedRepIds = new Set<string>();

    for (const dm of dms) {
      const dmReps = getReportsOf(dm.id).filter(
        (u) => u.role === "MEDICAL_REP"
      );
      const dmStats = computeMemberStats(
        dm,
        store.visits as Visit[],
        store.weeklyPlans as WeeklyPlan[],
        store.marketRequests as MarketRequest[],
        store.doctors as Doctor[],
        store.kpis as KPIRecord[]
      );
      const repStats = dmReps.map((rep) => {
        attachedRepIds.add(rep.id);
        return computeMemberStats(
          rep,
          store.visits as Visit[],
          store.weeklyPlans as WeeklyPlan[],
          store.marketRequests as MarketRequest[],
          store.doctors as Doctor[],
          store.kpis as KPIRecord[]
        );
      });
      groups.push({ dm, dmStats, reps: repStats });
    }

    const unattached = allReps
      .filter((r) => !attachedRepIds.has(r.id))
      .map((rep) =>
        computeMemberStats(
          rep,
          store.visits as Visit[],
          store.weeklyPlans as WeeklyPlan[],
          store.marketRequests as MarketRequest[],
          store.doctors as Doctor[],
          store.kpis as KPIRecord[]
        )
      );

    return { dmGroups: groups, unattachedReps: unattached };
  }, [dms, allReps, getReportsOf, store.visits, store.weeklyPlans, store.marketRequests, store.doctors, store.kpis]);

  // ── Aggregate stats ─────────────────────────────────────────────────────
  const totalMembers = dms.length + allReps.length;
  const totalVisitsThisMonth = useMemo(() => {
    const allMemberIds = new Set([
      ...dms.map((d) => d.id),
      ...allReps.map((r) => r.id),
    ]);
    return (store.visits as Visit[]).filter(
      (v) => allMemberIds.has(v.repId) && isThisMonth(v.dateTime)
    ).length;
  }, [dms, allReps, store.visits]);

  const totalActivePlans = useMemo(() => {
    const allMemberIds = new Set([
      ...dms.map((d) => d.id),
      ...allReps.map((r) => r.id),
    ]);
    return (store.weeklyPlans as WeeklyPlan[]).filter(
      (p) =>
        allMemberIds.has(p.repId) &&
        (p.status === "SUBMITTED" || p.status === "APPROVED")
    ).length;
  }, [dms, allReps, store.weeklyPlans]);

  const totalPendingRequests = useMemo(() => {
    const allMemberIds = new Set([
      ...dms.map((d) => d.id),
      ...allReps.map((r) => r.id),
    ]);
    return (store.marketRequests as MarketRequest[]).filter(
      (r) => allMemberIds.has(r.requestedById) && r.status === "PENDING"
    ).length;
  }, [dms, allReps, store.marketRequests]);

  // ── Toggle expand ───────────────────────────────────────────────────────
  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function getDetailTab(userId: string): string {
    return activeTab[userId] ?? "visits";
  }

  function setDetailTab(userId: string, tab: string) {
    setActiveTab((prev) => ({ ...prev, [userId]: tab }));
  }

  // ── Doctor name lookup ──────────────────────────────────────────────────
  const doctorMap = useMemo(() => {
    const m = new Map<string, string>();
    (store.doctors as Doctor[]).forEach((d) => m.set(d.id, d.name));
    return m;
  }, [store.doctors]);

  // ── Render helpers ──────────────────────────────────────────────────────

  function renderSummaryRow(stats: MemberStats, indent: boolean = false) {
    const isExpanded = expandedIds.has(stats.user.id);
    return (
      <button
        type="button"
        onClick={() => toggleExpanded(stats.user.id)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors ${
          indent ? "pl-10" : ""
        } ${isExpanded ? "bg-muted/30" : ""}`}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}

        <UserCircle className="h-5 w-5 shrink-0 text-muted-foreground" />

        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm">{stats.user.name}</span>
        </div>

        <Badge
          className={`text-[10px] ${
            roleBadgeColor[stats.user.role] ?? ""
          }`}
          variant="outline"
        >
          {ROLE_LABEL[stats.user.role]}
        </Badge>

        {stats.user.territory && (
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {stats.user.territory}
          </span>
        )}

        <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1" title="Visits this month">
            <Activity className="h-3 w-3" />
            {stats.visitCountThisMonth}
          </span>
          <span className="flex items-center gap-1" title="Plan compliance">
            <Target className="h-3 w-3" />
            {stats.planCompliancePct}%
          </span>
          <span className="flex items-center gap-1" title="Doctor coverage">
            <Stethoscope className="h-3 w-3" />
            {stats.doctorCoverage}%
          </span>
        </div>
      </button>
    );
  }

  function renderExpandedDetail(stats: MemberStats) {
    if (!expandedIds.has(stats.user.id)) return null;

    const tab = getDetailTab(stats.user.id);
    const recentVisits = [...stats.allVisits]
      .sort(
        (a, b) =>
          new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
      )
      .slice(0, 10);

    return (
      <div className="border-t bg-muted/10 px-4 py-4 space-y-4">
        {/* Quick stat chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
            <Activity className="h-3.5 w-3.5 text-blue-500" />
            <div>
              <p className="text-muted-foreground">{t("myTeam.visitsMonth")}</p>
              <p className="font-semibold">{stats.visitCountThisMonth}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
            <Calendar className="h-3.5 w-3.5 text-purple-500" />
            <div>
              <p className="text-muted-foreground">{t("myTeam.activePlans")}</p>
              <p className="font-semibold">{stats.activePlans.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
            <Target className="h-3.5 w-3.5 text-amber-500" />
            <div>
              <p className="text-muted-foreground">{t("myTeam.compliance")}</p>
              <p className="font-semibold">{stats.planCompliancePct}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
            <Stethoscope className="h-3.5 w-3.5 text-emerald-500" />
            <div>
              <p className="text-muted-foreground">{t("myTeam.doctors")}</p>
              <p className="font-semibold">{stats.doctors.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
            <ClipboardList className="h-3.5 w-3.5 text-red-500" />
            <div>
              <p className="text-muted-foreground">{t("myTeam.pendingReq")}</p>
              <p className="font-semibold">{stats.pendingRequests.length}</p>
            </div>
          </div>
        </div>

        {/* Tabs for detail sections */}
        <Tabs
          value={tab}
          onValueChange={(v) => setDetailTab(stats.user.id, v)}
        >
          <TabsList className="h-8">
            <TabsTrigger value="visits" className="text-xs h-7">
              <MapPin className="h-3 w-3 mr-1" />
              {t("tab.recentVisits")}
            </TabsTrigger>
            <TabsTrigger value="plans" className="text-xs h-7">
              <Calendar className="h-3 w-3 mr-1" />
              {t("tab.weeklyPlans")}
            </TabsTrigger>
            <TabsTrigger value="requests" className="text-xs h-7">
              <ClipboardList className="h-3 w-3 mr-1" />
              {t("tab.marketRequests")}
            </TabsTrigger>
            <TabsTrigger value="kpis" className="text-xs h-7">
              <BarChart3 className="h-3 w-3 mr-1" />
              {t("tab.kpis")}
            </TabsTrigger>
          </TabsList>

          {/* Visits tab */}
          <TabsContent value="visits" className="mt-3">
            {recentVisits.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("empty.noVisits")}
              </p>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground">
                      <th className="text-left px-3 py-2 font-medium">
                        {t("table.doctor")}
                      </th>
                      <th className="text-left px-3 py-2 font-medium">{t("table.date")}</th>
                      <th className="text-left px-3 py-2 font-medium">
                        {t("table.status")}
                      </th>
                      <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">
                        {t("table.notes")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentVisits.map((v) => (
                      <tr
                        key={v.id}
                        className="border-t hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-3 py-2 font-medium">
                          {doctorMap.get(v.doctorId) ?? v.doctorId}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatDate(v.dateTime)}
                        </td>
                        <td className="px-3 py-2">
                          <VisitStatusBadge status={v.status} />
                        </td>
                        <td className="px-3 py-2 text-muted-foreground max-w-[200px] truncate hidden sm:table-cell">
                          {v.notes || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Weekly Plans tab */}
          <TabsContent value="plans" className="mt-3">
            {stats.allPlans.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("empty.noWeeklyPlans")}
              </p>
            ) : (
              <div className="space-y-2">
                {[...stats.allPlans]
                  .sort(
                    (a, b) =>
                      new Date(b.weekStartDate).getTime() -
                      new Date(a.weekStartDate).getTime()
                  )
                  .slice(0, 6)
                  .map((plan) => {
                    const totalPlannedVisits = plan.days.reduce(
                      (sum, d) => sum + d.visits.length,
                      0
                    );
                    return (
                      <div
                        key={plan.id}
                        className="flex items-center justify-between border rounded-lg px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium">
                            Week of {formatDate(plan.weekStartDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {totalPlannedVisits} visits planned
                          </span>
                          <PlanStatusBadge status={plan.status} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </TabsContent>

          {/* Market Requests tab */}
          <TabsContent value="requests" className="mt-3">
            {stats.allRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("empty.noMarketRequests")}
              </p>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground">
                      <th className="text-left px-3 py-2 font-medium">{t("table.type")}</th>
                      <th className="text-left px-3 py-2 font-medium">
                        {t("table.description")}
                      </th>
                      <th className="text-left px-3 py-2 font-medium">
                        {t("table.priority")}
                      </th>
                      <th className="text-left px-3 py-2 font-medium">
                        {t("table.status")}
                      </th>
                      <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">
                        {t("table.date")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...stats.allRequests]
                      .sort(
                        (a, b) =>
                          new Date(b.createdAt).getTime() -
                          new Date(a.createdAt).getTime()
                      )
                      .slice(0, 10)
                      .map((req) => (
                        <tr
                          key={req.id}
                          className="border-t hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-3 py-2 font-medium">{req.type}</td>
                          <td className="px-3 py-2 text-muted-foreground max-w-[200px] truncate">
                            {req.description}
                          </td>
                          <td className="px-3 py-2">
                            <PriorityBadge priority={req.priority} />
                          </td>
                          <td className="px-3 py-2">
                            <RequestStatusBadge status={req.status} />
                          </td>
                          <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                            {formatDate(req.createdAt)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* KPIs tab */}
          <TabsContent value="kpis" className="mt-3">
            {stats.kpis.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("empty.noKPIs")}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {stats.kpis
                  .filter((k) => k.period === thisMonthISO())
                  .map((kpi) => {
                    const pct =
                      kpi.target > 0
                        ? Math.round((kpi.actual / kpi.target) * 100)
                        : 0;
                    return (
                      <div
                        key={kpi.id}
                        className="flex flex-col border rounded-lg px-3 py-2"
                      >
                        <span className="text-xs font-medium">
                          {kpi.metric}
                        </span>
                        <div className="flex items-end justify-between mt-1">
                          <span className="text-lg font-bold">{kpi.actual}</span>
                          <span className="text-xs text-muted-foreground">
                            / {kpi.target} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 mt-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              pct >= 80
                                ? "bg-green-500"
                                : pct >= 50
                                ? "bg-amber-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  function renderMemberCard(stats: MemberStats, indent: boolean = false) {
    return (
      <div key={stats.user.id}>
        {renderSummaryRow(stats, indent)}
        {renderExpandedDetail(stats)}
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.myTeam.title")}
        description={`${t("page.myTeam.description")}: ${dms.length} District Manager${dms.length !== 1 ? "s" : ""}, ${allReps.length} Medical Rep${allReps.length !== 1 ? "s" : ""}`}
      />

      {/* Aggregate stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={Users}
          title={t("stats.teamMembers")}
          value={totalMembers}
          subtitle={`${dms.length} DMs, ${allReps.length} Reps`}
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatsCard
          icon={Activity}
          title={t("stats.visitsThisMonth")}
          value={totalVisitsThisMonth}
          iconColor="bg-purple-100 text-purple-600"
        />
        <StatsCard
          icon={Calendar}
          title={t("stats.activePlans")}
          value={totalActivePlans}
          iconColor="bg-emerald-100 text-emerald-600"
        />
        <StatsCard
          icon={ClipboardList}
          title={t("stats.pendingRequests")}
          value={totalPendingRequests}
          iconColor="bg-amber-100 text-amber-600"
        />
      </div>

      {/* Hierarchical team list */}
      <div className="space-y-4">
        {dmGroups.map((group) => (
          <Card key={group.dm.id} className="overflow-hidden">
            {/* DM row */}
            {renderSummaryRow(group.dmStats)}
            {renderExpandedDetail(group.dmStats)}

            {/* Reps under this DM */}
            {group.reps.length > 0 && (
              <div className="border-t">
                <div className="px-4 py-1.5 bg-muted/20">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    {t("myTeam.medicalRepsUnder")} {group.dm.name} ({group.reps.length})
                  </span>
                </div>
                {group.reps.map((repStats) => (
                  <div key={repStats.user.id} className="border-t">
                    {renderMemberCard(repStats, true)}
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}

        {/* Unattached reps (not under any DM) */}
        {unattachedReps.length > 0 && (
          <Card className="overflow-hidden">
            <div className="px-4 py-2 bg-muted/30 border-b">
              <span className="text-xs font-medium text-muted-foreground">
                <Users className="h-3.5 w-3.5 inline mr-1.5" />
                {t("myTeam.directReports")} ({unattachedReps.length})
              </span>
            </div>
            {unattachedReps.map((repStats, idx) => (
              <div
                key={repStats.user.id}
                className={idx > 0 ? "border-t" : ""}
              >
                {renderMemberCard(repStats)}
              </div>
            ))}
          </Card>
        )}

        {totalMembers === 0 && (
          <Card className="p-8 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {t("empty.noTeamMembers")}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Status badge sub-components ────────────────────────────────────────────

function VisitStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  switch (status) {
    case "APPROVED":
      return (
        <Badge variant="success" className="text-[10px]">
          <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
          {t("common.approved")}
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge variant="destructive" className="text-[10px]">
          <XCircle className="h-2.5 w-2.5 mr-0.5" />
          {t("common.rejected")}
        </Badge>
      );
    default:
      return (
        <Badge variant="warning" className="text-[10px]">
          <Clock className="h-2.5 w-2.5 mr-0.5" />
          Logged
        </Badge>
      );
  }
}

function PlanStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  switch (status) {
    case "APPROVED":
      return (
        <Badge variant="success" className="text-[10px]">
          {t("common.approved")}
        </Badge>
      );
    case "SUBMITTED":
      return (
        <Badge variant="warning" className="text-[10px]">
          {t("common.submitted")}
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge variant="destructive" className="text-[10px]">
          {t("common.rejected")}
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-[10px]">
          {t("common.draft")}
        </Badge>
      );
  }
}

function RequestStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  switch (status) {
    case "APPROVED":
      return <Badge variant="success" className="text-[10px]">{t("common.approved")}</Badge>;
    case "REJECTED":
      return <Badge variant="destructive" className="text-[10px]">{t("common.rejected")}</Badge>;
    case "FULFILLED":
      return <Badge variant="default" className="text-[10px]">{t("common.fulfilled")}</Badge>;
    default:
      return <Badge variant="warning" className="text-[10px]">{t("common.pending")}</Badge>;
  }
}

function PriorityBadge({ priority }: { priority: string }) {
  const { t } = useTranslation();
  switch (priority) {
    case "URGENT":
      return <Badge variant="destructive" className="text-[10px]">{t("priority.urgent")}</Badge>;
    case "HIGH":
      return <Badge variant="warning" className="text-[10px]">{t("priority.high")}</Badge>;
    case "MEDIUM":
      return <Badge variant="secondary" className="text-[10px]">{t("priority.medium")}</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px]">{t("priority.low")}</Badge>;
  }
}
