"use client";

import { useState } from "react";
import {
  Wrench,
  Users,
  Clock,
  CheckCircle,
  Plus,
  Search,
  MapPin,
  Phone,
  Calendar,
  Truck,
  Package,
  AlertTriangle,
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
const serviceCalls = [
  { id: "SC-1001", customer: "Acme Corp", type: "Installation", priority: "High", status: "Dispatched", technician: "Ahmed Hassan", scheduled: "2026-05-10 09:00" },
  { id: "SC-1002", customer: "TechVision Ltd", type: "Repair", priority: "Critical", status: "In Progress", technician: "Mohamed Ali", scheduled: "2026-05-10 10:30" },
  { id: "SC-1003", customer: "GlobalHealth Inc", type: "Maintenance", priority: "Medium", status: "Open", technician: "—", scheduled: "2026-05-11 14:00" },
  { id: "SC-1004", customer: "Meridian Foods", type: "Inspection", priority: "Low", status: "Completed", technician: "Sara Ibrahim", scheduled: "2026-05-09 11:00" },
  { id: "SC-1005", customer: "Blue Ocean Shipping", type: "Repair", priority: "High", status: "Open", technician: "—", scheduled: "2026-05-12 08:00" },
  { id: "SC-1006", customer: "NovaPharma", type: "Installation", priority: "Medium", status: "Dispatched", technician: "Khalid Youssef", scheduled: "2026-05-10 15:00" },
  { id: "SC-1007", customer: "Atlas Engineering", type: "Maintenance", priority: "Low", status: "Completed", technician: "Ahmed Hassan", scheduled: "2026-05-08 09:00" },
  { id: "SC-1008", customer: "StartupXYZ", type: "Repair", priority: "Critical", status: "In Progress", technician: "Mohamed Ali", scheduled: "2026-05-10 08:00" },
];

const technicians = [
  { id: "T-01", name: "Ahmed Hassan", specialization: "HVAC", status: "On Job", currentJob: "SC-1001", completedToday: 1, rating: 4.8 },
  { id: "T-02", name: "Mohamed Ali", specialization: "Electrical", status: "On Job", currentJob: "SC-1002", completedToday: 0, rating: 4.6 },
  { id: "T-03", name: "Sara Ibrahim", specialization: "Plumbing", status: "Available", currentJob: "—", completedToday: 2, rating: 4.9 },
  { id: "T-04", name: "Khalid Youssef", specialization: "General", status: "On Job", currentJob: "SC-1006", completedToday: 1, rating: 4.5 },
  { id: "T-05", name: "Omar Farid", specialization: "Networking", status: "Off Duty", currentJob: "—", completedToday: 0, rating: 4.7 },
];

const partsInventory = [
  { id: "P-101", name: "Air Filter Unit", sku: "AFU-200", stock: 45, reserved: 8, reorderLevel: 20, cost: 150 },
  { id: "P-102", name: "Circuit Breaker 30A", sku: "CB-30A", stock: 12, reserved: 3, reorderLevel: 15, cost: 85 },
  { id: "P-103", name: "Pipe Connector 1\"", sku: "PC-1IN", stock: 200, reserved: 25, reorderLevel: 50, cost: 12 },
  { id: "P-104", name: "Thermostat Module", sku: "TM-500", stock: 8, reserved: 2, reorderLevel: 10, cost: 320 },
  { id: "P-105", name: "Ethernet Cable Cat6 (50m)", sku: "EC6-50", stock: 35, reserved: 5, reorderLevel: 10, cost: 45 },
];

const statusColors: Record<string, string> = {
  Open: "bg-blue-100 text-blue-800",
  Dispatched: "bg-yellow-100 text-yellow-800",
  "In Progress": "bg-purple-100 text-purple-800",
  Completed: "bg-green-100 text-green-800",
};

const priorityColors: Record<string, string> = {
  Critical: "bg-red-100 text-red-800",
  High: "bg-orange-100 text-orange-800",
  Medium: "bg-yellow-100 text-yellow-800",
  Low: "bg-gray-100 text-gray-800",
};

const techStatusColors: Record<string, string> = {
  "On Job": "bg-blue-100 text-blue-800",
  Available: "bg-green-100 text-green-800",
  "Off Duty": "bg-gray-100 text-gray-800",
};

export default function FieldServicePage() {
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const filteredCalls = serviceCalls.filter(
    (c) =>
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.customer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Field Service Management</h1>
          <p className="text-muted-foreground">Manage service calls, dispatch technicians, and track parts</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Service Call
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Service Calls</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">5 critical priority</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Technicians Dispatched</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">of 18 available</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.2h</div>
            <p className="text-xs text-green-600">-0.5h from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">First Fix Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78%</div>
            <p className="text-xs text-green-600">+3% improvement</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="calls">
        <TabsList>
          <TabsTrigger value="calls">Service Calls</TabsTrigger>
          <TabsTrigger value="dispatch">Dispatch Board</TabsTrigger>
          <TabsTrigger value="technicians">Technicians</TabsTrigger>
          <TabsTrigger value="parts">Parts Inventory</TabsTrigger>
        </TabsList>

        {/* Service Calls Tab */}
        <TabsContent value="calls" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by call # or customer..."
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
                    <TableHead>Call #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Technician</TableHead>
                    <TableHead>Scheduled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCalls.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell className="font-mono font-medium">{call.id}</TableCell>
                      <TableCell>{call.customer}</TableCell>
                      <TableCell>{call.type}</TableCell>
                      <TableCell>
                        <Badge className={priorityColors[call.priority]} variant="secondary">
                          {call.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[call.status]} variant="secondary">
                          {call.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{call.technician}</TableCell>
                      <TableCell>{call.scheduled}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dispatch Board Tab */}
        <TabsContent value="dispatch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dispatch Schedule — Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {technicians
                  .filter((t) => t.status !== "Off Duty")
                  .map((tech) => (
                    <Card key={tech.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{tech.name}</span>
                          <Badge className={techStatusColors[tech.status]} variant="secondary">
                            {tech.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{tech.specialization}</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Current:</span>
                            <span className="font-mono">{tech.currentJob}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Completed today:</span>
                            <span>{tech.completedToday}</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="mt-3 w-full">
                          <Truck className="mr-2 h-3 w-3" />
                          Dispatch
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Technicians Tab */}
        <TabsContent value="technicians" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current Job</TableHead>
                    <TableHead>Completed Today</TableHead>
                    <TableHead>Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {technicians.map((tech) => (
                    <TableRow key={tech.id}>
                      <TableCell className="font-medium">{tech.name}</TableCell>
                      <TableCell>{tech.specialization}</TableCell>
                      <TableCell>
                        <Badge className={techStatusColors[tech.status]} variant="secondary">
                          {tech.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{tech.currentJob}</TableCell>
                      <TableCell>{tech.completedToday}</TableCell>
                      <TableCell>
                        <span className="text-yellow-600 font-medium">{tech.rating}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Parts Inventory Tab */}
        <TabsContent value="parts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Parts Inventory</h3>
            <Button variant="outline" size="sm">
              <Package className="mr-2 h-4 w-4" />
              Order Parts
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>In Stock</TableHead>
                    <TableHead>Reserved</TableHead>
                    <TableHead>Reorder Level</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partsInventory.map((part) => (
                    <TableRow key={part.id}>
                      <TableCell className="font-medium">{part.name}</TableCell>
                      <TableCell className="font-mono text-sm">{part.sku}</TableCell>
                      <TableCell>{part.stock}</TableCell>
                      <TableCell>{part.reserved}</TableCell>
                      <TableCell>{part.reorderLevel}</TableCell>
                      <TableCell>${part.cost}</TableCell>
                      <TableCell>
                        {part.stock <= part.reorderLevel ? (
                          <Badge className="bg-red-100 text-red-800" variant="secondary">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800" variant="secondary">
                            OK
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Service Call Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Service Call</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer</label>
              <Input placeholder="Select customer" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Input placeholder="Installation / Repair / Maintenance / Inspection" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Input placeholder="Critical / High / Medium / Low" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Scheduled Date</label>
              <Input type="datetime-local" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input placeholder="Describe the service required" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setCreateDialogOpen(false)}>
                Create Call
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
