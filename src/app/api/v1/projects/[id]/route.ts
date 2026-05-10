import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  type: z.enum(['INTERNAL', 'CLIENT', 'RND', 'INFRASTRUCTURE']).optional(),
  managerId: z.string().optional(),
  departmentId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.number().min(0).optional(),
  actualCost: z.number().min(0).optional(),
  completionPercentage: z.number().min(0).max(100),
  tags: z.string().optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'projects',
  modelName: 'project',
  validationSchema: { update: updateSchema },
  allowedIncludes: ['tasks', 'timeEntries'],
});
