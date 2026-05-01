"use client"

import { useDataStore } from "./data-store"
import type { DataStoreState } from "./data-store"

// ─── Types ──────────────────────────────────────────────────────────────────────

/** The store interface expected by cross-module actions (mirrors DataStoreValue) */
export interface DataStore extends DataStoreState {
  add: <K extends EntityKey>(key: K, item: DataStoreState[K][number]) => void
  update: <K extends EntityKey>(key: K, id: string, patch: Partial<DataStoreState[K][number]>) => void
  remove: <K extends EntityKey>(key: K, id: string) => void
  genId: (prefix: string) => string
  generateInvoiceNumber: () => string
  generateJournalNumber: () => string
  generatePONumber: () => string
  generateSONumber: () => string
  generateGRNNumber: () => string
  generatePaymentRef: () => string
}

type EntityKey = {
  [K in keyof DataStoreState]: DataStoreState[K] extends Array<unknown> ? K : never
}[keyof DataStoreState]

// ─── Helpers ────────────────────────────────────────────────────────────────────

function isoNow(): string {
  return new Date().toISOString()
}

function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toISOString()
}

function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}

// ─── 1. Expense (Market Request with amount) → Journal Entry ────────────────

/**
 * Creates a GL journal entry when an expense-type market request is approved.
 * Debit: 6500 (Travel & Field Expenses)
 * Credit: 1000 (Cash/Bank)
 * Amount in EGP.
 */
export function createJournalEntryFromExpense(store: DataStore, expense: any): void {
  const amount = expense.amount ?? 0
  if (amount <= 0) return

  const jeNumber = store.generateJournalNumber()
  const jeId = store.genId("je")

  store.add("journalEntries", {
    id: jeId,
    number: jeNumber,
    date: isoNow().slice(0, 10),
    description: `Field expense — ${expense.description ?? "Market request"} (auto-generated)`,
    reference: expense.id,
    type: "GENERAL" as const,
    status: "DRAFT" as const,
    createdBy: "system",
    createdAt: isoNow(),
    lines: [
      {
        accountId: "gl-6500",
        description: `Field expense: ${expense.description?.slice(0, 60) ?? "Expense"}`,
        debit: amount,
        credit: 0,
        costCenterId: "cc-sell",
      },
      {
        accountId: "gl-1000",
        description: "Cash/Bank — expense disbursement",
        debit: 0,
        credit: amount,
      },
    ],
  })
}

// ─── 2. Approved Sample Request → Purchase Order ────────────────────────────

/**
 * Creates a Purchase Order for approved sample requests.
 * Links to the first active vendor (GMP-certified preferred).
 * Status: DRAFT (requires further approval).
 */
export function createPOFromSampleRequest(store: DataStore, request: any): void {
  const product = store.products.find((p) => p.id === request.productId)
  if (!product) return

  // Prefer GMP-certified vendor, fall back to first available
  const vendor =
    store.vendors.find((v) => v.gmpCertified) ?? store.vendors[0]
  if (!vendor) return

  const quantity = request.quantity ?? 100
  const unitPrice = Math.round(product.pricePerUnit * 0.6) // wholesale cost ~60% of retail
  const subtotal = quantity * unitPrice
  const tax = Math.round(subtotal * 0.14) // 14% Egyptian VAT
  const total = subtotal + tax

  const poNumber = store.generatePONumber()
  const poId = store.genId("po")

  store.add("purchaseOrders", {
    id: poId,
    number: poNumber,
    vendorId: vendor.id,
    date: isoNow().slice(0, 10),
    expectedDate: daysFromNow(14).slice(0, 10),
    items: [
      {
        productId: product.id,
        description: `${product.name} ${product.strength} ${product.form} — Samples`,
        quantity,
        unitPrice,
        total: subtotal,
      },
    ],
    subtotal,
    tax,
    total,
    status: "DRAFT" as const,
    createdAt: isoNow(),
  })
}

// ─── 3. PO Received → Stock Movement / Inventory Update ────────────────────

/**
 * When a PO status becomes RECEIVED, creates a Goods Receipt Note
 * and updates each product's stockQty in the product catalogue.
 */
export function updateInventoryFromPO(store: DataStore, po: any): void {
  if (!po.items || po.items.length === 0) return

  // Create GRN
  const grnNumber = store.generateGRNNumber()
  const grnId = store.genId("grn")

  store.add("goodsReceipts", {
    id: grnId,
    number: grnNumber,
    poId: po.id,
    vendorId: po.vendorId,
    date: isoNow().slice(0, 10),
    items: po.items.map((item: any) => ({
      productId: item.productId,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    status: "RECEIVED" as const,
    createdAt: isoNow(),
  })

  // Update product stock levels
  for (const item of po.items) {
    const product = store.products.find((p) => p.id === item.productId)
    if (product) {
      store.update("products", product.id, {
        stockQty: product.stockQty + item.quantity,
      })
    }
  }

  // Link GRN back to PO
  store.update("purchaseOrders", po.id, { grnId, status: "RECEIVED" as const })
}

// ─── 4. Invoice Overdue → Support Ticket (Task) ────────────────────────────

/**
 * Creates a billing-recovery task when an invoice is past its due date.
 * Priority is determined by amount and days overdue.
 */
export function createTicketForOverdueInvoice(store: DataStore, invoice: any): void {
  const daysOverdue = daysBetween(invoice.dueDate, isoNow())
  if (daysOverdue <= 0) return

  const customer = store.customers.find((c) => c.id === invoice.customerId)
  const customerName = customer?.name ?? "Unknown customer"

  // Determine priority based on amount & lateness
  let priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" = "MEDIUM"
  if (invoice.total >= 500_000 || daysOverdue >= 60) {
    priority = "URGENT"
  } else if (invoice.total >= 200_000 || daysOverdue >= 30) {
    priority = "HIGH"
  } else if (daysOverdue < 7) {
    priority = "LOW"
  }

  const ticketId = store.genId("t")

  store.add("tasks", {
    id: ticketId,
    title: `Overdue Invoice ${invoice.number} — ${customerName}`,
    description:
      `Invoice ${invoice.number} for ${customerName} is ${daysOverdue} days overdue. ` +
      `Total: EGP ${invoice.total?.toLocaleString()}. ` +
      `Please follow up on payment collection.`,
    assignedById: "system",
    assignedToId: "u-admin",
    dueDate: daysFromNow(3).slice(0, 10),
    status: "TODO" as const,
    priority,
    createdAt: isoNow(),
  })

  // Mark invoice as OVERDUE
  if (invoice.status !== "OVERDUE") {
    store.update("invoices", invoice.id, { status: "OVERDUE" as const })
  }
}

// ─── 5. Low Stock → Purchase Order Suggestion ──────────────────────────────

/**
 * When a product's stockQty falls below its reorderLevel,
 * creates a suggested (DRAFT) purchase order.
 * Order quantity = reorderLevel * 2 to provide buffer stock.
 */
export function createPOSuggestionForLowStock(store: DataStore, product: any): void {
  if (product.stockQty >= product.reorderLevel) return

  // Check if there's already a pending PO for this product
  const existingPO = store.purchaseOrders.find(
    (po) =>
      (po.status === "DRAFT" || po.status === "APPROVED" || po.status === "ORDERED") &&
      po.items.some((item: any) => item.productId === product.id)
  )
  if (existingPO) return // avoid duplicates

  const vendor =
    store.vendors.find((v) => v.gmpCertified) ?? store.vendors[0]
  if (!vendor) return

  const orderQty = product.reorderLevel * 2
  const unitPrice = Math.round(product.pricePerUnit * 0.6)
  const subtotal = orderQty * unitPrice
  const tax = Math.round(subtotal * 0.14)
  const total = subtotal + tax

  const poNumber = store.generatePONumber()
  const poId = store.genId("po")

  store.add("purchaseOrders", {
    id: poId,
    number: poNumber,
    vendorId: vendor.id,
    date: isoNow().slice(0, 10),
    expectedDate: daysFromNow(21).slice(0, 10),
    items: [
      {
        productId: product.id,
        description: `${product.name} ${product.strength} ${product.form} — Low-stock reorder`,
        quantity: orderQty,
        unitPrice,
        total: subtotal,
      },
    ],
    subtotal,
    tax,
    total,
    status: "DRAFT" as const,
    createdAt: isoNow(),
  })
}

// ─── 6. Sales Order Confirmed → Invoice Draft ──────────────────────────────

/**
 * Creates a draft invoice from a confirmed sales order.
 * Copies line items and calculates 14% Egyptian VAT.
 */
export function createInvoiceFromSalesOrder(store: DataStore, salesOrder: any): void {
  if (!salesOrder.items || salesOrder.items.length === 0) return

  // Don't create duplicate invoices
  if (salesOrder.invoiceId) return

  const subtotal = salesOrder.items.reduce(
    (sum: number, item: any) => sum + (item.total ?? item.quantity * item.unitPrice),
    0
  )
  const tax = Math.round(subtotal * 0.14)
  const total = subtotal + tax

  const invNumber = store.generateInvoiceNumber()
  const invId = store.genId("inv")

  store.add("invoices", {
    id: invId,
    number: invNumber,
    customerId: salesOrder.customerId,
    date: isoNow().slice(0, 10),
    dueDate: daysFromNow(30).slice(0, 10),
    subtotal,
    tax,
    total,
    currency: "EGP",
    status: "DRAFT" as const,
    items: salesOrder.items.map((item: any) => ({
      productId: item.productId,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total ?? item.quantity * item.unitPrice,
    })),
    notes: `Auto-generated from ${salesOrder.number}`,
  })

  // Link invoice back to the sales order
  store.update("salesOrders", salesOrder.id, { invoiceId: invId })
}

// ─── 7. Approved Market Request (EVENT type) → Project Task ─────────────────

/**
 * Creates project tasks for approved event-type market requests
 * (e.g., CME sponsorships, symposiums, product launches).
 */
export function createProjectTaskFromEvent(store: DataStore, request: any): void {
  // Find a relevant project or default to first project
  const project =
    store.projects.find((p) => p.status === "In Progress") ?? store.projects[0]
  if (!project) return

  const taskId = store.genId("ptask")

  store.add("projectTasks", {
    id: taskId,
    title: `Event: ${request.description?.slice(0, 60) ?? "Market event"}`,
    project: project.name,
    assignee: project.manager,
    dueDate: daysFromNow(14).slice(0, 10),
    priority: request.priority === "URGENT" ? "High" : request.priority === "HIGH" ? "High" : "Medium",
    hours: 16,
    status: "Todo",
  })
}

// ─── 8. Employee Termination → Asset Recovery ───────────────────────────────

/**
 * When an employee is terminated, creates tasks to recover
 * any company assets and revoke system access.
 */
export function triggerAssetRecoveryOnTermination(store: DataStore, employee: any): void {
  // Create an asset-recovery task
  const taskId = store.genId("t")

  store.add("tasks", {
    id: taskId,
    title: `Asset Recovery — ${employee.name} (${employee.employeeId})`,
    description:
      `Employee ${employee.name} (${employee.employeeId}) has been terminated. ` +
      `Recover all assigned company assets: laptop, ID badge, mobile device, samples, ` +
      `and any literature or promotional materials. Revoke system access and collect ` +
      `company vehicle keys if applicable.`,
    assignedById: "system",
    assignedToId: "u-admin",
    dueDate: daysFromNow(3).slice(0, 10),
    status: "TODO" as const,
    priority: "HIGH" as const,
    createdAt: isoNow(),
  })

  // Mark employee as TERMINATED if not already
  if (employee.status !== "TERMINATED") {
    store.update("employees", employee.id, { status: "TERMINATED" as const })
  }
}

// ─── Hook: useCrossModuleActions ────────────────────────────────────────────

/**
 * React hook that returns all cross-module action functions
 * pre-bound to the current data store.
 */
export function useCrossModuleActions() {
  const store = useDataStore() as unknown as DataStore

  return {
    onExpenseApproved: (expense: any) =>
      createJournalEntryFromExpense(store, expense),

    onSampleRequestApproved: (request: any) =>
      createPOFromSampleRequest(store, request),

    onPOReceived: (po: any) =>
      updateInventoryFromPO(store, po),

    onInvoiceOverdue: (invoice: any) =>
      createTicketForOverdueInvoice(store, invoice),

    onLowStockDetected: (product: any) =>
      createPOSuggestionForLowStock(store, product),

    onSalesOrderConfirmed: (salesOrder: any) =>
      createInvoiceFromSalesOrder(store, salesOrder),

    onEventRequestApproved: (request: any) =>
      createProjectTaskFromEvent(store, request),

    onEmployeeTerminated: (employee: any) =>
      triggerAssetRecoveryOnTermination(store, employee),
  }
}
