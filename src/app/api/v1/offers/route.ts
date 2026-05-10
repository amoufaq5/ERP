import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  candidateId: z.string(),
  applicationId: z.string(),
  jobId: z.string(),
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN']).default('DRAFT'),
  position: z.string(),
  department: z.string().optional(),
  salary: z.number().min(0),
  currency: z.string().default('EGP'),
  salaryPeriod: z.enum(['HOURLY', 'MONTHLY', 'ANNUAL']).default('MONTHLY'),
  startDate: z.string(),
  expiryDate: z.string().optional(),
  signingBonus: z.number().min(0).optional(),
  benefits: z.string().optional(),
  terms: z.string().optional(),
  notes: z.string().optional(),
  approvedBy: z.string().optional(),
});

export const { GET, POST } = createRouteHandlers({
  entity: 'offers',
  modelName: 'offerLetter',
  validationSchema: { create: createSchema, update: createSchema.partial() },
  searchFields: ['position', 'department'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
  allowedIncludes: ['candidate', 'application', 'job'],
});
