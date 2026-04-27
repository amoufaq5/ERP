"use client";

import { useState, useMemo } from "react";
import { Package, Truck, ClipboardCheck, Plus, ShieldCheck, FileText, ArrowRight, CheckCircle } from "lucide-react";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import StatusBadge from "@/components/shared/status-badge";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { EntityFormModal, type EntityField, type EntityFormData } from "@/components/shared/entity-form-modal";
import { useDataStore, type PurchaseOrder, type RFQ, type GoodsReceipt } from "@/lib/data-store";

export default function ProcurementPage() {
  const store = useDataStore();
  const [showPOModal, setShowPOModal] = useState(false);
  const [showRFQModal, setShowRFQModal] = useState(false);
  const [activeTab, setActiveTab] = useState("orders");

  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [editingRFQ, setEditingRFQ] = useState<RFQ | null>(null);
  const [detailPO, setDetailPO] = useState<PurchaseOrder | null>(null);
  const [detailGRN, setDetailGRN] = useState<GoodsReceipt | null>(null);

  const [poSearch, setPOSearch] = useState("");
  const [poFilters, setPOFilters] = useState<FilterState>({});
  const [rfqSearch, setRFQSearch] = useState("");

  const vendorName = (id: string) => store.vendors.find((v) => v.id === id)?.name ?? id;
  const productName = (id: string) => { const p = store.products.find((pr) => pr.id === id); return p ? `${p.name} ${p.strength}` : id; };

  // Stats
  const totalPOs = store.purchaseOrders.length;
  const approvedPOs = store.purchaseOrders.filter((p) => p.status === "APPROVED").length;
  const receivedPOs = store.purchaseOrders.filter((p) => p.status === "RECEIVED").length;
  const totalValue = store.purchaseOrders.reduce((s, p) => s + p.total, 0);

  // Filtered POs
  const filteredPOs = useMemo(() => {
    return store.purchaseOrders.filter((po) => {
      const q = poSearch.toLowerCase();
      if (q && !po.number.toLowerCase().includes(q) && !vendorName(po.vendorId).toLowerCase().includes(q)) return false;
      if (poFilters.status && po.status !== poFilters.status) return false;
      return true;
    });
  }, [store.purchaseOrders, poSearch, poFilters]);

  const filteredRFQs = useMemo(() => {
    return store.rfqs.filter((r) => {
      const q = rfqSearch.toLowerCase();
      if (q && !r.number.toLowerCase().includes(q) && !vendorName(r.vendorId).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [store.rfqs, rfqSearch]);

  const vendorOptions = store.vendors.map((v) => ({ value: v.id, label: v.name }));
  const productOptions = store.products.map((p) => ({ value: p.id, label: `${p.name} ${p.strength} (${p.code})` }));

  const poFields: EntityField[] = [
    { name: "vendorId", label: "Vendor", type: "select", required: true, options: vendorOptions },
    { name: "productId", label: "Product", type: "select", required: true, options: productOptions },
    { name: "quantity", label: "Quantity", type: "number", required: true },
    { name: "unitPrice", label: "Unit Price (EGP)", type: "number", required: true },
    { name: "expectedDate", label: "Expected Delivery", type: "date", required: true },
  ];

  const rfqFields: EntityField[] = [
    { name: "vendorId", label: "Vendor", type: "select", required: true, options: vendorOptions },
    { name: "description", label: "Item Description", type: "text", required: true },
    { name: "quantity", label: "Quantity", type: "number", required: true },
    { name: "unit", label: "Unit", type: "text", required: true, placeholder: "kg / pcs / liters" },
    { name: "validUntil", label: "Valid Until", type: "date", required: true },
    { name: "notes", label: "Notes", type: "textarea" },
  ];

  function handlePOSubmit(data: EntityFormData) {
    const product = store.products.find((p) => p.id === String(data.productId));
    const desc = product ? `${product.name} ${product.strength}` : "Custom item";
    const qty = Number(data.quantity);
    const price = Number(data.unitPrice);
    const lineTotal = qty * price;
    const tax = lineTotal * 0.14;
    const total = lineTotal + tax;

    if (editingPO) {
      store.update("purchaseOrders", editingPO.id, {
        vendorId: String(data.vendorId),
        items: [{ productId: String(data.productId), description: desc, quantity: qty, unitPrice: price, total: lineTotal }],
        subtotal: lineTotal, tax, total,
        expectedDate: String(data.expectedDate),
      });
    } else {
      store.add("purchaseOrders", {
        id: store.genId("po"),
        number: store.generatePONumber(),
        vendorId: String(data.vendorId),
        date: new Date().toISOString(),
        expectedDate: String(data.expectedDate),
        items: [{ productId: String(data.productId), description: desc, quantity: qty, unitPrice: price, total: lineTotal }],
        subtotal: lineTotal, tax, total,
        status: "DRAFT",
        createdAt: new Date().toISOString(),
      });
    }
    setShowPOModal(false);
    setEditingPO(null);
  }

  function handleRFQSubmit(data: EntityFormData) {
    if (editingRFQ) {
      store.update("rfqs", editingRFQ.id, {
        vendorId: String(data.vendorId),
        items: [{ description: String(data.description), quantity: Number(data.quantity), unit: String(data.unit) }],
        validUntil: String(data.validUntil),
        notes: data.notes ? String(data.notes) : undefined,
      });
    } else {
      store.add("rfqs", {
        id: store.genId("rfq"),
        number: store.generateRFQNumber(),
        vendorId: String(data.vendorId),
        date: new Date().toISOString(),
        validUntil: String(data.validUntil),
        items: [{ description: String(data.description), quantity: Number(data.quantity), unit: String(data.unit) }],
        status: "DRAFT",
        notes: data.notes ? String(data.notes) : undefined,
        createdAt: new Date().toISOString(),
      });
    }
    setShowRFQModal(false);
    setEditingRFQ(null);
  }

  // ─── Integration: Approve PO ─────────────────────────────────────────
  function approvePO(po: PurchaseOrder) {
    store.update("purchaseOrders", po.id, { status: "APPROVED" });
  }

  // ─── Integration: Mark PO as Ordered ──────────────────────────────────
  function markOrdered(po: PurchaseOrder) {
    store.update("purchaseOrders", po.id, { status: "ORDERED" });
  }

  // ─── Integration: Receive PO → auto-create GRN ───────────────────────
  function receivePO(po: PurchaseOrder) {
    const grnId = store.genId("grn");
    const grnNumber = store.generateGRNNumber();
    store.add("goodsReceipts", {
      id: grnId,
      number: grnNumber,
      poId: po.id,
      vendorId: po.vendorId,
      date: new Date().toISOString(),
      items: po.items.map((i) => ({ productId: i.productId, description: i.description, quantity: i.quantity, unitPrice: i.unitPrice })),
      status: "PENDING",
      createdAt: new Date().toISOString(),
    });
    store.update("purchaseOrders", po.id, { status: "RECEIVED", grnId });
  }

  // ─── Integration: Confirm GRN → auto-create Invoice + Journal Entry ──
  function confirmGRN(grn: GoodsReceipt) {
    store.update("goodsReceipts", grn.id, { status: "RECEIVED" });

    const po = store.purchaseOrders.find((p) => p.id === grn.poId);
    if (!po) return;

    // Auto-create vendor invoice (AP)
    const invId = store.genId("inv");
    const invNumber = store.generateInvoiceNumber();
    store.add("invoices", {
      id: invId,
      number: invNumber,
      customerId: po.vendorId,
      date: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      subtotal: po.subtotal,
      tax: po.tax,
      total: po.total,
      currency: "EGP",
      status: "SENT",
      items: po.items.map((i) => ({ productId: i.productId, description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),
      notes: `Auto-generated from PO ${po.number} / GRN ${grn.number}`,
    });

    // Auto-create journal entry: DR Inventory, CR Accounts Payable
    const jeId = store.genId("je");
    const jeNumber = store.generateJournalNumber();
    store.add("journalEntries", {
      id: jeId,
      number: jeNumber,
      date: new Date().toISOString().split("T")[0],
      description: `Goods received — PO ${po.number}`,
      reference: po.number,
      type: "GENERAL",
      lines: [
        { accountId: "gl-1200", description: "Inventory — Raw Materials", debit: po.subtotal, credit: 0 },
        { accountId: "gl-2000", description: "Accounts Payable", debit: 0, credit: po.subtotal },
      ],
      status: "POSTED",
      createdBy: "u-admin",
      createdAt: new Date().toISOString(),
    });

    store.update("purchaseOrders", po.id, { invoiceId: invId });
  }

  // ─── Integration: Convert RFQ → PO ───────────────────────────────────
  function convertRFQtoPO(rfq: RFQ) {
    const poId = store.genId("po");
    const poNumber = store.generatePONumber();
    store.add("purchaseOrders", {
      id: poId,
      number: poNumber,
      vendorId: rfq.vendorId,
      date: new Date().toISOString(),
      expectedDate: new Date(Date.now() + 21 * 86400000).toISOString(),
      items: rfq.items.map((i) => ({ productId: "", description: i.description, quantity: i.quantity, unitPrice: 0, total: 0 })),
      subtotal: 0, tax: 0, total: 0,
      status: "DRAFT",
      createdAt: new Date().toISOString(),
    });
    store.update("rfqs", rfq.id, { status: "CONVERTED", convertedPOId: poId });
  }

  const egp = (n: number) => `EGP ${n.toLocaleString()}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Procurement"
        description="Purchase orders, RFQs, and goods receipt with auto-integration to inventory & accounting"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setEditingRFQ(null); setShowRFQModal(true); }}>
              <Plus className="h-4 w-4 mr-2" /> New RFQ
            </Button>
            <Button onClick={() => { setEditingPO(null); setShowPOModal(true); }}>
              <Plus className="h-4 w-4 mr-2" /> New Purchase Order
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Package} title="Total POs" value={String(totalPOs)} subtitle={`${approvedPOs} approved`} iconColor="text-blue-600" />
        <StatsCard icon={Truck} title="Received" value={String(receivedPOs)} subtitle="Goods received" iconColor="text-green-600" />
        <StatsCard icon={ClipboardCheck} title="GRN Pending" value={String(store.goodsReceipts.filter((g) => g.status === "PENDING").length)} subtitle="Awaiting confirmation" iconColor="text-amber-600" />
        <StatsCard icon={ShieldCheck} title="Total Value" value={egp(totalValue)} subtitle="All POs" iconColor="text-purple-600" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders">Purchase Orders ({store.purchaseOrders.length})</TabsTrigger>
          <TabsTrigger value="rfqs">RFQs ({store.rfqs.length})</TabsTrigger>
          <TabsTrigger value="grn">Goods Received ({store.goodsReceipts.length})</TabsTrigger>
        </TabsList>

        {/* ── Purchase Orders Tab ── */}
        <TabsContent value="orders" className="space-y-4">
          <FilterBar
            searchPlaceholder="Search by PO #, vendor..."
            searchValue={poSearch}
            onSearchChange={setPOSearch}
            fields={[
              { key: "status", label: "Status", type: "select" as const, options: [
                { value: "DRAFT", label: "Draft" }, { value: "APPROVED", label: "Approved" },
                { value: "ORDERED", label: "Ordered" }, { value: "RECEIVED", label: "Received" },
                { value: "CANCELLED", label: "Cancelled" },
              ]},
            ]}
            values={poFilters}
            onChange={(key, value) => setPOFilters((prev) => ({ ...prev, [key]: value }))}
          />
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>Auto-numbered POs with integration to inventory &amp; accounting</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "number", label: "PO #", render: (v: string) => <span className="font-mono text-xs font-semibold">{v}</span> },
                  { key: "vendorId", label: "Vendor", render: (v: string) => <span className="font-medium">{vendorName(v)}</span> },
                  { key: "items", label: "Items", render: (_v: unknown, row: Record<string, unknown>) => {
                    const po = row as unknown as PurchaseOrder;
                    return <span className="text-sm">{po.items.map((i) => i.description).join(", ")}</span>;
                  }},
                  { key: "total", label: "Total", className: "text-right", render: (v: number) => <span className="font-semibold">{egp(v)}</span> },
                  { key: "date", label: "Date", render: (v: string) => v?.slice(0, 10) },
                  { key: "status", label: "Status", render: (v: string) => <StatusBadge status={v} /> },
                  { key: "id", label: "Actions", className: "text-right", render: (_v: unknown, row: Record<string, unknown>) => {
                    const po = row as unknown as PurchaseOrder;
                    return (
                      <div className="flex items-center justify-end gap-1">
                        {po.status === "DRAFT" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => approvePO(po)}>
                            Approve
                          </Button>
                        )}
                        {po.status === "APPROVED" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markOrdered(po)}>
                            Mark Ordered
                          </Button>
                        )}
                        {po.status === "ORDERED" && (
                          <Button size="sm" className="h-7 text-xs" onClick={() => receivePO(po)}>
                            <ArrowRight className="h-3 w-3 mr-1" /> Receive
                          </Button>
                        )}
                        <EditDeleteMenu
                          onView={() => setDetailPO(po)}
                          onEdit={po.status === "DRAFT" ? () => { setEditingPO(po); setShowPOModal(true); } : undefined}
                          onDelete={po.status === "DRAFT" ? () => store.remove("purchaseOrders", po.id) : undefined}
                          canView
                          itemLabel={po.number}
                          compact
                        />
                      </div>
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={filteredPOs as unknown as Record<string, unknown>[]}
                exportable exportFilename="purchase-orders.csv" emptyMessage="No purchase orders."
              />
            </CardContent>
          </Card>

          {/* Integration flow diagram */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Integration Flow</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <Badge variant="outline">PO Created (DRAFT)</Badge>
                <ArrowRight className="h-3 w-3" />
                <Badge variant="outline" className="bg-blue-50">Approved</Badge>
                <ArrowRight className="h-3 w-3" />
                <Badge variant="outline" className="bg-amber-50">Ordered</Badge>
                <ArrowRight className="h-3 w-3" />
                <Badge variant="outline" className="bg-green-50">Received → Auto GRN</Badge>
                <ArrowRight className="h-3 w-3" />
                <Badge variant="outline" className="bg-purple-50">GRN Confirmed → Auto Invoice + Journal Entry</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── RFQ Tab ── */}
        <TabsContent value="rfqs" className="space-y-4">
          <FilterBar
            searchPlaceholder="Search RFQs..."
            searchValue={rfqSearch}
            onSearchChange={setRFQSearch}
            fields={[]}
            values={{}}
            onChange={() => {}}
          />
          <Card>
            <CardHeader>
              <CardTitle>Requests for Quotation</CardTitle>
              <CardDescription>Create RFQs and convert them to Purchase Orders</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "number", label: "RFQ #", render: (v: string) => <span className="font-mono text-xs font-semibold">{v}</span> },
                  { key: "vendorId", label: "Vendor", render: (v: string) => <span className="font-medium">{vendorName(v)}</span> },
                  { key: "items", label: "Items", render: (_v: unknown, row: Record<string, unknown>) => {
                    const rfq = row as unknown as RFQ;
                    return <span className="text-sm">{rfq.items.map((i) => `${i.description} (${i.quantity} ${i.unit})`).join(", ")}</span>;
                  }},
                  { key: "validUntil", label: "Valid Until", render: (v: string) => v?.slice(0, 10) },
                  { key: "status", label: "Status", render: (v: string) => <StatusBadge status={v} /> },
                  { key: "id", label: "Actions", className: "text-right", render: (_v: unknown, row: Record<string, unknown>) => {
                    const rfq = row as unknown as RFQ;
                    return (
                      <div className="flex items-center justify-end gap-1">
                        {(rfq.status === "SENT" || rfq.status === "RECEIVED") && (
                          <Button size="sm" className="h-7 text-xs" onClick={() => convertRFQtoPO(rfq)}>
                            <ArrowRight className="h-3 w-3 mr-1" /> Convert to PO
                          </Button>
                        )}
                        {rfq.status === "DRAFT" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => store.update("rfqs", rfq.id, { status: "SENT" })}>
                            Send
                          </Button>
                        )}
                        <EditDeleteMenu
                          onEdit={rfq.status === "DRAFT" ? () => { setEditingRFQ(rfq); setShowRFQModal(true); } : undefined}
                          onDelete={rfq.status === "DRAFT" ? () => store.remove("rfqs", rfq.id) : undefined}
                          itemLabel={rfq.number}
                          compact
                        />
                      </div>
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={filteredRFQs as unknown as Record<string, unknown>[]}
                exportable exportFilename="rfqs.csv" emptyMessage="No RFQs."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Goods Received Tab ── */}
        <TabsContent value="grn" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Goods Received Notes</CardTitle>
              <CardDescription>Auto-created when POs are received. Confirm receipt to auto-generate invoice &amp; journal entry.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "number", label: "GRN #", render: (v: string) => <span className="font-mono text-xs font-semibold">{v}</span> },
                  { key: "poId", label: "PO Ref", render: (v: string) => {
                    const po = store.purchaseOrders.find((p) => p.id === v);
                    return <span className="font-mono text-xs">{po?.number ?? v}</span>;
                  }},
                  { key: "vendorId", label: "Vendor", render: (v: string) => vendorName(v) },
                  { key: "items", label: "Items", render: (_v: unknown, row: Record<string, unknown>) => {
                    const g = row as unknown as GoodsReceipt;
                    return <span className="text-sm">{g.items.map((i) => `${i.description} × ${i.quantity}`).join(", ")}</span>;
                  }},
                  { key: "date", label: "Date", render: (v: string) => v?.slice(0, 10) },
                  { key: "status", label: "Status", render: (v: string) => <StatusBadge status={v} /> },
                  { key: "id", label: "Actions", className: "text-right", render: (_v: unknown, row: Record<string, unknown>) => {
                    const g = row as unknown as GoodsReceipt;
                    return (
                      <div className="flex items-center justify-end gap-1">
                        {g.status === "PENDING" && (
                          <Button size="sm" className="h-7 text-xs" onClick={() => confirmGRN(g)}>
                            <CheckCircle className="h-3 w-3 mr-1" /> Confirm Receipt
                          </Button>
                        )}
                        <EditDeleteMenu
                          onView={() => setDetailGRN(g)}
                          canView
                          itemLabel={g.number}
                          compact
                        />
                      </div>
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={store.goodsReceipts as unknown as Record<string, unknown>[]}
                exportable exportFilename="goods-receipts.csv" emptyMessage="No goods receipts."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── PO Form Modal ── */}
      <EntityFormModal
        open={showPOModal}
        onOpenChange={(open) => { setShowPOModal(open); if (!open) setEditingPO(null); }}
        title={editingPO ? `Edit ${editingPO.number}` : "New Purchase Order"}
        description="PO number will be generated automatically"
        fields={poFields}
        initialData={editingPO ? {
          vendorId: editingPO.vendorId,
          productId: editingPO.items[0]?.productId ?? "",
          quantity: editingPO.items[0]?.quantity ?? 0,
          unitPrice: editingPO.items[0]?.unitPrice ?? 0,
          expectedDate: editingPO.expectedDate?.slice(0, 10) ?? "",
        } : undefined}
        onSubmit={handlePOSubmit}
        submitLabel={editingPO ? "Update" : "Create PO"}
      />

      {/* ── RFQ Form Modal ── */}
      <EntityFormModal
        open={showRFQModal}
        onOpenChange={(open) => { setShowRFQModal(open); if (!open) setEditingRFQ(null); }}
        title={editingRFQ ? `Edit ${editingRFQ.number}` : "New RFQ"}
        description="RFQ number will be generated automatically"
        fields={rfqFields}
        initialData={editingRFQ ? {
          vendorId: editingRFQ.vendorId,
          description: editingRFQ.items[0]?.description ?? "",
          quantity: editingRFQ.items[0]?.quantity ?? 0,
          unit: editingRFQ.items[0]?.unit ?? "",
          validUntil: editingRFQ.validUntil?.slice(0, 10) ?? "",
          notes: editingRFQ.notes ?? "",
        } : undefined}
        onSubmit={handleRFQSubmit}
        submitLabel={editingRFQ ? "Update" : "Create RFQ"}
      />

      {/* ── PO Detail Dialog ── */}
      <Dialog open={!!detailPO} onOpenChange={(o) => !o && setDetailPO(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{detailPO?.number}</DialogTitle></DialogHeader>
          {detailPO && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Vendor</span><p className="font-medium">{vendorName(detailPO.vendorId)}</p></div>
                <div><span className="text-muted-foreground">Status</span><p><StatusBadge status={detailPO.status} /></p></div>
                <div><span className="text-muted-foreground">Date</span><p>{detailPO.date?.slice(0, 10)}</p></div>
                <div><span className="text-muted-foreground">Expected</span><p>{detailPO.expectedDate?.slice(0, 10)}</p></div>
                <div><span className="text-muted-foreground">Subtotal</span><p>{egp(detailPO.subtotal)}</p></div>
                <div><span className="text-muted-foreground">Tax (14%)</span><p>{egp(detailPO.tax)}</p></div>
                <div className="col-span-2"><span className="text-muted-foreground">Total</span><p className="text-lg font-bold">{egp(detailPO.total)}</p></div>
              </div>
              <div>
                <span className="text-muted-foreground">Items</span>
                <div className="mt-1 border rounded">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-muted/50"><th className="p-2 text-left">Product</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Price</th><th className="p-2 text-right">Total</th></tr></thead>
                    <tbody>
                      {detailPO.items.map((it, i) => (
                        <tr key={i} className="border-t"><td className="p-2">{it.description}</td><td className="p-2 text-right">{it.quantity}</td><td className="p-2 text-right">{egp(it.unitPrice)}</td><td className="p-2 text-right">{egp(it.total)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {detailPO.grnId && <div><span className="text-muted-foreground">GRN</span><p className="font-mono text-xs">{store.goodsReceipts.find((g) => g.id === detailPO.grnId)?.number ?? detailPO.grnId}</p></div>}
              {detailPO.invoiceId && <div><span className="text-muted-foreground">Invoice</span><p className="font-mono text-xs">{store.invoices.find((inv) => inv.id === detailPO.invoiceId)?.number ?? detailPO.invoiceId}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── GRN Detail Dialog ── */}
      <Dialog open={!!detailGRN} onOpenChange={(o) => !o && setDetailGRN(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{detailGRN?.number}</DialogTitle></DialogHeader>
          {detailGRN && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">PO Reference</span><p className="font-mono text-xs">{store.purchaseOrders.find((p) => p.id === detailGRN.poId)?.number ?? detailGRN.poId}</p></div>
                <div><span className="text-muted-foreground">Vendor</span><p>{vendorName(detailGRN.vendorId)}</p></div>
                <div><span className="text-muted-foreground">Date</span><p>{detailGRN.date?.slice(0, 10)}</p></div>
                <div><span className="text-muted-foreground">Status</span><p><StatusBadge status={detailGRN.status} /></p></div>
              </div>
              <div>
                <span className="text-muted-foreground">Items Received</span>
                <div className="mt-1 border rounded">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-muted/50"><th className="p-2 text-left">Item</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Price</th></tr></thead>
                    <tbody>
                      {detailGRN.items.map((it, i) => (
                        <tr key={i} className="border-t"><td className="p-2">{it.description}</td><td className="p-2 text-right">{it.quantity}</td><td className="p-2 text-right">{egp(it.unitPrice)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
