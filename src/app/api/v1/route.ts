import { apiResponse, corsOptions } from "@/lib/api/api-helpers";

export async function OPTIONS() {
  return corsOptions();
}

export async function GET() {
  return apiResponse({
    api: "Pharma ERP API",
    version: "1.0.0",
    serverTime: new Date().toISOString(),
    status: "operational",
    modules: {
      finance: [
        { path: "/api/v1/gl-accounts", methods: ["GET", "POST"], description: "Chart of Accounts" },
        { path: "/api/v1/gl-accounts/:id", methods: ["GET", "PATCH", "DELETE"], description: "Single GL account" },
        { path: "/api/v1/journal-entries", methods: ["GET", "POST"], description: "Journal entries with lines" },
        { path: "/api/v1/journal-entries/:id", methods: ["GET", "PATCH", "DELETE"], description: "Single journal entry" },
        { path: "/api/v1/invoices", methods: ["GET", "POST"], description: "Invoice management" },
        { path: "/api/v1/invoices/:id", methods: ["GET", "PATCH", "DELETE"], description: "Single invoice" },
        { path: "/api/v1/payments", methods: ["GET", "POST"], description: "Payment records" },
        { path: "/api/v1/payments/:id", methods: ["GET", "PATCH", "DELETE"], description: "Single payment" },
      ],
      procurement: [
        { path: "/api/v1/suppliers", methods: ["GET", "POST"], description: "Supplier management" },
        { path: "/api/v1/suppliers/:id", methods: ["GET", "PATCH", "DELETE"], description: "Single supplier" },
        { path: "/api/v1/purchase-orders", methods: ["GET", "POST"], description: "Purchase orders" },
        { path: "/api/v1/purchase-orders/:id", methods: ["GET", "PATCH", "DELETE"], description: "Single purchase order" },
      ],
      inventory: [
        { path: "/api/v1/products", methods: ["GET", "POST"], description: "Product catalog" },
        { path: "/api/v1/products/:id", methods: ["GET", "PATCH", "DELETE"], description: "Single product" },
        { path: "/api/v1/warehouses", methods: ["GET", "POST"], description: "Warehouse management" },
        { path: "/api/v1/warehouses/:id", methods: ["GET", "PATCH", "DELETE"], description: "Single warehouse" },
        { path: "/api/v1/stock-movements", methods: ["GET", "POST"], description: "Stock movements" },
        { path: "/api/v1/stock-movements/:id", methods: ["GET", "PATCH", "DELETE"], description: "Single stock movement" },
      ],
      sales: [
        { path: "/api/v1/customers", methods: ["GET", "POST"], description: "Customer management" },
        { path: "/api/v1/customers/:id", methods: ["GET", "PATCH", "DELETE"], description: "Single customer" },
        { path: "/api/v1/sales-orders", methods: ["GET", "POST"], description: "Sales orders" },
        { path: "/api/v1/sales-orders/:id", methods: ["GET", "PATCH", "DELETE"], description: "Single sales order" },
      ],
      crm: [
        { path: "/api/v1/accounts", methods: ["GET", "POST"], description: "CRM accounts" },
        { path: "/api/v1/accounts/:id", methods: ["GET", "PATCH", "DELETE"], description: "Single account" },
        { path: "/api/v1/contacts", methods: ["GET", "POST"], description: "Contact management" },
        { path: "/api/v1/contacts/:id", methods: ["GET", "PATCH", "DELETE"], description: "Single contact" },
        { path: "/api/v1/leads", methods: ["GET", "POST"], description: "Lead management" },
        { path: "/api/v1/leads/:id", methods: ["GET", "PATCH", "DELETE"], description: "Single lead" },
        { path: "/api/v1/opportunities", methods: ["GET", "POST"], description: "Opportunity pipeline" },
        { path: "/api/v1/opportunities/:id", methods: ["GET", "PATCH", "DELETE"], description: "Single opportunity" },
        { path: "/api/v1/campaigns", methods: ["GET", "POST"], description: "Marketing campaigns" },
        { path: "/api/v1/campaigns/:id", methods: ["GET", "PATCH", "DELETE"], description: "Single campaign" },
        { path: "/api/v1/tickets", methods: ["GET", "POST"], description: "Support tickets" },
        { path: "/api/v1/tickets/:id", methods: ["GET", "PATCH", "DELETE"], description: "Single ticket" },
        { path: "/api/v1/territories", methods: ["GET", "POST"], description: "Sales territories" },
        { path: "/api/v1/territories/:id", methods: ["GET", "PATCH", "DELETE"], description: "Single territory" },
      ],
      hr: [
        { path: "/api/v1/employees", methods: ["GET", "POST"], description: "Employee records" },
        { path: "/api/v1/employees/:id", methods: ["GET", "PATCH", "DELETE"], description: "Single employee" },
        { path: "/api/v1/departments", methods: ["GET", "POST"], description: "Department management" },
        { path: "/api/v1/departments/:id", methods: ["GET", "PATCH", "DELETE"], description: "Single department" },
      ],
      ats: [
        { path: "/api/v1/jobs", methods: ["GET", "POST"], description: "Job postings" },
        { path: "/api/v1/jobs/:id", methods: ["GET", "PATCH", "DELETE"], description: "Single job" },
        { path: "/api/v1/candidates", methods: ["GET", "POST"], description: "Candidate pool" },
        { path: "/api/v1/candidates/:id", methods: ["GET", "PATCH", "DELETE"], description: "Single candidate" },
        { path: "/api/v1/applications", methods: ["GET", "POST"], description: "Job applications" },
        { path: "/api/v1/applications/:id", methods: ["GET", "PATCH", "DELETE"], description: "Single application" },
        { path: "/api/v1/training", methods: ["GET", "POST"], description: "Training courses" },
        { path: "/api/v1/training/:id", methods: ["GET", "PATCH", "DELETE"], description: "Single course" },
      ],
      system: [
        { path: "/api/v1/health", methods: ["GET"], description: "Health check & system status" },
        { path: "/api/v1/logs", methods: ["GET"], description: "API request logs (admin)" },
      ],
    },
    pagination: {
      defaultPage: 1,
      defaultLimit: 20,
      maxLimit: 100,
      queryParams: "?page=1&limit=20",
    },
    search: {
      queryParam: "?search=term",
      description: "Case-insensitive search across relevant text fields",
    },
  });
}
