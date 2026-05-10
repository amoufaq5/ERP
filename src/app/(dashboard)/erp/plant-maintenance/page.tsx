"use client";

import { useMemo, useState } from "react";
import {
  Wrench, AlertTriangle, CheckCircle, Clock, Plus, Settings,
  User, Calendar, Package,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

type MaintenanceType = "Preventive" | "Corrective" | "Predictive";
type Priority = "Critical" | "High" | "Medium" | "Low";
type OrderStatus = "Open" | "In Progress" | "Completed" | "Cancelled";

interface MaintenanceOrder {
  id: string;
  orderNo: string;
  equipment: string;
  equipmentId: string;
  type: MaintenanceType;
  priority: Priority;
  status: OrderStatus;
  assignedTo: string;
  dueDate: string;
  description: string;
  createdDate: string;
}

/* ─── Mock Data ─── */

const EQUIPMENT_LIST = [
  "CNC Machine #1", "CNC Machine #2", "Hydraulic Press A", "Conveyor Belt L3",
  "Boiler Unit B", "Compressor C2", "HVAC Unit 4", "Packaging Line P1",
  "Granulator G1", "Tablet Press TP3",
];

const TECHNICIANS = ["Mike Chen", "Sarah Williams", "James Rodriguez", "Emily Patel", "Robert Kim"];

const SEED_ORDERS: MaintenanceOrder[] = [
  { id: "mo-1", orderNo: "MO-2026-0301", equipment: "CNC Machine #1", equipmentId: "EQ-001", type: "Corrective", priority: "Critical", status: "Open", assignedTo: "Mike Chen", dueDate: "2026-05-10", description: "Spindle bearing failure - unusual vibration detected", createdDate: "2026-05-09" },
  { id: "mo-2", orderNo: "MO-2026-0298", equipment: "Hydraulic Press A", equipmentId: "EQ-003", type: "Preventive", priority: "Medium", status: "In Progress", assignedTo: "Sarah Williams", dueDate: "2026-05-12", description: "Quarterly hydraulic fluid change and seal inspection", createdDate: "2026-05-05" },
  { id: "mo-3", orderNo: "MO-2026-0295", equipment: "Conveyor Belt L3", equipmentId: "EQ-004", type: "Preventive", priority: "Low", status: "Completed", assignedTo: "James Rodriguez", dueDate: "2026-05-08", description: "Belt tension adjustment and roller lubrication", createdDate: "2026-05-01" },
  { id: "mo-4", orderNo: "MO-2026-0302", equipment: "Boiler Unit B", equipmentId: "EQ-005", type: "Predictive", priority: "High", status: "Open", assignedTo: "Emily Patel", dueDate: "2026-05-11", description: "Thermal imaging indicates hotspot on tube bundle - schedule inspection", createdDate: "2026-05-09" },
  { id: "mo-5", orderNo: "MO-2026-0290", equipment: "Compressor C2", equipmentId: "EQ-006", type: "Preventive", priority: "Medium", status: "In Progress", assignedTo: "Robert Kim", dueDate: "2026-05-13", description: "Annual compressor overhaul - replace valves and gaskets", createdDate: "2026-04-28" },
  { id: "mo-6", orderNo: "MO-2026-0303", equipment: "Tablet Press TP3", equipmentId: "EQ-010", type: "Corrective", priority: "High", status: "Open", assignedTo: "Mike Chen", dueDate: "2026-05-10", description: "Punch tooling wear causing weight variation out of spec", createdDate: "2026-05-10" },
  { id: "mo-7", orderNo: "MO-2026-0285", equipment: "HVAC Unit 4", equipmentId: "EQ-007", type: "Preventive", priority: "Low", status: "Completed", assignedTo: "Sarah Williams", dueDate: "2026-05-06", description: "Filter replacement and coil cleaning", createdDate: "2026-04-25" },
  { id: "mo-8", orderNo: "MO-2026-0299", equipment: "Packaging Line P1", equipmentId: "EQ-008", type: "Predictive", priority: "Medium", status: "Open", assignedTo: "James Rodriguez", dueDate: "2026-05-14", description: "Vibration analysis suggests motor bearing degradation", createdDate: "2026-05-06" },
];

const typeColor: Record<MaintenanceType, string> = {
  Preventive: "bg-blue-100 text-blue-800",
  Corrective: "bg-red-100 text-red-800",
  Predictive: "bg-purple-100 text-purple-800",
};

const priorityColor: Record<Priority, string> = {
  Critical: "bg-red-100 text-red-800",
  High: "bg-orange-100 text-orange-800",
  Medium: "bg-yellow-100 text-yellow-800",
  Low: "bg-gray-100 text-gray-800",
};

const statusColor: Record<OrderStatus, string> = {
  Open: "bg-blue-100 text-blue-800",
  "In Progress": "bg-purple-100 text-purple-800",
  Completed: "bg-green-100 text-green-800",
  Cancelled: "bg-gray-100 text-gray-800",
};

export default function PlantMaintenancePage() {
  const [orders, setOrders] = useState<MaintenanceOrder[]>(SEED_ORDERS);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);

  // Form state
  const [formEquipment, setFormEquipment] = useState("");
  const [formType, setFormType] = useState<MaintenanceType>("Preventive");
  const [formPriority, setFormPriority] = useState<Priority>("Medium");
  const [formAssignedTo, setFormAssignedTo] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (search && !o.equipment.toLowerCase().includes(search.toLowerCase()) && !o.orderNo.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterType !== "all" && o.type !== filterType) return false;
      if (filterPriority !== "all" && o.priority !== filterPriority) return false;
      if (filterStatus !== "all" && o.status !== filterStatus) return false;
      return true;
    });
  }, [orders, search, filterType, filterPriority, filterStatus]);

  // Stats
  const openOrders = orders.filter((o) => o.status === "Open").length;
  const overduePM = orders.filter((o) => o.type === "Preventive" && o.status !== "Completed" && o.status !== "Cancelled" && new Date(o.dueDate) < new Date()).length;
  const equipmentUptime = 94.2;
  const sparePartsLow = 7;

  let _n = Date.now();
  const genOrderNo = () => `MO-2026-${String((_n++) % 10000).padStart(4, "0")}`;

  function handleCreateOrder() {
    setFormEquipment(""); setFormType("Preventive"); setFormPriority("Medium");
    setFormAssignedTo(""); setFormDueDate(""); setFormDescription("");
    setFormOpen(true);
  }

  function submitOrder() {
    if (!formEquipment || !formAssignedTo || !formDueDate || !formDescription) return;
    const newOrder: MaintenanceOrder = {
      id: `mo-${Date.now()}`,
      orderNo: genOrderNo(),
      equipment: formEquipment,
      equipmentId: `EQ-${String(Date.now() % 1000).padStart(3, "0")}`,
      type: formType,
      priority: formPriority,
      status: "Open",
      assignedTo: formAssignedTo,
      dueDate: formDueDate,
      description: formDescription,
      createdDate: new Date().toISOString().split("T")[0],
    };
    setOrders((prev) => [newOrder, ...prev]);
    setFormOpen(false);
  }

  function handleAssign(order: MaintenanceOrder, technician: string) {
    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, assignedTo: technician } : o));
  }

  function handleComplete(order: MaintenanceOrder) {
    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: "Completed" as OrderStatus } : o));
  }

  function handleStartWork(order: MaintenanceOrder) {
    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: "In Progress" as OrderStatus } : o));
  }

  const columns: Column<Record<string, unknown>>[] = [
    { key: "orderNo", label: "Order #", render: (v) => <span className="font-mono text-xs font-medium">{v as string}</span> },
    { key: "equipment", label: "Equipment", render: (v) => <span className="font-medium">{v as string}</span> },
    { key: "type", label: "Type", render: (v) => <Badge className={typeColor[v as MaintenanceType]}>{v as string}</Badge> },
    { key: "priority", label: "Priority", render: (v) => <Badge className={priorityColor[v as Priority]}>{v as string}</Badge> },
    { key: "status", label: "Status", render: (v) => <Badge className={statusColor[v as OrderStatus]}>{v as string}</Badge> },
    { key: "assignedTo", label: "Assigned To", render: (v) => <span className="text-sm">{v as string}</span> },
    { key: "dueDate", label: "Due Date", render: (v) => {
      const date = v as string;
      const isOverdue = new Date(date) < new Date() && date !== "";
      return <span className={`text-xs ${isOverdue ? "text-red-600 font-medium" : ""}`}>{date}</span>;
    }},
    { key: "id", label: "Actions", className: "text-right", render: (_v, row) => {
      const o = row as unknown as MaintenanceOrder;
      return (
        <div className="flex items-center justify-end gap-1">
          {o.status === "Open" && (
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleStartWork(o)} title="Start Work">
              <Settings className="h-3.5 w-3.5 text-blue-600" />
            </Button>
          )}
          {(o.status === "Open" || o.status === "In Progress") && (
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleComplete(o)} title="Complete">
              <CheckCircle className="h-3.5 w-3.5 text-green-600" />
            </Button>
          )}
        </div>
      );
    }},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plant Maintenance (CMMS)"
        description="Preventive, corrective, and predictive maintenance work order management"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {}}>
              <Calendar className="h-4 w-4 mr-2" />Generate PM Schedule
            </Button>
            <Button onClick={handleCreateOrder}>
              <Plus className="h-4 w-4 mr-2" />Create Work Order
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Wrench} title="Open Work Orders" value={openOrders} iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={AlertTriangle} title="Overdue PM" value={overduePM} iconColor="bg-red-100 text-red-600" />
        <StatsCard icon={CheckCircle} title="Equipment Uptime %" value={`${equipmentUptime}%`} iconColor="bg-green-100 text-green-600" />
        <StatsCard icon={Package} title="Spare Parts Low Stock" value={sparePartsLow} iconColor="bg-orange-100 text-orange-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Search by equipment or order #..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Preventive">Preventive</SelectItem>
            <SelectItem value="Corrective">Corrective</SelectItem>
            <SelectItem value="Predictive">Predictive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Priorities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="Critical">Critical</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Open">Open</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredOrders as unknown as Record<string, unknown>[]}
            exportable
            exportFilename="plant-maintenance-orders.csv"
            emptyMessage="No maintenance orders match your filters."
          />
        </CardContent>
      </Card>

      {/* Create Order Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Maintenance Work Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block text-sm">Equipment</Label>
                <Select value={formEquipment} onValueChange={setFormEquipment}>
                  <SelectTrigger><SelectValue placeholder="Select equipment..." /></SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_LIST.map((eq) => <SelectItem key={eq} value={eq}>{eq}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Type</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as MaintenanceType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Preventive">Preventive</SelectItem>
                    <SelectItem value="Corrective">Corrective</SelectItem>
                    <SelectItem value="Predictive">Predictive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Priority</Label>
                <Select value={formPriority} onValueChange={(v) => setFormPriority(v as Priority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Assign To</Label>
                <Select value={formAssignedTo} onValueChange={setFormAssignedTo}>
                  <SelectTrigger><SelectValue placeholder="Select technician..." /></SelectTrigger>
                  <SelectContent>
                    {TECHNICIANS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Due Date</Label>
                <Input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Description</Label>
              <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Describe the maintenance work required..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={submitOrder} disabled={!formEquipment || !formAssignedTo || !formDueDate || !formDescription}>Create Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
