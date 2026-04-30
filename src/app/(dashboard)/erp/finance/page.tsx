"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import StatusBadge from "@/components/shared/status-badge";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { EntityFormModal, type EntityField, type EntityFormData } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import { CustomerLink, VendorLink, BankAccountLink } from "@/components/shared/entity-detail-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Column } from "@/components/shared/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDataStore, type Invoice, type Payment, type Budget, type GLAccount, type SalesOrder, type BankAccount } from "@/lib/data-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApprovals } from "@/lib/approval-workflow";
import { openInvoicePDF } from "@/lib/invoice-pdf";
import {
  DollarSign, TrendingUp, TrendingDown, FileText,
  Plus, CreditCard, BookOpen, Landmark, Download,
  BarChart3, Calculator, Activity, Target,
  ShoppingBag, CheckCircle, XCircle, AlertTriangle,
  ArrowUpDown, RefreshCw, Eye, Link2, Unlink, ArrowDownLeft, ArrowUpRight,
} from "lucide-react";
import { downloadCSV } from "@/lib/download";
import { useTranslation } from "@/lib/i18n/i18n-context";

const egp = (n: number) => `EGP ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Tab = "overview" | "invoices" | "payments" | "bank" | "vendors" | "budgets" | "trial" | "ratios" | "cashflow" | "sales-orders";

export default function FinancePage() {
  const store = useDataStore();
  const approvals = useApprovals();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [invoiceFilters, setInvoiceFilters] = useState<FilterState>({ _search: "", status: "" });
  const [paymentFilters, setPaymentFilters] = useState<FilterState>({ _search: "", type: "", method: "" });

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [viewPayment, setViewPayment] = useState<Payment | null>(null);
  const [viewBudget, setViewBudget] = useState<Budget | null>(null);

  // ─── Bank state ────────────────────────────────────────────────
  const [showBankModal, setShowBankModal] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [bankDetailId, setBankDetailId] = useState<string | null>(null);
  const [bankTxFilter, setBankTxFilter] = useState<"all" | "credit" | "debit">("all");
  const [bankTxSearch, setBankTxSearch] = useState("");

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
      const q = (invoiceFilters._search || "").toLowerCase();
      const cName = customerName(i.customerId).toLowerCase();
      const matchesSearch = !q || i.number.toLowerCase().includes(q) || cName.includes(q);
      const matchesStatus = !invoiceFilters.status || i.status === invoiceFilters.status;
      return matchesSearch && matchesStatus;
    });
  }, [store.invoices, store.customers, invoiceFilters]);

  const filteredPayments = useMemo(() => {
    return store.payments.filter((p) => {
      const q = (paymentFilters._search || "").toLowerCase();
      const party = p.customerId ? customerName(p.customerId) : p.vendorId ? vendorName(p.vendorId) : "";
      const matchesSearch = !q || p.reference.toLowerCase().includes(q) || party.toLowerCase().includes(q);
      const matchesType = !paymentFilters.type || p.type === paymentFilters.type;
      const matchesMethod = !paymentFilters.method || p.method === paymentFilters.method;
      return matchesSearch && matchesType && matchesMethod;
    });
  }, [store.payments, store.customers, store.vendors, paymentFilters]);

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
      reference: store.generatePaymentRef(),
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
    { key: "customerId", label: "Customer", render: (v) => <CustomerLink customerId={v as string} /> },
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
          onView={() => setViewInvoice(inv)}
          canView
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
      if (p.customerId) return <CustomerLink customerId={p.customerId} />;
      if (p.vendorId) return <VendorLink vendorId={p.vendorId} />;
      return "—";
    }},
    { key: "date", label: "Date" },
    { key: "method", label: "Method", render: (v) => <Badge variant="outline">{methodLabels[v as string] ?? (v as string)}</Badge> },
    { key: "amount", label: "Amount", render: (v) => <span className="font-semibold">{egp(v as number)}</span>, className: "text-right" },
    { key: "id", label: "", render: (_v, row) => {
      const p = store.payments.find((x) => x.id === row.id);
      if (!p) return null;
      return (
        <EditDeleteMenu
          onView={() => setViewPayment(p)}
          canView
          onEdit={() => { setEditingPayment(p); setShowPaymentModal(true); }}
          onDelete={() => store.remove("payments", p.id)}
          itemLabel={p.reference}
        />
      );
    }},
  ];

  const bankColumns: Column<Record<string, unknown>>[] = [
    { key: "code", label: "Code", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
    { key: "id", label: "Account Name", render: (_v, row) => {
      const b = row as unknown as { id: string };
      return <BankAccountLink bankAccountId={b.id} />;
    }},
    { key: "bankName", label: "Bank" },
    { key: "accountNumber", label: "Account #", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
    { key: "currency", label: "Currency" },
    { key: "balance", label: "Balance", render: (v) => <span className="font-semibold text-green-700">{egp(v as number)}</span>, className: "text-right" },
    { key: "type", label: "Type", render: (v) => <Badge variant="outline">{v as string}</Badge> },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
  ];

  const vendorColumns: Column<Record<string, unknown>>[] = [
    { key: "code", label: "Code", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
    { key: "id", label: "Vendor", render: (_v, row) => {
      const vendor = row as unknown as { id: string };
      return <VendorLink vendorId={vendor.id} />;
    }},
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
    { key: "overview", label: t("acct.overview") },
    { key: "invoices", label: `${t("fin.invoices")} (${store.invoices.length})` },
    { key: "payments", label: `${t("fin.payments")} (${store.payments.length})` },
    { key: "bank", label: `Bank Accounts (${store.bankAccounts.length})` },
    { key: "vendors", label: `Vendors AP (${store.vendors.length})` },
    { key: "budgets", label: `${t("fin.budgets")} (${store.budgets.length})` },
    { key: "trial", label: "Trial Balance" },
    { key: "ratios", label: "Financial Ratios" },
    { key: "cashflow", label: "Cash Flow" },
    { key: "sales-orders", label: `${t("fin.salesOrders")} (${store.salesOrders.length})` },
  ];

  // ─── Budget CRUD ──────────────────────────────────────────────
  const budgetFields: EntityField[] = [
    { name: "name", label: "Budget Name", type: "text", required: true },
    { name: "fiscalYear", label: "Fiscal Year", type: "text", required: true, defaultValue: String(new Date().getFullYear()), placeholder: "2026" },
    { name: "period", label: "Period", type: "select", required: true, defaultValue: "Q1", options: ["Q1", "Q2", "Q3", "Q4", "Annual", "Monthly"].map((p) => ({ label: p, value: p })) },
    { name: "accountId", label: "GL Account", type: "select", options: [{ label: "— None —", value: "" }, ...store.glAccounts.map((a) => ({ label: `${a.code} — ${a.name}`, value: a.id }))] },
    { name: "costCenterId", label: "Cost Center", type: "select", options: [{ label: "— None —", value: "" }, ...store.costCenters.map((c) => ({ label: `${c.code} — ${c.name}`, value: c.id }))] },
    { name: "budgeted", label: "Budgeted (EGP)", type: "number", required: true, defaultValue: 0 },
    { name: "actual", label: "Actual (EGP)", type: "number", defaultValue: 0 },
    { name: "status", label: "Status", type: "select", required: true, defaultValue: "DRAFT", options: [{ label: "Draft", value: "DRAFT" }, { label: "Approved", value: "APPROVED" }, { label: "Closed", value: "CLOSED" }] },
  ];

  function handleBudgetSubmit(data: EntityFormData) {
    const status = (String(data.status || "DRAFT")) as Budget["status"];
    const payload = { name: String(data.name), fiscalYear: String(data.fiscalYear || new Date().getFullYear()), period: String(data.period || "Q1"), accountId: data.accountId ? String(data.accountId) : undefined, costCenterId: data.costCenterId ? String(data.costCenterId) : undefined, budgeted: Number(data.budgeted) || 0, actual: Number(data.actual) || 0, status };
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
      <PageHeader title={t("fin.title")} description={t("fin.manageFinance")}>
        {activeTab === "invoices" && (
          <Button type="button" onClick={() => { setEditingInvoice(null); setShowInvoiceModal(true); }} className="gap-2"><Plus className="h-4 w-4" /> New Invoice</Button>
        )}
        {activeTab === "payments" && (
          <Button type="button" onClick={() => { setEditingPayment(null); setShowPaymentModal(true); }} className="gap-2"><Plus className="h-4 w-4" /> Record Payment</Button>
        )}
        {activeTab === "budgets" && (
          <Button type="button" onClick={() => { setEditingBudget(null); setShowBudgetModal(true); }} className="gap-2"><Plus className="h-4 w-4" /> Add Budget</Button>
        )}
        {(activeTab === "invoices" || activeTab === "payments") && (
          <Button type="button" variant="outline" onClick={() => {
            if (activeTab === "invoices") downloadCSV("invoices.csv", store.invoices.map((i) => ({ Number: i.number, Customer: customerName(i.customerId), Date: i.date.slice(0, 10), DueDate: i.dueDate.slice(0, 10), Total: i.total, Status: i.status })) as unknown as Record<string, unknown>[]);
            else downloadCSV("payments.csv", store.payments.map((p) => ({ Reference: p.reference, Type: p.type, Party: p.customerId ? customerName(p.customerId) : p.vendorId ? vendorName(p.vendorId) : "", Amount: p.amount, Method: p.method, Date: p.date })) as unknown as Record<string, unknown>[]);
          }} className="gap-2"><Download className="h-4 w-4" /> Export CSV</Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title={t("fin.totalReceivables")} value={egp(totalBankBalance)} subtitle={`${store.bankAccounts.length} active accounts`} icon={Landmark} />
        <StatsCard title={t("fin.totalPayables")} value={egp(totalAR)} subtitle="Outstanding from customers" icon={TrendingUp} />
        <StatsCard title={t("fin.netCashFlow")} value={egp(totalAP)} subtitle="Owed to vendors" icon={TrendingDown} />
        <StatsCard title={t("fin.overdueInvoices")} value={egp(netPosition)} subtitle="Bank + AR − AP" icon={DollarSign} />
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
            <FilterBar searchValue={invoiceFilters._search} onSearchChange={(v) => setInvoiceFilters((f) => ({ ...f, _search: v }))}
              fields={invoiceFilterFields} values={invoiceFilters} onChange={(k, v) => setInvoiceFilters((f) => ({ ...f, [k]: v }))} />
          </div>
          <DataTable columns={invoiceColumns} data={filteredInvoices as unknown as Record<string, unknown>[]} exportable exportFilename="erp-finance.csv" emptyMessage="No invoices found." />
        </div>
      )}

      {activeTab === "payments" && (
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="p-4 border-b border-border">
            <FilterBar searchValue={paymentFilters._search} onSearchChange={(v) => setPaymentFilters((f) => ({ ...f, _search: v }))}
              fields={paymentFilterFields} values={paymentFilters} onChange={(k, v) => setPaymentFilters((f) => ({ ...f, [k]: v }))} />
          </div>
          <DataTable columns={paymentColumns} data={filteredPayments as unknown as Record<string, unknown>[]} exportable exportFilename="erp-finance.csv" emptyMessage="No payments found." />
        </div>
      )}

      {activeTab === "bank" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Total Balance: <span className="font-semibold text-foreground">{egp(totalBankBalance)}</span> across {store.bankAccounts.length} accounts
            </div>
            <Button size="sm" onClick={() => { setEditingBank(null); setShowBankModal(true); }}><Plus className="h-4 w-4 mr-1" /> Add Bank Account</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {store.bankAccounts.map((acc) => {
              const accCheques = store.cheques.filter((c) => c.bankAccountId === acc.id);
              const pendingIn = accCheques.filter((c) => c.type === "INCOMING" && (c.status === "PENDING" || c.status === "DEPOSITED")).reduce((s, c) => s + c.amount, 0);
              const pendingOut = accCheques.filter((c) => c.type === "OUTGOING" && c.status === "PENDING").reduce((s, c) => s + c.amount, 0);
              const accPayments = store.payments.filter((p) => p.bankAccountId === acc.id);
              const recentTxCount = accPayments.length;
              return (
                <Card key={acc.id} className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/40 ${acc.status !== "ACTIVE" ? "opacity-60" : ""}`} onClick={() => setBankDetailId(acc.id)}>
                  <CardContent className="pt-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 rounded-lg"><Landmark className="h-4 w-4 text-blue-600" /></div>
                        <div>
                          <h3 className="font-semibold text-sm">{acc.name}</h3>
                          <p className="text-xs text-muted-foreground">{acc.bankName}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${acc.status === "ACTIVE" ? "bg-green-100 text-green-800" : acc.status === "DORMANT" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600"}`}>{acc.status}</span>
                    </div>
                    <div className="text-sm space-y-1.5">
                      <div className="flex justify-between"><span className="text-muted-foreground">Account #</span><span className="font-mono text-xs">{acc.accountNumber}</span></div>
                      {acc.iban && <div className="flex justify-between"><span className="text-muted-foreground">IBAN</span><span className="font-mono text-xs">{acc.iban.length > 16 ? acc.iban.substring(0, 16) + "..." : acc.iban}</span></div>}
                      <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><span>{acc.currency}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Type</span><Badge variant="outline" className="text-xs h-5">{acc.type}</Badge></div>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">Balance</p>
                      <p className="text-xl font-bold text-green-700">{egp(acc.balance)}</p>
                    </div>
                    {(pendingIn > 0 || pendingOut > 0) && (
                      <div className="flex gap-3 text-xs pt-1">
                        {pendingIn > 0 && <span className="text-green-600">+{(pendingIn / 1000).toFixed(0)}K incoming</span>}
                        {pendingOut > 0 && <span className="text-red-600">-{(pendingOut / 1000).toFixed(0)}K outgoing</span>}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <span>{recentTxCount} transaction{recentTxCount !== 1 ? "s" : ""}</span>
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> Click to view</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {store.bankAccounts.length === 0 && (
              <div className="col-span-3 text-center py-12 text-muted-foreground">
                <Landmark className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>No bank accounts. Click &quot;Add Bank Account&quot; to get started.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "vendors" && (
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <DataTable columns={vendorColumns} data={store.vendors as unknown as Record<string, unknown>[]} exportable exportFilename="erp-finance.csv" emptyMessage="No vendors found." />
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
          <div className="flex justify-end"><Button type="button" size="sm" onClick={() => { setEditingBudget(null); setShowBudgetModal(true); }}><Plus className="h-4 w-4 mr-1" /> Add Budget</Button></div>
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
                  return <EditDeleteMenu onView={() => setViewBudget(b)} canView onEdit={() => { setEditingBudget(b); setShowBudgetModal(true); }} onDelete={() => store.remove("budgets", b.id)} itemLabel={b.name} />;
                }},
              ] as Column<Record<string, unknown>>[]}
              data={store.budgets as unknown as Record<string, unknown>[]}
              exportable exportFilename="erp-finance.csv" emptyMessage="No budgets defined."
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
              exportable exportFilename="erp-finance.csv" emptyMessage="No GL accounts."
              
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

      {activeTab === "sales-orders" && (() => {
        const soApprovals = approvals.getByModule("SalesOrder");
        const pendingSOApprovals = soApprovals.filter((a) => a.status === "PENDING");
        const egpF = (n: number) => `EGP ${n.toLocaleString()}`;

        function submitSOForApproval(so: SalesOrder) {
          const customer = store.customers.find((c) => c.id === so.customerId);
          approvals.submit({
            type: "Sales Order", module: "SalesOrder", entityId: so.id,
            title: `SO ${so.number} — ${customer?.name ?? "Unknown"}`,
            description: `Sales order for ${egpF(so.total)}`,
            requestedBy: "u-admin", requestedByName: "Admin User",
            assignedTo: "admin-001", assignedToName: "Finance Manager",
            amount: so.total,
            priority: so.total > 500000 ? "HIGH" : so.total > 100000 ? "MEDIUM" : "LOW",
          });
          store.update("salesOrders", so.id, { status: "CONFIRMED" });
        }

        function approveSOFinance(approvalId: string, soId: string) {
          const so = store.salesOrders.find((s) => s.id === soId);
          if (!so) return;
          const stockIssues: string[] = [];
          for (const item of so.items) {
            const product = store.products.find((p) => p.id === item.productId);
            if (product && product.stockQty < item.quantity) stockIssues.push(`${product.name}: need ${item.quantity}, have ${product.stockQty}`);
          }
          if (stockIssues.length > 0) { alert(`Insufficient stock:\n${stockIssues.join("\n")}`); return; }
          for (const item of so.items) {
            const product = store.products.find((p) => p.id === item.productId);
            if (product) store.update("products", product.id, { stockQty: product.stockQty - item.quantity });
          }
          const dnId = store.genId("dn");
          store.add("deliveryNotes", { id: dnId, number: store.generateDNNumber(), soId: so.id, customerId: so.customerId, date: new Date().toISOString(), items: so.items.map((i) => ({ productId: i.productId, description: i.description, quantity: i.quantity })), status: "PENDING", createdAt: new Date().toISOString() });
          const invId = store.genId("inv");
          store.add("invoices", { id: invId, number: store.generateInvoiceNumber(), customerId: so.customerId, date: new Date().toISOString().split("T")[0], dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0], subtotal: so.subtotal, tax: so.tax, total: so.total, currency: "EGP", status: "SENT", items: so.items.map((i) => ({ productId: i.productId, description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })), notes: `Auto from SO ${so.number}` });
          store.add("journalEntries", { id: store.genId("je"), number: store.generateJournalNumber(), date: new Date().toISOString().split("T")[0], description: `Sales — SO ${so.number}`, reference: so.number, type: "GENERAL", lines: [{ accountId: "gl-1100", description: "Accounts Receivable", debit: so.total, credit: 0 }, { accountId: "gl-4000", description: "Revenue", debit: 0, credit: so.subtotal }, { accountId: "gl-2100", description: "VAT Payable", debit: 0, credit: so.tax }], status: "POSTED", createdBy: "u-admin", createdAt: new Date().toISOString() });
          store.update("salesOrders", so.id, { status: "INVOICED", invoiceId: invId, dnId });
          approvals.approve(approvalId, "Approved — stock verified, invoice created");
        }

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-blue-200 bg-blue-50/50"><CardContent className="pt-4"><div className="flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-blue-600" /><div><p className="text-2xl font-bold">{store.salesOrders.length}</p><p className="text-xs text-muted-foreground">Total SOs</p></div></div></CardContent></Card>
              <Card className="border-amber-200 bg-amber-50/50"><CardContent className="pt-4"><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /><div><p className="text-2xl font-bold">{pendingSOApprovals.length}</p><p className="text-xs text-muted-foreground">Pending Approval</p></div></div></CardContent></Card>
              <Card className="border-green-200 bg-green-50/50"><CardContent className="pt-4"><div className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-600" /><div><p className="text-2xl font-bold">{store.salesOrders.filter((s) => s.status === "INVOICED").length}</p><p className="text-xs text-muted-foreground">Invoiced</p></div></div></CardContent></Card>
              <Card className="border-purple-200 bg-purple-50/50"><CardContent className="pt-4"><div className="flex items-center gap-2"><FileText className="h-5 w-5 text-purple-600" /><div><p className="text-2xl font-bold">{egpF(store.salesOrders.filter((s) => s.status === "INVOICED").reduce((sum, s) => sum + s.total, 0))}</p><p className="text-xs text-muted-foreground">Revenue</p></div></div></CardContent></Card>
            </div>

            {pendingSOApprovals.length > 0 && (
              <Card className="border-amber-300">
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Pending SO Approvals</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingSOApprovals.map((apr) => {
                      const so = store.salesOrders.find((s) => s.id === apr.entityId);
                      return (
                        <div key={apr.id} className="flex items-center justify-between border rounded-lg p-3 bg-white">
                          <div className="space-y-1">
                            <p className="font-medium text-sm">{apr.title}</p>
                            <div className="flex items-center gap-2 text-xs">
                              <Badge variant="outline">{apr.priority}</Badge>
                              {apr.amount && <span className="font-semibold">{egpF(apr.amount)}</span>}
                            </div>
                            {so && <p className="text-xs text-muted-foreground">Stock: {so.items.map((item) => { const p = store.products.find((x) => x.id === item.productId); return p ? `${p.name}: ${p.stockQty >= item.quantity ? "OK" : "LOW"}` : "N/A"; }).join(" | ")}</p>}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-8 text-red-600" onClick={() => { store.update("salesOrders", apr.entityId, { status: "CANCELLED" }); approvals.reject(apr.id, "Rejected"); }}>
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                            </Button>
                            <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700" onClick={() => approveSOFinance(apr.id, apr.entityId)}>
                              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">All Sales Orders</CardTitle></CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: "number", label: "SO #", render: (v: unknown) => <span className="font-mono text-xs font-semibold">{v as string}</span> },
                    { key: "customerId", label: "Customer", render: (v: unknown) => <CustomerLink customerId={v as string} /> },
                    { key: "total", label: "Total", className: "text-right", render: (v: unknown) => <span className="font-semibold">{egpF(v as number)}</span> },
                    { key: "status", label: "Status", render: (v: unknown) => <StatusBadge status={v as string} /> },
                    { key: "id", label: "", render: (_v: unknown, row: Record<string, unknown>) => {
                      const so = row as unknown as SalesOrder;
                      return (
                        <div className="flex gap-1 justify-end">
                          {so.status === "DRAFT" && <Button size="sm" className="h-7 text-xs" onClick={() => submitSOForApproval(so)}>Submit for Approval</Button>}
                          {so.invoiceId && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { const inv = store.invoices.find((i) => i.id === so.invoiceId); const cust = store.customers.find((c) => c.id === so.customerId); if (inv) openInvoicePDF(inv, cust, "customer"); }}><FileText className="h-3.5 w-3.5 mr-1" /> PDF</Button>}
                        </div>
                      );
                    }},
                  ] as Column<Record<string, unknown>>[]}
                  data={store.salesOrders as unknown as Record<string, unknown>[]}
                  emptyMessage="No sales orders."
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Approval Workflow</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <Badge variant="outline">DRAFT</Badge><span>→</span>
                  <Badge variant="outline" className="bg-blue-50">Submit for Approval</Badge><span>→</span>
                  <Badge variant="outline" className="bg-amber-50">Stock Check + Review</Badge><span>→</span>
                  <Badge variant="outline" className="bg-green-50">Approve → Inventory + Invoice + JE</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      <EntityFormModal
        open={showInvoiceModal}
        onOpenChange={(open) => { setShowInvoiceModal(open); if (!open) setEditingInvoice(null); }}
        title={editingInvoice ? "Edit Invoice" : "New Invoice"}
        fields={invoiceFields}
        initialData={editingInvoice ? { customerId: editingInvoice.customerId, date: editingInvoice.date.slice(0, 10), dueDate: editingInvoice.dueDate.slice(0, 10), subtotal: editingInvoice.subtotal, tax: editingInvoice.tax, status: editingInvoice.status } : undefined}
        onSubmit={handleInvoiceSubmit}
      />

      <EntityFormModal
        open={showPaymentModal}
        onOpenChange={(open) => { setShowPaymentModal(open); if (!open) setEditingPayment(null); }}
        title={editingPayment ? "Edit Payment" : "Record Payment"}
        fields={paymentFields}
        initialData={editingPayment ? { type: editingPayment.type, customerId: editingPayment.customerId || "", vendorId: editingPayment.vendorId || "", invoiceId: editingPayment.invoiceId || "", amount: editingPayment.amount, method: editingPayment.method, bankAccountId: editingPayment.bankAccountId || "", date: editingPayment.date, notes: editingPayment.notes || "" } : undefined}
        onSubmit={handlePaymentSubmit}
      />

      <EntityFormModal
        open={showBudgetModal}
        onOpenChange={(open) => { setShowBudgetModal(open); if (!open) setEditingBudget(null); }}
        title={editingBudget ? "Edit Budget" : "Add Budget"}
        fields={budgetFields}
        initialData={editingBudget ? { name: editingBudget.name, fiscalYear: editingBudget.fiscalYear, period: editingBudget.period, accountId: editingBudget.accountId ?? "", costCenterId: editingBudget.costCenterId ?? "", budgeted: editingBudget.budgeted, actual: editingBudget.actual, status: editingBudget.status } : undefined}
        onSubmit={handleBudgetSubmit}
      />

      {/* ── Invoice Detail Dialog ── */}
      <Dialog open={!!viewInvoice} onOpenChange={(o) => !o && setViewInvoice(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice {viewInvoice?.number}</DialogTitle>
          </DialogHeader>
          {viewInvoice && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><span className="text-sm text-muted-foreground">Invoice Number</span><p className="font-medium font-mono">{viewInvoice.number}</p></div>
              <div><span className="text-sm text-muted-foreground">Customer</span><p className="font-medium">{customerName(viewInvoice.customerId)}</p></div>
              <div><span className="text-sm text-muted-foreground">Date</span><p className="font-medium">{viewInvoice.date.slice(0, 10)}</p></div>
              <div><span className="text-sm text-muted-foreground">Due Date</span><p className="font-medium">{viewInvoice.dueDate.slice(0, 10)}</p></div>
              <div><span className="text-sm text-muted-foreground">Subtotal</span><p className="font-medium">{egp(viewInvoice.subtotal)}</p></div>
              <div><span className="text-sm text-muted-foreground">Tax</span><p className="font-medium">{egp(viewInvoice.tax)}</p></div>
              <div><span className="text-sm text-muted-foreground">Total</span><p className="font-semibold text-lg">{egp(viewInvoice.total)}</p></div>
              <div><span className="text-sm text-muted-foreground">Currency</span><p className="font-medium">{viewInvoice.currency}</p></div>
              <div><span className="text-sm text-muted-foreground">Status</span><p><StatusBadge status={viewInvoice.status} /></p></div>
              <div><span className="text-sm text-muted-foreground">Line Items</span><p className="font-medium">{viewInvoice.items.length} item(s)</p></div>
              <div className="col-span-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => { const c = store.customers.find((x) => x.id === viewInvoice.customerId); openInvoicePDF(viewInvoice, c, "customer"); }}>
                  <FileText className="h-4 w-4 mr-2" /> View / Print PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Payment Detail Dialog ── */}
      <Dialog open={!!viewPayment} onOpenChange={(o) => !o && setViewPayment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment {viewPayment?.reference}</DialogTitle>
          </DialogHeader>
          {viewPayment && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><span className="text-sm text-muted-foreground">Reference</span><p className="font-medium font-mono">{viewPayment.reference}</p></div>
              <div><span className="text-sm text-muted-foreground">Type</span><p className="font-medium">{viewPayment.type === "RECEIVED" ? "Received" : "Sent"}</p></div>
              <div><span className="text-sm text-muted-foreground">Party</span><p className="font-medium">{viewPayment.customerId ? customerName(viewPayment.customerId) : viewPayment.vendorId ? vendorName(viewPayment.vendorId) : "—"}</p></div>
              <div><span className="text-sm text-muted-foreground">Amount</span><p className="font-semibold text-lg">{egp(viewPayment.amount)}</p></div>
              <div><span className="text-sm text-muted-foreground">Currency</span><p className="font-medium">{viewPayment.currency}</p></div>
              <div><span className="text-sm text-muted-foreground">Method</span><p className="font-medium">{methodLabels[viewPayment.method] ?? viewPayment.method}</p></div>
              <div><span className="text-sm text-muted-foreground">Date</span><p className="font-medium">{viewPayment.date}</p></div>
              <div><span className="text-sm text-muted-foreground">Bank Account</span><p className="font-medium">{viewPayment.bankAccountId ? store.bankAccounts.find(b => b.id === viewPayment.bankAccountId)?.name ?? viewPayment.bankAccountId : "—"}</p></div>
              <div><span className="text-sm text-muted-foreground">Invoice</span><p className="font-medium">{viewPayment.invoiceId ? store.invoices.find(i => i.id === viewPayment.invoiceId)?.number ?? viewPayment.invoiceId : "—"}</p></div>
              {viewPayment.notes && <div className="col-span-2"><span className="text-sm text-muted-foreground">Notes</span><p className="font-medium">{viewPayment.notes}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Budget Detail Dialog ── */}
      <Dialog open={!!viewBudget} onOpenChange={(o) => !o && setViewBudget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewBudget?.name}</DialogTitle>
          </DialogHeader>
          {viewBudget && (() => {
            const variance = viewBudget.budgeted - viewBudget.actual;
            return (
              <div className="grid grid-cols-2 gap-4 py-4">
                <div><span className="text-sm text-muted-foreground">Budget Name</span><p className="font-medium">{viewBudget.name}</p></div>
                <div><span className="text-sm text-muted-foreground">Fiscal Year</span><p className="font-medium">{viewBudget.fiscalYear}</p></div>
                <div><span className="text-sm text-muted-foreground">Period</span><p className="font-medium">{viewBudget.period}</p></div>
                <div><span className="text-sm text-muted-foreground">Status</span><p><StatusBadge status={viewBudget.status} /></p></div>
                <div><span className="text-sm text-muted-foreground">Budgeted</span><p className="font-medium">{egp(viewBudget.budgeted)}</p></div>
                <div><span className="text-sm text-muted-foreground">Actual</span><p className="font-medium">{egp(viewBudget.actual)}</p></div>
                <div><span className="text-sm text-muted-foreground">Variance</span><p className={`font-semibold ${variance >= 0 ? "text-green-600" : "text-red-600"}`}>{variance >= 0 ? "+" : ""}{egp(variance)}</p></div>
                <div><span className="text-sm text-muted-foreground">GL Account</span><p className="font-medium">{viewBudget.accountId ? glName(viewBudget.accountId) : "—"}</p></div>
                <div><span className="text-sm text-muted-foreground">Cost Center</span><p className="font-medium">{viewBudget.costCenterId ? ccName(viewBudget.costCenterId) : "—"}</p></div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
