"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  DollarSign,
  Target,
  BarChart3,
  Award,
  Users,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable, { type Column } from "@/components/shared/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApiDataStore } from "@/lib/api/use-api-store";

type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "CLOSED_WON"
  | "CLOSED_LOST"
  | "NURTURING";

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  source: string;
  score: number;
  status: LeadStatus;
  assignedTo: string;
  value: number;
  createdAt: string;
}

const STAGE_PROBABILITY: Record<LeadStatus, number> = {
  NEW: 0.05,
  CONTACTED: 0.1,
  QUALIFIED: 0.25,
  PROPOSAL: 0.4,
  NEGOTIATION: 0.6,
  CLOSED_WON: 1.0,
  CLOSED_LOST: 0,
  NURTURING: 0.05,
};

const STAGE_ORDER: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
];

const STAGE_COLORS: Record<LeadStatus, string> = {
  NEW: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-purple-100 text-purple-800",
  QUALIFIED: "bg-green-100 text-green-800",
  PROPOSAL: "bg-yellow-100 text-yellow-800",
  NEGOTIATION: "bg-orange-100 text-orange-800",
  CLOSED_WON: "bg-emerald-100 text-emerald-800",
  CLOSED_LOST: "bg-red-100 text-red-800",
  NURTURING: "bg-gray-100 text-gray-800",
};

const AVG_DAYS_PER_STAGE: Record<LeadStatus, number> = {
  NEW: 14,
  CONTACTED: 21,
  QUALIFIED: 30,
  PROPOSAL: 25,
  NEGOTIATION: 20,
  CLOSED_WON: 0,
  CLOSED_LOST: 0,
  NURTURING: 45,
};

const SEED_LEADS: Lead[] = [
  { id: "L-001", firstName: "Alexandra", lastName: "Chen", email: "a.chen@techcorp.io", company: "TechCorp Solutions", source: "WEBSITE", score: 88, status: "QUALIFIED", assignedTo: "Marcus Williams", value: 45000, createdAt: "2026-03-01" },
  { id: "L-002", firstName: "James", lastName: "Martinez", email: "j.martinez@globalretail.com", company: "Global Retail Inc.", source: "REFERRAL", score: 72, status: "PROPOSAL", assignedTo: "Sarah Johnson", value: 120000, createdAt: "2026-03-05" },
  { id: "L-003", firstName: "Priya", lastName: "Patel", email: "priya.patel@nexusfinance.com", company: "Nexus Finance", source: "TRADE_SHOW", score: 95, status: "NEGOTIATION", assignedTo: "Marcus Williams", value: 250000, createdAt: "2026-03-08" },
  { id: "L-004", firstName: "David", lastName: "Thompson", email: "d.thompson@healthplus.org", company: "HealthPlus Systems", source: "COLD_CALL", score: 41, status: "CONTACTED", assignedTo: "Emma Davis", value: 18000, createdAt: "2026-03-12" },
  { id: "L-005", firstName: "Sofia", lastName: "Nguyen", email: "sofia.n@cloudbuild.tech", company: "CloudBuild Technologies", source: "SOCIAL_MEDIA", score: 63, status: "NEW", assignedTo: "Sarah Johnson", value: 75000, createdAt: "2026-03-15" },
  { id: "L-006", firstName: "Robert", lastName: "Kim", email: "r.kim@manufactura.com", company: "Manufactura Group", source: "EMAIL", score: 79, status: "QUALIFIED", assignedTo: "Emma Davis", value: 95000, createdAt: "2026-03-18" },
  { id: "L-007", firstName: "Isabella", lastName: "Santos", email: "i.santos@logisticspro.net", company: "LogisticsPro", source: "PARTNER", score: 55, status: "NURTURING", assignedTo: "Marcus Williams", value: 32000, createdAt: "2026-03-22" },
  { id: "L-008", firstName: "Michael", lastName: "O'Brien", email: "m.obrien@quantumdata.ai", company: "Quantum Data AI", source: "WEBSITE", score: 91, status: "CLOSED_WON", assignedTo: "Sarah Johnson", value: 185000, createdAt: "2026-02-10" },
  { id: "L-009", firstName: "Elena", lastName: "Rossi", email: "e.rossi@biomed.eu", company: "BioMed Europe", source: "TRADE_SHOW", score: 84, status: "NEGOTIATION", assignedTo: "Emma Davis", value: 310000, createdAt: "2026-02-20" },
  { id: "L-010", firstName: "Ahmed", lastName: "Hassan", email: "a.hassan@pharmasol.eg", company: "PharmaSol Egypt", source: "REFERRAL", score: 77, status: "PROPOSAL", assignedTo: "Marcus Williams", value: 88000, createdAt: "2026-02-25" },
  { id: "L-011", firstName: "Lisa", lastName: "Wang", email: "l.wang@digitalcore.cn", company: "DigitalCore", source: "WEBSITE", score: 69, status: "QUALIFIED", assignedTo: "Sarah Johnson", value: 62000, createdAt: "2026-01-15" },
  { id: "L-012", firstName: "Carlos", lastName: "Rivera", email: "c.rivera@latamhealth.co", company: "LatAm Health", source: "PARTNER", score: 82, status: "CLOSED_WON", assignedTo: "Marcus Williams", value: 145000, createdAt: "2026-01-20" },
  { id: "L-013", firstName: "Fatima", lastName: "Al-Rashid", email: "f.alrashid@gulfpharma.ae", company: "Gulf Pharma", source: "COLD_CALL", score: 58, status: "CONTACTED", assignedTo: "Emma Davis", value: 55000, createdAt: "2026-04-01" },
  { id: "L-014", firstName: "Thomas", lastName: "Becker", email: "t.becker@euromed.de", company: "EuroMed GmbH", source: "EMAIL", score: 73, status: "CLOSED_LOST", assignedTo: "Sarah Johnson", value: 92000, createdAt: "2026-01-10" },
  { id: "L-015", firstName: "Yuki", lastName: "Tanaka", email: "y.tanaka@asiatech.jp", company: "AsiaTech Inc", source: "SOCIAL_MEDIA", score: 66, status: "NEW", assignedTo: "Marcus Williams", value: 48000, createdAt: "2026-04-05" },
  { id: "L-016", firstName: "Rachel", lastName: "Adams", email: "r.adams@medisupply.us", company: "MediSupply US", source: "REFERRAL", score: 90, status: "CLOSED_WON", assignedTo: "Emma Davis", value: 220000, createdAt: "2025-12-15" },
  { id: "L-017", firstName: "Omar", lastName: "Farouk", email: "o.farouk@nilepharm.eg", company: "Nile Pharmaceuticals", source: "TRADE_SHOW", score: 61, status: "PROPOSAL", assignedTo: "Sarah Johnson", value: 105000, createdAt: "2026-03-28" },
  { id: "L-018", firstName: "Natasha", lastName: "Ivanova", email: "n.ivanova@eastmed.ru", company: "EastMed Corp", source: "PARTNER", score: 75, status: "CLOSED_LOST", assignedTo: "Marcus Williams", value: 78000, createdAt: "2026-02-05" },
  { id: "L-019", firstName: "Kevin", lastName: "Park", email: "k.park@smarthealth.kr", company: "SmartHealth Korea", source: "WEBSITE", score: 87, status: "NEGOTIATION", assignedTo: "Sarah Johnson", value: 175000, createdAt: "2026-03-18" },
  { id: "L-020", firstName: "Diana", lastName: "Morales", email: "d.morales@andespharm.cl", company: "Andes Pharma", source: "COLD_CALL", score: 54, status: "QUALIFIED", assignedTo: "Emma Davis", value: 38000, createdAt: "2026-04-10" },
];

const HISTORICAL_FORECAST: { month: string; forecast: number; actual: number }[] = [
  { month: "Nov 2025", forecast: 320000, actual: 295000 },
  { month: "Dec 2025", forecast: 280000, actual: 310000 },
  { month: "Jan 2026", forecast: 350000, actual: 365000 },
  { month: "Feb 2026", forecast: 410000, actual: 380000 },
  { month: "Mar 2026", forecast: 390000, actual: 405000 },
  { month: "Apr 2026", forecast: 450000, actual: 420000 },
];

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtFull(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function daysBetween(a: string, b: Date): number {
  const d1 = new Date(a).getTime();
  const d2 = b.getTime();
  return Math.max(0, Math.round((d2 - d1) / 86400000));
}

function addDays(dateStr: string, days: number): Date {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d;
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

type SortKey = "value" | "weighted" | "daysOpen" | "probability";
type SortDir = "asc" | "desc";

export default function SalesForecastingPage() {
  const store = useApiDataStore();
  const employees = (store as unknown as Record<string, unknown>).employees as { id: string; name: string }[] ?? [];
  const salesOrders = (store as unknown as Record<string, unknown>).salesOrders as { id: string; total: number; status: string; date: string; createdAt: string }[] ?? [];

  const leads = SEED_LEADS;
  const now = new Date();

  const [topDealSort, setTopDealSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "value", dir: "desc" });

  const pipelineValue = useMemo(
    () => leads.filter((l) => l.status !== "CLOSED_WON" && l.status !== "CLOSED_LOST").reduce((s, l) => s + l.value, 0),
    [leads]
  );

  const weightedForecast = useMemo(
    () => leads.reduce((s, l) => s + l.value * STAGE_PROBABILITY[l.status], 0),
    [leads]
  );

  const winRate = useMemo(() => {
    const won = leads.filter((l) => l.status === "CLOSED_WON").length;
    const lost = leads.filter((l) => l.status === "CLOSED_LOST").length;
    return won + lost > 0 ? (won / (won + lost)) * 100 : 0;
  }, [leads]);

  const avgDealSize = useMemo(() => {
    const wonLeads = leads.filter((l) => l.status === "CLOSED_WON");
    return wonLeads.length > 0 ? wonLeads.reduce((s, l) => s + l.value, 0) / wonLeads.length : 0;
  }, [leads]);

  const stageSummary = useMemo(() => {
    const stageIndex: Record<string, number> = {};
    STAGE_ORDER.forEach((s, i) => (stageIndex[s] = i));

    return STAGE_ORDER.map((stage, idx) => {
      const stageLeads = leads.filter((l) => l.status === stage);
      const count = stageLeads.length;
      const totalValue = stageLeads.reduce((s, l) => s + l.value, 0);
      const prob = STAGE_PROBABILITY[stage];
      const weighted = totalValue * prob;
      const avgDays =
        count > 0
          ? Math.round(stageLeads.reduce((s, l) => s + daysBetween(l.createdAt, now), 0) / count)
          : 0;

      let conversionRate = 0;
      if (idx < STAGE_ORDER.length - 2) {
        const nextStages: string[] = STAGE_ORDER.slice(idx + 1).filter((s) => s !== "CLOSED_LOST");
        const movedForward = leads.filter((l) => nextStages.includes(l.status)).length;
        const totalFromHere = count + movedForward;
        conversionRate = totalFromHere > 0 ? (movedForward / totalFromHere) * 100 : 0;
      }

      return { stage, count, totalValue, weighted, avgDays, conversionRate, prob };
    });
  }, [leads, now]);

  const monthlyForecast = useMemo(() => {
    const months: { label: string; committed: number; bestCase: number; pipeline: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({ label: monthLabel(d), committed: 0, bestCase: 0, pipeline: 0 });
    }

    leads
      .filter((l) => l.status !== "CLOSED_LOST")
      .forEach((l) => {
        const remainingStages: LeadStatus[] = [];
        const idx = STAGE_ORDER.indexOf(l.status);
        if (idx >= 0) {
          for (let i = idx; i < STAGE_ORDER.length - 1; i++) {
            remainingStages.push(STAGE_ORDER[i]);
          }
        }
        const daysToClose = remainingStages.reduce((s, st) => s + AVG_DAYS_PER_STAGE[st], 0);
        const closeDate = addDays(l.createdAt, daysBetween(l.createdAt, now) + daysToClose);
        const closeMonth = monthLabel(closeDate);
        const weightedVal = l.value * STAGE_PROBABILITY[l.status];

        const bucket = months.find((m) => m.label === closeMonth);
        if (bucket) {
          if (l.status === "CLOSED_WON") {
            bucket.committed += weightedVal;
          } else if (l.status === "NEGOTIATION" || l.status === "PROPOSAL") {
            bucket.bestCase += weightedVal;
          } else {
            bucket.pipeline += weightedVal;
          }
        }
      });

    return months;
  }, [leads, now]);

  const maxMonthly = useMemo(
    () => Math.max(...monthlyForecast.map((m) => m.committed + m.bestCase + m.pipeline), 1),
    [monthlyForecast]
  );

  const scenarios = useMemo(() => {
    const closedWonTotal = leads
      .filter((l) => l.status === "CLOSED_WON")
      .reduce((s, l) => s + l.value, 0);
    const negotiationTotal = leads
      .filter((l) => l.status === "NEGOTIATION")
      .reduce((s, l) => s + l.value, 0);
    const proposalTotal = leads
      .filter((l) => l.status === "PROPOSAL")
      .reduce((s, l) => s + l.value, 0);
    const qualifiedTotal = leads
      .filter((l) => l.status === "QUALIFIED")
      .reduce((s, l) => s + l.value, 0);

    const conservative = closedWonTotal + negotiationTotal * 0.8;
    const mostLikely = closedWonTotal + negotiationTotal * 0.8 + proposalTotal * 0.5 + qualifiedTotal * 0.25;
    const optimistic = weightedForecast;

    return { conservative, mostLikely, optimistic };
  }, [leads, weightedForecast]);

  const maxScenario = useMemo(
    () => Math.max(scenarios.conservative, scenarios.mostLikely, scenarios.optimistic, 1),
    [scenarios]
  );

  const topDeals = useMemo(() => {
    const active = leads
      .filter((l) => l.status !== "CLOSED_WON" && l.status !== "CLOSED_LOST")
      .map((l) => ({
        ...l,
        name: `${l.firstName} ${l.lastName}`,
        probability: STAGE_PROBABILITY[l.status] * 100,
        weighted: l.value * STAGE_PROBABILITY[l.status],
        daysOpen: daysBetween(l.createdAt, now),
      }));

    active.sort((a, b) => {
      const key = topDealSort.key;
      const dir = topDealSort.dir === "asc" ? 1 : -1;
      const av = a[key] as number;
      const bv = b[key] as number;
      return (av - bv) * dir;
    });

    return active.slice(0, 10);
  }, [leads, now, topDealSort]);

  const repPerformance = useMemo(() => {
    const repMap: Record<
      string,
      { rep: string; deals: number; pipelineValue: number; weightedForecast: number; closedWon: number }
    > = {};

    leads.forEach((l) => {
      if (!repMap[l.assignedTo]) {
        repMap[l.assignedTo] = { rep: l.assignedTo, deals: 0, pipelineValue: 0, weightedForecast: 0, closedWon: 0 };
      }
      const r = repMap[l.assignedTo];
      r.deals++;
      if (l.status !== "CLOSED_WON" && l.status !== "CLOSED_LOST") {
        r.pipelineValue += l.value;
      }
      r.weightedForecast += l.value * STAGE_PROBABILITY[l.status];
      if (l.status === "CLOSED_WON") {
        r.closedWon += l.value;
      }
    });

    return Object.values(repMap).sort((a, b) => b.weightedForecast - a.weightedForecast);
  }, [leads]);

  const maxRepForecast = useMemo(
    () => Math.max(...repPerformance.map((r) => r.weightedForecast), 1),
    [repPerformance]
  );

  const forecastAccuracy = useMemo(
    () =>
      HISTORICAL_FORECAST.map((h) => {
        const diff = Math.abs(h.forecast - h.actual);
        const pctOff = h.actual > 0 ? (diff / h.actual) * 100 : 0;
        const accuracy = Math.max(0, 100 - pctOff);
        let color = "bg-green-500";
        if (pctOff > 40) color = "bg-red-500";
        else if (pctOff > 20) color = "bg-amber-500";
        return { ...h, pctOff, accuracy, color };
      }),
    []
  );

  function toggleSort(key: SortKey) {
    setTopDealSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }
    );
  }

  function SortIcon({ field }: { field: SortKey }) {
    if (topDealSort.key !== field) return <ArrowUpDown className="h-3 w-3 ml-1 inline opacity-40" />;
    return topDealSort.dir === "asc" ? (
      <ChevronUp className="h-3 w-3 ml-1 inline" />
    ) : (
      <ChevronDown className="h-3 w-3 ml-1 inline" />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Forecasting"
        description="Pipeline forecasting based on opportunities, leads, and historical sales data"
        icon={<TrendingUp className="h-6 w-6" />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={DollarSign}
          title="Pipeline Value"
          value={fmt(pipelineValue)}
          subtitle={`${leads.filter((l) => l.status !== "CLOSED_WON" && l.status !== "CLOSED_LOST").length} active deals`}
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatsCard
          icon={Target}
          title="Weighted Forecast"
          value={fmt(weightedForecast)}
          subtitle="Probability-adjusted"
          iconColor="bg-emerald-100 text-emerald-600"
        />
        <StatsCard
          icon={Award}
          title="Win Rate"
          value={`${winRate.toFixed(1)}%`}
          subtitle={`${leads.filter((l) => l.status === "CLOSED_WON").length} won / ${leads.filter((l) => l.status === "CLOSED_LOST").length} lost`}
          iconColor="bg-purple-100 text-purple-600"
        />
        <StatsCard
          icon={BarChart3}
          title="Avg Deal Size"
          value={fmt(avgDealSize)}
          subtitle="Closed won deals"
          iconColor="bg-orange-100 text-orange-600"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Forecast Summary by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Stage</th>
                  <th className="pb-3 font-medium text-right">Deals</th>
                  <th className="pb-3 font-medium text-right">Total Value</th>
                  <th className="pb-3 font-medium text-right">Weighted Value</th>
                  <th className="pb-3 font-medium text-right">Avg Days</th>
                  <th className="pb-3 font-medium text-right">Conversion Rate</th>
                </tr>
              </thead>
              <tbody>
                {stageSummary.map((row) => (
                  <tr key={row.stage} className="border-b last:border-0">
                    <td className="py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_COLORS[row.stage]}`}>
                        {row.stage.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 text-right font-medium">{row.count}</td>
                    <td className="py-3 text-right">{fmtFull(row.totalValue)}</td>
                    <td className="py-3 text-right font-medium">{fmtFull(row.weighted)}</td>
                    <td className="py-3 text-right">{row.avgDays}d</td>
                    <td className="py-3 text-right">
                      {row.stage !== "CLOSED_WON" && row.stage !== "CLOSED_LOST"
                        ? `${row.conversionRate.toFixed(1)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Monthly Revenue Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 mb-4 text-xs text-muted-foreground">
            <span className="inline-block w-3 h-3 rounded bg-emerald-500 mr-1" /> Committed
            <span className="inline-block w-3 h-3 rounded bg-blue-500 ml-3 mr-1" /> Best Case
            <span className="inline-block w-3 h-3 rounded bg-gray-300 ml-3 mr-1" /> Pipeline
          </div>
          <div className="space-y-3">
            {monthlyForecast.map((m) => {
              const total = m.committed + m.bestCase + m.pipeline;
              const committedPct = (m.committed / maxMonthly) * 100;
              const bestCasePct = (m.bestCase / maxMonthly) * 100;
              const pipelinePct = (m.pipeline / maxMonthly) * 100;
              return (
                <div key={m.label} className="flex items-center gap-3">
                  <span className="w-20 text-sm text-muted-foreground shrink-0">{m.label}</span>
                  <div className="flex-1 flex items-center h-7 rounded-md overflow-hidden bg-muted/30">
                    {committedPct > 0 && (
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${committedPct}%` }}
                      />
                    )}
                    {bestCasePct > 0 && (
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${bestCasePct}%` }}
                      />
                    )}
                    {pipelinePct > 0 && (
                      <div
                        className="h-full bg-gray-300 transition-all"
                        style={{ width: `${pipelinePct}%` }}
                      />
                    )}
                  </div>
                  <span className="w-20 text-sm font-medium text-right shrink-0">{fmt(total)}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Revenue Scenarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Conservative", value: scenarios.conservative, color: "bg-amber-500", desc: "Closed Won + 80% Negotiation" },
              { label: "Most Likely", value: scenarios.mostLikely, color: "bg-blue-500", desc: "Conservative + 50% Proposal + 25% Qualified" },
              { label: "Optimistic", value: scenarios.optimistic, color: "bg-emerald-500", desc: "All stages at probability weights" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">{s.label}</span>
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${s.color}`} />
                </div>
                <p className="text-2xl font-bold">{fmtFull(s.value)}</p>
                <div className="h-3 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${s.color} transition-all`}
                    style={{ width: `${(s.value / maxScenario) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Deals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Company</th>
                  <th className="pb-3 font-medium text-right cursor-pointer select-none" onClick={() => toggleSort("value")}>
                    Value <SortIcon field="value" />
                  </th>
                  <th className="pb-3 font-medium">Stage</th>
                  <th className="pb-3 font-medium text-right cursor-pointer select-none" onClick={() => toggleSort("probability")}>
                    Prob % <SortIcon field="probability" />
                  </th>
                  <th className="pb-3 font-medium text-right cursor-pointer select-none" onClick={() => toggleSort("weighted")}>
                    Weighted <SortIcon field="weighted" />
                  </th>
                  <th className="pb-3 font-medium">Assigned To</th>
                  <th className="pb-3 font-medium text-right cursor-pointer select-none" onClick={() => toggleSort("daysOpen")}>
                    Days Open <SortIcon field="daysOpen" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {topDeals.map((d) => (
                  <tr key={d.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="py-3 font-medium">{d.name}</td>
                    <td className="py-3 text-muted-foreground">{d.company}</td>
                    <td className="py-3 text-right">{fmtFull(d.value)}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_COLORS[d.status]}`}>
                        {d.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 text-right">{d.probability}%</td>
                    <td className="py-3 text-right font-medium">{fmtFull(d.weighted)}</td>
                    <td className="py-3 text-muted-foreground">{d.assignedTo}</td>
                    <td className="py-3 text-right">{d.daysOpen}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" /> Rep Performance Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Rep</th>
                  <th className="pb-3 font-medium text-right">Deals</th>
                  <th className="pb-3 font-medium text-right">Pipeline Value</th>
                  <th className="pb-3 font-medium text-right">Weighted Forecast</th>
                  <th className="pb-3 font-medium text-right">Closed Won</th>
                  <th className="pb-3 font-medium w-48">Forecast Bar</th>
                </tr>
              </thead>
              <tbody>
                {repPerformance.map((r) => (
                  <tr key={r.rep} className="border-b last:border-0">
                    <td className="py-3 font-medium">{r.rep}</td>
                    <td className="py-3 text-right">{r.deals}</td>
                    <td className="py-3 text-right">{fmtFull(r.pipelineValue)}</td>
                    <td className="py-3 text-right font-medium">{fmtFull(r.weightedForecast)}</td>
                    <td className="py-3 text-right text-emerald-600 font-medium">{fmtFull(r.closedWon)}</td>
                    <td className="py-3">
                      <div className="h-5 rounded bg-muted/40 overflow-hidden">
                        <div
                          className="h-full rounded bg-blue-500 transition-all"
                          style={{ width: `${(r.weightedForecast / maxRepForecast) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Forecast Accuracy (Historical)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Month</th>
                  <th className="pb-3 font-medium text-right">Forecast</th>
                  <th className="pb-3 font-medium text-right">Actual</th>
                  <th className="pb-3 font-medium text-right">Variance</th>
                  <th className="pb-3 font-medium text-right">Accuracy</th>
                  <th className="pb-3 font-medium w-40">Rating</th>
                </tr>
              </thead>
              <tbody>
                {forecastAccuracy.map((h) => (
                  <tr key={h.month} className="border-b last:border-0">
                    <td className="py-3 font-medium">{h.month}</td>
                    <td className="py-3 text-right">{fmtFull(h.forecast)}</td>
                    <td className="py-3 text-right">{fmtFull(h.actual)}</td>
                    <td className="py-3 text-right">
                      <span className={h.forecast > h.actual ? "text-red-500" : "text-emerald-600"}>
                        {h.forecast > h.actual ? "-" : "+"}
                        {fmtFull(Math.abs(h.actual - h.forecast))}
                      </span>
                    </td>
                    <td className="py-3 text-right font-medium">{h.accuracy.toFixed(1)}%</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-3 rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${h.color} transition-all`}
                            style={{ width: `${h.accuracy}%` }}
                          />
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            h.pctOff <= 20 ? "text-green-600" : h.pctOff <= 40 ? "text-amber-600" : "text-red-600"
                          }`}
                        >
                          {h.pctOff <= 20 ? "Good" : h.pctOff <= 40 ? "Fair" : "Poor"}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
