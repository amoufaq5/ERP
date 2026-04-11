"use client";

import { useState } from "react";
import { Banknote, Clock, CreditCard, TrendingUp, Plus, AlertTriangle, CheckCircle2, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import StatusBadge from "@/components/shared/status-badge";
import { FormModal, type FormField } from "@/components/ui/form-modal";

const OUTSTANDING = [
  { id: "INV-2401", customer: "Al-Shifa Pharmacy", type: "Pharmacy", amount: "$12,500", paid: "$5,000", balance: "$7,500", issued: "2026-02-15", due: "2026-04-15", daysOut: 0, status: "Current" },
  { id: "INV-2380", customer: "National Hospital", type: "Hospital", amount: "$45,800", paid: "$20,000", balance: "$25,800", issued: "2026-01-28", due: "2026-03-28", daysOut: 13, status: "Overdue" },
  { id: "INV-2410", customer: "MedPlus Distributors", type: "Distributor", amount: "$78,000", paid: "$78,000", balance: "$0", issued: "2026-02-20", due: "2026-04-20", daysOut: 0, status: "Paid" },
  { id: "INV-2395", customer: "Cairo Medical Supply", type: "Distributor", amount: "$34,200", paid: "$10,000", balance: "$24,200", issued: "2026-02-05", due: "2026-04-05", daysOut: 5, status: "Overdue" },
  { id: "INV-2370", customer: "Alexandria Pharmacy Chain", type: "Pharmacy", amount: "$18,900", paid: "$0", balance: "$18,900", issued: "2026-01-15", due: "2026-03-15", daysOut: 26, status: "Overdue" },
  { id: "INV-2415", customer: "Delta Pharma", type: "Distributor", amount: "$92,400", paid: "$50,000", balance: "$42,400", issued: "2026-02-25", due: "2026-04-25", daysOut: 0, status: "Current" },
  { id: "INV-2420", customer: "Giza Hospital", type: "Hospital", amount: "$28,600", paid: "$28,600", balance: "$0", issued: "2026-03-01", due: "2026-05-01", daysOut: 0, status: "Paid" },
  { id: "INV-2425", customer: "Family Pharmacy Group", type: "Pharmacy", amount: "$15,300", paid: "$0", balance: "$15,300", issued: "2026-01-05", due: "2026-03-05", daysOut: 36, status: "Overdue" },
  { id: "INV-2430", customer: "Mansoura Pharma", type: "Pharmacy", amount: "$8,750", paid: "$8,750", balance: "$0", issued: "2026-03-05", due: "2026-05-05", daysOut: 0, status: "Paid" },
  { id: "INV-2435", customer: "Tanta Medical Supply", type: "Distributor", amount: "$56,000", paid: "$30,000", balance: "$26,000", issued: "2026-02-10", due: "2026-04-10", daysOut: 0, status: "Current" },
  { id: "INV-2440", customer: "Suez Hospital", type: "Hospital", amount: "$22,100", paid: "$0", balance: "$22,100", issued: "2025-12-20", due: "2026-02-20", daysOut: 49, status: "Overdue" },
  { id: "INV-2445", customer: "Zagazig Pharmacy", type: "Pharmacy", amount: "$6,400", paid: "$3,200", balance: "$3,200", issued: "2026-03-10", due: "2026-05-10", daysOut: 0, status: "Current" },
];

const PAYMENTS = [
  { id: "PAY-3001", invoice: "INV-2401", customer: "Al-Shifa Pharmacy", amount: "$5,000", method: "Cash", reference: "RCV-20260401", collector: "Ahmed Hassan", date: "2026-04-01", verified: true },
  { id: "PAY-3002", invoice: "INV-2380", customer: "National Hospital", amount: "$20,000", method: "Bank Transfer", reference: "TRF-98764523", collector: "System", date: "2026-03-25", verified: true },
  { id: "PAY-3003", invoice: "INV-2410", customer: "MedPlus Distributors", amount: "$40,000", method: "Cheque", reference: "CHQ-7821450", collector: "Mahmoud Ali", date: "2026-03-20", verified: true },
  { id: "PAY-3004", invoice: "INV-2410", customer: "MedPlus Distributors", amount: "$38,000", method: "Bank Transfer", reference: "TRF-98764890", collector: "System", date: "2026-03-28", verified: true },
  { id: "PAY-3005", invoice: "INV-2395", customer: "Cairo Medical Supply", amount: "$10,000", method: "Cash", reference: "RCV-20260315", collector: "Ahmed Hassan", date: "2026-03-15", verified: true },
  { id: "PAY-3006", invoice: "INV-2415", customer: "Delta Pharma", amount: "$50,000", method: "Cheque", reference: "CHQ-4590123", collector: "Karim Saeed", date: "2026-03-30", verified: false },
  { id: "PAY-3007", invoice: "INV-2420", customer: "Giza Hospital", amount: "$28,600", method: "Bank Transfer", reference: "TRF-98765100", collector: "System", date: "2026-04-02", verified: true },
  { id: "PAY-3008", invoice: "INV-2430", customer: "Mansoura Pharma", amount: "$8,750", method: "Cash", reference: "RCV-20260405", collector: "Mahmoud Ali", date: "2026-04-05", verified: true },
  { id: "PAY-3009", invoice: "INV-2435", customer: "Tanta Medical Supply", amount: "$30,000", method: "Cheque", reference: "CHQ-3345612", collector: "Karim Saeed", date: "2026-04-03", verified: true },
  { id: "PAY-3010", invoice: "INV-2440", customer: "Suez Hospital", amount: "$0", method: "Pending", reference: "—", collector: "—", date: "—", verified: false },
];

const CHEQUES = [
  { id: "CHQ-7821450", invoice: "INV-2410", customer: "MedPlus Distributors", bank: "National Bank of Egypt", amount: "$40,000", issueDate: "2026-03-20", maturityDate: "2026-04-20", deposited: "2026-03-22", status: "Cleared" },
  { id: "CHQ-4590123", invoice: "INV-2415", customer: "Delta Pharma", bank: "CIB", amount: "$50,000", issueDate: "2026-03-30", maturityDate: "2026-05-15", deposited: "—", status: "Post-Dated" },
  { id: "CHQ-3345612", invoice: "INV-2435", customer: "Tanta Medical Supply", bank: "Banque Misr", amount: "$30,000", issueDate: "2026-04-03", maturityDate: "2026-04-25", deposited: "2026-04-05", status: "Deposited" },
  { id: "CHQ-8812345", invoice: "INV-2370", customer: "Alexandria Pharmacy Chain", bank: "QNB", amount: "$10,000", issueDate: "2026-02-15", maturityDate: "2026-03-15", deposited: "2026-03-16", status: "Bounced" },
  { id: "CHQ-5567890", invoice: "INV-2425", customer: "Family Pharmacy Group", bank: "HSBC Egypt", amount: "$8,000", issueDate: "2026-02-28", maturityDate: "2026-04-30", deposited: "—", status: "Post-Dated" },
  { id: "CHQ-9901234", invoice: "INV-2380", customer: "National Hospital", bank: "NBE", amount: "$15,000", issueDate: "2026-01-15", maturityDate: "2026-03-01", deposited: "2026-03-02", status: "Cleared" },
  { id: "CHQ-2234567", invoice: "INV-2440", customer: "Suez Hospital", bank: "Banque du Caire", amount: "$12,000", issueDate: "2026-01-20", maturityDate: "2026-02-28", deposited: "2026-03-01", status: "Bounced" },
];

const AGING = [
  { customer: "Al-Shifa Pharmacy", type: "Pharmacy", current: "$7,500", days30: "$0", days60: "$0", days90: "$0", over90: "$0", total: "$7,500" },
  { customer: "National Hospital", type: "Hospital", current: "$0", days30: "$25,800", days60: "$0", days90: "$0", over90: "$0", total: "$25,800" },
  { customer: "Cairo Medical Supply", type: "Distributor", current: "$0", days30: "$24,200", days60: "$0", days90: "$0", over90: "$0", total: "$24,200" },
  { customer: "Alexandria Pharmacy Chain", type: "Pharmacy", current: "$0", days30: "$18,900", days60: "$0", days90: "$0", over90: "$0", total: "$18,900" },
  { customer: "Delta Pharma", type: "Distributor", current: "$42,400", days30: "$0", days60: "$0", days90: "$0", over90: "$0", total: "$42,400" },
  { customer: "Family Pharmacy Group", type: "Pharmacy", current: "$0", days30: "$0", days60: "$15,300", days90: "$0", over90: "$0", total: "$15,300" },
  { customer: "Tanta Medical Supply", type: "Distributor", current: "$26,000", days30: "$0", days60: "$0", days90: "$0", over90: "$0", total: "$26,000" },
  { customer: "Suez Hospital", type: "Hospital", current: "$0", days30: "$0", days60: "$22,100", days90: "$0", over90: "$0", total: "$22,100" },
  { customer: "Zagazig Pharmacy", type: "Pharmacy", current: "$3,200", days30: "$0", days60: "$0", days90: "$0", over90: "$0", total: "$3,200" },
];

const ROUTES = [
  { id: "RT-01", name: "Cairo North Route", collector: "Ahmed Hassan", customers: 8, totalDue: "$45,700", scheduledDate: "2026-04-12", status: "Scheduled", stops: ["Al-Shifa Pharmacy", "Cairo Medical Supply", "Family Pharmacy Group", "Zagazig Pharmacy"] },
  { id: "RT-02", name: "Delta Region Route", collector: "Mahmoud Ali", customers: 6, totalDue: "$68,400", scheduledDate: "2026-04-13", status: "Scheduled", stops: ["Delta Pharma", "Tanta Medical Supply", "Mansoura Pharma"] },
  { id: "RT-03", name: "Alexandria Route", collector: "Karim Saeed", customers: 5, totalDue: "$18,900", scheduledDate: "2026-04-14", status: "Planned", stops: ["Alexandria Pharmacy Chain", "Alex Medical Hub"] },
  { id: "RT-04", name: "Hospital Collections", collector: "Ahmed Hassan", customers: 4, totalDue: "$47,900", scheduledDate: "2026-04-15", status: "Planned", stops: ["National Hospital", "Giza Hospital", "Suez Hospital"] },
  { id: "RT-05", name: "Upper Egypt Route", collector: "Mahmoud Ali", customers: 7, totalDue: "$32,600", scheduledDate: "2026-04-18", status: "Planned", stops: ["Assiut Pharmacy", "Luxor Medical", "Aswan Health"] },
];

const paymentFields: FormField[] = [
  { name: "invoice", label: "Invoice", type: "select", required: true, options: OUTSTANDING.filter(o => o.status !== "Paid").map(o => ({ value: o.id, label: `${o.id} - ${o.customer}` })) },
  { name: "amount", label: "Amount ($)", type: "number", required: true },
  { name: "method", label: "Payment Method", type: "select", required: true, options: [{ value: "Cash", label: "Cash" }, { value: "Cheque", label: "Cheque" }, { value: "Bank Transfer", label: "Bank Transfer" }] },
  { name: "reference", label: "Reference Number", type: "text", required: true },
  { name: "collector", label: "Collector", type: "select", required: true, options: [{ value: "Ahmed Hassan", label: "Ahmed Hassan" }, { value: "Mahmoud Ali", label: "Mahmoud Ali" }, { value: "Karim Saeed", label: "Karim Saeed" }] },
  { name: "date", label: "Date", type: "date", required: true },
  { name: "notes", label: "Notes", type: "textarea" },
];

const routeFields: FormField[] = [
  { name: "name", label: "Route Name", type: "text", required: true },
  { name: "collector", label: "Collector", type: "select", required: true, options: [{ value: "Ahmed Hassan", label: "Ahmed Hassan" }, { value: "Mahmoud Ali", label: "Mahmoud Ali" }, { value: "Karim Saeed", label: "Karim Saeed" }] },
  { name: "scheduledDate", label: "Scheduled Date", type: "date", required: true },
  { name: "notes", label: "Notes", type: "textarea" },
];

export default function CollectionsPage() {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [activeTab, setActiveTab] = useState("outstanding");

  const totalOutstanding = 185400;
  const totalOverdue = 82000;
  const collectedThisMonth = 231350;
  const bouncedCheques = 22000;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Collections"
        description="Track outstanding invoices, payments, cheque management, and collection routes"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowRouteModal(true)}>
              <MapPin className="h-4 w-4 mr-2" /> Plan Route
            </Button>
            <Button onClick={() => setShowPaymentModal(true)}>
              <Plus className="h-4 w-4 mr-2" /> Record Payment
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Banknote} title="Total Outstanding" value={`$${totalOutstanding.toLocaleString()}`} subtitle="Across 9 customers" iconColor="text-blue-600" />
        <StatsCard icon={AlertTriangle} title="Overdue Amount" value={`$${totalOverdue.toLocaleString()}`} subtitle="5 overdue invoices" iconColor="text-red-600" trend={{ value: 12, label: "vs last month" }} />
        <StatsCard icon={TrendingUp} title="Collected This Month" value={`$${collectedThisMonth.toLocaleString()}`} subtitle="10 payments received" iconColor="text-green-600" trend={{ value: 8, label: "vs last month" }} />
        <StatsCard icon={CreditCard} title="Bounced Cheques" value={`$${bouncedCheques.toLocaleString()}`} subtitle="2 cheques bounced" iconColor="text-amber-600" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="outstanding">Outstanding Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="cheques">Cheque Management</TabsTrigger>
          <TabsTrigger value="aging">Aging Report</TabsTrigger>
          <TabsTrigger value="routes">Collection Routes</TabsTrigger>
        </TabsList>

        <TabsContent value="outstanding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Outstanding Invoices</CardTitle>
              <CardDescription>All invoices with pending balances from pharmacies, hospitals, and distributors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium">Invoice</th>
                      <th className="pb-3 font-medium">Customer</th>
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 font-medium">Amount</th>
                      <th className="pb-3 font-medium">Paid</th>
                      <th className="pb-3 font-medium">Balance</th>
                      <th className="pb-3 font-medium">Due Date</th>
                      <th className="pb-3 font-medium">Days Overdue</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {OUTSTANDING.map((inv) => (
                      <tr key={inv.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 font-mono text-xs">{inv.id}</td>
                        <td className="py-3 font-medium">{inv.customer}</td>
                        <td className="py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            inv.type === "Pharmacy" ? "bg-blue-100 text-blue-700" :
                            inv.type === "Hospital" ? "bg-purple-100 text-purple-700" :
                            "bg-orange-100 text-orange-700"
                          }`}>{inv.type}</span>
                        </td>
                        <td className="py-3">{inv.amount}</td>
                        <td className="py-3 text-green-600">{inv.paid}</td>
                        <td className="py-3 font-semibold">{inv.balance}</td>
                        <td className="py-3">{inv.due}</td>
                        <td className="py-3">
                          {inv.daysOut > 0 ? (
                            <span className="text-red-600 font-medium">{inv.daysOut} days</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3"><StatusBadge status={inv.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Records</CardTitle>
              <CardDescription>All collected payments — cash, cheque, and bank transfers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium">Payment ID</th>
                      <th className="pb-3 font-medium">Invoice</th>
                      <th className="pb-3 font-medium">Customer</th>
                      <th className="pb-3 font-medium">Amount</th>
                      <th className="pb-3 font-medium">Method</th>
                      <th className="pb-3 font-medium">Reference</th>
                      <th className="pb-3 font-medium">Collector</th>
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Verified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PAYMENTS.filter(p => p.method !== "Pending").map((pay) => (
                      <tr key={pay.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 font-mono text-xs">{pay.id}</td>
                        <td className="py-3 font-mono text-xs">{pay.invoice}</td>
                        <td className="py-3 font-medium">{pay.customer}</td>
                        <td className="py-3 font-semibold text-green-600">{pay.amount}</td>
                        <td className="py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            pay.method === "Cash" ? "bg-green-100 text-green-700" :
                            pay.method === "Cheque" ? "bg-blue-100 text-blue-700" :
                            "bg-purple-100 text-purple-700"
                          }`}>{pay.method}</span>
                        </td>
                        <td className="py-3 font-mono text-xs">{pay.reference}</td>
                        <td className="py-3">{pay.collector}</td>
                        <td className="py-3">{pay.date}</td>
                        <td className="py-3">
                          {pay.verified ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-500" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Cash Collections</div>
                    <div className="text-2xl font-bold text-green-600">$23,750</div>
                    <div className="text-xs text-muted-foreground mt-1">3 payments</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Cheque Collections</div>
                    <div className="text-2xl font-bold text-blue-600">$120,000</div>
                    <div className="text-xs text-muted-foreground mt-1">3 cheques received</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Bank Transfers</div>
                    <div className="text-2xl font-bold text-purple-600">$86,600</div>
                    <div className="text-xs text-muted-foreground mt-1">3 transfers</div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cheques" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cheque Management</CardTitle>
              <CardDescription>Track post-dated cheques, deposited cheques, and bounced cheques</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-sm text-muted-foreground">Post-Dated</div>
                    <div className="text-2xl font-bold text-amber-600">2</div>
                    <div className="text-xs text-muted-foreground">$58,000</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-sm text-muted-foreground">Deposited</div>
                    <div className="text-2xl font-bold text-blue-600">1</div>
                    <div className="text-xs text-muted-foreground">$30,000</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-sm text-muted-foreground">Cleared</div>
                    <div className="text-2xl font-bold text-green-600">2</div>
                    <div className="text-xs text-muted-foreground">$55,000</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-sm text-muted-foreground">Bounced</div>
                    <div className="text-2xl font-bold text-red-600">2</div>
                    <div className="text-xs text-muted-foreground">$22,000</div>
                  </CardContent>
                </Card>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium">Cheque No.</th>
                      <th className="pb-3 font-medium">Invoice</th>
                      <th className="pb-3 font-medium">Customer</th>
                      <th className="pb-3 font-medium">Bank</th>
                      <th className="pb-3 font-medium">Amount</th>
                      <th className="pb-3 font-medium">Issue Date</th>
                      <th className="pb-3 font-medium">Maturity</th>
                      <th className="pb-3 font-medium">Deposited</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CHEQUES.map((chq) => (
                      <tr key={chq.id} className={`border-b hover:bg-muted/50 ${chq.status === "Bounced" ? "bg-red-50" : ""}`}>
                        <td className="py-3 font-mono text-xs">{chq.id}</td>
                        <td className="py-3 font-mono text-xs">{chq.invoice}</td>
                        <td className="py-3 font-medium">{chq.customer}</td>
                        <td className="py-3">{chq.bank}</td>
                        <td className="py-3 font-semibold">{chq.amount}</td>
                        <td className="py-3">{chq.issueDate}</td>
                        <td className="py-3">{chq.maturityDate}</td>
                        <td className="py-3">{chq.deposited}</td>
                        <td className="py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            chq.status === "Cleared" ? "bg-green-100 text-green-700" :
                            chq.status === "Deposited" ? "bg-blue-100 text-blue-700" :
                            chq.status === "Post-Dated" ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"
                          }`}>{chq.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aging" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aging Report</CardTitle>
              <CardDescription>Accounts receivable aging analysis by customer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium">Customer</th>
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 font-medium text-right">Current</th>
                      <th className="pb-3 font-medium text-right">1-30 Days</th>
                      <th className="pb-3 font-medium text-right">31-60 Days</th>
                      <th className="pb-3 font-medium text-right">61-90 Days</th>
                      <th className="pb-3 font-medium text-right">90+ Days</th>
                      <th className="pb-3 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {AGING.map((row) => (
                      <tr key={row.customer} className="border-b hover:bg-muted/50">
                        <td className="py-3 font-medium">{row.customer}</td>
                        <td className="py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            row.type === "Pharmacy" ? "bg-blue-100 text-blue-700" :
                            row.type === "Hospital" ? "bg-purple-100 text-purple-700" :
                            "bg-orange-100 text-orange-700"
                          }`}>{row.type}</span>
                        </td>
                        <td className="py-3 text-right">{row.current}</td>
                        <td className="py-3 text-right text-amber-600">{row.days30}</td>
                        <td className="py-3 text-right text-orange-600">{row.days60}</td>
                        <td className="py-3 text-right text-red-600">{row.days90}</td>
                        <td className="py-3 text-right text-red-700 font-semibold">{row.over90}</td>
                        <td className="py-3 text-right font-bold">{row.total}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold">
                      <td className="pt-3" colSpan={2}>Total</td>
                      <td className="pt-3 text-right">$79,100</td>
                      <td className="pt-3 text-right text-amber-600">$68,900</td>
                      <td className="pt-3 text-right text-orange-600">$37,400</td>
                      <td className="pt-3 text-right text-red-600">$0</td>
                      <td className="pt-3 text-right text-red-700">$0</td>
                      <td className="pt-3 text-right">$185,400</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Aging Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { label: "Current", value: 79100, total: 185400, color: "bg-green-500" },
                        { label: "1-30 Days", value: 68900, total: 185400, color: "bg-amber-500" },
                        { label: "31-60 Days", value: 37400, total: 185400, color: "bg-orange-500" },
                        { label: "61-90 Days", value: 0, total: 185400, color: "bg-red-500" },
                        { label: "90+ Days", value: 0, total: 185400, color: "bg-red-700" },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{item.label}</span>
                            <span className="font-medium">${item.value.toLocaleString()} ({Math.round(item.value / item.total * 100)}%)</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div className={`${item.color} h-2 rounded-full`} style={{ width: `${(item.value / item.total) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">By Customer Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { type: "Pharmacies", count: 4, total: "$44,900", color: "text-blue-600" },
                        { type: "Hospitals", count: 2, total: "$47,900", color: "text-purple-600" },
                        { type: "Distributors", count: 3, total: "$92,600", color: "text-orange-600" },
                      ].map((item) => (
                        <div key={item.type} className="flex items-center justify-between p-3 rounded-lg border">
                          <div>
                            <div className={`font-medium ${item.color}`}>{item.type}</div>
                            <div className="text-xs text-muted-foreground">{item.count} customers</div>
                          </div>
                          <div className="text-lg font-bold">{item.total}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Collection Routes</CardTitle>
              <CardDescription>Plan and track collection visits with optimized routes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ROUTES.map((route) => (
                  <Card key={route.id} className="border">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{route.name}</CardTitle>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          route.status === "Scheduled" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                        }`}>{route.status}</span>
                      </div>
                      <CardDescription>{route.id}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{route.customers} stops</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{route.scheduledDate}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Banknote className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{route.totalDue} to collect</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Collector:</span> {route.collector}
                        </div>
                        <div className="border-t pt-2 mt-2">
                          <div className="text-xs text-muted-foreground mb-1">Stops:</div>
                          <div className="flex flex-wrap gap-1">
                            {route.stops.map((stop) => (
                              <span key={stop} className="text-xs bg-muted px-2 py-0.5 rounded">{stop}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FormModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Payment"
        fields={paymentFields}
        onSubmit={(data) => { console.log("Payment recorded:", data); setShowPaymentModal(false); }}
      />
      <FormModal
        open={showRouteModal}
        onClose={() => setShowRouteModal(false)}
        title="Plan Collection Route"
        fields={routeFields}
        onSubmit={(data) => { console.log("Route planned:", data); setShowRouteModal(false); }}
      />
    </div>
  );
}
