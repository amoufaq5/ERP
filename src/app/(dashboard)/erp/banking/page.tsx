"use client"

import { useState, useEffect } from "react"
import {
  Landmark, CreditCard, ArrowUpDown, Wallet, RefreshCw, Plus,
  CheckCircle, XCircle, Link2, Unlink, Download, QrCode,
  ArrowDownLeft, ArrowUpRight, FileSpreadsheet, Eye,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import DataTable from "@/components/shared/data-table"
import type { Column } from "@/components/shared/data-table"
import PageHeader from "@/components/shared/page-header"
import { useTranslation } from "@/lib/i18n/i18n-context"

interface BankAccount {
  id: string; bankName: string; accountNumber: string; iban: string; currency: string; balance: number; lastSynced: string; isActive: boolean
}

interface BankTransaction {
  id: string; accountId: string; date: string; description: string; reference: string; amount: number; type: "credit" | "debit"; balance: number; matchStatus: "unmatched" | "matched" | "partial" | "excluded"; matchedRef?: string
}

interface ReconSession {
  id: string; accountId: string; periodStart: string; periodEnd: string; bankBalance: number; bookBalance: number; difference: number; status: "in_progress" | "completed" | "discrepancy"; matchedCount: number; unmatchedCount: number
}

const sampleAccounts: BankAccount[] = [
  { id: "1", bankName: "National Bank of Egypt", accountNumber: "1234-5678-9012", iban: "EG380019000500000000263180002", currency: "EGP", balance: 2450000, lastSynced: "2024-03-25", isActive: true },
  { id: "2", bankName: "CIB Egypt", accountNumber: "9876-5432-1098", iban: "EG210037000400000000123456789", currency: "EGP", balance: 875000, lastSynced: "2024-03-24", isActive: true },
  { id: "3", bankName: "Banque Misr", accountNumber: "5555-1234-9876", iban: "EG300002000300000000789012345", currency: "USD", balance: 125000, lastSynced: "2024-03-20", isActive: false },
]

const sampleTransactions: BankTransaction[] = [
  { id: "t1", accountId: "1", date: "2024-03-25", description: "Payment from Acme Pharma", reference: "TRF-001", amount: 51300, type: "credit", balance: 2450000, matchStatus: "matched", matchedRef: "INV-2024-089" },
  { id: "t2", accountId: "1", date: "2024-03-24", description: "Supplier payment - MedSupply Co", reference: "TRF-002", amount: 35000, type: "debit", balance: 2398700, matchStatus: "matched", matchedRef: "PO-2024-045" },
  { id: "t3", accountId: "1", date: "2024-03-23", description: "Salary payment March", reference: "SAL-MAR", amount: 180000, type: "debit", balance: 2433700, matchStatus: "matched", matchedRef: "PAY-2024-03" },
  { id: "t4", accountId: "1", date: "2024-03-22", description: "Payment received - Delta Medical", reference: "TRF-003", amount: 22800, type: "credit", balance: 2613700, matchStatus: "unmatched" },
  { id: "t5", accountId: "1", date: "2024-03-21", description: "Bank charges", reference: "CHG-001", amount: 500, type: "debit", balance: 2590900, matchStatus: "excluded" },
  { id: "t6", accountId: "2", date: "2024-03-25", description: "Customer payment - Nile Health", reference: "TRF-004", amount: 15000, type: "credit", balance: 875000, matchStatus: "unmatched" },
  { id: "t7", accountId: "2", date: "2024-03-24", description: "Office rent payment", reference: "RENT-03", amount: 45000, type: "debit", balance: 860000, matchStatus: "matched", matchedRef: "JE-2024-088" },
  { id: "t8", accountId: "1", date: "2024-03-20", description: "Insurance premium", reference: "INS-Q1", amount: 12000, type: "debit", balance: 2591400, matchStatus: "partial" },
]

const sampleRecon: ReconSession[] = [
  { id: "r1", accountId: "1", periodStart: "2024-03-01", periodEnd: "2024-03-31", bankBalance: 2450000, bookBalance: 2448500, difference: 1500, status: "discrepancy", matchedCount: 45, unmatchedCount: 3 },
  { id: "r2", accountId: "2", periodStart: "2024-02-01", periodEnd: "2024-02-29", bankBalance: 905000, bookBalance: 905000, difference: 0, status: "completed", matchedCount: 32, unmatchedCount: 0 },
]

const matchColors: Record<string, string> = { matched: "bg-green-100 text-green-800", unmatched: "bg-red-100 text-red-800", partial: "bg-yellow-100 text-yellow-800", excluded: "bg-gray-100 text-gray-600" }

export default function BankingPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<"accounts" | "transactions" | "reconciliation" | "payment">("accounts")
  const [accounts, setAccounts] = useState(sampleAccounts)
  const [transactions] = useState(sampleTransactions)
  const [recons] = useState(sampleRecon)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [newAccount, setNewAccount] = useState({ bankName: "", accountNumber: "", iban: "", currency: "EGP" })
  const [filterAccount, setFilterAccount] = useState("")
  const [filterMatch, setFilterMatch] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("")

  const totalBalance = accounts.filter(a => a.isActive).reduce((s, a) => s + a.balance, 0)
  const unreconciled = transactions.filter(tx => tx.matchStatus === "unmatched").length

  const filteredTx = transactions.filter(tx => {
    if (filterAccount && tx.accountId !== filterAccount) return false
    if (filterMatch && tx.matchStatus !== filterMatch) return false
    return true
  })

  function addAccount() {
    if (!newAccount.bankName || !newAccount.accountNumber) return
    setAccounts(prev => [...prev, { id: Date.now().toString(36), ...newAccount, balance: 0, lastSynced: "Never", isActive: true }])
    setNewAccount({ bankName: "", accountNumber: "", iban: "", currency: "EGP" })
    setShowAddAccount(false)
  }

  const txColumns: Column<Record<string, unknown>>[] = [
    { key: "date", label: "Date" },
    { key: "description", label: "Description", render: (v) => <span className="font-medium text-sm">{String(v)}</span> },
    { key: "reference", label: "Reference", render: (v) => <span className="font-mono text-xs">{String(v)}</span> },
    { key: "type", label: "Type", render: (v) => (
      <span className={`flex items-center gap-1 text-xs ${String(v) === "credit" ? "text-green-700" : "text-red-700"}`}>
        {String(v) === "credit" ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}{String(v)}
      </span>
    )},
    { key: "amount", label: "Amount (EGP)", render: (v, row) => (
      <span className={`font-medium ${String((row as BankTransaction).type) === "credit" ? "text-green-700" : "text-red-700"}`}>
        {String((row as BankTransaction).type) === "credit" ? "+" : "-"}{Number(v).toLocaleString()}
      </span>
    )},
    { key: "matchStatus", label: "Match", render: (v, row) => (
      <div>
        <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${matchColors[String(v)] || ""}`}>{String(v)}</span>
        {(row as BankTransaction).matchedRef && <span className="block text-[10px] text-muted-foreground mt-0.5">{(row as BankTransaction).matchedRef}</span>}
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Banking & Reconciliation" description="Bank account management, transaction matching, and reconciliation" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><Landmark className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Total Balance</p><p className="text-2xl font-bold">EGP {totalBalance.toLocaleString()}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-red-100 rounded-lg"><Unlink className="h-5 w-5 text-red-600" /></div><div><p className="text-sm text-muted-foreground">Unreconciled</p><p className="text-2xl font-bold">{unreconciled}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><Link2 className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-muted-foreground">Matched</p><p className="text-2xl font-bold">{transactions.filter(tx => tx.matchStatus === "matched").length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><CreditCard className="h-5 w-5 text-purple-600" /></div><div><p className="text-sm text-muted-foreground">Active Accounts</p><p className="text-2xl font-bold">{accounts.filter(a => a.isActive).length}</p></div></div></CardContent></Card>
      </div>

      <div className="flex gap-2 border-b pb-2">
        <Button variant={activeTab === "accounts" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("accounts")}><Landmark className="h-4 w-4 mr-2" />Accounts</Button>
        <Button variant={activeTab === "transactions" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("transactions")}><ArrowUpDown className="h-4 w-4 mr-2" />Transactions</Button>
        <Button variant={activeTab === "reconciliation" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("reconciliation")}><CheckCircle className="h-4 w-4 mr-2" />Reconciliation</Button>
        <Button variant={activeTab === "payment" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("payment")}><Wallet className="h-4 w-4 mr-2" />Payment Gateway</Button>
      </div>

      {activeTab === "accounts" && (
        <div className="space-y-4">
          <div className="flex justify-end"><Button size="sm" onClick={() => setShowAddAccount(true)}><Plus className="h-4 w-4 mr-2" />Add Account</Button></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {accounts.map(acc => (
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

      {activeTab === "transactions" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Bank Transactions</CardTitle>
              <div className="flex gap-2">
                <select className="rounded-md border px-2 py-1 text-xs" value={filterAccount} onChange={e => setFilterAccount(e.target.value)}>
                  <option value="">All Accounts</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.bankName}</option>)}
                </select>
                <select className="rounded-md border px-2 py-1 text-xs" value={filterMatch} onChange={e => setFilterMatch(e.target.value)}>
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
            <DataTable columns={txColumns} data={filteredTx as unknown as Record<string, unknown>[]} exportable exportFilename="bank-transactions" emptyMessage="No transactions." />
          </CardContent>
        </Card>
      )}

      {activeTab === "reconciliation" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Reconciliation Sessions</CardTitle></CardHeader>
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
                  {recons.map(r => {
                    const acc = accounts.find(a => a.id === r.accountId)
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
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Auto-Match Engine</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">The auto-match engine compares bank transactions against invoices, payments, and journal entries by amount and reference number.</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted p-3 rounded-lg text-center"><p className="text-2xl font-bold text-green-600">{transactions.filter(tx => tx.matchStatus === "matched").length}</p><p className="text-xs text-muted-foreground">Auto-Matched</p></div>
                <div className="bg-muted p-3 rounded-lg text-center"><p className="text-2xl font-bold text-yellow-600">{transactions.filter(tx => tx.matchStatus === "partial").length}</p><p className="text-xs text-muted-foreground">Partial Match</p></div>
                <div className="bg-muted p-3 rounded-lg text-center"><p className="text-2xl font-bold text-red-600">{transactions.filter(tx => tx.matchStatus === "unmatched").length}</p><p className="text-xs text-muted-foreground">Unmatched</p></div>
              </div>
              <Button size="sm"><RefreshCw className="h-4 w-4 mr-2" />Run Auto-Match</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "payment" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Generate Payment Link</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Amount (EGP)</Label><Input type="number" placeholder="0.00" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="mt-1" /></div>
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
                  {paymentAmount ? `EGP ${Number(paymentAmount).toLocaleString()}` : "Enter amount to generate QR"}
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

      <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Bank Account</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Bank Name</Label><Input value={newAccount.bankName} onChange={e => setNewAccount(p => ({ ...p, bankName: e.target.value }))} className="mt-1" /></div>
            <div><Label>Account Number</Label><Input value={newAccount.accountNumber} onChange={e => setNewAccount(p => ({ ...p, accountNumber: e.target.value }))} className="mt-1" /></div>
            <div><Label>IBAN</Label><Input value={newAccount.iban} onChange={e => setNewAccount(p => ({ ...p, iban: e.target.value }))} className="mt-1" /></div>
            <div><Label>Currency</Label>
              <select className="w-full rounded-md border px-3 py-2 text-sm mt-1" value={newAccount.currency} onChange={e => setNewAccount(p => ({ ...p, currency: e.target.value }))}>
                <option value="EGP">EGP</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="SAR">SAR</option>
              </select>
            </div>
            <Button className="w-full" onClick={addAccount}>Add Account</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
