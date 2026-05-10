// ─── AI Agent with Tool Use ─────────────────────────────────────────────────
// Production agent that can execute actions in the ERP via real Prisma queries.

import prisma from '@/lib/prisma';
import {
  ProviderRegistry,
  type Message,
  type ChatOptions,
  type ToolDefinition,
  type ToolCall,
  type ChatResponse,
} from './provider';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AgentContext {
  userId: string;
  role: string;
  tenantId?: string;
  module?: string;
  entityId?: string;
}

export interface ToolExecutionResult {
  toolCallId: string;
  toolName: string;
  result: unknown;
  error?: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

export interface AgentResponse {
  content: string;
  toolExecutions: ToolExecutionResult[];
  usage: { inputTokens: number; outputTokens: number };
  iterations: number;
}

export interface AuditEntry {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  timestamp: Date;
}

// ─── Permission Matrix ─────────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<string, Set<string>> = {
  ADMIN: new Set([
    'search_records', 'get_record', 'create_record', 'list_overdue_invoices',
    'get_inventory_status', 'get_financial_summary', 'get_employee_count',
    'run_report', 'send_notification', 'check_compliance',
  ]),
  NSM: new Set([
    'search_records', 'get_record', 'list_overdue_invoices',
    'get_inventory_status', 'get_financial_summary', 'get_employee_count',
    'run_report', 'send_notification', 'check_compliance',
  ]),
  BUM: new Set([
    'search_records', 'get_record', 'list_overdue_invoices',
    'get_inventory_status', 'get_financial_summary', 'get_employee_count',
    'run_report', 'send_notification',
  ]),
  DISTRICT_MANAGER: new Set([
    'search_records', 'get_record', 'list_overdue_invoices',
    'get_financial_summary', 'get_employee_count', 'run_report', 'send_notification',
  ]),
  MEDICAL_REP: new Set([
    'search_records', 'get_record', 'get_inventory_status', 'send_notification',
  ]),
  ACCOUNTANT: new Set([
    'search_records', 'get_record', 'list_overdue_invoices',
    'get_financial_summary', 'run_report',
  ]),
  WAREHOUSE: new Set([
    'search_records', 'get_record', 'get_inventory_status',
  ]),
  HR: new Set([
    'search_records', 'get_record', 'get_employee_count',
  ]),
  MARKETEER: new Set([
    'search_records', 'get_record', 'get_financial_summary',
    'run_report', 'send_notification',
  ]),
  EMPLOYEE: new Set([
    'search_records', 'get_record',
  ]),
  MANAGER: new Set([
    'search_records', 'get_record', 'list_overdue_invoices',
    'get_financial_summary', 'get_employee_count', 'run_report', 'send_notification',
  ]),
};

// ─── Tool Definitions ──────────────────────────────────────────────────────

export const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: 'search_records',
    description: 'Search any entity in the ERP by query string. Returns matching records with their IDs and key fields.',
    parameters: {
      type: 'object',
      properties: {
        entity: {
          type: 'string',
          enum: ['customer', 'invoice', 'product', 'employee', 'salesOrder', 'supplier', 'lead', 'opportunity', 'ticket', 'doctor', 'contact', 'department'],
          description: 'The entity type to search',
        },
        query: {
          type: 'string',
          description: 'Search query string',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default 10)',
        },
      },
      required: ['entity', 'query'],
    },
  },
  {
    name: 'get_record',
    description: 'Get a specific record by entity type and ID. Returns the full record with related data.',
    parameters: {
      type: 'object',
      properties: {
        entity: {
          type: 'string',
          enum: ['customer', 'invoice', 'product', 'employee', 'salesOrder', 'supplier', 'lead', 'opportunity', 'ticket', 'doctor', 'contact', 'department'],
          description: 'The entity type',
        },
        id: {
          type: 'string',
          description: 'The record ID',
        },
      },
      required: ['entity', 'id'],
    },
  },
  {
    name: 'create_record',
    description: 'Create a new record in the ERP. Requires confirmation before execution. Only use when explicitly asked to create something.',
    parameters: {
      type: 'object',
      properties: {
        entity: {
          type: 'string',
          enum: ['customer', 'invoice', 'product', 'salesOrder', 'lead', 'ticket', 'contact'],
          description: 'The entity type to create',
        },
        data: {
          type: 'object',
          description: 'The data for the new record',
        },
      },
      required: ['entity', 'data'],
    },
  },
  {
    name: 'list_overdue_invoices',
    description: 'List all invoices that are past their due date. Returns invoice numbers, amounts, customers, and days overdue.',
    parameters: {
      type: 'object',
      properties: {
        minDaysOverdue: {
          type: 'number',
          description: 'Minimum days overdue to include (default 0)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default 20)',
        },
      },
    },
  },
  {
    name: 'get_inventory_status',
    description: 'Check current stock levels for products. Can filter by product ID, category, or low-stock threshold.',
    parameters: {
      type: 'object',
      properties: {
        productId: {
          type: 'string',
          description: 'Specific product ID to check',
        },
        category: {
          type: 'string',
          description: 'Filter by product category',
        },
        lowStockOnly: {
          type: 'boolean',
          description: 'Only return products below reorder level',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default 20)',
        },
      },
    },
  },
  {
    name: 'get_financial_summary',
    description: 'Get financial summary including revenue, expenses, profit for a given period.',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['today', 'this_week', 'this_month', 'this_quarter', 'this_year', 'last_month', 'last_quarter'],
          description: 'The time period for the summary',
        },
      },
      required: ['period'],
    },
  },
  {
    name: 'get_employee_count',
    description: 'Get headcount broken down by department, status, or other criteria.',
    parameters: {
      type: 'object',
      properties: {
        groupBy: {
          type: 'string',
          enum: ['department', 'status', 'position'],
          description: 'How to group the headcount',
        },
        departmentId: {
          type: 'string',
          description: 'Filter by specific department ID',
        },
      },
    },
  },
  {
    name: 'run_report',
    description: 'Execute a report query. Supports predefined report types.',
    parameters: {
      type: 'object',
      properties: {
        reportType: {
          type: 'string',
          enum: [
            'sales_by_customer', 'sales_by_product', 'invoice_aging',
            'inventory_valuation', 'purchase_summary', 'lead_pipeline',
            'ticket_summary', 'revenue_trend',
          ],
          description: 'The type of report to run',
        },
        period: {
          type: 'string',
          enum: ['this_month', 'last_month', 'this_quarter', 'this_year'],
          description: 'Time period for the report',
        },
        limit: {
          type: 'number',
          description: 'Maximum rows (default 20)',
        },
      },
      required: ['reportType'],
    },
  },
  {
    name: 'send_notification',
    description: 'Send a notification to a user or all users with a specific role. Requires confirmation.',
    parameters: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'Target user ID (mutually exclusive with role)',
        },
        role: {
          type: 'string',
          description: 'Target role — sends to all users with this role',
        },
        title: {
          type: 'string',
          description: 'Notification title',
        },
        message: {
          type: 'string',
          description: 'Notification message body',
        },
        type: {
          type: 'string',
          enum: ['INFO', 'WARNING', 'SUCCESS', 'ERROR'],
          description: 'Notification type (default INFO)',
        },
      },
      required: ['title', 'message'],
    },
  },
  {
    name: 'check_compliance',
    description: 'Check compliance status across various areas: overdue invoices, expired contracts, pending approvals, license expirations.',
    parameters: {
      type: 'object',
      properties: {
        area: {
          type: 'string',
          enum: ['invoices', 'contracts', 'approvals', 'all'],
          description: 'Compliance area to check (default all)',
        },
      },
    },
  },
];

// ─── Tool Implementations ──────────────────────────────────────────────────

async function executeToolCall(
  tool: ToolCall,
  context: AgentContext,
): Promise<ToolExecutionResult> {
  const args = tool.arguments;

  try {
    switch (tool.name) {
      case 'search_records':
        return { toolCallId: tool.id, toolName: tool.name, result: await searchRecords(args) };
      case 'get_record':
        return { toolCallId: tool.id, toolName: tool.name, result: await getRecord(args) };
      case 'create_record':
        return {
          toolCallId: tool.id,
          toolName: tool.name,
          result: null,
          requiresConfirmation: true,
          confirmationMessage: `Create a new ${args.entity} record with the provided data? This action will modify the database.`,
        };
      case 'list_overdue_invoices':
        return { toolCallId: tool.id, toolName: tool.name, result: await listOverdueInvoices(args) };
      case 'get_inventory_status':
        return { toolCallId: tool.id, toolName: tool.name, result: await getInventoryStatus(args) };
      case 'get_financial_summary':
        return { toolCallId: tool.id, toolName: tool.name, result: await getFinancialSummary(args) };
      case 'get_employee_count':
        return { toolCallId: tool.id, toolName: tool.name, result: await getEmployeeCount(args) };
      case 'run_report':
        return { toolCallId: tool.id, toolName: tool.name, result: await runReport(args) };
      case 'send_notification':
        return {
          toolCallId: tool.id,
          toolName: tool.name,
          result: null,
          requiresConfirmation: true,
          confirmationMessage: `Send notification "${args.title}" to ${args.userId ? `user ${args.userId}` : `all ${args.role} users`}?`,
        };
      case 'check_compliance':
        return { toolCallId: tool.id, toolName: tool.name, result: await checkCompliance(args) };
      default:
        return { toolCallId: tool.id, toolName: tool.name, result: null, error: `Unknown tool: ${tool.name}` };
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { toolCallId: tool.id, toolName: tool.name, result: null, error: errorMsg };
  }
}

async function searchRecords(args: Record<string, unknown>): Promise<unknown> {
  const entity = String(args.entity);
  const query = String(args.query || '');
  const limit = Math.min(Number(args.limit) || 10, 50);

  const searchFilter = { contains: query, mode: 'insensitive' as const };

  switch (entity) {
    case 'customer': {
      const records = await prisma.account.findMany({
        where: {
          OR: [
            { name: searchFilter },
            { email: searchFilter },
            { phone: searchFilter },
          ],
        },
        take: limit,
        select: { id: true, name: true, email: true, phone: true, type: true, city: true, industry: true },
      });
      return { entity, count: records.length, records };
    }
    case 'invoice': {
      const records = await prisma.invoice.findMany({
        where: {
          OR: [
            { invoiceNumber: searchFilter },
            { notes: searchFilter },
          ],
        },
        take: limit,
        select: { id: true, invoiceNumber: true, status: true, total: true, dueDate: true, createdAt: true, customer: { select: { name: true } } },
      });
      return { entity, count: records.length, records };
    }
    case 'product': {
      const records = await prisma.product.findMany({
        where: {
          OR: [
            { name: searchFilter },
            { sku: searchFilter },
            { description: searchFilter },
          ],
        },
        take: limit,
        select: { id: true, name: true, sku: true, category: true, unitPrice: true, quantity: true, reorderLevel: true, status: true },
      });
      return { entity, count: records.length, records };
    }
    case 'employee': {
      const records = await prisma.employee.findMany({
        where: {
          OR: [
            { firstName: searchFilter },
            { lastName: searchFilter },
            { email: searchFilter },
            { position: searchFilter },
          ],
        },
        take: limit,
        select: { id: true, firstName: true, lastName: true, email: true, position: true, status: true, department: { select: { name: true } } },
      });
      return { entity, count: records.length, records };
    }
    case 'salesOrder': {
      const records = await prisma.salesOrder.findMany({
        where: {
          OR: [
            { orderNumber: searchFilter },
            { notes: searchFilter },
          ],
        },
        take: limit,
        select: { id: true, orderNumber: true, status: true, total: true, date: true, customer: { select: { name: true } } },
      });
      return { entity, count: records.length, records };
    }
    case 'supplier': {
      const records = await prisma.supplier.findMany({
        where: {
          OR: [
            { name: searchFilter },
            { email: searchFilter },
          ],
        },
        take: limit,
        select: { id: true, name: true, email: true, phone: true, status: true, city: true },
      });
      return { entity, count: records.length, records };
    }
    case 'lead': {
      const records = await prisma.lead.findMany({
        where: {
          OR: [
            { firstName: searchFilter },
            { lastName: searchFilter },
            { email: searchFilter },
            { company: searchFilter },
          ],
        },
        take: limit,
        select: { id: true, firstName: true, lastName: true, email: true, company: true, status: true, score: true },
      });
      return { entity, count: records.length, records };
    }
    case 'opportunity': {
      const records = await prisma.opportunity.findMany({
        where: {
          OR: [
            { title: searchFilter },
            { notes: searchFilter },
          ],
        },
        take: limit,
        select: { id: true, title: true, stage: true, value: true, probability: true },
      });
      return { entity, count: records.length, records };
    }
    case 'ticket': {
      const records = await prisma.ticket.findMany({
        where: {
          OR: [
            { ticketNumber: searchFilter },
            { subject: searchFilter },
            { description: searchFilter },
          ],
        },
        take: limit,
        select: { id: true, ticketNumber: true, subject: true, status: true, priority: true, category: true },
      });
      return { entity, count: records.length, records };
    }
    case 'doctor': {
      const records = await prisma.doctor.findMany({
        where: {
          OR: [
            { name: searchFilter },
            { specialty: searchFilter },
          ],
        },
        take: limit,
        select: { id: true, name: true, specialty: true, classification: true, city: true },
      });
      return { entity, count: records.length, records };
    }
    case 'contact': {
      const records = await prisma.contact.findMany({
        where: {
          OR: [
            { firstName: searchFilter },
            { lastName: searchFilter },
            { email: searchFilter },
          ],
        },
        take: limit,
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, title: true },
      });
      return { entity, count: records.length, records };
    }
    case 'department': {
      const records = await prisma.department.findMany({
        where: {
          OR: [
            { name: searchFilter },
            { description: searchFilter },
          ],
        },
        take: limit,
        select: { id: true, name: true, description: true },
      });
      return { entity, count: records.length, records };
    }
    default:
      return { error: `Unknown entity type: ${entity}` };
  }
}

async function getRecord(args: Record<string, unknown>): Promise<unknown> {
  const entity = String(args.entity);
  const id = String(args.id);

  switch (entity) {
    case 'customer':
      return prisma.account.findUnique({
        where: { id },
        include: { contacts: true, invoices: { take: 5, orderBy: { createdAt: 'desc' } }, salesOrders: { take: 5, orderBy: { createdAt: 'desc' } } },
      });
    case 'invoice':
      return prisma.invoice.findUnique({
        where: { id },
        include: { customer: true, items: true, payments: true },
      });
    case 'product':
      return prisma.product.findUnique({
        where: { id },
        include: { stockMovements: { take: 10, orderBy: { date: 'desc' } } },
      });
    case 'employee':
      return prisma.employee.findUnique({
        where: { id },
        include: { department: true, leaveRequests: { take: 5, orderBy: { createdAt: 'desc' } } },
      });
    case 'salesOrder':
      return prisma.salesOrder.findUnique({
        where: { id },
        include: { customer: true, items: { include: { product: true } } },
      });
    case 'supplier':
      return prisma.supplier.findUnique({
        where: { id },
        include: { purchaseOrders: { take: 5, orderBy: { createdAt: 'desc' } } },
      });
    case 'lead':
      return prisma.lead.findUnique({
        where: { id },
        include: { opportunities: true },
      });
    case 'opportunity':
      return prisma.opportunity.findUnique({
        where: { id },
        include: { account: true, contact: true, lead: true },
      });
    case 'ticket':
      return prisma.ticket.findUnique({
        where: { id },
        include: { account: true, contact: true },
      });
    case 'doctor':
      return prisma.doctor.findUnique({
        where: { id },
        include: { assignedRep: true, visits: { take: 10, orderBy: { dateTime: 'desc' } } },
      });
    case 'contact':
      return prisma.contact.findUnique({
        where: { id },
        include: { account: true },
      });
    case 'department':
      return prisma.department.findUnique({
        where: { id },
        include: { employees: { select: { id: true, firstName: true, lastName: true, position: true, status: true } } },
      });
    default:
      return { error: `Unknown entity type: ${entity}` };
  }
}

async function listOverdueInvoices(args: Record<string, unknown>): Promise<unknown> {
  const minDays = Number(args.minDaysOverdue) || 0;
  const limit = Math.min(Number(args.limit) || 20, 100);
  const now = new Date();
  const cutoff = new Date(now.getTime() - minDays * 86_400_000);

  const invoices = await prisma.invoice.findMany({
    where: {
      status: { in: ['SENT', 'OVERDUE'] },
      dueDate: { lt: cutoff },
    },
    include: { customer: { select: { name: true } } },
    orderBy: { dueDate: 'asc' },
    take: limit,
  });

  const results = invoices.map((inv: { invoiceNumber: string; total: number; dueDate: Date; status: string; customer: { name: string } }) => ({
    invoiceNumber: inv.invoiceNumber,
    total: inv.total,
    dueDate: inv.dueDate,
    daysOverdue: Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86_400_000),
    status: inv.status,
    customerName: inv.customer?.name,
  }));

  const totalOverdue = results.reduce((sum: number, r: { total: number }) => sum + r.total, 0);

  return {
    count: results.length,
    totalOverdueAmount: totalOverdue,
    invoices: results,
  };
}

async function getInventoryStatus(args: Record<string, unknown>): Promise<unknown> {
  const limit = Math.min(Number(args.limit) || 20, 100);
  const where: Record<string, unknown> = { status: 'ACTIVE' };

  if (args.productId) {
    where.id = String(args.productId);
  }
  if (args.category) {
    where.category = String(args.category);
  }
  if (args.lowStockOnly) {
    // Compare quantity to reorderLevel at the application level
    // since Prisma doesn't support field-to-field comparisons directly
  }

  const products = await prisma.product.findMany({
    where,
    select: {
      id: true, name: true, sku: true, category: true,
      quantity: true, reorderLevel: true, unitPrice: true, costPrice: true,
    },
    orderBy: { quantity: 'asc' },
    take: limit,
  });

  let filtered = products;
  if (args.lowStockOnly) {
    filtered = products.filter((p: { quantity: number; reorderLevel: number }) => p.quantity <= p.reorderLevel);
  }

  const result = filtered.map((p: { id: string; name: string; sku: string; category: string | null; quantity: number; reorderLevel: number; unitPrice: number; costPrice: number }) => ({
    ...p,
    belowReorderLevel: p.quantity <= p.reorderLevel,
    stockValue: p.quantity * p.costPrice,
  }));

  return {
    count: result.length,
    totalStockValue: result.reduce((sum: number, p: { stockValue: number }) => sum + p.stockValue, 0),
    products: result,
  };
}

async function getFinancialSummary(args: Record<string, unknown>): Promise<unknown> {
  const period = String(args.period || 'this_month');
  const { startDate, endDate } = getPeriodDates(period);

  // Revenue from paid invoices
  const paidInvoices = await prisma.invoice.findMany({
    where: {
      status: 'PAID',
      date: { gte: startDate, lte: endDate },
    },
    select: { total: true },
  });
  const revenue = paidInvoices.reduce((sum: number, inv: { total: number }) => sum + inv.total, 0);

  // Expenses from paid bills
  const paidBills = await prisma.bill.findMany({
    where: {
      status: 'PAID',
      date: { gte: startDate, lte: endDate },
    },
    select: { total: true },
  });
  const expenses = paidBills.reduce((sum: number, bill: { total: number }) => sum + bill.total, 0);

  // Outstanding AR
  const outstandingInvoices = await prisma.invoice.findMany({
    where: { status: { in: ['SENT', 'OVERDUE'] } },
    select: { total: true },
  });
  const accountsReceivable = outstandingInvoices.reduce((sum: number, inv: { total: number }) => sum + inv.total, 0);

  // Outstanding AP
  const outstandingBills = await prisma.bill.findMany({
    where: { status: { in: ['RECEIVED', 'OVERDUE'] } },
    select: { total: true },
  });
  const accountsPayable = outstandingBills.reduce((sum: number, bill: { total: number }) => sum + bill.total, 0);

  // Payments received in period
  const incomingPayments = await prisma.payment.findMany({
    where: {
      type: 'INCOMING',
      date: { gte: startDate, lte: endDate },
    },
    select: { amount: true },
  });
  const cashIn = incomingPayments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);

  // Payments made in period
  const outgoingPayments = await prisma.payment.findMany({
    where: {
      type: 'OUTGOING',
      date: { gte: startDate, lte: endDate },
    },
    select: { amount: true },
  });
  const cashOut = outgoingPayments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);

  return {
    period,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    revenue,
    expenses,
    grossProfit: revenue - expenses,
    profitMargin: revenue > 0 ? ((revenue - expenses) / revenue * 100).toFixed(1) + '%' : '0%',
    accountsReceivable,
    accountsPayable,
    netCashFlow: cashIn - cashOut,
    cashIn,
    cashOut,
  };
}

async function getEmployeeCount(args: Record<string, unknown>): Promise<unknown> {
  const groupBy = String(args.groupBy || 'department');

  if (args.departmentId) {
    const employees = await prisma.employee.findMany({
      where: { departmentId: String(args.departmentId) },
      select: { id: true, firstName: true, lastName: true, position: true, status: true },
    });
    return {
      departmentId: args.departmentId,
      total: employees.length,
      byStatus: groupByField(employees, 'status'),
      employees,
    };
  }

  if (groupBy === 'department') {
    const departments = await prisma.department.findMany({
      include: {
        _count: { select: { employees: true } },
      },
    });
    const totalActive = await prisma.employee.count({ where: { status: 'ACTIVE' } });
    const totalAll = await prisma.employee.count();

    return {
      totalEmployees: totalAll,
      activeEmployees: totalActive,
      byDepartment: departments.map((d: { id: string; name: string; _count: { employees: number } }) => ({
        departmentId: d.id,
        departmentName: d.name,
        count: d._count.employees,
      })),
    };
  }

  if (groupBy === 'status') {
    const active = await prisma.employee.count({ where: { status: 'ACTIVE' } });
    const onLeave = await prisma.employee.count({ where: { status: 'ON_LEAVE' } });
    const terminated = await prisma.employee.count({ where: { status: 'TERMINATED' } });
    return {
      total: active + onLeave + terminated,
      byStatus: { ACTIVE: active, ON_LEAVE: onLeave, TERMINATED: terminated },
    };
  }

  if (groupBy === 'position') {
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: { position: true },
    });
    return {
      total: employees.length,
      byPosition: groupByField(employees, 'position'),
    };
  }

  return { error: 'Invalid groupBy parameter' };
}

async function runReport(args: Record<string, unknown>): Promise<unknown> {
  const reportType = String(args.reportType);
  const period = String(args.period || 'this_month');
  const limit = Math.min(Number(args.limit) || 20, 100);
  const { startDate, endDate } = getPeriodDates(period);

  switch (reportType) {
    case 'sales_by_customer': {
      const orders = await prisma.salesOrder.findMany({
        where: { date: { gte: startDate, lte: endDate }, status: { not: 'CANCELLED' } },
        include: { customer: { select: { name: true } } },
      });
      const byCustomer: Record<string, { name: string; total: number; count: number }> = {};
      for (const o of orders) {
        const name = (o as { customer: { name: string } }).customer?.name || 'Unknown';
        if (!byCustomer[name]) byCustomer[name] = { name, total: 0, count: 0 };
        byCustomer[name].total += (o as { total: number }).total;
        byCustomer[name].count += 1;
      }
      return {
        reportType, period,
        data: Object.values(byCustomer).sort((a, b) => b.total - a.total).slice(0, limit),
      };
    }
    case 'sales_by_product': {
      const items = await prisma.salesOrderItem.findMany({
        where: {
          salesOrder: { date: { gte: startDate, lte: endDate }, status: { not: 'CANCELLED' } },
        },
        include: { product: { select: { name: true, sku: true } } },
      });
      const byProduct: Record<string, { name: string; sku: string; totalRevenue: number; totalQuantity: number }> = {};
      for (const item of items) {
        const i = item as { product: { name: string; sku: string }; total: number; quantity: number };
        const key = i.product?.sku || 'unknown';
        if (!byProduct[key]) byProduct[key] = { name: i.product?.name, sku: key, totalRevenue: 0, totalQuantity: 0 };
        byProduct[key].totalRevenue += i.total;
        byProduct[key].totalQuantity += i.quantity;
      }
      return {
        reportType, period,
        data: Object.values(byProduct).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, limit),
      };
    }
    case 'invoice_aging': {
      const now = new Date();
      const invoices = await prisma.invoice.findMany({
        where: { status: { in: ['SENT', 'OVERDUE'] } },
        include: { customer: { select: { name: true } } },
        orderBy: { dueDate: 'asc' },
        take: limit,
      });
      const buckets = { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, over_90: 0 };
      for (const inv of invoices) {
        const i = inv as { dueDate: Date; total: number };
        const days = Math.floor((now.getTime() - new Date(i.dueDate).getTime()) / 86_400_000);
        if (days <= 0) buckets.current += i.total;
        else if (days <= 30) buckets.days_1_30 += i.total;
        else if (days <= 60) buckets.days_31_60 += i.total;
        else if (days <= 90) buckets.days_61_90 += i.total;
        else buckets.over_90 += i.total;
      }
      return { reportType, agingBuckets: buckets, invoiceCount: invoices.length };
    }
    case 'inventory_valuation': {
      const products = await prisma.product.findMany({
        where: { status: 'ACTIVE' },
        select: { name: true, sku: true, quantity: true, costPrice: true, unitPrice: true, category: true },
        orderBy: { quantity: 'desc' },
        take: limit,
      });
      const data = products.map((p: { name: string; sku: string; quantity: number; costPrice: number; unitPrice: number; category: string | null }) => ({
        ...p,
        costValue: p.quantity * p.costPrice,
        retailValue: p.quantity * p.unitPrice,
      }));
      const totalCost = data.reduce((s: number, p: { costValue: number }) => s + p.costValue, 0);
      const totalRetail = data.reduce((s: number, p: { retailValue: number }) => s + p.retailValue, 0);
      return { reportType, totalCostValue: totalCost, totalRetailValue: totalRetail, products: data };
    }
    case 'purchase_summary': {
      const pos = await prisma.purchaseOrder.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        include: { supplier: { select: { name: true } } },
      });
      const byStatus: Record<string, number> = {};
      let total = 0;
      for (const po of pos) {
        const p = po as { status: string; total: number };
        byStatus[p.status] = (byStatus[p.status] || 0) + 1;
        total += p.total;
      }
      return { reportType, period, totalPOs: pos.length, totalValue: total, byStatus };
    }
    case 'lead_pipeline': {
      const leads = await prisma.lead.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { status: true, value: true, source: true },
      });
      const byStatus: Record<string, { count: number; totalValue: number }> = {};
      for (const l of leads) {
        const lead = l as { status: string; value: number | null };
        if (!byStatus[lead.status]) byStatus[lead.status] = { count: 0, totalValue: 0 };
        byStatus[lead.status].count += 1;
        byStatus[lead.status].totalValue += lead.value || 0;
      }
      return { reportType, period, totalLeads: leads.length, byStatus };
    }
    case 'ticket_summary': {
      const tickets = await prisma.ticket.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { status: true, priority: true, category: true, satisfaction: true },
      });
      const byStatus: Record<string, number> = {};
      const byPriority: Record<string, number> = {};
      for (const t of tickets) {
        const ticket = t as { status: string; priority: string };
        byStatus[ticket.status] = (byStatus[ticket.status] || 0) + 1;
        byPriority[ticket.priority] = (byPriority[ticket.priority] || 0) + 1;
      }
      const satisfactionScores = (tickets as { satisfaction: number | null }[])
        .map(t => t.satisfaction)
        .filter((s): s is number => s !== null);
      const avgSatisfaction = satisfactionScores.length > 0
        ? satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length
        : null;
      return { reportType, period, totalTickets: tickets.length, byStatus, byPriority, avgSatisfaction };
    }
    case 'revenue_trend': {
      const invoices = await prisma.invoice.findMany({
        where: { status: 'PAID', date: { gte: startDate, lte: endDate } },
        select: { total: true, date: true },
        orderBy: { date: 'asc' },
      });
      const byMonth: Record<string, number> = {};
      for (const inv of invoices) {
        const i = inv as { date: Date; total: number };
        const key = `${new Date(i.date).getFullYear()}-${String(new Date(i.date).getMonth() + 1).padStart(2, '0')}`;
        byMonth[key] = (byMonth[key] || 0) + i.total;
      }
      return { reportType, period, monthlyRevenue: byMonth };
    }
    default:
      return { error: `Unknown report type: ${reportType}` };
  }
}

async function checkCompliance(args: Record<string, unknown>): Promise<unknown> {
  const area = String(args.area || 'all');
  const now = new Date();
  const result: Record<string, unknown> = {};

  if (area === 'invoices' || area === 'all') {
    const overdueInvoices = await prisma.invoice.count({
      where: { status: { in: ['SENT', 'OVERDUE'] }, dueDate: { lt: now } },
    });
    const overdueAmount = await prisma.invoice.findMany({
      where: { status: { in: ['SENT', 'OVERDUE'] }, dueDate: { lt: now } },
      select: { total: true },
    });
    result.invoices = {
      overdueCount: overdueInvoices,
      overdueTotal: overdueAmount.reduce((s: number, i: { total: number }) => s + i.total, 0),
      status: overdueInvoices === 0 ? 'COMPLIANT' : overdueInvoices > 5 ? 'CRITICAL' : 'WARNING',
    };
  }

  if (area === 'contracts' || area === 'all') {
    const expiringContracts = await prisma.contract.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { lte: new Date(now.getTime() + 30 * 86_400_000) },
      },
      select: { id: true, title: true, endDate: true },
    });
    result.contracts = {
      expiringSoonCount: expiringContracts.length,
      contracts: expiringContracts,
      status: expiringContracts.length === 0 ? 'COMPLIANT' : 'WARNING',
    };
  }

  if (area === 'approvals' || area === 'all') {
    const pendingPOs = await prisma.purchaseOrder.count({ where: { status: 'DRAFT' } });
    const pendingLeaves = await prisma.leaveRequest.count({ where: { status: 'PENDING' } });
    result.approvals = {
      pendingPurchaseOrders: pendingPOs,
      pendingLeaveRequests: pendingLeaves,
      totalPending: pendingPOs + pendingLeaves,
      status: (pendingPOs + pendingLeaves) === 0 ? 'COMPLIANT' : (pendingPOs + pendingLeaves) > 10 ? 'CRITICAL' : 'WARNING',
    };
  }

  const statuses = Object.values(result).map((v) => (v as { status: string }).status);
  const overallStatus = statuses.includes('CRITICAL') ? 'CRITICAL' : statuses.includes('WARNING') ? 'WARNING' : 'COMPLIANT';

  return { overallStatus, areas: result, checkedAt: now.toISOString() };
}

// ─── Helper: execute create with confirmation ──────────────────────────────

async function executeCreate(entity: string, data: Record<string, unknown>, context: AgentContext): Promise<unknown> {
  switch (entity) {
    case 'lead':
      return prisma.lead.create({
        data: {
          tenantId: context.tenantId || 'default',
          firstName: String(data.firstName || ''),
          lastName: String(data.lastName || ''),
          email: data.email ? String(data.email) : undefined,
          phone: data.phone ? String(data.phone) : undefined,
          company: data.company ? String(data.company) : undefined,
          source: String(data.source || 'OTHER'),
          notes: data.notes ? String(data.notes) : undefined,
        },
      });
    case 'ticket':
      return prisma.ticket.create({
        data: {
          tenantId: context.tenantId || 'default',
          ticketNumber: `TKT-${Date.now().toString(36).toUpperCase()}`,
          subject: String(data.subject || ''),
          description: String(data.description || ''),
          priority: String(data.priority || 'MEDIUM'),
          category: data.category ? String(data.category) : undefined,
          assignedToId: data.assignedToId ? String(data.assignedToId) : undefined,
        },
      });
    case 'contact':
      return prisma.contact.create({
        data: {
          tenantId: context.tenantId || 'default',
          firstName: String(data.firstName || ''),
          lastName: String(data.lastName || ''),
          email: data.email ? String(data.email) : undefined,
          phone: data.phone ? String(data.phone) : undefined,
          title: data.title ? String(data.title) : undefined,
          accountId: data.accountId ? String(data.accountId) : undefined,
        },
      });
    default:
      throw new Error(`Creating ${entity} records via the AI agent is not supported. Please use the dedicated API endpoint.`);
  }
}

// ─── Helper: execute send notification ─────────────────────────────────────

async function executeSendNotification(args: Record<string, unknown>, context: AgentContext): Promise<unknown> {
  const title = String(args.title);
  const message = String(args.message);
  const type = String(args.type || 'INFO');
  const tenantId = context.tenantId || 'default';

  if (args.userId) {
    const notification = await prisma.notification.create({
      data: { tenantId, userId: String(args.userId), title, message, type },
    });
    return { sent: true, notificationId: notification.id };
  }

  if (args.role) {
    const users = await prisma.user.findMany({
      where: { role: String(args.role), isActive: true },
      select: { id: true },
    });
    const notifications = await Promise.all(
      users.map((u: { id: string }) =>
        prisma.notification.create({
          data: { tenantId, userId: u.id, title, message, type },
        })
      )
    );
    return { sent: true, recipientCount: notifications.length };
  }

  throw new Error('Either userId or role must be specified');
}

// ─── Audit Logging ─────────────────────────────────────────────────────────

async function logToolExecution(context: AgentContext, toolName: string, args: unknown, result: unknown): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: context.tenantId || 'default',
        userId: context.userId,
        action: `AI_TOOL_${toolName.toUpperCase()}`,
        entity: 'ai_agent',
        entityId: `agent-${Date.now().toString(36)}`,
        changes: JSON.stringify({ tool: toolName, args, resultSummary: typeof result === 'object' ? 'object' : String(result) }),
      },
    });
  } catch {
    // Audit logging should not break the agent flow
    console.error(`Failed to log audit entry for tool: ${toolName}`);
  }
}

// ─── Agent Executor ─────────────────────────────────────────────────────────

const MAX_ITERATIONS = 10;

const SYSTEM_PROMPT = `You are an intelligent ERP assistant with access to real business data. You can search records, view financial summaries, check inventory, analyze compliance, and more.

Guidelines:
- Always use the available tools to retrieve real data before answering questions.
- Present data clearly with specific numbers and details.
- When listing records, format them in a readable way.
- If you encounter an error from a tool, explain what happened and suggest alternatives.
- For destructive actions (creating records, sending notifications), always confirm with the user first.
- If a tool requires information you don't have, ask the user for clarification.
- Stay focused on ERP-related queries. Politely redirect off-topic questions.
- Use professional language appropriate for a business context.`;

export class AgentExecutor {
  private registry: ProviderRegistry;
  private pendingConfirmations: Map<string, { tool: ToolCall; context: AgentContext }> = new Map();

  constructor(registry?: ProviderRegistry) {
    this.registry = registry || ProviderRegistry.getInstance();
  }

  async execute(
    userMessage: string,
    conversationHistory: Message[],
    context: AgentContext,
  ): Promise<AgentResponse> {
    const messages: Message[] = [
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    const toolExecutions: ToolExecutionResult[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let iterations = 0;

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const chatOptions: ChatOptions = {
        systemPrompt: SYSTEM_PROMPT,
        tools: AGENT_TOOLS,
        temperature: 0.3,
        maxTokens: 4096,
      };

      let response: ChatResponse;
      try {
        response = await this.registry.chatWithFallback(messages, chatOptions);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'AI provider error';
        return {
          content: `I apologize, but I am unable to process your request right now. ${msg}`,
          toolExecutions,
          usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
          iterations,
        };
      }

      totalInputTokens += response.usage.inputTokens;
      totalOutputTokens += response.usage.outputTokens;

      // If no tool calls, return the final response
      if (response.toolCalls.length === 0) {
        return {
          content: response.content,
          toolExecutions,
          usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
          iterations,
        };
      }

      // Add assistant message to conversation (for multi-turn)
      if (response.content) {
        messages.push({ role: 'assistant', content: response.content });
      }

      // Execute each tool call
      for (const toolCall of response.toolCalls) {
        // Permission check
        const permissions = ROLE_PERMISSIONS[context.role] || ROLE_PERMISSIONS['EMPLOYEE'] || new Set();
        if (!permissions.has(toolCall.name)) {
          const denied: ToolExecutionResult = {
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            result: null,
            error: `Permission denied: your role (${context.role}) does not have access to the ${toolCall.name} tool.`,
          };
          toolExecutions.push(denied);
          messages.push({
            role: 'tool',
            content: JSON.stringify({ error: denied.error }),
            toolCallId: toolCall.id,
            name: toolCall.name,
          });
          continue;
        }

        // Execute the tool
        const execution = await executeToolCall(toolCall, context);

        // Handle confirmation-required tools
        if (execution.requiresConfirmation) {
          this.pendingConfirmations.set(toolCall.id, { tool: toolCall, context });
          execution.result = {
            status: 'awaiting_confirmation',
            message: execution.confirmationMessage,
          };
        }

        toolExecutions.push(execution);

        // Audit log
        await logToolExecution(context, toolCall.name, toolCall.arguments, execution.result);

        // Add tool result to messages for next iteration
        const toolContent = execution.error
          ? JSON.stringify({ error: execution.error })
          : JSON.stringify(execution.result);

        messages.push({
          role: 'tool',
          content: toolContent,
          toolCallId: toolCall.id,
          name: toolCall.name,
        });
      }
    }

    // Max iterations reached
    return {
      content: 'I have reached the maximum number of processing steps. Here is what I found so far based on the tool results above.',
      toolExecutions,
      usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
      iterations,
    };
  }

  /** Confirm a pending destructive action and execute it */
  async confirmAction(toolCallId: string): Promise<ToolExecutionResult> {
    const pending = this.pendingConfirmations.get(toolCallId);
    if (!pending) {
      return {
        toolCallId,
        toolName: 'unknown',
        result: null,
        error: 'No pending confirmation found for this tool call.',
      };
    }

    const { tool, context } = pending;
    this.pendingConfirmations.delete(toolCallId);

    try {
      let result: unknown;
      if (tool.name === 'create_record') {
        result = await executeCreate(
          String(tool.arguments.entity),
          tool.arguments.data as Record<string, unknown>,
          context,
        );
      } else if (tool.name === 'send_notification') {
        result = await executeSendNotification(tool.arguments, context);
      } else {
        return { toolCallId: tool.id, toolName: tool.name, result: null, error: 'Unknown confirmation type' };
      }

      await logToolExecution(context, tool.name, tool.arguments, result);
      return { toolCallId: tool.id, toolName: tool.name, result };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { toolCallId: tool.id, toolName: tool.name, result: null, error: errorMsg };
    }
  }

  /** Stream the agent response for real-time UI */
  async *executeStream(
    userMessage: string,
    conversationHistory: Message[],
    context: AgentContext,
  ): AsyncGenerator<{ type: 'text' | 'tool_start' | 'tool_result' | 'error'; data: string }> {
    const messages: Message[] = [
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    let iterations = 0;

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const chatOptions: ChatOptions = {
        systemPrompt: SYSTEM_PROMPT,
        tools: AGENT_TOOLS,
        temperature: 0.3,
        maxTokens: 4096,
      };

      // First, do a non-streaming call to check for tool use
      let response: ChatResponse;
      try {
        response = await this.registry.chatWithFallback(messages, chatOptions);
      } catch (err) {
        yield { type: 'error', data: err instanceof Error ? err.message : 'AI provider error' };
        return;
      }

      if (response.toolCalls.length === 0) {
        // Final text response -- stream it
        try {
          const streamMessages = [...messages];
          const streamOptions: ChatOptions = {
            ...chatOptions,
            tools: undefined, // No tools for final streaming
          };
          for await (const chunk of this.registry.chatStreamWithFallback(streamMessages, streamOptions)) {
            yield { type: 'text', data: chunk };
          }
        } catch {
          // If streaming fails, yield the non-streamed content
          yield { type: 'text', data: response.content };
        }
        return;
      }

      // Execute tool calls
      if (response.content) {
        messages.push({ role: 'assistant', content: response.content });
      }

      for (const toolCall of response.toolCalls) {
        const permissions = ROLE_PERMISSIONS[context.role] || ROLE_PERMISSIONS['EMPLOYEE'] || new Set();

        yield { type: 'tool_start', data: JSON.stringify({ id: toolCall.id, name: toolCall.name, args: toolCall.arguments }) };

        if (!permissions.has(toolCall.name)) {
          const error = `Permission denied for ${toolCall.name}`;
          yield { type: 'tool_result', data: JSON.stringify({ id: toolCall.id, error }) };
          messages.push({ role: 'tool', content: JSON.stringify({ error }), toolCallId: toolCall.id, name: toolCall.name });
          continue;
        }

        const execution = await executeToolCall(toolCall, context);
        await logToolExecution(context, toolCall.name, toolCall.arguments, execution.result);

        yield { type: 'tool_result', data: JSON.stringify({ id: toolCall.id, name: toolCall.name, result: execution.result, error: execution.error }) };

        const toolContent = execution.error
          ? JSON.stringify({ error: execution.error })
          : JSON.stringify(execution.result);
        messages.push({ role: 'tool', content: toolContent, toolCallId: toolCall.id, name: toolCall.name });
      }
    }

    yield { type: 'error', data: 'Maximum iterations reached' };
  }
}

// ─── Period date helpers ────────────────────────────────────────────────────

function getPeriodDates(period: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'this_week': {
      const dayOfWeek = now.getDay();
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
      break;
    }
    case 'this_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'last_month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case 'this_quarter': {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), qMonth, 1);
      break;
    }
    case 'last_quarter': {
      const lqMonth = Math.floor(now.getMonth() / 3) * 3 - 3;
      startDate = new Date(now.getFullYear(), lqMonth, 1);
      endDate = new Date(now.getFullYear(), lqMonth + 3, 0);
      break;
    }
    case 'this_year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return { startDate, endDate };
}

function groupByField<T extends Record<string, unknown>>(items: T[], field: string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) {
    const key = String(item[field] || 'Unknown');
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}
