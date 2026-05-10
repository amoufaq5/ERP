import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1),
  contractNumber: z.string().min(1),
  type: z.enum(['PURCHASE', 'SALES', 'SERVICE', 'LEASE', 'NDA', 'EMPLOYMENT', 'OTHER']),
  status: z.enum(['DRAFT', 'REVIEW', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'RENEWED']),
  supplierId: z.string().optional(),
  customerId: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  value: z.number().min(0).optional(),
  currency: z.string(),
  paymentTerms: z.string().optional(),
  autoRenew: z.boolean(),
  renewalNoticeDays: z.number().min(0).optional(),
  terms: z.string().optional(),
  notes: z.string().optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'contracts',
  modelName: 'contract',
  validationSchema: { update: updateSchema },
  allowedIncludes: ['supplier'],
});
