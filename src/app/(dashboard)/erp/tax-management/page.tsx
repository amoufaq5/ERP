"use client";

import { useState } from "react";
import {
  Receipt,
  FileText,
  Calendar,
  AlertTriangle,
  Plus,
  Play,
  FileSpreadsheet,
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
interface TaxCode {
  id: string;
  code: string;
  name: string;
  type: "VAT" | "Sales" | "Income" | "Withholding";
  rate: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: "Active" | "Inactive" | "Pending";
  jurisdiction: string;
}

interface TaxReturn {
  id: string;
  period: string;
  type: "VAT" | "Income Tax" | "Withholding" | "Sales Tax";
  status: "Draft" | "Filed" | "Accepted" | "Rejected";
  amount: number;
  dueDate: string;
  filedDate: string | null;
  reference: string | null;
}

interface WithholdingEntry {
  id: string;
  vendor: string;
  invoiceRef: string;
  grossAmount: number;
  withholdingRate: number;
  withholdingAmount: number;
  netAmount: number;
  taxCode: string;
  period: string;
  status: "Calculated" | "Paid" | "Reported";
}

interface TaxReconciliation {
  id: string;
  period: string;
  type: string;
  bookAmount: number;
  returnAmount: number;
  difference: number;
  status: "Matched" | "Variance" | "Pending";
  notes: string;
}

/* ─── Mock Data ─── */
const taxCodes: TaxCode[] = [
  { id: "tc-1", code: "VAT-14", name: "Standard VAT", type: "VAT", rate: 14, effectiveFrom: "2023-01-01", effectiveTo: null, status: "Active", jurisdiction: "Egypt" },
  { id: "tc-2", code: "VAT-0", name: "Zero-Rated VAT", type: "VAT", rate: 0, effectiveFrom: "2023-01-01", effectiveTo: null, status: "Active", jurisdiction: "Egypt" },
  { id: "tc-3", code: "VAT-EX", name: "VAT Exempt", type: "VAT", rate: 0, effectiveFrom: "2023-01-01", effectiveTo: null, status: "Active", jurisdiction: "Egypt" },
  { id: "tc-4", code: "WHT-5", name: "Withholding Tax 5%", type: "Withholding", rate: 5, effectiveFrom: "2024-01-01", effectiveTo: null, status: "Active", jurisdiction: "Egypt" },
  { id: "tc-5", code: "WHT-10", name: "Withholding Tax 10%", type: "Withholding", rate: 10, effectiveFrom: "2024-01-01", effectiveTo: null, status: "Active", jurisdiction: "Egypt" },
  { id: "tc-6", code: "INC-22.5", name: "Corporate Income Tax", type: "Income", rate: 22.5, effectiveFrom: "2024-01-01", effectiveTo: null, status: "Active", jurisdiction: "Egypt" },
  { id: "tc-7", code: "SAL-10", name: "Sales Tax (Services)", type: "Sales", rate: 10, effectiveFrom: "2023-06-01", effectiveTo: null, status: "Active", jurisdiction: "Egypt" },
  { id: "tc-8", code: "VAT-SA-15", name: "Saudi VAT", type: "VAT", rate: 15, effectiveFrom: "2025-01-01", effectiveTo: null, status: "Active", jurisdiction: "Saudi Arabia" },
  { id: "tc-9", code: "VAT-AE-5", name: "UAE VAT", type: "VAT", rate: 5, effectiveFrom: "2024-01-01", effectiveTo: null, status: "Active", jurisdiction: "UAE" },
  { id: "tc-10", code: "WHT-OLD", name: "Withholding (Old Rate)", type: "Withholding", rate: 3, effectiveFrom: "2020-01-01", effectiveTo: "2023-12-31", status: "Inactive", jurisdiction: "Egypt" },
];

const taxReturns: TaxReturn[] = [
  { id: "tr-1", period: "Apr 2026", type: "VAT", status: "Filed", amount: 1850000, dueDate: "2026-05-15", filedDate: "2026-05-08", reference: "VAT-2026-04-001" },
  { id: "tr-2", period: "May 2026", type: "VAT", status: "Draft", amount: 1920000, dueDate: "2026-06-15", filedDate: null, reference: null },
  { id: "tr-3", period: "Q1 2026", type: "Income Tax", status: "Accepted", amount: 4500000, dueDate: "2026-04-30", filedDate: "2026-04-25", reference: "INC-2026-Q1" },
  { id: "tr-4", period: "Apr 2026", type: "Withholding", status: "Filed", amount: 320000, dueDate: "2026-05-10", filedDate: "2026-05-09", reference: "WHT-2026-04" },
  { id: "tr-5", period: "May 2026", type: "Withholding", status: "Draft", amount: 285000, dueDate: "2026-06-10", filedDate: null, reference: null },
  { id: "tr-6", period: "Q4 2025", type: "Income Tax", status: "Rejected", amount: 3800000, dueDate: "2026-01-31", filedDate: "2026-01-28", reference: "INC-2025-Q4-REJ" },
];

const withholdingEntries: WithholdingEntry[] = [
  { id: "wh-1", vendor: "MedSupply Co.", invoiceRef: "INV-MS-2026-089", grossAmount: 500000, withholdingRate: 5, withholdingAmount: 25000, netAmount: 475000, taxCode: "WHT-5", period: "May 2026", status: "Calculated" },
  { id: "wh-2", vendor: "Pharma Logistics", invoiceRef: "INV-PL-2026-045", grossAmount: 320000, withholdingRate: 5, withholdingAmount: 16000, netAmount: 304000, taxCode: "WHT-5", period: "May 2026", status: "Calculated" },
  { id: "wh-3", vendor: "IT Solutions Ltd", invoiceRef: "INV-IT-2026-012", grossAmount: 180000, withholdingRate: 10, withholdingAmount: 18000, netAmount: 162000, taxCode: "WHT-10", period: "May 2026", status: "Calculated" },
  { id: "wh-4", vendor: "Consulting Group", invoiceRef: "INV-CG-2026-033", grossAmount: 250000, withholdingRate: 10, withholdingAmount: 25000, netAmount: 225000, taxCode: "WHT-10", period: "Apr 2026", status: "Paid" },
  { id: "wh-5", vendor: "Delta Transport", invoiceRef: "INV-DT-2026-078", grossAmount: 150000, withholdingRate: 5, withholdingAmount: 7500, netAmount: 142500, taxCode: "WHT-5", period: "Apr 2026", status: "Reported" },
];

const taxReconciliations: TaxReconciliation[] = [
  { id: "rec-1", period: "Apr 2026", type: "VAT Output", bookAmount: 2100000, returnAmount: 2100000, difference: 0, status: "Matched", notes: "Fully reconciled" },
  { id: "rec-2", period: "Apr 2026", type: "VAT Input", bookAmount: 250000, returnAmount: 248500, difference: 1500, status: "Variance", notes: "Timing difference on 2 invoices" },
  { id: "rec-3", period: "Apr 2026", type: "Withholding", bookAmount: 320000, returnAmount: 320000, difference: 0, status: "Matched", notes: "Fully reconciled" },
  { id: "rec-4", period: "May 2026", type: "VAT Output", bookAmount: 1920000, returnAmount: 0, difference: 1920000, status: "Pending", notes: "Return not yet filed" },
];

const fmt = (n: number) => `EGP ${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function TaxManagementPage() {
  const [filters, setFilters] = useState<FilterState>({});
  const [taxCodeOpen, setTaxCodeOpen] = useState(false);
  const [fileReturnOpen, setFileReturnOpen] = useState(false);
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const activeCodes = taxCodes.filter(c => c.status === "Active").length;
  const pendingFilings = taxReturns.filter(r => r.status === "Draft").length;
  const taxLiabilityMTD = taxReturns.filter(r => r.period === "May 2026").reduce((s, r) => s + r.amount, 0);
  const lastFilingDate = taxReturns.filter(r => r.filedDate).sort((a, b) => (b.filedDate || "").localeCompare(a.filedDate || ""))[0]?.filedDate || "—";

  /* ─── Modal Fields ─── */
  const taxCodeFields: EntityField[] = [
    { name: "code", label: "Tax Code", type: "text", required: true, placeholder: "e.g., VAT-14" },
    { name: "name", label: "Name", type: "text", required: true },
    { name: "type", label: "Type", type: "select", required: true, options: [{ label: "VAT", value: "VAT" }, { label: "Sales", value: "Sales" }, { label: "Income", value: "Income" }, { label: "Withholding", value: "Withholding" }] },
    { name: "rate", label: "Rate (%)", type: "number", required: true },
    { name: "effectiveFrom", label: "Effective From", type: "date", required: true },
    { name: "jurisdiction", label: "Jurisdiction", type: "select", required: true, options: [{ label: "Egypt", value: "Egypt" }, { label: "Saudi Arabia", value: "Saudi Arabia" }, { label: "UAE", value: "UAE" }, { label: "Jordan", value: "Jordan" }] },
  ];

  const fileReturnFields: EntityField[] = [
    { name: "period", label: "Period", type: "select", required: true, options: [{ label: "May 2026", value: "May 2026" }, { label: "Apr 2026", value: "Apr 2026" }, { label: "Q2 2026", value: "Q2 2026" }] },
    { name: "type", label: "Return Type", type: "select", required: true, options: [{ label: "VAT", value: "VAT" }, { label: "Income Tax", value: "Income Tax" }, { label: "Withholding", value: "Withholding" }, { label: "Sales Tax", value: "Sales Tax" }] },
    { name: "amount", label: "Amount (EGP)", type: "number", required: true },
    { name: "reference", label: "Filing Reference", type: "text" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax Management"
        description="Tax codes, returns filing, withholding management and reconciliation"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setReportOpen(true)}>
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Tax Report
            </Button>
            <Button variant="outline" onClick={() => setReconcileOpen(true)}>
              <Play className="h-4 w-4 mr-2" /> Reconcile
            </Button>
            <Button variant="outline" onClick={() => setFileReturnOpen(true)}>
              <FileText className="h-4 w-4 mr-2" /> File Return
            </Button>
            <Button onClick={() => setTaxCodeOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create Tax Code
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Receipt} title="Tax Codes Active" value={activeCodes.toString()} subtitle="Across all jurisdictions" iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={AlertTriangle} title="Pending Filings" value={pendingFilings.toString()} subtitle="Returns to file" iconColor="bg-amber-100 text-amber-600" />
        <StatsCard icon={FileText} title="Tax Liability MTD" value={fmt(taxLiabilityMTD)} subtitle="May 2026" iconColor="bg-red-100 text-red-600" />
        <StatsCard icon={Calendar} title="Last Filing Date" value={lastFilingDate} subtitle="Most recent filing" iconColor="bg-green-100 text-green-600" />
      </div>

      <Tabs defaultValue="tax-codes">
        <TabsList>
          <TabsTrigger value="tax-codes">Tax Codes</TabsTrigger>
          <TabsTrigger value="tax-returns">Tax Returns</TabsTrigger>
          <TabsTrigger value="withholding">Withholding</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
        </TabsList>

        {/* ── Tax Codes ── */}
        <TabsContent value="tax-codes" className="space-y-3">
          <FilterBar
            searchPlaceholder="Search tax codes..."
            searchValue={filters._search || ""}
            onSearchChange={(v) => setFilters(f => ({ ...f, _search: v }))}
            fields={[
              { key: "type", label: "Type", type: "select", options: [{ label: "VAT", value: "VAT" }, { label: "Sales", value: "Sales" }, { label: "Income", value: "Income" }, { label: "Withholding", value: "Withholding" }] },
              { key: "status", label: "Status", type: "select", options: [{ label: "Active", value: "Active" }, { label: "Inactive", value: "Inactive" }] },
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
                  { key: "type", label: "Type", render: (v: string) => (
                    <Badge className={v === "VAT" ? "bg-blue-100 text-blue-700" : v === "Sales" ? "bg-purple-100 text-purple-700" : v === "Income" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>{v}</Badge>
                  ) },
                  { key: "rate", label: "Rate %", className: "text-right", render: (v: number) => <span className="font-semibold">{v}%</span> },
                  { key: "effectiveFrom", label: "Effective From", render: (v: string) => <span className="text-xs">{v}</span> },
                  { key: "jurisdiction", label: "Jurisdiction" },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge className={v === "Active" ? "bg-green-100 text-green-700" : v === "Inactive" ? "bg-gray-100 text-gray-700" : "bg-amber-100 text-amber-700"}>{v}</Badge>
                  ) },
                ] as Column<Record<string, unknown>>[]}
                data={taxCodes as unknown as Record<string, unknown>[]}
                emptyMessage="No tax codes found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tax Returns ── */}
        <TabsContent value="tax-returns" className="space-y-3">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "period", label: "Period", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "type", label: "Type", render: (v: string) => <Badge variant="outline">{v}</Badge> },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge className={v === "Accepted" ? "bg-green-100 text-green-700" : v === "Filed" ? "bg-blue-100 text-blue-700" : v === "Draft" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>{v}</Badge>
                  ) },
                  { key: "amount", label: "Amount", className: "text-right", render: (v: number) => <span className="font-semibold">{fmt(v)}</span> },
                  { key: "dueDate", label: "Due Date", render: (v: string) => {
                    const isOverdue = new Date(v) < new Date() && !["Accepted", "Filed"].includes("");
                    return <span className={`text-xs ${isOverdue ? "text-red-600 font-semibold" : ""}`}>{v}</span>;
                  } },
                  { key: "filedDate", label: "Filed Date", render: (v: string | null) => <span className="text-xs">{v || "—"}</span> },
                  { key: "reference", label: "Reference", render: (v: string | null) => <span className="font-mono text-xs">{v || "—"}</span> },
                ] as Column<Record<string, unknown>>[]}
                data={taxReturns as unknown as Record<string, unknown>[]}
                emptyMessage="No tax returns found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Withholding ── */}
        <TabsContent value="withholding" className="space-y-3">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "vendor", label: "Vendor", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "invoiceRef", label: "Invoice Ref", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "grossAmount", label: "Gross Amount", className: "text-right", render: (v: number) => <span>{fmt(v)}</span> },
                  { key: "withholdingRate", label: "WHT Rate", className: "text-right", render: (v: number) => <span>{v}%</span> },
                  { key: "withholdingAmount", label: "WHT Amount", className: "text-right", render: (v: number) => <span className="font-semibold text-amber-600">{fmt(v)}</span> },
                  { key: "netAmount", label: "Net Amount", className: "text-right", render: (v: number) => <span className="font-semibold">{fmt(v)}</span> },
                  { key: "taxCode", label: "Tax Code", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge className={v === "Reported" ? "bg-green-100 text-green-700" : v === "Paid" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}>{v}</Badge>
                  ) },
                ] as Column<Record<string, unknown>>[]}
                data={withholdingEntries as unknown as Record<string, unknown>[]}
                emptyMessage="No withholding entries found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Reconciliation ── */}
        <TabsContent value="reconciliation" className="space-y-3">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "period", label: "Period", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "type", label: "Type", render: (v: string) => <Badge variant="outline">{v}</Badge> },
                  { key: "bookAmount", label: "Book Amount", className: "text-right", render: (v: number) => <span>{fmt(v)}</span> },
                  { key: "returnAmount", label: "Return Amount", className: "text-right", render: (v: number) => <span>{fmt(v)}</span> },
                  { key: "difference", label: "Difference", className: "text-right", render: (v: number) => <span className={v === 0 ? "text-green-600" : "text-red-600 font-semibold"}>{fmt(v)}</span> },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge className={v === "Matched" ? "bg-green-100 text-green-700" : v === "Variance" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}>{v}</Badge>
                  ) },
                  { key: "notes", label: "Notes", render: (v: string) => <span className="text-xs text-muted-foreground">{v}</span> },
                ] as Column<Record<string, unknown>>[]}
                data={taxReconciliations as unknown as Record<string, unknown>[]}
                emptyMessage="No reconciliation data."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Create Tax Code Modal ─── */}
      <EntityFormModal
        open={taxCodeOpen}
        onOpenChange={setTaxCodeOpen}
        title="Create Tax Code"
        fields={taxCodeFields}
        onSubmit={() => setTaxCodeOpen(false)}
      />

      {/* ─── File Return Modal ─── */}
      <EntityFormModal
        open={fileReturnOpen}
        onOpenChange={setFileReturnOpen}
        title="File Tax Return"
        fields={fileReturnFields}
        onSubmit={() => setFileReturnOpen(false)}
      />

      {/* ─── Reconciliation Modal ─── */}
      <EntityFormModal
        open={reconcileOpen}
        onOpenChange={setReconcileOpen}
        title="Run Tax Reconciliation"
        fields={[
          { name: "period", label: "Period", type: "select", required: true, options: [{ label: "May 2026", value: "May 2026" }, { label: "Apr 2026", value: "Apr 2026" }] },
          { name: "type", label: "Tax Type", type: "select", required: true, options: [{ label: "All", value: "all" }, { label: "VAT", value: "VAT" }, { label: "Withholding", value: "Withholding" }, { label: "Income Tax", value: "Income Tax" }] },
        ]}
        onSubmit={() => setReconcileOpen(false)}
      />

      {/* ─── Tax Report Modal ─── */}
      <EntityFormModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        title="Generate Tax Report"
        fields={[
          { name: "reportType", label: "Report Type", type: "select", required: true, options: [{ label: "VAT Summary", value: "vat-summary" }, { label: "Withholding Register", value: "wht-register" }, { label: "Tax Liability Report", value: "liability" }, { label: "Annual Tax Return", value: "annual" }] },
          { name: "period", label: "Period", type: "select", required: true, options: [{ label: "May 2026", value: "May 2026" }, { label: "Q1 2026", value: "Q1 2026" }, { label: "FY 2025", value: "FY 2025" }] },
          { name: "format", label: "Format", type: "select", options: [{ label: "PDF", value: "pdf" }, { label: "Excel", value: "excel" }, { label: "CSV", value: "csv" }] },
        ]}
        onSubmit={() => setReportOpen(false)}
      />
    </div>
  );
}
