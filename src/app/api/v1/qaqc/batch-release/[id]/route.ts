import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  batchNumber: z.string().min(1).optional(),
  productId: z.string().optional(),
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']).optional(),
  reviewedBy: z.string().optional(),
  approvedBy: z.string().optional(),
  releaseDate: z.string().optional(),
  expiryDate: z.string().optional(),
  qaDecision: z.string().optional(),
  notes: z.string().optional(),
  signatureHash: z.string().optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'batch-release',
  modelName: 'batchRelease',
  validationSchema: { update: updateSchema },
  searchFields: ['batchNumber', 'qaDecision'],
  allowedIncludes: ['product'],
});
