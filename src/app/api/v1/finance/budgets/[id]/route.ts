import { z } from 'zod';
import { createRouteHandlersWithId } from '@/lib/api/route-factory';

const updateBudgetSchema = z.object({
  name: z.string().min(1).optional(),
  fiscalYear: z.number().int().min(2000).max(2100).optional(),
  departmentId: z.string().optional(),
  costCenterId: z.string().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ACTIVE', 'CLOSED']).optional(),
  totalAmount: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  description: z.string().optional(),
  approvedBy: z.string().optional(),
});

const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'finance/budgets',
  modelName: 'budget',
  validationSchema: {
    update: updateBudgetSchema,
  },
  allowedIncludes: ['department', 'costCenter', 'lines'],
});

export { GET, PATCH, DELETE };
