"use client";

import { useMemo, useState } from "react";
import {
  Truck, Clock, DollarSign, MapPin, Plus, Ship, Plane, Train,
  Package, Navigation, CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type TransportMode = "Ocean" | "Air" | "Ground" | "Rail";
type ShipmentStatus = "Planned" | "In Transit" | "Delivered" | "Delayed";

interface Shipment {
  id: string;
  shipmentNo: string;
  origin: string;
  destination: string;
  carrier: string;
  mode: TransportMode;
  status: ShipmentStatus;
  eta: string;
  cost: number;
  weight: number;
  trackingNo: string;
}

/* ─── Mock Data ─── */

const CARRIERS = ["Maersk", "DHL Express", "FedEx", "DB Schenker", "UPS Freight", "CMA CGM", "Emirates SkyCargo"];
const ORIGINS = ["Shanghai, CN", "Mumbai, IN", "Houston, TX", "Rotterdam, NL", "Frankfurt, DE"];
const DESTINATIONS = ["Los Angeles, CA", "New York, NY", "London, UK", "Singapore, SG", "Dubai, UAE", "Sydney, AU"];

const SEED_SHIPMENTS: Shipment[] = [
  { id: "sh-1", shipmentNo: "SHP-2026-7801", origin: "Shanghai, CN", destination: "Los Angeles, CA", carrier: "Maersk", mode: "Ocean", status: "In Transit", eta: "2026-05-22", cost: 4500, weight: 18000, trackingNo: "MAEU12345678" },
  { id: "sh-2", shipmentNo: "SHP-2026-7802", origin: "Mumbai, IN", destination: "New York, NY", carrier: "DHL Express", mode: "Air", status: "In Transit", eta: "2026-05-12", cost: 8200, weight: 450, trackingNo: "DHL9876543210" },
  { id: "sh-3", shipmentNo: "SHP-2026-7803", origin: "Houston, TX", destination: "London, UK", carrier: "CMA CGM", mode: "Ocean", status: "Planned", eta: "2026-05-28", cost: 3800, weight: 12000, trackingNo: "CMAU87654321" },
  { id: "sh-4", shipmentNo: "SHP-2026-7798", origin: "Frankfurt, DE", destination: "Singapore, SG", carrier: "Emirates SkyCargo", mode: "Air", status: "Delivered", eta: "2026-05-08", cost: 6700, weight: 800, trackingNo: "EK-FRT-445566" },
  { id: "sh-5", shipmentNo: "SHP-2026-7804", origin: "Rotterdam, NL", destination: "Dubai, UAE", carrier: "DB Schenker", mode: "Rail", status: "In Transit", eta: "2026-05-18", cost: 2900, weight: 25000, trackingNo: "DBS-RW-998877" },
  { id: "sh-6", shipmentNo: "SHP-2026-7799", origin: "Shanghai, CN", destination: "Sydney, AU", carrier: "Maersk", mode: "Ocean", status: "Delayed", eta: "2026-05-15", cost: 5100, weight: 22000, trackingNo: "MAEU99887766" },
  { id: "sh-7", shipmentNo: "SHP-2026-7805", origin: "Houston, TX", destination: "New York, NY", carrier: "UPS Freight", mode: "Ground", status: "In Transit", eta: "2026-05-11", cost: 1200, weight: 5000, trackingNo: "1Z999AA10123456784" },
  { id: "sh-8", shipmentNo: "SHP-2026-7806", origin: "Mumbai, IN", destination: "London, UK", carrier: "FedEx", mode: "Air", status: "Planned", eta: "2026-05-14", cost: 9500, weight: 320, trackingNo: "FDX-778899001" },
];

const modeIcon: Record<TransportMode, typeof Truck> = {
  Ocean: Ship,
  Air: Plane,
  Ground: Truck,
  Rail: Train,
};

const statusColor: Record<ShipmentStatus, string> = {
  Planned: "bg-gray-100 text-gray-800",
  "In Transit": "bg-blue-100 text-blue-800",
  Delivered: "bg-green-100 text-green-800",
  Delayed: "bg-red-100 text-red-800",
};

const modeColor: Record<TransportMode, string> = {
  Ocean: "bg-cyan-100 text-cyan-800",
  Air: "bg-indigo-100 text-indigo-800",
  Ground: "bg-amber-100 text-amber-800",
  Rail: "bg-emerald-100 text-emerald-800",
};

export default function TMSPage() {
  const [shipments, setShipments] = useState<Shipment[]>(SEED_SHIPMENTS);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCarrier, setFilterCarrier] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);

  // Form state
  const [formOrigin, setFormOrigin] = useState("");
  const [formDestination, setFormDestination] = useState("");
  const [formCarrier, setFormCarrier] = useState("");
  const [formMode, setFormMode] = useState<TransportMode>("Ground");
  const [formWeight, setFormWeight] = useState(0);
  const [formCost, setFormCost] = useState(0);
  const [formEta, setFormEta] = useState("");

  const filteredShipments = useMemo(() => {
    return shipments.filter((s) => {
      if (search && !s.shipmentNo.toLowerCase().includes(search.toLowerCase()) && !s.origin.toLowerCase().includes(search.toLowerCase()) && !s.destination.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterMode !== "all" && s.mode !== filterMode) return false;
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      if (filterCarrier !== "all" && s.carrier !== filterCarrier) return false;
      return true;
    });
  }, [shipments, search, filterMode, filterStatus, filterCarrier]);

  // Stats
  const activeShipments = shipments.filter((s) => s.status === "In Transit").length;
  const deliveredCount = shipments.filter((s) => s.status === "Delivered").length;
  const onTimeRate = deliveredCount > 0 ? ((deliveredCount / (deliveredCount + shipments.filter((s) => s.status === "Delayed").length)) * 100) : 95.0;
  const avgTransitDays = 8.4;
  const freightCostMTD = shipments.reduce((sum, s) => sum + s.cost, 0);

  let _n = Date.now();
  const genShipmentNo = () => `SHP-2026-${String((_n++) % 10000).padStart(4, "0")}`;

  function handleCreateShipment() {
    setFormOrigin(""); setFormDestination(""); setFormCarrier(""); setFormMode("Ground");
    setFormWeight(0); setFormCost(0); setFormEta("");
    setFormOpen(true);
  }

  function submitShipment() {
    if (!formOrigin || !formDestination || !formCarrier || !formEta) return;
    const newShipment: Shipment = {
      id: `sh-${Date.now()}`,
      shipmentNo: genShipmentNo(),
      origin: formOrigin,
      destination: formDestination,
      carrier: formCarrier,
      mode: formMode,
      status: "Planned",
      eta: formEta,
      cost: formCost,
      weight: formWeight,
      trackingNo: `TRK-${Date.now().toString(36).toUpperCase()}`,
    };
    setShipments((prev) => [newShipment, ...prev]);
    setFormOpen(false);
  }

  function handleUpdateStatus(shipment: Shipment, newStatus: ShipmentStatus) {
    setShipments((prev) => prev.map((s) => s.id === shipment.id ? { ...s, status: newStatus } : s));
  }

  const columns: Column<Record<string, unknown>>[] = [
    { key: "shipmentNo", label: "Shipment #", render: (v) => <span className="font-mono text-xs font-medium">{v as string}</span> },
    { key: "origin", label: "Origin", render: (v) => <span className="text-sm">{v as string}</span> },
    { key: "destination", label: "Destination", render: (v) => <span className="text-sm font-medium">{v as string}</span> },
    { key: "carrier", label: "Carrier" },
    { key: "mode", label: "Mode", render: (v) => {
      const mode = v as TransportMode;
      const Icon = modeIcon[mode];
      return (
        <Badge className={modeColor[mode]}>
          <Icon className="h-3 w-3 mr-1" />{mode}
        </Badge>
      );
    }},
    { key: "status", label: "Status", render: (v) => <Badge className={statusColor[v as ShipmentStatus]}>{v as string}</Badge> },
    { key: "eta", label: "ETA", render: (v) => <span className="text-xs">{v as string}</span> },
    { key: "cost", label: "Cost", className: "text-right", render: (v) => <span className="font-medium">${((v as number) ?? 0).toLocaleString()}</span> },
    { key: "id", label: "Actions", className: "text-right", render: (_v, row) => {
      const s = row as unknown as Shipment;
      return (
        <div className="flex items-center justify-end gap-1">
          {s.status === "Planned" && (
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleUpdateStatus(s, "In Transit")} title="Mark In Transit">
              <Navigation className="h-3.5 w-3.5 text-blue-600" />
            </Button>
          )}
          {s.status === "In Transit" && (
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleUpdateStatus(s, "Delivered")} title="Mark Delivered">
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
        title="Transportation Management"
        description="Shipment planning, carrier management, route optimization, and freight tracking"
        actions={<Button onClick={handleCreateShipment}><Plus className="h-4 w-4 mr-2" />Create Shipment</Button>}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Truck} title="Active Shipments" value={activeShipments} iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={Clock} title="On-Time Delivery %" value={`${onTimeRate.toFixed(1)}%`} iconColor="bg-green-100 text-green-600" />
        <StatsCard icon={MapPin} title="Avg Transit Time" value={`${avgTransitDays} days`} iconColor="bg-purple-100 text-purple-600" />
        <StatsCard icon={DollarSign} title="Freight Cost MTD" value={`$${freightCostMTD.toLocaleString()}`} iconColor="bg-orange-100 text-orange-600" />
      </div>

      {/* Map Placeholder */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Shipment Tracking Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">Interactive Map</p>
              <p className="text-xs">Map integration placeholder — {activeShipments} active shipments being tracked</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Search by shipment #, origin, or destination..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-72" />
        <Select value={filterMode} onValueChange={setFilterMode}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Modes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modes</SelectItem>
            <SelectItem value="Ocean">Ocean</SelectItem>
            <SelectItem value="Air">Air</SelectItem>
            <SelectItem value="Ground">Ground</SelectItem>
            <SelectItem value="Rail">Rail</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCarrier} onValueChange={setFilterCarrier}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Carriers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Carriers</SelectItem>
            {CARRIERS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Planned">Planned</SelectItem>
            <SelectItem value="In Transit">In Transit</SelectItem>
            <SelectItem value="Delivered">Delivered</SelectItem>
            <SelectItem value="Delayed">Delayed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredShipments as unknown as Record<string, unknown>[]}
            exportable
            exportFilename="tms-shipments.csv"
            emptyMessage="No shipments match your filters."
          />
        </CardContent>
      </Card>

      {/* Create Shipment Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Shipment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block text-sm">Origin</Label>
                <Select value={formOrigin} onValueChange={setFormOrigin}>
                  <SelectTrigger><SelectValue placeholder="Select origin..." /></SelectTrigger>
                  <SelectContent>
                    {ORIGINS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Destination</Label>
                <Select value={formDestination} onValueChange={setFormDestination}>
                  <SelectTrigger><SelectValue placeholder="Select destination..." /></SelectTrigger>
                  <SelectContent>
                    {DESTINATIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Carrier</Label>
                <Select value={formCarrier} onValueChange={setFormCarrier}>
                  <SelectTrigger><SelectValue placeholder="Select carrier..." /></SelectTrigger>
                  <SelectContent>
                    {CARRIERS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Mode</Label>
                <Select value={formMode} onValueChange={(v) => setFormMode(v as TransportMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ocean">Ocean</SelectItem>
                    <SelectItem value="Air">Air</SelectItem>
                    <SelectItem value="Ground">Ground</SelectItem>
                    <SelectItem value="Rail">Rail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Weight (kg)</Label>
                <Input type="number" min={0} value={formWeight || ""} onChange={(e) => setFormWeight(Number(e.target.value))} placeholder="5000" />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Estimated Cost ($)</Label>
                <Input type="number" min={0} value={formCost || ""} onChange={(e) => setFormCost(Number(e.target.value))} placeholder="3500" />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">ETA</Label>
                <Input type="date" value={formEta} onChange={(e) => setFormEta(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={submitShipment} disabled={!formOrigin || !formDestination || !formCarrier || !formEta}>Create Shipment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
