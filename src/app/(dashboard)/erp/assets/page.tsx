"use client"

import { useState } from "react"
import { Monitor, Wrench, DollarSign, Plus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu"
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal"
import { FilterBar, type FilterState } from "@/components/shared/filter-bar"
import DataTable from "@/components/shared/data-table"
import type { Column } from "@/components/shared/data-table"

const assetFields: EntityField[] = [
  { name: "name", label: "Asset Name", type: "text", required: true },
  { name: "category", label: "Category", type: "select", options: [
    { label: "Laptop", value: "Laptop" }, { label: "Monitor", value: "Monitor" },
    { label: "Printer", value: "Printer" }, { label: "Network", value: "Network" },
    { label: "Furniture", value: "Furniture" }, { label: "Other", value: "Other" },
  ]},
  { name: "purchasePrice", label: "Purchase Price", type: "number", required: true },
  { name: "location", label: "Location", type: "text" },
  { name: "assignedTo", label: "Assigned To", type: "text" },
];

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
  const [editing, setEditing] = useState<typeof initialAssets[0] | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [filters, setFilters] = useState<FilterState>({ _search: "", status: "" })

  const fmt = (n: number) => `EGP ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const totalValue = assets.reduce((s, a) => s + a.currentValue, 0)

  const filtered = assets.filter((a) => {
    if (filters.status && a.status !== filters.status) return false
    if (filters._search) {
      const q = filters._search.toLowerCase()
      return a.name.toLowerCase().includes(q) || a.assetTag.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Asset Management</h1><p className="text-gray-500">Track and manage company assets and maintenance schedules</p></div>
        <Button onClick={() => { setEditing(null); setShowModal(true) }}><Plus className="h-4 w-4 mr-2" />Add Asset</Button>
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
        <Card><CardContent className="pt-6 space-y-4">
          <FilterBar
            searchValue={filters._search}
            onSearchChange={(v) => setFilters((f) => ({ ...f, _search: v }))}
            fields={[{ key: "status", label: "Status", type: "select", options: [
              { label: "Active", value: "ACTIVE" }, { label: "Maintenance", value: "MAINTENANCE" },
              { label: "Retired", value: "RETIRED" }, { label: "Disposed", value: "DISPOSED" },
            ]}]}
            values={filters}
            onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
          />
          <DataTable
            columns={[
              { key: "name", label: "Asset", render: (v) => <span className="font-medium">{v as string}</span> },
              { key: "assetTag", label: "Tag", className: "text-gray-500" },
              { key: "category", label: "Category" },
              { key: "location", label: "Location" },
              { key: "assignedTo", label: "Assigned To" },
              { key: "currentValue", label: "Value", className: "text-right", render: (v) => fmt(v as number) },
              { key: "warrantyExpiry", label: "Warranty" },
              { key: "status", label: "Status", render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[v as string]}`}>{v as string}</span> },
              { key: "id", label: "", render: (_v, row) => {
                const a = row as unknown as typeof initialAssets[0];
                return (
                  <EditDeleteMenu
                    onEdit={() => { setEditing(a); setShowModal(true) }}
                    onDelete={() => setAssets(prev => prev.filter(x => x.id !== a.id))}
                    itemLabel={a.name}
                    extraItems={(() => {
                      const flow: Record<string, string> = { ACTIVE: "MAINTENANCE", MAINTENANCE: "ACTIVE", RETIRED: "DISPOSED" }
                      const next = flow[a.status]
                      if (!next) return []
                      return [{ label: `Set ${next}`, onClick: () => setAssets(prev => prev.map(x => x.id === a.id ? { ...x, status: next } : x)) }]
                    })()}
                  />
                );
              }},
            ] satisfies Column<Record<string, unknown>>[]}
            data={filtered as unknown as Record<string, unknown>[]}
            
            exportable exportFilename="erp-assets.csv" emptyMessage="No assets match your filters."
          />
        </CardContent></Card>
      )}

      {tab === "maintenance" && (
        <Card><CardContent className="pt-6">
          <DataTable
            columns={[
              { key: "asset", label: "Asset", render: (v) => <span className="font-medium">{v as string}</span> },
              { key: "type", label: "Type", render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${(v as string) === "PREVENTIVE" ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"}`}>{v as string}</span> },
              { key: "description", label: "Description" },
              { key: "scheduledDate", label: "Scheduled" },
              { key: "completedDate", label: "Completed", render: (v) => <>{(v as string | null) || "—"}</> },
              { key: "cost", label: "Cost", className: "text-right", render: (v) => <>{(v as number) > 0 ? fmt(v as number) : "—"}</> },
              { key: "status", label: "Status", render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[v as string]}`}>{v as string}</span> },
            ] satisfies Column<Record<string, unknown>>[]}
            data={maintenanceRecords as unknown as Record<string, unknown>[]}
            
            exportable exportFilename="erp-assets.csv" emptyMessage="No maintenance records found."
          />
        </CardContent></Card>
      )}
      <EntityFormModal
        open={showModal}
        onOpenChange={(open) => { if (!open) { setShowModal(false); setEditing(null) } }}
        title={editing ? "Edit Asset" : "Register New Asset"}
        fields={assetFields}
        initialData={editing ? { name: editing.name, category: editing.category, purchasePrice: editing.purchasePrice, location: editing.location, assignedTo: editing.assignedTo } : undefined}
        onSubmit={(data) => {
          if (editing) {
            setAssets(prev => prev.map(a => a.id === editing.id ? { ...a, name: data.name as string, category: (data.category as string) || a.category, purchasePrice: (data.purchasePrice as number) || a.purchasePrice, location: (data.location as string) || a.location, assignedTo: (data.assignedTo as string) || a.assignedTo } : a))
          } else {
            setAssets(prev => { const uid = Date.now().toString(36); return [...prev, { id: uid, name: data.name as string, assetTag: `AST-${uid}`, category: (data.category as string) || "Other", status: "ACTIVE", purchaseDate: new Date().toISOString().split("T")[0], purchasePrice: (data.purchasePrice as number) || 0, currentValue: (data.purchasePrice as number) || 0, location: (data.location as string) || "Office", assignedTo: (data.assignedTo as string) || "Unassigned", warrantyExpiry: "2027-01-01" }]})
          }
          setShowModal(false); setEditing(null)
        }}
      />
    </div>
  )
}
