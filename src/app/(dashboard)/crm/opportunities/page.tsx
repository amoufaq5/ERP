"use client";

import { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Award,
  BarChart2,
  Plus,
  LayoutGrid,
  List,
  Search,
} from "lucide-react";
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

type Stage =
  | "PROSPECTING"
  | "QUALIFICATION"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "CLOSED_WON"
  | "CLOSED_LOST";

interface Opportunity {
  id: string;
  title: string;
  account: string;
  value: number;
  probability: number;
  stage: Stage;
  owner: string;
  expectedClose: string;
  createdAt: string;
}

const STAGE_COLORS: Record<Stage, string> = {
  PROSPECTING: "bg-gray-100 text-gray-700",
  QUALIFICATION: "bg-blue-100 text-blue-800",
  PROPOSAL: "bg-yellow-100 text-yellow-800",
  NEGOTIATION: "bg-orange-100 text-orange-800",
  CLOSED_WON: "bg-green-100 text-green-800",
  CLOSED_LOST: "bg-red-100 text-red-800",
};

const STAGE_HEADER_COLORS: Record<Stage, string> = {
  PROSPECTING: "bg-gray-200 text-gray-700",
  QUALIFICATION: "bg-blue-200 text-blue-800",
  PROPOSAL: "bg-yellow-200 text-yellow-800",
  NEGOTIATION: "bg-orange-200 text-orange-800",
  CLOSED_WON: "bg-green-200 text-green-800",
  CLOSED_LOST: "bg-red-200 text-red-800",
};

const STAGES: Stage[] = [
  "PROSPECTING",
  "QUALIFICATION",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
];

const INITIAL_OPPORTUNITIES: Opportunity[] = [
  {
    id: "OPP-001",
    title: "Enterprise CRM Rollout",
    account: "TechCorp Solutions",
    value: 185000,
    probability: 75,
    stage: "NEGOTIATION",
    owner: "Marcus Williams",
    expectedClose: "2026-04-15",
    createdAt: "2026-02-10",
  },
  {
    id: "OPP-002",
    title: "Cloud Migration Project",
    account: "Global Retail Inc.",
    value: 320000,
    probability: 60,
    stage: "PROPOSAL",
    owner: "Sarah Johnson",
    expectedClose: "2026-04-30",
    createdAt: "2026-02-14",
  },
  {
    id: "OPP-003",
    title: "ERP Implementation",
    account: "Nexus Finance",
    value: 540000,
    probability: 90,
    stage: "CLOSED_WON",
    owner: "Marcus Williams",
    expectedClose: "2026-03-20",
    createdAt: "2026-01-05",
  },
  {
    id: "OPP-004",
    title: "Security Audit & Compliance",
    account: "HealthPlus Systems",
    value: 78000,
    probability: 30,
    stage: "QUALIFICATION",
    owner: "Emma Davis",
    expectedClose: "2026-05-10",
    createdAt: "2026-03-01",
  },
  {
    id: "OPP-005",
    title: "DevOps Transformation",
    account: "CloudBuild Technologies",
    value: 95000,
    probability: 20,
    stage: "PROSPECTING",
    owner: "Sarah Johnson",
    expectedClose: "2026-06-01",
    createdAt: "2026-03-15",
  },
  {
    id: "OPP-006",
    title: "Data Analytics Platform",
    account: "Manufactura Group",
    value: 210000,
    probability: 50,
    stage: "PROPOSAL",
    owner: "Emma Davis",
    expectedClose: "2026-05-20",
    createdAt: "2026-02-28",
  },
  {
    id: "OPP-007",
    title: "Logistics Optimization Suite",
    account: "LogisticsPro",
    value: 145000,
    probability: 5,
    stage: "CLOSED_LOST",
    owner: "Marcus Williams",
    expectedClose: "2026-03-01",
    createdAt: "2026-01-20",
  },
  {
    id: "OPP-008",
    title: "AI Model Training Infrastructure",
    account: "Quantum Data AI",
    value: 430000,
    probability: 70,
    stage: "NEGOTIATION",
    owner: "Sarah Johnson",
    expectedClose: "2026-04-25",
    createdAt: "2026-02-20",
  },
];

function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[stage]}`}
    >
      {stage.replace("_", " ")}
    </span>
  );
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] =
    useState<Opportunity[]>(INITIAL_OPPORTUNITIES);
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    account: "",
    value: "",
    probability: "50",
    stage: "PROSPECTING" as Stage,
    owner: "",
    expectedClose: "",
  });

  const filtered = opportunities.filter(
    (o) =>
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      o.account.toLowerCase().includes(search.toLowerCase())
  );

  const totalPipeline = opportunities
    .filter((o) => o.stage !== "CLOSED_LOST")
    .reduce((sum, o) => sum + o.value, 0);
  const wonThisMonth = opportunities
    .filter((o) => o.stage === "CLOSED_WON" && o.expectedClose >= "2026-03-01")
    .reduce((sum, o) => sum + o.value, 0);
  const winRate =
    opportunities.filter(
      (o) => o.stage === "CLOSED_WON" || o.stage === "CLOSED_LOST"
    ).length > 0
      ? (
          (opportunities.filter((o) => o.stage === "CLOSED_WON").length /
            opportunities.filter(
              (o) => o.stage === "CLOSED_WON" || o.stage === "CLOSED_LOST"
            ).length) *
          100
        ).toFixed(0)
      : "0";
  const avgDealSize =
    opportunities.length > 0
      ? Math.round(
          opportunities.reduce((sum, o) => sum + o.value, 0) /
            opportunities.length
        )
      : 0;

  function handleAdd() {
    if (!form.title || !form.account) return;
    const newOpp: Opportunity = {
      id: `OPP-${String(opportunities.length + 1).padStart(3, "0")}`,
      title: form.title,
      account: form.account,
      value: parseFloat(form.value) || 0,
      probability: parseInt(form.probability) || 50,
      stage: form.stage,
      owner: form.owner || "Unassigned",
      expectedClose: form.expectedClose || new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString().split("T")[0],
    };
    setOpportunities((prev) => [newOpp, ...prev]);
    setForm({
      title: "",
      account: "",
      value: "",
      probability: "50",
      stage: "PROSPECTING",
      owner: "",
      expectedClose: "",
    });
    setOpen(false);
  }

  const columns: Column<Record<string, unknown>>[] = [
    { key: "id", label: "ID", className: "w-24" },
    { key: "title", label: "Title" },
    { key: "account", label: "Account" },
    {
      key: "value",
      label: "Value",
      render: (v) => (
        <span className="font-medium">${(v as number).toLocaleString()}</span>
      ),
    },
    {
      key: "probability",
      label: "Probability",
      render: (v) => (
        <div className="flex items-center gap-2">
          <div className="w-16 bg-gray-200 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-blue-500"
              style={{ width: `${v as number}%` }}
            />
          </div>
          <span className="text-xs">{v as number}%</span>
        </div>
      ),
    },
    {
      key: "stage",
      label: "Stage",
      render: (v) => <StageBadge stage={v as Stage} />,
    },
    { key: "owner", label: "Owner" },
    { key: "expectedClose", label: "Expected Close" },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Opportunities"
        description="Manage your sales pipeline and track deal progress"
      >
        <div className="flex items-center gap-2">
          <Button
            variant={view === "kanban" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("kanban")}
            className="gap-1.5"
          >
            <LayoutGrid className="w-4 h-4" /> Kanban
          </Button>
          <Button
            variant={view === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("table")}
            className="gap-1.5"
          >
            <List className="w-4 h-4" /> Table
          </Button>
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Opportunity
          </Button>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Pipeline Value"
          value={`$${(totalPipeline / 1000).toFixed(0)}K`}
          subtitle="Excluding closed lost"
          icon={<DollarSign className="w-5 h-5" />}
          trend={{ value: 12, label: "vs last month" }}
        />
        <StatsCard
          title="Won This Month"
          value={`$${(wonThisMonth / 1000).toFixed(0)}K`}
          subtitle="March 2026"
          icon={<Award className="w-5 h-5" />}
          trend={{ value: 8, label: "vs last month" }}
        />
        <StatsCard
          title="Win Rate"
          value={`${winRate}%`}
          subtitle="Closed won / total closed"
          icon={<TrendingUp className="w-5 h-5" />}
          trend={{ value: 3, label: "vs last month" }}
        />
        <StatsCard
          title="Avg Deal Size"
          value={`$${(avgDealSize / 1000).toFixed(0)}K`}
          subtitle="Across all opportunities"
          icon={<BarChart2 className="w-5 h-5" />}
        />
      </div>

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          className="pl-9"
          placeholder="Search opportunities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Kanban View */}
      {view === "kanban" && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {STAGES.map((stage) => {
              const cards = filtered.filter((o) => o.stage === stage);
              const stageTotal = cards.reduce((s, o) => s + o.value, 0);
              return (
                <div key={stage} className="w-64 flex-shrink-0">
                  <div
                    className={`rounded-t-lg px-3 py-2 flex items-center justify-between ${STAGE_HEADER_COLORS[stage]}`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wide">
                      {stage.replace("_", " ")}
                    </span>
                    <span className="text-xs font-semibold">
                      {cards.length} · ${(stageTotal / 1000).toFixed(0)}K
                    </span>
                  </div>
                  <div className="rounded-b-lg border border-t-0 border-gray-200 bg-gray-50 min-h-40 space-y-2 p-2">
                    {cards.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">
                        No opportunities
                      </p>
                    )}
                    {cards.map((opp) => (
                      <div
                        key={opp.id}
                        className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <p className="text-sm font-semibold text-gray-900 leading-tight">
                          {opp.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {opp.account}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-900">
                            ${opp.value.toLocaleString()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {opp.probability}%
                          </span>
                        </div>
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                          <div
                            className="h-1 rounded-full bg-blue-500"
                            style={{ width: `${opp.probability}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          Close: {opp.expectedClose}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {opp.owner}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table View */}
      {view === "table" && (
        <DataTable
          columns={columns}
          data={filtered as unknown as Record<string, unknown>[]}
          emptyMessage="No opportunities found."
        />
      )}

      {/* Add New Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Opportunity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Opportunity Title *</Label>
              <Input
                placeholder="e.g. Enterprise Software License"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Account *</Label>
              <Input
                placeholder="Company name"
                value={form.account}
                onChange={(e) => setForm({ ...form, account: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Value ($)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Probability (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="50"
                  value={form.probability}
                  onChange={(e) =>
                    setForm({ ...form, probability: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select
                value={form.stage}
                onValueChange={(v) => setForm({ ...form, stage: v as Stage })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Input
                placeholder="Sales rep name"
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Expected Close Date</Label>
              <Input
                type="date"
                value={form.expectedClose}
                onChange={(e) =>
                  setForm({ ...form, expectedClose: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>Add Opportunity</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
