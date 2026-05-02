"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import {
  EntityFormModal,
  type EntityField,
  type EntityFormData,
} from "@/components/shared/entity-form-modal";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { useApiDataStore } from "@/lib/api/use-api-store";
import {
  type Customer,
  type CustomerDocument,
  type Vendor,
  type Cheque,
  type Invoice,
  type BankAccount,
  type GLAccount,
  type JournalEntry,
  type CostCenter,
  type Budget,
  type SalesOrder,
} from "@/lib/data-store";
import { useApprovals } from "@/lib/approval-workflow";
import { openInvoicePDF } from "@/lib/invoice-pdf";
import {
  Users,
  Building2,
  FileText,
  CreditCard,
  Plus,
  Download,
  Landmark,
  ScrollText,
  BookOpen,
  Calculator,
  BarChart3,
  Target,
  PieChart,
  ShoppingBag,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Upload,
  Trash2,
  Eye,
  Paperclip,
  FileCheck,
  Send,
  Clock,
  Settings,
  Hash,
  Monitor,
  Wrench,
  DollarSign,
} from "lucide-react";
import { downloadCSV, downloadHTML, buildPrintableReport } from "@/lib/download";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n/i18n-context";
import { PartnerLink } from "@/components/shared/partner-link";
import { useNotificationCenter } from "@/lib/notification-context";
import { useAuditLogger } from "@/lib/audit-logger";

// ─── E-Invoicing types & data ─────────────────────────────────────────
interface EInvoice {
  id: string
  internalId: string
  receiverName: string
  receiverTaxId: string
  dateIssued: string
  totalAmount: number
  vatAmount: number
  netAmount: number
  status: "draft" | "submitted" | "accepted" | "rejected" | "cancelled"
  uuid?: string
  submissionId?: string
  items: { description: string; quantity: number; unitPrice: number; total: number }[]
}

const TAX_CODES = [
  { code: "T1", name: "Value Added Tax", subtype: "V001", rate: 14, description: "Standard VAT rate" },
  { code: "T2", name: "Table Tax (Fixed)", subtype: "Tbl01", rate: 0, description: "Fixed amount per unit" },
  { code: "T3", name: "Table Tax (%)", subtype: "Tbl02", rate: 0, description: "Percentage table tax" },
  { code: "T4", name: "Withholding Tax", subtype: "W001", rate: 1, description: "WHT on services" },
  { code: "T5", name: "Stamp Tax", subtype: "ST01", rate: 0.5, description: "Stamp duty" },
  { code: "T6", name: "Entertainment Tax", subtype: "Ent01", rate: 0, description: "Entertainment services" },
  { code: "T7", name: "Resource Development", subtype: "RD01", rate: 0, description: "Resource dev fee" },
  { code: "T8", name: "Municipal Service", subtype: "Mn01", rate: 0, description: "Local municipality" },
  { code: "T9", name: "Medical Insurance", subtype: "MI01", rate: 0, description: "Health insurance levy" },
]

const sampleEInvoices: EInvoice[] = [
  { id: "1", internalId: "INV-2024-089", receiverName: "Acme Pharma Corp", receiverTaxId: "123-456-789", dateIssued: "2024-03-25", totalAmount: 51300, vatAmount: 6300, netAmount: 45000, status: "accepted", uuid: "ETA-UUID-001", submissionId: "SUB-001",
    items: [{ description: "Amoxicillin 500mg x100", quantity: 50, unitPrice: 500, total: 25000 }, { description: "Omeprazole 20mg x50", quantity: 40, unitPrice: 500, total: 20000 }]},
  { id: "2", internalId: "INV-2024-090", receiverName: "Delta Medical Supplies", receiverTaxId: "987-654-321", dateIssued: "2024-03-26", totalAmount: 22800, vatAmount: 2800, netAmount: 20000, status: "submitted", uuid: "ETA-UUID-002", submissionId: "SUB-002",
    items: [{ description: "Paracetamol 500mg x200", quantity: 100, unitPrice: 200, total: 20000 }]},
  { id: "3", internalId: "INV-2024-091", receiverName: "Nile Health Group", receiverTaxId: "456-789-123", dateIssued: "2024-03-27", totalAmount: 11400, vatAmount: 1400, netAmount: 10000, status: "rejected", uuid: "ETA-UUID-003",
    items: [{ description: "Metformin 850mg x100", quantity: 20, unitPrice: 500, total: 10000 }]},
  { id: "4", internalId: "INV-2024-092", receiverName: "Cairo Pharma Dist.", receiverTaxId: "789-123-456", dateIssued: "2024-03-28", totalAmount: 0, vatAmount: 0, netAmount: 0, status: "draft",
    items: []},
]

const einvoiceStatusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-yellow-100 text-yellow-800",
}

// ─── Assets types & data ──────────────────────────────────────────────
const assetFields: EntityField[] = [
  { name: "name", label: "Asset Name", type: "text", required: true },
  { name: "category", label: "Category", type: "select", options: [
    { label: "Laptop", value: "Laptop" }, { label: "Monitor", value: "Monitor" },
    { label: "Printer", value: "Printer" }, { label: "Network", value: "Network" },
    { label: "Furniture", value: "Furniture" }, { label: "Other", value: "Other" },
  ]},
  { name: "purchasePrice", label: "Purchase Price", type: "number", required: true },
  { name: "location", label: "Location", type: "text" },
  { name: "assignedTo", label: "Assigned To", type: "text" },
];

const assetStatusColor: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800", MAINTENANCE: "bg-yellow-100 text-yellow-800",
  RETIRED: "bg-gray-100 text-gray-800", DISPOSED: "bg-red-100 text-red-800",
  SCHEDULED: "bg-blue-100 text-blue-800", IN_PROGRESS: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800", CANCELLED: "bg-red-100 text-red-800",
}

const initialAssets = [
  { id: "1", name: "MacBook Pro 16\"", assetTag: "AST-001", category: "Laptop", status: "ACTIVE", purchaseDate: "2023-06-15", purchasePrice: 2499, currentValue: 1999, location: "Office A", assignedTo: "John Smith", warrantyExpiry: "2026-06-15" },
  { id: "2", name: "Dell Monitor 27\"", assetTag: "AST-002", category: "Monitor", status: "ACTIVE", purchaseDate: "2023-03-10", purchasePrice: 450, currentValue: 350, location: "Office A", assignedTo: "Sarah Johnson", warrantyExpiry: "2026-03-10" },
  { id: "3", name: "HP LaserJet Pro", assetTag: "AST-003", category: "Printer", status: "MAINTENANCE", purchaseDate: "2022-01-20", purchasePrice: 800, currentValue: 400, location: "Floor 2", assignedTo: "Shared", warrantyExpiry: "2025-01-20" },
  { id: "4", name: "Cisco Router 4000", assetTag: "AST-004", category: "Network", status: "ACTIVE", purchaseDate: "2023-09-05", purchasePrice: 1200, currentValue: 1000, location: "Server Room", assignedTo: "IT Dept", warrantyExpiry: "2026-09-05" },
  { id: "5", name: "Standing Desk", assetTag: "AST-005", category: "Furniture", status: "ACTIVE", purchaseDate: "2023-11-01", purchasePrice: 650, currentValue: 550, location: "Office B", assignedTo: "Michael Chen", warrantyExpiry: "2028-11-01" },
  { id: "6", name: "ThinkPad T14", assetTag: "AST-006", category: "Laptop", status: "RETIRED", purchaseDate: "2020-04-15", purchasePrice: 1800, currentValue: 200, location: "Storage", assignedTo: "Unassigned", warrantyExpiry: "2023-04-15" },
]

const assetMaintenanceRecords = [
  { id: "1", asset: "HP LaserJet Pro", type: "CORRECTIVE", description: "Paper jam fix and roller replacement", scheduledDate: "2024-03-25", completedDate: null as string | null, cost: 150, status: "SCHEDULED" },
  { id: "2", asset: "Cisco Router 4000", type: "PREVENTIVE", description: "Firmware update and config backup", scheduledDate: "2024-04-01", completedDate: null as string | null, cost: 0, status: "SCHEDULED" },
  { id: "3", asset: "MacBook Pro 16\"", type: "PREVENTIVE", description: "Battery health check", scheduledDate: "2024-02-15", completedDate: "2024-02-15", cost: 0, status: "COMPLETED" },
  { id: "4", asset: "Dell Monitor 27\"", type: "CORRECTIVE", description: "Dead pixel inspection", scheduledDate: "2024-01-20", completedDate: "2024-01-22", cost: 0, status: "COMPLETED" },
]

export default function AccountingPage() {
  const store = useApiDataStore();
  const approvals = useApprovals();
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

  const [custSearch, setCustSearch] = useState("");
  const [custFilters, setCustFilters] = useState<FilterState>({});
  const [vendSearch, setVendSearch] = useState("");
  const [chequeSearch, setChequeSearch] = useState("");
  const [chequeFilters, setChequeFilters] = useState<FilterState>({});
  const [invSearch, setInvSearch] = useState("");

  const [custFormOpen, setCustFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [vendFormOpen, setVendFormOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [chequeFormOpen, setChequeFormOpen] = useState(false);
  const [editingCheque, setEditingCheque] = useState<Cheque | null>(null);
  const [invFormOpen, setInvFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [bankFormOpen, setBankFormOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [statementParty, setStatementParty] = useState<{ type: "customer" | "vendor"; id: string } | null>(null);

  // Customer documents state
  const [custDocDialogOpen, setCustDocDialogOpen] = useState(false);
  const [docCustomerId, setDocCustomerId] = useState<string | null>(null);
  const [docType, setDocType] = useState("Registration Certificate");
  const custDocInputRef = useRef<HTMLInputElement>(null);

  // GL state
  const [glSearch, setGlSearch] = useState("");
  const [glFilters, setGlFilters] = useState<FilterState>({});
  const [glFormOpen, setGlFormOpen] = useState(false);
  const [editingGL, setEditingGL] = useState<GLAccount | null>(null);

  // E-Invoicing state
  const [einvoices, setEinvoices] = useState<EInvoice[]>(sampleEInvoices);
  const [einvSubTab, setEinvSubTab] = useState<"invoices" | "submit" | "settings" | "taxcodes">("invoices");
  const [viewEInvoice, setViewEInvoice] = useState<EInvoice | null>(null);
  const [etaConfig, setEtaConfig] = useState({ clientId: "", clientSecret: "", environment: "sandbox", taxId: "", companyName: "Enterprise Suite LLC", activityCode: "4644" });
  const [einvSubmitForm, setEinvSubmitForm] = useState({ selectedInvoiceId: "", receiverTaxId: "" });

  // Assets state
  const [assets, setAssets] = useState(initialAssets);
  const [assetEditing, setAssetEditing] = useState<typeof initialAssets[0] | null>(null);
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [assetFilters, setAssetFilters] = useState<FilterState>({ _search: "", status: "" });
  const [assetDetailItem, setAssetDetailItem] = useState<typeof initialAssets[0] | null>(null);
  const [assetSubTab, setAssetSubTab] = useState("registry");

  // Journal Entry state
  const [jeSearch, setJeSearch] = useState("");
  const [jeFilters, setJeFilters] = useState<FilterState>({});
  const [jeFormOpen, setJeFormOpen] = useState(false);
  const [editingJE, setEditingJE] = useState<JournalEntry | null>(null);
  const [jeDetailId, setJeDetailId] = useState<string | null>(null);
  const [jeNewLine, setJeNewLine] = useState({ accountId: "", description: "", debit: 0, credit: 0, costCenterId: "" });

  // Cost Accounting state
  const [costTab, setCostTab] = useState<"centers" | "budgets" | "allocation" | "variance" | "product-costing">("centers");
  const [ccFormOpen, setCcFormOpen] = useState(false);
  const [editingCC, setEditingCC] = useState<CostCenter | null>(null);
  const [budgetFormOpen, setBudgetFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  /* ─── On-mount: overdue invoice alerts ─── */
  const mountCheckedRef = useRef(false);
  useEffect(() => {
    if (mountCheckedRef.current) return;
    mountCheckedRef.current = true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    store.invoices.forEach((inv) => {
      if (inv.status === "SENT" && inv.dueDate) {
        const due = new Date(inv.dueDate);
        due.setHours(0, 0, 0, 0);
        if (due < today) {
          const daysOverdue = Math.ceil((today.getTime() - due.getTime()) / 86400000);
          const customer = store.customers.find((c) => c.id === inv.customerId);
          addNotification({
            type: "WARNING",
            title: `Invoice ${inv.number} is overdue`,
            message: `Invoice for ${customer?.name ?? "Unknown"} (EGP ${(inv.total ?? 0).toLocaleString()}) was due on ${inv.dueDate}. Currently ${daysOverdue} day(s) overdue.`,
            module: "INVOICE",
            entityType: "invoice",
            entityId: inv.id,
            actionUrl: "/erp/accounting",
          });
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── E-Invoicing helpers ────────────────────────────────────────────
  useEffect(() => {
    try { const saved = localStorage.getItem("eta-config"); if (saved) setEtaConfig(JSON.parse(saved)) } catch {}
    try { const saved = localStorage.getItem("einvoices"); if (saved) setEinvoices(JSON.parse(saved)) } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("einvoices", JSON.stringify(einvoices)) } catch {}
  }, [einvoices]);

  function submitToETA(inv: EInvoice) {
    setEinvoices(prev => prev.map(ei => ei.id === inv.id ? { ...ei, status: "submitted" as const, uuid: "ETA-" + Date.now().toString(36), submissionId: "SUB-" + Date.now().toString(36) } : ei));
  }

  function convertInvoiceToEInvoice(invoiceId: string) {
    const invoice = store.invoices?.find((inv) => inv.id === invoiceId);
    if (!invoice) return;
    const inv = invoice as unknown as Record<string, unknown>;
    const newEInv: EInvoice = {
      id: Date.now().toString(36),
      internalId: String(inv.invoiceNumber || invoice.id),
      receiverName: String(inv.customerName || "—"),
      receiverTaxId: einvSubmitForm.receiverTaxId || "000-000-000",
      dateIssued: String(inv.date || new Date().toISOString().split("T")[0]),
      totalAmount: Number(inv.total) || 0,
      vatAmount: (Number(inv.total) || 0) * 0.14,
      netAmount: Number(inv.total) || 0,
      status: "draft",
      items: [{ description: "Items from " + String(inv.invoiceNumber || "invoice"), quantity: 1, unitPrice: Number(inv.total) || 0, total: Number(inv.total) || 0 }],
    };
    setEinvoices(prev => [newEInv, ...prev]);
    setEinvSubmitForm({ selectedInvoiceId: "", receiverTaxId: "" });
    setEinvSubTab("invoices");
  }

  function saveETAConfig() {
    try { localStorage.setItem("eta-config", JSON.stringify(etaConfig)) } catch {}
  }

  const einvAccepted = einvoices.filter(e => e.status === "accepted").length;
  const einvSubmitted = einvoices.filter(e => e.status === "submitted").length;
  const einvRejected = einvoices.filter(e => e.status === "rejected").length;
  const einvDraft = einvoices.filter(e => e.status === "draft").length;

  const einvoiceColumns: Column<Record<string, unknown>>[] = [
    { key: "internalId", label: "Invoice #", render: (v) => <span className="font-mono font-medium text-sm">{String(v)}</span> },
    { key: "receiverName", label: "Receiver" },
    { key: "receiverTaxId", label: "Tax ID", render: (v) => <span className="font-mono text-xs">{String(v)}</span> },
    { key: "dateIssued", label: "Date" },
    { key: "totalAmount", label: "Total (EGP)", render: (v) => <span className="font-medium">{Number(v || 0).toLocaleString()}</span> },
    { key: "status", label: "Status", render: (v) => <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${einvoiceStatusColors[String(v)] || ""}`}>{String(v)}</span> },
    { key: "uuid", label: "ETA UUID", render: (v) => v ? <span className="font-mono text-xs">{String(v)}</span> : <span className="text-muted-foreground text-xs">—</span> },
    { key: "actions", label: "", render: (_v, row) => {
      const inv = row as unknown as EInvoice;
      return (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setViewEInvoice(inv)}><Eye className="h-4 w-4" /></Button>
          {inv.status === "draft" && <Button size="sm" variant="ghost" onClick={() => submitToETA(inv)}><Send className="h-4 w-4 text-blue-600" /></Button>}
        </div>
      );
    }},
  ];

  // ─── Assets helpers ────────────────────────────────────────────────
  const assetFmt = (n: number) => `EGP ${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const assetTotalValue = assets.reduce((s, a) => s + a.currentValue, 0);

  const filteredAssets = assets.filter((a) => {
    if (assetFilters.status && a.status !== assetFilters.status) return false;
    if (assetFilters._search) {
      const q = assetFilters._search.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.assetTag.toLowerCase().includes(q) || a.category.toLowerCase().includes(q);
    }
    return true;
  });

  // ─── Computed ──────────────────────────────────────────────────────────
  const totalAR = store.customers.reduce((s, c) => s + c.outstanding, 0);
  const totalAP = store.vendors.reduce((s, v) => s + v.outstanding, 0);
  const pendingCheques = store.cheques.filter((c) => c.status === "PENDING").length;
  const invoiceTotal = store.invoices.reduce((s, i) => s + i.total, 0);
  const totalBankBalance = store.bankAccounts.reduce((s, b) => s + b.balance, 0);

  // Filters
  const filteredCustomers = useMemo(() => {
    return store.customers.filter((c) => {
      if (custSearch) {
        const q = custSearch.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.code.toLowerCase().includes(q)) return false;
      }
      if (custFilters.status && c.status !== custFilters.status) return false;
      if (custFilters.type && c.type !== custFilters.type) return false;
      return true;
    });
  }, [store.customers, custSearch, custFilters]);

  const filteredVendors = useMemo(() => {
    return store.vendors.filter((v) => {
      if (vendSearch) {
        const q = vendSearch.toLowerCase();
        if (!v.name.toLowerCase().includes(q) && !v.code.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [store.vendors, vendSearch]);

  const filteredCheques = useMemo(() => {
    return store.cheques.filter((c) => {
      if (chequeSearch) {
        const q = chequeSearch.toLowerCase();
        if (!c.partyName.toLowerCase().includes(q) && !c.number.toLowerCase().includes(q)) return false;
      }
      if (chequeFilters.type && c.type !== chequeFilters.type) return false;
      if (chequeFilters.status && c.status !== chequeFilters.status) return false;
      return true;
    });
  }, [store.cheques, chequeSearch, chequeFilters]);

  const filteredInvoices = useMemo(() => {
    return store.invoices.filter((i) => {
      if (invSearch) {
        const q = invSearch.toLowerCase();
        const cust = store.customers.find((c) => c.id === i.customerId);
        if (!i.number.toLowerCase().includes(q) && !(cust?.name.toLowerCase().includes(q) ?? false)) return false;
      }
      return true;
    });
  }, [store.invoices, invSearch, store.customers]);

  // GL computed
  const activeGLAccounts = store.glAccounts.filter((a) => a.isActive);
  const glByType = (type: GLAccount["type"]) => activeGLAccounts.filter((a) => a.type === type).reduce((s, a) => s + a.balance, 0);
  const totalAssets = glByType("ASSET");
  const totalLiabilities = glByType("LIABILITY");
  const totalEquity = glByType("EQUITY");
  const totalRevenue = glByType("REVENUE");
  const totalExpenses = glByType("EXPENSE");
  const postedJEs = store.journalEntries.filter((j) => j.status === "POSTED").length;

  const filteredGL = useMemo(() => {
    return store.glAccounts.filter((a) => {
      if (glSearch) {
        const q = glSearch.toLowerCase();
        if (!a.name.toLowerCase().includes(q) && !a.code.toLowerCase().includes(q)) return false;
      }
      if (glFilters.type && a.type !== glFilters.type) return false;
      return true;
    });
  }, [store.glAccounts, glSearch, glFilters]);

  const filteredJE = useMemo(() => {
    return store.journalEntries.filter((j) => {
      if (jeSearch) {
        const q = jeSearch.toLowerCase();
        if (!j.number.toLowerCase().includes(q) && !j.description.toLowerCase().includes(q) && !(j.reference?.toLowerCase().includes(q) ?? false)) return false;
      }
      if (jeFilters.type && j.type !== jeFilters.type) return false;
      if (jeFilters.status && j.status !== jeFilters.status) return false;
      return true;
    });
  }, [store.journalEntries, jeSearch, jeFilters]);

  const jeDetail = jeDetailId ? store.journalEntries.find((j) => j.id === jeDetailId) : null;
  const glName = (id: string) => store.glAccounts.find((a) => a.id === id)?.name ?? id;
  const ccName = (id: string) => store.costCenters.find((c) => c.id === id)?.name ?? id;

  // Cost center allocations from journal entries
  const ccAllocations = useMemo(() => {
    const map: Record<string, number> = {};
    store.journalEntries.filter((j) => j.status === "POSTED").forEach((j) => {
      (j.lines || []).forEach((l) => {
        if (l.costCenterId) {
          map[l.costCenterId] = (map[l.costCenterId] ?? 0) + l.debit;
        }
      });
    });
    return map;
  }, [store.journalEntries]);
  const totalAllocated = Object.values(ccAllocations).reduce((s, v) => s + v, 0);

  // ─── Customer CRUD ─────────────────────────────────────────────────────
  const customerFields: EntityField[] = [
    { name: "code", label: "Code", type: "text", placeholder: "Auto-generated if empty", helperText: "Leave blank for auto-generated code" },
    { name: "name", label: "Name", type: "text", required: true },
    { name: "type", label: "Type", type: "select", required: true, options: ["Pharmacy Chain", "Hospital", "Distributor", "Government"].map((t) => ({ label: t, value: t })) },
    { name: "phone", label: "Phone", type: "tel", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "address", label: "Address", type: "text", required: true },
    { name: "city", label: "City", type: "text" },
    { name: "creditLimit", label: "Credit Limit (EGP)", type: "number", required: true },
    { name: "outstanding", label: "Outstanding (EGP)", type: "number", defaultValue: 0 },
    { name: "currency", label: "Currency", type: "select", defaultValue: "EGP", options: [{ label: "EGP", value: "EGP" }] },
    { name: "paymentTerms", label: "Payment Terms", type: "select", options: ["Net 30", "Net 45", "Net 60", "Net 90", "Net 120"].map((t) => ({ label: t, value: t })) },
    { name: "status", label: "Status", type: "select", defaultValue: "ACTIVE", options: [{ label: "Active", value: "ACTIVE" }, { label: "On Hold", value: "HOLD" }, { label: "Blocked", value: "BLOCKED" }] },
  ];

  function handleCustomerSubmit(data: EntityFormData) {
    const payload = {
      code: String(data.code),
      name: String(data.name),
      type: String(data.type),
      phone: String(data.phone),
      email: String(data.email),
      address: String(data.address),
      city: data.city ? String(data.city) : undefined,
      creditLimit: Number(data.creditLimit),
      outstanding: Number(data.outstanding ?? 0),
      currency: String(data.currency || "EGP"),
      paymentTerms: String(data.paymentTerms || "Net 30"),
      status: String(data.status) as Customer["status"],
    };
    if (editingCustomer) {
      store.update("customers", editingCustomer.id, payload);
    } else {
      const code = payload.code.trim() || store.generateCustomerCode();
      store.add("customers", { id: store.genId("c"), ...payload, code, createdAt: new Date().toISOString() });
    }
    setCustFormOpen(false);
    setEditingCustomer(null);
  }

  // ─── Customer Document helpers ────────────────────────────────────────
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

  function openDocDialog(customerId: string) {
    setDocCustomerId(customerId);
    setDocType("Registration Certificate");
    setCustDocDialogOpen(true);
  }

  function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !docCustomerId) return;
    const reader = new FileReader();
    reader.onload = () => {
      const cust = store.customers.find((c) => c.id === docCustomerId);
      if (!cust) return;
      const newDoc: CustomerDocument = {
        id: store.genId("cdoc"),
        name: file.name,
        type: docType,
        data: reader.result as string,
        uploadedAt: new Date().toISOString(),
      };
      const existing = cust.documents ?? [];
      store.update("customers", docCustomerId, { documents: [...existing, newDoc] });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function removeDocument(customerId: string, docId: string) {
    const cust = store.customers.find((c) => c.id === customerId);
    if (!cust) return;
    const updated = (cust.documents ?? []).filter((d) => d.id !== docId);
    store.update("customers", customerId, { documents: updated });
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

  const docCustomer = docCustomerId ? store.customers.find((c) => c.id === docCustomerId) : null;

  // ─── Vendor CRUD ───────────────────────────────────────────────────────
  const vendorFields: EntityField[] = [
    { name: "code", label: "Code", type: "text", placeholder: "Auto-generated if empty", helperText: "Leave blank for auto-generated code" },
    { name: "name", label: "Name", type: "text", required: true },
    { name: "category", label: "Category", type: "select", required: true, options: ["API Supplier", "Excipients", "Primary Packaging", "Lab Reagents", "Equipment", "Services"].map((t) => ({ label: t, value: t })) },
    { name: "phone", label: "Phone", type: "tel", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "address", label: "Address", type: "text", required: true },
    { name: "outstanding", label: "Outstanding (EGP)", type: "number", defaultValue: 0 },
    { name: "paymentTerms", label: "Payment Terms", type: "select", options: ["Net 30", "Net 45", "Net 60"].map((t) => ({ label: t, value: t })) },
    { name: "gmpCertified", label: "GMP Certified", type: "checkbox", defaultValue: false },
  ];

  function handleVendorSubmit(data: EntityFormData) {
    const payload = {
      code: String(data.code),
      name: String(data.name),
      category: String(data.category),
      phone: String(data.phone),
      email: String(data.email),
      address: String(data.address),
      outstanding: Number(data.outstanding ?? 0),
      paymentTerms: String(data.paymentTerms || "Net 30"),
      gmpCertified: !!data.gmpCertified,
    };
    if (editingVendor) {
      store.update("vendors", editingVendor.id, payload);
    } else {
      const code = payload.code.trim() || store.generateVendorCode();
      store.add("vendors", { id: store.genId("ve"), ...payload, code, createdAt: new Date().toISOString() });
    }
    setVendFormOpen(false);
    setEditingVendor(null);
  }

  // ─── Cheque CRUD ───────────────────────────────────────────────────────
  const partyOptions = [
    ...store.customers.map((c) => ({ label: `Customer: ${c.name}`, value: `CUSTOMER:${c.id}` })),
    ...store.vendors.map((v) => ({ label: `Vendor: ${v.name}`, value: `VENDOR:${v.id}` })),
  ];
  const resolvePartyName = (cheque: Cheque): string => {
    if (cheque.partyId && cheque.partyType) {
      if (cheque.partyType === "CUSTOMER") {
        const c = store.customers.find((x) => x.id === cheque.partyId);
        if (c) return c.name;
      } else {
        const v = store.vendors.find((x) => x.id === cheque.partyId);
        if (v) return v.name;
      }
    }
    return cheque.partyName;
  };
  const chequeFields: EntityField[] = [
    { name: "number", label: "Cheque Number", type: "text", placeholder: "Auto-generated if empty", helperText: "Leave blank for auto-generated number" },
    { name: "bankName", label: "Bank", type: "text", required: true },
    { name: "type", label: "Direction", type: "select", required: true, options: [{ label: "Incoming", value: "INCOMING" }, { label: "Outgoing", value: "OUTGOING" }] },
    { name: "partySelect", label: "Party (Customer/Vendor)", type: "select", required: true, options: partyOptions, helperText: "Select a customer or vendor" },
    { name: "amount", label: "Amount (EGP)", type: "number", required: true },
    { name: "currency", label: "Currency", type: "select", defaultValue: "EGP", options: [{ label: "EGP", value: "EGP" }] },
    { name: "issueDate", label: "Issue Date", type: "date", required: true },
    { name: "dueDate", label: "Due Date", type: "date", required: true },
    { name: "status", label: "Status", type: "select", defaultValue: "PENDING", options: [{ label: "Pending", value: "PENDING" }, { label: "Deposited", value: "DEPOSITED" }, { label: "Cleared", value: "CLEARED" }, { label: "Bounced", value: "BOUNCED" }, { label: "Cancelled", value: "CANCELLED" }] },
    { name: "notes", label: "Notes", type: "textarea", fullWidth: true },
  ];

  function handleChequeSubmit(data: EntityFormData) {
    const partySelectVal = String(data.partySelect || "");
    const [partyType, partyId] = partySelectVal.includes(":") ? partySelectVal.split(":") : ["", ""];
    let partyName = "";
    if (partyType === "CUSTOMER") {
      partyName = store.customers.find((c) => c.id === partyId)?.name ?? "";
    } else if (partyType === "VENDOR") {
      partyName = store.vendors.find((v) => v.id === partyId)?.name ?? "";
    }
    const payload = {
      number: String(data.number),
      bankName: String(data.bankName),
      type: String(data.type) as Cheque["type"],
      partyName,
      partyId: partyId || undefined,
      partyType: (partyType === "CUSTOMER" || partyType === "VENDOR") ? partyType as "CUSTOMER" | "VENDOR" : undefined,
      amount: Number(data.amount),
      currency: String(data.currency || "EGP"),
      issueDate: String(data.issueDate),
      dueDate: String(data.dueDate),
      status: String(data.status) as Cheque["status"],
      notes: data.notes ? String(data.notes) : undefined,
    };
    if (editingCheque) {
      store.update("cheques", editingCheque.id, payload);
    } else {
      const number = payload.number.trim() || store.generateChequeNumber();
      store.add("cheques", { id: store.genId("ch"), ...payload, number });
    }
    setChequeFormOpen(false);
    setEditingCheque(null);
  }

  // ─── Invoice CRUD ──────────────────────────────────────────────────────
  const invoiceFields: EntityField[] = [
    { name: "number", label: "Invoice Number", type: "text", placeholder: "Auto-generated if empty", helperText: "Leave blank for auto-generated number" },
    { name: "customerId", label: "Customer", type: "select", required: true, options: store.customers.map((c) => ({ label: c.name, value: c.id })) },
    { name: "date", label: "Invoice Date", type: "date", required: true },
    { name: "dueDate", label: "Due Date", type: "date", required: true },
    { name: "productId", label: "Product", type: "select", options: store.products.map((p) => ({ label: `${p.name} ${p.strength} (${p.code})`, value: p.id })), helperText: "Select a product to auto-fill a line item" },
    { name: "quantity", label: "Item Quantity", type: "number", defaultValue: 1, helperText: "Quantity for the selected product" },
    { name: "unitPrice", label: "Unit Price (EGP)", type: "number", helperText: "Auto-filled from product catalog" },
    { name: "subtotal", label: "Subtotal (EGP)", type: "number", required: true },
    { name: "tax", label: "Tax (EGP)", type: "number", required: true },
    { name: "total", label: "Total (EGP)", type: "number", required: true },
    { name: "status", label: "Status", type: "select", defaultValue: "DRAFT", options: [{ label: "Draft", value: "DRAFT" }, { label: "Sent", value: "SENT" }, { label: "Partial", value: "PARTIAL" }, { label: "Paid", value: "PAID" }, { label: "Overdue", value: "OVERDUE" }, { label: "Void", value: "VOID" }] },
    { name: "notes", label: "Notes", type: "textarea", fullWidth: true },
  ];

  function handleInvoiceSubmit(data: EntityFormData) {
    const qty = Number(data.quantity || 1);
    const up = Number(data.unitPrice || 0);
    const prod = store.products.find((p) => p.id === String(data.productId));
    const items: Invoice["items"] = editingInvoice?.items ?? [];
    if (prod && qty > 0) {
      const lineTotal = qty * up;
      items.push({ productId: prod.id, description: `${prod.name} ${prod.strength} (${prod.form})`, quantity: qty, unitPrice: up, total: lineTotal });
    }
    const payload = {
      number: String(data.number),
      customerId: String(data.customerId),
      date: String(data.date),
      dueDate: String(data.dueDate),
      subtotal: Number(data.subtotal),
      tax: Number(data.tax),
      total: Number(data.total),
      currency: "EGP",
      status: String(data.status) as Invoice["status"],
      items,
      notes: data.notes ? String(data.notes) : undefined,
    };
    if (editingInvoice) {
      const oldStatus = editingInvoice.status;
      store.update("invoices", editingInvoice.id, payload);
      // Audit: invoice status change
      if (oldStatus !== payload.status) {
        logAction({
          userId: "u-admin", userName: "Admin User", userRole: "ADMIN",
          action: "UPDATE", module: "ERP", entity: "Invoice",
          entityId: editingInvoice.id, entityName: `Invoice ${editingInvoice.number}`,
          details: `Invoice status change: ${editingInvoice.number} ${oldStatus} -> ${payload.status}`,
          oldValues: { status: oldStatus },
          newValues: { status: payload.status },
        });
      }
      // Notification: payment received (status changed to PAID)
      if (payload.status === "PAID" && oldStatus !== "PAID") {
        const customer = store.customers.find((c) => c.id === payload.customerId);
        addNotification({
          type: "SUCCESS",
          title: `Payment received for ${editingInvoice.number}`,
          message: `Payment of EGP ${(payload.total ?? 0).toLocaleString()} received from ${customer?.name ?? "Unknown"} for invoice ${editingInvoice.number}.`,
          module: "INVOICE",
          entityType: "invoice",
          entityId: editingInvoice.id,
          actionUrl: "/erp/accounting",
        });
      }
    } else {
      const number = payload.number.trim() || store.generateInvoiceNumber();
      const newId = store.genId("inv");
      store.add("invoices", { id: newId, ...payload, number });
      logAction({
        userId: "u-admin", userName: "Admin User", userRole: "ADMIN",
        action: "CREATE", module: "ERP", entity: "Invoice",
        entityId: newId, entityName: `Invoice ${number}`,
        details: `Invoice created: ${number} - EGP ${(payload.total ?? 0).toLocaleString()} (${payload.status})`,
        newValues: { total: payload.total, status: payload.status, customerId: payload.customerId },
      });
    }
    setInvFormOpen(false);
    setEditingInvoice(null);
  }

  function exportCustomerCSV() {
    const rows = store.customers.map((c) => ({
      Code: c.code, Name: c.name, Type: c.type, Phone: c.phone, Outstanding: c.outstanding, CreditLimit: c.creditLimit, Status: c.status,
    }));
    downloadCSV("customers.csv", rows);
  }

  // ─── GL CRUD ──────────────────────────────────────────────────────────
  const glFields: EntityField[] = [
    { name: "code", label: "Account Code", type: "text", required: true, placeholder: "1000" },
    { name: "name", label: "Account Name", type: "text", required: true },
    { name: "type", label: "Type", type: "select", required: true, options: ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].map((t) => ({ label: t, value: t })) },
    { name: "subType", label: "Sub-Type", type: "text", required: true, placeholder: "e.g., Current Asset" },
    { name: "balance", label: "Opening Balance", type: "number", defaultValue: 0 },
    { name: "isActive", label: "Active", type: "checkbox", defaultValue: true },
  ];

  function handleGLSubmit(data: EntityFormData) {
    const payload = { code: String(data.code), name: String(data.name), type: String(data.type) as GLAccount["type"], subType: String(data.subType), balance: Number(data.balance ?? 0), isActive: data.isActive !== false };
    if (editingGL) { store.update("glAccounts", editingGL.id, payload); }
    else { store.add("glAccounts", { id: store.genId("gl"), ...payload }); }
    setGlFormOpen(false); setEditingGL(null);
  }

  // ─── JE CRUD ──────────────────────────────────────────────────────────
  const jeFields: EntityField[] = [
    { name: "date", label: "Date", type: "date", required: true },
    { name: "description", label: "Description", type: "text", required: true },
    { name: "reference", label: "Reference", type: "text", placeholder: "INV/PO/PAY number" },
    { name: "type", label: "Entry Type", type: "select", required: true, defaultValue: "GENERAL", options: [
      { label: "General", value: "GENERAL" }, { label: "Adjusting", value: "ADJUSTING" },
      { label: "Closing", value: "CLOSING" }, { label: "Reversing", value: "REVERSING" },
      { label: "Accrual", value: "ACCRUAL" }, { label: "Opening", value: "OPENING" },
      { label: "Partner", value: "PARTNER" },
    ]},
  ];

  function handleJESubmit(data: EntityFormData) {
    if (editingJE) {
      store.update("journalEntries", editingJE.id, { date: String(data.date), description: String(data.description), reference: data.reference ? String(data.reference) : undefined, type: String(data.type) as JournalEntry["type"] });
      logAction({
        userId: "u-admin", userName: "Admin User", userRole: "ADMIN",
        action: "UPDATE", module: "ERP", entity: "JournalEntry",
        entityId: editingJE.id, entityName: `JE ${editingJE.number}`,
        details: `Journal entry updated: ${editingJE.number} - ${String(data.description)}`,
        oldValues: { description: editingJE.description, type: editingJE.type },
        newValues: { description: String(data.description), type: String(data.type) },
      });
    } else {
      const newId = store.genId("je");
      const jeNumber = store.generateJournalNumber();
      store.add("journalEntries", {
        id: newId, number: jeNumber, date: String(data.date),
        description: String(data.description), reference: data.reference ? String(data.reference) : undefined,
        type: String(data.type) as JournalEntry["type"], lines: [], status: "DRAFT",
        createdBy: "u-admin", createdAt: new Date().toISOString(),
      });
      logAction({
        userId: "u-admin", userName: "Admin User", userRole: "ADMIN",
        action: "CREATE", module: "ERP", entity: "JournalEntry",
        entityId: newId, entityName: `JE ${jeNumber}`,
        details: `Journal entry created: ${jeNumber} - ${String(data.description)} (${String(data.type)})`,
        newValues: { number: jeNumber, description: String(data.description), type: String(data.type), status: "DRAFT" },
      });
      // Auto-open detail view so user can add lines
      setTimeout(() => setJeDetailId(newId), 100);
    }
    setJeFormOpen(false); setEditingJE(null);
  }

  // ─── Cost Center CRUD ─────────────────────────────────────────────────
  const ccFields: EntityField[] = [
    { name: "code", label: "Code", type: "text", placeholder: "Auto-generated if empty", helperText: "Leave blank for auto-generated code" },
    { name: "name", label: "Name", type: "text", required: true },
    { name: "type", label: "Type", type: "select", required: true, options: [
      { label: "Production", value: "PRODUCTION" }, { label: "Administrative", value: "ADMINISTRATIVE" },
      { label: "Selling", value: "SELLING" }, { label: "R&D", value: "R_AND_D" },
      { label: "Distribution", value: "DISTRIBUTION" },
    ]},
    { name: "budget", label: "Budget (EGP)", type: "number", required: true },
    { name: "actualSpend", label: "Actual Spend (EGP)", type: "number", defaultValue: 0 },
    { name: "isActive", label: "Active", type: "checkbox", defaultValue: true },
  ];

  function handleCCSubmit(data: EntityFormData) {
    const payload = { code: String(data.code), name: String(data.name), type: String(data.type) as CostCenter["type"], budget: Number(data.budget), actualSpend: Number(data.actualSpend ?? 0), isActive: data.isActive !== false };
    if (editingCC) { store.update("costCenters", editingCC.id, payload); }
    else { const code = payload.code.trim() || store.generateCostCenterCode(); store.add("costCenters", { id: store.genId("cc"), ...payload, code }); }
    setCcFormOpen(false); setEditingCC(null);
  }

  // ─── Budget CRUD ──────────────────────────────────────────────────────
  const budgetFields: EntityField[] = [
    { name: "name", label: "Budget Name", type: "text", required: true },
    { name: "fiscalYear", label: "Fiscal Year", type: "text", required: true, defaultValue: String(new Date().getFullYear()), placeholder: "2026" },
    { name: "period", label: "Period", type: "select", required: true, defaultValue: "Q1", options: ["Q1", "Q2", "Q3", "Q4", "Annual", "Monthly"].map((p) => ({ label: p, value: p })) },
    { name: "accountId", label: "GL Account (optional)", type: "select", options: [{ label: "— None —", value: "" }, ...store.glAccounts.map((a) => ({ label: `${a.code} — ${a.name}`, value: a.id }))] },
    { name: "costCenterId", label: "Cost Center (optional)", type: "select", options: [{ label: "— None —", value: "" }, ...store.costCenters.map((c) => ({ label: `${c.code} — ${c.name}`, value: c.id }))] },
    { name: "budgeted", label: "Budgeted (EGP)", type: "number", required: true, defaultValue: 0 },
    { name: "actual", label: "Actual (EGP)", type: "number", defaultValue: 0 },
    { name: "status", label: "Status", type: "select", required: true, defaultValue: "DRAFT", options: [{ label: "Draft", value: "DRAFT" }, { label: "Approved", value: "APPROVED" }, { label: "Closed", value: "CLOSED" }] },
  ];

  function handleBudgetSubmit(data: EntityFormData) {
    const status = (String(data.status || "DRAFT")) as Budget["status"];
    const payload = { name: String(data.name), fiscalYear: String(data.fiscalYear || new Date().getFullYear()), period: String(data.period || "Q1"), accountId: data.accountId ? String(data.accountId) : undefined, costCenterId: data.costCenterId ? String(data.costCenterId) : undefined, budgeted: Number(data.budgeted) || 0, actual: Number(data.actual) || 0, status };
    if (editingBudget) { store.update("budgets", editingBudget.id, payload); }
    else { store.add("budgets", { id: store.genId("bud"), ...payload }); }
    setBudgetFormOpen(false); setEditingBudget(null);
  }

  const typeBadge = (type: string) => {
    const colors: Record<string, string> = { ASSET: "bg-blue-100 text-blue-800", LIABILITY: "bg-red-100 text-red-800", EQUITY: "bg-purple-100 text-purple-800", REVENUE: "bg-green-100 text-green-800", EXPENSE: "bg-amber-100 text-amber-800" };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[type] ?? "bg-muted text-foreground"}`}>{type}</span>;
  };

  const jeBadge = (type: string) => {
    const colors: Record<string, string> = { GENERAL: "bg-blue-100 text-blue-800", ADJUSTING: "bg-amber-100 text-amber-800", CLOSING: "bg-red-100 text-red-800", OPENING: "bg-green-100 text-green-800", PARTNER: "bg-purple-100 text-purple-800", REVERSING: "bg-orange-100 text-orange-800", ACCRUAL: "bg-teal-100 text-teal-800" };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[type] ?? "bg-muted text-foreground"}`}>{type}</span>;
  };

  // ─── Sales Order Approval Workflow ────────────────────────────────────
  const soApprovals = approvals.getByModule("SalesOrder");
  const pendingSOApprovals = soApprovals.filter((a) => a.status === "PENDING");

  function submitSOForApproval(so: SalesOrder) {
    const customer = store.customers.find((c) => c.id === so.customerId);
    approvals.submit({
      type: "Sales Order",
      module: "SalesOrder",
      entityId: so.id,
      title: `SO ${so.number} — ${customer?.name ?? "Unknown"}`,
      description: `Sales order ${so.number} for ${egpFmt(so.total)}. Items: ${(so.items || []).map((i) => i.description).join(", ")}`,
      requestedBy: "u-admin",
      requestedByName: "Admin User",
      assignedTo: "admin-001",
      assignedToName: "Finance Manager",
      amount: so.total,
      priority: so.total > 500000 ? "HIGH" : so.total > 100000 ? "MEDIUM" : "LOW",
    });
    store.update("salesOrders", so.id, { status: "CONFIRMED" });
  }

  function approveSOFromApproval(approvalId: string, soId: string) {
    const so = store.salesOrders.find((s) => s.id === soId);
    if (!so) return;

    // Stock availability check (informational warning — actual deduction happens at PROCESSING in SO page)
    const stockIssues: string[] = [];
    for (const item of so.items) {
      const product = store.products.find((p) => p.id === item.productId);
      if (product && product.stockQty < item.quantity) {
        stockIssues.push(`${product.name}: need ${item.quantity}, have ${product.stockQty}`);
      }
    }
    if (stockIssues.length > 0) {
      alert(`Warning — insufficient stock detected:\n${stockIssues.join("\n")}\n\nThe SO will be approved but stock must be replenished before processing.`);
    }

    const soApprovalId = store.genId("soa");
    store.update("salesOrders", so.id, { status: "PROCESSING", soApprovalId });
    approvals.approve(approvalId, "SO approved by accounting — moved to PROCESSING");
  }

  function rejectSOApproval(approvalId: string, soId: string) {
    store.update("salesOrders", soId, { status: "DRAFT" });
    approvals.reject(approvalId, "Sales order rejected by accounting — returned to DRAFT");
  }

  const egpFmt = (n: number) => `EGP ${(n ?? 0).toLocaleString()}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("acct.title")}
        description={t("acct.manageAccounting")}
        actions={
          <Button variant="outline" onClick={exportCustomerCSV}>
            <Download className="h-4 w-4 mr-2" /> Export Customers
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard icon={Landmark} title={t("acct.totalAssets")} value={`EGP ${((totalBankBalance ?? 0) / 1e6).toFixed(1)}M`} subtitle={`${store.bankAccounts.length} accounts`} iconColor="bg-indigo-100 text-indigo-600" />
        <StatsCard icon={Users} title={t("acct.totalLiabilities")} value={`EGP ${((totalAR ?? 0) / 1e6).toFixed(1)}M`} subtitle={`${store.customers.length} customers`} iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={Building2} title={t("acct.totalExpenses")} value={`EGP ${((totalAP ?? 0) / 1e6).toFixed(1)}M`} subtitle={`${store.vendors.length} vendors`} iconColor="bg-red-100 text-red-600" />
        <StatsCard icon={BookOpen} title={t("acct.totalRevenue")} value={activeGLAccounts.length} subtitle={`${store.glAccounts.length} total`} iconColor="bg-violet-100 text-violet-600" />
        <StatsCard icon={ScrollText} title={t("acct.postedJournals")} value={postedJEs} subtitle={`${store.journalEntries.length} total`} iconColor="bg-emerald-100 text-emerald-600" />
      </div>

      {/* Pending SO Approvals Alert — visible above all tabs */}
      {pendingSOApprovals.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/30">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="font-semibold text-sm">{pendingSOApprovals.length} Sales Order{pendingSOApprovals.length > 1 ? "s" : ""} Pending Approval</span>
            </div>
            <div className="space-y-2">
              {pendingSOApprovals.map((apr) => {
                const so = store.salesOrders.find((s) => s.id === apr.entityId);
                const customer = so ? store.customers.find((c) => c.id === so.customerId) : null;
                return (
                  <div key={apr.id} className="flex items-center justify-between bg-white border rounded-lg px-3 py-2">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-mono font-semibold text-xs">{so?.number ?? "—"}</span>
                      <span className="text-muted-foreground">{customer?.name ?? "Unknown"}</span>
                      <span className="font-semibold">{apr.amount ? egpFmt(apr.amount) : "—"}</span>
                      <span className="text-xs text-muted-foreground">{so?.date?.slice(0, 10)}</span>
                      {so && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{(so.items || []).map((i) => `${i.description} x${i.quantity}`).join(", ")}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => rejectSOApproval(apr.id, apr.entityId)}>
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                      <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => approveSOFromApproval(apr.id, apr.entityId)}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Approve
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="customers">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="customers">{t("acct.customers")} ({store.customers.length})</TabsTrigger>
          <TabsTrigger value="vendors">{t("acct.vendors")} ({store.vendors.length})</TabsTrigger>
          <TabsTrigger value="cheques">{t("acct.cheques")} ({store.cheques.length})</TabsTrigger>
          <TabsTrigger value="invoices">{t("acct.invoices")} ({store.invoices.length})</TabsTrigger>
          <TabsTrigger value="bank">{t("acct.bankAccounts")} ({store.bankAccounts.length})</TabsTrigger>
          <TabsTrigger value="gl">{t("acct.chartOfAccounts")}</TabsTrigger>
          <TabsTrigger value="je">{t("acct.journalEntries")}</TabsTrigger>
          <TabsTrigger value="cost">{t("acct.costCenters")}</TabsTrigger>
          <TabsTrigger value="sales-orders">{t("acct.salesOrders")} ({store.salesOrders.length})</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="einvoicing">E-Invoicing</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
        </TabsList>

        {/* Customers */}
        <TabsContent value="customers" className="space-y-3">
          <FilterBar
            searchPlaceholder="Search customers..."
            searchValue={custSearch}
            onSearchChange={setCustSearch}
            fields={[
              { key: "status", label: "Status", type: "select", options: [{ label: "Active", value: "ACTIVE" }, { label: "Hold", value: "HOLD" }, { label: "Blocked", value: "BLOCKED" }] },
              { key: "type", label: "Type", type: "select", options: ["Pharmacy Chain", "Hospital", "Distributor", "Government"].map((t) => ({ label: t, value: t })) },
            ]}
            values={custFilters}
            onChange={(k, v) => setCustFilters(f => ({ ...f, [k]: v }))}
            rightSlot={
              <Button size="sm" onClick={() => { setEditingCustomer(null); setCustFormOpen(true); }}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            }
          />
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <DataTable
                columns={[
                  { key: "code", label: "Code", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "name", label: "Name", render: (_v: string, row: Record<string, unknown>) => {
                    const c = row as unknown as Customer;
                    return <PartnerLink type="customer" id={c.id}>{c.name}</PartnerLink>;
                  } },
                  { key: "type", label: "Type", render: (v: string) => <span className="text-xs">{v}</span> },
                  { key: "phone", label: "Phone", render: (v: string) => <span className="text-xs">{v}</span> },
                  { key: "creditLimit", label: "Credit Limit", className: "text-right", render: (v: number) => <span className="font-semibold">{(v ?? 0).toLocaleString()}</span> },
                  { key: "outstanding", label: "Outstanding", className: "text-right", render: (v: number) => (v ?? 0).toLocaleString() },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge variant={v === "ACTIVE" ? "success" : v === "HOLD" ? "warning" : "destructive"}>{v}</Badge>
                  ) },
                  { key: "actions", label: "Actions", className: "text-right", render: (_: unknown, row: Record<string, unknown>) => {
                    const c = row as unknown as Customer;
                    return (
                      <EditDeleteMenu
                        onEdit={() => { setEditingCustomer(c); setCustFormOpen(true); }}
                        onDelete={() => store.remove("customers", c.id)}
                        itemLabel={c.name}
                        compact
                        extraItems={[
                          { label: "View Statement", onClick: () => setStatementParty({ type: "customer", id: c.id }) },
                          { label: "Documents", onClick: () => openDocDialog(c.id) },
                        ]}
                      />
                    );
                  } },
                ] as Column<Record<string, unknown>>[]}
                data={filteredCustomers as unknown as Record<string, unknown>[]}

                exportable exportFilename="erp-accounting.csv" emptyMessage="No customers found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendors */}
        <TabsContent value="vendors" className="space-y-3">
          <FilterBar
            searchPlaceholder="Search vendors..."
            searchValue={vendSearch}
            onSearchChange={setVendSearch}
            rightSlot={
              <Button size="sm" onClick={() => { setEditingVendor(null); setVendFormOpen(true); }}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            }
          />
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <DataTable
                columns={[
                  { key: "code", label: "Code", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "name", label: "Name", render: (_v: string, row: Record<string, unknown>) => {
                    const ve = row as unknown as Vendor;
                    return <PartnerLink type="vendor" id={ve.id}>{ve.name}</PartnerLink>;
                  } },
                  { key: "category", label: "Category", render: (v: string) => <span className="text-xs">{v}</span> },
                  { key: "email", label: "Contact", render: (v: string) => <span className="text-xs">{v}</span> },
                  { key: "outstanding", label: "Outstanding", className: "text-right", render: (v: number) => (v ?? 0).toLocaleString() },
                  { key: "paymentTerms", label: "Terms", render: (v: string) => <span className="text-xs">{v}</span> },
                  { key: "gmpCertified", label: "GMP", render: (v: boolean) => (
                    <Badge variant={v ? "success" : "secondary"}>{v ? "Yes" : "No"}</Badge>
                  ) },
                  { key: "actions", label: "Actions", className: "text-right", render: (_: unknown, row: Record<string, unknown>) => {
                    const v = row as unknown as Vendor;
                    return (
                      <EditDeleteMenu
                        onEdit={() => { setEditingVendor(v); setVendFormOpen(true); }}
                        onDelete={() => store.remove("vendors", v.id)}
                        itemLabel={v.name}
                        compact
                        extraItems={[{ label: "View Statement", onClick: () => setStatementParty({ type: "vendor", id: v.id }) }]}
                      />
                    );
                  } },
                ] as Column<Record<string, unknown>>[]}
                data={filteredVendors as unknown as Record<string, unknown>[]}
                
                exportable exportFilename="erp-accounting.csv" emptyMessage="No vendors found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cheques */}
        <TabsContent value="cheques" className="space-y-3">
          <FilterBar
            searchPlaceholder="Search cheques..."
            searchValue={chequeSearch}
            onSearchChange={setChequeSearch}
            fields={[
              { key: "type", label: "Direction", type: "select", options: [{ label: "Incoming", value: "INCOMING" }, { label: "Outgoing", value: "OUTGOING" }] },
              { key: "status", label: "Status", type: "select", options: [{ label: "Pending", value: "PENDING" }, { label: "Deposited", value: "DEPOSITED" }, { label: "Cleared", value: "CLEARED" }, { label: "Bounced", value: "BOUNCED" }] },
            ]}
            values={chequeFilters}
            onChange={(k, v) => setChequeFilters(f => ({ ...f, [k]: v }))}
            rightSlot={
              <Button size="sm" onClick={() => { setEditingCheque(null); setChequeFormOpen(true); }}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            }
          />
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <DataTable
                columns={[
                  { key: "number", label: "Number", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "bankName", label: "Bank" },
                  { key: "type", label: "Type", render: (v: string) => (
                    <Badge variant={v === "INCOMING" ? "success" : "default"}>{v}</Badge>
                  ) },
                  { key: "partyName", label: "Party", render: (_v: unknown, row: Record<string, unknown>) => {
                    const c = row as unknown as Cheque;
                    const name = resolvePartyName(c);
                    const typeLabel = c.partyType === "CUSTOMER" ? "Customer" : c.partyType === "VENDOR" ? "Vendor" : "";
                    return (
                      <div>
                        <span className="font-medium">{name}</span>
                        {typeLabel && <span className="text-xs text-muted-foreground ml-1">({typeLabel})</span>}
                      </div>
                    );
                  } },
                  { key: "amount", label: "Amount", className: "text-right", render: (v: number) => <span className="font-semibold">{(v ?? 0).toLocaleString()}</span> },
                  { key: "issueDate", label: "Issue Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                  { key: "dueDate", label: "Due Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge variant={v === "CLEARED" ? "success" : v === "BOUNCED" ? "destructive" : v === "DEPOSITED" ? "default" : "warning"}>{v}</Badge>
                  ) },
                  { key: "actions", label: "Actions", className: "text-right", render: (_: unknown, row: Record<string, unknown>) => {
                    const c = row as unknown as Cheque;
                    return (
                      <EditDeleteMenu
                        onEdit={() => { setEditingCheque(c); setChequeFormOpen(true); }}
                        onDelete={() => store.remove("cheques", c.id)}
                        itemLabel={`Cheque ${c.number}`}
                        compact
                      />
                    );
                  } },
                ] as Column<Record<string, unknown>>[]}
                data={filteredCheques as unknown as Record<string, unknown>[]}
                
                exportable exportFilename="erp-accounting.csv" emptyMessage="No cheques found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices */}
        <TabsContent value="invoices" className="space-y-3">
          <FilterBar
            searchPlaceholder="Search invoices..."
            searchValue={invSearch}
            onSearchChange={setInvSearch}
            rightSlot={
              <Button size="sm" onClick={() => { setEditingInvoice(null); setInvFormOpen(true); }}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            }
          />
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <DataTable
                columns={[
                  { key: "number", label: "Invoice #", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "customerId", label: "Customer", render: (_: unknown, row: Record<string, unknown>) => {
                    const inv = row as unknown as Invoice;
                    const cust = store.customers.find((c) => c.id === inv.customerId);
                    return cust ? <PartnerLink type="customer" id={cust.id}>{cust.name}</PartnerLink> : <span className="text-muted-foreground">---</span>;
                  } },
                  { key: "date", label: "Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                  { key: "dueDate", label: "Due Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                  { key: "total", label: "Total", className: "text-right", render: (v: number) => <span className="font-semibold">{(v ?? 0).toLocaleString()}</span> },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge variant={v === "PAID" ? "success" : v === "OVERDUE" ? "destructive" : v === "VOID" ? "secondary" : "warning"}>{v}</Badge>
                  ) },
                  { key: "actions", label: "Actions", className: "text-right", render: (_: unknown, row: Record<string, unknown>) => {
                    const i = row as unknown as Invoice;
                    return (
                      <EditDeleteMenu
                        onEdit={() => { setEditingInvoice(i); setInvFormOpen(true); }}
                        onDelete={() => store.remove("invoices", i.id)}
                        itemLabel={i.number}
                        compact
                      />
                    );
                  } },
                ] as Column<Record<string, unknown>>[]}
                data={filteredInvoices as unknown as Record<string, unknown>[]}
                
                exportable exportFilename="erp-accounting.csv" emptyMessage="No invoices found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bank Accounts */}
        <TabsContent value="bank" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Total Balance: <span className="font-semibold text-foreground">EGP {(totalBankBalance ?? 0).toLocaleString()}</span>
            </div>
            <Button size="sm" onClick={() => { setEditingBank(null); setBankFormOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Add Account</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "code", label: "Code", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
                  { key: "name", label: "Account Name", render: (v) => <span className="font-medium">{v as string}</span> },
                  { key: "bankName", label: "Bank" },
                  { key: "accountNumber", label: "Account #", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
                  { key: "currency", label: "Cur." },
                  { key: "balance", label: "Balance", render: (v) => <span className="font-semibold text-green-700">EGP {((v as number) ?? 0).toLocaleString()}</span>, className: "text-right" },
                  { key: "id", label: "Cheques", render: (_v, row) => {
                    const incoming = store.cheques.filter((c) => c.bankAccountId === row.id && c.type === "INCOMING" && (c.status === "PENDING" || c.status === "DEPOSITED")).reduce((s, c) => s + c.amount, 0);
                    const outgoing = store.cheques.filter((c) => c.bankAccountId === row.id && c.type === "OUTGOING" && c.status === "PENDING").reduce((s, c) => s + c.amount, 0);
                    if (!incoming && !outgoing) return <span className="text-xs text-muted-foreground">—</span>;
                    return (
                      <div className="text-xs">
                        {incoming > 0 && <span className="text-green-600">+{((incoming ?? 0) / 1000).toFixed(0)}K in</span>}
                        {incoming > 0 && outgoing > 0 && " / "}
                        {outgoing > 0 && <span className="text-red-600">-{((outgoing ?? 0) / 1000).toFixed(0)}K out</span>}
                      </div>
                    );
                  }},
                  { key: "status", label: "Status", render: (v) => (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${(v as string) === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}`}>{v as string}</span>
                  )},
                  { key: "type", label: "", render: (_v, row) => (
                    <EditDeleteMenu
                      onEdit={() => { const b = store.bankAccounts.find((x) => x.id === row.id); if (b) { setEditingBank(b); setBankFormOpen(true); } }}
                      onDelete={() => store.remove("bankAccounts", row.id as string)}
                      itemLabel={row.name as string}
                    />
                  )},
                ] as Column<Record<string, unknown>>[]}
                data={store.bankAccounts as unknown as Record<string, unknown>[]}
                exportable exportFilename="erp-accounting.csv" emptyMessage="No bank accounts."
                
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ General Ledger ═══ */}
        <TabsContent value="gl" className="space-y-3">
          <FilterBar
            searchPlaceholder="Search accounts..."
            searchValue={glSearch}
            onSearchChange={setGlSearch}
            fields={[{ key: "type", label: "Type", type: "select", options: ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].map((t) => ({ label: t, value: t })) }]}
            values={glFilters}
            onChange={(k, v) => setGlFilters((f) => ({ ...f, [k]: v }))}
            rightSlot={
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => {
                  const rows = activeGLAccounts.map((a) => ({
                    Code: a.code, Name: a.name, Type: a.type, SubType: a.subType,
                    Debit: ["ASSET", "EXPENSE"].includes(a.type) ? a.balance : 0,
                    Credit: ["LIABILITY", "EQUITY", "REVENUE"].includes(a.type) ? a.balance : 0,
                  }));
                  downloadCSV("trial-balance.csv", rows);
                }}><Download className="h-3 w-3 mr-1" /> Trial Balance</Button>
                <Button size="sm" onClick={() => { setEditingGL(null); setGlFormOpen(true); }}><Plus className="h-3 w-3 mr-1" /> Add Account</Button>
              </div>
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Assets</div><div className="text-lg font-bold text-blue-700">EGP {((totalAssets ?? 0) / 1e6).toFixed(2)}M</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Liabilities</div><div className="text-lg font-bold text-red-600">EGP {Math.abs((totalLiabilities ?? 0) / 1e6).toFixed(2)}M</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Equity</div><div className="text-lg font-bold text-purple-700">EGP {((totalEquity ?? 0) / 1e6).toFixed(2)}M</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Revenue</div><div className="text-lg font-bold text-green-700">EGP {((totalRevenue ?? 0) / 1e6).toFixed(2)}M</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Expenses</div><div className="text-lg font-bold text-amber-700">EGP {((totalExpenses ?? 0) / 1e6).toFixed(2)}M</div></CardContent></Card>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <DataTable
                columns={[
                  { key: "code", label: "Code", render: (v) => <span className="font-mono text-xs font-semibold">{v as string}</span> },
                  { key: "name", label: "Account Name", render: (v) => <span className="font-medium">{v as string}</span> },
                  { key: "type", label: "Type", render: (v) => typeBadge(v as string) },
                  { key: "subType", label: "Sub-Type", render: (v) => <span className="text-xs text-muted-foreground">{v as string}</span> },
                  { key: "balance", label: "Balance", className: "text-right", render: (v, row) => {
                    const type = row.type as string;
                    const bal = v as number;
                    const isDebitNormal = type === "ASSET" || type === "EXPENSE";
                    return <span className={`font-semibold ${bal < 0 ? "text-red-600" : ""}`}>{isDebitNormal ? "" : ""}{Math.abs(bal ?? 0).toLocaleString()}</span>;
                  }},
                  { key: "isActive", label: "Status", render: (v) => <Badge variant={(v as boolean) ? "success" : "secondary"}>{(v as boolean) ? "Active" : "Inactive"}</Badge> },
                  { key: "id", label: "", render: (_v, row) => {
                    const a = row as unknown as GLAccount;
                    return <EditDeleteMenu onEdit={() => { setEditingGL(a); setGlFormOpen(true); }} onDelete={() => store.remove("glAccounts", a.id)} itemLabel={a.name} compact />;
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={filteredGL as unknown as Record<string, unknown>[]}
                
                exportable exportFilename="erp-accounting.csv" emptyMessage="No accounts found."
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calculator className="h-4 w-4" /> Trial Balance Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground">Total Debits</div>
                  <div className="text-xl font-bold">EGP {(activeGLAccounts.filter((a) => ["ASSET", "EXPENSE"].includes(a.type)).reduce((s, a) => s + Math.abs(a.balance ?? 0), 0)).toLocaleString()}</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground">Total Credits</div>
                  <div className="text-xl font-bold">EGP {(activeGLAccounts.filter((a) => ["LIABILITY", "EQUITY", "REVENUE"].includes(a.type)).reduce((s, a) => s + Math.abs(a.balance ?? 0), 0)).toLocaleString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Journal Entries ═══ */}
        <TabsContent value="je" className="space-y-3">
          <FilterBar
            searchPlaceholder="Search journal entries..."
            searchValue={jeSearch}
            onSearchChange={setJeSearch}
            fields={[
              { key: "type", label: "Type", type: "select", options: ["GENERAL", "ADJUSTING", "CLOSING", "REVERSING", "ACCRUAL", "OPENING", "PARTNER"].map((t) => ({ label: t, value: t })) },
              { key: "status", label: "Status", type: "select", options: ["DRAFT", "POSTED", "VOID"].map((t) => ({ label: t, value: t })) },
            ]}
            values={jeFilters}
            onChange={(k, v) => setJeFilters((f) => ({ ...f, [k]: v }))}
            rightSlot={<Button size="sm" onClick={() => { setEditingJE(null); setJeFormOpen(true); }}><Plus className="h-3 w-3 mr-1" /> New Entry</Button>}
          />
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <DataTable
                columns={[
                  { key: "number", label: "Entry #", render: (v) => <span className="font-mono text-xs font-semibold">{v as string}</span> },
                  { key: "date", label: "Date", render: (v) => <span className="text-xs">{new Date(v as string).toLocaleDateString()}</span> },
                  { key: "description", label: "Description", render: (v) => <span className="font-medium">{v as string}</span> },
                  { key: "reference", label: "Ref", render: (v) => v ? <span className="font-mono text-xs">{v as string}</span> : <span className="text-muted-foreground">—</span> },
                  { key: "type", label: "Type", render: (v) => jeBadge(v as string) },
                  { key: "lines", label: "Debit", className: "text-right", render: (v) => {
                    const lines = (v || []) as JournalEntry["lines"];
                    return <span className="font-semibold">{lines.reduce((s, l) => s + (l.debit ?? 0), 0).toLocaleString()}</span>;
                  }},
                  { key: "id", label: "Credit", className: "text-right", render: (_v, row) => {
                    const je = row as unknown as JournalEntry;
                    return <span className="font-semibold">{(je.lines || []).reduce((s, l) => s + (l.credit ?? 0), 0).toLocaleString()}</span>;
                  }},
                  { key: "status", label: "Status", render: (v) => <Badge variant={(v as string) === "POSTED" ? "success" : (v as string) === "VOID" ? "destructive" : "warning"}>{v as string}</Badge> },
                  { key: "createdAt", label: "", render: (_v, row) => {
                    const je = row as unknown as JournalEntry;
                    const extras: { label: string; onClick: () => void }[] = [{ label: "View Lines", onClick: () => setJeDetailId(je.id) }];
                    if (je.status === "DRAFT") extras.push({ label: "Post", onClick: () => {
                      store.update("journalEntries", je.id, { status: "POSTED" as JournalEntry["status"] });
                      logAction({ userId: "u-admin", userName: "Admin User", userRole: "ADMIN", action: "UPDATE", module: "ERP", entity: "JournalEntry", entityId: je.id, entityName: `JE ${je.number}`, details: `Journal entry posted: ${je.number}`, oldValues: { status: "DRAFT" }, newValues: { status: "POSTED" } });
                    }});
                    if (je.status === "POSTED") extras.push({ label: "Void", onClick: () => {
                      store.update("journalEntries", je.id, { status: "VOID" as JournalEntry["status"] });
                      logAction({ userId: "u-admin", userName: "Admin User", userRole: "ADMIN", action: "UPDATE", module: "ERP", entity: "JournalEntry", entityId: je.id, entityName: `JE ${je.number}`, details: `Journal entry voided: ${je.number}`, oldValues: { status: "POSTED" }, newValues: { status: "VOID" } });
                    }});
                    return <EditDeleteMenu onEdit={() => { setEditingJE(je); setJeFormOpen(true); }} onDelete={() => store.remove("journalEntries", je.id)} itemLabel={je.number} compact extraItems={extras} />;
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={filteredJE as unknown as Record<string, unknown>[]}
                onRowClick={(row) => setJeDetailId((row as unknown as JournalEntry).id)}
                exportable exportFilename="erp-accounting.csv" emptyMessage="No journal entries found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Cost Accounting ═══ */}
        <TabsContent value="cost" className="space-y-4">
          <div className="flex gap-1 border-b border-border pb-2 flex-wrap">
            {([["centers", "Cost Centers", Target], ["budgets", "Budget vs Actual", BarChart3], ["allocation", "Cost Allocation", PieChart], ["variance", "Variance Analysis", Calculator], ["product-costing", "Product Costing", ShoppingBag]] as const).map(([key, label, Icon]) => (
              <button key={key} onClick={() => setCostTab(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${costTab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            ))}
          </div>

          {costTab === "centers" && (
            <div className="space-y-3">
              <div className="flex justify-end"><Button size="sm" onClick={() => { setEditingCC(null); setCcFormOpen(true); }}><Plus className="h-3 w-3 mr-1" /> Add Cost Center</Button></div>
              <Card><CardContent className="p-0 overflow-x-auto">
                <DataTable
                  columns={[
                    { key: "code", label: "Code", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
                    { key: "name", label: "Name", render: (v) => <span className="font-medium">{v as string}</span> },
                    { key: "type", label: "Type", render: (v) => <Badge variant="outline">{(v as string).replace(/_/g, " & ")}</Badge> },
                    { key: "budget", label: "Budget", className: "text-right", render: (v) => <span>{((v as number) ?? 0).toLocaleString()}</span> },
                    { key: "actualSpend", label: "Actual", className: "text-right", render: (v) => <span>{((v as number) ?? 0).toLocaleString()}</span> },
                    { key: "id", label: "Variance", className: "text-right", render: (_v, row) => {
                      const cc = row as unknown as CostCenter;
                      const variance = cc.budget - cc.actualSpend;
                      return <span className={`font-semibold ${variance >= 0 ? "text-green-600" : "text-red-600"}`}>{variance >= 0 ? "+" : ""}{(variance ?? 0).toLocaleString()}</span>;
                    }},
                    { key: "isActive", label: "Util %", render: (_v, row) => {
                      const cc = row as unknown as CostCenter;
                      const pct = cc.budget > 0 ? Math.round((cc.actualSpend / cc.budget) * 100) : 0;
                      return (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full"><div className={`h-full rounded-full ${pct > 100 ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div>
                          <span className="text-xs">{pct}%</span>
                        </div>
                      );
                    }},
                    { key: "parentId", label: "", render: (_v, row) => {
                      const cc = row as unknown as CostCenter;
                      return <EditDeleteMenu onEdit={() => { setEditingCC(cc); setCcFormOpen(true); }} onDelete={() => store.remove("costCenters", cc.id)} itemLabel={cc.name} compact />;
                    }},
                  ] as Column<Record<string, unknown>>[]}
                  data={store.costCenters as unknown as Record<string, unknown>[]}
                  
                  exportable exportFilename="erp-accounting.csv" emptyMessage="No cost centers."
                />
              </CardContent></Card>
            </div>
          )}

          {costTab === "budgets" && (
            <div className="space-y-3">
              <div className="flex justify-end"><Button type="button" size="sm" onClick={() => { setEditingBudget(null); setBudgetFormOpen(true); }}><Plus className="h-3 w-3 mr-1" /> Add Budget</Button></div>
              <Card><CardContent className="p-0 overflow-x-auto">
                <DataTable
                  columns={[
                    { key: "name", label: "Budget", render: (v) => <span className="font-medium">{v as string}</span> },
                    { key: "fiscalYear", label: "FY" },
                    { key: "period", label: "Period", render: (v) => <Badge variant="outline">{v as string}</Badge> },
                    { key: "costCenterId", label: "Linked To", render: (_v, row) => {
                      const b = row as unknown as Budget;
                      if (b.costCenterId) return <span className="text-xs">{ccName(b.costCenterId)}</span>;
                      if (b.accountId) return <span className="text-xs">{glName(b.accountId)}</span>;
                      return <span className="text-muted-foreground">—</span>;
                    }},
                    { key: "budgeted", label: "Budgeted", className: "text-right", render: (v) => ((v as number) ?? 0).toLocaleString() },
                    { key: "actual", label: "Actual", className: "text-right", render: (v) => ((v as number) ?? 0).toLocaleString() },
                    { key: "id", label: "Variance", className: "text-right", render: (_v, row) => {
                      const b = row as unknown as Budget;
                      const v = (b.budgeted ?? 0) - (b.actual ?? 0);
                      return <span className={`font-semibold ${v >= 0 ? "text-green-600" : "text-red-600"}`}>{v >= 0 ? "+" : ""}{v.toLocaleString()}</span>;
                    }},
                    { key: "status", label: "Status", render: (v) => <Badge variant={(v as string) === "APPROVED" ? "success" : (v as string) === "CLOSED" ? "secondary" : "warning"}>{v as string}</Badge> },
                    { key: "accountId", label: "", render: (_v, row) => {
                      const b = row as unknown as Budget;
                      return <EditDeleteMenu onEdit={() => { setEditingBudget(b); setBudgetFormOpen(true); }} onDelete={() => store.remove("budgets", b.id)} itemLabel={b.name} compact />;
                    }},
                  ] as Column<Record<string, unknown>>[]}
                  data={store.budgets as unknown as Record<string, unknown>[]}
                  
                  exportable exportFilename="erp-accounting.csv" emptyMessage="No budgets."
                />
              </CardContent></Card>
            </div>
          )}

          {costTab === "allocation" && (
            <div className="space-y-3">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Cost Allocation by Center</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground mb-3">Based on posted journal entry debit lines tagged with cost centers. Total allocated: <span className="font-semibold text-foreground">EGP {(totalAllocated ?? 0).toLocaleString()}</span></div>
                  <div className="space-y-3">
                    {store.costCenters.map((cc) => {
                      const alloc = ccAllocations[cc.id] ?? 0;
                      const pct = totalAllocated > 0 ? (alloc / totalAllocated) * 100 : 0;
                      return (
                        <div key={cc.id} className="space-y-1">
                          <div className="flex justify-between text-sm"><span className="font-medium">{cc.name}</span><span>EGP {(alloc ?? 0).toLocaleString()} ({(pct ?? 0).toFixed(1)}%)</span></div>
                          <div className="h-3 bg-muted rounded-full"><div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
                        </div>
                      );
                    })}
                    {store.costCenters.length === 0 && <p className="text-sm text-muted-foreground">No cost centers defined.</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {costTab === "variance" && (
            <div className="space-y-3">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Budget Variance Analysis</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {store.costCenters.map((cc) => {
                      const variance = cc.budget - cc.actualSpend;
                      const pctBudget = cc.budget > 0 ? (cc.actualSpend / cc.budget) * 100 : 0;
                      const pctActual = cc.budget > 0 ? Math.min(pctBudget, 100) : 0;
                      return (
                        <div key={cc.id} className="border rounded-lg p-4 space-y-2">
                          <div className="flex justify-between items-center">
                            <div><span className="font-medium">{cc.name}</span><span className="text-xs text-muted-foreground ml-2">({cc.code})</span></div>
                            <Badge variant={variance >= 0 ? "success" : "destructive"}>{variance >= 0 ? "Favorable" : "Unfavorable"}</Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div><span className="text-muted-foreground">Budget:</span> <span className="font-semibold">EGP {(cc.budget ?? 0).toLocaleString()}</span></div>
                            <div><span className="text-muted-foreground">Actual:</span> <span className="font-semibold">EGP {(cc.actualSpend ?? 0).toLocaleString()}</span></div>
                            <div><span className="text-muted-foreground">Variance:</span> <span className={`font-semibold ${variance >= 0 ? "text-green-600" : "text-red-600"}`}>{variance >= 0 ? "+" : ""}EGP {(variance ?? 0).toLocaleString()}</span></div>
                          </div>
                          <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${pctBudget > 100 ? "bg-red-500" : pctBudget > 80 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${pctActual}%` }} />
                            <div className="absolute right-2 top-0 h-full flex items-center"><span className="text-[10px] font-medium">{(pctBudget ?? 0).toFixed(0)}%</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {costTab === "product-costing" && (() => {
            const formulas = store.conversionFormulas;
            const productCostData = store.products.map((product) => {
              const productFormulas = formulas.filter((f) => f.productId === product.id);
              let rawMaterialCost = 0;
              if (productFormulas.length > 0) {
                // Use the first formula for costing
                const formula = productFormulas[0];
                rawMaterialCost = formula.ingredients.reduce((sum, ing) => {
                  const rm = store.products.find((p) => p.id === ing.rawMaterialId);
                  return sum + (rm ? ing.quantity * rm.pricePerUnit : 0);
                }, 0);
                // Normalize to per-unit cost based on batch size and yield
                if (formula.batchSize > 0) {
                  rawMaterialCost = rawMaterialCost / (formula.batchSize * (formula.yieldPercent / 100));
                }
              }
              const overhead = rawMaterialCost * 0.15; // 15% overhead
              const totalCost = rawMaterialCost + overhead;
              const sellingPrice = product.pricePerUnit;
              const margin = sellingPrice - totalCost;
              const marginPct = sellingPrice > 0 ? (margin / sellingPrice) * 100 : 0;
              return { product, rawMaterialCost, overhead, totalCost, sellingPrice, margin, marginPct, hasFormula: productFormulas.length > 0 };
            }).filter((d) => d.hasFormula || d.sellingPrice > 0);

            const totalProducts = productCostData.length;
            const withFormula = productCostData.filter((d) => d.hasFormula).length;
            const avgMargin = productCostData.filter((d) => d.hasFormula).reduce((s, d) => s + d.marginPct, 0) / (withFormula || 1);

            return (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Products with Formulas</div><div className="text-lg font-bold text-purple-700">{withFormula} / {totalProducts}</div></CardContent></Card>
                  <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Avg Gross Margin (with formula)</div><div className={`text-lg font-bold ${avgMargin >= 0 ? "text-green-700" : "text-red-600"}`}>{(avgMargin ?? 0).toFixed(1)}%</div></CardContent></Card>
                  <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Overhead Rate</div><div className="text-lg font-bold text-amber-700">15%</div><div className="text-[10px] text-muted-foreground">of raw material cost</div></CardContent></Card>
                </div>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Product Cost & Margin Analysis</CardTitle></CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 text-left">Product</th>
                          <th className="px-3 py-2 text-right">RM Cost/Unit</th>
                          <th className="px-3 py-2 text-right">Overhead (15%)</th>
                          <th className="px-3 py-2 text-right">Total Cost</th>
                          <th className="px-3 py-2 text-right">Selling Price</th>
                          <th className="px-3 py-2 text-right">Margin</th>
                          <th className="px-3 py-2 text-right">Margin %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {productCostData.map((d) => (
                          <tr key={d.product.id} className="hover:bg-muted/30">
                            <td className="px-3 py-2">
                              <div>
                                <span className="font-medium">{d.product.name}</span>
                                <span className="text-xs text-muted-foreground ml-1">({d.product.code})</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground">{d.product.strength} - {d.product.form}</div>
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-xs">
                              {d.hasFormula ? `EGP ${(d.rawMaterialCost ?? 0).toFixed(2)}` : <span className="text-muted-foreground">N/A</span>}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-xs">
                              {d.hasFormula ? `EGP ${(d.overhead ?? 0).toFixed(2)}` : <span className="text-muted-foreground">N/A</span>}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-xs font-semibold">
                              {d.hasFormula ? `EGP ${(d.totalCost ?? 0).toFixed(2)}` : <span className="text-muted-foreground">No formula</span>}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-xs font-semibold">
                              EGP {(d.sellingPrice ?? 0).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {d.hasFormula ? (
                                <span className={`font-semibold ${(d.margin ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                                  EGP {(d.margin ?? 0).toFixed(2)}
                                </span>
                              ) : <span className="text-muted-foreground">--</span>}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {d.hasFormula ? (
                                <Badge className={(d.marginPct ?? 0) >= 30 ? "bg-green-100 text-green-700" : (d.marginPct ?? 0) >= 15 ? "bg-amber-100 text-amber-700" : (d.marginPct ?? 0) >= 0 ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"}>
                                  {(d.marginPct ?? 0).toFixed(1)}%
                                </Badge>
                              ) : <span className="text-muted-foreground">--</span>}
                            </td>
                          </tr>
                        ))}
                        {productCostData.length === 0 && (
                          <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No products found. Add products and conversion formulas to see cost analysis.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </TabsContent>

        {/* ── Sales Orders with Approval Workflow ── */}
        <TabsContent value="sales-orders" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{store.salesOrders.length}</p>
                    <p className="text-xs text-muted-foreground">Total SOs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-2xl font-bold">{pendingSOApprovals.length}</p>
                    <p className="text-xs text-muted-foreground">Pending Approval</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">{store.salesOrders.filter((s) => s.status === "INVOICED").length}</p>
                    <p className="text-xs text-muted-foreground">Invoiced</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-purple-200 bg-purple-50/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold">{egpFmt(store.salesOrders.filter((s) => s.status === "INVOICED").reduce((sum, s) => sum + s.total, 0))}</p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Approvals Section */}
          {pendingSOApprovals.length > 0 && (
            <Card className="border-amber-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Pending SO Approvals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingSOApprovals.map((apr) => {
                    const so = store.salesOrders.find((s) => s.id === apr.entityId);
                    const customer = so ? store.customers.find((c) => c.id === so.customerId) : null;
                    return (
                      <div key={apr.id} className="flex items-center justify-between border rounded-lg p-3 bg-white">
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{apr.title}</p>
                          <p className="text-xs text-muted-foreground">{apr.description}</p>
                          <div className="flex items-center gap-2 text-xs">
                            <Badge variant="outline">{apr.priority}</Badge>
                            {apr.amount && <span className="font-semibold">{egpFmt(apr.amount)}</span>}
                            {customer && <span className="text-muted-foreground">Customer: {customer.name}</span>}
                          </div>
                          {so && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Stock check: {(so.items || []).map((item) => {
                                const prod = store.products.find((p) => p.id === item.productId);
                                if (!prod) return `${item.description}: N/A`;
                                const ok = prod.stockQty >= item.quantity;
                                return `${prod.name}: ${ok ? "OK" : "INSUFFICIENT"} (need ${item.quantity}, have ${prod.stockQty})`;
                              }).join(" | ")}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="h-8 text-red-600 border-red-200 hover:bg-red-50" onClick={() => rejectSOApproval(apr.id, apr.entityId)}>
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                          <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700" onClick={() => approveSOFromApproval(apr.id, apr.entityId)}>
                            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Sales Orders */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">All Sales Orders</CardTitle></CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "number", label: "SO #", render: (v: unknown) => <span className="font-mono text-xs font-semibold">{v as string}</span> },
                  { key: "customerId", label: "Customer", render: (v: unknown) => { const c = store.customers.find((x) => x.id === (v as string)); return c ? c.name : (v as string); } },
                  { key: "total", label: "Total", className: "text-right", render: (v: unknown) => <span className="font-semibold">{egpFmt(v as number)}</span> },
                  { key: "date", label: "Date", render: (v: unknown) => (v as string)?.slice(0, 10) },
                  { key: "status", label: "Status", render: (v: unknown) => {
                    const s = v as string;
                    const colors: Record<string, string> = { DRAFT: "bg-gray-100 text-gray-800", CONFIRMED: "bg-blue-100 text-blue-800", PROCESSING: "bg-indigo-100 text-indigo-800", SHIPPED: "bg-cyan-100 text-cyan-800", DELIVERED: "bg-amber-100 text-amber-800", INVOICED: "bg-green-100 text-green-800", CANCELLED: "bg-red-100 text-red-800" };
                    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[s] ?? "bg-muted"}`}>{s}</span>;
                  }},
                  { key: "id", label: "Actions", className: "text-right", render: (_v: unknown, row: Record<string, unknown>) => {
                    const so = row as unknown as SalesOrder;
                    return (
                      <div className="flex items-center justify-end gap-1">
                        {so.status === "DRAFT" && (
                          <Button size="sm" className="h-7 text-xs" onClick={() => submitSOForApproval(so)}>
                            Submit for Approval
                          </Button>
                        )}
                        {so.invoiceId && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                            const inv = store.invoices.find((i) => i.id === so.invoiceId);
                            const cust = store.customers.find((c) => c.id === so.customerId);
                            if (inv) openInvoicePDF(inv, cust, "customer");
                          }}>
                            <FileText className="h-3.5 w-3.5 mr-1" /> PDF
                          </Button>
                        )}
                      </div>
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={store.salesOrders as unknown as Record<string, unknown>[]}
                emptyMessage="No sales orders."
              />
            </CardContent>
          </Card>

          {/* Approval Flow */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Sales Order Approval Workflow</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <Badge variant="outline">1. DRAFT</Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline" className="bg-blue-50">2. CONFIRMED (Submit for Approval)</Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline" className="bg-amber-50">3. Accounting Reviews + Stock Check</Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline" className="bg-indigo-50">4. Approve → PROCESSING (soApprovalId assigned)</Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline" className="bg-cyan-50">5. SHIPPED → DELIVERED → INVOICED (via SO page)</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Rejected SOs return to DRAFT. Approved SOs move to PROCESSING for stock deduction and fulfillment.</p>
            </CardContent>
          </Card>

          {/* Approval History */}
          {soApprovals.filter((a) => a.status !== "PENDING").length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Approval History</CardTitle></CardHeader>
              <CardContent>
                <div className="border rounded text-xs">
                  <table className="w-full">
                    <thead><tr className="bg-muted/50"><th className="p-2 text-left">SO</th><th className="p-2 text-left">Description</th><th className="p-2 text-right">Amount</th><th className="p-2">Status</th><th className="p-2">Resolved</th><th className="p-2">Comments</th></tr></thead>
                    <tbody>
                      {soApprovals.filter((a) => a.status !== "PENDING").map((a) => (
                        <tr key={a.id} className="border-t">
                          <td className="p-2 font-mono">{a.title}</td>
                          <td className="p-2">{a.description?.slice(0, 60)}</td>
                          <td className="p-2 text-right font-semibold">{a.amount ? egpFmt(a.amount) : "—"}</td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${a.status === "APPROVED" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{a.status}</span>
                          </td>
                          <td className="p-2">{a.resolvedAt ? new Date(a.resolvedAt).toLocaleDateString() : "—"}</td>
                          <td className="p-2 text-muted-foreground">{a.comments ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══ Collections ═══ */}
        <TabsContent value="collections" className="space-y-4">
          {(() => {
            const collectableStatuses = ["SENT", "OVERDUE", "PARTIAL"];
            const collectableInvoices = store.invoices.filter((i) => collectableStatuses.includes(i.status));
            const today = new Date();
            const totalOutstandingAR = collectableInvoices.reduce((s, i) => s + i.total, 0);
            const overdueInvoices = collectableInvoices.filter((i) => {
              const due = new Date(i.dueDate);
              return due < today;
            });
            const overdueCount = overdueInvoices.length;
            const totalInvoiceCount = store.invoices.length;
            const paidCount = store.invoices.filter((i) => i.status === "PAID").length;
            const collectionRate = totalInvoiceCount > 0 ? Math.round((paidCount / totalInvoiceCount) * 100) : 0;

            const getDaysOverdue = (dueDate: string) => {
              const due = new Date(dueDate);
              const diffMs = today.getTime() - due.getTime();
              const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
              return Math.max(0, diffDays);
            };

            // Aging buckets
            const buckets = { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days90plus: 0 };
            collectableInvoices.forEach((inv) => {
              const days = getDaysOverdue(inv.dueDate);
              if (days === 0) buckets.current += inv.total;
              else if (days <= 30) buckets.days1to30 += inv.total;
              else if (days <= 60) buckets.days31to60 += inv.total;
              else if (days <= 90) buckets.days61to90 += inv.total;
              else buckets.days90plus += inv.total;
            });

            const collectionsData = collectableInvoices.map((inv) => {
              const cust = store.customers.find((c) => c.id === inv.customerId);
              return {
                id: inv.id,
                number: inv.number,
                customerName: cust?.name ?? "Unknown",
                customerId: inv.customerId,
                total: inv.total,
                dueDate: inv.dueDate,
                daysOverdue: getDaysOverdue(inv.dueDate),
                status: inv.status,
              };
            });

            return (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="border-blue-200 bg-blue-50/50">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-2xl font-bold">{egpFmt(totalOutstandingAR)}</p>
                          <p className="text-xs text-muted-foreground">Total Outstanding AR</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-red-200 bg-red-50/50">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="text-2xl font-bold">{overdueCount}</p>
                          <p className="text-xs text-muted-foreground">Overdue Invoices</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-green-200 bg-green-50/50">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-2xl font-bold">{collectionRate}%</p>
                          <p className="text-xs text-muted-foreground">Collection Rate</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Aging Buckets */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Aging Buckets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-5 gap-3">
                      {[
                        { label: "Current", amount: buckets.current, color: "bg-green-100 text-green-800" },
                        { label: "1-30 Days", amount: buckets.days1to30, color: "bg-blue-100 text-blue-800" },
                        { label: "31-60 Days", amount: buckets.days31to60, color: "bg-amber-100 text-amber-800" },
                        { label: "61-90 Days", amount: buckets.days61to90, color: "bg-orange-100 text-orange-800" },
                        { label: "90+ Days", amount: buckets.days90plus, color: "bg-red-100 text-red-800" },
                      ].map((b) => (
                        <div key={b.label} className={`rounded-lg p-3 text-center ${b.color}`}>
                          <div className="text-xs font-medium">{b.label}</div>
                          <div className="text-lg font-bold mt-1">{egpFmt(b.amount)}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Collections DataTable */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Outstanding Invoices</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <DataTable
                      columns={[
                        { key: "number", label: "Invoice #", render: (v: unknown) => <span className="font-mono text-xs font-semibold">{v as string}</span> },
                        { key: "customerName", label: "Customer", render: (v: unknown) => <span className="font-medium">{v as string}</span> },
                        { key: "total", label: "Amount", className: "text-right", render: (v: unknown) => <span className="font-semibold">{((v as number) ?? 0).toLocaleString()}</span> },
                        { key: "dueDate", label: "Due Date", render: (v: unknown) => <span className="text-xs">{new Date(v as string).toLocaleDateString()}</span> },
                        { key: "daysOverdue", label: "Days Overdue", className: "text-right", render: (v: unknown) => {
                          const days = v as number;
                          return (
                            <span className={`font-semibold ${days === 0 ? "text-green-600" : days <= 30 ? "text-amber-600" : "text-red-600"}`}>
                              {days}
                            </span>
                          );
                        }},
                        { key: "status", label: "Status", render: (v: unknown) => (
                          <Badge className={
                            (v as string) === "OVERDUE" ? "bg-red-100 text-red-800" :
                            (v as string) === "PARTIAL" ? "bg-amber-100 text-amber-800" :
                            "bg-blue-100 text-blue-800"
                          }>{v as string}</Badge>
                        )},
                        { key: "id", label: "Actions", className: "text-right", render: (v: unknown) => {
                          const invId = v as string;
                          return (
                            <div className="flex items-center justify-end gap-1">
                              <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => {
                                const inv = store.invoices.find((i) => i.id === invId);
                                const oldStatus = inv?.status;
                                store.update("invoices", invId, { status: "PAID" as Invoice["status"] });
                                if (inv) {
                                  const cust = store.customers.find((c) => c.id === inv.customerId);
                                  logAction({ userId: "u-admin", userName: "Admin User", userRole: "ADMIN", action: "UPDATE", module: "ERP", entity: "Invoice", entityId: invId, entityName: `Invoice ${inv.number}`, details: `Invoice status change: ${inv.number} ${oldStatus} -> PAID`, oldValues: { status: oldStatus }, newValues: { status: "PAID" } });
                                  addNotification({ type: "SUCCESS", title: `Payment received for ${inv.number}`, message: `Payment of EGP ${(inv.total ?? 0).toLocaleString()} received from ${cust?.name ?? "Unknown"} for invoice ${inv.number}.`, module: "INVOICE", entityType: "invoice", entityId: invId, actionUrl: "/erp/accounting" });
                                }
                              }}>
                                Mark Paid
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                                const inv = store.invoices.find((i) => i.id === invId);
                                const cust = inv ? store.customers.find((c) => c.id === inv.customerId) : null;
                                alert(`Payment reminder sent to ${cust?.name ?? "customer"} for invoice ${inv?.number ?? invId}.`);
                              }}>
                                Send Reminder
                              </Button>
                            </div>
                          );
                        }},
                      ] as Column<Record<string, unknown>>[]}
                      data={collectionsData as unknown as Record<string, unknown>[]}
                      exportable exportFilename="collections.csv" emptyMessage="No outstanding invoices. All caught up!"
                    />
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </TabsContent>

        {/* ═══ E-Invoicing ═══ */}
        <TabsContent value="einvoicing" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><Send className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Submitted</p><p className="text-2xl font-bold">{einvSubmitted}</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-muted-foreground">Accepted</p><p className="text-2xl font-bold">{einvAccepted}</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-red-100 rounded-lg"><XCircle className="h-5 w-5 text-red-600" /></div><div><p className="text-sm text-muted-foreground">Rejected</p><p className="text-2xl font-bold">{einvRejected}</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-gray-100 rounded-lg"><Clock className="h-5 w-5 text-gray-600" /></div><div><p className="text-sm text-muted-foreground">Drafts</p><p className="text-2xl font-bold">{einvDraft}</p></div></div></CardContent></Card>
          </div>

          <div className="flex gap-2 border-b pb-2">
            <Button variant={einvSubTab === "invoices" ? "default" : "ghost"} size="sm" onClick={() => setEinvSubTab("invoices")}><FileCheck className="h-4 w-4 mr-2" />E-Invoices</Button>
            <Button variant={einvSubTab === "submit" ? "default" : "ghost"} size="sm" onClick={() => setEinvSubTab("submit")}><Send className="h-4 w-4 mr-2" />Submit New</Button>
            <Button variant={einvSubTab === "settings" ? "default" : "ghost"} size="sm" onClick={() => setEinvSubTab("settings")}><Settings className="h-4 w-4 mr-2" />Settings</Button>
            <Button variant={einvSubTab === "taxcodes" ? "default" : "ghost"} size="sm" onClick={() => setEinvSubTab("taxcodes")}><Hash className="h-4 w-4 mr-2" />Tax Codes</Button>
          </div>

          {einvSubTab === "invoices" && (
            <Card>
              <CardHeader><CardTitle className="text-base">E-Invoice Submissions</CardTitle></CardHeader>
              <CardContent>
                <DataTable columns={einvoiceColumns} data={einvoices as unknown as Record<string, unknown>[]} exportable exportFilename="e-invoices" emptyMessage="No e-invoices yet." />
              </CardContent>
            </Card>
          )}

          {einvSubTab === "submit" && (
            <Card>
              <CardHeader><CardTitle className="text-base">Convert Invoice to E-Invoice</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Select Existing Invoice</Label>
                    <select className="w-full rounded-md border px-3 py-2 text-sm mt-1" value={einvSubmitForm.selectedInvoiceId} onChange={e => setEinvSubmitForm(p => ({ ...p, selectedInvoiceId: e.target.value }))}>
                      <option value="">Choose invoice...</option>
                      {(store.invoices || []).map((invoice) => {
                        const inv = invoice as unknown as Record<string, unknown>;
                        return (
                          <option key={String(inv.id)} value={String(inv.id)}>{String(inv.invoiceNumber || inv.id)} — {String(inv.customerName || "N/A")} — EGP {Number(inv.total || 0).toLocaleString()}</option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <Label>Receiver Tax ID</Label>
                    <Input placeholder="XXX-XXX-XXX" value={einvSubmitForm.receiverTaxId} onChange={e => setEinvSubmitForm(p => ({ ...p, receiverTaxId: e.target.value }))} className="mt-1" />
                  </div>
                </div>

                {einvSubmitForm.selectedInvoiceId && (
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">ETA Format Preview</h4>
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
{JSON.stringify({
  issuer: { name: etaConfig.companyName, taxId: etaConfig.taxId || "XXX-XXX-XXX", activityCode: etaConfig.activityCode },
  receiver: { name: "From selected invoice", taxId: einvSubmitForm.receiverTaxId || "XXX-XXX-XXX" },
  documentType: "I",
  documentTypeVersion: "1.0",
  dateTimeIssued: new Date().toISOString(),
  taxpayerActivityCode: etaConfig.activityCode,
}, null, 2)}
                    </pre>
                  </div>
                )}

                <Button onClick={() => convertInvoiceToEInvoice(einvSubmitForm.selectedInvoiceId)} disabled={!einvSubmitForm.selectedInvoiceId}>
                  <FileCheck className="h-4 w-4 mr-2" />Create E-Invoice Draft
                </Button>
              </CardContent>
            </Card>
          )}

          {einvSubTab === "settings" && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings className="h-5 w-5" />ETA Configuration</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Client ID</Label><Input placeholder="ETA Client ID" value={etaConfig.clientId} onChange={e => setEtaConfig(p => ({ ...p, clientId: e.target.value }))} className="mt-1" /></div>
                  <div><Label>Client Secret</Label><Input type="password" placeholder="ETA Client Secret" value={etaConfig.clientSecret} onChange={e => setEtaConfig(p => ({ ...p, clientSecret: e.target.value }))} className="mt-1" /></div>
                  <div><Label>Environment</Label>
                    <select className="w-full rounded-md border px-3 py-2 text-sm mt-1" value={etaConfig.environment} onChange={e => setEtaConfig(p => ({ ...p, environment: e.target.value }))}>
                      <option value="sandbox">Sandbox (Pre-production)</option>
                      <option value="production">Production</option>
                    </select>
                  </div>
                  <div><Label>Company Tax ID</Label><Input placeholder="XXX-XXX-XXX" value={etaConfig.taxId} onChange={e => setEtaConfig(p => ({ ...p, taxId: e.target.value }))} className="mt-1" /></div>
                  <div><Label>Company Name</Label><Input value={etaConfig.companyName} onChange={e => setEtaConfig(p => ({ ...p, companyName: e.target.value }))} className="mt-1" /></div>
                  <div><Label>Activity Code (ISIC4)</Label><Input value={etaConfig.activityCode} onChange={e => setEtaConfig(p => ({ ...p, activityCode: e.target.value }))} className="mt-1" /></div>
                </div>
                <Button size="sm" onClick={saveETAConfig}>Save Configuration</Button>

                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm">
                  <p className="font-medium text-blue-800 mb-2">ETA Integration Setup</p>
                  <ol className="list-decimal ml-5 space-y-1 text-blue-700">
                    <li>Register at the ETA portal (invoicing.eta.gov.eg)</li>
                    <li>Obtain Client ID and Client Secret credentials</li>
                    <li>Configure your Tax ID and company information above</li>
                    <li>Test in Sandbox mode before switching to Production</li>
                    <li>Ensure your ERP code (ISIC4 activity code) is correct</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}

          {einvSubTab === "taxcodes" && (
            <Card>
              <CardHeader><CardTitle className="text-base">ETA Tax Type Reference</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Code</th>
                    <th className="text-left p-3 font-medium">Tax Type</th>
                    <th className="text-left p-3 font-medium">Sub-Type</th>
                    <th className="text-right p-3 font-medium">Rate %</th>
                    <th className="text-left p-3 font-medium">Description</th>
                  </tr></thead>
                  <tbody>
                    {TAX_CODES.map(tc => (
                      <tr key={tc.code} className="border-b hover:bg-muted/50">
                        <td className="p-3"><span className="px-2 py-0.5 rounded text-xs font-mono bg-purple-100 text-purple-800">{tc.code}</span></td>
                        <td className="p-3 font-medium">{tc.name}</td>
                        <td className="p-3 font-mono text-xs">{tc.subtype}</td>
                        <td className="p-3 text-right">{tc.rate}%</td>
                        <td className="p-3 text-muted-foreground">{tc.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══ Assets ═══ */}
        <TabsContent value="assets" className="space-y-4">
          <div className="flex items-center justify-end">
            <Button onClick={() => { setAssetEditing(null); setAssetModalOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Asset</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><Monitor className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Total Assets</p><p className="text-2xl font-bold">{assets.length}</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><Monitor className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-muted-foreground">Active</p><p className="text-2xl font-bold">{assets.filter(a => a.status === "ACTIVE").length}</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-yellow-100 rounded-lg"><Wrench className="h-5 w-5 text-yellow-600" /></div><div><p className="text-sm text-muted-foreground">In Maintenance</p><p className="text-2xl font-bold">{assets.filter(a => a.status === "MAINTENANCE").length}</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><DollarSign className="h-5 w-5 text-purple-600" /></div><div><p className="text-sm text-muted-foreground">Total Value</p><p className="text-2xl font-bold">{assetFmt(assetTotalValue)}</p></div></div></CardContent></Card>
          </div>

          <div className="flex gap-2 border-b pb-2">
            {["registry", "maintenance"].map(t => (
              <Button key={t} variant={assetSubTab === t ? "default" : "ghost"} size="sm" onClick={() => setAssetSubTab(t)}>
                {t === "registry" ? "Asset Registry" : "Maintenance Schedule"}
              </Button>
            ))}
          </div>

          {assetSubTab === "registry" && (
            <Card><CardContent className="pt-6 space-y-4">
              <FilterBar
                searchValue={assetFilters._search}
                onSearchChange={(v) => setAssetFilters((f) => ({ ...f, _search: v }))}
                fields={[{ key: "status", label: "Status", type: "select", options: [
                  { label: "Active", value: "ACTIVE" }, { label: "Maintenance", value: "MAINTENANCE" },
                  { label: "Retired", value: "RETIRED" }, { label: "Disposed", value: "DISPOSED" },
                ]}]}
                values={assetFilters}
                onChange={(k, v) => setAssetFilters((f) => ({ ...f, [k]: v }))}
              />
              <DataTable
                columns={[
                  { key: "name", label: "Asset", render: (v) => <span className="font-medium">{v as string}</span> },
                  { key: "assetTag", label: "Tag", className: "text-gray-500" },
                  { key: "category", label: "Category" },
                  { key: "location", label: "Location" },
                  { key: "assignedTo", label: "Assigned To" },
                  { key: "currentValue", label: "Value", className: "text-right", render: (v) => assetFmt(v as number) },
                  { key: "warrantyExpiry", label: "Warranty" },
                  { key: "status", label: "Status", render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${assetStatusColor[v as string]}`}>{v as string}</span> },
                  { key: "id", label: "", render: (_v, row) => {
                    const a = row as unknown as typeof initialAssets[0];
                    return (
                      <EditDeleteMenu
                        onEdit={() => { setAssetEditing(a); setAssetModalOpen(true); }}
                        onDelete={() => setAssets(prev => prev.filter(x => x.id !== a.id))}
                        onView={() => setAssetDetailItem(a)}
                        canView
                        itemLabel={a.name}
                        extraItems={(() => {
                          const flow: Record<string, string> = { ACTIVE: "MAINTENANCE", MAINTENANCE: "ACTIVE", RETIRED: "DISPOSED" };
                          const next = flow[a.status];
                          if (!next) return [];
                          return [{ label: `Set ${next}`, onClick: () => setAssets(prev => prev.map(x => x.id === a.id ? { ...x, status: next } : x)) }];
                        })()}
                      />
                    );
                  }},
                ] satisfies Column<Record<string, unknown>>[]}
                data={filteredAssets as unknown as Record<string, unknown>[]}
                exportable exportFilename="erp-assets.csv" emptyMessage="No assets match your filters."
              />
            </CardContent></Card>
          )}

          {assetSubTab === "maintenance" && (
            <Card><CardContent className="pt-6">
              <DataTable
                columns={[
                  { key: "asset", label: "Asset", render: (v) => <span className="font-medium">{v as string}</span> },
                  { key: "type", label: "Type", render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${(v as string) === "PREVENTIVE" ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"}`}>{v as string}</span> },
                  { key: "description", label: "Description" },
                  { key: "scheduledDate", label: "Scheduled" },
                  { key: "completedDate", label: "Completed", render: (v) => <>{(v as string | null) || "—"}</> },
                  { key: "cost", label: "Cost", className: "text-right", render: (v) => <>{(v as number) > 0 ? assetFmt(v as number) : "—"}</> },
                  { key: "status", label: "Status", render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${assetStatusColor[v as string]}`}>{v as string}</span> },
                ] satisfies Column<Record<string, unknown>>[]}
                data={assetMaintenanceRecords as unknown as Record<string, unknown>[]}
                exportable exportFilename="erp-maintenance.csv" emptyMessage="No maintenance records found."
              />
            </CardContent></Card>
          )}
        </TabsContent>
      </Tabs>

      {/* JE Detail dialog */}
      <Dialog open={!!jeDetail} onOpenChange={(open) => { if (!open) { setJeDetailId(null); setJeNewLine({ accountId: "", description: "", debit: 0, credit: 0, costCenterId: "" }); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" /> {jeDetail?.number} — Journal Entry Detail</DialogTitle></DialogHeader>
          {jeDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Date:</span> {new Date(jeDetail.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
                <div><span className="text-muted-foreground">Type:</span> {jeBadge(jeDetail.type)}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Description:</span> {jeDetail.description}</div>
                {jeDetail.reference && <div className="col-span-2"><span className="text-muted-foreground">Reference:</span> <span className="font-mono text-xs">{jeDetail.reference}</span></div>}
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr><th className="px-3 py-2 text-left">Account</th><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-right">Debit</th><th className="px-3 py-2 text-right">Credit</th><th className="px-3 py-2 text-left">Cost Center</th>{jeDetail.status === "DRAFT" && <th className="px-3 py-2 w-8" />}</tr></thead>
                  <tbody className="divide-y">
                    {(jeDetail.lines || []).map((l, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono text-xs">{glName(l.accountId)}</td>
                        <td className="px-3 py-2 text-xs">{l.description ?? "—"}</td>
                        <td className="px-3 py-2 text-right font-semibold text-red-600">{(l.debit ?? 0) > 0 ? (l.debit ?? 0).toLocaleString() : "—"}</td>
                        <td className="px-3 py-2 text-right font-semibold text-green-600">{(l.credit ?? 0) > 0 ? (l.credit ?? 0).toLocaleString() : "—"}</td>
                        <td className="px-3 py-2 text-xs">{l.costCenterId ? ccName(l.costCenterId) : "—"}</td>
                        {jeDetail.status === "DRAFT" && (
                          <td className="px-3 py-2">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-700" onClick={() => {
                              const updatedLines = [...jeDetail.lines];
                              updatedLines.splice(i, 1);
                              store.update("journalEntries", jeDetail.id, { lines: updatedLines });
                            }}><XCircle className="h-3.5 w-3.5" /></Button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {(jeDetail.lines || []).length === 0 && <tr><td colSpan={jeDetail.status === "DRAFT" ? 6 : 5} className="px-3 py-4 text-center text-muted-foreground">No lines yet. Add lines below.</td></tr>}
                  </tbody>
                  <tfoot className="bg-muted/30 font-semibold">
                    <tr>
                      <td colSpan={2} className="px-3 py-2">Total</td>
                      <td className="px-3 py-2 text-right">{(jeDetail.lines || []).reduce((s, l) => s + (l.debit ?? 0), 0).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{(jeDetail.lines || []).reduce((s, l) => s + (l.credit ?? 0), 0).toLocaleString()}</td>
                      <td colSpan={jeDetail.status === "DRAFT" ? 2 : 1} />
                    </tr>
                  </tfoot>
                </table>
              </div>
              {(() => {
                const totalDebit = (jeDetail.lines || []).reduce((s, l) => s + l.debit, 0);
                const totalCredit = (jeDetail.lines || []).reduce((s, l) => s + l.credit, 0);
                const diff = totalDebit - totalCredit;
                if ((jeDetail.lines || []).length > 0 && diff !== 0) {
                  return (
                    <div className="flex items-center gap-2 text-xs px-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-amber-700">Unbalanced: difference of {Math.abs(diff).toLocaleString()} ({diff > 0 ? "debit exceeds credit" : "credit exceeds debit"})</span>
                    </div>
                  );
                }
                return null;
              })()}
              {jeDetail.status === "DRAFT" && (
                <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Add Line</p>
                  <div className="grid grid-cols-5 gap-2">
                    <div>
                      <Label className="text-xs">Account</Label>
                      <select className="w-full rounded-md border px-2 py-1.5 text-xs mt-0.5" value={jeNewLine.accountId} onChange={(e) => setJeNewLine((p) => ({ ...p, accountId: e.target.value }))}>
                        <option value="">Select account...</option>
                        {store.glAccounts.filter((a) => a.isActive).map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Input className="h-7 text-xs mt-0.5" value={jeNewLine.description} onChange={(e) => setJeNewLine((p) => ({ ...p, description: e.target.value }))} placeholder="Line description" />
                    </div>
                    <div>
                      <Label className="text-xs">Debit</Label>
                      <Input className="h-7 text-xs mt-0.5" type="number" min={0} value={jeNewLine.debit || ""} onChange={(e) => setJeNewLine((p) => ({ ...p, debit: Number(e.target.value) || 0 }))} placeholder="0" />
                    </div>
                    <div>
                      <Label className="text-xs">Credit</Label>
                      <Input className="h-7 text-xs mt-0.5" type="number" min={0} value={jeNewLine.credit || ""} onChange={(e) => setJeNewLine((p) => ({ ...p, credit: Number(e.target.value) || 0 }))} placeholder="0" />
                    </div>
                    <div>
                      <Label className="text-xs">Cost Center</Label>
                      <select className="w-full rounded-md border px-2 py-1.5 text-xs mt-0.5" value={jeNewLine.costCenterId} onChange={(e) => setJeNewLine((p) => ({ ...p, costCenterId: e.target.value }))}>
                        <option value="">None</option>
                        {store.costCenters.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <Button size="sm" className="h-7 text-xs" disabled={!jeNewLine.accountId || (jeNewLine.debit === 0 && jeNewLine.credit === 0)} onClick={() => {
                    const newLine = { accountId: jeNewLine.accountId, description: jeNewLine.description || undefined, debit: jeNewLine.debit, credit: jeNewLine.credit, costCenterId: jeNewLine.costCenterId || undefined };
                    store.update("journalEntries", jeDetail.id, { lines: [...jeDetail.lines, newLine] });
                    setJeNewLine({ accountId: "", description: "", debit: 0, credit: 0, costCenterId: "" });
                  }}><Plus className="h-3 w-3 mr-1" /> Add Line</Button>
                </div>
              )}
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Status: <Badge variant={jeDetail.status === "POSTED" ? "success" : jeDetail.status === "VOID" ? "destructive" : "warning"}>{jeDetail.status}</Badge></span>
                <div className="flex items-center gap-2">
                  <span>Created: {new Date(jeDetail.createdAt).toLocaleDateString()}</span>
                  {jeDetail.status === "DRAFT" && (
                    <Button size="sm" className="h-6 text-xs bg-green-600 hover:bg-green-700" onClick={() => {
                      store.update("journalEntries", jeDetail.id, { status: "POSTED" as JournalEntry["status"] });
                      logAction({ userId: "u-admin", userName: "Admin User", userRole: "ADMIN", action: "UPDATE", module: "ERP", entity: "JournalEntry", entityId: jeDetail.id, entityName: `JE ${jeDetail.number}`, details: `Journal entry posted: ${jeDetail.number}`, oldValues: { status: "DRAFT" }, newValues: { status: "POSTED" } });
                    }}>Post</Button>
                  )}
                  {jeDetail.status === "POSTED" && (
                    <Button size="sm" variant="destructive" className="h-6 text-xs" onClick={() => {
                      store.update("journalEntries", jeDetail.id, { status: "VOID" as JournalEntry["status"] });
                      logAction({ userId: "u-admin", userName: "Admin User", userRole: "ADMIN", action: "UPDATE", module: "ERP", entity: "JournalEntry", entityId: jeDetail.id, entityName: `JE ${jeDetail.number}`, details: `Journal entry voided: ${jeDetail.number}`, oldValues: { status: "POSTED" }, newValues: { status: "VOID" } });
                    }}>Void</Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Statement dialog */}
      <Dialog open={!!statementParty} onOpenChange={(open) => { if (!open) setStatementParty(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ScrollText className="h-5 w-5" /> Account Statement</DialogTitle>
          </DialogHeader>
          {statementParty && (() => {
            const isCustomer = statementParty.type === "customer";
            const entity = isCustomer ? store.customers.find((c) => c.id === statementParty.id) : store.vendors.find((v) => v.id === statementParty.id);
            if (!entity) return null;
            const invoices = isCustomer ? store.invoices.filter((i) => i.customerId === statementParty.id) : [];
            const payments = store.payments.filter((p) => isCustomer ? p.customerId === statementParty.id : p.vendorId === statementParty.id);
            const cheques = store.cheques.filter((c) => c.partyName === entity.name);
            const lines: { date: string; description: string; debit: number; credit: number }[] = [];
            invoices.forEach((i) => lines.push({ date: i.date.slice(0, 10), description: `Invoice ${i.number}`, debit: i.total, credit: 0 }));
            payments.forEach((p) => lines.push({ date: p.date, description: `Payment ${p.reference}`, debit: 0, credit: p.amount }));
            cheques.forEach((c) => lines.push({ date: c.issueDate.slice(0, 10), description: `Cheque ${c.number} (${c.status})`, debit: c.type === "OUTGOING" ? c.amount : 0, credit: c.type === "INCOMING" ? c.amount : 0 }));
            lines.sort((a, b) => a.date.localeCompare(b.date));
            let balance = 0;
            const withBalance = lines.map((l) => { balance += l.debit - l.credit; return { ...l, balance }; });
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold">{entity.name}</p>
                    <p className="text-sm text-muted-foreground">{"code" in entity ? entity.code : ""} · Outstanding: EGP {(entity.outstanding ?? 0).toLocaleString()}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    const html = buildPrintableReport({
                      title: `Account Statement — ${entity.name}`,
                      subtitle: `${"code" in entity ? entity.code : ""} · Generated ${new Date().toLocaleDateString()}`,
                      sections: [{ heading: "Transactions", rows: withBalance.map((l) => ({ Date: l.date, Description: l.description, Debit: l.debit ? `EGP ${l.debit.toLocaleString()}` : "—", Credit: l.credit ? `EGP ${l.credit.toLocaleString()}` : "—", Balance: `EGP ${l.balance.toLocaleString()}` })) }],
                    });
                    downloadHTML(`statement-${entity.name.replace(/\s+/g, "-").toLowerCase()}.html`, html);
                  }}><Download className="h-4 w-4 mr-1" /> Download</Button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50"><tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-right">Debit</th><th className="px-3 py-2 text-right">Credit</th><th className="px-3 py-2 text-right">Balance</th></tr></thead>
                    <tbody className="divide-y">
                      {withBalance.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">No transactions found.</td></tr>}
                      {withBalance.map((l, i) => (
                        <tr key={i} className="hover:bg-muted/30">
                          <td className="px-3 py-2 font-mono text-xs">{l.date}</td>
                          <td className="px-3 py-2">{l.description}</td>
                          <td className="px-3 py-2 text-right text-red-600">{l.debit ? `EGP ${l.debit.toLocaleString()}` : "—"}</td>
                          <td className="px-3 py-2 text-right text-green-600">{l.credit ? `EGP ${l.credit.toLocaleString()}` : "—"}</td>
                          <td className="px-3 py-2 text-right font-semibold">{`EGP ${l.balance.toLocaleString()}`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Bank Account modal */}
      <EntityFormModal
        open={bankFormOpen} onOpenChange={(open) => { setBankFormOpen(open); if (!open) setEditingBank(null); }}
        title={editingBank ? `Edit ${editingBank.name}` : "Add Bank Account"}
        fields={[
          { name: "code", label: "Code", type: "text", placeholder: "Auto-generated if empty", helperText: "Leave blank for auto-generated code" },
          { name: "name", label: "Account Name", type: "text", required: true },
          { name: "bankName", label: "Bank Name", type: "text", required: true },
          { name: "accountNumber", label: "Account Number", type: "text", required: true },
          { name: "iban", label: "IBAN", type: "text" },
          { name: "currency", label: "Currency", type: "select", defaultValue: "EGP", options: [{ label: "EGP", value: "EGP" }] },
          { name: "balance", label: "Balance", type: "number", required: true },
          { name: "type", label: "Type", type: "select", defaultValue: "CURRENT", options: [{ label: "Current", value: "CURRENT" }, { label: "Savings", value: "SAVINGS" }, { label: "Foreign Currency", value: "FOREIGN_CURRENCY" }] },
          { name: "status", label: "Status", type: "select", defaultValue: "ACTIVE", options: [{ label: "Active", value: "ACTIVE" }, { label: "Dormant", value: "DORMANT" }, { label: "Closed", value: "CLOSED" }] },
        ] as EntityField[]}
        initialData={editingBank ? { code: editingBank.code, name: editingBank.name, bankName: editingBank.bankName, accountNumber: editingBank.accountNumber, iban: editingBank.iban ?? "", currency: editingBank.currency, balance: editingBank.balance, type: editingBank.type, status: editingBank.status } : undefined}
        onSubmit={(data) => {
          const payload = { code: String(data.code), name: String(data.name), bankName: String(data.bankName), accountNumber: String(data.accountNumber), iban: data.iban ? String(data.iban) : undefined, currency: String(data.currency || "EGP"), balance: Number(data.balance), type: String(data.type) as BankAccount["type"], status: String(data.status) as BankAccount["status"], openedAt: editingBank?.openedAt ?? new Date().toISOString() };
          if (editingBank) store.update("bankAccounts", editingBank.id, payload);
          else { const code = payload.code.trim() || store.generateBankCode(); store.add("bankAccounts", { id: store.genId("ba"), ...payload, code }); }
          setBankFormOpen(false); setEditingBank(null);
        }}
      />

      {/* Customer modal */}
      <EntityFormModal
        open={custFormOpen} onOpenChange={(open) => { setCustFormOpen(open); if (!open) setEditingCustomer(null); }}
        title={editingCustomer ? `Edit ${editingCustomer.name}` : "Add Customer"}
        fields={customerFields}
        initialData={editingCustomer ? { code: editingCustomer.code, name: editingCustomer.name, type: editingCustomer.type, phone: editingCustomer.phone, email: editingCustomer.email, address: editingCustomer.address, city: editingCustomer.city ?? "", creditLimit: editingCustomer.creditLimit, outstanding: editingCustomer.outstanding, currency: editingCustomer.currency, paymentTerms: editingCustomer.paymentTerms, status: editingCustomer.status } : undefined}
        onSubmit={handleCustomerSubmit}
        submitLabel={editingCustomer ? "Save" : "Create"}
        size="xl"
      />
      {/* Vendor modal */}
      <EntityFormModal
        open={vendFormOpen} onOpenChange={(open) => { setVendFormOpen(open); if (!open) setEditingVendor(null); }}
        title={editingVendor ? `Edit ${editingVendor.name}` : "Add Vendor"}
        fields={vendorFields}
        initialData={editingVendor ? { code: editingVendor.code, name: editingVendor.name, category: editingVendor.category, phone: editingVendor.phone, email: editingVendor.email, address: editingVendor.address, outstanding: editingVendor.outstanding, paymentTerms: editingVendor.paymentTerms, gmpCertified: editingVendor.gmpCertified } : undefined}
        onSubmit={handleVendorSubmit}
        submitLabel={editingVendor ? "Save" : "Create"}
      />
      {/* Cheque modal */}
      <EntityFormModal
        open={chequeFormOpen} onOpenChange={(open) => { setChequeFormOpen(open); if (!open) setEditingCheque(null); }}
        title={editingCheque ? `Edit Cheque ${editingCheque.number}` : "Add Cheque"}
        fields={chequeFields}
        initialData={editingCheque ? { number: editingCheque.number, bankName: editingCheque.bankName, type: editingCheque.type, partySelect: editingCheque.partyId && editingCheque.partyType ? `${editingCheque.partyType}:${editingCheque.partyId}` : "", amount: editingCheque.amount, currency: editingCheque.currency, issueDate: editingCheque.issueDate.slice(0, 10), dueDate: editingCheque.dueDate.slice(0, 10), status: editingCheque.status, notes: editingCheque.notes ?? "" } : undefined}
        onSubmit={handleChequeSubmit}
        submitLabel={editingCheque ? "Save" : "Create"}
      />
      {/* Invoice modal */}
      <EntityFormModal
        open={invFormOpen} onOpenChange={(open) => { setInvFormOpen(open); if (!open) setEditingInvoice(null); }}
        title={editingInvoice ? `Edit ${editingInvoice.number}` : "Add Invoice"}
        fields={invoiceFields}
        initialData={editingInvoice ? { number: editingInvoice.number, customerId: editingInvoice.customerId, date: editingInvoice.date.slice(0, 10), dueDate: editingInvoice.dueDate.slice(0, 10), productId: (editingInvoice.items || [])[0]?.productId ?? "", quantity: (editingInvoice.items || [])[0]?.quantity ?? 1, unitPrice: (editingInvoice.items || [])[0]?.unitPrice ?? 0, subtotal: editingInvoice.subtotal, tax: editingInvoice.tax, total: editingInvoice.total, status: editingInvoice.status, notes: editingInvoice.notes ?? "" } : undefined}
        onSubmit={handleInvoiceSubmit}
        submitLabel={editingInvoice ? "Save" : "Create"}
      />
      {/* GL Account modal */}
      <EntityFormModal open={glFormOpen} onOpenChange={(open) => { setGlFormOpen(open); if (!open) setEditingGL(null); }} title={editingGL ? `Edit ${editingGL.name}` : "Add GL Account"} fields={glFields}
        initialData={editingGL ? { code: editingGL.code, name: editingGL.name, type: editingGL.type, subType: editingGL.subType, balance: editingGL.balance, isActive: editingGL.isActive } : undefined}
        onSubmit={handleGLSubmit} submitLabel={editingGL ? "Save" : "Create"} />
      {/* Journal Entry modal */}
      <EntityFormModal open={jeFormOpen} onOpenChange={(open) => { setJeFormOpen(open); if (!open) setEditingJE(null); }} title={editingJE ? `Edit ${editingJE.number}` : "New Journal Entry"} fields={jeFields}
        initialData={editingJE ? { date: editingJE.date.slice(0, 10), description: editingJE.description, reference: editingJE.reference ?? "", type: editingJE.type } : undefined}
        onSubmit={handleJESubmit} submitLabel={editingJE ? "Save" : "Create"} />
      {/* Cost Center modal */}
      <EntityFormModal open={ccFormOpen} onOpenChange={(open) => { setCcFormOpen(open); if (!open) setEditingCC(null); }} title={editingCC ? `Edit ${editingCC.name}` : "Add Cost Center"} fields={ccFields}
        initialData={editingCC ? { code: editingCC.code, name: editingCC.name, type: editingCC.type, budget: editingCC.budget, actualSpend: editingCC.actualSpend, isActive: editingCC.isActive } : undefined}
        onSubmit={handleCCSubmit} submitLabel={editingCC ? "Save" : "Create"} />
      {/* Budget modal */}
      <EntityFormModal open={budgetFormOpen} onOpenChange={(open) => { setBudgetFormOpen(open); if (!open) setEditingBudget(null); }} title={editingBudget ? `Edit ${editingBudget.name}` : "Add Budget"} fields={budgetFields}
        initialData={editingBudget ? { name: editingBudget.name, fiscalYear: editingBudget.fiscalYear, period: editingBudget.period, accountId: editingBudget.accountId ?? "", costCenterId: editingBudget.costCenterId ?? "", budgeted: editingBudget.budgeted, actual: editingBudget.actual, status: editingBudget.status } : undefined}
        onSubmit={handleBudgetSubmit} submitLabel={editingBudget ? "Save" : "Create"} />

      {/* Customer Documents dialog */}
      <Dialog open={custDocDialogOpen} onOpenChange={(open) => { if (!open) { setCustDocDialogOpen(false); setDocCustomerId(null); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5" />
              Documents {docCustomer ? `— ${docCustomer.name}` : ""}
            </DialogTitle>
          </DialogHeader>
          {docCustomer && (
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
                        ref={custDocInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                        className="hidden"
                        onChange={handleDocUpload}
                      />
                      <Button size="sm" onClick={() => custDocInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-1" /> Choose File
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Document list */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Uploaded Documents ({(docCustomer.documents ?? []).length})</p>
                {(docCustomer.documents ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">No documents uploaded yet.</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Type</th>
                          <th className="px-3 py-2 text-left">Uploaded</th>
                          <th className="px-3 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(docCustomer.documents ?? []).map((doc) => (
                          <tr key={doc.id} className="hover:bg-muted/30">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                                <span className="truncate max-w-[200px]">{doc.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant="outline" className="text-[10px]">{doc.type}</Badge>
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {new Date(doc.uploadedAt).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex items-center gap-1 justify-end">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => viewDocument(doc)} title="View / Download">
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
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeDocument(docCustomer.id, doc.id)} title="Delete">
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* E-Invoice view dialog */}
      <Dialog open={!!viewEInvoice} onOpenChange={o => !o && setViewEInvoice(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>E-Invoice: {viewEInvoice?.internalId}</DialogTitle></DialogHeader>
          {viewEInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Receiver</span><p className="font-medium">{viewEInvoice.receiverName}</p></div>
                <div><span className="text-muted-foreground">Tax ID</span><p className="font-mono">{viewEInvoice.receiverTaxId}</p></div>
                <div><span className="text-muted-foreground">Date</span><p className="font-medium">{viewEInvoice.dateIssued}</p></div>
                <div><span className="text-muted-foreground">Status</span><p><span className={`px-2 py-0.5 rounded-full text-xs capitalize ${einvoiceStatusColors[viewEInvoice.status]}`}>{viewEInvoice.status}</span></p></div>
                <div><span className="text-muted-foreground">Net Amount</span><p className="font-medium">EGP {(viewEInvoice.netAmount ?? 0).toLocaleString()}</p></div>
                <div><span className="text-muted-foreground">VAT (14%)</span><p className="font-medium">EGP {(viewEInvoice.vatAmount ?? 0).toLocaleString()}</p></div>
                <div><span className="text-muted-foreground">Total</span><p className="font-bold text-lg">EGP {(viewEInvoice.totalAmount ?? 0).toLocaleString()}</p></div>
                <div><span className="text-muted-foreground">ETA UUID</span><p className="font-mono text-xs">{viewEInvoice.uuid || "—"}</p></div>
              </div>
              {(viewEInvoice.items || []).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Line Items</h4>
                  <table className="w-full text-xs">
                    <thead><tr className="border-b"><th className="text-left p-2">Description</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Unit Price</th><th className="text-right p-2">Total</th></tr></thead>
                    <tbody>{(viewEInvoice.items || []).map((item, i) => (
                      <tr key={i} className="border-b"><td className="p-2">{item.description}</td><td className="p-2 text-right">{item.quantity}</td><td className="p-2 text-right">{(item.unitPrice ?? 0).toLocaleString()}</td><td className="p-2 text-right font-medium">{(item.total ?? 0).toLocaleString()}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Asset form modal */}
      <EntityFormModal
        open={assetModalOpen}
        onOpenChange={(open) => { setAssetModalOpen(open); if (!open) setAssetEditing(null); }}
        title={assetEditing ? "Edit Asset" : "Register New Asset"}
        fields={assetFields}
        initialData={assetEditing ? { name: assetEditing.name, category: assetEditing.category, purchasePrice: assetEditing.purchasePrice, location: assetEditing.location, assignedTo: assetEditing.assignedTo } : undefined}
        onSubmit={(data) => {
          if (assetEditing) {
            setAssets(prev => prev.map(a => a.id === assetEditing.id ? { ...a, name: data.name as string, category: (data.category as string) || a.category, purchasePrice: (data.purchasePrice as number) || a.purchasePrice, location: (data.location as string) || a.location, assignedTo: (data.assignedTo as string) || a.assignedTo } : a));
          } else {
            setAssets(prev => { const uid = Date.now().toString(36); return [...prev, { id: uid, name: data.name as string, assetTag: `AST-${uid}`, category: (data.category as string) || "Other", status: "ACTIVE", purchaseDate: new Date().toISOString().split("T")[0], purchasePrice: (data.purchasePrice as number) || 0, currentValue: (data.purchasePrice as number) || 0, location: (data.location as string) || "Office", assignedTo: (data.assignedTo as string) || "Unassigned", warrantyExpiry: "2027-01-01" }]; });
          }
          setAssetModalOpen(false); setAssetEditing(null);
        }}
      />

      {/* Asset Detail Dialog */}
      <Dialog open={!!assetDetailItem} onOpenChange={(open) => { if (!open) setAssetDetailItem(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{assetDetailItem?.name}</DialogTitle>
          </DialogHeader>
          {assetDetailItem && (() => {
            const depreciationPct = assetDetailItem.purchasePrice > 0 ? Math.round((assetDetailItem.currentValue / assetDetailItem.purchasePrice) * 100) : 0;
            const warrantyActive = new Date(assetDetailItem.warrantyExpiry) > new Date();
            const relatedMaintenance = assetMaintenanceRecords.filter(m => m.asset === assetDetailItem.name);
            return (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-sm text-muted-foreground">Asset Tag</span><p className="font-medium font-mono">{assetDetailItem.assetTag}</p></div>
                  <div><span className="text-sm text-muted-foreground">Category</span><p className="font-medium">{assetDetailItem.category}</p></div>
                  <div><span className="text-sm text-muted-foreground">Status</span><p><span className={`px-2 py-1 rounded-full text-xs font-medium ${assetStatusColor[assetDetailItem.status]}`}>{assetDetailItem.status}</span></p></div>
                  <div><span className="text-sm text-muted-foreground">Location</span><p className="font-medium">{assetDetailItem.location}</p></div>
                  <div><span className="text-sm text-muted-foreground">Assigned To</span><p className="font-medium">{assetDetailItem.assignedTo}</p></div>
                  <div><span className="text-sm text-muted-foreground">Purchase Date</span><p className="font-medium">{assetDetailItem.purchaseDate}</p></div>
                  <div><span className="text-sm text-muted-foreground">Purchase Price</span><p className="font-medium">{assetFmt(assetDetailItem.purchasePrice)}</p></div>
                  <div><span className="text-sm text-muted-foreground">Current Value</span><p className="font-medium">{assetFmt(assetDetailItem.currentValue)}</p></div>
                  <div><span className="text-sm text-muted-foreground">Warranty Expiry</span><p className={`font-medium ${warrantyActive ? "text-green-600" : "text-red-600"}`}>{assetDetailItem.warrantyExpiry} {warrantyActive ? "(Active)" : "(Expired)"}</p></div>
                </div>
                {/* Depreciation Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Remaining Value</span>
                    <span className="font-medium">{depreciationPct}% &mdash; {assetFmt(assetDetailItem.currentValue)} / {assetFmt(assetDetailItem.purchasePrice)}</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${depreciationPct >= 60 ? "bg-green-500" : depreciationPct >= 30 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${depreciationPct}%` }} />
                  </div>
                </div>
                {/* Related Maintenance */}
                {relatedMaintenance.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Maintenance History ({relatedMaintenance.length})</h4>
                    <div className="border rounded-lg divide-y">
                      {relatedMaintenance.map((m) => (
                        <div key={m.id} className="flex items-center justify-between px-3 py-2 text-sm">
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{m.description}</span>
                            <span className="text-muted-foreground ml-2 text-xs">{m.type}</span>
                          </div>
                          <div className="flex items-center gap-2 ml-2 shrink-0">
                            <span className="text-xs text-muted-foreground">{m.scheduledDate}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${assetStatusColor[m.status]}`}>{m.status}</span>
                          </div>
                        </div>
                      ))}
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
