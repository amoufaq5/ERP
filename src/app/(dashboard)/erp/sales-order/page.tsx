"use client";

import { useState, useMemo } from "react";
import { ShoppingBag, Truck, FileText, Plus, ArrowRight, CheckCircle, Package, X, Ban, AlertTriangle, RotateCcw, Clock, DollarSign, TrendingDown } from "lucide-react";
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
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { useDataStore, type SalesOrder, type DeliveryNote } from "@/lib/data-store";
import { CustomerLink } from "@/components/shared/entity-detail-dialog";
import { useTranslation } from "@/lib/i18n/i18n-context";

interface SOLine {
  productId: string;
  quantity: number;
}

// ── Returns seed data ──────────────────────────────────────────────────────
const RETURNS = [
  { id: "RET-1001", customer: "Al-Shifa Pharmacy", product: "Augmentin 625mg Tab", batch: "AUG2024-08", qty: 120, reason: "Near-Expiry", invoice: "INV-2401", value: 1440, date: "2026-03-28", status: "Pending" },
  { id: "RET-1002", customer: "National Hospital", product: "Cardizem 60mg", batch: "CAR2024-12", qty: 80, reason: "Expired", invoice: "INV-2380", value: 960, date: "2026-03-27", status: "Approved" },
  { id: "RET-1003", customer: "MedPlus Distributors", product: "Voltaren 75mg", batch: "VOL2025-03", qty: 200, reason: "Damaged Packaging", invoice: "INV-2410", value: 1800, date: "2026-03-26", status: "Received" },
  { id: "RET-1004", customer: "Cairo Medical Supply", product: "Nexium 40mg", batch: "NEX2025-01", qty: 60, reason: "Wrong Product", invoice: "INV-2395", value: 1080, date: "2026-03-25", status: "Credit Issued" },
  { id: "RET-1005", customer: "Alexandria Pharmacy Chain", product: "Plavix 75mg", batch: "PLA2024-11", qty: 150, reason: "Product Recall", invoice: "INV-2370", value: 3750, date: "2026-03-24", status: "Approved" },
  { id: "RET-1006", customer: "Delta Pharma", product: "Crestor 20mg", batch: "CRE2025-02", qty: 90, reason: "Excess Stock", invoice: "INV-2415", value: 1620, date: "2026-03-23", status: "Pending" },
  { id: "RET-1007", customer: "Giza Hospital", product: "Herceptin", batch: "HER2025-01", qty: 5, reason: "Temperature Excursion", invoice: "INV-2401", value: 8500, date: "2026-03-22", status: "Approved" },
  { id: "RET-1008", customer: "Family Pharmacy Group", product: "Panadol Extra", batch: "PAN2025-04", qty: 300, reason: "Damaged Packaging", invoice: "INV-2420", value: 900, date: "2026-03-21", status: "Received" },
  { id: "RET-1009", customer: "Mansoura Pharma", product: "Fucidin H Cream", batch: "FUC2024-09", qty: 75, reason: "Near-Expiry", invoice: "INV-2360", value: 675, date: "2026-03-20", status: "Credit Issued" },
  { id: "RET-1010", customer: "Tanta Medical Supply", product: "Augmentin Susp", batch: "AGS2025-02", qty: 180, reason: "Excess Stock", invoice: "INV-2425", value: 2160, date: "2026-03-19", status: "Rejected" },
  { id: "RET-1011", customer: "Suez Hospital", product: "Depakine Chrono", batch: "DEP2024-10", qty: 100, reason: "Expired", invoice: "INV-2350", value: 1500, date: "2026-03-18", status: "Approved" },
  { id: "RET-1012", customer: "Zagazig Pharmacy", product: "Otrivin Spray", batch: "OTR2025-01", qty: 250, reason: "Wrong Product", invoice: "INV-2430", value: 1250, date: "2026-03-17", status: "Pending" },
];

const CREDIT_NOTES = [
  { id: "CN-501", returnRef: "RET-1004", customer: "Cairo Medical Supply", amount: 1080, taxAdj: 151, net: 929, date: "2026-03-26", appliedTo: "INV-2440", status: "Applied" },
  { id: "CN-502", returnRef: "RET-1009", customer: "Mansoura Pharma", amount: 675, taxAdj: 94, net: 581, date: "2026-03-22", appliedTo: "INV-2445", status: "Applied" },
  { id: "CN-503", returnRef: "RET-1002", customer: "National Hospital", amount: 960, taxAdj: 134, net: 826, date: "2026-03-29", appliedTo: "Pending", status: "Issued" },
  { id: "CN-504", returnRef: "RET-1005", customer: "Alexandria Pharmacy Chain", amount: 3750, taxAdj: 525, net: 3225, date: "2026-03-26", appliedTo: "Pending", status: "Issued" },
  { id: "CN-505", returnRef: "RET-1007", customer: "Giza Hospital", amount: 8500, taxAdj: 1190, net: 7310, date: "2026-03-24", appliedTo: "Pending", status: "Issued" },
  { id: "CN-506", returnRef: "RET-1011", customer: "Suez Hospital", amount: 1500, taxAdj: 210, net: 1290, date: "2026-03-20", appliedTo: "INV-2450", status: "Applied" },
  { id: "CN-507", returnRef: "RET-1003", customer: "MedPlus Distributors", amount: 1800, taxAdj: 252, net: 1548, date: "2026-03-28", appliedTo: "Pending", status: "Issued" },
  { id: "CN-508", returnRef: "RET-1008", customer: "Family Pharmacy Group", amount: 900, taxAdj: 126, net: 774, date: "2026-03-23", appliedTo: "INV-2455", status: "Applied" },
];

const DESTRUCTION = [
  { id: "DES-201", product: "Augmentin 625mg Tab", batch: "AUG2024-08", qty: 120, reason: "Expired", method: "Incineration", witnessed: "QA Manager + External Auditor", date: "2026-03-30", certificate: "CERT-2026-031", status: "Completed" },
  { id: "DES-202", product: "Cardizem 60mg", batch: "CAR2024-12", qty: 80, reason: "Expired", method: "Incineration", witnessed: "QA Manager", date: "2026-03-29", certificate: "CERT-2026-030", status: "Completed" },
  { id: "DES-203", product: "Plavix 75mg", batch: "PLA2024-11", qty: 150, reason: "Recalled", method: "Crushing & Disposal", witnessed: "QA Manager + Compliance Officer", date: "2026-03-28", certificate: "CERT-2026-029", status: "Completed" },
  { id: "DES-204", product: "Herceptin", batch: "HER2025-01", qty: 5, reason: "Failed QC (Temp)", method: "Special Hazardous Disposal", witnessed: "QA + Regulatory + 3rd Party", date: "2026-03-25", certificate: "CERT-2026-028", status: "Completed" },
  { id: "DES-205", product: "Depakine Chrono", batch: "DEP2024-10", qty: 100, reason: "Expired", method: "Incineration", witnessed: "QA Manager", date: "2026-03-22", certificate: "CERT-2026-027", status: "Completed" },
  { id: "DES-206", product: "Voltaren 75mg", batch: "VOL2025-03", qty: 200, reason: "Damaged", method: "Crushing & Disposal", witnessed: "QA Manager", date: "2026-03-31", certificate: "Pending", status: "Scheduled" },
];

const REASONS = ["Near-Expiry", "Expired", "Damaged Packaging", "Product Recall", "Wrong Product", "Excess Stock", "Temperature Excursion"];

const returnFields: EntityField[] = [
  { name: "customer", label: "Customer", type: "text", required: true },
  { name: "product", label: "Product", type: "text", required: true },
  { name: "batch", label: "Batch#", type: "text", required: true },
  { name: "qty", label: "Quantity", type: "number", required: true },
  { name: "reason", label: "Reason", type: "select", required: true, options: REASONS.map(r => ({ label: r, value: r })) },
  { name: "invoice", label: "Original Invoice#", type: "text", required: true },
  { name: "value", label: "Return Value (EGP)", type: "number" },
];

const creditFields: EntityField[] = [
  { name: "returnRef", label: "Return Reference", type: "text", required: true },
  { name: "customer", label: "Customer", type: "text", required: true },
  { name: "amount", label: "Amount (EGP)", type: "number", required: true },
  { name: "taxAdj", label: "Tax Adjustment (EGP)", type: "number" },
  { name: "net", label: "Net Credit (EGP)", type: "number" },
  { name: "appliedTo", label: "Applied To Invoice", type: "text", placeholder: "INV-XXXX or Pending" },
];

const destructionFields: EntityField[] = [
  { name: "product", label: "Product", type: "text", required: true },
  { name: "batch", label: "Batch#", type: "text", required: true },
  { name: "qty", label: "Quantity", type: "number", required: true },
  { name: "reason", label: "Reason", type: "select", required: true, options: [
    { label: "Expired", value: "Expired" }, { label: "Recalled", value: "Recalled" },
    { label: "Failed QC", value: "Failed QC" }, { label: "Damaged", value: "Damaged" },
    { label: "Failed QC (Temp)", value: "Failed QC (Temp)" },
  ]},
  { name: "method", label: "Method", type: "select", required: true, options: [
    { label: "Incineration", value: "Incineration" }, { label: "Crushing & Disposal", value: "Crushing & Disposal" },
    { label: "Special Hazardous Disposal", value: "Special Hazardous Disposal" },
  ]},
  { name: "witnessed", label: "Witnessed By", type: "text", required: true },
  { name: "date", label: "Scheduled Date", type: "date", required: true },
];

type ReturnModalType = { kind: "return"; editing: typeof RETURNS[0] | null } | { kind: "credit"; editing: typeof CREDIT_NOTES[0] | null } | { kind: "destruction"; editing: typeof DESTRUCTION[0] | null } | null;

export default function SalesOrderPage() {
  const store = useDataStore();
  const [showSOModal, setShowSOModal] = useState(false);
  const [activeTab, setActiveTab] = useState("orders");
  const { t } = useTranslation();

  // ── Top-level view: "sales" or "returns" ──
  const [topView, setTopView] = useState<"sales" | "returns">("sales");

  const [editingSO, setEditingSO] = useState<SalesOrder | null>(null);
  const [detailSO, setDetailSO] = useState<SalesOrder | null>(null);
  const [detailDN, setDetailDN] = useState<DeliveryNote | null>(null);

  const [soSearch, setSOSearch] = useState("");
  const [soFilters, setSOFilters] = useState<FilterState>({});

  // Multi-line-item SO form state
  const [soCustomerId, setSOCustomerId] = useState("");
  const [soExpectedDate, setSOExpectedDate] = useState("");
  const [soLines, setSOLines] = useState<SOLine[]>([{ productId: "", quantity: 1 }]);

  // ── Returns state ──
  const [returns, setReturns] = useState(RETURNS);
  const [credits, setCredits] = useState(CREDIT_NOTES);
  const [destructions, setDestructions] = useState(DESTRUCTION);
  const [returnModal, setReturnModal] = useState<ReturnModalType>(null);
  const [retFilters, setRetFilters] = useState<FilterState>({});
  const [detailReturn, setDetailReturn] = useState<typeof RETURNS[0] | null>(null);
  const [returnsSubTab, setReturnsSubTab] = useState("requests");

  const customerName = (id: string) => store.customers.find((c) => c.id === id)?.name ?? id;

  // Stats
  const totalSOs = store.salesOrders.length;
  const confirmedSOs = store.salesOrders.filter((s) => s.status === "CONFIRMED").length;
  const processingSOs = store.salesOrders.filter((s) => s.status === "PROCESSING").length;
  const shippedSOs = store.salesOrders.filter((s) => s.status === "SHIPPED").length;
  const deliveredSOs = store.salesOrders.filter((s) => s.status === "DELIVERED").length;
  const totalRevenue = store.salesOrders.filter((s) => s.status === "INVOICED").reduce((sum, s) => sum + s.total, 0);

  // Returns stats
  const retPending = returns.filter(r => r.status === "Pending").length;
  const retTotalValue = returns.reduce((s, r) => s + r.value, 0);
  const retApprovedValue = returns.filter(r => r.status === "Approved" || r.status === "Credit Issued").reduce((s, r) => s + r.value, 0);
  const retRate = retTotalValue > 0 ? ((returns.length / (returns.length + 500)) * 100).toFixed(1) : "0.0";

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
  const fmt = (n: number) => "EGP " + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <PageHeader
        title={topView === "sales" ? t("so.title") : t("ret.title")}
        description={topView === "sales" ? t("so.manageSO") : t("ret.manageReturns")}
        actions={
          topView === "sales" ? (
            <Button onClick={() => openSOModal()}>
              <Plus className="h-4 w-4 mr-2" /> {t("so.createSO")}
            </Button>
          ) : (
            <Button onClick={() => setReturnModal({ kind: "return", editing: null })}>
              <Plus className="h-4 w-4 mr-2" /> New Return Request
            </Button>
          )
        }
      />

      {/* ── Top-level view toggle ── */}
      <div className="flex gap-2">
        <Button
          variant={topView === "sales" ? "default" : "ghost"}
          onClick={() => setTopView("sales")}
        >
          <ShoppingBag className="h-4 w-4 mr-2" /> Sales Orders
        </Button>
        <Button
          variant={topView === "returns" ? "default" : "ghost"}
          onClick={() => setTopView("returns")}
        >
          <RotateCcw className="h-4 w-4 mr-2" /> Returns &amp; Credits
        </Button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ── SALES ORDERS VIEW ── */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {topView === "sales" && (
        <>
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
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ── RETURNS & CREDITS VIEW ── */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {topView === "returns" && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard icon={RotateCcw} title="Total Returns" value={returns.length} subtitle="This month" iconColor="bg-blue-100 text-blue-700" />
            <StatsCard icon={Clock} title="Pending Returns" value={retPending} iconColor="bg-amber-100 text-amber-700" />
            <StatsCard icon={DollarSign} title="Approved Value" value={fmt(retApprovedValue)} iconColor="bg-green-100 text-green-700" />
            <StatsCard icon={TrendingDown} title="Return Rate" value={`${retRate}%`} subtitle="Of total sales (estimated)" iconColor="bg-red-100 text-red-700" />
          </div>

          <Tabs value={returnsSubTab} onValueChange={setReturnsSubTab}>
            <TabsList>
              <TabsTrigger value="requests">Return Requests</TabsTrigger>
              <TabsTrigger value="credits">Credit Notes</TabsTrigger>
              <TabsTrigger value="destruction">Destruction Log</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="requests" className="space-y-4">
              <FilterBar
                searchPlaceholder="Search returns..."
                searchValue={retFilters._search ?? ""}
                onSearchChange={(v) => setRetFilters(prev => ({ ...prev, _search: v }))}
                fields={[
                  { key: "status", label: "Status", type: "select", options: [
                    { label: "Pending", value: "Pending" }, { label: "Approved", value: "Approved" },
                    { label: "Received", value: "Received" }, { label: "Credit Issued", value: "Credit Issued" },
                    { label: "Rejected", value: "Rejected" },
                  ]},
                  { key: "reason", label: "Reason", type: "select", options: REASONS.map(r => ({ label: r, value: r })) },
                ]}
                values={retFilters}
                onChange={(k, v) => setRetFilters(f => ({ ...f, [k]: v }))}
                rightSlot={<Button size="sm" onClick={() => setReturnModal({ kind: "return", editing: null })}><Plus className="mr-2 h-4 w-4" />Add Return</Button>}
              />
              <Card>
                <CardHeader><CardTitle>Return Requests</CardTitle><CardDescription>{returns.length} return requests</CardDescription></CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: "id", label: "Return#", render: (v) => <span className="font-mono">{v as string}</span> },
                      { key: "customer", label: "Customer", render: (v) => <span className="font-medium">{v as string}</span> },
                      { key: "product", label: "Product" },
                      { key: "batch", label: "Batch#", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
                      { key: "qty", label: "Qty" },
                      { key: "reason", label: "Reason", render: (v) => <StatusBadge status={v as string} /> },
                      { key: "invoice", label: "Invoice", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
                      { key: "value", label: "Value", render: (v) => <span className="font-semibold">{fmt(v as number)}</span> },
                      { key: "date", label: "Date" },
                      { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
                      { key: "_actions", label: "Actions", render: (_v, row) => {
                        const r = row as unknown as typeof RETURNS[0];
                        const flow: Record<string, string> = { "Pending": "Approved", "Approved": "Received", "Received": "Credit Issued" };
                        const next = flow[r.status];
                        return (
                          <EditDeleteMenu
                            onEdit={() => setReturnModal({ kind: "return", editing: r })}
                            onDelete={() => setReturns(prev => prev.filter(x => x.id !== r.id))}
                            onView={() => setDetailReturn(r)}
                            canView
                            itemLabel={r.id}
                            extraItems={[
                              ...(next ? [{ label: `→ ${next}`, onClick: () => setReturns(prev => prev.map(x => x.id === r.id ? { ...x, status: next } : x)) }] : []),
                              ...(r.status === "Pending" ? [{ label: "Reject", onClick: () => setReturns(prev => prev.map(x => x.id === r.id ? { ...x, status: "Rejected" } : x)), destructive: true }] : []),
                            ]}
                          />
                        );
                      }},
                    ] satisfies Column<Record<string, unknown>>[]}
                    data={returns
                      .filter(r => !retFilters._search || r.id.toLowerCase().includes(retFilters._search.toLowerCase()) || r.customer.toLowerCase().includes(retFilters._search.toLowerCase()) || r.product.toLowerCase().includes(retFilters._search.toLowerCase()))
                      .filter(r => !retFilters.status || r.status === retFilters.status)
                      .filter(r => !retFilters.reason || r.reason === retFilters.reason) as unknown as Record<string, unknown>[]}
                    exportable exportFilename="erp-returns.csv" emptyMessage="No return requests found."
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="credits" className="space-y-4">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setReturnModal({ kind: "credit", editing: null })}><Plus className="mr-2 h-4 w-4" />Issue Credit Note</Button>
              </div>
              <Card>
                <CardHeader><CardTitle>Credit Notes</CardTitle><CardDescription>Issued credit notes for approved returns</CardDescription></CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: "id", label: "Credit Note#", render: (v) => <span className="font-mono">{v as string}</span> },
                      { key: "returnRef", label: "Return Ref", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
                      { key: "customer", label: "Customer", render: (v) => <span className="font-medium">{v as string}</span> },
                      { key: "amount", label: "Amount", render: (v) => fmt(v as number) },
                      { key: "taxAdj", label: "Tax Adj", render: (v) => fmt(v as number) },
                      { key: "net", label: "Net Credit", render: (v) => <span className="font-semibold">{fmt(v as number)}</span> },
                      { key: "date", label: "Issue Date" },
                      { key: "appliedTo", label: "Applied To" },
                      { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
                      { key: "_actions", label: "Actions", render: (_v, row) => {
                        const c = row as unknown as typeof CREDIT_NOTES[0];
                        const nextCn = c.status === "Issued" ? "Applied" : undefined;
                        return (
                          <EditDeleteMenu
                            onEdit={() => setReturnModal({ kind: "credit", editing: c })}
                            onDelete={() => setCredits(prev => prev.filter(x => x.id !== c.id))}
                            itemLabel={c.id}
                            extraItems={nextCn ? [{ label: `→ ${nextCn}`, onClick: () => setCredits(prev => prev.map(x => x.id === c.id ? { ...x, status: nextCn } : x)) }] : []}
                          />
                        );
                      }},
                    ] satisfies Column<Record<string, unknown>>[]}
                    data={credits as unknown as Record<string, unknown>[]}
                    exportable exportFilename="erp-returns.csv" emptyMessage="No credit notes found."
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="destruction" className="space-y-4">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setReturnModal({ kind: "destruction", editing: null })}><Plus className="mr-2 h-4 w-4" />Schedule Destruction</Button>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" />Destruction Log</CardTitle>
                  <CardDescription>Documented destruction of unsellable pharmaceutical products (regulatory requirement)</CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: "id", label: "Log#", render: (v) => <span className="font-mono">{v as string}</span> },
                      { key: "product", label: "Product", render: (v) => <span className="font-medium">{v as string}</span> },
                      { key: "batch", label: "Batch#", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
                      { key: "qty", label: "Qty" },
                      { key: "reason", label: "Reason", render: (v) => <StatusBadge status={v as string} /> },
                      { key: "method", label: "Method" },
                      { key: "witnessed", label: "Witnessed By", className: "text-xs" },
                      { key: "date", label: "Date" },
                      { key: "certificate", label: "Certificate#", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
                      { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
                      { key: "_actions", label: "Actions", render: (_v, row) => {
                        const d = row as unknown as typeof DESTRUCTION[0];
                        const nextD = d.status === "Scheduled" ? "Completed" : undefined;
                        return (
                          <EditDeleteMenu
                            onEdit={() => setReturnModal({ kind: "destruction", editing: d })}
                            onDelete={() => setDestructions(prev => prev.filter(x => x.id !== d.id))}
                            itemLabel={d.id}
                            extraItems={nextD ? [{ label: `→ ${nextD}`, onClick: () => setDestructions(prev => prev.map(x => x.id === d.id ? { ...x, status: nextD, certificate: `CERT-2026-${String(32 + prev.indexOf(x)).padStart(3, "0")}` } : x)) }] : []}
                          />
                        );
                      }},
                    ] satisfies Column<Record<string, unknown>>[]}
                    data={destructions as unknown as Record<string, unknown>[]}
                    exportable exportFilename="erp-returns.csv" emptyMessage="No destruction records found."
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics">
              {(() => {
                const reasonCounts = returns.reduce<Record<string, number>>((acc, r) => {
                  acc[r.reason] = (acc[r.reason] || 0) + 1;
                  return acc;
                }, {});
                const reasonBreakdown = Object.entries(reasonCounts)
                  .map(([reason, count]) => ({ reason, count, pct: Math.round((count / returns.length) * 100) }))
                  .sort((a, b) => b.count - a.count);

                const customerTotals = returns.reduce<Record<string, number>>((acc, r) => {
                  acc[r.customer] = (acc[r.customer] || 0) + r.value;
                  return acc;
                }, {});
                const topCustomers = Object.entries(customerTotals)
                  .map(([customer, total]) => ({ customer, total }))
                  .sort((a, b) => b.total - a.total)
                  .slice(0, 5);

                const maxPct = reasonBreakdown.length > 0 ? reasonBreakdown[0].pct : 1;

                return (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader><CardTitle>Top Return Reasons</CardTitle></CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {reasonBreakdown.map((r, i) => (
                            <div key={i}>
                              <div className="flex justify-between text-sm mb-1">
                                <span>{r.reason}</span>
                                <span className="text-muted-foreground">{r.count} ({r.pct}%)</span>
                              </div>
                              <div className="h-2 w-full rounded bg-muted overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${(r.pct / maxPct) * 100}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle>Monthly Return Trend</CardTitle><CardDescription>Illustrative — only current month data available</CardDescription></CardHeader>
                      <CardContent>
                        <div className="flex items-end gap-2 h-40">
                          {[42, 38, 45, 51, 39, 44, 48, 36, 41, 47, 52, returns.length].map((v, i) => (
                            <div key={i} className="flex-1 bg-primary/70 rounded-t" style={{ height: `${v * 1.5}px` }} title={`${v} returns`} />
                          ))}
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                          <span>Apr</span><span>Mar</span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="md:col-span-2">
                      <CardHeader><CardTitle>Top Returning Customers</CardTitle></CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          {topCustomers.map((c, i) => (
                            <div key={i} className="flex justify-between">
                              <span>{c.customer}</span>
                              <span className="font-semibold">{fmt(c.total)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}
            </TabsContent>
          </Tabs>
        </>
      )}

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

      {/* ── Return Modal ── */}
      {returnModal?.kind === "return" && (
        <EntityFormModal
          open
          onOpenChange={() => setReturnModal(null)}
          title={returnModal.editing ? `Edit ${returnModal.editing.id}` : "New Return Request"}
          fields={returnFields}
          initialData={returnModal.editing ? {
            customer: returnModal.editing.customer, product: returnModal.editing.product,
            batch: returnModal.editing.batch, qty: returnModal.editing.qty,
            reason: returnModal.editing.reason, invoice: returnModal.editing.invoice, value: returnModal.editing.value,
          } : undefined}
          submitLabel={returnModal.editing ? "Update" : "Create"}
          onSubmit={(d) => {
            if (returnModal.editing) {
              setReturns(prev => prev.map(r => r.id === returnModal.editing!.id ? {
                ...r, customer: String(d.customer), product: String(d.product),
                batch: String(d.batch), qty: Number(d.qty), reason: String(d.reason),
                invoice: String(d.invoice), value: Number(d.value) || r.value,
              } : r));
            } else {
              setReturns(prev => [{
                id: `RET-${1013 + prev.length}`, customer: String(d.customer), product: String(d.product),
                batch: String(d.batch), qty: Number(d.qty), reason: String(d.reason), invoice: String(d.invoice),
                value: Number(d.value) || 0, date: new Date().toISOString().slice(0, 10), status: "Pending",
              }, ...prev]);
            }
          }}
        />
      )}
      {/* ── Credit Note Modal ── */}
      {returnModal?.kind === "credit" && (
        <EntityFormModal
          open
          onOpenChange={() => setReturnModal(null)}
          title={returnModal.editing ? `Edit ${returnModal.editing.id}` : "Issue Credit Note"}
          fields={creditFields}
          initialData={returnModal.editing ? {
            returnRef: returnModal.editing.returnRef, customer: returnModal.editing.customer,
            amount: returnModal.editing.amount, taxAdj: returnModal.editing.taxAdj,
            net: returnModal.editing.net, appliedTo: returnModal.editing.appliedTo,
          } : undefined}
          submitLabel={returnModal.editing ? "Update" : "Issue"}
          onSubmit={(d) => {
            if (returnModal.editing) {
              setCredits(prev => prev.map(c => c.id === returnModal.editing!.id ? {
                ...c, returnRef: String(d.returnRef), customer: String(d.customer),
                amount: Number(d.amount), taxAdj: Number(d.taxAdj),
                net: Number(d.net), appliedTo: String(d.appliedTo) || "Pending",
              } : c));
            } else {
              setCredits(prev => [{
                id: `CN-${509 + prev.length}`, returnRef: String(d.returnRef), customer: String(d.customer),
                amount: Number(d.amount), taxAdj: Number(d.taxAdj), net: Number(d.net),
                date: new Date().toISOString().slice(0, 10),
                appliedTo: String(d.appliedTo) || "Pending", status: "Issued",
              }, ...prev]);
            }
          }}
        />
      )}
      {/* ── Destruction Modal ── */}
      {returnModal?.kind === "destruction" && (
        <EntityFormModal
          open
          onOpenChange={() => setReturnModal(null)}
          title={returnModal.editing ? `Edit ${returnModal.editing.id}` : "Schedule Destruction"}
          fields={destructionFields}
          initialData={returnModal.editing ? {
            product: returnModal.editing.product, batch: returnModal.editing.batch,
            qty: returnModal.editing.qty, reason: returnModal.editing.reason,
            method: returnModal.editing.method, witnessed: returnModal.editing.witnessed, date: returnModal.editing.date,
          } : undefined}
          submitLabel={returnModal.editing ? "Update" : "Schedule"}
          onSubmit={(d) => {
            if (returnModal.editing) {
              setDestructions(prev => prev.map(x => x.id === returnModal.editing!.id ? {
                ...x, product: String(d.product), batch: String(d.batch),
                qty: Number(d.qty), reason: String(d.reason), method: String(d.method),
                witnessed: String(d.witnessed), date: String(d.date),
              } : x));
            } else {
              setDestructions(prev => [{
                id: `DES-${207 + prev.length}`, product: String(d.product), batch: String(d.batch),
                qty: Number(d.qty), reason: String(d.reason), method: String(d.method),
                witnessed: String(d.witnessed), date: String(d.date),
                certificate: "Pending", status: "Scheduled",
              }, ...prev]);
            }
          }}
        />
      )}

      {/* ── Return Detail Dialog ── */}
      <Dialog open={!!detailReturn} onOpenChange={(open) => { if (!open) setDetailReturn(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Return {detailReturn?.id}</DialogTitle>
          </DialogHeader>
          {detailReturn && (() => {
            const relatedCredit = credits.find(c => c.returnRef === detailReturn.id);
            const relatedDestruction = destructions.find(d => d.product === detailReturn.product && d.batch === detailReturn.batch);
            return (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-sm text-muted-foreground">Return ID</span><p className="font-medium font-mono">{detailReturn.id}</p></div>
                  <div><span className="text-sm text-muted-foreground">Status</span><p><StatusBadge status={detailReturn.status} /></p></div>
                  <div><span className="text-sm text-muted-foreground">Customer</span><p className="font-medium">{detailReturn.customer}</p></div>
                  <div><span className="text-sm text-muted-foreground">Product</span><p className="font-medium">{detailReturn.product}</p></div>
                  <div><span className="text-sm text-muted-foreground">Batch #</span><p className="font-medium font-mono">{detailReturn.batch}</p></div>
                  <div><span className="text-sm text-muted-foreground">Quantity</span><p className="font-medium">{detailReturn.qty}</p></div>
                  <div><span className="text-sm text-muted-foreground">Reason</span><p><StatusBadge status={detailReturn.reason} /></p></div>
                  <div><span className="text-sm text-muted-foreground">Original Invoice</span><p className="font-medium font-mono">{detailReturn.invoice}</p></div>
                  <div><span className="text-sm text-muted-foreground">Return Value</span><p className="font-medium">{fmt(detailReturn.value)}</p></div>
                  <div><span className="text-sm text-muted-foreground">Date</span><p className="font-medium">{detailReturn.date}</p></div>
                </div>
                {/* Status Flow */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Processing Status</h4>
                  <div className="flex items-center gap-1">
                    {["Pending", "Approved", "Received", "Credit Issued"].map((step, i) => {
                      const steps = ["Pending", "Approved", "Received", "Credit Issued"];
                      const currentIdx = steps.indexOf(detailReturn.status);
                      const isRejected = detailReturn.status === "Rejected";
                      const isReached = !isRejected && i <= currentIdx;
                      const isCurrent = !isRejected && i === currentIdx;
                      return (
                        <div key={step} className="flex items-center gap-1 flex-1">
                          <div className="flex flex-col items-center flex-1">
                            <div className={`h-3 w-3 rounded-full border-2 ${isCurrent ? "bg-primary border-primary" : isReached ? "bg-primary/60 border-primary/60" : "bg-muted border-muted-foreground/30"}`} />
                            <span className={`text-[10px] mt-1 text-center leading-tight ${isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{step}</span>
                          </div>
                          {i < 3 && <div className={`h-0.5 flex-1 -mt-4 ${isReached && i < currentIdx ? "bg-primary/60" : "bg-muted"}`} />}
                        </div>
                      );
                    })}
                  </div>
                  {detailReturn.status === "Rejected" && (
                    <p className="text-sm text-red-600 font-medium mt-2">This return was rejected.</p>
                  )}
                </div>
                {/* Related Credit Note */}
                {relatedCredit && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Credit Note</h4>
                    <div className="border rounded-lg p-3 text-sm space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">Credit Note #</span><span className="font-mono">{relatedCredit.id}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-medium">{fmt(relatedCredit.amount)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Tax Adjustment</span><span>{fmt(relatedCredit.taxAdj)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Net Credit</span><span className="font-semibold">{fmt(relatedCredit.net)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Applied To</span><span>{relatedCredit.appliedTo}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge status={relatedCredit.status} /></div>
                    </div>
                  </div>
                )}
                {/* Related Destruction */}
                {relatedDestruction && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Destruction Record</h4>
                    <div className="border rounded-lg p-3 text-sm space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">Log #</span><span className="font-mono">{relatedDestruction.id}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span>{relatedDestruction.method}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Witnessed By</span><span>{relatedDestruction.witnessed}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Certificate</span><span className="font-mono">{relatedDestruction.certificate}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge status={relatedDestruction.status} /></div>
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
