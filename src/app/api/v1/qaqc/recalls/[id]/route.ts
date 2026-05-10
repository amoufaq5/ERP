import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  number: z.string().optional(),
  title: z.string().optional(),
  type: z.enum(['CLASS_I', 'CLASS_II', 'CLASS_III']).optional(),
  status: z.enum(['INITIATED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED']).optional(),
  product: z.string().optional(),
  batchNumbers: z.string().optional(),
  reason: z.string().optional(),
  affectedQuantity: z.number().optional(),
  distributionScope: z.string().optional(),
  healthHazard: z.string().optional(),
  strategy: z.string().optional(),
  effectiveness: z.string().optional(),
  initiatedBy: z.string().optional(),
  initiatedDate: z.string().optional(),
  closedDate: z.string().optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'recalls',
  modelName: 'recall',
  validationSchema: { update: updateSchema },
  searchFields: ['number', 'title', 'product'],
});
