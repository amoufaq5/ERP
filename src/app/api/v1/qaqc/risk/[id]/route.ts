import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().optional(),
  type: z.enum(['PROCESS', 'PRODUCT', 'EQUIPMENT', 'FACILITY']).optional(),
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'APPROVED']).optional(),
  methodology: z.enum(['FMEA', 'HACCP', 'FTA', 'PHA']).optional(),
  scope: z.string().optional(),
  team: z.string().optional(),
  hazards: z.any().optional(),
  overallRiskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  mitigations: z.string().optional(),
  reviewDate: z.string().optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'risk',
  modelName: 'riskAssessment',
  validationSchema: { update: updateSchema },
  searchFields: ['title', 'scope'],
});
