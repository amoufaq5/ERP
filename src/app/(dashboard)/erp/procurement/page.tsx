"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Package, Truck, ClipboardCheck, Plus, ShieldCheck, FileText, ArrowRight, CheckCircle, X, Anchor, Ship, Star, TrendingUp, TrendingDown, Minus, Award, MessageSquare, Receipt, DollarSign, Eye } from "lucide-react";
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
import { EntityFormModal, type EntityField, type EntityFormData } from "@/components/shared/entity-form-modal";
import { useApiDataStore } from "@/lib/api/use-api-store";
import { type PurchaseOrder, type RFQ, type GoodsReceipt, type Shipment, type Invoice } from "@/lib/data-store";
import { VendorLink } from "@/components/shared/entity-detail-dialog";
import { useTranslation } from "@/lib/i18n/i18n-context";
import { useNotificationCenter } from "@/lib/notification-context";
import { useAuditLogger } from "@/lib/audit-logger";

const COMPANY_NAME = "PharmaCorp Egypt";

// ─── Vendor Scorecard types & seed data ────────────────────────────────────

interface VendorRating {
  vendorId: string;
  quality: number;          // 1-100 percentage
  delivery: number;         // % on-time deliveries
  price: number;            // % vs market avg (lower is better, stored as competitiveness score 1-100)
  communication: number;    // 1-100
  overall: number;          // weighted average
  history: { month: string; overall: number; quality: number; delivery: number }[];
  totalOrders: number;
  lastRated: string;
  notes?: string;
}

const VENDOR_SCORECARD_DATA: VendorRating[] = [
  {
    vendorId: "ve-001",
    quality: 92, delivery: 88, price: 78, communication: 90, overall: 88,
    history: [
      { month: "Feb 2026", overall: 85, quality: 89, delivery: 84 },
      { month: "Mar 2026", overall: 87, quality: 91, delivery: 86 },
      { month: "Apr 2026", overall: 88, quality: 92, delivery: 88 },
    ],
    totalOrders: 47, lastRated: "2026-04-18",
  },
  {
    vendorId: "ve-002",
    quality: 96, delivery: 94, price: 65, communication: 93, overall: 90,
    history: [
      { month: "Feb 2026", overall: 89, quality: 95, delivery: 92 },
      { month: "Mar 2026", overall: 90, quality: 96, delivery: 93 },
      { month: "Apr 2026", overall: 90, quality: 96, delivery: 94 },
    ],
    totalOrders: 32, lastRated: "2026-04-22",
  },
  {
    vendorId: "ve-003",
    quality: 88, delivery: 72, price: 82, communication: 75, overall: 79,
    history: [
      { month: "Feb 2026", overall: 82, quality: 90, delivery: 78 },
      { month: "Mar 2026", overall: 80, quality: 89, delivery: 74 },
      { month: "Apr 2026", overall: 79, quality: 88, delivery: 72 },
    ],
    totalOrders: 21, lastRated: "2026-04-10",
  },
  {
    vendorId: "ve-004",
    quality: 84, delivery: 91, price: 88, communication: 86, overall: 87,
    history: [
      { month: "Feb 2026", overall: 84, quality: 82, delivery: 89 },
      { month: "Mar 2026", overall: 85, quality: 83, delivery: 90 },
      { month: "Apr 2026", overall: 87, quality: 84, delivery: 91 },
    ],
    totalOrders: 28, lastRated: "2026-04-15",
  },
  {
    vendorId: "ve-005",
    quality: 68, delivery: 60, price: 92, communication: 62, overall: 68,
    history: [
      { month: "Feb 2026", overall: 71, quality: 72, delivery: 65 },
      { month: "Mar 2026", overall: 69, quality: 70, delivery: 62 },
      { month: "Apr 2026", overall: 68, quality: 68, delivery: 60 },
    ],
    totalOrders: 14, lastRated: "2026-03-28",
  },
  {
    vendorId: "ve-006-extra",
    quality: 90, delivery: 85, price: 74, communication: 88, overall: 85,
    history: [
      { month: "Feb 2026", overall: 83, quality: 88, delivery: 82 },
      { month: "Mar 2026", overall: 84, quality: 89, delivery: 84 },
      { month: "Apr 2026", overall: 85, quality: 90, delivery: 85 },
    ],
    totalOrders: 19, lastRated: "2026-04-20",
  },
];

// Extra vendor entry for ve-006-extra (not in main vendor store)
const EXTRA_VENDOR_NAMES: Record<string, string> = {
  "ve-006-extra": "Evonik Pharma Excipients",
};

function getScoreColor(score: number): string {
  if (score >= 85) return "text-green-600";
  if (score >= 70) return "text-amber-600";
  return "text-red-600";
}

function getScoreBg(score: number): string {
  if (score >= 85) return "bg-green-100 text-green-800";
  if (score >= 70) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

function getScoreBgBar(score: number): string {
  if (score >= 85) return "bg-green-500";
  if (score >= 70) return "bg-amber-500";
  return "bg-red-500";
}

function getTrendIcon(current: number, previous: number) {
  const diff = current - previous;
  if (diff > 1) return <TrendingUp className="h-3.5 w-3.5 text-green-600" />;
  if (diff < -1) return <TrendingDown className="h-3.5 w-3.5 text-red-600" />;
  return <Minus className="h-3.5 w-3.5 text-gray-400" />;
}

function renderStars(score: number) {
  const starCount = Math.round(score / 20); // convert 0-100 to 1-5 stars
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= starCount ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{starCount}/5</span>
    </div>
  );
}

interface POLine {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export default function ProcurementPage() {
  const store = useApiDataStore();
  const { t } = useTranslation();

  /* ─── Notification & Audit Logger ─── */
  let addNotification: any = () => {};
  let logAction: any = () => {};
  try {
    const nc = useNotificationCenter();
    addNotification = nc.addNotification;
  } catch {}
  try {
    const al = useAuditLogger();
    logAction = al.logAction;
  } catch {}

  const [showPOModal, setShowPOModal] = useState(false);
  const [showRFQModal, setShowRFQModal] = useState(false);
  const [activeTab, setActiveTab] = useState("orders");

  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [editingRFQ, setEditingRFQ] = useState<RFQ | null>(null);
  const [detailPO, setDetailPO] = useState<PurchaseOrder | null>(null);
  const [detailGRN, setDetailGRN] = useState<GoodsReceipt | null>(null);

  // Vendor Scorecard state
  const [vendorScores, setVendorScores] = useState<VendorRating[]>(VENDOR_SCORECARD_DATA);
  const [showRateDialog, setShowRateDialog] = useState(false);
  const [rateVendorId, setRateVendorId] = useState("");
  const [rateQuality, setRateQuality] = useState("85");
  const [rateDelivery, setRateDelivery] = useState("85");
  const [ratePrice, setRatePrice] = useState("80");
  const [rateCommunication, setRateCommunication] = useState("80");
  const [rateNotes, setRateNotes] = useState("");

  const [poSearch, setPOSearch] = useState("");
  const [poFilters, setPOFilters] = useState<FilterState>({});
  const [rfqSearch, setRFQSearch] = useState("");

  // Multi-line PO form state
  const [poVendorId, setPOVendorId] = useState("");
  const [poExpectedDate, setPOExpectedDate] = useState("");
  const [poLines, setPOLines] = useState<POLine[]>([{ productId: "", quantity: 1, unitPrice: 0 }]);

  // Shipment state
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [shipmentPO, setShipmentPO] = useState<PurchaseOrder | null>(null);
  const [shipCarrier, setShipCarrier] = useState("");
  const [shipTracking, setShipTracking] = useState("");
  const [shipDate, setShipDate] = useState("");
  const [shipExpected, setShipExpected] = useState("");
  const [shipMethod, setShipMethod] = useState<"Sea" | "Air" | "Land">("Land");
  const [shipCost, setShipCost] = useState("");
  const [shipNotes, setShipNotes] = useState("");

  const vendorName = (id: string) => store.vendors.find((v) => v.id === id)?.name ?? id;
  const productName = (id: string) => { const p = store.products.find((pr) => pr.id === id); return p ? `${p.name} ${p.strength}` : id; };

  /* ─── On-mount: delivery overdue check ─── */
  const mountCheckedRef = useRef(false);
  useEffect(() => {
    if (mountCheckedRef.current) return;
    mountCheckedRef.current = true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    store.purchaseOrders.forEach((po) => {
      if ((po.status === "APPROVED" || po.status === "ORDERED") && po.expectedDate) {
        const expected = new Date(po.expectedDate);
        expected.setHours(0, 0, 0, 0);
        if (expected < today) {
          const daysOverdue = Math.ceil((today.getTime() - expected.getTime()) / 86400000);
          addNotification({
            type: "WARNING",
            title: `PO ${po.number} delivery overdue`,
            message: `Purchase order ${po.number} from ${vendorName(po.vendorId)} was expected by ${po.expectedDate.slice(0, 10)}. Currently ${daysOverdue} day(s) overdue.`,
            module: "PROCUREMENT",
            entityType: "purchase_order",
            entityId: po.id,
            actionUrl: "/erp/procurement",
          });
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ─── Bills (Vendor Invoices / AP) ─────────────────────────────────────
  const vendorIds = useMemo(() => new Set(store.vendors.map((v) => v.id)), [store.vendors]);
  const vendorBills = useMemo(() =>
    store.invoices.filter((inv) => vendorIds.has(inv.customerId)),
    [store.invoices, vendorIds],
  );
  const billsTotal = vendorBills.reduce((s, b) => s + (b.total ?? 0), 0);
  const billsPaidCount = vendorBills.filter((b) => b.status === "PAID").length;
  const billsOutstanding = vendorBills.filter((b) => b.status !== "PAID" && b.status !== "VOID").reduce((s, b) => s + (b.total ?? 0), 0);

  const [detailBill, setDetailBill] = useState<Invoice | null>(null);

  function markBillPaid(bill: Invoice) {
    store.update("invoices", bill.id, { status: "PAID" as const });
    logAction({
      userId: "u-admin", userName: "Admin User", userRole: "ADMIN",
      action: "UPDATE", module: "ERP", entity: "Invoice",
      entityId: bill.id, entityName: `Bill ${bill.number}`,
      details: `Vendor bill ${bill.number} marked as PAID`,
      oldValues: { status: bill.status },
      newValues: { status: "PAID" },
    });
    addNotification({
      type: "SUCCESS",
      title: `Bill ${bill.number} paid`,
      message: `Vendor bill ${bill.number} for EGP ${(bill.total ?? 0).toLocaleString()} has been marked as paid.`,
      module: "PROCUREMENT",
      entityType: "invoice",
      entityId: bill.id,
      actionUrl: "/erp/procurement",
    });
  }

  const vendorOptions = store.vendors.map((v) => ({ value: v.id, label: v.name }));

  const rfqFields: EntityField[] = [
    { name: "vendorId", label: "Vendor", type: "select", required: true, options: vendorOptions },
    { name: "description", label: "Item Description", type: "text", required: true },
    { name: "quantity", label: "Quantity", type: "number", required: true },
    { name: "unit", label: "Unit", type: "text", required: true, placeholder: "kg / pcs / liters" },
    { name: "validUntil", label: "Valid Until", type: "date", required: true },
    { name: "notes", label: "Notes", type: "textarea" },
  ];

  function getLinePrice(productId: string) {
    return store.products.find((p) => p.id === productId)?.pricePerUnit ?? 0;
  }
  function getLineDesc(productId: string) {
    const product = store.products.find((p) => p.id === productId);
    return product ? `${product.name} ${product.strength}` : "Custom item";
  }

  const poSubtotal = poLines.reduce((sum, l) => sum + l.quantity * (l.unitPrice || getLinePrice(l.productId)), 0);
  const poTax = poSubtotal * 0.14;
  const poTotal = poSubtotal + poTax;

  function openPOModal(po?: PurchaseOrder | null) {
    if (po) {
      setEditingPO(po);
      setPOVendorId(po.vendorId);
      setPOExpectedDate(po.expectedDate?.slice(0, 10) ?? "");
      setPOLines((po.items || []).map((it) => ({ productId: it.productId, quantity: it.quantity, unitPrice: it.unitPrice })));
    } else {
      setEditingPO(null);
      setPOVendorId("");
      setPOExpectedDate("");
      setPOLines([{ productId: "", quantity: 1, unitPrice: 0 }]);
    }
    setShowPOModal(true);
  }

  function handlePOSubmit() {
    if (!poVendorId || !poExpectedDate || poLines.length === 0) return;
    if (poLines.some((l) => !l.productId || l.quantity <= 0)) return;

    const items = poLines.map((l) => {
      const price = l.unitPrice || getLinePrice(l.productId);
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

    if (editingPO) {
      store.update("purchaseOrders", editingPO.id, {
        vendorId: poVendorId,
        items, subtotal, tax, total,
        expectedDate: poExpectedDate,
      });
      logAction({
        userId: "u-admin", userName: "Admin User", userRole: "ADMIN",
        action: "UPDATE", module: "ERP", entity: "PurchaseOrder",
        entityId: editingPO.id, entityName: `PO ${editingPO.number}`,
        details: `Purchase order updated: ${editingPO.number} - EGP ${total.toLocaleString()}`,
        oldValues: { total: editingPO.total, vendorId: editingPO.vendorId },
        newValues: { total, vendorId: poVendorId },
      });
    } else {
      const newId = store.genId("po");
      const poNumber = store.generatePONumber();
      store.add("purchaseOrders", {
        id: newId,
        number: poNumber,
        vendorId: poVendorId,
        date: new Date().toISOString(),
        expectedDate: poExpectedDate,
        items, subtotal, tax, total,
        status: "DRAFT",
        createdAt: new Date().toISOString(),
      });
      logAction({
        userId: "u-admin", userName: "Admin User", userRole: "ADMIN",
        action: "CREATE", module: "ERP", entity: "PurchaseOrder",
        entityId: newId, entityName: `PO ${poNumber}`,
        details: `Purchase order created: ${poNumber} for ${vendorName(poVendorId)} - EGP ${total.toLocaleString()}`,
        newValues: { number: poNumber, total, status: "DRAFT", vendorId: poVendorId },
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

  // ─── Shipment functions ──────────────────────────────────────────────
  function openShipmentModal(po: PurchaseOrder) {
    setShipmentPO(po);
    setShipCarrier("");
    setShipTracking("");
    setShipDate(new Date().toISOString().split("T")[0]);
    setShipExpected(po.expectedDate?.slice(0, 10) ?? "");
    setShipMethod("Land");
    setShipCost("");
    setShipNotes("");
    setShowShipmentModal(true);
  }

  function handleShipmentSubmit() {
    if (!shipmentPO || !shipCarrier || !shipDate || !shipExpected) return;
    store.add("shipments", {
      id: store.genId("shp"),
      number: store.generateShipmentNumber(),
      poId: shipmentPO.id,
      vendorId: shipmentPO.vendorId,
      carrier: shipCarrier,
      trackingNumber: shipTracking,
      shipDate,
      expectedArrival: shipExpected,
      method: shipMethod,
      cost: Number(shipCost) || 0,
      status: "IN_TRANSIT",
      items: (shipmentPO.items || []).map((i) => ({ productId: i.productId, description: i.description, quantity: i.quantity, unitPrice: i.unitPrice })),
      notes: shipNotes || undefined,
      createdAt: new Date().toISOString(),
    });
    setShowShipmentModal(false);
    setShipmentPO(null);
  }

  function markShipmentDelivered(shipment: Shipment) {
    store.update("shipments", shipment.id, { status: "DELIVERED" });
    const po = store.purchaseOrders.find((p) => p.id === shipment.poId);
    if (po && po.status === "ORDERED") {
      receivePO(po);
    }
  }

  // ─── Integration: Approve PO ─────────────────────────────────────────
  function approvePO(po: PurchaseOrder) {
    store.update("purchaseOrders", po.id, { status: "APPROVED" });
    logAction({
      userId: "u-admin", userName: "Admin User", userRole: "ADMIN",
      action: "APPROVE", module: "ERP", entity: "PurchaseOrder",
      entityId: po.id, entityName: `PO ${po.number}`,
      details: `PO status change: ${po.number} DRAFT -> APPROVED`,
      oldValues: { status: "DRAFT" },
      newValues: { status: "APPROVED" },
    });
    addNotification({
      type: "SUCCESS",
      title: `PO ${po.number} approved`,
      message: `Purchase order ${po.number} for ${vendorName(po.vendorId)} (EGP ${po.total.toLocaleString()}) has been approved.`,
      module: "PROCUREMENT",
      entityType: "purchase_order",
      entityId: po.id,
      actionUrl: "/erp/procurement",
    });
  }

  // ─── Integration: Mark PO as Ordered ──────────────────────────────────
  function markOrdered(po: PurchaseOrder) {
    store.update("purchaseOrders", po.id, { status: "ORDERED" });
    logAction({
      userId: "u-admin", userName: "Admin User", userRole: "ADMIN",
      action: "UPDATE", module: "ERP", entity: "PurchaseOrder",
      entityId: po.id, entityName: `PO ${po.number}`,
      details: `PO status change: ${po.number} APPROVED -> ORDERED`,
      oldValues: { status: "APPROVED" },
      newValues: { status: "ORDERED" },
    });
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
      items: (po.items || []).map((i) => ({ productId: i.productId, description: i.description, quantity: i.quantity, unitPrice: i.unitPrice })),
      status: "PENDING",
      createdAt: new Date().toISOString(),
    });
    store.update("purchaseOrders", po.id, { status: "RECEIVED", grnId });
    logAction({
      userId: "u-admin", userName: "Admin User", userRole: "ADMIN",
      action: "UPDATE", module: "ERP", entity: "PurchaseOrder",
      entityId: po.id, entityName: `PO ${po.number}`,
      details: `PO status change: ${po.number} ORDERED -> RECEIVED. GRN ${grnNumber} created.`,
      oldValues: { status: "ORDERED" },
      newValues: { status: "RECEIVED", grnId },
    });
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
      items: (po.items || []).map((i) => ({ productId: i.productId, description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),
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
    logAction({
      userId: "u-admin", userName: "Admin User", userRole: "ADMIN",
      action: "UPDATE", module: "ERP", entity: "GoodsReceipt",
      entityId: grn.id, entityName: `GRN ${grn.number}`,
      details: `GRN confirmed: ${grn.number} for PO ${po.number}. Auto-created Invoice ${invNumber} and JE ${jeNumber}.`,
      oldValues: { status: "PENDING" },
      newValues: { status: "RECEIVED" },
    });
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
      items: (rfq.items || []).map((i) => ({ productId: "", description: i.description, quantity: i.quantity, unitPrice: 0, total: 0 })),
      subtotal: 0, tax: 0, total: 0,
      status: "DRAFT",
      createdAt: new Date().toISOString(),
    });
    store.update("rfqs", rfq.id, { status: "CONVERTED", convertedPOId: poId });
  }

  const egp = (n: number) => `EGP ${(n ?? 0).toLocaleString()}`;

  // ─── Vendor Scorecard helpers ────────────────────────────────────────
  const scorecardVendorName = (id: string) =>
    store.vendors.find((v) => v.id === id)?.name ?? EXTRA_VENDOR_NAMES[id] ?? id;

  const sortedVendorScores = useMemo(() =>
    [...vendorScores].sort((a, b) => b.overall - a.overall),
  [vendorScores]);

  function openRateDialog(vendorId?: string) {
    setRateVendorId(vendorId ?? "");
    setRateQuality("85");
    setRateDelivery("85");
    setRatePrice("80");
    setRateCommunication("80");
    setRateNotes("");
    setShowRateDialog(true);
  }

  function handleRateSubmit() {
    if (!rateVendorId) return;
    const q = Number(rateQuality);
    const d = Number(rateDelivery);
    const p = Number(ratePrice);
    const c = Number(rateCommunication);
    const overall = Math.round(q * 0.35 + d * 0.30 + p * 0.15 + c * 0.20);
    const now = new Date();
    const monthStr = now.toLocaleDateString("en-US", { month: "short", year: "numeric" });

    const existingScore = vendorScores.find((v) => v.vendorId === rateVendorId);
    const oldOverall = existingScore?.overall;

    setVendorScores((prev) => {
      const existing = prev.find((v) => v.vendorId === rateVendorId);
      if (existing) {
        return prev.map((v) =>
          v.vendorId === rateVendorId
            ? {
                ...v,
                quality: q,
                delivery: d,
                price: p,
                communication: c,
                overall,
                totalOrders: v.totalOrders + 1,
                lastRated: now.toISOString().split("T")[0],
                notes: rateNotes || v.notes,
                history: [
                  ...v.history.slice(-2),
                  { month: monthStr, overall, quality: q, delivery: d },
                ],
              }
            : v,
        );
      }
      return [
        ...prev,
        {
          vendorId: rateVendorId,
          quality: q, delivery: d, price: p, communication: c, overall,
          history: [{ month: monthStr, overall, quality: q, delivery: d }],
          totalOrders: 1,
          lastRated: now.toISOString().split("T")[0],
          notes: rateNotes || undefined,
        },
      ];
    });

    const vName = scorecardVendorName(rateVendorId);
    logAction({
      userId: "u-admin", userName: "Admin User", userRole: "ADMIN",
      action: existingScore ? "UPDATE" : "CREATE", module: "ERP", entity: "VendorRating",
      entityId: rateVendorId, entityName: `Vendor Rating - ${vName}`,
      details: `Vendor rating ${existingScore ? "updated" : "created"}: ${vName} - Overall ${oldOverall ?? "N/A"} -> ${overall}%`,
      oldValues: existingScore ? { overall: oldOverall, quality: existingScore.quality, delivery: existingScore.delivery } : undefined,
      newValues: { overall, quality: q, delivery: d, price: p, communication: c },
    });

    setShowRateDialog(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("proc.title")}
        description={t("proc.manageProcurement")}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setEditingRFQ(null); setShowRFQModal(true); }}>
              <Plus className="h-4 w-4 mr-2" /> {t("proc.createRFQ")}
            </Button>
            <Button onClick={() => openPOModal()}>
              <Plus className="h-4 w-4 mr-2" /> {t("proc.createPO")}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Package} title={t("proc.totalPOs")} value={String(totalPOs)} subtitle={`${approvedPOs} approved`} iconColor="text-blue-600" />
        <StatsCard icon={Truck} title="Received" value={String(receivedPOs)} subtitle="Goods received" iconColor="text-green-600" />
        <StatsCard icon={ClipboardCheck} title={t("proc.grnPending")} value={String(store.goodsReceipts.filter((g) => g.status === "PENDING").length)} subtitle="Awaiting confirmation" iconColor="text-amber-600" />
        <StatsCard icon={ShieldCheck} title={t("proc.totalSpend")} value={egp(totalValue)} subtitle="All POs" iconColor="text-purple-600" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders">{t("proc.purchaseOrders")} ({store.purchaseOrders.length})</TabsTrigger>
          <TabsTrigger value="shipments">Shipments ({store.shipments.length})</TabsTrigger>
          <TabsTrigger value="rfqs">{t("proc.rfqs")} ({store.rfqs.length})</TabsTrigger>
          <TabsTrigger value="grn">{t("proc.grn")} ({store.goodsReceipts.length})</TabsTrigger>
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="scorecard">Vendor Scorecard ({vendorScores.length})</TabsTrigger>
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
                  { key: "vendorId", label: "Vendor", render: (v: string) => <VendorLink vendorId={v} /> },
                  { key: "items", label: "Items", render: (_v: unknown, row: Record<string, unknown>) => {
                    const po = row as unknown as PurchaseOrder;
                    return <span className="text-sm">{(po.items || []).map((i) => i.description).join(", ")}</span>;
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
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openShipmentModal(po)}>
                              <Anchor className="h-3 w-3 mr-1" /> Shipment
                            </Button>
                            <Button size="sm" className="h-7 text-xs" onClick={() => receivePO(po)}>
                              <ArrowRight className="h-3 w-3 mr-1" /> Receive
                            </Button>
                          </>
                        )}
                        <EditDeleteMenu
                          onView={() => setDetailPO(po)}
                          onEdit={po.status === "DRAFT" ? () => openPOModal(po) : undefined}
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
                <Badge variant="outline" className="bg-amber-50">Ordered → Create Shipment</Badge>
                <ArrowRight className="h-3 w-3" />
                <Badge variant="outline" className="bg-cyan-50">Shipment Delivered → Auto Receive</Badge>
                <ArrowRight className="h-3 w-3" />
                <Badge variant="outline" className="bg-green-50">Received → Auto GRN</Badge>
                <ArrowRight className="h-3 w-3" />
                <Badge variant="outline" className="bg-purple-50">GRN Confirmed → Auto Invoice + Journal Entry</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Shipments Tab ── */}
        <TabsContent value="shipments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shipments</CardTitle>
              <CardDescription>Track shipments linked to purchase orders. Create from ordered POs.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "number", label: "Shipment #", render: (v: string) => <span className="font-mono text-xs font-semibold">{v}</span> },
                  { key: "poId", label: "PO Ref", render: (v: string) => {
                    const po = store.purchaseOrders.find((p) => p.id === v);
                    return <span className="font-mono text-xs">{po?.number ?? v}</span>;
                  }},
                  { key: "vendorId", label: "Vendor", render: (v: string) => <VendorLink vendorId={v} /> },
                  { key: "method", label: "Method", render: (v: string) => (
                    <Badge className={v === "Air" ? "bg-sky-100 text-sky-800" : v === "Sea" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}>{v}</Badge>
                  )},
                  { key: "carrier", label: "Carrier" },
                  { key: "trackingNumber", label: "Tracking", render: (v: string) => <span className="font-mono text-xs">{v || "—"}</span> },
                  { key: "shipDate", label: "Ship Date", render: (v: string) => v?.slice(0, 10) },
                  { key: "expectedArrival", label: "ETA", render: (v: string) => v?.slice(0, 10) },
                  { key: "cost", label: "Cost", className: "text-right", render: (v: number) => <span>{v > 0 ? `EGP ${(v ?? 0).toLocaleString()}` : "—"}</span> },
                  { key: "status", label: "Status", render: (v: string) => <StatusBadge status={v} /> },
                  { key: "id", label: "Actions", className: "text-right", render: (_v: unknown, row: Record<string, unknown>) => {
                    const s = row as unknown as Shipment;
                    return (
                      <div className="flex items-center justify-end gap-1">
                        {s.status === "IN_TRANSIT" && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-amber-600" onClick={() => store.update("shipments", s.id, { status: "DELAYED" })}>
                              Delayed
                            </Button>
                            <Button size="sm" className="h-7 text-xs" onClick={() => markShipmentDelivered(s)}>
                              <CheckCircle className="h-3 w-3 mr-1" /> Delivered
                            </Button>
                          </>
                        )}
                        {s.status === "DELAYED" && (
                          <Button size="sm" className="h-7 text-xs" onClick={() => markShipmentDelivered(s)}>
                            <CheckCircle className="h-3 w-3 mr-1" /> Delivered
                          </Button>
                        )}
                      </div>
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={store.shipments as unknown as Record<string, unknown>[]}
                exportable exportFilename="shipments.csv" emptyMessage="No shipments. Create one from an ordered PO."
              />
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
                  { key: "vendorId", label: "Vendor", render: (v: string) => <VendorLink vendorId={v} /> },
                  { key: "items", label: "Items", render: (_v: unknown, row: Record<string, unknown>) => {
                    const rfq = row as unknown as RFQ;
                    return <span className="text-sm">{(rfq.items || []).map((i) => `${i.description} (${i.quantity} ${i.unit})`).join(", ")}</span>;
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
                  { key: "vendorId", label: "Vendor", render: (v: string) => <VendorLink vendorId={v} /> },
                  { key: "items", label: "Items", render: (_v: unknown, row: Record<string, unknown>) => {
                    const g = row as unknown as GoodsReceipt;
                    return <span className="text-sm">{(g.items || []).map((i) => `${i.description} × ${i.quantity}`).join(", ")}</span>;
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

        {/* ── Bills (AP) Tab ── */}
        <TabsContent value="bills" className="space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard icon={Receipt} title="Total Bills" value={String(vendorBills.length)} subtitle="Vendor invoices" iconColor="text-blue-600" />
            <StatsCard icon={DollarSign} title="Total AP Amount" value={egp(billsTotal)} subtitle="Sum of all bills" iconColor="text-purple-600" />
            <StatsCard icon={CheckCircle} title="Paid Bills" value={String(billsPaidCount)} subtitle={`${vendorBills.length - billsPaidCount} unpaid`} iconColor="text-green-600" />
            <StatsCard icon={FileText} title="Outstanding AP" value={egp(billsOutstanding)} subtitle="Unpaid balance" iconColor="text-amber-600" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Vendor Bills (Accounts Payable)</CardTitle>
              <CardDescription>Invoices from vendors, auto-created when GRN is confirmed.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "number", label: "Bill #", render: (v: string) => <span className="font-mono text-xs font-semibold">{v}</span> },
                  { key: "customerId", label: "Vendor", render: (v: string) => <VendorLink vendorId={v} /> },
                  { key: "date", label: "Date", render: (v: string) => v?.slice(0, 10) },
                  { key: "dueDate", label: "Due Date", render: (v: string) => v?.slice(0, 10) },
                  { key: "total", label: "Amount", className: "text-right", render: (v: number) => <span className="font-semibold">{egp(v)}</span> },
                  { key: "status", label: "Status", render: (v: string) => {
                    const colorMap: Record<string, string> = {
                      PAID: "bg-green-100 text-green-800",
                      SENT: "bg-blue-100 text-blue-800",
                      OVERDUE: "bg-red-100 text-red-800",
                      DRAFT: "bg-gray-100 text-gray-800",
                      PARTIAL: "bg-amber-100 text-amber-800",
                      VOID: "bg-gray-100 text-gray-500",
                    };
                    return <Badge className={colorMap[v] ?? "bg-gray-100 text-gray-800"}>{v}</Badge>;
                  }},
                  { key: "id", label: "Actions", className: "text-right", render: (_v: unknown, row: Record<string, unknown>) => {
                    const bill = row as unknown as Invoice;
                    return (
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setDetailBill(bill)}>
                          <Eye className="h-3 w-3 mr-1" /> View
                        </Button>
                        {bill.status !== "PAID" && bill.status !== "VOID" && (
                          <Button size="sm" className="h-7 text-xs" onClick={() => markBillPaid(bill)}>
                            <CheckCircle className="h-3 w-3 mr-1" /> Mark Paid
                          </Button>
                        )}
                      </div>
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={vendorBills as unknown as Record<string, unknown>[]}
                exportable exportFilename="vendor-bills.csv" emptyMessage="No vendor bills. Bills are created when GRNs are confirmed."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Vendor Scorecard Tab ── */}
        <TabsContent value="scorecard" className="space-y-4">
          {/* Scorecard summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100"><Award className="h-5 w-5 text-green-600" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Top Rated Vendor</p>
                    <p className="text-lg font-semibold">{scorecardVendorName(sortedVendorScores[0]?.vendorId ?? "")}</p>
                    <p className="text-xs text-green-600 font-medium">Score: {sortedVendorScores[0]?.overall ?? 0}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100"><Star className="h-5 w-5 text-blue-600" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Average Score</p>
                    <p className="text-lg font-semibold">{Math.round(vendorScores.reduce((s, v) => s + v.overall, 0) / vendorScores.length)}%</p>
                    <p className="text-xs text-muted-foreground">{vendorScores.length} vendors rated</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100"><TrendingUp className="h-5 w-5 text-amber-600" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Preferred Vendors</p>
                    <p className="text-lg font-semibold">{vendorScores.filter((v) => v.overall >= 85).length}</p>
                    <p className="text-xs text-muted-foreground">Score {"≥"} 85%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Vendor Performance Scorecard</CardTitle>
                <CardDescription>Ratings across quality, delivery, price, and communication. Weighted: Quality 35%, Delivery 30%, Price 15%, Communication 20%.</CardDescription>
              </div>
              <Button size="sm" onClick={() => openRateDialog()}>
                <Plus className="h-4 w-4 mr-1" /> Rate Vendor
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "rank", label: "#", render: (_v: unknown, row: Record<string, unknown>) => {
                    const r = row as unknown as VendorRating;
                    const rank = sortedVendorScores.findIndex((s) => s.vendorId === r.vendorId) + 1;
                    return <span className="font-semibold text-sm">{rank}</span>;
                  }},
                  { key: "vendorId", label: "Vendor", render: (v: string) => {
                    const r = sortedVendorScores.find((s) => s.vendorId === v);
                    const isPreferred = r && r.overall >= 85;
                    return (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{scorecardVendorName(v)}</span>
                        {isPreferred && (
                          <Badge className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0 gap-1">
                            <Award className="h-3 w-3" /> Preferred
                          </Badge>
                        )}
                      </div>
                    );
                  }},
                  { key: "quality", label: "Quality", render: (v: number) => (
                    <div className="space-y-1">
                      {renderStars(v)}
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-16 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${getScoreBgBar(v)}`} style={{ width: `${v}%` }} />
                        </div>
                        <span className={`text-xs font-medium ${getScoreColor(v)}`}>{v}%</span>
                      </div>
                    </div>
                  )},
                  { key: "delivery", label: "Delivery Timeliness", render: (v: number) => (
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-16 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${getScoreBgBar(v)}`} style={{ width: `${v}%` }} />
                      </div>
                      <span className={`text-xs font-medium ${getScoreColor(v)}`}>{v}% on-time</span>
                    </div>
                  )},
                  { key: "price", label: "Price Competitiveness", render: (v: number) => (
                    <Badge className={getScoreBg(v)}>{v >= 85 ? "Very Competitive" : v >= 70 ? "Competitive" : "Above Market"}</Badge>
                  )},
                  { key: "communication", label: "Communication", render: (v: number) => (
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className={`h-3.5 w-3.5 ${getScoreColor(v)}`} />
                      <span className={`text-xs font-medium ${getScoreColor(v)}`}>{v}%</span>
                    </div>
                  )},
                  { key: "overall", label: "Overall Score", render: (v: number, row: Record<string, unknown>) => {
                    const r = row as unknown as VendorRating;
                    const prevMonth = r.history.length >= 2 ? r.history[r.history.length - 2].overall : v;
                    return (
                      <div className="flex items-center gap-1.5">
                        <Badge className={`text-sm font-bold ${getScoreBg(v)}`}>{v}%</Badge>
                        {getTrendIcon(v, prevMonth)}
                      </div>
                    );
                  }},
                  { key: "totalOrders", label: "Orders", render: (v: number) => <span className="text-sm">{v}</span> },
                  { key: "lastRated", label: "Last Rated", render: (v: string) => <span className="text-xs text-muted-foreground">{v}</span> },
                  { key: "vendorId", label: "Actions", className: "text-right", render: (v: string) => (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openRateDialog(v)}>
                      <Star className="h-3 w-3 mr-1" /> Rate
                    </Button>
                  )},
                ] as Column<Record<string, unknown>>[]}
                data={sortedVendorScores as unknown as Record<string, unknown>[]}
                emptyMessage="No vendor ratings yet."
              />
            </CardContent>
          </Card>

          {/* Vendor Ranking & Historical Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Ranking List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Vendor Ranking</CardTitle>
                <CardDescription>Top to bottom by overall score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sortedVendorScores.map((v, idx) => (
                    <div key={v.vendorId} className="flex items-center gap-3">
                      <div className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${
                        idx === 0 ? "bg-amber-100 text-amber-800" :
                        idx === 1 ? "bg-gray-200 text-gray-700" :
                        idx === 2 ? "bg-orange-100 text-orange-800" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{scorecardVendorName(v.vendorId)}</span>
                          {v.overall >= 85 && <Award className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />}
                        </div>
                        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full transition-all ${getScoreBgBar(v.overall)}`}
                            style={{ width: `${v.overall}%` }}
                          />
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${getScoreColor(v.overall)}`}>{v.overall}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Historical Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Historical Trends (Last 3 Months)</CardTitle>
                <CardDescription>Overall score movement per vendor</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sortedVendorScores.map((v) => (
                    <div key={v.vendorId} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{scorecardVendorName(v.vendorId)}</span>
                        <div className="flex items-center gap-1">
                          {v.history.length >= 2 && getTrendIcon(
                            v.history[v.history.length - 1].overall,
                            v.history[0].overall,
                          )}
                          <span className={`text-xs font-medium ${getScoreColor(v.overall)}`}>
                            {v.history.length >= 2
                              ? `${v.history[v.history.length - 1].overall - v.history[0].overall >= 0 ? "+" : ""}${v.history[v.history.length - 1].overall - v.history[0].overall}pts`
                              : "—"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {v.history.map((h, hi) => (
                          <div key={hi} className="flex-1">
                            <div className="text-[10px] text-muted-foreground mb-0.5">{h.month}</div>
                            <div className="flex items-center gap-1">
                              <div className="h-5 w-full bg-gray-100 rounded overflow-hidden relative">
                                <div
                                  className={`h-full rounded transition-all ${getScoreBgBar(h.overall)}`}
                                  style={{ width: `${h.overall}%` }}
                                />
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-sm">{h.overall}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Rate Vendor Dialog ── */}
      <Dialog open={showRateDialog} onOpenChange={(open) => { setShowRateDialog(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Rate Vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Submit a vendor performance rating after receiving a purchase order.</p>
            <div>
              <Label className="text-sm mb-1.5 block">Vendor</Label>
              <Select value={rateVendorId} onValueChange={setRateVendorId}>
                <SelectTrigger><SelectValue placeholder="Select vendor..." /></SelectTrigger>
                <SelectContent>
                  {store.vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm mb-1.5 block">Quality Score (%)</Label>
                <Input type="number" min={0} max={100} value={rateQuality} onChange={(e) => setRateQuality(e.target.value)} />
                <p className="text-[10px] text-muted-foreground mt-0.5">Product/material quality (0-100)</p>
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">Delivery Timeliness (%)</Label>
                <Input type="number" min={0} max={100} value={rateDelivery} onChange={(e) => setRateDelivery(e.target.value)} />
                <p className="text-[10px] text-muted-foreground mt-0.5">% of on-time deliveries</p>
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">Price Competitiveness (%)</Label>
                <Input type="number" min={0} max={100} value={ratePrice} onChange={(e) => setRatePrice(e.target.value)} />
                <p className="text-[10px] text-muted-foreground mt-0.5">Score vs market average</p>
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">Communication (%)</Label>
                <Input type="number" min={0} max={100} value={rateCommunication} onChange={(e) => setRateCommunication(e.target.value)} />
                <p className="text-[10px] text-muted-foreground mt-0.5">Responsiveness rating</p>
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-muted/30 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Weighted Overall Score</span>
                <span className="font-bold">
                  {Math.round(Number(rateQuality) * 0.35 + Number(rateDelivery) * 0.30 + Number(ratePrice) * 0.15 + Number(rateCommunication) * 0.20)}%
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Quality 35% + Delivery 30% + Price 15% + Communication 20%</p>
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Notes (optional)</Label>
              <Input value={rateNotes} onChange={(e) => setRateNotes(e.target.value)} placeholder="Any additional feedback..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRateDialog(false)}>Cancel</Button>
            <Button onClick={handleRateSubmit} disabled={!rateVendorId}>
              <Star className="h-4 w-4 mr-1" /> Submit Rating
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── PO Form Modal (multi-line) ── */}
      <Dialog open={showPOModal} onOpenChange={(open) => { setShowPOModal(open); if (!open) setEditingPO(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPO ? `Edit ${editingPO.number}` : "New Purchase Order"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">PO number auto-generated. Buyer: <span className="font-semibold">{COMPANY_NAME}</span></p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block text-sm">Vendor</Label>
                <Select value={poVendorId} onValueChange={setPOVendorId}>
                  <SelectTrigger><SelectValue placeholder="Select vendor..." /></SelectTrigger>
                  <SelectContent>
                    {store.vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Expected Delivery</Label>
                <Input type="date" value={poExpectedDate} onChange={(e) => setPOExpectedDate(e.target.value)} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">Line Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setPOLines((prev) => [...prev, { productId: "", quantity: 1, unitPrice: 0 }])}>
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
                    {poLines.map((line, idx) => {
                      const unitPrice = line.unitPrice || getLinePrice(line.productId);
                      const lineTotal = line.quantity * unitPrice;
                      return (
                        <tr key={idx}>
                          <td className="px-3 py-2">
                            <Select value={line.productId} onValueChange={(v) => setPOLines((prev) => prev.map((l, i) => i === idx ? { ...l, productId: v, unitPrice: 0 } : l))}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select product..." /></SelectTrigger>
                              <SelectContent>
                                {store.products.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>{p.name} {p.strength} ({p.code})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <Input type="number" min={1} className="h-8 text-sm text-right" value={line.quantity} onChange={(e) => setPOLines((prev) => prev.map((l, i) => i === idx ? { ...l, quantity: Math.max(1, Number(e.target.value)) } : l))} />
                          </td>
                          <td className="px-3 py-2">
                            <Input type="number" min={0} className="h-8 text-sm text-right" value={line.unitPrice || ""} placeholder={unitPrice > 0 ? String(unitPrice) : "0"} onChange={(e) => setPOLines((prev) => prev.map((l, i) => i === idx ? { ...l, unitPrice: Number(e.target.value) || 0 } : l))} />
                          </td>
                          <td className="px-3 py-2 text-right text-xs font-medium">
                            {lineTotal > 0 ? `EGP ${lineTotal.toLocaleString()}` : "—"}
                          </td>
                          <td className="px-1 py-2">
                            {poLines.length > 1 && (
                              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => setPOLines((prev) => prev.filter((_, i) => i !== idx))}>
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

            <div className="border rounded-lg p-3 bg-muted/30 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">EGP {poSubtotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax (14%)</span><span className="font-medium">EGP {poTax.toLocaleString()}</span></div>
              <div className="flex justify-between border-t pt-1 mt-1"><span className="font-semibold">Total</span><span className="font-bold text-base">EGP {poTotal.toLocaleString()}</span></div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setShowPOModal(false); setEditingPO(null); }}>Cancel</Button>
            <Button type="button" onClick={handlePOSubmit} disabled={!poVendorId || !poExpectedDate || poLines.some((l) => !l.productId || l.quantity <= 0)}>
              {editingPO ? "Update" : "Create PO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── RFQ Form Modal ── */}
      <EntityFormModal
        open={showRFQModal}
        onOpenChange={(open) => { setShowRFQModal(open); if (!open) setEditingRFQ(null); }}
        title={editingRFQ ? `Edit ${editingRFQ.number}` : "New RFQ"}
        description="RFQ number will be generated automatically"
        fields={rfqFields}
        initialData={editingRFQ ? {
          vendorId: editingRFQ.vendorId,
          description: (editingRFQ.items || [])[0]?.description ?? "",
          quantity: (editingRFQ.items || [])[0]?.quantity ?? 0,
          unit: (editingRFQ.items || [])[0]?.unit ?? "",
          validUntil: editingRFQ.validUntil?.slice(0, 10) ?? "",
          notes: editingRFQ.notes ?? "",
        } : undefined}
        onSubmit={handleRFQSubmit}
        submitLabel={editingRFQ ? "Update" : "Create RFQ"}
      />

      {/* ── Shipment Form Modal ── */}
      <Dialog open={showShipmentModal} onOpenChange={(open) => { setShowShipmentModal(open); if (!open) setShipmentPO(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Shipment {shipmentPO ? `for ${shipmentPO.number}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {shipmentPO && (
              <div className="text-sm bg-muted/30 rounded-lg p-3">
                <p><span className="text-muted-foreground">Vendor:</span> <span className="font-medium">{vendorName(shipmentPO.vendorId)}</span></p>
                <p><span className="text-muted-foreground">Items:</span> {(shipmentPO.items || []).map((i) => `${i.description} ×${i.quantity}`).join(", ")}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Carrier</Label>
                <Input value={shipCarrier} onChange={(e) => setShipCarrier(e.target.value)} placeholder="DHL, Maersk, etc." />
              </div>
              <div>
                <Label className="text-sm">Tracking Number</Label>
                <Input value={shipTracking} onChange={(e) => setShipTracking(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <Label className="text-sm">Ship Date</Label>
                <Input type="date" value={shipDate} onChange={(e) => setShipDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-sm">Expected Arrival</Label>
                <Input type="date" value={shipExpected} onChange={(e) => setShipExpected(e.target.value)} />
              </div>
              <div>
                <Label className="text-sm">Shipping Method</Label>
                <Select value={shipMethod} onValueChange={(v) => setShipMethod(v as "Sea" | "Air" | "Land")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Land">Land</SelectItem>
                    <SelectItem value="Sea">Sea</SelectItem>
                    <SelectItem value="Air">Air</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Shipping Cost (EGP)</Label>
                <Input type="number" min={0} value={shipCost} onChange={(e) => setShipCost(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div>
              <Label className="text-sm">Notes</Label>
              <Input value={shipNotes} onChange={(e) => setShipNotes(e.target.value)} placeholder="Optional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowShipmentModal(false); setShipmentPO(null); }}>Cancel</Button>
            <Button onClick={handleShipmentSubmit} disabled={!shipCarrier || !shipDate || !shipExpected}>
              Create Shipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── PO Detail Dialog ── */}
      <Dialog open={!!detailPO} onOpenChange={(o) => !o && setDetailPO(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{detailPO?.number}</DialogTitle></DialogHeader>
          {detailPO && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Buyer</span><p className="font-medium">{COMPANY_NAME}</p></div>
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
                      {(detailPO.items || []).map((it, i) => (
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
                      {(detailGRN.items || []).map((it, i) => (
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

      {/* ── Bill Detail Dialog ── */}
      <Dialog open={!!detailBill} onOpenChange={(o) => !o && setDetailBill(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Bill {detailBill?.number}</DialogTitle></DialogHeader>
          {detailBill && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Bill Number</span><p className="font-mono text-xs font-semibold">{detailBill.number}</p></div>
                <div><span className="text-muted-foreground">Vendor</span><p className="font-medium">{vendorName(detailBill.customerId)}</p></div>
                <div><span className="text-muted-foreground">Date</span><p>{detailBill.date?.slice(0, 10)}</p></div>
                <div><span className="text-muted-foreground">Due Date</span><p>{detailBill.dueDate?.slice(0, 10)}</p></div>
                <div><span className="text-muted-foreground">Status</span><p><StatusBadge status={detailBill.status} /></p></div>
                <div><span className="text-muted-foreground">Currency</span><p>{detailBill.currency}</p></div>
                <div><span className="text-muted-foreground">Subtotal</span><p>{egp(detailBill.subtotal)}</p></div>
                <div><span className="text-muted-foreground">Tax</span><p>{egp(detailBill.tax)}</p></div>
                <div className="col-span-2"><span className="text-muted-foreground">Total</span><p className="text-lg font-bold">{egp(detailBill.total)}</p></div>
              </div>
              <div>
                <span className="text-muted-foreground">Line Items</span>
                <div className="mt-1 border rounded">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-muted/50"><th className="p-2 text-left">Item</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Price</th><th className="p-2 text-right">Total</th></tr></thead>
                    <tbody>
                      {(detailBill.items || []).map((it, i) => (
                        <tr key={i} className="border-t"><td className="p-2">{it.description}</td><td className="p-2 text-right">{it.quantity}</td><td className="p-2 text-right">{egp(it.unitPrice)}</td><td className="p-2 text-right">{egp(it.total)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {detailBill.notes && <div><span className="text-muted-foreground">Notes</span><p className="text-xs">{detailBill.notes}</p></div>}
              {detailBill.status !== "PAID" && detailBill.status !== "VOID" && (
                <div className="pt-2">
                  <Button size="sm" className="w-full" onClick={() => { markBillPaid(detailBill); setDetailBill(null); }}>
                    <CheckCircle className="h-4 w-4 mr-2" /> Mark as Paid
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
