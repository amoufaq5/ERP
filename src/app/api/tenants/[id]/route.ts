// @ts-nocheck — masterDb.tenant requires Prisma Tenant model (not yet generated)
import { NextRequest, NextResponse } from "next/server";
import { masterDb } from "@/lib/tenant/master-db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenant = await masterDb.tenant.findUnique({
      where: { id },
      include: {
        users: { orderBy: { createdAt: "desc" } },
        _count: { select: { users: true } },
      },
    });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    return NextResponse.json({ tenant });
  } catch {
    return NextResponse.json({ error: "Failed to get tenant" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, domain, logo, primaryColor, plan, maxUsers, isActive } = body;

    const tenant = await masterDb.tenant.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(domain !== undefined && { domain: domain || null }),
        ...(logo !== undefined && { logo }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(plan !== undefined && { plan }),
        ...(maxUsers !== undefined && { maxUsers }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    return NextResponse.json({ tenant });
  } catch {
    return NextResponse.json({ error: "Failed to update tenant" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await masterDb.tenant.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to deactivate tenant" }, { status: 500 });
  }
}
