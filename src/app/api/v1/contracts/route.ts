import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1),
  contractNumber: z.string().min(1),
  type: z.enum(['PURCHASE', 'SALES', 'SERVICE', 'LEASE', 'NDA', 'EMPLOYMENT', 'OTHER']).default('PURCHASE'),
  status: z.enum(['DRAFT', 'REVIEW', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'RENEWED']).default('DRAFT'),
  supplierId: z.string().optional(),
  customerId: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  value: z.number().min(0).optional(),
  currency: z.string().default('EGP'),
  paymentTerms: z.string().optional(),
  autoRenew: z.boolean().default(false),
  renewalNoticeDays: z.number().min(0).optional(),
  terms: z.string().optional(),
  notes: z.string().optional(),
});

export const { GET, POST } = createRouteHandlers({
  entity: 'contracts',
  modelName: 'contract',
  validationSchema: { create: createSchema, update: createSchema.partial() },
  searchFields: ['title', 'contractNumber'],
  defaultSort: { field: 'endDate', direction: 'asc' },
  allowedIncludes: ['supplier'],
});
