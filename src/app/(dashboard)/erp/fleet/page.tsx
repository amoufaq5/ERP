"use client";

import { useMemo, useState } from "react";
import {
  Car, Fuel, Gauge, MapPin, Plus, Wrench, Route, Calendar,
  AlertTriangle, CheckCircle,
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

type VehicleStatus = "Active" | "In Maintenance" | "Idle" | "Out of Service";
type VehicleType = "Truck" | "Van" | "Trailer" | "Tanker" | "Refrigerated";

interface Vehicle {
  id: string;
  vehicleId: string;
  type: VehicleType;
  make: string;
  model: string;
  driver: string;
  status: VehicleStatus;
  currentLocation: string;
  lastServiceDate: string;
  nextServiceDue: string;
  fuelLevel: number;
  odometer: number;
  licensePlate: string;
}

/* ─── Mock Data ─── */

const DRIVERS = ["John Smith", "Maria Garcia", "Ahmed Hassan", "Li Wei", "Robert Jones", "Unassigned"];
const LOCATIONS = ["Warehouse A - Loading", "Route I-95 North", "Customer Site - NYC", "Depot B", "En route - Highway 101", "Service Center", "Fuel Station #3"];

const SEED_VEHICLES: Vehicle[] = [
  { id: "v-1", vehicleId: "FLT-001", type: "Truck", make: "Volvo", model: "FH16", driver: "John Smith", status: "Active", currentLocation: "Route I-95 North", lastServiceDate: "2026-04-15", nextServiceDue: "2026-07-15", fuelLevel: 72, odometer: 145230, licensePlate: "TX-4521-AB" },
  { id: "v-2", vehicleId: "FLT-002", type: "Van", make: "Mercedes", model: "Sprinter", driver: "Maria Garcia", status: "Active", currentLocation: "Customer Site - NYC", lastServiceDate: "2026-03-20", nextServiceDue: "2026-06-20", fuelLevel: 45, odometer: 87650, licensePlate: "NY-8834-CD" },
  { id: "v-3", vehicleId: "FLT-003", type: "Refrigerated", make: "Scania", model: "R500", driver: "Ahmed Hassan", status: "Active", currentLocation: "En route - Highway 101", lastServiceDate: "2026-05-01", nextServiceDue: "2026-08-01", fuelLevel: 88, odometer: 62100, licensePlate: "CA-2210-EF" },
  { id: "v-4", vehicleId: "FLT-004", type: "Truck", make: "MAN", model: "TGX", driver: "Unassigned", status: "In Maintenance", currentLocation: "Service Center", lastServiceDate: "2026-05-08", nextServiceDue: "2026-05-12", fuelLevel: 30, odometer: 210450, licensePlate: "IL-5567-GH" },
  { id: "v-5", vehicleId: "FLT-005", type: "Tanker", make: "DAF", model: "XF", driver: "Li Wei", status: "Active", currentLocation: "Warehouse A - Loading", lastServiceDate: "2026-04-28", nextServiceDue: "2026-07-28", fuelLevel: 91, odometer: 53200, licensePlate: "PA-7789-IJ" },
  { id: "v-6", vehicleId: "FLT-006", type: "Trailer", make: "Krone", model: "Mega Liner", driver: "Robert Jones", status: "Idle", currentLocation: "Depot B", lastServiceDate: "2026-03-10", nextServiceDue: "2026-06-10", fuelLevel: 65, odometer: 178900, licensePlate: "OH-3345-KL" },
  { id: "v-7", vehicleId: "FLT-007", type: "Van", make: "Ford", model: "Transit", driver: "Unassigned", status: "Out of Service", currentLocation: "Depot B", lastServiceDate: "2026-02-15", nextServiceDue: "2026-05-15", fuelLevel: 12, odometer: 234100, licensePlate: "MI-9901-MN" },
  { id: "v-8", vehicleId: "FLT-008", type: "Truck", make: "Volvo", model: "FM", driver: "John Smith", status: "Idle", currentLocation: "Warehouse A - Loading", lastServiceDate: "2026-04-20", nextServiceDue: "2026-07-20", fuelLevel: 55, odometer: 98700, licensePlate: "GA-6678-OP" },
];

const statusColor: Record<VehicleStatus, string> = {
  Active: "bg-green-100 text-green-800",
  "In Maintenance": "bg-yellow-100 text-yellow-800",
  Idle: "bg-gray-100 text-gray-800",
  "Out of Service": "bg-red-100 text-red-800",
};

const typeColor: Record<VehicleType, string> = {
  Truck: "bg-blue-100 text-blue-800",
  Van: "bg-purple-100 text-purple-800",
  Trailer: "bg-cyan-100 text-cyan-800",
  Tanker: "bg-orange-100 text-orange-800",
  Refrigerated: "bg-indigo-100 text-indigo-800",
};

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(SEED_VEHICLES);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [fuelOpen, setFuelOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [fuelAmount, setFuelAmount] = useState(0);
  const [maintenanceDate, setMaintenanceDate] = useState("");
  const [maintenanceNote, setMaintenanceNote] = useState("");

  // Form state
  const [formVehicleId, setFormVehicleId] = useState("");
  const [formType, setFormType] = useState<VehicleType>("Truck");
  const [formMake, setFormMake] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formDriver, setFormDriver] = useState("");
  const [formLicensePlate, setFormLicensePlate] = useState("");

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (search && !v.vehicleId.toLowerCase().includes(search.toLowerCase()) && !v.driver.toLowerCase().includes(search.toLowerCase()) && !v.licensePlate.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterType !== "all" && v.type !== filterType) return false;
      if (filterStatus !== "all" && v.status !== filterStatus) return false;
      return true;
    });
  }, [vehicles, search, filterType, filterStatus]);

  // Stats
  const activeVehicles = vehicles.filter((v) => v.status === "Active").length;
  const inMaintenance = vehicles.filter((v) => v.status === "In Maintenance").length;
  const avgFuelEfficiency = 8.2; // km/L
  const totalDistanceMTD = vehicles.reduce((sum, v) => sum + Math.round(v.odometer * 0.03), 0);

  let _n = Date.now();
  const genVehicleId = () => `FLT-${String((_n++) % 1000).padStart(3, "0")}`;

  function handleAddVehicle() {
    setFormVehicleId(""); setFormType("Truck"); setFormMake(""); setFormModel("");
    setFormDriver(""); setFormLicensePlate("");
    setFormOpen(true);
  }

  function submitVehicle() {
    if (!formMake || !formModel || !formLicensePlate) return;
    const newVehicle: Vehicle = {
      id: `v-${Date.now()}`,
      vehicleId: formVehicleId || genVehicleId(),
      type: formType,
      make: formMake,
      model: formModel,
      driver: formDriver || "Unassigned",
      status: "Idle",
      currentLocation: "Depot B",
      lastServiceDate: new Date().toISOString().split("T")[0],
      nextServiceDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      fuelLevel: 100,
      odometer: 0,
      licensePlate: formLicensePlate,
    };
    setVehicles((prev) => [newVehicle, ...prev]);
    setFormOpen(false);
  }

  function handleScheduleMaintenance(vehicle: Vehicle) {
    setSelectedVehicle(vehicle);
    setMaintenanceDate("");
    setMaintenanceNote("");
    setMaintenanceOpen(true);
  }

  function submitMaintenance() {
    if (!selectedVehicle || !maintenanceDate) return;
    setVehicles((prev) => prev.map((v) => v.id === selectedVehicle.id ? { ...v, status: "In Maintenance" as VehicleStatus, nextServiceDue: maintenanceDate } : v));
    setMaintenanceOpen(false);
    setSelectedVehicle(null);
  }

  function handleRecordFuel(vehicle: Vehicle) {
    setSelectedVehicle(vehicle);
    setFuelAmount(0);
    setFuelOpen(true);
  }

  function submitFuel() {
    if (!selectedVehicle || fuelAmount <= 0) return;
    setVehicles((prev) => prev.map((v) => v.id === selectedVehicle.id ? { ...v, fuelLevel: Math.min(100, v.fuelLevel + fuelAmount) } : v));
    setFuelOpen(false);
    setSelectedVehicle(null);
  }

  function handleAssignTrip(vehicle: Vehicle) {
    setVehicles((prev) => prev.map((v) => v.id === vehicle.id ? { ...v, status: "Active" as VehicleStatus } : v));
  }

  const columns: Column<Record<string, unknown>>[] = [
    { key: "vehicleId", label: "Vehicle ID", render: (v) => <span className="font-mono text-xs font-medium">{v as string}</span> },
    { key: "type", label: "Type", render: (v) => <Badge className={typeColor[v as VehicleType]}>{v as string}</Badge> },
    { key: "driver", label: "Driver", render: (v) => <span className={`text-sm ${v === "Unassigned" ? "text-muted-foreground italic" : "font-medium"}`}>{v as string}</span> },
    { key: "status", label: "Status", render: (v) => <Badge className={statusColor[v as VehicleStatus]}>{v as string}</Badge> },
    { key: "currentLocation", label: "Current Location", render: (v) => (
      <span className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" />{v as string}</span>
    )},
    { key: "lastServiceDate", label: "Last Service", render: (v) => <span className="text-xs">{v as string}</span> },
    { key: "nextServiceDue", label: "Next Service", render: (v) => {
      const date = v as string;
      const isOverdue = new Date(date) < new Date();
      return <span className={`text-xs ${isOverdue ? "text-red-600 font-medium" : ""}`}>{date}</span>;
    }},
    { key: "fuelLevel", label: "Fuel %", className: "text-right", render: (v) => {
      const val = v as number;
      const color = val >= 50 ? "text-green-700" : val >= 25 ? "text-yellow-700" : "text-red-700";
      return <span className={`font-medium ${color}`}>{val}%</span>;
    }},
    { key: "id", label: "Actions", className: "text-right", render: (_v, row) => {
      const vehicle = row as unknown as Vehicle;
      return (
        <div className="flex items-center justify-end gap-1">
          {vehicle.status === "Idle" && (
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleAssignTrip(vehicle)} title="Assign Trip">
              <Route className="h-3.5 w-3.5 text-blue-600" />
            </Button>
          )}
          {vehicle.status !== "In Maintenance" && vehicle.status !== "Out of Service" && (
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleScheduleMaintenance(vehicle)} title="Schedule Maintenance">
              <Wrench className="h-3.5 w-3.5 text-orange-600" />
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleRecordFuel(vehicle)} title="Record Fuel">
            <Fuel className="h-3.5 w-3.5 text-green-600" />
          </Button>
        </div>
      );
    }},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fleet Management"
        description="Vehicle tracking, maintenance scheduling, fuel management, and trip assignment"
        actions={<Button onClick={handleAddVehicle}><Plus className="h-4 w-4 mr-2" />Add Vehicle</Button>}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Car} title="Active Vehicles" value={activeVehicles} iconColor="bg-green-100 text-green-600" />
        <StatsCard icon={Wrench} title="In Maintenance" value={inMaintenance} iconColor="bg-yellow-100 text-yellow-600" />
        <StatsCard icon={Gauge} title="Avg Fuel Efficiency" value={`${avgFuelEfficiency} km/L`} iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={Route} title="Total Distance MTD" value={`${totalDistanceMTD.toLocaleString()} km`} iconColor="bg-purple-100 text-purple-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Search by vehicle ID, driver, or plate..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-72" />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Truck">Truck</SelectItem>
            <SelectItem value="Van">Van</SelectItem>
            <SelectItem value="Trailer">Trailer</SelectItem>
            <SelectItem value="Tanker">Tanker</SelectItem>
            <SelectItem value="Refrigerated">Refrigerated</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="In Maintenance">In Maintenance</SelectItem>
            <SelectItem value="Idle">Idle</SelectItem>
            <SelectItem value="Out of Service">Out of Service</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredVehicles as unknown as Record<string, unknown>[]}
            exportable
            exportFilename="fleet-vehicles.csv"
            emptyMessage="No vehicles match your filters."
          />
        </CardContent>
      </Card>

      {/* Add Vehicle Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Vehicle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block text-sm">Vehicle ID</Label>
                <Input value={formVehicleId} onChange={(e) => setFormVehicleId(e.target.value)} placeholder="FLT-009 (auto if empty)" />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Type</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as VehicleType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Truck">Truck</SelectItem>
                    <SelectItem value="Van">Van</SelectItem>
                    <SelectItem value="Trailer">Trailer</SelectItem>
                    <SelectItem value="Tanker">Tanker</SelectItem>
                    <SelectItem value="Refrigerated">Refrigerated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Make</Label>
                <Input value={formMake} onChange={(e) => setFormMake(e.target.value)} placeholder="Volvo" />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Model</Label>
                <Input value={formModel} onChange={(e) => setFormModel(e.target.value)} placeholder="FH16" />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Driver</Label>
                <Select value={formDriver} onValueChange={setFormDriver}>
                  <SelectTrigger><SelectValue placeholder="Select driver..." /></SelectTrigger>
                  <SelectContent>
                    {DRIVERS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">License Plate</Label>
                <Input value={formLicensePlate} onChange={(e) => setFormLicensePlate(e.target.value)} placeholder="TX-4521-AB" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={submitVehicle} disabled={!formMake || !formModel || !formLicensePlate}>Add Vehicle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Maintenance Dialog */}
      <Dialog open={maintenanceOpen} onOpenChange={setMaintenanceOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Schedule Maintenance — {selectedVehicle?.vehicleId}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="block text-sm mb-1.5">Service Date</Label>
              <Input type="date" value={maintenanceDate} onChange={(e) => setMaintenanceDate(e.target.value)} />
            </div>
            <div>
              <Label className="block text-sm mb-1.5">Notes</Label>
              <Input value={maintenanceNote} onChange={(e) => setMaintenanceNote(e.target.value)} placeholder="Oil change, tire rotation..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaintenanceOpen(false)}>Cancel</Button>
            <Button onClick={submitMaintenance} disabled={!maintenanceDate}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Fuel Dialog */}
      <Dialog open={fuelOpen} onOpenChange={setFuelOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Fuel — {selectedVehicle?.vehicleId}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="block text-sm">Fuel Added (%)</Label>
            <Input type="number" min={1} max={100} value={fuelAmount || ""} onChange={(e) => setFuelAmount(Number(e.target.value))} placeholder="Enter percentage..." />
            <p className="text-xs text-muted-foreground">Current level: {selectedVehicle?.fuelLevel}%</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFuelOpen(false)}>Cancel</Button>
            <Button onClick={submitFuel} disabled={fuelAmount <= 0}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
