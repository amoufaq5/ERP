"use client";

import { useState } from "react";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2, MapPin, Wrench, Zap, Users, ShieldCheck, Plus,
  Eye, Calendar, Clock, CheckCircle2, AlertTriangle, ArrowUp, ArrowDown,
  Thermometer, Leaf, DoorOpen, Package, TrendingUp, BarChart3, Activity,
  Phone, Mail, Star, CircleDot, Gauge, SquareStack, Fan, Droplets,
} from "lucide-react";

// ── Data ───────────────────────────────────────────────────────────────────

const kpis = [
  { label: "Total Facilities", value: "12", icon: Building2, color: "text-blue-600", bg: "bg-blue-100", sub: "3 campuses" },
  { label: "Total Area", value: "485K sqft", icon: MapPin, color: "text-indigo-600", bg: "bg-indigo-100", sub: "Across all sites" },
  { label: "Occupancy Rate", value: "87.3%", icon: Users, color: "text-green-600", bg: "bg-green-100", sub: "+2.4% from last quarter" },
  { label: "Open Work Orders", value: "34", icon: Wrench, color: "text-amber-600", bg: "bg-amber-100", sub: "12 high priority" },
  { label: "Energy Cost", value: "$124K", icon: Zap, color: "text-yellow-600", bg: "bg-yellow-100", sub: "Monthly average" },
  { label: "Maintenance Score", value: "72%", icon: CheckCircle2, color: "text-teal-600", bg: "bg-teal-100", sub: "Preventive ratio" },
  { label: "System Uptime", value: "99.2%", icon: Activity, color: "text-emerald-600", bg: "bg-emerald-100", sub: "Last 30 days" },
  { label: "Sustainability", value: "B+", icon: Leaf, color: "text-green-700", bg: "bg-green-100", sub: "LEED certified" },
];

const buildings = [
  { id: "BLD-001", name: "Corporate HQ", address: "100 Innovation Blvd", type: "Office", area: "125,000 sqft", floors: 8, occupancy: 92, status: "Operational", built: 2018, tenants: 620 },
  { id: "BLD-002", name: "Manufacturing Plant A", address: "200 Industrial Way", type: "Manufacturing", area: "95,000 sqft", floors: 2, occupancy: 88, status: "Operational", built: 2015, tenants: 180 },
  { id: "BLD-003", name: "Warehouse Complex", address: "300 Logistics Dr", type: "Warehouse", area: "78,000 sqft", floors: 1, occupancy: 94, status: "Operational", built: 2020, tenants: 45 },
  { id: "BLD-004", name: "R&D Center", address: "150 Research Park", type: "Laboratory", area: "65,000 sqft", floors: 4, occupancy: 76, status: "Renovation", built: 2012, tenants: 210 },
  { id: "BLD-005", name: "Data Center", address: "500 Server Lane", type: "Data Center", area: "42,000 sqft", floors: 2, occupancy: 81, status: "Operational", built: 2021, tenants: 25 },
  { id: "BLD-006", name: "Employee Wellness Hub", address: "120 Campus Green", type: "Amenity", area: "80,000 sqft", floors: 3, occupancy: 68, status: "Operational", built: 2022, tenants: 15 },
];

const spaces = [
  { id: "SPC-001", name: "Executive Suite 8A", building: "Corporate HQ", floor: 8, type: "Office", area: "3,200 sqft", capacity: 24, current: 22, status: "Occupied" },
  { id: "SPC-002", name: "Open Plan 3B", building: "Corporate HQ", floor: 3, type: "Open Office", area: "8,500 sqft", capacity: 120, current: 108, status: "Occupied" },
  { id: "SPC-003", name: "Conference Hall Alpha", building: "Corporate HQ", floor: 1, type: "Meeting Room", area: "2,400 sqft", capacity: 80, current: 0, status: "Available" },
  { id: "SPC-004", name: "Lab Wing East", building: "R&D Center", floor: 2, type: "Laboratory", area: "6,800 sqft", capacity: 40, current: 32, status: "Occupied" },
  { id: "SPC-005", name: "Server Room A", building: "Data Center", floor: 1, type: "Server Room", area: "12,000 sqft", capacity: 0, current: 0, status: "Restricted" },
  { id: "SPC-006", name: "Cafeteria", building: "Employee Wellness Hub", floor: 1, type: "Amenity", area: "5,600 sqft", capacity: 350, current: 0, status: "Available" },
  { id: "SPC-007", name: "Assembly Line 1", building: "Manufacturing Plant A", floor: 1, type: "Production", area: "18,000 sqft", capacity: 60, current: 54, status: "Occupied" },
  { id: "SPC-008", name: "Loading Bay North", building: "Warehouse Complex", floor: 1, type: "Logistics", area: "4,200 sqft", capacity: 8, current: 5, status: "Occupied" },
  { id: "SPC-009", name: "Training Room 2C", building: "Corporate HQ", floor: 2, type: "Training", area: "1,800 sqft", capacity: 40, current: 0, status: "Available" },
  { id: "SPC-010", name: "Gym & Fitness Center", building: "Employee Wellness Hub", floor: 2, type: "Amenity", area: "4,500 sqft", capacity: 60, current: 18, status: "Occupied" },
  { id: "SPC-011", name: "Quiet Focus Pods", building: "Corporate HQ", floor: 5, type: "Focus Area", area: "900 sqft", capacity: 12, current: 9, status: "Occupied" },
  { id: "SPC-012", name: "Shipping Staging", building: "Warehouse Complex", floor: 1, type: "Logistics", area: "6,200 sqft", capacity: 20, current: 14, status: "Occupied" },
];

const workOrders = [
  { id: "WO-1001", title: "HVAC compressor replacement - Floor 6", building: "Corporate HQ", priority: "High", category: "HVAC", assignee: "Tom Reeves", created: "Apr 1, 2026", due: "Apr 5, 2026", status: "In Progress" },
  { id: "WO-1002", title: "Parking garage lighting upgrade", building: "Corporate HQ", priority: "Medium", category: "Electrical", assignee: "Lisa Cheng", created: "Mar 30, 2026", due: "Apr 10, 2026", status: "Scheduled" },
  { id: "WO-1003", title: "Roof leak repair - Section B", building: "Warehouse Complex", priority: "High", category: "Structural", assignee: "Carlos Diaz", created: "Mar 29, 2026", due: "Apr 3, 2026", status: "In Progress" },
  { id: "WO-1004", title: "Fire suppression system inspection", building: "Data Center", priority: "Critical", category: "Fire Safety", assignee: "Tom Reeves", created: "Mar 28, 2026", due: "Apr 2, 2026", status: "Overdue" },
  { id: "WO-1005", title: "Elevator annual maintenance", building: "Corporate HQ", priority: "Medium", category: "Mechanical", assignee: "Vendor - Otis", created: "Mar 25, 2026", due: "Apr 8, 2026", status: "Scheduled" },
  { id: "WO-1006", title: "Lab fume hood calibration", building: "R&D Center", priority: "High", category: "Safety", assignee: "Lisa Cheng", created: "Mar 24, 2026", due: "Apr 1, 2026", status: "Completed" },
  { id: "WO-1007", title: "Restroom plumbing - 4th floor", building: "Corporate HQ", priority: "Medium", category: "Plumbing", assignee: "Carlos Diaz", created: "Mar 22, 2026", due: "Mar 28, 2026", status: "Completed" },
  { id: "WO-1008", title: "UPS battery bank replacement", building: "Data Center", priority: "Critical", category: "Electrical", assignee: "Tom Reeves", created: "Mar 20, 2026", due: "Apr 4, 2026", status: "In Progress" },
  { id: "WO-1009", title: "Landscape irrigation repair", building: "Employee Wellness Hub", priority: "Low", category: "Grounds", assignee: "Vendor - GreenScape", created: "Mar 18, 2026", due: "Apr 12, 2026", status: "Scheduled" },
  { id: "WO-1010", title: "Assembly line conveyor belt tension", building: "Manufacturing Plant A", priority: "High", category: "Mechanical", assignee: "Carlos Diaz", created: "Mar 15, 2026", due: "Mar 22, 2026", status: "Completed" },
];

const facilityAssets = [
  { id: "FA-001", name: "Trane XR15 Chiller Unit", category: "HVAC", building: "Corporate HQ", location: "Roof - Mechanical Room", installed: "Jun 2018", lastService: "Feb 2026", condition: "Good", value: "$185,000" },
  { id: "FA-002", name: "Caterpillar 500kW Generator", category: "Power", building: "Data Center", location: "Ground - Generator Pad", installed: "Mar 2021", lastService: "Jan 2026", condition: "Excellent", value: "$320,000" },
  { id: "FA-003", name: "Otis Gen2 Elevator (x3)", category: "Vertical Transport", building: "Corporate HQ", location: "Core - Shaft A/B/C", installed: "Jun 2018", lastService: "Mar 2026", condition: "Good", value: "$450,000" },
  { id: "FA-004", name: "Honeywell BMS Controller", category: "Controls", building: "All Buildings", location: "Central Plant", installed: "Sep 2020", lastService: "Mar 2026", condition: "Good", value: "$95,000" },
  { id: "FA-005", name: "Siemens Fire Alarm Panel", category: "Fire Safety", building: "Corporate HQ", location: "Lobby - Security Desk", installed: "Jun 2018", lastService: "Dec 2025", condition: "Fair", value: "$42,000" },
  { id: "FA-006", name: "Schneider UPS 200kVA", category: "Power", building: "Data Center", location: "UPS Room B", installed: "Mar 2021", lastService: "Mar 2026", condition: "Good", value: "$78,000" },
  { id: "FA-007", name: "Carrier AHU 40-Ton (x4)", category: "HVAC", building: "R&D Center", location: "Mechanical Floors 1 & 3", installed: "Aug 2012", lastService: "Nov 2025", condition: "Fair", value: "$220,000" },
  { id: "FA-008", name: "Grundfos Pumping Station", category: "Plumbing", building: "Warehouse Complex", location: "Basement - Pump Room", installed: "Jan 2020", lastService: "Oct 2025", condition: "Good", value: "$56,000" },
  { id: "FA-009", name: "Daikin VRV IV Heat Pump", category: "HVAC", building: "Employee Wellness Hub", location: "Roof Level", installed: "Apr 2022", lastService: "Feb 2026", condition: "Excellent", value: "$165,000" },
  { id: "FA-010", name: "Cummins Transfer Switch", category: "Power", building: "Manufacturing Plant A", location: "Electrical Room", installed: "May 2015", lastService: "Jan 2026", condition: "Good", value: "$38,000" },
];

const energyData = [
  { building: "Corporate HQ", electricity: "$42,300", gas: "$8,100", water: "$3,200", total: "$53,600", change: -4.2, rating: "B+" },
  { building: "Manufacturing Plant A", electricity: "$28,700", gas: "$12,400", water: "$4,800", total: "$45,900", change: +1.8, rating: "B" },
  { building: "Warehouse Complex", electricity: "$9,200", gas: "$2,100", water: "$1,400", total: "$12,700", change: -6.1, rating: "A-" },
  { building: "R&D Center", electricity: "$15,800", gas: "$3,600", water: "$2,100", total: "$21,500", change: +3.2, rating: "B-" },
  { building: "Data Center", electricity: "$31,400", gas: "$800", water: "$1,900", total: "$34,100", change: -1.5, rating: "C+" },
  { building: "Employee Wellness Hub", electricity: "$8,100", gas: "$2,800", water: "$2,300", total: "$13,200", change: -8.3, rating: "A" },
];

const visitors = [
  { id: "VIS-001", name: "Michael Foster", company: "Acme Consulting", host: "Jennifer Walsh", purpose: "Client Meeting", checkIn: "Apr 3, 9:00 AM", checkOut: "Apr 3, 11:30 AM", building: "Corporate HQ", status: "Checked Out" },
  { id: "VIS-002", name: "Sarah Blackwell", company: "TechVentures Inc", host: "David Kim", purpose: "Partnership Discussion", checkIn: "Apr 3, 10:15 AM", checkOut: "-", building: "Corporate HQ", status: "On Site" },
  { id: "VIS-003", name: "Robert Chang", company: "Apex Robotics", host: "Dr. Amara Osei", purpose: "Lab Tour", checkIn: "Apr 3, 1:00 PM", checkOut: "-", building: "R&D Center", status: "Expected" },
  { id: "VIS-004", name: "Emily Rodriguez", company: "GreenScape LLC", host: "Tom Reeves", purpose: "Vendor Service", checkIn: "Apr 2, 8:00 AM", checkOut: "Apr 2, 4:30 PM", building: "Employee Wellness Hub", status: "Checked Out" },
  { id: "VIS-005", name: "James Whitmore", company: "City Fire Marshal", host: "Lisa Cheng", purpose: "Fire Inspection", checkIn: "Apr 1, 10:00 AM", checkOut: "Apr 1, 2:00 PM", building: "Data Center", status: "Checked Out" },
  { id: "VIS-006", name: "Karen Yip", company: "Deloitte", host: "CFO Office", purpose: "Audit", checkIn: "Apr 3, 9:30 AM", checkOut: "-", building: "Corporate HQ", status: "On Site" },
  { id: "VIS-007", name: "Ahmed Hassan", company: "Otis Elevator Co", host: "Carlos Diaz", purpose: "Equipment Maintenance", checkIn: "Apr 3, 7:30 AM", checkOut: "-", building: "Corporate HQ", status: "On Site" },
  { id: "VIS-008", name: "Priya Nair", company: "Schneider Electric", host: "Tom Reeves", purpose: "UPS Commissioning", checkIn: "Apr 4, 8:00 AM", checkOut: "-", building: "Data Center", status: "Expected" },
];

const vendors = [
  { id: "VND-001", name: "CleanPro Services", service: "Janitorial", contract: "Annual", value: "$186,000/yr", rating: 4.5, contact: "Maria Santos", phone: "(555) 100-2001", status: "Active" },
  { id: "VND-002", name: "Otis Elevator Co", service: "Elevator Maintenance", contract: "3-Year", value: "$72,000/yr", rating: 4.8, contact: "Ahmed Hassan", phone: "(555) 100-2002", status: "Active" },
  { id: "VND-003", name: "GreenScape LLC", service: "Landscaping & Grounds", contract: "Annual", value: "$48,000/yr", rating: 4.2, contact: "Derek Lawson", phone: "(555) 100-2003", status: "Active" },
  { id: "VND-004", name: "SecurePoint Systems", service: "Security & Access Control", contract: "2-Year", value: "$210,000/yr", rating: 4.6, contact: "Nina Petrov", phone: "(555) 100-2004", status: "Active" },
  { id: "VND-005", name: "Comfort Air HVAC", service: "HVAC Maintenance", contract: "Annual", value: "$134,000/yr", rating: 3.9, contact: "Frank Miller", phone: "(555) 100-2005", status: "Under Review" },
  { id: "VND-006", name: "PestGuard Inc", service: "Pest Control", contract: "Annual", value: "$18,000/yr", rating: 4.3, contact: "Leo Tran", phone: "(555) 100-2006", status: "Active" },
  { id: "VND-007", name: "Schneider Electric", service: "Electrical & UPS", contract: "3-Year", value: "$96,000/yr", rating: 4.7, contact: "Priya Nair", phone: "(555) 100-2007", status: "Active" },
  { id: "VND-008", name: "WasteStream Solutions", service: "Waste Management & Recycling", contract: "Annual", value: "$62,000/yr", rating: 4.1, contact: "Brian Owens", phone: "(555) 100-2008", status: "Active" },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function priorityBadge(priority: string) {
  switch (priority) {
    case "Critical": return <Badge variant="destructive">{priority}</Badge>;
    case "High": return <Badge variant="destructive">{priority}</Badge>;
    case "Medium": return <Badge variant="default">{priority}</Badge>;
    case "Low": return <Badge variant="secondary">{priority}</Badge>;
    default: return <Badge variant="outline">{priority}</Badge>;
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "Operational": case "Active": case "Completed": case "Checked Out": case "Good": case "Excellent":
      return <Badge variant="default">{status}</Badge>;
    case "In Progress": case "On Site": case "Occupied": case "Fair":
      return <Badge variant="secondary">{status}</Badge>;
    case "Overdue": case "Renovation": case "Under Review":
      return <Badge variant="destructive">{status}</Badge>;
    case "Scheduled": case "Expected": case "Available": case "Restricted":
      return <Badge variant="outline">{status}</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

function conditionBadge(condition: string) {
  switch (condition) {
    case "Excellent": return <Badge variant="default">{condition}</Badge>;
    case "Good": return <Badge variant="secondary">{condition}</Badge>;
    case "Fair": return <Badge variant="destructive">{condition}</Badge>;
    default: return <Badge variant="outline">{condition}</Badge>;
  }
}

// ── Component ───────────────────────────────────────────────────────────────

const workOrderFields: EntityField[] = [
  { name: "title", label: "Title", type: "text", required: true, fullWidth: true },
  { name: "category", label: "Category", type: "select", defaultValue: "Corrective", options: [
    { label: "HVAC", value: "HVAC" }, { label: "Electrical", value: "Electrical" },
    { label: "Plumbing", value: "Plumbing" }, { label: "Structural", value: "Structural" },
    { label: "Fire Safety", value: "Fire Safety" }, { label: "Mechanical", value: "Mechanical" },
    { label: "Safety", value: "Safety" }, { label: "Grounds", value: "Grounds" },
  ]},
  { name: "priority", label: "Priority", type: "select", defaultValue: "Medium", options: [
    { label: "Critical", value: "Critical" }, { label: "High", value: "High" },
    { label: "Medium", value: "Medium" }, { label: "Low", value: "Low" },
  ]},
  { name: "building", label: "Building", type: "text", required: true },
  { name: "assignee", label: "Assigned To", type: "text", required: true },
  { name: "due", label: "Due Date", type: "date", required: true },
];

export default function FacilityPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingWo, setEditingWo] = useState<typeof workOrders[0] | null>(null);
  const [wos, setWos] = useState(workOrders);
  const [woFilters, setWoFilters] = useState<FilterState>({});

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facility Management</h1>
          <p className="text-muted-foreground">Manage buildings, spaces, maintenance, assets, energy, visitors, and vendors</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => { setEditingWo(null); setShowForm(true); }}><Plus className="mr-2 h-4 w-4" />New Work Order</Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="buildings">Buildings</TabsTrigger>
          <TabsTrigger value="spaces">Space Management</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="energy">Energy</TabsTrigger>
          <TabsTrigger value="visitors">Visitors</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
        </TabsList>

        {/* ── Dashboard ─────────────────────────────────────────────── */}
        <TabsContent value="dashboard">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <Card key={k.label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{k.label}</CardTitle>
                  <div className={`rounded-md p-2 ${k.bg}`}>
                    <k.icon className={`h-4 w-4 ${k.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{k.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Buildings ─────────────────────────────────────────────── */}
        <TabsContent value="buildings">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {buildings.map((b) => (
              <Card key={b.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{b.name}</CardTitle>
                    {statusBadge(b.status)}
                  </div>
                  <CardDescription className="flex items-center gap-1"><MapPin className="h-3 w-3" />{b.address}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Type:</span> {b.type}</div>
                    <div><span className="text-muted-foreground">Area:</span> {b.area}</div>
                    <div><span className="text-muted-foreground">Floors:</span> {b.floors}</div>
                    <div><span className="text-muted-foreground">Built:</span> {b.built}</div>
                    <div><span className="text-muted-foreground">Occupants:</span> {b.tenants}</div>
                    <div>
                      <span className="text-muted-foreground">Occupancy:</span>{" "}
                      <span className={b.occupancy >= 90 ? "text-green-600 font-medium" : b.occupancy >= 75 ? "text-amber-600 font-medium" : "text-red-600 font-medium"}>
                        {b.occupancy}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm"><Eye className="mr-1 h-3 w-3" />Details</Button>
                    <Button variant="outline" size="sm"><Wrench className="mr-1 h-3 w-3" />Maintenance</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Space Management ──────────────────────────────────────── */}
        <TabsContent value="spaces">
          <Card>
            <CardHeader>
              <CardTitle>Space Allocation</CardTitle>
              <CardDescription>Overview of all managed spaces across facilities</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "id", label: "ID", render: (v) => <span className="font-mono text-xs">{v}</span> },
                  { key: "name", label: "Space Name", render: (v) => <span className="font-medium">{v}</span> },
                  { key: "building", label: "Building" },
                  { key: "floor", label: "Floor" },
                  { key: "type", label: "Type" },
                  { key: "area", label: "Area" },
                  { key: "capacity", label: "Capacity" },
                  { key: "current", label: "Current" },
                  { key: "status", label: "Status", render: (v) => statusBadge(v) },
                ] as Column<Record<string, unknown>>[]}
                data={spaces as unknown as Record<string, unknown>[]}
                emptyMessage="No spaces found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Maintenance ───────────────────────────────────────────── */}
        <TabsContent value="maintenance" className="space-y-4">
          <FilterBar
            searchPlaceholder="Search work orders..."
            searchValue={woFilters._search ?? ""}
            onSearchChange={(v) => setWoFilters(prev => ({ ...prev, _search: v }))}
            fields={[
              { key: "priority", label: "Priority", type: "select", options: [
                { label: "Critical", value: "Critical" }, { label: "High", value: "High" },
                { label: "Medium", value: "Medium" }, { label: "Low", value: "Low" },
              ]},
              { key: "status", label: "Status", type: "select", options: [
                { label: "Scheduled", value: "Scheduled" }, { label: "In Progress", value: "In Progress" },
                { label: "Completed", value: "Completed" }, { label: "Overdue", value: "Overdue" },
              ]},
            ]}
            values={woFilters}
            onChange={(k, v) => setWoFilters(f => ({ ...f, [k]: v }))}
            rightSlot={<Button size="sm" onClick={() => { setEditingWo(null); setShowForm(true); }}><Plus className="mr-2 h-4 w-4" />Create Work Order</Button>}
          />
          <Card>
            <CardHeader>
              <CardTitle>Work Orders</CardTitle>
              <CardDescription>Track and manage facility maintenance requests</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "id", label: "ID", render: (v) => <span className="font-mono text-xs">{v}</span> },
                  { key: "title", label: "Title", render: (v) => <span className="font-medium max-w-[260px] truncate block">{v}</span> },
                  { key: "building", label: "Building" },
                  { key: "priority", label: "Priority", render: (v) => priorityBadge(v) },
                  { key: "category", label: "Category" },
                  { key: "assignee", label: "Assignee" },
                  { key: "due", label: "Due Date" },
                  { key: "status", label: "Status", render: (v) => statusBadge(v) },
                  { key: "actions", label: "Actions", render: (_v, row) => {
                    const wo = row as unknown as typeof wos[0];
                    const flow: Record<string, string> = { "Scheduled": "In Progress", "In Progress": "Completed", "Overdue": "In Progress" };
                    const next = flow[wo.status];
                    return (
                      <EditDeleteMenu
                        onEdit={() => { setEditingWo(wo); setShowForm(true); }}
                        onDelete={() => setWos(prev => prev.filter(w => w.id !== wo.id))}
                        itemLabel={wo.id}
                        extraItems={next ? [{ label: `→ ${next}`, onClick: () => setWos(prev => prev.map(w => w.id === wo.id ? { ...w, status: next } : w)) }] : []}
                      />
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={(wos
                  .filter(wo => !woFilters._search || wo.title.toLowerCase().includes(woFilters._search.toLowerCase()) || wo.id.toLowerCase().includes(woFilters._search.toLowerCase()))
                  .filter(wo => !woFilters.priority || wo.priority === woFilters.priority)
                  .filter(wo => !woFilters.status || wo.status === woFilters.status)
                ) as unknown as Record<string, unknown>[]}
                emptyMessage="No work orders found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Assets ────────────────────────────────────────────────── */}
        <TabsContent value="assets">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Facility Assets</CardTitle>
                  <CardDescription>Critical equipment and infrastructure assets</CardDescription>
                </div>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" />Register Asset</Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "id", label: "ID", render: (v) => <span className="font-mono text-xs">{v}</span> },
                  { key: "name", label: "Asset Name", render: (v) => <span className="font-medium max-w-[220px] truncate block">{v}</span> },
                  { key: "category", label: "Category" },
                  { key: "building", label: "Building" },
                  { key: "installed", label: "Installed" },
                  { key: "lastService", label: "Last Service" },
                  { key: "condition", label: "Condition", render: (v) => conditionBadge(v) },
                  { key: "value", label: "Value", render: (v) => <span className="font-medium">{v}</span> },
                ] as Column<Record<string, unknown>>[]}
                data={facilityAssets as unknown as Record<string, unknown>[]}
                emptyMessage="No assets found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Energy ────────────────────────────────────────────────── */}
        <TabsContent value="energy">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {energyData.map((e) => (
              <Card key={e.building}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{e.building}</CardTitle>
                    <Badge variant={e.rating.startsWith("A") ? "default" : e.rating.startsWith("B") ? "secondary" : "outline"}>{e.rating}</Badge>
                  </div>
                  <CardDescription>Monthly utility consumption</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground"><Zap className="h-3 w-3" />Electricity</span>
                      <span className="font-medium">{e.electricity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground"><Thermometer className="h-3 w-3" />Natural Gas</span>
                      <span className="font-medium">{e.gas}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground"><Droplets className="h-3 w-3" />Water</span>
                      <span className="font-medium">{e.water}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-medium">
                      <span>Total</span>
                      <span>{e.total}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1 text-xs">
                      {e.change < 0 ? (
                        <span className="flex items-center text-green-600"><ArrowDown className="h-3 w-3" />{Math.abs(e.change)}% vs last month</span>
                      ) : (
                        <span className="flex items-center text-red-600"><ArrowUp className="h-3 w-3" />+{e.change}% vs last month</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Visitors ──────────────────────────────────────────────── */}
        <TabsContent value="visitors">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Visitor Log</CardTitle>
                  <CardDescription>Track visitor check-ins and check-outs across all facilities</CardDescription>
                </div>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" />Register Visitor</Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "id", label: "ID", render: (v) => <span className="font-mono text-xs">{v}</span> },
                  { key: "name", label: "Visitor", render: (v) => <span className="font-medium">{v}</span> },
                  { key: "company", label: "Company" },
                  { key: "host", label: "Host" },
                  { key: "purpose", label: "Purpose" },
                  { key: "checkIn", label: "Check In" },
                  { key: "checkOut", label: "Check Out" },
                  { key: "status", label: "Status", render: (v) => statusBadge(v) },
                ] as Column<Record<string, unknown>>[]}
                data={visitors as unknown as Record<string, unknown>[]}
                emptyMessage="No visitors found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Vendors ───────────────────────────────────────────────── */}
        <TabsContent value="vendors">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Facility Vendors</CardTitle>
                  <CardDescription>Contracted service providers and supplier management</CardDescription>
                </div>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Vendor</Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "id", label: "ID", render: (v) => <span className="font-mono text-xs">{v}</span> },
                  { key: "name", label: "Vendor Name", render: (v) => <span className="font-medium">{v}</span> },
                  { key: "service", label: "Service" },
                  { key: "contract", label: "Contract" },
                  { key: "value", label: "Value" },
                  { key: "rating", label: "Rating", render: (v) => (
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {v}
                    </span>
                  )},
                  { key: "contact", label: "Contact", render: (_v, row) => {
                    const vendor = row as unknown as typeof vendors[0];
                    return (
                      <div>
                        <div>{vendor.contact}</div>
                        <div className="text-xs text-muted-foreground">{vendor.phone}</div>
                      </div>
                    );
                  }},
                  { key: "status", label: "Status", render: (v) => statusBadge(v) },
                ] as Column<Record<string, unknown>>[]}
                data={vendors as unknown as Record<string, unknown>[]}
                emptyMessage="No vendors found."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EntityFormModal
        open={showForm}
        onOpenChange={(v) => { setShowForm(v); if (!v) setEditingWo(null); }}
        title={editingWo ? `Edit ${editingWo.id}` : "New Work Order"}
        fields={workOrderFields}
        initialData={editingWo ? {
          title: editingWo.title,
          category: editingWo.category,
          priority: editingWo.priority,
          building: editingWo.building,
          assignee: editingWo.assignee,
          due: editingWo.due,
        } : undefined}
        submitLabel={editingWo ? "Update" : "Create"}
        onSubmit={(data) => {
          if (editingWo) {
            setWos(prev => prev.map(w => w.id === editingWo.id ? {
              ...w,
              title: String(data.title),
              category: String(data.category) || w.category,
              priority: String(data.priority) || w.priority,
              building: String(data.building),
              assignee: String(data.assignee),
              due: String(data.due),
            } : w));
          } else {
            const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            setWos(prev => [{
              id: `WO-${Date.now().toString(36)}`,
              title: String(data.title),
              building: String(data.building),
              priority: String(data.priority) || "Medium",
              category: String(data.category) || "HVAC",
              assignee: String(data.assignee),
              created: today,
              due: String(data.due),
              status: "Scheduled",
            }, ...prev]);
          }
        }}
      />
    </div>
  );
}
