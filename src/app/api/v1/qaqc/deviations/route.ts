import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  number: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(['PLANNED', 'UNPLANNED']),
  status: z.enum(['OPEN', 'UNDER_INVESTIGATION', 'CAPA_REQUIRED', 'CLOSED']).default('OPEN'),
  severity: z.enum(['CRITICAL', 'MAJOR', 'MINOR']),
  department: z.string().optional(),
  description: z.string().optional(),
  rootCause: z.string().optional(),
  impactAssessment: z.string().optional(),
  immediateAction: z.string().optional(),
  capaId: z.string().optional(),
  reportedBy: z.string().optional(),
  reportedDate: z.string().optional(),
});

const updateSchema = createSchema.partial();

export const { GET, POST } = createRouteHandlers({
  entity: 'deviations',
  modelName: 'deviation',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['title', 'number', 'description', 'department'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
});
