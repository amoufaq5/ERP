"use client";

import { useState } from "react";
import {
  Headphones,
  Clock,
  Shield,
  ThumbsUp,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  BookOpen,
  BarChart3,
  User,
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
const tickets = [
  { id: "TK-4501", subject: "Cannot access email", requester: "Ahmed Nabil", category: "Software", priority: "P2", status: "In Progress", assignedTo: "IT Support L1", sla: "On Track" },
  { id: "TK-4502", subject: "Laptop screen flickering", requester: "Sara Mostafa", category: "Hardware", priority: "P3", status: "New", assignedTo: "—", sla: "At Risk" },
  { id: "TK-4503", subject: "VPN disconnects frequently", requester: "Mohamed Tarek", category: "Network", priority: "P2", status: "Assigned", assignedTo: "Network Team", sla: "On Track" },
  { id: "TK-4504", subject: "Need access to SharePoint", requester: "Layla Hassan", category: "Access", priority: "P4", status: "Resolved", assignedTo: "IT Support L1", sla: "Met" },
  { id: "TK-4505", subject: "Server room UPS alarm", requester: "System Alert", category: "Hardware", priority: "P1", status: "In Progress", assignedTo: "Infrastructure", sla: "Breached" },
  { id: "TK-4506", subject: "Printer not working — 3rd floor", requester: "Hana Adel", category: "Hardware", priority: "P4", status: "Assigned", assignedTo: "IT Support L1", sla: "On Track" },
  { id: "TK-4507", subject: "Software license expired", requester: "Omar Samy", category: "Software", priority: "P3", status: "New", assignedTo: "—", sla: "On Track" },
  { id: "TK-4508", subject: "Password reset request", requester: "Fatma Ali", category: "Access", priority: "P4", status: "Closed", assignedTo: "IT Support L1", sla: "Met" },
  { id: "TK-4509", subject: "Network outage — Building B", requester: "NOC Alert", category: "Network", priority: "P1", status: "In Progress", assignedTo: "Network Team", sla: "At Risk" },
  { id: "TK-4510", subject: "New employee onboarding setup", requester: "HR System", category: "Other", priority: "P3", status: "Assigned", assignedTo: "IT Support L2", sla: "On Track" },
];

const kbArticles = [
  { id: "KB-101", title: "How to connect to VPN", category: "Network", views: 1245, helpful: 92, lastUpdated: "2026-04-15" },
  { id: "KB-102", title: "Password reset procedures", category: "Access", views: 3420, helpful: 88, lastUpdated: "2026-05-01" },
  { id: "KB-103", title: "Setting up email on mobile", category: "Software", views: 890, helpful: 95, lastUpdated: "2026-03-20" },
  { id: "KB-104", title: "Printer troubleshooting guide", category: "Hardware", views: 567, helpful: 78, lastUpdated: "2026-02-10" },
  { id: "KB-105", title: "Requesting software installation", category: "Software", views: 432, helpful: 85, lastUpdated: "2026-04-28" },
  { id: "KB-106", title: "Wi-Fi connectivity issues", category: "Network", views: 1890, helpful: 90, lastUpdated: "2026-05-05" },
];

const priorityColors: Record<string, string> = {
  P1: "bg-red-100 text-red-800",
  P2: "bg-orange-100 text-orange-800",
  P3: "bg-yellow-100 text-yellow-800",
  P4: "bg-gray-100 text-gray-800",
};

const statusColors: Record<string, string> = {
  New: "bg-blue-100 text-blue-800",
  Assigned: "bg-indigo-100 text-indigo-800",
  "In Progress": "bg-purple-100 text-purple-800",
  Resolved: "bg-green-100 text-green-800",
  Closed: "bg-gray-100 text-gray-800",
};

const slaColors: Record<string, string> = {
  "On Track": "bg-green-100 text-green-800",
  "At Risk": "bg-yellow-100 text-yellow-800",
  Breached: "bg-red-100 text-red-800",
  Met: "bg-blue-100 text-blue-800",
};

export default function HelpdeskPage() {
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const filteredTickets = tickets.filter(
    (t) =>
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.requester.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">IT Helpdesk</h1>
          <p className="text-muted-foreground">Manage tickets, knowledge base, and SLA compliance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <BookOpen className="mr-2 h-4 w-4" />
            Create KB Article
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Ticket
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <Headphones className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">47</div>
            <p className="text-xs text-muted-foreground">6 P1/P2 critical</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18min</div>
            <p className="text-xs text-green-600">-5min from target</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">SLA Compliance</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.2%</div>
            <p className="text-xs text-green-600">Above 90% target</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction Score</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.6/5</div>
            <p className="text-xs text-muted-foreground">Based on 230 ratings</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tickets">
        <TabsList>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="kb">Knowledge Base</TabsTrigger>
          <TabsTrigger value="sla">SLA Dashboard</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Tickets Tab */}
        <TabsContent value="tickets" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tickets by ID, subject, or requester..."
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
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>SLA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-mono font-medium">{ticket.id}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{ticket.subject}</TableCell>
                      <TableCell>{ticket.requester}</TableCell>
                      <TableCell>{ticket.category}</TableCell>
                      <TableCell>
                        <Badge className={priorityColors[ticket.priority]} variant="secondary">
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[ticket.status]} variant="secondary">
                          {ticket.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{ticket.assignedTo}</TableCell>
                      <TableCell>
                        <Badge className={slaColors[ticket.sla]} variant="secondary">
                          {ticket.sla}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Knowledge Base Tab */}
        <TabsContent value="kb" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Article Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Helpful %</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kbArticles.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          {article.title}
                        </div>
                      </TableCell>
                      <TableCell>{article.category}</TableCell>
                      <TableCell>{article.views.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            article.helpful >= 90
                              ? "bg-green-100 text-green-800"
                              : article.helpful >= 80
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }
                          variant="secondary"
                        >
                          {article.helpful}%
                        </Badge>
                      </TableCell>
                      <TableCell>{article.lastUpdated}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SLA Dashboard Tab */}
        <TabsContent value="sla" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { priority: "P1 — Critical", target: "15 min response, 1h resolve", compliance: 88 },
              { priority: "P2 — High", target: "30 min response, 4h resolve", compliance: 92 },
              { priority: "P3 — Medium", target: "2h response, 24h resolve", compliance: 96 },
              { priority: "P4 — Low", target: "4h response, 72h resolve", compliance: 99 },
            ].map((sla) => (
              <Card key={sla.priority}>
                <CardContent className="p-4">
                  <p className="font-medium text-sm mb-1">{sla.priority}</p>
                  <p className="text-xs text-muted-foreground mb-3">{sla.target}</p>
                  <div className="text-2xl font-bold mb-1">{sla.compliance}%</div>
                  <div className="h-2 rounded bg-gray-100">
                    <div
                      className={`h-2 rounded ${sla.compliance >= 95 ? "bg-green-500" : sla.compliance >= 90 ? "bg-yellow-500" : "bg-red-500"}`}
                      style={{ width: `${sla.compliance}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>SLA Breach History (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { ticket: "TK-4505", subject: "Server room UPS alarm", priority: "P1", breach: "Resolution time exceeded" },
                  { ticket: "TK-4492", subject: "Email server down", priority: "P1", breach: "Response time exceeded" },
                  { ticket: "TK-4488", subject: "Database connectivity issue", priority: "P2", breach: "Resolution time exceeded" },
                ].map((breach) => (
                  <div key={breach.ticket} className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{breach.ticket}: {breach.subject}</p>
                      <p className="text-xs text-muted-foreground">{breach.breach}</p>
                    </div>
                    <Badge className={priorityColors[breach.priority]} variant="secondary">
                      {breach.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tickets by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { category: "Software", count: 145, pct: 35 },
                    { category: "Hardware", count: 98, pct: 24 },
                    { category: "Network", count: 78, pct: 19 },
                    { category: "Access", count: 62, pct: 15 },
                    { category: "Other", count: 29, pct: 7 },
                  ].map((item) => (
                    <div key={item.category} className="flex items-center gap-4">
                      <span className="w-24 text-sm">{item.category}</span>
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
                <CardTitle>Resolution Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: "First Contact Resolution", value: "68%" },
                    { label: "Avg Resolution Time", value: "4.2 hours" },
                    { label: "Tickets Resolved Today", value: "12" },
                    { label: "Backlog (>48h old)", value: "5" },
                    { label: "Reopened This Week", value: "3" },
                  ].map((metric) => (
                    <div key={metric.label} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <span className="text-sm">{metric.label}</span>
                      <span className="font-medium">{metric.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Ticket Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <Input placeholder="Brief description of the issue" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Input placeholder="Hardware / Software / Network / Access / Other" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Input placeholder="P1 / P2 / P3 / P4" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Requester</label>
              <Input placeholder="Name of person reporting" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input placeholder="Detailed description of the issue" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setCreateDialogOpen(false)}>
                Create Ticket
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
