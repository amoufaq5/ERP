import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  employeeId: z.string(),
  title: z.string().min(1),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE']).default('NOT_STARTED'),
  startDate: z.string(),
  targetCompletionDate: z.string(),
  completedDate: z.string().optional(),
  assignedTo: z.string().optional(),
  department: z.string().optional(),
  notes: z.string().optional(),
  completionPercentage: z.number().min(0).max(100).default(0),
});

export const { GET, POST } = createRouteHandlers({
  entity: 'onboarding',
  modelName: 'onboardingChecklist',
  validationSchema: { create: createSchema, update: createSchema.partial() },
  searchFields: ['title'],
  defaultSort: { field: 'startDate', direction: 'desc' },
  allowedIncludes: ['tasks', 'employee'],
});
