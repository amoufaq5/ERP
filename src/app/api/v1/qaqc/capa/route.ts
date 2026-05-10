import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  number: z.string().optional(),
  title: z.string().min(1),
  type: z.enum(['CORRECTIVE', 'PREVENTIVE']),
  status: z.enum(['OPEN', 'INVESTIGATION', 'ACTION_PLAN', 'IMPLEMENTATION', 'VERIFICATION', 'CLOSED']).default('OPEN'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  source: z.string().optional(),
  description: z.string().optional(),
  rootCause: z.string().optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
});

const updateSchema = createSchema.partial();

export const { GET, POST } = createRouteHandlers({
  entity: 'capa',
  modelName: 'cAPA',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['title', 'number', 'description', 'source'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
  allowedIncludes: ['actions', 'findings'],
});
