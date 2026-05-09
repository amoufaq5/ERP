"use client";

import { useMemo, useState, useCallback } from "react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import StatusBadge from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useApiDataStore } from "@/lib/api/use-api-store";
import type {
  Customer,
  Vendor,
  Invoice,
  Payment,
  PurchaseOrder,
} from "@/lib/data-store";
import {
  BookOpen,
  AlertTriangle,
  Users,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
} from "lucide-react";

const fmt = (n: number) =>
  `EGP ${(n ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtShort = (n: number) => {
  if (Math.abs(n) >= 1_000_000)
    return `EGP ${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `EGP ${(n / 1_000).toFixed(0)}K`;
  return `EGP ${n.toLocaleString()}`;
};

const fmtDate = (d: string | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const daysBetween = (from: string, to: Date) => {
  const diff = to.getTime() - new Date(from).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

interface CustomerRow {
  id: string;
  code: string;
  name: string;
  city: string;
  creditLimit: number;
  outstanding: number;
  invoiceCount: number;
  lastPaymentDate: string | undefined;
  status: string;
  _raw: Customer;
}

interface VendorRow {
  id: string;
  code: string;
  name: string;
  address: string;
  paymentTerms: string;
  outstanding: number;
  poCount: number;
  lastPaymentDate: string | undefined;
  status: string;
  category: string;
  _raw: Vendor;
}

interface StatementEntry {
  date: string;
  type: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export default function PartnerLedgerPage() {
  const store = useApiDataStore();

  const [tab, setTab] = useState<"customers" | "vendors">("customers");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<VendorRow | null>(null);
  const [detailTab, setDetailTab] = useState<"info" | "invoices" | "payments" | "statement">("info");
  const [vendorDetailTab, setVendorDetailTab] = useState<"info" | "pos" | "payments">("info");

  const now = useMemo(() => new Date(), []);

  const totalReceivables = useMemo(
    () =>
      store.customers.reduce(
        (sum, c) => sum + (c.outstanding > 0 ? c.outstanding : 0),
        0
      ),
    [store.customers]
  );

  const totalPayables = useMemo(
    () =>
      store.vendors.reduce((sum, v) => sum + (v.outstanding > 0 ? v.outstanding : 0), 0),
    [store.vendors]
  );

  const overdueInvoices = useMemo(
    () =>
      store.invoices.filter(
        (inv) =>
          inv.status !== "PAID" &&
          inv.status !== "VOID" &&
          new Date(inv.dueDate) < now
      ).length,
    [store.invoices, now]
  );

  const activePartners = useMemo(
    () =>
      store.customers.filter((c) => c.status === "ACTIVE").length +
      store.vendors.length,
    [store.customers, store.vendors]
  );

  const customerInvoiceMap = useMemo(() => {
    const m: Record<string, Invoice[]> = {};
    store.invoices.forEach((inv) => {
      if (!m[inv.customerId]) m[inv.customerId] = [];
      m[inv.customerId].push(inv);
    });
    return m;
  }, [store.invoices]);

  const customerPaymentMap = useMemo(() => {
    const m: Record<string, Payment[]> = {};
    store.payments.forEach((p) => {
      if (p.customerId) {
        if (!m[p.customerId]) m[p.customerId] = [];
        m[p.customerId].push(p);
      }
    });
    return m;
  }, [store.payments]);

  const vendorPaymentMap = useMemo(() => {
    const m: Record<string, Payment[]> = {};
    store.payments.forEach((p) => {
      if (p.vendorId) {
        if (!m[p.vendorId]) m[p.vendorId] = [];
        m[p.vendorId].push(p);
      }
    });
    return m;
  }, [store.payments]);

  const vendorPOMap = useMemo(() => {
    const m: Record<string, PurchaseOrder[]> = {};
    store.purchaseOrders.forEach((po) => {
      if (!m[po.vendorId]) m[po.vendorId] = [];
      m[po.vendorId].push(po);
    });
    return m;
  }, [store.purchaseOrders]);

  const customerRows: CustomerRow[] = useMemo(() => {
    return store.customers.map((c) => {
      const invs = customerInvoiceMap[c.id] || [];
      const pays = customerPaymentMap[c.id] || [];
      const lastPay = pays.length > 0
        ? pays.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
        : undefined;
      return {
        id: c.id,
        code: c.code,
        name: c.name,
        city: c.city || "—",
        creditLimit: c.creditLimit,
        outstanding: c.outstanding,
        invoiceCount: invs.length,
        lastPaymentDate: lastPay,
        status: c.status,
        _raw: c,
      };
    });
  }, [store.customers, customerInvoiceMap, customerPaymentMap]);

  const vendorRows: VendorRow[] = useMemo(() => {
    return store.vendors.map((v) => {
      const pos = vendorPOMap[v.id] || [];
      const pays = vendorPaymentMap[v.id] || [];
      const lastPay = pays.length > 0
        ? pays.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
        : undefined;
      return {
        id: v.id,
        code: v.code,
        name: v.name,
        address: v.address,
        paymentTerms: v.paymentTerms,
        outstanding: v.outstanding,
        poCount: pos.length,
        lastPaymentDate: lastPay,
        status: v.gmpCertified ? "GMP Certified" : "Active",
        category: v.category,
        _raw: v,
      };
    });
  }, [store.vendors, vendorPOMap, vendorPaymentMap]);

  const filteredCustomerRows = useMemo(() => {
    let rows = customerRows;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          r.city.toLowerCase().includes(q)
      );
    }
    if (filters.status) {
      rows = rows.filter((r) => r.status === filters.status);
    }
    if (filters.city) {
      rows = rows.filter((r) => r.city === filters.city);
    }
    return rows;
  }, [customerRows, search, filters]);

  const filteredVendorRows = useMemo(() => {
    let rows = vendorRows;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q)
      );
    }
    if (filters.status) {
      const match = filters.status === "GMP Certified" ? true : false;
      rows = rows.filter((r) => (filters.status === "GMP Certified" ? r._raw.gmpCertified : !r._raw.gmpCertified));
    }
    if (filters.city) {
      rows = rows.filter((r) => r.address.includes(filters.city));
    }
    return rows;
  }, [vendorRows, search, filters]);

  const customerCities = useMemo(() => {
    const set = new Set<string>();
    store.customers.forEach((c) => {
      if (c.city) set.add(c.city);
    });
    return Array.from(set).sort();
  }, [store.customers]);

  const vendorLocations = useMemo(() => {
    const set = new Set<string>();
    store.vendors.forEach((v) => {
      const parts = v.address.split(",");
      const loc = parts[parts.length - 1]?.trim();
      if (loc) set.add(loc);
    });
    return Array.from(set).sort();
  }, [store.vendors]);

  const agingBuckets = useMemo(() => {
    const buckets = { current: 0, d31_60: 0, d61_90: 0, d90plus: 0 };
    store.invoices.forEach((inv) => {
      if (inv.status === "PAID" || inv.status === "VOID") return;
      const age = daysBetween(inv.date, now);
      if (age <= 30) buckets.current += inv.total;
      else if (age <= 60) buckets.d31_60 += inv.total;
      else if (age <= 90) buckets.d61_90 += inv.total;
      else buckets.d90plus += inv.total;
    });
    return buckets;
  }, [store.invoices, now]);

  const agingMax = useMemo(
    () =>
      Math.max(
        agingBuckets.current,
        agingBuckets.d31_60,
        agingBuckets.d61_90,
        agingBuckets.d90plus,
        1
      ),
    [agingBuckets]
  );

  const buildCustomerStatement = useCallback(
    (customerId: string): StatementEntry[] => {
      const invs = customerInvoiceMap[customerId] || [];
      const pays = customerPaymentMap[customerId] || [];

      const entries: StatementEntry[] = [];

      invs.forEach((inv) => {
        entries.push({
          date: inv.date,
          type: "Invoice",
          reference: inv.number,
          description: `Invoice — ${inv.status}`,
          debit: inv.total,
          credit: 0,
          balance: 0,
        });
      });

      pays.forEach((p) => {
        entries.push({
          date: p.date,
          type: "Payment",
          reference: p.reference,
          description: p.notes || `Payment — ${p.method}`,
          debit: 0,
          credit: p.amount,
          balance: 0,
        });
      });

      entries.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      let running = 0;
      entries.forEach((e) => {
        running += e.debit - e.credit;
        e.balance = running;
      });

      return entries;
    },
    [customerInvoiceMap, customerPaymentMap]
  );

  const buildVendorStatement = useCallback(
    (vendorId: string): StatementEntry[] => {
      const pos = vendorPOMap[vendorId] || [];
      const pays = vendorPaymentMap[vendorId] || [];

      const entries: StatementEntry[] = [];

      pos.forEach((po) => {
        entries.push({
          date: po.date,
          type: "Purchase Order",
          reference: po.number,
          description: `PO — ${po.status}`,
          debit: po.total,
          credit: 0,
          balance: 0,
        });
      });

      pays.forEach((p) => {
        entries.push({
          date: p.date,
          type: "Payment",
          reference: p.reference,
          description: p.notes || `Payment — ${p.method}`,
          debit: 0,
          credit: p.amount,
          balance: 0,
        });
      });

      entries.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      let running = 0;
      entries.forEach((e) => {
        running += e.debit - e.credit;
        e.balance = running;
      });

      return entries;
    },
    [vendorPOMap, vendorPaymentMap]
  );

  const customerColumns: Column<CustomerRow>[] = [
    { key: "code", label: "Code", sortable: true },
    { key: "name", label: "Name", sortable: true },
    { key: "city", label: "City", sortable: true },
    {
      key: "creditLimit",
      label: "Credit Limit",
      sortable: true,
      render: (v: number) => fmtShort(v),
    },
    {
      key: "outstanding",
      label: "Balance",
      sortable: true,
      render: (v: number) => (
        <span className={v > 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
          {fmt(v)}
        </span>
      ),
    },
    {
      key: "invoiceCount",
      label: "Invoices",
      sortable: true,
      render: (v: number) => (
        <Badge variant="secondary">{v}</Badge>
      ),
    },
    {
      key: "lastPaymentDate",
      label: "Last Payment",
      sortable: true,
      render: (v: string | undefined) => fmtDate(v),
    },
    {
      key: "status",
      label: "Status",
      render: (v: string) => <StatusBadge status={v} />,
    },
  ];

  const vendorColumns: Column<VendorRow>[] = [
    { key: "code", label: "Code", sortable: true },
    { key: "name", label: "Name", sortable: true },
    { key: "address", label: "Location", sortable: true },
    { key: "paymentTerms", label: "Payment Terms", sortable: true },
    {
      key: "outstanding",
      label: "Outstanding",
      sortable: true,
      render: (v: number) => (
        <span className={v > 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
          {fmt(v)}
        </span>
      ),
    },
    {
      key: "poCount",
      label: "POs",
      sortable: true,
      render: (v: number) => (
        <Badge variant="secondary">{v}</Badge>
      ),
    },
    {
      key: "lastPaymentDate",
      label: "Last Payment",
      sortable: true,
      render: (v: string | undefined) => fmtDate(v),
    },
    {
      key: "status",
      label: "Status",
      render: (v: string) => <StatusBadge status={v} />,
    },
  ];

  const invoiceColumns: Column<Invoice>[] = [
    { key: "number", label: "Invoice #", sortable: true },
    { key: "date", label: "Date", sortable: true, render: (v: string) => fmtDate(v) },
    { key: "dueDate", label: "Due Date", sortable: true, render: (v: string) => fmtDate(v) },
    { key: "total", label: "Total", sortable: true, render: (v: number) => fmt(v) },
    { key: "status", label: "Status", render: (v: string) => <StatusBadge status={v} /> },
  ];

  const paymentColumns: Column<Payment>[] = [
    { key: "reference", label: "Reference", sortable: true },
    { key: "date", label: "Date", sortable: true, render: (v: string) => fmtDate(v) },
    { key: "amount", label: "Amount", sortable: true, render: (v: number) => fmt(v) },
    { key: "method", label: "Method", render: (v: string) => <Badge variant="outline">{v.replace(/_/g, " ")}</Badge> },
  ];

  const poColumns: Column<PurchaseOrder>[] = [
    { key: "number", label: "PO #", sortable: true },
    { key: "date", label: "Date", sortable: true, render: (v: string) => fmtDate(v) },
    { key: "expectedDate", label: "Expected", sortable: true, render: (v: string) => fmtDate(v) },
    { key: "total", label: "Total", sortable: true, render: (v: number) => fmt(v) },
    { key: "status", label: "Status", render: (v: string) => <StatusBadge status={v} /> },
  ];

  const statementColumns: Column<StatementEntry>[] = [
    { key: "date", label: "Date", sortable: true, render: (v: string) => fmtDate(v) },
    { key: "type", label: "Type", render: (v: string) => <Badge variant="outline">{v}</Badge> },
    { key: "reference", label: "Reference", sortable: true },
    { key: "description", label: "Description" },
    { key: "debit", label: "Debit", render: (v: number) => v > 0 ? <span className="text-red-600">{fmt(v)}</span> : "—" },
    { key: "credit", label: "Credit", render: (v: number) => v > 0 ? <span className="text-green-600">{fmt(v)}</span> : "—" },
    {
      key: "balance",
      label: "Balance",
      render: (v: number) => (
        <span className={v > 0 ? "text-red-600 font-semibold" : v < 0 ? "text-green-600 font-semibold" : ""}>
          {fmt(v)}
        </span>
      ),
    },
  ];

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const filterFields = useMemo(() => {
    if (tab === "customers") {
      return [
        {
          key: "status",
          label: "Status",
          type: "select" as const,
          options: [
            { label: "Active", value: "ACTIVE" },
            { label: "Hold", value: "HOLD" },
            { label: "Blocked", value: "BLOCKED" },
          ],
        },
        {
          key: "city",
          label: "City",
          type: "select" as const,
          options: customerCities.map((c) => ({ label: c, value: c })),
        },
      ];
    }
    return [
      {
        key: "status",
        label: "Status",
        type: "select" as const,
        options: [
          { label: "GMP Certified", value: "GMP Certified" },
          { label: "Non-GMP", value: "Non-GMP" },
        ],
      },
      {
        key: "city",
        label: "Location",
        type: "select" as const,
        options: vendorLocations.map((c) => ({ label: c, value: c })),
      },
    ];
  }, [tab, customerCities, vendorLocations]);

  const selectedCustomerInvoices = useMemo(() => {
    if (!selectedCustomer) return [];
    return customerInvoiceMap[selectedCustomer.id] || [];
  }, [selectedCustomer, customerInvoiceMap]);

  const selectedCustomerPayments = useMemo(() => {
    if (!selectedCustomer) return [];
    return customerPaymentMap[selectedCustomer.id] || [];
  }, [selectedCustomer, customerPaymentMap]);

  const selectedCustomerStatement = useMemo(() => {
    if (!selectedCustomer) return [];
    return buildCustomerStatement(selectedCustomer.id);
  }, [selectedCustomer, buildCustomerStatement]);

  const selectedVendorPOs = useMemo(() => {
    if (!selectedVendor) return [];
    return vendorPOMap[selectedVendor.id] || [];
  }, [selectedVendor, vendorPOMap]);

  const selectedVendorPayments = useMemo(() => {
    if (!selectedVendor) return [];
    return vendorPaymentMap[selectedVendor.id] || [];
  }, [selectedVendor, vendorPaymentMap]);

  const selectedVendorStatement = useMemo(() => {
    if (!selectedVendor) return [];
    return buildVendorStatement(selectedVendor.id);
  }, [selectedVendor, buildVendorStatement]);

  const agingData = [
    { label: "Current (0–30 days)", value: agingBuckets.current, color: "bg-green-500" },
    { label: "31–60 days", value: agingBuckets.d31_60, color: "bg-yellow-500" },
    { label: "61–90 days", value: agingBuckets.d61_90, color: "bg-orange-500" },
    { label: "90+ days", value: agingBuckets.d90plus, color: "bg-red-500" },
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Partner Ledger"
        description="Customer and vendor account balances with transaction history"
        icon={<BookOpen className="h-6 w-6" />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={ArrowDownLeft}
          title="Total Receivables"
          value={fmtShort(totalReceivables)}
          subtitle={`${store.customers.filter((c) => c.outstanding > 0).length} customers with balance`}
          iconColor="bg-blue-100 text-blue-700"
        />
        <StatsCard
          icon={ArrowUpRight}
          title="Total Payables"
          value={fmtShort(totalPayables)}
          subtitle={`${store.vendors.filter((v) => v.outstanding > 0).length} vendors with balance`}
          iconColor="bg-purple-100 text-purple-700"
        />
        <StatsCard
          icon={AlertTriangle}
          title="Overdue Invoices"
          value={overdueInvoices}
          subtitle="Past due date"
          iconColor="bg-red-100 text-red-700"
        />
        <StatsCard
          icon={Users}
          title="Active Partners"
          value={activePartners}
          subtitle={`${store.customers.filter((c) => c.status === "ACTIVE").length} customers, ${store.vendors.length} vendors`}
          iconColor="bg-green-100 text-green-700"
        />
      </div>

      <FilterBar
        searchPlaceholder={tab === "customers" ? "Search customers..." : "Search vendors..."}
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
        }}
        fields={filterFields}
        values={filters}
        onChange={handleFilterChange}
      />

      <Tabs value={tab} onValueChange={(v) => { setTab(v as "customers" | "vendors"); setSearch(""); setFilters({}); }}>
        <TabsList>
          <TabsTrigger value="customers" className="gap-2">
            <Users className="h-4 w-4" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="vendors" className="gap-2">
            <Building2 className="h-4 w-4" />
            Vendors
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="mt-4">
          <DataTable
            columns={customerColumns}
            data={filteredCustomerRows}
            onRowClick={(row) => {
              setSelectedCustomer(row);
              setDetailTab("info");
            }}
            pagination
            emptyMessage="No customers found."
          />
        </TabsContent>

        <TabsContent value="vendors" className="mt-4">
          <DataTable
            columns={vendorColumns}
            data={filteredVendorRows}
            onRowClick={(row) => {
              setSelectedVendor(row);
              setVendorDetailTab("info");
            }}
            pagination
            emptyMessage="No vendors found."
          />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Aging Analysis — Receivables
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agingData.map((bucket) => (
              <div key={bucket.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{bucket.label}</span>
                  <span className="text-muted-foreground">{fmt(bucket.value)}</span>
                </div>
                <div className="h-4 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${bucket.color}`}
                    style={{
                      width: `${Math.max((bucket.value / agingMax) * 100, bucket.value > 0 ? 2 : 0)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Total Outstanding</span>
            <span>{fmt(agingData.reduce((s, b) => s + b.value, 0))}</span>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedCustomer}
        onOpenChange={(open) => {
          if (!open) setSelectedCustomer(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {selectedCustomer?.name}
              <Badge variant="outline" className="ml-2">{selectedCustomer?.code}</Badge>
            </DialogTitle>
          </DialogHeader>

          <Tabs value={detailTab} onValueChange={(v) => setDetailTab(v as typeof detailTab)}>
            <TabsList className="w-full justify-start">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="invoices">Invoices ({selectedCustomerInvoices.length})</TabsTrigger>
              <TabsTrigger value="payments">Payments ({selectedCustomerPayments.length})</TabsTrigger>
              <TabsTrigger value="statement">Statement</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-4 space-y-4">
              {selectedCustomer && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedCustomer._raw.type}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedCustomer._raw.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedCustomer._raw.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedCustomer._raw.address}{selectedCustomer._raw.city ? `, ${selectedCustomer._raw.city}` : ""}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Financial Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Credit Limit</span>
                        <span className="font-medium">{fmt(selectedCustomer.creditLimit)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Outstanding Balance</span>
                        <span className={`font-semibold ${selectedCustomer.outstanding > 0 ? "text-red-600" : "text-green-600"}`}>
                          {fmt(selectedCustomer.outstanding)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Available Credit</span>
                        <span className="font-medium">{fmt(selectedCustomer.creditLimit - selectedCustomer.outstanding)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Payment Terms</span>
                        <span>{selectedCustomer._raw.paymentTerms}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Currency</span>
                        <span>{selectedCustomer._raw.currency}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status</span>
                        <StatusBadge status={selectedCustomer.status} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {selectedCustomerStatement.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Balance Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedCustomerStatement.map((entry, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-20 text-xs text-muted-foreground">{fmtDate(entry.date)}</div>
                          <div className={`h-2 w-2 rounded-full flex-shrink-0 ${entry.type === "Invoice" ? "bg-red-500" : "bg-green-500"}`} />
                          <div className="flex-1 text-sm">{entry.reference}</div>
                          <div className="text-sm font-medium">
                            {entry.debit > 0 ? (
                              <span className="text-red-600">+{fmtShort(entry.debit)}</span>
                            ) : (
                              <span className="text-green-600">-{fmtShort(entry.credit)}</span>
                            )}
                          </div>
                          <div className="w-24 text-right text-sm font-semibold">{fmtShort(entry.balance)}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="invoices" className="mt-4">
              <DataTable
                columns={invoiceColumns}
                data={selectedCustomerInvoices}
                pagination
                emptyMessage="No invoices found for this customer."
              />
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              <DataTable
                columns={paymentColumns}
                data={selectedCustomerPayments}
                pagination
                emptyMessage="No payments found for this customer."
              />
            </TabsContent>

            <TabsContent value="statement" className="mt-4">
              <DataTable
                columns={statementColumns}
                data={selectedCustomerStatement}
                pagination
                pageSize={20}
                emptyMessage="No transactions found."
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedVendor}
        onOpenChange={(open) => {
          if (!open) setSelectedVendor(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedVendor?.name}
              <Badge variant="outline" className="ml-2">{selectedVendor?.code}</Badge>
            </DialogTitle>
          </DialogHeader>

          <Tabs value={vendorDetailTab} onValueChange={(v) => setVendorDetailTab(v as typeof vendorDetailTab)}>
            <TabsList className="w-full justify-start">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="pos">Purchase Orders ({selectedVendorPOs.length})</TabsTrigger>
              <TabsTrigger value="payments">Payments ({selectedVendorPayments.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-4 space-y-4">
              {selectedVendor && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Vendor Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedVendor.category}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedVendor._raw.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedVendor._raw.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedVendor.address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedVendor._raw.gmpCertified ? "GMP Certified" : "Non-GMP"}</span>
                        {selectedVendor._raw.gmpCertified && (
                          <Badge className="bg-green-100 text-green-800 border-green-200">Certified</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Financial Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Outstanding Balance</span>
                        <span className={`font-semibold ${selectedVendor.outstanding > 0 ? "text-red-600" : "text-green-600"}`}>
                          {fmt(selectedVendor.outstanding)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Payment Terms</span>
                        <span>{selectedVendor.paymentTerms}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total POs</span>
                        <Badge variant="secondary">{selectedVendorPOs.length}</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total PO Value</span>
                        <span className="font-medium">{fmt(selectedVendorPOs.reduce((s, po) => s + po.total, 0))}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Payments</span>
                        <span className="font-medium">{fmt(selectedVendorPayments.reduce((s, p) => s + p.amount, 0))}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {selectedVendorStatement.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Transaction Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedVendorStatement.map((entry, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-20 text-xs text-muted-foreground">{fmtDate(entry.date)}</div>
                          <div className={`h-2 w-2 rounded-full flex-shrink-0 ${entry.type === "Purchase Order" ? "bg-blue-500" : "bg-green-500"}`} />
                          <div className="flex-1 text-sm">{entry.reference}</div>
                          <div className="text-sm font-medium">
                            {entry.debit > 0 ? (
                              <span className="text-red-600">+{fmtShort(entry.debit)}</span>
                            ) : (
                              <span className="text-green-600">-{fmtShort(entry.credit)}</span>
                            )}
                          </div>
                          <div className="w-24 text-right text-sm font-semibold">{fmtShort(entry.balance)}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="pos" className="mt-4">
              <DataTable
                columns={poColumns}
                data={selectedVendorPOs}
                pagination
                emptyMessage="No purchase orders found for this vendor."
              />
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              <DataTable
                columns={paymentColumns}
                data={selectedVendorPayments}
                pagination
                emptyMessage="No payments found for this vendor."
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
