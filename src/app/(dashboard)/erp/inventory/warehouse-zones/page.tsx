"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Warehouse,
  MapPin,
  Package,
  AlertTriangle,
  Snowflake,
  ArrowRightLeft,
  Search,
  Filter,
  RefreshCw,
  ClipboardList,
  Truck,
  BarChart3,
  CheckCircle2,
  Clock,
  Lock,
  Unlock,
  ArrowRight,
  Play,
  Users,
  TrendingUp,
  TrendingDown,
  Thermometer,
  Droplets,
  ShieldCheck,
  Calendar,
  Hash,
  Eye,
  PackageSearch,
  CircleDot,
  Target,
  Percent,
  Timer,
  ListChecks,
  ChevronDown,
  ChevronUp,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import WarehouseMap from "@/components/shared/warehouse-map";

import { warehouseStore } from "@/lib/operations/warehouse-store";
import type {
  WarehouseZone,
  StorageLocation,
  LocationStatus,
  StorageCondition,
  PutawayTask,
  PutawayStatus,
  PickingWave,
  PickingWaveStatus,
  CycleCount,
  CycleCountStatus,
  WarehouseMetrics,
  ZoneUtilization,
  LocationTransfer,
} from "@/lib/operations/warehouse-types";

/* ────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────── */

type TabKey = "map" | "inventory" | "operations" | "analytics";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "map", label: "Map", icon: <MapPin className="h-4 w-4" /> },
  { key: "inventory", label: "Inventory", icon: <Package className="h-4 w-4" /> },
  { key: "operations", label: "Operations", icon: <ClipboardList className="h-4 w-4" /> },
  { key: "analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    available: "bg-green-100 text-green-800",
    occupied: "bg-blue-100 text-blue-800",
    reserved: "bg-amber-100 text-amber-800",
    blocked: "bg-red-100 text-red-800",
    pending: "bg-gray-100 text-gray-800",
    assigned: "bg-blue-100 text-blue-800",
    "in-progress": "bg-indigo-100 text-indigo-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-500",
    draft: "bg-gray-100 text-gray-700",
    released: "bg-blue-100 text-blue-800",
    scheduled: "bg-amber-100 text-amber-800",
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-500",
    maintenance: "bg-orange-100 text-orange-800",
    normal: "bg-green-100 text-green-800",
    warning: "bg-amber-100 text-amber-800",
    critical: "bg-red-100 text-red-800",
  };
  return (
    <Badge variant="outline" className={cn("text-[10px] capitalize", map[status] ?? "")}>
      {status.replace(/-/g, " ")}
    </Badge>
  );
}

function priorityBadge(priority: string) {
  const map: Record<string, string> = {
    low: "bg-gray-100 text-gray-700",
    medium: "bg-blue-100 text-blue-700",
    high: "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700",
  };
  return (
    <Badge variant="outline" className={cn("text-[10px] capitalize", map[priority] ?? "")}>
      {priority}
    </Badge>
  );
}

function zoneLabel(zones: WarehouseZone[], zoneId: string) {
  const z = zones.find((z) => z.id === zoneId);
  return z ? z.name : zoneId;
}

function formatDate(d?: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-EG", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

/* ────────────────────────────────────────────────────────────
   Simple bar chart for analytics
   ──────────────────────────────────────────────────────────── */

function SimpleBarChart({
  data,
  className,
}: {
  data: { label: string; value: number; color?: string }[];
  className?: string;
}) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className={cn("space-y-2", className)}>
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-32 truncate text-right">
            {d.label}
          </span>
          <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
            <div
              className={cn("h-4 rounded-full transition-all", d.color ?? "bg-primary")}
              style={{ width: `${(d.value / maxVal) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium w-10 text-right">{d.value}%</span>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Main Page Component
   ──────────────────────────────────────────────────────────── */

export default function WarehouseZonesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("map");
  const [mounted, setMounted] = useState(false);

  // Data state
  const [metrics, setMetrics] = useState<WarehouseMetrics | null>(null);
  const [zones, setZones] = useState<WarehouseZone[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [conditions, setConditions] = useState<StorageCondition[]>([]);
  const [putawayTasks, setPutawayTasks] = useState<PutawayTask[]>([]);
  const [pickingWaves, setPickingWaves] = useState<PickingWave[]>([]);
  const [cycleCounts, setCycleCounts] = useState<CycleCount[]>([]);
  const [transfers, setTransfers] = useState<LocationTransfer[]>([]);

  // Filters
  const [locSearch, setLocSearch] = useState("");
  const [locZoneFilter, setLocZoneFilter] = useState<string>("all");
  const [locStatusFilter, setLocStatusFilter] = useState<string>("all");

  // Selected items
  const [selectedLocation, setSelectedLocation] = useState<StorageLocation | null>(null);
  const [expandedWave, setExpandedWave] = useState<string | null>(null);
  const [expandedCount, setExpandedCount] = useState<string | null>(null);

  // Refresh trigger
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setMetrics(warehouseStore.getMetrics());
    setZones(warehouseStore.getAllZones());
    setLocations(warehouseStore.getAllLocations());
    setConditions(warehouseStore.getAllConditions());
    setPutawayTasks(warehouseStore.getAllPutawayTasks());
    setPickingWaves(warehouseStore.getAllPickingWaves());
    setCycleCounts(warehouseStore.getAllCycleCounts());
    setTransfers(warehouseStore.getAllTransfers());
  }, [mounted, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  /* ── Filtered locations ─────────────────────────────────── */

  const filteredLocations = useMemo(() => {
    let locs = locations;
    if (locZoneFilter !== "all") {
      locs = locs.filter((l) => l.zoneId === locZoneFilter);
    }
    if (locStatusFilter !== "all") {
      locs = locs.filter((l) => l.status === locStatusFilter);
    }
    if (locSearch.trim()) {
      const q = locSearch.toLowerCase();
      locs = locs.filter(
        (l) =>
          l.barcode.toLowerCase().includes(q) ||
          (l.currentItemName ?? "").toLowerCase().includes(q) ||
          (l.currentBatchNumber ?? "").toLowerCase().includes(q)
      );
    }
    return locs;
  }, [locations, locZoneFilter, locStatusFilter, locSearch]);

  /* ── Actions ────────────────────────────────────────────── */

  function handleBlockLocation(id: string) {
    warehouseStore.blockLocation(id);
    refresh();
  }

  function handleUnblockLocation(id: string) {
    warehouseStore.unblockLocation(id);
    refresh();
  }

  function handleCompletePutaway(id: string) {
    warehouseStore.completePutawayTask(id);
    refresh();
  }

  function handleReleaseWave(id: string) {
    warehouseStore.releasePickingWave(id, "Warehouse Operator");
    refresh();
  }

  function handleLocationSelect(location: StorageLocation) {
    setSelectedLocation(location);
    setActiveTab("inventory");
    setLocSearch(location.barcode);
  }

  /* ── SSR guard ──────────────────────────────────────────── */

  if (!mounted || !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* ──────────────────────────────────────────────────────────
     RENDER
     ────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <PageHeader
        icon={<Warehouse className="h-6 w-6 text-primary" />}
        title="Warehouse Zone Management"
        description="GMP-compliant warehouse operations — zone mapping, storage conditions, putaway, picking, and cycle counting"
        actions={
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
        }
      />

      {/* ── Stats Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          icon={MapPin}
          title="Total Locations"
          value={metrics.totalLocations}
          subtitle={`${metrics.availableLocations} available`}
          iconColor="text-blue-600"
        />
        <StatsCard
          icon={Percent}
          title="Utilization"
          value={`${metrics.overallUtilizationPct}%`}
          subtitle={`${metrics.occupiedLocations} / ${metrics.totalLocations} occupied`}
          iconColor="text-emerald-600"
        />
        <StatsCard
          icon={AlertTriangle}
          title="In Quarantine"
          value={metrics.quarantineItemCount}
          subtitle="Items pending QC release"
          iconColor="text-amber-600"
        />
        <StatsCard
          icon={Snowflake}
          title="Cold Chain Alerts"
          value={metrics.coldChainAlerts}
          subtitle="Temperature excursions"
          iconColor="text-cyan-600"
        />
        <StatsCard
          icon={Truck}
          title="Pending Putaway"
          value={metrics.pendingPutaways}
          subtitle="Awaiting stocking"
          iconColor="text-purple-600"
        />
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className="border-b">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ────────────────────────────────────── */}
      {activeTab === "map" && <MapTab zones={zones} onLocationSelect={handleLocationSelect} selectedLocation={selectedLocation} />}
      {activeTab === "inventory" && (
        <InventoryTab
          zones={zones}
          locations={filteredLocations}
          locSearch={locSearch}
          setLocSearch={setLocSearch}
          locZoneFilter={locZoneFilter}
          setLocZoneFilter={setLocZoneFilter}
          locStatusFilter={locStatusFilter}
          setLocStatusFilter={setLocStatusFilter}
          onBlock={handleBlockLocation}
          onUnblock={handleUnblockLocation}
          selectedLocation={selectedLocation}
          setSelectedLocation={setSelectedLocation}
        />
      )}
      {activeTab === "operations" && (
        <OperationsTab
          zones={zones}
          putawayTasks={putawayTasks}
          pickingWaves={pickingWaves}
          cycleCounts={cycleCounts}
          expandedWave={expandedWave}
          setExpandedWave={setExpandedWave}
          expandedCount={expandedCount}
          setExpandedCount={setExpandedCount}
          onCompletePutaway={handleCompletePutaway}
          onReleaseWave={handleReleaseWave}
        />
      )}
      {activeTab === "analytics" && (
        <AnalyticsTab
          metrics={metrics}
          zones={zones}
          conditions={conditions}
          cycleCounts={cycleCounts}
          transfers={transfers}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB: Map
   ════════════════════════════════════════════════════════════ */

function MapTab({
  zones,
  onLocationSelect,
  selectedLocation,
}: {
  zones: WarehouseZone[];
  onLocationSelect: (loc: StorageLocation) => void;
  selectedLocation: StorageLocation | null;
}) {
  const [mapSearch, setMapSearch] = useState("");
  const searchResults = useMemo(() => {
    if (!mapSearch.trim()) return [];
    return warehouseStore.searchLocations(mapSearch);
  }, [mapSearch]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Warehouse Map */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Interactive Warehouse Map
          </CardTitle>
          <CardDescription>Click a zone to view rack/shelf/bin layout</CardDescription>
        </CardHeader>
        <CardContent>
          <WarehouseMap onLocationSelect={onLocationSelect} />
        </CardContent>
      </Card>

      {/* Sidebar: Search + Zone Summary */}
      <div className="space-y-4">
        {/* Search */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" /> Location Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search barcode, item, batch..."
                value={mapSearch}
                onChange={(e) => setMapSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="max-h-60 overflow-y-auto space-y-1.5">
                {searchResults.slice(0, 10).map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => onLocationSelect(loc)}
                    className="w-full text-left p-2 rounded-md border text-xs hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-mono font-medium">{loc.barcode}</span>
                      {statusBadge(loc.status)}
                    </div>
                    {loc.currentItemName && (
                      <div className="text-muted-foreground truncate">{loc.currentItemName}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
            {mapSearch.trim() && searchResults.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">No results found</p>
            )}
          </CardContent>
        </Card>

        {/* Zone Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Zone Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {zones.map((zone) => {
                const util = warehouseStore.getUtilization().find((u) => u.zoneId === zone.id);
                const pct = util?.utilizationPct ?? 0;
                return (
                  <div key={zone.id} className="flex items-center gap-2">
                    <span className="text-xs w-36 truncate">{zone.name}</span>
                    <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                      <div
                        className={cn(
                          "h-2.5 rounded-full transition-all",
                          pct >= 80 ? "bg-red-500" : pct >= 50 ? "bg-yellow-500" : "bg-green-500"
                        )}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Location Detail */}
        {selectedLocation && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" /> Location Detail
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Barcode</span>
                <span className="font-mono font-medium">{selectedLocation.barcode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Zone</span>
                <span>{zoneLabel(zones, selectedLocation.zoneId)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                {statusBadge(selectedLocation.status)}
              </div>
              {selectedLocation.currentItemName && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Item</span>
                    <span className="text-right max-w-[180px] truncate">{selectedLocation.currentItemName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Batch</span>
                    <span className="font-mono">{selectedLocation.currentBatchNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quantity</span>
                    <span>{selectedLocation.currentQuantity} {selectedLocation.currentUnit}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB: Inventory
   ════════════════════════════════════════════════════════════ */

function InventoryTab({
  zones,
  locations,
  locSearch,
  setLocSearch,
  locZoneFilter,
  setLocZoneFilter,
  locStatusFilter,
  setLocStatusFilter,
  onBlock,
  onUnblock,
  selectedLocation,
  setSelectedLocation,
}: {
  zones: WarehouseZone[];
  locations: StorageLocation[];
  locSearch: string;
  setLocSearch: (v: string) => void;
  locZoneFilter: string;
  setLocZoneFilter: (v: string) => void;
  locStatusFilter: string;
  setLocStatusFilter: (v: string) => void;
  onBlock: (id: string) => void;
  onUnblock: (id: string) => void;
  selectedLocation: StorageLocation | null;
  setSelectedLocation: (loc: StorageLocation | null) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Barcode, item name, batch..."
                  value={locSearch}
                  onChange={(e) => setLocSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
            <div className="w-48">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Zone</label>
              <select
                value={locZoneFilter}
                onChange={(e) => setLocZoneFilter(e.target.value)}
                className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="all">All Zones</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>
            <div className="w-40">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
              <select
                value={locStatusFilter}
                onChange={(e) => setLocStatusFilter(e.target.value)}
                className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="reserved">Reserved</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            {(locSearch || locZoneFilter !== "all" || locStatusFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setLocSearch(""); setLocZoneFilter("all"); setLocStatusFilter("all"); }}
              >
                <XCircle className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Location table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" /> Storage Locations
              <Badge variant="secondary" className="text-xs">{locations.length}</Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-auto max-h-[520px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-36">Barcode</TableHead>
                  <TableHead className="text-xs">Zone</TableHead>
                  <TableHead className="text-xs">Rack/Shelf/Bin</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Item</TableHead>
                  <TableHead className="text-xs">Batch</TableHead>
                  <TableHead className="text-xs text-right">Qty</TableHead>
                  <TableHead className="text-xs">Last Activity</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No locations match the current filters
                    </TableCell>
                  </TableRow>
                ) : (
                  locations.map((loc) => (
                    <TableRow
                      key={loc.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        selectedLocation?.id === loc.id && "bg-muted"
                      )}
                      onClick={() => setSelectedLocation(loc)}
                    >
                      <TableCell className="text-xs font-mono font-medium">{loc.barcode}</TableCell>
                      <TableCell className="text-xs">{zoneLabel(zones, loc.zoneId)}</TableCell>
                      <TableCell className="text-xs font-mono">{loc.rack}-{loc.shelf}-{loc.bin}</TableCell>
                      <TableCell>{statusBadge(loc.status)}</TableCell>
                      <TableCell className="text-xs max-w-[180px] truncate">{loc.currentItemName ?? "—"}</TableCell>
                      <TableCell className="text-xs font-mono">{loc.currentBatchNumber ?? "—"}</TableCell>
                      <TableCell className="text-xs text-right">
                        {loc.currentQuantity != null ? `${loc.currentQuantity} ${loc.currentUnit ?? ""}` : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(loc.lastActivityDate)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                          {loc.status === "available" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-red-600 hover:text-red-700"
                              onClick={() => onBlock(loc.id)}
                              title="Block location"
                            >
                              <Lock className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {loc.status === "blocked" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-green-600 hover:text-green-700"
                              onClick={() => onUnblock(loc.id)}
                              title="Unblock location"
                            >
                              <Unlock className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transfers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" /> Recent Transfers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Item</TableHead>
                  <TableHead className="text-xs">Batch</TableHead>
                  <TableHead className="text-xs">From</TableHead>
                  <TableHead className="text-xs">To</TableHead>
                  <TableHead className="text-xs text-right">Qty</TableHead>
                  <TableHead className="text-xs">Reason</TableHead>
                  <TableHead className="text-xs">By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouseStore.getAllTransfers().map((tr) => (
                  <TableRow key={tr.id}>
                    <TableCell className="text-xs">{formatDate(tr.transferDate)}</TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate">{tr.itemName}</TableCell>
                    <TableCell className="text-xs font-mono">{tr.batchNumber}</TableCell>
                    <TableCell className="text-xs font-mono">
                      {warehouseStore.getLocationById(tr.fromLocationId)?.barcode ?? tr.fromLocationId}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {warehouseStore.getLocationById(tr.toLocationId)?.barcode ?? tr.toLocationId}
                    </TableCell>
                    <TableCell className="text-xs text-right">{tr.quantity} {tr.unit}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{tr.reason}</TableCell>
                    <TableCell className="text-xs">{tr.transferredBy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB: Operations
   ════════════════════════════════════════════════════════════ */

function OperationsTab({
  zones,
  putawayTasks,
  pickingWaves,
  cycleCounts,
  expandedWave,
  setExpandedWave,
  expandedCount,
  setExpandedCount,
  onCompletePutaway,
  onReleaseWave,
}: {
  zones: WarehouseZone[];
  putawayTasks: PutawayTask[];
  pickingWaves: PickingWave[];
  cycleCounts: CycleCount[];
  expandedWave: string | null;
  setExpandedWave: (v: string | null) => void;
  expandedCount: string | null;
  setExpandedCount: (v: string | null) => void;
  onCompletePutaway: (id: string) => void;
  onReleaseWave: (id: string) => void;
}) {
  const [opsSubTab, setOpsSubTab] = useState<"putaway" | "picking" | "cycle-count">("putaway");

  return (
    <div className="space-y-4">
      {/* Sub-tab buttons */}
      <div className="flex gap-2">
        <Button
          variant={opsSubTab === "putaway" ? "default" : "outline"}
          size="sm"
          onClick={() => setOpsSubTab("putaway")}
        >
          <Truck className="h-4 w-4 mr-1.5" />
          Putaway Queue ({putawayTasks.filter((t) => t.status !== "completed" && t.status !== "cancelled").length})
        </Button>
        <Button
          variant={opsSubTab === "picking" ? "default" : "outline"}
          size="sm"
          onClick={() => setOpsSubTab("picking")}
        >
          <PackageSearch className="h-4 w-4 mr-1.5" />
          Picking Waves ({pickingWaves.filter((w) => w.status !== "completed" && w.status !== "cancelled").length})
        </Button>
        <Button
          variant={opsSubTab === "cycle-count" ? "default" : "outline"}
          size="sm"
          onClick={() => setOpsSubTab("cycle-count")}
        >
          <ListChecks className="h-4 w-4 mr-1.5" />
          Cycle Counts ({cycleCounts.filter((c) => c.status === "scheduled" || c.status === "in-progress").length})
        </Button>
      </div>

      {opsSubTab === "putaway" && (
        <PutawaySection
          zones={zones}
          tasks={putawayTasks}
          onComplete={onCompletePutaway}
        />
      )}

      {opsSubTab === "picking" && (
        <PickingSection
          zones={zones}
          waves={pickingWaves}
          expandedWave={expandedWave}
          setExpandedWave={setExpandedWave}
          onRelease={onReleaseWave}
        />
      )}

      {opsSubTab === "cycle-count" && (
        <CycleCountSection
          zones={zones}
          counts={cycleCounts}
          expandedCount={expandedCount}
          setExpandedCount={setExpandedCount}
        />
      )}
    </div>
  );
}

/* ── Putaway Section ──────────────────────────────────────── */

function PutawaySection({
  zones,
  tasks,
  onComplete,
}: {
  zones: WarehouseZone[];
  tasks: PutawayTask[];
  onComplete: (id: string) => void;
}) {
  const sorted = [...tasks].sort((a, b) => {
    const prioOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const statusOrder: Record<PutawayStatus, number> = { pending: 0, assigned: 1, "in-progress": 2, completed: 3, cancelled: 4 };
    if (statusOrder[a.status] !== statusOrder[b.status]) return statusOrder[a.status] - statusOrder[b.status];
    return (prioOrder[a.priority] ?? 9) - (prioOrder[b.priority] ?? 9);
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Truck className="h-4 w-4" /> Putaway Queue
        </CardTitle>
        <CardDescription>GRN-received materials pending warehouse stocking</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-auto max-h-[480px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">GRN</TableHead>
                <TableHead className="text-xs">Item</TableHead>
                <TableHead className="text-xs">Batch</TableHead>
                <TableHead className="text-xs text-right">Qty</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Suggested Zone</TableHead>
                <TableHead className="text-xs">Assigned</TableHead>
                <TableHead className="text-xs">Priority</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="text-xs font-mono">{task.grnNumber}</TableCell>
                  <TableCell className="text-xs max-w-[150px] truncate">{task.itemName}</TableCell>
                  <TableCell className="text-xs font-mono">{task.batchNumber}</TableCell>
                  <TableCell className="text-xs text-right">{task.quantity} {task.unit}</TableCell>
                  <TableCell className="text-xs capitalize">{task.productCategory.replace(/-/g, " ")}</TableCell>
                  <TableCell className="text-xs">{zoneLabel(zones, task.suggestedZoneId)}</TableCell>
                  <TableCell className="text-xs">{task.assignedTo ?? "—"}</TableCell>
                  <TableCell>{priorityBadge(task.priority)}</TableCell>
                  <TableCell>{statusBadge(task.status)}</TableCell>
                  <TableCell className="text-right">
                    {(task.status === "in-progress" || task.status === "assigned") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-green-600"
                        onClick={() => onComplete(task.id)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Picking Section ──────────────────────────────────────── */

function PickingSection({
  zones,
  waves,
  expandedWave,
  setExpandedWave,
  onRelease,
}: {
  zones: WarehouseZone[];
  waves: PickingWave[];
  expandedWave: string | null;
  setExpandedWave: (v: string | null) => void;
  onRelease: (id: string) => void;
}) {
  const sorted = [...waves].sort((a, b) => {
    const statusOrder: Record<PickingWaveStatus, number> = { "in-progress": 0, released: 1, draft: 2, completed: 3, cancelled: 4 };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <PackageSearch className="h-4 w-4" /> Picking Waves
        </CardTitle>
        <CardDescription>Production and dispatch order picking</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.map((wave) => {
          const isExpanded = expandedWave === wave.id;
          const progress = wave.totalItems > 0 ? Math.round((wave.pickedItems / wave.totalItems) * 100) : 0;

          return (
            <div key={wave.id} className="rounded-lg border">
              {/* Wave header */}
              <button
                onClick={() => setExpandedWave(isExpanded ? null : wave.id)}
                className="w-full p-3 text-left flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-medium text-sm">{wave.waveNumber}</span>
                  {statusBadge(wave.status)}
                  {priorityBadge(wave.priority)}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-xs text-muted-foreground">
                    {wave.assignedTo && <span className="mr-3"><Users className="inline h-3 w-3 mr-0.5" />{wave.assignedTo}</span>}
                    <span>{wave.pickedItems}/{wave.totalItems} items</span>
                  </div>
                  <div className="w-20 bg-muted rounded-full h-2">
                    <div
                      className={cn("h-2 rounded-full", progress === 100 ? "bg-green-500" : "bg-primary")}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>

              {/* Expanded order details */}
              {isExpanded && (
                <div className="border-t px-3 pb-3">
                  <div className="rounded-md border mt-3 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Order</TableHead>
                          <TableHead className="text-xs">Item</TableHead>
                          <TableHead className="text-xs">Batch</TableHead>
                          <TableHead className="text-xs">Location</TableHead>
                          <TableHead className="text-xs text-right">Qty</TableHead>
                          <TableHead className="text-xs">Picked</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {wave.orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="text-xs font-mono">{order.orderNumber}</TableCell>
                            <TableCell className="text-xs">{order.itemName}</TableCell>
                            <TableCell className="text-xs font-mono">{order.batchNumber}</TableCell>
                            <TableCell className="text-xs font-mono">
                              {warehouseStore.getLocationById(order.locationId)?.barcode ?? order.locationId}
                            </TableCell>
                            <TableCell className="text-xs text-right">{order.quantity} {order.unit}</TableCell>
                            <TableCell>
                              {order.picked ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <CircleDot className="h-4 w-4 text-muted-foreground" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex gap-2 mt-3 justify-end">
                    <div className="text-xs text-muted-foreground self-center mr-auto">
                      Created: {formatDate(wave.createdAt)}
                      {wave.releasedAt && <> | Released: {formatDate(wave.releasedAt)}</>}
                      {wave.completedAt && <> | Completed: {formatDate(wave.completedAt)}</>}
                    </div>
                    {wave.status === "draft" && (
                      <Button size="sm" className="h-7 text-xs" onClick={() => onRelease(wave.id)}>
                        <Play className="h-3.5 w-3.5 mr-1" /> Release Wave
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* ── Cycle Count Section ──────────────────────────────────── */

function CycleCountSection({
  zones,
  counts,
  expandedCount,
  setExpandedCount,
}: {
  zones: WarehouseZone[];
  counts: CycleCount[];
  expandedCount: string | null;
  setExpandedCount: (v: string | null) => void;
}) {
  const sorted = [...counts].sort((a, b) => {
    const statusOrder: Record<CycleCountStatus, number> = { "in-progress": 0, scheduled: 1, completed: 2, cancelled: 3 };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ListChecks className="h-4 w-4" /> Cycle Counts
        </CardTitle>
        <CardDescription>Scheduled and completed inventory cycle counts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.map((count) => {
          const isExpanded = expandedCount === count.id;
          const progress = count.totalLocations > 0 ? Math.round((count.countedLocations / count.totalLocations) * 100) : 0;

          return (
            <div key={count.id} className="rounded-lg border">
              <button
                onClick={() => setExpandedCount(isExpanded ? null : count.id)}
                className="w-full p-3 text-left flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-medium text-sm">{count.countNumber}</span>
                  {statusBadge(count.status)}
                  <span className="text-xs text-muted-foreground">
                    {zoneLabel(zones, count.zoneId)}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-xs text-muted-foreground">
                    <Calendar className="inline h-3 w-3 mr-0.5" />
                    {formatDate(count.scheduledDate)}
                    <span className="ml-3">{count.countedLocations}/{count.totalLocations} locs</span>
                    {count.varianceCount > 0 && (
                      <span className="ml-2 text-amber-600">
                        <AlertTriangle className="inline h-3 w-3 mr-0.5" />
                        {count.varianceCount} variance
                      </span>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t px-3 pb-3">
                  <div className="rounded-md border mt-3 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Location</TableHead>
                          <TableHead className="text-xs">Expected Item</TableHead>
                          <TableHead className="text-xs text-right">Expected Qty</TableHead>
                          <TableHead className="text-xs text-right">Counted Qty</TableHead>
                          <TableHead className="text-xs text-right">Variance</TableHead>
                          <TableHead className="text-xs text-right">Variance %</TableHead>
                          <TableHead className="text-xs">Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {count.items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs font-mono">
                              {warehouseStore.getLocationById(item.locationId)?.barcode ?? item.locationId}
                            </TableCell>
                            <TableCell className="text-xs">{item.expectedItem ?? "—"}</TableCell>
                            <TableCell className="text-xs text-right">{item.expectedQuantity}</TableCell>
                            <TableCell className="text-xs text-right">{item.countedQuantity ?? "—"}</TableCell>
                            <TableCell className={cn("text-xs text-right", (item.variance ?? 0) !== 0 && "text-red-600 font-medium")}>
                              {item.variance != null ? item.variance : "—"}
                            </TableCell>
                            <TableCell className={cn("text-xs text-right", (item.variancePct ?? 0) !== 0 && "text-red-600")}>
                              {item.variancePct != null ? `${item.variancePct}%` : "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{item.notes ?? ""}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    <span className="font-medium">Assigned to:</span> {count.assignedTo}
                    {count.notes && <> | <span className="font-medium">Notes:</span> {count.notes}</>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB: Analytics
   ════════════════════════════════════════════════════════════ */

function AnalyticsTab({
  metrics,
  zones,
  conditions,
  cycleCounts,
  transfers,
}: {
  metrics: WarehouseMetrics;
  zones: WarehouseZone[];
  conditions: StorageCondition[];
  cycleCounts: CycleCount[];
  transfers: LocationTransfer[];
}) {
  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <Target className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Overall Utilization</p>
                <p className="text-2xl font-bold">{metrics.overallUtilizationPct}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Timer className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Putaway Time</p>
                <p className="text-2xl font-bold">{metrics.avgPutawayTimeMinutes} min</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <ShieldCheck className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pick Accuracy</p>
                <p className="text-2xl font-bold">{metrics.pickAccuracyPct}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Hash className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cycle Count Variance</p>
                <p className="text-2xl font-bold">{metrics.cycleCountVariancePct}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Utilization by Zone */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Zone Utilization
          </CardTitle>
          <CardDescription>Storage capacity utilization by warehouse zone</CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleBarChart
            data={metrics.zoneUtilizations.map((u) => ({
              label: u.zoneName,
              value: u.utilizationPct,
              color: u.utilizationPct >= 80 ? "bg-red-500" : u.utilizationPct >= 50 ? "bg-yellow-500" : "bg-green-500",
            }))}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Temperature Compliance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Thermometer className="h-4 w-4" /> Temperature Compliance
            </CardTitle>
            <CardDescription>Current zone conditions vs. GMP-required ranges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {conditions.map((cond) => {
                const zone = zones.find((z) => z.id === cond.zoneId);
                if (!zone) return null;
                const tempInRange = cond.temperature >= zone.temperatureRange.min && cond.temperature <= zone.temperatureRange.max;
                const humInRange = cond.humidity >= zone.humidityRange.min && cond.humidity <= zone.humidityRange.max;

                return (
                  <div key={cond.id} className="flex items-center gap-3 text-xs">
                    <span className="w-40 truncate font-medium">{zone.name}</span>
                    <div className="flex items-center gap-1.5">
                      <Thermometer className="h-3 w-3" />
                      <span className={cn(tempInRange ? "text-green-600" : "text-red-600", "font-medium")}>
                        {cond.temperature.toFixed(1)}°C
                      </span>
                      <span className="text-muted-foreground">
                        ({zone.temperatureRange.min}-{zone.temperatureRange.max}°C)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Droplets className="h-3 w-3" />
                      <span className={cn(humInRange ? "text-green-600" : "text-red-600", "font-medium")}>
                        {cond.humidity}%
                      </span>
                      <span className="text-muted-foreground">
                        ({zone.humidityRange.min}-{zone.humidityRange.max}%)
                      </span>
                    </div>
                    <div className="ml-auto">
                      {tempInRange && humInRange ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <Separator className="my-3" />
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Overall Temperature Compliance</span>
              <span className={cn("font-bold", metrics.temperatureCompliance >= 95 ? "text-green-600" : "text-red-600")}>
                {metrics.temperatureCompliance}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Cycle Count Results */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="h-4 w-4" /> Cycle Count Performance
            </CardTitle>
            <CardDescription>Recent cycle count accuracy and variance tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cycleCounts
                .filter((c) => c.status === "completed")
                .map((count) => {
                  const totalItems = count.items.length;
                  const accurate = count.items.filter((i) => (i.variance ?? 0) === 0).length;
                  const accuracy = totalItems > 0 ? Math.round((accurate / totalItems) * 100) : 100;

                  return (
                    <div key={count.id} className="flex items-center gap-3 text-xs">
                      <span className="font-mono font-medium w-28">{count.countNumber}</span>
                      <span className="w-28 truncate">{zoneLabel(zones, count.zoneId)}</span>
                      <span className="text-muted-foreground w-20">{formatDate(count.completedDate)}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div
                              className={cn(
                                "h-2 rounded-full",
                                accuracy === 100 ? "bg-green-500" : accuracy >= 90 ? "bg-yellow-500" : "bg-red-500"
                              )}
                              style={{ width: `${accuracy}%` }}
                            />
                          </div>
                          <span className="font-medium w-10 text-right">{accuracy}%</span>
                        </div>
                      </div>
                      {count.varianceCount > 0 ? (
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700">
                          {count.varianceCount} variance{count.varianceCount > 1 ? "s" : ""}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700">
                          Perfect
                        </Badge>
                      )}
                    </div>
                  );
                })}
            </div>
            <Separator className="my-3" />
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Overall Cycle Count Variance</span>
              <span className={cn("font-bold", metrics.cycleCountVariancePct <= 2 ? "text-green-600" : "text-red-600")}>
                {metrics.cycleCountVariancePct}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location Distribution & Putaway Efficiency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" /> Location Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="text-3xl font-bold text-blue-700">{metrics.occupiedLocations}</div>
                <div className="text-xs text-blue-600 mt-1">Occupied</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="text-3xl font-bold text-green-700">{metrics.availableLocations}</div>
                <div className="text-xs text-green-600 mt-1">Available</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div className="text-3xl font-bold text-amber-700">{metrics.reservedLocations}</div>
                <div className="text-xs text-amber-600 mt-1">Reserved</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-red-50 border border-red-200">
                <div className="text-3xl font-bold text-red-700">{metrics.blockedLocations}</div>
                <div className="text-xs text-red-600 mt-1">Blocked</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4" /> Putaway Efficiency
            </CardTitle>
            <CardDescription>Task completion rate and average processing time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Completed vs pending */}
              {(() => {
                const completed = warehouseStore.getAllPutawayTasks().filter((t) => t.status === "completed").length;
                const total = warehouseStore.getAllPutawayTasks().length;
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                return (
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Completion Rate</span>
                      <span className="font-medium">{completed}/{total} tasks ({pct}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div className="h-3 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })()}

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{metrics.avgPutawayTimeMinutes}</div>
                  <div className="text-xs text-muted-foreground">Avg Putaway Time (min)</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{metrics.pendingPutaways}</div>
                  <div className="text-xs text-muted-foreground">Pending Tasks</div>
                </div>
              </div>

              <Separator />

              {/* Priority breakdown */}
              <div className="text-xs space-y-1.5">
                <div className="font-medium text-muted-foreground mb-1">Pending by Priority</div>
                {(["urgent", "high", "medium", "low"] as const).map((prio) => {
                  const count = warehouseStore.getAllPutawayTasks().filter(
                    (t) => t.priority === prio && t.status !== "completed" && t.status !== "cancelled"
                  ).length;
                  return (
                    <div key={prio} className="flex items-center justify-between">
                      {priorityBadge(prio)}
                      <span className="font-medium">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transfer Activity Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" /> Transfer Activity
          </CardTitle>
          <CardDescription>Recent inventory movements across warehouse zones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {transfers.map((tr) => {
              const fromLoc = warehouseStore.getLocationById(tr.fromLocationId);
              const toLoc = warehouseStore.getLocationById(tr.toLocationId);
              const fromZone = fromLoc ? zones.find((z) => z.id === fromLoc.zoneId) : null;
              const toZone = toLoc ? zones.find((z) => z.id === toLoc.zoneId) : null;

              return (
                <div key={tr.id} className="flex items-center gap-3 text-xs p-2 rounded-lg border">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground w-20">{formatDate(tr.transferDate)}</span>
                  <span className="font-medium truncate max-w-[150px]">{tr.itemName}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px]">{fromZone?.name ?? "—"}</Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="outline" className="text-[10px]">{toZone?.name ?? "—"}</Badge>
                  </div>
                  <span className="ml-auto text-muted-foreground">{tr.quantity} {tr.unit}</span>
                  <span className="text-muted-foreground">{tr.transferredBy}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
