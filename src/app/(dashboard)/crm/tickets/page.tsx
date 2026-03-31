"use client";

import { useState } from "react";
import { Ticket, Clock, Star, AlertTriangle, Plus, Search } from "lucide-react";
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
  {
    id: "1",
    ticketNumber: "TKT-00341",
    subject: "Unable to export reports to PDF",
    account: "TechCorp Solutions",
    priority: "HIGH",
    status: "IN_PROGRESS",
    assignedTo: "Alex Turner",
    slaDeadline: "2026-04-02 17:00",
    createdAt: "2026-03-30",
  },
  {
    id: "2",
    ticketNumber: "TKT-00340",
    subject: "Login issues after SSO migration",
    account: "Nexus Finance",
    priority: "CRITICAL",
    status: "OPEN",
    assignedTo: "Maya Rodriguez",
    slaDeadline: "2026-04-01 09:00",
    createdAt: "2026-03-30",
  },
  {
    id: "3",
    ticketNumber: "TKT-00339",
    subject: "Invoice totals not matching line items",
    account: "Global Retail Inc.",
    priority: "HIGH",
    status: "PENDING",
    assignedTo: "Alex Turner",
    slaDeadline: "2026-04-02 12:00",
    createdAt: "2026-03-29",
  },
  {
    id: "4",
    ticketNumber: "TKT-00338",
    subject: "Custom field not saving on contact form",
    account: "HealthPlus Systems",
    priority: "MEDIUM",
    status: "IN_PROGRESS",
    assignedTo: "Dana Park",
    slaDeadline: "2026-04-04 17:00",
    createdAt: "2026-03-28",
  },
  {
    id: "5",
    ticketNumber: "TKT-00337",
    subject: "Email notifications not being sent",
    account: "CloudBuild Technologies",
    priority: "MEDIUM",
    status: "OPEN",
    assignedTo: "Maya Rodriguez",
    slaDeadline: "2026-04-04 09:00",
    createdAt: "2026-03-27",
  },
  {
    id: "6",
    ticketNumber: "TKT-00336",
    subject: "Dashboard loading slowly (>10 sec)",
    account: "Manufactura Group",
    priority: "LOW",
    status: "RESOLVED",
    assignedTo: "Dana Park",
    slaDeadline: "2026-04-06 17:00",
    createdAt: "2026-03-25",
  },
  {
    id: "7",
    ticketNumber: "TKT-00335",
    subject: "Data import wizard crashes on large files",
    account: "LogisticsPro",
    priority: "HIGH",
    status: "RESOLVED",
    assignedTo: "Alex Turner",
    slaDeadline: "2026-03-28 17:00",
    createdAt: "2026-03-24",
  },
  {
    id: "8",
    ticketNumber: "TKT-00334",
    subject: "API rate limit documentation unclear",
    account: "Quantum Data AI",
    priority: "LOW",
    status: "CLOSED",
    assignedTo: "Dana Park",
    slaDeadline: "2026-03-31 17:00",
    createdAt: "2026-03-22",
  },
];

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_STYLES[priority]}`}
    >
      {priority}
    </span>
  );
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    account: "",
    priority: "MEDIUM" as Priority,
    assignedTo: "",
    slaDeadline: "",
  });

  const filtered = tickets.filter(
    (t) =>
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.account.toLowerCase().includes(search.toLowerCase()) ||
      t.ticketNumber.toLowerCase().includes(search.toLowerCase())
  );

  const openTickets = tickets.filter(
    (t) => t.status === "OPEN" || t.status === "IN_PROGRESS" || t.status === "PENDING"
  ).length;
  const inProgress = tickets.filter((t) => t.status === "IN_PROGRESS").length;
  const avgResolution = "4.2 hrs";
  const satisfaction = "94%";

  function handleAdd() {
    if (!form.subject || !form.account) return;
    const nextNum = String(341 + tickets.length + 1).padStart(5, "0");
    const newTicket: SupportTicket = {
      id: String(tickets.length + 1),
      ticketNumber: `TKT-${nextNum}`,
      subject: form.subject,
      account: form.account,
      priority: form.priority,
      status: "OPEN",
      assignedTo: form.assignedTo || "Unassigned",
      slaDeadline: form.slaDeadline || "",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setTickets((prev) => [newTicket, ...prev]);
    setForm({ subject: "", account: "", priority: "MEDIUM", assignedTo: "", slaDeadline: "" });
    setOpen(false);
  }

  const columns: Column<Record<string, unknown>>[] = [
    { key: "ticketNumber", label: "Ticket #", className: "w-28" },
    { key: "subject", label: "Subject" },
    { key: "account", label: "Account" },
    {
      key: "priority",
      label: "Priority",
      render: (v) => <PriorityBadge priority={v as Priority} />,
    },
    {
      key: "status",
      label: "Status",
      render: (v) => <StatusBadge status={STATUS_MAP[v as TicketStatus]} />,
    },
    { key: "assignedTo", label: "Assigned To" },
    { key: "slaDeadline", label: "SLA Deadline" },
    { key: "createdAt", label: "Created" },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Support Tickets"
        description="Track and resolve customer support requests"
      >
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Ticket
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Open Tickets"
          value={openTickets}
          subtitle="Requires attention"
          icon={<Ticket className="w-5 h-5" />}
        />
        <StatsCard
          title="In Progress"
          value={inProgress}
          subtitle="Currently being worked on"
          icon={<AlertTriangle className="w-5 h-5" />}
        />
        <StatsCard
          title="Avg Resolution Time"
          value={avgResolution}
          subtitle="Last 30 days"
          icon={<Clock className="w-5 h-5" />}
          trend={{ value: -8, label: "faster than last month" }}
        />
        <StatsCard
          title="Customer Satisfaction"
          value={satisfaction}
          subtitle="Based on CSAT surveys"
          icon={<Star className="w-5 h-5" />}
          trend={{ value: 2, label: "vs last month" }}
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <DataTable
          columns={columns}
          data={filtered as unknown as Record<string, unknown>[]}
          emptyMessage="No tickets found."
        />
      </div>

      {/* Add New Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Subject *</Label>
              <Input
                placeholder="Brief description of the issue"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Account *</Label>
              <Input
                placeholder="Customer account name"
                value={form.account}
                onChange={(e) => setForm({ ...form, account: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v as Priority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assign To</Label>
              <Input
                placeholder="Support rep name"
                value={form.assignedTo}
                onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>SLA Deadline</Label>
              <Input
                type="datetime-local"
                value={form.slaDeadline}
                onChange={(e) => setForm({ ...form, slaDeadline: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>Create Ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
