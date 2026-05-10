import { z } from 'zod';
import { createRouteHandlersWithId } from '@/lib/api/route-factory';

const updateCostCenterSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  parentId: z.string().optional(),
  managerId: z.string().optional(),
  departmentId: z.string().optional(),
  isActive: z.boolean().optional(),
  budgetAmount: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
});

const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'finance/cost-centers',
  modelName: 'costCenter',
  validationSchema: {
    update: updateCostCenterSchema,
  },
  allowedIncludes: ['parent', 'children', 'manager', 'department'],
});

export { GET, PATCH, DELETE };
