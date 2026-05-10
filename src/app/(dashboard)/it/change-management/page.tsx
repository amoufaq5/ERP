"use client";

import { useState } from "react";
import {
  GitBranch,
  Clock,
  CheckCircle,
  RotateCcw,
  Plus,
  Search,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  PlayCircle,
  ShieldCheck,
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
const changeRequests = [
  { id: "CR-301", title: "Upgrade database to PostgreSQL 16", type: "Standard", priority: "Medium", status: "Approved", requester: "DBA Team", impact: "Medium", scheduled: "2026-05-15" },
  { id: "CR-302", title: "Firewall rule update — new VPN gateway", type: "Normal", priority: "High", status: "Submitted", requester: "Network Team", impact: "High", scheduled: "—" },
  { id: "CR-303", title: "Emergency patch — CVE-2026-1234", type: "Emergency", priority: "Critical", status: "Implemented", requester: "Security Team", impact: "High", scheduled: "2026-05-09" },
  { id: "CR-304", title: "Office 365 tenant migration", type: "Normal", priority: "High", status: "Scheduled", requester: "IT Operations", impact: "High", scheduled: "2026-05-20" },
  { id: "CR-305", title: "Add monitoring agents to production", type: "Standard", priority: "Low", status: "Draft", requester: "DevOps", impact: "Low", scheduled: "—" },
  { id: "CR-306", title: "Replace SSL certificates", type: "Standard", priority: "Medium", status: "Approved", requester: "Infrastructure", impact: "Medium", scheduled: "2026-05-18" },
  { id: "CR-307", title: "Migrate legacy API to v3", type: "Normal", priority: "Medium", status: "Submitted", requester: "Dev Team", impact: "Medium", scheduled: "—" },
  { id: "CR-308", title: "Data center power maintenance", type: "Normal", priority: "High", status: "Closed", requester: "Facilities", impact: "High", scheduled: "2026-05-03" },
  { id: "CR-309", title: "Deploy new HR module", type: "Normal", priority: "Medium", status: "Rejected", requester: "HR IT", impact: "Low", scheduled: "—" },
];

const approvals = [
  { id: "CR-302", title: "Firewall rule update — new VPN gateway", submitter: "Network Team", submitted: "2026-05-08", approvers: ["CISO", "IT Director"], status: "Pending" },
  { id: "CR-307", title: "Migrate legacy API to v3", submitter: "Dev Team", submitted: "2026-05-09", approvers: ["CTO", "IT Director"], status: "Pending" },
  { id: "CR-301", title: "Upgrade database to PostgreSQL 16", submitter: "DBA Team", submitted: "2026-05-05", approvers: ["IT Director"], status: "Approved" },
];

const postImplementation = [
  { id: "CR-303", title: "Emergency patch — CVE-2026-1234", implemented: "2026-05-09", outcome: "Success", issues: "None", rollback: false },
  { id: "CR-310", title: "Network switch firmware update", implemented: "2026-05-07", outcome: "Success", issues: "Minor packet loss for 2min during cutover", rollback: false },
];

const statusColors: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-800",
  Submitted: "bg-blue-100 text-blue-800",
  Approved: "bg-green-100 text-green-800",
  Scheduled: "bg-indigo-100 text-indigo-800",
  Implemented: "bg-purple-100 text-purple-800",
  Closed: "bg-gray-100 text-gray-800",
  Rejected: "bg-red-100 text-red-800",
};

const typeColors: Record<string, string> = {
  Standard: "bg-blue-100 text-blue-800",
  Normal: "bg-yellow-100 text-yellow-800",
  Emergency: "bg-red-100 text-red-800",
};

const priorityColors: Record<string, string> = {
  Critical: "bg-red-100 text-red-800",
  High: "bg-orange-100 text-orange-800",
  Medium: "bg-yellow-100 text-yellow-800",
  Low: "bg-gray-100 text-gray-800",
};

const impactColors: Record<string, string> = {
  High: "bg-red-100 text-red-800",
  Medium: "bg-yellow-100 text-yellow-800",
  Low: "bg-green-100 text-green-800",
};

export default function ChangeManagementPage() {
  const [search, setSearch] = useState("");
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  const filteredChanges = changeRequests.filter(
    (cr) =>
      cr.id.toLowerCase().includes(search.toLowerCase()) ||
      cr.title.toLowerCase().includes(search.toLowerCase()) ||
      cr.requester.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">IT Change Management</h1>
          <p className="text-muted-foreground">Submit, approve, and track infrastructure changes</p>
        </div>
        <Button onClick={() => setSubmitDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Submit Change
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Changes</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground">Across all stages</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-yellow-600">2 high priority</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Implemented This Month</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-green-600">100% success rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rollbacks</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-green-600">None this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Change Requests</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="post">Post-Implementation</TabsTrigger>
        </TabsList>

        {/* Change Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by CR #, title, or requester..."
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
                    <TableHead>CR #</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead>Scheduled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChanges.map((cr) => (
                    <TableRow key={cr.id}>
                      <TableCell className="font-mono font-medium">{cr.id}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{cr.title}</TableCell>
                      <TableCell>
                        <Badge className={typeColors[cr.type]} variant="secondary">
                          {cr.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={priorityColors[cr.priority]} variant="secondary">
                          {cr.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[cr.status]} variant="secondary">
                          {cr.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{cr.requester}</TableCell>
                      <TableCell>
                        <Badge className={impactColors[cr.impact]} variant="secondary">
                          {cr.impact}
                        </Badge>
                      </TableCell>
                      <TableCell>{cr.scheduled}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Changes — May 2026</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {changeRequests
                  .filter((cr) => cr.scheduled !== "—")
                  .sort((a, b) => a.scheduled.localeCompare(b.scheduled))
                  .map((cr) => (
                    <div key={cr.id} className="flex items-center gap-4 rounded-lg border p-3">
                      <div className="flex flex-col items-center justify-center rounded bg-blue-50 px-3 py-1 min-w-[60px]">
                        <span className="text-xs text-muted-foreground">
                          {new Date(cr.scheduled).toLocaleDateString("en", { month: "short" })}
                        </span>
                        <span className="text-lg font-bold text-blue-700">
                          {new Date(cr.scheduled).getDate()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-muted-foreground">{cr.id}</span>
                          <span className="font-medium">{cr.title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{cr.requester}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={typeColors[cr.type]} variant="secondary">{cr.type}</Badge>
                        <Badge className={statusColors[cr.status]} variant="secondary">{cr.status}</Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CR #</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Submitter</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Approvers</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvals.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono font-medium">{item.id}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{item.title}</TableCell>
                      <TableCell>{item.submitter}</TableCell>
                      <TableCell>{item.submitted}</TableCell>
                      <TableCell>{item.approvers.join(", ")}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            item.status === "Pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : item.status === "Approved"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                          variant="secondary"
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.status === "Pending" && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" title="Approve">
                              <ThumbsUp className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Reject">
                              <ThumbsDown className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Post-Implementation Tab */}
        <TabsContent value="post" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Post-Implementation Reviews</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CR #</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Implemented</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Issues</TableHead>
                    <TableHead>Rollback</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {postImplementation.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono font-medium">{item.id}</TableCell>
                      <TableCell>{item.title}</TableCell>
                      <TableCell>{item.implemented}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            item.outcome === "Success"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }
                          variant="secondary"
                        >
                          {item.outcome}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] text-sm">{item.issues}</TableCell>
                      <TableCell>
                        {item.rollback ? (
                          <Badge className="bg-red-100 text-red-800" variant="secondary">Yes</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800" variant="secondary">No</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">95%</p>
                <p className="text-sm text-muted-foreground">Success Rate (90d)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">3.2d</p>
                <p className="text-sm text-muted-foreground">Avg Lead Time</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">1</p>
                <p className="text-sm text-muted-foreground">Rollbacks (90d)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">42</p>
                <p className="text-sm text-muted-foreground">Changes Completed (90d)</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Submit Change Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Change Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input placeholder="Brief description of the change" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Input placeholder="Standard / Normal / Emergency" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Input placeholder="Critical / High / Medium / Low" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Impact</label>
              <Input placeholder="High / Medium / Low" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Justification</label>
              <Input placeholder="Why is this change needed?" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rollback Plan</label>
              <Input placeholder="Describe the rollback procedure" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setSubmitDialogOpen(false)}>
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
