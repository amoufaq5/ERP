import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE']),
  startDate: z.string(),
  targetCompletionDate: z.string(),
  completedDate: z.string().optional(),
  assignedTo: z.string().optional(),
  department: z.string().optional(),
  notes: z.string().optional(),
  completionPercentage: z.number().min(0).max(100),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'onboarding',
  modelName: 'onboardingChecklist',
  validationSchema: { update: updateSchema },
  allowedIncludes: ['tasks', 'employee'],
});
