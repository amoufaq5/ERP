"use client"

import { useState } from "react"
import { Factory, ClipboardList, Play, CheckCircle, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"

const statusColor: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800", ACTIVE: "bg-green-100 text-green-800", OBSOLETE: "bg-red-100 text-red-800",
  PLANNED: "bg-blue-100 text-blue-800", IN_PROGRESS: "bg-purple-100 text-purple-800", COMPLETED: "bg-green-100 text-green-800", CANCELLED: "bg-red-100 text-red-800",
}

const boms = [
  { id: "1", name: "Wireless Keyboard Assembly", product: "WK-2000 Keyboard", version: "2.1", status: "ACTIVE", materials: 8, workOrders: 3 },
  { id: "2", name: "LED Monitor Assembly", product: "MON-27X Monitor", version: "1.5", status: "ACTIVE", materials: 12, workOrders: 2 },
  { id: "3", name: "USB-C Hub Assembly", product: "HUB-4P USB Hub", version: "1.0", status: "DRAFT", materials: 5, workOrders: 0 },
  { id: "4", name: "Ergonomic Mouse", product: "EM-500 Mouse", version: "3.0", status: "ACTIVE", materials: 6, workOrders: 1 },
  { id: "5", name: "Desk Lamp v1", product: "DL-100 Lamp", version: "1.0", status: "OBSOLETE", materials: 4, workOrders: 5 },
]

const initialWorkOrders = [
  { id: "1", bom: "Wireless Keyboard Assembly", quantity: 500, status: "IN_PROGRESS", startDate: "2024-03-15", endDate: "2024-04-15", priority: "HIGH" },
  { id: "2", bom: "LED Monitor Assembly", quantity: 200, status: "PLANNED", startDate: "2024-04-01", endDate: "2024-05-01", priority: "MEDIUM" },
  { id: "3", bom: "Wireless Keyboard Assembly", quantity: 300, status: "COMPLETED", startDate: "2024-02-01", endDate: "2024-03-01", priority: "HIGH" },
  { id: "4", bom: "Ergonomic Mouse", quantity: 1000, status: "IN_PROGRESS", startDate: "2024-03-10", endDate: "2024-04-10", priority: "MEDIUM" },
  { id: "5", bom: "Wireless Keyboard Assembly", quantity: 250, status: "PLANNED", startDate: "2024-05-01", endDate: "2024-05-30", priority: "LOW" },
]

const priorityColor: Record<string, string> = { LOW: "bg-gray-100 text-gray-800", MEDIUM: "bg-blue-100 text-blue-800", HIGH: "bg-orange-100 text-orange-800", URGENT: "bg-red-100 text-red-800" }

export default function ManufacturingPage() {
  const [tab, setTab] = useState("bom")
  const [workOrders, setWorkOrders] = useState(initialWorkOrders)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ bom: "", quantity: "", priority: "MEDIUM" })

  const addWorkOrder = () => {
    if (!form.bom || !form.quantity) return
    setWorkOrders(p => [...p, { id: String(p.length + 1), bom: form.bom, quantity: Number(form.quantity), status: "PLANNED", startDate: new Date().toISOString().split("T")[0], endDate: "", priority: form.priority }])
    setForm({ bom: "", quantity: "", priority: "MEDIUM" })
    setShowAdd(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Manufacturing</h1><p className="text-gray-500">Bill of Materials and work order management</p></div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Work Order</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Work Order</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>BOM / Assembly</Label><Input value={form.bom} onChange={e => setForm(p => ({ ...p, bom: e.target.value }))} placeholder="e.g. Wireless Keyboard Assembly" /></div>
              <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} /></div>
              <div><Label>Priority</Label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                  <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>
            <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={addWorkOrder}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><ClipboardList className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-gray-500">Active BOMs</p><p className="text-2xl font-bold">{boms.filter(b => b.status === "ACTIVE").length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><Factory className="h-5 w-5 text-purple-600" /></div><div><p className="text-sm text-gray-500">Work Orders</p><p className="text-2xl font-bold">{workOrders.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-orange-100 rounded-lg"><Play className="h-5 w-5 text-orange-600" /></div><div><p className="text-sm text-gray-500">In Progress</p><p className="text-2xl font-bold">{workOrders.filter(w => w.status === "IN_PROGRESS").length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-gray-500">Completed</p><p className="text-2xl font-bold">{workOrders.filter(w => w.status === "COMPLETED").length}</p></div></div></CardContent></Card>
      </div>

      <div className="flex gap-2 border-b">
        {["bom", "workorders"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t === "bom" ? "Bill of Materials" : "Work Orders"}
          </button>
        ))}
      </div>

      {tab === "bom" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boms.map(b => (
            <Card key={b.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div><h3 className="font-semibold">{b.name}</h3><p className="text-sm text-gray-500 mt-1">{b.product}</p></div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[b.status]}`}>{b.status}</span>
                </div>
                <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                  <span>v{b.version}</span>
                  <span>{b.materials} materials</span>
                  <span>{b.workOrders} orders</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "workorders" && (
        <Card><CardContent className="pt-6">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-gray-50">
              <th className="text-left p-3 font-medium">BOM / Assembly</th><th className="text-right p-3 font-medium">Quantity</th><th className="text-left p-3 font-medium">Priority</th><th className="text-left p-3 font-medium">Start Date</th><th className="text-left p-3 font-medium">End Date</th><th className="text-left p-3 font-medium">Status</th>
            </tr></thead>
            <tbody>{workOrders.map(w => (
              <tr key={w.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{w.bom}</td>
                <td className="p-3 text-right">{w.quantity.toLocaleString()}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColor[w.priority]}`}>{w.priority}</span></td>
                <td className="p-3">{w.startDate}</td>
                <td className="p-3">{w.endDate || "—"}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[w.status]}`}>{w.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </CardContent></Card>
      )}
    </div>
  )
}
