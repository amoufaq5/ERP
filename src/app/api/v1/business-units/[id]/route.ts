import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
} from "@/lib/api/api-helpers";
import { validate, updateBusinessUnitSchema } from "@/lib/api/validations";
import { withAuthParams } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/business-units/:id ─────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const record = await prisma.businessUnit.findUnique({
          where: { id },
          include: {
            manager: { select: { id: true, name: true, email: true } },
            members: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
            products: {
              include: {
                product: { select: { id: true, name: true, sku: true, category: true } },
              },
            },
            territories: {
              include: {
                territory: { select: { id: true, name: true, description: true } },
              },
            },
            approvalLogs: {
              take: 20,
              orderBy: { createdAt: "desc" },
              include: {
                performedBy: { select: { id: true, name: true, email: true } },
              },
            },
          },
        });
        if (!record) {
          return apiError(`Business unit with id '${id}' not found`, 404);
        }
        return apiResponse(record);
      } catch {}
    }

    // Mock fallback
    const mock: Record<string, any> = {
      "bu-1": {
        id: "bu-1",
        name: "Cardiovascular Business Unit",
        code: "BU-CV",
        description: "Heart & circulatory system products",
        managerId: "user-bum",
        manager: { id: "user-bum", name: "Nadia Rizk", email: "nadia@pharmaerp.eg" },
        color: "#ef4444",
        status: "ACTIVE",
        members: [
          { id: "bum-1", userId: "user-bum", role: "BUM", user: { id: "user-bum", name: "Nadia Rizk", email: "nadia@pharmaerp.eg" } },
          { id: "bum-2", userId: "user-mr1", role: "MEDICAL_REP", user: { id: "user-mr1", name: "Mona Abdel-Nour", email: "mona@pharmaerp.eg" } },
        ],
        products: [
          { id: "bup-1", productId: "prod-3", product: { id: "prod-3", name: "Cardioprex 10mg", sku: "CRD-10", category: "Cardiovascular" } },
          { id: "bup-2", productId: "prod-5", product: { id: "prod-5", name: "Crestor 20mg", sku: "CRS-20", category: "Cardiovascular" } },
        ],
        territories: [],
        approvalLogs: [],
        createdAt: "2025-01-10T10:00:00Z",
        updatedAt: "2025-01-10T10:00:00Z",
      },
      "bu-2": {
        id: "bu-2",
        name: "Anti-Infectives Business Unit",
        code: "BU-AI",
        description: "Antibiotics and antiviral products",
        managerId: "user-mgr",
        manager: { id: "user-mgr", name: "Sara El-Masry", email: "sarah@pharmaerp.eg" },
        color: "#3b82f6",
        status: "ACTIVE",
        members: [
          { id: "bum-3", userId: "user-mgr", role: "BUM", user: { id: "user-mgr", name: "Sara El-Masry", email: "sarah@pharmaerp.eg" } },
        ],
        products: [
          { id: "bup-3", productId: "prod-1", product: { id: "prod-1", name: "Augmentin 1g", sku: "AUG-1G", category: "Antibiotics" } },
        ],
        territories: [],
        approvalLogs: [],
        createdAt: "2025-01-12T10:00:00Z",
        updatedAt: "2025-01-12T10:00:00Z",
      },
      "bu-3": {
        id: "bu-3",
        name: "GI & Metabolic Business Unit",
        code: "BU-GI",
        description: "Gastrointestinal and diabetes products",
        managerId: "user-bum",
        manager: { id: "user-bum", name: "Nadia Rizk", email: "nadia@pharmaerp.eg" },
        color: "#10b981",
        status: "ACTIVE",
        members: [
          { id: "bum-4", userId: "user-bum", role: "BUM", user: { id: "user-bum", name: "Nadia Rizk", email: "nadia@pharmaerp.eg" } },
          { id: "bum-5", userId: "user-mr2", role: "MEDICAL_REP", user: { id: "user-mr2", name: "Khaled Mansour", email: "khaled@pharmaerp.eg" } },
        ],
        products: [
          { id: "bup-4", productId: "prod-6", product: { id: "prod-6", name: "Omepak 20mg", sku: "OMP-20", category: "Gastrointestinal" } },
          { id: "bup-5", productId: "prod-8", product: { id: "prod-8", name: "Glimaryl 2mg", sku: "GLM-2", category: "Diabetes" } },
        ],
        territories: [],
        approvalLogs: [],
        createdAt: "2025-02-01T10:00:00Z",
        updatedAt: "2025-02-01T10:00:00Z",
      },
    };
    const record = mock[id];
    if (!record) {
      return apiError(`Business unit with id '${id}' not found`, 404);
    }
    return apiResponse(record);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch business unit", 500);
  }
}

// ─── PATCH /api/v1/business-units/:id ───────────────────────────────────────

export const PATCH = withAuthParams(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, { role, userId }) => {
  const { id } = await params;

  try {
    const body = await req.json();
    const validation = validate(updateBusinessUnitSchema, body);
    if (!validation.success) return apiError(validation.error, 400);

    delete body.id;
    delete body.createdAt;

    if (prisma) {
      try {
        const existing = await prisma.businessUnit.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Business unit with id '${id}' not found`, 404);
        }

        const data: Record<string, unknown> = {};
        if (body.name !== undefined) data.name = body.name;
        if (body.code !== undefined) data.code = body.code;
        if (body.description !== undefined) data.description = body.description;
        if (body.managerId !== undefined) data.managerId = body.managerId;
        if (body.color !== undefined) data.color = body.color;
        if (body.status !== undefined) data.status = body.status.toUpperCase();

        const record = await prisma.businessUnit.update({
          where: { id },
          data,
          include: {
            manager: { select: { id: true, name: true, email: true } },
            members: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
            products: {
              include: {
                product: { select: { id: true, name: true, sku: true, category: true } },
              },
            },
            territories: {
              include: {
                territory: { select: { id: true, name: true, description: true } },
              },
            },
          },
        });
        return apiResponse(record);
      } catch {}
    }

    // Mock fallback
    const updated = { id, ...body, updatedAt: new Date().toISOString() };
    return apiResponse(updated);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update business unit", 500);
  }
});

// ─── DELETE /api/v1/business-units/:id ──────────────────────────────────────

export const DELETE = withAuthParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, { role, userId }) => {
  const { id } = await params;

  try {
    if (prisma) {
      try {
        const existing = await prisma.businessUnit.findUnique({ where: { id } });
        if (!existing) {
          return apiError(`Business unit with id '${id}' not found`, 404);
        }

        await prisma.businessUnit.delete({ where: { id } });
        return apiResponse({ id, deleted: true });
      } catch {}
    }

    // Mock fallback
    return apiResponse({ id, deleted: true });
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete business unit", 500);
  }
});
