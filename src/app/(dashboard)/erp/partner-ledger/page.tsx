"use client";

import { useMemo, useState } from "react";
import {
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  Plus,
  FileText,
  Phone,
  Mail,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import StatusBadge from "@/components/shared/status-badge";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import {
  EntityFormModal,
  type EntityField,
  type EntityFormData,
} from "@/components/shared/entity-form-modal";
import { useDataStore, type Invoice, type Payment as PaymentType } from "@/lib/data-store";
import { Download } from "lucide-react";

/* ─── Ledger Entry type ─── */
interface LedgerEntry {
  id: string;
  partnerId: string;
  partnerType: "Customer" | "Vendor";
  transactionType: "Invoice" | "Payment" | "Credit Note" | "Debit Note";
  reference: string;
  amount: number;
  date: string;
  description: string;
  status: "Pending" | "Completed" | "Cancelled";
}

/* ─── Unified Partner type ─── */
interface Partner {
  id: string;
  code: string;
  name: string;
  type: "Customer" | "Vendor";
  phone: string;
  email: string;
  creditLimit: number;
  outstanding: number;
  paymentTerms: string;
  status: string;
}

/* ─── Seed ledger entries ─── */
const SEED_LEDGER_ENTRIES: LedgerEntry[] = [
  { id: "le-001", partnerId: "c-001", partnerType: "Customer", transactionType: "Invoice", reference: "INV-2026-0001", amount: 969000, date: "2026-03-25", description: "Cardioprex 500mg bulk order", status: "Completed" },
  { id: "le-002", partnerId: "c-001", partnerType: "Customer", transactionType: "Payment", reference: "PAY-2026-0001", amount: 500000, date: "2026-04-01", description: "Partial payment via bank transfer", status: "Completed" },
  { id: "le-003", partnerId: "c-002", partnerType: "Customer", transactionType: "Invoice", reference: "INV-2026-0002", amount: 706800, date: "2026-04-10", description: "Diabetex XR 1000mg order", status: "Completed" },
  { id: "le-004", partnerId: "c-002", partnerType: "Customer", transactionType: "Payment", reference: "PAY-2026-0004", amount: 300000, date: "2026-04-15", description: "Partial payment — Seif Pharmacies", status: "Completed" },
  { id: "le-005", partnerId: "ve-001", partnerType: "Vendor", transactionType: "Invoice", reference: "VINV-2026-0001", amount: 1420000, date: "2026-03-10", description: "API supply — Sun Pharma", status: "Pending" },
  { id: "le-006", partnerId: "ve-002", partnerType: "Vendor", transactionType: "Payment", reference: "PAY-2026-0003", amount: 620000, date: "2026-04-05", description: "BASF excipient shipment payment", status: "Completed" },
  { id: "le-007", partnerId: "c-003", partnerType: "Customer", transactionType: "Credit Note", reference: "CN-2026-0001", amount: 45000, date: "2026-04-08", description: "Returns — damaged Antibio-Z batch", status: "Completed" },
  { id: "le-008", partnerId: "ve-003", partnerType: "Vendor", transactionType: "Debit Note", reference: "DN-2026-0001", amount: 28000, date: "2026-04-12", description: "Quality claim — Schott Glass defects", status: "Pending" },
];

const fmt = (n: number) =>
  `EGP ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PartnerLedgerPage() {
  const store = useDataStore();

  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>(SEED_LEDGER_ENTRIES);
  const [filters, setFilters] = useState<FilterState>({});
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LedgerEntry | null>(null);
  const [detailPartner, setDetailPartner] = useState<Partner | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "ledger" | "invoices" | "payments" | "statement">("overview");

  let _nextId = Date.now();
  const genId = (p: string) => `${p}-${(_nextId++).toString(36).slice(-6)}`;

  /* ─── Build unified partner list ─── */
  const partners: Partner[] = useMemo(() => {
    const customerPartners: Partner[] = store.customers.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      type: "Customer" as const,
      phone: c.phone,
      email: c.email,
      creditLimit: c.creditLimit,
      outstanding: c.outstanding,
      paymentTerms: c.paymentTerms,
      status: c.status === "ACTIVE" ? "Active" : "Inactive",
    }));

    const vendorPartners: Partner[] = store.vendors.map((v) => ({
      id: v.id,
      code: v.code,
      name: v.name,
      type: "Vendor" as const,
      phone: v.phone,
      email: v.email,
      creditLimit: 0,
      outstanding: v.outstanding,
      paymentTerms: v.paymentTerms,
      status: "Active",
    }));

    return [...customerPartners, ...vendorPartners];
  }, [store.customers, store.vendors]);

  /* ─── Stats ─── */
  const totalPartners = partners.length;
  const totalReceivables = useMemo(
    () => store.customers.reduce((s, c) => s + c.outstanding, 0),
    [store.customers]
  );
  const totalPayables = useMemo(
    () => store.vendors.reduce((s, v) => s + v.outstanding, 0),
    [store.vendors]
  );
  const netPosition = totalReceivables - totalPayables;

  /* ─── Filtered partners ─── */
  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !p.code.toLowerCase().includes(q)
        )
          return false;
      }
      if (filters.type && p.type !== filters.type) return false;
      if (filters.status && p.status !== filters.status) return false;
      return true;
    });
  }, [partners, search, filters]);

  /* ─── CRUD: Ledger Entry ─── */
  const partnerOptions = partners.map((p) => ({
    label: `${p.name} (${p.type})`,
    value: p.id,
  }));

  const ledgerFields: EntityField[] = [
    {
      name: "partnerId",
      label: "Partner",
      type: "select",
      required: true,
      options: partnerOptions,
    },
    {
      name: "transactionType",
      label: "Transaction Type",
      type: "select",
      required: true,
      options: [
        { label: "Invoice", value: "Invoice" },
        { label: "Payment", value: "Payment" },
        { label: "Credit Note", value: "Credit Note" },
        { label: "Debit Note", value: "Debit Note" },
      ],
    },
    { name: "reference", label: "Reference Number", type: "text", required: true },
    { name: "amount", label: "Amount (EGP)", type: "number", required: true },
    { name: "date", label: "Date", type: "date", required: true },
    { name: "description", label: "Description", type: "textarea", required: true, fullWidth: true },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { label: "Pending", value: "Pending" },
        { label: "Completed", value: "Completed" },
        { label: "Cancelled", value: "Cancelled" },
      ],
    },
  ];

  function handleCreateEntry() {
    setEditing(null);
    setShowModal(true);
  }

  function handleEditEntry(entry: LedgerEntry) {
    setEditing(entry);
    setShowModal(true);
  }

  function handleSubmitEntry(data: EntityFormData) {
    const partner = partners.find((p) => p.id === String(data.partnerId));
    const partnerType = partner?.type || "Customer";

    if (editing) {
      setLedgerEntries((prev) =>
        prev.map((e) =>
          e.id === editing.id
            ? {
                ...e,
                partnerId: String(data.partnerId),
                partnerType: partnerType,
                transactionType: data.transactionType as LedgerEntry["transactionType"],
                reference: String(data.reference),
                amount: Number(data.amount),
                date: String(data.date),
                description: String(data.description),
                status: data.status as LedgerEntry["status"],
              }
            : e
        )
      );
    } else {
      setLedgerEntries((prev) => [
        ...prev,
        {
          id: genId("le"),
          partnerId: String(data.partnerId),
          partnerType: partnerType,
          transactionType: data.transactionType as LedgerEntry["transactionType"],
          reference: String(data.reference),
          amount: Number(data.amount),
          date: String(data.date),
          description: String(data.description),
          status: (data.status as LedgerEntry["status"]) || "Pending",
        },
      ]);
    }
    setShowModal(false);
    setEditing(null);
  }

  function handleDeleteEntry(entry: LedgerEntry) {
    setLedgerEntries((prev) => prev.filter((e) => e.id !== entry.id));
  }

  /* ─── Detail helpers ─── */
  const getPartnerInvoices = (partnerId: string) =>
    store.invoices.filter((inv) => inv.customerId === partnerId);

  const getPartnerLedgerEntries = (partnerId: string) =>
    ledgerEntries.filter((le) => le.partnerId === partnerId);

  const getCrmAccount = (partnerName: string) => {
    // Cross-module: no CRM accounts in data store, so we return null.
    // In a real setup, we'd look up store.crmAccounts by name.
    return null as { name: string; industry: string; type: string; owner: string; status: string } | null;
  };

  /* ─── Columns ─── */
  const columns: Column<Record<string, unknown>>[] = [
    {
      key: "code",
      label: "Partner Code",
      render: (v: unknown) => (
        <span className="font-mono text-xs font-medium">{v as string}</span>
      ),
    },
    {
      key: "name",
      label: "Partner Name",
      render: (v: unknown) => <span className="font-medium">{v as string}</span>,
    },
    {
      key: "type",
      label: "Type",
      render: (v: unknown) => (
        <Badge
          variant={(v as string) === "Customer" ? "default" : "secondary"}
          className="text-xs"
        >
          {v as string}
        </Badge>
      ),
    },
    {
      key: "phone",
      label: "Phone / Email",
      render: (_: unknown, row: Record<string, unknown>) => {
        const p = row as unknown as Partner;
        return (
          <div className="text-xs space-y-0.5">
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3 text-muted-foreground" />
              {p.phone}
            </div>
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3 text-muted-foreground" />
              {p.email}
            </div>
          </div>
        );
      },
    },
    {
      key: "creditLimit",
      label: "Credit Limit",
      className: "text-right",
      render: (v: unknown, row: Record<string, unknown>) => {
        const p = row as unknown as Partner;
        return (
          <span className="text-sm">
            {p.type === "Customer" ? fmt(v as number) : "—"}
          </span>
        );
      },
    },
    {
      key: "outstanding",
      label: "Outstanding",
      className: "text-right",
      render: (v: unknown, row: Record<string, unknown>) => {
        const p = row as unknown as Partner;
        return (
          <span
            className={`font-semibold ${
              p.type === "Customer" ? "text-blue-600" : "text-red-600"
            }`}
          >
            {fmt(v as number)}
          </span>
        );
      },
    },
    {
      key: "paymentTerms",
      label: "Payment Terms",
      render: (v: unknown) => (
        <Badge variant="outline" className="text-xs">
          {v as string}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v: unknown) => <StatusBadge status={v as string} />,
    },
    {
      key: "actions",
      label: "Actions",
      className: "text-right",
      render: (_: unknown, row: Record<string, unknown>) => {
        const p = row as unknown as Partner;
        return (
          <EditDeleteMenu
            onView={() => setDetailPartner(p)}
            canView
            onEdit={() => {
              /* Navigate to add ledger entry with partner pre-selected */
              setEditing(null);
              setShowModal(true);
            }}
            canDelete={false}
            itemLabel={p.name}
            compact
            extraItems={[
              {
                label: "Add Transaction",
                onClick: () => {
                  setEditing(null);
                  setShowModal(true);
                },
                icon: <Plus className="h-3.5 w-3.5 text-blue-600" />,
              },
            ]}
          />
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partner Ledger"
        description="Track all financial transactions between the company and its partners (customers &amp; vendors)"
        actions={
          <Button onClick={handleCreateEntry}>
            <Plus className="h-4 w-4 mr-2" /> Add Ledger Entry
          </Button>
        }
      />

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={Users}
          title="Total Partners"
          value={totalPartners}
          subtitle={`${store.customers.length} customers, ${store.vendors.length} vendors`}
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatsCard
          icon={ArrowDownLeft}
          title="Total Receivables"
          value={fmt(totalReceivables)}
          subtitle="Outstanding from customers"
          iconColor="bg-green-100 text-green-600"
        />
        <StatsCard
          icon={ArrowUpRight}
          title="Total Payables"
          value={fmt(totalPayables)}
          subtitle="Owed to vendors"
          iconColor="bg-red-100 text-red-600"
        />
        <StatsCard
          icon={Scale}
          title="Net Position"
          value={fmt(netPosition)}
          subtitle={netPosition >= 0 ? "Net receivable" : "Net payable"}
          iconColor="bg-purple-100 text-purple-600"
        />
      </div>

      {/* ── Filter & Table ── */}
      <FilterBar
        searchPlaceholder="Search by partner name or code..."
        searchValue={search}
        onSearchChange={setSearch}
        fields={[
          {
            key: "type",
            label: "Type",
            type: "select",
            options: [
              { label: "Customer", value: "Customer" },
              { label: "Vendor", value: "Vendor" },
            ],
          },
          {
            key: "status",
            label: "Status",
            type: "select",
            options: [
              { label: "Active", value: "Active" },
              { label: "Inactive", value: "Inactive" },
            ],
          },
        ]}
        values={filters}
        onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
      />

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredPartners as unknown as Record<string, unknown>[]}
            exportable
            exportFilename="partner-ledger.csv"
            emptyMessage="No partners match your filters."
          />
        </CardContent>
      </Card>

      {/* ── Add / Edit Ledger Entry Modal ── */}
      <EntityFormModal
        open={showModal}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) setEditing(null);
        }}
        title={editing ? "Edit Ledger Entry" : "Add Ledger Entry"}
        fields={ledgerFields}
        initialData={
          editing
            ? {
                partnerId: editing.partnerId,
                transactionType: editing.transactionType,
                reference: editing.reference,
                amount: editing.amount,
                date: editing.date,
                description: editing.description,
                status: editing.status,
              }
            : undefined
        }
        onSubmit={handleSubmitEntry}
        submitLabel={editing ? "Save" : "Create"}
        size="lg"
      />

      {/* ── Partner Detail Dialog with Tabs ── */}
      <Dialog
        open={!!detailPartner}
        onOpenChange={(open) => {
          if (!open) { setDetailPartner(null); setDetailTab("overview"); }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Building2 className="h-5 w-5" />
              <span>{detailPartner?.name}</span>
              {detailPartner && (
                <>
                  <Badge variant={detailPartner.type === "Customer" ? "default" : "secondary"}>{detailPartner.type}</Badge>
                  <StatusBadge status={detailPartner.status} />
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {detailPartner && <PartnerDetailContent
            partner={detailPartner}
            tab={detailTab}
            setTab={setDetailTab}
            ledgerEntries={getPartnerLedgerEntries(detailPartner.id)}
            invoices={getPartnerInvoices(detailPartner.id)}
            payments={store.payments.filter((p) =>
              p.customerId === detailPartner.id || p.vendorId === detailPartner.id
            )}
            fmt={fmt}
          />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Partner Detail Tabs Component ─── */
type DetailTab = "overview" | "ledger" | "invoices" | "payments" | "statement";

function PartnerDetailContent({
  partner,
  tab,
  setTab,
  ledgerEntries,
  invoices,
  payments,
  fmt,
}: {
  partner: Partner;
  tab: DetailTab;
  setTab: (t: DetailTab) => void;
  ledgerEntries: LedgerEntry[];
  invoices: Invoice[];
  payments: PaymentType[];
  fmt: (n: number) => string;
}) {
  const tabs: { id: DetailTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "ledger", label: "Ledger" },
    { id: "invoices", label: "Invoices" },
    { id: "payments", label: "Payments" },
    { id: "statement", label: "Statement" },
  ];

  const totalDebits = ledgerEntries
    .filter((e) => e.transactionType === "Invoice" || e.transactionType === "Debit Note")
    .reduce((s, e) => s + e.amount, 0);
  const totalCredits = ledgerEntries
    .filter((e) => e.transactionType === "Payment" || e.transactionType === "Credit Note")
    .reduce((s, e) => s + e.amount, 0);
  const balance = totalDebits - totalCredits;

  const sortedEntries = [...ledgerEntries].sort((a, b) => a.date.localeCompare(b.date));
  let runningBalance = 0;
  const entriesWithBalance = sortedEntries.map((e) => {
    const isDebit = e.transactionType === "Invoice" || e.transactionType === "Debit Note";
    runningBalance += isDebit ? e.amount : -e.amount;
    return { ...e, debit: isDebit ? e.amount : 0, credit: isDebit ? 0 : e.amount, runningBalance };
  });

  const agingBuckets = [
    { label: "Current", amount: Math.round(balance * 0.35), color: "bg-green-500" },
    { label: "1-30 days", amount: Math.round(balance * 0.25), color: "bg-blue-500" },
    { label: "31-60 days", amount: Math.round(balance * 0.20), color: "bg-yellow-500" },
    { label: "61-90 days", amount: Math.round(balance * 0.12), color: "bg-orange-500" },
    { label: "90+ days", amount: Math.round(balance * 0.08), color: "bg-red-500" },
  ];
  const maxAging = Math.max(...agingBuckets.map((b) => Math.abs(b.amount)), 1);

  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + i.total, 0);
  const totalOutstanding = totalInvoiced - totalPaid;

  const totalReceived = payments.filter((p) => p.type === "RECEIVED").reduce((s, p) => s + p.amount, 0);
  const totalSent = payments.filter((p) => p.type === "SENT").reduce((s, p) => s + p.amount, 0);

  function downloadStatement() {
    const lines = [
      ["Account Statement"],
      [`Partner: ${partner.name} (${partner.type})`],
      [`Date: ${new Date().toLocaleDateString()}`],
      [""],
      ["Date", "Reference", "Type", "Description", "Debit", "Credit", "Balance"],
      ...entriesWithBalance.map((e) => [
        e.date, e.reference, e.transactionType, e.description,
        e.debit ? e.debit.toFixed(2) : "", e.credit ? e.credit.toFixed(2) : "",
        e.runningBalance.toFixed(2),
      ]),
      [""],
      ["", "", "", "Totals:", totalDebits.toFixed(2), totalCredits.toFixed(2), balance.toFixed(2)],
    ];
    const csv = lines.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `statement-${partner.code}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 pt-2">
      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex gap-1 -mb-px">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="pt-4 text-center"><div className="text-xs text-muted-foreground">Total Debit</div><div className="text-lg font-bold text-red-600">{fmt(totalDebits)}</div></CardContent></Card>
            <Card><CardContent className="pt-4 text-center"><div className="text-xs text-muted-foreground">Total Credit</div><div className="text-lg font-bold text-green-600">{fmt(totalCredits)}</div></CardContent></Card>
            <Card><CardContent className="pt-4 text-center"><div className="text-xs text-muted-foreground">Current Balance</div><div className="text-lg font-bold">{fmt(balance)}</div></CardContent></Card>
            <Card><CardContent className="pt-4 text-center"><div className="text-xs text-muted-foreground">Transactions</div><div className="text-lg font-bold">{ledgerEntries.length}</div></CardContent></Card>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">Partner Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Code</span><span className="font-mono">{partner.code}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{partner.phone}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{partner.email}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Payment Terms</span><span>{partner.paymentTerms}</span></div>
                {partner.type === "Customer" && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Credit Limit</span><span className="font-semibold">{fmt(partner.creditLimit)}</span></div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Aging Analysis</h4>
              <div className="space-y-2">
                {agingBuckets.map((b) => (
                  <div key={b.label} className="flex items-center gap-2 text-xs">
                    <span className="w-16 text-muted-foreground">{b.label}</span>
                    <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-full ${b.color} rounded-full transition-all`}
                        style={{ width: `${Math.max((Math.abs(b.amount) / maxAging) * 100, 2)}%` }}
                      />
                    </div>
                    <span className="w-24 text-right font-mono">{fmt(Math.abs(b.amount))}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Tab */}
      {tab === "ledger" && (
        <div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-medium">Date</th>
                  <th className="text-left p-2 font-medium">Reference</th>
                  <th className="text-left p-2 font-medium">Type</th>
                  <th className="text-left p-2 font-medium">Description</th>
                  <th className="text-right p-2 font-medium text-red-600">Debit</th>
                  <th className="text-right p-2 font-medium text-green-600">Credit</th>
                  <th className="text-right p-2 font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {entriesWithBalance.length === 0 ? (
                  <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No ledger entries found</td></tr>
                ) : (
                  entriesWithBalance.map((e) => (
                    <tr key={e.id} className="border-t hover:bg-muted/30">
                      <td className="p-2 text-xs">{e.date}</td>
                      <td className="p-2 font-mono text-xs">{e.reference}</td>
                      <td className="p-2"><Badge variant="outline" className="text-xs">{e.transactionType}</Badge></td>
                      <td className="p-2 text-xs max-w-[200px] truncate">{e.description}</td>
                      <td className="p-2 text-right font-semibold text-red-600">{e.debit ? fmt(e.debit) : ""}</td>
                      <td className="p-2 text-right font-semibold text-green-600">{e.credit ? fmt(e.credit) : ""}</td>
                      <td className="p-2 text-right font-bold">{fmt(e.runningBalance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {entriesWithBalance.length > 0 && (
                <tfoot className="bg-muted/30 font-semibold">
                  <tr className="border-t-2">
                    <td colSpan={4} className="p-2 text-right">Totals:</td>
                    <td className="p-2 text-right text-red-600">{fmt(totalDebits)}</td>
                    <td className="p-2 text-right text-green-600">{fmt(totalCredits)}</td>
                    <td className="p-2 text-right font-bold">{fmt(balance)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Invoices Tab */}
      {tab === "invoices" && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="pt-3 text-center"><div className="text-xs text-muted-foreground">Total Invoiced</div><div className="text-lg font-bold">{fmt(totalInvoiced)}</div></CardContent></Card>
            <Card><CardContent className="pt-3 text-center"><div className="text-xs text-muted-foreground">Total Paid</div><div className="text-lg font-bold text-green-600">{fmt(totalPaid)}</div></CardContent></Card>
            <Card><CardContent className="pt-3 text-center"><div className="text-xs text-muted-foreground">Outstanding</div><div className="text-lg font-bold text-red-600">{fmt(totalOutstanding)}</div></CardContent></Card>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-medium">Invoice #</th>
                  <th className="text-left p-2 font-medium">Date</th>
                  <th className="text-left p-2 font-medium">Due Date</th>
                  <th className="text-right p-2 font-medium">Total</th>
                  <th className="text-left p-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No invoices found for this partner</td></tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="border-t hover:bg-muted/30">
                      <td className="p-2 font-mono text-xs font-medium">{inv.number}</td>
                      <td className="p-2 text-xs">{new Date(inv.date).toLocaleDateString()}</td>
                      <td className="p-2 text-xs">{new Date(inv.dueDate).toLocaleDateString()}</td>
                      <td className="p-2 text-right font-semibold">{fmt(inv.total)}</td>
                      <td className="p-2"><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {tab === "payments" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Card><CardContent className="pt-3 text-center"><div className="text-xs text-muted-foreground">Total Received</div><div className="text-lg font-bold text-green-600">{fmt(totalReceived)}</div></CardContent></Card>
            <Card><CardContent className="pt-3 text-center"><div className="text-xs text-muted-foreground">Total Sent</div><div className="text-lg font-bold text-red-600">{fmt(totalSent)}</div></CardContent></Card>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-medium">Date</th>
                  <th className="text-left p-2 font-medium">Reference</th>
                  <th className="text-left p-2 font-medium">Method</th>
                  <th className="text-left p-2 font-medium">Type</th>
                  <th className="text-right p-2 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No payments found for this partner</td></tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="border-t hover:bg-muted/30">
                      <td className="p-2 text-xs">{new Date(p.date).toLocaleDateString()}</td>
                      <td className="p-2 font-mono text-xs">{p.reference}</td>
                      <td className="p-2"><Badge variant="outline" className="text-xs">{p.method.replace(/_/g, " ")}</Badge></td>
                      <td className="p-2"><Badge variant={p.type === "RECEIVED" ? "default" : "secondary"} className="text-xs">{p.type}</Badge></td>
                      <td className={`p-2 text-right font-semibold ${p.type === "RECEIVED" ? "text-green-600" : "text-red-600"}`}>{fmt(p.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Statement Tab */}
      {tab === "statement" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={downloadStatement}>
              <Download className="h-4 w-4 mr-1" /> Download Statement (CSV)
            </Button>
          </div>
          <div className="border rounded-lg p-6 space-y-4 bg-white">
            <div className="text-center border-b pb-4">
              <h2 className="text-xl font-bold">Account Statement</h2>
              <p className="text-sm text-muted-foreground">Pharma Egypt S.A.E.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm border-b pb-4">
              <div>
                <p className="font-semibold">{partner.name}</p>
                <p className="text-muted-foreground">{partner.type} · {partner.code}</p>
                <p className="text-muted-foreground">{partner.email}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Statement Date</p>
                <p className="font-semibold">{new Date().toLocaleDateString()}</p>
                <p className="text-muted-foreground mt-1">Payment Terms</p>
                <p className="font-semibold">{partner.paymentTerms}</p>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Reference</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-right p-2">Debit</th>
                  <th className="text-right p-2">Credit</th>
                  <th className="text-right p-2">Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b bg-slate-50/50">
                  <td colSpan={5} className="p-2 font-semibold">Opening Balance</td>
                  <td className="p-2 text-right font-semibold">{fmt(0)}</td>
                </tr>
                {entriesWithBalance.map((e) => (
                  <tr key={e.id} className="border-b">
                    <td className="p-2 text-xs">{e.date}</td>
                    <td className="p-2 font-mono text-xs">{e.reference}</td>
                    <td className="p-2 text-xs">{e.description}</td>
                    <td className="p-2 text-right text-red-600">{e.debit ? fmt(e.debit) : ""}</td>
                    <td className="p-2 text-right text-green-600">{e.credit ? fmt(e.credit) : ""}</td>
                    <td className="p-2 text-right font-medium">{fmt(e.runningBalance)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 bg-slate-50 font-bold">
                  <td colSpan={3} className="p-2 text-right">Closing Balance</td>
                  <td className="p-2 text-right text-red-600">{fmt(totalDebits)}</td>
                  <td className="p-2 text-right text-green-600">{fmt(totalCredits)}</td>
                  <td className="p-2 text-right text-lg">{fmt(balance)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
