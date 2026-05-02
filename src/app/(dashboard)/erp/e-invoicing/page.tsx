"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable } from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { useApiDataStore } from "@/lib/api/use-api-store";
import type { Invoice } from "@/lib/data-store";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Send,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  Download,
  Upload,
  Settings,
  BarChart3,
  FileCheck,
  RefreshCw,
  Shield,
  Hash,
  Building2,
  Receipt,
  ChevronRight,
  Copy,
  Trash2,
} from "lucide-react";

// ─── ETA Types ────────────────────────────────────────────────────────────────

/** ETA invoice status lifecycle: Draft -> Pending -> Submitted -> Accepted/Rejected */
type ETAStatus = "Draft" | "Pending" | "Submitted" | "Accepted" | "Rejected";

/** ETA invoice document types per Egyptian Tax Authority spec */
type ETADocumentType = "I" | "C" | "D"; // Invoice, Credit Note, Debit Note

interface ETAInvoice {
  id: string;
  invoiceNumber: string;       // Internal: ERP-YYYY-NNNNNN
  customerName: string;
  customerTaxId: string;
  date: string;
  netAmount: number;           // Before VAT
  vatRate: number;             // 0.14 standard, 0 for essential medicines
  vatAmount: number;
  totalAmount: number;         // Net + VAT
  etaStatus: ETAStatus;
  etaReference: string | null; // UUID from ETA after submission
  etaSubmissionId: string | null;
  documentType: ETADocumentType;
  sourceInvoiceId: string | null; // Link to ERP Invoice
  items: ETALineItem[];
  rejectionReason: string | null;
  submittedAt: string | null;
  acceptedAt: string | null;
}

interface ETALineItem {
  description: string;
  itemType: string;           // GS1 or EGS code
  itemCode: string;
  quantity: number;
  unitType: string;           // EA, KG, BOX, etc.
  unitPrice: number;
  netTotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  isExempt: boolean;          // Essential medicines VAT exempt
}

interface ETAConfig {
  companyTaxId: string;
  companyName: string;
  branchId: string;
  activityCode: string;
  environment: "production" | "preproduction";
  apiKey: string;
  certificateThumbprint: string;
  autoSubmit: boolean;
  lastSyncAt: string | null;
}

interface ETAErrorLog {
  id: string;
  invoiceNumber: string;
  timestamp: string;
  errorCode: string;
  errorMessage: string;
  severity: "error" | "warning";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VAT_STANDARD_RATE = 0.14;

/** Pharma products exempt from VAT per Egyptian tax law */
const EXEMPT_KEYWORDS = [
  "insulin", "cancer", "hepatitis", "dialysis", "blood plasma",
  "vaccines", "sera", "essential medicine",
];

const STATUS_COLORS: Record<ETAStatus, string> = {
  Draft: "bg-gray-100 text-gray-800",
  Pending: "bg-yellow-100 text-yellow-800",
  Submitted: "bg-blue-100 text-blue-800",
  Accepted: "bg-green-100 text-green-800",
  Rejected: "bg-red-100 text-red-800",
};

const DOC_TYPE_LABELS: Record<ETADocumentType, string> = {
  I: "Invoice",
  C: "Credit Note",
  D: "Debit Note",
};

// ─── Sample Data ──────────────────────────────────────────────────────────────

function generateSampleInvoices(): ETAInvoice[] {
  const customers = [
    { name: "El-Ezaby Pharmacy Chain", taxId: "514789632" },
    { name: "Seif Pharmacies", taxId: "623145789" },
    { name: "Cairo University Hospital", taxId: "312456978" },
    { name: "Ain Shams Medical Center", taxId: "789321456" },
    { name: "Nile Pharma Distributors", taxId: "456123789" },
    { name: "Alexandria General Hospital", taxId: "987654321" },
    { name: "Misr International Hospital", taxId: "147258369" },
    { name: "Al-Salam Pharmacy", taxId: "369258147" },
    { name: "Delta Medical Supplies", taxId: "258147369" },
    { name: "National Cancer Institute", taxId: "741852963" },
  ];

  const pharmaItems: ETALineItem[][] = [
    [
      { description: "Amoxicillin 500mg Capsules x100", itemType: "EGS", itemCode: "EG-PH-10042", quantity: 200, unitType: "EA", unitPrice: 45.00, netTotal: 9000.00, vatRate: VAT_STANDARD_RATE, vatAmount: 1260.00, totalAmount: 10260.00, isExempt: false },
      { description: "Omeprazole 20mg Capsules x30", itemType: "EGS", itemCode: "EG-PH-10078", quantity: 150, unitType: "EA", unitPrice: 62.50, netTotal: 9375.00, vatRate: VAT_STANDARD_RATE, vatAmount: 1312.50, totalAmount: 10687.50, isExempt: false },
    ],
    [
      { description: "Metformin 850mg Tablets x60", itemType: "EGS", itemCode: "EG-PH-10156", quantity: 300, unitType: "EA", unitPrice: 35.00, netTotal: 10500.00, vatRate: VAT_STANDARD_RATE, vatAmount: 1470.00, totalAmount: 11970.00, isExempt: false },
    ],
    [
      { description: "Insulin Glargine 100IU/mL", itemType: "EGS", itemCode: "EG-PH-20001", quantity: 50, unitType: "EA", unitPrice: 350.00, netTotal: 17500.00, vatRate: 0, vatAmount: 0, totalAmount: 17500.00, isExempt: true },
      { description: "Insulin Syringes 1mL x100", itemType: "EGS", itemCode: "EG-PH-20050", quantity: 20, unitType: "BOX", unitPrice: 180.00, netTotal: 3600.00, vatRate: VAT_STANDARD_RATE, vatAmount: 504.00, totalAmount: 4104.00, isExempt: false },
    ],
    [
      { description: "Atorvastatin 40mg Tablets x30", itemType: "EGS", itemCode: "EG-PH-10201", quantity: 400, unitType: "EA", unitPrice: 55.00, netTotal: 22000.00, vatRate: VAT_STANDARD_RATE, vatAmount: 3080.00, totalAmount: 25080.00, isExempt: false },
    ],
    [
      { description: "Paracetamol 500mg Tablets x100", itemType: "EGS", itemCode: "EG-PH-10003", quantity: 500, unitType: "EA", unitPrice: 18.00, netTotal: 9000.00, vatRate: VAT_STANDARD_RATE, vatAmount: 1260.00, totalAmount: 10260.00, isExempt: false },
      { description: "Ibuprofen 400mg Tablets x30", itemType: "EGS", itemCode: "EG-PH-10009", quantity: 300, unitType: "EA", unitPrice: 22.00, netTotal: 6600.00, vatRate: VAT_STANDARD_RATE, vatAmount: 924.00, totalAmount: 7524.00, isExempt: false },
    ],
    [
      { description: "Hepatitis B Vaccine (Adult)", itemType: "EGS", itemCode: "EG-PH-30001", quantity: 100, unitType: "EA", unitPrice: 275.00, netTotal: 27500.00, vatRate: 0, vatAmount: 0, totalAmount: 27500.00, isExempt: true },
    ],
    [
      { description: "Ciprofloxacin 500mg Tablets x14", itemType: "EGS", itemCode: "EG-PH-10088", quantity: 250, unitType: "EA", unitPrice: 42.00, netTotal: 10500.00, vatRate: VAT_STANDARD_RATE, vatAmount: 1470.00, totalAmount: 11970.00, isExempt: false },
    ],
    [
      { description: "Clopidogrel 75mg Tablets x30", itemType: "EGS", itemCode: "EG-PH-10310", quantity: 180, unitType: "EA", unitPrice: 85.00, netTotal: 15300.00, vatRate: VAT_STANDARD_RATE, vatAmount: 2142.00, totalAmount: 17442.00, isExempt: false },
    ],
    [
      { description: "Losartan 50mg Tablets x30", itemType: "EGS", itemCode: "EG-PH-10245", quantity: 220, unitType: "EA", unitPrice: 48.00, netTotal: 10560.00, vatRate: VAT_STANDARD_RATE, vatAmount: 1478.40, totalAmount: 12038.40, isExempt: false },
      { description: "Amlodipine 5mg Tablets x30", itemType: "EGS", itemCode: "EG-PH-10250", quantity: 350, unitType: "EA", unitPrice: 32.00, netTotal: 11200.00, vatRate: VAT_STANDARD_RATE, vatAmount: 1568.00, totalAmount: 12768.00, isExempt: false },
    ],
    [
      { description: "Cancer Chemotherapy Kit (5-FU)", itemType: "EGS", itemCode: "EG-PH-40001", quantity: 30, unitType: "EA", unitPrice: 1200.00, netTotal: 36000.00, vatRate: 0, vatAmount: 0, totalAmount: 36000.00, isExempt: true },
    ],
  ];

  const statuses: ETAStatus[] = ["Accepted", "Accepted", "Submitted", "Accepted", "Draft", "Accepted", "Rejected", "Pending", "Draft", "Submitted"];
  const dates = ["2026-03-15", "2026-03-18", "2026-03-22", "2026-04-01", "2026-04-10", "2026-04-12", "2026-04-15", "2026-04-18", "2026-04-25", "2026-04-28"];

  return customers.map((cust, i) => {
    const items = pharmaItems[i];
    const netAmount = items.reduce((s, it) => s + it.netTotal, 0);
    const vatAmount = items.reduce((s, it) => s + it.vatAmount, 0);
    const totalAmount = items.reduce((s, it) => s + it.totalAmount, 0);
    const status = statuses[i];
    const year = dates[i].substring(0, 4);
    const serial = String(i + 1).padStart(6, "0");

    return {
      id: `eta-${i + 1}`,
      invoiceNumber: `ERP-${year}-${serial}`,
      customerName: cust.name,
      customerTaxId: cust.taxId,
      date: dates[i],
      netAmount,
      vatRate: items.some((it) => it.isExempt) ? 0 : VAT_STANDARD_RATE,
      vatAmount,
      totalAmount,
      etaStatus: status,
      etaReference: status === "Accepted" || status === "Submitted" ? `ETA-${Date.now().toString(36).toUpperCase()}-${String(i).padStart(4, "0")}` : null,
      etaSubmissionId: status !== "Draft" ? `SUB-${year}-${serial}` : null,
      documentType: "I" as ETADocumentType,
      sourceInvoiceId: null,
      items,
      rejectionReason: status === "Rejected" ? "Invalid receiver tax registration number. Tax ID not found in ETA registry." : null,
      submittedAt: status !== "Draft" ? `${dates[i]}T10:30:00Z` : null,
      acceptedAt: status === "Accepted" ? `${dates[i]}T10:35:00Z` : null,
    };
  });
}

function generateErrorLogs(): ETAErrorLog[] {
  return [
    { id: "err-1", invoiceNumber: "ERP-2026-000007", timestamp: "2026-04-15T10:32:15Z", errorCode: "ETA-4001", errorMessage: "Invalid receiver tax registration number. Tax ID not found in ETA registry.", severity: "error" },
    { id: "err-2", invoiceNumber: "ERP-2026-000003", timestamp: "2026-03-22T14:18:42Z", errorCode: "ETA-2010", errorMessage: "Document total amount mismatch. Calculated total does not match declared total.", severity: "warning" },
    { id: "err-3", invoiceNumber: "ERP-2026-000005", timestamp: "2026-04-10T09:05:30Z", errorCode: "ETA-3005", errorMessage: "Missing required field: itemCode. All line items must have a valid GS1 or EGS item code.", severity: "error" },
    { id: "err-4", invoiceNumber: "ERP-2026-000008", timestamp: "2026-04-18T11:22:08Z", errorCode: "ETA-1002", errorMessage: "Certificate validation failed. The signing certificate has expired or is not recognized.", severity: "error" },
    { id: "err-5", invoiceNumber: "ERP-2026-000004", timestamp: "2026-04-01T16:45:00Z", errorCode: "ETA-2015", errorMessage: "VAT rate mismatch for item EG-PH-10201. Expected 14% for non-exempt pharmaceutical product.", severity: "warning" },
  ];
}

// ─── Formatting Helpers ───────────────────────────────────────────────────────

function fmtEGP(amount: number): string {
  return `EGP ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtTaxId(taxId: string): string {
  if (taxId.length === 9) {
    return `${taxId.slice(0, 3)}-${taxId.slice(3, 6)}-${taxId.slice(6)}`;
  }
  return taxId;
}

// ─── ETA JSON Document Builder (matches ETA API v1.0 schema) ──────────────────

function buildETADocument(invoice: ETAInvoice, config: ETAConfig) {
  return {
    issuer: {
      type: "B", // Business
      id: config.companyTaxId,
      name: config.companyName,
      branchID: config.branchId || "0",
      country: "EG",
      governate: "Cairo",
      regionCity: "Nasr City",
      street: "Abbas El-Akkad St.",
      buildingNumber: "12",
    },
    receiver: {
      type: "B",
      id: invoice.customerTaxId,
      name: invoice.customerName,
      country: "EG",
    },
    documentType: invoice.documentType,
    documentTypeVersion: "1.0",
    dateTimeIssued: `${invoice.date}T00:00:00Z`,
    taxpayerActivityCode: config.activityCode,
    internalID: invoice.invoiceNumber,
    invoiceLines: (invoice.items || []).map((item, idx) => ({
      description: item.description,
      itemType: item.itemType,
      itemCode: item.itemCode,
      unitType: item.unitType,
      quantity: item.quantity,
      internalCode: `LINE-${idx + 1}`,
      salesTotal: item.netTotal,
      total: item.totalAmount,
      valueDifference: 0,
      totalTaxableFees: 0,
      netTotal: item.netTotal,
      itemsDiscount: 0,
      unitValue: {
        currencySold: "EGP",
        amountEGP: item.unitPrice,
      },
      discount: {
        rate: 0,
        amount: 0,
      },
      taxableItems: [
        {
          taxType: "T1",
          amount: item.vatAmount,
          subType: item.isExempt ? "V003" : "V001",
          rate: item.isExempt ? 0 : 14,
        },
      ],
    })),
    totalDiscountAmount: 0,
    totalSalesAmount: invoice.netAmount,
    netAmount: invoice.netAmount,
    taxTotals: [
      {
        taxType: "T1",
        amount: invoice.vatAmount,
      },
    ],
    totalAmount: invoice.totalAmount,
    extraDiscountAmount: 0,
    totalItemsDiscountAmount: 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function EInvoicingPage() {
  const store = useApiDataStore();

  // ─── State ──────────────────────────────────────────────────────────────
  const [etaInvoices, setEtaInvoices] = useState<ETAInvoice[]>(() => generateSampleInvoices());
  const [errorLogs] = useState<ETAErrorLog[]>(() => generateErrorLogs());
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [submittingIds, setSubmittingIds] = useState<Set<string>>(new Set());
  const [previewInvoice, setPreviewInvoice] = useState<ETAInvoice | null>(null);
  const [detailInvoice, setDetailInvoice] = useState<ETAInvoice | null>(null);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [convertTaxId, setConvertTaxId] = useState("");
  const [selectedErpInvoice, setSelectedErpInvoice] = useState("");
  const [config, setConfig] = useState<ETAConfig>({
    companyTaxId: "514367892",
    companyName: "PharmaCorp Egypt S.A.E.",
    branchId: "0",
    activityCode: "4644",
    environment: "preproduction",
    apiKey: "",
    certificateThumbprint: "",
    autoSubmit: false,
    lastSyncAt: null,
  });
  const [configSaved, setConfigSaved] = useState(false);
  const configTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist config to localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("eta-einvoicing-config");
      if (saved) setConfig(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("eta-einvoicing-config", JSON.stringify(config));
    } catch { /* ignore */ }
  }, [config]);

  // ─── Computed Values ────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = etaInvoices.length;
    const draft = etaInvoices.filter((i) => i.etaStatus === "Draft").length;
    const pending = etaInvoices.filter((i) => i.etaStatus === "Pending").length;
    const submitted = etaInvoices.filter((i) => i.etaStatus === "Submitted").length;
    const accepted = etaInvoices.filter((i) => i.etaStatus === "Accepted").length;
    const rejected = etaInvoices.filter((i) => i.etaStatus === "Rejected").length;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const thisMonthInvoices = etaInvoices.filter((i) => i.date.startsWith(currentMonth.substring(0, 7)));
    const thisMonthVAT = thisMonthInvoices.reduce((s, i) => s + i.vatAmount, 0);
    const thisMonthTotal = thisMonthInvoices.reduce((s, i) => s + i.totalAmount, 0);

    return { total, draft, pending, submitted, accepted, rejected, thisMonthVAT, thisMonthTotal, pendingSubmission: draft + pending };
  }, [etaInvoices]);

  const queueInvoices = useMemo(
    () => etaInvoices.filter((i) => i.etaStatus === "Draft" || i.etaStatus === "Pending" || i.etaStatus === "Rejected"),
    [etaInvoices]
  );

  const submittedInvoices = useMemo(
    () => etaInvoices.filter((i) => i.etaStatus === "Submitted" || i.etaStatus === "Accepted"),
    [etaInvoices]
  );

  // Monthly VAT summary
  const monthlyVATSummary = useMemo(() => {
    const months: Record<string, { taxable: number; vatCollected: number; vatPaid: number }> = {};
    etaInvoices.forEach((inv) => {
      const month = inv.date.substring(0, 7);
      if (!months[month]) months[month] = { taxable: 0, vatCollected: 0, vatPaid: 0 };
      months[month].taxable += inv.netAmount;
      months[month].vatCollected += inv.vatAmount;
    });
    // Simulated VAT paid (purchases) - roughly 40% of collected for demo
    Object.keys(months).forEach((m) => {
      months[m].vatPaid = Math.round(months[m].vatCollected * 0.4 * 100) / 100;
    });
    return Object.entries(months)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, data]) => ({
        month,
        ...data,
        netPayable: Math.round((data.vatCollected - data.vatPaid) * 100) / 100,
      }));
  }, [etaInvoices]);

  // ERP invoices not yet converted to ETA invoices
  const unconvertedInvoices = useMemo(() => {
    const etaSourceIds = new Set(etaInvoices.map((e) => e.sourceInvoiceId).filter(Boolean));
    return (store.invoices || []).filter((inv: Invoice) => !etaSourceIds.has(inv.id));
  }, [store.invoices, etaInvoices]);

  // ─── Actions ────────────────────────────────────────────────────────────

  /** Simulate submitting a single invoice to ETA */
  const submitToETA = useCallback((invoiceId: string) => {
    setSubmittingIds((prev) => new Set(prev).add(invoiceId));

    // Step 1: Mark as Pending
    setEtaInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId ? { ...inv, etaStatus: "Pending" as ETAStatus } : inv
      )
    );

    // Step 2: After 1.5s, mark as Submitted with ETA reference
    setTimeout(() => {
      setEtaInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id !== invoiceId) return inv;
          const ref = `ETA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          return {
            ...inv,
            etaStatus: "Submitted" as ETAStatus,
            etaReference: ref,
            etaSubmissionId: `SUB-${inv.invoiceNumber.replace("ERP-", "")}`,
            submittedAt: new Date().toISOString(),
          };
        })
      );
      setSubmittingIds((prev) => {
        const next = new Set(prev);
        next.delete(invoiceId);
        return next;
      });
    }, 1500);
  }, []);

  /** Bulk submit selected invoices */
  const bulkSubmit = useCallback(() => {
    const eligible = Array.from(selectedInvoices).filter((id) => {
      const inv = etaInvoices.find((e) => e.id === id);
      return inv && (inv.etaStatus === "Draft" || inv.etaStatus === "Rejected");
    });
    eligible.forEach((id, index) => {
      setTimeout(() => submitToETA(id), index * 500);
    });
    setSelectedInvoices(new Set());
  }, [selectedInvoices, etaInvoices, submitToETA]);

  /** Convert an ERP invoice to an ETA e-invoice */
  const convertErpInvoice = useCallback(() => {
    if (!selectedErpInvoice) return;
    const erpInv = store.invoices?.find((inv: Invoice) => inv.id === selectedErpInvoice);
    if (!erpInv) return;

    const customer = store.customers?.find((c) => c.id === erpInv.customerId);
    const now = new Date();
    const serial = String(etaInvoices.length + 1).padStart(6, "0");
    const year = now.getFullYear();

    const items: ETALineItem[] = (erpInv.items || []).map((item) => {
      const isExempt = EXEMPT_KEYWORDS.some((kw) => item.description.toLowerCase().includes(kw));
      const net = item.total;
      const vatAmt = isExempt ? 0 : Math.round(net * VAT_STANDARD_RATE * 100) / 100;
      return {
        description: item.description,
        itemType: "EGS",
        itemCode: `EG-PH-${Math.floor(10000 + Math.random() * 90000)}`,
        quantity: item.quantity,
        unitType: "EA",
        unitPrice: item.unitPrice,
        netTotal: net,
        vatRate: isExempt ? 0 : VAT_STANDARD_RATE,
        vatAmount: vatAmt,
        totalAmount: net + vatAmt,
        isExempt,
      };
    });

    const netAmount = items.reduce((s, it) => s + it.netTotal, 0);
    const vatAmount = items.reduce((s, it) => s + it.vatAmount, 0);

    const newInvoice: ETAInvoice = {
      id: `eta-conv-${Date.now()}`,
      invoiceNumber: `ERP-${year}-${serial}`,
      customerName: customer?.name || "Unknown Customer",
      customerTaxId: convertTaxId || "000000000",
      date: erpInv.date || now.toISOString().split("T")[0],
      netAmount,
      vatRate: VAT_STANDARD_RATE,
      vatAmount,
      totalAmount: netAmount + vatAmount,
      etaStatus: "Draft",
      etaReference: null,
      etaSubmissionId: null,
      documentType: "I",
      sourceInvoiceId: erpInv.id,
      items,
      rejectionReason: null,
      submittedAt: null,
      acceptedAt: null,
    };

    setEtaInvoices((prev) => [newInvoice, ...prev]);
    setShowConvertDialog(false);
    setSelectedErpInvoice("");
    setConvertTaxId("");
  }, [selectedErpInvoice, convertTaxId, store.invoices, store.customers, etaInvoices.length]);

  /** Toggle selection of an invoice for bulk operations */
  const toggleSelect = useCallback((id: string) => {
    setSelectedInvoices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /** Select/deselect all queue invoices */
  const toggleSelectAll = useCallback(() => {
    const eligibleIds = queueInvoices
      .filter((i) => i.etaStatus === "Draft" || i.etaStatus === "Rejected")
      .map((i) => i.id);
    const allSelected = eligibleIds.every((id) => selectedInvoices.has(id));
    if (allSelected) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(eligibleIds));
    }
  }, [queueInvoices, selectedInvoices]);

  /** Save ETA configuration */
  const saveConfig = useCallback(() => {
    try {
      localStorage.setItem("eta-einvoicing-config", JSON.stringify(config));
    } catch { /* ignore */ }
    setConfigSaved(true);
    if (configTimerRef.current) clearTimeout(configTimerRef.current);
    configTimerRef.current = setTimeout(() => setConfigSaved(false), 3000);
  }, [config]);

  /** Delete a draft invoice */
  const deleteInvoice = useCallback((id: string) => {
    setEtaInvoices((prev) => prev.filter((inv) => inv.id !== id));
    setSelectedInvoices((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // ─── Table Columns ─────────────────────────────────────────────────────

  const queueColumns: Column<Record<string, unknown>>[] = useMemo(() => [
    {
      key: "_select",
      label: "",
      className: "w-10",
      render: (_v: unknown, row: Record<string, unknown>) => {
        const inv = row as unknown as ETAInvoice;
        if (inv.etaStatus !== "Draft" && inv.etaStatus !== "Rejected") return null;
        return (
          <input
            type="checkbox"
            checked={selectedInvoices.has(inv.id)}
            onChange={() => toggleSelect(inv.id)}
            className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
          />
        );
      },
    },
    {
      key: "invoiceNumber",
      label: "Invoice #",
      sortable: true,
      render: (v: unknown) => <span className="font-mono font-medium text-sm">{String(v)}</span>,
    },
    { key: "customerName", label: "Customer", sortable: true },
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (v: unknown) => <span className="text-sm">{fmtDate(String(v))}</span>,
    },
    {
      key: "netAmount",
      label: "Amount (EGP)",
      sortable: true,
      className: "text-right",
      render: (v: unknown) => <span className="font-medium tabular-nums">{fmtEGP(Number(v))}</span>,
    },
    {
      key: "vatAmount",
      label: "VAT (14%)",
      className: "text-right",
      render: (v: unknown, row: Record<string, unknown>) => {
        const inv = row as unknown as ETAInvoice;
        const hasExempt = inv.items.some((it) => it.isExempt);
        return (
          <span className="tabular-nums text-sm">
            {fmtEGP(Number(v))}
            {hasExempt && <span className="ml-1 text-xs text-green-600" title="Contains VAT-exempt items">*</span>}
          </span>
        );
      },
    },
    {
      key: "totalAmount",
      label: "Total",
      sortable: true,
      className: "text-right",
      render: (v: unknown) => <span className="font-semibold tabular-nums">{fmtEGP(Number(v))}</span>,
    },
    {
      key: "etaStatus",
      label: "ETA Status",
      render: (v: unknown) => {
        const status = String(v) as ETAStatus;
        return (
          <Badge className={`${STATUS_COLORS[status]} border-0 font-medium`}>
            {status}
          </Badge>
        );
      },
    },
    {
      key: "_actions",
      label: "",
      className: "text-right",
      render: (_v: unknown, row: Record<string, unknown>) => {
        const inv = row as unknown as ETAInvoice;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={() => setDetailInvoice(inv)} title="View details">
              <Eye className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPreviewInvoice(inv)} title="Preview ETA JSON">
              <FileText className="h-4 w-4" />
            </Button>
            {(inv.etaStatus === "Draft" || inv.etaStatus === "Rejected") && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => submitToETA(inv.id)}
                disabled={submittingIds.has(inv.id)}
                title="Submit to ETA"
              >
                {submittingIds.has(inv.id) ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                ) : (
                  <Send className="h-4 w-4 text-blue-600" />
                )}
              </Button>
            )}
            {inv.etaStatus === "Draft" && (
              <Button size="sm" variant="ghost" onClick={() => deleteInvoice(inv.id)} title="Delete draft">
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
        );
      },
    },
  ], [selectedInvoices, toggleSelect, submitToETA, submittingIds, deleteInvoice]);

  const submittedColumns: Column<Record<string, unknown>>[] = useMemo(() => [
    {
      key: "invoiceNumber",
      label: "Invoice #",
      sortable: true,
      render: (v: unknown) => <span className="font-mono font-medium text-sm">{String(v)}</span>,
    },
    { key: "customerName", label: "Customer", sortable: true },
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (v: unknown) => <span className="text-sm">{fmtDate(String(v))}</span>,
    },
    {
      key: "totalAmount",
      label: "Total (EGP)",
      sortable: true,
      className: "text-right",
      render: (v: unknown) => <span className="font-semibold tabular-nums">{fmtEGP(Number(v))}</span>,
    },
    {
      key: "vatAmount",
      label: "VAT",
      className: "text-right",
      render: (v: unknown) => <span className="tabular-nums text-sm">{fmtEGP(Number(v))}</span>,
    },
    {
      key: "etaStatus",
      label: "ETA Status",
      render: (v: unknown) => {
        const status = String(v) as ETAStatus;
        return (
          <Badge className={`${STATUS_COLORS[status]} border-0 font-medium`}>
            {status}
          </Badge>
        );
      },
    },
    {
      key: "etaReference",
      label: "ETA Reference",
      render: (v: unknown) =>
        v ? (
          <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{String(v)}</span>
        ) : (
          <span className="text-muted-foreground text-xs">Awaiting...</span>
        ),
    },
    {
      key: "submittedAt",
      label: "Submitted",
      render: (v: unknown) =>
        v ? <span className="text-sm text-muted-foreground">{fmtDate(String(v))}</span> : <span className="text-muted-foreground">--</span>,
    },
    {
      key: "_actions",
      label: "",
      className: "text-right",
      render: (_v: unknown, row: Record<string, unknown>) => {
        const inv = row as unknown as ETAInvoice;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={() => setDetailInvoice(inv)} title="View details">
              <Eye className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPreviewInvoice(inv)} title="Preview ETA JSON">
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ], []);

  // ─── Render ─────────────────────────────────────────────────────────────

  const eligibleForBulk = queueInvoices.filter((i) => i.etaStatus === "Draft" || i.etaStatus === "Rejected");
  const allEligibleSelected = eligibleForBulk.length > 0 && eligibleForBulk.every((i) => selectedInvoices.has(i.id));
  const someSelected = selectedInvoices.size > 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="E-Invoicing - Egyptian Tax Authority"
        description="Manage ETA-compliant electronic invoices. Submit, track, and reconcile e-invoices with the Egyptian Tax Authority portal."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowConvertDialog(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import from ERP
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="dashboard" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="queue" className="gap-1.5">
            <Clock className="h-4 w-4" />
            Invoice Queue
            {stats.pendingSubmission > 0 && (
              <Badge className="ml-1 bg-yellow-100 text-yellow-800 border-0 text-xs">{stats.pendingSubmission}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="submitted" className="gap-1.5">
            <CheckCircle className="h-4 w-4" />
            Submitted
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* ═══ DASHBOARD TAB ═══ */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatsCard
              icon={FileText}
              title="Total E-Invoices"
              value={stats.total}
              subtitle="All documents"
              iconColor="bg-primary/10 text-primary"
            />
            <StatsCard
              icon={Clock}
              title="Pending Submission"
              value={stats.pendingSubmission}
              subtitle="Draft + Pending"
              iconColor="bg-yellow-100 text-yellow-700"
            />
            <StatsCard
              icon={Send}
              title="Submitted to ETA"
              value={stats.submitted + stats.accepted}
              subtitle={`${stats.accepted} accepted`}
              iconColor="bg-blue-100 text-blue-700"
            />
            <StatsCard
              icon={XCircle}
              title="Rejected by ETA"
              value={stats.rejected}
              subtitle="Requires attention"
              iconColor="bg-red-100 text-red-700"
            />
            <StatsCard
              icon={Receipt}
              title="This Month's VAT"
              value={fmtEGP(stats.thisMonthVAT)}
              subtitle="VAT at 14% standard rate"
              iconColor="bg-green-100 text-green-700"
            />
          </div>

          {/* Monthly VAT Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5" />
                Monthly VAT Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Month</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Taxable Amount</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">VAT Collected (Output)</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">VAT Paid (Input)</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Net VAT Payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyVATSummary.map((row) => (
                      <tr key={row.month} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-medium">{row.month}</td>
                        <td className="py-3 px-4 text-right tabular-nums">{fmtEGP(row.taxable)}</td>
                        <td className="py-3 px-4 text-right tabular-nums text-blue-700">{fmtEGP(row.vatCollected)}</td>
                        <td className="py-3 px-4 text-right tabular-nums text-orange-600">{fmtEGP(row.vatPaid)}</td>
                        <td className="py-3 px-4 text-right tabular-nums font-semibold">{fmtEGP(row.netPayable)}</td>
                      </tr>
                    ))}
                    {monthlyVATSummary.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">No invoice data available.</td>
                      </tr>
                    )}
                  </tbody>
                  {monthlyVATSummary.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/20">
                        <td className="py-3 px-4 font-semibold">Total</td>
                        <td className="py-3 px-4 text-right tabular-nums font-semibold">{fmtEGP(monthlyVATSummary.reduce((s, r) => s + r.taxable, 0))}</td>
                        <td className="py-3 px-4 text-right tabular-nums font-semibold text-blue-700">{fmtEGP(monthlyVATSummary.reduce((s, r) => s + r.vatCollected, 0))}</td>
                        <td className="py-3 px-4 text-right tabular-nums font-semibold text-orange-600">{fmtEGP(monthlyVATSummary.reduce((s, r) => s + r.vatPaid, 0))}</td>
                        <td className="py-3 px-4 text-right tabular-nums font-bold">{fmtEGP(monthlyVATSummary.reduce((s, r) => s + r.netPayable, 0))}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>

          {/* ETA Error Log */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                ETA Error Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {errorLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      log.severity === "error"
                        ? "border-red-200 bg-red-50/50"
                        : "border-yellow-200 bg-yellow-50/50"
                    }`}
                  >
                    {log.severity === "error" ? (
                      <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-medium">{log.invoiceNumber}</span>
                        <Badge className={`border-0 text-xs ${log.severity === "error" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>
                          {log.errorCode}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{fmtDate(log.timestamp)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{log.errorMessage}</p>
                    </div>
                  </div>
                ))}
                {errorLogs.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p>No errors. All submissions are clean.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ INVOICE QUEUE TAB ═══ */}
        <TabsContent value="queue" className="space-y-4">
          {/* Bulk action bar */}
          {someSelected && (
            <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <span className="text-sm font-medium">{selectedInvoices.size} invoice(s) selected</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setSelectedInvoices(new Set())}>
                  Clear Selection
                </Button>
                <Button size="sm" onClick={bulkSubmit}>
                  <Send className="h-4 w-4 mr-1.5" />
                  Submit Selected to ETA
                </Button>
              </div>
            </div>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" />
                Invoice Queue
                <Badge className="ml-1 bg-gray-100 text-gray-800 border-0">{queueInvoices.length}</Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                {eligibleForBulk.length > 0 && (
                  <Button size="sm" variant="outline" onClick={toggleSelectAll}>
                    {allEligibleSelected ? "Deselect All" : "Select All"}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setShowConvertDialog(true)}>
                  <Upload className="h-4 w-4 mr-1.5" />
                  Import Invoice
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={queueColumns}
                data={queueInvoices as unknown as Record<string, unknown>[]}
                searchable
                searchKeys={["invoiceNumber", "customerName", "etaStatus"]}
                pagination
                emptyMessage="No invoices in queue. Import invoices from ERP or they will appear here when created."
              />
            </CardContent>
          </Card>

          {/* VAT Exemption Note */}
          <Card className="border-green-200 bg-green-50/30">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800">VAT Exemption Notice</p>
                  <p className="text-sm text-green-700 mt-1">
                    Essential medicines (insulin, cancer treatments, hepatitis medications, vaccines, sera, dialysis supplies, and blood plasma products) are VAT-exempt at 0% per Egyptian Tax Law.
                    Invoices marked with <span className="font-medium">*</span> in the VAT column contain exempt items.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ SUBMITTED TAB ═══ */}
        <TabsContent value="submitted" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileCheck className="h-5 w-5 text-green-600" />
                Submitted E-Invoices
                <Badge className="ml-1 bg-blue-100 text-blue-800 border-0">{submittedInvoices.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={submittedColumns}
                data={submittedInvoices as unknown as Record<string, unknown>[]}
                searchable
                searchKeys={["invoiceNumber", "customerName", "etaReference"]}
                pagination
                exportable
                exportFilename="eta-submitted-invoices.csv"
                emptyMessage="No submitted invoices yet. Submit invoices from the Invoice Queue tab."
              />
            </CardContent>
          </Card>

          {/* Submission Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Accepted</p>
                    <p className="text-2xl font-bold">{stats.accepted}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <Send className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Awaiting Acceptance</p>
                    <p className="text-2xl font-bold">{stats.submitted}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                    <Receipt className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total VAT Submitted</p>
                    <p className="text-2xl font-bold">{fmtEGP(submittedInvoices.reduce((s, i) => s + i.vatAmount, 0))}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══ SETTINGS TAB ═══ */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5" />
                ETA Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Company Information */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4">Company Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name (Arabic/English)</Label>
                    <Input
                      id="companyName"
                      value={config.companyName}
                      onChange={(e) => setConfig((prev) => ({ ...prev, companyName: e.target.value }))}
                      placeholder="Company legal name as registered with ETA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyTaxId">Company Tax ID (9 digits)</Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="companyTaxId"
                        value={config.companyTaxId}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 9);
                          setConfig((prev) => ({ ...prev, companyTaxId: val }));
                        }}
                        placeholder="123456789"
                        className="pl-9"
                        maxLength={9}
                      />
                    </div>
                    {config.companyTaxId && config.companyTaxId.length !== 9 && (
                      <p className="text-xs text-red-500">Tax ID must be exactly 9 digits</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branchId">Branch ID</Label>
                    <Input
                      id="branchId"
                      value={config.branchId}
                      onChange={(e) => setConfig((prev) => ({ ...prev, branchId: e.target.value }))}
                      placeholder="0 (main branch)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="activityCode">Taxpayer Activity Code</Label>
                    <Input
                      id="activityCode"
                      value={config.activityCode}
                      onChange={(e) => setConfig((prev) => ({ ...prev, activityCode: e.target.value }))}
                      placeholder="4644 (Pharma wholesale)"
                    />
                    <p className="text-xs text-muted-foreground">4644 = Wholesale of pharmaceutical products</p>
                  </div>
                </div>
              </div>

              {/* API Configuration */}
              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">ETA API Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="environment">ETA Environment</Label>
                    <Select
                      value={config.environment}
                      onValueChange={(val) => setConfig((prev) => ({ ...prev, environment: val as "production" | "preproduction" }))}
                    >
                      <SelectTrigger id="environment">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="preproduction">Pre-Production (Testing)</SelectItem>
                        <SelectItem value="production">Production (Live)</SelectItem>
                      </SelectContent>
                    </Select>
                    {config.environment === "production" && (
                      <p className="text-xs text-red-500 font-medium">Warning: Production mode submits real invoices to ETA</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key / Client Secret</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={config.apiKey}
                      onChange={(e) => setConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="Enter your ETA API key"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="certificate">Token Signing Certificate Thumbprint</Label>
                    <Input
                      id="certificate"
                      value={config.certificateThumbprint}
                      onChange={(e) => setConfig((prev) => ({ ...prev, certificateThumbprint: e.target.value }))}
                      placeholder="SHA-256 thumbprint of the signing certificate"
                    />
                    <p className="text-xs text-muted-foreground">
                      The USB token certificate issued by Egypt Trust or MCIT for signing e-invoices.
                    </p>
                  </div>
                </div>
              </div>

              {/* Auto-submit & Actions */}
              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Automation</h3>
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">Auto-submit to ETA</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Automatically submit invoices to ETA when they are finalized in the ERP. Only applies to invoices with complete tax data.
                    </p>
                  </div>
                  <Switch
                    checked={config.autoSubmit}
                    onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, autoSubmit: checked }))}
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={saveConfig}>
                  <Settings className="h-4 w-4 mr-2" />
                  Save Configuration
                </Button>
                {configSaved && (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Configuration saved successfully
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ETA Environment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5" />
                ETA Integration Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Environment</span>
                    <Badge className={`border-0 ${config.environment === "production" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}>
                      {config.environment === "production" ? "Production" : "Pre-Production"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">API Endpoint</span>
                    <span className="font-mono text-xs">
                      {config.environment === "production"
                        ? "api.invoicing.eta.gov.eg"
                        : "preprod.invoicing.eta.gov.eg"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Document Version</span>
                    <span className="font-mono text-xs">1.0</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tax ID Format</span>
                    <span className="font-mono text-xs">9 digits (no dashes)</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Standard VAT Rate</span>
                    <span className="font-medium">14%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Currency</span>
                    <span className="font-medium">EGP (Egyptian Pound)</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Serial Format</span>
                    <span className="font-mono text-xs">ERP-YYYY-NNNNNN</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Document Types</span>
                    <span className="text-xs">I (Invoice), C (Credit), D (Debit)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══ CONVERT ERP INVOICE DIALOG ═══ */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import ERP Invoice to E-Invoicing
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Select ERP Invoice</Label>
              <Select value={selectedErpInvoice} onValueChange={setSelectedErpInvoice}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an invoice..." />
                </SelectTrigger>
                <SelectContent>
                  {unconvertedInvoices.length === 0 && (
                    <SelectItem value="_none" disabled>No unconverted invoices</SelectItem>
                  )}
                  {unconvertedInvoices.map((inv: Invoice) => {
                    const customer = store.customers?.find((c) => c.id === inv.customerId);
                    return (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.number} - {customer?.name || "Unknown"} ({fmtEGP(inv.total)})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Receiver Tax ID (9 digits)</Label>
              <Input
                value={convertTaxId}
                onChange={(e) => setConvertTaxId(e.target.value.replace(/\D/g, "").slice(0, 9))}
                placeholder="Enter customer tax registration number"
                maxLength={9}
              />
              {convertTaxId && convertTaxId.length !== 9 && (
                <p className="text-xs text-red-500">Tax ID must be exactly 9 digits</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowConvertDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={convertErpInvoice}
                disabled={!selectedErpInvoice || (convertTaxId.length > 0 && convertTaxId.length !== 9)}
              >
                <ChevronRight className="h-4 w-4 mr-1.5" />
                Convert to E-Invoice
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ INVOICE DETAIL DIALOG ═══ */}
      <Dialog open={!!detailInvoice} onOpenChange={() => setDetailInvoice(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              E-Invoice Details: {detailInvoice?.invoiceNumber}
            </DialogTitle>
          </DialogHeader>
          {detailInvoice && (
            <div className="space-y-5 pt-2">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{detailInvoice.customerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tax ID</p>
                  <p className="font-mono">{fmtTaxId(detailInvoice.customerTaxId)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p>{fmtDate(detailInvoice.date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Document Type</p>
                  <p>{DOC_TYPE_LABELS[detailInvoice.documentType]}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">ETA Status</p>
                  <Badge className={`${STATUS_COLORS[detailInvoice.etaStatus]} border-0`}>{detailInvoice.etaStatus}</Badge>
                </div>
                {detailInvoice.etaReference && (
                  <div>
                    <p className="text-muted-foreground">ETA Reference</p>
                    <p className="font-mono text-xs">{detailInvoice.etaReference}</p>
                  </div>
                )}
              </div>

              {/* Rejection Reason */}
              {detailInvoice.rejectionReason && (
                <div className="p-3 rounded-lg border border-red-200 bg-red-50/50">
                  <div className="flex items-start gap-2">
                    <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Rejection Reason</p>
                      <p className="text-sm text-red-700 mt-1">{detailInvoice.rejectionReason}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Line Items */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Line Items</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Description</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Qty</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Unit Price</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">VAT</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detailInvoice.items || []).map((item, idx) => (
                        <tr key={idx} className="border-b border-border/50">
                          <td className="py-2 px-3">
                            {item.description}
                            {item.isExempt && (
                              <Badge className="ml-2 bg-green-100 text-green-800 border-0 text-xs">VAT Exempt</Badge>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums">{item.quantity} {item.unitType}</td>
                          <td className="py-2 px-3 text-right tabular-nums">{fmtEGP(item.unitPrice)}</td>
                          <td className="py-2 px-3 text-right tabular-nums">{item.isExempt ? "0%" : "14%"}</td>
                          <td className="py-2 px-3 text-right tabular-nums font-medium">{fmtEGP(item.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border">
                        <td colSpan={3}></td>
                        <td className="py-2 px-3 text-right text-muted-foreground">Subtotal</td>
                        <td className="py-2 px-3 text-right tabular-nums">{fmtEGP(detailInvoice.netAmount)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3}></td>
                        <td className="py-2 px-3 text-right text-muted-foreground">VAT</td>
                        <td className="py-2 px-3 text-right tabular-nums">{fmtEGP(detailInvoice.vatAmount)}</td>
                      </tr>
                      <tr className="font-semibold">
                        <td colSpan={3}></td>
                        <td className="py-2 px-3 text-right">Total</td>
                        <td className="py-2 px-3 text-right tabular-nums">{fmtEGP(detailInvoice.totalAmount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setPreviewInvoice(detailInvoice)}>
                  <FileText className="h-4 w-4 mr-1.5" />
                  View ETA JSON
                </Button>
                {(detailInvoice.etaStatus === "Draft" || detailInvoice.etaStatus === "Rejected") && (
                  <Button onClick={() => { submitToETA(detailInvoice.id); setDetailInvoice(null); }}>
                    <Send className="h-4 w-4 mr-1.5" />
                    Submit to ETA
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ ETA JSON PREVIEW DIALOG ═══ */}
      <Dialog open={!!previewInvoice} onOpenChange={() => setPreviewInvoice(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              ETA Document Preview: {previewInvoice?.invoiceNumber}
            </DialogTitle>
          </DialogHeader>
          {previewInvoice && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  JSON document format matching ETA API v1.0 specification
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const json = JSON.stringify(buildETADocument(previewInvoice, config), null, 2);
                    navigator.clipboard.writeText(json).catch(() => {});
                  }}
                >
                  <Copy className="h-4 w-4 mr-1.5" />
                  Copy JSON
                </Button>
              </div>
              <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs font-mono max-h-[60vh] border">
                {JSON.stringify(buildETADocument(previewInvoice, config), null, 2)}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
