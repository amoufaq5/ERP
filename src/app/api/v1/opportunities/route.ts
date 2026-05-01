import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  filterBySearch,
  parseQueryParams,
} from "@/lib/api/api-helpers";
import { validate, createOpportunitySchema } from "@/lib/api/validations";
import { withAuth } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/opportunities ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const stage = params.get("stage");
    const accountId = params.get("accountId");
    const assignedToId = params.get("assignedToId");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (stage) where.stage = stage.toUpperCase();
        if (accountId) where.accountId = accountId;
        if (assignedToId) where.assignedToId = assignedToId;
        if (search) {
          where.OR = [
            { title: { contains: search } },
            { notes: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.opportunity.count({ where }),
          prisma.opportunity.findMany({
            where,
            skip: (Math.max(1, page) - 1) * Math.min(limit, 100),
            take: Math.min(limit, 100),
            orderBy: { createdAt: "desc" },
            include: {
              account: { select: { id: true, name: true } },
              contact: { select: { id: true, firstName: true, lastName: true } },
              assignedTo: { select: { id: true, name: true } },
            },
          }),
        ]);

        const totalPages = Math.ceil(total / Math.min(limit, 100));
        return apiResponse(records, 200, {
          page: Math.max(1, page),
          limit: Math.min(limit, 100),
          total,
          totalPages,
        });
      } catch {}
    }

    const mock = generateMockOpportunities();
    let filtered = filterBySearch(mock, search, ["title", "notes", "accountName"]);
    if (stage) filtered = filtered.filter((o) => o.stage === stage.toUpperCase());
    if (accountId) filtered = filtered.filter((o) => o.accountId === accountId);
    if (assignedToId) filtered = filtered.filter((o) => o.assignedToId === assignedToId);
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch opportunities", 500);
  }
}

// ─── POST /api/v1/opportunities ────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { role, userId }) => {
  try {
    const body = await req.json();
    const validation = validate(createOpportunitySchema, body);
    if (!validation.success) return apiError(validation.error, 400);
    const data = validation.data;

    if (prisma) {
      try {
        const record = await prisma.opportunity.create({
          data: {
            title: body.title,
            accountId: body.accountId || null,
            contactId: body.contactId || null,
            leadId: body.leadId || null,
            stage: (body.stage || "PROSPECTING").toUpperCase(),
            value: body.value ? parseFloat(body.value) : 0,
            probability: body.probability ? parseInt(body.probability) : 50,
            expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : null,
            assignedToId: body.assignedToId || null,
            notes: body.notes || null,
          },
        });
        return apiResponse(record, 201);
      } catch {}
    }

    const record = {
      id: `opp-${Date.now()}`,
      ...body,
      stage: (body.stage || "PROSPECTING").toUpperCase(),
      value: body.value ? parseFloat(body.value) : 0,
      probability: body.probability ? parseInt(body.probability) : 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create opportunity", 500);
  }
});

// ─── Mock data ─────────────────────────────────────────────────────────────

function generateMockOpportunities() {
  return [
    { id: "opp-1", title: "Eva Pharma - Annual Supply Contract", accountId: "acct-1", accountName: "Eva Pharma", contactId: "cont-1", stage: "NEGOTIATION", value: 250000, probability: 75, expectedCloseDate: "2025-06-30", assignedToId: "user-1", notes: "Renewal of annual antibiotics supply agreement", createdAt: "2025-01-15T10:00:00Z", updatedAt: "2025-03-01T10:00:00Z" },
    { id: "opp-2", title: "EIPICO - OTC Product Line Distribution", accountId: "acct-2", accountName: "EIPICO", contactId: "cont-3", stage: "PROPOSAL", value: 180000, probability: 60, expectedCloseDate: "2025-07-15", assignedToId: "user-2", notes: "Distribution deal for new OTC product line", createdAt: "2025-02-01T10:00:00Z", updatedAt: "2025-03-10T10:00:00Z" },
    { id: "opp-3", title: "Ain Shams Hospital - Oncology Supplies", accountId: "acct-3", accountName: "Ain Shams University Hospital", contactId: "cont-2", stage: "QUALIFICATION", value: 500000, probability: 40, expectedCloseDate: "2025-09-01", assignedToId: "user-1", notes: "Government hospital tender for oncology medications", createdAt: "2025-02-20T10:00:00Z", updatedAt: "2025-03-15T10:00:00Z" },
    { id: "opp-4", title: "Amoun - API Raw Materials", accountId: "acct-4", accountName: "Amoun Pharmaceutical", contactId: "cont-5", stage: "PROSPECTING", value: 120000, probability: 25, expectedCloseDate: "2025-10-15", assignedToId: "user-2", notes: "Active pharmaceutical ingredients supply", createdAt: "2025-03-01T10:00:00Z", updatedAt: "2025-03-20T10:00:00Z" },
    { id: "opp-5", title: "Dar Al Fouad - Surgical Pharma Package", accountId: "acct-5", accountName: "Dar Al Fouad Hospital", contactId: "cont-4", stage: "CLOSED_WON", value: 350000, probability: 100, expectedCloseDate: "2025-04-01", assignedToId: "user-1", notes: "Comprehensive surgical pharmacy supply contract", createdAt: "2025-01-10T10:00:00Z", updatedAt: "2025-04-01T10:00:00Z" },
  ];
}
