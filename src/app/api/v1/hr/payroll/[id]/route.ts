import { z } from 'zod';
import { createRouteHandlersWithId } from '@/lib/api/route-factory';

const updatePayrollSchema = z.object({
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  payDate: z.string().datetime().optional(),
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSED', 'PAID', 'CANCELLED']).optional(),
  grossPay: z.number().nonnegative().optional(),
  netPay: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  taxAmount: z.number().nonnegative().optional(),
  overtimeHours: z.number().nonnegative().optional(),
  overtimeRate: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'hr/payroll',
  modelName: 'payroll',
  validationSchema: {
    update: updatePayrollSchema,
  },
  allowedIncludes: ['employee', 'earnings', 'deductions'],
});

export { GET, PATCH, DELETE };
