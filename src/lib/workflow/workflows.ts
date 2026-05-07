// ─── Pre-built Approval Workflow Configurations ───
// Uses the generic state machine engine for Market Requests, Weekly Plans, and Expenses.

import {
  createStateMachine,
  type StateConfig,
  type StateMachineInstance,
  type WorkflowContext,
} from "./state-machine";

// ─── Role helpers ───

const ADMIN_ROLES = ["ADMIN"];
const DM_AND_ABOVE = ["DISTRICT_MANAGER", "BUM", "NSM", "MARKETEER", ...ADMIN_ROLES];
const BUM_AND_ABOVE = ["BUM", "NSM", ...ADMIN_ROLES];
const NSM_AND_ABOVE = ["NSM", ...ADMIN_ROLES];
const HR_ROLES = ["HR", ...ADMIN_ROLES];

function hasRole(context: WorkflowContext, roles: string[]): boolean {
  return roles.includes(context.currentUserRole);
}

function isOriginalRequester(context: WorkflowContext): boolean {
  const requesterId = context.data.requesterId as string | undefined;
  return requesterId === context.currentUserId;
}

// ─── Amount threshold constant ───
const DM_APPROVAL_THRESHOLD = 50000; // EGP — above this, BUM must also approve

// ─── Market Request Workflow ───

export type MarketRequestState =
  | "DRAFT"
  | "PENDING_DM"
  | "PENDING_BUM"
  | "PENDING_NSM"
  | "INFO_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "FULFILLED";

export type MarketRequestAction =
  | "submit"
  | "approve_dm"
  | "approve_bum"
  | "approve_nsm"
  | "reject"
  | "request_info"
  | "provide_info"
  | "escalate"
  | "fulfill"
  | "recall";

const marketRequestConfig: StateConfig<MarketRequestState, MarketRequestAction> = {
  initialState: "DRAFT",
  states: {
    DRAFT: {
      transitions: {
        submit: {
          target: "PENDING_DM",
          guard: (ctx) => isOriginalRequester(ctx) || hasRole(ctx, [...ADMIN_ROLES]),
        },
      },
    },
    PENDING_DM: {
      transitions: {
        approve_dm: {
          target: "APPROVED",
          guard: (ctx) => {
            if (!hasRole(ctx, DM_AND_ABOVE)) return false;
            const amount = (ctx.data.amount as number) ?? 0;
            return amount <= DM_APPROVAL_THRESHOLD;
          },
        },
        // When amount > threshold, DM approval routes to BUM
        approve_bum: {
          // This is "approve_dm but routes to BUM" — we use a separate transition
          // because the guard checks that the amount is high AND the user is DM-level
          target: "PENDING_BUM",
          guard: (ctx) => {
            if (!hasRole(ctx, DM_AND_ABOVE)) return false;
            const amount = (ctx.data.amount as number) ?? 0;
            return amount > DM_APPROVAL_THRESHOLD;
          },
        },
        reject: {
          target: "REJECTED",
          guard: (ctx) => hasRole(ctx, DM_AND_ABOVE),
        },
        request_info: {
          target: "INFO_REQUESTED",
          guard: (ctx) => hasRole(ctx, DM_AND_ABOVE),
        },
        recall: {
          target: "DRAFT",
          guard: (ctx) => isOriginalRequester(ctx),
        },
      },
    },
    PENDING_BUM: {
      transitions: {
        approve_bum: {
          target: "APPROVED",
          guard: (ctx) => hasRole(ctx, BUM_AND_ABOVE),
        },
        reject: {
          target: "REJECTED",
          guard: (ctx) => hasRole(ctx, BUM_AND_ABOVE),
        },
        escalate: {
          target: "PENDING_NSM",
          guard: (ctx) => {
            // Auto-escalation after 48h SLA or manual by BUM+
            const submittedAt = ctx.data.submittedAt as string | undefined;
            if (submittedAt) {
              const elapsed = Date.now() - new Date(submittedAt).getTime();
              const SLA_MS = 48 * 60 * 60 * 1000;
              if (elapsed >= SLA_MS) return true;
            }
            return hasRole(ctx, BUM_AND_ABOVE);
          },
        },
        recall: {
          target: "DRAFT",
          guard: (ctx) => isOriginalRequester(ctx),
        },
      },
    },
    PENDING_NSM: {
      transitions: {
        approve_nsm: {
          target: "APPROVED",
          guard: (ctx) => hasRole(ctx, NSM_AND_ABOVE),
        },
        reject: {
          target: "REJECTED",
          guard: (ctx) => hasRole(ctx, NSM_AND_ABOVE),
        },
        recall: {
          target: "DRAFT",
          guard: (ctx) => isOriginalRequester(ctx),
        },
      },
    },
    INFO_REQUESTED: {
      transitions: {
        provide_info: {
          target: "PENDING_DM",
          guard: (ctx) => isOriginalRequester(ctx),
        },
        recall: {
          target: "DRAFT",
          guard: (ctx) => isOriginalRequester(ctx),
        },
      },
    },
    APPROVED: {
      transitions: {
        fulfill: {
          target: "FULFILLED",
          guard: (ctx) => hasRole(ctx, DM_AND_ABOVE),
        },
      },
    },
    REJECTED: {
      transitions: {},
    },
    FULFILLED: {
      transitions: {},
    },
  },
};

// ─── Weekly Plan Workflow ───

export type WeeklyPlanState =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "ESCALATED";

export type WeeklyPlanAction =
  | "submit"
  | "approve"
  | "reject"
  | "revise"
  | "escalate"
  | "revoke";

const weeklyPlanConfig: StateConfig<WeeklyPlanState, WeeklyPlanAction> = {
  initialState: "DRAFT",
  states: {
    DRAFT: {
      transitions: {
        submit: {
          target: "SUBMITTED",
          guard: (ctx) => isOriginalRequester(ctx) || hasRole(ctx, [...ADMIN_ROLES]),
        },
      },
    },
    SUBMITTED: {
      transitions: {
        approve: {
          target: "APPROVED",
          guard: (ctx) => hasRole(ctx, DM_AND_ABOVE),
        },
        reject: {
          target: "REJECTED",
          guard: (ctx) => hasRole(ctx, DM_AND_ABOVE),
        },
        escalate: {
          target: "ESCALATED",
          guard: (ctx) => {
            const submittedAt = ctx.data.submittedAt as string | undefined;
            if (submittedAt) {
              const elapsed = Date.now() - new Date(submittedAt).getTime();
              const SLA_MS = 48 * 60 * 60 * 1000;
              if (elapsed >= SLA_MS) return true;
            }
            return hasRole(ctx, DM_AND_ABOVE);
          },
        },
      },
    },
    APPROVED: {
      transitions: {
        revoke: {
          target: "DRAFT",
          guard: (ctx) => {
            // Approver can revoke within 24 hours
            if (!hasRole(ctx, DM_AND_ABOVE)) return false;
            const approvedAt = ctx.data.approvedAt as string | undefined;
            if (!approvedAt) return false;
            const elapsed = Date.now() - new Date(approvedAt).getTime();
            const REVOKE_WINDOW_MS = 24 * 60 * 60 * 1000;
            return elapsed <= REVOKE_WINDOW_MS;
          },
        },
      },
    },
    REJECTED: {
      transitions: {
        revise: {
          target: "DRAFT",
          guard: (ctx) => isOriginalRequester(ctx),
        },
      },
    },
    ESCALATED: {
      transitions: {
        approve: {
          target: "APPROVED",
          guard: (ctx) => hasRole(ctx, BUM_AND_ABOVE),
        },
        reject: {
          target: "REJECTED",
          guard: (ctx) => hasRole(ctx, BUM_AND_ABOVE),
        },
      },
    },
  },
};

// ─── Expense Workflow ───

export type ExpenseState =
  | "DRAFT"
  | "PENDING_HR"
  | "APPROVED"
  | "REJECTED"
  | "RECEIPT_REQUIRED"
  | "PAID";

export type ExpenseAction =
  | "submit"
  | "approve"
  | "reject"
  | "request_receipt"
  | "upload_receipt"
  | "process_payment";

const expenseConfig: StateConfig<ExpenseState, ExpenseAction> = {
  initialState: "DRAFT",
  states: {
    DRAFT: {
      transitions: {
        submit: {
          target: "PENDING_HR",
          guard: (ctx) => isOriginalRequester(ctx) || hasRole(ctx, [...ADMIN_ROLES]),
        },
      },
    },
    PENDING_HR: {
      transitions: {
        approve: {
          target: "APPROVED",
          guard: (ctx) => hasRole(ctx, HR_ROLES),
        },
        reject: {
          target: "REJECTED",
          guard: (ctx) => hasRole(ctx, HR_ROLES),
        },
        request_receipt: {
          target: "RECEIPT_REQUIRED",
          guard: (ctx) => hasRole(ctx, HR_ROLES),
        },
      },
    },
    RECEIPT_REQUIRED: {
      transitions: {
        upload_receipt: {
          target: "PENDING_HR",
          guard: (ctx) => isOriginalRequester(ctx),
        },
      },
    },
    APPROVED: {
      transitions: {
        process_payment: {
          target: "PAID",
          guard: (ctx) => hasRole(ctx, HR_ROLES),
        },
      },
    },
    REJECTED: {
      transitions: {},
    },
    PAID: {
      transitions: {},
    },
  },
};

// ─── Instantiated Machines ───

export const marketRequestMachine: StateMachineInstance<MarketRequestState, MarketRequestAction> =
  createStateMachine(marketRequestConfig);

export const weeklyPlanMachine: StateMachineInstance<WeeklyPlanState, WeeklyPlanAction> =
  createStateMachine(weeklyPlanConfig);

export const expenseMachine: StateMachineInstance<ExpenseState, ExpenseAction> =
  createStateMachine(expenseConfig);

// ─── Lookup helper ───

export type WorkflowType = "market_request" | "weekly_plan" | "expense";

export function getWorkflowMachine(type: WorkflowType) {
  switch (type) {
    case "market_request":
      return marketRequestMachine;
    case "weekly_plan":
      return weeklyPlanMachine;
    case "expense":
      return expenseMachine;
  }
}

// ─── Human-readable labels ───

export const STATE_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_DM: "Pending DM Approval",
  PENDING_BUM: "Pending BUM Approval",
  PENDING_NSM: "Pending NSM Approval",
  INFO_REQUESTED: "Info Requested",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  FULFILLED: "Fulfilled",
  SUBMITTED: "Submitted",
  ESCALATED: "Escalated",
  PENDING_HR: "Pending HR Review",
  RECEIPT_REQUIRED: "Receipt Required",
  PAID: "Paid",
};

export const ACTION_LABELS: Record<string, string> = {
  submit: "Submit",
  approve_dm: "Approve (DM)",
  approve_bum: "Approve (BUM)",
  approve_nsm: "Approve (NSM)",
  reject: "Reject",
  request_info: "Request Info",
  provide_info: "Provide Info",
  escalate: "Escalate",
  fulfill: "Mark Fulfilled",
  recall: "Recall",
  approve: "Approve",
  revise: "Revise",
  revoke: "Revoke Approval",
  request_receipt: "Request Receipt",
  upload_receipt: "Upload Receipt",
  process_payment: "Process Payment",
};

// ─── State ordering for progress display ───

export const WORKFLOW_STATE_ORDER: Record<WorkflowType, string[]> = {
  market_request: [
    "DRAFT",
    "PENDING_DM",
    "PENDING_BUM",
    "PENDING_NSM",
    "APPROVED",
    "FULFILLED",
  ],
  weekly_plan: [
    "DRAFT",
    "SUBMITTED",
    "APPROVED",
  ],
  expense: [
    "DRAFT",
    "PENDING_HR",
    "APPROVED",
    "PAID",
  ],
};

// Side-branch states that are not part of the happy path but should be shown
export const WORKFLOW_SIDE_STATES: Record<WorkflowType, string[]> = {
  market_request: ["INFO_REQUESTED", "REJECTED"],
  weekly_plan: ["REJECTED", "ESCALATED"],
  expense: ["RECEIPT_REQUIRED", "REJECTED"],
};
