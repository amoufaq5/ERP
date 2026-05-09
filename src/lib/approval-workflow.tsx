"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "ESCALATED";

export interface ApprovalRequest {
  id: string;
  type: string;
  module: string;
  entityId: string;
  title: string;
  description: string;
  requestedBy: string;
  requestedByName: string;
  assignedTo: string;
  assignedToName: string;
  amount?: number;
  status: ApprovalStatus;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  createdAt: string;
  resolvedAt?: string;
  comments?: string;
}

/**
 * Callback invoked after an approval request has been approved.
 * Receives the full ApprovalRequest (with status already set to APPROVED).
 */
export type OnApproveCallback = (request: ApprovalRequest) => void;

/**
 * Callback invoked after an approval request has been rejected.
 */
export type OnRejectCallback = (request: ApprovalRequest) => void;

interface ApprovalContextValue {
  requests: ApprovalRequest[];
  pendingCount: number;
  submit: (req: Omit<ApprovalRequest, "id" | "createdAt" | "status">) => void;
  approve: (id: string, comments?: string) => void;
  reject: (id: string, comments?: string) => void;
  escalate: (id: string, newAssignee: string, newAssigneeName: string) => void;
  resubmit: (id: string) => void;
  getByAssignee: (userId: string) => ApprovalRequest[];
  getByModule: (module: string) => ApprovalRequest[];
  /** Register a callback to be invoked whenever any request is approved. */
  onApprove: (callback: OnApproveCallback) => () => void;
  /** Register a callback to be invoked whenever any request is rejected. */
  onReject: (callback: OnRejectCallback) => () => void;
}

const ApprovalContext = createContext<ApprovalContextValue | null>(null);

const SEED_APPROVALS: ApprovalRequest[] = [
  { id: "apr-001", type: "Purchase Order", module: "Procurement", entityId: "PO-2026-048", title: "PO for Lab Equipment", description: "Purchase of HPLC system from Shimadzu - EGP 2,500,000", requestedBy: "acc-001", requestedByName: "Fatma Ali", assignedTo: "admin-001", assignedToName: "Admin User", amount: 2500000, status: "PENDING", priority: "HIGH", createdAt: "2026-04-24T08:00:00Z" },
  { id: "apr-002", type: "Leave Request", module: "HR", entityId: "LR-2026-089", title: "Annual Leave - Ahmed Hassan", description: "5 days annual leave from May 1-5, 2026", requestedBy: "rep-001", requestedByName: "Omar Youssef", assignedTo: "dm-001", assignedToName: "Hany Adel", status: "PENDING", priority: "MEDIUM", createdAt: "2026-04-23T14:30:00Z" },
  { id: "apr-003", type: "Credit Limit", module: "Finance", entityId: "CL-2026-012", title: "Increase Credit Limit - MedTech Inc", description: "Request to increase credit limit from EGP 500,000 to EGP 1,000,000", requestedBy: "mkt-001", requestedByName: "Dina Mostafa", assignedTo: "admin-001", assignedToName: "Admin User", amount: 1000000, status: "PENDING", priority: "HIGH", createdAt: "2026-04-22T10:00:00Z" },
  { id: "apr-004", type: "Expense Report", module: "Finance", entityId: "EXP-2026-234", title: "Travel Expenses - Q1 Conference", description: "Conference attendance and travel costs", requestedBy: "mkt-001", requestedByName: "Dina Mostafa", assignedTo: "bum-001", assignedToName: "Tarek Nabil", amount: 45000, status: "APPROVED", priority: "LOW", createdAt: "2026-04-20T09:00:00Z", resolvedAt: "2026-04-21T11:00:00Z" },
];

export function ApprovalProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<ApprovalRequest[]>(SEED_APPROVALS);

  // Callback registries
  const [approveCallbacks, setApproveCallbacks] = useState<Set<OnApproveCallback>>(() => new Set());
  const [rejectCallbacks, setRejectCallbacks] = useState<Set<OnRejectCallback>>(() => new Set());

  const submit = useCallback((req: Omit<ApprovalRequest, "id" | "createdAt" | "status">) => {
    setRequests((prev) => [
      { ...req, id: `apr-${Date.now()}`, createdAt: new Date().toISOString(), status: "PENDING" },
      ...prev,
    ]);
  }, []);

  const approve = useCallback((id: string, comments?: string) => {
    let approvedRequest: ApprovalRequest | undefined;

    setRequests((prev) => {
      const target = prev.find((r) => r.id === id);
      // Prevent double-approval: only PENDING or ESCALATED items can be approved
      if (!target || target.status === "APPROVED") return prev;

      return prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, status: "APPROVED" as const, resolvedAt: new Date().toISOString(), comments: comments || r.comments };
          approvedRequest = updated;
          return updated;
        }
        return r;
      });
    });

    // Fire callbacks asynchronously so state update completes first
    if (approvedRequest) {
      const req = approvedRequest;
      // Use setTimeout to ensure the state update has been committed
      setTimeout(() => {
        for (const cb of approveCallbacks) {
          try { cb(req); } catch { /* ignore callback errors */ }
        }
      }, 0);
    }
  }, [approveCallbacks]);

  const reject = useCallback((id: string, comments?: string) => {
    let rejectedRequest: ApprovalRequest | undefined;

    setRequests((prev) => {
      const target = prev.find((r) => r.id === id);
      // Prevent double-rejection: only PENDING or ESCALATED items can be rejected
      if (!target || target.status === "REJECTED") return prev;

      return prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, status: "REJECTED" as const, resolvedAt: new Date().toISOString(), comments: comments || r.comments };
          rejectedRequest = updated;
          return updated;
        }
        return r;
      });
    });

    if (rejectedRequest) {
      const req = rejectedRequest;
      setTimeout(() => {
        for (const cb of rejectCallbacks) {
          try { cb(req); } catch { /* ignore callback errors */ }
        }
      }, 0);
    }
  }, [rejectCallbacks]);

  const escalate = useCallback((id: string, newAssignee: string, newAssigneeName: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: "ESCALATED" as const, assignedTo: newAssignee, assignedToName: newAssigneeName }
          : r
      )
    );
  }, []);

  /**
   * Resubmit a REJECTED approval request, changing its status back to PENDING.
   * Only works for items with REJECTED status.
   * Clears the previous resolution timestamp so it can be re-reviewed.
   */
  const resubmit = useCallback((id: string) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        // Only REJECTED items can be resubmitted
        if (r.status !== "REJECTED") return r;
        return {
          ...r,
          status: "PENDING" as const,
          resolvedAt: undefined,
          comments: r.comments
            ? `${r.comments} | Resubmitted on ${new Date().toISOString().slice(0, 10)}`
            : `Resubmitted on ${new Date().toISOString().slice(0, 10)}`,
        };
      })
    );
  }, []);

  const getByAssignee = useCallback(
    (userId: string) => requests.filter((r) => r.assignedTo === userId),
    [requests]
  );

  const getByModule = useCallback(
    (module: string) => requests.filter((r) => r.module === module),
    [requests]
  );

  /**
   * Register a callback that fires whenever an approval request is approved.
   * Returns an unsubscribe function.
   */
  const registerOnApprove = useCallback((callback: OnApproveCallback): (() => void) => {
    setApproveCallbacks((prev) => {
      const next = new Set(prev);
      next.add(callback);
      return next;
    });
    return () => {
      setApproveCallbacks((prev) => {
        const next = new Set(prev);
        next.delete(callback);
        return next;
      });
    };
  }, []);

  /**
   * Register a callback that fires whenever an approval request is rejected.
   * Returns an unsubscribe function.
   */
  const registerOnReject = useCallback((callback: OnRejectCallback): (() => void) => {
    setRejectCallbacks((prev) => {
      const next = new Set(prev);
      next.add(callback);
      return next;
    });
    return () => {
      setRejectCallbacks((prev) => {
        const next = new Set(prev);
        next.delete(callback);
        return next;
      });
    };
  }, []);

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <ApprovalContext.Provider value={{ requests, pendingCount, submit, approve, reject, escalate, resubmit, getByAssignee, getByModule, onApprove: registerOnApprove, onReject: registerOnReject }}>
      {children}
    </ApprovalContext.Provider>
  );
}

export function useApprovals() {
  const ctx = useContext(ApprovalContext);
  if (!ctx) throw new Error("useApprovals must be used inside ApprovalProvider");
  return ctx;
}
