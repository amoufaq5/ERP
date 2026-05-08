"use client";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChangeRequest, ChangeStatus, ApprovalStatus } from "@/lib/quality/change-control-types";

interface ChangeWorkflowProps {
  changeRequest: ChangeRequest;
}

const WORKFLOW_STEPS: { status: ChangeStatus; label: string }[] = [
  { status: "draft", label: "Draft" },
  { status: "submitted", label: "Submitted" },
  { status: "impact-assessment", label: "Impact Assessment" },
  { status: "review", label: "Review" },
  { status: "approved", label: "Approved" },
  { status: "implementation", label: "Implementation" },
  { status: "verification", label: "Verification" },
  { status: "closed", label: "Closed" },
];

const STATUS_ORDER: Record<ChangeStatus, number> = {
  draft: 0,
  submitted: 1,
  "impact-assessment": 2,
  review: 3,
  approved: 4,
  implementation: 5,
  verification: 6,
  closed: 7,
  rejected: -1,
};

const APPROVAL_BADGE: Record<ApprovalStatus, { color: string; label: string }> = {
  pending: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
  approved: { color: "bg-green-100 text-green-800", label: "Approved" },
  rejected: { color: "bg-red-100 text-red-800", label: "Rejected" },
  deferred: { color: "bg-blue-100 text-blue-800", label: "Deferred" },
};

export default function ChangeWorkflow({ changeRequest }: ChangeWorkflowProps) {
  const currentIndex = STATUS_ORDER[changeRequest.status];
  const isRejected = changeRequest.status === "rejected";

  // Calculate implementation progress
  const totalSteps = changeRequest.implementationPlan.length;
  const completedSteps = changeRequest.implementationPlan.filter(
    (s) => s.status === "completed"
  ).length;
  const implementationPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div className="w-full">
      {isRejected && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <XCircle className="h-5 w-5 text-red-600" />
          <span className="text-sm font-medium text-red-800">
            This change request has been rejected
          </span>
        </div>
      )}

      {/* Horizontal step indicator */}
      <div className="relative">
        {/* Connector line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200" />

        <div className="relative flex justify-between">
          {WORKFLOW_STEPS.map((step, idx) => {
            const stepOrder = STATUS_ORDER[step.status];
            const isCompleted = !isRejected && currentIndex > stepOrder;
            const isCurrent = !isRejected && currentIndex === stepOrder;
            const isFuture = isRejected || currentIndex < stepOrder;

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

                {/* Review step: show approvals */}
                {step.status === "review" &&
                  changeRequest.approvals.length > 0 &&
                  (isCurrent || isCompleted) && (
                    <div className="mt-1 flex flex-wrap gap-1 justify-center max-w-[120px]">
                      {changeRequest.approvals.map((a, i) => (
                        <span
                          key={i}
                          className={cn(
                            "inline-block px-1.5 py-0.5 rounded text-[9px] font-medium",
                            APPROVAL_BADGE[a.status].color
                          )}
                          title={`${a.name} - ${a.role}`}
                        >
                          {a.status === "approved"
                            ? "✓"
                            : a.status === "rejected"
                            ? "✗"
                            : a.status === "deferred"
                            ? "⏸"
                            : "•"}
                        </span>
                      ))}
                    </div>
                  )}

                {/* Implementation step: show progress bar */}
                {step.status === "implementation" &&
                  totalSteps > 0 &&
                  (isCurrent || isCompleted) && (
                    <div className="mt-1 w-16">
                      <Progress value={implementationPct} className="h-1.5" />
                      <span className="text-[9px] text-muted-foreground">
                        {completedSteps}/{totalSteps}
                      </span>
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
