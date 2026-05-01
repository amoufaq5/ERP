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
import { useApiDataStore } from "@/lib/api/use-api-store"

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
  const store = useApiDataStore()

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
  const customers = (store.customers || []) as Record<string, unknown>[]
  const payments = (store.payments || []) as Record<string, unknown>[]
  const purchaseOrders = (store.purchaseOrders || []) as Record<string, unknown>[]
  const doctors = (store.doctors || []) as Record<string, unknown>[]
  const visits = (store.visits || []) as Record<string, unknown>[]
  const marketRequests = (store.marketRequests || []) as Record<string, unknown>[]
  const glAccounts = (store.glAccounts || []) as Record<string, unknown>[]
  const businessUnits = (store.businessUnits || []) as Record<string, unknown>[]

  /* ─── date helpers ─── */
  const now = useMemo(() => new Date(), [])

  const isInMonth = (dateStr: unknown, year: number, month: number): boolean => {
    if (!dateStr || typeof dateStr !== "string") return false
    const d = new Date(dateStr)
    return d.getFullYear() === year && d.getMonth() === month
  }

  const last6Months = useMemo(() => {
    const result: { label: string; year: number; month: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      result.push({
        label: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()],
        year: d.getFullYear(),
        month: d.getMonth(),
      })
    }
    return result
  }, [now])

  const thisMonthStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), [now])
  const thisQuarterStart = useMemo(() => new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1), [now])

  /* ─── BI computations ─── */

  // Revenue: sum of PAID invoices
  const totalRevenue = useMemo(() =>
    invoices
      .filter(inv => inv.status === "PAID")
      .reduce((s, inv) => s + (Number(inv.total) || 0), 0),
  [invoices])

  // Outstanding: sum of unpaid/overdue invoices
  const totalOutstanding = useMemo(() =>
    invoices
      .filter(inv => inv.status === "SENT" || inv.status === "PARTIAL" || inv.status === "OVERDUE")
      .reduce((s, inv) => s + (Number(inv.total) || 0), 0),
  [invoices])

  // Payments received vs sent
  const paymentsReceived = useMemo(() =>
    payments.filter(p => p.type === "RECEIVED").reduce((s, p) => s + (Number(p.amount) || 0), 0),
  [payments])

  const paymentsSent = useMemo(() =>
    payments.filter(p => p.type === "SENT").reduce((s, p) => s + (Number(p.amount) || 0), 0),
  [payments])

  // Total Expenses: sum of SENT payments + approved/ordered/received purchase orders
  const totalPOExpenses = useMemo(() =>
    purchaseOrders
      .filter(po => po.status === "APPROVED" || po.status === "ORDERED" || po.status === "RECEIVED")
      .reduce((s, po) => s + (Number(po.total) || 0), 0),
  [purchaseOrders])

  const totalExpenses = paymentsSent > 0 ? paymentsSent : totalPOExpenses > 0 ? totalPOExpenses : 0

  // COGS: sum of cost from invoice items (unitPrice on PO items as cost proxy)
  const cogs = useMemo(() => {
    const paidInvoices = invoices.filter(inv => inv.status === "PAID")
    // Approximate COGS by summing PO costs for received purchase orders
    const poTotal = purchaseOrders
      .filter(po => po.status === "RECEIVED")
      .reduce((s, po) => s + (Number(po.total) || 0), 0)
    // Fallback: if no PO data, estimate from GL EXPENSE accounts
    if (poTotal > 0) return poTotal
    const expenseAccounts = glAccounts.filter(a => a.type === "EXPENSE")
    const glExpenses = expenseAccounts.reduce((s, a) => s + (Number(a.balance) || 0), 0)
    if (glExpenses > 0) return glExpenses
    // Last fallback: use total expenses
    return totalExpenses > 0 ? totalExpenses : paidInvoices.length > 0 ? totalRevenue * 0.65 : 0
  }, [invoices, purchaseOrders, glAccounts, totalExpenses, totalRevenue])

  const grossProfit = totalRevenue - cogs
  const netProfit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
  const cashFlow = paymentsReceived - paymentsSent

  // Monthly revenue/expenses from actual invoice and payment dates (last 6 months)
  const monthlyRevenue = useMemo(() => {
    return last6Months.map(m => {
      const revenue = invoices
        .filter(inv => inv.status === "PAID" && isInMonth(inv.date, m.year, m.month))
        .reduce((s, inv) => s + (Number(inv.total) || 0), 0)
      const expenses = payments
        .filter(p => p.type === "SENT" && isInMonth(p.date, m.year, m.month))
        .reduce((s, p) => s + (Number(p.amount) || 0), 0)
      // Fallback: if no monthly data but we have totals, distribute evenly
      return { month: m.label, revenue, expenses }
    })
  }, [invoices, payments, last6Months])

  // If all monthly data is zero but we have totals, create a distributed view
  const hasMonthlyData = monthlyRevenue.some(m => m.revenue > 0 || m.expenses > 0)
  const displayMonthlyRevenue = useMemo(() => {
    if (hasMonthlyData) return monthlyRevenue
    if (totalRevenue === 0 && totalExpenses === 0) return monthlyRevenue
    // Distribute totals across last 6 months as fallback
    return monthlyRevenue.map((m, i) => ({
      ...m,
      revenue: Math.round(totalRevenue / 6),
      expenses: Math.round(totalExpenses / 6),
    }))
  }, [hasMonthlyData, monthlyRevenue, totalRevenue, totalExpenses])

  const maxMonthly = Math.max(...displayMonthlyRevenue.map(d => Math.max(d.revenue, d.expenses)), 1)

  // Top products by actual invoice line revenue
  const topProducts = useMemo(() => {
    const productRevMap = new Map<string, { name: string; revenue: number; units: number }>()
    // Build a product name lookup
    const productNameMap = new Map<string, string>()
    products.forEach(p => productNameMap.set(String(p.id), String(p.name || "Unknown")))

    // Sum revenue from paid invoice items
    invoices.filter(inv => inv.status === "PAID").forEach(inv => {
      const items = Array.isArray(inv.items) ? inv.items as { productId: string; quantity: number; total: number }[] : []
      items.forEach(item => {
        const existing = productRevMap.get(item.productId) || {
          name: productNameMap.get(item.productId) || item.productId,
          revenue: 0,
          units: 0,
        }
        existing.revenue += Number(item.total) || 0
        existing.units += Number(item.quantity) || 0
        productRevMap.set(item.productId, existing)
      })
    })

    const result = Array.from(productRevMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8)
    // Fallback: if no invoice items data, show products with stock value
    if (result.length === 0 && products.length > 0) {
      return products.slice(0, 8).map((p, i) => ({
        name: String(p.name || `Product ${i + 1}`),
        revenue: 0,
        units: Number(p.stockQty) || 0,
      }))
    }
    return result
  }, [invoices, products])

  // Top customers by paid invoice totals
  const topCustomers = useMemo(() => {
    const customerRevMap = new Map<string, { name: string; revenue: number }>()
    const customerNameMap = new Map<string, string>()
    customers.forEach(c => customerNameMap.set(String(c.id), String(c.name || "Unknown")))

    invoices.filter(inv => inv.status === "PAID").forEach(inv => {
      const custId = String(inv.customerId || "")
      if (!custId) return
      const existing = customerRevMap.get(custId) || {
        name: customerNameMap.get(custId) || custId,
        revenue: 0,
      }
      existing.revenue += Number(inv.total) || 0
      customerRevMap.set(custId, existing)
    })

    const result = Array.from(customerRevMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10)
    // Fallback: if no paid invoices, show customers with outstanding
    if (result.length === 0 && customers.length > 0) {
      return customers.slice(0, 10).map((c, i) => ({
        name: String(c.name || `Customer ${i + 1}`),
        revenue: Number(c.outstanding) || 0,
      }))
    }
    return result
  }, [invoices, customers])

  const totalCustomerRev = topCustomers.reduce((s, c) => s + c.revenue, 0) || 1

  // Sales pipeline from sales orders by status
  const pipeline = useMemo(() => {
    const stageMap: Record<string, { count: number; value: number }> = {
      Draft: { count: 0, value: 0 },
      Confirmed: { count: 0, value: 0 },
      Processing: { count: 0, value: 0 },
      Shipped: { count: 0, value: 0 },
      Delivered: { count: 0, value: 0 },
    }
    const statusToStage: Record<string, string> = {
      DRAFT: "Draft",
      CONFIRMED: "Confirmed",
      PROCESSING: "Processing",
      SHIPPED: "Shipped",
      DELIVERED: "Delivered",
      INVOICED: "Delivered",
    }
    salesOrders.forEach(so => {
      const stage = statusToStage[String(so.status)] || "Draft"
      if (stageMap[stage]) {
        stageMap[stage].count += 1
        stageMap[stage].value += Number(so.total) || 0
      }
    })

    const colors = ["bg-blue-500", "bg-indigo-500", "bg-purple-500", "bg-violet-500", "bg-green-500"]
    const result = Object.entries(stageMap).map(([stage, data], i) => ({
      stage,
      count: data.count,
      value: data.value,
      color: colors[i] || "bg-gray-500",
    })).filter(s => s.count > 0)

    // Fallback: if no sales orders, show empty pipeline
    if (result.length === 0) {
      return [
        { stage: "Draft", count: 0, value: 0, color: "bg-blue-500" },
        { stage: "Confirmed", count: 0, value: 0, color: "bg-indigo-500" },
        { stage: "Processing", count: 0, value: 0, color: "bg-purple-500" },
        { stage: "Shipped", count: 0, value: 0, color: "bg-violet-500" },
        { stage: "Delivered", count: 0, value: 0, color: "bg-green-500" },
      ]
    }
    return result
  }, [salesOrders])

  const maxFunnel = Math.max(...pipeline.map(s => s.count), 1)

  // Stock value & low stock
  const stockValue = useMemo(() =>
    products.reduce((s, p) => s + ((Number(p.stockQty) || 0) * (Number(p.pricePerUnit) || 0)), 0),
  [products])

  const lowStockCount = useMemo(() =>
    products.filter(p => (Number(p.stockQty) || 0) < (Number(p.reorderLevel) || 0) && (Number(p.reorderLevel) || 0) > 0).length,
  [products])

  // Inventory turnover: COGS / average inventory value
  const inventoryTurnover = stockValue > 0 ? cogs / stockValue : 0

  // AR Days: (outstanding receivables / total revenue) * 365
  const arDays = totalRevenue > 0 ? Math.round((totalOutstanding / totalRevenue) * 365) : 0

  // Active headcount
  const activeEmployees = useMemo(() =>
    employees.filter(e => e.status === "ACTIVE"),
  [employees])

  const headcount = activeEmployees.length

  // New hires this quarter
  const newHiresThisQuarter = useMemo(() =>
    employees.filter(e => {
      const hd = e.hireDate ? new Date(String(e.hireDate)) : null
      return hd && hd >= thisQuarterStart && hd <= now
    }).length,
  [employees, thisQuarterStart, now])

  // Average salary
  const avgSalary = useMemo(() => {
    if (activeEmployees.length === 0) return 0
    return Math.round(activeEmployees.reduce((s, e) => s + (Number(e.salary) || 0), 0) / activeEmployees.length)
  }, [activeEmployees])

  // Average tenure in years
  const avgTenure = useMemo(() => {
    if (activeEmployees.length === 0) return 0
    const totalMonths = activeEmployees.reduce((s, e) => {
      const hd = e.hireDate ? new Date(String(e.hireDate)) : null
      if (!hd) return s
      const diffMs = now.getTime() - hd.getTime()
      return s + diffMs / (1000 * 60 * 60 * 24 * 365.25)
    }, 0)
    return totalMonths / activeEmployees.length
  }, [activeEmployees, now])

  // Terminated ratio (turnover proxy)
  const terminatedCount = useMemo(() =>
    employees.filter(e => e.status === "TERMINATED").length,
  [employees])
  const turnoverRate = employees.length > 0 ? ((terminatedCount / employees.length) * 100) : 0

  // Doctor coverage: doctors with visits this month / total doctors
  const doctorCoverage = useMemo(() => {
    if (doctors.length === 0) return 0
    const visitedDoctorIds = new Set(
      visits
        .filter(v => {
          const vd = v.dateTime ? new Date(String(v.dateTime)) : null
          return vd && vd >= thisMonthStart && vd <= now
        })
        .map(v => String(v.doctorId))
    )
    return Math.round((visitedDoctorIds.size / doctors.length) * 100)
  }, [doctors, visits, thisMonthStart, now])

  // Average calls per day this month
  const avgCallsPerDay = useMemo(() => {
    const visitsThisMonth = visits.filter(v => {
      const vd = v.dateTime ? new Date(String(v.dateTime)) : null
      return vd && vd >= thisMonthStart && vd <= now
    }).length
    const daysSoFar = Math.max(1, Math.ceil((now.getTime() - thisMonthStart.getTime()) / (1000 * 60 * 60 * 24)))
    // Approximate working days (weekdays) = daysSoFar * 5/7
    const workingDays = Math.max(1, Math.round(daysSoFar * 5 / 7))
    return visitsThisMonth > 0 ? (visitsThisMonth / workingDays).toFixed(1) : "0"
  }, [visits, thisMonthStart, now])

  // Sample requests fulfilled
  const samplesFulfilled = useMemo(() =>
    marketRequests.filter(mr => mr.type === "SAMPLE" && mr.status === "FULFILLED").length,
  [marketRequests])

  // Collections from payments received
  const totalCollections = paymentsReceived

  // Department metrics computed from real data
  const deptMetrics = useMemo(() => {
    const soRevenue = salesOrders
      .filter(so => so.status === "DELIVERED" || so.status === "INVOICED")
      .reduce((s, so) => s + (Number(so.total) || 0), 0)

    return [
      { dept: "Sales", metric1: "Revenue", val1: `EGP ${soRevenue.toLocaleString()}`, metric2: "Orders", val2: String(salesOrders.length), trend: salesOrders.length > 0 ? 0 : 0 },
      { dept: "Finance", metric1: "Collections", val1: `EGP ${totalCollections.toLocaleString()}`, metric2: "Invoices", val2: String(invoices.length), trend: invoices.length > 0 ? 0 : 0 },
      { dept: "HR", metric1: "Headcount", val1: String(headcount), metric2: "New Hires (Q)", val2: String(newHiresThisQuarter), trend: newHiresThisQuarter > 0 ? newHiresThisQuarter : 0 },
      { dept: "Supply Chain", metric1: "SKUs", val1: String(products.length), metric2: "Low Stock", val2: String(lowStockCount), trend: lowStockCount > 0 ? -lowStockCount : 0 },
    ]
  }, [salesOrders, totalCollections, invoices, headcount, newHiresThisQuarter, products, lowStockCount])

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
            {kpiCard("Total Revenue", `EGP ${totalRevenue.toLocaleString()}`, cashFlow > 0 ? (cashFlow / (totalRevenue || 1)) * 100 : 0, <div className="p-3 bg-green-100 rounded-lg"><DollarSign className="h-6 w-6 text-green-600" /></div>)}
            {kpiCard("Net Profit", `EGP ${netProfit.toLocaleString()}`, profitMargin, <div className="p-3 bg-blue-100 rounded-lg"><TrendingUp className="h-6 w-6 text-blue-600" /></div>)}
            {kpiCard("AR Days", `${arDays} days`, arDays > 0 ? -arDays / 30 : 0, <div className="p-3 bg-purple-100 rounded-lg"><Clock className="h-6 w-6 text-purple-600" /></div>)}
            {kpiCard("Inventory Turnover", `${inventoryTurnover.toFixed(1)}x`, inventoryTurnover, <div className="p-3 bg-orange-100 rounded-lg"><Package className="h-6 w-6 text-orange-600" /></div>)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-5 w-5" />Revenue vs Expenses (Monthly)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2" style={{ height: 220 }}>
                  {displayMonthlyRevenue.map((d, i) => (
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
                  <div className="flex justify-between"><span>COGS</span><span className="font-medium text-red-600">-EGP {Math.round(cogs).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Gross Profit</span><span className="font-medium text-green-600">EGP {Math.round(grossProfit).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Other Expenses</span><span className="font-medium text-red-600">-EGP {Math.round(Math.max(0, totalExpenses - cogs)).toLocaleString()}</span></div>
                  <div className="flex justify-between border-t pt-2"><span className="font-medium">Net Profit</span><span className={`font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>EGP {netProfit.toLocaleString()}</span></div>
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
                    <p className="text-3xl font-bold">{headcount || 0}</p>
                    <p className="text-xs text-muted-foreground">Active Headcount</p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold">{turnoverRate > 0 ? `${turnoverRate.toFixed(1)}%` : "N/A"}</p>
                    <p className="text-xs text-muted-foreground">Turnover Rate</p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold">{avgTenure > 0 ? `${avgTenure.toFixed(1)} yr` : "N/A"}</p>
                    <p className="text-xs text-muted-foreground">Avg Tenure</p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold">{avgSalary > 0 ? `EGP ${avgSalary.toLocaleString()}` : "N/A"}</p>
                    <p className="text-xs text-muted-foreground">Avg Salary</p>
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
