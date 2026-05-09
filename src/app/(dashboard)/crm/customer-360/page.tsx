"use client";

import { useState, useMemo, useRef } from "react";
import { useCurrentUser } from "@/lib/user-context";
import {
  User,
  Search,
  Calendar,
  Clock,
  Package,
  Activity,
  TrendingUp,
  CheckCircle2,
  Building2,
  FileText,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Star,
  ChevronDown,
  Pill,
  ClipboardList,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import EmptyState from "@/components/shared/empty-state";
import { useApiDataStore } from "@/lib/api/use-api-store";
import { BUYING_LADDER_STAGES, scopeDoctors, type Doctor, type Visit, type AMAccount } from "@/lib/data-store";
import { formatCurrency, formatDate } from "@/lib/utils";

const CLASSIFICATION_COLORS: Record<string, string> = {
  A: "bg-green-100 text-green-800 border-green-300",
  B: "bg-blue-100 text-blue-800 border-blue-300",
  C: "bg-yellow-100 text-yellow-800 border-yellow-300",
  D: "bg-gray-100 text-gray-800 border-gray-300",
};

const LADDER_COLORS: Record<string, string> = {
  Unaware: "bg-gray-400",
  Aware: "bg-blue-400",
  Trial: "bg-yellow-400",
  Regular: "bg-green-400",
  Champion: "bg-purple-500",
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function Customer360Page() {
  const store = useApiDataStore();
  const { user, getReportsOf } = useCurrentUser();
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectorOpen, setSelectorOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const repsUnderMe = useMemo(() => getReportsOf(user.id).map(u => u.id), [user.id, getReportsOf]);
  const doctors = useMemo(
    () => scopeDoctors((store.doctors ?? []) as Doctor[], store.businessUnits, user.role, user.id, repsUnderMe),
    [store.doctors, store.businessUnits, user.role, user.id, repsUnderMe]
  );
  const visits = (store.visits ?? []) as Visit[];
  const employees = store.employees ?? [];
  const amAccounts = store.amAccounts ?? [];
  const salesOrders = store.salesOrders ?? [];
  const invoices = store.invoices ?? [];
  const products = store.products ?? [];

  const employeeMap = useMemo(
    () => new Map((employees as Array<{ id: string; name: string }>).map((e) => [e.id, e.name])),
    [employees]
  );

  const productMap = useMemo(
    () => new Map((products as Array<{ id: string; name: string }>).map((p) => [p.id, p.name])),
    [products]
  );

  const filteredDoctors = useMemo(() => {
    if (!searchQuery.trim()) return doctors;
    const q = searchQuery.toLowerCase();
    return doctors.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (typeof d.specialty === "string" && d.specialty.toLowerCase().includes(q)) ||
        d.hospital.toLowerCase().includes(q) ||
        d.city.toLowerCase().includes(q)
    );
  }, [doctors, searchQuery]);

  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.id === selectedDoctorId) ?? null,
    [doctors, selectedDoctorId]
  );

  const doctorVisits = useMemo(() => {
    if (!selectedDoctorId) return [];
    return visits
      .filter((v) => v.doctorId === selectedDoctorId)
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [visits, selectedDoctorId]);

  const visitAnalytics = useMemo(() => {
    if (doctorVisits.length === 0) {
      return {
        totalVisits: 0,
        visitsThisMonth: 0,
        avgDuration: 0,
        totalSamples: 0,
        productsDetailedCount: 0,
        compliancePct: 0,
      };
    }

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const visitsThisMonth = doctorVisits.filter((v) => {
      const d = new Date(v.dateTime);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    const totalDuration = doctorVisits.reduce((sum, v) => sum + (v.durationMin || 0), 0);
    const avgDuration = totalDuration / doctorVisits.length;

    const totalSamples = doctorVisits.reduce(
      (sum, v) => sum + (v.samplesGiven ?? []).reduce((s, sg) => s + sg.quantity, 0),
      0
    );

    const productsDetailedCount = doctorVisits.reduce(
      (sum, v) => sum + (v.productIds ?? []).length,
      0
    );

    const approved = doctorVisits.filter((v) => v.status === "APPROVED").length;
    const compliancePct =
      doctorVisits.length > 0 ? Math.round((approved / doctorVisits.length) * 100) : 0;

    return {
      totalVisits: doctorVisits.length,
      visitsThisMonth,
      avgDuration,
      totalSamples,
      productsDetailedCount,
      compliancePct,
    };
  }, [doctorVisits]);

  const linkedAccounts = useMemo((): AMAccount[] => {
    if (!selectedDoctor) return [];
    const linked: AMAccount[] = [];
    const accounts = amAccounts as AMAccount[];

    if (selectedDoctor.linkedAccountIds?.length) {
      for (const accId of selectedDoctor.linkedAccountIds) {
        const acc = accounts.find((a) => a.id === accId);
        if (acc) linked.push(acc);
      }
    }

    if (linked.length === 0) {
      const hospitalLower = selectedDoctor.hospital.toLowerCase();
      for (const acc of accounts) {
        if (acc.name.toLowerCase().includes(hospitalLower) || hospitalLower.includes(acc.name.toLowerCase())) {
          linked.push(acc);
        }
      }
    }

    return linked;
  }, [selectedDoctor, amAccounts]);

  const accountFinancials = useMemo(() => {
    const accountIds = new Set(linkedAccounts.map((a) => a.id));
    if (accountIds.size === 0) return { orders: [], accountInvoices: [], outstandingBalance: 0 };

    const orders = (salesOrders as Array<{ id: string; customerId: string; date: string; status: string; total: number }>).filter((so) =>
      accountIds.has(so.customerId)
    );

    const accountInvoices = (invoices as Array<{ id: string; customerId: string; date: string; status: string; total: number; dueDate: string }>).filter((inv) =>
      accountIds.has(inv.customerId)
    );

    const outstandingBalance = accountInvoices
      .filter((inv) => inv.status !== "PAID" && inv.status !== "VOID")
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    return { orders, accountInvoices, outstandingBalance };
  }, [linkedAccounts, salesOrders, invoices]);

  const productsAggregated = useMemo(() => {
    const map = new Map<string, { productId: string; name: string; count: number; lastDate: string }>();
    for (const v of doctorVisits) {
      for (const pid of v.productIds ?? []) {
        const existing = map.get(pid);
        if (existing) {
          existing.count += 1;
          if (v.dateTime > existing.lastDate) existing.lastDate = v.dateTime;
        } else {
          map.set(pid, {
            productId: pid,
            name: productMap.get(pid) || pid,
            count: 1,
            lastDate: v.dateTime,
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [doctorVisits, productMap]);

  const samplesAggregated = useMemo(() => {
    const map = new Map<string, { productId: string; name: string; totalQty: number; lastDate: string }>();
    for (const v of doctorVisits) {
      for (const sg of v.samplesGiven ?? []) {
        const existing = map.get(sg.productId);
        if (existing) {
          existing.totalQty += sg.quantity;
          if (v.dateTime > existing.lastDate) existing.lastDate = v.dateTime;
        } else {
          map.set(sg.productId, {
            productId: sg.productId,
            name: productMap.get(sg.productId) || sg.productId,
            totalQty: sg.quantity,
            lastDate: v.dateTime,
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalQty - a.totalQty);
  }, [doctorVisits, productMap]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer 360"
        description="Unified view of all data about a selected doctor across the entire CRM/ERP system"
        icon={<User className="h-6 w-6" />}
      />

      <Card>
        <CardContent className="p-4">
          <Popover open={selectorOpen} onOpenChange={setSelectorOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {selectedDoctor ? (
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{selectedDoctor.name}</span>
                    <span className="text-muted-foreground">- {selectedDoctor.specialty}</span>
                    <Badge className={CLASSIFICATION_COLORS[selectedDoctor.classification]}>
                      {selectedDoctor.classification}
                    </Badge>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Search and select a doctor...</span>
                )}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search by name, specialty, hospital..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto p-1">
                {filteredDoctors.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No doctors found</p>
                ) : (
                  filteredDoctors.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => {
                        setSelectedDoctorId(doc.id);
                        setSelectorOpen(false);
                        setSearchQuery("");
                      }}
                      className={`flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${
                        doc.id === selectedDoctorId ? "bg-accent" : ""
                      }`}
                    >
                      <div className="flex flex-1 items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{doc.name}</span>
                        <span className="text-muted-foreground truncate text-xs">{doc.specialty}</span>
                      </div>
                      <Badge className={`shrink-0 text-[10px] px-1.5 ${CLASSIFICATION_COLORS[doc.classification]}`}>
                        {doc.classification}
                      </Badge>
                      {doc.isKOL && (
                        <Star className="h-3.5 w-3.5 shrink-0 text-amber-500 fill-amber-500" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {!selectedDoctor && (
        <EmptyState
          icon={Search}
          title="Select a Doctor"
          description="Choose a doctor from the dropdown above to view their complete 360-degree profile, visit history, and account linkage."
        />
      )}

      {selectedDoctor && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div>
                    <h3 className="text-xl font-bold">{selectedDoctor.name}</h3>
                    <p className="text-muted-foreground">{selectedDoctor.specialty}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={CLASSIFICATION_COLORS[selectedDoctor.classification]}>
                      Class {selectedDoctor.classification}
                    </Badge>
                    {selectedDoctor.isKOL && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                        <Star className="h-3 w-3 mr-1 fill-amber-500" />
                        KOL
                      </Badge>
                    )}
                    <Badge variant="outline">{selectedDoctor.buyingLadderStage}</Badge>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span>{selectedDoctor.hospital}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{selectedDoctor.city}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{selectedDoctor.phone}</span>
                  </div>
                  {selectedDoctor.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span>{selectedDoctor.email}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  {selectedDoctor.potentialRevenue != null && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 shrink-0 text-green-600" />
                      <span className="text-muted-foreground">Potential Revenue:</span>
                      <span className="font-medium">{formatCurrency(selectedDoctor.potentialRevenue)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 shrink-0 text-blue-600" />
                    <span className="text-muted-foreground">Visit Frequency:</span>
                    <span className="font-medium">{selectedDoctor.visitFrequency}x / month</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 shrink-0 text-indigo-600" />
                    <span className="text-muted-foreground">Assigned Rep:</span>
                    <span className="font-medium">
                      {selectedDoctor.assignedRepId
                        ? employeeMap.get(selectedDoctor.assignedRepId) || selectedDoctor.assignedRepId
                        : "Unassigned"}
                    </span>
                  </div>
                  {selectedDoctor.lastVisitAt && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 shrink-0 text-orange-600" />
                      <span className="text-muted-foreground">Last Visit:</span>
                      <span className="font-medium">{formatDate(selectedDoctor.lastVisitAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Buying Ladder Progression
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-0 w-full">
                {BUYING_LADDER_STAGES.map((stage, idx) => {
                  const currentIdx = BUYING_LADDER_STAGES.indexOf(selectedDoctor.buyingLadderStage);
                  const isActive = idx <= currentIdx;
                  const isCurrent = idx === currentIdx;
                  return (
                    <div key={stage} className="flex-1 flex flex-col items-center relative">
                      <div className="flex items-center w-full">
                        {idx > 0 && (
                          <div
                            className={`h-1 flex-1 ${isActive ? LADDER_COLORS[stage] : "bg-muted"}`}
                          />
                        )}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                            isCurrent
                              ? `${LADDER_COLORS[stage]} text-white ring-4 ring-offset-2 ring-offset-background ring-current`
                              : isActive
                              ? `${LADDER_COLORS[stage]} text-white`
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {idx + 1}
                        </div>
                        {idx < BUYING_LADDER_STAGES.length - 1 && (
                          <div
                            className={`h-1 flex-1 ${idx < currentIdx ? LADDER_COLORS[BUYING_LADDER_STAGES[idx + 1]] : "bg-muted"}`}
                          />
                        )}
                      </div>
                      <span
                        className={`mt-2 text-xs text-center ${
                          isCurrent ? "font-bold text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {stage}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatsCard
              icon={Activity}
              title="Total Visits"
              value={visitAnalytics.totalVisits}
            />
            <StatsCard
              icon={Calendar}
              title="This Month"
              value={visitAnalytics.visitsThisMonth}
            />
            <StatsCard
              icon={Clock}
              title="Avg Duration"
              value={visitAnalytics.avgDuration > 0 ? formatDuration(visitAnalytics.avgDuration) : "N/A"}
            />
            <StatsCard
              icon={Package}
              title="Total Samples"
              value={visitAnalytics.totalSamples}
            />
            <StatsCard
              icon={Pill}
              title="Products Detailed"
              value={visitAnalytics.productsDetailedCount}
            />
            <StatsCard
              icon={CheckCircle2}
              title="Compliance %"
              value={`${visitAnalytics.compliancePct}%`}
            />
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Activity Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="recent-visits">
                <TabsList>
                  <TabsTrigger value="recent-visits">Recent Visits</TabsTrigger>
                  <TabsTrigger value="products-detailed">Products Detailed</TabsTrigger>
                  <TabsTrigger value="samples-history">Samples History</TabsTrigger>
                </TabsList>

                <TabsContent value="recent-visits">
                  {doctorVisits.length === 0 ? (
                    <EmptyState
                      icon={Calendar}
                      title="No Visits Recorded"
                      description="No visits have been logged for this doctor yet."
                    />
                  ) : (
                    <div className="space-y-3 mt-4">
                      {doctorVisits.slice(0, 10).map((visit) => (
                        <div
                          key={visit.id}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                              <Calendar className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm">{formatDate(visit.dateTime)}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                Rep: {employeeMap.get(visit.repId) || visit.repId}
                                {visit.type === "DOUBLE" && " (Double visit)"}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Badge variant="outline">{visit.session} session</Badge>
                            <Badge
                              variant={
                                visit.status === "APPROVED"
                                  ? "success"
                                  : visit.status === "REJECTED"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {visit.status}
                            </Badge>
                            {visit.durationMin > 0 && (
                              <span className="text-muted-foreground">
                                {formatDuration(visit.durationMin)}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(visit.productIds ?? []).length > 0 && (
                              <span>
                                {(visit.productIds ?? []).map((pid) => productMap.get(pid) || pid).join(", ")}
                              </span>
                            )}
                            {(visit.samplesGiven ?? []).length > 0 && (
                              <span className="ml-2">
                                Samples: {(visit.samplesGiven ?? []).reduce((s, sg) => s + sg.quantity, 0)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="products-detailed">
                  {productsAggregated.length === 0 ? (
                    <EmptyState
                      icon={Pill}
                      title="No Products Detailed"
                      description="No products have been detailed for this doctor yet."
                    />
                  ) : (
                    <div className="mt-4">
                      <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 gap-y-0 text-sm">
                        <div className="font-medium text-muted-foreground pb-2 border-b">Product</div>
                        <div className="font-medium text-muted-foreground pb-2 border-b text-right">Times Detailed</div>
                        <div className="font-medium text-muted-foreground pb-2 border-b text-right">Last Detailed</div>
                        {productsAggregated.map((p) => (
                          <div key={p.productId} className="contents">
                            <div className="py-2.5 border-b font-medium">{p.name}</div>
                            <div className="py-2.5 border-b text-right">{p.count}</div>
                            <div className="py-2.5 border-b text-right text-muted-foreground">
                              {formatDate(p.lastDate)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="samples-history">
                  {samplesAggregated.length === 0 ? (
                    <EmptyState
                      icon={Package}
                      title="No Samples Given"
                      description="No samples have been distributed to this doctor yet."
                    />
                  ) : (
                    <div className="mt-4">
                      <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 gap-y-0 text-sm">
                        <div className="font-medium text-muted-foreground pb-2 border-b">Product</div>
                        <div className="font-medium text-muted-foreground pb-2 border-b text-right">Total Quantity</div>
                        <div className="font-medium text-muted-foreground pb-2 border-b text-right">Last Given</div>
                        {samplesAggregated.map((s) => (
                          <div key={s.productId} className="contents">
                            <div className="py-2.5 border-b font-medium">{s.name}</div>
                            <div className="py-2.5 border-b text-right">{s.totalQty}</div>
                            <div className="py-2.5 border-b text-right text-muted-foreground">
                              {formatDate(s.lastDate)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Engagement Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {doctorVisits.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="No Engagement History"
                  description="There are no recorded visits or interactions for this doctor."
                />
              ) : (
                <div className="relative pl-6 space-y-0">
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                  {doctorVisits.map((visit, idx) => (
                    <div key={visit.id} className="relative pb-6 last:pb-0">
                      <div className="absolute -left-6 top-1 flex h-5 w-5 items-center justify-center">
                        <div
                          className={`h-3 w-3 rounded-full border-2 ${
                            visit.status === "APPROVED"
                              ? "bg-green-500 border-green-300"
                              : visit.status === "REJECTED"
                              ? "bg-red-500 border-red-300"
                              : "bg-blue-500 border-blue-300"
                          }`}
                        />
                      </div>
                      <div className="rounded-lg border p-3 bg-card">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                          <span className="font-medium text-sm">{formatDate(visit.dateTime)}</span>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                visit.status === "APPROVED"
                                  ? "success"
                                  : visit.status === "REJECTED"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="text-[10px]"
                            >
                              {visit.status}
                            </Badge>
                            {visit.gpsVerified && (
                              <MapPin className="h-3 w-3 text-green-500" />
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>Rep: {employeeMap.get(visit.repId) || visit.repId}</p>
                          <p>Duration: {formatDuration(visit.durationMin)} | Session: {visit.session} | Type: {visit.type}</p>
                          {(visit.productIds ?? []).length > 0 && (
                            <p>
                              Products: {(visit.productIds ?? []).map((pid) => productMap.get(pid) || pid).join(", ")}
                            </p>
                          )}
                          {(visit.samplesGiven ?? []).length > 0 && (
                            <p>
                              Samples:{" "}
                              {(visit.samplesGiven ?? []).map(
                                (sg) => `${productMap.get(sg.productId) || sg.productId} (x${sg.quantity})`
                              ).join(", ")}
                            </p>
                          )}
                          {visit.buyingLadderBefore && visit.buyingLadderAfter && visit.buyingLadderBefore !== visit.buyingLadderAfter && (
                            <p className="text-green-600 font-medium">
                              Ladder: {visit.buyingLadderBefore} → {visit.buyingLadderAfter}
                            </p>
                          )}
                          {visit.notes && <p className="italic">Note: {visit.notes}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Account Linkage
              </CardTitle>
            </CardHeader>
            <CardContent>
              {linkedAccounts.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="No Linked Accounts"
                  description="No matching accounts found for this doctor's hospital."
                />
              ) : (
                <div className="space-y-6">
                  {linkedAccounts.map((account) => (
                    <div key={account.id} className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div>
                          <h4 className="font-semibold">{account.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {account.type} | {account.city} | {account.phone}
                          </p>
                        </div>
                        <Badge
                          variant={account.status === "Active" ? "success" : "secondary"}
                          className="self-start"
                        >
                          {account.status}
                        </Badge>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div>
                          <h5 className="text-sm font-medium mb-2 flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            Sales Orders ({accountFinancials.orders.length})
                          </h5>
                          {accountFinancials.orders.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No sales orders</p>
                          ) : (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                              {accountFinancials.orders.slice(0, 5).map((so) => (
                                <div key={so.id} className="flex justify-between text-xs border rounded px-2 py-1.5">
                                  <span>{formatDate(so.date)}</span>
                                  <span className="font-medium">{formatCurrency(so.total)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <h5 className="text-sm font-medium mb-2 flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5" />
                            Invoices ({accountFinancials.accountInvoices.length})
                          </h5>
                          {accountFinancials.accountInvoices.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No invoices</p>
                          ) : (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                              {accountFinancials.accountInvoices.slice(0, 5).map((inv) => (
                                <div key={inv.id} className="flex justify-between items-center text-xs border rounded px-2 py-1.5">
                                  <span>{formatDate(inv.date)}</span>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant={inv.status === "PAID" ? "success" : inv.status === "OVERDUE" ? "destructive" : "outline"}
                                      className="text-[10px] px-1"
                                    >
                                      {inv.status}
                                    </Badge>
                                    <span className="font-medium">{formatCurrency(inv.total)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <h5 className="text-sm font-medium mb-2 flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Outstanding Balance
                          </h5>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold">
                              {formatCurrency(accountFinancials.outstandingBalance)}
                            </span>
                          </div>
                          {accountFinancials.outstandingBalance > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              From {accountFinancials.accountInvoices.filter((i) => i.status !== "PAID" && i.status !== "VOID").length} unpaid invoice(s)
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
