import { NextRequest } from "next/server";
import { apiResponse, apiError, corsOptions } from "@/lib/api/api-helpers";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

// ─── Entity → Prisma model mapping ──────────────────────────────────────────

interface EntityConfig {
  model: string;
  include?: Record<string, unknown>;
  softDelete?: boolean;
  softDeleteField?: string;
  searchFields?: string[];
}

const ENTITY_MAP: Record<string, EntityConfig> = {
  customers: {
    model: "account",
    include: { contacts: true },
    softDelete: false,
    searchFields: ["name", "email"],
  },
  products: {
    model: "product",
    softDelete: true,
    softDeleteField: "status",
    searchFields: ["name", "sku"],
  },
  invoices: {
    model: "invoice",
    include: { customer: true, items: true, payments: true },
    softDelete: true,
    softDeleteField: "status",
    searchFields: ["invoiceNumber"],
  },
  employees: {
    model: "employee",
    include: { department: true },
    softDelete: true,
    softDeleteField: "status",
    searchFields: ["firstName", "lastName", "email"],
  },
  "sales-orders": {
    model: "salesOrder",
    include: { customer: true, items: { include: { product: true } } },
    softDelete: true,
    softDeleteField: "status",
    searchFields: ["orderNumber"],
  },
  leads: {
    model: "lead",
    include: { assignedTo: { select: { id: true, name: true, email: true } }, opportunities: true },
    softDelete: true,
    softDeleteField: "status",
    searchFields: ["firstName", "lastName", "email", "company"],
  },
  "purchase-orders": {
    model: "purchaseOrder",
    include: { supplier: true, items: { include: { product: true } }, createdBy: { select: { id: true, name: true } } },
    softDelete: true,
    softDeleteField: "status",
    searchFields: ["poNumber"],
  },
};

// ─── Mock data store (fallback when Prisma unavailable) ─────────────────────

const MOCK_DATA: Record<string, Record<string, any>> = {
  customers: {
    "acct-1": { id: "acct-1", name: "Acme Pharma Inc.", email: "contact@acme.com", phone: "+1-555-0100", industry: "Pharmaceutical", type: "CUSTOMER", city: "New York", country: "USA", createdAt: "2025-01-15T10:00:00Z", updatedAt: "2025-01-15T10:00:00Z" },
    "acct-2": { id: "acct-2", name: "MedLife Labs", email: "info@medlife.com", phone: "+1-555-0200", industry: "Biotech", type: "CUSTOMER", city: "Boston", country: "USA", createdAt: "2025-02-20T10:00:00Z", updatedAt: "2025-02-20T10:00:00Z" },
  },
  products: {
    "prod-1": { id: "prod-1", sku: "PARA-500", name: "Paracetamol 500mg", description: "Pain relief tablets", category: "OTC", unitPrice: 5.99, costPrice: 2.5, quantity: 1200, reorderLevel: 200, unit: "box", status: "ACTIVE", createdAt: "2025-01-10T10:00:00Z" },
    "prod-2": { id: "prod-2", sku: "AMOX-250", name: "Amoxicillin 250mg", description: "Antibiotic capsules", category: "Prescription", unitPrice: 12.5, costPrice: 6.0, quantity: 800, reorderLevel: 100, unit: "box", status: "ACTIVE", createdAt: "2025-01-12T10:00:00Z" },
  },
  invoices: {
    "inv-1": { id: "inv-1", invoiceNumber: "INV-2025-001", customerId: "acct-1", customerName: "Acme Pharma Inc.", date: "2025-01-20", dueDate: "2025-02-20", status: "PAID", subtotal: 1500, tax: 150, total: 1650, createdAt: "2025-01-20T10:00:00Z" },
    "inv-2": { id: "inv-2", invoiceNumber: "INV-2025-002", customerId: "acct-2", customerName: "MedLife Labs", date: "2025-02-15", dueDate: "2025-03-15", status: "SENT", subtotal: 3200, tax: 320, total: 3520, createdAt: "2025-02-15T10:00:00Z" },
  },
  employees: {
    "emp-1": { id: "emp-1", employeeNumber: "EMP-001", firstName: "John", lastName: "Smith", email: "john.smith@company.com", position: "Sales Manager", status: "ACTIVE", hireDate: "2022-03-15", salary: 75000, createdAt: "2022-03-15T10:00:00Z" },
    "emp-2": { id: "emp-2", employeeNumber: "EMP-002", firstName: "Sarah", lastName: "Johnson", email: "sarah.johnson@company.com", position: "Research Scientist", status: "ACTIVE", hireDate: "2021-07-01", salary: 85000, createdAt: "2021-07-01T10:00:00Z" },
  },
  "sales-orders": {
    "so-1": { id: "so-1", orderNumber: "SO-2025-001", customerId: "acct-1", customerName: "Acme Pharma Inc.", date: "2025-01-25", status: "DELIVERED", total: 4500, createdAt: "2025-01-25T10:00:00Z" },
    "so-2": { id: "so-2", orderNumber: "SO-2025-002", customerId: "acct-2", customerName: "MedLife Labs", date: "2025-02-18", status: "SHIPPED", total: 8200, createdAt: "2025-02-18T10:00:00Z" },
  },
  leads: {
    "lead-1": { id: "lead-1", firstName: "Alice", lastName: "Walker", email: "alice@example.com", company: "HealthFirst Inc.", source: "WEB", status: "NEW", score: 45, value: 15000, createdAt: "2025-03-01T10:00:00Z" },
    "lead-2": { id: "lead-2", firstName: "Bob", lastName: "Martinez", email: "bob@biotech.com", company: "BioTech Solutions", source: "REFERRAL", status: "CONTACTED", score: 72, value: 32000, createdAt: "2025-03-05T10:00:00Z" },
  },
  "purchase-orders": {
    "po-1": { id: "po-1", poNumber: "PO-2025-001", supplierId: "sup-1", supplierName: "ChemSource Ltd", date: "2025-01-10", status: "RECEIVED", total: 25000, createdAt: "2025-01-10T10:00:00Z" },
    "po-2": { id: "po-2", poNumber: "PO-2025-002", supplierId: "sup-2", supplierName: "PharmaRaw Inc.", date: "2025-02-05", status: "APPROVED", total: 18500, createdAt: "2025-02-05T10:00:00Z" },
  },
};

// ─── OPTIONS ─────────────────────────────────────────────────────────────────

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/:entity/:id ────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> },
) {
  const { entity, id } = await params;

  const config = ENTITY_MAP[entity];
  if (!config) {
    return apiError(`Unknown entity: ${entity}`, 404);
  }

  try {
    if (prisma) {
      try {
        const record = await (prisma as any)[config.model].findUnique({
          where: { id },
          include: config.include,
        });
        if (!record) {
          return apiError(`${entity} with id '${id}' not found`, 404);
        }
        return apiResponse(record);
      } catch {}
    }

    // Mock fallback
    const mockStore = MOCK_DATA[entity] || {};
    const record = mockStore[id];
    if (!record) {
      return apiError(`${entity} with id '${id}' not found`, 404);
    }
    return apiResponse(record);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch record", 500);
  }
}

// ─── PATCH /api/v1/:entity/:id ──────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> },
) {
  const { entity, id } = await params;

  const config = ENTITY_MAP[entity];
  if (!config) {
    return apiError(`Unknown entity: ${entity}`, 404);
  }

  try {
    const body = await req.json();
    if (!body || Object.keys(body).length === 0) {
      return apiError("Request body cannot be empty", 400);
    }

    // Remove immutable fields
    delete body.id;
    delete body.createdAt;

    if (prisma) {
      try {
        // Verify the record exists first
        const existing = await (prisma as any)[config.model].findUnique({
          where: { id },
        });
        if (!existing) {
          return apiError(`${entity} with id '${id}' not found`, 404);
        }

        // Convert date strings to Date objects for known date fields
        const dateFields = ["date", "dueDate", "expectedDate", "hireDate", "startDate", "endDate", "convertedDate"];
        for (const field of dateFields) {
          if (body[field] && typeof body[field] === "string") {
            body[field] = new Date(body[field]);
          }
        }

        // Convert numeric strings
        const floatFields = ["unitPrice", "costPrice", "total", "subtotal", "tax", "salary", "value", "annualRevenue"];
        for (const field of floatFields) {
          if (body[field] !== undefined && body[field] !== null) {
            body[field] = parseFloat(body[field]);
          }
        }
        const intFields = ["quantity", "reorderLevel", "score", "employeeCount"];
        for (const field of intFields) {
          if (body[field] !== undefined && body[field] !== null) {
            body[field] = parseInt(body[field]);
          }
        }

        const record = await (prisma as any)[config.model].update({
          where: { id },
          data: body,
          include: config.include,
        });
        return apiResponse(record);
      } catch {}
    }

    // Mock fallback
    const mockStore = MOCK_DATA[entity] || {};
    const existing = mockStore[id];
    if (!existing) {
      return apiError(`${entity} with id '${id}' not found`, 404);
    }
    const updated = { ...existing, ...body, updatedAt: new Date().toISOString() };
    mockStore[id] = updated;
    return apiResponse(updated);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to update record", 500);
  }
}

// ─── DELETE /api/v1/:entity/:id ─────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> },
) {
  const { entity, id } = await params;

  const config = ENTITY_MAP[entity];
  if (!config) {
    return apiError(`Unknown entity: ${entity}`, 404);
  }

  try {
    if (prisma) {
      try {
        const existing = await (prisma as any)[config.model].findUnique({
          where: { id },
        });
        if (!existing) {
          return apiError(`${entity} with id '${id}' not found`, 404);
        }

        // Soft-delete if the entity supports it
        if (config.softDelete && config.softDeleteField) {
          const softValue =
            config.softDeleteField === "status"
              ? entity === "employees"
                ? "TERMINATED"
                : entity === "products"
                  ? "DISCONTINUED"
                  : "CANCELLED"
              : false;

          const record = await (prisma as any)[config.model].update({
            where: { id },
            data: { [config.softDeleteField]: softValue },
          });
          return apiResponse({ ...record, _softDeleted: true });
        }

        // Hard delete
        await (prisma as any)[config.model].delete({ where: { id } });
        return apiResponse({ id, deleted: true });
      } catch {}
    }

    // Mock fallback
    const mockStore = MOCK_DATA[entity] || {};
    const existing = mockStore[id];
    if (!existing) {
      return apiError(`${entity} with id '${id}' not found`, 404);
    }

    if (config.softDelete && config.softDeleteField) {
      const softValue =
        config.softDeleteField === "status"
          ? entity === "employees"
            ? "TERMINATED"
            : entity === "products"
              ? "DISCONTINUED"
              : "CANCELLED"
          : false;
      existing[config.softDeleteField] = softValue;
      return apiResponse({ ...existing, _softDeleted: true });
    }

    delete mockStore[id];
    return apiResponse({ id, deleted: true });
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to delete record", 500);
  }
}
