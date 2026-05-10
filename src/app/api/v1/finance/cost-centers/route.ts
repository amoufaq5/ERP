import { z } from 'zod';
import { createRouteHandlers } from '@/lib/api/route-factory';

const createCostCenterSchema = z.object({
  code: z.string().min(1, 'Cost center code is required').max(20),
  name: z.string().min(1, 'Cost center name is required').max(200),
  description: z.string().optional(),
  parentId: z.string().optional(),
  managerId: z.string().optional(),
  departmentId: z.string().optional(),
  isActive: z.boolean().default(true),
  budgetAmount: z.number().nonnegative().optional(),
  currency: z.string().length(3).default('USD'),
});

const updateCostCenterSchema = createCostCenterSchema.partial();

const { GET, POST } = createRouteHandlers({
  entity: 'finance/cost-centers',
  modelName: 'costCenter',
  validationSchema: {
    create: createCostCenterSchema,
    update: updateCostCenterSchema,
  },
  searchFields: ['code', 'name', 'description'],
  defaultSort: { field: 'code', direction: 'asc' },
  allowedIncludes: ['parent', 'children', 'manager', 'department'],
});

export { GET, POST };
