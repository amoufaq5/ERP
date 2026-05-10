import { z } from 'zod';
import { createRouteHandlers } from '@/lib/api/route-factory';

const billLineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  accountId: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional().default(0),
});

const createBillSchema = z.object({
  billNumber: z.string().min(1, 'Bill number is required'),
  vendorId: z.string().min(1, 'Vendor ID is required'),
  issueDate: z.string().datetime({ message: 'Invalid issue date format' }),
  dueDate: z.string().datetime({ message: 'Invalid due date format' }),
  lineItems: z.array(billLineItemSchema).min(1, 'At least one line item is required'),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code').default('USD'),
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED']).default('DRAFT'),
  notes: z.string().optional(),
  reference: z.string().optional(),
  approvedBy: z.string().optional(),
  approvedAt: z.string().datetime().optional(),
});

const updateBillSchema = createBillSchema.partial();

const { GET, POST } = createRouteHandlers({
  entity: 'finance/bills',
  modelName: 'bill',
  validationSchema: {
    create: createBillSchema,
    update: updateBillSchema,
  },
  searchFields: ['billNumber', 'notes', 'reference'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
  allowedIncludes: ['vendor', 'lineItems', 'payments', 'approver'],
  hooks: {
    beforeCreate: async (data) => {
      const lineItems = data.lineItems || [];
      let subtotal = 0;
      lineItems.forEach((item: z.infer<typeof billLineItemSchema>) => {
        const lineTotal = item.quantity * item.unitPrice;
        const lineTax = lineTotal * ((item.taxRate || 0) / 100);
        subtotal += lineTotal + lineTax;
      });
      return { ...data, subtotal, total: subtotal };
    },
  },
});

export { GET, POST };
