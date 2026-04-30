"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n/i18n-context";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string | null;
}

interface EndpointDoc {
  method: string;
  path: string;
  description: string;
  queryParams?: string[];
  bodyFields?: string[];
  exampleRequest?: string;
  exampleResponse?: string;
}

// ─── Endpoint documentation data ─────────────────────────────────────────────

const ENDPOINTS: EndpointDoc[] = [
  // Health check
  {
    method: "GET",
    path: "/api/v1",
    description: "API health check. Returns version, available endpoints, and server time.",
    exampleResponse: JSON.stringify(
      {
        success: true,
        data: {
          api: "Pharma ERP API",
          version: "1.0.0",
          serverTime: "2026-04-30T12:00:00.000Z",
          status: "operational",
        },
      },
      null,
      2,
    ),
  },
  // Customers
  {
    method: "GET",
    path: "/api/v1/customers",
    description: "List all customers with pagination, search, and filtering.",
    queryParams: ["page", "limit", "search", "type", "city", "country"],
    exampleResponse: JSON.stringify(
      {
        success: true,
        data: [{ id: "acct-1", name: "Acme Pharma Inc.", type: "CUSTOMER", city: "New York" }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      null,
      2,
    ),
  },
  {
    method: "POST",
    path: "/api/v1/customers",
    description: "Create a new customer account.",
    bodyFields: ["name (required)", "email", "phone", "industry", "type", "city", "country"],
    exampleRequest: JSON.stringify(
      { name: "New Pharma Co.", email: "info@newpharma.com", type: "CUSTOMER", city: "Chicago" },
      null,
      2,
    ),
    exampleResponse: JSON.stringify(
      { success: true, data: { id: "acct-new", name: "New Pharma Co.", type: "CUSTOMER" } },
      null,
      2,
    ),
  },
  {
    method: "GET",
    path: "/api/v1/customers/:id",
    description: "Get a single customer by ID with related contacts.",
  },
  {
    method: "PATCH",
    path: "/api/v1/customers/:id",
    description: "Update customer fields. Send only the fields to change.",
    exampleRequest: JSON.stringify({ city: "San Francisco", phone: "+1-555-9999" }, null, 2),
  },
  {
    method: "DELETE",
    path: "/api/v1/customers/:id",
    description: "Delete a customer account (hard delete).",
  },
  // Products
  {
    method: "GET",
    path: "/api/v1/products",
    description: "List products with pagination, search, and filtering.",
    queryParams: ["page", "limit", "search", "category", "status"],
    exampleResponse: JSON.stringify(
      {
        success: true,
        data: [{ id: "prod-1", sku: "PARA-500", name: "Paracetamol 500mg", unitPrice: 5.99, status: "ACTIVE" }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      null,
      2,
    ),
  },
  {
    method: "POST",
    path: "/api/v1/products",
    description: "Create a new product.",
    bodyFields: ["name (required)", "sku (required)", "unitPrice (required)", "costPrice (required)", "category", "quantity", "unit", "status"],
    exampleRequest: JSON.stringify(
      { name: "Aspirin 100mg", sku: "ASP-100", unitPrice: 3.99, costPrice: 1.5, category: "OTC" },
      null,
      2,
    ),
  },
  {
    method: "GET",
    path: "/api/v1/products/:id",
    description: "Get a single product by ID.",
  },
  {
    method: "PATCH",
    path: "/api/v1/products/:id",
    description: "Update product fields.",
    exampleRequest: JSON.stringify({ unitPrice: 6.49, quantity: 1500 }, null, 2),
  },
  {
    method: "DELETE",
    path: "/api/v1/products/:id",
    description: "Soft-delete a product (sets status to DISCONTINUED).",
  },
  // Invoices
  {
    method: "GET",
    path: "/api/v1/invoices",
    description: "List invoices with pagination, search, and filtering.",
    queryParams: ["page", "limit", "search", "status", "customerId"],
  },
  {
    method: "POST",
    path: "/api/v1/invoices",
    description: "Create a new invoice with line items.",
    bodyFields: [
      "invoiceNumber (required)",
      "customerId (required)",
      "date (required)",
      "dueDate (required)",
      "subtotal (required)",
      "total (required)",
      "tax",
      "notes",
      "items[]",
    ],
    exampleRequest: JSON.stringify(
      {
        invoiceNumber: "INV-2026-010",
        customerId: "acct-1",
        date: "2026-04-30",
        dueDate: "2026-05-30",
        subtotal: 1000,
        tax: 100,
        total: 1100,
        items: [{ description: "Paracetamol 500mg x100", quantity: 100, unitPrice: 5.99, tax: 59.9, total: 658.9 }],
      },
      null,
      2,
    ),
  },
  {
    method: "PATCH",
    path: "/api/v1/invoices/:id",
    description: "Update invoice fields.",
  },
  {
    method: "DELETE",
    path: "/api/v1/invoices/:id",
    description: "Soft-delete an invoice (sets status to CANCELLED).",
  },
  // Employees
  {
    method: "GET",
    path: "/api/v1/employees",
    description: "List employees with pagination, search, and filtering.",
    queryParams: ["page", "limit", "search", "status", "departmentId", "position"],
  },
  {
    method: "POST",
    path: "/api/v1/employees",
    description: "Create a new employee record.",
    bodyFields: [
      "employeeNumber (required)",
      "firstName (required)",
      "lastName (required)",
      "email (required)",
      "hireDate (required)",
      "phone",
      "departmentId",
      "position",
      "salary",
    ],
    exampleRequest: JSON.stringify(
      {
        employeeNumber: "EMP-010",
        firstName: "Jane",
        lastName: "Doe",
        email: "jane.doe@company.com",
        hireDate: "2026-05-01",
        position: "Pharmacist",
        salary: 72000,
      },
      null,
      2,
    ),
  },
  {
    method: "PATCH",
    path: "/api/v1/employees/:id",
    description: "Update employee fields.",
  },
  {
    method: "DELETE",
    path: "/api/v1/employees/:id",
    description: "Soft-delete an employee (sets status to TERMINATED).",
  },
  // Sales Orders
  {
    method: "GET",
    path: "/api/v1/sales-orders",
    description: "List sales orders with pagination, search, and filtering.",
    queryParams: ["page", "limit", "search", "status", "customerId"],
  },
  {
    method: "POST",
    path: "/api/v1/sales-orders",
    description: "Create a new sales order with line items.",
    bodyFields: [
      "orderNumber (required)",
      "customerId (required)",
      "date (required)",
      "total (required)",
      "shippingAddress",
      "notes",
      "items[]",
    ],
  },
  {
    method: "PATCH",
    path: "/api/v1/sales-orders/:id",
    description: "Update sales order fields.",
  },
  {
    method: "DELETE",
    path: "/api/v1/sales-orders/:id",
    description: "Soft-delete a sales order (sets status to CANCELLED).",
  },
  // Leads
  {
    method: "GET",
    path: "/api/v1/leads",
    description: "List CRM leads with pagination, search, and filtering.",
    queryParams: ["page", "limit", "search", "status", "source", "assignedToId"],
  },
  {
    method: "POST",
    path: "/api/v1/leads",
    description: "Create a new lead.",
    bodyFields: [
      "firstName (required)",
      "lastName (required)",
      "email",
      "phone",
      "company",
      "source",
      "status",
      "score",
      "value",
    ],
    exampleRequest: JSON.stringify(
      { firstName: "Maria", lastName: "Garcia", email: "maria@example.com", company: "HealthPlus", source: "WEB" },
      null,
      2,
    ),
  },
  {
    method: "PATCH",
    path: "/api/v1/leads/:id",
    description: "Update lead fields.",
  },
  {
    method: "DELETE",
    path: "/api/v1/leads/:id",
    description: "Soft-delete a lead (sets status to CANCELLED).",
  },
  // Purchase Orders
  {
    method: "GET",
    path: "/api/v1/purchase-orders",
    description: "List purchase orders with pagination, search, and filtering.",
    queryParams: ["page", "limit", "search", "status", "supplierId"],
  },
  {
    method: "POST",
    path: "/api/v1/purchase-orders",
    description: "Create a new purchase order.",
    bodyFields: [
      "poNumber (required)",
      "supplierId (required)",
      "date (required)",
      "total (required)",
      "createdById (required)",
      "expectedDate",
      "notes",
      "items[]",
    ],
  },
  {
    method: "PATCH",
    path: "/api/v1/purchase-orders/:id",
    description: "Update purchase order fields.",
  },
  {
    method: "DELETE",
    path: "/api/v1/purchase-orders/:id",
    description: "Soft-delete a purchase order (sets status to CANCELLED).",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  POST: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  PATCH: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

function generateKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const prefix = "pk_live_";
  let result = prefix;
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const STORAGE_KEY = "pharma_erp_api_keys";

function loadKeys(): ApiKey[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveKeys(keys: ApiKey[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ApiDocumentationPage() {
  const { t } = useTranslation();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [expandedEndpoint, setExpandedEndpoint] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    setApiKeys(loadKeys());
  }, []);

  const handleGenerateKey = useCallback(() => {
    const name = newKeyName.trim() || `API Key ${apiKeys.length + 1}`;
    const newKey: ApiKey = {
      id: `key-${Date.now()}`,
      name,
      key: generateKey(),
      createdAt: new Date().toISOString(),
      lastUsed: null,
    };
    const updated = [...apiKeys, newKey];
    setApiKeys(updated);
    saveKeys(updated);
    setNewKeyName("");
  }, [apiKeys, newKeyName]);

  const handleRevokeKey = useCallback(
    (id: string) => {
      const updated = apiKeys.filter((k) => k.id !== id);
      setApiKeys(updated);
      saveKeys(updated);
    },
    [apiKeys],
  );

  const handleCopyKey = useCallback((key: string) => {
    navigator.clipboard.writeText(key).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  }, []);

  const toggleEndpoint = useCallback(
    (idx: number) => {
      setExpandedEndpoint(expandedEndpoint === idx ? null : idx);
    },
    [expandedEndpoint],
  );

  // Group endpoints by resource
  const grouped: Record<string, EndpointDoc[]> = {};
  for (const ep of ENDPOINTS) {
    const parts = ep.path.split("/");
    const resource = parts[3] === undefined ? "General" : parts[3].replace(/:.*/, "");
    const groupName = resource.charAt(0).toUpperCase() + resource.slice(1);
    if (!grouped[groupName]) grouped[groupName] = [];
    grouped[groupName].push(ep);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("api_documentation") !== "api_documentation" ? t("api_documentation") : "API Documentation"}
        description="REST API reference for the Pharma ERP system. All endpoints return JSON and support CORS."
      />

      {/* ── Rate Limiting Info ──────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Base URL</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">/api/v1</code>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rate Limit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">100 requests</p>
            <p className="text-sm text-muted-foreground">per 15-minute window per API key</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Authentication</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Pass your API key via the <code className="bg-muted px-1 rounded">X-API-Key</code> header
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Response Format ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Response Format</CardTitle>
          <CardDescription>All endpoints return a consistent JSON structure.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto font-mono">
{`// Success
{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}

// Error
{
  "success": false,
  "error": "Descriptive error message"
}`}
          </pre>
        </CardContent>
      </Card>

      {/* ── Endpoints Table ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Endpoints</CardTitle>
          <CardDescription>Click any row to expand details, examples, and parameters.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {Object.entries(grouped).map(([group, endpoints]) => (
            <div key={group}>
              <div className="px-6 py-3 bg-muted/50 border-b border-t">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {group}
                </h3>
              </div>
              <div className="divide-y">
                {endpoints.map((ep, epIdx) => {
                  const globalIdx = ENDPOINTS.indexOf(ep);
                  const isExpanded = expandedEndpoint === globalIdx;
                  return (
                    <div key={`${ep.method}-${ep.path}-${epIdx}`}>
                      <button
                        type="button"
                        className="w-full px-6 py-3 flex items-center gap-4 hover:bg-muted/30 transition-colors text-left"
                        onClick={() => toggleEndpoint(globalIdx)}
                      >
                        <Badge className={`${METHOD_COLORS[ep.method]} font-mono text-xs min-w-[60px] justify-center`}>
                          {ep.method}
                        </Badge>
                        <code className="text-sm font-mono flex-1">{ep.path}</code>
                        <span className="text-sm text-muted-foreground hidden sm:block max-w-xs truncate">
                          {ep.description}
                        </span>
                        <svg
                          className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isExpanded && (
                        <div className="px-6 pb-4 pt-1 bg-muted/10 border-t space-y-3">
                          <p className="text-sm text-muted-foreground">{ep.description}</p>

                          {ep.queryParams && ep.queryParams.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                                Query Parameters
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {ep.queryParams.map((p) => (
                                  <Badge key={p} className="bg-muted text-foreground font-mono text-xs">
                                    {p}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {ep.bodyFields && ep.bodyFields.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                                Request Body Fields
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {ep.bodyFields.map((f) => (
                                  <Badge
                                    key={f}
                                    className={`font-mono text-xs ${f.includes("required") ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" : "bg-muted text-foreground"}`}
                                  >
                                    {f}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {ep.exampleRequest && (
                            <div>
                              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                                Example Request Body
                              </p>
                              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto font-mono">
                                {ep.exampleRequest}
                              </pre>
                            </div>
                          )}

                          {ep.exampleResponse && (
                            <div>
                              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                                Example Response
                              </p>
                              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto font-mono">
                                {ep.exampleResponse}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── API Key Management ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">API Key Management</CardTitle>
          <CardDescription>
            Generate and manage API keys for external access. Keys are stored in your browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Generate new key */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (optional)"
              className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button onClick={handleGenerateKey}>Generate Key</Button>
          </div>

          {/* Key list */}
          {apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No API keys generated yet. Create one to get started.
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              {apiKeys.map((apiKey) => (
                <div key={apiKey.id} className="flex items-center justify-between px-4 py-3 gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{apiKey.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded truncate max-w-[280px] block">
                        {apiKey.key}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => handleCopyKey(apiKey.key)}
                      >
                        {copiedKey === apiKey.key ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {new Date(apiKey.createdAt).toLocaleDateString()}
                      {apiKey.lastUsed && ` | Last used ${new Date(apiKey.lastUsed).toLocaleDateString()}`}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRevokeKey(apiKey.id)}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Rate Limiting Details ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rate Limiting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 max-w-md">
              <span className="text-muted-foreground">Window</span>
              <span className="font-medium">15 minutes</span>
              <span className="text-muted-foreground">Max requests</span>
              <span className="font-medium">100 per key</span>
              <span className="text-muted-foreground">Header (remaining)</span>
              <code className="font-mono text-xs bg-muted px-1 rounded">X-RateLimit-Remaining</code>
              <span className="text-muted-foreground">Header (reset)</span>
              <code className="font-mono text-xs bg-muted px-1 rounded">X-RateLimit-Reset</code>
              <span className="text-muted-foreground">Exceeded status</span>
              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 w-fit">429 Too Many Requests</Badge>
            </div>
            <p className="text-muted-foreground mt-4">
              When the rate limit is exceeded, the API returns a <code className="bg-muted px-1 rounded">429</code> status code.
              Wait until the <code className="bg-muted px-1 rounded">X-RateLimit-Reset</code> timestamp before retrying.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
