"use client"

import { useState } from "react"
import { FileText, File, Upload, Plus, FolderOpen } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu"
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal"
import { FilterBar, type FilterState } from "@/components/shared/filter-bar"
import DataTable from "@/components/shared/data-table"
import type { Column } from "@/components/shared/data-table"

const typeIcon: Record<string, { icon: string; color: string }> = {
  PDF: { icon: "PDF", color: "bg-red-100 text-red-700" },
  DOC: { icon: "DOC", color: "bg-blue-100 text-blue-700" },
  XLS: { icon: "XLS", color: "bg-green-100 text-green-700" },
  IMG: { icon: "IMG", color: "bg-purple-100 text-purple-700" },
  PPT: { icon: "PPT", color: "bg-orange-100 text-orange-700" },
}

interface Doc {
  id: string;
  name: string;
  type: string;
  category: string;
  module: string;
  size: string;
  uploadedBy: string;
  version: number;
  date: string;
}

const docFields: EntityField[] = [
  { name: "name", label: "Document Name", type: "text", required: true },
  { name: "type", label: "Type", type: "select", required: true, options: [
    { label: "PDF", value: "PDF" }, { label: "DOC", value: "DOC" }, { label: "XLS", value: "XLS" },
    { label: "IMG", value: "IMG" }, { label: "PPT", value: "PPT" },
  ]},
  { name: "category", label: "Category", type: "text" },
  { name: "module", label: "Module", type: "select", options: [
    { label: "ERP", value: "ERP" }, { label: "CRM", value: "CRM" }, { label: "ATS", value: "ATS" },
    { label: "HR", value: "HR" }, { label: "General", value: "General" },
  ]},
];

const initialDocs: Doc[] = [
  { id: "1", name: "Invoice #INV-2024-089", type: "PDF", category: "Finance", module: "ERP", size: "245 KB", uploadedBy: "Admin User", version: 1, date: "2024-03-25" },
  { id: "2", name: "Supplier Contract - TechCorp", type: "PDF", category: "Contracts", module: "ERP", size: "1.2 MB", uploadedBy: "Sarah Johnson", version: 2, date: "2024-03-24" },
  { id: "3", name: "Resume - Emily Chen", type: "DOC", category: "Resumes", module: "ATS", size: "89 KB", uploadedBy: "HR Manager", version: 1, date: "2024-03-23" },
  { id: "4", name: "Employee Handbook 2024", type: "PDF", category: "Policies", module: "HR", size: "3.4 MB", uploadedBy: "Admin User", version: 5, date: "2024-03-20" },
  { id: "5", name: "Q1 Sales Report", type: "XLS", category: "Reports", module: "CRM", size: "567 KB", uploadedBy: "Sales Manager", version: 1, date: "2024-03-19" },
  { id: "6", name: "Product Catalog Photos", type: "IMG", category: "Marketing", module: "CRM", size: "8.2 MB", uploadedBy: "Marketing Team", version: 3, date: "2024-03-18" },
  { id: "7", name: "Board Meeting Presentation", type: "PPT", category: "Presentations", module: "General", size: "4.1 MB", uploadedBy: "Admin User", version: 2, date: "2024-03-15" },
  { id: "8", name: "NDA Template", type: "DOC", category: "Legal", module: "HR", size: "45 KB", uploadedBy: "Legal Team", version: 4, date: "2024-03-12" },
  { id: "9", name: "IT Asset Inventory", type: "XLS", category: "IT", module: "ERP", size: "234 KB", uploadedBy: "IT Manager", version: 1, date: "2024-03-10" },
  { id: "10", name: "Company Logo Pack", type: "IMG", category: "Branding", module: "General", size: "12.5 MB", uploadedBy: "Design Team", version: 2, date: "2024-03-08" },
]

export default function DocumentsPage() {
  const [docs, setDocs] = useState(initialDocs)
  const [editing, setEditing] = useState<Doc | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [filters, setFilters] = useState<FilterState>({ _search: "", type: "", module: "" })

  const filtered = docs.filter((d) => {
    if (filters.type && d.type !== filters.type) return false
    if (filters.module && d.module !== filters.module) return false
    if (filters._search) {
      const q = filters._search.toLowerCase()
      return `${d.name} ${d.category}`.toLowerCase().includes(q)
    }
    return true
  })

  const docColumns: Column<Record<string, unknown>>[] = [
    { key: "name", label: "Name", render: (v) => <span className="font-medium">{String(v)}</span> },
    { key: "type", label: "Type", render: (v) => <span className={`px-2 py-1 rounded text-xs font-bold ${typeIcon[String(v)]?.color || "bg-gray-100 text-gray-700"}`}>{String(v)}</span> },
    { key: "category", label: "Category" },
    { key: "module", label: "Module", render: (v) => <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">{String(v)}</span> },
    { key: "size", label: "Size", className: "text-right", render: (v) => <span className="text-right block">{String(v)}</span> },
    { key: "uploadedBy", label: "Uploaded By", render: (v) => <span className="text-gray-500">{String(v)}</span> },
    { key: "version", label: "Ver", className: "text-center", render: (v) => <span className="text-center block">v{String(v)}</span> },
    { key: "date", label: "Date" },
    { key: "actions", label: "", render: (_v, row) => (
      <EditDeleteMenu
        onEdit={() => { setEditing(row as unknown as Doc); setShowModal(true) }}
        onDelete={() => setDocs(prev => prev.filter(x => x.id !== row.id))}
        itemLabel={String(row.name)}
      />
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Document Management</h1><p className="text-gray-500">Centralized document storage and management</p></div>
        <Button onClick={() => { setEditing(null); setShowModal(true) }}><Upload className="h-4 w-4 mr-2" />Upload Document</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><FileText className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-gray-500">Total Documents</p><p className="text-2xl font-bold">{docs.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><Plus className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-gray-500">This Month</p><p className="text-2xl font-bold">8</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><FolderOpen className="h-5 w-5 text-purple-600" /></div><div><p className="text-sm text-gray-500">Storage Used</p><p className="text-2xl font-bold">2.4 GB</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-orange-100 rounded-lg"><File className="h-5 w-5 text-orange-600" /></div><div><p className="text-sm text-gray-500">Categories</p><p className="text-2xl font-bold">6</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Documents</CardTitle>
          <FilterBar
            searchValue={filters._search}
            onSearchChange={(v) => setFilters((f) => ({ ...f, _search: v }))}
            fields={[
              { key: "type", label: "Type", type: "select", options: [
                { label: "PDF", value: "PDF" }, { label: "DOC", value: "DOC" }, { label: "XLS", value: "XLS" },
                { label: "IMG", value: "IMG" }, { label: "PPT", value: "PPT" },
              ]},
              { key: "module", label: "Module", type: "select", options: [
                { label: "ERP", value: "ERP" }, { label: "CRM", value: "CRM" }, { label: "ATS", value: "ATS" },
                { label: "HR", value: "HR" }, { label: "General", value: "General" },
              ]},
            ]}
            values={filters}
            onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
          />
        </CardHeader>
        <CardContent>
          <DataTable
            columns={docColumns}
            data={filtered as unknown as Record<string, unknown>[]}
            exportable exportFilename="documents.csv" emptyMessage="No documents found."
          />
        </CardContent>
      </Card>

      <EntityFormModal
        open={showModal}
        onOpenChange={(open) => { if (!open) { setShowModal(false); setEditing(null) } }}
        title={editing ? "Edit Document" : "Upload Document"}
        fields={docFields}
        initialData={editing ? { name: editing.name, type: editing.type, category: editing.category, module: editing.module } : undefined}
        onSubmit={(data) => {
          if (editing) {
            setDocs(prev => prev.map(d => d.id === editing.id ? { ...d, name: data.name as string, type: (data.type as string) || d.type, category: (data.category as string) || d.category, module: (data.module as string) || d.module } : d))
          } else {
            setDocs(prev => [...prev, { id: Date.now().toString(36), name: data.name as string, type: (data.type as string) || "PDF", category: (data.category as string) || "General", module: (data.module as string) || "General", size: "0 KB", uploadedBy: "Admin User", version: 1, date: new Date().toISOString().split("T")[0] }])
          }
          setShowModal(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
