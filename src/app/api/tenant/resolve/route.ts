import { NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant/resolve-tenant";

export async function GET() {
  try {
    const tenant = await resolveTenant();
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    if (!tenant.isActive) {
      return NextResponse.json({ error: "Tenant is inactive" }, { status: 403 });
    }
    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        domain: tenant.domain,
        logo: tenant.logo,
        primaryColor: tenant.primaryColor,
        plan: tenant.plan,
        maxUsers: tenant.maxUsers,
        isActive: tenant.isActive,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to resolve tenant" }, { status: 500 });
  }
}
