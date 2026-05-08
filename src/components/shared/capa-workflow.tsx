"use client";

import { CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CAPARecord, CAPAStatus } from "@/lib/quality/capa-types";

interface CAPAWorkflowProps {
  capa: CAPARecord;
}

const WORKFLOW_STEPS: { status: CAPAStatus; label: string }[] = [
  { status: "initiated", label: "Initiated" },
  { status: "investigation", label: "Investigation" },
  { status: "action-plan", label: "Action Plan" },
  { status: "implementation", label: "Implementation" },
  { status: "verification", label: "Verification" },
  { status: "effectiveness-check", label: "Effectiveness Check" },
  { status: "closed", label: "Closed" },
];

const STATUS_ORDER: Record<CAPAStatus, number> = {
  initiated: 0,
  investigation: 1,
  "action-plan": 2,
  implementation: 3,
  verification: 4,
  "effectiveness-check": 5,
  closed: 6,
};

export default function CAPAWorkflow({ capa }: CAPAWorkflowProps) {
  const currentIndex = STATUS_ORDER[capa.status];

  // Calculate days in current phase
  const initiatedDate = new Date(capa.initiatedAt);
  const now = new Date();
  const totalDays = Math.round(
    (now.getTime() - initiatedDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="w-full">
      {/* Horizontal step indicator */}
      <div className="relative">
        {/* Connector line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200" />

        <div className="relative flex justify-between">
          {WORKFLOW_STEPS.map((step, idx) => {
            const stepOrder = STATUS_ORDER[step.status];
            const isCompleted = currentIndex > stepOrder;
            const isCurrent = currentIndex === stepOrder;
            const isFuture = currentIndex < stepOrder;

            return (
              <div
                key={step.status}
                className="flex flex-col items-center relative"
                style={{ flex: 1 }}
              >
                {/* Step circle */}
                <div
                  className={cn(
                    "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                    isCompleted &&
                      "border-green-500 bg-green-500 text-white",
                    isCurrent &&
                      "border-blue-500 bg-blue-500 text-white animate-pulse",
                    isFuture &&
                      "border-gray-300 bg-white text-gray-400"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : isCurrent ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-medium">{idx + 1}</span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "mt-2 text-[10px] sm:text-xs font-medium text-center leading-tight max-w-[80px]",
                    isCompleted && "text-green-700",
                    isCurrent && "text-blue-700 font-semibold",
                    isFuture && "text-gray-400"
                  )}
                >
                  {step.label}
                </span>

                {/* Days indicator for current step */}
                {isCurrent && (
                  <span className="mt-1 text-[9px] text-muted-foreground">
                    {totalDays}d elapsed
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
