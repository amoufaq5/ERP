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
import { useDataStore, type Invoice, type Payment } from "@/lib/data-store";
import {
  DollarSign, TrendingUp, TrendingDown, FileText,
  Plus, CreditCard, BookOpen, Landmark, Download,
} from "lucide-react";
import { downloadCSV } from "@/lib/download";

const egp = (n: number) => `EGP ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Tab = "overview" | "invoices" | "payments" | "bank" | "vendors";

export default function FinancePage() {
  const store = useDataStore();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [filters, setFilters] = useState<FilterState>({ _search: "", status: "", type: "", method: "" });

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

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
  ];

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
        <nav className="flex gap-1 -mb-px overflow-x-auto">
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
    </div>
  );
}
