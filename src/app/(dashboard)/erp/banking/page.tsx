"use client"

import { useState, useMemo, useCallback } from "react"
import PageHeader from "@/components/shared/page-header"
import StatsCard from "@/components/shared/stats-card"
import DataTable, { type Column } from "@/components/shared/data-table"
import StatusBadge from "@/components/shared/status-badge"
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu"
import { EntityFormModal, type EntityField, type EntityFormData } from "@/components/shared/entity-form-modal"
import { FilterBar, type FilterState } from "@/components/shared/filter-bar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { useApiDataStore } from "@/lib/api/use-api-store"
import { type BankAccount, type Cheque, type Payment } from "@/lib/data-store"
import {
  Landmark,
  Plus,
  CreditCard,
  Receipt,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Scale,
  Banknote,
  FileCheck,
} from "lucide-react"

const egp = (n: number) =>
  `EGP ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtDate = (d: string) => {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

type ActiveTab = "accounts" | "cheques" | "payments" | "reconciliation"

const ACCOUNT_FIELDS: EntityField[] = [
  { name: "code", label: "Code", type: "text", required: true, placeholder: "BA-XXX-EGP" },
  { name: "name", label: "Account Name", type: "text", required: true, placeholder: "Main Operating Account" },
  { name: "bankName", label: "Bank Name", type: "text", required: true, placeholder: "CIB" },
  { name: "accountNumber", label: "Account Number", type: "text", required: true, placeholder: "1001-2345-6789-01" },
  { name: "iban", label: "IBAN", type: "text", fullWidth: true, placeholder: "EG38..." },
  { name: "currency", label: "Currency", type: "select", required: true, options: [{ label: "EGP", value: "EGP" }, { label: "USD", value: "USD" }, { label: "EUR", value: "EUR" }, { label: "GBP", value: "GBP" }], defaultValue: "EGP" },
  { name: "balance", label: "Opening Balance", type: "number", required: true, min: 0, step: 0.01, defaultValue: 0 },
  { name: "type", label: "Account Type", type: "select", required: true, options: [{ label: "Current", value: "CURRENT" }, { label: "Savings", value: "SAVINGS" }, { label: "Foreign Currency", value: "FOREIGN_CURRENCY" }], defaultValue: "CURRENT" },
  { name: "status", label: "Status", type: "select", required: true, options: [{ label: "Active", value: "ACTIVE" }, { label: "Dormant", value: "DORMANT" }, { label: "Closed", value: "CLOSED" }], defaultValue: "ACTIVE" },
  { name: "openedAt", label: "Opened Date", type: "date", required: true, defaultValue: new Date().toISOString().slice(0, 10) },
]

const CHEQUE_FIELDS = (bankAccounts: BankAccount[]): EntityField[] => [
  { name: "number", label: "Cheque Number", type: "text", required: true, placeholder: "CHQ-XXXX" },
  { name: "bankAccountId", label: "Bank Account", type: "select", required: true, options: bankAccounts.filter((a) => a.status === "ACTIVE").map((a) => ({ label: `${a.name} (${a.bankName})`, value: a.id })) },
  { name: "bankName", label: "Bank Name", type: "text", required: true },
  { name: "type", label: "Type", type: "select", required: true, options: [{ label: "Incoming", value: "INCOMING" }, { label: "Outgoing", value: "OUTGOING" }], defaultValue: "INCOMING" },
  { name: "partyName", label: "Party Name", type: "text", required: true, placeholder: "Customer / Vendor name" },
  { name: "amount", label: "Amount", type: "number", required: true, min: 0, step: 0.01 },
  { name: "currency", label: "Currency", type: "select", required: true, options: [{ label: "EGP", value: "EGP" }, { label: "USD", value: "USD" }, { label: "EUR", value: "EUR" }], defaultValue: "EGP" },
  { name: "issueDate", label: "Issue Date", type: "date", required: true, defaultValue: new Date().toISOString().slice(0, 10) },
  { name: "dueDate", label: "Due Date", type: "date", required: true },
  { name: "notes", label: "Notes", type: "textarea", fullWidth: true },
]

const PAYMENT_FIELDS = (bankAccounts: BankAccount[]): EntityField[] => [
  { name: "reference", label: "Reference", type: "text", required: true, placeholder: "PAY-2026-XXXX" },
  { name: "type", label: "Type", type: "select", required: true, options: [{ label: "Received", value: "RECEIVED" }, { label: "Sent", value: "SENT" }], defaultValue: "RECEIVED" },
  { name: "amount", label: "Amount", type: "number", required: true, min: 0, step: 0.01 },
  { name: "currency", label: "Currency", type: "select", required: true, options: [{ label: "EGP", value: "EGP" }, { label: "USD", value: "USD" }, { label: "EUR", value: "EUR" }], defaultValue: "EGP" },
  { name: "method", label: "Payment Method", type: "select", required: true, options: [{ label: "Bank Transfer", value: "BANK_TRANSFER" }, { label: "Cheque", value: "CHEQUE" }, { label: "Cash", value: "CASH" }, { label: "Credit Card", value: "CREDIT_CARD" }], defaultValue: "BANK_TRANSFER" },
  { name: "bankAccountId", label: "Bank Account", type: "select", options: bankAccounts.filter((a) => a.status === "ACTIVE").map((a) => ({ label: `${a.name} (${a.bankName})`, value: a.id })) },
  { name: "date", label: "Date", type: "date", required: true, defaultValue: new Date().toISOString().slice(0, 10) },
  { name: "notes", label: "Notes", type: "textarea", fullWidth: true },
]

const typeBadgeColor: Record<string, string> = {
  CURRENT: "bg-blue-100 text-blue-800",
  SAVINGS: "bg-green-100 text-green-800",
  FOREIGN_CURRENCY: "bg-purple-100 text-purple-800",
}

const methodLabel: Record<string, string> = {
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  CASH: "Cash",
  CREDIT_CARD: "Credit Card",
}

export default function BankingPage() {
  const store = useApiDataStore()
  const [activeTab, setActiveTab] = useState<ActiveTab>("accounts")

  const [showAccountModal, setShowAccountModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [showChequeModal, setShowChequeModal] = useState(false)
  const [editingCheque, setEditingCheque] = useState<Cheque | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [detailAccount, setDetailAccount] = useState<BankAccount | null>(null)
  const [chequeFilters, setChequeFilters] = useState<FilterState>({ _search: "", bankAccountId: "", type: "", status: "" })
  const [paymentFilters, setPaymentFilters] = useState<FilterState>({ _search: "", method: "", type: "" })

  const activeAccounts = useMemo(
    () => store.bankAccounts.filter((a: BankAccount) => a.status === "ACTIVE"),
    [store.bankAccounts],
  )

  const totalBalance = useMemo(
    () => activeAccounts.reduce((s: number, a: BankAccount) => s + a.balance, 0),
    [activeAccounts],
  )

  const pendingCheques = useMemo(
    () => store.cheques.filter((c: Cheque) => c.status === "PENDING").length,
    [store.cheques],
  )

  const paymentsThisMonth = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    return store.payments.filter((p: Payment) => {
      const d = new Date(p.date)
      return d.getFullYear() === y && d.getMonth() === m
    }).length
  }, [store.payments])

  const bankAccountName = useCallback(
    (id?: string) => {
      if (!id) return "—"
      const acc = store.bankAccounts.find((a: BankAccount) => a.id === id)
      return acc ? acc.name : id
    },
    [store.bankAccounts],
  )

  const handleAccountSubmit = useCallback(
    (data: EntityFormData) => {
      if (editingAccount) {
        store.update("bankAccounts", editingAccount.id, data as unknown as Partial<BankAccount>)
      } else {
        store.add("bankAccounts", {
          id: store.genId("bank"),
          ...data,
        } as unknown as BankAccount)
      }
      setEditingAccount(null)
    },
    [editingAccount, store],
  )

  const handleChequeSubmit = useCallback(
    (data: EntityFormData) => {
      if (editingCheque) {
        store.update("cheques", editingCheque.id, data as unknown as Partial<Cheque>)
      } else {
        store.add("cheques", {
          id: store.genId("chq"),
          status: "PENDING",
          ...data,
        } as unknown as Cheque)
      }
      setEditingCheque(null)
    },
    [editingCheque, store],
  )

  const handlePaymentSubmit = useCallback(
    (data: EntityFormData) => {
      store.add("payments", {
        id: store.genId("pay"),
        ...data,
      } as unknown as Payment)
    },
    [store],
  )

  const handleChequeStatusChange = useCallback(
    (cheque: Cheque, newStatus: "DEPOSITED" | "CLEARED" | "BOUNCED") => {
      store.update("cheques", cheque.id, { status: newStatus })
    },
    [store],
  )

  const filteredCheques = useMemo(() => {
    let result = store.cheques as Cheque[]
    const search = chequeFilters._search?.toLowerCase() || ""
    if (search) {
      result = result.filter(
        (c) =>
          c.number.toLowerCase().includes(search) ||
          c.partyName.toLowerCase().includes(search) ||
          c.bankName.toLowerCase().includes(search),
      )
    }
    if (chequeFilters.bankAccountId) result = result.filter((c) => c.bankAccountId === chequeFilters.bankAccountId)
    if (chequeFilters.type) result = result.filter((c) => c.type === chequeFilters.type)
    if (chequeFilters.status) result = result.filter((c) => c.status === chequeFilters.status)
    return result
  }, [store.cheques, chequeFilters])

  const filteredPayments = useMemo(() => {
    let result = store.payments as Payment[]
    const search = paymentFilters._search?.toLowerCase() || ""
    if (search) {
      result = result.filter(
        (p) =>
          p.reference.toLowerCase().includes(search) ||
          (p.notes && p.notes.toLowerCase().includes(search)),
      )
    }
    if (paymentFilters.method) result = result.filter((p) => p.method === paymentFilters.method)
    if (paymentFilters.type) result = result.filter((p) => p.type === paymentFilters.type)
    return result
  }, [store.payments, paymentFilters])

  const accountColumns: Column<BankAccount>[] = useMemo(
    () => [
      { key: "code", label: "Code", sortable: true, render: (_v: string) => <span className="font-mono text-xs">{_v}</span> },
      { key: "name", label: "Account Name", sortable: true, render: (_v: string) => <span className="font-medium">{_v}</span> },
      { key: "bankName", label: "Bank", sortable: true },
      { key: "accountNumber", label: "Account No.", render: (_v: string) => <span className="font-mono text-xs">{_v}</span> },
      { key: "iban", label: "IBAN", render: (_v: string) => _v ? <span className="font-mono text-xs">{_v.slice(0, 12)}...</span> : <span className="text-muted-foreground">—</span> },
      { key: "currency", label: "Currency", render: (_v: string) => <Badge variant="outline">{_v}</Badge> },
      { key: "balance", label: "Balance", sortable: true, render: (_v: number) => <span className="font-semibold tabular-nums">{egp(_v)}</span> },
      {
        key: "type",
        label: "Type",
        sortable: true,
        render: (_v: string) => (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeBadgeColor[_v] || "bg-gray-100 text-gray-800"}`}>
            {_v === "FOREIGN_CURRENCY" ? "Foreign" : _v === "CURRENT" ? "Current" : "Savings"}
          </span>
        ),
      },
      { key: "status", label: "Status", sortable: true, render: (_v: string) => <StatusBadge status={_v} /> },
      {
        key: "id",
        label: "",
        render: (_v: string, row: BankAccount) => (
          <EditDeleteMenu
            onView={() => setDetailAccount(row)}
            onEdit={() => {
              setEditingAccount(row)
              setShowAccountModal(true)
            }}
            onDelete={() => store.remove("bankAccounts", row.id)}
            itemLabel={row.name}
          />
        ),
      },
    ],
    [store],
  )

  const chequeColumns: Column<Cheque>[] = useMemo(
    () => [
      { key: "number", label: "Cheque No.", sortable: true, render: (_v: string) => <span className="font-mono text-xs font-medium">{_v}</span> },
      {
        key: "type",
        label: "Type",
        sortable: true,
        render: (_v: string) => (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${_v === "INCOMING" ? "text-green-700" : "text-red-700"}`}>
            {_v === "INCOMING" ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
            {_v}
          </span>
        ),
      },
      { key: "partyName", label: "Party", sortable: true },
      { key: "bankName", label: "Bank" },
      { key: "amount", label: "Amount", sortable: true, render: (_v: number, row: Cheque) => <span className="font-semibold tabular-nums">{egp(_v)}</span> },
      { key: "issueDate", label: "Issue Date", sortable: true, render: (_v: string) => fmtDate(_v) },
      { key: "dueDate", label: "Due Date", sortable: true, render: (_v: string) => fmtDate(_v) },
      { key: "status", label: "Status", sortable: true, render: (_v: string) => <StatusBadge status={_v} /> },
      {
        key: "id",
        label: "",
        render: (_v: string, row: Cheque) => {
          const extras: { label: string; onClick: () => void }[] = []
          if (row.status === "PENDING") {
            extras.push({ label: "Mark Deposited", onClick: () => handleChequeStatusChange(row, "DEPOSITED") })
            extras.push({ label: "Mark Bounced", onClick: () => handleChequeStatusChange(row, "BOUNCED") })
          }
          if (row.status === "DEPOSITED") {
            extras.push({ label: "Mark Cleared", onClick: () => handleChequeStatusChange(row, "CLEARED") })
          }
          return (
            <EditDeleteMenu
              onEdit={() => {
                setEditingCheque(row)
                setShowChequeModal(true)
              }}
              onDelete={() => store.remove("cheques", row.id)}
              itemLabel={`Cheque ${row.number}`}
              extraItems={extras}
            />
          )
        },
      },
    ],
    [store, handleChequeStatusChange],
  )

  const paymentColumns: Column<Payment>[] = useMemo(
    () => [
      { key: "reference", label: "Reference", sortable: true, render: (_v: string) => <span className="font-mono text-xs font-medium">{_v}</span> },
      {
        key: "type",
        label: "Type",
        sortable: true,
        render: (_v: string) => (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${_v === "RECEIVED" ? "text-green-700" : "text-red-700"}`}>
            {_v === "RECEIVED" ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
            {_v}
          </span>
        ),
      },
      { key: "amount", label: "Amount", sortable: true, render: (_v: number) => <span className="font-semibold tabular-nums">{egp(_v)}</span> },
      {
        key: "method",
        label: "Method",
        sortable: true,
        render: (_v: string) => (
          <Badge variant="outline" className="text-xs">
            {methodLabel[_v] || _v}
          </Badge>
        ),
      },
      {
        key: "bankAccountId",
        label: "Bank Account",
        render: (_v: string) => bankAccountName(_v),
      },
      { key: "date", label: "Date", sortable: true, render: (_v: string) => fmtDate(_v) },
      { key: "notes", label: "Notes", render: (_v: string) => _v ? <span className="text-xs text-muted-foreground max-w-[200px] truncate block">{_v}</span> : <span className="text-muted-foreground">—</span> },
    ],
    [bankAccountName],
  )

  const detailCheques = useMemo(() => {
    if (!detailAccount) return []
    return store.cheques.filter((c: Cheque) => c.bankAccountId === detailAccount.id)
  }, [detailAccount, store.cheques])

  const detailPayments = useMemo(() => {
    if (!detailAccount) return []
    return store.payments.filter((p: Payment) => p.bankAccountId === detailAccount.id)
  }, [detailAccount, store.payments])

  const detailTimeline = useMemo(() => {
    if (!detailAccount) return []
    const items: { date: string; label: string; amount: number; kind: "cheque" | "payment" }[] = []
    detailCheques.forEach((c: Cheque) => {
      items.push({ date: c.dueDate, label: `Cheque ${c.number} — ${c.partyName}`, amount: c.type === "INCOMING" ? c.amount : -c.amount, kind: "cheque" })
    })
    detailPayments.forEach((p: Payment) => {
      items.push({ date: p.date, label: `${p.reference} — ${methodLabel[p.method] || p.method}`, amount: p.type === "RECEIVED" ? p.amount : -p.amount, kind: "payment" })
    })
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return items
  }, [detailAccount, detailCheques, detailPayments])

  const reconciliationData = useMemo(() => {
    return store.bankAccounts.map((acc: BankAccount) => {
      const accCheques = store.cheques.filter((c: Cheque) => c.bankAccountId === acc.id)
      const accPayments = store.payments.filter((p: Payment) => p.bankAccountId === acc.id)
      const incoming =
        accCheques.filter((c: Cheque) => c.type === "INCOMING" && c.status === "CLEARED").reduce((s: number, c: Cheque) => s + c.amount, 0) +
        accPayments.filter((p: Payment) => p.type === "RECEIVED").reduce((s: number, p: Payment) => s + p.amount, 0)
      const outgoing =
        accCheques.filter((c: Cheque) => c.type === "OUTGOING" && c.status === "CLEARED").reduce((s: number, c: Cheque) => s + c.amount, 0) +
        accPayments.filter((p: Payment) => p.type === "SENT").reduce((s: number, p: Payment) => s + p.amount, 0)
      const expected = incoming - outgoing
      const actual = acc.balance
      const difference = actual - expected
      return { ...acc, incoming, outgoing, expected, actual, difference }
    })
  }, [store.bankAccounts, store.cheques, store.payments])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank Account Management"
        description="Manage bank accounts, cheques, payments, and reconciliation"
        icon={<Landmark className="h-6 w-6 text-primary" />}
        actions={
          <div className="flex gap-2">
            {activeTab === "accounts" && (
              <Button onClick={() => { setEditingAccount(null); setShowAccountModal(true) }}>
                <Plus className="mr-2 h-4 w-4" />
                New Account
              </Button>
            )}
            {activeTab === "cheques" && (
              <Button onClick={() => { setEditingCheque(null); setShowChequeModal(true) }}>
                <Plus className="mr-2 h-4 w-4" />
                New Cheque
              </Button>
            )}
            {activeTab === "payments" && (
              <Button onClick={() => setShowPaymentModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Payment
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={Banknote}
          title="Total Balance"
          value={egp(totalBalance)}
          subtitle="Across all active accounts"
          iconColor="bg-green-100 text-green-700"
        />
        <StatsCard
          icon={Building2}
          title="Active Accounts"
          value={activeAccounts.length}
          subtitle={`${store.bankAccounts.length} total`}
          iconColor="bg-blue-100 text-blue-700"
        />
        <StatsCard
          icon={Clock}
          title="Pending Cheques"
          value={pendingCheques}
          subtitle="Awaiting deposit or clearance"
          iconColor="bg-yellow-100 text-yellow-700"
        />
        <StatsCard
          icon={CreditCard}
          title="Payments This Month"
          value={paymentsThisMonth}
          subtitle={`${store.payments.length} total`}
          iconColor="bg-purple-100 text-purple-700"
        />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)}>
        <TabsList>
          <TabsTrigger value="accounts">
            <Building2 className="mr-1.5 h-4 w-4" />
            Bank Accounts
          </TabsTrigger>
          <TabsTrigger value="cheques">
            <Receipt className="mr-1.5 h-4 w-4" />
            Cheques
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="mr-1.5 h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="reconciliation">
            <Scale className="mr-1.5 h-4 w-4" />
            Reconciliation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-4">
          <DataTable
            columns={accountColumns}
            data={store.bankAccounts as BankAccount[]}
            searchable
            searchKeys={["code", "name", "bankName", "accountNumber", "iban"]}
            pagination
            onRowClick={(row) => setDetailAccount(row)}
            emptyMessage="No bank accounts found. Create one to get started."
          />
        </TabsContent>

        <TabsContent value="cheques" className="mt-4 space-y-4">
          <FilterBar
            searchPlaceholder="Search cheques..."
            searchValue={chequeFilters._search || ""}
            onSearchChange={(v) => setChequeFilters((prev) => ({ ...prev, _search: v }))}
            fields={[
              {
                key: "bankAccountId",
                label: "Bank Account",
                type: "select",
                options: store.bankAccounts.map((a: BankAccount) => ({ label: a.name, value: a.id })),
              },
              {
                key: "type",
                label: "Type",
                type: "select",
                options: [
                  { label: "Incoming", value: "INCOMING" },
                  { label: "Outgoing", value: "OUTGOING" },
                ],
              },
              {
                key: "status",
                label: "Status",
                type: "select",
                options: [
                  { label: "Pending", value: "PENDING" },
                  { label: "Deposited", value: "DEPOSITED" },
                  { label: "Cleared", value: "CLEARED" },
                  { label: "Bounced", value: "BOUNCED" },
                  { label: "Cancelled", value: "CANCELLED" },
                ],
              },
            ]}
            values={chequeFilters}
            onChange={(key, val) => setChequeFilters((prev) => ({ ...prev, [key]: val }))}
          />
          <DataTable
            columns={chequeColumns}
            data={filteredCheques}
            pagination
            emptyMessage="No cheques found."
          />
        </TabsContent>

        <TabsContent value="payments" className="mt-4 space-y-4">
          <FilterBar
            searchPlaceholder="Search payments..."
            searchValue={paymentFilters._search || ""}
            onSearchChange={(v) => setPaymentFilters((prev) => ({ ...prev, _search: v }))}
            fields={[
              {
                key: "type",
                label: "Type",
                type: "select",
                options: [
                  { label: "Received", value: "RECEIVED" },
                  { label: "Sent", value: "SENT" },
                ],
              },
              {
                key: "method",
                label: "Method",
                type: "select",
                options: [
                  { label: "Bank Transfer", value: "BANK_TRANSFER" },
                  { label: "Cheque", value: "CHEQUE" },
                  { label: "Cash", value: "CASH" },
                  { label: "Credit Card", value: "CREDIT_CARD" },
                ],
              },
            ]}
            values={paymentFilters}
            onChange={(key, val) => setPaymentFilters((prev) => ({ ...prev, [key]: val }))}
          />
          <DataTable
            columns={paymentColumns}
            data={filteredPayments}
            pagination
            emptyMessage="No payments found."
          />
        </TabsContent>

        <TabsContent value="reconciliation" className="mt-4 space-y-4">
          <div className="grid gap-4">
            {reconciliationData.map((acc) => (
              <Card key={acc.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-muted-foreground" />
                      {acc.name}
                      <Badge variant="outline" className="text-xs">{acc.bankName}</Badge>
                      <StatusBadge status={acc.status} />
                    </CardTitle>
                    <Badge variant="outline" className="font-mono">{acc.currency}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Total Incoming</p>
                      <p className="font-semibold text-green-700 tabular-nums">{egp(acc.incoming)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Total Outgoing</p>
                      <p className="font-semibold text-red-700 tabular-nums">{egp(acc.outgoing)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Expected Balance</p>
                      <p className="font-semibold tabular-nums">{egp(acc.expected)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Actual Balance</p>
                      <p className="font-semibold tabular-nums">{egp(acc.actual)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Difference</p>
                      <p className={`font-bold tabular-nums ${acc.difference === 0 ? "text-green-700" : Math.abs(acc.difference) < 1000 ? "text-yellow-700" : "text-red-700"}`}>
                        {egp(acc.difference)}
                      </p>
                    </div>
                  </div>
                  {acc.difference !== 0 && (
                    <div className="mt-3 rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-xs text-yellow-800">
                      Discrepancy detected. Expected balance differs from actual by {egp(Math.abs(acc.difference))}. Review pending cheques and unrecorded transactions.
                    </div>
                  )}
                  {acc.difference === 0 && (
                    <div className="mt-3 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-800">
                      Reconciled. Expected balance matches actual balance.
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {reconciliationData.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground text-sm">
                  No bank accounts to reconcile.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <EntityFormModal
        open={showAccountModal}
        onOpenChange={(open) => {
          setShowAccountModal(open)
          if (!open) setEditingAccount(null)
        }}
        title={editingAccount ? "Edit Bank Account" : "New Bank Account"}
        description={editingAccount ? "Update bank account details." : "Add a new bank account to the system."}
        fields={ACCOUNT_FIELDS}
        initialData={
          editingAccount
            ? {
                code: editingAccount.code,
                name: editingAccount.name,
                bankName: editingAccount.bankName,
                accountNumber: editingAccount.accountNumber,
                iban: editingAccount.iban || "",
                currency: editingAccount.currency,
                balance: editingAccount.balance,
                type: editingAccount.type,
                status: editingAccount.status,
                openedAt: editingAccount.openedAt,
              }
            : undefined
        }
        onSubmit={handleAccountSubmit}
        submitLabel={editingAccount ? "Update" : "Create"}
      />

      <EntityFormModal
        open={showChequeModal}
        onOpenChange={(open) => {
          setShowChequeModal(open)
          if (!open) setEditingCheque(null)
        }}
        title={editingCheque ? "Edit Cheque" : "New Cheque"}
        description={editingCheque ? "Update cheque details." : "Record a new cheque."}
        fields={CHEQUE_FIELDS(store.bankAccounts as BankAccount[])}
        initialData={
          editingCheque
            ? {
                number: editingCheque.number,
                bankAccountId: editingCheque.bankAccountId || "",
                bankName: editingCheque.bankName,
                type: editingCheque.type,
                partyName: editingCheque.partyName,
                amount: editingCheque.amount,
                currency: editingCheque.currency,
                issueDate: editingCheque.issueDate,
                dueDate: editingCheque.dueDate,
                notes: editingCheque.notes || "",
              }
            : undefined
        }
        onSubmit={handleChequeSubmit}
        submitLabel={editingCheque ? "Update" : "Create"}
      />

      <EntityFormModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        title="New Payment"
        description="Record a new payment transaction."
        fields={PAYMENT_FIELDS(store.bankAccounts as BankAccount[])}
        onSubmit={handlePaymentSubmit}
        submitLabel="Create"
      />

      <Dialog open={!!detailAccount} onOpenChange={(open) => { if (!open) setDetailAccount(null) }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {detailAccount && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {detailAccount.name}
                  <Badge variant="outline" className="text-[10px]">{detailAccount.code}</Badge>
                  <StatusBadge status={detailAccount.status} />
                </DialogTitle>
                <DialogDescription>
                  {detailAccount.bankName} &mdash; {detailAccount.accountNumber}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Account Type</p>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeBadgeColor[detailAccount.type] || "bg-gray-100 text-gray-800"}`}>
                    {detailAccount.type === "FOREIGN_CURRENCY" ? "Foreign Currency" : detailAccount.type === "CURRENT" ? "Current" : "Savings"}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Currency</p>
                  <p className="font-medium">{detailAccount.currency}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Balance</p>
                  <p className="font-bold text-lg tabular-nums">{egp(detailAccount.balance)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Opened</p>
                  <p className="font-medium">{fmtDate(detailAccount.openedAt)}</p>
                </div>
              </div>

              {detailAccount.iban && (
                <div className="pb-2">
                  <p className="text-xs text-muted-foreground mb-0.5">IBAN</p>
                  <p className="font-mono text-sm">{detailAccount.iban}</p>
                </div>
              )}

              <Separator />

              <Tabs defaultValue="cheques" className="mt-4">
                <TabsList>
                  <TabsTrigger value="cheques">Cheques ({detailCheques.length})</TabsTrigger>
                  <TabsTrigger value="payments">Payments ({detailPayments.length})</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                </TabsList>

                <TabsContent value="cheques" className="mt-3">
                  {detailCheques.length > 0 ? (
                    <div className="space-y-2">
                      {detailCheques.map((c: Cheque) => (
                        <div key={c.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-semibold ${c.type === "INCOMING" ? "text-green-700" : "text-red-700"}`}>
                              {c.type === "INCOMING" ? <ArrowDownLeft className="h-3.5 w-3.5 inline mr-1" /> : <ArrowUpRight className="h-3.5 w-3.5 inline mr-1" />}
                              {c.number}
                            </span>
                            <span className="text-muted-foreground">{c.partyName}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold tabular-nums">{egp(c.amount)}</span>
                            <StatusBadge status={c.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground py-8">No cheques linked to this account.</p>
                  )}
                </TabsContent>

                <TabsContent value="payments" className="mt-3">
                  {detailPayments.length > 0 ? (
                    <div className="space-y-2">
                      {detailPayments.map((p: Payment) => (
                        <div key={p.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-semibold ${p.type === "RECEIVED" ? "text-green-700" : "text-red-700"}`}>
                              {p.type === "RECEIVED" ? <ArrowDownLeft className="h-3.5 w-3.5 inline mr-1" /> : <ArrowUpRight className="h-3.5 w-3.5 inline mr-1" />}
                              {p.reference}
                            </span>
                            <Badge variant="outline" className="text-xs">{methodLabel[p.method] || p.method}</Badge>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold tabular-nums">{egp(p.amount)}</span>
                            <span className="text-xs text-muted-foreground">{fmtDate(p.date)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground py-8">No payments linked to this account.</p>
                  )}
                </TabsContent>

                <TabsContent value="timeline" className="mt-3">
                  {detailTimeline.length > 0 ? (
                    <div className="relative ml-4 border-l-2 border-muted pl-6 space-y-4 py-2">
                      {detailTimeline.map((item, idx) => (
                        <div key={idx} className="relative">
                          <div className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-background ${item.amount >= 0 ? "bg-green-500" : "bg-red-500"}`} />
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium">{item.label}</p>
                              <p className="text-xs text-muted-foreground">{fmtDate(item.date)} &middot; {item.kind === "cheque" ? "Cheque" : "Payment"}</p>
                            </div>
                            <span className={`text-sm font-semibold tabular-nums ${item.amount >= 0 ? "text-green-700" : "text-red-700"}`}>
                              {item.amount >= 0 ? "+" : ""}{egp(Math.abs(item.amount))}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground py-8">No transactions for this account yet.</p>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
