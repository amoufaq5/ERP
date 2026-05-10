import { z } from 'zod';
import { createRouteHandlers } from '@/lib/api/route-factory';

const createActivitySchema = z.object({
  type: z.enum(['CALL', 'EMAIL', 'MEETING', 'TASK', 'NOTE', 'FOLLOW_UP', 'DEMO', 'LUNCH']),
  subject: z.string().min(1, 'Subject is required').max(300),
  description: z.string().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  accountId: z.string().optional(),
  ownerId: z.string().optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE']).default('PLANNED'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  dueDate: z.string().datetime().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  duration: z.number().int().nonnegative('Duration must be non-negative in minutes').optional(),
  location: z.string().optional(),
  outcome: z.string().optional(),
  isAllDay: z.boolean().default(false),
  reminderAt: z.string().datetime().optional(),
  attendees: z.array(z.string().email()).optional(),
  tags: z.array(z.string()).optional(),
});

const updateActivitySchema = createActivitySchema.partial();

const { GET, POST } = createRouteHandlers({
  entity: 'crm/activities',
  modelName: 'activity',
  validationSchema: {
    create: createActivitySchema,
    update: updateActivitySchema,
  },
  searchFields: ['subject', 'description', 'outcome', 'location'],
  defaultSort: { field: 'dueDate', direction: 'desc' },
  allowedIncludes: ['contact', 'deal', 'account', 'owner'],
});

export { GET, POST };
