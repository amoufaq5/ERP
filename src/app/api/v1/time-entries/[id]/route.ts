import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  projectId: z.string(),
  taskId: z.string().optional(),
  date: z.string(),
  hours: z.number().min(0.25).max(24),
  description: z.string().optional(),
  billable: z.boolean(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']),
  rate: z.number().min(0).optional(),
  overtime: z.boolean(),
  approvedBy: z.string().optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'time-entries',
  modelName: 'timeEntry',
  validationSchema: { update: updateSchema },
  allowedIncludes: ['project'],
});
