import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  status: z.enum(['APPROVED', 'CONDITIONAL', 'PROBATION', 'DISQUALIFIED']).optional(),
  qualificationDate: z.string().optional(),
  lastAuditDate: z.string().optional(),
  nextAuditDate: z.string().optional(),
  overallScore: z.number().optional(),
  qualityScore: z.number().optional(),
  deliveryScore: z.number().optional(),
  complianceScore: z.number().optional(),
  issues: z.any().optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'supplier-quality',
  modelName: 'supplierQuality',
  validationSchema: { update: updateSchema },
  searchFields: ['supplierId', 'supplierName'],
});
