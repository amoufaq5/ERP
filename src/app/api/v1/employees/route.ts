import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
  paginate,
  filterBySearch,
  parseQueryParams,
} from "@/lib/api/api-helpers";
import { validate, createEmployeeSchema } from "@/lib/api/validations";
import { withAuth } from "@/lib/api/with-auth";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {}

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1/employees ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, params } = parseQueryParams(req.url);
    const status = params.get("status");
    const departmentId = params.get("departmentId");
    const position = params.get("position");

    if (prisma) {
      try {
        const where: Record<string, unknown> = {};
        if (status) where.status = status.toUpperCase();
        if (departmentId) where.departmentId = departmentId;
        if (position) where.position = { contains: position };
        if (search) {
          where.OR = [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { email: { contains: search } },
            { employeeNumber: { contains: search } },
            { position: { contains: search } },
          ];
        }

        const [total, records] = await Promise.all([
          prisma.employee.count({ where }),
          prisma.employee.findMany({
            where,
            include: { department: true },
            skip: (Math.max(1, page) - 1) * Math.min(limit, 100),
            take: Math.min(limit, 100),
            orderBy: { createdAt: "desc" },
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

    const mock = generateMockEmployees();
    let filtered = filterBySearch(mock, search, ["firstName", "lastName", "email", "employeeNumber", "position"]);
    if (status) filtered = filtered.filter((e) => e.status === status.toUpperCase());
    if (departmentId) filtered = filtered.filter((e) => e.departmentId === departmentId);
    if (position) filtered = filtered.filter((e) => e.position?.toLowerCase().includes(position.toLowerCase()));
    const { items, pagination } = paginate(filtered, page, limit);
    return apiResponse(items, 200, pagination);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to fetch employees", 500);
  }
}

// ─── POST /api/v1/employees ─────────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { role, userId }) => {
  try {
    const body = await req.json();
    const validation = validate(createEmployeeSchema, body);
    if (!validation.success) return apiError(validation.error, 400);
    const data = validation.data;

    if (prisma) {
      try {
        const record = await prisma.employee.create({
          data: {
            employeeNumber: body.employeeNumber,
            firstName: body.firstName,
            lastName: body.lastName,
            email: body.email,
            phone: body.phone || null,
            departmentId: body.departmentId || null,
            position: body.position || null,
            hireDate: new Date(body.hireDate),
            salary: body.salary ? parseFloat(body.salary) : null,
            status: (body.status || "ACTIVE").toUpperCase(),
            managerId: body.managerId || null,
          },
          include: { department: true },
        });
        return apiResponse(record, 201);
      } catch {}
    }

    const record = {
      id: `emp-${Date.now()}`,
      ...body,
      status: (body.status || "ACTIVE").toUpperCase(),
      createdAt: new Date().toISOString(),
    };
    return apiResponse(record, 201);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to create employee", 500);
  }
});

// ─── Mock data ───────────────────────────────────────────────────────────────

function generateMockEmployees() {
  return [
    { id: "emp-1", employeeNumber: "EMP-001", firstName: "John", lastName: "Smith", email: "john.smith@company.com", phone: "+1-555-0101", departmentId: "dept-1", department: "Sales", position: "Sales Manager", hireDate: "2022-03-15", salary: 75000, status: "ACTIVE", createdAt: "2022-03-15T10:00:00Z" },
    { id: "emp-2", employeeNumber: "EMP-002", firstName: "Sarah", lastName: "Johnson", email: "sarah.johnson@company.com", phone: "+1-555-0102", departmentId: "dept-2", department: "R&D", position: "Research Scientist", hireDate: "2021-07-01", salary: 85000, status: "ACTIVE", createdAt: "2021-07-01T10:00:00Z" },
    { id: "emp-3", employeeNumber: "EMP-003", firstName: "Michael", lastName: "Brown", email: "michael.brown@company.com", phone: "+1-555-0103", departmentId: "dept-3", department: "Quality Assurance", position: "QA Lead", hireDate: "2023-01-10", salary: 70000, status: "ACTIVE", createdAt: "2023-01-10T10:00:00Z" },
    { id: "emp-4", employeeNumber: "EMP-004", firstName: "Emily", lastName: "Davis", email: "emily.davis@company.com", phone: "+1-555-0104", departmentId: "dept-1", department: "Sales", position: "Account Executive", hireDate: "2024-06-01", salary: 55000, status: "ON_LEAVE", createdAt: "2024-06-01T10:00:00Z" },
    { id: "emp-5", employeeNumber: "EMP-005", firstName: "Robert", lastName: "Wilson", email: "robert.wilson@company.com", phone: "+1-555-0105", departmentId: "dept-4", department: "Production", position: "Line Supervisor", hireDate: "2020-11-20", salary: 62000, status: "TERMINATED", createdAt: "2020-11-20T10:00:00Z" },
  ];
}
