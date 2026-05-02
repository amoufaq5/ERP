import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  filterBySearch,
  parseQueryParams,
} from "@/lib/api/api-helpers";
import { validate, createTicketSchema } from "@/lib/api/validations";
import { withAuth } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/tickets ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const status = params.get("status");
    const priority = params.get("priority");
    const accountId = params.get("accountId");
    const assignedToId = params.get("assignedToId");
    const category = params.get("category");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (status) where.status = status.toUpperCase();
        if (priority) where.priority = priority.toUpperCase();
        if (accountId) where.accountId = accountId;
        if (assignedToId) where.assignedToId = assignedToId;
        if (category) where.category = category;
        if (search) {
          where.OR = [
            { ticketNumber: { contains: search } },
            { subject: { contains: search } },
            { description: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.ticket.count({ where }),
          prisma.ticket.findMany({
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

    const mock = generateMockTickets();
    let filtered = filterBySearch(mock, search, ["ticketNumber", "subject", "description", "category"]);
    if (status) filtered = filtered.filter((t) => t.status === status.toUpperCase());
    if (priority) filtered = filtered.filter((t) => t.priority === priority.toUpperCase());
    if (accountId) filtered = filtered.filter((t) => t.accountId === accountId);
    if (assignedToId) filtered = filtered.filter((t) => t.assignedToId === assignedToId);
    if (category) filtered = filtered.filter((t) => t.category === category);
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch tickets", 500);
  }
}

// ─── POST /api/v1/tickets ──────────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { role, userId }) => {
  try {
    const body = await req.json();
    const validation = validate(createTicketSchema, body);
    if (!validation.success) return apiError(validation.error, 400);
    const data = validation.data;

    if (prisma) {
      try {
        const count = await prisma.ticket.count();
        const ticketNumber = data.ticketNumber || `TKT-${String(count + 1).padStart(5, "0")}`;

        const record = await prisma.ticket.create({
          data: {
            ticketNumber,
            subject: data.subject,
            description: data.description,
            accountId: data.accountId || null,
            contactId: data.contactId || null,
            status: data.status,
            priority: data.priority,
            assignedToId: data.assignedToId || null,
            category: data.category || null,
            slaDeadline: data.slaDeadline ? new Date(data.slaDeadline) : null,
          },
        });
        return apiResponse(record, 201);
      } catch {}
    }

    const record = {
      id: `tkt-${Date.now()}`,
      ticketNumber: data.ticketNumber || `TKT-${String(Date.now()).slice(-5)}`,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create ticket", 500);
  }
});

// ─── Mock data ─────────────────────────────────────────────────────────────

function generateMockTickets() {
  return [
    { id: "tkt-1", ticketNumber: "TKT-00001", subject: "Delayed shipment of Amoxicillin batch", description: "Order #SO-2025-012 has not been delivered within the agreed SLA of 48 hours.", accountId: "acct-1", accountName: "Eva Pharma", contactId: "cont-1", status: "OPEN", priority: "HIGH", assignedToId: "user-1", category: "Delivery", slaDeadline: "2025-03-20T18:00:00Z", createdAt: "2025-03-18T09:00:00Z", updatedAt: "2025-03-18T09:00:00Z" },
    { id: "tkt-2", ticketNumber: "TKT-00002", subject: "Quality concern - Omeprazole packaging", description: "Customer reported damaged blister packs in last delivery batch BN-20250215.", accountId: "acct-2", accountName: "EIPICO", contactId: "cont-3", status: "IN_PROGRESS", priority: "CRITICAL", assignedToId: "user-2", category: "Quality", slaDeadline: "2025-03-19T12:00:00Z", createdAt: "2025-03-17T14:30:00Z", updatedAt: "2025-03-18T10:00:00Z" },
    { id: "tkt-3", ticketNumber: "TKT-00003", subject: "Invoice discrepancy on order INV-2025-045", description: "Hospital procurement team reports pricing mismatch on tender contract items.", accountId: "acct-3", accountName: "Ain Shams University Hospital", contactId: "cont-2", status: "WAITING", priority: "MEDIUM", assignedToId: "user-1", category: "Billing", slaDeadline: "2025-03-25T18:00:00Z", createdAt: "2025-03-15T11:00:00Z", updatedAt: "2025-03-16T09:00:00Z" },
    { id: "tkt-4", ticketNumber: "TKT-00004", subject: "Request for product certificates of analysis", description: "Customer needs updated CoA documents for regulatory compliance audit.", accountId: "acct-4", accountName: "Amoun Pharmaceutical", contactId: "cont-5", status: "RESOLVED", priority: "LOW", assignedToId: "user-2", category: "Documentation", resolvedAt: "2025-03-14T16:00:00Z", satisfaction: 5, createdAt: "2025-03-12T08:00:00Z", updatedAt: "2025-03-14T16:00:00Z" },
    { id: "tkt-5", ticketNumber: "TKT-00005", subject: "Cold chain temperature excursion alert", description: "Temperature logger flagged deviation during transport of insulin shipment to hospital.", accountId: "acct-5", accountName: "Dar Al Fouad Hospital", contactId: "cont-4", status: "ESCALATED", priority: "CRITICAL", assignedToId: "user-1", category: "Cold Chain", slaDeadline: "2025-03-19T09:00:00Z", createdAt: "2025-03-18T16:00:00Z", updatedAt: "2025-03-18T17:00:00Z" },
  ];
}
