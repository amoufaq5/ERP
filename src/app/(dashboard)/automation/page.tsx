"use client"

import { useState } from "react"
import { Zap, Play, CheckCircle, Clock, Plus, Trash2, Edit } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"

const initialWorkflows = [
  { id: "1", name: "Auto-assign new leads", module: "CRM", trigger: "When a new lead is created", conditions: "Lead source is WEB or SOCIAL", actions: "Assign to next available sales rep", isActive: true, runCount: 342, lastRun: "5 min ago" },
  { id: "2", name: "Invoice overdue reminder", module: "ERP", trigger: "When invoice is 7 days past due", conditions: "Invoice status is SENT and amount > $500", actions: "Send email reminder to customer", isActive: true, runCount: 156, lastRun: "2 hours ago" },
  { id: "3", name: "Ticket SLA escalation", module: "CRM", trigger: "When ticket SLA deadline approaches", conditions: "Priority is HIGH or CRITICAL, 2 hours before deadline", actions: "Escalate to manager, send notification", isActive: true, runCount: 89, lastRun: "1 hour ago" },
  { id: "4", name: "New hire onboarding tasks", module: "ATS", trigger: "When candidate status changes to HIRED", conditions: "All offer requirements met", actions: "Create onboarding checklist, assign IT setup tasks", isActive: true, runCount: 28, lastRun: "1 day ago" },
  { id: "5", name: "Low stock alert", module: "ERP", trigger: "When product quantity falls below reorder level", conditions: "Product status is ACTIVE", actions: "Send alert to procurement team, create draft PO", isActive: false, runCount: 412, lastRun: "3 days ago" },
  { id: "6", name: "Interview reminder email", module: "ATS", trigger: "24 hours before scheduled interview", conditions: "Interview status is SCHEDULED", actions: "Send reminder to candidate and interviewer", isActive: true, runCount: 220, lastRun: "12 hours ago" },
]

const moduleColors: Record<string, string> = { CRM: "bg-blue-100 text-blue-800", ERP: "bg-green-100 text-green-800", ATS: "bg-purple-100 text-purple-800" }

export default function AutomationPage() {
  const [workflows, setWorkflows] = useState(initialWorkflows)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: "", module: "CRM", trigger: "", conditions: "", actions: "" })

  const activeCount = workflows.filter(w => w.isActive).length
  const totalRuns = workflows.reduce((s, w) => s + w.runCount, 0)

  const toggleWorkflow = (id: string) => {
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, isActive: !w.isActive } : w))
  }

  const deleteWorkflow = (id: string) => {
    setWorkflows(prev => prev.filter(w => w.id !== id))
  }

  const addWorkflow = () => {
    if (!form.name || !form.trigger) return
    setWorkflows(prev => [...prev, { id: String(prev.length + 1), name: form.name, module: form.module, trigger: form.trigger, conditions: form.conditions || "None", actions: form.actions || "Log event", isActive: true, runCount: 0, lastRun: "Never" }])
    setForm({ name: "", module: "CRM", trigger: "", conditions: "", actions: "" })
    setShowAdd(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Workflow Automation</h1><p className="text-gray-500">Create automated workflows with triggers, conditions, and actions</p></div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Workflow</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Workflow</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Workflow Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Auto-assign leads" /></div>
              <div><Label>Module</Label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={form.module} onChange={e => setForm(p => ({ ...p, module: e.target.value }))}>
                  <option value="CRM">CRM</option><option value="ERP">ERP</option><option value="ATS">ATS</option>
                </select>
              </div>
              <div><Label>Trigger</Label><Input value={form.trigger} onChange={e => setForm(p => ({ ...p, trigger: e.target.value }))} placeholder="When..." /></div>
              <div><Label>Conditions</Label><Input value={form.conditions} onChange={e => setForm(p => ({ ...p, conditions: e.target.value }))} placeholder="If..." /></div>
              <div><Label>Actions</Label><Input value={form.actions} onChange={e => setForm(p => ({ ...p, actions: e.target.value }))} placeholder="Then..." /></div>
            </div>
            <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={addWorkflow}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><Zap className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-gray-500">Active Workflows</p><p className="text-2xl font-bold">{activeCount}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><Play className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-gray-500">Total Runs</p><p className="text-2xl font-bold">{totalRuns.toLocaleString()}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><CheckCircle className="h-5 w-5 text-purple-600" /></div><div><p className="text-sm text-gray-500">Success Rate</p><p className="text-2xl font-bold">98.2%</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-orange-100 rounded-lg"><Clock className="h-5 w-5 text-orange-600" /></div><div><p className="text-sm text-gray-500">Last 24h Triggers</p><p className="text-2xl font-bold">23</p></div></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workflows.map(w => (
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
                <div className="flex items-center gap-2 ml-4">
                  <button onClick={() => toggleWorkflow(w.id)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${w.isActive ? "bg-blue-600" : "bg-gray-300"}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${w.isActive ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                  <button onClick={() => deleteWorkflow(w.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
