"use client";

import { useMemo, useState, useRef } from "react";
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
import {
  useDataStore,
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
} from "lucide-react";
import { downloadCSV, downloadHTML, buildPrintableReport } from "@/lib/download";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n/i18n-context";
import { PartnerLink } from "@/components/shared/partner-link";

export default function AccountingPage() {
  const store = useDataStore();
  const approvals = useApprovals();
  const { t } = useTranslation();
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

  // Journal Entry state
  const [jeSearch, setJeSearch] = useState("");
  const [jeFilters, setJeFilters] = useState<FilterState>({});
  const [jeFormOpen, setJeFormOpen] = useState(false);
  const [editingJE, setEditingJE] = useState<JournalEntry | null>(null);
  const [jeDetailId, setJeDetailId] = useState<string | null>(null);
  const [jeNewLine, setJeNewLine] = useState({ accountId: "", description: "", debit: 0, credit: 0, costCenterId: "" });

  // Cost Accounting state
  const [costTab, setCostTab] = useState<"centers" | "budgets" | "allocation" | "variance">("centers");
  const [ccFormOpen, setCcFormOpen] = useState(false);
  const [editingCC, setEditingCC] = useState<CostCenter | null>(null);
  const [budgetFormOpen, setBudgetFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

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
      j.lines.forEach((l) => {
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
      store.update("invoices", editingInvoice.id, payload);
    } else {
      const number = payload.number.trim() || store.generateInvoiceNumber();
      store.add("invoices", { id: store.genId("inv"), ...payload, number });
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
    } else {
      const newId = store.genId("je");
      store.add("journalEntries", {
        id: newId, number: store.generateJournalNumber(), date: String(data.date),
        description: String(data.description), reference: data.reference ? String(data.reference) : undefined,
        type: String(data.type) as JournalEntry["type"], lines: [], status: "DRAFT",
        createdBy: "u-admin", createdAt: new Date().toISOString(),
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
      description: `Sales order ${so.number} for ${egpFmt(so.total)}. Items: ${so.items.map((i) => i.description).join(", ")}`,
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

    // Stock check
    const stockIssues: string[] = [];
    for (const item of so.items) {
      const product = store.products.find((p) => p.id === item.productId);
      if (product && product.stockQty < item.quantity) {
        stockIssues.push(`${product.name}: need ${item.quantity}, have ${product.stockQty}`);
      }
    }
    if (stockIssues.length > 0) {
      alert(`Insufficient stock:\n${stockIssues.join("\n")}`);
      return;
    }

    // Deduct inventory
    for (const item of so.items) {
      const product = store.products.find((p) => p.id === item.productId);
      if (product) {
        store.update("products", product.id, { stockQty: product.stockQty - item.quantity });
      }
    }

    // Create delivery note
    const dnId = store.genId("dn");
    store.add("deliveryNotes", {
      id: dnId,
      number: store.generateDNNumber(),
      soId: so.id,
      customerId: so.customerId,
      date: new Date().toISOString(),
      items: so.items.map((i) => ({ productId: i.productId, description: i.description, quantity: i.quantity })),
      status: "PENDING",
      createdAt: new Date().toISOString(),
    });

    // Create invoice
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
      notes: `Auto-generated from approved SO ${so.number}`,
    });

    // Create journal entry
    store.add("journalEntries", {
      id: store.genId("je"),
      number: store.generateJournalNumber(),
      date: new Date().toISOString().split("T")[0],
      description: `Sales revenue — SO ${so.number} (Approved)`,
      reference: so.number, type: "GENERAL",
      lines: [
        { accountId: "gl-1100", description: "Accounts Receivable", debit: so.total, credit: 0 },
        { accountId: "gl-4000", description: "Product Sales Revenue", debit: 0, credit: so.subtotal },
        { accountId: "gl-2100", description: "VAT Payable", debit: 0, credit: so.tax },
      ],
      status: "POSTED", createdBy: "u-admin", createdAt: new Date().toISOString(),
    });

    store.update("salesOrders", so.id, { status: "INVOICED", invoiceId: invId, dnId });
    approvals.approve(approvalId, "SO approved — stock verified, invoice & JE created");
  }

  function rejectSOApproval(approvalId: string, soId: string) {
    store.update("salesOrders", soId, { status: "CANCELLED" });
    approvals.reject(approvalId, "Sales order rejected");
  }

  const egpFmt = (n: number) => `EGP ${n.toLocaleString()}`;

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
        <StatsCard icon={Landmark} title={t("acct.totalAssets")} value={`EGP ${(totalBankBalance / 1e6).toFixed(1)}M`} subtitle={`${store.bankAccounts.length} accounts`} iconColor="bg-indigo-100 text-indigo-600" />
        <StatsCard icon={Users} title={t("acct.totalLiabilities")} value={`EGP ${(totalAR / 1e6).toFixed(1)}M`} subtitle={`${store.customers.length} customers`} iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={Building2} title={t("acct.totalExpenses")} value={`EGP ${(totalAP / 1e6).toFixed(1)}M`} subtitle={`${store.vendors.length} vendors`} iconColor="bg-red-100 text-red-600" />
        <StatsCard icon={BookOpen} title={t("acct.totalRevenue")} value={activeGLAccounts.length} subtitle={`${store.glAccounts.length} total`} iconColor="bg-violet-100 text-violet-600" />
        <StatsCard icon={ScrollText} title={t("acct.postedJournals")} value={postedJEs} subtitle={`${store.journalEntries.length} total`} iconColor="bg-emerald-100 text-emerald-600" />
      </div>

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
                  { key: "creditLimit", label: "Credit Limit", className: "text-right", render: (v: number) => <span className="font-semibold">{v.toLocaleString()}</span> },
                  { key: "outstanding", label: "Outstanding", className: "text-right", render: (v: number) => v.toLocaleString() },
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
                  { key: "outstanding", label: "Outstanding", className: "text-right", render: (v: number) => v.toLocaleString() },
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
                  { key: "amount", label: "Amount", className: "text-right", render: (v: number) => <span className="font-semibold">{v.toLocaleString()}</span> },
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
                  { key: "total", label: "Total", className: "text-right", render: (v: number) => <span className="font-semibold">{v.toLocaleString()}</span> },
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
              Total Balance: <span className="font-semibold text-foreground">EGP {totalBankBalance.toLocaleString()}</span>
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
                  { key: "balance", label: "Balance", render: (v) => <span className="font-semibold text-green-700">EGP {(v as number).toLocaleString()}</span>, className: "text-right" },
                  { key: "id", label: "Cheques", render: (_v, row) => {
                    const incoming = store.cheques.filter((c) => c.bankAccountId === row.id && c.type === "INCOMING" && (c.status === "PENDING" || c.status === "DEPOSITED")).reduce((s, c) => s + c.amount, 0);
                    const outgoing = store.cheques.filter((c) => c.bankAccountId === row.id && c.type === "OUTGOING" && c.status === "PENDING").reduce((s, c) => s + c.amount, 0);
                    if (!incoming && !outgoing) return <span className="text-xs text-muted-foreground">—</span>;
                    return (
                      <div className="text-xs">
                        {incoming > 0 && <span className="text-green-600">+{(incoming / 1000).toFixed(0)}K in</span>}
                        {incoming > 0 && outgoing > 0 && " / "}
                        {outgoing > 0 && <span className="text-red-600">-{(outgoing / 1000).toFixed(0)}K out</span>}
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
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Assets</div><div className="text-lg font-bold text-blue-700">EGP {(totalAssets / 1e6).toFixed(2)}M</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Liabilities</div><div className="text-lg font-bold text-red-600">EGP {(Math.abs(totalLiabilities) / 1e6).toFixed(2)}M</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Equity</div><div className="text-lg font-bold text-purple-700">EGP {(totalEquity / 1e6).toFixed(2)}M</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Revenue</div><div className="text-lg font-bold text-green-700">EGP {(totalRevenue / 1e6).toFixed(2)}M</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Expenses</div><div className="text-lg font-bold text-amber-700">EGP {(totalExpenses / 1e6).toFixed(2)}M</div></CardContent></Card>
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
                    return <span className={`font-semibold ${bal < 0 ? "text-red-600" : ""}`}>{isDebitNormal ? "" : ""}{Math.abs(bal).toLocaleString()}</span>;
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
                  <div className="text-xl font-bold">EGP {(activeGLAccounts.filter((a) => ["ASSET", "EXPENSE"].includes(a.type)).reduce((s, a) => s + Math.abs(a.balance), 0)).toLocaleString()}</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground">Total Credits</div>
                  <div className="text-xl font-bold">EGP {(activeGLAccounts.filter((a) => ["LIABILITY", "EQUITY", "REVENUE"].includes(a.type)).reduce((s, a) => s + Math.abs(a.balance), 0)).toLocaleString()}</div>
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
                    const lines = v as JournalEntry["lines"];
                    return <span className="font-semibold">{lines.reduce((s, l) => s + l.debit, 0).toLocaleString()}</span>;
                  }},
                  { key: "id", label: "Credit", className: "text-right", render: (_v, row) => {
                    const je = row as unknown as JournalEntry;
                    return <span className="font-semibold">{je.lines.reduce((s, l) => s + l.credit, 0).toLocaleString()}</span>;
                  }},
                  { key: "status", label: "Status", render: (v) => <Badge variant={(v as string) === "POSTED" ? "success" : (v as string) === "VOID" ? "destructive" : "warning"}>{v as string}</Badge> },
                  { key: "createdAt", label: "", render: (_v, row) => {
                    const je = row as unknown as JournalEntry;
                    const extras: { label: string; onClick: () => void }[] = [{ label: "View Lines", onClick: () => setJeDetailId(je.id) }];
                    if (je.status === "DRAFT") extras.push({ label: "Post", onClick: () => store.update("journalEntries", je.id, { status: "POSTED" as JournalEntry["status"] }) });
                    if (je.status === "POSTED") extras.push({ label: "Void", onClick: () => store.update("journalEntries", je.id, { status: "VOID" as JournalEntry["status"] }) });
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
            {([["centers", "Cost Centers", Target], ["budgets", "Budget vs Actual", BarChart3], ["allocation", "Cost Allocation", PieChart], ["variance", "Variance Analysis", Calculator]] as const).map(([key, label, Icon]) => (
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
                    { key: "budget", label: "Budget", className: "text-right", render: (v) => <span>{(v as number).toLocaleString()}</span> },
                    { key: "actualSpend", label: "Actual", className: "text-right", render: (v) => <span>{(v as number).toLocaleString()}</span> },
                    { key: "id", label: "Variance", className: "text-right", render: (_v, row) => {
                      const cc = row as unknown as CostCenter;
                      const variance = cc.budget - cc.actualSpend;
                      return <span className={`font-semibold ${variance >= 0 ? "text-green-600" : "text-red-600"}`}>{variance >= 0 ? "+" : ""}{variance.toLocaleString()}</span>;
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
                    { key: "budgeted", label: "Budgeted", className: "text-right", render: (v) => (v as number).toLocaleString() },
                    { key: "actual", label: "Actual", className: "text-right", render: (v) => (v as number).toLocaleString() },
                    { key: "id", label: "Variance", className: "text-right", render: (_v, row) => {
                      const b = row as unknown as Budget;
                      const v = b.budgeted - b.actual;
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
                  <div className="text-sm text-muted-foreground mb-3">Based on posted journal entry debit lines tagged with cost centers. Total allocated: <span className="font-semibold text-foreground">EGP {totalAllocated.toLocaleString()}</span></div>
                  <div className="space-y-3">
                    {store.costCenters.map((cc) => {
                      const alloc = ccAllocations[cc.id] ?? 0;
                      const pct = totalAllocated > 0 ? (alloc / totalAllocated) * 100 : 0;
                      return (
                        <div key={cc.id} className="space-y-1">
                          <div className="flex justify-between text-sm"><span className="font-medium">{cc.name}</span><span>EGP {alloc.toLocaleString()} ({pct.toFixed(1)}%)</span></div>
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
                            <div><span className="text-muted-foreground">Budget:</span> <span className="font-semibold">EGP {cc.budget.toLocaleString()}</span></div>
                            <div><span className="text-muted-foreground">Actual:</span> <span className="font-semibold">EGP {cc.actualSpend.toLocaleString()}</span></div>
                            <div><span className="text-muted-foreground">Variance:</span> <span className={`font-semibold ${variance >= 0 ? "text-green-600" : "text-red-600"}`}>{variance >= 0 ? "+" : ""}EGP {variance.toLocaleString()}</span></div>
                          </div>
                          <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${pctBudget > 100 ? "bg-red-500" : pctBudget > 80 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${pctActual}%` }} />
                            <div className="absolute right-2 top-0 h-full flex items-center"><span className="text-[10px] font-medium">{pctBudget.toFixed(0)}%</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
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
                              Stock check: {so.items.map((item) => {
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
                    const colors: Record<string, string> = { DRAFT: "bg-gray-100 text-gray-800", CONFIRMED: "bg-blue-100 text-blue-800", DELIVERED: "bg-amber-100 text-amber-800", INVOICED: "bg-green-100 text-green-800", CANCELLED: "bg-red-100 text-red-800" };
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
                <Badge variant="outline">1. SO Created (DRAFT)</Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline" className="bg-blue-50">2. Submit for Approval</Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline" className="bg-amber-50">3. Stock Check + Review</Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline" className="bg-green-50">4. Approve → Auto: Inventory Deduction + Invoice + Delivery Note + Journal Entry</Badge>
              </div>
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
                    {jeDetail.lines.map((l, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono text-xs">{glName(l.accountId)}</td>
                        <td className="px-3 py-2 text-xs">{l.description ?? "—"}</td>
                        <td className="px-3 py-2 text-right font-semibold text-red-600">{l.debit > 0 ? l.debit.toLocaleString() : "—"}</td>
                        <td className="px-3 py-2 text-right font-semibold text-green-600">{l.credit > 0 ? l.credit.toLocaleString() : "—"}</td>
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
                    {jeDetail.lines.length === 0 && <tr><td colSpan={jeDetail.status === "DRAFT" ? 6 : 5} className="px-3 py-4 text-center text-muted-foreground">No lines yet. Add lines below.</td></tr>}
                  </tbody>
                  <tfoot className="bg-muted/30 font-semibold">
                    <tr>
                      <td colSpan={2} className="px-3 py-2">Total</td>
                      <td className="px-3 py-2 text-right">{jeDetail.lines.reduce((s, l) => s + l.debit, 0).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{jeDetail.lines.reduce((s, l) => s + l.credit, 0).toLocaleString()}</td>
                      <td colSpan={jeDetail.status === "DRAFT" ? 2 : 1} />
                    </tr>
                  </tfoot>
                </table>
              </div>
              {(() => {
                const totalDebit = jeDetail.lines.reduce((s, l) => s + l.debit, 0);
                const totalCredit = jeDetail.lines.reduce((s, l) => s + l.credit, 0);
                const diff = totalDebit - totalCredit;
                if (jeDetail.lines.length > 0 && diff !== 0) {
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
                    <Button size="sm" className="h-6 text-xs bg-green-600 hover:bg-green-700" onClick={() => { store.update("journalEntries", jeDetail.id, { status: "POSTED" as JournalEntry["status"] }); }}>Post</Button>
                  )}
                  {jeDetail.status === "POSTED" && (
                    <Button size="sm" variant="destructive" className="h-6 text-xs" onClick={() => { store.update("journalEntries", jeDetail.id, { status: "VOID" as JournalEntry["status"] }); }}>Void</Button>
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
                    <p className="text-sm text-muted-foreground">{"code" in entity ? entity.code : ""} · Outstanding: EGP {entity.outstanding.toLocaleString()}</p>
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
        initialData={editingInvoice ? { number: editingInvoice.number, customerId: editingInvoice.customerId, date: editingInvoice.date.slice(0, 10), dueDate: editingInvoice.dueDate.slice(0, 10), productId: editingInvoice.items[0]?.productId ?? "", quantity: editingInvoice.items[0]?.quantity ?? 1, unitPrice: editingInvoice.items[0]?.unitPrice ?? 0, subtotal: editingInvoice.subtotal, tax: editingInvoice.tax, total: editingInvoice.total, status: editingInvoice.status, notes: editingInvoice.notes ?? "" } : undefined}
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
    </div>
  );
}
