"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppConfig } from "@/lib/config-context";
import { downloadCSV, downloadHTML, buildPrintableReport } from "@/lib/download";
import {
  Users,
  Building2,
  FileText,
  CreditCard,
  Wallet,
  BookOpen,
  Calendar,
  BarChart3,
  Download,
  Plus,
  Printer,
} from "lucide-react";

// ─── Demo data (Egyptian pharma) ─────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  type: "Pharmacy Chain" | "Hospital" | "Distributor" | "Government";
  city: string;
  creditLimit: number;
  outstanding: number;
  lastPayment: string;
  status: "Good" | "Watch" | "Hold";
}

interface Vendor {
  id: string;
  name: string;
  category: "API" | "Excipient" | "Packaging" | "Services" | "Equipment";
  country: string;
  paymentTerms: string;
  outstanding: number;
  rating: number;
}

interface InvoiceRec {
  id: string;
  number: string;
  date: string;
  customer: string;
  amount: number;
  vat: number;
  status: "Draft" | "Sent" | "Paid" | "Overdue" | "Partial";
  dueDate: string;
}

interface Cheque {
  id: string;
  number: string;
  bank: string;
  party: string;
  type: "Incoming" | "Outgoing";
  amount: number;
  issueDate: string;
  dueDate: string;
  status: "Pending" | "Deposited" | "Cleared" | "Bounced" | "Cancelled";
}

interface BankAccount {
  id: string;
  bank: string;
  accountNo: string;
  currency: "EGP" | "USD" | "EUR";
  balance: number;
  outstanding: number;
  lastReconciled: string;
}

interface LedgerEntry {
  id: string;
  date: string;
  account: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
}

interface Deferral {
  id: string;
  type: "Deferred Revenue" | "Accrued Revenue" | "Prepaid Expense" | "Accrued Expense";
  description: string;
  contract: string;
  totalAmount: number;
  recognized: number;
  remaining: number;
  startDate: string;
  endDate: string;
}

const customers: Customer[] = [
  { id: "c-1", name: "El-Ezaby Pharmacies", type: "Pharmacy Chain", city: "Cairo", creditLimit: 5_000_000, outstanding: 2_180_000, lastPayment: "2026-04-02", status: "Good" },
  { id: "c-2", name: "Seif Pharmacies", type: "Pharmacy Chain", city: "Giza", creditLimit: 3_000_000, outstanding: 1_450_000, lastPayment: "2026-03-28", status: "Good" },
  { id: "c-3", name: "Cleopatra Hospital Group", type: "Hospital", city: "Cairo", creditLimit: 2_500_000, outstanding: 2_780_000, lastPayment: "2026-02-15", status: "Watch" },
  { id: "c-4", name: "Dar Al Fouad Hospital", type: "Hospital", city: "6 October", creditLimit: 1_800_000, outstanding: 920_000, lastPayment: "2026-04-01", status: "Good" },
  { id: "c-5", name: "Ibnsina Pharma (Distributor)", type: "Distributor", city: "Cairo", creditLimit: 8_000_000, outstanding: 4_650_000, lastPayment: "2026-04-05", status: "Good" },
  { id: "c-6", name: "Pharma Overseas", type: "Distributor", city: "Alexandria", creditLimit: 6_000_000, outstanding: 3_200_000, lastPayment: "2026-03-30", status: "Good" },
  { id: "c-7", name: "Ministry of Health Egypt", type: "Government", city: "Cairo", creditLimit: 10_000_000, outstanding: 7_840_000, lastPayment: "2026-01-20", status: "Hold" },
  { id: "c-8", name: "Misr Pharmacies", type: "Pharmacy Chain", city: "Mansoura", creditLimit: 1_500_000, outstanding: 480_000, lastPayment: "2026-04-03", status: "Good" },
];

const vendors: Vendor[] = [
  { id: "v-1", name: "Sun Pharmaceutical (India)", category: "API", country: "India", paymentTerms: "Net 60", outstanding: 1_840_000, rating: 5 },
  { id: "v-2", name: "BASF Pharma Solutions", category: "Excipient", country: "Germany", paymentTerms: "Net 45", outstanding: 920_000, rating: 5 },
  { id: "v-3", name: "Schott Glass Egypt", category: "Packaging", country: "Egypt", paymentTerms: "Net 30", outstanding: 350_000, rating: 4 },
  { id: "v-4", name: "Bormioli Pharma", category: "Packaging", country: "Italy", paymentTerms: "Net 60", outstanding: 670_000, rating: 5 },
  { id: "v-5", name: "Lonza AG", category: "API", country: "Switzerland", paymentTerms: "Net 45", outstanding: 2_100_000, rating: 5 },
  { id: "v-6", name: "Egyptian Co. for Lab Reagents", category: "Services", country: "Egypt", paymentTerms: "Net 15", outstanding: 145_000, rating: 4 },
  { id: "v-7", name: "GEA Pharma Systems", category: "Equipment", country: "Germany", paymentTerms: "Net 90", outstanding: 4_500_000, rating: 5 },
];

const invoices: InvoiceRec[] = [
  { id: "i-1", number: "INV-2026-0312", date: "2026-04-01", customer: "El-Ezaby Pharmacies", amount: 850_000, vat: 119_000, status: "Sent", dueDate: "2026-05-01" },
  { id: "i-2", number: "INV-2026-0313", date: "2026-04-02", customer: "Ibnsina Pharma (Distributor)", amount: 1_240_000, vat: 173_600, status: "Sent", dueDate: "2026-05-02" },
  { id: "i-3", number: "INV-2026-0314", date: "2026-03-15", customer: "Cleopatra Hospital Group", amount: 580_000, vat: 81_200, status: "Overdue", dueDate: "2026-04-04" },
  { id: "i-4", number: "INV-2026-0315", date: "2026-04-04", customer: "Seif Pharmacies", amount: 420_000, vat: 58_800, status: "Paid", dueDate: "2026-05-04" },
  { id: "i-5", number: "INV-2026-0316", date: "2026-03-28", customer: "Pharma Overseas", amount: 1_780_000, vat: 249_200, status: "Partial", dueDate: "2026-04-27" },
  { id: "i-6", number: "INV-2026-0317", date: "2026-04-06", customer: "Dar Al Fouad Hospital", amount: 320_000, vat: 44_800, status: "Sent", dueDate: "2026-05-06" },
  { id: "i-7", number: "INV-2026-0318", date: "2026-02-10", customer: "Ministry of Health Egypt", amount: 3_200_000, vat: 448_000, status: "Overdue", dueDate: "2026-03-12" },
];

const cheques: Cheque[] = [
  { id: "ch-1", number: "CHQ-1009384", bank: "CIB", party: "El-Ezaby Pharmacies", type: "Incoming", amount: 850_000, issueDate: "2026-04-01", dueDate: "2026-05-01", status: "Pending" },
  { id: "ch-2", number: "CHQ-1009385", bank: "NBE", party: "Ibnsina Pharma", type: "Incoming", amount: 1_240_000, issueDate: "2026-04-02", dueDate: "2026-04-25", status: "Deposited" },
  { id: "ch-3", number: "CHQ-1009386", bank: "Banque Misr", party: "Seif Pharmacies", type: "Incoming", amount: 420_000, issueDate: "2026-03-30", dueDate: "2026-04-10", status: "Cleared" },
  { id: "ch-4", number: "CHQ-1009387", bank: "QNB", party: "Pharma Overseas", type: "Incoming", amount: 600_000, issueDate: "2026-03-22", dueDate: "2026-04-08", status: "Bounced" },
  { id: "ch-5", number: "CHQ-9001234", bank: "CIB", party: "Sun Pharmaceutical", type: "Outgoing", amount: 920_000, issueDate: "2026-04-01", dueDate: "2026-05-30", status: "Pending" },
  { id: "ch-6", number: "CHQ-9001235", bank: "HSBC", party: "BASF Pharma", type: "Outgoing", amount: 460_000, issueDate: "2026-03-15", dueDate: "2026-04-30", status: "Pending" },
  { id: "ch-7", number: "CHQ-9001236", bank: "NBE", party: "GEA Pharma Systems", type: "Outgoing", amount: 1_500_000, issueDate: "2026-02-10", dueDate: "2026-05-10", status: "Pending" },
];

const banks: BankAccount[] = [
  { id: "b-1", bank: "CIB - Commercial International Bank", accountNo: "100245678901", currency: "EGP", balance: 18_450_000, outstanding: 2_300_000, lastReconciled: "2026-04-08" },
  { id: "b-2", bank: "National Bank of Egypt", accountNo: "200912345678", currency: "EGP", balance: 9_870_000, outstanding: 1_240_000, lastReconciled: "2026-04-09" },
  { id: "b-3", bank: "Banque Misr", accountNo: "300456789123", currency: "EGP", balance: 5_320_000, outstanding: 850_000, lastReconciled: "2026-04-07" },
  { id: "b-4", bank: "QNB Al Ahli", accountNo: "400789123456", currency: "EGP", balance: 3_680_000, outstanding: 620_000, lastReconciled: "2026-04-06" },
  { id: "b-5", bank: "HSBC Egypt - USD", accountNo: "500321654987", currency: "USD", balance: 850_000, outstanding: 145_000, lastReconciled: "2026-04-05" },
  { id: "b-6", bank: "CIB - EUR Account", accountNo: "100245678902", currency: "EUR", balance: 320_000, outstanding: 45_000, lastReconciled: "2026-04-05" },
];

const ledgerEntries: LedgerEntry[] = [
  { id: "l-1", date: "2026-04-08", account: "1100 - Cash & Bank", description: "Cheque deposit - Seif Pharmacies", reference: "CHQ-1009386", debit: 420_000, credit: 0 },
  { id: "l-2", date: "2026-04-08", account: "1200 - Accounts Receivable", description: "Cheque deposit - Seif Pharmacies", reference: "CHQ-1009386", debit: 0, credit: 420_000 },
  { id: "l-3", date: "2026-04-07", account: "1200 - Accounts Receivable", description: "Invoice INV-2026-0312", reference: "INV-2026-0312", debit: 969_000, credit: 0 },
  { id: "l-4", date: "2026-04-07", account: "4100 - Sales Revenue", description: "Invoice INV-2026-0312", reference: "INV-2026-0312", debit: 0, credit: 850_000 },
  { id: "l-5", date: "2026-04-07", account: "2300 - VAT Output", description: "Invoice INV-2026-0312", reference: "INV-2026-0312", debit: 0, credit: 119_000 },
  { id: "l-6", date: "2026-04-05", account: "5100 - Cost of Goods Sold", description: "Production batch B-2026-441", reference: "PROD-441", debit: 320_000, credit: 0 },
  { id: "l-7", date: "2026-04-05", account: "1300 - Inventory - Finished", description: "Production batch B-2026-441", reference: "PROD-441", debit: 0, credit: 320_000 },
  { id: "l-8", date: "2026-04-04", account: "6200 - Marketing Expense", description: "Q2 conference sponsorship", reference: "JV-0921", debit: 180_000, credit: 0 },
  { id: "l-9", date: "2026-04-04", account: "1100 - Cash & Bank", description: "Q2 conference sponsorship", reference: "JV-0921", debit: 0, credit: 180_000 },
];

const deferrals: Deferral[] = [
  { id: "d-1", type: "Deferred Revenue", description: "Annual hospital supply contract", contract: "CON-2026-018", totalAmount: 4_800_000, recognized: 1_200_000, remaining: 3_600_000, startDate: "2026-01-01", endDate: "2026-12-31" },
  { id: "d-2", type: "Deferred Revenue", description: "Government quarterly tender", contract: "CON-2026-022", totalAmount: 12_000_000, recognized: 4_000_000, remaining: 8_000_000, startDate: "2026-01-01", endDate: "2026-12-31" },
  { id: "d-3", type: "Prepaid Expense", description: "Annual GMP audit fees - SGS", contract: "PREP-2026-003", totalAmount: 480_000, recognized: 120_000, remaining: 360_000, startDate: "2026-01-01", endDate: "2026-12-31" },
  { id: "d-4", type: "Prepaid Expense", description: "Software licenses - Veeva CRM", contract: "PREP-2026-007", totalAmount: 720_000, recognized: 180_000, remaining: 540_000, startDate: "2026-01-01", endDate: "2026-12-31" },
  { id: "d-5", type: "Accrued Expense", description: "Q1 distributor commissions", contract: "ACC-2026-Q1", totalAmount: 380_000, recognized: 380_000, remaining: 0, startDate: "2026-01-01", endDate: "2026-03-31" },
  { id: "d-6", type: "Accrued Revenue", description: "Performance bonus from MOH (pending)", contract: "ACC-REV-2026-Q1", totalAmount: 540_000, recognized: 540_000, remaining: 0, startDate: "2026-01-01", endDate: "2026-03-31" },
];

// ─── Page ────────────────────────────────────────────────────────────────────

type Tab =
  | "customers"
  | "vendors"
  | "invoices"
  | "cheques"
  | "banks"
  | "ledgers"
  | "deferrals"
  | "reports";

export default function AccountingPage() {
  const { config } = useAppConfig();
  const [tab, setTab] = useState<Tab>("customers");

  const fmt = (n: number): string =>
    `${config.finance.currency} ${n.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })}`;

  // Aggregates
  const totals = useMemo(() => {
    const customerOutstanding = customers.reduce((s, c) => s + c.outstanding, 0);
    const vendorOutstanding = vendors.reduce((s, v) => s + v.outstanding, 0);
    const totalBank = banks
      .filter((b) => b.currency === "EGP")
      .reduce((s, b) => s + b.balance, 0);
    const overdueAmount = invoices
      .filter((i) => i.status === "Overdue")
      .reduce((s, i) => s + i.amount + i.vat, 0);
    return { customerOutstanding, vendorOutstanding, totalBank, overdueAmount };
  }, []);

  const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
    { key: "customers", label: "Customers", icon: Users },
    { key: "vendors", label: "Vendors", icon: Building2 },
    { key: "invoices", label: "Invoices", icon: FileText },
    { key: "cheques", label: "Cheques", icon: CreditCard },
    { key: "banks", label: "Bank Balances", icon: Wallet },
    { key: "ledgers", label: "Ledgers", icon: BookOpen },
    { key: "deferrals", label: "Deferrals & Revenue", icon: Calendar },
    { key: "reports", label: "Reports", icon: BarChart3 },
  ];

  // Download handlers
  function exportCustomersCSV() {
    downloadCSV("accounting-customers.csv", customers);
  }
  function exportVendorsCSV() {
    downloadCSV("accounting-vendors.csv", vendors);
  }
  function exportInvoicesCSV() {
    downloadCSV("accounting-invoices.csv", invoices);
  }
  function exportChequesCSV() {
    downloadCSV("accounting-cheques.csv", cheques);
  }
  function exportLedgersCSV() {
    downloadCSV("accounting-ledger.csv", ledgerEntries);
  }
  function exportFullReport() {
    const html = buildPrintableReport({
      title: "Accounting Statement",
      subtitle: `Period: April 2026 · Currency: ${config.finance.currency}`,
      sections: [
        {
          heading: "Customer Outstanding (Accounts Receivable)",
          rows: customers.map((c) => ({
            Customer: c.name,
            Type: c.type,
            City: c.city,
            "Credit Limit": fmt(c.creditLimit),
            Outstanding: fmt(c.outstanding),
            Status: c.status,
          })),
        },
        {
          heading: "Vendor Outstanding (Accounts Payable)",
          rows: vendors.map((v) => ({
            Vendor: v.name,
            Category: v.category,
            Country: v.country,
            Terms: v.paymentTerms,
            Outstanding: fmt(v.outstanding),
          })),
        },
        {
          heading: "Bank Balances",
          rows: banks.map((b) => ({
            Bank: b.bank,
            Account: b.accountNo,
            Currency: b.currency,
            Balance: `${b.currency} ${b.balance.toLocaleString()}`,
            Outstanding: `${b.currency} ${b.outstanding.toLocaleString()}`,
            "Last Reconciled": b.lastReconciled,
          })),
        },
        {
          heading: "Deferrals & Revenue Recognition",
          rows: deferrals.map((d) => ({
            Type: d.type,
            Description: d.description,
            Contract: d.contract,
            Total: fmt(d.totalAmount),
            Recognized: fmt(d.recognized),
            Remaining: fmt(d.remaining),
          })),
        },
      ],
    });
    downloadHTML("accounting-statement-2026-04.html", html);
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Accounting"
        description="Customers, vendors, invoices, cheques, bank balances, ledgers, deferrals & financial reports"
        actions={
          <>
            <Button variant="outline" onClick={exportFullReport}>
              <Printer className="h-4 w-4 mr-2" /> Print Statement
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> New Entry
            </Button>
          </>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Customer Outstanding"
          value={fmt(totals.customerOutstanding)}
          subtitle={`${customers.length} active customers`}
          icon={<Users className="h-5 w-5" />}
          iconColor="bg-blue-100 text-blue-700"
          trend={{ value: -3.2, label: "vs last month" }}
        />
        <StatsCard
          title="Vendor Outstanding"
          value={fmt(totals.vendorOutstanding)}
          subtitle={`${vendors.length} active vendors`}
          icon={<Building2 className="h-5 w-5" />}
          iconColor="bg-amber-100 text-amber-700"
          trend={{ value: 1.8, label: "vs last month" }}
        />
        <StatsCard
          title="Bank Balance (EGP)"
          value={fmt(totals.totalBank)}
          subtitle={`Across ${banks.filter((b) => b.currency === "EGP").length} accounts`}
          icon={<Wallet className="h-5 w-5" />}
          iconColor="bg-emerald-100 text-emerald-700"
          trend={{ value: 4.5, label: "vs last month" }}
        />
        <StatsCard
          title="Overdue AR"
          value={fmt(totals.overdueAmount)}
          subtitle={`${invoices.filter((i) => i.status === "Overdue").length} overdue invoices`}
          icon={<FileText className="h-5 w-5" />}
          iconColor="bg-red-100 text-red-700"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-border overflow-x-auto">
        <nav className="flex gap-1 -mb-px min-w-max">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Customers */}
      {tab === "customers" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Customers</CardTitle>
            <Button variant="outline" size="sm" onClick={exportCustomersCSV}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-y">
                <tr>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Customer</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Type</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">City</th>
                  <th className="text-right p-3 font-semibold text-xs uppercase">Credit Limit</th>
                  <th className="text-right p-3 font-semibold text-xs uppercase">Outstanding</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Last Pmt</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3 text-muted-foreground">{c.type}</td>
                    <td className="p-3">{c.city}</td>
                    <td className="p-3 text-right">{fmt(c.creditLimit)}</td>
                    <td className="p-3 text-right font-medium">{fmt(c.outstanding)}</td>
                    <td className="p-3">{c.lastPayment}</td>
                    <td className="p-3">
                      <Badge
                        variant={
                          c.status === "Good"
                            ? "success"
                            : c.status === "Watch"
                            ? "warning"
                            : "destructive"
                        }
                      >
                        {c.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Vendors */}
      {tab === "vendors" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Vendors</CardTitle>
            <Button variant="outline" size="sm" onClick={exportVendorsCSV}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-y">
                <tr>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Vendor</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Category</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Country</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Terms</th>
                  <th className="text-right p-3 font-semibold text-xs uppercase">Outstanding</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Rating</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => (
                  <tr key={v.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-medium">{v.name}</td>
                    <td className="p-3"><Badge variant="secondary">{v.category}</Badge></td>
                    <td className="p-3">{v.country}</td>
                    <td className="p-3">{v.paymentTerms}</td>
                    <td className="p-3 text-right font-medium">{fmt(v.outstanding)}</td>
                    <td className="p-3 text-amber-600">{"★".repeat(v.rating)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Invoices */}
      {tab === "invoices" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Invoices</CardTitle>
            <Button variant="outline" size="sm" onClick={exportInvoicesCSV}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-y">
                <tr>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Invoice #</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Date</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Customer</th>
                  <th className="text-right p-3 font-semibold text-xs uppercase">Net</th>
                  <th className="text-right p-3 font-semibold text-xs uppercase">VAT 14%</th>
                  <th className="text-right p-3 font-semibold text-xs uppercase">Total</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Due</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-mono text-xs">{i.number}</td>
                    <td className="p-3">{i.date}</td>
                    <td className="p-3 font-medium">{i.customer}</td>
                    <td className="p-3 text-right">{fmt(i.amount)}</td>
                    <td className="p-3 text-right text-muted-foreground">{fmt(i.vat)}</td>
                    <td className="p-3 text-right font-semibold">{fmt(i.amount + i.vat)}</td>
                    <td className="p-3">{i.dueDate}</td>
                    <td className="p-3">
                      <Badge
                        variant={
                          i.status === "Paid"
                            ? "success"
                            : i.status === "Overdue"
                            ? "destructive"
                            : i.status === "Partial"
                            ? "warning"
                            : "secondary"
                        }
                      >
                        {i.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Cheques */}
      {tab === "cheques" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Cheque Register</CardTitle>
            <Button variant="outline" size="sm" onClick={exportChequesCSV}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-y">
                <tr>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Cheque #</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Bank</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Party</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Type</th>
                  <th className="text-right p-3 font-semibold text-xs uppercase">Amount</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Issue Date</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Due Date</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {cheques.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-mono text-xs">{c.number}</td>
                    <td className="p-3">{c.bank}</td>
                    <td className="p-3 font-medium">{c.party}</td>
                    <td className="p-3">
                      <Badge variant={c.type === "Incoming" ? "success" : "secondary"}>
                        {c.type}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-medium">{fmt(c.amount)}</td>
                    <td className="p-3">{c.issueDate}</td>
                    <td className="p-3">{c.dueDate}</td>
                    <td className="p-3">
                      <Badge
                        variant={
                          c.status === "Cleared"
                            ? "success"
                            : c.status === "Bounced"
                            ? "destructive"
                            : c.status === "Deposited"
                            ? "warning"
                            : "secondary"
                        }
                      >
                        {c.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Banks */}
      {tab === "banks" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {banks.map((b) => (
            <Card key={b.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">{b.bank}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {b.accountNo}
                    </p>
                  </div>
                  <Badge variant="outline">{b.currency}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available</span>
                  <span className="font-bold text-emerald-700">
                    {b.currency} {b.balance.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Outstanding</span>
                  <span className="font-medium text-amber-700">
                    {b.currency} {b.outstanding.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Net Position</span>
                  <span className="font-semibold">
                    {b.currency} {(b.balance - b.outstanding).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground border-t pt-2">
                  <span>Last reconciled</span>
                  <span>{b.lastReconciled}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Ledgers */}
      {tab === "ledgers" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">General Ledger</CardTitle>
            <Button variant="outline" size="sm" onClick={exportLedgersCSV}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-y">
                <tr>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Date</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Account</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Description</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Reference</th>
                  <th className="text-right p-3 font-semibold text-xs uppercase">Debit</th>
                  <th className="text-right p-3 font-semibold text-xs uppercase">Credit</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((l) => (
                  <tr key={l.id} className="border-b hover:bg-slate-50">
                    <td className="p-3">{l.date}</td>
                    <td className="p-3 font-mono text-xs">{l.account}</td>
                    <td className="p-3">{l.description}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{l.reference}</td>
                    <td className="p-3 text-right text-emerald-700">
                      {l.debit > 0 ? fmt(l.debit) : "—"}
                    </td>
                    <td className="p-3 text-right text-blue-700">
                      {l.credit > 0 ? fmt(l.credit) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-semibold">
                  <td colSpan={4} className="p-3 text-right">Totals</td>
                  <td className="p-3 text-right text-emerald-700">
                    {fmt(ledgerEntries.reduce((s, l) => s + l.debit, 0))}
                  </td>
                  <td className="p-3 text-right text-blue-700">
                    {fmt(ledgerEntries.reduce((s, l) => s + l.credit, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Deferrals */}
      {tab === "deferrals" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deferrals & Revenue Recognition</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-y">
                <tr>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Type</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Description</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Contract</th>
                  <th className="text-right p-3 font-semibold text-xs uppercase">Total</th>
                  <th className="text-right p-3 font-semibold text-xs uppercase">Recognized</th>
                  <th className="text-right p-3 font-semibold text-xs uppercase">Remaining</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Period</th>
                </tr>
              </thead>
              <tbody>
                {deferrals.map((d) => {
                  const pct = d.totalAmount > 0 ? Math.round((d.recognized / d.totalAmount) * 100) : 0;
                  return (
                    <tr key={d.id} className="border-b hover:bg-slate-50">
                      <td className="p-3">
                        <Badge
                          variant={
                            d.type.includes("Revenue") ? "success" : "secondary"
                          }
                        >
                          {d.type}
                        </Badge>
                      </td>
                      <td className="p-3 font-medium">{d.description}</td>
                      <td className="p-3 font-mono text-xs">{d.contract}</td>
                      <td className="p-3 text-right">{fmt(d.totalAmount)}</td>
                      <td className="p-3 text-right text-emerald-700">{fmt(d.recognized)}</td>
                      <td className="p-3 text-right text-amber-700">{fmt(d.remaining)}</td>
                      <td className="p-3">
                        <div className="text-xs text-muted-foreground">
                          {d.startDate} → {d.endDate}
                        </div>
                        <div className="h-1.5 mt-1 bg-slate-200 rounded-full overflow-hidden w-32">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Reports */}
      {tab === "reports" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: "Trial Balance", desc: "Period-end account balances with debit/credit verification.", action: () => downloadCSV("trial-balance.csv", ledgerEntries) },
            { title: "Profit & Loss", desc: "Revenue, COGS and operating expenses for the period.", action: exportFullReport },
            { title: "Balance Sheet", desc: "Assets, liabilities, equity snapshot at period-end.", action: exportFullReport },
            { title: "Cash Flow Statement", desc: "Operating, investing, financing cash flows.", action: exportFullReport },
            { title: "AR Aging Report", desc: "Customer outstanding bucketed 0-30/31-60/61-90/90+.", action: () => downloadCSV("ar-aging.csv", customers) },
            { title: "AP Aging Report", desc: "Vendor outstanding by aging bucket.", action: () => downloadCSV("ap-aging.csv", vendors) },
            { title: "Bank Reconciliation", desc: "Per-account reconciliation against statements.", action: () => downloadCSV("bank-recon.csv", banks) },
            { title: "VAT Return", desc: "Input/output VAT for ETA submission.", action: exportFullReport },
            { title: "Cheque Status Report", desc: "All in-flight cheques with clearing status.", action: () => downloadCSV("cheque-status.csv", cheques) },
          ].map((r) => (
            <Card key={r.title}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-sm">{r.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
                <Button size="sm" className="w-full" onClick={r.action}>
                  <Download className="h-4 w-4 mr-1" /> Download
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
