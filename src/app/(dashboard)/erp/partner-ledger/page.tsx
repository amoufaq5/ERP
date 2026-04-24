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
import { useDataStore } from "@/lib/data-store";

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

      {/* ── Partner Detail Dialog ── */}
      <Dialog
        open={!!detailPartner}
        onOpenChange={(open) => {
          if (!open) setDetailPartner(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {detailPartner?.name}
            </DialogTitle>
          </DialogHeader>
          {detailPartner && (() => {
            const partnerInvoices = getPartnerInvoices(detailPartner.id);
            const partnerEntries = getPartnerLedgerEntries(detailPartner.id);
            const crmAccount = getCrmAccount(detailPartner.name);

            const totalDebits = partnerEntries
              .filter((e) => e.transactionType === "Invoice" || e.transactionType === "Debit Note")
              .reduce((s, e) => s + e.amount, 0);
            const totalCredits = partnerEntries
              .filter((e) => e.transactionType === "Payment" || e.transactionType === "Credit Note")
              .reduce((s, e) => s + e.amount, 0);

            return (
              <div className="space-y-6 py-4">
                {/* Partner Info */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Partner Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Code</span>
                      <p className="font-mono font-medium">{detailPartner.code}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Type</span>
                      <p>
                        <Badge variant={detailPartner.type === "Customer" ? "default" : "secondary"}>
                          {detailPartner.type}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Phone</span>
                      <p className="font-medium">{detailPartner.phone}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Email</span>
                      <p className="font-medium">{detailPartner.email}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Payment Terms</span>
                      <p className="font-medium">{detailPartner.paymentTerms}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Status</span>
                      <p><StatusBadge status={detailPartner.status} /></p>
                    </div>
                    {detailPartner.type === "Customer" && (
                      <div>
                        <span className="text-sm text-muted-foreground">Credit Limit</span>
                        <p className="font-semibold">{fmt(detailPartner.creditLimit)}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm text-muted-foreground">Outstanding Balance</span>
                      <p className={`font-semibold text-lg ${detailPartner.type === "Customer" ? "text-blue-600" : "text-red-600"}`}>
                        {fmt(detailPartner.outstanding)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Transaction Summary */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Transaction Summary</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <div className="text-sm text-muted-foreground">Total Debits</div>
                        <div className="text-xl font-bold text-red-600">{fmt(totalDebits)}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <div className="text-sm text-muted-foreground">Total Credits</div>
                        <div className="text-xl font-bold text-green-600">{fmt(totalCredits)}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <div className="text-sm text-muted-foreground">Balance</div>
                        <div className="text-xl font-bold">{fmt(totalDebits - totalCredits)}</div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Ledger Entries */}
                {partnerEntries.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                      Ledger Entries ({partnerEntries.length})
                    </h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-2 font-medium">Date</th>
                            <th className="text-left p-2 font-medium">Type</th>
                            <th className="text-left p-2 font-medium">Reference</th>
                            <th className="text-left p-2 font-medium">Description</th>
                            <th className="text-right p-2 font-medium">Amount</th>
                            <th className="text-left p-2 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {partnerEntries.map((entry) => (
                            <tr key={entry.id} className="border-t">
                              <td className="p-2 text-xs">{entry.date}</td>
                              <td className="p-2">
                                <Badge variant="outline" className="text-xs">
                                  {entry.transactionType}
                                </Badge>
                              </td>
                              <td className="p-2 font-mono text-xs">{entry.reference}</td>
                              <td className="p-2 text-xs">{entry.description}</td>
                              <td className="p-2 text-right font-semibold">{fmt(entry.amount)}</td>
                              <td className="p-2">
                                <StatusBadge status={entry.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Related Invoices (for customers) */}
                {detailPartner.type === "Customer" && partnerInvoices.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                      <FileText className="h-4 w-4 inline mr-1" />
                      Related Invoices ({partnerInvoices.length})
                    </h3>
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
                          {partnerInvoices.map((inv) => (
                            <tr key={inv.id} className="border-t">
                              <td className="p-2 font-mono text-xs font-medium">{inv.number}</td>
                              <td className="p-2 text-xs">{new Date(inv.date).toLocaleDateString()}</td>
                              <td className="p-2 text-xs">{new Date(inv.dueDate).toLocaleDateString()}</td>
                              <td className="p-2 text-right font-semibold">{fmt(inv.total)}</td>
                              <td className="p-2"><StatusBadge status={inv.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Cross-module: CRM Account Data */}
                {crmAccount && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                      <Building2 className="h-4 w-4 inline mr-1" />
                      CRM Account Data
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-muted-foreground">Account Name</span>
                        <p className="font-medium">{crmAccount.name}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Industry</span>
                        <p className="font-medium">{crmAccount.industry}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Type</span>
                        <p className="font-medium">{crmAccount.type}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Owner</span>
                        <p className="font-medium">{crmAccount.owner}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Status</span>
                        <p><StatusBadge status={crmAccount.status} /></p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
