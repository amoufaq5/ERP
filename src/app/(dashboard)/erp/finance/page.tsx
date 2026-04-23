"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import StatusBadge from "@/components/shared/status-badge";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { EntityFormModal, type EntityField, type EntityFormData } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Column } from "@/components/shared/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDataStore, type Invoice, type Payment, type Budget, type GLAccount } from "@/lib/data-store";
import {
  DollarSign, TrendingUp, TrendingDown, FileText,
  Plus, CreditCard, BookOpen, Landmark, Download,
  BarChart3, Calculator, Activity, Target,
} from "lucide-react";
import { downloadCSV } from "@/lib/download";

const egp = (n: number) => `EGP ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Tab = "overview" | "invoices" | "payments" | "bank" | "vendors" | "budgets" | "trial" | "ratios" | "cashflow";

export default function FinancePage() {
  const store = useDataStore();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [filters, setFilters] = useState<FilterState>({ _search: "", status: "", type: "", method: "" });

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const customerName = (id: string) => store.customers.find((c) => c.id === id)?.name ?? id;
  const vendorName = (id: string) => store.vendors.find((v) => v.id === id)?.name ?? id;

  // ─── Computed metrics ──────────────────────────────────────────
  const totalRevenue = store.invoices
    .filter((i) => i.status === "PAID" || i.status === "PARTIAL")
    .reduce((s, i) => s + i.total, 0);
  const totalAR = store.customers.reduce((s, c) => s + c.outstanding, 0);
  const totalAP = store.vendors.reduce((s, v) => s + v.outstanding, 0);
  const totalBankBalance = store.bankAccounts.reduce((s, b) => s + b.balance, 0);
  const netPosition = totalBankBalance + totalAR - totalAP;

  // GL-based computations for ratios
  const glByType = (type: GLAccount["type"]) => store.glAccounts.filter((a) => a.isActive && a.type === type);
  const glSum = (type: GLAccount["type"]) => glByType(type).reduce((s, a) => s + a.balance, 0);
  const glSumSub = (type: GLAccount["type"], sub: string) => store.glAccounts.filter((a) => a.isActive && a.type === type && a.subType.includes(sub)).reduce((s, a) => s + a.balance, 0);
  const glTotalAssets = glSum("ASSET");
  const glTotalLiabilities = Math.abs(glSum("LIABILITY"));
  const glTotalEquity = glSum("EQUITY");
  const glTotalRevenue = glSum("REVENUE");
  const glTotalExpenses = glSum("EXPENSE");
  const glCurrentAssets = glSumSub("ASSET", "Current");
  const glCurrentLiabilities = Math.abs(glSumSub("LIABILITY", "Current"));
  const glInventory = store.glAccounts.filter((a) => a.isActive && a.name.includes("Inventory")).reduce((s, a) => s + a.balance, 0);
  const glCOGS = store.glAccounts.filter((a) => a.isActive && a.subType === "COGS").reduce((s, a) => s + a.balance, 0);
  const glInterestExpense = store.glAccounts.filter((a) => a.isActive && a.name.includes("Interest")).reduce((s, a) => s + a.balance, 0);
  const netIncome = glTotalRevenue - glTotalExpenses;
  const operatingIncome = glTotalRevenue - glCOGS - store.glAccounts.filter((a) => a.isActive && a.subType === "Operating Expense").reduce((s, a) => s + a.balance, 0);

  // Cash flow from payments
  const totalInflows = store.payments.filter((p) => p.type === "RECEIVED").reduce((s, p) => s + p.amount, 0);
  const totalOutflows = store.payments.filter((p) => p.type === "SENT").reduce((s, p) => s + p.amount, 0);

  const glName = (id: string) => store.glAccounts.find((a) => a.id === id)?.name ?? id;
  const ccName = (id: string) => store.costCenters.find((c) => c.id === id)?.name ?? id;

  // ─── Filters ───────────────────────────────────────────────────
  const filteredInvoices = useMemo(() => {
    return store.invoices.filter((i) => {
      const q = (filters._search || "").toLowerCase();
      const cName = customerName(i.customerId).toLowerCase();
      const matchesSearch = !q || i.number.toLowerCase().includes(q) || cName.includes(q);
      const matchesStatus = !filters.status || i.status === filters.status;
      return matchesSearch && matchesStatus;
    });
  }, [store.invoices, store.customers, filters]);

  const filteredPayments = useMemo(() => {
    return store.payments.filter((p) => {
      const q = (filters._search || "").toLowerCase();
      const party = p.customerId ? customerName(p.customerId) : p.vendorId ? vendorName(p.vendorId) : "";
      const matchesSearch = !q || p.reference.toLowerCase().includes(q) || party.toLowerCase().includes(q);
      const matchesType = !filters.type || p.type === filters.type;
      const matchesMethod = !filters.method || p.method === filters.method;
      return matchesSearch && matchesType && matchesMethod;
    });
  }, [store.payments, store.customers, store.vendors, filters]);

  // ─── Invoice CRUD ──────────────────────────────────────────────
  const invoiceFields: EntityField[] = [
    { name: "customerId", label: "Customer", type: "select", required: true, options: store.customers.map((c) => ({ label: `${c.name} (${c.code})`, value: c.id })) },
    { name: "date", label: "Invoice Date", type: "text", required: true, placeholder: "YYYY-MM-DD", defaultValue: new Date().toISOString().slice(0, 10) },
    { name: "dueDate", label: "Due Date", type: "text", required: true, placeholder: "YYYY-MM-DD" },
    { name: "subtotal", label: "Subtotal (EGP)", type: "number", required: true },
    { name: "tax", label: "Tax (EGP)", type: "number", defaultValue: 0 },
    { name: "status", label: "Status", type: "select", defaultValue: "DRAFT", options: [
      { label: "Draft", value: "DRAFT" }, { label: "Sent", value: "SENT" },
      { label: "Partial", value: "PARTIAL" }, { label: "Paid", value: "PAID" },
      { label: "Overdue", value: "OVERDUE" },
    ]},
  ];

  function handleInvoiceSubmit(data: EntityFormData) {
    const subtotal = Number(data.subtotal) || 0;
    const tax = Number(data.tax) || 0;
    if (editingInvoice) {
      store.update("invoices", editingInvoice.id, {
        customerId: String(data.customerId),
        date: String(data.date),
        dueDate: String(data.dueDate),
        subtotal, tax, total: subtotal + tax,
        status: String(data.status) as Invoice["status"],
      });
    } else {
      store.add("invoices", {
        id: store.genId("inv"),
        number: store.generateInvoiceNumber(),
        customerId: String(data.customerId),
        date: String(data.date),
        dueDate: String(data.dueDate),
        subtotal, tax, total: subtotal + tax,
        currency: "EGP",
        status: (String(data.status) || "DRAFT") as Invoice["status"],
        items: [],
      });
    }
    setShowInvoiceModal(false);
    setEditingInvoice(null);
  }

  // ─── Payment CRUD ──────────────────────────────────────────────
  const paymentFields: EntityField[] = [
    { name: "type", label: "Type", type: "select", required: true, defaultValue: "RECEIVED", options: [
      { label: "Received (from customer)", value: "RECEIVED" },
      { label: "Sent (to vendor)", value: "SENT" },
    ]},
    { name: "customerId", label: "Customer", type: "select", options: [{ label: "— None —", value: "" }, ...store.customers.map((c) => ({ label: c.name, value: c.id }))] },
    { name: "vendorId", label: "Vendor", type: "select", options: [{ label: "— None —", value: "" }, ...store.vendors.map((v) => ({ label: v.name, value: v.id }))] },
    { name: "invoiceId", label: "Against Invoice", type: "select", options: [{ label: "— None —", value: "" }, ...store.invoices.map((i) => ({ label: `${i.number} — ${egp(i.total)}`, value: i.id }))] },
    { name: "amount", label: "Amount (EGP)", type: "number", required: true },
    { name: "method", label: "Method", type: "select", defaultValue: "BANK_TRANSFER", options: [
      { label: "Bank Transfer", value: "BANK_TRANSFER" },
      { label: "Cheque", value: "CHEQUE" },
      { label: "Cash", value: "CASH" },
      { label: "Credit Card", value: "CREDIT_CARD" },
    ]},
    { name: "bankAccountId", label: "Bank Account", type: "select", options: [{ label: "— None —", value: "" }, ...store.bankAccounts.map((b) => ({ label: `${b.name} (${b.bankName})`, value: b.id }))] },
    { name: "date", label: "Date", type: "text", required: true, placeholder: "YYYY-MM-DD", defaultValue: new Date().toISOString().slice(0, 10) },
    { name: "notes", label: "Notes", type: "text" },
  ];

  function handlePaymentSubmit(data: EntityFormData) {
    const amount = Number(data.amount) || 0;
    const payload: Omit<Payment, "id"> = {
      reference: `PAY-${new Date().getFullYear()}-${String(store.payments.length + 1).padStart(4, "0")}`,
      type: String(data.type) as Payment["type"],
      customerId: data.customerId ? String(data.customerId) : undefined,
      vendorId: data.vendorId ? String(data.vendorId) : undefined,
      invoiceId: data.invoiceId ? String(data.invoiceId) : undefined,
      amount,
      currency: "EGP",
      method: String(data.method) as Payment["method"],
      bankAccountId: data.bankAccountId ? String(data.bankAccountId) : undefined,
      date: String(data.date),
      notes: data.notes ? String(data.notes) : undefined,
    };
    if (editingPayment) {
      store.update("payments", editingPayment.id, payload);
    } else {
      store.add("payments", { id: store.genId("pay"), ...payload });
    }
    setShowPaymentModal(false);
    setEditingPayment(null);
  }

  // ─── Columns ───────────────────────────────────────────────────
  const invoiceFlow: Record<string, string> = { DRAFT: "SENT", SENT: "PAID", PARTIAL: "PAID", OVERDUE: "PAID" };

  const invoiceColumns: Column<Record<string, unknown>>[] = [
    { key: "number", label: "Invoice #", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
    { key: "customerId", label: "Customer", render: (v) => customerName(v as string) },
    { key: "date", label: "Date", render: (v) => (v as string).slice(0, 10) },
    { key: "dueDate", label: "Due Date", render: (v) => (v as string).slice(0, 10) },
    { key: "total", label: "Total", render: (v) => <span className="font-semibold">{egp(v as number)}</span>, className: "text-right" },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
    { key: "id", label: "", render: (_v, row) => {
      const inv = store.invoices.find((x) => x.id === row.id);
      if (!inv) return null;
      const next = invoiceFlow[inv.status];
      return (
        <EditDeleteMenu
          onEdit={() => { setEditingInvoice(inv); setShowInvoiceModal(true); }}
          onDelete={() => store.remove("invoices", inv.id)}
          itemLabel={inv.number}
          extraItems={next ? [{ label: `Mark ${next}`, onClick: () => store.update("invoices", inv.id, { status: next as Invoice["status"] }) }] : []}
        />
      );
    }},
  ];

  const methodLabels: Record<string, string> = { BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque", CASH: "Cash", CREDIT_CARD: "Credit Card" };

  const paymentColumns: Column<Record<string, unknown>>[] = [
    { key: "reference", label: "Reference", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
    { key: "type", label: "Type", render: (v) => (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(v as string) === "RECEIVED" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
        {(v as string) === "RECEIVED" ? "Received" : "Sent"}
      </span>
    )},
    { key: "customerId", label: "Party", render: (_v, row) => {
      const p = row as unknown as Payment;
      return p.customerId ? customerName(p.customerId) : p.vendorId ? vendorName(p.vendorId) : "—";
    }},
    { key: "date", label: "Date" },
    { key: "method", label: "Method", render: (v) => <Badge variant="outline">{methodLabels[v as string] ?? (v as string)}</Badge> },
    { key: "amount", label: "Amount", render: (v) => <span className="font-semibold">{egp(v as number)}</span>, className: "text-right" },
    { key: "id", label: "", render: (_v, row) => {
      const p = store.payments.find((x) => x.id === row.id);
      if (!p) return null;
      return (
        <EditDeleteMenu
          onEdit={() => { setEditingPayment(p); setShowPaymentModal(true); }}
          onDelete={() => store.remove("payments", p.id)}
          itemLabel={p.reference}
        />
      );
    }},
  ];

  const bankColumns: Column<Record<string, unknown>>[] = [
    { key: "code", label: "Code", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
    { key: "name", label: "Account Name", render: (v) => <span className="font-medium">{v as string}</span> },
    { key: "bankName", label: "Bank" },
    { key: "accountNumber", label: "Account #", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
    { key: "currency", label: "Currency" },
    { key: "balance", label: "Balance", render: (v) => <span className="font-semibold text-green-700">{egp(v as number)}</span>, className: "text-right" },
    { key: "type", label: "Type", render: (v) => <Badge variant="outline">{v as string}</Badge> },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
  ];

  const vendorColumns: Column<Record<string, unknown>>[] = [
    { key: "code", label: "Code", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
    { key: "name", label: "Vendor", render: (v) => <span className="font-medium">{v as string}</span> },
    { key: "category", label: "Category" },
    { key: "outstanding", label: "Outstanding (AP)", render: (v) => <span className="font-semibold text-red-600">{egp(v as number)}</span>, className: "text-right" },
    { key: "paymentTerms", label: "Terms" },
    { key: "gmpCertified", label: "GMP", render: (v) => (v as boolean) ? <Badge className="bg-green-100 text-green-800">Certified</Badge> : <Badge variant="outline">No</Badge> },
  ];

  // ─── Filter configs ────────────────────────────────────────────
  const invoiceFilterFields = [{ key: "status", label: "Status", type: "select" as const, options: [
    { label: "Draft", value: "DRAFT" }, { label: "Sent", value: "SENT" },
    { label: "Partial", value: "PARTIAL" }, { label: "Paid", value: "PAID" }, { label: "Overdue", value: "OVERDUE" },
  ]}];

  const paymentFilterFields = [
    { key: "type", label: "Type", type: "select" as const, options: [{ label: "Received", value: "RECEIVED" }, { label: "Sent", value: "SENT" }] },
    { key: "method", label: "Method", type: "select" as const, options: [
      { label: "Bank Transfer", value: "BANK_TRANSFER" }, { label: "Cheque", value: "CHEQUE" },
      { label: "Cash", value: "CASH" }, { label: "Credit Card", value: "CREDIT_CARD" },
    ]},
  ];

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "invoices", label: `Invoices (${store.invoices.length})` },
    { key: "payments", label: `Payments (${store.payments.length})` },
    { key: "bank", label: `Bank Accounts (${store.bankAccounts.length})` },
    { key: "vendors", label: `Vendors AP (${store.vendors.length})` },
    { key: "budgets", label: `Budgets (${store.budgets.length})` },
    { key: "trial", label: "Trial Balance" },
    { key: "ratios", label: "Financial Ratios" },
    { key: "cashflow", label: "Cash Flow" },
  ];

  // ─── Budget CRUD ──────────────────────────────────────────────
  const budgetFields: EntityField[] = [
    { name: "name", label: "Budget Name", type: "text", required: true },
    { name: "fiscalYear", label: "Fiscal Year", type: "text", required: true, placeholder: "2026" },
    { name: "period", label: "Period", type: "select", required: true, options: ["Q1", "Q2", "Q3", "Q4", "Annual", "Monthly"].map((p) => ({ label: p, value: p })) },
    { name: "accountId", label: "GL Account", type: "select", options: [{ label: "— None —", value: "" }, ...store.glAccounts.map((a) => ({ label: `${a.code} — ${a.name}`, value: a.id }))] },
    { name: "costCenterId", label: "Cost Center", type: "select", options: [{ label: "— None —", value: "" }, ...store.costCenters.map((c) => ({ label: `${c.code} — ${c.name}`, value: c.id }))] },
    { name: "budgeted", label: "Budgeted (EGP)", type: "number", required: true },
    { name: "actual", label: "Actual (EGP)", type: "number", defaultValue: 0 },
    { name: "status", label: "Status", type: "select", defaultValue: "DRAFT", options: [{ label: "Draft", value: "DRAFT" }, { label: "Approved", value: "APPROVED" }, { label: "Closed", value: "CLOSED" }] },
  ];

  function handleBudgetSubmit(data: EntityFormData) {
    const payload = { name: String(data.name), fiscalYear: String(data.fiscalYear), period: String(data.period), accountId: data.accountId ? String(data.accountId) : undefined, costCenterId: data.costCenterId ? String(data.costCenterId) : undefined, budgeted: Number(data.budgeted), actual: Number(data.actual ?? 0), status: String(data.status) as Budget["status"] };
    if (editingBudget) { store.update("budgets", editingBudget.id, payload); }
    else { store.add("budgets", { id: store.genId("bud"), ...payload }); }
    setShowBudgetModal(false); setEditingBudget(null);
  }

  // ─── Recent transactions for overview ──────────────────────────
  const recentTx = useMemo(() => {
    const items: { label: string; amount: number; type: "Income" | "Expense"; date: string; status: string }[] = [];
    store.invoices.slice(0, 5).forEach((i) => items.push({ label: `Invoice ${i.number} — ${customerName(i.customerId)}`, amount: i.total, type: "Income", date: i.date.slice(0, 10), status: i.status }));
    store.payments.forEach((p) => items.push({
      label: `${p.reference} — ${p.customerId ? customerName(p.customerId) : p.vendorId ? vendorName(p.vendorId) : ""}`,
      amount: p.amount, type: p.type === "RECEIVED" ? "Income" : "Expense", date: p.date.slice(0, 10), status: p.type,
    }));
    return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  }, [store.invoices, store.payments, store.customers, store.vendors]);

  // ─── Pending cheques summary ───────────────────────────────────
  const pendingIncoming = store.cheques.filter((c) => c.type === "INCOMING" && (c.status === "PENDING" || c.status === "DEPOSITED")).reduce((s, c) => s + c.amount, 0);
  const pendingOutgoing = store.cheques.filter((c) => c.type === "OUTGOING" && c.status === "PENDING").reduce((s, c) => s + c.amount, 0);

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Finance" description="Integrated financial overview — invoices, payments, bank accounts, and vendor AP from the central data store">
        {activeTab === "invoices" && (
          <Button onClick={() => { setEditingInvoice(null); setShowInvoiceModal(true); }} className="gap-2"><Plus className="h-4 w-4" /> New Invoice</Button>
        )}
        {activeTab === "payments" && (
          <Button onClick={() => { setEditingPayment(null); setShowPaymentModal(true); }} className="gap-2"><Plus className="h-4 w-4" /> Record Payment</Button>
        )}
        {(activeTab === "invoices" || activeTab === "payments") && (
          <Button variant="outline" onClick={() => {
            if (activeTab === "invoices") downloadCSV("invoices.csv", store.invoices.map((i) => ({ Number: i.number, Customer: customerName(i.customerId), Date: i.date.slice(0, 10), DueDate: i.dueDate.slice(0, 10), Total: i.total, Status: i.status })) as unknown as Record<string, unknown>[]);
            else downloadCSV("payments.csv", store.payments.map((p) => ({ Reference: p.reference, Type: p.type, Party: p.customerId ? customerName(p.customerId) : p.vendorId ? vendorName(p.vendorId) : "", Amount: p.amount, Method: p.method, Date: p.date })) as unknown as Record<string, unknown>[]);
          }} className="gap-2"><Download className="h-4 w-4" /> Export CSV</Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Bank Balance" value={egp(totalBankBalance)} subtitle={`${store.bankAccounts.length} active accounts`} icon={Landmark} />
        <StatsCard title="Accounts Receivable" value={egp(totalAR)} subtitle="Outstanding from customers" icon={TrendingUp} />
        <StatsCard title="Accounts Payable" value={egp(totalAP)} subtitle="Owed to vendors" icon={TrendingDown} />
        <StatsCard title="Net Position" value={egp(netPosition)} subtitle="Bank + AR − AP" icon={DollarSign} />
      </div>

      <div className="border-b border-border">
        <nav className="flex flex-wrap gap-1 -mb-px">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >{t.label}</button>
          ))}
        </nav>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 rounded-lg border border-border divide-y divide-border">
              <div className="px-4 py-3 bg-muted/30">
                <h3 className="text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Recent Transactions</h3>
              </div>
              {recentTx.map((tx, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${tx.type === "Income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {tx.type === "Income" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.label}</p>
                      <p className="text-xs text-muted-foreground">{tx.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={tx.status} />
                    <span className={`text-sm font-semibold ${tx.type === "Income" ? "text-green-700" : "text-red-600"}`}>
                      {tx.type === "Income" ? "+" : "-"}{egp(tx.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Invoice Summary</h3>
                {(["PAID", "SENT", "PARTIAL", "OVERDUE", "DRAFT"] as const).map((status) => {
                  const count = store.invoices.filter((i) => i.status === status).length;
                  const total = store.invoices.filter((i) => i.status === status).reduce((s, i) => s + i.total, 0);
                  if (count === 0) return null;
                  return (
                    <div key={status} className="flex justify-between items-center py-1.5 text-sm">
                      <StatusBadge status={status} />
                      <span className="text-muted-foreground">{count} — {egp(total)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Cheque Position</h3>
                <div className="flex justify-between items-center py-1.5 text-sm">
                  <span className="text-muted-foreground">Pending Incoming</span>
                  <span className="font-medium text-green-700">{egp(pendingIncoming)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 text-sm">
                  <span className="text-muted-foreground">Pending Outgoing</span>
                  <span className="font-medium text-red-600">{egp(pendingOutgoing)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 text-sm border-t pt-2 mt-1">
                  <span className="text-muted-foreground font-medium">Net Cheque Position</span>
                  <span className="font-semibold">{egp(pendingIncoming - pendingOutgoing)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "invoices" && (
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="p-4 border-b border-border">
            <FilterBar searchValue={filters._search} onSearchChange={(v) => setFilters((f) => ({ ...f, _search: v }))}
              fields={invoiceFilterFields} values={filters} onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))} />
          </div>
          <DataTable columns={invoiceColumns} data={filteredInvoices as unknown as Record<string, unknown>[]} emptyMessage="No invoices found." />
        </div>
      )}

      {activeTab === "payments" && (
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="p-4 border-b border-border">
            <FilterBar searchValue={filters._search} onSearchChange={(v) => setFilters((f) => ({ ...f, _search: v }))}
              fields={paymentFilterFields} values={filters} onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))} />
          </div>
          <DataTable columns={paymentColumns} data={filteredPayments as unknown as Record<string, unknown>[]} emptyMessage="No payments found." />
        </div>
      )}

      {activeTab === "bank" && (
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <DataTable columns={bankColumns} data={store.bankAccounts as unknown as Record<string, unknown>[]} emptyMessage="No bank accounts." />
        </div>
      )}

      {activeTab === "vendors" && (
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <DataTable columns={vendorColumns} data={store.vendors as unknown as Record<string, unknown>[]} emptyMessage="No vendors found." />
        </div>
      )}

      {activeTab === "budgets" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Budgeted</div><div className="text-lg font-bold">{egp(store.budgets.reduce((s, b) => s + b.budgeted, 0))}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Actual</div><div className="text-lg font-bold">{egp(store.budgets.reduce((s, b) => s + b.actual, 0))}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Net Variance</div><div className={`text-lg font-bold ${store.budgets.reduce((s, b) => s + (b.budgeted - b.actual), 0) >= 0 ? "text-green-600" : "text-red-600"}`}>{egp(store.budgets.reduce((s, b) => s + (b.budgeted - b.actual), 0))}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Active Budgets</div><div className="text-lg font-bold">{store.budgets.filter((b) => b.status === "APPROVED").length} <span className="text-sm font-normal text-muted-foreground">of {store.budgets.length}</span></div></CardContent></Card>
          </div>
          <div className="flex justify-end"><Button size="sm" onClick={() => { setEditingBudget(null); setShowBudgetModal(true); }}><Plus className="h-4 w-4 mr-1" /> Add Budget</Button></div>
          <div className="bg-card rounded-xl border border-border shadow-sm">
            <DataTable
              columns={[
                { key: "name", label: "Budget", render: (v) => <span className="font-medium">{v as string}</span> },
                { key: "fiscalYear", label: "FY" },
                { key: "period", label: "Period", render: (v) => <Badge variant="outline">{v as string}</Badge> },
                { key: "costCenterId", label: "Linked To", render: (_v, row) => {
                  const b = row as unknown as Budget;
                  return b.costCenterId ? <span className="text-xs">{ccName(b.costCenterId)}</span> : b.accountId ? <span className="text-xs">{glName(b.accountId)}</span> : <span className="text-muted-foreground">—</span>;
                }},
                { key: "budgeted", label: "Budgeted", className: "text-right", render: (v) => egp(v as number) },
                { key: "actual", label: "Actual", className: "text-right", render: (v) => egp(v as number) },
                { key: "id", label: "Variance", className: "text-right", render: (_v, row) => {
                  const b = row as unknown as Budget;
                  const v = b.budgeted - b.actual;
                  return <span className={`font-semibold ${v >= 0 ? "text-green-600" : "text-red-600"}`}>{v >= 0 ? "+" : ""}{egp(v)}</span>;
                }},
                { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
                { key: "accountId", label: "", render: (_v, row) => {
                  const b = row as unknown as Budget;
                  return <EditDeleteMenu onEdit={() => { setEditingBudget(b); setShowBudgetModal(true); }} onDelete={() => store.remove("budgets", b.id)} itemLabel={b.name} />;
                }},
              ] as Column<Record<string, unknown>>[]}
              data={store.budgets as unknown as Record<string, unknown>[]}
              emptyMessage="No budgets defined."
            />
          </div>
        </div>
      )}

      {activeTab === "trial" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => {
              const rows = store.glAccounts.filter((a) => a.isActive).map((a) => ({
                Code: a.code, Account: a.name, Type: a.type, SubType: a.subType,
                Debit: ["ASSET", "EXPENSE"].includes(a.type) ? Math.abs(a.balance) : 0,
                Credit: ["LIABILITY", "EQUITY", "REVENUE"].includes(a.type) ? Math.abs(a.balance) : 0,
              }));
              downloadCSV("trial-balance.csv", rows);
            }}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-sm">
            <DataTable
              columns={[
                { key: "code", label: "Code", render: (v) => <span className="font-mono text-xs font-semibold">{v as string}</span> },
                { key: "name", label: "Account", render: (v) => <span className="font-medium">{v as string}</span> },
                { key: "type", label: "Type", render: (v) => {
                  const colors: Record<string, string> = { ASSET: "bg-blue-100 text-blue-800", LIABILITY: "bg-red-100 text-red-800", EQUITY: "bg-purple-100 text-purple-800", REVENUE: "bg-green-100 text-green-800", EXPENSE: "bg-amber-100 text-amber-800" };
                  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[v as string] ?? ""}`}>{v as string}</span>;
                }},
                { key: "balance", label: "Debit", className: "text-right", render: (v, row) => {
                  const type = (row as unknown as GLAccount).type;
                  return ["ASSET", "EXPENSE"].includes(type) ? <span className="font-semibold">{Math.abs(v as number).toLocaleString()}</span> : <span className="text-muted-foreground">—</span>;
                }},
                { key: "subType", label: "Credit", className: "text-right", render: (_v, row) => {
                  const a = row as unknown as GLAccount;
                  return ["LIABILITY", "EQUITY", "REVENUE"].includes(a.type) ? <span className="font-semibold">{Math.abs(a.balance).toLocaleString()}</span> : <span className="text-muted-foreground">—</span>;
                }},
              ] as Column<Record<string, unknown>>[]}
              data={store.glAccounts.filter((a) => a.isActive) as unknown as Record<string, unknown>[]}
              emptyMessage="No GL accounts."
              pagination={false}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Card><CardContent className="p-4 text-center"><div className="text-sm text-muted-foreground">Total Debits</div><div className="text-2xl font-bold">EGP {store.glAccounts.filter((a) => a.isActive && ["ASSET", "EXPENSE"].includes(a.type)).reduce((s, a) => s + Math.abs(a.balance), 0).toLocaleString()}</div></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><div className="text-sm text-muted-foreground">Total Credits</div><div className="text-2xl font-bold">EGP {store.glAccounts.filter((a) => a.isActive && ["LIABILITY", "EQUITY", "REVENUE"].includes(a.type)).reduce((s, a) => s + Math.abs(a.balance), 0).toLocaleString()}</div></CardContent></Card>
          </div>
        </div>
      )}

      {activeTab === "ratios" && (
        <div className="space-y-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" /> Liquidity Ratios</CardTitle></CardHeader>
            <CardContent><div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center"><div className="text-xs text-muted-foreground">Current Ratio</div><div className="text-2xl font-bold">{glCurrentLiabilities > 0 ? (glCurrentAssets / glCurrentLiabilities).toFixed(2) : "N/A"}</div><div className="text-xs text-muted-foreground">Current Assets / Current Liabilities</div></div>
              <div className="p-4 rounded-lg bg-muted/50 text-center"><div className="text-xs text-muted-foreground">Quick Ratio</div><div className="text-2xl font-bold">{glCurrentLiabilities > 0 ? ((glCurrentAssets - glInventory) / glCurrentLiabilities).toFixed(2) : "N/A"}</div><div className="text-xs text-muted-foreground">(Current Assets − Inventory) / CL</div></div>
              <div className="p-4 rounded-lg bg-muted/50 text-center"><div className="text-xs text-muted-foreground">Cash Ratio</div><div className="text-2xl font-bold">{glCurrentLiabilities > 0 ? (totalBankBalance / glCurrentLiabilities).toFixed(2) : "N/A"}</div><div className="text-xs text-muted-foreground">Cash / Current Liabilities</div></div>
            </div></CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Profitability Ratios</CardTitle></CardHeader>
            <CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center"><div className="text-xs text-muted-foreground">Gross Margin</div><div className="text-2xl font-bold">{glTotalRevenue > 0 ? (((glTotalRevenue - glCOGS) / glTotalRevenue) * 100).toFixed(1) : "0"}%</div></div>
              <div className="p-4 rounded-lg bg-muted/50 text-center"><div className="text-xs text-muted-foreground">Net Margin</div><div className="text-2xl font-bold">{glTotalRevenue > 0 ? ((netIncome / glTotalRevenue) * 100).toFixed(1) : "0"}%</div></div>
              <div className="p-4 rounded-lg bg-muted/50 text-center"><div className="text-xs text-muted-foreground">ROE</div><div className="text-2xl font-bold">{glTotalEquity > 0 ? ((netIncome / glTotalEquity) * 100).toFixed(1) : "0"}%</div></div>
              <div className="p-4 rounded-lg bg-muted/50 text-center"><div className="text-xs text-muted-foreground">ROA</div><div className="text-2xl font-bold">{glTotalAssets > 0 ? ((netIncome / glTotalAssets) * 100).toFixed(1) : "0"}%</div></div>
            </div></CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Leverage & Efficiency</CardTitle></CardHeader>
            <CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center"><div className="text-xs text-muted-foreground">Debt-to-Equity</div><div className="text-2xl font-bold">{glTotalEquity > 0 ? (glTotalLiabilities / glTotalEquity).toFixed(2) : "N/A"}</div></div>
              <div className="p-4 rounded-lg bg-muted/50 text-center"><div className="text-xs text-muted-foreground">Interest Coverage</div><div className="text-2xl font-bold">{glInterestExpense > 0 ? (operatingIncome / glInterestExpense).toFixed(1) : "N/A"}x</div></div>
              <div className="p-4 rounded-lg bg-muted/50 text-center"><div className="text-xs text-muted-foreground">AR Turnover</div><div className="text-2xl font-bold">{totalAR > 0 ? (glTotalRevenue / totalAR).toFixed(1) : "N/A"}x</div></div>
              <div className="p-4 rounded-lg bg-muted/50 text-center"><div className="text-xs text-muted-foreground">Inventory Turnover</div><div className="text-2xl font-bold">{glInventory > 0 ? (glCOGS / glInventory).toFixed(1) : "N/A"}x</div></div>
            </div></CardContent>
          </Card>
        </div>
      )}

      {activeTab === "cashflow" && (
        <div className="space-y-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-600" /> Operating Activities</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm py-1.5"><span>Collections from Customers</span><span className="font-semibold text-green-600">+{egp(totalInflows)}</span></div>
              <div className="flex justify-between text-sm py-1.5"><span>Payments to Vendors</span><span className="font-semibold text-red-600">-{egp(totalOutflows)}</span></div>
              <div className="flex justify-between text-sm py-1.5 border-t font-semibold"><span>Net Operating Cash Flow</span><span className={totalInflows - totalOutflows >= 0 ? "text-green-600" : "text-red-600"}>{egp(totalInflows - totalOutflows)}</span></div>
              <div className="mt-2 space-y-1">
                {store.payments.map((p) => (
                  <div key={p.id} className="flex justify-between text-xs py-1 text-muted-foreground">
                    <span>{p.reference} — {p.customerId ? customerName(p.customerId) : p.vendorId ? vendorName(p.vendorId) : "—"}</span>
                    <span className={p.type === "RECEIVED" ? "text-green-600" : "text-red-600"}>{p.type === "RECEIVED" ? "+" : "-"}{egp(p.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-blue-600" /> Investing Activities</CardTitle></CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm py-1.5"><span>Equipment Purchases (Fixed Assets)</span><span className="font-semibold text-red-600">-{egp(0)}</span></div>
              <div className="text-xs text-muted-foreground mt-1">No investing transactions recorded this period.</div>
            </CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Landmark className="h-4 w-4 text-purple-600" /> Financing Activities</CardTitle></CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm py-1.5"><span>Loan Proceeds</span><span className="font-semibold text-green-600">+{egp(0)}</span></div>
              <div className="flex justify-between text-sm py-1.5"><span>Interest Paid</span><span className="font-semibold text-red-600">-{egp(glInterestExpense)}</span></div>
              <div className="flex justify-between text-sm py-1.5 border-t font-semibold"><span>Net Financing</span><span className="text-red-600">-{egp(glInterestExpense)}</span></div>
            </CardContent>
          </Card>
          <Card className="border-2 border-primary/20"><CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div><div className="text-sm font-semibold">Net Cash Flow</div><div className="text-xs text-muted-foreground">Operating + Investing + Financing</div></div>
              <div className={`text-2xl font-bold ${(totalInflows - totalOutflows - glInterestExpense) >= 0 ? "text-green-600" : "text-red-600"}`}>{egp(totalInflows - totalOutflows - glInterestExpense)}</div>
            </div>
          </CardContent></Card>
        </div>
      )}

      <EntityFormModal
        open={showInvoiceModal}
        onOpenChange={(open) => { if (!open) { setShowInvoiceModal(false); setEditingInvoice(null); } }}
        title={editingInvoice ? "Edit Invoice" : "New Invoice"}
        fields={invoiceFields}
        initialData={editingInvoice ? { customerId: editingInvoice.customerId, date: editingInvoice.date.slice(0, 10), dueDate: editingInvoice.dueDate.slice(0, 10), subtotal: editingInvoice.subtotal, tax: editingInvoice.tax, status: editingInvoice.status } : undefined}
        onSubmit={handleInvoiceSubmit}
      />

      <EntityFormModal
        open={showPaymentModal}
        onOpenChange={(open) => { if (!open) { setShowPaymentModal(false); setEditingPayment(null); } }}
        title={editingPayment ? "Edit Payment" : "Record Payment"}
        fields={paymentFields}
        initialData={editingPayment ? { type: editingPayment.type, customerId: editingPayment.customerId || "", vendorId: editingPayment.vendorId || "", invoiceId: editingPayment.invoiceId || "", amount: editingPayment.amount, method: editingPayment.method, bankAccountId: editingPayment.bankAccountId || "", date: editingPayment.date, notes: editingPayment.notes || "" } : undefined}
        onSubmit={handlePaymentSubmit}
      />

      <EntityFormModal
        open={showBudgetModal}
        onOpenChange={(open) => { if (!open) { setShowBudgetModal(false); setEditingBudget(null); } }}
        title={editingBudget ? "Edit Budget" : "Add Budget"}
        fields={budgetFields}
        initialData={editingBudget ? { name: editingBudget.name, fiscalYear: editingBudget.fiscalYear, period: editingBudget.period, accountId: editingBudget.accountId ?? "", costCenterId: editingBudget.costCenterId ?? "", budgeted: editingBudget.budgeted, actual: editingBudget.actual, status: editingBudget.status } : undefined}
        onSubmit={handleBudgetSubmit}
      />
    </div>
  );
}
