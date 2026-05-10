import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  employeeId: z.string().optional(),
  employeeName: z.string().optional(),
  trainingType: z.string().optional(),
  title: z.string().optional(),
  status: z.enum(['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'EXPIRED']).optional(),
  assignedDate: z.string().optional(),
  dueDate: z.string().optional(),
  completedDate: z.string().optional(),
  score: z.number().optional(),
  trainer: z.string().optional(),
  certificate: z.string().optional(),
  expiryDate: z.string().optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'training',
  modelName: 'trainingRecord',
  validationSchema: { update: updateSchema },
  searchFields: ['employeeName', 'title', 'trainingType'],
});
