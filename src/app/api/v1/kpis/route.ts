import { createRouteHandlers } from "@/lib/api/route-factory";

// Phase 0 Track B6 — scaffolded fresh.
//
// The prior implementation accessed `prisma.kpi` but the Prisma model is
// `KPI`, so the generated client property is `kPI` (Prisma lowercases only
// the first character of the model name). Every DB call was returning
// `undefined.findMany is not a function`. Replaced with the standard
// route-factory which inherits auth + tenant scoping from withAuthAndTenant.
export const { GET, POST } = createRouteHandlers({
  entity: "kpis",
  modelName: "kPI",
  defaultPageSize: 25,
  defaultSort: { field: "createdAt", direction: "desc" },
  searchFields: ["metric", "period", "userId"],
});
