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
import PageHeader from "@/components/shared/page-header";
import { useAuditLogger, type AuditEntry as LegacyAuditEntry } from "@/lib/audit-logger";
import {
  AuditAction,
  AuditEntity,
  type AuditEntry,
  type AuditFilters,
  getAuditLog,
  getAuditLogCount,
} from "@/lib/audit/audit-service";
import { downloadCSV, downloadJSON } from "@/lib/download";

// ---------------------------------------------------------------------------
// Merged entry type — we unify legacy AuditLogger entries and new AuditEntry
// records into a single display row.
// ---------------------------------------------------------------------------

interface DisplayRow {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  entityName: string;
  details: string;
  ipAddress: string;
  // For diff dialog
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changes?: { field: string; from: unknown; to: unknown }[];
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Action badge color mapping
// ---------------------------------------------------------------------------

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-500/15 text-green-700 border-green-500/30",
  UPDATE: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  DELETE: "bg-red-500/15 text-red-700 border-red-500/30",
  APPROVE: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  REJECT: "bg-rose-500/15 text-rose-700 border-rose-500/30",
  ESCALATE: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  LOGIN: "bg-gray-500/15 text-gray-700 border-gray-500/30",
  LOGOUT: "bg-gray-500/15 text-gray-600 border-gray-500/30",
  EXPORT: "bg-purple-500/15 text-purple-700 border-purple-500/30",
  IMPORT: "bg-indigo-500/15 text-indigo-700 border-indigo-500/30",
  VIEW_SENSITIVE: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  ROLE_CHANGE: "bg-cyan-500/15 text-cyan-700 border-cyan-500/30",
  SETTINGS_CHANGE: "bg-teal-500/15 text-teal-700 border-teal-500/30",
  READ: "bg-slate-500/15 text-slate-700 border-slate-500/30",
};

const ACTION_OPTIONS = [
  "All",
  ...Object.values(AuditAction),
  // Legacy actions not in AuditAction
  "READ",
  "IMPORT",
];
// Deduplicate
const UNIQUE_ACTION_OPTIONS = Array.from(new Set(ACTION_OPTIONS));

const ENTITY_OPTIONS = [
  "All",
  ...Object.values(AuditEntity),
];

function ActionBadge({ action }: { action: string }) {
  const colorClass =
    ACTION_COLORS[action] || "bg-gray-500/15 text-gray-700 border-gray-500/30";
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

// ---------------------------------------------------------------------------
// Diff Viewer
// ---------------------------------------------------------------------------

function DiffViewer({
  oldValues,
  newValues,
  changes,
}: {
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changes?: { field: string; from: unknown; to: unknown }[];
}) {
  // If we have structured changes from the new audit service, display those
  if (changes && changes.length > 0) {
    return (
      <div className="rounded-md border border-border overflow-hidden">
        <div className="grid grid-cols-3 bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Field</span>
          <span>Before</span>
          <span>After</span>
        </div>
        {changes.map((c) => (
          <div
            key={c.field}
            className="grid grid-cols-3 px-3 py-2 text-sm border-t border-border bg-yellow-50/50 dark:bg-yellow-900/10"
          >
            <span className="font-medium text-foreground">{c.field}</span>
            <span className="text-red-600 line-through">
              {c.from !== undefined
                ? typeof c.from === "object"
                  ? JSON.stringify(c.from)
                  : String(c.from)
                : "—"}
            </span>
            <span className="text-green-600 font-medium">
              {c.to !== undefined
                ? typeof c.to === "object"
                  ? JSON.stringify(c.to)
                  : String(c.to)
                : "—"}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // Fall back to legacy oldValues/newValues format
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
            <span
              className={
                changed
                  ? "text-red-600 line-through"
                  : "text-muted-foreground"
              }
            >
              {oldVal !== undefined
                ? typeof oldVal === "object"
                  ? JSON.stringify(oldVal)
                  : String(oldVal)
                : "—"}
            </span>
            <span
              className={
                changed
                  ? "text-green-600 font-medium"
                  : "text-muted-foreground"
              }
            >
              {newVal !== undefined
                ? typeof newVal === "object"
                  ? JSON.stringify(newVal)
                  : String(newVal)
                : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail Dialog
// ---------------------------------------------------------------------------

function AuditDetailDialog({
  entry,
  open,
  onOpenChange,
  relatedEntries,
  userTimeline,
}: {
  entry: DisplayRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relatedEntries: DisplayRow[];
  userTimeline: DisplayRow[];
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
            {entry.id} &mdash; {formatTimestamp(entry.timestamp)}
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
              <span className="text-muted-foreground">Entity</span>
              <p className="font-medium">{entry.entity}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Entity ID</span>
              <p className="font-medium font-mono text-xs">{entry.entityId}</p>
            </div>
            {entry.entityName && (
              <div>
                <span className="text-muted-foreground">Entity Name</span>
                <p className="font-medium">{entry.entityName}</p>
              </div>
            )}
            {entry.ipAddress && (
              <div>
                <span className="text-muted-foreground">IP Address</span>
                <p className="font-medium font-mono text-xs">
                  {entry.ipAddress}
                </p>
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

          {/* Metadata */}
          {entry.metadata && Object.keys(entry.metadata).length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-1.5">Metadata</h4>
              <pre className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 overflow-x-auto">
                {JSON.stringify(entry.metadata, null, 2)}
              </pre>
            </div>
          )}

          {/* Changes Diff */}
          {(entry.changes || entry.oldValues || entry.newValues) && (
            <div>
              <h4 className="text-sm font-semibold mb-1.5">Changes</h4>
              <DiffViewer
                oldValues={entry.oldValues}
                newValues={entry.newValues}
                changes={entry.changes}
              />
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
                    <span className="text-muted-foreground truncate">
                      {re.details?.slice(0, 60)}
                    </span>
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

// ---------------------------------------------------------------------------
// Expandable Row
// ---------------------------------------------------------------------------

function ExpandableRow({ entry }: { entry: DisplayRow }) {
  const [expanded, setExpanded] = useState(false);

  if (!entry.oldValues && !entry.newValues && (!entry.changes || entry.changes.length === 0))
    return null;

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
          <DiffViewer
            oldValues={entry.oldValues}
            newValues={entry.newValues}
            changes={entry.changes}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Merge helper — convert legacy + new entries into unified DisplayRow
// ---------------------------------------------------------------------------

function legacyToDisplayRow(e: LegacyAuditEntry): DisplayRow {
  return {
    id: e.id,
    timestamp: e.timestamp,
    userName: e.userName,
    userRole: e.userRole,
    userId: e.userId,
    action: e.action,
    entity: e.entity,
    entityId: e.entityId,
    entityName: e.entityName ?? "",
    details: e.details ?? "",
    ipAddress: e.ipAddress ?? "",
    oldValues: e.oldValues,
    newValues: e.newValues,
  };
}

function auditEntryToDisplayRow(e: AuditEntry): DisplayRow {
  return {
    id: e.id,
    timestamp: e.timestamp,
    userName: e.userName,
    userRole: e.userRole,
    userId: e.userId,
    action: e.action,
    entity: e.entity,
    entityId: e.entityId,
    entityName: e.entityName ?? "",
    details: e.entityName
      ? `${e.userName} performed ${e.action} on ${e.entity} "${e.entityName}"`
      : `${e.userName} performed ${e.action} on ${e.entity} ${e.entityId}`,
    ipAddress: e.ipAddress ?? "",
    changes: e.changes,
    metadata: e.metadata,
  };
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AuditLogPage() {
  const { logs: legacyLogs, getAuditLogs: getLegacyLogs } = useAuditLogger();

  // Filters
  const [actionFilter, setActionFilter] = useState("All");
  const [entityFilter, setEntityFilter] = useState("All");
  const [userSearch, setUserSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Detail dialog
  const [selectedEntry, setSelectedEntry] = useState<DisplayRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Merge legacy + new audit entries into a single sorted list
  const allRows: DisplayRow[] = useMemo(() => {
    // Legacy entries
    const legacy = legacyLogs.map(legacyToDisplayRow);

    // New audit service entries
    const newEntries = getAuditLog().map(auditEntryToDisplayRow);

    // Merge and deduplicate by id, sort newest first
    const map = new Map<string, DisplayRow>();
    for (const row of legacy) map.set(row.id, row);
    for (const row of newEntries) map.set(row.id, row);

    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [legacyLogs]);

  // Unique entities from all rows (for entity filter dropdown)
  const entityOptions = useMemo(() => {
    const entities = new Set(allRows.map((r) => r.entity));
    return ["All", ...Array.from(entities).sort()];
  }, [allRows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      if (actionFilter !== "All" && row.action !== actionFilter) return false;
      if (entityFilter !== "All" && row.entity !== entityFilter) return false;

      if (userSearch) {
        const q = userSearch.toLowerCase();
        if (!row.userName.toLowerCase().includes(q)) return false;
      }

      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (new Date(row.timestamp) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(row.timestamp) > to) return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchable = [
          row.userName,
          row.userRole,
          row.action,
          row.entity,
          row.entityId,
          row.entityName,
          row.details,
          row.ipAddress,
        ]
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      return true;
    });
  }, [allRows, actionFilter, entityFilter, userSearch, dateFrom, dateTo, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const todayRows = allRows.filter(
      (r) => new Date(r.timestamp) >= todayStart
    );

    // Most active user
    const userCounts: Record<string, { name: string; count: number }> = {};
    todayRows.forEach((r) => {
      if (!userCounts[r.userId]) {
        userCounts[r.userId] = { name: r.userName, count: 0 };
      }
      userCounts[r.userId].count++;
    });
    const mostActiveUser = Object.values(userCounts).sort(
      (a, b) => b.count - a.count
    )[0];

    // Most modified entity
    const entityCounts: Record<string, number> = {};
    todayRows.forEach((r) => {
      entityCounts[r.entity] = (entityCounts[r.entity] || 0) + 1;
    });
    const mostModified = Object.entries(entityCounts).sort(
      ([, a], [, b]) => b - a
    )[0];

    const deleteCount = todayRows.filter((r) => r.action === "DELETE").length;
    const flaggedCount = todayRows.filter(
      (r) => r.action === "DELETE" || r.action === "ESCALATE"
    ).length;

    return {
      totalToday: todayRows.length,
      mostActiveUser: mostActiveUser
        ? `${mostActiveUser.name} (${mostActiveUser.count})`
        : "No activity",
      mostModifiedEntity: mostModified
        ? `${mostModified[0]} (${mostModified[1]})`
        : "No activity",
      deleteCount,
      flaggedCount,
    };
  }, [allRows]);

  // Related entries for selected row
  const relatedEntries = useMemo(() => {
    if (!selectedEntry) return [];
    return allRows.filter(
      (r) =>
        r.id !== selectedEntry.id &&
        r.entityId === selectedEntry.entityId &&
        r.entity === selectedEntry.entity
    );
  }, [allRows, selectedEntry]);

  // User timeline for selected row
  const userTimeline = useMemo(() => {
    if (!selectedEntry) return [];
    return allRows.filter(
      (r) => r.id !== selectedEntry.id && r.userId === selectedEntry.userId
    );
  }, [allRows, selectedEntry]);

  // Export handlers
  const handleExportCSV = useCallback(() => {
    const csvData = filteredRows.map((r) => ({
      Timestamp: formatTimestamp(r.timestamp),
      User: r.userName,
      Role: r.userRole,
      Action: r.action,
      Entity: r.entity,
      EntityID: r.entityId,
      EntityName: r.entityName || "",
      Details: r.details || "",
      IPAddress: r.ipAddress || "",
    }));
    downloadCSV("audit-log-export.csv", csvData);
  }, [filteredRows]);

  const handleExportJSON = useCallback(() => {
    downloadJSON("audit-log-export.json", filteredRows);
  }, [filteredRows]);

  // Handle row click
  const handleRowClick = useCallback((row: DisplayRow) => {
    setSelectedEntry(row);
    setDetailOpen(true);
  }, []);

  // Clear filters
  const hasFilters =
    actionFilter !== "All" ||
    entityFilter !== "All" ||
    userSearch !== "" ||
    searchQuery !== "" ||
    dateFrom !== "" ||
    dateTo !== "";

  const clearFilters = useCallback(() => {
    setActionFilter("All");
    setEntityFilter("All");
    setUserSearch("");
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
  }, []);

  // Table columns
  const columns: Column<DisplayRow>[] = useMemo(
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
        render: (val: string, row: DisplayRow) => (
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
        key: "entity",
        label: "Entity",
        sortable: true,
      },
      {
        key: "entityName",
        label: "Entity Name",
        className: "max-w-[200px]",
        render: (val: string) => (
          <span className="text-sm truncate block max-w-[200px]">
            {val || "—"}
          </span>
        ),
      },
      {
        key: "details",
        label: "Changes",
        className: "max-w-[280px]",
        render: (val: string, row: DisplayRow) => (
          <div>
            <p className="text-sm text-muted-foreground truncate max-w-[260px]">
              {val || "—"}
            </p>
            <ExpandableRow entry={row} />
          </div>
        ),
      },
      {
        key: "ipAddress",
        label: "IP",
        className: "whitespace-nowrap",
        render: (val: string) => (
          <span className="text-xs font-mono text-muted-foreground">
            {val || "—"}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Audit Log"
        description="System-wide activity tracking and compliance log"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-1.5" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportJSON}>
              <FileText className="h-4 w-4 mr-1.5" />
              Export JSON
            </Button>
          </>
        }
      />

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
            <p className="text-sm font-semibold truncate">
              {stats.mostActiveUser}
            </p>
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
            <p className="text-sm font-semibold truncate">
              {stats.mostModifiedEntity}
            </p>
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
                stats.flaggedCount > 3 ? "text-orange-600" : ""
              }`}
            >
              {stats.flaggedCount}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* Date From */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                From
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                To
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Action */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Action
              </label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIQUE_ACTION_OPTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Entity */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Entity
              </label>
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
              <label className="text-xs text-muted-foreground mb-1 block">
                User
              </label>
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
              <label className="text-xs text-muted-foreground mb-1 block">
                Search
              </label>
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
          <span className="font-medium text-foreground">
            {filteredRows.length}
          </span>{" "}
          {filteredRows.length === 1 ? "entry" : "entries"} found
          {hasFilters && (
            <span>
              {" "}
              (filtered from {allRows.length} total)
            </span>
          )}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Sorted by newest first
        </div>
      </div>

      {/* Data Table */}
      <DataTable<DisplayRow>
        columns={columns}
        data={filteredRows}
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
