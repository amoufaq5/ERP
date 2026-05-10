import { z } from 'zod';
import { createRouteHandlersWithId } from '@/lib/api/route-factory';

const updateLeaveRequestSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  totalDays: z.number().positive().optional(),
  reason: z.string().min(1).max(1000).optional(),
  attachmentUrl: z.string().url().optional(),
  isHalfDay: z.boolean().optional(),
  halfDayPeriod: z.enum(['MORNING', 'AFTERNOON']).optional(),
});

const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'hr/leave-requests',
  modelName: 'leaveRequest',
  validationSchema: {
    update: updateLeaveRequestSchema,
  },
  allowedIncludes: ['employee', 'approver'],
});

export { GET, PATCH, DELETE };
