"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Calendar,
  Send,
  Receipt,
  FileText,
  ArrowRight,
  UserPlus,
  Plus,
  CheckCircle,
  Phone,
  Mail,
  Users,
  Filter,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useActivity, type ActivityType, type ActivityEntry } from "@/lib/activity/activity-context";
import { getInitials } from "@/lib/utils";

// ─── Legacy export (backward compat) ────────────────────────────────────────

export interface TimelineEvent {
  id: string;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  timestamp: string;
  user?: string;
  type?: "default" | "success" | "warning" | "error" | "info";
}

// ─── Icon & color mapping ───────────────────────────────────────────────────

const ACTIVITY_ICONS: Record<ActivityType, React.ElementType> = {
  visit: MapPin,
  plan: Calendar,
  request: Send,
  expense: Receipt,
  note: FileText,
  status_change: ArrowRight,
  assignment: UserPlus,
  creation: Plus,
  approval: CheckCircle,
  call: Phone,
  email: Mail,
  meeting: Users,
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  visit: "bg-blue-500 text-white",
  plan: "bg-indigo-500 text-white",
  request: "bg-orange-500 text-white",
  expense: "bg-yellow-500 text-white",
  note: "bg-slate-500 text-white",
  status_change: "bg-purple-500 text-white",
  assignment: "bg-teal-500 text-white",
  creation: "bg-green-500 text-white",
  approval: "bg-emerald-500 text-white",
  call: "bg-cyan-500 text-white",
  email: "bg-rose-500 text-white",
  meeting: "bg-violet-500 text-white",
};

const ACTIVITY_LINE_COLORS: Record<ActivityType, string> = {
  visit: "bg-blue-300",
  plan: "bg-indigo-300",
  request: "bg-orange-300",
  expense: "bg-yellow-300",
  note: "bg-slate-300",
  status_change: "bg-purple-300",
  assignment: "bg-teal-300",
  creation: "bg-green-300",
  approval: "bg-emerald-300",
  call: "bg-cyan-300",
  email: "bg-rose-300",
  meeting: "bg-violet-300",
};

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  visit: "Visits",
  plan: "Plans",
  request: "Requests",
  expense: "Expenses",
  note: "Notes",
  status_change: "Status Changes",
  assignment: "Assignments",
  creation: "Creations",
  approval: "Approvals",
  call: "Calls",
  email: "Emails",
  meeting: "Meetings",
};

const ALL_TYPES: ActivityType[] = [
  "visit",
  "plan",
  "request",
  "expense",
  "note",
  "status_change",
  "assignment",
  "creation",
  "approval",
  "call",
  "email",
  "meeting",
];

// ─── Date helpers ───────────────────────────────────────────────────────────

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const entryDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  if (entryDate.getTime() === today.getTime()) return "Today";
  if (entryDate.getTime() === yesterday.getTime()) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── Component ──────────────────────────────────────────────────────────────

interface ActivityTimelineProps {
  entityType: string;
  entityId: string;
  limit?: number;
  showFilters?: boolean;
}

export function ActivityTimeline({
  entityType,
  entityId,
  limit = 20,
  showFilters = true,
}: ActivityTimelineProps) {
  const { getActivities, version } = useActivity();
  const [displayCount, setDisplayCount] = useState(limit);
  const [selectedTypes, setSelectedTypes] = useState<Set<ActivityType>>(
    new Set()
  );
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Re-read whenever version changes (new activity added)
  const allEntries = useMemo(() => {
    return getActivities(entityType, entityId, {
      types: selectedTypes.size > 0 ? Array.from(selectedTypes) : undefined,
      limit: displayCount + 1, // fetch one extra to know if more exist
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId, displayCount, selectedTypes, version, getActivities]);

  const hasMore = allEntries.length > displayCount;
  const entries = allEntries.slice(0, displayCount);

  const toggleType = useCallback((type: ActivityType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
    setDisplayCount(limit);
  }, [limit]);

  // Group entries by date
  const grouped = useMemo(() => {
    const groups: { label: string; entries: ActivityEntry[] }[] = [];
    let currentLabel = "";
    for (const entry of entries) {
      const label = getDateLabel(entry.timestamp);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, entries: [entry] });
      } else {
        groups[groups.length - 1].entries.push(entry);
      }
    }
    return groups;
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-3">
          <FileText className="h-7 w-7 text-muted-foreground/60" strokeWidth={1.5} />
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          No activity recorded yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen((o) => !o)}
            className="gap-1.5"
          >
            <Filter className="h-3.5 w-3.5" />
            Filter
            {selectedTypes.size > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground leading-none">
                {selectedTypes.size}
              </span>
            )}
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                filtersOpen && "rotate-180"
              )}
            />
          </Button>

          {filtersOpen && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 rounded-md border border-border p-3">
              {ALL_TYPES.map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <Checkbox
                    checked={selectedTypes.has(type)}
                    onCheckedChange={() => toggleType(type)}
                  />
                  {ACTIVITY_LABELS[type]}
                </label>
              ))}
              {selectedTypes.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => {
                    setSelectedTypes(new Set());
                    setDisplayCount(limit);
                  }}
                >
                  Clear all
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div>
        {grouped.map((group, gi) => (
          <div key={group.label}>
            {/* Date separator */}
            <div className="flex items-center gap-3 py-2">
              <Separator className="flex-1" />
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {group.label}
              </span>
              <Separator className="flex-1" />
            </div>

            {/* Entries in this date group */}
            <div className="space-y-0">
              {group.entries.map((entry, i) => {
                const Icon = ACTIVITY_ICONS[entry.activityType] ?? FileText;
                const dotColor = ACTIVITY_COLORS[entry.activityType] ?? "bg-slate-400 text-white";
                const lineColor = ACTIVITY_LINE_COLORS[entry.activityType] ?? "bg-slate-300";
                const isLast =
                  gi === grouped.length - 1 &&
                  i === group.entries.length - 1;

                return (
                  <div key={entry.id} className="flex gap-3 pb-0">
                    {/* Dot + connecting line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full shrink-0",
                          dotColor
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      {!isLast && (
                        <div
                          className={cn("w-0.5 flex-1 min-h-[16px]", lineColor)}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug">
                          {entry.title}
                        </p>
                        <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap mt-0.5">
                          {formatTime(entry.timestamp)}
                        </span>
                      </div>
                      {entry.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {entry.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {/* User avatar initial */}
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                          {getInitials(entry.userName)}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {entry.userName}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDisplayCount((c) => c + limit)}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
