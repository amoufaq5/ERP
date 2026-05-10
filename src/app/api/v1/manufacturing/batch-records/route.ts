import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  batchNumber: z.string().min(1),
  productId: z.string().min(1),
  workOrderId: z.string().optional(),
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'UNDER_REVIEW', 'RELEASED', 'REJECTED']).default('IN_PROGRESS'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  yield: z.number().optional(),
  theoreticalYield: z.number().optional(),
  actualYield: z.number().optional(),
  operatorNotes: z.string().optional(),
  reviewedBy: z.string().optional(),
  reviewDate: z.string().optional(),
  approvedBy: z.string().optional(),
  approvalDate: z.string().optional(),
  deviations: z.any().optional(),
});

const updateSchema = createSchema.partial();

export const { GET, POST } = createRouteHandlers({
  entity: 'batch-records',
  modelName: 'manufacturingBatchRecord',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['batchNumber', 'operatorNotes'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
});
