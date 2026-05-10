"use client";

import { useState } from "react";
import {
  Megaphone,
  Mail,
  MousePointer,
  TrendingUp,
  Plus,
  Search,
  Play,
  Pause,
  Zap,
  Target,
  BarChart3,
  Users,
  Send,
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
const campaigns = [
  { id: "MC-001", name: "Spring Product Launch", type: "Email", status: "Active", audience: 12500, sent: 12500, opens: 4375, clicks: 1250, conversions: 312 },
  { id: "MC-002", name: "Webinar: Cloud Migration", type: "Webinar", status: "Scheduled", audience: 3200, sent: 0, opens: 0, clicks: 0, conversions: 0 },
  { id: "MC-003", name: "Social Media Q2 Campaign", type: "Social", status: "Active", audience: 45000, sent: 28000, opens: 8400, clicks: 2100, conversions: 420 },
  { id: "MC-004", name: "Customer Appreciation Event", type: "Event", status: "Completed", audience: 500, sent: 500, opens: 425, clicks: 380, conversions: 245 },
  { id: "MC-005", name: "New Feature Announcement", type: "Email", status: "Draft", audience: 8900, sent: 0, opens: 0, clicks: 0, conversions: 0 },
  { id: "MC-006", name: "End of Year Webinar Series", type: "Webinar", status: "Completed", audience: 2800, sent: 2800, opens: 1960, clicks: 840, conversions: 196 },
  { id: "MC-007", name: "Partner Referral Push", type: "Email", status: "Active", audience: 5600, sent: 5600, opens: 2240, clicks: 672, conversions: 134 },
];

const emailSequences = [
  { id: "ES-01", name: "Welcome Series", steps: 5, enrolled: 1240, completed: 890, dropOff: 28.2 },
  { id: "ES-02", name: "Trial Nurture", steps: 7, enrolled: 560, completed: 312, dropOff: 44.3 },
  { id: "ES-03", name: "Re-engagement", steps: 3, enrolled: 2100, completed: 1470, dropOff: 30.0 },
  { id: "ES-04", name: "Onboarding Flow", steps: 8, enrolled: 890, completed: 534, dropOff: 40.0 },
  { id: "ES-05", name: "Upsell Sequence", steps: 4, enrolled: 340, completed: 272, dropOff: 20.0 },
];

const leadScoringRules = [
  { id: "LS-01", name: "Email Open", criteria: "Opens marketing email", points: 5, status: "Active" },
  { id: "LS-02", name: "Website Visit", criteria: "Visits pricing page", points: 15, status: "Active" },
  { id: "LS-03", name: "Demo Request", criteria: "Submits demo form", points: 50, status: "Active" },
  { id: "LS-04", name: "Content Download", criteria: "Downloads whitepaper/ebook", points: 20, status: "Active" },
  { id: "LS-05", name: "Webinar Attendance", criteria: "Attends live webinar", points: 30, status: "Active" },
  { id: "LS-06", name: "Social Engagement", criteria: "Likes/shares on social", points: 3, status: "Inactive" },
  { id: "LS-07", name: "Inactivity Decay", criteria: "No activity for 30 days", points: -10, status: "Active" },
];

const campaignStatusColors: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-800",
  Scheduled: "bg-blue-100 text-blue-800",
  Active: "bg-green-100 text-green-800",
  Completed: "bg-purple-100 text-purple-800",
};

const typeColors: Record<string, string> = {
  Email: "bg-blue-100 text-blue-800",
  Social: "bg-pink-100 text-pink-800",
  Event: "bg-amber-100 text-amber-800",
  Webinar: "bg-indigo-100 text-indigo-800",
};

export default function MarketingAutomationPage() {
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const filteredCampaigns = campaigns.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marketing Automation</h1>
          <p className="text-muted-foreground">Manage campaigns, sequences, and lead scoring</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14</div>
            <p className="text-xs text-muted-foreground">3 scheduled to launch</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent This Month</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">48,200</div>
            <p className="text-xs text-muted-foreground">Across all campaigns</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">34.8%</div>
            <p className="text-xs text-green-600">+2.1% vs last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5.2%</div>
            <p className="text-xs text-green-600">+0.8% improvement</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="sequences">Email Sequences</TabsTrigger>
          <TabsTrigger value="landing">Landing Pages</TabsTrigger>
          <TabsTrigger value="scoring">Lead Scoring</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
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
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Opens</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>Conversions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell>
                        <Badge className={typeColors[campaign.type]} variant="secondary">
                          {campaign.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={campaignStatusColors[campaign.status]} variant="secondary">
                          {campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{campaign.audience.toLocaleString()}</TableCell>
                      <TableCell>{campaign.sent.toLocaleString()}</TableCell>
                      <TableCell>{campaign.opens.toLocaleString()}</TableCell>
                      <TableCell>{campaign.clicks.toLocaleString()}</TableCell>
                      <TableCell>{campaign.conversions.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Sequences Tab */}
        <TabsContent value="sequences" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Email Sequences</h3>
            <Button variant="outline" size="sm">
              <Play className="mr-2 h-4 w-4" />
              Launch Sequence
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Steps</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Drop-off Rate</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailSequences.map((seq) => (
                    <TableRow key={seq.id}>
                      <TableCell className="font-medium">{seq.name}</TableCell>
                      <TableCell>{seq.steps}</TableCell>
                      <TableCell>{seq.enrolled.toLocaleString()}</TableCell>
                      <TableCell>{seq.completed.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            seq.dropOff > 35
                              ? "bg-red-100 text-red-800"
                              : seq.dropOff > 25
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                          }
                          variant="secondary"
                        >
                          {seq.dropOff}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Landing Pages Tab */}
        <TabsContent value="landing" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { name: "Product Demo Sign-up", url: "/demo", views: 4520, conversions: 452, rate: 10.0, status: "Published" },
              { name: "Free Trial Landing", url: "/trial", views: 8900, conversions: 1335, rate: 15.0, status: "Published" },
              { name: "Webinar Registration", url: "/webinar-q2", views: 2100, conversions: 630, rate: 30.0, status: "Published" },
              { name: "Case Study Download", url: "/case-study", views: 1800, conversions: 360, rate: 20.0, status: "Published" },
              { name: "New Feature Preview", url: "/preview", views: 0, conversions: 0, rate: 0, status: "Draft" },
              { name: "Partner Program", url: "/partners", views: 950, conversions: 95, rate: 10.0, status: "Published" },
            ].map((page) => (
              <Card key={page.url}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{page.name}</span>
                    <Badge variant={page.status === "Published" ? "default" : "secondary"}>
                      {page.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono mb-3">{page.url}</p>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <p className="font-bold">{page.views.toLocaleString()}</p>
                      <p className="text-muted-foreground text-xs">Views</p>
                    </div>
                    <div>
                      <p className="font-bold">{page.conversions.toLocaleString()}</p>
                      <p className="text-muted-foreground text-xs">Conversions</p>
                    </div>
                    <div>
                      <p className="font-bold">{page.rate}%</p>
                      <p className="text-muted-foreground text-xs">CVR</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Lead Scoring Tab */}
        <TabsContent value="scoring" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Lead Scoring Rules</h3>
            <Button variant="outline" size="sm">
              <Zap className="mr-2 h-4 w-4" />
              Configure Rules
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Criteria</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leadScoringRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{rule.criteria}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            rule.points > 0
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                          variant="secondary"
                        >
                          {rule.points > 0 ? `+${rule.points}` : rule.points}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            rule.status === "Active"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }
                          variant="secondary"
                        >
                          {rule.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Campaign Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Campaign Name</label>
              <Input placeholder="Enter campaign name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Input placeholder="Email / Social / Event / Webinar" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Audience Size</label>
              <Input type="number" placeholder="0" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Scheduled Date</label>
              <Input type="date" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setCreateDialogOpen(false)}>
                Create Campaign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
