import { z } from 'zod';
import { createRouteHandlers } from '@/lib/api/route-factory';

const createPositionSchema = z.object({
  code: z.string().min(1, 'Position code is required').max(20),
  title: z.string().min(1, 'Position title is required').max(200),
  description: z.string().optional(),
  departmentId: z.string().optional(),
  level: z.enum(['INTERN', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'MANAGER', 'DIRECTOR', 'VP', 'C_LEVEL']).optional(),
  minSalary: z.number().nonnegative('Minimum salary must be non-negative').optional(),
  maxSalary: z.number().nonnegative('Maximum salary must be non-negative').optional(),
  currency: z.string().length(3).default('USD'),
  isActive: z.boolean().default(true),
  headCount: z.number().int().nonnegative().default(1),
  filledCount: z.number().int().nonnegative().default(0),
  requirements: z.string().optional(),
  responsibilities: z.string().optional(),
  reportsTo: z.string().optional(),
}).refine(
  (data) => {
    if (data.minSalary !== undefined && data.maxSalary !== undefined) {
      return data.maxSalary >= data.minSalary;
    }
    return true;
  },
  { message: 'Maximum salary must be greater than or equal to minimum salary', path: ['maxSalary'] },
);

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

const { GET, POST } = createRouteHandlers({
  entity: 'hr/positions',
  modelName: 'position',
  validationSchema: {
    create: createPositionSchema,
    update: updatePositionSchema,
  },
  searchFields: ['code', 'title', 'description', 'requirements'],
  defaultSort: { field: 'title', direction: 'asc' },
  allowedIncludes: ['department', 'employees'],
});

export { GET, POST };
