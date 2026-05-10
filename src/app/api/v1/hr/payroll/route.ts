import { z } from 'zod';
import { createRouteHandlers } from '@/lib/api/route-factory';

const payrollDeductionSchema = z.object({
  type: z.enum(['TAX', 'INSURANCE', 'PENSION', 'LOAN', 'OTHER']),
  description: z.string().min(1),
  amount: z.number().positive('Deduction amount must be positive'),
});

const payrollEarningSchema = z.object({
  type: z.enum(['BASE_SALARY', 'OVERTIME', 'BONUS', 'COMMISSION', 'ALLOWANCE', 'OTHER']),
  description: z.string().min(1),
  amount: z.number().positive('Earning amount must be positive'),
  hours: z.number().nonnegative().optional(),
});

const createPayrollSchema = z.object({
  payrollNumber: z.string().min(1, 'Payroll number is required'),
  employeeId: z.string().min(1, 'Employee ID is required'),
  periodStart: z.string().datetime({ message: 'Invalid period start date' }),
  periodEnd: z.string().datetime({ message: 'Invalid period end date' }),
  payDate: z.string().datetime({ message: 'Invalid pay date' }),
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSED', 'PAID', 'CANCELLED']).default('DRAFT'),
  grossPay: z.number().nonnegative('Gross pay must be non-negative'),
  netPay: z.number().nonnegative('Net pay must be non-negative'),
  currency: z.string().length(3).default('USD'),
  earnings: z.array(payrollEarningSchema).optional(),
  deductions: z.array(payrollDeductionSchema).optional(),
  taxAmount: z.number().nonnegative().default(0),
  overtimeHours: z.number().nonnegative().default(0),
  overtimeRate: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

const updatePayrollSchema = createPayrollSchema.partial();

const { GET, POST } = createRouteHandlers({
  entity: 'hr/payroll',
  modelName: 'payroll',
  validationSchema: {
    create: createPayrollSchema,
    update: updatePayrollSchema,
  },
  searchFields: ['payrollNumber', 'notes'],
  defaultSort: { field: 'payDate', direction: 'desc' },
  allowedIncludes: ['employee', 'earnings', 'deductions'],
});

export { GET, POST };
