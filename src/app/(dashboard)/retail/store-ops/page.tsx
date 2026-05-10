"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Store,
  Users,
  Footprints,
  TrendingUp,
  Search,
  Plus,
  ClipboardList,
  Calendar,
  FileText,
} from "lucide-react";

// ─── Mock Data ─────────────────────────────────────────────────────────────

const stats = [
  { label: "Stores Open", value: "12", icon: Store, color: "text-green-600", bg: "bg-green-100" },
  { label: "Staff On Duty", value: "84", icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
  { label: "Customer Traffic Today", value: "3,241", icon: Footprints, color: "text-purple-600", bg: "bg-purple-100" },
  { label: "Conversion Rate %", value: "28.4%", icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-100" },
];

const stores = [
  { store: "Downtown Flagship", region: "Northeast", status: "Open", revenue: "$8,420", vsTarget: 112, footfall: 542, conversion: 31.2 },
  { store: "Mall Location", region: "Northeast", status: "Open", revenue: "$6,890", vsTarget: 98, footfall: 480, conversion: 29.8 },
  { store: "Airport Kiosk", region: "Northeast", status: "Open", revenue: "$3,210", vsTarget: 105, footfall: 320, conversion: 22.5 },
  { store: "Suburban Store", region: "Midwest", status: "Open", revenue: "$5,640", vsTarget: 94, footfall: 385, conversion: 27.3 },
  { store: "Outlet Center", region: "Southeast", status: "Open", revenue: "$4,120", vsTarget: 88, footfall: 410, conversion: 32.1 },
  { store: "Beach Plaza", region: "Southeast", status: "Open", revenue: "$2,980", vsTarget: 76, footfall: 290, conversion: 25.8 },
  { store: "University District", region: "West", status: "Open", revenue: "$3,750", vsTarget: 102, footfall: 415, conversion: 30.5 },
  { store: "Tech Park", region: "West", status: "Open", revenue: "$4,890", vsTarget: 108, footfall: 295, conversion: 34.2 },
  { store: "Harbor View", region: "West", status: "Closed", revenue: "$0", vsTarget: 0, footfall: 0, conversion: 0 },
];

const staffing = [
  { store: "Downtown Flagship", shift: "Morning", required: 8, scheduled: 8, actual: 8, gaps: 0 },
  { store: "Downtown Flagship", shift: "Afternoon", required: 10, scheduled: 10, actual: 9, gaps: 1 },
  { store: "Downtown Flagship", shift: "Evening", required: 6, scheduled: 6, actual: 6, gaps: 0 },
  { store: "Mall Location", shift: "Morning", required: 6, scheduled: 6, actual: 5, gaps: 1 },
  { store: "Mall Location", shift: "Afternoon", required: 8, scheduled: 7, actual: 7, gaps: 1 },
  { store: "Mall Location", shift: "Evening", required: 5, scheduled: 5, actual: 5, gaps: 0 },
  { store: "Suburban Store", shift: "Morning", required: 5, scheduled: 5, actual: 5, gaps: 0 },
  { store: "Suburban Store", shift: "Afternoon", required: 6, scheduled: 6, actual: 6, gaps: 0 },
  { store: "Outlet Center", shift: "Morning", required: 4, scheduled: 4, actual: 3, gaps: 1 },
  { store: "Outlet Center", shift: "Afternoon", required: 6, scheduled: 5, actual: 5, gaps: 1 },
];

const tasks = [
  { task: "Window Display Update - Summer", store: "Downtown Flagship", assignedTo: "Visual Team", priority: "High", dueDate: "May 12, 2026", status: "In Progress" },
  { task: "Inventory Count - Section A", store: "Mall Location", assignedTo: "Stock Team", priority: "Medium", dueDate: "May 11, 2026", status: "Open" },
  { task: "Staff Training - New POS", store: "All Stores", assignedTo: "IT Department", priority: "High", dueDate: "May 15, 2026", status: "Open" },
  { task: "Deep Clean - Fitting Rooms", store: "Outlet Center", assignedTo: "Maintenance", priority: "Low", dueDate: "May 10, 2026", status: "Done" },
  { task: "Signage Replacement", store: "Beach Plaza", assignedTo: "Visual Team", priority: "Medium", dueDate: "May 13, 2026", status: "Open" },
  { task: "Fire Safety Drill", store: "Downtown Flagship", assignedTo: "Store Manager", priority: "High", dueDate: "May 14, 2026", status: "Open" },
  { task: "Restock Supplies - Bags/Tissue", store: "Suburban Store", assignedTo: "Operations", priority: "Low", dueDate: "May 10, 2026", status: "Done" },
  { task: "Competitor Price Check", store: "Mall Location", assignedTo: "Merchandising", priority: "Medium", dueDate: "May 11, 2026", status: "In Progress" },
];

const compliance = [
  { item: "Fire Extinguisher Inspection", store: "All Stores", dueDate: "May 30, 2026", status: "Compliant", lastChecked: "Apr 30, 2026" },
  { item: "Health & Safety Audit", store: "Downtown Flagship", dueDate: "May 20, 2026", status: "Due Soon", lastChecked: "Feb 20, 2026" },
  { item: "ADA Compliance Review", store: "Beach Plaza", dueDate: "Jun 15, 2026", status: "Compliant", lastChecked: "Mar 15, 2026" },
  { item: "PCI DSS Certification", store: "All Stores", dueDate: "Jul 1, 2026", status: "Compliant", lastChecked: "Jan 1, 2026" },
  { item: "Electrical Safety Check", store: "Outlet Center", dueDate: "May 12, 2026", status: "Overdue", lastChecked: "Nov 12, 2025" },
];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Open: "bg-green-100 text-green-800",
    Closed: "bg-red-100 text-red-800",
    "In Progress": "bg-blue-100 text-blue-800",
    Done: "bg-green-100 text-green-800",
    Compliant: "bg-green-100 text-green-800",
    "Due Soon": "bg-yellow-100 text-yellow-800",
    Overdue: "bg-red-100 text-red-800",
  };
  return <Badge className={map[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
}

function priorityBadge(priority: string) {
  const map: Record<string, string> = {
    High: "bg-red-100 text-red-800",
    Medium: "bg-yellow-100 text-yellow-800",
    Low: "bg-gray-100 text-gray-800",
  };
  return <Badge className={map[priority] || "bg-gray-100 text-gray-800"}>{priority}</Badge>;
}

export default function StoreOpsPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Store Operations</h1>
          <p className="text-muted-foreground">Monitor store performance, staffing, tasks, and compliance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Calendar className="h-4 w-4 mr-2" />Schedule Shift</Button>
          <Button variant="outline"><FileText className="h-4 w-4 mr-2" />Staffing Report</Button>
          <Button><Plus className="h-4 w-4 mr-2" />Create Task</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search stores, tasks..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Store Dashboard</TabsTrigger>
          <TabsTrigger value="staffing">Staffing</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <Card>
            <CardHeader><CardTitle>Store Performance</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Today&apos;s Revenue</TableHead>
                    <TableHead>vs Target %</TableHead>
                    <TableHead>Footfall</TableHead>
                    <TableHead>Conversion %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.filter((s) => s.store.toLowerCase().includes(search.toLowerCase())).map((s) => (
                    <TableRow key={s.store}>
                      <TableCell className="font-medium">{s.store}</TableCell>
                      <TableCell>{s.region}</TableCell>
                      <TableCell>{statusBadge(s.status)}</TableCell>
                      <TableCell>{s.revenue}</TableCell>
                      <TableCell className={s.vsTarget >= 100 ? "text-green-600 font-medium" : s.vsTarget >= 90 ? "text-yellow-600" : "text-red-600"}>{s.vsTarget}%</TableCell>
                      <TableCell>{s.footfall.toLocaleString()}</TableCell>
                      <TableCell>{s.conversion}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staffing">
          <Card>
            <CardHeader><CardTitle>Staffing Overview</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Required Staff</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Gaps</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffing.map((s, i) => (
                    <TableRow key={`${s.store}-${s.shift}-${i}`}>
                      <TableCell className="font-medium">{s.store}</TableCell>
                      <TableCell>{s.shift}</TableCell>
                      <TableCell>{s.required}</TableCell>
                      <TableCell>{s.scheduled}</TableCell>
                      <TableCell>{s.actual}</TableCell>
                      <TableCell className={s.gaps > 0 ? "text-red-600 font-medium" : "text-green-600"}>{s.gaps}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader><CardTitle>Store Tasks</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((t) => (
                    <TableRow key={t.task}>
                      <TableCell className="font-medium">{t.task}</TableCell>
                      <TableCell>{t.store}</TableCell>
                      <TableCell>{t.assignedTo}</TableCell>
                      <TableCell>{priorityBadge(t.priority)}</TableCell>
                      <TableCell>{t.dueDate}</TableCell>
                      <TableCell>{statusBadge(t.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader><CardTitle>Compliance Tracking</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Checked</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compliance.map((c) => (
                    <TableRow key={`${c.item}-${c.store}`}>
                      <TableCell className="font-medium">{c.item}</TableCell>
                      <TableCell>{c.store}</TableCell>
                      <TableCell>{c.dueDate}</TableCell>
                      <TableCell>{statusBadge(c.status)}</TableCell>
                      <TableCell>{c.lastChecked}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
