"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building2,
  ArrowRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { useApiDataStore } from "@/lib/api/use-api-store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatsCard from "@/components/shared/stats-card";
import StatusBadge from "@/components/shared/status-badge";

// ---------------------------------------------------------------------------
// Lazy-loaded module pages
// ---------------------------------------------------------------------------

const FinancePage = dynamic(
  () => import("@/app/(dashboard)/erp/finance/page"),
  { ssr: false }
);
const AccountingPage = dynamic(
  () => import("@/app/(dashboard)/erp/accounting/page"),
  { ssr: false }
);
const CollectionsPage = dynamic(
  () => import("@/app/(dashboard)/erp/collections/page"),
  { ssr: false }
);
const ReturnsPage = dynamic(
  () => import("@/app/(dashboard)/erp/returns/page"),
  { ssr: false }
);
const PartnerLedgerPage = dynamic(
  () => import("@/app/(dashboard)/erp/partner-ledger/page"),
  { ssr: false }
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = (n: number) =>
  `EGP ${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const PIE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

const QUICK_LINKS: {
  title: string;
  description: string;
  href: string;
  tab: string;
}[] = [
  {
    title: "Finance",
    description: "Invoices, payments & bank accounts",
    href: "/erp/finance",
    tab: "finance",
  },
  {
    title: "Accounting",
    description: "Chart of accounts, journal entries & budgets",
    href: "/erp/accounting",
    tab: "accounting",
  },
  {
    title: "Collections",
    description: "Track outstanding receivables & follow-ups",
    href: "/erp/collections",
    tab: "collections",
  },
  {
    title: "Returns",
    description: "Manage product returns & credit notes",
    href: "/erp/returns",
    tab: "returns",
  },
  {
    title: "Partner Ledger",
    description: "Customer & vendor ledger balances",
    href: "/erp/partner-ledger",
    tab: "partner-ledger",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FinanceHubPage() {
  const store = useApiDataStore();

  // ---- KPI calculations ---------------------------------------------------

  const totalRevenue = useMemo(
    () =>
      store.invoices
        .filter((inv) => inv.status === "PAID")
        .reduce((sum, inv) => sum + inv.total, 0),
    [store.invoices]
  );

  const outstandingReceivables = useMemo(
    () => store.customers.reduce((sum, c) => sum + c.outstanding, 0),
    [store.customers]
  );

  const totalPayables = useMemo(
    () => store.vendors.reduce((sum, v) => sum + v.outstanding, 0),
    [store.vendors]
  );

  const cashPosition = useMemo(
    () => store.bankAccounts.reduce((sum, b) => sum + b.balance, 0),
    [store.bankAccounts]
  );

  // ---- Revenue vs Expenses bar chart data ---------------------------------

  const revenueExpenseData = useMemo(() => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const revenueByMonth: Record<string, number> = {};
    const expenseByMonth: Record<string, number> = {};

    for (const m of months) {
      revenueByMonth[m] = 0;
      expenseByMonth[m] = 0;
    }

    for (const inv of store.invoices) {
      if (inv.status === "PAID" || inv.status === "PARTIAL") {
        const d = new Date(inv.date);
        const key = months[d.getMonth()];
        if (key) revenueByMonth[key] += inv.total;
      }
    }

    for (const p of store.payments) {
      if (p.type === "SENT") {
        const d = new Date(p.date);
        const key = months[d.getMonth()];
        if (key) expenseByMonth[key] += p.amount;
      }
    }

    return months.map((m) => ({
      month: m,
      revenue: revenueByMonth[m],
      expenses: expenseByMonth[m],
    }));
  }, [store.invoices, store.payments]);

  // ---- Invoice status distribution ----------------------------------------

  const invoiceStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const inv of store.invoices) {
      counts[inv.status] = (counts[inv.status] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [store.invoices]);

  // ---- Recent invoices ----------------------------------------------------

  const recentInvoices = useMemo(
    () =>
      [...store.invoices]
        .sort(
          (a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        )
        .slice(0, 5),
    [store.invoices]
  );

  // ---- Render -------------------------------------------------------------

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Finance &amp; Accounting
          </h1>
          <p className="text-muted-foreground">
            Unified financial management dashboard
          </p>
        </div>

        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="accounting">Accounting</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
          <TabsTrigger value="partner-ledger">Partner Ledger</TabsTrigger>
        </TabsList>
      </div>

      {/* ================================================================= */}
      {/* OVERVIEW TAB                                                      */}
      {/* ================================================================= */}
      <TabsContent value="overview" className="space-y-6">
        {/* KPI Stats Row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            icon={DollarSign}
            title="Total Revenue"
            value={fmt(totalRevenue)}
            subtitle="Sum of all paid invoices"
            iconColor="bg-green-100 text-green-700"
          />
          <StatsCard
            icon={TrendingUp}
            title="Outstanding Receivables"
            value={fmt(outstandingReceivables)}
            subtitle={`${store.customers.length} customers`}
            iconColor="bg-blue-100 text-blue-700"
          />
          <StatsCard
            icon={TrendingDown}
            title="Total Payables"
            value={fmt(totalPayables)}
            subtitle={`${store.vendors.length} vendors`}
            iconColor="bg-red-100 text-red-700"
          />
          <StatsCard
            icon={Building2}
            title="Cash Position"
            value={fmt(cashPosition)}
            subtitle={`${store.bankAccounts.length} bank accounts`}
            iconColor="bg-purple-100 text-purple-700"
          />
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Revenue vs Expenses */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue vs Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueExpenseData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip
                      formatter={(value) => fmt(Number(value ?? 0))}
                    />
                    <Bar
                      dataKey="revenue"
                      name="Revenue"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="expenses"
                      name="Expenses"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={invoiceStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="name"
                      label={(props: {
                        name?: string;
                        percent?: number;
                      }) =>
                        `${props.name ?? ""} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {invoiceStatusData.map((_, idx) => (
                        <Cell
                          key={idx}
                          fill={PIE_COLORS[idx % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => String(value ?? 0)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No invoices found.
              </p>
            ) : (
              <div className="space-y-4">
                {recentInvoices.map((inv) => {
                  const customer = store.customers.find(
                    (c) => c.id === inv.customerId
                  );
                  return (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">
                          {inv.number}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {customer?.name ?? "Unknown Customer"} &mdash;{" "}
                          {new Date(inv.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">
                          {fmt(inv.total)}
                        </span>
                        <StatusBadge status={inv.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Quick Links</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {QUICK_LINKS.map((link) => (
              <Link key={link.tab} href={link.href}>
                <Card className="group cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center justify-between p-5">
                    <div>
                      <p className="font-medium">{link.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {link.description}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </TabsContent>

      {/* ================================================================= */}
      {/* MODULE TABS                                                       */}
      {/* ================================================================= */}
      <TabsContent value="finance">
        <FinancePage />
      </TabsContent>

      <TabsContent value="accounting">
        <AccountingPage />
      </TabsContent>

      <TabsContent value="collections">
        <CollectionsPage />
      </TabsContent>

      <TabsContent value="returns">
        <ReturnsPage />
      </TabsContent>

      <TabsContent value="partner-ledger">
        <PartnerLedgerPage />
      </TabsContent>
    </Tabs>
  );
}
