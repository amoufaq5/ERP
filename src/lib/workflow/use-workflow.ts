"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useCurrentUser } from "@/lib/user-context";
import {
  getWorkflowMachine,
  STATE_LABELS,
  ACTION_LABELS,
  WORKFLOW_STATE_ORDER,
  type WorkflowType,
} from "./workflows";
import type {
  WorkflowContext,
  HistoryEntry,
  AvailableAction,
} from "./state-machine";

// ─── localStorage persistence ───

const STORAGE_PREFIX = "pharma.workflow.";

function getStorageKey(workflowType: WorkflowType, entityId: string): string {
  return `${STORAGE_PREFIX}${workflowType}.${entityId}`;
}

interface PersistedWorkflowState {
  currentState: string;
  history: HistoryEntry[];
  data: Record<string, unknown>;
}

function loadState(
  workflowType: WorkflowType,
  entityId: string
): PersistedWorkflowState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getStorageKey(workflowType, entityId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(
  workflowType: WorkflowType,
  entityId: string,
  state: PersistedWorkflowState
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      getStorageKey(workflowType, entityId),
      JSON.stringify(state)
    );
  } catch {
    // ignore storage errors
  }
}

// ─── Hook return type ───

export interface UseWorkflowReturn {
  /** Current state identifier (e.g. "PENDING_DM"). */
  currentState: string;
  /** Human-readable label for the current state. */
  currentStateLabel: string;
  /** Actions available to the current user from the current state. */
  availableActions: AvailableAction<string>[];
  /** Human-readable labels for available actions. */
  actionLabels: Record<string, string>;
  /** Execute a transition. Returns true if successful. */
  transition: (action: string, note?: string) => boolean;
  /** Full transition history for this entity. */
  history: HistoryEntry[];
  /** Whether the current user can recall the entity back to DRAFT. */
  canRecall: boolean;
  /** Ordered states for the happy-path progress display. */
  stateOrder: string[];
  /** State labels lookup. */
  stateLabels: Record<string, string>;
  /** Extra data stored in the workflow context. */
  data: Record<string, unknown>;
  /** Update extra data (e.g. amount, submittedAt). */
  setData: (patch: Record<string, unknown>) => void;
  /** Reset workflow to initial state, clearing history. */
  reset: () => void;
}

/**
 * Hook for managing an approval workflow on a specific entity.
 *
 * @param workflowType - One of "market_request", "weekly_plan", "expense".
 * @param entityId     - Unique identifier for the entity instance.
 * @param initialData  - Optional initial data to seed the workflow context.
 */
export function useWorkflow(
  workflowType: WorkflowType,
  entityId: string,
  initialData?: Record<string, unknown>
): UseWorkflowReturn {
  const { user } = useCurrentUser();
  const machine = useMemo(() => getWorkflowMachine(workflowType), [workflowType]);

  // Initialize from localStorage or defaults
  const [currentState, setCurrentState] = useState<string>(() => {
    const persisted = loadState(workflowType, entityId);
    return persisted?.currentState ?? machine.initialState;
  });

  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    const persisted = loadState(workflowType, entityId);
    return persisted?.history ?? [];
  });

  const [data, setDataState] = useState<Record<string, unknown>>(() => {
    const persisted = loadState(workflowType, entityId);
    return persisted?.data ?? initialData ?? {};
  });

  // Persist whenever state changes
  useEffect(() => {
    saveState(workflowType, entityId, { currentState, history, data });
  }, [workflowType, entityId, currentState, history, data]);

  // Build the workflow context from current user + stored data
  const buildContext = useCallback((): WorkflowContext => {
    return {
      entityId,
      entityType: workflowType,
      currentUserId: user.id,
      currentUserRole: user.role,
      data: { ...data, requesterId: data.requesterId ?? user.id },
      history: [...history],
    };
  }, [entityId, workflowType, user.id, user.role, data, history]);

  // Available actions for the current user
  const availableActions = useMemo(() => {
    const ctx = buildContext();
    return machine.getAvailableActions(currentState as never, ctx);
  }, [machine, currentState, buildContext]);

  // Whether "recall" is among the available actions
  const canRecall = useMemo(() => {
    return availableActions.some((a) => a.action === "recall");
  }, [availableActions]);

  // Execute a transition
  const transition = useCallback(
    (action: string, note?: string): boolean => {
      const ctx = buildContext();
      const result = machine.transition(
        currentState as never,
        action as never,
        ctx,
        note
      );
      if (result.allowed) {
        setCurrentState(result.newState);
        setHistory(ctx.history);

        // Auto-update submittedAt / approvedAt timestamps
        const patchData: Record<string, unknown> = {};
        if (action === "submit") {
          patchData.submittedAt = new Date().toISOString();
        }
        if (
          action === "approve" ||
          action === "approve_dm" ||
          action === "approve_bum" ||
          action === "approve_nsm"
        ) {
          patchData.approvedAt = new Date().toISOString();
        }
        if (Object.keys(patchData).length > 0) {
          setDataState((prev) => ({ ...prev, ...patchData }));
        }
      }
      return result.allowed;
    },
    [machine, currentState, buildContext]
  );

  // Update contextual data
  const setData = useCallback((patch: Record<string, unknown>) => {
    setDataState((prev) => ({ ...prev, ...patch }));
  }, []);

  // Reset to initial state
  const reset = useCallback(() => {
    setCurrentState(machine.initialState);
    setHistory([]);
    setDataState(initialData ?? {});
  }, [machine.initialState, initialData]);

  const stateOrder = WORKFLOW_STATE_ORDER[workflowType];

  return {
    currentState,
    currentStateLabel: STATE_LABELS[currentState] ?? currentState,
    availableActions,
    actionLabels: ACTION_LABELS,
    transition,
    history,
    canRecall,
    stateOrder,
    stateLabels: STATE_LABELS,
    data,
    setData,
    reset,
  };
}
