import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  batchNumber: z.string().min(1).optional(),
  productId: z.string().optional(),
  workOrderId: z.string().optional(),
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'UNDER_REVIEW', 'RELEASED', 'REJECTED']).optional(),
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
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'batch-records',
  modelName: 'manufacturingBatchRecord',
  validationSchema: { update: updateSchema },
  searchFields: ['batchNumber', 'operatorNotes'],
});
