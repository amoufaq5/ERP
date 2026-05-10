// ============================================================
// Egyptian Tax Authority (ETA) E-Invoicing Client
// ============================================================
// Production-ready ETA API integration.
// Configurable for sandbox vs production environments.
// Uses real fetch() calls to ETA endpoints with OAuth2 auth.
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

const ETA_URLS = {
  production: {
    api: "https://api.invoicing.eta.gov.eg/api/v1.0",
    identity: "https://id.eta.gov.eg/connect/token",
  },
  sandbox: {
    api: "https://api.preprod.invoicing.eta.gov.eg/api/v1.0",
    identity: "https://id.preprod.eta.gov.eg/connect/token",
  },
} as const;

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

const SETTINGS_API = "/api/v1/einvoice/settings";
const INVOICES_API = "/api/v1/einvoice";

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

// ─── OAuth2 Token Management ────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(credentials: ETACredentials): Promise<string> {
  // Check cached token validity (with 60-second buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  const urls = ETA_URLS[credentials.environment];

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    scope: "InvoicingAPI",
  });

  const response = await fetch(urls.identity, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ETA authentication failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };

  return cachedToken.token;
}

function getApiBase(credentials: ETACredentials): string {
  return ETA_URLS[credentials.environment].api;
}

// ─── Settings (via API) ─────────────────────────────────────

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

export function loadETASettings(): ETACredentials {
  if (typeof window === "undefined") {
    return defaultSettings();
  }
  // Attempt to fetch from API synchronously via cached value
  // For async usage, use loadETASettingsAsync() instead
  return settingsCache ?? defaultSettings();
}

let settingsCache: ETACredentials | null = null;

/** Async version: fetch settings from the API */
export async function loadETASettingsAsync(): Promise<ETACredentials> {
  try {
    const resp = await fetch(SETTINGS_API, {
      headers: { "Content-Type": "application/json" },
    });
    if (resp.ok) {
      const json = await resp.json();
      const data = json.data ?? json;
      settingsCache = data;
      return data;
    }
  } catch {
    // API unavailable
  }
  return settingsCache ?? defaultSettings();
}

export async function saveETASettings(settings: ETACredentials): Promise<void> {
  settingsCache = settings;
  try {
    await fetch(SETTINGS_API, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
  } catch {
    // API unavailable -- settings remain in memory
  }
}

// ─── Invoice Persistence (via API) ──────────────────────────

async function loadInvoices(): Promise<ETAInvoice[]> {
  try {
    const resp = await fetch(`${INVOICES_API}?limit=500`, {
      headers: { "Content-Type": "application/json" },
    });
    if (resp.ok) {
      const json = await resp.json();
      return json.data ?? json ?? [];
    }
  } catch {
    // API unavailable
  }
  return [];
}

async function saveInvoice(invoice: ETAInvoice): Promise<void> {
  try {
    await fetch(INVOICES_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoice),
    });
  } catch {
    // API unavailable
  }
}

async function updateInvoiceInStore(invoice: ETAInvoice): Promise<void> {
  try {
    await fetch(`${INVOICES_API}/${invoice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoice),
    });
  } catch {
    // API unavailable
  }
}

async function deleteInvoiceFromStore(id: string): Promise<void> {
  try {
    await fetch(`${INVOICES_API}/${id}`, {
      method: "DELETE",
    });
  } catch {
    // API unavailable
  }
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
 * Submit an invoice to ETA via the real ETA API.
 * Uses OAuth2 client credentials for authentication.
 */
export async function submitToETA(
  invoice: ETAInvoice
): Promise<ETASubmissionResult> {
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

  const settings = await loadETASettingsAsync();
  if (!settings.clientId || !settings.clientSecret) {
    return { success: false, error: "ETA credentials not configured. Set client ID and secret in settings." };
  }

  try {
    const token = await getAccessToken(settings);
    const apiBase = getApiBase(settings);

    // Build ETA document submission payload
    const etaDocument = {
      documents: [
        {
          header: {
            dateTimeIssued: invoice.dateTimeIssued,
            receiptNumber: invoice.internalId,
            uuid: "",
            previousUUID: "",
            referenceOldUUID: "",
            currency: "EGP",
            exchangeRate: 0,
            sOrderNameCode: "",
            orderdeliveryMode: "",
            grossWeight: 0,
            netWeight: 0,
          },
          documentType: "I",
          documentTypeVersion: "1.0",
          issuer: {
            type: "B",
            id: settings.taxId,
            name: settings.companyName,
            address: {
              branchID: settings.branchId,
              country: "EG",
              governate: "",
              regionCity: "",
              street: "",
              buildingNumber: "",
            },
          },
          receiver: {
            type: "B",
            id: invoice.receiverTaxId,
            name: invoice.receiverName,
            address: {
              country: "EG",
              governate: "",
              regionCity: "",
              street: "",
              buildingNumber: "",
            },
          },
          invoiceLines: invoice.invoiceLines.map((line) => ({
            description: line.description,
            itemType: line.itemType,
            itemCode: line.itemCode,
            unitType: line.unitType,
            quantity: line.quantity,
            unitValue: { currencySold: "EGP", amountEGP: line.unitValue },
            salesTotal: line.salesTotal,
            discount: { rate: 0, amount: line.discount },
            netTotal: line.netTotal,
            taxableItems: line.taxableItems.map((tax) => ({
              taxType: tax.taxType,
              subType: tax.subType,
              rate: tax.rate,
              amount: tax.amount,
            })),
            total: line.total,
          })),
          totalSalesAmount: invoice.totalSalesAmount,
          totalDiscountAmount: invoice.totalDiscountAmount,
          netAmount: invoice.netAmount,
          taxTotals: invoice.taxTotals,
          totalAmount: invoice.totalAmount,
          extraDiscountAmount: 0,
          totalItemsDiscountAmount: 0,
        },
      ],
    };

    const response = await fetch(`${apiBase}/documentsubmissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(etaDocument),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: response.statusText }));
      const errorDetails = errorBody.error?.details
        ? errorBody.error.details.map((d: any) => d.message).join("; ")
        : errorBody.error?.message || response.statusText;

      const submittedInvoice: ETAInvoice = {
        ...invoice,
        status: "rejected",
      };
      await updateInvoiceInStore(submittedInvoice);

      return {
        success: false,
        error: `ETA rejected submission: ${errorDetails}`,
        rejectionReason: errorDetails,
      };
    }

    const result = await response.json();
    const doc = result.acceptedDocuments?.[0] || result.submissionId
      ? { uuid: result.acceptedDocuments?.[0]?.uuid, longId: result.acceptedDocuments?.[0]?.longId }
      : {};

    const submittedInvoice: ETAInvoice = {
      ...invoice,
      uuid: doc.uuid || result.submissionId,
      submissionId: result.submissionId,
      longId: doc.longId,
      status: result.rejectedDocuments?.length ? "rejected" : "accepted",
    };
    await updateInvoiceInStore(submittedInvoice);

    if (result.rejectedDocuments?.length) {
      const rejectionReason = result.rejectedDocuments[0]?.error?.details
        ?.map((d: any) => d.message).join("; ")
        || "Document rejected by ETA";
      return {
        success: false,
        uuid: doc.uuid,
        submissionId: result.submissionId,
        error: "Invoice rejected by ETA",
        rejectionReason,
      };
    }

    return {
      success: true,
      uuid: doc.uuid,
      submissionId: result.submissionId,
      longId: doc.longId,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to submit to ETA",
    };
  }
}

/**
 * Get the status of a previously submitted invoice from the ETA API.
 */
export async function getETAStatus(uuid: string): Promise<ETAStatusResult> {
  const settings = await loadETASettingsAsync();

  if (!settings.clientId || !settings.clientSecret) {
    return { uuid, status: "submitted", statusReason: "ETA credentials not configured" };
  }

  try {
    const token = await getAccessToken(settings);
    const apiBase = getApiBase(settings);

    const response = await fetch(`${apiBase}/documents/${uuid}/raw`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return {
        uuid,
        status: "submitted",
        statusReason: `ETA returned ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      uuid,
      status: data.status?.toLowerCase() || "submitted",
      statusReason: data.statusReason,
      dateReceived: data.dateTimeReceived,
    };
  } catch (err) {
    return {
      uuid,
      status: "submitted",
      statusReason: err instanceof Error ? err.message : "Failed to check status",
    };
  }
}

/**
 * Cancel a previously submitted e-invoice via the ETA API.
 */
export async function cancelETAInvoice(
  uuid: string
): Promise<{ success: boolean; error?: string }> {
  const settings = await loadETASettingsAsync();

  if (!settings.clientId || !settings.clientSecret) {
    return { success: false, error: "ETA credentials not configured" };
  }

  try {
    const token = await getAccessToken(settings);
    const apiBase = getApiBase(settings);

    const response = await fetch(`${apiBase}/documents/state/${uuid}/state`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status: "cancelled",
        reason: "Cancelled by issuer",
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorBody.error?.message || `ETA returned ${response.status}`,
      };
    }

    // Update local store
    const invoices = await loadInvoices();
    const inv = invoices.find((i) => i.uuid === uuid);
    if (inv) {
      await updateInvoiceInStore({ ...inv, status: "cancelled" });
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to cancel invoice",
    };
  }
}

/**
 * Get list of submitted documents within a date range from the ETA API.
 */
export async function getETADocuments(
  dateFrom: string,
  dateTo: string,
  status?: string
): Promise<ETAInvoice[]> {
  const settings = await loadETASettingsAsync();

  if (!settings.clientId || !settings.clientSecret) {
    // Fall back to locally stored invoices filtered by date
    const invoices = await loadInvoices();
    const from = new Date(dateFrom).getTime();
    const to = new Date(dateTo).getTime();
    return invoices.filter((inv) => {
      const issued = new Date(inv.dateTimeIssued).getTime();
      if (issued < from || issued > to) return false;
      if (status && inv.status !== status) return false;
      return true;
    });
  }

  try {
    const token = await getAccessToken(settings);
    const apiBase = getApiBase(settings);

    const params = new URLSearchParams({
      dateFrom,
      dateTo,
      pageSize: "100",
      pageNo: "1",
    });
    if (status) params.set("status", status);

    const response = await fetch(
      `${apiBase}/documents/recent?${params}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      // Fall back to local store
      const invoices = await loadInvoices();
      const from = new Date(dateFrom).getTime();
      const to = new Date(dateTo).getTime();
      return invoices.filter((inv) => {
        const issued = new Date(inv.dateTimeIssued).getTime();
        if (issued < from || issued > to) return false;
        if (status && inv.status !== status) return false;
        return true;
      });
    }

    const data = await response.json();
    const results = data.result || [];
    return results.map((doc: any) => ({
      id: doc.internalId || doc.uuid,
      internalId: doc.internalId || "",
      issuerName: doc.issuerName || "",
      issuerTaxId: doc.issuerId || "",
      receiverName: doc.receiverName || "",
      receiverTaxId: doc.receiverId || "",
      dateTimeIssued: doc.dateTimeIssued || "",
      invoiceLines: [],
      totalSalesAmount: doc.totalSales || 0,
      totalDiscountAmount: doc.totalDiscount || 0,
      netAmount: doc.netAmount || 0,
      taxTotals: [],
      totalAmount: doc.total || 0,
      status: (doc.status || "submitted").toLowerCase(),
      uuid: doc.uuid,
      submissionId: doc.submissionUUID,
      longId: doc.longId,
    }));
  } catch {
    // Fall back to local store
    const invoices = await loadInvoices();
    const from = new Date(dateFrom).getTime();
    const to = new Date(dateTo).getTime();
    return invoices.filter((inv) => {
      const issued = new Date(inv.dateTimeIssued).getTime();
      if (issued < from || issued > to) return false;
      if (status && inv.status !== status) return false;
      return true;
    });
  }
}

/**
 * Get all stored e-invoices (from API).
 */
export async function getAllEInvoices(): Promise<ETAInvoice[]> {
  return loadInvoices();
}

/**
 * Save a draft e-invoice (without submitting to ETA).
 */
export async function saveDraftInvoice(invoice: ETAInvoice): Promise<void> {
  const existing = await loadInvoices();
  const idx = existing.findIndex((inv) => inv.id === invoice.id);
  if (idx >= 0) {
    await updateInvoiceInStore(invoice);
  } else {
    await saveInvoice(invoice);
  }
}

/**
 * Delete a draft e-invoice (only drafts can be deleted).
 */
export async function deleteDraftInvoice(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const existing = await loadInvoices();
  const inv = existing.find((i) => i.id === id);
  if (!inv) return { success: false, error: "Invoice not found" };
  if (inv.status !== "draft") {
    return { success: false, error: "Only draft invoices can be deleted" };
  }
  await deleteInvoiceFromStore(id);
  return { success: true };
}
