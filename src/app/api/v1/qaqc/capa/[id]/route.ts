import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(['CORRECTIVE', 'PREVENTIVE']).optional(),
  status: z.enum(['OPEN', 'INVESTIGATION', 'ACTION_PLAN', 'IMPLEMENTATION', 'VERIFICATION', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  source: z.string().optional(),
  description: z.string().optional(),
  rootCause: z.string().optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
  effectivenessCheck: z.string().optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'capa',
  modelName: 'cAPA',
  validationSchema: { update: updateSchema },
  searchFields: ['title', 'number'],
  allowedIncludes: ['actions', 'findings'],
});
