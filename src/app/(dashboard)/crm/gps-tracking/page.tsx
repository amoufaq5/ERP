"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  MapPin,
  Navigation,
  Route,
  Map as MapIcon,
  Users,
  CheckSquare,
  Activity,
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
