"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Key, Copy, Check, Trash2, Play, BookOpen, ShieldCheck, Clock, ChevronDown,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/i18n-context";

// ─── Types ──────────────────────────────────────────────────────────

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string | null;
}

interface EndpointDoc {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  module: string;
  queryParams?: { name: string; type: string; description: string }[];
  bodyFields?: { name: string; type: string; required: boolean; description: string }[];
  exampleRequest?: string;
  exampleResponse: string;
}

// ─── Method Colors ──────────────────────────────────────────────────

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-blue-100 text-blue-800",
  POST: "bg-green-100 text-green-800",
  PUT: "bg-yellow-100 text-yellow-800",
  DELETE: "bg-red-100 text-red-800",
};

// ─── Endpoint Data ──────────────────────────────────────────────────

const ENDPOINTS: EndpointDoc[] = [
  // ── Finance ──
  {
    method: "GET", path: "/api/v1/invoices", module: "Finance",
    description: "List all invoices with pagination, search, and status filtering.",
    queryParams: [
      { name: "page", type: "number", description: "Page number (default: 1)" },
      { name: "limit", type: "number", description: "Items per page (default: 20)" },
      { name: "status", type: "string", description: "Filter by status: DRAFT, SENT, PAID, OVERDUE, CANCELLED" },
      { name: "customerId", type: "string", description: "Filter by customer ID" },
    ],
    exampleResponse: JSON.stringify({
      success: true,
      data: [{ id: "inv-001", invoiceNumber: "INV-2026-0001", customerId: "cust-001", total: 15250.00, status: "SENT", date: "2026-04-15" }],
      pagination: { page: 1, limit: 20, total: 42, totalPages: 3 },
    }, null, 2),
  },
  {
    method: "POST", path: "/api/v1/invoices", module: "Finance",
    description: "Create a new invoice with line items. Auto-generates invoice number.",
    bodyFields: [
      { name: "customerId", type: "string", required: true, description: "Customer account ID" },
      { name: "date", type: "string", required: true, description: "Invoice date (ISO 8601)" },
      { name: "dueDate", type: "string", required: true, description: "Payment due date" },
      { name: "items", type: "array", required: true, description: "Array of line items with productId, quantity, unitPrice" },
      { name: "notes", type: "string", required: false, description: "Optional notes" },
    ],
    exampleRequest: JSON.stringify({
      customerId: "cust-001",
      date: "2026-04-30",
      dueDate: "2026-05-30",
      items: [{ productId: "p-cardio-1", description: "Cardioprex 500mg", quantity: 200, unitPrice: 48 }],
      notes: "Net 30 payment terms",
    }, null, 2),
    exampleResponse: JSON.stringify({
      success: true,
      data: { id: "inv-new", invoiceNumber: "INV-2026-0043", total: 9600, status: "DRAFT" },
    }, null, 2),
  },
  {
    method: "GET", path: "/api/v1/payments", module: "Finance",
    description: "List payment records with pagination and filtering.",
    queryParams: [
      { name: "page", type: "number", description: "Page number" },
      { name: "type", type: "string", description: "Filter: RECEIVED, SENT" },
    ],
    exampleResponse: JSON.stringify({
      success: true,
      data: [{ id: "pay-001", ref: "PAY-2026-0001", amount: 5000, type: "RECEIVED", method: "Bank Transfer", date: "2026-04-20" }],
      pagination: { page: 1, limit: 20, total: 18, totalPages: 1 },
    }, null, 2),
  },
  // ── CRM ──
  {
    method: "GET", path: "/api/v1/customers", module: "CRM",
    description: "List all customer accounts with search, pagination, and filtering.",
    queryParams: [
      { name: "page", type: "number", description: "Page number (default: 1)" },
      { name: "limit", type: "number", description: "Items per page (default: 20)" },
      { name: "search", type: "string", description: "Search by name, email, or code" },
      { name: "classification", type: "string", description: "Filter by A, B, C, D classification" },
    ],
    exampleResponse: JSON.stringify({
      success: true,
      data: [{ id: "cust-001", code: "CUST-0001", name: "Cairo General Hospital", email: "procurement@cgh.org", classification: "A" }],
      pagination: { page: 1, limit: 20, total: 15, totalPages: 1 },
    }, null, 2),
  },
  {
    method: "POST", path: "/api/v1/customers", module: "CRM",
    description: "Create a new customer account.",
    bodyFields: [
      { name: "name", type: "string", required: true, description: "Customer/company name" },
      { name: "email", type: "string", required: true, description: "Primary email" },
      { name: "phone", type: "string", required: false, description: "Phone number" },
      { name: "classification", type: "string", required: false, description: "A, B, C, or D" },
      { name: "city", type: "string", required: false, description: "City" },
    ],
    exampleRequest: JSON.stringify({
      name: "Alexandria Medical Center",
      email: "purchasing@amc.com",
      phone: "+20-3-480-5000",
      classification: "B",
      city: "Alexandria",
    }, null, 2),
    exampleResponse: JSON.stringify({
      success: true,
      data: { id: "cust-new", code: "CUST-0016", name: "Alexandria Medical Center" },
    }, null, 2),
  },
  {
    method: "GET", path: "/api/v1/doctors", module: "CRM",
    description: "List doctors with specialty, classification, and territory filtering.",
    queryParams: [
      { name: "specialty", type: "string", description: "Filter by IMS specialty" },
      { name: "classification", type: "string", description: "Filter by A/B/C/D" },
      { name: "brickId", type: "string", description: "Filter by territory brick ID" },
    ],
    exampleResponse: JSON.stringify({
      success: true,
      data: [{ id: "doc-001", name: "Dr. Ahmad Hassan", specialty: "Cardiology", classification: "A", city: "Cairo" }],
      pagination: { page: 1, limit: 20, total: 8, totalPages: 1 },
    }, null, 2),
  },
  // ── Inventory ──
  {
    method: "GET", path: "/api/v1/products", module: "Inventory",
    description: "List all products with filtering by therapeutic area, form, and stock status.",
    queryParams: [
      { name: "search", type: "string", description: "Search by name or code" },
      { name: "therapeuticArea", type: "string", description: "Filter by therapeutic area" },
      { name: "form", type: "string", description: "Filter: Tablet, Capsule, Syrup, Injection, etc." },
      { name: "lowStock", type: "boolean", description: "Filter to show only items below reorder level" },
    ],
    exampleResponse: JSON.stringify({
      success: true,
      data: [{ id: "p-cardio-1", code: "CV-001", name: "Cardioprex", strength: "500mg", form: "Tablet", stockQty: 12000, pricePerUnit: 48 }],
      pagination: { page: 1, limit: 20, total: 8, totalPages: 1 },
    }, null, 2),
  },
  {
    method: "PUT", path: "/api/v1/products/:id", module: "Inventory",
    description: "Update a product's details including price, stock quantity, and metadata.",
    bodyFields: [
      { name: "name", type: "string", required: false, description: "Product name" },
      { name: "pricePerUnit", type: "number", required: false, description: "Unit price" },
      { name: "stockQty", type: "number", required: false, description: "Current stock quantity" },
      { name: "reorderLevel", type: "number", required: false, description: "Reorder threshold" },
    ],
    exampleRequest: JSON.stringify({ pricePerUnit: 52, stockQty: 14500 }, null, 2),
    exampleResponse: JSON.stringify({
      success: true,
      data: { id: "p-cardio-1", name: "Cardioprex", pricePerUnit: 52, stockQty: 14500 },
    }, null, 2),
  },
  // ── HR ──
  {
    method: "GET", path: "/api/v1/employees", module: "HR",
    description: "List employees with department, position, and status filtering.",
    queryParams: [
      { name: "search", type: "string", description: "Search by name or employee number" },
      { name: "department", type: "string", description: "Filter by department" },
      { name: "status", type: "string", description: "Filter: Active, On Leave, Terminated" },
    ],
    exampleResponse: JSON.stringify({
      success: true,
      data: [{ id: "emp-001", employeeNumber: "EMP-001", firstName: "Omar", lastName: "Fayed", department: "Sales", status: "Active" }],
      pagination: { page: 1, limit: 20, total: 12, totalPages: 1 },
    }, null, 2),
  },
  {
    method: "POST", path: "/api/v1/employees", module: "HR",
    description: "Create a new employee record with personal and employment details.",
    bodyFields: [
      { name: "firstName", type: "string", required: true, description: "First name" },
      { name: "lastName", type: "string", required: true, description: "Last name" },
      { name: "email", type: "string", required: true, description: "Work email" },
      { name: "position", type: "string", required: true, description: "Job title" },
      { name: "department", type: "string", required: false, description: "Department name" },
      { name: "hireDate", type: "string", required: true, description: "Hire date (ISO 8601)" },
      { name: "salary", type: "number", required: false, description: "Monthly salary" },
    ],
    exampleRequest: JSON.stringify({
      firstName: "Nour",
      lastName: "Abdel-Rahman",
      email: "nour.ar@company.com",
      position: "Quality Analyst",
      department: "QA/QC",
      hireDate: "2026-05-01",
      salary: 18000,
    }, null, 2),
    exampleResponse: JSON.stringify({
      success: true,
      data: { id: "emp-new", employeeNumber: "EMP-013", firstName: "Nour", lastName: "Abdel-Rahman" },
    }, null, 2),
  },
  // ── Procurement ──
  {
    method: "GET", path: "/api/v1/purchase-orders", module: "Procurement",
    description: "List purchase orders with status, vendor, and date range filtering.",
    queryParams: [
      { name: "status", type: "string", description: "Filter: DRAFT, SENT, PARTIAL, RECEIVED, CANCELLED" },
      { name: "vendorId", type: "string", description: "Filter by vendor ID" },
      { name: "from", type: "string", description: "Start date (ISO 8601)" },
      { name: "to", type: "string", description: "End date (ISO 8601)" },
    ],
    exampleResponse: JSON.stringify({
      success: true,
      data: [{ id: "po-001", poNumber: "PO-2026-0001", vendorId: "vnd-001", total: 45000, status: "SENT" }],
      pagination: { page: 1, limit: 20, total: 6, totalPages: 1 },
    }, null, 2),
  },
  {
    method: "POST", path: "/api/v1/purchase-orders", module: "Procurement",
    description: "Create a new purchase order with line items for raw materials or products.",
    bodyFields: [
      { name: "vendorId", type: "string", required: true, description: "Vendor/supplier ID" },
      { name: "expectedDate", type: "string", required: true, description: "Expected delivery date" },
      { name: "items", type: "array", required: true, description: "Line items with productId, quantity, unitPrice" },
      { name: "notes", type: "string", required: false, description: "Order notes" },
    ],
    exampleRequest: JSON.stringify({
      vendorId: "vnd-001",
      expectedDate: "2026-06-15",
      items: [{ productId: "p-cardio-1", quantity: 5000, unitPrice: 35 }],
      notes: "Urgent restock order",
    }, null, 2),
    exampleResponse: JSON.stringify({
      success: true,
      data: { id: "po-new", poNumber: "PO-2026-0007", total: 175000, status: "DRAFT" },
    }, null, 2),
  },
  // ── Sales ──
  {
    method: "GET", path: "/api/v1/sales-orders", module: "Sales",
    description: "List sales orders with customer, status, and date filtering.",
    queryParams: [
      { name: "status", type: "string", description: "Filter: DRAFT, CONFIRMED, SHIPPED, DELIVERED, CANCELLED" },
      { name: "customerId", type: "string", description: "Filter by customer ID" },
    ],
    exampleResponse: JSON.stringify({
      success: true,
      data: [{ id: "so-001", orderNumber: "SO-2026-0001", customerId: "cust-001", total: 28800, status: "CONFIRMED" }],
      pagination: { page: 1, limit: 20, total: 4, totalPages: 1 },
    }, null, 2),
  },
  {
    method: "DELETE", path: "/api/v1/sales-orders/:id", module: "Sales",
    description: "Cancel a sales order. Sets status to CANCELLED. Cannot cancel shipped/delivered orders.",
    exampleResponse: JSON.stringify({
      success: true,
      data: { id: "so-001", status: "CANCELLED", cancelledAt: "2026-04-30T14:22:00Z" },
    }, null, 2),
  },
  // ── Accounting ──
  {
    method: "GET", path: "/api/v1/journal-entries", module: "Accounting",
    description: "List journal entries with date range and account filtering.",
    queryParams: [
      { name: "from", type: "string", description: "Start date (ISO 8601)" },
      { name: "to", type: "string", description: "End date (ISO 8601)" },
      { name: "accountId", type: "string", description: "Filter by GL account ID" },
    ],
    exampleResponse: JSON.stringify({
      success: true,
      data: [{ id: "je-001", entryNumber: "JE-2026-0001", date: "2026-04-01", description: "Opening balances", totalDebit: 50000, totalCredit: 50000 }],
      pagination: { page: 1, limit: 20, total: 25, totalPages: 2 },
    }, null, 2),
  },
  {
    method: "GET", path: "/api/v1/gl-accounts", module: "Accounting",
    description: "List all General Ledger accounts with their current balances.",
    queryParams: [
      { name: "type", type: "string", description: "Filter: Asset, Liability, Equity, Revenue, Expense" },
    ],
    exampleResponse: JSON.stringify({
      success: true,
      data: [{ id: "gl-001", code: "1000", name: "Cash & Cash Equivalents", type: "Asset", balance: 245000 }],
    }, null, 2),
  },
  // ── Health ──
  {
    method: "GET", path: "/api/v1/health", module: "System",
    description: "API health check endpoint. Returns API version, uptime, and server status.",
    exampleResponse: JSON.stringify({
      success: true,
      data: { api: "Pharma ERP API", version: "1.0.0", status: "operational", uptime: "45d 12h 33m", serverTime: "2026-04-30T12:00:00Z" },
    }, null, 2),
  },
  // ── Reporting ──
  {
    method: "GET", path: "/api/v1/reports/revenue", module: "Reporting",
    description: "Generate revenue report with breakdown by customer, product, or time period.",
    queryParams: [
      { name: "from", type: "string", description: "Report start date" },
      { name: "to", type: "string", description: "Report end date" },
      { name: "groupBy", type: "string", description: "Group by: customer, product, month" },
    ],
    exampleResponse: JSON.stringify({
      success: true,
      data: {
        totalRevenue: 1250000,
        period: { from: "2026-01-01", to: "2026-04-30" },
        breakdown: [
          { label: "Cardioprex 500mg", revenue: 480000, percentage: 38.4 },
          { label: "Diabetex XR 1000mg", revenue: 320000, percentage: 25.6 },
        ],
      },
    }, null, 2),
  },
];

// ─── Helpers ────────────────────────────────────────────────────────

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "pk_live_";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const API_KEYS_STORAGE = "pharma_erp_api_keys";

function loadKeys(): ApiKey[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(API_KEYS_STORAGE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveKeys(keys: ApiKey[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(API_KEYS_STORAGE, JSON.stringify(keys));
}

// ─── Component ──────────────────────────────────────────────────────

export default function ApiDocumentationPage() {
  const { t } = useTranslation();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(() => loadKeys());
  const [newKeyName, setNewKeyName] = useState("");
  const [expandedEndpoint, setExpandedEndpoint] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [tryItEndpoint, setTryItEndpoint] = useState<number | null>(null);
  const [tryItResponse, setTryItResponse] = useState<string | null>(null);
  const [tryItLoading, setTryItLoading] = useState(false);
  const [showDeleteKey, setShowDeleteKey] = useState<string | null>(null);

  // ─── API Key Management ─────────────────────────────────────────

  const handleGenerateKey = useCallback(() => {
    const name = newKeyName.trim() || `API Key ${apiKeys.length + 1}`;
    const newKey: ApiKey = {
      id: `key-${Date.now()}`,
      name,
      key: generateApiKey(),
      createdAt: new Date().toISOString(),
      lastUsed: null,
    };
    const updated = [...apiKeys, newKey];
    setApiKeys(updated);
    saveKeys(updated);
    setNewKeyName("");
  }, [apiKeys, newKeyName]);

  const handleRevokeKey = useCallback((id: string) => {
    const updated = apiKeys.filter((k) => k.id !== id);
    setApiKeys(updated);
    saveKeys(updated);
    setShowDeleteKey(null);
  }, [apiKeys]);

  const handleCopyKey = useCallback((key: string) => {
    navigator.clipboard.writeText(key).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  }, []);

  const toggleEndpoint = useCallback((idx: number) => {
    setExpandedEndpoint((prev) => prev === idx ? null : idx);
  }, []);

  // ─── Try It Simulation ──────────────────────────────────────────

  function handleTryIt(idx: number) {
    setTryItEndpoint(idx);
    setTryItResponse(null);
    setTryItLoading(false);
  }

  function executeTryIt() {
    if (tryItEndpoint === null) return;
    setTryItLoading(true);
    // Simulate API call
    setTimeout(() => {
      const ep = ENDPOINTS[tryItEndpoint];
      setTryItResponse(ep.exampleResponse);
      setTryItLoading(false);
    }, 800);
  }

  // ─── Group endpoints by module ──────────────────────────────────

  const grouped = useMemo(() => {
    const map: Record<string, { endpoints: EndpointDoc[]; indices: number[] }> = {};
    ENDPOINTS.forEach((ep, idx) => {
      if (!map[ep.module]) map[ep.module] = { endpoints: [], indices: [] };
      map[ep.module].endpoints.push(ep);
      map[ep.module].indices.push(idx);
    });
    return map;
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Documentation"
        description="REST API reference for the Pharma ERP system. All endpoints require authentication and return JSON."
      />

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-4">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Authentication</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">X-API-Key</code>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rate Limit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">100 req/15min</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{ENDPOINTS.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Authentication Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Authentication
          </CardTitle>
          <CardDescription>
            All API requests must include a valid API key in the request header.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto font-mono">
{`curl -X GET /api/v1/products \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: pk_live_your_api_key_here"`}
          </pre>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Requests without a valid API key will receive a <code className="bg-muted px-1 rounded">401 Unauthorized</code> response.</p>
            <p>API keys can be generated and revoked in the section below.</p>
          </div>
        </CardContent>
      </Card>

      {/* Response Format */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" /> Response Format
          </CardTitle>
          <CardDescription>All endpoints return a consistent JSON structure.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Success Response</p>
              <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto font-mono">
{`{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}`}
              </pre>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Error Response</p>
              <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto font-mono">
{`{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Field 'name' is required",
    "field": "name"
  }
}`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints by Module */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" /> Endpoints
          </CardTitle>
          <CardDescription>Click any endpoint to expand details, parameters, and examples. Use "Try It" to simulate a request.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {Object.entries(grouped).map(([module, { endpoints, indices }]) => (
            <div key={module}>
              <div className="px-6 py-3 bg-muted/50 border-b border-t">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {module}
                </h3>
              </div>
              <div className="divide-y">
                {endpoints.map((ep, epIdx) => {
                  const globalIdx = indices[epIdx];
                  const isExpanded = expandedEndpoint === globalIdx;
                  return (
                    <div key={`${ep.method}-${ep.path}`}>
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
                        <ChevronDown
                          className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="px-6 pb-4 pt-2 bg-muted/10 border-t space-y-4">
                          <p className="text-sm text-muted-foreground">{ep.description}</p>

                          {/* Query Parameters */}
                          {ep.queryParams && ep.queryParams.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                                Query Parameters
                              </p>
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b bg-muted/30">
                                    <th className="text-left p-2 font-medium">Name</th>
                                    <th className="text-left p-2 font-medium">Type</th>
                                    <th className="text-left p-2 font-medium">Description</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ep.queryParams.map((p) => (
                                    <tr key={p.name} className="border-b">
                                      <td className="p-2"><code className="text-xs bg-muted px-1 rounded">{p.name}</code></td>
                                      <td className="p-2 text-muted-foreground text-xs">{p.type}</td>
                                      <td className="p-2 text-xs">{p.description}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Body Fields */}
                          {ep.bodyFields && ep.bodyFields.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                                Request Body
                              </p>
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b bg-muted/30">
                                    <th className="text-left p-2 font-medium">Field</th>
                                    <th className="text-left p-2 font-medium">Type</th>
                                    <th className="text-left p-2 font-medium">Required</th>
                                    <th className="text-left p-2 font-medium">Description</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ep.bodyFields.map((f) => (
                                    <tr key={f.name} className="border-b">
                                      <td className="p-2"><code className="text-xs bg-muted px-1 rounded">{f.name}</code></td>
                                      <td className="p-2 text-muted-foreground text-xs">{f.type}</td>
                                      <td className="p-2">
                                        {f.required ? (
                                          <Badge className="bg-red-100 text-red-800 text-xs">Required</Badge>
                                        ) : (
                                          <span className="text-muted-foreground text-xs">Optional</span>
                                        )}
                                      </td>
                                      <td className="p-2 text-xs">{f.description}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Example Request */}
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

                          {/* Example Response */}
                          <div>
                            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                              Example Response
                            </p>
                            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto font-mono">
                              {ep.exampleResponse}
                            </pre>
                          </div>

                          {/* Try It Button */}
                          <Button size="sm" variant="outline" onClick={() => handleTryIt(globalIdx)} className="gap-2">
                            <Play className="h-4 w-4" /> Try It
                          </Button>
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

      {/* Try It Dialog */}
      <Dialog open={tryItEndpoint !== null} onOpenChange={(open) => { if (!open) { setTryItEndpoint(null); setTryItResponse(null); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {tryItEndpoint !== null && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Try It - {ENDPOINTS[tryItEndpoint].method} {ENDPOINTS[tryItEndpoint].path}
                </DialogTitle>
                <DialogDescription>
                  Simulate an API request and view the response.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Request */}
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Request</p>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto font-mono">
{`${ENDPOINTS[tryItEndpoint].method} ${ENDPOINTS[tryItEndpoint].path}
Host: api.pharma-erp.com
Content-Type: application/json
X-API-Key: pk_live_***`}
{ENDPOINTS[tryItEndpoint].exampleRequest ? `\n\n${ENDPOINTS[tryItEndpoint].exampleRequest}` : ""}
                  </pre>
                </div>

                {/* Send Button */}
                <Button onClick={executeTryIt} disabled={tryItLoading} className="gap-2">
                  {tryItLoading ? (
                    <><Clock className="h-4 w-4 animate-spin" /> Sending...</>
                  ) : (
                    <><Play className="h-4 w-4" /> Send Request</>
                  )}
                </Button>

                {/* Response */}
                {tryItResponse && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Response</p>
                      <Badge className="bg-green-100 text-green-800 text-xs">200 OK</Badge>
                      <span className="text-xs text-muted-foreground ml-auto">~120ms</span>
                    </div>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-x-auto font-mono">
                      {tryItResponse}
                    </pre>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Response headers: <code className="bg-muted px-1 rounded">X-RateLimit-Remaining: 99</code>{" | "}
                      <code className="bg-muted px-1 rounded">X-Request-Id: req_abc123</code>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* API Key Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="h-5 w-5" /> API Key Management
          </CardTitle>
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
              placeholder="Key name (e.g., Production, Staging)"
              className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onKeyDown={(e) => { if (e.key === "Enter") handleGenerateKey(); }}
            />
            <Button onClick={handleGenerateKey} className="gap-2">
              <Key className="h-4 w-4" /> Generate Key
            </Button>
          </div>

          {/* Key list */}
          {apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No API keys generated yet. Create one to authenticate your API requests.
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              {apiKeys.map((apiKey) => (
                <div key={apiKey.id} className="flex items-center justify-between px-4 py-3 gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{apiKey.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded truncate max-w-[300px] block">
                        {apiKey.key}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs shrink-0"
                        onClick={() => handleCopyKey(apiKey.key)}
                      >
                        {copiedKey === apiKey.key ? (
                          <><Check className="h-3 w-3 mr-1" /> Copied</>
                        ) : (
                          <><Copy className="h-3 w-3 mr-1" /> Copy</>
                        )}
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
                    onClick={() => setShowDeleteKey(apiKey.id)}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Key Confirmation */}
      <Dialog open={!!showDeleteKey} onOpenChange={(open) => { if (!open) setShowDeleteKey(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke API Key</DialogTitle>
            <DialogDescription>
              This will permanently revoke this API key. Any applications using this key will immediately lose access.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteKey(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => showDeleteKey && handleRevokeKey(showDeleteKey)}>
              Revoke Key
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rate Limiting Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" /> Rate Limiting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 max-w-md">
              <span className="text-muted-foreground">Window</span>
              <span className="font-medium">15 minutes</span>
              <span className="text-muted-foreground">Max requests</span>
              <span className="font-medium">100 per API key</span>
              <span className="text-muted-foreground">Header (remaining)</span>
              <code className="font-mono text-xs bg-muted px-1 rounded">X-RateLimit-Remaining</code>
              <span className="text-muted-foreground">Header (limit)</span>
              <code className="font-mono text-xs bg-muted px-1 rounded">X-RateLimit-Limit</code>
              <span className="text-muted-foreground">Header (reset)</span>
              <code className="font-mono text-xs bg-muted px-1 rounded">X-RateLimit-Reset</code>
              <span className="text-muted-foreground">Exceeded status</span>
              <Badge className="bg-red-100 text-red-800 w-fit">429 Too Many Requests</Badge>
            </div>
            <p className="text-muted-foreground mt-4">
              When the rate limit is exceeded, wait until the timestamp in the <code className="bg-muted px-1 rounded">X-RateLimit-Reset</code> header before retrying.
              Implement exponential backoff for production applications.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
