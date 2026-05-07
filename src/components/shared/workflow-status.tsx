"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useWorkflow } from "@/lib/workflow/use-workflow";
import {
  STATE_LABELS,
  ACTION_LABELS,
  WORKFLOW_SIDE_STATES,
  type WorkflowType,
} from "@/lib/workflow/workflows";
import { checkSLA, formatTimeRemaining, getSLAUrgency } from "@/lib/workflow/sla";
import type { HistoryEntry } from "@/lib/workflow/state-machine";

// ─── Props ───

export interface WorkflowStatusProps {
  /** Which workflow definition to use. */
  workflowType: WorkflowType;
  /** Unique entity identifier. */
  entityId: string;
  /** Override the current state (e.g. read from an external source). */
  currentState?: string;
  /** Callback fired after a successful transition action. */
  onAction?: (action: string, newState: string) => void;
  /** Optional initial data (amount, requesterId, etc.). */
  initialData?: Record<string, unknown>;
  /** Hide the action buttons. */
  readOnly?: boolean;
  /** Hide the history timeline. */
  hideHistory?: boolean;
  /** Compact mode — smaller, no history. */
  compact?: boolean;
}

// ─── State step colours ───

const STATE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  DRAFT:            { bg: "bg-slate-100",  text: "text-slate-700",  border: "border-slate-300",  dot: "bg-slate-400" },
  PENDING_DM:       { bg: "bg-amber-100",  text: "text-amber-800",  border: "border-amber-300",  dot: "bg-amber-500" },
  PENDING_BUM:      { bg: "bg-amber-100",  text: "text-amber-800",  border: "border-amber-300",  dot: "bg-amber-500" },
  PENDING_NSM:      { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300", dot: "bg-orange-500" },
  PENDING_HR:       { bg: "bg-amber-100",  text: "text-amber-800",  border: "border-amber-300",  dot: "bg-amber-500" },
  INFO_REQUESTED:   { bg: "bg-blue-100",   text: "text-blue-800",   border: "border-blue-300",   dot: "bg-blue-500" },
  RECEIPT_REQUIRED: { bg: "bg-blue-100",   text: "text-blue-800",   border: "border-blue-300",   dot: "bg-blue-500" },
  SUBMITTED:        { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-300", dot: "bg-indigo-500" },
  ESCALATED:        { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300", dot: "bg-orange-500" },
  APPROVED:         { bg: "bg-green-100",  text: "text-green-800",  border: "border-green-300",  dot: "bg-green-500" },
  REJECTED:         { bg: "bg-red-100",    text: "text-red-800",    border: "border-red-300",    dot: "bg-red-500" },
  FULFILLED:        { bg: "bg-emerald-100",text: "text-emerald-800",border: "border-emerald-300",dot: "bg-emerald-600" },
  PAID:             { bg: "bg-emerald-100",text: "text-emerald-800",border: "border-emerald-300",dot: "bg-emerald-600" },
};

function getStateColor(state: string) {
  return STATE_COLORS[state] ?? STATE_COLORS.DRAFT;
}

// ─── Action button styles ───

function getActionStyle(action: string): string {
  if (action.startsWith("approve") || action === "fulfill" || action === "process_payment") {
    return "bg-green-600 hover:bg-green-700 text-white";
  }
  if (action === "reject") {
    return "bg-red-600 hover:bg-red-700 text-white";
  }
  if (action === "recall" || action === "revoke") {
    return "bg-slate-600 hover:bg-slate-700 text-white";
  }
  if (action === "escalate") {
    return "bg-orange-600 hover:bg-orange-700 text-white";
  }
  if (action === "submit") {
    return "bg-blue-600 hover:bg-blue-700 text-white";
  }
  return "bg-slate-200 hover:bg-slate-300 text-slate-800";
}

// ─── History event type for colour ───

function getHistoryEventType(entry: HistoryEntry): "success" | "error" | "warning" | "info" | "default" {
  if (entry.to === "APPROVED" || entry.to === "FULFILLED" || entry.to === "PAID") return "success";
  if (entry.to === "REJECTED") return "error";
  if (entry.to === "ESCALATED" || entry.to === "PENDING_NSM") return "warning";
  if (entry.to === "INFO_REQUESTED" || entry.to === "RECEIPT_REQUIRED") return "info";
  return "default";
}

const EVENT_DOT_COLORS = {
  default: "bg-slate-400",
  success: "bg-green-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  info: "bg-blue-500",
};

// ─── Checkmark icon ───

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("w-3.5 h-3.5", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

// ─── Main Component ───

export default function WorkflowStatus({
  workflowType,
  entityId,
  currentState: externalState,
  onAction,
  initialData,
  readOnly = false,
  hideHistory = false,
  compact = false,
}: WorkflowStatusProps) {
  const workflow = useWorkflow(workflowType, entityId, initialData);
  const [noteInput, setNoteInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const activeState = externalState ?? workflow.currentState;
  const { availableActions, actionLabels, history, stateOrder } = workflow;
  const sideStates = WORKFLOW_SIDE_STATES[workflowType];

  // Determine step progress
  const activeIndex = stateOrder.indexOf(activeState);
  const isSideState = sideStates.includes(activeState);

  // SLA info for pending states
  const submittedAt = workflow.data.submittedAt as string | undefined;
  const isPending = activeState.startsWith("PENDING") || activeState === "SUBMITTED" || activeState === "ESCALATED";
  const sla = isPending && submittedAt ? checkSLA(submittedAt) : null;
  const slaUrgency = isPending && submittedAt ? getSLAUrgency(submittedAt) : null;

  const handleAction = (action: string) => {
    const success = workflow.transition(action, noteInput || undefined);
    if (success) {
      onAction?.(action, workflow.currentState);
      setNoteInput("");
    }
  };

  // ─── Compact mode ───
  if (compact) {
    const color = getStateColor(activeState);
    return (
      <div className="flex items-center gap-2">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold", color.bg, color.text, color.border)}>
          <span className={cn("w-1.5 h-1.5 rounded-full", color.dot)} />
          {STATE_LABELS[activeState] ?? activeState}
        </span>
        {sla && (
          <span className={cn(
            "text-[11px] font-medium",
            slaUrgency === "breached" && "text-red-600",
            slaUrgency === "critical" && "text-red-500",
            slaUrgency === "warning" && "text-amber-600",
            slaUrgency === "ok" && "text-slate-500"
          )}>
            {formatTimeRemaining(sla.remainingMs)}
          </span>
        )}
      </div>
    );
  }

  // ─── Full mode ───
  return (
    <div className="space-y-4">
      {/* Progress steps */}
      <div className="flex items-center gap-0 w-full overflow-x-auto pb-1">
        {stateOrder.map((state, i) => {
          const isCompleted = activeIndex > i;
          const isCurrent = activeState === state || (isSideState && i === 0);
          const isFuture = !isCompleted && !isCurrent;
          const color = getStateColor(state);

          return (
            <div key={state} className="flex items-center flex-1 min-w-0">
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1 min-w-0">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 transition-colors",
                    isCompleted && "bg-green-500 border-green-500 text-white",
                    isCurrent && cn(color.bg, color.border, color.text),
                    isFuture && "bg-slate-100 border-slate-200 text-slate-400"
                  )}
                >
                  {isCompleted ? <CheckIcon /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-[11px] text-center leading-tight max-w-[80px] truncate",
                    isCompleted && "text-green-700 font-medium",
                    isCurrent && cn(color.text, "font-semibold"),
                    isFuture && "text-slate-400"
                  )}
                  title={STATE_LABELS[state] ?? state}
                >
                  {STATE_LABELS[state] ?? state}
                </span>
              </div>
              {/* Connector line */}
              {i < stateOrder.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-1 mt-[-18px]",
                    isCompleted ? "bg-green-400" : "bg-slate-200"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Side state indicator */}
      {isSideState && (
        <div className="flex items-center gap-2">
          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
            getStateColor(activeState).bg,
            getStateColor(activeState).text,
            getStateColor(activeState).border
          )}>
            <span className={cn("w-1.5 h-1.5 rounded-full", getStateColor(activeState).dot)} />
            {STATE_LABELS[activeState] ?? activeState}
          </span>
        </div>
      )}

      {/* SLA timer */}
      {sla && (
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border",
          slaUrgency === "breached" && "bg-red-50 text-red-700 border-red-200",
          slaUrgency === "critical" && "bg-red-50 text-red-600 border-red-200",
          slaUrgency === "warning" && "bg-amber-50 text-amber-700 border-amber-200",
          slaUrgency === "ok" && "bg-slate-50 text-slate-600 border-slate-200"
        )}>
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>SLA: {formatTimeRemaining(sla.remainingMs)}</span>
        </div>
      )}

      {/* Action buttons */}
      {!readOnly && availableActions.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {availableActions.map(({ action }) => (
              <button
                key={action}
                onClick={() => handleAction(action)}
                className={cn(
                  "inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  getActionStyle(action)
                )}
              >
                {actionLabels[action] ?? action}
              </button>
            ))}
          </div>
          {/* Note input for reject/request_info/escalate */}
          {availableActions.some((a) =>
            ["reject", "request_info", "escalate", "revoke", "request_receipt"].includes(a.action)
          ) && (
            <input
              type="text"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Add a note (optional)..."
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
          )}
        </div>
      )}

      {/* History toggle & timeline */}
      {!hideHistory && history.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1"
          >
            <svg
              className={cn("w-3 h-3 transition-transform", showHistory && "rotate-90")}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            History ({history.length})
          </button>

          {showHistory && (
            <div className="mt-2 space-y-0 pl-1">
              {[...history].reverse().map((entry, i) => {
                const eventType = getHistoryEventType(entry);
                const dotColor = EVENT_DOT_COLORS[eventType];
                const ts = new Date(entry.timestamp);
                const formattedTime = `${ts.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${ts.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;

                return (
                  <div key={`${entry.timestamp}-${i}`} className="flex gap-3 pb-3 last:pb-0">
                    <div className="flex flex-col items-center">
                      <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", dotColor)} />
                      {i < history.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
                    </div>
                    <div className="flex-1 min-w-0 pb-0.5">
                      <p className="text-xs font-medium text-slate-700">
                        {STATE_LABELS[entry.from] ?? entry.from}
                        {" → "}
                        {STATE_LABELS[entry.to] ?? entry.to}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        <span className="font-medium">{ACTION_LABELS[entry.action] ?? entry.action}</span>
                        {" by "}
                        <span>{entry.userId}</span>
                      </p>
                      {entry.note && (
                        <p className="text-[11px] text-slate-400 italic mt-0.5">&quot;{entry.note}&quot;</p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-0.5">{formattedTime}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
