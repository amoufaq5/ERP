"use client"

import { useState } from "react"
import { FileText, File, Image, Table2, Upload, Plus, Download, FolderOpen } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"

const typeIcon: Record<string, { icon: string; color: string }> = {
  PDF: { icon: "PDF", color: "bg-red-100 text-red-700" },
  DOC: { icon: "DOC", color: "bg-blue-100 text-blue-700" },
  XLS: { icon: "XLS", color: "bg-green-100 text-green-700" },
  IMG: { icon: "IMG", color: "bg-purple-100 text-purple-700" },
  PPT: { icon: "PPT", color: "bg-orange-100 text-orange-700" },
}

const initialDocs = [
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
  const [search, setSearch] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: "", type: "PDF", category: "", module: "" })

  const filtered = docs.filter(d =>
    `${d.name} ${d.category} ${d.module} ${d.type}`.toLowerCase().includes(search.toLowerCase())
  )

  const addDoc = () => {
    if (!form.name) return
    setDocs(p => [...p, { id: String(p.length + 1), name: form.name, type: form.type, category: form.category || "General", module: form.module || "General", size: "0 KB", uploadedBy: "Admin User", version: 1, date: new Date().toISOString().split("T")[0] }])
    setForm({ name: "", type: "PDF", category: "", module: "" })
    setShowAdd(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Document Management</h1><p className="text-gray-500">Centralized document storage and management</p></div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button><Upload className="h-4 w-4 mr-2" />Upload Document</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Document Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Type</Label>
                  <select className="w-full rounded-md border px-3 py-2 text-sm" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    <option>PDF</option><option>DOC</option><option>XLS</option><option>IMG</option><option>PPT</option>
                  </select>
                </div>
                <div><Label>Category</Label><Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} /></div>
              </div>
              <div><Label>Module</Label><Input value={form.module} onChange={e => setForm(p => ({ ...p, module: e.target.value }))} placeholder="ERP, CRM, ATS, HR, General" /></div>
              <div className="border-2 border-dashed rounded-lg p-8 text-center text-gray-400">
                <Upload className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Drag & drop file or click to browse</p>
              </div>
            </div>
            <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={addDoc}>Upload</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><FileText className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-gray-500">Total Documents</p><p className="text-2xl font-bold">{docs.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><Plus className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-gray-500">This Month</p><p className="text-2xl font-bold">8</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><FolderOpen className="h-5 w-5 text-purple-600" /></div><div><p className="text-sm text-gray-500">Storage Used</p><p className="text-2xl font-bold">2.4 GB</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-orange-100 rounded-lg"><File className="h-5 w-5 text-orange-600" /></div><div><p className="text-sm text-gray-500">Categories</p><p className="text-2xl font-bold">6</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><div className="flex items-center justify-between"><CardTitle>All Documents</CardTitle><Input placeholder="Search documents..." className="max-w-xs" value={search} onChange={e => setSearch(e.target.value)} /></div></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-gray-50">
              <th className="text-left p-3 font-medium">Name</th><th className="text-left p-3 font-medium">Type</th><th className="text-left p-3 font-medium">Category</th><th className="text-left p-3 font-medium">Module</th><th className="text-right p-3 font-medium">Size</th><th className="text-left p-3 font-medium">Uploaded By</th><th className="text-center p-3 font-medium">Ver</th><th className="text-left p-3 font-medium">Date</th><th className="text-center p-3 font-medium">Action</th>
            </tr></thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{d.name}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${typeIcon[d.type]?.color || "bg-gray-100 text-gray-700"}`}>{d.type}</span></td>
                  <td className="p-3">{d.category}</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">{d.module}</span></td>
                  <td className="p-3 text-right">{d.size}</td>
                  <td className="p-3 text-gray-500">{d.uploadedBy}</td>
                  <td className="p-3 text-center">v{d.version}</td>
                  <td className="p-3">{d.date}</td>
                  <td className="p-3 text-center"><Button variant="ghost" size="sm"><Download className="h-4 w-4" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
