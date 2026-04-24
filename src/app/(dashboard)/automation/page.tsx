"use client"

import { useState } from "react"
import { Zap, Play, CheckCircle, Clock, Plus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu"
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal"
import { FilterBar, type FilterState } from "@/components/shared/filter-bar"

interface Workflow {
  id: string;
  name: string;
  module: string;
  trigger: string;
  conditions: string;
  actions: string;
  isActive: boolean;
  runCount: number;
  lastRun: string;
}

const workflowFields: EntityField[] = [
  { name: "name", label: "Workflow Name", type: "text", required: true },
  { name: "module", label: "Module", type: "select", required: true, options: [
    { label: "CRM", value: "CRM" }, { label: "ERP", value: "ERP" }, { label: "ATS", value: "ATS" },
  ]},
  { name: "trigger", label: "Trigger", type: "text", required: true },
  { name: "conditions", label: "Conditions", type: "text" },
  { name: "actions", label: "Actions", type: "text" },
];

const initialWorkflows: Workflow[] = [
  { id: "1", name: "Auto-assign new leads", module: "CRM", trigger: "When a new lead is created", conditions: "Lead source is WEB or SOCIAL", actions: "Assign to next available sales rep", isActive: true, runCount: 342, lastRun: "5 min ago" },
  { id: "2", name: "Invoice overdue reminder", module: "ERP", trigger: "When invoice is 7 days past due", conditions: "Invoice status is SENT and amount > EGP 500", actions: "Send email reminder to customer", isActive: true, runCount: 156, lastRun: "2 hours ago" },
  { id: "3", name: "Ticket SLA escalation", module: "CRM", trigger: "When ticket SLA deadline approaches", conditions: "Priority is HIGH or CRITICAL, 2 hours before deadline", actions: "Escalate to manager, send notification", isActive: true, runCount: 89, lastRun: "1 hour ago" },
  { id: "4", name: "New hire onboarding tasks", module: "ATS", trigger: "When candidate status changes to HIRED", conditions: "All offer requirements met", actions: "Create onboarding checklist, assign IT setup tasks", isActive: true, runCount: 28, lastRun: "1 day ago" },
  { id: "5", name: "Low stock alert", module: "ERP", trigger: "When product quantity falls below reorder level", conditions: "Product status is ACTIVE", actions: "Send alert to procurement team, create draft PO", isActive: false, runCount: 412, lastRun: "3 days ago" },
  { id: "6", name: "Interview reminder email", module: "ATS", trigger: "24 hours before scheduled interview", conditions: "Interview status is SCHEDULED", actions: "Send reminder to candidate and interviewer", isActive: true, runCount: 220, lastRun: "12 hours ago" },
]

const moduleColors: Record<string, string> = { CRM: "bg-blue-100 text-blue-800", ERP: "bg-green-100 text-green-800", ATS: "bg-purple-100 text-purple-800" }

export default function AutomationPage() {
  const [workflows, setWorkflows] = useState(initialWorkflows)
  const [editing, setEditing] = useState<Workflow | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [filters, setFilters] = useState<FilterState>({ _search: "", module: "" })

  const activeCount = workflows.filter(w => w.isActive).length
  const totalRuns = workflows.reduce((s, w) => s + w.runCount, 0)

  const filtered = workflows.filter((w) => {
    if (filters.module && w.module !== filters.module) return false;
    if (filters._search) {
      const q = filters._search.toLowerCase();
      return w.name.toLowerCase().includes(q) || w.trigger.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Workflow Automation</h1><p className="text-gray-500">Create automated workflows with triggers, conditions, and actions</p></div>
        <Button onClick={() => { setEditing(null); setShowModal(true); }}><Plus className="h-4 w-4 mr-2" />New Workflow</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><Zap className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-gray-500">Active Workflows</p><p className="text-2xl font-bold">{activeCount}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><Play className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-gray-500">Total Runs</p><p className="text-2xl font-bold">{totalRuns.toLocaleString()}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><CheckCircle className="h-5 w-5 text-purple-600" /></div><div><p className="text-sm text-gray-500">Success Rate</p><p className="text-2xl font-bold">98.2%</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-orange-100 rounded-lg"><Clock className="h-5 w-5 text-orange-600" /></div><div><p className="text-sm text-gray-500">Last 24h Triggers</p><p className="text-2xl font-bold">23</p></div></div></CardContent></Card>
      </div>

      <FilterBar
        searchValue={filters._search}
        onSearchChange={(v) => setFilters((f) => ({ ...f, _search: v }))}
        fields={[{ key: "module", label: "Module", type: "select", options: [
          { label: "CRM", value: "CRM" }, { label: "ERP", value: "ERP" }, { label: "ATS", value: "ATS" },
        ]}]}
        values={filters}
        onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(w => (
          <Card key={w.id} className={`transition-all ${!w.isActive ? "opacity-60" : ""}`}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{w.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${moduleColors[w.module]}`}>{w.module}</span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium text-gray-700">Trigger:</span> {w.trigger}</p>
                    <p><span className="font-medium text-gray-700">Conditions:</span> {w.conditions}</p>
                    <p><span className="font-medium text-gray-700">Actions:</span> {w.actions}</p>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span><Play className="h-3 w-3 inline mr-1" />{w.runCount} runs</span>
                    <span><Clock className="h-3 w-3 inline mr-1" />Last: {w.lastRun}</span>
                  </div>
                </div>
                <EditDeleteMenu
                  onEdit={() => { setEditing(w); setShowModal(true); }}
                  onDelete={() => setWorkflows(prev => prev.filter(x => x.id !== w.id))}
                  itemLabel={w.name}
                  extraItems={[{
                    label: w.isActive ? "Deactivate" : "Activate",
                    onClick: () => setWorkflows(prev => prev.map(x => x.id === w.id ? { ...x, isActive: !x.isActive } : x)),
                  }]}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <EntityFormModal
        open={showModal}
        onOpenChange={(open) => { if (!open) { setShowModal(false); setEditing(null); } }}
        title={editing ? "Edit Workflow" : "Create Workflow"}
        fields={workflowFields}
        initialData={editing ? { name: editing.name, module: editing.module, trigger: editing.trigger, conditions: editing.conditions, actions: editing.actions } : undefined}
        onSubmit={(data) => {
          if (editing) {
            setWorkflows(prev => prev.map(w => w.id === editing.id ? { ...w, name: data.name as string, module: data.module as string, trigger: data.trigger as string, conditions: (data.conditions as string) || "None", actions: (data.actions as string) || "Log event" } : w));
          } else {
            setWorkflows(prev => [...prev, { id: Date.now().toString(36), name: data.name as string, module: data.module as string, trigger: data.trigger as string, conditions: (data.conditions as string) || "None", actions: (data.actions as string) || "Log event", isActive: true, runCount: 0, lastRun: "Never" }]);
          }
          setShowModal(false);
          setEditing(null);
        }}
      />
    </div>
  )
}
