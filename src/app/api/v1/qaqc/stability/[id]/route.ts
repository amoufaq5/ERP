import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  protocol: z.string().optional(),
  product: z.string().optional(),
  batchNumber: z.string().optional(),
  condition: z.string().optional(),
  status: z.enum(['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  conclusion: z.string().optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'stability',
  modelName: 'stabilityStudy',
  validationSchema: { update: updateSchema },
  searchFields: ['protocol', 'product', 'batchNumber'],
  allowedIncludes: ['timepoints'],
});
