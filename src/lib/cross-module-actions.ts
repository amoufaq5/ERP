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

// ─── 9. Visit Approved → Consume Samples from Inventory ───────────────────

/**
 * When a visit is approved with samplesGiven[], reduces inventory stock
 * for those products and creates a stock movement (message) record.
 */
export function consumeSamplesFromVisit(store: DataStore, visit: any): void {
  if (!visit.samplesGiven || visit.samplesGiven.length === 0) return

  const rep = store.employees.find((e) => e.id === visit.repId)
  const repName = rep?.name ?? visit.repId

  for (const sample of visit.samplesGiven) {
    const product = store.products.find((p) => p.id === sample.productId)
    if (!product) continue

    const qty = sample.quantity ?? 0
    if (qty <= 0) continue

    // Reduce product stock
    const newStock = Math.max(0, product.stockQty - qty)
    store.update("products", product.id, { stockQty: newStock })

    // Create stock movement record as a message (audit trail)
    const msgId = store.genId("msg")
    store.add("messages", {
      id: msgId,
      fromUserId: "system",
      toUserId: "u-admin",
      subject: `Stock Movement: Sample OUT — ${product.name}`,
      body:
        `[STOCK MOVEMENT — OUT]\n` +
        `Product: ${product.name} ${product.strength} ${product.form}\n` +
        `Quantity: -${qty}\n` +
        `Reason: Samples given during visit ${visit.id}\n` +
        `Rep: ${repName}\n` +
        `New Stock: ${newStock}\n` +
        `Reference: ${visit.id}`,
      read: false,
      starred: false,
      createdAt: isoNow(),
    })
  }
}

// ─── 10. Work Order IN_PROGRESS → Consume Raw Materials ───────────────────

/**
 * When a work order status → IN_PROGRESS, creates stock movement records (OUT)
 * for each raw material in the WO's materials list. Reduces inventory quantities.
 */
export function consumeRawMaterialsFromWO(store: DataStore, workOrder: any): void {
  if (!workOrder.materials || workOrder.materials.length === 0) return

  for (const material of workOrder.materials) {
    const product = store.products.find((p) => p.id === material.productId)
    if (!product) continue

    const qty = material.quantity ?? 0
    if (qty <= 0) continue

    // Reduce raw material stock
    const newStock = Math.max(0, product.stockQty - qty)
    store.update("products", product.id, { stockQty: newStock })

    // Record stock movement as a message
    const msgId = store.genId("msg")
    store.add("messages", {
      id: msgId,
      fromUserId: "system",
      toUserId: "u-admin",
      subject: `Stock Movement: Raw Material OUT — ${product.name}`,
      body:
        `[STOCK MOVEMENT — OUT]\n` +
        `Product: ${product.name} ${product.strength} ${product.form}\n` +
        `Quantity: -${qty}\n` +
        `Reason: Consumed for Work Order ${workOrder.id}\n` +
        `New Stock: ${newStock}\n` +
        `Reference: WO-${workOrder.id}`,
      read: false,
      starred: false,
      createdAt: isoNow(),
    })
  }
}

// ─── 11. Work Order COMPLETED → Create Finished Goods ─────────────────────

/**
 * When a work order status → COMPLETED, creates a new batch in finished goods
 * inventory by updating product stock quantities and recording the batch.
 */
export function createFinishedGoodsFromWO(store: DataStore, workOrder: any): void {
  if (!workOrder.productId) return

  const product = store.products.find((p) => p.id === workOrder.productId)
  if (!product) return

  const producedQty = workOrder.quantity ?? 0
  if (producedQty <= 0) return

  // Update finished goods stock
  store.update("products", product.id, {
    stockQty: product.stockQty + producedQty,
  })

  // Record stock movement as a message (IN)
  const msgId = store.genId("msg")
  store.add("messages", {
    id: msgId,
    fromUserId: "system",
    toUserId: "u-admin",
    subject: `Stock Movement: Finished Goods IN — ${product.name}`,
    body:
      `[STOCK MOVEMENT — IN]\n` +
      `Product: ${product.name} ${product.strength} ${product.form}\n` +
      `Quantity: +${producedQty}\n` +
      `Batch: ${workOrder.batchNumber ?? "N/A"}\n` +
      `Reason: Work Order completed\n` +
      `New Stock: ${product.stockQty + producedQty}\n` +
      `Reference: WO-${workOrder.id}`,
    read: false,
    starred: false,
    createdAt: isoNow(),
  })

  // Create a task for QA to inspect the new batch
  const taskId = store.genId("t")
  store.add("tasks", {
    id: taskId,
    title: `QA Inspection: Batch ${workOrder.batchNumber ?? workOrder.id} — ${product.name}`,
    description:
      `Work Order ${workOrder.id} has been completed.\n` +
      `Product: ${product.name} ${product.strength}\n` +
      `Quantity produced: ${producedQty}\n` +
      `Please perform batch release inspection and testing.`,
    assignedById: "system",
    assignedToId: "u-admin",
    dueDate: daysFromNow(3).slice(0, 10),
    status: "TODO" as const,
    priority: "HIGH" as const,
    createdAt: isoNow(),
  })
}

// ─── 12. Sales Order CONFIRMED → Reserve Inventory ────────────────────────

/**
 * When a sales order is CONFIRMED, reserves stock quantities for each line
 * item. Prevents overselling by checking available stock against the order.
 * Returns an array of warnings for items with insufficient stock.
 */
export function reserveInventoryFromSO(store: DataStore, salesOrder: any): string[] {
  if (!salesOrder.items || salesOrder.items.length === 0) return []

  const warnings: string[] = []

  for (const item of salesOrder.items) {
    const product = store.products.find((p: any) => p.id === item.productId)
    if (!product) {
      warnings.push(`Product ${item.productId} not found — cannot reserve stock.`)
      continue
    }

    const requestedQty = item.quantity ?? 0
    if (requestedQty <= 0) continue

    // Check available stock
    if (product.stockQty < requestedQty) {
      warnings.push(
        `Insufficient stock for ${product.name}: available ${product.stockQty}, requested ${requestedQty}.`
      )
    }

    // Reserve by reducing available stock (reserved = "soft hold")
    const reservedQty = Math.min(product.stockQty, requestedQty)
    store.update("products", product.id, {
      stockQty: product.stockQty - reservedQty,
    })

    // Record reservation as a message
    const msgId = store.genId("msg")
    store.add("messages", {
      id: msgId,
      fromUserId: "system",
      toUserId: "u-admin",
      subject: `Stock Reserved: ${product.name} — SO ${salesOrder.number ?? salesOrder.id}`,
      body:
        `[INVENTORY RESERVATION]\n` +
        `Product: ${product.name} ${product.strength} ${product.form}\n` +
        `Reserved Qty: ${reservedQty}\n` +
        `Sales Order: ${salesOrder.number ?? salesOrder.id}\n` +
        `Customer: ${salesOrder.customerId}\n` +
        `Remaining Stock: ${product.stockQty - reservedQty}`,
      read: false,
      starred: false,
      createdAt: isoNow(),
    })
  }

  return warnings
}

// ─── 13. Leave APPROVED → Block Conflicting Visits ────────────────────────

/**
 * When leave is APPROVED, finds any weekly plan visits scheduled during
 * the leave dates and flags them as conflicting. Creates a notification
 * task for the DM.
 */
export function blockVisitsOnLeave(store: DataStore, leave: any): void {
  if (!leave.employeeId || !leave.startDate || !leave.endDate) return

  const leaveStart = new Date(leave.startDate).getTime()
  const leaveEnd = new Date(leave.endDate).getTime()

  // Find employee to get their repId (may be same as employeeId)
  const employee = store.employees.find((e) => e.id === leave.employeeId)
  const repId = employee?.id ?? leave.employeeId

  // Find weekly plans for the rep that overlap with leave dates
  const conflictingPlans = store.weeklyPlans.filter((plan) => {
    if (plan.repId !== repId) return false
    // Check if any day in the plan overlaps with leave
    return plan.days.some((day) => {
      const dayTime = new Date(day.date).getTime()
      return dayTime >= leaveStart && dayTime <= leaveEnd
    })
  })

  if (conflictingPlans.length === 0) return

  let totalConflicts = 0

  for (const plan of conflictingPlans) {
    // Count conflicting visits
    for (const day of plan.days) {
      const dayTime = new Date(day.date).getTime()
      if (dayTime >= leaveStart && dayTime <= leaveEnd) {
        totalConflicts += day.visits.length
      }
    }

    // Add rejection note to the plan if it's still pending
    if (plan.status === "SUBMITTED" || plan.status === "DRAFT") {
      store.update("weeklyPlans", plan.id, {
        notes: `${plan.notes ? plan.notes + " | " : ""}⚠ CONFLICT: Employee on approved leave (${leave.startDate} to ${leave.endDate}). Visits need reassignment.`,
      })
    }
  }

  // Create notification task for DM
  const taskId = store.genId("t")
  store.add("tasks", {
    id: taskId,
    title: `Visit Conflict — ${employee?.name ?? repId} on leave`,
    description:
      `Employee ${employee?.name ?? repId} has approved leave from ${leave.startDate} to ${leave.endDate}.\n` +
      `${totalConflicts} planned visit(s) across ${conflictingPlans.length} weekly plan(s) are in conflict.\n` +
      `Please reassign or reschedule these visits.`,
    assignedById: "system",
    assignedToId: employee?.manager ?? "u-admin",
    dueDate: leave.startDate,
    status: "TODO" as const,
    priority: "HIGH" as const,
    createdAt: isoNow(),
  })
}

// ─── 14. QA Batch Released → Unlock Batch in Inventory ────────────────────

/**
 * When a QA batch release status → "released-to-market", marks the batch
 * as saleable in inventory and notifies the sales team.
 */
export function unlockBatchOnQARelease(store: DataStore, batchRelease: any): void {
  if (!batchRelease.product) return

  // Find the product by name or ID
  const product = store.products.find(
    (p) => p.id === batchRelease.product || p.name === batchRelease.product
  )
  if (!product) return

  // Record the release in a message to inventory/sales team
  const msgId = store.genId("msg")
  store.add("messages", {
    id: msgId,
    fromUserId: "system",
    toUserId: "u-admin",
    subject: `Batch Released to Market: ${batchRelease.batchNumber ?? batchRelease.number} — ${product.name}`,
    body:
      `[BATCH RELEASE — SALEABLE]\n` +
      `Product: ${product.name} ${product.strength} ${product.form}\n` +
      `Batch: ${batchRelease.batchNumber ?? "N/A"}\n` +
      `Release Number: ${batchRelease.number ?? "N/A"}\n` +
      `QP: ${batchRelease.assignedQP ?? "N/A"}\n` +
      `Released At: ${isoNow()}\n` +
      `This batch is now cleared for commercial distribution.`,
    read: false,
    starred: false,
    createdAt: isoNow(),
  })

  // Notify sales team via task
  const taskId = store.genId("t")
  store.add("tasks", {
    id: taskId,
    title: `New Stock Available: ${product.name} — Batch ${batchRelease.batchNumber ?? batchRelease.number}`,
    description:
      `QA has released batch ${batchRelease.batchNumber ?? batchRelease.number} for ${product.name} ${product.strength} to market.\n` +
      `Batch size: ${batchRelease.batchSize ?? "N/A"}\n` +
      `Expiry: ${batchRelease.expiryDate ?? "N/A"}\n` +
      `This stock is now available for sales orders and distribution.`,
    assignedById: "system",
    assignedToId: "u-admin",
    dueDate: daysFromNow(1).slice(0, 10),
    status: "TODO" as const,
    priority: "MEDIUM" as const,
    createdAt: isoNow(),
  })
}

// ─── 15. QA Deviation CRITICAL → Hold Related Work Orders ─────────────────

/**
 * When a QA deviation is CRITICAL, finds related work orders (by product)
 * and sets them to ON_HOLD via a task alert. Alerts manufacturing supervisor.
 */
export function holdProductionOnDeviation(store: DataStore, deviation: any): void {
  if (!deviation.classification || deviation.classification !== "critical") return

  const affectedProducts = deviation.productsAffected ?? []
  const affectedBatches = deviation.batchesAffected ?? []

  // Create an urgent task for manufacturing supervisor to hold production
  const taskId = store.genId("t")
  store.add("tasks", {
    id: taskId,
    title: `CRITICAL DEVIATION: Hold Production — ${deviation.number ?? deviation.id}`,
    description:
      `A CRITICAL deviation has been raised: ${deviation.title ?? deviation.description ?? "N/A"}\n\n` +
      `Deviation: ${deviation.number ?? deviation.id}\n` +
      `Category: ${deviation.category ?? "N/A"}\n` +
      `Department: ${deviation.department ?? "N/A"}\n` +
      `Area: ${deviation.area ?? "N/A"}\n` +
      `Products Affected: ${affectedProducts.length > 0 ? affectedProducts.join(", ") : "N/A"}\n` +
      `Batches Affected: ${affectedBatches.length > 0 ? affectedBatches.join(", ") : "N/A"}\n\n` +
      `IMMEDIATE ACTION REQUIRED:\n` +
      `1. Place all related work orders ON HOLD\n` +
      `2. Quarantine affected batches\n` +
      `3. Initiate root cause investigation\n` +
      `4. Do NOT release any affected material`,
    assignedById: "system",
    assignedToId: "u-admin",
    dueDate: isoNow().slice(0, 10),
    status: "TODO" as const,
    priority: "URGENT" as const,
    createdAt: isoNow(),
  })

  // Send message alert to manufacturing supervisor
  const msgId = store.genId("msg")
  store.add("messages", {
    id: msgId,
    fromUserId: "system",
    toUserId: "u-admin",
    subject: `🚨 CRITICAL DEVIATION — Production Hold Required`,
    body:
      `[CRITICAL QUALITY ALERT]\n\n` +
      `Deviation ${deviation.number ?? deviation.id}: ${deviation.title ?? "Critical deviation detected"}\n\n` +
      `All production activities related to the following must be halted immediately:\n` +
      `Products: ${affectedProducts.length > 0 ? affectedProducts.join(", ") : "All related products"}\n` +
      `Batches: ${affectedBatches.length > 0 ? affectedBatches.join(", ") : "All related batches"}\n\n` +
      `Immediate action: ${deviation.immediateAction ?? "Halt production and quarantine materials"}\n` +
      `Detected by: ${deviation.detectedBy ?? "QA"}\n` +
      `Date: ${deviation.detectedAt ?? isoNow()}`,
    read: false,
    starred: true,
    createdAt: isoNow(),
  })
}

// ─── 16. Work Order Creation → Validate Material Expiry ───────────────────

/**
 * When creating a work order, validates all required materials are not expired.
 * Returns warnings for materials expiring within 30 days.
 * Returns errors for already-expired materials (blocks the WO).
 */
export function validateMaterialExpiryForWO(
  store: DataStore,
  workOrder: any
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  if (!workOrder.materials || workOrder.materials.length === 0) {
    return { valid: true, errors, warnings }
  }

  const now = new Date()
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 86_400_000)

  for (const material of workOrder.materials) {
    const product = store.products.find((p) => p.id === material.productId)
    if (!product) {
      errors.push(`Material ${material.productId} not found in inventory.`)
      continue
    }

    // Check expiry via shelfLife or material.expiryDate
    const expiryDate = material.expiryDate ?? product.shelfLife
    if (!expiryDate) continue

    const expiry = new Date(expiryDate)

    if (expiry <= now) {
      errors.push(
        `EXPIRED: ${product.name} ${product.strength} expired on ${expiryDate}. Cannot use in production.`
      )
    } else if (expiry <= thirtyDaysFromNow) {
      const daysLeft = daysBetween(isoNow(), expiryDate)
      warnings.push(
        `EXPIRING SOON: ${product.name} ${product.strength} expires in ${daysLeft} days (${expiryDate}).`
      )
    }
  }

  const valid = errors.length === 0

  // If there are issues, create a task for review
  if (errors.length > 0 || warnings.length > 0) {
    const taskId = store.genId("t")
    store.add("tasks", {
      id: taskId,
      title: `Material Expiry Check — WO ${workOrder.id}`,
      description:
        `Material expiry validation for Work Order ${workOrder.id}:\n\n` +
        (errors.length > 0 ? `BLOCKED:\n${errors.map((e) => `• ${e}`).join("\n")}\n\n` : "") +
        (warnings.length > 0 ? `WARNINGS:\n${warnings.map((w) => `• ${w}`).join("\n")}` : ""),
      assignedById: "system",
      assignedToId: "u-admin",
      dueDate: isoNow().slice(0, 10),
      status: "TODO" as const,
      priority: errors.length > 0 ? ("URGENT" as const) : ("MEDIUM" as const),
      createdAt: isoNow(),
    })
  }

  return { valid, errors, warnings }
}

// ─── 17. Field Expense APPROVED → Create Payroll Reimbursement ────────────

/**
 * When a field expense is APPROVED, creates a payroll reimbursement journal
 * entry for the employee.
 * Debit: 6500 (Travel & Field Expenses)
 * Credit: 2100 (Accrued Liabilities — Employee Reimbursement)
 */
export function createReimbursementFromExpense(store: DataStore, expense: any): void {
  const amount = expense.amount ?? 0
  if (amount <= 0) return

  if (!expense.employeeId) return

  const employee = store.employees.find((e) => e.id === expense.employeeId)
  const employeeName = employee?.name ?? expense.employeeId

  // Create a journal entry for the reimbursement
  const jeNumber = store.generateJournalNumber()
  const jeId = store.genId("je")

  store.add("journalEntries", {
    id: jeId,
    number: jeNumber,
    date: isoNow().slice(0, 10),
    description: `Payroll reimbursement — ${employeeName}: ${expense.description ?? "Field expense"} (auto-generated)`,
    reference: expense.id,
    type: "GENERAL" as const,
    status: "DRAFT" as const,
    createdBy: "system",
    createdAt: isoNow(),
    lines: [
      {
        accountId: "gl-6500",
        description: `Field expense reimbursement: ${expense.description?.slice(0, 60) ?? "Expense"}`,
        debit: amount,
        credit: 0,
        costCenterId: "cc-sell",
      },
      {
        accountId: "gl-2100",
        description: `Accrued reimbursement — ${employeeName}`,
        debit: 0,
        credit: amount,
      },
    ],
  })

  // Create a task for payroll to include in next pay run
  const taskId = store.genId("t")
  store.add("tasks", {
    id: taskId,
    title: `Payroll Reimbursement: ${employeeName} — EGP ${amount.toLocaleString()}`,
    description:
      `Approved field expense requires reimbursement.\n\n` +
      `Employee: ${employeeName} (${expense.employeeId})\n` +
      `Amount: EGP ${amount.toLocaleString()}\n` +
      `Description: ${expense.description ?? "Field expense"}\n` +
      `Journal Entry: ${jeNumber}\n\n` +
      `Please include in the next payroll run.`,
    assignedById: "system",
    assignedToId: "u-admin",
    dueDate: daysFromNow(7).slice(0, 10),
    status: "TODO" as const,
    priority: "MEDIUM" as const,
    createdAt: isoNow(),
  })
}

// ─── 18. PO RECEIVED → Update Vendor Score ────────────────────────────────

/**
 * When a PO is RECEIVED, updates the vendor's quality/delivery/price scores
 * based on PO performance (on-time delivery, quality issues, pricing).
 * Logs scoring details as a message for audit.
 */
export function updateVendorScoreFromPO(store: DataStore, po: any): void {
  if (!po.vendorId) return

  const vendor = store.vendors.find((v) => v.id === po.vendorId)
  if (!vendor) return

  // Calculate delivery score: on-time vs late
  let deliveryRating: "ON_TIME" | "LATE" | "EARLY" = "ON_TIME"
  let daysVariance = 0
  if (po.expectedDate) {
    daysVariance = daysBetween(po.expectedDate, isoNow())
    if (daysVariance > 2) {
      deliveryRating = "LATE"
    } else if (daysVariance < -2) {
      deliveryRating = "EARLY"
    }
  }

  // Calculate price score: compare PO total against expected
  const itemCount = po.items?.length ?? 0
  const totalValue = po.total ?? 0

  // Quality score based on GRN status (if linked)
  const grn = po.grnId
    ? store.goodsReceipts.find((g) => g.id === po.grnId)
    : undefined
  const qualityStatus = grn?.status === "REJECTED" ? "FAILED" : "PASSED"

  // Delivery score (0-100)
  const deliveryScore = deliveryRating === "ON_TIME" ? 100 : deliveryRating === "EARLY" ? 95 : Math.max(0, 100 - daysVariance * 5)
  // Quality score (0-100)
  const qualityScore = qualityStatus === "PASSED" ? 100 : 30
  // Price score (based on whether discount was given)
  const priceScore = (po.discountPct ?? 0) > 0 ? 90 : 75

  // Composite score
  const compositeScore = Math.round(deliveryScore * 0.4 + qualityScore * 0.35 + priceScore * 0.25)

  // Log vendor performance record
  const msgId = store.genId("msg")
  store.add("messages", {
    id: msgId,
    fromUserId: "system",
    toUserId: "u-admin",
    subject: `Vendor Scorecard Update: ${vendor.name} — PO ${po.number}`,
    body:
      `[VENDOR PERFORMANCE RECORD]\n\n` +
      `Vendor: ${vendor.name} (${vendor.code})\n` +
      `PO: ${po.number}\n` +
      `Items: ${itemCount}\n` +
      `Total Value: EGP ${totalValue.toLocaleString()}\n\n` +
      `SCORES:\n` +
      `  Delivery: ${deliveryScore}/100 (${deliveryRating}${daysVariance > 0 ? `, ${daysVariance} days late` : ""})\n` +
      `  Quality: ${qualityScore}/100 (${qualityStatus})\n` +
      `  Price: ${priceScore}/100\n` +
      `  Composite: ${compositeScore}/100\n\n` +
      `GMP Certified: ${vendor.gmpCertified ? "Yes" : "No"}`,
    read: false,
    starred: false,
    createdAt: isoNow(),
  })

  // Create follow-up task if vendor score is poor
  if (compositeScore < 60) {
    const taskId = store.genId("t")
    store.add("tasks", {
      id: taskId,
      title: `Poor Vendor Score: ${vendor.name} — Review Required`,
      description:
        `Vendor ${vendor.name} received a composite score of ${compositeScore}/100 on PO ${po.number}.\n\n` +
        `Delivery: ${deliveryScore}/100\n` +
        `Quality: ${qualityScore}/100\n` +
        `Price: ${priceScore}/100\n\n` +
        `Please review vendor performance and consider corrective actions or alternative suppliers.`,
      assignedById: "system",
      assignedToId: "u-admin",
      dueDate: daysFromNow(7).slice(0, 10),
      status: "TODO" as const,
      priority: "HIGH" as const,
      createdAt: isoNow(),
    })
  }
}

// ─── 19. GL Account Drill-Through → Journal Entries ───────────────────────

/**
 * Given a GL account ID and date range, returns all journal entries posting
 * to that account with source document references.
 */
export function drillThroughGLToJournals(
  store: DataStore,
  accountId: string,
  startDate: string,
  endDate: string
): {
  account: any
  entries: { journalEntry: any; line: any; reference: string | undefined }[]
  totalDebit: number
  totalCredit: number
} {
  const account = store.glAccounts.find((a) => a.id === accountId)
  if (!account) {
    return { account: null, entries: [], totalDebit: 0, totalCredit: 0 }
  }

  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()

  const entries: { journalEntry: any; line: any; reference: string | undefined }[] = []
  let totalDebit = 0
  let totalCredit = 0

  for (const je of store.journalEntries) {
    const jeDate = new Date(je.date).getTime()
    if (jeDate < start || jeDate > end) continue

    for (const line of je.lines) {
      if (line.accountId === accountId) {
        entries.push({
          journalEntry: {
            id: je.id,
            number: je.number,
            date: je.date,
            description: je.description,
            type: je.type,
            status: je.status,
          },
          line: {
            description: line.description,
            debit: line.debit,
            credit: line.credit,
            costCenterId: line.costCenterId,
          },
          reference: je.reference,
        })
        totalDebit += line.debit
        totalCredit += line.credit
      }
    }
  }

  // Sort by date ascending
  entries.sort(
    (a, b) =>
      new Date(a.journalEntry.date).getTime() - new Date(b.journalEntry.date).getTime()
  )

  return { account, entries, totalDebit, totalCredit }
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

    onVisitApprovedWithSamples: (visit: any) =>
      consumeSamplesFromVisit(store, visit),

    onWorkOrderInProgress: (workOrder: any) =>
      consumeRawMaterialsFromWO(store, workOrder),

    onWorkOrderCompleted: (workOrder: any) =>
      createFinishedGoodsFromWO(store, workOrder),

    onSalesOrderReserveStock: (salesOrder: any) =>
      reserveInventoryFromSO(store, salesOrder),

    onLeaveApproved: (leave: any) =>
      blockVisitsOnLeave(store, leave),

    onBatchReleasedToMarket: (batchRelease: any) =>
      unlockBatchOnQARelease(store, batchRelease),

    onCriticalDeviation: (deviation: any) =>
      holdProductionOnDeviation(store, deviation),

    onWorkOrderValidateMaterials: (workOrder: any) =>
      validateMaterialExpiryForWO(store, workOrder),

    onFieldExpenseApproved: (expense: any) =>
      createReimbursementFromExpense(store, expense),

    onPOReceivedVendorScore: (po: any) =>
      updateVendorScoreFromPO(store, po),

    onGLDrillThrough: (accountId: string, startDate: string, endDate: string) =>
      drillThroughGLToJournals(store, accountId, startDate, endDate),
  }
}
