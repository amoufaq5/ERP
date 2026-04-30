"use client";

import { useMemo, useState } from "react";
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
} from "lucide-react";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { useTranslation } from "@/lib/i18n/i18n-context";

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

type Tab = "raw" | "finished" | "warehouses";

/* ─── Component ──────────────────────────────────────────────────── */

export default function InventoryPage() {
  const { config } = useAppConfig();
  const store = useDataStore();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("raw");

  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>(SEED_RM);
  const [finishedProducts, setFinishedProducts] = useState<FinishedProduct[]>(SEED_FP);
  const [warehouses, setWarehouses] = useState<WarehouseRec[]>(SEED_WH);

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
      setRawMaterials((prev) => prev.map((r) => r.id === editingRm.id ? { ...r, ...payload } : r));
    } else {
      setRawMaterials((prev) => [...prev, { id: genId("rm"), ...payload }]);
    }
    setRmFormOpen(false); setEditingRm(null);
  }
  function handleDeleteRM(r: RawMaterial) { setRawMaterials((prev) => prev.filter((x) => x.id !== r.id)); }

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
      setFinishedProducts((prev) => prev.map((p) => p.id === editingFp.id ? { ...p, ...payload } : p));
    } else {
      setFinishedProducts((prev) => [...prev, { id: genId("fp"), ...payload }]);
    }
    setFpFormOpen(false); setEditingFp(null);
  }
  function handleDeleteFP(p: FinishedProduct) { setFinishedProducts((prev) => prev.filter((x) => x.id !== p.id)); }

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
    } else {
      setWarehouses((prev) => [...prev, { id: genId("wh"), ...payload }]);
    }
    setWhFormOpen(false); setEditingWh(null);
  }
  function handleDeleteWH(w: WarehouseRec) { setWarehouses((prev) => prev.filter((x) => x.id !== w.id)); }

  function handleAdd() {
    if (tab === "raw") handleCreateRM();
    else if (tab === "finished") handleCreateFP();
    else handleCreateWH();
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
              : downloadCSV("warehouses.csv", warehouses as unknown as Record<string, unknown>[])
            }>
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" /> Add {tab === "raw" ? "Material" : tab === "finished" ? "Product" : "Warehouse"}
            </Button>
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
            { key: "finished" as Tab, label: t("inv.catalogProducts"), icon: Pill },
            { key: "warehouses" as Tab, label: t("inv.warehouses"), icon: Warehouse },
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
                
                exportable exportFilename="erp-inventory.csv" emptyMessage="No finished products match your filters."
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
              <Card key={w.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${colorByType[w.type] || "bg-gray-100 text-gray-700"}`}><Package className="h-4 w-4" /></div>
                      <div><CardTitle className="text-sm font-semibold">{w.name}</CardTitle><p className="text-[11px] text-muted-foreground mt-0.5">{w.location}</p></div>
                    </div>
                    <EditDeleteMenu onEdit={() => handleEditWH(w)} onDelete={() => handleDeleteWH(w)} onView={() => setDetailWH(w)} canView itemLabel={w.name} compact />
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
    </div>
  );
}
