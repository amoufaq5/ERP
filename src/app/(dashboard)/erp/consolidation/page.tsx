"use client";

import { useState } from "react";
import {
  Building2,
  ArrowLeftRight,
  FileCheck,
  BarChart3,
  Plus,
  Play,
  Link2,
  FileSpreadsheet,
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
interface ConsolidationEntity {
  id: string;
  entityCode: string;
  name: string;
  currency: string;
  ownership: number;
  status: "Draft" | "Submitted" | "Approved" | "Rejected";
  lastCloseDate: string;
  totalAssets: number;
  totalRevenue: number;
}

interface IntercompanyTransaction {
  id: string;
  sender: string;
  receiver: string;
  account: string;
  amount: number;
  currency: string;
  matched: boolean;
  matchedDate: string | null;
  period: string;
}

interface EliminationEntry {
  id: string;
  type: "Intercompany Sales" | "Intercompany Loan" | "Dividend" | "Investment" | "Unrealized Profit";
  debitEntity: string;
  creditEntity: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  status: "Pending" | "Posted" | "Reversed";
  period: string;
}

interface ConsolidatedReport {
  id: string;
  name: string;
  type: "Balance Sheet" | "P&L" | "Cash Flow" | "Equity";
  period: string;
  generatedDate: string;
  status: "Draft" | "Final" | "Published";
  entities: number;
}

/* ─── Mock Data ─── */
const entities: ConsolidationEntity[] = [
  { id: "e-1", entityCode: "EG-HQ", name: "Parent Co. (Egypt HQ)", currency: "EGP", ownership: 100, status: "Approved", lastCloseDate: "2026-04-30", totalAssets: 85000000, totalRevenue: 42000000 },
  { id: "e-2", entityCode: "EG-MFG", name: "Manufacturing Subsidiary", currency: "EGP", ownership: 100, status: "Approved", lastCloseDate: "2026-04-30", totalAssets: 32000000, totalRevenue: 18000000 },
  { id: "e-3", entityCode: "SA-OPS", name: "Saudi Operations", currency: "SAR", ownership: 80, status: "Submitted", lastCloseDate: "2026-04-30", totalAssets: 15000000, totalRevenue: 9500000 },
  { id: "e-4", entityCode: "AE-DIST", name: "UAE Distribution", currency: "AED", ownership: 100, status: "Draft", lastCloseDate: "2026-03-31", totalAssets: 8500000, totalRevenue: 6200000 },
  { id: "e-5", entityCode: "JO-RD", name: "Jordan R&D Center", currency: "JOD", ownership: 70, status: "Submitted", lastCloseDate: "2026-04-30", totalAssets: 4200000, totalRevenue: 2100000 },
];

const intercompanyTxns: IntercompanyTransaction[] = [
  { id: "ic-1", sender: "EG-HQ", receiver: "EG-MFG", account: "Intercompany Sales", amount: 3200000, currency: "EGP", matched: true, matchedDate: "2026-05-02", period: "Apr 2026" },
  { id: "ic-2", sender: "EG-MFG", receiver: "SA-OPS", account: "Transfer Pricing", amount: 1800000, currency: "EGP", matched: true, matchedDate: "2026-05-03", period: "Apr 2026" },
  { id: "ic-3", sender: "EG-HQ", receiver: "AE-DIST", account: "Management Fee", amount: 450000, currency: "EGP", matched: false, matchedDate: null, period: "Apr 2026" },
  { id: "ic-4", sender: "EG-HQ", receiver: "JO-RD", account: "R&D Funding", amount: 650000, currency: "EGP", matched: false, matchedDate: null, period: "Apr 2026" },
  { id: "ic-5", sender: "SA-OPS", receiver: "EG-HQ", account: "Royalty Payment", amount: 280000, currency: "SAR", matched: true, matchedDate: "2026-05-01", period: "Apr 2026" },
  { id: "ic-6", sender: "AE-DIST", receiver: "EG-MFG", account: "Product Purchases", amount: 920000, currency: "AED", matched: true, matchedDate: "2026-05-04", period: "Apr 2026" },
];

const eliminations: EliminationEntry[] = [
  { id: "el-1", type: "Intercompany Sales", debitEntity: "EG-HQ", creditEntity: "EG-MFG", debitAccount: "Revenue", creditAccount: "COGS", amount: 3200000, status: "Posted", period: "Apr 2026" },
  { id: "el-2", type: "Intercompany Sales", debitEntity: "EG-MFG", creditEntity: "SA-OPS", debitAccount: "Revenue", creditAccount: "COGS", amount: 1800000, status: "Posted", period: "Apr 2026" },
  { id: "el-3", type: "Unrealized Profit", debitEntity: "EG-MFG", creditEntity: "SA-OPS", debitAccount: "Inventory Adj", creditAccount: "COGS Adj", amount: 360000, status: "Pending", period: "Apr 2026" },
  { id: "el-4", type: "Dividend", debitEntity: "EG-HQ", creditEntity: "SA-OPS", debitAccount: "Dividend Income", creditAccount: "Retained Earnings", amount: 500000, status: "Posted", period: "Apr 2026" },
  { id: "el-5", type: "Investment", debitEntity: "EG-HQ", creditEntity: "JO-RD", debitAccount: "Investment in Sub", creditAccount: "Equity", amount: 4200000, status: "Posted", period: "Apr 2026" },
];

const consolidatedReports: ConsolidatedReport[] = [
  { id: "cr-1", name: "Consolidated Balance Sheet", type: "Balance Sheet", period: "Apr 2026", generatedDate: "2026-05-05", status: "Final", entities: 5 },
  { id: "cr-2", name: "Consolidated P&L", type: "P&L", period: "Apr 2026", generatedDate: "2026-05-05", status: "Final", entities: 5 },
  { id: "cr-3", name: "Consolidated Cash Flow", type: "Cash Flow", period: "Apr 2026", generatedDate: "2026-05-06", status: "Draft", entities: 5 },
  { id: "cr-4", name: "Statement of Equity", type: "Equity", period: "Q1 2026", generatedDate: "2026-04-10", status: "Published", entities: 5 },
];

const fmt = (n: number) => `EGP ${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function ConsolidationPage() {
  const [filters, setFilters] = useState<FilterState>({});
  const [consolidationOpen, setConsolidationOpen] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);
  const [eliminationOpen, setEliminationOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const totalEntities = entities.length;
  const totalEliminations = eliminations.filter(e => e.status === "Posted").length;
  const consolidationStatus = entities.every(e => e.status === "Approved") ? "Complete" : "In Progress";
  const intercompanyBalance = intercompanyTxns.filter(t => !t.matched).reduce((s, t) => s + t.amount, 0);

  /* ─── Modal Fields ─── */
  const consolidationFields: EntityField[] = [
    { name: "period", label: "Consolidation Period", type: "select", required: true, options: [{ label: "May 2026", value: "2026-05" }, { label: "Apr 2026", value: "2026-04" }, { label: "Q1 2026", value: "2026-Q1" }] },
    { name: "entities", label: "Entities to Include", type: "select", required: true, options: [{ label: "All Entities", value: "all" }, { label: "Egypt Only", value: "egypt" }, { label: "MENA Region", value: "mena" }] },
    { name: "method", label: "Consolidation Method", type: "select", required: true, options: [{ label: "Full Consolidation", value: "full" }, { label: "Proportional", value: "proportional" }, { label: "Equity Method", value: "equity" }] },
    { name: "currency", label: "Reporting Currency", type: "select", required: true, options: [{ label: "EGP", value: "EGP" }, { label: "USD", value: "USD" }] },
  ];

  const eliminationFields: EntityField[] = [
    { name: "type", label: "Elimination Type", type: "select", required: true, options: [{ label: "Intercompany Sales", value: "Intercompany Sales" }, { label: "Intercompany Loan", value: "Intercompany Loan" }, { label: "Dividend", value: "Dividend" }, { label: "Investment", value: "Investment" }, { label: "Unrealized Profit", value: "Unrealized Profit" }] },
    { name: "debitEntity", label: "Debit Entity", type: "select", required: true, options: entities.map(e => ({ label: `${e.entityCode} - ${e.name}`, value: e.entityCode })) },
    { name: "creditEntity", label: "Credit Entity", type: "select", required: true, options: entities.map(e => ({ label: `${e.entityCode} - ${e.name}`, value: e.entityCode })) },
    { name: "amount", label: "Amount", type: "number", required: true },
    { name: "description", label: "Description", type: "text" },
  ];

  const reportFields: EntityField[] = [
    { name: "type", label: "Report Type", type: "select", required: true, options: [{ label: "Balance Sheet", value: "Balance Sheet" }, { label: "P&L", value: "P&L" }, { label: "Cash Flow", value: "Cash Flow" }, { label: "Equity", value: "Equity" }] },
    { name: "period", label: "Period", type: "select", required: true, options: [{ label: "May 2026", value: "May 2026" }, { label: "Apr 2026", value: "Apr 2026" }, { label: "Q1 2026", value: "Q1 2026" }] },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Consolidation"
        description="Multi-entity consolidation, intercompany elimination and consolidated reporting"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setReportOpen(true)}>
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Generate Report
            </Button>
            <Button variant="outline" onClick={() => setEliminationOpen(true)}>
              <FileCheck className="h-4 w-4 mr-2" /> Post Eliminations
            </Button>
            <Button variant="outline" onClick={() => setMatchOpen(true)}>
              <Link2 className="h-4 w-4 mr-2" /> Match Intercompany
            </Button>
            <Button onClick={() => setConsolidationOpen(true)}>
              <Play className="h-4 w-4 mr-2" /> Run Consolidation
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Building2} title="Entities" value={totalEntities.toString()} subtitle="Consolidation entities" iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={FileCheck} title="Elimination Entries" value={totalEliminations.toString()} subtitle="Posted eliminations" iconColor="bg-purple-100 text-purple-600" />
        <StatsCard icon={BarChart3} title="Consolidation Status" value={consolidationStatus} subtitle="Apr 2026 period" iconColor="bg-green-100 text-green-600" />
        <StatsCard icon={ArrowLeftRight} title="Intercompany Balance" value={fmt(intercompanyBalance)} subtitle="Unmatched transactions" iconColor="bg-amber-100 text-amber-600" />
      </div>

      <Tabs defaultValue="entities">
        <TabsList>
          <TabsTrigger value="entities">Entities</TabsTrigger>
          <TabsTrigger value="intercompany">Intercompany</TabsTrigger>
          <TabsTrigger value="eliminations">Eliminations</TabsTrigger>
          <TabsTrigger value="reports">Consolidated Reports</TabsTrigger>
        </TabsList>

        {/* ── Entities ── */}
        <TabsContent value="entities" className="space-y-3">
          <FilterBar
            searchPlaceholder="Search entities..."
            searchValue={filters._search || ""}
            onSearchChange={(v) => setFilters(f => ({ ...f, _search: v }))}
            fields={[
              { key: "status", label: "Status", type: "select", options: [{ label: "Draft", value: "Draft" }, { label: "Submitted", value: "Submitted" }, { label: "Approved", value: "Approved" }] },
            ]}
            values={filters}
            onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))}
          />
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "entityCode", label: "Entity Code", render: (v: string) => <span className="font-mono text-xs font-medium">{v}</span> },
                  { key: "name", label: "Name", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "currency", label: "Currency", render: (v: string) => <Badge variant="outline">{v}</Badge> },
                  { key: "ownership", label: "Ownership %", className: "text-right", render: (v: number) => <span>{v}%</span> },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge className={v === "Approved" ? "bg-green-100 text-green-700" : v === "Submitted" ? "bg-blue-100 text-blue-700" : v === "Draft" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>{v}</Badge>
                  ) },
                  { key: "lastCloseDate", label: "Last Close", render: (v: string) => <span className="text-xs">{v}</span> },
                  { key: "totalAssets", label: "Total Assets", className: "text-right", render: (v: number) => <span>{fmt(v)}</span> },
                ] as Column<Record<string, unknown>>[]}
                data={entities as unknown as Record<string, unknown>[]}
                emptyMessage="No entities found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Intercompany ── */}
        <TabsContent value="intercompany" className="space-y-3">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "sender", label: "Sender", render: (v: string) => <span className="font-mono text-xs font-medium">{v}</span> },
                  { key: "receiver", label: "Receiver", render: (v: string) => <span className="font-mono text-xs font-medium">{v}</span> },
                  { key: "account", label: "Account", render: (v: string) => <span>{v}</span> },
                  { key: "amount", label: "Amount", className: "text-right", render: (v: number, row: Record<string, unknown>) => <span className="font-semibold">{(row.currency as string)} {v.toLocaleString()}</span> },
                  { key: "matched", label: "Matched", render: (v: boolean) => (
                    <Badge className={v ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>{v ? "Yes" : "No"}</Badge>
                  ) },
                  { key: "period", label: "Period", render: (v: string) => <span className="text-xs">{v}</span> },
                ] as Column<Record<string, unknown>>[]}
                data={intercompanyTxns as unknown as Record<string, unknown>[]}
                emptyMessage="No intercompany transactions found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Eliminations ── */}
        <TabsContent value="eliminations" className="space-y-3">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "type", label: "Type", render: (v: string) => <Badge variant="outline">{v}</Badge> },
                  { key: "debitEntity", label: "Debit Entity", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "creditEntity", label: "Credit Entity", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "debitAccount", label: "Debit Account" },
                  { key: "creditAccount", label: "Credit Account" },
                  { key: "amount", label: "Amount", className: "text-right", render: (v: number) => <span className="font-semibold">{fmt(v)}</span> },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge className={v === "Posted" ? "bg-green-100 text-green-700" : v === "Pending" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}>{v}</Badge>
                  ) },
                  { key: "period", label: "Period", render: (v: string) => <span className="text-xs">{v}</span> },
                ] as Column<Record<string, unknown>>[]}
                data={eliminations as unknown as Record<string, unknown>[]}
                emptyMessage="No elimination entries found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Consolidated Reports ── */}
        <TabsContent value="reports" className="space-y-3">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "name", label: "Report Name", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "type", label: "Type", render: (v: string) => <Badge variant="outline">{v}</Badge> },
                  { key: "period", label: "Period" },
                  { key: "entities", label: "Entities", className: "text-center", render: (v: number) => <span>{v}</span> },
                  { key: "generatedDate", label: "Generated", render: (v: string) => <span className="text-xs">{v}</span> },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge className={v === "Published" ? "bg-green-100 text-green-700" : v === "Final" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}>{v}</Badge>
                  ) },
                ] as Column<Record<string, unknown>>[]}
                data={consolidatedReports as unknown as Record<string, unknown>[]}
                emptyMessage="No consolidated reports found."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Run Consolidation Modal ─── */}
      <EntityFormModal
        open={consolidationOpen}
        onOpenChange={setConsolidationOpen}
        title="Run Consolidation"
        fields={consolidationFields}
        onSubmit={() => setConsolidationOpen(false)}
      />

      {/* ─── Match Intercompany Modal ─── */}
      <EntityFormModal
        open={matchOpen}
        onOpenChange={setMatchOpen}
        title="Match Intercompany Transactions"
        fields={[
          { name: "period", label: "Period", type: "select", required: true, options: [{ label: "Apr 2026", value: "Apr 2026" }, { label: "May 2026", value: "May 2026" }] },
          { name: "threshold", label: "Match Threshold (EGP)", type: "number", required: true },
          { name: "autoMatch", label: "Auto-Match", type: "select", options: [{ label: "Yes", value: "yes" }, { label: "No - Manual Review", value: "no" }] },
        ]}
        onSubmit={() => setMatchOpen(false)}
      />

      {/* ─── Post Eliminations Modal ─── */}
      <EntityFormModal
        open={eliminationOpen}
        onOpenChange={setEliminationOpen}
        title="Post Elimination Entries"
        fields={eliminationFields}
        onSubmit={() => setEliminationOpen(false)}
      />

      {/* ─── Generate Report Modal ─── */}
      <EntityFormModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        title="Generate Consolidated Report"
        fields={reportFields}
        onSubmit={() => setReportOpen(false)}
      />
    </div>
  );
}
