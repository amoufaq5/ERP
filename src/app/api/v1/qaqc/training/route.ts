import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  employeeId: z.string().min(1),
  employeeName: z.string().min(1),
  trainingType: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'EXPIRED']).default('ASSIGNED'),
  assignedDate: z.string().optional(),
  dueDate: z.string().optional(),
  completedDate: z.string().optional(),
  score: z.number().optional(),
  trainer: z.string().optional(),
  certificate: z.string().optional(),
  expiryDate: z.string().optional(),
});

const updateSchema = createSchema.partial();

export const { GET, POST } = createRouteHandlers({
  entity: 'training',
  modelName: 'trainingRecord',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['employeeName', 'title', 'trainingType', 'trainer'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
});
