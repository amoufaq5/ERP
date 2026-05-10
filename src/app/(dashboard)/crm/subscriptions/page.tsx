"use client";

import { useState } from "react";
import {
  CreditCard,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Plus,
  Search,
  Pause,
  Play,
  XCircle,
  ArrowUpDown,
  Mail,
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
const subscriptions = [
  { id: "SUB-001", customer: "Acme Corp", plan: "Enterprise", status: "Active", startDate: "2025-06-01", nextBilling: "2026-06-01", mrr: 2500 },
  { id: "SUB-002", customer: "TechVision Ltd", plan: "Professional", status: "Active", startDate: "2025-09-15", nextBilling: "2026-06-15", mrr: 1200 },
  { id: "SUB-003", customer: "StartupXYZ", plan: "Starter", status: "Trial", startDate: "2026-04-28", nextBilling: "2026-05-28", mrr: 0 },
  { id: "SUB-004", customer: "OldTech Inc", plan: "Professional", status: "Past Due", startDate: "2025-03-01", nextBilling: "2026-05-01", mrr: 1200 },
  { id: "SUB-005", customer: "Meridian Foods", plan: "Enterprise", status: "Active", startDate: "2025-11-01", nextBilling: "2026-11-01", mrr: 2500 },
  { id: "SUB-006", customer: "ClosedShop LLC", plan: "Starter", status: "Cancelled", startDate: "2025-01-15", nextBilling: "—", mrr: 0 },
  { id: "SUB-007", customer: "PauseMe Corp", plan: "Professional", status: "Paused", startDate: "2025-07-01", nextBilling: "—", mrr: 0 },
  { id: "SUB-008", customer: "Blue Ocean Shipping", plan: "Enterprise", status: "Active", startDate: "2025-08-20", nextBilling: "2026-08-20", mrr: 2500 },
];

const plans = [
  { id: "PL-01", name: "Starter", price: 49, cycle: "Monthly", features: "5 Users, 10GB Storage, Email Support", subscribers: 124 },
  { id: "PL-02", name: "Professional", price: 99, cycle: "Monthly", features: "25 Users, 100GB Storage, Priority Support, API Access", subscribers: 312 },
  { id: "PL-03", name: "Enterprise", price: 249, cycle: "Monthly", features: "Unlimited Users, 1TB Storage, Dedicated Support, SLA", subscribers: 89 },
  { id: "PL-04", name: "Starter Annual", price: 470, cycle: "Annual", features: "5 Users, 10GB Storage, Email Support (2 months free)", subscribers: 56 },
  { id: "PL-05", name: "Professional Annual", price: 950, cycle: "Annual", features: "25 Users, 100GB Storage, Priority Support, API Access (2 months free)", subscribers: 178 },
];

const churnData = [
  { month: "Jan 2026", churned: 8, total: 780, rate: 1.03 },
  { month: "Feb 2026", churned: 5, total: 795, rate: 0.63 },
  { month: "Mar 2026", churned: 12, total: 802, rate: 1.50 },
  { month: "Apr 2026", churned: 7, total: 810, rate: 0.86 },
  { month: "May 2026", churned: 3, total: 818, rate: 0.37 },
];

const statusColors: Record<string, string> = {
  Active: "bg-green-100 text-green-800",
  Trial: "bg-blue-100 text-blue-800",
  "Past Due": "bg-red-100 text-red-800",
  Cancelled: "bg-gray-100 text-gray-800",
  Paused: "bg-yellow-100 text-yellow-800",
};

export default function SubscriptionsPage() {
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const filteredSubs = subscriptions.filter(
    (s) =>
      s.customer.toLowerCase().includes(search.toLowerCase()) ||
      s.plan.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subscription Management</h1>
          <p className="text-muted-foreground">Manage subscriptions, plans, and billing cycles</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Mail className="mr-2 h-4 w-4" />
            Send Renewal Reminder
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Subscription
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">818</div>
            <p className="text-xs text-green-600">+12 this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$124,500</div>
            <p className="text-xs text-green-600">+$3,200 growth</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.2%</div>
            <p className="text-xs text-green-600">Below target of 2%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15</div>
            <p className="text-xs text-muted-foreground">3 enterprise, 12 pro</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="subscriptions">
        <TabsList>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="billing">Billing Cycles</TabsTrigger>
          <TabsTrigger value="churn">Churn Analysis</TabsTrigger>
        </TabsList>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by customer or plan..."
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
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Next Billing</TableHead>
                    <TableHead>MRR</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubs.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.customer}</TableCell>
                      <TableCell>{sub.plan}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[sub.status]} variant="secondary">
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{sub.startDate}</TableCell>
                      <TableCell>{sub.nextBilling}</TableCell>
                      <TableCell>{sub.mrr > 0 ? `$${sub.mrr.toLocaleString()}` : "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" title="Upgrade/Downgrade">
                            <ArrowUpDown className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Pause">
                            <Pause className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Cancel">
                            <XCircle className="h-4 w-4" />
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

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Billing Cycle</TableHead>
                    <TableHead>Features</TableHead>
                    <TableHead>Subscribers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>${plan.price}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{plan.cycle}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {plan.features}
                      </TableCell>
                      <TableCell>{plan.subscribers}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Cycles Tab */}
        <TabsContent value="billing" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Monthly Subscribers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">436</div>
                <p className="text-xs text-muted-foreground">53% of total</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Annual Subscribers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">279</div>
                <p className="text-xs text-muted-foreground">34% of total</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Trials Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">103</div>
                <p className="text-xs text-muted-foreground">13% of total</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Renewals (Next 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { customer: "TechVision Ltd", plan: "Professional", date: "2026-06-15", amount: 1200 },
                  { customer: "Acme Corp", plan: "Enterprise", date: "2026-06-01", amount: 2500 },
                  { customer: "DataFlow Systems", plan: "Starter", date: "2026-05-28", amount: 49 },
                  { customer: "QuickBuild Co", plan: "Professional", date: "2026-05-22", amount: 99 },
                ].map((renewal, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{renewal.customer}</p>
                      <p className="text-sm text-muted-foreground">{renewal.plan} — {renewal.date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">${renewal.amount}</span>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Remind
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Churn Analysis Tab */}
        <TabsContent value="churn" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Churn Trend</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Churned</TableHead>
                    <TableHead>Total Subscribers</TableHead>
                    <TableHead>Churn Rate</TableHead>
                    <TableHead>Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {churnData.map((row, i) => (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">{row.month}</TableCell>
                      <TableCell>{row.churned}</TableCell>
                      <TableCell>{row.total}</TableCell>
                      <TableCell>{row.rate}%</TableCell>
                      <TableCell>
                        {i > 0 && row.rate < churnData[i - 1].rate ? (
                          <TrendingDown className="h-4 w-4 text-green-600" />
                        ) : i > 0 ? (
                          <TrendingUp className="h-4 w-4 text-red-600" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Top Churn Reasons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { reason: "Too expensive", pct: 35 },
                  { reason: "Missing features", pct: 25 },
                  { reason: "Switched to competitor", pct: 20 },
                  { reason: "No longer needed", pct: 12 },
                  { reason: "Poor support", pct: 8 },
                ].map((item) => (
                  <div key={item.reason} className="flex items-center gap-4">
                    <span className="w-44 text-sm">{item.reason}</span>
                    <div className="flex-1 h-2 rounded bg-gray-100">
                      <div
                        className="h-2 rounded bg-red-400"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-10 text-right">{item.pct}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Subscription Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer</label>
              <Input placeholder="Select customer" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Plan</label>
              <Input placeholder="Starter / Professional / Enterprise" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Billing Cycle</label>
              <Input placeholder="Monthly / Annual" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input type="date" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setCreateDialogOpen(false)}>
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
