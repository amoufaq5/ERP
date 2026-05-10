import { z } from 'zod';
import { createRouteHandlersWithId } from '@/lib/api/route-factory';

const updatePositionSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  departmentId: z.string().optional(),
  level: z.enum(['INTERN', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'MANAGER', 'DIRECTOR', 'VP', 'C_LEVEL']).optional(),
  minSalary: z.number().nonnegative().optional(),
  maxSalary: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  isActive: z.boolean().optional(),
  headCount: z.number().int().nonnegative().optional(),
  filledCount: z.number().int().nonnegative().optional(),
  requirements: z.string().optional(),
  responsibilities: z.string().optional(),
  reportsTo: z.string().optional(),
});

const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'hr/positions',
  modelName: 'position',
  validationSchema: {
    update: updatePositionSchema,
  },
  allowedIncludes: ['department', 'employees'],
});

export { GET, PATCH, DELETE };
