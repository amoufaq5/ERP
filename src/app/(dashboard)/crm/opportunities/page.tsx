"use client";

import { useState } from "react";
import {
  DollarSign,
  Plus,
  Target,
  TrendingUp,
  Download,
  Eye,
  LayoutGrid,
  List,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import {
  EntityFormModal,
  type EntityField,
} from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { downloadCSV } from "@/lib/download";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { useApiDataStore } from "@/lib/api/use-api-store";
import { type CRMOpportunity, type OpportunityStage } from "@/lib/data-store";
import { useCurrentUser } from "@/lib/user-context";
import { useAuditLogger } from "@/lib/audit-logger";
import { useNotificationCenter } from "@/lib/notification-context";

type Opportunity = CRMOpportunity;
type Stage = OpportunityStage;

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGES: Stage[] = ["PROSPECTING", "QUALIFICATION", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"];

const STAGE_LABELS: Record<Stage, string> = {
  PROSPECTING: "Prospecting", QUALIFICATION: "Qualification", PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation", CLOSED_WON: "Closed Won", CLOSED_LOST: "Closed Lost",
};

const STAGE_COLORS: Record<Stage, string> = {
  PROSPECTING: "bg-gray-100 text-gray-700", QUALIFICATION: "bg-blue-100 text-blue-800",
  PROPOSAL: "bg-amber-100 text-amber-800", NEGOTIATION: "bg-orange-100 text-orange-800",
  CLOSED_WON: "bg-green-100 text-green-800", CLOSED_LOST: "bg-red-100 text-red-800",
};

const STAGE_HEADER_COLORS: Record<Stage, string> = {
  PROSPECTING: "bg-gray-200 text-gray-700", QUALIFICATION: "bg-blue-200 text-blue-800",
  PROPOSAL: "bg-amber-200 text-amber-800", NEGOTIATION: "bg-orange-200 text-orange-800",
  CLOSED_WON: "bg-green-200 text-green-800", CLOSED_LOST: "bg-red-200 text-red-800",
};

const STAGE_DOT_COLORS: Record<Stage, string> = {
  PROSPECTING: "bg-gray-500", QUALIFICATION: "bg-blue-500", PROPOSAL: "bg-amber-500",
  NEGOTIATION: "bg-orange-500", CLOSED_WON: "bg-green-500", CLOSED_LOST: "bg-red-500",
};

const STAGE_FLOW: Partial<Record<Stage, Stage>> = {
  PROSPECTING: "QUALIFICATION", QUALIFICATION: "PROPOSAL",
  PROPOSAL: "NEGOTIATION", NEGOTIATION: "CLOSED_WON",
};

const ACCOUNTS = [
  "TechCorp Solutions", "Global Retail Inc.", "Nexus Finance", "HealthPlus Systems",
  "CloudBuild Technologies", "Manufactura Group", "LogisticsPro", "Quantum Data AI",
];

// ── Form & Filter Config ──────────────────────────────────────────────────────

const OPP_FIELDS: EntityField[] = [
  { name: "title", label: "Opportunity Title", type: "text", placeholder: "e.g. Enterprise Software License", required: true, fullWidth: true },
  { name: "account", label: "Account", type: "select", required: true, options: ACCOUNTS.map((a) => ({ label: a, value: a })) },
  { name: "value", label: "Value (EGP)", type: "number", placeholder: "0" },
  { name: "probability", label: "Probability (%)", type: "number", placeholder: "50" },
  { name: "stage", label: "Stage", type: "select", defaultValue: "PROSPECTING", options: STAGES.map((s) => ({ label: STAGE_LABELS[s], value: s })) },
  { name: "owner", label: "Owner", type: "text", placeholder: "Sales rep name" },
  { name: "expectedClose", label: "Expected Close Date", type: "text", placeholder: "YYYY-MM-DD" },
];

const FILTER_FIELDS = [
  { key: "stage", label: "Stage", type: "select" as const, options: STAGES.map((s) => ({ label: STAGE_LABELS[s], value: s })) },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[stage]}`}>
      {STAGE_LABELS[stage]}
    </span>
  );
}

const fmtCurrency = (v: number) => `EGP ${v.toLocaleString()}`;
const fmtK = (v: number) => `EGP ${(v / 1000).toFixed(0)}K`;

// ── Main Page Component ───────────────────────────────────────────────────────

export default function OpportunitiesPage() {
  const store = useApiDataStore();
  const { user } = useCurrentUser();
  const { logAction } = useAuditLogger();
  const { addNotification } = useNotificationCenter();
  const opportunities = store.crmOpportunities as Opportunity[];
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [filters, setFilters] = useState<FilterState>({ _search: "", stage: "" });
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  const [detailOpp, setDetailOpp] = useState<Opportunity | null>(null);

  // ── Filtered data ───────────────────────────────────────────────────────────
  const filtered = opportunities.filter((o) => {
    const q = (filters._search || "").toLowerCase();
    const matchesSearch = !q || o.title.toLowerCase().includes(q) || o.account.toLowerCase().includes(q);
    const matchesStage = !filters.stage || o.stage === filters.stage;
    return matchesSearch && matchesStage;
  });

  // ── Stats ───────────────────────────────────────────────────────────────────
  const openDeals = opportunities.filter((o) => o.stage !== "CLOSED_WON" && o.stage !== "CLOSED_LOST");
  const totalPipelineValue = openDeals.reduce((s, o) => s + o.value, 0);
  const closedDeals = opportunities.filter((o) => o.stage === "CLOSED_WON" || o.stage === "CLOSED_LOST");
  const wonDeals = opportunities.filter((o) => o.stage === "CLOSED_WON");
  const winRate = closedDeals.length > 0 ? Math.round((wonDeals.length / closedDeals.length) * 100) : 0;
  const avgDealSize = opportunities.length > 0
    ? Math.round(opportunities.reduce((s, o) => s + o.value, 0) / opportunities.length)
    : 0;

  // ── Pipeline Funnel Metrics ─────────────────────────────────────────────────
  const funnelMetrics = STAGES.map((stage) => {
    const stageOpps = opportunities.filter((o) => o.stage === stage);
    return { stage, label: STAGE_LABELS[stage], count: stageOpps.length, value: stageOpps.reduce((s, o) => s + o.value, 0), dotColor: STAGE_DOT_COLORS[stage] };
  });

  // ── CRUD Handlers ───────────────────────────────────────────────────────────
  const handleCreate = () => { setEditingOpp(null); setShowFormModal(true); };

  const handleEdit = (opp: Opportunity) => { setEditingOpp(opp); setShowFormModal(true); };

  const handleDelete = (id: string) => {
    const opp = opportunities.find((o) => o.id === id);
    store.remove("crmOpportunities", id);
    logAction({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "DELETE",
      module: "CRM",
      entity: "Opportunity",
      entityId: id,
      entityName: opp?.title ?? id,
      details: `Deleted opportunity ${opp?.title ?? id}`,
    });
  };

  const handleAdvanceStage = (opp: Opportunity) => {
    const next = STAGE_FLOW[opp.stage as Stage];
    if (!next) return;
    store.update("crmOpportunities", opp.id, { stage: next });
    logAction({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "UPDATE",
      module: "CRM",
      entity: "Opportunity",
      entityId: opp.id,
      entityName: opp.title,
      details: `Advanced opportunity ${opp.title} from ${STAGE_LABELS[opp.stage]} to ${STAGE_LABELS[next]}`,
    });
    if (next === "CLOSED_WON") {
      addNotification({
        type: "SUCCESS",
        title: "Opportunity Won",
        message: `${opp.title} marked as won - EGP ${opp.value.toLocaleString()}`,
        module: "CRM",
        entityType: "Opportunity",
        entityId: opp.id,
        actionUrl: "/crm/opportunities",
      });
    }
  };

  const handleMarkLost = (opp: Opportunity) => {
    store.update("crmOpportunities", opp.id, { stage: "CLOSED_LOST" });
    logAction({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "UPDATE",
      module: "CRM",
      entity: "Opportunity",
      entityId: opp.id,
      entityName: opp.title,
      details: `Marked opportunity ${opp.title} as lost`,
    });
    addNotification({
      type: "WARNING",
      title: "Opportunity Lost",
      message: `${opp.title} has been marked as lost - EGP ${opp.value.toLocaleString()}`,
      module: "CRM",
      entityType: "Opportunity",
      entityId: opp.id,
      actionUrl: "/crm/opportunities",
    });
  };

  const handleFormSubmit = (data: Record<string, unknown>) => {
    if (editingOpp) {
      store.update("crmOpportunities", editingOpp.id, {
        title: data.title as string, account: (data.account as string) || editingOpp.account,
        value: (data.value as number) || editingOpp.value, probability: (data.probability as number) ?? editingOpp.probability,
        stage: (data.stage as Stage) || editingOpp.stage, owner: (data.owner as string) || editingOpp.owner,
        expectedClose: (data.expectedClose as string) || editingOpp.expectedClose,
      });
      logAction({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: "UPDATE",
        module: "CRM",
        entity: "Opportunity",
        entityId: editingOpp.id,
        entityName: editingOpp.title,
        details: `Updated opportunity ${editingOpp.title}`,
      });
    } else {
      const newId = store.genId("opp");
      const title = data.title as string;
      store.add("crmOpportunities", {
        id: newId,
        title, account: (data.account as string) || "",
        value: (data.value as number) || 0, probability: (data.probability as number) ?? 50,
        stage: (data.stage as Stage) || "PROSPECTING", owner: (data.owner as string) || "Unassigned",
        expectedClose: (data.expectedClose as string) || new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString().split("T")[0],
      });
      logAction({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: "CREATE",
        module: "CRM",
        entity: "Opportunity",
        entityId: newId,
        entityName: title,
        details: `Created opportunity ${title}`,
      });
      addNotification({
        type: "INFO",
        title: "New Opportunity Created",
        message: `${title} - EGP ${((data.value as number) || 0).toLocaleString()} added to pipeline`,
        module: "CRM",
        entityType: "Opportunity",
        entityId: newId,
        actionUrl: "/crm/opportunities",
      });
    }
    setShowFormModal(false);
    setEditingOpp(null);
  };

  const handleExport = () => {
    const csvCols = [
      { key: "id" as const, label: "ID" }, { key: "title" as const, label: "Title" },
      { key: "account" as const, label: "Account" }, { key: "value" as const, label: "Value" },
      { key: "probability" as const, label: "Probability" }, { key: "stage" as const, label: "Stage" },
      { key: "owner" as const, label: "Owner" }, { key: "expectedClose" as const, label: "Expected Close" },
    ];
    downloadCSV("opportunities.csv", filtered as unknown as Record<string, unknown>[], csvCols);
  };

  // ── Action Menu Builder ─────────────────────────────────────────────────────
  const buildMenuItems = (opp: Opportunity) => {
    const next = STAGE_FLOW[opp.stage as Stage];
    return [
      ...(next ? [{ label: `Advance to ${STAGE_LABELS[next]}`, onClick: () => handleAdvanceStage(opp) }] : []),
      ...(opp.stage !== "CLOSED_WON" && opp.stage !== "CLOSED_LOST"
        ? [{ label: "Mark Lost", onClick: () => handleMarkLost(opp) }] : []),
    ];
  };

  // ── Table Columns ───────────────────────────────────────────────────────────
  const tableColumns: Column<Record<string, unknown>>[] = [
    { key: "title", label: "Title", render: (v) => <span className="font-medium text-foreground">{v as string}</span> },
    { key: "account", label: "Account" },
    { key: "value", label: "Value", render: (v) => <span className="font-medium">{fmtCurrency((v as number) ?? 0)}</span> },
    { key: "probability", label: "Probability", render: (v) => (
      <div className="flex items-center gap-2">
        <div className="w-16 bg-muted rounded-full h-1.5">
          <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${v as number}%` }} />
        </div>
        <span className="text-xs">{v as number}%</span>
      </div>
    ) },
    { key: "stage", label: "Stage", render: (v) => <StageBadge stage={v as Stage} /> },
    { key: "owner", label: "Owner" },
    { key: "expectedClose", label: "Expected Close" },
    { key: "id", label: "", render: (_v, row) => {
      const opp = opportunities.find((x) => x.id === row.id);
      if (!opp) return null;
      return (
        <EditDeleteMenu onEdit={() => handleEdit(opp)} onDelete={() => handleDelete(opp.id)}
          onView={() => setDetailOpp(opp)} canView itemLabel={opp.title} extraItems={buildMenuItems(opp)} />
      );
    } },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <PageHeader title="Opportunities Pipeline" description="Track and manage sales opportunities across pipeline stages">
        <div className="flex items-center gap-2">
          <Button variant={viewMode === "kanban" ? "default" : "outline"} size="sm" onClick={() => setViewMode("kanban")} className="gap-1.5">
            <LayoutGrid className="w-4 h-4" /> Kanban
          </Button>
          <Button variant={viewMode === "table" ? "default" : "outline"} size="sm" onClick={() => setViewMode("table")} className="gap-1.5">
            <List className="w-4 h-4" /> Table
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Add Opportunity
          </Button>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Pipeline Value" value={fmtK(totalPipelineValue)} subtitle="Open deals only" icon={DollarSign} />
        <StatsCard title="Open Deals" value={String(openDeals.length)} subtitle={`${opportunities.length} total opportunities`} icon={Target} />
        <StatsCard title="Win Rate" value={`${winRate}%`} subtitle={`${wonDeals.length} won of ${closedDeals.length} closed`} icon={TrendingUp} />
        <StatsCard title="Avg Deal Size" value={fmtK(avgDealSize)} subtitle="Across all opportunities" icon={DollarSign} />
      </div>

      {/* Pipeline Funnel Summary */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Pipeline Funnel</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {funnelMetrics.map((m) => (
            <div key={m.stage} className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className={`w-2 h-2 rounded-full ${m.dotColor}`} />
                <span className="text-xs font-medium text-muted-foreground">{m.label}</span>
              </div>
              <p className="text-lg font-bold text-foreground">{m.count}</p>
              <p className="text-xs text-muted-foreground">{fmtK(m.value)}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Filters */}
      <FilterBar searchValue={filters._search} onSearchChange={(v) => setFilters((f) => ({ ...f, _search: v }))}
        fields={FILTER_FIELDS} values={filters} onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))} />

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {STAGES.map((stage) => {
              const cards = filtered.filter((o) => o.stage === stage);
              const stageTotal = cards.reduce((s, o) => s + o.value, 0);
              return (
                <div key={stage} className="w-64 flex-shrink-0">
                  <div className={`rounded-t-lg px-3 py-2 flex items-center justify-between ${STAGE_HEADER_COLORS[stage]}`}>
                    <span className="text-xs font-bold uppercase tracking-wide">{STAGE_LABELS[stage]}</span>
                    <span className="text-xs font-semibold">{cards.length} &middot; {fmtK(stageTotal)}</span>
                  </div>
                  <div className="rounded-b-lg border border-t-0 border-border bg-muted/50 min-h-[10rem] space-y-2 p-2">
                    {cards.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">No opportunities</p>
                    )}
                    {cards.map((opp) => {
                      const nextStage = STAGE_FLOW[opp.stage as Stage];
                      return (
                        <div key={opp.id} className="bg-card rounded-lg border border-border p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => setDetailOpp(opp)}>
                          <div className="flex items-start justify-between">
                            <p className="text-sm font-semibold text-foreground leading-tight pr-2">{opp.title}</p>
                            <div onClick={(e) => e.stopPropagation()}>
                              <EditDeleteMenu onEdit={() => handleEdit(opp)} onDelete={() => handleDelete(opp.id)}
                                onView={() => setDetailOpp(opp)} canView itemLabel={opp.title} extraItems={buildMenuItems(opp)} />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{opp.account}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-sm font-bold text-foreground">{fmtCurrency(opp.value)}</span>
                            <Badge variant="secondary" className="text-[10px]">{opp.probability}%</Badge>
                          </div>
                          <div className="mt-2 w-full bg-muted rounded-full h-1">
                            <div className="h-1 rounded-full bg-blue-500" style={{ width: `${opp.probability}%` }} />
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span>{opp.owner}</span>
                            <span>{opp.expectedClose}</span>
                          </div>
                          {nextStage && (
                            <Button variant="ghost" size="sm" className="w-full mt-2 h-7 text-xs gap-1"
                              onClick={(e) => { e.stopPropagation(); handleAdvanceStage(opp); }}>
                              <ArrowRight className="w-3 h-3" /> Move to {STAGE_LABELS[nextStage]}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <DataTable columns={tableColumns} data={filtered as unknown as Record<string, unknown>[]}
            emptyMessage="No opportunities found." exportable exportFilename="opportunities.csv" />
        </div>
      )}

      {/* Create / Edit Form Modal */}
      <EntityFormModal open={showFormModal} onOpenChange={(open) => { setShowFormModal(open); if (!open) setEditingOpp(null); }}
        title={editingOpp ? "Edit Opportunity" : "Add New Opportunity"} fields={OPP_FIELDS}
        initialData={editingOpp ? {
          title: editingOpp.title, account: editingOpp.account, value: editingOpp.value,
          probability: editingOpp.probability, stage: editingOpp.stage, owner: editingOpp.owner,
          expectedClose: editingOpp.expectedClose,
        } : undefined}
        onSubmit={handleFormSubmit} />

      {/* Detail Dialog */}
      <Dialog open={!!detailOpp} onOpenChange={(open) => { if (!open) setDetailOpp(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" /> {detailOpp?.title}
            </DialogTitle>
          </DialogHeader>
          {detailOpp && (() => {
            const stageIndex = STAGES.indexOf(detailOpp.stage);
            const weightedValue = Math.round((detailOpp.value * detailOpp.probability) / 100);
            const nextStage = STAGE_FLOW[detailOpp.stage];
            return (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-sm text-muted-foreground">Account</span><p className="font-medium">{detailOpp.account}</p></div>
                  <div><span className="text-sm text-muted-foreground">Owner</span><p className="font-medium">{detailOpp.owner}</p></div>
                  <div><span className="text-sm text-muted-foreground">Value</span><p className="font-medium">{fmtCurrency(detailOpp.value)}</p></div>
                  <div><span className="text-sm text-muted-foreground">Probability</span><p className="font-medium">{detailOpp.probability}%</p></div>
                  <div><span className="text-sm text-muted-foreground">Stage</span><p><StageBadge stage={detailOpp.stage} /></p></div>
                  <div><span className="text-sm text-muted-foreground">Expected Close</span><p className="font-medium">{detailOpp.expectedClose}</p></div>
                  <div><span className="text-sm text-muted-foreground">Weighted Value</span><p className="font-medium">{fmtCurrency(weightedValue)}</p></div>
                  <div><span className="text-sm text-muted-foreground">Created</span><p className="font-medium">{detailOpp.createdAt}</p></div>
                </div>

                {/* Probability Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Win Probability</span>
                    <span className="font-medium">{detailOpp.probability}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${detailOpp.probability}%` }} />
                  </div>
                </div>

                {/* Stage Progress Visualization */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Stage Progress</h4>
                  <div className="flex items-center gap-1">
                    {STAGES.map((stage, i) => {
                      const isReached = i <= stageIndex;
                      const isCurrent = i === stageIndex;
                      return (
                        <div key={stage} className="flex items-center gap-1 flex-1">
                          <div className="flex flex-col items-center flex-1">
                            <div className={`h-3 w-3 rounded-full border-2 ${
                              isCurrent ? "bg-primary border-primary" : isReached ? "bg-primary/60 border-primary/60" : "bg-muted border-muted-foreground/30"
                            }`} />
                            <span className={`text-[10px] mt-1 text-center leading-tight ${
                              isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"
                            }`}>{STAGE_LABELS[stage]}</span>
                          </div>
                          {i < STAGES.length - 1 && (
                            <div className={`h-0.5 flex-1 -mt-4 ${i < stageIndex ? "bg-primary/60" : "bg-muted"}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Actions */}
                {nextStage && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button className="gap-2" onClick={() => {
                      handleAdvanceStage(detailOpp);
                      setDetailOpp((prev) => prev ? { ...prev, stage: nextStage } : null);
                    }}>
                      <ArrowRight className="w-4 h-4" /> Advance to {STAGE_LABELS[nextStage]}
                    </Button>
                    {detailOpp.stage !== "CLOSED_WON" && detailOpp.stage !== "CLOSED_LOST" && (
                      <Button variant="destructive" onClick={() => {
                        handleMarkLost(detailOpp);
                        setDetailOpp((prev) => prev ? { ...prev, stage: "CLOSED_LOST" } : null);
                      }}>
                        Mark Lost
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
