import { createRouteHandlersWithId } from "@/lib/api/route-factory";

// Phase 0 Track B6 — scaffolded fresh. See `../route.ts` for context.
export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: "kpis",
  modelName: "kPI",
});
