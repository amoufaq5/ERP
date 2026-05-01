"use client"

import { useState, useCallback, useMemo } from "react"
import {
  Play, GitBranch, Zap, UserCheck, Bell, Clock, Square, Plus, Trash2,
  ArrowDown, Settings, Workflow, BarChart3, CheckCircle, ChevronRight,
  GripVertical, Copy, Save, History, AlertTriangle, FileText, TestTube,
  Activity, XCircle, Timer, TrendingUp,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import PageHeader from "@/components/shared/page-header"
import StatusBadge from "@/components/shared/status-badge"
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal"

/* ─── Types ─── */
interface WorkflowNode {
  id: string
  type: "trigger" | "condition" | "action" | "approval" | "notification" | "delay" | "end"
  label: string
  config: Record<string, string>
}

interface WorkflowDef {
  id: string
  name: string
  description: string
  trigger: string
  module: string
  status: "Active" | "Draft" | "Disabled"
  lastRun: string
  runs: number
  nodes: WorkflowNode[]
}

/* ─── Node type metadata ─── */
const NODE_TYPES: { type: WorkflowNode["type"]; label: string; icon: typeof Play; bg: string; text: string }[] = [
  { type: "trigger", label: "Trigger", icon: Play, bg: "bg-green-100", text: "text-green-700" },
  { type: "condition", label: "Condition", icon: GitBranch, bg: "bg-amber-100", text: "text-amber-700" },
  { type: "action", label: "Action", icon: Zap, bg: "bg-blue-100", text: "text-blue-700" },
  { type: "approval", label: "Approval", icon: UserCheck, bg: "bg-purple-100", text: "text-purple-700" },
  { type: "notification", label: "Notification", icon: Bell, bg: "bg-cyan-100", text: "text-cyan-700" },
  { type: "delay", label: "Delay", icon: Clock, bg: "bg-gray-100", text: "text-gray-700" },
  { type: "end", label: "End", icon: Square, bg: "bg-red-100", text: "text-red-700" },
]

const nodeMeta = (type: WorkflowNode["type"]) => NODE_TYPES.find((n) => n.type === type)!

/* ─── Templates ─── */
const TEMPLATES: { name: string; description: string; nodes: WorkflowNode[] }[] = [
  {
    name: "Invoice Approval",
    description: "Route invoices for manager approval",
    nodes: [
      { id: "t1", type: "trigger", label: "Invoice Created", config: { triggerType: "record_created", module: "Finance" } },
      { id: "t2", type: "approval", label: "Manager Approval", config: { approver: "Line Manager", timeout: "48" } },
      { id: "t3", type: "notification", label: "Notify Accounts", config: { channel: "email", template: "Invoice {{ref}} approved by {{approver}}" } },
    ],
  },
  {
    name: "Lead Assignment",
    description: "Auto-assign leads based on region",
    nodes: [
      { id: "t1", type: "trigger", label: "New Lead", config: { triggerType: "record_created", module: "CRM" } },
      { id: "t2", type: "condition", label: "Check Region", config: { field: "region", operator: "equals", value: "Cairo" } },
      { id: "t3", type: "action", label: "Assign Rep", config: { actionType: "assign_user", target: "assignedTo", value: "Cairo Rep" } },
      { id: "t4", type: "notification", label: "Notify Rep", config: { channel: "in_app", template: "New lead assigned to you: {{lead.name}}" } },
    ],
  },
  {
    name: "Leave Request",
    description: "Automated leave approval workflow",
    nodes: [
      { id: "t1", type: "trigger", label: "Leave Submitted", config: { triggerType: "record_created", module: "HR" } },
      { id: "t2", type: "approval", label: "Manager Review", config: { approver: "Department Head", timeout: "72" } },
      { id: "t3", type: "action", label: "Update Calendar", config: { actionType: "update_field", target: "status", value: "Approved" } },
      { id: "t4", type: "notification", label: "Confirm Employee", config: { channel: "email", template: "Your leave request has been {{status}}" } },
    ],
  },
  {
    name: "Quality Alert",
    description: "Alert on quality threshold breach",
    nodes: [
      { id: "t1", type: "trigger", label: "QC Check", config: { triggerType: "field_changed", module: "Quality" } },
      { id: "t2", type: "condition", label: "Below Threshold?", config: { field: "score", operator: "less", value: "80" } },
      { id: "t3", type: "notification", label: "Alert QA Team", config: { channel: "sms", template: "ALERT: Batch {{batch}} failed QC (score: {{score}})" } },
    ],
  },
]

/* ─── Pharma-specific templates ─── */
const PHARMA_TEMPLATES: { name: string; description: string; module: string; trigger: string; nodes: WorkflowNode[] }[] = [
  {
    name: "Expense Auto-Approval",
    description: "Auto-approve expenses under EGP 500 within budget",
    module: "CRM", trigger: "record_created",
    nodes: [
      { id: "p1", type: "trigger", label: "Expense Submitted", config: { triggerType: "record_created", module: "CRM" } },
      { id: "p2", type: "condition", label: "Amount < 500 EGP", config: { field: "amount", operator: "less", value: "500" } },
      { id: "p3", type: "condition", label: "Within Budget?", config: { field: "monthlySpent", operator: "less", value: "budgetLimit" } },
      { id: "p4", type: "action", label: "Auto-Approve", config: { actionType: "change_status", target: "status", value: "APPROVED" } },
      { id: "p5", type: "action", label: "Create GL Entry", config: { actionType: "create_record", target: "journalEntry", value: "Debit 6500, Credit 1000" } },
      { id: "p6", type: "notification", label: "Notify Submitter", config: { channel: "in_app", template: "Your expense {{ref}} has been auto-approved" } },
    ],
  },
  {
    name: "Low Stock Reorder",
    description: "Auto-generate PO when stock below reorder level",
    module: "Procurement", trigger: "field_changed",
    nodes: [
      { id: "p1", type: "trigger", label: "Stock Level Changed", config: { triggerType: "field_changed", module: "Procurement" } },
      { id: "p2", type: "condition", label: "Below Reorder?", config: { field: "quantity", operator: "less", value: "reorderLevel" } },
      { id: "p3", type: "action", label: "Create Draft PO", config: { actionType: "create_record", target: "purchaseOrder", value: "qty = reorderLevel * 2" } },
      { id: "p4", type: "notification", label: "Alert Supply Chain", config: { channel: "email", template: "Low stock: {{product}} - PO {{poNumber}} created" } },
    ],
  },
  {
    name: "Visit Completion Reminder",
    description: "Notify rep if planned visit not checked in by 4pm",
    module: "CRM", trigger: "schedule",
    nodes: [
      { id: "p1", type: "trigger", label: "Daily 4pm Check", config: { triggerType: "schedule", module: "CRM" } },
      { id: "p2", type: "condition", label: "Unchecked Visits?", config: { field: "visitStatus", operator: "equals", value: "PLANNED" } },
      { id: "p3", type: "notification", label: "Remind Rep", config: { channel: "in_app", template: "Reminder: {{count}} planned visits not yet completed" } },
      { id: "p4", type: "delay", label: "Wait 2 hours", config: { duration: "2", unit: "hours" } },
      { id: "p5", type: "notification", label: "Alert DM", config: { channel: "email", template: "{{rep}} has {{count}} incomplete visits today" } },
    ],
  },
  {
    name: "Expiry Date Warning",
    description: "Weekly alert for products expiring within 90 days",
    module: "Quality", trigger: "schedule",
    nodes: [
      { id: "p1", type: "trigger", label: "Weekly Monday Check", config: { triggerType: "schedule", module: "Quality" } },
      { id: "p2", type: "condition", label: "Expires < 90 Days?", config: { field: "daysToExpiry", operator: "less", value: "90" } },
      { id: "p3", type: "notification", label: "Alert QA Team", config: { channel: "email", template: "EXPIRY WARNING: {{product}} batch {{batch}} expires {{date}}" } },
      { id: "p4", type: "action", label: "Create QA Task", config: { actionType: "create_record", target: "task", value: "Review batch disposition" } },
    ],
  },
  {
    name: "SLA Breach Escalation",
    description: "Auto-escalate market requests breaching SLA",
    module: "CRM", trigger: "schedule",
    nodes: [
      { id: "p1", type: "trigger", label: "Hourly SLA Check", config: { triggerType: "schedule", module: "CRM" } },
      { id: "p2", type: "condition", label: "SLA Breached?", config: { field: "slaDays", operator: "greater", value: "slaLimit" } },
      { id: "p3", type: "action", label: "Auto-Escalate", config: { actionType: "change_status", target: "approvalLevel", value: "next_level" } },
      { id: "p4", type: "notification", label: "Notify Manager", config: { channel: "in_app", template: "ESCALATED: {{request}} SLA breached ({{days}}d overdue)" } },
    ],
  },
  {
    name: "New Candidate Notification",
    description: "Notify hiring manager on new application",
    module: "HR", trigger: "record_created",
    nodes: [
      { id: "p1", type: "trigger", label: "Application Received", config: { triggerType: "record_created", module: "HR" } },
      { id: "p2", type: "action", label: "Score Candidate", config: { actionType: "update_field", target: "score", value: "auto_calculate" } },
      { id: "p3", type: "notification", label: "Notify Hiring Mgr", config: { channel: "email", template: "New application: {{candidate}} for {{job}} (Score: {{score}})" } },
    ],
  },
]

/* ─── Execution Log ─── */
interface ExecutionLog {
  id: string
  workflowId: string
  workflowName: string
  status: "SUCCESS" | "FAILURE" | "SKIPPED"
  triggeredAt: string
  duration: string
  trigger: string
  details: string
}

const SEED_LOGS: ExecutionLog[] = [
  { id: "log-1", workflowId: "wf-1", workflowName: "Auto-assign new leads", status: "SUCCESS", triggeredAt: "2025-04-30 14:32", duration: "0.3s", trigger: "New lead: Dr. Sameh Barakat", details: "Assigned to Mona Abdel-Nour (Greater Cairo territory)" },
  { id: "log-2", workflowId: "wf-2", workflowName: "Invoice overdue reminder", status: "SUCCESS", triggeredAt: "2025-04-30 09:00", duration: "1.2s", trigger: "Scheduled daily check", details: "3 overdue invoices found. Emails sent to: El Ezaby, Kasr El Aini, Seif" },
  { id: "log-3", workflowId: "wf-5", workflowName: "Low stock alert", status: "SUCCESS", triggeredAt: "2025-04-29 16:45", duration: "0.5s", trigger: "Augmentin 1g qty changed to 850", details: "Below reorder level (1000). Notification sent to Supply Chain team" },
  { id: "log-4", workflowId: "wf-1", workflowName: "Auto-assign new leads", status: "SUCCESS", triggeredAt: "2025-04-29 11:20", duration: "0.2s", trigger: "New lead: Eng. Hany Shaker", details: "Assigned to Khaled Mansour (round-robin)" },
  { id: "log-5", workflowId: "wf-6", workflowName: "Interview reminder", status: "SUCCESS", triggeredAt: "2025-04-29 09:00", duration: "0.8s", trigger: "Scheduled daily check", details: "Reminder sent for Yasser Mahmoud interview (Medical Rep position)" },
  { id: "log-6", workflowId: "wf-3", workflowName: "Ticket SLA escalation", status: "SUCCESS", triggeredAt: "2025-04-28 15:30", duration: "0.4s", trigger: "TK-001 approaching SLA", details: "Escalated to Ahmed Hassan. Augmentin batch recall - 2h remaining" },
  { id: "log-7", workflowId: "wf-2", workflowName: "Invoice overdue reminder", status: "FAILURE", triggeredAt: "2025-04-28 09:00", duration: "3.1s", trigger: "Scheduled daily check", details: "Email service timeout. Retry scheduled." },
  { id: "log-8", workflowId: "wf-4", workflowName: "New hire onboarding", status: "SUCCESS", triggeredAt: "2025-04-27 10:15", duration: "1.5s", trigger: "Candidate Yasser Mahmoud status → HIRED", details: "Created 5 onboarding tasks, IT setup request, badge request" },
  { id: "log-9", workflowId: "wf-1", workflowName: "Auto-assign new leads", status: "SKIPPED", triggeredAt: "2025-04-27 08:45", duration: "0.1s", trigger: "New lead: Test Entry", details: "Skipped: lead source = 'TEST', excluded by condition" },
  { id: "log-10", workflowId: "wf-5", workflowName: "Low stock alert", status: "SUCCESS", triggeredAt: "2025-04-26 14:20", duration: "0.6s", trigger: "Cardioprex 10mg qty changed to 700", details: "Below reorder (800). Draft PO-2025-004 created for EIPICO" },
  { id: "log-11", workflowId: "wf-3", workflowName: "Ticket SLA escalation", status: "SUCCESS", triggeredAt: "2025-04-26 12:00", duration: "0.3s", trigger: "TK-005 cold chain excursion", details: "CRITICAL ticket auto-escalated to Admin. SLA: 4h response" },
  { id: "log-12", workflowId: "wf-2", workflowName: "Invoice overdue reminder", status: "SUCCESS", triggeredAt: "2025-04-26 09:00", duration: "0.9s", trigger: "Scheduled daily check", details: "2 overdue invoices. Reminders sent." },
]

/* ─── Seed workflows ─── */
const SEED_WORKFLOWS: WorkflowDef[] = [
  { id: "wf-1", name: "Auto-assign new leads", description: "Route incoming leads to available sales reps", trigger: "record_created", module: "CRM", status: "Active", lastRun: "5 min ago", runs: 342, nodes: TEMPLATES[1].nodes },
  { id: "wf-2", name: "Invoice overdue reminder", description: "Send email reminders for overdue invoices", trigger: "schedule", module: "Finance", status: "Active", lastRun: "2 hours ago", runs: 156, nodes: [
    { id: "n1", type: "trigger", label: "Daily Check", config: { triggerType: "schedule", module: "Finance" } },
    { id: "n2", type: "condition", label: "Overdue?", config: { field: "daysOverdue", operator: "greater", value: "7" } },
    { id: "n3", type: "notification", label: "Email Customer", config: { channel: "email", template: "Invoice {{number}} is overdue" } },
  ]},
  { id: "wf-3", name: "Ticket SLA escalation", description: "Escalate tickets approaching SLA deadline", trigger: "field_changed", module: "CRM", status: "Active", lastRun: "1 hour ago", runs: 89, nodes: [] },
  { id: "wf-4", name: "New hire onboarding", description: "Create onboarding tasks when candidate is hired", trigger: "record_created", module: "HR", status: "Active", lastRun: "1 day ago", runs: 28, nodes: TEMPLATES[2].nodes },
  { id: "wf-5", name: "Low stock alert", description: "Alert procurement when stock falls below reorder level", trigger: "field_changed", module: "Procurement", status: "Disabled", lastRun: "3 days ago", runs: 412, nodes: [] },
  { id: "wf-6", name: "Interview reminder", description: "Send reminders 24h before scheduled interviews", trigger: "schedule", module: "HR", status: "Active", lastRun: "12 hours ago", runs: 220, nodes: [] },
  { id: "wf-7", name: "Expense approval flow", description: "Multi-level approval for expense reports", trigger: "record_created", module: "Finance", status: "Draft", lastRun: "Never", runs: 0, nodes: TEMPLATES[0].nodes },
  { id: "wf-8", name: "Quality batch alert", description: "Alert when QC score drops below threshold", trigger: "field_changed", module: "Quality", status: "Draft", lastRun: "Never", runs: 0, nodes: TEMPLATES[3].nodes },
]

const workflowFormFields: EntityField[] = [
  { name: "name", label: "Workflow Name", type: "text", required: true, placeholder: "e.g. Invoice Approval Flow" },
  { name: "description", label: "Description", type: "textarea", placeholder: "What does this workflow do?" },
  { name: "trigger", label: "Trigger Type", type: "select", required: true, options: [
    { label: "Manual", value: "manual" }, { label: "Scheduled", value: "schedule" },
    { label: "Record Created", value: "record_created" }, { label: "Field Changed", value: "field_changed" },
  ]},
  { name: "module", label: "Module", type: "select", required: true, options: [
    { label: "Finance", value: "Finance" }, { label: "HR", value: "HR" },
    { label: "CRM", value: "CRM" }, { label: "Quality", value: "Quality" },
    { label: "Procurement", value: "Procurement" },
  ]},
]

let _nid = 1000
function genNodeId() { return `node-${_nid++}` }

export default function AutomationPage() {
  const [view, setView] = useState<"list" | "builder">("list")
  const [workflows, setWorkflows] = useState<WorkflowDef[]>(SEED_WORKFLOWS)
  const [activeWf, setActiveWf] = useState<WorkflowDef | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [listTab, setListTab] = useState<"workflows" | "logs" | "templates">("workflows")
  const [logs, setLogs] = useState<ExecutionLog[]>(SEED_LOGS)
  const [detailWf, setDetailWf] = useState<WorkflowDef | null>(null)
  const [logFilter, setLogFilter] = useState<"ALL" | "SUCCESS" | "FAILURE" | "SKIPPED">("ALL")

  const activeCount = workflows.filter((w) => w.status === "Active").length
  const totalRuns = workflows.reduce((s, w) => s + w.runs, 0)
  const successRate = useMemo(() => {
    const s = logs.filter((l) => l.status === "SUCCESS").length
    return logs.length > 0 ? ((s / logs.length) * 100).toFixed(1) : "0"
  }, [logs])
  const failedCount = logs.filter((l) => l.status === "FAILURE").length
  const filteredLogs = logFilter === "ALL" ? logs : logs.filter((l) => l.status === logFilter)

  /* ─── Workflow CRUD ─── */
  function openBuilder(wf: WorkflowDef) {
    setActiveWf({ ...wf, nodes: wf.nodes.map((n) => ({ ...n })) })
    setSelectedNodeId(null)
    setView("builder")
  }

  function handleCreateWorkflow(data: Record<string, unknown>) {
    const wf: WorkflowDef = {
      id: `wf-${Date.now()}`,
      name: String(data.name),
      description: String(data.description || ""),
      trigger: String(data.trigger),
      module: String(data.module),
      status: "Draft",
      lastRun: "Never",
      runs: 0,
      nodes: [{ id: genNodeId(), type: "trigger", label: "Start", config: { triggerType: String(data.trigger), module: String(data.module) } }],
    }
    setWorkflows((prev) => [...prev, wf])
    setShowCreateModal(false)
    openBuilder(wf)
  }

  function saveBuilder() {
    if (!activeWf) return
    setWorkflows((prev) => prev.map((w) => (w.id === activeWf.id ? activeWf : w)))
    setView("list")
    setActiveWf(null)
  }

  function toggleStatus(id: string) {
    setWorkflows((prev) =>
      prev.map((w) => w.id === id ? { ...w, status: w.status === "Active" ? "Disabled" : "Active" } : w)
    )
  }

  function deleteWorkflow(id: string) {
    setWorkflows((prev) => prev.filter((w) => w.id !== id))
  }

  /* ─── Node operations ─── */
  const addNode = useCallback((type: WorkflowNode["type"], afterIndex?: number) => {
    if (!activeWf) return
    const meta = nodeMeta(type)
    const node: WorkflowNode = { id: genNodeId(), type, label: meta.label, config: {} }
    const nodes = [...activeWf.nodes]
    const idx = afterIndex !== undefined ? afterIndex + 1 : nodes.length
    nodes.splice(idx, 0, node)
    setActiveWf({ ...activeWf, nodes })
    setSelectedNodeId(node.id)
  }, [activeWf])

  function deleteNode(nodeId: string) {
    if (!activeWf) return
    setActiveWf({ ...activeWf, nodes: activeWf.nodes.filter((n) => n.id !== nodeId) })
    if (selectedNodeId === nodeId) setSelectedNodeId(null)
  }

  function updateNodeConfig(nodeId: string, key: string, value: string) {
    if (!activeWf) return
    setActiveWf({
      ...activeWf,
      nodes: activeWf.nodes.map((n) =>
        n.id === nodeId ? { ...n, config: { ...n.config, [key]: value } } : n
      ),
    })
  }

  function updateNodeLabel(nodeId: string, label: string) {
    if (!activeWf) return
    setActiveWf({
      ...activeWf,
      nodes: activeWf.nodes.map((n) => (n.id === nodeId ? { ...n, label } : n)),
    })
  }

  function loadTemplate(template: typeof TEMPLATES[number]) {
    if (!activeWf) return
    const nodes = template.nodes.map((n) => ({ ...n, id: genNodeId(), config: { ...n.config } }))
    setActiveWf({ ...activeWf, nodes })
    setSelectedNodeId(null)
  }

  const selectedNode = activeWf?.nodes.find((n) => n.id === selectedNodeId) ?? null

  /* ─── LIST VIEW ─── */
  if (view === "list") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Workflow Automation"
          description="Build visual workflows with triggers, conditions, and actions"
          actions={
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create Workflow
            </Button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><Workflow className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-muted-foreground">Total Workflows</p><p className="text-2xl font-bold">{workflows.length}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><CheckCircle className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Active</p><p className="text-2xl font-bold">{activeCount}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><BarChart3 className="h-5 w-5 text-purple-600" /></div><div><p className="text-sm text-muted-foreground">Total Runs</p><p className="text-2xl font-bold">{totalRuns.toLocaleString()}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-emerald-100 rounded-lg"><TrendingUp className="h-5 w-5 text-emerald-600" /></div><div><p className="text-sm text-muted-foreground">Success Rate</p><p className="text-2xl font-bold">{successRate}%</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-red-100 rounded-lg"><XCircle className="h-5 w-5 text-red-600" /></div><div><p className="text-sm text-muted-foreground">Failed</p><p className="text-2xl font-bold">{failedCount}</p></div></div></CardContent></Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(["workflows", "logs", "templates"] as const).map((t) => (
            <Button key={t} variant={listTab === t ? "default" : "ghost"} size="sm" onClick={() => setListTab(t)}>
              {t === "workflows" && <Workflow className="h-4 w-4 mr-1" />}
              {t === "logs" && <History className="h-4 w-4 mr-1" />}
              {t === "templates" && <FileText className="h-4 w-4 mr-1" />}
              {t === "workflows" ? "Workflows" : t === "logs" ? "Execution Logs" : "Pharma Templates"}
              {t === "logs" && failedCount > 0 && (
                <Badge className="ml-2 bg-red-100 text-red-700 text-xs">{failedCount}</Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Execution Logs Tab */}
        {listTab === "logs" && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Execution History</CardTitle>
                <div className="flex gap-1">
                  {(["ALL", "SUCCESS", "FAILURE", "SKIPPED"] as const).map((f) => (
                    <Button key={f} size="sm" variant={logFilter === f ? "default" : "outline"} className="text-xs h-7" onClick={() => setLogFilter(f)}>
                      {f === "ALL" ? "All" : f === "SUCCESS" ? "Success" : f === "FAILURE" ? "Failed" : "Skipped"}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Workflow</th>
                  <th className="text-left p-3 font-medium">Trigger</th>
                  <th className="text-left p-3 font-medium">Details</th>
                  <th className="text-left p-3 font-medium">Duration</th>
                  <th className="text-left p-3 font-medium">Time</th>
                </tr></thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <Badge className={
                          log.status === "SUCCESS" ? "bg-green-100 text-green-800" :
                          log.status === "FAILURE" ? "bg-red-100 text-red-800" :
                          "bg-gray-100 text-gray-800"
                        }>
                          {log.status === "SUCCESS" ? <CheckCircle className="h-3 w-3 mr-1" /> :
                           log.status === "FAILURE" ? <XCircle className="h-3 w-3 mr-1" /> :
                           <AlertTriangle className="h-3 w-3 mr-1" />}
                          {log.status}
                        </Badge>
                      </td>
                      <td className="p-3 font-medium">{log.workflowName}</td>
                      <td className="p-3 text-xs text-muted-foreground">{log.trigger}</td>
                      <td className="p-3 text-xs max-w-xs truncate">{log.details}</td>
                      <td className="p-3 text-xs"><Badge className="bg-gray-100 text-gray-700"><Timer className="h-3 w-3 mr-1" />{log.duration}</Badge></td>
                      <td className="p-3 text-xs text-muted-foreground">{log.triggeredAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLogs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">No logs matching filter</div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pharma Templates Tab */}
        {listTab === "templates" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PHARMA_TEMPLATES.map((tpl, idx) => (
              <Card key={idx} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{tpl.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{tpl.description}</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700">{tpl.module}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {tpl.nodes.map((n, ni) => {
                      const m = nodeMeta(n.type)
                      const Icon = m.icon
                      return (
                        <div key={ni} className="flex items-center gap-1">
                          <div className={`p-1 rounded ${m.bg}`}><Icon className={`h-3 w-3 ${m.text}`} /></div>
                          <span className="text-xs">{n.label}</span>
                          {ni < tpl.nodes.length - 1 && <ArrowDown className="h-3 w-3 text-muted-foreground/50 rotate-[-90deg]" />}
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => {
                      const wf: WorkflowDef = {
                        id: `wf-${Date.now()}`, name: tpl.name, description: tpl.description,
                        trigger: tpl.trigger, module: tpl.module, status: "Draft",
                        lastRun: "Never", runs: 0,
                        nodes: tpl.nodes.map((n) => ({ ...n, id: genNodeId(), config: { ...n.config } })),
                      }
                      setWorkflows((prev) => [...prev, wf])
                      openBuilder(wf)
                    }}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Use Template
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      const wf: WorkflowDef = {
                        id: `preview-${idx}`, name: tpl.name, description: tpl.description,
                        trigger: tpl.trigger, module: tpl.module, status: "Draft",
                        lastRun: "N/A", runs: 0, nodes: tpl.nodes,
                      }
                      setDetailWf(wf)
                    }}>
                      <Activity className="h-3.5 w-3.5 mr-1" /> Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Workflows Tab */}
        {listTab === "workflows" && <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Trigger</th>
                <th className="text-left p-3 font-medium">Module</th>
                <th className="text-left p-3 font-medium">Last Run</th>
                <th className="text-right p-3 font-medium">Runs</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr></thead>
              <tbody>
                {workflows.map((wf) => (
                  <tr key={wf.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => openBuilder(wf)}>
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{wf.name}</p>
                        <p className="text-xs text-muted-foreground">{wf.description}</p>
                      </div>
                    </td>
                    <td className="p-3"><StatusBadge status={wf.status} /></td>
                    <td className="p-3 text-xs capitalize">{wf.trigger.replace(/_/g, " ")}</td>
                    <td className="p-3 text-xs">{wf.module}</td>
                    <td className="p-3 text-xs text-muted-foreground">{wf.lastRun}</td>
                    <td className="p-3 text-right">{wf.runs.toLocaleString()}</td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openBuilder(wf)}>
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleStatus(wf.id)}>
                          {wf.status === "Active" ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => deleteWorkflow(wf.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>}

        {/* Workflow Detail Dialog */}
        <Dialog open={!!detailWf} onOpenChange={(open) => { if (!open) setDetailWf(null) }}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{detailWf?.name}</DialogTitle>
              <DialogDescription>{detailWf?.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <StatusBadge status={detailWf?.status ?? "Draft"} />
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Total Runs</p>
                  <p className="font-bold">{detailWf?.runs.toLocaleString()}</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Last Run</p>
                  <p className="text-sm">{detailWf?.lastRun}</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Workflow Steps ({detailWf?.nodes.length})</h4>
                <div className="space-y-2">
                  {detailWf?.nodes.map((node, idx) => {
                    const meta = nodeMeta(node.type)
                    const Icon = meta.icon
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`p-1.5 rounded-lg ${meta.bg}`}><Icon className={`h-4 w-4 ${meta.text}`} /></div>
                          {idx < (detailWf?.nodes.length ?? 0) - 1 && <div className="w-0.5 h-4 bg-border mt-1" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{node.label}</p>
                          <p className="text-xs text-muted-foreground capitalize">{node.type}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              {detailWf && detailWf.id.startsWith("wf-") && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Recent Executions</h4>
                  {logs.filter((l) => l.workflowId === detailWf.id).slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-center gap-2 py-2 border-b last:border-0">
                      <Badge className={log.status === "SUCCESS" ? "bg-green-100 text-green-800" : log.status === "FAILURE" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}>{log.status}</Badge>
                      <span className="text-xs flex-1 truncate">{log.details}</span>
                      <span className="text-xs text-muted-foreground">{log.triggeredAt}</span>
                    </div>
                  ))}
                  {logs.filter((l) => l.workflowId === detailWf.id).length === 0 && (
                    <p className="text-sm text-muted-foreground">No executions yet</p>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { if (detailWf) { openBuilder(detailWf); setDetailWf(null) } }}>
                  <Settings className="h-3.5 w-3.5 mr-1" /> Edit in Builder
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  if (detailWf) {
                    const newLog: ExecutionLog = {
                      id: `log-${Date.now()}`, workflowId: detailWf.id, workflowName: detailWf.name,
                      status: "SUCCESS", triggeredAt: new Date().toLocaleString(), duration: "0.5s",
                      trigger: "Manual test run", details: "Test execution completed successfully",
                    }
                    setLogs((prev) => [newLog, ...prev])
                  }
                }}>
                  <TestTube className="h-3.5 w-3.5 mr-1" /> Test Run
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <EntityFormModal
          open={showCreateModal}
          onOpenChange={(open) => { if (!open) setShowCreateModal(false); }}
          title="Create Workflow"
          description="Define a new workflow with a trigger and module."
          fields={workflowFormFields}
          onSubmit={handleCreateWorkflow}
          submitLabel="Create & Open Builder"
        />
      </div>
    )
  }

  /* ─── BUILDER VIEW ─── */
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Builder Header */}
      <div className="flex items-center justify-between border-b px-4 py-2 bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setView("list"); setActiveWf(null); }}>
            <ChevronRight className="h-4 w-4 rotate-180 mr-1" /> Back
          </Button>
          <div>
            <h2 className="font-semibold text-sm">{activeWf?.name}</h2>
            <p className="text-xs text-muted-foreground">{activeWf?.description || "No description"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={activeWf?.status ?? "Draft"} />
          <Button size="sm" onClick={saveBuilder}>
            <Save className="h-4 w-4 mr-1" /> Save & Close
          </Button>
        </div>
      </div>

      {/* Builder Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Node Palette + Templates */}
        <div className="w-56 border-r bg-muted/30 overflow-y-auto shrink-0 p-3 space-y-4">
          <div>
            <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wider">Node Palette</h3>
            <div className="space-y-1.5">
              {NODE_TYPES.map((nt) => {
                const Icon = nt.icon
                return (
                  <button
                    key={nt.type}
                    onClick={() => addNode(nt.type)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg border bg-card hover:border-blue-400 hover:shadow-sm transition-all text-left text-xs"
                  >
                    <div className={`p-1.5 rounded ${nt.bg}`}>
                      <Icon className={`h-3.5 w-3.5 ${nt.text}`} />
                    </div>
                    <span className="font-medium">{nt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wider">Templates</h3>
            <div className="space-y-1.5">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.name}
                  onClick={() => loadTemplate(tpl)}
                  className="w-full p-2 rounded-lg border bg-card hover:border-purple-400 hover:shadow-sm transition-all text-left"
                >
                  <p className="text-xs font-medium">{tpl.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{tpl.description}</p>
                  <p className="text-[10px] text-purple-600 mt-1">{tpl.nodes.length} nodes</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center Canvas */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          <div className="max-w-md mx-auto space-y-0">
            {activeWf?.nodes.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Workflow className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No nodes yet. Click a node type or template to start building.</p>
              </div>
            )}
            {activeWf?.nodes.map((node, idx) => {
              const meta = nodeMeta(node.type)
              const Icon = meta.icon
              const isSelected = selectedNodeId === node.id
              return (
                <div key={node.id}>
                  {/* Node Card */}
                  <div
                    onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
                    className={`relative border-2 rounded-xl p-3 bg-white shadow-sm cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? "border-blue-500 ring-2 ring-blue-200" : "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${meta.bg} shrink-0`}>
                        <Icon className={`h-4 w-4 ${meta.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground">{meta.label}</span>
                        </div>
                        <p className="font-medium text-sm truncate">{node.label}</p>
                        {Object.keys(node.config).length > 0 && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {Object.entries(node.config).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                      </div>
                    </div>
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                          className="p-1 rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const clone: WorkflowNode = { ...node, id: genNodeId(), config: { ...node.config } }
                            const nodes = [...(activeWf?.nodes || [])]
                            nodes.splice(idx + 1, 0, clone)
                            setActiveWf(activeWf ? { ...activeWf, nodes } : null)
                          }}
                          className="p-1 rounded-full bg-blue-500 text-white shadow-sm hover:bg-blue-600"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Connector + Insert Button */}
                  {idx < (activeWf?.nodes.length ?? 0) - 1 && (
                    <div className="flex flex-col items-center py-1">
                      <div className="w-0.5 h-4 bg-border" />
                      <button
                        onClick={() => addNode("action", idx)}
                        className="p-0.5 rounded-full border bg-white hover:bg-blue-50 hover:border-blue-400 transition-colors group"
                        title="Insert node here"
                      >
                        <Plus className="h-3 w-3 text-muted-foreground group-hover:text-blue-600" />
                      </button>
                      <div className="w-0.5 h-4 bg-border" />
                      <ArrowDown className="h-3 w-3 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Panel: Properties */}
        <div className="w-72 border-l bg-muted/30 overflow-y-auto shrink-0 p-3">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-3 tracking-wider">Properties</h3>
          {!selectedNode ? (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Select a node to edit its properties</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Node Label</Label>
                <Input
                  value={selectedNode.label}
                  onChange={(e) => updateNodeLabel(selectedNode.id, e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Configuration</p>
                <NodeConfigPanel node={selectedNode} updateConfig={(k, v) => updateNodeConfig(selectedNode.id, k, v)} />
              </div>

              <div className="border-t pt-3">
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full"
                  onClick={() => deleteNode(selectedNode.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Node
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Node Config Panel ─── */
function NodeConfigPanel({ node, updateConfig }: { node: WorkflowNode; updateConfig: (key: string, value: string) => void }) {
  switch (node.type) {
    case "trigger":
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Trigger Type</Label>
            <select className="w-full rounded-md border px-2 py-1.5 text-xs" value={node.config.triggerType || ""} onChange={(e) => updateConfig("triggerType", e.target.value)}>
              <option value="">Select...</option>
              <option value="manual">Manual</option>
              <option value="schedule">Scheduled</option>
              <option value="record_created">Record Created</option>
              <option value="field_changed">Field Changed</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Module</Label>
            <select className="w-full rounded-md border px-2 py-1.5 text-xs" value={node.config.module || ""} onChange={(e) => updateConfig("module", e.target.value)}>
              <option value="">Select...</option>
              <option>Finance</option><option>HR</option><option>CRM</option><option>Quality</option><option>Procurement</option>
            </select>
          </div>
        </div>
      )
    case "condition":
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Field</Label>
            <Input className="text-xs" placeholder="e.g. amount, status" value={node.config.field || ""} onChange={(e) => updateConfig("field", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Operator</Label>
            <select className="w-full rounded-md border px-2 py-1.5 text-xs" value={node.config.operator || ""} onChange={(e) => updateConfig("operator", e.target.value)}>
              <option value="">Select...</option>
              <option value="equals">Equals</option>
              <option value="not_equals">Not Equals</option>
              <option value="greater">Greater Than</option>
              <option value="less">Less Than</option>
              <option value="contains">Contains</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Value</Label>
            <Input className="text-xs" placeholder="Comparison value" value={node.config.value || ""} onChange={(e) => updateConfig("value", e.target.value)} />
          </div>
        </div>
      )
    case "action":
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Action Type</Label>
            <select className="w-full rounded-md border px-2 py-1.5 text-xs" value={node.config.actionType || ""} onChange={(e) => updateConfig("actionType", e.target.value)}>
              <option value="">Select...</option>
              <option value="create_record">Create Record</option>
              <option value="update_field">Update Field</option>
              <option value="send_email">Send Email</option>
              <option value="assign_user">Assign User</option>
              <option value="change_status">Change Status</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Target Field</Label>
            <Input className="text-xs" placeholder="e.g. status, assignedTo" value={node.config.target || ""} onChange={(e) => updateConfig("target", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Value</Label>
            <Input className="text-xs" placeholder="New value" value={node.config.value || ""} onChange={(e) => updateConfig("value", e.target.value)} />
          </div>
        </div>
      )
    case "approval":
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Approver</Label>
            <select className="w-full rounded-md border px-2 py-1.5 text-xs" value={node.config.approver || ""} onChange={(e) => updateConfig("approver", e.target.value)}>
              <option value="">Select...</option>
              <option>Line Manager</option>
              <option>Department Head</option>
              <option>Finance Director</option>
              <option>HR Manager</option>
              <option>System Admin</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Timeout (hours)</Label>
            <Input className="text-xs" type="number" placeholder="e.g. 48" value={node.config.timeout || ""} onChange={(e) => updateConfig("timeout", e.target.value)} />
          </div>
        </div>
      )
    case "notification":
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Channel</Label>
            <select className="w-full rounded-md border px-2 py-1.5 text-xs" value={node.config.channel || ""} onChange={(e) => updateConfig("channel", e.target.value)}>
              <option value="">Select...</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="in_app">In-App</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Message Template</Label>
            <textarea
              className="w-full rounded-md border px-2 py-1.5 text-xs min-h-[60px] resize-y"
              placeholder="Use {{field}} for variables"
              value={node.config.template || ""}
              onChange={(e) => updateConfig("template", e.target.value)}
            />
          </div>
        </div>
      )
    case "delay":
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Duration</Label>
            <Input className="text-xs" type="number" placeholder="e.g. 24" value={node.config.duration || ""} onChange={(e) => updateConfig("duration", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Unit</Label>
            <select className="w-full rounded-md border px-2 py-1.5 text-xs" value={node.config.unit || ""} onChange={(e) => updateConfig("unit", e.target.value)}>
              <option value="">Select...</option>
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </select>
          </div>
        </div>
      )
    case "end":
      return (
        <div className="text-xs text-muted-foreground">
          End node terminates the workflow. No configuration needed.
        </div>
      )
    default:
      return null
  }
}
