import { headers } from "next/headers";
import { masterDb } from "./master-db";

export async function resolveTenant() {
  const headersList = headers();
  const host = headersList.get("host") || "localhost:3000";

  const slug = headersList.get("x-tenant-slug");
  if (slug) {
    return masterDb.tenant.findUnique({ where: { slug } });
  }

  const subdomain = extractSubdomain(host);
  if (subdomain) {
    return masterDb.tenant.findUnique({ where: { slug: subdomain } });
  }

  const tenant = await masterDb.tenant.findUnique({ where: { domain: host } });
  if (tenant) return tenant;

  return masterDb.tenant.findFirst({ where: { isActive: true } });
}

function extractSubdomain(host: string): string | null {
  const parts = host.split(".");
  if (parts.length >= 3) {
    const sub = parts[0];
    if (sub !== "www" && sub !== "app") return sub;
  }
  return null;
}

export async function getTenantBySlug(slug: string) {
  return masterDb.tenant.findUnique({
    where: { slug },
    include: { users: true },
  });
}

export async function listTenants() {
  return masterDb.tenant.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { createdAt: "desc" },
  });
}
