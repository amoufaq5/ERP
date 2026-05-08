"use client";

import { useMemo, useState, useCallback } from "react";
import {
  Heart,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  ChevronUp,
  ChevronDown,
  Users,
  Star,
  Eye,
  FlaskConical,
  Repeat,
  Trophy,
  X,
  ClipboardList,
  Package,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { useApiDataStore } from "@/lib/api/use-api-store";
import {
  BUYING_LADDER_STAGES,
  type BuyingLadderStage,
  type Doctor,
  type Visit,
  scopeDoctors,
  scopeVisits,
} from "@/lib/data-store";
import { useCurrentUser } from "@/lib/user-context";

const STAGE_INDEX: Record<BuyingLadderStage, number> = {
  Unaware: 1,
  Aware: 2,
  Trial: 3,
  Regular: 4,
  Champion: 5,
};

const STAGE_COLORS: Record<BuyingLadderStage, { bg: string; text: string; bar: string }> = {
  Unaware:  { bg: "bg-red-100 dark:bg-red-950",       text: "text-red-700 dark:text-red-400",       bar: "bg-red-500" },
  Aware:    { bg: "bg-orange-100 dark:bg-orange-950",  text: "text-orange-700 dark:text-orange-400", bar: "bg-orange-500" },
  Trial:    { bg: "bg-yellow-100 dark:bg-yellow-950",  text: "text-yellow-700 dark:text-yellow-400", bar: "bg-yellow-500" },
  Regular:  { bg: "bg-lime-100 dark:bg-lime-950",      text: "text-lime-700 dark:text-lime-400",     bar: "bg-lime-500" },
  Champion: { bg: "bg-emerald-100 dark:bg-emerald-950", text: "text-emerald-700 dark:text-emerald-400", bar: "bg-emerald-500" },
};

const STAGE_ICONS: Record<BuyingLadderStage, typeof Heart> = {
  Unaware: Users,
  Aware: Eye,
  Trial: FlaskConical,
  Regular: Repeat,
  Champion: Trophy,
};

const CLASSIFICATION_COLORS: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400",
  B: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400",
  C: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400",
  D: "bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-400",
};

function daysSince(dateStr?: string): number {
  if (!dateStr) return 999;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function riskRatio(doc: Doctor): number {
  if (!doc.lastVisitAt || doc.visitFrequency <= 0) return 999;
  const gap = daysSince(doc.lastVisitAt);
  const requiredGap = 30 / doc.visitFrequency;
  return gap / requiredGap;
}

type RiskLevel = "Low" | "Medium" | "High" | "Critical";

function riskLevel(doc: Doctor): RiskLevel {
  const r = riskRatio(doc);
  if (r < 1.0) return "Low";
  if (r < 1.5) return "Medium";
  if (r < 2.0) return "High";
  return "Critical";
}

const RISK_COLORS: Record<RiskLevel, string> = {
  Low: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400",
  Medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400",
  High: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-400",
  Critical: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400",
};

const RISK_CELL_COLORS: Record<RiskLevel, string> = {
  Low: "bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400",
  Medium: "bg-yellow-50 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400",
  High: "bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400",
  Critical: "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400",
};

export default function LoyaltyPage() {
  const store = useApiDataStore();
  const { user, getReportsOf } = useCurrentUser();
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [stageFilter, setStageFilter] = useState<BuyingLadderStage | "ALL">("ALL");

  const repsUnderMe = getReportsOf(user.id).map((u) => u.id);
  const doctors = useMemo(
    () => scopeDoctors(store.doctors, store.businessUnits, user.role, user.id, repsUnderMe),
    [store.doctors, store.businessUnits, user.role, user.id, repsUnderMe]
  );
  const visits = useMemo(
    () => scopeVisits(store.visits, store.businessUnits, user.role, user.id, repsUnderMe),
    [store.visits, store.businessUnits, user.role, user.id, repsUnderMe]
  );

  const loyalCount = useMemo(
    () => doctors.filter((d) => d.buyingLadderStage === "Regular" || d.buyingLadderStage === "Champion").length,
    [doctors]
  );

  const atRiskCount = useMemo(
    () =>
      doctors.filter(
        (d) =>
          STAGE_INDEX[d.buyingLadderStage] >= STAGE_INDEX["Trial"] &&
          daysSince(d.lastVisitAt) > 30
      ).length,
    [doctors]
  );

  const now = new Date();
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);

  const newEngagements = useMemo(() => {
    return visits.filter(
      (v) =>
        new Date(v.dateTime) >= quarterStart &&
        v.buyingLadderBefore === "Unaware" &&
        v.buyingLadderAfter &&
        STAGE_INDEX[v.buyingLadderAfter] >= STAGE_INDEX["Aware"]
    ).length;
  }, [visits, quarterStart]);

  const avgStage = useMemo(() => {
    if (doctors.length === 0) return 0;
    const total = doctors.reduce((sum, d) => sum + STAGE_INDEX[d.buyingLadderStage], 0);
    return +(total / doctors.length).toFixed(1);
  }, [doctors]);

  const stageCounts = useMemo(() => {
    const counts: Record<BuyingLadderStage, number> = {
      Unaware: 0, Aware: 0, Trial: 0, Regular: 0, Champion: 0,
    };
    doctors.forEach((d) => { counts[d.buyingLadderStage]++; });
    return counts;
  }, [doctors]);

  const maxStageCount = Math.max(1, ...Object.values(stageCounts));

  const filteredDoctors = useMemo(
    () => stageFilter === "ALL" ? doctors : doctors.filter((d) => d.buyingLadderStage === stageFilter),
    [doctors, stageFilter]
  );

  const tableData = useMemo(
    () =>
      filteredDoctors.map((d) => ({
        ...d,
        daysSinceVisit: daysSince(d.lastVisitAt),
        risk: riskLevel(d),
      })),
    [filteredDoctors]
  );

  const doctorVisits = useCallback(
    (doctorId: string) => visits.filter((v) => v.doctorId === doctorId),
    [visits]
  );

  const doctorSamplesTotal = useCallback(
    (doctorId: string) =>
      visits
        .filter((v) => v.doctorId === doctorId)
        .reduce((sum, v) => sum + v.samplesDistributed, 0),
    [visits]
  );

  const handleAdvanceStage = useCallback(
    (doc: Doctor) => {
      const idx = BUYING_LADDER_STAGES.indexOf(doc.buyingLadderStage);
      if (idx < BUYING_LADDER_STAGES.length - 1) {
        const nextStage = BUYING_LADDER_STAGES[idx + 1];
        store.update("doctors", doc.id, { buyingLadderStage: nextStage });
        setSelectedDoctor({ ...doc, buyingLadderStage: nextStage });
      }
    },
    [store]
  );

  const handleRegressStage = useCallback(
    (doc: Doctor) => {
      const idx = BUYING_LADDER_STAGES.indexOf(doc.buyingLadderStage);
      if (idx > 0) {
        const prevStage = BUYING_LADDER_STAGES[idx - 1];
        store.update("doctors", doc.id, { buyingLadderStage: prevStage });
        setSelectedDoctor({ ...doc, buyingLadderStage: prevStage });
      }
    },
    [store]
  );

  const riskMatrix = useMemo(() => {
    const classifications = ["A", "B", "C", "D"] as const;
    const riskLevels: RiskLevel[] = ["Low", "Medium", "High", "Critical"];
    const matrix: Record<string, Record<RiskLevel, number>> = {};
    classifications.forEach((c) => {
      matrix[c] = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    });
    doctors.forEach((d) => {
      const rl = riskLevel(d);
      if (matrix[d.classification]) {
        matrix[d.classification][rl]++;
      }
    });
    return { matrix, classifications, riskLevels };
  }, [doctors]);

  const trendCards = useMemo(() => {
    return BUYING_LADDER_STAGES.map((stage) => {
      const docsAtStage = doctors.filter((d) => d.buyingLadderStage === stage);
      const count = docsAtStage.length;
      const pct = doctors.length > 0 ? +((count / doctors.length) * 100).toFixed(1) : 0;
      const topDoctors = [...docsAtStage]
        .sort((a, b) => (b.potentialRevenue ?? 0) - (a.potentialRevenue ?? 0))
        .slice(0, 3);
      return { stage, count, pct, topDoctors };
    });
  }, [doctors]);

  const columns: Column<typeof tableData[number]>[] = useMemo(
    () => [
      {
        key: "name",
        label: "Doctor Name",
        sortable: true,
        render: (_: unknown, row: typeof tableData[number]) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.name}</span>
            {row.isKOL && (
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
            )}
          </div>
        ),
      },
      { key: "specialty", label: "Specialty", sortable: true },
      { key: "hospital", label: "Hospital", sortable: true },
      {
        key: "classification",
        label: "Class",
        sortable: true,
        render: (val: string) => (
          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${CLASSIFICATION_COLORS[val] || ""}`}>
            {val}
          </span>
        ),
      },
      {
        key: "buyingLadderStage",
        label: "Stage",
        sortable: true,
        render: (val: BuyingLadderStage) => {
          const c = STAGE_COLORS[val];
          return (
            <Badge className={`${c.bg} ${c.text} border-0`}>{val}</Badge>
          );
        },
      },
      {
        key: "visitFrequency",
        label: "Freq/mo",
        sortable: true,
        render: (val: number) => <span>{val}x</span>,
      },
      {
        key: "lastVisitAt",
        label: "Last Visit",
        sortable: true,
        render: (val: string | undefined) =>
          val ? new Date(val).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : <span className="text-muted-foreground">Never</span>,
      },
      {
        key: "daysSinceVisit",
        label: "Days Since",
        sortable: true,
        render: (val: number) => (
          <span className={val > 30 ? "text-red-600 font-semibold" : val > 14 ? "text-orange-600" : "text-foreground"}>
            {val === 999 ? "N/A" : `${val}d`}
          </span>
        ),
      },
      {
        key: "risk",
        label: "Risk",
        sortable: true,
        render: (val: RiskLevel) => (
          <Badge className={`${RISK_COLORS[val]} border-0`}>{val}</Badge>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor Loyalty & Engagement"
        description="Track doctor engagement progression through the buying ladder and identify at-risk relationships."
        icon={<Heart className="h-6 w-6 text-rose-500" />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={Heart}
          title="Loyal Doctors"
          value={loyalCount}
          subtitle="Regular + Champion stage"
          iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
        />
        <StatsCard
          icon={AlertTriangle}
          title="At Risk"
          value={atRiskCount}
          subtitle="Trial+ with no visit in 30+ days"
          iconColor="bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
        />
        <StatsCard
          icon={TrendingUp}
          title="New Engagements"
          value={newEngagements}
          subtitle="Moved from Unaware this quarter"
          iconColor="bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
        />
        <StatsCard
          icon={BarChart3}
          title="Avg Buying Ladder"
          value={avgStage}
          subtitle="1=Unaware, 5=Champion"
          iconColor="bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="segments">Segments Table</TabsTrigger>
          <TabsTrigger value="risk">Risk Matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Buying Ladder Distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {BUYING_LADDER_STAGES.map((stage) => {
                const count = stageCounts[stage];
                const pct = doctors.length > 0 ? ((count / doctors.length) * 100).toFixed(1) : "0";
                const widthPct = (count / maxStageCount) * 100;
                const c = STAGE_COLORS[stage];
                const Icon = STAGE_ICONS[stage];
                return (
                  <div key={stage} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-28 shrink-0">
                      <Icon className={`h-4 w-4 ${c.text}`} />
                      <span className="text-sm font-medium">{stage}</span>
                    </div>
                    <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden relative">
                      <div
                        className={`h-full ${c.bar} rounded-md transition-all duration-500`}
                        style={{ width: `${widthPct}%`, minWidth: count > 0 ? "2rem" : 0 }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-foreground mix-blend-difference">
                        {count > 0 ? count : ""}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">{pct}%</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {trendCards.map(({ stage, count, pct, topDoctors }) => {
              const c = STAGE_COLORS[stage];
              const Icon = STAGE_ICONS[stage];
              return (
                <Card key={stage} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.bg}`}>
                        <Icon className={`h-4 w-4 ${c.text}`} />
                      </div>
                      <div>
                        <CardTitle className="text-sm">{stage}</CardTitle>
                        <p className="text-xs text-muted-foreground">{pct}% of total</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold mb-3">{count}</p>
                    {topDoctors.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Top by Revenue</p>
                        {topDoctors.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between text-xs">
                            <span className="truncate mr-2">{doc.name}</span>
                            <span className="text-muted-foreground shrink-0">
                              {doc.potentialRevenue ? `${(doc.potentialRevenue / 1000).toFixed(0)}K` : "-"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Filter by stage:</span>
            <Button
              variant={stageFilter === "ALL" ? "default" : "outline"}
              size="sm"
              onClick={() => setStageFilter("ALL")}
            >
              All ({doctors.length})
            </Button>
            {BUYING_LADDER_STAGES.map((stage) => {
              const c = STAGE_COLORS[stage];
              return (
                <Button
                  key={stage}
                  variant={stageFilter === stage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStageFilter(stage)}
                  className={stageFilter !== stage ? `${c.text}` : ""}
                >
                  {stage} ({stageCounts[stage]})
                </Button>
              );
            })}
          </div>

          <DataTable
            columns={columns}
            data={tableData}
            searchable
            searchKeys={["name", "specialty", "hospital"]}
            pagination
            pageSize={10}
            onRowClick={(row) => setSelectedDoctor(row)}
            exportable
            exportFilename="doctor-loyalty-segments.csv"
          />
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Risk Matrix: Classification x Engagement Risk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-3 text-left text-sm font-semibold text-muted-foreground border-b">Class</th>
                      {riskMatrix.riskLevels.map((rl) => (
                        <th key={rl} className="p-3 text-center text-sm font-semibold text-muted-foreground border-b">
                          {rl}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {riskMatrix.classifications.map((cls) => (
                      <tr key={cls} className="border-b last:border-0">
                        <td className="p-3">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${CLASSIFICATION_COLORS[cls]}`}>
                            {cls}
                          </span>
                        </td>
                        {riskMatrix.riskLevels.map((rl) => {
                          const count = riskMatrix.matrix[cls][rl];
                          return (
                            <td key={rl} className="p-2 text-center">
                              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-lg text-lg font-bold ${count > 0 ? RISK_CELL_COLORS[rl] : "bg-muted/50 text-muted-foreground/30"}`}>
                                {count}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>Risk = days since last visit / required visit gap (30 / frequency)</span>
                <span className="mx-1">|</span>
                <span className="text-green-600">Low {"<"}1.0</span>
                <span className="text-yellow-600">Medium 1.0-1.5</span>
                <span className="text-orange-600">High 1.5-2.0</span>
                <span className="text-red-600">Critical {">"}2.0</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedDoctor} onOpenChange={(open) => !open && setSelectedDoctor(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Engagement Actions
              {selectedDoctor?.isKOL && (
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 border-0">KOL</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedDoctor && (
            <EngagementPanel
              doctor={selectedDoctor}
              visits={doctorVisits(selectedDoctor.id)}
              samplesTotal={doctorSamplesTotal(selectedDoctor.id)}
              onAdvance={handleAdvanceStage}
              onRegress={handleRegressStage}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EngagementPanel({
  doctor,
  visits,
  samplesTotal,
  onAdvance,
  onRegress,
}: {
  doctor: Doctor;
  visits: Visit[];
  samplesTotal: number;
  onAdvance: (d: Doctor) => void;
  onRegress: (d: Doctor) => void;
}) {
  const stageIdx = BUYING_LADDER_STAGES.indexOf(doctor.buyingLadderStage);
  const canAdvance = stageIdx < BUYING_LADDER_STAGES.length - 1;
  const canRegress = stageIdx > 0;
  const c = STAGE_COLORS[doctor.buyingLadderStage];
  const risk = riskLevel(doctor);
  const days = daysSince(doctor.lastVisitAt);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-lg">{doctor.name}</p>
          <p className="text-sm text-muted-foreground">{doctor.specialty} - {doctor.hospital}</p>
        </div>
        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold ${CLASSIFICATION_COLORS[doctor.classification]}`}>
          {doctor.classification}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Current Stage:</span>
        <Badge className={`${c.bg} ${c.text} border-0 text-sm`}>{doctor.buyingLadderStage}</Badge>
        <Badge className={`${RISK_COLORS[risk]} border-0`}>{risk} Risk</Badge>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 flex items-center gap-1">
          {BUYING_LADDER_STAGES.map((s, i) => {
            const sc = STAGE_COLORS[s];
            const isActive = i <= stageIdx;
            return (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full ${isActive ? sc.bar : "bg-muted"}`}
                title={s}
              />
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={!canRegress}
          onClick={() => onRegress(doctor)}
          className="gap-1"
        >
          <ChevronDown className="h-4 w-4" />
          Regress Stage
        </Button>
        <Button
          size="sm"
          disabled={!canAdvance}
          onClick={() => onAdvance(doctor)}
          className="gap-1"
        >
          <ChevronUp className="h-4 w-4" />
          Advance Stage
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border p-3 text-center">
          <ClipboardList className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xl font-bold">{visits.length}</p>
          <p className="text-xs text-muted-foreground">Total Visits</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <Package className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xl font-bold">{samplesTotal}</p>
          <p className="text-xs text-muted-foreground">Samples Given</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <AlertTriangle className={`h-4 w-4 mx-auto mb-1 ${days > 30 ? "text-red-500" : "text-muted-foreground"}`} />
          <p className={`text-xl font-bold ${days > 30 ? "text-red-600" : ""}`}>{days === 999 ? "N/A" : `${days}d`}</p>
          <p className="text-xs text-muted-foreground">Since Last Visit</p>
        </div>
      </div>

      {visits.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Recent Visits</p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {[...visits]
              .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
              .slice(0, 5)
              .map((v) => (
                <div key={v.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                  <span>{new Date(v.dateTime).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                  <span className="text-muted-foreground">{v.type} - {v.durationMin}min</span>
                  {v.buyingLadderBefore && v.buyingLadderAfter && v.buyingLadderBefore !== v.buyingLadderAfter && (
                    <Badge variant="outline" className="text-xs">
                      {v.buyingLadderBefore} → {v.buyingLadderAfter}
                    </Badge>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
