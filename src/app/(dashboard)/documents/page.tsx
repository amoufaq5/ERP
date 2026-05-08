"use client"

import { useState, useCallback } from "react"
import {
  FileText, File, Upload, FolderOpen, ScanLine, Eye, Search,
  Download, CheckCircle, Clock, XCircle, FileImage, FileSpreadsheet,
  Loader2, Trash2, Filter, Plus, Pencil,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import DataTable from "@/components/shared/data-table"
import type { Column } from "@/components/shared/data-table"
import PageHeader from "@/components/shared/page-header"
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu"
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal"
import { useTranslation } from "@/lib/i18n/i18n-context"

interface OCRDocument {
  id: string
  name: string
  type: string
  category: "Invoice" | "Receipt" | "Contract" | "ID Document" | "Prescription" | "Lab Report" | "Other"
  size: string
  uploadedBy: string
  date: string
  ocrStatus: "pending" | "processing" | "completed" | "failed"
  confidence?: number
  extractedText?: string
  extractedFields?: Record<string, string>
}

const CATEGORIES = ["Invoice", "Receipt", "Contract", "ID Document", "Prescription", "Lab Report", "Other"] as const

const initialDocs: OCRDocument[] = [
  { id: "1", name: "Invoice #INV-2024-089.pdf", type: "PDF", category: "Invoice", size: "245 KB", uploadedBy: "Admin", date: "2024-03-25", ocrStatus: "completed", confidence: 94,
    extractedText: "Invoice Number: INV-2024-089\nDate: 2024-03-25\nCustomer: Acme Pharma Corp\nSubtotal: EGP 45,000.00\nVAT (14%): EGP 6,300.00\nTotal: EGP 51,300.00",
    extractedFields: { invoiceNumber: "INV-2024-089", date: "2024-03-25", customer: "Acme Pharma Corp", subtotal: "45000", vat: "6300", total: "51300" }},
  { id: "2", name: "Supplier_Contract_TechCorp.pdf", type: "PDF", category: "Contract", size: "1.2 MB", uploadedBy: "Legal", date: "2024-03-24", ocrStatus: "completed", confidence: 88,
    extractedText: "CONTRACT AGREEMENT\nParty A: Enterprise Suite LLC\nParty B: TechCorp Solutions\nEffective Date: 2024-01-01\nExpiration: 2025-12-31\nValue: EGP 250,000",
    extractedFields: { partyA: "Enterprise Suite LLC", partyB: "TechCorp Solutions", startDate: "2024-01-01", endDate: "2025-12-31", value: "250000" }},
  { id: "3", name: "Lab_Report_Batch_2024.pdf", type: "PDF", category: "Lab Report", size: "890 KB", uploadedBy: "QA Team", date: "2024-03-23", ocrStatus: "completed", confidence: 91,
    extractedText: "Laboratory Analysis Report\nBatch: BATCH-2024-045\nProduct: Amoxicillin 500mg\nTest Date: 2024-03-22\nResult: PASS\nPurity: 99.2%\nMoisture: 0.3%",
    extractedFields: { batchNumber: "BATCH-2024-045", product: "Amoxicillin 500mg", testDate: "2024-03-22", result: "PASS", purity: "99.2%", moisture: "0.3%" }},
  { id: "4", name: "Prescription_DR_Ahmed.jpg", type: "IMG", category: "Prescription", size: "340 KB", uploadedBy: "Medical Rep", date: "2024-03-22", ocrStatus: "completed", confidence: 76,
    extractedText: "Dr. Ahmed Hassan\nLicense: MED-4521\nPatient: Mohamed Ali\nRx: Omeprazole 20mg\nDosage: 1 cap daily before breakfast\nDuration: 30 days",
    extractedFields: { doctor: "Dr. Ahmed Hassan", license: "MED-4521", patient: "Mohamed Ali", medication: "Omeprazole 20mg", dosage: "1 cap daily", duration: "30 days" }},
  { id: "5", name: "Receipt_Office_Supplies.jpg", type: "IMG", category: "Receipt", size: "120 KB", uploadedBy: "Admin", date: "2024-03-21", ocrStatus: "pending" },
  { id: "6", name: "Employee_ID_Scan.png", type: "IMG", category: "ID Document", size: "560 KB", uploadedBy: "HR", date: "2024-03-20", ocrStatus: "processing" },
]

const typeColors: Record<string, string> = {
  PDF: "bg-red-100 text-red-700",
  DOC: "bg-blue-100 text-blue-700",
  XLS: "bg-green-100 text-green-700",
  IMG: "bg-purple-100 text-purple-700",
}

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle }> = {
  completed: { color: "bg-green-100 text-green-800", icon: CheckCircle },
  processing: { color: "bg-blue-100 text-blue-800", icon: Loader2 },
  pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
  failed: { color: "bg-red-100 text-red-800", icon: XCircle },
}

export default function DocumentsPage() {
  const { t } = useTranslation()
  const [docs, setDocs] = useState<OCRDocument[]>(initialDocs)
  const [activeTab, setActiveTab] = useState<"documents" | "upload" | "search">("documents")
  const [viewDoc, setViewDoc] = useState<OCRDocument | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [uploadFiles, setUploadFiles] = useState<{ name: string; category: string; size: string }[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [editingDoc, setEditingDoc] = useState<OCRDocument | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const docFields: EntityField[] = [
    { name: "name", label: "Document Name", type: "text", required: true },
    { name: "category", label: "Category", type: "select", required: true, options: CATEGORIES.map(c => ({ label: c, value: c })) },
    { name: "type", label: "File Type", type: "select", options: [
      { label: "PDF", value: "PDF" }, { label: "DOC", value: "DOC" },
      { label: "XLS", value: "XLS" }, { label: "IMG", value: "IMG" },
    ]},
    { name: "uploadedBy", label: "Uploaded By", type: "text" },
    { name: "date", label: "Date", type: "date" },
  ]

  const filtered = docs.filter(doc => {
    if (filterCategory && doc.category !== filterCategory) return false
    if (filterStatus && doc.ocrStatus !== filterStatus) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const searchable = `${doc.name} ${doc.extractedText || ""} ${doc.category}`.toLowerCase()
      return searchable.includes(q)
    }
    return true
  })

  const completedCount = docs.filter(d => d.ocrStatus === "completed").length
  const avgConfidence = docs.filter(d => d.confidence).reduce((s, d) => s + (d.confidence || 0), 0) / (completedCount || 1)

  function simulateOCR(docId: string) {
    setDocs(prev => prev.map(d => d.id === docId ? { ...d, ocrStatus: "processing" as const } : d))
    setTimeout(() => {
      setDocs(prev => prev.map(d => {
        if (d.id !== docId) return d
        const templates: Record<string, { text: string; fields: Record<string, string> }> = {
          Invoice: { text: "Invoice Number: INV-2024-XXX\nDate: 2024-03-XX\nTotal: EGP XX,XXX.00", fields: { invoiceNumber: "INV-2024-AUTO", date: d.date, total: "0" } },
          Receipt: { text: "Receipt\nDate: " + d.date + "\nAmount: EGP XXX.XX\nPayment Method: Cash", fields: { date: d.date, amount: "0", method: "Cash" } },
          Contract: { text: "CONTRACT AGREEMENT\nDate: " + d.date + "\nParties: ...\nValue: EGP XX,XXX", fields: { date: d.date, value: "0" } },
          "ID Document": { text: "National ID\nName: XXXXXXXXX\nID Number: XXXXXXXXXXXXXXX\nDate of Birth: XX/XX/XXXX", fields: { name: "—", idNumber: "—", dob: "—" } },
          Prescription: { text: "Prescription\nDoctor: Dr. XXXX\nMedication: XXXX\nDosage: XXX", fields: { doctor: "—", medication: "—", dosage: "—" } },
          "Lab Report": { text: "Lab Report\nBatch: XXXX\nTest: XXXX\nResult: PASS", fields: { batch: "—", test: "—", result: "PASS" } },
          Other: { text: "Document scanned successfully.\nContent extracted.", fields: {} },
        }
        const tpl = templates[d.category] || templates.Other
        return {
          ...d,
          ocrStatus: "completed" as const,
          confidence: Math.floor(75 + Math.random() * 20),
          extractedText: tpl.text,
          extractedFields: tpl.fields,
        }
      }))
    }, 2000)
  }

  function addUploadFile() {
    setUploadFiles(prev => [...prev, { name: "", category: "Invoice", size: "0 KB" }])
  }

  function processUploads() {
    const newDocs: OCRDocument[] = uploadFiles
      .filter(f => f.name.trim())
      .map(f => ({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: f.name,
        type: f.name.endsWith(".pdf") ? "PDF" : f.name.endsWith(".xls") || f.name.endsWith(".xlsx") ? "XLS" : "IMG",
        category: f.category as OCRDocument["category"],
        size: f.size || "0 KB",
        uploadedBy: "Admin",
        date: new Date().toISOString().split("T")[0],
        ocrStatus: "pending" as const,
      }))
    setDocs(prev => [...newDocs, ...prev])
    setUploadFiles([])
    setActiveTab("documents")
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    const newUploads = files.map(f => ({
      name: f.name,
      category: "Other",
      size: f.size > 1e6 ? (f.size / 1e6).toFixed(1) + " MB" : (f.size / 1e3).toFixed(0) + " KB",
    }))
    setUploadFiles(prev => [...prev, ...newUploads])
  }, [])

  function exportExtracted(format: "json" | "csv") {
    const processed = docs.filter(d => d.ocrStatus === "completed" && d.extractedFields)
    if (format === "json") {
      const blob = new Blob([JSON.stringify(processed.map(d => ({ name: d.name, category: d.category, confidence: d.confidence, fields: d.extractedFields })), null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a"); a.href = url; a.download = "ocr-data.json"; a.click()
      URL.revokeObjectURL(url)
    } else {
      const headers = ["Name", "Category", "Confidence", "Fields"]
      const rows = processed.map(d => [d.name, d.category, d.confidence, JSON.stringify(d.extractedFields)].join(","))
      const csv = [headers.join(","), ...rows].join("\n")
      const blob = new Blob([csv], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a"); a.href = url; a.download = "ocr-data.csv"; a.click()
      URL.revokeObjectURL(url)
    }
  }

  const docColumns: Column<Record<string, unknown>>[] = [
    { key: "name", label: "Document", render: (v) => {
      const name = String(v)
      const ext = name.split(".").pop()?.toUpperCase() || "FILE"
      const IconComp = ext === "PDF" ? FileText : ext === "XLS" || ext === "XLSX" ? FileSpreadsheet : ext === "JPG" || ext === "PNG" || ext === "IMG" ? FileImage : File
      return <div className="flex items-center gap-2"><IconComp className="h-4 w-4 text-muted-foreground" /><span className="font-medium text-sm">{name}</span></div>
    }},
    { key: "category", label: "Category", render: (v) => <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">{String(v)}</span> },
    { key: "ocrStatus", label: "OCR Status", render: (v, row) => {
      const s = String(v)
      const cfg = statusConfig[s] || statusConfig.pending
      const Icon = cfg.icon
      return (
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${cfg.color}`}>
            <Icon className={`h-3 w-3 ${s === "processing" ? "animate-spin" : ""}`} />{s}
          </span>
          {(row as unknown as OCRDocument).confidence && <span className="text-xs text-muted-foreground">{(row as unknown as OCRDocument).confidence}%</span>}
        </div>
      )
    }},
    { key: "size", label: "Size" },
    { key: "date", label: "Date" },
    { key: "actions", label: "", render: (_v, row) => {
      const doc = row as unknown as OCRDocument
      return (
        <div className="flex items-center gap-1">
          {doc.ocrStatus === "pending" && <Button size="sm" variant="ghost" title="Run OCR" onClick={() => simulateOCR(doc.id)}><ScanLine className="h-4 w-4" /></Button>}
          {doc.ocrStatus === "completed" && <Button size="sm" variant="ghost" title="View OCR Results" onClick={() => setViewDoc(doc)}><Eye className="h-4 w-4" /></Button>}
          <EditDeleteMenu
            compact
            onEdit={() => { setEditingDoc(doc); setFormOpen(true) }}
            onDelete={() => setDocs(prev => prev.filter(d => d.id !== doc.id))}
            itemLabel={doc.name}
          />
        </div>
      )
    }},
  ]

  return (
    <div className="space-y-6">
      <PageHeader title={t("doc.title")} description="Document management with OCR text extraction">
        <Button onClick={() => { setEditingDoc(null); setFormOpen(true) }}><Plus className="mr-2 h-4 w-4" />Add Document</Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><FileText className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Total Documents</p><p className="text-2xl font-bold">{docs.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-muted-foreground">OCR Completed</p><p className="text-2xl font-bold">{completedCount}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><ScanLine className="h-5 w-5 text-purple-600" /></div><div><p className="text-sm text-muted-foreground">Avg Confidence</p><p className="text-2xl font-bold">{avgConfidence.toFixed(0)}%</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-orange-100 rounded-lg"><Clock className="h-5 w-5 text-orange-600" /></div><div><p className="text-sm text-muted-foreground">Pending OCR</p><p className="text-2xl font-bold">{docs.filter(d => d.ocrStatus === "pending").length}</p></div></div></CardContent></Card>
      </div>

      <div className="flex gap-2 border-b pb-2">
        <Button variant={activeTab === "documents" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("documents")}><FileText className="h-4 w-4 mr-2" />Documents</Button>
        <Button variant={activeTab === "upload" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("upload")}><Upload className="h-4 w-4 mr-2" />Upload & OCR</Button>
        <Button variant={activeTab === "search" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("search")}><Search className="h-4 w-4 mr-2" />Text Search</Button>
      </div>

      {activeTab === "documents" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">All Documents</CardTitle>
              <div className="flex gap-2">
                <select className="rounded-md border px-2 py-1 text-xs" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                  <option value="">All Categories</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="rounded-md border px-2 py-1 text-xs" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="failed">Failed</option>
                </select>
                <Button size="sm" variant="outline" onClick={() => { const pending = docs.filter(d => d.ocrStatus === "pending"); pending.forEach(d => simulateOCR(d.id)) }}>
                  <ScanLine className="h-4 w-4 mr-1" />OCR All Pending
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportExtracted("json")}><Download className="h-4 w-4 mr-1" />JSON</Button>
                <Button size="sm" variant="outline" onClick={() => exportExtracted("csv")}><Download className="h-4 w-4 mr-1" />CSV</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable columns={docColumns} data={filtered as unknown as Record<string, unknown>[]} exportable exportFilename="documents" emptyMessage="No documents found." />
          </CardContent>
        </Card>
      )}

      {activeTab === "upload" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Upload Documents for OCR Processing</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragOver ? "border-purple-500 bg-purple-50" : "border-gray-300"}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">Drag & drop files here</p>
                <p className="text-xs text-muted-foreground mt-1">Supports PDF, JPG, PNG, TIFF — up to 25MB per file</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={addUploadFile}>Or add file manually</Button>
              </div>

              {uploadFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Files to process ({uploadFiles.length})</h4>
                  {uploadFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 border rounded">
                      <Input
                        placeholder="Filename (e.g., invoice_march.pdf)"
                        value={f.name}
                        onChange={e => setUploadFiles(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                        className="flex-1"
                      />
                      <select
                        className="rounded-md border px-2 py-2 text-sm"
                        value={f.category}
                        onChange={e => setUploadFiles(prev => prev.map((x, j) => j === i ? { ...x, category: e.target.value } : x))}
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <Button size="sm" variant="ghost" onClick={() => setUploadFiles(prev => prev.filter((_, j) => j !== i))}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={processUploads}><ScanLine className="h-4 w-4 mr-2" />Upload & Process OCR</Button>
                    <Button size="sm" variant="outline" onClick={addUploadFile}>Add Another</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "search" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Search className="h-5 w-5" />Search Extracted Text</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Search through OCR-extracted text..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <div className="space-y-3">
              {docs.filter(d => {
                if (!searchQuery || !d.extractedText) return false
                return d.extractedText.toLowerCase().includes(searchQuery.toLowerCase())
              }).map(d => (
                <div key={d.id} className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer" onClick={() => setViewDoc(d)}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{d.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">{d.category}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-line">{d.extractedText}</p>
                </div>
              ))}
              {searchQuery && docs.filter(d => d.extractedText?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">No results found for &quot;{searchQuery}&quot;</p>
              )}
              {!searchQuery && <p className="text-center text-sm text-muted-foreground py-8">Enter a search term to find text across all scanned documents.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Document Modal */}
      <EntityFormModal
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingDoc(null) }}
        title={editingDoc ? `Edit ${editingDoc.name}` : "Add New Document"}
        description={editingDoc ? "Update document metadata" : "Create a new document record"}
        fields={docFields}
        initialData={editingDoc ? {
          name: editingDoc.name,
          category: editingDoc.category,
          type: editingDoc.type,
          uploadedBy: editingDoc.uploadedBy,
          date: editingDoc.date,
        } : undefined}
        submitLabel={editingDoc ? "Update" : "Create"}
        onSubmit={(data) => {
          if (editingDoc) {
            setDocs(prev => prev.map(d => d.id === editingDoc.id ? {
              ...d,
              name: String(data.name),
              category: data.category as OCRDocument["category"],
              type: String(data.type || d.type),
              uploadedBy: String(data.uploadedBy || d.uploadedBy),
              date: String(data.date || d.date),
            } : d))
          } else {
            const newDoc: OCRDocument = {
              id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
              name: String(data.name),
              category: (data.category as OCRDocument["category"]) || "Other",
              type: String(data.type || "PDF"),
              size: "0 KB",
              uploadedBy: String(data.uploadedBy || "Admin"),
              date: String(data.date || new Date().toISOString().split("T")[0]),
              ocrStatus: "pending",
            }
            setDocs(prev => [newDoc, ...prev])
          }
          setFormOpen(false)
          setEditingDoc(null)
        }}
      />

      {/* OCR Detail Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={o => !o && setViewDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>OCR Results: {viewDoc?.name}</DialogTitle></DialogHeader>
          {viewDoc && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div><Label className="text-xs text-muted-foreground">Category</Label><p className="font-medium">{viewDoc.category}</p></div>
                <div><Label className="text-xs text-muted-foreground">Confidence</Label><p className="font-medium">{viewDoc.confidence}%</p></div>
                <div><Label className="text-xs text-muted-foreground">Date Scanned</Label><p className="font-medium">{viewDoc.date}</p></div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Confidence</Label>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${(viewDoc.confidence || 0) > 85 ? "bg-green-500" : (viewDoc.confidence || 0) > 70 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${viewDoc.confidence || 0}%` }} />
                </div>
                <span className="text-sm font-medium">{viewDoc.confidence}%</span>
              </div>

              {viewDoc.extractedFields && Object.keys(viewDoc.extractedFields).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Extracted Fields</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(viewDoc.extractedFields).map(([key, val]) => (
                      <div key={key} className="bg-muted p-2 rounded">
                        <span className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                        <p className="font-medium text-sm">{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewDoc.extractedText && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Extracted Text</h4>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs whitespace-pre-wrap overflow-x-auto">{viewDoc.extractedText}</pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
