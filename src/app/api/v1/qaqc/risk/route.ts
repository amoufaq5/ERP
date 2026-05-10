import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['PROCESS', 'PRODUCT', 'EQUIPMENT', 'FACILITY']),
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'APPROVED']).default('DRAFT'),
  methodology: z.enum(['FMEA', 'HACCP', 'FTA', 'PHA']),
  scope: z.string().optional(),
  team: z.string().optional(),
  hazards: z.any().optional(),
  overallRiskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  mitigations: z.string().optional(),
  reviewDate: z.string().optional(),
});

const updateSchema = createSchema.partial();

export const { GET, POST } = createRouteHandlers({
  entity: 'risk',
  modelName: 'riskAssessment',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['title', 'scope', 'team'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
});
