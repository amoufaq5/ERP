import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  projectId: z.string(),
  taskId: z.string().optional(),
  userId: z.string(),
  date: z.string(),
  hours: z.number().min(0.25).max(24),
  description: z.string().optional(),
  billable: z.boolean().default(true),
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']).default('DRAFT'),
  rate: z.number().min(0).optional(),
  overtime: z.boolean().default(false),
  approvedBy: z.string().optional(),
});

export const { GET, POST } = createRouteHandlers({
  entity: 'time-entries',
  modelName: 'timeEntry',
  validationSchema: { create: createSchema, update: createSchema.partial() },
  searchFields: ['description'],
  defaultSort: { field: 'date', direction: 'desc' },
  allowedIncludes: ['project'],
});
