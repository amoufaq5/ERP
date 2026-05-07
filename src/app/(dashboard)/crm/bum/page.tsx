"use client";

import { useState, useMemo } from "react";
import { Crown, Users, DollarSign, TrendingUp, TrendingDown, Plus, ArrowUp, ArrowDown, Minus } from "lucide-react";
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

// ─── P&L Seed Data (Pharmaceutical BU in EGP) ──────────────────────────────

interface PLLineItem {
  category: string;
  lineItem: string;
  currentMonth: number;
  priorMonth: number;
  budget: number;
  ytd: number;
  ytdBudget: number;
}

const PL_REVENUE: PLLineItem[] = [
  { category: "Revenue", lineItem: "Cardiovascular Line", currentMonth: 1850000, priorMonth: 1720000, budget: 1900000, ytd: 7240000, ytdBudget: 7600000 },
  { category: "Revenue", lineItem: "Diabetes Line", currentMonth: 1420000, priorMonth: 1380000, budget: 1500000, ytd: 5680000, ytdBudget: 6000000 },
  { category: "Revenue", lineItem: "Primary Care Line", currentMonth: 980000, priorMonth: 910000, budget: 1050000, ytd: 3820000, ytdBudget: 4200000 },
  { category: "Revenue", lineItem: "Oncology Line", currentMonth: 620000, priorMonth: 540000, budget: 700000, ytd: 2380000, ytdBudget: 2800000 },
  { category: "Revenue", lineItem: "Specialty & Rare Diseases", currentMonth: 330000, priorMonth: 290000, budget: 350000, ytd: 1260000, ytdBudget: 1400000 },
];

const PL_COGS: PLLineItem[] = [
  { category: "COGS", lineItem: "Raw Materials & APIs", currentMonth: 1248000, priorMonth: 1176000, budget: 1280000, ytd: 4896000, ytdBudget: 5120000 },
  { category: "COGS", lineItem: "Manufacturing & Packaging", currentMonth: 468000, priorMonth: 442000, budget: 480000, ytd: 1836000, ytdBudget: 1920000 },
  { category: "COGS", lineItem: "Quality Control & Testing", currentMonth: 156000, priorMonth: 148000, budget: 160000, ytd: 612000, ytdBudget: 640000 },
  { category: "COGS", lineItem: "Warehousing & Distribution", currentMonth: 208000, priorMonth: 196000, budget: 220000, ytd: 816000, ytdBudget: 880000 },
];

const PL_OPEX: PLLineItem[] = [
  { category: "OpEx", lineItem: "Sales Rep Salaries & Commissions", currentMonth: 520000, priorMonth: 510000, budget: 530000, ytd: 2060000, ytdBudget: 2120000 },
  { category: "OpEx", lineItem: "Marketing & Promotions", currentMonth: 310000, priorMonth: 285000, budget: 350000, ytd: 1210000, ytdBudget: 1400000 },
  { category: "OpEx", lineItem: "Medical Samples & Literature", currentMonth: 145000, priorMonth: 138000, budget: 160000, ytd: 572000, ytdBudget: 640000 },
  { category: "OpEx", lineItem: "Travel & Field Expenses", currentMonth: 178000, priorMonth: 165000, budget: 190000, ytd: 698000, ytdBudget: 760000 },
  { category: "OpEx", lineItem: "Conferences & CME Events", currentMonth: 95000, priorMonth: 72000, budget: 120000, ytd: 362000, ytdBudget: 480000 },
  { category: "OpEx", lineItem: "R&D Contribution", currentMonth: 260000, priorMonth: 260000, budget: 260000, ytd: 1040000, ytdBudget: 1040000 },
  { category: "OpEx", lineItem: "Admin & Overhead Allocation", currentMonth: 185000, priorMonth: 182000, budget: 190000, ytd: 738000, ytdBudget: 760000 },
];

function formatEGP(amount: number): string {
  const val = amount ?? 0;
  if (Math.abs(val) >= 1000000) {
    return `EGP ${(val / 1000000).toFixed(2)}M`;
  }
  if (Math.abs(val) >= 1000) {
    return `EGP ${(val / 1000).toFixed(0)}K`;
  }
  return `EGP ${val.toLocaleString()}`;
}

function formatEGPFull(amount: number): string {
  return `EGP ${(amount ?? 0).toLocaleString()}`;
}

function pctChange(current: number, prior: number): number {
  if (prior === 0) return 0;
  return Math.round(((current - prior) / prior) * 100);
}

function variancePct(actual: number, budget: number): number {
  if (budget === 0) return 0;
  return Math.round(((actual - budget) / budget) * 100);
}

function VarianceIndicator({ actual, budget, inverse = false }: { actual: number; budget: number; inverse?: boolean }) {
  const vPct = variancePct(actual, budget);
  const isGood = inverse ? vPct <= 0 : vPct >= 0;
  const color = isGood ? "text-green-600" : "text-red-600";
  const icon = vPct > 0 ? <ArrowUp className="h-3 w-3 inline" /> : vPct < 0 ? <ArrowDown className="h-3 w-3 inline" /> : <Minus className="h-3 w-3 inline" />;
  return (
    <span className={`text-xs font-medium ${color}`}>
      {icon} {vPct > 0 ? "+" : ""}{vPct}%
    </span>
  );
}

function MoMIndicator({ current, prior, inverse = false }: { current: number; prior: number; inverse?: boolean }) {
  const change = pctChange(current, prior);
  const isGood = inverse ? change <= 0 : change >= 0;
  const color = isGood ? "text-green-600" : "text-red-600";
  const icon = change > 0 ? <ArrowUp className="h-3 w-3 inline" /> : change < 0 ? <ArrowDown className="h-3 w-3 inline" /> : <Minus className="h-3 w-3 inline" />;
  return (
    <span className={`text-xs font-medium ${color}`}>
      {icon} {change > 0 ? "+" : ""}{change}%
    </span>
  );
}

// ─── P&L Tab Component ──────────────────────────────────────────────────────

function PLTab() {
  const [viewMode, setViewMode] = useState<"summary" | "detailed">("summary");

  // Totals
  const totalRevenueCurrent = PL_REVENUE.reduce((s, r) => s + r.currentMonth, 0);
  const totalRevenuePrior = PL_REVENUE.reduce((s, r) => s + r.priorMonth, 0);
  const totalRevenueBudget = PL_REVENUE.reduce((s, r) => s + r.budget, 0);
  const totalRevenueYTD = PL_REVENUE.reduce((s, r) => s + r.ytd, 0);
  const totalRevenueYTDBudget = PL_REVENUE.reduce((s, r) => s + r.ytdBudget, 0);

  const totalCOGSCurrent = PL_COGS.reduce((s, r) => s + r.currentMonth, 0);
  const totalCOGSPrior = PL_COGS.reduce((s, r) => s + r.priorMonth, 0);
  const totalCOGSBudget = PL_COGS.reduce((s, r) => s + r.budget, 0);
  const totalCOGSYTD = PL_COGS.reduce((s, r) => s + r.ytd, 0);
  const totalCOGSYTDBudget = PL_COGS.reduce((s, r) => s + r.ytdBudget, 0);

  const grossProfitCurrent = totalRevenueCurrent - totalCOGSCurrent;
  const grossProfitPrior = totalRevenuePrior - totalCOGSPrior;
  const grossProfitBudget = totalRevenueBudget - totalCOGSBudget;
  const grossProfitYTD = totalRevenueYTD - totalCOGSYTD;
  const grossProfitYTDBudget = totalRevenueYTDBudget - totalCOGSYTDBudget;

  const totalOpExCurrent = PL_OPEX.reduce((s, r) => s + r.currentMonth, 0);
  const totalOpExPrior = PL_OPEX.reduce((s, r) => s + r.priorMonth, 0);
  const totalOpExBudget = PL_OPEX.reduce((s, r) => s + r.budget, 0);
  const totalOpExYTD = PL_OPEX.reduce((s, r) => s + r.ytd, 0);
  const totalOpExYTDBudget = PL_OPEX.reduce((s, r) => s + r.ytdBudget, 0);

  const operatingProfitCurrent = grossProfitCurrent - totalOpExCurrent;
  const operatingProfitPrior = grossProfitPrior - totalOpExPrior;
  const operatingProfitBudget = grossProfitBudget - totalOpExBudget;
  const operatingProfitYTD = grossProfitYTD - totalOpExYTD;
  const operatingProfitYTDBudget = grossProfitYTDBudget - totalOpExYTDBudget;

  const grossMarginCurrent = totalRevenueCurrent > 0 ? Math.round((grossProfitCurrent / totalRevenueCurrent) * 100) : 0;
  const operatingMarginCurrent = totalRevenueCurrent > 0 ? Math.round((operatingProfitCurrent / totalRevenueCurrent) * 100) : 0;
  const netMarginCurrent = operatingMarginCurrent; // simplified: no tax/interest in BU P&L

  // Revenue breakdown percentages
  const revenueBreakdown = PL_REVENUE.map((r) => ({
    ...r,
    pctOfTotal: totalRevenueCurrent > 0 ? Math.round((r.currentMonth / totalRevenueCurrent) * 100) : 0,
  }));

  // All line items for detailed table
  type PLRow = {
    id: string;
    section: string;
    lineItem: string;
    currentMonth: number;
    priorMonth: number;
    momChange: number;
    budget: number;
    variance: number;
    ytd: number;
    ytdBudget: number;
    ytdVariance: number;
    isSubtotal?: boolean;
    isBold?: boolean;
  };

  const detailedRows: PLRow[] = useMemo(() => {
    const rows: PLRow[] = [];

    // Revenue
    PL_REVENUE.forEach((r, i) => {
      rows.push({
        id: `rev-${i}`,
        section: "Revenue",
        lineItem: r.lineItem,
        currentMonth: r.currentMonth,
        priorMonth: r.priorMonth,
        momChange: pctChange(r.currentMonth, r.priorMonth),
        budget: r.budget,
        variance: variancePct(r.currentMonth, r.budget),
        ytd: r.ytd,
        ytdBudget: r.ytdBudget,
        ytdVariance: variancePct(r.ytd, r.ytdBudget),
      });
    });
    rows.push({
      id: "rev-total",
      section: "Revenue",
      lineItem: "Total Revenue",
      currentMonth: totalRevenueCurrent,
      priorMonth: totalRevenuePrior,
      momChange: pctChange(totalRevenueCurrent, totalRevenuePrior),
      budget: totalRevenueBudget,
      variance: variancePct(totalRevenueCurrent, totalRevenueBudget),
      ytd: totalRevenueYTD,
      ytdBudget: totalRevenueYTDBudget,
      ytdVariance: variancePct(totalRevenueYTD, totalRevenueYTDBudget),
      isSubtotal: true,
      isBold: true,
    });

    // COGS
    PL_COGS.forEach((r, i) => {
      rows.push({
        id: `cogs-${i}`,
        section: "COGS",
        lineItem: r.lineItem,
        currentMonth: r.currentMonth,
        priorMonth: r.priorMonth,
        momChange: pctChange(r.currentMonth, r.priorMonth),
        budget: r.budget,
        variance: variancePct(r.currentMonth, r.budget),
        ytd: r.ytd,
        ytdBudget: r.ytdBudget,
        ytdVariance: variancePct(r.ytd, r.ytdBudget),
      });
    });
    rows.push({
      id: "cogs-total",
      section: "COGS",
      lineItem: "Total COGS",
      currentMonth: totalCOGSCurrent,
      priorMonth: totalCOGSPrior,
      momChange: pctChange(totalCOGSCurrent, totalCOGSPrior),
      budget: totalCOGSBudget,
      variance: variancePct(totalCOGSCurrent, totalCOGSBudget),
      ytd: totalCOGSYTD,
      ytdBudget: totalCOGSYTDBudget,
      ytdVariance: variancePct(totalCOGSYTD, totalCOGSYTDBudget),
      isSubtotal: true,
      isBold: true,
    });

    // Gross Profit
    rows.push({
      id: "gross-profit",
      section: "Gross Profit",
      lineItem: "Gross Profit",
      currentMonth: grossProfitCurrent,
      priorMonth: grossProfitPrior,
      momChange: pctChange(grossProfitCurrent, grossProfitPrior),
      budget: grossProfitBudget,
      variance: variancePct(grossProfitCurrent, grossProfitBudget),
      ytd: grossProfitYTD,
      ytdBudget: grossProfitYTDBudget,
      ytdVariance: variancePct(grossProfitYTD, grossProfitYTDBudget),
      isSubtotal: true,
      isBold: true,
    });

    // OpEx
    PL_OPEX.forEach((r, i) => {
      rows.push({
        id: `opex-${i}`,
        section: "Operating Expenses",
        lineItem: r.lineItem,
        currentMonth: r.currentMonth,
        priorMonth: r.priorMonth,
        momChange: pctChange(r.currentMonth, r.priorMonth),
        budget: r.budget,
        variance: variancePct(r.currentMonth, r.budget),
        ytd: r.ytd,
        ytdBudget: r.ytdBudget,
        ytdVariance: variancePct(r.ytd, r.ytdBudget),
      });
    });
    rows.push({
      id: "opex-total",
      section: "Operating Expenses",
      lineItem: "Total Operating Expenses",
      currentMonth: totalOpExCurrent,
      priorMonth: totalOpExPrior,
      momChange: pctChange(totalOpExCurrent, totalOpExPrior),
      budget: totalOpExBudget,
      variance: variancePct(totalOpExCurrent, totalOpExBudget),
      ytd: totalOpExYTD,
      ytdBudget: totalOpExYTDBudget,
      ytdVariance: variancePct(totalOpExYTD, totalOpExYTDBudget),
      isSubtotal: true,
      isBold: true,
    });

    // Operating Profit
    rows.push({
      id: "operating-profit",
      section: "Operating Profit",
      lineItem: "Operating Profit (EBIT)",
      currentMonth: operatingProfitCurrent,
      priorMonth: operatingProfitPrior,
      momChange: pctChange(operatingProfitCurrent, operatingProfitPrior),
      budget: operatingProfitBudget,
      variance: variancePct(operatingProfitCurrent, operatingProfitBudget),
      ytd: operatingProfitYTD,
      ytdBudget: operatingProfitYTDBudget,
      ytdVariance: variancePct(operatingProfitYTD, operatingProfitYTDBudget),
      isSubtotal: true,
      isBold: true,
    });

    return rows;
  }, []);

  return (
    <div className="space-y-6">
      {/* P&L KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={DollarSign}
          title="Total Revenue"
          value={formatEGP(totalRevenueCurrent)}
          subtitle="This month"
          change={pctChange(totalRevenueCurrent, totalRevenuePrior)}
          changeLabel="vs prior month"
          iconColor="bg-blue-100 text-blue-700"
        />
        <StatsCard
          icon={TrendingUp}
          title="Gross Margin"
          value={`${grossMarginCurrent}%`}
          subtitle={formatEGP(grossProfitCurrent)}
          iconColor="bg-green-100 text-green-700"
        />
        <StatsCard
          icon={TrendingUp}
          title="Operating Margin"
          value={`${operatingMarginCurrent}%`}
          subtitle={formatEGP(operatingProfitCurrent)}
          iconColor="bg-purple-100 text-purple-700"
        />
        <StatsCard
          icon={DollarSign}
          title="Budget Variance"
          value={`${variancePct(totalRevenueCurrent, totalRevenueBudget) >= 0 ? "+" : ""}${variancePct(totalRevenueCurrent, totalRevenueBudget)}%`}
          subtitle="Revenue vs budget"
          iconColor="bg-amber-100 text-amber-700"
        />
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <Button variant={viewMode === "summary" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("summary")}>Summary View</Button>
        <Button variant={viewMode === "detailed" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("detailed")}>Detailed View</Button>
      </div>

      {viewMode === "summary" ? (
        <div className="space-y-6">
          {/* Revenue Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue by Product Line</CardTitle>
              <CardDescription>Current month breakdown with % of total</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {revenueBreakdown.map((r, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.lineItem}</span>
                      <Badge variant="outline" className="text-[10px]">{r.pctOfTotal}%</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{formatEGP(r.currentMonth)}</span>
                      <MoMIndicator current={r.currentMonth} prior={r.priorMonth} />
                      <VarianceIndicator actual={r.currentMonth} budget={r.budget} />
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${r.pctOfTotal}%` }} />
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t flex justify-between text-sm font-bold">
                <span>Total Revenue</span>
                <span>{formatEGPFull(totalRevenueCurrent)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Simplified P&L Statement */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">P&L Statement (Current Month)</CardTitle>
              <CardDescription>Revenue - COGS = Gross Profit - OpEx = Operating Profit</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left p-3 font-semibold">Line Item</th>
                      <th className="text-right p-3 font-semibold">Current Month</th>
                      <th className="text-right p-3 font-semibold">Prior Month</th>
                      <th className="text-right p-3 font-semibold">MoM</th>
                      <th className="text-right p-3 font-semibold">Budget</th>
                      <th className="text-right p-3 font-semibold">vs Budget</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b font-semibold bg-blue-50 dark:bg-blue-900/10">
                      <td className="p-3">Total Revenue</td>
                      <td className="p-3 text-right">{formatEGPFull(totalRevenueCurrent)}</td>
                      <td className="p-3 text-right">{formatEGPFull(totalRevenuePrior)}</td>
                      <td className="p-3 text-right"><MoMIndicator current={totalRevenueCurrent} prior={totalRevenuePrior} /></td>
                      <td className="p-3 text-right">{formatEGPFull(totalRevenueBudget)}</td>
                      <td className="p-3 text-right"><VarianceIndicator actual={totalRevenueCurrent} budget={totalRevenueBudget} /></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 text-red-600">Less: Cost of Goods Sold</td>
                      <td className="p-3 text-right text-red-600">({formatEGPFull(totalCOGSCurrent)})</td>
                      <td className="p-3 text-right text-red-600">({formatEGPFull(totalCOGSPrior)})</td>
                      <td className="p-3 text-right"><MoMIndicator current={totalCOGSCurrent} prior={totalCOGSPrior} inverse /></td>
                      <td className="p-3 text-right text-red-600">({formatEGPFull(totalCOGSBudget)})</td>
                      <td className="p-3 text-right"><VarianceIndicator actual={totalCOGSCurrent} budget={totalCOGSBudget} inverse /></td>
                    </tr>
                    <tr className="border-b font-bold bg-green-50 dark:bg-green-900/10">
                      <td className="p-3">Gross Profit <span className="text-xs font-normal text-muted-foreground ml-1">({grossMarginCurrent}% margin)</span></td>
                      <td className="p-3 text-right text-green-700">{formatEGPFull(grossProfitCurrent)}</td>
                      <td className="p-3 text-right">{formatEGPFull(grossProfitPrior)}</td>
                      <td className="p-3 text-right"><MoMIndicator current={grossProfitCurrent} prior={grossProfitPrior} /></td>
                      <td className="p-3 text-right">{formatEGPFull(grossProfitBudget)}</td>
                      <td className="p-3 text-right"><VarianceIndicator actual={grossProfitCurrent} budget={grossProfitBudget} /></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 text-red-600">Less: Operating Expenses</td>
                      <td className="p-3 text-right text-red-600">({formatEGPFull(totalOpExCurrent)})</td>
                      <td className="p-3 text-right text-red-600">({formatEGPFull(totalOpExPrior)})</td>
                      <td className="p-3 text-right"><MoMIndicator current={totalOpExCurrent} prior={totalOpExPrior} inverse /></td>
                      <td className="p-3 text-right text-red-600">({formatEGPFull(totalOpExBudget)})</td>
                      <td className="p-3 text-right"><VarianceIndicator actual={totalOpExCurrent} budget={totalOpExBudget} inverse /></td>
                    </tr>
                    <tr className="font-bold bg-purple-50 dark:bg-purple-900/10">
                      <td className="p-3">Operating Profit (EBIT) <span className="text-xs font-normal text-muted-foreground ml-1">({operatingMarginCurrent}% margin)</span></td>
                      <td className="p-3 text-right text-purple-700">{formatEGPFull(operatingProfitCurrent)}</td>
                      <td className="p-3 text-right">{formatEGPFull(operatingProfitPrior)}</td>
                      <td className="p-3 text-right"><MoMIndicator current={operatingProfitCurrent} prior={operatingProfitPrior} /></td>
                      <td className="p-3 text-right">{formatEGPFull(operatingProfitBudget)}</td>
                      <td className="p-3 text-right"><VarianceIndicator actual={operatingProfitCurrent} budget={operatingProfitBudget} /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Cost Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">COGS Breakdown</CardTitle>
                <CardDescription>Cost of Goods Sold components</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {PL_COGS.map((c, i) => {
                  const pct = totalCOGSCurrent > 0 ? Math.round((c.currentMonth / totalCOGSCurrent) * 100) : 0;
                  return (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="truncate">{c.lineItem}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">{pct}%</Badge>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-medium">{formatEGP(c.currentMonth)}</span>
                        <VarianceIndicator actual={c.currentMonth} budget={c.budget} inverse />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">OpEx Breakdown</CardTitle>
                <CardDescription>Operating expenses by category</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {PL_OPEX.map((o, i) => {
                  const pct = totalOpExCurrent > 0 ? Math.round((o.currentMonth / totalOpExCurrent) * 100) : 0;
                  return (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="truncate">{o.lineItem}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">{pct}%</Badge>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-medium">{formatEGP(o.currentMonth)}</span>
                        <VarianceIndicator actual={o.currentMonth} budget={o.budget} inverse />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* YTD Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">YTD Budget vs Actual</CardTitle>
              <CardDescription>Year-to-date performance against budget</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: "Revenue", actual: totalRevenueYTD, budget: totalRevenueYTDBudget, color: "bg-blue-500", inverse: false },
                  { label: "COGS", actual: totalCOGSYTD, budget: totalCOGSYTDBudget, color: "bg-red-400", inverse: true },
                  { label: "Gross Profit", actual: grossProfitYTD, budget: grossProfitYTDBudget, color: "bg-green-500", inverse: false },
                  { label: "OpEx", actual: totalOpExYTD, budget: totalOpExYTDBudget, color: "bg-amber-500", inverse: true },
                  { label: "Operating Profit", actual: operatingProfitYTD, budget: operatingProfitYTDBudget, color: "bg-purple-500", inverse: false },
                ].map((item, i) => {
                  const pct = item.budget > 0 ? Math.round((item.actual / item.budget) * 100) : 0;
                  const isGood = item.inverse ? pct <= 100 : pct >= 100;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">Budget: {formatEGP(item.budget)}</span>
                          <span className="font-semibold">Actual: {formatEGP(item.actual)}</span>
                          <Badge variant={isGood ? "success" : "destructive"} className="text-[10px]">{pct}%</Badge>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Detailed View */
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detailed P&L Statement</CardTitle>
            <CardDescription>Full breakdown with all line items, MoM comparison, and budget variance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left p-3 font-semibold">Section</th>
                    <th className="text-left p-3 font-semibold">Line Item</th>
                    <th className="text-right p-3 font-semibold">Current Month</th>
                    <th className="text-right p-3 font-semibold">Prior Month</th>
                    <th className="text-right p-3 font-semibold">MoM</th>
                    <th className="text-right p-3 font-semibold">Budget</th>
                    <th className="text-right p-3 font-semibold">Var %</th>
                    <th className="text-right p-3 font-semibold">YTD</th>
                    <th className="text-right p-3 font-semibold">YTD Budget</th>
                    <th className="text-right p-3 font-semibold">YTD Var %</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedRows.map((row) => {
                    const isCost = row.section === "COGS" || row.section === "Operating Expenses";
                    return (
                      <tr key={row.id} className={`border-b ${row.isSubtotal ? "bg-muted/30" : ""} ${row.isBold ? "font-bold" : ""}`}>
                        <td className="p-3 text-muted-foreground text-xs">{row.isSubtotal ? "" : row.section}</td>
                        <td className={`p-3 ${row.isBold ? "font-bold" : ""}`}>{row.lineItem}</td>
                        <td className="p-3 text-right">{formatEGPFull(row.currentMonth)}</td>
                        <td className="p-3 text-right text-muted-foreground">{formatEGPFull(row.priorMonth)}</td>
                        <td className="p-3 text-right">
                          <MoMIndicator current={row.currentMonth} prior={row.priorMonth} inverse={isCost} />
                        </td>
                        <td className="p-3 text-right">{formatEGPFull(row.budget)}</td>
                        <td className="p-3 text-right">
                          <VarianceIndicator actual={row.currentMonth} budget={row.budget} inverse={isCost} />
                        </td>
                        <td className="p-3 text-right">{formatEGPFull(row.ytd)}</td>
                        <td className="p-3 text-right text-muted-foreground">{formatEGPFull(row.ytdBudget)}</td>
                        <td className="p-3 text-right">
                          <VarianceIndicator actual={row.ytd} budget={row.ytdBudget} inverse={isCost} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Margin Summary Footer */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap justify-center gap-8 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Gross Margin</div>
              <div className="text-2xl font-bold text-green-600">{grossMarginCurrent}%</div>
            </div>
            <div className="border-l pl-8">
              <div className="text-xs text-muted-foreground">Operating Margin</div>
              <div className="text-2xl font-bold text-purple-600">{operatingMarginCurrent}%</div>
            </div>
            <div className="border-l pl-8">
              <div className="text-xs text-muted-foreground">Net Margin</div>
              <div className="text-2xl font-bold text-blue-600">{netMarginCurrent}%</div>
            </div>
            <div className="border-l pl-8">
              <div className="text-xs text-muted-foreground">COGS Ratio</div>
              <div className="text-2xl font-bold text-red-500">{totalRevenueCurrent > 0 ? Math.round((totalCOGSCurrent / totalRevenueCurrent) * 100) : 0}%</div>
            </div>
            <div className="border-l pl-8">
              <div className="text-xs text-muted-foreground">OpEx Ratio</div>
              <div className="text-2xl font-bold text-amber-600">{totalRevenueCurrent > 0 ? Math.round((totalOpExCurrent / totalRevenueCurrent) * 100) : 0}%</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
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
          <TabsTrigger value="pnl">P&L</TabsTrigger>
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

        <TabsContent value="pnl">
          <PLTab />
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
