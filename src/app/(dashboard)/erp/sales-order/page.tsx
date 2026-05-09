"use client";

import { useState, useMemo } from "react";
import { ShoppingBag, Truck, FileText, Plus, ArrowRight, CheckCircle, Package, X, Ban, AlertTriangle, RotateCcw, Clock, DollarSign, TrendingDown, ClipboardList, Send, Percent, Eye, CalendarClock } from "lucide-react";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import StatusBadge from "@/components/shared/status-badge";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { useApiDataStore } from "@/lib/api/use-api-store";
import { type SalesOrder, type DeliveryNote } from "@/lib/data-store";
import { CustomerLink } from "@/components/shared/entity-detail-dialog";
import { useTranslation } from "@/lib/i18n/i18n-context";
import { useNotificationCenter } from "@/lib/notification-context";
import { useCrossModuleActions } from "@/lib/cross-module-actions";

interface SOLine {
  productId: string;
  quantity: number;
  discountPct: number;
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

// ── Quotation types & seed data ───────────────────────────────────────────
type QuotationStatus = "Draft" | "Sent" | "Accepted" | "Rejected" | "Expired";

interface QuotationLine {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Quotation {
  id: string;
  number: string;
  customerId: string;
  date: string;
  validUntil: string;
  items: QuotationLine[];
  subtotal: number;
  tax: number;
  total: number;
  terms: string;
  status: QuotationStatus;
  convertedSOId?: string;
}

const SEED_QUOTATIONS: Quotation[] = [
  {
    id: "qt-1", number: "QT-2026-001", customerId: "cust-1", date: "2026-04-01", validUntil: "2026-05-01",
    items: [
      { productId: "prod-1", description: "Augmentin 625mg Tab", quantity: 500, unitPrice: 12, total: 6000 },
      { productId: "prod-2", description: "Crestor 20mg Tab", quantity: 200, unitPrice: 18, total: 3600 },
    ],
    subtotal: 9600, tax: 1344, total: 10944, terms: "Payment net 30 days. Delivery within 5 business days. Prices valid for the stated period only.", status: "Sent",
  },
  {
    id: "qt-2", number: "QT-2026-002", customerId: "cust-2", date: "2026-04-05", validUntil: "2026-05-05",
    items: [
      { productId: "prod-3", description: "Nexium 40mg Cap", quantity: 300, unitPrice: 18, total: 5400 },
    ],
    subtotal: 5400, tax: 756, total: 6156, terms: "50% advance, balance on delivery. FOB destination.", status: "Accepted",
  },
  {
    id: "qt-3", number: "QT-2026-003", customerId: "cust-3", date: "2026-04-10", validUntil: "2026-04-25",
    items: [
      { productId: "prod-1", description: "Augmentin 625mg Tab", quantity: 1000, unitPrice: 12, total: 12000 },
      { productId: "prod-4", description: "Voltaren 75mg Tab", quantity: 400, unitPrice: 9, total: 3600 },
      { productId: "prod-5", description: "Plavix 75mg Tab", quantity: 150, unitPrice: 25, total: 3750 },
    ],
    subtotal: 19350, tax: 2709, total: 22059, terms: "Net 45 days. Bulk discount applied. Subject to stock availability.", status: "Expired",
  },
  {
    id: "qt-4", number: "QT-2026-004", customerId: "cust-4", date: "2026-04-18", validUntil: "2026-05-18",
    items: [
      { productId: "prod-2", description: "Crestor 20mg Tab", quantity: 600, unitPrice: 18, total: 10800 },
    ],
    subtotal: 10800, tax: 1512, total: 12312, terms: "Payment net 30. Free shipping on orders above EGP 10,000.", status: "Draft",
  },
  {
    id: "qt-5", number: "QT-2026-005", customerId: "cust-1", date: "2026-04-22", validUntil: "2026-05-22",
    items: [
      { productId: "prod-3", description: "Nexium 40mg Cap", quantity: 200, unitPrice: 18, total: 3600 },
      { productId: "prod-5", description: "Plavix 75mg Tab", quantity: 100, unitPrice: 25, total: 2500 },
    ],
    subtotal: 6100, tax: 854, total: 6954, terms: "Net 30 days. Warranty per manufacturer terms.", status: "Rejected",
  },
  {
    id: "qt-6", number: "QT-2026-006", customerId: "cust-5", date: "2026-04-28", validUntil: "2026-05-28",
    items: [
      { productId: "prod-1", description: "Augmentin 625mg Tab", quantity: 800, unitPrice: 12, total: 9600 },
      { productId: "prod-4", description: "Voltaren 75mg Tab", quantity: 300, unitPrice: 9, total: 2700 },
    ],
    subtotal: 12300, tax: 1722, total: 14022, terms: "Net 30. Delivery in 2 batches. Prices exclusive of additional duties.", status: "Sent",
  },
];

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
  const store = useApiDataStore();
  const [showSOModal, setShowSOModal] = useState(false);
  const [activeTab, setActiveTab] = useState("orders");
  const { t } = useTranslation();

  // ── Top-level view: "sales", "quotations", or "returns" ──
  const [topView, setTopView] = useState<"sales" | "quotations" | "returns">("sales");

  const [editingSO, setEditingSO] = useState<SalesOrder | null>(null);
  const [detailSO, setDetailSO] = useState<SalesOrder | null>(null);
  const [detailDN, setDetailDN] = useState<DeliveryNote | null>(null);

  const [soSearch, setSOSearch] = useState("");
  const [soFilters, setSOFilters] = useState<FilterState>({});

  const { addNotification } = useNotificationCenter();
  const crossModule = useCrossModuleActions();

  // Multi-line-item SO form state
  const [soCustomerId, setSOCustomerId] = useState("");
  const [soExpectedDate, setSOExpectedDate] = useState("");
  const [soLines, setSOLines] = useState<SOLine[]>([{ productId: "", quantity: 1, discountPct: 0 }]);

  // ── Quotation state ──
  const [quotations, setQuotations] = useState<Quotation[]>(SEED_QUOTATIONS);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quotation | null>(null);
  const [detailQuote, setDetailQuote] = useState<Quotation | null>(null);
  const [previewQuote, setPreviewQuote] = useState<Quotation | null>(null);
  const [quoteSearch, setQuoteSearch] = useState("");
  const [quoteFilters, setQuoteFilters] = useState<FilterState>({});
  const [qtCustomerId, setQtCustomerId] = useState("");
  const [qtValidUntil, setQtValidUntil] = useState("");
  const [qtTerms, setQtTerms] = useState("");
  const [qtLines, setQtLines] = useState<SOLine[]>([{ productId: "", quantity: 1, discountPct: 0 }]);

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
  const pendingApprovalSOs = store.salesOrders.filter((s) => s.status === "PENDING_APPROVAL").length;
  const confirmedSOs = store.salesOrders.filter((s) => s.status === "CONFIRMED").length;
  const processingSOs = store.salesOrders.filter((s) => s.status === "PROCESSING").length;
  const preparingSOs = store.salesOrders.filter((s) => s.status === "PREPARING").length;
  const shippedSOs = store.salesOrders.filter((s) => s.status === "SHIPPED").length;
  const deliveredSOs = store.salesOrders.filter((s) => s.status === "DELIVERED").length;
  const totalRevenue = store.salesOrders.filter((s) => s.status === "INVOICED").reduce((sum, s) => sum + s.total, 0);

  // Returns stats
  const retPending = returns.filter(r => r.status === "Pending").length;
  const retTotalValue = returns.reduce((s, r) => s + r.value, 0);
  const retApprovedValue = returns.filter(r => r.status === "Approved" || r.status === "Credit Issued").reduce((s, r) => s + r.value, 0);
  const retRate = retTotalValue > 0 ? ((returns.length / (returns.length + 500)) * 100).toFixed(1) : "0.0";

  // Quotation stats
  const totalQuotes = quotations.length;
  const pendingQuotes = quotations.filter(q => q.status === "Sent" || q.status === "Draft").length;
  const acceptedQuotes = quotations.filter(q => q.status === "Accepted").length;
  const conversionRate = totalQuotes > 0 ? ((acceptedQuotes / totalQuotes) * 100).toFixed(1) : "0.0";

  // Auto-expire check: mark quotations past validUntil as Expired
  const today = new Date().toISOString().slice(0, 10);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per day-change to expire old quotes
  useMemo(() => {
    const needsExpiry = quotations.some(q =>
      (q.status === "Draft" || q.status === "Sent") && q.validUntil < today
    );
    if (needsExpiry) {
      setQuotations(prev => prev.map(q =>
        (q.status === "Draft" || q.status === "Sent") && q.validUntil < today
          ? { ...q, status: "Expired" as QuotationStatus }
          : q
      ));
    }
  }, [today]);

  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      const search = quoteSearch.toLowerCase();
      if (search && !q.number.toLowerCase().includes(search) && !customerName(q.customerId).toLowerCase().includes(search)) return false;
      if (quoteFilters.status && q.status !== quoteFilters.status) return false;
      return true;
    });
  }, [quotations, quoteSearch, quoteFilters]);

  function openQuoteModal(q?: Quotation | null) {
    if (q) {
      setEditingQuote(q);
      setQtCustomerId(q.customerId);
      setQtValidUntil(q.validUntil);
      setQtTerms(q.terms);
      setQtLines((q.items || []).map((it) => ({ productId: it.productId, quantity: it.quantity, discountPct: 0 })));
    } else {
      setEditingQuote(null);
      setQtCustomerId("");
      setQtValidUntil("");
      setQtTerms("Payment net 30 days. Delivery within 5 business days.");
      setQtLines([{ productId: "", quantity: 1, discountPct: 0 }]);
    }
    setShowQuoteModal(true);
  }

  const qtSubtotal = qtLines.reduce((sum, l) => sum + l.quantity * getLinePrice(l.productId), 0);
  const qtTax = qtSubtotal * 0.14;
  const qtTotal = qtSubtotal + qtTax;

  function handleQuoteSubmit() {
    if (!qtCustomerId || !qtValidUntil || qtLines.length === 0) return;
    if (qtLines.some((l) => !l.productId || l.quantity <= 0)) return;

    const items: QuotationLine[] = qtLines.map((l) => {
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

    if (editingQuote) {
      setQuotations(prev => prev.map(q => q.id === editingQuote.id ? {
        ...q, customerId: qtCustomerId, validUntil: qtValidUntil, terms: qtTerms,
        items, subtotal, tax, total,
      } : q));
    } else {
      const nextNum = quotations.length + 1;
      setQuotations(prev => [{
        id: `qt-${Date.now()}`,
        number: `QT-2026-${String(nextNum).padStart(3, "0")}`,
        customerId: qtCustomerId,
        date: new Date().toISOString().slice(0, 10),
        validUntil: qtValidUntil,
        items, subtotal, tax, total,
        terms: qtTerms,
        status: "Draft" as QuotationStatus,
      }, ...prev]);
    }
    setShowQuoteModal(false);
    setEditingQuote(null);
  }

  function sendQuotation(q: Quotation) {
    if (q.status !== "Draft") return;
    setQuotations(prev => prev.map(x => x.id === q.id ? { ...x, status: "Sent" as QuotationStatus } : x));
  }

  function acceptQuotation(q: Quotation) {
    if (q.status !== "Sent") return;
    setQuotations(prev => prev.map(x => x.id === q.id ? { ...x, status: "Accepted" as QuotationStatus } : x));
  }

  function rejectQuotation(q: Quotation) {
    if (q.status !== "Sent") return;
    setQuotations(prev => prev.map(x => x.id === q.id ? { ...x, status: "Rejected" as QuotationStatus } : x));
  }

  function convertQuoteToSO(q: Quotation) {
    if (q.status !== "Accepted") return;
    // Create a new SO pre-filled from the quotation
    const soItems = (q.items || []).map((it) => ({
      productId: it.productId,
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discountPct: 0,
      total: it.total,
    }));
    const newSO = {
      id: store.genId("so"),
      number: store.generateSONumber(),
      customerId: q.customerId,
      date: new Date().toISOString(),
      expectedDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      items: soItems,
      subtotal: q.subtotal,
      discountPct: 0,
      discountAmount: 0,
      tax: q.tax,
      total: q.total,
      status: "DRAFT" as const,
      createdAt: new Date().toISOString(),
    };
    store.add("salesOrders", newSO);
    setQuotations(prev => prev.map(x => x.id === q.id ? { ...x, convertedSOId: newSO.id } : x));
    // Switch to sales view to show the new SO
    setTopView("sales");
  }

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
      setSOLines((so.items || []).map((it) => ({ productId: it.productId, quantity: it.quantity, discountPct: it.discountPct ?? 0 })));
    } else {
      setEditingSO(null);
      setSOCustomerId("");
      setSOExpectedDate("");
      setSOLines([{ productId: "", quantity: 1, discountPct: 0 }]);
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

  const soSubtotal = soLines.reduce((sum, l) => {
    const price = getLinePrice(l.productId);
    return sum + (l.quantity ?? 0) * price * (1 - (l.discountPct ?? 0) / 100);
  }, 0);
  const soTotalDiscountAmount = soLines.reduce((sum, l) => {
    const price = getLinePrice(l.productId);
    return sum + (l.quantity ?? 0) * price * ((l.discountPct ?? 0) / 100);
  }, 0);
  const soTax = soSubtotal * 0.14;
  const soTotal = soSubtotal + soTax;

  function handleSOSubmit() {
    if (!soCustomerId || !soExpectedDate || soLines.length === 0) return;
    if (soLines.some((l) => !l.productId || l.quantity <= 0)) return;

    const items = soLines.map((l) => {
      const price = getLinePrice(l.productId);
      const disc = l.discountPct ?? 0;
      return {
        productId: l.productId,
        description: getLineDesc(l.productId),
        quantity: l.quantity,
        unitPrice: price,
        discountPct: disc,
        total: (l.quantity ?? 0) * price * (1 - disc / 100),
      };
    });
    const subtotal = items.reduce((sum, i) => sum + (i.total ?? 0), 0);
    const discountAmount = items.reduce((sum, i) => sum + (i.quantity ?? 0) * (i.unitPrice ?? 0) * ((i.discountPct ?? 0) / 100), 0);
    const avgDiscountPct = items.length > 0
      ? items.reduce((sum, i) => sum + (i.discountPct ?? 0), 0) / items.length
      : 0;
    const tax = subtotal * 0.14;
    const total = subtotal + tax;

    if (editingSO) {
      store.update("salesOrders", editingSO.id, {
        customerId: soCustomerId,
        items,
        subtotal, discountPct: avgDiscountPct, discountAmount, tax, total,
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
        subtotal, discountPct: avgDiscountPct, discountAmount, tax, total,
        status: "DRAFT",
        createdAt: new Date().toISOString(),
      });
    }
    setShowSOModal(false);
    setEditingSO(null);
  }

  // ─── Submit SO for approval (DRAFT → PENDING_APPROVAL, auto-create draft invoice) ────
  function submitSOForApproval(so: SalesOrder) {
    // Auto-create a DRAFT invoice with all SO line items
    const invId = store.genId("inv");
    store.add("invoices", {
      id: invId,
      number: store.generateInvoiceNumber(),
      customerId: so.customerId,
      date: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      subtotal: so.subtotal, tax: so.tax, total: so.total,
      currency: "EGP", status: "DRAFT",
      items: (so.items || []).map((i) => ({ productId: i.productId, description: i.description + ((i.discountPct ?? 0) > 0 ? ` (${i.discountPct}% off)` : ""), quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),
      notes: `Auto-generated DRAFT invoice from SO ${so.number}`,
    });

    store.update("salesOrders", so.id, { status: "PENDING_APPROVAL", invoiceId: invId });

    addNotification({
      type: "APPROVAL",
      title: `SO ${so.number} submitted to Accounting for approval`,
      message: `Sales Order ${so.number} for ${customerName(so.customerId)} (${egp(so.total)}) has been submitted to Accounting for approval. A draft invoice has been created.`,
      module: "FINANCE",
      entityType: "SalesOrder",
      entityId: so.id,
    });
  }

  // ─── Mark Shipped (PREPARING → SHIPPED) — auto-create DeliveryNote ───
  function markShipped(so: SalesOrder) {
    if (so.status !== "PREPARING") return;
    const dnId = store.genId("dn");
    store.add("deliveryNotes", {
      id: dnId,
      number: store.generateDNNumber(),
      soId: so.id,
      customerId: so.customerId,
      date: new Date().toISOString(),
      items: (so.items || []).map((i) => ({ productId: i.productId, description: i.description, quantity: i.quantity })),
      status: "SHIPPED",
      createdAt: new Date().toISOString(),
    });
    store.update("salesOrders", so.id, { status: "SHIPPED", dnId });
  }

  // ─── Cancel Order (DRAFT or PENDING_APPROVAL → CANCELLED) ───
  function cancelOrder(so: SalesOrder) {
    if (so.status !== "DRAFT" && so.status !== "PENDING_APPROVAL") return;
    store.update("salesOrders", so.id, { status: "CANCELLED" });
  }

  // ─── Approve SO (PENDING_APPROVAL → CONFIRMED) ───
  function approveSO(so: SalesOrder) {
    if (so.status !== "PENDING_APPROVAL") return;
    store.update("salesOrders", so.id, { status: "CONFIRMED" });
    crossModule.onSalesOrderConfirmed(so);
    crossModule.onSalesOrderReserveStock(so);
    addNotification({
      type: "SUCCESS",
      title: `SO ${so.number} Confirmed`,
      message: `Sales Order ${so.number} for ${customerName(so.customerId)} (EGP ${(so.total ?? 0).toLocaleString()}) has been confirmed. Inventory reserved.`,
      module: "FINANCE",
      entityType: "SalesOrder",
      entityId: so.id,
    });
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

  // ─── Integration: Confirm Delivery → DELIVERED, auto-create DRAFT JE ───────
  function confirmDelivery(dn: DeliveryNote) {
    store.update("deliveryNotes", dn.id, { status: "DELIVERED" });

    const so = store.salesOrders.find((s) => s.id === dn.soId);
    if (!so) return;

    // Build JE lines with discount handling
    const totalDiscountAmount = so.discountAmount ?? 0;
    const jeLines = [
      { accountId: "gl-1100", description: "Accounts Receivable", debit: so.total, credit: 0 },
      { accountId: "gl-4000", description: "Product Sales Revenue", debit: 0, credit: so.subtotal },
      { accountId: "gl-2100", description: "VAT Payable", debit: 0, credit: so.tax },
    ];
    // If there is a discount, add a DR entry for Sales Discount
    if (totalDiscountAmount > 0) {
      jeLines.push({ accountId: "gl-4900", description: "Sales Discount", debit: totalDiscountAmount, credit: 0 });
    }

    const jeId = store.genId("je");
    store.add("journalEntries", {
      id: jeId,
      number: store.generateJournalNumber(),
      date: new Date().toISOString().split("T")[0],
      description: `Sales revenue — SO ${so.number}`,
      reference: so.number, type: "GENERAL",
      lines: jeLines,
      status: "DRAFT", createdBy: "u-admin", createdAt: new Date().toISOString(),
    });

    // Deduct stock for each SO line item
    (so.items || []).forEach((item) => {
      const product = store.products.find((p) => p.id === item.productId);
      if (product) {
        store.update("products", product.id, { stockQty: Math.max(0, (product.stockQty ?? 0) - item.quantity) });
      }
    });

    store.update("salesOrders", so.id, { status: "DELIVERED", jeId });

    addNotification({
      type: "INFO",
      title: `Draft JE created for SO ${so.number}, pending approval`,
      message: `Delivery confirmed for SO ${so.number}. A draft Journal Entry (${store.journalEntries.find(j => j.id === jeId)?.number ?? jeId}) has been created and is pending approval.`,
      module: "FINANCE",
      entityType: "JournalEntry",
      entityId: jeId,
    });
  }

  const egp = (n: number) => `EGP ${(n ?? 0).toLocaleString()}`;
  const fmt = (n: number) => "EGP " + (n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <PageHeader
        title={topView === "sales" ? t("so.title") : topView === "quotations" ? "Quotations" : t("ret.title")}
        description={topView === "sales" ? t("so.manageSO") : topView === "quotations" ? "Create, manage, and convert quotations to sales orders" : t("ret.manageReturns")}
        actions={
          topView === "sales" ? (
            <Button onClick={() => openSOModal()}>
              <Plus className="h-4 w-4 mr-2" /> {t("so.createSO")}
            </Button>
          ) : topView === "quotations" ? (
            <Button onClick={() => openQuoteModal()}>
              <Plus className="h-4 w-4 mr-2" /> New Quotation
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
          variant={topView === "quotations" ? "default" : "ghost"}
          onClick={() => setTopView("quotations")}
        >
          <ClipboardList className="h-4 w-4 mr-2" /> Quotations
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
            <StatsCard icon={ShoppingBag} title={t("so.totalSOs")} value={String(totalSOs)} subtitle={`${pendingApprovalSOs} pending, ${confirmedSOs} confirmed, ${preparingSOs} preparing`} iconColor="text-blue-600" />
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
                    { value: "DRAFT", label: "Draft" }, { value: "PENDING_APPROVAL", label: "Pending Approval" },
                    { value: "CONFIRMED", label: "Approved" }, { value: "PROCESSING", label: "Processing" },
                    { value: "PREPARING", label: "Preparing" }, { value: "SHIPPED", label: "Shipped" },
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
                        return <span className="text-sm">{(so.items || []).map((i) => `${i.description} ×${i.quantity}`).join(", ")}</span>;
                      }},
                      { key: "discountAmount", label: "Discount", className: "text-right", render: (_v: unknown, row: Record<string, unknown>) => {
                        const so = row as unknown as SalesOrder;
                        const amt = so.discountAmount ?? 0;
                        return amt > 0 ? <span className="text-sm font-medium text-orange-600">{egp(amt)}</span> : <span className="text-xs text-muted-foreground">--</span>;
                      }},
                      { key: "total", label: "Total", className: "text-right", render: (v: number) => <span className="font-semibold">{egp(v)}</span> },
                      { key: "date", label: "Date", render: (v: string) => v?.slice(0, 10) },
                      { key: "status", label: "Status", render: (_v: unknown, row: Record<string, unknown>) => {
                        const so = row as unknown as SalesOrder;
                        return (
                          <div className="flex flex-col gap-0.5">
                            <StatusBadge status={so.status} />
                            {so.status === "PENDING_APPROVAL" && <Badge variant="outline" className="text-[9px] bg-yellow-50 text-yellow-700 border-yellow-200 mt-0.5">Pending Approval</Badge>}
                            {so.escalatedToFinance && <Badge variant="outline" className="text-[9px] bg-red-50 text-red-700 border-red-200 mt-0.5">Escalated to Finance</Badge>}
                            {so.status === "CONFIRMED" && <Badge variant="outline" className="text-[9px] bg-green-50 text-green-700 border-green-200 mt-0.5">Approved</Badge>}
                            {so.status === "PREPARING" && <Badge variant="outline" className="text-[9px] bg-orange-50 text-orange-700 border-orange-200 mt-0.5">Preparing for Delivery</Badge>}
                          </div>
                        );
                      }},
                      { key: "invoiceId", label: "Invoice / JE", render: (_v: unknown, row: Record<string, unknown>) => {
                        const so = row as unknown as SalesOrder;
                        if (!so.invoiceId && !so.jeId) return <span className="text-xs text-muted-foreground">--</span>;
                        const inv = so.invoiceId ? store.invoices.find((i) => i.id === so.invoiceId) : null;
                        const je = so.jeId ? store.journalEntries.find((j) => j.id === so.jeId) : store.journalEntries.find((j) => j.reference === so.number);
                        return (
                          <div className="flex flex-col gap-0.5">
                            {inv && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                                <FileText className="h-2.5 w-2.5" /> {inv.number} ({inv.status})
                              </span>
                            )}
                            {je && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                                <DollarSign className="h-2.5 w-2.5" /> {je.number} ({je.status})
                              </span>
                            )}
                          </div>
                        );
                      }},
                      { key: "id", label: "Actions", className: "text-right", render: (_v: unknown, row: Record<string, unknown>) => {
                        const so = row as unknown as SalesOrder;
                        return (
                          <div className="flex items-center justify-end gap-1">
                            {so.status === "DRAFT" && (
                              <Button size="sm" className="h-7 text-xs" onClick={() => submitSOForApproval(so)}>
                                <ArrowRight className="h-3 w-3 mr-1" /> Submit for Approval
                              </Button>
                            )}
                            {so.status === "PENDING_APPROVAL" && (
                              <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => approveSO(so)}>
                                <CheckCircle className="h-3 w-3 mr-1" /> Approve
                              </Button>
                            )}
                            {so.status === "PREPARING" && (
                              <Button size="sm" className="h-7 text-xs bg-cyan-600 hover:bg-cyan-700" onClick={() => markShipped(so)}>
                                <Truck className="h-3 w-3 mr-1" /> Mark Shipped
                              </Button>
                            )}
                            {(so.status === "DRAFT" || so.status === "PENDING_APPROVAL") && (
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
                    <Badge variant="outline" className="bg-yellow-50">2. PENDING APPROVAL (Sent to Accounting)</Badge>
                    <ArrowRight className="h-3 w-3" />
                    <Badge variant="outline" className="bg-green-50">3. CONFIRMED (Approved by Accounting)</Badge>
                    <ArrowRight className="h-3 w-3" />
                    <Badge variant="outline" className="bg-indigo-50">4. PROCESSING (Stock Check + Deduction)</Badge>
                    <ArrowRight className="h-3 w-3" />
                    <Badge variant="outline" className="bg-orange-50">5. PREPARING (Warehouse Prepares)</Badge>
                    <ArrowRight className="h-3 w-3" />
                    <Badge variant="outline" className="bg-cyan-50">6. SHIPPED (Auto-create DN)</Badge>
                    <ArrowRight className="h-3 w-3" />
                    <Badge variant="outline" className="bg-amber-50">7. DELIVERED (DN Confirmed, Draft JE Created)</Badge>
                    <ArrowRight className="h-3 w-3" />
                    <Badge variant="outline" className="bg-purple-50">8. INVOICED (JE Approved)</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">DRAFT and PENDING APPROVAL orders can be cancelled. A draft invoice is auto-created on submission. Stock is reserved at PROCESSING. A draft JE is created on delivery confirmation.</p>
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
                        return <span className="text-sm">{(dn.items || []).map((i) => `${i.description} ×${i.quantity}`).join(", ")}</span>;
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
      {/* ── QUOTATIONS VIEW ── */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {topView === "quotations" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard icon={ClipboardList} title="Total Quotes" value={String(totalQuotes)} subtitle="All quotations" iconColor="text-blue-600" />
            <StatsCard icon={Clock} title="Pending" value={String(pendingQuotes)} subtitle="Draft + Sent" iconColor="text-amber-600" />
            <StatsCard icon={CheckCircle} title="Accepted" value={String(acceptedQuotes)} subtitle="Ready to convert" iconColor="text-green-600" />
            <StatsCard icon={Percent} title="Conversion Rate" value={`${conversionRate}%`} subtitle="Accepted / Total" iconColor="text-purple-600" />
          </div>

          <FilterBar
            searchPlaceholder="Search by Quote #, customer..."
            searchValue={quoteSearch}
            onSearchChange={setQuoteSearch}
            fields={[
              { key: "status", label: "Status", type: "select" as const, options: [
                { value: "Draft", label: "Draft" }, { value: "Sent", label: "Sent" },
                { value: "Accepted", label: "Accepted" }, { value: "Rejected", label: "Rejected" },
                { value: "Expired", label: "Expired" },
              ]},
            ]}
            values={quoteFilters}
            onChange={(key, value) => setQuoteFilters((prev) => ({ ...prev, [key]: value }))}
          />

          <Card>
            <CardHeader>
              <CardTitle>Quotations</CardTitle>
              <CardDescription>Manage customer quotations and convert accepted quotes to sales orders</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "number", label: "Quote #", render: (v: string) => <span className="font-mono text-xs font-semibold">{v}</span> },
                  { key: "customerId", label: "Customer", render: (v: string) => <CustomerLink customerId={v} /> },
                  { key: "date", label: "Date", render: (v: string) => v },
                  { key: "validUntil", label: "Valid Until", render: (v: string) => {
                    const isExpired = v < today;
                    return <span className={isExpired ? "text-red-600 font-medium" : ""}>{v}{isExpired ? " (past)" : ""}</span>;
                  }},
                  { key: "items", label: "Items", render: (_v: unknown, row: Record<string, unknown>) => {
                    const q = row as unknown as Quotation;
                    return <span className="text-sm">{(q.items || []).length} item{(q.items || []).length !== 1 ? "s" : ""}</span>;
                  }},
                  { key: "total", label: "Total", className: "text-right", render: (v: number) => <span className="font-semibold">{egp(v)}</span> },
                  { key: "status", label: "Status", render: (v: string) => <StatusBadge status={v} /> },
                  { key: "id", label: "Actions", className: "text-right", render: (_v: unknown, row: Record<string, unknown>) => {
                    const q = row as unknown as Quotation;
                    return (
                      <div className="flex items-center justify-end gap-1">
                        {q.status === "Draft" && (
                          <Button size="sm" className="h-7 text-xs" onClick={() => sendQuotation(q)}>
                            <Send className="h-3 w-3 mr-1" /> Send
                          </Button>
                        )}
                        {q.status === "Sent" && (
                          <>
                            <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => acceptQuotation(q)}>
                              <CheckCircle className="h-3 w-3 mr-1" /> Accept
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => rejectQuotation(q)}>
                              <Ban className="h-3 w-3 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {q.status === "Accepted" && !q.convertedSOId && (
                          <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700" onClick={() => convertQuoteToSO(q)}>
                            <ArrowRight className="h-3 w-3 mr-1" /> Convert to SO
                          </Button>
                        )}
                        {q.convertedSOId && (
                          <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">Converted</Badge>
                        )}
                        <EditDeleteMenu
                          onView={() => setDetailQuote(q)}
                          onEdit={q.status === "Draft" ? () => openQuoteModal(q) : undefined}
                          onDelete={q.status === "Draft" ? () => setQuotations(prev => prev.filter(x => x.id !== q.id)) : undefined}
                          canView
                          itemLabel={q.number}
                          compact
                          extraItems={[
                            { label: "Preview PDF", onClick: () => setPreviewQuote(q) },
                          ]}
                        />
                      </div>
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={filteredQuotations as unknown as Record<string, unknown>[]}
                exportable exportFilename="quotations.csv" emptyMessage="No quotations found."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Quotation Status Flow</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <Badge variant="outline" className="bg-yellow-50">1. Draft</Badge>
                <ArrowRight className="h-3 w-3" />
                <Badge variant="outline" className="bg-blue-50">2. Sent</Badge>
                <ArrowRight className="h-3 w-3" />
                <div className="flex flex-col gap-1">
                  <Badge variant="outline" className="bg-green-50">3a. Accepted</Badge>
                  <Badge variant="outline" className="bg-red-50">3b. Rejected</Badge>
                </div>
                <ArrowRight className="h-3 w-3" />
                <Badge variant="outline" className="bg-indigo-50">4. Convert to SO (from Accepted)</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Quotations past their validity date are automatically marked as Expired. Only Draft quotations can be edited or deleted.</p>
            </CardContent>
          </Card>
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
                <Button type="button" variant="outline" size="sm" onClick={() => setSOLines((prev) => [...prev, { productId: "", quantity: 1, discountPct: 0 }])}>
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
                      <th className="text-right px-3 py-2 font-medium w-20">Disc %</th>
                      <th className="text-right px-3 py-2 font-medium w-28">Line Total</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {soLines.map((line, idx) => {
                      const unitPrice = getLinePrice(line.productId);
                      const disc = line.discountPct ?? 0;
                      const lineTotal = (line.quantity ?? 0) * unitPrice * (1 - disc / 100);
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
                          <td className="px-3 py-2">
                            <Input type="number" min={0} max={100} step={0.5} className="h-8 text-sm text-right" value={line.discountPct} onChange={(e) => setSOLines((prev) => prev.map((l, i) => i === idx ? { ...l, discountPct: Math.min(100, Math.max(0, Number(e.target.value))) } : l))} placeholder="0" />
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
              <p className="text-[10px] text-muted-foreground mt-1">Enter discount % per product line (0-100). Tax is calculated on the discounted subtotal.</p>
            </div>

            {/* Totals */}
            <div className="border rounded-lg p-3 bg-muted/30 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal (after discounts)</span>
                <span className="font-medium">EGP {soSubtotal.toLocaleString()}</span>
              </div>
              {soTotalDiscountAmount > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Total Discount</span>
                  <span className="font-medium">- EGP {soTotalDiscountAmount.toLocaleString()}</span>
                </div>
              )}
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
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <div className="flex flex-col gap-0.5">
                    <StatusBadge status={detailSO.status} />
                    {detailSO.status === "PENDING_APPROVAL" && <Badge variant="outline" className="text-[9px] bg-yellow-50 text-yellow-700 border-yellow-200 mt-0.5 w-fit">Pending Approval</Badge>}
                    {detailSO.escalatedToFinance && <Badge variant="outline" className="text-[9px] bg-red-50 text-red-700 border-red-200 mt-0.5 w-fit">Escalated to Finance</Badge>}
                    {detailSO.status === "CONFIRMED" && <Badge variant="outline" className="text-[9px] bg-green-50 text-green-700 border-green-200 mt-0.5 w-fit">Approved</Badge>}
                    {detailSO.status === "PREPARING" && <Badge variant="outline" className="text-[9px] bg-orange-50 text-orange-700 border-orange-200 mt-0.5 w-fit">Preparing for Delivery</Badge>}
                  </div>
                </div>
                <div><span className="text-muted-foreground">Date</span><p>{detailSO.date?.slice(0, 10)}</p></div>
                <div><span className="text-muted-foreground">Expected</span><p>{detailSO.expectedDate?.slice(0, 10)}</p></div>
                <div><span className="text-muted-foreground">Subtotal</span><p>{egp(detailSO.subtotal)}</p></div>
                {(detailSO.discountAmount ?? 0) > 0 && (
                  <div><span className="text-muted-foreground">Total Discount</span><p className="text-orange-600 font-medium">- {egp(detailSO.discountAmount)}</p></div>
                )}
                <div><span className="text-muted-foreground">Tax (14%)</span><p>{egp(detailSO.tax)}</p></div>
                <div className="col-span-2"><span className="text-muted-foreground">Total</span><p className="text-lg font-bold">{egp(detailSO.total)}</p></div>
              </div>
              <div>
                <span className="text-muted-foreground">Items</span>
                <div className="mt-1 border rounded">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-muted/50"><th className="p-2 text-left">Product</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Price</th><th className="p-2 text-right">Disc %</th><th className="p-2 text-right">Total</th><th className="p-2 text-center">Stock</th></tr></thead>
                    <tbody>
                      {(detailSO.items || []).map((it, i) => {
                        const stock = getStockStatus(it.productId, it.quantity);
                        return (
                          <tr key={i} className="border-t">
                            <td className="p-2">{it.description}</td>
                            <td className="p-2 text-right">{it.quantity}</td>
                            <td className="p-2 text-right">{egp(it.unitPrice)}</td>
                            <td className="p-2 text-right">{(it.discountPct ?? 0) > 0 ? <span className="text-orange-600 font-medium">{it.discountPct}%</span> : <span className="text-muted-foreground">--</span>}</td>
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
              {detailSO.invoiceId && <div><span className="text-muted-foreground">Invoice</span><p className="font-mono text-xs">{store.invoices.find((inv) => inv.id === detailSO.invoiceId)?.number ?? detailSO.invoiceId} ({store.invoices.find((inv) => inv.id === detailSO.invoiceId)?.status ?? ""})</p></div>}
              {(detailSO.invoiceId || detailSO.jeId) && (() => {
                const inv = detailSO.invoiceId ? store.invoices.find((i) => i.id === detailSO.invoiceId) : null;
                const je = detailSO.jeId ? store.journalEntries.find((j) => j.id === detailSO.jeId) : store.journalEntries.find((j) => j.reference === detailSO.number);
                const isComplete = detailSO.status === "INVOICED";
                return (
                  <div className={`border ${isComplete ? "border-green-200 bg-green-50/50" : "border-blue-200 bg-blue-50/50"} rounded-lg p-3 space-y-2`}>
                    <p className={`text-xs font-semibold ${isComplete ? "text-green-800" : "text-blue-800"} flex items-center gap-1`}>
                      {isComplete ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                      {isComplete ? "Financial Integration Complete" : "Financial Documents"}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {inv && (
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-green-600" />
                          <div>
                            <span className="text-muted-foreground">Invoice</span>
                            <p className="font-mono font-semibold">{inv.number} <StatusBadge status={inv.status} /></p>
                          </div>
                        </div>
                      )}
                      {je && (
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-purple-600" />
                          <div>
                            <span className="text-muted-foreground">Journal Entry</span>
                            <p className="font-mono font-semibold">{je.number} <StatusBadge status={je.status} /></p>
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {isComplete
                        ? "Invoice and journal entry have been approved."
                        : "Draft invoice created on submission. Draft JE created on delivery confirmation. Both require approval."}
                    </p>
                  </div>
                );
              })()}
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
                      {(detailDN.items || []).map((it, i) => (
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

      {/* ── Quotation Form Modal ── */}
      <Dialog open={showQuoteModal} onOpenChange={(open) => { setShowQuoteModal(open); if (!open) setEditingQuote(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuote ? `Edit ${editingQuote.number}` : "New Quotation"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block text-sm">Customer</Label>
                <Select value={qtCustomerId} onValueChange={setQtCustomerId}>
                  <SelectTrigger><SelectValue placeholder="Select customer..." /></SelectTrigger>
                  <SelectContent>
                    {store.customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Valid Until</Label>
                <Input type="date" value={qtValidUntil} onChange={(e) => setQtValidUntil(e.target.value)} />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">Line Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setQtLines((prev) => [...prev, { productId: "", quantity: 1, discountPct: 0 }])}>
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
                    {qtLines.map((line, idx) => {
                      const unitPrice = getLinePrice(line.productId);
                      const lineTotal = line.quantity * unitPrice;
                      return (
                        <tr key={idx}>
                          <td className="px-3 py-2">
                            <Select value={line.productId} onValueChange={(v) => setQtLines((prev) => prev.map((l, i) => i === idx ? { ...l, productId: v } : l))}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select product..." /></SelectTrigger>
                              <SelectContent>
                                {store.products.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>{p.name} {p.strength} ({p.code})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <Input type="number" min={1} className="h-8 text-sm text-right" value={line.quantity} onChange={(e) => setQtLines((prev) => prev.map((l, i) => i === idx ? { ...l, quantity: Math.max(1, Number(e.target.value)) } : l))} />
                          </td>
                          <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                            {unitPrice > 0 ? `EGP ${unitPrice.toLocaleString()}` : "—"}
                          </td>
                          <td className="px-3 py-2 text-right text-xs font-medium">
                            {lineTotal > 0 ? `EGP ${lineTotal.toLocaleString()}` : "—"}
                          </td>
                          <td className="px-1 py-2">
                            {qtLines.length > 1 && (
                              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => setQtLines((prev) => prev.filter((_, i) => i !== idx))}>
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

            {/* Terms & Conditions */}
            <div>
              <Label className="mb-1.5 block text-sm">Terms &amp; Conditions</Label>
              <Textarea
                value={qtTerms}
                onChange={(e) => setQtTerms(e.target.value)}
                placeholder="Enter terms and conditions..."
                rows={3}
              />
            </div>

            {/* Totals */}
            <div className="border rounded-lg p-3 bg-muted/30 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">EGP {qtSubtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (14%)</span>
                <span className="font-medium">EGP {qtTax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-base">EGP {qtTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setShowQuoteModal(false); setEditingQuote(null); }}>Cancel</Button>
            <Button type="button" onClick={handleQuoteSubmit} disabled={!qtCustomerId || !qtValidUntil || qtLines.some((l) => !l.productId || l.quantity <= 0)}>
              {editingQuote ? "Update" : "Create Quotation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Quotation Detail Dialog ── */}
      <Dialog open={!!detailQuote} onOpenChange={(o) => !o && setDetailQuote(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detailQuote?.number}</DialogTitle></DialogHeader>
          {detailQuote && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Customer</span><p className="font-medium">{customerName(detailQuote.customerId)}</p></div>
                <div><span className="text-muted-foreground">Status</span><p><StatusBadge status={detailQuote.status} /></p></div>
                <div><span className="text-muted-foreground">Date</span><p>{detailQuote.date}</p></div>
                <div><span className="text-muted-foreground">Valid Until</span><p className={detailQuote.validUntil < today ? "text-red-600 font-medium" : ""}>{detailQuote.validUntil}</p></div>
                <div><span className="text-muted-foreground">Subtotal</span><p>{egp(detailQuote.subtotal)}</p></div>
                <div><span className="text-muted-foreground">Tax (14%)</span><p>{egp(detailQuote.tax)}</p></div>
                <div className="col-span-2"><span className="text-muted-foreground">Total</span><p className="text-lg font-bold">{egp(detailQuote.total)}</p></div>
              </div>

              {/* Status Flow */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Status Flow</h4>
                <div className="flex items-center gap-1">
                  {(["Draft", "Sent", "Accepted"] as const).map((step, i) => {
                    const steps = ["Draft", "Sent", "Accepted"];
                    const currentIdx = steps.indexOf(detailQuote.status);
                    const isRejected = detailQuote.status === "Rejected";
                    const isExpired = detailQuote.status === "Expired";
                    const isReached = !isRejected && !isExpired && i <= currentIdx;
                    const isCurrent = !isRejected && !isExpired && i === currentIdx;
                    return (
                      <div key={step} className="flex items-center gap-1 flex-1">
                        <div className="flex flex-col items-center flex-1">
                          <div className={`h-3 w-3 rounded-full border-2 ${isCurrent ? "bg-primary border-primary" : isReached ? "bg-primary/60 border-primary/60" : "bg-muted border-muted-foreground/30"}`} />
                          <span className={`text-[10px] mt-1 text-center leading-tight ${isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{step}</span>
                        </div>
                        {i < 2 && <div className={`h-0.5 flex-1 -mt-4 ${isReached && i < currentIdx ? "bg-primary/60" : "bg-muted"}`} />}
                      </div>
                    );
                  })}
                </div>
                {detailQuote.status === "Rejected" && <p className="text-sm text-red-600 font-medium mt-2">This quotation was rejected.</p>}
                {detailQuote.status === "Expired" && <p className="text-sm text-amber-600 font-medium mt-2">This quotation has expired (past validity date).</p>}
              </div>

              {/* Items */}
              <div>
                <span className="text-muted-foreground">Line Items</span>
                <div className="mt-1 border rounded">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-muted/50"><th className="p-2 text-left">Product</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Price</th><th className="p-2 text-right">Total</th></tr></thead>
                    <tbody>
                      {(detailQuote.items || []).map((it, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{it.description}</td>
                          <td className="p-2 text-right">{it.quantity}</td>
                          <td className="p-2 text-right">{egp(it.unitPrice)}</td>
                          <td className="p-2 text-right">{egp(it.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Terms */}
              <div>
                <span className="text-muted-foreground">Terms &amp; Conditions</span>
                <p className="mt-1 text-sm bg-muted/30 rounded p-3 whitespace-pre-wrap">{detailQuote.terms}</p>
              </div>

              {detailQuote.convertedSOId && (
                <div>
                  <span className="text-muted-foreground">Converted to SO</span>
                  <p className="font-mono text-xs font-semibold text-green-700">{store.salesOrders.find(s => s.id === detailQuote.convertedSOId)?.number ?? detailQuote.convertedSOId}</p>
                </div>
              )}

              {/* Action buttons in detail */}
              <div className="flex gap-2 pt-2 border-t">
                <Button size="sm" variant="outline" onClick={() => { setDetailQuote(null); setPreviewQuote(detailQuote); }}>
                  <Eye className="h-3.5 w-3.5 mr-1" /> Preview PDF
                </Button>
                {detailQuote.status === "Draft" && (
                  <Button size="sm" onClick={() => { sendQuotation(detailQuote); setDetailQuote({ ...detailQuote, status: "Sent" }); }}>
                    <Send className="h-3.5 w-3.5 mr-1" /> Send
                  </Button>
                )}
                {detailQuote.status === "Accepted" && !detailQuote.convertedSOId && (
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => { convertQuoteToSO(detailQuote); setDetailQuote(null); }}>
                    <ArrowRight className="h-3.5 w-3.5 mr-1" /> Convert to SO
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Quotation PDF Preview Dialog ── */}
      <Dialog open={!!previewQuote} onOpenChange={(o) => !o && setPreviewQuote(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Quotation Preview</DialogTitle></DialogHeader>
          {previewQuote && (
            <div className="border rounded-lg p-6 bg-white text-black space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">QUOTATION</h2>
                  <p className="text-sm text-gray-500 mt-1">{previewQuote.number}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold text-gray-900">Your Company Name</p>
                  <p className="text-gray-500">123 Business Street</p>
                  <p className="text-gray-500">Cairo, Egypt</p>
                </div>
              </div>

              <div className="border-t border-gray-200" />

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Bill To</p>
                  <p className="font-semibold">{customerName(previewQuote.customerId)}</p>
                </div>
                <div className="text-right">
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="text-gray-500">Date:</span><span>{previewQuote.date}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Valid Until:</span><span className="font-medium">{previewQuote.validUntil}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Status:</span><span><StatusBadge status={previewQuote.status} /></span></div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="text-left px-4 py-2 font-semibold text-gray-700">#</th>
                      <th className="text-left px-4 py-2 font-semibold text-gray-700">Description</th>
                      <th className="text-right px-4 py-2 font-semibold text-gray-700">Qty</th>
                      <th className="text-right px-4 py-2 font-semibold text-gray-700">Unit Price</th>
                      <th className="text-right px-4 py-2 font-semibold text-gray-700">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(previewQuote.items || []).map((it, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                        <td className="px-4 py-2">{it.description}</td>
                        <td className="px-4 py-2 text-right">{it.quantity}</td>
                        <td className="px-4 py-2 text-right">{egp(it.unitPrice)}</td>
                        <td className="px-4 py-2 text-right font-medium">{egp(it.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{egp(previewQuote.subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">VAT (14%)</span><span>{egp(previewQuote.tax)}</span></div>
                  <div className="flex justify-between border-t pt-1 mt-1 font-bold text-base"><span>Total</span><span>{egp(previewQuote.total)}</span></div>
                </div>
              </div>

              {/* Terms */}
              <div className="border-t pt-4">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Terms &amp; Conditions</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{previewQuote.terms}</p>
              </div>

              {/* Footer */}
              <div className="border-t pt-4 text-center text-xs text-gray-400">
                <p>This quotation is valid until {previewQuote.validUntil}. Prices are in Egyptian Pounds (EGP).</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
