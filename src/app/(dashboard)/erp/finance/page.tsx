"use client"

import { useState } from "react"
import PageHeader from "@/components/shared/page-header"
import StatsCard from "@/components/shared/stats-card"
import DataTable from "@/components/shared/data-table"
import StatusBadge from "@/components/shared/status-badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Plus,
  CreditCard,
  BookOpen,
} from "lucide-react"

type Invoice = {
  id: string
  number: string
  customer: string
  amount: number
  dueDate: string
  status: string
  issuedDate: string
}

type Bill = {
  id: string
  number: string
  vendor: string
  amount: number
  dueDate: string
  status: string
  category: string
}

type Payment = {
  id: string
  reference: string
  party: string
  amount: number
  date: string
  method: string
  type: string
}

type Account = {
  id: string
  code: string
  name: string
  type: string
  balance: number
  currency: string
}

const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const initialInvoices: Invoice[] = [
  { id: "1", number: "INV-001", customer: "Acme Corp", amount: 12500, dueDate: "2026-04-15", status: "Sent", issuedDate: "2026-03-15" },
  { id: "2", number: "INV-002", customer: "Globex Inc", amount: 8750, dueDate: "2026-03-01", status: "Overdue", issuedDate: "2026-02-01" },
  { id: "3", number: "INV-003", customer: "Initech LLC", amount: 3200, dueDate: "2026-02-28", status: "Paid", issuedDate: "2026-01-28" },
  { id: "4", number: "INV-004", customer: "Umbrella Co", amount: 21000, dueDate: "2026-04-30", status: "Draft", issuedDate: "2026-03-20" },
  { id: "5", number: "INV-005", customer: "Stark Industries", amount: 15600, dueDate: "2026-03-20", status: "Paid", issuedDate: "2026-02-20" },
  { id: "6", number: "INV-006", customer: "Wayne Enterprises", amount: 9400, dueDate: "2026-04-10", status: "Sent", issuedDate: "2026-03-10" },
]

const initialBills: Bill[] = [
  { id: "1", number: "BILL-001", vendor: "Office Depot", amount: 1250, dueDate: "2026-04-05", status: "Pending", category: "Office Supplies" },
  { id: "2", number: "BILL-002", vendor: "AWS", amount: 3800, dueDate: "2026-04-01", status: "Paid", category: "Cloud Services" },
  { id: "3", number: "BILL-003", vendor: "Comcast Business", amount: 420, dueDate: "2026-03-28", status: "Overdue", category: "Utilities" },
  { id: "4", number: "BILL-004", vendor: "Delta Airlines", amount: 5600, dueDate: "2026-04-15", status: "Pending", category: "Travel" },
  { id: "5", number: "BILL-005", vendor: "WeWork", amount: 8500, dueDate: "2026-04-01", status: "Paid", category: "Rent" },
]

const initialPayments: Payment[] = [
  { id: "1", reference: "PAY-001", party: "Acme Corp", amount: 15600, date: "2026-03-18", method: "Bank Transfer", type: "Received" },
  { id: "2", reference: "PAY-002", party: "AWS", amount: 3800, date: "2026-03-25", method: "Credit Card", type: "Sent" },
  { id: "3", reference: "PAY-003", party: "Initech LLC", amount: 3200, date: "2026-03-10", method: "Check", type: "Received" },
  { id: "4", reference: "PAY-004", party: "WeWork", amount: 8500, date: "2026-03-01", method: "Bank Transfer", type: "Sent" },
]

const initialAccounts: Account[] = [
  { id: "1", code: "1000", name: "Cash & Cash Equivalents", type: "Asset", balance: 248000, currency: "USD" },
  { id: "2", code: "1200", name: "Accounts Receivable", type: "Asset", balance: 45950, currency: "USD" },
  { id: "3", code: "1500", name: "Inventory", type: "Asset", balance: 89300, currency: "USD" },
  { id: "4", code: "2000", name: "Accounts Payable", type: "Liability", balance: 19570, currency: "USD" },
  { id: "5", code: "2500", name: "Short-term Debt", type: "Liability", balance: 50000, currency: "USD" },
  { id: "6", code: "3000", name: "Owner Equity", type: "Equity", balance: 313680, currency: "USD" },
  { id: "7", code: "4000", name: "Revenue", type: "Income", balance: 187500, currency: "USD" },
  { id: "8", code: "5000", name: "Operating Expenses", type: "Expense", balance: 62400, currency: "USD" },
]

type Tab = "overview" | "invoices" | "bills" | "payments" | "accounts"

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices)
  const [bills, setBills] = useState<Bill[]>(initialBills)
  const [payments, setPayments] = useState<Payment[]>(initialPayments)
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts)

  // Dialog state
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [billOpen, setBillOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  // New invoice form
  const [newInvoice, setNewInvoice] = useState({ number: "", customer: "", amount: "", dueDate: "", status: "Draft" })
  // New bill form
  const [newBill, setNewBill] = useState({ number: "", vendor: "", amount: "", dueDate: "", category: "", status: "Pending" })
  // New payment form
  const [newPayment, setNewPayment] = useState({ reference: "", party: "", amount: "", date: "", method: "Bank Transfer", type: "Received" })
  // New account form
  const [newAccount, setNewAccount] = useState({ code: "", name: "", type: "Asset", balance: "" })

  const totalRevenue = invoices.filter(i => i.status === "Paid").reduce((s, i) => s + i.amount, 0)
  const totalExpenses = bills.filter(b => b.status === "Paid").reduce((s, b) => s + b.amount, 0)
  const netProfit = totalRevenue - totalExpenses
  const outstandingInvoices = invoices.filter(i => i.status === "Sent" || i.status === "Overdue").reduce((s, i) => s + i.amount, 0)

  const handleAddInvoice = () => {
    if (!newInvoice.customer || !newInvoice.amount) return
    const inv: Invoice = {
      id: String(Date.now()),
      number: newInvoice.number || `INV-${String(invoices.length + 1).padStart(3, "0")}`,
      customer: newInvoice.customer,
      amount: parseFloat(newInvoice.amount),
      dueDate: newInvoice.dueDate || "2026-05-01",
      status: newInvoice.status,
      issuedDate: new Date().toISOString().slice(0, 10),
    }
    setInvoices(prev => [inv, ...prev])
    setNewInvoice({ number: "", customer: "", amount: "", dueDate: "", status: "Draft" })
    setInvoiceOpen(false)
  }

  const handleAddBill = () => {
    if (!newBill.vendor || !newBill.amount) return
    const bill: Bill = {
      id: String(Date.now()),
      number: newBill.number || `BILL-${String(bills.length + 1).padStart(3, "0")}`,
      vendor: newBill.vendor,
      amount: parseFloat(newBill.amount),
      dueDate: newBill.dueDate || "2026-05-01",
      status: newBill.status,
      category: newBill.category || "General",
    }
    setBills(prev => [bill, ...prev])
    setNewBill({ number: "", vendor: "", amount: "", dueDate: "", category: "", status: "Pending" })
    setBillOpen(false)
  }

  const handleAddPayment = () => {
    if (!newPayment.party || !newPayment.amount) return
    const pay: Payment = {
      id: String(Date.now()),
      reference: newPayment.reference || `PAY-${String(payments.length + 1).padStart(3, "0")}`,
      party: newPayment.party,
      amount: parseFloat(newPayment.amount),
      date: newPayment.date || new Date().toISOString().slice(0, 10),
      method: newPayment.method,
      type: newPayment.type,
    }
    setPayments(prev => [pay, ...prev])
    setNewPayment({ reference: "", party: "", amount: "", date: "", method: "Bank Transfer", type: "Received" })
    setPaymentOpen(false)
  }

  const handleAddAccount = () => {
    if (!newAccount.code || !newAccount.name) return
    const acc: Account = {
      id: String(Date.now()),
      code: newAccount.code,
      name: newAccount.name,
      type: newAccount.type,
      balance: parseFloat(newAccount.balance) || 0,
      currency: "USD",
    }
    setAccounts(prev => [...prev, acc])
    setNewAccount({ code: "", name: "", type: "Asset", balance: "" })
    setAccountOpen(false)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "invoices", label: "Invoices" },
    { key: "bills", label: "Bills" },
    { key: "payments", label: "Payments" },
    { key: "accounts", label: "Chart of Accounts" },
  ]

  const invoiceColumns = [
    { key: "number", label: "Invoice #" },
    { key: "customer", label: "Customer" },
    { key: "issuedDate", label: "Issued" },
    { key: "dueDate", label: "Due Date" },
    { key: "amount", label: "Amount", render: (v: unknown) => fmt(v as number) },
    { key: "status", label: "Status", render: (v: unknown) => <StatusBadge status={v as string} /> },
  ]

  const billColumns = [
    { key: "number", label: "Bill #" },
    { key: "vendor", label: "Vendor" },
    { key: "category", label: "Category" },
    { key: "dueDate", label: "Due Date" },
    { key: "amount", label: "Amount", render: (v: unknown) => fmt(v as number) },
    { key: "status", label: "Status", render: (v: unknown) => <StatusBadge status={v as string} /> },
  ]

  const paymentColumns = [
    { key: "reference", label: "Reference" },
    { key: "party", label: "Party" },
    { key: "date", label: "Date" },
    { key: "method", label: "Method" },
    { key: "type", label: "Type" },
    { key: "amount", label: "Amount", render: (v: unknown) => fmt(v as number) },
  ]

  const accountColumns = [
    { key: "code", label: "Code" },
    { key: "name", label: "Account Name" },
    { key: "type", label: "Type" },
    { key: "currency", label: "Currency" },
    { key: "balance", label: "Balance", render: (v: unknown) => fmt(v as number) },
  ]

  const recentTransactions = [
    ...invoices.slice(0, 3).map(i => ({ label: `Invoice ${i.number} — ${i.customer}`, amount: i.amount, type: "Income", status: i.status })),
    ...bills.slice(0, 3).map(b => ({ label: `Bill ${b.number} — ${b.vendor}`, amount: b.amount, type: "Expense", status: b.status })),
  ].sort(() => Math.random() - 0.5).slice(0, 6)

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Finance" description="Manage invoices, bills, payments, and accounts">
        {activeTab === "invoices" && (
          <Button onClick={() => setInvoiceOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Invoice
          </Button>
        )}
        {activeTab === "bills" && (
          <Button onClick={() => setBillOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Bill
          </Button>
        )}
        {activeTab === "payments" && (
          <Button onClick={() => setPaymentOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Payment
          </Button>
        )}
        {activeTab === "accounts" && (
          <Button onClick={() => setAccountOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Account
          </Button>
        )}
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Revenue"
          value={fmt(totalRevenue)}
          subtitle="From paid invoices"
          icon={<TrendingUp className="h-5 w-5" />}
          trend={{ value: 12.5, label: "vs last month" }}
        />
        <StatsCard
          title="Total Expenses"
          value={fmt(totalExpenses)}
          subtitle="From paid bills"
          icon={<TrendingDown className="h-5 w-5" />}
          trend={{ value: -3.2, label: "vs last month" }}
        />
        <StatsCard
          title="Net Profit"
          value={fmt(netProfit)}
          subtitle="Revenue minus expenses"
          icon={<DollarSign className="h-5 w-5" />}
          trend={{ value: 8.1, label: "vs last month" }}
        />
        <StatsCard
          title="Outstanding Invoices"
          value={fmt(outstandingInvoices)}
          subtitle="Sent & overdue invoices"
          icon={<FileText className="h-5 w-5" />}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-1 -mb-px">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
          <div className="rounded-lg border border-border divide-y divide-border">
            {recentTransactions.map((tx, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${tx.type === "Income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {tx.type === "Income" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tx.label}</p>
                    <p className="text-xs text-muted-foreground">{tx.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={tx.status} />
                  <span className={`text-sm font-semibold ${tx.type === "Income" ? "text-green-700" : "text-red-600"}`}>
                    {tx.type === "Income" ? "+" : "-"}{fmt(tx.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Invoice Summary</h3>
              {["Paid", "Sent", "Overdue", "Draft"].map(status => {
                const count = invoices.filter(i => i.status === status).length
                const total = invoices.filter(i => i.status === status).reduce((s, i) => s + i.amount, 0)
                return (
                  <div key={status} className="flex justify-between items-center py-1.5 text-sm">
                    <StatusBadge status={status} />
                    <span className="text-muted-foreground">{count} invoice{count !== 1 ? "s" : ""} — {fmt(total)}</span>
                  </div>
                )
              })}
            </div>
            <div className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Account Balances</h3>
              {accounts.slice(0, 5).map(acc => (
                <div key={acc.id} className="flex justify-between items-center py-1.5 text-sm">
                  <span className="text-muted-foreground">{acc.code} — {acc.name}</span>
                  <span className="font-medium">{fmt(acc.balance)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "invoices" && (
        <DataTable columns={invoiceColumns as Parameters<typeof DataTable>[0]["columns"]} data={invoices as Record<string, unknown>[]} emptyMessage="No invoices found." />
      )}

      {activeTab === "bills" && (
        <DataTable columns={billColumns as Parameters<typeof DataTable>[0]["columns"]} data={bills as Record<string, unknown>[]} emptyMessage="No bills found." />
      )}

      {activeTab === "payments" && (
        <DataTable columns={paymentColumns as Parameters<typeof DataTable>[0]["columns"]} data={payments as Record<string, unknown>[]} emptyMessage="No payments found." />
      )}

      {activeTab === "accounts" && (
        <DataTable columns={accountColumns as Parameters<typeof DataTable>[0]["columns"]} data={accounts as Record<string, unknown>[]} emptyMessage="No accounts found." />
      )}

      {/* Add Invoice Dialog */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Invoice Number</Label>
              <Input placeholder="INV-007" value={newInvoice.number} onChange={e => setNewInvoice(p => ({ ...p, number: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Customer *</Label>
              <Input placeholder="Customer name" value={newInvoice.customer} onChange={e => setNewInvoice(p => ({ ...p, customer: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Amount *</Label>
              <Input type="number" placeholder="0.00" value={newInvoice.amount} onChange={e => setNewInvoice(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={newInvoice.dueDate} onChange={e => setNewInvoice(p => ({ ...p, dueDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={newInvoice.status} onValueChange={v => setNewInvoice(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Draft", "Sent", "Paid", "Overdue"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceOpen(false)}>Cancel</Button>
            <Button onClick={handleAddInvoice}>Create Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Bill Dialog */}
      <Dialog open={billOpen} onOpenChange={setBillOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Bill</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Bill Number</Label>
              <Input placeholder="BILL-006" value={newBill.number} onChange={e => setNewBill(p => ({ ...p, number: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Vendor *</Label>
              <Input placeholder="Vendor name" value={newBill.vendor} onChange={e => setNewBill(p => ({ ...p, vendor: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input placeholder="e.g. Office Supplies" value={newBill.category} onChange={e => setNewBill(p => ({ ...p, category: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Amount *</Label>
              <Input type="number" placeholder="0.00" value={newBill.amount} onChange={e => setNewBill(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={newBill.dueDate} onChange={e => setNewBill(p => ({ ...p, dueDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={newBill.status} onValueChange={v => setNewBill(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Pending", "Paid", "Overdue"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBillOpen(false)}>Cancel</Button>
            <Button onClick={handleAddBill}>Create Bill</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Reference</Label>
              <Input placeholder="PAY-005" value={newPayment.reference} onChange={e => setNewPayment(p => ({ ...p, reference: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Party *</Label>
              <Input placeholder="Customer or vendor name" value={newPayment.party} onChange={e => setNewPayment(p => ({ ...p, party: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Amount *</Label>
              <Input type="number" placeholder="0.00" value={newPayment.amount} onChange={e => setNewPayment(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={newPayment.date} onChange={e => setNewPayment(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={newPayment.method} onValueChange={v => setNewPayment(p => ({ ...p, method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Bank Transfer", "Credit Card", "Check", "Cash"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={newPayment.type} onValueChange={v => setNewPayment(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Received">Received</SelectItem>
                  <SelectItem value="Sent">Sent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
            <Button onClick={handleAddPayment}>Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Account Dialog */}
      <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Account Code *</Label>
              <Input placeholder="e.g. 1100" value={newAccount.code} onChange={e => setNewAccount(p => ({ ...p, code: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Account Name *</Label>
              <Input placeholder="e.g. Petty Cash" value={newAccount.name} onChange={e => setNewAccount(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={newAccount.type} onValueChange={v => setNewAccount(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Asset", "Liability", "Equity", "Income", "Expense"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Opening Balance</Label>
              <Input type="number" placeholder="0.00" value={newAccount.balance} onChange={e => setNewAccount(p => ({ ...p, balance: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountOpen(false)}>Cancel</Button>
            <Button onClick={handleAddAccount}>Create Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
