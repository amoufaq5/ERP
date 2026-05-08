"use client";

import { cn } from "@/lib/utils";
import { Check, ArrowRight, ArrowDown } from "lucide-react";
import type { OOSInvestigation, OOSStatus } from "@/lib/quality/oos-types";

interface OOSWorkflowDiagramProps {
  currentStatus: string;
  investigation: OOSInvestigation;
}

const STEP_ORDER: { key: OOSStatus; label: string }[] = [
  { key: "initiated", label: "Initiated" },
  { key: "phase1-lab", label: "Phase 1\nLab Investigation" },
  { key: "phase1-review", label: "Phase 1\nReview" },
  { key: "phase2-production", label: "Phase 2\nProduction" },
  { key: "phase2-review", label: "Phase 2\nReview" },
];

const CLOSED_STEP_CONFIRMED = { key: "closed-confirmed" as OOSStatus, label: "Closed\n(Confirmed)" };
const CLOSED_STEP_INVALIDATED = { key: "closed-invalidated" as OOSStatus, label: "Closed\n(Invalidated)" };

function getStepIndex(status: OOSStatus): number {
  const idx = STEP_ORDER.findIndex((s) => s.key === status);
  if (idx !== -1) return idx;
  if (status === "closed-confirmed" || status === "closed-invalidated") return STEP_ORDER.length;
  if (status === "extended") return 4; // same level as phase2-review
  return 0;
}

function daysBetween(a: string, b: string): number {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

export default function OOSWorkflowDiagram({ currentStatus, investigation }: OOSWorkflowDiagramProps) {
  const currentIdx = getStepIndex(currentStatus as OOSStatus);
  const isInvalidated = currentStatus === "closed-invalidated";
  const isConfirmed = currentStatus === "closed-confirmed";
  const isClosed = isInvalidated || isConfirmed;

  // Check if phase1 concluded as lab error (shortcut path)
  const labErrorPath = investigation.phase1?.conclusion === "lab-error-confirmed";

  // Build the steps to show
  const steps = [...STEP_ORDER];

  // Determine the closed step
  const closedStep = isInvalidated ? CLOSED_STEP_INVALIDATED : CLOSED_STEP_CONFIRMED;

  // Calculate time at each step
  const now = new Date().toISOString();
  const timeAtStep = (stepIdx: number): string => {
    if (stepIdx > currentIdx && !isClosed) return "";
    const startDate = investigation.initiatedAt;
    const closedDate = investigation.closedAt ?? now;
    const totalDays = daysBetween(startDate, closedDate);

    if (stepIdx === 0) return totalDays > 0 ? "Day 1" : "Today";
    if (isClosed && stepIdx === steps.length) {
      return `${totalDays}d total`;
    }
    if (stepIdx === currentIdx && !isClosed) {
      const daysOpen = daysBetween(startDate, now);
      return `${daysOpen}d open`;
    }
    return "";
  };

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-start gap-0 min-w-[700px]">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentIdx || isClosed;
          const isCurrent = idx === currentIdx && !isClosed;
          const isFuture = idx > currentIdx && !isClosed;

          // If lab error path, skip phase2 steps visually
          const isSkipped = labErrorPath && idx >= 3 && !isClosed;

          // Show shortcut arrow from phase1-review to closed if lab error
          const showShortcutArrow = labErrorPath && idx === 2 && (isInvalidated || investigation.phase1?.conclusion === "lab-error-confirmed");

          return (
            <div key={step.key} className="flex items-start">
              <div className="flex flex-col items-center">
                {/* Step circle */}
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                    isCompleted && "border-green-500 bg-green-500 text-white",
                    isCurrent && "border-blue-500 bg-blue-100 text-blue-700 ring-2 ring-blue-300 ring-offset-1",
                    isFuture && !isSkipped && "border-gray-300 bg-gray-50 text-gray-400",
                    isSkipped && "border-gray-200 bg-gray-50 text-gray-300 opacity-50"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    idx + 1
                  )}
                </div>

                {/* Step label */}
                <div
                  className={cn(
                    "mt-2 text-center text-xs font-medium leading-tight w-20",
                    isCompleted && "text-green-700",
                    isCurrent && "text-blue-700 font-semibold",
                    isFuture && !isSkipped && "text-gray-400",
                    isSkipped && "text-gray-300 line-through opacity-50"
                  )}
                >
                  {step.label.split("\n").map((line, i) => (
                    <span key={i}>
                      {line}
                      {i === 0 && step.label.includes("\n") && <br />}
                    </span>
                  ))}
                </div>

                {/* Time indicator */}
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {timeAtStep(idx)}
                </div>

                {/* Shortcut arrow for lab error path */}
                {showShortcutArrow && (
                  <div className="mt-1 flex flex-col items-center">
                    <ArrowDown className="h-4 w-4 text-amber-500" />
                    <span className="text-[9px] text-amber-600 font-medium">Lab Error</span>
                  </div>
                )}
              </div>

              {/* Arrow between steps */}
              {idx < steps.length - 1 && (
                <div className="flex items-center pt-3 px-1">
                  <div
                    className={cn(
                      "h-0.5 w-6",
                      isCompleted ? "bg-green-400" : "bg-gray-200",
                      isSkipped && "bg-gray-100 opacity-50"
                    )}
                  />
                  <ArrowRight
                    className={cn(
                      "h-4 w-4 -ml-1",
                      isCompleted ? "text-green-400" : "text-gray-300",
                      isSkipped && "text-gray-200 opacity-50"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Final arrow to closed */}
        <div className="flex items-start">
          <div className="flex items-center pt-3 px-1">
            <div
              className={cn(
                "h-0.5 w-6",
                isClosed ? "bg-green-400" : "bg-gray-200"
              )}
            />
            <ArrowRight
              className={cn(
                "h-4 w-4 -ml-1",
                isClosed ? "text-green-400" : "text-gray-300"
              )}
            />
          </div>
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold",
                isClosed && isConfirmed && "border-red-500 bg-red-500 text-white",
                isClosed && isInvalidated && "border-amber-500 bg-amber-500 text-white",
                !isClosed && "border-gray-300 bg-gray-50 text-gray-400"
              )}
            >
              {isClosed ? (
                <Check className="h-5 w-5" />
              ) : (
                steps.length + 1
              )}
            </div>
            <div
              className={cn(
                "mt-2 text-center text-xs font-medium leading-tight w-24",
                isClosed && isConfirmed && "text-red-700",
                isClosed && isInvalidated && "text-amber-700",
                !isClosed && "text-gray-400"
              )}
            >
              {closedStep.label.split("\n").map((line, i) => (
                <span key={i}>
                  {line}
                  {i === 0 && <br />}
                </span>
              ))}
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              {timeAtStep(steps.length)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
