import { NextRequest, NextResponse } from "next/server";
import { masterDb } from "@/lib/tenant/master-db";
import { hashSync } from "bcryptjs";

export async function GET() {
  try {
    const tenants = await masterDb.tenant.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ tenants });
  } catch {
    return NextResponse.json({ error: "Failed to list tenants" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, slug, domain, plan, maxUsers, adminEmail, adminName, adminPassword } = body;

    if (!name || !slug || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "name, slug, adminEmail, and adminPassword are required" },
        { status: 400 }
      );
    }

    const existing = await masterDb.tenant.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: "Tenant slug already exists" }, { status: 409 });
    }

    const dbUrl = `file:./prisma/tenants/${slug}.db`;

    const tenant = await masterDb.tenant.create({
      data: {
        name,
        slug,
        domain: domain || null,
        dbUrl,
        plan: plan || "STARTER",
        maxUsers: maxUsers || 10,
        users: {
          create: {
            email: adminEmail,
            name: adminName || name + " Admin",
            role: "ADMIN",
          },
        },
      },
      include: { users: true },
    });

    const { PrismaClient } = await import("@prisma/client");
    const tenantPrisma = new PrismaClient({
      datasources: { db: { url: dbUrl } },
    });

    try {
      await tenantPrisma.$executeRawUnsafe(`SELECT 1`);
    } catch {
      // Database will be created on first schema push
    }

    await tenantPrisma.user.create({
      data: {
        name: adminName || name + " Admin",
        email: adminEmail,
        passwordHash: hashSync(adminPassword, 10),
        role: "ADMIN",
        department: "Management",
      },
    });

    await tenantPrisma.$disconnect();

    return NextResponse.json({ tenant }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Failed to create tenant: " + message }, { status: 500 });
  }
}
