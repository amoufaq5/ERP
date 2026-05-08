"use client";

import { useState, useMemo } from "react";
import { DollarSign, TrendingUp, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StatsCard from "@/components/shared/stats-card";

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
  if (Math.abs(val) >= 1000000) return `EGP ${(val / 1000000).toFixed(2)}M`;
  if (Math.abs(val) >= 1000) return `EGP ${(val / 1000).toFixed(0)}K`;
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

export default function PLStatement() {
  const [viewMode, setViewMode] = useState<"summary" | "detailed">("summary");

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
  const netMarginCurrent = operatingMarginCurrent;

  const revenueBreakdown = PL_REVENUE.map((r) => ({
    ...r,
    pctOfTotal: totalRevenueCurrent > 0 ? Math.round((r.currentMonth / totalRevenueCurrent) * 100) : 0,
  }));

  type PLRow = {
    id: string; section: string; lineItem: string;
    currentMonth: number; priorMonth: number; momChange: number;
    budget: number; variance: number;
    ytd: number; ytdBudget: number; ytdVariance: number;
    isSubtotal?: boolean; isBold?: boolean;
  };

  const detailedRows: PLRow[] = useMemo(() => {
    const rows: PLRow[] = [];
    PL_REVENUE.forEach((r, i) => {
      rows.push({ id: `rev-${i}`, section: "Revenue", lineItem: r.lineItem, currentMonth: r.currentMonth, priorMonth: r.priorMonth, momChange: pctChange(r.currentMonth, r.priorMonth), budget: r.budget, variance: variancePct(r.currentMonth, r.budget), ytd: r.ytd, ytdBudget: r.ytdBudget, ytdVariance: variancePct(r.ytd, r.ytdBudget) });
    });
    rows.push({ id: "rev-total", section: "Revenue", lineItem: "Total Revenue", currentMonth: totalRevenueCurrent, priorMonth: totalRevenuePrior, momChange: pctChange(totalRevenueCurrent, totalRevenuePrior), budget: totalRevenueBudget, variance: variancePct(totalRevenueCurrent, totalRevenueBudget), ytd: totalRevenueYTD, ytdBudget: totalRevenueYTDBudget, ytdVariance: variancePct(totalRevenueYTD, totalRevenueYTDBudget), isSubtotal: true, isBold: true });
    PL_COGS.forEach((r, i) => {
      rows.push({ id: `cogs-${i}`, section: "COGS", lineItem: r.lineItem, currentMonth: r.currentMonth, priorMonth: r.priorMonth, momChange: pctChange(r.currentMonth, r.priorMonth), budget: r.budget, variance: variancePct(r.currentMonth, r.budget), ytd: r.ytd, ytdBudget: r.ytdBudget, ytdVariance: variancePct(r.ytd, r.ytdBudget) });
    });
    rows.push({ id: "cogs-total", section: "COGS", lineItem: "Total COGS", currentMonth: totalCOGSCurrent, priorMonth: totalCOGSPrior, momChange: pctChange(totalCOGSCurrent, totalCOGSPrior), budget: totalCOGSBudget, variance: variancePct(totalCOGSCurrent, totalCOGSBudget), ytd: totalCOGSYTD, ytdBudget: totalCOGSYTDBudget, ytdVariance: variancePct(totalCOGSYTD, totalCOGSYTDBudget), isSubtotal: true, isBold: true });
    rows.push({ id: "gross-profit", section: "Gross Profit", lineItem: "Gross Profit", currentMonth: grossProfitCurrent, priorMonth: grossProfitPrior, momChange: pctChange(grossProfitCurrent, grossProfitPrior), budget: grossProfitBudget, variance: variancePct(grossProfitCurrent, grossProfitBudget), ytd: grossProfitYTD, ytdBudget: grossProfitYTDBudget, ytdVariance: variancePct(grossProfitYTD, grossProfitYTDBudget), isSubtotal: true, isBold: true });
    PL_OPEX.forEach((r, i) => {
      rows.push({ id: `opex-${i}`, section: "Operating Expenses", lineItem: r.lineItem, currentMonth: r.currentMonth, priorMonth: r.priorMonth, momChange: pctChange(r.currentMonth, r.priorMonth), budget: r.budget, variance: variancePct(r.currentMonth, r.budget), ytd: r.ytd, ytdBudget: r.ytdBudget, ytdVariance: variancePct(r.ytd, r.ytdBudget) });
    });
    rows.push({ id: "opex-total", section: "Operating Expenses", lineItem: "Total Operating Expenses", currentMonth: totalOpExCurrent, priorMonth: totalOpExPrior, momChange: pctChange(totalOpExCurrent, totalOpExPrior), budget: totalOpExBudget, variance: variancePct(totalOpExCurrent, totalOpExBudget), ytd: totalOpExYTD, ytdBudget: totalOpExYTDBudget, ytdVariance: variancePct(totalOpExYTD, totalOpExYTDBudget), isSubtotal: true, isBold: true });
    rows.push({ id: "operating-profit", section: "Operating Profit", lineItem: "Operating Profit (EBIT)", currentMonth: operatingProfitCurrent, priorMonth: operatingProfitPrior, momChange: pctChange(operatingProfitCurrent, operatingProfitPrior), budget: operatingProfitBudget, variance: variancePct(operatingProfitCurrent, operatingProfitBudget), ytd: operatingProfitYTD, ytdBudget: operatingProfitYTDBudget, ytdVariance: variancePct(operatingProfitYTD, operatingProfitYTDBudget), isSubtotal: true, isBold: true });
    return rows;
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={DollarSign} title="Total Revenue" value={formatEGP(totalRevenueCurrent)} subtitle="This month" change={pctChange(totalRevenueCurrent, totalRevenuePrior)} changeLabel="vs prior month" iconColor="bg-blue-100 text-blue-700" />
        <StatsCard icon={TrendingUp} title="Gross Margin" value={`${grossMarginCurrent}%`} subtitle={formatEGP(grossProfitCurrent)} iconColor="bg-green-100 text-green-700" />
        <StatsCard icon={TrendingUp} title="Operating Margin" value={`${operatingMarginCurrent}%`} subtitle={formatEGP(operatingProfitCurrent)} iconColor="bg-purple-100 text-purple-700" />
        <StatsCard icon={DollarSign} title="Budget Variance" value={`${variancePct(totalRevenueCurrent, totalRevenueBudget) >= 0 ? "+" : ""}${variancePct(totalRevenueCurrent, totalRevenueBudget)}%`} subtitle="Revenue vs budget" iconColor="bg-amber-100 text-amber-700" />
      </div>

      <div className="flex items-center gap-2">
        <Button variant={viewMode === "summary" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("summary")}>Summary View</Button>
        <Button variant={viewMode === "detailed" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("detailed")}>Detailed View</Button>
      </div>

      {viewMode === "summary" ? (
        <div className="space-y-6">
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
                          <Badge variant={isGood ? "default" : "destructive"} className="text-[10px]">{pct}%</Badge>
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
                        <td className="p-3 text-right"><MoMIndicator current={row.currentMonth} prior={row.priorMonth} inverse={isCost} /></td>
                        <td className="p-3 text-right">{formatEGPFull(row.budget)}</td>
                        <td className="p-3 text-right"><VarianceIndicator actual={row.currentMonth} budget={row.budget} inverse={isCost} /></td>
                        <td className="p-3 text-right">{formatEGPFull(row.ytd)}</td>
                        <td className="p-3 text-right text-muted-foreground">{formatEGPFull(row.ytdBudget)}</td>
                        <td className="p-3 text-right"><VarianceIndicator actual={row.ytd} budget={row.ytdBudget} inverse={isCost} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

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
