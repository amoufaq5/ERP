"use client";

import { useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import StatusBadge from "@/components/shared/status-badge";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import {
  EntityFormModal,
  type EntityField,
  type EntityFormData,
} from "@/components/shared/entity-form-modal";
import { CustomerLink, VendorLink } from "@/components/shared/entity-detail-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDataStore,
  type Customer,
  type CustomerDocument,
  type Vendor,
  type Invoice,
  type Payment,
  type Cheque,
  type SalesOrder,
  type PurchaseOrder,
  type GoodsReceipt,
  type BankAccount,
} from "@/lib/data-store";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Building2,
  CreditCard,
  FileText,
  DollarSign,
  TrendingUp,
  Download,
  Upload,
  Eye,
  Trash2,
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  Plus,
} from "lucide-react";

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

/* ─── Unified Partner type (for list view) ─── */
interface PartnerListItem {
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

const DOCUMENT_TYPES = [
  "Registration Certificate",
  "Tax Card",
  "Commercial Register",
  "VAT Certificate",
  "ID / Passport",
  "Power of Attorney",
  "Bank Letter",
  "Contract",
  "Other",
];

const fmt = (n: number) =>
  `EGP ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const egp = (n: number) => `EGP ${n.toLocaleString()}`;

export default function PartnerDetailPage() {
  const searchParams = useSearchParams();
  const store = useDataStore();

  const partnerType = searchParams.get("type") as "customer" | "vendor" | null;
  const partnerId = searchParams.get("id");

  // If we have type+id params, show the individual partner detail view
  // Otherwise show the partner list view
  const hasPartnerParams = partnerType && partnerId;

  if (hasPartnerParams) {
    return <PartnerIndividualDetail partnerType={partnerType} partnerId={partnerId} />;
  }

  return <PartnerListView />;
}

/* =====================================================================================
   PARTNER LIST VIEW
   (Merged from partner-ledger page: unified partner list with stats, filters, CRUD)
   ===================================================================================== */
function PartnerListView() {
  const store = useDataStore();

  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>(SEED_LEDGER_ENTRIES);
  const [filters, setFilters] = useState<FilterState>({});
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LedgerEntry | null>(null);
  const [detailPartner, setDetailPartner] = useState<PartnerListItem | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "ledger" | "invoices" | "payments" | "statement">("overview");

  let _nextId = Date.now();
  const genId = (p: string) => `${p}-${(_nextId++).toString(36).slice(-6)}`;

  /* ─── Build unified partner list ─── */
  const partners: PartnerListItem[] = useMemo(() => {
    const customerPartners: PartnerListItem[] = store.customers.map((c) => ({
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

    const vendorPartners: PartnerListItem[] = store.vendors.map((v) => ({
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
    const partnerTypeVal = partner?.type || "Customer";

    if (editing) {
      setLedgerEntries((prev) =>
        prev.map((e) =>
          e.id === editing.id
            ? {
                ...e,
                partnerId: String(data.partnerId),
                partnerType: partnerTypeVal,
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
          partnerType: partnerTypeVal,
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
  const getPartnerInvoices = (pId: string) =>
    store.invoices.filter((inv) => inv.customerId === pId);

  const getPartnerLedgerEntries = (pId: string) =>
    ledgerEntries.filter((le) => le.partnerId === pId);

  /* ─── Partner list columns ─── */
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
      render: (_v: unknown, row: Record<string, unknown>) => {
        const p = row as unknown as PartnerListItem;
        if (p.type === "Customer") return <CustomerLink customerId={p.id} />;
        return <VendorLink vendorId={p.id} />;
      },
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
        const p = row as unknown as PartnerListItem;
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
        const p = row as unknown as PartnerListItem;
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
        const p = row as unknown as PartnerListItem;
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
        const p = row as unknown as PartnerListItem;
        return (
          <EditDeleteMenu
            onView={() => setDetailPartner(p)}
            canView
            onEdit={() => {
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
        title="Partner Details"
        description="Manage partner ledger, transactions, and account details"
        actions={
          <Button onClick={handleCreateEntry}>
            <Plus className="h-4 w-4 mr-2" /> Add Ledger Entry
          </Button>
        }
      />

      {/* Stats */}
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

      {/* Filter & Table */}
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

      {/* Add / Edit Ledger Entry Modal */}
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

      {/* Partner Detail Dialog with Tabs */}
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
          {detailPartner && <PartnerDialogContent
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

/* =====================================================================================
   PARTNER DIALOG CONTENT (tabs: Overview, Ledger, Invoices, Payments, Statement)
   Shown when clicking "View" on a partner row in the list
   ===================================================================================== */
type DetailTab = "overview" | "ledger" | "invoices" | "payments" | "statement";

function PartnerDialogContent({
  partner,
  tab,
  setTab,
  ledgerEntries,
  invoices,
  payments,
  fmt: fmtFn,
}: {
  partner: PartnerListItem;
  tab: DetailTab;
  setTab: (t: DetailTab) => void;
  ledgerEntries: LedgerEntry[];
  invoices: Invoice[];
  payments: Payment[];
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
            <Card><CardContent className="pt-4 text-center"><div className="text-xs text-muted-foreground">Total Debit</div><div className="text-lg font-bold text-red-600">{fmtFn(totalDebits)}</div></CardContent></Card>
            <Card><CardContent className="pt-4 text-center"><div className="text-xs text-muted-foreground">Total Credit</div><div className="text-lg font-bold text-green-600">{fmtFn(totalCredits)}</div></CardContent></Card>
            <Card><CardContent className="pt-4 text-center"><div className="text-xs text-muted-foreground">Current Balance</div><div className="text-lg font-bold">{fmtFn(balance)}</div></CardContent></Card>
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
                  <div className="flex justify-between"><span className="text-muted-foreground">Credit Limit</span><span className="font-semibold">{fmtFn(partner.creditLimit)}</span></div>
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
                    <span className="w-24 text-right font-mono">{fmtFn(Math.abs(b.amount))}</span>
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
                      <td className="p-2 text-right font-semibold text-red-600">{e.debit ? fmtFn(e.debit) : ""}</td>
                      <td className="p-2 text-right font-semibold text-green-600">{e.credit ? fmtFn(e.credit) : ""}</td>
                      <td className="p-2 text-right font-bold">{fmtFn(e.runningBalance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {entriesWithBalance.length > 0 && (
                <tfoot className="bg-muted/30 font-semibold">
                  <tr className="border-t-2">
                    <td colSpan={4} className="p-2 text-right">Totals:</td>
                    <td className="p-2 text-right text-red-600">{fmtFn(totalDebits)}</td>
                    <td className="p-2 text-right text-green-600">{fmtFn(totalCredits)}</td>
                    <td className="p-2 text-right font-bold">{fmtFn(balance)}</td>
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
            <Card><CardContent className="pt-3 text-center"><div className="text-xs text-muted-foreground">Total Invoiced</div><div className="text-lg font-bold">{fmtFn(totalInvoiced)}</div></CardContent></Card>
            <Card><CardContent className="pt-3 text-center"><div className="text-xs text-muted-foreground">Total Paid</div><div className="text-lg font-bold text-green-600">{fmtFn(totalPaid)}</div></CardContent></Card>
            <Card><CardContent className="pt-3 text-center"><div className="text-xs text-muted-foreground">Outstanding</div><div className="text-lg font-bold text-red-600">{fmtFn(totalOutstanding)}</div></CardContent></Card>
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
                      <td className="p-2 text-right font-semibold">{fmtFn(inv.total)}</td>
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
            <Card><CardContent className="pt-3 text-center"><div className="text-xs text-muted-foreground">Total Received</div><div className="text-lg font-bold text-green-600">{fmtFn(totalReceived)}</div></CardContent></Card>
            <Card><CardContent className="pt-3 text-center"><div className="text-xs text-muted-foreground">Total Sent</div><div className="text-lg font-bold text-red-600">{fmtFn(totalSent)}</div></CardContent></Card>
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
                      <td className={`p-2 text-right font-semibold ${p.type === "RECEIVED" ? "text-green-600" : "text-red-600"}`}>{fmtFn(p.amount)}</td>
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
                <p className="text-muted-foreground">{partner.type} &middot; {partner.code}</p>
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
                  <td className="p-2 text-right font-semibold">{fmtFn(0)}</td>
                </tr>
                {entriesWithBalance.map((e) => (
                  <tr key={e.id} className="border-b">
                    <td className="p-2 text-xs">{e.date}</td>
                    <td className="p-2 font-mono text-xs">{e.reference}</td>
                    <td className="p-2 text-xs">{e.description}</td>
                    <td className="p-2 text-right text-red-600">{e.debit ? fmtFn(e.debit) : ""}</td>
                    <td className="p-2 text-right text-green-600">{e.credit ? fmtFn(e.credit) : ""}</td>
                    <td className="p-2 text-right font-medium">{fmtFn(e.runningBalance)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 bg-slate-50 font-bold">
                  <td colSpan={3} className="p-2 text-right">Closing Balance</td>
                  <td className="p-2 text-right text-red-600">{fmtFn(totalDebits)}</td>
                  <td className="p-2 text-right text-green-600">{fmtFn(totalCredits)}</td>
                  <td className="p-2 text-right text-lg">{fmtFn(balance)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* =====================================================================================
   PARTNER INDIVIDUAL DETAIL VIEW
   (Original partner-detail: full detail page for a single partner accessed via query params)
   ===================================================================================== */
function PartnerIndividualDetail({ partnerType, partnerId }: { partnerType: "customer" | "vendor"; partnerId: string }) {
  const store = useDataStore();

  const [docType, setDocType] = useState("Registration Certificate");
  const docInputRef = useRef<HTMLInputElement>(null);

  // Look up partner
  const customer = partnerType === "customer"
    ? store.customers.find((c) => c.id === partnerId)
    : null;
  const vendor = partnerType === "vendor"
    ? store.vendors.find((v) => v.id === partnerId)
    : null;

  const partner = customer ?? vendor;
  const isCustomer = !!customer;

  // Related data
  const invoices = useMemo(() => {
    if (!partnerId) return [];
    if (isCustomer) return store.invoices.filter((i) => i.customerId === partnerId);
    return [];
  }, [store.invoices, partnerId, isCustomer]);

  const payments = useMemo(() => {
    if (!partnerId) return [];
    if (isCustomer) return store.payments.filter((p) => p.customerId === partnerId);
    return store.payments.filter((p) => p.vendorId === partnerId);
  }, [store.payments, partnerId, isCustomer]);

  const cheques = useMemo(() => {
    if (!partner) return [];
    return store.cheques.filter((c) => c.partyName === partner.name);
  }, [store.cheques, partner]);

  const salesOrders = useMemo(() => {
    if (!isCustomer || !partnerId) return [];
    return store.salesOrders.filter((so) => so.customerId === partnerId);
  }, [store.salesOrders, partnerId, isCustomer]);

  const purchaseOrders = useMemo(() => {
    if (isCustomer || !partnerId) return [];
    return store.purchaseOrders.filter((po) => po.vendorId === partnerId);
  }, [store.purchaseOrders, partnerId, isCustomer]);

  const goodsReceipts = useMemo(() => {
    if (isCustomer || !partnerId) return [];
    return store.goodsReceipts.filter((grn) => grn.vendorId === partnerId);
  }, [store.goodsReceipts, partnerId, isCustomer]);

  // Vendor invoices: invoices linked from purchase orders
  const vendorInvoices = useMemo(() => {
    if (isCustomer || !partnerId) return [];
    const invoiceIds = purchaseOrders.filter((po) => po.invoiceId).map((po) => po.invoiceId!);
    return store.invoices.filter((inv) => invoiceIds.includes(inv.id));
  }, [store.invoices, purchaseOrders, partnerId, isCustomer]);

  // Bank accounts linked through payments
  const linkedBankAccounts = useMemo(() => {
    const bankIds = new Set<string>();
    payments.forEach((p) => { if (p.bankAccountId) bankIds.add(p.bankAccountId); });
    return store.bankAccounts.filter((b) => bankIds.has(b.id));
  }, [payments, store.bankAccounts]);

  // Financial summary
  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = partner ? ("outstanding" in partner ? partner.outstanding : 0) : 0;
  const creditLimit = customer ? customer.creditLimit : 0;

  // Ledger entries
  const ledgerEntries = useMemo(() => {
    if (!partner) return [];
    const lines: { date: string; description: string; ref: string; debit: number; credit: number; type: string }[] = [];
    invoices.forEach((i) => lines.push({
      date: i.date.slice(0, 10),
      description: `Invoice ${i.number}`,
      ref: i.number,
      debit: i.total,
      credit: 0,
      type: "Invoice",
    }));
    payments.forEach((p) => lines.push({
      date: p.date,
      description: `Payment ${p.reference}`,
      ref: p.reference,
      debit: 0,
      credit: p.amount,
      type: "Payment",
    }));
    cheques.forEach((c) => lines.push({
      date: c.issueDate.slice(0, 10),
      description: `Cheque ${c.number} (${c.status})`,
      ref: c.number,
      debit: c.type === "OUTGOING" ? c.amount : 0,
      credit: c.type === "INCOMING" ? c.amount : 0,
      type: "Cheque",
    }));
    lines.sort((a, b) => a.date.localeCompare(b.date));
    let balance = 0;
    return lines.map((l) => { balance += l.debit - l.credit; return { ...l, balance }; });
  }, [partner, invoices, payments, cheques]);

  // Document helpers (customer only)
  function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !customer) return;
    const reader = new FileReader();
    reader.onload = () => {
      const newDoc: CustomerDocument = {
        id: store.genId("cdoc"),
        name: file.name,
        type: docType,
        data: reader.result as string,
        uploadedAt: new Date().toISOString(),
      };
      const existing = customer.documents ?? [];
      store.update("customers", customer.id, { documents: [...existing, newDoc] });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function removeDocument(docId: string) {
    if (!customer) return;
    const updated = (customer.documents ?? []).filter((d) => d.id !== docId);
    store.update("customers", customer.id, { documents: updated });
  }

  function viewDocument(doc: CustomerDocument) {
    const w = window.open("", "_blank");
    if (!w) return;
    if (doc.data.startsWith("data:image/")) {
      w.document.write(`<html><head><title>${doc.name}</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f1f1f1"><img src="${doc.data}" style="max-width:100%;max-height:100vh" /></body></html>`);
    } else if (doc.data.startsWith("data:application/pdf")) {
      w.document.write(`<html><head><title>${doc.name}</title></head><body style="margin:0"><embed src="${doc.data}" type="application/pdf" width="100%" height="100%" style="position:absolute;inset:0" /></body></html>`);
    } else {
      const a = w.document.createElement("a");
      a.href = doc.data;
      a.download = doc.name;
      a.click();
      w.close();
    }
  }

  if (!partner) {
    return (
      <div className="space-y-6">
        <PageHeader title="Partner Not Found" description="The requested partner could not be found." />
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No {partnerType ?? "partner"} found with ID: {partnerId ?? "none"}</p>
          <Link href="/erp/partner-detail">
            <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Partners</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/erp/partner-detail">
            <Button variant="ghost" size="sm" className="mt-1"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{partner.name}</h1>
              <Badge variant="outline" className="font-mono text-xs">{"code" in partner ? partner.code : ""}</Badge>
              <Badge className={isCustomer ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}>
                {isCustomer ? "Customer" : "Vendor"}
              </Badge>
              {isCustomer && customer && (
                <Badge className={
                  customer.status === "ACTIVE" ? "bg-green-100 text-green-800"
                    : customer.status === "HOLD" ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }>
                  {customer.status}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {isCustomer ? customer?.type : (vendor as Vendor)?.category} &middot; Since {new Date(partner.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Contact & Entity Info */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-medium">{partner.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium">{partner.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="font-medium">{partner.address}</p>
              </div>
            </div>
            {isCustomer && customer?.city && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">City</p>
                  <p className="font-medium">{customer.city}</p>
                </div>
              </div>
            )}
          </div>
          {/* Customer-specific details */}
          {isCustomer && customer && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mt-4 pt-4 border-t">
              {customer.buId && (
                <div>
                  <p className="text-xs text-muted-foreground">Business Unit</p>
                  <p className="font-medium">{store.businessUnits?.find((bu) => bu.id === customer.buId)?.name ?? customer.buId}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Customer Type</p>
                <p className="font-medium">{customer.type}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Credit Limit</p>
                <p className="font-medium">{egp(customer.creditLimit)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payment Terms</p>
                <p className="font-medium">{customer.paymentTerms}</p>
              </div>
            </div>
          )}
          {/* Vendor-specific details */}
          {!isCustomer && vendor && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mt-4 pt-4 border-t">
              <div>
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="font-medium">{(vendor as Vendor).category}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payment Terms</p>
                <p className="font-medium">{(vendor as Vendor).paymentTerms}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">GMP Certified</p>
                <p className="font-medium">
                  {(vendor as Vendor).gmpCertified
                    ? <Badge className="bg-green-100 text-green-800">Certified</Badge>
                    : <Badge variant="outline">Not Certified</Badge>}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="font-medium text-red-600">{egp((vendor as Vendor).outstanding)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={DollarSign}
          title="Outstanding"
          value={egp(outstanding)}
          subtitle={outstanding > 0 ? "Balance due" : "No outstanding balance"}
          iconColor="bg-red-100 text-red-600"
        />
        {isCustomer && (
          <StatsCard
            icon={CreditCard}
            title="Credit Limit"
            value={egp(creditLimit)}
            subtitle={`${((outstanding / Math.max(creditLimit, 1)) * 100).toFixed(0)}% utilized`}
            iconColor="bg-blue-100 text-blue-600"
          />
        )}
        {!isCustomer && (
          <StatsCard
            icon={FileText}
            title="GRN History"
            value={String(goodsReceipts.length)}
            subtitle={`${goodsReceipts.filter((g) => g.status === "RECEIVED" || g.status === "INSPECTED").length} received`}
            iconColor="bg-blue-100 text-blue-600"
          />
        )}
        <StatsCard
          icon={FileText}
          title={isCustomer ? "Total Invoiced" : "Total Purchases"}
          value={egp(isCustomer ? totalInvoiced : purchaseOrders.reduce((s, po) => s + po.total, 0))}
          subtitle={`${isCustomer ? invoices.length : purchaseOrders.length} ${isCustomer ? "invoices" : "POs"}`}
          iconColor="bg-amber-100 text-amber-600"
        />
        <StatsCard
          icon={TrendingUp}
          title="Total Payments"
          value={egp(totalPaid)}
          subtitle={`${payments.length} payments`}
          iconColor="bg-green-100 text-green-600"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue={isCustomer ? "invoices" : "orders"}>
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="invoices">
            Invoices ({isCustomer ? invoices.length : vendorInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
          <TabsTrigger value="cheques">Cheques ({cheques.length})</TabsTrigger>
          <TabsTrigger value="orders">
            {isCustomer ? "Sales Orders" : "Purchase Orders"} ({isCustomer ? salesOrders.length : purchaseOrders.length})
          </TabsTrigger>
          {!isCustomer && (
            <TabsTrigger value="grn">GRN History ({goodsReceipts.length})</TabsTrigger>
          )}
          <TabsTrigger value="banking">Banking ({linkedBankAccounts.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({isCustomer ? (customer?.documents ?? []).length : 0})</TabsTrigger>
          <TabsTrigger value="ledger">Ledger ({ledgerEntries.length})</TabsTrigger>
        </TabsList>

        {/* Invoices */}
        <TabsContent value="invoices" className="space-y-3">
          {isCustomer ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Customer Invoices</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <DataTable
                  columns={[
                    { key: "number", label: "Invoice #", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                    { key: "date", label: "Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                    { key: "dueDate", label: "Due Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                    { key: "subtotal", label: "Subtotal", className: "text-right", render: (v: number) => egp(v) },
                    { key: "tax", label: "Tax", className: "text-right", render: (v: number) => egp(v) },
                    { key: "total", label: "Total", className: "text-right", render: (v: number) => <span className="font-semibold">{egp(v)}</span> },
                    { key: "status", label: "Status", render: (v: string) => (
                      <Badge className={
                        v === "PAID" ? "bg-green-100 text-green-800"
                          : v === "OVERDUE" ? "bg-red-100 text-red-800"
                            : v === "VOID" ? "bg-slate-100 text-slate-800"
                              : "bg-amber-100 text-amber-800"
                      }>{v}</Badge>
                    ) },
                  ] as Column<Record<string, unknown>>[]}
                  data={invoices as unknown as Record<string, unknown>[]}
                  emptyMessage="No invoices found."
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Vendor Invoices (from Purchase Orders)</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <DataTable
                  columns={[
                    { key: "number", label: "Invoice #", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                    { key: "date", label: "Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                    { key: "dueDate", label: "Due Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                    { key: "subtotal", label: "Subtotal", className: "text-right", render: (v: number) => egp(v) },
                    { key: "tax", label: "Tax", className: "text-right", render: (v: number) => egp(v) },
                    { key: "total", label: "Total", className: "text-right", render: (v: number) => <span className="font-semibold">{egp(v)}</span> },
                    { key: "status", label: "Status", render: (v: string) => (
                      <Badge className={
                        v === "PAID" ? "bg-green-100 text-green-800"
                          : v === "OVERDUE" ? "bg-red-100 text-red-800"
                            : v === "VOID" ? "bg-slate-100 text-slate-800"
                              : "bg-amber-100 text-amber-800"
                      }>{v}</Badge>
                    ) },
                  ] as Column<Record<string, unknown>>[]}
                  data={vendorInvoices as unknown as Record<string, unknown>[]}
                  emptyMessage="No invoices linked to purchase orders for this vendor."
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments" className="space-y-3">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <DataTable
                columns={[
                  { key: "reference", label: "Reference", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "date", label: "Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                  { key: "amount", label: "Amount", className: "text-right", render: (v: number) => <span className="font-semibold">{egp(v)}</span> },
                  { key: "method", label: "Method", render: (v: string) => <Badge variant="outline" className="text-[10px]">{v}</Badge> },
                  { key: "type", label: "Type", render: (v: string) => (
                    <Badge className={v === "RECEIVED" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}>{v}</Badge>
                  ) },
                  { key: "notes", label: "Notes", render: (v: string) => <span className="text-xs text-muted-foreground">{v || "---"}</span> },
                ] as Column<Record<string, unknown>>[]}
                data={payments as unknown as Record<string, unknown>[]}
                emptyMessage="No payments found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cheques */}
        <TabsContent value="cheques" className="space-y-3">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <DataTable
                columns={[
                  { key: "number", label: "Cheque #", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "bankName", label: "Bank" },
                  { key: "type", label: "Type", render: (v: string) => (
                    <Badge className={v === "INCOMING" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}>{v}</Badge>
                  ) },
                  { key: "amount", label: "Amount", className: "text-right", render: (v: number) => <span className="font-semibold">{egp(v)}</span> },
                  { key: "issueDate", label: "Issue Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                  { key: "dueDate", label: "Due Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge className={
                      v === "CLEARED" ? "bg-green-100 text-green-800"
                        : v === "BOUNCED" ? "bg-red-100 text-red-800"
                          : v === "DEPOSITED" ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                    }>{v}</Badge>
                  ) },
                ] as Column<Record<string, unknown>>[]}
                data={cheques as unknown as Record<string, unknown>[]}
                emptyMessage="No cheques found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales / Purchase Orders */}
        <TabsContent value="orders" className="space-y-3">
          {isCustomer ? (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <DataTable
                  columns={[
                    { key: "number", label: "SO #", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                    { key: "date", label: "Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                    { key: "expectedDate", label: "Expected", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                    { key: "subtotal", label: "Subtotal", className: "text-right", render: (v: number) => egp(v) },
                    { key: "total", label: "Total", className: "text-right", render: (v: number) => <span className="font-semibold">{egp(v)}</span> },
                    { key: "status", label: "Status", render: (v: string) => <StatusBadge status={v} /> },
                  ] as Column<Record<string, unknown>>[]}
                  data={salesOrders as unknown as Record<string, unknown>[]}
                  emptyMessage="No sales orders found."
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <DataTable
                  columns={[
                    { key: "number", label: "PO #", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                    { key: "date", label: "Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                    { key: "expectedDate", label: "Expected", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                    { key: "subtotal", label: "Subtotal", className: "text-right", render: (v: number) => egp(v) },
                    { key: "total", label: "Total", className: "text-right", render: (v: number) => <span className="font-semibold">{egp(v)}</span> },
                    { key: "status", label: "Status", render: (v: string) => <StatusBadge status={v} /> },
                  ] as Column<Record<string, unknown>>[]}
                  data={purchaseOrders as unknown as Record<string, unknown>[]}
                  emptyMessage="No purchase orders found."
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* GRN History (vendor only) */}
        {!isCustomer && (
          <TabsContent value="grn" className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Goods Received Notes</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <DataTable
                  columns={[
                    { key: "number", label: "GRN #", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                    { key: "poId", label: "PO #", render: (v: string) => {
                      const po = purchaseOrders.find((p) => p.id === v);
                      return <span className="font-mono text-xs">{po?.number ?? v}</span>;
                    }},
                    { key: "date", label: "Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                    { key: "items", label: "Items", render: (v: unknown) => {
                      const items = v as GoodsReceipt["items"];
                      return <span className="text-xs">{items.length} item{items.length !== 1 ? "s" : ""}</span>;
                    }},
                    { key: "id", label: "Total Qty", render: (_v: string, row: Record<string, unknown>) => {
                      const grn = row as unknown as GoodsReceipt;
                      const totalQty = grn.items.reduce((s, item) => s + item.quantity, 0);
                      return <span className="text-xs font-medium">{totalQty}</span>;
                    }},
                    { key: "status", label: "Status", render: (v: string) => (
                      <Badge className={
                        v === "RECEIVED" ? "bg-green-100 text-green-800"
                          : v === "INSPECTED" ? "bg-blue-100 text-blue-800"
                            : v === "REJECTED" ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                      }>{v}</Badge>
                    ) },
                  ] as Column<Record<string, unknown>>[]}
                  data={goodsReceipts as unknown as Record<string, unknown>[]}
                  emptyMessage="No goods receipts found for this vendor."
                />
              </CardContent>
            </Card>
            {goodsReceipts.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-xs text-muted-foreground">Total GRNs</div>
                    <div className="text-lg font-bold">{goodsReceipts.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-xs text-muted-foreground">Received / Inspected</div>
                    <div className="text-lg font-bold text-green-600">
                      {goodsReceipts.filter((g) => g.status === "RECEIVED" || g.status === "INSPECTED").length}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-xs text-muted-foreground">Rejected</div>
                    <div className="text-lg font-bold text-red-600">
                      {goodsReceipts.filter((g) => g.status === "REJECTED").length}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        )}

        {/* Banking */}
        <TabsContent value="banking" className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Bank Accounts Used in Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {linkedBankAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No bank accounts linked to payments for this partner.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {linkedBankAccounts.map((ba) => {
                    const baPayments = payments.filter((p) => p.bankAccountId === ba.id);
                    const baTotal = baPayments.reduce((s, p) => s + p.amount, 0);
                    const baCheques = cheques.filter((c) => c.bankAccountId === ba.id);
                    return (
                      <Card key={ba.id} className="border">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-sm">{ba.name}</h4>
                              <p className="text-xs text-muted-foreground">{ba.bankName} - {ba.accountNumber}</p>
                            </div>
                            <Badge className={
                              ba.status === "ACTIVE" ? "bg-green-100 text-green-800"
                                : ba.status === "DORMANT" ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-600"
                            }>{ba.status}</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t">
                            <div>
                              <span className="text-muted-foreground">Payments via this account</span>
                              <p className="font-semibold">{baPayments.length} ({egp(baTotal)})</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Linked cheques</span>
                              <p className="font-semibold">{baCheques.length}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Currency</span>
                              <p className="font-medium">{ba.currency}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Account Balance</span>
                              <p className="font-semibold text-green-700">{egp(ba.balance)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment breakdown by method */}
          {payments.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Payment Method Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {["BANK_TRANSFER", "CHEQUE", "CASH", "CREDIT_CARD"].map((method) => {
                    const methodPayments = payments.filter((p) => p.method === method);
                    if (methodPayments.length === 0) return null;
                    const methodLabels: Record<string, string> = { BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque", CASH: "Cash", CREDIT_CARD: "Credit Card" };
                    return (
                      <div key={method} className="p-3 rounded-lg bg-muted/50 text-center">
                        <div className="text-xs text-muted-foreground">{methodLabels[method]}</div>
                        <div className="text-lg font-bold">{methodPayments.length}</div>
                        <div className="text-xs text-muted-foreground">{egp(methodPayments.reduce((s, p) => s + p.amount, 0))}</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents" className="space-y-3">
          {isCustomer && customer ? (
            <div className="space-y-4">
              {/* Upload section */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium">Upload New Document</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground mb-1 block">Document Type</Label>
                      <Select value={docType} onValueChange={setDocType}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DOCUMENT_TYPES.map((dt) => (
                            <SelectItem key={dt} value={dt}>{dt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <input
                        ref={docInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                        className="hidden"
                        onChange={handleDocUpload}
                      />
                      <Button size="sm" onClick={() => docInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-1" /> Choose File
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Document list */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Uploaded Documents ({(customer.documents ?? []).length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  {(customer.documents ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No documents uploaded yet.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-2 text-left">Name</th>
                          <th className="px-4 py-2 text-left">Type</th>
                          <th className="px-4 py-2 text-left">Uploaded</th>
                          <th className="px-4 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(customer.documents ?? []).map((doc) => (
                          <tr key={doc.id} className="hover:bg-muted/30">
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                                <span className="truncate max-w-[250px]">{doc.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <Badge variant="outline" className="text-[10px]">{doc.type}</Badge>
                            </td>
                            <td className="px-4 py-2 text-xs text-muted-foreground">
                              {new Date(doc.uploadedAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <div className="flex items-center gap-1 justify-end">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => viewDocument(doc)} title="View">
                                  <Eye className="h-3.5 w-3.5 text-blue-600" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                                  const a = document.createElement("a");
                                  a.href = doc.data;
                                  a.download = doc.name;
                                  a.click();
                                }} title="Download">
                                  <Download className="h-3.5 w-3.5 text-green-600" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeDocument(doc.id)} title="Delete">
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Document uploads are only available for customers.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Ledger */}
        <TabsContent value="ledger" className="space-y-3">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {ledgerEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No transactions found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Description</th>
                      <th className="px-3 py-2 text-left">Ref</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-right">Debit</th>
                      <th className="px-3 py-2 text-right">Credit</th>
                      <th className="px-3 py-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ledgerEntries.map((entry, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono text-xs">{entry.date}</td>
                        <td className="px-3 py-2">{entry.description}</td>
                        <td className="px-3 py-2 font-mono text-xs">{entry.ref}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className="text-[10px]">{entry.type}</Badge>
                        </td>
                        <td className="px-3 py-2 text-right text-red-600">
                          {entry.debit > 0 ? egp(entry.debit) : "---"}
                        </td>
                        <td className="px-3 py-2 text-right text-green-600">
                          {entry.credit > 0 ? egp(entry.credit) : "---"}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">
                          {egp(entry.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30 font-semibold">
                    <tr>
                      <td colSpan={4} className="px-3 py-2">Total</td>
                      <td className="px-3 py-2 text-right text-red-600">
                        {egp(ledgerEntries.reduce((s, l) => s + l.debit, 0))}
                      </td>
                      <td className="px-3 py-2 text-right text-green-600">
                        {egp(ledgerEntries.reduce((s, l) => s + l.credit, 0))}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {ledgerEntries.length > 0 ? egp(ledgerEntries[ledgerEntries.length - 1].balance) : egp(0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
