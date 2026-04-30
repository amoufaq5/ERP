"use client"

import { useState, useMemo } from "react"
import { useTranslation } from "@/lib/i18n/i18n-context"
import { BarChart3, Clock, Star, Calendar, Play, FileText, Download, PieChart, TrendingUp, Building } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import StatsCard from "@/components/shared/stats-card"
import { useDataStore } from "@/lib/data-store"
import { downloadCSV, downloadHTML, buildPrintableReport } from "@/lib/download"

// ─── Revenue Trend Chart (demo data — kept as-is) ──────────────────────────

const revenueData = [
  { month: "Apr", revenue: 380000 }, { month: "May", revenue: 420000 }, { month: "Jun", revenue: 395000 },
  { month: "Jul", revenue: 450000 }, { month: "Aug", revenue: 480000 }, { month: "Sep", revenue: 510000 },
  { month: "Oct", revenue: 475000 }, { month: "Nov", revenue: 520000 }, { month: "Dec", revenue: 560000 },
  { month: "Jan", revenue: 445000 }, { month: "Feb", revenue: 530000 }, { month: "Mar", revenue: 570000 },
]

function RevenueAreaChart() {
  const maxVal = Math.max(...revenueData.map(d => d.revenue))
  const minVal = Math.min(...revenueData.map(d => d.revenue))

  const width = 800
  const height = 250
  const padding = { top: 20, right: 20, bottom: 40, left: 60 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const points = revenueData.map((d, i) => {
    const x = padding.left + (i / (revenueData.length - 1)) * chartW
    const y = padding.top + chartH - ((d.revenue - minVal * 0.9) / (maxVal * 1.1 - minVal * 0.9)) * chartH
    return { x, y, ...d }
  })

  const linePoints = points.map(p => `${p.x},${p.y}`).join(" ")
  const areaPoints = `${points[0].x},${padding.top + chartH} ${linePoints} ${points[points.length - 1].x},${padding.top + chartH}`

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[300px]">
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = padding.top + chartH * (1 - pct)
          const val = minVal * 0.9 + (maxVal * 1.1 - minVal * 0.9) * pct
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f0f0f0" strokeWidth="1" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" className="text-[10px] fill-gray-400">${(val / 1000).toFixed(0)}k</text>
            </g>
          )
        })}
        <polygon points={areaPoints} fill="#93c5fd" fillOpacity="0.3" />
        <polyline points={linePoints} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
            <text x={p.x} y={padding.top + chartH + 20} textAnchor="middle" className="text-[10px] fill-gray-500">{p.month}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", minimumFractionDigits: 0 }).format(n)
}

function fmtTimestamp(d: Date): string {
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86400000)
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { t } = useTranslation()
  const store = useDataStore()
  const [lastGenerated, setLastGenerated] = useState<Record<string, Date>>({})

  const markGenerated = (key: string) => {
    setLastGenerated(prev => ({ ...prev, [key]: new Date() }))
  }

  // ── Report generators ──────────────────────────────────────────────────

  function generateProfitLoss() {
    const paidInvoices = store.invoices.filter(inv => inv.status === "PAID" || inv.status === "PARTIAL")
    const revenue = paidInvoices.reduce((sum, inv) => sum + inv.total, 0)

    const sentPayments = store.payments.filter(p => p.type === "SENT")
    const expenses = sentPayments.reduce((sum, p) => sum + p.amount, 0)

    const grossProfit = revenue - expenses

    const html = buildPrintableReport({
      title: "Profit & Loss Statement",
      subtitle: `As of ${new Date().toLocaleDateString()}`,
      sections: [
        {
          heading: "Revenue",
          description: "Sum of all PAID and PARTIAL invoices",
          rows: paidInvoices.map(inv => ({
            "Invoice #": inv.number,
            "Customer": store.customers.find(c => c.id === inv.customerId)?.name ?? inv.customerId,
            "Status": inv.status,
            "Amount (EGP)": fmtCurrency(inv.total),
          })),
        },
        {
          heading: "Expenses",
          description: "Sum of all outgoing (SENT) payments",
          rows: sentPayments.map(p => ({
            "Reference": p.reference,
            "Vendor": store.vendors.find(v => v.id === p.vendorId)?.name ?? "N/A",
            "Method": p.method,
            "Amount (EGP)": fmtCurrency(p.amount),
          })),
        },
        {
          heading: "Summary",
          rows: [
            { "Line Item": "Total Revenue", "Amount (EGP)": fmtCurrency(revenue) },
            { "Line Item": "Total Expenses", "Amount (EGP)": fmtCurrency(expenses) },
            { "Line Item": "Gross Profit", "Amount (EGP)": fmtCurrency(grossProfit) },
          ],
        },
      ],
    })

    downloadHTML("profit-loss-statement.html", html)
    markGenerated("pnl")
  }

  function generateBalanceSheet() {
    const bankTotal = store.bankAccounts.reduce((sum, ba) => sum + ba.balance, 0)
    const arTotal = store.customers.reduce((sum, c) => sum + c.outstanding, 0)
    const totalAssets = bankTotal + arTotal

    const apTotal = store.vendors.reduce((sum, v) => sum + v.outstanding, 0)
    const equity = totalAssets - apTotal

    const html = buildPrintableReport({
      title: "Balance Sheet",
      subtitle: `As of ${new Date().toLocaleDateString()}`,
      sections: [
        {
          heading: "Assets - Bank Accounts",
          rows: store.bankAccounts.map(ba => ({
            "Account": ba.name,
            "Bank": ba.bankName,
            "Currency": ba.currency,
            "Balance": fmtCurrency(ba.balance),
          })),
        },
        {
          heading: "Assets - Accounts Receivable",
          rows: store.customers.filter(c => c.outstanding > 0).map(c => ({
            "Customer": c.name,
            "Type": c.type,
            "Outstanding (EGP)": fmtCurrency(c.outstanding),
          })),
        },
        {
          heading: "Liabilities - Accounts Payable",
          rows: store.vendors.filter(v => v.outstanding > 0).map(v => ({
            "Vendor": v.name,
            "Category": v.category,
            "Outstanding (EGP)": fmtCurrency(v.outstanding),
          })),
        },
        {
          heading: "Summary",
          rows: [
            { "Line Item": "Total Bank Balances", "Amount (EGP)": fmtCurrency(bankTotal) },
            { "Line Item": "Accounts Receivable", "Amount (EGP)": fmtCurrency(arTotal) },
            { "Line Item": "Total Assets", "Amount (EGP)": fmtCurrency(totalAssets) },
            { "Line Item": "Accounts Payable", "Amount (EGP)": fmtCurrency(apTotal) },
            { "Line Item": "Net Equity", "Amount (EGP)": fmtCurrency(equity) },
          ],
        },
      ],
    })

    downloadHTML("balance-sheet.html", html)
    markGenerated("bs")
  }

  function generateCashFlow() {
    const receivedPayments = store.payments.filter(p => p.type === "RECEIVED")
    const sentPayments = store.payments.filter(p => p.type === "SENT")

    const inflows = receivedPayments.reduce((sum, p) => sum + p.amount, 0)
    const outflows = sentPayments.reduce((sum, p) => sum + p.amount, 0)
    const netCash = inflows - outflows

    const html = buildPrintableReport({
      title: "Cash Flow Statement",
      subtitle: `As of ${new Date().toLocaleDateString()}`,
      sections: [
        {
          heading: "Cash Inflows (Received)",
          rows: receivedPayments.map(p => ({
            "Reference": p.reference,
            "Customer": store.customers.find(c => c.id === p.customerId)?.name ?? "N/A",
            "Method": p.method,
            "Date": new Date(p.date).toLocaleDateString(),
            "Amount (EGP)": fmtCurrency(p.amount),
          })),
        },
        {
          heading: "Cash Outflows (Sent)",
          rows: sentPayments.map(p => ({
            "Reference": p.reference,
            "Vendor": store.vendors.find(v => v.id === p.vendorId)?.name ?? "N/A",
            "Method": p.method,
            "Date": new Date(p.date).toLocaleDateString(),
            "Amount (EGP)": fmtCurrency(p.amount),
          })),
        },
        {
          heading: "Summary",
          rows: [
            { "Line Item": "Total Inflows", "Amount (EGP)": fmtCurrency(inflows) },
            { "Line Item": "Total Outflows", "Amount (EGP)": fmtCurrency(outflows) },
            { "Line Item": "Net Cash Flow", "Amount (EGP)": fmtCurrency(netCash) },
          ],
        },
      ],
    })

    downloadHTML("cash-flow-statement.html", html)
    markGenerated("cf")
  }

  function generateARaging() {
    const now = new Date()
    const buckets: Record<string, { current: number; "1-30": number; "31-60": number; "61-90": number; "90+": number }> = {}

    // Build buckets from overdue/open invoices
    const openInvoices = store.invoices.filter(inv => inv.status === "SENT" || inv.status === "PARTIAL" || inv.status === "OVERDUE")
    for (const inv of openInvoices) {
      const customer = store.customers.find(c => c.id === inv.customerId)
      const custName = customer?.name ?? inv.customerId
      if (!buckets[custName]) {
        buckets[custName] = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 }
      }
      const dueDate = new Date(inv.dueDate)
      const daysOverdue = daysBetween(now, dueDate)

      // Determine amount remaining; for PARTIAL, use total as approximation
      const amount = inv.total

      if (daysOverdue <= 0) {
        buckets[custName].current += amount
      } else if (daysOverdue <= 30) {
        buckets[custName]["1-30"] += amount
      } else if (daysOverdue <= 60) {
        buckets[custName]["31-60"] += amount
      } else if (daysOverdue <= 90) {
        buckets[custName]["61-90"] += amount
      } else {
        buckets[custName]["90+"] += amount
      }
    }

    const rows = Object.entries(buckets).map(([customer, b]) => ({
      Customer: customer,
      Current: b.current,
      "1-30 Days": b["1-30"],
      "31-60 Days": b["31-60"],
      "61-90 Days": b["61-90"],
      "90+ Days": b["90+"],
      Total: b.current + b["1-30"] + b["31-60"] + b["61-90"] + b["90+"],
    }))

    downloadCSV("ar-aging-report.csv", rows)
    markGenerated("ar")
  }

  function generateAPaging() {
    const rows = store.vendors
      .filter(v => v.outstanding > 0)
      .map(v => {
        // Distribute outstanding into a single bucket based on payment terms
        const termDays = parseInt(v.paymentTerms.replace(/\D/g, "")) || 30
        const bucket: Record<string, number> = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 }
        if (termDays <= 0) bucket.current = v.outstanding
        else if (termDays <= 30) bucket["1-30"] = v.outstanding
        else if (termDays <= 60) bucket["31-60"] = v.outstanding
        else if (termDays <= 90) bucket["61-90"] = v.outstanding
        else bucket["90+"] = v.outstanding

        return {
          Vendor: v.name,
          Category: v.category,
          "Payment Terms": v.paymentTerms,
          Current: bucket.current,
          "1-30 Days": bucket["1-30"],
          "31-60 Days": bucket["31-60"],
          "61-90 Days": bucket["61-90"],
          "90+ Days": bucket["90+"],
          Total: v.outstanding,
        }
      })

    downloadCSV("ap-aging-report.csv", rows)
    markGenerated("ap")
  }

  function generateSalesByProduct() {
    const productRevenue: Record<string, { name: string; therapeuticArea: string; quantity: number; revenue: number }> = {}

    const revenueInvoices = store.invoices.filter(inv => inv.status === "PAID" || inv.status === "PARTIAL" || inv.status === "SENT")
    for (const inv of revenueInvoices) {
      for (const item of inv.items) {
        const product = store.products.find(p => p.id === item.productId)
        const key = item.productId
        if (!productRevenue[key]) {
          productRevenue[key] = {
            name: product?.name ?? item.description,
            therapeuticArea: product?.therapeuticArea ?? "N/A",
            quantity: 0,
            revenue: 0,
          }
        }
        productRevenue[key].quantity += item.quantity
        productRevenue[key].revenue += item.total
      }
    }

    const rows = Object.values(productRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .map(p => ({
        Product: p.name,
        "Therapeutic Area": p.therapeuticArea,
        "Qty Sold": p.quantity,
        "Revenue (EGP)": p.revenue,
      }))

    downloadCSV("sales-by-product.csv", rows)
    markGenerated("sbp")
  }

  function generateCustomerRevenue() {
    const custRevenue: Record<string, { name: string; type: string; invoiceCount: number; revenue: number }> = {}

    const revenueInvoices = store.invoices.filter(inv => inv.status === "PAID" || inv.status === "PARTIAL" || inv.status === "SENT")
    for (const inv of revenueInvoices) {
      const customer = store.customers.find(c => c.id === inv.customerId)
      const key = inv.customerId
      if (!custRevenue[key]) {
        custRevenue[key] = {
          name: customer?.name ?? inv.customerId,
          type: customer?.type ?? "N/A",
          invoiceCount: 0,
          revenue: 0,
        }
      }
      custRevenue[key].invoiceCount += 1
      custRevenue[key].revenue += inv.total
    }

    const rows = Object.values(custRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .map(c => ({
        Customer: c.name,
        Type: c.type,
        "Invoice Count": c.invoiceCount,
        "Revenue (EGP)": c.revenue,
      }))

    downloadCSV("customer-revenue.csv", rows)
    markGenerated("cr")
  }

  function generateFieldForceActivity() {
    // Group visits by rep
    const repVisits: Record<string, { repId: string; visitCount: number; doctorIds: Set<string> }> = {}

    for (const visit of store.visits) {
      if (!repVisits[visit.repId]) {
        repVisits[visit.repId] = { repId: visit.repId, visitCount: 0, doctorIds: new Set() }
      }
      repVisits[visit.repId].visitCount += 1
      repVisits[visit.repId].doctorIds.add(visit.doctorId)
    }

    const totalDoctors = store.doctors.length

    const rows = Object.values(repVisits).map(r => {
      const coverage = totalDoctors > 0 ? Math.round((r.doctorIds.size / totalDoctors) * 100) : 0
      return {
        "Rep ID": r.repId,
        "Visits": r.visitCount,
        "Unique Doctors Visited": r.doctorIds.size,
        "Total Doctors": totalDoctors,
        "Coverage %": coverage,
      }
    })

    downloadCSV("field-force-activity.csv", rows)
    markGenerated("ffa")
  }

  // ── Report definitions by tab ──────────────────────────────────────────

  type ReportDef = {
    key: string
    name: string
    description: string
    format: "HTML" | "CSV"
    generate: () => void
  }

  const financialReports: ReportDef[] = [
    { key: "pnl", name: "Profit & Loss Statement", description: "Revenue, expenses, and gross profit from invoices & payments", format: "HTML", generate: generateProfitLoss },
    { key: "bs", name: "Balance Sheet", description: "Assets (bank + AR), liabilities (AP), and equity", format: "HTML", generate: generateBalanceSheet },
    { key: "cf", name: "Cash Flow Statement", description: "Inflows (received), outflows (sent), and net cash flow", format: "HTML", generate: generateCashFlow },
    { key: "ar", name: "AR Aging Report", description: "Customer outstanding grouped by aging buckets based on invoice due dates", format: "CSV", generate: generateARaging },
    { key: "ap", name: "AP Aging Report", description: "Vendor outstanding grouped by aging buckets based on payment terms", format: "CSV", generate: generateAPaging },
  ]

  const salesReports: ReportDef[] = [
    { key: "sbp", name: "Sales by Product", description: "Revenue per product from invoice line items", format: "CSV", generate: generateSalesByProduct },
    { key: "cr", name: "Customer Revenue Report", description: "Revenue per customer across all invoices", format: "CSV", generate: generateCustomerRevenue },
  ]

  const hrReports: ReportDef[] = [
    { key: "ffa", name: "Field Force Activity", description: "Visit count and doctor coverage percentage by rep", format: "CSV", generate: generateFieldForceActivity },
  ]

  // ── Summary stats ──────────────────────────────────────────────────────

  const totalRevenue = store.invoices
    .filter(inv => inv.status === "PAID" || inv.status === "PARTIAL")
    .reduce((sum, inv) => sum + inv.total, 0)
  const totalAR = store.customers.reduce((sum, c) => sum + c.outstanding, 0)
  const totalAP = store.vendors.reduce((sum, v) => sum + v.outstanding, 0)
  const totalReports = financialReports.length + salesReports.length + hrReports.length
  const generatedCount = Object.keys(lastGenerated).length

  // ── Render a single report card ────────────────────────────────────────

  function ReportCard({ report }: { report: ReportDef }) {
    const ts = lastGenerated[report.key]
    return (
      <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium">{report.name}</h4>
          <Badge variant={report.format === "HTML" ? "default" : "secondary"} className="shrink-0 text-[10px]">
            {report.format}
          </Badge>
        </div>
        <p className="text-sm text-gray-500 mt-1">{report.description}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-400">
            <Clock className="h-3 w-3 inline mr-1" />
            {ts ? `Last: ${fmtTimestamp(ts)}` : "Not generated yet"}
          </span>
          <Button size="sm" variant="outline" onClick={report.generate}>
            {report.format === "HTML" ? <FileText className="h-3 w-3 mr-1" /> : <Download className="h-3 w-3 mr-1" />}
            Generate
          </Button>
        </div>
      </div>
    )
  }

  // ── Render a category of reports ───────────────────────────────────────

  function ReportCategory({ title, borderColor, reports }: { title: string; borderColor: string; reports: ReportDef[] }) {
    return (
      <Card className={`border-l-4 ${borderColor}`}>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {reports.map(report => (
              <ReportCard key={report.key} report={report} />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("rpt.title")}</h1>
        <p className="text-gray-500">{t("rpt.manageReports")}</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard icon={BarChart3} title="Total Reports" value={totalReports} subtitle={`${generatedCount} generated this session`} iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={Calendar} title="Total Revenue" value={fmtCurrency(totalRevenue)} subtitle="Paid & partial invoices" iconColor="bg-green-100 text-green-600" />
        <StatsCard icon={Star} title="Accounts Receivable" value={fmtCurrency(totalAR)} subtitle="Customer outstanding" iconColor="bg-yellow-100 text-yellow-600" />
        <StatsCard icon={Clock} title="Accounts Payable" value={fmtCurrency(totalAP)} subtitle="Vendor outstanding" iconColor="bg-purple-100 text-purple-600" />
      </div>

      {/* Revenue trend chart */}
      <Card>
        <CardHeader><CardTitle>Revenue Trend (12 Months)</CardTitle></CardHeader>
        <CardContent>
          <RevenueAreaChart />
        </CardContent>
      </Card>

      {/* Tabbed report categories */}
      <Tabs defaultValue="financial" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="financial">{t("rpt.financial")}</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="pivot">{t("rpt.pivotTables")}</TabsTrigger>
          <TabsTrigger value="bu-analysis">{t("rpt.buAnalysis")}</TabsTrigger>
          <TabsTrigger value="hr">{t("rpt.hrFieldForce")}</TabsTrigger>
        </TabsList>

        <TabsContent value="financial">
          <ReportCategory title="Financial Reports" borderColor="border-l-green-500" reports={financialReports} />
        </TabsContent>

        <TabsContent value="sales">
          <ReportCategory title="Sales Reports" borderColor="border-l-blue-500" reports={salesReports} />
        </TabsContent>

        <TabsContent value="pivot">
          <PivotTableSection />
        </TabsContent>

        <TabsContent value="bu-analysis">
          <BUAnalysisSection />
        </TabsContent>

        <TabsContent value="hr">
          <ReportCategory title="HR & Field Force Reports" borderColor="border-l-purple-500" reports={hrReports} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Pivot Table Section ──────────────────────────────────────────────────────

function PivotTableSection() {
  const store = useDataStore()
  const [groupBy, setGroupBy] = useState<"bu" | "product" | "customer">("bu")
  const [period, setPeriod] = useState<"all" | "q1" | "q2" | "q3" | "q4">("all")

  const pivotData = useMemo(() => {
    const revenueInvoices = store.invoices.filter(inv => {
      if (inv.status !== "PAID" && inv.status !== "PARTIAL" && inv.status !== "SENT") return false
      if (period === "all") return true
      const m = new Date(inv.date).getMonth()
      if (period === "q1") return m >= 0 && m <= 2
      if (period === "q2") return m >= 3 && m <= 5
      if (period === "q3") return m >= 6 && m <= 8
      return m >= 9 && m <= 11
    })

    if (groupBy === "bu") {
      const buMap: Record<string, { name: string; color: string; revenue: number; orders: number; products: number; productIds: Set<string> }> = {}
      for (const bu of store.businessUnits) {
        buMap[bu.id] = { name: bu.name, color: bu.color, revenue: 0, orders: 0, products: bu.productIds.length, productIds: new Set(bu.productIds) }
      }
      for (const inv of revenueInvoices) {
        for (const item of inv.items) {
          const product = store.products.find(p => p.id === item.productId)
          const buId = product?.buId
          if (buId && buMap[buId]) {
            buMap[buId].revenue += item.total
            buMap[buId].orders += 1
          }
        }
      }
      // Also include sales order revenue
      for (const so of store.salesOrders.filter(s => s.status === "INVOICED" || s.status === "DELIVERED")) {
        for (const item of so.items) {
          const product = store.products.find(p => p.id === item.productId)
          const buId = product?.buId
          if (buId && buMap[buId]) {
            buMap[buId].revenue += item.total
          }
        }
      }
      return { type: "bu" as const, rows: Object.entries(buMap).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.revenue - a.revenue) }
    }

    if (groupBy === "product") {
      const prodMap: Record<string, { name: string; buName: string; quantity: number; revenue: number }> = {}
      for (const inv of revenueInvoices) {
        for (const item of inv.items) {
          const product = store.products.find(p => p.id === item.productId)
          const bu = product ? store.businessUnits.find(b => b.id === product.buId) : null
          if (!prodMap[item.productId]) {
            prodMap[item.productId] = { name: product?.name ?? item.description, buName: bu?.name ?? "—", quantity: 0, revenue: 0 }
          }
          prodMap[item.productId].quantity += item.quantity
          prodMap[item.productId].revenue += item.total
        }
      }
      return { type: "product" as const, rows: Object.entries(prodMap).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.revenue - a.revenue) }
    }

    // customer
    const custMap: Record<string, { name: string; type: string; invoiceCount: number; revenue: number }> = {}
    for (const inv of revenueInvoices) {
      const cust = store.customers.find(c => c.id === inv.customerId)
      if (!custMap[inv.customerId]) {
        custMap[inv.customerId] = { name: cust?.name ?? inv.customerId, type: cust?.type ?? "—", invoiceCount: 0, revenue: 0 }
      }
      custMap[inv.customerId].invoiceCount += 1
      custMap[inv.customerId].revenue += inv.total
    }
    return { type: "customer" as const, rows: Object.entries(custMap).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.revenue - a.revenue) }
  }, [store, groupBy, period])

  const totalRevenue = pivotData.rows.reduce((s, r) => s + r.revenue, 0)
  const maxRevenue = Math.max(...pivotData.rows.map(r => r.revenue), 1)

  function exportPivot() {
    if (pivotData.type === "bu") {
      downloadCSV("pivot-by-bu.csv", pivotData.rows.map(r => ({ "Business Unit": r.name, Products: r.products, Orders: r.orders, "Revenue (EGP)": r.revenue })))
    } else if (pivotData.type === "product") {
      downloadCSV("pivot-by-product.csv", pivotData.rows.map(r => ({ Product: r.name, "Business Unit": r.buName, Quantity: r.quantity, "Revenue (EGP)": r.revenue })))
    } else {
      downloadCSV("pivot-by-customer.csv", pivotData.rows.map(r => ({ Customer: r.name, Type: r.type, Invoices: r.invoiceCount, "Revenue (EGP)": r.revenue })))
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5" /> Sales Pivot Table</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Interactive sales data grouped by business unit, product, or customer</p>
          </div>
          <Button size="sm" variant="outline" onClick={exportPivot}><Download className="h-3 w-3 mr-1" /> Export CSV</Button>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4 flex-wrap">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Group By</label>
              <div className="flex gap-1">
                {(["bu", "product", "customer"] as const).map(g => (
                  <Button key={g} size="sm" variant={groupBy === g ? "default" : "outline"} className="h-7 text-xs" onClick={() => setGroupBy(g)}>
                    {g === "bu" ? "Business Unit" : g === "product" ? "Product" : "Customer"}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Period</label>
              <div className="flex gap-1">
                {(["all", "q1", "q2", "q3", "q4"] as const).map(p => (
                  <Button key={p} size="sm" variant={period === p ? "default" : "outline"} className="h-7 text-xs" onClick={() => setPeriod(p)}>
                    {p === "all" ? "All" : p.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="p-3 font-medium">{groupBy === "bu" ? "Business Unit" : groupBy === "product" ? "Product" : "Customer"}</th>
                  {pivotData.type === "bu" && <th className="p-3 font-medium text-right">Products</th>}
                  {pivotData.type === "bu" && <th className="p-3 font-medium text-right">Orders</th>}
                  {pivotData.type === "product" && <th className="p-3 font-medium">Business Unit</th>}
                  {pivotData.type === "product" && <th className="p-3 font-medium text-right">Qty Sold</th>}
                  {pivotData.type === "customer" && <th className="p-3 font-medium">Type</th>}
                  {pivotData.type === "customer" && <th className="p-3 font-medium text-right">Invoices</th>}
                  <th className="p-3 font-medium text-right">Revenue (EGP)</th>
                  <th className="p-3 font-medium" style={{ width: "30%" }}>Share</th>
                </tr>
              </thead>
              <tbody>
                {pivotData.rows.map((row) => {
                  const pct = totalRevenue > 0 ? (row.revenue / totalRevenue) * 100 : 0
                  return (
                    <tr key={row.id} className="border-t hover:bg-muted/30">
                      <td className="p-3 font-medium">
                        {pivotData.type === "bu" && <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: (row as { color?: string }).color ?? "#888" }} />}
                        {row.name}
                      </td>
                      {pivotData.type === "bu" && <td className="p-3 text-right">{(row as { products: number }).products}</td>}
                      {pivotData.type === "bu" && <td className="p-3 text-right">{(row as { orders: number }).orders}</td>}
                      {pivotData.type === "product" && <td className="p-3">{(row as { buName: string }).buName}</td>}
                      {pivotData.type === "product" && <td className="p-3 text-right">{(row as { quantity: number }).quantity.toLocaleString()}</td>}
                      {pivotData.type === "customer" && <td className="p-3">{(row as { type: string }).type}</td>}
                      {pivotData.type === "customer" && <td className="p-3 text-right">{(row as { invoiceCount: number }).invoiceCount}</td>}
                      <td className="p-3 text-right font-semibold">{row.revenue.toLocaleString()}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${(row.revenue / maxRevenue) * 100}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-12 text-right">{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {pivotData.rows.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No data for the selected period</td></tr>
                )}
              </tbody>
              {pivotData.rows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 bg-muted/30">
                    <td className="p-3 font-bold">Total</td>
                    {(pivotData.type === "bu" || pivotData.type === "product" || pivotData.type === "customer") && <td className="p-3" />}
                    <td className="p-3" />
                    <td className="p-3 text-right font-bold">{totalRevenue.toLocaleString()}</td>
                    <td className="p-3" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── BU Analysis Section ──────────────────────────────────────────────────────

function BUAnalysisSection() {
  const store = useDataStore()

  const buAnalysis = useMemo(() => {
    return store.businessUnits.map(bu => {
      // Revenue: from invoices for this BU's products
      let revenue = 0
      let invoiceCount = 0
      const revenueInvoices = store.invoices.filter(inv => inv.status === "PAID" || inv.status === "PARTIAL" || inv.status === "SENT")
      for (const inv of revenueInvoices) {
        for (const item of inv.items) {
          const product = store.products.find(p => p.id === item.productId)
          if (product?.buId === bu.id) {
            revenue += item.total
            invoiceCount++
          }
        }
      }

      // Also include sales orders
      for (const so of store.salesOrders.filter(s => s.status === "INVOICED" || s.status === "DELIVERED")) {
        for (const item of so.items) {
          const product = store.products.find(p => p.id === item.productId)
          if (product?.buId === bu.id) {
            revenue += item.total
          }
        }
      }

      // Expenses: from POs for this BU's products
      let expenses = 0
      let poCount = 0
      for (const po of store.purchaseOrders) {
        for (const item of po.items) {
          const product = store.products.find(p => p.id === item.productId)
          if (product?.buId === bu.id) {
            expenses += item.total
            poCount++
          }
        }
      }

      // Also add cost center allocations if any cost center is mapped
      for (const cc of store.costCenters) {
        if (cc.name.toLowerCase().includes("sales") || cc.name.toLowerCase().includes("marketing")) {
          expenses += Math.round(cc.actualSpend / store.businessUnits.length)
        }
      }

      const products = store.products.filter(p => p.buId === bu.id)
      const members = bu.memberIds.length
      const netProfit = revenue - expenses

      return {
        id: bu.id,
        name: bu.name,
        code: bu.code,
        color: bu.color,
        revenue,
        expenses,
        netProfit,
        margin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
        products: products.length,
        members,
        invoiceCount,
        poCount,
        productDetails: products.map(p => ({
          name: p.name,
          strength: p.strength,
          price: p.pricePerUnit,
          therapeuticArea: p.therapeuticArea,
        })),
      }
    }).sort((a, b) => b.revenue - a.revenue)
  }, [store])

  const totalRevenue = buAnalysis.reduce((s, b) => s + b.revenue, 0)
  const totalExpenses = buAnalysis.reduce((s, b) => s + b.expenses, 0)
  const totalProfit = totalRevenue - totalExpenses
  const maxVal = Math.max(...buAnalysis.map(b => Math.max(b.revenue, b.expenses)), 1)

  function exportBUAnalysis() {
    downloadCSV("bu-analysis.csv", buAnalysis.map(b => ({
      "Business Unit": b.name,
      Code: b.code,
      Products: b.products,
      Members: b.members,
      "Revenue (EGP)": b.revenue,
      "Expenses (EGP)": b.expenses,
      "Net Profit (EGP)": b.netProfit,
      "Margin %": `${b.margin.toFixed(1)}%`,
    })))
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-green-600" /></div>
              <div><div className="text-xs text-muted-foreground">Total Revenue</div><div className="text-xl font-bold text-green-700">EGP {totalRevenue.toLocaleString()}</div></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center"><Building className="h-5 w-5 text-red-600" /></div>
              <div><div className="text-xs text-muted-foreground">Total Expenses</div><div className="text-xl font-bold text-red-700">EGP {totalExpenses.toLocaleString()}</div></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center"><BarChart3 className="h-5 w-5 text-blue-600" /></div>
              <div><div className="text-xs text-muted-foreground">Net Profit</div><div className={`text-xl font-bold ${totalProfit >= 0 ? "text-blue-700" : "text-red-700"}`}>EGP {totalProfit.toLocaleString()}</div></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparative bar chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Business Unit Revenue vs Expenses</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Side-by-side comparison of each business unit</p>
          </div>
          <Button size="sm" variant="outline" onClick={exportBUAnalysis}><Download className="h-3 w-3 mr-1" /> Export CSV</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {buAnalysis.map(bu => (
              <div key={bu.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: bu.color }} />
                    <span className="font-medium text-sm">{bu.name}</span>
                    <Badge variant="outline" className="text-[10px]">{bu.code}</Badge>
                  </div>
                  <span className={`text-sm font-semibold ${bu.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {bu.netProfit >= 0 ? "+" : ""}EGP {bu.netProfit.toLocaleString()} ({bu.margin.toFixed(1)}%)
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16">Revenue</span>
                    <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${(bu.revenue / maxVal) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium w-28 text-right">EGP {bu.revenue.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16">Expenses</span>
                    <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-red-400 transition-all" style={{ width: `${(bu.expenses / maxVal) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium w-28 text-right">EGP {bu.expenses.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed BU cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {buAnalysis.map(bu => (
          <Card key={bu.id} className="border-t-4" style={{ borderTopColor: bu.color }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{bu.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{bu.code} • {bu.products} products • {bu.members} members</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground text-xs">Revenue</span><p className="font-semibold text-green-700">EGP {bu.revenue.toLocaleString()}</p></div>
                <div><span className="text-muted-foreground text-xs">Expenses</span><p className="font-semibold text-red-600">EGP {bu.expenses.toLocaleString()}</p></div>
                <div><span className="text-muted-foreground text-xs">Net Profit</span><p className={`font-semibold ${bu.netProfit >= 0 ? "text-blue-700" : "text-red-700"}`}>EGP {bu.netProfit.toLocaleString()}</p></div>
                <div><span className="text-muted-foreground text-xs">Margin</span><p className={`font-semibold ${bu.margin >= 0 ? "text-blue-700" : "text-red-700"}`}>{bu.margin.toFixed(1)}%</p></div>
              </div>
              {bu.productDetails.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Products</span>
                  <div className="mt-1 space-y-1">
                    {bu.productDetails.map((p, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span>{p.name} {p.strength}</span>
                        <span className="text-muted-foreground">EGP {p.price}/unit</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
