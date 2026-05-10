import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  protocol: z.string().min(1),
  product: z.string().min(1),
  batchNumber: z.string().min(1),
  condition: z.string().optional(),
  status: z.enum(['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED']).default('PLANNED'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  conclusion: z.string().optional(),
});

const updateSchema = createSchema.partial();

export const { GET, POST } = createRouteHandlers({
  entity: 'stability',
  modelName: 'stabilityStudy',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['protocol', 'product', 'batchNumber'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
  allowedIncludes: ['timepoints'],
});
