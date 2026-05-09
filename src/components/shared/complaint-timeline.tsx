"use client";

import { CheckCircle, Clock, Circle } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type {
  Complaint,
  ComplaintStatus,
  ComplaintTimelineEvent,
} from "@/lib/quality/complaint-types";

interface ComplaintTimelineProps {
  complaint: Complaint;
  className?: string;
}

const WORKFLOW_STEPS: { status: ComplaintStatus; label: string }[] = [
  { status: "received", label: "Received" },
  { status: "acknowledged", label: "Acknowledged" },
  { status: "investigation", label: "Investigation" },
  { status: "root-cause", label: "Root Cause" },
  { status: "capa-required", label: "CAPA Required" },
  { status: "response-sent", label: "Response Sent" },
  { status: "closed", label: "Closed" },
];

const STATUS_ORDER: Record<ComplaintStatus, number> = {
  received: 0,
  acknowledged: 1,
  investigation: 2,
  "root-cause": 3,
  "capa-required": 4,
  "response-sent": 5,
  closed: 6,
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ComplaintTimeline({
  complaint,
  className,
}: ComplaintTimelineProps) {
  const currentIndex = STATUS_ORDER[complaint.status];

  // Build a map from status to timeline event for quick lookup
  const eventMap = new Map<ComplaintStatus, ComplaintTimelineEvent>();
  complaint.timeline.forEach((evt) => {
    // Keep the latest event for each status
    eventMap.set(evt.status, evt);
  });

  return (
    <div className={cn("w-full", className)}>
      <div className="relative pl-8">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-200" />

        {WORKFLOW_STEPS.map((step) => {
          const stepOrder = STATUS_ORDER[step.status];
          const isCompleted = currentIndex > stepOrder;
          const isCurrent = currentIndex === stepOrder;
          const isFuture = currentIndex < stepOrder;
          const event = eventMap.get(step.status);

          return (
            <div key={step.status} className="relative mb-6 last:mb-0">
              {/* Step circle */}
              <div
                className={cn(
                  "absolute -left-8 flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 bg-white z-10",
                  isCompleted && "border-green-500 bg-green-500 text-white",
                  isCurrent &&
                    "border-blue-500 bg-blue-50 text-blue-600 ring-4 ring-blue-100",
                  isFuture && "border-gray-300 bg-white text-gray-400"
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="h-4 w-4" />
                ) : isCurrent ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
              </div>

              {/* Content */}
              <div
                className={cn(
                  "ml-2 rounded-lg border p-3",
                  isCompleted && "border-green-200 bg-green-50/50",
                  isCurrent && "border-blue-200 bg-blue-50/50",
                  isFuture && "border-gray-100 bg-gray-50/30"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      isCompleted && "text-green-800",
                      isCurrent && "text-blue-800",
                      isFuture && "text-gray-400"
                    )}
                  >
                    {step.label}
                  </span>
                  {event && (
                    <span className="text-xs text-muted-foreground">
                      {formatDate(event.date)} {formatTime(event.date)}
                    </span>
                  )}
                </div>

                {event && (
                  <div className="mt-1.5 space-y-1">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {event.actor}
                      </span>
                    </p>
                    {event.notes && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {event.notes}
                      </p>
                    )}
                  </div>
                )}

                {isFuture && !event && (
                  <p className="mt-1 text-xs text-gray-400 italic">Pending</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
