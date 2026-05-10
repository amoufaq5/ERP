"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Thermometer,
  Droplets,
  Wind,
  Activity,
  X,
} from "lucide-react";
import type {
  MonitoringLocation,
  MonitoringReading,
  MonitoringPoint,
  ZoneClassification,
  ParameterType,
} from "@/lib/quality/env-monitoring-types";
import { PARAMETER_LABELS, ZONE_LABELS } from "@/lib/quality/env-monitoring-types";
import { useEnvMonitoringStore } from "@/lib/quality/env-monitoring-store";

// ─── Helpers ───────────────────────────────────────────────────────────────

const ZONE_COLORS: Record<ZoneClassification, { bg: string; border: string; label: string }> = {
  "Grade A": { bg: "bg-blue-50", border: "border-blue-300", label: "text-blue-700" },
  "Grade B": { bg: "bg-indigo-50", border: "border-indigo-300", label: "text-indigo-700" },
  "Grade C": { bg: "bg-violet-50", border: "border-violet-300", label: "text-violet-700" },
  "Grade D": { bg: "bg-slate-50", border: "border-slate-300", label: "text-slate-700" },
  Unclassified: { bg: "bg-gray-50", border: "border-gray-300", label: "text-gray-600" },
};

const STATUS_INDICATOR: Record<string, { bg: string; ring: string; text: string }> = {
  normal: { bg: "bg-green-500", ring: "ring-green-200", text: "text-green-700" },
  alert: { bg: "bg-yellow-500", ring: "ring-yellow-200", text: "text-yellow-700" },
  action: { bg: "bg-red-500", ring: "ring-red-200", text: "text-red-700" },
};

function getParameterIcon(parameter: ParameterType) {
  switch (parameter) {
    case "temperature":
      return Thermometer;
    case "humidity":
      return Droplets;
    case "viable-air":
    case "non-viable-particles":
      return Wind;
    default:
      return Activity;
  }
}

function formatValue(value: number, unit: string): string {
  if (unit === "particles/m³" && value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toFixed(value < 10 ? 2 : 0);
}

// ─── Mini Sparkline ────────────────────────────────────────────────────────

function MiniSparkline({
  readings,
  alertLimit,
  actionLimit,
}: {
  readings: MonitoringReading[];
  alertLimit: number;
  actionLimit: number;
}) {
  if (readings.length < 2) return null;

  const values = readings.slice(-12).map((r) => r.value);
  const max = Math.max(...values, actionLimit * 1.1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const w = 80;
  const h = 24;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");

  const alertY = h - ((alertLimit - min) / range) * h;
  const actionY = h - ((actionLimit - min) / range) * h;

  return (
    <svg width={w} height={h} className="inline-block">
      {/* Alert limit line */}
      <line
        x1={0} y1={alertY} x2={w} y2={alertY}
        stroke="#eab308" strokeWidth={0.5} strokeDasharray="2,2"
      />
      {/* Action limit line */}
      <line
        x1={0} y1={actionY} x2={w} y2={actionY}
        stroke="#ef4444" strokeWidth={0.5} strokeDasharray="2,2"
      />
      {/* Data line */}
      <polyline
        points={points}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      {values.length > 0 && (
        <circle
          cx={(values.length - 1) / (values.length - 1) * w}
          cy={h - ((values[values.length - 1] - min) / range) * h}
          r={2}
          fill={
            values[values.length - 1] >= actionLimit
              ? "#ef4444"
              : values[values.length - 1] >= alertLimit
                ? "#eab308"
                : "#22c55e"
          }
        />
      )}
    </svg>
  );
}

// ─── Zone Card ─────────────────────────────────────────────────────────────

function ZoneCard({
  location,
  status,
  latestReadings,
  points,
  allItems,
  onClick,
}: {
  location: MonitoringLocation;
  status: "normal" | "alert" | "action";
  latestReadings: MonitoringReading[];
  points: MonitoringPoint[];
  allItems: MonitoringReading[];
  onClick: () => void;
}) {
  const zoneStyle = ZONE_COLORS[location.zone];
  const statusStyle = STATUS_INDICATOR[status];

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full text-left rounded-lg border-2 p-3 transition-all hover:shadow-md cursor-pointer",
        zoneStyle.bg,
        zoneStyle.border,
        status === "action" && "border-red-400 ring-2 ring-red-100",
        status === "alert" && "border-yellow-400 ring-2 ring-yellow-100"
      )}
    >
      {/* Status indicator dot */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <div className={cn("w-2.5 h-2.5 rounded-full ring-2", statusStyle.bg, statusStyle.ring)} />
          <span className="text-xs font-semibold truncate max-w-[140px]">
            {location.name}
          </span>
        </div>
        <Badge variant="outline" className={cn("text-[9px] shrink-0 px-1", zoneStyle.label)}>
          {location.zone}
        </Badge>
      </div>

      {/* Latest readings summary */}
      <div className="space-y-1">
        {latestReadings.slice(0, 3).map((reading) => {
          const point = points.find((p) => p.id === reading.pointId);
          if (!point) return null;
          const Icon = getParameterIcon(point.parameter);
          const allReadings = allItems
            .filter((r: MonitoringReading) => r.pointId === point.id)
            .sort((a: MonitoringReading, b: MonitoringReading) => (a.timestamp ?? '').localeCompare(b.timestamp ?? ''));

          return (
            <div key={reading.id} className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Icon className="w-3 h-3 shrink-0" />
              <span className="truncate flex-1">{formatValue(reading.value, reading.unit)} {reading.unit}</span>
              <MiniSparkline
                readings={allReadings}
                alertLimit={point.alertLimit.value}
                actionLimit={point.actionLimit.value}
              />
            </div>
          );
        })}
      </div>

      {/* Point count */}
      <div className="mt-1.5 text-[9px] text-muted-foreground">
        {points.length} monitoring point{points.length !== 1 ? "s" : ""}
      </div>
    </button>
  );
}

// ─── Zone Detail Panel ─────────────────────────────────────────────────────

function ZoneDetail({
  location,
  points,
  readings,
  onClose,
}: {
  location: MonitoringLocation;
  points: MonitoringPoint[];
  readings: MonitoringReading[];
  onClose: () => void;
}) {
  const zoneStyle = ZONE_COLORS[location.zone];

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm">{location.name}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {ZONE_LABELS[location.zone]} &middot; {location.building}, {location.floor}
            </p>
            <p className="text-xs text-muted-foreground">{location.description}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {points.map((point) => {
            const pointReadings = readings
              .filter((r) => r.pointId === point.id)
              .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
            const latest = pointReadings[0];
            const Icon = getParameterIcon(point.parameter);

            return (
              <div
                key={point.id}
                className={cn(
                  "rounded-md border p-2",
                  latest?.result === "action"
                    ? "border-red-200 bg-red-50"
                    : latest?.result === "alert"
                      ? "border-yellow-200 bg-yellow-50"
                      : "border-gray-200"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">{point.name}</span>
                    <Badge variant="outline" className="text-[9px]">
                      {PARAMETER_LABELS[point.parameter]}
                    </Badge>
                  </div>
                  {latest && (
                    <Badge
                      className={cn(
                        "text-[9px]",
                        latest.result === "pass" && "bg-green-100 text-green-800",
                        latest.result === "alert" && "bg-yellow-100 text-yellow-800",
                        latest.result === "action" && "bg-red-100 text-red-800"
                      )}
                    >
                      {latest.result.toUpperCase()}
                    </Badge>
                  )}
                </div>
                {latest && (
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                    <span>Value: <strong>{formatValue(latest.value, latest.unit)} {latest.unit}</strong></span>
                    <span>Alert: {point.alertLimit.value}</span>
                    <span>Action: {point.actionLimit.value}</span>
                    <span>{new Date(latest.timestamp).toLocaleDateString()}</span>
                  </div>
                )}
                {/* Sparkline */}
                <div className="mt-1">
                  <MiniSparkline
                    readings={pointReadings.slice().reverse()}
                    alertLimit={point.alertLimit.value}
                    actionLimit={point.actionLimit.value}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard Component ──────────────────────────────────────────────

export interface EnvMonitoringDashboardProps {
  className?: string;
}

export default function EnvMonitoringDashboard({
  className,
}: EnvMonitoringDashboardProps) {
  const { items, fetchAll } = useEnvMonitoringStore();
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [locations, setLocations] = useState<MonitoringLocation[]>([]);
  const [allPoints, setAllPoints] = useState<MonitoringPoint[]>([]);

  useEffect(() => {
    fetchAll();
    fetch("/api/v1/qaqc/environmental-monitoring/locations")
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((d) => setLocations(d.data ?? d))
      .catch(() => {});
    fetch("/api/v1/qaqc/environmental-monitoring/points")
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((d) => setAllPoints(d.data ?? d))
      .catch(() => {});
  }, [fetchAll]);

  const groupedByZone = useMemo(() => {
    const groups: Record<ZoneClassification, MonitoringLocation[]> = {
      "Grade A": [],
      "Grade B": [],
      "Grade C": [],
      "Grade D": [],
      Unclassified: [],
    };
    for (const loc of locations) {
      groups[loc.zone].push(loc);
    }
    return groups;
  }, [locations]);

  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === selectedLocationId),
    [locations, selectedLocationId]
  );

  const selectedPoints = useMemo(
    () => (selectedLocationId ? allPoints.filter((p) => p.locationId === selectedLocationId) : []),
    [selectedLocationId, allPoints]
  );

  const readings = items as unknown as MonitoringReading[];

  const selectedReadings = useMemo(
    () => (selectedLocationId ? readings.filter((r) => r.locationId === selectedLocationId) : []),
    [selectedLocationId, readings]
  );

  const getLocationStatus = useCallback((locId: string): "normal" | "alert" | "action" => {
    const locReadings = readings.filter((r) => r.locationId === locId);
    if (locReadings.some((r) => r.result === "action" || r.result === "fail")) return "action";
    if (locReadings.some((r) => r.result === "alert")) return "alert";
    return "normal";
  }, [readings]);

  const getLatestReadings = useCallback((locId: string): MonitoringReading[] => {
    const locReadings = readings.filter((r) => r.locationId === locId);
    const byPoint = new Map<string, MonitoringReading>();
    for (const r of locReadings) {
      const existing = byPoint.get(r.pointId);
      if (!existing || r.timestamp > existing.timestamp) {
        byPoint.set(r.pointId, r);
      }
    }
    return Array.from(byPoint.values());
  }, [readings]);

  const handleZoneClick = useCallback((locationId: string) => {
    setSelectedLocationId((prev) => (prev === locationId ? null : locationId));
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <span className="font-medium text-muted-foreground">Status:</span>
        {(["normal", "alert", "action"] as const).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={cn("w-2.5 h-2.5 rounded-full", STATUS_INDICATOR[s].bg)} />
            <span className="capitalize">{s}</span>
          </div>
        ))}
        <span className="ml-4 font-medium text-muted-foreground">Zone:</span>
        {(Object.keys(ZONE_COLORS) as ZoneClassification[]).map((zone) => (
          <div key={zone} className="flex items-center gap-1">
            <div className={cn("w-3 h-3 rounded border", ZONE_COLORS[zone].bg, ZONE_COLORS[zone].border)} />
            <span className={cn("text-[10px]", ZONE_COLORS[zone].label)}>{zone}</span>
          </div>
        ))}
      </div>

      {/* Facility Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(Object.entries(groupedByZone) as [ZoneClassification, MonitoringLocation[]][]).map(
          ([zone, locs]) => {
            if (locs.length === 0) return null;
            return (
              <div key={zone}>
                <h4 className={cn("text-xs font-semibold mb-2", ZONE_COLORS[zone].label)}>
                  {ZONE_LABELS[zone]}
                </h4>
                <div className="space-y-2">
                  {locs.map((loc) => {
                    const locStatus = getLocationStatus(loc.id);
                    const latestReadings = getLatestReadings(loc.id);
                    const locPoints = allPoints.filter((p) => p.locationId === loc.id);
                    return (
                      <ZoneCard
                        key={loc.id}
                        location={loc}
                        status={locStatus}
                        latestReadings={latestReadings}
                        points={locPoints}
                        allItems={readings}
                        onClick={() => handleZoneClick(loc.id)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          }
        )}
      </div>

      {/* Selected Zone Detail */}
      {selectedLocation && (
        <ZoneDetail
          location={selectedLocation}
          points={selectedPoints}
          readings={selectedReadings}
          onClose={() => setSelectedLocationId(null)}
        />
      )}
    </div>
  );
}
