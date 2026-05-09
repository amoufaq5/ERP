"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  Truck,
  FlaskConical,
  Clock,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import { batchStore } from "@/lib/traceability/batch-store";
import type { BatchEvent } from "@/lib/traceability/batch-types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface BatchTimelineProps {
  batchId: string;
}

// ---------------------------------------------------------------------------
// Event styling
// ---------------------------------------------------------------------------

type EventCategory = "positive" | "negative" | "info";

function eventCategory(type: BatchEvent["eventType"]): EventCategory {
  switch (type) {
    case "qc-passed":
    case "released":
    case "shipped":
      return "positive";
    case "qc-failed":
    case "recalled":
    case "expired":
      return "negative";
    default:
      return "info";
  }
}

function dotColor(cat: EventCategory): string {
  switch (cat) {
    case "positive":
      return "bg-green-500";
    case "negative":
      return "bg-red-500";
    case "info":
      return "bg-blue-500";
  }
}

function eventIcon(type: BatchEvent["eventType"]) {
  const cls = "h-4 w-4";
  switch (type) {
    case "created":
      return <Package className={cls} />;
    case "qc-started":
      return <FlaskConical className={cls} />;
    case "qc-passed":
      return <CheckCircle className={cls} />;
    case "qc-failed":
      return <XCircle className={cls} />;
    case "released":
      return <CheckCircle className={cls} />;
    case "quarantined":
      return <AlertTriangle className={cls} />;
    case "shipped":
      return <Truck className={cls} />;
    case "recalled":
      return <ShieldAlert className={cls} />;
    case "expired":
      return <Clock className={cls} />;
    default:
      return <RotateCcw className={cls} />;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BatchTimeline({ batchId }: BatchTimelineProps) {
  const [events, setEvents] = useState<BatchEvent[]>([]);

  useEffect(() => {
    const all = batchStore.getEvents(batchId);
    // Newest first
    all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setEvents(all);
  }, [batchId]);

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No events recorded for this batch.
      </p>
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

      {events.map((event) => {
        const cat = eventCategory(event.eventType);
        return (
          <div key={event.id} className="relative flex items-start gap-4 py-3 pl-0">
            {/* Dot */}
            <div
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white",
                dotColor(cat)
              )}
            >
              {eventIcon(event.eventType)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium capitalize">
                  {event.eventType.replace(/-/g, " ")}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatDateTime(event.timestamp)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {event.description}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                By {event.performedBy}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
