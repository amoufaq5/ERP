"use client";

import { useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import StatusBadge from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDataStore,
  type Customer,
  type CustomerDocument,
  type Vendor,
  type Invoice,
  type Payment,
  type Cheque,
  type SalesOrder,
  type PurchaseOrder,
} from "@/lib/data-store";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Building2,
  CreditCard,
  FileText,
  DollarSign,
  TrendingUp,
  Download,
  Upload,
  Eye,
  Trash2,
} from "lucide-react";

const DOCUMENT_TYPES = [
  "Registration Certificate",
  "Tax Card",
  "Commercial Register",
  "VAT Certificate",
  "ID / Passport",
  "Power of Attorney",
  "Bank Letter",
  "Contract",
  "Other",
];

export default function PartnerDetailPage() {
  const searchParams = useSearchParams();
  const store = useDataStore();

  const partnerType = searchParams.get("type") as "customer" | "vendor" | null;
  const partnerId = searchParams.get("id");

  const [docType, setDocType] = useState("Registration Certificate");
  const docInputRef = useRef<HTMLInputElement>(null);

  // Look up partner
  const customer = partnerType === "customer" && partnerId
    ? store.customers.find((c) => c.id === partnerId)
    : null;
  const vendor = partnerType === "vendor" && partnerId
    ? store.vendors.find((v) => v.id === partnerId)
    : null;

  const partner = customer ?? vendor;
  const isCustomer = !!customer;

  // Related data
  const invoices = useMemo(() => {
    if (!partnerId) return [];
    if (isCustomer) return store.invoices.filter((i) => i.customerId === partnerId);
    return [];
  }, [store.invoices, partnerId, isCustomer]);

  const payments = useMemo(() => {
    if (!partnerId) return [];
    if (isCustomer) return store.payments.filter((p) => p.customerId === partnerId);
    return store.payments.filter((p) => p.vendorId === partnerId);
  }, [store.payments, partnerId, isCustomer]);

  const cheques = useMemo(() => {
    if (!partner) return [];
    return store.cheques.filter((c) => c.partyName === partner.name);
  }, [store.cheques, partner]);

  const salesOrders = useMemo(() => {
    if (!isCustomer || !partnerId) return [];
    return store.salesOrders.filter((so) => so.customerId === partnerId);
  }, [store.salesOrders, partnerId, isCustomer]);

  const purchaseOrders = useMemo(() => {
    if (isCustomer || !partnerId) return [];
    return store.purchaseOrders.filter((po) => po.vendorId === partnerId);
  }, [store.purchaseOrders, partnerId, isCustomer]);

  // Financial summary
  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = partner ? ("outstanding" in partner ? partner.outstanding : 0) : 0;
  const creditLimit = customer ? customer.creditLimit : 0;

  // Ledger entries
  const ledgerEntries = useMemo(() => {
    if (!partner) return [];
    const lines: { date: string; description: string; ref: string; debit: number; credit: number; type: string }[] = [];
    invoices.forEach((i) => lines.push({
      date: i.date.slice(0, 10),
      description: `Invoice ${i.number}`,
      ref: i.number,
      debit: i.total,
      credit: 0,
      type: "Invoice",
    }));
    payments.forEach((p) => lines.push({
      date: p.date,
      description: `Payment ${p.reference}`,
      ref: p.reference,
      debit: 0,
      credit: p.amount,
      type: "Payment",
    }));
    cheques.forEach((c) => lines.push({
      date: c.issueDate.slice(0, 10),
      description: `Cheque ${c.number} (${c.status})`,
      ref: c.number,
      debit: c.type === "OUTGOING" ? c.amount : 0,
      credit: c.type === "INCOMING" ? c.amount : 0,
      type: "Cheque",
    }));
    lines.sort((a, b) => a.date.localeCompare(b.date));
    let balance = 0;
    return lines.map((l) => { balance += l.debit - l.credit; return { ...l, balance }; });
  }, [partner, invoices, payments, cheques]);

  // Document helpers (customer only)
  function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !customer) return;
    const reader = new FileReader();
    reader.onload = () => {
      const newDoc: CustomerDocument = {
        id: store.genId("cdoc"),
        name: file.name,
        type: docType,
        data: reader.result as string,
        uploadedAt: new Date().toISOString(),
      };
      const existing = customer.documents ?? [];
      store.update("customers", customer.id, { documents: [...existing, newDoc] });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function removeDocument(docId: string) {
    if (!customer) return;
    const updated = (customer.documents ?? []).filter((d) => d.id !== docId);
    store.update("customers", customer.id, { documents: updated });
  }

  function viewDocument(doc: CustomerDocument) {
    const w = window.open("", "_blank");
    if (!w) return;
    if (doc.data.startsWith("data:image/")) {
      w.document.write(`<html><head><title>${doc.name}</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f1f1f1"><img src="${doc.data}" style="max-width:100%;max-height:100vh" /></body></html>`);
    } else if (doc.data.startsWith("data:application/pdf")) {
      w.document.write(`<html><head><title>${doc.name}</title></head><body style="margin:0"><embed src="${doc.data}" type="application/pdf" width="100%" height="100%" style="position:absolute;inset:0" /></body></html>`);
    } else {
      const a = w.document.createElement("a");
      a.href = doc.data;
      a.download = doc.name;
      a.click();
      w.close();
    }
  }

  const egp = (n: number) => `EGP ${n.toLocaleString()}`;

  if (!partner) {
    return (
      <div className="space-y-6">
        <PageHeader title="Partner Not Found" description="The requested partner could not be found." />
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No {partnerType ?? "partner"} found with ID: {partnerId ?? "none"}</p>
          <Link href="/erp/accounting">
            <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Accounting</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/erp/accounting">
            <Button variant="ghost" size="sm" className="mt-1"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{partner.name}</h1>
              <Badge variant="outline" className="font-mono text-xs">{"code" in partner ? partner.code : ""}</Badge>
              <Badge className={isCustomer ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}>
                {isCustomer ? "Customer" : "Vendor"}
              </Badge>
              {isCustomer && customer && (
                <Badge className={
                  customer.status === "ACTIVE" ? "bg-green-100 text-green-800"
                    : customer.status === "HOLD" ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }>
                  {customer.status}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {isCustomer ? customer?.type : (vendor as Vendor)?.category} &middot; Since {new Date(partner.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Contact info */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-medium">{partner.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium">{partner.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="font-medium">{partner.address}</p>
              </div>
            </div>
            {isCustomer && customer?.city && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">City</p>
                  <p className="font-medium">{customer.city}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Financial summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={DollarSign}
          title="Outstanding"
          value={egp(outstanding)}
          subtitle={outstanding > 0 ? "Balance due" : "No outstanding balance"}
          iconColor="bg-red-100 text-red-600"
        />
        {isCustomer && (
          <StatsCard
            icon={CreditCard}
            title="Credit Limit"
            value={egp(creditLimit)}
            subtitle={`${((outstanding / Math.max(creditLimit, 1)) * 100).toFixed(0)}% utilized`}
            iconColor="bg-blue-100 text-blue-600"
          />
        )}
        <StatsCard
          icon={FileText}
          title={isCustomer ? "Total Invoiced" : "Total Purchases"}
          value={egp(isCustomer ? totalInvoiced : purchaseOrders.reduce((s, po) => s + po.total, 0))}
          subtitle={`${isCustomer ? invoices.length : purchaseOrders.length} ${isCustomer ? "invoices" : "POs"}`}
          iconColor="bg-amber-100 text-amber-600"
        />
        <StatsCard
          icon={TrendingUp}
          title="Total Payments"
          value={egp(totalPaid)}
          subtitle={`${payments.length} payments`}
          iconColor="bg-green-100 text-green-600"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="invoices">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="invoices">
            {isCustomer ? "Invoices" : "Invoices"} ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
          <TabsTrigger value="cheques">Cheques ({cheques.length})</TabsTrigger>
          <TabsTrigger value="orders">
            {isCustomer ? "Sales Orders" : "Purchase Orders"} ({isCustomer ? salesOrders.length : purchaseOrders.length})
          </TabsTrigger>
          <TabsTrigger value="documents">Documents ({isCustomer ? (customer?.documents ?? []).length : 0})</TabsTrigger>
          <TabsTrigger value="ledger">Ledger ({ledgerEntries.length})</TabsTrigger>
        </TabsList>

        {/* Invoices */}
        <TabsContent value="invoices" className="space-y-3">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <DataTable
                columns={[
                  { key: "number", label: "Invoice #", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "date", label: "Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                  { key: "dueDate", label: "Due Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                  { key: "subtotal", label: "Subtotal", className: "text-right", render: (v: number) => egp(v) },
                  { key: "tax", label: "Tax", className: "text-right", render: (v: number) => egp(v) },
                  { key: "total", label: "Total", className: "text-right", render: (v: number) => <span className="font-semibold">{egp(v)}</span> },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge className={
                      v === "PAID" ? "bg-green-100 text-green-800"
                        : v === "OVERDUE" ? "bg-red-100 text-red-800"
                          : v === "VOID" ? "bg-slate-100 text-slate-800"
                            : "bg-amber-100 text-amber-800"
                    }>{v}</Badge>
                  ) },
                ] as Column<Record<string, unknown>>[]}
                data={invoices as unknown as Record<string, unknown>[]}
                emptyMessage="No invoices found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments" className="space-y-3">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <DataTable
                columns={[
                  { key: "reference", label: "Reference", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "date", label: "Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                  { key: "amount", label: "Amount", className: "text-right", render: (v: number) => <span className="font-semibold">{egp(v)}</span> },
                  { key: "method", label: "Method", render: (v: string) => <Badge variant="outline" className="text-[10px]">{v}</Badge> },
                  { key: "type", label: "Type", render: (v: string) => (
                    <Badge className={v === "RECEIVED" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}>{v}</Badge>
                  ) },
                  { key: "notes", label: "Notes", render: (v: string) => <span className="text-xs text-muted-foreground">{v || "---"}</span> },
                ] as Column<Record<string, unknown>>[]}
                data={payments as unknown as Record<string, unknown>[]}
                emptyMessage="No payments found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cheques */}
        <TabsContent value="cheques" className="space-y-3">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <DataTable
                columns={[
                  { key: "number", label: "Cheque #", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "bankName", label: "Bank" },
                  { key: "type", label: "Type", render: (v: string) => (
                    <Badge className={v === "INCOMING" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}>{v}</Badge>
                  ) },
                  { key: "amount", label: "Amount", className: "text-right", render: (v: number) => <span className="font-semibold">{egp(v)}</span> },
                  { key: "issueDate", label: "Issue Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                  { key: "dueDate", label: "Due Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                  { key: "status", label: "Status", render: (v: string) => (
                    <Badge className={
                      v === "CLEARED" ? "bg-green-100 text-green-800"
                        : v === "BOUNCED" ? "bg-red-100 text-red-800"
                          : v === "DEPOSITED" ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                    }>{v}</Badge>
                  ) },
                ] as Column<Record<string, unknown>>[]}
                data={cheques as unknown as Record<string, unknown>[]}
                emptyMessage="No cheques found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales / Purchase Orders */}
        <TabsContent value="orders" className="space-y-3">
          {isCustomer ? (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <DataTable
                  columns={[
                    { key: "number", label: "SO #", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                    { key: "date", label: "Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                    { key: "expectedDate", label: "Expected", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                    { key: "subtotal", label: "Subtotal", className: "text-right", render: (v: number) => egp(v) },
                    { key: "total", label: "Total", className: "text-right", render: (v: number) => <span className="font-semibold">{egp(v)}</span> },
                    { key: "status", label: "Status", render: (v: string) => <StatusBadge status={v} /> },
                  ] as Column<Record<string, unknown>>[]}
                  data={salesOrders as unknown as Record<string, unknown>[]}
                  emptyMessage="No sales orders found."
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <DataTable
                  columns={[
                    { key: "number", label: "PO #", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                    { key: "date", label: "Date", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                    { key: "expectedDate", label: "Expected", render: (v: string) => <span className="text-xs">{new Date(v).toLocaleDateString()}</span> },
                    { key: "subtotal", label: "Subtotal", className: "text-right", render: (v: number) => egp(v) },
                    { key: "total", label: "Total", className: "text-right", render: (v: number) => <span className="font-semibold">{egp(v)}</span> },
                    { key: "status", label: "Status", render: (v: string) => <StatusBadge status={v} /> },
                  ] as Column<Record<string, unknown>>[]}
                  data={purchaseOrders as unknown as Record<string, unknown>[]}
                  emptyMessage="No purchase orders found."
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents" className="space-y-3">
          {isCustomer && customer ? (
            <div className="space-y-4">
              {/* Upload section */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium">Upload New Document</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground mb-1 block">Document Type</Label>
                      <Select value={docType} onValueChange={setDocType}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DOCUMENT_TYPES.map((dt) => (
                            <SelectItem key={dt} value={dt}>{dt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <input
                        ref={docInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                        className="hidden"
                        onChange={handleDocUpload}
                      />
                      <Button size="sm" onClick={() => docInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-1" /> Choose File
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Document list */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Uploaded Documents ({(customer.documents ?? []).length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  {(customer.documents ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No documents uploaded yet.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-2 text-left">Name</th>
                          <th className="px-4 py-2 text-left">Type</th>
                          <th className="px-4 py-2 text-left">Uploaded</th>
                          <th className="px-4 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(customer.documents ?? []).map((doc) => (
                          <tr key={doc.id} className="hover:bg-muted/30">
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                                <span className="truncate max-w-[250px]">{doc.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <Badge variant="outline" className="text-[10px]">{doc.type}</Badge>
                            </td>
                            <td className="px-4 py-2 text-xs text-muted-foreground">
                              {new Date(doc.uploadedAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <div className="flex items-center gap-1 justify-end">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => viewDocument(doc)} title="View">
                                  <Eye className="h-3.5 w-3.5 text-blue-600" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                                  const a = document.createElement("a");
                                  a.href = doc.data;
                                  a.download = doc.name;
                                  a.click();
                                }} title="Download">
                                  <Download className="h-3.5 w-3.5 text-green-600" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeDocument(doc.id)} title="Delete">
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Document uploads are only available for customers.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Ledger */}
        <TabsContent value="ledger" className="space-y-3">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {ledgerEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No transactions found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Description</th>
                      <th className="px-3 py-2 text-left">Ref</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-right">Debit</th>
                      <th className="px-3 py-2 text-right">Credit</th>
                      <th className="px-3 py-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ledgerEntries.map((entry, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono text-xs">{entry.date}</td>
                        <td className="px-3 py-2">{entry.description}</td>
                        <td className="px-3 py-2 font-mono text-xs">{entry.ref}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className="text-[10px]">{entry.type}</Badge>
                        </td>
                        <td className="px-3 py-2 text-right text-red-600">
                          {entry.debit > 0 ? egp(entry.debit) : "---"}
                        </td>
                        <td className="px-3 py-2 text-right text-green-600">
                          {entry.credit > 0 ? egp(entry.credit) : "---"}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">
                          {egp(entry.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30 font-semibold">
                    <tr>
                      <td colSpan={4} className="px-3 py-2">Total</td>
                      <td className="px-3 py-2 text-right text-red-600">
                        {egp(ledgerEntries.reduce((s, l) => s + l.debit, 0))}
                      </td>
                      <td className="px-3 py-2 text-right text-green-600">
                        {egp(ledgerEntries.reduce((s, l) => s + l.credit, 0))}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {ledgerEntries.length > 0 ? egp(ledgerEntries[ledgerEntries.length - 1].balance) : egp(0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
