"use client";

import { useState } from "react";
import { Users, TrendingUp, Star, BarChart2, Plus, DollarSign, Award, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { downloadCSV } from "@/lib/download";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { useDataStore } from "@/lib/data-store";
import { useTranslation } from "@/lib/i18n/i18n-context";

// ── Lead types & data ──────────────────────────────────────────────────────────

type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "CLOSED_WON" | "CLOSED_LOST" | "NURTURING";
type LeadSource = "WEBSITE" | "REFERRAL" | "COLD_CALL" | "EMAIL" | "SOCIAL_MEDIA" | "TRADE_SHOW" | "PARTNER";

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  source: LeadSource;
  score: number;
  status: LeadStatus;
  assignedTo: string;
  value: number;
  createdAt: string;
}

const LEAD_STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-purple-100 text-purple-800",
  QUALIFIED: "bg-green-100 text-green-800",
  PROPOSAL: "bg-yellow-100 text-yellow-800",
  NEGOTIATION: "bg-orange-100 text-orange-800",
  CLOSED_WON: "bg-emerald-100 text-emerald-800",
  CLOSED_LOST: "bg-red-100 text-red-800",
  NURTURING: "bg-gray-100 text-gray-800",
};

const INITIAL_LEADS: Lead[] = [
  { id: "L-001", firstName: "Alexandra", lastName: "Chen", email: "a.chen@techcorp.io", company: "TechCorp Solutions", source: "WEBSITE", score: 88, status: "QUALIFIED", assignedTo: "Marcus Williams", value: 45000, createdAt: "2026-03-01" },
  { id: "L-002", firstName: "James", lastName: "Martinez", email: "j.martinez@globalretail.com", company: "Global Retail Inc.", source: "REFERRAL", score: 72, status: "PROPOSAL", assignedTo: "Sarah Johnson", value: 120000, createdAt: "2026-03-05" },
  { id: "L-003", firstName: "Priya", lastName: "Patel", email: "priya.patel@nexusfinance.com", company: "Nexus Finance", source: "TRADE_SHOW", score: 95, status: "NEGOTIATION", assignedTo: "Marcus Williams", value: 250000, createdAt: "2026-03-08" },
  { id: "L-004", firstName: "David", lastName: "Thompson", email: "d.thompson@healthplus.org", company: "HealthPlus Systems", source: "COLD_CALL", score: 41, status: "CONTACTED", assignedTo: "Emma Davis", value: 18000, createdAt: "2026-03-12" },
  { id: "L-005", firstName: "Sofia", lastName: "Nguyen", email: "sofia.n@cloudbuild.tech", company: "CloudBuild Technologies", source: "SOCIAL_MEDIA", score: 63, status: "NEW", assignedTo: "Sarah Johnson", value: 75000, createdAt: "2026-03-15" },
  { id: "L-006", firstName: "Robert", lastName: "Kim", email: "r.kim@manufactura.com", company: "Manufactura Group", source: "EMAIL", score: 79, status: "QUALIFIED", assignedTo: "Emma Davis", value: 95000, createdAt: "2026-03-18" },
  { id: "L-007", firstName: "Isabella", lastName: "Santos", email: "i.santos@logisticspro.net", company: "LogisticsPro", source: "PARTNER", score: 55, status: "NURTURING", assignedTo: "Marcus Williams", value: 32000, createdAt: "2026-03-22" },
  { id: "L-008", firstName: "Michael", lastName: "O'Brien", email: "m.obrien@quantumdata.ai", company: "Quantum Data AI", source: "WEBSITE", score: 91, status: "CLOSED_WON", assignedTo: "Sarah Johnson", value: 185000, createdAt: "2026-03-25" },
];

const LEAD_FIELDS: EntityField[] = [
  { name: "firstName", label: "First Name", type: "text", placeholder: "First name", required: true },
  { name: "lastName", label: "Last Name", type: "text", placeholder: "Last name" },
  { name: "email", label: "Email", type: "email", placeholder: "email@company.com", required: true, fullWidth: true },
  { name: "company", label: "Company", type: "text", placeholder: "Company name", fullWidth: true },
  {
    name: "source",
    label: "Source",
    type: "select",
    defaultValue: "WEBSITE",
    options: [
      { label: "Website", value: "WEBSITE" },
      { label: "Referral", value: "REFERRAL" },
      { label: "Cold Call", value: "COLD_CALL" },
      { label: "Email", value: "EMAIL" },
      { label: "Social Media", value: "SOCIAL_MEDIA" },
      { label: "Trade Show", value: "TRADE_SHOW" },
      { label: "Partner", value: "PARTNER" },
    ],
  },
  { name: "value", label: "Estimated Value (EGP)", type: "number", placeholder: "0" },
];

const LEAD_FILTER_FIELDS = [
  {
    key: "status",
    label: "Status",
    type: "select" as const,
    options: [
      { label: "New", value: "NEW" },
      { label: "Contacted", value: "CONTACTED" },
      { label: "Qualified", value: "QUALIFIED" },
      { label: "Proposal", value: "PROPOSAL" },
      { label: "Negotiation", value: "NEGOTIATION" },
      { label: "Closed Won", value: "CLOSED_WON" },
      { label: "Closed Lost", value: "CLOSED_LOST" },
      { label: "Nurturing", value: "NURTURING" },
    ],
  },
  {
    key: "source",
    label: "Source",
    type: "select" as const,
    options: [
      { label: "Website", value: "WEBSITE" },
      { label: "Referral", value: "REFERRAL" },
      { label: "Cold Call", value: "COLD_CALL" },
      { label: "Email", value: "EMAIL" },
      { label: "Social Media", value: "SOCIAL_MEDIA" },
      { label: "Trade Show", value: "TRADE_SHOW" },
      { label: "Partner", value: "PARTNER" },
    ],
  },
];

function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${LEAD_STATUS_STYLES[status]}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ── Opportunity types & data ────────────────────────────────────────────────────

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

const OPP_FIELDS_STATIC = {
  title: { name: "title", label: "Opportunity Title", type: "text" as const, placeholder: "e.g. Enterprise Software License", required: true, fullWidth: true },
  value: { name: "value", label: "Value (EGP)", type: "number" as const, placeholder: "0" },
  probability: { name: "probability", label: "Probability (%)", type: "number" as const, placeholder: "50", min: 0, max: 100 },
  stage: { name: "stage", label: "Stage", type: "select" as const, defaultValue: "PROSPECTING", options: STAGES.map((s) => ({ label: s.replace(/_/g, " "), value: s })) },
  owner: { name: "owner", label: "Owner", type: "text" as const, placeholder: "Sales rep name" },
  expectedClose: { name: "expectedClose", label: "Expected Close Date", type: "text" as const, placeholder: "YYYY-MM-DD" },
};

const OPP_FILTER_FIELDS = [
  { key: "stage", label: "Stage", type: "select" as const, options: STAGES.map((s) => ({ label: s.replace(/_/g, " "), value: s })) },
];

function StageBadge({ stage }: { stage: Stage }) {
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[stage]}`}>{stage.replace(/_/g, " ")}</span>;
}

// ── Pipeline tab types ──────────────────────────────────────────────────────────

type ActiveTab = "leads" | "opportunities" | "pipeline";

// ── Main Page Component ─────────────────────────────────────────────────────────

export default function LeadsPage() {
  const store = useDataStore();
  const { t } = useTranslation();

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>("leads");

  // Lead state
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [leadFilters, setLeadFilters] = useState<FilterState>({ _search: "", status: "", source: "" });
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);

  // Opportunity state
  const [opportunities, setOpportunities] = useState<Opportunity[]>(INITIAL_OPPORTUNITIES);
  const [oppView, setOppView] = useState<"kanban" | "table">("kanban");
  const [oppFilters, setOppFilters] = useState<FilterState>({ _search: "", stage: "" });
  const [showOppModal, setShowOppModal] = useState(false);
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  const [detailOpp, setDetailOpp] = useState<Opportunity | null>(null);

  // Opportunity form fields (depends on store)
  const OPP_FIELDS: EntityField[] = [
    OPP_FIELDS_STATIC.title,
    { name: "account", label: "Account", type: "select", required: true, options: store.customers.map(c => ({ label: c.name, value: c.name })) },
    OPP_FIELDS_STATIC.value,
    OPP_FIELDS_STATIC.probability,
    OPP_FIELDS_STATIC.stage,
    OPP_FIELDS_STATIC.owner,
    OPP_FIELDS_STATIC.expectedClose,
  ];

  // ── Lead computed ──
  const filteredLeads = leads.filter((l) => {
    const q = (leadFilters._search || "").toLowerCase();
    const matchesSearch =
      !q ||
      `${l.firstName} ${l.lastName}`.toLowerCase().includes(q) ||
      l.company.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q);
    const matchesStatus = !leadFilters.status || l.status === leadFilters.status;
    const matchesSource = !leadFilters.source || l.source === leadFilters.source;
    return matchesSearch && matchesStatus && matchesSource;
  });

  const totalLeads = leads.length;
  const newThisMonth = leads.filter((l) => l.createdAt >= "2026-03-01").length;
  const qualifiedLeads = leads.filter((l) => l.status === "QUALIFIED" || l.status === "PROPOSAL" || l.status === "NEGOTIATION").length;
  const wonLeads = leads.filter((l) => l.status === "CLOSED_WON").length;
  const leadConversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : "0";

  const leadStatusFlow: Record<string, LeadStatus> = {
    NEW: "CONTACTED",
    CONTACTED: "QUALIFIED",
    QUALIFIED: "PROPOSAL",
    PROPOSAL: "NEGOTIATION",
    NEGOTIATION: "CLOSED_WON",
  };

  // ── Opportunity computed ──
  const filteredOpps = opportunities.filter((o) => {
    const q = (oppFilters._search || "").toLowerCase();
    const matchesSearch = !q || o.title.toLowerCase().includes(q) || o.account.toLowerCase().includes(q);
    const matchesStage = !oppFilters.stage || o.stage === oppFilters.stage;
    return matchesSearch && matchesStage;
  });

  const totalPipeline = opportunities.filter((o) => o.stage !== "CLOSED_LOST").reduce((sum, o) => sum + o.value, 0);
  const wonThisMonth = opportunities.filter((o) => o.stage === "CLOSED_WON" && o.expectedClose >= "2026-03-01").reduce((sum, o) => sum + o.value, 0);
  const closedOps = opportunities.filter((o) => o.stage === "CLOSED_WON" || o.stage === "CLOSED_LOST");
  const winRate = closedOps.length > 0 ? ((opportunities.filter((o) => o.stage === "CLOSED_WON").length / closedOps.length) * 100).toFixed(0) : "0";
  const avgDealSize = opportunities.length > 0 ? Math.round(opportunities.reduce((sum, o) => sum + o.value, 0) / opportunities.length) : 0;

  const oppStageFlow: Record<string, Stage> = {
    PROSPECTING: "QUALIFICATION", QUALIFICATION: "PROPOSAL", PROPOSAL: "NEGOTIATION", NEGOTIATION: "CLOSED_WON",
  };

  const oppColumns: Column<Record<string, unknown>>[] = [
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
        const next = oppStageFlow[o.stage];
        return (
          <EditDeleteMenu
            onEdit={() => { setEditingOpp(o); setShowOppModal(true); }}
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

  // ── Pipeline tab computed ──
  const pipelineLeadsByStage = {
    new: leads.filter((l) => l.status === "NEW" || l.status === "CONTACTED").length,
    qualified: leads.filter((l) => l.status === "QUALIFIED").length,
    proposal: leads.filter((l) => l.status === "PROPOSAL").length,
    negotiation: leads.filter((l) => l.status === "NEGOTIATION").length,
    won: leads.filter((l) => l.status === "CLOSED_WON").length,
    lost: leads.filter((l) => l.status === "CLOSED_LOST").length,
  };

  const pipelineOppsByStage = {
    prospecting: opportunities.filter((o) => o.stage === "PROSPECTING").length,
    qualification: opportunities.filter((o) => o.stage === "QUALIFICATION").length,
    proposal: opportunities.filter((o) => o.stage === "PROPOSAL").length,
    negotiation: opportunities.filter((o) => o.stage === "NEGOTIATION").length,
    won: opportunities.filter((o) => o.stage === "CLOSED_WON").length,
    lost: opportunities.filter((o) => o.stage === "CLOSED_LOST").length,
  };

  const totalPipelineValue = leads.reduce((s, l) => s + l.value, 0) + opportunities.reduce((s, o) => s + o.value, 0);

  // ── Tab button helper ──
  const tabButton = (tab: ActiveTab, label: string) => (
    <Button
      key={tab}
      variant={activeTab === tab ? "default" : "ghost"}
      size="sm"
      onClick={() => setActiveTab(tab)}
    >
      {label}
    </Button>
  );

  // ── Add button per tab ──
  const addButton = activeTab === "leads" ? (
    <Button onClick={() => { setEditingLead(null); setShowLeadModal(true); }} className="gap-2">
      <Plus className="w-4 h-4" /> {t("leads.addLead")}
    </Button>
  ) : activeTab === "opportunities" ? (
    <div className="flex items-center gap-2">
      <Button variant={oppView === "kanban" ? "default" : "outline"} size="sm" onClick={() => setOppView("kanban")} className="gap-1.5">
        <LayoutGrid className="w-4 h-4" /> Kanban
      </Button>
      <Button variant={oppView === "table" ? "default" : "outline"} size="sm" onClick={() => setOppView("table")} className="gap-1.5">
        <List className="w-4 h-4" /> Table
      </Button>
      <Button onClick={() => { setEditingOpp(null); setShowOppModal(true); }} className="gap-2">
        <Plus className="w-4 h-4" /> Add Opportunity
      </Button>
    </div>
  ) : null;

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Sales Pipeline" description="Manage leads, opportunities, and your sales pipeline">
        {addButton}
      </PageHeader>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1 border-b border-border pb-2">
        {tabButton("leads", "Leads")}
        {tabButton("opportunities", "Opportunities")}
        {tabButton("pipeline", "Pipeline Overview")}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── LEADS TAB ── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "leads" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Total Leads" value={String(totalLeads)} icon={Users} />
            <StatsCard title="New This Month" value={String(newThisMonth)} icon={TrendingUp} />
            <StatsCard title="Qualified" value={String(qualifiedLeads)} icon={Star} />
            <StatsCard title="Conversion Rate" value={`${leadConversionRate}%`} icon={BarChart2} />
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm">
            <div className="p-4 border-b border-border">
              <FilterBar
                searchValue={leadFilters._search}
                onSearchChange={(v) => setLeadFilters((f) => ({ ...f, _search: v }))}
                fields={LEAD_FILTER_FIELDS}
                values={leadFilters}
                onChange={(k, v) => setLeadFilters((f) => ({ ...f, [k]: v }))}
              />
            </div>
            <DataTable
              selectable
              bulkActions={[
                { key: "delete", label: "Delete Selected", variant: "destructive" },
                { key: "export", label: "Export Selected" },
              ]}
              onBulkAction={(action, rows) => {
                if (action === "delete") {
                  const ids = new Set((rows as unknown as Lead[]).map((r) => r.id));
                  setLeads((prev) => prev.filter((l) => !ids.has(l.id)));
                } else if (action === "export") {
                  const csvColumns = [
                    { key: "id" as const, label: "ID" },
                    { key: "firstName" as const, label: "First Name" },
                    { key: "lastName" as const, label: "Last Name" },
                    { key: "email" as const, label: "Email" },
                    { key: "company" as const, label: "Company" },
                    { key: "source" as const, label: "Source" },
                    { key: "score" as const, label: "Score" },
                    { key: "status" as const, label: "Status" },
                    { key: "assignedTo" as const, label: "Assigned To" },
                    { key: "value" as const, label: "Value" },
                  ];
                  downloadCSV("leads-selected.csv", rows as unknown as Record<string, unknown>[], csvColumns);
                }
              }}
              columns={[
                {
                  key: "firstName",
                  label: "Name",
                  render: (_v: unknown, row: unknown) => {
                    const lead = row as Lead;
                    return <span className="font-medium text-foreground">{lead.firstName} {lead.lastName}</span>;
                  },
                },
                { key: "company", label: "Company" },
                { key: "email", label: "Email" },
                {
                  key: "source",
                  label: "Source",
                  render: (v: unknown) => <span>{String(v).replace(/_/g, " ")}</span>,
                },
                {
                  key: "score",
                  label: "Score",
                  render: (_v: unknown, row: unknown) => {
                    const lead = row as Lead;
                    return (
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-muted rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${lead.score >= 80 ? "bg-green-500" : lead.score >= 60 ? "bg-yellow-500" : "bg-red-400"}`}
                            style={{ width: `${lead.score}%` }}
                          />
                        </div>
                        <span className="text-foreground font-medium">{lead.score}</span>
                      </div>
                    );
                  },
                },
                {
                  key: "status",
                  label: "Status",
                  render: (_v: unknown, row: unknown) => {
                    const lead = row as Lead;
                    return <LeadStatusBadge status={lead.status} />;
                  },
                },
                { key: "assignedTo", label: "Assigned To" },
                {
                  key: "value",
                  label: "Value",
                  className: "text-right",
                  render: (_v: unknown, row: unknown) => {
                    const lead = row as Lead;
                    return <span className="font-medium text-foreground">${lead.value.toLocaleString()}</span>;
                  },
                },
                {
                  key: "actions",
                  label: "",
                  render: (_v: unknown, row: unknown) => {
                    const lead = row as Lead;
                    return (
                      <EditDeleteMenu
                        onEdit={() => { setEditingLead(lead); setShowLeadModal(true); }}
                        onDelete={() => setLeads((prev) => prev.filter((l) => l.id !== lead.id))}
                        onView={() => setDetailLead(lead)}
                        canView
                        itemLabel={`${lead.firstName} ${lead.lastName}`}
                        extraItems={(() => {
                          const next = leadStatusFlow[lead.status];
                          if (!next) return [];
                          return [{ label: `Move to ${next.replace(/_/g, " ")}`, onClick: () => setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, status: next } : l)) }];
                        })()}
                      />
                    );
                  },
                },
              ] as Column<Record<string, unknown>>[]}
              data={filteredLeads as unknown as Record<string, unknown>[]}
              emptyMessage="No leads found."
              exportable
              exportFilename="leads.csv"
            />
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── OPPORTUNITIES TAB ── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "opportunities" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Total Pipeline Value" value={`EGP ${(totalPipeline / 1000).toFixed(0)}K`} subtitle="Excluding closed lost" icon={DollarSign} change={12} changeLabel="vs last month" />
            <StatsCard title="Won This Month" value={`EGP ${(wonThisMonth / 1000).toFixed(0)}K`} subtitle="March 2026" icon={Award} change={8} changeLabel="vs last month" />
            <StatsCard title="Win Rate" value={`${winRate}%`} subtitle="Closed won / total closed" icon={TrendingUp} change={3} changeLabel="vs last month" />
            <StatsCard title="Avg Deal Size" value={`EGP ${(avgDealSize / 1000).toFixed(0)}K`} subtitle="Across all opportunities" icon={BarChart2} />
          </div>

          <FilterBar
            searchValue={oppFilters._search}
            onSearchChange={(v) => setOppFilters((f) => ({ ...f, _search: v }))}
            fields={OPP_FILTER_FIELDS}
            values={oppFilters}
            onChange={(k, v) => setOppFilters((f) => ({ ...f, [k]: v }))}
          />

          {oppView === "kanban" && (
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-max">
                {STAGES.map((stage) => {
                  const cards = filteredOpps.filter((o) => o.stage === stage);
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
                                onEdit={() => { setEditingOpp(opp); setShowOppModal(true); }}
                                onDelete={() => setOpportunities((prev) => prev.filter((x) => x.id !== opp.id))}
                                onView={() => setDetailOpp(opp)}
                                canView
                                itemLabel={opp.title}
                                extraItems={(() => {
                                  const next = oppStageFlow[opp.stage];
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

          {oppView === "table" && (
            <DataTable columns={oppColumns} data={filteredOpps as unknown as Record<string, unknown>[]} emptyMessage="No opportunities found." exportable exportFilename="opportunities.csv" />
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── PIPELINE OVERVIEW TAB ── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "pipeline" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Total Pipeline Value" value={`EGP ${(totalPipelineValue / 1000).toFixed(0)}K`} icon={DollarSign} />
            <StatsCard title="Active Leads" value={String(totalLeads - wonLeads - leads.filter((l) => l.status === "CLOSED_LOST").length)} icon={Users} />
            <StatsCard title="Active Opportunities" value={String(opportunities.filter((o) => o.stage !== "CLOSED_WON" && o.stage !== "CLOSED_LOST").length)} icon={TrendingUp} />
            <StatsCard title="Overall Win Rate" value={`${winRate}%`} icon={Award} />
          </div>

          {/* Funnel visualization */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lead funnel */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Lead Funnel</h3>
              <div className="space-y-3">
                {[
                  { label: "New / Contacted", count: pipelineLeadsByStage.new, color: "bg-blue-500" },
                  { label: "Qualified", count: pipelineLeadsByStage.qualified, color: "bg-green-500" },
                  { label: "Proposal", count: pipelineLeadsByStage.proposal, color: "bg-yellow-500" },
                  { label: "Negotiation", count: pipelineLeadsByStage.negotiation, color: "bg-orange-500" },
                  { label: "Won", count: pipelineLeadsByStage.won, color: "bg-emerald-500" },
                  { label: "Lost", count: pipelineLeadsByStage.lost, color: "bg-red-500" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium text-foreground">{item.count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${totalLeads > 0 ? (item.count / totalLeads) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Opportunity funnel */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Opportunity Funnel</h3>
              <div className="space-y-3">
                {[
                  { label: "Prospecting", count: pipelineOppsByStage.prospecting, color: "bg-gray-500" },
                  { label: "Qualification", count: pipelineOppsByStage.qualification, color: "bg-blue-500" },
                  { label: "Proposal", count: pipelineOppsByStage.proposal, color: "bg-yellow-500" },
                  { label: "Negotiation", count: pipelineOppsByStage.negotiation, color: "bg-orange-500" },
                  { label: "Won", count: pipelineOppsByStage.won, color: "bg-green-500" },
                  { label: "Lost", count: pipelineOppsByStage.lost, color: "bg-red-500" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium text-foreground">{item.count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${opportunities.length > 0 ? (item.count / opportunities.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent activity - combined view */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Recent Pipeline Items</h3>
            <div className="space-y-3">
              {[
                ...leads.slice(0, 4).map((l) => ({
                  type: "Lead" as const,
                  name: `${l.firstName} ${l.lastName}`,
                  detail: l.company,
                  value: l.value,
                  status: l.status,
                  date: l.createdAt,
                })),
                ...opportunities.slice(0, 4).map((o) => ({
                  type: "Opportunity" as const,
                  name: o.title,
                  detail: o.account,
                  value: o.value,
                  status: o.stage,
                  date: o.createdAt,
                })),
              ]
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 8)
                .map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.type === "Lead" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                        {item.type}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.detail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">EGP {item.value.toLocaleString()}</p>
                      <span className="text-xs text-muted-foreground">{item.status.replace(/_/g, " ")}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── MODALS ── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}

      {/* ── Lead Form Modal ── */}
      <EntityFormModal
        open={showLeadModal}
        onOpenChange={(open) => { setShowLeadModal(open); if (!open) setEditingLead(null); }}
        title={editingLead ? "Edit Lead" : "Add New Lead"}
        fields={LEAD_FIELDS}
        initialData={editingLead ? { firstName: editingLead.firstName, lastName: editingLead.lastName, email: editingLead.email, company: editingLead.company, source: editingLead.source, value: editingLead.value } : undefined}
        onSubmit={(data) => {
          if (editingLead) {
            setLeads((prev) => prev.map((l) => l.id === editingLead.id ? {
              ...l,
              firstName: data.firstName as string,
              lastName: (data.lastName as string) || l.lastName,
              email: data.email as string,
              company: (data.company as string) || l.company,
              source: (data.source as LeadSource) || l.source,
              value: (data.value as number) || l.value,
            } : l));
          } else {
            const newLead: Lead = {
              id: `L-${Date.now().toString(36)}`,
              firstName: data.firstName as string,
              lastName: (data.lastName as string) || "",
              email: data.email as string,
              company: (data.company as string) || "",
              source: (data.source as LeadSource) || "WEBSITE",
              score: Math.floor(Math.random() * 40 + 30),
              status: "NEW",
              assignedTo: "Unassigned",
              value: (data.value as number) || 0,
              createdAt: new Date().toISOString().split("T")[0],
            };
            setLeads((prev) => [newLead, ...prev]);
          }
          setShowLeadModal(false);
          setEditingLead(null);
        }}
      />

      {/* ── Opportunity Form Modal ── */}
      <EntityFormModal
        open={showOppModal}
        onOpenChange={(open) => { setShowOppModal(open); if (!open) setEditingOpp(null); }}
        title={editingOpp ? "Edit Opportunity" : "Add New Opportunity"}
        fields={OPP_FIELDS}
        initialData={editingOpp ? { title: editingOpp.title, account: editingOpp.account, value: editingOpp.value, probability: editingOpp.probability, stage: editingOpp.stage, owner: editingOpp.owner, expectedClose: editingOpp.expectedClose } : undefined}
        onSubmit={(data) => {
          if (editingOpp) {
            setOpportunities((prev) => prev.map((o) => o.id === editingOpp.id ? {
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
          setShowOppModal(false);
          setEditingOpp(null);
        }}
      />

      {/* ── Lead Detail Dialog ── */}
      <Dialog open={!!detailLead} onOpenChange={(open) => { if (!open) setDetailLead(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailLead?.firstName} {detailLead?.lastName}</DialogTitle>
          </DialogHeader>
          {detailLead && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-sm text-muted-foreground">Name</span><p className="font-medium">{detailLead.firstName} {detailLead.lastName}</p></div>
                <div><span className="text-sm text-muted-foreground">Email</span><p className="font-medium">{detailLead.email}</p></div>
                <div><span className="text-sm text-muted-foreground">Company</span><p className="font-medium">{detailLead.company || "—"}</p></div>
                <div><span className="text-sm text-muted-foreground">Source</span><p className="font-medium">{detailLead.source.replace(/_/g, " ")}</p></div>
                <div><span className="text-sm text-muted-foreground">Status</span><p><LeadStatusBadge status={detailLead.status} /></p></div>
                <div><span className="text-sm text-muted-foreground">Estimated Value</span><p className="font-medium">EGP {detailLead.value.toLocaleString()}</p></div>
                <div><span className="text-sm text-muted-foreground">Assigned To</span><p className="font-medium">{detailLead.assignedTo}</p></div>
                <div><span className="text-sm text-muted-foreground">Created</span><p className="font-medium">{detailLead.createdAt}</p></div>
              </div>
              {/* Lead Score */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Lead Score</span>
                  <span className="font-medium">{detailLead.score}/100</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${detailLead.score >= 80 ? "bg-green-500" : detailLead.score >= 60 ? "bg-yellow-500" : "bg-red-400"}`} style={{ width: `${detailLead.score}%` }} />
                </div>
              </div>
              {detailLead.status === "CLOSED_WON" && (
                <div className="pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Cross-Module Actions</span>
                  {store.customers.some(c => c.name === detailLead.company) ? (
                    <p className="text-sm text-green-600 font-medium mt-1">Customer record exists for {detailLead.company}</p>
                  ) : (
                    <Button
                      className="mt-2 w-full"
                      onClick={() => {
                        store.add("customers", {
                          id: store.genId("cust"),
                          code: store.generateCustomerCode(),
                          name: detailLead.company || `${detailLead.firstName} ${detailLead.lastName}`,
                          type: "Pharmacy Chain",
                          email: detailLead.email,
                          phone: "",
                          address: "",
                          creditLimit: detailLead.value,
                          outstanding: 0,
                          currency: "EGP",
                          paymentTerms: "Net 30",
                          status: "ACTIVE",
                          createdAt: new Date().toISOString().split("T")[0],
                        });
                      }}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Create Customer Record
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
