"use client";

import { useState } from "react";
import { Ticket, Clock, Star, AlertTriangle, Plus } from "lucide-react";
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

type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type TicketStatus = "OPEN" | "IN_PROGRESS" | "PENDING" | "RESOLVED" | "CLOSED";

interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  account: string;
  priority: Priority;
  status: TicketStatus;
  assignedTo: string;
  slaDeadline: string;
  createdAt: string;
}

const PRIORITY_STYLES: Record<Priority, string> = {
  LOW: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  MEDIUM: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_MAP: Record<TicketStatus, string> = {
  OPEN: "open",
  IN_PROGRESS: "in progress",
  PENDING: "pending",
  RESOLVED: "completed",
  CLOSED: "closed",
};

const INITIAL_TICKETS: SupportTicket[] = [
  { id: "1", ticketNumber: "TKT-00341", subject: "Unable to export reports to PDF", account: "TechCorp Solutions", priority: "HIGH", status: "IN_PROGRESS", assignedTo: "Alex Turner", slaDeadline: "2026-04-02 17:00", createdAt: "2026-03-30" },
  { id: "2", ticketNumber: "TKT-00340", subject: "Login issues after SSO migration", account: "Nexus Finance", priority: "CRITICAL", status: "OPEN", assignedTo: "Maya Rodriguez", slaDeadline: "2026-04-01 09:00", createdAt: "2026-03-30" },
  { id: "3", ticketNumber: "TKT-00339", subject: "Invoice totals not matching line items", account: "Global Retail Inc.", priority: "HIGH", status: "PENDING", assignedTo: "Alex Turner", slaDeadline: "2026-04-02 12:00", createdAt: "2026-03-29" },
  { id: "4", ticketNumber: "TKT-00338", subject: "Custom field not saving on contact form", account: "HealthPlus Systems", priority: "MEDIUM", status: "IN_PROGRESS", assignedTo: "Dana Park", slaDeadline: "2026-04-04 17:00", createdAt: "2026-03-28" },
  { id: "5", ticketNumber: "TKT-00337", subject: "Email notifications not being sent", account: "CloudBuild Technologies", priority: "MEDIUM", status: "OPEN", assignedTo: "Maya Rodriguez", slaDeadline: "2026-04-04 09:00", createdAt: "2026-03-27" },
  { id: "6", ticketNumber: "TKT-00336", subject: "Dashboard loading slowly (>10 sec)", account: "Manufactura Group", priority: "LOW", status: "RESOLVED", assignedTo: "Dana Park", slaDeadline: "2026-04-06 17:00", createdAt: "2026-03-25" },
  { id: "7", ticketNumber: "TKT-00335", subject: "Data import wizard crashes on large files", account: "LogisticsPro", priority: "HIGH", status: "RESOLVED", assignedTo: "Alex Turner", slaDeadline: "2026-03-28 17:00", createdAt: "2026-03-24" },
  { id: "8", ticketNumber: "TKT-00334", subject: "API rate limit documentation unclear", account: "Quantum Data AI", priority: "LOW", status: "CLOSED", assignedTo: "Dana Park", slaDeadline: "2026-03-31 17:00", createdAt: "2026-03-22" },
];

const TICKET_FIELDS: EntityField[] = [
  { name: "subject", label: "Subject", type: "text", placeholder: "Brief description of the issue", required: true, fullWidth: true },
  { name: "account", label: "Account", type: "text", placeholder: "Customer account name", required: true },
  { name: "priority", label: "Priority", type: "select", defaultValue: "MEDIUM", options: [
    { label: "Low", value: "LOW" }, { label: "Medium", value: "MEDIUM" },
    { label: "High", value: "HIGH" }, { label: "Critical", value: "CRITICAL" },
  ]},
  { name: "assignedTo", label: "Assign To", type: "text", placeholder: "Support rep name" },
  { name: "slaDeadline", label: "SLA Deadline", type: "text", placeholder: "YYYY-MM-DD HH:MM" },
];

const FILTER_FIELDS = [
  { key: "status", label: "Status", type: "select" as const, options: [
    { label: "Open", value: "OPEN" }, { label: "In Progress", value: "IN_PROGRESS" },
    { label: "Pending", value: "PENDING" }, { label: "Resolved", value: "RESOLVED" },
    { label: "Closed", value: "CLOSED" },
  ]},
  { key: "priority", label: "Priority", type: "select" as const, options: [
    { label: "Low", value: "LOW" }, { label: "Medium", value: "MEDIUM" },
    { label: "High", value: "HIGH" }, { label: "Critical", value: "CRITICAL" },
  ]},
];

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_STYLES[priority]}`}>
      {priority}
    </span>
  );
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);
  const [filters, setFilters] = useState<FilterState>({ _search: "", status: "", priority: "" });
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SupportTicket | null>(null);
  const [detailTicket, setDetailTicket] = useState<SupportTicket | null>(null);

  const filtered = tickets.filter((t) => {
    const q = (filters._search || "").toLowerCase();
    const matchesSearch = !q || t.subject.toLowerCase().includes(q) || t.account.toLowerCase().includes(q) || t.ticketNumber.toLowerCase().includes(q);
    const matchesStatus = !filters.status || t.status === filters.status;
    const matchesPriority = !filters.priority || t.priority === filters.priority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const openTickets = tickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS" || t.status === "PENDING").length;
  const inProgress = tickets.filter((t) => t.status === "IN_PROGRESS").length;
  const avgResolution = "4.2 hrs";
  const satisfaction = "94%";

  const statusFlow: Record<string, TicketStatus> = {
    OPEN: "IN_PROGRESS", IN_PROGRESS: "RESOLVED", PENDING: "IN_PROGRESS", RESOLVED: "CLOSED",
  };

  const columns: Column<Record<string, unknown>>[] = [
    { key: "ticketNumber", label: "Ticket #", className: "w-28" },
    { key: "subject", label: "Subject" },
    { key: "account", label: "Account" },
    { key: "priority", label: "Priority", render: (v) => <PriorityBadge priority={v as Priority} /> },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={STATUS_MAP[v as TicketStatus]} /> },
    { key: "assignedTo", label: "Assigned To" },
    { key: "slaDeadline", label: "SLA Deadline" },
    { key: "createdAt", label: "Created" },
    {
      key: "id",
      label: "",
      render: (_v, row) => {
        const t = tickets.find((x) => x.id === row.id);
        if (!t) return null;
        const next = statusFlow[t.status];
        return (
          <EditDeleteMenu
            onEdit={() => { setEditing(t); setShowModal(true); }}
            onDelete={() => setTickets((prev) => prev.filter((x) => x.id !== t.id))}
            onView={() => setDetailTicket(t)}
            canView
            itemLabel={t.ticketNumber}
            extraItems={next ? [{ label: `Move to ${next.replace(/_/g, " ")}`, onClick: () => setTickets((prev) => prev.map((x) => x.id === t.id ? { ...x, status: next } : x)) }] : []}
          />
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Support Tickets" description="Track and resolve customer support requests">
        <Button onClick={() => { setEditing(null); setShowModal(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> New Ticket
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Open Tickets" value={openTickets} subtitle="Requires attention" icon={<Ticket className="w-5 h-5" />} />
        <StatsCard title="In Progress" value={inProgress} subtitle="Currently being worked on" icon={<AlertTriangle className="w-5 h-5" />} />
        <StatsCard title="Avg Resolution Time" value={avgResolution} subtitle="Last 30 days" icon={<Clock className="w-5 h-5" />} trend={{ value: -8, label: "faster than last month" }} />
        <StatsCard title="Customer Satisfaction" value={satisfaction} subtitle="Based on CSAT surveys" icon={<Star className="w-5 h-5" />} trend={{ value: 2, label: "vs last month" }} />
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
        <DataTable columns={columns} data={filtered as unknown as Record<string, unknown>[]} emptyMessage="No tickets found." exportable exportFilename="tickets.csv" />
      </div>

      <EntityFormModal
        open={showModal}
        onOpenChange={(open) => { if (!open) { setShowModal(false); setEditing(null); } }}
        title={editing ? "Edit Ticket" : "Create New Ticket"}
        fields={TICKET_FIELDS}
        initialData={editing ? { subject: editing.subject, account: editing.account, priority: editing.priority, assignedTo: editing.assignedTo, slaDeadline: editing.slaDeadline } : undefined}
        onSubmit={(data) => {
          if (editing) {
            setTickets((prev) => prev.map((t) => t.id === editing.id ? {
              ...t,
              subject: data.subject as string,
              account: (data.account as string) || t.account,
              priority: (data.priority as Priority) || t.priority,
              assignedTo: (data.assignedTo as string) || t.assignedTo,
              slaDeadline: (data.slaDeadline as string) || t.slaDeadline,
            } : t));
          } else {
            const uniqueId = Date.now().toString(36);
            const newTicket: SupportTicket = {
              id: uniqueId,
              ticketNumber: `TKT-${uniqueId}`,
              subject: data.subject as string,
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

      {/* ── Ticket Detail Dialog ── */}
      <Dialog open={!!detailTicket} onOpenChange={(open) => { if (!open) setDetailTicket(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailTicket?.ticketNumber} &mdash; {detailTicket?.subject}</DialogTitle>
          </DialogHeader>
          {detailTicket && (() => {
            const slaDate = new Date(detailTicket.slaDeadline.replace(" ", "T"));
            const now = new Date();
            const slaBreached = slaDate < now && detailTicket.status !== "CLOSED" && detailTicket.status !== "RESOLVED";
            const slaRemaining = slaDate > now ? Math.round((slaDate.getTime() - now.getTime()) / (1000 * 60 * 60)) : 0;
            return (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-sm text-muted-foreground">Ticket #</span><p className="font-medium font-mono">{detailTicket.ticketNumber}</p></div>
                  <div><span className="text-sm text-muted-foreground">Priority</span><p><PriorityBadge priority={detailTicket.priority} /></p></div>
                  <div className="col-span-2"><span className="text-sm text-muted-foreground">Subject</span><p className="font-medium">{detailTicket.subject}</p></div>
                  <div><span className="text-sm text-muted-foreground">Account</span><p className="font-medium">{detailTicket.account}</p></div>
                  <div><span className="text-sm text-muted-foreground">Status</span><p><StatusBadge status={STATUS_MAP[detailTicket.status]} /></p></div>
                  <div><span className="text-sm text-muted-foreground">Assigned To</span><p className="font-medium">{detailTicket.assignedTo}</p></div>
                  <div><span className="text-sm text-muted-foreground">Created</span><p className="font-medium">{detailTicket.createdAt}</p></div>
                </div>
                {/* SLA Info */}
                <div className={`rounded-lg border p-4 ${slaBreached ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30" : "border-border bg-muted/30"}`}>
                  <h4 className="text-sm font-semibold mb-2">SLA Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-sm text-muted-foreground">SLA Deadline</span><p className="font-medium">{detailTicket.slaDeadline}</p></div>
                    <div>
                      <span className="text-sm text-muted-foreground">SLA Status</span>
                      {slaBreached ? (
                        <p className="font-medium text-red-600 dark:text-red-400">Breached</p>
                      ) : detailTicket.status === "CLOSED" || detailTicket.status === "RESOLVED" ? (
                        <p className="font-medium text-green-600 dark:text-green-400">Met</p>
                      ) : (
                        <p className="font-medium text-foreground">{slaRemaining}h remaining</p>
                      )}
                    </div>
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
