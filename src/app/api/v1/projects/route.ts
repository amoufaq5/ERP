import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).default('PLANNING'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  type: z.enum(['INTERNAL', 'CLIENT', 'RND', 'INFRASTRUCTURE']).optional(),
  managerId: z.string().optional(),
  departmentId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.number().min(0).optional(),
  actualCost: z.number().min(0).optional(),
  completionPercentage: z.number().min(0).max(100).default(0),
  tags: z.string().optional(),
});

export const { GET, POST } = createRouteHandlers({
  entity: 'projects',
  modelName: 'project',
  validationSchema: { create: createSchema, update: createSchema.partial() },
  searchFields: ['name', 'code', 'description'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
  allowedIncludes: ['tasks', 'timeEntries'],
});
