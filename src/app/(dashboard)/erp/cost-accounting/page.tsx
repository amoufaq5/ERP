"use client";

import { useState, useMemo } from "react";
import {
  Calculator,
  Target,
  Activity,
  TrendingDown,
  Plus,
  ArrowLeftRight,
  Play,
  Building2,
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
interface CostCenter {
  id: string;
  code: string;
  name: string;
  manager: string;
  budget: number;
  actual: number;
  variance: number;
  variancePercent: number;
  status: "Under Budget" | "On Target" | "Over Budget";
}

interface ProfitCenter {
  id: string;
  code: string;
  name: string;
  revenue: number;
  costs: number;
  profit: number;
  marginPercent: number;
  status: "Profitable" | "Break Even" | "Loss";
}

interface InternalOrder {
  id: string;
  orderNumber: string;
  description: string;
  type: "Capital" | "Overhead" | "Maintenance" | "Project";
  costCenter: string;
  budget: number;
  actual: number;
  status: "Open" | "In Progress" | "Closed" | "Settled";
  createdDate: string;
}

interface ActivityCost {
  id: string;
  activity: string;
  costDriver: string;
  costPool: string;
  totalCost: number;
  volume: number;
  ratePerUnit: number;
  allocated: number;
  unallocated: number;
}

/* ─── Mock Data ─── */
const costCenters: CostCenter[] = [
  { id: "cc-1", code: "CC-1000", name: "Manufacturing", manager: "Ahmed Mostafa", budget: 5200000, actual: 4980000, variance: 220000, variancePercent: 4.2, status: "Under Budget" },
  { id: "cc-2", code: "CC-2000", name: "Sales & Marketing", manager: "Sara Ibrahim", budget: 3800000, actual: 4050000, variance: -250000, variancePercent: -6.6, status: "Over Budget" },
  { id: "cc-3", code: "CC-3000", name: "Research & Development", manager: "Dr. Hassan Ali", budget: 2100000, actual: 2050000, variance: 50000, variancePercent: 2.4, status: "On Target" },
  { id: "cc-4", code: "CC-4000", name: "Administration", manager: "Fatma Nour", budget: 1500000, actual: 1480000, variance: 20000, variancePercent: 1.3, status: "Under Budget" },
  { id: "cc-5", code: "CC-5000", name: "Quality Assurance", manager: "Karim Saeed", budget: 900000, actual: 920000, variance: -20000, variancePercent: -2.2, status: "On Target" },
  { id: "cc-6", code: "CC-6000", name: "Logistics", manager: "Omar Hany", budget: 2400000, actual: 2650000, variance: -250000, variancePercent: -10.4, status: "Over Budget" },
];

const profitCenters: ProfitCenter[] = [
  { id: "pc-1", code: "PC-100", name: "Pharmaceuticals Division", revenue: 28000000, costs: 19600000, profit: 8400000, marginPercent: 30.0, status: "Profitable" },
  { id: "pc-2", code: "PC-200", name: "Medical Devices", revenue: 12500000, costs: 10800000, profit: 1700000, marginPercent: 13.6, status: "Profitable" },
  { id: "pc-3", code: "PC-300", name: "Consumer Health", revenue: 8200000, costs: 7900000, profit: 300000, marginPercent: 3.7, status: "Break Even" },
  { id: "pc-4", code: "PC-400", name: "Export Division", revenue: 5100000, costs: 5400000, profit: -300000, marginPercent: -5.9, status: "Loss" },
  { id: "pc-5", code: "PC-500", name: "Contract Manufacturing", revenue: 4300000, costs: 3600000, profit: 700000, marginPercent: 16.3, status: "Profitable" },
];

const internalOrders: InternalOrder[] = [
  { id: "io-1", orderNumber: "IO-2026-001", description: "Factory Line 3 Upgrade", type: "Capital", costCenter: "Manufacturing", budget: 1200000, actual: 890000, status: "In Progress", createdDate: "2026-01-15" },
  { id: "io-2", orderNumber: "IO-2026-002", description: "IT Infrastructure Refresh", type: "Capital", costCenter: "Administration", budget: 800000, actual: 750000, status: "In Progress", createdDate: "2026-02-01" },
  { id: "io-3", orderNumber: "IO-2026-003", description: "Annual Maintenance Shutdown", type: "Maintenance", costCenter: "Manufacturing", budget: 350000, actual: 350000, status: "Closed", createdDate: "2026-03-01" },
  { id: "io-4", orderNumber: "IO-2026-004", description: "Marketing Campaign Q2", type: "Overhead", costCenter: "Sales & Marketing", budget: 500000, actual: 220000, status: "Open", createdDate: "2026-04-01" },
  { id: "io-5", orderNumber: "IO-2026-005", description: "New Product Launch", type: "Project", costCenter: "Research & Development", budget: 650000, actual: 180000, status: "Open", createdDate: "2026-04-15" },
];

const activityCosts: ActivityCost[] = [
  { id: "ac-1", activity: "Machine Setup", costDriver: "Setup Hours", costPool: "Manufacturing OH", totalCost: 480000, volume: 1200, ratePerUnit: 400, allocated: 420000, unallocated: 60000 },
  { id: "ac-2", activity: "Quality Inspection", costDriver: "Inspection Hours", costPool: "Quality OH", totalCost: 360000, volume: 900, ratePerUnit: 400, allocated: 360000, unallocated: 0 },
  { id: "ac-3", activity: "Material Handling", costDriver: "Moves", costPool: "Logistics OH", totalCost: 520000, volume: 2600, ratePerUnit: 200, allocated: 480000, unallocated: 40000 },
  { id: "ac-4", activity: "Order Processing", costDriver: "Orders", costPool: "Admin OH", totalCost: 280000, volume: 1400, ratePerUnit: 200, allocated: 280000, unallocated: 0 },
  { id: "ac-5", activity: "Customer Support", costDriver: "Tickets", costPool: "Sales OH", totalCost: 190000, volume: 950, ratePerUnit: 200, allocated: 150000, unallocated: 40000 },
];

const fmt = (n: number) => `EGP ${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function CostAccountingPage() {
  const [filters, setFilters] = useState<FilterState>({});
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [internalOrderOpen, setInternalOrderOpen] = useState(false);
  const [distributionOpen, setDistributionOpen] = useState(false);

  const totalCostCenters = costCenters.length;
  const budgetVariance = ((costCenters.reduce((s, c) => s + c.variance, 0) / costCenters.reduce((s, c) => s + c.budget, 0)) * 100).toFixed(1);
  const overheadRate = "34.2%";
  const activityCostRate = "EGP 280/unit";

  /* ─── Modal Fields ─── */
  const allocateFields: EntityField[] = [
    { name: "fromCostCenter", label: "From Cost Center", type: "select", required: true, options: costCenters.map(c => ({ label: `${c.code} - ${c.name}`, value: c.id })) },
    { name: "toCostCenter", label: "To Cost Center", type: "select", required: true, options: costCenters.map(c => ({ label: `${c.code} - ${c.name}`, value: c.id })) },
    { name: "amount", label: "Amount (EGP)", type: "number", required: true },
    { name: "description", label: "Description", type: "text", required: true },
    { name: "allocationBase", label: "Allocation Base", type: "select", required: true, options: [{ label: "Direct Labor Hours", value: "labor" }, { label: "Machine Hours", value: "machine" }, { label: "Headcount", value: "headcount" }, { label: "Revenue", value: "revenue" }] },
  ];

  const internalOrderFields: EntityField[] = [
    { name: "description", label: "Description", type: "text", required: true },
    { name: "type", label: "Order Type", type: "select", required: true, options: [{ label: "Capital", value: "Capital" }, { label: "Overhead", value: "Overhead" }, { label: "Maintenance", value: "Maintenance" }, { label: "Project", value: "Project" }] },
    { name: "costCenter", label: "Cost Center", type: "select", required: true, options: costCenters.map(c => ({ label: `${c.code} - ${c.name}`, value: c.name })) },
    { name: "budget", label: "Budget (EGP)", type: "number", required: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cost Accounting"
        description="Cost centers, profit centers, internal orders and activity-based costing"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDistributionOpen(true)}>
              <Play className="h-4 w-4 mr-2" /> Run Distribution
            </Button>
            <Button variant="outline" onClick={() => setInternalOrderOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Post Internal Order
            </Button>
            <Button onClick={() => setAllocateOpen(true)}>
              <ArrowLeftRight className="h-4 w-4 mr-2" /> Allocate Costs
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Building2} title="Total Cost Centers" value={totalCostCenters.toString()} subtitle="Active cost centers" iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={TrendingDown} title="Budget Variance %" value={`${budgetVariance}%`} subtitle="Overall variance" iconColor="bg-amber-100 text-amber-600" />
        <StatsCard icon={Calculator} title="Overhead Rate" value={overheadRate} subtitle="Manufacturing overhead" iconColor="bg-purple-100 text-purple-600" />
        <StatsCard icon={Activity} title="Activity Cost Rate" value={activityCostRate} subtitle="Average weighted rate" iconColor="bg-green-100 text-green-600" />
      </div>

      <Tabs defaultValue="cost-centers">
        <TabsList>
          <TabsTrigger value="cost-centers">Cost Centers</TabsTrigger>
          <TabsTrigger value="profit-centers">Profit Centers</TabsTrigger>
          <TabsTrigger value="internal-orders">Internal Orders</TabsTrigger>
          <TabsTrigger value="abc">Activity-Based Costing</TabsTrigger>
        </TabsList>

        {/* ── Cost Centers ── */}
        <TabsContent value="cost-centers" className="space-y-3">
          <FilterBar
            searchPlaceholder="Search cost centers..."
            searchValue={filters._search || ""}
            onSearchChange={(v) => setFilters(f => ({ ...f, _search: v }))}
            fields={[
              { key: "status", label: "Status", type: "select", options: [{ label: "Under Budget", value: "Under Budget" }, { label: "On Target", value: "On Target" }, { label: "Over Budget", value: "Over Budget" }] },
            ]}
            values={filters}
            onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))}
          />
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "code", label: "Code", render: (v: string) => <span className="font-mono text-xs font-medium">{v}</span> },
                  { key: "name", label: "Name", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "manager", label: "Manager" },
                  { key: "budget", label: "Budget", className: "text-right", render: (v: number) => <span>{fmt(v)}</span> },
                  { key: "actual", label: "Actual", className: "text-right", render: (v: number) => <span>{fmt(v)}</span> },
                  { key: "variance", label: "Variance", className: "text-right", render: (v: number) => <span className={v >= 0 ? "text-green-600" : "text-red-600 font-semibold"}>{v >= 0 ? "+" : ""}{fmt(v)}</span> },
                  { key: "variancePercent", label: "Variance %", className: "text-right", render: (v: number) => <span className={v >= 0 ? "text-green-600" : "text-red-600"}>{v >= 0 ? "+" : ""}{v.toFixed(1)}%</span> },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge className={v === "Under Budget" ? "bg-green-100 text-green-700" : v === "On Target" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}>{v}</Badge>
                  ) },
                ] as Column<Record<string, unknown>>[]}
                data={costCenters as unknown as Record<string, unknown>[]}
                emptyMessage="No cost centers found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Profit Centers ── */}
        <TabsContent value="profit-centers" className="space-y-3">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "code", label: "Code", render: (v: string) => <span className="font-mono text-xs font-medium">{v}</span> },
                  { key: "name", label: "Name", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "revenue", label: "Revenue", className: "text-right", render: (v: number) => <span className="text-green-600">{fmt(v)}</span> },
                  { key: "costs", label: "Costs", className: "text-right", render: (v: number) => <span className="text-red-600">{fmt(v)}</span> },
                  { key: "profit", label: "Profit", className: "text-right", render: (v: number) => <span className={v >= 0 ? "font-semibold text-green-700" : "font-semibold text-red-700"}>{fmt(v)}</span> },
                  { key: "marginPercent", label: "Margin %", className: "text-right", render: (v: number) => <span className={v >= 0 ? "text-green-600" : "text-red-600"}>{v.toFixed(1)}%</span> },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge className={v === "Profitable" ? "bg-green-100 text-green-700" : v === "Break Even" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>{v}</Badge>
                  ) },
                ] as Column<Record<string, unknown>>[]}
                data={profitCenters as unknown as Record<string, unknown>[]}
                emptyMessage="No profit centers found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Internal Orders ── */}
        <TabsContent value="internal-orders" className="space-y-3">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "orderNumber", label: "Order #", render: (v: string) => <span className="font-mono text-xs font-medium">{v}</span> },
                  { key: "description", label: "Description", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "type", label: "Type", render: (v: string) => <Badge variant="outline">{v}</Badge> },
                  { key: "costCenter", label: "Cost Center" },
                  { key: "budget", label: "Budget", className: "text-right", render: (v: number) => <span>{fmt(v)}</span> },
                  { key: "actual", label: "Actual", className: "text-right", render: (v: number) => <span>{fmt(v)}</span> },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge className={v === "Open" ? "bg-blue-100 text-blue-700" : v === "In Progress" ? "bg-amber-100 text-amber-700" : v === "Closed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>{v}</Badge>
                  ) },
                  { key: "createdDate", label: "Created", render: (v: string) => <span className="text-xs">{v}</span> },
                ] as Column<Record<string, unknown>>[]}
                data={internalOrders as unknown as Record<string, unknown>[]}
                emptyMessage="No internal orders found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Activity-Based Costing ── */}
        <TabsContent value="abc" className="space-y-3">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "activity", label: "Activity", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "costDriver", label: "Cost Driver" },
                  { key: "costPool", label: "Cost Pool", render: (v: string) => <Badge variant="outline">{v}</Badge> },
                  { key: "totalCost", label: "Total Cost", className: "text-right", render: (v: number) => <span>{fmt(v)}</span> },
                  { key: "volume", label: "Volume", className: "text-right", render: (v: number) => <span>{v.toLocaleString()}</span> },
                  { key: "ratePerUnit", label: "Rate/Unit", className: "text-right", render: (v: number) => <span className="font-semibold">{fmt(v)}</span> },
                  { key: "allocated", label: "Allocated", className: "text-right", render: (v: number) => <span className="text-green-600">{fmt(v)}</span> },
                  { key: "unallocated", label: "Unallocated", className: "text-right", render: (v: number) => <span className={v > 0 ? "text-amber-600" : ""}>{fmt(v)}</span> },
                ] as Column<Record<string, unknown>>[]}
                data={activityCosts as unknown as Record<string, unknown>[]}
                emptyMessage="No activity costs found."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Allocate Costs Modal ─── */}
      <EntityFormModal
        open={allocateOpen}
        onOpenChange={setAllocateOpen}
        title="Allocate Costs"
        fields={allocateFields}
        onSubmit={() => setAllocateOpen(false)}
      />

      {/* ─── Internal Order Modal ─── */}
      <EntityFormModal
        open={internalOrderOpen}
        onOpenChange={setInternalOrderOpen}
        title="Post Internal Order"
        fields={internalOrderFields}
        onSubmit={() => setInternalOrderOpen(false)}
      />

      {/* ─── Distribution Cycle Modal ─── */}
      <EntityFormModal
        open={distributionOpen}
        onOpenChange={setDistributionOpen}
        title="Run Distribution Cycle"
        fields={[
          { name: "cycle", label: "Distribution Cycle", type: "select", required: true, options: [{ label: "Monthly Overhead", value: "monthly" }, { label: "Quarterly Settlement", value: "quarterly" }, { label: "Year-End Close", value: "yearend" }] },
          { name: "period", label: "Period", type: "select", required: true, options: [{ label: "May 2026", value: "2026-05" }, { label: "Apr 2026", value: "2026-04" }, { label: "Q1 2026", value: "2026-Q1" }] },
          { name: "testRun", label: "Test Run Only", type: "select", options: [{ label: "Yes - Preview Only", value: "yes" }, { label: "No - Execute", value: "no" }] },
        ]}
        onSubmit={() => setDistributionOpen(false)}
      />
    </div>
  );
}
