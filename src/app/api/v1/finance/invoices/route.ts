import { z } from 'zod';
import { createRouteHandlers } from '@/lib/api/route-factory';

const lineItemSchema = z.object({
  description: z.string().min(1, 'Line item description is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  taxRate: z.number().min(0).max(100).optional().default(0),
  accountId: z.string().optional(),
});

const createInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  customerId: z.string().min(1, 'Customer ID is required'),
  issueDate: z.string().datetime({ message: 'Invalid issue date format' }),
  dueDate: z.string().datetime({ message: 'Invalid due date format' }),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code').default('USD'),
  notes: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional().default(0),
  discountAmount: z.number().nonnegative().optional().default(0),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'CANCELLED', 'OVERDUE']).default('DRAFT'),
  billingAddress: z.string().optional(),
  reference: z.string().optional(),
});

const updateInvoiceSchema = createInvoiceSchema.partial();

const { GET, POST } = createRouteHandlers({
  entity: 'finance/invoices',
  modelName: 'invoice',
  validationSchema: {
    create: createInvoiceSchema,
    update: updateInvoiceSchema,
  },
  searchFields: ['invoiceNumber', 'notes', 'reference'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
  allowedIncludes: ['customer', 'lineItems', 'payments'],
  hooks: {
    beforeCreate: async (data) => {
      // Calculate line item totals and invoice total
      const lineItems = data.lineItems || [];
      let subtotal = 0;
      const processedItems = lineItems.map((item: z.infer<typeof lineItemSchema>) => {
        const lineTotal = item.quantity * item.unitPrice;
        const lineTax = lineTotal * ((item.taxRate || 0) / 100);
        subtotal += lineTotal + lineTax;
        return { ...item, total: lineTotal + lineTax };
      });

      const taxAmount = subtotal * ((data.taxRate || 0) / 100);
      const total = subtotal + taxAmount - (data.discountAmount || 0);

      return {
        ...data,
        lineItems: processedItems,
        subtotal,
        taxAmount,
        total,
      };
    },
  },
});

export { GET, POST };
