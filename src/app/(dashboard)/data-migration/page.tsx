"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RefreshCw,
  HardDrive,
  Layers,
  FileText,
  Play,
  Pause,
  RotateCcw,
  Plus,
} from "lucide-react";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";

interface MigrationJob {
  id: string;
  name: string;
  source: string;
  destination: string;
  status: "completed" | "running" | "pending" | "failed";
  progress: number;
  recordsTotal: number;
  recordsMigrated: number;
  startedAt: string;
  duration: string;
  errors: number;
}

interface DataSource {
  id: string;
  name: string;
  type: string;
  icon: React.ReactNode;
  recordCount: number;
  lastSync: string;
  status: "connected" | "disconnected";
}

const migrationJobs: MigrationJob[] = [
  {
    id: "MIG-001",
    name: "Customer Records Import",
    source: "Legacy CRM (CSV)",
    destination: "CRM Contacts",
    status: "completed",
    progress: 100,
    recordsTotal: 12450,
    recordsMigrated: 12450,
    startedAt: "Apr 2, 2026 09:00 AM",
    duration: "23 min",
    errors: 0,
  },
  {
    id: "MIG-002",
    name: "Product Catalog Sync",
    source: "ERP System (API)",
    destination: "Inventory Module",
    status: "running",
    progress: 67,
    recordsTotal: 8340,
    recordsMigrated: 5588,
    startedAt: "Apr 3, 2026 10:15 AM",
    duration: "12 min",
    errors: 3,
  },
  {
    id: "MIG-003",
    name: "Employee Data Migration",
    source: "HR System (Excel)",
    destination: "HR & Payroll",
    status: "pending",
    progress: 0,
    recordsTotal: 156,
    recordsMigrated: 0,
    startedAt: "Scheduled: Apr 4, 2026",
    duration: "—",
    errors: 0,
  },
  {
    id: "MIG-004",
    name: "Financial Transactions Import",
    source: "QuickBooks (API)",
    destination: "Finance Module",
    status: "completed",
    progress: 100,
    recordsTotal: 45230,
    recordsMigrated: 45230,
    startedAt: "Apr 1, 2026 02:00 PM",
    duration: "1h 12min",
    errors: 12,
  },
  {
    id: "MIG-005",
    name: "Vendor Database Import",
    source: "Spreadsheet (CSV)",
    destination: "Procurement",
    status: "failed",
    progress: 34,
    recordsTotal: 890,
    recordsMigrated: 303,
    startedAt: "Apr 2, 2026 04:30 PM",
    duration: "8 min",
    errors: 47,
  },
];

const dataSources: DataSource[] = [
  { id: "ds-1", name: "CSV / Excel Files", type: "File Upload", icon: <FileSpreadsheet className="h-5 w-5" />, recordCount: 0, lastSync: "Manual", status: "connected" },
  { id: "ds-2", name: "Legacy ERP System", type: "API Connection", icon: <HardDrive className="h-5 w-5" />, recordCount: 34500, lastSync: "2 hours ago", status: "connected" },
  { id: "ds-3", name: "QuickBooks Online", type: "API Connection", icon: <Database className="h-5 w-5" />, recordCount: 45230, lastSync: "1 day ago", status: "connected" },
  { id: "ds-4", name: "Salesforce CRM", type: "API Connection", icon: <Layers className="h-5 w-5" />, recordCount: 12450, lastSync: "3 days ago", status: "disconnected" },
  { id: "ds-5", name: "Google Sheets", type: "Integration", icon: <FileText className="h-5 w-5" />, recordCount: 890, lastSync: "5 days ago", status: "connected" },
];

const statusConfig = {
  completed: { label: "Completed", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100", badgeVariant: "success" as const },
  running: { label: "Running", icon: RefreshCw, color: "text-blue-600", bg: "bg-blue-100", badgeVariant: "default" as const },
  pending: { label: "Pending", icon: Clock, color: "text-gray-500", bg: "bg-gray-100", badgeVariant: "secondary" as const },
  failed: { label: "Failed", icon: XCircle, color: "text-red-600", bg: "bg-red-100", badgeVariant: "destructive" as const },
};

const jobFields: EntityField[] = [
  { name: "name", label: "Job Name", type: "text", required: true },
  { name: "source", label: "Source", type: "text", required: true },
  { name: "destination", label: "Destination", type: "select", required: true, options: [
    { label: "CRM Contacts", value: "CRM Contacts" },
    { label: "Inventory Module", value: "Inventory Module" },
    { label: "HR & Payroll", value: "HR & Payroll" },
    { label: "Finance Module", value: "Finance Module" },
    { label: "Procurement", value: "Procurement" },
  ]},
  { name: "recordsTotal", label: "Estimated Records", type: "number" },
];

const sourceFields: EntityField[] = [
  { name: "name", label: "Source Name", type: "text", required: true },
  { name: "type", label: "Connection Type", type: "select", required: true, options: [
    { label: "File Upload", value: "File Upload" },
    { label: "API Connection", value: "API Connection" },
    { label: "Integration", value: "Integration" },
  ]},
  { name: "recordCount", label: "Record Count", type: "number" },
];

type ModalMode =
  | { kind: "job"; editing: MigrationJob | null }
  | { kind: "source"; editing: DataSource | null }
  | null;

const sourceIcons: Record<string, React.ReactNode> = {
  "File Upload": <FileSpreadsheet className="h-5 w-5" />,
  "API Connection": <HardDrive className="h-5 w-5" />,
  "Integration": <FileText className="h-5 w-5" />,
};

export default function DataMigrationPage() {
  const [jobs, setJobs] = useState(migrationJobs);
  const [sources, setSources] = useState(dataSources);
  const [modal, setModal] = useState<ModalMode>(null);
  const [jobFilters, setJobFilters] = useState<FilterState>({ _search: "", status: "" });

  const filteredJobs = jobs.filter((j) => {
    if (jobFilters.status && j.status !== jobFilters.status) return false;
    if (jobFilters._search) {
      const q = jobFilters._search.toLowerCase();
      return j.name.toLowerCase().includes(q) || j.id.toLowerCase().includes(q) || j.source.toLowerCase().includes(q);
    }
    return true;
  });

  const stats = {
    total: jobs.length,
    completed: jobs.filter((j) => j.status === "completed").length,
    running: jobs.filter((j) => j.status === "running").length,
    failed: jobs.filter((j) => j.status === "failed").length,
    totalRecords: jobs.reduce((sum, j) => sum + j.recordsMigrated, 0),
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Data Migration</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Import, export, and migrate data between systems
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setModal({ kind: "job", editing: null })}>
          <Plus className="h-4 w-4" />
          New Import
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-blue-600">{stats.running}</p>
              <RefreshCw className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Running</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Failed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{stats.totalRecords.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Records Migrated</p>
          </CardContent>
        </Card>
      </div>

      {/* Migration Jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Migration Jobs</CardTitle>
          <CardDescription className="text-xs">Recent and active data migration tasks</CardDescription>
          <FilterBar
            searchValue={jobFilters._search}
            onSearchChange={(v) => setJobFilters((f) => ({ ...f, _search: v }))}
            fields={[
              { key: "status", label: "Status", type: "select", options: [
                { label: "Completed", value: "completed" },
                { label: "Running", value: "running" },
                { label: "Pending", value: "pending" },
                { label: "Failed", value: "failed" },
              ]},
            ]}
            values={jobFilters}
            onChange={(k, v) => setJobFilters((f) => ({ ...f, [k]: v }))}
          />
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={[
              {
                key: "name",
                label: "Job",
                render: (_v: unknown, row: Record<string, unknown>) => {
                  const job = row as unknown as MigrationJob;
                  return (
                    <div>
                      <p className="text-sm font-medium">{job.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{job.id}</p>
                    </div>
                  );
                },
              },
              {
                key: "source",
                label: "Source → Destination",
                render: (_v: unknown, row: Record<string, unknown>) => {
                  const job = row as unknown as MigrationJob;
                  return (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">{job.source}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="font-medium">{job.destination}</span>
                    </div>
                  );
                },
              },
              {
                key: "status",
                label: "Status",
                render: (_v: unknown, row: Record<string, unknown>) => {
                  const job = row as unknown as MigrationJob;
                  const config = statusConfig[job.status];
                  const StatusIcon = config.icon;
                  return (
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className={`h-3.5 w-3.5 ${config.color} ${job.status === "running" ? "animate-spin" : ""}`} />
                      <Badge variant={config.badgeVariant} className="text-xs">{config.label}</Badge>
                    </div>
                  );
                },
              },
              {
                key: "progress",
                label: "Progress",
                render: (_v: unknown, row: Record<string, unknown>) => {
                  const job = row as unknown as MigrationJob;
                  return (
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            job.status === "failed" ? "bg-red-500" : job.status === "completed" ? "bg-green-500" : "bg-blue-500"
                          }`}
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{job.progress}%</span>
                    </div>
                  );
                },
              },
              {
                key: "recordsMigrated",
                label: "Records",
                render: (_v: unknown, row: Record<string, unknown>) => {
                  const job = row as unknown as MigrationJob;
                  return (
                    <div className="text-xs">
                      <span className="font-medium">{job.recordsMigrated.toLocaleString()}</span>
                      <span className="text-muted-foreground"> / {job.recordsTotal.toLocaleString()}</span>
                      {job.errors > 0 && (
                        <div className="flex items-center gap-1 mt-0.5 text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          <span>{job.errors} errors</span>
                        </div>
                      )}
                    </div>
                  );
                },
              },
              {
                key: "duration",
                label: "Duration",
                render: (v: unknown) => <span className="text-xs text-muted-foreground">{String(v)}</span>,
              },
              {
                key: "id",
                label: "Actions",
                render: (_v: unknown, row: Record<string, unknown>) => {
                  const job = row as unknown as MigrationJob;
                  return (
                    <EditDeleteMenu
                      onEdit={() => setModal({ kind: "job", editing: job })}
                      onDelete={() => setJobs((prev) => prev.filter((j) => j.id !== job.id))}
                      itemLabel={job.name}
                      extraItems={(() => {
                        const flow: Record<string, { label: string; status: MigrationJob["status"]; progress?: number }> = {
                          pending: { label: "Start Job", status: "running" },
                          running: { label: "Pause Job", status: "pending" },
                          failed: { label: "Retry Job", status: "running", progress: 0 },
                        };
                        const next = flow[job.status];
                        if (!next) return [];
                        return [{
                          label: next.label,
                          icon: job.status === "pending" ? <Play className="h-4 w-4" /> : job.status === "running" ? <Pause className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />,
                          onClick: () => setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, status: next.status, ...(next.progress !== undefined ? { progress: next.progress } : {}) } : j)),
                        }];
                      })()}
                    />
                  );
                },
              },
            ] as Column<Record<string, unknown>>[]}
            data={filteredJobs as unknown as Record<string, unknown>[]}
            pagination={false}
            emptyMessage="No migration jobs found."
          />
        </CardContent>
      </Card>

      {/* Data Sources */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Connected Data Sources</CardTitle>
              <CardDescription className="text-xs">Manage your import/export connections</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => setModal({ kind: "source", editing: null })}>
              <Plus className="h-3.5 w-3.5" />
              Add Source
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {sources.map((source) => (
              <Card key={source.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-primary">{source.icon}</div>
                    <div className="flex items-center gap-1">
                      <Badge
                        variant={source.status === "connected" ? "success" : "destructive"}
                        className="text-[10px]"
                      >
                        {source.status === "connected" ? "Connected" : "Disconnected"}
                      </Badge>
                      <EditDeleteMenu
                        onEdit={() => setModal({ kind: "source", editing: source })}
                        onDelete={() => setSources((prev) => prev.filter((s) => s.id !== source.id))}
                        itemLabel={source.name}
                        extraItems={[{
                          label: source.status === "connected" ? "Disconnect" : "Connect",
                          onClick: () => setSources((prev) => prev.map((s) => s.id === source.id ? { ...s, status: s.status === "connected" ? "disconnected" : "connected" } : s)),
                        }]}
                      />
                    </div>
                  </div>
                  <p className="text-sm font-semibold">{source.name}</p>
                  <p className="text-xs text-muted-foreground">{source.type}</p>
                  <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                    <span>{source.recordCount > 0 ? `${source.recordCount.toLocaleString()} records` : "—"}</span>
                    <span>{source.lastSync}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
      {/* Job Modal */}
      <EntityFormModal
        open={modal?.kind === "job"}
        onOpenChange={(open) => !open && setModal(null)}
        title={modal?.kind === "job" && modal.editing ? "Edit Migration Job" : "New Migration Job"}
        fields={jobFields}
        initialData={modal?.kind === "job" && modal.editing ? {
          name: modal.editing.name,
          source: modal.editing.source,
          destination: modal.editing.destination,
          recordsTotal: modal.editing.recordsTotal,
        } : undefined}
        onSubmit={(data) => {
          if (modal?.kind === "job" && modal.editing) {
            setJobs((prev) => prev.map((j) => j.id === modal.editing!.id ? { ...j, name: data.name as string, source: data.source as string, destination: data.destination as string, recordsTotal: (data.recordsTotal as number) || j.recordsTotal } : j));
          } else {
            const newJob: MigrationJob = {
              id: `MIG-${String(jobs.length + 1).padStart(3, "0")}`,
              name: data.name as string,
              source: data.source as string,
              destination: data.destination as string,
              status: "pending",
              progress: 0,
              recordsTotal: (data.recordsTotal as number) || 0,
              recordsMigrated: 0,
              startedAt: "Scheduled",
              duration: "—",
              errors: 0,
            };
            setJobs((prev) => [...prev, newJob]);
          }
          setModal(null);
        }}
      />

      {/* Source Modal */}
      <EntityFormModal
        open={modal?.kind === "source"}
        onOpenChange={(open) => !open && setModal(null)}
        title={modal?.kind === "source" && modal.editing ? "Edit Data Source" : "Add Data Source"}
        fields={sourceFields}
        initialData={modal?.kind === "source" && modal.editing ? {
          name: modal.editing.name,
          type: modal.editing.type,
          recordCount: modal.editing.recordCount,
        } : undefined}
        onSubmit={(data) => {
          if (modal?.kind === "source" && modal.editing) {
            setSources((prev) => prev.map((s) => s.id === modal.editing!.id ? { ...s, name: data.name as string, type: data.type as string, recordCount: (data.recordCount as number) || s.recordCount, icon: sourceIcons[data.type as string] || <Database className="h-5 w-5" /> } : s));
          } else {
            const newSource: DataSource = {
              id: `ds-${sources.length + 1}`,
              name: data.name as string,
              type: data.type as string,
              icon: sourceIcons[data.type as string] || <Database className="h-5 w-5" />,
              recordCount: (data.recordCount as number) || 0,
              lastSync: "Never",
              status: "disconnected",
            };
            setSources((prev) => [...prev, newSource]);
          }
          setModal(null);
        }}
      />
    </div>
  );
}
