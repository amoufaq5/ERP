"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import {
  EntityFormModal,
  type EntityField,
  type EntityFormData,
} from "@/components/shared/entity-form-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppConfig } from "@/lib/config-context";
import { useDataStore } from "@/lib/data-store";
import { downloadCSV } from "@/lib/download";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  FlaskConical, Pill, Warehouse, AlertTriangle,
  Thermometer, Download, Plus, Package, BookOpen,
  Layers, TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown,
  Clock, ShieldAlert, BarChart3,
} from "lucide-react";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { useTranslation } from "@/lib/i18n/i18n-context";
import { useNotificationCenter } from "@/lib/notification-context";
import { useAuditLogger } from "@/lib/audit-logger";

/* ─── Types ──────────────────────────────────────────────────────── */

interface RawMaterial {
  id: string; code: string; name: string;
  type: "API" | "Excipient" | "Solvent" | "Reagent";
  supplier: string; batchNo: string; manufactureDate: string; expiryDate: string;
  quantityKg: number; reorderLevel: number; unitCost: number;
  storageCondition: "2-8°C" | "15-25°C" | "Below 30°C" | "Controlled";
  pharmacopoeial: "USP" | "BP" | "EP" | "JP";
  qcStatus: "Quarantine" | "Approved" | "Rejected";
  warehouse: string;
}

interface FinishedProduct {
  id: string; code: string; name: string; strength: string;
  form: "Tablet" | "Capsule" | "Syrup" | "Injection" | "Cream" | "Suspension";
  registration: string; batchNo: string; manufactureDate: string; expiryDate: string;
  quantity: number; unit: string; packSize: string; unitPrice: number;
  storageCondition: "2-8°C" | "15-25°C" | "Below 30°C";
  warehouse: string; qcReleased: boolean;
}

interface WarehouseRec {
  id: string; name: string;
  type: "Raw Material" | "Finished Goods" | "Cold Chain" | "Quarantine";
  location: string; manager: string; tempRange: string;
  capacity: number; used: number;
}

/* ─── Seed data ──────────────────────────────────────────────────── */

const SEED_RM: RawMaterial[] = [
  { id: "rm-1", code: "API-PARA-500", name: "Paracetamol API", type: "API", supplier: "Sun Pharmaceutical", batchNo: "SP-PA-24091", manufactureDate: "2024-09-12", expiryDate: "2027-09-11", quantityKg: 2400, reorderLevel: 500, unitCost: 380, storageCondition: "Below 30°C", pharmacopoeial: "USP", qcStatus: "Approved", warehouse: "RM Warehouse - Cairo" },
  { id: "rm-2", code: "API-AMOX-250", name: "Amoxicillin Trihydrate", type: "API", supplier: "Lonza AG", batchNo: "LZ-AT-25021", manufactureDate: "2025-02-14", expiryDate: "2028-02-13", quantityKg: 1850, reorderLevel: 400, unitCost: 920, storageCondition: "15-25°C", pharmacopoeial: "EP", qcStatus: "Approved", warehouse: "RM Warehouse - Cairo" },
  { id: "rm-3", code: "API-OMEZ-20", name: "Omeprazole API", type: "API", supplier: "Sun Pharmaceutical", batchNo: "SP-OM-25033", manufactureDate: "2025-03-08", expiryDate: "2027-03-07", quantityKg: 480, reorderLevel: 300, unitCost: 1240, storageCondition: "2-8°C", pharmacopoeial: "USP", qcStatus: "Quarantine", warehouse: "Cold Storage - Cairo" },
  { id: "rm-4", code: "EXP-MCC-101", name: "Microcrystalline Cellulose 101", type: "Excipient", supplier: "BASF Pharma", batchNo: "BSF-MCC-25018", manufactureDate: "2025-01-22", expiryDate: "2030-01-21", quantityKg: 6800, reorderLevel: 1000, unitCost: 95, storageCondition: "Below 30°C", pharmacopoeial: "USP", qcStatus: "Approved", warehouse: "RM Warehouse - Cairo" },
  { id: "rm-5", code: "EXP-LACT-200", name: "Lactose Monohydrate 200M", type: "Excipient", supplier: "DFE Pharma", batchNo: "DFE-LM-25004", manufactureDate: "2025-01-08", expiryDate: "2029-01-07", quantityKg: 4200, reorderLevel: 800, unitCost: 62, storageCondition: "Below 30°C", pharmacopoeial: "USP", qcStatus: "Approved", warehouse: "RM Warehouse - Cairo" },
  { id: "rm-6", code: "EXP-MGST", name: "Magnesium Stearate", type: "Excipient", supplier: "Faci Asia Pacific", batchNo: "FAP-MS-24112", manufactureDate: "2024-11-30", expiryDate: "2027-11-29", quantityKg: 240, reorderLevel: 300, unitCost: 145, storageCondition: "15-25°C", pharmacopoeial: "EP", qcStatus: "Approved", warehouse: "RM Warehouse - Cairo" },
  { id: "rm-7", code: "SLV-ETHA", name: "Ethanol 96%", type: "Solvent", supplier: "Egyptian Co. for Lab Reagents", batchNo: "ECLR-ET-25022", manufactureDate: "2025-02-04", expiryDate: "2028-02-03", quantityKg: 8500, reorderLevel: 1500, unitCost: 24, storageCondition: "Below 30°C", pharmacopoeial: "USP", qcStatus: "Approved", warehouse: "Solvent Store" },
];

const SEED_FP: FinishedProduct[] = [
  { id: "fp-1", code: "FG-PARA500-T", name: "Paracetamol", strength: "500mg", form: "Tablet", registration: "EDA-12345/2023", batchNo: "B-2026-441", manufactureDate: "2026-03-12", expiryDate: "2029-03-11", quantity: 4200, unit: "boxes", packSize: "20 tabs/strip × 5 strips", unitPrice: 12.5, storageCondition: "Below 30°C", warehouse: "FG Warehouse - Cairo", qcReleased: true },
  { id: "fp-2", code: "FG-AMOX250-C", name: "Amoxicillin", strength: "250mg", form: "Capsule", registration: "EDA-12390/2022", batchNo: "B-2026-438", manufactureDate: "2026-03-05", expiryDate: "2028-03-04", quantity: 2800, unit: "boxes", packSize: "12 caps/strip", unitPrice: 28, storageCondition: "Below 30°C", warehouse: "FG Warehouse - Cairo", qcReleased: true },
  { id: "fp-3", code: "FG-OMEZ20-C", name: "Omeprazole", strength: "20mg", form: "Capsule", registration: "EDA-13201/2024", batchNo: "B-2026-445", manufactureDate: "2026-03-22", expiryDate: "2028-03-21", quantity: 1650, unit: "boxes", packSize: "14 caps/strip × 2 strips", unitPrice: 45, storageCondition: "Below 30°C", warehouse: "FG Warehouse - Cairo", qcReleased: false },
  { id: "fp-4", code: "FG-INSU-INJ", name: "Insulin Glargine", strength: "100 IU/mL", form: "Injection", registration: "EDA-09812/2020", batchNo: "B-2026-440", manufactureDate: "2026-03-10", expiryDate: "2027-09-09", quantity: 720, unit: "vials", packSize: "10mL vial", unitPrice: 285, storageCondition: "2-8°C", warehouse: "Cold Storage - Cairo", qcReleased: true },
  { id: "fp-5", code: "FG-COUGH-SYR", name: "Cough Suppressant Syrup", strength: "100mg/5mL", form: "Syrup", registration: "EDA-15022/2023", batchNo: "B-2026-442", manufactureDate: "2026-03-15", expiryDate: "2028-09-14", quantity: 3100, unit: "bottles", packSize: "100mL bottle", unitPrice: 18, storageCondition: "15-25°C", warehouse: "FG Warehouse - Cairo", qcReleased: true },
  { id: "fp-6", code: "FG-VITC-EFF", name: "Vitamin C Effervescent", strength: "1000mg", form: "Tablet", registration: "EDA-14501/2022", batchNo: "B-2026-439", manufactureDate: "2026-03-08", expiryDate: "2028-03-07", quantity: 5400, unit: "tubes", packSize: "20 tabs/tube", unitPrice: 35, storageCondition: "Below 30°C", warehouse: "FG Warehouse - Cairo", qcReleased: true },
  { id: "fp-7", code: "FG-HYDRO-CR", name: "Hydrocortisone Cream", strength: "1%", form: "Cream", registration: "EDA-08812/2021", batchNo: "B-2026-443", manufactureDate: "2026-03-18", expiryDate: "2028-03-17", quantity: 1240, unit: "tubes", packSize: "30g tube", unitPrice: 22, storageCondition: "15-25°C", warehouse: "FG Warehouse - Cairo", qcReleased: true },
];

const SEED_WH: WarehouseRec[] = [
  { id: "wh-1", name: "RM Warehouse - Cairo", type: "Raw Material", location: "Plant 1, 6th October City", manager: "Mostafa Salah", tempRange: "20-25°C", capacity: 25000, used: 17820 },
  { id: "wh-2", name: "FG Warehouse - Cairo", type: "Finished Goods", location: "Plant 1, 6th October City", manager: "Khaled Farouk", tempRange: "20-25°C", capacity: 18000, used: 12450 },
  { id: "wh-3", name: "Cold Storage - Cairo", type: "Cold Chain", location: "Plant 1, 6th October City", manager: "Dina Hassan", tempRange: "2-8°C", capacity: 4000, used: 1820 },
  { id: "wh-4", name: "Quarantine Area", type: "Quarantine", location: "Plant 1, QA Block", manager: "Dr. Ahmed Tareq", tempRange: "20-25°C", capacity: 2000, used: 480 },
  { id: "wh-5", name: "Solvent Store", type: "Raw Material", location: "Plant 1, Hazardous Block", manager: "Mostafa Salah", tempRange: "15-25°C", capacity: 12000, used: 8500 },
];

/* ─── Batch Tracking Types & Seed Data ──────────────────────────── */

type BatchStatus = "Active" | "Quarantine" | "Expired" | "Recalled";

interface BatchRecord {
  id: string;
  batchNo: string;
  product: string;
  productCode: string;
  manufactureDate: string;
  expiryDate: string;
  quantity: number;
  unit: string;
  location: string;
  status: BatchStatus;
  poRef: string;
  soRefs: string[];
  pickPriority: "FIFO" | "FEFO";
}

const SEED_BATCHES: BatchRecord[] = [
  { id: "bt-1", batchNo: "B-2026-441", product: "Paracetamol 500mg Tablets", productCode: "FG-PARA500-T", manufactureDate: "2026-03-12", expiryDate: "2029-03-11", quantity: 4200, unit: "boxes", location: "FG Warehouse - Cairo", status: "Active", poRef: "PO-2026-0112", soRefs: ["SO-2026-0201", "SO-2026-0218"], pickPriority: "FEFO" },
  { id: "bt-2", batchNo: "B-2026-438", product: "Amoxicillin 250mg Capsules", productCode: "FG-AMOX250-C", manufactureDate: "2026-03-05", expiryDate: "2028-03-04", quantity: 2800, unit: "boxes", location: "FG Warehouse - Cairo", status: "Active", poRef: "PO-2026-0098", soRefs: ["SO-2026-0195"], pickPriority: "FEFO" },
  { id: "bt-3", batchNo: "B-2026-445", product: "Omeprazole 20mg Capsules", productCode: "FG-OMEZ20-C", manufactureDate: "2026-03-22", expiryDate: "2028-03-21", quantity: 1650, unit: "boxes", location: "FG Warehouse - Cairo", status: "Quarantine", poRef: "PO-2026-0134", soRefs: [], pickPriority: "FEFO" },
  { id: "bt-4", batchNo: "B-2025-312", product: "Insulin Glargine 100 IU/mL", productCode: "FG-INSU-INJ", manufactureDate: "2025-08-15", expiryDate: "2026-06-14", quantity: 320, unit: "vials", location: "Cold Storage - Cairo", status: "Active", poRef: "PO-2025-0287", soRefs: ["SO-2026-0044", "SO-2026-0089", "SO-2026-0156"], pickPriority: "FEFO" },
  { id: "bt-5", batchNo: "B-2025-290", product: "Cough Suppressant Syrup 100mg/5mL", productCode: "FG-COUGH-SYR", manufactureDate: "2025-06-10", expiryDate: "2026-06-09", quantity: 580, unit: "bottles", location: "FG Warehouse - Cairo", status: "Active", poRef: "PO-2025-0261", soRefs: ["SO-2026-0033"], pickPriority: "FEFO" },
  { id: "bt-6", batchNo: "B-2024-198", product: "Vitamin C Effervescent 1000mg", productCode: "FG-VITC-EFF", manufactureDate: "2024-07-20", expiryDate: "2026-07-19", quantity: 890, unit: "tubes", location: "FG Warehouse - Cairo", status: "Active", poRef: "PO-2024-0175", soRefs: ["SO-2025-0412", "SO-2026-0011"], pickPriority: "FIFO" },
  { id: "bt-7", batchNo: "B-2024-155", product: "Hydrocortisone Cream 1%", productCode: "FG-HYDRO-CR", manufactureDate: "2024-04-05", expiryDate: "2026-04-04", quantity: 0, unit: "tubes", location: "FG Warehouse - Cairo", status: "Expired", poRef: "PO-2024-0140", soRefs: ["SO-2024-0320", "SO-2025-0045"], pickPriority: "FEFO" },
  { id: "bt-8", batchNo: "SP-PA-24091", product: "Paracetamol API", productCode: "API-PARA-500", manufactureDate: "2024-09-12", expiryDate: "2027-09-11", quantity: 2400, unit: "kg", location: "RM Warehouse - Cairo", status: "Active", poRef: "PO-2024-0389", soRefs: [], pickPriority: "FIFO" },
  { id: "bt-9", batchNo: "B-2025-410", product: "Amoxicillin 250mg Capsules", productCode: "FG-AMOX250-C", manufactureDate: "2025-11-18", expiryDate: "2027-11-17", quantity: 1200, unit: "boxes", location: "FG Warehouse - Cairo", status: "Active", poRef: "PO-2025-0378", soRefs: ["SO-2026-0165"], pickPriority: "FEFO" },
  { id: "bt-10", batchNo: "B-2025-388", product: "Paracetamol 500mg Tablets", productCode: "FG-PARA500-T", manufactureDate: "2025-10-01", expiryDate: "2026-05-30", quantity: 150, unit: "boxes", location: "Quarantine Area", status: "Recalled", poRef: "PO-2025-0355", soRefs: ["SO-2025-0401"], pickPriority: "FEFO" },
];

/* ─── Demand Forecasting Types & Seed Data ─────────────────────── */

type TrendDirection = "up" | "down" | "stable";

interface ForecastRecord {
  id: string;
  product: string;
  productCode: string;
  salesMonth1: number;
  salesMonth2: number;
  salesMonth3: number;
  avgMonthlySales: number;
  trend: TrendDirection;
  forecastNextMonth: number;
  reorderPoint: number;
  currentStock: number;
  safetyStock: number;
  suggestedOrderQty: number;
  seasonalFactor: "Peak" | "Normal" | "Low";
  unit: string;
}

function computeForecasts(): ForecastRecord[] {
  const products = [
    { id: "fc-1", product: "Paracetamol 500mg Tablets", productCode: "FG-PARA500-T", salesMonth1: 1100, salesMonth2: 1250, salesMonth3: 1400, reorderPoint: 800, currentStock: 4200, safetyStock: 400, seasonalFactor: "Peak" as const, unit: "boxes" },
    { id: "fc-2", product: "Amoxicillin 250mg Capsules", productCode: "FG-AMOX250-C", salesMonth1: 850, salesMonth2: 820, salesMonth3: 880, reorderPoint: 600, currentStock: 4000, safetyStock: 300, seasonalFactor: "Normal" as const, unit: "boxes" },
    { id: "fc-3", product: "Omeprazole 20mg Capsules", productCode: "FG-OMEZ20-C", salesMonth1: 620, salesMonth2: 580, salesMonth3: 540, reorderPoint: 500, currentStock: 1650, safetyStock: 250, seasonalFactor: "Low" as const, unit: "boxes" },
    { id: "fc-4", product: "Insulin Glargine 100 IU/mL", productCode: "FG-INSU-INJ", salesMonth1: 180, salesMonth2: 195, salesMonth3: 210, reorderPoint: 200, currentStock: 720, safetyStock: 100, seasonalFactor: "Normal" as const, unit: "vials" },
    { id: "fc-5", product: "Cough Suppressant Syrup", productCode: "FG-COUGH-SYR", salesMonth1: 420, salesMonth2: 680, salesMonth3: 950, reorderPoint: 500, currentStock: 3100, safetyStock: 250, seasonalFactor: "Peak" as const, unit: "bottles" },
    { id: "fc-6", product: "Vitamin C Effervescent 1000mg", productCode: "FG-VITC-EFF", salesMonth1: 780, salesMonth2: 920, salesMonth3: 1050, reorderPoint: 700, currentStock: 5400, safetyStock: 350, seasonalFactor: "Peak" as const, unit: "tubes" },
    { id: "fc-7", product: "Hydrocortisone Cream 1%", productCode: "FG-HYDRO-CR", salesMonth1: 310, salesMonth2: 290, salesMonth3: 305, reorderPoint: 250, currentStock: 1240, safetyStock: 125, seasonalFactor: "Normal" as const, unit: "tubes" },
    { id: "fc-8", product: "Paracetamol API (Raw)", productCode: "API-PARA-500", salesMonth1: 600, salesMonth2: 650, salesMonth3: 700, reorderPoint: 500, currentStock: 2400, safetyStock: 250, seasonalFactor: "Normal" as const, unit: "kg" },
  ];

  return products.map((p) => {
    const avg = Math.round((p.salesMonth1 + p.salesMonth2 + p.salesMonth3) / 3);
    const trend: TrendDirection = p.salesMonth3 > p.salesMonth1 * 1.05 ? "up" : p.salesMonth3 < p.salesMonth1 * 0.95 ? "down" : "stable";
    const seasonMultiplier = p.seasonalFactor === "Peak" ? 1.15 : p.seasonalFactor === "Low" ? 0.85 : 1.0;
    const forecast = Math.round(avg * seasonMultiplier);
    const suggestedQty = Math.max(0, forecast + p.safetyStock - p.currentStock + p.reorderPoint);
    return { ...p, avgMonthlySales: avg, trend, forecastNextMonth: forecast, suggestedOrderQty: suggestedQty };
  });
}

const SEED_FORECASTS: ForecastRecord[] = computeForecasts();

type Tab = "raw" | "finished" | "warehouses" | "catalog" | "batches" | "forecasting";

/* ─── Component ──────────────────────────────────────────────────── */

export default function InventoryPage() {
  const { config } = useAppConfig();
  const store = useDataStore();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("raw");

  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>(SEED_RM);
  const [finishedProducts, setFinishedProducts] = useState<FinishedProduct[]>(SEED_FP);
  const [warehouses, setWarehouses] = useState<WarehouseRec[]>(SEED_WH);
  const [batches, setBatches] = useState<BatchRecord[]>(SEED_BATCHES);
  const [forecasts] = useState<ForecastRecord[]>(SEED_FORECASTS);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({});

  const [rmFormOpen, setRmFormOpen] = useState(false);
  const [editingRm, setEditingRm] = useState<RawMaterial | null>(null);
  const [fpFormOpen, setFpFormOpen] = useState(false);
  const [editingFp, setEditingFp] = useState<FinishedProduct | null>(null);
  const [whFormOpen, setWhFormOpen] = useState(false);
  const [editingWh, setEditingWh] = useState<WarehouseRec | null>(null);

  const [detailRM, setDetailRM] = useState<RawMaterial | null>(null);
  const [detailFP, setDetailFP] = useState<FinishedProduct | null>(null);
  const [detailWH, setDetailWH] = useState<WarehouseRec | null>(null);
  const [detailBatch, setDetailBatch] = useState<BatchRecord | null>(null);

  // Auto-reorder PO suggestions state
  const [showPOSuggestions, setShowPOSuggestions] = useState(false);

  /* ─── Notification & Audit Logger ─── */
  let addNotification: any = () => {};
  let logAction: any = () => {};
  try {
    const nc = useNotificationCenter();
    addNotification = nc.addNotification;
  } catch {}
  try {
    const al = useAuditLogger();
    logAction = al.logAction;
  } catch {}

  /* ─── On-mount checks: low stock alerts, expiry alerts ─── */
  const mountCheckedRef = useRef(false);
  useEffect(() => {
    if (mountCheckedRef.current) return;
    mountCheckedRef.current = true;

    // Low stock auto-alert for raw materials
    rawMaterials.forEach((rm) => {
      if (rm.quantityKg < rm.reorderLevel) {
        addNotification({
          type: "WARNING",
          title: `Low stock: ${rm.name}`,
          message: `${rm.name} - ${rm.quantityKg} kg remaining (reorder level: ${rm.reorderLevel} kg)`,
          module: "INVENTORY",
          entityType: "raw_material",
          entityId: rm.id,
          actionUrl: "/erp/inventory",
        });
      }
    });

    // Low stock auto-alert for finished products (using forecasting reorder points)
    SEED_FORECASTS.forEach((fc) => {
      if (fc.currentStock <= fc.reorderPoint) {
        addNotification({
          type: "WARNING",
          title: `Low stock: ${fc.product}`,
          message: `${fc.product} - ${fc.currentStock} ${fc.unit} remaining (reorder level: ${fc.reorderPoint})`,
          module: "INVENTORY",
          entityType: "product",
          entityId: fc.productCode,
          actionUrl: "/erp/inventory",
        });
      }
    });

    // Expiry alerts for batches expiring within 90 days
    const now = new Date();
    batches.forEach((b) => {
      if (b.status !== "Active") return;
      const exp = new Date(b.expiryDate);
      const days = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
      if (days > 0 && days <= 90) {
        addNotification({
          type: "WARNING",
          title: `Expiry alert: ${b.product} batch ${b.batchNo}`,
          message: `Batch ${b.batchNo} of ${b.product} expires in ${days} days (${b.expiryDate}). ${b.quantity} ${b.unit} remaining.`,
          module: "INVENTORY",
          entityType: "batch",
          entityId: b.id,
          actionUrl: "/erp/inventory",
        });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Product catalog category filter
  const [catalogFilter, setCatalogFilter] = useState<"all" | "raw" | "finished">("all");

  // Batch expiry alert filter
  const [expiryAlertDays, setExpiryAlertDays] = useState<number>(90);

  let _nxt = Date.now();
  const genId = (p: string) => `${p}-${(_nxt++).toString(36).slice(-6)}`;

  const fmt = (n: number) => `EGP ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const warehouseNames = warehouses.map((w) => w.name);

  /* ─── Filtered ─── */
  const filteredRM = useMemo(() => {
    return rawMaterials.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        if (!r.name.toLowerCase().includes(q) && !r.code.toLowerCase().includes(q) && !r.supplier.toLowerCase().includes(q)) return false;
      }
      if (filters.type && r.type !== filters.type) return false;
      if (filters.qcStatus && r.qcStatus !== filters.qcStatus) return false;
      if (filters.warehouse && r.warehouse !== filters.warehouse) return false;
      return true;
    });
  }, [rawMaterials, search, filters]);

  const filteredFP = useMemo(() => {
    return finishedProducts.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q) && !p.strength.toLowerCase().includes(q)) return false;
      }
      if (filters.form && p.form !== filters.form) return false;
      if (filters.warehouse && p.warehouse !== filters.warehouse) return false;
      return true;
    });
  }, [finishedProducts, search, filters]);

  /* ─── Batch Filtering ─── */
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      if (search) {
        const q = search.toLowerCase();
        if (!b.batchNo.toLowerCase().includes(q) && !b.product.toLowerCase().includes(q) && !b.location.toLowerCase().includes(q)) return false;
      }
      if (filters.status && b.status !== filters.status) return false;
      if (filters.location && b.location !== filters.location) return false;
      return true;
    });
  }, [batches, search, filters]);

  const getDaysUntilExpiry = (expiryDate: string) => {
    const now = new Date();
    const exp = new Date(expiryDate);
    return Math.ceil((exp.getTime() - now.getTime()) / 86400000);
  };

  const getExpiryAlertColor = (days: number) => {
    if (days <= 0) return "text-red-700 bg-red-50";
    if (days <= 30) return "text-red-600 bg-red-50";
    if (days <= 60) return "text-orange-600 bg-orange-50";
    if (days <= 90) return "text-amber-600 bg-amber-50";
    return "";
  };

  const nearExpiryBatches = useMemo(() => {
    return batches.filter((b) => {
      const days = getDaysUntilExpiry(b.expiryDate);
      return days > 0 && days <= expiryAlertDays && b.status === "Active";
    });
  }, [batches, expiryAlertDays]);

  const handleBatchStatusChange = (batchId: string, newStatus: BatchStatus) => {
    const batch = batches.find((b) => b.id === batchId);
    const oldStatus = batch?.status;
    setBatches((prev) => prev.map((b) => b.id === batchId ? { ...b, status: newStatus } : b));
    if (batch) {
      logAction({
        userId: "u-admin", userName: "Admin User", userRole: "ADMIN",
        action: "UPDATE", module: "ERP", entity: "Batch",
        entityId: batchId, entityName: `Batch ${batch.batchNo}`,
        details: `Batch status change: ${batch.batchNo} (${batch.product}) ${oldStatus} -> ${newStatus}`,
        oldValues: { status: oldStatus },
        newValues: { status: newStatus },
      });
    }
  };

  /* ─── Forecast Filtering ─── */
  const filteredForecasts = useMemo(() => {
    if (!search) return forecasts;
    const q = search.toLowerCase();
    return forecasts.filter((f) => f.product.toLowerCase().includes(q) || f.productCode.toLowerCase().includes(q));
  }, [forecasts, search]);

  const reorderAlerts = useMemo(() => {
    return forecasts.filter((f) => f.currentStock <= f.reorderPoint);
  }, [forecasts]);

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    const rmValue = rawMaterials.reduce((s, r) => s + r.quantityKg * r.unitCost, 0);
    const fgValue = finishedProducts.reduce((s, p) => s + p.quantity * p.unitPrice, 0);
    const lowStock = rawMaterials.filter((r) => r.quantityKg <= r.reorderLevel).length;
    const now = new Date();
    const alertDays = config.inventory.expiryAlertDays;
    const expiringSoon = [...rawMaterials, ...finishedProducts].filter((item) => {
      const exp = new Date("expiryDate" in item ? item.expiryDate : "");
      const days = (exp.getTime() - now.getTime()) / 86400000;
      return days > 0 && days < alertDays;
    }).length;
    return { rmValue, fgValue, lowStock, expiringSoon };
  }, [rawMaterials, finishedProducts, config]);

  /* ─── Catalog Product Classification (Raw vs Finished) ─── */
  const catalogClassification = useMemo(() => {
    const conversionFormulas = store.conversionFormulas;
    // Raw material IDs: products used as ingredients in conversion formulas, or products with form "Drops"
    const ingredientIds = new Set<string>();
    const outputIds = new Set<string>();
    conversionFormulas.forEach((f) => {
      outputIds.add(f.productId);
      f.ingredients.forEach((ing) => ingredientIds.add(ing.rawMaterialId));
    });

    const rawProducts = store.products.filter((p) =>
      p.form === "Drops" || ingredientIds.has(p.id)
    );
    const finishedProds = store.products.filter((p) =>
      outputIds.has(p.id) || (!ingredientIds.has(p.id) && p.form !== "Drops")
    );

    return { rawProducts, finishedProds, ingredientIds, outputIds };
  }, [store.products, store.conversionFormulas]);

  const filteredCatalogProducts = useMemo(() => {
    const { rawProducts, finishedProds } = catalogClassification;
    const source = catalogFilter === "raw" ? rawProducts : catalogFilter === "finished" ? finishedProds : store.products;
    if (!search) return source;
    const q = search.toLowerCase();
    return source.filter((p) =>
      p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.therapeuticArea.toLowerCase().includes(q)
    );
  }, [store.products, catalogClassification, catalogFilter, search]);

  const catalogTotals = useMemo(() => {
    const { rawProducts, finishedProds } = catalogClassification;
    const rawValue = rawProducts.reduce((s, p) => s + p.stockQty * p.pricePerUnit, 0);
    const finishedValue = finishedProds.reduce((s, p) => s + p.stockQty * p.pricePerUnit, 0);
    return { rawCount: rawProducts.length, finishedCount: finishedProds.length, rawValue, finishedValue };
  }, [catalogClassification]);

  /* ─── RM CRUD ─── */
  const rmFields: EntityField[] = [
    { name: "code", label: "Code", type: "text", required: true, placeholder: "API-XXX-000" },
    { name: "name", label: "Material Name", type: "text", required: true },
    { name: "type", label: "Type", type: "select", required: true, options: [{ label: "API", value: "API" }, { label: "Excipient", value: "Excipient" }, { label: "Solvent", value: "Solvent" }, { label: "Reagent", value: "Reagent" }] },
    { name: "supplier", label: "Supplier", type: "text", required: true },
    { name: "batchNo", label: "Batch No.", type: "text", required: true },
    { name: "manufactureDate", label: "Manufacture Date", type: "date", required: true },
    { name: "expiryDate", label: "Expiry Date", type: "date", required: true },
    { name: "quantityKg", label: "Quantity (kg)", type: "number", required: true },
    { name: "reorderLevel", label: "Reorder Level (kg)", type: "number", required: true },
    { name: "unitCost", label: "Unit Cost (EGP/kg)", type: "number", required: true },
    { name: "storageCondition", label: "Storage", type: "select", required: true, options: [{ label: "2-8°C", value: "2-8°C" }, { label: "15-25°C", value: "15-25°C" }, { label: "Below 30°C", value: "Below 30°C" }, { label: "Controlled", value: "Controlled" }] },
    { name: "pharmacopoeial", label: "Pharmacopoeia", type: "select", required: true, options: [{ label: "USP", value: "USP" }, { label: "BP", value: "BP" }, { label: "EP", value: "EP" }, { label: "JP", value: "JP" }] },
    { name: "qcStatus", label: "QC Status", type: "select", required: true, options: [{ label: "Quarantine", value: "Quarantine" }, { label: "Approved", value: "Approved" }, { label: "Rejected", value: "Rejected" }] },
    { name: "warehouse", label: "Warehouse", type: "select", required: true, options: warehouseNames.map((w) => ({ label: w, value: w })) },
  ];

  function handleCreateRM() { setEditingRm(null); setRmFormOpen(true); }
  function handleEditRM(r: RawMaterial) { setEditingRm(r); setRmFormOpen(true); }
  function handleRMSubmit(data: EntityFormData) {
    const payload: Omit<RawMaterial, "id"> = {
      code: String(data.code), name: String(data.name), type: data.type as RawMaterial["type"],
      supplier: String(data.supplier), batchNo: String(data.batchNo),
      manufactureDate: String(data.manufactureDate), expiryDate: String(data.expiryDate),
      quantityKg: Number(data.quantityKg), reorderLevel: Number(data.reorderLevel),
      unitCost: Number(data.unitCost), storageCondition: data.storageCondition as RawMaterial["storageCondition"],
      pharmacopoeial: data.pharmacopoeial as RawMaterial["pharmacopoeial"],
      qcStatus: data.qcStatus as RawMaterial["qcStatus"], warehouse: String(data.warehouse),
    };
    if (editingRm) {
      const oldQty = editingRm.quantityKg;
      setRawMaterials((prev) => prev.map((r) => r.id === editingRm.id ? { ...r, ...payload } : r));
      logAction({
        userId: "u-admin", userName: "Admin User", userRole: "ADMIN",
        action: "UPDATE", module: "ERP", entity: "RawMaterial",
        entityId: editingRm.id, entityName: payload.name,
        details: `Stock movement ADJUSTMENT: ${editingRm.name} qty ${oldQty} -> ${payload.quantityKg} kg`,
        oldValues: { quantityKg: oldQty },
        newValues: { quantityKg: payload.quantityKg },
      });
    } else {
      const newId = genId("rm");
      setRawMaterials((prev) => [...prev, { id: newId, ...payload }]);
      logAction({
        userId: "u-admin", userName: "Admin User", userRole: "ADMIN",
        action: "CREATE", module: "ERP", entity: "RawMaterial",
        entityId: newId, entityName: payload.name,
        details: `Stock movement IN: Added ${payload.name} - ${payload.quantityKg} kg`,
        newValues: { quantityKg: payload.quantityKg, warehouse: payload.warehouse },
      });
    }
    setRmFormOpen(false); setEditingRm(null);
  }
  function handleDeleteRM(r: RawMaterial) {
    setRawMaterials((prev) => prev.filter((x) => x.id !== r.id));
    logAction({
      userId: "u-admin", userName: "Admin User", userRole: "ADMIN",
      action: "DELETE", module: "ERP", entity: "RawMaterial",
      entityId: r.id, entityName: r.name,
      details: `Stock movement OUT: Removed ${r.name} - ${r.quantityKg} kg from ${r.warehouse}`,
      oldValues: { quantityKg: r.quantityKg, warehouse: r.warehouse },
    });
  }

  /* ─── FP CRUD ─── */
  const fpFields: EntityField[] = [
    { name: "code", label: "Code", type: "text", required: true },
    { name: "name", label: "Product Name", type: "text", required: true },
    { name: "strength", label: "Strength", type: "text", required: true },
    { name: "form", label: "Form", type: "select", required: true, options: [{ label: "Tablet", value: "Tablet" }, { label: "Capsule", value: "Capsule" }, { label: "Syrup", value: "Syrup" }, { label: "Injection", value: "Injection" }, { label: "Cream", value: "Cream" }, { label: "Suspension", value: "Suspension" }] },
    { name: "registration", label: "EDA Registration", type: "text", required: true },
    { name: "batchNo", label: "Batch No.", type: "text", required: true },
    { name: "manufactureDate", label: "Manufacture Date", type: "date", required: true },
    { name: "expiryDate", label: "Expiry Date", type: "date", required: true },
    { name: "quantity", label: "Quantity", type: "number", required: true },
    { name: "unit", label: "Unit", type: "text", required: true, defaultValue: "boxes" },
    { name: "packSize", label: "Pack Size", type: "text", required: true },
    { name: "unitPrice", label: "Unit Price (EGP)", type: "number", required: true },
    { name: "storageCondition", label: "Storage", type: "select", required: true, options: [{ label: "2-8°C", value: "2-8°C" }, { label: "15-25°C", value: "15-25°C" }, { label: "Below 30°C", value: "Below 30°C" }] },
    { name: "warehouse", label: "Warehouse", type: "select", required: true, options: warehouseNames.map((w) => ({ label: w, value: w })) },
    { name: "qcReleased", label: "QC Released", type: "checkbox" },
  ];

  function handleCreateFP() { setEditingFp(null); setFpFormOpen(true); }
  function handleEditFP(p: FinishedProduct) { setEditingFp(p); setFpFormOpen(true); }
  function handleFPSubmit(data: EntityFormData) {
    const payload: Omit<FinishedProduct, "id"> = {
      code: String(data.code), name: String(data.name), strength: String(data.strength),
      form: data.form as FinishedProduct["form"], registration: String(data.registration),
      batchNo: String(data.batchNo), manufactureDate: String(data.manufactureDate),
      expiryDate: String(data.expiryDate), quantity: Number(data.quantity),
      unit: String(data.unit || "boxes"), packSize: String(data.packSize),
      unitPrice: Number(data.unitPrice), storageCondition: data.storageCondition as FinishedProduct["storageCondition"],
      warehouse: String(data.warehouse), qcReleased: Boolean(data.qcReleased),
    };
    if (editingFp) {
      const oldQty = editingFp.quantity;
      setFinishedProducts((prev) => prev.map((p) => p.id === editingFp.id ? { ...p, ...payload } : p));
      logAction({
        userId: "u-admin", userName: "Admin User", userRole: "ADMIN",
        action: "UPDATE", module: "ERP", entity: "FinishedProduct",
        entityId: editingFp.id, entityName: `${payload.name} ${payload.strength}`,
        details: `Stock movement ADJUSTMENT: ${editingFp.name} ${editingFp.strength} qty ${oldQty} -> ${payload.quantity} ${payload.unit}`,
        oldValues: { quantity: oldQty },
        newValues: { quantity: payload.quantity },
      });
    } else {
      const newId = genId("fp");
      setFinishedProducts((prev) => [...prev, { id: newId, ...payload }]);
      logAction({
        userId: "u-admin", userName: "Admin User", userRole: "ADMIN",
        action: "CREATE", module: "ERP", entity: "FinishedProduct",
        entityId: newId, entityName: `${payload.name} ${payload.strength}`,
        details: `Stock movement IN: Added ${payload.name} ${payload.strength} - ${payload.quantity} ${payload.unit}`,
        newValues: { quantity: payload.quantity, warehouse: payload.warehouse },
      });
    }
    setFpFormOpen(false); setEditingFp(null);
  }
  function handleDeleteFP(p: FinishedProduct) {
    setFinishedProducts((prev) => prev.filter((x) => x.id !== p.id));
    logAction({
      userId: "u-admin", userName: "Admin User", userRole: "ADMIN",
      action: "DELETE", module: "ERP", entity: "FinishedProduct",
      entityId: p.id, entityName: `${p.name} ${p.strength}`,
      details: `Stock movement OUT: Removed ${p.name} ${p.strength} - ${p.quantity} ${p.unit} from ${p.warehouse}`,
      oldValues: { quantity: p.quantity, warehouse: p.warehouse },
    });
  }

  /* ─── Warehouse CRUD ─── */
  const whFields: EntityField[] = [
    { name: "name", label: "Warehouse Name", type: "text", required: true },
    { name: "type", label: "Type", type: "select", required: true, options: [{ label: "Raw Material", value: "Raw Material" }, { label: "Finished Goods", value: "Finished Goods" }, { label: "Cold Chain", value: "Cold Chain" }, { label: "Quarantine", value: "Quarantine" }] },
    { name: "location", label: "Location", type: "text", required: true },
    { name: "manager", label: "Manager", type: "text", required: true },
    { name: "tempRange", label: "Temp Range", type: "text", required: true, placeholder: "e.g. 2-8°C" },
    { name: "capacity", label: "Capacity (units)", type: "number", required: true },
    { name: "used", label: "Used (units)", type: "number", required: true, defaultValue: 0 },
  ];

  function handleCreateWH() { setEditingWh(null); setWhFormOpen(true); }
  function handleEditWH(w: WarehouseRec) { setEditingWh(w); setWhFormOpen(true); }
  function handleWHSubmit(data: EntityFormData) {
    const payload: Omit<WarehouseRec, "id"> = {
      name: String(data.name), type: data.type as WarehouseRec["type"],
      location: String(data.location), manager: String(data.manager),
      tempRange: String(data.tempRange), capacity: Number(data.capacity), used: Number(data.used) || 0,
    };
    if (editingWh) {
      setWarehouses((prev) => prev.map((w) => w.id === editingWh.id ? { ...w, ...payload } : w));
      logAction({
        userId: "u-admin", userName: "Admin User", userRole: "ADMIN",
        action: "UPDATE", module: "ERP", entity: "Warehouse",
        entityId: editingWh.id, entityName: payload.name,
        details: `Warehouse updated: ${payload.name}`,
        oldValues: { capacity: editingWh.capacity, used: editingWh.used },
        newValues: { capacity: payload.capacity, used: payload.used },
      });
    } else {
      const newId = genId("wh");
      setWarehouses((prev) => [...prev, { id: newId, ...payload }]);
      logAction({
        userId: "u-admin", userName: "Admin User", userRole: "ADMIN",
        action: "CREATE", module: "ERP", entity: "Warehouse",
        entityId: newId, entityName: payload.name,
        details: `Warehouse created: ${payload.name} (${payload.type}) at ${payload.location}`,
        newValues: { type: payload.type, capacity: payload.capacity },
      });
    }
    setWhFormOpen(false); setEditingWh(null);
  }
  function handleDeleteWH(w: WarehouseRec) {
    setWarehouses((prev) => prev.filter((x) => x.id !== w.id));
    logAction({
      userId: "u-admin", userName: "Admin User", userRole: "ADMIN",
      action: "DELETE", module: "ERP", entity: "Warehouse",
      entityId: w.id, entityName: w.name,
      details: `Warehouse deleted: ${w.name}`,
      oldValues: { type: w.type, location: w.location },
    });
  }

  function handleAdd() {
    if (tab === "raw") handleCreateRM();
    else if (tab === "finished") handleCreateFP();
    else if (tab === "warehouses") handleCreateWH();
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={t("inv.title")}
        description={t("inv.manageInventory")}
        actions={
          <>
            <Button variant="outline" onClick={() =>
              tab === "raw" ? downloadCSV("raw-materials.csv", rawMaterials as unknown as Record<string, unknown>[])
              : tab === "finished" ? downloadCSV("finished-products.csv", finishedProducts as unknown as Record<string, unknown>[])
              : tab === "catalog" ? downloadCSV("catalog-products.csv", filteredCatalogProducts as unknown as Record<string, unknown>[])
              : tab === "batches" ? downloadCSV("batch-tracking.csv", batches as unknown as Record<string, unknown>[])
              : tab === "forecasting" ? downloadCSV("demand-forecasts.csv", forecasts as unknown as Record<string, unknown>[])
              : downloadCSV("warehouses.csv", warehouses as unknown as Record<string, unknown>[])
            }>
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
            {tab !== "catalog" && tab !== "batches" && tab !== "forecasting" && (
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" /> Add {tab === "raw" ? "Material" : tab === "finished" ? "Product" : "Warehouse"}
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard title={t("inv.totalProducts")} value={fmt(stats.rmValue)} subtitle={`${rawMaterials.length} active SKUs`} icon={<FlaskConical className="h-5 w-5" />} iconColor="bg-purple-100 text-purple-700" />
        <StatsCard title="Finished Goods Value" value={fmt(stats.fgValue)} subtitle={`${finishedProducts.length} active SKUs`} icon={<Pill className="h-5 w-5" />} iconColor="bg-emerald-100 text-emerald-700" />
        <StatsCard title={t("inv.catalogProducts")} value={store.products.length.toLocaleString()} subtitle={`${new Set(store.products.map((p) => p.therapeuticArea)).size} therapeutic areas`} icon={<BookOpen className="h-5 w-5" />} iconColor="bg-blue-100 text-blue-700" />
        <StatsCard title={t("inv.lowStock")} value={stats.lowStock.toLocaleString()} subtitle="RM at/below reorder level" icon={<AlertTriangle className="h-5 w-5" />} iconColor="bg-amber-100 text-amber-700" />
        <StatsCard title={t("inv.expiringSoon")} value={stats.expiringSoon.toLocaleString()} subtitle={`Within ${config.inventory.expiryAlertDays} days`} icon={<Thermometer className="h-5 w-5" />} iconColor="bg-red-100 text-red-700" />
      </div>

      <div className="border-b border-border">
        <nav className="flex gap-1 -mb-px">
          {([
            { key: "raw" as Tab, label: t("inv.rawMaterials"), icon: FlaskConical },
            { key: "finished" as Tab, label: "Finished Products", icon: Pill },
            { key: "catalog" as Tab, label: `Product Catalog (${store.products.length})`, icon: BookOpen },
            { key: "warehouses" as Tab, label: t("inv.warehouses"), icon: Warehouse },
            { key: "batches" as Tab, label: `Batch Tracking (${batches.length})`, icon: Layers },
            { key: "forecasting" as Tab, label: "Forecasting", icon: BarChart3 },
          ]).map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.key} onClick={() => { setTab(item.key); setSearch(""); setFilters({}); }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === item.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`}>
                <Icon className="h-4 w-4" />{item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Raw Materials ── */}
      {tab === "raw" && (
        <>
          <FilterBar searchPlaceholder="Search by name, code, or supplier..." searchValue={search} onSearchChange={setSearch}
            fields={[
              { key: "type", label: "Type", type: "select", options: [{ label: "API", value: "API" }, { label: "Excipient", value: "Excipient" }, { label: "Solvent", value: "Solvent" }, { label: "Reagent", value: "Reagent" }] },
              { key: "qcStatus", label: "QC Status", type: "select", options: [{ label: "Approved", value: "Approved" }, { label: "Quarantine", value: "Quarantine" }, { label: "Rejected", value: "Rejected" }] },
              { key: "warehouse", label: "Warehouse", type: "select", options: warehouseNames.map((w) => ({ label: w, value: w })) },
            ]}
            values={filters} onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))} />
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <DataTable
                columns={[
                  { key: "code", label: "Code", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
                  { key: "name", label: "Material", render: (v) => <span className="font-medium">{v as string}</span> },
                  { key: "type", label: "Type", render: (v) => <Badge variant="secondary">{v as string}</Badge> },
                  { key: "supplier", label: "Supplier", className: "text-muted-foreground" },
                  { key: "batchNo", label: "Batch / Expiry", render: (_v, row) => {
                    const r = row as unknown as RawMaterial;
                    return (<div><div className="font-mono text-xs">{r.batchNo}</div><div className="text-[11px] text-muted-foreground">exp {r.expiryDate}</div></div>);
                  }},
                  { key: "quantityKg", label: "Qty (kg)", className: "text-right", render: (_v, row) => {
                    const r = row as unknown as RawMaterial;
                    const isLow = r.quantityKg <= r.reorderLevel;
                    return (
                      <div className={`font-medium ${isLow ? "text-red-600" : ""}`}>
                        {r.quantityKg.toLocaleString()}
                        {isLow && <div className="text-[10px] text-red-500">below reorder</div>}
                      </div>
                    );
                  }},
                  { key: "storageCondition", label: "Storage", className: "text-xs" },
                  { key: "qcStatus", label: "QC", render: (v) => <Badge variant={(v as string) === "Approved" ? "success" : (v as string) === "Rejected" ? "destructive" : "warning"}>{v as string}</Badge> },
                  { key: "id", label: "Actions", className: "text-right", render: (_v, row) => {
                    const r = row as unknown as RawMaterial;
                    return (<EditDeleteMenu onEdit={() => handleEditRM(r)} onDelete={() => handleDeleteRM(r)} onView={() => setDetailRM(r)} canView itemLabel={r.name} compact />);
                  }},
                ] satisfies Column<Record<string, unknown>>[]}
                data={filteredRM as unknown as Record<string, unknown>[]}
                onRowClick={(row) => setDetailRM(row as unknown as RawMaterial)}
                exportable exportFilename="erp-inventory.csv" emptyMessage="No raw materials match your filters."
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Finished Products ── */}
      {tab === "finished" && (
        <>
          <FilterBar searchPlaceholder="Search by name, code, or strength..." searchValue={search} onSearchChange={setSearch}
            fields={[
              { key: "form", label: "Form", type: "select", options: [{ label: "Tablet", value: "Tablet" }, { label: "Capsule", value: "Capsule" }, { label: "Syrup", value: "Syrup" }, { label: "Injection", value: "Injection" }, { label: "Cream", value: "Cream" }, { label: "Suspension", value: "Suspension" }] },
              { key: "warehouse", label: "Warehouse", type: "select", options: warehouseNames.map((w) => ({ label: w, value: w })) },
            ]}
            values={filters} onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))} />
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <DataTable
                columns={[
                  { key: "code", label: "Code", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
                  { key: "name", label: "Product", render: (_v, row) => {
                    const p = row as unknown as FinishedProduct;
                    return (<div><div className="font-medium">{p.name} {p.strength}</div><div className="text-[11px] text-muted-foreground">{p.packSize}</div></div>);
                  }},
                  { key: "form", label: "Form", render: (v) => <Badge variant="secondary">{v as string}</Badge> },
                  { key: "registration", label: "EDA Reg.", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
                  { key: "batchNo", label: "Batch", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
                  { key: "expiryDate", label: "Expiry", className: "text-xs" },
                  { key: "quantity", label: "Qty", className: "text-right", render: (_v, row) => {
                    const p = row as unknown as FinishedProduct;
                    return <>{p.quantity.toLocaleString()} {p.unit}</>;
                  }},
                  { key: "unitPrice", label: "Price", className: "text-right", render: (v) => <span className="font-medium">{fmt(v as number)}</span> },
                  { key: "qcReleased", label: "Released", render: (v) => <Badge variant={(v as boolean) ? "success" : "warning"}>{(v as boolean) ? "Released" : "Pending QC"}</Badge> },
                  { key: "id", label: "Actions", className: "text-right", render: (_v, row) => {
                    const p = row as unknown as FinishedProduct;
                    return (<EditDeleteMenu onEdit={() => handleEditFP(p)} onDelete={() => handleDeleteFP(p)} onView={() => setDetailFP(p)} canView itemLabel={p.name} compact />);
                  }},
                ] satisfies Column<Record<string, unknown>>[]}
                data={filteredFP as unknown as Record<string, unknown>[]}
                onRowClick={(row) => setDetailFP(row as unknown as FinishedProduct)}
                exportable exportFilename="erp-inventory.csv" emptyMessage="No finished products match your filters."
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Catalog Products (Raw vs Finished Classification) ── */}
      {tab === "catalog" && (
        <>
          {/* Category totals */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className={`cursor-pointer transition-shadow ${catalogFilter === "all" ? "ring-2 ring-primary" : "hover:shadow-md"}`} onClick={() => setCatalogFilter("all")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-blue-100 text-blue-700"><BookOpen className="h-4 w-4" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">All Products</p>
                    <p className="text-lg font-bold">{store.products.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={`cursor-pointer transition-shadow ${catalogFilter === "raw" ? "ring-2 ring-primary" : "hover:shadow-md"}`} onClick={() => setCatalogFilter("raw")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-purple-100 text-purple-700"><FlaskConical className="h-4 w-4" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Raw Materials</p>
                    <p className="text-lg font-bold">{catalogTotals.rawCount} <span className="text-xs font-normal text-muted-foreground">({fmt(catalogTotals.rawValue)})</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={`cursor-pointer transition-shadow ${catalogFilter === "finished" ? "ring-2 ring-primary" : "hover:shadow-md"}`} onClick={() => setCatalogFilter("finished")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-emerald-100 text-emerald-700"><Pill className="h-4 w-4" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Finished Products</p>
                    <p className="text-lg font-bold">{catalogTotals.finishedCount} <span className="text-xs font-normal text-muted-foreground">({fmt(catalogTotals.finishedValue)})</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <FilterBar searchPlaceholder="Search by name, code, or therapeutic area..." searchValue={search} onSearchChange={setSearch}
            fields={[
              { key: "form", label: "Form", type: "select", options: ["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Drops", "Inhaler", "Suppository"].map((f) => ({ label: f, value: f })) },
            ]}
            values={filters} onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))} />

          <Card>
            <CardContent className="overflow-x-auto p-0">
              <DataTable
                columns={[
                  { key: "code", label: "Code", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
                  { key: "name", label: "Product", render: (_v, row) => {
                    const p = row as unknown as typeof store.products[number];
                    return (<div><div className="font-medium">{p.name}</div><div className="text-[11px] text-muted-foreground">{p.strength} - {p.form}</div></div>);
                  }},
                  { key: "therapeuticArea", label: "Category", render: (_v, row) => {
                    const p = row as unknown as typeof store.products[number];
                    const isRaw = catalogClassification.ingredientIds.has(p.id) || p.form === "Drops";
                    const isOutput = catalogClassification.outputIds.has(p.id);
                    return (
                      <div className="flex items-center gap-1">
                        <Badge className={isRaw ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"}>
                          {isRaw ? "Raw Material" : "Finished"}
                        </Badge>
                        {isOutput && <Badge variant="outline" className="text-[10px]">Has Formula</Badge>}
                      </div>
                    );
                  }},
                  { key: "stockQty", label: "Stock", className: "text-right", render: (_v, row) => {
                    const p = row as unknown as typeof store.products[number];
                    const isLow = p.stockQty <= p.reorderLevel;
                    return (
                      <div className={`font-medium ${isLow ? "text-red-600" : ""}`}>
                        {p.stockQty.toLocaleString()}
                        {isLow && <div className="text-[10px] text-red-500">below reorder</div>}
                      </div>
                    );
                  }},
                  { key: "pricePerUnit", label: "Unit Price", className: "text-right", render: (v) => <span className="font-medium">{fmt(v as number)}</span> },
                  { key: "warehouse", label: "Warehouse", render: (v) => v ? <span className="text-xs">{v as string}</span> : <span className="text-muted-foreground text-xs">--</span> },
                ] satisfies Column<Record<string, unknown>>[]}
                data={filteredCatalogProducts as unknown as Record<string, unknown>[]}
                exportable exportFilename="catalog-products.csv" emptyMessage="No catalog products match your filters."
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Warehouses ── */}
      {tab === "warehouses" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((w) => {
            const pct = Math.round((w.used / w.capacity) * 100);
            const colorByType: Record<string, string> = { "Raw Material": "bg-purple-100 text-purple-700", "Finished Goods": "bg-emerald-100 text-emerald-700", "Cold Chain": "bg-blue-100 text-blue-700", Quarantine: "bg-amber-100 text-amber-700" };
            return (
              <Card key={w.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailWH(w)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${colorByType[w.type] || "bg-gray-100 text-gray-700"}`}><Package className="h-4 w-4" /></div>
                      <div><CardTitle className="text-sm font-semibold">{w.name}</CardTitle><p className="text-[11px] text-muted-foreground mt-0.5">{w.location}</p></div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <EditDeleteMenu onEdit={() => handleEditWH(w)} onDelete={() => handleDeleteWH(w)} onView={() => setDetailWH(w)} canView itemLabel={w.name} compact />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between"><Badge variant="outline">{w.type}</Badge><span className="text-xs text-muted-foreground">{w.tempRange}</span></div>
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Capacity</span><span>{w.used.toLocaleString()} / {w.capacity.toLocaleString()} ({pct}%)</span></div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden"><div className={`h-full ${pct > 85 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} /></div>
                  </div>
                  <div className="text-xs text-muted-foreground border-t pt-2">Manager: <span className="font-medium text-foreground">{w.manager}</span></div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Batch Tracking ── */}
      {tab === "batches" && (
        <>
          {/* Near-expiry alert banner */}
          {nearExpiryBatches.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-amber-100 text-amber-700">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-800">Near-Expiry Alert</p>
                    <p className="text-xs text-amber-700">{nearExpiryBatches.length} active batch(es) expiring within {expiryAlertDays} days</p>
                  </div>
                  <div className="flex gap-1">
                    {[30, 60, 90].map((d) => (
                      <Button key={d} size="sm" variant={expiryAlertDays === d ? "default" : "ghost"} className="text-xs h-7"
                        onClick={() => setExpiryAlertDays(d)}>{d}d</Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Batch stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Active Batches" value={batches.filter((b) => b.status === "Active").length.toString()} subtitle="Currently in circulation" icon={<Package className="h-5 w-5" />} iconColor="bg-emerald-100 text-emerald-700" />
            <StatsCard title="Quarantined" value={batches.filter((b) => b.status === "Quarantine").length.toString()} subtitle="Under review" icon={<ShieldAlert className="h-5 w-5" />} iconColor="bg-amber-100 text-amber-700" />
            <StatsCard title="Expired/Recalled" value={batches.filter((b) => b.status === "Expired" || b.status === "Recalled").length.toString()} subtitle="Requires disposal" icon={<AlertTriangle className="h-5 w-5" />} iconColor="bg-red-100 text-red-700" />
            <StatsCard title="Near-Expiry" value={nearExpiryBatches.length.toString()} subtitle={`Within ${expiryAlertDays} days`} icon={<Clock className="h-5 w-5" />} iconColor="bg-orange-100 text-orange-700" />
          </div>

          <FilterBar searchPlaceholder="Search by batch #, product, or location..." searchValue={search} onSearchChange={setSearch}
            fields={[
              { key: "status", label: "Status", type: "select", options: [{ label: "Active", value: "Active" }, { label: "Quarantine", value: "Quarantine" }, { label: "Expired", value: "Expired" }, { label: "Recalled", value: "Recalled" }] },
              { key: "location", label: "Location", type: "select", options: [...new Set(batches.map((b) => b.location))].map((l) => ({ label: l, value: l })) },
            ]}
            values={filters} onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))} />

          <Card>
            <CardContent className="overflow-x-auto p-0">
              <DataTable
                columns={[
                  { key: "batchNo", label: "Batch #", render: (v) => <span className="font-mono text-xs font-medium">{v as string}</span> },
                  { key: "product", label: "Product", render: (_v, row) => {
                    const b = row as unknown as BatchRecord;
                    return (<div><div className="font-medium text-sm">{b.product}</div><div className="text-[11px] text-muted-foreground font-mono">{b.productCode}</div></div>);
                  }},
                  { key: "manufactureDate", label: "Mfg Date", className: "text-xs" },
                  { key: "expiryDate", label: "Expiry Date", render: (_v, row) => {
                    const b = row as unknown as BatchRecord;
                    const days = getDaysUntilExpiry(b.expiryDate);
                    const alertColor = getExpiryAlertColor(days);
                    return (
                      <div className={`text-xs rounded px-1.5 py-0.5 inline-block ${alertColor}`}>
                        {b.expiryDate}
                        {days > 0 && days <= 90 && <span className="ml-1 font-semibold">({days}d)</span>}
                        {days <= 0 && <span className="ml-1 font-semibold">(expired)</span>}
                      </div>
                    );
                  }},
                  { key: "quantity", label: "Qty", className: "text-right", render: (_v, row) => {
                    const b = row as unknown as BatchRecord;
                    return <span className="font-medium">{b.quantity.toLocaleString()} {b.unit}</span>;
                  }},
                  { key: "location", label: "Location", className: "text-xs text-muted-foreground" },
                  { key: "status", label: "Status", render: (v) => {
                    const status = v as BatchStatus;
                    const variant = status === "Active" ? "success" : status === "Quarantine" ? "warning" : "destructive";
                    return <Badge variant={variant}>{status}</Badge>;
                  }},
                  { key: "pickPriority", label: "Pick Order", render: (_v, row) => {
                    const b = row as unknown as BatchRecord;
                    const days = getDaysUntilExpiry(b.expiryDate);
                    const isFirstPick = b.status === "Active" && (
                      (b.pickPriority === "FEFO" && days <= 90) ||
                      b.pickPriority === "FIFO"
                    );
                    return (
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px]">{b.pickPriority}</Badge>
                        {isFirstPick && <Badge className="bg-blue-100 text-blue-700 text-[10px]">Pick First</Badge>}
                      </div>
                    );
                  }},
                  { key: "id", label: "", className: "text-right", render: (_v, row) => {
                    const b = row as unknown as BatchRecord;
                    return (
                      <Button variant="ghost" size="sm" className="text-xs" onClick={(e) => { e.stopPropagation(); setDetailBatch(b); }}>
                        View
                      </Button>
                    );
                  }},
                ] satisfies Column<Record<string, unknown>>[]}
                data={filteredBatches as unknown as Record<string, unknown>[]}
                onRowClick={(row) => setDetailBatch(row as unknown as BatchRecord)}
                exportable exportFilename="batch-tracking.csv" emptyMessage="No batches match your filters."
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Demand Forecasting ── */}
      {tab === "forecasting" && (
        <>
          {/* Reorder alerts with auto-reorder suggestion */}
          {reorderAlerts.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-red-100 text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800">Reorder Alerts</p>
                    <p className="text-xs text-red-700">{reorderAlerts.length} product(s) at or below reorder point: {reorderAlerts.map((r) => r.product).join(", ")}</p>
                  </div>
                  <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-100 text-xs"
                    onClick={() => setShowPOSuggestions(true)}>
                    Generate PO Suggestions
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Forecast stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Products Tracked" value={forecasts.length.toString()} subtitle="With sales history" icon={<BarChart3 className="h-5 w-5" />} iconColor="bg-blue-100 text-blue-700" />
            <StatsCard title="Trending Up" value={forecasts.filter((f) => f.trend === "up").length.toString()} subtitle="Increasing demand" icon={<TrendingUp className="h-5 w-5" />} iconColor="bg-emerald-100 text-emerald-700" />
            <StatsCard title="Trending Down" value={forecasts.filter((f) => f.trend === "down").length.toString()} subtitle="Decreasing demand" icon={<TrendingDown className="h-5 w-5" />} iconColor="bg-red-100 text-red-700" />
            <StatsCard title="Below Reorder" value={reorderAlerts.length.toString()} subtitle="Need restocking" icon={<AlertTriangle className="h-5 w-5" />} iconColor="bg-amber-100 text-amber-700" />
          </div>

          <FilterBar searchPlaceholder="Search products..." searchValue={search} onSearchChange={setSearch}
            fields={[]}
            values={filters} onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))} />

          <Card>
            <CardContent className="overflow-x-auto p-0">
              <DataTable
                columns={[
                  { key: "productCode", label: "Code", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
                  { key: "product", label: "Product", render: (v) => <span className="font-medium text-sm">{v as string}</span> },
                  { key: "salesMonth1", label: "Month -3", className: "text-right", render: (v) => <span className="text-sm text-muted-foreground">{(v as number).toLocaleString()}</span> },
                  { key: "salesMonth2", label: "Month -2", className: "text-right", render: (v) => <span className="text-sm text-muted-foreground">{(v as number).toLocaleString()}</span> },
                  { key: "salesMonth3", label: "Month -1", className: "text-right", render: (v) => <span className="text-sm font-medium">{(v as number).toLocaleString()}</span> },
                  { key: "avgMonthlySales", label: "Avg Monthly", className: "text-right", render: (v) => <span className="font-semibold">{(v as number).toLocaleString()}</span> },
                  { key: "trend", label: "Trend", render: (v) => {
                    const trend = v as TrendDirection;
                    const Icon = trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : Minus;
                    const color = trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-600" : "text-gray-500";
                    const bg = trend === "up" ? "bg-emerald-50" : trend === "down" ? "bg-red-50" : "bg-gray-50";
                    return (
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${color} ${bg}`}>
                        <Icon className="h-3 w-3" />
                        {trend === "up" ? "Rising" : trend === "down" ? "Falling" : "Stable"}
                      </div>
                    );
                  }},
                  { key: "forecastNextMonth", label: "Forecast", className: "text-right", render: (v) => <span className="font-semibold text-blue-700">{(v as number).toLocaleString()}</span> },
                  { key: "reorderPoint", label: "Reorder Pt", className: "text-right", render: (_v, row) => {
                    const f = row as unknown as ForecastRecord;
                    const isBelow = f.currentStock <= f.reorderPoint;
                    return (
                      <div className="text-right">
                        <span className="text-sm">{f.reorderPoint.toLocaleString()}</span>
                        {isBelow && <div className="text-[10px] text-red-500 font-medium">Stock below!</div>}
                      </div>
                    );
                  }},
                  { key: "safetyStock", label: "Safety Stock", className: "text-right text-sm" },
                  { key: "currentStock", label: "Current Stock", className: "text-right", render: (_v, row) => {
                    const f = row as unknown as ForecastRecord;
                    const isBelow = f.currentStock <= f.reorderPoint;
                    return <span className={`font-medium ${isBelow ? "text-red-600" : ""}`}>{f.currentStock.toLocaleString()} {f.unit}</span>;
                  }},
                  { key: "suggestedOrderQty", label: "Suggested Order", className: "text-right", render: (_v, row) => {
                    const f = row as unknown as ForecastRecord;
                    return f.suggestedOrderQty > 0
                      ? <Badge className="bg-blue-100 text-blue-700">{f.suggestedOrderQty.toLocaleString()} {f.unit}</Badge>
                      : <span className="text-xs text-muted-foreground">Sufficient</span>;
                  }},
                  { key: "seasonalFactor", label: "Season", render: (v) => {
                    const season = v as string;
                    const color = season === "Peak" ? "bg-orange-100 text-orange-700" : season === "Low" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700";
                    return <Badge className={color}>{season}</Badge>;
                  }},
                ] satisfies Column<Record<string, unknown>>[]}
                data={filteredForecasts as unknown as Record<string, unknown>[]}
                exportable exportFilename="demand-forecasts.csv" emptyMessage="No forecast data matches your search."
              />
            </CardContent>
          </Card>

          {/* Methodology note */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <BarChart3 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Forecast Methodology</p>
                  <p>Forecasts use a <span className="font-medium">3-month Simple Moving Average (SMA)</span> adjusted by seasonal factors. Peak season applies a 15% uplift; low season applies a 15% reduction. Suggested order quantities account for safety stock, current inventory, and reorder points.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Modals ── */}
      <EntityFormModal open={rmFormOpen} onOpenChange={setRmFormOpen}
        title={editingRm ? `Edit ${editingRm.name}` : "Add Raw Material"} fields={rmFields}
        initialData={editingRm ? { code: editingRm.code, name: editingRm.name, type: editingRm.type, supplier: editingRm.supplier, batchNo: editingRm.batchNo, manufactureDate: editingRm.manufactureDate, expiryDate: editingRm.expiryDate, quantityKg: editingRm.quantityKg, reorderLevel: editingRm.reorderLevel, unitCost: editingRm.unitCost, storageCondition: editingRm.storageCondition, pharmacopoeial: editingRm.pharmacopoeial, qcStatus: editingRm.qcStatus, warehouse: editingRm.warehouse } : undefined}
        onSubmit={handleRMSubmit} submitLabel={editingRm ? "Save" : "Create"} size="xl" />

      <EntityFormModal open={fpFormOpen} onOpenChange={setFpFormOpen}
        title={editingFp ? `Edit ${editingFp.name}` : "Add Finished Product"} fields={fpFields}
        initialData={editingFp ? { code: editingFp.code, name: editingFp.name, strength: editingFp.strength, form: editingFp.form, registration: editingFp.registration, batchNo: editingFp.batchNo, manufactureDate: editingFp.manufactureDate, expiryDate: editingFp.expiryDate, quantity: editingFp.quantity, unit: editingFp.unit, packSize: editingFp.packSize, unitPrice: editingFp.unitPrice, storageCondition: editingFp.storageCondition, warehouse: editingFp.warehouse, qcReleased: editingFp.qcReleased } : undefined}
        onSubmit={handleFPSubmit} submitLabel={editingFp ? "Save" : "Create"} size="xl" />

      <EntityFormModal open={whFormOpen} onOpenChange={setWhFormOpen}
        title={editingWh ? `Edit ${editingWh.name}` : "Add Warehouse"} fields={whFields}
        initialData={editingWh ? { name: editingWh.name, type: editingWh.type, location: editingWh.location, manager: editingWh.manager, tempRange: editingWh.tempRange, capacity: editingWh.capacity, used: editingWh.used } : undefined}
        onSubmit={handleWHSubmit} submitLabel={editingWh ? "Save" : "Create"} size="lg" />

      {/* ── Raw Material Detail Dialog ── */}
      <Dialog open={!!detailRM} onOpenChange={(open) => { if (!open) setDetailRM(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailRM?.name}</DialogTitle>
          </DialogHeader>
          {detailRM && (() => {
            const totalValue = detailRM.quantityKg * detailRM.unitCost;
            const stockPct = Math.min(Math.round((detailRM.quantityKg / Math.max(detailRM.reorderLevel * 3, 1)) * 100), 100);
            const isLow = detailRM.quantityKg <= detailRM.reorderLevel;
            return (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-sm text-muted-foreground">Code</span><p className="font-medium font-mono">{detailRM.code}</p></div>
                  <div><span className="text-sm text-muted-foreground">Type</span><p className="font-medium"><Badge variant="secondary">{detailRM.type}</Badge></p></div>
                  <div><span className="text-sm text-muted-foreground">Supplier</span><p className="font-medium">{detailRM.supplier}</p></div>
                  <div><span className="text-sm text-muted-foreground">Batch #</span><p className="font-medium font-mono">{detailRM.batchNo}</p></div>
                  <div><span className="text-sm text-muted-foreground">Manufacture Date</span><p className="font-medium">{detailRM.manufactureDate}</p></div>
                  <div><span className="text-sm text-muted-foreground">Expiry Date</span><p className="font-medium">{detailRM.expiryDate}</p></div>
                  <div><span className="text-sm text-muted-foreground">Quantity (kg)</span><p className={`font-medium ${isLow ? "text-red-600" : ""}`}>{detailRM.quantityKg.toLocaleString()}</p></div>
                  <div><span className="text-sm text-muted-foreground">Reorder Level (kg)</span><p className="font-medium">{detailRM.reorderLevel.toLocaleString()}</p></div>
                  <div><span className="text-sm text-muted-foreground">Unit Cost</span><p className="font-medium">{fmt(detailRM.unitCost)}/kg</p></div>
                  <div><span className="text-sm text-muted-foreground">Total Value</span><p className="font-medium text-lg">{fmt(totalValue)}</p></div>
                  <div><span className="text-sm text-muted-foreground">Storage Condition</span><p className="font-medium">{detailRM.storageCondition}</p></div>
                  <div><span className="text-sm text-muted-foreground">Pharmacopoeial Standard</span><p className="font-medium">{detailRM.pharmacopoeial}</p></div>
                  <div><span className="text-sm text-muted-foreground">QC Status</span><p><Badge variant={detailRM.qcStatus === "Approved" ? "success" : detailRM.qcStatus === "Rejected" ? "destructive" : "warning"}>{detailRM.qcStatus}</Badge></p></div>
                  <div><span className="text-sm text-muted-foreground">Warehouse</span><p className="font-medium">{detailRM.warehouse}</p></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Stock Level</span>
                    <span className={`font-medium ${isLow ? "text-red-600" : ""}`}>{detailRM.quantityKg.toLocaleString()} / {(detailRM.reorderLevel * 3).toLocaleString()} kg {isLow ? "(below reorder)" : ""}</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${isLow ? "bg-red-500" : stockPct > 70 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${stockPct}%` }} />
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Finished Product Detail Dialog ── */}
      <Dialog open={!!detailFP} onOpenChange={(open) => { if (!open) setDetailFP(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailFP?.name} {detailFP?.strength}</DialogTitle>
          </DialogHeader>
          {detailFP && (() => {
            const totalValue = detailFP.quantity * detailFP.unitPrice;
            return (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-sm text-muted-foreground">Code</span><p className="font-medium font-mono">{detailFP.code}</p></div>
                  <div><span className="text-sm text-muted-foreground">Form</span><p className="font-medium"><Badge variant="secondary">{detailFP.form}</Badge></p></div>
                  <div><span className="text-sm text-muted-foreground">Strength</span><p className="font-medium">{detailFP.strength}</p></div>
                  <div><span className="text-sm text-muted-foreground">Registration #</span><p className="font-medium font-mono">{detailFP.registration}</p></div>
                  <div><span className="text-sm text-muted-foreground">Batch #</span><p className="font-medium font-mono">{detailFP.batchNo}</p></div>
                  <div><span className="text-sm text-muted-foreground">Pack Size</span><p className="font-medium">{detailFP.packSize}</p></div>
                  <div><span className="text-sm text-muted-foreground">Manufacture Date</span><p className="font-medium">{detailFP.manufactureDate}</p></div>
                  <div><span className="text-sm text-muted-foreground">Expiry Date</span><p className="font-medium">{detailFP.expiryDate}</p></div>
                  <div><span className="text-sm text-muted-foreground">Quantity</span><p className="font-medium">{detailFP.quantity.toLocaleString()} {detailFP.unit}</p></div>
                  <div><span className="text-sm text-muted-foreground">Unit Price</span><p className="font-medium">{fmt(detailFP.unitPrice)}</p></div>
                  <div><span className="text-sm text-muted-foreground">Storage Condition</span><p className="font-medium">{detailFP.storageCondition}</p></div>
                  <div><span className="text-sm text-muted-foreground">Warehouse</span><p className="font-medium">{detailFP.warehouse}</p></div>
                  <div><span className="text-sm text-muted-foreground">QC Released</span><p><Badge variant={detailFP.qcReleased ? "success" : "warning"}>{detailFP.qcReleased ? "Released" : "Pending QC"}</Badge></p></div>
                  <div><span className="text-sm text-muted-foreground">Total Inventory Value</span><p className="font-medium text-lg">{fmt(totalValue)}</p></div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Warehouse Detail Dialog ── */}
      <Dialog open={!!detailWH} onOpenChange={(open) => { if (!open) setDetailWH(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailWH?.name}</DialogTitle>
          </DialogHeader>
          {detailWH && (() => {
            const pct = Math.round((detailWH.used / detailWH.capacity) * 100);
            const rmInWH = rawMaterials.filter((r) => r.warehouse === detailWH.name);
            const fpInWH = finishedProducts.filter((p) => p.warehouse === detailWH.name);
            return (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-sm text-muted-foreground">Type</span><p className="font-medium"><Badge variant="secondary">{detailWH.type}</Badge></p></div>
                  <div><span className="text-sm text-muted-foreground">Location</span><p className="font-medium">{detailWH.location}</p></div>
                  <div><span className="text-sm text-muted-foreground">Manager</span><p className="font-medium">{detailWH.manager}</p></div>
                  <div><span className="text-sm text-muted-foreground">Temp Range</span><p className="font-medium">{detailWH.tempRange}</p></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Capacity Utilization</span>
                    <span className={`font-medium ${pct > 85 ? "text-red-600" : ""}`}>{detailWH.used.toLocaleString()} / {detailWH.capacity.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${pct > 85 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                {rmInWH.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Raw Materials Stored ({rmInWH.length})</h4>
                    <div className="border rounded-lg divide-y">
                      {rmInWH.map((r) => (
                        <div key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
                          <div>
                            <span className="font-medium">{r.name}</span>
                            <span className="text-muted-foreground ml-2 text-xs font-mono">{r.code}</span>
                          </div>
                          <span className="text-muted-foreground">{r.quantityKg.toLocaleString()} kg</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {fpInWH.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Finished Products Stored ({fpInWH.length})</h4>
                    <div className="border rounded-lg divide-y">
                      {fpInWH.map((p) => (
                        <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                          <div>
                            <span className="font-medium">{p.name} {p.strength}</span>
                            <span className="text-muted-foreground ml-2 text-xs font-mono">{p.code}</span>
                          </div>
                          <span className="text-muted-foreground">{p.quantity.toLocaleString()} {p.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {rmInWH.length === 0 && fpInWH.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">No materials or products stored in this warehouse.</p>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Batch Detail Dialog ── */}
      <Dialog open={!!detailBatch} onOpenChange={(open) => { if (!open) setDetailBatch(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Batch {detailBatch?.batchNo}</DialogTitle>
          </DialogHeader>
          {detailBatch && (() => {
            const days = getDaysUntilExpiry(detailBatch.expiryDate);
            const alertColor = getExpiryAlertColor(days);
            return (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-sm text-muted-foreground">Product</span><p className="font-medium">{detailBatch.product}</p></div>
                  <div><span className="text-sm text-muted-foreground">Product Code</span><p className="font-medium font-mono">{detailBatch.productCode}</p></div>
                  <div><span className="text-sm text-muted-foreground">Manufacture Date</span><p className="font-medium">{detailBatch.manufactureDate}</p></div>
                  <div>
                    <span className="text-sm text-muted-foreground">Expiry Date</span>
                    <p className={`font-medium ${alertColor ? alertColor + " inline-block px-2 py-0.5 rounded mt-0.5" : ""}`}>
                      {detailBatch.expiryDate}
                      {days > 0 ? <span className="ml-1 text-xs">({days} days remaining)</span> : <span className="ml-1 text-xs font-semibold">(Expired)</span>}
                    </p>
                  </div>
                  <div><span className="text-sm text-muted-foreground">Quantity</span><p className="font-medium">{detailBatch.quantity.toLocaleString()} {detailBatch.unit}</p></div>
                  <div><span className="text-sm text-muted-foreground">Location</span><p className="font-medium">{detailBatch.location}</p></div>
                  <div>
                    <span className="text-sm text-muted-foreground">Status</span>
                    <p><Badge variant={detailBatch.status === "Active" ? "success" : detailBatch.status === "Quarantine" ? "warning" : "destructive"}>{detailBatch.status}</Badge></p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Pick Priority</span>
                    <p><Badge variant="outline">{detailBatch.pickPriority}</Badge></p>
                  </div>
                </div>

                {/* Traceability */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3">Traceability</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="h-7 w-7 rounded flex items-center justify-center bg-blue-100 text-blue-700 mt-0.5">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Received via Purchase Order</p>
                        <p className="font-medium font-mono text-sm">{detailBatch.poRef}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="h-7 w-7 rounded flex items-center justify-center bg-emerald-100 text-emerald-700 mt-0.5">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Dispatched via Sales Orders</p>
                        {detailBatch.soRefs.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {detailBatch.soRefs.map((so) => (
                              <Badge key={so} variant="outline" className="font-mono text-xs">{so}</Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No dispatches yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status management */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3">Status Management</h4>
                  <div className="flex flex-wrap gap-2">
                    {detailBatch.status === "Active" && (
                      <Button variant="outline" size="sm" className="text-amber-700 border-amber-300 hover:bg-amber-50"
                        onClick={() => { handleBatchStatusChange(detailBatch.id, "Quarantine"); setDetailBatch({ ...detailBatch, status: "Quarantine" }); }}>
                        <ShieldAlert className="h-3.5 w-3.5 mr-1.5" /> Move to Quarantine
                      </Button>
                    )}
                    {detailBatch.status === "Quarantine" && (
                      <>
                        <Button variant="outline" size="sm" className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                          onClick={() => { handleBatchStatusChange(detailBatch.id, "Active"); setDetailBatch({ ...detailBatch, status: "Active" }); }}>
                          <Package className="h-3.5 w-3.5 mr-1.5" /> Release (Active)
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-700 border-red-300 hover:bg-red-50"
                          onClick={() => { handleBatchStatusChange(detailBatch.id, "Recalled"); setDetailBatch({ ...detailBatch, status: "Recalled" }); }}>
                          <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Recall Batch
                        </Button>
                      </>
                    )}
                    {(detailBatch.status === "Expired" || detailBatch.status === "Recalled") && (
                      <p className="text-sm text-muted-foreground">This batch is {detailBatch.status.toLowerCase()} and cannot be returned to active status.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── PO Suggestions Dialog ── */}
      <Dialog open={showPOSuggestions} onOpenChange={setShowPOSuggestions}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Order Suggestions</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">The following products are below their reorder levels and need restocking:</p>
            <div className="border rounded-lg divide-y">
              {reorderAlerts.map((f) => (
                <div key={f.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{f.product}</p>
                    <p className="text-xs text-muted-foreground">Current: {f.currentStock.toLocaleString()} {f.unit} | Reorder Point: {f.reorderPoint.toLocaleString()} | Safety Stock: {f.safetyStock.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-blue-100 text-blue-700">{f.suggestedOrderQty.toLocaleString()} {f.unit}</Badge>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Suggested order</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Summary</p>
              <p>Total products needing reorder: {reorderAlerts.length}</p>
              <p>Based on 3-month SMA forecast with seasonal adjustment and safety stock requirements.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
