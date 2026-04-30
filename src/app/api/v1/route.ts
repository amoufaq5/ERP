import { apiResponse, corsOptions } from "@/lib/api/api-helpers";

export async function OPTIONS() {
  return corsOptions();
}

// ─── GET /api/v1 — health check / index ─────────────────────────────────────

export async function GET() {
  return apiResponse({
    api: "Pharma ERP API",
    version: "1.0.0",
    serverTime: new Date().toISOString(),
    status: "operational",
    endpoints: [
      {
        path: "/api/v1/customers",
        methods: ["GET", "POST"],
        description: "Customer (Account) management",
      },
      {
        path: "/api/v1/customers/:id",
        methods: ["GET", "PATCH", "DELETE"],
        description: "Single customer operations",
      },
      {
        path: "/api/v1/products",
        methods: ["GET", "POST"],
        description: "Product catalog management",
      },
      {
        path: "/api/v1/products/:id",
        methods: ["GET", "PATCH", "DELETE"],
        description: "Single product operations (soft-delete sets DISCONTINUED)",
      },
      {
        path: "/api/v1/invoices",
        methods: ["GET", "POST"],
        description: "Invoice management with line items",
      },
      {
        path: "/api/v1/invoices/:id",
        methods: ["GET", "PATCH", "DELETE"],
        description: "Single invoice operations (soft-delete sets CANCELLED)",
      },
      {
        path: "/api/v1/employees",
        methods: ["GET", "POST"],
        description: "Employee / HR records",
      },
      {
        path: "/api/v1/employees/:id",
        methods: ["GET", "PATCH", "DELETE"],
        description: "Single employee operations (soft-delete sets TERMINATED)",
      },
      {
        path: "/api/v1/sales-orders",
        methods: ["GET", "POST"],
        description: "Sales order management",
      },
      {
        path: "/api/v1/sales-orders/:id",
        methods: ["GET", "PATCH", "DELETE"],
        description: "Single sales order operations",
      },
      {
        path: "/api/v1/leads",
        methods: ["GET", "POST"],
        description: "CRM lead management",
      },
      {
        path: "/api/v1/leads/:id",
        methods: ["GET", "PATCH", "DELETE"],
        description: "Single lead operations",
      },
      {
        path: "/api/v1/purchase-orders",
        methods: ["GET", "POST"],
        description: "Purchase order management",
      },
      {
        path: "/api/v1/purchase-orders/:id",
        methods: ["GET", "PATCH", "DELETE"],
        description: "Single purchase order operations",
      },
    ],
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
    rateLimit: {
      requests: 100,
      window: "15 minutes",
      description: "100 requests per 15-minute window per API key",
    },
  });
}
