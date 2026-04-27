"use client";

import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import StatusBadge from "@/components/shared/status-badge";
import { useDataStore, type Customer, type Vendor, type BankAccount } from "@/lib/data-store";
import { openInvoicePDF } from "@/lib/invoice-pdf";
import { FileText } from "lucide-react";

// ─── Clickable entity link (navigates to detail page) ──────────────────────

interface EntityLinkProps {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}

function EntityLink({ children, onClick, className = "" }: EntityLinkProps) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`text-left font-medium text-blue-700 hover:text-blue-900 hover:underline underline-offset-2 cursor-pointer transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

// ─── Vendor Link (opens detail page) ──────────────────────────────────────

export function VendorLink({ vendorId, className }: { vendorId: string; className?: string }) {
  const store = useDataStore();
  const [open, setOpen] = useState(false);
  const vendor = store.vendors.find((v) => v.id === vendorId);
  if (!vendor) return <span className="text-muted-foreground">{vendorId}</span>;

  return (
    <>
      <EntityLink onClick={() => setOpen(true)} className={className}>{vendor.name}</EntityLink>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">{vendor.name} <Badge variant="outline" className="text-[10px]">{vendor.code}</Badge></DialogTitle>
            <DialogDescription>Vendor details, transactions, and documents</DialogDescription>
          </DialogHeader>
          <VendorDetail vendor={vendor} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function VendorDetail({ vendor }: { vendor: Vendor }) {
  const store = useDataStore();
  const egp = (n: number) => `EGP ${n.toLocaleString()}`;

  const vendorPOs = store.purchaseOrders.filter((po) => po.vendorId === vendor.id);
  const vendorRFQs = store.rfqs.filter((r) => r.vendorId === vendor.id);
  const vendorGRNs = store.goodsReceipts.filter((g) => g.vendorId === vendor.id);
  const vendorInvoices = store.invoices.filter((inv) => inv.customerId === vendor.id);
  const vendorPayments = store.payments.filter((p) => p.vendorId === vendor.id);
  const vendorCheques = store.cheques.filter((c) => c.partyName === vendor.name);

  const totalPurchases = vendorPOs.reduce((s, po) => s + po.total, 0);
  const totalPaid = vendorPayments.reduce((s, p) => s + p.amount, 0);

  return (
    <Tabs defaultValue="info" className="space-y-3">
      <TabsList className="flex-wrap">
        <TabsTrigger value="info">Info</TabsTrigger>
        <TabsTrigger value="po">POs ({vendorPOs.length})</TabsTrigger>
        <TabsTrigger value="invoices">Invoices ({vendorInvoices.length})</TabsTrigger>
        <TabsTrigger value="payments">Payments ({vendorPayments.length})</TabsTrigger>
        <TabsTrigger value="bank">Bank ({vendorCheques.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="info">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground text-xs">Category</span><p className="font-medium">{vendor.category}</p></div>
          <div><span className="text-muted-foreground text-xs">Payment Terms</span><p>{vendor.paymentTerms}</p></div>
          <div><span className="text-muted-foreground text-xs">Phone</span><p>{vendor.phone}</p></div>
          <div><span className="text-muted-foreground text-xs">Email</span><p>{vendor.email}</p></div>
          <div><span className="text-muted-foreground text-xs">Address</span><p>{vendor.address}</p></div>
          <div><span className="text-muted-foreground text-xs">GMP Certified</span><p>{vendor.gmpCertified ? "Yes" : "No"}</p></div>
          <div><span className="text-muted-foreground text-xs">Outstanding</span><p className="font-semibold text-red-600">{egp(vendor.outstanding)}</p></div>
          <div><span className="text-muted-foreground text-xs">Total Purchases</span><p className="font-semibold">{egp(totalPurchases)}</p></div>
          <div><span className="text-muted-foreground text-xs">Total Paid</span><p className="font-semibold text-green-600">{egp(totalPaid)}</p></div>
        </div>
      </TabsContent>

      <TabsContent value="po">
        {vendorPOs.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No purchase orders</p> : (
          <div className="border rounded text-xs">
            <table className="w-full">
              <thead><tr className="bg-muted/50"><th className="p-2 text-left">PO #</th><th className="p-2 text-left">Items</th><th className="p-2 text-right">Total</th><th className="p-2">Status</th><th className="p-2">Date</th></tr></thead>
              <tbody>
                {vendorPOs.map((po) => (
                  <tr key={po.id} className="border-t">
                    <td className="p-2 font-mono">{po.number}</td>
                    <td className="p-2">{po.items.map((i) => i.description).join(", ")}</td>
                    <td className="p-2 text-right font-semibold">{egp(po.total)}</td>
                    <td className="p-2"><StatusBadge status={po.status} /></td>
                    <td className="p-2">{po.date?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {vendorRFQs.length > 0 && (
          <div className="mt-3">
            <span className="text-xs text-muted-foreground font-medium">RFQs</span>
            <div className="border rounded text-xs mt-1">
              <table className="w-full">
                <thead><tr className="bg-muted/50"><th className="p-2 text-left">RFQ #</th><th className="p-2 text-left">Items</th><th className="p-2">Status</th></tr></thead>
                <tbody>
                  {vendorRFQs.map((rfq) => (
                    <tr key={rfq.id} className="border-t">
                      <td className="p-2 font-mono">{rfq.number}</td>
                      <td className="p-2">{rfq.items.map((i) => i.description).join(", ")}</td>
                      <td className="p-2"><StatusBadge status={rfq.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {vendorGRNs.length > 0 && (
          <div className="mt-3">
            <span className="text-xs text-muted-foreground font-medium">Goods Received</span>
            <div className="border rounded text-xs mt-1">
              <table className="w-full">
                <thead><tr className="bg-muted/50"><th className="p-2 text-left">GRN #</th><th className="p-2 text-left">Items</th><th className="p-2">Status</th></tr></thead>
                <tbody>
                  {vendorGRNs.map((g) => (
                    <tr key={g.id} className="border-t">
                      <td className="p-2 font-mono">{g.number}</td>
                      <td className="p-2">{g.items.map((i) => `${i.description} ×${i.quantity}`).join(", ")}</td>
                      <td className="p-2"><StatusBadge status={g.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="invoices">
        {vendorInvoices.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No invoices</p> : (
          <div className="border rounded text-xs">
            <table className="w-full">
              <thead><tr className="bg-muted/50"><th className="p-2 text-left">Invoice #</th><th className="p-2 text-left">Items</th><th className="p-2 text-right">Total</th><th className="p-2">Status</th><th className="p-2">Date</th><th className="p-2">PDF</th></tr></thead>
              <tbody>
                {vendorInvoices.map((inv) => (
                  <tr key={inv.id} className="border-t">
                    <td className="p-2 font-mono">{inv.number}</td>
                    <td className="p-2">{inv.items.map((i) => i.description).join(", ")}</td>
                    <td className="p-2 text-right font-semibold">{egp(inv.total)}</td>
                    <td className="p-2"><StatusBadge status={inv.status} /></td>
                    <td className="p-2">{inv.date?.slice(0, 10)}</td>
                    <td className="p-2">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openInvoicePDF(inv, vendor, "vendor")}>
                        <FileText className="h-3.5 w-3.5 text-blue-600" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="payments">
        {vendorPayments.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No payments</p> : (
          <div className="border rounded text-xs">
            <table className="w-full">
              <thead><tr className="bg-muted/50"><th className="p-2 text-left">Ref</th><th className="p-2 text-right">Amount</th><th className="p-2">Method</th><th className="p-2">Date</th><th className="p-2">Type</th></tr></thead>
              <tbody>
                {vendorPayments.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2 font-mono">{p.reference}</td>
                    <td className="p-2 text-right font-semibold">{egp(p.amount)}</td>
                    <td className="p-2">{p.method}</td>
                    <td className="p-2">{p.date?.slice(0, 10)}</td>
                    <td className="p-2"><Badge variant={p.type === "RECEIVED" ? "default" : "secondary"} className="text-[10px]">{p.type}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="bank">
        {vendorCheques.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No cheque transactions</p> : (
          <div className="border rounded text-xs">
            <table className="w-full">
              <thead><tr className="bg-muted/50"><th className="p-2 text-left">Cheque #</th><th className="p-2">Type</th><th className="p-2 text-right">Amount</th><th className="p-2">Due</th><th className="p-2">Status</th></tr></thead>
              <tbody>
                {vendorCheques.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-2 font-mono">{c.number}</td>
                    <td className="p-2"><Badge variant={c.type === "INCOMING" ? "default" : "secondary"} className="text-[10px]">{c.type}</Badge></td>
                    <td className="p-2 text-right font-semibold">{egp(c.amount)}</td>
                    <td className="p-2">{c.dueDate?.slice(0, 10)}</td>
                    <td className="p-2"><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

// ─── Customer Link (opens detail page) ────────────────────────────────────

export function CustomerLink({ customerId, className }: { customerId: string; className?: string }) {
  const store = useDataStore();
  const [open, setOpen] = useState(false);
  const customer = store.customers.find((c) => c.id === customerId);
  if (!customer) return <span className="text-muted-foreground">{customerId}</span>;

  return (
    <>
      <EntityLink onClick={() => setOpen(true)} className={className}>{customer.name}</EntityLink>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">{customer.name} <Badge variant="outline" className="text-[10px]">{customer.code}</Badge></DialogTitle>
            <DialogDescription>Customer details, invoices, orders, and transactions</DialogDescription>
          </DialogHeader>
          <CustomerDetail customer={customer} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function CustomerDetail({ customer }: { customer: Customer }) {
  const store = useDataStore();
  const egp = (n: number) => `EGP ${n.toLocaleString()}`;

  const custInvoices = store.invoices.filter((inv) => inv.customerId === customer.id);
  const custSOs = store.salesOrders.filter((so) => so.customerId === customer.id);
  const custDNs = store.deliveryNotes.filter((dn) => dn.customerId === customer.id);
  const custPayments = store.payments.filter((p) => p.customerId === customer.id);
  const custCheques = store.cheques.filter((c) => c.partyName === customer.name);

  const totalInvoiced = custInvoices.reduce((s, inv) => s + inv.total, 0);
  const totalPaid = custPayments.reduce((s, p) => s + p.amount, 0);

  return (
    <Tabs defaultValue="info" className="space-y-3">
      <TabsList className="flex-wrap">
        <TabsTrigger value="info">Info</TabsTrigger>
        <TabsTrigger value="invoices">Invoices ({custInvoices.length})</TabsTrigger>
        <TabsTrigger value="orders">Orders ({custSOs.length})</TabsTrigger>
        <TabsTrigger value="payments">Payments ({custPayments.length})</TabsTrigger>
        <TabsTrigger value="bank">Bank ({custCheques.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="info">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground text-xs">Type</span><p className="font-medium">{customer.type}</p></div>
          <div><span className="text-muted-foreground text-xs">Status</span><p><StatusBadge status={customer.status} /></p></div>
          <div><span className="text-muted-foreground text-xs">Phone</span><p>{customer.phone}</p></div>
          <div><span className="text-muted-foreground text-xs">Email</span><p>{customer.email}</p></div>
          <div><span className="text-muted-foreground text-xs">Address</span><p>{customer.address}</p></div>
          {customer.city && <div><span className="text-muted-foreground text-xs">City</span><p>{customer.city}</p></div>}
          <div><span className="text-muted-foreground text-xs">Credit Limit</span><p className="font-semibold">{egp(customer.creditLimit)}</p></div>
          <div><span className="text-muted-foreground text-xs">Outstanding</span><p className="font-semibold text-red-600">{egp(customer.outstanding)}</p></div>
          <div><span className="text-muted-foreground text-xs">Payment Terms</span><p>{customer.paymentTerms}</p></div>
          <div><span className="text-muted-foreground text-xs">Currency</span><p>{customer.currency}</p></div>
          <div><span className="text-muted-foreground text-xs">Total Invoiced</span><p className="font-semibold">{egp(totalInvoiced)}</p></div>
          <div><span className="text-muted-foreground text-xs">Total Paid</span><p className="font-semibold text-green-600">{egp(totalPaid)}</p></div>
        </div>
      </TabsContent>

      <TabsContent value="invoices">
        {custInvoices.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No invoices</p> : (
          <div className="border rounded text-xs">
            <table className="w-full">
              <thead><tr className="bg-muted/50"><th className="p-2 text-left">Invoice #</th><th className="p-2 text-left">Items</th><th className="p-2 text-right">Total</th><th className="p-2">Status</th><th className="p-2">Date</th><th className="p-2">PDF</th></tr></thead>
              <tbody>
                {custInvoices.map((inv) => (
                  <tr key={inv.id} className="border-t">
                    <td className="p-2 font-mono">{inv.number}</td>
                    <td className="p-2">{inv.items.map((i) => i.description).join(", ")}</td>
                    <td className="p-2 text-right font-semibold">{egp(inv.total)}</td>
                    <td className="p-2"><StatusBadge status={inv.status} /></td>
                    <td className="p-2">{inv.date?.slice(0, 10)}</td>
                    <td className="p-2">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openInvoicePDF(inv, customer, "customer")}>
                        <FileText className="h-3.5 w-3.5 text-blue-600" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="orders">
        {custSOs.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No sales orders</p> : (
          <div className="border rounded text-xs">
            <table className="w-full">
              <thead><tr className="bg-muted/50"><th className="p-2 text-left">SO #</th><th className="p-2 text-left">Items</th><th className="p-2 text-right">Total</th><th className="p-2">Status</th><th className="p-2">Date</th></tr></thead>
              <tbody>
                {custSOs.map((so) => (
                  <tr key={so.id} className="border-t">
                    <td className="p-2 font-mono">{so.number}</td>
                    <td className="p-2">{so.items.map((i) => `${i.description} ×${i.quantity}`).join(", ")}</td>
                    <td className="p-2 text-right font-semibold">{egp(so.total)}</td>
                    <td className="p-2"><StatusBadge status={so.status} /></td>
                    <td className="p-2">{so.date?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {custDNs.length > 0 && (
          <div className="mt-3">
            <span className="text-xs text-muted-foreground font-medium">Delivery Notes</span>
            <div className="border rounded text-xs mt-1">
              <table className="w-full">
                <thead><tr className="bg-muted/50"><th className="p-2 text-left">DN #</th><th className="p-2 text-left">Items</th><th className="p-2">Status</th></tr></thead>
                <tbody>
                  {custDNs.map((dn) => (
                    <tr key={dn.id} className="border-t">
                      <td className="p-2 font-mono">{dn.number}</td>
                      <td className="p-2">{dn.items.map((i) => `${i.description} ×${i.quantity}`).join(", ")}</td>
                      <td className="p-2"><StatusBadge status={dn.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="payments">
        {custPayments.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No payments</p> : (
          <div className="border rounded text-xs">
            <table className="w-full">
              <thead><tr className="bg-muted/50"><th className="p-2 text-left">Ref</th><th className="p-2 text-right">Amount</th><th className="p-2">Method</th><th className="p-2">Date</th><th className="p-2">Type</th></tr></thead>
              <tbody>
                {custPayments.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2 font-mono">{p.reference}</td>
                    <td className="p-2 text-right font-semibold">{egp(p.amount)}</td>
                    <td className="p-2">{p.method}</td>
                    <td className="p-2">{p.date?.slice(0, 10)}</td>
                    <td className="p-2"><Badge variant={p.type === "RECEIVED" ? "default" : "secondary"} className="text-[10px]">{p.type}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="bank">
        {custCheques.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No cheque transactions</p> : (
          <div className="border rounded text-xs">
            <table className="w-full">
              <thead><tr className="bg-muted/50"><th className="p-2 text-left">Cheque #</th><th className="p-2">Type</th><th className="p-2 text-right">Amount</th><th className="p-2">Due</th><th className="p-2">Status</th></tr></thead>
              <tbody>
                {custCheques.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-2 font-mono">{c.number}</td>
                    <td className="p-2"><Badge variant={c.type === "INCOMING" ? "default" : "secondary"} className="text-[10px]">{c.type}</Badge></td>
                    <td className="p-2 text-right font-semibold">{egp(c.amount)}</td>
                    <td className="p-2">{c.dueDate?.slice(0, 10)}</td>
                    <td className="p-2"><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

// ─── Bank Account Link + Dialog ────────────────────────────────────────────

export function BankAccountLink({ bankAccountId, className }: { bankAccountId: string; className?: string }) {
  const store = useDataStore();
  const [open, setOpen] = useState(false);
  const bank = store.bankAccounts.find((b) => b.id === bankAccountId);
  if (!bank) return <span className="text-muted-foreground">{bankAccountId}</span>;

  return (
    <>
      <EntityLink onClick={() => setOpen(true)} className={className}>{bank.name}</EntityLink>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">{bank.name} <Badge variant="outline" className="text-[10px]">{bank.code}</Badge></DialogTitle>
            <DialogDescription>Bank account details and transaction history</DialogDescription>
          </DialogHeader>
          <BankAccountDetail bank={bank} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function BankAccountDetail({ bank }: { bank: BankAccount }) {
  const store = useDataStore();
  const egp = (n: number) => `${bank.currency} ${n.toLocaleString()}`;

  const bankCheques = store.cheques.filter((c) => c.bankAccountId === bank.id || c.bankName === bank.bankName);
  const bankPayments = store.payments.filter((p) => p.bankAccountId === bank.id);

  const incoming = bankCheques.filter((c) => c.type === "INCOMING");
  const outgoing = bankCheques.filter((c) => c.type === "OUTGOING");
  const totalIn = incoming.reduce((s, c) => s + c.amount, 0);
  const totalOut = outgoing.reduce((s, c) => s + c.amount, 0);

  return (
    <Tabs defaultValue="info" className="space-y-3">
      <TabsList className="flex-wrap">
        <TabsTrigger value="info">Info</TabsTrigger>
        <TabsTrigger value="in">Inflows ({incoming.length})</TabsTrigger>
        <TabsTrigger value="out">Outflows ({outgoing.length})</TabsTrigger>
        <TabsTrigger value="payments">Payments ({bankPayments.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="info">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground text-xs">Bank Name</span><p className="font-medium">{bank.bankName}</p></div>
          <div><span className="text-muted-foreground text-xs">Account Number</span><p className="font-mono">{bank.accountNumber}</p></div>
          {bank.iban && <div className="col-span-2"><span className="text-muted-foreground text-xs">IBAN</span><p className="font-mono text-xs">{bank.iban}</p></div>}
          <div><span className="text-muted-foreground text-xs">Type</span><p>{bank.type.replace(/_/g, " ")}</p></div>
          <div><span className="text-muted-foreground text-xs">Currency</span><p>{bank.currency}</p></div>
          <div><span className="text-muted-foreground text-xs">Balance</span><p className="text-lg font-bold text-green-700">{egp(bank.balance)}</p></div>
          <div><span className="text-muted-foreground text-xs">Status</span><p><StatusBadge status={bank.status} /></p></div>
          <div><span className="text-muted-foreground text-xs">Total Inflows (Cheques)</span><p className="font-semibold text-green-600">{egp(totalIn)}</p></div>
          <div><span className="text-muted-foreground text-xs">Total Outflows (Cheques)</span><p className="font-semibold text-red-600">{egp(totalOut)}</p></div>
        </div>
      </TabsContent>

      <TabsContent value="in">
        {incoming.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No incoming cheques</p> : (
          <div className="border rounded text-xs">
            <table className="w-full">
              <thead><tr className="bg-muted/50"><th className="p-2 text-left">Cheque #</th><th className="p-2 text-left">From</th><th className="p-2 text-right">Amount</th><th className="p-2">Due</th><th className="p-2">Status</th></tr></thead>
              <tbody>
                {incoming.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-2 font-mono">{c.number}</td>
                    <td className="p-2">{c.partyName}</td>
                    <td className="p-2 text-right font-semibold text-green-600">{egp(c.amount)}</td>
                    <td className="p-2">{c.dueDate?.slice(0, 10)}</td>
                    <td className="p-2"><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="out">
        {outgoing.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No outgoing cheques</p> : (
          <div className="border rounded text-xs">
            <table className="w-full">
              <thead><tr className="bg-muted/50"><th className="p-2 text-left">Cheque #</th><th className="p-2 text-left">To</th><th className="p-2 text-right">Amount</th><th className="p-2">Due</th><th className="p-2">Status</th></tr></thead>
              <tbody>
                {outgoing.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-2 font-mono">{c.number}</td>
                    <td className="p-2">{c.partyName}</td>
                    <td className="p-2 text-right font-semibold text-red-600">{egp(c.amount)}</td>
                    <td className="p-2">{c.dueDate?.slice(0, 10)}</td>
                    <td className="p-2"><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="payments">
        {bankPayments.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No payments through this account</p> : (
          <div className="border rounded text-xs">
            <table className="w-full">
              <thead><tr className="bg-muted/50"><th className="p-2 text-left">Ref</th><th className="p-2">Type</th><th className="p-2 text-right">Amount</th><th className="p-2">Method</th><th className="p-2">Date</th></tr></thead>
              <tbody>
                {bankPayments.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2 font-mono">{p.reference}</td>
                    <td className="p-2"><Badge variant={p.type === "RECEIVED" ? "default" : "secondary"} className="text-[10px]">{p.type}</Badge></td>
                    <td className="p-2 text-right font-semibold">{egp(p.amount)}</td>
                    <td className="p-2">{p.method}</td>
                    <td className="p-2">{p.date?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
