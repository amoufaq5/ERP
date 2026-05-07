"use client";

import { useMemo } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActivity, type ActivityType, type ActivityEntry } from "@/lib/activity/activity-context";

// ─── Icon mapping ───────────────────────────────────────────────────────────

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

const ACTIVITY_DOT_COLORS: Record<ActivityType, string> = {
  visit: "text-blue-500",
  plan: "text-indigo-500",
  request: "text-orange-500",
  expense: "text-yellow-500",
  note: "text-slate-500",
  status_change: "text-purple-500",
  assignment: "text-teal-500",
  creation: "text-green-500",
  approval: "text-emerald-500",
  call: "text-cyan-500",
  email: "text-rose-500",
  meeting: "text-violet-500",
};

// ─── Relative time ──────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 5) return `${diffWeek}w ago`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth}mo ago`;
}

// ─── Entity link label ──────────────────────────────────────────────────────

function entityPath(entry: ActivityEntry): string | null {
  switch (entry.entityType) {
    case "doctor":
      return `/field-force/doctors`;
    case "account":
      return `/field-force/am-accounts`;
    default:
      return null;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

interface ActivityFeedProps {
  userId: string;
  limit?: number;
  className?: string;
}

export function ActivityFeed({
  userId,
  limit = 10,
  className,
}: ActivityFeedProps) {
  const { getRecent, version } = useActivity();

  const entries = useMemo(() => {
    return getRecent(userId, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, limit, version, getRecent]);

  if (entries.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            No recent activity
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 px-4">
        {entries.map((entry) => {
          const Icon = ACTIVITY_ICONS[entry.activityType] ?? FileText;
          const iconColor =
            ACTIVITY_DOT_COLORS[entry.activityType] ?? "text-slate-400";
          const href = entityPath(entry);

          const content = (
            <div
              className={cn(
                "flex items-start gap-2.5 rounded-md px-2 py-1.5 -mx-2 transition-colors",
                href && "hover:bg-accent cursor-pointer"
              )}
            >
              <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", iconColor)} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium leading-snug truncate">
                  {entry.title}
                </p>
                <span className="text-[10px] text-muted-foreground/70">
                  {relativeTime(entry.timestamp)}
                </span>
              </div>
            </div>
          );

          if (href) {
            return (
              <a key={entry.id} href={href} className="block no-underline">
                {content}
              </a>
            );
          }

          return <div key={entry.id}>{content}</div>;
        })}
      </CardContent>
    </Card>
  );
}
