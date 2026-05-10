import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  number: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(['CLASS_I', 'CLASS_II', 'CLASS_III']),
  status: z.enum(['INITIATED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED']).default('INITIATED'),
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
});

const updateSchema = createSchema.partial();

export const { GET, POST } = createRouteHandlers({
  entity: 'recalls',
  modelName: 'recall',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['number', 'title', 'product', 'batchNumbers', 'reason'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
});
