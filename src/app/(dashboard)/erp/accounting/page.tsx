"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import {
  EntityFormModal,
  type EntityField,
  type EntityFormData,
} from "@/components/shared/entity-form-modal";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import {
  useDataStore,
  type Customer,
  type Vendor,
  type Cheque,
  type Invoice,
  type BankAccount,
} from "@/lib/data-store";
import {
  Users,
  Building2,
  FileText,
  CreditCard,
  Plus,
  Download,
  Landmark,
  ScrollText,
} from "lucide-react";
import { downloadCSV, downloadHTML, buildPrintableReport } from "@/lib/download";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AccountingPage() {
  const store = useDataStore();
  const [custSearch, setCustSearch] = useState("");
  const [custFilters, setCustFilters] = useState<FilterState>({});
  const [vendSearch, setVendSearch] = useState("");
  const [chequeSearch, setChequeSearch] = useState("");
  const [chequeFilters, setChequeFilters] = useState<FilterState>({});
  const [invSearch, setInvSearch] = useState("");

  const [custFormOpen, setCustFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [vendFormOpen, setVendFormOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [chequeFormOpen, setChequeFormOpen] = useState(false);
  const [editingCheque, setEditingCheque] = useState<Cheque | null>(null);
  const [invFormOpen, setInvFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [bankFormOpen, setBankFormOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [statementParty, setStatementParty] = useState<{ type: "customer" | "vendor"; id: string } | null>(null);

  // ─── Computed ──────────────────────────────────────────────────────────
  const totalAR = store.customers.reduce((s, c) => s + c.outstanding, 0);
  const totalAP = store.vendors.reduce((s, v) => s + v.outstanding, 0);
  const pendingCheques = store.cheques.filter((c) => c.status === "PENDING").length;
  const invoiceTotal = store.invoices.reduce((s, i) => s + i.total, 0);
  const totalBankBalance = store.bankAccounts.reduce((s, b) => s + b.balance, 0);

  // Filters
  const filteredCustomers = useMemo(() => {
    return store.customers.filter((c) => {
      if (custSearch) {
        const q = custSearch.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.code.toLowerCase().includes(q)) return false;
      }
      if (custFilters.status && c.status !== custFilters.status) return false;
      if (custFilters.type && c.type !== custFilters.type) return false;
      return true;
    });
  }, [store.customers, custSearch, custFilters]);

  const filteredVendors = useMemo(() => {
    return store.vendors.filter((v) => {
      if (vendSearch) {
        const q = vendSearch.toLowerCase();
        if (!v.name.toLowerCase().includes(q) && !v.code.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [store.vendors, vendSearch]);

  const filteredCheques = useMemo(() => {
    return store.cheques.filter((c) => {
      if (chequeSearch) {
        const q = chequeSearch.toLowerCase();
        if (!c.partyName.toLowerCase().includes(q) && !c.number.toLowerCase().includes(q)) return false;
      }
      if (chequeFilters.type && c.type !== chequeFilters.type) return false;
      if (chequeFilters.status && c.status !== chequeFilters.status) return false;
      return true;
    });
  }, [store.cheques, chequeSearch, chequeFilters]);

  const filteredInvoices = useMemo(() => {
    return store.invoices.filter((i) => {
      if (invSearch) {
        const q = invSearch.toLowerCase();
        const cust = store.customers.find((c) => c.id === i.customerId);
        if (!i.number.toLowerCase().includes(q) && !(cust?.name.toLowerCase().includes(q) ?? false)) return false;
      }
      return true;
    });
  }, [store.invoices, invSearch, store.customers]);

  // ─── Customer CRUD ─────────────────────────────────────────────────────
  const customerFields: EntityField[] = [
    { name: "code", label: "Code", type: "text", required: true, placeholder: "CUST-XXXX" },
    { name: "name", label: "Name", type: "text", required: true },
    { name: "type", label: "Type", type: "select", required: true, options: ["Pharmacy Chain", "Hospital", "Distributor", "Government"].map((t) => ({ label: t, value: t })) },
    { name: "phone", label: "Phone", type: "tel", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "address", label: "Address", type: "text", required: true },
    { name: "city", label: "City", type: "text" },
    { name: "creditLimit", label: "Credit Limit (EGP)", type: "number", required: true },
    { name: "outstanding", label: "Outstanding (EGP)", type: "number", defaultValue: 0 },
    { name: "currency", label: "Currency", type: "select", defaultValue: "EGP", options: [{ label: "EGP", value: "EGP" }, { label: "USD", value: "USD" }] },
    { name: "paymentTerms", label: "Payment Terms", type: "select", options: ["Net 30", "Net 45", "Net 60", "Net 90", "Net 120"].map((t) => ({ label: t, value: t })) },
    { name: "status", label: "Status", type: "select", defaultValue: "ACTIVE", options: [{ label: "Active", value: "ACTIVE" }, { label: "On Hold", value: "HOLD" }, { label: "Blocked", value: "BLOCKED" }] },
  ];

  function handleCustomerSubmit(data: EntityFormData) {
    const payload = {
      code: String(data.code),
      name: String(data.name),
      type: String(data.type),
      phone: String(data.phone),
      email: String(data.email),
      address: String(data.address),
      city: data.city ? String(data.city) : undefined,
      creditLimit: Number(data.creditLimit),
      outstanding: Number(data.outstanding ?? 0),
      currency: String(data.currency || "EGP"),
      paymentTerms: String(data.paymentTerms || "Net 30"),
      status: String(data.status) as Customer["status"],
    };
    if (editingCustomer) {
      store.update("customers", editingCustomer.id, payload);
    } else {
      store.add("customers", { id: store.genId("c"), ...payload, createdAt: new Date().toISOString() });
    }
    setCustFormOpen(false);
    setEditingCustomer(null);
  }

  // ─── Vendor CRUD ───────────────────────────────────────────────────────
  const vendorFields: EntityField[] = [
    { name: "code", label: "Code", type: "text", required: true },
    { name: "name", label: "Name", type: "text", required: true },
    { name: "category", label: "Category", type: "select", required: true, options: ["API Supplier", "Excipients", "Primary Packaging", "Lab Reagents", "Equipment", "Services"].map((t) => ({ label: t, value: t })) },
    { name: "phone", label: "Phone", type: "tel", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "address", label: "Address", type: "text", required: true },
    { name: "outstanding", label: "Outstanding (EGP)", type: "number", defaultValue: 0 },
    { name: "paymentTerms", label: "Payment Terms", type: "select", options: ["Net 30", "Net 45", "Net 60"].map((t) => ({ label: t, value: t })) },
    { name: "gmpCertified", label: "GMP Certified", type: "checkbox", defaultValue: false },
  ];

  function handleVendorSubmit(data: EntityFormData) {
    const payload = {
      code: String(data.code),
      name: String(data.name),
      category: String(data.category),
      phone: String(data.phone),
      email: String(data.email),
      address: String(data.address),
      outstanding: Number(data.outstanding ?? 0),
      paymentTerms: String(data.paymentTerms || "Net 30"),
      gmpCertified: !!data.gmpCertified,
    };
    if (editingVendor) {
      store.update("vendors", editingVendor.id, payload);
    } else {
      store.add("vendors", { id: store.genId("ve"), ...payload, createdAt: new Date().toISOString() });
    }
    setVendFormOpen(false);
    setEditingVendor(null);
  }

  // ─── Cheque CRUD ───────────────────────────────────────────────────────
  const chequeFields: EntityField[] = [
    { name: "number", label: "Cheque Number", type: "text", required: true },
    { name: "bankName", label: "Bank", type: "text", required: true },
    { name: "type", label: "Direction", type: "select", required: true, options: [{ label: "Incoming", value: "INCOMING" }, { label: "Outgoing", value: "OUTGOING" }] },
    { name: "partyName", label: "Party Name", type: "text", required: true },
    { name: "amount", label: "Amount (EGP)", type: "number", required: true },
    { name: "currency", label: "Currency", type: "select", defaultValue: "EGP", options: [{ label: "EGP", value: "EGP" }, { label: "USD", value: "USD" }] },
    { name: "issueDate", label: "Issue Date", type: "date", required: true },
    { name: "dueDate", label: "Due Date", type: "date", required: true },
    { name: "status", label: "Status", type: "select", defaultValue: "PENDING", options: [{ label: "Pending", value: "PENDING" }, { label: "Deposited", value: "DEPOSITED" }, { label: "Cleared", value: "CLEARED" }, { label: "Bounced", value: "BOUNCED" }, { label: "Cancelled", value: "CANCELLED" }] },
    { name: "notes", label: "Notes", type: "textarea", fullWidth: true },
  ];

  function handleChequeSubmit(data: EntityFormData) {
    const payload = {
      number: String(data.number),
      bankName: String(data.bankName),
      type: String(data.type) as Cheque["type"],
      partyName: String(data.partyName),
      amount: Number(data.amount),
      currency: String(data.currency || "EGP"),
      issueDate: String(data.issueDate),
      dueDate: String(data.dueDate),
      status: String(data.status) as Cheque["status"],
      notes: data.notes ? String(data.notes) : undefined,
    };
    if (editingCheque) {
      store.update("cheques", editingCheque.id, payload);
    } else {
      store.add("cheques", { id: store.genId("ch"), ...payload });
    }
    setChequeFormOpen(false);
    setEditingCheque(null);
  }

  // ─── Invoice CRUD ──────────────────────────────────────────────────────
  const invoiceFields: EntityField[] = [
    { name: "number", label: "Invoice Number", type: "text", required: true },
    { name: "customerId", label: "Customer", type: "select", required: true, options: store.customers.map((c) => ({ label: c.name, value: c.id })) },
    { name: "date", label: "Invoice Date", type: "date", required: true },
    { name: "dueDate", label: "Due Date", type: "date", required: true },
    { name: "productId", label: "Product", type: "select", options: store.products.map((p) => ({ label: `${p.name} ${p.strength} (${p.code})`, value: p.id })), helperText: "Select a product to auto-fill a line item" },
    { name: "quantity", label: "Item Quantity", type: "number", defaultValue: 1, helperText: "Quantity for the selected product" },
    { name: "unitPrice", label: "Unit Price (EGP)", type: "number", helperText: "Auto-filled from product catalog" },
    { name: "subtotal", label: "Subtotal (EGP)", type: "number", required: true },
    { name: "tax", label: "Tax (EGP)", type: "number", required: true },
    { name: "total", label: "Total (EGP)", type: "number", required: true },
    { name: "status", label: "Status", type: "select", defaultValue: "DRAFT", options: [{ label: "Draft", value: "DRAFT" }, { label: "Sent", value: "SENT" }, { label: "Partial", value: "PARTIAL" }, { label: "Paid", value: "PAID" }, { label: "Overdue", value: "OVERDUE" }, { label: "Void", value: "VOID" }] },
    { name: "notes", label: "Notes", type: "textarea", fullWidth: true },
  ];

  function handleInvoiceSubmit(data: EntityFormData) {
    const qty = Number(data.quantity || 1);
    const up = Number(data.unitPrice || 0);
    const prod = store.products.find((p) => p.id === String(data.productId));
    const items: Invoice["items"] = editingInvoice?.items ?? [];
    if (prod && qty > 0) {
      const lineTotal = qty * up;
      items.push({ productId: prod.id, description: `${prod.name} ${prod.strength} (${prod.form})`, quantity: qty, unitPrice: up, total: lineTotal });
    }
    const payload = {
      number: String(data.number),
      customerId: String(data.customerId),
      date: String(data.date),
      dueDate: String(data.dueDate),
      subtotal: Number(data.subtotal),
      tax: Number(data.tax),
      total: Number(data.total),
      currency: "EGP",
      status: String(data.status) as Invoice["status"],
      items,
      notes: data.notes ? String(data.notes) : undefined,
    };
    if (editingInvoice) {
      store.update("invoices", editingInvoice.id, payload);
    } else {
      store.add("invoices", { id: store.genId("inv"), ...payload });
    }
    setInvFormOpen(false);
    setEditingInvoice(null);
  }

  function exportCustomerCSV() {
    const rows = store.customers.map((c) => ({
      Code: c.code, Name: c.name, Type: c.type, Phone: c.phone, Outstanding: c.outstanding, CreditLimit: c.creditLimit, Status: c.status,
    }));
    downloadCSV("customers.csv", rows);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounting"
        description="Manage customers, vendors, cheques, and invoices."
        actions={
          <Button variant="outline" onClick={exportCustomerCSV}>
            <Download className="h-4 w-4 mr-2" /> Export Customers
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard icon={Landmark} title="Bank Balance" value={`EGP ${(totalBankBalance / 1e6).toFixed(1)}M`} subtitle={`${store.bankAccounts.length} accounts`} iconColor="bg-indigo-100 text-indigo-600" />
        <StatsCard icon={Users} title="Total AR" value={`EGP ${(totalAR / 1e6).toFixed(1)}M`} subtitle={`${store.customers.length} customers`} iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={Building2} title="Total AP" value={`EGP ${(totalAP / 1e6).toFixed(1)}M`} subtitle={`${store.vendors.length} vendors`} iconColor="bg-red-100 text-red-600" />
        <StatsCard icon={CreditCard} title="Pending Cheques" value={pendingCheques} subtitle={`of ${store.cheques.length} total`} iconColor="bg-amber-100 text-amber-600" />
        <StatsCard icon={FileText} title="Invoice Total" value={`EGP ${(invoiceTotal / 1e6).toFixed(1)}M`} subtitle={`${store.invoices.length} invoices`} iconColor="bg-emerald-100 text-emerald-600" />
      </div>

      <Tabs defaultValue="customers">
        <TabsList>
          <TabsTrigger value="customers">Customers ({store.customers.length})</TabsTrigger>
          <TabsTrigger value="vendors">Vendors ({store.vendors.length})</TabsTrigger>
          <TabsTrigger value="cheques">Cheques ({store.cheques.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({store.invoices.length})</TabsTrigger>
          <TabsTrigger value="bank">Bank Accounts ({store.bankAccounts.length})</TabsTrigger>
        </TabsList>

        {/* Customers */}
        <TabsContent value="customers" className="space-y-3">
          <FilterBar
            searchPlaceholder="Search customers..."
            searchValue={custSearch}
            onSearchChange={setCustSearch}
            fields={[
              { key: "status", label: "Status", type: "select", options: [{ label: "Active", value: "ACTIVE" }, { label: "Hold", value: "HOLD" }, { label: "Blocked", value: "BLOCKED" }] },
              { key: "type", label: "Type", type: "select", options: ["Pharmacy Chain", "Hospital", "Distributor", "Government"].map((t) => ({ label: t, value: t })) },
            ]}
            values={custFilters}
            onChange={(k, v) => setCustFilters(f => ({ ...f, [k]: v }))}
            rightSlot={
              <Button size="sm" onClick={() => { setEditingCustomer(null); setCustFormOpen(true); }}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            }
          />
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <DataTable
                columns={[
                  { key: "code", label: "Code", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "name", label: "Name", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "type", label: "Type", render: (v: string) => <span className="text-xs">{v}</span> },
                  { key: "phone", label: "Phone", render: (v: string) => <span className="text-xs">{v}</span> },
                  { key: "creditLimit", label: "Credit Limit", className: "text-right", render: (v: number) => <span className="font-semibold">{v.toLocaleString()}</span> },
                  { key: "outstanding", label: "Outstanding", className: "text-right", render: (v: number) => v.toLocaleString() },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge variant={v === "ACTIVE" ? "success" : v === "HOLD" ? "warning" : "destructive"}>{v}</Badge>
                  ) },
                  { key: "actions", label: "Actions", className: "text-right", render: (_: unknown, row: Record<string, unknown>) => {
                    const c = row as unknown as Customer;
                    return (
                      <EditDeleteMenu
                        onEdit={() => { setEditingCustomer(c); setCustFormOpen(true); }}
                        onDelete={() => store.remove("customers", c.id)}
                        itemLabel={c.name}
                        compact
                        extraItems={[{ label: "View Statement", onClick: () => setStatementParty({ type: "customer", id: c.id }) }]}
                      />
                    );
                  } },
                ] as Column<Record<string, unknown>>[]}
                data={filteredCustomers as unknown as Record<string, unknown>[]}
                pagination={false}
                emptyMessage="No customers found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendors */}
        <TabsContent value="vendors" className="space-y-3">
          <FilterBar
            searchPlaceholder="Search vendors..."
            searchValue={vendSearch}
            onSearchChange={setVendSearch}
            rightSlot={
              <Button size="sm" onClick={() => { setEditingVendor(null); setVendFormOpen(true); }}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            }
          />
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <DataTable
                columns={[
                  { key: "code", label: "Code", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "name", label: "Name", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "category", label: "Category", render: (v: string) => <span className="text-xs">{v}</span> },
                  { key: "email", label: "Contact", render: (v: string) => <span className="text-xs">{v}</span> },
                  { key: "outstanding", label: "Outstanding", className: "text-right", render: (v: number) => v.toLocaleString() },
                  { key: "paymentTerms", label: "Terms", render: (v: string) => <span className="text-xs">{v}</span> },
                  { key: "gmpCertified", label: "GMP", render: (v: boolean) => (
                    <Badge variant={v ? "success" : "secondary"}>{v ? "Yes" : "No"}</Badge>
                  ) },
                  { key: "actions", label: "Actions", className: "text-right", render: (_: unknown, row: Record<string, unknown>) => {
                    const v = row as unknown as Vendor;
                    return (
                      <EditDeleteMenu
                        onEdit={() => { setEditingVendor(v); setVendFormOpen(true); }}
                        onDelete={() => store.remove("vendors", v.id)}
                        itemLabel={v.name}
                        compact
                        extraItems={[{ label: "View Statement", onClick: () => setStatementParty({ type: "vendor", id: v.id }) }]}
                      />
                    );
                  } },
                ] as Column<Record<string, unknown>>[]}
                data={filteredVendors as unknown as Record<string, unknown>[]}
                pagination={false}
                emptyMessage="No vendors found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cheques */}
        <TabsContent value="cheques" className="space-y-3">
          <FilterBar
            searchPlaceholder="Search cheques..."
            searchValue={chequeSearch}
            onSearchChange={setChequeSearch}
            fields={[
              { key: "type", label: "Direction", type: "select", options: [{ label: "Incoming", value: "INCOMING" }, { label: "Outgoing", value: "OUTGOING" }] },
              { key: "status", label: "Status", type: "select", options: [{ label: "Pending", value: "PENDING" }, { label: "Deposited", value: "DEPOSITED" }, { label: "Cleared", value: "CLEARED" }, { label: "Bounced", value: "BOUNCED" }] },
            ]}
            values={chequeFilters}
            onChange={(k, v) => setChequeFilters(f => ({ ...f, [k]: v }))}
            rightSlot={
              <Button size="sm" onClick={() => { setEditingCheque(null); setChequeFormOpen(true); }}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            }
          />
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <DataTable
                columns={[
                  { key: "number", label: "Number", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "bankName", label: "Bank" },
                  { key: "type", label: "Type", render: (v: string) => (
                    <Badge variant={v === "INCOMING" ? "success" : "default"}>{v}</Badge>
                  ) },
                  { key: "partyName", label: "Party", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "amount", label: "Amount", className: "text-right", render: (v: number) => <span className="font-semibold">{v.toLocaleString()}</span> },
                  { key: "issueDate", label: "Issue Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                  { key: "dueDate", label: "Due Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge variant={v === "CLEARED" ? "success" : v === "BOUNCED" ? "destructive" : v === "DEPOSITED" ? "default" : "warning"}>{v}</Badge>
                  ) },
                  { key: "actions", label: "Actions", className: "text-right", render: (_: unknown, row: Record<string, unknown>) => {
                    const c = row as unknown as Cheque;
                    return (
                      <EditDeleteMenu
                        onEdit={() => { setEditingCheque(c); setChequeFormOpen(true); }}
                        onDelete={() => store.remove("cheques", c.id)}
                        itemLabel={`Cheque ${c.number}`}
                        compact
                      />
                    );
                  } },
                ] as Column<Record<string, unknown>>[]}
                data={filteredCheques as unknown as Record<string, unknown>[]}
                pagination={false}
                emptyMessage="No cheques found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices */}
        <TabsContent value="invoices" className="space-y-3">
          <FilterBar
            searchPlaceholder="Search invoices..."
            searchValue={invSearch}
            onSearchChange={setInvSearch}
            rightSlot={
              <Button size="sm" onClick={() => { setEditingInvoice(null); setInvFormOpen(true); }}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            }
          />
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <DataTable
                columns={[
                  { key: "number", label: "Invoice #", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "customerId", label: "Customer", render: (_: unknown, row: Record<string, unknown>) => {
                    const inv = row as unknown as Invoice;
                    const cust = store.customers.find((c) => c.id === inv.customerId);
                    return <span className="font-medium">{cust?.name ?? "—"}</span>;
                  } },
                  { key: "date", label: "Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                  { key: "dueDate", label: "Due Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                  { key: "total", label: "Total", className: "text-right", render: (v: number) => <span className="font-semibold">{v.toLocaleString()}</span> },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge variant={v === "PAID" ? "success" : v === "OVERDUE" ? "destructive" : v === "VOID" ? "secondary" : "warning"}>{v}</Badge>
                  ) },
                  { key: "actions", label: "Actions", className: "text-right", render: (_: unknown, row: Record<string, unknown>) => {
                    const i = row as unknown as Invoice;
                    return (
                      <EditDeleteMenu
                        onEdit={() => { setEditingInvoice(i); setInvFormOpen(true); }}
                        onDelete={() => store.remove("invoices", i.id)}
                        itemLabel={i.number}
                        compact
                      />
                    );
                  } },
                ] as Column<Record<string, unknown>>[]}
                data={filteredInvoices as unknown as Record<string, unknown>[]}
                pagination={false}
                emptyMessage="No invoices found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bank Accounts */}
        <TabsContent value="bank" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Total Balance: <span className="font-semibold text-foreground">EGP {totalBankBalance.toLocaleString()}</span>
            </div>
            <Button size="sm" onClick={() => { setEditingBank(null); setBankFormOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Add Account</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "code", label: "Code", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
                  { key: "name", label: "Account Name", render: (v) => <span className="font-medium">{v as string}</span> },
                  { key: "bankName", label: "Bank" },
                  { key: "accountNumber", label: "Account #", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
                  { key: "currency", label: "Cur." },
                  { key: "balance", label: "Balance", render: (v) => <span className="font-semibold text-green-700">EGP {(v as number).toLocaleString()}</span>, className: "text-right" },
                  { key: "id", label: "Cheques", render: (_v, row) => {
                    const incoming = store.cheques.filter((c) => c.bankAccountId === row.id && c.type === "INCOMING" && (c.status === "PENDING" || c.status === "DEPOSITED")).reduce((s, c) => s + c.amount, 0);
                    const outgoing = store.cheques.filter((c) => c.bankAccountId === row.id && c.type === "OUTGOING" && c.status === "PENDING").reduce((s, c) => s + c.amount, 0);
                    if (!incoming && !outgoing) return <span className="text-xs text-muted-foreground">—</span>;
                    return (
                      <div className="text-xs">
                        {incoming > 0 && <span className="text-green-600">+{(incoming / 1000).toFixed(0)}K in</span>}
                        {incoming > 0 && outgoing > 0 && " / "}
                        {outgoing > 0 && <span className="text-red-600">-{(outgoing / 1000).toFixed(0)}K out</span>}
                      </div>
                    );
                  }},
                  { key: "status", label: "Status", render: (v) => (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${(v as string) === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}`}>{v as string}</span>
                  )},
                  { key: "type", label: "", render: (_v, row) => (
                    <EditDeleteMenu
                      onEdit={() => { const b = store.bankAccounts.find((x) => x.id === row.id); if (b) { setEditingBank(b); setBankFormOpen(true); } }}
                      onDelete={() => store.remove("bankAccounts", row.id as string)}
                      itemLabel={row.name as string}
                    />
                  )},
                ] as Column<Record<string, unknown>>[]}
                data={store.bankAccounts as unknown as Record<string, unknown>[]}
                emptyMessage="No bank accounts."
                pagination={false}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Statement dialog */}
      <Dialog open={!!statementParty} onOpenChange={(open) => { if (!open) setStatementParty(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ScrollText className="h-5 w-5" /> Account Statement</DialogTitle>
          </DialogHeader>
          {statementParty && (() => {
            const isCustomer = statementParty.type === "customer";
            const entity = isCustomer ? store.customers.find((c) => c.id === statementParty.id) : store.vendors.find((v) => v.id === statementParty.id);
            if (!entity) return null;
            const invoices = isCustomer ? store.invoices.filter((i) => i.customerId === statementParty.id) : [];
            const payments = store.payments.filter((p) => isCustomer ? p.customerId === statementParty.id : p.vendorId === statementParty.id);
            const cheques = store.cheques.filter((c) => c.partyName === entity.name);
            const lines: { date: string; description: string; debit: number; credit: number }[] = [];
            invoices.forEach((i) => lines.push({ date: i.date.slice(0, 10), description: `Invoice ${i.number}`, debit: i.total, credit: 0 }));
            payments.forEach((p) => lines.push({ date: p.date, description: `Payment ${p.reference}`, debit: 0, credit: p.amount }));
            cheques.forEach((c) => lines.push({ date: c.issueDate.slice(0, 10), description: `Cheque ${c.number} (${c.status})`, debit: c.type === "OUTGOING" ? c.amount : 0, credit: c.type === "INCOMING" ? c.amount : 0 }));
            lines.sort((a, b) => a.date.localeCompare(b.date));
            let balance = 0;
            const withBalance = lines.map((l) => { balance += l.debit - l.credit; return { ...l, balance }; });
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold">{entity.name}</p>
                    <p className="text-sm text-muted-foreground">{"code" in entity ? entity.code : ""} · Outstanding: EGP {entity.outstanding.toLocaleString()}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    const html = buildPrintableReport({
                      title: `Account Statement — ${entity.name}`,
                      subtitle: `${"code" in entity ? entity.code : ""} · Generated ${new Date().toLocaleDateString()}`,
                      sections: [{ heading: "Transactions", rows: withBalance.map((l) => ({ Date: l.date, Description: l.description, Debit: l.debit ? `EGP ${l.debit.toLocaleString()}` : "—", Credit: l.credit ? `EGP ${l.credit.toLocaleString()}` : "—", Balance: `EGP ${l.balance.toLocaleString()}` })) }],
                    });
                    downloadHTML(`statement-${entity.name.replace(/\s+/g, "-").toLowerCase()}.html`, html);
                  }}><Download className="h-4 w-4 mr-1" /> Download</Button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50"><tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-right">Debit</th><th className="px-3 py-2 text-right">Credit</th><th className="px-3 py-2 text-right">Balance</th></tr></thead>
                    <tbody className="divide-y">
                      {withBalance.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">No transactions found.</td></tr>}
                      {withBalance.map((l, i) => (
                        <tr key={i} className="hover:bg-muted/30">
                          <td className="px-3 py-2 font-mono text-xs">{l.date}</td>
                          <td className="px-3 py-2">{l.description}</td>
                          <td className="px-3 py-2 text-right text-red-600">{l.debit ? `EGP ${l.debit.toLocaleString()}` : "—"}</td>
                          <td className="px-3 py-2 text-right text-green-600">{l.credit ? `EGP ${l.credit.toLocaleString()}` : "—"}</td>
                          <td className="px-3 py-2 text-right font-semibold">{`EGP ${l.balance.toLocaleString()}`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Bank Account modal */}
      <EntityFormModal
        open={bankFormOpen} onOpenChange={setBankFormOpen}
        title={editingBank ? `Edit ${editingBank.name}` : "Add Bank Account"}
        fields={[
          { name: "code", label: "Code", type: "text", required: true, placeholder: "BA-XXX" },
          { name: "name", label: "Account Name", type: "text", required: true },
          { name: "bankName", label: "Bank Name", type: "text", required: true },
          { name: "accountNumber", label: "Account Number", type: "text", required: true },
          { name: "iban", label: "IBAN", type: "text" },
          { name: "currency", label: "Currency", type: "select", defaultValue: "EGP", options: [{ label: "EGP", value: "EGP" }, { label: "USD", value: "USD" }, { label: "EUR", value: "EUR" }] },
          { name: "balance", label: "Balance", type: "number", required: true },
          { name: "type", label: "Type", type: "select", defaultValue: "CURRENT", options: [{ label: "Current", value: "CURRENT" }, { label: "Savings", value: "SAVINGS" }, { label: "Foreign Currency", value: "FOREIGN_CURRENCY" }] },
          { name: "status", label: "Status", type: "select", defaultValue: "ACTIVE", options: [{ label: "Active", value: "ACTIVE" }, { label: "Dormant", value: "DORMANT" }, { label: "Closed", value: "CLOSED" }] },
        ] as EntityField[]}
        initialData={editingBank ? { code: editingBank.code, name: editingBank.name, bankName: editingBank.bankName, accountNumber: editingBank.accountNumber, iban: editingBank.iban ?? "", currency: editingBank.currency, balance: editingBank.balance, type: editingBank.type, status: editingBank.status } : undefined}
        onSubmit={(data) => {
          const payload = { code: String(data.code), name: String(data.name), bankName: String(data.bankName), accountNumber: String(data.accountNumber), iban: data.iban ? String(data.iban) : undefined, currency: String(data.currency || "EGP"), balance: Number(data.balance), type: String(data.type) as BankAccount["type"], status: String(data.status) as BankAccount["status"], openedAt: editingBank?.openedAt ?? new Date().toISOString() };
          if (editingBank) store.update("bankAccounts", editingBank.id, payload);
          else store.add("bankAccounts", { id: store.genId("ba"), ...payload });
          setBankFormOpen(false); setEditingBank(null);
        }}
      />

      {/* Customer modal */}
      <EntityFormModal
        open={custFormOpen} onOpenChange={setCustFormOpen}
        title={editingCustomer ? `Edit ${editingCustomer.name}` : "Add Customer"}
        fields={customerFields}
        initialData={editingCustomer ? { code: editingCustomer.code, name: editingCustomer.name, type: editingCustomer.type, phone: editingCustomer.phone, email: editingCustomer.email, address: editingCustomer.address, city: editingCustomer.city ?? "", creditLimit: editingCustomer.creditLimit, outstanding: editingCustomer.outstanding, currency: editingCustomer.currency, paymentTerms: editingCustomer.paymentTerms, status: editingCustomer.status } : undefined}
        onSubmit={handleCustomerSubmit}
        submitLabel={editingCustomer ? "Save" : "Create"}
        size="xl"
      />
      {/* Vendor modal */}
      <EntityFormModal
        open={vendFormOpen} onOpenChange={setVendFormOpen}
        title={editingVendor ? `Edit ${editingVendor.name}` : "Add Vendor"}
        fields={vendorFields}
        initialData={editingVendor ? { code: editingVendor.code, name: editingVendor.name, category: editingVendor.category, phone: editingVendor.phone, email: editingVendor.email, address: editingVendor.address, outstanding: editingVendor.outstanding, paymentTerms: editingVendor.paymentTerms, gmpCertified: editingVendor.gmpCertified } : undefined}
        onSubmit={handleVendorSubmit}
        submitLabel={editingVendor ? "Save" : "Create"}
      />
      {/* Cheque modal */}
      <EntityFormModal
        open={chequeFormOpen} onOpenChange={setChequeFormOpen}
        title={editingCheque ? `Edit Cheque ${editingCheque.number}` : "Add Cheque"}
        fields={chequeFields}
        initialData={editingCheque ? { number: editingCheque.number, bankName: editingCheque.bankName, type: editingCheque.type, partyName: editingCheque.partyName, amount: editingCheque.amount, currency: editingCheque.currency, issueDate: editingCheque.issueDate.slice(0, 10), dueDate: editingCheque.dueDate.slice(0, 10), status: editingCheque.status, notes: editingCheque.notes ?? "" } : undefined}
        onSubmit={handleChequeSubmit}
        submitLabel={editingCheque ? "Save" : "Create"}
      />
      {/* Invoice modal */}
      <EntityFormModal
        open={invFormOpen} onOpenChange={setInvFormOpen}
        title={editingInvoice ? `Edit ${editingInvoice.number}` : "Add Invoice"}
        fields={invoiceFields}
        initialData={editingInvoice ? { number: editingInvoice.number, customerId: editingInvoice.customerId, date: editingInvoice.date.slice(0, 10), dueDate: editingInvoice.dueDate.slice(0, 10), productId: editingInvoice.items[0]?.productId ?? "", quantity: editingInvoice.items[0]?.quantity ?? 1, unitPrice: editingInvoice.items[0]?.unitPrice ?? 0, subtotal: editingInvoice.subtotal, tax: editingInvoice.tax, total: editingInvoice.total, status: editingInvoice.status, notes: editingInvoice.notes ?? "" } : undefined}
        onSubmit={handleInvoiceSubmit}
        submitLabel={editingInvoice ? "Save" : "Create"}
      />
    </div>
  );
}
