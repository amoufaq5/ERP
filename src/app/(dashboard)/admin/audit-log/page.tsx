"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Shield,
  FileText,
  User,
  Clock,
  Download,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Activity,
  Trash2,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useAuditLogger, type AuditEntry } from "@/lib/audit-logger";
import { downloadCSV, downloadJSON } from "@/lib/download";

// ---- Action badge color mapping ----
const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-500/15 text-green-700 border-green-500/30",
  READ: "bg-slate-500/15 text-slate-700 border-slate-500/30",
  UPDATE: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  DELETE: "bg-red-500/15 text-red-700 border-red-500/30",
  APPROVE: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  REJECT: "bg-rose-500/15 text-rose-700 border-rose-500/30",
  ESCALATE: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  LOGIN: "bg-gray-500/15 text-gray-700 border-gray-500/30",
  EXPORT: "bg-purple-500/15 text-purple-700 border-purple-500/30",
  IMPORT: "bg-indigo-500/15 text-indigo-700 border-indigo-500/30",
};

const MODULE_OPTIONS = ["All", "ERP", "CRM", "HR", "ATS", "ADMIN", "SYSTEM"];
const ACTION_OPTIONS = [
  "All",
  "CREATE",
  "READ",
  "UPDATE",
  "DELETE",
  "APPROVE",
  "REJECT",
  "ESCALATE",
  "LOGIN",
  "EXPORT",
  "IMPORT",
];

function ActionBadge({ action }: { action: string }) {
  const colorClass = ACTION_COLORS[action] || "bg-gray-500/15 text-gray-700 border-gray-500/30";
  return (
    <Badge variant="outline" className={colorClass}>
      {action}
    </Badge>
  );
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatShortDate(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---- Diff Viewer ----
function DiffViewer({
  oldValues,
  newValues,
}: {
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
}) {
  if (!oldValues && !newValues) return null;

  const allKeys = Array.from(
    new Set([
      ...Object.keys(oldValues || {}),
      ...Object.keys(newValues || {}),
    ])
  );

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <div className="grid grid-cols-3 bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <span>Field</span>
        <span>Old Value</span>
        <span>New Value</span>
      </div>
      {allKeys.map((key) => {
        const oldVal = oldValues?.[key];
        const newVal = newValues?.[key];
        const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
        return (
          <div
            key={key}
            className={`grid grid-cols-3 px-3 py-2 text-sm border-t border-border ${
              changed ? "bg-yellow-50/50 dark:bg-yellow-900/10" : ""
            }`}
          >
            <span className="font-medium text-foreground">{key}</span>
            <span className={changed ? "text-red-600 line-through" : "text-muted-foreground"}>
              {oldVal !== undefined ? (typeof oldVal === "object" ? JSON.stringify(oldVal) : String(oldVal)) : "—"}
            </span>
            <span className={changed ? "text-green-600 font-medium" : "text-muted-foreground"}>
              {newVal !== undefined ? (typeof newVal === "object" ? JSON.stringify(newVal) : String(newVal)) : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---- Detail Dialog ----
function AuditDetailDialog({
  entry,
  open,
  onOpenChange,
  relatedEntries,
  userTimeline,
}: {
  entry: AuditEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relatedEntries: AuditEntry[];
  userTimeline: AuditEntry[];
}) {
  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Audit Entry Details
          </DialogTitle>
          <DialogDescription>
            {entry.id} - {formatTimestamp(entry.timestamp)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Core Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">User</span>
              <p className="font-medium">{entry.userName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Role</span>
              <p className="font-medium">{entry.userRole}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Action</span>
              <div className="mt-0.5">
                <ActionBadge action={entry.action} />
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Module</span>
              <p className="font-medium">{entry.module}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Entity</span>
              <p className="font-medium">{entry.entity}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Entity ID</span>
              <p className="font-medium font-mono text-xs">{entry.entityId}</p>
            </div>
            {entry.entityName && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Entity Name</span>
                <p className="font-medium">{entry.entityName}</p>
              </div>
            )}
            {entry.ipAddress && (
              <div>
                <span className="text-muted-foreground">IP Address</span>
                <p className="font-medium font-mono text-xs">{entry.ipAddress}</p>
              </div>
            )}
          </div>

          {/* Details */}
          {entry.details && (
            <div>
              <h4 className="text-sm font-semibold mb-1.5">Details</h4>
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                {entry.details}
              </p>
            </div>
          )}

          {/* Old/New Values Diff */}
          {(entry.oldValues || entry.newValues) && (
            <div>
              <h4 className="text-sm font-semibold mb-1.5">Changes</h4>
              <DiffViewer oldValues={entry.oldValues} newValues={entry.newValues} />
            </div>
          )}

          {/* Related Entries */}
          {relatedEntries.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-1.5">
                Related Actions on {entry.entity} ({entry.entityId})
              </h4>
              <div className="space-y-1.5">
                {relatedEntries.map((re) => (
                  <div
                    key={re.id}
                    className="flex items-center gap-2 text-sm px-3 py-2 bg-muted/30 rounded-md"
                  >
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                      {formatShortDate(re.timestamp)}
                    </span>
                    <ActionBadge action={re.action} />
                    <span className="truncate">{re.userName}</span>
                    <span className="text-muted-foreground truncate">{re.details?.slice(0, 60)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Timeline */}
          {userTimeline.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-1.5">
                Recent Activity by {entry.userName}
              </h4>
              <div className="space-y-1.5">
                {userTimeline.slice(0, 8).map((te) => (
                  <div
                    key={te.id}
                    className="flex items-center gap-2 text-sm px-3 py-2 bg-muted/30 rounded-md"
                  >
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                      {formatShortDate(te.timestamp)}
                    </span>
                    <ActionBadge action={te.action} />
                    <span className="text-muted-foreground truncate">
                      {te.entity} - {te.entityId}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Expandable Row ----
function ExpandableRow({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);

  if (!entry.oldValues && !entry.newValues) return null;

  return (
    <div className="mt-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        className="flex items-center gap-1 text-xs text-primary hover:underline"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {expanded ? "Hide changes" : "View changes"}
      </button>
      {expanded && (
        <div className="mt-2">
          <DiffViewer oldValues={entry.oldValues} newValues={entry.newValues} />
        </div>
      )}
    </div>
  );
}

// ---- Main Page ----
export default function AuditLogPage() {
  const { logs, getAuditLogs } = useAuditLogger();

  // Filters
  const [moduleFilter, setModuleFilter] = useState("All");
  const [actionFilter, setActionFilter] = useState("All");
  const [entityFilter, setEntityFilter] = useState("All");
  const [userSearch, setUserSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Detail dialog
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Unique entities from all logs
  const entityOptions = useMemo(() => {
    const entities = new Set(logs.map((l) => l.entity));
    return ["All", ...Array.from(entities).sort()];
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return getAuditLogs({
      module: moduleFilter,
      action: actionFilter,
      entity: entityFilter,
      userName: userSearch || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      search: searchQuery || undefined,
    });
  }, [getAuditLogs, moduleFilter, actionFilter, entityFilter, userSearch, dateFrom, dateTo, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayLogs = logs.filter((l) => new Date(l.timestamp) >= todayStart);

    // Most active user
    const userCounts: Record<string, { name: string; count: number }> = {};
    todayLogs.forEach((l) => {
      if (!userCounts[l.userId]) {
        userCounts[l.userId] = { name: l.userName, count: 0 };
      }
      userCounts[l.userId].count++;
    });
    const mostActiveUser = Object.values(userCounts).sort((a, b) => b.count - a.count)[0];

    // Most modified entity
    const entityCounts: Record<string, number> = {};
    todayLogs.forEach((l) => {
      entityCounts[l.entity] = (entityCounts[l.entity] || 0) + 1;
    });
    const mostModified = Object.entries(entityCounts).sort(([, a], [, b]) => b - a)[0];

    // Delete count
    const deleteCount = todayLogs.filter((l) => l.action === "DELETE").length;

    // Suspicious - multiple failed logins or many deletes
    const suspiciousCount = todayLogs.filter(
      (l) => l.action === "DELETE" || l.action === "ESCALATE"
    ).length;

    return {
      totalToday: todayLogs.length,
      mostActiveUser: mostActiveUser
        ? `${mostActiveUser.name} (${mostActiveUser.count})`
        : "No activity",
      mostModifiedEntity: mostModified ? `${mostModified[0]} (${mostModified[1]})` : "No activity",
      deleteCount,
      suspiciousCount,
    };
  }, [logs]);

  // Related entries for selected
  const relatedEntries = useMemo(() => {
    if (!selectedEntry) return [];
    return logs.filter(
      (l) =>
        l.id !== selectedEntry.id &&
        l.entityId === selectedEntry.entityId &&
        l.entity === selectedEntry.entity
    );
  }, [logs, selectedEntry]);

  // User timeline for selected
  const userTimeline = useMemo(() => {
    if (!selectedEntry) return [];
    return logs.filter(
      (l) => l.id !== selectedEntry.id && l.userId === selectedEntry.userId
    );
  }, [logs, selectedEntry]);

  // Export handlers
  const handleExportCSV = useCallback(() => {
    const csvData = filteredLogs.map((l) => ({
      Timestamp: formatTimestamp(l.timestamp),
      User: l.userName,
      Role: l.userRole,
      Action: l.action,
      Module: l.module,
      Entity: l.entity,
      EntityID: l.entityId,
      EntityName: l.entityName || "",
      Details: l.details || "",
      IPAddress: l.ipAddress || "",
    }));
    downloadCSV("audit-log-export.csv", csvData);
  }, [filteredLogs]);

  const handleExportJSON = useCallback(() => {
    downloadJSON("audit-log-export.json", filteredLogs);
  }, [filteredLogs]);

  // Handle row click
  const handleRowClick = useCallback((row: AuditEntry) => {
    setSelectedEntry(row);
    setDetailOpen(true);
  }, []);

  // Clear filters
  const hasFilters =
    moduleFilter !== "All" ||
    actionFilter !== "All" ||
    entityFilter !== "All" ||
    userSearch !== "" ||
    searchQuery !== "" ||
    dateFrom !== "" ||
    dateTo !== "";

  const clearFilters = useCallback(() => {
    setModuleFilter("All");
    setActionFilter("All");
    setEntityFilter("All");
    setUserSearch("");
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
  }, []);

  // Table columns
  const columns: Column<AuditEntry>[] = useMemo(
    () => [
      {
        key: "timestamp",
        label: "Timestamp",
        sortable: true,
        className: "whitespace-nowrap",
        render: (val: string) => (
          <span className="text-xs font-mono text-muted-foreground">
            {formatTimestamp(val)}
          </span>
        ),
      },
      {
        key: "userName",
        label: "User",
        sortable: true,
        render: (val: string, row: AuditEntry) => (
          <div>
            <p className="font-medium text-sm">{val}</p>
            <p className="text-xs text-muted-foreground">{row.userRole}</p>
          </div>
        ),
      },
      {
        key: "action",
        label: "Action",
        sortable: true,
        render: (val: string) => <ActionBadge action={val} />,
      },
      {
        key: "module",
        label: "Module",
        sortable: true,
        render: (val: string) => (
          <Badge variant="secondary" className="font-mono text-xs">
            {val}
          </Badge>
        ),
      },
      {
        key: "entity",
        label: "Entity",
        sortable: true,
      },
      {
        key: "entityId",
        label: "Entity ID",
        className: "font-mono text-xs",
        render: (val: string) => (
          <span className="font-mono text-xs">{val}</span>
        ),
      },
      {
        key: "details",
        label: "Details",
        className: "max-w-[300px]",
        render: (val: string, row: AuditEntry) => (
          <div>
            <p className="text-sm text-muted-foreground truncate max-w-[280px]">
              {val || "—"}
            </p>
            <ExpandableRow entry={row} />
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
            <p className="text-sm text-muted-foreground">
              System-wide activity tracking and compliance log
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON}>
            <FileText className="h-4 w-4 mr-1.5" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Actions Today
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{stats.totalToday}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Most Active User
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-sm font-semibold truncate">{stats.mostActiveUser}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Most Modified
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-sm font-semibold truncate">{stats.mostModifiedEntity}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Trash2 className="h-3.5 w-3.5" />
              Delete Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p
              className={`text-2xl font-bold ${
                stats.deleteCount > 5 ? "text-red-600" : ""
              }`}
            >
              {stats.deleteCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Flagged Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p
              className={`text-2xl font-bold ${
                stats.suspiciousCount > 3 ? "text-orange-600" : ""
              }`}
            >
              {stats.suspiciousCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Filters</span>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {/* Date From */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Module */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Module</label>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODULE_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Action</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Entity */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Entity</label>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {entityOptions.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User Search */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">User</label>
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search user..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="h-9 text-sm pl-8"
                />
              </div>
            </div>

            {/* Global Search */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search all fields..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 text-sm pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{filteredLogs.length}</span>{" "}
          {filteredLogs.length === 1 ? "entry" : "entries"} found
          {hasFilters && (
            <span>
              {" "}
              (filtered from {logs.length} total)
            </span>
          )}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Sorted by newest first
        </div>
      </div>

      {/* Data Table */}
      <DataTable<AuditEntry>
        columns={columns}
        data={filteredLogs}
        pagination
        onRowClick={handleRowClick}
        emptyMessage="No audit entries match the current filters."
      />

      {/* Detail Dialog */}
      <AuditDetailDialog
        entry={selectedEntry}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        relatedEntries={relatedEntries}
        userTimeline={userTimeline}
      />
    </div>
  );
}
