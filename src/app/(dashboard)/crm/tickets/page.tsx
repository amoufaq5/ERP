"use client";

import { useState } from "react";
import {
  Ticket, Plus, AlertTriangle, Clock, CheckCircle, Download, Eye, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { downloadCSV } from "@/lib/download";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";

// ─── Types ───────────────────────────────────────────────────────────────────
type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type TicketStatus = "OPEN" | "IN_PROGRESS" | "PENDING" | "RESOLVED" | "CLOSED";

interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  account: string;
  priority: Priority;
  status: TicketStatus;
  assignedTo: string;
  slaDeadline: string;
  createdAt: string;
}

// ─── Style maps ──────────────────────────────────────────────────────────────
const PRIORITY_STYLES: Record<Priority, string> = {
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  MEDIUM: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  LOW: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_STYLES: Record<TicketStatus, string> = {
  OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  PENDING: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  RESOLVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  CLOSED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  PENDING: "Pending",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

// Status workflow: valid next states
const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["IN_PROGRESS"],
  IN_PROGRESS: ["PENDING", "RESOLVED"],
  PENDING: ["IN_PROGRESS"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
};

// ─── Seed data ───────────────────────────────────────────────────────────────
const INITIAL_TICKETS: SupportTicket[] = [
  { id: "1", ticketNumber: "TKT-00341", subject: "Unable to export reports to PDF", description: "Users report that clicking the Export PDF button in the Reports module returns a blank page. Affects Chrome and Firefox on Windows.", account: "TechCorp Solutions", priority: "HIGH", status: "IN_PROGRESS", assignedTo: "Alex Turner", slaDeadline: "2026-04-02 17:00", createdAt: "2026-03-30" },
  { id: "2", ticketNumber: "TKT-00340", subject: "Login issues after SSO migration", description: "After migrating to Okta SSO, approximately 30% of users are unable to authenticate. They receive a 403 Forbidden error on the callback redirect.", account: "Nexus Finance", priority: "CRITICAL", status: "OPEN", assignedTo: "Maya Rodriguez", slaDeadline: "2026-04-01 09:00", createdAt: "2026-03-30" },
  { id: "3", ticketNumber: "TKT-00339", subject: "Invoice totals not matching line items", description: "Invoice summary totals are off by small amounts due to a floating-point rounding issue when tax is applied per line item rather than on the subtotal.", account: "Global Retail Inc.", priority: "HIGH", status: "PENDING", assignedTo: "Alex Turner", slaDeadline: "2026-04-02 12:00", createdAt: "2026-03-29" },
  { id: "4", ticketNumber: "TKT-00338", subject: "Custom field not saving on contact form", description: "The newly added custom dropdown field on the Contact form does not persist its value after save. The field appears empty when the record is reopened.", account: "HealthPlus Systems", priority: "MEDIUM", status: "IN_PROGRESS", assignedTo: "Dana Park", slaDeadline: "2026-04-04 17:00", createdAt: "2026-03-28" },
  { id: "5", ticketNumber: "TKT-00337", subject: "Email notifications not being sent", description: "Automated workflow email notifications stopped sending after the last deployment. The mail queue shows messages stuck in PENDING status.", account: "CloudBuild Technologies", priority: "MEDIUM", status: "OPEN", assignedTo: "Maya Rodriguez", slaDeadline: "2026-04-04 09:00", createdAt: "2026-03-27" },
  { id: "6", ticketNumber: "TKT-00336", subject: "Dashboard loading slowly (>10 sec)", description: "The main analytics dashboard takes over 10 seconds to load. Investigation points to unoptimised aggregate queries on the reporting views.", account: "Manufactura Group", priority: "LOW", status: "RESOLVED", assignedTo: "Dana Park", slaDeadline: "2026-04-06 17:00", createdAt: "2026-03-25" },
  { id: "7", ticketNumber: "TKT-00335", subject: "Data import wizard crashes on large files", description: "Uploading CSV files larger than 50 MB causes the import wizard to crash with an out-of-memory error in the browser tab.", account: "LogisticsPro", priority: "HIGH", status: "RESOLVED", assignedTo: "Alex Turner", slaDeadline: "2026-03-28 17:00", createdAt: "2026-03-24" },
  { id: "8", ticketNumber: "TKT-00334", subject: "API rate limit documentation unclear", description: "The public API docs do not clearly state the rate limit per endpoint. Customers are hitting 429 errors without knowing the thresholds.", account: "Quantum Data AI", priority: "LOW", status: "CLOSED", assignedTo: "Dana Park", slaDeadline: "2026-03-31 17:00", createdAt: "2026-03-22" },
];

const ACCOUNTS = [
  "TechCorp Solutions", "Nexus Finance", "Global Retail Inc.", "HealthPlus Systems",
  "CloudBuild Technologies", "Manufactura Group", "LogisticsPro", "Quantum Data AI",
];

// ─── Form fields ─────────────────────────────────────────────────────────────
const TICKET_FIELDS: EntityField[] = [
  { name: "subject", label: "Subject", type: "text", placeholder: "Brief summary of the issue", required: true, fullWidth: true },
  { name: "description", label: "Description", type: "textarea", placeholder: "Detailed description of the problem...", fullWidth: true },
  { name: "account", label: "Account", type: "select", required: true, options: ACCOUNTS.map((a) => ({ label: a, value: a })) },
  { name: "priority", label: "Priority", type: "select", defaultValue: "MEDIUM", options: [
    { label: "Low", value: "LOW" }, { label: "Medium", value: "MEDIUM" },
    { label: "High", value: "HIGH" }, { label: "Critical", value: "CRITICAL" },
  ]},
  { name: "assignedTo", label: "Assigned To", type: "text", placeholder: "Support rep name" },
  { name: "slaDeadline", label: "SLA Deadline", type: "text", placeholder: "YYYY-MM-DD HH:MM" },
];

// ─── Filter fields ───────────────────────────────────────────────────────────
const FILTER_FIELDS = [
  { key: "priority", label: "Priority", type: "select" as const, options: [
    { label: "Low", value: "LOW" }, { label: "Medium", value: "MEDIUM" },
    { label: "High", value: "HIGH" }, { label: "Critical", value: "CRITICAL" },
  ]},
  { key: "status", label: "Status", type: "select" as const, options: [
    { label: "Open", value: "OPEN" }, { label: "In Progress", value: "IN_PROGRESS" },
    { label: "Pending", value: "PENDING" }, { label: "Resolved", value: "RESOLVED" },
    { label: "Closed", value: "CLOSED" },
  ]},
];

// ─── Helper components ───────────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_STYLES[priority]}`}>
      {priority === "CRITICAL" && <AlertTriangle className="w-3 h-3 mr-1" />}
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function isSlaBreached(slaDeadline: string, status: TicketStatus): boolean {
  if (status === "CLOSED" || status === "RESOLVED") return false;
  const slaDate = new Date(slaDeadline.replace(" ", "T"));
  return slaDate < new Date();
}

function getSlaInfo(slaDeadline: string, status: TicketStatus): { label: string; breached: boolean } {
  if (status === "CLOSED" || status === "RESOLVED") return { label: "Met", breached: false };
  const slaDate = new Date(slaDeadline.replace(" ", "T"));
  const now = new Date();
  if (slaDate < now) return { label: "Breached", breached: true };
  const hoursLeft = Math.round((slaDate.getTime() - now.getTime()) / (1000 * 60 * 60));
  return { label: `${hoursLeft}h remaining`, breached: false };
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function TicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);
  const [filters, setFilters] = useState<FilterState>({ _search: "", priority: "", status: "" });
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SupportTicket | null>(null);
  const [detailTicket, setDetailTicket] = useState<SupportTicket | null>(null);

  // ── Stats ──
  const totalTickets = tickets.length;
  const openCount = tickets.filter((t) => t.status === "OPEN").length;
  const criticalCount = tickets.filter((t) => t.priority === "CRITICAL" && t.status !== "CLOSED" && t.status !== "RESOLVED").length;
  const slaBreachCount = tickets.filter((t) => isSlaBreached(t.slaDeadline, t.status)).length;

  // ── Filtered data ──
  const filtered = tickets.filter((t) => {
    const q = (filters._search || "").toLowerCase();
    const matchesSearch = !q || t.subject.toLowerCase().includes(q) || t.account.toLowerCase().includes(q) || t.ticketNumber.toLowerCase().includes(q);
    const matchesPriority = !filters.priority || t.priority === filters.priority;
    const matchesStatus = !filters.status || t.status === filters.status;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  // ── CSV export ──
  const handleExport = () => {
    downloadCSV(
      "support-tickets.csv",
      filtered.map((t) => ({
        "Ticket #": t.ticketNumber,
        Subject: t.subject,
        Account: t.account,
        Priority: t.priority,
        Status: STATUS_LABELS[t.status],
        "Assigned To": t.assignedTo,
        "SLA Deadline": t.slaDeadline,
        Created: t.createdAt,
      })),
    );
  };

  // ── Transition handler ──
  const transitionStatus = (id: string, newStatus: TicketStatus) => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
    setDetailTicket((prev) => (prev && prev.id === id ? { ...prev, status: newStatus } : prev));
  };

  // ── Columns ──
  const columns: Column<Record<string, unknown>>[] = [
    { key: "ticketNumber", label: "Ticket #", className: "w-28" },
    { key: "subject", label: "Subject" },
    { key: "account", label: "Account" },
    { key: "priority", label: "Priority", render: (v) => <PriorityBadge priority={v as Priority} /> },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v as TicketStatus} /> },
    { key: "assignedTo", label: "Assigned To" },
    {
      key: "slaDeadline", label: "SLA", render: (_v, row) => {
        const info = getSlaInfo(row.slaDeadline as string, row.status as TicketStatus);
        return (
          <span className={info.breached ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground"}>
            {info.breached && <AlertTriangle className="w-3 h-3 inline mr-1" />}
            {info.label}
          </span>
        );
      },
    },
    { key: "createdAt", label: "Created" },
    {
      key: "id", label: "", render: (_v, row) => {
        const tk = tickets.find((x) => x.id === row.id);
        if (!tk) return null;
        const nextStates = STATUS_TRANSITIONS[tk.status];
        return (
          <EditDeleteMenu
            onEdit={() => { setEditing(tk); setShowModal(true); }}
            onDelete={() => setTickets((prev) => prev.filter((x) => x.id !== tk.id))}
            onView={() => setDetailTicket(tk)}
            canView
            itemLabel={tk.ticketNumber}
            extraItems={nextStates.map((ns) => ({
              label: `Move to ${STATUS_LABELS[ns]}`,
              onClick: () => transitionStatus(tk.id, ns),
            }))}
          />
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <PageHeader title="Support Tickets" description="Track, manage, and resolve customer support tickets.">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button onClick={() => { setEditing(null); setShowModal(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> New Ticket
          </Button>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Tickets" value={totalTickets} subtitle="All tickets in system" icon={<Ticket className="w-5 h-5" />} />
        <StatsCard title="Open" value={openCount} subtitle="Awaiting assignment" icon={<MessageSquare className="w-5 h-5" />} />
        <StatsCard title="Critical" value={criticalCount} subtitle="Active critical issues" icon={<AlertTriangle className="w-5 h-5" />} />
        <StatsCard title="SLA Breached" value={slaBreachCount} subtitle="Past deadline" icon={<Clock className="w-5 h-5" />} />
      </div>

      {/* Filters + Table */}
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
          columns={columns}
          data={filtered as unknown as Record<string, unknown>[]}
          emptyMessage="No tickets found."
          exportable
          exportFilename="support-tickets.csv"
        />
      </div>

      {/* Create / Edit Modal */}
      <EntityFormModal
        open={showModal}
        onOpenChange={(open) => { setShowModal(open); if (!open) setEditing(null); }}
        title={editing ? "Edit Ticket" : "Create New Ticket"}
        fields={TICKET_FIELDS}
        initialData={editing ? {
          subject: editing.subject,
          description: editing.description,
          account: editing.account,
          priority: editing.priority,
          assignedTo: editing.assignedTo,
          slaDeadline: editing.slaDeadline,
        } : undefined}
        onSubmit={(data) => {
          if (editing) {
            setTickets((prev) => prev.map((t) => t.id === editing.id ? {
              ...t,
              subject: data.subject as string,
              description: (data.description as string) || t.description,
              account: (data.account as string) || t.account,
              priority: (data.priority as Priority) || t.priority,
              assignedTo: (data.assignedTo as string) || t.assignedTo,
              slaDeadline: (data.slaDeadline as string) || t.slaDeadline,
            } : t));
          } else {
            const uid = Date.now().toString(36);
            const newTicket: SupportTicket = {
              id: uid,
              ticketNumber: `TKT-${uid.toUpperCase()}`,
              subject: data.subject as string,
              description: (data.description as string) || "",
              account: (data.account as string) || "",
              priority: (data.priority as Priority) || "MEDIUM",
              status: "OPEN",
              assignedTo: (data.assignedTo as string) || "Unassigned",
              slaDeadline: (data.slaDeadline as string) || "",
              createdAt: new Date().toISOString().split("T")[0],
            };
            setTickets((prev) => [newTicket, ...prev]);
          }
          setShowModal(false);
          setEditing(null);
        }}
      />

      {/* Ticket Detail Dialog */}
      <Dialog open={!!detailTicket} onOpenChange={(open) => { if (!open) setDetailTicket(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              {detailTicket?.ticketNumber} — {detailTicket?.subject}
            </DialogTitle>
          </DialogHeader>
          {detailTicket && (() => {
            const sla = getSlaInfo(detailTicket.slaDeadline, detailTicket.status);
            const nextStates = STATUS_TRANSITIONS[detailTicket.status];
            return (
              <div className="space-y-5">
                {/* Core info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Ticket #</span>
                    <p className="font-medium font-mono">{detailTicket.ticketNumber}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Priority</span>
                    <p><PriorityBadge priority={detailTicket.priority} /></p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Account</span>
                    <p className="font-medium">{detailTicket.account}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Status</span>
                    <p><StatusBadge status={detailTicket.status} /></p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Assigned To</span>
                    <p className="font-medium">{detailTicket.assignedTo}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Created</span>
                    <p className="font-medium">{detailTicket.createdAt}</p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <span className="text-sm text-muted-foreground">Description</span>
                  <p className="mt-1 text-sm leading-relaxed bg-muted/40 rounded-lg p-3">{detailTicket.description || "No description provided."}</p>
                </div>

                {/* SLA panel */}
                <div className={`rounded-lg border p-4 ${sla.breached ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30" : "border-border bg-muted/30"}`}>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> SLA Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Deadline</span>
                      <p className="font-medium">{detailTicket.slaDeadline}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Status</span>
                      {sla.breached ? (
                        <p className="font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Breached
                        </p>
                      ) : detailTicket.status === "CLOSED" || detailTicket.status === "RESOLVED" ? (
                        <p className="font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Met
                        </p>
                      ) : (
                        <p className="font-medium">{sla.label}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status workflow transitions */}
                {nextStates.length > 0 && (
                  <div className="pt-2 border-t flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">Transition:</span>
                    {nextStates.map((ns) => (
                      <Button
                        key={ns}
                        size="sm"
                        variant={ns === "RESOLVED" || ns === "CLOSED" ? "default" : "outline"}
                        onClick={() => transitionStatus(detailTicket.id, ns)}
                        className="gap-1.5"
                      >
                        {ns === "RESOLVED" || ns === "CLOSED" ? <CheckCircle className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {STATUS_LABELS[ns]}
                      </Button>
                    ))}
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
