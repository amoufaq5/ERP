"use client";

import { useState } from "react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import StatusBadge from "@/components/shared/status-badge";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import { Button } from "@/components/ui/button";
import type { Column } from "@/components/shared/data-table";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Plus,
  CreditCard,
  BookOpen,
} from "lucide-react";

type Invoice = { id: string; number: string; customer: string; amount: number; dueDate: string; status: string; issuedDate: string };
type Bill = { id: string; number: string; vendor: string; amount: number; dueDate: string; status: string; category: string };
type Payment = { id: string; reference: string; party: string; amount: number; date: string; method: string; type: string };
type FinAccount = { id: string; code: string; name: string; type: string; balance: number; currency: string };

const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const initialInvoices: Invoice[] = [
  { id: "1", number: "INV-001", customer: "Acme Corp", amount: 12500, dueDate: "2026-04-15", status: "Sent", issuedDate: "2026-03-15" },
  { id: "2", number: "INV-002", customer: "Globex Inc", amount: 8750, dueDate: "2026-03-01", status: "Overdue", issuedDate: "2026-02-01" },
  { id: "3", number: "INV-003", customer: "Initech LLC", amount: 3200, dueDate: "2026-02-28", status: "Paid", issuedDate: "2026-01-28" },
  { id: "4", number: "INV-004", customer: "Umbrella Co", amount: 21000, dueDate: "2026-04-30", status: "Draft", issuedDate: "2026-03-20" },
  { id: "5", number: "INV-005", customer: "Stark Industries", amount: 15600, dueDate: "2026-03-20", status: "Paid", issuedDate: "2026-02-20" },
  { id: "6", number: "INV-006", customer: "Wayne Enterprises", amount: 9400, dueDate: "2026-04-10", status: "Sent", issuedDate: "2026-03-10" },
];

const initialBills: Bill[] = [
  { id: "1", number: "BILL-001", vendor: "Office Depot", amount: 1250, dueDate: "2026-04-05", status: "Pending", category: "Office Supplies" },
  { id: "2", number: "BILL-002", vendor: "AWS", amount: 3800, dueDate: "2026-04-01", status: "Paid", category: "Cloud Services" },
  { id: "3", number: "BILL-003", vendor: "Comcast Business", amount: 420, dueDate: "2026-03-28", status: "Overdue", category: "Utilities" },
  { id: "4", number: "BILL-004", vendor: "Delta Airlines", amount: 5600, dueDate: "2026-04-15", status: "Pending", category: "Travel" },
  { id: "5", number: "BILL-005", vendor: "WeWork", amount: 8500, dueDate: "2026-04-01", status: "Paid", category: "Rent" },
];

const initialPayments: Payment[] = [
  { id: "1", reference: "PAY-001", party: "Acme Corp", amount: 15600, date: "2026-03-18", method: "Bank Transfer", type: "Received" },
  { id: "2", reference: "PAY-002", party: "AWS", amount: 3800, date: "2026-03-25", method: "Credit Card", type: "Sent" },
  { id: "3", reference: "PAY-003", party: "Initech LLC", amount: 3200, date: "2026-03-10", method: "Check", type: "Received" },
  { id: "4", reference: "PAY-004", party: "WeWork", amount: 8500, date: "2026-03-01", method: "Bank Transfer", type: "Sent" },
];

const initialAccounts: FinAccount[] = [
  { id: "1", code: "1000", name: "Cash & Cash Equivalents", type: "Asset", balance: 248000, currency: "USD" },
  { id: "2", code: "1200", name: "Accounts Receivable", type: "Asset", balance: 45950, currency: "USD" },
  { id: "3", code: "1500", name: "Inventory", type: "Asset", balance: 89300, currency: "USD" },
  { id: "4", code: "2000", name: "Accounts Payable", type: "Liability", balance: 19570, currency: "USD" },
  { id: "5", code: "2500", name: "Short-term Debt", type: "Liability", balance: 50000, currency: "USD" },
  { id: "6", code: "3000", name: "Owner Equity", type: "Equity", balance: 313680, currency: "USD" },
  { id: "7", code: "4000", name: "Revenue", type: "Income", balance: 187500, currency: "USD" },
  { id: "8", code: "5000", name: "Operating Expenses", type: "Expense", balance: 62400, currency: "USD" },
];

const INVOICE_FIELDS: EntityField[] = [
  { name: "number", label: "Invoice Number", type: "text", placeholder: "INV-007" },
  { name: "customer", label: "Customer", type: "text", placeholder: "Customer name", required: true },
  { name: "amount", label: "Amount ($)", type: "number", placeholder: "0.00", required: true },
  { name: "dueDate", label: "Due Date", type: "text", placeholder: "YYYY-MM-DD" },
  { name: "status", label: "Status", type: "select", defaultValue: "Draft", options: [
    { label: "Draft", value: "Draft" }, { label: "Sent", value: "Sent" },
    { label: "Paid", value: "Paid" }, { label: "Overdue", value: "Overdue" },
  ]},
];

const BILL_FIELDS: EntityField[] = [
  { name: "number", label: "Bill Number", type: "text", placeholder: "BILL-006" },
  { name: "vendor", label: "Vendor", type: "text", placeholder: "Vendor name", required: true },
  { name: "category", label: "Category", type: "text", placeholder: "e.g. Office Supplies" },
  { name: "amount", label: "Amount ($)", type: "number", placeholder: "0.00", required: true },
  { name: "dueDate", label: "Due Date", type: "text", placeholder: "YYYY-MM-DD" },
  { name: "status", label: "Status", type: "select", defaultValue: "Pending", options: [
    { label: "Pending", value: "Pending" }, { label: "Paid", value: "Paid" }, { label: "Overdue", value: "Overdue" },
  ]},
];

const PAYMENT_FIELDS: EntityField[] = [
  { name: "reference", label: "Reference", type: "text", placeholder: "PAY-005" },
  { name: "party", label: "Party", type: "text", placeholder: "Customer or vendor name", required: true },
  { name: "amount", label: "Amount ($)", type: "number", placeholder: "0.00", required: true },
  { name: "date", label: "Date", type: "text", placeholder: "YYYY-MM-DD" },
  { name: "method", label: "Method", type: "select", defaultValue: "Bank Transfer", options: [
    { label: "Bank Transfer", value: "Bank Transfer" }, { label: "Credit Card", value: "Credit Card" },
    { label: "Check", value: "Check" }, { label: "Cash", value: "Cash" },
  ]},
  { name: "type", label: "Type", type: "select", defaultValue: "Received", options: [
    { label: "Received", value: "Received" }, { label: "Sent", value: "Sent" },
  ]},
];

const ACCOUNT_FIELDS: EntityField[] = [
  { name: "code", label: "Account Code", type: "text", placeholder: "e.g. 1100", required: true },
  { name: "name", label: "Account Name", type: "text", placeholder: "e.g. Petty Cash", required: true, fullWidth: true },
  { name: "type", label: "Type", type: "select", defaultValue: "Asset", options: [
    { label: "Asset", value: "Asset" }, { label: "Liability", value: "Liability" },
    { label: "Equity", value: "Equity" }, { label: "Income", value: "Income" }, { label: "Expense", value: "Expense" },
  ]},
  { name: "balance", label: "Opening Balance ($)", type: "number", placeholder: "0.00" },
];

const INVOICE_FILTER_FIELDS = [
  { key: "status", label: "Status", type: "select" as const, options: [
    { label: "Draft", value: "Draft" }, { label: "Sent", value: "Sent" },
    { label: "Paid", value: "Paid" }, { label: "Overdue", value: "Overdue" },
  ]},
];

const BILL_FILTER_FIELDS = [
  { key: "status", label: "Status", type: "select" as const, options: [
    { label: "Pending", value: "Pending" }, { label: "Paid", value: "Paid" }, { label: "Overdue", value: "Overdue" },
  ]},
];

const PAYMENT_FILTER_FIELDS = [
  { key: "type", label: "Type", type: "select" as const, options: [
    { label: "Received", value: "Received" }, { label: "Sent", value: "Sent" },
  ]},
  { key: "method", label: "Method", type: "select" as const, options: [
    { label: "Bank Transfer", value: "Bank Transfer" }, { label: "Credit Card", value: "Credit Card" },
    { label: "Check", value: "Check" }, { label: "Cash", value: "Cash" },
  ]},
];

const ACCOUNT_FILTER_FIELDS = [
  { key: "acctType", label: "Type", type: "select" as const, options: [
    { label: "Asset", value: "Asset" }, { label: "Liability", value: "Liability" },
    { label: "Equity", value: "Equity" }, { label: "Income", value: "Income" }, { label: "Expense", value: "Expense" },
  ]},
];

type Tab = "overview" | "invoices" | "bills" | "payments" | "accounts";

const invoiceFlow: Record<string, string> = { Draft: "Sent", Sent: "Paid", Overdue: "Paid" };
const billFlow: Record<string, string> = { Pending: "Paid", Overdue: "Paid" };

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [bills, setBills] = useState<Bill[]>(initialBills);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [accounts, setAccounts] = useState<FinAccount[]>(initialAccounts);

  const [filters, setFilters] = useState<FilterState>({ _search: "", status: "", type: "", method: "", acctType: "" });

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinAccount | null>(null);

  const totalRevenue = invoices.filter((i) => i.status === "Paid").reduce((s, i) => s + i.amount, 0);
  const totalExpenses = bills.filter((b) => b.status === "Paid").reduce((s, b) => s + b.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const outstandingInvoices = invoices.filter((i) => i.status === "Sent" || i.status === "Overdue").reduce((s, i) => s + i.amount, 0);

  const filteredInvoices = invoices.filter((i) => {
    const q = (filters._search || "").toLowerCase();
    const matchesSearch = !q || i.number.toLowerCase().includes(q) || i.customer.toLowerCase().includes(q);
    const matchesStatus = !filters.status || i.status === filters.status;
    return matchesSearch && matchesStatus;
  });

  const filteredBills = bills.filter((b) => {
    const q = (filters._search || "").toLowerCase();
    const matchesSearch = !q || b.number.toLowerCase().includes(q) || b.vendor.toLowerCase().includes(q);
    const matchesStatus = !filters.status || b.status === filters.status;
    return matchesSearch && matchesStatus;
  });

  const filteredPayments = payments.filter((p) => {
    const q = (filters._search || "").toLowerCase();
    const matchesSearch = !q || p.reference.toLowerCase().includes(q) || p.party.toLowerCase().includes(q);
    const matchesType = !filters.type || p.type === filters.type;
    const matchesMethod = !filters.method || p.method === filters.method;
    return matchesSearch && matchesType && matchesMethod;
  });

  const filteredAccounts = accounts.filter((a) => {
    const q = (filters._search || "").toLowerCase();
    const matchesSearch = !q || a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
    const matchesType = !filters.acctType || a.type === filters.acctType;
    return matchesSearch && matchesType;
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "invoices", label: "Invoices" },
    { key: "bills", label: "Bills" },
    { key: "payments", label: "Payments" },
    { key: "accounts", label: "Chart of Accounts" },
  ];

  const invoiceColumns: Column<Record<string, unknown>>[] = [
    { key: "number", label: "Invoice #" },
    { key: "customer", label: "Customer" },
    { key: "issuedDate", label: "Issued" },
    { key: "dueDate", label: "Due Date" },
    { key: "amount", label: "Amount", render: (v) => fmt(v as number) },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
    {
      key: "id", label: "",
      render: (_v, row) => {
        const inv = invoices.find((x) => x.id === row.id);
        if (!inv) return null;
        const next = invoiceFlow[inv.status];
        return (
          <EditDeleteMenu
            onEdit={() => { setEditingInvoice(inv); setShowInvoiceModal(true); }}
            onDelete={() => setInvoices((prev) => prev.filter((x) => x.id !== inv.id))}
            itemLabel={inv.number}
            extraItems={[
              ...(next ? [{ label: `Mark ${next}`, onClick: () => setInvoices((prev) => prev.map((x) => x.id === inv.id ? { ...x, status: next } : x)) }] : []),
              ...(inv.status === "Sent" || inv.status === "Draft" ? [{ label: "Mark Overdue", onClick: () => setInvoices((prev) => prev.map((x) => x.id === inv.id ? { ...x, status: "Overdue" } : x)) }] : []),
            ]}
          />
        );
      },
    },
  ];

  const billColumns: Column<Record<string, unknown>>[] = [
    { key: "number", label: "Bill #" },
    { key: "vendor", label: "Vendor" },
    { key: "category", label: "Category" },
    { key: "dueDate", label: "Due Date" },
    { key: "amount", label: "Amount", render: (v) => fmt(v as number) },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
    {
      key: "id", label: "",
      render: (_v, row) => {
        const b = bills.find((x) => x.id === row.id);
        if (!b) return null;
        const next = billFlow[b.status];
        return (
          <EditDeleteMenu
            onEdit={() => { setEditingBill(b); setShowBillModal(true); }}
            onDelete={() => setBills((prev) => prev.filter((x) => x.id !== b.id))}
            itemLabel={b.number}
            extraItems={[
              ...(next ? [{ label: `Mark ${next}`, onClick: () => setBills((prev) => prev.map((x) => x.id === b.id ? { ...x, status: next } : x)) }] : []),
              ...(b.status === "Pending" ? [{ label: "Mark Overdue", onClick: () => setBills((prev) => prev.map((x) => x.id === b.id ? { ...x, status: "Overdue" } : x)) }] : []),
            ]}
          />
        );
      },
    },
  ];

  const paymentColumns: Column<Record<string, unknown>>[] = [
    { key: "reference", label: "Reference" },
    { key: "party", label: "Party" },
    { key: "date", label: "Date" },
    { key: "method", label: "Method" },
    { key: "type", label: "Type", render: (v) => (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(v as string) === "Received" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
        {v as string}
      </span>
    )},
    { key: "amount", label: "Amount", render: (v) => fmt(v as number) },
    {
      key: "id", label: "",
      render: (_v, row) => {
        const p = payments.find((x) => x.id === row.id);
        if (!p) return null;
        return (
          <EditDeleteMenu
            onEdit={() => { setEditingPayment(p); setShowPaymentModal(true); }}
            onDelete={() => setPayments((prev) => prev.filter((x) => x.id !== p.id))}
            itemLabel={p.reference}
          />
        );
      },
    },
  ];

  const accountColumns: Column<Record<string, unknown>>[] = [
    { key: "code", label: "Code" },
    { key: "name", label: "Account Name" },
    { key: "type", label: "Type" },
    { key: "currency", label: "Currency" },
    { key: "balance", label: "Balance", render: (v) => fmt(v as number) },
    {
      key: "id", label: "",
      render: (_v, row) => {
        const a = accounts.find((x) => x.id === row.id);
        if (!a) return null;
        return (
          <EditDeleteMenu
            onEdit={() => { setEditingAccount(a); setShowAccountModal(true); }}
            onDelete={() => setAccounts((prev) => prev.filter((x) => x.id !== a.id))}
            itemLabel={a.name}
          />
        );
      },
    },
  ];

  const recentTransactions = [
    ...invoices.slice(0, 3).map((i) => ({ label: `Invoice ${i.number} — ${i.customer}`, amount: i.amount, type: "Income", status: i.status })),
    ...bills.slice(0, 3).map((b) => ({ label: `Bill ${b.number} — ${b.vendor}`, amount: b.amount, type: "Expense", status: b.status })),
  ].sort(() => Math.random() - 0.5).slice(0, 6);

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Finance" description="Manage invoices, bills, payments, and accounts">
        {activeTab === "invoices" && (
          <Button onClick={() => { setEditingInvoice(null); setShowInvoiceModal(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> New Invoice
          </Button>
        )}
        {activeTab === "bills" && (
          <Button onClick={() => { setEditingBill(null); setShowBillModal(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> New Bill
          </Button>
        )}
        {activeTab === "payments" && (
          <Button onClick={() => { setEditingPayment(null); setShowPaymentModal(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> New Payment
          </Button>
        )}
        {activeTab === "accounts" && (
          <Button onClick={() => { setEditingAccount(null); setShowAccountModal(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> New Account
          </Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Revenue" value={fmt(totalRevenue)} subtitle="From paid invoices" icon={<TrendingUp className="h-5 w-5" />} trend={{ value: 12.5, label: "vs last month" }} />
        <StatsCard title="Total Expenses" value={fmt(totalExpenses)} subtitle="From paid bills" icon={<TrendingDown className="h-5 w-5" />} trend={{ value: -3.2, label: "vs last month" }} />
        <StatsCard title="Net Profit" value={fmt(netProfit)} subtitle="Revenue minus expenses" icon={<DollarSign className="h-5 w-5" />} trend={{ value: 8.1, label: "vs last month" }} />
        <StatsCard title="Outstanding Invoices" value={fmt(outstandingInvoices)} subtitle="Sent & overdue invoices" icon={<FileText className="h-5 w-5" />} />
      </div>

      <div className="border-b border-border">
        <nav className="flex gap-1 -mb-px">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
          <div className="rounded-lg border border-border divide-y divide-border">
            {recentTransactions.map((tx, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${tx.type === "Income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {tx.type === "Income" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tx.label}</p>
                    <p className="text-xs text-muted-foreground">{tx.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={tx.status} />
                  <span className={`text-sm font-semibold ${tx.type === "Income" ? "text-green-700" : "text-red-600"}`}>
                    {tx.type === "Income" ? "+" : "-"}{fmt(tx.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Invoice Summary</h3>
              {["Paid", "Sent", "Overdue", "Draft"].map((status) => {
                const count = invoices.filter((i) => i.status === status).length;
                const total = invoices.filter((i) => i.status === status).reduce((s, i) => s + i.amount, 0);
                return (
                  <div key={status} className="flex justify-between items-center py-1.5 text-sm">
                    <StatusBadge status={status} />
                    <span className="text-muted-foreground">{count} invoice{count !== 1 ? "s" : ""} — {fmt(total)}</span>
                  </div>
                );
              })}
            </div>
            <div className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Account Balances</h3>
              {accounts.slice(0, 5).map((acc) => (
                <div key={acc.id} className="flex justify-between items-center py-1.5 text-sm">
                  <span className="text-muted-foreground">{acc.code} — {acc.name}</span>
                  <span className="font-medium">{fmt(acc.balance)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "invoices" && (
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="p-4 border-b border-border">
            <FilterBar
              searchValue={filters._search}
              onSearchChange={(v) => setFilters((f) => ({ ...f, _search: v }))}
              fields={INVOICE_FILTER_FIELDS}
              values={filters}
              onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
            />
          </div>
          <DataTable columns={invoiceColumns} data={filteredInvoices as unknown as Record<string, unknown>[]} emptyMessage="No invoices found." />
        </div>
      )}

      {activeTab === "bills" && (
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="p-4 border-b border-border">
            <FilterBar
              searchValue={filters._search}
              onSearchChange={(v) => setFilters((f) => ({ ...f, _search: v }))}
              fields={BILL_FILTER_FIELDS}
              values={filters}
              onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
            />
          </div>
          <DataTable columns={billColumns} data={filteredBills as unknown as Record<string, unknown>[]} emptyMessage="No bills found." />
        </div>
      )}

      {activeTab === "payments" && (
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="p-4 border-b border-border">
            <FilterBar
              searchValue={filters._search}
              onSearchChange={(v) => setFilters((f) => ({ ...f, _search: v }))}
              fields={PAYMENT_FILTER_FIELDS}
              values={filters}
              onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
            />
          </div>
          <DataTable columns={paymentColumns} data={filteredPayments as unknown as Record<string, unknown>[]} emptyMessage="No payments found." />
        </div>
      )}

      {activeTab === "accounts" && (
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="p-4 border-b border-border">
            <FilterBar
              searchValue={filters._search}
              onSearchChange={(v) => setFilters((f) => ({ ...f, _search: v }))}
              fields={ACCOUNT_FILTER_FIELDS}
              values={filters}
              onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
            />
          </div>
          <DataTable columns={accountColumns} data={filteredAccounts as unknown as Record<string, unknown>[]} emptyMessage="No accounts found." />
        </div>
      )}

      <EntityFormModal
        open={showInvoiceModal}
        onOpenChange={(open) => { if (!open) { setShowInvoiceModal(false); setEditingInvoice(null); } }}
        title={editingInvoice ? "Edit Invoice" : "New Invoice"}
        fields={INVOICE_FIELDS}
        initialData={editingInvoice ? { number: editingInvoice.number, customer: editingInvoice.customer, amount: editingInvoice.amount, dueDate: editingInvoice.dueDate, status: editingInvoice.status } : undefined}
        onSubmit={(data) => {
          if (editingInvoice) {
            setInvoices((prev) => prev.map((i) => i.id === editingInvoice.id ? {
              ...i,
              number: (data.number as string) || i.number,
              customer: (data.customer as string) || i.customer,
              amount: (data.amount as number) || i.amount,
              dueDate: (data.dueDate as string) || i.dueDate,
              status: (data.status as string) || i.status,
            } : i));
          } else {
            const inv: Invoice = {
              id: String(Date.now()),
              number: (data.number as string) || `INV-${String(invoices.length + 1).padStart(3, "0")}`,
              customer: data.customer as string,
              amount: (data.amount as number) || 0,
              dueDate: (data.dueDate as string) || "2026-05-01",
              status: (data.status as string) || "Draft",
              issuedDate: new Date().toISOString().slice(0, 10),
            };
            setInvoices((prev) => [inv, ...prev]);
          }
          setShowInvoiceModal(false);
          setEditingInvoice(null);
        }}
      />

      <EntityFormModal
        open={showBillModal}
        onOpenChange={(open) => { if (!open) { setShowBillModal(false); setEditingBill(null); } }}
        title={editingBill ? "Edit Bill" : "New Bill"}
        fields={BILL_FIELDS}
        initialData={editingBill ? { number: editingBill.number, vendor: editingBill.vendor, category: editingBill.category, amount: editingBill.amount, dueDate: editingBill.dueDate, status: editingBill.status } : undefined}
        onSubmit={(data) => {
          if (editingBill) {
            setBills((prev) => prev.map((b) => b.id === editingBill.id ? {
              ...b,
              number: (data.number as string) || b.number,
              vendor: (data.vendor as string) || b.vendor,
              category: (data.category as string) || b.category,
              amount: (data.amount as number) || b.amount,
              dueDate: (data.dueDate as string) || b.dueDate,
              status: (data.status as string) || b.status,
            } : b));
          } else {
            const bill: Bill = {
              id: String(Date.now()),
              number: (data.number as string) || `BILL-${String(bills.length + 1).padStart(3, "0")}`,
              vendor: data.vendor as string,
              amount: (data.amount as number) || 0,
              dueDate: (data.dueDate as string) || "2026-05-01",
              status: (data.status as string) || "Pending",
              category: (data.category as string) || "General",
            };
            setBills((prev) => [bill, ...prev]);
          }
          setShowBillModal(false);
          setEditingBill(null);
        }}
      />

      <EntityFormModal
        open={showPaymentModal}
        onOpenChange={(open) => { if (!open) { setShowPaymentModal(false); setEditingPayment(null); } }}
        title={editingPayment ? "Edit Payment" : "New Payment"}
        fields={PAYMENT_FIELDS}
        initialData={editingPayment ? { reference: editingPayment.reference, party: editingPayment.party, amount: editingPayment.amount, date: editingPayment.date, method: editingPayment.method, type: editingPayment.type } : undefined}
        onSubmit={(data) => {
          if (editingPayment) {
            setPayments((prev) => prev.map((p) => p.id === editingPayment.id ? {
              ...p,
              reference: (data.reference as string) || p.reference,
              party: (data.party as string) || p.party,
              amount: (data.amount as number) || p.amount,
              date: (data.date as string) || p.date,
              method: (data.method as string) || p.method,
              type: (data.type as string) || p.type,
            } : p));
          } else {
            const pay: Payment = {
              id: String(Date.now()),
              reference: (data.reference as string) || `PAY-${String(payments.length + 1).padStart(3, "0")}`,
              party: data.party as string,
              amount: (data.amount as number) || 0,
              date: (data.date as string) || new Date().toISOString().slice(0, 10),
              method: (data.method as string) || "Bank Transfer",
              type: (data.type as string) || "Received",
            };
            setPayments((prev) => [pay, ...prev]);
          }
          setShowPaymentModal(false);
          setEditingPayment(null);
        }}
      />

      <EntityFormModal
        open={showAccountModal}
        onOpenChange={(open) => { if (!open) { setShowAccountModal(false); setEditingAccount(null); } }}
        title={editingAccount ? "Edit Account" : "New Account"}
        fields={ACCOUNT_FIELDS}
        initialData={editingAccount ? { code: editingAccount.code, name: editingAccount.name, type: editingAccount.type, balance: editingAccount.balance } : undefined}
        onSubmit={(data) => {
          if (editingAccount) {
            setAccounts((prev) => prev.map((a) => a.id === editingAccount.id ? {
              ...a,
              code: (data.code as string) || a.code,
              name: (data.name as string) || a.name,
              type: (data.type as string) || a.type,
              balance: (data.balance as number) ?? a.balance,
            } : a));
          } else {
            const acc: FinAccount = {
              id: String(Date.now()),
              code: data.code as string,
              name: data.name as string,
              type: (data.type as string) || "Asset",
              balance: (data.balance as number) || 0,
              currency: "USD",
            };
            setAccounts((prev) => [...prev, acc]);
          }
          setShowAccountModal(false);
          setEditingAccount(null);
        }}
      />
    </div>
  );
}
