"use client";

import { useState } from "react";
import {
  FileText,
  TrendingUp,
  Clock,
  Target,
  Plus,
  Calculator,
  Play,
  BookOpen,
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
interface RevRecContract {
  id: string;
  contractNumber: string;
  customer: string;
  totalValue: number;
  allocated: number;
  recognized: number;
  deferred: number;
  status: "Active" | "Completed" | "Pending Allocation" | "Suspended";
  startDate: string;
  endDate: string;
  obligations: number;
}

interface PerformanceObligation {
  id: string;
  contractNumber: string;
  obligation: string;
  transactionPrice: number;
  method: "Over Time" | "Point in Time";
  progress: number;
  recognized: number;
  remaining: number;
  status: "In Progress" | "Satisfied" | "Not Started";
}

interface RevenueSchedule {
  id: string;
  contractNumber: string;
  customer: string;
  period: string;
  scheduledAmount: number;
  recognizedAmount: number;
  status: "Recognized" | "Scheduled" | "Pending";
  journalRef: string | null;
}

interface RevRecJournal {
  id: string;
  journalRef: string;
  contractNumber: string;
  date: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  type: "Recognition" | "Deferral" | "Reallocation";
  status: "Posted" | "Draft" | "Reversed";
}

/* ─── Mock Data ─── */
const contracts: RevRecContract[] = [
  { id: "rc-1", contractNumber: "CON-2026-001", customer: "El-Ezaby Pharmacies", totalValue: 12500000, allocated: 12500000, recognized: 8750000, deferred: 3750000, status: "Active", startDate: "2026-01-01", endDate: "2027-06-30", obligations: 4 },
  { id: "rc-2", contractNumber: "CON-2026-002", customer: "Seif Pharmacies", totalValue: 8200000, allocated: 8200000, recognized: 6150000, deferred: 2050000, status: "Active", startDate: "2026-02-01", endDate: "2027-01-31", obligations: 3 },
  { id: "rc-3", contractNumber: "CON-2026-003", customer: "Saudi Health Ministry", totalValue: 15000000, allocated: 15000000, recognized: 3000000, deferred: 12000000, status: "Active", startDate: "2026-03-01", endDate: "2028-02-28", obligations: 5 },
  { id: "rc-4", contractNumber: "CON-2026-004", customer: "Delta Medical Group", totalValue: 4500000, allocated: 0, recognized: 0, deferred: 4500000, status: "Pending Allocation", startDate: "2026-05-01", endDate: "2027-04-30", obligations: 2 },
  { id: "rc-5", contractNumber: "CON-2025-018", customer: "Nile Health Network", totalValue: 6800000, allocated: 6800000, recognized: 6800000, deferred: 0, status: "Completed", startDate: "2025-06-01", endDate: "2026-05-31", obligations: 3 },
  { id: "rc-6", contractNumber: "CON-2026-005", customer: "Cairo University Hospital", totalValue: 3200000, allocated: 3200000, recognized: 800000, deferred: 2400000, status: "Active", startDate: "2026-04-01", endDate: "2027-03-31", obligations: 2 },
];

const performanceObligations: PerformanceObligation[] = [
  { id: "po-1", contractNumber: "CON-2026-001", obligation: "Product Delivery - Batch 1", transactionPrice: 5000000, method: "Point in Time", progress: 100, recognized: 5000000, remaining: 0, status: "Satisfied" },
  { id: "po-2", contractNumber: "CON-2026-001", obligation: "Installation & Training", transactionPrice: 2500000, method: "Over Time", progress: 75, recognized: 1875000, remaining: 625000, status: "In Progress" },
  { id: "po-3", contractNumber: "CON-2026-001", obligation: "Maintenance (Year 1)", transactionPrice: 3000000, method: "Over Time", progress: 42, recognized: 1260000, remaining: 1740000, status: "In Progress" },
  { id: "po-4", contractNumber: "CON-2026-001", obligation: "Extended Warranty", transactionPrice: 2000000, method: "Over Time", progress: 31, recognized: 615000, remaining: 1385000, status: "In Progress" },
  { id: "po-5", contractNumber: "CON-2026-002", obligation: "Drug Supply Agreement", transactionPrice: 6000000, method: "Over Time", progress: 68, recognized: 4080000, remaining: 1920000, status: "In Progress" },
  { id: "po-6", contractNumber: "CON-2026-002", obligation: "Shelf Display Rights", transactionPrice: 1200000, method: "Over Time", progress: 50, recognized: 600000, remaining: 600000, status: "In Progress" },
  { id: "po-7", contractNumber: "CON-2026-002", obligation: "Marketing Support", transactionPrice: 1000000, method: "Point in Time", progress: 100, recognized: 1000000, remaining: 0, status: "Satisfied" },
  { id: "po-8", contractNumber: "CON-2026-003", obligation: "Medical Equipment Supply", transactionPrice: 9000000, method: "Point in Time", progress: 33, recognized: 3000000, remaining: 6000000, status: "In Progress" },
  { id: "po-9", contractNumber: "CON-2026-003", obligation: "Installation Services", transactionPrice: 2000000, method: "Over Time", progress: 0, recognized: 0, remaining: 2000000, status: "Not Started" },
];

const revenueSchedules: RevenueSchedule[] = [
  { id: "rs-1", contractNumber: "CON-2026-001", customer: "El-Ezaby Pharmacies", period: "Jan 2026", scheduledAmount: 1500000, recognizedAmount: 1500000, status: "Recognized", journalRef: "JE-RR-001" },
  { id: "rs-2", contractNumber: "CON-2026-001", customer: "El-Ezaby Pharmacies", period: "Feb 2026", scheduledAmount: 1500000, recognizedAmount: 1500000, status: "Recognized", journalRef: "JE-RR-002" },
  { id: "rs-3", contractNumber: "CON-2026-001", customer: "El-Ezaby Pharmacies", period: "Mar 2026", scheduledAmount: 1500000, recognizedAmount: 1500000, status: "Recognized", journalRef: "JE-RR-003" },
  { id: "rs-4", contractNumber: "CON-2026-001", customer: "El-Ezaby Pharmacies", period: "Apr 2026", scheduledAmount: 1500000, recognizedAmount: 1500000, status: "Recognized", journalRef: "JE-RR-004" },
  { id: "rs-5", contractNumber: "CON-2026-001", customer: "El-Ezaby Pharmacies", period: "May 2026", scheduledAmount: 1500000, recognizedAmount: 750000, status: "Pending", journalRef: null },
  { id: "rs-6", contractNumber: "CON-2026-002", customer: "Seif Pharmacies", period: "May 2026", scheduledAmount: 820000, recognizedAmount: 0, status: "Scheduled", journalRef: null },
  { id: "rs-7", contractNumber: "CON-2026-003", customer: "Saudi Health Ministry", period: "May 2026", scheduledAmount: 500000, recognizedAmount: 0, status: "Scheduled", journalRef: null },
];

const journalEntries: RevRecJournal[] = [
  { id: "je-1", journalRef: "JE-RR-001", contractNumber: "CON-2026-001", date: "2026-01-31", debitAccount: "Accounts Receivable", creditAccount: "Revenue - Products", amount: 1500000, type: "Recognition", status: "Posted" },
  { id: "je-2", journalRef: "JE-RR-002", contractNumber: "CON-2026-001", date: "2026-02-28", debitAccount: "Accounts Receivable", creditAccount: "Revenue - Services", amount: 1500000, type: "Recognition", status: "Posted" },
  { id: "je-3", journalRef: "JE-RR-003", contractNumber: "CON-2026-001", date: "2026-03-31", debitAccount: "Deferred Revenue", creditAccount: "Revenue - Services", amount: 1500000, type: "Recognition", status: "Posted" },
  { id: "je-4", journalRef: "JE-RR-004", contractNumber: "CON-2026-001", date: "2026-04-30", debitAccount: "Deferred Revenue", creditAccount: "Revenue - Maintenance", amount: 1500000, type: "Recognition", status: "Posted" },
  { id: "je-5", journalRef: "JE-RR-DEF-001", contractNumber: "CON-2026-004", date: "2026-05-01", debitAccount: "Cash", creditAccount: "Deferred Revenue", amount: 4500000, type: "Deferral", status: "Posted" },
  { id: "je-6", journalRef: "JE-RR-005", contractNumber: "CON-2026-002", date: "2026-05-01", debitAccount: "Deferred Revenue", creditAccount: "Revenue - Products", amount: 820000, type: "Recognition", status: "Draft" },
];

const fmt = (n: number) => `EGP ${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function RevenueRecognitionPage() {
  const [filters, setFilters] = useState<FilterState>({});
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);

  const contractsInProgress = contracts.filter(c => c.status === "Active").length;
  const totalDeferred = contracts.reduce((s, c) => s + c.deferred, 0);
  const recognizedThisPeriod = revenueSchedules.filter(r => r.period === "May 2026" && r.status === "Recognized").reduce((s, r) => s + r.recognizedAmount, 0) || journalEntries.filter(j => j.date.startsWith("2026-05") && j.type === "Recognition" && j.status === "Posted").reduce((s, j) => s + j.amount, 0);
  const pendingAllocation = contracts.filter(c => c.status === "Pending Allocation").length;

  /* ─── Modal Fields ─── */
  const allocateFields: EntityField[] = [
    { name: "contract", label: "Contract", type: "select", required: true, options: contracts.filter(c => c.status === "Pending Allocation" || c.status === "Active").map(c => ({ label: `${c.contractNumber} - ${c.customer}`, value: c.contractNumber })) },
    { name: "method", label: "Allocation Method", type: "select", required: true, options: [{ label: "Standalone Selling Price", value: "ssp" }, { label: "Adjusted Market Approach", value: "market" }, { label: "Expected Cost + Margin", value: "cost-plus" }, { label: "Residual Approach", value: "residual" }] },
    { name: "notes", label: "Notes", type: "textarea", fullWidth: true },
  ];

  const progressFields: EntityField[] = [
    { name: "obligation", label: "Performance Obligation", type: "select", required: true, options: performanceObligations.filter(p => p.status === "In Progress").map(p => ({ label: `${p.contractNumber} - ${p.obligation}`, value: p.id })) },
    { name: "method", label: "Measurement Method", type: "select", required: true, options: [{ label: "Input Method (Cost)", value: "input-cost" }, { label: "Input Method (Effort)", value: "input-effort" }, { label: "Output Method (Units)", value: "output-units" }, { label: "Output Method (Milestones)", value: "output-milestones" }] },
    { name: "progress", label: "Progress %", type: "number", required: true },
    { name: "date", label: "Measurement Date", type: "date", required: true },
  ];

  const scheduleFields: EntityField[] = [
    { name: "contract", label: "Contract", type: "select", required: true, options: contracts.filter(c => c.status === "Active").map(c => ({ label: `${c.contractNumber} - ${c.customer}`, value: c.contractNumber })) },
    { name: "startPeriod", label: "Start Period", type: "select", required: true, options: [{ label: "May 2026", value: "2026-05" }, { label: "Jun 2026", value: "2026-06" }, { label: "Jul 2026", value: "2026-07" }] },
    { name: "frequency", label: "Frequency", type: "select", required: true, options: [{ label: "Monthly", value: "monthly" }, { label: "Quarterly", value: "quarterly" }] },
  ];

  const postFields: EntityField[] = [
    { name: "period", label: "Period", type: "select", required: true, options: [{ label: "May 2026", value: "2026-05" }, { label: "Apr 2026", value: "2026-04" }] },
    { name: "contracts", label: "Contracts", type: "select", required: true, options: [{ label: "All Active Contracts", value: "all" }, ...contracts.filter(c => c.status === "Active").map(c => ({ label: c.contractNumber, value: c.contractNumber }))] },
    { name: "postingDate", label: "Posting Date", type: "date", required: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue Recognition (IFRS 15 / ASC 606)"
        description="Contract revenue allocation, performance obligations, and recognition scheduling"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPostOpen(true)}>
              <BookOpen className="h-4 w-4 mr-2" /> Post Recognition
            </Button>
            <Button variant="outline" onClick={() => setScheduleOpen(true)}>
              <Play className="h-4 w-4 mr-2" /> Generate Schedule
            </Button>
            <Button variant="outline" onClick={() => setProgressOpen(true)}>
              <Calculator className="h-4 w-4 mr-2" /> Calculate Progress
            </Button>
            <Button onClick={() => setAllocateOpen(true)}>
              <Target className="h-4 w-4 mr-2" /> Allocate Price
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={FileText} title="Contracts in Progress" value={contractsInProgress.toString()} subtitle="Active rev rec contracts" iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={Clock} title="Deferred Revenue" value={fmt(totalDeferred)} subtitle="To be recognized" iconColor="bg-amber-100 text-amber-600" />
        <StatsCard icon={TrendingUp} title="Recognized This Period" value={fmt(recognizedThisPeriod)} subtitle="May 2026" iconColor="bg-green-100 text-green-600" />
        <StatsCard icon={Target} title="Pending Allocation" value={pendingAllocation.toString()} subtitle="Contracts awaiting allocation" iconColor="bg-purple-100 text-purple-600" />
      </div>

      <Tabs defaultValue="contracts">
        <TabsList>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="obligations">Performance Obligations</TabsTrigger>
          <TabsTrigger value="schedule">Revenue Schedule</TabsTrigger>
          <TabsTrigger value="journals">Journal Entries</TabsTrigger>
        </TabsList>

        {/* ── Contracts ── */}
        <TabsContent value="contracts" className="space-y-3">
          <FilterBar
            searchPlaceholder="Search contracts..."
            searchValue={filters._search || ""}
            onSearchChange={(v) => setFilters(f => ({ ...f, _search: v }))}
            fields={[
              { key: "status", label: "Status", type: "select", options: [{ label: "Active", value: "Active" }, { label: "Completed", value: "Completed" }, { label: "Pending Allocation", value: "Pending Allocation" }] },
            ]}
            values={filters}
            onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))}
          />
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "contractNumber", label: "Contract #", render: (v: string) => <span className="font-mono text-xs font-medium">{v}</span> },
                  { key: "customer", label: "Customer", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "totalValue", label: "Total Value", className: "text-right", render: (v: number) => <span>{fmt(v)}</span> },
                  { key: "allocated", label: "Allocated", className: "text-right", render: (v: number) => <span>{fmt(v)}</span> },
                  { key: "recognized", label: "Recognized", className: "text-right", render: (v: number) => <span className="text-green-600">{fmt(v)}</span> },
                  { key: "deferred", label: "Deferred", className: "text-right", render: (v: number) => <span className="text-amber-600">{fmt(v)}</span> },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge className={v === "Active" ? "bg-blue-100 text-blue-700" : v === "Completed" ? "bg-green-100 text-green-700" : v === "Pending Allocation" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>{v}</Badge>
                  ) },
                  { key: "obligations", label: "Obligations", className: "text-center", render: (v: number) => <span>{v}</span> },
                ] as Column<Record<string, unknown>>[]}
                data={contracts as unknown as Record<string, unknown>[]}
                emptyMessage="No contracts found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Performance Obligations ── */}
        <TabsContent value="obligations" className="space-y-3">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "contractNumber", label: "Contract", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "obligation", label: "Obligation", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "transactionPrice", label: "Transaction Price", className: "text-right", render: (v: number) => <span>{fmt(v)}</span> },
                  { key: "method", label: "Method", render: (v: string) => (
                    <Badge variant="outline" className={v === "Over Time" ? "border-blue-300 text-blue-700" : "border-purple-300 text-purple-700"}>{v}</Badge>
                  ) },
                  { key: "progress", label: "Progress %", className: "text-right", render: (v: number) => (
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${v}%` }} />
                      </div>
                      <span className="text-xs font-medium">{v}%</span>
                    </div>
                  ) },
                  { key: "recognized", label: "Recognized", className: "text-right", render: (v: number) => <span className="text-green-600">{fmt(v)}</span> },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge className={v === "Satisfied" ? "bg-green-100 text-green-700" : v === "In Progress" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}>{v}</Badge>
                  ) },
                ] as Column<Record<string, unknown>>[]}
                data={performanceObligations as unknown as Record<string, unknown>[]}
                emptyMessage="No performance obligations found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Revenue Schedule ── */}
        <TabsContent value="schedule" className="space-y-3">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "contractNumber", label: "Contract", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "customer", label: "Customer", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "period", label: "Period" },
                  { key: "scheduledAmount", label: "Scheduled", className: "text-right", render: (v: number) => <span>{fmt(v)}</span> },
                  { key: "recognizedAmount", label: "Recognized", className: "text-right", render: (v: number) => <span className="text-green-600">{fmt(v)}</span> },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge className={v === "Recognized" ? "bg-green-100 text-green-700" : v === "Scheduled" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}>{v}</Badge>
                  ) },
                  { key: "journalRef", label: "Journal Ref", render: (v: string | null) => <span className="font-mono text-xs">{v || "—"}</span> },
                ] as Column<Record<string, unknown>>[]}
                data={revenueSchedules as unknown as Record<string, unknown>[]}
                emptyMessage="No revenue schedule entries found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Journal Entries ── */}
        <TabsContent value="journals" className="space-y-3">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "journalRef", label: "Reference", render: (v: string) => <span className="font-mono text-xs font-medium">{v}</span> },
                  { key: "contractNumber", label: "Contract", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "date", label: "Date", render: (v: string) => <span className="text-xs">{v}</span> },
                  { key: "debitAccount", label: "Debit Account" },
                  { key: "creditAccount", label: "Credit Account" },
                  { key: "amount", label: "Amount", className: "text-right", render: (v: number) => <span className="font-semibold">{fmt(v)}</span> },
                  { key: "type", label: "Type", render: (v: string) => (
                    <Badge variant="outline" className={v === "Recognition" ? "border-green-300 text-green-700" : v === "Deferral" ? "border-amber-300 text-amber-700" : "border-blue-300 text-blue-700"}>{v}</Badge>
                  ) },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge className={v === "Posted" ? "bg-green-100 text-green-700" : v === "Draft" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}>{v}</Badge>
                  ) },
                ] as Column<Record<string, unknown>>[]}
                data={journalEntries as unknown as Record<string, unknown>[]}
                emptyMessage="No journal entries found."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Allocate Transaction Price Modal ─── */}
      <EntityFormModal
        open={allocateOpen}
        onOpenChange={setAllocateOpen}
        title="Allocate Transaction Price"
        fields={allocateFields}
        onSubmit={() => setAllocateOpen(false)}
      />

      {/* ─── Calculate Progress Modal ─── */}
      <EntityFormModal
        open={progressOpen}
        onOpenChange={setProgressOpen}
        title="Calculate Progress"
        fields={progressFields}
        onSubmit={() => setProgressOpen(false)}
      />

      {/* ─── Generate Schedule Modal ─── */}
      <EntityFormModal
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        title="Generate Revenue Schedule"
        fields={scheduleFields}
        onSubmit={() => setScheduleOpen(false)}
      />

      {/* ─── Post Recognition Modal ─── */}
      <EntityFormModal
        open={postOpen}
        onOpenChange={setPostOpen}
        title="Post Revenue Recognition"
        fields={postFields}
        onSubmit={() => setPostOpen(false)}
      />
    </div>
  );
}
