"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import DataTable from "@/components/shared/data-table"
import type { Column } from "@/components/shared/data-table"
import {
  ArrowRight,
  Activity,
  CheckCircle2,
  Clock,
  FileText,
  Package,
  ShoppingCart,
  AlertTriangle,
  Zap,
  Play,
  BarChart3,
  Receipt,
  CalendarCheck,
  UserX,
  RefreshCw,
} from "lucide-react"
import { useCrossModuleActions } from "@/lib/cross-module-actions"
import { useApiDataStore } from "@/lib/api/use-api-store"

// ─── Integration Flow Definitions ───────────────────────────────────────────

interface IntegrationFlow {
  id: string
  name: string
  sourceModule: string
  targetModule: string
  trigger: string
  description: string
  icon: React.ReactNode
  active: boolean
  executionCount: number
  lastTriggered: string | null
  actionKey: string
}

const INITIAL_FLOWS: IntegrationFlow[] = [
  {
    id: "flow-1",
    name: "Expense to Journal Entry",
    sourceModule: "Market Requests",
    targetModule: "Accounting (GL)",
    trigger: "Expense request approved",
    description: "Automatically creates a General Ledger journal entry (Debit: 6500 Field Expenses, Credit: 1000 Cash/Bank) when a field expense is approved.",
    icon: <Receipt className="h-5 w-5" />,
    active: true,
    executionCount: 47,
    lastTriggered: "2026-04-30T14:22:00Z",
    actionKey: "onExpenseApproved",
  },
  {
    id: "flow-2",
    name: "Sample Request to Purchase Order",
    sourceModule: "Market Requests",
    targetModule: "Procurement",
    trigger: "Sample request approved",
    description: "Creates a DRAFT purchase order for the requested product samples, linked to a GMP-certified supplier, when a sample request is approved.",
    icon: <ShoppingCart className="h-5 w-5" />,
    active: true,
    executionCount: 32,
    lastTriggered: "2026-04-29T11:05:00Z",
    actionKey: "onSampleRequestApproved",
  },
  {
    id: "flow-3",
    name: "PO Received to Stock Update",
    sourceModule: "Procurement",
    targetModule: "Inventory",
    trigger: "PO status changed to RECEIVED",
    description: "Creates a Goods Receipt Note and updates product stock quantities when a purchase order is marked as received.",
    icon: <Package className="h-5 w-5" />,
    active: true,
    executionCount: 18,
    lastTriggered: "2026-04-28T09:30:00Z",
    actionKey: "onPOReceived",
  },
  {
    id: "flow-4",
    name: "Overdue Invoice to Ticket",
    sourceModule: "Billing",
    targetModule: "Tasks",
    trigger: "Invoice past due date",
    description: "Creates a collection follow-up task with priority based on amount and days overdue when an invoice passes its due date.",
    icon: <AlertTriangle className="h-5 w-5" />,
    active: true,
    executionCount: 12,
    lastTriggered: "2026-04-30T08:00:00Z",
    actionKey: "onInvoiceOverdue",
  },
  {
    id: "flow-5",
    name: "Low Stock to PO Suggestion",
    sourceModule: "Inventory",
    targetModule: "Procurement",
    trigger: "Stock below reorder level",
    description: "Creates a DRAFT purchase order suggestion when product stock falls below its configured reorder level. Order quantity is 2x reorder level.",
    icon: <BarChart3 className="h-5 w-5" />,
    active: true,
    executionCount: 8,
    lastTriggered: "2026-04-27T16:45:00Z",
    actionKey: "onLowStockDetected",
  },
  {
    id: "flow-6",
    name: "Sales Order to Invoice",
    sourceModule: "Sales",
    targetModule: "Billing",
    trigger: "Sales order confirmed",
    description: "Creates a draft invoice with 14% VAT calculation from a confirmed sales order, copying all line items.",
    icon: <FileText className="h-5 w-5" />,
    active: true,
    executionCount: 23,
    lastTriggered: "2026-04-30T10:15:00Z",
    actionKey: "onSalesOrderConfirmed",
  },
  {
    id: "flow-7",
    name: "Event Request to Project Task",
    sourceModule: "Market Requests",
    targetModule: "Projects",
    trigger: "Event request approved",
    description: "Creates project tasks for approved event market requests such as CME sponsorships, symposiums, and product launches.",
    icon: <CalendarCheck className="h-5 w-5" />,
    active: true,
    executionCount: 5,
    lastTriggered: "2026-04-25T13:20:00Z",
    actionKey: "onEventRequestApproved",
  },
  {
    id: "flow-8",
    name: "Termination to Asset Recovery",
    sourceModule: "HR",
    targetModule: "Tasks",
    trigger: "Employee status set to TERMINATED",
    description: "Creates an urgent asset-recovery and access-revocation task when an employee is terminated.",
    icon: <UserX className="h-5 w-5" />,
    active: false,
    executionCount: 2,
    lastTriggered: "2026-04-15T09:00:00Z",
    actionKey: "onEmployeeTerminated",
  },
]

// ─── Execution Log Seed Data ────────────────────────────────────────────────

interface ExecutionLog {
  id: string
  flowId: string
  flowName: string
  sourceModule: string
  targetModule: string
  status: "success" | "failed" | "skipped"
  triggeredAt: string
  duration: string
  details: string
}

const SEED_LOGS: ExecutionLog[] = [
  { id: "log-01", flowId: "flow-1", flowName: "Expense to Journal Entry", sourceModule: "Market Requests", targetModule: "Accounting (GL)", status: "success", triggeredAt: "2026-04-30T14:22:00Z", duration: "120ms", details: "Created JE-2026-0009 for field expense EGP 35,000 (CME sponsorship at Cleopatra Hospital)" },
  { id: "log-02", flowId: "flow-6", flowName: "Sales Order to Invoice", sourceModule: "Sales", targetModule: "Billing", status: "success", triggeredAt: "2026-04-30T10:15:00Z", duration: "85ms", details: "Created INV-2026-0003 from SO-2026-0002 for Seif Pharmacies, total EGP 21,660" },
  { id: "log-03", flowId: "flow-4", flowName: "Overdue Invoice to Ticket", sourceModule: "Billing", targetModule: "Tasks", status: "success", triggeredAt: "2026-04-30T08:00:00Z", duration: "65ms", details: "Created HIGH priority ticket for INV-2026-0001 (El-Ezaby Pharmacies, 30 days overdue)" },
  { id: "log-04", flowId: "flow-1", flowName: "Expense to Journal Entry", sourceModule: "Market Requests", targetModule: "Accounting (GL)", status: "success", triggeredAt: "2026-04-29T16:40:00Z", duration: "110ms", details: "Created JE-2026-0008 for field expense EGP 12,500 (sample distribution logistics)" },
  { id: "log-05", flowId: "flow-2", flowName: "Sample Request to Purchase Order", sourceModule: "Market Requests", targetModule: "Procurement", status: "success", triggeredAt: "2026-04-29T11:05:00Z", duration: "95ms", details: "Created PO-2026-0005 for Cardioprex 500mg samples (qty: 20) from Sun Pharma API" },
  { id: "log-06", flowId: "flow-3", flowName: "PO Received to Stock Update", sourceModule: "Procurement", targetModule: "Inventory", status: "success", triggeredAt: "2026-04-28T09:30:00Z", duration: "180ms", details: "GRN-2026-0002 created. Updated Cardioprex stock: 12,000 +5,000 = 17,000 units" },
  { id: "log-07", flowId: "flow-5", flowName: "Low Stock to PO Suggestion", sourceModule: "Inventory", targetModule: "Procurement", status: "skipped", triggeredAt: "2026-04-28T08:00:00Z", duration: "30ms", details: "Glargin-Long 100U/ml: existing DRAFT PO already covers this product, skipping duplicate" },
  { id: "log-08", flowId: "flow-5", flowName: "Low Stock to PO Suggestion", sourceModule: "Inventory", targetModule: "Procurement", status: "success", triggeredAt: "2026-04-27T16:45:00Z", duration: "105ms", details: "Created PO-2026-0006 for Glargin-Long reorder (qty: 1,000 units) — stock at 2,000 vs reorder 500" },
  { id: "log-09", flowId: "flow-7", flowName: "Event Request to Project Task", sourceModule: "Market Requests", targetModule: "Projects", status: "success", triggeredAt: "2026-04-25T13:20:00Z", duration: "70ms", details: "Created project task: CME cardiology event at Cleopatra Hospital, assigned to Sarah Johnson" },
  { id: "log-10", flowId: "flow-1", flowName: "Expense to Journal Entry", sourceModule: "Market Requests", targetModule: "Accounting (GL)", status: "failed", triggeredAt: "2026-04-24T15:10:00Z", duration: "45ms", details: "Failed: expense amount is 0 or negative — no journal entry created" },
  { id: "log-11", flowId: "flow-6", flowName: "Sales Order to Invoice", sourceModule: "Sales", targetModule: "Billing", status: "skipped", triggeredAt: "2026-04-24T09:30:00Z", duration: "20ms", details: "SO-2026-0001 already has linked invoice INV-2026-0001, skipping duplicate" },
  { id: "log-12", flowId: "flow-4", flowName: "Overdue Invoice to Ticket", sourceModule: "Billing", targetModule: "Tasks", status: "success", triggeredAt: "2026-04-23T08:00:00Z", duration: "72ms", details: "Created MEDIUM priority ticket for INV-2026-0002 (Seif Pharmacies, 8 days overdue)" },
  { id: "log-13", flowId: "flow-2", flowName: "Sample Request to Purchase Order", sourceModule: "Market Requests", targetModule: "Procurement", status: "success", triggeredAt: "2026-04-22T14:15:00Z", duration: "88ms", details: "Created PO-2026-0004 for Diabetex XR samples (qty: 50) from Sun Pharma API" },
  { id: "log-14", flowId: "flow-3", flowName: "PO Received to Stock Update", sourceModule: "Procurement", targetModule: "Inventory", status: "success", triggeredAt: "2026-04-21T10:45:00Z", duration: "165ms", details: "GRN-2026-0001 created. Updated Antibio-Z stock: 20,000 +10,000 = 30,000 units" },
  { id: "log-15", flowId: "flow-8", flowName: "Termination to Asset Recovery", sourceModule: "HR", targetModule: "Tasks", status: "success", triggeredAt: "2026-04-15T09:00:00Z", duration: "55ms", details: "Created asset recovery task for Robert Wilson (EMP-005): laptop, ID badge, vehicle keys" },
  { id: "log-16", flowId: "flow-1", flowName: "Expense to Journal Entry", sourceModule: "Market Requests", targetModule: "Accounting (GL)", status: "success", triggeredAt: "2026-04-14T11:30:00Z", duration: "115ms", details: "Created JE-2026-0007 for field expense EGP 8,200 (literature printing for endocrinologists)" },
  { id: "log-17", flowId: "flow-6", flowName: "Sales Order to Invoice", sourceModule: "Sales", targetModule: "Billing", status: "success", triggeredAt: "2026-04-12T09:00:00Z", duration: "90ms", details: "Created INV-2026-0002 from SO-2026-0001 for El-Ezaby Pharmacies, total EGP 48,564" },
  { id: "log-18", flowId: "flow-2", flowName: "Sample Request to Purchase Order", sourceModule: "Market Requests", targetModule: "Procurement", status: "success", triggeredAt: "2026-04-10T13:50:00Z", duration: "92ms", details: "Created PO-2026-0003 for Paraflu Junior Syrup samples (qty: 30) from BASF Pharma" },
  { id: "log-19", flowId: "flow-5", flowName: "Low Stock to PO Suggestion", sourceModule: "Inventory", targetModule: "Procurement", status: "success", triggeredAt: "2026-04-08T16:00:00Z", duration: "100ms", details: "Created PO suggestion for Metoprolax 50mg — stock 15,000 near reorder level 4,000" },
  { id: "log-20", flowId: "flow-7", flowName: "Event Request to Project Task", sourceModule: "Market Requests", targetModule: "Projects", status: "success", triggeredAt: "2026-04-05T10:30:00Z", duration: "68ms", details: "Created project task: Diabetes awareness seminar at Dar Al Fouad Hospital" },
]

// ─── Helper to format timestamps ────────────────────────────────────────────

function formatTimestamp(iso: string | null): string {
  if (!iso) return "Never"
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString("en-EG", { month: "short", day: "numeric", year: "numeric" })
}

// ─── Status badge helper ────────────────────────────────────────────────────

function logStatusBadge(status: ExecutionLog["status"]) {
  switch (status) {
    case "success":
      return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Success</Badge>
    case "failed":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Failed</Badge>
    case "skipped":
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Skipped</Badge>
  }
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function IntegrationHubPage() {
  const [flows, setFlows] = useState<IntegrationFlow[]>(INITIAL_FLOWS)
  const [detailFlow, setDetailFlow] = useState<IntegrationFlow | null>(null)
  const [triggerResult, setTriggerResult] = useState<{
    flowId: string
    message: string
    status: "success" | "error"
  } | null>(null)

  const store = useApiDataStore()
  const actions = useCrossModuleActions()

  // ── Computed stats ──

  const activeCount = flows.filter((f) => f.active).length
  const totalExecutions = flows.reduce((sum, f) => sum + f.executionCount, 0)
  const successCount = SEED_LOGS.filter((l) => l.status === "success").length
  const failedCount = SEED_LOGS.filter((l) => l.status === "failed").length
  const successRate = SEED_LOGS.length > 0 ? Math.round((successCount / SEED_LOGS.length) * 100) : 0

  // ── Toggle flow active state ──

  function toggleFlow(flowId: string) {
    setFlows((prev) =>
      prev.map((f) => (f.id === flowId ? { ...f, active: !f.active } : f))
    )
  }

  // ── Manual trigger ──

  function handleManualTrigger(flow: IntegrationFlow) {
    try {
      switch (flow.actionKey) {
        case "onExpenseApproved": {
          const expense = store.marketRequests.find(
            (mr) => mr.status === "APPROVED" && mr.amount && mr.amount > 0
          )
          if (!expense) {
            setTriggerResult({ flowId: flow.id, message: "No approved expense found to process.", status: "error" })
            return
          }
          actions.onExpenseApproved(expense)
          setTriggerResult({ flowId: flow.id, message: `Journal entry created for expense "${expense.description?.slice(0, 40)}..."`, status: "success" })
          break
        }
        case "onSampleRequestApproved": {
          const request = store.marketRequests.find(
            (mr) => mr.type === "SAMPLE" && mr.status === "APPROVED" && mr.productId
          )
          if (!request) {
            // Try any SAMPLE request regardless of status for testing
            const anyReq = store.marketRequests.find((mr) => mr.type === "SAMPLE" && mr.productId)
            if (!anyReq) {
              setTriggerResult({ flowId: flow.id, message: "No sample request found to process.", status: "error" })
              return
            }
            actions.onSampleRequestApproved(anyReq)
            setTriggerResult({ flowId: flow.id, message: `Purchase order created for sample request "${anyReq.description?.slice(0, 40)}..."`, status: "success" })
            break
          }
          actions.onSampleRequestApproved(request)
          setTriggerResult({ flowId: flow.id, message: `Purchase order created for sample request "${request.description?.slice(0, 40)}..."`, status: "success" })
          break
        }
        case "onPOReceived": {
          const po = store.purchaseOrders.find((p) => p.status === "APPROVED" || p.status === "ORDERED")
          if (!po) {
            setTriggerResult({ flowId: flow.id, message: "No eligible PO found (needs APPROVED or ORDERED status).", status: "error" })
            return
          }
          actions.onPOReceived(po)
          setTriggerResult({ flowId: flow.id, message: `Inventory updated from ${po.number}. GRN created.`, status: "success" })
          break
        }
        case "onInvoiceOverdue": {
          const today = new Date()
          const overdueInv = store.invoices.find((inv) => {
            if (inv.status === "PAID" || inv.status === "VOID") return false
            return new Date(inv.dueDate) < today
          })
          if (!overdueInv) {
            setTriggerResult({ flowId: flow.id, message: "No overdue invoices found.", status: "error" })
            return
          }
          actions.onInvoiceOverdue(overdueInv)
          setTriggerResult({ flowId: flow.id, message: `Collection ticket created for ${overdueInv.number}.`, status: "success" })
          break
        }
        case "onLowStockDetected": {
          const lowProduct = store.products.find((p) => p.stockQty < p.reorderLevel)
          if (!lowProduct) {
            setTriggerResult({ flowId: flow.id, message: "All products are above reorder level.", status: "error" })
            return
          }
          actions.onLowStockDetected(lowProduct)
          setTriggerResult({ flowId: flow.id, message: `PO suggestion created for ${lowProduct.name} (stock: ${lowProduct.stockQty}, reorder: ${lowProduct.reorderLevel}).`, status: "success" })
          break
        }
        case "onSalesOrderConfirmed": {
          const so = store.salesOrders.find((s) => s.status === "CONFIRMED" && !s.invoiceId)
          if (!so) {
            setTriggerResult({ flowId: flow.id, message: "No confirmed sales orders without invoices found.", status: "error" })
            return
          }
          actions.onSalesOrderConfirmed(so)
          setTriggerResult({ flowId: flow.id, message: `Draft invoice created from ${so.number}.`, status: "success" })
          break
        }
        case "onEventRequestApproved": {
          const event = store.marketRequests.find(
            (mr) => mr.type === "EVENT" && (mr.status === "APPROVED" || mr.status === "PENDING")
          )
          if (!event) {
            setTriggerResult({ flowId: flow.id, message: "No event requests found to process.", status: "error" })
            return
          }
          actions.onEventRequestApproved(event)
          setTriggerResult({ flowId: flow.id, message: `Project task created for event "${event.description?.slice(0, 40)}..."`, status: "success" })
          break
        }
        case "onEmployeeTerminated": {
          const emp = store.employees.find((e) => e.status === "TERMINATED")
          if (!emp) {
            setTriggerResult({ flowId: flow.id, message: "No terminated employees found.", status: "error" })
            return
          }
          actions.onEmployeeTerminated(emp)
          setTriggerResult({ flowId: flow.id, message: `Asset recovery task created for ${emp.name}.`, status: "success" })
          break
        }
        default:
          setTriggerResult({ flowId: flow.id, message: "Unknown action.", status: "error" })
      }

      // Increment execution count
      setFlows((prev) =>
        prev.map((f) =>
          f.id === flow.id
            ? { ...f, executionCount: f.executionCount + 1, lastTriggered: new Date().toISOString() }
            : f
        )
      )
    } catch (err: any) {
      setTriggerResult({ flowId: flow.id, message: `Error: ${err?.message ?? "Unknown error"}`, status: "error" })
    }
  }

  // ── Log table columns ──

  const logColumns: Column<ExecutionLog>[] = [
    {
      key: "triggeredAt",
      label: "Time",
      sortable: true,
      render: (val: string) => <span className="text-sm text-muted-foreground whitespace-nowrap">{formatDateTime(val)}</span>,
    },
    {
      key: "flowName",
      label: "Integration",
      sortable: true,
      render: (val: string) => <span className="font-medium text-sm">{val}</span>,
    },
    {
      key: "sourceModule",
      label: "Flow",
      render: (_: string, row: ExecutionLog) => (
        <div className="flex items-center gap-1 text-xs">
          <span>{row.sourceModule}</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span>{row.targetModule}</span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (val: ExecutionLog["status"]) => logStatusBadge(val),
    },
    {
      key: "duration",
      label: "Duration",
      render: (val: string) => <span className="text-sm text-muted-foreground">{val}</span>,
    },
    {
      key: "details",
      label: "Details",
      className: "max-w-[400px]",
      render: (val: string) => (
        <span className="text-sm text-muted-foreground line-clamp-2">{val}</span>
      ),
    },
  ]

  // ── KPI Cards ──

  const kpis = [
    { title: "Active Flows", value: activeCount.toString(), sub: `of ${flows.length} total`, icon: <Zap className="h-5 w-5 text-blue-600" /> },
    { title: "Total Executions", value: (totalExecutions ?? 0).toLocaleString(), sub: "All time", icon: <Activity className="h-5 w-5 text-emerald-600" /> },
    { title: "Success Rate", value: `${successRate}%`, sub: `${successCount} of ${SEED_LOGS.length} recent`, icon: <CheckCircle2 className="h-5 w-5 text-green-600" /> },
    { title: "Failed", value: failedCount.toString(), sub: "Last 20 executions", icon: <AlertTriangle className="h-5 w-5 text-red-500" /> },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cross-Module Integration Hub</h1>
          <p className="text-muted-foreground">
            Automated flows connecting Pharma ERP modules -- expenses, procurement, inventory, billing, and more
          </p>
        </div>
        <Button variant="outline" onClick={() => setTriggerResult(null)}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.sub}</p>
                </div>
                <div className="rounded-lg bg-muted p-2.5">{kpi.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trigger result toast */}
      {triggerResult && (
        <Card className={triggerResult.status === "success" ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}>
          <CardContent className="p-4 flex items-center gap-3">
            {triggerResult.status === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            )}
            <p className="text-sm">{triggerResult.message}</p>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setTriggerResult(null)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="flows" className="space-y-4">
        <TabsList>
          <TabsTrigger value="flows">Integration Flows</TabsTrigger>
          <TabsTrigger value="logs">Execution Log</TabsTrigger>
        </TabsList>

        {/* ── Flows Tab ── */}
        <TabsContent value="flows" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {flows.map((flow) => (
              <Card key={flow.id} className={!flow.active ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg p-2 ${flow.active ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"}`}>
                        {flow.icon}
                      </div>
                      <div>
                        <CardTitle className="text-base">{flow.name}</CardTitle>
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <span className="font-medium">{flow.sourceModule}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="font-medium">{flow.targetModule}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={flow.active}
                        onCheckedChange={() => toggleFlow(flow.id)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-xs">
                      <Clock className="mr-1 h-3 w-3" />
                      {flow.trigger}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Activity className="h-3.5 w-3.5" />
                        {flow.executionCount} runs
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatTimestamp(flow.lastTriggered)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDetailFlow(flow)}
                      >
                        Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!flow.active}
                        onClick={() => handleManualTrigger(flow)}
                      >
                        <Play className="mr-1 h-3.5 w-3.5" />
                        Test
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Logs Tab ── */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Execution Log</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={logColumns} data={SEED_LOGS} pagination />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Detail Dialog ── */}
      <Dialog open={!!detailFlow} onOpenChange={() => setDetailFlow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {detailFlow?.icon}
              {detailFlow?.name}
            </DialogTitle>
          </DialogHeader>
          {detailFlow && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Source Module</p>
                  <p className="font-medium">{detailFlow.sourceModule}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Target Module</p>
                  <p className="font-medium">{detailFlow.targetModule}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Trigger</p>
                  <p className="font-medium">{detailFlow.trigger}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge className={detailFlow.active ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-gray-100 text-gray-600 hover:bg-gray-100"}>
                    {detailFlow.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Executions</p>
                  <p className="font-medium">{detailFlow.executionCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Triggered</p>
                  <p className="font-medium">{formatTimestamp(detailFlow.lastTriggered)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{detailFlow.description}</p>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-2">Recent Executions</p>
                <div className="space-y-2">
                  {SEED_LOGS.filter((l) => l.flowId === detailFlow.id)
                    .slice(0, 5)
                    .map((log) => (
                      <div key={log.id} className="flex items-start gap-2 text-sm border rounded-md p-2">
                        <div className="mt-0.5">{logStatusBadge(log.status)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-muted-foreground text-xs">{formatDateTime(log.triggeredAt)} ({log.duration})</p>
                          <p className="text-xs line-clamp-2">{log.details}</p>
                        </div>
                      </div>
                    ))}
                  {SEED_LOGS.filter((l) => l.flowId === detailFlow.id).length === 0 && (
                    <p className="text-sm text-muted-foreground">No recent executions</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDetailFlow(null)}>
                  Close
                </Button>
                <Button
                  disabled={!detailFlow.active}
                  onClick={() => {
                    handleManualTrigger(detailFlow)
                    setDetailFlow(null)
                  }}
                >
                  <Play className="mr-1 h-4 w-4" />
                  Test Trigger
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
