"use client";

import { useState } from "react";
import {
  Thermometer,
  Droplets,
  Package,
  ChevronLeft,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Snowflake,
  Truck,
  RotateCcw,
  ShieldCheck,
  Archive,
  PackageSearch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { warehouseStore } from "@/lib/operations/warehouse-store";
import type {
  WarehouseZone,
  StorageLocation,
  StorageCondition,
  ZoneType,
} from "@/lib/operations/warehouse-types";

/* ── Zone color / icon maps ──────────────────────────────── */

const ZONE_COLORS: Record<ZoneType, string> = {
  receiving: "bg-blue-100 border-blue-400 text-blue-900",
  quarantine: "bg-yellow-100 border-yellow-400 text-yellow-900",
  approved: "bg-green-100 border-green-400 text-green-900",
  rejected: "bg-red-100 border-red-400 text-red-900",
  "cold-storage": "bg-cyan-100 border-cyan-400 text-cyan-900",
  "controlled-substance": "bg-purple-100 border-purple-400 text-purple-900",
  hazmat: "bg-orange-100 border-orange-400 text-orange-900",
  shipping: "bg-indigo-100 border-indigo-400 text-indigo-900",
  returns: "bg-rose-100 border-rose-400 text-rose-900",
};

const ZONE_ICONS: Record<ZoneType, React.ReactNode> = {
  receiving: <Truck className="h-4 w-4" />,
  quarantine: <AlertTriangle className="h-4 w-4" />,
  approved: <ShieldCheck className="h-4 w-4" />,
  rejected: <RotateCcw className="h-4 w-4" />,
  "cold-storage": <Snowflake className="h-4 w-4" />,
  "controlled-substance": <Lock className="h-4 w-4" />,
  hazmat: <AlertTriangle className="h-4 w-4" />,
  shipping: <Package className="h-4 w-4" />,
  returns: <RotateCcw className="h-4 w-4" />,
};

function utilizationColor(pct: number): string {
  if (pct >= 80) return "bg-red-500";
  if (pct >= 50) return "bg-yellow-500";
  return "bg-green-500";
}

function utilizationBg(pct: number): string {
  if (pct >= 80) return "bg-red-50 border-red-300";
  if (pct >= 50) return "bg-yellow-50 border-yellow-300";
  return "bg-green-50 border-green-300";
}

function locationStatusColor(status: StorageLocation["status"]): string {
  switch (status) {
    case "available": return "bg-green-100 text-green-800 border-green-300";
    case "occupied": return "bg-blue-100 text-blue-800 border-blue-300";
    case "reserved": return "bg-amber-100 text-amber-800 border-amber-300";
    case "blocked": return "bg-red-100 text-red-800 border-red-300";
    default: return "bg-gray-100 text-gray-800 border-gray-300";
  }
}

/* ── Props ────────────────────────────────────────────────── */

interface WarehouseMapProps {
  onLocationSelect?: (location: StorageLocation) => void;
  className?: string;
}

/* ── Component ────────────────────────────────────────────── */

export default function WarehouseMap({ onLocationSelect, className }: WarehouseMapProps) {
  const [selectedZone, setSelectedZone] = useState<WarehouseZone | null>(null);

  const zones = warehouseStore.getAllZones();
  const conditions = warehouseStore.getAllConditions();
  const utilizations = warehouseStore.getUtilization();

  /* ── Zone overview ──────────────────────────────────────── */

  function renderZoneOverview() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Warehouse Layout
          </h3>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> &lt;50%
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" /> 50-80%
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> &gt;80%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {zones.map((zone) => {
            const util = utilizations.find((u) => u.zoneId === zone.id);
            const pct = util?.utilizationPct ?? 0;
            const cond = conditions.find((c) => c.zoneId === zone.id);
            const hasAlert = cond && (cond.tempAlertLevel !== "normal" || cond.humidityAlertLevel !== "normal");

            return (
              <button
                key={zone.id}
                onClick={() => setSelectedZone(zone)}
                className={cn(
                  "relative rounded-lg border-2 p-3 text-left transition-all hover:shadow-md",
                  "focus:outline-none focus:ring-2 focus:ring-primary/50",
                  ZONE_COLORS[zone.type],
                  zone.gridWidth === 2 && "col-span-2",
                  zone.gridHeight === 2 && "row-span-2",
                )}
                style={{
                  gridColumn: `span ${zone.gridWidth}`,
                  gridRow: `span ${zone.gridHeight}`,
                }}
              >
                {hasAlert && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 items-center justify-center">
                      <AlertTriangle className="h-2.5 w-2.5 text-white" />
                    </span>
                  </span>
                )}

                <div className="flex items-center gap-1.5 mb-1.5">
                  {ZONE_ICONS[zone.type]}
                  <span className="font-semibold text-xs truncate">{zone.name}</span>
                </div>

                <div className="text-[10px] opacity-80 mb-2">{zone.code}</div>

                {/* Utilization bar */}
                <div className="w-full bg-white/50 rounded-full h-2 mb-1">
                  <div
                    className={cn("h-2 rounded-full transition-all", utilizationColor(pct))}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <div className="text-[10px] font-medium">
                  {pct}% used ({util?.occupied ?? 0}/{util?.capacity ?? 0})
                </div>

                {/* Conditions */}
                {cond && (
                  <div className="flex gap-2 mt-1.5 text-[10px]">
                    <span className="flex items-center gap-0.5">
                      <Thermometer className="h-3 w-3" />
                      {cond.temperature.toFixed(1)}°C
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Droplets className="h-3 w-3" />
                      {cond.humidity}%
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── Zone drill-down ────────────────────────────────────── */

  function renderZoneDrillDown(zone: WarehouseZone) {
    const locations = warehouseStore.getLocationsByZone(zone.id);
    const cond = conditions.find((c) => c.zoneId === zone.id);
    const util = utilizations.find((u) => u.zoneId === zone.id);

    // Group by rack
    const racks = new Map<string, StorageLocation[]>();
    for (const loc of locations) {
      const existing = racks.get(loc.rack) ?? [];
      existing.push(loc);
      racks.set(loc.rack, existing);
    }

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedZone(null)}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            {ZONE_ICONS[zone.type]}
            <h3 className="font-semibold text-sm">{zone.name}</h3>
            <Badge variant="outline" className="text-[10px]">{zone.code}</Badge>
          </div>
        </div>

        {/* Zone stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-lg border bg-card p-2 text-center">
            <div className="text-xs text-muted-foreground">Locations</div>
            <div className="text-lg font-bold">{locations.length}</div>
          </div>
          <div className={cn("rounded-lg border p-2 text-center", utilizationBg(util?.utilizationPct ?? 0))}>
            <div className="text-xs text-muted-foreground">Utilization</div>
            <div className="text-lg font-bold">{util?.utilizationPct ?? 0}%</div>
          </div>
          <div className="rounded-lg border bg-card p-2 text-center">
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Thermometer className="h-3 w-3" /> Temp
            </div>
            <div className={cn("text-lg font-bold", cond?.tempAlertLevel !== "normal" ? "text-red-600" : "")}>
              {cond?.temperature.toFixed(1) ?? "--"}°C
            </div>
          </div>
          <div className="rounded-lg border bg-card p-2 text-center">
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Droplets className="h-3 w-3" /> Humidity
            </div>
            <div className={cn("text-lg font-bold", cond?.humidityAlertLevel !== "normal" ? "text-red-600" : "")}>
              {cond?.humidity ?? "--"}%
            </div>
          </div>
        </div>

        {/* Condition limits */}
        {cond && (
          <div className="rounded-lg border bg-muted/30 p-2 text-[10px] grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium">Temp range:</span>{" "}
              {zone.temperatureRange.min}–{zone.temperatureRange.max}°{zone.temperatureRange.unit}
            </div>
            <div>
              <span className="font-medium">Humidity range:</span>{" "}
              {zone.humidityRange.min}–{zone.humidityRange.max}%
            </div>
          </div>
        )}

        {/* Rack/shelf/bin grid */}
        <div className="space-y-3">
          {Array.from(racks.entries()).map(([rackName, locs]) => (
            <div key={rackName} className="space-y-1.5">
              <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Archive className="h-3 w-3" /> Rack {rackName}
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
                {locs.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => onLocationSelect?.(loc)}
                    className={cn(
                      "rounded border p-1.5 text-[10px] text-center transition-all hover:shadow-sm",
                      "focus:outline-none focus:ring-1 focus:ring-primary/50",
                      locationStatusColor(loc.status),
                    )}
                    title={
                      loc.status === "occupied"
                        ? `${loc.currentItemName}\n${loc.currentBatchNumber}\nQty: ${loc.currentQuantity} ${loc.currentUnit}`
                        : loc.status
                    }
                  >
                    <div className="font-mono font-medium truncate">
                      {loc.shelf}-{loc.bin}
                    </div>
                    {loc.status === "occupied" ? (
                      <div className="flex items-center justify-center mt-0.5">
                        <PackageSearch className="h-3 w-3" />
                      </div>
                    ) : loc.status === "blocked" ? (
                      <div className="flex items-center justify-center mt-0.5">
                        <Lock className="h-3 w-3" />
                      </div>
                    ) : loc.status === "reserved" ? (
                      <div className="flex items-center justify-center mt-0.5">
                        <Archive className="h-3 w-3" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center mt-0.5">
                        <CheckCircle2 className="h-3 w-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Location status legend */}
        <div className="flex gap-3 text-[10px] text-muted-foreground pt-1 border-t">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded border bg-green-100 border-green-300" /> Available
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded border bg-blue-100 border-blue-300" /> Occupied
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded border bg-amber-100 border-amber-300" /> Reserved
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded border bg-red-100 border-red-300" /> Blocked
          </span>
        </div>
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────── */

  return (
    <div className={cn("space-y-4", className)}>
      {selectedZone ? renderZoneDrillDown(selectedZone) : renderZoneOverview()}
    </div>
  );
}
