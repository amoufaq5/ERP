import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  filterBySearch,
  validateRequiredFields,
  parseQueryParams,
} from "@/lib/api/api-helpers";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/contacts ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const accountId = params.get("accountId");
    const doNotCall = params.get("doNotCall");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (accountId) where.accountId = accountId;
        if (doNotCall) where.doNotCall = doNotCall === "true";
        if (search) {
          where.OR = [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
            { title: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.contact.count({ where }),
          prisma.contact.findMany({
            where,
            skip: (Math.max(1, page) - 1) * Math.min(limit, 100),
            take: Math.min(limit, 100),
            orderBy: { createdAt: "desc" },
            include: { account: { select: { id: true, name: true } } },
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

    const mock = generateMockContacts();
    let filtered = filterBySearch(mock, search, ["firstName", "lastName", "email", "phone", "title"]);
    if (accountId) filtered = filtered.filter((c) => c.accountId === accountId);
    if (doNotCall) filtered = filtered.filter((c) => c.doNotCall === (doNotCall === "true"));
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch contacts", 500);
  }
}

// ─── POST /api/v1/contacts ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const missing = validateRequiredFields(body, ["firstName", "lastName"]);
    if (missing.length > 0) {
      return apiError(`Missing required fields: ${missing.join(", ")}`, 400);
    }

    if (prisma) {
      try {
        const record = await prisma.contact.create({
          data: {
            firstName: body.firstName,
            lastName: body.lastName,
            email: body.email || null,
            phone: body.phone || null,
            mobile: body.mobile || null,
            title: body.title || null,
            accountId: body.accountId || null,
            ownerId: body.ownerId || null,
            doNotCall: body.doNotCall || false,
            doNotEmail: body.doNotEmail || false,
          },
        });
        return apiResponse(record, 201);
      } catch {}
    }

    const record = {
      id: `cont-${Date.now()}`,
      ...body,
      doNotCall: body.doNotCall || false,
      doNotEmail: body.doNotEmail || false,
      createdAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create contact", 500);
  }
}

// ─── Mock data ─────────────────────────────────────────────────────────────

function generateMockContacts() {
  return [
    { id: "cont-1", firstName: "Dr. Ahmed", lastName: "El-Sayed", email: "ahmed.elsayed@evapharma.com", phone: "+20-10-1234-5678", mobile: "+20-12-3456-7890", title: "Chief Pharmacist", accountId: "acct-1", accountName: "Eva Pharma", doNotCall: false, doNotEmail: false, createdAt: "2025-01-12T10:00:00Z" },
    { id: "cont-2", firstName: "Dr. Fatma", lastName: "Hassan", email: "fatma.hassan@asu-hospital.edu.eg", phone: "+20-10-2345-6789", mobile: "+20-11-4567-8901", title: "Head of Procurement", accountId: "acct-3", accountName: "Ain Shams University Hospital", doNotCall: false, doNotEmail: false, createdAt: "2025-01-20T10:00:00Z" },
    { id: "cont-3", firstName: "Dr. Mohamed", lastName: "Kamal", email: "m.kamal@eipico.com.eg", phone: "+20-10-3456-7890", mobile: "+20-12-5678-9012", title: "Medical Director", accountId: "acct-2", accountName: "EIPICO", doNotCall: false, doNotEmail: true, createdAt: "2025-02-05T10:00:00Z" },
    { id: "cont-4", firstName: "Dr. Nour", lastName: "Abdallah", email: "nour.abdallah@daralfouad.com", phone: "+20-10-4567-8901", mobile: "+20-11-6789-0123", title: "Pharmacy Director", accountId: "acct-5", accountName: "Dar Al Fouad Hospital", doNotCall: true, doNotEmail: false, createdAt: "2025-02-15T10:00:00Z" },
    { id: "cont-5", firstName: "Dr. Youssef", lastName: "Ibrahim", email: "y.ibrahim@amoun.com", phone: "+20-10-5678-9012", mobile: "+20-12-7890-1234", title: "R&D Manager", accountId: "acct-4", accountName: "Amoun Pharmaceutical", doNotCall: false, doNotEmail: false, createdAt: "2025-03-01T10:00:00Z" },
  ];
}
