"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppConfig } from "@/lib/config-context";
import { downloadCSV } from "@/lib/download";
import {
  FlaskConical,
  Pill,
  Warehouse,
  AlertTriangle,
  Thermometer,
  Download,
  Plus,
  Package,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RawMaterial {
  id: string;
  code: string;
  name: string;
  type: "API" | "Excipient" | "Solvent" | "Reagent";
  supplier: string;
  batchNo: string;
  manufactureDate: string;
  expiryDate: string;
  quantityKg: number;
  reorderLevel: number;
  unitCost: number;
  storageCondition: "2-8°C" | "15-25°C" | "Below 30°C" | "Controlled";
  pharmacopoeial: "USP" | "BP" | "EP" | "JP";
  qcStatus: "Quarantine" | "Approved" | "Rejected";
  warehouse: string;
}

interface FinishedProduct {
  id: string;
  code: string;
  name: string;
  strength: string;
  form: "Tablet" | "Capsule" | "Syrup" | "Injection" | "Cream" | "Suspension";
  registration: string;
  batchNo: string;
  manufactureDate: string;
  expiryDate: string;
  quantity: number;
  unit: string;
  packSize: string;
  unitPrice: number;
  storageCondition: "2-8°C" | "15-25°C" | "Below 30°C";
  warehouse: string;
  qcReleased: boolean;
}

interface WarehouseRec {
  id: string;
  name: string;
  type: "Raw Material" | "Finished Goods" | "Cold Chain" | "Quarantine";
  location: string;
  manager: string;
  tempRange: string;
  capacity: number;
  used: number;
}

// ─── Demo data ───────────────────────────────────────────────────────────────

const rawMaterials: RawMaterial[] = [
  { id: "rm-1", code: "API-PARA-500", name: "Paracetamol API", type: "API", supplier: "Sun Pharmaceutical", batchNo: "SP-PA-24091", manufactureDate: "2024-09-12", expiryDate: "2027-09-11", quantityKg: 2400, reorderLevel: 500, unitCost: 380, storageCondition: "Below 30°C", pharmacopoeial: "USP", qcStatus: "Approved", warehouse: "RM Warehouse - Cairo" },
  { id: "rm-2", code: "API-AMOX-250", name: "Amoxicillin Trihydrate", type: "API", supplier: "Lonza AG", batchNo: "LZ-AT-25021", manufactureDate: "2025-02-14", expiryDate: "2028-02-13", quantityKg: 1850, reorderLevel: 400, unitCost: 920, storageCondition: "15-25°C", pharmacopoeial: "EP", qcStatus: "Approved", warehouse: "RM Warehouse - Cairo" },
  { id: "rm-3", code: "API-OMEZ-20", name: "Omeprazole API", type: "API", supplier: "Sun Pharmaceutical", batchNo: "SP-OM-25033", manufactureDate: "2025-03-08", expiryDate: "2027-03-07", quantityKg: 480, reorderLevel: 300, unitCost: 1240, storageCondition: "2-8°C", pharmacopoeial: "USP", qcStatus: "Quarantine", warehouse: "Cold Storage - Cairo" },
  { id: "rm-4", code: "EXP-MCC-101", name: "Microcrystalline Cellulose 101", type: "Excipient", supplier: "BASF Pharma", batchNo: "BSF-MCC-25018", manufactureDate: "2025-01-22", expiryDate: "2030-01-21", quantityKg: 6800, reorderLevel: 1000, unitCost: 95, storageCondition: "Below 30°C", pharmacopoeial: "USP", qcStatus: "Approved", warehouse: "RM Warehouse - Cairo" },
  { id: "rm-5", code: "EXP-LACT-200", name: "Lactose Monohydrate 200M", type: "Excipient", supplier: "DFE Pharma", batchNo: "DFE-LM-25004", manufactureDate: "2025-01-08", expiryDate: "2029-01-07", quantityKg: 4200, reorderLevel: 800, unitCost: 62, storageCondition: "Below 30°C", pharmacopoeial: "USP", qcStatus: "Approved", warehouse: "RM Warehouse - Cairo" },
  { id: "rm-6", code: "EXP-MGST", name: "Magnesium Stearate", type: "Excipient", supplier: "Faci Asia Pacific", batchNo: "FAP-MS-24112", manufactureDate: "2024-11-30", expiryDate: "2027-11-29", quantityKg: 240, reorderLevel: 300, unitCost: 145, storageCondition: "15-25°C", pharmacopoeial: "EP", qcStatus: "Approved", warehouse: "RM Warehouse - Cairo" },
  { id: "rm-7", code: "SLV-ETHA", name: "Ethanol 96%", type: "Solvent", supplier: "Egyptian Co. for Lab Reagents", batchNo: "ECLR-ET-25022", manufactureDate: "2025-02-04", expiryDate: "2028-02-03", quantityKg: 8500, reorderLevel: 1500, unitCost: 24, storageCondition: "Below 30°C", pharmacopoeial: "USP", qcStatus: "Approved", warehouse: "Solvent Store" },
];

const finishedProducts: FinishedProduct[] = [
  { id: "fp-1", code: "FG-PARA500-T", name: "Paracetamol", strength: "500mg", form: "Tablet", registration: "EDA-12345/2023", batchNo: "B-2026-441", manufactureDate: "2026-03-12", expiryDate: "2029-03-11", quantity: 4200, unit: "boxes", packSize: "20 tabs/strip × 5 strips", unitPrice: 12.5, storageCondition: "Below 30°C", warehouse: "FG Warehouse - Cairo", qcReleased: true },
  { id: "fp-2", code: "FG-AMOX250-C", name: "Amoxicillin", strength: "250mg", form: "Capsule", registration: "EDA-12390/2022", batchNo: "B-2026-438", manufactureDate: "2026-03-05", expiryDate: "2028-03-04", quantity: 2800, unit: "boxes", packSize: "12 caps/strip", unitPrice: 28, storageCondition: "Below 30°C", warehouse: "FG Warehouse - Cairo", qcReleased: true },
  { id: "fp-3", code: "FG-OMEZ20-C", name: "Omeprazole", strength: "20mg", form: "Capsule", registration: "EDA-13201/2024", batchNo: "B-2026-445", manufactureDate: "2026-03-22", expiryDate: "2028-03-21", quantity: 1650, unit: "boxes", packSize: "14 caps/strip × 2 strips", unitPrice: 45, storageCondition: "Below 30°C", warehouse: "FG Warehouse - Cairo", qcReleased: false },
  { id: "fp-4", code: "FG-INSU-INJ", name: "Insulin Glargine", strength: "100 IU/mL", form: "Injection", registration: "EDA-09812/2020", batchNo: "B-2026-440", manufactureDate: "2026-03-10", expiryDate: "2027-09-09", quantity: 720, unit: "vials", packSize: "10mL vial", unitPrice: 285, storageCondition: "2-8°C", warehouse: "Cold Storage - Cairo", qcReleased: true },
  { id: "fp-5", code: "FG-COUGH-SYR", name: "Cough Suppressant Syrup", strength: "100mg/5mL", form: "Syrup", registration: "EDA-15022/2023", batchNo: "B-2026-442", manufactureDate: "2026-03-15", expiryDate: "2028-09-14", quantity: 3100, unit: "bottles", packSize: "100mL bottle", unitPrice: 18, storageCondition: "15-25°C", warehouse: "FG Warehouse - Cairo", qcReleased: true },
  { id: "fp-6", code: "FG-VITC-EFF", name: "Vitamin C Effervescent", strength: "1000mg", form: "Tablet", registration: "EDA-14501/2022", batchNo: "B-2026-439", manufactureDate: "2026-03-08", expiryDate: "2028-03-07", quantity: 5400, unit: "tubes", packSize: "20 tabs/tube", unitPrice: 35, storageCondition: "Below 30°C", warehouse: "FG Warehouse - Cairo", qcReleased: true },
  { id: "fp-7", code: "FG-HYDRO-CR", name: "Hydrocortisone Cream", strength: "1%", form: "Cream", registration: "EDA-08812/2021", batchNo: "B-2026-443", manufactureDate: "2026-03-18", expiryDate: "2028-03-17", quantity: 1240, unit: "tubes", packSize: "30g tube", unitPrice: 22, storageCondition: "15-25°C", warehouse: "FG Warehouse - Cairo", qcReleased: true },
];

const warehouseList: WarehouseRec[] = [
  { id: "wh-1", name: "RM Warehouse - Cairo", type: "Raw Material", location: "Plant 1, 6th October City", manager: "Mostafa Salah", tempRange: "20-25°C", capacity: 25000, used: 17820 },
  { id: "wh-2", name: "FG Warehouse - Cairo", type: "Finished Goods", location: "Plant 1, 6th October City", manager: "Khaled Farouk", tempRange: "20-25°C", capacity: 18000, used: 12450 },
  { id: "wh-3", name: "Cold Storage - Cairo", type: "Cold Chain", location: "Plant 1, 6th October City", manager: "Dina Hassan", tempRange: "2-8°C", capacity: 4000, used: 1820 },
  { id: "wh-4", name: "Quarantine Area", type: "Quarantine", location: "Plant 1, QA Block", manager: "Dr. Ahmed Tareq", tempRange: "20-25°C", capacity: 2000, used: 480 },
  { id: "wh-5", name: "Solvent Store", type: "Raw Material", location: "Plant 1, Hazardous Block", manager: "Mostafa Salah", tempRange: "15-25°C", capacity: 12000, used: 8500 },
];

type Tab = "raw" | "finished" | "warehouses";

export default function InventoryPage() {
  const { config } = useAppConfig();
  const [tab, setTab] = useState<Tab>("raw");

  const fmt = (n: number): string =>
    `${config.finance.currency} ${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  const stats = useMemo(() => {
    const rmValue = rawMaterials.reduce((s, r) => s + r.quantityKg * r.unitCost, 0);
    const fgValue = finishedProducts.reduce((s, p) => s + p.quantity * p.unitPrice, 0);
    const lowStock = rawMaterials.filter((r) => r.quantityKg <= r.reorderLevel).length;
    const expiringSoon = [...rawMaterials, ...finishedProducts].filter((item) => {
      const exp = new Date("expiryDate" in item ? item.expiryDate : "");
      const now = new Date("2026-04-11");
      const days = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return days < config.inventory.expiryAlertDays;
    }).length;
    return { rmValue, fgValue, lowStock, expiringSoon };
  }, [config]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Inventory"
        description="Raw materials, finished products, and warehouse management"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                tab === "raw"
                  ? downloadCSV("raw-materials.csv", rawMaterials)
                  : tab === "finished"
                  ? downloadCSV("finished-products.csv", finishedProducts)
                  : downloadCSV("warehouses.csv", warehouseList)
              }
            >
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Add Item
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Raw Materials Value"
          value={fmt(stats.rmValue)}
          subtitle={`${rawMaterials.length} active SKUs`}
          icon={<FlaskConical className="h-5 w-5" />}
          iconColor="bg-purple-100 text-purple-700"
        />
        <StatsCard
          title="Finished Goods Value"
          value={fmt(stats.fgValue)}
          subtitle={`${finishedProducts.length} active SKUs`}
          icon={<Pill className="h-5 w-5" />}
          iconColor="bg-emerald-100 text-emerald-700"
        />
        <StatsCard
          title="Low Stock Alerts"
          value={stats.lowStock.toLocaleString()}
          subtitle="RM at/below reorder level"
          icon={<AlertTriangle className="h-5 w-5" />}
          iconColor="bg-amber-100 text-amber-700"
        />
        <StatsCard
          title="Expiring Soon"
          value={stats.expiringSoon.toLocaleString()}
          subtitle={`Within ${config.inventory.expiryAlertDays} days`}
          icon={<Thermometer className="h-5 w-5" />}
          iconColor="bg-red-100 text-red-700"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-1 -mb-px">
          {[
            { key: "raw", label: "Raw Materials", icon: FlaskConical },
            { key: "finished", label: "Finished Products", icon: Pill },
            { key: "warehouses", label: "Warehouses", icon: Warehouse },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key as Tab)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Raw Materials */}
      {tab === "raw" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-purple-600" />
              Raw Materials (APIs, Excipients, Solvents)
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-purple-50 border-y">
                <tr>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Code</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Material</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Type</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Supplier</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Batch / Expiry</th>
                  <th className="text-right p-3 font-semibold text-xs uppercase">Qty (kg)</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Storage</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">QC</th>
                </tr>
              </thead>
              <tbody>
                {rawMaterials.map((r) => {
                  const isLow = r.quantityKg <= r.reorderLevel;
                  return (
                    <tr key={r.id} className="border-b hover:bg-slate-50">
                      <td className="p-3 font-mono text-xs">{r.code}</td>
                      <td className="p-3 font-medium">{r.name}</td>
                      <td className="p-3"><Badge variant="secondary">{r.type}</Badge></td>
                      <td className="p-3 text-muted-foreground">{r.supplier}</td>
                      <td className="p-3">
                        <div className="font-mono text-xs">{r.batchNo}</div>
                        <div className="text-[11px] text-muted-foreground">exp {r.expiryDate}</div>
                      </td>
                      <td className={`p-3 text-right font-medium ${isLow ? "text-red-600" : ""}`}>
                        {r.quantityKg.toLocaleString()}
                        {isLow && <div className="text-[10px] text-red-500">below reorder</div>}
                      </td>
                      <td className="p-3 text-xs">{r.storageCondition}</td>
                      <td className="p-3">
                        <Badge
                          variant={
                            r.qcStatus === "Approved"
                              ? "success"
                              : r.qcStatus === "Rejected"
                              ? "destructive"
                              : "warning"
                          }
                        >
                          {r.qcStatus}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Finished Products */}
      {tab === "finished" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Pill className="h-4 w-4 text-emerald-600" />
              Finished Products (Released for Sale)
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50 border-y">
                <tr>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Code</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Product</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Form</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">EDA Reg.</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Batch</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Expiry</th>
                  <th className="text-right p-3 font-semibold text-xs uppercase">Qty</th>
                  <th className="text-right p-3 font-semibold text-xs uppercase">Price</th>
                  <th className="text-left p-3 font-semibold text-xs uppercase">Released</th>
                </tr>
              </thead>
              <tbody>
                {finishedProducts.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-mono text-xs">{p.code}</td>
                    <td className="p-3">
                      <div className="font-medium">{p.name} {p.strength}</div>
                      <div className="text-[11px] text-muted-foreground">{p.packSize}</div>
                    </td>
                    <td className="p-3"><Badge variant="secondary">{p.form}</Badge></td>
                    <td className="p-3 font-mono text-xs">{p.registration}</td>
                    <td className="p-3 font-mono text-xs">{p.batchNo}</td>
                    <td className="p-3 text-xs">{p.expiryDate}</td>
                    <td className="p-3 text-right">{p.quantity.toLocaleString()} {p.unit}</td>
                    <td className="p-3 text-right font-medium">{fmt(p.unitPrice)}</td>
                    <td className="p-3">
                      <Badge variant={p.qcReleased ? "success" : "warning"}>
                        {p.qcReleased ? "Released" : "Pending QC"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Warehouses */}
      {tab === "warehouses" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouseList.map((w) => {
            const pct = Math.round((w.used / w.capacity) * 100);
            const colorByType: Record<typeof w.type, string> = {
              "Raw Material": "bg-purple-100 text-purple-700",
              "Finished Goods": "bg-emerald-100 text-emerald-700",
              "Cold Chain": "bg-blue-100 text-blue-700",
              "Quarantine": "bg-amber-100 text-amber-700",
            };
            return (
              <Card key={w.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${colorByType[w.type]}`}>
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">{w.name}</CardTitle>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{w.location}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{w.type}</Badge>
                    <span className="text-xs text-muted-foreground">{w.tempRange}</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Capacity</span>
                      <span>{w.used.toLocaleString()} / {w.capacity.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${pct > 85 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground border-t pt-2">
                    Manager: <span className="font-medium text-foreground">{w.manager}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
