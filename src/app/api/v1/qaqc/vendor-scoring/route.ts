import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  vendorId: z.string().min(1),
  vendorName: z.string().min(1),
  period: z.string().min(1),
  qualityScore: z.number(),
  deliveryScore: z.number(),
  priceScore: z.number(),
  serviceScore: z.number(),
  overallScore: z.number(),
  evaluatedBy: z.string().optional(),
  evaluationDate: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial();

export const { GET, POST } = createRouteHandlers({
  entity: 'vendor-scoring',
  modelName: 'vendorScore',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['vendorName', 'vendorId', 'period'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
});
