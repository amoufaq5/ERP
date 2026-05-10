import { z } from 'zod';
import { createRouteHandlersWithId } from '@/lib/api/route-factory';

const updatePaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive').optional(),
  currency: z.string().length(3).optional(),
  date: z.string().datetime().optional(),
  method: z.enum(['BANK_TRANSFER', 'CHECK', 'CASH', 'CREDIT_CARD', 'WIRE', 'ACH', 'OTHER']).optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).optional(),
  reference: z.string().optional(),
  invoiceId: z.string().optional(),
  billId: z.string().optional(),
  accountId: z.string().optional(),
  notes: z.string().optional(),
  bankAccount: z.string().optional(),
  transactionId: z.string().optional(),
});

const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'finance/payments',
  modelName: 'payment',
  validationSchema: {
    update: updatePaymentSchema,
  },
  allowedIncludes: ['invoice', 'bill', 'vendor', 'customer'],
});

export { GET, PATCH, DELETE };
