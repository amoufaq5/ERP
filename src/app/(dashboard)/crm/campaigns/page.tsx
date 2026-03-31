"use client";

import { useState } from "react";
import { Megaphone, DollarSign, TrendingUp, Users, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import StatusBadge from "@/components/shared/status-badge";
import type { Column } from "@/components/shared/data-table";

type CampaignType =
  | "EMAIL"
  | "SOCIAL_MEDIA"
  | "PPC"
  | "CONTENT"
  | "WEBINAR"
  | "TRADE_SHOW"
  | "DIRECT_MAIL";
type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";

interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  budget: number;
  spent: number;
  leads: number;
  conversions: number;
  startDate: string;
  endDate: string;
  owner: string;
}

const STATUS_MAP: Record<CampaignStatus, string> = {
  DRAFT: "draft",
  ACTIVE: "active",
  PAUSED: "on hold",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: "CAM-001",
    name: "Q1 Enterprise Email Blast",
    type: "EMAIL",
    status: "COMPLETED",
    budget: 8000,
    spent: 7640,
    leads: 142,
    conversions: 18,
    startDate: "2026-01-05",
    endDate: "2026-02-28",
    owner: "Sarah Johnson",
  },
  {
    id: "CAM-002",
    name: "Spring Product Launch — Social",
    type: "SOCIAL_MEDIA",
    status: "ACTIVE",
    budget: 15000,
    spent: 9200,
    leads: 287,
    conversions: 34,
    startDate: "2026-03-01",
    endDate: "2026-04-30",
    owner: "Marcus Williams",
  },
  {
    id: "CAM-003",
    name: "Google Ads — CRM Keywords",
    type: "PPC",
    status: "ACTIVE",
    budget: 25000,
    spent: 11500,
    leads: 195,
    conversions: 27,
    startDate: "2026-02-15",
    endDate: "2026-05-15",
    owner: "Emma Davis",
  },
  {
    id: "CAM-004",
    name: "Thought Leadership Blog Series",
    type: "CONTENT",
    status: "ACTIVE",
    budget: 5000,
    spent: 2100,
    leads: 63,
    conversions: 8,
    startDate: "2026-01-15",
    endDate: "2026-06-30",
    owner: "Sarah Johnson",
  },
  {
    id: "CAM-005",
    name: "Manufacturing Automation Webinar",
    type: "WEBINAR",
    status: "COMPLETED",
    budget: 3500,
    spent: 3480,
    leads: 89,
    conversions: 12,
    startDate: "2026-02-20",
    endDate: "2026-02-20",
    owner: "Marcus Williams",
  },
  {
    id: "CAM-006",
    name: "Tech Expo Chicago 2026",
    type: "TRADE_SHOW",
    status: "DRAFT",
    budget: 40000,
    spent: 0,
    leads: 0,
    conversions: 0,
    startDate: "2026-06-10",
    endDate: "2026-06-12",
    owner: "Emma Davis",
  },
];

function BudgetProgress({
  budget,
  spent,
}: {
  budget: number;
  spent: number;
}) {
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const color =
    pct >= 90
      ? "bg-red-500"
      : pct >= 70
      ? "bg-orange-500"
      : "bg-blue-500";
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        ${(spent / 1000).toFixed(1)}K / ${(budget / 1000).toFixed(1)}K
      </span>
    </div>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "EMAIL" as CampaignType,
    budget: "",
    startDate: "",
    endDate: "",
    owner: "",
  });

  const filtered = campaigns.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.type.toLowerCase().includes(search.toLowerCase())
  );

  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE").length;
  const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
  const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0);
  const totalLeads = campaigns.reduce((sum, c) => sum + c.leads, 0);

  function handleAdd() {
    if (!form.name) return;
    const newCampaign: Campaign = {
      id: `CAM-${String(campaigns.length + 1).padStart(3, "0")}`,
      name: form.name,
      type: form.type,
      status: "DRAFT",
      budget: parseFloat(form.budget) || 0,
      spent: 0,
      leads: 0,
      conversions: 0,
      startDate: form.startDate || new Date().toISOString().split("T")[0],
      endDate: form.endDate || "",
      owner: form.owner || "Unassigned",
    };
    setCampaigns((prev) => [newCampaign, ...prev]);
    setForm({ name: "", type: "EMAIL", budget: "", startDate: "", endDate: "", owner: "" });
    setOpen(false);
  }

  const columns: Column<Record<string, unknown>>[] = [
    { key: "name", label: "Campaign Name" },
    {
      key: "type",
      label: "Type",
      render: (v) => (
        <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded">
          {(v as string).replace("_", " ")}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v) => (
        <StatusBadge status={STATUS_MAP[v as CampaignStatus]} />
      ),
    },
    {
      key: "budget",
      label: "Budget vs Spent",
      render: (_v, row) => (
        <BudgetProgress
          budget={row.budget as number}
          spent={row.spent as number}
        />
      ),
    },
    {
      key: "leads",
      label: "Leads",
      render: (v) => <span className="font-medium">{v as number}</span>,
    },
    {
      key: "conversions",
      label: "Conversions",
      render: (v) => <span className="font-medium">{v as number}</span>,
    },
    { key: "startDate", label: "Start Date" },
    { key: "endDate", label: "End Date" },
    { key: "owner", label: "Owner" },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Campaigns"
        description="Plan, execute and measure your marketing campaigns"
      >
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Campaign
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Active Campaigns"
          value={activeCampaigns}
          subtitle="Currently running"
          icon={<Megaphone className="w-5 h-5" />}
        />
        <StatsCard
          title="Total Budget"
          value={`$${(totalBudget / 1000).toFixed(0)}K`}
          subtitle="Across all campaigns"
          icon={<DollarSign className="w-5 h-5" />}
        />
        <StatsCard
          title="Total Spent"
          value={`$${(totalSpent / 1000).toFixed(1)}K`}
          subtitle={`${Math.round((totalSpent / totalBudget) * 100)}% of budget`}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatsCard
          title="Total Leads Generated"
          value={totalLeads}
          subtitle="All campaigns combined"
          icon={<Users className="w-5 h-5" />}
          trend={{ value: 14, label: "vs last quarter" }}
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <DataTable
          columns={columns}
          data={filtered as unknown as Record<string, unknown>[]}
          emptyMessage="No campaigns found."
        />
      </div>

      {/* Add New Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Campaign Name *</Label>
              <Input
                placeholder="e.g. Summer Promo Email Blast"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as CampaignType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="SOCIAL_MEDIA">Social Media</SelectItem>
                  <SelectItem value="PPC">PPC</SelectItem>
                  <SelectItem value="CONTENT">Content</SelectItem>
                  <SelectItem value="WEBINAR">Webinar</SelectItem>
                  <SelectItem value="TRADE_SHOW">Trade Show</SelectItem>
                  <SelectItem value="DIRECT_MAIL">Direct Mail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Budget ($)</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Input
                placeholder="Campaign manager"
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>Add Campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
