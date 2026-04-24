"use client";

import { cn } from "@/lib/utils";

export interface TimelineEvent {
  id: string;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  timestamp: string;
  user?: string;
  type?: "default" | "success" | "warning" | "error" | "info";
}

const TYPE_COLORS = {
  default: "bg-slate-400",
  success: "bg-green-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  info: "bg-blue-500",
};

export function ActivityTimeline({ events, maxItems }: { events: TimelineEvent[]; maxItems?: number }) {
  const items = maxItems ? events.slice(0, maxItems) : events;

  return (
    <div className="space-y-0">
      {items.map((event, i) => (
        <div key={event.id} className="flex gap-3 pb-4 last:pb-0">
          <div className="flex flex-col items-center">
            <div className={cn("w-2.5 h-2.5 rounded-full mt-1.5 shrink-0", TYPE_COLORS[event.type || "default"])} />
            {i < items.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <p className="text-sm font-medium">{event.title}</p>
            {event.description && <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>}
            <div className="flex items-center gap-2 mt-1">
              {event.user && <span className="text-[11px] text-muted-foreground">{event.user}</span>}
              <span className="text-[11px] text-muted-foreground/70">{event.timestamp}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
