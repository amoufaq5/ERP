import { z } from 'zod';
import { createRouteHandlersWithId } from '@/lib/api/route-factory';

const emergencyContactSchema = z.object({
  name: z.string().min(1),
  relationship: z.string().min(1),
  phone: z.string().min(1),
});

const updateEmployeeSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  nationalId: z.string().optional(),
  departmentId: z.string().optional(),
  positionId: z.string().optional(),
  managerId: z.string().optional(),
  terminationDate: z.string().datetime().optional(),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'PROBATION']).optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TEMPORARY']).optional(),
  salary: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
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

const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'hr/employees',
  modelName: 'employee',
  validationSchema: {
    update: updateEmployeeSchema,
  },
  allowedIncludes: ['department', 'position', 'manager', 'leaveRequests', 'payrollRecords'],
});

export { GET, PATCH, DELETE };
