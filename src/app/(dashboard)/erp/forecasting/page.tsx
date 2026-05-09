"use client";

import { useState, useMemo, useCallback } from "react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useApiDataStore } from "@/lib/api/use-api-store";
import type { Product, SalesOrder, PurchaseOrder } from "@/lib/data-store";
import {
  TrendingUp,
  Package,
  AlertTriangle,
  ShieldCheck,
  BarChart3,
  ArrowLeft,
  Truck,
  SlidersHorizontal,
  CalendarRange,
  ShoppingCart,
} from "lucide-react";

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

function getMonthKeys(count: number, offset: number = 0): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i) + offset, 1);
    keys.push(monthKey(d));
  }
  return keys;
}

function movingAverage(values: number[], window: number): number {
  const recent = values.slice(-window);
  if (recent.length === 0) return 0;
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}

interface ProductForecast {
  product: Product;
  monthlyDemand: Record<string, number>;
  last6: string[];
  forecast3: string[];
  forecastValues: number[];
  avgMonthlyDemand: number;
  coverageMonths: number;
  demandVariance: number;
  reorderAlert: boolean;
  urgency: "Critical" | "Warning" | "OK";
  suggestedPOQty: number;
}

export default function ForecastingPage() {
  const store = useApiDataStore();
  const products = store.products as Product[];
  const salesOrders = store.salesOrders as SalesOrder[];
  const purchaseOrders = store.purchaseOrders as PurchaseOrder[];

  const [activeTab, setActiveTab] = useState("demand");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [demandGrowth, setDemandGrowth] = useState(0);
  const [poCreated, setPoCreated] = useState<Set<string>>(new Set());

  const last6Keys = useMemo(() => getMonthKeys(6), []);
  const forecast3Keys = useMemo(() => getMonthKeys(3, 1), []);

  const productDemandMap = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const so of salesOrders) {
      if (so.status === "CANCELLED") continue;
      const soDate = new Date(so.date);
      const mk = monthKey(soDate);
      for (const item of so.items) {
        if (!map[item.productId]) map[item.productId] = {};
        map[item.productId][mk] = (map[item.productId][mk] || 0) + item.quantity;
      }
    }
    return map;
  }, [salesOrders]);

  const forecasts = useMemo<ProductForecast[]>(() => {
    return products.map((product) => {
      const demandByMonth = productDemandMap[product.id] || {};

      const last6Values = last6Keys.map((k) => demandByMonth[k] || 0);
      const nonZero = last6Values.filter((v) => v > 0);
      const avgMonthlyDemand = nonZero.length > 0 ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0;

      const sma = movingAverage(last6Values, 3);
      const forecastValues = [sma, sma, sma];

      const stock = product.stockQty;
      const coverageMonths = avgMonthlyDemand > 0 ? stock / avgMonthlyDemand : avgMonthlyDemand === 0 ? 99 : 0;

      const mean = last6Values.reduce((a, b) => a + b, 0) / (last6Values.length || 1);
      const variance = last6Values.length > 0
        ? Math.sqrt(last6Values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / last6Values.length)
        : 0;

      const reorderAlert = coverageMonths < 2;
      let urgency: "Critical" | "Warning" | "OK" = "OK";
      if (coverageMonths < 1) urgency = "Critical";
      else if (coverageMonths < 2) urgency = "Warning";

      const targetCoverage = 3;
      const neededStock = avgMonthlyDemand * targetCoverage;
      const suggestedPOQty = Math.max(0, Math.ceil(neededStock - stock));

      return {
        product,
        monthlyDemand: demandByMonth,
        last6: last6Keys,
        forecast3: forecast3Keys,
        forecastValues,
        avgMonthlyDemand,
        coverageMonths,
        demandVariance: variance,
        reorderAlert,
        urgency,
        suggestedPOQty,
      };
    });
  }, [products, productDemandMap, last6Keys, forecast3Keys]);

  const belowReorderCount = useMemo(
    () => products.filter((p) => p.stockQty < p.reorderLevel).length,
    [products]
  );

  const overallAvgDemand = useMemo(() => {
    const vals = forecasts.map((f) => f.avgMonthlyDemand).filter((v) => v > 0);
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }, [forecasts]);

  const avgCoverage = useMemo(() => {
    const vals = forecasts.filter((f) => f.avgMonthlyDemand > 0).map((f) => f.coverageMonths);
    return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "N/A";
  }, [forecasts]);

  const forecastAccuracy = useMemo(() => {
    let totalPredicted = 0;
    let totalActual = 0;
    for (const f of forecasts) {
      const lastThree = f.last6.slice(-3);
      const priorThree = f.last6.slice(0, 3);
      const priorSMA = movingAverage(priorThree.map((k) => f.monthlyDemand[k] || 0), 3);
      for (const k of lastThree) {
        const actual = f.monthlyDemand[k] || 0;
        if (actual > 0) {
          totalPredicted += priorSMA;
          totalActual += actual;
        }
      }
    }
    if (totalActual === 0) return 85;
    const mape = Math.abs(totalActual - totalPredicted) / totalActual;
    return Math.max(0, Math.round((1 - mape) * 100));
  }, [forecasts]);

  const selectedForecast = useMemo(
    () => forecasts.find((f) => f.product.id === selectedProductId) || null,
    [forecasts, selectedProductId]
  );

  const scenarioForecasts = useMemo(() => {
    const multiplier = 1 + demandGrowth / 100;
    return forecasts.map((f) => {
      const adjustedDemand = f.avgMonthlyDemand * multiplier;
      const adjustedCoverage = adjustedDemand > 0 ? f.product.stockQty / adjustedDemand : 99;
      let urgency: "Critical" | "Warning" | "OK" = "OK";
      if (adjustedCoverage < 1) urgency = "Critical";
      else if (adjustedCoverage < 2) urgency = "Warning";
      return {
        ...f,
        avgMonthlyDemand: adjustedDemand,
        coverageMonths: adjustedCoverage,
        urgency,
        reorderAlert: adjustedCoverage < 2,
      };
    });
  }, [forecasts, demandGrowth]);

  const categoryPatterns = useMemo(() => {
    const categories: Record<string, { category: string; monthlyTotals: Record<string, number>; products: string[] }> = {};
    for (const f of forecasts) {
      const cat = f.product.therapeuticArea || "Uncategorized";
      if (!categories[cat]) {
        categories[cat] = { category: cat, monthlyTotals: {}, products: [] };
      }
      categories[cat].products.push(f.product.name);
      for (const k of last6Keys) {
        categories[cat].monthlyTotals[k] = (categories[cat].monthlyTotals[k] || 0) + (f.monthlyDemand[k] || 0);
      }
    }
    return Object.values(categories);
  }, [forecasts, last6Keys]);

  const handleCreatePO = useCallback(
    (productId: string) => {
      const f = forecasts.find((fc) => fc.product.id === productId);
      if (!f || f.suggestedPOQty <= 0) return;

      const poId = store.genId("po");
      const poNumber = store.generatePONumber();

      store.add("purchaseOrders", {
        id: poId,
        number: poNumber,
        vendorId: "",
        date: new Date().toISOString().split("T")[0],
        expectedDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
        items: [
          {
            productId: f.product.id,
            description: `${f.product.name} ${f.product.strength} ${f.product.form}`,
            quantity: f.suggestedPOQty,
            unitPrice: f.product.pricePerUnit,
            total: f.suggestedPOQty * f.product.pricePerUnit,
          },
        ],
        subtotal: f.suggestedPOQty * f.product.pricePerUnit,
        tax: Math.round(f.suggestedPOQty * f.product.pricePerUnit * 0.14),
        total: Math.round(f.suggestedPOQty * f.product.pricePerUnit * 1.14),
        status: "DRAFT",
        createdAt: new Date().toISOString().split("T")[0],
      } as PurchaseOrder);

      setPoCreated((prev) => new Set(prev).add(productId));
    },
    [forecasts, store]
  );

  function DemandBarChart({
    last6Keys: l6,
    forecast3Keys: f3,
    monthlyDemand,
    forecastValues,
    height = 120,
  }: {
    last6Keys: string[];
    forecast3Keys: string[];
    monthlyDemand: Record<string, number>;
    forecastValues: number[];
    height?: number;
  }) {
    const allValues = [...l6.map((k) => monthlyDemand[k] || 0), ...forecastValues];
    const maxVal = Math.max(...allValues, 1);
    const barCount = l6.length + f3.length;

    return (
      <div className="flex items-end gap-1" style={{ height }}>
        {l6.map((k, i) => {
          const val = monthlyDemand[k] || 0;
          const pct = (val / maxVal) * 100;
          return (
            <div key={k} className="flex flex-col items-center flex-1 min-w-0" style={{ maxWidth: `${100 / barCount}%` }}>
              <span className="text-[10px] text-muted-foreground mb-1 truncate">{val > 0 ? val.toLocaleString() : ""}</span>
              <div
                className="w-full rounded-t bg-primary/80 transition-all"
                style={{ height: `${Math.max(pct, val > 0 ? 4 : 0)}%` }}
                title={`${monthLabel(k)}: ${val.toLocaleString()}`}
              />
              <span className="text-[9px] text-muted-foreground mt-1 truncate w-full text-center">{monthLabel(k)}</span>
            </div>
          );
        })}
        {f3.map((k, i) => {
          const val = Math.round(forecastValues[i] || 0);
          const pct = (val / maxVal) * 100;
          return (
            <div key={k} className="flex flex-col items-center flex-1 min-w-0" style={{ maxWidth: `${100 / barCount}%` }}>
              <span className="text-[10px] text-muted-foreground/60 mb-1 truncate">{val > 0 ? val.toLocaleString() : ""}</span>
              <div
                className="w-full rounded-t bg-primary/30 border border-dashed border-primary/50 transition-all"
                style={{ height: `${Math.max(pct, val > 0 ? 4 : 0)}%` }}
                title={`${monthLabel(k)} (forecast): ${val.toLocaleString()}`}
              />
              <span className="text-[9px] text-muted-foreground/60 mt-1 truncate w-full text-center">{monthLabel(k)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  function StockProjectionChart({ forecast }: { forecast: ProductForecast }) {
    const months = 6;
    const stock = forecast.product.stockQty;
    const demand = forecast.avgMonthlyDemand;
    const reorder = forecast.product.reorderLevel;
    const maxVal = Math.max(stock, reorder * 1.2, 1);

    const points: { month: number; stock: number }[] = [];
    for (let m = 0; m <= months; m++) {
      points.push({ month: m, stock: Math.max(0, stock - demand * m) });
    }

    return (
      <div className="relative" style={{ height: 140 }}>
        <div className="absolute inset-0 flex items-end">
          {points.map((p, i) => {
            const pct = (p.stock / maxVal) * 100;
            return (
              <div key={i} className="flex flex-col items-center flex-1">
                <span className="text-[10px] text-muted-foreground mb-1">
                  {Math.round(p.stock).toLocaleString()}
                </span>
                <div
                  className={`w-3/4 rounded-t transition-all ${p.stock <= reorder ? "bg-red-400" : "bg-emerald-500/70"}`}
                  style={{ height: `${Math.max(pct, p.stock > 0 ? 3 : 0)}%` }}
                />
                <span className="text-[9px] text-muted-foreground mt-1">M+{p.month}</span>
              </div>
            );
          })}
        </div>
        <div
          className="absolute left-0 right-0 border-t-2 border-dashed border-red-400"
          style={{ bottom: `${(reorder / maxVal) * 100}%` }}
        >
          <span className="absolute -top-4 right-0 text-[9px] text-red-500 font-medium">
            Reorder ({reorder.toLocaleString()})
          </span>
        </div>
      </div>
    );
  }

  if (selectedForecast) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedProductId(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h2 className="text-xl font-bold">{selectedForecast.product.name} — Forecast Detail</h2>
          {selectedForecast.reorderAlert && (
            <Badge variant="destructive">Reorder Alert</Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard
            icon={BarChart3}
            title="Avg Monthly Demand"
            value={Math.round(selectedForecast.avgMonthlyDemand).toLocaleString()}
            subtitle="units/month"
          />
          <StatsCard
            icon={Package}
            title="Current Stock"
            value={selectedForecast.product.stockQty.toLocaleString()}
            subtitle={`Reorder at ${selectedForecast.product.reorderLevel.toLocaleString()}`}
          />
          <StatsCard
            icon={TrendingUp}
            title="Coverage"
            value={`${selectedForecast.coverageMonths.toFixed(1)} mo`}
            subtitle={selectedForecast.coverageMonths < 2 ? "Below safe threshold" : "Adequate"}
            iconColor={selectedForecast.coverageMonths < 2 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}
          />
          <StatsCard
            icon={SlidersHorizontal}
            title="Demand Variance"
            value={Math.round(selectedForecast.demandVariance).toLocaleString()}
            subtitle="Std deviation of monthly demand"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Demand Trend (6-Month History + 3-Month Forecast)</CardTitle>
          </CardHeader>
          <CardContent>
            <DemandBarChart
              last6Keys={selectedForecast.last6}
              forecast3Keys={selectedForecast.forecast3}
              monthlyDemand={selectedForecast.monthlyDemand}
              forecastValues={selectedForecast.forecastValues}
              height={180}
            />
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-primary/80" />
                Historical
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-primary/30 border border-dashed border-primary/50" />
                Forecast (3-mo SMA)
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock Projection</CardTitle>
          </CardHeader>
          <CardContent>
            <StockProjectionChart forecast={selectedForecast} />
            <p className="text-xs text-muted-foreground mt-2">
              Projected stock depletion at current average demand rate of{" "}
              {Math.round(selectedForecast.avgMonthlyDemand).toLocaleString()} units/month.
              Red bars indicate stock below reorder point.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Key Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Avg Monthly Demand</p>
                <p className="text-lg font-bold">{Math.round(selectedForecast.avgMonthlyDemand).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Demand Variance (StdDev)</p>
                <p className="text-lg font-bold">{Math.round(selectedForecast.demandVariance).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Lead Time Estimate</p>
                <p className="text-lg font-bold">14 days</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Safety Stock</p>
                <p className="text-lg font-bold">{selectedForecast.product.reorderLevel.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const supplyColumns: Column[] = [
    {
      key: "name",
      label: "Product",
      sortable: true,
      render: (_: unknown, row: Record<string, unknown>) => (
        <button
          className="text-left font-medium text-primary hover:underline"
          onClick={() => setSelectedProductId(row.id as string)}
        >
          {row.name as string}
        </button>
      ),
    },
    { key: "stockQty", label: "Current Stock", sortable: true, render: (v: number) => v.toLocaleString() },
    { key: "reorderLevel", label: "Reorder Point", sortable: true, render: (v: number) => v.toLocaleString() },
    { key: "avgDemand", label: "Monthly Demand", sortable: true, render: (v: number) => Math.round(v).toLocaleString() },
    {
      key: "coverage",
      label: "Coverage (mo)",
      sortable: true,
      render: (v: number) => (
        <span className={v < 1 ? "text-red-600 font-bold" : v < 2 ? "text-yellow-600 font-semibold" : ""}>
          {v >= 99 ? "N/A" : v.toFixed(1)}
        </span>
      ),
    },
    { key: "suggestedQty", label: "Suggested PO Qty", sortable: true, render: (v: number) => v > 0 ? v.toLocaleString() : "—" },
    {
      key: "urgency",
      label: "Urgency",
      sortable: true,
      render: (v: string) => (
        <Badge variant={v === "Critical" ? "destructive" : v === "Warning" ? "warning" : "secondary"}>
          {v}
        </Badge>
      ),
    },
    {
      key: "action",
      label: "",
      render: (_: unknown, row: Record<string, unknown>) => {
        const id = row.id as string;
        const qty = row.suggestedQty as number;
        if (qty <= 0) return null;
        if (poCreated.has(id)) {
          return <Badge variant="success">PO Created</Badge>;
        }
        return (
          <Button size="sm" variant="outline" onClick={() => handleCreatePO(id)}>
            <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Create PO
          </Button>
        );
      },
    },
  ];

  const supplyData = forecasts.map((f) => ({
    id: f.product.id,
    name: f.product.name,
    stockQty: f.product.stockQty,
    reorderLevel: f.product.reorderLevel,
    avgDemand: f.avgMonthlyDemand,
    coverage: f.coverageMonths,
    suggestedQty: f.suggestedPOQty,
    urgency: f.urgency,
  }));

  const scenarioColumns: Column[] = [
    { key: "name", label: "Product", sortable: true },
    { key: "stockQty", label: "Stock", sortable: true, render: (v: number) => v.toLocaleString() },
    {
      key: "adjustedDemand",
      label: "Adj. Demand/mo",
      sortable: true,
      render: (v: number) => Math.round(v).toLocaleString(),
    },
    {
      key: "coverage",
      label: "Coverage (mo)",
      sortable: true,
      render: (v: number) => (
        <span className={v < 1 ? "text-red-600 font-bold" : v < 2 ? "text-yellow-600 font-semibold" : ""}>
          {v >= 99 ? "N/A" : v.toFixed(1)}
        </span>
      ),
    },
    {
      key: "urgency",
      label: "Urgency",
      sortable: true,
      render: (v: string) => (
        <Badge variant={v === "Critical" ? "destructive" : v === "Warning" ? "warning" : "secondary"}>
          {v}
        </Badge>
      ),
    },
  ];

  const scenarioData = scenarioForecasts.map((f) => ({
    id: f.product.id,
    name: f.product.name,
    stockQty: f.product.stockQty,
    adjustedDemand: f.avgMonthlyDemand,
    coverage: f.coverageMonths,
    urgency: f.urgency,
  }));

  const scenarioCritical = scenarioForecasts.filter((f) => f.urgency === "Critical").length;
  const scenarioWarning = scenarioForecasts.filter((f) => f.urgency === "Warning").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Demand & Supply Forecasting"
        description="Analyze demand trends, project supply coverage, and plan purchase orders for pharmaceutical products."
        icon={<TrendingUp className="h-6 w-6" />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={AlertTriangle}
          title="Below Reorder Point"
          value={belowReorderCount}
          subtitle={`of ${products.length} products`}
          iconColor="bg-red-100 text-red-600"
        />
        <StatsCard
          icon={BarChart3}
          title="Avg Monthly Demand"
          value={overallAvgDemand.toLocaleString()}
          subtitle="units across products"
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatsCard
          icon={Package}
          title="Supply Coverage"
          value={`${avgCoverage} mo`}
          subtitle="avg months of stock"
          iconColor="bg-emerald-100 text-emerald-600"
        />
        <StatsCard
          icon={ShieldCheck}
          title="Forecast Accuracy"
          value={`${forecastAccuracy}%`}
          subtitle="SMA vs actual (last 3 months)"
          iconColor="bg-purple-100 text-purple-600"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="demand">
            <BarChart3 className="h-4 w-4 mr-1.5" /> Demand Forecast
          </TabsTrigger>
          <TabsTrigger value="supply">
            <Truck className="h-4 w-4 mr-1.5" /> Supply Planning
          </TabsTrigger>
          <TabsTrigger value="scenario">
            <SlidersHorizontal className="h-4 w-4 mr-1.5" /> Scenario Planner
          </TabsTrigger>
          <TabsTrigger value="seasonal">
            <CalendarRange className="h-4 w-4 mr-1.5" /> Seasonal Patterns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="demand">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {forecasts.map((f) => {
              const hasDemand = f.avgMonthlyDemand > 0;
              return (
                <Card
                  key={f.product.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedProductId(f.product.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">{f.product.name} — {f.product.strength} {f.product.form}</CardTitle>
                      <div className="flex items-center gap-2">
                        {f.reorderAlert && (
                          <Badge variant="destructive" className="text-[10px]">
                            <AlertTriangle className="h-3 w-3 mr-0.5" /> Reorder
                          </Badge>
                        )}
                        <Badge variant={f.urgency === "Critical" ? "destructive" : f.urgency === "Warning" ? "warning" : "outline"}>
                          {f.urgency}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {hasDemand ? (
                      <DemandBarChart
                        last6Keys={f.last6}
                        forecast3Keys={f.forecast3}
                        monthlyDemand={f.monthlyDemand}
                        forecastValues={f.forecastValues}
                        height={100}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-[100px] text-sm text-muted-foreground">
                        No sales order history
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                      <div className="text-center p-1.5 rounded bg-muted/50">
                        <p className="text-muted-foreground">Stock</p>
                        <p className="font-semibold">{f.product.stockQty.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-1.5 rounded bg-muted/50">
                        <p className="text-muted-foreground">Demand/mo</p>
                        <p className="font-semibold">{Math.round(f.avgMonthlyDemand).toLocaleString()}</p>
                      </div>
                      <div className={`text-center p-1.5 rounded ${f.coverageMonths < 2 ? "bg-red-50" : "bg-muted/50"}`}>
                        <p className="text-muted-foreground">Coverage</p>
                        <p className={`font-semibold ${f.coverageMonths < 2 ? "text-red-600" : ""}`}>
                          {f.coverageMonths >= 99 ? "N/A" : `${f.coverageMonths.toFixed(1)} mo`}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="supply">
          <div className="mt-4">
            <DataTable
              columns={supplyColumns}
              data={supplyData}
              searchable
              searchKeys={["name"]}
              pagination
              emptyMessage="No products to display."
            />
          </div>
        </TabsContent>

        <TabsContent value="scenario">
          <div className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Demand Growth Scenario</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1 w-full">
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Demand Adjustment: <span className={`font-bold ${demandGrowth > 0 ? "text-red-600" : demandGrowth < 0 ? "text-green-600" : ""}`}>{demandGrowth > 0 ? "+" : ""}{demandGrowth}%</span>
                    </label>
                    <input
                      type="range"
                      min={-20}
                      max={50}
                      step={5}
                      value={demandGrowth}
                      onChange={(e) => setDemandGrowth(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>-20%</span>
                      <span>0%</span>
                      <span>+25%</span>
                      <span>+50%</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="text-center px-4 py-2 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-xs text-red-600">Critical</p>
                      <p className="text-xl font-bold text-red-700">{scenarioCritical}</p>
                    </div>
                    <div className="text-center px-4 py-2 rounded-lg bg-yellow-50 border border-yellow-200">
                      <p className="text-xs text-yellow-600">Warning</p>
                      <p className="text-xl font-bold text-yellow-700">{scenarioWarning}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <DataTable
              columns={scenarioColumns}
              data={scenarioData}
              searchable
              searchKeys={["name"]}
              pagination
              emptyMessage="No products to display."
            />
          </div>
        </TabsContent>

        <TabsContent value="seasonal">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {categoryPatterns.map((cat) => {
              const vals = last6Keys.map((k) => cat.monthlyTotals[k] || 0);
              const maxVal = Math.max(...vals, 1);
              const avgVal = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);

              return (
                <Card key={cat.category}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">{cat.category}</CardTitle>
                    <p className="text-xs text-muted-foreground">{cat.products.join(", ")}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-1" style={{ height: 100 }}>
                      {last6Keys.map((k) => {
                        const val = cat.monthlyTotals[k] || 0;
                        const pct = (val / maxVal) * 100;
                        const isHigh = val > avgVal * 1.2;
                        return (
                          <div key={k} className="flex flex-col items-center flex-1">
                            <span className="text-[10px] text-muted-foreground mb-1">
                              {val > 0 ? val.toLocaleString() : ""}
                            </span>
                            <div
                              className={`w-full rounded-t transition-all ${isHigh ? "bg-amber-500" : "bg-primary/60"}`}
                              style={{ height: `${Math.max(pct, val > 0 ? 4 : 0)}%` }}
                              title={`${monthLabel(k)}: ${val.toLocaleString()}`}
                            />
                            <span className="text-[9px] text-muted-foreground mt-1">{monthLabel(k)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-sm bg-primary/60" />
                        Normal
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                        Above avg (&gt;120%)
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
