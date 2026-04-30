// ============================================================
// Egyptian Tax Authority (ETA) E-Invoicing Client
// ============================================================
// Simulated ETA API integration for development.
// In production, replace simulation helpers with real HTTP calls
// to the ETA e-invoicing portal (https://invoicing.eta.gov.eg).
// ============================================================

// ─── Types ───────────────────────────────────────────────────

export interface ETAInvoiceLine {
  description: string;
  itemType: string;
  itemCode: string;
  unitType: string;
  quantity: number;
  unitValue: number;
  salesTotal: number;
  discount: number;
  netTotal: number;
  taxableItems: {
    taxType: string;
    subType: string;
    rate: number;
    amount: number;
  }[];
  total: number;
}

export interface ETAInvoice {
  id: string;
  internalId: string;
  issuerName: string;
  issuerTaxId: string;
  receiverName: string;
  receiverTaxId: string;
  dateTimeIssued: string;
  invoiceLines: ETAInvoiceLine[];
  totalSalesAmount: number;
  totalDiscountAmount: number;
  netAmount: number;
  taxTotals: { taxType: string; amount: number }[];
  totalAmount: number;
  status: "draft" | "submitted" | "accepted" | "rejected" | "cancelled";
  uuid?: string;
  submissionId?: string;
  longId?: string;
}

export interface ETACredentials {
  clientId: string;
  clientSecret: string;
  environment: "production" | "sandbox";
  taxId: string;
  companyName: string;
  branchId: string;
  activityCode: string;
}

export interface ETASubmissionResult {
  success: boolean;
  uuid?: string;
  submissionId?: string;
  longId?: string;
  error?: string;
  rejectionReason?: string;
}

export interface ETAStatusResult {
  uuid: string;
  status: "submitted" | "accepted" | "rejected" | "cancelled";
  statusReason?: string;
  dateReceived?: string;
}

export interface ETADocumentFilter {
  dateFrom: string;
  dateTo: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

// ─── Constants ───────────────────────────────────────────────

export const ETA_TAX_TYPES = [
  { code: "T1", name: "Value Added Tax (VAT)", nameAr: "ضريبة القيمة المضافة" },
  { code: "T2", name: "Table Tax (percentage)", nameAr: "ضريبة الجدول (نسبية)" },
  { code: "T3", name: "Table Tax (fixed)", nameAr: "ضريبة الجدول (نوعية)" },
  { code: "T4", name: "Withholding Tax (WHT)", nameAr: "ضريبة الخصم والتحصيل" },
  { code: "T5", name: "Stamp Duty", nameAr: "ضريبة الدمغة" },
  { code: "T6", name: "Entertainment Tax", nameAr: "ضريبة الملاهى" },
  { code: "T7", name: "Resource Development Fee", nameAr: "رسم تنمية الموارد" },
  { code: "T8", name: "Service Charges", nameAr: "رسم خدمة" },
  { code: "T9", name: "Municipality Fee", nameAr: "رسم المحليات" },
  { code: "T10", name: "Medical Insurance Fee", nameAr: "رسم التأمين الصحى" },
  { code: "T11", name: "Other Fees", nameAr: "رسوم أخرى" },
  { code: "T12", name: "Stamping Tax (percentage)", nameAr: "ضريبة الدمغة (نسبية)" },
] as const;

export const ETA_TAX_SUBTYPES: Record<string, { code: string; name: string; nameAr: string; rate?: number }[]> = {
  T1: [
    { code: "V001", name: "Export", nameAr: "تصدير", rate: 0 },
    { code: "V002", name: "Exempt Items", nameAr: "معفاة", rate: 0 },
    { code: "V003", name: "Zero-rated goods", nameAr: "صفر", rate: 0 },
    { code: "V004", name: "Taxable goods (14%)", nameAr: "سلع خاضعة 14%", rate: 14 },
    { code: "V005", name: "Taxable goods (5%)", nameAr: "سلع خاضعة 5%", rate: 5 },
    { code: "V006", name: "Taxable goods (12%)", nameAr: "سلع خاضعة 12%", rate: 12 },
  ],
  T2: [
    { code: "Tbl01", name: "Table tax 1%", nameAr: "جدول 1%", rate: 1 },
    { code: "Tbl02", name: "Table tax 5%", nameAr: "جدول 5%", rate: 5 },
    { code: "Tbl03", name: "Table tax 10%", nameAr: "جدول 10%", rate: 10 },
  ],
  T4: [
    { code: "W001", name: "Contracting 1%", nameAr: "مقاولات 1%", rate: 1 },
    { code: "W002", name: "Supplies 1.5%", nameAr: "توريدات 1.5%", rate: 1.5 },
    { code: "W003", name: "Purchases 1%", nameAr: "مشتريات 1%", rate: 1 },
    { code: "W004", name: "Services 3%", nameAr: "خدمات 3%", rate: 3 },
    { code: "W005", name: "Commission 5%", nameAr: "عمولة 5%", rate: 5 },
  ],
};

export const ETA_UNIT_TYPES = [
  { code: "EA", name: "Each / Unit" },
  { code: "KGM", name: "Kilogram" },
  { code: "LTR", name: "Litre" },
  { code: "MTR", name: "Metre" },
  { code: "CS", name: "Case" },
  { code: "BX", name: "Box" },
  { code: "PK", name: "Pack" },
  { code: "BT", name: "Bottle" },
  { code: "TB", name: "Tube" },
  { code: "ST", name: "Strip" },
] as const;

const STORAGE_KEY = "pharma.einvoices";
const SETTINGS_KEY = "pharma.eta_settings";

// ─── Tax Calculation Helpers ─────────────────────────────────

/** Calculate VAT (14% standard Egyptian rate) */
export function calculateVAT(netAmount: number, rate: number = 14): number {
  return round2(netAmount * (rate / 100));
}

/** Calculate Withholding Tax */
export function calculateWHT(netAmount: number, rate: number = 1): number {
  return round2(netAmount * (rate / 100));
}

/** Calculate Table Tax (percentage) */
export function calculateTableTax(netAmount: number, rate: number): number {
  return round2(netAmount * (rate / 100));
}

/** Build a taxableItem entry for an invoice line */
export function buildTaxableItem(
  taxType: string,
  subType: string,
  rate: number,
  netAmount: number
): { taxType: string; subType: string; rate: number; amount: number } {
  return {
    taxType,
    subType,
    rate,
    amount: round2(netAmount * (rate / 100)),
  };
}

/** Calculate all tax totals across invoice lines */
export function calculateTaxTotals(
  lines: ETAInvoiceLine[]
): { taxType: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const line of lines) {
    for (const tax of line.taxableItems) {
      const existing = map.get(tax.taxType) ?? 0;
      map.set(tax.taxType, round2(existing + tax.amount));
    }
  }
  return Array.from(map.entries()).map(([taxType, amount]) => ({
    taxType,
    amount,
  }));
}

/** Calculate invoice line totals */
export function calculateLineTotals(
  quantity: number,
  unitValue: number,
  discount: number,
  taxableItems: { taxType: string; subType: string; rate: number; amount: number }[]
): Pick<ETAInvoiceLine, "salesTotal" | "netTotal" | "total"> {
  const salesTotal = round2(quantity * unitValue);
  const netTotal = round2(salesTotal - discount);
  const totalTax = taxableItems.reduce((sum, item) => sum + item.amount, 0);
  const total = round2(netTotal + totalTax);
  return { salesTotal, netTotal, total };
}

/** Calculate complete invoice totals */
export function calculateInvoiceTotals(lines: ETAInvoiceLine[]): {
  totalSalesAmount: number;
  totalDiscountAmount: number;
  netAmount: number;
  taxTotals: { taxType: string; amount: number }[];
  totalAmount: number;
} {
  const totalSalesAmount = round2(
    lines.reduce((sum, l) => sum + l.salesTotal, 0)
  );
  const totalDiscountAmount = round2(
    lines.reduce((sum, l) => sum + l.discount, 0)
  );
  const netAmount = round2(
    lines.reduce((sum, l) => sum + l.netTotal, 0)
  );
  const taxTotals = calculateTaxTotals(lines);
  const totalTax = round2(taxTotals.reduce((sum, tt) => sum + tt.amount, 0));
  const totalAmount = round2(netAmount + totalTax);

  return { totalSalesAmount, totalDiscountAmount, netAmount, taxTotals, totalAmount };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Storage Helpers ─────────────────────────────────────────

function loadInvoices(): ETAInvoice[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveInvoices(invoices: ETAInvoice[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
}

export function loadETASettings(): ETACredentials {
  if (typeof window === "undefined") {
    return defaultSettings();
  }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : defaultSettings();
  } catch {
    return defaultSettings();
  }
}

export function saveETASettings(settings: ETACredentials): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function defaultSettings(): ETACredentials {
  return {
    clientId: "",
    clientSecret: "",
    environment: "sandbox",
    taxId: "",
    companyName: "",
    branchId: "0",
    activityCode: "",
  };
}

// ─── ETA API Simulation ──────────────────────────────────────

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function simulateDelay(): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, 300 + Math.random() * 500)
  );
}

// ─── Public API Functions ────────────────────────────────────

/**
 * Format an internal invoice into the ETA-compliant structure.
 * Validates required fields and calculates totals.
 */
export function formatForETA(invoice: Partial<ETAInvoice>): ETAInvoice {
  const settings = loadETASettings();
  const lines = (invoice.invoiceLines ?? []).map((line) => {
    const taxableItems = line.taxableItems ?? [];
    const { salesTotal, netTotal, total } = calculateLineTotals(
      line.quantity,
      line.unitValue,
      line.discount ?? 0,
      taxableItems
    );
    return {
      description: line.description ?? "",
      itemType: line.itemType ?? "GS1",
      itemCode: line.itemCode ?? "",
      unitType: line.unitType ?? "EA",
      quantity: line.quantity ?? 0,
      unitValue: line.unitValue ?? 0,
      salesTotal,
      discount: line.discount ?? 0,
      netTotal,
      taxableItems,
      total,
    };
  });

  const totals = calculateInvoiceTotals(lines);

  return {
    id: invoice.id ?? `EINV-${Date.now()}`,
    internalId: invoice.internalId ?? "",
    issuerName: invoice.issuerName ?? settings.companyName,
    issuerTaxId: invoice.issuerTaxId ?? settings.taxId,
    receiverName: invoice.receiverName ?? "",
    receiverTaxId: invoice.receiverTaxId ?? "",
    dateTimeIssued: invoice.dateTimeIssued ?? new Date().toISOString(),
    invoiceLines: lines,
    ...totals,
    status: invoice.status ?? "draft",
    uuid: invoice.uuid,
    submissionId: invoice.submissionId,
    longId: invoice.longId,
  };
}

/**
 * Submit an invoice to ETA (simulated).
 * In production, this would POST to the ETA API with OAuth2 auth.
 */
export async function submitToETA(
  invoice: ETAInvoice
): Promise<ETASubmissionResult> {
  await simulateDelay();

  // Validation
  if (!invoice.issuerTaxId) {
    return { success: false, error: "Issuer Tax ID is required" };
  }
  if (!invoice.receiverTaxId) {
    return { success: false, error: "Receiver Tax ID is required" };
  }
  if (!invoice.receiverName) {
    return { success: false, error: "Receiver name is required" };
  }
  if (invoice.invoiceLines.length === 0) {
    return { success: false, error: "At least one invoice line is required" };
  }
  for (const line of invoice.invoiceLines) {
    if (!line.itemCode) {
      return {
        success: false,
        error: `Item code is required for line: ${line.description || "(no description)"}`,
      };
    }
    if (line.quantity <= 0) {
      return {
        success: false,
        error: `Quantity must be positive for line: ${line.description || "(no description)"}`,
      };
    }
  }

  // Simulate ~90% acceptance rate
  const accepted = Math.random() > 0.1;
  const uuid = generateUUID();
  const submissionId = `SUB-${Date.now()}`;
  const longId = `${uuid}${Date.now()}`;

  const submittedInvoice: ETAInvoice = {
    ...invoice,
    uuid,
    submissionId,
    longId,
    status: accepted ? "accepted" : "rejected",
  };

  // Save to local storage
  const existing = loadInvoices();
  const idx = existing.findIndex((inv) => inv.id === invoice.id);
  if (idx >= 0) {
    existing[idx] = submittedInvoice;
  } else {
    existing.push(submittedInvoice);
  }
  saveInvoices(existing);

  if (!accepted) {
    return {
      success: false,
      uuid,
      submissionId,
      error: "Invoice rejected by ETA",
      rejectionReason:
        "Simulated rejection: Item code format does not match ETA registry",
    };
  }

  return { success: true, uuid, submissionId, longId };
}

/**
 * Get the status of a previously submitted invoice.
 */
export async function getETAStatus(uuid: string): Promise<ETAStatusResult> {
  await simulateDelay();

  const invoices = loadInvoices();
  const inv = invoices.find((i) => i.uuid === uuid);

  if (!inv) {
    return {
      uuid,
      status: "submitted",
      statusReason: "Document not found in local store",
    };
  }

  return {
    uuid,
    status: inv.status === "draft" ? "submitted" : (inv.status as ETAStatusResult["status"]),
    statusReason:
      inv.status === "rejected"
        ? "Item code format does not match ETA registry"
        : undefined,
    dateReceived: inv.dateTimeIssued,
  };
}

/**
 * Cancel a previously submitted e-invoice.
 */
export async function cancelETAInvoice(
  uuid: string
): Promise<{ success: boolean; error?: string }> {
  await simulateDelay();

  const invoices = loadInvoices();
  const idx = invoices.findIndex((i) => i.uuid === uuid);

  if (idx < 0) {
    return { success: false, error: "Invoice not found" };
  }

  if (invoices[idx].status === "cancelled") {
    return { success: false, error: "Invoice is already cancelled" };
  }

  if (invoices[idx].status === "rejected") {
    return { success: false, error: "Cannot cancel a rejected invoice" };
  }

  invoices[idx] = { ...invoices[idx], status: "cancelled" };
  saveInvoices(invoices);

  return { success: true };
}

/**
 * Get list of submitted documents within a date range.
 */
export async function getETADocuments(
  dateFrom: string,
  dateTo: string,
  status?: string
): Promise<ETAInvoice[]> {
  await simulateDelay();

  const invoices = loadInvoices();
  const from = new Date(dateFrom).getTime();
  const to = new Date(dateTo).getTime();

  return invoices.filter((inv) => {
    const issued = new Date(inv.dateTimeIssued).getTime();
    if (issued < from || issued > to) return false;
    if (status && inv.status !== status) return false;
    return true;
  });
}

/**
 * Get all stored e-invoices (no date filter).
 */
export function getAllEInvoices(): ETAInvoice[] {
  return loadInvoices();
}

/**
 * Save a draft e-invoice (without submitting to ETA).
 */
export function saveDraftInvoice(invoice: ETAInvoice): void {
  const existing = loadInvoices();
  const idx = existing.findIndex((inv) => inv.id === invoice.id);
  if (idx >= 0) {
    existing[idx] = invoice;
  } else {
    existing.push(invoice);
  }
  saveInvoices(existing);
}

/**
 * Delete a draft e-invoice (only drafts can be deleted).
 */
export function deleteDraftInvoice(
  id: string
): { success: boolean; error?: string } {
  const existing = loadInvoices();
  const inv = existing.find((i) => i.id === id);
  if (!inv) return { success: false, error: "Invoice not found" };
  if (inv.status !== "draft") {
    return { success: false, error: "Only draft invoices can be deleted" };
  }
  saveInvoices(existing.filter((i) => i.id !== id));
  return { success: true };
}
