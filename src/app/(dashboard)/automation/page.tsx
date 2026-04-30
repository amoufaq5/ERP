"use client"

import { useState, useCallback } from "react"
import {
  Play, GitBranch, Zap, UserCheck, Bell, Clock, Square, Plus, Trash2,
  ArrowDown, Settings, Workflow, BarChart3, CheckCircle, ChevronRight,
  GripVertical, Copy, Save,
} from "lucide-react"
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

  const activeCount = workflows.filter((w) => w.status === "Active").length
  const totalRuns = workflows.reduce((s, w) => s + w.runs, 0)

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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><Workflow className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-muted-foreground">Total Workflows</p><p className="text-2xl font-bold">{workflows.length}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><CheckCircle className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Active</p><p className="text-2xl font-bold">{activeCount}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><BarChart3 className="h-5 w-5 text-purple-600" /></div><div><p className="text-sm text-muted-foreground">Total Runs</p><p className="text-2xl font-bold">{totalRuns.toLocaleString()}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-orange-100 rounded-lg"><Zap className="h-5 w-5 text-orange-600" /></div><div><p className="text-sm text-muted-foreground">Success Rate</p><p className="text-2xl font-bold">96.5%</p></div></div></CardContent></Card>
        </div>

        <Card>
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
        </Card>

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
