"use client";

import { useState } from "react";
import { Megaphone, DollarSign, TrendingUp, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import StatusBadge from "@/components/shared/status-badge";
import type { Column } from "@/components/shared/data-table";

type CampaignType = "EMAIL" | "SOCIAL_MEDIA" | "PPC" | "CONTENT" | "WEBINAR" | "TRADE_SHOW" | "DIRECT_MAIL";
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
  DRAFT: "draft", ACTIVE: "active", PAUSED: "on hold", COMPLETED: "completed", CANCELLED: "cancelled",
};

const INITIAL_CAMPAIGNS: Campaign[] = [
  { id: "CAM-001", name: "Q1 Enterprise Email Blast", type: "EMAIL", status: "COMPLETED", budget: 8000, spent: 7640, leads: 142, conversions: 18, startDate: "2026-01-05", endDate: "2026-02-28", owner: "Sarah Johnson" },
  { id: "CAM-002", name: "Spring Product Launch — Social", type: "SOCIAL_MEDIA", status: "ACTIVE", budget: 15000, spent: 9200, leads: 287, conversions: 34, startDate: "2026-03-01", endDate: "2026-04-30", owner: "Marcus Williams" },
  { id: "CAM-003", name: "Google Ads — CRM Keywords", type: "PPC", status: "ACTIVE", budget: 25000, spent: 11500, leads: 195, conversions: 27, startDate: "2026-02-15", endDate: "2026-05-15", owner: "Emma Davis" },
  { id: "CAM-004", name: "Thought Leadership Blog Series", type: "CONTENT", status: "ACTIVE", budget: 5000, spent: 2100, leads: 63, conversions: 8, startDate: "2026-01-15", endDate: "2026-06-30", owner: "Sarah Johnson" },
  { id: "CAM-005", name: "Manufacturing Automation Webinar", type: "WEBINAR", status: "COMPLETED", budget: 3500, spent: 3480, leads: 89, conversions: 12, startDate: "2026-02-20", endDate: "2026-02-20", owner: "Marcus Williams" },
  { id: "CAM-006", name: "Tech Expo Chicago 2026", type: "TRADE_SHOW", status: "DRAFT", budget: 40000, spent: 0, leads: 0, conversions: 0, startDate: "2026-06-10", endDate: "2026-06-12", owner: "Emma Davis" },
];

const CAMPAIGN_FIELDS: EntityField[] = [
  { name: "name", label: "Campaign Name", type: "text", placeholder: "e.g. Summer Promo Email Blast", required: true, fullWidth: true },
  { name: "type", label: "Type", type: "select", defaultValue: "EMAIL", options: [
    { label: "Email", value: "EMAIL" }, { label: "Social Media", value: "SOCIAL_MEDIA" },
    { label: "PPC", value: "PPC" }, { label: "Content", value: "CONTENT" },
    { label: "Webinar", value: "WEBINAR" }, { label: "Trade Show", value: "TRADE_SHOW" },
    { label: "Direct Mail", value: "DIRECT_MAIL" },
  ]},
  { name: "budget", label: "Budget (EGP)", type: "number", placeholder: "0" },
  { name: "startDate", label: "Start Date", type: "text", placeholder: "YYYY-MM-DD" },
  { name: "endDate", label: "End Date", type: "text", placeholder: "YYYY-MM-DD" },
  { name: "owner", label: "Owner", type: "text", placeholder: "Campaign manager" },
];

const FILTER_FIELDS = [
  { key: "status", label: "Status", type: "select" as const, options: [
    { label: "Draft", value: "DRAFT" }, { label: "Active", value: "ACTIVE" },
    { label: "Paused", value: "PAUSED" }, { label: "Completed", value: "COMPLETED" },
    { label: "Cancelled", value: "CANCELLED" },
  ]},
  { key: "type", label: "Type", type: "select" as const, options: [
    { label: "Email", value: "EMAIL" }, { label: "Social Media", value: "SOCIAL_MEDIA" },
    { label: "PPC", value: "PPC" }, { label: "Content", value: "CONTENT" },
    { label: "Webinar", value: "WEBINAR" }, { label: "Trade Show", value: "TRADE_SHOW" },
  ]},
];

function BudgetProgress({ budget, spent }: { budget: number; spent: number }) {
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-orange-500" : "bg-blue-500";
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">EGP {(spent / 1000).toFixed(1)}K / EGP {(budget / 1000).toFixed(1)}K</span>
    </div>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);
  const [filters, setFilters] = useState<FilterState>({ _search: "", status: "", type: "" });
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null);

  const filtered = campaigns.filter((c) => {
    const q = (filters._search || "").toLowerCase();
    const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q);
    const matchesStatus = !filters.status || c.status === filters.status;
    const matchesType = !filters.type || c.type === filters.type;
    return matchesSearch && matchesStatus && matchesType;
  });

  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE").length;
  const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
  const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0);
  const totalLeads = campaigns.reduce((sum, c) => sum + c.leads, 0);

  const statusFlow: Record<string, CampaignStatus> = { DRAFT: "ACTIVE", ACTIVE: "PAUSED", PAUSED: "ACTIVE" };

  const columns: Column<Record<string, unknown>>[] = [
    { key: "name", label: "Campaign Name" },
    { key: "type", label: "Type", render: (v) => <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded">{(v as string).replace(/_/g, " ")}</span> },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={STATUS_MAP[v as CampaignStatus]} /> },
    { key: "budget", label: "Budget vs Spent", render: (_v, row) => <BudgetProgress budget={row.budget as number} spent={row.spent as number} /> },
    { key: "leads", label: "Leads", render: (v) => <span className="font-medium">{v as number}</span> },
    { key: "conversions", label: "Conversions", render: (v) => <span className="font-medium">{v as number}</span> },
    { key: "startDate", label: "Start Date" },
    { key: "endDate", label: "End Date" },
    { key: "owner", label: "Owner" },
    {
      key: "id", label: "",
      render: (_v, row) => {
        const c = campaigns.find((x) => x.id === row.id);
        if (!c) return null;
        const next = statusFlow[c.status];
        return (
          <EditDeleteMenu
            onEdit={() => { setEditing(c); setShowModal(true); }}
            onDelete={() => setCampaigns((prev) => prev.filter((x) => x.id !== c.id))}
            onView={() => setDetailCampaign(c)}
            canView
            itemLabel={c.name}
            extraItems={[
              ...(next ? [{ label: `Set ${next}`, onClick: () => setCampaigns((prev) => prev.map((x) => x.id === c.id ? { ...x, status: next } : x)) }] : []),
              ...(c.status === "ACTIVE" ? [{ label: "Complete", onClick: () => setCampaigns((prev) => prev.map((x) => x.id === c.id ? { ...x, status: "COMPLETED" as CampaignStatus } : x)) }] : []),
            ]}
          />
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Campaigns" description="Plan, execute and measure your marketing campaigns">
        <Button onClick={() => { setEditing(null); setShowModal(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Campaign
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Active Campaigns" value={activeCampaigns} subtitle="Currently running" icon={<Megaphone className="w-5 h-5" />} />
        <StatsCard title="Total Budget" value={`EGP ${(totalBudget / 1000).toFixed(0)}K`} subtitle="Across all campaigns" icon={<DollarSign className="w-5 h-5" />} />
        <StatsCard title="Total Spent" value={`EGP ${(totalSpent / 1000).toFixed(1)}K`} subtitle={`${Math.round((totalSpent / totalBudget) * 100)}% of budget`} icon={<TrendingUp className="w-5 h-5" />} />
        <StatsCard title="Total Leads Generated" value={totalLeads} subtitle="All campaigns combined" icon={<Users className="w-5 h-5" />} trend={{ value: 14, label: "vs last quarter" }} />
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-4 border-b border-border">
          <FilterBar
            searchValue={filters._search}
            onSearchChange={(v) => setFilters((f) => ({ ...f, _search: v }))}
            fields={FILTER_FIELDS}
            values={filters}
            onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
          />
        </div>
        <DataTable columns={columns} data={filtered as unknown as Record<string, unknown>[]} exportable exportFilename="crm-campaigns.csv" emptyMessage="No campaigns found." />
      </div>

      <EntityFormModal
        open={showModal}
        onOpenChange={(open) => { setShowModal(open); if (!open) setEditing(null); }}
        title={editing ? "Edit Campaign" : "Add New Campaign"}
        fields={CAMPAIGN_FIELDS}
        initialData={editing ? { name: editing.name, type: editing.type, budget: editing.budget, startDate: editing.startDate, endDate: editing.endDate, owner: editing.owner } : undefined}
        onSubmit={(data) => {
          if (editing) {
            setCampaigns((prev) => prev.map((c) => c.id === editing.id ? {
              ...c,
              name: data.name as string,
              type: (data.type as CampaignType) || c.type,
              budget: (data.budget as number) || c.budget,
              startDate: (data.startDate as string) || c.startDate,
              endDate: (data.endDate as string) || c.endDate,
              owner: (data.owner as string) || c.owner,
            } : c));
          } else {
            const newCampaign: Campaign = {
              id: `CAM-${Date.now().toString(36)}`,
              name: data.name as string,
              type: (data.type as CampaignType) || "EMAIL",
              status: "DRAFT",
              budget: (data.budget as number) || 0,
              spent: 0,
              leads: 0,
              conversions: 0,
              startDate: (data.startDate as string) || new Date().toISOString().split("T")[0],
              endDate: (data.endDate as string) || "",
              owner: (data.owner as string) || "Unassigned",
            };
            setCampaigns((prev) => [newCampaign, ...prev]);
          }
          setShowModal(false);
          setEditing(null);
        }}
      />

      {/* ── Campaign Detail Dialog ── */}
      <Dialog open={!!detailCampaign} onOpenChange={(open) => { if (!open) setDetailCampaign(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailCampaign?.name}</DialogTitle>
          </DialogHeader>
          {detailCampaign && (() => {
            const budgetPct = detailCampaign.budget > 0 ? Math.min(100, Math.round((detailCampaign.spent / detailCampaign.budget) * 100)) : 0;
            const budgetColor = budgetPct >= 90 ? "bg-red-500" : budgetPct >= 70 ? "bg-orange-500" : "bg-blue-500";
            const convRate = detailCampaign.leads > 0 ? ((detailCampaign.conversions / detailCampaign.leads) * 100).toFixed(1) : "0";
            return (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-sm text-muted-foreground">Campaign Name</span><p className="font-medium">{detailCampaign.name}</p></div>
                  <div><span className="text-sm text-muted-foreground">Type</span><p className="font-medium">{detailCampaign.type.replace(/_/g, " ")}</p></div>
                  <div><span className="text-sm text-muted-foreground">Status</span><p><StatusBadge status={STATUS_MAP[detailCampaign.status]} /></p></div>
                  <div><span className="text-sm text-muted-foreground">Owner</span><p className="font-medium">{detailCampaign.owner}</p></div>
                  <div><span className="text-sm text-muted-foreground">Budget</span><p className="font-medium">EGP {detailCampaign.budget.toLocaleString()}</p></div>
                  <div><span className="text-sm text-muted-foreground">Spent</span><p className="font-medium">EGP {detailCampaign.spent.toLocaleString()}</p></div>
                  <div><span className="text-sm text-muted-foreground">Leads Generated</span><p className="font-medium">{detailCampaign.leads}</p></div>
                  <div><span className="text-sm text-muted-foreground">Conversions</span><p className="font-medium">{detailCampaign.conversions}</p></div>
                  <div><span className="text-sm text-muted-foreground">Conversion Rate</span><p className="font-medium">{convRate}%</p></div>
                  <div><span className="text-sm text-muted-foreground">Start Date</span><p className="font-medium">{detailCampaign.startDate}</p></div>
                  <div><span className="text-sm text-muted-foreground">End Date</span><p className="font-medium">{detailCampaign.endDate}</p></div>
                </div>
                {/* Budget Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Budget Utilization</span>
                    <span className="font-medium">{budgetPct}% &mdash; EGP {detailCampaign.spent.toLocaleString()} / EGP {detailCampaign.budget.toLocaleString()}</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${budgetColor}`} style={{ width: `${budgetPct}%` }} />
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
