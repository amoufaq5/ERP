import { z } from "zod";
import { createStateTransitionHandler } from "@/lib/api/status-transitions";

export const { PUT } = createStateTransitionHandler({
  modelName: "bill",
  entity: "bill",
  statusEnum: [
    "DRAFT",
    "PENDING_APPROVAL",
    "APPROVED",
    "REJECTED",
    "PAID",
    "CANCELLED",
  ] as const,
  allowedTransitions: {
    DRAFT: ["PENDING_APPROVAL", "CANCELLED"],
    PENDING_APPROVAL: ["APPROVED", "REJECTED"],
    APPROVED: ["PAID", "CANCELLED"],
    REJECTED: ["DRAFT"],
    PAID: [],
    CANCELLED: [],
  },
  extraBody: {
    approvedBy: z.string().optional(),
    rejectionReason: z.string().optional(),
  },
  computeUpdate: ({ transition, extras }) => {
    const out: Record<string, unknown> = {};
    if (transition.to === "APPROVED" && extras.approvedBy) {
      out.approvedBy = extras.approvedBy;
      out.approvedAt = new Date().toISOString();
    }
    if (transition.to === "REJECTED" && extras.rejectionReason) {
      out.rejectionReason = extras.rejectionReason;
    }
    return out;
  },
});
