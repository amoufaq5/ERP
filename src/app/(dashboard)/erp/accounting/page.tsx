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
} from "@/lib/data-store";
import {
  Users,
  Building2,
  FileText,
  CreditCard,
  Plus,
  Download,
} from "lucide-react";
import { downloadCSV } from "@/lib/download";

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

  // ─── Computed ──────────────────────────────────────────────────────────
  const totalAR = store.customers.reduce((s, c) => s + c.outstanding, 0);
  const totalAP = store.vendors.reduce((s, v) => s + v.outstanding, 0);
  const pendingCheques = store.cheques.filter((c) => c.status === "PENDING").length;
  const invoiceTotal = store.invoices.reduce((s, i) => s + i.total, 0);

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
    { name: "subtotal", label: "Subtotal (EGP)", type: "number", required: true },
    { name: "tax", label: "Tax (EGP)", type: "number", required: true },
    { name: "total", label: "Total (EGP)", type: "number", required: true },
    { name: "status", label: "Status", type: "select", defaultValue: "DRAFT", options: [{ label: "Draft", value: "DRAFT" }, { label: "Sent", value: "SENT" }, { label: "Partial", value: "PARTIAL" }, { label: "Paid", value: "PAID" }, { label: "Overdue", value: "OVERDUE" }, { label: "Void", value: "VOID" }] },
    { name: "notes", label: "Notes", type: "textarea", fullWidth: true },
  ];

  function handleInvoiceSubmit(data: EntityFormData) {
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
      items: editingInvoice?.items ?? [],
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b text-xs uppercase text-slate-600">
                  <tr>
                    <th className="text-left p-3">Number</th>
                    <th className="text-left p-3">Bank</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-left p-3">Party</th>
                    <th className="text-right p-3">Amount</th>
                    <th className="text-left p-3">Issue Date</th>
                    <th className="text-left p-3">Due Date</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCheques.map((c) => (
                    <tr key={c.id} className="border-b hover:bg-slate-50">
                      <td className="p-3 font-mono text-xs">{c.number}</td>
                      <td className="p-3">{c.bankName}</td>
                      <td className="p-3">
                        <Badge variant={c.type === "INCOMING" ? "success" : "default"}>
                          {c.type}
                        </Badge>
                      </td>
                      <td className="p-3 font-medium">{c.partyName}</td>
                      <td className="p-3 text-right font-semibold">{c.amount.toLocaleString()}</td>
                      <td className="p-3 text-xs">{new Date(c.issueDate).toLocaleDateString()}</td>
                      <td className="p-3 text-xs">{new Date(c.dueDate).toLocaleDateString()}</td>
                      <td className="p-3">
                        <Badge variant={c.status === "CLEARED" ? "success" : c.status === "BOUNCED" ? "destructive" : c.status === "DEPOSITED" ? "default" : "warning"}>
                          {c.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <EditDeleteMenu
                          onEdit={() => { setEditingCheque(c); setChequeFormOpen(true); }}
                          onDelete={() => store.remove("cheques", c.id)}
                          itemLabel={`Cheque ${c.number}`}
                          compact
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b text-xs uppercase text-slate-600">
                  <tr>
                    <th className="text-left p-3">Invoice #</th>
                    <th className="text-left p-3">Customer</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Due Date</th>
                    <th className="text-right p-3">Total</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((i) => {
                    const cust = store.customers.find((c) => c.id === i.customerId);
                    return (
                      <tr key={i.id} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-mono text-xs">{i.number}</td>
                        <td className="p-3 font-medium">{cust?.name ?? "—"}</td>
                        <td className="p-3 text-xs">{new Date(i.date).toLocaleDateString()}</td>
                        <td className="p-3 text-xs">{new Date(i.dueDate).toLocaleDateString()}</td>
                        <td className="p-3 text-right font-semibold">{i.total.toLocaleString()}</td>
                        <td className="p-3">
                          <Badge variant={i.status === "PAID" ? "success" : i.status === "OVERDUE" ? "destructive" : i.status === "VOID" ? "secondary" : "warning"}>
                            {i.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <EditDeleteMenu
                            onEdit={() => { setEditingInvoice(i); setInvFormOpen(true); }}
                            onDelete={() => store.remove("invoices", i.id)}
                            itemLabel={i.number}
                            compact
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
        initialData={editingInvoice ? { number: editingInvoice.number, customerId: editingInvoice.customerId, date: editingInvoice.date.slice(0, 10), dueDate: editingInvoice.dueDate.slice(0, 10), subtotal: editingInvoice.subtotal, tax: editingInvoice.tax, total: editingInvoice.total, status: editingInvoice.status, notes: editingInvoice.notes ?? "" } : undefined}
        onSubmit={handleInvoiceSubmit}
        submitLabel={editingInvoice ? "Save" : "Create"}
      />
    </div>
  );
}
