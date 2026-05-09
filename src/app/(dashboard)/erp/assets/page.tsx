"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Building2,
  Plus,
  Package,
  DollarSign,
  TrendingDown,
  BarChart3,
  Wrench,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EntityFormModal, type EntityField, type EntityFormData } from "@/components/shared/entity-form-modal";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import StatusBadge from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FixedAsset {
  id: string;
  assetTag: string;
  name: string;
  category: "LAND" | "BUILDING" | "MACHINERY" | "VEHICLE" | "FURNITURE" | "IT_EQUIPMENT" | "LAB_EQUIPMENT";
  department: string;
  location: string;
  purchaseDate: string;
  purchaseCost: number;
  usefulLifeYears: number;
  salvageValue: number;
  depreciationMethod: "STRAIGHT_LINE" | "DECLINING_BALANCE";
  accumulatedDepreciation: number;
  netBookValue: number;
  status: "ACTIVE" | "DISPOSED" | "UNDER_MAINTENANCE" | "TRANSFERRED";
  assignedTo?: string;
  warrantyExpiry?: string;
  notes?: string;
}

const STORAGE_KEY = "erp-fixed-assets";

const CATEGORY_COLORS: Record<FixedAsset["category"], string> = {
  LAND: "bg-emerald-100 text-emerald-800 border-emerald-200",
  BUILDING: "bg-sky-100 text-sky-800 border-sky-200",
  MACHINERY: "bg-orange-100 text-orange-800 border-orange-200",
  VEHICLE: "bg-violet-100 text-violet-800 border-violet-200",
  FURNITURE: "bg-amber-100 text-amber-800 border-amber-200",
  IT_EQUIPMENT: "bg-indigo-100 text-indigo-800 border-indigo-200",
  LAB_EQUIPMENT: "bg-rose-100 text-rose-800 border-rose-200",
};

const CATEGORY_LABELS: Record<FixedAsset["category"], string> = {
  LAND: "Land",
  BUILDING: "Building",
  MACHINERY: "Machinery",
  VEHICLE: "Vehicle",
  FURNITURE: "Furniture",
  IT_EQUIPMENT: "IT Equipment",
  LAB_EQUIPMENT: "Lab Equipment",
};

const CATEGORY_ICONS: Record<FixedAsset["category"], LucideIcon> = {
  LAND: Building2,
  BUILDING: Building2,
  MACHINERY: Wrench,
  VEHICLE: Package,
  FURNITURE: Package,
  IT_EQUIPMENT: BarChart3,
  LAB_EQUIPMENT: BarChart3,
};

function generateId(): string {
  return `ast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateAssetTag(): string {
  return `FA-${String(Math.floor(Math.random() * 90000) + 10000)}`;
}

function egp(n: number): string {
  return `EGP ${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function computeAnnualDepreciation(asset: FixedAsset): number {
  if (asset.usefulLifeYears <= 0) return 0;
  if (asset.depreciationMethod === "STRAIGHT_LINE") {
    return (asset.purchaseCost - asset.salvageValue) / asset.usefulLifeYears;
  }
  const rate = 2 / asset.usefulLifeYears;
  const currentNBV = asset.purchaseCost - asset.accumulatedDepreciation;
  return Math.max(currentNBV * rate, 0);
}

function computeDepreciationThisYear(assets: FixedAsset[]): number {
  return assets
    .filter((a) => a.status === "ACTIVE")
    .reduce((sum, a) => sum + computeAnnualDepreciation(a), 0);
}

function buildDepreciationTimeline(asset: FixedAsset): { year: number; depreciation: number; accumulated: number; nbv: number }[] {
  const rows: { year: number; depreciation: number; accumulated: number; nbv: number }[] = [];
  const startYear = asset.purchaseDate ? new Date(asset.purchaseDate).getFullYear() : new Date().getFullYear();
  let accumulated = 0;
  let nbv = asset.purchaseCost;

  for (let i = 0; i < asset.usefulLifeYears; i++) {
    let dep: number;
    if (asset.depreciationMethod === "STRAIGHT_LINE") {
      dep = (asset.purchaseCost - asset.salvageValue) / asset.usefulLifeYears;
    } else {
      const rate = 2 / asset.usefulLifeYears;
      dep = nbv * rate;
      if (nbv - dep < asset.salvageValue) {
        dep = nbv - asset.salvageValue;
      }
    }
    dep = Math.max(dep, 0);
    accumulated += dep;
    nbv = asset.purchaseCost - accumulated;
    if (nbv < asset.salvageValue) {
      nbv = asset.salvageValue;
      accumulated = asset.purchaseCost - asset.salvageValue;
    }
    rows.push({ year: startYear + i + 1, depreciation: Math.round(dep), accumulated: Math.round(accumulated), nbv: Math.round(nbv) });
  }
  return rows;
}

const SEED_ASSETS: FixedAsset[] = [
  {
    id: "ast-001", assetTag: "FA-10001", name: "GMP Tablet Press Machine", category: "MACHINERY",
    department: "Production", location: "Building A - Floor 2", purchaseDate: "2022-03-15",
    purchaseCost: 2500000, usefulLifeYears: 15, salvageValue: 250000, depreciationMethod: "STRAIGHT_LINE",
    accumulatedDepreciation: 600000, netBookValue: 1900000, status: "ACTIVE",
    assignedTo: "Ahmed Hassan", warrantyExpiry: "2027-03-15", notes: "Fette P2090 - 45 station rotary press",
  },
  {
    id: "ast-002", assetTag: "FA-10002", name: "HPLC System - Agilent 1260", category: "LAB_EQUIPMENT",
    department: "Quality Control", location: "QC Lab - Room 105", purchaseDate: "2023-01-10",
    purchaseCost: 850000, usefulLifeYears: 10, salvageValue: 85000, depreciationMethod: "STRAIGHT_LINE",
    accumulatedDepreciation: 229500, netBookValue: 620500, status: "ACTIVE",
    assignedTo: "Dr. Fatima Ali", warrantyExpiry: "2026-01-10", notes: "With DAD detector and autosampler",
  },
  {
    id: "ast-003", assetTag: "FA-10003", name: "Company Delivery Van - Toyota HiAce", category: "VEHICLE",
    department: "Distribution", location: "Parking Lot B", purchaseDate: "2021-06-20",
    purchaseCost: 450000, usefulLifeYears: 8, salvageValue: 90000, depreciationMethod: "DECLINING_BALANCE",
    accumulatedDepreciation: 225000, netBookValue: 225000, status: "ACTIVE",
    assignedTo: "Mohamed Ibrahim", warrantyExpiry: "2024-06-20",
  },
  {
    id: "ast-004", assetTag: "FA-10004", name: "Clean Room HVAC System", category: "MACHINERY",
    department: "Production", location: "Building A - Rooftop", purchaseDate: "2020-11-01",
    purchaseCost: 1800000, usefulLifeYears: 20, salvageValue: 180000, depreciationMethod: "STRAIGHT_LINE",
    accumulatedDepreciation: 486000, netBookValue: 1314000, status: "ACTIVE",
    notes: "AHU with HEPA filtration - Class 100,000",
  },
  {
    id: "ast-005", assetTag: "FA-10005", name: "Production Building - Block A", category: "BUILDING",
    department: "Administration", location: "Main Campus", purchaseDate: "2015-01-15",
    purchaseCost: 12000000, usefulLifeYears: 40, salvageValue: 2000000, depreciationMethod: "STRAIGHT_LINE",
    accumulatedDepreciation: 2750000, netBookValue: 9250000, status: "ACTIVE",
    notes: "3-story GMP production facility with utilities",
  },
  {
    id: "ast-006", assetTag: "FA-10006", name: "Dell PowerEdge R750 Server Rack", category: "IT_EQUIPMENT",
    department: "IT", location: "Server Room - Building B", purchaseDate: "2023-08-01",
    purchaseCost: 320000, usefulLifeYears: 5, salvageValue: 32000, depreciationMethod: "STRAIGHT_LINE",
    accumulatedDepreciation: 172800, netBookValue: 147200, status: "ACTIVE",
    assignedTo: "IT Department", warrantyExpiry: "2026-08-01", notes: "ERP and LIMS hosting infrastructure",
  },
  {
    id: "ast-007", assetTag: "FA-10007", name: "Lab Furniture Set - QC Lab", category: "FURNITURE",
    department: "Quality Control", location: "QC Lab - Room 105", purchaseDate: "2022-05-10",
    purchaseCost: 180000, usefulLifeYears: 10, salvageValue: 18000, depreciationMethod: "STRAIGHT_LINE",
    accumulatedDepreciation: 64800, netBookValue: 115200, status: "ACTIVE",
    notes: "Anti-vibration benches and chemical-resistant countertops",
  },
  {
    id: "ast-008", assetTag: "FA-10008", name: "Dissolution Testing Apparatus", category: "LAB_EQUIPMENT",
    department: "Quality Control", location: "QC Lab - Room 107", purchaseDate: "2021-09-20",
    purchaseCost: 280000, usefulLifeYears: 10, salvageValue: 28000, depreciationMethod: "STRAIGHT_LINE",
    accumulatedDepreciation: 126000, netBookValue: 154000, status: "UNDER_MAINTENANCE",
    assignedTo: "QC Team", warrantyExpiry: "2024-09-20", notes: "USP Apparatus Type II - 8 vessel",
  },
  {
    id: "ast-009", assetTag: "FA-10009", name: "Blister Packaging Machine", category: "MACHINERY",
    department: "Packaging", location: "Building A - Floor 1", purchaseDate: "2022-07-12",
    purchaseCost: 1200000, usefulLifeYears: 12, salvageValue: 120000, depreciationMethod: "STRAIGHT_LINE",
    accumulatedDepreciation: 360000, netBookValue: 840000, status: "ACTIVE",
    assignedTo: "Packaging Team", warrantyExpiry: "2025-07-12", notes: "Uhlmann UPS 4 - Alu/Alu and Alu/PVC capability",
  },
  {
    id: "ast-010", assetTag: "FA-10010", name: "Company Sedan - Hyundai Sonata", category: "VEHICLE",
    department: "Sales", location: "Parking Lot A", purchaseDate: "2023-02-01",
    purchaseCost: 550000, usefulLifeYears: 6, salvageValue: 110000, depreciationMethod: "DECLINING_BALANCE",
    accumulatedDepreciation: 275000, netBookValue: 275000, status: "ACTIVE",
    assignedTo: "Sales Director", warrantyExpiry: "2028-02-01",
  },
];

function loadFromStorage(): FixedAsset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ASSETS));
  return SEED_ASSETS;
}

function saveToStorage(assets: FixedAsset[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
}

const FORM_FIELDS: EntityField[] = [
  { name: "assetTag", label: "Asset Tag", type: "text", required: true, placeholder: "e.g. FA-10011" },
  { name: "name", label: "Asset Name", type: "text", required: true, placeholder: "e.g. Tablet Press Machine" },
  {
    name: "category", label: "Category", type: "select", required: true,
    options: [
      { label: "Land", value: "LAND" },
      { label: "Building", value: "BUILDING" },
      { label: "Machinery", value: "MACHINERY" },
      { label: "Vehicle", value: "VEHICLE" },
      { label: "Furniture", value: "FURNITURE" },
      { label: "IT Equipment", value: "IT_EQUIPMENT" },
      { label: "Lab Equipment", value: "LAB_EQUIPMENT" },
    ],
  },
  { name: "department", label: "Department", type: "text", required: true, placeholder: "e.g. Production" },
  { name: "location", label: "Location", type: "text", required: true, placeholder: "e.g. Building A - Floor 2" },
  { name: "purchaseDate", label: "Purchase Date", type: "date", required: true },
  { name: "purchaseCost", label: "Purchase Cost (EGP)", type: "number", required: true, min: 0 },
  { name: "usefulLifeYears", label: "Useful Life (Years)", type: "number", required: true, min: 1 },
  { name: "salvageValue", label: "Salvage Value (EGP)", type: "number", required: true, min: 0 },
  {
    name: "depreciationMethod", label: "Depreciation Method", type: "select", required: true,
    options: [
      { label: "Straight Line", value: "STRAIGHT_LINE" },
      { label: "Declining Balance", value: "DECLINING_BALANCE" },
    ],
  },
  {
    name: "status", label: "Status", type: "select", required: true,
    options: [
      { label: "Active", value: "ACTIVE" },
      { label: "Disposed", value: "DISPOSED" },
      { label: "Under Maintenance", value: "UNDER_MAINTENANCE" },
      { label: "Transferred", value: "TRANSFERRED" },
    ],
  },
  { name: "assignedTo", label: "Assigned To", type: "text", placeholder: "e.g. Ahmed Hassan" },
  { name: "warrantyExpiry", label: "Warranty Expiry", type: "date" },
  { name: "notes", label: "Notes", type: "textarea", fullWidth: true, placeholder: "Additional notes..." },
];

export default function AssetsPage() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [mounted, setMounted] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null);
  const [detailAsset, setDetailAsset] = useState<FixedAsset | null>(null);
  const [disposeConfirmId, setDisposeConfirmId] = useState<string | null>(null);

  useEffect(() => {
    setAssets(loadFromStorage());
    setMounted(true);
  }, []);

  const persist = useCallback((next: FixedAsset[]) => {
    setAssets(next);
    saveToStorage(next);
  }, []);

  const handleCreate = useCallback((data: EntityFormData) => {
    const cost = Number(data.purchaseCost) || 0;
    const salvage = Number(data.salvageValue) || 0;
    const life = Number(data.usefulLifeYears) || 1;
    const newAsset: FixedAsset = {
      id: generateId(),
      assetTag: (data.assetTag as string) || generateAssetTag(),
      name: data.name as string,
      category: data.category as FixedAsset["category"],
      department: data.department as string,
      location: data.location as string,
      purchaseDate: data.purchaseDate as string,
      purchaseCost: cost,
      usefulLifeYears: life,
      salvageValue: salvage,
      depreciationMethod: data.depreciationMethod as FixedAsset["depreciationMethod"],
      accumulatedDepreciation: 0,
      netBookValue: cost,
      status: (data.status as FixedAsset["status"]) || "ACTIVE",
      assignedTo: (data.assignedTo as string) || undefined,
      warrantyExpiry: (data.warrantyExpiry as string) || undefined,
      notes: (data.notes as string) || undefined,
    };
    persist([...assets, newAsset]);
  }, [assets, persist]);

  const handleUpdate = useCallback((data: EntityFormData) => {
    if (!editingAsset) return;
    const cost = Number(data.purchaseCost) || 0;
    const salvage = Number(data.salvageValue) || 0;
    const life = Number(data.usefulLifeYears) || 1;
    const accDep = editingAsset.accumulatedDepreciation;
    const updated: FixedAsset = {
      ...editingAsset,
      assetTag: data.assetTag as string,
      name: data.name as string,
      category: data.category as FixedAsset["category"],
      department: data.department as string,
      location: data.location as string,
      purchaseDate: data.purchaseDate as string,
      purchaseCost: cost,
      usefulLifeYears: life,
      salvageValue: salvage,
      depreciationMethod: data.depreciationMethod as FixedAsset["depreciationMethod"],
      accumulatedDepreciation: accDep,
      netBookValue: cost - accDep,
      status: data.status as FixedAsset["status"],
      assignedTo: (data.assignedTo as string) || undefined,
      warrantyExpiry: (data.warrantyExpiry as string) || undefined,
      notes: (data.notes as string) || undefined,
    };
    persist(assets.map((a) => (a.id === updated.id ? updated : a)));
    setEditingAsset(null);
  }, [editingAsset, assets, persist]);

  const handleDelete = useCallback((id: string) => {
    persist(assets.filter((a) => a.id !== id));
  }, [assets, persist]);

  const handleDispose = useCallback((id: string) => {
    persist(
      assets.map((a) =>
        a.id === id
          ? { ...a, status: "DISPOSED" as const, notes: `${a.notes ? a.notes + " | " : ""}Disposed on ${new Date().toISOString().slice(0, 10)}` }
          : a
      )
    );
    setDisposeConfirmId(null);
  }, [assets, persist]);

  const totalAssets = assets.length;
  const totalBookValue = useMemo(() => assets.reduce((s, a) => s + a.purchaseCost, 0), [assets]);
  const totalNBV = useMemo(() => assets.reduce((s, a) => s + a.netBookValue, 0), [assets]);
  const depThisYear = useMemo(() => computeDepreciationThisYear(assets), [assets]);

  const categoryStats = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    for (const a of assets) {
      if (!map[a.category]) map[a.category] = { count: 0, value: 0 };
      map[a.category].count++;
      map[a.category].value += a.purchaseCost;
    }
    return map;
  }, [assets]);

  const columns: Column<FixedAsset>[] = useMemo(() => [
    { key: "assetTag", label: "Asset Tag", sortable: true, render: (v: string) => <span className="font-mono text-xs">{v}</span> },
    { key: "name", label: "Name", sortable: true, render: (v: string) => <span className="font-medium">{v}</span> },
    {
      key: "category", label: "Category", sortable: true,
      render: (v: FixedAsset["category"]) => (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_COLORS[v] || ""}`}>
          {CATEGORY_LABELS[v] || v}
        </span>
      ),
    },
    { key: "department", label: "Department", sortable: true },
    { key: "location", label: "Location", sortable: true },
    { key: "purchaseCost", label: "Purchase Cost", sortable: true, render: (v: number) => <span className="font-semibold">{egp(v)}</span> },
    { key: "netBookValue", label: "Net Book Value", sortable: true, render: (v: number) => <span className="font-semibold">{egp(v)}</span> },
    {
      key: "status", label: "Status", sortable: true,
      render: (v: string) => {
        const label = v === "UNDER_MAINTENANCE" ? "Maintenance" : v === "TRANSFERRED" ? "Transferred" : v.charAt(0) + v.slice(1).toLowerCase();
        return <StatusBadge status={label} />;
      },
    },
    { key: "assignedTo", label: "Assigned To", sortable: true },
    {
      key: "actions", label: "",
      render: (_: unknown, row: FixedAsset) => (
        <EditDeleteMenu
          onView={() => setDetailAsset(row)}
          onEdit={() => { setEditingAsset(row); setFormOpen(true); }}
          onDelete={() => handleDelete(row.id)}
          itemLabel={row.name}
          extraItems={
            row.status !== "DISPOSED"
              ? [{ label: "Dispose Asset", icon: <Trash2 className="h-4 w-4" />, onClick: () => setDisposeConfirmId(row.id), destructive: true }]
              : []
          }
        />
      ),
    },
  ], [handleDelete]);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fixed Asset Management"
        description="Track, depreciate, and manage all fixed assets across the organization."
        icon={<Building2 className="h-6 w-6 text-primary" />}
        actions={
          <Button onClick={() => { setEditingAsset(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Add Asset
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Package} title="Total Assets" value={totalAssets} subtitle={`${assets.filter((a) => a.status === "ACTIVE").length} active`} iconColor="bg-blue-100 text-blue-700" />
        <StatsCard icon={DollarSign} title="Total Book Value" value={egp(totalBookValue)} subtitle="Original purchase cost" iconColor="bg-green-100 text-green-700" />
        <StatsCard icon={BarChart3} title="Net Book Value" value={egp(totalNBV)} subtitle="After depreciation" iconColor="bg-purple-100 text-purple-700" />
        <StatsCard icon={TrendingDown} title="Depreciation This Year" value={egp(Math.round(depThisYear))} subtitle="Active assets only" iconColor="bg-orange-100 text-orange-700" />
      </div>

      <Tabs defaultValue="assets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assets">Assets List</TabsTrigger>
          <TabsTrigger value="depreciation">Depreciation Schedule</TabsTrigger>
          <TabsTrigger value="categories">Asset Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="assets">
          <DataTable
            columns={columns}
            data={assets}
            searchable
            searchKeys={["assetTag", "name", "category", "department", "location", "assignedTo"]}
            pagination
            pageSize={10}
            exportable
            exportFilename="fixed-assets.csv"
            onRowClick={(row) => setDetailAsset(row)}
            emptyMessage="No fixed assets found. Click 'Add Asset' to create one."
          />
        </TabsContent>

        <TabsContent value="depreciation">
          <DepreciationSchedule assets={assets} />
        </TabsContent>

        <TabsContent value="categories">
          <CategoriesGrid categoryStats={categoryStats} totalValue={totalBookValue} />
        </TabsContent>
      </Tabs>

      <EntityFormModal
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingAsset(null); }}
        title={editingAsset ? "Edit Asset" : "Add New Asset"}
        description={editingAsset ? "Update asset details below." : "Fill in the details to register a new fixed asset."}
        fields={FORM_FIELDS}
        initialData={
          editingAsset
            ? {
                assetTag: editingAsset.assetTag,
                name: editingAsset.name,
                category: editingAsset.category,
                department: editingAsset.department,
                location: editingAsset.location,
                purchaseDate: editingAsset.purchaseDate,
                purchaseCost: editingAsset.purchaseCost,
                usefulLifeYears: editingAsset.usefulLifeYears,
                salvageValue: editingAsset.salvageValue,
                depreciationMethod: editingAsset.depreciationMethod,
                status: editingAsset.status,
                assignedTo: editingAsset.assignedTo || "",
                warrantyExpiry: editingAsset.warrantyExpiry || "",
                notes: editingAsset.notes || "",
              }
            : undefined
        }
        onSubmit={editingAsset ? handleUpdate : handleCreate}
        submitLabel={editingAsset ? "Update Asset" : "Create Asset"}
        size="xl"
      />

      <AssetDetailDialog asset={detailAsset} onClose={() => setDetailAsset(null)} />

      <Dialog open={!!disposeConfirmId} onOpenChange={(open) => { if (!open) setDisposeConfirmId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dispose Asset</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark <span className="font-semibold">{assets.find((a) => a.id === disposeConfirmId)?.name}</span> as disposed? This will set the status to DISPOSED and record the disposal date.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDisposeConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => disposeConfirmId && handleDispose(disposeConfirmId)}>
              <Trash2 className="h-4 w-4 mr-1" />
              Dispose
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DepreciationSchedule({ assets }: { assets: FixedAsset[] }) {
  const activeAssets = useMemo(() => assets.filter((a) => a.status !== "DISPOSED"), [assets]);
  const totals = useMemo(() => {
    let cost = 0;
    let annual = 0;
    let accum = 0;
    let nbv = 0;
    for (const a of activeAssets) {
      cost += a.purchaseCost;
      annual += computeAnnualDepreciation(a);
      accum += a.accumulatedDepreciation;
      nbv += a.netBookValue;
    }
    return { cost, annual: Math.round(annual), accum, nbv };
  }, [activeAssets]);

  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset Name</TableHead>
            <TableHead className="text-right">Purchase Cost</TableHead>
            <TableHead className="text-right">Useful Life</TableHead>
            <TableHead className="text-right">Annual Depreciation</TableHead>
            <TableHead className="text-right">Accumulated Dep.</TableHead>
            <TableHead className="text-right">Net Book Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeAssets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-sm">No active assets to display.</TableCell>
            </TableRow>
          ) : (
            activeAssets.map((a) => {
              const annual = Math.round(computeAnnualDepreciation(a));
              return (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-right">{egp(a.purchaseCost)}</TableCell>
                  <TableCell className="text-right">{a.usefulLifeYears} yrs</TableCell>
                  <TableCell className="text-right text-orange-700 font-medium">{egp(annual)}</TableCell>
                  <TableCell className="text-right text-red-700">{egp(a.accumulatedDepreciation)}</TableCell>
                  <TableCell className="text-right font-semibold">{egp(a.netBookValue)}</TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
        {activeAssets.length > 0 && (
          <TableFooter>
            <TableRow className="font-bold">
              <TableCell>Total ({activeAssets.length} assets)</TableCell>
              <TableCell className="text-right">{egp(totals.cost)}</TableCell>
              <TableCell className="text-right"></TableCell>
              <TableCell className="text-right text-orange-700">{egp(totals.annual)}</TableCell>
              <TableCell className="text-right text-red-700">{egp(totals.accum)}</TableCell>
              <TableCell className="text-right">{egp(totals.nbv)}</TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}

function CategoriesGrid({ categoryStats, totalValue }: { categoryStats: Record<string, { count: number; value: number }>; totalValue: number }) {
  const categories = Object.keys(CATEGORY_LABELS) as FixedAsset["category"][];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {categories.map((cat) => {
        const stats = categoryStats[cat] || { count: 0, value: 0 };
        const pct = totalValue > 0 ? (stats.value / totalValue) * 100 : 0;
        const Icon = CATEGORY_ICONS[cat];
        return (
          <div key={cat} className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${CATEGORY_COLORS[cat].split(" ").slice(0, 1).join(" ")} bg-opacity-20`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">{CATEGORY_LABELS[cat]}</p>
                <p className="text-xs text-muted-foreground">{stats.count} asset{stats.count !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <p className="text-lg font-bold mb-2">{egp(stats.value)}</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Portfolio share</span>
                <span className="font-medium text-foreground">{pct.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${CATEGORY_COLORS[cat].includes("emerald") ? "bg-emerald-500" : CATEGORY_COLORS[cat].includes("sky") ? "bg-sky-500" : CATEGORY_COLORS[cat].includes("orange") ? "bg-orange-500" : CATEGORY_COLORS[cat].includes("violet") ? "bg-violet-500" : CATEGORY_COLORS[cat].includes("amber") ? "bg-amber-500" : CATEGORY_COLORS[cat].includes("indigo") ? "bg-indigo-500" : "bg-rose-500"}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AssetDetailDialog({ asset, onClose }: { asset: FixedAsset | null; onClose: () => void }) {
  const timeline = useMemo(() => (asset ? buildDepreciationTimeline(asset) : []), [asset]);

  if (!asset) return null;

  const annual = Math.round(computeAnnualDepreciation(asset));
  const statusLabel = asset.status === "UNDER_MAINTENANCE" ? "Maintenance" : asset.status === "TRANSFERRED" ? "Transferred" : asset.status.charAt(0) + asset.status.slice(1).toLowerCase();

  return (
    <Dialog open={!!asset} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {asset.name}
            <Badge variant="outline" className="text-[10px]">{asset.assetTag}</Badge>
          </DialogTitle>
          <DialogDescription>Full asset details, depreciation timeline, and maintenance history.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="space-y-3">
          <TabsList className="flex-wrap">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="depreciation">Depreciation</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Asset Tag</span>
                <p className="font-mono font-medium">{asset.assetTag}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Category</span>
                <p>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_COLORS[asset.category]}`}>
                    {CATEGORY_LABELS[asset.category]}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Department</span>
                <p className="font-medium">{asset.department}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Location</span>
                <p>{asset.location}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Status</span>
                <p><StatusBadge status={statusLabel} /></p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Assigned To</span>
                <p>{asset.assignedTo || "Unassigned"}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Purchase Date</span>
                <p>{asset.purchaseDate}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Warranty Expiry</span>
                <p>{asset.warrantyExpiry || "N/A"}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Purchase Cost</span>
                <p className="text-lg font-bold">{egp(asset.purchaseCost)}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Net Book Value</span>
                <p className="text-lg font-bold text-green-700">{egp(asset.netBookValue)}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Salvage Value</span>
                <p>{egp(asset.salvageValue)}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Useful Life</span>
                <p>{asset.usefulLifeYears} years</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Depreciation Method</span>
                <p>{asset.depreciationMethod === "STRAIGHT_LINE" ? "Straight Line" : "Declining Balance"}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Annual Depreciation</span>
                <p className="font-semibold text-orange-700">{egp(annual)}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Accumulated Depreciation</span>
                <p className="font-semibold text-red-600">{egp(asset.accumulatedDepreciation)}</p>
              </div>
              {asset.notes && (
                <div className="col-span-2">
                  <span className="text-muted-foreground text-xs">Notes</span>
                  <p className="text-sm">{asset.notes}</p>
                </div>
              )}
              {asset.status === "DISPOSED" && (
                <div className="col-span-2 rounded-lg border border-red-200 bg-red-50 p-3">
                  <span className="text-xs font-semibold text-red-800">Disposal Information</span>
                  <p className="text-sm text-red-700 mt-1">This asset has been disposed. {asset.notes?.includes("Disposed on") ? asset.notes.split("Disposed on")[1]?.trim().split("|")[0] ? `Disposal date: ${asset.notes.split("Disposed on ")[1]?.split("|")[0]?.split(" ")[0] || "Recorded"}` : "" : ""}</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="depreciation">
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead className="text-right">Depreciation</TableHead>
                    <TableHead className="text-right">Accumulated</TableHead>
                    <TableHead className="text-right">Net Book Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-medium">{asset.purchaseDate ? new Date(asset.purchaseDate).getFullYear() : "Start"} (Purchase)</TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right font-semibold">{egp(asset.purchaseCost)}</TableCell>
                  </TableRow>
                  {timeline.map((row) => (
                    <TableRow key={row.year}>
                      <TableCell className="font-medium">{row.year}</TableCell>
                      <TableCell className="text-right text-orange-700">{egp(row.depreciation)}</TableCell>
                      <TableCell className="text-right text-red-700">{egp(row.accumulated)}</TableCell>
                      <TableCell className="text-right font-semibold">{egp(row.nbv)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="maintenance">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wrench className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Maintenance History</p>
              <p className="text-xs text-muted-foreground mt-1">No maintenance records have been logged for this asset yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Maintenance tracking will be available in a future update.</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
