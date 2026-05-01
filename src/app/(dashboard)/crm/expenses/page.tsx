"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Receipt, Upload, Plus, Check, X, Download, Eye, Camera, DollarSign, Clock, BookOpen, ScanLine, Loader2, FileImage, Percent } from "lucide-react";
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
type ExpenseStatus = "PENDING" | "APPROVED" | "REJECTED";

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
    },
    {
      id: "exp-seed-2", userId: "u-rep-1", userName: "Mohamed El-Sayed",
      date: "2026-04-05", type: "Meals", amount: 85,
      description: "Lunch during field day in Nasr City",
      status: "APPROVED", approvedBy: "Ahmed Mostafa", createdAt: "2026-04-05T13:00:00Z",
    },
    {
      id: "exp-seed-3", userId: "u-rep-1", userName: "Mohamed El-Sayed",
      date: "2026-04-12", type: "Transport", amount: 200,
      description: "Uber rides for 3 hospital visits in Heliopolis",
      status: "PENDING", createdAt: "2026-04-12T09:00:00Z",
    },
    {
      id: "exp-seed-4", userId: "u-dm-1", userName: "Ahmed Mostafa",
      date: "2026-04-08", type: "Hotel", amount: 950,
      description: "Overnight stay for Alexandria territory review",
      status: "PENDING", createdAt: "2026-04-08T18:00:00Z",
    },
    {
      id: "exp-seed-5", userId: "u-dm-1", userName: "Ahmed Mostafa",
      date: "2026-04-10", type: "Meals", amount: 320,
      description: "Team dinner during quarterly meeting",
      status: "APPROVED", approvedBy: "Dr. Yasmin Salem", createdAt: "2026-04-10T20:00:00Z",
    },
    {
      id: "exp-seed-6", userId: "u-mkt-1", userName: "Dr. Yasmin Salem",
      date: "2026-04-15", type: "Office Supplies", amount: 475,
      description: "Printing promotional materials for Cardioprex campaign",
      status: "REJECTED", rejectionReason: "Please use central procurement for print orders above 300 EGP",
      createdAt: "2026-04-15T11:00:00Z",
    },
    {
      id: "exp-seed-7", userId: "u-rep-1", userName: "Mohamed El-Sayed",
      date: "2026-04-20", type: "Accommodation", amount: 600,
      description: "Accommodation for Upper Egypt field trip",
      status: "PENDING", createdAt: "2026-04-20T16:00:00Z",
    },
    {
      id: "exp-seed-8", userId: "u-dm-1", userName: "Ahmed Mostafa",
      date: "2026-04-22", type: "Transport", amount: 180,
      description: "Car rental for Giza district supervision",
      status: "PENDING", createdAt: "2026-04-22T07:30:00Z",
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
    const newExp: Expense = {
      id: genId(),
      userId: user.id,
      userName: user.name,
      date: formDate,
      type: formType,
      amount: parseFloat(formAmount),
      description: formDescription,
      receiptPhoto: formPhoto,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    persist([newExp, ...expenses]);
    setNewDialogOpen(false);
    resetForm();
  }

  // ─── Approve / Reject ──────────────────────────────────────────────────

  function handleApprove(exp: Expense) {
    // Create a journal entry in accounting for the approved expense
    const jeId = store.genId("je");
    const jeNumber = store.generateJournalNumber();
    const now = new Date().toISOString();

    store.add("journalEntries", {
      id: jeId,
      number: jeNumber,
      date: now.slice(0, 10),
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
      createdAt: now,
    });

    const next = expenses.map((e) =>
      e.id === exp.id
        ? { ...e, status: "APPROVED" as ExpenseStatus, approvedBy: user.name, journalEntryId: jeId }
        : e
    );
    persist(next);
  }

  function openRejectDialog(exp: Expense) {
    setSelectedExpense(exp);
    setRejectionReason("");
    setRejectDialogOpen(true);
  }

  function handleReject() {
    if (!selectedExpense) return;
    const next = expenses.map((e) =>
      e.id === selectedExpense.id
        ? { ...e, status: "REJECTED" as ExpenseStatus, rejectionReason: rejectionReason || "No reason provided" }
        : e
    );
    persist(next);
    setRejectDialogOpen(false);
    setSelectedExpense(null);
  }

  // ─── Status badge ──────────────────────────────────────────────────────

  function statusBadge(status: ExpenseStatus) {
    const map: Record<ExpenseStatus, string> = {
      PENDING: "bg-yellow-100 text-yellow-800",
      APPROVED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
    };
    return <Badge className={map[status]}>{status}</Badge>;
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
      render: (v: number) => <span className="font-semibold">{v.toLocaleString()}</span>,
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
        <DialogContent className="max-w-lg">
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
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Rejecting expense from <strong>{selectedExpense?.userName}</strong> for{" "}
              <strong>{selectedExpense?.amount.toLocaleString()} EGP</strong>.
            </p>
            <div className="space-y-2">
              <Label>Reason for rejection</Label>
              <Input
                placeholder="Please provide a reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>
              <X className="h-4 w-4 mr-2" /> Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
