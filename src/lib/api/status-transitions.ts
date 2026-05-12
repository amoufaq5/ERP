// Status / state-machine transition route helper.
//
// Many ERP endpoints follow an identical shape: a single HTTP verb on
// /<resource>/[id]/status receives a target state, validates the
// state-machine transition against an allowedTransitions map, and
// updates the record. Before this helper, each such route was a
// hand-written ~70-line file with three serious flaws:
//
//   1. Read `tenantId` from `x-tenant-id` request header (anti-pattern;
//      no auth, anyone could claim any tenant).
//   2. Used `(prisma as any).<model>` to bypass typing, which let the
//      pattern propagate without anyone noticing.
//   3. Mixed business logic with infrastructure plumbing in every file.
//
// This helper folds the shape into one place. Each status route shrinks
// to a config object + one-line export.
//
// Cross-references:
//   docs/PHASE0_TRACK_B_AUDIT.md
//   docs/PHASE0_TRACK_B_TRIAGE.md
//   src/lib/api/with-tenant.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndTenantParams } from "./with-tenant";

type HttpMethod = "PUT" | "PATCH";

export interface StateTransitionConfig<
  S extends string,
  Extras extends Record<string, unknown> = Record<string, never>,
> {
  /** Prisma client property name (camelCase). */
  modelName: string;
  /** Human label used in error messages and logs. */
  entity: string;
  /** Column on the record that holds the state. Defaults to "status". */
  field?: string;
  /** HTTP verb the route exposes. Defaults to "PUT". */
  method?: HttpMethod;
  /** Allowed state values. */
  statusEnum: readonly S[];
  /** Allowed transitions: from-state → array of valid target states. */
  allowedTransitions: Record<S, readonly S[]>;
  /**
   * Optional extra fields the request body may carry alongside the
   * state value. Pass a zod raw shape (e.g. `{ reason: z.string().optional() }`).
   * Fields here are validated and surfaced to `computeUpdate`.
   */
  extraBody?: z.ZodRawShape;
  /**
   * Optional callback that computes additional fields to merge into
   * the update payload, e.g. timestamps or denormalized columns.
   * Defaults to {} (only the state column is updated).
   */
  computeUpdate?: (args: {
    transition: { from: S; to: S };
    extras: Extras;
    record: any;
  }) => Record<string, unknown>;
  /**
   * Optional hook called after a successful update. Runs inside the
   * request transaction; safe to do DB writes here that need tenancy.
   */
  afterUpdate?: (
    record: any,
    transition: { from: S; to: S },
    req: NextRequest,
  ) => Promise<void>;
}

/**
 * Build a state-transition route handler.
 *
 * Returns `{ PUT }` or `{ PATCH }` depending on `config.method` so the
 * caller can spread it as the route's named export.
 *
 * Usage:
 *
 *   export const { PUT } = createStateTransitionHandler({
 *     modelName: "invoice",
 *     entity: "invoice",
 *     statusEnum: ["DRAFT", "SENT", "PAID", "CANCELLED", "OVERDUE"] as const,
 *     allowedTransitions: {
 *       DRAFT:     ["SENT", "CANCELLED"],
 *       SENT:      ["PAID", "CANCELLED", "OVERDUE"],
 *       OVERDUE:   ["PAID", "CANCELLED"],
 *       PAID:      [],
 *       CANCELLED: [],
 *     },
 *   });
 */
export function createStateTransitionHandler<
  S extends string,
  Extras extends Record<string, unknown> = Record<string, never>,
>(config: StateTransitionConfig<S, Extras>) {
  const field = config.field ?? "status";
  const method: HttpMethod = config.method ?? "PUT";

  const stateSchema = z.enum(config.statusEnum as unknown as [S, ...S[]]);
  const bodyShape: z.ZodRawShape = config.extraBody
    ? { [field]: stateSchema, ...config.extraBody }
    : { [field]: stateSchema };
  const schema = z.object(bodyShape);

  const handler = withAuthAndTenantParams<{ params: Promise<{ id: string }> }>(
    async (req, { params }, { db }) => {
      try {
        const { id } = await params;
        const body = await req.json();

        const parsed = schema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Validation failed", details: parsed.error.flatten() },
            { status: 400 },
          );
        }

        const parsedData = parsed.data as Record<string, unknown>;
        const nextState = parsedData[field] as S;
        const extras = Object.fromEntries(
          Object.entries(parsedData).filter(([k]) => k !== field),
        ) as Extras;

        const model = (db as any)[config.modelName];

        // The extension auto-injects where.tenantId; passing just `id`
        // restricts the lookup to the current tenant.
        const record = await model.findFirst({ where: { id } });
        if (!record) {
          return NextResponse.json(
            { error: `${config.entity} not found` },
            { status: 404 },
          );
        }

        const currentState = record[field] as S;
        const allowed = config.allowedTransitions[currentState] ?? [];
        if (!allowed.includes(nextState)) {
          return NextResponse.json(
            {
              error: `Invalid ${field} transition from ${currentState} to ${nextState}`,
              allowedTransitions: allowed,
            },
            { status: 422 },
          );
        }

        const transition = { from: currentState, to: nextState };
        const sideEffects = config.computeUpdate
          ? config.computeUpdate({ transition, extras, record })
          : {};

        const updated = await model.update({
          where: { id },
          data: { ...sideEffects, [field]: nextState },
        });

        if (config.afterUpdate) {
          await config.afterUpdate(updated, transition, req);
        }

        return NextResponse.json(updated);
      } catch (err) {
        console.error(
          `[API] ${method} /${config.entity}/:id/${field} error:`,
          err,
        );
        return NextResponse.json(
          { error: "Internal server error" },
          { status: 500 },
        );
      }
    },
  );

  return method === "PATCH" ? { PATCH: handler } : { PUT: handler };
}
