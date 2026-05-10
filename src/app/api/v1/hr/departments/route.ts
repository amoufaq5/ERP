import { z } from 'zod';
import { createRouteHandlers } from '@/lib/api/route-factory';

const createDepartmentSchema = z.object({
  code: z.string().min(1, 'Department code is required').max(20),
  name: z.string().min(1, 'Department name is required').max(200),
  description: z.string().optional(),
  parentId: z.string().optional(),
  managerId: z.string().optional(),
  costCenterId: z.string().optional(),
  isActive: z.boolean().default(true),
  headCount: z.number().int().nonnegative().optional(),
  location: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

const updateDepartmentSchema = createDepartmentSchema.partial();

const { GET, POST } = createRouteHandlers({
  entity: 'hr/departments',
  modelName: 'department',
  validationSchema: {
    create: createDepartmentSchema,
    update: updateDepartmentSchema,
  },
  searchFields: ['code', 'name', 'description', 'location'],
  defaultSort: { field: 'name', direction: 'asc' },
  allowedIncludes: ['parent', 'children', 'manager', 'employees', 'costCenter'],
});

export { GET, POST };
