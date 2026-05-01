"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  MapPin,
  Navigation,
  Route,
  Map as MapIcon,
  Users,
  CheckSquare,
  Activity,
  Clock,
  ArrowRight,
  Shield,
  AlertTriangle,
  Target,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import { useAppConfig } from "@/lib/config-context";
import type { Column } from "@/components/shared/data-table";

const LeafletMap = dynamic(
  () => import("@/components/shared/leaflet-map").then((m) => m.LeafletMap),
  { ssr: false, loading: () => <div className="h-[420px] bg-slate-100 rounded-lg animate-pulse" /> }
);

type VisitStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED";

interface FieldVisit {
  id: string;
  rep: string;
  account: string;
  checkIn: string;
  checkOut: string;
  address: string;
  status: VisitStatus;
  distance: string;
  lat: number;
  lng: number;
}

interface LiveLocation {
  id: string;
  rep: string;
  latitude: number;
  longitude: number;
  lastUpdated: string;
  battery: number;
  accuracy: number;
  color: string;
}

interface Territory {
  id: string;
  name: string;
  rep: string;
  description: string;
  color: string;
  accounts: number;
}

const FIELD_VISITS: FieldVisit[] = [
  { id: "FV-001", rep: "Mohamed El-Sayed", account: "Dr. Ahmed El-Gamal — Cardiology Clinic", checkIn: "09:15 AM", checkOut: "10:40 AM", address: "123 Tahrir Square, Downtown, Cairo", status: "COMPLETED", distance: "3.2 km", lat: 30.0444, lng: 31.2357 },
  { id: "FV-002", rep: "Nadia Hamdy", account: "Cleopatra Hospital", checkIn: "10:00 AM", checkOut: "11:30 AM", address: "Heliopolis, Cairo", status: "COMPLETED", distance: "8.7 km", lat: 30.0988, lng: 31.3413 },
  { id: "FV-003", rep: "Youssef Rashad", account: "Dar Al Fouad Hospital", checkIn: "11:45 AM", checkOut: "—", address: "6th of October City, Giza", status: "IN_PROGRESS", distance: "5.1 km", lat: 29.9627, lng: 30.9373 },
  { id: "FV-004", rep: "Mohamed El-Sayed", account: "Dr. Salma Ibrahim — Endocrinology", checkIn: "01:00 PM", checkOut: "—", address: "Mohandessin, Giza", status: "PLANNED", distance: "12.4 km", lat: 30.0619, lng: 31.2009 },
  { id: "FV-005", rep: "Heba El-Gendy", account: "El-Ezaby Pharmacy — Maadi Branch", checkIn: "02:30 PM", checkOut: "—", address: "Road 9, Maadi, Cairo", status: "PLANNED", distance: "19.8 km", lat: 29.9603, lng: 31.2568 },
  { id: "FV-006", rep: "Mostafa Kamal", account: "Ain Shams University Hospital", checkIn: "09:30 AM", checkOut: "11:00 AM", address: "Abbassia, Cairo", status: "COMPLETED", distance: "7.6 km", lat: 30.0725, lng: 31.2807 },
];

const LIVE_LOCATIONS: LiveLocation[] = [
  { id: "LL-001", rep: "Mohamed El-Sayed", latitude: 30.0444, longitude: 31.2357, lastUpdated: "2 min ago", battery: 78, accuracy: 8, color: "#3b82f6" },
  { id: "LL-002", rep: "Nadia Hamdy", latitude: 30.0988, longitude: 31.3413, lastUpdated: "5 min ago", battery: 53, accuracy: 12, color: "#8b5cf6" },
  { id: "LL-003", rep: "Youssef Rashad", latitude: 29.9627, longitude: 30.9373, lastUpdated: "1 min ago", battery: 91, accuracy: 5, color: "#10b981" },
  { id: "LL-004", rep: "Heba El-Gendy", latitude: 29.9603, longitude: 31.2568, lastUpdated: "8 min ago", battery: 34, accuracy: 15, color: "#f97316" },
  { id: "LL-005", rep: "Mostafa Kamal", latitude: 30.0725, longitude: 31.2807, lastUpdated: "3 min ago", battery: 67, accuracy: 9, color: "#ef4444" },
];

const TERRITORIES: Territory[] = [
  { id: "T-001", name: "Cairo North", rep: "Ahmed Mostafa (DM)", description: "Heliopolis, Nasr City, Abbassia, and surrounding districts. Covers major hospitals including Ain Shams and Cleopatra.", color: "bg-blue-500", accounts: 84 },
  { id: "T-002", name: "Giza & 6th October", rep: "Tarek Samir (DM)", description: "Mohandessin, Dokki, 6th of October City. Includes Dar Al Fouad and private specialty clinics.", color: "bg-purple-500", accounts: 67 },
  { id: "T-003", name: "Maadi & New Cairo", rep: "Mariam Fouad (DM)", description: "Maadi, Tagammu, New Cairo. Strong pharmacy chain presence — El-Ezaby and Seif branches.", color: "bg-emerald-500", accounts: 52 },
];

/* ---------- Route Planner types & seed data ---------- */

interface RouteStop {
  id: string;
  order: number;
  account: string;
  address: string;
  lat: number;
  lng: number;
  estimatedArrival: string;
  estimatedDuration: number; // minutes on-site
  type: "Hospital" | "Clinic" | "Pharmacy";
}

const ROUTE_STOPS: RouteStop[] = [
  { id: "RS-001", order: 1, account: "Qasr El Ainy Hospital", address: "Qasr Al Ainy St, Old Cairo", lat: 30.0282, lng: 31.2275, estimatedArrival: "09:00 AM", estimatedDuration: 45, type: "Hospital" },
  { id: "RS-002", order: 2, account: "Dr. Hany Morcos — Neurology Clinic", address: "26th of July St, Zamalek", lat: 30.0609, lng: 31.2194, estimatedArrival: "10:15 AM", estimatedDuration: 30, type: "Clinic" },
  { id: "RS-003", order: 3, account: "Seif Pharmacy — Dokki", address: "Mesaha Square, Dokki, Giza", lat: 30.0380, lng: 31.2010, estimatedArrival: "11:15 AM", estimatedDuration: 20, type: "Pharmacy" },
  { id: "RS-004", order: 4, account: "Al Salam International Hospital", address: "Corniche El Nil, Maadi", lat: 29.9600, lng: 31.2320, estimatedArrival: "12:15 PM", estimatedDuration: 50, type: "Hospital" },
  { id: "RS-005", order: 5, account: "Dr. Laila Farouk — Cardiology", address: "El Nasr Rd, Nasr City", lat: 30.0511, lng: 31.3456, estimatedArrival: "02:00 PM", estimatedDuration: 35, type: "Clinic" },
  { id: "RS-006", order: 6, account: "El-Ezaby Pharmacy — Heliopolis", address: "El Merghany St, Heliopolis", lat: 30.0870, lng: 31.3300, estimatedArrival: "03:15 PM", estimatedDuration: 20, type: "Pharmacy" },
];

/** Haversine distance in km between two lat/lng points */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Estimate driving time in minutes (~30 km/h average in Cairo) */
function estimateDriveMin(km: number): number {
  return Math.round((km / 30) * 60);
}

function totalRouteDistance(stops: RouteStop[]): number {
  let d = 0;
  for (let i = 1; i < stops.length; i++) {
    d += haversineKm(stops[i - 1].lat, stops[i - 1].lng, stops[i].lat, stops[i].lng);
  }
  return d;
}

function totalRouteTime(stops: RouteStop[]): number {
  let t = 0;
  for (let i = 1; i < stops.length; i++) {
    t += estimateDriveMin(haversineKm(stops[i - 1].lat, stops[i - 1].lng, stops[i].lat, stops[i].lng));
  }
  // Add on-site time
  for (const s of stops) t += s.estimatedDuration;
  return t;
}

/** Nearest-neighbor route optimizer starting from the first stop */
function optimizeRoute(stops: RouteStop[]): RouteStop[] {
  if (stops.length <= 2) return stops.map((s, i) => ({ ...s, order: i + 1 }));
  const remaining = [...stops];
  const result: RouteStop[] = [remaining.shift()!];
  while (remaining.length > 0) {
    const last = result[result.length - 1];
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(last.lat, last.lng, remaining[i].lat, remaining[i].lng);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    result.push(remaining.splice(bestIdx, 1)[0]);
  }
  // Recalculate arrivals
  let currentTime = 9 * 60; // 09:00 in minutes
  return result.map((s, i) => {
    if (i > 0) {
      const driveMin = estimateDriveMin(haversineKm(result[i - 1].lat, result[i - 1].lng, s.lat, s.lng));
      currentTime += result[i - 1].estimatedDuration + driveMin;
    }
    const hours = Math.floor(currentTime / 60);
    const mins = currentTime % 60;
    const ampm = hours >= 12 ? "PM" : "AM";
    const h12 = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return {
      ...s,
      order: i + 1,
      estimatedArrival: `${h12.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")} ${ampm}`,
    };
  });
}

/* ---------- Geofencing types & seed data ---------- */

type GeofenceEventType = "ENTERED" | "EXITED";

interface GeofenceZone {
  id: string;
  name: string;
  type: "Hospital" | "Pharmacy" | "Clinic" | "Distributor";
  centerLat: number;
  centerLng: number;
  radius: number; // meters
  totalVisits: number;
  compliantVisits: number;
}

interface GeofenceAlert {
  id: string;
  rep: string;
  zone: string;
  event: GeofenceEventType;
  timestamp: string;
  duration: string;
  compliant: boolean;
}

const GEOFENCE_ZONES: GeofenceZone[] = [
  { id: "GZ-001", name: "Qasr El Ainy Hospital", type: "Hospital", centerLat: 30.0282, centerLng: 31.2275, radius: 150, totalVisits: 42, compliantVisits: 39 },
  { id: "GZ-002", name: "Cleopatra Hospital — Heliopolis", type: "Hospital", centerLat: 30.0988, centerLng: 31.3413, radius: 200, totalVisits: 35, compliantVisits: 34 },
  { id: "GZ-003", name: "Seif Pharmacy — Dokki", type: "Pharmacy", centerLat: 30.0380, centerLng: 31.2010, radius: 80, totalVisits: 28, compliantVisits: 24 },
  { id: "GZ-004", name: "Dr. Hany Morcos — Neurology", type: "Clinic", centerLat: 30.0609, centerLng: 31.2194, radius: 100, totalVisits: 19, compliantVisits: 18 },
  { id: "GZ-005", name: "Al Salam International Hospital", type: "Hospital", centerLat: 29.9600, centerLng: 31.2320, radius: 250, totalVisits: 31, compliantVisits: 29 },
];

const GEOFENCE_ALERTS: GeofenceAlert[] = [
  { id: "GA-001", rep: "Mohamed El-Sayed", zone: "Qasr El Ainy Hospital", event: "ENTERED", timestamp: "2026-05-01 09:12 AM", duration: "47 min", compliant: true },
  { id: "GA-002", rep: "Mohamed El-Sayed", zone: "Qasr El Ainy Hospital", event: "EXITED", timestamp: "2026-05-01 09:59 AM", duration: "—", compliant: true },
  { id: "GA-003", rep: "Nadia Hamdy", zone: "Cleopatra Hospital — Heliopolis", event: "ENTERED", timestamp: "2026-05-01 10:05 AM", duration: "1h 22min", compliant: true },
  { id: "GA-004", rep: "Nadia Hamdy", zone: "Cleopatra Hospital — Heliopolis", event: "EXITED", timestamp: "2026-05-01 11:27 AM", duration: "—", compliant: true },
  { id: "GA-005", rep: "Youssef Rashad", zone: "Al Salam International Hospital", event: "ENTERED", timestamp: "2026-05-01 11:48 AM", duration: "Ongoing", compliant: true },
  { id: "GA-006", rep: "Heba El-Gendy", zone: "Seif Pharmacy — Dokki", event: "ENTERED", timestamp: "2026-05-01 02:33 PM", duration: "18 min", compliant: false },
  { id: "GA-007", rep: "Heba El-Gendy", zone: "Seif Pharmacy — Dokki", event: "EXITED", timestamp: "2026-05-01 02:51 PM", duration: "—", compliant: false },
  { id: "GA-008", rep: "Mostafa Kamal", zone: "Dr. Hany Morcos — Neurology", event: "ENTERED", timestamp: "2026-05-01 01:15 PM", duration: "32 min", compliant: true },
];

const GEOFENCE_EVENT_STYLES: Record<GeofenceEventType, string> = {
  ENTERED: "bg-green-100 text-green-800",
  EXITED: "bg-slate-100 text-slate-800",
};

const VISIT_STATUS_STYLES: Record<VisitStatus, string> = {
  PLANNED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-green-100 text-green-800",
};

function BatteryIndicator({ pct }: { pct: number }) {
  const color = pct <= 20 ? "text-red-500" : pct <= 50 ? "text-amber-500" : "text-green-600";
  return <span className={`font-medium text-sm ${color}`}>{pct}%</span>;
}

const VISIT_FILTER_FIELDS = [
  { key: "status", label: "Status", type: "select" as const, options: [
    { label: "Planned", value: "PLANNED" }, { label: "In Progress", value: "IN_PROGRESS" }, { label: "Completed", value: "COMPLETED" },
  ]},
];

export default function GpsTrackingPage() {
  const { config } = useAppConfig();
  const [activeTab, setActiveTab] = useState("visits");
  const [mapView, setMapView] = useState<"live" | "visits">("live");
  const [visitFilters, setVisitFilters] = useState<FilterState>({ _search: "", status: "" });

  const completedVisits = FIELD_VISITS.filter((v) => v.status === "COMPLETED").length;
  const inProgressVisits = FIELD_VISITS.filter((v) => v.status === "IN_PROGRESS").length;

  const filteredVisits = FIELD_VISITS.filter((v) => {
    const q = (visitFilters._search || "").toLowerCase();
    const matchesSearch = !q || v.rep.toLowerCase().includes(q) || v.account.toLowerCase().includes(q) || v.address.toLowerCase().includes(q);
    const matchesStatus = !visitFilters.status || v.status === visitFilters.status;
    return matchesSearch && matchesStatus;
  });

  const markers = useMemo(() => {
    if (mapView === "live") {
      return LIVE_LOCATIONS.map((l) => ({
        id: l.id, lat: l.latitude, lng: l.longitude, label: l.rep,
        description: `Updated ${l.lastUpdated} · Battery ${l.battery}%`, color: l.color,
      }));
    }
    return FIELD_VISITS.map((v) => ({
      id: v.id, lat: v.lat, lng: v.lng, label: `${v.account}`,
      description: `${v.rep} · ${v.status.replace(/_/g, " ")} · ${v.address}`,
      color: v.status === "COMPLETED" ? "#10b981" : v.status === "IN_PROGRESS" ? "#f59e0b" : "#3b82f6",
    }));
  }, [mapView]);

  const visitColumns: Column<Record<string, unknown>>[] = [
    { key: "rep", label: "Rep" },
    { key: "account", label: "Account" },
    { key: "checkIn", label: "Check In" },
    { key: "checkOut", label: "Check Out" },
    { key: "address", label: "Address" },
    { key: "status", label: "Status", render: (v) => (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${VISIT_STATUS_STYLES[v as VisitStatus]}`}>
        {(v as string).replace(/_/g, " ")}
      </span>
    )},
    { key: "distance", label: "Distance", className: "text-right" },
  ];

  const locationColumns: Column<Record<string, unknown>>[] = [
    { key: "rep", label: "Rep Name", render: (v, row) => (
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full shrink-0 border-2 border-white shadow-sm" style={{ backgroundColor: row.color as string }} />
        <span className="font-medium text-foreground">{v as string}</span>
      </div>
    )},
    { key: "latitude", label: "Latitude", render: (v) => <span className="font-mono text-xs text-muted-foreground">{(v as number).toFixed(4)}</span> },
    { key: "longitude", label: "Longitude", render: (v) => <span className="font-mono text-xs text-muted-foreground">{(v as number).toFixed(4)}</span> },
    { key: "lastUpdated", label: "Last Updated" },
    { key: "battery", label: "Battery", render: (v) => (
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${(v as number) <= 20 ? "bg-red-500" : (v as number) <= 50 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${v as number}%` }} />
        </div>
        <BatteryIndicator pct={v as number} />
      </div>
    )},
    { key: "accuracy", label: "Accuracy", render: (v) => <span className="text-muted-foreground">±{v as number} m</span>, className: "text-right" },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="GPS / Field Tracking"
        description={`Real-time field force tracking · ${config.integrations.mapProvider} · GPS radius ${config.crm.visitValidationRadius}m`}
      >
        <Button variant="outline" className="gap-2"><Activity className="w-4 h-4" /> Refresh Locations</Button>
        <Button className="gap-2"><MapPin className="w-4 h-4" /> Log Visit</Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Field Reps Active" value={LIVE_LOCATIONS.length} subtitle="Currently in the field" icon={Users} change={20} changeLabel="vs last week" />
        <StatsCard title="Visits Today" value={FIELD_VISITS.length} subtitle={`${completedVisits} completed · ${inProgressVisits} in progress`} icon={CheckSquare} change={9} changeLabel="vs yesterday" />
        <StatsCard title="Avg Distance" value="15.3 km" subtitle="Per rep today" icon={Route} change={-4} changeLabel="vs last week" />
        <StatsCard title="Territories" value={TERRITORIES.length} subtitle="Active coverage zones" icon={MapIcon} />
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Navigation className="h-4 w-4 text-primary" /> Live Map — Cairo Metropolitan Area
              </CardTitle>
              <CardDescription>Powered by OpenStreetMap · Tiles {String.fromCharCode(169)} OSM contributors</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border overflow-hidden text-xs">
                <button onClick={() => setMapView("live")} className={`px-3 py-1.5 ${mapView === "live" ? "bg-blue-600 text-white" : "bg-white hover:bg-slate-50"}`}>Live Reps</button>
                <button onClick={() => setMapView("visits")} className={`px-3 py-1.5 border-l ${mapView === "visits" ? "bg-blue-600 text-white" : "bg-white hover:bg-slate-50"}`}>Today&apos;s Visits</button>
              </div>
              <Badge variant="outline" className="gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                Live
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <LeafletMap markers={markers} height="460px" zoom={11} />
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="visits">Field Visits</TabsTrigger>
          <TabsTrigger value="live">Live Locations</TabsTrigger>
          <TabsTrigger value="territories">Territories</TabsTrigger>
        </TabsList>

        <TabsContent value="visits">
          <div className="bg-card rounded-xl border border-border shadow-sm">
            <div className="p-4 border-b border-border">
              <FilterBar
                searchValue={visitFilters._search}
                onSearchChange={(v) => setVisitFilters((f) => ({ ...f, _search: v }))}
                fields={VISIT_FILTER_FIELDS}
                values={visitFilters}
                onChange={(k, v) => setVisitFilters((f) => ({ ...f, [k]: v }))}
              />
            </div>
            <DataTable columns={visitColumns} data={filteredVisits as unknown as Record<string, unknown>[]} exportable exportFilename="crm-gps-tracking.csv" emptyMessage="No visits found." />
          </div>
        </TabsContent>

        <TabsContent value="live">
          <div className="bg-card rounded-xl border border-border shadow-sm">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Live Rep Locations</h3>
              <Badge variant="outline" className="gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                {LIVE_LOCATIONS.length} active
              </Badge>
            </div>
            <DataTable columns={locationColumns} data={LIVE_LOCATIONS as unknown as Record<string, unknown>[]} exportable exportFilename="crm-gps-tracking.csv" emptyMessage="No active locations." />
          </div>
        </TabsContent>

        <TabsContent value="territories">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TERRITORIES.map((territory) => (
              <Card key={territory.id} className="overflow-hidden">
                <div className={`h-1.5 w-full ${territory.color}`} />
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{territory.name}</CardTitle>
                    <span className={`w-3 h-3 rounded-full ${territory.color} shrink-0 mt-1`} />
                  </div>
                  <CardDescription className="text-xs font-medium text-foreground/70">Assigned to {territory.rep}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{territory.description}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">Accounts</span>
                    <span className="text-sm font-semibold text-foreground">{territory.accounts}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
