import { z } from 'zod';
import { createRouteHandlers } from '@/lib/api/route-factory';

const createLeaveRequestSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  leaveType: z.enum(['ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'UNPAID', 'BEREAVEMENT', 'PERSONAL', 'STUDY', 'COMPENSATORY']),
  startDate: z.string().datetime({ message: 'Invalid start date' }),
  endDate: z.string().datetime({ message: 'Invalid end date' }),
  totalDays: z.number().positive('Total days must be positive'),
  reason: z.string().min(1, 'Reason is required').max(1000),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'WITHDRAWN']).default('PENDING'),
  approverId: z.string().optional(),
  attachmentUrl: z.string().url().optional(),
  isHalfDay: z.boolean().default(false),
  halfDayPeriod: z.enum(['MORNING', 'AFTERNOON']).optional(),
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  { message: 'End date must be on or after start date', path: ['endDate'] },
);

const updateLeaveRequestSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  totalDays: z.number().positive().optional(),
  reason: z.string().min(1).max(1000).optional(),
  attachmentUrl: z.string().url().optional(),
  isHalfDay: z.boolean().optional(),
  halfDayPeriod: z.enum(['MORNING', 'AFTERNOON']).optional(),
});

const { GET, POST } = createRouteHandlers({
  entity: 'hr/leave-requests',
  modelName: 'leaveRequest',
  validationSchema: {
    create: createLeaveRequestSchema,
    update: updateLeaveRequestSchema,
  },
  searchFields: ['reason'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
  allowedIncludes: ['employee', 'approver'],
});

export { GET, POST };
