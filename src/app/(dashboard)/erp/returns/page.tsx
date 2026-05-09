"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  RotateCcw,
  Plus,
  CreditCard,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  ArrowRight,
  FileText,
  Package,
  Eye,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import StatusBadge from "@/components/shared/status-badge";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { useApiDataStore } from "@/lib/api/use-api-store";
import type { Invoice, Customer, Product } from "@/lib/data-store";

interface ReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface SalesReturn {
  id: string;
  returnNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  reason: string;
  items: ReturnItem[];
  totalAmount: number;
  status: "DRAFT" | "APPROVED" | "PROCESSED" | "CREDIT_NOTE_ISSUED" | "REJECTED";
  creditNoteNumber?: string;
  notes?: string;
}

type ReturnReason = "DAMAGED" | "EXPIRED" | "WRONG_PRODUCT" | "QUALITY_ISSUE" | "CUSTOMER_REQUEST";

const REASON_OPTIONS: { label: string; value: ReturnReason }[] = [
  { label: "Damaged", value: "DAMAGED" },
  { label: "Expired", value: "EXPIRED" },
  { label: "Wrong Product", value: "WRONG_PRODUCT" },
  { label: "Quality Issue", value: "QUALITY_ISSUE" },
  { label: "Customer Request", value: "CUSTOMER_REQUEST" },
];

const STORAGE_KEY = "erp-returns";

function generateId() {
  return `ret-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildSeedData(
  invoices: Invoice[],
  customers: Customer[],
  products: Product[]
): SalesReturn[] {
  const findCustomer = (id: string) => customers.find((c) => c.id === id);
  const findProduct = (id: string) => products.find((p) => p.id === id);

  const seeds: SalesReturn[] = [];
  const usableInvoices = invoices.filter((inv) => inv.items && inv.items.length > 0);

  const configs: {
    status: SalesReturn["status"];
    reason: ReturnReason;
    creditNoteNumber?: string;
    daysAgo: number;
  }[] = [
    { status: "DRAFT", reason: "DAMAGED", daysAgo: 2 },
    { status: "APPROVED", reason: "EXPIRED", daysAgo: 5 },
    { status: "PROCESSED", reason: "WRONG_PRODUCT", daysAgo: 8 },
    { status: "CREDIT_NOTE_ISSUED", reason: "QUALITY_ISSUE", creditNoteNumber: "CN-2026-001", daysAgo: 12 },
    { status: "REJECTED", reason: "CUSTOMER_REQUEST", daysAgo: 15 },
  ];

  for (let i = 0; i < Math.min(configs.length, usableInvoices.length); i++) {
    const inv = usableInvoices[i];
    const cfg = configs[i];
    const cust = findCustomer(inv.customerId);
    const returnItems: ReturnItem[] = inv.items.slice(0, 2).map((it) => {
      const prod = findProduct(it.productId);
      const qty = Math.max(1, Math.floor(it.quantity / 2));
      return {
        productId: it.productId,
        productName: prod?.name ?? it.description,
        quantity: qty,
        unitPrice: it.unitPrice,
        total: qty * it.unitPrice,
      };
    });

    const d = new Date();
    d.setDate(d.getDate() - cfg.daysAgo);

    seeds.push({
      id: `seed-ret-${i + 1}`,
      returnNumber: `RET-2026-${String(i + 1).padStart(3, "0")}`,
      invoiceId: inv.id,
      invoiceNumber: inv.number,
      customerId: inv.customerId,
      customerName: cust?.name ?? inv.customerId,
      date: d.toISOString().slice(0, 10),
      reason: cfg.reason,
      items: returnItems,
      totalAmount: returnItems.reduce((s, it) => s + it.total, 0),
      status: cfg.status,
      creditNoteNumber: cfg.creditNoteNumber,
      notes: cfg.status === "REJECTED" ? "Return rejected - outside return window" : undefined,
    });
  }

  return seeds;
}

function loadReturns(): SalesReturn[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SalesReturn[];
  } catch (error) { console.error("Failed to load returns from localStorage:", error); }
  return null;
}

function saveReturns(data: SalesReturn[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

const STATUS_LABELS: Record<SalesReturn["status"], string> = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  PROCESSED: "Processed",
  CREDIT_NOTE_ISSUED: "Credit Note Issued",
  REJECTED: "Rejected",
};

const STATUS_FLOW: Record<string, SalesReturn["status"]> = {
  DRAFT: "APPROVED",
  APPROVED: "PROCESSED",
  PROCESSED: "CREDIT_NOTE_ISSUED",
};

export default function ReturnsPage() {
  const store = useApiDataStore() as {
    invoices: Invoice[];
    customers: Customer[];
    products: Product[];
    salesOrders: unknown[];
  };

  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("returns");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailReturn, setDetailReturn] = useState<SalesReturn | null>(null);
  const [editReturn, setEditReturn] = useState<SalesReturn | null>(null);

  useEffect(() => {
    const stored = loadReturns();
    if (stored && stored.length > 0) {
      setReturns(stored);
    } else {
      const seed = buildSeedData(store.invoices, store.customers, store.products);
      setReturns(seed);
      saveReturns(seed);
    }
    setMounted(true);
  }, [store.invoices, store.customers, store.products]);

  const persist = useCallback((next: SalesReturn[]) => {
    setReturns(next);
    saveReturns(next);
  }, []);

  const handleCreate = useCallback(
    (ret: SalesReturn) => {
      persist([ret, ...returns]);
      setCreateOpen(false);
    },
    [returns, persist]
  );

  const handleUpdate = useCallback(
    (ret: SalesReturn) => {
      persist(returns.map((r) => (r.id === ret.id ? ret : r)));
      setEditReturn(null);
    },
    [returns, persist]
  );

  const handleDelete = useCallback(
    (id: string) => {
      persist(returns.filter((r) => r.id !== id));
    },
    [returns, persist]
  );

  const handleStatusChange = useCallback(
    (id: string, newStatus: SalesReturn["status"]) => {
      persist(
        returns.map((r) => {
          if (r.id !== id) return r;
          const updated = { ...r, status: newStatus };
          if (newStatus === "CREDIT_NOTE_ISSUED" && !r.creditNoteNumber) {
            updated.creditNoteNumber = `CN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100).padStart(3, "0")}`;
          }
          return updated;
        })
      );
    },
    [returns, persist]
  );

  const totalReturns = returns.length;
  const pendingApproval = returns.filter((r) => r.status === "DRAFT").length;
  const creditNotesIssued = returns.filter((r) => r.status === "CREDIT_NOTE_ISSUED").length;
  const totalValue = returns.reduce((s, r) => s + r.totalAmount, 0);

  const creditNoteReturns = useMemo(
    () => returns.filter((r) => r.status === "CREDIT_NOTE_ISSUED"),
    [returns]
  );

  const columns: Column<SalesReturn>[] = useMemo(
    () => [
      { key: "returnNumber", label: "Return #", sortable: true, render: (v: string) => <span className="font-mono font-medium">{v}</span> },
      { key: "invoiceNumber", label: "Invoice #", sortable: true, render: (v: string) => <span className="font-mono text-muted-foreground">{v}</span> },
      { key: "customerName", label: "Customer", sortable: true },
      { key: "date", label: "Date", sortable: true, render: (v: string) => v?.slice(0, 10) },
      { key: "items", label: "Items", render: (_: unknown, row: SalesReturn) => <Badge variant="outline">{row.items.length}</Badge> },
      {
        key: "totalAmount",
        label: "Total",
        sortable: true,
        className: "text-right",
        render: (v: number) => <span className="font-semibold">EGP {v.toLocaleString()}</span>,
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (v: string) => <StatusBadge status={STATUS_LABELS[v as SalesReturn["status"]] ?? v} />,
      },
      {
        key: "reason",
        label: "Reason",
        render: (v: string) => (
          <span className="text-xs text-muted-foreground capitalize">{v?.replace(/_/g, " ").toLowerCase()}</span>
        ),
      },
      {
        key: "actions",
        label: "",
        render: (_: unknown, row: SalesReturn) => {
          const nextStatus = STATUS_FLOW[row.status];
          const extras: { label: string; onClick: () => void; icon?: React.ReactNode; destructive?: boolean }[] = [];

          if (nextStatus) {
            extras.push({
              label: `Move to ${STATUS_LABELS[nextStatus]}`,
              onClick: () => handleStatusChange(row.id, nextStatus),
              icon: <ArrowRight className="h-4 w-4" />,
            });
          }

          if (row.status === "DRAFT" || row.status === "APPROVED") {
            extras.push({
              label: "Reject",
              onClick: () => handleStatusChange(row.id, "REJECTED"),
              icon: <Ban className="h-4 w-4" />,
              destructive: true,
            });
          }

          return (
            <EditDeleteMenu
              onView={() => setDetailReturn(row)}
              onEdit={row.status === "DRAFT" ? () => setEditReturn(row) : undefined}
              onDelete={row.status === "DRAFT" ? () => handleDelete(row.id) : undefined}
              canEdit={row.status === "DRAFT"}
              canDelete={row.status === "DRAFT"}
              itemLabel={row.returnNumber}
              extraItems={extras}
            />
          );
        },
      },
    ],
    [handleStatusChange, handleDelete]
  );

  const creditNoteColumns: Column<SalesReturn>[] = useMemo(
    () => [
      { key: "creditNoteNumber", label: "Credit Note #", sortable: true, render: (v: string) => <span className="font-mono font-medium text-green-700">{v}</span> },
      { key: "returnNumber", label: "Return #", sortable: true, render: (v: string) => <span className="font-mono text-muted-foreground">{v}</span> },
      { key: "invoiceNumber", label: "Invoice #", sortable: true, render: (v: string) => <span className="font-mono text-muted-foreground">{v}</span> },
      { key: "customerName", label: "Customer", sortable: true },
      { key: "date", label: "Date", sortable: true, render: (v: string) => v?.slice(0, 10) },
      {
        key: "totalAmount",
        label: "Amount",
        sortable: true,
        className: "text-right",
        render: (v: number) => <span className="font-semibold text-green-700">EGP {v.toLocaleString()}</span>,
      },
      {
        key: "status",
        label: "Status",
        render: () => <StatusBadge status="Credit Note Issued" />,
      },
      {
        key: "actions",
        label: "",
        render: (_: unknown, row: SalesReturn) => (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailReturn(row)}>
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    []
  );

  if (!mounted) return null;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Sales Returns & Credit Notes"
        description="Manage product returns, process refunds, and issue credit notes"
        icon={<RotateCcw className="h-6 w-6" />}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Return
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={Package} title="Total Returns" value={totalReturns} />
        <StatsCard icon={Clock} title="Pending Approval" value={pendingApproval} iconColor="bg-yellow-100 text-yellow-700" />
        <StatsCard icon={CreditCard} title="Credit Notes Issued" value={creditNotesIssued} iconColor="bg-green-100 text-green-700" />
        <StatsCard icon={DollarSign} title="Return Value" value={`EGP ${totalValue.toLocaleString()}`} iconColor="bg-red-100 text-red-700" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="returns">Returns ({returns.length})</TabsTrigger>
          <TabsTrigger value="credit-notes">Credit Notes ({creditNoteReturns.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="returns" className="mt-4">
          <DataTable
            columns={columns}
            data={returns}
            searchable
            searchKeys={["returnNumber", "invoiceNumber", "customerName", "reason"]}
            pagination
            onRowClick={setDetailReturn}
          />
        </TabsContent>

        <TabsContent value="credit-notes" className="mt-4">
          <DataTable
            columns={creditNoteColumns}
            data={creditNoteReturns}
            searchable
            searchKeys={["creditNoteNumber", "returnNumber", "customerName"]}
            pagination
            emptyMessage="No credit notes issued yet."
          />
        </TabsContent>
      </Tabs>

      <CreateReturnDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        invoices={store.invoices}
        customers={store.customers}
        products={store.products}
        onSubmit={handleCreate}
        existingCount={returns.length}
      />

      {editReturn && (
        <EditReturnDialog
          open={!!editReturn}
          onOpenChange={(o) => !o && setEditReturn(null)}
          ret={editReturn}
          invoices={store.invoices}
          customers={store.customers}
          products={store.products}
          onSubmit={handleUpdate}
        />
      )}

      {detailReturn && (
        <ReturnDetailDialog
          open={!!detailReturn}
          onOpenChange={(o) => !o && setDetailReturn(null)}
          ret={detailReturn}
          invoices={store.invoices}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

function CreateReturnDialog({
  open,
  onOpenChange,
  invoices,
  customers,
  products,
  onSubmit,
  existingCount,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  invoices: Invoice[];
  customers: Customer[];
  products: Product[];
  onSubmit: (ret: SalesReturn) => void;
  existingCount: number;
}) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [reason, setReason] = useState<ReturnReason | "">("");
  const [notes, setNotes] = useState("");
  const [selectedItems, setSelectedItems] = useState<
    Map<number, { checked: boolean; quantity: number }>
  >(new Map());

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);
  const customer = selectedInvoice
    ? customers.find((c) => c.id === selectedInvoice.customerId)
    : null;

  useEffect(() => {
    if (open) {
      setSelectedInvoiceId("");
      setReason("");
      setNotes("");
      setSelectedItems(new Map());
    }
  }, [open]);

  useEffect(() => {
    if (selectedInvoice) {
      const m = new Map<number, { checked: boolean; quantity: number }>();
      selectedInvoice.items.forEach((_, idx) => {
        m.set(idx, { checked: false, quantity: 0 });
      });
      setSelectedItems(m);
    }
  }, [selectedInvoice]);

  const toggleItem = (idx: number) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      const cur = next.get(idx)!;
      const invItem = selectedInvoice!.items[idx];
      next.set(idx, {
        checked: !cur.checked,
        quantity: !cur.checked ? invItem.quantity : 0,
      });
      return next;
    });
  };

  const setItemQty = (idx: number, qty: number) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      next.set(idx, { checked: true, quantity: qty });
      return next;
    });
  };

  const canSubmit =
    selectedInvoice &&
    reason &&
    Array.from(selectedItems.values()).some((v) => v.checked && v.quantity > 0);

  const handleSubmit = () => {
    if (!selectedInvoice || !reason || !canSubmit) return;

    const returnItems: ReturnItem[] = [];
    selectedItems.forEach((val, idx) => {
      if (!val.checked || val.quantity <= 0) return;
      const invItem = selectedInvoice.items[idx];
      const prod = products.find((p) => p.id === invItem.productId);
      returnItems.push({
        productId: invItem.productId,
        productName: prod?.name ?? invItem.description,
        quantity: val.quantity,
        unitPrice: invItem.unitPrice,
        total: val.quantity * invItem.unitPrice,
      });
    });

    const ret: SalesReturn = {
      id: generateId(),
      returnNumber: `RET-${new Date().getFullYear()}-${String(existingCount + 1).padStart(3, "0")}`,
      invoiceId: selectedInvoice.id,
      invoiceNumber: selectedInvoice.number,
      customerId: selectedInvoice.customerId,
      customerName: customer?.name ?? selectedInvoice.customerId,
      date: new Date().toISOString().slice(0, 10),
      reason,
      items: returnItems,
      totalAmount: returnItems.reduce((s, it) => s + it.total, 0),
      status: "DRAFT",
      notes: notes || undefined,
    };

    onSubmit(ret);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Sales Return</DialogTitle>
          <DialogDescription>Select an invoice and choose items to return</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="mb-1.5 block text-sm">Invoice *</Label>
            <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an invoice" />
              </SelectTrigger>
              <SelectContent>
                {invoices.map((inv) => {
                  const c = customers.find((cu) => cu.id === inv.customerId);
                  return (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.number} - {c?.name ?? inv.customerId} (EGP {inv.total.toLocaleString()})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {selectedInvoice && (
            <div className="rounded-md border p-3 bg-muted/30 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground text-xs">Customer</span>
                  <p className="font-medium">{customer?.name ?? selectedInvoice.customerId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Invoice Date</span>
                  <p>{selectedInvoice.date?.slice(0, 10)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Invoice Total</span>
                  <p className="font-semibold">EGP {selectedInvoice.total.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Status</span>
                  <p><StatusBadge status={selectedInvoice.status} /></p>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label className="mb-1.5 block text-sm">Reason *</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as ReturnReason)}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason for return" />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedInvoice && selectedInvoice.items.length > 0 && (
            <div>
              <Label className="mb-1.5 block text-sm">Select Items to Return *</Label>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="p-2 w-10"></th>
                      <th className="p-2 text-left">Product</th>
                      <th className="p-2 text-right">Invoiced Qty</th>
                      <th className="p-2 text-right">Return Qty</th>
                      <th className="p-2 text-right">Unit Price</th>
                      <th className="p-2 text-right">Return Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, idx) => {
                      const sel = selectedItems.get(idx) ?? {
                        checked: false,
                        quantity: 0,
                      };
                      const prod = products.find((p) => p.id === item.productId);
                      return (
                        <tr key={idx} className="border-t">
                          <td className="p-2 text-center">
                            <Checkbox
                              checked={sel.checked}
                              onCheckedChange={() => toggleItem(idx)}
                            />
                          </td>
                          <td className="p-2">{prod?.name ?? item.description}</td>
                          <td className="p-2 text-right">{item.quantity}</td>
                          <td className="p-2 text-right">
                            <Input
                              type="number"
                              min={1}
                              max={item.quantity}
                              value={sel.quantity || ""}
                              onChange={(e) =>
                                setItemQty(
                                  idx,
                                  Math.min(item.quantity, Math.max(0, Number(e.target.value)))
                                )
                              }
                              disabled={!sel.checked}
                              className="w-20 h-8 text-right ml-auto"
                            />
                          </td>
                          <td className="p-2 text-right">EGP {item.unitPrice.toLocaleString()}</td>
                          <td className="p-2 text-right font-semibold">
                            {sel.checked && sel.quantity > 0
                              ? `EGP ${(sel.quantity * item.unitPrice).toLocaleString()}`
                              : "---"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <Label className="mb-1.5 block text-sm">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about the return"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            Create Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditReturnDialog({
  open,
  onOpenChange,
  ret,
  invoices,
  customers,
  products,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ret: SalesReturn;
  invoices: Invoice[];
  customers: Customer[];
  products: Product[];
  onSubmit: (ret: SalesReturn) => void;
}) {
  const [reason, setReason] = useState<ReturnReason>(ret.reason as ReturnReason);
  const [notes, setNotes] = useState(ret.notes ?? "");
  const [itemQuantities, setItemQuantities] = useState<Map<number, number>>(
    () => new Map(ret.items.map((it, i) => [i, it.quantity]))
  );

  const invoice = invoices.find((inv) => inv.id === ret.invoiceId);

  useEffect(() => {
    if (open) {
      setReason(ret.reason as ReturnReason);
      setNotes(ret.notes ?? "");
      setItemQuantities(new Map(ret.items.map((it, i) => [i, it.quantity])));
    }
  }, [open, ret]);

  const handleSubmit = () => {
    const updatedItems = ret.items.map((it, i) => {
      const qty = itemQuantities.get(i) ?? it.quantity;
      return { ...it, quantity: qty, total: qty * it.unitPrice };
    });

    onSubmit({
      ...ret,
      reason,
      notes: notes || undefined,
      items: updatedItems,
      totalAmount: updatedItems.reduce((s, it) => s + it.total, 0),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Return {ret.returnNumber}</DialogTitle>
          <DialogDescription>Modify return details (only available for draft returns)</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border p-3 bg-muted/30 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground text-xs">Invoice</span>
                <p className="font-mono">{ret.invoiceNumber}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Customer</span>
                <p className="font-medium">{ret.customerName}</p>
              </div>
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-sm">Reason *</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as ReturnReason)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 block text-sm">Return Items</Label>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="p-2 text-left">Product</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-right">Unit Price</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ret.items.map((item, idx) => {
                    const qty = itemQuantities.get(idx) ?? item.quantity;
                    const invItem = invoice?.items.find((it) => it.productId === item.productId);
                    const maxQty = invItem?.quantity ?? item.quantity;
                    return (
                      <tr key={idx} className="border-t">
                        <td className="p-2">{item.productName}</td>
                        <td className="p-2 text-right">
                          <Input
                            type="number"
                            min={1}
                            max={maxQty}
                            value={qty}
                            onChange={(e) => {
                              const next = new Map(itemQuantities);
                              next.set(idx, Math.min(maxQty, Math.max(1, Number(e.target.value))));
                              setItemQuantities(next);
                            }}
                            className="w-20 h-8 text-right ml-auto"
                          />
                        </td>
                        <td className="p-2 text-right">EGP {item.unitPrice.toLocaleString()}</td>
                        <td className="p-2 text-right font-semibold">
                          EGP {(qty * item.unitPrice).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-sm">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReturnDetailDialog({
  open,
  onOpenChange,
  ret,
  invoices,
  onStatusChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ret: SalesReturn;
  invoices: Invoice[];
  onStatusChange: (id: string, status: SalesReturn["status"]) => void;
}) {
  const invoice = invoices.find((inv) => inv.id === ret.invoiceId);
  const nextStatus = STATUS_FLOW[ret.status];

  const statusTimeline: { label: string; reached: boolean; active: boolean }[] = [
    { label: "Draft", reached: true, active: ret.status === "DRAFT" },
    {
      label: "Approved",
      reached: ["APPROVED", "PROCESSED", "CREDIT_NOTE_ISSUED"].includes(ret.status),
      active: ret.status === "APPROVED",
    },
    {
      label: "Processed",
      reached: ["PROCESSED", "CREDIT_NOTE_ISSUED"].includes(ret.status),
      active: ret.status === "PROCESSED",
    },
    {
      label: "Credit Note Issued",
      reached: ret.status === "CREDIT_NOTE_ISSUED",
      active: ret.status === "CREDIT_NOTE_ISSUED",
    },
  ];

  const isRejected = ret.status === "REJECTED";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{ret.returnNumber}</span>
            <StatusBadge status={STATUS_LABELS[ret.status]} />
          </DialogTitle>
          <DialogDescription>Sales return details and status tracking</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="space-y-3">
          <TabsList className="flex-wrap">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="items">Items ({ret.items.length})</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Return Number</span>
                <p className="font-mono font-medium">{ret.returnNumber}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Date</span>
                <p>{ret.date}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Invoice</span>
                <p className="font-mono">{ret.invoiceNumber}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Customer</span>
                <p className="font-medium">{ret.customerName}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Reason</span>
                <p className="capitalize">{ret.reason.replace(/_/g, " ").toLowerCase()}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Total Amount</span>
                <p className="text-lg font-bold text-red-600">EGP {ret.totalAmount.toLocaleString()}</p>
              </div>
              {ret.creditNoteNumber && (
                <div>
                  <span className="text-muted-foreground text-xs">Credit Note</span>
                  <p className="font-mono font-medium text-green-700">{ret.creditNoteNumber}</p>
                </div>
              )}
              {ret.notes && (
                <div className="col-span-2">
                  <span className="text-muted-foreground text-xs">Notes</span>
                  <p className="text-muted-foreground">{ret.notes}</p>
                </div>
              )}
            </div>

            {invoice && (
              <div className="mt-4 rounded-md border p-3 bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground mb-2">Original Invoice Reference</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">Invoice #</span>
                    <p className="font-mono">{invoice.number}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Invoice Date</span>
                    <p>{invoice.date?.slice(0, 10)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Invoice Total</span>
                    <p className="font-semibold">EGP {invoice.total.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="items">
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="p-2 text-left">Product</th>
                    <th className="p-2 text-right">Returned Qty</th>
                    <th className="p-2 text-right">Original Qty</th>
                    <th className="p-2 text-right">Unit Price</th>
                    <th className="p-2 text-right">Return Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ret.items.map((item, idx) => {
                    const invItem = invoice?.items.find((it) => it.productId === item.productId);
                    return (
                      <tr key={idx} className="border-t">
                        <td className="p-2 font-medium">{item.productName}</td>
                        <td className="p-2 text-right font-semibold text-red-600">{item.quantity}</td>
                        <td className="p-2 text-right text-muted-foreground">{invItem?.quantity ?? "---"}</td>
                        <td className="p-2 text-right">EGP {item.unitPrice.toLocaleString()}</td>
                        <td className="p-2 text-right font-semibold">EGP {item.total.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30">
                    <td colSpan={4} className="p-2 text-right font-medium">
                      Total Return Value
                    </td>
                    <td className="p-2 text-right font-bold text-red-600">
                      EGP {ret.totalAmount.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="timeline">
            <div className="space-y-1 py-2">
              {isRejected ? (
                <div className="flex items-center gap-3 p-3 rounded-md border bg-red-50 border-red-200">
                  <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                  <div>
                    <p className="font-medium text-red-700">Return Rejected</p>
                    <p className="text-xs text-red-600 mt-0.5">{ret.notes ?? "This return has been rejected"}</p>
                  </div>
                </div>
              ) : (
                statusTimeline.map((step, idx) => (
                  <div key={step.label} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                          step.active
                            ? "bg-primary text-primary-foreground"
                            : step.reached
                            ? "bg-green-100 text-green-700"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {step.reached && !step.active ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <span className="text-xs font-bold">{idx + 1}</span>
                        )}
                      </div>
                      {idx < statusTimeline.length - 1 && (
                        <div
                          className={`w-0.5 h-8 ${
                            step.reached && !step.active ? "bg-green-300" : "bg-muted"
                          }`}
                        />
                      )}
                    </div>
                    <div className="pt-1">
                      <p
                        className={`text-sm font-medium ${
                          step.active
                            ? "text-foreground"
                            : step.reached
                            ? "text-green-700"
                            : "text-muted-foreground"
                        }`}
                      >
                        {step.label}
                      </p>
                      {step.active && (
                        <p className="text-xs text-muted-foreground mt-0.5">Current status</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 pt-2">
          {nextStatus && (
            <Button
              onClick={() => {
                onStatusChange(ret.id, nextStatus);
                onOpenChange(false);
              }}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Move to {STATUS_LABELS[nextStatus]}
            </Button>
          )}
          {(ret.status === "DRAFT" || ret.status === "APPROVED") && (
            <Button
              variant="destructive"
              onClick={() => {
                onStatusChange(ret.id, "REJECTED");
                onOpenChange(false);
              }}
            >
              <Ban className="mr-2 h-4 w-4" />
              Reject
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
