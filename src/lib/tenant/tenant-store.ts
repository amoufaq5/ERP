import type {
  Tenant,
  TenantUser,
  CreateTenantInput,
  UpdateTenantInput,
  AddTenantUserInput,
  TenantPlanName,
} from "./tenant-types";
import { TENANT_PLANS } from "./tenant-types";

const API_BASE = "/api/v1/tenants";

// ─── Seed Data ──────────────────────────────────────────────────────

const SEED_TENANTS: Tenant[] = [
  {
    id: "tn-pharmacorp",
    name: "PharmaCorp Egypt",
    slug: "pharmacorp",
    domain: "pharmacorp.pharma-erp.com",
    logo: undefined,
    primaryColor: "#1e40af",
    plan: "ENTERPRISE",
    maxUsers: 500,
    isActive: true,
    createdAt: "2024-03-15T10:00:00Z",
    updatedAt: "2026-01-10T08:30:00Z",
  },
  {
    id: "tn-medlife",
    name: "MedLife Cairo",
    slug: "medlife",
    domain: "medlife.pharma-erp.com",
    logo: undefined,
    primaryColor: "#7c3aed",
    plan: "PROFESSIONAL",
    maxUsers: 50,
    isActive: true,
    createdAt: "2024-08-22T14:30:00Z",
    updatedAt: "2025-11-05T12:00:00Z",
  },
  {
    id: "tn-healthfirst",
    name: "HealthFirst Alex",
    slug: "healthfirst",
    domain: "healthfirst.pharma-erp.com",
    logo: undefined,
    primaryColor: "#059669",
    plan: "STARTER",
    maxUsers: 10,
    isActive: true,
    createdAt: "2025-06-01T09:00:00Z",
    updatedAt: "2026-04-18T16:45:00Z",
  },
];

const SEED_USERS: TenantUser[] = [
  // PharmaCorp Egypt users
  {
    id: "tu-001",
    tenantId: "tn-pharmacorp",
    email: "admin@pharmacorp.com",
    name: "Dr. Sarah El-Masry",
    role: "ADMIN",
    createdAt: "2024-03-15T10:00:00Z",
  },
  {
    id: "tu-002",
    tenantId: "tn-pharmacorp",
    email: "ops@pharmacorp.com",
    name: "Ahmed Khalil",
    role: "MANAGER",
    createdAt: "2024-04-01T08:00:00Z",
  },
  {
    id: "tu-003",
    tenantId: "tn-pharmacorp",
    email: "sales@pharmacorp.com",
    name: "Mona Hassan",
    role: "USER",
    createdAt: "2024-05-12T09:30:00Z",
  },
  // MedLife Cairo users
  {
    id: "tu-004",
    tenantId: "tn-medlife",
    email: "admin@medlife.com",
    name: "Karim Mansour",
    role: "ADMIN",
    createdAt: "2024-08-22T14:30:00Z",
  },
  {
    id: "tu-005",
    tenantId: "tn-medlife",
    email: "pharma@medlife.com",
    name: "Layla Ibrahim",
    role: "USER",
    createdAt: "2025-01-10T11:00:00Z",
  },
  // HealthFirst Alex users
  {
    id: "tu-006",
    tenantId: "tn-healthfirst",
    email: "admin@healthfirst.com",
    name: "Omar Farouk",
    role: "ADMIN",
    createdAt: "2025-06-01T09:00:00Z",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────

function isClient(): boolean {
  return typeof window !== "undefined";
}

// ─── TenantStore ────────────────────────────────────────────────────

class TenantStore {
  private tenants: Tenant[];
  private users: TenantUser[];
  private initialized: boolean;

  constructor() {
    // Start with seed data; API data will replace on first access
    this.tenants = [...SEED_TENANTS];
    this.users = [...SEED_USERS];
    this.initialized = false;
  }

  // ── API calls ─────────────────────────────────────────────────

  private async fetchFromApi(): Promise<void> {
    if (this.initialized || !isClient()) return;
    this.initialized = true;

    try {
      const resp = await fetch(`${API_BASE}?limit=100`, {
        headers: { "Content-Type": "application/json" },
      });
      if (resp.ok) {
        const json = await resp.json();
        const data = json.data ?? json.tenants ?? json ?? [];
        if (Array.isArray(data) && data.length > 0) {
          this.tenants = data;
        }
      }
    } catch {
      // API unavailable -- keep seed data
    }
  }

  private async persistTenant(tenant: Tenant, method: "POST" | "PUT"): Promise<void> {
    if (!isClient()) return;
    try {
      await fetch(API_BASE, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tenant),
      });
    } catch {
      // API unavailable -- local state is authoritative
    }
  }

  // ── Tenant CRUD ─────────────────────────────────────────────────

  getTenants(): Tenant[] {
    // Trigger lazy fetch (fire-and-forget)
    this.fetchFromApi().catch(() => {});
    return [...this.tenants];
  }

  getTenantById(id: string): Tenant | undefined {
    return this.tenants.find((t) => t.id === id);
  }

  getTenantBySlug(slug: string): Tenant | undefined {
    return this.tenants.find((t) => t.slug === slug);
  }

  createTenant(input: CreateTenantInput): Tenant {
    if (!input.name?.trim()) throw new Error("Tenant name is required");
    if (!input.slug?.trim()) throw new Error("Tenant slug is required");
    const plan: TenantPlanName = input.plan ?? "STARTER";
    const planDef = TENANT_PLANS[plan];
    const now = new Date().toISOString();

    const tenant: Tenant = {
      id: `tn-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`,
      name: input.name,
      slug: input.slug,
      domain: input.domain,
      logo: input.logo,
      primaryColor: input.primaryColor,
      plan,
      maxUsers: input.maxUsers ?? planDef.maxUsers,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    // Ensure slug uniqueness
    if (this.tenants.some((t) => t.slug === tenant.slug)) {
      throw new Error(`Tenant with slug "${tenant.slug}" already exists`);
    }

    this.tenants.push(tenant);
    this.persistTenant(tenant, "POST").catch(() => {});
    return tenant;
  }

  updateTenant(id: string, patch: UpdateTenantInput): Tenant {
    const idx = this.tenants.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`Tenant "${id}" not found`);

    const updated: Tenant = {
      ...this.tenants[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    this.tenants[idx] = updated;
    this.persistTenant(updated, "PUT").catch(() => {});
    return updated;
  }

  deactivateTenant(id: string): Tenant {
    return this.updateTenant(id, { isActive: false });
  }

  // ── Tenant Users ────────────────────────────────────────────────

  getTenantUsers(tenantId: string): TenantUser[] {
    return this.users.filter((u) => u.tenantId === tenantId);
  }

  getTenantUserCount(tenantId: string): number {
    return this.users.filter((u) => u.tenantId === tenantId).length;
  }

  addTenantUser(tenantId: string, input: AddTenantUserInput): TenantUser {
    const tenant = this.getTenantById(tenantId);
    if (!tenant) throw new Error(`Tenant "${tenantId}" not found`);

    const currentCount = this.getTenantUserCount(tenantId);
    const planDef = TENANT_PLANS[tenant.plan];
    if (planDef.maxUsers !== -1 && currentCount >= tenant.maxUsers) {
      throw new Error(
        `Tenant "${tenant.name}" has reached its user limit (${tenant.maxUsers})`
      );
    }

    // Check email uniqueness within tenant
    if (this.users.some((u) => u.tenantId === tenantId && u.email === input.email)) {
      throw new Error(`User with email "${input.email}" already exists in this tenant`);
    }

    const user: TenantUser = {
      id: `tu-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`,
      tenantId,
      email: input.email,
      name: input.name,
      role: input.role ?? "USER",
      createdAt: new Date().toISOString(),
    };

    this.users.push(user);
    return user;
  }

  removeTenantUser(tenantId: string, userId: string): void {
    const idx = this.users.findIndex(
      (u) => u.tenantId === tenantId && u.id === userId
    );
    if (idx === -1) throw new Error(`User "${userId}" not found in tenant "${tenantId}"`);

    this.users.splice(idx, 1);
  }

  // ── Reset (useful for testing) ──────────────────────────────────

  reset(): void {
    this.tenants = [...SEED_TENANTS];
    this.users = [...SEED_USERS];
    this.initialized = false;
  }
}

// ─── Singleton Export ───────────────────────────────────────────────

const globalForTenantStore = globalThis as unknown as {
  __tenantStore?: TenantStore;
};

export const tenantStore =
  globalForTenantStore.__tenantStore ?? new TenantStore();

if (typeof window !== "undefined") {
  globalForTenantStore.__tenantStore = tenantStore;
}

export type { TenantStore };
