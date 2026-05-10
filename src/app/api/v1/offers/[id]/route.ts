import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN']),
  position: z.string(),
  department: z.string().optional(),
  salary: z.number().min(0),
  currency: z.string(),
  salaryPeriod: z.enum(['HOURLY', 'MONTHLY', 'ANNUAL']),
  startDate: z.string(),
  expiryDate: z.string().optional(),
  signingBonus: z.number().min(0).optional(),
  benefits: z.string().optional(),
  terms: z.string().optional(),
  notes: z.string().optional(),
  approvedBy: z.string().optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'offers',
  modelName: 'offerLetter',
  validationSchema: { update: updateSchema },
  allowedIncludes: ['candidate', 'application', 'job'],
});
