import { z } from 'zod';
import { createRouteHandlers } from '@/lib/api/route-factory';

const emergencyContactSchema = z.object({
  name: z.string().min(1),
  relationship: z.string().min(1),
  phone: z.string().min(1),
});

const createEmployeeSchema = z.object({
  employeeNumber: z.string().min(1, 'Employee number is required'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  nationalId: z.string().optional(),
  departmentId: z.string().optional(),
  positionId: z.string().optional(),
  managerId: z.string().optional(),
  hireDate: z.string().datetime({ message: 'Invalid hire date' }),
  terminationDate: z.string().datetime().optional(),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'PROBATION']).default('ACTIVE'),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TEMPORARY']).default('FULL_TIME'),
  salary: z.number().nonnegative('Salary must be non-negative').optional(),
  currency: z.string().length(3).default('USD'),
  bankAccountNumber: z.string().optional(),
  bankName: z.string().optional(),
  taxId: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  emergencyContact: emergencyContactSchema.optional(),
  notes: z.string().optional(),
});

const updateEmployeeSchema = createEmployeeSchema.partial();

const { GET, POST } = createRouteHandlers({
  entity: 'hr/employees',
  modelName: 'employee',
  validationSchema: {
    create: createEmployeeSchema,
    update: updateEmployeeSchema,
  },
  searchFields: ['firstName', 'lastName', 'email', 'employeeNumber', 'phone'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
  allowedIncludes: ['department', 'position', 'manager', 'leaveRequests'],
});

export { GET, POST };
