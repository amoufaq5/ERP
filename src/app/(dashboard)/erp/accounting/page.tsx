"use client";

import { useMemo, useState } from "react";
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
  type Vendor,
  type Cheque,
  type Invoice,
  type BankAccount,
  type GLAccount,
  type JournalEntry,
  type CostCenter,
  type Budget,
} from "@/lib/data-store";
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
} from "lucide-react";
import { downloadCSV, downloadHTML, buildPrintableReport } from "@/lib/download";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AccountingPage() {
  const store = useDataStore();
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
    { name: "code", label: "Code", type: "text", required: true, placeholder: "CUST-XXXX" },
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
      store.add("customers", { id: store.genId("c"), ...payload, createdAt: new Date().toISOString() });
    }
    setCustFormOpen(false);
    setEditingCustomer(null);
  }

  // ─── Vendor CRUD ───────────────────────────────────────────────────────
  const vendorFields: EntityField[] = [
    { name: "code", label: "Code", type: "text", required: true },
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
      store.add("vendors", { id: store.genId("ve"), ...payload, createdAt: new Date().toISOString() });
    }
    setVendFormOpen(false);
    setEditingVendor(null);
  }

  // ─── Cheque CRUD ───────────────────────────────────────────────────────
  const chequeFields: EntityField[] = [
    { name: "number", label: "Cheque Number", type: "text", required: true },
    { name: "bankName", label: "Bank", type: "text", required: true },
    { name: "type", label: "Direction", type: "select", required: true, options: [{ label: "Incoming", value: "INCOMING" }, { label: "Outgoing", value: "OUTGOING" }] },
    { name: "partyName", label: "Party Name", type: "text", required: true },
    { name: "amount", label: "Amount (EGP)", type: "number", required: true },
    { name: "currency", label: "Currency", type: "select", defaultValue: "EGP", options: [{ label: "EGP", value: "EGP" }] },
    { name: "issueDate", label: "Issue Date", type: "date", required: true },
    { name: "dueDate", label: "Due Date", type: "date", required: true },
    { name: "status", label: "Status", type: "select", defaultValue: "PENDING", options: [{ label: "Pending", value: "PENDING" }, { label: "Deposited", value: "DEPOSITED" }, { label: "Cleared", value: "CLEARED" }, { label: "Bounced", value: "BOUNCED" }, { label: "Cancelled", value: "CANCELLED" }] },
    { name: "notes", label: "Notes", type: "textarea", fullWidth: true },
  ];

  function handleChequeSubmit(data: EntityFormData) {
    const payload = {
      number: String(data.number),
      bankName: String(data.bankName),
      type: String(data.type) as Cheque["type"],
      partyName: String(data.partyName),
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
      store.add("cheques", { id: store.genId("ch"), ...payload });
    }
    setChequeFormOpen(false);
    setEditingCheque(null);
  }

  // ─── Invoice CRUD ──────────────────────────────────────────────────────
  const invoiceFields: EntityField[] = [
    { name: "number", label: "Invoice Number", type: "text", required: true },
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
      store.add("invoices", { id: store.genId("inv"), ...payload });
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
      { label: "Closing", value: "CLOSING" }, { label: "Opening", value: "OPENING" },
      { label: "Partner", value: "PARTNER" },
    ]},
  ];

  function handleJESubmit(data: EntityFormData) {
    if (editingJE) {
      store.update("journalEntries", editingJE.id, { date: String(data.date), description: String(data.description), reference: data.reference ? String(data.reference) : undefined, type: String(data.type) as JournalEntry["type"] });
    } else {
      store.add("journalEntries", {
        id: store.genId("je"), number: store.generateJournalNumber(), date: String(data.date),
        description: String(data.description), reference: data.reference ? String(data.reference) : undefined,
        type: String(data.type) as JournalEntry["type"], lines: [], status: "DRAFT",
        createdBy: "u-admin", createdAt: new Date().toISOString(),
      });
    }
    setJeFormOpen(false); setEditingJE(null);
  }

  // ─── Cost Center CRUD ─────────────────────────────────────────────────
  const ccFields: EntityField[] = [
    { name: "code", label: "Code", type: "text", required: true, placeholder: "CC-XXX" },
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
    else { store.add("costCenters", { id: store.genId("cc"), ...payload }); }
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
    const colors: Record<string, string> = { GENERAL: "bg-blue-100 text-blue-800", ADJUSTING: "bg-amber-100 text-amber-800", CLOSING: "bg-red-100 text-red-800", OPENING: "bg-green-100 text-green-800", PARTNER: "bg-purple-100 text-purple-800" };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[type] ?? "bg-muted text-foreground"}`}>{type}</span>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounting"
        description="Manage customers, vendors, cheques, and invoices."
        actions={
          <Button variant="outline" onClick={exportCustomerCSV}>
            <Download className="h-4 w-4 mr-2" /> Export Customers
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard icon={Landmark} title="Bank Balance" value={`EGP ${(totalBankBalance / 1e6).toFixed(1)}M`} subtitle={`${store.bankAccounts.length} accounts`} iconColor="bg-indigo-100 text-indigo-600" />
        <StatsCard icon={Users} title="Total AR" value={`EGP ${(totalAR / 1e6).toFixed(1)}M`} subtitle={`${store.customers.length} customers`} iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={Building2} title="Total AP" value={`EGP ${(totalAP / 1e6).toFixed(1)}M`} subtitle={`${store.vendors.length} vendors`} iconColor="bg-red-100 text-red-600" />
        <StatsCard icon={BookOpen} title="GL Accounts" value={activeGLAccounts.length} subtitle={`${store.glAccounts.length} total`} iconColor="bg-violet-100 text-violet-600" />
        <StatsCard icon={ScrollText} title="Journal Entries" value={postedJEs} subtitle={`${store.journalEntries.length} total`} iconColor="bg-emerald-100 text-emerald-600" />
      </div>

      <Tabs defaultValue="customers">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="customers">Customers ({store.customers.length})</TabsTrigger>
          <TabsTrigger value="vendors">Vendors ({store.vendors.length})</TabsTrigger>
          <TabsTrigger value="cheques">Cheques ({store.cheques.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({store.invoices.length})</TabsTrigger>
          <TabsTrigger value="bank">Bank ({store.bankAccounts.length})</TabsTrigger>
          <TabsTrigger value="gl">General Ledger</TabsTrigger>
          <TabsTrigger value="je">Journal Entries</TabsTrigger>
          <TabsTrigger value="cost">Cost Accounting</TabsTrigger>
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
                  { key: "name", label: "Name", render: (v: string) => <span className="font-medium">{v}</span> },
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
                        extraItems={[{ label: "View Statement", onClick: () => setStatementParty({ type: "customer", id: c.id }) }]}
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
                  { key: "name", label: "Name", render: (v: string) => <span className="font-medium">{v}</span> },
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
                  { key: "partyName", label: "Party", render: (v: string) => <span className="font-medium">{v}</span> },
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
                    return <span className="font-medium">{cust?.name ?? "—"}</span>;
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
              { key: "type", label: "Type", type: "select", options: ["GENERAL", "ADJUSTING", "CLOSING", "OPENING", "PARTNER"].map((t) => ({ label: t, value: t })) },
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
              <div className="flex justify-end"><Button size="sm" onClick={() => { setEditingBudget(null); setBudgetFormOpen(true); }}><Plus className="h-3 w-3 mr-1" /> Add Budget</Button></div>
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
      </Tabs>

      {/* JE Detail dialog */}
      <Dialog open={!!jeDetail} onOpenChange={(open) => { if (!open) setJeDetailId(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" /> {jeDetail?.number} — Journal Entry Lines</DialogTitle></DialogHeader>
          {jeDetail && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Date:</span> {new Date(jeDetail.date).toLocaleDateString()}</div>
                <div><span className="text-muted-foreground">Type:</span> {jeBadge(jeDetail.type)}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Description:</span> {jeDetail.description}</div>
                {jeDetail.reference && <div className="col-span-2"><span className="text-muted-foreground">Reference:</span> {jeDetail.reference}</div>}
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr><th className="px-3 py-2 text-left">Account</th><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-right">Debit</th><th className="px-3 py-2 text-right">Credit</th><th className="px-3 py-2 text-left">Cost Center</th></tr></thead>
                  <tbody className="divide-y">
                    {jeDetail.lines.map((l, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono text-xs">{glName(l.accountId)}</td>
                        <td className="px-3 py-2 text-xs">{l.description ?? "—"}</td>
                        <td className="px-3 py-2 text-right font-semibold text-red-600">{l.debit > 0 ? l.debit.toLocaleString() : "—"}</td>
                        <td className="px-3 py-2 text-right font-semibold text-green-600">{l.credit > 0 ? l.credit.toLocaleString() : "—"}</td>
                        <td className="px-3 py-2 text-xs">{l.costCenterId ? ccName(l.costCenterId) : "—"}</td>
                      </tr>
                    ))}
                    {jeDetail.lines.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">No lines. Edit this entry to add lines.</td></tr>}
                  </tbody>
                  <tfoot className="bg-muted/30 font-semibold">
                    <tr>
                      <td colSpan={2} className="px-3 py-2">Total</td>
                      <td className="px-3 py-2 text-right">{jeDetail.lines.reduce((s, l) => s + l.debit, 0).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{jeDetail.lines.reduce((s, l) => s + l.credit, 0).toLocaleString()}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Status: <Badge variant={jeDetail.status === "POSTED" ? "success" : jeDetail.status === "VOID" ? "destructive" : "warning"}>{jeDetail.status}</Badge></span>
                <span>Created: {new Date(jeDetail.createdAt).toLocaleDateString()}</span>
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
          { name: "code", label: "Code", type: "text", required: true, placeholder: "BA-XXX" },
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
          else store.add("bankAccounts", { id: store.genId("ba"), ...payload });
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
        initialData={editingCheque ? { number: editingCheque.number, bankName: editingCheque.bankName, type: editingCheque.type, partyName: editingCheque.partyName, amount: editingCheque.amount, currency: editingCheque.currency, issueDate: editingCheque.issueDate.slice(0, 10), dueDate: editingCheque.dueDate.slice(0, 10), status: editingCheque.status, notes: editingCheque.notes ?? "" } : undefined}
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
    </div>
  );
}
