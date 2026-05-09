"use client";

import { useMemo, useState } from "react";
import {
  Factory, ClipboardList, Play, CheckCircle, Plus, Package, Layers, Trash2,
  AlertTriangle, CheckCircle2, ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import {
  EntityFormModal, type EntityField, type EntityFormData,
} from "@/components/shared/entity-form-modal";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { useApiDataStore } from "@/lib/api/use-api-store";
import { useCrossModuleActions } from "@/lib/cross-module-actions";

/* ─── Types ─── */

interface BOMItem { materialCode: string; materialName: string; quantity: number; unit: string; }

interface BOM {
  id: string; name: string; productCode: string; productName: string;
  version: string; status: "DRAFT" | "ACTIVE" | "OBSOLETE";
  batchSize: number; batchUnit: string;
  materials: BOMItem[];
}

interface WOMaterial { materialCode: string; materialName: string; requiredQty: number; unit: string; issuedQty?: number; availableStock?: number; }

interface WorkOrder {
  id: string; bomId: string; bomName: string;
  productCode: string;
  quantity: number; priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  startDate: string; endDate: string;
  assignedTo: string; notes?: string;
  materials: WOMaterial[];
  materialsIssued: boolean;
}

/* ─── Seed ─── */

const SEED_BOMS: BOM[] = [
  { id: "bom-1", name: "Paracetamol 500mg Tablet", productCode: "FG-PARA500-T", productName: "Paracetamol 500mg", version: "3.2", status: "ACTIVE", batchSize: 500000, batchUnit: "tablets",
    materials: [
      { materialCode: "API-PARA-500", materialName: "Paracetamol API", quantity: 250, unit: "kg" },
      { materialCode: "EXP-MCC-101", materialName: "MCC 101", quantity: 120, unit: "kg" },
      { materialCode: "EXP-LACT-200", materialName: "Lactose 200M", quantity: 80, unit: "kg" },
      { materialCode: "EXP-MGST", materialName: "Magnesium Stearate", quantity: 5, unit: "kg" },
    ] },
  { id: "bom-2", name: "Amoxicillin 250mg Capsule", productCode: "FG-AMOX250-C", productName: "Amoxicillin 250mg", version: "2.1", status: "ACTIVE", batchSize: 200000, batchUnit: "capsules",
    materials: [
      { materialCode: "API-AMOX-250", materialName: "Amoxicillin Trihydrate", quantity: 50, unit: "kg" },
      { materialCode: "EXP-MCC-101", materialName: "MCC 101", quantity: 30, unit: "kg" },
      { materialCode: "EXP-MGST", materialName: "Magnesium Stearate", quantity: 2, unit: "kg" },
    ] },
  { id: "bom-3", name: "Omeprazole 20mg Capsule", productCode: "FG-OMEZ20-C", productName: "Omeprazole 20mg", version: "1.0", status: "DRAFT", batchSize: 100000, batchUnit: "capsules",
    materials: [
      { materialCode: "API-OMEZ-20", materialName: "Omeprazole API", quantity: 2, unit: "kg" },
      { materialCode: "EXP-MCC-101", materialName: "MCC 101", quantity: 15, unit: "kg" },
    ] },
  { id: "bom-4", name: "Vitamin C Effervescent 1000mg", productCode: "FG-VITC-EFF", productName: "Vitamin C Effervescent", version: "1.5", status: "ACTIVE", batchSize: 50000, batchUnit: "tablets",
    materials: [
      { materialCode: "EXP-MCC-101", materialName: "MCC 101", quantity: 40, unit: "kg" },
      { materialCode: "EXP-LACT-200", materialName: "Lactose 200M", quantity: 20, unit: "kg" },
    ] },
];

function calcWOMaterials(bom: BOM, quantity: number): WOMaterial[] {
  const ratio = quantity / bom.batchSize;
  return bom.materials.map((m) => ({
    materialCode: m.materialCode,
    materialName: m.materialName,
    requiredQty: Math.ceil(m.quantity * ratio * 100) / 100,
    unit: m.unit,
  }));
}

const SEED_WO: WorkOrder[] = [
  { id: "wo-1", bomId: "bom-1", bomName: "Paracetamol 500mg Tablet", productCode: "FG-PARA500-T", quantity: 500000, priority: "HIGH", status: "IN_PROGRESS", startDate: "2026-03-15", endDate: "2026-04-15", assignedTo: "Production Line A",
    materials: calcWOMaterials(SEED_BOMS[0], 500000), materialsIssued: true },
  { id: "wo-2", bomId: "bom-2", bomName: "Amoxicillin 250mg Capsule", productCode: "FG-AMOX250-C", quantity: 200000, priority: "MEDIUM", status: "PLANNED", startDate: "2026-04-01", endDate: "2026-05-01", assignedTo: "Production Line B",
    materials: calcWOMaterials(SEED_BOMS[1], 200000), materialsIssued: false },
  { id: "wo-3", bomId: "bom-1", bomName: "Paracetamol 500mg Tablet", productCode: "FG-PARA500-T", quantity: 300000, priority: "HIGH", status: "COMPLETED", startDate: "2026-02-01", endDate: "2026-03-01", assignedTo: "Production Line A",
    materials: calcWOMaterials(SEED_BOMS[0], 300000), materialsIssued: true },
  { id: "wo-4", bomId: "bom-4", bomName: "Vitamin C Effervescent 1000mg", productCode: "FG-VITC-EFF", quantity: 50000, priority: "MEDIUM", status: "IN_PROGRESS", startDate: "2026-03-10", endDate: "2026-04-10", assignedTo: "Production Line C",
    materials: calcWOMaterials(SEED_BOMS[3], 50000), materialsIssued: true },
  { id: "wo-5", bomId: "bom-1", bomName: "Paracetamol 500mg Tablet", productCode: "FG-PARA500-T", quantity: 250000, priority: "LOW", status: "PLANNED", startDate: "2026-05-01", endDate: "2026-05-30", assignedTo: "Production Line A",
    materials: calcWOMaterials(SEED_BOMS[0], 250000), materialsIssued: false },
];

const statusColor: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800", ACTIVE: "bg-green-100 text-green-800", OBSOLETE: "bg-red-100 text-red-800",
  PLANNED: "bg-blue-100 text-blue-800", IN_PROGRESS: "bg-purple-100 text-purple-800", COMPLETED: "bg-green-100 text-green-800", CANCELLED: "bg-red-100 text-red-800",
};
const priorityColor: Record<string, string> = { LOW: "bg-gray-100 text-gray-800", MEDIUM: "bg-blue-100 text-blue-800", HIGH: "bg-orange-100 text-orange-800", URGENT: "bg-red-100 text-red-800" };

export default function ManufacturingPage() {
  const store = useApiDataStore();
  const crossModule = useCrossModuleActions();
  const [boms, setBoms] = useState<BOM[]>(SEED_BOMS);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(SEED_WO);
  const [filters, setFilters] = useState<FilterState>({});
  const [search, setSearch] = useState("");

  const [bomFormOpen, setBomFormOpen] = useState(false);
  const [editingBom, setEditingBom] = useState<BOM | null>(null);
  const [woFormOpen, setWoFormOpen] = useState(false);
  const [editingWo, setEditingWo] = useState<WorkOrder | null>(null);

  /* ─── Detail view state ─── */
  const [detailWO, setDetailWO] = useState<WorkOrder | null>(null);
  const [detailBOM, setDetailBOM] = useState<BOM | null>(null);

  /* ─── BOM Materials editor state ─── */
  const [materialsModalOpen, setMaterialsModalOpen] = useState(false);
  const [materialsTarget, setMaterialsTarget] = useState<BOM | null>(null);
  const [editMaterials, setEditMaterials] = useState<BOMItem[]>([]);

  let _n = Date.now();
  const genId = (p: string) => `${p}-${(_n++).toString(36).slice(-6)}`;

  const filteredWO = useMemo(() => {
    return workOrders.filter((w) => {
      if (search && !w.bomName.toLowerCase().includes(search.toLowerCase())) return false;
      if (filters.status && w.status !== filters.status) return false;
      if (filters.priority && w.priority !== filters.priority) return false;
      return true;
    });
  }, [workOrders, search, filters]);

  /* ─── BOM CRUD ─── */
  const productOptions = store.products.map((p) => ({ label: `${p.name} ${p.strength} (${p.code})`, value: p.id }));

  const bomFields: EntityField[] = [
    { name: "name", label: "BOM Name", type: "text", required: true },
    { name: "productId", label: "Product", type: "select", required: true, options: productOptions },
    { name: "version", label: "Version", type: "text", required: true, defaultValue: "1.0" },
    { name: "status", label: "Status", type: "select", required: true, options: [{ label: "Draft", value: "DRAFT" }, { label: "Active", value: "ACTIVE" }, { label: "Obsolete", value: "OBSOLETE" }] },
    { name: "batchSize", label: "Batch Size", type: "number", required: true },
    { name: "batchUnit", label: "Batch Unit", type: "text", required: true, defaultValue: "tablets" },
  ];

  function handleCreateBom() { setEditingBom(null); setBomFormOpen(true); }
  function handleEditBom(b: BOM) { setEditingBom(b); setBomFormOpen(true); }
  function handleBomSubmit(data: EntityFormData) {
    const prod = store.products.find((p) => p.id === String(data.productId));
    const productCode = prod?.code ?? "";
    const productName = prod ? `${prod.name} ${prod.strength}` : "";
    if (editingBom) {
      setBoms((prev) => prev.map((b) => b.id === editingBom.id ? { ...b, name: String(data.name), productCode, productName, version: String(data.version), status: data.status as BOM["status"], batchSize: Number(data.batchSize), batchUnit: String(data.batchUnit) } : b));
    } else {
      setBoms((prev) => [...prev, { id: genId("bom"), name: String(data.name), productCode, productName, version: String(data.version), status: (data.status as BOM["status"]) || "DRAFT", batchSize: Number(data.batchSize), batchUnit: String(data.batchUnit), materials: [] }]);
    }
    setBomFormOpen(false); setEditingBom(null);
  }
  function handleDeleteBom(b: BOM) { setBoms((prev) => prev.filter((x) => x.id !== b.id)); }

  /* ─── Materials management ─── */
  function handleOpenMaterials(b: BOM) {
    setMaterialsTarget(b);
    setEditMaterials([...b.materials]);
    setMaterialsModalOpen(true);
  }
  function handleAddMaterial() {
    setEditMaterials((prev) => [...prev, { materialCode: "", materialName: "", quantity: 0, unit: "kg" }]);
  }
  function handleAddMaterialFromProduct(productId: string) {
    const prod = store.products.find((p) => p.id === productId);
    if (!prod) return;
    setEditMaterials((prev) => [...prev, { materialCode: prod.code, materialName: `${prod.name} ${prod.strength}`, quantity: 0, unit: "kg" }]);
  }
  function handleRemoveMaterial(idx: number) {
    setEditMaterials((prev) => prev.filter((_, i) => i !== idx));
  }
  function handleMaterialChange(idx: number, field: keyof BOMItem, value: string | number) {
    setEditMaterials((prev) => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  }
  function handleSaveMaterials() {
    if (!materialsTarget) return;
    setBoms((prev) => prev.map((b) => b.id === materialsTarget.id ? { ...b, materials: editMaterials } : b));
    setMaterialsModalOpen(false);
    setMaterialsTarget(null);
  }

  /* ─── Material Issue / Completion state ─── */
  const [stockWarningOpen, setStockWarningOpen] = useState(false);
  const [stockWarningWO, setStockWarningWO] = useState<WorkOrder | null>(null);
  const [stockWarningItems, setStockWarningItems] = useState<Array<{ materialCode: string; materialName: string; required: number; available: number; unit: string }>>([]);
  const [completionSummaryOpen, setCompletionSummaryOpen] = useState(false);
  const [completionSummary, setCompletionSummary] = useState<{ woId: string; productName: string; quantityProduced: number; materialsConsumed: WOMaterial[] } | null>(null);

  /** Find store product by material code */
  function findProductByCode(code: string) {
    return (store.products || []).find((p) => p.code === code);
  }

  /** Check stock availability for a WO's materials */
  function checkStockForWO(wo: WorkOrder): Array<{ materialCode: string; materialName: string; required: number; available: number; unit: string }> {
    return (wo.materials || []).map((m) => {
      const prod = findProductByCode(m.materialCode);
      const available = prod ? (prod.stockQty ?? 0) : 0;
      return { materialCode: m.materialCode, materialName: m.materialName, required: m.requiredQty ?? 0, available, unit: m.unit };
    }).filter((item) => item.available < item.required);
  }

  /** Deduct raw materials from inventory for a WO */
  function issueMaterials(wo: WorkOrder): WOMaterial[] {
    const issuedMats: WOMaterial[] = [];
    for (const m of (wo.materials || [])) {
      const prod = findProductByCode(m.materialCode);
      if (prod) {
        const currentStock = prod.stockQty ?? 0;
        const deduction = m.requiredQty ?? 0;
        const newQty = Math.max(0, currentStock - deduction);
        store.update("products", prod.id, { stockQty: newQty });
      }
      issuedMats.push({ ...m, issuedQty: m.requiredQty ?? 0, availableStock: (findProductByCode(m.materialCode)?.stockQty ?? 0) });
    }
    return issuedMats;
  }

  /** Start production: check stock, issue materials, update WO status */
  function handleStartProduction(wo: WorkOrder) {
    const insufficientItems = checkStockForWO(wo);
    if (insufficientItems.length > 0) {
      setStockWarningWO(wo);
      setStockWarningItems(insufficientItems);
      setStockWarningOpen(true);
      return;
    }
    executeStartProduction(wo);
  }

  function executeStartProduction(wo: WorkOrder) {
    const issuedMats = issueMaterials(wo);
    setWorkOrders((prev) => prev.map((x) =>
      x.id === wo.id
        ? { ...x, status: "IN_PROGRESS" as const, materialsIssued: true, materials: issuedMats }
        : x
    ));
    // Refresh detail if open
    if (detailWO?.id === wo.id) {
      setDetailWO({ ...wo, status: "IN_PROGRESS", materialsIssued: true, materials: issuedMats });
    }
    setStockWarningOpen(false);
    setStockWarningWO(null);
    crossModule.onWorkOrderInProgress(wo);
  }

  /** Complete production: add finished goods to inventory */
  function handleCompleteProduction(wo: WorkOrder) {
    const bom = boms.find((b) => b.id === wo.bomId);
    // Add finished goods to inventory
    const finishedProd = findProductByCode(wo.productCode);
    if (finishedProd) {
      const currentStock = finishedProd.stockQty ?? 0;
      store.update("products", finishedProd.id, { stockQty: currentStock + (wo.quantity ?? 0) });
    }
    const completedWO = { ...wo, status: "COMPLETED" as const, endDate: new Date().toISOString().split("T")[0] };
    setWorkOrders((prev) => prev.map((x) => x.id === wo.id ? completedWO : x));
    // Show completion summary
    setCompletionSummary({
      woId: wo.id,
      productName: bom?.productName ?? wo.bomName,
      quantityProduced: wo.quantity ?? 0,
      materialsConsumed: wo.materials || [],
    });
    setCompletionSummaryOpen(true);
    // Refresh detail if open
    if (detailWO?.id === wo.id) {
      setDetailWO(completedWO);
    }
    crossModule.onWorkOrderCompleted(wo);
  }

  /* ─── WO CRUD ─── */
  const [woBomId, setWoBomId] = useState("");
  const [woQuantity, setWoQuantity] = useState(0);
  const [woPriority, setWoPriority] = useState<WorkOrder["priority"]>("MEDIUM");
  const [woStatus, setWoStatus] = useState<WorkOrder["status"]>("PLANNED");
  const [woStartDate, setWoStartDate] = useState("");
  const [woEndDate, setWoEndDate] = useState("");
  const [woAssignedTo, setWoAssignedTo] = useState("");
  const [woNotes, setWoNotes] = useState("");

  // Live materials preview
  const woPreviewBom = boms.find((b) => b.id === woBomId);
  const woPreviewMaterials: WOMaterial[] = useMemo(() => {
    if (!woPreviewBom || woQuantity <= 0) return [];
    return calcWOMaterials(woPreviewBom, woQuantity);
  }, [woBomId, woQuantity, woPreviewBom]);

  function handleCreateWO() {
    setEditingWo(null);
    setWoBomId(""); setWoQuantity(0); setWoPriority("MEDIUM"); setWoStatus("PLANNED");
    setWoStartDate(""); setWoEndDate(""); setWoAssignedTo(""); setWoNotes("");
    setWoFormOpen(true);
  }
  function handleEditWO(w: WorkOrder) {
    setEditingWo(w);
    setWoBomId(w.bomId); setWoQuantity(w.quantity); setWoPriority(w.priority); setWoStatus(w.status);
    setWoStartDate(w.startDate); setWoEndDate(w.endDate); setWoAssignedTo(w.assignedTo); setWoNotes(w.notes || "");
    setWoFormOpen(true);
  }
  function handleWOSubmit() {
    if (!woBomId || woQuantity <= 0 || !woStartDate || !woAssignedTo) return;
    const bom = boms.find((b) => b.id === woBomId);
    const ratio = bom ? woQuantity / bom.batchSize : 1;
    const materials: WOMaterial[] = bom ? bom.materials.map((m) => ({
      materialCode: m.materialCode,
      materialName: m.materialName,
      requiredQty: Math.ceil(m.quantity * ratio * 100) / 100,
      unit: m.unit,
    })) : [];

    if (editingWo) {
      setWorkOrders((prev) => prev.map((w) => w.id === editingWo.id ? { ...w, bomId: woBomId, bomName: bom?.name || w.bomName, productCode: bom?.productCode || w.productCode, quantity: woQuantity, priority: woPriority, status: woStatus, startDate: woStartDate, endDate: woEndDate, assignedTo: woAssignedTo, notes: woNotes || undefined, materials, materialsIssued: w.materialsIssued } : w));
    } else {
      const newWo = { id: genId("wo"), bomId: woBomId, bomName: bom?.name || "—", productCode: bom?.productCode || "", quantity: woQuantity, priority: woPriority, status: "PLANNED" as const, startDate: woStartDate, endDate: woEndDate, assignedTo: woAssignedTo, notes: woNotes || undefined, materials, materialsIssued: false };
      setWorkOrders((prev) => [...prev, newWo]);
      crossModule.onWorkOrderValidateMaterials(newWo);
    }
    setWoFormOpen(false); setEditingWo(null);
  }
  function handleDeleteWO(w: WorkOrder) { setWorkOrders((prev) => prev.filter((x) => x.id !== w.id)); }

  return (
    <div className="space-y-6">
      <PageHeader title="Manufacturing" description="Bill of Materials, work orders, and production management"
        actions={<Button onClick={handleCreateWO}><Plus className="h-4 w-4 mr-2" />New Work Order</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={ClipboardList} title="Active BOMs" value={boms.filter((b) => b.status === "ACTIVE").length} iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={Factory} title="Work Orders" value={workOrders.length} iconColor="bg-purple-100 text-purple-600" />
        <StatsCard icon={Play} title="In Progress" value={workOrders.filter((w) => w.status === "IN_PROGRESS").length} iconColor="bg-orange-100 text-orange-600" />
        <StatsCard icon={CheckCircle} title="Completed" value={workOrders.filter((w) => w.status === "COMPLETED").length} iconColor="bg-green-100 text-green-600" />
      </div>

      <Tabs defaultValue="bom">
        <TabsList>
          <TabsTrigger value="bom"><Layers className="h-3.5 w-3.5 mr-1.5" />Bill of Materials ({boms.length})</TabsTrigger>
          <TabsTrigger value="workorders"><Factory className="h-3.5 w-3.5 mr-1.5" />Work Orders ({workOrders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="bom" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={handleCreateBom}><Plus className="h-3.5 w-3.5 mr-1" />Add BOM</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boms.map((b) => {
              const woCount = workOrders.filter((w) => w.bomId === b.id).length;
              return (
                <Card key={b.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{b.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{b.productName} ({b.productCode})</p>
                      </div>
                      <EditDeleteMenu onEdit={() => handleEditBom(b)} onDelete={() => handleDeleteBom(b)} onView={() => setDetailBOM(b)} canView itemLabel={b.name} compact />
                    </div>
                    <div className="mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[b.status]}`}>{b.status}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                      <span>v{b.version}</span>
                      <span>{b.materials.length} materials</span>
                      <span>{woCount} orders</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Batch: {b.batchSize.toLocaleString()} {b.batchUnit}</span>
                      <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => handleOpenMaterials(b)}>
                        <Plus className="h-3 w-3 mr-1" />Materials
                      </Button>
                    </div>
                    {b.materials.length > 0 && (
                      <div className="mt-3 border-t pt-2">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Materials:</p>
                        {b.materials.map((m, i) => (
                          <div key={i} className="flex justify-between text-xs text-muted-foreground">
                            <span>{m.materialName}</span>
                            <span className="font-medium">{m.quantity} {m.unit}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="workorders" className="space-y-3">
          <FilterBar searchPlaceholder="Search by BOM name..." searchValue={search} onSearchChange={setSearch}
            fields={[
              { key: "status", label: "Status", type: "select", options: [{ label: "Planned", value: "PLANNED" }, { label: "In Progress", value: "IN_PROGRESS" }, { label: "Completed", value: "COMPLETED" }, { label: "Cancelled", value: "CANCELLED" }] },
              { key: "priority", label: "Priority", type: "select", options: [{ label: "Low", value: "LOW" }, { label: "Medium", value: "MEDIUM" }, { label: "High", value: "HIGH" }, { label: "Urgent", value: "URGENT" }] },
            ]}
            values={filters} onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))}
            rightSlot={<Button size="sm" onClick={handleCreateWO}><Plus className="h-3.5 w-3.5 mr-1" />New Work Order</Button>} />

          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "bomName", label: "BOM / Assembly", render: (v) => <span className="font-medium">{v as string}</span> },
                  { key: "quantity", label: "Quantity", className: "text-right", render: (v) => <span className="font-medium">{((v as number) ?? 0).toLocaleString()}</span> },
                  { key: "priority", label: "Priority", render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColor[v as string]}`}>{v as string}</span> },
                  { key: "assignedTo", label: "Assigned To", className: "text-xs" },
                  { key: "startDate", label: "Start", className: "text-xs" },
                  { key: "endDate", label: "End", className: "text-xs", render: (v) => <>{(v as string) || "—"}</> },
                  { key: "status", label: "Status", render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[v as string]}`}>{v as string}</span> },
                  { key: "id", label: "Actions", className: "text-right", render: (_v, row) => {
                    const w = row as unknown as WorkOrder;
                    return (
                      <EditDeleteMenu onEdit={() => handleEditWO(w)} onDelete={() => handleDeleteWO(w)} onView={() => setDetailWO(w)} canView itemLabel={`WO: ${w.bomName}`} compact
                        extraItems={[
                          ...(w.status === "PLANNED" ? [{ label: "Start Production", onClick: () => handleStartProduction(w), icon: <Play className="h-3.5 w-3.5 text-orange-600" /> }] : []),
                          ...(w.status === "IN_PROGRESS" ? [{ label: "Mark Complete", onClick: () => handleCompleteProduction(w), icon: <CheckCircle className="h-3.5 w-3.5 text-green-600" /> }] : []),
                        ]} />
                    );
                  }},
                ] satisfies Column<Record<string, unknown>>[]}
                data={filteredWO as unknown as Record<string, unknown>[]}
                
                exportable exportFilename="erp-manufacturing.csv" emptyMessage="No work orders match your filters."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EntityFormModal open={bomFormOpen} onOpenChange={setBomFormOpen}
        title={editingBom ? `Edit ${editingBom.name}` : "Add Bill of Materials"} fields={bomFields}
        initialData={editingBom ? { name: editingBom.name, productId: store.products.find((p) => p.code === editingBom.productCode)?.id ?? "", version: editingBom.version, status: editingBom.status, batchSize: editingBom.batchSize, batchUnit: editingBom.batchUnit } : undefined}
        onSubmit={handleBomSubmit} submitLabel={editingBom ? "Save" : "Create"} size="lg" />

      {/* ── WO Form Dialog (with materials preview) ── */}
      <Dialog open={woFormOpen} onOpenChange={(open) => { setWoFormOpen(open); if (!open) setEditingWo(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingWo ? "Edit Work Order" : "New Work Order"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block text-sm">BOM</Label>
                <Select value={woBomId} onValueChange={setWoBomId}>
                  <SelectTrigger><SelectValue placeholder="Select BOM..." /></SelectTrigger>
                  <SelectContent>
                    {boms.filter((b) => b.status === "ACTIVE").map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Quantity</Label>
                <Input type="number" min={1} value={woQuantity || ""} onChange={(e) => setWoQuantity(Math.max(0, Number(e.target.value)))} placeholder="e.g. 500000" />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Priority</Label>
                <Select value={woPriority} onValueChange={(v) => setWoPriority(v as WorkOrder["priority"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingWo && (
                <div>
                  <Label className="mb-1.5 block text-sm">Status</Label>
                  <Select value={woStatus} onValueChange={(v) => setWoStatus(v as WorkOrder["status"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLANNED">Planned</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="mb-1.5 block text-sm">Start Date</Label>
                <Input type="date" value={woStartDate} onChange={(e) => setWoStartDate(e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">End Date</Label>
                <Input type="date" value={woEndDate} onChange={(e) => setWoEndDate(e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Assigned To</Label>
                <Input value={woAssignedTo} onChange={(e) => setWoAssignedTo(e.target.value)} placeholder="Production Line A" />
              </div>
              <div className="col-span-2">
                <Label className="mb-1.5 block text-sm">Notes</Label>
                <Input value={woNotes} onChange={(e) => setWoNotes(e.target.value)} placeholder="Optional notes..." />
              </div>
            </div>

            {/* Required Materials Preview */}
            {woPreviewMaterials.length > 0 && (
              <div>
                <Label className="text-sm font-semibold mb-2 block">
                  Required Materials
                  {woPreviewBom && <span className="font-normal text-muted-foreground ml-1">(scaled from batch of {woPreviewBom.batchSize.toLocaleString()} to {woQuantity.toLocaleString()})</span>}
                </Label>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-3 py-2 font-medium">Code</th>
                        <th className="text-left px-3 py-2 font-medium">Material</th>
                        <th className="text-right px-3 py-2 font-medium">Required Qty</th>
                        <th className="text-left px-3 py-2 font-medium">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {woPreviewMaterials.map((m, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-mono text-xs">{m.materialCode}</td>
                          <td className="px-3 py-2">{m.materialName}</td>
                          <td className="px-3 py-2 text-right font-medium">{m.requiredQty}</td>
                          <td className="px-3 py-2 text-muted-foreground">{m.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setWoFormOpen(false); setEditingWo(null); }}>Cancel</Button>
            <Button type="button" onClick={handleWOSubmit} disabled={!woBomId || woQuantity <= 0 || !woStartDate || !woAssignedTo}>
              {editingWo ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Materials modal */}
      <Dialog open={materialsModalOpen} onOpenChange={setMaterialsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Materials — {materialsTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="mb-1.5 block text-sm">Add from Product Catalog</Label>
                <Select onValueChange={(v) => handleAddMaterialFromProduct(v)}>
                  <SelectTrigger><SelectValue placeholder="Select product..." /></SelectTrigger>
                  <SelectContent>
                    {store.products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} {p.strength} ({p.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddMaterial}>
                <Plus className="h-3.5 w-3.5 mr-1" />Custom Material
              </Button>
            </div>

            {editMaterials.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No materials added yet. Use the dropdown or button above to add materials.</p>
            )}

            {editMaterials.map((m, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_100px_80px_auto] gap-2 items-end">
                <div>
                  <Label className="text-xs">Code</Label>
                  <Input value={m.materialCode} onChange={(e) => handleMaterialChange(idx, "materialCode", e.target.value)} placeholder="e.g. API-001" className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input value={m.materialName} onChange={(e) => handleMaterialChange(idx, "materialName", e.target.value)} placeholder="Material name" className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Qty</Label>
                  <Input type="number" value={m.quantity} onChange={(e) => handleMaterialChange(idx, "quantity", Number(e.target.value))} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Unit</Label>
                  <Input value={m.unit} onChange={(e) => handleMaterialChange(idx, "unit", e.target.value)} className="h-8 text-sm" />
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleRemoveMaterial(idx)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMaterialsModalOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSaveMaterials}>Save Materials</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Work Order Detail Dialog ── */}
      <Dialog open={!!detailWO} onOpenChange={(open) => { if (!open) setDetailWO(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Work Order {detailWO?.id}</DialogTitle>
          </DialogHeader>
          {detailWO && (() => {
            const bom = boms.find((b) => b.id === detailWO.bomId);
            const woStatusSteps: WorkOrder["status"][] = ["PLANNED", "IN_PROGRESS", "COMPLETED"];
            const currentIdx = woStatusSteps.indexOf(detailWO.status);
            const startD = new Date(detailWO.startDate);
            const endD = detailWO.endDate ? new Date(detailWO.endDate) : null;
            const now = new Date();
            const totalDuration = endD ? endD.getTime() - startD.getTime() : 0;
            const elapsed = now.getTime() - startD.getTime();
            const timelinePct = totalDuration > 0 ? Math.min(Math.max(Math.round((elapsed / totalDuration) * 100), 0), 100) : 0;
            return (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-sm text-muted-foreground">BOM</span><p className="font-medium">{detailWO.bomName}</p></div>
                  <div><span className="text-sm text-muted-foreground">Quantity</span><p className="font-medium">{detailWO.quantity.toLocaleString()}</p></div>
                  <div><span className="text-sm text-muted-foreground">Priority</span><p><span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColor[detailWO.priority]}`}>{detailWO.priority}</span></p></div>
                  <div><span className="text-sm text-muted-foreground">Status</span><p><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[detailWO.status]}`}>{detailWO.status}</span></p></div>
                  <div><span className="text-sm text-muted-foreground">Start Date</span><p className="font-medium">{detailWO.startDate}</p></div>
                  <div><span className="text-sm text-muted-foreground">End Date</span><p className="font-medium">{detailWO.endDate || "Not set"}</p></div>
                  <div><span className="text-sm text-muted-foreground">Assigned To</span><p className="font-medium">{detailWO.assignedTo}</p></div>
                  {detailWO.notes && <div className="col-span-2"><span className="text-sm text-muted-foreground">Notes</span><p className="font-medium">{detailWO.notes}</p></div>}
                </div>
                {/* Status Progression */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Status Progression</h4>
                  <div className="flex items-center gap-2">
                    {woStatusSteps.map((step, i) => {
                      const isActive = detailWO.status === "CANCELLED" ? false : i <= currentIdx;
                      const isCurrent = step === detailWO.status;
                      return (
                        <div key={step} className="flex items-center gap-2 flex-1">
                          <div className="flex flex-col items-center flex-1">
                            <div className={`h-3 w-3 rounded-full border-2 ${isCurrent ? "bg-primary border-primary" : isActive ? "bg-primary/60 border-primary/60" : "bg-muted border-muted-foreground/30"}`} />
                            <span className={`text-[10px] mt-1 text-center ${isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{step.replace(/_/g, " ")}</span>
                          </div>
                          {i < woStatusSteps.length - 1 && <div className={`h-0.5 flex-1 -mt-4 ${isActive && i < currentIdx ? "bg-primary/60" : "bg-muted"}`} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Production Timeline */}
                {detailWO.endDate && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Production Timeline</span>
                      <span className="font-medium">{timelinePct}% elapsed</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${timelinePct}%` }} />
                    </div>
                  </div>
                )}
                {/* Material Issue Section */}
                {(detailWO.materials || []).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      {detailWO.materialsIssued ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          Material Issue — Issued
                        </>
                      ) : (
                        <>
                          <Package className="h-4 w-4 text-blue-600" />
                          Material Issue — Pending
                        </>
                      )}
                      <span className="font-normal text-muted-foreground ml-1">({(detailWO.materials || []).length} components)</span>
                      {bom && <span className="font-normal text-muted-foreground">(scaled from batch of {bom.batchSize.toLocaleString()} to {(detailWO.quantity ?? 0).toLocaleString()})</span>}
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left px-3 py-2 font-medium">Code</th>
                            <th className="text-left px-3 py-2 font-medium">Material</th>
                            <th className="text-right px-3 py-2 font-medium">Required</th>
                            <th className="text-right px-3 py-2 font-medium">Available</th>
                            {detailWO.materialsIssued && <th className="text-right px-3 py-2 font-medium">Issued</th>}
                            <th className="text-center px-3 py-2 font-medium">Status</th>
                            <th className="text-left px-3 py-2 font-medium">Unit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {(detailWO.materials || []).map((m, i) => {
                            const prod = (store.products || []).find((p) => p.code === m.materialCode);
                            const available = prod ? (prod.stockQty ?? 0) : (m.availableStock ?? 0);
                            const required = m.requiredQty ?? 0;
                            const isSufficient = available >= required || detailWO.materialsIssued;
                            return (
                              <tr key={i} className={!isSufficient && !detailWO.materialsIssued ? "bg-red-50" : ""}>
                                <td className="px-3 py-2 font-mono text-xs">{m.materialCode}</td>
                                <td className="px-3 py-2">{m.materialName}</td>
                                <td className="px-3 py-2 text-right font-medium">{required}</td>
                                <td className="px-3 py-2 text-right font-medium">{available.toLocaleString()}</td>
                                {detailWO.materialsIssued && <td className="px-3 py-2 text-right font-medium text-green-700">{m.issuedQty ?? required}</td>}
                                <td className="px-3 py-2 text-center">
                                  {detailWO.materialsIssued ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      <CheckCircle2 className="h-3 w-3" /> Issued
                                    </span>
                                  ) : isSufficient ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      <CheckCircle2 className="h-3 w-3" /> Sufficient
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      <AlertTriangle className="h-3 w-3" /> Insufficient
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">{m.unit}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {/* Completion Summary (shown when WO is COMPLETED) */}
                {detailWO.status === "COMPLETED" && (
                  <div className="border rounded-lg p-4 bg-green-50">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-green-800">
                      <CheckCircle className="h-4 w-4" /> Production Completed
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Finished Product</span>
                        <p className="font-medium">{bom?.productName ?? detailWO.bomName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Quantity Produced</span>
                        <p className="font-medium">{(detailWO.quantity ?? 0).toLocaleString()}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Materials Consumed</span>
                        <div className="mt-1 space-y-1">
                          {(detailWO.materials || []).map((m, i) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span>{m.materialName}</span>
                              <span className="font-medium">{m.issuedQty ?? (m.requiredQty ?? 0)} {m.unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* Action buttons in detail view */}
                {detailWO.status === "PLANNED" && (
                  <div className="flex justify-end pt-2">
                    <Button size="sm" onClick={() => handleStartProduction(detailWO)}>
                      <Play className="h-3.5 w-3.5 mr-1.5" /> Start Production
                    </Button>
                  </div>
                )}
                {detailWO.status === "IN_PROGRESS" && (
                  <div className="flex justify-end pt-2">
                    <Button size="sm" onClick={() => handleCompleteProduction(detailWO)}>
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Mark Complete
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── BOM Detail Dialog ── */}
      <Dialog open={!!detailBOM} onOpenChange={(open) => { if (!open) setDetailBOM(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailBOM?.name}</DialogTitle>
          </DialogHeader>
          {detailBOM && (() => {
            const woForBom = workOrders.filter((w) => w.bomId === detailBOM.id);
            return (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-sm text-muted-foreground">BOM ID</span><p className="font-medium font-mono">{detailBOM.id}</p></div>
                  <div><span className="text-sm text-muted-foreground">Version</span><p className="font-medium">v{detailBOM.version}</p></div>
                  <div><span className="text-sm text-muted-foreground">Product</span><p className="font-medium">{detailBOM.productName}</p></div>
                  <div><span className="text-sm text-muted-foreground">Product Code</span><p className="font-medium font-mono">{detailBOM.productCode}</p></div>
                  <div><span className="text-sm text-muted-foreground">Batch Size</span><p className="font-medium">{detailBOM.batchSize.toLocaleString()} {detailBOM.batchUnit}</p></div>
                  <div><span className="text-sm text-muted-foreground">Status</span><p><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[detailBOM.status]}`}>{detailBOM.status}</span></p></div>
                </div>
                {/* Materials Breakdown */}
                {detailBOM.materials.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Materials Breakdown ({detailBOM.materials.length})</h4>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left px-3 py-2 font-medium">Code</th>
                            <th className="text-left px-3 py-2 font-medium">Material</th>
                            <th className="text-right px-3 py-2 font-medium">Quantity</th>
                            <th className="text-left px-3 py-2 font-medium">Unit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {detailBOM.materials.map((m, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2 font-mono text-xs">{m.materialCode}</td>
                              <td className="px-3 py-2">{m.materialName}</td>
                              <td className="px-3 py-2 text-right font-medium">{m.quantity}</td>
                              <td className="px-3 py-2 text-muted-foreground">{m.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground text-right">
                      Total materials: {detailBOM.materials.reduce((s, m) => s + m.quantity, 0)} {detailBOM.materials[0]?.unit ?? ""}
                    </div>
                  </div>
                )}
                {detailBOM.materials.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">No materials defined for this BOM yet.</p>
                )}
                {/* Related Work Orders */}
                {woForBom.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Related Work Orders ({woForBom.length})</h4>
                    <div className="border rounded-lg divide-y">
                      {woForBom.map((w) => (
                        <div key={w.id} className="flex items-center justify-between px-3 py-2 text-sm">
                          <div>
                            <span className="font-mono text-xs font-medium">{w.id}</span>
                            <span className="text-muted-foreground ml-2">{w.quantity.toLocaleString()} units</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColor[w.priority]}`}>{w.priority}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[w.status]}`}>{w.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Stock Warning Dialog ── */}
      <Dialog open={stockWarningOpen} onOpenChange={(open) => { if (!open) { setStockWarningOpen(false); setStockWarningWO(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" /> Insufficient Stock Warning
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              The following materials have insufficient stock to fulfill this work order. Production may be delayed or incomplete.
            </p>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-orange-50">
                    <th className="text-left px-3 py-2 font-medium">Material</th>
                    <th className="text-right px-3 py-2 font-medium">Required</th>
                    <th className="text-right px-3 py-2 font-medium">Available</th>
                    <th className="text-right px-3 py-2 font-medium">Deficit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(stockWarningItems || []).map((item, i) => (
                    <tr key={i} className="bg-red-50">
                      <td className="px-3 py-2">{item.materialName}</td>
                      <td className="px-3 py-2 text-right font-medium">{(item.required ?? 0).toLocaleString()} {item.unit}</td>
                      <td className="px-3 py-2 text-right font-medium">{(item.available ?? 0).toLocaleString()} {item.unit}</td>
                      <td className="px-3 py-2 text-right font-medium text-red-700">{((item.required ?? 0) - (item.available ?? 0)).toLocaleString()} {item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setStockWarningOpen(false); setStockWarningWO(null); }}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={() => { if (stockWarningWO) executeStartProduction(stockWarningWO); }}>
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Proceed Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Completion Summary Dialog ── */}
      <Dialog open={completionSummaryOpen} onOpenChange={(open) => { if (!open) { setCompletionSummaryOpen(false); setCompletionSummary(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" /> Work Order Completed
            </DialogTitle>
          </DialogHeader>
          {completionSummary && (
            <div className="space-y-4 py-2">
              <div className="border rounded-lg p-4 bg-green-50">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Work Order</span>
                    <p className="font-medium font-mono">{completionSummary.woId}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Product</span>
                    <p className="font-medium">{completionSummary.productName}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Quantity Produced</span>
                    <p className="font-semibold text-green-800 text-lg">+{(completionSummary.quantityProduced ?? 0).toLocaleString()} units added to inventory</p>
                  </div>
                </div>
              </div>
              {(completionSummary.materialsConsumed || []).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Materials Consumed</h4>
                  <div className="border rounded-lg divide-y">
                    {(completionSummary.materialsConsumed || []).map((m, i) => (
                      <div key={i} className="flex justify-between px-3 py-2 text-sm">
                        <span>{m.materialName}</span>
                        <span className="font-medium">{m.issuedQty ?? (m.requiredQty ?? 0)} {m.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" onClick={() => { setCompletionSummaryOpen(false); setCompletionSummary(null); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
