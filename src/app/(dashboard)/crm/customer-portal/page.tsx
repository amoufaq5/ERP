"use client";

import { useState } from "react";
import {
  Users,
  Globe,
  Ticket,
  Percent,
  Plus,
  Search,
  Settings,
  Eye,
  EyeOff,
  UserPlus,
  Ban,
  FileText,
  BarChart3,
  Clock,
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
const portalUsers = [
  { id: "PU-001", customer: "Acme Corp", email: "admin@acme.com", status: "Active", lastLogin: "2026-05-09 14:32", created: "2025-08-12" },
  { id: "PU-002", customer: "TechVision Ltd", email: "support@techvision.io", status: "Active", lastLogin: "2026-05-08 09:15", created: "2025-10-03" },
  { id: "PU-003", customer: "GlobalHealth Inc", email: "portal@globalhealth.com", status: "Inactive", lastLogin: "2026-03-22 11:00", created: "2025-06-18" },
  { id: "PU-004", customer: "StartupXYZ", email: "hello@startupxyz.co", status: "Pending", lastLogin: "—", created: "2026-05-07" },
  { id: "PU-005", customer: "Meridian Foods", email: "ops@meridianfoods.com", status: "Active", lastLogin: "2026-05-10 08:45", created: "2025-11-22" },
  { id: "PU-006", customer: "Blue Ocean Shipping", email: "portal@blueocean.net", status: "Active", lastLogin: "2026-05-09 16:20", created: "2025-09-14" },
  { id: "PU-007", customer: "NovaPharma", email: "cs@novapharma.com", status: "Inactive", lastLogin: "2026-01-15 10:30", created: "2025-07-05" },
  { id: "PU-008", customer: "Atlas Engineering", email: "admin@atlaseng.com", status: "Pending", lastLogin: "—", created: "2026-05-09" },
];

const portalPages = [
  { name: "FAQ", slug: "/faq", visible: true, lastUpdated: "2026-04-15" },
  { name: "Orders", slug: "/orders", visible: true, lastUpdated: "2026-05-01" },
  { name: "Invoices", slug: "/invoices", visible: true, lastUpdated: "2026-04-28" },
  { name: "Tickets", slug: "/tickets", visible: true, lastUpdated: "2026-05-05" },
  { name: "Knowledge Base", slug: "/knowledge-base", visible: false, lastUpdated: "2026-03-20" },
];

const statusColors: Record<string, string> = {
  Active: "bg-green-100 text-green-800",
  Inactive: "bg-gray-100 text-gray-800",
  Pending: "bg-yellow-100 text-yellow-800",
};

export default function CustomerPortalPage() {
  const [search, setSearch] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const filteredUsers = portalUsers.filter(
    (u) =>
      u.customer.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customer Portal Configuration</h1>
          <p className="text-muted-foreground">Manage portal users, content, and settings</p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Portal Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,248</div>
            <p className="text-xs text-muted-foreground">+34 this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-muted-foreground">Currently online</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tickets via Portal</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">312</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Self-Service Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">67%</div>
            <p className="text-xs text-green-600">+5% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="settings">Portal Settings</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Portal Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Portal URL</label>
                  <Input value="https://portal.company.com" readOnly />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Support Email</label>
                  <Input value="support@company.com" readOnly />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Session Timeout (minutes)</label>
                  <Input value="30" type="number" readOnly />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Login Attempts</label>
                  <Input value="5" type="number" readOnly />
                </div>
              </div>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Edit Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
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
                    <TableHead>Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.customer}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[user.status]} variant="secondary">
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.lastLogin}</TableCell>
                      <TableCell>{user.created}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Ban className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Portal Pages</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page Name</TableHead>
                    <TableHead>URL Slug</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {portalPages.map((page) => (
                    <TableRow key={page.slug}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {page.name}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{page.slug}</TableCell>
                      <TableCell>
                        {page.visible ? (
                          <Badge className="bg-green-100 text-green-800" variant="secondary">
                            <Eye className="mr-1 h-3 w-3" /> Visible
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800" variant="secondary">
                            <EyeOff className="mr-1 h-3 w-3" /> Hidden
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{page.lastUpdated}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">Configure</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Page Views (30d)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24,891</div>
                <p className="text-xs text-green-600">+12% vs previous period</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Session Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4m 32s</div>
                <p className="text-xs text-muted-foreground">Across all users</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">23%</div>
                <p className="text-xs text-green-600">-3% improvement</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Top Pages by Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { page: "Orders", views: 8420, pct: 34 },
                  { page: "Tickets", views: 6230, pct: 25 },
                  { page: "Invoices", views: 4890, pct: 20 },
                  { page: "FAQ", views: 3210, pct: 13 },
                  { page: "Knowledge Base", views: 2141, pct: 8 },
                ].map((item) => (
                  <div key={item.page} className="flex items-center gap-4">
                    <span className="w-32 text-sm font-medium">{item.page}</span>
                    <div className="flex-1 h-2 rounded bg-gray-100">
                      <div
                        className="h-2 rounded bg-blue-500"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-16 text-right">
                      {item.views.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Portal User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer Name</label>
              <Input placeholder="Enter customer name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input placeholder="user@company.com" type="email" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setInviteDialogOpen(false)}>
                Send Invitation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
