"use client"

import { useState, useEffect } from "react"
import {
  FileCheck, Send, CheckCircle, XCircle, Clock, AlertTriangle,
  RefreshCw, Settings, FileText, Download, Eye, Search, Hash,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import DataTable from "@/components/shared/data-table"
import type { Column } from "@/components/shared/data-table"
import PageHeader from "@/components/shared/page-header"
import { useTranslation } from "@/lib/i18n/i18n-context"
import { useDataStore } from "@/lib/data-store"

interface EInvoice {
  id: string
  internalId: string
  receiverName: string
  receiverTaxId: string
  dateIssued: string
  totalAmount: number
  vatAmount: number
  netAmount: number
  status: "draft" | "submitted" | "accepted" | "rejected" | "cancelled"
  uuid?: string
  submissionId?: string
  items: { description: string; quantity: number; unitPrice: number; total: number }[]
}

const TAX_CODES = [
  { code: "T1", name: "Value Added Tax", subtype: "V001", rate: 14, description: "Standard VAT rate" },
  { code: "T2", name: "Table Tax (Fixed)", subtype: "Tbl01", rate: 0, description: "Fixed amount per unit" },
  { code: "T3", name: "Table Tax (%)", subtype: "Tbl02", rate: 0, description: "Percentage table tax" },
  { code: "T4", name: "Withholding Tax", subtype: "W001", rate: 1, description: "WHT on services" },
  { code: "T5", name: "Stamp Tax", subtype: "ST01", rate: 0.5, description: "Stamp duty" },
  { code: "T6", name: "Entertainment Tax", subtype: "Ent01", rate: 0, description: "Entertainment services" },
  { code: "T7", name: "Resource Development", subtype: "RD01", rate: 0, description: "Resource dev fee" },
  { code: "T8", name: "Municipal Service", subtype: "Mn01", rate: 0, description: "Local municipality" },
  { code: "T9", name: "Medical Insurance", subtype: "MI01", rate: 0, description: "Health insurance levy" },
]

const sampleEInvoices: EInvoice[] = [
  { id: "1", internalId: "INV-2024-089", receiverName: "Acme Pharma Corp", receiverTaxId: "123-456-789", dateIssued: "2024-03-25", totalAmount: 51300, vatAmount: 6300, netAmount: 45000, status: "accepted", uuid: "ETA-UUID-001", submissionId: "SUB-001",
    items: [{ description: "Amoxicillin 500mg x100", quantity: 50, unitPrice: 500, total: 25000 }, { description: "Omeprazole 20mg x50", quantity: 40, unitPrice: 500, total: 20000 }]},
  { id: "2", internalId: "INV-2024-090", receiverName: "Delta Medical Supplies", receiverTaxId: "987-654-321", dateIssued: "2024-03-26", totalAmount: 22800, vatAmount: 2800, netAmount: 20000, status: "submitted", uuid: "ETA-UUID-002", submissionId: "SUB-002",
    items: [{ description: "Paracetamol 500mg x200", quantity: 100, unitPrice: 200, total: 20000 }]},
  { id: "3", internalId: "INV-2024-091", receiverName: "Nile Health Group", receiverTaxId: "456-789-123", dateIssued: "2024-03-27", totalAmount: 11400, vatAmount: 1400, netAmount: 10000, status: "rejected", uuid: "ETA-UUID-003",
    items: [{ description: "Metformin 850mg x100", quantity: 20, unitPrice: 500, total: 10000 }]},
  { id: "4", internalId: "INV-2024-092", receiverName: "Cairo Pharma Dist.", receiverTaxId: "789-123-456", dateIssued: "2024-03-28", totalAmount: 0, vatAmount: 0, netAmount: 0, status: "draft",
    items: []},
]

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-yellow-100 text-yellow-800",
}

export default function EInvoicingPage() {
  const { t } = useTranslation()
  const store = useDataStore()
  const [einvoices, setEinvoices] = useState<EInvoice[]>(sampleEInvoices)
  const [activeTab, setActiveTab] = useState<"invoices" | "submit" | "settings" | "taxcodes">("invoices")
  const [viewInvoice, setViewInvoice] = useState<EInvoice | null>(null)
  const [etaConfig, setEtaConfig] = useState({ clientId: "", clientSecret: "", environment: "sandbox", taxId: "", companyName: "Enterprise Suite LLC", activityCode: "4644" })
  const [submitForm, setSubmitForm] = useState({ selectedInvoiceId: "", receiverTaxId: "" })

  useEffect(() => {
    try { const saved = localStorage.getItem("eta-config"); if (saved) setEtaConfig(JSON.parse(saved)) } catch {}
    try { const saved = localStorage.getItem("einvoices"); if (saved) setEinvoices(JSON.parse(saved)) } catch {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem("einvoices", JSON.stringify(einvoices)) } catch {}
  }, [einvoices])

  function submitToETA(inv: EInvoice) {
    setEinvoices(prev => prev.map(ei => ei.id === inv.id ? { ...ei, status: "submitted" as const, uuid: "ETA-" + Date.now().toString(36), submissionId: "SUB-" + Date.now().toString(36) } : ei))
  }

  function convertInvoiceToEInvoice(invoiceId: string) {
    const invoice = store.invoices?.find((inv: Record<string, unknown>) => inv.id === invoiceId)
    if (!invoice) return
    const newEInv: EInvoice = {
      id: Date.now().toString(36),
      internalId: String(invoice.invoiceNumber || invoice.id),
      receiverName: String(invoice.customerName || "—"),
      receiverTaxId: submitForm.receiverTaxId || "000-000-000",
      dateIssued: String(invoice.date || new Date().toISOString().split("T")[0]),
      totalAmount: Number(invoice.total) || 0,
      vatAmount: (Number(invoice.total) || 0) * 0.14,
      netAmount: Number(invoice.total) || 0,
      status: "draft",
      items: [{ description: "Items from " + String(invoice.invoiceNumber || "invoice"), quantity: 1, unitPrice: Number(invoice.total) || 0, total: Number(invoice.total) || 0 }],
    }
    setEinvoices(prev => [newEInv, ...prev])
    setSubmitForm({ selectedInvoiceId: "", receiverTaxId: "" })
    setActiveTab("invoices")
  }

  function saveETAConfig() {
    try { localStorage.setItem("eta-config", JSON.stringify(etaConfig)) } catch {}
  }

  const accepted = einvoices.filter(e => e.status === "accepted").length
  const submitted = einvoices.filter(e => e.status === "submitted").length
  const rejected = einvoices.filter(e => e.status === "rejected").length
  const draft = einvoices.filter(e => e.status === "draft").length

  const columns: Column<Record<string, unknown>>[] = [
    { key: "internalId", label: "Invoice #", render: (v) => <span className="font-mono font-medium text-sm">{String(v)}</span> },
    { key: "receiverName", label: "Receiver" },
    { key: "receiverTaxId", label: "Tax ID", render: (v) => <span className="font-mono text-xs">{String(v)}</span> },
    { key: "dateIssued", label: "Date" },
    { key: "totalAmount", label: "Total (EGP)", render: (v) => <span className="font-medium">{Number(v).toLocaleString()}</span> },
    { key: "status", label: "Status", render: (v) => <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${statusColors[String(v)] || ""}`}>{String(v)}</span> },
    { key: "uuid", label: "ETA UUID", render: (v) => v ? <span className="font-mono text-xs">{String(v)}</span> : <span className="text-muted-foreground text-xs">—</span> },
    { key: "actions", label: "", render: (_v, row) => {
      const inv = row as unknown as EInvoice
      return (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setViewInvoice(inv)}><Eye className="h-4 w-4" /></Button>
          {inv.status === "draft" && <Button size="sm" variant="ghost" onClick={() => submitToETA(inv)}><Send className="h-4 w-4 text-blue-600" /></Button>}
        </div>
      )
    }},
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="E-Invoicing (ETA)" description="Egyptian Tax Authority electronic invoicing integration" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><Send className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Submitted</p><p className="text-2xl font-bold">{submitted}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-muted-foreground">Accepted</p><p className="text-2xl font-bold">{accepted}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-red-100 rounded-lg"><XCircle className="h-5 w-5 text-red-600" /></div><div><p className="text-sm text-muted-foreground">Rejected</p><p className="text-2xl font-bold">{rejected}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-gray-100 rounded-lg"><Clock className="h-5 w-5 text-gray-600" /></div><div><p className="text-sm text-muted-foreground">Drafts</p><p className="text-2xl font-bold">{draft}</p></div></div></CardContent></Card>
      </div>

      <div className="flex gap-2 border-b pb-2">
        <Button variant={activeTab === "invoices" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("invoices")}><FileCheck className="h-4 w-4 mr-2" />E-Invoices</Button>
        <Button variant={activeTab === "submit" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("submit")}><Send className="h-4 w-4 mr-2" />Submit New</Button>
        <Button variant={activeTab === "settings" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("settings")}><Settings className="h-4 w-4 mr-2" />Settings</Button>
        <Button variant={activeTab === "taxcodes" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("taxcodes")}><Hash className="h-4 w-4 mr-2" />Tax Codes</Button>
      </div>

      {activeTab === "invoices" && (
        <Card>
          <CardHeader><CardTitle className="text-base">E-Invoice Submissions</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={columns} data={einvoices as unknown as Record<string, unknown>[]} exportable exportFilename="e-invoices" emptyMessage="No e-invoices yet." />
          </CardContent>
        </Card>
      )}

      {activeTab === "submit" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Convert Invoice to E-Invoice</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Select Existing Invoice</Label>
                <select className="w-full rounded-md border px-3 py-2 text-sm mt-1" value={submitForm.selectedInvoiceId} onChange={e => setSubmitForm(p => ({ ...p, selectedInvoiceId: e.target.value }))}>
                  <option value="">Choose invoice...</option>
                  {(store.invoices || []).map((inv: Record<string, unknown>) => (
                    <option key={String(inv.id)} value={String(inv.id)}>{String(inv.invoiceNumber || inv.id)} — {String(inv.customerName || "N/A")} — EGP {Number(inv.total || 0).toLocaleString()}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Receiver Tax ID</Label>
                <Input placeholder="XXX-XXX-XXX" value={submitForm.receiverTaxId} onChange={e => setSubmitForm(p => ({ ...p, receiverTaxId: e.target.value }))} className="mt-1" />
              </div>
            </div>

            {submitForm.selectedInvoiceId && (
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2">ETA Format Preview</h4>
                <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
{JSON.stringify({
  issuer: { name: etaConfig.companyName, taxId: etaConfig.taxId || "XXX-XXX-XXX", activityCode: etaConfig.activityCode },
  receiver: { name: "From selected invoice", taxId: submitForm.receiverTaxId || "XXX-XXX-XXX" },
  documentType: "I",
  documentTypeVersion: "1.0",
  dateTimeIssued: new Date().toISOString(),
  taxpayerActivityCode: etaConfig.activityCode,
}, null, 2)}
                </pre>
              </div>
            )}

            <Button onClick={() => convertInvoiceToEInvoice(submitForm.selectedInvoiceId)} disabled={!submitForm.selectedInvoiceId}>
              <FileCheck className="h-4 w-4 mr-2" />Create E-Invoice Draft
            </Button>
          </CardContent>
        </Card>
      )}

      {activeTab === "settings" && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings className="h-5 w-5" />ETA Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Client ID</Label><Input placeholder="ETA Client ID" value={etaConfig.clientId} onChange={e => setEtaConfig(p => ({ ...p, clientId: e.target.value }))} className="mt-1" /></div>
              <div><Label>Client Secret</Label><Input type="password" placeholder="ETA Client Secret" value={etaConfig.clientSecret} onChange={e => setEtaConfig(p => ({ ...p, clientSecret: e.target.value }))} className="mt-1" /></div>
              <div><Label>Environment</Label>
                <select className="w-full rounded-md border px-3 py-2 text-sm mt-1" value={etaConfig.environment} onChange={e => setEtaConfig(p => ({ ...p, environment: e.target.value }))}>
                  <option value="sandbox">Sandbox (Pre-production)</option>
                  <option value="production">Production</option>
                </select>
              </div>
              <div><Label>Company Tax ID</Label><Input placeholder="XXX-XXX-XXX" value={etaConfig.taxId} onChange={e => setEtaConfig(p => ({ ...p, taxId: e.target.value }))} className="mt-1" /></div>
              <div><Label>Company Name</Label><Input value={etaConfig.companyName} onChange={e => setEtaConfig(p => ({ ...p, companyName: e.target.value }))} className="mt-1" /></div>
              <div><Label>Activity Code (ISIC4)</Label><Input value={etaConfig.activityCode} onChange={e => setEtaConfig(p => ({ ...p, activityCode: e.target.value }))} className="mt-1" /></div>
            </div>
            <Button size="sm" onClick={saveETAConfig}>Save Configuration</Button>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm">
              <p className="font-medium text-blue-800 mb-2">ETA Integration Setup</p>
              <ol className="list-decimal ml-5 space-y-1 text-blue-700">
                <li>Register at the ETA portal (invoicing.eta.gov.eg)</li>
                <li>Obtain Client ID and Client Secret credentials</li>
                <li>Configure your Tax ID and company information above</li>
                <li>Test in Sandbox mode before switching to Production</li>
                <li>Ensure your ERP code (ISIC4 activity code) is correct</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "taxcodes" && (
        <Card>
          <CardHeader><CardTitle className="text-base">ETA Tax Type Reference</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Code</th>
                <th className="text-left p-3 font-medium">Tax Type</th>
                <th className="text-left p-3 font-medium">Sub-Type</th>
                <th className="text-right p-3 font-medium">Rate %</th>
                <th className="text-left p-3 font-medium">Description</th>
              </tr></thead>
              <tbody>
                {TAX_CODES.map(tc => (
                  <tr key={tc.code} className="border-b hover:bg-muted/50">
                    <td className="p-3"><span className="px-2 py-0.5 rounded text-xs font-mono bg-purple-100 text-purple-800">{tc.code}</span></td>
                    <td className="p-3 font-medium">{tc.name}</td>
                    <td className="p-3 font-mono text-xs">{tc.subtype}</td>
                    <td className="p-3 text-right">{tc.rate}%</td>
                    <td className="p-3 text-muted-foreground">{tc.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!viewInvoice} onOpenChange={o => !o && setViewInvoice(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>E-Invoice: {viewInvoice?.internalId}</DialogTitle></DialogHeader>
          {viewInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Receiver</span><p className="font-medium">{viewInvoice.receiverName}</p></div>
                <div><span className="text-muted-foreground">Tax ID</span><p className="font-mono">{viewInvoice.receiverTaxId}</p></div>
                <div><span className="text-muted-foreground">Date</span><p className="font-medium">{viewInvoice.dateIssued}</p></div>
                <div><span className="text-muted-foreground">Status</span><p><span className={`px-2 py-0.5 rounded-full text-xs capitalize ${statusColors[viewInvoice.status]}`}>{viewInvoice.status}</span></p></div>
                <div><span className="text-muted-foreground">Net Amount</span><p className="font-medium">EGP {viewInvoice.netAmount.toLocaleString()}</p></div>
                <div><span className="text-muted-foreground">VAT (14%)</span><p className="font-medium">EGP {viewInvoice.vatAmount.toLocaleString()}</p></div>
                <div><span className="text-muted-foreground">Total</span><p className="font-bold text-lg">EGP {viewInvoice.totalAmount.toLocaleString()}</p></div>
                <div><span className="text-muted-foreground">ETA UUID</span><p className="font-mono text-xs">{viewInvoice.uuid || "—"}</p></div>
              </div>
              {viewInvoice.items.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Line Items</h4>
                  <table className="w-full text-xs">
                    <thead><tr className="border-b"><th className="text-left p-2">Description</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Unit Price</th><th className="text-right p-2">Total</th></tr></thead>
                    <tbody>{viewInvoice.items.map((item, i) => (
                      <tr key={i} className="border-b"><td className="p-2">{item.description}</td><td className="p-2 text-right">{item.quantity}</td><td className="p-2 text-right">{item.unitPrice.toLocaleString()}</td><td className="p-2 text-right font-medium">{item.total.toLocaleString()}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
