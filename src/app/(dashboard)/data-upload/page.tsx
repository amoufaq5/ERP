"use client";

import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Upload, Download, FileSpreadsheet, FileText, Database, Cloud,
  CheckCircle2, XCircle, AlertTriangle, Clock, Search, Plus,
  ArrowRight, Settings, Eye, Trash2, RefreshCw, FileJson, FileCode,
  HardDrive, Link2, Key, Zap, Filter, MapPin, PackagePlus, Archive,
} from "lucide-react";
import { useDataStore } from "@/lib/data-store";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ParsedData { headers: string[]; rows: string[][] }

interface HistoryEntry {
  id: string; type: "Import" | "Export"; module: string; fileName: string;
  total: number; processed: number; failed: number; duration: string;
  user: string; date: string; status: "Completed" | "Partial" | "Failed";
}

interface ValidationError {
  row: number;
  column: string;
  value: string;
  message: string;
}

interface ImportProgress {
  total: number;
  processed: number;
  imported: number;
  skipped: number;
  errors: ValidationError[];
  status: "idle" | "validating" | "importing" | "complete";
}

// ─── CSV Parser ────────────────────────────────────────────────────────────

function parseCSV(text: string): ParsedData {
  const lines: string[] = [];
  let current = "", inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { inQuote = !inQuote; current += ch; }
    else if ((ch === "\n" || ch === "\r") && !inQuote) {
      if (current.trim()) lines.push(current);
      current = "";
      if (ch === "\r" && text[i + 1] === "\n") i++;
    }
    else { current += ch; }
  }
  if (current.trim()) lines.push(current);

  const parsed = lines.map(line => {
    const cols: string[] = [];
    let col = "", q = false;
    for (const ch of line) {
      if (ch === '"') { q = !q; }
      else if (ch === "," && !q) { cols.push(col.trim()); col = ""; }
      else { col += ch; }
    }
    cols.push(col.trim());
    return cols;
  });

  return { headers: parsed[0] || [], rows: parsed.slice(1) };
}

function detectType(values: string[]): string {
  const sample = values.filter(v => v.trim()).slice(0, 10);
  if (sample.every(v => /^[\d.,]+$/.test(v))) return "Number";
  if (sample.every(v => /^\d{4}[-/]\d{2}[-/]\d{2}/.test(v) || /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(v))) return "Date";
  if (sample.every(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))) return "Email";
  if (sample.every(v => /^[\d()+\-\s]+$/.test(v) && v.length >= 7)) return "Phone";
  return "Text";
}

function generateCSVContent(headers: string[], rows: string[][]): string {
  const escape = (v: string) =>
    v.includes(",") || v.includes('"') || v.includes("\n") ? `"${v.replace(/"/g, '""')}"` : v;
  return [headers.map(escape).join(","), ...rows.map(r => r.map(escape).join(","))].join("\n");
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Entity Templates with ALL fields for bulk import ──────────────────────

const entityTemplates = {
  Products: {
    storeKey: "products" as const,
    idPrefix: "p",
    headers: ["code", "name", "strength", "form", "pricePerUnit", "therapeuticArea", "stockQty", "reorderLevel", "edaRegistration", "warehouse", "description", "manufacturer", "shelfLife", "storageCondition"],
    sampleRows: [
      ["PRD-001", "Amoxicillin", "500mg", "Capsule", "35.50", "Antibiotics", "5000", "1000", "EDA/2025/1001", "FG Warehouse-Cairo", "Broad-spectrum antibiotic", "PharmaCo Egypt", "24 months", "Room Temperature"],
      ["PRD-002", "Metformin HCl", "850mg", "Tablet", "22.00", "Diabetes", "8000", "2000", "EDA/2025/1002", "FG Warehouse-Alex", "Oral antidiabetic agent", "NilePharma", "36 months", "Below 30C"],
      ["PRD-003", "Omeprazole", "20mg", "Capsule", "45.00", "Gastroenterology", "3500", "800", "EDA/2025/1003", "FG Warehouse-Cairo", "Proton pump inhibitor", "PharmaCo Egypt", "24 months", "Room Temperature"],
    ],
    headerAliases: {
      "sku": "code", "product code": "code", "product_code": "code",
      "product name": "name", "product_name": "name", "description": "description",
      "dose": "strength", "dosage": "strength",
      "dosage form": "form", "dosage_form": "form", "type": "form",
      "price": "pricePerUnit", "unit price": "pricePerUnit", "unit_price": "pricePerUnit", "price per unit": "pricePerUnit",
      "category": "therapeuticArea", "therapeutic area": "therapeuticArea", "therapeutic_area": "therapeuticArea",
      "stock": "stockQty", "stock qty": "stockQty", "stock_qty": "stockQty", "quantity": "stockQty",
      "reorder": "reorderLevel", "reorder level": "reorderLevel", "reorder_level": "reorderLevel",
      "eda": "edaRegistration", "registration": "edaRegistration",
    },
    validate: (obj: Record<string, string>, rowIdx: number): ValidationError[] => {
      const errors: ValidationError[] = [];
      if (!obj["name"]?.trim()) errors.push({ row: rowIdx, column: "name", value: obj["name"] || "", message: "Product name is required" });
      if (obj["pricePerUnit"] && isNaN(Number(obj["pricePerUnit"]))) errors.push({ row: rowIdx, column: "pricePerUnit", value: obj["pricePerUnit"], message: "Price must be a number" });
      if (obj["stockQty"] && isNaN(Number(obj["stockQty"]))) errors.push({ row: rowIdx, column: "stockQty", value: obj["stockQty"], message: "Stock must be a number" });
      const validForms = ["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Drops", "Inhaler", "Suppository"];
      if (obj["form"] && !validForms.includes(obj["form"])) errors.push({ row: rowIdx, column: "form", value: obj["form"], message: `Form must be one of: ${validForms.join(", ")}` });
      return errors;
    },
    build: (obj: Record<string, string>, id: string, code: string) => ({
      id,
      code: obj["code"] || code,
      name: obj["name"] || "Imported Product",
      strength: obj["strength"] || "",
      form: (obj["form"] || "Tablet") as "Tablet",
      buId: null,
      pricePerUnit: Number(obj["pricePerUnit"]) || 0,
      therapeuticArea: obj["therapeuticArea"] || "",
      edaRegistration: obj["edaRegistration"] || undefined,
      stockQty: Number(obj["stockQty"]) || 0,
      reorderLevel: Number(obj["reorderLevel"]) || 100,
      warehouse: obj["warehouse"] || undefined,
      description: obj["description"] || undefined,
      manufacturer: obj["manufacturer"] || undefined,
      shelfLife: obj["shelfLife"] || undefined,
      storageCondition: obj["storageCondition"] || undefined,
    }),
  },
  Customers: {
    storeKey: "customers" as const,
    idPrefix: "c",
    headers: ["code", "name", "type", "phone", "email", "address", "city", "creditLimit", "outstanding", "currency", "paymentTerms", "status"],
    sampleRows: [
      ["CUST-001", "Cairo Medical Supplies", "Pharmacy Chain", "+20-2-1234567", "cairo@medsupply.eg", "15 Tahrir St, Downtown", "Cairo", "500000", "125000", "EGP", "Net 30", "ACTIVE"],
      ["CUST-002", "Delta Pharma Distributors", "Distributor", "+20-40-5556789", "info@deltapharma.eg", "22 Industrial Zone", "Tanta", "750000", "0", "EGP", "Net 60", "ACTIVE"],
      ["CUST-003", "Nile Hospital Group", "Hospital", "+20-2-9876543", "procurement@nilehospital.eg", "88 Corniche El Nil", "Cairo", "1000000", "350000", "EGP", "Net 45", "ACTIVE"],
    ],
    headerAliases: {
      "customer code": "code", "customer_code": "code", "customer id": "code",
      "customer name": "name", "customer_name": "name", "company": "name",
      "customer type": "type", "customer_type": "type", "category": "type",
      "telephone": "phone", "mobile": "phone",
      "email address": "email", "email_address": "email",
      "street": "address", "street address": "address",
      "credit limit": "creditLimit", "credit_limit": "creditLimit",
      "balance": "outstanding", "amount due": "outstanding",
      "payment terms": "paymentTerms", "payment_terms": "paymentTerms", "terms": "paymentTerms",
    },
    validate: (obj: Record<string, string>, rowIdx: number): ValidationError[] => {
      const errors: ValidationError[] = [];
      if (!obj["name"]?.trim()) errors.push({ row: rowIdx, column: "name", value: obj["name"] || "", message: "Customer name is required" });
      if (obj["email"] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(obj["email"])) errors.push({ row: rowIdx, column: "email", value: obj["email"], message: "Invalid email format" });
      if (obj["creditLimit"] && isNaN(Number(obj["creditLimit"]))) errors.push({ row: rowIdx, column: "creditLimit", value: obj["creditLimit"], message: "Credit limit must be a number" });
      return errors;
    },
    build: (obj: Record<string, string>, id: string, code: string) => ({
      id,
      code: obj["code"] || code,
      name: obj["name"] || "Imported Customer",
      type: obj["type"] || "Pharmacy Chain",
      phone: obj["phone"] || "",
      email: obj["email"] || "",
      address: obj["address"] || "",
      city: obj["city"] || "",
      creditLimit: Number(obj["creditLimit"]) || 0,
      outstanding: Number(obj["outstanding"]) || 0,
      currency: obj["currency"] || "EGP",
      paymentTerms: obj["paymentTerms"] || "Net 30",
      status: (obj["status"] === "HOLD" || obj["status"] === "BLOCKED" ? obj["status"] : "ACTIVE") as "ACTIVE",
      createdAt: new Date().toISOString(),
    }),
  },
  Vendors: {
    storeKey: "vendors" as const,
    idPrefix: "ve",
    headers: ["code", "name", "category", "phone", "email", "address", "outstanding", "paymentTerms", "gmpCertified"],
    sampleRows: [
      ["VEN-001", "Global API Suppliers", "API Supplier", "+20-2-1112233", "sales@globalapi.com", "Industrial Zone A, 6th October", "250000", "Net 30", "Yes"],
      ["VEN-002", "NilePack Industries", "Packaging", "+20-2-4445566", "orders@nilepack.eg", "10th of Ramadan City", "0", "Net 45", "Yes"],
      ["VEN-003", "MedEquip International", "Equipment", "+44-20-7891234", "info@medequip.co.uk", "London, UK", "180000", "Net 60", "No"],
    ],
    headerAliases: {
      "vendor code": "code", "vendor_code": "code", "vendor id": "code", "supplier code": "code",
      "vendor name": "name", "vendor_name": "name", "supplier": "name", "supplier name": "name",
      "vendor category": "category", "vendor_category": "category", "type": "category",
      "telephone": "phone", "mobile": "phone", "contact phone": "phone",
      "email address": "email", "email_address": "email", "contact email": "email",
      "street": "address", "street address": "address",
      "balance": "outstanding", "amount owed": "outstanding",
      "payment terms": "paymentTerms", "payment_terms": "paymentTerms", "terms": "paymentTerms",
      "gmp": "gmpCertified", "gmp certified": "gmpCertified", "gmp_certified": "gmpCertified",
    },
    validate: (obj: Record<string, string>, rowIdx: number): ValidationError[] => {
      const errors: ValidationError[] = [];
      if (!obj["name"]?.trim()) errors.push({ row: rowIdx, column: "name", value: obj["name"] || "", message: "Vendor name is required" });
      if (obj["email"] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(obj["email"])) errors.push({ row: rowIdx, column: "email", value: obj["email"], message: "Invalid email format" });
      return errors;
    },
    build: (obj: Record<string, string>, id: string, code: string) => ({
      id,
      code: obj["code"] || code,
      name: obj["name"] || "Imported Vendor",
      category: obj["category"] || "Services",
      phone: obj["phone"] || "",
      email: obj["email"] || "",
      address: obj["address"] || "",
      outstanding: Number(obj["outstanding"]) || 0,
      paymentTerms: obj["paymentTerms"] || "Net 30",
      gmpCertified: ["yes", "true", "1"].includes((obj["gmpCertified"] || "").toLowerCase()),
      createdAt: new Date().toISOString(),
    }),
  },
  "GL Accounts": {
    storeKey: "glAccounts" as const,
    idPrefix: "gl",
    headers: ["code", "name", "type", "subType", "balance", "isActive"],
    sampleRows: [
      ["1000", "Cash and Cash Equivalents", "ASSET", "Current Asset", "1500000", "true"],
      ["2000", "Accounts Payable", "LIABILITY", "Current Liability", "350000", "true"],
      ["4000", "Sales Revenue", "REVENUE", "Operating Revenue", "2800000", "true"],
    ],
    headerAliases: {
      "account code": "code", "account_code": "code", "account number": "code", "account_number": "code", "acct code": "code",
      "account name": "name", "account_name": "name", "description": "name", "acct name": "name",
      "account type": "type", "account_type": "type", "acct type": "type",
      "sub type": "subType", "sub_type": "subType", "subcategory": "subType", "sub category": "subType",
      "amount": "balance", "opening balance": "balance", "opening_balance": "balance",
      "active": "isActive", "is active": "isActive", "is_active": "isActive", "enabled": "isActive",
    },
    validate: (obj: Record<string, string>, rowIdx: number): ValidationError[] => {
      const errors: ValidationError[] = [];
      if (!obj["code"]?.trim()) errors.push({ row: rowIdx, column: "code", value: obj["code"] || "", message: "Account code is required" });
      if (!obj["name"]?.trim()) errors.push({ row: rowIdx, column: "name", value: obj["name"] || "", message: "Account name is required" });
      const validTypes = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];
      if (obj["type"] && !validTypes.includes(obj["type"].toUpperCase())) errors.push({ row: rowIdx, column: "type", value: obj["type"], message: `Type must be one of: ${validTypes.join(", ")}` });
      return errors;
    },
    build: (obj: Record<string, string>, id: string) => ({
      id,
      code: obj["code"] || "",
      name: obj["name"] || "Imported Account",
      type: (obj["type"]?.toUpperCase() || "EXPENSE") as "ASSET",
      subType: obj["subType"] || "",
      balance: Number(obj["balance"]) || 0,
      parentId: undefined,
      isActive: !["false", "no", "0"].includes((obj["isActive"] || "true").toLowerCase()),
    }),
  },
};

type EntityTemplateKey = keyof typeof entityTemplates;

// ─── Smart auto-detection of entity type from CSV headers ──────────────────

function autoDetectEntityType(headers: string[]): EntityTemplateKey | null {
  const lower = headers.map(h => h.toLowerCase().trim());
  const scores: Record<EntityTemplateKey, number> = { Products: 0, Customers: 0, Vendors: 0, "GL Accounts": 0 };

  for (const [key, tmpl] of Object.entries(entityTemplates) as [EntityTemplateKey, typeof entityTemplates[EntityTemplateKey]][]) {
    // Check direct header matches
    for (const h of lower) {
      if (tmpl.headers.map(th => th.toLowerCase()).includes(h)) scores[key] += 3;
      if (h in tmpl.headerAliases) scores[key] += 2;
    }
    // Bonus for entity-specific keywords
    if (key === "Products") {
      if (lower.some(h => ["sku", "strength", "form", "dosage", "therapeutic", "stock", "reorder"].some(k => h.includes(k)))) scores[key] += 5;
    } else if (key === "Customers") {
      if (lower.some(h => ["customer", "credit limit", "creditlimit"].some(k => h.includes(k)))) scores[key] += 5;
    } else if (key === "Vendors") {
      if (lower.some(h => ["vendor", "supplier", "gmp"].some(k => h.includes(k)))) scores[key] += 5;
    } else if (key === "GL Accounts") {
      if (lower.some(h => ["account code", "account type", "debit", "credit", "gl", "ledger"].some(k => h.includes(k)))) scores[key] += 5;
    }
  }

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 2 ? best[0] as EntityTemplateKey : null;
}

// Map incoming headers to template field names using aliases
function autoMapHeaders(headers: string[], templateKey: EntityTemplateKey): Record<number, string> {
  const tmpl = entityTemplates[templateKey];
  const mapping: Record<number, string> = {};
  const lowerTemplateHeaders = tmpl.headers.map(h => h.toLowerCase());

  headers.forEach((h, i) => {
    const lower = h.toLowerCase().trim();
    // Direct match
    const directIdx = lowerTemplateHeaders.indexOf(lower);
    if (directIdx >= 0) {
      mapping[i] = tmpl.headers[directIdx];
      return;
    }
    // Alias match
    const aliased = (tmpl.headerAliases as Record<string, string>)[lower];
    if (aliased) {
      mapping[i] = aliased;
      return;
    }
    // Fuzzy: check if any template header starts with or contains the incoming header
    const partial = tmpl.headers.find(th => th.toLowerCase().includes(lower) || lower.includes(th.toLowerCase()));
    if (partial) {
      mapping[i] = partial;
    }
  });

  return mapping;
}

// ─── Original Templates (for backward compatibility) ──────────────────────

const templates = [
  { name: "Contacts", headers: ["Name", "Email", "Phone", "Company", "Address", "City", "State", "Country"], sample: ["John Doe", "john@example.com", "(555) 123-4567", "Acme Corp", "123 Main St", "New York", "NY", "US"] },
  { name: "Products", headers: ["SKU", "Name", "Description", "Category", "Price", "Cost", "Quantity", "Unit"], sample: ["PRD-001", "Widget Pro", "Premium widget", "Electronics", "29.99", "12.50", "500", "Each"] },
  { name: "Employees", headers: ["Employee ID", "First Name", "Last Name", "Email", "Department", "Position", "Start Date", "Salary"], sample: ["EMP-001", "Jane", "Smith", "jane@company.com", "Engineering", "Senior Dev", "2024-01-15", "95000"] },
  { name: "Invoices", headers: ["Invoice #", "Customer", "Date", "Due Date", "Item", "Quantity", "Unit Price", "Tax", "Total"], sample: ["INV-2026-001", "Acme Corp", "2026-04-01", "2026-05-01", "Consulting", "40", "150", "8.25%", "6330"] },
  { name: "Vendors", headers: ["Name", "Contact Person", "Email", "Phone", "Address", "Category", "Payment Terms", "Rating"], sample: ["Global Supply Co", "Mike Johnson", "mike@globalsupply.com", "(555) 987-6543", "456 Oak Ave", "Raw Materials", "Net 30", "A"] },
  { name: "Assets", headers: ["Asset ID", "Name", "Category", "Location", "Purchase Date", "Cost", "Depreciation Method", "Useful Life (Years)"], sample: ["AST-001", "CNC Machine", "Equipment", "Factory Floor", "2024-06-15", "250000", "Straight Line", "10"] },
  { name: "GL Entries", headers: ["Date", "Account Code", "Account Name", "Description", "Debit", "Credit", "Reference"], sample: ["2026-04-01", "4000", "Revenue", "Service invoice #INV-001", "", "5000.00", "INV-2026-001"] },
];

const targetModules = ["Customers", "Vendors", "Products", "Contacts", "Employees", "Invoices", "Assets", "GL Entries", "Inventory", "Purchase Orders", "Leads", "Opportunities"];

const fieldMappings = [
  { name: "CRM Contacts Import", source: "CSV", target: "Contacts", fields: 8, createdBy: "Admin", lastUsed: "Apr 1, 2026", status: "Active" },
  { name: "Product Catalog Sync", source: "JSON", target: "Products", fields: 12, createdBy: "System", lastUsed: "Mar 28, 2026", status: "Active" },
  { name: "Employee HR Import", source: "Excel", target: "Employees", fields: 15, createdBy: "HR Admin", lastUsed: "Mar 25, 2026", status: "Active" },
  { name: "QuickBooks GL Sync", source: "API", target: "GL Entries", fields: 7, createdBy: "System", lastUsed: "Apr 1, 2026", status: "Active" },
  { name: "Vendor Database Import", source: "CSV", target: "Vendors", fields: 10, createdBy: "Procurement", lastUsed: "Mar 20, 2026", status: "Active" },
  { name: "Asset Register Import", source: "Excel", target: "Assets", fields: 14, createdBy: "Finance", lastUsed: "Mar 15, 2026", status: "Inactive" },
  { name: "Invoice Migration", source: "CSV", target: "Invoices", fields: 11, createdBy: "Admin", lastUsed: "Mar 10, 2026", status: "Active" },
  { name: "Legacy CRM Migration", source: "Database", target: "Contacts", fields: 20, createdBy: "IT", lastUsed: "Feb 28, 2026", status: "Archived" },
];

const validationRules = [
  { name: "Email Format", module: "Contacts", field: "Email", type: "Format", condition: "Valid email pattern", action: "Reject", status: true },
  { name: "Required Name", module: "Contacts", field: "Name", type: "Required", condition: "Not empty", action: "Reject", status: true },
  { name: "Unique SKU", module: "Products", field: "SKU", type: "Unique", condition: "No duplicates", action: "Reject", status: true },
  { name: "Price Range", module: "Products", field: "Price", type: "Range", condition: "0 < price < 999999", action: "Warning", status: true },
  { name: "Date Format", module: "Invoices", field: "Date", type: "Format", condition: "YYYY-MM-DD", action: "Auto-fix", status: true },
  { name: "Required Employee ID", module: "Employees", field: "Employee ID", type: "Required", condition: "Not empty", action: "Reject", status: true },
  { name: "Salary Range", module: "Employees", field: "Salary", type: "Range", condition: "20000 < salary < 500000", action: "Warning", status: true },
  { name: "Phone Format", module: "Contacts", field: "Phone", type: "Format", condition: "Valid phone number", action: "Auto-fix", status: true },
  { name: "Unique Invoice #", module: "Invoices", field: "Invoice #", type: "Unique", condition: "No duplicates", action: "Reject", status: true },
  { name: "Required Account", module: "GL Entries", field: "Account Code", type: "Required", condition: "Not empty", action: "Reject", status: true },
  { name: "Debit/Credit Balance", module: "GL Entries", field: "Debit/Credit", type: "Custom", condition: "Either debit or credit, not both", action: "Reject", status: true },
  { name: "Category Lookup", module: "Products", field: "Category", type: "Lookup", condition: "Must exist in category list", action: "Warning", status: false },
];

const migrationHistory: HistoryEntry[] = [
  { id: "JOB-001", type: "Import", module: "Contacts", fileName: "crm_contacts_2026.csv", total: 12450, processed: 12450, failed: 0, duration: "23 min", user: "Admin", date: "Apr 2, 2026", status: "Completed" },
  { id: "JOB-002", type: "Import", module: "Products", fileName: "product_catalog.json", total: 8340, processed: 8337, failed: 3, duration: "12 min", user: "System", date: "Apr 1, 2026", status: "Completed" },
  { id: "JOB-003", type: "Export", module: "GL Entries", fileName: "gl_export_q1.csv", total: 45230, processed: 45230, failed: 0, duration: "5 min", user: "Finance Mgr", date: "Mar 31, 2026", status: "Completed" },
  { id: "JOB-004", type: "Import", module: "Employees", fileName: "hr_data_march.xlsx", total: 156, processed: 156, failed: 0, duration: "2 min", user: "HR Admin", date: "Mar 28, 2026", status: "Completed" },
  { id: "JOB-005", type: "Import", module: "Vendors", fileName: "vendor_list_v2.csv", total: 890, processed: 843, failed: 47, duration: "8 min", user: "Procurement", date: "Mar 25, 2026", status: "Partial" },
  { id: "JOB-006", type: "Export", module: "Contacts", fileName: "contacts_backup.json", total: 12450, processed: 12450, failed: 0, duration: "3 min", user: "Admin", date: "Mar 20, 2026", status: "Completed" },
  { id: "JOB-007", type: "Import", module: "Assets", fileName: "asset_register.xlsx", total: 320, processed: 315, failed: 5, duration: "4 min", user: "Finance", date: "Mar 15, 2026", status: "Completed" },
  { id: "JOB-008", type: "Import", module: "Invoices", fileName: "legacy_invoices.csv", total: 5600, processed: 5580, failed: 20, duration: "15 min", user: "Admin", date: "Mar 10, 2026", status: "Completed" },
  { id: "JOB-009", type: "Export", module: "Products", fileName: "products_full.xlsx", total: 8340, processed: 8340, failed: 0, duration: "4 min", user: "System", date: "Mar 5, 2026", status: "Completed" },
  { id: "JOB-010", type: "Import", module: "GL Entries", fileName: "qb_import_feb.csv", total: 3200, processed: 0, failed: 3200, duration: "1 min", user: "System", date: "Feb 28, 2026", status: "Failed" },
];

const apiSources = [
  { name: "Salesforce", icon: Cloud, status: "Connected", lastSync: "2 hours ago", records: "12,450", color: "text-blue-600" },
  { name: "HubSpot", icon: Database, status: "Connected", lastSync: "1 day ago", records: "8,200", color: "text-orange-600" },
  { name: "QuickBooks", icon: HardDrive, status: "Connected", lastSync: "3 hours ago", records: "45,230", color: "text-green-600" },
  { name: "Xero", icon: Link2, status: "Disconnected", lastSync: "Never", records: "—", color: "text-muted-foreground" },
  { name: "Google Contacts", icon: Cloud, status: "Connected", lastSync: "5 hours ago", records: "3,450", color: "text-red-600" },
  { name: "Mailchimp", icon: Zap, status: "Disconnected", lastSync: "7 days ago", records: "15,800", color: "text-muted-foreground" },
];

// ─── Page Component ────────────────────────────────────────────────────────

export default function DataUploadPage() {
  const store = useDataStore();
  const [dragOver, setDragOver] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [fileName, setFileName] = useState("");
  const [selectedModule, setSelectedModule] = useState("Contacts");
  const [columnMappings, setColumnMappings] = useState<Record<number, string>>({});
  const [importResult, setImportResult] = useState<{ imported: number; errors: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk Import state
  const [bulkParsedData, setBulkParsedData] = useState<ParsedData | null>(null);
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkDragOver, setBulkDragOver] = useState(false);
  const [bulkEntityType, setBulkEntityType] = useState<EntityTemplateKey | null>(null);
  const [bulkMappings, setBulkMappings] = useState<Record<number, string>>({});
  const [bulkProgress, setBulkProgress] = useState<ImportProgress>({ total: 0, processed: 0, imported: 0, skipped: 0, errors: [], status: "idle" });
  const [bulkValidationErrors, setBulkValidationErrors] = useState<ValidationError[]>([]);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  // Backup state
  const [backupDragOver, setBackupDragOver] = useState(false);
  const [backupResult, setBackupResult] = useState<{ success: boolean; message: string } | null>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  // ── Original upload handlers ──

  const handleImport = useCallback(() => {
    if (!parsedData) return;
    let imported = 0;
    let errors = 0;

    try {
      if (selectedModule === "Customers") {
        const items = parsedData.rows.map((row) => {
          const obj: Record<string, string> = {};
          parsedData.headers.forEach((h, i) => { obj[columnMappings[i] || h] = row[i] ?? ""; });
          return {
            id: store.genId("c"),
            code: obj["Code"] || obj["code"] || `IMP-${Date.now().toString(36).slice(-4)}`,
            name: obj["Name"] || obj["name"] || "Imported Customer",
            type: obj["Type"] || obj["type"] || "Pharmacy Chain",
            phone: obj["Phone"] || obj["phone"] || "",
            email: obj["Email"] || obj["email"] || "",
            address: obj["Address"] || obj["address"] || "",
            city: obj["City"] || obj["city"],
            creditLimit: Number(obj["Credit Limit"] || obj["creditLimit"]) || 0,
            outstanding: Number(obj["Outstanding"] || obj["outstanding"]) || 0,
            currency: "EGP",
            paymentTerms: obj["Payment Terms"] || "Net 30",
            status: "ACTIVE" as const,
            createdAt: new Date().toISOString(),
          };
        });
        items.forEach((item) => {
          try { store.add("customers", item); imported++; } catch { errors++; }
        });
      } else if (selectedModule === "Vendors") {
        parsedData.rows.forEach((row) => {
          const obj: Record<string, string> = {};
          parsedData.headers.forEach((h, i) => { obj[columnMappings[i] || h] = row[i] ?? ""; });
          try {
            store.add("vendors", {
              id: store.genId("ve"),
              code: obj["Code"] || obj["code"] || `IMP-${Date.now().toString(36).slice(-4)}`,
              name: obj["Name"] || obj["name"] || "Imported Vendor",
              category: obj["Category"] || obj["category"] || "Services",
              phone: obj["Phone"] || obj["phone"] || "",
              email: obj["Email"] || obj["email"] || "",
              address: obj["Address"] || obj["address"] || "",
              outstanding: Number(obj["Outstanding"] || obj["outstanding"]) || 0,
              paymentTerms: obj["Payment Terms"] || "Net 30",
              gmpCertified: (obj["GMP"] || "").toLowerCase() === "yes",
              createdAt: new Date().toISOString(),
            });
            imported++;
          } catch { errors++; }
        });
      } else if (selectedModule === "Products") {
        parsedData.rows.forEach((row) => {
          const obj: Record<string, string> = {};
          parsedData.headers.forEach((h, i) => { obj[columnMappings[i] || h] = row[i] ?? ""; });
          try {
            store.add("products", {
              id: store.genId("p"),
              code: obj["SKU"] || obj["Code"] || obj["code"] || store.generateProductCode(),
              name: obj["Name"] || obj["name"] || "Imported Product",
              strength: obj["Strength"] || obj["strength"] || "",
              form: (obj["Form"] || "Tablet") as "Tablet",
              buId: null,
              pricePerUnit: Number(obj["Price"] || obj["pricePerUnit"]) || 0,
              therapeuticArea: obj["Category"] || obj["therapeuticArea"] || "",
              stockQty: Number(obj["Stock"] || obj["stockQty"]) || 0,
              reorderLevel: Number(obj["ReorderLevel"] || obj["reorderLevel"]) || 100,
            });
            imported++;
          } catch { errors++; }
        });
      } else {
        // Generic: just count rows as "imported" for display
        imported = parsedData.rows.length;
      }
    } catch {
      errors = parsedData.rows.length;
    }
    setImportResult({ imported, errors });
  }, [parsedData, selectedModule, columnMappings, store]);

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (file.name.endsWith(".json")) {
        try {
          const json = JSON.parse(text);
          const arr = Array.isArray(json) ? json : [json];
          if (arr.length > 0) {
            const headers = Object.keys(arr[0]);
            const rows = arr.map(obj => headers.map(h => String(obj[h] ?? "")));
            setParsedData({ headers, rows: rows.slice(0, 100) });
          }
        } catch { setParsedData(null); }
      } else {
        const parsed = parseCSV(text);
        setParsedData({ headers: parsed.headers, rows: parsed.rows.slice(0, 100) });
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }, [handleFile]);

  const downloadTemplate = useCallback((template: typeof templates[0]) => {
    const csv = [template.headers.join(","), template.sample.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${template.name.toLowerCase()}_template.csv`; a.click();
    URL.revokeObjectURL(url);
  }, []);

  const targetFields = templates.find(t => t.name === selectedModule)?.headers || [];

  // ── Bulk Import handlers ──

  const handleBulkFile = useCallback((file: File) => {
    setBulkFileName(file.name);
    setBulkProgress({ total: 0, processed: 0, imported: 0, skipped: 0, errors: [], status: "idle" });
    setBulkValidationErrors([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      let parsed: ParsedData;
      if (file.name.endsWith(".json")) {
        try {
          const json = JSON.parse(text);
          const arr = Array.isArray(json) ? json : [json];
          if (arr.length > 0) {
            const headers = Object.keys(arr[0]);
            const rows = arr.map(obj => headers.map(h => String(obj[h] ?? "")));
            parsed = { headers, rows };
          } else {
            return;
          }
        } catch { return; }
      } else {
        parsed = parseCSV(text);
      }

      setBulkParsedData(parsed);

      // Auto-detect entity type
      const detected = autoDetectEntityType(parsed.headers);
      if (detected) {
        setBulkEntityType(detected);
        // Auto-map columns
        const mappings = autoMapHeaders(parsed.headers, detected);
        setBulkMappings(mappings);

        // Run validation on all rows
        const tmpl = entityTemplates[detected];
        const allErrors: ValidationError[] = [];
        parsed.rows.forEach((row, ri) => {
          const obj: Record<string, string> = {};
          parsed.headers.forEach((h, i) => {
            const mappedField = mappings[i];
            if (mappedField) obj[mappedField] = row[i] ?? "";
          });
          const rowErrors = tmpl.validate(obj, ri + 1);
          allErrors.push(...rowErrors);
        });
        setBulkValidationErrors(allErrors);
      } else {
        setBulkEntityType(null);
        setBulkMappings({});
      }
    };
    reader.readAsText(file);
  }, []);

  const handleBulkDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setBulkDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleBulkFile(file);
  }, [handleBulkFile]);

  const handleBulkFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleBulkFile(file);
    e.target.value = "";
  }, [handleBulkFile]);

  const handleBulkEntityTypeChange = useCallback((newType: EntityTemplateKey) => {
    setBulkEntityType(newType);
    if (bulkParsedData) {
      const mappings = autoMapHeaders(bulkParsedData.headers, newType);
      setBulkMappings(mappings);

      const tmpl = entityTemplates[newType];
      const allErrors: ValidationError[] = [];
      bulkParsedData.rows.forEach((row, ri) => {
        const obj: Record<string, string> = {};
        bulkParsedData.headers.forEach((h, i) => {
          const mappedField = mappings[i];
          if (mappedField) obj[mappedField] = row[i] ?? "";
        });
        const rowErrors = tmpl.validate(obj, ri + 1);
        allErrors.push(...rowErrors);
      });
      setBulkValidationErrors(allErrors);
    }
  }, [bulkParsedData]);

  const handleBulkImport = useCallback(() => {
    if (!bulkParsedData || !bulkEntityType) return;
    const tmpl = entityTemplates[bulkEntityType];
    const total = bulkParsedData.rows.length;

    setBulkProgress({ total, processed: 0, imported: 0, skipped: 0, errors: [], status: "validating" });

    // Use setTimeout to allow the UI to update with progress
    setTimeout(() => {
      const errors: ValidationError[] = [];
      const validItems: Record<string, string>[] = [];

      // Validate all rows
      bulkParsedData.rows.forEach((row, ri) => {
        const obj: Record<string, string> = {};
        bulkParsedData.headers.forEach((h, i) => {
          const mappedField = bulkMappings[i];
          if (mappedField) obj[mappedField] = row[i] ?? "";
        });
        const rowErrors = tmpl.validate(obj, ri + 1);
        if (rowErrors.length > 0) {
          errors.push(...rowErrors);
        } else {
          validItems.push(obj);
        }
      });

      const skipped = total - validItems.length;
      setBulkProgress(prev => ({ ...prev, processed: total, skipped, errors, status: "importing" }));

      // Build and import all valid items at once using bulkAdd
      setTimeout(() => {
        let imported = 0;
        const importErrors: ValidationError[] = [...errors];

        try {
          if (bulkEntityType === "GL Accounts") {
            const glTmpl = entityTemplates["GL Accounts"];
            const builtItems = validItems.map(obj => glTmpl.build(obj, store.genId("gl")));
            store.bulkAdd("glAccounts", builtItems);
            imported = builtItems.length;
          } else {
            const codeGen: Record<string, () => string> = {
              Products: () => store.generateProductCode(),
              Customers: () => store.generateCustomerCode(),
              Vendors: () => store.generateVendorCode(),
            };
            const gen = codeGen[bulkEntityType];
            // We need to type-assert here because TypeScript can't narrow across the union
            const storeKey = tmpl.storeKey;
            const builtItems = validItems.map(obj => {
              const id = store.genId(tmpl.idPrefix);
              const code = gen ? gen() : "";
              return (tmpl as typeof entityTemplates["Products"]).build(obj, id, code);
            });
            // Use bulkAdd for batch insert
            try {
              store.bulkAdd(storeKey as "products", builtItems as never[]);
              imported = builtItems.length;
            } catch {
              // Fallback to individual adds
              builtItems.forEach((item, idx) => {
                try {
                  store.add(storeKey as "products", item as never);
                  imported++;
                } catch {
                  importErrors.push({ row: idx + 1, column: "-", value: "-", message: "Failed to import record" });
                }
              });
            }
          }
        } catch {
          importErrors.push({ row: 0, column: "-", value: "-", message: "Batch import failed" });
        }

        setBulkProgress({
          total,
          processed: total,
          imported,
          skipped,
          errors: importErrors,
          status: "complete",
        });
      }, 100);
    }, 100);
  }, [bulkParsedData, bulkEntityType, bulkMappings, store]);

  const downloadEntityTemplate = useCallback((entityKey: EntityTemplateKey) => {
    const tmpl = entityTemplates[entityKey];
    const csv = generateCSVContent(tmpl.headers, tmpl.sampleRows);
    downloadFile(csv, `${entityKey.toLowerCase().replace(/\s+/g, "_")}_template.csv`, "text/csv");
  }, []);

  // ── Backup handlers ──

  const handleExportAllData = useCallback(() => {
    const storageKey = "pharma.dataStore.v1";
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      alert("No data found in storage.");
      return;
    }
    const dateStr = new Date().toISOString().split("T")[0];
    downloadFile(raw, `erp_full_backup_${dateStr}.json`, "application/json");
  }, []);

  const handleImportBackup = useCallback((file: File) => {
    setBackupResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const data = JSON.parse(text);
        // Basic sanity checks: must be an object with expected array keys
        const expectedKeys = ["products", "customers", "vendors", "glAccounts"];
        const hasData = expectedKeys.some(k => Array.isArray(data[k]));
        if (!hasData) {
          setBackupResult({ success: false, message: "Invalid backup file: does not contain expected data arrays (products, customers, vendors, glAccounts)." });
          return;
        }
        const storageKey = "pharma.dataStore.v1";
        localStorage.setItem(storageKey, JSON.stringify(data));
        setBackupResult({ success: true, message: `Backup restored successfully. The page will reload to apply changes.` });
        // Reload after short delay
        setTimeout(() => window.location.reload(), 1500);
      } catch {
        setBackupResult({ success: false, message: "Failed to parse backup file. Ensure it is a valid JSON file." });
      }
    };
    reader.readAsText(file);
  }, []);

  const handleBackupDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setBackupDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImportBackup(file);
  }, [handleImportBackup]);

  const handleBackupFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImportBackup(file);
    e.target.value = "";
  }, [handleImportBackup]);

  // Error rows for bulk import preview highlighting
  const bulkErrorRows = new Set(bulkValidationErrors.map(e => e.row));
  const bulkErrorCols = new Map<string, Set<number>>();
  bulkValidationErrors.forEach(e => {
    if (!bulkErrorCols.has(e.column)) bulkErrorCols.set(e.column, new Set());
    bulkErrorCols.get(e.column)!.add(e.row);
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2"><Upload className="h-6 w-6 text-primary" /><h1 className="text-2xl font-bold tracking-tight">Data Upload & Migration</h1></div>
          <p className="text-muted-foreground text-sm mt-1">Import, export, and migrate data across the system</p>
        </div>
      </div>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="bulk-import">Bulk Import</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="mappings">Field Mappings</TabsTrigger>
          <TabsTrigger value="validation">Validation Rules</TabsTrigger>
          <TabsTrigger value="history">Migration History</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
          <TabsTrigger value="api">API Import</TabsTrigger>
        </TabsList>

        {/* ── Upload Tab ── */}
        <TabsContent value="upload" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              {/* Drop Zone */}
              <Card>
                <CardContent className="p-6">
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                  >
                    <Upload className={`h-10 w-10 mx-auto mb-3 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="text-sm font-medium">{dragOver ? "Drop file here" : "Drag & drop a file here"}</p>
                    <p className="text-xs text-muted-foreground mt-1">Supports CSV, JSON, XML, TXT</p>
                    <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={() => fileInputRef.current?.click()}>
                      <FileSpreadsheet className="h-3.5 w-3.5" />Browse Files
                    </Button>
                    <input ref={fileInputRef} type="file" accept=".csv,.json,.xml,.txt,.xlsx" className="hidden" onChange={handleFileInput} />
                  </div>
                  {fileName && <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><FileText className="h-3 w-3" />Loaded: <span className="font-medium">{fileName}</span></p>}
                </CardContent>
              </Card>

              {/* Preview */}
              {parsedData && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Data Preview ({parsedData.rows.length} rows)</CardTitle></CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="p-2 text-left font-medium text-muted-foreground">#</th>
                          {parsedData.headers.map((h, i) => (
                            <th key={i} className="p-2 text-left font-medium">
                              <div>{h}</div>
                              <Badge variant="outline" className="text-[9px] mt-0.5">{detectType(parsedData.rows.map(r => r[i] || ""))}</Badge>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.rows.slice(0, 10).map((row, ri) => (
                          <tr key={ri} className="border-b hover:bg-muted/50">
                            <td className="p-2 text-muted-foreground">{ri + 1}</td>
                            {row.map((cell, ci) => <td key={ci} className="p-2 max-w-[150px] truncate">{cell}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              {/* Column Mapping */}
              {parsedData && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Column Mapping</CardTitle><CardDescription className="text-xs">Map source columns to target fields</CardDescription></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {parsedData.headers.map((header, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs font-medium w-40 truncate">{header}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          <select className="text-xs border rounded px-2 py-1 w-48" value={columnMappings[i] || ""} onChange={e => setColumnMappings(prev => ({ ...prev, [i]: e.target.value }))}>
                            <option value="">— Skip —</option>
                            {targetFields.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                          <Badge variant="outline" className="text-[9px]">{detectType(parsedData.rows.map(r => r[i] || ""))}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Panel */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Import Settings</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><label className="text-xs text-muted-foreground">Target Module</label>
                    <select className="w-full text-sm border rounded px-2 py-1.5 mt-1" value={selectedModule} onChange={e => setSelectedModule(e.target.value)}>
                      {targetModules.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div><label className="text-xs text-muted-foreground">Duplicate Handling</label>
                    <select className="w-full text-sm border rounded px-2 py-1.5 mt-1"><option>Skip Duplicates</option><option>Update Existing</option><option>Create New</option></select>
                  </div>
                  <div><label className="text-xs text-muted-foreground">Date Format</label>
                    <select className="w-full text-sm border rounded px-2 py-1.5 mt-1"><option>YYYY-MM-DD</option><option>MM/DD/YYYY</option><option>DD/MM/YYYY</option></select>
                  </div>
                  <Button className="w-full gap-1" disabled={!parsedData} onClick={handleImport}><Upload className="h-4 w-4" />Start Import</Button>
                  {importResult && (
                    <div className={`mt-2 rounded-md p-2 text-xs ${importResult.errors > 0 ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
                      <div className="flex items-center gap-1 font-medium">
                        {importResult.errors > 0 ? <AlertTriangle className="h-3 w-3 text-amber-600" /> : <CheckCircle2 className="h-3 w-3 text-green-600" />}
                        Import Complete
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {importResult.imported} rows imported successfully
                        {importResult.errors > 0 && <>, <span className="text-red-600 font-medium">{importResult.errors} errors</span></>}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              {parsedData && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Validation Summary</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between"><span className="text-xs flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" />Valid Rows</span><span className="text-xs font-medium">{parsedData.rows.length}</span></div>
                    <div className="flex items-center justify-between"><span className="text-xs flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-600" />Warnings</span><span className="text-xs font-medium">0</span></div>
                    <div className="flex items-center justify-between"><span className="text-xs flex items-center gap-1"><XCircle className="h-3 w-3 text-red-600" />Errors</span><span className="text-xs font-medium">0</span></div>
                    <div className="flex items-center justify-between"><span className="text-xs">Columns Detected</span><span className="text-xs font-medium">{parsedData.headers.length}</span></div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Bulk Import Tab ── */}
        <TabsContent value="bulk-import" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: Template Downloads + Upload + Preview */}
            <div className="lg:col-span-2 space-y-4">
              {/* Template Downloads */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2"><Download className="h-4 w-4" />Download Templates</CardTitle>
                  <CardDescription className="text-xs">Download CSV templates with all fields and sample data for each entity type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(Object.keys(entityTemplates) as EntityTemplateKey[]).map(key => {
                      const tmpl = entityTemplates[key];
                      return (
                        <Button key={key} variant="outline" size="sm" className="h-auto py-3 flex flex-col items-center gap-1.5" onClick={() => downloadEntityTemplate(key)}>
                          <FileSpreadsheet className="h-5 w-5 text-primary" />
                          <span className="text-xs font-medium">{key}</span>
                          <span className="text-[10px] text-muted-foreground">{tmpl.headers.length} fields, {tmpl.sampleRows.length} samples</span>
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Drop Zone */}
              <Card>
                <CardContent className="p-6">
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${bulkDragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}
                    onDragOver={e => { e.preventDefault(); setBulkDragOver(true); }}
                    onDragLeave={() => setBulkDragOver(false)}
                    onDrop={handleBulkDrop}
                  >
                    <PackagePlus className={`h-10 w-10 mx-auto mb-3 ${bulkDragOver ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="text-sm font-medium">{bulkDragOver ? "Drop file here" : "Upload file for bulk import"}</p>
                    <p className="text-xs text-muted-foreground mt-1">CSV or JSON with all items. Entity type will be auto-detected from headers.</p>
                    <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={() => bulkFileInputRef.current?.click()}>
                      <FileSpreadsheet className="h-3.5 w-3.5" />Browse Files
                    </Button>
                    <input ref={bulkFileInputRef} type="file" accept=".csv,.json" className="hidden" onChange={handleBulkFileInput} />
                  </div>
                  {bulkFileName && (
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3" />Loaded: <span className="font-medium">{bulkFileName}</span></p>
                      {bulkParsedData && <Badge variant="outline" className="text-xs">{bulkParsedData.rows.length} rows</Badge>}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Column Mapping Preview */}
              {bulkParsedData && bulkEntityType && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Column Mapping</CardTitle>
                        <CardDescription className="text-xs">Auto-mapped columns from file headers to {bulkEntityType} fields</CardDescription>
                      </div>
                      <Badge variant="default" className="text-xs">{Object.values(bulkMappings).filter(Boolean).length} / {entityTemplates[bulkEntityType].headers.length} mapped</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {bulkParsedData.headers.map((header, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs font-medium w-40 truncate" title={header}>{header}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          <select
                            className="text-xs border rounded px-2 py-1 w-48"
                            value={bulkMappings[i] || ""}
                            onChange={e => setBulkMappings(prev => ({ ...prev, [i]: e.target.value }))}
                          >
                            <option value="">-- Skip --</option>
                            {entityTemplates[bulkEntityType].headers.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                          {bulkMappings[i] ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">skipped</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Data Preview with error highlighting */}
              {bulkParsedData && bulkEntityType && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Data Preview (first 5 rows of {bulkParsedData.rows.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="p-2 text-left font-medium text-muted-foreground">#</th>
                          {bulkParsedData.headers.map((h, i) => (
                            <th key={i} className="p-2 text-left font-medium">
                              <div className="flex items-center gap-1">
                                <span>{h}</span>
                                {bulkMappings[i] && <Badge variant="secondary" className="text-[8px]">{bulkMappings[i]}</Badge>}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bulkParsedData.rows.slice(0, 5).map((row, ri) => {
                          const rowNum = ri + 1;
                          const hasError = bulkErrorRows.has(rowNum);
                          return (
                            <tr key={ri} className={`border-b ${hasError ? "bg-red-50" : "hover:bg-muted/50"}`}>
                              <td className="p-2 text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  {rowNum}
                                  {hasError && <XCircle className="h-3 w-3 text-red-500" />}
                                </div>
                              </td>
                              {row.map((cell, ci) => {
                                const mappedCol = bulkMappings[ci];
                                const cellHasError = mappedCol && bulkErrorCols.get(mappedCol)?.has(rowNum);
                                return (
                                  <td key={ci} className={`p-2 max-w-[150px] truncate ${cellHasError ? "text-red-600 font-medium bg-red-100" : ""}`} title={cellHasError ? bulkValidationErrors.find(e => e.row === rowNum && e.column === mappedCol)?.message : cell}>
                                    {cell}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: Entity detection + validation + import action */}
            <div className="space-y-4">
              {/* Entity Type Detection */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Entity Type</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {bulkEntityType ? (
                    <div className="rounded-md bg-green-50 border border-green-200 p-2 text-xs">
                      <div className="flex items-center gap-1 font-medium text-green-800">
                        <CheckCircle2 className="h-3 w-3" />
                        Auto-detected: {bulkEntityType}
                      </div>
                    </div>
                  ) : bulkParsedData ? (
                    <div className="rounded-md bg-amber-50 border border-amber-200 p-2 text-xs">
                      <div className="flex items-center gap-1 font-medium text-amber-800">
                        <AlertTriangle className="h-3 w-3" />
                        Could not auto-detect entity type
                      </div>
                    </div>
                  ) : null}
                  <div>
                    <label className="text-xs text-muted-foreground">Target Entity</label>
                    <select
                      className="w-full text-sm border rounded px-2 py-1.5 mt-1"
                      value={bulkEntityType || ""}
                      onChange={e => {
                        if (e.target.value) handleBulkEntityTypeChange(e.target.value as EntityTemplateKey);
                      }}
                    >
                      <option value="">-- Select --</option>
                      {(Object.keys(entityTemplates) as EntityTemplateKey[]).map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* Validation Summary */}
              {bulkParsedData && bulkEntityType && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Validation Summary</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" />Valid Rows</span>
                      <span className="text-xs font-medium">{bulkParsedData.rows.length - new Set(bulkValidationErrors.map(e => e.row)).size}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs flex items-center gap-1"><XCircle className="h-3 w-3 text-red-600" />Rows with Errors</span>
                      <span className="text-xs font-medium text-red-600">{new Set(bulkValidationErrors.map(e => e.row)).size}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Total Rows</span>
                      <span className="text-xs font-medium">{bulkParsedData.rows.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Columns Mapped</span>
                      <span className="text-xs font-medium">{Object.values(bulkMappings).filter(Boolean).length}</span>
                    </div>
                    {bulkValidationErrors.length > 0 && (
                      <div className="mt-2 border-t pt-2">
                        <p className="text-[10px] text-muted-foreground font-medium mb-1">Errors (first 10):</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {bulkValidationErrors.slice(0, 10).map((err, i) => (
                            <div key={i} className="text-[10px] text-red-600 flex items-start gap-1">
                              <XCircle className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                              <span>Row {err.row}, {err.column}: {err.message}</span>
                            </div>
                          ))}
                          {bulkValidationErrors.length > 10 && (
                            <p className="text-[10px] text-muted-foreground">...and {bulkValidationErrors.length - 10} more errors</p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Import Action + Progress */}
              {bulkParsedData && bulkEntityType && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Batch Import</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      className="w-full gap-1"
                      disabled={bulkProgress.status === "validating" || bulkProgress.status === "importing"}
                      onClick={handleBulkImport}
                    >
                      {bulkProgress.status === "validating" || bulkProgress.status === "importing" ? (
                        <><RefreshCw className="h-4 w-4 animate-spin" />Importing...</>
                      ) : (
                        <><PackagePlus className="h-4 w-4" />Import All {bulkParsedData.rows.length} Records</>
                      )}
                    </Button>

                    {bulkProgress.status !== "idle" && (
                      <div className="space-y-2">
                        <Progress
                          value={
                            bulkProgress.status === "complete"
                              ? 100
                              : bulkProgress.status === "importing"
                              ? 80
                              : 40
                          }
                          className="h-2"
                        />
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>
                            {bulkProgress.status === "validating" && "Validating rows..."}
                            {bulkProgress.status === "importing" && "Importing to store..."}
                            {bulkProgress.status === "complete" && "Complete"}
                          </span>
                          <span>{bulkProgress.processed} / {bulkProgress.total}</span>
                        </div>
                      </div>
                    )}

                    {bulkProgress.status === "complete" && (
                      <div className={`rounded-md p-3 text-xs ${bulkProgress.errors.length > 0 ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
                        <div className="flex items-center gap-1 font-medium">
                          {bulkProgress.errors.length > 0 ? <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> : <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
                          Import Results
                        </div>
                        <div className="mt-2 space-y-1 text-muted-foreground">
                          <div className="flex justify-between"><span>Imported:</span><span className="font-medium text-green-700">{bulkProgress.imported}</span></div>
                          <div className="flex justify-between"><span>Skipped (errors):</span><span className="font-medium text-red-600">{bulkProgress.skipped}</span></div>
                          <div className="flex justify-between"><span>Total:</span><span className="font-medium">{bulkProgress.total}</span></div>
                        </div>
                        {bulkProgress.imported > 0 && (
                          <p className="mt-2 text-green-700 text-[10px]">Records have been added to the {bulkEntityType} store.</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Templates Tab ── */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {templates.map(t => (
              <Card key={t.name} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2"><FileSpreadsheet className="h-5 w-5 text-primary" /><Badge variant="outline" className="text-[10px]">CSV</Badge></div>
                  <p className="text-sm font-semibold">{t.name} Template</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.headers.length} columns: {t.headers.slice(0, 3).join(", ")}...</p>
                  <Button variant="outline" size="sm" className="w-full mt-3 text-xs gap-1" onClick={() => downloadTemplate(t)}><Download className="h-3 w-3" />Download Template</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Field Mappings Tab ── */}
        <TabsContent value="mappings" className="space-y-4">
          <Card><CardContent className="p-0"><table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground">{["Mapping Name", "Source", "Target", "Fields", "Created By", "Last Used", "Status"].map(h => <th key={h} className="text-left p-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>{fieldMappings.map(m => (
              <tr key={m.name} className="border-b last:border-0 hover:bg-muted/50">
                <td className="p-3 text-xs font-medium">{m.name}</td><td className="p-3"><Badge variant="outline" className="text-xs">{m.source}</Badge></td><td className="p-3 text-xs">{m.target}</td><td className="p-3 text-xs text-center">{m.fields}</td><td className="p-3 text-xs">{m.createdBy}</td><td className="p-3 text-xs">{m.lastUsed}</td><td className="p-3"><Badge variant={m.status === "Active" ? "default" : m.status === "Inactive" ? "secondary" : "outline"} className="text-xs">{m.status}</Badge></td>
              </tr>
            ))}</tbody>
          </table></CardContent></Card>
        </TabsContent>

        {/* ── Validation Rules Tab ── */}
        <TabsContent value="validation" className="space-y-4">
          <Card><CardContent className="p-0"><table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground">{["Rule Name", "Module", "Field", "Type", "Condition", "On Fail", "Active"].map(h => <th key={h} className="text-left p-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>{validationRules.map(r => (
              <tr key={r.name} className="border-b last:border-0 hover:bg-muted/50">
                <td className="p-3 text-xs font-medium">{r.name}</td><td className="p-3 text-xs">{r.module}</td><td className="p-3 text-xs">{r.field}</td><td className="p-3"><Badge variant="outline" className="text-xs">{r.type}</Badge></td><td className="p-3 text-xs text-muted-foreground">{r.condition}</td><td className="p-3"><Badge variant={r.action === "Reject" ? "destructive" : r.action === "Warning" ? "default" : "secondary"} className="text-xs">{r.action}</Badge></td>
                <td className="p-3"><span className={`inline-flex h-5 w-9 items-center rounded-full px-0.5 transition-colors ${r.status ? "bg-green-500" : "bg-gray-300"}`}><span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${r.status ? "translate-x-4" : "translate-x-0"}`} /></span></td>
              </tr>
            ))}</tbody>
          </table></CardContent></Card>
        </TabsContent>

        {/* ── History Tab ── */}
        <TabsContent value="history" className="space-y-4">
          <Card><CardContent className="p-0"><table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground">{["Job ID", "Type", "Module", "File", "Total", "Processed", "Failed", "Duration", "User", "Date", "Status"].map(h => <th key={h} className="text-left p-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>{migrationHistory.map(h => (
              <tr key={h.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="p-3 font-mono text-xs">{h.id}</td><td className="p-3"><Badge variant={h.type === "Import" ? "default" : "secondary"} className="text-xs">{h.type}</Badge></td><td className="p-3 text-xs">{h.module}</td><td className="p-3 text-xs max-w-[150px] truncate">{h.fileName}</td><td className="p-3 text-xs">{h.total.toLocaleString()}</td><td className="p-3 text-xs">{h.processed.toLocaleString()}</td><td className="p-3 text-xs">{h.failed > 0 ? <span className="text-red-600 font-medium">{h.failed}</span> : "0"}</td><td className="p-3 text-xs">{h.duration}</td><td className="p-3 text-xs">{h.user}</td><td className="p-3 text-xs">{h.date}</td><td className="p-3"><Badge variant={h.status === "Completed" ? "default" : h.status === "Partial" ? "secondary" : "destructive"} className="text-xs">{h.status}</Badge></td>
              </tr>
            ))}</tbody>
          </table></CardContent></Card>
        </TabsContent>

        {/* ── Export Tab ── */}
        <TabsContent value="export" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Export Data</CardTitle><CardDescription className="text-xs">Select module and format to export from live data store</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs text-muted-foreground">Module</label>
                    <select id="exportModule" className="w-full text-sm border rounded px-2 py-1.5 mt-1">
                      {["Customers", "Vendors", "Products", "Cheques", "Invoices", "Doctors", "Visits", "Tasks"].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div><label className="text-xs text-muted-foreground">Format</label>
                    <select id="exportFormat" className="w-full text-sm border rounded px-2 py-1.5 mt-1"><option value="csv">CSV</option><option value="json">JSON</option></select>
                  </div>
                </div>
                <Button className="gap-1" onClick={() => {
                  const mod = (document.getElementById("exportModule") as HTMLSelectElement)?.value || "Customers";
                  const fmt = (document.getElementById("exportFormat") as HTMLSelectElement)?.value || "csv";
                  const keyMap: Record<string, string> = { Customers: "customers", Vendors: "vendors", Products: "products", Cheques: "cheques", Invoices: "invoices", Doctors: "doctors", Visits: "visits", Tasks: "tasks" };
                  const key = keyMap[mod];
                  if (!key) return;
                  const data = (store as unknown as Record<string, unknown>)[key];
                  if (!Array.isArray(data) || data.length === 0) { alert("No data to export for " + mod); return; }

                  let content: string;
                  let mimeType: string;
                  let ext: string;

                  if (fmt === "json") {
                    content = JSON.stringify(data, null, 2);
                    mimeType = "application/json";
                    ext = "json";
                  } else {
                    const headers = Object.keys(data[0]);
                    const rows = data.map((row: Record<string, unknown>) => headers.map(h => {
                      const v = row[h];
                      const s = v === null || v === undefined ? "" : String(v);
                      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
                    }).join(","));
                    content = [headers.join(","), ...rows].join("\n");
                    mimeType = "text/csv";
                    ext = "csv";
                  }

                  const blob = new Blob([content], { type: mimeType });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${mod.toLowerCase()}_export_${new Date().toISOString().split("T")[0]}.${ext}`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}><Download className="h-4 w-4" />Export Data</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Scheduled Exports</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "Daily GL Backup", schedule: "Daily 11 PM", format: "CSV", module: "GL Entries" },
                  { name: "Weekly Contacts", schedule: "Mon 6 AM", format: "JSON", module: "Contacts" },
                  { name: "Monthly Products", schedule: "1st 8 AM", format: "Excel", module: "Products" },
                ].map(s => (
                  <div key={s.name} className="flex items-center justify-between p-2 rounded border text-xs">
                    <div><p className="font-medium">{s.name}</p><p className="text-muted-foreground">{s.module} · {s.format} · {s.schedule}</p></div>
                    <Badge variant="default" className="text-[10px]">Active</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Backup Tab (Full JSON Export/Import) ── */}
        <TabsContent value="backup" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Export All Data */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Archive className="h-4 w-4" />Export All Data</CardTitle>
                <CardDescription className="text-xs">Download the entire application data store as a single JSON backup file. Includes all products, customers, vendors, GL accounts, invoices, and every other entity.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md bg-muted/50 border p-3 space-y-2">
                  <p className="text-xs font-medium">Included data:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["Products", "Customers", "Vendors", "GL Accounts", "Invoices", "Cheques", "Payments", "Purchase Orders", "Sales Orders", "Journal Entries", "Employees", "Doctors", "Visits", "Tasks"].map(label => (
                      <Badge key={label} variant="outline" className="text-[10px]">{label}</Badge>
                    ))}
                    <Badge variant="secondary" className="text-[10px]">+ more</Badge>
                  </div>
                </div>
                <Button className="w-full gap-2" onClick={handleExportAllData}>
                  <Download className="h-4 w-4" />Export Full Backup (JSON)
                </Button>
                <p className="text-[10px] text-muted-foreground">File will be saved as erp_full_backup_YYYY-MM-DD.json</p>
              </CardContent>
            </Card>

            {/* Import from Backup */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4" />Import from Backup</CardTitle>
                <CardDescription className="text-xs">Restore application data from a previously exported JSON backup file. This will replace ALL current data.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                  <div className="flex items-center gap-1 font-medium"><AlertTriangle className="h-3 w-3" />Warning</div>
                  <p className="mt-1">Importing a backup will overwrite all existing data. Make sure to export a backup of your current data first.</p>
                </div>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${backupDragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}
                  onDragOver={e => { e.preventDefault(); setBackupDragOver(true); }}
                  onDragLeave={() => setBackupDragOver(false)}
                  onDrop={handleBackupDrop}
                >
                  <FileJson className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs font-medium">Drop backup JSON file here</p>
                  <Button variant="outline" size="sm" className="mt-2 gap-1" onClick={() => backupFileInputRef.current?.click()}>
                    <FileSpreadsheet className="h-3.5 w-3.5" />Browse Files
                  </Button>
                  <input ref={backupFileInputRef} type="file" accept=".json" className="hidden" onChange={handleBackupFileInput} />
                </div>

                {backupResult && (
                  <div className={`rounded-md p-3 text-xs ${backupResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                    <div className="flex items-center gap-1 font-medium">
                      {backupResult.success ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-red-600" />}
                      {backupResult.success ? "Success" : "Error"}
                    </div>
                    <p className="mt-1 text-muted-foreground">{backupResult.message}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── API Import Tab ── */}
        <TabsContent value="api" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {apiSources.map(s => {
              const Icon = s.icon;
              return (
                <Card key={s.name} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2"><Icon className={`h-5 w-5 ${s.color}`} /><span className="text-sm font-semibold">{s.name}</span></div>
                      <Badge variant={s.status === "Connected" ? "default" : "secondary"} className="text-[10px]">{s.status}</Badge>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between"><span>Last Sync</span><span>{s.lastSync}</span></div>
                      <div className="flex justify-between"><span>Records</span><span className="font-medium">{s.records}</span></div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button variant={s.status === "Connected" ? "default" : "outline"} size="sm" className="flex-1 text-xs gap-1">
                        {s.status === "Connected" ? <><RefreshCw className="h-3 w-3" />Sync Now</> : <><Link2 className="h-3 w-3" />Connect</>}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Settings className="h-3.5 w-3.5" /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
