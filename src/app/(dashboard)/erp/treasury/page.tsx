"use client";

import { useState, useMemo } from "react";
import {
  Landmark,
  TrendingUp,
  Globe,
  PiggyBank,
  Plus,
  ArrowLeftRight,
  BarChart3,
  RefreshCw,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/* ─── Types ─── */
interface CashPosition {
  id: string;
  account: string;
  bank: string;
  currency: string;
  balance: number;
  available: number;
  lastUpdated: string;
}

interface BankAccount {
  id: string;
  bank: string;
  accountNumber: string;
  type: "Operating" | "Investment" | "Reserve" | "Payroll";
  currency: string;
  balance: number;
  status: "Active" | "Dormant" | "Closed";
}

interface FXExposure {
  id: string;
  currency: string;
  exposure: number;
  hedged: number;
  unhedged: number;
  hedgeType: "Forward" | "Option" | "Swap" | "None";
  maturityDate: string;
}

interface Investment {
  id: string;
  instrument: string;
  type: "Treasury Bill" | "Bond" | "Deposit" | "Money Market";
  principal: number;
  rate: number;
  maturityDate: string;
  status: "Active" | "Matured" | "Redeemed";
}

interface CashForecast {
  id: string;
  period: string;
  openingBalance: number;
  inflows: number;
  outflows: number;
  netCash: number;
  closingBalance: number;
}

/* ─── Mock Data ─── */
const cashPositions: CashPosition[] = [
  { id: "cp-1", account: "Main Operating", bank: "National Bank of Egypt", currency: "EGP", balance: 15200000, available: 14800000, lastUpdated: "2026-05-10" },
  { id: "cp-2", account: "USD Account", bank: "CIB Egypt", currency: "USD", balance: 850000, available: 850000, lastUpdated: "2026-05-10" },
  { id: "cp-3", account: "EUR Account", bank: "HSBC Egypt", currency: "EUR", balance: 320000, available: 310000, lastUpdated: "2026-05-09" },
  { id: "cp-4", account: "Payroll Account", bank: "Banque Misr", currency: "EGP", balance: 3400000, available: 3400000, lastUpdated: "2026-05-10" },
  { id: "cp-5", account: "Reserve Fund", bank: "National Bank of Egypt", currency: "EGP", balance: 8000000, available: 5000000, lastUpdated: "2026-05-08" },
];

const bankAccounts: BankAccount[] = [
  { id: "ba-1", bank: "National Bank of Egypt", accountNumber: "1234-5678-9012", type: "Operating", currency: "EGP", balance: 15200000, status: "Active" },
  { id: "ba-2", bank: "CIB Egypt", accountNumber: "9876-5432-1098", type: "Operating", currency: "USD", balance: 850000, status: "Active" },
  { id: "ba-3", bank: "HSBC Egypt", accountNumber: "5555-1111-2222", type: "Operating", currency: "EUR", balance: 320000, status: "Active" },
  { id: "ba-4", bank: "Banque Misr", accountNumber: "3333-4444-5555", type: "Payroll", currency: "EGP", balance: 3400000, status: "Active" },
  { id: "ba-5", bank: "National Bank of Egypt", accountNumber: "7777-8888-9999", type: "Reserve", currency: "EGP", balance: 8000000, status: "Active" },
  { id: "ba-6", bank: "Alex Bank", accountNumber: "2222-3333-4444", type: "Investment", currency: "EGP", balance: 0, status: "Dormant" },
];

const fxExposures: FXExposure[] = [
  { id: "fx-1", currency: "USD", exposure: 2500000, hedged: 1800000, unhedged: 700000, hedgeType: "Forward", maturityDate: "2026-06-30" },
  { id: "fx-2", currency: "EUR", exposure: 1200000, hedged: 900000, unhedged: 300000, hedgeType: "Option", maturityDate: "2026-07-15" },
  { id: "fx-3", currency: "GBP", exposure: 450000, hedged: 0, unhedged: 450000, hedgeType: "None", maturityDate: "—" },
  { id: "fx-4", currency: "SAR", exposure: 800000, hedged: 800000, unhedged: 0, hedgeType: "Swap", maturityDate: "2026-08-01" },
];

const investments: Investment[] = [
  { id: "inv-1", instrument: "T-Bill 91D Mar26", type: "Treasury Bill", principal: 5000000, rate: 22.5, maturityDate: "2026-06-15", status: "Active" },
  { id: "inv-2", instrument: "Gov Bond 2028", type: "Bond", principal: 3000000, rate: 18.75, maturityDate: "2028-01-01", status: "Active" },
  { id: "inv-3", instrument: "Fixed Deposit CIB", type: "Deposit", principal: 2000000, rate: 20.0, maturityDate: "2026-11-30", status: "Active" },
  { id: "inv-4", instrument: "T-Bill 182D Jan26", type: "Treasury Bill", principal: 4000000, rate: 21.0, maturityDate: "2026-07-20", status: "Active" },
  { id: "inv-5", instrument: "MM Fund NBE", type: "Money Market", principal: 1500000, rate: 19.5, maturityDate: "2026-05-30", status: "Matured" },
];

const cashForecasts: CashForecast[] = [
  { id: "cf-1", period: "May 2026 (Current)", openingBalance: 26970000, inflows: 8500000, outflows: 7200000, netCash: 1300000, closingBalance: 28270000 },
  { id: "cf-2", period: "Jun 2026 (30-day)", openingBalance: 28270000, inflows: 9100000, outflows: 8400000, netCash: 700000, closingBalance: 28970000 },
  { id: "cf-3", period: "Jul 2026 (60-day)", openingBalance: 28970000, inflows: 7800000, outflows: 8900000, netCash: -1100000, closingBalance: 27870000 },
  { id: "cf-4", period: "Aug 2026 (90-day)", openingBalance: 27870000, inflows: 8200000, outflows: 7600000, netCash: 600000, closingBalance: 28470000 },
];

const fmt = (n: number, currency = "EGP") => `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function TreasuryPage() {
  const [filters, setFilters] = useState<FilterState>({});
  const [transferOpen, setTransferOpen] = useState(false);
  const [investmentOpen, setInvestmentOpen] = useState(false);
  const [hedgeOpen, setHedgeOpen] = useState(false);

  const totalCash = cashPositions.reduce((s, p) => s + (p.currency === "EGP" ? p.balance : p.balance * 49.5), 0);
  const liquidityRatio = 1.85;
  const totalFXExposure = fxExposures.reduce((s, e) => s + e.unhedged, 0);
  const totalInvestments = investments.filter(i => i.status === "Active").reduce((s, i) => s + i.principal, 0);

  /* ─── Transfer fields ─── */
  const transferFields: EntityField[] = [
    { name: "fromAccount", label: "From Account", type: "select", required: true, options: bankAccounts.filter(a => a.status === "Active").map(a => ({ label: `${a.bank} - ${a.accountNumber}`, value: a.id })) },
    { name: "toAccount", label: "To Account", type: "select", required: true, options: bankAccounts.filter(a => a.status === "Active").map(a => ({ label: `${a.bank} - ${a.accountNumber}`, value: a.id })) },
    { name: "amount", label: "Amount", type: "number", required: true },
    { name: "currency", label: "Currency", type: "select", required: true, options: [{ label: "EGP", value: "EGP" }, { label: "USD", value: "USD" }, { label: "EUR", value: "EUR" }] },
    { name: "valueDate", label: "Value Date", type: "date", required: true },
    { name: "reference", label: "Reference", type: "text" },
  ];

  const investmentFields: EntityField[] = [
    { name: "instrument", label: "Instrument Name", type: "text", required: true },
    { name: "type", label: "Type", type: "select", required: true, options: [{ label: "Treasury Bill", value: "Treasury Bill" }, { label: "Bond", value: "Bond" }, { label: "Deposit", value: "Deposit" }, { label: "Money Market", value: "Money Market" }] },
    { name: "principal", label: "Principal Amount", type: "number", required: true },
    { name: "rate", label: "Rate (%)", type: "number", required: true },
    { name: "maturityDate", label: "Maturity Date", type: "date", required: true },
  ];

  const hedgeFields: EntityField[] = [
    { name: "currency", label: "Currency", type: "select", required: true, options: [{ label: "USD", value: "USD" }, { label: "EUR", value: "EUR" }, { label: "GBP", value: "GBP" }, { label: "SAR", value: "SAR" }] },
    { name: "amount", label: "Hedge Amount", type: "number", required: true },
    { name: "hedgeType", label: "Hedge Type", type: "select", required: true, options: [{ label: "Forward", value: "Forward" }, { label: "Option", value: "Option" }, { label: "Swap", value: "Swap" }] },
    { name: "rate", label: "Hedge Rate", type: "number", required: true },
    { name: "maturityDate", label: "Maturity Date", type: "date", required: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Treasury Management"
        description="Cash positions, FX exposure, investments and liquidity forecasting"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setHedgeOpen(true)}>
              <Globe className="h-4 w-4 mr-2" /> FX Hedge
            </Button>
            <Button variant="outline" onClick={() => setInvestmentOpen(true)}>
              <PiggyBank className="h-4 w-4 mr-2" /> Record Investment
            </Button>
            <Button onClick={() => setTransferOpen(true)}>
              <ArrowLeftRight className="h-4 w-4 mr-2" /> Transfer
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Landmark} title="Total Cash Position" value={fmt(totalCash)} subtitle="All accounts (EGP equiv.)" iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={TrendingUp} title="Liquidity Ratio" value={liquidityRatio.toFixed(2)} subtitle="Current assets / liabilities" iconColor="bg-green-100 text-green-600" />
        <StatsCard icon={Globe} title="FX Exposure (Unhedged)" value={`USD ${totalFXExposure.toLocaleString()}`} subtitle={`${fxExposures.length} currencies`} iconColor="bg-amber-100 text-amber-600" />
        <StatsCard icon={PiggyBank} title="Investments Value" value={fmt(totalInvestments)} subtitle={`${investments.filter(i => i.status === "Active").length} active instruments`} iconColor="bg-purple-100 text-purple-600" />
      </div>

      <Tabs defaultValue="cash-position">
        <TabsList>
          <TabsTrigger value="cash-position">Cash Position</TabsTrigger>
          <TabsTrigger value="bank-accounts">Bank Accounts</TabsTrigger>
          <TabsTrigger value="fx-management">FX Management</TabsTrigger>
          <TabsTrigger value="investments">Investments</TabsTrigger>
          <TabsTrigger value="cash-forecast">Cash Forecast</TabsTrigger>
        </TabsList>

        {/* ── Cash Position ── */}
        <TabsContent value="cash-position" className="space-y-3">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "account", label: "Account", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "bank", label: "Bank" },
                  { key: "currency", label: "Currency", render: (v: string) => <Badge variant="outline">{v}</Badge> },
                  { key: "balance", label: "Balance", className: "text-right", render: (v: number, row: Record<string, unknown>) => <span className="font-semibold">{fmt(v, row.currency as string)}</span> },
                  { key: "available", label: "Available", className: "text-right", render: (v: number, row: Record<string, unknown>) => <span>{fmt(v, row.currency as string)}</span> },
                  { key: "lastUpdated", label: "Last Updated", render: (v: string) => <span className="text-xs text-muted-foreground">{v}</span> },
                ] as Column<Record<string, unknown>>[]}
                data={cashPositions as unknown as Record<string, unknown>[]}
                emptyMessage="No cash positions found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Bank Accounts ── */}
        <TabsContent value="bank-accounts" className="space-y-3">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "bank", label: "Bank", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "accountNumber", label: "Account Number", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "type", label: "Type", render: (v: string) => <Badge variant="outline">{v}</Badge> },
                  { key: "currency", label: "Currency" },
                  { key: "balance", label: "Balance", className: "text-right", render: (v: number, row: Record<string, unknown>) => <span className="font-semibold">{fmt(v, row.currency as string)}</span> },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge className={v === "Active" ? "bg-green-100 text-green-700" : v === "Dormant" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}>{v}</Badge>
                  ) },
                ] as Column<Record<string, unknown>>[]}
                data={bankAccounts as unknown as Record<string, unknown>[]}
                emptyMessage="No bank accounts found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── FX Management ── */}
        <TabsContent value="fx-management" className="space-y-3">
          <FilterBar
            searchPlaceholder="Search by currency..."
            searchValue={filters._search || ""}
            onSearchChange={(v) => setFilters(f => ({ ...f, _search: v }))}
            fields={[
              { key: "hedgeType", label: "Hedge Type", type: "select", options: [{ label: "Forward", value: "Forward" }, { label: "Option", value: "Option" }, { label: "Swap", value: "Swap" }, { label: "None", value: "None" }] },
            ]}
            values={filters}
            onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))}
          />
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "currency", label: "Currency", render: (v: string) => <Badge variant="outline" className="font-semibold">{v}</Badge> },
                  { key: "exposure", label: "Total Exposure", className: "text-right", render: (v: number) => <span className="font-semibold">{v.toLocaleString()}</span> },
                  { key: "hedged", label: "Hedged", className: "text-right", render: (v: number) => <span className="text-green-600">{v.toLocaleString()}</span> },
                  { key: "unhedged", label: "Unhedged", className: "text-right", render: (v: number) => <span className={v > 0 ? "text-red-600 font-semibold" : ""}>{v.toLocaleString()}</span> },
                  { key: "hedgeType", label: "Hedge Type", render: (v: string) => (
                    <Badge className={v === "Forward" ? "bg-blue-100 text-blue-700" : v === "Option" ? "bg-purple-100 text-purple-700" : v === "Swap" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>{v}</Badge>
                  ) },
                  { key: "maturityDate", label: "Maturity", render: (v: string) => <span className="text-xs">{v}</span> },
                ] as Column<Record<string, unknown>>[]}
                data={fxExposures as unknown as Record<string, unknown>[]}
                emptyMessage="No FX exposures found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Investments ── */}
        <TabsContent value="investments" className="space-y-3">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "instrument", label: "Instrument", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "type", label: "Type", render: (v: string) => <Badge variant="outline">{v}</Badge> },
                  { key: "principal", label: "Principal", className: "text-right", render: (v: number) => <span className="font-semibold">{fmt(v)}</span> },
                  { key: "rate", label: "Rate %", className: "text-right", render: (v: number) => <span>{v.toFixed(2)}%</span> },
                  { key: "maturityDate", label: "Maturity Date", render: (v: string) => <span className="text-xs">{v}</span> },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge className={v === "Active" ? "bg-green-100 text-green-700" : v === "Matured" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}>{v}</Badge>
                  ) },
                ] as Column<Record<string, unknown>>[]}
                data={investments as unknown as Record<string, unknown>[]}
                emptyMessage="No investments found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Cash Forecast ── */}
        <TabsContent value="cash-forecast" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> 30/60/90 Day Cash Forecast
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "period", label: "Period", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "openingBalance", label: "Opening Balance", className: "text-right", render: (v: number) => <span>{fmt(v)}</span> },
                  { key: "inflows", label: "Inflows", className: "text-right", render: (v: number) => <span className="text-green-600">+{fmt(v)}</span> },
                  { key: "outflows", label: "Outflows", className: "text-right", render: (v: number) => <span className="text-red-600">-{fmt(v)}</span> },
                  { key: "netCash", label: "Net Cash", className: "text-right", render: (v: number) => <span className={v >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>{v >= 0 ? "+" : ""}{fmt(v)}</span> },
                  { key: "closingBalance", label: "Closing Balance", className: "text-right", render: (v: number) => <span className="font-bold">{fmt(v)}</span> },
                ] as Column<Record<string, unknown>>[]}
                data={cashForecasts as unknown as Record<string, unknown>[]}
                emptyMessage="No forecast data."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Transfer Modal ─── */}
      <EntityFormModal
        open={transferOpen}
        onOpenChange={setTransferOpen}
        title="Transfer Between Accounts"
        fields={transferFields}
        onSubmit={() => setTransferOpen(false)}
      />

      {/* ─── Investment Modal ─── */}
      <EntityFormModal
        open={investmentOpen}
        onOpenChange={setInvestmentOpen}
        title="Record Investment"
        fields={investmentFields}
        onSubmit={() => setInvestmentOpen(false)}
      />

      {/* ─── FX Hedge Modal ─── */}
      <EntityFormModal
        open={hedgeOpen}
        onOpenChange={setHedgeOpen}
        title="Create FX Hedge"
        fields={hedgeFields}
        onSubmit={() => setHedgeOpen(false)}
      />
    </div>
  );
}
