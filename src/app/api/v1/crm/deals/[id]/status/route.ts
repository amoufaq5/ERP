import { z } from "zod";
import { createStateTransitionHandler } from "@/lib/api/status-transitions";

// Deal pipeline transitions use `stage` (not `status`) as the state column,
// matching the existing Deal schema field.
export const { PUT } = createStateTransitionHandler({
  modelName: "deal",
  entity: "deal",
  field: "stage",
  statusEnum: [
    "LEAD",
    "QUALIFIED",
    "PROPOSAL",
    "NEGOTIATION",
    "CLOSED_WON",
    "CLOSED_LOST",
  ] as const,
  allowedTransitions: {
    LEAD: ["QUALIFIED", "CLOSED_LOST"],
    QUALIFIED: ["PROPOSAL", "LEAD", "CLOSED_LOST"],
    PROPOSAL: ["NEGOTIATION", "QUALIFIED", "CLOSED_LOST"],
    NEGOTIATION: ["CLOSED_WON", "CLOSED_LOST", "PROPOSAL"],
    CLOSED_WON: [],
    CLOSED_LOST: ["LEAD"],
  },
  extraBody: {
    lostReason: z.string().optional(),
    notes: z.string().optional(),
  },
  computeUpdate: ({ transition, extras }) => {
    const out: Record<string, unknown> = {};
    if (transition.to === "CLOSED_LOST" && extras.lostReason) {
      out.lostReason = extras.lostReason;
    }
    if (transition.to === "CLOSED_WON" || transition.to === "CLOSED_LOST") {
      out.actualCloseDate = new Date().toISOString();
    }
    if (extras.notes) {
      out.stageNotes = extras.notes;
    }
    return out;
  },
});
