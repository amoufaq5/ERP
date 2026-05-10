import { z } from 'zod';
import { createRouteHandlersWithId } from '@/lib/api/route-factory';

const lineItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Line item description is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  taxRate: z.number().min(0).max(100).optional().default(0),
  accountId: z.string().optional(),
});

const updateInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1).optional(),
  customerId: z.string().min(1).optional(),
  issueDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  lineItems: z.array(lineItemSchema).min(1).optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  discountAmount: z.number().nonnegative().optional(),
  billingAddress: z.string().optional(),
  reference: z.string().optional(),
});

const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'finance/invoices',
  modelName: 'invoice',
  validationSchema: {
    update: updateInvoiceSchema,
  },
  allowedIncludes: ['customer', 'lineItems', 'payments'],
});

export { GET, PATCH, DELETE };
