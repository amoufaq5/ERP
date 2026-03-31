"use client";

import { useState } from "react";
import {
  MapPin,
  Navigation,
  Route,
  Map,
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
}

interface LiveLocation {
  id: string;
  rep: string;
  latitude: number;
  longitude: number;
  lastUpdated: string;
  battery: number;
  accuracy: number;
}

interface Territory {
  id: string;
  name: string;
  rep: string;
  description: string;
  color: string;
  accounts: number;
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const FIELD_VISITS: FieldVisit[] = [
  {
    id: "FV-001",
    rep: "Marcus Williams",
    account: "TechCorp Solutions",
    checkIn: "09:15 AM",
    checkOut: "10:40 AM",
    address: "580 Market St, San Francisco, CA 94104",
    status: "COMPLETED",
    distance: "3.2 km",
  },
  {
    id: "FV-002",
    rep: "Sarah Johnson",
    account: "Global Retail Inc.",
    checkIn: "10:00 AM",
    checkOut: "11:30 AM",
    address: "350 5th Ave, New York, NY 10118",
    status: "COMPLETED",
    distance: "8.7 km",
  },
  {
    id: "FV-003",
    rep: "Emma Davis",
    account: "HealthPlus Systems",
    checkIn: "11:45 AM",
    checkOut: "—",
    address: "200 State St, Boston, MA 02109",
    status: "IN_PROGRESS",
    distance: "5.1 km",
  },
  {
    id: "FV-004",
    rep: "Marcus Williams",
    account: "Quantum Data AI",
    checkIn: "01:00 PM",
    checkOut: "—",
    address: "3000 El Camino Real, Palo Alto, CA 94306",
    status: "PLANNED",
    distance: "12.4 km",
  },
  {
    id: "FV-005",
    rep: "Sarah Johnson",
    account: "LogisticsPro",
    checkIn: "02:30 PM",
    checkOut: "—",
    address: "1415 Louisiana St, Houston, TX 77002",
    status: "PLANNED",
    distance: "19.8 km",
  },
  {
    id: "FV-006",
    rep: "Daniel Park",
    account: "Manufactura Group",
    checkIn: "09:30 AM",
    checkOut: "11:00 AM",
    address: "3011 W Grand Blvd, Detroit, MI 48202",
    status: "COMPLETED",
    distance: "7.6 km",
  },
];

const LIVE_LOCATIONS: LiveLocation[] = [
  {
    id: "LL-001",
    rep: "Marcus Williams",
    latitude: 37.4419,
    longitude: -122.143,
    lastUpdated: "2 min ago",
    battery: 78,
    accuracy: 8,
  },
  {
    id: "LL-002",
    rep: "Sarah Johnson",
    latitude: 29.7604,
    longitude: -95.3698,
    lastUpdated: "5 min ago",
    battery: 53,
    accuracy: 12,
  },
  {
    id: "LL-003",
    rep: "Emma Davis",
    latitude: 42.3601,
    longitude: -71.0589,
    lastUpdated: "1 min ago",
    battery: 91,
    accuracy: 5,
  },
  {
    id: "LL-004",
    rep: "Daniel Park",
    latitude: 42.3314,
    longitude: -83.0458,
    lastUpdated: "8 min ago",
    battery: 34,
    accuracy: 15,
  },
];

const TERRITORIES: Territory[] = [
  {
    id: "T-001",
    name: "West Coast",
    rep: "Marcus Williams",
    description:
      "Covers California, Oregon, and Washington state accounts including Bay Area tech cluster.",
    color: "bg-blue-500",
    accounts: 24,
  },
  {
    id: "T-002",
    name: "Northeast",
    rep: "Sarah Johnson",
    description:
      "New York, New Jersey, Massachusetts, and Connecticut enterprise accounts.",
    color: "bg-purple-500",
    accounts: 31,
  },
  {
    id: "T-003",
    name: "Midwest & South",
    rep: "Emma Davis",
    description:
      "Texas, Michigan, Illinois, and Ohio manufacturing and logistics customers.",
    color: "bg-emerald-500",
    accounts: 19,
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

// ─── Battery indicator ────────────────────────────────────────────────────────

function BatteryIndicator({ pct }: { pct: number }) {
  const color =
    pct <= 20 ? "text-red-500" : pct <= 50 ? "text-amber-500" : "text-green-600";
  return (
    <span className={`font-medium text-sm ${color}`}>{pct}%</span>
  );
}

// ─── Simulated location dots on the map placeholder ──────────────────────────

const MAP_DOTS = [
  { top: "35%", left: "12%", label: "Marcus", color: "bg-blue-500" },
  { top: "28%", left: "78%", label: "Sarah", color: "bg-purple-500" },
  { top: "42%", left: "85%", label: "Emma", color: "bg-emerald-500" },
  { top: "40%", left: "68%", label: "Daniel", color: "bg-orange-500" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GpsTrackingPage() {
  const [activeTab, setActiveTab] = useState("visits");

  const completedVisits = FIELD_VISITS.filter(
    (v) => v.status === "COMPLETED"
  ).length;
  const inProgress = FIELD_VISITS.filter(
    (v) => v.status === "IN_PROGRESS"
  ).length;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="GPS / Field Tracking"
        description="Monitor field rep locations, visits, and territory coverage in real time"
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
          value={6}
          subtitle="Currently in the field"
          icon={Users}
          change={20}
          changeLabel="vs last week"
        />
        <StatsCard
          title="Visits Today"
          value={12}
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
          value={3}
          subtitle="Active coverage zones"
          icon={Map}
        />
      </div>

      {/* Map Placeholder */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Live Map View</CardTitle>
              <CardDescription>
                Configure map provider in Settings &gt; Integrations
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
              Live
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4 pb-0 px-0">
          <div className="relative h-72 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 flex flex-col items-center justify-center select-none overflow-hidden">
            {/* Grid lines */}
            <svg
              className="absolute inset-0 w-full h-full opacity-20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern
                  id="grid"
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Centre placeholder text */}
            <Navigation className="w-10 h-10 text-blue-400 mb-3" />
            <p className="text-blue-700 dark:text-blue-300 font-semibold text-lg">
              Interactive Map View
            </p>
            <p className="text-blue-500 dark:text-blue-400 text-sm mt-1">
              Configure map provider in Settings &gt; Integrations
            </p>

            {/* Simulated rep dots */}
            {MAP_DOTS.map((dot) => (
              <div
                key={dot.label}
                className="absolute flex flex-col items-center gap-0.5"
                style={{ top: dot.top, left: dot.left }}
              >
                <div
                  className={`w-4 h-4 rounded-full ${dot.color} border-2 border-white shadow-md`}
                />
                <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-200 bg-white/80 dark:bg-black/40 px-1 rounded">
                  {dot.label}
                </span>
              </div>
            ))}
          </div>
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
              <h3 className="text-sm font-semibold text-foreground">
                Today&apos;s Field Visits
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Rep
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Account
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Check In
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Check Out
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Address
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                      Distance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {FIELD_VISITS.map((visit) => (
                    <tr
                      key={visit.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {visit.rep}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {visit.account}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {visit.checkIn}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {visit.checkOut}
                      </td>
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
              <h3 className="text-sm font-semibold text-foreground">
                Live Rep Locations
              </h3>
              <Badge variant="outline" className="gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                {LIVE_LOCATIONS.length} active
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Rep Name
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Latitude
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Longitude
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Last Updated
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Battery
                    </th>
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
                          <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                          <span className="font-medium text-foreground">
                            {loc.rep}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {loc.latitude.toFixed(4)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {loc.longitude.toFixed(4)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {loc.lastUpdated}
                      </td>
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
                    <span className="text-xs text-muted-foreground">
                      Accounts
                    </span>
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
