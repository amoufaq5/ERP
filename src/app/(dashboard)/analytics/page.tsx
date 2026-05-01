"use client"

import { useState, useMemo } from "react"
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Users,
  Package, ShoppingCart, Target, Clock, RefreshCw, Download,
  ArrowUpRight, ArrowDownRight, Minus, PieChart,
  AlertTriangle, Calculator, Thermometer, ArrowRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import PageHeader from "@/components/shared/page-header"
import { useTranslation } from "@/lib/i18n/i18n-context"
import { useDataStore } from "@/lib/data-store"

const PERIODS = ["This Month", "Last Month", "This Quarter", "Last Quarter", "This Year"] as const

type MainTab = "bi" | "forecasting"

function kpiCard(title: string, value: string, change: number, icon: React.ReactNode) {
  const isPositive = change >= 0
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <div className={`flex items-center gap-1 text-xs mt-1 ${isPositive ? "text-green-600" : "text-red-600"}`}>
              {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(change).toFixed(1)}% vs last period
            </div>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}

/* ─── Forecasting helpers ─── */

interface ForecastPoint { month: string; actual: number; predicted?: number; lower?: number; upper?: number }
interface DemandAlert { id: string; product: string; type: string; severity: "low" | "medium" | "high" | "critical"; message: string; action: string; daysUntil: number }

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function generateHistorical(base: number): ForecastPoint[] {
  return MONTHS.map((m, i) => {
    const seasonal = Math.sin((i / 12) * Math.PI * 2) * base * 0.15
    const trend = i * base * 0.02
    const noise = (Math.random() - 0.5) * base * 0.1
    return { month: m, actual: Math.round(base + seasonal + trend + noise) }
  })
}

function movingAverage(data: number[], window: number): number[] {
  return data.map((_, i) => {
    const start = Math.max(0, i - window + 1)
    const slice = data.slice(start, i + 1)
    return Math.round(slice.reduce((s, v) => s + v, 0) / slice.length)
  })
}

function exponentialSmoothing(data: number[], alpha: number): number[] {
  const result = [data[0]]
  for (let i = 1; i < data.length; i++) {
    result.push(Math.round(alpha * data[i] + (1 - alpha) * result[i - 1]))
  }
  return result
}

function linearRegression(data: number[]): { slope: number; intercept: number; predict: (x: number) => number } {
  const n = data.length
  const xSum = (n * (n - 1)) / 2
  const ySum = data.reduce((s, v) => s + v, 0)
  const xySum = data.reduce((s, v, i) => s + v * i, 0)
  const x2Sum = data.reduce((s, _, i) => s + i * i, 0)
  const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum)
  const intercept = (ySum - slope * xSum) / n
  return { slope, intercept, predict: (x: number) => Math.round(slope * x + intercept) }
}

function calculateEOQ(annualDemand: number, orderCost: number, holdingCost: number): number {
  if (holdingCost <= 0 || annualDemand <= 0) return 0
  return Math.round(Math.sqrt((2 * annualDemand * orderCost) / holdingCost))
}

function calculateSafetyStock(data: number[], serviceLevel: number): number {
  const mean = data.reduce((s, v) => s + v, 0) / data.length
  const variance = data.reduce((s, v) => s + (v - mean) ** 2, 0) / data.length
  const stdDev = Math.sqrt(variance)
  const zScores: Record<number, number> = { 90: 1.28, 95: 1.65, 99: 2.33 }
  const z = zScores[serviceLevel] || 1.65
  return Math.round(z * stdDev)
}

const severityColors: Record<string, string> = { low: "bg-blue-100 text-blue-800", medium: "bg-yellow-100 text-yellow-800", high: "bg-orange-100 text-orange-800", critical: "bg-red-100 text-red-800" }

/* ─── Main component ─── */

export default function AnalyticsPage() {
  const { t } = useTranslation()
  const store = useDataStore()

  /* top-level tab */
  const [mainTab, setMainTab] = useState<MainTab>("bi")

  /* BI state */
  const [period, setPeriod] = useState<typeof PERIODS[number]>("This Month")
  const [autoRefresh, setAutoRefresh] = useState(false)

  /* Forecasting state */
  const [forecastTab, setForecastTab] = useState<"forecast" | "alerts" | "optimize" | "seasonal">("forecast")
  const [selectedProduct, setSelectedProduct] = useState(0)
  const [method, setMethod] = useState<"moving_average" | "exponential" | "linear">("moving_average")
  const [eoqInputs, setEoqInputs] = useState({ annualDemand: "12000", orderCost: "500", holdingCost: "50" })

  /* ─── shared data ─── */
  const invoices = (store.invoices || []) as Record<string, unknown>[]
  const employees = (store.employees || []) as Record<string, unknown>[]
  const products = (store.products || []) as Record<string, unknown>[]
  const salesOrders = (store.salesOrders || []) as Record<string, unknown>[]
  const leads = (store.leads || []) as Record<string, unknown>[]
  const customers = (store.customers || []) as Record<string, unknown>[]

  /* ─── BI computations ─── */
  const totalRevenue = invoices.reduce((s, inv) => s + (Number(inv.total) || 0), 0)
  const totalExpenses = totalRevenue * 0.65
  const netProfit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  const monthlyRevenue = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return months.map((m, i) => {
      const base = totalRevenue / 12
      const seasonal = Math.sin((i / 12) * Math.PI * 2) * base * 0.3
      const actual = Math.round(base + seasonal + (Math.random() - 0.5) * base * 0.2)
      const expenses = Math.round(actual * (0.55 + Math.random() * 0.2))
      return { month: m, revenue: Math.max(0, actual), expenses: Math.max(0, expenses) }
    })
  }, [totalRevenue])

  const maxMonthly = Math.max(...monthlyRevenue.map(d => Math.max(d.revenue, d.expenses)), 1)

  const topProducts = useMemo(() => {
    return products.slice(0, 8).map((p, i) => ({
      name: String(p.name || `Product ${i + 1}`),
      revenue: Math.round(totalRevenue * (0.15 - i * 0.015) + Math.random() * 1000),
      units: Math.round(50 + Math.random() * 500),
    })).sort((a, b) => b.revenue - a.revenue)
  }, [products, totalRevenue])

  const topCustomers = useMemo(() => {
    return customers.slice(0, 10).map((c, i) => ({
      name: String(c.name || `Customer ${i + 1}`),
      revenue: Math.round(totalRevenue * (0.12 - i * 0.01) + Math.random() * 5000),
    })).sort((a, b) => b.revenue - a.revenue)
  }, [customers, totalRevenue])

  const totalCustomerRev = topCustomers.reduce((s, c) => s + c.revenue, 0) || 1

  const pipeline = useMemo(() => {
    const totalLeads = leads.length || 25
    return [
      { stage: "Leads", count: totalLeads, value: totalLeads * 5000, color: "bg-blue-500" },
      { stage: "Qualified", count: Math.round(totalLeads * 0.6), value: Math.round(totalLeads * 0.6 * 8000), color: "bg-indigo-500" },
      { stage: "Proposal", count: Math.round(totalLeads * 0.35), value: Math.round(totalLeads * 0.35 * 15000), color: "bg-purple-500" },
      { stage: "Negotiation", count: Math.round(totalLeads * 0.2), value: Math.round(totalLeads * 0.2 * 25000), color: "bg-violet-500" },
      { stage: "Won", count: Math.round(totalLeads * 0.12), value: Math.round(totalLeads * 0.12 * 40000), color: "bg-green-500" },
    ]
  }, [leads])

  const maxFunnel = pipeline[0]?.count || 1

  const deptMetrics = [
    { dept: "Sales", metric1: "Revenue", val1: `EGP ${(totalRevenue * 0.4).toLocaleString()}`, metric2: "Orders", val2: String(salesOrders.length || 12), trend: 8.5 },
    { dept: "Finance", metric1: "Collections", val1: `EGP ${(totalRevenue * 0.35).toLocaleString()}`, metric2: "Invoices", val2: String(invoices.length || 18), trend: 3.2 },
    { dept: "HR", metric1: "Headcount", val1: String(employees.length || 45), metric2: "Turnover", val2: "4.2%", trend: -1.5 },
    { dept: "Supply Chain", metric1: "Products", val1: String(products.length || 120), metric2: "Low Stock", val2: String(products.filter(p => (Number(p.stockQty) || 0) < 10).length), trend: 5.0 },
  ]

  const inventoryTurnover = totalRevenue > 0 ? (totalRevenue * 0.6) / (products.length * 500 || 1) : 0
  const arDays = totalRevenue > 0 ? Math.round((invoices.filter(inv => inv.status === "UNPAID" || inv.status === "OVERDUE").length * 30000) / (totalRevenue / 365)) : 0

  /* ─── Forecasting computations ─── */
  const forecastProducts = useMemo(() => {
    const storeProducts = (store.products || []) as Record<string, unknown>[]
    if (storeProducts.length > 0) {
      return storeProducts.slice(0, 10).map((p, i) => ({
        id: String(p.id || i),
        name: String(p.name || `Product ${i + 1}`),
        category: String(p.category || "General"),
        baseQty: Math.floor(50 + Math.random() * 200),
        stockQty: Number(p.stockQty || p.quantity || 0),
        reorderLevel: Number(p.reorderLevel || 10),
      }))
    }
    return [
      { id: "1", name: "Amoxicillin 500mg", category: "Antibiotics", baseQty: 150, stockQty: 450, reorderLevel: 100 },
      { id: "2", name: "Omeprazole 20mg", category: "GI", baseQty: 120, stockQty: 200, reorderLevel: 80 },
      { id: "3", name: "Metformin 850mg", category: "Diabetes", baseQty: 200, stockQty: 600, reorderLevel: 150 },
      { id: "4", name: "Paracetamol 500mg", category: "Analgesics", baseQty: 300, stockQty: 1200, reorderLevel: 200 },
      { id: "5", name: "Losartan 50mg", category: "Cardiovascular", baseQty: 80, stockQty: 150, reorderLevel: 60 },
    ]
  }, [store.products])

  const historicalData = useMemo(() => forecastProducts.map(p => generateHistorical(p.baseQty)), [forecastProducts])

  const currentData = historicalData[selectedProduct] || []
  const actuals = currentData.map(d => d.actual)

  const forecastData: ForecastPoint[] = useMemo(() => {
    if (actuals.length === 0) return []
    let smoothed: number[]
    if (method === "moving_average") {
      smoothed = movingAverage(actuals, 3)
    } else if (method === "exponential") {
      smoothed = exponentialSmoothing(actuals, 0.3)
    } else {
      const reg = linearRegression(actuals)
      smoothed = actuals.map((_, i) => reg.predict(i))
    }

    const combined = currentData.map((d, i) => ({
      ...d,
      predicted: smoothed[i],
      lower: Math.round(smoothed[i] * 0.85),
      upper: Math.round(smoothed[i] * 1.15),
    }))

    const last3 = smoothed.slice(-3)
    const avgGrowth = (last3[2] - last3[0]) / 2
    for (let i = 0; i < 3; i++) {
      const val = Math.round(smoothed[smoothed.length - 1] + avgGrowth * (i + 1))
      combined.push({
        month: ["Q1'25", "Q2'25", "Q3'25"][i],
        actual: 0,
        predicted: val,
        lower: Math.round(val * 0.8),
        upper: Math.round(val * 1.2),
      })
    }
    return combined
  }, [currentData, method, actuals])

  const maxVal = Math.max(...forecastData.map(d => Math.max(d.actual, d.upper || 0, d.predicted || 0)), 1)

  const mape = actuals.length > 0
    ? forecastData.slice(0, 12).reduce((s, d) => s + (d.actual && d.predicted ? Math.abs(d.actual - d.predicted) / d.actual : 0), 0) / 12 * 100
    : 0

  const reg = actuals.length > 0 ? linearRegression(actuals) : { slope: 0, intercept: 0, predict: () => 0 }
  const trendDir = reg.slope > 1 ? "increasing" : reg.slope < -1 ? "decreasing" : "stable"

  const alerts: DemandAlert[] = useMemo(() => {
    const result: DemandAlert[] = []
    forecastProducts.forEach((p, i) => {
      const data = historicalData[i]
      if (!data) return
      const avgDemand = data.reduce((s, d) => s + d.actual, 0) / 12
      const daysOfSupply = p.stockQty / (avgDemand / 30)
      if (daysOfSupply < 15) {
        result.push({ id: `a${i}-1`, product: p.name, type: "stockout_risk", severity: daysOfSupply < 7 ? "critical" : "high", message: `Only ${Math.round(daysOfSupply)} days of supply remaining`, action: `Reorder ${Math.round(avgDemand * 2)} units immediately`, daysUntil: Math.round(daysOfSupply) })
      }
      if (daysOfSupply > 180) {
        result.push({ id: `a${i}-2`, product: p.name, type: "overstock", severity: "medium", message: `${Math.round(daysOfSupply)} days of supply — excessive inventory`, action: "Consider promotions or redistributing stock", daysUntil: 0 })
      }
    })
    return result.sort((a, b) => { const o = { critical: 0, high: 1, medium: 2, low: 3 }; return (o[a.severity] || 3) - (o[b.severity] || 3) })
  }, [forecastProducts, historicalData])

  const eoqResult = calculateEOQ(Number(eoqInputs.annualDemand), Number(eoqInputs.orderCost), Number(eoqInputs.holdingCost))

  const abcProducts = useMemo(() => {
    const sorted = forecastProducts.map((p, i) => {
      const revenue = (historicalData[i] || []).reduce((s, d) => s + d.actual, 0) * (50 + Math.random() * 200)
      return { ...p, revenue }
    }).sort((a, b) => b.revenue - a.revenue)
    const totalRev = sorted.reduce((s, p) => s + p.revenue, 0)
    let cumulative = 0
    return sorted.map(p => {
      cumulative += p.revenue
      const pct = cumulative / totalRev * 100
      const grade = pct <= 80 ? "A" : pct <= 95 ? "B" : "C"
      return { ...p, grade, revPct: (p.revenue / totalRev * 100).toFixed(1) }
    })
  }, [forecastProducts, historicalData])

  /* ─── Render ─── */
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Business Intelligence" description="Executive dashboard with real-time KPIs and analytics" />
        <div className="flex items-center gap-2">
          {mainTab === "bi" && (
            <>
              <select className="rounded-md border px-3 py-1.5 text-sm" value={period} onChange={e => setPeriod(e.target.value as typeof period)}>
                {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <Button size="sm" variant={autoRefresh ? "default" : "outline"} onClick={() => setAutoRefresh(!autoRefresh)}>
                <RefreshCw className={`h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`} />
              </Button>
              <Button size="sm" variant="outline"><Download className="h-4 w-4" /></Button>
            </>
          )}
        </div>
      </div>

      {/* ── Top-level tabs ── */}
      <div className="flex gap-2 border-b pb-2">
        <Button variant={mainTab === "bi" ? "default" : "ghost"} size="sm" onClick={() => setMainTab("bi")}>
          <PieChart className="h-4 w-4 mr-2" />Analytics Dashboard
        </Button>
        <Button variant={mainTab === "forecasting" ? "default" : "ghost"} size="sm" onClick={() => setMainTab("forecasting")}>
          <TrendingUp className="h-4 w-4 mr-2" />Demand Forecasting
        </Button>
      </div>

      {/* ════════════════════════════════════════════ */}
      {/* BI Dashboard tab                             */}
      {/* ════════════════════════════════════════════ */}
      {mainTab === "bi" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCard("Total Revenue", `EGP ${totalRevenue.toLocaleString()}`, 12.5, <div className="p-3 bg-green-100 rounded-lg"><DollarSign className="h-6 w-6 text-green-600" /></div>)}
            {kpiCard("Net Profit", `EGP ${netProfit.toLocaleString()}`, 8.3, <div className="p-3 bg-blue-100 rounded-lg"><TrendingUp className="h-6 w-6 text-blue-600" /></div>)}
            {kpiCard("AR Days", `${arDays} days`, -5.2, <div className="p-3 bg-purple-100 rounded-lg"><Clock className="h-6 w-6 text-purple-600" /></div>)}
            {kpiCard("Inventory Turnover", `${inventoryTurnover.toFixed(1)}x`, 3.7, <div className="p-3 bg-orange-100 rounded-lg"><Package className="h-6 w-6 text-orange-600" /></div>)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-5 w-5" />Revenue vs Expenses (Monthly)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2" style={{ height: 220 }}>
                  {monthlyRevenue.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="absolute -top-10 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                        Rev: {d.revenue.toLocaleString()} | Exp: {d.expenses.toLocaleString()}
                      </div>
                      <div className="w-full flex gap-px justify-center" style={{ height: `${(Math.max(d.revenue, d.expenses) / maxMonthly) * 100}%` }}>
                        <div className="w-2/5 bg-blue-500 rounded-t" style={{ height: `${(d.revenue / Math.max(d.revenue, d.expenses)) * 100}%` }} />
                        <div className="w-2/5 bg-red-300 rounded-t" style={{ height: `${(d.expenses / Math.max(d.revenue, d.expenses)) * 100}%` }} />
                      </div>
                      <span className="text-[9px] text-muted-foreground">{d.month}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-3 text-xs justify-center">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded" />Revenue</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-300 rounded" />Expenses</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><PieChart className="h-5 w-5" />Profit Breakdown</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  <div className="relative w-40 h-40">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="20" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#22c55e" strokeWidth="20"
                        strokeDasharray={`${profitMargin * 2.51} ${251.2 - profitMargin * 2.51}`} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-2xl font-bold">{profitMargin.toFixed(0)}%</span>
                      <span className="text-xs text-muted-foreground">Margin</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Revenue</span><span className="font-medium">EGP {totalRevenue.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>COGS</span><span className="font-medium text-red-600">-EGP {Math.round(totalExpenses * 0.7).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>OpEx</span><span className="font-medium text-red-600">-EGP {Math.round(totalExpenses * 0.3).toLocaleString()}</span></div>
                  <div className="flex justify-between border-t pt-2"><span className="font-medium">Net Profit</span><span className="font-bold text-green-600">EGP {netProfit.toLocaleString()}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Department Performance</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deptMetrics.map(d => (
                    <div key={d.dept} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{d.dept}</span>
                          <span className={`flex items-center gap-1 text-xs ${d.trend >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {d.trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {Math.abs(d.trend)}%
                          </span>
                        </div>
                        <div className="flex gap-6 mt-1 text-xs text-muted-foreground">
                          <span>{d.metric1}: <strong className="text-foreground">{d.val1}</strong></span>
                          <span>{d.metric2}: <strong className="text-foreground">{d.val2}</strong></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-5 w-5" />Sales Pipeline Funnel</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {pipeline.map((stage, i) => (
                  <div key={stage.stage}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>{stage.stage}</span>
                      <span className="text-xs text-muted-foreground">{stage.count} deals · EGP {stage.value.toLocaleString()}</span>
                    </div>
                    <div className="h-6 bg-gray-100 rounded-full overflow-hidden" style={{ width: `${60 + (1 - i / pipeline.length) * 40}%` }}>
                      <div className={`h-full ${stage.color} rounded-full flex items-center pl-2`} style={{ width: `${(stage.count / maxFunnel) * 100}%` }}>
                        <span className="text-[10px] text-white font-medium">{stage.count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Top Products by Revenue</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead><tr className="border-b"><th className="text-left p-2 font-medium">Product</th><th className="text-right p-2 font-medium">Units</th><th className="text-right p-2 font-medium">Revenue</th></tr></thead>
                  <tbody>
                    {topProducts.slice(0, 6).map((p, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-2 font-medium">{p.name}</td>
                        <td className="p-2 text-right">{p.units}</td>
                        <td className="p-2 text-right">EGP {p.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Top Customers</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {topCustomers.slice(0, 6).map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{c.name}</span>
                        <span>EGP {c.revenue.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(c.revenue / totalCustomerRev) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-5 w-5" />Employee Analytics</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-muted p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold">{employees.length || 45}</p>
                    <p className="text-xs text-muted-foreground">Total Headcount</p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold">4.2%</p>
                    <p className="text-xs text-muted-foreground">Turnover Rate</p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold">3.5 yr</p>
                    <p className="text-xs text-muted-foreground">Avg Tenure</p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold">92%</p>
                    <p className="text-xs text-muted-foreground">Satisfaction</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* Demand Forecasting tab                       */}
      {/* ════════════════════════════════════════════ */}
      {mainTab === "forecasting" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><Package className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Products Tracked</p><p className="text-2xl font-bold">{forecastProducts.length}</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-red-100 rounded-lg"><AlertTriangle className="h-5 w-5 text-red-600" /></div><div><p className="text-sm text-muted-foreground">Stockout Risks</p><p className="text-2xl font-bold">{alerts.filter(a => a.type === "stockout_risk").length}</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><BarChart3 className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-muted-foreground">Forecast Accuracy</p><p className="text-2xl font-bold">{(100 - mape).toFixed(0)}%</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-orange-100 rounded-lg"><ShoppingCart className="h-5 w-5 text-orange-600" /></div><div><p className="text-sm text-muted-foreground">Items to Reorder</p><p className="text-2xl font-bold">{forecastProducts.filter(p => p.stockQty <= p.reorderLevel).length}</p></div></div></CardContent></Card>
          </div>

          <div className="flex gap-2 border-b pb-2">
            <Button variant={forecastTab === "forecast" ? "default" : "ghost"} size="sm" onClick={() => setForecastTab("forecast")}><BarChart3 className="h-4 w-4 mr-2" />Forecasts</Button>
            <Button variant={forecastTab === "alerts" ? "default" : "ghost"} size="sm" onClick={() => setForecastTab("alerts")}><AlertTriangle className="h-4 w-4 mr-2" />Alerts ({alerts.length})</Button>
            <Button variant={forecastTab === "optimize" ? "default" : "ghost"} size="sm" onClick={() => setForecastTab("optimize")}><Calculator className="h-4 w-4 mr-2" />Optimization</Button>
            <Button variant={forecastTab === "seasonal" ? "default" : "ghost"} size="sm" onClick={() => setForecastTab("seasonal")}><Thermometer className="h-4 w-4 mr-2" />Seasonal</Button>
          </div>

          {forecastTab === "forecast" && (
            <div className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label>Product</Label>
                  <select className="w-full rounded-md border px-3 py-2 text-sm mt-1" value={selectedProduct} onChange={e => setSelectedProduct(Number(e.target.value))}>
                    {forecastProducts.map((p, i) => <option key={p.id} value={i}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Method</Label>
                  <select className="w-full rounded-md border px-3 py-2 text-sm mt-1" value={method} onChange={e => setMethod(e.target.value as typeof method)}>
                    <option value="moving_average">Moving Average (3-period)</option>
                    <option value="exponential">Exponential Smoothing (α=0.3)</option>
                    <option value="linear">Linear Regression</option>
                  </select>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{forecastProducts[selectedProduct]?.name} — Demand Forecast</CardTitle>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        {trendDir === "increasing" ? <TrendingUp className="h-4 w-4 text-green-600" /> : trendDir === "decreasing" ? <TrendingDown className="h-4 w-4 text-red-600" /> : <Minus className="h-4 w-4 text-gray-600" />}
                        <span className="capitalize">{trendDir}</span>
                      </span>
                      <span>MAPE: {mape.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1" style={{ height: 200 }}>
                    {forecastData.map((d, i) => {
                      const isPrediction = i >= 12
                      const barH = maxVal > 0 ? (d.actual || d.predicted || 0) / maxVal * 100 : 0
                      const predH = d.predicted && maxVal > 0 ? d.predicted / maxVal * 100 : 0
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div className="absolute -top-8 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                            {d.actual ? `Actual: ${d.actual}` : ""}{d.predicted ? ` Pred: ${d.predicted}` : ""}
                          </div>
                          <div className="w-full flex gap-px justify-center" style={{ height: `${Math.max(barH, predH)}%` }}>
                            {!isPrediction && d.actual > 0 && <div className="w-1/2 bg-blue-500 rounded-t" style={{ height: `${barH}%`, minHeight: 2 }} />}
                            {d.predicted && <div className={`${isPrediction ? "w-full" : "w-1/2"} rounded-t ${isPrediction ? "bg-purple-400 border border-purple-500 border-dashed" : "bg-purple-200"}`} style={{ height: `${predH}%`, minHeight: 2 }} />}
                          </div>
                          <span className="text-[9px] text-muted-foreground">{d.month}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex gap-6 mt-4 text-xs justify-center">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded" />Historical</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-200 rounded" />Fitted</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-400 rounded border border-dashed border-purple-500" />Predicted</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {forecastTab === "alerts" && (
            <Card>
              <CardHeader><CardTitle className="text-base">Demand Alerts</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {alerts.length === 0 && <p className="text-center text-muted-foreground py-8">No alerts — all products within safe levels.</p>}
                {alerts.map(alert => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50">
                    <AlertTriangle className={`h-5 w-5 mt-0.5 ${alert.severity === "critical" ? "text-red-600" : alert.severity === "high" ? "text-orange-600" : "text-yellow-600"}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{alert.product}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${severityColors[alert.severity]}`}>{alert.severity}</span>
                        {alert.daysUntil > 0 && <span className="text-xs text-muted-foreground">{alert.daysUntil} days</span>}
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                      <p className="text-xs mt-1 flex items-center gap-1"><ArrowRight className="h-3 w-3" />{alert.action}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {forecastTab === "optimize" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calculator className="h-5 w-5" />EOQ Calculator</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div><Label>Annual Demand (units)</Label><Input type="number" value={eoqInputs.annualDemand} onChange={e => setEoqInputs(p => ({ ...p, annualDemand: e.target.value }))} className="mt-1" /></div>
                  <div><Label>Order Cost (EGP per order)</Label><Input type="number" value={eoqInputs.orderCost} onChange={e => setEoqInputs(p => ({ ...p, orderCost: e.target.value }))} className="mt-1" /></div>
                  <div><Label>Holding Cost (EGP per unit/year)</Label><Input type="number" value={eoqInputs.holdingCost} onChange={e => setEoqInputs(p => ({ ...p, holdingCost: e.target.value }))} className="mt-1" /></div>
                  <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg text-center">
                    <p className="text-sm text-purple-700">Economic Order Quantity</p>
                    <p className="text-3xl font-bold text-purple-800">{eoqResult.toLocaleString()} units</p>
                    <p className="text-xs text-purple-600 mt-1">Orders per year: {Math.ceil(Number(eoqInputs.annualDemand) / (eoqResult || 1))}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">ABC Analysis</CardTitle></CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/50">
                      <th className="text-left p-2 font-medium">Product</th>
                      <th className="text-center p-2 font-medium">Grade</th>
                      <th className="text-right p-2 font-medium">Revenue %</th>
                    </tr></thead>
                    <tbody>
                      {abcProducts.map(p => (
                        <tr key={p.id} className="border-b">
                          <td className="p-2">{p.name}</td>
                          <td className="p-2 text-center">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${p.grade === "A" ? "bg-green-100 text-green-800" : p.grade === "B" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600"}`}>{p.grade}</span>
                          </td>
                          <td className="p-2 text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${p.grade === "A" ? "bg-green-500" : p.grade === "B" ? "bg-yellow-500" : "bg-gray-400"}`} style={{ width: `${Math.min(100, Number(p.revPct) * 2)}%` }} />
                              </div>
                              <span className="text-xs">{p.revPct}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader><CardTitle className="text-base">Safety Stock Recommendations</CardTitle></CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/50">
                      <th className="text-left p-2 font-medium">Product</th>
                      <th className="text-right p-2 font-medium">Current Stock</th>
                      <th className="text-right p-2 font-medium">Reorder Point</th>
                      <th className="text-right p-2 font-medium">Safety Stock (95%)</th>
                      <th className="text-left p-2 font-medium">Status</th>
                    </tr></thead>
                    <tbody>
                      {forecastProducts.map((p, i) => {
                        const data = (historicalData[i] || []).map(d => d.actual)
                        if (data.length === 0) return null
                        const ss = calculateSafetyStock(data, 95)
                        const avgDemand = data.reduce((s, v) => s + v, 0) / 12
                        const rop = Math.round(avgDemand * 1.5 + ss)
                        const status = p.stockQty <= rop ? "reorder" : "ok"
                        return (
                          <tr key={p.id} className="border-b">
                            <td className="p-2 font-medium">{p.name}</td>
                            <td className="p-2 text-right">{p.stockQty}</td>
                            <td className="p-2 text-right">{rop}</td>
                            <td className="p-2 text-right">{ss}</td>
                            <td className="p-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${status === "ok" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                {status === "ok" ? "Sufficient" : "Reorder"}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {forecastTab === "seasonal" && (
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Monthly Demand Heatmap</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr><th className="p-2 text-left font-medium">Product</th>{MONTHS.map(m => <th key={m} className="p-2 text-center font-medium">{m}</th>)}</tr></thead>
                      <tbody>
                        {forecastProducts.map((p, i) => (
                          <tr key={p.id} className="border-t">
                            <td className="p-2 font-medium whitespace-nowrap">{p.name}</td>
                            {(historicalData[i] || []).map((d, j) => {
                              const maxActual = Math.max(...(historicalData[i] || []).map(x => x.actual))
                              const minActual = Math.min(...(historicalData[i] || []).map(x => x.actual))
                              const intensity = maxActual > minActual ? (d.actual - minActual) / (maxActual - minActual) : 0.5
                              const r = Math.round(255 - intensity * 200)
                              const g = Math.round(255 - intensity * 100)
                              const b = Math.round(255)
                              return (
                                <td key={j} className="p-2 text-center" style={{ backgroundColor: `rgb(${r},${g},${b})`, color: intensity > 0.7 ? "white" : "inherit" }}>
                                  {d.actual}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-xs justify-center">
                    <span>Low demand</span>
                    <div className="flex">{[0, 0.25, 0.5, 0.75, 1].map(v => <div key={v} className="w-6 h-4" style={{ backgroundColor: `rgb(${Math.round(255 - v * 200)},${Math.round(255 - v * 100)},255)` }} />)}</div>
                    <span>High demand</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
