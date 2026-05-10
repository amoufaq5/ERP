import { z } from 'zod';
import { createRouteHandlersWithId } from '@/lib/api/route-factory';

const updateBillSchema = z.object({
  billNumber: z.string().min(1).optional(),
  vendorId: z.string().min(1).optional(),
  issueDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().optional(),
  reference: z.string().optional(),
});

const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'finance/bills',
  modelName: 'bill',
  validationSchema: {
    update: updateBillSchema,
  },
  allowedIncludes: ['vendor', 'lineItems', 'payments', 'approver'],
});

export { GET, PATCH, DELETE };
