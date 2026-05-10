import { z } from 'zod';
import { createRouteHandlersWithId } from '@/lib/api/route-factory';

const updateActivitySchema = z.object({
  type: z.enum(['CALL', 'EMAIL', 'MEETING', 'TASK', 'NOTE', 'FOLLOW_UP', 'DEMO', 'LUNCH']).optional(),
  subject: z.string().min(1).max(300).optional(),
  description: z.string().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  accountId: z.string().optional(),
  ownerId: z.string().optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  dueDate: z.string().datetime().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  duration: z.number().int().nonnegative().optional(),
  location: z.string().optional(),
  outcome: z.string().optional(),
  isAllDay: z.boolean().optional(),
  reminderAt: z.string().datetime().optional(),
  attendees: z.array(z.string().email()).optional(),
  tags: z.array(z.string()).optional(),
});

const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'crm/activities',
  modelName: 'activity',
  validationSchema: {
    update: updateActivitySchema,
  },
  allowedIncludes: ['contact', 'deal', 'account', 'owner'],
});

export { GET, PATCH, DELETE };
