import { z } from 'zod';
import { createRouteHandlers } from '@/lib/api/route-factory';

const createPaymentSchema = z.object({
  paymentNumber: z.string().min(1, 'Payment number is required'),
  type: z.enum(['INCOMING', 'OUTGOING']),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code').default('USD'),
  date: z.string().datetime({ message: 'Invalid payment date format' }),
  method: z.enum(['BANK_TRANSFER', 'CHECK', 'CASH', 'CREDIT_CARD', 'WIRE', 'ACH', 'OTHER']),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).default('PENDING'),
  reference: z.string().optional(),
  invoiceId: z.string().optional(),
  billId: z.string().optional(),
  accountId: z.string().optional(),
  vendorId: z.string().optional(),
  customerId: z.string().optional(),
  notes: z.string().optional(),
  bankAccount: z.string().optional(),
  transactionId: z.string().optional(),
});

const updatePaymentSchema = createPaymentSchema.partial();

const { GET, POST } = createRouteHandlers({
  entity: 'finance/payments',
  modelName: 'payment',
  validationSchema: {
    create: createPaymentSchema,
    update: updatePaymentSchema,
  },
  searchFields: ['paymentNumber', 'reference', 'transactionId', 'notes'],
  defaultSort: { field: 'date', direction: 'desc' },
  allowedIncludes: ['invoice', 'bill', 'vendor', 'customer'],
});

export { GET, POST };
