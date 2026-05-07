/**
 * Shared role types and route ACL definitions.
 * This file is NOT a client component so it can be imported from middleware (edge runtime).
 */

export type UserRole = "ADMIN" | "NSM" | "BUM" | "MARKETEER" | "DISTRICT_MANAGER" | "MEDICAL_REP" | "ACCOUNTANT" | "WAREHOUSE" | "HR";

// Each route is identified by href; these are the ACLs per role.
// ADMIN always has full access and can override per-user in settings.
export const ROLE_ROUTES: Record<UserRole, string[]> = {
  ADMIN: ["*"],
  NSM: [
    "/dashboard", "/messages", "/tasks",
    "/hubs/crm",
    "/crm/accounts", "/crm/contacts", "/crm/leads", "/crm/opportunities",
    "/crm/campaigns", "/crm/tickets", "/crm/loyalty",
    "/crm/bum", "/crm/my-team", "/crm/district-manager", "/crm/medical-rep",
    "/crm/business-units", "/crm/territories", "/crm/weekly-plan", "/crm/doctors",
    "/crm/gps-tracking", "/crm/market-requests", "/crm/reports", "/crm/kpis",
    "/crm/call-analysis", "/crm/expenses", "/crm/product-guide",
    "/ats/training",
    "/admin/audit-log",
    "/reports", "/settings", "/settings/profile",
  ],
  BUM: [
    "/dashboard", "/messages", "/tasks",
    "/hubs/crm",
    "/crm/accounts", "/crm/contacts", "/crm/leads", "/crm/opportunities",
    "/crm/campaigns", "/crm/tickets", "/crm/loyalty",
    "/crm/bum", "/crm/my-team", "/crm/district-manager", "/crm/medical-rep",
    "/crm/territories", "/crm/weekly-plan", "/crm/doctors", "/crm/gps-tracking", "/crm/market-requests", "/crm/reports", "/crm/kpis", "/crm/call-analysis", "/crm/expenses", "/crm/product-guide",
    "/ats/training",
    "/reports", "/settings", "/settings/profile",
  ],
  MARKETEER: [
    "/dashboard", "/messages", "/tasks",
    "/hubs/crm",
    "/crm/accounts", "/crm/contacts", "/crm/leads", "/crm/opportunities",
    "/crm/campaigns", "/crm/tickets", "/crm/loyalty",
    "/crm/marketeer", "/crm/district-manager", "/crm/medical-rep",
    "/crm/business-units", "/crm/territories", "/crm/weekly-plan", "/crm/doctors", "/crm/gps-tracking", "/crm/market-requests", "/crm/reports", "/crm/kpis", "/crm/call-analysis", "/crm/expenses",
    "/ats/training",
    "/settings", "/settings/profile",
  ],
  DISTRICT_MANAGER: [
    "/dashboard", "/messages", "/tasks",
    "/hubs/crm",
    "/crm/accounts", "/crm/contacts", "/crm/tickets",
    "/crm/district-manager", "/crm/medical-rep",
    "/crm/weekly-plan", "/crm/doctors", "/crm/gps-tracking", "/crm/market-requests", "/crm/reports", "/crm/kpis", "/crm/call-analysis", "/crm/expenses",
    "/ats/training",
    "/settings", "/settings/profile",
  ],
  MEDICAL_REP: [
    "/dashboard", "/messages", "/tasks",
    "/hubs/crm",
    "/crm/accounts", "/crm/contacts", "/crm/tickets",
    "/crm/medical-rep", "/crm/territories", "/crm/weekly-plan", "/crm/doctors", "/crm/gps-tracking", "/crm/market-requests", "/crm/kpis", "/crm/expenses",
    "/ats/training",
    "/settings", "/settings/profile",
  ],
  ACCOUNTANT: [
    "/dashboard", "/messages", "/tasks",
    "/hubs/finance", "/hubs/supply-chain",
    "/erp/finance", "/erp/accounting", "/erp/collections", "/erp/returns", "/erp/partner-ledger", "/erp/partner-detail",
    "/erp/procurement", "/erp/sales-order", "/erp/products",
    "/reports", "/settings/profile",
  ],
  WAREHOUSE: [
    "/dashboard", "/messages", "/tasks",
    "/hubs/supply-chain",
    "/erp/inventory", "/erp/products", "/erp/procurement", "/erp/sales-order", "/erp/returns",
    "/supply-chain",
    "/settings/profile",
  ],
  HR: [
    "/dashboard", "/messages", "/tasks",
    "/hubs/hr",
    "/erp/hr",
    "/ats/jobs", "/ats/candidates", "/ats/interviews", "/ats/onboarding", "/ats/training",
    "/crm/expenses",
    "/settings", "/settings/profile",
  ],
};
