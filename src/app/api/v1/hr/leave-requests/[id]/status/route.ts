import { z } from "zod";
import { createStateTransitionHandler } from "@/lib/api/status-transitions";

export const { PUT } = createStateTransitionHandler({
  modelName: "leaveRequest",
  entity: "leave-request",
  statusEnum: [
    "PENDING",
    "APPROVED",
    "REJECTED",
    "CANCELLED",
    "WITHDRAWN",
  ] as const,
  allowedTransitions: {
    PENDING: ["APPROVED", "REJECTED", "WITHDRAWN"],
    APPROVED: ["CANCELLED"],
    REJECTED: [],
    CANCELLED: [],
    WITHDRAWN: [],
  },
  extraBody: {
    approverId: z.string().optional(),
    rejectionReason: z.string().optional(),
  },
  computeUpdate: ({ transition, extras }) => {
    const out: Record<string, unknown> = {};
    if (transition.to === "APPROVED" && extras.approverId) {
      out.approverId = extras.approverId;
      out.approvedAt = new Date().toISOString();
    }
    if (transition.to === "REJECTED" && extras.rejectionReason) {
      out.rejectionReason = extras.rejectionReason;
    }
    return out;
  },
});
