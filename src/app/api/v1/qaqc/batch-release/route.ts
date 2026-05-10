import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  batchNumber: z.string().min(1),
  productId: z.string().min(1),
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']).default('PENDING'),
  reviewedBy: z.string().optional(),
  approvedBy: z.string().optional(),
  releaseDate: z.string().optional(),
  expiryDate: z.string().optional(),
  qaDecision: z.string().optional(),
  notes: z.string().optional(),
  signatureHash: z.string().optional(),
});

const updateSchema = createSchema.partial();

export const { GET, POST } = createRouteHandlers({
  entity: 'batch-release',
  modelName: 'batchRelease',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['batchNumber', 'qaDecision', 'notes'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
  allowedIncludes: ['product'],
});
