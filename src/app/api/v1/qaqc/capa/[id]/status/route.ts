import { z } from "zod";
import { createStateTransitionHandler } from "@/lib/api/status-transitions";

// CAPA status transitions reproduce the prior file's statusTransitions map
// verbatim. Model name on the Prisma client is `cAPA` (PascalCase `CAPA`
// → only the first character is lowercased per Prisma's camelCase rule).
export const { PATCH } = createStateTransitionHandler({
  modelName: "cAPA",
  entity: "capa",
  method: "PATCH",
  statusEnum: [
    "OPEN",
    "INVESTIGATION",
    "ACTION_PLAN",
    "IMPLEMENTATION",
    "VERIFICATION",
    "CLOSED",
  ] as const,
  allowedTransitions: {
    OPEN: ["INVESTIGATION"],
    INVESTIGATION: ["ACTION_PLAN", "CLOSED"],
    ACTION_PLAN: ["IMPLEMENTATION"],
    IMPLEMENTATION: ["VERIFICATION"],
    VERIFICATION: ["CLOSED", "IMPLEMENTATION"],
    CLOSED: [],
  },
  extraBody: {
    reason: z.string().optional(),
  },
  computeUpdate: ({ extras }) => {
    return extras.reason ? { closureReason: extras.reason } : {};
  },
});
