"use client";

import { useState } from "react";
import { DollarSign, TrendingUp, Award, BarChart2, Plus, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { useDataStore } from "@/lib/data-store";

type Stage = "PROSPECTING" | "QUALIFICATION" | "PROPOSAL" | "NEGOTIATION" | "CLOSED_WON" | "CLOSED_LOST";

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
  PROSPECTING: "bg-gray-100 text-gray-700", QUALIFICATION: "bg-blue-100 text-blue-800",
  PROPOSAL: "bg-yellow-100 text-yellow-800", NEGOTIATION: "bg-orange-100 text-orange-800",
  CLOSED_WON: "bg-green-100 text-green-800", CLOSED_LOST: "bg-red-100 text-red-800",
};

const STAGE_HEADER_COLORS: Record<Stage, string> = {
  PROSPECTING: "bg-gray-200 text-gray-700", QUALIFICATION: "bg-blue-200 text-blue-800",
  PROPOSAL: "bg-yellow-200 text-yellow-800", NEGOTIATION: "bg-orange-200 text-orange-800",
  CLOSED_WON: "bg-green-200 text-green-800", CLOSED_LOST: "bg-red-200 text-red-800",
};

const STAGES: Stage[] = ["PROSPECTING", "QUALIFICATION", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"];

const INITIAL_OPPORTUNITIES: Opportunity[] = [
  { id: "OPP-001", title: "Enterprise CRM Rollout", account: "TechCorp Solutions", value: 185000, probability: 75, stage: "NEGOTIATION", owner: "Marcus Williams", expectedClose: "2026-04-15", createdAt: "2026-02-10" },
  { id: "OPP-002", title: "Cloud Migration Project", account: "Global Retail Inc.", value: 320000, probability: 60, stage: "PROPOSAL", owner: "Sarah Johnson", expectedClose: "2026-04-30", createdAt: "2026-02-14" },
  { id: "OPP-003", title: "ERP Implementation", account: "Nexus Finance", value: 540000, probability: 90, stage: "CLOSED_WON", owner: "Marcus Williams", expectedClose: "2026-03-20", createdAt: "2026-01-05" },
  { id: "OPP-004", title: "Security Audit & Compliance", account: "HealthPlus Systems", value: 78000, probability: 30, stage: "QUALIFICATION", owner: "Emma Davis", expectedClose: "2026-05-10", createdAt: "2026-03-01" },
  { id: "OPP-005", title: "DevOps Transformation", account: "CloudBuild Technologies", value: 95000, probability: 20, stage: "PROSPECTING", owner: "Sarah Johnson", expectedClose: "2026-06-01", createdAt: "2026-03-15" },
  { id: "OPP-006", title: "Data Analytics Platform", account: "Manufactura Group", value: 210000, probability: 50, stage: "PROPOSAL", owner: "Emma Davis", expectedClose: "2026-05-20", createdAt: "2026-02-28" },
  { id: "OPP-007", title: "Logistics Optimization Suite", account: "LogisticsPro", value: 145000, probability: 5, stage: "CLOSED_LOST", owner: "Marcus Williams", expectedClose: "2026-03-01", createdAt: "2026-01-20" },
  { id: "OPP-008", title: "AI Model Training Infrastructure", account: "Quantum Data AI", value: 430000, probability: 70, stage: "NEGOTIATION", owner: "Sarah Johnson", expectedClose: "2026-04-25", createdAt: "2026-02-20" },
];

const OPP_FIELDS: EntityField[] = [
  { name: "title", label: "Opportunity Title", type: "text", placeholder: "e.g. Enterprise Software License", required: true, fullWidth: true },
  { name: "account", label: "Account", type: "text", placeholder: "Company name", required: true },
  { name: "value", label: "Value (EGP)", type: "number", placeholder: "0" },
  { name: "probability", label: "Probability (%)", type: "number", placeholder: "50", min: 0, max: 100 },
  { name: "stage", label: "Stage", type: "select", defaultValue: "PROSPECTING", options: STAGES.map((s) => ({ label: s.replace(/_/g, " "), value: s })) },
  { name: "owner", label: "Owner", type: "text", placeholder: "Sales rep name" },
  { name: "expectedClose", label: "Expected Close Date", type: "text", placeholder: "YYYY-MM-DD" },
];

const FILTER_FIELDS = [
  { key: "stage", label: "Stage", type: "select" as const, options: STAGES.map((s) => ({ label: s.replace(/_/g, " "), value: s })) },
];

function StageBadge({ stage }: { stage: Stage }) {
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[stage]}`}>{stage.replace(/_/g, " ")}</span>;
}

export default function OpportunitiesPage() {
  const store = useDataStore();
  const [opportunities, setOpportunities] = useState<Opportunity[]>(INITIAL_OPPORTUNITIES);
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [filters, setFilters] = useState<FilterState>({ _search: "", stage: "" });
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [detailOpp, setDetailOpp] = useState<Opportunity | null>(null);

  const filtered = opportunities.filter((o) => {
    const q = (filters._search || "").toLowerCase();
    const matchesSearch = !q || o.title.toLowerCase().includes(q) || o.account.toLowerCase().includes(q);
    const matchesStage = !filters.stage || o.stage === filters.stage;
    return matchesSearch && matchesStage;
  });

  const totalPipeline = opportunities.filter((o) => o.stage !== "CLOSED_LOST").reduce((sum, o) => sum + o.value, 0);
  const wonThisMonth = opportunities.filter((o) => o.stage === "CLOSED_WON" && o.expectedClose >= "2026-03-01").reduce((sum, o) => sum + o.value, 0);
  const closedOps = opportunities.filter((o) => o.stage === "CLOSED_WON" || o.stage === "CLOSED_LOST");
  const winRate = closedOps.length > 0 ? ((opportunities.filter((o) => o.stage === "CLOSED_WON").length / closedOps.length) * 100).toFixed(0) : "0";
  const avgDealSize = opportunities.length > 0 ? Math.round(opportunities.reduce((sum, o) => sum + o.value, 0) / opportunities.length) : 0;

  const stageFlow: Record<string, Stage> = {
    PROSPECTING: "QUALIFICATION", QUALIFICATION: "PROPOSAL", PROPOSAL: "NEGOTIATION", NEGOTIATION: "CLOSED_WON",
  };

  const columns: Column<Record<string, unknown>>[] = [
    { key: "id", label: "ID", className: "w-24" },
    { key: "title", label: "Title" },
    { key: "account", label: "Account" },
    { key: "value", label: "Value", render: (v) => <span className="font-medium">EGP {(v as number).toLocaleString()}</span> },
    {
      key: "probability", label: "Probability",
      render: (v) => (
        <div className="flex items-center gap-2">
          <div className="w-16 bg-muted rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${v as number}%` }} />
          </div>
          <span className="text-xs">{v as number}%</span>
        </div>
      ),
    },
    { key: "stage", label: "Stage", render: (v) => <StageBadge stage={v as Stage} /> },
    { key: "owner", label: "Owner" },
    { key: "expectedClose", label: "Expected Close" },
    {
      key: "id", label: "",
      render: (_v, row) => {
        const o = opportunities.find((x) => x.id === row.id);
        if (!o) return null;
        const next = stageFlow[o.stage];
        return (
          <EditDeleteMenu
            onEdit={() => { setEditing(o); setShowModal(true); }}
            onDelete={() => setOpportunities((prev) => prev.filter((x) => x.id !== o.id))}
            onView={() => setDetailOpp(o)}
            canView
            itemLabel={o.title}
            extraItems={[
              ...(next ? [{ label: `Advance to ${next.replace(/_/g, " ")}`, onClick: () => setOpportunities((prev) => prev.map((x) => x.id === o.id ? { ...x, stage: next } : x)) }] : []),
              ...(o.stage !== "CLOSED_WON" && o.stage !== "CLOSED_LOST" ? [{ label: "Mark Lost", onClick: () => setOpportunities((prev) => prev.map((x) => x.id === o.id ? { ...x, stage: "CLOSED_LOST" as Stage } : x)) }] : []),
            ]}
          />
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Opportunities" description="Manage your sales pipeline and track deal progress">
        <div className="flex items-center gap-2">
          <Button variant={view === "kanban" ? "default" : "outline"} size="sm" onClick={() => setView("kanban")} className="gap-1.5">
            <LayoutGrid className="w-4 h-4" /> Kanban
          </Button>
          <Button variant={view === "table" ? "default" : "outline"} size="sm" onClick={() => setView("table")} className="gap-1.5">
            <List className="w-4 h-4" /> Table
          </Button>
          <Button onClick={() => { setEditing(null); setShowModal(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Add Opportunity
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Pipeline Value" value={`EGP ${(totalPipeline / 1000).toFixed(0)}K`} subtitle="Excluding closed lost" icon={DollarSign} change={12} changeLabel="vs last month" />
        <StatsCard title="Won This Month" value={`EGP ${(wonThisMonth / 1000).toFixed(0)}K`} subtitle="March 2026" icon={Award} change={8} changeLabel="vs last month" />
        <StatsCard title="Win Rate" value={`${winRate}%`} subtitle="Closed won / total closed" icon={TrendingUp} change={3} changeLabel="vs last month" />
        <StatsCard title="Avg Deal Size" value={`EGP ${(avgDealSize / 1000).toFixed(0)}K`} subtitle="Across all opportunities" icon={BarChart2} />
      </div>

      <FilterBar
        searchValue={filters._search}
        onSearchChange={(v) => setFilters((f) => ({ ...f, _search: v }))}
        fields={FILTER_FIELDS}
        values={filters}
        onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
      />

      {view === "kanban" && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {STAGES.map((stage) => {
              const cards = filtered.filter((o) => o.stage === stage);
              const stageTotal = cards.reduce((s, o) => s + o.value, 0);
              return (
                <div key={stage} className="w-64 flex-shrink-0">
                  <div className={`rounded-t-lg px-3 py-2 flex items-center justify-between ${STAGE_HEADER_COLORS[stage]}`}>
                    <span className="text-xs font-bold uppercase tracking-wide">{stage.replace(/_/g, " ")}</span>
                    <span className="text-xs font-semibold">{cards.length} · EGP {(stageTotal / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="rounded-b-lg border border-t-0 border-border bg-muted/50 min-h-40 space-y-2 p-2">
                    {cards.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No opportunities</p>}
                    {cards.map((opp) => (
                      <div key={opp.id} className="bg-card rounded-lg border border-border p-3 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-semibold text-foreground leading-tight">{opp.title}</p>
                          <EditDeleteMenu
                            onEdit={() => { setEditing(opp); setShowModal(true); }}
                            onDelete={() => setOpportunities((prev) => prev.filter((x) => x.id !== opp.id))}
                            onView={() => setDetailOpp(opp)}
                            canView
                            itemLabel={opp.title}
                            extraItems={(() => {
                              const next = stageFlow[opp.stage];
                              return [
                                ...(next ? [{ label: `Advance to ${next.replace(/_/g, " ")}`, onClick: () => setOpportunities((prev) => prev.map((x) => x.id === opp.id ? { ...x, stage: next } : x)) }] : []),
                                ...(opp.stage !== "CLOSED_WON" && opp.stage !== "CLOSED_LOST" ? [{ label: "Mark Lost", onClick: () => setOpportunities((prev) => prev.map((x) => x.id === opp.id ? { ...x, stage: "CLOSED_LOST" as Stage } : x)) }] : []),
                              ];
                            })()}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{opp.account}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-sm font-bold text-foreground">EGP {opp.value.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground">{opp.probability}%</span>
                        </div>
                        <div className="mt-2 w-full bg-muted rounded-full h-1">
                          <div className="h-1 rounded-full bg-blue-500" style={{ width: `${opp.probability}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Close: {opp.expectedClose}</p>
                        <p className="text-xs text-muted-foreground mt-1">{opp.owner}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "table" && (
        <DataTable columns={columns} data={filtered as unknown as Record<string, unknown>[]} emptyMessage="No opportunities found." exportable exportFilename="opportunities.csv" />
      )}

      <EntityFormModal
        open={showModal}
        onOpenChange={(open) => { if (!open) { setShowModal(false); setEditing(null); } }}
        title={editing ? "Edit Opportunity" : "Add New Opportunity"}
        fields={OPP_FIELDS}
        initialData={editing ? { title: editing.title, account: editing.account, value: editing.value, probability: editing.probability, stage: editing.stage, owner: editing.owner, expectedClose: editing.expectedClose } : undefined}
        onSubmit={(data) => {
          if (editing) {
            setOpportunities((prev) => prev.map((o) => o.id === editing.id ? {
              ...o,
              title: data.title as string,
              account: (data.account as string) || o.account,
              value: (data.value as number) || o.value,
              probability: (data.probability as number) ?? o.probability,
              stage: (data.stage as Stage) || o.stage,
              owner: (data.owner as string) || o.owner,
              expectedClose: (data.expectedClose as string) || o.expectedClose,
            } : o));
          } else {
            const newOpp: Opportunity = {
              id: `OPP-${Date.now().toString(36)}`,
              title: data.title as string,
              account: (data.account as string) || "",
              value: (data.value as number) || 0,
              probability: (data.probability as number) ?? 50,
              stage: (data.stage as Stage) || "PROSPECTING",
              owner: (data.owner as string) || "Unassigned",
              expectedClose: (data.expectedClose as string) || new Date().toISOString().split("T")[0],
              createdAt: new Date().toISOString().split("T")[0],
            };
            setOpportunities((prev) => [newOpp, ...prev]);
          }
          setShowModal(false);
          setEditing(null);
        }}
      />

      {/* ── Opportunity Detail Dialog ── */}
      <Dialog open={!!detailOpp} onOpenChange={(open) => { if (!open) setDetailOpp(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailOpp?.title}</DialogTitle>
          </DialogHeader>
          {detailOpp && (() => {
            const stageIndex = STAGES.indexOf(detailOpp.stage);
            return (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-sm text-muted-foreground">Account</span><p className="font-medium">{detailOpp.account}</p></div>
                  <div><span className="text-sm text-muted-foreground">Owner</span><p className="font-medium">{detailOpp.owner}</p></div>
                  <div><span className="text-sm text-muted-foreground">Value</span><p className="font-medium">EGP {detailOpp.value.toLocaleString()}</p></div>
                  <div><span className="text-sm text-muted-foreground">Probability</span><p className="font-medium">{detailOpp.probability}%</p></div>
                  <div><span className="text-sm text-muted-foreground">Stage</span><p><StageBadge stage={detailOpp.stage} /></p></div>
                  <div><span className="text-sm text-muted-foreground">Expected Close</span><p className="font-medium">{detailOpp.expectedClose}</p></div>
                  <div><span className="text-sm text-muted-foreground">Weighted Value</span><p className="font-medium">EGP {Math.round(detailOpp.value * detailOpp.probability / 100).toLocaleString()}</p></div>
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
                {/* Cross-module: ERP customer data */}
                {(() => {
                  const matchedCustomer = store.customers.find(c => c.name === detailOpp.account);
                  const relatedInvoices = matchedCustomer ? store.invoices.filter(i => i.customerId === matchedCustomer.id) : [];
                  return matchedCustomer ? (
                    <div className="pt-3 border-t">
                      <h4 className="text-sm font-semibold mb-2">ERP Customer Data — {matchedCustomer.name}</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-muted-foreground">Outstanding</span><p className="font-medium">EGP {matchedCustomer.outstanding.toLocaleString()}</p></div>
                        <div><span className="text-muted-foreground">Credit Limit</span><p className="font-medium">EGP {matchedCustomer.creditLimit.toLocaleString()}</p></div>
                        <div><span className="text-muted-foreground">Invoices</span><p className="font-medium">{relatedInvoices.length} ({relatedInvoices.filter(i => i.status === "PAID").length} paid)</p></div>
                        <div><span className="text-muted-foreground">Payment Terms</span><p className="font-medium">{matchedCustomer.paymentTerms}</p></div>
                      </div>
                    </div>
                  ) : null;
                })()}
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
                            <div className={`h-3 w-3 rounded-full border-2 ${isCurrent ? "bg-primary border-primary" : isReached ? "bg-primary/60 border-primary/60" : "bg-muted border-muted-foreground/30"}`} />
                            <span className={`text-[10px] mt-1 text-center leading-tight ${isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{stage.replace(/_/g, " ")}</span>
                          </div>
                          {i < STAGES.length - 1 && <div className={`h-0.5 flex-1 -mt-4 ${i < stageIndex ? "bg-primary/60" : "bg-muted"}`} />}
                        </div>
                      );
                    })}
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
