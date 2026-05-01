"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { Receipt, Upload, Plus, Check, X, Download, Eye, Camera, DollarSign, Clock, BookOpen, ScanLine, Loader2, FileImage, Percent, AlertTriangle, ArrowUpRight, RotateCcw, TrendingUp, BarChart3, PieChart, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { useCurrentUser } from "@/lib/user-context";
import { useDataStore } from "@/lib/data-store";
import { downloadCSV } from "@/lib/download";

// ─── Types ──────────────────────────────────────────────────────────────────

type ExpenseType = "Transport" | "Meals" | "Accommodation" | "Hotel" | "Office Supplies" | "Other";
type ExpenseStatus = "PENDING" | "APPROVED" | "REJECTED" | "DRAFT";

interface ApprovalEntry {
  id: string;
  action: "SUBMITTED" | "APPROVED" | "REJECTED" | "ESCALATED" | "RETURNED";
  performedBy: string;
  timestamp: string;
  comment?: string;
  level: number;
}

// ─── Budget Constants ──────────────────────────────────────────────────────
const MONTHLY_BUDGET_PER_REP = 5000;

// ─── Approval Level Logic ──────────────────────────────────────────────────
function getApprovalLevel(amount: number): { level: number; approver: string } {
  if (amount < 1000) return { level: 1, approver: "District Manager" };
  if (amount <= 5000) return { level: 2, approver: "Marketeer" };
  return { level: 3, approver: "BUM" };
}

// ─── OCR Types ──────────────────────────────────────────────────────────────

interface OCRResult {
  id: string;
  fileName: string;
  imageBase64: string;
  vendor: string;
  amount: number;
  date: string;
  category: ExpenseType;
  confidence: number;
  scannedAt: string;
}

const OCR_VENDORS = [
  "Cairo Pharmacy", "Nile Medical Supplies", "El-Salam Hospital Cafeteria",
  "Uber Egypt", "Careem", "Marriott Cairo", "Hilton Alexandria",
  "Office Depot Egypt", "Metro Supermarket", "Vodafone Egypt",
  "EgyptAir", "Stationery House", "El-Ezaby Pharmacy", "Sekem Organics",
  "Al-Ahram Printing", "Delta Transport Co.",
];

const OCR_DESCRIPTIONS: Record<ExpenseType, string[]> = {
  Transport: ["Taxi fare to hospital", "Uber ride for field visits", "Fuel for company car", "Toll fees - Ring Road"],
  Meals: ["Lunch with doctor", "Team working lunch", "Client dinner meeting", "Coffee during hospital visit"],
  Accommodation: ["Hotel stay for field trip", "Overnight accommodation", "Extended stay booking"],
  Hotel: ["Conference hotel booking", "Regional meeting stay", "Training overnight"],
  "Office Supplies": ["Printer cartridges", "Presentation folders", "Business cards printing", "Promotional brochures"],
  Other: ["Conference registration", "Medical samples packaging", "Courier service", "Phone recharge for work"],
};

interface Expense {
  id: string;
  userId: string;
  userName: string;
  date: string;
  type: ExpenseType;
  amount: number;
  description: string;
  receiptPhoto?: string;
  status: ExpenseStatus;
  rejectionReason?: string;
  approvedBy?: string;
  journalEntryId?: string;
  createdAt: string;
  approvalHistory: ApprovalEntry[];
}

const EXPENSE_TYPES: ExpenseType[] = ["Transport", "Meals", "Accommodation", "Hotel", "Office Supplies", "Other"];
const STORAGE_KEY = "pharma.expenses";

function genId() {
  return `exp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Seed data ──────────────────────────────────────────────────────────────

function seedExpenses(): Expense[] {
  return [
    {
      id: "exp-seed-1", userId: "u-rep-1", userName: "Mohamed El-Sayed",
      date: "2026-04-02", type: "Transport", amount: 150,
      description: "Taxi to Cleopatra Hospital for morning visits",
      status: "APPROVED", approvedBy: "Ahmed Mostafa", createdAt: "2026-04-02T08:30:00Z",
      approvalHistory: [
        { id: "ah-1a", action: "SUBMITTED", performedBy: "Mohamed El-Sayed", timestamp: "2026-04-02T08:30:00Z", level: 1 },
        { id: "ah-1b", action: "APPROVED", performedBy: "Ahmed Mostafa", timestamp: "2026-04-02T14:15:00Z", comment: "Verified with hospital log", level: 1 },
      ],
    },
    {
      id: "exp-seed-2", userId: "u-rep-1", userName: "Mohamed El-Sayed",
      date: "2026-04-05", type: "Meals", amount: 85,
      description: "Lunch during field day in Nasr City",
      status: "APPROVED", approvedBy: "Ahmed Mostafa", createdAt: "2026-04-05T13:00:00Z",
      approvalHistory: [
        { id: "ah-2a", action: "SUBMITTED", performedBy: "Mohamed El-Sayed", timestamp: "2026-04-05T13:00:00Z", level: 1 },
        { id: "ah-2b", action: "APPROVED", performedBy: "Ahmed Mostafa", timestamp: "2026-04-05T17:30:00Z", level: 1 },
      ],
    },
    {
      id: "exp-seed-3", userId: "u-rep-1", userName: "Mohamed El-Sayed",
      date: "2026-04-12", type: "Transport", amount: 200,
      description: "Uber rides for 3 hospital visits in Heliopolis",
      status: "PENDING", createdAt: "2026-04-12T09:00:00Z",
      approvalHistory: [
        { id: "ah-3a", action: "SUBMITTED", performedBy: "Mohamed El-Sayed", timestamp: "2026-04-12T09:00:00Z", level: 1 },
      ],
    },
    {
      id: "exp-seed-4", userId: "u-dm-1", userName: "Ahmed Mostafa",
      date: "2026-04-08", type: "Hotel", amount: 950,
      description: "Overnight stay for Alexandria territory review",
      status: "PENDING", createdAt: "2026-04-08T18:00:00Z",
      approvalHistory: [
        { id: "ah-4a", action: "SUBMITTED", performedBy: "Ahmed Mostafa", timestamp: "2026-04-08T18:00:00Z", level: 1 },
      ],
    },
    {
      id: "exp-seed-5", userId: "u-dm-1", userName: "Ahmed Mostafa",
      date: "2026-04-10", type: "Meals", amount: 320,
      description: "Team dinner during quarterly meeting",
      status: "APPROVED", approvedBy: "Dr. Yasmin Salem", createdAt: "2026-04-10T20:00:00Z",
      approvalHistory: [
        { id: "ah-5a", action: "SUBMITTED", performedBy: "Ahmed Mostafa", timestamp: "2026-04-10T20:00:00Z", level: 1 },
        { id: "ah-5b", action: "APPROVED", performedBy: "Dr. Yasmin Salem", timestamp: "2026-04-11T09:45:00Z", comment: "Quarterly meeting confirmed", level: 2 },
      ],
    },
    {
      id: "exp-seed-6", userId: "u-mkt-1", userName: "Dr. Yasmin Salem",
      date: "2026-04-15", type: "Office Supplies", amount: 475,
      description: "Printing promotional materials for Cardioprex campaign",
      status: "REJECTED", rejectionReason: "Please use central procurement for print orders above 300 EGP",
      createdAt: "2026-04-15T11:00:00Z",
      approvalHistory: [
        { id: "ah-6a", action: "SUBMITTED", performedBy: "Dr. Yasmin Salem", timestamp: "2026-04-15T11:00:00Z", level: 1 },
        { id: "ah-6b", action: "REJECTED", performedBy: "Admin", timestamp: "2026-04-15T16:20:00Z", comment: "Please use central procurement for print orders above 300 EGP", level: 2 },
      ],
    },
    {
      id: "exp-seed-7", userId: "u-rep-1", userName: "Mohamed El-Sayed",
      date: "2026-04-20", type: "Accommodation", amount: 600,
      description: "Accommodation for Upper Egypt field trip",
      status: "PENDING", createdAt: "2026-04-20T16:00:00Z",
      approvalHistory: [
        { id: "ah-7a", action: "SUBMITTED", performedBy: "Mohamed El-Sayed", timestamp: "2026-04-20T16:00:00Z", level: 1 },
      ],
    },
    {
      id: "exp-seed-8", userId: "u-dm-1", userName: "Ahmed Mostafa",
      date: "2026-04-22", type: "Transport", amount: 180,
      description: "Car rental for Giza district supervision",
      status: "PENDING", createdAt: "2026-04-22T07:30:00Z",
      approvalHistory: [
        { id: "ah-8a", action: "SUBMITTED", performedBy: "Ahmed Mostafa", timestamp: "2026-04-22T07:30:00Z", level: 1 },
      ],
    },
  ];
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const { user, allUsers } = useCurrentUser();
  const store = useDataStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Dialog state
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Budget warning dialog state
  const [budgetWarningOpen, setBudgetWarningOpen] = useState(false);
  const [pendingExpenseCreate, setPendingExpenseCreate] = useState(false);

  // Enhanced rejection flow state
  const [rejectAction, setRejectAction] = useState<"REJECT" | "RETURN">("REJECT");

  // New expense form state
  const [formDate, setFormDate] = useState("");
  const [formType, setFormType] = useState<ExpenseType>("Transport");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPhoto, setFormPhoto] = useState<string | undefined>(undefined);
  const [formPhotoName, setFormPhotoName] = useState("");

  // OCR state
  const [ocrDialogOpen, setOcrDialogOpen] = useState(false);
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [ocrHistory, setOcrHistory] = useState<OCRResult[]>([]);
  const [ocrImagePreview, setOcrImagePreview] = useState<string | null>(null);
  const ocrFileRef = useRef<HTMLInputElement>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setExpenses(JSON.parse(raw));
      } else {
        const seed = seedExpenses();
        setExpenses(seed);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      }
    } catch {
      setExpenses(seedExpenses());
    }
    setLoaded(true);
  }, []);

  function persist(next: Expense[]) {
    setExpenses(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  // ─── Permissions ────────────────────────────────────────────────────────

  const isManager = user.role === "BUM" || user.role === "MARKETEER" || user.role === "DISTRICT_MANAGER" || user.role === "ADMIN";

  // ─── Stats ──────────────────────────────────────────────────────────────

  const now = new Date();
  const mtdExpenses = expenses.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const totalMTD = mtdExpenses.reduce((s, e) => s + e.amount, 0);
  const pendingAmount = expenses.filter((e) => e.status === "PENDING").reduce((s, e) => s + e.amount, 0);
  const approvedAmount = expenses.filter((e) => e.status === "APPROVED").reduce((s, e) => s + e.amount, 0);
  const rejectedAmount = expenses.filter((e) => e.status === "REJECTED").reduce((s, e) => s + e.amount, 0);

  // ─── Budget Calculations ────────────────────────────────────────────────

  const myApprovedThisMonth = useMemo(() => {
    return expenses
      .filter((e) => e.userId === user.id && e.status === "APPROVED")
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses, user.id]);

  const myPendingThisMonth = useMemo(() => {
    return expenses
      .filter((e) => e.userId === user.id && e.status === "PENDING")
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses, user.id]);

  const budgetRemaining = MONTHLY_BUDGET_PER_REP - myApprovedThisMonth;
  const budgetUtilization = Math.round((myApprovedThisMonth / MONTHLY_BUDGET_PER_REP) * 100);
  const budgetBarColor = budgetUtilization > 90 ? "bg-red-500" : budgetUtilization > 70 ? "bg-yellow-500" : "bg-green-500";

  // ─── Analytics Data ────────────────────────────────────────────────────

  const avgProcessingTime = useMemo(() => {
    const processed = expenses.filter((e) => e.status === "APPROVED" || e.status === "REJECTED");
    if (processed.length === 0) return 0;
    const totalHours = processed.reduce((sum, e) => {
      const history = e.approvalHistory || [];
      const submitted = history.find((h) => h.action === "SUBMITTED");
      const resolved = history.find((h) => h.action === "APPROVED" || h.action === "REJECTED");
      if (submitted && resolved) {
        const diff = new Date(resolved.timestamp).getTime() - new Date(submitted.timestamp).getTime();
        return sum + diff / (1000 * 60 * 60);
      }
      return sum;
    }, 0);
    return Math.round(totalHours / processed.length);
  }, [expenses]);

  const expenseTrendLast6 = useMemo(() => {
    const months: { month: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
      const total = expenses
        .filter((e) => e.date.startsWith(key) && e.status === "APPROVED")
        .reduce((s, e) => s + e.amount, 0);
      months.push({ month: label, total });
    }
    return months;
  }, [expenses]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.filter((e) => e.status === "APPROVED").forEach((e) => {
      map[e.type] = (map[e.type] || 0) + e.amount;
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount, pct: total > 0 ? Math.round((amount / total) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const CATEGORY_COLORS = ["bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500", "bg-pink-500", "bg-orange-500"];

  // ─── My Expenses ───────────────────────────────────────────────────────

  const myExpenses = useMemo(
    () => expenses.filter((e) => e.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [expenses, user.id]
  );

  // ─── Team Expenses (pending, for approval) ─────────────────────────────

  const pendingTeamExpenses = useMemo(
    () => expenses.filter((e) => e.status === "PENDING" && e.userId !== user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [expenses, user.id]
  );

  // ─── Photo handling ─────────────────────────────────────────────────────

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormPhotoName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setFormPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  // ─── OCR Simulation ──────────────────────────────────────────────────────

  function simulateOCR(fileName: string, imageBase64: string) {
    setOcrScanning(true);
    setOcrImagePreview(imageBase64);
    setOcrResult(null);

    // Simulate OCR processing delay (1.5-3 seconds)
    const delay = 1500 + Math.random() * 1500;
    setTimeout(() => {
      const category = EXPENSE_TYPES[Math.floor(Math.random() * EXPENSE_TYPES.length)];
      const vendor = OCR_VENDORS[Math.floor(Math.random() * OCR_VENDORS.length)];
      const amount = Math.round((50 + Math.random() * 950) * 100) / 100;
      const confidence = Math.round((75 + Math.random() * 24) * 10) / 10;
      const daysAgo = Math.floor(Math.random() * 14);
      const receiptDate = new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);

      const result: OCRResult = {
        id: `ocr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        fileName,
        imageBase64,
        vendor,
        amount,
        date: receiptDate,
        category,
        confidence,
        scannedAt: new Date().toISOString(),
      };

      setOcrResult(result);
      setOcrHistory((prev) => [result, ...prev].slice(0, 20));
      setOcrScanning(false);
    }, delay);
  }

  function handleOCRFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      simulateOCR(file.name, reader.result as string);
    };
    reader.readAsDataURL(file);
    // Reset the input so re-selecting the same file works
    e.target.value = "";
  }

  function applyOCRToForm() {
    if (!ocrResult) return;
    setFormDate(ocrResult.date);
    setFormType(ocrResult.category);
    setFormAmount(ocrResult.amount.toString());
    const descriptions = OCR_DESCRIPTIONS[ocrResult.category];
    setFormDescription(descriptions[Math.floor(Math.random() * descriptions.length)] + ` — ${ocrResult.vendor}`);
    setFormPhoto(ocrResult.imageBase64);
    setFormPhotoName(ocrResult.fileName);
    setOcrDialogOpen(false);
    setNewDialogOpen(true);
  }

  function confidenceColor(confidence: number): string {
    if (confidence >= 90) return "text-green-700 bg-green-100";
    if (confidence >= 80) return "text-yellow-700 bg-yellow-100";
    return "text-orange-700 bg-orange-100";
  }

  // ─── Create Expense ─────────────────────────────────────────────────────

  function resetForm() {
    setFormDate("");
    setFormType("Transport");
    setFormAmount("");
    setFormDescription("");
    setFormPhoto(undefined);
    setFormPhotoName("");
  }

  function handleCreateExpense() {
    if (!formDate || !formAmount || !formDescription) return;
    const amt = parseFloat(formAmount);

    // Budget warning check
    if (!pendingExpenseCreate && (myApprovedThisMonth + amt) > MONTHLY_BUDGET_PER_REP) {
      setPendingExpenseCreate(true);
      setBudgetWarningOpen(true);
      return;
    }

    const nowISO = new Date().toISOString();
    const approvalLevel = getApprovalLevel(amt);
    const newExp: Expense = {
      id: genId(),
      userId: user.id,
      userName: user.name,
      date: formDate,
      type: formType,
      amount: amt,
      description: formDescription,
      receiptPhoto: formPhoto,
      status: "PENDING",
      createdAt: nowISO,
      approvalHistory: [
        {
          id: `ah-${Date.now().toString(36)}`,
          action: "SUBMITTED",
          performedBy: user.name,
          timestamp: nowISO,
          comment: `Requires ${approvalLevel.approver} approval (Level ${approvalLevel.level})`,
          level: approvalLevel.level,
        },
      ],
    };
    persist([newExp, ...expenses]);
    setNewDialogOpen(false);
    setBudgetWarningOpen(false);
    setPendingExpenseCreate(false);
    resetForm();
  }

  // ─── Approve / Reject ──────────────────────────────────────────────────

  function handleApprove(exp: Expense) {
    // Create a journal entry in accounting for the approved expense
    const jeId = store.genId("je");
    const jeNumber = store.generateJournalNumber();
    const nowISO = new Date().toISOString();

    store.add("journalEntries", {
      id: jeId,
      number: jeNumber,
      date: nowISO.slice(0, 10),
      description: `Approved expense — ${exp.description}`,
      reference: exp.id,
      type: "GENERAL",
      lines: [
        {
          accountId: "gl-6500",
          description: `Field expense: ${exp.description}`,
          debit: exp.amount,
          credit: 0,
        },
        {
          accountId: "gl-1000",
          description: `Cash payment for expense ${exp.id}`,
          debit: 0,
          credit: exp.amount,
        },
      ],
      status: "POSTED",
      createdBy: user.id,
      createdAt: nowISO,
    });

    const approvalEntry: ApprovalEntry = {
      id: `ah-${Date.now().toString(36)}`,
      action: "APPROVED",
      performedBy: user.name,
      timestamp: nowISO,
      comment: `Approved and posted as Journal Entry ${jeNumber}`,
      level: getApprovalLevel(exp.amount).level,
    };

    const next = expenses.map((e) =>
      e.id === exp.id
        ? {
            ...e,
            status: "APPROVED" as ExpenseStatus,
            approvedBy: user.name,
            journalEntryId: jeId,
            approvalHistory: [...(e.approvalHistory || []), approvalEntry],
          }
        : e
    );
    persist(next);
  }

  function openRejectDialog(exp: Expense) {
    setSelectedExpense(exp);
    setRejectionReason("");
    setRejectAction("REJECT");
    setRejectDialogOpen(true);
  }

  function handleReject() {
    if (!selectedExpense || !rejectionReason.trim()) return;
    const nowISO = new Date().toISOString();
    const isReturn = rejectAction === "RETURN";

    const auditEntry: ApprovalEntry = {
      id: `ah-${Date.now().toString(36)}`,
      action: isReturn ? "RETURNED" : "REJECTED",
      performedBy: user.name,
      timestamp: nowISO,
      comment: rejectionReason,
      level: getApprovalLevel(selectedExpense.amount).level,
    };

    const next = expenses.map((e) =>
      e.id === selectedExpense.id
        ? {
            ...e,
            status: (isReturn ? "DRAFT" : "REJECTED") as ExpenseStatus,
            rejectionReason: rejectionReason,
            approvalHistory: [...(e.approvalHistory || []), auditEntry],
          }
        : e
    );
    persist(next);
    setRejectDialogOpen(false);
    setSelectedExpense(null);
  }

  // ─── Status badge ──────────────────────────────────────────────────────

  function statusBadge(status: ExpenseStatus) {
    const map: Record<ExpenseStatus, string> = {
      DRAFT: "bg-slate-100 text-slate-800",
      PENDING: "bg-yellow-100 text-yellow-800",
      APPROVED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
    };
    return <Badge className={map[status]}>{status === "DRAFT" ? "REVISION NEEDED" : status}</Badge>;
  }

  // ─── Table columns ─────────────────────────────────────────────────────

  const myColumns: Column<Expense>[] = [
    { key: "date", label: "Date", sortable: true },
    { key: "type", label: "Type", sortable: true },
    {
      key: "amount",
      label: "Amount (EGP)",
      sortable: true,
      render: (v: number) => <span className="font-semibold">{v.toLocaleString()}</span>,
    },
    {
      key: "description",
      label: "Description",
      render: (v: string) => <span className="truncate max-w-[200px] block">{v}</span>,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (v: ExpenseStatus, row: Expense) => (
        <div className="flex items-center gap-1.5">
          {statusBadge(v)}
          {row.journalEntryId && (
            <Badge className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0 font-semibold gap-0.5" title={`Journal Entry: ${row.journalEntryId}`}>
              <BookOpen className="h-3 w-3" />JE
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "receiptPhoto",
      label: "Receipt",
      render: (v: string | undefined, row: Expense) =>
        v ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedExpense(row);
              setViewDialogOpen(true);
            }}
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
          >
            <Eye className="h-3.5 w-3.5" /> View
          </button>
        ) : (
          <span className="text-slate-400 text-xs">None</span>
        ),
    },
  ];

  const approvalColumns: Column<Expense>[] = [
    { key: "userName", label: "Submitted By", sortable: true },
    { key: "date", label: "Date", sortable: true },
    { key: "type", label: "Type", sortable: true },
    {
      key: "amount",
      label: "Amount (EGP)",
      sortable: true,
      render: (v: number) => (
        <div>
          <span className="font-semibold">{v.toLocaleString()}</span>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Level {getApprovalLevel(v).level}: {getApprovalLevel(v).approver}
          </div>
        </div>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (v: string) => <span className="truncate max-w-[200px] block">{v}</span>,
    },
    {
      key: "receiptPhoto",
      label: "Receipt",
      render: (v: string | undefined, row: Expense) =>
        v ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedExpense(row);
              setViewDialogOpen(true);
            }}
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
          >
            <Eye className="h-3.5 w-3.5" /> View
          </button>
        ) : (
          <span className="text-slate-400 text-xs">None</span>
        ),
    },
    {
      key: "id",
      label: "Actions",
      render: (_: string, row: Expense) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50" onClick={(e) => { e.stopPropagation(); handleApprove(row); }}>
            <Check className="h-3.5 w-3.5 mr-1" /> Approve
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs text-red-700 border-red-300 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); openRejectDialog(row); }}>
            <X className="h-3.5 w-3.5 mr-1" /> Reject
          </Button>
        </div>
      ),
    },
  ];

  // ─── Reports data ──────────────────────────────────────────────────────

  const byType = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    expenses.forEach((e) => {
      if (!map[e.type]) map[e.type] = { count: 0, total: 0 };
      map[e.type].count++;
      map[e.type].total += e.amount;
    });
    return Object.entries(map).map(([type, data]) => ({ type, ...data }));
  }, [expenses]);

  const byPerson = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    expenses.forEach((e) => {
      if (!map[e.userName]) map[e.userName] = { count: 0, total: 0 };
      map[e.userName].count++;
      map[e.userName].total += e.amount;
    });
    return Object.entries(map).map(([person, data]) => ({ person, ...data }));
  }, [expenses]);

  const byMonth = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    expenses.forEach((e) => {
      const month = e.date.slice(0, 7);
      if (!map[month]) map[month] = { count: 0, total: 0 };
      map[month].count++;
      map[month].total += e.amount;
    });
    return Object.entries(map)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [expenses]);

  const reportByTypeColumns: Column[] = [
    { key: "type", label: "Expense Type", sortable: true },
    { key: "count", label: "Count", sortable: true },
    { key: "total", label: "Total (EGP)", sortable: true, render: (v: number) => v.toLocaleString() },
  ];

  const reportByPersonColumns: Column[] = [
    { key: "person", label: "Person", sortable: true },
    { key: "count", label: "Count", sortable: true },
    { key: "total", label: "Total (EGP)", sortable: true, render: (v: number) => v.toLocaleString() },
  ];

  const reportByMonthColumns: Column[] = [
    { key: "month", label: "Month", sortable: true },
    { key: "count", label: "Count", sortable: true },
    { key: "total", label: "Total (EGP)", sortable: true, render: (v: number) => v.toLocaleString() },
  ];

  function handleExportCSV() {
    const rows = expenses.map((e) => ({
      Date: e.date,
      Type: e.type,
      Amount: e.amount,
      Description: e.description,
      SubmittedBy: e.userName,
      Status: e.status,
      RejectionReason: e.rejectionReason ?? "",
      ApprovedBy: e.approvedBy ?? "",
    }));
    downloadCSV("expenses-report.csv", rows);
  }

  if (!loaded) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Submit, track, and approve field expenses. Upload receipt photos for verification."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => { setOcrResult(null); setOcrImagePreview(null); setOcrDialogOpen(true); }}>
              <ScanLine className="h-4 w-4 mr-2" /> Scan Receipt
            </Button>
            <Button onClick={() => { resetForm(); setNewDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> New Expense
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={DollarSign} title="Total Expenses (MTD)" value={`${totalMTD.toLocaleString()} EGP`} subtitle="Current month" iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={Clock} title="Pending Approval" value={`${pendingAmount.toLocaleString()} EGP`} subtitle={`${expenses.filter((e) => e.status === "PENDING").length} expenses`} iconColor="bg-yellow-100 text-yellow-600" />
        <StatsCard icon={Check} title="Approved" value={`${approvedAmount.toLocaleString()} EGP`} subtitle={`${expenses.filter((e) => e.status === "APPROVED").length} expenses`} iconColor="bg-green-100 text-green-600" />
        <StatsCard icon={X} title="Rejected" value={`${rejectedAmount.toLocaleString()} EGP`} subtitle={`${expenses.filter((e) => e.status === "REJECTED").length} expenses`} iconColor="bg-red-100 text-red-600" />
      </div>

      {/* Budget Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Monthly Budget Overview
          </CardTitle>
          <CardDescription>Your personal expense budget for this month</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 rounded-lg bg-slate-50">
              <p className="text-xs text-slate-500">Monthly Budget</p>
              <p className="text-lg font-bold text-slate-800">{MONTHLY_BUDGET_PER_REP.toLocaleString()} EGP</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-50">
              <p className="text-xs text-green-600">Approved This Month</p>
              <p className="text-lg font-bold text-green-700">{myApprovedThisMonth.toLocaleString()} EGP</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-yellow-50">
              <p className="text-xs text-yellow-600">Pending</p>
              <p className="text-lg font-bold text-yellow-700">{myPendingThisMonth.toLocaleString()} EGP</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-50">
              <p className="text-xs text-blue-600">Remaining</p>
              <p className={`text-lg font-bold ${budgetRemaining < 0 ? "text-red-700" : "text-blue-700"}`}>{budgetRemaining.toLocaleString()} EGP</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-purple-50">
              <p className="text-xs text-purple-600">Utilization</p>
              <p className={`text-lg font-bold ${budgetUtilization > 90 ? "text-red-700" : "text-purple-700"}`}>{budgetUtilization}%</p>
            </div>
          </div>
          {/* Budget progress bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500">Budget Used</span>
              <span className={`font-semibold ${budgetUtilization > 90 ? "text-red-600" : "text-slate-700"}`}>
                {myApprovedThisMonth.toLocaleString()} / {MONTHLY_BUDGET_PER_REP.toLocaleString()} EGP
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${budgetBarColor}`}
                style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
              />
            </div>
            {budgetUtilization > 90 && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                <p className="text-xs text-red-700">
                  Budget utilization is at {budgetUtilization}%. {budgetRemaining < 0 ? `You have exceeded your budget by ${Math.abs(budgetRemaining).toLocaleString()} EGP.` : `Only ${budgetRemaining.toLocaleString()} EGP remaining.`}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="my-expenses">
        <TabsList>
          <TabsTrigger value="my-expenses">My Expenses</TabsTrigger>
          {isManager && <TabsTrigger value="approve">Approve Expenses</TabsTrigger>}
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Tab 1: My Expenses */}
        <TabsContent value="my-expenses" className="mt-4">
          <DataTable
            columns={myColumns}
            data={myExpenses}
            searchable
            searchKeys={["date", "type", "description"]}
            pagination
            emptyMessage="You have not submitted any expenses yet."
            onRowClick={(row) => { setSelectedExpense(row); setViewDialogOpen(true); }}
          />
        </TabsContent>

        {/* Tab 2: Approve Expenses */}
        {isManager && (
          <TabsContent value="approve" className="mt-4">
            {pendingTeamExpenses.length === 0 ? (
              <Card className="p-8 text-center text-slate-500">
                <Check className="h-12 w-12 mx-auto mb-3 text-green-300" />
                <p className="font-medium">All caught up! No pending expenses to review.</p>
              </Card>
            ) : (
              <DataTable
                columns={approvalColumns}
                data={pendingTeamExpenses}
                searchable
                searchKeys={["userName", "date", "type", "description"]}
                pagination
                emptyMessage="No pending expenses from team members."
              />
            )}
          </TabsContent>
        )}

        {/* Tab 3: Reports */}
        <TabsContent value="reports" className="mt-4 space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" /> Export to CSV
            </Button>
          </div>

          {/* Enhanced Analytics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Budget Utilization Gauge */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" /> Budget Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  <div className="relative w-28 h-28">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                      <circle
                        cx="50" cy="50" r="40" fill="none"
                        stroke={budgetUtilization > 90 ? "#ef4444" : budgetUtilization > 70 ? "#eab308" : "#22c55e"}
                        strokeWidth="10"
                        strokeDasharray={`${Math.min(budgetUtilization, 100) * 2.51} 251`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-xl font-bold ${budgetUtilization > 90 ? "text-red-600" : "text-slate-800"}`}>{budgetUtilization}%</span>
                    </div>
                  </div>
                </div>
                <p className="text-center text-xs text-slate-500 mt-2">
                  {myApprovedThisMonth.toLocaleString()} / {MONTHLY_BUDGET_PER_REP.toLocaleString()} EGP
                </p>
              </CardContent>
            </Card>

            {/* Expense Trend (Last 6 Months) */}
            <Card className="col-span-1 md:col-span-2 lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4" /> 6-Month Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1.5 h-24">
                  {(() => {
                    const maxVal = Math.max(...expenseTrendLast6.map((m) => m.total), 1);
                    return expenseTrendLast6.map((m) => (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[9px] text-slate-500 font-medium">{m.total > 0 ? `${(m.total / 1000).toFixed(1)}k` : "0"}</span>
                        <div
                          className="w-full bg-blue-500 rounded-t transition-all duration-300 min-h-[2px]"
                          style={{ height: `${Math.max((m.total / maxVal) * 70, 2)}px` }}
                        />
                        <span className="text-[9px] text-slate-400">{m.month}</span>
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Top Categories Pie Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <PieChart className="h-4 w-4" /> Category Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoryBreakdown.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No approved expenses</p>
                ) : (
                  <div className="space-y-2">
                    {categoryBreakdown.map((cat, idx) => (
                      <div key={cat.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2.5 h-2.5 rounded-full ${CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}`} />
                            <span className="text-slate-700">{cat.category}</span>
                          </div>
                          <span className="text-slate-500">{cat.pct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}`}
                            style={{ width: `${cat.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Average Processing Time */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Timer className="h-4 w-4" /> Avg Processing Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-3">
                  <div className="text-3xl font-bold text-slate-800">{avgProcessingTime}</div>
                  <p className="text-xs text-slate-500 mt-1">hours average</p>
                  <div className="mt-3 w-full grid grid-cols-3 gap-1 text-center">
                    <div className="p-1.5 bg-green-50 rounded">
                      <p className="text-xs font-semibold text-green-700">{expenses.filter((e) => e.status === "APPROVED").length}</p>
                      <p className="text-[9px] text-green-600">Approved</p>
                    </div>
                    <div className="p-1.5 bg-yellow-50 rounded">
                      <p className="text-xs font-semibold text-yellow-700">{expenses.filter((e) => e.status === "PENDING").length}</p>
                      <p className="text-[9px] text-yellow-600">Pending</p>
                    </div>
                    <div className="p-1.5 bg-red-50 rounded">
                      <p className="text-xs font-semibold text-red-700">{expenses.filter((e) => e.status === "REJECTED").length}</p>
                      <p className="text-[9px] text-red-600">Rejected</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">By Type</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable columns={reportByTypeColumns} data={byType} pagination={false} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">By Person</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable columns={reportByPersonColumns} data={byPerson} pagination={false} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">By Month</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable columns={reportByMonthColumns} data={byMonth} pagination={false} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── New Expense Dialog ─────────────────────────────────────────── */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Expense</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as ExpenseType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (EGP)</Label>
              <Input type="number" min={0} step="0.01" placeholder="0.00" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />
              {formAmount && parseFloat(formAmount) > 0 && (
                <p className="text-[10px] text-slate-500">
                  Approval: Level {getApprovalLevel(parseFloat(formAmount)).level} ({getApprovalLevel(parseFloat(formAmount)).approver})
                </p>
              )}
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Description / Notes</Label>
              <Input placeholder="What was this expense for?" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Invoice / Receipt Photo</Label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors text-sm text-slate-600">
                  <Camera className="h-4 w-4" />
                  <span>{formPhotoName || "Choose file..."}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              </div>
              {formPhoto && (
                <div className="mt-2 relative w-32 h-24 rounded-lg overflow-hidden border border-slate-200">
                  <img src={formPhoto} alt="Receipt preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setFormPhoto(undefined); setFormPhotoName(""); }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateExpense} disabled={!formDate || !formAmount || !formDescription}>
              <Plus className="h-4 w-4 mr-2" /> Submit Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── View Expense Detail Dialog ─────────────────────────────────── */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Expense Detail</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">Date</p>
                  <p className="font-medium">{selectedExpense.date}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Type</p>
                  <p className="font-medium">{selectedExpense.type}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Amount</p>
                  <p className="font-semibold text-lg">{selectedExpense.amount.toLocaleString()} EGP</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Status</p>
                  {statusBadge(selectedExpense.status)}
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500 text-xs">Submitted By</p>
                  <p className="font-medium">{selectedExpense.userName}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500 text-xs">Description</p>
                  <p>{selectedExpense.description}</p>
                </div>
                {selectedExpense.approvedBy && (
                  <div className="col-span-2">
                    <p className="text-slate-500 text-xs">Approved By</p>
                    <p className="font-medium text-green-700">{selectedExpense.approvedBy}</p>
                  </div>
                )}
                {selectedExpense.rejectionReason && (
                  <div className="col-span-2">
                    <p className="text-slate-500 text-xs">Rejection Reason</p>
                    <p className="text-red-700">{selectedExpense.rejectionReason}</p>
                  </div>
                )}
              </div>
              {/* Approval Level Indicator */}
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-500 text-xs mb-1">Required Approval</p>
                <div className="flex items-center gap-2">
                  <Badge className="bg-indigo-100 text-indigo-700">
                    Level {getApprovalLevel(selectedExpense.amount).level}
                  </Badge>
                  <span className="text-sm font-medium">{getApprovalLevel(selectedExpense.amount).approver}</span>
                </div>
              </div>

              {/* Approval Audit Trail Timeline */}
              {selectedExpense.approvalHistory && selectedExpense.approvalHistory.length > 0 && (
                <div>
                  <p className="text-slate-500 text-xs mb-3">Approval Timeline</p>
                  <div className="relative pl-6 space-y-4">
                    {/* Vertical line */}
                    <div className="absolute left-[9px] top-1 bottom-1 w-0.5 bg-slate-200" />
                    {selectedExpense.approvalHistory.map((entry) => {
                      const dotColor: Record<string, string> = {
                        SUBMITTED: "bg-blue-500",
                        APPROVED: "bg-green-500",
                        REJECTED: "bg-red-500",
                        ESCALATED: "bg-orange-500",
                        RETURNED: "bg-yellow-500",
                      };
                      return (
                        <div key={entry.id} className="relative">
                          {/* Colored dot */}
                          <div className={`absolute -left-6 top-0.5 w-[18px] h-[18px] rounded-full border-2 border-white ${dotColor[entry.action] || "bg-slate-400"}`} />
                          <div className="text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{entry.action}</span>
                              <span className="text-[10px] text-slate-400">Level {entry.level}</span>
                            </div>
                            <p className="text-xs text-slate-600">{entry.performedBy}</p>
                            <p className="text-[10px] text-slate-400">{new Date(entry.timestamp).toLocaleString()}</p>
                            {entry.comment && (
                              <p className="text-xs text-slate-500 mt-1 italic">&ldquo;{entry.comment}&rdquo;</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedExpense.receiptPhoto && (
                <div>
                  <p className="text-slate-500 text-xs mb-2">Receipt Photo</p>
                  <img
                    src={selectedExpense.receiptPhoto}
                    alt="Receipt"
                    className="w-full max-h-96 object-contain rounded-lg border border-slate-200"
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Reject Dialog ──────────────────────────────────────────────── */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Rejecting expense from <strong>{selectedExpense?.userName}</strong> for{" "}
              <strong>{selectedExpense?.amount.toLocaleString()} EGP</strong>.
            </p>
            {/* Action type selection */}
            <div className="space-y-2">
              <Label>Action</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRejectAction("RETURN")}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm transition-colors ${rejectAction === "RETURN" ? "border-yellow-400 bg-yellow-50 text-yellow-800" : "border-slate-200 hover:border-slate-300"}`}
                >
                  <RotateCcw className="h-4 w-4" />
                  <div className="text-left">
                    <p className="font-medium">Return for revision</p>
                    <p className="text-[10px] text-slate-500">Back to draft</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setRejectAction("REJECT")}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm transition-colors ${rejectAction === "REJECT" ? "border-red-400 bg-red-50 text-red-800" : "border-slate-200 hover:border-slate-300"}`}
                >
                  <X className="h-4 w-4" />
                  <div className="text-left">
                    <p className="font-medium">Reject (final)</p>
                    <p className="text-[10px] text-slate-500">Cannot resubmit</p>
                  </div>
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason (required)</Label>
              <Input
                placeholder="Please provide a reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
              {!rejectionReason.trim() && (
                <p className="text-[10px] text-red-500">A reason is required for rejection.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            {rejectAction === "RETURN" ? (
              <Button className="bg-yellow-600 hover:bg-yellow-700 text-white" onClick={handleReject} disabled={!rejectionReason.trim()}>
                <RotateCcw className="h-4 w-4 mr-2" /> Return for Revision
              </Button>
            ) : (
              <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason.trim()}>
                <X className="h-4 w-4 mr-2" /> Reject
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Budget Warning Dialog ──────────────────────────────────────── */}
      <Dialog open={budgetWarningOpen} onOpenChange={(open) => { setBudgetWarningOpen(open); if (!open) setPendingExpenseCreate(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-5 w-5" /> Budget Warning
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                This expense (<strong>{parseFloat(formAmount || "0").toLocaleString()} EGP</strong>) will exceed your monthly budget by{" "}
                <strong>{Math.abs(budgetRemaining - parseFloat(formAmount || "0")).toLocaleString()} EGP</strong>.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 bg-slate-50 rounded">
                <p className="text-xs text-slate-500">Monthly Budget</p>
                <p className="font-semibold">{MONTHLY_BUDGET_PER_REP.toLocaleString()} EGP</p>
              </div>
              <div className="p-2 bg-slate-50 rounded">
                <p className="text-xs text-slate-500">Already Approved</p>
                <p className="font-semibold">{myApprovedThisMonth.toLocaleString()} EGP</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">Submit anyway?</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBudgetWarningOpen(false); setPendingExpenseCreate(false); }}>Cancel</Button>
            <Button className="bg-yellow-600 hover:bg-yellow-700 text-white" onClick={handleCreateExpense}>
              <AlertTriangle className="h-4 w-4 mr-2" /> Submit Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── OCR Scan Receipt Dialog ───────────────────────────────────── */}
      <Dialog open={ocrDialogOpen} onOpenChange={setOcrDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5" /> Receipt OCR Scanner
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Upload area */}
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
              <input
                ref={ocrFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleOCRFileUpload}
              />
              <FileImage className="h-10 w-10 mx-auto mb-3 text-slate-400" />
              <p className="text-sm text-slate-600 mb-2">
                Upload a receipt image to extract expense details
              </p>
              <Button
                variant="outline"
                onClick={() => ocrFileRef.current?.click()}
                disabled={ocrScanning}
              >
                {ocrScanning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scanning...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" /> Choose Receipt Image
                  </>
                )}
              </Button>
            </div>

            {/* Scanning indicator */}
            {ocrScanning && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Processing receipt...</p>
                  <p className="text-xs text-blue-600">Extracting vendor, amount, date, and category</p>
                </div>
              </div>
            )}

            {/* OCR Result */}
            {ocrResult && !ocrScanning && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">Extracted Data</h3>
                  <Badge className={`${confidenceColor(ocrResult.confidence)} gap-1`}>
                    <Percent className="h-3 w-3" />
                    {ocrResult.confidence}% Confidence
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Thumbnail */}
                  <div className="col-span-2 flex gap-4">
                    {ocrImagePreview && (
                      <div className="w-28 h-20 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                        <img src={ocrImagePreview} alt="Receipt" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 space-y-1">
                      <p className="text-xs text-slate-500">Vendor</p>
                      <p className="font-semibold text-sm">{ocrResult.vendor}</p>
                      <p className="text-xs text-slate-500 mt-1">File</p>
                      <p className="text-xs text-slate-600 truncate">{ocrResult.fileName}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Amount</p>
                    <p className="font-bold text-lg text-green-700">{ocrResult.amount.toLocaleString()} EGP</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Date</p>
                    <p className="font-medium text-sm">{ocrResult.date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Category</p>
                    <Badge variant="outline">{ocrResult.category}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Scanned At</p>
                    <p className="text-xs text-slate-600">{new Date(ocrResult.scannedAt).toLocaleTimeString()}</p>
                  </div>
                </div>

                {/* Confidence bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500">OCR Confidence</span>
                    <span className={`font-semibold ${ocrResult.confidence >= 90 ? "text-green-700" : ocrResult.confidence >= 80 ? "text-yellow-700" : "text-orange-700"}`}>
                      {ocrResult.confidence}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${ocrResult.confidence >= 90 ? "bg-green-500" : ocrResult.confidence >= 80 ? "bg-yellow-500" : "bg-orange-500"}`}
                      style={{ width: `${ocrResult.confidence}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* OCR History */}
            {ocrHistory.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Recent Scans</h3>
                <div className="max-h-40 overflow-y-auto space-y-1.5">
                  {ocrHistory.map((scan) => (
                    <div
                      key={scan.id}
                      className="flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer text-sm"
                      onClick={() => {
                        setOcrResult(scan);
                        setOcrImagePreview(scan.imageBase64);
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded overflow-hidden border border-slate-200 shrink-0">
                          <img src={scan.imageBase64} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{scan.vendor}</p>
                          <p className="text-[10px] text-slate-400">{scan.fileName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold text-xs">{scan.amount.toLocaleString()} EGP</span>
                        <Badge className={`text-[10px] px-1.5 py-0 ${confidenceColor(scan.confidence)}`}>
                          {scan.confidence}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOcrDialogOpen(false)}>Close</Button>
            <Button onClick={applyOCRToForm} disabled={!ocrResult || ocrScanning}>
              <Check className="h-4 w-4 mr-2" /> Use Extracted Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
