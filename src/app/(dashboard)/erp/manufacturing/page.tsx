"use client";

import { useMemo, useState } from "react";
import {
  Factory, ClipboardList, Play, CheckCircle, Plus, Package, Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import {
  EntityFormModal, type EntityField, type EntityFormData,
} from "@/components/shared/entity-form-modal";

/* ─── Types ─── */

interface BOMItem { materialCode: string; materialName: string; quantity: number; unit: string; }

interface BOM {
  id: string; name: string; productCode: string; productName: string;
  version: string; status: "DRAFT" | "ACTIVE" | "OBSOLETE";
  batchSize: number; batchUnit: string;
  materials: BOMItem[];
}

interface WorkOrder {
  id: string; bomId: string; bomName: string;
  quantity: number; priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  startDate: string; endDate: string;
  assignedTo: string; notes?: string;
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

const SEED_WO: WorkOrder[] = [
  { id: "wo-1", bomId: "bom-1", bomName: "Paracetamol 500mg Tablet", quantity: 500000, priority: "HIGH", status: "IN_PROGRESS", startDate: "2026-03-15", endDate: "2026-04-15", assignedTo: "Production Line A" },
  { id: "wo-2", bomId: "bom-2", bomName: "Amoxicillin 250mg Capsule", quantity: 200000, priority: "MEDIUM", status: "PLANNED", startDate: "2026-04-01", endDate: "2026-05-01", assignedTo: "Production Line B" },
  { id: "wo-3", bomId: "bom-1", bomName: "Paracetamol 500mg Tablet", quantity: 300000, priority: "HIGH", status: "COMPLETED", startDate: "2026-02-01", endDate: "2026-03-01", assignedTo: "Production Line A" },
  { id: "wo-4", bomId: "bom-4", bomName: "Vitamin C Effervescent 1000mg", quantity: 50000, priority: "MEDIUM", status: "IN_PROGRESS", startDate: "2026-03-10", endDate: "2026-04-10", assignedTo: "Production Line C" },
  { id: "wo-5", bomId: "bom-1", bomName: "Paracetamol 500mg Tablet", quantity: 250000, priority: "LOW", status: "PLANNED", startDate: "2026-05-01", endDate: "2026-05-30", assignedTo: "Production Line A" },
];

const statusColor: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800", ACTIVE: "bg-green-100 text-green-800", OBSOLETE: "bg-red-100 text-red-800",
  PLANNED: "bg-blue-100 text-blue-800", IN_PROGRESS: "bg-purple-100 text-purple-800", COMPLETED: "bg-green-100 text-green-800", CANCELLED: "bg-red-100 text-red-800",
};
const priorityColor: Record<string, string> = { LOW: "bg-gray-100 text-gray-800", MEDIUM: "bg-blue-100 text-blue-800", HIGH: "bg-orange-100 text-orange-800", URGENT: "bg-red-100 text-red-800" };

export default function ManufacturingPage() {
  const [boms, setBoms] = useState<BOM[]>(SEED_BOMS);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(SEED_WO);
  const [filters, setFilters] = useState<FilterState>({});
  const [search, setSearch] = useState("");

  const [bomFormOpen, setBomFormOpen] = useState(false);
  const [editingBom, setEditingBom] = useState<BOM | null>(null);
  const [woFormOpen, setWoFormOpen] = useState(false);
  const [editingWo, setEditingWo] = useState<WorkOrder | null>(null);

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
  const bomFields: EntityField[] = [
    { name: "name", label: "BOM Name", type: "text", required: true },
    { name: "productCode", label: "Product Code", type: "text", required: true },
    { name: "productName", label: "Product Name", type: "text", required: true },
    { name: "version", label: "Version", type: "text", required: true, defaultValue: "1.0" },
    { name: "status", label: "Status", type: "select", required: true, options: [{ label: "Draft", value: "DRAFT" }, { label: "Active", value: "ACTIVE" }, { label: "Obsolete", value: "OBSOLETE" }] },
    { name: "batchSize", label: "Batch Size", type: "number", required: true },
    { name: "batchUnit", label: "Batch Unit", type: "text", required: true, defaultValue: "tablets" },
  ];

  function handleCreateBom() { setEditingBom(null); setBomFormOpen(true); }
  function handleEditBom(b: BOM) { setEditingBom(b); setBomFormOpen(true); }
  function handleBomSubmit(data: EntityFormData) {
    if (editingBom) {
      setBoms((prev) => prev.map((b) => b.id === editingBom.id ? { ...b, name: String(data.name), productCode: String(data.productCode), productName: String(data.productName), version: String(data.version), status: data.status as BOM["status"], batchSize: Number(data.batchSize), batchUnit: String(data.batchUnit) } : b));
    } else {
      setBoms((prev) => [...prev, { id: genId("bom"), name: String(data.name), productCode: String(data.productCode), productName: String(data.productName), version: String(data.version), status: (data.status as BOM["status"]) || "DRAFT", batchSize: Number(data.batchSize), batchUnit: String(data.batchUnit), materials: [] }]);
    }
    setBomFormOpen(false); setEditingBom(null);
  }
  function handleDeleteBom(b: BOM) { setBoms((prev) => prev.filter((x) => x.id !== b.id)); }

  /* ─── WO CRUD ─── */
  const woFields: EntityField[] = [
    { name: "bomId", label: "BOM", type: "select", required: true, options: boms.filter((b) => b.status === "ACTIVE").map((b) => ({ label: b.name, value: b.id })) },
    { name: "quantity", label: "Quantity", type: "number", required: true },
    { name: "priority", label: "Priority", type: "select", required: true, options: [{ label: "Low", value: "LOW" }, { label: "Medium", value: "MEDIUM" }, { label: "High", value: "HIGH" }, { label: "Urgent", value: "URGENT" }] },
    { name: "status", label: "Status", type: "select", required: true, options: [{ label: "Planned", value: "PLANNED" }, { label: "In Progress", value: "IN_PROGRESS" }, { label: "Completed", value: "COMPLETED" }, { label: "Cancelled", value: "CANCELLED" }] },
    { name: "startDate", label: "Start Date", type: "date", required: true },
    { name: "endDate", label: "End Date", type: "date" },
    { name: "assignedTo", label: "Assigned To", type: "text", required: true, placeholder: "Production Line A" },
    { name: "notes", label: "Notes", type: "textarea", fullWidth: true },
  ];

  function handleCreateWO() { setEditingWo(null); setWoFormOpen(true); }
  function handleEditWO(w: WorkOrder) { setEditingWo(w); setWoFormOpen(true); }
  function handleWOSubmit(data: EntityFormData) {
    const bom = boms.find((b) => b.id === String(data.bomId));
    if (editingWo) {
      setWorkOrders((prev) => prev.map((w) => w.id === editingWo.id ? { ...w, bomId: String(data.bomId), bomName: bom?.name || w.bomName, quantity: Number(data.quantity), priority: data.priority as WorkOrder["priority"], status: data.status as WorkOrder["status"], startDate: String(data.startDate), endDate: String(data.endDate || ""), assignedTo: String(data.assignedTo), notes: data.notes ? String(data.notes) : undefined } : w));
    } else {
      setWorkOrders((prev) => [...prev, { id: genId("wo"), bomId: String(data.bomId), bomName: bom?.name || "—", quantity: Number(data.quantity), priority: (data.priority as WorkOrder["priority"]) || "MEDIUM", status: "PLANNED", startDate: String(data.startDate), endDate: String(data.endDate || ""), assignedTo: String(data.assignedTo), notes: data.notes ? String(data.notes) : undefined }]);
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
                      <EditDeleteMenu onEdit={() => handleEditBom(b)} onDelete={() => handleDeleteBom(b)} itemLabel={b.name} compact />
                    </div>
                    <div className="mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[b.status]}`}>{b.status}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                      <span>v{b.version}</span>
                      <span>{b.materials.length} materials</span>
                      <span>{woCount} orders</span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Batch: {b.batchSize.toLocaleString()} {b.batchUnit}
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b text-xs uppercase text-slate-600">
                    <tr>
                      <th className="text-left p-3">BOM / Assembly</th>
                      <th className="text-right p-3">Quantity</th>
                      <th className="text-left p-3">Priority</th>
                      <th className="text-left p-3">Assigned To</th>
                      <th className="text-left p-3">Start</th>
                      <th className="text-left p-3">End</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-right p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWO.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-slate-500">No work orders match your filters.</td></tr>}
                    {filteredWO.map((w) => (
                      <tr key={w.id} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-medium">{w.bomName}</td>
                        <td className="p-3 text-right font-medium">{w.quantity.toLocaleString()}</td>
                        <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColor[w.priority]}`}>{w.priority}</span></td>
                        <td className="p-3 text-xs">{w.assignedTo}</td>
                        <td className="p-3 text-xs">{w.startDate}</td>
                        <td className="p-3 text-xs">{w.endDate || "—"}</td>
                        <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[w.status]}`}>{w.status}</span></td>
                        <td className="p-3 text-right">
                          <EditDeleteMenu onEdit={() => handleEditWO(w)} onDelete={() => handleDeleteWO(w)} itemLabel={`WO: ${w.bomName}`} compact
                            extraItems={[
                              ...(w.status === "PLANNED" ? [{ label: "Start Production", onClick: () => setWorkOrders((prev) => prev.map((x) => x.id === w.id ? { ...x, status: "IN_PROGRESS" as const } : x)), icon: <Play className="h-3.5 w-3.5 text-orange-600" /> }] : []),
                              ...(w.status === "IN_PROGRESS" ? [{ label: "Mark Complete", onClick: () => setWorkOrders((prev) => prev.map((x) => x.id === w.id ? { ...x, status: "COMPLETED" as const, endDate: new Date().toISOString().split("T")[0] } : x)), icon: <CheckCircle className="h-3.5 w-3.5 text-green-600" /> }] : []),
                            ]} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EntityFormModal open={bomFormOpen} onOpenChange={setBomFormOpen}
        title={editingBom ? `Edit ${editingBom.name}` : "Add Bill of Materials"} fields={bomFields}
        initialData={editingBom ? { name: editingBom.name, productCode: editingBom.productCode, productName: editingBom.productName, version: editingBom.version, status: editingBom.status, batchSize: editingBom.batchSize, batchUnit: editingBom.batchUnit } : undefined}
        onSubmit={handleBomSubmit} submitLabel={editingBom ? "Save" : "Create"} size="lg" />

      <EntityFormModal open={woFormOpen} onOpenChange={setWoFormOpen}
        title={editingWo ? "Edit Work Order" : "New Work Order"} fields={woFields}
        initialData={editingWo ? { bomId: editingWo.bomId, quantity: editingWo.quantity, priority: editingWo.priority, status: editingWo.status, startDate: editingWo.startDate, endDate: editingWo.endDate, assignedTo: editingWo.assignedTo, notes: editingWo.notes || "" } : undefined}
        onSubmit={handleWOSubmit} submitLabel={editingWo ? "Save" : "Create"} size="lg" />
    </div>
  );
}
