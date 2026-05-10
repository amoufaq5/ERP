import { z } from 'zod';
import { createRouteHandlers } from '@/lib/api/route-factory';

const budgetLineSchema = z.object({
  accountId: z.string().min(1, 'Account ID is required'),
  costCenterId: z.string().optional(),
  januaryAmount: z.number().nonnegative().default(0),
  februaryAmount: z.number().nonnegative().default(0),
  marchAmount: z.number().nonnegative().default(0),
  aprilAmount: z.number().nonnegative().default(0),
  mayAmount: z.number().nonnegative().default(0),
  juneAmount: z.number().nonnegative().default(0),
  julyAmount: z.number().nonnegative().default(0),
  augustAmount: z.number().nonnegative().default(0),
  septemberAmount: z.number().nonnegative().default(0),
  octoberAmount: z.number().nonnegative().default(0),
  novemberAmount: z.number().nonnegative().default(0),
  decemberAmount: z.number().nonnegative().default(0),
});

const createBudgetSchema = z.object({
  name: z.string().min(1, 'Budget name is required'),
  fiscalYear: z.number().int().min(2000).max(2100),
  departmentId: z.string().optional(),
  costCenterId: z.string().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ACTIVE', 'CLOSED']).default('DRAFT'),
  totalAmount: z.number().nonnegative('Total amount must be non-negative'),
  currency: z.string().length(3).default('USD'),
  startDate: z.string().datetime({ message: 'Invalid start date' }),
  endDate: z.string().datetime({ message: 'Invalid end date' }),
  description: z.string().optional(),
  lines: z.array(budgetLineSchema).optional(),
  approvedBy: z.string().optional(),
});

const updateBudgetSchema = createBudgetSchema.partial();

const { GET, POST } = createRouteHandlers({
  entity: 'finance/budgets',
  modelName: 'budget',
  validationSchema: {
    create: createBudgetSchema,
    update: updateBudgetSchema,
  },
  searchFields: ['name', 'description'],
  defaultSort: { field: 'fiscalYear', direction: 'desc' },
  allowedIncludes: ['department', 'costCenter', 'lines'],
});

export { GET, POST };
