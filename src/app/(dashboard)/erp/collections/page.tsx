"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  Clock,
  CreditCard,
  TrendingUp,
  Plus,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Calendar,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import {
  EntityFormModal,
  type EntityField,
  type EntityFormData,
} from "@/components/shared/entity-form-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDataStore, type Cheque, type Invoice } from "@/lib/data-store";

/* ─── Payment type ─── */
interface Payment {
  id: string;
  invoiceId: string;
  customerName: string;
  amount: number;
  method: "Cash" | "Cheque" | "Bank Transfer";
  reference: string;
  collector: string;
  date: string;
  verified: boolean;
  notes?: string;
}

interface CollectionRoute {
  id: string;
  name: string;
  collector: string;
  customerIds: string[];
  totalDue: number;
  scheduledDate: string;
  status: "Planned" | "Scheduled" | "In Progress" | "Completed";
  notes?: string;
}

/* ─── Seed payments & routes ─── */
const SEED_PAYMENTS: Payment[] = [
  { id: "pay-1", invoiceId: "inv-001", customerName: "El-Ezaby Pharmacies", amount: 500000, method: "Cash", reference: "RCV-20260401", collector: "Ahmed Hassan", date: "2026-04-01", verified: true },
  { id: "pay-2", invoiceId: "inv-001", customerName: "El-Ezaby Pharmacies", amount: 200000, method: "Cheque", reference: "CHQ-0001", collector: "Ahmed Hassan", date: "2026-04-03", verified: true },
  { id: "pay-3", invoiceId: "inv-002", customerName: "Seif Pharmacies", amount: 300000, method: "Bank Transfer", reference: "TRF-98764523", collector: "System", date: "2026-03-25", verified: true },
];

const SEED_ROUTES: CollectionRoute[] = [
  { id: "rt-1", name: "Cairo North Route", collector: "Ahmed Hassan", customerIds: ["c-001", "c-005"], totalDue: 3730000, scheduledDate: "2026-04-12", status: "Scheduled" },
  { id: "rt-2", name: "Giza & 6th Oct Route", collector: "Mahmoud Ali", customerIds: ["c-003"], totalDue: 1820000, scheduledDate: "2026-04-13", status: "Planned" },
];

const COLLECTORS = ["Ahmed Hassan", "Mahmoud Ali", "Karim Saeed", "System"];

export default function CollectionsPage() {
  const store = useDataStore();

  const [payments, setPayments] = useState<Payment[]>(SEED_PAYMENTS);
  const [routes, setRoutes] = useState<CollectionRoute[]>(SEED_ROUTES);

  const [filters, setFilters] = useState<FilterState>({});
  const [chequeFilters, setChequeFilters] = useState<FilterState>({});
  const [paymentFilters, setPaymentFilters] = useState<FilterState>({});
  const [search, setSearch] = useState("");

  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [chequeFormOpen, setChequeFormOpen] = useState(false);
  const [editingCheque, setEditingCheque] = useState<Cheque | null>(null);
  const [routeFormOpen, setRouteFormOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<CollectionRoute | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [viewPayment, setViewPayment] = useState<Payment | null>(null);
  const [viewCheque, setViewCheque] = useState<Cheque | null>(null);

  let _nextId = Date.now();
  const genId = (p: string) => `${p}-${(_nextId++).toString(36).slice(-6)}`;

  /* ─── Derived data from store ─── */
  const invoices = store.invoices;
  const cheques = store.cheques;
  const customers = store.customers;

  const outstandingInvoices = useMemo(() => {
    return invoices.filter((i) => i.status !== "PAID" && i.status !== "VOID");
  }, [invoices]);

  const overdueInvoices = useMemo(() => {
    return outstandingInvoices.filter((i) => i.status === "OVERDUE" || new Date(i.dueDate) < new Date());
  }, [outstandingInvoices]);

  const totalOutstanding = outstandingInvoices.reduce((s, i) => s + i.total, 0);
  const totalOverdue = overdueInvoices.reduce((s, i) => s + i.total, 0);
  const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
  const bouncedTotal = cheques.filter((c) => c.status === "BOUNCED").reduce((s, c) => s + c.amount, 0);

  const fmt = (n: number) => `EGP ${n.toLocaleString()}`;

  /* ─── Filtered data ─── */
  const filteredInvoices = useMemo(() => {
    return outstandingInvoices.filter((inv) => {
      const cust = customers.find((c) => c.id === inv.customerId);
      if (search) {
        const q = search.toLowerCase();
        if (!inv.number.toLowerCase().includes(q) && !(cust?.name || "").toLowerCase().includes(q)) return false;
      }
      if (filters.status && inv.status !== filters.status) return false;
      return true;
    });
  }, [outstandingInvoices, customers, search, filters]);

  const filteredCheques = useMemo(() => {
    return cheques.filter((c) => {
      if (chequeFilters.status && c.status !== chequeFilters.status) return false;
      if (chequeFilters.type && c.type !== chequeFilters.type) return false;
      return true;
    });
  }, [cheques, chequeFilters]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (paymentFilters.method && p.method !== paymentFilters.method) return false;
      if (paymentFilters.verified === "true" && !p.verified) return false;
      if (paymentFilters.verified === "false" && p.verified) return false;
      return true;
    });
  }, [payments, paymentFilters]);

  /* ─── Cheque stats ─── */
  const chequeStats = useMemo(() => {
    const pending = cheques.filter((c) => c.status === "PENDING");
    const deposited = cheques.filter((c) => c.status === "DEPOSITED");
    const cleared = cheques.filter((c) => c.status === "CLEARED");
    const bounced = cheques.filter((c) => c.status === "BOUNCED");
    return { pending, deposited, cleared, bounced };
  }, [cheques]);

  /* ─── Payment CRUD ─── */
  const invoiceOptions = outstandingInvoices.map((i) => {
    const cust = customers.find((c) => c.id === i.customerId);
    return { label: `${i.number} — ${cust?.name || "Unknown"}`, value: i.id };
  });

  const paymentFields: EntityField[] = [
    { name: "invoiceId", label: "Invoice", type: "select", required: true, options: invoiceOptions },
    { name: "amount", label: "Amount (EGP)", type: "number", required: true },
    { name: "method", label: "Payment Method", type: "select", required: true, options: [{ label: "Cash", value: "Cash" }, { label: "Cheque", value: "Cheque" }, { label: "Bank Transfer", value: "Bank Transfer" }] },
    { name: "reference", label: "Reference", type: "text", required: true },
    { name: "collector", label: "Collector", type: "select", required: true, options: COLLECTORS.map((c) => ({ label: c, value: c })) },
    { name: "date", label: "Date", type: "date", required: true },
    { name: "notes", label: "Notes", type: "textarea", fullWidth: true },
  ];

  function handleCreatePayment() { setEditingPayment(null); setPaymentFormOpen(true); }
  function handleEditPayment(p: Payment) { setEditingPayment(p); setPaymentFormOpen(true); }
  function handlePaymentSubmit(data: EntityFormData) {
    const inv = invoices.find((i) => i.id === String(data.invoiceId));
    const cust = inv ? customers.find((c) => c.id === inv.customerId) : null;

    if (editingPayment) {
      setPayments((prev) => prev.map((p) => p.id === editingPayment.id ? {
        ...p,
        invoiceId: String(data.invoiceId),
        customerName: cust?.name || p.customerName,
        amount: Number(data.amount),
        method: data.method as Payment["method"],
        reference: String(data.reference),
        collector: String(data.collector),
        date: String(data.date),
        notes: data.notes ? String(data.notes) : undefined,
      } : p));
    } else {
      setPayments((prev) => [...prev, {
        id: genId("pay"),
        invoiceId: String(data.invoiceId),
        customerName: cust?.name || "Unknown",
        amount: Number(data.amount),
        method: data.method as Payment["method"],
        reference: String(data.reference),
        collector: String(data.collector),
        date: String(data.date),
        verified: false,
        notes: data.notes ? String(data.notes) : undefined,
      }]);
    }
    setPaymentFormOpen(false); setEditingPayment(null);
  }
  function handleDeletePayment(p: Payment) { setPayments((prev) => prev.filter((x) => x.id !== p.id)); }
  function handleVerifyPayment(p: Payment) { setPayments((prev) => prev.map((x) => x.id === p.id ? { ...x, verified: true } : x)); }

  /* ─── Cheque CRUD (data store) ─── */
  const chequeFields: EntityField[] = [
    { name: "number", label: "Cheque Number", type: "text", required: true },
    { name: "bankName", label: "Bank", type: "text", required: true },
    { name: "type", label: "Type", type: "select", required: true, options: [{ label: "Incoming", value: "INCOMING" }, { label: "Outgoing", value: "OUTGOING" }] },
    { name: "partyName", label: "Party Name", type: "text", required: true },
    { name: "amount", label: "Amount (EGP)", type: "number", required: true },
    { name: "issueDate", label: "Issue Date", type: "date", required: true },
    { name: "dueDate", label: "Due Date", type: "date", required: true },
    { name: "status", label: "Status", type: "select", required: true, options: [{ label: "Pending", value: "PENDING" }, { label: "Deposited", value: "DEPOSITED" }, { label: "Cleared", value: "CLEARED" }, { label: "Bounced", value: "BOUNCED" }, { label: "Cancelled", value: "CANCELLED" }] },
  ];

  function handleCreateCheque() { setEditingCheque(null); setChequeFormOpen(true); }
  function handleEditCheque(c: Cheque) { setEditingCheque(c); setChequeFormOpen(true); }
  function handleChequeSubmit(data: EntityFormData) {
    const payload: Omit<Cheque, "id"> = {
      number: String(data.number),
      bankName: String(data.bankName),
      type: data.type as Cheque["type"],
      partyName: String(data.partyName),
      amount: Number(data.amount),
      currency: "EGP",
      issueDate: String(data.issueDate),
      dueDate: String(data.dueDate),
      status: data.status as Cheque["status"],
    };
    if (editingCheque) {
      store.update("cheques", editingCheque.id, payload);
    } else {
      store.add("cheques", { id: store.genId("ch"), ...payload });
    }
    setChequeFormOpen(false); setEditingCheque(null);
  }
  function handleDeleteCheque(c: Cheque) { store.remove("cheques", c.id); }

  /* ─── Route CRUD ─── */
  const routeFields: EntityField[] = [
    { name: "name", label: "Route Name", type: "text", required: true },
    { name: "collector", label: "Collector", type: "select", required: true, options: COLLECTORS.filter((c) => c !== "System").map((c) => ({ label: c, value: c })) },
    { name: "scheduledDate", label: "Scheduled Date", type: "date", required: true },
    { name: "status", label: "Status", type: "select", required: true, options: [{ label: "Planned", value: "Planned" }, { label: "Scheduled", value: "Scheduled" }, { label: "In Progress", value: "In Progress" }, { label: "Completed", value: "Completed" }] },
    { name: "notes", label: "Notes", type: "textarea", fullWidth: true },
  ];

  function handleCreateRoute() { setEditingRoute(null); setRouteFormOpen(true); }
  function handleEditRoute(r: CollectionRoute) { setEditingRoute(r); setRouteFormOpen(true); }
  function handleRouteSubmit(data: EntityFormData) {
    if (editingRoute) {
      setRoutes((prev) => prev.map((r) => r.id === editingRoute.id ? {
        ...r,
        name: String(data.name),
        collector: String(data.collector),
        scheduledDate: String(data.scheduledDate),
        status: data.status as CollectionRoute["status"],
        notes: data.notes ? String(data.notes) : undefined,
      } : r));
    } else {
      setRoutes((prev) => [...prev, {
        id: genId("rt"),
        name: String(data.name),
        collector: String(data.collector),
        customerIds: [],
        totalDue: 0,
        scheduledDate: String(data.scheduledDate),
        status: (data.status as CollectionRoute["status"]) || "Planned",
        notes: data.notes ? String(data.notes) : undefined,
      }]);
    }
    setRouteFormOpen(false); setEditingRoute(null);
  }
  function handleDeleteRoute(r: CollectionRoute) { setRoutes((prev) => prev.filter((x) => x.id !== r.id)); }

  /* ─── Aging helper ─── */
  const agingData = useMemo(() => {
    const now = new Date();
    const result: Record<string, { customer: string; type: string; current: number; d30: number; d60: number; d90: number; over90: number; total: number }> = {};

    outstandingInvoices.forEach((inv) => {
      const cust = customers.find((c) => c.id === inv.customerId);
      if (!cust) return;
      const key = cust.id;
      if (!result[key]) result[key] = { customer: cust.name, type: cust.type, current: 0, d30: 0, d60: 0, d90: 0, over90: 0, total: 0 };

      const due = new Date(inv.dueDate);
      const daysOver = Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86400000));
      const amt = inv.total;

      if (daysOver === 0) result[key].current += amt;
      else if (daysOver <= 30) result[key].d30 += amt;
      else if (daysOver <= 60) result[key].d60 += amt;
      else if (daysOver <= 90) result[key].d90 += amt;
      else result[key].over90 += amt;
      result[key].total += amt;
    });

    return Object.values(result);
  }, [outstandingInvoices, customers]);

  const chequeStatusColor: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-700",
    DEPOSITED: "bg-blue-100 text-blue-700",
    CLEARED: "bg-green-100 text-green-700",
    BOUNCED: "bg-red-100 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Collections"
        description="Track outstanding invoices, payments, cheque management, and collection routes"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCreateRoute}>
              <MapPin className="h-4 w-4 mr-2" /> Plan Route
            </Button>
            <Button onClick={handleCreatePayment}>
              <Plus className="h-4 w-4 mr-2" /> Record Payment
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Banknote} title="Total Outstanding" value={fmt(totalOutstanding)} subtitle={`${outstandingInvoices.length} invoices`} iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={AlertTriangle} title="Overdue" value={fmt(totalOverdue)} subtitle={`${overdueInvoices.length} overdue`} iconColor="bg-red-100 text-red-600" />
        <StatsCard icon={TrendingUp} title="Collected" value={fmt(totalCollected)} subtitle={`${payments.length} payments`} iconColor="bg-green-100 text-green-600" />
        <StatsCard icon={CreditCard} title="Bounced Cheques" value={fmt(bouncedTotal)} subtitle={`${chequeStats.bounced.length} cheques`} iconColor="bg-amber-100 text-amber-600" />
      </div>

      <Tabs defaultValue="outstanding">
        <TabsList>
          <TabsTrigger value="outstanding">Outstanding ({outstandingInvoices.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
          <TabsTrigger value="cheques">Cheques ({cheques.length})</TabsTrigger>
          <TabsTrigger value="aging">Aging Report</TabsTrigger>
          <TabsTrigger value="routes">Routes ({routes.length})</TabsTrigger>
        </TabsList>

        {/* ── Outstanding Invoices ── */}
        <TabsContent value="outstanding" className="space-y-3">
          <FilterBar
            searchPlaceholder="Search invoices by number or customer..."
            searchValue={search}
            onSearchChange={setSearch}
            fields={[
              { key: "status", label: "Status", type: "select", options: [{ label: "Draft", value: "DRAFT" }, { label: "Sent", value: "SENT" }, { label: "Partial", value: "PARTIAL" }, { label: "Overdue", value: "OVERDUE" }] },
            ]}
            values={filters}
            onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))}
          />
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "number", label: "Invoice", render: (v: string) => <span className="font-mono text-xs font-medium">{v}</span> },
                  { key: "customerId", label: "Customer", render: (_: unknown, row: Record<string, unknown>) => {
                    const inv = row as unknown as Invoice;
                    const cust = customers.find((c) => c.id === inv.customerId);
                    return <span className="font-medium">{cust?.name || "—"}</span>;
                  } },
                  { key: "customerType", label: "Type", render: (_: unknown, row: Record<string, unknown>) => {
                    const inv = row as unknown as Invoice;
                    const cust = customers.find((c) => c.id === inv.customerId);
                    return <Badge variant="outline" className="text-xs">{cust?.type || "—"}</Badge>;
                  } },
                  { key: "total", label: "Total", className: "text-right", render: (v: number) => <span className="font-semibold">{fmt(v)}</span> },
                  { key: "dueDate", label: "Due Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                  { key: "status", label: "Status", render: (_: unknown, row: Record<string, unknown>) => {
                    const inv = row as unknown as Invoice;
                    const overdue = new Date(inv.dueDate) < new Date() && inv.status !== "PAID";
                    return (
                      <Badge variant={inv.status === "OVERDUE" || overdue ? "destructive" : inv.status === "PARTIAL" ? "warning" : "secondary"} className="text-xs">
                        {overdue && inv.status !== "OVERDUE" ? "OVERDUE" : inv.status}
                      </Badge>
                    );
                  } },
                  { key: "actions", label: "Actions", className: "text-right", render: (_: unknown, row: Record<string, unknown>) => {
                    const inv = row as unknown as Invoice;
                    return (
                      <EditDeleteMenu
                        onView={() => setViewInvoice(inv)}
                        canView
                        onEdit={() => {
                          store.update("invoices", inv.id, { status: inv.status === "SENT" ? "PARTIAL" : inv.status });
                        }}
                        canDelete={false}
                        itemLabel={inv.number}
                        compact
                        extraItems={[
                          { label: "Mark Paid", onClick: () => store.update("invoices", inv.id, { status: "PAID" }), icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> },
                          { label: "Mark Overdue", onClick: () => store.update("invoices", inv.id, { status: "OVERDUE" }), icon: <AlertTriangle className="h-3.5 w-3.5 text-red-600" /> },
                        ]}
                      />
                    );
                  } },
                ] as Column<Record<string, unknown>>[]}
                data={filteredInvoices as unknown as Record<string, unknown>[]}
                
                exportable exportFilename="erp-collections.csv" emptyMessage="No outstanding invoices."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Payments ── */}
        <TabsContent value="payments" className="space-y-3">
          <FilterBar
            searchPlaceholder=""
            searchValue=""
            onSearchChange={() => {}}
            fields={[
              { key: "method", label: "Method", type: "select", options: [{ label: "Cash", value: "Cash" }, { label: "Cheque", value: "Cheque" }, { label: "Bank Transfer", value: "Bank Transfer" }] },
              { key: "verified", label: "Verified", type: "select", options: [{ label: "Yes", value: "true" }, { label: "No", value: "false" }] },
            ]}
            values={paymentFilters}
            onChange={(k, v) => setPaymentFilters(f => ({ ...f, [k]: v }))}
            rightSlot={<Button size="sm" onClick={handleCreatePayment}><Plus className="h-3.5 w-3.5 mr-1" />Record Payment</Button>}
          />
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "customerName", label: "Customer", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "amount", label: "Amount", className: "text-right", render: (v: number) => <span className="font-semibold text-green-600">{fmt(v)}</span> },
                  { key: "method", label: "Method", render: (v: string) => (
                    <Badge variant="outline" className={`text-xs ${v === "Cash" ? "border-green-300 text-green-700" : v === "Cheque" ? "border-blue-300 text-blue-700" : "border-purple-300 text-purple-700"}`}>{v}</Badge>
                  ) },
                  { key: "reference", label: "Reference", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "collector", label: "Collector", render: (v: string) => <span className="text-xs">{v}</span> },
                  { key: "date", label: "Date", render: (v: string) => <span className="text-xs">{v}</span> },
                  { key: "verified", label: "Verified", render: (v: boolean) => (
                    v ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Clock className="h-4 w-4 text-amber-500" />
                  ) },
                  { key: "actions", label: "Actions", className: "text-right", render: (_: unknown, row: Record<string, unknown>) => {
                    const p = row as unknown as Payment;
                    return (
                      <EditDeleteMenu
                        onView={() => setViewPayment(p)}
                        canView
                        onEdit={() => handleEditPayment(p)}
                        onDelete={() => handleDeletePayment(p)}
                        itemLabel={`Payment ${p.reference}`}
                        compact
                        extraItems={!p.verified ? [{ label: "Verify", onClick: () => handleVerifyPayment(p), icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> }] : undefined}
                      />
                    );
                  } },
                ] as Column<Record<string, unknown>>[]}
                data={filteredPayments as unknown as Record<string, unknown>[]}
                
                exportable exportFilename="erp-collections.csv" emptyMessage="No payment records."
              />
              {filteredPayments.length > 0 && (
                <div className="border-t-2 bg-slate-50 font-bold flex text-sm p-3">
                  <span>Total</span>
                  <span className="ml-auto text-green-600">{fmt(filteredPayments.reduce((s, p) => s + p.amount, 0))}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["Cash", "Cheque", "Bank Transfer"] as const).map((method) => {
              const methodPayments = payments.filter((p) => p.method === method);
              const total = methodPayments.reduce((s, p) => s + p.amount, 0);
              const color = method === "Cash" ? "text-green-600" : method === "Cheque" ? "text-blue-600" : "text-purple-600";
              return (
                <Card key={method}>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">{method} Collections</div>
                    <div className={`text-2xl font-bold ${color}`}>{fmt(total)}</div>
                    <div className="text-xs text-muted-foreground mt-1">{methodPayments.length} payments</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Cheques ── */}
        <TabsContent value="cheques" className="space-y-3">
          <FilterBar
            searchPlaceholder=""
            searchValue=""
            onSearchChange={() => {}}
            fields={[
              { key: "status", label: "Status", type: "select", options: [{ label: "Pending", value: "PENDING" }, { label: "Deposited", value: "DEPOSITED" }, { label: "Cleared", value: "CLEARED" }, { label: "Bounced", value: "BOUNCED" }, { label: "Cancelled", value: "CANCELLED" }] },
              { key: "type", label: "Type", type: "select", options: [{ label: "Incoming", value: "INCOMING" }, { label: "Outgoing", value: "OUTGOING" }] },
            ]}
            values={chequeFilters}
            onChange={(k, v) => setChequeFilters(f => ({ ...f, [k]: v }))}
            rightSlot={<Button size="sm" onClick={handleCreateCheque}><Plus className="h-3.5 w-3.5 mr-1" />Add Cheque</Button>}
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {([
              { label: "Pending", data: chequeStats.pending, color: "text-amber-600" },
              { label: "Deposited", data: chequeStats.deposited, color: "text-blue-600" },
              { label: "Cleared", data: chequeStats.cleared, color: "text-green-600" },
              { label: "Bounced", data: chequeStats.bounced, color: "text-red-600" },
            ] as const).map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-4 text-center">
                  <div className="text-sm text-muted-foreground">{s.label}</div>
                  <div className={`text-2xl font-bold ${s.color}`}>{s.data.length}</div>
                  <div className="text-xs text-muted-foreground">{fmt(s.data.reduce((t, c) => t + c.amount, 0))}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "number", label: "Cheque #", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "type", label: "Type", render: (v: string) => (
                    <Badge variant={v === "INCOMING" ? "default" : "secondary"} className="text-xs">{v}</Badge>
                  ) },
                  { key: "partyName", label: "Party", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "bankName", label: "Bank", render: (v: string) => <span className="text-xs">{v}</span> },
                  { key: "amount", label: "Amount", className: "text-right", render: (v: number) => <span className="font-semibold">{fmt(v)}</span> },
                  { key: "issueDate", label: "Issue Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                  { key: "dueDate", label: "Due Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                  { key: "status", label: "Status", render: (v: string) => (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${chequeStatusColor[v]}`}>{v}</span>
                  ) },
                  { key: "actions", label: "Actions", className: "text-right", render: (_: unknown, row: Record<string, unknown>) => {
                    const c = row as unknown as Cheque;
                    return (
                      <EditDeleteMenu
                        onView={() => setViewCheque(c)}
                        canView
                        onEdit={() => handleEditCheque(c)}
                        onDelete={() => handleDeleteCheque(c)}
                        itemLabel={c.number}
                        compact
                        extraItems={[
                          ...(c.status === "PENDING" ? [{ label: "Deposit", onClick: () => store.update("cheques", c.id, { status: "DEPOSITED" as const }), icon: <CreditCard className="h-3.5 w-3.5 text-blue-600" /> }] : []),
                          ...(c.status === "DEPOSITED" ? [{ label: "Mark Cleared", onClick: () => store.update("cheques", c.id, { status: "CLEARED" as const }), icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> }] : []),
                          ...(c.status !== "BOUNCED" && c.status !== "CANCELLED" ? [{ label: "Mark Bounced", onClick: () => store.update("cheques", c.id, { status: "BOUNCED" as const }), icon: <XCircle className="h-3.5 w-3.5 text-red-600" /> }] : []),
                        ]}
                      />
                    );
                  } },
                ] as Column<Record<string, unknown>>[]}
                data={filteredCheques as unknown as Record<string, unknown>[]}
                
                exportable exportFilename="erp-collections.csv" emptyMessage="No cheques match your filters."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Aging Report ── */}
        <TabsContent value="aging" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Aging Report</CardTitle>
              <CardDescription>Accounts receivable aging analysis by customer</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "customer", label: "Customer", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "type", label: "Type", render: (v: string) => <Badge variant="outline" className="text-xs">{v}</Badge> },
                  { key: "current", label: "Current", className: "text-right", render: (v: number) => v > 0 ? fmt(v) : "—" },
                  { key: "d30", label: "1-30 Days", className: "text-right", render: (v: number) => <span className="text-amber-600">{v > 0 ? fmt(v) : "—"}</span> },
                  { key: "d60", label: "31-60 Days", className: "text-right", render: (v: number) => <span className="text-orange-600">{v > 0 ? fmt(v) : "—"}</span> },
                  { key: "d90", label: "61-90 Days", className: "text-right", render: (v: number) => <span className="text-red-600">{v > 0 ? fmt(v) : "—"}</span> },
                  { key: "over90", label: "90+ Days", className: "text-right", render: (v: number) => <span className="text-red-700 font-semibold">{v > 0 ? fmt(v) : "—"}</span> },
                  { key: "total", label: "Total", className: "text-right", render: (v: number) => <span className="font-bold">{fmt(v)}</span> },
                ] as Column<Record<string, unknown>>[]}
                data={agingData as unknown as Record<string, unknown>[]}
                
                exportable exportFilename="erp-collections.csv" emptyMessage="No outstanding receivables."
              />
              {agingData.length > 0 && (
                <div className="border-t-2 bg-slate-50 font-bold grid grid-cols-8 text-sm p-3">
                  <span className="col-span-2">Total</span>
                  <span className="text-right">{fmt(agingData.reduce((s, r) => s + r.current, 0))}</span>
                  <span className="text-right text-amber-600">{fmt(agingData.reduce((s, r) => s + r.d30, 0))}</span>
                  <span className="text-right text-orange-600">{fmt(agingData.reduce((s, r) => s + r.d60, 0))}</span>
                  <span className="text-right text-red-600">{fmt(agingData.reduce((s, r) => s + r.d90, 0))}</span>
                  <span className="text-right text-red-700">{fmt(agingData.reduce((s, r) => s + r.over90, 0))}</span>
                  <span className="text-right">{fmt(agingData.reduce((s, r) => s + r.total, 0))}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Collection Routes ── */}
        <TabsContent value="routes" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={handleCreateRoute}><Plus className="h-3.5 w-3.5 mr-1" />Plan Route</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {routes.map((route) => {
              const routeCustomers = route.customerIds.map((cid) => customers.find((c) => c.id === cid)).filter(Boolean);
              return (
                <Card key={route.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{route.name}</CardTitle>
                      <EditDeleteMenu
                        onEdit={() => handleEditRoute(route)}
                        onDelete={() => handleDeleteRoute(route)}
                        itemLabel={route.name}
                        compact
                      />
                    </div>
                    <Badge variant={route.status === "Scheduled" ? "default" : route.status === "Completed" ? "success" : "secondary"} className="text-xs w-fit">{route.status}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{route.customerIds.length} stops</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{route.scheduledDate}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Banknote className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{fmt(route.totalDue)} to collect</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Collector:</span> {route.collector}
                    </div>
                    {routeCustomers.length > 0 && (
                      <div className="border-t pt-2 mt-2">
                        <div className="text-xs text-muted-foreground mb-1">Stops:</div>
                        <div className="flex flex-wrap gap-1">
                          {routeCustomers.map((c) => (
                            <span key={c!.id} className="text-xs bg-muted px-2 py-0.5 rounded">{c!.name}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Modals ── */}
      <EntityFormModal
        open={paymentFormOpen}
        onOpenChange={setPaymentFormOpen}
        title={editingPayment ? "Edit Payment" : "Record Payment"}
        fields={paymentFields}
        initialData={editingPayment ? { invoiceId: editingPayment.invoiceId, amount: editingPayment.amount, method: editingPayment.method, reference: editingPayment.reference, collector: editingPayment.collector, date: editingPayment.date, notes: editingPayment.notes || "" } : undefined}
        onSubmit={handlePaymentSubmit}
        submitLabel={editingPayment ? "Save" : "Record"}
        size="lg"
      />

      <EntityFormModal
        open={chequeFormOpen}
        onOpenChange={setChequeFormOpen}
        title={editingCheque ? `Edit ${editingCheque.number}` : "Add Cheque"}
        fields={chequeFields}
        initialData={editingCheque ? { number: editingCheque.number, bankName: editingCheque.bankName, type: editingCheque.type, partyName: editingCheque.partyName, amount: editingCheque.amount, issueDate: editingCheque.issueDate.split("T")[0], dueDate: editingCheque.dueDate.split("T")[0], status: editingCheque.status } : undefined}
        onSubmit={handleChequeSubmit}
        submitLabel={editingCheque ? "Save" : "Create"}
        size="lg"
      />

      <EntityFormModal
        open={routeFormOpen}
        onOpenChange={setRouteFormOpen}
        title={editingRoute ? `Edit ${editingRoute.name}` : "Plan Collection Route"}
        fields={routeFields}
        initialData={editingRoute ? { name: editingRoute.name, collector: editingRoute.collector, scheduledDate: editingRoute.scheduledDate, status: editingRoute.status, notes: editingRoute.notes || "" } : undefined}
        onSubmit={handleRouteSubmit}
        submitLabel={editingRoute ? "Save" : "Create"}
        size="md"
      />

      {/* ── Invoice Detail Dialog ── */}
      <Dialog open={!!viewInvoice} onOpenChange={(o) => !o && setViewInvoice(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice {viewInvoice?.number}</DialogTitle>
          </DialogHeader>
          {viewInvoice && (() => {
            const cust = customers.find((c) => c.id === viewInvoice.customerId);
            const overdue = new Date(viewInvoice.dueDate) < new Date() && viewInvoice.status !== "PAID";
            return (
              <div className="grid grid-cols-2 gap-4 py-4">
                <div><span className="text-sm text-muted-foreground">Invoice Number</span><p className="font-medium font-mono">{viewInvoice.number}</p></div>
                <div><span className="text-sm text-muted-foreground">Customer</span><p className="font-medium">{cust?.name || "—"}</p></div>
                <div><span className="text-sm text-muted-foreground">Customer Type</span><p className="font-medium">{cust?.type || "—"}</p></div>
                <div><span className="text-sm text-muted-foreground">Status</span><p><Badge variant={overdue ? "destructive" : "secondary"}>{overdue && viewInvoice.status !== "OVERDUE" ? "OVERDUE" : viewInvoice.status}</Badge></p></div>
                <div><span className="text-sm text-muted-foreground">Due Date</span><p className="font-medium">{new Date(viewInvoice.dueDate).toLocaleDateString()}</p></div>
                <div><span className="text-sm text-muted-foreground">Invoice Date</span><p className="font-medium">{new Date(viewInvoice.date).toLocaleDateString()}</p></div>
                <div><span className="text-sm text-muted-foreground">Subtotal</span><p className="font-medium">{fmt(viewInvoice.subtotal)}</p></div>
                <div><span className="text-sm text-muted-foreground">Tax</span><p className="font-medium">{fmt(viewInvoice.tax)}</p></div>
                <div><span className="text-sm text-muted-foreground">Total</span><p className="font-semibold text-lg">{fmt(viewInvoice.total)}</p></div>
                <div><span className="text-sm text-muted-foreground">Currency</span><p className="font-medium">{viewInvoice.currency}</p></div>
              </div>
            );
          })()}
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
              <div><span className="text-sm text-muted-foreground">Customer</span><p className="font-medium">{viewPayment.customerName}</p></div>
              <div><span className="text-sm text-muted-foreground">Amount</span><p className="font-semibold text-lg text-green-600">{fmt(viewPayment.amount)}</p></div>
              <div><span className="text-sm text-muted-foreground">Method</span><p className="font-medium">{viewPayment.method}</p></div>
              <div><span className="text-sm text-muted-foreground">Collector</span><p className="font-medium">{viewPayment.collector}</p></div>
              <div><span className="text-sm text-muted-foreground">Date</span><p className="font-medium">{viewPayment.date}</p></div>
              <div><span className="text-sm text-muted-foreground">Verified</span><p className="font-medium">{viewPayment.verified ? "Yes" : "No"}</p></div>
              <div><span className="text-sm text-muted-foreground">Invoice ID</span><p className="font-medium font-mono">{viewPayment.invoiceId}</p></div>
              {viewPayment.notes && <div className="col-span-2"><span className="text-sm text-muted-foreground">Notes</span><p className="font-medium">{viewPayment.notes}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Cheque Detail Dialog ── */}
      <Dialog open={!!viewCheque} onOpenChange={(o) => !o && setViewCheque(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cheque {viewCheque?.number}</DialogTitle>
          </DialogHeader>
          {viewCheque && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><span className="text-sm text-muted-foreground">Cheque Number</span><p className="font-medium font-mono">{viewCheque.number}</p></div>
              <div><span className="text-sm text-muted-foreground">Type</span><p className="font-medium">{viewCheque.type}</p></div>
              <div><span className="text-sm text-muted-foreground">Party</span><p className="font-medium">{viewCheque.partyName}</p></div>
              <div><span className="text-sm text-muted-foreground">Bank</span><p className="font-medium">{viewCheque.bankName}</p></div>
              <div><span className="text-sm text-muted-foreground">Amount</span><p className="font-semibold text-lg">{fmt(viewCheque.amount)}</p></div>
              <div><span className="text-sm text-muted-foreground">Currency</span><p className="font-medium">{viewCheque.currency}</p></div>
              <div><span className="text-sm text-muted-foreground">Issue Date</span><p className="font-medium">{new Date(viewCheque.issueDate).toLocaleDateString()}</p></div>
              <div><span className="text-sm text-muted-foreground">Due Date</span><p className="font-medium">{new Date(viewCheque.dueDate).toLocaleDateString()}</p></div>
              <div><span className="text-sm text-muted-foreground">Status</span><p><span className={`px-2 py-1 rounded-full text-xs font-medium ${chequeStatusColor[viewCheque.status]}`}>{viewCheque.status}</span></p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
