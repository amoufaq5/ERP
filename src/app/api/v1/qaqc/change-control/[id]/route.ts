import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  number: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(['DOCUMENT', 'PROCESS', 'EQUIPMENT', 'SYSTEM']).optional(),
  status: z.enum(['INITIATED', 'UNDER_REVIEW', 'APPROVED', 'IMPLEMENTED', 'CLOSED', 'REJECTED']).optional(),
  priority: z.string().optional(),
  requestedBy: z.string().optional(),
  approvedBy: z.string().optional(),
  impactAssessment: z.string().optional(),
  implementationPlan: z.string().optional(),
  effectiveDate: z.string().optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'change-control',
  modelName: 'changeControl',
  validationSchema: { update: updateSchema },
  searchFields: ['number', 'title', 'description'],
});
