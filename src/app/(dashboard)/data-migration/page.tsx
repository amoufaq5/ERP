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
  Upload,
  Download,
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
  Settings,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";

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

export default function DataMigrationPage() {
  const [jobs] = useState(migrationJobs);

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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button size="sm" className="gap-1.5">
            <Upload className="h-4 w-4" />
            New Import
          </Button>
        </div>
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
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left p-3 font-medium">Job</th>
                <th className="text-left p-3 font-medium">Source → Destination</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Progress</th>
                <th className="text-left p-3 font-medium">Records</th>
                <th className="text-left p-3 font-medium">Duration</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const config = statusConfig[job.status];
                const StatusIcon = config.icon;
                return (
                  <tr key={job.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-3">
                      <p className="text-sm font-medium">{job.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{job.id}</p>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">{job.source}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="font-medium">{job.destination}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <StatusIcon className={`h-3.5 w-3.5 ${config.color} ${job.status === "running" ? "animate-spin" : ""}`} />
                        <Badge variant={config.badgeVariant} className="text-xs">
                          {config.label}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-3">
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
                    </td>
                    <td className="p-3 text-xs">
                      <span className="font-medium">{job.recordsMigrated.toLocaleString()}</span>
                      <span className="text-muted-foreground"> / {job.recordsTotal.toLocaleString()}</span>
                      {job.errors > 0 && (
                        <div className="flex items-center gap-1 mt-0.5 text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          <span>{job.errors} errors</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{job.duration}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {job.status === "running" && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Pause className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {job.status === "pending" && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {job.status === "failed" && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add Source
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {dataSources.map((source) => (
              <Card key={source.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-primary">{source.icon}</div>
                    <Badge
                      variant={source.status === "connected" ? "success" : "destructive"}
                      className="text-[10px]"
                    >
                      {source.status === "connected" ? "Connected" : "Disconnected"}
                    </Badge>
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
    </div>
  );
}

function Plus(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14" /><path d="M12 5v14" />
    </svg>
  );
}
