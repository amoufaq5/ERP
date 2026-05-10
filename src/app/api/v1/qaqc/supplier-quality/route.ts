import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  supplierId: z.string().min(1),
  supplierName: z.string().min(1),
  status: z.enum(['APPROVED', 'CONDITIONAL', 'PROBATION', 'DISQUALIFIED']).default('APPROVED'),
  qualificationDate: z.string().optional(),
  lastAuditDate: z.string().optional(),
  nextAuditDate: z.string().optional(),
  overallScore: z.number().optional(),
  qualityScore: z.number().optional(),
  deliveryScore: z.number().optional(),
  complianceScore: z.number().optional(),
  issues: z.any().optional(),
});

const updateSchema = createSchema.partial();

export const { GET, POST } = createRouteHandlers({
  entity: 'supplier-quality',
  modelName: 'supplierQuality',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['supplierId', 'supplierName'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
});
