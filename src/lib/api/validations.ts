import { z } from "zod";

// ─── Helper ─────────────────────────────────────────────────────────────────

export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  const messages = result.error.issues
    .map((e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`)
    .join(", ");
  return { success: false, error: messages };
}

// ─── Products ───────────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  unitPrice: z.coerce.number().min(0).default(0),
  costPrice: z.coerce.number().min(0).default(0),
  quantity: z.coerce.number().int().min(0).default(0),
  reorderLevel: z.coerce.number().int().min(0).default(10),
  unit: z.string().default("pcs"),
  status: z
    .enum(["ACTIVE", "INACTIVE", "DISCONTINUED"])
    .default("ACTIVE"),
});
export const updateProductSchema = createProductSchema.partial();

// ─── Invoices ───────────────────────────────────────────────────────────────

const invoiceItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().min(0),
  unitPrice: z.coerce.number().min(0),
  tax: z.coerce.number().min(0).default(0),
  total: z.coerce.number().min(0),
});

export const createInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  customerId: z.string().min(1, "Customer ID is required"),
  date: z.string().min(1, "Date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  status: z
    .enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED", "VOID"])
    .default("DRAFT"),
  subtotal: z.coerce.number().min(0, "Subtotal is required"),
  tax: z.coerce.number().min(0).default(0),
  total: z.coerce.number().min(0, "Total is required"),
  notes: z.string().optional().nullable(),
  items: z.array(invoiceItemSchema).optional(),
});
export const updateInvoiceSchema = createInvoiceSchema.partial();

// ─── Payments ───────────────────────────────────────────────────────────────

export const createPaymentSchema = z.object({
  type: z.enum(["INCOMING", "OUTGOING"]),
  amount: z.coerce.number().min(0, "Amount must be >= 0"),
  date: z.string().min(1, "Date is required"),
  method: z
    .enum(["BANK_TRANSFER", "CASH", "CHECK", "CREDIT_CARD"])
    .optional()
    .nullable(),
  reference: z.string().optional().nullable(),
  invoiceId: z.string().optional().nullable(),
  billId: z.string().optional().nullable(),
});
export const updatePaymentSchema = createPaymentSchema.partial();

// ─── GL Accounts ────────────────────────────────────────────────────────────

export const createGlAccountSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
  balance: z.coerce.number().default(0),
  parentId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});
export const updateGlAccountSchema = createGlAccountSchema.partial();

// ─── Journal Entries ────────────────────────────────────────────────────────

const journalLineSchema = z.object({
  accountId: z.string().min(1),
  debit: z.coerce.number().min(0).default(0),
  credit: z.coerce.number().min(0).default(0),
  description: z.string().optional().nullable(),
}).refine(
  (line) => (line.debit > 0 && line.credit === 0) || (line.credit > 0 && line.debit === 0),
  { message: "Each line must have either a debit or credit amount, not both" }
);

export const createJournalEntrySchema = z.object({
  entryNumber: z.string().min(1, "Entry number is required"),
  date: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
  createdById: z.string().min(1, "Created by ID is required"),
  reference: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "POSTED", "VOID"]).default("DRAFT"),
  lines: z.array(journalLineSchema).optional(),
}).refine(
  (je) => {
    if (!je.lines || je.lines.length === 0) return true;
    const totalDebit = je.lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = je.lines.reduce((s, l) => s + l.credit, 0);
    return Math.abs(totalDebit - totalCredit) < 0.01;
  },
  { message: "Journal entry is unbalanced: total debits must equal total credits" }
);
export const updateJournalEntrySchema = createJournalEntrySchema.partial();

// ─── Employees ──────────────────────────────────────────────────────────────

export const createEmployeeSchema = z.object({
  employeeNumber: z.string().min(1, "Employee number is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  hireDate: z.string().min(1, "Hire date is required"),
  salary: z.coerce.number().min(0).optional().nullable(),
  status: z
    .enum(["ACTIVE", "ON_LEAVE", "TERMINATED"])
    .default("ACTIVE"),
  managerId: z.string().optional().nullable(),
});
export const updateEmployeeSchema = createEmployeeSchema.partial();

// ─── Departments ────────────────────────────────────────────────────────────

export const createDepartmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  managerId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  budget: z.coerce.number().min(0).optional().nullable(),
});
export const updateDepartmentSchema = createDepartmentSchema.partial();

// ─── Purchase Orders ────────────────────────────────────────────────────────

const purchaseOrderItemSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().min(1),
  quantity: z.coerce.number().min(0),
  unitPrice: z.coerce.number().min(0),
  total: z.coerce.number().min(0),
});

export const createPurchaseOrderSchema = z.object({
  poNumber: z.string().min(1, "PO number is required"),
  supplierId: z.string().min(1, "Supplier ID is required"),
  date: z.string().min(1, "Date is required"),
  total: z.coerce.number().min(0, "Total is required"),
  createdById: z.string().min(1, "Created by ID is required"),
  expectedDate: z.string().optional().nullable(),
  status: z
    .enum(["DRAFT", "SENT", "APPROVED", "RECEIVED", "CANCELLED"])
    .default("DRAFT"),
  notes: z.string().optional().nullable(),
  items: z.array(purchaseOrderItemSchema).optional(),
});
export const updatePurchaseOrderSchema = createPurchaseOrderSchema.partial();

// ─── Sales Orders ───────────────────────────────────────────────────────────

const salesOrderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().min(0),
  total: z.coerce.number().min(0),
});

export const createSalesOrderSchema = z.object({
  orderNumber: z.string().min(1, "Order number is required"),
  customerId: z.string().min(1, "Customer ID is required"),
  date: z.string().min(1, "Date is required"),
  total: z.coerce.number().min(0, "Total is required"),
  status: z
    .enum(["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"])
    .default("PENDING"),
  shippingAddress: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(salesOrderItemSchema).optional(),
});
export const updateSalesOrderSchema = createSalesOrderSchema.partial();

// ─── Candidates ─────────────────────────────────────────────────────────────

export const createCandidateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional().nullable(),
  linkedIn: z.string().optional().nullable(),
  resumeUrl: z.string().optional().nullable(),
  source: z
    .enum(["WEBSITE", "LINKEDIN", "REFERRAL", "JOB_BOARD", "AGENCY"])
    .default("WEBSITE"),
  status: z
    .enum([
      "NEW",
      "SCREENING",
      "INTERVIEW",
      "SHORTLISTED",
      "OFFER",
      "HIRED",
      "REJECTED",
    ])
    .default("NEW"),
  currentCompany: z.string().optional().nullable(),
  currentTitle: z.string().optional().nullable(),
  expectedSalary: z.coerce.number().min(0).optional().nullable(),
  rating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  notes: z.string().optional().nullable(),
});
export const updateCandidateSchema = createCandidateSchema.partial();

// ─── Jobs ───────────────────────────────────────────────────────────────────

export const createJobSchema = z.object({
  title: z.string().min(1, "Title is required"),
  departmentId: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  type: z
    .enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN", "REMOTE"])
    .default("FULL_TIME"),
  status: z.enum(["DRAFT", "OPEN", "CLOSED", "ON_HOLD"]).default("DRAFT"),
  description: z.string().optional().nullable(),
  requirements: z.string().optional().nullable(),
  salaryMin: z.coerce.number().min(0).optional().nullable(),
  salaryMax: z.coerce.number().min(0).optional().nullable(),
  benefits: z.string().optional().nullable(),
  postedDate: z.string().optional().nullable(),
  closingDate: z.string().optional().nullable(),
  hiringManagerId: z.string().optional().nullable(),
});
export const updateJobSchema = createJobSchema.partial();

// ─── Applications ───────────────────────────────────────────────────────────

export const createApplicationSchema = z.object({
  candidateId: z.string().min(1, "Candidate ID is required"),
  jobId: z.string().min(1, "Job ID is required"),
  status: z
    .enum([
      "APPLIED",
      "SCREENING",
      "INTERVIEW",
      "SHORTLISTED",
      "OFFER",
      "HIRED",
      "REJECTED",
    ])
    .default("APPLIED"),
  appliedDate: z.string().optional(),
  coverLetter: z.string().optional().nullable(),
  score: z.coerce.number().int().min(0).max(100).optional().nullable(),
});
export const updateApplicationSchema = createApplicationSchema.partial();

// ─── Leads ──────────────────────────────────────────────────────────────────

export const createLeadSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  source: z
    .enum(["WEB", "REFERRAL", "EVENT", "ADS", "SOCIAL"])
    .default("WEB"),
  status: z
    .enum(["NEW", "CONTACTED", "QUALIFIED", "UNQUALIFIED", "CONVERTED"])
    .default("NEW"),
  assignedToId: z.string().optional().nullable(),
  score: z.coerce.number().int().min(0).default(0),
  value: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
});
export const updateLeadSchema = createLeadSchema.partial();

// ─── Opportunities ──────────────────────────────────────────────────────────

export const createOpportunitySchema = z.object({
  title: z.string().min(1, "Title is required"),
  accountId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  stage: z
    .enum([
      "PROSPECTING",
      "QUALIFICATION",
      "PROPOSAL",
      "NEGOTIATION",
      "CLOSED_WON",
      "CLOSED_LOST",
    ])
    .default("PROSPECTING"),
  value: z.coerce.number().min(0).default(0),
  probability: z.coerce.number().int().min(0).max(100).default(50),
  expectedCloseDate: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export const updateOpportunitySchema = createOpportunitySchema.partial();

// ─── Accounts ───────────────────────────────────────────────────────────────

export const createAccountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  industry: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  type: z
    .enum(["PROSPECT", "CUSTOMER", "PARTNER", "VENDOR"])
    .default("PROSPECT"),
  annualRevenue: z.coerce.number().min(0).optional().nullable(),
  employeeCount: z.coerce.number().int().min(0).optional().nullable(),
  ownerId: z.string().optional().nullable(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
});
export const updateAccountSchema = createAccountSchema.partial();

// ─── Contacts ───────────────────────────────────────────────────────────────

export const createContactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  doNotCall: z.boolean().default(false),
  doNotEmail: z.boolean().default(false),
});
export const updateContactSchema = createContactSchema.partial();

// ─── Campaigns ──────────────────────────────────────────────────────────────

export const createCampaignSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["EVENT", "CONTENT", "WEBINAR", "ADS", "EMAIL"]),
  status: z
    .enum(["DRAFT", "SCHEDULED", "ACTIVE", "COMPLETED", "CANCELLED"])
    .default("DRAFT"),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  budget: z.coerce.number().min(0).default(0),
  spent: z.coerce.number().min(0).default(0),
  expectedRevenue: z.coerce.number().min(0).default(0),
  actualRevenue: z.coerce.number().min(0).default(0),
  leads: z.coerce.number().int().min(0).default(0),
  conversions: z.coerce.number().int().min(0).default(0),
  ownerId: z.string().optional().nullable(),
});
export const updateCampaignSchema = createCampaignSchema.partial();

// ─── Tickets ────────────────────────────────────────────────────────────────

export const createTicketSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  description: z.string().min(1, "Description is required"),
  ticketNumber: z.string().optional(),
  accountId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  status: z
    .enum(["OPEN", "IN_PROGRESS", "WAITING", "ESCALATED", "RESOLVED", "CLOSED"])
    .default("OPEN"),
  priority: z
    .enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
    .default("MEDIUM"),
  assignedToId: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  slaDeadline: z.string().optional().nullable(),
});
export const updateTicketSchema = createTicketSchema.partial();

// ─── Territories ────────────────────────────────────────────────────────────

export const createTerritorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  boundaries: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
});
export const updateTerritorySchema = createTerritorySchema.partial();

// ─── Business Units ─────────────────────────────────────────────────────────

const businessUnitMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.string().default("MEDICAL_REP"),
});

const businessUnitProductSchema = z.object({
  productId: z.string().min(1),
});

export const createBusinessUnitSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  managerId: z.string().min(1, "Manager ID is required"),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  members: z.array(businessUnitMemberSchema).optional(),
  products: z.array(businessUnitProductSchema).optional(),
});
export const updateBusinessUnitSchema = createBusinessUnitSchema.partial();

// ─── Suppliers ──────────────────────────────────────────────────────────────

export const createSupplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  rating: z.coerce.number().min(0).max(5).optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
});
export const updateSupplierSchema = createSupplierSchema.partial();

// ─── Customers ──────────────────────────────────────────────────────────────

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  industry: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  type: z
    .enum(["CUSTOMER", "PROSPECT", "PARTNER", "VENDOR"])
    .default("CUSTOMER"),
  annualRevenue: z.coerce.number().min(0).optional().nullable(),
  employeeCount: z.coerce.number().int().min(0).optional().nullable(),
  ownerId: z.string().optional().nullable(),
});
export const updateCustomerSchema = createCustomerSchema.partial();

// ─── Warehouses ─────────────────────────────────────────────────────────────

export const createWarehouseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  location: z.string().optional().nullable(),
  capacity: z.coerce.number().int().min(0).optional().nullable(),
  managerId: z.string().optional().nullable(),
});
export const updateWarehouseSchema = createWarehouseSchema.partial();

// ─── Stock Movements ────────────────────────────────────────────────────────

export const createStockMovementSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  type: z.enum(["IN", "OUT", "TRANSFER", "ADJUSTMENT"]),
  quantity: z.coerce.number().int({ message: "Quantity must be an integer" }),
  date: z.string().min(1, "Date is required"),
  createdById: z.string().min(1, "Created by ID is required"),
  warehouseId: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export const updateStockMovementSchema = createStockMovementSchema.partial();

// ─── Training ───────────────────────────────────────────────────────────────

export const createTrainingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  duration: z.string().optional().nullable(),
  format: z
    .enum(["ONLINE", "CLASSROOM", "HYBRID"])
    .default("ONLINE"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  materials: z.string().optional().nullable(),
});
export const updateTrainingSchema = createTrainingSchema.partial();

// ─── Approval Logs ──────────────────────────────────────────────────────────

export const createApprovalLogSchema = z.object({
  entityType: z.string().min(1, "Entity type is required"),
  entityId: z.string().min(1, "Entity ID is required"),
  action: z.string().min(1, "Action is required"),
  fromStatus: z.string().min(1, "From status is required"),
  toStatus: z.string().min(1, "To status is required"),
  performedById: z.string().min(1, "Performed by ID is required"),
  comment: z.string().optional().nullable(),
  level: z.coerce.number().int().min(1).default(1),
  businessUnitId: z.string().optional().nullable(),
});
export const updateApprovalLogSchema = createApprovalLogSchema.partial();
