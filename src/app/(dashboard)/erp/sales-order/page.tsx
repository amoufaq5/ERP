"use client";

import { useState, useMemo } from "react";
import { ShoppingBag, Truck, FileText, Plus, ArrowRight, CheckCircle, Package, X, Ban, AlertTriangle } from "lucide-react";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import StatusBadge from "@/components/shared/status-badge";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { useDataStore, type SalesOrder, type DeliveryNote } from "@/lib/data-store";
import { CustomerLink } from "@/components/shared/entity-detail-dialog";
import { useTranslation } from "@/lib/i18n/i18n-context";

interface SOLine {
  productId: string;
  quantity: number;
}

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

  // Multi-line-item SO form state
  const [soCustomerId, setSOCustomerId] = useState("");
  const [soExpectedDate, setSOExpectedDate] = useState("");
  const [soLines, setSOLines] = useState<SOLine[]>([{ productId: "", quantity: 1 }]);

  const customerName = (id: string) => store.customers.find((c) => c.id === id)?.name ?? id;

  // Stats
  const totalSOs = store.salesOrders.length;
  const confirmedSOs = store.salesOrders.filter((s) => s.status === "CONFIRMED").length;
  const processingSOs = store.salesOrders.filter((s) => s.status === "PROCESSING").length;
  const shippedSOs = store.salesOrders.filter((s) => s.status === "SHIPPED").length;
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

  function openSOModal(so?: SalesOrder | null) {
    if (so) {
      setEditingSO(so);
      setSOCustomerId(so.customerId);
      setSOExpectedDate(so.expectedDate?.slice(0, 10) ?? "");
      setSOLines(so.items.map((it) => ({ productId: it.productId, quantity: it.quantity })));
    } else {
      setEditingSO(null);
      setSOCustomerId("");
      setSOExpectedDate("");
      setSOLines([{ productId: "", quantity: 1 }]);
    }
    setShowSOModal(true);
  }

  function getLinePrice(productId: string) {
    return store.products.find((p) => p.id === productId)?.pricePerUnit ?? 0;
  }
  function getLineDesc(productId: string) {
    const product = store.products.find((p) => p.id === productId);
    return product ? `${product.name} ${product.strength}` : "Custom item";
  }

  const soSubtotal = soLines.reduce((sum, l) => sum + l.quantity * getLinePrice(l.productId), 0);
  const soTax = soSubtotal * 0.14;
  const soTotal = soSubtotal + soTax;

  function handleSOSubmit() {
    if (!soCustomerId || !soExpectedDate || soLines.length === 0) return;
    if (soLines.some((l) => !l.productId || l.quantity <= 0)) return;

    const items = soLines.map((l) => {
      const price = getLinePrice(l.productId);
      return {
        productId: l.productId,
        description: getLineDesc(l.productId),
        quantity: l.quantity,
        unitPrice: price,
        total: l.quantity * price,
      };
    });
    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const tax = subtotal * 0.14;
    const total = subtotal + tax;

    if (editingSO) {
      store.update("salesOrders", editingSO.id, {
        customerId: soCustomerId,
        items,
        subtotal, tax, total,
        expectedDate: soExpectedDate,
      });
    } else {
      store.add("salesOrders", {
        id: store.genId("so"),
        number: store.generateSONumber(),
        customerId: soCustomerId,
        date: new Date().toISOString(),
        expectedDate: soExpectedDate,
        items,
        subtotal, tax, total,
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

  // ─── Process Order (CONFIRMED → PROCESSING) — stock availability check ───
  function processOrder(so: SalesOrder) {
    const stockIssues: string[] = [];
    for (const item of so.items) {
      const product = store.products.find((p) => p.id === item.productId);
      if (product && product.stockQty < item.quantity) {
        stockIssues.push(`${product.name}: need ${item.quantity}, have ${product.stockQty}`);
      }
    }
    if (stockIssues.length > 0) {
      alert(`Cannot process — insufficient stock:\n${stockIssues.join("\n")}`);
      return;
    }

    // Deduct inventory at PROCESSING stage
    for (const item of so.items) {
      const product = store.products.find((p) => p.id === item.productId);
      if (product) {
        store.update("products", product.id, { stockQty: product.stockQty - item.quantity });
      }
    }

    store.update("salesOrders", so.id, { status: "PROCESSING" });
  }

  // ─── Mark Shipped (PROCESSING → SHIPPED) — auto-create DeliveryNote ───
  function markShipped(so: SalesOrder) {
    const dnId = store.genId("dn");
    store.add("deliveryNotes", {
      id: dnId,
      number: store.generateDNNumber(),
      soId: so.id,
      customerId: so.customerId,
      date: new Date().toISOString(),
      items: so.items.map((i) => ({ productId: i.productId, description: i.description, quantity: i.quantity })),
      status: "SHIPPED",
      createdAt: new Date().toISOString(),
    });
    store.update("salesOrders", so.id, { status: "SHIPPED", dnId });
  }

  // ─── Cancel Order (DRAFT or CONFIRMED → CANCELLED) ───
  function cancelOrder(so: SalesOrder) {
    if (so.status !== "DRAFT" && so.status !== "CONFIRMED") return;
    store.update("salesOrders", so.id, { status: "CANCELLED" });
  }

  // ─── Helper: get stock availability for a product vs required qty ───
  function getStockStatus(productId: string, requiredQty: number) {
    const product = store.products.find((p) => p.id === productId);
    if (!product) return { available: 0, sufficient: false, label: "N/A" };
    return {
      available: product.stockQty,
      sufficient: product.stockQty >= requiredQty,
      label: `${product.stockQty} in stock`,
    };
  }

  // ─── Integration: Confirm Delivery → auto-create Invoice + JE ───────
  // Stock is already deducted at PROCESSING stage, so no stock check here.
  function confirmDelivery(dn: DeliveryNote) {
    store.update("deliveryNotes", dn.id, { status: "DELIVERED" });

    const so = store.salesOrders.find((s) => s.id === dn.soId);
    if (!so) return;

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
          <Button onClick={() => openSOModal()}>
            <Plus className="h-4 w-4 mr-2" /> {t("so.createSO")}
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={ShoppingBag} title={t("so.totalSOs")} value={String(totalSOs)} subtitle={`${confirmedSOs} confirmed, ${processingSOs} processing`} iconColor="text-blue-600" />
        <StatsCard icon={Package} title={t("so.pendingDelivery")} value={String(shippedSOs)} subtitle={`${store.deliveryNotes.filter((d) => d.status === "PENDING").length} DN pending`} iconColor="text-amber-600" />
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
                { value: "PROCESSING", label: "Processing" }, { value: "SHIPPED", label: "Shipped" },
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
                        {so.status === "CONFIRMED" && (
                          <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700" onClick={() => processOrder(so)}>
                            <Package className="h-3 w-3 mr-1" /> Process Order
                          </Button>
                        )}
                        {so.status === "PROCESSING" && (
                          <Button size="sm" className="h-7 text-xs bg-cyan-600 hover:bg-cyan-700" onClick={() => markShipped(so)}>
                            <Truck className="h-3 w-3 mr-1" /> Mark Shipped
                          </Button>
                        )}
                        {(so.status === "DRAFT" || so.status === "CONFIRMED") && (
                          <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => cancelOrder(so)}>
                            <Ban className="h-3 w-3 mr-1" /> Cancel
                          </Button>
                        )}
                        <EditDeleteMenu
                          onView={() => setDetailSO(so)}
                          onEdit={so.status === "DRAFT" ? () => openSOModal(so) : undefined}
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
            <CardHeader className="pb-2"><CardTitle className="text-sm">Sales Cycle Integration — Full Lifecycle</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <Badge variant="outline">1. DRAFT</Badge>
                <ArrowRight className="h-3 w-3" />
                <Badge variant="outline" className="bg-blue-50">2. CONFIRMED (Submit for Approval)</Badge>
                <ArrowRight className="h-3 w-3" />
                <Badge variant="outline" className="bg-indigo-50">3. PROCESSING (Stock Check + Deduction)</Badge>
                <ArrowRight className="h-3 w-3" />
                <Badge variant="outline" className="bg-cyan-50">4. SHIPPED (Auto-create DN)</Badge>
                <ArrowRight className="h-3 w-3" />
                <Badge variant="outline" className="bg-amber-50">5. DELIVERED (DN Confirmed)</Badge>
                <ArrowRight className="h-3 w-3" />
                <Badge variant="outline" className="bg-green-50">6. INVOICED (Auto: Invoice + JE)</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">DRAFT and CONFIRMED orders can be cancelled. Stock is reserved at the PROCESSING stage.</p>
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

      {/* ── SO Form Modal (multi-line-item) ── */}
      <Dialog open={showSOModal} onOpenChange={(open) => { setShowSOModal(open); if (!open) setEditingSO(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSO ? `Edit ${editingSO.number}` : "New Sales Order"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">SO number will be generated automatically</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block text-sm">Customer</Label>
                <Select value={soCustomerId} onValueChange={setSOCustomerId}>
                  <SelectTrigger><SelectValue placeholder="Select customer..." /></SelectTrigger>
                  <SelectContent>
                    {store.customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Expected Delivery</Label>
                <Input type="date" value={soExpectedDate} onChange={(e) => setSOExpectedDate(e.target.value)} />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">Line Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setSOLines((prev) => [...prev, { productId: "", quantity: 1 }])}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Add Line
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-3 py-2 font-medium">Product</th>
                      <th className="text-right px-3 py-2 font-medium w-24">Qty</th>
                      <th className="text-right px-3 py-2 font-medium w-28">Unit Price</th>
                      <th className="text-right px-3 py-2 font-medium w-28">Line Total</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {soLines.map((line, idx) => {
                      const unitPrice = getLinePrice(line.productId);
                      const lineTotal = line.quantity * unitPrice;
                      return (
                        <tr key={idx}>
                          <td className="px-3 py-2">
                            <Select value={line.productId} onValueChange={(v) => setSOLines((prev) => prev.map((l, i) => i === idx ? { ...l, productId: v } : l))}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select product..." /></SelectTrigger>
                              <SelectContent>
                                {store.products.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>{p.name} {p.strength} ({p.code})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <Input type="number" min={1} className="h-8 text-sm text-right" value={line.quantity} onChange={(e) => setSOLines((prev) => prev.map((l, i) => i === idx ? { ...l, quantity: Math.max(1, Number(e.target.value)) } : l))} />
                          </td>
                          <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                            {unitPrice > 0 ? `EGP ${unitPrice.toLocaleString()}` : "—"}
                          </td>
                          <td className="px-3 py-2 text-right text-xs font-medium">
                            {lineTotal > 0 ? `EGP ${lineTotal.toLocaleString()}` : "—"}
                          </td>
                          <td className="px-1 py-2">
                            {soLines.length > 1 && (
                              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => setSOLines((prev) => prev.filter((_, i) => i !== idx))}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="border rounded-lg p-3 bg-muted/30 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">EGP {soSubtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (14%)</span>
                <span className="font-medium">EGP {soTax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-base">EGP {soTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setShowSOModal(false); setEditingSO(null); }}>Cancel</Button>
            <Button type="button" onClick={handleSOSubmit} disabled={!soCustomerId || !soExpectedDate || soLines.some((l) => !l.productId || l.quantity <= 0)}>
              {editingSO ? "Update" : "Create SO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    <thead><tr className="bg-muted/50"><th className="p-2 text-left">Product</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Price</th><th className="p-2 text-right">Total</th><th className="p-2 text-center">Stock</th></tr></thead>
                    <tbody>
                      {detailSO.items.map((it, i) => {
                        const stock = getStockStatus(it.productId, it.quantity);
                        return (
                          <tr key={i} className="border-t">
                            <td className="p-2">{it.description}</td>
                            <td className="p-2 text-right">{it.quantity}</td>
                            <td className="p-2 text-right">{egp(it.unitPrice)}</td>
                            <td className="p-2 text-right">{egp(it.total)}</td>
                            <td className="p-2 text-center">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${stock.sufficient ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                {stock.sufficient ? <CheckCircle className="h-2.5 w-2.5" /> : <AlertTriangle className="h-2.5 w-2.5" />}
                                {stock.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
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
