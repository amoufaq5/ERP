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

const HIERARCHY = [
  {
    marketeer: "Khaled Sherif", region: "North Region",
    dms: [
      { name: "Hany Mansour", district: "Greater Cairo", reps: 8, doctors: 320 },
      { name: "Lina Habib", district: "Alexandria & Coast", reps: 7, doctors: 240 },
    ],
  },
  {
    marketeer: "Mariam Adly", region: "South Region",
    dms: [
      { name: "Tamer Wahid", district: "Upper Egypt", reps: 5, doctors: 168 },
      { name: "Sameh Helmy", district: "Red Sea Zone", reps: 4, doctors: 110 },
    ],
  },
  {
    marketeer: "Hossam Bahgat", region: "East Region",
    dms: [
      { name: "Reem Saleh", district: "Delta Region", reps: 6, doctors: 215 },
      { name: "Adel Mounir", district: "Canal Cities", reps: 4, doctors: 95 },
    ],
  },
  {
    marketeer: "Yasmine Galal", region: "West Region",
    dms: [
      { name: "Walid Anwar", district: "Marsa & Oases", reps: 3, doctors: 75 },
      { name: "Hala Lotfy", district: "New Cities", reps: 5, doctors: 130 },
    ],
  },
];

const PERFORMANCE = [
  { marketeer: "Khaled Sherif", region: "North Region", teamSize: 15, callRate: "89%", compliance: "92%", sales: "98%", budget: "66%", rating: "A" },
  { marketeer: "Mariam Adly", region: "South Region", teamSize: 9, callRate: "78%", compliance: "81%", sales: "85%", budget: "48%", rating: "B" },
  { marketeer: "Hossam Bahgat", region: "East Region", teamSize: 10, callRate: "85%", compliance: "88%", sales: "94%", budget: "61%", rating: "A" },
  { marketeer: "Yasmine Galal", region: "West Region", teamSize: 8, callRate: "76%", compliance: "79%", sales: "82%", budget: "44%", rating: "B" },
];

const STRATEGIC_APPROVALS = [
  { id: "SREQ-001", from: "Khaled Sherif (Marketeer)", type: "Doctor Sponsorship", description: "Dr. Walid Fathy Int'l Oncology Congress - Tokyo", value: "EGP 8,500", justification: "Top KOL, 40% market influence", decision: "Approved", date: "2026-03-25" },
  { id: "SREQ-002", from: "Hossam Bahgat (Marketeer)", type: "Strategic Investment", description: "New product launch event - Cairo", value: "EGP 25,000", justification: "Q2 launch critical", decision: "Approved", date: "2026-03-22" },
  { id: "SREQ-003", from: "Mariam Adly (Marketeer)", type: "Conference Booth", description: "International Pharma Expo", value: "EGP 12,000", justification: "Brand visibility", decision: "Pending", date: "2026-03-20" },
  { id: "SREQ-004", from: "Yasmine Galal (Marketeer)", type: "KOL Program", description: "Annual KOL summit West region", value: "EGP 18,000", justification: "10 top KOLs engagement", decision: "Pending", date: "2026-03-18" },
  { id: "SREQ-005", from: "Khaled Sherif (Marketeer)", type: "Strategic Investment", description: "Cardiology Clinical Study Sponsorship", value: "EGP 45,000", justification: "Real-world evidence", decision: "Pending", date: "2026-03-15" },
  { id: "SREQ-006", from: "Hossam Bahgat (Marketeer)", type: "Doctor Sponsorship", description: "Multi-doctor international conference", value: "EGP 15,000", justification: "Build prescriber base", decision: "Rejected", date: "2026-03-12" },
];

const FIELD_VISITS = [
  { id: "BV-001", region: "North Region", accompanied: "Khaled Sherif (Marketeer)", doctor: "Dr. Tarek Hamdy", date: "2026-03-15", purpose: "KOL Management", notes: "Strategic relationship building - top cardiologist", actions: "Quarterly reviews, conference invites" },
  { id: "BV-002", region: "East Region", accompanied: "Hossam Bahgat (Marketeer)", doctor: "Dr. Nada Hussein", date: "2026-03-08", purpose: "Strategic Account", notes: "University hospital expansion plan", actions: "Increase coverage 50%" },
  { id: "BV-003", region: "South Region", accompanied: "Mariam Adly (Marketeer)", doctor: "Dr. Khaled Adham", date: "2026-02-28", purpose: "Performance Review", notes: "Reviewed underperforming territory", actions: "Restructure rep allocation" },
  { id: "BV-004", region: "North Region", accompanied: "Khaled Sherif (Marketeer)", doctor: "Dr. Walid Fathy", date: "2026-02-20", purpose: "Launch Event", notes: "Presented new oncology line", actions: "Personal sponsorship approved" },
];

const REGIONAL_COMPARISON = [
  { region: "North Region", sales: 98, compliance: 92, callRate: 89 },
  { region: "South Region", sales: 85, compliance: 81, callRate: 78 },
  { region: "East Region", sales: 94, compliance: 88, callRate: 85 },
  { region: "West Region", sales: 82, compliance: 79, callRate: 76 },
];

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

const visitFields: EntityField[] = [
  { name: "region", label: "Region", type: "select", options: ["North", "South", "East", "West"].map(r => ({ label: `${r} Region`, value: `${r} Region` })) },
  { name: "accompanied", label: "Accompanied", type: "text", required: true },
  { name: "doctor", label: "Doctor/KOL", type: "text", required: true },
  { name: "date", label: "Date", type: "date", required: true },
  { name: "purpose", label: "Purpose", type: "select", options: [
    "KOL Management", "Strategic Account", "Launch Event", "Performance Review",
  ].map(p => ({ label: p, value: p })) },
  { name: "notes", label: "Notes", type: "textarea" },
  { name: "actions", label: "Action Items", type: "textarea" },
];

export default function BUMPage() {
  const [approvals, setApprovals] = useState(STRATEGIC_APPROVALS);
  const [visits, setVisits] = useState(FIELD_VISITS);
  const [editingVisit, setEditingVisit] = useState<typeof FIELD_VISITS[0] | null>(null);
  const [showVisit, setShowVisit] = useState(false);
  const [approvalFilters, setApprovalFilters] = useState<FilterState>({ _search: "", decision: "" });
  const [visitFilters, setVisitFilters] = useState<FilterState>({ _search: "", region: "" });
  const [viewApproval, setViewApproval] = useState<(typeof STRATEGIC_APPROVALS)[0] | null>(null);
  const [viewVisit, setViewVisit] = useState<(typeof FIELD_VISITS)[0] | null>(null);

  const filteredApprovals = approvals.filter((a) => {
    if (approvalFilters.decision && a.decision !== approvalFilters.decision) return false;
    if (approvalFilters._search) {
      const q = approvalFilters._search.toLowerCase();
      return a.id.toLowerCase().includes(q) || a.from.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredVisits = visits.filter((v) => {
    if (visitFilters.region && v.region !== visitFilters.region) return false;
    if (visitFilters._search) {
      const q = visitFilters._search.toLowerCase();
      return v.accompanied.toLowerCase().includes(q) || v.doctor.toLowerCase().includes(q);
    }
    return true;
  });

  const totalForce = HIERARCHY.reduce((s, m) => s + m.dms.reduce((ss, d) => ss + d.reps, 0), 0);
  const totalDoctors = HIERARCHY.reduce((s, m) => s + m.dms.reduce((ss, d) => ss + d.doctors, 0), 0);
  const pendingStrategic = approvals.filter(a => a.decision === "Pending").length;

  return (
    <div className="space-y-6">
      <PageHeader title="Business Unit Manager (BUM) Dashboard" description="National field force oversight, strategic decisions, and performance management" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={Users} title="Total Field Force" value={totalForce} subtitle={`${totalDoctors} doctors`} iconColor="bg-blue-100 text-blue-700" />
        <StatsCard icon={TrendingUp} title="National Call Rate" value="83%" subtitle="Average compliance" iconColor="bg-green-100 text-green-700" />
        <StatsCard icon={DollarSign} title="Budget Utilization" value="55%" subtitle="YTD" iconColor="bg-purple-100 text-purple-700" />
        <StatsCard icon={Crown} title="YTD Sales Achievement" value="92%" subtitle="vs target" iconColor="bg-amber-100 text-amber-700" />
      </div>

      <Tabs defaultValue="org">
        <TabsList>
          <TabsTrigger value="org">Organization Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance Dashboard</TabsTrigger>
          <TabsTrigger value="strategic">Strategic Approvals</TabsTrigger>
          <TabsTrigger value="visits">Field Visits</TabsTrigger>
          <TabsTrigger value="analytics">National Analytics</TabsTrigger>
          <TabsTrigger value="pnl">P&L</TabsTrigger>
        </TabsList>

        <TabsContent value="org">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Organization Hierarchy</CardTitle>
                <CardDescription>BUM → Marketeers → District Managers → Medical Reps</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-4 bg-amber-50 dark:bg-amber-900/10">
                  <div className="flex items-center gap-2"><Crown className="h-5 w-5 text-amber-600" /><span className="font-semibold">BUM (You)</span></div>
                  <div className="text-sm text-muted-foreground mt-1">Total Force: {totalForce} reps • {totalDoctors} doctors • 4 regions</div>
                </div>
                {HIERARCHY.map((m, i) => (
                  <div key={i} className="ml-4 border-l-2 pl-4 space-y-3">
                    <div className="rounded-lg border p-3 bg-blue-50 dark:bg-blue-900/10">
                      <div className="font-medium">{m.marketeer} <span className="text-xs text-muted-foreground">— Marketeer • {m.region}</span></div>
                      <div className="text-xs text-muted-foreground">{m.dms.length} DMs • {m.dms.reduce((s, d) => s + d.reps, 0)} reps</div>
                    </div>
                    <div className="ml-4 grid gap-2 md:grid-cols-2">
                      {m.dms.map((dm, j) => (
                        <div key={j} className="rounded border p-2 text-sm">
                          <div className="font-medium">{dm.name}</div>
                          <div className="text-xs text-muted-foreground">DM • {dm.district} • {dm.reps} reps • {dm.doctors} doctors</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader><CardTitle>Marketeer Performance</CardTitle><CardDescription>Regional KPIs</CardDescription></CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "marketeer", label: "Marketeer", render: (v) => <span className="font-medium">{v as string}</span> },
                  { key: "region", label: "Region" },
                  { key: "teamSize", label: "Team Size" },
                  { key: "callRate", label: "Call Rate" },
                  { key: "compliance", label: "Compliance" },
                  { key: "sales", label: "Sales Achievement", render: (v) => <span className="font-semibold">{v as string}</span> },
                  { key: "budget", label: "Budget Used" },
                  { key: "rating", label: "Rating", render: (_v, row) => <StatusBadge status={(row as unknown as (typeof PERFORMANCE)[0]).rating === "A" ? "Excellent" : "Good"} /> },
                ] as Column<Record<string, unknown>>[]}
                data={PERFORMANCE as unknown as Record<string, unknown>[]}

                exportable exportFilename="crm-bum.csv" emptyMessage="No performance data available."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategic">
          <Card>
            <CardHeader>
              <CardTitle>Strategic Approvals</CardTitle>
              <CardDescription>High-value requests escalated from Marketeers — {pendingStrategic} pending</CardDescription>
              <FilterBar
                searchValue={approvalFilters._search}
                onSearchChange={(v) => setApprovalFilters((f) => ({ ...f, _search: v }))}
                fields={[{ key: "decision", label: "Decision", type: "select", options: [
                  { label: "Pending", value: "Pending" }, { label: "Approved", value: "Approved" }, { label: "Rejected", value: "Rejected" },
                ]}]}
                values={approvalFilters}
                onChange={(k, v) => setApprovalFilters((f) => ({ ...f, [k]: v }))}
              />
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "id", label: "Request#", render: (v) => <span className="font-mono">{v as string}</span> },
                  { key: "from", label: "From" },
                  { key: "type", label: "Type" },
                  { key: "description", label: "Description", className: "max-w-xs truncate" },
                  { key: "value", label: "Value", render: (v) => <span className="font-bold">{v as string}</span> },
                  { key: "justification", label: "Justification", className: "max-w-xs truncate", render: (v) => <span className="text-muted-foreground">{v as string}</span> },
                  { key: "decision", label: "Decision", render: (v) => <StatusBadge status={v as string} /> },
                  { key: "_actions", label: "", render: (_v, row) => {
                    const a = row as unknown as (typeof STRATEGIC_APPROVALS)[0];
                    return (
                      <EditDeleteMenu
                        onView={() => setViewApproval(a)}
                        onDelete={() => setApprovals(prev => prev.filter(x => x.id !== a.id))}
                        itemLabel={a.id}
                        canEdit={false}
                        extraItems={a.decision === "Pending" ? [
                          { label: "Approve", onClick: () => setApprovals(prev => prev.map(x => x.id === a.id ? { ...x, decision: "Approved" } : x)) },
                          { label: "Reject", onClick: () => setApprovals(prev => prev.map(x => x.id === a.id ? { ...x, decision: "Rejected" } : x)), destructive: true },
                        ] : []}
                      />
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={filteredApprovals as unknown as Record<string, unknown>[]}

                exportable exportFilename="crm-bum.csv" emptyMessage="No strategic approvals."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visits">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>BUM Field Visits</CardTitle>
                <CardDescription>Strategic visits and KOL management</CardDescription>
              </div>
              <Button size="sm" onClick={() => { setEditingVisit(null); setShowVisit(true); }}><Plus className="mr-2 h-4 w-4" />Register Visit</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <FilterBar
                searchValue={visitFilters._search}
                onSearchChange={(v) => setVisitFilters((f) => ({ ...f, _search: v }))}
                fields={[{ key: "region", label: "Region", type: "select", options: ["North", "South", "East", "West"].map(r => ({ label: `${r} Region`, value: `${r} Region` })) }]}
                values={visitFilters}
                onChange={(k, v) => setVisitFilters((f) => ({ ...f, [k]: v }))}
              />
              <DataTable
                columns={[
                  { key: "id", label: "Visit#", render: (v) => <span className="font-mono">{v as string}</span> },
                  { key: "region", label: "Region" },
                  { key: "accompanied", label: "Accompanied", render: (v) => <span className="font-medium">{v as string}</span> },
                  { key: "doctor", label: "Doctor/KOL" },
                  { key: "date", label: "Date" },
                  { key: "purpose", label: "Purpose", render: (v) => <StatusBadge status={v as string} /> },
                  { key: "notes", label: "Notes", className: "max-w-xs truncate" },
                  { key: "_actions", label: "", render: (_v, row) => {
                    const v = row as unknown as (typeof FIELD_VISITS)[0];
                    return (
                      <EditDeleteMenu
                        onView={() => setViewVisit(v)}
                        onEdit={() => { setEditingVisit(v); setShowVisit(true); }}
                        onDelete={() => setVisits(prev => prev.filter(x => x.id !== v.id))}
                        itemLabel={v.id}
                      />
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={filteredVisits as unknown as Record<string, unknown>[]}

                exportable exportFilename="crm-bum.csv" emptyMessage="No field visits found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Regional Performance</CardTitle><CardDescription>Sales achievement by region</CardDescription></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {REGIONAL_COMPARISON.map((r, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{r.region}</span>
                        <span>{r.sales}%</span>
                      </div>
                      <div className="h-3 w-full rounded bg-muted overflow-hidden">
                        <div className={`h-full ${r.sales >= 90 ? "bg-green-500" : r.sales >= 80 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${r.sales}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>National KPIs</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Headcount</span><span className="font-bold">{totalForce + 4 + 8} (incl. mgmt)</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Vacancy Rate</span><span className="font-bold">3.2%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Avg Tenure</span><span className="font-bold">3.8 yrs</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Top Region</span><span className="font-bold text-green-600">North</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Bottom Region</span><span className="font-bold text-red-600">West</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">YTD Sales</span><span className="font-bold">EGP 4.2M</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pnl">
          <PLTab />
        </TabsContent>
      </Tabs>

      {/* Strategic Approval Detail Dialog */}
      <Dialog open={!!viewApproval} onOpenChange={(open) => { if (!open) setViewApproval(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewApproval?.id} — {viewApproval?.type}</DialogTitle>
          </DialogHeader>
          {viewApproval && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><span className="text-sm text-muted-foreground">Request ID</span><p className="font-medium">{viewApproval.id}</p></div>
              <div><span className="text-sm text-muted-foreground">From</span><p className="font-medium">{viewApproval.from}</p></div>
              <div><span className="text-sm text-muted-foreground">Type</span><p className="font-medium">{viewApproval.type}</p></div>
              <div><span className="text-sm text-muted-foreground">Value</span><p className="font-medium">{viewApproval.value}</p></div>
              <div className="col-span-2"><span className="text-sm text-muted-foreground">Description</span><p className="font-medium">{viewApproval.description}</p></div>
              <div className="col-span-2"><span className="text-sm text-muted-foreground">Justification</span><p className="font-medium">{viewApproval.justification}</p></div>
              <div><span className="text-sm text-muted-foreground">Decision</span><p className="font-medium">{viewApproval.decision}</p></div>
              <div><span className="text-sm text-muted-foreground">Date</span><p className="font-medium">{viewApproval.date}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Field Visit Detail Dialog */}
      <Dialog open={!!viewVisit} onOpenChange={(open) => { if (!open) setViewVisit(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewVisit?.id} — {viewVisit?.doctor}</DialogTitle>
          </DialogHeader>
          {viewVisit && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><span className="text-sm text-muted-foreground">Visit ID</span><p className="font-medium">{viewVisit.id}</p></div>
              <div><span className="text-sm text-muted-foreground">Region</span><p className="font-medium">{viewVisit.region}</p></div>
              <div><span className="text-sm text-muted-foreground">Accompanied</span><p className="font-medium">{viewVisit.accompanied}</p></div>
              <div><span className="text-sm text-muted-foreground">Doctor/KOL</span><p className="font-medium">{viewVisit.doctor}</p></div>
              <div><span className="text-sm text-muted-foreground">Date</span><p className="font-medium">{viewVisit.date}</p></div>
              <div><span className="text-sm text-muted-foreground">Purpose</span><p className="font-medium">{viewVisit.purpose}</p></div>
              <div className="col-span-2"><span className="text-sm text-muted-foreground">Notes</span><p className="font-medium">{viewVisit.notes}</p></div>
              <div className="col-span-2"><span className="text-sm text-muted-foreground">Action Items</span><p className="font-medium">{viewVisit.actions}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <EntityFormModal
        open={showVisit}
        onOpenChange={(open) => { if (!open) { setShowVisit(false); setEditingVisit(null); } }}
        title={editingVisit ? "Edit Visit" : "Register BUM Visit"}
        fields={visitFields}
        initialData={editingVisit ? { region: editingVisit.region, accompanied: editingVisit.accompanied, doctor: editingVisit.doctor, date: editingVisit.date, purpose: editingVisit.purpose, notes: editingVisit.notes, actions: editingVisit.actions } : undefined}
        onSubmit={(d) => {
          if (editingVisit) {
            setVisits(prev => prev.map(v => v.id === editingVisit.id ? { ...v, region: (d.region as string) || v.region, accompanied: d.accompanied as string, doctor: d.doctor as string, date: d.date as string, purpose: (d.purpose as string) || v.purpose, notes: (d.notes as string) || "", actions: (d.actions as string) || "" } : v));
          } else {
            setVisits(prev => [{ id: `BV-${Date.now().toString(36)}`, region: (d.region as string) || "North Region", accompanied: d.accompanied as string, doctor: d.doctor as string, date: d.date as string, purpose: (d.purpose as string) || "KOL Management", notes: (d.notes as string) || "", actions: (d.actions as string) || "" }, ...prev]);
          }
          setShowVisit(false);
          setEditingVisit(null);
        }}
      />
    </div>
  );
}
