"use client";

import { useMemo, useState } from "react";
import {
  Warehouse, PackageCheck, Truck, ClipboardList, Plus, ArrowDownToLine,
  ArrowUpFromLine, Grid3X3, ListChecks,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";

/* ─── Types ─── */

type InboundStatus = "Expected" | "Arrived" | "Receiving" | "Putaway" | "Completed";
type OutboundStatus = "Planned" | "Picking" | "Packing" | "Shipped";
type TaskStatus = "Pending" | "In Progress" | "Completed";

interface InboundOrder {
  id: string;
  asnNo: string;
  supplier: string;
  expectedDate: string;
  status: InboundStatus;
  dock: string;
  priority: "High" | "Medium" | "Low";
  items: number;
}

interface OutboundOrder {
  id: string;
  waveNo: string;
  orders: number;
  lines: number;
  status: OutboundStatus;
  priority: "High" | "Medium" | "Low";
  assignedTo: string;
  createdAt: string;
}

interface InventoryBin {
  id: string;
  zone: string;
  bin: string;
  sku: string;
  productName: string;
  qty: number;
  capacity: number;
}

interface WarehouseTask {
  id: string;
  taskId: string;
  type: "Putaway" | "Pick" | "Replenish" | "Cycle Count";
  location: string;
  status: TaskStatus;
  assignedTo: string;
  priority: "High" | "Medium" | "Low";
}

/* ─── Mock Data ─── */

const SEED_INBOUND: InboundOrder[] = [
  { id: "ib-1", asnNo: "ASN-2026-4501", supplier: "PharmaChem Suppliers", expectedDate: "2026-05-10", status: "Arrived", dock: "Dock 1", priority: "High", items: 12 },
  { id: "ib-2", asnNo: "ASN-2026-4502", supplier: "Global Raw Materials", expectedDate: "2026-05-11", status: "Expected", dock: "Dock 3", priority: "Medium", items: 8 },
  { id: "ib-3", asnNo: "ASN-2026-4498", supplier: "MedPack Solutions", expectedDate: "2026-05-09", status: "Putaway", dock: "Dock 2", priority: "Medium", items: 5 },
  { id: "ib-4", asnNo: "ASN-2026-4503", supplier: "ChemSource Ltd", expectedDate: "2026-05-12", status: "Expected", dock: "Dock 1", priority: "Low", items: 20 },
  { id: "ib-5", asnNo: "ASN-2026-4495", supplier: "BioTech Ingredients", expectedDate: "2026-05-08", status: "Completed", dock: "Dock 4", priority: "High", items: 3 },
  { id: "ib-6", asnNo: "ASN-2026-4504", supplier: "NovaChem Industries", expectedDate: "2026-05-10", status: "Receiving", dock: "Dock 2", priority: "High", items: 15 },
];

const SEED_OUTBOUND: OutboundOrder[] = [
  { id: "ob-1", waveNo: "WV-2026-0891", orders: 8, lines: 24, status: "Picking", priority: "High", assignedTo: "Team Alpha", createdAt: "2026-05-10 06:30" },
  { id: "ob-2", waveNo: "WV-2026-0892", orders: 5, lines: 15, status: "Planned", priority: "Medium", assignedTo: "Team Beta", createdAt: "2026-05-10 07:00" },
  { id: "ob-3", waveNo: "WV-2026-0890", orders: 12, lines: 38, status: "Packing", priority: "High", assignedTo: "Team Alpha", createdAt: "2026-05-09 22:00" },
  { id: "ob-4", waveNo: "WV-2026-0889", orders: 6, lines: 18, status: "Shipped", priority: "Medium", assignedTo: "Team Gamma", createdAt: "2026-05-09 14:00" },
  { id: "ob-5", waveNo: "WV-2026-0893", orders: 3, lines: 9, status: "Planned", priority: "Low", assignedTo: "Team Beta", createdAt: "2026-05-10 08:00" },
];

const SEED_INVENTORY: InventoryBin[] = [
  { id: "bin-1", zone: "A - Raw Materials", bin: "A-01-03", sku: "API-PARA-500", productName: "Paracetamol API", qty: 1200, capacity: 85 },
  { id: "bin-2", zone: "A - Raw Materials", bin: "A-02-01", sku: "API-AMOX-250", productName: "Amoxicillin Trihydrate", qty: 450, capacity: 60 },
  { id: "bin-3", zone: "B - Excipients", bin: "B-01-05", sku: "EXP-MCC-101", productName: "MCC 101", qty: 3200, capacity: 92 },
  { id: "bin-4", zone: "B - Excipients", bin: "B-02-02", sku: "EXP-LACT-200", productName: "Lactose 200M", qty: 1800, capacity: 75 },
  { id: "bin-5", zone: "C - Finished Goods", bin: "C-01-01", sku: "FG-PARA500-T", productName: "Paracetamol 500mg Tablet", qty: 50000, capacity: 45 },
  { id: "bin-6", zone: "C - Finished Goods", bin: "C-02-03", sku: "FG-AMOX250-C", productName: "Amoxicillin 250mg Capsule", qty: 28000, capacity: 70 },
  { id: "bin-7", zone: "D - Packaging", bin: "D-01-02", sku: "PKG-BLS-100", productName: "Blister Pack 10x10", qty: 15000, capacity: 55 },
  { id: "bin-8", zone: "A - Raw Materials", bin: "A-03-01", sku: "API-OMEZ-20", productName: "Omeprazole API", qty: 200, capacity: 30 },
];

const SEED_TASKS: WarehouseTask[] = [
  { id: "wt-1", taskId: "TSK-5001", type: "Putaway", location: "A-01-04", status: "In Progress", assignedTo: "Carlos M.", priority: "High" },
  { id: "wt-2", taskId: "TSK-5002", type: "Pick", location: "C-01-01", status: "Pending", assignedTo: "David L.", priority: "High" },
  { id: "wt-3", taskId: "TSK-5003", type: "Replenish", location: "B-01-05", status: "Pending", assignedTo: "Anna K.", priority: "Medium" },
  { id: "wt-4", taskId: "TSK-5004", type: "Cycle Count", location: "D-01-02", status: "In Progress", assignedTo: "Tom W.", priority: "Low" },
  { id: "wt-5", taskId: "TSK-5005", type: "Pick", location: "C-02-03", status: "Completed", assignedTo: "David L.", priority: "Medium" },
  { id: "wt-6", taskId: "TSK-5006", type: "Putaway", location: "A-02-02", status: "Pending", assignedTo: "Carlos M.", priority: "Medium" },
];

const inboundStatusColor: Record<InboundStatus, string> = {
  Expected: "bg-gray-100 text-gray-800",
  Arrived: "bg-blue-100 text-blue-800",
  Receiving: "bg-yellow-100 text-yellow-800",
  Putaway: "bg-purple-100 text-purple-800",
  Completed: "bg-green-100 text-green-800",
};

const outboundStatusColor: Record<OutboundStatus, string> = {
  Planned: "bg-gray-100 text-gray-800",
  Picking: "bg-yellow-100 text-yellow-800",
  Packing: "bg-blue-100 text-blue-800",
  Shipped: "bg-green-100 text-green-800",
};

const taskStatusColor: Record<TaskStatus, string> = {
  Pending: "bg-gray-100 text-gray-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Completed: "bg-green-100 text-green-800",
};

const priorityColor: Record<string, string> = {
  High: "bg-red-100 text-red-800",
  Medium: "bg-yellow-100 text-yellow-800",
  Low: "bg-gray-100 text-gray-800",
};

export default function WMSPage() {
  const [inbound, setInbound] = useState<InboundOrder[]>(SEED_INBOUND);
  const [outbound, setOutbound] = useState<OutboundOrder[]>(SEED_OUTBOUND);
  const [inventory] = useState<InventoryBin[]>(SEED_INVENTORY);
  const [tasks, setTasks] = useState<WarehouseTask[]>(SEED_TASKS);

  const [search, setSearch] = useState("");
  const [waveFormOpen, setWaveFormOpen] = useState(false);
  const [putawayConfirmOpen, setPutawayConfirmOpen] = useState(false);
  const [selectedInbound, setSelectedInbound] = useState<InboundOrder | null>(null);

  // Wave form state
  const [waveOrders, setWaveOrders] = useState(0);
  const [waveLines, setWaveLines] = useState(0);
  const [wavePriority, setWavePriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [waveAssignedTo, setWaveAssignedTo] = useState("");

  // Stats
  const pendingPutaway = inbound.filter((i) => i.status === "Arrived" || i.status === "Receiving").length;
  const openPickOrders = outbound.filter((o) => o.status === "Planned" || o.status === "Picking").length;
  const dockOccupancy = 62.5;
  const cycleCountAccuracy = 98.7;

  let _n = Date.now();
  const genWaveNo = () => `WV-2026-${String((_n++) % 10000).padStart(4, "0")}`;

  function handleConfirmPutaway(order: InboundOrder) {
    setSelectedInbound(order);
    setPutawayConfirmOpen(true);
  }
  function submitPutaway() {
    if (!selectedInbound) return;
    setInbound((prev) => prev.map((o) => o.id === selectedInbound.id ? { ...o, status: "Completed" as InboundStatus } : o));
    setPutawayConfirmOpen(false);
    setSelectedInbound(null);
  }

  function handleCreateWave() {
    setWaveOrders(0); setWaveLines(0); setWavePriority("Medium"); setWaveAssignedTo("");
    setWaveFormOpen(true);
  }
  function submitWave() {
    if (waveOrders <= 0 || waveLines <= 0 || !waveAssignedTo) return;
    const newWave: OutboundOrder = {
      id: `ob-${Date.now()}`,
      waveNo: genWaveNo(),
      orders: waveOrders,
      lines: waveLines,
      status: "Planned",
      priority: wavePriority,
      assignedTo: waveAssignedTo,
      createdAt: new Date().toISOString().replace("T", " ").slice(0, 16),
    };
    setOutbound((prev) => [newWave, ...prev]);
    setWaveFormOpen(false);
  }

  function handleReleasePick(wave: OutboundOrder) {
    setOutbound((prev) => prev.map((o) => o.id === wave.id ? { ...o, status: "Picking" as OutboundStatus } : o));
  }

  // Columns
  const inboundColumns: Column<Record<string, unknown>>[] = [
    { key: "asnNo", label: "ASN #", render: (v) => <span className="font-mono text-xs font-medium">{v as string}</span> },
    { key: "supplier", label: "Supplier", render: (v) => <span className="font-medium">{v as string}</span> },
    { key: "expectedDate", label: "Expected Date", render: (v) => <span className="text-xs">{v as string}</span> },
    { key: "status", label: "Status", render: (v) => <Badge className={inboundStatusColor[v as InboundStatus]}>{v as string}</Badge> },
    { key: "dock", label: "Dock" },
    { key: "priority", label: "Priority", render: (v) => <Badge className={priorityColor[v as string]}>{v as string}</Badge> },
    { key: "items", label: "Items", className: "text-right" },
    { key: "id", label: "Actions", className: "text-right", render: (_v, row) => {
      const o = row as unknown as InboundOrder;
      if (o.status === "Putaway" || o.status === "Arrived") {
        return (
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleConfirmPutaway(o)} title="Confirm Putaway">
            <PackageCheck className="h-3.5 w-3.5 text-green-600" />
          </Button>
        );
      }
      return null;
    }},
  ];

  const outboundColumns: Column<Record<string, unknown>>[] = [
    { key: "waveNo", label: "Wave #", render: (v) => <span className="font-mono text-xs font-medium">{v as string}</span> },
    { key: "orders", label: "Orders", className: "text-right" },
    { key: "lines", label: "Lines", className: "text-right" },
    { key: "status", label: "Status", render: (v) => <Badge className={outboundStatusColor[v as OutboundStatus]}>{v as string}</Badge> },
    { key: "priority", label: "Priority", render: (v) => <Badge className={priorityColor[v as string]}>{v as string}</Badge> },
    { key: "assignedTo", label: "Assigned To" },
    { key: "createdAt", label: "Created", render: (v) => <span className="text-xs">{v as string}</span> },
    { key: "id", label: "Actions", className: "text-right", render: (_v, row) => {
      const o = row as unknown as OutboundOrder;
      if (o.status === "Planned") {
        return (
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleReleasePick(o)} title="Release Pick">
            <ArrowUpFromLine className="h-3.5 w-3.5 text-blue-600" />
          </Button>
        );
      }
      return null;
    }},
  ];

  const inventoryColumns: Column<Record<string, unknown>>[] = [
    { key: "zone", label: "Zone", render: (v) => <span className="text-sm">{v as string}</span> },
    { key: "bin", label: "Bin", render: (v) => <span className="font-mono text-xs font-medium">{v as string}</span> },
    { key: "sku", label: "SKU", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
    { key: "productName", label: "Product", render: (v) => <span className="font-medium">{v as string}</span> },
    { key: "qty", label: "Qty", className: "text-right", render: (v) => <span>{((v as number) ?? 0).toLocaleString()}</span> },
    { key: "capacity", label: "Capacity %", className: "text-right", render: (v) => {
      const val = v as number;
      const color = val >= 90 ? "text-red-700" : val >= 70 ? "text-yellow-700" : "text-green-700";
      return <span className={`font-medium ${color}`}>{val}%</span>;
    }},
  ];

  const taskColumns: Column<Record<string, unknown>>[] = [
    { key: "taskId", label: "Task ID", render: (v) => <span className="font-mono text-xs font-medium">{v as string}</span> },
    { key: "type", label: "Type", render: (v) => <Badge variant="outline">{v as string}</Badge> },
    { key: "location", label: "Location", render: (v) => <span className="font-mono text-xs">{v as string}</span> },
    { key: "status", label: "Status", render: (v) => <Badge className={taskStatusColor[v as TaskStatus]}>{v as string}</Badge> },
    { key: "assignedTo", label: "Assigned To" },
    { key: "priority", label: "Priority", render: (v) => <Badge className={priorityColor[v as string]}>{v as string}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse Management System"
        description="Inbound receiving, outbound fulfillment, inventory control, and task management"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {}}>
              <ListChecks className="h-4 w-4 mr-2" />Cycle Count
            </Button>
            <Button onClick={handleCreateWave}>
              <Plus className="h-4 w-4 mr-2" />Create Wave
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={ArrowDownToLine} title="Pending Putaway" value={pendingPutaway} iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={ClipboardList} title="Open Pick Orders" value={openPickOrders} iconColor="bg-purple-100 text-purple-600" />
        <StatsCard icon={Truck} title="Dock Occupancy %" value={`${dockOccupancy}%`} iconColor="bg-orange-100 text-orange-600" />
        <StatsCard icon={Warehouse} title="Cycle Count Accuracy %" value={`${cycleCountAccuracy}%`} iconColor="bg-green-100 text-green-600" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="inbound">
        <TabsList>
          <TabsTrigger value="inbound"><ArrowDownToLine className="h-3.5 w-3.5 mr-1.5" />Inbound ({inbound.length})</TabsTrigger>
          <TabsTrigger value="outbound"><ArrowUpFromLine className="h-3.5 w-3.5 mr-1.5" />Outbound ({outbound.length})</TabsTrigger>
          <TabsTrigger value="inventory"><Grid3X3 className="h-3.5 w-3.5 mr-1.5" />Inventory ({inventory.length})</TabsTrigger>
          <TabsTrigger value="tasks"><ListChecks className="h-3.5 w-3.5 mr-1.5" />Tasks ({tasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="inbound" className="space-y-3">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={inboundColumns}
                data={inbound as unknown as Record<string, unknown>[]}
                exportable
                exportFilename="wms-inbound.csv"
                emptyMessage="No inbound orders."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outbound" className="space-y-3">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={outboundColumns}
                data={outbound as unknown as Record<string, unknown>[]}
                exportable
                exportFilename="wms-outbound.csv"
                emptyMessage="No outbound waves."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-3">
          <div className="flex items-center gap-3">
            <Input placeholder="Search by SKU or product..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
          </div>
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={inventoryColumns}
                data={(search ? inventory.filter((b) => b.sku.toLowerCase().includes(search.toLowerCase()) || b.productName.toLowerCase().includes(search.toLowerCase())) : inventory) as unknown as Record<string, unknown>[]}
                exportable
                exportFilename="wms-inventory.csv"
                emptyMessage="No inventory items found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-3">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={taskColumns}
                data={tasks as unknown as Record<string, unknown>[]}
                exportable
                exportFilename="wms-tasks.csv"
                emptyMessage="No tasks."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Wave Dialog */}
      <Dialog open={waveFormOpen} onOpenChange={setWaveFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Pick Wave</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block text-sm">Number of Orders</Label>
                <Input type="number" min={1} value={waveOrders || ""} onChange={(e) => setWaveOrders(Number(e.target.value))} />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Total Lines</Label>
                <Input type="number" min={1} value={waveLines || ""} onChange={(e) => setWaveLines(Number(e.target.value))} />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Priority</Label>
                <Select value={wavePriority} onValueChange={(v) => setWavePriority(v as "High" | "Medium" | "Low")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Assign To</Label>
                <Input value={waveAssignedTo} onChange={(e) => setWaveAssignedTo(e.target.value)} placeholder="Team Alpha" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWaveFormOpen(false)}>Cancel</Button>
            <Button onClick={submitWave} disabled={waveOrders <= 0 || waveLines <= 0 || !waveAssignedTo}>Create Wave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Putaway Dialog */}
      <Dialog open={putawayConfirmOpen} onOpenChange={setPutawayConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Putaway</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              Confirm putaway completion for <span className="font-medium text-foreground">{selectedInbound?.asnNo}</span> from {selectedInbound?.supplier}?
            </p>
            <p className="text-sm mt-2">This will mark {selectedInbound?.items} items as stored in their designated bin locations.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPutawayConfirmOpen(false)}>Cancel</Button>
            <Button onClick={submitPutaway}>Confirm Putaway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
