"use client";

import { useState, useMemo } from "react";
import {
  Globe,
  Users,
  Building2,
  TrendingUp,
  ClipboardList,
  DollarSign,
  Plus,
  ChevronDown,
  ChevronRight,
  MapPin,
  Eye,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import StatusBadge from "@/components/shared/status-badge";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { useApiDataStore } from "@/lib/api/use-api-store";
import { useCurrentUser, ROLE_LABEL } from "@/lib/user-context";
import type {
  Visit,
  MarketRequest,
  Doctor,
  BusinessUnit,
  Territory,
  SalesOrder,
  Employee,
} from "@/lib/data-store";

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

function monthLabel(offset: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function monthISO(offset: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

const ROLE_BADGE_COLORS: Record<string, string> = {
  NSM: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  BUM: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  MARKETEER: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  DISTRICT_MANAGER: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  MEDICAL_REP: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

export default function NSMPage() {
  const store = useApiDataStore();
  const { user, allUsers, getReportsOf } = useCurrentUser();

  const allDoctors = store.doctors as Doctor[];
  const allVisits = store.visits as Visit[];
  const allBUs = store.businessUnits as BusinessUnit[];
  const allRequests = store.marketRequests as MarketRequest[];
  const allTerritories = store.territories as Territory[];
  const allSalesOrders = store.salesOrders as SalesOrder[];
  const allEmployees = store.employees as Employee[];

  const employeeMap = useMemo(() => {
    const m = new Map<string, Employee>();
    allEmployees.forEach((e) => m.set(e.id, e));
    return m;
  }, [allEmployees]);

  const userMap = useMemo(() => {
    const m = new Map<string, string>();
    allUsers.forEach((u) => m.set(u.id, u.name));
    allEmployees.forEach((e) => m.set(e.id, e.name));
    return m;
  }, [allUsers, allEmployees]);

  const visitsThisMonth = useMemo(
    () => allVisits.filter((v) => isThisMonth(v.dateTime)),
    [allVisits],
  );

  const approvedVisitsThisMonth = useMemo(
    () => visitsThisMonth.filter((v) => v.status === "APPROVED").length,
    [visitsThisMonth],
  );

  const visitCompliancePct = visitsThisMonth.length > 0
    ? Math.round((approvedVisitsThisMonth / visitsThisMonth.length) * 100)
    : 0;

  const fieldForceUsers = useMemo(
    () =>
      allUsers.filter(
        (u) =>
          u.role === "BUM" ||
          u.role === "MARKETEER" ||
          u.role === "DISTRICT_MANAGER" ||
          u.role === "MEDICAL_REP",
      ),
    [allUsers],
  );

  const pendingRequests = useMemo(
    () => allRequests.filter((r) => r.status === "PENDING"),
    [allRequests],
  );

  const revenueMTD = useMemo(() => {
    const prefix = thisMonthISO();
    return allSalesOrders
      .filter((so) => so.date.startsWith(prefix) && so.status !== "CANCELLED")
      .reduce((sum, so) => sum + so.total, 0);
  }, [allSalesOrders]);

  const buDoctorCounts = useMemo(() => {
    const m = new Map<string, number>();
    allDoctors.forEach((d) => {
      if (d.buId) m.set(d.buId, (m.get(d.buId) || 0) + 1);
    });
    return m;
  }, [allDoctors]);

  const buVisitCounts = useMemo(() => {
    const m = new Map<string, number>();
    visitsThisMonth.forEach((v) => {
      if (v.buId) m.set(v.buId, (m.get(v.buId) || 0) + 1);
    });
    return m;
  }, [visitsThisMonth]);

  const buTerritories = useMemo(() => {
    const m = new Map<string, Territory[]>();
    allTerritories.forEach((t) => {
      (t.assignedBUIds || []).forEach((buId) => {
        if (!m.has(buId)) m.set(buId, []);
        m.get(buId)!.push(t);
      });
    });
    return m;
  }, [allTerritories]);

  const [showCreateBU, setShowCreateBU] = useState(false);
  const buFields: EntityField[] = useMemo(
    () => [
      { name: "name", label: "Business Unit Name", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" },
      {
        name: "managerId",
        label: "Manager (BUM)",
        type: "select",
        required: true,
        options: allUsers
          .filter((u) => u.role === "BUM" || u.role === "MARKETEER" || u.role === "DISTRICT_MANAGER")
          .map((u) => ({ label: `${u.name} (${ROLE_LABEL[u.role]})`, value: u.id })),
      },
      {
        name: "memberIds",
        label: "Marketeers",
        type: "multiselect",
        options: allUsers
          .filter((u) => u.role === "MARKETEER" || u.role === "DISTRICT_MANAGER" || u.role === "MEDICAL_REP")
          .map((u) => ({ label: `${u.name} (${ROLE_LABEL[u.role]})`, value: u.id })),
      },
    ],
    [allUsers],
  );

  const bums = useMemo(
    () => allUsers.filter((u) => u.role === "BUM"),
    [allUsers],
  );

  const marketeers = useMemo(
    () => allUsers.filter((u) => u.role === "MARKETEER"),
    [allUsers],
  );

  const dms = useMemo(
    () => allUsers.filter((u) => u.role === "DISTRICT_MANAGER"),
    [allUsers],
  );

  const reps = useMemo(
    () => allUsers.filter((u) => u.role === "MEDICAL_REP"),
    [allUsers],
  );

  const [expandedBUs, setExpandedBUs] = useState<Set<string>>(new Set());
  const toggleBU = (buId: string) => {
    setExpandedBUs((prev) => {
      const next = new Set(prev);
      if (next.has(buId)) next.delete(buId);
      else next.add(buId);
      return next;
    });
  };

  const hierarchyData = useMemo(() => {
    return allBUs.map((bu) => {
      const buBums = bums.filter((b) => b.id === bu.managerId);
      const buMarketeers = marketeers.filter((m) => bu.memberIds.includes(m.id));
      const buDMs = dms.filter((dm) => bu.memberIds.includes(dm.id));
      const buReps = reps.filter((r) => bu.memberIds.includes(r.id));

      const marketeersWithTeam = buMarketeers.map((mkt) => {
        const mktDMs = getReportsOf(mkt.id)
          .filter((u) => u.role === "DISTRICT_MANAGER" && bu.memberIds.includes(u.id));
        const mktDMsWithReps = mktDMs.map((dm) => {
          const dmReps = getReportsOf(dm.id).filter((u) => u.role === "MEDICAL_REP");
          const dmDoctorCount = allDoctors.filter(
            (d) => d.assignedRepId && dmReps.some((r) => r.id === d.assignedRepId),
          ).length;
          const dmVisitCount = visitsThisMonth.filter(
            (v) => dmReps.some((r) => r.id === v.repId) || v.repId === dm.id,
          ).length;
          return {
            ...dm,
            reps: dmReps,
            doctorCount: dmDoctorCount,
            visitCount: dmVisitCount,
          };
        });
        const mktRepIds = mktDMsWithReps.flatMap((dm) => dm.reps.map((r) => r.id));
        const mktDMIds = mktDMs.map((dm) => dm.id);
        const mktDoctorCount = allDoctors.filter(
          (d) =>
            d.assignedRepId &&
            (mktRepIds.includes(d.assignedRepId) || mktDMIds.includes(d.assignedRepId)),
        ).length;
        const mktVisitCount = visitsThisMonth.filter(
          (v) => mktRepIds.includes(v.repId) || mktDMIds.includes(v.repId),
        ).length;
        return {
          ...mkt,
          dms: mktDMsWithReps,
          doctorCount: mktDoctorCount,
          visitCount: mktVisitCount,
        };
      });

      return {
        bu,
        bums: buBums,
        marketeers: marketeersWithTeam,
        allDMs: buDMs,
        allReps: buReps,
      };
    });
  }, [allBUs, bums, marketeers, dms, reps, getReportsOf, allDoctors, visitsThisMonth]);

  const buKPIData = useMemo(() => {
    return allBUs.map((bu) => {
      const doctorCount = buDoctorCounts.get(bu.id) || 0;
      const visitCount = buVisitCounts.get(bu.id) || 0;
      const buVisitsAll = visitsThisMonth.filter((v) => v.buId === bu.id);
      const buApproved = buVisitsAll.filter((v) => v.status === "APPROVED").length;
      const compliance = buVisitsAll.length > 0 ? Math.round((buApproved / buVisitsAll.length) * 100) : 0;

      const productCountMap = new Map<string, number>();
      allVisits
        .filter((v) => v.buId === bu.id)
        .forEach((v) => {
          v.productIds.forEach((pid) => {
            productCountMap.set(pid, (productCountMap.get(pid) || 0) + 1);
          });
        });
      const topProducts = [...productCountMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([pid]) => {
          const prod = (store.products as Array<{ id: string; name: string }>).find((p) => p.id === pid);
          return prod?.name || pid;
        });

      const buRevenue = allSalesOrders
        .filter((so) => so.date.startsWith(thisMonthISO()) && so.status !== "CANCELLED")
        .reduce((sum, so) => sum + so.total, 0);

      return {
        id: bu.id,
        name: bu.name,
        manager: userMap.get(bu.managerId || "") || "-",
        doctorCount,
        visitCount,
        compliance: `${compliance}%`,
        complianceNum: compliance,
        topProducts: topProducts.length > 0 ? topProducts.join(", ") : "-",
        revenue: buRevenue,
        revenueDisplay: formatCurrency(buRevenue),
      };
    });
  }, [allBUs, buDoctorCounts, buVisitCounts, visitsThisMonth, allVisits, allSalesOrders, store.products, userMap]);

  const kpiTotals = useMemo(() => {
    const totals = buKPIData.reduce(
      (acc, row) => ({
        doctorCount: acc.doctorCount + row.doctorCount,
        visitCount: acc.visitCount + row.visitCount,
        revenue: acc.revenue + row.revenue,
      }),
      { doctorCount: 0, visitCount: 0, revenue: 0 },
    );
    return totals;
  }, [buKPIData]);

  const visitTrend = useMemo(() => {
    const months: { label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const prefix = monthISO(i);
      const count = allVisits.filter((v) => v.dateTime.startsWith(prefix)).length;
      months.push({ label: monthLabel(i), count });
    }
    return months;
  }, [allVisits]);

  const maxVisitTrend = Math.max(...visitTrend.map((m) => m.count), 1);

  const [approvalFilters, setApprovalFilters] = useState<FilterState>({ _search: "", status: "" });
  const filteredRequests = useMemo(() => {
    return pendingRequests.filter((r) => {
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
  }, [pendingRequests, approvalFilters, userMap]);

  const [viewRequest, setViewRequest] = useState<MarketRequest | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);

  const assignedTerritoryBUIds = useMemo(() => {
    const assigned = new Set<string>();
    allTerritories.forEach((t) => {
      if (t.assignedBUIds && t.assignedBUIds.length > 0) assigned.add(t.id);
    });
    return assigned;
  }, [allTerritories]);

  const assignedTerritoryCount = assignedTerritoryBUIds.size;
  const unassignedTerritoryCount = allTerritories.length - assignedTerritoryCount;

  const territoryCoverage = useMemo(() => {
    return allTerritories.map((t) => {
      const buNames = (t.assignedBUIds || [])
        .map((buId) => allBUs.find((bu) => bu.id === buId)?.name || buId)
        .join(", ");
      const doctorCount = allDoctors.filter((d) => d.brickId === t.id).length;
      const repCount = (t.assignedRepIds || []).length;
      return {
        id: t.id,
        name: t.name,
        level: t.level,
        assignedBU: buNames || "Unassigned",
        doctorCount,
        repCount,
        imsCode: t.imsCode,
      };
    });
  }, [allTerritories, allBUs, allDoctors]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="National Sales Manager Dashboard"
        description="Full CRM visibility across all business units, field force, and territories"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatsCard
          icon={Users}
          title="Total Doctors"
          value={allDoctors.length}
          subtitle={`${allDoctors.filter((d) => d.isKOL).length} KOLs`}
          iconColor="bg-blue-100 text-blue-700"
        />
        <StatsCard
          icon={Building2}
          title="Active Business Units"
          value={allBUs.length}
          subtitle={`${bums.length} BUMs assigned`}
          iconColor="bg-amber-100 text-amber-700"
        />
        <StatsCard
          icon={TrendingUp}
          title="Visit Compliance"
          value={`${visitCompliancePct}%`}
          subtitle={`${visitsThisMonth.length} visits this month`}
          iconColor="bg-green-100 text-green-700"
        />
        <StatsCard
          icon={Globe}
          title="Total Field Force"
          value={fieldForceUsers.length}
          subtitle={`${bums.length} BUM, ${dms.length} DM, ${reps.length} Rep`}
          iconColor="bg-purple-100 text-purple-700"
        />
        <StatsCard
          icon={ClipboardList}
          title="Pending Requests"
          value={pendingRequests.length}
          subtitle="Awaiting approval"
          iconColor="bg-red-100 text-red-700"
        />
        <StatsCard
          icon={DollarSign}
          title="Revenue MTD"
          value={formatCurrency(revenueMTD)}
          subtitle="From sales orders"
          iconColor="bg-emerald-100 text-emerald-700"
        />
      </div>

      <Tabs defaultValue="bu-overview">
        <TabsList>
          <TabsTrigger value="bu-overview">Business Unit Overview</TabsTrigger>
          <TabsTrigger value="hierarchy">Field Force Hierarchy</TabsTrigger>
          <TabsTrigger value="kpis">National KPIs</TabsTrigger>
          <TabsTrigger value="approvals">
            Pending Approvals
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-[10px]">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="territories">Territory Coverage</TabsTrigger>
        </TabsList>

        <TabsContent value="bu-overview">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowCreateBU(true)}>
                <Plus className="mr-2 h-4 w-4" />Create Business Unit
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {allBUs.map((bu) => {
                const managerName = userMap.get(bu.managerId || "") || "Unassigned";
                const doctorCount = buDoctorCounts.get(bu.id) || 0;
                const visitCount = buVisitCounts.get(bu.id) || 0;
                const territories = buTerritories.get(bu.id) || [];
                return (
                  <Card key={bu.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{bu.name}</CardTitle>
                        {bu.color && (
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: bu.color }}
                          />
                        )}
                      </div>
                      <CardDescription>Manager: {managerName}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Doctors</span>
                          <span className="font-semibold">{doctorCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Visits (this month)</span>
                          <span className="font-semibold">{visitCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Team members</span>
                          <span className="font-semibold">{bu.memberIds.length}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Territories: </span>
                          {territories.length > 0 ? (
                            <span className="flex flex-wrap gap-1 mt-1">
                              {territories.slice(0, 3).map((t) => (
                                <Badge key={t.id} variant="secondary" className="text-xs">
                                  {t.name}
                                </Badge>
                              ))}
                              {territories.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{territories.length - 3}
                                </Badge>
                              )}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {allBUs.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  No business units created yet. Click &quot;Create Business Unit&quot; to add one.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="hierarchy">
          <Card>
            <CardHeader>
              <CardTitle>Field Force Hierarchy</CardTitle>
              <CardDescription>NSM &rarr; BUM &rarr; Marketeer &rarr; DM &rarr; Medical Rep</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border p-4 bg-purple-50 dark:bg-purple-900/10">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-purple-600" />
                  <span className="font-semibold">{user.name}</span>
                  <Badge className={ROLE_BADGE_COLORS.NSM}>NSM</Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {allDoctors.length} doctors | {visitsThisMonth.length} visits this month
                </div>
              </div>

              {hierarchyData.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No business units or team members found.
                </div>
              )}

              {hierarchyData.map((buGroup) => (
                <div key={buGroup.bu.id} className="ml-6 mt-4 border-l-2 border-amber-300 pl-4">
                  <button
                    className="flex items-center gap-2 w-full text-left"
                    onClick={() => toggleBU(buGroup.bu.id)}
                  >
                    {expandedBUs.has(buGroup.bu.id) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="rounded-lg border p-3 bg-amber-50 dark:bg-amber-900/10 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {buGroup.bums[0]?.name || "No Manager"}
                        </span>
                        <Badge className={ROLE_BADGE_COLORS.BUM}>BUM</Badge>
                        <span className="text-xs text-muted-foreground">- {buGroup.bu.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {buDoctorCounts.get(buGroup.bu.id) || 0} doctors | {buVisitCounts.get(buGroup.bu.id) || 0} visits
                      </div>
                    </div>
                  </button>

                  {expandedBUs.has(buGroup.bu.id) && (
                    <div className="mt-2 space-y-2">
                      {buGroup.marketeers.length > 0 ? (
                        buGroup.marketeers.map((mkt) => (
                          <div key={mkt.id} className="ml-6 border-l-2 border-sky-300 pl-4 space-y-2">
                            <div className="rounded-lg border p-3 bg-sky-50 dark:bg-sky-900/10">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{mkt.name}</span>
                                <Badge className={ROLE_BADGE_COLORS.MARKETEER}>Marketeer</Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {mkt.doctorCount} doctors | {mkt.visitCount} visits
                              </div>
                            </div>

                            {mkt.dms.map((dm) => (
                              <div key={dm.id} className="ml-6 border-l-2 border-blue-300 pl-4 space-y-2">
                                <div className="rounded-lg border p-2 bg-blue-50 dark:bg-blue-900/10">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{dm.name}</span>
                                    <Badge className={ROLE_BADGE_COLORS.DISTRICT_MANAGER}>DM</Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {dm.doctorCount} doctors | {dm.visitCount} visits
                                  </div>
                                </div>

                                {dm.reps.length > 0 && (
                                  <div className="ml-6 border-l-2 border-green-300 pl-4 grid gap-2 md:grid-cols-2">
                                    {dm.reps.map((rep) => {
                                      const repDoctorCount = allDoctors.filter(
                                        (d) => d.assignedRepId === rep.id,
                                      ).length;
                                      const repVisitCount = visitsThisMonth.filter(
                                        (v) => v.repId === rep.id,
                                      ).length;
                                      return (
                                        <div key={rep.id} className="rounded border p-2 text-sm bg-green-50 dark:bg-green-900/10">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">{rep.name}</span>
                                            <Badge className={ROLE_BADGE_COLORS.MEDICAL_REP}>Rep</Badge>
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {repDoctorCount} doctors | {repVisitCount} visits
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ))
                      ) : (
                        buGroup.allDMs.length > 0 && buGroup.allDMs.map((dm) => {
                          const dmReps = getReportsOf(dm.id).filter((u) => u.role === "MEDICAL_REP");
                          const dmDoctorCount = allDoctors.filter(
                            (d) => d.assignedRepId && dmReps.some((r) => r.id === d.assignedRepId),
                          ).length;
                          const dmVisitCount = visitsThisMonth.filter(
                            (v) => dmReps.some((r) => r.id === v.repId) || v.repId === dm.id,
                          ).length;
                          return (
                            <div key={dm.id} className="ml-6 border-l-2 border-blue-300 pl-4 space-y-2">
                              <div className="rounded-lg border p-2 bg-blue-50 dark:bg-blue-900/10">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{dm.name}</span>
                                  <Badge className={ROLE_BADGE_COLORS.DISTRICT_MANAGER}>DM</Badge>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {dmDoctorCount} doctors | {dmVisitCount} visits
                                </div>
                              </div>
                              {dmReps.length > 0 && (
                                <div className="ml-6 border-l-2 border-green-300 pl-4 grid gap-2 md:grid-cols-2">
                                  {dmReps.map((rep) => {
                                    const repDoctorCount = allDoctors.filter(
                                      (d) => d.assignedRepId === rep.id,
                                    ).length;
                                    const repVisitCount = visitsThisMonth.filter(
                                      (v) => v.repId === rep.id,
                                    ).length;
                                    return (
                                      <div key={rep.id} className="rounded border p-2 text-sm bg-green-50 dark:bg-green-900/10">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{rep.name}</span>
                                          <Badge className={ROLE_BADGE_COLORS.MEDICAL_REP}>Rep</Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {repDoctorCount} doctors | {repVisitCount} visits
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kpis">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Business Unit Performance</CardTitle>
                <CardDescription>National KPIs across all business units</CardDescription>
              </CardHeader>
              <CardContent>
                {buKPIData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No business unit data available.
                  </div>
                ) : (
                  <>
                    <DataTable
                      columns={[
                        {
                          key: "name",
                          label: "Business Unit",
                          render: (v) => <span className="font-medium">{v as string}</span>,
                        },
                        { key: "manager", label: "Manager" },
                        { key: "doctorCount", label: "Doctors" },
                        { key: "visitCount", label: "Visits (Month)" },
                        {
                          key: "compliance",
                          label: "Compliance %",
                          render: (_v, row) => {
                            const r = row as unknown as (typeof buKPIData)[0];
                            return (
                              <span
                                className={
                                  r.complianceNum >= 80
                                    ? "text-green-600 font-semibold"
                                    : r.complianceNum >= 50
                                    ? "text-amber-600 font-semibold"
                                    : "text-red-600 font-semibold"
                                }
                              >
                                {r.compliance}
                              </span>
                            );
                          },
                        },
                        { key: "topProducts", label: "Top Products", className: "max-w-xs truncate" },
                        {
                          key: "revenueDisplay",
                          label: "Revenue",
                          render: (v) => <span className="font-semibold">{v as string}</span>,
                        },
                      ] as Column<Record<string, unknown>>[]}
                      data={buKPIData as unknown as Record<string, unknown>[]}
                      exportable
                      exportFilename="crm-nsm-bu-kpis.csv"
                      emptyMessage="No data."
                    />
                    <div className="mt-4 rounded-lg border p-4 bg-muted/50">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Total Doctors</span>
                          <p className="text-lg font-bold">{kpiTotals.doctorCount}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Visits (Month)</span>
                          <p className="text-lg font-bold">{kpiTotals.visitCount}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Revenue</span>
                          <p className="text-lg font-bold">{formatCurrency(kpiTotals.revenue)}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Visit Trend (Last 6 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-48">
                  {visitTrend.map((month) => (
                    <div key={month.label} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-semibold">{month.count}</span>
                      <div
                        className="w-full bg-blue-500 rounded-t transition-all"
                        style={{
                          height: `${(month.count / maxVisitTrend) * 100}%`,
                          minHeight: month.count > 0 ? "4px" : "0px",
                        }}
                      />
                      <span className="text-xs text-muted-foreground">{month.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>
                {pendingRequests.length > 0
                  ? `${pendingRequests.length} request${pendingRequests.length !== 1 ? "s" : ""} awaiting approval`
                  : "All requests handled"}
              </CardDescription>
              <FilterBar
                searchValue={approvalFilters._search}
                onSearchChange={(v) => setApprovalFilters((f) => ({ ...f, _search: v }))}
                fields={[
                  {
                    key: "status",
                    label: "Status",
                    type: "select",
                    options: [
                      { label: "Pending", value: "PENDING" },
                      { label: "Approved", value: "APPROVED" },
                      { label: "Rejected", value: "REJECTED" },
                      { label: "Fulfilled", value: "FULFILLED" },
                    ],
                  },
                ]}
                values={approvalFilters}
                onChange={(k, v) => setApprovalFilters((f) => ({ ...f, [k]: v }))}
              />
            </CardHeader>
            <CardContent>
              {filteredRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No pending requests to display.
                </div>
              ) : (
                <DataTable
                  columns={[
                    {
                      key: "id",
                      label: "Request#",
                      render: (v) => <span className="font-mono text-xs">{v as string}</span>,
                    },
                    { key: "description", label: "Title", className: "max-w-xs truncate" },
                    { key: "type", label: "Type" },
                    {
                      key: "requestedById",
                      label: "Requestor",
                      render: (v) => <span>{userMap.get(v as string) ?? (v as string)}</span>,
                    },
                    {
                      key: "priority",
                      label: "Level",
                      render: (v) => <StatusBadge status={v as string} />,
                    },
                    {
                      key: "amount",
                      label: "Amount",
                      render: (v) => <span>{v ? formatCurrency(v as number) : "-"}</span>,
                    },
                    {
                      key: "_actions",
                      label: "Actions",
                      render: (_v, row) => {
                        const r = row as unknown as MarketRequest;
                        return (
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setViewRequest(r)}>
                              <Eye className="h-4 w-4 mr-1" />View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => {
                                store.update("marketRequests", r.id, {
                                  status: "APPROVED",
                                  approvedById: user.id,
                                  approvedAt: new Date().toISOString(),
                                });
                              }}
                            >
                              <Check className="h-4 w-4 mr-1" />Approve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setRejectingRequestId(r.id);
                                setRejectReason("");
                                setRejectDialogOpen(true);
                              }}
                            >
                              <X className="h-4 w-4 mr-1" />Reject
                            </Button>
                          </div>
                        );
                      },
                    },
                  ] as Column<Record<string, unknown>>[]}
                  data={filteredRequests as unknown as Record<string, unknown>[]}
                  exportable
                  exportFilename="crm-nsm-pending-approvals.csv"
                  emptyMessage="No pending requests."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="territories">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg p-2 bg-blue-100 text-blue-700">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{allTerritories.length}</p>
                      <p className="text-sm text-muted-foreground">Total Territories</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg p-2 bg-green-100 text-green-700">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{assignedTerritoryCount}</p>
                      <p className="text-sm text-muted-foreground">Assigned to BUs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg p-2 bg-red-100 text-red-700">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{unassignedTerritoryCount}</p>
                      <p className="text-sm text-muted-foreground">Unassigned</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Territory Coverage Details</CardTitle>
              </CardHeader>
              <CardContent>
                {territoryCoverage.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No territories defined.
                  </div>
                ) : (
                  <DataTable
                    columns={[
                      {
                        key: "name",
                        label: "Territory",
                        render: (v) => <span className="font-medium">{v as string}</span>,
                      },
                      {
                        key: "level",
                        label: "Level",
                        render: (v) => <Badge variant="outline" className="capitalize">{v as string}</Badge>,
                      },
                      {
                        key: "assignedBU",
                        label: "Assigned BU",
                        render: (v) => {
                          const val = v as string;
                          return val === "Unassigned" ? (
                            <span className="text-red-500 text-sm">{val}</span>
                          ) : (
                            <span>{val}</span>
                          );
                        },
                      },
                      { key: "doctorCount", label: "Doctors" },
                      { key: "repCount", label: "Reps" },
                      { key: "imsCode", label: "IMS Code" },
                    ] as Column<Record<string, unknown>>[]}
                    data={territoryCoverage as unknown as Record<string, unknown>[]}
                    exportable
                    exportFilename="crm-nsm-territory-coverage.csv"
                    emptyMessage="No territories."
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!viewRequest} onOpenChange={(open) => { if (!open) setViewRequest(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewRequest?.id} - Market Request Details</DialogTitle>
          </DialogHeader>
          {viewRequest && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <span className="text-sm text-muted-foreground">Request ID</span>
                <p className="font-medium">{viewRequest.id}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Type</span>
                <p className="font-medium">{viewRequest.type}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Requestor</span>
                <p className="font-medium">{userMap.get(viewRequest.requestedById) ?? viewRequest.requestedById}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Priority</span>
                <p><StatusBadge status={viewRequest.priority} /></p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Status</span>
                <p><StatusBadge status={viewRequest.status} /></p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Amount</span>
                <p className="font-medium">{viewRequest.amount ? formatCurrency(viewRequest.amount) : "-"}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Date</span>
                <p className="font-medium">{formatDate(viewRequest.createdAt)}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Quantity</span>
                <p className="font-medium">{viewRequest.quantity ?? "-"}</p>
              </div>
              <div className="col-span-2">
                <span className="text-sm text-muted-foreground">Description</span>
                <p className="font-medium">{viewRequest.description}</p>
              </div>
              {viewRequest.rejectionReason && (
                <div className="col-span-2">
                  <span className="text-sm text-muted-foreground">Rejection Reason</span>
                  <p className="font-medium text-red-600">{viewRequest.rejectionReason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <EntityFormModal
        open={showCreateBU}
        onOpenChange={(open) => { if (!open) setShowCreateBU(false); }}
        title="Create Business Unit"
        description="Add a new business unit to the organization"
        fields={buFields}
        onSubmit={(d) => {
          store.add("businessUnits", {
            id: `bu-${Date.now().toString(36)}`,
            name: d.name as string,
            code: (d.name as string).substring(0, 3).toUpperCase(),
            description: (d.description as string) || "",
            managerId: (d.managerId as string) || null,
            productIds: [],
            memberIds: (d.memberIds as string[]) || [],
            color: "#6366f1",
            createdAt: new Date().toISOString(),
          });
          setShowCreateBU(false);
        }}
        submitLabel="Create"
      />

      <Dialog open={rejectDialogOpen} onOpenChange={(open) => { if (!open) { setRejectDialogOpen(false); setRejectingRequestId(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason for Rejection</Label>
              <Textarea
                id="reject-reason"
                placeholder="Enter the reason for rejecting this request..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialogOpen(false); setRejectingRequestId(null); setRejectReason(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={() => {
                if (rejectingRequestId && rejectReason.trim()) {
                  store.update("marketRequests", rejectingRequestId, {
                    status: "REJECTED",
                    rejectionReason: rejectReason.trim(),
                    approvedById: user.id,
                  });
                  setRejectDialogOpen(false);
                  setRejectingRequestId(null);
                  setRejectReason("");
                }
              }}
            >
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
