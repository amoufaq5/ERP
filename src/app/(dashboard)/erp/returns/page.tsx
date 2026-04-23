"use client";

import { useState } from "react";
import { RotateCcw, Clock, DollarSign, TrendingDown, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import StatusBadge from "@/components/shared/status-badge";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";

const RETURNS = [
  { id: "RET-1001", customer: "Al-Shifa Pharmacy", product: "Augmentin 625mg Tab", batch: "AUG2024-08", qty: 120, reason: "Near-Expiry", invoice: "INV-2401", value: "$1,440", date: "2026-03-28", status: "Pending" },
  { id: "RET-1002", customer: "National Hospital", product: "Cardizem 60mg", batch: "CAR2024-12", qty: 80, reason: "Expired", invoice: "INV-2380", value: "$960", date: "2026-03-27", status: "Approved" },
  { id: "RET-1003", customer: "MedPlus Distributors", product: "Voltaren 75mg", batch: "VOL2025-03", qty: 200, reason: "Damaged Packaging", invoice: "INV-2410", value: "$1,800", date: "2026-03-26", status: "Received" },
  { id: "RET-1004", customer: "Cairo Medical Supply", product: "Nexium 40mg", batch: "NEX2025-01", qty: 60, reason: "Wrong Product", invoice: "INV-2395", value: "$1,080", date: "2026-03-25", status: "Credit Issued" },
  { id: "RET-1005", customer: "Alexandria Pharmacy Chain", product: "Plavix 75mg", batch: "PLA2024-11", qty: 150, reason: "Product Recall", invoice: "INV-2370", value: "$3,750", date: "2026-03-24", status: "Approved" },
  { id: "RET-1006", customer: "Delta Pharma", product: "Crestor 20mg", batch: "CRE2025-02", qty: 90, reason: "Excess Stock", invoice: "INV-2415", value: "$1,620", date: "2026-03-23", status: "Pending" },
  { id: "RET-1007", customer: "Giza Hospital", product: "Herceptin", batch: "HER2025-01", qty: 5, reason: "Temperature Excursion", invoice: "INV-2401", value: "$8,500", date: "2026-03-22", status: "Approved" },
  { id: "RET-1008", customer: "Family Pharmacy Group", product: "Panadol Extra", batch: "PAN2025-04", qty: 300, reason: "Damaged Packaging", invoice: "INV-2420", value: "$900", date: "2026-03-21", status: "Received" },
  { id: "RET-1009", customer: "Mansoura Pharma", product: "Fucidin H Cream", batch: "FUC2024-09", qty: 75, reason: "Near-Expiry", invoice: "INV-2360", value: "$675", date: "2026-03-20", status: "Credit Issued" },
  { id: "RET-1010", customer: "Tanta Medical Supply", product: "Augmentin Susp", batch: "AGS2025-02", qty: 180, reason: "Excess Stock", invoice: "INV-2425", value: "$2,160", date: "2026-03-19", status: "Rejected" },
  { id: "RET-1011", customer: "Suez Hospital", product: "Depakine Chrono", batch: "DEP2024-10", qty: 100, reason: "Expired", invoice: "INV-2350", value: "$1,500", date: "2026-03-18", status: "Approved" },
  { id: "RET-1012", customer: "Zagazig Pharmacy", product: "Otrivin Spray", batch: "OTR2025-01", qty: 250, reason: "Wrong Product", invoice: "INV-2430", value: "$1,250", date: "2026-03-17", status: "Pending" },
];

const CREDIT_NOTES = [
  { id: "CN-501", returnRef: "RET-1004", customer: "Cairo Medical Supply", amount: "$1,080", taxAdj: "$151", net: "$929", date: "2026-03-26", appliedTo: "INV-2440", status: "Applied" },
  { id: "CN-502", returnRef: "RET-1009", customer: "Mansoura Pharma", amount: "$675", taxAdj: "$94", net: "$581", date: "2026-03-22", appliedTo: "INV-2445", status: "Applied" },
  { id: "CN-503", returnRef: "RET-1002", customer: "National Hospital", amount: "$960", taxAdj: "$134", net: "$826", date: "2026-03-29", appliedTo: "Pending", status: "Issued" },
  { id: "CN-504", returnRef: "RET-1005", customer: "Alexandria Pharmacy Chain", amount: "$3,750", taxAdj: "$525", net: "$3,225", date: "2026-03-26", appliedTo: "Pending", status: "Issued" },
  { id: "CN-505", returnRef: "RET-1007", customer: "Giza Hospital", amount: "$8,500", taxAdj: "$1,190", net: "$7,310", date: "2026-03-24", appliedTo: "Pending", status: "Issued" },
  { id: "CN-506", returnRef: "RET-1011", customer: "Suez Hospital", amount: "$1,500", taxAdj: "$210", net: "$1,290", date: "2026-03-20", appliedTo: "INV-2450", status: "Applied" },
  { id: "CN-507", returnRef: "RET-1003", customer: "MedPlus Distributors", amount: "$1,800", taxAdj: "$252", net: "$1,548", date: "2026-03-28", appliedTo: "Pending", status: "Issued" },
  { id: "CN-508", returnRef: "RET-1008", customer: "Family Pharmacy Group", amount: "$900", taxAdj: "$126", net: "$774", date: "2026-03-23", appliedTo: "INV-2455", status: "Applied" },
];

const DESTRUCTION = [
  { id: "DES-201", product: "Augmentin 625mg Tab", batch: "AUG2024-08", qty: 120, reason: "Expired", method: "Incineration", witnessed: "QA Manager + External Auditor", date: "2026-03-30", certificate: "CERT-2026-031", status: "Completed" },
  { id: "DES-202", product: "Cardizem 60mg", batch: "CAR2024-12", qty: 80, reason: "Expired", method: "Incineration", witnessed: "QA Manager", date: "2026-03-29", certificate: "CERT-2026-030", status: "Completed" },
  { id: "DES-203", product: "Plavix 75mg", batch: "PLA2024-11", qty: 150, reason: "Recalled", method: "Crushing & Disposal", witnessed: "QA Manager + Compliance Officer", date: "2026-03-28", certificate: "CERT-2026-029", status: "Completed" },
  { id: "DES-204", product: "Herceptin", batch: "HER2025-01", qty: 5, reason: "Failed QC (Temp)", method: "Special Hazardous Disposal", witnessed: "QA + Regulatory + 3rd Party", date: "2026-03-25", certificate: "CERT-2026-028", status: "Completed" },
  { id: "DES-205", product: "Depakine Chrono", batch: "DEP2024-10", qty: 100, reason: "Expired", method: "Incineration", witnessed: "QA Manager", date: "2026-03-22", certificate: "CERT-2026-027", status: "Completed" },
  { id: "DES-206", product: "Voltaren 75mg", batch: "VOL2025-03", qty: 200, reason: "Damaged", method: "Crushing & Disposal", witnessed: "QA Manager", date: "2026-03-31", certificate: "Pending", status: "Scheduled" },
];

const REASON_BREAKDOWN = [
  { reason: "Near-Expiry", count: 28, pct: 32 },
  { reason: "Expired", count: 18, pct: 21 },
  { reason: "Damaged Packaging", count: 14, pct: 16 },
  { reason: "Excess Stock", count: 10, pct: 11 },
  { reason: "Product Recall", count: 8, pct: 9 },
  { reason: "Wrong Product", count: 6, pct: 7 },
  { reason: "Temperature Excursion", count: 4, pct: 4 },
];

const REASONS = ["Near-Expiry", "Expired", "Damaged Packaging", "Product Recall", "Wrong Product", "Excess Stock", "Temperature Excursion"];

const returnFields: EntityField[] = [
  { name: "customer", label: "Customer", type: "text", required: true },
  { name: "product", label: "Product", type: "text", required: true },
  { name: "batch", label: "Batch#", type: "text", required: true },
  { name: "qty", label: "Quantity", type: "number", required: true },
  { name: "reason", label: "Reason", type: "select", required: true, options: REASONS.map(r => ({ label: r, value: r })) },
  { name: "invoice", label: "Original Invoice#", type: "text", required: true },
  { name: "value", label: "Return Value", type: "text", placeholder: "$0" },
];

const creditFields: EntityField[] = [
  { name: "returnRef", label: "Return Reference", type: "text", required: true },
  { name: "customer", label: "Customer", type: "text", required: true },
  { name: "amount", label: "Amount", type: "text", required: true, placeholder: "$0" },
  { name: "taxAdj", label: "Tax Adjustment", type: "text", placeholder: "$0" },
  { name: "net", label: "Net Credit", type: "text", placeholder: "$0" },
  { name: "appliedTo", label: "Applied To Invoice", type: "text", placeholder: "INV-XXXX or Pending" },
];

const destructionFields: EntityField[] = [
  { name: "product", label: "Product", type: "text", required: true },
  { name: "batch", label: "Batch#", type: "text", required: true },
  { name: "qty", label: "Quantity", type: "number", required: true },
  { name: "reason", label: "Reason", type: "select", required: true, options: [
    { label: "Expired", value: "Expired" }, { label: "Recalled", value: "Recalled" },
    { label: "Failed QC", value: "Failed QC" }, { label: "Damaged", value: "Damaged" },
    { label: "Failed QC (Temp)", value: "Failed QC (Temp)" },
  ]},
  { name: "method", label: "Method", type: "select", required: true, options: [
    { label: "Incineration", value: "Incineration" }, { label: "Crushing & Disposal", value: "Crushing & Disposal" },
    { label: "Special Hazardous Disposal", value: "Special Hazardous Disposal" },
  ]},
  { name: "witnessed", label: "Witnessed By", type: "text", required: true },
  { name: "date", label: "Scheduled Date", type: "date", required: true },
];

type ModalType = { kind: "return"; editing: typeof RETURNS[0] | null } | { kind: "credit"; editing: typeof CREDIT_NOTES[0] | null } | { kind: "destruction"; editing: typeof DESTRUCTION[0] | null } | null;

export default function ReturnsPage() {
  const [returns, setReturns] = useState(RETURNS);
  const [credits, setCredits] = useState(CREDIT_NOTES);
  const [destructions, setDestructions] = useState(DESTRUCTION);
  const [modal, setModal] = useState<ModalType>(null);
  const [retFilters, setRetFilters] = useState<FilterState>({});

  const pending = returns.filter(r => r.status === "Pending").length;
  const totalValue = returns.reduce((s, r) => s + parseFloat(r.value.replace(/[$,]/g, "")), 0);
  const approvedValue = returns.filter(r => r.status === "Approved" || r.status === "Credit Issued").reduce((s, r) => s + parseFloat(r.value.replace(/[$,]/g, "")), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goods Returns Management"
        description="Manage returned products, credit notes, and destruction logs"
        actions={<Button onClick={() => setModal({ kind: "return", editing: null })}><Plus className="mr-2 h-4 w-4" />New Return Request</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={RotateCcw} title="Total Returns" value={returns.length} subtitle="This month" iconColor="bg-blue-100 text-blue-700" />
        <StatsCard icon={Clock} title="Pending Returns" value={pending} iconColor="bg-amber-100 text-amber-700" />
        <StatsCard icon={DollarSign} title="Approved Value" value={`$${(approvedValue / 1000).toFixed(1)}K`} iconColor="bg-green-100 text-green-700" />
        <StatsCard icon={TrendingDown} title="Return Rate" value="2.4%" subtitle="Of total sales" iconColor="bg-red-100 text-red-700" />
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Return Requests</TabsTrigger>
          <TabsTrigger value="credits">Credit Notes</TabsTrigger>
          <TabsTrigger value="destruction">Destruction Log</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <FilterBar
            searchPlaceholder="Search returns..."
            searchValue={retFilters._search ?? ""}
            onSearchChange={(v) => setRetFilters(prev => ({ ...prev, _search: v }))}
            fields={[
              { key: "status", label: "Status", type: "select", options: [
                { label: "Pending", value: "Pending" }, { label: "Approved", value: "Approved" },
                { label: "Received", value: "Received" }, { label: "Credit Issued", value: "Credit Issued" },
                { label: "Rejected", value: "Rejected" },
              ]},
              { key: "reason", label: "Reason", type: "select", options: REASONS.map(r => ({ label: r, value: r })) },
            ]}
            values={retFilters}
            onChange={(k, v) => setRetFilters(f => ({ ...f, [k]: v }))}
            rightSlot={<Button size="sm" onClick={() => setModal({ kind: "return", editing: null })}><Plus className="mr-2 h-4 w-4" />Add Return</Button>}
          />
          <Card>
            <CardHeader><CardTitle>Return Requests</CardTitle><CardDescription>{returns.length} return requests</CardDescription></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3">Return#</th><th className="p-3">Customer</th><th className="p-3">Product</th><th className="p-3">Batch#</th><th className="p-3">Qty</th><th className="p-3">Reason</th><th className="p-3">Invoice</th><th className="p-3">Value</th><th className="p-3">Date</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr>
                  </thead>
                  <tbody>
                    {returns
                      .filter(r => !retFilters._search || r.id.toLowerCase().includes(retFilters._search.toLowerCase()) || r.customer.toLowerCase().includes(retFilters._search.toLowerCase()) || r.product.toLowerCase().includes(retFilters._search.toLowerCase()))
                      .filter(r => !retFilters.status || r.status === retFilters.status)
                      .filter(r => !retFilters.reason || r.reason === retFilters.reason)
                      .map(r => {
                        const flow: Record<string, string> = { "Pending": "Approved", "Approved": "Received", "Received": "Credit Issued" };
                        const next = flow[r.status];
                        return (
                          <tr key={r.id} className="border-t">
                            <td className="p-3 font-mono">{r.id}</td>
                            <td className="p-3 font-medium">{r.customer}</td>
                            <td className="p-3">{r.product}</td>
                            <td className="p-3 font-mono text-xs">{r.batch}</td>
                            <td className="p-3">{r.qty}</td>
                            <td className="p-3"><StatusBadge status={r.reason} /></td>
                            <td className="p-3 font-mono text-xs">{r.invoice}</td>
                            <td className="p-3 font-semibold">{r.value}</td>
                            <td className="p-3">{r.date}</td>
                            <td className="p-3"><StatusBadge status={r.status} /></td>
                            <td className="p-3">
                              <EditDeleteMenu
                                onEdit={() => setModal({ kind: "return", editing: r })}
                                onDelete={() => setReturns(prev => prev.filter(x => x.id !== r.id))}
                                itemLabel={r.id}
                                extraItems={[
                                  ...(next ? [{ label: `→ ${next}`, onClick: () => setReturns(prev => prev.map(x => x.id === r.id ? { ...x, status: next } : x)) }] : []),
                                  ...(r.status === "Pending" ? [{ label: "Reject", onClick: () => setReturns(prev => prev.map(x => x.id === r.id ? { ...x, status: "Rejected" } : x)), destructive: true }] : []),
                                ]}
                              />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credits" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setModal({ kind: "credit", editing: null })}><Plus className="mr-2 h-4 w-4" />Issue Credit Note</Button>
          </div>
          <Card>
            <CardHeader><CardTitle>Credit Notes</CardTitle><CardDescription>Issued credit notes for approved returns</CardDescription></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3">Credit Note#</th><th className="p-3">Return Ref</th><th className="p-3">Customer</th><th className="p-3">Amount</th><th className="p-3">Tax Adj</th><th className="p-3">Net Credit</th><th className="p-3">Issue Date</th><th className="p-3">Applied To</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr>
                  </thead>
                  <tbody>
                    {credits.map(c => {
                      const nextCn = c.status === "Issued" ? "Applied" : undefined;
                      return (
                        <tr key={c.id} className="border-t">
                          <td className="p-3 font-mono">{c.id}</td>
                          <td className="p-3 font-mono text-xs">{c.returnRef}</td>
                          <td className="p-3 font-medium">{c.customer}</td>
                          <td className="p-3">{c.amount}</td>
                          <td className="p-3">{c.taxAdj}</td>
                          <td className="p-3 font-semibold">{c.net}</td>
                          <td className="p-3">{c.date}</td>
                          <td className="p-3">{c.appliedTo}</td>
                          <td className="p-3"><StatusBadge status={c.status} /></td>
                          <td className="p-3">
                            <EditDeleteMenu
                              onEdit={() => setModal({ kind: "credit", editing: c })}
                              onDelete={() => setCredits(prev => prev.filter(x => x.id !== c.id))}
                              itemLabel={c.id}
                              extraItems={nextCn ? [{ label: `→ ${nextCn}`, onClick: () => setCredits(prev => prev.map(x => x.id === c.id ? { ...x, status: nextCn } : x)) }] : []}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="destruction" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setModal({ kind: "destruction", editing: null })}><Plus className="mr-2 h-4 w-4" />Schedule Destruction</Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" />Destruction Log</CardTitle>
              <CardDescription>Documented destruction of unsellable pharmaceutical products (regulatory requirement)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3">Log#</th><th className="p-3">Product</th><th className="p-3">Batch#</th><th className="p-3">Qty</th><th className="p-3">Reason</th><th className="p-3">Method</th><th className="p-3">Witnessed By</th><th className="p-3">Date</th><th className="p-3">Certificate#</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr>
                  </thead>
                  <tbody>
                    {destructions.map(d => {
                      const nextD = d.status === "Scheduled" ? "Completed" : undefined;
                      return (
                        <tr key={d.id} className="border-t">
                          <td className="p-3 font-mono">{d.id}</td>
                          <td className="p-3 font-medium">{d.product}</td>
                          <td className="p-3 font-mono text-xs">{d.batch}</td>
                          <td className="p-3">{d.qty}</td>
                          <td className="p-3"><StatusBadge status={d.reason} /></td>
                          <td className="p-3">{d.method}</td>
                          <td className="p-3 text-xs">{d.witnessed}</td>
                          <td className="p-3">{d.date}</td>
                          <td className="p-3 font-mono text-xs">{d.certificate}</td>
                          <td className="p-3"><StatusBadge status={d.status} /></td>
                          <td className="p-3">
                            <EditDeleteMenu
                              onEdit={() => setModal({ kind: "destruction", editing: d })}
                              onDelete={() => setDestructions(prev => prev.filter(x => x.id !== d.id))}
                              itemLabel={d.id}
                              extraItems={nextD ? [{ label: `→ ${nextD}`, onClick: () => setDestructions(prev => prev.map(x => x.id === d.id ? { ...x, status: nextD, certificate: `CERT-2026-${String(32 + prev.indexOf(x)).padStart(3, "0")}` } : x)) }] : []}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Top Return Reasons</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {REASON_BREAKDOWN.map((r, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{r.reason}</span>
                        <span className="text-muted-foreground">{r.count} ({r.pct}%)</span>
                      </div>
                      <div className="h-2 w-full rounded bg-muted overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${r.pct * 3}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Monthly Return Trend</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-40">
                  {[42, 38, 45, 51, 39, 44, 48, 36, 41, 47, 52, 43].map((v, i) => (
                    <div key={i} className="flex-1 bg-primary/70 rounded-t" style={{ height: `${v * 1.5}px` }} title={`${v} returns`} />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>Apr</span><span>Mar</span>
                </div>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader><CardTitle>Top Returning Customers</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Al-Shifa Pharmacy</span><span className="font-semibold">$5,200</span></div>
                  <div className="flex justify-between"><span>National Hospital</span><span className="font-semibold">$4,800</span></div>
                  <div className="flex justify-between"><span>MedPlus Distributors</span><span className="font-semibold">$4,200</span></div>
                  <div className="flex justify-between"><span>Alexandria Pharmacy Chain</span><span className="font-semibold">$3,750</span></div>
                  <div className="flex justify-between"><span>Cairo Medical Supply</span><span className="font-semibold">$3,100</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Return Modal */}
      {modal?.kind === "return" && (
        <EntityFormModal
          open
          onOpenChange={() => setModal(null)}
          title={modal.editing ? `Edit ${modal.editing.id}` : "New Return Request"}
          fields={returnFields}
          initialData={modal.editing ? {
            customer: modal.editing.customer, product: modal.editing.product,
            batch: modal.editing.batch, qty: modal.editing.qty,
            reason: modal.editing.reason, invoice: modal.editing.invoice, value: modal.editing.value,
          } : undefined}
          submitLabel={modal.editing ? "Update" : "Create"}
          onSubmit={(d) => {
            if (modal.editing) {
              setReturns(prev => prev.map(r => r.id === modal.editing!.id ? {
                ...r, customer: String(d.customer), product: String(d.product),
                batch: String(d.batch), qty: Number(d.qty), reason: String(d.reason),
                invoice: String(d.invoice), value: String(d.value) || r.value,
              } : r));
            } else {
              setReturns(prev => [{
                id: `RET-${1013 + prev.length}`, customer: String(d.customer), product: String(d.product),
                batch: String(d.batch), qty: Number(d.qty), reason: String(d.reason), invoice: String(d.invoice),
                value: String(d.value) || "$0", date: new Date().toISOString().slice(0, 10), status: "Pending",
              }, ...prev]);
            }
          }}
        />
      )}
      {/* Credit Note Modal */}
      {modal?.kind === "credit" && (
        <EntityFormModal
          open
          onOpenChange={() => setModal(null)}
          title={modal.editing ? `Edit ${modal.editing.id}` : "Issue Credit Note"}
          fields={creditFields}
          initialData={modal.editing ? {
            returnRef: modal.editing.returnRef, customer: modal.editing.customer,
            amount: modal.editing.amount, taxAdj: modal.editing.taxAdj,
            net: modal.editing.net, appliedTo: modal.editing.appliedTo,
          } : undefined}
          submitLabel={modal.editing ? "Update" : "Issue"}
          onSubmit={(d) => {
            if (modal.editing) {
              setCredits(prev => prev.map(c => c.id === modal.editing!.id ? {
                ...c, returnRef: String(d.returnRef), customer: String(d.customer),
                amount: String(d.amount), taxAdj: String(d.taxAdj),
                net: String(d.net), appliedTo: String(d.appliedTo) || "Pending",
              } : c));
            } else {
              setCredits(prev => [{
                id: `CN-${509 + prev.length}`, returnRef: String(d.returnRef), customer: String(d.customer),
                amount: String(d.amount), taxAdj: String(d.taxAdj), net: String(d.net),
                date: new Date().toISOString().slice(0, 10),
                appliedTo: String(d.appliedTo) || "Pending", status: "Issued",
              }, ...prev]);
            }
          }}
        />
      )}
      {/* Destruction Modal */}
      {modal?.kind === "destruction" && (
        <EntityFormModal
          open
          onOpenChange={() => setModal(null)}
          title={modal.editing ? `Edit ${modal.editing.id}` : "Schedule Destruction"}
          fields={destructionFields}
          initialData={modal.editing ? {
            product: modal.editing.product, batch: modal.editing.batch,
            qty: modal.editing.qty, reason: modal.editing.reason,
            method: modal.editing.method, witnessed: modal.editing.witnessed, date: modal.editing.date,
          } : undefined}
          submitLabel={modal.editing ? "Update" : "Schedule"}
          onSubmit={(d) => {
            if (modal.editing) {
              setDestructions(prev => prev.map(x => x.id === modal.editing!.id ? {
                ...x, product: String(d.product), batch: String(d.batch),
                qty: Number(d.qty), reason: String(d.reason), method: String(d.method),
                witnessed: String(d.witnessed), date: String(d.date),
              } : x));
            } else {
              setDestructions(prev => [{
                id: `DES-${207 + prev.length}`, product: String(d.product), batch: String(d.batch),
                qty: Number(d.qty), reason: String(d.reason), method: String(d.method),
                witnessed: String(d.witnessed), date: String(d.date),
                certificate: "Pending", status: "Scheduled",
              }, ...prev]);
            }
          }}
        />
      )}
    </div>
  );
}
