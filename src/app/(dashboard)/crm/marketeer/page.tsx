"use client";

import { useState, useMemo } from "react";
import { Users, Target, TrendingUp, ClipboardList, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { useCurrentUser, ROLE_LABEL } from "@/lib/user-context";
import {
  scopeDoctors,
  scopeVisits,
  scopeMarketRequests,
  visibleBusinessUnits,
  type Doctor,
  type Visit,
  type MarketRequest,
  type BusinessUnit,
  type KPIRecord,
  type WeeklyPlan,
  type Product,
  type SalesOrder,
} from "@/lib/data-store";

// ─── Helpers ────────────────────────────────────────────────────────────────

function thisMonthISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isThisMonth(iso: string): boolean {
  return iso.startsWith(thisMonthISO());
}

function isLast30Days(iso: string): boolean {
  const date = new Date(iso);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  return date >= cutoff;
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

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `EGP ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `EGP ${(n / 1_000).toFixed(0)}K`;
  return `EGP ${n.toLocaleString()}`;
}

// ─── Field visit form fields ────────────────────────────────────────────────

interface FieldVisitRecord {
  id: string;
  repName: string;
  doctorName: string;
  date: string;
  purpose: string;
  observations: string;
  followUp: string;
}

const visitFields: EntityField[] = [
  { name: "repName", label: "Accompanied (DM/Rep)", type: "text", required: true },
  { name: "doctorName", label: "Doctor Visited", type: "text", required: true },
  { name: "date", label: "Date", type: "date", required: true },
  {
    name: "purpose",
    label: "Purpose",
    type: "select",
    options: [
      "KOL Engagement",
      "Coaching",
      "Strategic Account",
      "New Product Launch",
      "Performance Review",
    ].map((p) => ({ label: p, value: p })),
  },
  { name: "observations", label: "Key Observations", type: "textarea" },
  { name: "followUp", label: "Follow-up Actions", type: "textarea" },
];

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function MarketeerPage() {
  const store = useApiDataStore();
  const { user, allUsers, getReportsOf } = useCurrentUser();

  // ── Team hierarchy: DMs and Reps under this Marketeer ─────────────────
  const teamMembers = useMemo(() => getReportsOf(user.id), [getReportsOf, user.id]);
  const teamMemberIds = useMemo(() => new Set(teamMembers.map((m) => m.id)), [teamMembers]);

  const dms = useMemo(
    () => teamMembers.filter((u) => u.role === "DISTRICT_MANAGER"),
    [teamMembers]
  );
  const reps = useMemo(
    () => teamMembers.filter((u) => u.role === "MEDICAL_REP"),
    [teamMembers]
  );

  // ── Scoped store data ─────────────────────────────────────────────────
  const allBUs = store.businessUnits as BusinessUnit[];
  const myBUs = useMemo(
    () => visibleBusinessUnits(allBUs, user.role, user.id),
    [allBUs, user.role, user.id]
  );

  const allRepIds = useMemo(() => {
    const ids = teamMembers.map((m) => m.id);
    ids.push(user.id);
    return ids;
  }, [teamMembers, user.id]);

  const scopedDoctors = useMemo(
    () =>
      scopeDoctors(
        store.doctors as Doctor[],
        allBUs,
        user.role,
        user.id,
        allRepIds
      ),
    [store.doctors, allBUs, user.role, user.id, allRepIds]
  );

  const scopedVisits = useMemo(
    () =>
      scopeVisits(
        store.visits as Visit[],
        allBUs,
        user.role,
        user.id,
        allRepIds
      ),
    [store.visits, allBUs, user.role, user.id, allRepIds]
  );

  const scopedRequests = useMemo(
    () =>
      scopeMarketRequests(
        store.marketRequests as MarketRequest[],
        allBUs,
        user.role,
        user.id,
        allRepIds
      ),
    [store.marketRequests, allBUs, user.role, user.id, allRepIds]
  );

  const teamPlans = useMemo(
    () =>
      (store.weeklyPlans as WeeklyPlan[]).filter(
        (p) => teamMemberIds.has(p.repId) || p.repId === user.id
      ),
    [store.weeklyPlans, teamMemberIds, user.id]
  );

  const teamKpis = useMemo(
    () =>
      (store.kpis as KPIRecord[]).filter(
        (k) => teamMemberIds.has(k.userId) || k.userId === user.id
      ),
    [store.kpis, teamMemberIds, user.id]
  );

  // ── Computed stats ────────────────────────────────────────────────────
  const totalFieldForce = dms.length + reps.length;

  const visitsThisMonth = useMemo(
    () => scopedVisits.filter((v) => isThisMonth(v.dateTime)),
    [scopedVisits]
  );
  const approvedVisitsThisMonth = visitsThisMonth.filter((v) => v.status === "APPROVED").length;
  const visitCompliancePct =
    visitsThisMonth.length > 0
      ? Math.round((approvedVisitsThisMonth / visitsThisMonth.length) * 100)
      : 0;

  const pendingRequests = useMemo(
    () => scopedRequests.filter((r) => r.status === "PENDING"),
    [scopedRequests]
  );

  const totalDoctors = scopedDoctors.length;

  // ── Lookup maps ───────────────────────────────────────────────────────
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
  const thisMonth = thisMonthISO();
  const thisMonthKpis = useMemo(
    () => teamKpis.filter((k) => k.period === thisMonth),
    [teamKpis, thisMonth]
  );

  const dmPerformance = useMemo(() => {
    return dms.map((dm) => {
      const dmReps = getReportsOf(dm.id).filter((u) => u.role === "MEDICAL_REP");
      const dmRepIds = new Set(dmReps.map((r) => r.id));
      const dmVisitsMonth = visitsThisMonth.filter(
        (v) => dmRepIds.has(v.repId) || v.repId === dm.id
      );
      const dmApprovedMonth = dmVisitsMonth.filter((v) => v.status === "APPROVED").length;
      const dmPlans = teamPlans.filter((p) => dmRepIds.has(p.repId) || p.repId === dm.id);
      const dmApprovedPlans = dmPlans.filter((p) => p.status === "APPROVED").length;
      const dmKpis = thisMonthKpis.filter(
        (k) => dmRepIds.has(k.userId) || k.userId === dm.id
      );
      const dmKpiAvg =
        dmKpis.length > 0
          ? Math.round(
              dmKpis.reduce(
                (s, k) => s + (k.target > 0 ? (k.actual / k.target) * 100 : 0),
                0
              ) / dmKpis.length
            )
          : 0;

      const dmDoctors = scopedDoctors.filter(
        (d) =>
          d.assignedRepId != null &&
          (dmRepIds.has(d.assignedRepId) || d.assignedRepId === dm.id)
      );

      return {
        id: dm.id,
        name: dm.name,
        territory: dm.territory ?? "-",
        teamSize: dmReps.length,
        doctorCount: dmDoctors.length,
        callRate:
          dmVisitsMonth.length > 0
            ? `${Math.round((dmApprovedMonth / dmVisitsMonth.length) * 100)}%`
            : "0%",
        compliance:
          dmPlans.length > 0
            ? `${Math.round((dmApprovedPlans / dmPlans.length) * 100)}%`
            : "0%",
        visitsThisMonth: dmVisitsMonth.length,
        kpiAchievement: `${dmKpiAvg}%`,
        rating: dmKpiAvg >= 80 ? "A" : dmKpiAvg >= 50 ? "B" : "C",
      };
    });
  }, [dms, getReportsOf, visitsThisMonth, teamPlans, thisMonthKpis, scopedDoctors]);

  // ── Market request approval ───────────────────────────────────────────
  const [rejectDialogRequest, setRejectDialogRequest] = useState<MarketRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  function handleApproveRequest(req: MarketRequest) {
    store.update("marketRequests", req.id, {
      status: "APPROVED",
      approvedById: user.id,
      approvedAt: new Date().toISOString(),
    });
  }

  function handleRejectRequest() {
    if (!rejectDialogRequest) return;
    store.update("marketRequests", rejectDialogRequest.id, {
      status: "REJECTED",
      rejectionReason: rejectionReason,
    });
    setRejectDialogRequest(null);
    setRejectionReason("");
  }

  // ── Filter states ─────────────────────────────────────────────────────
  const [approvalFilters, setApprovalFilters] = useState<FilterState>({
    _search: "",
    status: "",
  });
  const [visitFilters, setVisitFilters] = useState<FilterState>({
    _search: "",
    status: "",
  });

  // ── Filtered market requests ──────────────────────────────────────────
  const filteredRequests = useMemo(() => {
    return scopedRequests.filter((r) => {
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
  }, [scopedRequests, approvalFilters, userMap]);

  // ── Field visits: real team visits from last 30 days ──────────────────
  const recentTeamVisits = useMemo(() => {
    return [...scopedVisits]
      .filter((v) => isLast30Days(v.dateTime))
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
      .map((v) => ({
        id: v.id,
        repName: userMap.get(v.repId) ?? v.repId,
        doctorName: doctorMap.get(v.doctorId) ?? v.doctorId,
        date: v.dateTime.split("T")[0],
        status: v.status,
        type: v.type,
        session: v.session,
        notes: v.notes || "-",
      }));
  }, [scopedVisits, userMap, doctorMap]);

  const filteredVisits = useMemo(() => {
    return recentTeamVisits.filter((v) => {
      if (visitFilters.status && v.status !== visitFilters.status) return false;
      if (visitFilters._search) {
        const q = visitFilters._search.toLowerCase();
        return (
          v.repName.toLowerCase().includes(q) ||
          v.doctorName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [recentTeamVisits, visitFilters]);

  // ── Custom strategic visits (Marketeer's own) ─────────────────────────
  const [mktVisits, setMktVisits] = useState<FieldVisitRecord[]>([]);
  const [editingVisit, setEditingVisit] = useState<FieldVisitRecord | null>(null);
  const [showVisit, setShowVisit] = useState(false);
  const [viewVisit, setViewVisit] = useState<FieldVisitRecord | null>(null);

  // ── Market analysis: product performance from sales orders ────────────
  const marketAnalysis = useMemo(() => {
    const myBUIds = new Set(myBUs.map((b) => b.id));
    const buProducts = (store.products as Product[]).filter(
      (p) => p.buId && myBUIds.has(p.buId)
    );
    if (buProducts.length === 0) return [];

    const orders = store.salesOrders as SalesOrder[];
    const productPerf = new Map<
      string,
      { product: Product; totalSales: number; orderCount: number }
    >();

    for (const prod of buProducts) {
      productPerf.set(prod.id, { product: prod, totalSales: 0, orderCount: 0 });
    }

    for (const order of orders) {
      if (order.status === "CANCELLED") continue;
      for (const item of order.items) {
        const entry = productPerf.get(item.productId);
        if (entry) {
          entry.totalSales += item.total;
          entry.orderCount += 1;
        }
      }
    }

    // Get KPI targets for products
    const productKpis = teamKpis.filter((k) => k.metric.toLowerCase().includes("sales"));

    return Array.from(productPerf.values())
      .map((entry) => {
        const bu = allBUs.find((b) => b.id === entry.product.buId);
        const relevantKpi = productKpis.find((k) =>
          k.metric.toLowerCase().includes(entry.product.name.toLowerCase())
        );
        const target = relevantKpi?.target ?? 0;
        const growthPct =
          target > 0
            ? Math.round(((entry.totalSales - target) / target) * 100)
            : 0;

        return {
          id: entry.product.id,
          product: entry.product.name,
          territory: bu?.name ?? "-",
          target: target > 0 ? fmtCurrency(target) : "-",
          actual: fmtCurrency(entry.totalSales),
          growth: target > 0 ? `${growthPct >= 0 ? "+" : ""}${growthPct}%` : "-",
          orders: entry.orderCount,
          unitPrice: fmtCurrency(entry.product.pricePerUnit),
        };
      })
      .sort((a, b) => {
        const aVal = parseFloat(a.actual.replace(/[^\d.]/g, "")) || 0;
        const bVal = parseFloat(b.actual.replace(/[^\d.]/g, "")) || 0;
        return bVal - aVal;
      });
  }, [store.products, store.salesOrders, myBUs, allBUs, teamKpis]);

  // ── View request detail ───────────────────────────────────────────────
  const [viewRequest, setViewRequest] = useState<MarketRequest | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Marketeer Dashboard${user.territory ? ` - ${user.territory}` : ""}`}
        description={`${ROLE_LABEL[user.role]} overview: team performance, market requests, and field activity`}
      />

      {/* ── Stats Cards ────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={Users}
          title="Total Field Force"
          value={totalFieldForce}
          subtitle={`${dms.length} DMs, ${reps.length} Reps`}
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
          icon={ClipboardList}
          title="Pending Requests"
          value={pendingRequests.length}
          subtitle={`${scopedRequests.length} total requests`}
          iconColor="bg-purple-100 text-purple-700"
        />
        <StatsCard
          icon={Target}
          title="Doctors Coverage"
          value={totalDoctors}
          subtitle={`Across ${myBUs.length} business unit${myBUs.length !== 1 ? "s" : ""}`}
          iconColor="bg-amber-100 text-amber-700"
        />
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <Tabs defaultValue="team">
        <TabsList>
          <TabsTrigger value="team">Team Overview</TabsTrigger>
          <TabsTrigger value="requests">
            Market Requests
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-[10px]">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="visits">Field Visits</TabsTrigger>
          <TabsTrigger value="analysis">Market Analysis</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Team Overview ──────────────────────────────────────── */}
        <TabsContent value="team">
          <div className="space-y-4">
            {/* DM cards */}
            {dms.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  No District Managers found in your team.
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  {dmPerformance.map((dm) => (
                    <Card key={dm.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>{dm.name}</CardTitle>
                          <StatusBadge
                            status={
                              dm.rating === "A"
                                ? "Excellent"
                                : dm.rating === "B"
                                  ? "Good"
                                  : "Needs Improvement"
                            }
                          />
                        </div>
                        <CardDescription>
                          {dm.territory}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-muted-foreground">Team Size</div>
                            <div className="font-semibold">{dm.teamSize} reps</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Doctors</div>
                            <div className="font-semibold">{dm.doctorCount}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Call Rate</div>
                            <div className="font-semibold">{dm.callRate}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Plan Compliance</div>
                            <div className="font-semibold">{dm.compliance}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Visits (Month)</div>
                            <div className="font-semibold">{dm.visitsThisMonth}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">KPI Achievement</div>
                            <div className="font-semibold">{dm.kpiAchievement}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Performance table */}
                <Card>
                  <CardHeader>
                    <CardTitle>District Manager Performance</CardTitle>
                    <CardDescription>Aggregated team metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DataTable
                      columns={
                        [
                          {
                            key: "name",
                            label: "DM Name",
                            render: (v) => (
                              <span className="font-medium">{v as string}</span>
                            ),
                          },
                          { key: "territory", label: "Territory" },
                          { key: "teamSize", label: "Team Size" },
                          { key: "visitsThisMonth", label: "Visits (Month)" },
                          { key: "callRate", label: "Call Rate" },
                          { key: "compliance", label: "Plan Compliance" },
                          {
                            key: "kpiAchievement",
                            label: "KPI Achievement",
                            render: (v) => (
                              <span className="font-semibold">{v as string}</span>
                            ),
                          },
                          {
                            key: "rating",
                            label: "Rating",
                            render: (_v, row) => {
                              const r = row as unknown as (typeof dmPerformance)[0];
                              return (
                                <StatusBadge
                                  status={
                                    r.rating === "A"
                                      ? "Excellent"
                                      : r.rating === "B"
                                        ? "Good"
                                        : "Needs Improvement"
                                  }
                                />
                              );
                            },
                          },
                        ] as Column<Record<string, unknown>>[]
                      }
                      data={dmPerformance as unknown as Record<string, unknown>[]}
                      exportable
                      exportFilename="crm-marketeer-team-performance.csv"
                      emptyMessage="No performance data available."
                    />
                  </CardContent>
                </Card>
              </>
            )}

            {/* Performance bars */}
            {dmPerformance.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>KPI Achievement by DM</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dmPerformance.map((dm) => {
                      const achievement = parseInt(dm.kpiAchievement) || 0;
                      return (
                        <div key={dm.id}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{dm.name}</span>
                            <span>{dm.kpiAchievement}</span>
                          </div>
                          <div className="h-2 w-full rounded bg-muted overflow-hidden">
                            <div
                              className={`h-full ${
                                achievement >= 80
                                  ? "bg-green-500"
                                  : achievement >= 50
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                              }`}
                              style={{ width: `${Math.min(achievement, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── Tab 2: Market Requests ────────────────────────────────────── */}
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
                onSearchChange={(v) =>
                  setApprovalFilters((f) => ({ ...f, _search: v }))
                }
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
                onChange={(k, v) =>
                  setApprovalFilters((f) => ({ ...f, [k]: v }))
                }
              />
            </CardHeader>
            <CardContent>
              {filteredRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No market requests to display.
                </div>
              ) : (
                <DataTable
                  columns={
                    [
                      {
                        key: "id",
                        label: "Request#",
                        render: (v) => (
                          <span className="font-mono text-xs">{v as string}</span>
                        ),
                      },
                      {
                        key: "requestedById",
                        label: "From",
                        render: (v) => (
                          <span>
                            {userMap.get(v as string) ?? (v as string)}
                          </span>
                        ),
                      },
                      { key: "type", label: "Type" },
                      {
                        key: "description",
                        label: "Description",
                        className: "max-w-xs truncate",
                      },
                      {
                        key: "priority",
                        label: "Priority",
                        render: (v) => <StatusBadge status={v as string} />,
                      },
                      {
                        key: "status",
                        label: "Status",
                        render: (v) => <StatusBadge status={v as string} />,
                      },
                      {
                        key: "createdAt",
                        label: "Date",
                        render: (v) => (
                          <span className="text-sm">
                            {formatDate(v as string)}
                          </span>
                        ),
                      },
                      {
                        key: "_actions",
                        label: "Actions",
                        render: (_v, row) => {
                          const req = row as unknown as MarketRequest;
                          return (
                            <div className="flex items-center gap-1">
                              <EditDeleteMenu
                                onView={() => setViewRequest(req)}
                                canEdit={false}
                                canDelete={false}
                                itemLabel={req.id}
                              />
                              {req.status === "PENDING" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-green-600 hover:bg-green-50 hover:text-green-700"
                                    onClick={() => handleApproveRequest(req)}
                                  >
                                    <Check className="h-3.5 w-3.5 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                                    onClick={() => {
                                      setRejectDialogRequest(req);
                                      setRejectionReason("");
                                    }}
                                  >
                                    <X className="h-3.5 w-3.5 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          );
                        },
                      },
                    ] as Column<Record<string, unknown>>[]
                  }
                  data={filteredRequests as unknown as Record<string, unknown>[]}
                  exportable
                  exportFilename="crm-marketeer-requests.csv"
                  emptyMessage="No market requests."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Field Visits ───────────────────────────────────────── */}
        <TabsContent value="visits">
          <div className="space-y-4">
            {/* Recent team visits */}
            <Card>
              <CardHeader>
                <CardTitle>Team Visits (Last 30 Days)</CardTitle>
                <CardDescription>
                  Recent visits by DMs and Reps in your team
                </CardDescription>
                <FilterBar
                  searchValue={visitFilters._search}
                  onSearchChange={(v) =>
                    setVisitFilters((f) => ({ ...f, _search: v }))
                  }
                  fields={[
                    {
                      key: "status",
                      label: "Status",
                      type: "select",
                      options: [
                        { label: "Logged", value: "LOGGED" },
                        { label: "Approved", value: "APPROVED" },
                        { label: "Rejected", value: "REJECTED" },
                      ],
                    },
                  ]}
                  values={visitFilters}
                  onChange={(k, v) =>
                    setVisitFilters((f) => ({ ...f, [k]: v }))
                  }
                />
              </CardHeader>
              <CardContent>
                {filteredVisits.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No visits recorded by team members in the last 30 days.
                  </div>
                ) : (
                  <DataTable
                    columns={
                      [
                        {
                          key: "repName",
                          label: "Rep",
                          render: (v) => (
                            <span className="font-medium">{v as string}</span>
                          ),
                        },
                        { key: "doctorName", label: "Doctor" },
                        {
                          key: "date",
                          label: "Date",
                          render: (v) => (
                            <span>{formatDate(v as string)}</span>
                          ),
                        },
                        { key: "type", label: "Type" },
                        { key: "session", label: "Session" },
                        {
                          key: "status",
                          label: "Status",
                          render: (v) => <StatusBadge status={v as string} />,
                        },
                        {
                          key: "notes",
                          label: "Notes",
                          className: "max-w-xs truncate",
                        },
                      ] as Column<Record<string, unknown>>[]
                    }
                    data={filteredVisits as unknown as Record<string, unknown>[]}
                    exportable
                    exportFilename="crm-marketeer-team-visits.csv"
                    emptyMessage="No visits found."
                  />
                )}
              </CardContent>
            </Card>

            {/* Marketeer's own strategic visits */}
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>Marketeer Strategic Visits</CardTitle>
                  <CardDescription>
                    Your own field visits and double visits
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingVisit(null);
                    setShowVisit(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Register Visit
                </Button>
              </CardHeader>
              <CardContent>
                {mktVisits.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No strategic visits registered. Click &quot;Register
                    Visit&quot; to add one.
                  </div>
                ) : (
                  <DataTable
                    columns={
                      [
                        {
                          key: "id",
                          label: "Visit#",
                          render: (v) => (
                            <span className="font-mono">{v as string}</span>
                          ),
                        },
                        {
                          key: "repName",
                          label: "Accompanied",
                          render: (v) => (
                            <span className="font-medium">{v as string}</span>
                          ),
                        },
                        { key: "doctorName", label: "Doctor" },
                        {
                          key: "date",
                          label: "Date",
                          render: (v) => (
                            <span>{formatDate(v as string)}</span>
                          ),
                        },
                        {
                          key: "purpose",
                          label: "Purpose",
                          render: (v) => <StatusBadge status={v as string} />,
                        },
                        {
                          key: "observations",
                          label: "Observations",
                          className: "max-w-xs truncate",
                        },
                        {
                          key: "_actions",
                          label: "",
                          render: (_v, row) => {
                            const v = row as unknown as FieldVisitRecord;
                            return (
                              <EditDeleteMenu
                                onView={() => setViewVisit(v)}
                                onEdit={() => {
                                  setEditingVisit(v);
                                  setShowVisit(true);
                                }}
                                onDelete={() =>
                                  setMktVisits((prev) =>
                                    prev.filter((x) => x.id !== v.id)
                                  )
                                }
                                itemLabel={v.id}
                              />
                            );
                          },
                        },
                      ] as Column<Record<string, unknown>>[]
                    }
                    data={mktVisits as unknown as Record<string, unknown>[]}
                    exportable
                    exportFilename="crm-marketeer-strategic-visits.csv"
                    emptyMessage="No strategic visits."
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab 4: Market Analysis ───────────────────────────────────── */}
        <TabsContent value="analysis">
          <Card>
            <CardHeader>
              <CardTitle>Product Performance</CardTitle>
              <CardDescription>
                Sales performance by product across your business units
              </CardDescription>
            </CardHeader>
            <CardContent>
              {marketAnalysis.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No product performance data available. Products will appear here once sales orders are recorded.
                </div>
              ) : (
                <DataTable
                  columns={
                    [
                      {
                        key: "product",
                        label: "Product",
                        render: (v) => (
                          <span className="font-medium">{v as string}</span>
                        ),
                      },
                      { key: "territory", label: "Business Unit" },
                      { key: "target", label: "Target" },
                      {
                        key: "actual",
                        label: "Actual",
                        render: (v) => (
                          <span className="font-semibold">{v as string}</span>
                        ),
                      },
                      {
                        key: "growth",
                        label: "vs Target",
                        render: (v) => {
                          const s = v as string;
                          if (s === "-") return <span className="text-muted-foreground">-</span>;
                          return (
                            <span
                              className={
                                s.startsWith("+")
                                  ? "text-green-600"
                                  : "text-red-600"
                              }
                            >
                              {s}
                            </span>
                          );
                        },
                      },
                      { key: "orders", label: "Orders" },
                      {
                        key: "unitPrice",
                        label: "Unit Price",
                        render: (v) => (
                          <span className="text-muted-foreground">
                            {v as string}
                          </span>
                        ),
                      },
                    ] as Column<Record<string, unknown>>[]
                  }
                  data={marketAnalysis as unknown as Record<string, unknown>[]}
                  exportable
                  exportFilename="crm-marketeer-market-analysis.csv"
                  emptyMessage="No market analysis data."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Request Detail Dialog ───────────────────────────────────────── */}
      <Dialog
        open={!!viewRequest}
        onOpenChange={(open) => {
          if (!open) setViewRequest(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewRequest?.id} - {viewRequest?.type}
            </DialogTitle>
          </DialogHeader>
          {viewRequest && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <span className="text-sm text-muted-foreground">Request ID</span>
                <p className="font-medium">{viewRequest.id}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">From</span>
                <p className="font-medium">
                  {userMap.get(viewRequest.requestedById) ?? viewRequest.requestedById}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Type</span>
                <p className="font-medium">{viewRequest.type}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Priority</span>
                <p className="font-medium">{viewRequest.priority}</p>
              </div>
              <div className="col-span-2">
                <span className="text-sm text-muted-foreground">Description</span>
                <p className="font-medium">{viewRequest.description}</p>
              </div>
              {viewRequest.amount != null && (
                <div>
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <p className="font-medium">{fmtCurrency(viewRequest.amount)}</p>
                </div>
              )}
              <div>
                <span className="text-sm text-muted-foreground">Status</span>
                <p className="font-medium">{viewRequest.status}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Date</span>
                <p className="font-medium">{formatDate(viewRequest.createdAt)}</p>
              </div>
              {viewRequest.approvedById && (
                <div>
                  <span className="text-sm text-muted-foreground">Approved By</span>
                  <p className="font-medium">
                    {userMap.get(viewRequest.approvedById) ?? viewRequest.approvedById}
                  </p>
                </div>
              )}
              {viewRequest.rejectionReason && (
                <div className="col-span-2">
                  <span className="text-sm text-muted-foreground">Rejection Reason</span>
                  <p className="font-medium">{viewRequest.rejectionReason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Field Visit Detail Dialog ──────────────────────────────────── */}
      <Dialog
        open={!!viewVisit}
        onOpenChange={(open) => {
          if (!open) setViewVisit(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewVisit?.id} - {viewVisit?.doctorName}
            </DialogTitle>
          </DialogHeader>
          {viewVisit && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <span className="text-sm text-muted-foreground">Visit ID</span>
                <p className="font-medium">{viewVisit.id}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Accompanied</span>
                <p className="font-medium">{viewVisit.repName}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Doctor</span>
                <p className="font-medium">{viewVisit.doctorName}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Date</span>
                <p className="font-medium">{formatDate(viewVisit.date)}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Purpose</span>
                <p className="font-medium">{viewVisit.purpose}</p>
              </div>
              <div className="col-span-2">
                <span className="text-sm text-muted-foreground">Observations</span>
                <p className="font-medium">{viewVisit.observations || "-"}</p>
              </div>
              <div className="col-span-2">
                <span className="text-sm text-muted-foreground">Follow-up Actions</span>
                <p className="font-medium">{viewVisit.followUp || "-"}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Rejection Reason Dialog ────────────────────────────────────── */}
      <Dialog
        open={!!rejectDialogRequest}
        onOpenChange={(open) => {
          if (!open) {
            setRejectDialogRequest(null);
            setRejectionReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Market Request</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting request {rejectDialogRequest?.id}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="rejection-reason">Rejection Reason</Label>
            <Textarea
              id="rejection-reason"
              placeholder="Enter reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogRequest(null);
                setRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectRequest}
              disabled={!rejectionReason.trim()}
            >
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Visit Form Modal ───────────────────────────────────────────── */}
      <EntityFormModal
        open={showVisit}
        onOpenChange={(open) => {
          if (!open) {
            setShowVisit(false);
            setEditingVisit(null);
          }
        }}
        title={editingVisit ? "Edit Visit" : "Register Double Visit"}
        fields={visitFields}
        initialData={
          editingVisit
            ? {
                repName: editingVisit.repName,
                doctorName: editingVisit.doctorName,
                date: editingVisit.date,
                purpose: editingVisit.purpose,
                observations: editingVisit.observations,
                followUp: editingVisit.followUp,
              }
            : undefined
        }
        onSubmit={(d) => {
          if (editingVisit) {
            setMktVisits((prev) =>
              prev.map((v) =>
                v.id === editingVisit.id
                  ? {
                      ...v,
                      repName: d.repName as string,
                      doctorName: d.doctorName as string,
                      date: d.date as string,
                      purpose: (d.purpose as string) || v.purpose,
                      observations: (d.observations as string) || "",
                      followUp: (d.followUp as string) || "",
                    }
                  : v
              )
            );
          } else {
            setMktVisits((prev) => [
              {
                id: `MV-${Date.now().toString(36)}`,
                repName: d.repName as string,
                doctorName: d.doctorName as string,
                date: d.date as string,
                purpose: (d.purpose as string) || "KOL Engagement",
                observations: (d.observations as string) || "",
                followUp: (d.followUp as string) || "",
              },
              ...prev,
            ]);
          }
          setShowVisit(false);
          setEditingVisit(null);
        }}
      />
    </div>
  );
}
