"use client";

import { useState } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Plus,
  Play,
  FileText,
  Layers,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import {
  EntityFormModal,
  type EntityField,
  type EntityFormData,
} from "@/components/shared/entity-form-modal";

/* ─── Types ─── */
interface BudgetPlan {
  id: string;
  department: string;
  category: string;
  planned: number;
  actual: number;
  variance: number;
  percentUsed: number;
  status: "On Track" | "At Risk" | "Over Budget" | "Under Budget";
  fiscalYear: string;
}

interface VarianceRecord {
  id: string;
  period: string;
  department: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePercent: number;
  type: "Favorable" | "Unfavorable";
  category: string;
}

interface ForecastEntry {
  id: string;
  period: string;
  category: string;
  originalBudget: number;
  currentForecast: number;
  actualToDate: number;
  forecastVariance: number;
  confidence: "High" | "Medium" | "Low";
}

interface WhatIfScenario {
  id: string;
  name: string;
  description: string;
  assumptions: string;
  projectedImpact: number;
  impactType: "Revenue" | "Cost" | "Margin" | "Cash Flow";
  probability: "High" | "Medium" | "Low";
  status: "Draft" | "Under Review" | "Approved" | "Rejected";
  createdBy: string;
  createdDate: string;
}

/* ─── Mock Data ─── */
const budgetPlans: BudgetPlan[] = [
  { id: "bp-1", department: "Manufacturing", category: "Direct Materials", planned: 8500000, actual: 7200000, variance: 1300000, percentUsed: 84.7, status: "On Track", fiscalYear: "FY 2026" },
  { id: "bp-2", department: "Manufacturing", category: "Direct Labor", planned: 4200000, actual: 3800000, variance: 400000, percentUsed: 90.5, status: "On Track", fiscalYear: "FY 2026" },
  { id: "bp-3", department: "Sales & Marketing", category: "Advertising", planned: 2000000, actual: 2350000, variance: -350000, percentUsed: 117.5, status: "Over Budget", fiscalYear: "FY 2026" },
  { id: "bp-4", department: "Sales & Marketing", category: "Travel & Events", planned: 800000, actual: 650000, variance: 150000, percentUsed: 81.3, status: "On Track", fiscalYear: "FY 2026" },
  { id: "bp-5", department: "R&D", category: "Research Projects", planned: 3500000, actual: 2900000, variance: 600000, percentUsed: 82.9, status: "Under Budget", fiscalYear: "FY 2026" },
  { id: "bp-6", department: "R&D", category: "Lab Equipment", planned: 1200000, actual: 1180000, variance: 20000, percentUsed: 98.3, status: "At Risk", fiscalYear: "FY 2026" },
  { id: "bp-7", department: "Administration", category: "IT Infrastructure", planned: 1500000, actual: 1420000, variance: 80000, percentUsed: 94.7, status: "On Track", fiscalYear: "FY 2026" },
  { id: "bp-8", department: "Administration", category: "Facilities", planned: 900000, actual: 950000, variance: -50000, percentUsed: 105.6, status: "At Risk", fiscalYear: "FY 2026" },
  { id: "bp-9", department: "Logistics", category: "Fleet & Transport", planned: 1800000, actual: 2100000, variance: -300000, percentUsed: 116.7, status: "Over Budget", fiscalYear: "FY 2026" },
  { id: "bp-10", department: "Quality", category: "Testing & Compliance", planned: 600000, actual: 480000, variance: 120000, percentUsed: 80.0, status: "Under Budget", fiscalYear: "FY 2026" },
];

const varianceRecords: VarianceRecord[] = [
  { id: "vr-1", period: "Jan 2026", department: "Manufacturing", budgeted: 2100000, actual: 1950000, variance: 150000, variancePercent: 7.1, type: "Favorable", category: "Direct Materials" },
  { id: "vr-2", period: "Feb 2026", department: "Manufacturing", budgeted: 2100000, actual: 2050000, variance: 50000, variancePercent: 2.4, type: "Favorable", category: "Direct Materials" },
  { id: "vr-3", period: "Mar 2026", department: "Manufacturing", budgeted: 2100000, actual: 2250000, variance: -150000, variancePercent: -7.1, type: "Unfavorable", category: "Direct Materials" },
  { id: "vr-4", period: "Apr 2026", department: "Manufacturing", budgeted: 2100000, actual: 1980000, variance: 120000, variancePercent: 5.7, type: "Favorable", category: "Direct Materials" },
  { id: "vr-5", period: "Jan 2026", department: "Sales & Marketing", budgeted: 500000, actual: 580000, variance: -80000, variancePercent: -16.0, type: "Unfavorable", category: "Advertising" },
  { id: "vr-6", period: "Feb 2026", department: "Sales & Marketing", budgeted: 500000, actual: 620000, variance: -120000, variancePercent: -24.0, type: "Unfavorable", category: "Advertising" },
  { id: "vr-7", period: "Mar 2026", department: "Sales & Marketing", budgeted: 500000, actual: 550000, variance: -50000, variancePercent: -10.0, type: "Unfavorable", category: "Advertising" },
  { id: "vr-8", period: "Apr 2026", department: "Logistics", budgeted: 450000, actual: 520000, variance: -70000, variancePercent: -15.6, type: "Unfavorable", category: "Fleet & Transport" },
];

const forecasts: ForecastEntry[] = [
  { id: "fc-1", period: "Q2 2026", category: "Total Revenue", originalBudget: 25000000, currentForecast: 26200000, actualToDate: 13500000, forecastVariance: 1200000, confidence: "High" },
  { id: "fc-2", period: "Q2 2026", category: "Direct Costs", originalBudget: 15000000, currentForecast: 15400000, actualToDate: 7800000, forecastVariance: -400000, confidence: "Medium" },
  { id: "fc-3", period: "Q2 2026", category: "Overhead", originalBudget: 5500000, currentForecast: 5800000, actualToDate: 2950000, forecastVariance: -300000, confidence: "Medium" },
  { id: "fc-4", period: "Q3 2026", category: "Total Revenue", originalBudget: 28000000, currentForecast: 27500000, actualToDate: 0, forecastVariance: -500000, confidence: "Low" },
  { id: "fc-5", period: "Q3 2026", category: "Direct Costs", originalBudget: 16800000, currentForecast: 16500000, actualToDate: 0, forecastVariance: 300000, confidence: "Low" },
  { id: "fc-6", period: "FY 2026", category: "Net Profit", originalBudget: 18000000, currentForecast: 17200000, actualToDate: 7500000, forecastVariance: -800000, confidence: "Medium" },
];

const scenarios: WhatIfScenario[] = [
  { id: "sc-1", name: "EGP Devaluation 15%", description: "Impact of further EGP devaluation on import costs", assumptions: "EGP depreciates 15% against USD; 40% of raw materials are imported", projectedImpact: -2800000, impactType: "Cost", probability: "Medium", status: "Under Review", createdBy: "CFO Office", createdDate: "2026-04-20" },
  { id: "sc-2", name: "New Product Line Launch", description: "Revenue impact from launching consumer health line", assumptions: "Launch in Q3; 5% market share in 6 months; avg price EGP 85", projectedImpact: 4500000, impactType: "Revenue", probability: "High", status: "Approved", createdBy: "Strategy Team", createdDate: "2026-03-15" },
  { id: "sc-3", name: "Competitor Price War", description: "Impact if competitor reduces prices 20%", assumptions: "15% volume reduction in pharma division; 10% price reduction response needed", projectedImpact: -3200000, impactType: "Revenue", probability: "Low", status: "Draft", createdBy: "Sales Director", createdDate: "2026-05-01" },
  { id: "sc-4", name: "Automation Investment", description: "Cost savings from Factory Line 3 automation", assumptions: "EGP 2M investment; 30% labor cost reduction on line 3; 6-month payback", projectedImpact: 1800000, impactType: "Cost", probability: "High", status: "Approved", createdBy: "Operations", createdDate: "2026-02-28" },
  { id: "sc-5", name: "Export Expansion - Africa", description: "Revenue from expanding to East African markets", assumptions: "Kenya + Tanzania entry; distribution partnership; 18-month ramp", projectedImpact: 6000000, impactType: "Revenue", probability: "Medium", status: "Under Review", createdBy: "Export Division", createdDate: "2026-04-10" },
];

const fmt = (n: number) => `EGP ${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function BudgetingPage() {
  const [filters, setFilters] = useState<FilterState>({});
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [forecastOpen, setForecastOpen] = useState(false);
  const [scenarioOpen, setScenarioOpen] = useState(false);

  const totalBudget = budgetPlans.reduce((s, b) => s + b.planned, 0);
  const spentToDate = budgetPlans.reduce((s, b) => s + b.actual, 0);
  const remaining = totalBudget - spentToDate;
  const forecastAtCompletion = forecasts.find(f => f.period === "FY 2026")?.currentForecast || 0;

  /* ─── Modal Fields ─── */
  const budgetFields: EntityField[] = [
    { name: "department", label: "Department", type: "select", required: true, options: [{ label: "Manufacturing", value: "Manufacturing" }, { label: "Sales & Marketing", value: "Sales & Marketing" }, { label: "R&D", value: "R&D" }, { label: "Administration", value: "Administration" }, { label: "Logistics", value: "Logistics" }, { label: "Quality", value: "Quality" }] },
    { name: "category", label: "Budget Category", type: "text", required: true },
    { name: "planned", label: "Planned Amount (EGP)", type: "number", required: true },
    { name: "fiscalYear", label: "Fiscal Year", type: "select", required: true, options: [{ label: "FY 2026", value: "FY 2026" }, { label: "FY 2027", value: "FY 2027" }] },
    { name: "notes", label: "Justification", type: "textarea", fullWidth: true },
  ];

  const scenarioFields: EntityField[] = [
    { name: "name", label: "Scenario Name", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea", required: true, fullWidth: true },
    { name: "assumptions", label: "Key Assumptions", type: "textarea", required: true, fullWidth: true },
    { name: "impactType", label: "Impact Type", type: "select", required: true, options: [{ label: "Revenue", value: "Revenue" }, { label: "Cost", value: "Cost" }, { label: "Margin", value: "Margin" }, { label: "Cash Flow", value: "Cash Flow" }] },
    { name: "projectedImpact", label: "Projected Impact (EGP)", type: "number", required: true },
    { name: "probability", label: "Probability", type: "select", required: true, options: [{ label: "High", value: "High" }, { label: "Medium", value: "Medium" }, { label: "Low", value: "Low" }] },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Advanced Budgeting"
        description="Budget plans, variance analysis, rolling forecasts and what-if scenarios"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setScenarioOpen(true)}>
              <Layers className="h-4 w-4 mr-2" /> Create Scenario
            </Button>
            <Button variant="outline" onClick={() => setForecastOpen(true)}>
              <Play className="h-4 w-4 mr-2" /> Run Forecast
            </Button>
            <Button variant="outline" onClick={() => setApprovalOpen(true)}>
              <CheckCircle className="h-4 w-4 mr-2" /> Submit for Approval
            </Button>
            <Button onClick={() => setBudgetOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create Budget
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Wallet} title="Total Budget" value={fmt(totalBudget)} subtitle="FY 2026 total" iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={TrendingDown} title="Spent to Date" value={fmt(spentToDate)} subtitle={`${((spentToDate / totalBudget) * 100).toFixed(1)}% utilized`} iconColor="bg-amber-100 text-amber-600" />
        <StatsCard icon={TrendingUp} title="Remaining" value={fmt(remaining)} subtitle="Available budget" iconColor="bg-green-100 text-green-600" />
        <StatsCard icon={BarChart3} title="Forecast at Completion" value={fmt(forecastAtCompletion)} subtitle="Net profit forecast" iconColor="bg-purple-100 text-purple-600" />
      </div>

      <Tabs defaultValue="budget-plans">
        <TabsList>
          <TabsTrigger value="budget-plans">Budget Plans</TabsTrigger>
          <TabsTrigger value="variance">Variance Analysis</TabsTrigger>
          <TabsTrigger value="forecasts">Forecasts</TabsTrigger>
          <TabsTrigger value="what-if">What-If Scenarios</TabsTrigger>
        </TabsList>

        {/* ── Budget Plans ── */}
        <TabsContent value="budget-plans" className="space-y-3">
          <FilterBar
            searchPlaceholder="Search budgets..."
            searchValue={filters._search || ""}
            onSearchChange={(v) => setFilters(f => ({ ...f, _search: v }))}
            fields={[
              { key: "department", label: "Department", type: "select", options: [{ label: "Manufacturing", value: "Manufacturing" }, { label: "Sales & Marketing", value: "Sales & Marketing" }, { label: "R&D", value: "R&D" }, { label: "Administration", value: "Administration" }, { label: "Logistics", value: "Logistics" }] },
              { key: "status", label: "Status", type: "select", options: [{ label: "On Track", value: "On Track" }, { label: "At Risk", value: "At Risk" }, { label: "Over Budget", value: "Over Budget" }, { label: "Under Budget", value: "Under Budget" }] },
            ]}
            values={filters}
            onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))}
          />
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "department", label: "Department", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "category", label: "Category" },
                  { key: "planned", label: "Planned", className: "text-right", render: (v: number) => <span>{fmt(v)}</span> },
                  { key: "actual", label: "Actual", className: "text-right", render: (v: number) => <span>{fmt(v)}</span> },
                  { key: "variance", label: "Variance", className: "text-right", render: (v: number) => <span className={v >= 0 ? "text-green-600" : "text-red-600 font-semibold"}>{v >= 0 ? "+" : ""}{fmt(v)}</span> },
                  { key: "percentUsed", label: "% Used", className: "text-right", render: (v: number) => (
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${v > 100 ? "bg-red-500" : v > 90 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${Math.min(v, 100)}%` }} />
                      </div>
                      <span className="text-xs font-medium">{v.toFixed(1)}%</span>
                    </div>
                  ) },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge className={v === "On Track" ? "bg-green-100 text-green-700" : v === "Under Budget" ? "bg-blue-100 text-blue-700" : v === "At Risk" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>{v}</Badge>
                  ) },
                ] as Column<Record<string, unknown>>[]}
                data={budgetPlans as unknown as Record<string, unknown>[]}
                emptyMessage="No budget plans found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Variance Analysis ── */}
        <TabsContent value="variance" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">Favorable Variances</div>
                <div className="text-2xl font-bold text-green-600">{fmt(varianceRecords.filter(v => v.type === "Favorable").reduce((s, v) => s + v.variance, 0))}</div>
                <div className="text-xs text-muted-foreground mt-1">{varianceRecords.filter(v => v.type === "Favorable").length} items</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">Unfavorable Variances</div>
                <div className="text-2xl font-bold text-red-600">{fmt(Math.abs(varianceRecords.filter(v => v.type === "Unfavorable").reduce((s, v) => s + v.variance, 0)))}</div>
                <div className="text-xs text-muted-foreground mt-1">{varianceRecords.filter(v => v.type === "Unfavorable").length} items</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">Net Variance</div>
                <div className={`text-2xl font-bold ${varianceRecords.reduce((s, v) => s + v.variance, 0) >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(varianceRecords.reduce((s, v) => s + v.variance, 0))}</div>
                <div className="text-xs text-muted-foreground mt-1">All periods</div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "period", label: "Period", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "department", label: "Department" },
                  { key: "category", label: "Category" },
                  { key: "budgeted", label: "Budgeted", className: "text-right", render: (v: number) => <span>{fmt(v)}</span> },
                  { key: "actual", label: "Actual", className: "text-right", render: (v: number) => <span>{fmt(v)}</span> },
                  { key: "variance", label: "Variance", className: "text-right", render: (v: number) => <span className={v >= 0 ? "text-green-600" : "text-red-600 font-semibold"}>{v >= 0 ? "+" : ""}{fmt(v)}</span> },
                  { key: "variancePercent", label: "Var %", className: "text-right", render: (v: number) => <span className={v >= 0 ? "text-green-600" : "text-red-600"}>{v >= 0 ? "+" : ""}{v.toFixed(1)}%</span> },
                  { key: "type", label: "Type", render: (v: string) => (
                    <Badge className={v === "Favorable" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>{v}</Badge>
                  ) },
                ] as Column<Record<string, unknown>>[]}
                data={varianceRecords as unknown as Record<string, unknown>[]}
                emptyMessage="No variance records found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Forecasts ── */}
        <TabsContent value="forecasts" className="space-y-3">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "period", label: "Period", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "category", label: "Category", render: (v: string) => <Badge variant="outline">{v}</Badge> },
                  { key: "originalBudget", label: "Original Budget", className: "text-right", render: (v: number) => <span>{fmt(v)}</span> },
                  { key: "currentForecast", label: "Current Forecast", className: "text-right", render: (v: number) => <span className="font-semibold">{fmt(v)}</span> },
                  { key: "actualToDate", label: "Actual to Date", className: "text-right", render: (v: number) => <span>{v > 0 ? fmt(v) : "—"}</span> },
                  { key: "forecastVariance", label: "Forecast Variance", className: "text-right", render: (v: number) => <span className={v >= 0 ? "text-green-600" : "text-red-600 font-semibold"}>{v >= 0 ? "+" : ""}{fmt(v)}</span> },
                  { key: "confidence", label: "Confidence", render: (v: string) => (
                    <Badge className={v === "High" ? "bg-green-100 text-green-700" : v === "Medium" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>{v}</Badge>
                  ) },
                ] as Column<Record<string, unknown>>[]}
                data={forecasts as unknown as Record<string, unknown>[]}
                emptyMessage="No forecast data found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── What-If Scenarios ── */}
        <TabsContent value="what-if" className="space-y-3">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "name", label: "Scenario", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "assumptions", label: "Key Assumptions", render: (v: string) => <span className="text-xs text-muted-foreground line-clamp-2">{v}</span> },
                  { key: "impactType", label: "Impact Type", render: (v: string) => <Badge variant="outline">{v}</Badge> },
                  { key: "projectedImpact", label: "Projected Impact", className: "text-right", render: (v: number) => <span className={v >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>{v >= 0 ? "+" : ""}{fmt(v)}</span> },
                  { key: "probability", label: "Probability", render: (v: string) => (
                    <Badge className={v === "High" ? "bg-green-100 text-green-700" : v === "Medium" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>{v}</Badge>
                  ) },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge className={v === "Approved" ? "bg-green-100 text-green-700" : v === "Under Review" ? "bg-blue-100 text-blue-700" : v === "Draft" ? "bg-gray-100 text-gray-700" : "bg-red-100 text-red-700"}>{v}</Badge>
                  ) },
                  { key: "createdBy", label: "Created By", render: (v: string) => <span className="text-xs">{v}</span> },
                ] as Column<Record<string, unknown>>[]}
                data={scenarios as unknown as Record<string, unknown>[]}
                emptyMessage="No scenarios found."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Create Budget Modal ─── */}
      <EntityFormModal
        open={budgetOpen}
        onOpenChange={setBudgetOpen}
        title="Create Budget"
        fields={budgetFields}
        onSubmit={() => setBudgetOpen(false)}
      />

      {/* ─── Submit for Approval Modal ─── */}
      <EntityFormModal
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        title="Submit Budget for Approval"
        fields={[
          { name: "department", label: "Department", type: "select", required: true, options: [{ label: "All Departments", value: "all" }, { label: "Manufacturing", value: "Manufacturing" }, { label: "Sales & Marketing", value: "Sales & Marketing" }, { label: "R&D", value: "R&D" }] },
          { name: "approver", label: "Approver", type: "select", required: true, options: [{ label: "CFO - Mohamed Kamel", value: "cfo" }, { label: "CEO - Ahmed Rashid", value: "ceo" }, { label: "Board Finance Committee", value: "board" }] },
          { name: "notes", label: "Submission Notes", type: "textarea", fullWidth: true },
        ]}
        onSubmit={() => setApprovalOpen(false)}
      />

      {/* ─── Run Forecast Modal ─── */}
      <EntityFormModal
        open={forecastOpen}
        onOpenChange={setForecastOpen}
        title="Run Rolling Forecast"
        fields={[
          { name: "method", label: "Forecast Method", type: "select", required: true, options: [{ label: "Trend Analysis", value: "trend" }, { label: "Moving Average", value: "moving-avg" }, { label: "Regression", value: "regression" }, { label: "Driver-Based", value: "driver" }] },
          { name: "horizon", label: "Forecast Horizon", type: "select", required: true, options: [{ label: "3 Months", value: "3m" }, { label: "6 Months", value: "6m" }, { label: "12 Months", value: "12m" }] },
          { name: "includeScenarios", label: "Include Scenarios", type: "select", options: [{ label: "Yes - All Approved", value: "yes" }, { label: "No - Base Case Only", value: "no" }] },
        ]}
        onSubmit={() => setForecastOpen(false)}
      />

      {/* ─── Create Scenario Modal ─── */}
      <EntityFormModal
        open={scenarioOpen}
        onOpenChange={setScenarioOpen}
        title="Create What-If Scenario"
        fields={scenarioFields}
        onSubmit={() => setScenarioOpen(false)}
      />
    </div>
  );
}
