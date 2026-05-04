"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import StatusBadge from "@/components/shared/status-badge";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { EntityFormModal, type EntityField, type EntityFormData } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import { CustomerLink, VendorLink, BankAccountLink } from "@/components/shared/entity-detail-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Column } from "@/components/shared/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApiDataStore } from "@/lib/api/use-api-store";
import { type Invoice, type Payment, type Budget, type GLAccount, type JournalEntry, type SalesOrder, type BankAccount } from "@/lib/data-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApprovals } from "@/lib/approval-workflow";
import { openInvoicePDF } from "@/lib/invoice-pdf";
import {
  DollarSign, TrendingUp, TrendingDown, FileText,
  Plus, CreditCard, BookOpen, Landmark, Download,
  BarChart3, Calculator, Activity, Target,
  ShoppingBag, CheckCircle, XCircle, AlertTriangle,
  ArrowUpDown, RefreshCw, Eye, Link2, Unlink, ArrowDownLeft, ArrowUpRight,
  Wallet, QrCode, FileSpreadsheet, ScrollText,
} from "lucide-react";
import { downloadCSV } from "@/lib/download";
import { useTranslation } from "@/lib/i18n/i18n-context";

const egp = (n: number) => `EGP ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Tab = "overview" | "invoices" | "payments" | "gl" | "vendors" | "budgets" | "trial" | "ratios" | "cashflow" | "sales-orders" | "banking" | "transactions" | "reconciliation" | "payment-gateway";

// ─── Banking interfaces & sample data ──────────────────────────
interface BankingTransaction {
  id: string; accountId: string; date: string; description: string; reference: string; amount: number; type: "credit" | "debit"; balance: number; matchStatus: "unmatched" | "matched" | "partial" | "excluded"; matchedRef?: string
}

interface ReconSession {
  id: string; accountId: string; periodStart: string; periodEnd: string; bankBalance: number; bookBalance: number; difference: number; status: "in_progress" | "completed" | "discrepancy"; matchedCount: number; unmatchedCount: number
}

interface BankingAccount {
  id: string; bankName: string; accountNumber: string; iban: string; currency: string; balance: number; lastSynced: string; isActive: boolean
}

const bankingSampleAccounts: BankingAccount[] = [
  { id: "1", bankName: "National Bank of Egypt", accountNumber: "1234-5678-9012", iban: "EG380019000500000000263180002", currency: "EGP", balance: 2450000, lastSynced: "2024-03-25", isActive: true },
  { id: "2", bankName: "CIB Egypt", accountNumber: "9876-5432-1098", iban: "EG210037000400000000123456789", currency: "EGP", balance: 875000, lastSynced: "2024-03-24", isActive: true },
  { id: "3", bankName: "Banque Misr", accountNumber: "5555-1234-9876", iban: "EG300002000300000000789012345", currency: "USD", balance: 125000, lastSynced: "2024-03-20", isActive: false },
];

const bankingSampleTransactions: BankingTransaction[] = [
  { id: "t1", accountId: "1", date: "2024-03-25", description: "Payment from Acme Pharma", reference: "TRF-001", amount: 51300, type: "credit", balance: 2450000, matchStatus: "matched", matchedRef: "INV-2024-089" },
  { id: "t2", accountId: "1", date: "2024-03-24", description: "Supplier payment - MedSupply Co", reference: "TRF-002", amount: 35000, type: "debit", balance: 2398700, matchStatus: "matched", matchedRef: "PO-2024-045" },
  { id: "t3", accountId: "1", date: "2024-03-23", description: "Salary payment March", reference: "SAL-MAR", amount: 180000, type: "debit", balance: 2433700, matchStatus: "matched", matchedRef: "PAY-2024-03" },
  { id: "t4", accountId: "1", date: "2024-03-22", description: "Payment received - Delta Medical", reference: "TRF-003", amount: 22800, type: "credit", balance: 2613700, matchStatus: "unmatched" },
  { id: "t5", accountId: "1", date: "2024-03-21", description: "Bank charges", reference: "CHG-001", amount: 500, type: "debit", balance: 2590900, matchStatus: "excluded" },
  { id: "t6", accountId: "2", date: "2024-03-25", description: "Customer payment - Nile Health", reference: "TRF-004", amount: 15000, type: "credit", balance: 875000, matchStatus: "unmatched" },
  { id: "t7", accountId: "2", date: "2024-03-24", description: "Office rent payment", reference: "RENT-03", amount: 45000, type: "debit", balance: 860000, matchStatus: "matched", matchedRef: "JE-2024-088" },
  { id: "t8", accountId: "1", date: "2024-03-20", description: "Insurance premium", reference: "INS-Q1", amount: 12000, type: "debit", balance: 2591400, matchStatus: "partial" },
];

const bankingSampleRecon: ReconSession[] = [
  { id: "r1", accountId: "1", periodStart: "2024-03-01", periodEnd: "2024-03-31", bankBalance: 2450000, bookBalance: 2448500, difference: 1500, status: "discrepancy", matchedCount: 45, unmatchedCount: 3 },
  { id: "r2", accountId: "2", periodStart: "2024-02-01", periodEnd: "2024-02-29", bankBalance: 905000, bookBalance: 905000, difference: 0, status: "completed", matchedCount: 32, unmatchedCount: 0 },
];

const matchColors: Record<string, string> = { matched: "bg-green-100 text-green-800", unmatched: "bg-red-100 text-red-800", partial: "bg-yellow-100 text-yellow-800", excluded: "bg-gray-100 text-gray-600" };

export default function FinancePage() {
  const store = useApiDataStore();
  const approvals = useApprovals();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [invoiceFilters, setInvoiceFilters] = useState<FilterState>({ _search: "", status: "" });
  const [paymentFilters, setPaymentFilters] = useState<FilterState>({ _search: "", type: "", method: "" });

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [viewPayment, setViewPayment] = useState<Payment | null>(null);
  const [viewBudget, setViewBudget] = useState<Budget | null>(null);

  // ─── Bank state ────────────────────────────────────────────────
  const [showBankModal, setShowBankModal] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [bankDetailId, setBankDetailId] = useState<string | null>(null);
  const [bankTxFilter, setBankTxFilter] = useState<"all" | "credit" | "debit">("all");
  const [bankTxSearch, setBankTxSearch] = useState("");

  // ─── GL / Chart of Accounts state ──────────────────────────────
  const [glView, setGlView] = useState<"coa" | "ledger" | "trial-balance">("coa");
  const [glSearch, setGlSearch] = useState("");
  const [glFilters, setGlFilters] = useState<FilterState>({ _search: "", type: "" });
  const [glFormOpen, setGlFormOpen] = useState(false);
  const [editingGL, setEditingGL] = useState<GLAccount | null>(null);
  const [selectedGLAccountId, setSelectedGLAccountId] = useState<string>("");

  // ─── Banking sub-view state ───────────────────────────────────
  const [bankingSubView, setBankingSubView] = useState<"accounts" | "transactions" | "reconciliation">("accounts");

  // ─── Banking (merged from banking page) ────────────────────────
  const [bankingAccounts, setBankingAccounts] = useState(bankingSampleAccounts);
  const [bankingTransactions] = useState(bankingSampleTransactions);
  const [bankingRecons] = useState(bankingSampleRecon);
  const [showAddBankingAccount, setShowAddBankingAccount] = useState(false);
  const [newBankingAccount, setNewBankingAccount] = useState({ bankName: "", accountNumber: "", iban: "", currency: "EGP" });
  const [bankingFilterAccount, setBankingFilterAccount] = useState("");
  const [bankingFilterMatch, setBankingFilterMatch] = useState("");
  const [bankingPaymentAmount, setBankingPaymentAmount] = useState("");

  // ─── Reconciliation interactive state ─────────────────────────
  const [reconAccountId, setReconAccountId] = useState("");
  const [reconPeriodStart, setReconPeriodStart] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); });
  const [reconPeriodEnd, setReconPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [reconSelectedBankTx, setReconSelectedBankTx] = useState<string | null>(null);
  const [reconSelectedBookEntry, setReconSelectedBookEntry] = useState<string | null>(null);
  const [reconMatches, setReconMatches] = useState<{ bankTxId: string; bookEntryId: string }[]>([]);
  const [reconCompleted, setReconCompleted] = useState(false);

  // ─── Trial Balance state ──────────────────────────────────────
  const [trialDateFrom, setTrialDateFrom] = useState("");
  const [trialDateTo, setTrialDateTo] = useState("");

  const bankingTotalBalance = bankingAccounts.filter(a => a.isActive).reduce((s, a) => s + a.balance, 0);
  const bankingUnreconciled = bankingTransactions.filter(tx => tx.matchStatus === "unmatched").length;

  const bankingFilteredTx = bankingTransactions.filter(tx => {
    if (bankingFilterAccount && tx.accountId !== bankingFilterAccount) return false;
    if (bankingFilterMatch && tx.matchStatus !== bankingFilterMatch) return false;
    return true;
  });

  function addBankingAccount() {
    if (!newBankingAccount.bankName || !newBankingAccount.accountNumber) return;
    setBankingAccounts(prev => [...prev, { id: Date.now().toString(36), ...newBankingAccount, balance: 0, lastSynced: "Never", isActive: true }]);
    setNewBankingAccount({ bankName: "", accountNumber: "", iban: "", currency: "EGP" });
    setShowAddBankingAccount(false);
  }

  const bankingTxColumns: Column<Record<string, unknown>>[] = [
    { key: "date", label: "Date" },
    { key: "description", label: "Description", render: (v) => <span className="font-medium text-sm">{String(v)}</span> },
    { key: "reference", label: "Reference", render: (v) => <span className="font-mono text-xs">{String(v)}</span> },
    { key: "type", label: "Type", render: (v) => (
      <span className={`flex items-center gap-1 text-xs ${String(v) === "credit" ? "text-green-700" : "text-red-700"}`}>
        {String(v) === "credit" ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}{String(v)}
      </span>
    )},
    { key: "amount", label: "Amount (EGP)", render: (v, row) => (
      <span className={`font-medium ${String((row as unknown as BankingTransaction).type) === "credit" ? "text-green-700" : "text-red-700"}`}>
        {String((row as unknown as BankingTransaction).type) === "credit" ? "+" : "-"}{(Number(v) || 0).toLocaleString()}
      </span>
    )},
    { key: "matchStatus", label: "Match", render: (v, row) => (
      <div>
        <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${matchColors[String(v)] || ""}`}>{String(v)}</span>
        {(row as unknown as BankingTransaction).matchedRef && <span className="block text-[10px] text-muted-foreground mt-0.5">{(row as unknown as BankingTransaction).matchedRef}</span>}
      </div>
    )},
  ];

  const customerName = (id: string) => store.customers.find((c) => c.id === id)?.name ?? id;
  const vendorName = (id: string) => store.vendors.find((v) => v.id === id)?.name ?? id;

  // ─── Computed metrics ──────────────────────────────────────────
  const totalRevenue = store.invoices
    .filter((i) => i.status === "PAID" || i.status === "PARTIAL")
    .reduce((s, i) => s + i.total, 0);
  const totalAR = store.customers.reduce((s, c) => s + c.outstanding, 0);
  const totalAP = store.vendors.reduce((s, v) => s + v.outstanding, 0);
  const totalBankBalance = store.bankAccounts.reduce((s, b) => s + b.balance, 0);
  const netPosition = totalBankBalance + totalAR - totalAP;

  // GL-based computations for ratios
  const glByType = (type: GLAccount["type"]) => store.glAccounts.filter((a) => a.isActive && a.type === type);
  const glSum = (type: GLAccount["type"]) => glByType(type).reduce((s, a) => s + a.balance, 0);
  const glSumSub = (type: GLAccount["type"], sub: string) => store.glAccounts.filter((a) => a.isActive && a.type === type && a.subType.includes(sub)).reduce((s, a) => s + a.balance, 0);
  const glTotalAssets = glSum("ASSET");
  const glTotalLiabilities = Math.abs(glSum("LIABILITY"));
  const glTotalEquity = glSum("EQUITY");
  const glTotalRevenue = glSum("REVENUE");
  const glTotalExpenses = glSum("EXPENSE");
  const glCurrentAssets = glSumSub("ASSET", "Current");
  const glCurrentLiabilities = Math.abs(glSumSub("LIABILITY", "Current"));
  const glInventory = store.glAccounts.filter((a) => a.isActive && a.name.includes("Inventory")).reduce((s, a) => s + a.balance, 0);
  const glCOGS = store.glAccounts.filter((a) => a.isActive && a.subType === "COGS").reduce((s, a) => s + a.balance, 0);
  const glInterestExpense = store.glAccounts.filter((a) => a.isActive && a.name.includes("Interest")).reduce((s, a) => s + a.balance, 0);
  const netIncome = glTotalRevenue - glTotalExpenses;
  const operatingIncome = glTotalRevenue - glCOGS - store.glAccounts.filter((a) => a.isActive && a.subType === "Operating Expense").reduce((s, a) => s + a.balance, 0);

  // Cash flow from payments
  const totalInflows = store.payments.filter((p) => p.type === "RECEIVED").reduce((s, p) => s + p.amount, 0);
  const totalOutflows = store.payments.filter((p) => p.type === "SENT").reduce((s, p) => s + p.amount, 0);

  const glName = (id: string) => store.glAccounts.find((a) => a.id === id)?.name ?? id;
  const ccName = (id: string) => store.costCenters.find((c) => c.id === id)?.name ?? id;

  // ─── GL / Chart of Accounts computed ──────────────────────────
  const activeGLAccounts = store.glAccounts.filter((a) => a.isActive);
  const glCoaTotalAssets = activeGLAccounts.filter((a) => a.type === "ASSET").reduce((s, a) => s + (a.balance ?? 0), 0);
  const glCoaTotalLiabilities = activeGLAccounts.filter((a) => a.type === "LIABILITY").reduce((s, a) => s + (a.balance ?? 0), 0);
  const glCoaTotalEquity = activeGLAccounts.filter((a) => a.type === "EQUITY").reduce((s, a) => s + (a.balance ?? 0), 0);
  const glCoaTotalRevenue = activeGLAccounts.filter((a) => a.type === "REVENUE").reduce((s, a) => s + (a.balance ?? 0), 0);
  const glCoaTotalExpenses = activeGLAccounts.filter((a) => a.type === "EXPENSE").reduce((s, a) => s + (a.balance ?? 0), 0);

  const filteredGL = useMemo(() => {
    return store.glAccounts.filter((a) => {
      if (glSearch) {
        const q = glSearch.toLowerCase();
        if (!a.code.toLowerCase().includes(q) && !a.name.toLowerCase().includes(q)) return false;
      }
      if (glFilters.type && a.type !== glFilters.type) return false;
      return true;
    });
  }, [store.glAccounts, glSearch, glFilters]);

  const typeBadge = (type: string) => {
    const colors: Record<string, string> = { ASSET: "bg-blue-100 text-blue-800", LIABILITY: "bg-red-100 text-red-800", EQUITY: "bg-purple-100 text-purple-800", REVENUE: "bg-green-100 text-green-800", EXPENSE: "bg-amber-100 text-amber-800" };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[type] || "bg-gray-100 text-gray-800"}`}>{type}</span>;
  };

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

  // ─── Filters ───────────────────────────────────────────────────
  const filteredInvoices = useMemo(() => {
    return store.invoices.filter((i) => {
      const q = (invoiceFilters._search || "").toLowerCase();
      const cName = customerName(i.customerId).toLowerCase();
      const matchesSearch = !q || i.number.toLowerCase().includes(q) || cName.includes(q);
      const matchesStatus = !invoiceFilters.status || i.status === invoiceFilters.status;
      return matchesSearch && matchesStatus;
    });
  }, [store.invoices, store.customers, invoiceFilters]);

  const filteredPayments = useMemo(() => {
    return store.payments.filter((p) => {
      const q = (paymentFilters._search || "").toLowerCase();
      const party = p.customerId ? customerName(p.customerId) : p.vendorId ? vendorName(p.vendorId) : "";
      const matchesSearch = !q || p.reference.toLowerCase().includes(q) || party.toLowerCase().includes(q);
      const matchesType = !paymentFilters.type || p.type === paymentFilters.type;
      const matchesMethod = !paymentFilters.method || p.method === paymentFilters.method;
      return matchesSearch && matchesType && matchesMethod;
    });
  }, [store.payments, store.customers, store.vendors, paymentFilters]);

  // ─── Invoice CRUD ──────────────────────────────────────────────
  const invoiceFields: EntityField[] = [
    { name: "customerId", label: "Customer", type: "select", required: true, options: store.customers.map((c) => ({ label: `${c.name} (${c.code})`, value: c.id })) },
    { name: "date", label: "Invoice Date", type: "text", required: true, placeholder: "YYYY-MM-DD", defaultValue: new Date().toISOString().slice(0, 10) },
    { name: "dueDate", label: "Due Date", type: "text", required: true, placeholder: "YYYY-MM-DD" },
    { name: "subtotal", label: "Subtotal (EGP)", type: "number", required: true },
    { name: "tax", label: "Tax (EGP)", type: "number", defaultValue: 0 },
    { name: "status", label: "Status", type: "select", defaultValue: "DRAFT", options: [
      { label: "Draft", value: "DRAFT" }, { label: "Sent", value: "SENT" },
      { label: "Partial", value: "PARTIAL" }, { label: "Paid", value: "PAID" },
      { label: "Overdue", value: "OVERDUE" },
    ]},
  ];

  function handleInvoiceSubmit(data: EntityFormData) {
    const subtotal = Number(data.subtotal) || 0;
    const tax = Number(data.tax) || 0;
    if (editingInvoice) {
      store.update("invoices", editingInvoice.id, {
        customerId: String(data.customerId),
        date: String(data.date),
        dueDate: String(data.dueDate),
        subtotal, tax, total: subtotal + tax,
        status: String(data.status) as Invoice["status"],
      });
    } else {
      store.add("invoices", {
        id: store.genId("inv"),
        number: store.generateInvoiceNumber(),
        customerId: String(data.customerId),
        date: String(data.date),
        dueDate: String(data.dueDate),
        subtotal, tax, total: subtotal + tax,
        currency: "EGP",
        status: (String(data.status) || "DRAFT") as Invoice["status"],
        items: [],
      });
    }
    setShowInvoiceModal(false);
    setEditingInvoice(null);
  }

  // ─── Payment CRUD ──────────────────────────────────────────────
  const paymentFields: EntityField[] = [
    { name: "type", label: "Type", type: "select", required: true, defaultValue: "RECEIVED", options: [
      { label: "Received (from customer)", value: "RECEIVED" },
      { label: "Sent (to vendor)", value: "SENT" },
    ]},
    { name: "customerId", label: "Customer", type: "select", options: [{ label: "— None —", value: "" }, ...store.customers.map((c) => ({ label: c.name, value: c.id }))] },
    { name: "vendorId", label: "Vendor", type: "select", options: [{ label: "— None —", value: "" }, ...store.vendors.map((v) => ({ label: v.name, value: v.id }))] },
    { name: "invoiceId", label: "Against Invoice", type: "select", options: [{ label: "— None —", value: "" }, ...store.invoices.map((i) => ({ label: `${i.number} — ${egp(i.total)}`, value: i.id }))] },
    { name: "amount", label: "Amount (EGP)", type: "number", required: true },
    { name: "method", label: "Method", type: "select", defaultValue: "BANK_TRANSFER", options: [
      { label: "Bank Transfer", value: "BANK_TRANSFER" },
      { label: "Cheque", value: "CHEQUE" },
      { label: "Cash", value: "CASH" },
      { label: "Credit Card", value: "CREDIT_CARD" },
    ]},
    { name: "bankAccountId", label: "Bank Account", type: "select", options: [{ label: "— None —", value: "" }, ...store.bankAccounts.map((b) => ({ label: `${b.name} (${b.bankName})`, value: b.id }))] },
    { name: "date", label: "Date", type: "text", required: true, placeholder: "YYYY-MM-DD", defaultValue: new Date().toISOString().slice(0, 10) },
    { name: "notes", label: "Notes", type: "text" },
  ];

  function handlePaymentSubmit(data: EntityFormData) {
    const amount = Number(data.amount) || 0;
    const payload: Omit<Payment, "id"> = {
      reference: store.generatePaymentRef(),
      type: String(data.type) as Payment["type"],
      customerId: data.customerId ? String(data.customerId) : undefined,
      vendorId: data.vendorId ? String(data.vendorId) : undefined,
      invoiceId: data.invoiceId ? String(data.invoiceId) : undefined,
      amount,
      currency: "EGP",
      method: String(data.method) as Payment["method"],
      bankAccountId: data.bankAccountId ? String(data.bankAccountId) : undefined,
      date: String(data.date),
      notes: data.notes ? String(data.notes) : undefined,
    };
    if (editingPayment) {
      store.update("payments", editingPayment.id, payload);
    } else {
      store.add("payments", { id: store.genId("pay"), ...payload });
    }
    setShowPaymentModal(false);
    setEditingPayment(null);
  }

  // ─── Columns ───────────────────────────────────────────────────
  const invoiceFlow: Record<string, string> = { DRAFT: "SENT", SENT: "PAID", PARTIAL: "PAID", OVERDUE: "PAID" };

  const invoiceColumns: Column<Record<string, unknown>>[] = [
    { key: "number", label: "Invoice #", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
    { key: "customerId", label: "Customer", render: (v) => <CustomerLink customerId={v as string} /> },
    { key: "date", label: "Date", render: (v) => (v as string).slice(0, 10) },
    { key: "dueDate", label: "Due Date", render: (v) => (v as string).slice(0, 10) },
    { key: "total", label: "Total", render: (v) => <span className="font-semibold">{egp(v as number)}</span>, className: "text-right" },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
    { key: "id", label: "", render: (_v, row) => {
      const inv = store.invoices.find((x) => x.id === row.id);
      if (!inv) return null;
      const next = invoiceFlow[inv.status];
      return (
        <EditDeleteMenu
          onView={() => setViewInvoice(inv)}
          canView
          onEdit={() => { setEditingInvoice(inv); setShowInvoiceModal(true); }}
          onDelete={() => store.remove("invoices", inv.id)}
          itemLabel={inv.number}
          extraItems={next ? [{ label: `Mark ${next}`, onClick: () => store.update("invoices", inv.id, { status: next as Invoice["status"] }) }] : []}
        />
      );
    }},
  ];

  const methodLabels: Record<string, string> = { BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque", CASH: "Cash", CREDIT_CARD: "Credit Card" };

  const paymentColumns: Column<Record<string, unknown>>[] = [
    { key: "reference", label: "Reference", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
    { key: "type", label: "Type", render: (v) => (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(v as string) === "RECEIVED" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
        {(v as string) === "RECEIVED" ? "Received" : "Sent"}
      </span>
    )},
    { key: "customerId", label: "Party", render: (_v, row) => {
      const p = row as unknown as Payment;
      if (p.customerId) return <CustomerLink customerId={p.customerId} />;
      if (p.vendorId) return <VendorLink vendorId={p.vendorId} />;
      return "—";
    }},
    { key: "date", label: "Date" },
    { key: "method", label: "Method", render: (v) => <Badge variant="outline">{methodLabels[v as string] ?? (v as string)}</Badge> },
    { key: "amount", label: "Amount", render: (v) => <span className="font-semibold">{egp(v as number)}</span>, className: "text-right" },
    { key: "id", label: "", render: (_v, row) => {
      const p = store.payments.find((x) => x.id === row.id);
      if (!p) return null;
      return (
        <EditDeleteMenu
          onView={() => setViewPayment(p)}
          canView
          onEdit={() => { setEditingPayment(p); setShowPaymentModal(true); }}
          onDelete={() => store.remove("payments", p.id)}
          itemLabel={p.reference}
        />
      );
    }},
  ];

  const bankColumns: Column<Record<string, unknown>>[] = [
    { key: "code", label: "Code", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
    { key: "name", label: "Name", render: (_v, row) => {
      const b = row as unknown as BankAccount;
      return <span className="font-medium cursor-pointer text-blue-700 hover:underline" onClick={(e) => { e.stopPropagation(); setBankDetailId(b.id); }}>{b.name}</span>;
    }},
    { key: "bankName", label: "Bank" },
    { key: "accountNumber", label: "Account #", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
    { key: "currency", label: "Currency" },
    { key: "balance", label: "Balance", render: (v) => <span className="font-semibold text-green-700">{egp(v as number)}</span>, className: "text-right" },
    { key: "type", label: "Type", render: (v) => <Badge variant="outline">{v as string}</Badge> },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
    { key: "id", label: "", render: (_v, row) => {
      const b = row as unknown as BankAccount;
      return (
        <EditDeleteMenu
          onView={() => setBankDetailId(b.id)}
          canView
          onEdit={() => { setEditingBank(b); setShowBankModal(true); }}
          onDelete={() => store.remove("bankAccounts", b.id)}
          itemLabel={b.name}
        />
      );
    }},
  ];

  const vendorColumns: Column<Record<string, unknown>>[] = [
    { key: "code", label: "Code", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
    { key: "id", label: "Vendor", render: (_v, row) => {
      const vendor = row as unknown as { id: string };
      return <VendorLink vendorId={vendor.id} />;
    }},
    { key: "category", label: "Category" },
    { key: "outstanding", label: "Outstanding (AP)", render: (v) => <span className="font-semibold text-red-600">{egp(v as number)}</span>, className: "text-right" },
    { key: "paymentTerms", label: "Terms" },
    { key: "gmpCertified", label: "GMP", render: (v) => (v as boolean) ? <Badge className="bg-green-100 text-green-800">Certified</Badge> : <Badge variant="outline">No</Badge> },
  ];

  // ─── Filter configs ────────────────────────────────────────────
  const invoiceFilterFields = [{ key: "status", label: "Status", type: "select" as const, options: [
    { label: "Draft", value: "DRAFT" }, { label: "Sent", value: "SENT" },
    { label: "Partial", value: "PARTIAL" }, { label: "Paid", value: "PAID" }, { label: "Overdue", value: "OVERDUE" },
  ]}];

  const paymentFilterFields = [
    { key: "type", label: "Type", type: "select" as const, options: [{ label: "Received", value: "RECEIVED" }, { label: "Sent", value: "SENT" }] },
    { key: "method", label: "Method", type: "select" as const, options: [
      { label: "Bank Transfer", value: "BANK_TRANSFER" }, { label: "Cheque", value: "CHEQUE" },
      { label: "Cash", value: "CASH" }, { label: "Credit Card", value: "CREDIT_CARD" },
    ]},
  ];

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: t("acct.overview") },
    { key: "invoices", label: `${t("fin.invoices")} (${store.invoices.length})` },
    { key: "payments", label: `${t("fin.payments")} (${store.payments.length})` },
    { key: "gl", label: `Chart of Accounts (${store.glAccounts.length})` },
    { key: "vendors", label: `Vendors AP (${store.vendors.length})` },
    { key: "budgets", label: `${t("fin.budgets")} (${store.budgets.length})` },
    { key: "trial", label: "Trial Balance" },
    { key: "ratios", label: "Financial Ratios" },
    { key: "cashflow", label: "Cash Flow" },
    { key: "sales-orders", label: `${t("fin.salesOrders")} (${store.salesOrders.length})` },
    { key: "banking", label: "Banking" },
    { key: "payment-gateway", label: "Payment Gateway" },
  ];

  // ─── Budget CRUD ──────────────────────────────────────────────
  const budgetFields: EntityField[] = [
    { name: "name", label: "Budget Name", type: "text", required: true },
    { name: "fiscalYear", label: "Fiscal Year", type: "text", required: true, defaultValue: String(new Date().getFullYear()), placeholder: "2026" },
    { name: "period", label: "Period", type: "select", required: true, defaultValue: "Q1", options: ["Q1", "Q2", "Q3", "Q4", "Annual", "Monthly"].map((p) => ({ label: p, value: p })) },
    { name: "accountId", label: "GL Account", type: "select", options: [{ label: "— None —", value: "" }, ...store.glAccounts.map((a) => ({ label: `${a.code} — ${a.name}`, value: a.id }))] },
    { name: "costCenterId", label: "Cost Center", type: "select", options: [{ label: "— None —", value: "" }, ...store.costCenters.map((c) => ({ label: `${c.code} — ${c.name}`, value: c.id }))] },
    { name: "budgeted", label: "Budgeted (EGP)", type: "number", required: true, defaultValue: 0 },
    { name: "actual", label: "Actual (EGP)", type: "number", defaultValue: 0 },
    { name: "status", label: "Status", type: "select", required: true, defaultValue: "DRAFT", options: [{ label: "Draft", value: "DRAFT" }, { label: "Approved", value: "APPROVED" }, { label: "Closed", value: "CLOSED" }] },
  ];

  function handleBudgetSubmit(data: EntityFormData) {
    const status = (String(data.status || "DRAFT")) as Budget["status"];
    const payload = { name: String(data.name), fiscalYear: String(data.fiscalYear || new Date().getFullYear()), period: String(data.period || "Q1"), accountId: data.accountId ? String(data.accountId) : undefined, costCenterId: data.costCenterId ? String(data.costCenterId) : undefined, budgeted: Number(data.budgeted) || 0, actual: Number(data.actual) || 0, status };
    if (editingBudget) { store.update("budgets", editingBudget.id, payload); }
    else { store.add("budgets", { id: store.genId("bud"), ...payload }); }
    setShowBudgetModal(false); setEditingBudget(null);
  }

  // ─── Recent transactions for overview ──────────────────────────
  const recentTx = useMemo(() => {
    const items: { label: string; amount: number; type: "Income" | "Expense"; date: string; status: string }[] = [];
    store.invoices.slice(0, 5).forEach((i) => items.push({ label: `Invoice ${i.number} — ${customerName(i.customerId)}`, amount: i.total, type: "Income", date: i.date.slice(0, 10), status: i.status }));
    store.payments.forEach((p) => items.push({
      label: `${p.reference} — ${p.customerId ? customerName(p.customerId) : p.vendorId ? vendorName(p.vendorId) : ""}`,
      amount: p.amount, type: p.type === "RECEIVED" ? "Income" : "Expense", date: p.date.slice(0, 10), status: p.type,
    }));
    return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  }, [store.invoices, store.payments, store.customers, store.vendors]);

  // ─── Pending cheques summary ───────────────────────────────────
  const pendingIncoming = store.cheques.filter((c) => c.type === "INCOMING" && (c.status === "PENDING" || c.status === "DEPOSITED")).reduce((s, c) => s + c.amount, 0);
  const pendingOutgoing = store.cheques.filter((c) => c.type === "OUTGOING" && c.status === "PENDING").reduce((s, c) => s + c.amount, 0);

  return (
    <div className="p-6 space-y-6">
      <PageHeader title={t("fin.title")} description={t("fin.manageFinance")}>
        {activeTab === "invoices" && (
          <Button type="button" onClick={() => { setEditingInvoice(null); setShowInvoiceModal(true); }} className="gap-2"><Plus className="h-4 w-4" /> New Invoice</Button>
        )}
        {activeTab === "payments" && (
          <Button type="button" onClick={() => { setEditingPayment(null); setShowPaymentModal(true); }} className="gap-2"><Plus className="h-4 w-4" /> Record Payment</Button>
        )}
        {activeTab === "gl" && glView === "coa" && (
          <Button type="button" onClick={() => { setEditingGL(null); setGlFormOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Add GL Account</Button>
        )}
        {activeTab === "budgets" && (
          <Button type="button" onClick={() => { setEditingBudget(null); setShowBudgetModal(true); }} className="gap-2"><Plus className="h-4 w-4" /> Add Budget</Button>
        )}
        {(activeTab === "invoices" || activeTab === "payments") && (
          <Button type="button" variant="outline" onClick={() => {
            if (activeTab === "invoices") downloadCSV("invoices.csv", store.invoices.map((i) => ({ Number: i.number, Customer: customerName(i.customerId), Date: i.date.slice(0, 10), DueDate: i.dueDate.slice(0, 10), Total: i.total, Status: i.status })) as unknown as Record<string, unknown>[]);
            else downloadCSV("payments.csv", store.payments.map((p) => ({ Reference: p.reference, Type: p.type, Party: p.customerId ? customerName(p.customerId) : p.vendorId ? vendorName(p.vendorId) : "", Amount: p.amount, Method: p.method, Date: p.date })) as unknown as Record<string, unknown>[]);
          }} className="gap-2"><Download className="h-4 w-4" /> Export CSV</Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title={t("fin.totalReceivables")} value={egp(totalBankBalance)} subtitle={`${store.bankAccounts.length} active accounts`} icon={Landmark} />
        <StatsCard title={t("fin.totalPayables")} value={egp(totalAR)} subtitle="Outstanding from customers" icon={TrendingUp} />
        <StatsCard title={t("fin.netCashFlow")} value={egp(totalAP)} subtitle="Owed to vendors" icon={TrendingDown} />
        <StatsCard title={t("fin.overdueInvoices")} value={egp(netPosition)} subtitle="Bank + AR − AP" icon={DollarSign} />
      </div>

      <div className="border-b border-border">
        <nav className="flex flex-wrap gap-1 -mb-px">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >{t.label}</button>
          ))}
        </nav>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 rounded-lg border border-border divide-y divide-border">
              <div className="px-4 py-3 bg-muted/30">
                <h3 className="text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Recent Transactions</h3>
              </div>
              {recentTx.map((tx, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${tx.type === "Income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {tx.type === "Income" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.label}</p>
                      <p className="text-xs text-muted-foreground">{tx.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={tx.status} />
                    <span className={`text-sm font-semibold ${tx.type === "Income" ? "text-green-700" : "text-red-600"}`}>
                      {tx.type === "Income" ? "+" : "-"}{egp(tx.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Invoice Summary</h3>
                {(["PAID", "SENT", "PARTIAL", "OVERDUE", "DRAFT"] as const).map((status) => {
                  const count = store.invoices.filter((i) => i.status === status).length;
                  const total = store.invoices.filter((i) => i.status === status).reduce((s, i) => s + i.total, 0);
                  if (count === 0) return null;
                  return (
                    <div key={status} className="flex justify-between items-center py-1.5 text-sm">
                      <StatusBadge status={status} />
                      <span className="text-muted-foreground">{count} — {egp(total)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Cheque Position</h3>
                <div className="flex justify-between items-center py-1.5 text-sm">
                  <span className="text-muted-foreground">Pending Incoming</span>
                  <span className="font-medium text-green-700">{egp(pendingIncoming)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 text-sm">
                  <span className="text-muted-foreground">Pending Outgoing</span>
                  <span className="font-medium text-red-600">{egp(pendingOutgoing)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 text-sm border-t pt-2 mt-1">
                  <span className="text-muted-foreground font-medium">Net Cheque Position</span>
                  <span className="font-semibold">{egp(pendingIncoming - pendingOutgoing)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "invoices" && (
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="p-4 border-b border-border">
            <FilterBar searchValue={invoiceFilters._search} onSearchChange={(v) => setInvoiceFilters((f) => ({ ...f, _search: v }))}
              fields={invoiceFilterFields} values={invoiceFilters} onChange={(k, v) => setInvoiceFilters((f) => ({ ...f, [k]: v }))} />
          </div>
          <DataTable columns={invoiceColumns} data={filteredInvoices as unknown as Record<string, unknown>[]} exportable exportFilename="erp-finance.csv" emptyMessage="No invoices found." />
        </div>
      )}

      {activeTab === "payments" && (
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="p-4 border-b border-border">
            <FilterBar searchValue={paymentFilters._search} onSearchChange={(v) => setPaymentFilters((f) => ({ ...f, _search: v }))}
              fields={paymentFilterFields} values={paymentFilters} onChange={(k, v) => setPaymentFilters((f) => ({ ...f, [k]: v }))} />
          </div>
          <DataTable columns={paymentColumns} data={filteredPayments as unknown as Record<string, unknown>[]} exportable exportFilename="erp-finance.csv" emptyMessage="No payments found." />
        </div>
      )}

      {/* ─── GL / Chart of Accounts Tab ────────────────────────────── */}
      {activeTab === "gl" && (
        <div className="space-y-3">
          {/* Sub-tab toggle buttons */}
          <div className="flex gap-1 border-b border-border pb-2 flex-wrap">
            {([["coa", "Chart of Accounts", BookOpen], ["ledger", "General Ledger", ScrollText], ["trial-balance", "Trial Balance", Calculator]] as const).map(([key, label, Icon]) => (
              <button key={key} onClick={() => setGlView(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${glView === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            ))}
          </div>

          {/* ── Chart of Accounts sub-view ── */}
          {glView === "coa" && (
            <div className="space-y-3">
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
                        Debit: ["ASSET", "EXPENSE"].includes(a.type) ? (a.balance ?? 0) : 0,
                        Credit: ["LIABILITY", "EQUITY", "REVENUE"].includes(a.type) ? (a.balance ?? 0) : 0,
                      }));
                      downloadCSV("chart-of-accounts.csv", rows);
                    }}><Download className="h-3 w-3 mr-1" /> Export</Button>
                    <Button size="sm" onClick={() => { setEditingGL(null); setGlFormOpen(true); }}><Plus className="h-3 w-3 mr-1" /> Add Account</Button>
                  </div>
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Assets</div><div className="text-lg font-bold text-blue-700">EGP {((glCoaTotalAssets ?? 0) / 1e6).toFixed(2)}M</div></CardContent></Card>
                <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Liabilities</div><div className="text-lg font-bold text-red-600">EGP {(Math.abs(glCoaTotalLiabilities ?? 0) / 1e6).toFixed(2)}M</div></CardContent></Card>
                <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Equity</div><div className="text-lg font-bold text-purple-700">EGP {((glCoaTotalEquity ?? 0) / 1e6).toFixed(2)}M</div></CardContent></Card>
                <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Revenue</div><div className="text-lg font-bold text-green-700">EGP {((glCoaTotalRevenue ?? 0) / 1e6).toFixed(2)}M</div></CardContent></Card>
                <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Expenses</div><div className="text-lg font-bold text-amber-700">EGP {((glCoaTotalExpenses ?? 0) / 1e6).toFixed(2)}M</div></CardContent></Card>
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
                        return <span className={`font-semibold ${(bal ?? 0) < 0 ? "text-red-600" : ""}`}>{Math.abs(bal ?? 0).toLocaleString()}</span>;
                      }},
                      { key: "isActive", label: "Status", render: (v) => <Badge variant={(v as boolean) ? "success" : "secondary"}>{(v as boolean) ? "Active" : "Inactive"}</Badge> },
                      { key: "id", label: "", render: (_v, row) => {
                        const a = row as unknown as GLAccount;
                        return <EditDeleteMenu onEdit={() => { setEditingGL(a); setGlFormOpen(true); }} onDelete={() => store.remove("glAccounts", a.id)} itemLabel={a.name} compact />;
                      }},
                    ] as Column<Record<string, unknown>>[]}
                    data={filteredGL as unknown as Record<string, unknown>[]}
                    exportable exportFilename="erp-chart-of-accounts.csv" emptyMessage="No accounts found."
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
            </div>
          )}

          {/* ── General Ledger sub-view ── */}
          {glView === "ledger" && (() => {
            const selectedAccount = store.glAccounts.find((a) => a.id === selectedGLAccountId);
            const postedJournalEntries = store.journalEntries.filter((j) => j.status === "POSTED");
            const ledgerLines: { date: string; jeNumber: string; jeDescription: string; lineDescription: string; debit: number; credit: number }[] = [];
            postedJournalEntries.forEach((je) => {
              (je.lines || []).forEach((line) => {
                if (line.accountId === selectedGLAccountId) {
                  ledgerLines.push({
                    date: je.date,
                    jeNumber: je.number,
                    jeDescription: je.description,
                    lineDescription: line.description || je.description,
                    debit: line.debit ?? 0,
                    credit: line.credit ?? 0,
                  });
                }
              });
            });
            ledgerLines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            const isDebitNormal = selectedAccount ? ["ASSET", "EXPENSE"].includes(selectedAccount.type) : true;
            const openingBalance = 0;
            let runningBalance = openingBalance;
            const ledgerRows = ledgerLines.map((line) => {
              if (isDebitNormal) {
                runningBalance = runningBalance + line.debit - line.credit;
              } else {
                runningBalance = runningBalance + line.credit - line.debit;
              }
              return { ...line, runningBalance };
            });
            const closingBalance = runningBalance;

            return (
              <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-[300px]">
                    <Label className="text-sm whitespace-nowrap">Account:</Label>
                    <Select value={selectedGLAccountId} onValueChange={setSelectedGLAccountId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a GL account..." />
                      </SelectTrigger>
                      <SelectContent>
                        {store.glAccounts.filter((a) => a.isActive).sort((a, b) => a.code.localeCompare(b.code)).map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedAccount && (
                    <div className="flex items-center gap-2">
                      {typeBadge(selectedAccount.type)}
                      <span className="text-sm text-muted-foreground">{selectedAccount.subType}</span>
                    </div>
                  )}
                </div>

                {!selectedGLAccountId ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <ScrollText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">Select a GL account above to view its ledger entries.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span className="flex items-center gap-2"><ScrollText className="h-4 w-4" /> General Ledger: {selectedAccount?.code} - {selectedAccount?.name}</span>
                        <span className="text-xs text-muted-foreground">{ledgerRows.length} entries</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-2 font-medium">Date</th>
                            <th className="text-left p-2 font-medium">JE Number</th>
                            <th className="text-left p-2 font-medium">Description</th>
                            <th className="text-right p-2 font-medium">Debit</th>
                            <th className="text-right p-2 font-medium">Credit</th>
                            <th className="text-right p-2 font-medium">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b bg-blue-50/50">
                            <td className="p-2 text-xs text-muted-foreground" colSpan={5}>Opening Balance</td>
                            <td className="p-2 text-right font-semibold">EGP {(openingBalance ?? 0).toLocaleString()}</td>
                          </tr>
                          {ledgerRows.length === 0 ? (
                            <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No posted journal entries found for this account.</td></tr>
                          ) : (
                            ledgerRows.map((row, idx) => (
                              <tr key={idx} className="border-b hover:bg-muted/30">
                                <td className="p-2 text-xs">{new Date(row.date).toLocaleDateString()}</td>
                                <td className="p-2"><span className="font-mono text-xs font-semibold">{row.jeNumber}</span></td>
                                <td className="p-2 text-xs">{row.lineDescription}</td>
                                <td className="p-2 text-right font-medium">{row.debit > 0 ? `EGP ${(row.debit ?? 0).toLocaleString()}` : ""}</td>
                                <td className="p-2 text-right font-medium">{row.credit > 0 ? `EGP ${(row.credit ?? 0).toLocaleString()}` : ""}</td>
                                <td className={`p-2 text-right font-semibold ${row.runningBalance < 0 ? "text-red-600" : ""}`}>EGP {(row.runningBalance ?? 0).toLocaleString()}</td>
                              </tr>
                            ))
                          )}
                          <tr className="border-t-2 bg-blue-50/50 font-semibold">
                            <td className="p-2" colSpan={3}>Closing Balance</td>
                            <td className="p-2 text-right">EGP {ledgerRows.reduce((s, r) => s + r.debit, 0).toLocaleString()}</td>
                            <td className="p-2 text-right">EGP {ledgerRows.reduce((s, r) => s + r.credit, 0).toLocaleString()}</td>
                            <td className={`p-2 text-right ${closingBalance < 0 ? "text-red-600" : ""}`}>EGP {(closingBalance ?? 0).toLocaleString()}</td>
                          </tr>
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })()}

          {/* ── Trial Balance sub-view ── */}
          {glView === "trial-balance" && (() => {
            const trialBalanceAccounts = activeGLAccounts
              .sort((a, b) => a.code.localeCompare(b.code))
              .map((a) => {
                const isDebitNormal = ["ASSET", "EXPENSE"].includes(a.type);
                const debitBalance = isDebitNormal ? Math.abs(a.balance ?? 0) : 0;
                const creditBalance = !isDebitNormal ? Math.abs(a.balance ?? 0) : 0;
                return { ...a, debitBalance, creditBalance };
              });
            const totalDebitsGL = trialBalanceAccounts.reduce((s, a) => s + a.debitBalance, 0);
            const totalCreditsGL = trialBalanceAccounts.reduce((s, a) => s + a.creditBalance, 0);
            const isBalancedGL = Math.abs(totalDebitsGL - totalCreditsGL) < 0.01;

            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Trial Balance as of {new Date().toLocaleDateString()}</span>
                    {isBalancedGL ? (
                      <Badge variant="success">Balanced</Badge>
                    ) : (
                      <Badge variant="destructive">Out of Balance: EGP {Math.abs(totalDebitsGL - totalCreditsGL).toLocaleString()}</Badge>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => {
                    const rows = trialBalanceAccounts.map((a) => ({
                      Code: a.code, Name: a.name, Type: a.type,
                      Debit: a.debitBalance, Credit: a.creditBalance,
                    }));
                    rows.push({ Code: "", Name: "TOTAL", Type: "" as GLAccount["type"], Debit: totalDebitsGL, Credit: totalCreditsGL });
                    downloadCSV("trial-balance.csv", rows);
                  }}><Download className="h-3 w-3 mr-1" /> Export CSV</Button>
                </div>
                <Card>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2 font-medium">Account Code</th>
                          <th className="text-left p-2 font-medium">Account Name</th>
                          <th className="text-left p-2 font-medium">Type</th>
                          <th className="text-right p-2 font-medium">Debit Balance</th>
                          <th className="text-right p-2 font-medium">Credit Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trialBalanceAccounts.map((a) => (
                          <tr key={a.id} className="border-b hover:bg-muted/30">
                            <td className="p-2"><span className="font-mono text-xs font-semibold">{a.code}</span></td>
                            <td className="p-2 font-medium">{a.name}</td>
                            <td className="p-2">{typeBadge(a.type)}</td>
                            <td className="p-2 text-right font-medium">{a.debitBalance > 0 ? `EGP ${(a.debitBalance ?? 0).toLocaleString()}` : ""}</td>
                            <td className="p-2 text-right font-medium">{a.creditBalance > 0 ? `EGP ${(a.creditBalance ?? 0).toLocaleString()}` : ""}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 bg-muted/50 font-bold">
                          <td className="p-2" colSpan={3}>Total</td>
                          <td className="p-2 text-right">EGP {(totalDebitsGL ?? 0).toLocaleString()}</td>
                          <td className="p-2 text-right">EGP {(totalCreditsGL ?? 0).toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <div className="text-xs text-muted-foreground">Total Debits</div>
                      <div className="text-xl font-bold">EGP {(totalDebitsGL ?? 0).toLocaleString()}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <div className="text-xs text-muted-foreground">Total Credits</div>
                      <div className="text-xl font-bold">EGP {(totalCreditsGL ?? 0).toLocaleString()}</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === "vendors" && (
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <DataTable columns={vendorColumns} data={store.vendors as unknown as Record<string, unknown>[]} exportable exportFilename="erp-finance.csv" emptyMessage="No vendors found." />
        </div>
      )}

      {activeTab === "budgets" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Budgeted</div><div className="text-lg font-bold">{egp(store.budgets.reduce((s, b) => s + b.budgeted, 0))}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Actual</div><div className="text-lg font-bold">{egp(store.budgets.reduce((s, b) => s + b.actual, 0))}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Net Variance</div><div className={`text-lg font-bold ${store.budgets.reduce((s, b) => s + (b.budgeted - b.actual), 0) >= 0 ? "text-green-600" : "text-red-600"}`}>{egp(store.budgets.reduce((s, b) => s + (b.budgeted - b.actual), 0))}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Active Budgets</div><div className="text-lg font-bold">{store.budgets.filter((b) => b.status === "APPROVED").length} <span className="text-sm font-normal text-muted-foreground">of {store.budgets.length}</span></div></CardContent></Card>
          </div>
          <div className="flex justify-end"><Button type="button" size="sm" onClick={() => { setEditingBudget(null); setShowBudgetModal(true); }}><Plus className="h-4 w-4 mr-1" /> Add Budget</Button></div>
          <div className="bg-card rounded-xl border border-border shadow-sm">
            <DataTable
              columns={[
                { key: "name", label: "Budget", render: (v) => <span className="font-medium">{v as string}</span> },
                { key: "fiscalYear", label: "FY" },
                { key: "period", label: "Period", render: (v) => <Badge variant="outline">{v as string}</Badge> },
                { key: "costCenterId", label: "Linked To", render: (_v, row) => {
                  const b = row as unknown as Budget;
                  return b.costCenterId ? <span className="text-xs">{ccName(b.costCenterId)}</span> : b.accountId ? <span className="text-xs">{glName(b.accountId)}</span> : <span className="text-muted-foreground">—</span>;
                }},
                { key: "budgeted", label: "Budgeted", className: "text-right", render: (v) => egp(v as number) },
                { key: "actual", label: "Actual", className: "text-right", render: (v) => egp(v as number) },
                { key: "id", label: "Variance", className: "text-right", render: (_v, row) => {
                  const b = row as unknown as Budget;
                  const v = b.budgeted - b.actual;
                  return <span className={`font-semibold ${v >= 0 ? "text-green-600" : "text-red-600"}`}>{v >= 0 ? "+" : ""}{egp(v)}</span>;
                }},
                { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
                { key: "accountId", label: "", render: (_v, row) => {
                  const b = row as unknown as Budget;
                  return <EditDeleteMenu onView={() => setViewBudget(b)} canView onEdit={() => { setEditingBudget(b); setShowBudgetModal(true); }} onDelete={() => store.remove("budgets", b.id)} itemLabel={b.name} />;
                }},
              ] as Column<Record<string, unknown>>[]}
              data={store.budgets as unknown as Record<string, unknown>[]}
              exportable exportFilename="erp-finance.csv" emptyMessage="No budgets defined."
            />
          </div>
        </div>
      )}

      {activeTab === "trial" && (() => {
        const trialAccounts = store.glAccounts.filter((a) => a.isActive);
        const typeOrder: GLAccount["type"][] = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];
        const typeLabels: Record<string, string> = { ASSET: "Assets", LIABILITY: "Liabilities", EQUITY: "Equity", REVENUE: "Revenue", EXPENSE: "Expenses" };
        const typeColors: Record<string, string> = { ASSET: "bg-blue-100 text-blue-800", LIABILITY: "bg-red-100 text-red-800", EQUITY: "bg-purple-100 text-purple-800", REVENUE: "bg-green-100 text-green-800", EXPENSE: "bg-amber-100 text-amber-800" };
        const grouped = typeOrder.map((type) => {
          const accounts = trialAccounts.filter((a) => a.type === type);
          const totalDebit = ["ASSET", "EXPENSE"].includes(type) ? accounts.reduce((s, a) => s + Math.abs(a.balance), 0) : 0;
          const totalCredit = ["LIABILITY", "EQUITY", "REVENUE"].includes(type) ? accounts.reduce((s, a) => s + Math.abs(a.balance), 0) : 0;
          return { type, label: typeLabels[type], accounts, totalDebit, totalCredit };
        });
        const grandDebit = grouped.reduce((s, g) => s + g.totalDebit, 0);
        const grandCredit = grouped.reduce((s, g) => s + g.totalCredit, 0);
        const isBalanced = Math.abs(grandDebit - grandCredit) < 0.01;

        const exportTrialCSV = () => {
          const rows: Record<string, unknown>[] = [];
          grouped.forEach((g) => {
            rows.push({ Code: "", Account: `--- ${g.label} ---`, Type: g.type, SubType: "", Debit: "", Credit: "" });
            g.accounts.forEach((a) => {
              rows.push({
                Code: a.code, Account: a.name, Type: a.type, SubType: a.subType,
                Debit: ["ASSET", "EXPENSE"].includes(a.type) ? Math.abs(a.balance) : 0,
                Credit: ["LIABILITY", "EQUITY", "REVENUE"].includes(a.type) ? Math.abs(a.balance) : 0,
              });
            });
            rows.push({ Code: "", Account: `Total ${g.label}`, Type: "", SubType: "", Debit: g.totalDebit, Credit: g.totalCredit });
          });
          rows.push({ Code: "", Account: "GRAND TOTAL", Type: "", SubType: "", Debit: grandDebit, Credit: grandCredit });
          downloadCSV("trial-balance.csv", rows);
        };

        return (
          <div className="space-y-4">
            {/* Filters & Export */}
            <div className="flex flex-wrap items-end gap-4 justify-between">
              <div className="flex items-end gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">From Date</Label>
                  <Input type="date" className="h-8 text-sm w-40 mt-1" value={trialDateFrom} onChange={(e) => setTrialDateFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">To Date</Label>
                  <Input type="date" className="h-8 text-sm w-40 mt-1" value={trialDateTo} onChange={(e) => setTrialDateTo(e.target.value)} />
                </div>
                {(trialDateFrom || trialDateTo) && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setTrialDateFrom(""); setTrialDateTo(""); }}>Clear</Button>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={exportTrialCSV}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
            </div>

            {/* Balance verification banner */}
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium ${isBalanced ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
              {isBalanced ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {isBalanced ? "Trial balance is in balance — total debits equal total credits." : `Trial balance is out of balance — difference of ${egp(Math.abs(grandDebit - grandCredit))}.`}
            </div>

            {/* Grouped accounts */}
            {grouped.map((g) => (
              <Card key={g.type}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[g.type]}`}>{g.label}</span>
                    <span className="text-xs text-muted-foreground font-normal">({g.accounts.length} account{g.accounts.length !== 1 ? "s" : ""})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {g.accounts.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left p-3 font-medium text-xs">Code</th>
                          <th className="text-left p-3 font-medium text-xs">Account Name</th>
                          <th className="text-left p-3 font-medium text-xs">Sub-Type</th>
                          <th className="text-right p-3 font-medium text-xs">Debit</th>
                          <th className="text-right p-3 font-medium text-xs">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.accounts.map((a) => (
                          <tr key={a.id} className="border-b hover:bg-muted/20">
                            <td className="p-3 font-mono text-xs font-semibold">{a.code}</td>
                            <td className="p-3 font-medium">{a.name}</td>
                            <td className="p-3 text-xs text-muted-foreground">{a.subType}</td>
                            <td className="p-3 text-right font-semibold">
                              {["ASSET", "EXPENSE"].includes(a.type) ? egp(Math.abs(a.balance)) : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="p-3 text-right font-semibold">
                              {["LIABILITY", "EQUITY", "REVENUE"].includes(a.type) ? egp(Math.abs(a.balance)) : <span className="text-muted-foreground">—</span>}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-muted/40 font-semibold">
                          <td className="p-3" colSpan={3}>Total {g.label}</td>
                          <td className="p-3 text-right">{g.totalDebit > 0 ? egp(g.totalDebit) : "—"}</td>
                          <td className="p-3 text-right">{g.totalCredit > 0 ? egp(g.totalCredit) : "—"}</td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-4 text-center text-xs text-muted-foreground">No active accounts in this category.</div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Grand totals */}
            <Card className={`border-2 ${isBalanced ? "border-green-200" : "border-red-200"}`}>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className={`font-bold text-base ${isBalanced ? "bg-green-50" : "bg-red-50"}`}>
                      <td className="p-4">Grand Total</td>
                      <td className="p-4 text-right">{egp(grandDebit)}</td>
                      <td className="p-4 text-right">{egp(grandCredit)}</td>
                    </tr>
                    {!isBalanced && (
                      <tr className="bg-red-50/50 text-red-700">
                        <td className="px-4 pb-3 text-sm font-medium">Difference</td>
                        <td className="px-4 pb-3 text-right text-sm font-semibold" colSpan={2}>{egp(Math.abs(grandDebit - grandCredit))}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {grouped.map((g) => (
                <Card key={g.type}>
                  <CardContent className="p-4 text-center">
                    <div className="text-xs text-muted-foreground">{g.label}</div>
                    <div className="text-lg font-bold mt-1">{egp(g.totalDebit || g.totalCredit)}</div>
                    <div className="text-xs text-muted-foreground">{g.accounts.length} account{g.accounts.length !== 1 ? "s" : ""}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })()}

      {activeTab === "ratios" && (
        <div className="space-y-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" /> Liquidity Ratios</CardTitle></CardHeader>
            <CardContent><div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center"><div className="text-xs text-muted-foreground">Current Ratio</div><div className="text-2xl font-bold">{glCurrentLiabilities > 0 ? (glCurrentAssets / glCurrentLiabilities).toFixed(2) : "N/A"}</div><div className="text-xs text-muted-foreground">Current Assets / Current Liabilities</div></div>
              <div className="p-4 rounded-lg bg-muted/50 text-center"><div className="text-xs text-muted-foreground">Quick Ratio</div><div className="text-2xl font-bold">{glCurrentLiabilities > 0 ? ((glCurrentAssets - glInventory) / glCurrentLiabilities).toFixed(2) : "N/A"}</div><div className="text-xs text-muted-foreground">(Current Assets − Inventory) / CL</div></div>
              <div className="p-4 rounded-lg bg-muted/50 text-center"><div className="text-xs text-muted-foreground">Cash Ratio</div><div className="text-2xl font-bold">{glCurrentLiabilities > 0 ? (totalBankBalance / glCurrentLiabilities).toFixed(2) : "N/A"}</div><div className="text-xs text-muted-foreground">Cash / Current Liabilities</div></div>
            </div></CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Profitability Ratios</CardTitle></CardHeader>
            <CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center"><div className="text-xs text-muted-foreground">Gross Margin</div><div className="text-2xl font-bold">{glTotalRevenue > 0 ? (((glTotalRevenue - glCOGS) / glTotalRevenue) * 100).toFixed(1) : "0"}%</div></div>
              <div className="p-4 rounded-lg bg-muted/50 text-center"><div className="text-xs text-muted-foreground">Net Margin</div><div className="text-2xl font-bold">{glTotalRevenue > 0 ? ((netIncome / glTotalRevenue) * 100).toFixed(1) : "0"}%</div></div>
              <div className="p-4 rounded-lg bg-muted/50 text-center"><div className="text-xs text-muted-foreground">ROE</div><div className="text-2xl font-bold">{glTotalEquity > 0 ? ((netIncome / glTotalEquity) * 100).toFixed(1) : "0"}%</div></div>
              <div className="p-4 rounded-lg bg-muted/50 text-center"><div className="text-xs text-muted-foreground">ROA</div><div className="text-2xl font-bold">{glTotalAssets > 0 ? ((netIncome / glTotalAssets) * 100).toFixed(1) : "0"}%</div></div>
            </div></CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Leverage & Efficiency</CardTitle></CardHeader>
            <CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center"><div className="text-xs text-muted-foreground">Debt-to-Equity</div><div className="text-2xl font-bold">{glTotalEquity > 0 ? (glTotalLiabilities / glTotalEquity).toFixed(2) : "N/A"}</div></div>
              <div className="p-4 rounded-lg bg-muted/50 text-center"><div className="text-xs text-muted-foreground">Interest Coverage</div><div className="text-2xl font-bold">{glInterestExpense > 0 ? (operatingIncome / glInterestExpense).toFixed(1) : "N/A"}x</div></div>
              <div className="p-4 rounded-lg bg-muted/50 text-center"><div className="text-xs text-muted-foreground">AR Turnover</div><div className="text-2xl font-bold">{totalAR > 0 ? (glTotalRevenue / totalAR).toFixed(1) : "N/A"}x</div></div>
              <div className="p-4 rounded-lg bg-muted/50 text-center"><div className="text-xs text-muted-foreground">Inventory Turnover</div><div className="text-2xl font-bold">{glInventory > 0 ? (glCOGS / glInventory).toFixed(1) : "N/A"}x</div></div>
            </div></CardContent>
          </Card>
        </div>
      )}

      {activeTab === "cashflow" && (
        <div className="space-y-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-600" /> Operating Activities</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm py-1.5"><span>Collections from Customers</span><span className="font-semibold text-green-600">+{egp(totalInflows)}</span></div>
              <div className="flex justify-between text-sm py-1.5"><span>Payments to Vendors</span><span className="font-semibold text-red-600">-{egp(totalOutflows)}</span></div>
              <div className="flex justify-between text-sm py-1.5 border-t font-semibold"><span>Net Operating Cash Flow</span><span className={totalInflows - totalOutflows >= 0 ? "text-green-600" : "text-red-600"}>{egp(totalInflows - totalOutflows)}</span></div>
              <div className="mt-2 space-y-1">
                {store.payments.map((p) => (
                  <div key={p.id} className="flex justify-between text-xs py-1 text-muted-foreground">
                    <span>{p.reference} — {p.customerId ? customerName(p.customerId) : p.vendorId ? vendorName(p.vendorId) : "—"}</span>
                    <span className={p.type === "RECEIVED" ? "text-green-600" : "text-red-600"}>{p.type === "RECEIVED" ? "+" : "-"}{egp(p.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-blue-600" /> Investing Activities</CardTitle></CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm py-1.5"><span>Equipment Purchases (Fixed Assets)</span><span className="font-semibold text-red-600">-{egp(0)}</span></div>
              <div className="text-xs text-muted-foreground mt-1">No investing transactions recorded this period.</div>
            </CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Landmark className="h-4 w-4 text-purple-600" /> Financing Activities</CardTitle></CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm py-1.5"><span>Loan Proceeds</span><span className="font-semibold text-green-600">+{egp(0)}</span></div>
              <div className="flex justify-between text-sm py-1.5"><span>Interest Paid</span><span className="font-semibold text-red-600">-{egp(glInterestExpense)}</span></div>
              <div className="flex justify-between text-sm py-1.5 border-t font-semibold"><span>Net Financing</span><span className="text-red-600">-{egp(glInterestExpense)}</span></div>
            </CardContent>
          </Card>
          <Card className="border-2 border-primary/20"><CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div><div className="text-sm font-semibold">Net Cash Flow</div><div className="text-xs text-muted-foreground">Operating + Investing + Financing</div></div>
              <div className={`text-2xl font-bold ${(totalInflows - totalOutflows - glInterestExpense) >= 0 ? "text-green-600" : "text-red-600"}`}>{egp(totalInflows - totalOutflows - glInterestExpense)}</div>
            </div>
          </CardContent></Card>
        </div>
      )}

      {activeTab === "sales-orders" && (() => {
        const soApprovals = approvals.getByModule("SalesOrder");
        const pendingSOApprovals = soApprovals.filter((a) => a.status === "PENDING");
        const egpF = (n: number) => `EGP ${(n ?? 0).toLocaleString()}`;

        function submitSOForApproval(so: SalesOrder) {
          const customer = store.customers.find((c) => c.id === so.customerId);
          approvals.submit({
            type: "Sales Order", module: "SalesOrder", entityId: so.id,
            title: `SO ${so.number} — ${customer?.name ?? "Unknown"}`,
            description: `Sales order for ${egpF(so.total)}`,
            requestedBy: "u-admin", requestedByName: "Admin User",
            assignedTo: "admin-001", assignedToName: "Finance Manager",
            amount: so.total,
            priority: so.total > 500000 ? "HIGH" : so.total > 100000 ? "MEDIUM" : "LOW",
          });
          store.update("salesOrders", so.id, { status: "CONFIRMED" });
        }

        function approveSOFinance(approvalId: string, soId: string) {
          const so = store.salesOrders.find((s) => s.id === soId);
          if (!so) return;
          const stockIssues: string[] = [];
          for (const item of so.items) {
            const product = store.products.find((p) => p.id === item.productId);
            if (product && product.stockQty < item.quantity) stockIssues.push(`${product.name}: need ${item.quantity}, have ${product.stockQty}`);
          }
          if (stockIssues.length > 0) { alert(`Insufficient stock:\n${stockIssues.join("\n")}`); return; }
          for (const item of so.items) {
            const product = store.products.find((p) => p.id === item.productId);
            if (product) store.update("products", product.id, { stockQty: product.stockQty - item.quantity });
          }
          const dnId = store.genId("dn");
          store.add("deliveryNotes", { id: dnId, number: store.generateDNNumber(), soId: so.id, customerId: so.customerId, date: new Date().toISOString(), items: (so.items || []).map((i) => ({ productId: i.productId, description: i.description, quantity: i.quantity })), status: "PENDING", createdAt: new Date().toISOString() });
          const invId = store.genId("inv");
          store.add("invoices", { id: invId, number: store.generateInvoiceNumber(), customerId: so.customerId, date: new Date().toISOString().split("T")[0], dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0], subtotal: so.subtotal, tax: so.tax, total: so.total, currency: "EGP", status: "SENT", items: (so.items || []).map((i) => ({ productId: i.productId, description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })), notes: `Auto from SO ${so.number}` });
          store.add("journalEntries", { id: store.genId("je"), number: store.generateJournalNumber(), date: new Date().toISOString().split("T")[0], description: `Sales — SO ${so.number}`, reference: so.number, type: "GENERAL", lines: [{ accountId: "gl-1100", description: "Accounts Receivable", debit: so.total, credit: 0 }, { accountId: "gl-4000", description: "Revenue", debit: 0, credit: so.subtotal }, { accountId: "gl-2100", description: "VAT Payable", debit: 0, credit: so.tax }], status: "POSTED", createdBy: "u-admin", createdAt: new Date().toISOString() });
          store.update("salesOrders", so.id, { status: "INVOICED", invoiceId: invId, dnId });
          approvals.approve(approvalId, "Approved — stock verified, invoice created");
        }

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-blue-200 bg-blue-50/50"><CardContent className="pt-4"><div className="flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-blue-600" /><div><p className="text-2xl font-bold">{store.salesOrders.length}</p><p className="text-xs text-muted-foreground">Total SOs</p></div></div></CardContent></Card>
              <Card className="border-amber-200 bg-amber-50/50"><CardContent className="pt-4"><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /><div><p className="text-2xl font-bold">{pendingSOApprovals.length}</p><p className="text-xs text-muted-foreground">Pending Approval</p></div></div></CardContent></Card>
              <Card className="border-green-200 bg-green-50/50"><CardContent className="pt-4"><div className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-600" /><div><p className="text-2xl font-bold">{store.salesOrders.filter((s) => s.status === "INVOICED").length}</p><p className="text-xs text-muted-foreground">Invoiced</p></div></div></CardContent></Card>
              <Card className="border-purple-200 bg-purple-50/50"><CardContent className="pt-4"><div className="flex items-center gap-2"><FileText className="h-5 w-5 text-purple-600" /><div><p className="text-2xl font-bold">{egpF(store.salesOrders.filter((s) => s.status === "INVOICED").reduce((sum, s) => sum + s.total, 0))}</p><p className="text-xs text-muted-foreground">Revenue</p></div></div></CardContent></Card>
            </div>

            {pendingSOApprovals.length > 0 && (
              <Card className="border-amber-300">
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Pending SO Approvals</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingSOApprovals.map((apr) => {
                      const so = store.salesOrders.find((s) => s.id === apr.entityId);
                      return (
                        <div key={apr.id} className="flex items-center justify-between border rounded-lg p-3 bg-white">
                          <div className="space-y-1">
                            <p className="font-medium text-sm">{apr.title}</p>
                            <div className="flex items-center gap-2 text-xs">
                              <Badge variant="outline">{apr.priority}</Badge>
                              {apr.amount && <span className="font-semibold">{egpF(apr.amount)}</span>}
                            </div>
                            {so && <p className="text-xs text-muted-foreground">Stock: {(so.items || []).map((item) => { const p = store.products.find((x) => x.id === item.productId); return p ? `${p.name}: ${p.stockQty >= item.quantity ? "OK" : "LOW"}` : "N/A"; }).join(" | ")}</p>}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-8 text-red-600" onClick={() => { store.update("salesOrders", apr.entityId, { status: "CANCELLED" }); approvals.reject(apr.id, "Rejected"); }}>
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                            </Button>
                            <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700" onClick={() => approveSOFinance(apr.id, apr.entityId)}>
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

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">All Sales Orders</CardTitle></CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: "number", label: "SO #", render: (v: unknown) => <span className="font-mono text-xs font-semibold">{v as string}</span> },
                    { key: "customerId", label: "Customer", render: (v: unknown) => <CustomerLink customerId={v as string} /> },
                    { key: "total", label: "Total", className: "text-right", render: (v: unknown) => <span className="font-semibold">{egpF(v as number)}</span> },
                    { key: "status", label: "Status", render: (v: unknown) => <StatusBadge status={v as string} /> },
                    { key: "id", label: "", render: (_v: unknown, row: Record<string, unknown>) => {
                      const so = row as unknown as SalesOrder;
                      return (
                        <div className="flex gap-1 justify-end">
                          {so.status === "DRAFT" && <Button size="sm" className="h-7 text-xs" onClick={() => submitSOForApproval(so)}>Submit for Approval</Button>}
                          {so.invoiceId && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { const inv = store.invoices.find((i) => i.id === so.invoiceId); const cust = store.customers.find((c) => c.id === so.customerId); if (inv) openInvoicePDF(inv, cust, "customer"); }}><FileText className="h-3.5 w-3.5 mr-1" /> PDF</Button>}
                        </div>
                      );
                    }},
                  ] as Column<Record<string, unknown>>[]}
                  data={store.salesOrders as unknown as Record<string, unknown>[]}
                  emptyMessage="No sales orders."
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Approval Workflow</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <Badge variant="outline">DRAFT</Badge><span>→</span>
                  <Badge variant="outline" className="bg-blue-50">Submit for Approval</Badge><span>→</span>
                  <Badge variant="outline" className="bg-amber-50">Stock Check + Review</Badge><span>→</span>
                  <Badge variant="outline" className="bg-green-50">Approve → Inventory + Invoice + JE</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* ─── Banking Tab ─────────────────────────────────────────── */}
      {activeTab === "banking" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><Landmark className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Total Balance</p><p className="text-2xl font-bold">EGP {bankingTotalBalance.toLocaleString()}</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-red-100 rounded-lg"><Unlink className="h-5 w-5 text-red-600" /></div><div><p className="text-sm text-muted-foreground">Unreconciled</p><p className="text-2xl font-bold">{bankingUnreconciled}</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><Link2 className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-muted-foreground">Matched</p><p className="text-2xl font-bold">{bankingTransactions.filter(tx => tx.matchStatus === "matched").length}</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><CreditCard className="h-5 w-5 text-purple-600" /></div><div><p className="text-sm text-muted-foreground">Active Accounts</p><p className="text-2xl font-bold">{bankingAccounts.filter(a => a.isActive).length}</p></div></div></CardContent></Card>
          </div>

          <div className="flex justify-end"><Button size="sm" onClick={() => setShowAddBankingAccount(true)}><Plus className="h-4 w-4 mr-2" />Add Account</Button></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bankingAccounts.map(acc => (
              <Card key={acc.id} className={!acc.isActive ? "opacity-60" : ""}>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{acc.bankName}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${acc.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>{acc.isActive ? "Active" : "Inactive"}</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">Account</span><span className="font-mono">{acc.accountNumber}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">IBAN</span><span className="font-mono text-xs">{acc.iban.substring(0, 12)}...</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><span>{acc.currency}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Last Sync</span><span>{acc.lastSynced}</span></div>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">Balance</p>
                    <p className="text-2xl font-bold">{acc.currency} {acc.balance.toLocaleString()}</p>
                  </div>
                  <Button size="sm" variant="outline" className="w-full"><RefreshCw className="h-4 w-4 mr-2" />Sync Transactions</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ─── Transactions Tab ─────────────────────────────────────── */}
      {activeTab === "transactions" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Bank Transactions</CardTitle>
              <div className="flex gap-2">
                <select className="rounded-md border px-2 py-1 text-xs" value={bankingFilterAccount} onChange={e => setBankingFilterAccount(e.target.value)}>
                  <option value="">All Accounts</option>
                  {bankingAccounts.map(a => <option key={a.id} value={a.id}>{a.bankName}</option>)}
                </select>
                <select className="rounded-md border px-2 py-1 text-xs" value={bankingFilterMatch} onChange={e => setBankingFilterMatch(e.target.value)}>
                  <option value="">All Status</option>
                  <option value="matched">Matched</option>
                  <option value="unmatched">Unmatched</option>
                  <option value="partial">Partial</option>
                  <option value="excluded">Excluded</option>
                </select>
                <Button size="sm" variant="outline"><FileSpreadsheet className="h-4 w-4 mr-1" />Import Statement</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable columns={bankingTxColumns} data={bankingFilteredTx as unknown as Record<string, unknown>[]} exportable exportFilename="bank-transactions" emptyMessage="No transactions." />
          </CardContent>
        </Card>
      )}

      {/* ─── Reconciliation Tab ───────────────────────────────────── */}
      {activeTab === "reconciliation" && (() => {
        // Build bank statement entries for selected account/period
        const reconBankTxs = bankingTransactions.filter((tx) => {
          if (reconAccountId && tx.accountId !== reconAccountId) return false;
          if (reconPeriodStart && tx.date < reconPeriodStart) return false;
          if (reconPeriodEnd && tx.date > reconPeriodEnd) return false;
          return true;
        });

        // Build book entries from payments and journal entries for the selected account/period
        const reconBookEntries: { id: string; date: string; description: string; reference: string; amount: number; type: "credit" | "debit"; source: string }[] = [];
        store.payments.forEach((p) => {
          if (reconPeriodStart && p.date < reconPeriodStart) return;
          if (reconPeriodEnd && p.date > reconPeriodEnd) return;
          if (reconAccountId) {
            const bankAccMatch = store.bankAccounts.find((b) => b.id === p.bankAccountId);
            const bankingAccMatch = bankingAccounts.find((ba) => ba.id === reconAccountId);
            if (bankAccMatch && bankingAccMatch && bankAccMatch.accountNumber !== bankingAccMatch.accountNumber) return;
          }
          const party = p.customerId ? customerName(p.customerId) : p.vendorId ? vendorName(p.vendorId) : "";
          reconBookEntries.push({ id: `book-pay-${p.id}`, date: p.date, description: `${p.type === "RECEIVED" ? "Received from" : "Paid to"} ${party}`, reference: p.reference, amount: p.amount, type: p.type === "RECEIVED" ? "credit" : "debit", source: "Payment" });
        });
        store.invoices.forEach((inv) => {
          if (reconPeriodStart && inv.date.slice(0, 10) < reconPeriodStart) return;
          if (reconPeriodEnd && inv.date.slice(0, 10) > reconPeriodEnd) return;
          reconBookEntries.push({ id: `book-inv-${inv.id}`, date: inv.date.slice(0, 10), description: `Invoice ${inv.number} — ${customerName(inv.customerId)}`, reference: inv.number, amount: inv.total, type: "credit", source: "Invoice" });
        });

        const matchedBankIds = new Set(reconMatches.map((m) => m.bankTxId));
        const matchedBookIds = new Set(reconMatches.map((m) => m.bookEntryId));
        const unmatchedBankTxs = reconBankTxs.filter((tx) => !matchedBankIds.has(tx.id));
        const unmatchedBookEntries = reconBookEntries.filter((e) => !matchedBookIds.has(e.id));
        const matchedBankAmount = reconBankTxs.filter((tx) => matchedBankIds.has(tx.id)).reduce((s, tx) => s + tx.amount, 0);
        const unmatchedBankAmount = unmatchedBankTxs.reduce((s, tx) => s + tx.amount, 0);
        const matchedBookAmount = reconBookEntries.filter((e) => matchedBookIds.has(e.id)).reduce((s, e) => s + e.amount, 0);
        const unmatchedBookAmount = unmatchedBookEntries.reduce((s, e) => s + e.amount, 0);

        function handleManualMatch() {
          if (!reconSelectedBankTx || !reconSelectedBookEntry) return;
          setReconMatches((prev) => [...prev, { bankTxId: reconSelectedBankTx, bookEntryId: reconSelectedBookEntry }]);
          setReconSelectedBankTx(null);
          setReconSelectedBookEntry(null);
        }

        function handleAutoMatch() {
          const newMatches: { bankTxId: string; bookEntryId: string }[] = [...reconMatches];
          const usedBank = new Set(newMatches.map((m) => m.bankTxId));
          const usedBook = new Set(newMatches.map((m) => m.bookEntryId));

          // Match by reference number
          reconBankTxs.forEach((btx) => {
            if (usedBank.has(btx.id)) return;
            const refMatch = reconBookEntries.find((be) => !usedBook.has(be.id) && be.reference && btx.reference && be.reference.toLowerCase() === btx.reference.toLowerCase());
            if (refMatch) {
              newMatches.push({ bankTxId: btx.id, bookEntryId: refMatch.id });
              usedBank.add(btx.id);
              usedBook.add(refMatch.id);
            }
          });

          // Match by exact amount
          reconBankTxs.forEach((btx) => {
            if (usedBank.has(btx.id)) return;
            const amtMatch = reconBookEntries.find((be) => !usedBook.has(be.id) && Math.abs(be.amount - btx.amount) < 0.01 && be.type === btx.type);
            if (amtMatch) {
              newMatches.push({ bankTxId: btx.id, bookEntryId: amtMatch.id });
              usedBank.add(btx.id);
              usedBook.add(amtMatch.id);
            }
          });

          setReconMatches(newMatches);
        }

        function handleUnmatch(bankTxId: string) {
          setReconMatches((prev) => prev.filter((m) => m.bankTxId !== bankTxId));
        }

        return (
          <div className="space-y-4">
            {/* Account & Period selector */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ArrowUpDown className="h-4 w-4" /> Reconciliation Setup</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Bank Account</Label>
                    <select className="mt-1 w-56 rounded-md border px-3 py-2 text-sm" value={reconAccountId} onChange={(e) => { setReconAccountId(e.target.value); setReconMatches([]); setReconCompleted(false); }}>
                      <option value="">All Accounts</option>
                      {bankingAccounts.filter((a) => a.isActive).map((a) => <option key={a.id} value={a.id}>{a.bankName} ({a.accountNumber})</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Period Start</Label>
                    <Input type="date" className="h-9 text-sm w-40 mt-1" value={reconPeriodStart} onChange={(e) => { setReconPeriodStart(e.target.value); setReconMatches([]); setReconCompleted(false); }} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Period End</Label>
                    <Input type="date" className="h-9 text-sm w-40 mt-1" value={reconPeriodEnd} onChange={(e) => { setReconPeriodEnd(e.target.value); setReconMatches([]); setReconCompleted(false); }} />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setReconMatches([]); setReconCompleted(false); }}><RefreshCw className="h-4 w-4 mr-1" /> Reset</Button>
                </div>
              </CardContent>
            </Card>

            {/* Reconciliation Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-green-200 bg-green-50/30"><CardContent className="p-4"><div className="text-xs text-muted-foreground">Matched Items</div><div className="text-2xl font-bold text-green-700">{reconMatches.length}</div><div className="text-xs text-muted-foreground mt-1">{egp(matchedBankAmount)} bank / {egp(matchedBookAmount)} book</div></CardContent></Card>
              <Card className="border-red-200 bg-red-50/30"><CardContent className="p-4"><div className="text-xs text-muted-foreground">Unmatched Bank</div><div className="text-2xl font-bold text-red-700">{unmatchedBankTxs.length}</div><div className="text-xs text-muted-foreground mt-1">{egp(unmatchedBankAmount)}</div></CardContent></Card>
              <Card className="border-amber-200 bg-amber-50/30"><CardContent className="p-4"><div className="text-xs text-muted-foreground">Unmatched Book</div><div className="text-2xl font-bold text-amber-700">{unmatchedBookEntries.length}</div><div className="text-xs text-muted-foreground mt-1">{egp(unmatchedBookAmount)}</div></CardContent></Card>
              <Card className="border-blue-200 bg-blue-50/30"><CardContent className="p-4"><div className="text-xs text-muted-foreground">Status</div><div className="text-lg font-bold mt-1">{reconCompleted ? <span className="text-green-700">Completed</span> : reconMatches.length > 0 ? <span className="text-blue-700">In Progress</span> : <span className="text-muted-foreground">Not Started</span>}</div></CardContent></Card>
            </div>

            {/* Auto-match & actions */}
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleAutoMatch} disabled={reconCompleted}><RefreshCw className="h-4 w-4 mr-1" /> Auto-Match</Button>
              <Button size="sm" variant="outline" onClick={handleManualMatch} disabled={!reconSelectedBankTx || !reconSelectedBookEntry || reconCompleted}><Link2 className="h-4 w-4 mr-1" /> Match Selected</Button>
              <div className="flex-1" />
              <Button size="sm" variant={reconCompleted ? "ghost" : "default"} className={reconCompleted ? "bg-green-100 text-green-800 hover:bg-green-100" : ""} disabled={reconCompleted || (unmatchedBankTxs.length > 0 && unmatchedBookEntries.length > 0)} onClick={() => setReconCompleted(true)}>
                <CheckCircle className="h-4 w-4 mr-1" /> {reconCompleted ? "Reconciliation Completed" : "Complete Reconciliation"}
              </Button>
            </div>

            {/* Side-by-side panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Bank Statement side */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Landmark className="h-4 w-4 text-blue-600" /> Bank Statement ({reconBankTxs.length} entries)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted/80">
                        <tr className="border-b">
                          <th className="text-left p-2 text-xs font-medium">Date</th>
                          <th className="text-left p-2 text-xs font-medium">Description</th>
                          <th className="text-left p-2 text-xs font-medium">Ref</th>
                          <th className="text-right p-2 text-xs font-medium">Amount</th>
                          <th className="text-center p-2 text-xs font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reconBankTxs.map((tx) => {
                          const isMatched = matchedBankIds.has(tx.id);
                          const isSelected = reconSelectedBankTx === tx.id;
                          return (
                            <tr key={tx.id} className={`border-b cursor-pointer transition-colors ${isMatched ? "bg-green-50 opacity-60" : isSelected ? "bg-blue-100 ring-1 ring-blue-400" : "hover:bg-muted/30"}`}
                              onClick={() => { if (!isMatched && !reconCompleted) setReconSelectedBankTx(isSelected ? null : tx.id); }}>
                              <td className="p-2 text-xs">{tx.date}</td>
                              <td className="p-2 text-xs font-medium truncate max-w-[140px]">{tx.description}</td>
                              <td className="p-2 font-mono text-xs">{tx.reference}</td>
                              <td className={`p-2 text-right text-xs font-semibold ${tx.type === "credit" ? "text-green-700" : "text-red-700"}`}>{tx.type === "credit" ? "+" : "-"}{tx.amount.toLocaleString()}</td>
                              <td className="p-2 text-center">
                                {isMatched ? <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-green-100 text-green-800">Matched</span>
                                  : <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 text-red-800">Unmatched</span>}
                              </td>
                            </tr>
                          );
                        })}
                        {reconBankTxs.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground text-xs">No bank transactions for this period.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Book Entries side */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4 text-purple-600" /> Book Entries ({reconBookEntries.length} entries)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted/80">
                        <tr className="border-b">
                          <th className="text-left p-2 text-xs font-medium">Date</th>
                          <th className="text-left p-2 text-xs font-medium">Description</th>
                          <th className="text-left p-2 text-xs font-medium">Ref</th>
                          <th className="text-right p-2 text-xs font-medium">Amount</th>
                          <th className="text-center p-2 text-xs font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reconBookEntries.map((entry) => {
                          const isMatched = matchedBookIds.has(entry.id);
                          const isSelected = reconSelectedBookEntry === entry.id;
                          return (
                            <tr key={entry.id} className={`border-b cursor-pointer transition-colors ${isMatched ? "bg-green-50 opacity-60" : isSelected ? "bg-blue-100 ring-1 ring-blue-400" : "hover:bg-muted/30"}`}
                              onClick={() => { if (!isMatched && !reconCompleted) setReconSelectedBookEntry(isSelected ? null : entry.id); }}>
                              <td className="p-2 text-xs">{entry.date}</td>
                              <td className="p-2 text-xs font-medium truncate max-w-[140px]">{entry.description}</td>
                              <td className="p-2 font-mono text-xs">{entry.reference}</td>
                              <td className={`p-2 text-right text-xs font-semibold ${entry.type === "credit" ? "text-green-700" : "text-red-700"}`}>{entry.type === "credit" ? "+" : "-"}{entry.amount.toLocaleString()}</td>
                              <td className="p-2 text-center">
                                {isMatched ? <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-green-100 text-green-800">Matched</span>
                                  : <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800">Unmatched</span>}
                              </td>
                            </tr>
                          );
                        })}
                        {reconBookEntries.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground text-xs">No book entries for this period.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Matched pairs table */}
            {reconMatches.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Link2 className="h-4 w-4 text-green-600" /> Matched Pairs ({reconMatches.length})</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/30">
                      <th className="text-left p-2 text-xs font-medium">Bank Transaction</th>
                      <th className="text-right p-2 text-xs font-medium">Bank Amount</th>
                      <th className="text-center p-2 text-xs font-medium"></th>
                      <th className="text-left p-2 text-xs font-medium">Book Entry</th>
                      <th className="text-right p-2 text-xs font-medium">Book Amount</th>
                      <th className="text-center p-2 text-xs font-medium"></th>
                    </tr></thead>
                    <tbody>
                      {reconMatches.map((m, i) => {
                        const btx = reconBankTxs.find((t) => t.id === m.bankTxId);
                        const be = reconBookEntries.find((e) => e.id === m.bookEntryId);
                        if (!btx || !be) return null;
                        return (
                          <tr key={i} className="border-b hover:bg-muted/20">
                            <td className="p-2 text-xs">{btx.description} <span className="text-muted-foreground">({btx.reference})</span></td>
                            <td className={`p-2 text-right text-xs font-semibold ${btx.type === "credit" ? "text-green-700" : "text-red-700"}`}>{egp(btx.amount)}</td>
                            <td className="p-2 text-center"><Link2 className="h-3 w-3 text-green-500 mx-auto" /></td>
                            <td className="p-2 text-xs">{be.description} <span className="text-muted-foreground">({be.reference})</span></td>
                            <td className={`p-2 text-right text-xs font-semibold ${be.type === "credit" ? "text-green-700" : "text-red-700"}`}>{egp(be.amount)}</td>
                            <td className="p-2 text-center">
                              {!reconCompleted && <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500 hover:text-red-700" onClick={() => handleUnmatch(m.bankTxId)}><Unlink className="h-3 w-3" /></Button>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* Previous reconciliation sessions */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Previous Reconciliation Sessions</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Account</th>
                    <th className="text-left p-3 font-medium">Period</th>
                    <th className="text-right p-3 font-medium">Bank Balance</th>
                    <th className="text-right p-3 font-medium">Book Balance</th>
                    <th className="text-right p-3 font-medium">Difference</th>
                    <th className="text-center p-3 font-medium">Matched</th>
                    <th className="text-left p-3 font-medium">Status</th>
                  </tr></thead>
                  <tbody>
                    {bankingRecons.map(r => {
                      const acc = bankingAccounts.find(a => a.id === r.accountId);
                      return (
                        <tr key={r.id} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-medium">{acc?.bankName || "—"}</td>
                          <td className="p-3">{r.periodStart} to {r.periodEnd}</td>
                          <td className="p-3 text-right font-mono">{r.bankBalance.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono">{r.bookBalance.toLocaleString()}</td>
                          <td className={`p-3 text-right font-mono font-medium ${r.difference === 0 ? "text-green-700" : "text-red-700"}`}>{r.difference.toLocaleString()}</td>
                          <td className="p-3 text-center">{r.matchedCount}/{r.matchedCount + r.unmatchedCount}</td>
                          <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${r.status === "completed" ? "bg-green-100 text-green-800" : r.status === "discrepancy" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}>{r.status}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* ─── Payment Gateway Tab ──────────────────────────────────── */}
      {activeTab === "payment-gateway" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Generate Payment Link</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Amount (EGP)</Label><Input type="number" placeholder="0.00" value={bankingPaymentAmount} onChange={e => setBankingPaymentAmount(e.target.value)} className="mt-1" /></div>
              <div><Label>Description</Label><Input placeholder="Invoice payment..." className="mt-1" /></div>
              <div><Label>Payment Methods</Label>
                <div className="flex gap-2 mt-2">
                  {["Bank Transfer", "Credit Card", "Mobile Wallet"].map(m => (
                    <span key={m} className="px-3 py-1.5 border rounded-md text-xs cursor-pointer hover:bg-muted">{m}</span>
                  ))}
                </div>
              </div>
              <Button className="w-full"><QrCode className="h-4 w-4 mr-2" />Generate Payment Link</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">QR Code Payment</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-8 rounded-lg flex flex-col items-center">
                <div className="w-48 h-48 bg-white border-2 rounded-lg flex items-center justify-center">
                  <QrCode className="h-24 w-24 text-gray-300" />
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  {bankingPaymentAmount ? `EGP ${Number(bankingPaymentAmount).toLocaleString()}` : "Enter amount to generate QR"}
                </p>
              </div>
              <div className="text-sm space-y-2">
                <p className="font-medium">Supported Payment Methods:</p>
                <div className="grid grid-cols-2 gap-2">
                  {["InstaPay", "Fawry", "Vodafone Cash", "Orange Money", "Visa/MC", "Meeza"].map(m => (
                    <div key={m} className="flex items-center gap-2 text-xs"><CheckCircle className="h-3 w-3 text-green-500" />{m}</div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Add Banking Account Dialog ───────────────────────────── */}
      <Dialog open={showAddBankingAccount} onOpenChange={setShowAddBankingAccount}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Bank Account</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Bank Name</Label><Input value={newBankingAccount.bankName} onChange={e => setNewBankingAccount(p => ({ ...p, bankName: e.target.value }))} className="mt-1" /></div>
            <div><Label>Account Number</Label><Input value={newBankingAccount.accountNumber} onChange={e => setNewBankingAccount(p => ({ ...p, accountNumber: e.target.value }))} className="mt-1" /></div>
            <div><Label>IBAN</Label><Input value={newBankingAccount.iban} onChange={e => setNewBankingAccount(p => ({ ...p, iban: e.target.value }))} className="mt-1" /></div>
            <div><Label>Currency</Label>
              <select className="w-full rounded-md border px-3 py-2 text-sm mt-1" value={newBankingAccount.currency} onChange={e => setNewBankingAccount(p => ({ ...p, currency: e.target.value }))}>
                <option value="EGP">EGP</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="SAR">SAR</option>
              </select>
            </div>
            <Button className="w-full" onClick={addBankingAccount}>Add Account</Button>
          </div>
        </DialogContent>
      </Dialog>

      <EntityFormModal
        open={showInvoiceModal}
        onOpenChange={(open) => { setShowInvoiceModal(open); if (!open) setEditingInvoice(null); }}
        title={editingInvoice ? "Edit Invoice" : "New Invoice"}
        fields={invoiceFields}
        initialData={editingInvoice ? { customerId: editingInvoice.customerId, date: editingInvoice.date.slice(0, 10), dueDate: editingInvoice.dueDate.slice(0, 10), subtotal: editingInvoice.subtotal, tax: editingInvoice.tax, status: editingInvoice.status } : undefined}
        onSubmit={handleInvoiceSubmit}
      />

      <EntityFormModal
        open={showPaymentModal}
        onOpenChange={(open) => { setShowPaymentModal(open); if (!open) setEditingPayment(null); }}
        title={editingPayment ? "Edit Payment" : "Record Payment"}
        fields={paymentFields}
        initialData={editingPayment ? { type: editingPayment.type, customerId: editingPayment.customerId || "", vendorId: editingPayment.vendorId || "", invoiceId: editingPayment.invoiceId || "", amount: editingPayment.amount, method: editingPayment.method, bankAccountId: editingPayment.bankAccountId || "", date: editingPayment.date, notes: editingPayment.notes || "" } : undefined}
        onSubmit={handlePaymentSubmit}
      />

      <EntityFormModal
        open={showBudgetModal}
        onOpenChange={(open) => { setShowBudgetModal(open); if (!open) setEditingBudget(null); }}
        title={editingBudget ? "Edit Budget" : "Add Budget"}
        fields={budgetFields}
        initialData={editingBudget ? { name: editingBudget.name, fiscalYear: editingBudget.fiscalYear, period: editingBudget.period, accountId: editingBudget.accountId ?? "", costCenterId: editingBudget.costCenterId ?? "", budgeted: editingBudget.budgeted, actual: editingBudget.actual, status: editingBudget.status } : undefined}
        onSubmit={handleBudgetSubmit}
      />

      {/* ── Invoice Detail Dialog ── */}
      <Dialog open={!!viewInvoice} onOpenChange={(o) => !o && setViewInvoice(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice {viewInvoice?.number}</DialogTitle>
          </DialogHeader>
          {viewInvoice && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><span className="text-sm text-muted-foreground">Invoice Number</span><p className="font-medium font-mono">{viewInvoice.number}</p></div>
              <div><span className="text-sm text-muted-foreground">Customer</span><p className="font-medium">{customerName(viewInvoice.customerId)}</p></div>
              <div><span className="text-sm text-muted-foreground">Date</span><p className="font-medium">{viewInvoice.date.slice(0, 10)}</p></div>
              <div><span className="text-sm text-muted-foreground">Due Date</span><p className="font-medium">{viewInvoice.dueDate.slice(0, 10)}</p></div>
              <div><span className="text-sm text-muted-foreground">Subtotal</span><p className="font-medium">{egp(viewInvoice.subtotal)}</p></div>
              <div><span className="text-sm text-muted-foreground">Tax</span><p className="font-medium">{egp(viewInvoice.tax)}</p></div>
              <div><span className="text-sm text-muted-foreground">Total</span><p className="font-semibold text-lg">{egp(viewInvoice.total)}</p></div>
              <div><span className="text-sm text-muted-foreground">Currency</span><p className="font-medium">{viewInvoice.currency}</p></div>
              <div><span className="text-sm text-muted-foreground">Status</span><p><StatusBadge status={viewInvoice.status} /></p></div>
              <div><span className="text-sm text-muted-foreground">Line Items</span><p className="font-medium">{(viewInvoice.items || []).length} item(s)</p></div>
              <div className="col-span-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => { const c = store.customers.find((x) => x.id === viewInvoice.customerId); openInvoicePDF(viewInvoice, c, "customer"); }}>
                  <FileText className="h-4 w-4 mr-2" /> View / Print PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Payment Detail Dialog ── */}
      <Dialog open={!!viewPayment} onOpenChange={(o) => !o && setViewPayment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment {viewPayment?.reference}</DialogTitle>
          </DialogHeader>
          {viewPayment && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><span className="text-sm text-muted-foreground">Reference</span><p className="font-medium font-mono">{viewPayment.reference}</p></div>
              <div><span className="text-sm text-muted-foreground">Type</span><p className="font-medium">{viewPayment.type === "RECEIVED" ? "Received" : "Sent"}</p></div>
              <div><span className="text-sm text-muted-foreground">Party</span><p className="font-medium">{viewPayment.customerId ? customerName(viewPayment.customerId) : viewPayment.vendorId ? vendorName(viewPayment.vendorId) : "—"}</p></div>
              <div><span className="text-sm text-muted-foreground">Amount</span><p className="font-semibold text-lg">{egp(viewPayment.amount)}</p></div>
              <div><span className="text-sm text-muted-foreground">Currency</span><p className="font-medium">{viewPayment.currency}</p></div>
              <div><span className="text-sm text-muted-foreground">Method</span><p className="font-medium">{methodLabels[viewPayment.method] ?? viewPayment.method}</p></div>
              <div><span className="text-sm text-muted-foreground">Date</span><p className="font-medium">{viewPayment.date}</p></div>
              <div><span className="text-sm text-muted-foreground">Bank Account</span><p className="font-medium">{viewPayment.bankAccountId ? store.bankAccounts.find(b => b.id === viewPayment.bankAccountId)?.name ?? viewPayment.bankAccountId : "—"}</p></div>
              <div><span className="text-sm text-muted-foreground">Invoice</span><p className="font-medium">{viewPayment.invoiceId ? store.invoices.find(i => i.id === viewPayment.invoiceId)?.number ?? viewPayment.invoiceId : "—"}</p></div>
              {viewPayment.notes && <div className="col-span-2"><span className="text-sm text-muted-foreground">Notes</span><p className="font-medium">{viewPayment.notes}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Budget Detail Dialog ── */}
      <Dialog open={!!viewBudget} onOpenChange={(o) => !o && setViewBudget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewBudget?.name}</DialogTitle>
          </DialogHeader>
          {viewBudget && (() => {
            const variance = viewBudget.budgeted - viewBudget.actual;
            return (
              <div className="grid grid-cols-2 gap-4 py-4">
                <div><span className="text-sm text-muted-foreground">Budget Name</span><p className="font-medium">{viewBudget.name}</p></div>
                <div><span className="text-sm text-muted-foreground">Fiscal Year</span><p className="font-medium">{viewBudget.fiscalYear}</p></div>
                <div><span className="text-sm text-muted-foreground">Period</span><p className="font-medium">{viewBudget.period}</p></div>
                <div><span className="text-sm text-muted-foreground">Status</span><p><StatusBadge status={viewBudget.status} /></p></div>
                <div><span className="text-sm text-muted-foreground">Budgeted</span><p className="font-medium">{egp(viewBudget.budgeted)}</p></div>
                <div><span className="text-sm text-muted-foreground">Actual</span><p className="font-medium">{egp(viewBudget.actual)}</p></div>
                <div><span className="text-sm text-muted-foreground">Variance</span><p className={`font-semibold ${variance >= 0 ? "text-green-600" : "text-red-600"}`}>{variance >= 0 ? "+" : ""}{egp(variance)}</p></div>
                <div><span className="text-sm text-muted-foreground">GL Account</span><p className="font-medium">{viewBudget.accountId ? glName(viewBudget.accountId) : "—"}</p></div>
                <div><span className="text-sm text-muted-foreground">Cost Center</span><p className="font-medium">{viewBudget.costCenterId ? ccName(viewBudget.costCenterId) : "—"}</p></div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Bank Account Detail Dialog ── */}
      <Dialog open={!!bankDetailId} onOpenChange={(o) => { if (!o) { setBankDetailId(null); setBankTxFilter("all"); setBankTxSearch(""); } }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          {(() => {
            const bankAcc = bankDetailId ? store.bankAccounts.find((b) => b.id === bankDetailId) : null;
            if (!bankAcc) return null;
            const accPayments = store.payments.filter((p) => p.bankAccountId === bankAcc.id);
            const accCheques = store.cheques.filter((c) => c.bankAccountId === bankAcc.id);
            const allTx: { id: string; date: string; description: string; reference: string; amount: number; type: "credit" | "debit"; source: string }[] = [];
            accPayments.forEach((p) => {
              const party = p.customerId ? customerName(p.customerId) : p.vendorId ? vendorName(p.vendorId) : "";
              allTx.push({ id: p.id, date: p.date, description: `${p.type === "RECEIVED" ? "Received from" : "Sent to"} ${party}`, reference: p.reference, amount: p.amount, type: p.type === "RECEIVED" ? "credit" : "debit", source: "Payment" });
            });
            accCheques.forEach((c) => {
              allTx.push({ id: c.id, date: c.issueDate, description: `Cheque ${c.number} — ${c.partyName}`, reference: c.number, amount: c.amount, type: c.type === "INCOMING" ? "credit" : "debit", source: `Cheque (${c.status})` });
            });
            allTx.sort((a, b) => b.date.localeCompare(a.date));
            const filteredTx = allTx.filter((tx) => {
              if (bankTxFilter !== "all" && tx.type !== bankTxFilter) return false;
              if (bankTxSearch) {
                const q = bankTxSearch.toLowerCase();
                if (!tx.description.toLowerCase().includes(q) && !tx.reference.toLowerCase().includes(q)) return false;
              }
              return true;
            });
            let runningBalance = bankAcc.balance;
            const txWithBalance = filteredTx.map((tx) => {
              const bal = runningBalance;
              runningBalance -= tx.type === "credit" ? tx.amount : -tx.amount;
              return { ...tx, balance: bal };
            });
            const totalCredits = allTx.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
            const totalDebits = allTx.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);
            const pendingIn = accCheques.filter((c) => c.type === "INCOMING" && (c.status === "PENDING" || c.status === "DEPOSITED")).reduce((s, c) => s + c.amount, 0);
            const pendingOut = accCheques.filter((c) => c.type === "OUTGOING" && c.status === "PENDING").reduce((s, c) => s + c.amount, 0);
            return (
              <>
                <DialogHeader><DialogTitle className="flex items-center gap-2"><Landmark className="h-5 w-5" /> {bankAcc.name} — {bankAcc.bankName}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  {/* Account Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">Balance</p>
                      <p className="text-lg font-bold text-green-700">{egp(bankAcc.balance)}</p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">Account #</p>
                      <p className="font-mono text-sm">{bankAcc.accountNumber}</p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">IBAN</p>
                      <p className="font-mono text-xs">{bankAcc.iban || "N/A"}</p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <StatusBadge status={bankAcc.status} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Currency:</span> {bankAcc.currency}</div>
                    <div><span className="text-muted-foreground">Type:</span> <Badge variant="outline">{bankAcc.type}</Badge></div>
                    <div><span className="text-muted-foreground">Opened:</span> {new Date(bankAcc.openedAt).toLocaleDateString()}</div>
                    <div><span className="text-muted-foreground">Code:</span> <span className="font-mono text-xs">{bankAcc.code}</span></div>
                  </div>

                  {/* Reconciliation / Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total Credits</div><div className="text-sm font-bold text-green-600">+{egp(totalCredits)}</div></CardContent></Card>
                    <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total Debits</div><div className="text-sm font-bold text-red-600">-{egp(totalDebits)}</div></CardContent></Card>
                    <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Pending Incoming</div><div className="text-sm font-bold text-green-600">{egp(pendingIn)}</div></CardContent></Card>
                    <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Pending Outgoing</div><div className="text-sm font-bold text-red-600">{egp(pendingOut)}</div></CardContent></Card>
                  </div>

                  {/* Transactions Table */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold">Transactions</h3>
                      <div className="flex gap-2">
                        <Input className="h-7 text-xs w-48" placeholder="Search transactions..." value={bankTxSearch} onChange={(e) => setBankTxSearch(e.target.value)} />
                        <select className="rounded-md border px-2 py-1 text-xs" value={bankTxFilter} onChange={(e) => setBankTxFilter(e.target.value as "all" | "credit" | "debit")}>
                          <option value="all">All</option>
                          <option value="credit">Credits</option>
                          <option value="debit">Debits</option>
                        </select>
                      </div>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs">Date</th>
                            <th className="px-3 py-2 text-left text-xs">Description</th>
                            <th className="px-3 py-2 text-left text-xs">Reference</th>
                            <th className="px-3 py-2 text-left text-xs">Source</th>
                            <th className="px-3 py-2 text-right text-xs">Amount</th>
                            <th className="px-3 py-2 text-right text-xs">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {txWithBalance.map((tx) => (
                            <tr key={tx.id} className="hover:bg-muted/30">
                              <td className="px-3 py-2 text-xs">{new Date(tx.date).toLocaleDateString()}</td>
                              <td className="px-3 py-2 text-xs font-medium">{tx.description}</td>
                              <td className="px-3 py-2 font-mono text-xs">{tx.reference}</td>
                              <td className="px-3 py-2 text-xs"><Badge variant="outline" className="text-xs h-5">{tx.source}</Badge></td>
                              <td className={`px-3 py-2 text-right text-xs font-semibold ${tx.type === "credit" ? "text-green-700" : "text-red-700"}`}>
                                {tx.type === "credit" ? "+" : "-"}{tx.amount.toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-right text-xs font-mono">{tx.balance.toLocaleString()}</td>
                            </tr>
                          ))}
                          {txWithBalance.length === 0 && (
                            <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground text-xs">No transactions found for this account.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => { setBankDetailId(null); setEditingBank(bankAcc); setShowBankModal(true); }}>Edit Account</Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      const rows = allTx.map((tx) => ({ Date: tx.date, Description: tx.description, Reference: tx.reference, Type: tx.type, Amount: tx.amount, Source: tx.source }));
                      downloadCSV(`bank-${bankAcc.code}-transactions.csv`, rows);
                    }}><Download className="h-3.5 w-3.5 mr-1" /> Export</Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Bank Account Form Modal ── */}
      <EntityFormModal
        open={showBankModal}
        onOpenChange={(open) => { setShowBankModal(open); if (!open) setEditingBank(null); }}
        title={editingBank ? `Edit ${editingBank.name}` : "Add Bank Account"}
        fields={[
          { name: "code", label: "Code", type: "text", placeholder: "Auto-generated if empty", helperText: "Leave blank for auto-generated code" },
          { name: "name", label: "Account Name", type: "text", required: true },
          { name: "bankName", label: "Bank Name", type: "text", required: true },
          { name: "accountNumber", label: "Account Number", type: "text", required: true },
          { name: "iban", label: "IBAN", type: "text" },
          { name: "currency", label: "Currency", type: "select", defaultValue: "EGP", options: [{ label: "EGP", value: "EGP" }, { label: "USD", value: "USD" }, { label: "EUR", value: "EUR" }, { label: "SAR", value: "SAR" }] },
          { name: "balance", label: "Opening Balance", type: "number", required: true, defaultValue: 0 },
          { name: "type", label: "Type", type: "select", defaultValue: "CURRENT", options: [{ label: "Current", value: "CURRENT" }, { label: "Savings", value: "SAVINGS" }, { label: "Foreign Currency", value: "FOREIGN_CURRENCY" }] },
          { name: "status", label: "Status", type: "select", defaultValue: "ACTIVE", options: [{ label: "Active", value: "ACTIVE" }, { label: "Dormant", value: "DORMANT" }, { label: "Closed", value: "CLOSED" }] },
        ] as EntityField[]}
        initialData={editingBank ? {
          code: editingBank.code, name: editingBank.name, bankName: editingBank.bankName,
          accountNumber: editingBank.accountNumber, iban: editingBank.iban ?? "",
          currency: editingBank.currency, balance: editingBank.balance,
          type: editingBank.type, status: editingBank.status,
        } : undefined}
        onSubmit={(data) => {
          const payload = {
            code: String(data.code), name: String(data.name), bankName: String(data.bankName),
            accountNumber: String(data.accountNumber), iban: data.iban ? String(data.iban) : undefined,
            currency: String(data.currency || "EGP"), balance: Number(data.balance),
            type: String(data.type) as BankAccount["type"],
            status: String(data.status) as BankAccount["status"],
            openedAt: editingBank?.openedAt ?? new Date().toISOString(),
          };
          if (editingBank) {
            store.update("bankAccounts", editingBank.id, payload);
          } else {
            const code = payload.code.trim() || store.generateBankCode();
            store.add("bankAccounts", { id: store.genId("ba"), ...payload, code });
          }
          setShowBankModal(false);
          setEditingBank(null);
        }}
        submitLabel={editingBank ? "Save" : "Create"}
      />
    </div>
  );
}
