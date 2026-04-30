"use client";

import { useState, useMemo } from "react";
import { ShoppingBag, Truck, FileText, Plus, ArrowRight, CheckCircle, Package } from "lucide-react";
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
import { useDataStore, type SalesOrder, type DeliveryNote } from "@/lib/data-store";
import { CustomerLink } from "@/components/shared/entity-detail-dialog";
import { useTranslation } from "@/lib/i18n/i18n-context";

export default function SalesOrderPage() {
  const store = useDataStore();
  const [showSOModal, setShowSOModal] = useState(false);
  const [activeTab, setActiveTab] = useState("orders");
  const { t } = useTranslation();

  const [editingSO, setEditingSO] = useState<SalesOrder | null>(null);
  const [detailSO, setDetailSO] = useState<SalesOrder | null>(null);
  const [detailDN, setDetailDN] = useState<DeliveryNote | null>(null);

  const [soSearch, setSOSearch] = useState("");
  const [soFilters, setSOFilters] = useState<FilterState>({});

  const customerName = (id: string) => store.customers.find((c) => c.id === id)?.name ?? id;

  // Stats
  const totalSOs = store.salesOrders.length;
  const confirmedSOs = store.salesOrders.filter((s) => s.status === "CONFIRMED").length;
  const deliveredSOs = store.salesOrders.filter((s) => s.status === "DELIVERED").length;
  const totalRevenue = store.salesOrders.filter((s) => s.status === "INVOICED").reduce((sum, s) => sum + s.total, 0);

  const filteredSOs = useMemo(() => {
    return store.salesOrders.filter((so) => {
      const q = soSearch.toLowerCase();
      if (q && !so.number.toLowerCase().includes(q) && !customerName(so.customerId).toLowerCase().includes(q)) return false;
      if (soFilters.status && so.status !== soFilters.status) return false;
      return true;
    });
  }, [store.salesOrders, soSearch, soFilters]);

  const customerOptions = store.customers.map((c) => ({ value: c.id, label: c.name }));
  const productOptions = store.products.map((p) => ({ value: p.id, label: `${p.name} ${p.strength} (${p.code}) — EGP ${p.pricePerUnit}` }));

  const soFields: EntityField[] = [
    { name: "customerId", label: "Customer", type: "select", required: true, options: customerOptions },
    { name: "productId", label: "Product", type: "select", required: true, options: productOptions },
    { name: "quantity", label: "Quantity", type: "number", required: true },
    { name: "expectedDate", label: "Expected Delivery", type: "date", required: true },
  ];

  function handleSOSubmit(data: EntityFormData) {
    const product = store.products.find((p) => p.id === String(data.productId));
    const desc = product ? `${product.name} ${product.strength}` : "Custom item";
    const price = product?.pricePerUnit ?? 0;
    const qty = Number(data.quantity);
    const lineTotal = qty * price;
    const tax = lineTotal * 0.14;
    const total = lineTotal + tax;

    if (editingSO) {
      store.update("salesOrders", editingSO.id, {
        customerId: String(data.customerId),
        items: [{ productId: String(data.productId), description: desc, quantity: qty, unitPrice: price, total: lineTotal }],
        subtotal: lineTotal, tax, total,
        expectedDate: String(data.expectedDate),
      });
    } else {
      store.add("salesOrders", {
        id: store.genId("so"),
        number: store.generateSONumber(),
        customerId: String(data.customerId),
        date: new Date().toISOString(),
        expectedDate: String(data.expectedDate),
        items: [{ productId: String(data.productId), description: desc, quantity: qty, unitPrice: price, total: lineTotal }],
        subtotal: lineTotal, tax, total,
        status: "DRAFT",
        createdAt: new Date().toISOString(),
      });
    }
    setShowSOModal(false);
    setEditingSO(null);
  }

  // ─── Submit SO for approval (status → CONFIRMED, sent to Finance) ────
  function submitSOForApproval(so: SalesOrder) {
    store.update("salesOrders", so.id, { status: "CONFIRMED" });
  }

  // ─── Integration: Confirm Delivery → auto-create Invoice + JE ───────
  function confirmDelivery(dn: DeliveryNote) {
    store.update("deliveryNotes", dn.id, { status: "DELIVERED" });

    const so = store.salesOrders.find((s) => s.id === dn.soId);
    if (!so) return;

    // Stock check before fulfillment
    for (const item of so.items) {
      const product = store.products.find((p) => p.id === item.productId);
      if (product && product.stockQty < item.quantity) {
        alert(`Insufficient stock for ${product.name}: need ${item.quantity}, have ${product.stockQty}`);
        return;
      }
    }

    // Deduct inventory
    for (const item of so.items) {
      const product = store.products.find((p) => p.id === item.productId);
      if (product) {
        store.update("products", product.id, { stockQty: product.stockQty - item.quantity });
      }
    }

    const invId = store.genId("inv");
    store.add("invoices", {
      id: invId,
      number: store.generateInvoiceNumber(),
      customerId: so.customerId,
      date: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      subtotal: so.subtotal, tax: so.tax, total: so.total,
      currency: "EGP", status: "SENT",
      items: so.items.map((i) => ({ productId: i.productId, description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),
      notes: `Auto-generated from SO ${so.number} / DN ${dn.number}`,
    });

    store.add("journalEntries", {
      id: store.genId("je"),
      number: store.generateJournalNumber(),
      date: new Date().toISOString().split("T")[0],
      description: `Sales revenue — SO ${so.number}`,
      reference: so.number, type: "GENERAL",
      lines: [
        { accountId: "gl-1100", description: "Accounts Receivable", debit: so.total, credit: 0 },
        { accountId: "gl-4000", description: "Product Sales Revenue", debit: 0, credit: so.subtotal },
        { accountId: "gl-2100", description: "VAT Payable", debit: 0, credit: so.tax },
      ],
      status: "POSTED", createdBy: "u-admin", createdAt: new Date().toISOString(),
    });

    store.update("salesOrders", so.id, { status: "INVOICED", invoiceId: invId });
  }

  const egp = (n: number) => `EGP ${n.toLocaleString()}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("so.title")}
        description={t("so.manageSO")}
        actions={
          <Button onClick={() => { setEditingSO(null); setShowSOModal(true); }}>
            <Plus className="h-4 w-4 mr-2" /> {t("so.createSO")}
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={ShoppingBag} title={t("so.totalSOs")} value={String(totalSOs)} subtitle={`${confirmedSOs} confirmed`} iconColor="text-blue-600" />
        <StatsCard icon={Package} title={t("so.pendingDelivery")} value={String(store.deliveryNotes.filter((d) => d.status === "PENDING").length)} subtitle="Awaiting shipment" iconColor="text-amber-600" />
        <StatsCard icon={Truck} title="Delivered" value={String(deliveredSOs)} subtitle="Completed" iconColor="text-green-600" />
        <StatsCard icon={FileText} title={t("so.invoicedRevenue")} value={egp(totalRevenue)} subtitle="From completed SOs" iconColor="text-purple-600" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders">{t("so.title")} ({store.salesOrders.length})</TabsTrigger>
          <TabsTrigger value="delivery">{t("so.deliveryNotes")} ({store.deliveryNotes.length})</TabsTrigger>
        </TabsList>

        {/* ── Sales Orders Tab ── */}
        <TabsContent value="orders" className="space-y-4">
          <FilterBar
            searchPlaceholder="Search by SO #, customer..."
            searchValue={soSearch}
            onSearchChange={setSOSearch}
            fields={[
              { key: "status", label: "Status", type: "select" as const, options: [
                { value: "DRAFT", label: "Draft" }, { value: "CONFIRMED", label: "Confirmed" },
                { value: "DELIVERED", label: "Delivered" }, { value: "INVOICED", label: "Invoiced" },
                { value: "CANCELLED", label: "Cancelled" },
              ]},
            ]}
            values={soFilters}
            onChange={(key, value) => setSOFilters((prev) => ({ ...prev, [key]: value }))}
          />
          <Card>
            <CardHeader>
              <CardTitle>Sales Orders</CardTitle>
              <CardDescription>Auto-numbered SOs with integration to delivery &amp; invoicing</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "number", label: "SO #", render: (v: string) => <span className="font-mono text-xs font-semibold">{v}</span> },
                  { key: "customerId", label: "Customer", render: (v: string) => <CustomerLink customerId={v} /> },
                  { key: "items", label: "Items", render: (_v: unknown, row: Record<string, unknown>) => {
                    const so = row as unknown as SalesOrder;
                    return <span className="text-sm">{so.items.map((i) => `${i.description} ×${i.quantity}`).join(", ")}</span>;
                  }},
                  { key: "total", label: "Total", className: "text-right", render: (v: number) => <span className="font-semibold">{egp(v)}</span> },
                  { key: "date", label: "Date", render: (v: string) => v?.slice(0, 10) },
                  { key: "status", label: "Status", render: (v: string) => <StatusBadge status={v} /> },
                  { key: "id", label: "Actions", className: "text-right", render: (_v: unknown, row: Record<string, unknown>) => {
                    const so = row as unknown as SalesOrder;
                    return (
                      <div className="flex items-center justify-end gap-1">
                        {so.status === "DRAFT" && (
                          <Button size="sm" className="h-7 text-xs" onClick={() => submitSOForApproval(so)}>
                            <ArrowRight className="h-3 w-3 mr-1" /> Submit for Approval
                          </Button>
                        )}
                        <EditDeleteMenu
                          onView={() => setDetailSO(so)}
                          onEdit={so.status === "DRAFT" ? () => { setEditingSO(so); setShowSOModal(true); } : undefined}
                          onDelete={so.status === "DRAFT" ? () => store.remove("salesOrders", so.id) : undefined}
                          canView
                          itemLabel={so.number}
                          compact
                        />
                      </div>
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={filteredSOs as unknown as Record<string, unknown>[]}
                exportable exportFilename="sales-orders.csv" emptyMessage="No sales orders."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Sales Cycle Integration</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <Badge variant="outline">SO Created (DRAFT)</Badge>
                <ArrowRight className="h-3 w-3" />
                <Badge variant="outline" className="bg-blue-50">Submit for Approval</Badge>
                <ArrowRight className="h-3 w-3" />
                <Badge variant="outline" className="bg-amber-50">Finance/Accounting Reviews + Stock Check</Badge>
                <ArrowRight className="h-3 w-3" />
                <Badge variant="outline" className="bg-green-50">Approved → Inventory Deduction + Invoice + JE</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Delivery Notes Tab ── */}
        <TabsContent value="delivery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Notes</CardTitle>
              <CardDescription>Auto-created when SOs are confirmed. Confirm delivery to generate invoice &amp; journal entry.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "number", label: "DN #", render: (v: string) => <span className="font-mono text-xs font-semibold">{v}</span> },
                  { key: "soId", label: "SO Ref", render: (v: string) => {
                    const so = store.salesOrders.find((s) => s.id === v);
                    return <span className="font-mono text-xs">{so?.number ?? v}</span>;
                  }},
                  { key: "customerId", label: "Customer", render: (v: string) => <CustomerLink customerId={v} /> },
                  { key: "items", label: "Items", render: (_v: unknown, row: Record<string, unknown>) => {
                    const dn = row as unknown as DeliveryNote;
                    return <span className="text-sm">{dn.items.map((i) => `${i.description} ×${i.quantity}`).join(", ")}</span>;
                  }},
                  { key: "date", label: "Date", render: (v: string) => v?.slice(0, 10) },
                  { key: "status", label: "Status", render: (v: string) => <StatusBadge status={v} /> },
                  { key: "id", label: "Actions", className: "text-right", render: (_v: unknown, row: Record<string, unknown>) => {
                    const dn = row as unknown as DeliveryNote;
                    return (
                      <div className="flex items-center justify-end gap-1">
                        {dn.status === "PENDING" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => store.update("deliveryNotes", dn.id, { status: "SHIPPED" })}>
                            Ship
                          </Button>
                        )}
                        {dn.status === "SHIPPED" && (
                          <Button size="sm" className="h-7 text-xs" onClick={() => confirmDelivery(dn)}>
                            <CheckCircle className="h-3 w-3 mr-1" /> Confirm Delivery
                          </Button>
                        )}
                        <EditDeleteMenu
                          onView={() => setDetailDN(dn)}
                          canView
                          itemLabel={dn.number}
                          compact
                        />
                      </div>
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={store.deliveryNotes as unknown as Record<string, unknown>[]}
                exportable exportFilename="delivery-notes.csv" emptyMessage="No delivery notes."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── SO Form Modal ── */}
      <EntityFormModal
        open={showSOModal}
        onOpenChange={(open) => { setShowSOModal(open); if (!open) setEditingSO(null); }}
        title={editingSO ? `Edit ${editingSO.number}` : "New Sales Order"}
        description="SO number will be generated automatically"
        fields={soFields}
        initialData={editingSO ? {
          customerId: editingSO.customerId,
          productId: editingSO.items[0]?.productId ?? "",
          quantity: editingSO.items[0]?.quantity ?? 0,
          expectedDate: editingSO.expectedDate?.slice(0, 10) ?? "",
        } : undefined}
        onSubmit={handleSOSubmit}
        submitLabel={editingSO ? "Update" : "Create SO"}
      />

      {/* ── SO Detail Dialog ── */}
      <Dialog open={!!detailSO} onOpenChange={(o) => !o && setDetailSO(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{detailSO?.number}</DialogTitle></DialogHeader>
          {detailSO && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Customer</span><p className="font-medium">{customerName(detailSO.customerId)}</p></div>
                <div><span className="text-muted-foreground">Status</span><p><StatusBadge status={detailSO.status} /></p></div>
                <div><span className="text-muted-foreground">Date</span><p>{detailSO.date?.slice(0, 10)}</p></div>
                <div><span className="text-muted-foreground">Expected</span><p>{detailSO.expectedDate?.slice(0, 10)}</p></div>
                <div><span className="text-muted-foreground">Subtotal</span><p>{egp(detailSO.subtotal)}</p></div>
                <div><span className="text-muted-foreground">Tax (14%)</span><p>{egp(detailSO.tax)}</p></div>
                <div className="col-span-2"><span className="text-muted-foreground">Total</span><p className="text-lg font-bold">{egp(detailSO.total)}</p></div>
              </div>
              <div>
                <span className="text-muted-foreground">Items</span>
                <div className="mt-1 border rounded">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-muted/50"><th className="p-2 text-left">Product</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Price</th><th className="p-2 text-right">Total</th></tr></thead>
                    <tbody>
                      {detailSO.items.map((it, i) => (
                        <tr key={i} className="border-t"><td className="p-2">{it.description}</td><td className="p-2 text-right">{it.quantity}</td><td className="p-2 text-right">{egp(it.unitPrice)}</td><td className="p-2 text-right">{egp(it.total)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {detailSO.dnId && <div><span className="text-muted-foreground">Delivery Note</span><p className="font-mono text-xs">{store.deliveryNotes.find((d) => d.id === detailSO.dnId)?.number ?? detailSO.dnId}</p></div>}
              {detailSO.invoiceId && <div><span className="text-muted-foreground">Invoice</span><p className="font-mono text-xs">{store.invoices.find((inv) => inv.id === detailSO.invoiceId)?.number ?? detailSO.invoiceId}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── DN Detail Dialog ── */}
      <Dialog open={!!detailDN} onOpenChange={(o) => !o && setDetailDN(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{detailDN?.number}</DialogTitle></DialogHeader>
          {detailDN && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">SO Reference</span><p className="font-mono text-xs">{store.salesOrders.find((s) => s.id === detailDN.soId)?.number ?? detailDN.soId}</p></div>
                <div><span className="text-muted-foreground">Customer</span><p>{customerName(detailDN.customerId)}</p></div>
                <div><span className="text-muted-foreground">Date</span><p>{detailDN.date?.slice(0, 10)}</p></div>
                <div><span className="text-muted-foreground">Status</span><p><StatusBadge status={detailDN.status} /></p></div>
              </div>
              <div>
                <span className="text-muted-foreground">Items</span>
                <div className="mt-1 border rounded">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-muted/50"><th className="p-2 text-left">Item</th><th className="p-2 text-right">Qty</th></tr></thead>
                    <tbody>
                      {detailDN.items.map((it, i) => (
                        <tr key={i} className="border-t"><td className="p-2">{it.description}</td><td className="p-2 text-right">{it.quantity}</td></tr>
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
