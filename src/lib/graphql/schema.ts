import prisma from "@/lib/prisma";
import { search } from "@/lib/search/search-service";

// ─── Authorization ────────────────────────────────────────────────────────────

type UserRole =
  | "ADMIN"
  | "BUM"
  | "MARKETEER"
  | "DISTRICT_MANAGER"
  | "MEDICAL_REP"
  | "ACCOUNTANT"
  | "WAREHOUSE"
  | "HR";

interface AuthContext {
  role: string;
  userId: string;
}

const ENTITY_READ_ROLES: Record<string, UserRole[]> = {
  Customer: ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER", "MEDICAL_REP", "ACCOUNTANT"],
  Product: ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER", "MEDICAL_REP", "WAREHOUSE", "ACCOUNTANT"],
  Invoice: ["ADMIN", "ACCOUNTANT", "BUM", "WAREHOUSE"],
  Employee: ["ADMIN", "HR", "BUM"],
  Department: ["ADMIN", "HR", "BUM"],
  PurchaseOrder: ["ADMIN", "ACCOUNTANT", "WAREHOUSE", "BUM"],
  SalesOrder: ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER", "ACCOUNTANT", "WAREHOUSE"],
  Supplier: ["ADMIN", "ACCOUNTANT", "WAREHOUSE", "BUM"],
  Lead: ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER", "MEDICAL_REP"],
  Opportunity: ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER"],
  Contact: ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER", "MEDICAL_REP"],
  Project: ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER", "HR"],
};

const ENTITY_WRITE_ROLES: Record<string, UserRole[]> = {
  Customer: ["ADMIN", "BUM", "MARKETEER"],
  Product: ["ADMIN", "WAREHOUSE"],
  Invoice: ["ADMIN", "ACCOUNTANT"],
  Employee: ["ADMIN", "HR"],
  Department: ["ADMIN", "HR"],
  PurchaseOrder: ["ADMIN", "WAREHOUSE", "ACCOUNTANT"],
  SalesOrder: ["ADMIN", "BUM", "MARKETEER"],
  Supplier: ["ADMIN", "WAREHOUSE"],
  Lead: ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER", "MEDICAL_REP"],
  Opportunity: ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER"],
  Contact: ["ADMIN", "BUM", "MARKETEER", "DISTRICT_MANAGER", "MEDICAL_REP"],
  Project: ["ADMIN", "BUM", "HR"],
};

function checkReadAccess(entity: string, ctx: AuthContext): void {
  const roles = ENTITY_READ_ROLES[entity];
  if (roles && !roles.includes(ctx.role as UserRole)) {
    throw new Error(`Access denied: role '${ctx.role}' cannot read ${entity}`);
  }
}

function checkWriteAccess(entity: string, ctx: AuthContext): void {
  const roles = ENTITY_WRITE_ROLES[entity];
  if (roles && !roles.includes(ctx.role as UserRole)) {
    throw new Error(`Access denied: role '${ctx.role}' cannot write ${entity}`);
  }
}

// ─── Type definitions ─────────────────────────────────────────────────────────
// These TypeScript types match our Prisma models and define the GraphQL schema

export interface GQLCustomer {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  type: string;
  annualRevenue: number | null;
  employeeCount: number | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  contacts?: GQLContact[];
  invoices?: GQLInvoice[];
  salesOrders?: GQLSalesOrder[];
  opportunities?: GQLOpportunity[];
}

export interface GQLProduct {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  reorderLevel: number;
  unit: string;
  status: string;
  createdAt: Date;
}

export interface GQLInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  date: Date;
  dueDate: Date;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  createdAt: Date;
  // Relations
  customer?: GQLCustomer;
  items?: GQLInvoiceItem[];
}

export interface GQLInvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tax: number;
  total: number;
}

export interface GQLEmployee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  departmentId: string | null;
  position: string | null;
  hireDate: Date;
  salary: number | null;
  status: string;
  managerId: string | null;
  createdAt: Date;
  // Relations
  department?: GQLDepartment;
  manager?: GQLEmployee;
}

export interface GQLDepartment {
  id: string;
  name: string;
  managerId: string | null;
  description: string | null;
  budget: number | null;
  createdAt: Date;
  // Relations
  employees?: GQLEmployee[];
}

export interface GQLPurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  date: Date;
  expectedDate: Date | null;
  status: string;
  total: number;
  notes: string | null;
  createdById: string;
  createdAt: Date;
  // Relations
  supplier?: GQLSupplier;
}

export interface GQLSalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  date: Date;
  status: string;
  total: number;
  shippingAddress: string | null;
  notes: string | null;
  createdAt: Date;
  // Relations
  customer?: GQLCustomer;
}

export interface GQLSupplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  status: string;
  rating: number | null;
  paymentTerms: string | null;
  createdAt: Date;
  // Relations
  purchaseOrders?: GQLPurchaseOrder[];
}

export interface GQLLead {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string;
  status: string;
  score: number;
  value: number | null;
  notes: string | null;
  createdAt: Date;
  // Relations
  opportunities?: GQLOpportunity[];
}

export interface GQLOpportunity {
  id: string;
  title: string;
  accountId: string | null;
  contactId: string | null;
  leadId: string | null;
  stage: string;
  value: number;
  probability: number;
  expectedCloseDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  account?: GQLCustomer;
  contact?: GQLContact;
  lead?: GQLLead;
}

export interface GQLContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  title: string | null;
  accountId: string | null;
  createdAt: Date;
  // Relations
  account?: GQLCustomer;
}

export interface GQLProject {
  id: string;
  name: string;
  description: string | null;
  managerId: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  budget: number;
  spent: number;
  progress: number;
  createdAt: Date;
}

// ─── GraphQL SDL-like type registry ───────────────────────────────────────────

export const typeDefs = {
  Customer: {
    fields: [
      "id", "name", "industry", "website", "phone", "email", "address",
      "city", "country", "type", "annualRevenue", "employeeCount",
      "createdAt", "updatedAt",
    ],
    relations: {
      contacts: { type: "Contact", isList: true },
      invoices: { type: "Invoice", isList: true },
      salesOrders: { type: "SalesOrder", isList: true },
      opportunities: { type: "Opportunity", isList: true },
    },
  },
  Product: {
    fields: [
      "id", "sku", "name", "description", "category", "unitPrice",
      "costPrice", "quantity", "reorderLevel", "unit", "status", "createdAt",
    ],
    relations: {},
  },
  Invoice: {
    fields: [
      "id", "invoiceNumber", "customerId", "date", "dueDate", "status",
      "subtotal", "tax", "total", "notes", "createdAt",
    ],
    relations: {
      customer: { type: "Customer", isList: false },
      items: { type: "InvoiceItem", isList: true },
    },
  },
  InvoiceItem: {
    fields: [
      "id", "invoiceId", "description", "quantity", "unitPrice", "tax", "total",
    ],
    relations: {},
  },
  Employee: {
    fields: [
      "id", "employeeNumber", "firstName", "lastName", "email", "phone",
      "departmentId", "position", "hireDate", "salary", "status",
      "managerId", "createdAt",
    ],
    relations: {
      department: { type: "Department", isList: false },
      manager: { type: "Employee", isList: false },
    },
  },
  Department: {
    fields: [
      "id", "name", "managerId", "description", "budget", "createdAt",
    ],
    relations: {
      employees: { type: "Employee", isList: true },
    },
  },
  PurchaseOrder: {
    fields: [
      "id", "poNumber", "supplierId", "date", "expectedDate", "status",
      "total", "notes", "createdById", "createdAt",
    ],
    relations: {
      supplier: { type: "Supplier", isList: false },
    },
  },
  SalesOrder: {
    fields: [
      "id", "orderNumber", "customerId", "date", "status", "total",
      "shippingAddress", "notes", "createdAt",
    ],
    relations: {
      customer: { type: "Customer", isList: false },
    },
  },
  Supplier: {
    fields: [
      "id", "name", "email", "phone", "address", "city", "country",
      "status", "rating", "paymentTerms", "createdAt",
    ],
    relations: {
      purchaseOrders: { type: "PurchaseOrder", isList: true },
    },
  },
  Lead: {
    fields: [
      "id", "firstName", "lastName", "email", "phone", "company",
      "source", "status", "score", "value", "notes", "createdAt",
    ],
    relations: {
      opportunities: { type: "Opportunity", isList: true },
    },
  },
  Opportunity: {
    fields: [
      "id", "title", "accountId", "contactId", "leadId", "stage",
      "value", "probability", "expectedCloseDate", "notes",
      "createdAt", "updatedAt",
    ],
    relations: {
      account: { type: "Customer", isList: false },
      contact: { type: "Contact", isList: false },
      lead: { type: "Lead", isList: false },
    },
  },
  Contact: {
    fields: [
      "id", "firstName", "lastName", "email", "phone", "mobile",
      "title", "accountId", "createdAt",
    ],
    relations: {
      account: { type: "Customer", isList: false },
    },
  },
  Project: {
    fields: [
      "id", "name", "description", "managerId", "status", "startDate",
      "endDate", "budget", "spent", "progress", "createdAt",
    ],
    relations: {},
  },
} as const;

// ─── Prisma model name mapping ────────────────────────────────────────────────

type PrismaDelegate = {
  findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  findUnique: (args: Record<string, unknown>) => Promise<unknown | null>;
  count: (args: Record<string, unknown>) => Promise<number>;
  create: (args: Record<string, unknown>) => Promise<unknown>;
  update: (args: Record<string, unknown>) => Promise<unknown>;
  delete: (args: Record<string, unknown>) => Promise<unknown>;
};

function getDelegate(typeName: string): PrismaDelegate {
  const map: Record<string, PrismaDelegate> = {
    Customer: prisma.account as unknown as PrismaDelegate,
    Product: prisma.product as unknown as PrismaDelegate,
    Invoice: prisma.invoice as unknown as PrismaDelegate,
    InvoiceItem: prisma.invoiceItem as unknown as PrismaDelegate,
    Employee: prisma.employee as unknown as PrismaDelegate,
    Department: prisma.department as unknown as PrismaDelegate,
    PurchaseOrder: prisma.purchaseOrder as unknown as PrismaDelegate,
    SalesOrder: prisma.salesOrder as unknown as PrismaDelegate,
    Supplier: prisma.supplier as unknown as PrismaDelegate,
    Lead: prisma.lead as unknown as PrismaDelegate,
    Opportunity: prisma.opportunity as unknown as PrismaDelegate,
    Contact: prisma.contact as unknown as PrismaDelegate,
    Project: prisma.project as unknown as PrismaDelegate,
  };
  const delegate = map[typeName];
  if (!delegate) throw new Error(`Unknown type: ${typeName}`);
  return delegate;
}

// Relation field to Prisma include key mapping
// For the "Customer" type which maps to Account model, the Prisma relation names are used directly.
const RELATION_INCLUDE_MAP: Record<string, Record<string, string>> = {
  Customer: {
    contacts: "contacts",
    invoices: "invoices",
    salesOrders: "salesOrders",
    opportunities: "opportunities",
  },
  Invoice: {
    customer: "customer",
    items: "items",
  },
  Employee: {
    department: "department",
    manager: "manager",
  },
  Department: {
    employees: "employees",
  },
  PurchaseOrder: {
    supplier: "supplier",
  },
  SalesOrder: {
    customer: "customer",
  },
  Supplier: {
    purchaseOrders: "purchaseOrders",
  },
  Lead: {
    opportunities: "opportunities",
  },
  Opportunity: {
    account: "account",
    contact: "contact",
    lead: "lead",
  },
  Contact: {
    account: "account",
  },
};

// ─── Query Parser ─────────────────────────────────────────────────────────────

export interface ParsedField {
  name: string;
  alias: string | null;
  args: Record<string, unknown>;
  children: ParsedField[];
}

export interface ParsedOperation {
  type: "query" | "mutation";
  name: string | null;
  fields: ParsedField[];
  variables: Record<string, unknown>;
}

/**
 * Tokenize a GraphQL query string into an array of tokens.
 */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < input.length) {
    // Skip whitespace
    if (/\s/.test(input[i])) {
      i++;
      continue;
    }
    // Skip comments
    if (input[i] === "#") {
      while (i < input.length && input[i] !== "\n") i++;
      continue;
    }
    // Structural tokens
    if ("{},():!".includes(input[i])) {
      tokens.push(input[i]);
      i++;
      continue;
    }
    // String literal
    if (input[i] === '"') {
      let str = '"';
      i++;
      while (i < input.length && input[i] !== '"') {
        if (input[i] === "\\") {
          str += input[i];
          i++;
        }
        if (i < input.length) {
          str += input[i];
          i++;
        }
      }
      str += '"';
      i++; // closing quote
      tokens.push(str);
      continue;
    }
    // Variable reference $varName
    if (input[i] === "$") {
      let varRef = "$";
      i++;
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
        varRef += input[i];
        i++;
      }
      tokens.push(varRef);
      continue;
    }
    // Word / number / identifier
    let word = "";
    while (
      i < input.length &&
      !/[\s{},():#"!]/.test(input[i])
    ) {
      word += input[i];
      i++;
    }
    if (word) tokens.push(word);
  }
  return tokens;
}

/**
 * Parse an argument value from tokens. Handles strings, numbers, booleans,
 * null, enums, objects, arrays, and variable references.
 */
function parseValue(
  tokens: string[],
  pos: { i: number },
  variables: Record<string, unknown>,
): unknown {
  const token = tokens[pos.i];
  if (!token) return null;

  // Variable reference
  if (token.startsWith("$")) {
    pos.i++;
    const varName = token.slice(1);
    return variables[varName] ?? null;
  }

  // String
  if (token.startsWith('"')) {
    pos.i++;
    return token.slice(1, -1);
  }

  // Null
  if (token === "null") {
    pos.i++;
    return null;
  }

  // Boolean
  if (token === "true") {
    pos.i++;
    return true;
  }
  if (token === "false") {
    pos.i++;
    return false;
  }

  // Array
  if (token === "[") {
    pos.i++; // skip [
    const arr: unknown[] = [];
    while (pos.i < tokens.length && tokens[pos.i] !== "]") {
      if (tokens[pos.i] === ",") {
        pos.i++;
        continue;
      }
      arr.push(parseValue(tokens, pos, variables));
    }
    if (tokens[pos.i] === "]") pos.i++;
    return arr;
  }

  // Object
  if (token === "{") {
    pos.i++; // skip {
    const obj: Record<string, unknown> = {};
    while (pos.i < tokens.length && tokens[pos.i] !== "}") {
      if (tokens[pos.i] === ",") {
        pos.i++;
        continue;
      }
      const key = tokens[pos.i];
      pos.i++; // key
      if (tokens[pos.i] === ":") pos.i++; // colon
      obj[key] = parseValue(tokens, pos, variables);
    }
    if (tokens[pos.i] === "}") pos.i++;
    return obj;
  }

  // Number
  const num = Number(token);
  if (!isNaN(num)) {
    pos.i++;
    return num;
  }

  // Enum / identifier
  pos.i++;
  return token;
}

/**
 * Parse arguments: (key: value, key: value)
 */
function parseArgs(
  tokens: string[],
  pos: { i: number },
  variables: Record<string, unknown>,
): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  if (tokens[pos.i] !== "(") return args;
  pos.i++; // skip (

  while (pos.i < tokens.length && tokens[pos.i] !== ")") {
    if (tokens[pos.i] === ",") {
      pos.i++;
      continue;
    }
    const key = tokens[pos.i];
    pos.i++; // key name
    if (tokens[pos.i] === ":") pos.i++; // colon
    args[key] = parseValue(tokens, pos, variables);
  }
  if (tokens[pos.i] === ")") pos.i++; // skip )
  return args;
}

/**
 * Parse a selection set: { field1 field2(args) { subfield } }
 */
function parseSelectionSet(
  tokens: string[],
  pos: { i: number },
  variables: Record<string, unknown>,
): ParsedField[] {
  const fields: ParsedField[] = [];
  if (tokens[pos.i] !== "{") return fields;
  pos.i++; // skip {

  while (pos.i < tokens.length && tokens[pos.i] !== "}") {
    if (tokens[pos.i] === ",") {
      pos.i++;
      continue;
    }

    let name = tokens[pos.i];
    pos.i++;
    let alias: string | null = null;

    // Check for alias: `aliasName: fieldName`
    if (tokens[pos.i] === ":") {
      alias = name;
      pos.i++; // skip :
      name = tokens[pos.i];
      pos.i++;
    }

    const args = parseArgs(tokens, pos, variables);
    const children =
      tokens[pos.i] === "{"
        ? parseSelectionSet(tokens, pos, variables)
        : [];

    fields.push({ name, alias, args, children });
  }
  if (tokens[pos.i] === "}") pos.i++; // skip }
  return fields;
}

/**
 * Parse a complete GraphQL document (query or mutation).
 */
export function parseGraphQL(
  query: string,
  variables: Record<string, unknown> = {},
): ParsedOperation {
  const tokens = tokenize(query);
  const pos = { i: 0 };

  let type: "query" | "mutation" = "query";
  let name: string | null = null;

  // Check for operation keyword
  if (tokens[pos.i] === "query" || tokens[pos.i] === "mutation") {
    type = tokens[pos.i] as "query" | "mutation";
    pos.i++;

    // Optional operation name
    if (
      pos.i < tokens.length &&
      tokens[pos.i] !== "{" &&
      tokens[pos.i] !== "("
    ) {
      name = tokens[pos.i];
      pos.i++;
    }

    // Skip variable definitions ($var: Type, ...)
    if (tokens[pos.i] === "(") {
      let depth = 1;
      pos.i++;
      while (pos.i < tokens.length && depth > 0) {
        if (tokens[pos.i] === "(") depth++;
        if (tokens[pos.i] === ")") depth--;
        pos.i++;
      }
    }
  }

  const fields = parseSelectionSet(tokens, pos, variables);

  return { type, name, fields, variables };
}

// ─── Resolvers ────────────────────────────────────────────────────────────────

interface ListArgs {
  where?: Record<string, unknown>;
  orderBy?: Record<string, string>;
  skip?: number;
  take?: number;
  id?: string;
  search?: string;
}

/**
 * Build Prisma `where` from GraphQL arguments. Supports flat equality
 * and basic operators (_contains, _startsWith, _gt, _lt, _gte, _lte).
 */
function buildWhere(
  where: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!where) return {};
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(where)) {
    if (key.endsWith("_contains") && typeof value === "string") {
      result[key.replace("_contains", "")] = { contains: value, mode: "insensitive" };
    } else if (key.endsWith("_startsWith") && typeof value === "string") {
      result[key.replace("_startsWith", "")] = { startsWith: value, mode: "insensitive" };
    } else if (key.endsWith("_gt")) {
      result[key.replace("_gt", "")] = { gt: value };
    } else if (key.endsWith("_lt")) {
      result[key.replace("_lt", "")] = { lt: value };
    } else if (key.endsWith("_gte")) {
      result[key.replace("_gte", "")] = { gte: value };
    } else if (key.endsWith("_lte")) {
      result[key.replace("_lte", "")] = { lte: value };
    } else if (key.endsWith("_in") && Array.isArray(value)) {
      result[key.replace("_in", "")] = { in: value };
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Build the Prisma `include` clause from requested child fields,
 * resolving one level of nested relations.
 */
function buildInclude(
  typeName: string,
  children: ParsedField[],
): Record<string, boolean> | undefined {
  const typeRelations = RELATION_INCLUDE_MAP[typeName];
  if (!typeRelations) return undefined;

  const include: Record<string, boolean> = {};
  let hasIncludes = false;

  for (const child of children) {
    const prismaRelation = typeRelations[child.name];
    if (prismaRelation) {
      include[prismaRelation] = true;
      hasIncludes = true;
    }
  }

  return hasIncludes ? include : undefined;
}

/**
 * Pick only the requested fields from a result object.
 */
function pickFields(
  obj: Record<string, unknown>,
  fields: ParsedField[],
  typeName: string,
): Record<string, unknown> {
  if (fields.length === 0) return obj;

  const typeDef = typeDefs[typeName as keyof typeof typeDefs];
  const result: Record<string, unknown> = {};

  for (const field of fields) {
    const outputKey = field.alias || field.name;

    // Check if it's a scalar field
    if (typeDef && (typeDef.fields as readonly string[]).includes(field.name)) {
      result[outputKey] = obj[field.name] ?? null;
      continue;
    }

    // Check if it's a relation
    const relations = typeDef?.relations as
      | Record<string, { type: string; isList: boolean }>
      | undefined;
    if (relations && field.name in relations) {
      const relDef = relations[field.name];
      const relValue = obj[field.name];

      if (relValue === null || relValue === undefined) {
        result[outputKey] = null;
      } else if (Array.isArray(relValue)) {
        result[outputKey] = relValue.map((item) =>
          field.children.length > 0
            ? pickFields(item as Record<string, unknown>, field.children, relDef.type)
            : item,
        );
      } else {
        result[outputKey] =
          field.children.length > 0
            ? pickFields(relValue as Record<string, unknown>, field.children, relDef.type)
            : relValue;
      }
      continue;
    }

    // __typename
    if (field.name === "__typename") {
      result[outputKey] = typeName;
      continue;
    }

    // Pass through unknown fields
    result[outputKey] = obj[field.name] ?? null;
  }

  return result;
}

// Maps query root field names to GQL type names
const QUERY_TYPE_MAP: Record<string, string> = {
  customers: "Customer",
  customer: "Customer",
  products: "Product",
  product: "Product",
  invoices: "Invoice",
  invoice: "Invoice",
  employees: "Employee",
  employee: "Employee",
  departments: "Department",
  department: "Department",
  purchaseOrders: "PurchaseOrder",
  purchaseOrder: "PurchaseOrder",
  salesOrders: "SalesOrder",
  salesOrder: "SalesOrder",
  suppliers: "Supplier",
  supplier: "Supplier",
  leads: "Lead",
  lead: "Lead",
  opportunities: "Opportunity",
  opportunity: "Opportunity",
  contacts: "Contact",
  contact: "Contact",
  projects: "Project",
  project: "Project",
};

// Plural query names -> list queries
const LIST_QUERIES = new Set([
  "customers",
  "products",
  "invoices",
  "employees",
  "departments",
  "purchaseOrders",
  "salesOrders",
  "suppliers",
  "leads",
  "opportunities",
  "contacts",
  "projects",
]);

// Singular query names -> get-by-ID queries
const SINGULAR_QUERIES = new Set([
  "customer",
  "product",
  "invoice",
  "employee",
  "department",
  "purchaseOrder",
  "salesOrder",
  "supplier",
  "lead",
  "opportunity",
  "contact",
  "project",
]);

// Mutation prefixes
const MUTATION_TYPE_MAP: Record<string, { action: string; typeName: string }> = {
  createCustomer: { action: "create", typeName: "Customer" },
  updateCustomer: { action: "update", typeName: "Customer" },
  deleteCustomer: { action: "delete", typeName: "Customer" },
  createProduct: { action: "create", typeName: "Product" },
  updateProduct: { action: "update", typeName: "Product" },
  deleteProduct: { action: "delete", typeName: "Product" },
  createInvoice: { action: "create", typeName: "Invoice" },
  updateInvoice: { action: "update", typeName: "Invoice" },
  deleteInvoice: { action: "delete", typeName: "Invoice" },
  createEmployee: { action: "create", typeName: "Employee" },
  updateEmployee: { action: "update", typeName: "Employee" },
  deleteEmployee: { action: "delete", typeName: "Employee" },
  createDepartment: { action: "create", typeName: "Department" },
  updateDepartment: { action: "update", typeName: "Department" },
  deleteDepartment: { action: "delete", typeName: "Department" },
  createPurchaseOrder: { action: "create", typeName: "PurchaseOrder" },
  updatePurchaseOrder: { action: "update", typeName: "PurchaseOrder" },
  deletePurchaseOrder: { action: "delete", typeName: "PurchaseOrder" },
  createSalesOrder: { action: "create", typeName: "SalesOrder" },
  updateSalesOrder: { action: "update", typeName: "SalesOrder" },
  deleteSalesOrder: { action: "delete", typeName: "SalesOrder" },
  createSupplier: { action: "create", typeName: "Supplier" },
  updateSupplier: { action: "update", typeName: "Supplier" },
  deleteSupplier: { action: "delete", typeName: "Supplier" },
  createLead: { action: "create", typeName: "Lead" },
  updateLead: { action: "update", typeName: "Lead" },
  deleteLead: { action: "delete", typeName: "Lead" },
  createOpportunity: { action: "create", typeName: "Opportunity" },
  updateOpportunity: { action: "update", typeName: "Opportunity" },
  deleteOpportunity: { action: "delete", typeName: "Opportunity" },
  createContact: { action: "create", typeName: "Contact" },
  updateContact: { action: "update", typeName: "Contact" },
  deleteContact: { action: "delete", typeName: "Contact" },
  createProject: { action: "create", typeName: "Project" },
  updateProject: { action: "update", typeName: "Project" },
  deleteProject: { action: "delete", typeName: "Project" },
};

// ─── Resolver Execution ───────────────────────────────────────────────────────

async function resolveQuery(
  field: ParsedField,
  ctx: AuthContext,
): Promise<unknown> {
  // Special: search query
  if (field.name === "search") {
    const args = field.args as {
      query?: string;
      entities?: string[];
      limit?: number;
      highlight?: boolean;
    };
    if (!args.query) throw new Error("search requires a 'query' argument");
    const result = await search(args.query as string, {
      entities: args.entities as string[] | undefined,
      limit: (args.limit as number) ?? 20,
      highlight: (args.highlight as boolean) ?? false,
    });
    return result;
  }

  const typeName = QUERY_TYPE_MAP[field.name];
  if (!typeName) throw new Error(`Unknown query field: ${field.name}`);

  checkReadAccess(typeName, ctx);
  const delegate = getDelegate(typeName);
  const include = buildInclude(typeName, field.children);

  // List query
  if (LIST_QUERIES.has(field.name)) {
    const args = field.args as ListArgs;
    const where = buildWhere(args.where as Record<string, unknown> | undefined);
    const orderBy = args.orderBy ?? { createdAt: "desc" };
    const skip = args.skip ?? 0;
    const take = Math.min(args.take ?? 20, 100);

    const findArgs: Record<string, unknown> = {
      where,
      orderBy,
      skip,
      take,
    };
    if (include) findArgs.include = include;

    const items = await delegate.findMany(findArgs);
    return (items as Record<string, unknown>[]).map((item) =>
      pickFields(item, field.children, typeName),
    );
  }

  // Singular query (by ID)
  if (SINGULAR_QUERIES.has(field.name)) {
    const args = field.args as ListArgs;
    if (!args.id) throw new Error(`${field.name} requires an 'id' argument`);

    const findArgs: Record<string, unknown> = {
      where: { id: args.id },
    };
    if (include) findArgs.include = include;

    const item = await delegate.findUnique(findArgs);
    if (!item) return null;
    return pickFields(item as Record<string, unknown>, field.children, typeName);
  }

  throw new Error(`Unknown query: ${field.name}`);
}

async function resolveMutation(
  field: ParsedField,
  ctx: AuthContext,
): Promise<unknown> {
  const mutDef = MUTATION_TYPE_MAP[field.name];
  if (!mutDef) throw new Error(`Unknown mutation: ${field.name}`);

  const { action, typeName } = mutDef;
  checkWriteAccess(typeName, ctx);
  const delegate = getDelegate(typeName);
  const include = buildInclude(typeName, field.children);

  if (action === "create") {
    const input = (field.args.input as Record<string, unknown>) || field.args;
    // Remove "input" key if it wraps the actual data
    const data = input.input ? input.input : input;

    const createArgs: Record<string, unknown> = {
      data,
    };
    if (include) createArgs.include = include;

    const item = await delegate.create(createArgs);
    return pickFields(item as Record<string, unknown>, field.children, typeName);
  }

  if (action === "update") {
    const id = field.args.id as string;
    if (!id) throw new Error(`${field.name} requires an 'id' argument`);
    const input = (field.args.input as Record<string, unknown>) || {};
    // Remove id and input wrapper
    const data = { ...input };
    delete (data as Record<string, unknown>).id;

    const updateArgs: Record<string, unknown> = {
      where: { id },
      data,
    };
    if (include) updateArgs.include = include;

    const item = await delegate.update(updateArgs);
    return pickFields(item as Record<string, unknown>, field.children, typeName);
  }

  if (action === "delete") {
    const id = field.args.id as string;
    if (!id) throw new Error(`${field.name} requires an 'id' argument`);
    const item = await delegate.delete({ where: { id } });
    return pickFields(item as Record<string, unknown>, field.children, typeName);
  }

  throw new Error(`Unknown action: ${action}`);
}

// ─── Main Executor ────────────────────────────────────────────────────────────

export interface GraphQLResult {
  data: Record<string, unknown> | null;
  errors?: { message: string; path?: string[] }[];
}

export async function executeGraphQL(
  queryString: string,
  variables: Record<string, unknown> = {},
  ctx: AuthContext = { role: "ADMIN", userId: "system" },
): Promise<GraphQLResult> {
  let parsed: ParsedOperation;
  try {
    parsed = parseGraphQL(queryString, variables);
  } catch (e) {
    return {
      data: null,
      errors: [
        {
          message: `Parse error: ${e instanceof Error ? e.message : String(e)}`,
        },
      ],
    };
  }

  const data: Record<string, unknown> = {};
  const errors: { message: string; path?: string[] }[] = [];

  for (const field of parsed.fields) {
    const outputKey = field.alias || field.name;
    try {
      if (parsed.type === "mutation") {
        data[outputKey] = await resolveMutation(field, ctx);
      } else {
        data[outputKey] = await resolveQuery(field, ctx);
      }
    } catch (e) {
      errors.push({
        message: e instanceof Error ? e.message : String(e),
        path: [outputKey],
      });
      data[outputKey] = null;
    }
  }

  return errors.length > 0 ? { data, errors } : { data };
}

/**
 * Return the introspection schema summary.
 * Provides a simple type list for clients to discover the schema.
 */
export function getSchemaInfo(): Record<string, unknown> {
  const types: Record<string, unknown> = {};

  for (const [name, def] of Object.entries(typeDefs)) {
    const relations = def.relations as Record<
      string,
      { type: string; isList: boolean }
    >;
    types[name] = {
      fields: [...def.fields],
      relations: Object.fromEntries(
        Object.entries(relations).map(([k, v]) => [
          k,
          { type: v.type, isList: v.isList },
        ]),
      ),
    };
  }

  const queries = [
    ...Array.from(LIST_QUERIES).map((q) => ({
      name: q,
      type: QUERY_TYPE_MAP[q],
      isList: true,
      args: ["where", "orderBy", "skip", "take"],
    })),
    ...Array.from(SINGULAR_QUERIES).map((q) => ({
      name: q,
      type: QUERY_TYPE_MAP[q],
      isList: false,
      args: ["id"],
    })),
    {
      name: "search",
      type: "SearchResult",
      isList: false,
      args: ["query", "entities", "limit", "highlight"],
    },
  ];

  const mutations = Object.entries(MUTATION_TYPE_MAP).map(
    ([name, { action, typeName }]) => ({
      name,
      action,
      type: typeName,
      args: action === "delete" ? ["id"] : action === "update" ? ["id", "input"] : ["input"],
    }),
  );

  return { types, queries, mutations };
}
