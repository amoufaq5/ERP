import { z } from 'zod';
import { createRouteHandlersWithId } from '@/lib/api/route-factory';

const updateDepartmentSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  parentId: z.string().optional(),
  managerId: z.string().optional(),
  costCenterId: z.string().optional(),
  isActive: z.boolean().optional(),
  headCount: z.number().int().nonnegative().optional(),
  location: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'hr/departments',
  modelName: 'department',
  validationSchema: {
    update: updateDepartmentSchema,
  },
  allowedIncludes: ['parent', 'children', 'manager', 'employees', 'costCenter'],
});

export { GET, PATCH, DELETE };
