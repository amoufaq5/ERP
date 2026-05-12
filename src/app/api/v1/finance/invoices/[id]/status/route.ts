import { createStateTransitionHandler } from "@/lib/api/status-transitions";

export const { PUT } = createStateTransitionHandler({
  modelName: "invoice",
  entity: "invoice",
  statusEnum: ["DRAFT", "SENT", "PAID", "CANCELLED", "OVERDUE"] as const,
  allowedTransitions: {
    DRAFT: ["SENT", "CANCELLED"],
    SENT: ["PAID", "CANCELLED", "OVERDUE"],
    OVERDUE: ["PAID", "CANCELLED"],
    PAID: [],
    CANCELLED: [],
  },
});
