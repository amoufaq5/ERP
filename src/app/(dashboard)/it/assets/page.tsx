"use client";

import { useState } from "react";
import {
  Monitor,
  Package,
  UserCheck,
  AlertTriangle,
  Plus,
  Search,
  Laptop,
  Smartphone,
  Server,
  RotateCcw,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ── Mock Data ──
const hardwareAssets = [
  { id: "HW-001", tag: "AST-10045", type: "Laptop", make: "Dell Latitude 5540", assignedTo: "Ahmed Nabil", status: "Active", purchaseDate: "2024-03-15", warranty: "2027-03-14" },
  { id: "HW-002", tag: "AST-10046", type: "Laptop", make: "MacBook Pro 14\"", assignedTo: "Sara Mostafa", status: "Active", purchaseDate: "2024-06-20", warranty: "2027-06-19" },
  { id: "HW-003", tag: "AST-10047", type: "Desktop", make: "HP EliteDesk 800", assignedTo: "Reception Area", status: "Active", purchaseDate: "2023-11-01", warranty: "2026-10-31" },
  { id: "HW-004", tag: "AST-10048", type: "Phone", make: "iPhone 15 Pro", assignedTo: "Mohamed Tarek", status: "Active", purchaseDate: "2024-09-10", warranty: "2026-09-09" },
  { id: "HW-005", tag: "AST-10049", type: "Monitor", make: "LG 27\" 4K", assignedTo: "Ahmed Nabil", status: "Active", purchaseDate: "2024-03-15", warranty: "2027-03-14" },
  { id: "HW-006", tag: "AST-10050", type: "Laptop", make: "Dell Latitude 5530", assignedTo: "—", status: "In Stock", purchaseDate: "2023-08-10", warranty: "2026-08-09" },
  { id: "HW-007", tag: "AST-10051", type: "Server", make: "Dell PowerEdge R750", assignedTo: "Server Room A", status: "Active", purchaseDate: "2023-01-20", warranty: "2028-01-19" },
  { id: "HW-008", tag: "AST-10052", type: "Laptop", make: "Lenovo ThinkPad T14", assignedTo: "—", status: "Maintenance", purchaseDate: "2024-01-05", warranty: "2027-01-04" },
  { id: "HW-009", tag: "AST-10053", type: "Desktop", make: "HP ProDesk 400", assignedTo: "—", status: "Retired", purchaseDate: "2020-06-15", warranty: "2023-06-14" },
];

const softwareLicenses = [
  { id: "SW-001", name: "Microsoft 365 Business", vendor: "Microsoft", type: "Subscription", seatsTotal: 200, seatsUsed: 178, expiry: "2027-01-15", cost: 4200 },
  { id: "SW-002", name: "Adobe Creative Cloud", vendor: "Adobe", type: "Subscription", seatsTotal: 25, seatsUsed: 23, expiry: "2026-08-01", cost: 1500 },
  { id: "SW-003", name: "Slack Business+", vendor: "Slack", type: "Subscription", seatsTotal: 200, seatsUsed: 165, expiry: "2026-12-31", cost: 2400 },
  { id: "SW-004", name: "AutoCAD", vendor: "Autodesk", type: "Perpetual", seatsTotal: 10, seatsUsed: 10, expiry: "—", cost: 8500 },
  { id: "SW-005", name: "Visual Studio Enterprise", vendor: "Microsoft", type: "Subscription", seatsTotal: 30, seatsUsed: 28, expiry: "2026-06-15", cost: 3600 },
  { id: "SW-006", name: "Linux Server OS", vendor: "Red Hat", type: "Subscription", seatsTotal: 15, seatsUsed: 12, expiry: "2026-09-30", cost: 2100 },
  { id: "SW-007", name: "PostgreSQL", vendor: "Community", type: "Open Source", seatsTotal: 999, seatsUsed: 45, expiry: "—", cost: 0 },
  { id: "SW-008", name: "Jira Software", vendor: "Atlassian", type: "Subscription", seatsTotal: 100, seatsUsed: 89, expiry: "2026-07-20", cost: 1800 },
];

const hwStatusColors: Record<string, string> = {
  Active: "bg-green-100 text-green-800",
  "In Stock": "bg-blue-100 text-blue-800",
  Maintenance: "bg-yellow-100 text-yellow-800",
  Retired: "bg-gray-100 text-gray-800",
};

const typeIcons: Record<string, typeof Laptop> = {
  Laptop: Laptop,
  Desktop: Monitor,
  Phone: Smartphone,
  Monitor: Monitor,
  Server: Server,
};

export default function AssetsPage() {
  const [search, setSearch] = useState("");
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);

  const filteredHardware = hardwareAssets.filter(
    (a) =>
      a.tag.toLowerCase().includes(search.toLowerCase()) ||
      a.make.toLowerCase().includes(search.toLowerCase()) ||
      a.assignedTo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">IT Asset Management</h1>
          <p className="text-muted-foreground">Track hardware, software licenses, and asset lifecycle</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Renew License
          </Button>
          <Button onClick={() => setRegisterDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Register Asset
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">456</div>
            <p className="text-xs text-muted-foreground">Hardware & Software</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">389</div>
            <p className="text-xs text-muted-foreground">85% utilization</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <p className="text-xs text-muted-foreground">Ready to assign</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expiring Licenses</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-red-600">Within next 90 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="hardware">
        <TabsList>
          <TabsTrigger value="hardware">Hardware</TabsTrigger>
          <TabsTrigger value="software">Software Licenses</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
        </TabsList>

        {/* Hardware Tab */}
        <TabsContent value="hardware" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by asset tag, make/model, or assignee..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Tag</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Make/Model</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Warranty Expiry</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHardware.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-mono font-medium">{asset.tag}</TableCell>
                      <TableCell>{asset.type}</TableCell>
                      <TableCell>{asset.make}</TableCell>
                      <TableCell>{asset.assignedTo}</TableCell>
                      <TableCell>
                        <Badge className={hwStatusColors[asset.status]} variant="secondary">
                          {asset.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{asset.purchaseDate}</TableCell>
                      <TableCell>{asset.warranty}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" title="Return">
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Retire">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Software Tab */}
        <TabsContent value="software" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Software</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>License Type</TableHead>
                    <TableHead>Seats Total</TableHead>
                    <TableHead>Seats Used</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Cost/mo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {softwareLicenses.map((sw) => (
                    <TableRow key={sw.id}>
                      <TableCell className="font-medium">{sw.name}</TableCell>
                      <TableCell>{sw.vendor}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{sw.type}</Badge>
                      </TableCell>
                      <TableCell>{sw.seatsTotal === 999 ? "Unlimited" : sw.seatsTotal}</TableCell>
                      <TableCell>
                        <span className={sw.seatsUsed >= sw.seatsTotal && sw.seatsTotal !== 999 ? "text-red-600 font-medium" : ""}>
                          {sw.seatsUsed}
                        </span>
                      </TableCell>
                      <TableCell>
                        {sw.expiry === "—" ? (
                          <span className="text-muted-foreground">N/A</span>
                        ) : (
                          <span className={new Date(sw.expiry) < new Date("2026-08-10") ? "text-orange-600" : ""}>
                            {sw.expiry}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{sw.cost > 0 ? `$${sw.cost.toLocaleString()}` : "Free"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { asset: "AST-10045 (Dell Latitude 5540)", user: "Ahmed Nabil", date: "2024-03-15", action: "Assigned" },
                  { asset: "AST-10048 (iPhone 15 Pro)", user: "Mohamed Tarek", date: "2024-09-10", action: "Assigned" },
                  { asset: "AST-10052 (Lenovo ThinkPad T14)", user: "Layla Hassan", date: "2026-04-20", action: "Returned" },
                  { asset: "AST-10046 (MacBook Pro 14\")", user: "Sara Mostafa", date: "2024-06-20", action: "Assigned" },
                  { asset: "AST-10053 (HP ProDesk 400)", user: "Warehouse", date: "2026-03-01", action: "Retired" },
                ].map((entry, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{entry.asset}</p>
                      <p className="text-xs text-muted-foreground">{entry.user} — {entry.date}</p>
                    </div>
                    <Badge
                      className={
                        entry.action === "Assigned"
                          ? "bg-green-100 text-green-800"
                          : entry.action === "Returned"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }
                      variant="secondary"
                    >
                      {entry.action}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lifecycle Tab */}
        <TabsContent value="lifecycle" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Asset Age Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { range: "0-1 years", count: 120, pct: 26 },
                    { range: "1-2 years", count: 156, pct: 34 },
                    { range: "2-3 years", count: 98, pct: 21 },
                    { range: "3-4 years", count: 52, pct: 11 },
                    { range: "4+ years", count: 30, pct: 8 },
                  ].map((item) => (
                    <div key={item.range} className="flex items-center gap-4">
                      <span className="w-24 text-sm">{item.range}</span>
                      <div className="flex-1 h-2 rounded bg-gray-100">
                        <div className="h-2 rounded bg-blue-500" style={{ width: `${item.pct}%` }} />
                      </div>
                      <span className="text-sm text-muted-foreground w-10 text-right">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Warranty Expirations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { asset: "AST-10048 (iPhone 15 Pro)", expiry: "2026-09-09", days: 122 },
                    { asset: "AST-10050 (Dell Latitude 5530)", expiry: "2026-08-09", days: 91 },
                    { asset: "AST-10003 (HP EliteDesk 800)", expiry: "2026-10-31", days: 174 },
                  ].map((item) => (
                    <div key={item.asset} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">{item.asset}</p>
                        <p className="text-xs text-muted-foreground">Expires: {item.expiry}</p>
                      </div>
                      <Badge
                        className={
                          item.days < 100
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }
                        variant="secondary"
                      >
                        {item.days} days
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Register Asset Dialog */}
      <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register New Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Asset Type</label>
              <Input placeholder="Laptop / Desktop / Phone / Monitor / Server" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Make / Model</label>
              <Input placeholder="e.g. Dell Latitude 5540" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Serial Number</label>
              <Input placeholder="Enter serial number" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Purchase Date</label>
              <Input type="date" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Warranty Expiry</label>
              <Input type="date" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Assign To (optional)</label>
              <Input placeholder="Employee name or location" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRegisterDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setRegisterDialogOpen(false)}>
                Register
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
