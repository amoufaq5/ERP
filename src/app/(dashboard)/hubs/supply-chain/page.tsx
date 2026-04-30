"use client";

import dynamic from "next/dynamic";
import { useDataStore } from "@/lib/data-store";
import StatsCard from "@/components/shared/stats-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Truck,
  ShoppingCart,
  Package,
  Clock,
  ArrowRight,
  CheckCircle,
  XCircle,
} from "lucide-react";

const SupplyChainPage = dynamic(
  () => import("@/app/(dashboard)/supply-chain/page"),
  { ssr: false }
);

const ProcurementPage = dynamic(
  () => import("@/app/(dashboard)/erp/procurement/page"),
  { ssr: false }
);

const fmt = (n: number) =>
  `EGP ${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const FLOW_STEPS = [
  "Suppliers",
  "Procurement",
  "Warehouse",
  "Production",
  "Distribution",
] as const;

const SIMULATED_STOCK = [
  { level: 12, reorder: 50 },
  { level: 8, reorder: 30 },
  { level: 3, reorder: 20 },
  { level: 18, reorder: 40 },
  { level: 5, reorder: 25 },
] as const;

export default function SupplyChainHub() {
  const store = useDataStore();
  const vendors = store.vendors;
  const products = store.products;

  const topVendors = vendors.slice(0, 5);
  const alertProducts = products.slice(0, 5).map((p, i) => ({
    ...p,
    stockLevel: SIMULATED_STOCK[i].level,
    reorderLevel: SIMULATED_STOCK[i].reorder,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Supply Chain &amp; Procurement
        </h1>
        <p className="text-muted-foreground">
          End-to-end supply chain management and vendor procurement
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="supply-chain">Supply Chain</TabsTrigger>
          <TabsTrigger value="procurement">Procurement</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ─────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Stats Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              icon={Truck}
              title="Active Suppliers"
              value={vendors.length}
              change={5}
              changeLabel="vs last period"
            />
            <StatsCard
              icon={Package}
              title="Total Products"
              value={products.length}
            />
            <StatsCard
              icon={ShoppingCart}
              title="Pending Orders"
              value={23}
            />
            <StatsCard
              icon={Clock}
              title="Avg Lead Time"
              value="4.2 days"
            />
          </div>

          {/* Two-column section */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Supplier Performance */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">
                Supplier Performance
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Name</th>
                      <th className="pb-2 pr-4 font-medium">Category</th>
                      <th className="pb-2 pr-4 font-medium text-right">
                        Outstanding
                      </th>
                      <th className="pb-2 font-medium text-center">
                        GMP Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topVendors.map((v) => (
                      <tr
                        key={v.id}
                        className="border-b last:border-0 hover:bg-muted/40"
                      >
                        <td className="py-2.5 pr-4 font-medium">{v.name}</td>
                        <td className="py-2.5 pr-4 text-muted-foreground">
                          {v.category}
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">
                          {fmt(v.outstanding)}
                        </td>
                        <td className="py-2.5 text-center">
                          {v.gmpCertified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle className="h-3 w-3" />
                              Certified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              <XCircle className="h-3 w-3" />
                              Not Certified
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {topVendors.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-6 text-center text-muted-foreground"
                        >
                          No vendors found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Inventory Alerts */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">Inventory Alerts</h2>
              <ul className="space-y-3">
                {alertProducts.map((p) => {
                  const pct = Math.round((p.stockLevel / p.reorderLevel) * 100);
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.code} &middot; {p.form}
                        </p>
                      </div>
                      <div className="ml-4 flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                          {p.stockLevel} / {p.reorderLevel}
                        </span>
                        <div className="h-1.5 w-20 rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-red-500"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
                {alertProducts.length === 0 && (
                  <li className="py-6 text-center text-muted-foreground">
                    No products found.
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Supply Chain Flow */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Supply Chain Flow</h2>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {FLOW_STEPS.map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <div className="flex h-14 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 px-5 text-sm font-semibold text-primary">
                    {step}
                  </div>
                  {i < FLOW_STEPS.length - 1 && (
                    <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── Supply Chain Tab ─────────────────────────────────── */}
        <TabsContent value="supply-chain">
          <SupplyChainPage />
        </TabsContent>

        {/* ── Procurement Tab ─────────────────────────────────── */}
        <TabsContent value="procurement">
          <ProcurementPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
