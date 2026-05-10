import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(['PLANNED', 'UNPLANNED']).optional(),
  status: z.enum(['OPEN', 'UNDER_INVESTIGATION', 'CAPA_REQUIRED', 'CLOSED']).optional(),
  severity: z.enum(['CRITICAL', 'MAJOR', 'MINOR']).optional(),
  department: z.string().optional(),
  description: z.string().optional(),
  rootCause: z.string().optional(),
  impactAssessment: z.string().optional(),
  immediateAction: z.string().optional(),
  capaId: z.string().optional(),
  reportedBy: z.string().optional(),
  reportedDate: z.string().optional(),
  closedDate: z.string().optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'deviations',
  modelName: 'deviation',
  validationSchema: { update: updateSchema },
  searchFields: ['title', 'number', 'description'],
});
