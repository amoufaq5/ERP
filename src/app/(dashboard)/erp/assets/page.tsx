"use client"

import { useState } from "react"
import { Monitor, Wrench, DollarSign, AlertTriangle, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"

const statusColor: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800", MAINTENANCE: "bg-yellow-100 text-yellow-800",
  RETIRED: "bg-gray-100 text-gray-800", DISPOSED: "bg-red-100 text-red-800",
  SCHEDULED: "bg-blue-100 text-blue-800", IN_PROGRESS: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800", CANCELLED: "bg-red-100 text-red-800",
}

const initialAssets = [
  { id: "1", name: "MacBook Pro 16\"", assetTag: "AST-001", category: "Laptop", status: "ACTIVE", purchaseDate: "2023-06-15", purchasePrice: 2499, currentValue: 1999, location: "Office A", assignedTo: "John Smith", warrantyExpiry: "2026-06-15" },
  { id: "2", name: "Dell Monitor 27\"", assetTag: "AST-002", category: "Monitor", status: "ACTIVE", purchaseDate: "2023-03-10", purchasePrice: 450, currentValue: 350, location: "Office A", assignedTo: "Sarah Johnson", warrantyExpiry: "2026-03-10" },
  { id: "3", name: "HP LaserJet Pro", assetTag: "AST-003", category: "Printer", status: "MAINTENANCE", purchaseDate: "2022-01-20", purchasePrice: 800, currentValue: 400, location: "Floor 2", assignedTo: "Shared", warrantyExpiry: "2025-01-20" },
  { id: "4", name: "Cisco Router 4000", assetTag: "AST-004", category: "Network", status: "ACTIVE", purchaseDate: "2023-09-05", purchasePrice: 1200, currentValue: 1000, location: "Server Room", assignedTo: "IT Dept", warrantyExpiry: "2026-09-05" },
  { id: "5", name: "Standing Desk", assetTag: "AST-005", category: "Furniture", status: "ACTIVE", purchaseDate: "2023-11-01", purchasePrice: 650, currentValue: 550, location: "Office B", assignedTo: "Michael Chen", warrantyExpiry: "2028-11-01" },
  { id: "6", name: "ThinkPad T14", assetTag: "AST-006", category: "Laptop", status: "RETIRED", purchaseDate: "2020-04-15", purchasePrice: 1800, currentValue: 200, location: "Storage", assignedTo: "Unassigned", warrantyExpiry: "2023-04-15" },
]

const maintenanceRecords = [
  { id: "1", asset: "HP LaserJet Pro", type: "CORRECTIVE", description: "Paper jam fix and roller replacement", scheduledDate: "2024-03-25", completedDate: null, cost: 150, status: "SCHEDULED" },
  { id: "2", asset: "Cisco Router 4000", type: "PREVENTIVE", description: "Firmware update and config backup", scheduledDate: "2024-04-01", completedDate: null, cost: 0, status: "SCHEDULED" },
  { id: "3", asset: "MacBook Pro 16\"", type: "PREVENTIVE", description: "Battery health check", scheduledDate: "2024-02-15", completedDate: "2024-02-15", cost: 0, status: "COMPLETED" },
  { id: "4", asset: "Dell Monitor 27\"", type: "CORRECTIVE", description: "Dead pixel inspection", scheduledDate: "2024-01-20", completedDate: "2024-01-22", cost: 0, status: "COMPLETED" },
]

export default function AssetsPage() {
  const [tab, setTab] = useState("registry")
  const [assets, setAssets] = useState(initialAssets)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: "", category: "", purchasePrice: "", location: "" })

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
  const totalValue = assets.reduce((s, a) => s + a.currentValue, 0)

  const addAsset = () => {
    if (!form.name) return
    setAssets(p => [...p, { id: String(p.length + 1), name: form.name, assetTag: `AST-${String(p.length + 1).padStart(3, "0")}`, category: form.category || "Other", status: "ACTIVE", purchaseDate: new Date().toISOString().split("T")[0], purchasePrice: Number(form.purchasePrice) || 0, currentValue: Number(form.purchasePrice) || 0, location: form.location || "Office", assignedTo: "Unassigned", warrantyExpiry: "2027-01-01" }])
    setForm({ name: "", category: "", purchasePrice: "", location: "" })
    setShowAdd(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Asset Management</h1><p className="text-gray-500">Track and manage company assets and maintenance schedules</p></div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Asset</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Register New Asset</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Asset Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>Category</Label><Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="Laptop, Monitor, etc." /></div>
              <div><Label>Purchase Price</Label><Input type="number" value={form.purchasePrice} onChange={e => setForm(p => ({ ...p, purchasePrice: e.target.value }))} /></div>
              <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} /></div>
            </div>
            <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={addAsset}>Register</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><Monitor className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-gray-500">Total Assets</p><p className="text-2xl font-bold">{assets.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><Monitor className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-gray-500">Active</p><p className="text-2xl font-bold">{assets.filter(a => a.status === "ACTIVE").length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-yellow-100 rounded-lg"><Wrench className="h-5 w-5 text-yellow-600" /></div><div><p className="text-sm text-gray-500">In Maintenance</p><p className="text-2xl font-bold">{assets.filter(a => a.status === "MAINTENANCE").length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><DollarSign className="h-5 w-5 text-purple-600" /></div><div><p className="text-sm text-gray-500">Total Value</p><p className="text-2xl font-bold">{fmt(totalValue)}</p></div></div></CardContent></Card>
      </div>

      <div className="flex gap-2 border-b">
        {["registry", "maintenance"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t === "registry" ? "Asset Registry" : "Maintenance Schedule"}
          </button>
        ))}
      </div>

      {tab === "registry" && (
        <Card><CardContent className="pt-6">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-gray-50">
              <th className="text-left p-3 font-medium">Asset</th><th className="text-left p-3 font-medium">Tag</th><th className="text-left p-3 font-medium">Category</th><th className="text-left p-3 font-medium">Location</th><th className="text-left p-3 font-medium">Assigned To</th><th className="text-right p-3 font-medium">Value</th><th className="text-left p-3 font-medium">Warranty</th><th className="text-left p-3 font-medium">Status</th>
            </tr></thead>
            <tbody>{assets.map(a => (
              <tr key={a.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{a.name}</td><td className="p-3 text-gray-500">{a.assetTag}</td><td className="p-3">{a.category}</td><td className="p-3">{a.location}</td><td className="p-3">{a.assignedTo}</td><td className="p-3 text-right">{fmt(a.currentValue)}</td><td className="p-3">{a.warrantyExpiry}</td><td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[a.status]}`}>{a.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </CardContent></Card>
      )}

      {tab === "maintenance" && (
        <Card><CardContent className="pt-6">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-gray-50">
              <th className="text-left p-3 font-medium">Asset</th><th className="text-left p-3 font-medium">Type</th><th className="text-left p-3 font-medium">Description</th><th className="text-left p-3 font-medium">Scheduled</th><th className="text-left p-3 font-medium">Completed</th><th className="text-right p-3 font-medium">Cost</th><th className="text-left p-3 font-medium">Status</th>
            </tr></thead>
            <tbody>{maintenanceRecords.map(m => (
              <tr key={m.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{m.asset}</td><td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${m.type === "PREVENTIVE" ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"}`}>{m.type}</span></td><td className="p-3">{m.description}</td><td className="p-3">{m.scheduledDate}</td><td className="p-3">{m.completedDate || "—"}</td><td className="p-3 text-right">{m.cost > 0 ? fmt(m.cost) : "—"}</td><td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[m.status]}`}>{m.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </CardContent></Card>
      )}
    </div>
  )
}
