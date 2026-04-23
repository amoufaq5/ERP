"use client";

import { useState } from "react";
import { Users, TrendingUp, Star, BarChart2, Plus } from "lucide-react";
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

const STATUS_STYLES: Record<LeadStatus, string> = {
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

const FILTER_FIELDS = [
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

function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [filters, setFilters] = useState<FilterState>({ _search: "", status: "", source: "" });
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);

  const filtered = leads.filter((l) => {
    const q = (filters._search || "").toLowerCase();
    const matchesSearch =
      !q ||
      `${l.firstName} ${l.lastName}`.toLowerCase().includes(q) ||
      l.company.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q);
    const matchesStatus = !filters.status || l.status === filters.status;
    const matchesSource = !filters.source || l.source === filters.source;
    return matchesSearch && matchesStatus && matchesSource;
  });

  const totalLeads = leads.length;
  const newThisMonth = leads.filter((l) => l.createdAt >= "2026-03-01").length;
  const qualified = leads.filter((l) => l.status === "QUALIFIED" || l.status === "PROPOSAL" || l.status === "NEGOTIATION").length;
  const won = leads.filter((l) => l.status === "CLOSED_WON").length;
  const conversionRate = totalLeads > 0 ? ((won / totalLeads) * 100).toFixed(1) : "0";

  const statusFlow: Record<string, LeadStatus> = {
    NEW: "CONTACTED",
    CONTACTED: "QUALIFIED",
    QUALIFIED: "PROPOSAL",
    PROPOSAL: "NEGOTIATION",
    NEGOTIATION: "CLOSED_WON",
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Leads" description="Track and manage your sales leads pipeline">
        <Button onClick={() => { setEditing(null); setShowModal(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add New Lead
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Leads" value={String(totalLeads)} icon={Users} />
        <StatsCard title="New This Month" value={String(newThisMonth)} icon={TrendingUp} />
        <StatsCard title="Qualified" value={String(qualified)} icon={Star} />
        <StatsCard title="Conversion Rate" value={`${conversionRate}%`} icon={BarChart2} />
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
                return <StatusBadge status={lead.status} />;
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
                    onEdit={() => { setEditing(lead); setShowModal(true); }}
                    onDelete={() => setLeads((prev) => prev.filter((l) => l.id !== lead.id))}
                    onView={() => setDetailLead(lead)}
                    canView
                    itemLabel={`${lead.firstName} ${lead.lastName}`}
                    extraItems={(() => {
                      const next = statusFlow[lead.status];
                      if (!next) return [];
                      return [{ label: `Move to ${next.replace(/_/g, " ")}`, onClick: () => setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, status: next } : l)) }];
                    })()}
                  />
                );
              },
            },
          ] as Column<Record<string, unknown>>[]}
          data={filtered as unknown as Record<string, unknown>[]}
          emptyMessage="No leads found."
          
          exportable
          exportFilename="leads.csv"
        />
      </div>

      <EntityFormModal
        open={showModal}
        onOpenChange={(open) => { if (!open) { setShowModal(false); setEditing(null); } }}
        title={editing ? "Edit Lead" : "Add New Lead"}
        fields={LEAD_FIELDS}
        initialData={editing ? { firstName: editing.firstName, lastName: editing.lastName, email: editing.email, company: editing.company, source: editing.source, value: editing.value } : undefined}
        onSubmit={(data) => {
          if (editing) {
            setLeads((prev) => prev.map((l) => l.id === editing.id ? {
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
          setShowModal(false);
          setEditing(null);
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
                <div><span className="text-sm text-muted-foreground">Status</span><p><StatusBadge status={detailLead.status} /></p></div>
                <div><span className="text-sm text-muted-foreground">Estimated Value</span><p className="font-medium">${detailLead.value.toLocaleString()}</p></div>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
