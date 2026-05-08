// ─── Tenant Plan Type ───────────────────────────────────────────────
export type TenantPlanName = "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

// ─── Tenant User Role ──────────────────────────────────────────────
export type TenantUserRole = "ADMIN" | "MANAGER" | "USER" | "VIEWER";

// ─── Core Tenant ────────────────────────────────────────────────────
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logo?: string;
  primaryColor?: string;
  plan: TenantPlanName;
  maxUsers: number;
  isActive: boolean;
  dbUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Tenant User ────────────────────────────────────────────────────
export interface TenantUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: TenantUserRole;
  createdAt: string;
}

// ─── Plan Definition ────────────────────────────────────────────────
export interface TenantPlan {
  name: TenantPlanName;
  label: string;
  maxUsers: number;
  maxStorageGB: number;
  features: string[];
  price: number;
}

// ─── Plan Constants ─────────────────────────────────────────────────
export const TENANT_PLANS: Record<TenantPlanName, TenantPlan> = {
  STARTER: {
    name: "STARTER",
    label: "Starter",
    maxUsers: 10,
    maxStorageGB: 1,
    features: [
      "Basic CRM",
      "Contact Management",
      "Product Catalog",
      "Basic Reports",
      "Email Support",
    ],
    price: 0,
  },
  PROFESSIONAL: {
    name: "PROFESSIONAL",
    label: "Professional",
    maxUsers: 50,
    maxStorageGB: 10,
    features: [
      "Full CRM",
      "Contact Management",
      "Product Catalog",
      "Advanced Reports",
      "Invoicing",
      "ERP Modules",
      "HR Module",
      "Inventory Management",
      "Priority Support",
    ],
    price: 299,
  },
  ENTERPRISE: {
    name: "ENTERPRISE",
    label: "Enterprise",
    maxUsers: -1, // unlimited
    maxStorageGB: 100,
    features: [
      "Full CRM",
      "Contact Management",
      "Product Catalog",
      "Advanced Reports",
      "Invoicing",
      "ERP Modules",
      "HR Module",
      "Inventory Management",
      "Manufacturing",
      "API Access",
      "SSO / SAML",
      "Custom Integrations",
      "Audit Logs",
      "White-label",
      "Dedicated Account Manager",
      "SLA 99.9%",
    ],
    price: 799,
  },
};

// ─── Helper to create a new Tenant with defaults ────────────────────
export interface CreateTenantInput {
  name: string;
  slug: string;
  domain?: string;
  logo?: string;
  primaryColor?: string;
  plan?: TenantPlanName;
  maxUsers?: number;
}

// ─── Helper to patch a Tenant ───────────────────────────────────────
export type UpdateTenantInput = Partial<
  Pick<Tenant, "name" | "domain" | "logo" | "primaryColor" | "plan" | "maxUsers" | "isActive">
>;

// ─── Helper to add a user ───────────────────────────────────────────
export interface AddTenantUserInput {
  email: string;
  name: string;
  role?: TenantUserRole;
}
