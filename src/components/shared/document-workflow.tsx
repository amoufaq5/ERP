"use client";

import { CheckCircle, Clock, XCircle, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ControlledDocument,
  DocumentStatus,
} from "@/lib/quality/document-control-types";

interface DocumentWorkflowProps {
  document: ControlledDocument;
}

const WORKFLOW_STEPS: { status: DocumentStatus; label: string }[] = [
  { status: "draft", label: "Draft" },
  { status: "in-review", label: "In Review" },
  { status: "approved", label: "Approved" },
  { status: "effective", label: "Effective" },
];

const TERMINAL_STEPS: { status: DocumentStatus; label: string }[] = [
  { status: "superseded", label: "Superseded" },
  { status: "obsolete", label: "Obsolete" },
];

const STATUS_ORDER: Record<DocumentStatus, number> = {
  draft: 0,
  "in-review": 1,
  approved: 2,
  effective: 3,
  superseded: 4,
  obsolete: 4,
};

export default function DocumentWorkflow({ document }: DocumentWorkflowProps) {
  const currentIndex = STATUS_ORDER[document.status];
  const isTerminal =
    document.status === "superseded" || document.status === "obsolete";

  // Find the latest version info
  const latestVersion =
    document.versions.length > 0
      ? document.versions[document.versions.length - 1]
      : null;

  return (
    <div className="w-full">
      {isTerminal && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Archive className="h-5 w-5 text-amber-600" />
          <span className="text-sm font-medium text-amber-800">
            This document has been{" "}
            {document.status === "superseded"
              ? "superseded by a newer version"
              : "marked as obsolete"}
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
            const isCompleted = currentIndex > stepOrder;
            const isCurrent =
              !isTerminal && currentIndex === stepOrder;
            const isFuture =
              isTerminal || currentIndex < stepOrder;

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

                {/* Review step: show reviewer/approver names */}
                {step.status === "in-review" &&
                  document.reviews.length > 0 &&
                  (isCurrent || isCompleted) && (
                    <div className="mt-1 flex flex-wrap gap-1 justify-center max-w-[120px]">
                      {document.reviews.map((r) => (
                        <span
                          key={r.id}
                          className={cn(
                            "inline-block px-1.5 py-0.5 rounded text-[9px] font-medium",
                            r.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : r.status === "overdue"
                              ? "bg-red-100 text-red-800"
                              : r.status === "in-progress"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                          )}
                          title={`${r.reviewer} - ${r.status}`}
                        >
                          {r.status === "completed"
                            ? "✓"
                            : r.status === "overdue"
                            ? "✗"
                            : "•"}
                        </span>
                      ))}
                    </div>
                  )}

                {/* Effective step: show version info */}
                {step.status === "effective" &&
                  latestVersion &&
                  (isCurrent || isCompleted) && (
                    <div className="mt-1 text-center">
                      <span className="text-[9px] text-muted-foreground">
                        v{document.currentVersion}
                      </span>
                    </div>
                  )}
              </div>
            );
          })}

          {/* Terminal states */}
          {isTerminal && (
            <div
              className="flex flex-col items-center relative"
              style={{ flex: 1 }}
            >
              <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-amber-500 bg-amber-500 text-white">
                <XCircle className="h-4 w-4" />
              </div>
              <span className="mt-2 text-[10px] sm:text-xs font-semibold text-amber-700 text-center leading-tight max-w-[80px]">
                {document.status === "superseded"
                  ? "Superseded"
                  : "Obsolete"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Version & reviewer info bar */}
      {latestVersion && (
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>
            <strong>Author:</strong> {latestVersion.author}
          </span>
          {latestVersion.reviewer && (
            <span>
              <strong>Reviewer:</strong> {latestVersion.reviewer}
            </span>
          )}
          {latestVersion.approver && (
            <span>
              <strong>Approver:</strong> {latestVersion.approver}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
