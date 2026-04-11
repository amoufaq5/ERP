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
import { useAppConfig } from "@/lib/config-context";

// Dynamic import with ssr:false — Leaflet requires window
const LeafletMap = dynamic(
  () => import("@/components/shared/leaflet-map").then((m) => m.LeafletMap),
  { ssr: false, loading: () => <div className="h-[420px] bg-slate-100 rounded-lg animate-pulse" /> }
);

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Demo Data (Egyptian pharma field force) ─────────────────────────────────

const FIELD_VISITS: FieldVisit[] = [
  {
    id: "FV-001",
    rep: "Mohamed El-Sayed",
    account: "Dr. Ahmed El-Gamal — Cardiology Clinic",
    checkIn: "09:15 AM",
    checkOut: "10:40 AM",
    address: "123 Tahrir Square, Downtown, Cairo",
    status: "COMPLETED",
    distance: "3.2 km",
    lat: 30.0444,
    lng: 31.2357,
  },
  {
    id: "FV-002",
    rep: "Nadia Hamdy",
    account: "Cleopatra Hospital",
    checkIn: "10:00 AM",
    checkOut: "11:30 AM",
    address: "Heliopolis, Cairo",
    status: "COMPLETED",
    distance: "8.7 km",
    lat: 30.0988,
    lng: 31.3413,
  },
  {
    id: "FV-003",
    rep: "Youssef Rashad",
    account: "Dar Al Fouad Hospital",
    checkIn: "11:45 AM",
    checkOut: "—",
    address: "6th of October City, Giza",
    status: "IN_PROGRESS",
    distance: "5.1 km",
    lat: 29.9627,
    lng: 30.9373,
  },
  {
    id: "FV-004",
    rep: "Mohamed El-Sayed",
    account: "Dr. Salma Ibrahim — Endocrinology",
    checkIn: "01:00 PM",
    checkOut: "—",
    address: "Mohandessin, Giza",
    status: "PLANNED",
    distance: "12.4 km",
    lat: 30.0619,
    lng: 31.2009,
  },
  {
    id: "FV-005",
    rep: "Heba El-Gendy",
    account: "El-Ezaby Pharmacy — Maadi Branch",
    checkIn: "02:30 PM",
    checkOut: "—",
    address: "Road 9, Maadi, Cairo",
    status: "PLANNED",
    distance: "19.8 km",
    lat: 29.9603,
    lng: 31.2568,
  },
  {
    id: "FV-006",
    rep: "Mostafa Kamal",
    account: "Ain Shams University Hospital",
    checkIn: "09:30 AM",
    checkOut: "11:00 AM",
    address: "Abbassia, Cairo",
    status: "COMPLETED",
    distance: "7.6 km",
    lat: 30.0725,
    lng: 31.2807,
  },
];

const LIVE_LOCATIONS: LiveLocation[] = [
  {
    id: "LL-001",
    rep: "Mohamed El-Sayed",
    latitude: 30.0444,
    longitude: 31.2357,
    lastUpdated: "2 min ago",
    battery: 78,
    accuracy: 8,
    color: "#3b82f6",
  },
  {
    id: "LL-002",
    rep: "Nadia Hamdy",
    latitude: 30.0988,
    longitude: 31.3413,
    lastUpdated: "5 min ago",
    battery: 53,
    accuracy: 12,
    color: "#8b5cf6",
  },
  {
    id: "LL-003",
    rep: "Youssef Rashad",
    latitude: 29.9627,
    longitude: 30.9373,
    lastUpdated: "1 min ago",
    battery: 91,
    accuracy: 5,
    color: "#10b981",
  },
  {
    id: "LL-004",
    rep: "Heba El-Gendy",
    latitude: 29.9603,
    longitude: 31.2568,
    lastUpdated: "8 min ago",
    battery: 34,
    accuracy: 15,
    color: "#f97316",
  },
  {
    id: "LL-005",
    rep: "Mostafa Kamal",
    latitude: 30.0725,
    longitude: 31.2807,
    lastUpdated: "3 min ago",
    battery: 67,
    accuracy: 9,
    color: "#ef4444",
  },
];

const TERRITORIES: Territory[] = [
  {
    id: "T-001",
    name: "Cairo North",
    rep: "Ahmed Mostafa (DM)",
    description:
      "Heliopolis, Nasr City, Abbassia, and surrounding districts. Covers major hospitals including Ain Shams and Cleopatra.",
    color: "bg-blue-500",
    accounts: 84,
  },
  {
    id: "T-002",
    name: "Giza & 6th October",
    rep: "Tarek Samir (DM)",
    description:
      "Mohandessin, Dokki, 6th of October City. Includes Dar Al Fouad and private specialty clinics.",
    color: "bg-purple-500",
    accounts: 67,
  },
  {
    id: "T-003",
    name: "Maadi & New Cairo",
    rep: "Mariam Fouad (DM)",
    description:
      "Maadi, Tagammu, New Cairo. Strong pharmacy chain presence — El-Ezaby and Seif branches.",
    color: "bg-emerald-500",
    accounts: 52,
  },
];

// ─── Status Badge ─────────────────────────────────────────────────────────────

const VISIT_STATUS_STYLES: Record<VisitStatus, string> = {
  PLANNED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-green-100 text-green-800",
};

function VisitStatusBadge({ status }: { status: VisitStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${VISIT_STATUS_STYLES[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function BatteryIndicator({ pct }: { pct: number }) {
  const color =
    pct <= 20 ? "text-red-500" : pct <= 50 ? "text-amber-500" : "text-green-600";
  return <span className={`font-medium text-sm ${color}`}>{pct}%</span>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GpsTrackingPage() {
  const { config } = useAppConfig();
  const [activeTab, setActiveTab] = useState("visits");
  const [mapView, setMapView] = useState<"live" | "visits">("live");

  const completedVisits = FIELD_VISITS.filter((v) => v.status === "COMPLETED").length;
  const inProgress = FIELD_VISITS.filter((v) => v.status === "IN_PROGRESS").length;

  // Convert current view to markers
  const markers = useMemo(() => {
    if (mapView === "live") {
      return LIVE_LOCATIONS.map((l) => ({
        id: l.id,
        lat: l.latitude,
        lng: l.longitude,
        label: l.rep,
        description: `Updated ${l.lastUpdated} · Battery ${l.battery}%`,
        color: l.color,
      }));
    }
    return FIELD_VISITS.map((v) => ({
      id: v.id,
      lat: v.lat,
      lng: v.lng,
      label: `${v.account}`,
      description: `${v.rep} · ${v.status.replace("_", " ")} · ${v.address}`,
      color:
        v.status === "COMPLETED"
          ? "#10b981"
          : v.status === "IN_PROGRESS"
          ? "#f59e0b"
          : "#3b82f6",
    }));
  }, [mapView]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="GPS / Field Tracking"
        description={`Real-time field force tracking · ${config.integrations.mapProvider} · GPS radius ${config.crm.visitValidationRadius}m`}
      >
        <Button variant="outline" className="gap-2">
          <Activity className="w-4 h-4" />
          Refresh Locations
        </Button>
        <Button className="gap-2">
          <MapPin className="w-4 h-4" />
          Log Visit
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Field Reps Active"
          value={LIVE_LOCATIONS.length}
          subtitle="Currently in the field"
          icon={Users}
          change={20}
          changeLabel="vs last week"
        />
        <StatsCard
          title="Visits Today"
          value={FIELD_VISITS.length}
          subtitle={`${completedVisits} completed · ${inProgress} in progress`}
          icon={CheckSquare}
          change={9}
          changeLabel="vs yesterday"
        />
        <StatsCard
          title="Avg Distance"
          value="15.3 km"
          subtitle="Per rep today"
          icon={Route}
          change={-4}
          changeLabel="vs last week"
        />
        <StatsCard
          title="Territories"
          value={TERRITORIES.length}
          subtitle="Active coverage zones"
          icon={MapIcon}
        />
      </div>

      {/* Real Map */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Navigation className="h-4 w-4 text-primary" />
                Live Map — Cairo Metropolitan Area
              </CardTitle>
              <CardDescription>
                Powered by OpenStreetMap · Tiles {String.fromCharCode(169)} OSM contributors
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border overflow-hidden text-xs">
                <button
                  onClick={() => setMapView("live")}
                  className={`px-3 py-1.5 ${mapView === "live" ? "bg-blue-600 text-white" : "bg-white hover:bg-slate-50"}`}
                >
                  Live Reps
                </button>
                <button
                  onClick={() => setMapView("visits")}
                  className={`px-3 py-1.5 border-l ${mapView === "visits" ? "bg-blue-600 text-white" : "bg-white hover:bg-slate-50"}`}
                >
                  Today&apos;s Visits
                </button>
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="visits">Field Visits</TabsTrigger>
          <TabsTrigger value="live">Live Locations</TabsTrigger>
          <TabsTrigger value="territories">Territories</TabsTrigger>
        </TabsList>

        {/* Field Visits Tab */}
        <TabsContent value="visits">
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Today&apos;s Field Visits</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rep</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Account</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Check In</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Check Out</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Address</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Distance</th>
                  </tr>
                </thead>
                <tbody>
                  {FIELD_VISITS.map((visit) => (
                    <tr
                      key={visit.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">{visit.rep}</td>
                      <td className="px-4 py-3 text-muted-foreground">{visit.account}</td>
                      <td className="px-4 py-3 text-muted-foreground">{visit.checkIn}</td>
                      <td className="px-4 py-3 text-muted-foreground">{visit.checkOut}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[220px] truncate">
                        {visit.address}
                      </td>
                      <td className="px-4 py-3">
                        <VisitStatusBadge status={visit.status} />
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">
                        {visit.distance}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Live Locations Tab */}
        <TabsContent value="live">
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Live Rep Locations</h3>
              <Badge variant="outline" className="gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                {LIVE_LOCATIONS.length} active
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rep Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Latitude</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Longitude</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Updated</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Battery</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                      Accuracy (m)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {LIVE_LOCATIONS.map((loc) => (
                    <tr
                      key={loc.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 border-2 border-white shadow-sm"
                            style={{ backgroundColor: loc.color }}
                          />
                          <span className="font-medium text-foreground">{loc.rep}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {loc.latitude.toFixed(4)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {loc.longitude.toFixed(4)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{loc.lastUpdated}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                loc.battery <= 20
                                  ? "bg-red-500"
                                  : loc.battery <= 50
                                  ? "bg-amber-500"
                                  : "bg-green-500"
                              }`}
                              style={{ width: `${loc.battery}%` }}
                            />
                          </div>
                          <BatteryIndicator pct={loc.battery} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        ±{loc.accuracy} m
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Territories Tab */}
        <TabsContent value="territories">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TERRITORIES.map((territory) => (
              <Card key={territory.id} className="overflow-hidden">
                <div className={`h-1.5 w-full ${territory.color}`} />
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{territory.name}</CardTitle>
                    <span
                      className={`w-3 h-3 rounded-full ${territory.color} shrink-0 mt-1`}
                    />
                  </div>
                  <CardDescription className="text-xs font-medium text-foreground/70">
                    Assigned to {territory.rep}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {territory.description}
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">Accounts</span>
                    <span className="text-sm font-semibold text-foreground">
                      {territory.accounts}
                    </span>
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
